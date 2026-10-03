---
title: Agent Skills
description: Install, enable, and invoke Agent Skills in the Inference Gateway CLI - the on-disk SKILL.md layout, the three discovery scopes (project .infer/skills, the .agents/skills open standard, and user-global ~/.infer/skills), the built-in tmux, bug, demo, and config skills seeded into ~/.infer/skills on infer init (seed-if-absent), infer skills install/list/uninstall, deterministic slash-name activation with metadata-only injection, and the Read-sandbox carve-out for ~/.infer/skills.
---

# Agent Skills

**Agent Skills** are reusable, model-readable instruction folders that the [Inference Gateway CLI](/cli/) (`infer`) loads on demand. Each skill is a directory with a `SKILL.md` playbook; the agent reads the body only when the skill is relevant, so a skill costs only its one-line metadata until it is actually used (and nothing at all when disabled).

The CLI uses the **same on-disk format** as Claude Code, Gemini CLI, and OpenAI Codex CLI, so a folder authored for any of those tools drops into `.infer/skills/` - or the cross-tool [`.agents/skills/` open standard](#on-disk-layout) - unchanged. To browse or publish skills in the shared index, see the [Skills Catalog](/skills/).

> Skills are **enabled by default** - discovered skills are injected into every run's system prompt as lightweight metadata. Turn them off with `agent.skills.enabled: false` (or `INFER_AGENT_SKILLS_ENABLED=false`).

## How skills work

When skills are enabled, three things happen across every run mode (chat, `infer headless`, [channels](/cli-channels/), and [scheduled](/cli/#schedule) runs):

1. **Discovery is always injected.** The system prompt gains an `AVAILABLE SKILLS:` block listing each discovered skill's `name`, scope, `description`, and the absolute path to its `SKILL.md`. Only this metadata is added - the bodies are not loaded at startup.
2. **Explicit invocation activates a skill deterministically.** When you invoke a skill by name (see [Activation](#activation)), the CLI injects an `ACTIVE SKILL` pointer telling the agent to read that skill's `SKILL.md` and follow it. This removes the old guesswork where activation depended on the model opportunistically deciding to read a file.
3. **The body is read on demand.** Only the skill's metadata is ever injected. The `SKILL.md` body (and any `references/*.md`) stays **progressive-disclosure** - the agent reads it with the [Read tool](/cli/#read) when it actually needs it, kept reachable by the [sandbox carve-out](#skills-sandbox-carve-out).

## On-disk layout

A skill is a directory containing a `SKILL.md` file, optionally alongside supporting material the model reads or executes once the skill is active:

```text
.infer/skills/            # also scanned: .agents/skills/ and ~/.infer/skills/
└── pdf-helper/
    ├── SKILL.md          # required - the playbook + frontmatter
    ├── references/       # optional - long supporting docs, read on demand
    ├── scripts/          # optional - helper scripts the model runs via Bash
    └── assets/           # optional - templates, fixtures, images
```

The same `<name>/SKILL.md` folder layout applies under every root. The CLI scans **three locations**, in precedence order (highest first):

| Scope         | Path                              | Precedence | Notes                                                                                  |
| ------------- | --------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| Project-local | `.infer/skills/<name>/SKILL.md`   | Highest    | Checked into the project; **overrides** a same-named skill in any other scope          |
| Open standard | `.agents/skills/<name>/SKILL.md`  | Middle     | The shared `.agents/` convention, so community skill folders work without modification |
| User-global   | `~/.infer/skills/<name>/SKILL.md` | Lowest     | Personal defaults available across every project                                       |

`.agents/skills/` is an emerging **open standard** adopted across agent tooling (Claude Code, Gemini CLI, OpenAI Codex CLI, and others). The CLI scans it as a middle-precedence location so a skill folder published by a community author works unchanged, without copying it into `.infer/skills/`.

When the same `name` exists in more than one scope, the higher-precedence copy wins: a project `.infer/skills/` skill overrides an `.agents/skills/` skill, which in turn overrides a user-global `~/.infer/skills/` skill - useful for overriding a shared or personal default with a per-project variant.

### Authoring by demonstration

A skill folder does not have to be written by hand. The [OpenTask extension](/opentask/#tab-recording) records the current browser tab, you attach the capture to a task or issue, and the agent watches the frames and proposes the skill under `.agents/skills/<name>/` via a pull request - show the flow rather than describing it. Review the PR as you would any other skill contribution against [the SKILL.md contract](#the-skillmd-contract).

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

## Built-in skills

The CLI ships a small set of **built-in skills** embedded in the binary. On `infer init` they are seeded into the user-global `~/.infer/skills/` - the same directory the [skills loader scans](#on-disk-layout) - **only if absent** ("seed-if-absent"). Once on disk they are ordinary user-scope skills: discovered, shown by `infer skills list`, and injected as lightweight metadata exactly like a skill you authored there yourself. Because seeding never overwrites an existing folder, **your edits survive** every later `infer init`.

Four built-ins ship today:

| Skill    | What it teaches the agent                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tmux`   | Drive interactive terminal programs - TUIs, REPLs, pagers, a debugger, or another CLI's chat UI - that the plain [Bash tool](/cli/#bash) cannot script, by running them inside tmux and scripting them with `send-keys` / `capture-pane`. It prefers to **add a pane to the tmux session you already have open** so the work stays visible, and only falls back to a **detached session** in a headless, CI, or piped run. |
| `bug`    | Turn a rough bug description into a reproduced, well-formed GitHub issue - see [The `bug` skill](#the-bug-skill) below.                                                                                                                                                                                                                                                                                                    |
| `demo`   | Record a short demo GIF of any project - a CLI, TUI or desktop GUI app: plan it up front, rehearse it unrecorded, record one take and convert it to a single `~/.infer/artifacts/demo.gif` - see [The `demo` skill](#the-demo-skill) below.                                                                                                                                                                                |
| `config` | Change an `infer` setting from chat: resolve the request to a dotted config key, confirm the change, and write it with `infer config set` - see [The `config` skill](#the-config-skill) below.                                                                                                                                                                                                                             |

Built-ins are seeded rather than published: `bug`, `demo` and `config` are **not** in the [Skills Catalog](/skills/), because they compose CLI-only tools and commands (`AskUserQuestion`, the Computer tools, `RecordStart` / `RecordStop`, `infer config`) that no other agent runtime provides.

### The `bug` skill

Invoke it with `/bug <context>`, where `<context>` is a one-line description of what went wrong:

```text
> /bug the chat UI opens a blank window on startup
```

The skill runs four phases, and **nothing is ever posted without your explicit approval**:

1. **Gather.** It asks up to four follow-up questions in a single `AskUserQuestion` round (the trigger, expected vs actual, frequency, and your OS / terminal / `infer version`). Every question offers a **`Just reproduce it`** option that ends questioning immediately. In a non-interactive run ([headless](/cli/#headless-mode), [channels](/cli-channels/), [scheduled](/cli/#schedule)) there is nobody to ask, so it skips straight to reproducing.
2. **Reproduce.** It works in a `mktemp -d` scratch directory so your project is never modified, drives terminal and TUI bugs through the `tmux` built-in (using `INFER_GATEWAY_MOCK=true` to exercise the CLI's own chat UI without a real LLM) and GUI bugs through the Computer tools, and reproduces the bug twice before trusting the recipe. The minimal step list it keeps becomes the issue's "Steps to Reproduce". If it genuinely cannot reproduce the bug, it says so rather than inventing steps.
3. **Record (opt-in).** Only after the bug reproduces, and only with your consent, it records a short clip and converts it to a GIF with `ffmpeg`, kept under GitHub's 10 MB image limit. Recording is **off by default** - it needs `computer_use.recording.enabled` in `~/.infer/computer_use.yaml` (see [Screen recording](/cli/#screen-recording)); the skill never edits that config for you. It records **window** or **region** only, never the whole screen, screenshots the target window first to check for secrets, and prints the GIF's local path for you to review - it never uploads anything itself.
4. **File.** It searches for duplicates with `gh issue list`, drafts the issue on the org `bug_report.md` template (a `[BUG]`-prefixed title, the `bug` label, and the Summary / Steps to Reproduce / Expected Behavior / Actual Behavior sections) with tokens, emails, hostnames and home-directory paths redacted, then asks for consent. On approval it hands off to `gh issue create --web`, which opens the prefilled form in your browser so you can drag the GIF in and submit it yourself - GitHub has no issue-attachment API, so the browser step doubles as the final review.

The target repository defaults to `inference-gateway/cli`; the skill uses another repo only when you name one or the working directory clearly belongs to it, and it tells you which it picked.

**Degradation, not failure.** Recording disabled, a missing `ffmpeg`, a failed capture, an unreproducible bug, or a declined consent all degrade to a **text-only report** - the skill hands you the draft and the exact `gh issue create --web` command instead of aborting.

> **Approval prompts.** `ffmpeg` and `gh` are not auto-approved, so each call goes through the normal [approval gate](/cli/#approval-workflow) unless you allow-list them under `tools.bash.mode.<mode>.allow`. In headless runs those calls are blocked rather than prompted.

### The `demo` skill

Invoke it with `/demo` (or ask in prose to demo, show or demonstrate a change - including as the tail of a bigger ask, "implement X and demo it") and the agent records a short GIF of the change working, for a CLI, TUI or desktop GUI app alike:

```text
> /demo
```

The deliverable is exactly **one GIF, `~/.infer/artifacts/demo.gif`**, recorded in a single take **after** the work is committed and pushed - recordings never enter the repository. On a pull request, `/demo` means demo that PR as it is, without changing code. When nothing would show up on screen (a refactor, CI config, internal types), the skill does not record and says why instead.

The flow is always plan, rehearse, record one take, convert:

1. **Plan.** The recording becomes the last todo, and the demo picks one to three steps a user would actually do - run the new flag, open the view that changed, trigger the message that now reads better. Passing tests are not a demo.
2. **Rehearse unrecorded.** Every `RecordStart` / `RecordStop` pair makes a video, so all trial and error happens through `tmux capture-pane` or screenshots instead: build with the repo's own command, run the steps exactly as the take will run them, and reset to a clean start.
3. **Record one take.** A single 20-45 second take, start to finish. A capped, off-target or broken take is thrown away - the rehearsal is fixed and a new take recorded; unconverted takes never reach anything user-visible.
4. **Convert.** `ffmpeg` turns the good take into the fixed `demo.gif` name - converting again replaces the GIF rather than adding a second one. Locally the agent prints the GIF's path for you to review; in CI it is embedded in the [result comment](/github-action/#result-comment).

Where it records depends on where it runs:

- **Locally** it records **window** or **region** only, never the whole screen, so nothing else you have open is captured. Terminal programs are driven through the `tmux` built-in and GUI apps with the Computer tools. Recording is **off by default** - it needs `computer_use.recording.enabled` (see [Screen recording](/cli/#screen-recording)), which the skill never edits for you.
- **In CI** ([`record-demo` on the GitHub Action](/github-action/#demo-recordings)) the action provides a virtual display whose only window is the demo terminal, so screen mode captures exactly what the demo puts on it - and `~/.infer/artifacts` is the delivery channel: everything in it is embedded in the result comment, which is why a recording never needs to enter the repository.

**Recording off? Degradation, not failure.** When recording is unavailable - locally the config knob above, in CI a request that did not ask for a demo - the skill says so once, never edits config, and shows the steps as commands plus captured output or screenshots instead. It is not for reproducing bugs; that is [the `bug` skill](#the-bug-skill).

### The `config` skill

Invoke it with `/config <request>` and describe the setting in prose - the skill finds the key so you do not have to remember the name or the YAML layout:

```text
> /config set the gateway timeout to 300
```

It also answers read-only questions (`/config what is my max_turns`) and stops there.

The flow is resolve, confirm, write, reload, and **nothing is written without your explicit approval**:

1. **Resolve the key.** It maps the request to one or more dotted keys (`gateway.timeout`, `agent.model`, `chat.theme`, ...) and reads each with `infer config get <key>`. An unknown key is reported as such rather than guessed; an ambiguous request gets one `AskUserQuestion` round with the candidate keys. It never runs a bare `infer config get` (or a whole `gateway` / `telemetry` section), because that would print the gateway API key and telemetry headers into the conversation.
2. **Confirm.** It shows the change as `key: old -> new` plus the file it will be written to - `~/.infer/config.yaml` by default, or the project `.infer/config.yaml` when you asked for a project override - and waits for `Apply`. If you cancel, or there is no interactive user ([headless](/cli/#headless-mode), [channels](/cli-channels/), [scheduled](/cli/#schedule)), it changes nothing and hands you the exact `infer config set` command instead.
3. **Apply.** It writes the value with [`infer config set`](/cli/#configuration-commands) (adding `--project` only for an override), then reads the key back. If the value still reads as before, a project config or an `INFER_*` variable [takes precedence](/cli/#configuration-precedence) - it names the winning source rather than writing again.
4. **Hand back `/reload`.** It ends by telling you to type [`/reload`](/cli/#reloading-configuration-in-chat), and never claims the running session already uses the new value - only `/reload` knows which keys apply live.

**What it refuses.** Anything that changes what the agent may do, or that carries a credential, stays with you. The skill names the file to edit by hand and never edits it itself:

| Refused                                                     | Edit by hand                                                                                   |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Tool policy, bash allow-lists, approval behaviour           | [`~/.infer/tools.yaml`](/cli/#tool-configuration) - `config set tools.*` is rejected anyway    |
| Filesystem sandbox                                          | [`~/.infer/sandbox.yaml`](/cli/#file-sandbox)                                                  |
| MCP servers, channels, plugins, hooks, the judge            | `mcp.yaml`, `channels.yaml`, `plugins.yaml`, `hooks.yaml`, `judge.yaml` under `~/.infer/`      |
| Secrets such as `gateway.api_key`, `telemetry.otlp.headers` | Your own terminal - the skill gives you the command so the value never enters the conversation |

Settings that live in their own files (`prompts.yaml`, `computer_use.yaml`, `browser_use.yaml`, ...) are not reachable through `infer config set` either, so the skill points at the file.

> **Approval prompts.** `infer config get` and `infer config set` are **not** allow-listed by default, so every call goes through the normal [approval gate](/cli/#approval-workflow) unless you add them under `tools.bash.mode.<mode>.allow`.

### Customizing a built-in

A built-in is just a user-scope skill, so you tune it with the same knobs as any other skill - there is no special "built-in" mode:

| Goal                             | How                                                                                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Edit in place**                | Change `~/.infer/skills/tmux/SKILL.md`. A later `infer init` never re-seeds over your edit.                                                  |
| **Override per project**         | Add a `.infer/skills/tmux/` (or `.agents/skills/tmux/`) folder; it shadows the built-in for that repo ([first match wins](#on-disk-layout)). |
| **Disable it**                   | Add the name to [`agent.skills.disabled_skills`](#enabling-and-disabling).                                                                   |
| **Reset to the shipped default** | Run `infer init --overwrite` to re-seed it.                                                                                                  |

> **Refreshing a built-in after a CLI upgrade.** A plain `infer init` will **not** re-seed over an already-initialized `~/.infer`, so a newer built-in shipped by a CLI upgrade does not land automatically. To pick it up today, either replace the one `~/.infer/skills/<name>/SKILL.md` by hand, or run `infer init --overwrite` - the latter also refreshes the _other_ shipped `~/.infer` defaults, so reach for it when you want a clean baseline rather than a single-skill update. (Moving seeding to load-time is a tracked CLI follow-up.)

## Enabling and disabling

Skills are **enabled by default**. To turn them off (or back on) use the config file, the `config set` command, or an environment variable:

```yaml
# .infer/config.yaml (project) or ~/.infer/config.yaml (user)
agent:
  skills:
    enabled: true # default - set to false to turn skills off
    max_chars: 4000 # cap on the rendered AVAILABLE SKILLS block (0 disables the cap)
    disabled_skills: [] # optional list of skill names to skip
    repository: inference-gateway/skills # catalog repo the index and skill bodies resolve against
```

```bash
# Disable for this project's .infer/config.yaml
infer config set agent.skills.enabled false

# Or disable globally in ~/.infer/config.yaml
infer config set agent.skills.enabled false --userspace

# Or disable for a single run via environment variable
INFER_AGENT_SKILLS_ENABLED=false infer chat
```

| Setting                        | Type     | Default                    | Description                                                                                                                                                            |
| ------------------------------ | -------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agent.skills.enabled`         | bool     | `true`                     | Master switch. Also enables the [sandbox carve-out](#skills-sandbox-carve-out).                                                                                        |
| `agent.skills.max_chars`       | int      | `4000`                     | Cap on the rendered `AVAILABLE SKILLS` block. `0` disables the cap.                                                                                                    |
| `agent.skills.disabled_skills` | string[] | `[]`                       | Skill names to discover but never inject or activate.                                                                                                                  |
| `agent.skills.repository`      | string   | `inference-gateway/skills` | GitHub `owner/repo` the [catalog index and skill bodies](#the-skills-catalog-and-agentskillsrepository) resolve against. Point it at a fork to serve your own catalog. |

The matching environment variable `INFER_AGENT_SKILLS_ENABLED` takes precedence over the config file. To keep skills off everywhere, set `agent.skills.enabled: false` in your user config (`~/.infer/config.yaml`).

When `max_chars` is set (default `4000`), skills whose full entry would exceed the budget are listed by **name only** in the `AVAILABLE SKILLS` block - their descriptions and paths are omitted. These skills remain fully invocable via `/<name>` or the "use the `<name>` skill" phrase; the agent reads the full `SKILL.md` on demand through the [sandbox carve-out](#skills-sandbox-carve-out). Set `max_chars: 0` to disable the cap and render every skill's full entry.

The matching environment variable `INFER_AGENT_SKILLS_MAX_CHARS` overrides the config value.

## Managing skills

```bash
# List discovered skills (works regardless of agent.skills.enabled)
infer skills list
infer skills list --format json

# Install (three accepted forms) - --user installs to ~/.infer/skills
infer skills install pdf-helper --user                                              # by name, from the Skills Catalog index
infer skills install acme/internal-comms --user                                     # owner/repo GitHub shorthand
infer skills install https://github.com/anthropics/skills/tree/main/skills/pdf --user  # full directory URL

# Install flags
infer skills install pdf-helper               # project scope: ./.infer/skills, needs a writable project dir
infer skills install pdf-helper --overwrite   # replace an existing skill folder of the same name

# Uninstall by directory name
infer skills uninstall internal-comms --user  # remove from the user scope
infer skills uninstall pdf-helper             # remove from the project scope

# The same operations from inside chat
> /skills list
> /skills install acme/internal-comms --user
> /skills uninstall pdf-helper
```

`infer skills list` works whether or not the feature is enabled, so you can verify discovery (and see validation errors for skipped skills) before turning skills on.

A bare `<name>` resolves through the public [Skills Catalog](/skills/) index. The `owner/repo` and full-URL forms install straight from GitHub - the URL must point at a **directory** (`https://github.com/<owner>/<repo>/tree/<ref>/<path>`); URLs at `/blob/` (a file) or the repo root are rejected with a clear error.

**Installer notes:**

- **Prefer `--user`.** `infer skills install` writes to **`./.infer/skills/` by default**, so a bare install only works when the current directory is a writable project you intend to commit the skill into. Outside such a directory - a shell in `$HOME`, a CI job, or any run where the agent starts elsewhere - the project-scoped install fails or lands in a directory nothing discovers; **`--user` writes to `~/.infer/skills/`**, which is discovered from anywhere. It never installs into `.agents/skills/` - that location is for skill folders you vendor yourself or that another agent tool drops in, and the CLI discovers them there read-only (see [On-disk layout](#on-disk-layout)).
- Frontmatter is **re-validated after download** against the same rules used at discovery - a half-installed skill is never left on disk. Without `--overwrite`, an existing folder is left untouched and the install fails fast.
- Unauthenticated GitHub requests are limited to **60 per hour per IP** (easily exhausted on shared CI runners). Set `GITHUB_TOKEN` (or `GH_TOKEN`, matching the `gh` CLI) to raise the limit to 5,000/hour and to install from private repositories the token can access.
- Refs containing a literal `/` (such as `feature/foo` branches) are not supported - use a tag, the default branch, or a single-segment branch.
- Uninstall takes the on-disk directory name, regex-validated before any filesystem operation, so it cannot traverse outside the skills directory. There is no confirmation prompt (it matches `npm uninstall` / `brew uninstall`).

## The skills catalog and `agent.skills.repository`

A bare `<name>` install (and the on-demand catalog download described in [Security](#security)) resolves through a catalog served straight from GitHub. The `agent.skills.repository` config (default `inference-gateway/skills`) is the `owner/repo` that catalog resolves against, so pointing it at a fork lets anyone serve their own skills.

### The derived index URL

The repository is the **single source** for both the index and the skill bodies. The CLI derives the index URL from it:

```text
https://raw.githubusercontent.com/<repository>/main/catalog.json
```

The default `inference-gateway/skills` therefore reads `https://raw.githubusercontent.com/inference-gateway/skills/main/catalog.json` (the same `catalog.json` the [Skills Catalog](/skills/) publishes). Skill bodies resolve against that same repository - there is no second host to configure.

### The `catalog.json` schema

`catalog.json` has a versioned header plus a flat `skills` array. The CLI is **tolerant**: it reads only a few fields and ignores the rest, so extra keys are harmless.

Top-level:

| Field     | Read by the CLI?                   | Notes                                               |
| --------- | ---------------------------------- | --------------------------------------------------- |
| `version` | No                                 | Schema/format version. Ignored today.               |
| `release` | Yes - `infer skills search` header | Catalog release tag, shown in the search header.    |
| `updated` | Yes - `infer skills search` header | Last-rebuild timestamp, shown in the search header. |
| `skills`  | Yes                                | The array of catalog entries.                       |

Per entry in `skills`:

| Field         | Read by the CLI? | Notes                                                                        |
| ------------- | ---------------- | ---------------------------------------------------------------------------- |
| `name`        | Yes              | Kebab-case identity; what `infer skills install <name>` resolves.            |
| `description` | Yes              | Routing signal listed to the model and in search results.                    |
| `source`      | No               | Upstream `SKILL.md` location. Ignored - bodies resolve against `repository`. |
| `vendor`      | No               | Provenance, shown in the registry UI. Ignored by the CLI.                    |
| `license`     | No               | Ignored by the CLI.                                                          |
| `tags`        | No               | Ignored by the CLI.                                                          |
| `categories`  | No               | Ignored by the CLI.                                                          |
| `homepage`    | No               | Ignored by the CLI.                                                          |

### Versioning

The catalog is versioned **as a whole** via the top-level `release` / `updated` header - there is no per-skill version field, so there is nothing to pin per skill. To pin a known-good catalog, pin the whole thing (a fork or tag) via `agent.skills.repository`.

## Activation

Discovery puts every skill's metadata in the system prompt, but **activation is explicit and deterministic**. The CLI scans your messages for an invocation and, on a match, injects an `ACTIVE SKILL` pointer - the invoked skill's `description` and absolute `SKILL.md` path - instructing the agent to read that file and follow it.

Two triggers activate a skill, in **any** run mode (chat, `infer headless`, channels, scheduled runs):

| Trigger                                            | Example                    | Where it works                                              |
| -------------------------------------------------- | -------------------------- | ----------------------------------------------------------- |
| `/<name>` slash invocation                         | `/pdf-helper`              | Chat input                                                  |
| "use the `<name>` skill" phrase (case-insensitive) | `use the pdf-helper skill` | Any mode - chat, `infer headless`, channels, scheduled runs |

Typing `/pdf-helper` for a known installed skill is now routed to the agent and flags the skill active, rather than dead-ending as an "Unknown shortcut".

Skills appear in the `/` autocomplete list alongside commands and shortcuts, labelled by kind: an installed skill shows as `skill`, and a catalog skill that is not on disk yet shows as `remote skill`. See [Autocomplete kinds](/cli/#autocomplete-kinds) for all four labels.

Activation behavior:

- **Only metadata is injected.** The pointer carries the skill's description and path - never the full body. The `SKILL.md` body stays progressive-disclosure and is read on demand with the [Read tool](/cli/#read), reachable thanks to the [sandbox carve-out](#skills-sandbox-carve-out).
- **More than one skill can be activated** in a single message (for example `/pdf-helper /git-helper`, or naming two skills in prose).
- **Repeated invocations are de-duplicated** across the conversation, and tokens that don't match a known skill are ignored.
- **Only your messages are scanned** - a skill name appearing in an assistant reply does not self-activate the skill.

> `/skills <cmd>` and `/<name>` are different things. `/skills list|install|uninstall` **manages** skills; `/<name>` (a bare skill name) **activates** an already-installed skill for the current turn.

## Skills sandbox carve-out

A skill's instructions only reach the model through the Read tool (progressive disclosure). But skills live under the config dirs, and the default [file sandbox](/cli/#file-sandbox) policy denies `.infer/` with `on_violation: approval`, while user-scope skills in `~/.infer/skills` also sit outside the allowed list (`.` and `/tmp`):

```yaml
filesystem:
  allowed:
    - .
    - /tmp
  denied:
    - path: .infer/
      on_violation: approval
```

Without a carve-out, `Read ~/.infer/skills/<name>/SKILL.md` would prompt for approval or fall outside the sandbox entirely, so the skill never loads unattended. This is exactly what broke the `@infer` CI bot, which installs to the user scope with `infer skills install <skill> --user --overwrite` and then runs the agent outside the project directory.

**The carve-out:** when `agent.skills.enabled` is `true`, the sandbox automatically grants read access to `./.infer/skills` and `~/.infer/skills` (and everything under them), skipping the `.infer/` denial. Installed `SKILL.md` and `references/*.md` are therefore reachable without a prompt even when the agent runs outside the project directory, such as in CI.

### How it relates to `filesystem.allowed`

The carve-out is automatic and additive - you do **not** add the skills directories to `filesystem.allowed` in `~/.infer/sandbox.yaml` yourself:

| Aspect               | Configured `filesystem.allowed`    | Skills carve-out                                    |
| -------------------- | ---------------------------------- | --------------------------------------------------- |
| Default value        | `.` and `/tmp`                     | `./.infer/skills` and `~/.infer/skills`             |
| How it is granted    | Explicit - you list each path      | Implicit - applied only when `agent.skills.enabled` |
| Access               | Governs file tool access generally | Read-only, scoped to the skills directories         |
| When skills disabled | Unchanged                          | Not applied (Read of `~/.infer/skills` asks)        |

Two guarantees still hold on top of the carve-out:

- **A blocking `denied` entry wins.** Denied entries are evaluated first, so a file like `*.env` or `auth.yaml` under the skills tree stays denied even though the directory is carved out.
- **Lookalike siblings are not granted.** Only the exact `./.infer/skills` and `~/.infer/skills` directories (and their descendants) are allowed - a sibling such as `~/.infer/skills-backup` is not.

See the [file sandbox](/cli/#file-sandbox) for the entry forms, the decision order and how grants are persisted.

## Security

A skill can instruct the model to run shell commands, read files, or call external APIs. Treat a skill like any other piece of executable content - **only install skills from trusted sources**. The CLI's normal [tool-approval system](/cli/#approval-workflow) still gates each Write/Edit/Delete/Bash call, but a malicious skill could craft a plausible-looking command. The `name` validator rejecting vendor strings (`claude`, `anthropic`, `gemini`, `openai`, `infer`) makes impersonating an official skill harder, but it is not a substitute for reviewing what you install.

### On-demand catalog downloads

A catalog skill (one from [`agent.skills.repository`](#the-skills-catalog-and-agentskillsrepository) that is not yet on disk - shown as `remote skill` in `/` autocomplete, against `skill` for one already installed) can be **fetched and installed the moment a prompt names it** - so anyone writing a prompt that reaches a profile, not just whoever installed the skills, decides what gets downloaded. If you run a CI or Telegram profile, know that a prompt containing `/some-skill` can trigger a download. The trust model:

- **Only an explicit name triggers it.** A catalog skill downloads when a prompt explicitly names it (`/rust`, or "use the rust skill"). The **model cannot trigger this on its own** - catalog entries are listed to it without a path, so it has no way to reach an un-downloaded body.
- **Chat asks first.** In interactive chat the install is **confirmed by the user** before it happens.
- **Headless downloads immediately.** `infer headless`, piped `infer chat`, [channels](/cli-channels/), and [scheduled/heartbeat](/cli/#schedule) runs download with **no prompt, by design** - there is nobody to ask.
- **It is not a tool call, so tool approval does not gate it.** The download is not a `domain.Tool`, so [`tools.safety.require_approval`](/cli/#approval-workflow) and `approval_behaviour` do not apply. Notably, `approval_behaviour: block` does **not** prevent it.
- **Under channels the "user" is remote.** In a [channel](/cli-channels/) the party whose prompt triggers the download is a **remote sender**, not the operator running the profile.

## Related

- [Skills Catalog](/skills/) - browse the shared index and publish a skill via a one-line PR.
- [CLI](/cli/) - overview of the `infer` command-line tool, modes, tools, and shortcuts.
- [Configuration](/configuration/) - the full configuration system across the gateway and CLI.
- [ADL CLI - Skills](/adl-cli/#skills) - declare skills inside an A2A agent project so they scaffold into `.agents/skills/<id>/SKILL.md`.
- [OpenTask - Tab recording](/opentask/#tab-recording) - record a browser flow and let the agent distill it into a skill PR.
