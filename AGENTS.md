# Repository Guidelines

## Project Structure & Module Organization

This repository is the VitePress documentation site for Inference Gateway. Source pages are root-level `*.md` files such as `getting-started.md`, `configuration.md`, and `api-reference.md`; each page maps to a clean URL. Site configuration, navigation, SEO metadata, and build hooks live in `.vitepress/config.ts`. Theme customizations are in `.vitepress/theme/`, including `style.css` and `components/ConfigTable.vue`. Static assets belong in `public/`, for example `public/logo.png`, `public/robots.txt`, and `public/images/`. Build output is generated under `.vitepress/dist/` and should not be edited by hand.

## Build, Test, and Development Commands

- `npm ci` installs dependencies from `package-lock.json`.
- `npm run dev` starts the VitePress dev server, usually at `http://localhost:5173`.
- `npm run build` generates the static site in `.vitepress/dist/`.
- `npm run preview` serves the built output locally.
- `npm run format` applies Prettier to the repository.
- `npm run format:check` verifies formatting without changing files.
- `npm run lint:md` checks Markdown style.
- `npm run lint:md:fix` applies safe Markdown lint fixes.

Use Node `^24.15.0`, as declared in `package.json`.

## Coding Style & Naming Conventions

Use Markdown for documentation pages and TypeScript/Vue only for site configuration or reusable components. Markdown headings use ATX syntax (`#`), bullets use dashes, and nested list indentation is two spaces. Prettier uses 2-space indentation, single quotes, semicolons, trailing commas where valid in ES5, LF line endings, and a 100-column print width. Keep filenames lowercase and route-oriented, for example `browser-agent.md` or `cli-speech-to-text.md`.

When adding a page, include `title` and `description` frontmatter, then add it to `themeConfig.sidebar` in `.vitepress/config.ts`. For inline GitHub Actions expressions or Vue-sensitive placeholders, prefer `<code v-pre>...</code>` over backticks.

## Testing Guidelines

There is no separate unit test suite. Treat `npm run lint:md`, `npm run format:check`, and `npm run build` as the required validation set. For navigation, SEO, or theme changes, also run `npm run preview` and inspect the affected pages locally.

## Commit & Pull Request Guidelines

Git history follows Conventional Commits, for example `docs: add model picker tiers`, `chore(deps): bump infer CLI`, and `ci(infer): centralize infer.yml`. Keep commits scoped and descriptive. Pull requests should explain the documentation change, link related issues when available, and include screenshots or preview notes for visible UI/theme changes. CI must pass before merge.
