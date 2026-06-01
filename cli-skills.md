---
title: Agent Skills
description: Install, enable, and invoke Agent Skills in the Inference Gateway CLI - the on-disk SKILL.md layout, project vs user scopes, infer skills install/list/uninstall, deterministic slash-name activation with metadata-only injection, and the Read-sandbox carve-out for ~/.infer/skills.
---

# Agent Skills

**Agent Skills** are reusable, model-readable instruction folders that the [Inference Gateway CLI](/cli/) (`infer`) loads on demand. Each skill is a directory with a `SKILL.md` playbook; the agent reads it only when the skill is relevant, so skills add **zero token cost when they are off** and are cheap when on.

The CLI uses the **same on-disk format** as Claude Code, Gemini CLI, and OpenAI Codex CLI, so a folder authored for any of those tools drops into `.infer/skills/` unchanged. To browse or publish skills in the shared index, see the [Skills Catalog](/skills/).

> Skills are **disabled by default**. Nothing about them touches a run until you set `agent.skills.enabled: true` (or `INFER_AGENT_SKILLS_ENABLED=true`).

## How skills work

When skills are enabled, three things happen across every run mode (chat, `infer agent`, [channels](/cli-channels/), and [scheduled](/cli/#schedule) runs):

1. **Discovery is always injected.** The system prompt gains an `AVAILABLE SKILLS:` block listing each discovered skill's `name`, scope, `description`, and the absolute path to its `SKILL.md`. Only this metadata is added - the bodies are not loaded at startup.
2. **Explicit invocation activates a skill deterministically.** When you invoke a skill by name (see [Activation](#activation)), the CLI injects an `ACTIVE SKILL` pointer telling the agent to read that skill's `SKILL.md` and follow it. This removes the old guesswork where activation depended on the model opportunistically deciding to read a file.
3. **The body is read on demand.** Only the skill's metadata is ever injected. The `SKILL.md` body (and any `references/*.md`) stays **progressive-disclosure** - the agent reads it with the [Read tool](/cli/#read) when it actually needs it, kept reachable by the [sandbox carve-out](#skills-sandbox-carve-out).

## On-disk layout

A skill is a directory containing a `SKILL.md` file, optionally alongside supporting material the model reads or executes once the skill is active:

```text
.infer/skills/
└── pdf-helper/
    ├── SKILL.md          # required - the playbook + frontmatter
    ├── references/       # optional - long supporting docs, read on demand
    ├── scripts/          # optional - helper scripts the model runs via Bash
    └── assets/           # optional - templates, fixtures, images
```

The CLI scans two scopes:

| Scope         | Path                              | Notes                                                                 |
| ------------- | --------------------------------- | --------------------------------------------------------------------- |
| Project-local | `.infer/skills/<name>/SKILL.md`   | Checked into the project; **overrides** a user skill of the same name |
| User-global   | `~/.infer/skills/<name>/SKILL.md` | Personal defaults available across every project                      |

When a project skill and a user skill share a `name`, the project copy wins - useful for overriding a personal default with a per-project variant.

## The SKILL.md contract

`SKILL.md` is a markdown file with a YAML frontmatter block at the top:

```markdown
---
name: pdf-helper
description: Extract text from PDFs. Use when the user asks to read, summarise, or analyse a PDF file.
---

# PDF Helper

1. Use the Bash tool to invoke `pdftotext input.pdf -` and capture stdout.
2. If the PDF is image-only, fall back to `tesseract` for OCR.
```

Frontmatter rules, validated at discovery time and re-validated after every install:

| Field         | Rule                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`        | Required. ≤64 chars, lowercase letters / digits / hyphens only. Must equal the directory name. Must not contain `infer`, `claude`, `anthropic`, `gemini`, or `openai`.         |
| `description` | Required. Non-empty, ≤1024 chars. This is the routing signal the model uses to decide when a skill is relevant - make it actionable (say _what_ it does and _when_ to use it). |

Unknown frontmatter keys (for example Anthropic's `allowed-tools:` or Gemini's `disabled:`) are tolerated and ignored, so cross-vendor skills validate without edits.

## Enabling

Skills are disabled by default. Enable them via config or an environment variable:

```yaml
# .infer/config.yaml (project) or ~/.infer/config.yaml (user)
agent:
  skills:
    enabled: true
    disabled_skills: [] # optional list of skill names to skip
```

```bash
INFER_AGENT_SKILLS_ENABLED=true infer chat
```

| Setting                        | Type     | Default | Description                                                                     |
| ------------------------------ | -------- | ------- | ------------------------------------------------------------------------------- |
| `agent.skills.enabled`         | bool     | `false` | Master switch. Also enables the [sandbox carve-out](#skills-sandbox-carve-out). |
| `agent.skills.disabled_skills` | string[] | `[]`    | Skill names to discover but never inject or activate.                           |

The matching environment variable `INFER_AGENT_SKILLS_ENABLED` takes precedence over the config file.

## Managing skills

```bash
# List discovered skills (works regardless of agent.skills.enabled)
infer skills list
infer skills list --format json

# Install (three accepted forms)
infer skills install pdf-helper                                              # by name, from the Skills Catalog index
infer skills install acme/internal-comms                                     # owner/repo GitHub shorthand
infer skills install https://github.com/anthropics/skills/tree/main/skills/pdf  # full directory URL

# Install flags
infer skills install pdf-helper --user        # install to ~/.infer/skills instead of ./.infer/skills
infer skills install pdf-helper --overwrite   # replace an existing skill folder of the same name

# Uninstall by directory name
infer skills uninstall pdf-helper
infer skills uninstall internal-comms --user  # remove from the user scope

# The same operations from inside chat
> /skills list
> /skills install acme/internal-comms
> /skills uninstall pdf-helper
```

`infer skills list` works whether or not the feature is enabled, so you can verify discovery (and see validation errors for skipped skills) before turning skills on.

A bare `<name>` resolves through the public [Skills Catalog](/skills/) index. The `owner/repo` and full-URL forms install straight from GitHub - the URL must point at a **directory** (`https://github.com/<owner>/<repo>/tree/<ref>/<path>`); URLs at `/blob/` (a file) or the repo root are rejected with a clear error.

**Installer notes:**

- Frontmatter is **re-validated after download** against the same rules used at discovery - a half-installed skill is never left on disk. Without `--overwrite`, an existing folder is left untouched and the install fails fast.
- Unauthenticated GitHub requests are limited to **60 per hour per IP** (easily exhausted on shared CI runners). Set `GITHUB_TOKEN` (or `GH_TOKEN`, matching the `gh` CLI) to raise the limit to 5,000/hour and to install from private repositories the token can access.
- Refs containing a literal `/` (such as `feature/foo` branches) are not supported - use a tag, the default branch, or a single-segment branch.
- Uninstall takes the on-disk directory name, regex-validated before any filesystem operation, so it cannot traverse outside the skills directory. There is no confirmation prompt (it matches `npm uninstall` / `brew uninstall`).

## Activation

Discovery puts every skill's metadata in the system prompt, but **activation is explicit and deterministic**. The CLI scans your messages for an invocation and, on a match, injects an `ACTIVE SKILL` pointer - the invoked skill's `description` and absolute `SKILL.md` path - instructing the agent to read that file and follow it.

Two triggers activate a skill, in **any** run mode (chat, `infer agent`, channels, scheduled runs):

| Trigger                                            | Example                    | Where it works                                           |
| -------------------------------------------------- | -------------------------- | -------------------------------------------------------- |
| `/<name>` slash invocation                         | `/pdf-helper`              | Chat input                                               |
| "use the `<name>` skill" phrase (case-insensitive) | `use the pdf-helper skill` | Any mode - chat, `infer agent`, channels, scheduled runs |

Typing `/pdf-helper` for a known installed skill is now routed to the agent and flags the skill active, rather than dead-ending as an "Unknown shortcut".

Activation behavior:

- **Only metadata is injected.** The pointer carries the skill's description and path - never the full body. The `SKILL.md` body stays progressive-disclosure and is read on demand with the [Read tool](/cli/#read), reachable thanks to the [sandbox carve-out](#skills-sandbox-carve-out).
- **More than one skill can be activated** in a single message (for example `/pdf-helper /git-helper`, or naming two skills in prose).
- **Repeated invocations are de-duplicated** across the conversation, and tokens that don't match a known skill are ignored.
- **Only your messages are scanned** - a skill name appearing in an assistant reply does not self-activate the skill.

> `/skills <cmd>` and `/<name>` are different things. `/skills list|install|uninstall` **manages** skills; `/<name>` (a bare skill name) **activates** an already-installed skill for the current turn.

## Skills sandbox carve-out

A skill's instructions only reach the model through the Read tool (progressive disclosure). But user-scope skills live in `~/.infer/skills`, which is **outside the default Read sandbox**:

```yaml
tools:
  sandbox:
    directories: ['.', '/tmp', '.infer/tmp'] # default
```

Without a carve-out, `Read ~/.infer/skills/<name>/SKILL.md` is denied as "outside configured sandbox directories", so the skill never loads. This is exactly what broke the `@infer` CI bot, which installs to the user scope with `infer skills install <skill> --user --overwrite` and then runs the agent outside the project directory.

**The carve-out:** when `agent.skills.enabled` is `true`, the Read sandbox automatically grants read access to `./.infer/skills` and `~/.infer/skills` (and everything under them), mirroring the existing `~/.claude` carve-out. Installed `SKILL.md` and `references/*.md` are therefore reachable even when the agent runs outside the project directory, such as in CI.

### How it relates to `tools.sandbox.directories`

The carve-out is automatic and additive - you do **not** add the skills directories to `tools.sandbox.directories` yourself:

| Aspect               | Configured `tools.sandbox.directories` | Skills carve-out                                    |
| -------------------- | -------------------------------------- | --------------------------------------------------- |
| Default value        | `['.', '/tmp', '.infer/tmp']`          | `./.infer/skills` and `~/.infer/skills`             |
| How it is granted    | Explicit - you list each directory     | Implicit - applied only when `agent.skills.enabled` |
| Access               | Governs Read tool access generally     | Read-only, scoped to the skills directories         |
| When skills disabled | Unchanged                              | Not applied (Read of `~/.infer/skills` is denied)   |

Two guarantees still hold on top of the carve-out:

- **`tools.sandbox.protected_paths` wins.** Protected patterns are checked first, so a file like `*.env` or `.infer/config.yaml` under the skills tree stays denied even though the directory is carved out.
- **Lookalike siblings are not granted.** Only the exact `./.infer/skills` and `~/.infer/skills` directories (and their descendants) are allowed - a sibling such as `~/.infer/skills-backup` is not.

If you set `tools.sandbox.directories: []`, sandboxing is disabled entirely and the carve-out is moot. See the [CLI security model](/cli/#security) for the full sandbox and protected-paths picture.

## Security

A skill can instruct the model to run shell commands, read files, or call external APIs. Treat a skill like any other piece of executable content - **only install skills from trusted sources**. The CLI's normal [tool-approval system](/cli/#approval-workflow) still gates each Write/Edit/Delete/Bash call, but a malicious skill could craft a plausible-looking command. The `name` validator rejecting vendor strings (`claude`, `anthropic`, `gemini`, `openai`, `infer`) makes impersonating an official skill harder, but it is not a substitute for reviewing what you install.

## Related

- [Skills Catalog](/skills/) - browse the shared index and publish a skill via a one-line PR.
- [CLI](/cli/) - overview of the `infer` command-line tool, modes, tools, and shortcuts.
- [Configuration](/configuration/) - the full configuration system across the gateway and CLI.
- [ADL CLI - Skills](/adl-cli/#skills) - declare skills inside an A2A agent project so they scaffold into `skills/<id>/SKILL.md`.
- Source: [inference-gateway/cli#571](https://github.com/inference-gateway/cli/pull/571) (activation + sandbox carve-out), fixing [inference-gateway/cli#569](https://github.com/inference-gateway/cli/issues/569).
