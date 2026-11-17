#!/usr/bin/env bun
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(SCRIPT_DIR);

const SCHEMA_REPO = process.env.SCHEMA_REPO || 'inference-gateway/schemas';
const SCHEMA_REF = process.env.SCHEMA_REF || 'main';
const SCHEMA_URL =
  process.env.SCHEMA_URL ||
  `https://raw.githubusercontent.com/${SCHEMA_REPO}/${SCHEMA_REF}/openapi.yaml`;

const AUTH_TYPE_NONE = 'none';
const MIN_SEPARATOR_DASHES = 3;

export const startMarker = (key) => `GENERATED:${key} START`;
export const endMarker = (key) => `GENERATED:${key} END`;
export const REGION_PADDING = [''];

function argValue(name) {
  const prefix = `--${name}=`;
  const eq = process.argv.find((a) => a.startsWith(prefix));
  if (eq) return eq.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return undefined;
}

async function loadSchemaText() {
  const file = argValue('schema-file') || process.env.SCHEMA_FILE;
  if (file) {
    const path = file.startsWith('/') ? file : join(REPO_ROOT, file);
    return readFileSync(path, 'utf8');
  }
  let res;
  try {
    res = await fetch(SCHEMA_URL);
  } catch (err) {
    throw new Error(
      `Failed to fetch the schema from ${SCHEMA_URL} (${err.message}). ` +
        `If you are offline, point SCHEMA_FILE at a local openapi.yaml.`
    );
  }
  if (!res.ok) {
    throw new Error(`Fetching ${SCHEMA_URL} returned HTTP ${res.status} ${res.statusText}.`);
  }
  return await res.text();
}

export function extractProviderModel(schemaText) {
  const provider = Bun.YAML.parse(schemaText)?.components?.schemas?.Provider;
  if (provider == null || provider['x-provider-configs'] == null) {
    throw new Error(
      'Could not locate components.schemas.Provider with an x-provider-configs block in the schema.'
    );
  }
  const configs = provider['x-provider-configs'];
  const enumIds = provider.enum ?? [];
  return { enumIds: enumIds.length ? enumIds : Object.keys(configs), configs };
}

