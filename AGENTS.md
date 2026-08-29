# AGENTS.md

VitePress documentation site for [Inference Gateway](https://github.com/inference-gateway/inference-gateway). Content is plain Markdown; TypeScript/Vue only for site config and components.

## Commands

Use Bun (>= 1.3, pinned in `.bun-version`). Every `bun run <name>` has a `task <name>` equivalent.

- `bun install` — install from `bun.lock`
- `bun run dev` — VitePress dev server (<http://localhost:5173>)
- `bun run build` — static site into `.vitepress/dist/`
- `bun run preview` — serve the built output
- `bun run format` / `format:check` — Prettier
- `bun run lint:md` / `lint:md:fix` — markdownlint
- `bun test` — provider-docs generator regression tests

## Conventions

- Pages are root-level `*.md` files; each maps to a clean URL. Add `title` and `description` frontmatter, then register the page in `themeConfig.sidebar` in `.vitepress/config.ts`.
- Markdown: ATX headings, dash bullets, 2-space nested indent. Prettier: 2-space indent, single quotes, semicolons, trailing commas, 100-col width. Lowercase route-oriented filenames (`browser-agent.md`).
- For Vue-sensitive placeholders or GitHub Actions expressions, use `<code v-pre>...</code>` instead of backticks.

## Generated content — do not hand-edit

Sections between `GENERATED:*` markers in `configuration.md`, `supported-providers.md`, `rust-adk.md`, and `typescript-adk.md` are generated from the canonical `inference-gateway/schemas` OpenAPI schema. Edit `scripts/generate-provider-docs.mjs` or `scripts/provider-overrides.json` instead, then run `task generate`.

`task generate` / `generate:check` fetch the schema over the network. To regen offline:

1. `gh api "repos/inference-gateway/schemas/contents/openapi.yaml?ref=main" -H "Accept: application/vnd.github.raw" > .schema.yaml`
2. `bun scripts/generate-provider-docs.mjs --schema-file=.schema.yaml` (use the `--schema-file=` form; the `SCHEMA_FILE=` env form can be blocked)
3. `bunx prettier --write` the regenerated files, then `bun test`
4. Delete `.schema.yaml` (untracked, trips `format:check`)

When a provider's hard facts change (auth type, base URL, vision flag), update `scripts/__fixtures__/openapi.sample.yaml` too or `bun test` fails its byte-for-byte comparison. `adkKeyNote` in `provider-overrides.json` only applies to `auth_type: none` providers.

## Validation & commits

Required for content changes: `bun run lint:md`, `bun run format:check`, `bun run build`. For nav/SEO/theme changes, also `bun run preview` and inspect locally.

Conventional Commits (`docs: ...`, `chore(deps): ...`). CI must pass before merge.
