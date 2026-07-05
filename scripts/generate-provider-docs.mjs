#!/usr/bin/env bun
// Regenerate the provider-derived sections of the docs from the canonical
// inference-gateway/schemas openapi.yaml.
//
// The schema is the source of truth for the hard facts that the docs otherwise
// restate by hand (and drift on): the provider id list, each provider's default
// API base URL, its auth type, and whether it supports vision. This script reads
// those from components.schemas.Provider (enum + the x-provider-configs
// extension), merges in the human-authored display data from
// scripts/provider-overrides.json (casing, descriptor labels, vision-model
// prose - things the schema does not model), and injects the result into marked
// regions of the docs pages. Hand-authored prose outside those markers is never
// touched.
//
// Usage:
//   bun scripts/generate-provider-docs.mjs
//   SCHEMA_FILE=scripts/__fixtures__/openapi.sample.yaml bun scripts/generate-provider-docs.mjs
//
// Environment:
//   SCHEMA_FILE  Local path to an openapi.yaml. Bypasses the network fetch
//                (used for offline runs and the fixture test).
//   SCHEMA_URL   Full URL to fetch the schema from. Overrides SCHEMA_REPO/REF.
//   SCHEMA_REPO  owner/repo of the schema (default inference-gateway/schemas).
//   SCHEMA_REF   git ref (tag or commit) to pin (default main). Pin to a tag or
//                commit SHA for reproducible builds.
//
// Zero runtime dependencies: runs under both bun and node (>=18) with no install.

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

// ---------------------------------------------------------------------------
// Schema loading
// ---------------------------------------------------------------------------

function argValue(name) {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
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

// ---------------------------------------------------------------------------
// Minimal block-YAML reader, scoped to the Provider schema subtree.
//
// This deliberately parses only the small, well-behaved subset the Provider
// block uses (block mappings, a block sequence of scalars, and scalar values).
// It never parses the whole OpenAPI document, so folded/anchored/flow YAML
// elsewhere in the file cannot trip it up.
// ---------------------------------------------------------------------------

function indentOf(line) {
  return line.length - line.replace(/^ +/, '').length;
}

function stripInlineComment(value) {
  if (value.startsWith('"') || value.startsWith("'")) return value;
  const i = value.indexOf(' #');
  return i === -1 ? value : value.slice(0, i).trimEnd();
}

function parseScalar(raw) {
  const v = raw.trim();
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    return v.slice(1, -1);
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~' || v === '') return null;
  if (/^-?\d+$/.test(v)) return Number(v);
  return v;
}

// Turn raw lines into { indent, content } tokens, dropping blank and
// comment-only lines.
function tokenize(lines) {
  const tokens = [];
  for (const line of lines) {
    if (/^\s*$/.test(line)) continue;
    const content = line.replace(/^ +/, '');
    if (content.startsWith('#')) continue;
    tokens.push({ indent: indentOf(line), content });
  }
  return tokens;
}

function parseMap(tokens, start, indent) {
  const obj = {};
  let i = start;
  while (i < tokens.length && tokens[i].indent === indent) {
    const { content } = tokens[i];
    const colon = content.indexOf(':');
    if (colon === -1) break;
    const key = content.slice(0, colon).trim();
    const rest = stripInlineComment(content.slice(colon + 1).trim());
    if (/^[|>][+-]?\d*$/.test(rest)) {
      let j = i + 1;
      while (j < tokens.length && tokens[j].indent > indent) j++;
      obj[key] = '';
      i = j;
      continue;
    }
    if (rest === '') {
      if (i + 1 < tokens.length && tokens[i + 1].indent > indent) {
        const childIndent = tokens[i + 1].indent;
        const [child, next] = parseNode(tokens, i + 1, childIndent);
        obj[key] = child;
        i = next;
      } else {
        obj[key] = null;
        i += 1;
      }
    } else {
      obj[key] = parseScalar(rest);
      i += 1;
    }
  }
  return [obj, i];
}

function parseSeq(tokens, start, indent) {
  const arr = [];
  let i = start;
  while (i < tokens.length && tokens[i].indent === indent && tokens[i].content.startsWith('- ')) {
    arr.push(parseScalar(stripInlineComment(tokens[i].content.slice(2))));
    i += 1;
  }
  return [arr, i];
}

function parseNode(tokens, start, indent) {
  if (tokens[start] && tokens[start].content.startsWith('- ')) {
    return parseSeq(tokens, start, indent);
  }
  return parseMap(tokens, start, indent);
}

// Return the raw lines of the subtree nested under the line at `keyIndex`.
function subtreeLines(lines, keyIndex) {
  const base = indentOf(lines[keyIndex]);
  const out = [];
  for (let i = keyIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) {
      out.push(line);
      continue;
    }
    if (indentOf(line) <= base) break;
    out.push(line);
  }
  return out;
}

function findKeyIndex(lines, key, withinIndentGreaterThan = -1) {
  const re = new RegExp(`^( *)${key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}:\\s*$`);
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(re);
    if (m && m[1].length > withinIndentGreaterThan) return i;
  }
  return -1;
}

