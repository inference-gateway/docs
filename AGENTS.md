# Repository Guidelines

## Project Structure & Module Organization

This is the Next.js documentation site for Inference Gateway. Route files live in `app/`, with one
directory per documentation page and matching `*Content.tsx` components. Shared UI belongs in
`components/`, hooks in `hooks/`, and utilities in `lib/`. Source MDX content is stored in
`markdown/`; keep page slugs aligned with route names. Static assets and generated outputs live in
`public/`, including `search-index.json`, `sitemap.xml`, and images. Build helpers are in `scripts/`.

## Build, Test, and Development Commands

- `npm install`: install dependencies; CI uses `npm ci`.
- `npm run dev`: start the local Next.js development server.
- `npm run build`: generate the search index and sitemap, then build the static site.
- `npm run start`: serve a production build locally.
- `npm run lint`: run ESLint for TypeScript, React, and Next.js rules.
- `npm run lint:md`: lint Markdown and MDX files.
- `npm run format:check`: verify Prettier formatting.
- `npm run format`: rewrite files with Prettier.
- `npm run clean`: remove `.next/` and `out/`.

There is no dedicated test suite in this repository. Treat `npm run lint`, `npm run lint:md`,
`npm run format:check`, and `npm run build` as the required validation set.

## Coding Style & Naming Conventions

Use TypeScript and React functional components. Components use PascalCase filenames, such as
`SearchModal.tsx`; hooks use `useName.tsx`; route content files follow `PageNameContent.tsx`.
Formatting is Prettier with 2-space indentation, semicolons, single quotes, ES5 trailing commas, and
a 100-character print width. Markdown uses ATX headings, dash lists, and 2-space indentation. Update
generated files in `public/` through scripts rather than manual edits.

## Testing Guidelines

Run the full validation set before opening a PR. For content-only changes, at minimum run
`npm run lint:md` and `npm run format:check`. For navigation, metadata, search, sitemap, or shared
component changes, also run `npm run build`.

## Commit & Pull Request Guidelines

This project uses Conventional Commits for semantic-release. Use types such as `feat`, `fix`,
`docs`, `chore`, `ci`, `build`, `style`, `refactor`, `perf`, `test`, or `impr`; scopes are optional.
Examples: `docs: update deployment guide` or `chore(deps): bump dev dependencies`.

Pull requests should include a summary, linked issue when applicable, validation commands run, and
screenshots or recordings for visible UI changes. Note generated files updated by
`generate-search-index` or `generate-sitemap`.

## Security & Configuration Tips

Do not commit secrets from `.env`. Keep Node aligned with `package.json` (`^24.15.0`) or use the
included Flox environment for consistent local tooling.
