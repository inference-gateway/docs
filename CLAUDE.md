# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The documentation site for [Inference Gateway](https://github.com/inference-gateway/inference-gateway), built with **VitePress 1.x** and Vue 3, shipped as a static site to `docs.inference-gateway.com` via GitHub Pages. Content is authored as `.md` files at the repo root; each top-level `.md` becomes a route.

Bun `>= 1.2` is required and is the runtime, package manager, and script runner (pinned in `.bun-version` and `package.json` `engines.bun`; matched by `.flox/env/manifest.toml`).

## Commands

```bash
bun install              # install dependencies from bun.lock

bun run dev              # local dev server on http://localhost:5173
bun run build            # static build → .vitepress/dist/
bun run preview          # serve .vitepress/dist/ for local preview

bun run lint:md          # markdownlint over **/*.md
bun run lint:md:fix      # autofix markdownlint
bun run format           # prettier --write .
bun run format:check     # prettier --check .

bun test                 # provider-docs generator regression tests (scripts/*.test.mjs)
```

A [go-task](https://taskfile.dev) `Taskfile.yml` wraps the same workflow. Every bun
script above has a matching task that just delegates to it (`task dev`, `task build`,
`task preview`, `task format`, `task format:check`, `task lint:md`, `task lint:md:fix`,
`task test`), so `task <name>` and `bun run <name>` are interchangeable. `task` with no
args lists everything. The generator adds two tasks that have no bun-script equivalent:

```bash
task generate            # regenerate provider docs from the canonical openapi.yaml
task generate:check      # fail if the committed provider docs have drifted from the schema
```

CI (`.github/workflows/ci.yml`) runs `lint:md`, `format:check`, and `build` on every PR.
Deploys (`.github/workflows/deploy.yml`) fire on every push to `main` that touches `**/*.md`, `public/**`, `.vitepress/**`, or `package.json` - content pushes now ship.
Releases (`.github/workflows/release.yml`) run semantic-release for changelog/tags only - it does NOT deploy.

## Architecture

### One markdown file = one page

To add a page called `foo`:

1. Create `foo.md` at the repo root.
2. Add `title` and `description` frontmatter (the description goes into `<meta name="description">`, OG, and sitemap).
3. Add the page to `themeConfig.sidebar` in `.vitepress/config.ts` so it shows up in nav.

Homepage is special: `index.md` uses VitePress's hero `layout: home` with frontmatter-driven hero/features blocks.

### Sidebar nav is hand-maintained

`.vitepress/config.ts` `themeConfig.sidebar` is a hand-maintained array. New pages don't appear automatically.

### Config (`.vitepress/config.ts`)

- `cleanUrls: true` - URLs are served without `.html` suffix.
- `srcExclude` skips `README.md`, `CHANGELOG.md`, `CLAUDE.md`, `AGENTS.md` so they don't become pages.
- `sitemap.hostname` + `transformItems` filter out `404` from the sitemap.
- `transformPageData` injects per-page `canonical` and `og:url` `<link>`/`<meta>` tags.
- `head` block sets OG/Twitter cards, theme-color, and a JSON-LD structured-data block (Organization + SoftwareApplication + WebSite).
- `buildEnd` writes `.nojekyll` to `dist/` so GitHub Pages serves files starting with `_` (otherwise Jekyll strips them).
- Mermaid is wired via `withMermaid()` from `vitepress-plugin-mermaid` - ` ```mermaid ` fences render to SVG at build time, so diagrams are indexable text.
- Local search is enabled (`search: { provider: 'local' }`) - no Algolia.

### Theme customization (`.vitepress/theme/`)

- `index.ts` extends the default theme and globally registers the `<ConfigTable>` Vue component.
- `style.css` overrides `--vp-c-brand-*` to keep Inference Gateway purple (`#7c3aed` family) rather than VitePress default teal.
- `components/ConfigTable.vue` renders the 3-column env-var table used 17 times in `configuration.md`.

### `configuration.md` uses `<script setup>`

Because Vue's `:rows="..."` attribute parsing breaks on inline string literals containing `""`, table data lives in a top-of-file `<script setup>` block and the ConfigTable receives it by reference (`:rows="generalSettings"`). When adding a new section, follow the same pattern - declare a const, then reference it.

### Provider docs are generated from the canonical OpenAPI schema

The provider-specific parts of `configuration.md`, `supported-providers.md`, `rust-adk.md`, and `typescript-adk.md` are **generated, not hand-authored**. They live between `GENERATED:<key> START` / `END` marker comments and are produced by `scripts/generate-provider-docs.mjs` from the canonical `inference-gateway/schemas` `openapi.yaml` (the `Provider` enum + the `x-provider-configs` extension), merged with the human-authored display data in `scripts/provider-overrides.json` (casing, descriptor labels, vision-model prose, ADK example models). Prose outside the markers is never touched.

- The seven generated regions are `provider-settings` and `provider-config-sections` (in `configuration.md`); `providers-table`, `vision-list`, and `provider-uppercase` (in `supported-providers.md`); and `adk-provider-table` (the "Switching providers and models" table, once in each of `rust-adk.md` and `typescript-adk.md`). **Do not edit inside the markers by hand** - your edit is overwritten on the next `task generate`.
- To change hard facts (provider list, default API URL, auth type, vision flag), edit the schema upstream. To change display-only data (casing, labels, vision-model prose, ADK example models), edit `scripts/provider-overrides.json`. Then run `task generate`.
- `task generate` fetches the schema (`SCHEMA_REPO`/`SCHEMA_REF`, default `inference-gateway/schemas@main`), rewrites the marked regions, and runs `prettier --write` on the four files. Pin `SCHEMA_REF` to a tag or SHA for reproducible builds.
- `task generate:check` regenerates and fails on any drift - wire it into CI to keep the docs in lockstep with the schema.
- `task test` (a.k.a. `bun test`, `scripts/generate-provider-docs.test.mjs`) renders every region from the offline fixture `scripts/__fixtures__/openapi.sample.yaml` and asserts a byte-for-byte match against the committed docs. No network, no prettier pass - safe to run anywhere. Run it after touching the script or the overrides.
- The script has zero runtime dependencies (runs under bun or node >= 18) and hand-rolls a minimal block-YAML reader, so it only parses the subset of YAML the schema uses.

### Inline GitHub Actions / Vue interpolation conflicts

The patterns `${{ ... }}` (GitHub Actions, Grafana templating) and `<id>`-style angle-bracket placeholders break the Vue compiler when they appear in inline markdown code spans (e.g. `` `${{ secrets.X }}` ``). Workarounds:

- Inside fenced code blocks: leave them; VitePress wraps fenced blocks with `v-pre`.
- Inline: use `<code v-pre>...</code>` instead of backticks (see `github-action.md` for examples).

### Public assets (`public/`)

- `CNAME` - serves `docs.inference-gateway.com`.
- `robots.txt` - allows all crawlers, points at `/sitemap.xml`.
- `logo.svg` - favicon, apple-touch-icon, and hero image.
- `images/` - any inline screenshots/GIFs (e.g. `tui.gif`).

The OG/Twitter card image points at `https://github.com/inference-gateway.png` (the org avatar) since we don't ship a custom OG image.

## Conventions

- **Author content in `*.md` at the repo root** - don't recreate the old Next.js `markdown/` directory.
- Markdownlint config (`.markdownlint.json`) disables MD013 (line length), MD040 (fenced code language), MD041 (first-line heading), MD033 (HTML), and MD024 siblings-only. ATX headings (`#`) and dash bullets (`-`).
- Prettier: 2-space, single quotes, semicolons, 100-col, trailing commas `es5`, LF endings.
- `[DOCS]` titles and PR bodies in this repo are ASCII-only (no em dash, en dash) - the maintainer skill enforces this org-wide.

## SEO-blocking gotchas to watch for

Past indexing problems traced to:

1. **Client-rendered content** - VitePress now SSRs the full body into `dist/<page>.html`. Never wrap content in client-only Vue components without thinking about whether Google sees the prose in the first-pass HTML.
2. **Deploy trigger** - the old `release.yml` only redeployed when `release.yml` itself changed, so content pushes never shipped. The new `deploy.yml` watches `**/*.md` and `.vitepress/**`.
3. **Trailing slashes** - `cleanUrls: true` means both `/foo/` and `/foo.html` work; the sitemap lists the canonical trailing-slash form.
4. **404s** - `404.md` exists; the build emits a real `404.html`.
5. **HTTPS enforcement and Search Console verification** are repo/external-dashboard concerns, not code. Confirm `Settings → Pages → Enforce HTTPS` is on, and verify the `inference-gateway.com` domain property in Search Console via DNS TXT.