function extractProviderModel(schemaText) {
  const lines = schemaText.split('\n');

  let providerIndex = -1;
  const providerRe = /^( +)Provider:\s*$/;
  for (let i = 0; i < lines.length; i += 1) {
    if (!providerRe.test(lines[i])) continue;
    const sub = subtreeLines(lines, i);
    if (sub.some((l) => /^\s*x-provider-configs:\s*$/.test(l))) {
      providerIndex = i;
      break;
    }
  }
  if (providerIndex === -1) {
    throw new Error(
      'Could not locate components.schemas.Provider with an x-provider-configs block in the schema.'
    );
  }

  const providerLines = subtreeLines(lines, providerIndex);

  const enumIdx = findKeyIndex(providerLines, 'enum');
  let enumIds = [];
  if (enumIdx !== -1) {
    const enumTokens = tokenize(subtreeLines(providerLines, enumIdx));
    if (enumTokens.length) {
      enumIds = parseNode(enumTokens, 0, enumTokens[0].indent)[0];
    }
  }

  const configIdx = findKeyIndex(providerLines, 'x-provider-configs');
  if (configIdx === -1) {
    throw new Error('Provider schema is missing the x-provider-configs extension.');
  }
  const configTokens = tokenize(subtreeLines(providerLines, configIdx));
  const configs = configTokens.length ? parseNode(configTokens, 0, configTokens[0].indent)[0] : {};

  return { enumIds: enumIds.length ? enumIds : Object.keys(configs), configs };
}

// ---------------------------------------------------------------------------
// Merge schema facts with the human-authored overrides
// ---------------------------------------------------------------------------

function camelCase(id) {
  const [head, ...rest] = id.split('_');
  return head + rest.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

function buildProviders(model, overrides) {
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
    return {
      id,
      url: String(cfg.url),
      authType,
      authLabel: authLabels[authType],
      supportsVision,
      displayName: ov.displayName || id,
      urlLabel: ov.urlLabel || ov.displayName || id,
      keyLabel: ov.keyLabel || ov.displayName || id,
      vision: ov.vision || '',
      envUpper: id.toUpperCase(),
      constName: `${camelCase(id)}Settings`,
    };
  });
}

// ---------------------------------------------------------------------------
// Renderers - each returns an array of lines for one marked region
// ---------------------------------------------------------------------------

function renderProvidersTable(providers) {
  const headers = ['Provider', 'Auth', 'Default URL', 'Vision Support'];
  const rows = providers.map((p) => [
    p.displayName,
    p.authLabel,
    '`' + p.url + '`',
    p.supportsVision ? `Yes - ${p.vision}` : 'No',
  ]);
  const widths = headers.map((h, i) => Math.max(h.length, 3, ...rows.map((r) => r[i].length)));
  const fmt = (cells) => '| ' + cells.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |';
  const sep = '| ' + widths.map((w) => '-'.repeat(w)).join(' | ') + ' |';
  return [fmt(headers), sep, ...rows.map(fmt)];
}

function renderUppercaseList(providers) {
  const ids = providers.map((p) => p.envUpper).join(', ');
  return [`Replace "PROVIDER" with the provider name (uppercase): ${ids}.`];
}

function renderVisionList(providers) {
  return providers
    .filter((p) => p.supportsVision)
    .map((p) => `- **${p.displayName}**: ${p.vision}`);
}

function renderSettingsConsts(providers) {
  const blocks = providers.map((p) => [
    `const ${p.constName} = [`,
    `  { variable: '${p.envUpper}_API_URL', description: '${p.urlLabel} API URL', defaultValue: '${p.url}' },`,
    `  { variable: '${p.envUpper}_API_KEY', description: '${p.keyLabel} API Key', defaultValue: '""' },`,
    `];`,
  ]);
  return blocks.flatMap((b, i) => (i === 0 ? b : ['', ...b]));
}

function renderConfigSections(providers) {
  const blocks = providers.map((p) => [
    `#### ${p.displayName}`,
    '',
    `<ConfigTable :rows="${p.constName}" />`,
  ]);
  return blocks.flatMap((b, i) => (i === 0 ? b : ['', ...b]));
}

// ---------------------------------------------------------------------------
// Marked-region injection
// ---------------------------------------------------------------------------

function injectRegion(content, key, innerLines) {
  const lines = content.split('\n');
  const startIdx = lines.findIndex((l) => l.includes(`GENERATED:${key} START`));
  const endIdx = lines.findIndex((l) => l.includes(`GENERATED:${key} END`));
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Could not find the GENERATED:${key} START/END markers.`);
  }
  if (endIdx < startIdx) {
    throw new Error(`GENERATED:${key} END appears before START.`);
  }
  const region = [lines[startIdx], '', ...innerLines, '', lines[endIdx]];
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const overrides = JSON.parse(readFileSync(join(SCRIPT_DIR, 'provider-overrides.json'), 'utf8'));
  const schemaText = await loadSchemaText();
  const model = extractProviderModel(schemaText);
  const providers = buildProviders(model, overrides);

  const written = [];
  written.push(
    updateFile('supported-providers.md', [
      ['providers-table', renderProvidersTable(providers)],
      ['provider-uppercase', renderUppercaseList(providers)],
      ['vision-list', renderVisionList(providers)],
    ])
  );
  written.push(
    updateFile('configuration.md', [
      ['provider-settings', renderSettingsConsts(providers)],
      ['provider-config-sections', renderConfigSections(providers)],
    ])
  );

  const localFile = argValue('schema-file') || process.env.SCHEMA_FILE;
  const source = localFile ? `local file ${localFile}` : SCHEMA_URL;
  console.log(
    `Generated ${providers.length} providers (${providers.map((p) => p.id).join(', ')}) ` +
      `from ${source}.`
  );
  console.log(`Updated: ${written.join(', ')}`);
}

main().catch((err) => {
  console.error(`generate-provider-docs: ${err.message}`);
  process.exit(1);
});
