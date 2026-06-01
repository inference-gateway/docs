---
title: Skills Catalog
description: Browse and contribute Agent Skills aggregated by inference-gateway/skills. Covers the SKILL.md spec, the skills.yaml indexer, validation rules, the daily-cron rebuild, and the jsDelivr cache window.
---

# Skills Catalog

The **Skills Catalog** is the central index of [Agent Skills](https://github.com/anthropics/skills/tree/main/spec) for the Inference Gateway ecosystem. It is generated from a single YAML source list in [`inference-gateway/skills`](https://github.com/inference-gateway/skills) and served as a static `catalog.json` via jsDelivr.

> The catalog is open-source. The source list, build script, schema, and locally-hosted skill bodies all live at [github.com/inference-gateway/skills](https://github.com/inference-gateway/skills).

## What's in the catalog

Every entry describes one [Agent Skill](/cli-skills/) - a portable, lazy-loaded folder containing a `SKILL.md` playbook plus optional `references/`, `scripts/`, and `assets/` siblings. Each catalog entry carries:

- **Identity**: `name` (kebab-case, unique across the catalog) and `description` (the routing signal the model uses to decide when to load the skill).
- **Source**: a `source` URL pointing at the upstream `SKILL.md` directory on GitHub (either inside `inference-gateway/skills` for vendored skills, or in a third-party repo for external skills).
- **Provenance**: `vendor`, `license`, `homepage`.
- **Discoverability**: `tags` and `categories`.

The catalog is consumed by:

- [registry.inference-gateway.com/skills/](https://registry.inference-gateway.com/skills/) - human-browsable listing.
- [registry.inference-gateway.com/skills/index.json](https://registry.inference-gateway.com/skills/index.json) - machine-readable index used by `infer skills search` and `infer skills install <name>` in the [Inference Gateway CLI](/cli-skills/).

The raw catalog is also served at:

```text
https://cdn.jsdelivr.net/gh/inference-gateway/skills@main/catalog.json
```

## How the catalog is built

`catalog.json` is **generated, not hand-edited**. The single source of truth is `skills.yaml` at the root of [`inference-gateway/skills`](https://github.com/inference-gateway/skills/blob/main/skills.yaml). A build script (`scripts/build-catalog.mjs`) reads every entry, fetches the upstream `SKILL.md` from `raw.githubusercontent.com` at the pinned `ref`, parses its YAML frontmatter, validates it, and writes the merged catalog.

When an entry's `url` points back at `inference-gateway/skills`, the script reads the `SKILL.md` from the working tree instead of fetching it - that way PRs that add a new vendored skill build correctly before they merge.

### Rebuild triggers

The `.github/workflows/build-catalog.yml` job runs on:

- **Push** to `main` touching `skills.yaml`, `skills/**`, `scripts/build-catalog.mjs`, `package.json`, `package-lock.json`, or the workflow itself.
- **Daily cron** at `0 4 * * *` UTC, so upstream `SKILL.md` changes (new versions, fixed descriptions) roll into the catalog without anyone touching this repo.
- **Manual dispatch** via `workflow_dispatch`.

On a successful build the workflow opens a pull request titled `chore(catalog): Rebuild catalog.json` with the regenerated `catalog.json` attached. Merging that PR is what publishes the new catalog.

### Cache propagation

Consumers read the catalog from jsDelivr's `@main` URL. jsDelivr caches the `@main` ref for **up to ~12 hours**, so a freshly merged PR can take that long to appear in the live registry and CLI search. If you need a faster cache bust, pin to a release tag (`@<tag>`) - tags are immutable and cached aggressively but the URL changes per release, so consumers explicitly opt in.

## SKILL.md spec compliance

Every skill body - whether vendored in this repo or hosted in a third-party repo - must be a valid [Agent Skills](https://github.com/anthropics/skills/tree/main/spec) `SKILL.md`. That means a markdown file with YAML frontmatter at the top:

```markdown
---
name: pdf-helper
description: Extract text from PDFs. Use when the user asks to read, summarise, or analyse a PDF file.
license: Apache-2.0
---

# PDF Helper

1. Use the Bash tool to invoke `pdftotext input.pdf -` and capture stdout.
2. If the PDF is image-only, fall back to `tesseract` for OCR.
```

Optional sibling directories (`references/`, `scripts/`, `assets/`) hold supporting material the model reads or executes once the skill is loaded.

### Field validation rules

The build script enforces these rules on every entry. Any failure aborts the catalog write - the workflow never publishes a partial catalog.

| Field         | Rule                                                                                                                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | Required. Must match `^[a-z0-9-]+$` (lowercase kebab-case). Must be unique across every entry in the catalog - duplicates fail the build with a clear error rather than silently shadowing.                                       |
| `description` | Required. 1 to 1024 characters per the [Agent Skills spec](https://github.com/anthropics/skills/tree/main/spec). This is the routing signal the model uses to decide when to load the skill - make it actionable, not decorative. |
| `license`     | Must be one of the ADL Skill license enum values (see below). Either declare it in the `skills.yaml` entry or set it in the upstream `SKILL.md` frontmatter; the build script reads from the entry first, then the frontmatter.   |
| `vendor`      | Required in the `skills.yaml` entry. Shown in the registry UI.                                                                                                                                                                    |
| `tags`        | Required array of discoverability strings.                                                                                                                                                                                        |
| `categories`  | Required array of catalog categories.                                                                                                                                                                                             |

#### Accepted `license` values

The ADL Skill license enum (also used by the [ADL CLI](/adl-cli/#accepted-license-values)):

| Identifier     | Notes                                       |
| -------------- | ------------------------------------------- |
| `MIT`          | Permissive                                  |
| `Apache-2.0`   | Permissive, patent grant                    |
| `BSD-2-Clause` | Permissive                                  |
| `BSD-3-Clause` | Permissive                                  |
| `GPL-2.0`      | Copyleft                                    |
| `GPL-3.0`      | Copyleft                                    |
| `LGPL-2.1`     | Weak copyleft                               |
| `LGPL-3.0`     | Weak copyleft                               |
| `MPL-2.0`      | Weak copyleft                               |
| `ISC`          | Permissive                                  |
| `CC0-1.0`      | Public domain dedication                    |
| `CC-BY-4.0`    | Creative Commons, attribution               |
| `CC-BY-SA-4.0` | Creative Commons, attribution + share-alike |
| `Unlicense`    | Public domain dedication                    |
| `Proprietary`  | Closed-source / all rights reserved         |

SPDX expressions like `MIT OR Apache-2.0` are not accepted - pick a single identifier.

## Contributing a third-party skill

Until recently, listing a third-party skill meant hand-editing `catalog.json` in `inference-gateway/skills`. That's no longer the case. Contribution is now a one-line PR against `skills.yaml`, identical in shape to the [agents catalog flow](https://github.com/inference-gateway/agents).

### 1. Publish a SKILL.md in your repo

Pick a public GitHub repo and add a `SKILL.md` (at the repo root or at a stable subdirectory path) that conforms to the [Agent Skills spec](https://github.com/anthropics/skills/tree/main/spec). Make sure `name` matches the directory it sits in, and that the frontmatter validates against the rules above (kebab-case `name`, 1-1024 char `description`, an accepted `license`).

Then tag a release. **Pinning a release tag is strongly recommended** so upstream changes can't break the catalog mid-cycle.

### 2. Open a PR against `skills.yaml`

Add one entry to [`skills.yaml`](https://github.com/inference-gateway/skills/blob/main/skills.yaml) in `inference-gateway/skills`:

```yaml
skills:
  # ...existing entries...

  - url: https://github.com/your-org/your-skill-repo
    ref: v0.1.0 # branch, tag, or commit SHA - pin a tag
    path: SKILL.md # optional; defaults to SKILL.md at the repo root
    vendor: your-org
    license: Apache-2.0
    tags:
      - tag1
      - tag2
    categories:
      - category1
    homepage: https://github.com/your-org/your-skill-repo
```

| Field        | Required | Notes                                                                                                                                                                                               |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`        | Yes      | Full `https://github.com/<owner>/<repo>` URL.                                                                                                                                                       |
| `ref`        | No       | Branch, tag, or commit SHA. Defaults to `main`. Pin a tag for third-party entries.                                                                                                                  |
| `path`       | No       | Path to the `SKILL.md` within the repo, relative to the repo root. Defaults to `SKILL.md`. Required for multi-skill repos.                                                                          |
| `vendor`     | Yes      | Vendor or organisation name shown in the registry UI.                                                                                                                                               |
| `license`    | No       | SPDX identifier from the ADL Skill enum. If omitted, the build script reads it from the upstream `SKILL.md` frontmatter. One source or the other must provide it, otherwise the build fails closed. |
| `tags`       | Yes      | String array surfaced in registry search.                                                                                                                                                           |
| `categories` | Yes      | String array used by the registry's category filter.                                                                                                                                                |
| `homepage`   | No       | URL to the upstream project page.                                                                                                                                                                   |

### 3. Wait for the rebuild

Once your PR is merged:

1. The `Build catalog` workflow runs on `push` to `main` (the merge counts as a push touching `skills.yaml`).
2. It fetches your `SKILL.md` at the pinned `ref`, validates everything, opens a `chore(catalog): Rebuild catalog.json` PR.
3. A maintainer merges that follow-up PR.
4. Within the jsDelivr `@main` cache window (up to ~12h), your skill appears in `infer skills search` and on [registry.inference-gateway.com/skills/](https://registry.inference-gateway.com/skills/).

If you don't want to wait for the cron, a maintainer can trigger the workflow manually via `workflow_dispatch`.

### Local preview

You can run the build locally before opening the PR:

```bash
git clone https://github.com/inference-gateway/skills
cd skills
npm install
npm run build
```

If anything is wrong with your entry (invalid frontmatter, missing license, duplicate `name`, unreachable `url`), the build fails with a clear error before you submit.

## Parallel: agents catalog

The skills catalog mirrors the [`inference-gateway/agents`](https://github.com/inference-gateway/agents) flow almost one-for-one:

| Concern              | `inference-gateway/skills`                                       | `inference-gateway/agents`                                        |
| -------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| Source list          | `skills.yaml` - flat array of `{url, ref, path, ...}`            | `agents.yaml` - flat array of `{url, ref}`                        |
| Aggregated artifact  | `catalog.json`                                                   | `catalog.json`                                                    |
| Build script         | `scripts/build-catalog.mjs` (fetch + validate frontmatter)       | `scripts/build-catalog.mjs` (fetch + validate against ADL schema) |
| Workflow             | `.github/workflows/build-catalog.yml`                            | `.github/workflows/build-catalog.yml`                             |
| Daily cron           | `0 4 * * *` UTC                                                  | `0 4 * * *` UTC                                                   |
| Commit message       | `chore(catalog): Rebuild catalog.json`                           | `chore(catalog): Rebuild catalog.json [skip ci]`                  |
| Publish mechanism    | Opens a PR via `peter-evans/create-pull-request`                 | Direct auto-commit via `stefanzweifel/git-auto-commit-action`     |
| CDN URL              | `cdn.jsdelivr.net/gh/inference-gateway/skills@main/catalog.json` | `cdn.jsdelivr.net/gh/inference-gateway/agents@main/catalog.json`  |
| Third-party contract | One-line PR against `skills.yaml`                                | One-line PR against `agents.yaml`                                 |

If you've contributed to the agents catalog before, the only thing to relearn is that skills entries need more fields than agents entries (`vendor`, `tags`, `categories` are required because there's no ADL manifest to read them from).

## Related

- [Agent Skills in the CLI](/cli-skills/) - how `infer skills list / install / uninstall` work on the consumer side.
- [ADL CLI - Skills](/adl-cli/#skills) - how to declare skills inside an A2A agent project so they get scaffolded into `skills/<id>/SKILL.md`.
- [A2A Registry](/registry/) - the parallel catalog for A2A agents (containerised services), browseable at [registry.inference-gateway.com](https://registry.inference-gateway.com).
- [Skills repository](https://github.com/inference-gateway/skills) - source list, build script, vendored skill bodies.
- [Agent Skills spec](https://github.com/anthropics/skills/tree/main/spec) - the upstream `SKILL.md` format the catalog enforces.
