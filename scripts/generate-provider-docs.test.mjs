// Regression net for the provider-docs generator. Runs the pure render pipeline
// against the bundled fixture schema and asserts every generated region still
// matches what is committed in the docs. This exercises the hand-rolled block
// YAML reader, the schema/override merge and its validation, and all six
// renderers - with no network access and no prettier pass. Run with: bun test.
import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildProviders,
  extractProviderModel,
  injectRegion,
  renderAdkProviderTable,
  renderConfigSections,
  renderProvidersTable,
  renderSettingsConsts,
  renderUppercaseList,
  renderVisionList,
} from './generate-provider-docs.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(SCRIPT_DIR);

const overrides = JSON.parse(readFileSync(join(SCRIPT_DIR, 'provider-overrides.json'), 'utf8'));
const schemaText = readFileSync(join(SCRIPT_DIR, '__fixtures__/openapi.sample.yaml'), 'utf8');
const providers = buildProviders(extractProviderModel(schemaText), overrides);

// Pull the inner lines of a GENERATED:<key> region out of a committed doc,
// dropping the single blank line injectRegion pads around the content.
function committedRegion(relPath, key) {
  const lines = readFileSync(join(REPO_ROOT, relPath), 'utf8').split('\n');
  const start = lines.findIndex((l) => l.includes(`GENERATED:${key} START`));
  const end = lines.findIndex((l) => l.includes(`GENERATED:${key} END`));
  if (start === -1 || end === -1) {
    throw new Error(`missing GENERATED:${key} markers in ${relPath}`);
  }
  return lines.slice(start + 2, end - 1);
}

test('fixture yields the full canonical provider set in schema order', () => {
  expect(providers.map((p) => p.id)).toEqual([
    'openai',
    'deepseek',
    'anthropic',
    'cohere',
    'groq',
    'cloudflare',
    'ollama',
    'ollama_cloud',
    'google',
    'mistral',
    'minimax',
    'moonshot',
    'nvidia',
  ]);
});

test('providers table matches supported-providers.md', () => {
  expect(renderProvidersTable(providers)).toEqual(
    committedRegion('supported-providers.md', 'providers-table')
  );
});

test('uppercase provider list matches supported-providers.md', () => {
  expect(renderUppercaseList(providers)).toEqual(
    committedRegion('supported-providers.md', 'provider-uppercase')
  );
});

test('vision list matches supported-providers.md', () => {
  expect(renderVisionList(providers)).toEqual(
    committedRegion('supported-providers.md', 'vision-list')
  );
});

test('provider settings consts match configuration.md', () => {
  expect(renderSettingsConsts(providers)).toEqual(
    committedRegion('configuration.md', 'provider-settings')
  );
});

test('provider config sections match configuration.md', () => {
  expect(renderConfigSections(providers)).toEqual(
    committedRegion('configuration.md', 'provider-config-sections')
  );
});

test('ADK provider table matches rust-adk.md', () => {
  expect(renderAdkProviderTable(providers)).toEqual(
    committedRegion('rust-adk.md', 'adk-provider-table')
  );
});

test('ADK provider table matches typescript-adk.md', () => {
  expect(renderAdkProviderTable(providers)).toEqual(
    committedRegion('typescript-adk.md', 'adk-provider-table')
  );
});

test('injectRegion replaces the body of a single marked region', () => {
  const src = [
    'before',
    '<!-- GENERATED:x START -->',
    '',
    'old',
    '',
    '<!-- GENERATED:x END -->',
    'after',
  ].join('\n');
  const out = injectRegion(src, 'x', ['new-1', 'new-2']);
  expect(out).toBe(
    [
      'before',
      '<!-- GENERATED:x START -->',
      '',
      'new-1',
      'new-2',
      '',
      '<!-- GENERATED:x END -->',
      'after',
    ].join('\n')
  );
});

test('injectRegion rejects a file with duplicate markers (the merge trap)', () => {
  const one = ['<!-- GENERATED:x START -->', '', 'old', '', '<!-- GENERATED:x END -->'];
  const dup = [...one, ...one].join('\n');
  expect(() => injectRegion(dup, 'x', ['new'])).toThrow(/Expected exactly one GENERATED:x region/);
});
