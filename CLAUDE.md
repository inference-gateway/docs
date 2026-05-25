# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The documentation site for [Inference Gateway](https://github.com/inference-gateway/inference-gateway), built with **Next.js 16 + MDX** and shipped as a **static export** (`output: 'export'` in `next.config.mjs`). Content is authored as MDX files in `markdown/` and rendered by thin App Router page wrappers in `app/`. Deploys as plain static files to `docs.inference-gateway.com`.

Node `^24.15.0` is required (enforced in `package.json` engines; matched by `.flox/env/manifest.toml`).

## Commands

```bash
npm run dev              # local dev server
npm run build            # static build → out/ (prebuild auto-runs search index + sitemap)
npm run serve            # build, then serve out/ via `npx serve`
npm run clean            # rm -rf out/ .next/

npm run lint             # ESLint (eslint-config-next)
npm run lint:md          # markdownlint over **/*.md + **/*.mdx
npm run lint:md:fix      # autofix markdownlint
npm run format           # prettier --write .
npm run format:check     # prettier --check .

npm run generate-sitemap        # writes public/sitemap.xml
npm run generate-search-index   # writes public/search-index.json
```

CI (`.github/workflows/ci.yml`) runs `lint:md`, `lint`, `format:check`, and `build`. Husky `pre-commit` blocks commits that fail `format:check` or `lint:md` — fix with `npm run format` / `npm run lint:md:fix` rather than bypassing.

## Architecture

### Page = MDX + page.tsx + Content.tsx (three coordinated files)

Every docs page is a triple. To add a page called `foo`:

1. `markdown/foo.mdx` — the actual content.
2. `app/foo/page.tsx` — a server component that exports `metadata` built via `pageMetadata(...)` from `lib/metadata.ts` and renders `<FooContent />`.
3. `app/foo/FooContent.tsx` — a `'use client'` component that imports the MDX and wraps it in `<div className="prose max-w-none">`.

The split exists because metadata must be exported from a server component, while the MDX rendering pipeline (Prism, Mermaid, clipboard handlers in `mdx-components.tsx`) needs `'use client'`. Mirror the pattern in any existing `app/<slug>/` directory rather than improvising.

The home page is special: `markdown/main.mdx` → `/` (mapped in `scripts/generate-search-index.ts` and rendered by `app/HomeContent.tsx`).

### Sidebar nav is hand-maintained

`components/Sidebar.tsx` has a top-level `sections` array that drives the entire left nav. New pages won't appear in the sidebar until added here — there is no filesystem-based auto-discovery.

### MDX rendering pipeline (`mdx-components.tsx`)

Centralizes all MDX → React customization:

- **Headings** (`h1`–`h6`) auto-slugged from text and rendered with anchor links + smooth-scroll hash handling (offset by 64px header).
- **Code fences** routed through a `CodeBlock` component using Prism for highlighting (bash, ts/tsx, go, rust, python, yaml, json, http, etc.) with a clipboard-copy button and optional `data-filename` header.
- **` ```mermaid ` fences** are intercepted and rendered via the `MermaidDiagram` component (Mermaid imported dynamically, click-to-zoom into a modal).
- **Tables, lists, links** are themed via CSS custom properties (`--color-*`) defined in `app/globals.css` so dark-mode follows `next-themes`.

If a code language doesn't highlight, add the corresponding `prismjs/components/prism-<lang>` import here.

### Build-time generators (`scripts/`)

`prebuild` hook runs both before every `npm run build`:

- `generate-search-index.ts` walks `markdown/**/*.mdx`, tokenizes titles/headings/first 500 content words into a keyword → entries map, writes `public/search-index.json`. The `SearchModal` (`components/SearchModal.tsx`) fetches this at runtime — there is no server-side search.
- `generate-sitemap.ts` globs `app/**/page.*` for routes and matches them against `markdown/*.mdx` to use the MDX file's `mtime` as `lastmod` (so prose edits show up in the sitemap even when the wrapper `page.tsx` hasn't changed).

Both are skipped during `npm run dev`. If search results or sitemap look stale, run them manually.

### Path alias

`@/*` resolves to the repo root (`tsconfig.json`). Use `@/components/...`, `@/lib/...`, `@/markdown/...` rather than relative paths.

## Conventions

- **Edit content in `markdown/*.mdx`**, not in the `app/` wrappers. The wrappers exist only for routing + metadata.
- Markdownlint config (`.markdownlint.json`) disables MD013 (line length), MD040 (fenced code language), MD041 (first-line heading), and allows HTML/JSX inside MDX. Stick to ATX headings (`#`) and dash bullets (`-`).
- Prettier: 2-space, single quotes, semicolons, 100-col, trailing commas `es5`, LF endings.