function camelCase(id) {
  const [head, ...rest] = id.split('_');
  return head + rest.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

export function buildProviders(model, overrides) {
  const { enumIds, configs } = model;
  const order = Object.keys(overrides.providers);
  const schemaIds = new Set(enumIds);
  const overrideIds = new Set(order);

  const missingOverride = enumIds.filter((id) => !overrideIds.has(id));
  if (missingOverride.length) {
    throw new Error(
      `The schema defines provider(s) with no entry in scripts/provider-overrides.json: ` +
        `${missingOverride.join(', ')}. Add them (displayName, urlLabel, keyLabel, and vision ` +
        `if the provider supports it) and re-run.`
    );
  }
  const stale = order.filter((id) => !schemaIds.has(id));
  if (stale.length) {
    throw new Error(
      `scripts/provider-overrides.json lists provider(s) absent from the schema enum: ` +
        `${stale.join(', ')}. Remove them or fix the id.`
    );
  }

  const authLabels = overrides.authLabels || {};

  return order.map((id) => {
    const cfg = configs[id];
    if (!cfg) throw new Error(`Provider "${id}" has no x-provider-configs entry in the schema.`);
    const ov = overrides.providers[id];
    const authType = cfg.auth_type;
    if (!authLabels[authType]) {
      throw new Error(
        `Provider "${id}" has auth_type "${authType}" with no label in overrides.authLabels.`
      );
    }
    if (cfg.url == null)
      throw new Error(`Provider "${id}" is missing "url" in x-provider-configs.`);
    const supportsVision = cfg.supports_vision === true;
    if (supportsVision && !ov.vision) {
      throw new Error(
        `Provider "${id}" supports vision in the schema but has no "vision" string in overrides.`
      );
    }
    const supportsChat = cfg.endpoints != null && cfg.endpoints.chat != null;
    if (supportsChat && !ov.adkExampleModel) {
      throw new Error(
        `Provider "${id}" has no "adkExampleModel" in overrides (required for the ADK ` +
          `"Switching providers and models" table). Add one and re-run.`
      );
    }
    if (authType === AUTH_TYPE_NONE && !ov.adkKeyNote) {
      throw new Error(
        `Provider "${id}" has auth_type "${AUTH_TYPE_NONE}" but no "adkKeyNote" in overrides ` +
          `(the ADK provider table's API-key cell for a keyless provider).`
      );
    }
    return {
      id,
      url: String(cfg.url),
      authType,
      authLabel: authLabels[authType],
      supportsVision,
      supportsChat,
      displayName: ov.displayName || id,
      urlLabel: ov.urlLabel || ov.displayName || id,
      keyLabel: ov.keyLabel || ov.displayName || id,
      vision: ov.vision || '',
      adkExampleModel: ov.adkExampleModel,
      adkKeyNote: ov.adkKeyNote || '',
      envUpper: id.toUpperCase(),
      constName: `${camelCase(id)}Settings`,
    };
  });
}

// GitHub-flavored markdown table with left-aligned, space-padded columns.
// The padding matches how `prettier --write` reflows markdown tables, so the
// generated regions stay byte-stable across the prettier pass in `task generate`.
function formatTable(headers, rows) {
  const widths = headers.map((h, i) =>
    Math.max(h.length, MIN_SEPARATOR_DASHES, ...rows.map((r) => r[i].length))
  );
  const fmt = (cells) => '| ' + cells.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |';
  const sep = '| ' + widths.map((w) => '-'.repeat(w)).join(' | ') + ' |';
  return [fmt(headers), sep, ...rows.map(fmt)];
}

export function renderProvidersTable(providers) {
  const headers = ['Provider', 'Auth', 'Default URL', 'Vision Support'];
  const rows = providers.map((p) => [
    p.displayName,
    p.authLabel,
    '`' + p.url + '`',
    p.supportsVision ? `Yes - ${p.vision}` : 'No',
  ]);
  return formatTable(headers, rows);
}

// The "Switching providers and models" table shared by rust-adk.md and
// typescript-adk.md. One row per chat-capable provider in schema order, so
// speech-only providers are skipped. Example models come from adkExampleModel.
// Keyless providers (auth_type "none") show their adkKeyNote in the API-key cell.
export function renderAdkProviderTable(providers) {
  const headers = [
    'Provider',
    '`A2A_AGENT_CLIENT_PROVIDER`',
    'Example `A2A_AGENT_CLIENT_MODEL`',
    'API key env var',
  ];
  const rows = providers
    .filter((p) => p.supportsChat)
    .map((p) => [
      p.displayName,
      '`' + p.id + '`',
      '`' + p.adkExampleModel + '`',
      p.authType === AUTH_TYPE_NONE ? p.adkKeyNote : '`' + p.envUpper + '_API_KEY`',
    ]);
  return formatTable(headers, rows);
}

export function renderUppercaseList(providers) {
  const ids = providers.map((p) => p.envUpper).join(', ');
  return [`Replace "PROVIDER" with the provider name (uppercase): ${ids}.`];
}

// The inline, comma-separated provider-id list in the sdks.md "Supported
// providers" section - backtick-wrapped ids in canonical order, Oxford comma
// before the final "and". One paragraph line.
export function renderSdksProviderList(providers) {
  const ids = providers.map((p) => '`' + p.id + '`');
  const last = ids.pop();
  return [`${ids.join(', ')}, and ${last}.`];
}

export function renderVisionList(providers) {
  return providers
    .filter((p) => p.supportsVision)
    .map((p) => `- **${p.displayName}**: ${p.vision}`);
}

export function renderSettingsConsts(providers) {
  const blocks = providers.map((p) => {
    const entries = [
      `  { variable: '${p.envUpper}_API_URL', description: '${p.urlLabel} API URL', defaultValue: '${p.url}' },`,
    ];
    if (p.authType !== AUTH_TYPE_NONE) {
      entries.push(
        `  { variable: '${p.envUpper}_API_KEY', description: '${p.keyLabel} API Key', defaultValue: '""' },`
      );
    }
    return [`const ${p.constName} = [`, ...entries, `];`];
  });
  return blocks.flatMap((b, i) => (i === 0 ? b : ['', ...b]));
}

export function renderConfigSections(providers) {
  const blocks = providers.map((p) => [
    `#### ${p.displayName}`,
    '',
    `<ConfigTable :rows="${p.constName}" />`,
  ]);
  return blocks.flatMap((b, i) => (i === 0 ? b : ['', ...b]));
}

// A duplicate marker pair usually means a merge dropped two copies of a generated
// block into one file. Injecting only the first would leave the second stale.
function assertSingleRegion(key, starts, ends) {
  if (starts.length > 1 || ends.length > 1) {
    throw new Error(
      `Expected exactly one GENERATED:${key} region but found ${starts.length} START / ` +
        `${ends.length} END markers - remove the duplicate.`
    );
  }
}

export function injectRegion(content, key, innerLines) {
  const lines = content.split('\n');
  const starts = lines.flatMap((l, i) => (l.includes(startMarker(key)) ? [i] : []));
  const ends = lines.flatMap((l, i) => (l.includes(endMarker(key)) ? [i] : []));
  if (starts.length === 0 || ends.length === 0) {
    throw new Error(`Could not find the GENERATED:${key} START/END markers.`);
  }
  assertSingleRegion(key, starts, ends);
  const startIdx = starts[0];
  const endIdx = ends[0];
  if (endIdx < startIdx) {
    throw new Error(`GENERATED:${key} END appears before START.`);
  }
  const region = [
    lines[startIdx],
    ...REGION_PADDING,
    ...innerLines,
    ...REGION_PADDING,
    lines[endIdx],
  ];
  return [...lines.slice(0, startIdx), ...region, ...lines.slice(endIdx + 1)].join('\n');
}

function updateFile(relPath, regions) {
  const path = join(REPO_ROOT, relPath);
  let content = readFileSync(path, 'utf8');
  for (const [key, lines] of regions) {
    content = injectRegion(content, key, lines);
  }
  writeFileSync(path, content);
  return relPath;
}

const GENERATED_FILES = [
  'supported-providers.md',
  'configuration.md',
  'sdks.md',
  'rust-adk.md',
  'typescript-adk.md',
];

const REGIONS_BY_FILE = {
  'supported-providers.md': (providers) => [
    ['providers-table', renderProvidersTable(providers)],
    ['provider-uppercase', renderUppercaseList(providers)],
    ['vision-list', renderVisionList(providers)],
  ],
  'configuration.md': (providers) => [
    ['provider-settings', renderSettingsConsts(providers)],
    ['provider-config-sections', renderConfigSections(providers)],
  ],
  'sdks.md': (providers) => [['sdks-provider-list', renderSdksProviderList(providers)]],
  'rust-adk.md': (providers) => [['adk-provider-table', renderAdkProviderTable(providers)]],
  'typescript-adk.md': (providers) => [['adk-provider-table', renderAdkProviderTable(providers)]],
};

async function main() {
  const overrides = JSON.parse(readFileSync(join(SCRIPT_DIR, 'provider-overrides.json'), 'utf8'));
  const schemaText = await loadSchemaText();
  const model = extractProviderModel(schemaText);
  const providers = buildProviders(model, overrides);

  for (const file of GENERATED_FILES) {
    updateFile(file, REGIONS_BY_FILE[file](providers));
  }
  formatWithPrettier(GENERATED_FILES);

  const localFile = argValue('schema-file') || process.env.SCHEMA_FILE;
  const source = localFile ? `local file ${localFile}` : SCHEMA_URL;
  console.log(
    `Generated ${providers.length} providers (${providers.map((p) => p.id).join(', ')}) ` +
      `from ${source}.`
  );
  console.log(`Updated: ${GENERATED_FILES.join(', ')}`);
}

function formatWithPrettier(paths) {
  execFileSync('bunx', ['prettier', '--write', ...paths], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
}

if (import.meta.main) {
  runEntrypoint().catch((err) => {
    console.error(`generate-provider-docs: ${err.message}`);
    process.exit(1);
  });
}

async function runEntrypoint() {
  if (!process.argv.includes('--check')) {
    await main();
    return;
  }
  const before = new Map(
    GENERATED_FILES.map((file) => [file, readFileSync(join(REPO_ROOT, file), 'utf8')])
  );
  await main();
  const stale = GENERATED_FILES.filter(
    (file) => readFileSync(join(REPO_ROOT, file), 'utf8') !== before.get(file)
  );
  if (stale.length === 0) return;
  console.error('');
  console.error('ERROR: provider docs are out of date with the canonical openapi.yaml.');
  console.error(`Stale files: ${stale.join(', ')}`);
  console.error('Run `task generate` and commit the result.');
  process.exit(1);
}
