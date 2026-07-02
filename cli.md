---
title: Inference Gateway CLI
description: The Inference Gateway CLI (infer) - interactive chat, autonomous agents, Computer Use tools, MCP integration, A2A delegation, GitHub Action wizard, and remote messaging channels.
---

# Inference Gateway CLI

The Inference Gateway CLI (`infer`) is a powerful Go-based command-line tool providing comprehensive access to the Inference Gateway with interactive chat, autonomous agents, Computer Use tools, and development workflows.

**Current Version:** v0.109.0 (Breaking changes expected until stable)

## Key Features

- **Zero-Configuration Setup** - Add API keys and start chatting
- **Autonomous Agent Mode** - Delegate complex tasks with iterative execution
- **Computer Use Tools** - GUI automation with screenshot, mouse, and keyboard control
- **Rich Tool Integration** - File operations, code search, web access, GitHub via the `gh` CLI
- **Smart Safety System** - Configurable approval workflow with diff visualization
- **Beautiful TUI** - Scrollable interface with syntax highlighting and multiple themes
- **Web Terminal** - Browser-based interface with tabbed sessions
- **Remote Messaging Channels** - Control the agent from Telegram and other platforms ([Learn more](/cli-channels/))
- **Agent Skills** - Reusable, model-readable instruction folders loaded on demand, portable across vendors ([Learn more](/cli-skills/))
- **Cost Tracking** - Real-time token usage and cost calculation

## Installation

### npm / npx (Recommended)

Run the CLI without installing anything (requires Node.js >= 18). The matching native binary is downloaded and cached on first use:

```bash
npx @inference-gateway/cli@latest --help
npx @inference-gateway/cli@latest chat
```

Or install it globally:

```bash
npm install -g @inference-gateway/cli
infer --help
```

Not recommended for production - prefer the install script or building from source. Prebuilt binaries cover Linux and macOS on amd64/arm64 (on Windows, use WSL).

### Install Script (Recommended)

```bash
# Latest version
curl -fsSL https://raw.githubusercontent.com/inference-gateway/cli/main/install.sh | bash

# Specific version
curl -fsSL https://raw.githubusercontent.com/inference-gateway/cli/main/install.sh | bash -s -- --version v0.97.0

# Custom directory
curl -fsSL https://raw.githubusercontent.com/inference-gateway/cli/main/install.sh | bash -s -- --install-dir $HOME/.local/bin
```

### Go Install

```bash
go install github.com/inference-gateway/cli@latest
```

### Manual Download

Download binaries from the [GitHub releases page](https://github.com/inference-gateway/cli/releases). Binaries are signed with Cosign for verification.

### Build from Source

```bash
git clone https://github.com/inference-gateway/cli.git
cd cli
go build -o infer
```

### Shell Completions

The CLI ships an `infer completion` subcommand (provided by [fang](https://github.com/charmbracelet/fang)) that generates completion scripts for **bash**, **zsh**, **fish**, and **powershell**. Enabling completions adds tab-completion for subcommands, flags, and many flag values.

```sh
# Zsh (current session)
source <(infer completion zsh)

# Zsh (persistent) - write to a directory on $fpath
infer completion zsh > "${fpath[1]}/_infer"

# Bash (current session)
source <(infer completion bash)

# Bash (persistent)
infer completion bash > /etc/bash_completion.d/infer

# Fish
infer completion fish > ~/.config/fish/completions/infer.fish

# PowerShell
infer completion powershell | Out-String | Invoke-Expression
```

Run `infer completion --help` to list the supported shells. After writing a persistent completion file, start a new shell (or re-source your shell rc) for it to take effect. If completions do not appear, see [Shell Completions Not Working](#shell-completions-not-working).

> Shipped in [inference-gateway/cli#592](https://github.com/inference-gateway/cli/pull/592).

## Quick Start

![Inference Gateway TUI Interface](/images/tui.gif)

```bash
# Initialize configuration
infer init

# Generate AGENTS.md documentation for AI agents (recommended for new projects)
infer chat
> /init

# Check gateway status
infer status

# Start interactive chat
infer chat

# Launch web terminal
infer chat --web

# Autonomous agent mode
infer agent "Analyze this codebase and suggest improvements"

# Get help (styled output)
infer --help

# Show version
infer --version

# Enable shell completions for the current shell (zsh example)
source <(infer completion zsh)
```

### Generating AGENTS.md

For new projects, use the `/init` shortcut to automatically generate an `AGENTS.md` file. This file provides structured documentation that helps AI agents understand your project:

```bash
infer chat
> /init
```

The agent will:

1. Analyze your project structure with the Tree tool
2. Examine configuration files, build systems, and documentation
3. Generate comprehensive `AGENTS.md` including:
   - Project overview and technologies
   - Architecture and structure
   - Development environment setup
   - Key commands (build, test, lint, run)
   - Testing instructions
   - Project conventions and coding standards
   - Important files and configurations

This documentation helps other AI agents (and developers) quickly understand how to work with your project.

## Help and Version Output

The CLI's help, error, and version output are rendered with [fang](https://github.com/charmbracelet/fang), so every command produces styled, colorized output. The samples below are shown as plain text; in a real terminal the headings, flags, and errors are colorized.

### Help

`infer --help` (and `--help` on any subcommand) prints a styled usage page grouped into usage, commands, and flags. Note that `-v` is `--verbose`; version is the long-form `--version` flag.

```text
infer

A powerful command-line interface for managing and interacting with
the Inference Gateway.

USAGE
  infer [command] [--flags]

COMMANDS
  init           Initialize project configuration
  status         Check gateway health and resource usage
  chat           Interactive chat session (TUI)
  agent          Autonomous task execution
  config         Configuration management
  tools          Run and inspect agent tools directly
  completion     Generate the autocompletion script for the specified shell
  version        Show version information

FLAGS
  -h --help      Show help
  -v --verbose   Verbose output
     --version   Print version information
```

### Errors

Unknown commands and flags exit non-zero with a styled error message and no noisy usage dump (fang sets cobra's `SilenceErrors`/`SilenceUsage` and renders the error itself):

```text
$ infer badcmd
Error: unknown command "badcmd" for "infer"
$ echo $?
1
```

### Version

`infer --version` prints the version, styled by fang:

```text
$ infer --version
infer version v0.109.0
```

The standalone `version` subcommand is **kept for backwards compatibility** and prints the same information:

```bash
infer version
```

> The manual `--version` boolean flag was replaced by fang's built-in version handling (`fang.WithVersion`) in [inference-gateway/cli#592](https://github.com/inference-gateway/cli/pull/592). Both `infer --version` and the `infer version` subcommand remain supported.

## Core Commands

| Command              | Description                      | Key Features                                         |
| -------------------- | -------------------------------- | ---------------------------------------------------- |
| `infer init`         | Initialize project configuration | Creates `.infer/config.yaml` with defaults           |
| `infer status`       | Check gateway health             | Shows resource usage and connectivity                |
| `infer chat`         | Interactive chat TUI             | Streaming, scrolling, tool expansion, mode switching |
| `infer chat --web`   | Web-based terminal               | Browser interface, tabbed sessions, remote access    |
| `infer agent <task>` | Autonomous task execution        | Background operation, task planning, validation      |
| `infer config <cmd>` | Configuration management         | Generic `get`/`set` for any config key               |
| `infer tools <cmd>`  | Run agent tools directly         | Execute a tool or validate a bash command            |

### Chat Interface Features

**Navigation:**

- **Shift + Arrow Down/Up**: Scroll chat history
- **Ctrl+R**: Toggle tool result expansion
- **Shift+Tab**: Cycle agent modes (Standard -> Plan -> Auto-Accept)
- **Ctrl+K**: Toggle model thinking blocks

**Capabilities:**

- Real-time streaming with syntax highlighting
- Mouse wheel and keyboard scrolling
- Model switching during conversation
- Tool result inspection
- Cost tracking in status bar
- Collapsible thinking blocks
- GitHub issue references - type `#` to insert and expand `#N` tokens (see below)

#### GitHub Issue References (`#`)

Type `#` in the chat input to open a dropdown of the current repository's **open issues** - each entry shows the issue number, title, and state. The list is resolved through the [`gh` CLI](#github-operations) from the repo's git remote, newest first. Selecting an issue inserts a highlighted `#N` token into your message.

On submit, every `#N` token is expanded **inline** into that issue's title, body, and most recent comments (up to the latest 20) before the message is sent to the model - so the agent works from full issue context without a redundant `gh issue view` lookup.

```bash
infer chat
> Summarize #123 and propose a fix
# "#123" expands into the issue title, body, and recent comments before sending
```

**Prerequisite:** the [`gh` CLI](#github-operations) must be installed and authenticated, and the working directory must be a git repository with a remote. The feature **gracefully no-ops** when `gh` is missing, the directory is not a git repo, the repo has no remote, or authentication has expired - the dropdown simply shows nothing.

> Shipped in [inference-gateway/cli#574](https://github.com/inference-gateway/cli/pull/574).

#### Switching models (`/model`)

`/model` is the unified model command - it replaces the deprecated `/switch`:

- `/model <name>` - **permanently** switch the active model for the rest of the session.
- `/model <name> <prompt...>` - run a **single** message with `<name>`, then restore the session model afterward. Handy for sending one hard question to a stronger model without changing your default.
- `/model` (no argument) - open the model picker.

```bash
infer chat
> /model deepseek/deepseek-v4-pro                              # switch the session model
> /model anthropic/claude-opus-4-8 Explain this stack trace    # one-off, then restore
```

> `/switch` is **deprecated** - use `/model <name>`. Shipped in [inference-gateway/cli#618](https://github.com/inference-gateway/cli/pull/618).

#### Diff viewer and git staging

When the agent proposes file changes (or you open a diff), the diff viewer supports **patch-level** staging - select individual lines, split hunks, and stage or unstage everything at once. All keys are configurable in `.infer/keybindings.yaml` (category `diff_viewer`); the defaults:

| Key                 | Action                                                                        |
| ------------------- | ----------------------------------------------------------------------------- |
| `space` / `v`       | Start or clear a line-range selection within the current hunk                 |
| `a` / `u` / `enter` | Apply (stage/unstage) the selected lines - or the whole hunk if none selected |
| `s`                 | Split the current hunk into smaller, independently stageable blocks           |
| `]` / `[`           | Jump to the next / previous hunk                                              |
| `A`                 | Stage **all** changes (`git add -A`, including untracked files and deletions) |
| `U`                 | Unstage **all** changes (`git reset -q HEAD`)                                 |

Select a range with `space`/`v`, navigate, then apply to stage just those lines - or split a mixed hunk with `s` and stage each block separately. The footer hint reflects whether a selection is active, and hides `discard` when a staged file is selected (discard only applies to unstaged changes).

> Shipped in [inference-gateway/cli#618](https://github.com/inference-gateway/cli/pull/618).

## Agent Modes

Toggle between modes anytime during chat using **Shift+Tab**.

| Mode                   | Tools                 | Approval                            | Best For                                            |
| ---------------------- | --------------------- | ----------------------------------- | --------------------------------------------------- |
| **Standard** (Default) | All configured        | Required for Write/Edit/Delete/Bash | General development, collaborative coding           |
| **Plan** (Read-Only)   | Read, Grep, Tree only | None                                | Code reviews, architecture analysis, planning       |
| **Auto-Accept** (YOLO) | All configured        | None - immediate execution          | Trusted environments, rapid prototyping, automation |

### Standard Mode

Full tool access with safety controls and approval prompts for sensitive operations.

```bash
infer chat
> "Refactor the authentication module to use environment variables"
# Agent analyzes code, proposes changes, requests approval before modifying
```

### Plan Mode

Analysis and planning without execution. Safe exploration of unfamiliar codebases.

```bash
infer chat
# Press Shift+Tab to switch to Plan Mode
> "How should I implement user authentication with JWT tokens?"
# Agent explores code structure and provides detailed plan
```

While planning, the agent can pause to ask you up to four multiple-choice clarifying questions with the [`AskUserQuestion`](#askuserquestion) tool, then fold your answers into the plan it submits for approval.

#### Approving a plan

When the plan is ready, the agent calls [`RequestPlanApproval`](#requestplanapproval); the chat TUI renders the saved plan in a dedicated panel and shows a status line - use the arrow keys to select an option and **Enter** to confirm. Three options are offered:

| Option                | Key           | Resulting mode  | Effect                                                                            |
| --------------------- | ------------- | --------------- | --------------------------------------------------------------------------------- |
| **Accept** (default)  | `Enter` / `y` | **Auto-Accept** | Executes the plan with no per-action approval prompts.                            |
| **Approve Each Step** | `s`           | **Standard**    | Executes the plan but prompts for approval on each Write/Edit/Delete/Bash action. |
| **Reject**            | `n`           | -               | Ends the session; reply with feedback and the agent re-iterates the plan.         |

> **The default Accept enables [Auto-Accept mode](#auto-accept-mode)** - unrestricted execution with no per-action approval. Pick **Approve Each Step** to accept the plan but keep the [Standard-mode](#standard-mode) approval gate on every action. The plan file stays on disk whichever you choose; rejecting a plan does not delete it.

### Auto-Accept Mode

Zero approval prompts for maximum speed. Use with caution in version-controlled environments.

```bash
infer chat
# Press Shift+Tab twice to switch to Auto-Accept Mode
> "Run the test suite, fix all failing tests, and commit the changes"
# Agent executes everything immediately
```

**Important for Auto-Accept:** Ensure clean git working tree and backups.

Because the per-action approval gate is off in this mode, the agent runs under a dedicated **destructive-action safety prompt** (`prompts.agent.system_prompt_auto`). It is told to stop and confirm before irreversible operations - deletes, `git push --force`, `git reset --hard`, dropping databases, `rm -rf`, publishing or releasing - to prefer the reversible path when no user is reachable, and never to print or publish a secret value. It falls back to the standard `system_prompt` when left blank.

### Headless Agent Stream Output

`infer agent <task>` runs the agent non-interactively and writes a **newline-delimited JSON (JSONL) stream** to stdout. Each line is one JSON object with a `type` discriminator, intended for programmatic consumers such as the [`infer-action` GitHub Action](/github-action/). The stream is additive: new `type` values may be introduced over time and consumers should ignore any `type` they do not recognize.

```bash
infer agent "Refactor the authentication module"
```

> **Secure by default.** A headless run executes in **standard** mode, so off-list or mutating actions are not auto-run - they are blocked (when no approver is reachable) or sent for IPC approval (under a channel manager). See [Headless secure-by-default](#headless-secure-by-default) to opt into more autonomy.

#### Session stats summary line

When a session completes, the CLI emits a single `session_stats` line summarizing token usage and computed dollar cost for the run. This lets consumers report real run cost without re-implementing the per-model pricing table.

```json
{
  "type": "session_stats",
  "message": "Session complete",
  "timestamp": "2026-05-29T17:48:55+02:00",
  "model": "deepseek/deepseek-v4-flash",
  "prompt_tokens": 21000,
  "completion_tokens": 1260,
  "total_tokens": 22260,
  "requests": 7,
  "cost": { "input": 0.0021, "output": 0.0008, "total": 0.0029, "currency": "USD" }
}
```

**Fields:**

| Field               | Type   | Description                                                         |
| ------------------- | ------ | ------------------------------------------------------------------- |
| `type`              | string | Always `session_stats` for this line.                               |
| `message`           | string | Human-readable status, currently `Session complete`.                |
| `timestamp`         | string | RFC 3339 timestamp at which the line was emitted.                   |
| `model`             | string | Model used for the run. A single model is attributed per run.       |
| `prompt_tokens`     | number | Sum of input tokens across all requests in the run.                 |
| `completion_tokens` | number | Sum of output tokens across all requests in the run.                |
| `total_tokens`      | number | `prompt_tokens + completion_tokens`.                                |
| `requests`          | number | Number of LLM requests (turns that reported `usage`) in the run.    |
| `cost`              | object | Computed dollar cost for the run - see [Cost object](#cost-object). |

##### Cost object

| Field      | Type   | Description                                                                |
| ---------- | ------ | -------------------------------------------------------------------------- |
| `input`    | number | Cost attributed to `prompt_tokens` using the configured pricing table.     |
| `output`   | number | Cost attributed to `completion_tokens` using the configured pricing table. |
| `total`    | number | `input + output`.                                                          |
| `currency` | string | ISO 4217 currency code from `pricing.currency`. Defaults to `USD`.         |

When `pricing.enabled: false` (or pricing data is unavailable for the model), `input`, `output`, and `total` are all `0` while `currency` is still populated. The `cost` object is always present, giving consumers a stable schema.

**Behavior notes:**

- The line is **additive** - it does not replace any existing stream output.
- It is **emitted once** per run, at session completion (including on early errors).
- It is **always emitted in `agent` mode** - there is no flag to enable or disable it.
- Cost is attributed to a **single model per run**.
- Consumers should **ignore unknown `type` values** to remain forward-compatible.

#### Writing the result to a file (`--result-file`)

`infer agent` accepts a `--result-file <path>` flag that **atomically** writes the final assistant message and the run outcome as JSON to `<path>` on exit. The [Agent tool](#local-subagents-agent-tool) uses it to harvest the result of a detached (tmux pane) subagent, but it is useful on its own whenever a script needs the final answer as a file rather than by parsing the stdout stream.

```bash
infer agent "Summarize the open PRs" --result-file /tmp/result.json
```

## Computer Use

GUI automation and visual understanding capabilities for interacting with applications and desktop environments.

### Display Server Support

Automatic display server detection - no configuration needed:

| Platform  | Supported Servers              | Notes                                  |
| --------- | ------------------------------ | -------------------------------------- |
| **macOS** | Quartz (native), X11 (XQuartz) | Quartz automatically detected and used |
| **Linux** | X11, Wayland                   | Auto-detection handles both protocols  |

Display server type is automatically detected at runtime. No manual configuration required.

### Computer Use Tools

| Tool                    | Description             | Key Capabilities                                                                      |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| **GetLatestScreenshot** | Capture screen regions  | Streaming mode, region selection, circular buffer, JPEG format (configurable quality) |
| **MouseMove**           | Control cursor position | Absolute coordinates, relative movement                                               |
| **MouseClick**          | Perform click actions   | Left/right/middle clicks, double-click support                                        |
| **MouseScroll**         | Scroll content          | Vertical and horizontal scrolling                                                     |
| **KeyboardType**        | Type text and keys      | Plain text, key combinations (Ctrl+C, Cmd+V), configurable typing delay               |
| **GetFocusedApp**       | Identify active app     | Returns focused application name                                                      |
| **ActivateApp**         | Switch applications     | Focus and activate specific apps                                                      |

### Screenshot Tool Features

**Streaming Mode:**

- Maintains circular buffer of recent screenshots
- Configurable buffer size (default: 5)
- Configurable capture interval (default: 3 seconds)
- Efficient memory management
- Fast access to recent captures

**Image Optimization:**

- Automatic resolution scaling (max: 1920x1080, target: 1024x768)
- JPEG compression with configurable quality (default: 85%)
- Reduces bandwidth and storage requirements
- Optional capture overlay for debugging

**Region Selection:**

- Full screen capture
- Custom region coordinates (x, y, width, height)
- Multiple monitor support

### Floating Window

Real-time visualization of agent activity:

```yaml
computer_use:
  floating_window:
    enabled: true
    respawn_on_close: true # Auto-restart if closed
    position: top-right # top-left, top-right, bottom-left, bottom-right
    always_on_top: true # Keep window above other apps
```

**Features:**

- Always-on-top overlay
- Shows agent actions in real-time
- Configurable position
- Auto-respawn option if accidentally closed
- Non-intrusive design
- Available on all platforms with GUI support

### Computer Use Configuration

```yaml
computer_use:
  enabled: true
  floating_window:
    enabled: true
    respawn_on_close: true
    position: top-right
    always_on_top: true
  screenshot:
    enabled: true
    max_width: 1920
    max_height: 1080
    target_width: 1024
    target_height: 768
    format: jpeg
    quality: 85
    streaming_enabled: true
    capture_interval: 3
    buffer_size: 5
    temp_dir: ''
    log_captures: false
    show_overlay: true
  rate_limit:
    enabled: true
    max_actions_per_minute: 60
    window_seconds: 60
  tools:
    mouse_move:
      enabled: true
    mouse_click:
      enabled: true
    mouse_scroll:
      enabled: true
    keyboard_type:
      enabled: true
      max_text_length: 1000
      typing_delay_ms: 100
    get_focused_app:
      enabled: true
    activate_app:
      enabled: true
```

### Safety and Rate Limiting

**Rate Limiting:**

- Default: 60 actions per minute
- Prevents runaway automation
- Configurable threshold

**Safety Controls:**

- Approval prompts in Standard Mode
- Auto-approve in YOLO mode
- Activity logging for audit trails
- Command execution monitoring

**Best Practices:**

- Use Standard Mode for initial exploration
- Enable logging for debugging
- Set appropriate rate limits
- Monitor activity logs
- Test in safe environments first

### Example Use Cases

```bash
infer chat
> "Take a screenshot and analyze the error dialog"
> "Click the Submit button in the center of the screen"
> "Type 'Hello World' and press Enter"
> "Switch to the Terminal app and run ls command"
> "Find the Save button and click it"
```

## Tools & Capabilities

When tools are enabled, LLMs have access to a comprehensive suite across multiple categories.

### Tool Categories

| Category              | Tools                                                                                             | Description                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **File System**       | Read, Write, Edit, MultiEdit, Delete, Tree, Grep                                                  | File operations and search with safety controls                                                         |
| **Command Execution** | Bash, BashOutput, KillShell, ListShells                                                           | Allow-listed shell execution (including `gh` for GitHub) and background shell control                   |
| **Web**               | WebSearch, WebFetch                                                                               | Internet research and content fetching                                                                  |
| **Workflow**          | TodoWrite, Schedule, RequestPlanApproval, AskUserQuestion, Memory                                 | Task tracking, cron jobs, plan-mode approval, clarifying questions, and persistent cross-session memory |
| **A2A Integration**   | A2A_QueryAgent, A2A_SubmitTask, A2A_QueryTask                                                     | Delegate to external specialized agents - see [A2A](/a2a/)                                              |
| **Local Subagents**   | Agent                                                                                             | Fan out short-lived local subagents in parallel - see [Local Subagents](#local-subagents-agent-tool)    |
| **Computer Use**      | GetLatestScreenshot, MouseMove, MouseClick, MouseScroll, KeyboardType, GetFocusedApp, ActivateApp | GUI automation - see the Computer Use section above                                                     |
| **MCP**               | `MCP_<server>_<tool>`                                                                             | Dynamically registered tools from MCP servers - see [MCP](/mcp/)                                        |

### File System Tools

#### Read

Read a file from the local filesystem with an optional line range. Handles text files and PDFs.

- **Parameters**: `file_path` (required, absolute or relative), `limit` (default 2000 lines), `offset` (default 1)
- **Approval**: not required (read-only)
- **Notes**: lines longer than 2000 characters are truncated; output is returned in `cat -n` format

#### Write

Write content to a file on disk. Overwrites the existing file at the given path.

- **Parameters**: `file_path` (required, absolute), `content` (required)
- **Approval**: required by default
- **Notes**: if the file exists, the Read tool must have been used first; respects configured path exclusions (`.git/`, `*.env`, `.infer/`)

#### Edit

Perform an exact string replacement in a single file.

- **Parameters**: `file_path` (required), `old_string` (required - must match exactly and be unique unless `replace_all` is set), `new_string` (required - must differ from `old_string`), `replace_all` (default `false`)
- **Approval**: required by default
- **Notes**: the file must have been Read at least once in the conversation; indentation must be preserved exactly

#### MultiEdit

Apply a sequence of edits to a single file atomically - either all succeed or none are applied.

- **Parameters**: `file_path` (required), `edits` (required array; each item has `old_string`, `new_string`, optional `replace_all`)
- **Approval**: required by default
- **Notes**: edits are applied in order, each operating on the result of the previous one - plan them so earlier edits don't invalidate later matches

#### Delete

Delete a file or directory. Wildcards are supported when enabled.

- **Parameters**: `path` (required - supports patterns like `*.txt` or `temp/*`), `recursive` (default `false`), `force` (default `false`), `format` (`text` or `json`)
- **Approval**: required by default
- **Notes**: restricted to the current working directory for safety

#### Tree

Display a directory tree, similar to the Unix `tree` command.

- **Parameters**: `path` (default `.`), `max_depth` (1-10, default 3), `max_files` (1-1000, default 100), `respect_gitignore` (default `true`), `show_hidden` (default `false`), `format` (`text` or `json`)
- **Approval**: not required
- **Notes**: uses the system `tree` binary when available, otherwise falls back to a built-in implementation

#### Grep

Powerful regex search across files. Uses `ripgrep` when available, otherwise a built-in Go implementation.

- **Parameters**: `pattern` (required regex), `path` (default cwd), `glob` (e.g. `*.ts`, `**/*.tsx`), `type` (e.g. `go`, `py`, `rust`), `output_mode` (`content` | `files_with_matches` | `count`, default `files_with_matches`), `-i`, `-n`, `-A`, `-B`, `-C`, `multiline`, `head_limit`
- **Approval**: not required
- **Backend**: configurable via `tools.grep.backend` (`auto` | `ripgrep` | `go`)
- **Notes**: respects `.gitignore`; auto-excludes `.git`, `node_modules`, `.infer`, `vendor`, `dist`, `build`, `target`

### Command Execution

#### Bash

Execute a bash command that matches the active mode's **allowed-list**. Matching is **default-deny**: a command auto-runs only when it matches the allowed-list for the current [agent mode](#agent-modes). Anything unmatched falls through to an approval prompt in chat, or is rejected with an actionable hint in headless [`infer agent`](#headless-agent-stream-output). There is no separate deny list.

- **Parameters**: `command` (required), `format` (`text` or `json`)
- **Approval**: configurable via `tools.bash.require_approval`

##### Per-mode allowed-list

The allowed-list is configured **per [agent mode](#agent-modes)** under `tools.bash.mode.<mode>.allow`. The effective list for a mode is `mode.all.allow` (the every-mode baseline) **unioned** with that mode's own entries:

```yaml
tools:
  bash:
    enabled: true
    require_approval: false
    mode:
      all: # baseline applied in every mode
        allow:
          - ls( .*)?
          - pwd( .*)?
          - git status( .*)?
          - git diff( .*)?
      plan: # read-only analysis - usually adds nothing
        allow: []
      standard: # default interactive mode
        allow:
          - npm (install|test|run).*
      auto: # Auto-Accept / YOLO mode
        allow:
          - .* # unrestricted sentinel
```

- **Default-deny.** Out of the box only `mode.auto` ships the `.*` sentinel; `mode.plan` and `mode.standard` add nothing on top of `mode.all`, so they reduce to the read-only baseline. GitHub _writes_ (`gh issue/pr create|edit|comment`), `git push`, and `git commit` are **not** in the defaults - they fall through to approval until you add them.
- **Full-command matching.** Each entry matches the **whole** command, so a bare token like `gh` allows only `gh` - never `gh issue list`. Opt into arguments explicitly with a pattern (`gh issue.*`, `npm (install|test|run).*`); the default entries use a `( .*)?` suffix to allow trailing arguments.
- **The `.*` sentinel** means _unrestricted_: any single command runs and the clean-command guard below is skipped. It is the default for `mode.auto` (chat's [Auto-Accept mode](#auto-accept-mode), toggled with Shift+Tab) and is an explicit opt-in - **never** a headless default.

##### Clean-command guard

For every mode except the `.*` sentinel, each command passes a **clean-command guard** before the allowed-list is consulted. The guard rejects, regardless of the list:

- **Command substitution** - `$(...)`, backticks, `<(...)`, `>(...)`.
- **Multi-command chains and pipelines** - a top-level `|`, `&&`, `||`, `;`, `&`, or newline. Operators inside quotes don't count, so `jq '.a | .b'` stays a single command. (This closes the old `echo x | xargs rm` prefix hole.)
- **File-write redirections** - `>` and `>>`. Benign stream redirects (`2>&1`, `>/dev/null`) are stripped first and remain allowed.
- **Dangerous `find` actions** - `-exec`, `-delete`, and the like. A bare `find` for read-only discovery is fine.
- **Environment-variable leaks** - a printing or publishing command (`echo`, `printf`, `gh issue|pr create|comment|edit`) may not expand `$VAR`. So `echo $AWS_SECRET_ACCESS_KEY` is blocked, while `ls $DIR` stays allowed. A single-quoted or escaped `$` is treated literally.

A rejected command returns an actionable hint naming what tripped the guard; the model is told to stop and ask, or use an allowed alternative, rather than retry the same call.

##### Append-only override (CI)

The `mode.all` baseline takes an **append-only override** so CI can add a few safe commands without rewriting config or shipping `.*`:

```bash
# Comma- or newline-separated; the env var wins over the flag
export INFER_TOOLS_BASH_ALLOW_APPEND="git commit,git push"

# Flag form
infer agent "Release the changelog" --tools-bash-allow-append "git commit,git push"
```

The extra commands merge onto `mode.all.allow`, so they auto-run in every mode. There is no replace override - the old `tools.bash.whitelist.commands` key, the `INFER_TOOLS_BASH_WHITELIST_COMMANDS[_APPEND]` env vars, and the `--tools-bash-whitelist-commands*` flags were removed in [inference-gateway/cli#618](https://github.com/inference-gateway/cli/pull/618).

#### BashOutput, KillShell, ListShells

Background-shell management. These tools are only registered when `tools.bash.background_shells.enabled: true`.

- **BashOutput** - `bash_id` (required), `filter` (optional regex). Returns only new output since the last read.
- **KillShell** - `shell_id` (required). Sends SIGTERM, then SIGKILL after 5 seconds if the shell doesn't exit.
- **ListShells** - no parameters. Lists all running and recently completed background shells with their IDs, state, and elapsed time.

### Web Tools

#### WebSearch

Search the web via DuckDuckGo or Google.

- **Parameters**: `query` (required), `engine` (`duckduckgo` | `google`, defaults to the configured engine), `limit` (1-50, defaults to configured `max_results`), `format` (`text` or `json`)

```yaml
tools:
  web_search:
    enabled: true
    default_engine: duckduckgo
    max_results: 10
    engines: [duckduckgo, google]
    timeout: 10
```

#### WebFetch

Fetch content from an allowed URL. Optionally save the response to disk.

- **Parameters**: `url` (required), `format` (`text` or `json`), `download` (default `false` - when `true`, saves under `~/.infer/tmp`)
- **Notes**: only allowed domains can be fetched; responses are cached (default 15-minute TTL)

```yaml
tools:
  web_fetch:
    enabled: true
    allowed_domains:
      - golang.org
      - github.com
    safety:
      max_size: 8192
      timeout: 30
    cache:
      enabled: true
      ttl: 3600
```

### GitHub Operations

There is **no built-in GitHub tool**. The agent performs all GitHub work - issues, pull requests, releases, repository metadata, and the raw API - through the [`gh` CLI](https://cli.github.com/) run via the [Bash](#bash) tool.

```bash
# Issues and pull requests
gh issue view 123
gh issue list --state open
gh pr create --title "fix: handle nil channel" --body "Closes #123"
gh pr diff 456

# Raw API (read-only / GET)
gh api repos/inference-gateway/cli/issues
gh api user --jq .login
```

**Requirements:** `gh` must be installed and authenticated. It uses the standard `gh` credential chain - run `gh auth login`, or set `GITHUB_TOKEN` (or `GH_TOKEN`). No separate token configuration exists anymore.

#### Default gh allowed-list

GitHub operations run through Bash, so they obey the [Bash allowed-list](#command-allow-listing). The default `mode.all` baseline auto-approves common **read-only** `gh` commands only:

| Auto-approved by default | Examples                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------- |
| Read-only reads          | `gh issue list`, `gh pr view 5`, `gh pr diff`, `gh repo view`, `gh release view v1` |
| Auth status              | `gh auth status`                                                                    |
| Search                   | `gh search issues kind:bug`, `gh search code "func main"`                           |
| Read-only project boards | `gh project list`, `gh project view 3`, `gh project item-list 3`                    |

**GitHub writes and destructive operations are deliberately left off the defaults.** They are **not** auto-approved - they fall through to the standard approval prompt (in chat) or are blocked (in headless `infer agent`) until you add them to an allowed-list:

- **Issue / PR writes** - `gh issue create|edit|comment`, `gh pr create`.
- **Project writes** - `gh project item-add|item-edit`.
- **Destructive** - `gh pr merge`, `gh pr close`, `gh issue delete`, `gh repo delete`, `gh release create`, `gh run cancel`, `gh auth login`.
- **Raw `gh api`** - any call. The previous GET-wildcard auto-approval was dropped; a raw-API need is now opt-in per repo.

> **Hardened in [inference-gateway/cli#618](https://github.com/inference-gateway/cli/pull/618).** Earlier defaults auto-approved `gh issue/pr` writes and read-only `gh api`. They now require approval - add the specific commands you trust to an allowed-list, or use the [append override](#append-only-override-ci).

The shipped `mode.all` baseline:

```yaml
tools:
  bash:
    mode:
      all:
        allow:
          - gh (issue|pr|repo|release|run|workflow) (list|view|status|diff|checks)( .*)?
          - gh auth status( .*)?
          - gh search (issues|code|prs|repos|commits)( .*)?
          - gh project (list|view|item-list|field-list)( .*)?
```

#### Migration: the built-in GitHub tool was removed

> **Breaking change.** The built-in `Github` tool was removed in favor of the `gh` CLI ([inference-gateway/cli#572](https://github.com/inference-gateway/cli/pull/572)). The `tools.github` config block and the `infer config tools github` commands no longer exist. Existing configs that still contain a `tools.github` section are **ignored** - unknown keys are dropped, so they do not error and need no manual cleanup. Replace any scripted use of the old tool with the matching `gh` command (for example `gh issue view`, `gh pr create`, `gh api`).

### Workflow Tools

#### TodoWrite

Create and update a structured task list for the current session. Use for complex multi-step work to track progress and surface intent to the user.

- **Parameters**: `todos` (required array; each item has `content`, `status` ∈ `pending` | `in_progress` | `completed`, and optional `id`)
- **Approval**: not required
- **Best practice**: keep at most one task in `in_progress` at a time; mark items `completed` immediately on finishing

#### Schedule

Create, list, get, update, or delete cron jobs that fire through the same messaging channel that started the session (e.g. Telegram). Jobs are persisted as YAML under `~/.infer/schedules/` and executed by the `infer channels-manager` daemon (which hot-reloads via fsnotify).

- **Parameters**: `operation` (required: `create` | `list` | `get` | `update` | `delete`), `job_id` (required for get/update/delete), `cron_expression` (5-field crontab or `@every <duration>`), `prompt`, `run_once` (default `false` - when `true`, the job is deleted after firing once), `name`, `description`, `model` (optional model override)
- **Approval**: required by default
- **Notes**: each fire creates a brand-new agent session - no context is carried between runs; only usable from a channel-driven session

```text
"0 8 * * *"      every day at 08:00
"*/15 * * * *"   every 15 minutes
"0 9 * * 1-5"    weekdays at 09:00
"@every 1h"      every hour
```

#### AskUserQuestion

Pause the plan and ask the user 1-4 multiple-choice clarifying questions as an interactive, keyboard-driven form. The agent reaches for this in Plan Mode to resolve ambiguity **before** it calls [`RequestPlanApproval`](#requestplanapproval) - your answers feed straight back into the plan it then proposes. It is read-only with **no approval gate**.

- **Parameters**: `questions` (required array, **1-4** items). Each question has:
  - `header` (required) - short chip label shown above the question, **<= 12 characters**
  - `question` (required) - the full question text
  - `options` (required array, **2-4** items) - each option is `{ label, description }`
  - `multiSelect` (optional, default `false`) - allow more than one answer to be selected
- **Approval**: not required (read-only)
- **Availability**: **Plan Mode only** - the tool is excluded from Standard and Auto-Accept modes.

The form always appends an **"Other"** free-text choice to every question, so the user can answer outside the offered options. Suffix a label with **`(Recommended)`** to preselect that option when the question opens.

```json
{
  "questions": [
    {
      "header": "Datastore",
      "question": "Which datastore should the new service use?",
      "multiSelect": false,
      "options": [
        {
          "label": "PostgreSQL (Recommended)",
          "description": "Relational, strong consistency, already used by the gateway."
        },
        { "label": "MongoDB", "description": "Document store with a flexible schema." },
        { "label": "Redis", "description": "In-memory, best for ephemeral or cache data." }
      ]
    }
  ]
}
```

**Keyboard controls:**

| Key              | Action                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `Up` / `Down`    | Move between options. For single-select questions the radio selection follows the cursor. |
| `Space`          | Toggle the highlighted option (multi-select questions).                                   |
| `Enter`          | Confirm the current question and advance - or submit on the last question.                |
| `Esc` / `Ctrl+C` | Cancel the whole prompt.                                                                  |

**Headless graceful-degrade.** When no interactive user is reachable to answer - a CI run, a heartbeat, or a scheduled job - the tool does **not** block. It returns a "proceed with assumptions" result so the agent keeps moving and picks a reasonable default instead of hanging.

#### RequestPlanApproval

Submit a completed plan for user approval. Available only in Plan Mode.

- **Parameters**: `plan` (required - the complete, detailed plan text)
- **Behavior**: pauses execution and offers three choices (see [Approving a plan](#approving-a-plan)) - **Accept** (`Enter`/`y`) switches to [Auto-Accept mode](#auto-accept-mode) and executes with no per-action approval, **Approve Each Step** (`s`) executes in [Standard mode](#standard-mode) with approval on each action, and **Reject** (`n`) ends the session so you can reply with feedback.

### Local Subagents (Agent tool)

The **Agent** tool lets the main agent - in chat or headless [`infer agent`](#headless-agent-stream-output) - spawn one or more **local subagents** that run work in parallel and fold their results back into the main conversation. A subagent is just an `infer agent` subprocess with its own isolated session, so it is cheap, isolated, and session-persisted. The tool is **enabled by default** and gated by the [`tools.agent.*` config block](#agent-tool-configuration).

This is the lightweight, **local** complement to the [A2A tools](/a2a/) (`A2A_SubmitTask` / `A2A_QueryTask` / `A2A_QueryAgent`), which target external A2A servers:

| Reach for...                          | When                                                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Agent** (local subagents)           | Short-lived helpers for the task at hand - parallel exploration, fan-out edits, scoped research - with no server to run. Each is a local `infer agent` subprocess. |
| **A2A tools** (`A2A_SubmitTask`, ...) | Delegating to **external**, long-running, specialized A2A servers (calendar, docs, ...) discovered over the network. See [A2A](/a2a/).                             |

#### Tool parameters

The model calls the tool with either a batch of `tasks` or a single `description`:

- `tasks` - an array of subagent tasks run **in parallel**, each with:
  - `description` (required) - the task for that subagent
  - `label` (optional) - short label shown in progress output / tmux panes
  - `model` (optional) - per-subagent model override
  - `system_prompt` (optional) - gives that subagent a specialized role/persona
- `description` (optional) - shorthand for a **single-task** call (an alternative to `tasks`)
- `system_prompt` (optional) - system prompt for the single-`description` form

Each subagent runs in its own isolated session id of the form `subagent-<parentSession>-<uuid>`. Parallel fan-out is capped by `max_parallel` (default `4`) concurrent subagents per call.

#### Result modes: async and wait-all

- **Wait-all (`wait: true`)** - the **shipped default**. The call blocks until every spawned subagent reaches a terminal state, then returns the aggregated results in one tool result.
- **Async (`wait: false`)** - the call returns immediately with the subagent ids; when each subagent finishes, its final result is injected back into the main conversation (mirroring `A2A_SubmitTask` notify behavior). In chat, running/completed status is surfaced in the sticky progress area.

#### Execution surfaces: headless and interactive (tmux)

The `mode` controls where subagents run. Either way the result aggregates back into the main context exactly the same - interactive is "headless plus a tmux pane attached to the live process":

- `headless` - subagents run in the background; results aggregate back into the main context.
- `interactive` (the shipped default) - each subagent runs in a live **tmux** pane/window you can watch while it works.

tmux is an **optional runtime dependency**, required only for interactive mode (headless needs nothing extra). Interactive mode must be run from **inside tmux** (`$TMUX` set). When you are not inside tmux (or tmux is not installed), the `interactive.fallback` setting decides what happens:

- `fallback: headless` (default) - warn and run headless.
- `fallback: error` - fail the call instead.

#### Agent tool configuration

The new `tools.agent.*` block, with its shipped defaults (regenerated by `infer init`):

```yaml
tools:
  agent:
    enabled: true
    require_approval: true # spawning work that can edit files is a mutating action
    mode: interactive # headless | interactive (default when a call omits it)
    wait: true # block and return aggregated results by default
    max_parallel: 4 # cap on concurrent subagents per call
    max_depth: 1 # recursion guard; a subagent is itself an `infer agent`
    model: '' # default subagent model (inherits parent if blank)
    interactive:
      multiplexer: tmux # tmux only
      layout: vertical # vertical | horizontal | window
      fallback: headless # headless | error (when not inside tmux)
```

Every key has an `INFER_TOOLS_AGENT_*` environment-variable override, consistent with the rest of the config:

| Setting                   | Environment variable                        |
| ------------------------- | ------------------------------------------- |
| `enabled`                 | `INFER_TOOLS_AGENT_ENABLED`                 |
| `require_approval`        | `INFER_TOOLS_AGENT_REQUIRE_APPROVAL`        |
| `mode`                    | `INFER_TOOLS_AGENT_MODE`                    |
| `wait`                    | `INFER_TOOLS_AGENT_WAIT`                    |
| `max_parallel`            | `INFER_TOOLS_AGENT_MAX_PARALLEL`            |
| `max_depth`               | `INFER_TOOLS_AGENT_MAX_DEPTH`               |
| `model`                   | `INFER_TOOLS_AGENT_MODEL`                   |
| `interactive.multiplexer` | `INFER_TOOLS_AGENT_INTERACTIVE_MULTIPLEXER` |
| `interactive.layout`      | `INFER_TOOLS_AGENT_INTERACTIVE_LAYOUT`      |
| `interactive.fallback`    | `INFER_TOOLS_AGENT_INTERACTIVE_FALLBACK`    |

```bash
# Toggle the tool, or switch the default execution surface to headless
infer config set tools.agent.enabled true
infer config set tools.agent.mode headless
```

#### Approval and security

- Subagents run in standard **bash mode** (the restricted [allowed-list](#command-allow-listing)), exactly like every other headless run - an off-list or mutating action is blocked in CI/heartbeat (no approver reachable) or sent for IPC approval under a channel (for example Telegram). See [Headless secure-by-default](#headless-secure-by-default).
- The Agent tool is in the approval policy and **requires approval by default** (`require_approval: true`), with a per-tool override - consistent with `A2A_SubmitTask`. Spawning work that can edit files is treated as a mutating action.
- A **depth guard** (`max_depth`, default `1`) prevents subagent fork-bombs: a subagent cannot itself spawn further subagents at the default cap.

> **v1 scope.** Subagents do not nest (depth capped at 1), a subagent's tool-approval prompt is not routed back to the main chat TUI, only tmux is supported (no screen/zellij), and there is no `/agent` chat shortcut yet.
>
> Shipped in [inference-gateway/cli#658](https://github.com/inference-gateway/cli/pull/658).

### Security Features

- **Command allow-listing**: Default-deny, per-mode allowed-list for the Bash tool
- **Approval Prompts**: Safety confirmations for Write/Edit/Delete/Bash
- **Path Protection**: Sensitive directories automatically excluded (`.git/`, `*.env`, `.infer/`)
- **Sandbox Controls**: Restrict tool operations to allowed directories
- **Domain allow-listing**: Control web fetch access
- **Diff Preview**: Colored, syntax-aware diff before file modifications

### Tool Configuration

Tool settings are read and written with the generic [config commands](#configuration-commands) - there are no per-setting subcommands.

```bash
# Enable/disable all tool execution for LLMs
infer config set tools.enabled true
infer config set tools.enabled false

# Enable/disable an individual tool (for example bash)
infer config set tools.bash.enabled true

# Require approval before any tool runs
infer config set tools.safety.require_approval true

# Require approval for a specific tool only (for example bash)
infer config set tools.bash.require_approval true

# Sandbox directories - comma-separated; the whole list is replaced
infer config set tools.sandbox.directories ".,/protected/path"

# Inspect the resulting tools config
infer config get tools
```

### Running Tools Directly

Run any enabled tool outside a chat session, or check whether a bash command would pass the allowed-list, with the top-level `infer tools` command.

```bash
# Execute a tool by name with JSON arguments (tool names are case-insensitive)
infer tools execute Read '{"file_path":"README.md"}'
infer tools execute grep '{"pattern":"func main","path":"."}'

# Validate whether a bash command is allowed (without running it)
infer tools validate "git status"
```

`infer tools execute <tool> [json-args]` resolves tool names case-insensitively in the CLI - the agent itself still uses the exact PascalCase names. `infer tools validate <command>` reports whether a bash command would be permitted by the configured allowed-list, without executing it.

> `infer tools execute` and `infer tools validate` moved from `config tools exec`/`config tools validate` to the top-level `infer tools` command in [inference-gateway/cli#601](https://github.com/inference-gateway/cli/pull/601).

## Configuration

Two-layer configuration system with precedence from highest to lowest:

### Configuration Precedence

| Priority    | Source                | Example                                  |
| ----------- | --------------------- | ---------------------------------------- |
| 1 (Highest) | Environment Variables | `INFER_GATEWAY_URL`, `INFER_AGENT_MODEL` |
| 2           | Command Line Flags    | `--model`, `--debug`                     |
| 3           | Project Config        | `.infer/config.yaml`                     |
| 4           | User Config           | `~/.infer/config.yaml`                   |
| 5 (Lowest)  | Built-in Defaults     | Internal defaults                        |

### Configuration Files

`infer init` scaffolds the project configuration directory (`.infer/`) and `~/.infer/` holds user-global defaults. Configuration is split across purpose-specific YAML files rather than one giant file:

| File               | Scope        | Purpose                                                                                     | Where it is documented                                      |
| ------------------ | ------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `config.yaml`      | Project/user | Main config - agent, tools, storage, pricing, and everything `config get`/`set` touches.    | [Configuration](#configuration-commands)                    |
| `prompts.yaml`     | Project/user | System prompts (`prompts.agent.system_prompt`, plan/auto variants) - edited, not `set`.     | [Configuration Commands](#configuration-commands)           |
| `mcp.yaml`         | Project      | MCP server definitions and connection settings.                                             | [MCP Integration](#mcp-integration)                         |
| `keybindings.yaml` | Project/user | Keybindings for the TUI and diff viewer (category `diff_viewer`).                           | [Diff viewer and git staging](#diff-viewer-and-git-staging) |
| `hooks.yaml`       | Project/user | User-defined shell commands run at agent-loop hook points (feature-flagged off by default). | [Command Hooks](/cli-hooks/)                                |
| `reminders.yaml`   | Project/user | System reminders injected into the conversation on a schedule.                              | [Key Configuration Areas](#key-configuration-areas)         |
| `memory.yaml`      | Project/user | Persistent, cross-session agent memory - fact-files plus the `MEMORY.md` index.             | [Persistent Memory](#persistent-memory)                     |
| `shortcuts/*.yaml` | Project      | Custom slash shortcuts - simple commands, subcommands, and AI-powered snippets.             | [Custom Shortcuts](#custom-shortcuts)                       |
| `skills/`          | Project/user | Agent Skills folders (`name/SKILL.md`) discovered and injected on demand.                   | [Agent Skills](#agent-skills)                               |
| `schedules/`       | User         | Persisted cron jobs created by the Schedule tool, run by the channels-manager daemon.       | [Schedule](#schedule)                                       |

### Key Configuration Areas

**Gateway Settings:**

- Gateway URL and API key
- Timeout and retry configuration
- OCI image for auto-running gateway
- Model filtering (include/exclude lists)

**Agent Configuration:**

- Default model for operations
- System prompts (main and plan mode)
- System reminders interval
- Max turns and tokens
- Parallel tool execution (default: 5 concurrent)

**Tool Settings:**

- Enable/disable individual tools
- Approval requirements per tool (whether) and delivery via `tools.safety.approval_behaviour` (how)
- Per-mode bash allowed-lists (`tools.bash.mode.<mode>.allow`)
- Sandbox directories
- Protected paths

**Storage Backends:**

- SQLite (default) - local file storage
- PostgreSQL - shared database for teams
- Redis - high-performance caching
- JSONL - append-only files for portable, inspectable history
- Cloudflare D1 - external SQLite-compatible store over HTTP (for ephemeral CI runners)
- In-memory - temporary sessions

**Conversation Features:**

- Automatic history with search
- AI-generated titles
- Token optimization and compaction
- Export/import capabilities

### Essential Environment Variables

```bash
export INFER_GATEWAY_URL="http://localhost:8080"
export INFER_GATEWAY_API_KEY="your-api-key"
export INFER_AGENT_MODEL="deepseek/deepseek-v4-flash"
export INFER_LOGGING_DEBUG="true"
export GITHUB_TOKEN="your-github-token"  # used by the gh CLI credential chain for GitHub operations

# Append a few commands onto the bash allowed-list baseline (comma- or newline-separated)
export INFER_TOOLS_BASH_ALLOW_APPEND="git commit,git push"

# How a needed approval is delivered: prompt | ipc | block
export INFER_TOOLS_SAFETY_APPROVAL_BEHAVIOUR="prompt"
```

### Configuration Commands

Configuration uses a generic key/value interface. `infer config get` reads the effective value of any key; `infer config set` writes one to the userspace baseline (`~/.infer/config.yaml`) by default, or to the project config (`./.infer/config.yaml`) when you pass `--project`. Keys are dotted paths into the config (for example `agent.model`, `tools.bash.enabled`).

```bash
# Initialize configuration
infer config init

# Print the whole effective config (defaults + ~/.infer + .infer + INFER_* env)
infer config get

# Print a single key
infer config get agent.model

# Print as JSON instead of YAML
infer config get --format json

# Set a value - parsed to the field's type (bool, integer, number, or string)
infer config set agent.model deepseek/deepseek-v4-flash
infer config set agent.max_turns 50
infer config set agent.verbose_tools true

# List-valued keys take a comma-separated value (the whole list is replaced)
infer config set tools.sandbox.directories ".,/work/project"
infer config set tools.web_fetch.allowed_domains "golang.org,github.com"

# config set writes the userspace baseline (~/.infer/config.yaml) by default
infer config set agent.model deepseek/deepseek-v4-flash

# Target the project config (./.infer/config.yaml) instead - it overrides the baseline key-by-key
infer config set agent.model deepseek/deepseek-v4-flash --project

# Recreate config.yaml from defaults
infer config init --overwrite
```

> System prompts are **not** set via `config set` - they live in `prompts.yaml` (for example `prompts.agent.system_prompt`) and are edited there.

#### Command Mapping

The per-setting subcommands were removed in [inference-gateway/cli#601](https://github.com/inference-gateway/cli/pull/601) in favor of `config get`/`config set` and the top-level `infer tools` command:

| Old command                            | New command                                      |
| -------------------------------------- | ------------------------------------------------ |
| `config agent set-model X`             | `config set agent.model X`                       |
| `config agent set-max-turns N`         | `config set agent.max_turns N`                   |
| `config agent verbose-tools enable`    | `config set agent.verbose_tools true`            |
| `config agent skills enable`           | `config set agent.skills.enabled true`           |
| `config tools enable`                  | `config set tools.enabled true`                  |
| `config tools bash enable`             | `config set tools.bash.enabled true`             |
| `config tools safety enable`           | `config set tools.safety.require_approval true`  |
| `config tools safety set bash enabled` | `config set tools.bash.require_approval true`    |
| `config tools sandbox add DIR`         | `config set tools.sandbox.directories ".,DIR"`   |
| `config tools grep set-backend rg`     | `config set tools.grep.backend ripgrep`          |
| `config tools web-fetch add-domain D`  | `config set tools.web_fetch.allowed_domains "D"` |
| `config export set-model X`            | `config set export.summary_model X`              |
| `config show`                          | `config get`                                     |
| `config tools exec <tool>`             | `tools execute <tool>`                           |
| `config tools validate <cmd>`          | `tools validate <cmd>`                           |

See the [full configuration reference](https://github.com/inference-gateway/cli/blob/main/docs/configuration.md) for detailed options.

## Shortcuts

The CLI provides built-in shortcuts and supports custom user-defined shortcuts.

### Built-in Shortcuts

| Shortcut              | Description                                                                                        | Example                                   |
| --------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `/init`               | Generate AGENTS.md documentation                                                                   | `/init`                                   |
| `/init-github-action` | Setup GitHub Action integration                                                                    | `/init-github-action`                     |
| `/git <cmd>`          | Git operations                                                                                     | `/git status`, `/git commit`, `/git push` |
| `/scm <cmd>`          | GitHub operations                                                                                  | `/scm pr-create`, `/scm issue view 123`   |
| `/model [name] [msg]` | Switch the active model, or run one message with another model (replaces `/switch`)                | `/model deepseek/deepseek-v4-pro`         |
| `/a2a`                | View connected A2A agents                                                                          | `/a2a`                                    |
| `/skills <cmd>`       | Manage Agent Skills                                                                                | `/skills list`, `/skills install <url>`   |
| `/voice [seconds]`    | Record the mic and transcribe to the input field (requires [speech-to-text](/cli-speech-to-text/)) | `/voice`, `/voice 8`                      |

### Git Shortcuts

```bash
# Execute git commands
/git status
/git branch

# AI-generated commit message
/git commit

# Push to remote
/git push origin main
```

### SCM (GitHub) Shortcuts

```bash
# List GitHub issues
/scm issues

# View issue details
/scm issue 123

# Create pull request with AI-powered plan
/scm pr-create
```

### Voice Shortcut

The `/voice` shortcut records audio from your microphone, transcribes it locally with [whisper.cpp](https://github.com/ggml-org/whisper.cpp), and places the text into the input field - ready to review and send. It is **disabled by default** and only appears when `speech_to_text.enabled` is `true`.

```bash
# Record until you go quiet (or the max cap), then transcribe
/voice

# Record for at most 8 seconds
/voice 8
```

Recording stops automatically a couple of seconds after you stop speaking (`speech_to_text.silence_timeout`), at the `max_recording_seconds` cap, or at the per-call override. See [Speech-to-Text](/cli-speech-to-text/) for prerequisites, configuration, and model selection.

### GitHub Action Setup

The `/init-github-action` shortcut launches an interactive wizard for setting up AI-powered issue automation using GitHub Apps and the [`infer-action` GitHub Action](/github-action/). This wizard streamlines the process of creating GitHub Apps, managing credentials, configuring repository secrets, and generating workflows that respond to issue mentions with `@infer`.

> For a full reference of `infer-action` inputs, outputs, and workflow recipes (PR review, scheduled summaries, release notes), see the [GitHub Action documentation](/github-action/).

**Key Features:**

- Interactive wizard for creating or configuring GitHub Apps
- Supports both personal and organization repositories
- Automatic workflow file generation in `.github/workflows/`
- Private key management with interactive file picker
- GitHub App reusability across multiple repositories
- Auto-opens browser with pre-filled app creation forms
- Multi-step guided setup process

**Prerequisites:**

- GitHub account with repository access
- Admin permissions for creating GitHub Apps (required for organization repositories)
- Downloaded private key file (`.pem`) from GitHub (after app creation)

**Usage:**

```bash
infer chat
> /init-github-action
```

**Wizard Flow:**

1. **Check Existing Configuration**: Detects if a GitHub App is already configured
2. **App ID Input**: Enter existing App ID or create a new GitHub App
3. **Private Key Selection**: Interactive file picker to select your `.pem` private key file
4. **Repository Configuration**: Configure repository secrets and permissions
5. **Workflow Creation**: Automatically generates GitHub Action workflow files

**Creating a New GitHub App:**

When creating a new app, the wizard opens GitHub with pre-configured settings:

- **App Name**: `infer-bot` (customizable)
- **Required Permissions**:
  - Contents: Write access
  - Pull Requests: Write access
  - Issues: Write access
  - Metadata: Read access
- **Webhooks**: Disabled by default (can be enabled later if needed)

**Steps for First-Time Setup:**

1. Run `/init-github-action` in chat mode
2. Choose to create a new GitHub App
3. Browser opens with pre-filled GitHub App creation form
4. Complete the app creation on GitHub
5. Download the private key (`.pem` file) from GitHub
6. Return to CLI and enter the App ID shown on GitHub
7. Use the file picker to select your downloaded `.pem` file
8. Wizard creates workflow files in `.github/workflows/`

**Reusing GitHub Apps:**

The same GitHub App can be reused across multiple repositories:

```bash
cd another-project
infer chat
> /init-github-action
# Enter the same App ID and use the same private key file
```

**Generated Workflow Files:**

The wizard creates GitHub Action workflows in `.github/workflows/infer.yml` that:

- Trigger on issue events (opened, edited) and issue comments
- Generate GitHub App tokens for authentication
- Execute AI-powered agents via the `@infer` mention trigger
- Support multiple LLM providers (OpenAI, Anthropic, DeepSeek, etc.)
- Provide full repository access (issues, contents, pull requests)

**Example Generated Workflow:**

```yaml
name: Infer

on:
  issues:
    types:
      - opened
      - edited
  issue_comment:
    types:
      - created

permissions:
  issues: write
  contents: write
  pull-requests: write

jobs:
  infer:
    runs-on: ubuntu-24.04
    steps:
      - name: Generate GitHub App Token
        id: generate-token
        uses: actions/create-github-app-token@v2.2.0
        with:
          app-id: ${{ secrets.INFER_APP_ID }}
          private-key: ${{ secrets.INFER_APP_PRIVATE_KEY }}
          owner: ${{ github.repository_owner }}

      - name: Checkout Repository
        uses: actions/checkout@v7.0.0
        with:
          token: ${{ steps.generate-token.outputs.token }}

      - name: Run Infer Agent
        uses: inference-gateway/infer-action@v0.4.0
        with:
          github-token: ${{ steps.generate-token.outputs.token }}
          trigger-phrase: '@infer'
          model: 'deepseek/deepseek-v4-pro'
          max-turns: 50
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          google-api-key: ${{ secrets.GOOGLE_API_KEY }}
          deepseek-api-key: ${{ secrets.DEEPSEEK_API_KEY }}
```

**Repository Secrets Configuration:**

After running the wizard, configure these secrets in your GitHub repository settings:

- `INFER_APP_ID` - Your GitHub App ID
- `INFER_APP_PRIVATE_KEY` - Your GitHub App private key (.pem file contents)
- Provider API keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.)

**Usage in Issues:**

Once configured, mention `@infer` in any issue or issue comment to activate the agent:

```text
@infer Please analyze this bug and suggest a fix
```

For more information on the `infer-action` GitHub Action, see the [GitHub Action documentation](/github-action/) or the [upstream repository](https://github.com/inference-gateway/infer-action).

### Custom Shortcuts

Create YAML files in `.infer/shortcuts/` directory. Shortcuts support three types:

#### 1. Simple Commands

Execute a single command:

```yaml
# .infer/shortcuts/simple.yaml
shortcuts:
  - name: hello
    description: 'Say hello'
    command: echo
    args:
      - 'Hello from Inference Gateway!'
```

#### 2. Shortcuts with Subcommands

Group related commands under a parent shortcut:

```yaml
# .infer/shortcuts/dev.yaml
shortcuts:
  - name: dev
    description: 'Development operations'
    command: bash
    subcommands:
      - name: test
        description: 'Run all tests'
        args:
          - -c
          - 'go test ./...'

      - name: build
        description: 'Build the project'
        args:
          - -c
          - 'go build -o app .'
```

Usage: `/dev test`, `/dev build`

#### 3. AI-Powered Snippets

Use LLM to generate dynamic content based on command output. The `snippet.prompt` can reference JSON fields from command output using `{fieldName}` placeholders, and `snippet.template` uses `{llm}` for the AI-generated response:

```yaml
# .infer/shortcuts/ai-commit.yaml
shortcuts:
  - name: ai-commit
    description: 'AI-generated commit message'
    command: bash
    args:
      - -c
      - |
        diff=$(git diff --cached)
        jq -n --arg diff "$diff" '{"diff": $diff}'
    snippet:
      prompt: "Generate commit message for:\n{diff}"
      template: '!git commit -m "{llm}"'
```

The command must output JSON. Fields are accessible in the prompt template via `{fieldName}` syntax. The LLM response is accessible via `{llm}` in the template.

## Advanced Features

### Cost Tracking

Real-time token usage and cost calculation displayed in the status bar.

**Features:**

- Per-model pricing calculation
- Cumulative session costs
- Input and output token tracking
- Status bar indicator
- Custom pricing support

**View Costs:**

```bash
# Costs displayed in status bar during chat
infer chat
# Status bar shows model and current cost

# Inspect a saved conversation's entries (per-entry metadata, including model)
infer conversations show <session-id>

# Same, as one JSON object per line for piping into jq
infer conversations show <session-id> --format json | jq .
```

#### Pricing Configuration

Pricing lives under the `pricing` key in `.infer/config.yaml`. The `custom_prices` map overrides or adds entries to the built-in per-model pricing table, keyed by model name.

```yaml
# .infer/config.yaml
pricing:
  enabled: true
  currency: 'USD'
  custom_prices:
    'ollama_cloud/deepseek-v4-pro':
      input_price_per_mtoken: 0.0
      output_price_per_mtoken: 0.0
      requires_pro: true
```

| Field                     | Type    | Description                                                                   |
| ------------------------- | ------- | ----------------------------------------------------------------------------- |
| `input_price_per_mtoken`  | number  | Cost per 1M prompt (input) tokens, in `currency`.                             |
| `output_price_per_mtoken` | number  | Cost per 1M completion (output) tokens, in `currency`.                        |
| `requires_pro`            | boolean | Marks the model as gated behind a paid Pro subscription. Defaults to `false`. |

> **Override caveat:** a `custom_prices` entry **fully replaces** the default for that model - it is not merged field by field. Omitting `requires_pro` in a custom override therefore resets it to `false`, even when the model is flagged Pro by default. Set `requires_pro: true` explicitly when overriding the pricing of a Pro model.

#### Model Categories (Free / Paid / Pro)

The model picker shows filter tabs - `[1] All`, `[2] Free`, `[3] Paid`, `[4] Pro` - and groups models into three disjoint categories:

| Category | Meaning                                                        |
| -------- | -------------------------------------------------------------- |
| Free     | No per-token cost **and** not gated behind a Pro subscription. |
| Paid     | Billed per token.                                              |
| Pro      | Gated behind a paid Pro subscription (`requires_pro: true`).   |

Pro is an axis **orthogonal to price**: an Ollama Cloud Pro model has no per-token cost but is not free, so it is labelled `pro subscription` rather than `free`. The marker appears both in the picker rows and in `/model` autocomplete descriptions:

```
ollama_cloud/deepseek-v4-pro   (1M, pro subscription)
ollama_cloud/deepseek-v4-flash (1M, pro subscription)
ollama_cloud/deepseek-v3.2     (128K, free)
deepseek/deepseek-v4-pro       (1M, $1.74/$3.48 per MTok)
```

`ollama_cloud/deepseek-v4-pro` and `ollama_cloud/deepseek-v4-flash` are flagged Pro by default. This default Pro set is **maintainer-curated** (Ollama publishes no stable per-model tier badge) and fully overridable through `custom_prices` - set `requires_pro: true` to gate additional models, or override a default Pro model as shown above.

### Model Thinking Visualization

Collapsible thinking blocks for models that support thinking (Claude, o1, etc.).

**Features:**

- Collapsible blocks with first sentence preview
- **Ctrl+K** keyboard shortcut to toggle
- Theme-aware styling
- Performance optimization (long thinking blocks collapsed by default)

**Usage:**

```bash
infer chat
# Ask complex question requiring reasoning
> "Design a scalable microservices architecture for e-commerce"
# Model's thinking process displayed in collapsible blocks
# Press Ctrl+K to expand/collapse thinking
```

### Conversation Management

**Storage Backends:**

- **SQLite** (default): `.infer/conversations.db`
- **PostgreSQL**: Shared team database
- **Redis**: High-performance caching
- **JSONL**: Append-only files under `.infer/conversations/`
- **Cloudflare D1**: External SQLite over Cloudflare's HTTP query API
- **In-memory**: Temporary sessions

**Features:**

- Automatic conversation history
- AI-generated titles (batch: 10 messages)
- Token optimization with compaction
- Backend-agnostic inspection via the storage layer (works the same across `jsonl`, `sqlite`,
  `postgres`, `redis`, `d1`, and `memory`)

**Subcommands:**

- `list`: List saved conversations with metadata (id, title, message/request counts, tokens, cost).
- `show <session-id>`: Print a single conversation's entries in chronological order (role,
  timestamp, content, and `tool_call_id` for tool results).

**`show` flags:**

- `--include-hidden`: Include entries persisted as hidden - system reminders, plan-approval
  prompts, drained background-task results, and the synthetic verify message injected by
  `infer agent`. Off by default.
- `--format text|json`: `text` (default) is human-readable; `json` emits one JSON object per
  line (NDJSON), matching the `infer agent` stdout shape for piping into `jq` or log scrapers.

**Session id resolution:**

`<session-id>` is resolved the same way as `infer agent --session-id`: a literal UUID is used
as-is, while any other value is treated as a session group key and resolved to that group's
current session id (registering the group if it is new). This means you can show a conversation
by group name such as `channel-telegram-12345`.

**Commands:**

```bash
# List conversations to find a session id
infer conversations list

# Show a conversation's entries (hidden entries omitted by default)
infer conversations show 12345678-1234-1234-1234-123456789abc

# Show by session group name (for example a channel group key)
infer conversations show channel-telegram-12345

# Include hidden entries such as system reminders
infer conversations show <session-id> --include-hidden

# One JSON object per line for piping into jq
infer conversations show <session-id> --format json | jq .
```

#### Cloudflare D1 backend

[Cloudflare D1](https://developers.cloudflare.com/d1/) is an external, SQLite-compatible store the CLI writes to over D1's HTTP query API. It is built for **ephemeral CI runners** (for example a headless [`infer agent`](#headless-agent-stream-output) on GitHub Actions): unlike `sqlite`, `jsonl`, and `memory` - which live on the runner's disk and are wiped on recycle - D1 persists off-runner and stays readable by the gateway through its native binding. Unlike `postgres` and `redis`, it needs no wire-protocol connection, just HTTPS.

Set `storage.type: d1` and configure the `storage.d1` block:

```yaml
storage:
  enabled: true
  type: d1
  d1:
    account_id: '<cloudflare-account-id>'
    database_id: '<d1-database-id>'
    api_token: '<api-token-with-d1-edit>' # inject via INFER_STORAGE_D1_API_TOKEN
    base_url: 'https://api.cloudflare.com/client/v4' # optional
```

**Environment variables:**

| Variable                       | Description                                                                |
| ------------------------------ | -------------------------------------------------------------------------- |
| `INFER_STORAGE_D1_ACCOUNT_ID`  | Cloudflare account id that owns the D1 database.                           |
| `INFER_STORAGE_D1_DATABASE_ID` | Target D1 database id.                                                     |
| `INFER_STORAGE_D1_API_TOKEN`   | API token with D1 edit permission. Secret - inject, never commit.          |
| `INFER_STORAGE_D1_BASE_URL`    | Optional API base URL. Defaults to `https://api.cloudflare.com/client/v4`. |

**Notes:**

- **No manual migration.** Like `jsonl`, `redis`, and `memory`, D1 creates its schema automatically on first connect - there is no separate migration step to run.
- **Schema parity.** The D1 driver runs the SQLite migrations verbatim over HTTP, so the `conversations` and `session_groups` tables stay byte-for-byte compatible with the SQLite backend - either side can initialise the database.
- **UTC timestamps.** Timestamps are stored as UTC RFC3339 so `ORDER BY updated_at DESC` sorts stably across runners in any timezone and external reads stay unambiguous.
- **Secret handling.** `api_token` follows the existing plaintext-config + env-override convention (like the Postgres password) and is never logged - inject it via `INFER_STORAGE_D1_API_TOKEN`.

> Shipped in [inference-gateway/cli#646](https://github.com/inference-gateway/cli/pull/646).

### Persistent Memory

The **Memory** tool gives the agent durable, **cross-session** memory: facts it learns in one session survive into the next. Each fact is a single Markdown **fact-file** (with YAML frontmatter) stored under a global directory - `~/.infer/memory` by default - and catalogued by a `MEMORY.md` index. That index is injected into context at the **start of every session**, so the agent always knows what it has recorded; it then reads or writes individual facts on demand. A default [system reminder](#key-configuration-areas) (`memory-consult`) nudges it to consult and keep memory current. Memory is **enabled by default**.

> **Not the same as `storage.type: memory`.** This is the agent's knowledge memory - durable facts on disk under `~/.infer/memory`. The `memory` [conversation storage backend](#conversation-management) is unrelated: an in-RAM transcript store that is wiped when the process exits.

#### The Memory tool

`Memory` is a [Workflow tool](#tool-categories) whose `operation` parameter selects one of three actions:

| Operation | Parameters                                              | Effect                                                                        |
| --------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `read`    | `name` (optional)                                       | With no `name`, returns the `MEMORY.md` index; with a `name`, that fact-file. |
| `write`   | `name`, `description`, `type`, `content` (all required) | Creates or updates a fact-file and its index entry.                           |
| `delete`  | `name` (required)                                       | Removes a fact-file and its index entry.                                      |

`name` is a short slug (for example `build-commands`), `description` is the one-line summary shown in the `MEMORY.md` index, `content` is the Markdown fact body, and `type` is one of `user`, `feedback`, `project`, or `reference`.

#### Configuration (`memory.yaml`)

Runtime knobs live in `memory.yaml` (seeded by `infer init`; the in-code defaults apply when the file is absent):

```yaml
# .infer/memory.yaml (or ~/.infer/memory.yaml)
enabled: true
dir: '' # "" => ~/.infer/memory
max_chars: 4000 # cap on the MEMORY.md index injected into context
```

| Key         | Default           | Environment variable     | Description                                                          |
| ----------- | ----------------- | ------------------------ | -------------------------------------------------------------------- |
| `enabled`   | `true`            | `INFER_MEMORY_ENABLED`   | Master switch - registers the `Memory` tool and the index injection. |
| `dir`       | `~/.infer/memory` | `INFER_MEMORY_DIR`       | Directory holding the fact-files and `MEMORY.md`. `""` = default.    |
| `max_chars` | `4000`            | `INFER_MEMORY_MAX_CHARS` | Upper bound on the `MEMORY.md` index injected at session start.      |

The memory directory is local by default. To back it with a **git remote** - pull on run start, commit and push on change - configure a [Sync backend](#sync-backend).

#### Sync backend

By default the memory directory lives on a single machine (`backend.type: local`, a pure no-op). Point the backend at a **git remote** to share one memory across machines, CI runners, channels, and scheduled runs: the CLI **pulls on run start** and **commits + pushes on change**.

```yaml
# .infer/memory.yaml (or ~/.infer/memory.yaml)
enabled: true
dir: '' # "" => ~/.infer/memory
max_chars: 4000
backend:
  type: local # local (default) | git
  git:
    repo: 'git@github.com:my-org/agent-memory.git'
    branch: main
    commit_message: 'chore(memory): sync'
    timeout: 60 # seconds per git op
    sync:
      on_start: pull # pull (default) | off
      on_finish: push # push (default) | off
```

`type: local` is the default and a pure no-op - existing users see no change.

| Key                          | Default               | Environment variable                      | Notes                                           |
| ---------------------------- | --------------------- | ----------------------------------------- | ----------------------------------------------- |
| `backend.type`               | `local`               | `INFER_MEMORY_BACKEND_TYPE`               | `local` (no-op) or `git`.                       |
| `backend.git.repo`           | `''`                  | `INFER_MEMORY_BACKEND_GIT_REPO`           | Remote URL. Required when `type: git`.          |
| `backend.git.branch`         | `main`                | `INFER_MEMORY_BACKEND_GIT_BRANCH`         | Branch to track.                                |
| `backend.git.commit_message` | `chore(memory): sync` | `INFER_MEMORY_BACKEND_GIT_COMMIT_MESSAGE` | Deterministic, non-LLM commit message.          |
| `backend.git.timeout`        | `60`                  | `INFER_MEMORY_BACKEND_GIT_TIMEOUT`        | Seconds per git op (prevents credential hangs). |
| `backend.git.sync.on_start`  | `pull`                | `INFER_MEMORY_BACKEND_GIT_SYNC_ON_START`  | `pull` or `off`.                                |
| `backend.git.sync.on_finish` | `push`                | `INFER_MEMORY_BACKEND_GIT_SYNC_ON_FINISH` | `push` or `off`.                                |

**Validation:** when memory is enabled and `type: git`, `repo` is required; `on_start` must be `pull` or `off`, and `on_finish` must be `push` or `off`.

##### How it syncs

- **On run start (SyncIn).** Clones the repo when the memory dir is missing, otherwise fast-forward / rebase pulls. An `ls-remote` probe decides clone vs. init-in-place - an empty remote, or a pre-existing local memory dir, is initialized in place instead of cloned.
- **On change (SyncOut).** Commits and pushes **only when `git status --porcelain` reports changes**, through a bounded **push -> pull-rebase -> retry** loop. A per-host `flock` serializes concurrent runs (channels / scheduler / heartbeat) so they do not clobber each other.
- **Where the push happens.** In **chat**, the `Memory` tool pushes on each write / delete - not a post-session hook, which would commit-storm once per message. In headless [`infer agent`](#headless-agent-stream-output), it pulls on start and pushes once at run finish. Either way it works across channel, scheduler, and heartbeat subprocess runs.
- **Best-effort, never fatal.** A failed clone / pull / push is logged and the run continues - sync never aborts the agent run.

##### Authentication

Sync uses the **ambient git credential chain** - ssh-agent, a git credential helper, or `GIT_*` environment variables. The backend injects no ssh key or env override of its own, so pick whichever your environment already uses:

- **SSH (preferred)** - a `git@github.com:...` remote plus a loaded ssh-agent key.
- **`gh auth`** - the GitHub CLI credential helper for `https://` remotes.
- **Token in URL** - works, but the CLI **logs a warning**, because credentials embedded in the remote URL persist in `.git/config`. Prefer SSH.

The per-op `timeout` (default `60` seconds) keeps an interactive credential prompt from hanging a run.

> Shipped in [inference-gateway/cli#707](https://github.com/inference-gateway/cli/pull/707) (closes [inference-gateway/cli#683](https://github.com/inference-gateway/cli/issues/683)).

#### Disabling memory

Turn it off in `memory.yaml`:

```yaml
# .infer/memory.yaml (or ~/.infer/memory.yaml)
enabled: false
```

or via the environment, without touching config:

```bash
export INFER_MEMORY_ENABLED=false
```

When disabled, the `Memory` tool is not registered, no `MEMORY.md` index is injected, and the `memory-consult` reminder is pruned automatically.

> Shipped in [inference-gateway/cli#679](https://github.com/inference-gateway/cli/pull/679).

### MCP Integration

Connect to Model Context Protocol servers for extended capabilities. MCP provides stateless tool execution for external services like databases, file systems, and APIs.

**Setup:**

Initialize project to create `.infer/mcp.yaml`:

```bash
infer init
```

Configure MCP servers in `.infer/mcp.yaml`:

```yaml
enabled: true
connection_timeout: 30
discovery_timeout: 30
liveness_probe_enabled: true
liveness_probe_interval: 10

servers:
  # Auto-start MCP server in container (recommended)
  - name: 'demo-server'
    enabled: true
    run: true
    oci: 'mcp-demo-server:latest'
    description: 'Demo MCP server'

  # Connect to external MCP server
  - name: 'filesystem'
    url: 'http://localhost:3000/sse'
    enabled: true
    description: 'File system operations'
    exclude_tools:
      - 'delete_file'
```

**CLI Commands:**

```bash
# Add auto-start MCP server
infer mcp add my-server --run --oci=my-mcp:latest

# List MCP servers
infer mcp list

# Toggle server
infer mcp toggle my-server

# Remove server
infer mcp remove my-server
```

**Using MCP Tools:**

MCP tools appear as `MCP_<server>_<tool>` in chat. Example:

```bash
infer chat
> "Use the MCP_demo-server_get_time tool to get current time"
```

See [MCP documentation](/mcp/) for detailed integration guide and server development.

### Agent Skills

Reusable, model-readable instruction folders that the agent loads on demand. The CLI uses the same on-disk format as Claude Code, Gemini CLI, and OpenAI Codex CLI, so a skill authored for any of those tools drops into `.infer/skills/` unchanged. Skills are discovered from three locations, in precedence order: project `.infer/skills/`, the `.agents/skills/` open standard (a shared cross-tool convention), then user-global `~/.infer/skills/`. Skills are **enabled by default** ([since cli#618](https://github.com/inference-gateway/cli/pull/618)) - discovered skills are injected into the system prompt out of the box. Only the lightweight metadata (name + description) is added; each `SKILL.md` body is read on demand. Turn them off with `agent.skills.enabled: false`, or skip individual skills with `disabled_skills`.

```yaml
# .infer/config.yaml
agent:
  skills:
    enabled: true # default
    disabled_skills: [] # optional list of skill names to skip
```

```bash
# Discover, install, and remove skills (also available in chat as /skills ...)
infer skills list
infer skills install acme/internal-comms   # or a bare name, or a github tree URL
infer skills uninstall internal-comms
```

Once enabled, invoke a skill explicitly with `/<name>` (for example `/pdf-helper`) or by asking the agent to "use the `<name>` skill"; the CLI deterministically activates it by injecting the skill's metadata and pointing the agent at its `SKILL.md`. Installed skills under `~/.infer/skills` and `./.infer/skills` stay readable by the Read tool through a sandbox carve-out, so they load even when the agent runs outside the project directory (for example in CI).

See the full **[Agent Skills guide](/cli-skills/)** for the on-disk layout, the `SKILL.md` frontmatter contract, install flags, activation triggers, and the sandbox carve-out. To publish a skill in the shared index, see the [Skills Catalog](/skills/).

### A2A Integration

Delegate specialized tasks to Agent-to-Agent compatible agents.

**Setup:**

```bash
# Initialize agents configuration
infer agents init

# Add remote agent
infer agents add calendar-agent http://calendar.example.com

# Add local agent with Docker
infer agents add my-agent http://localhost:8081 --oci ghcr.io/myorg/agent:latest --run

# List agents
infer agents list

# View agent details
infer agents show calendar-agent
```

**Usage:**

```bash
infer chat
> "Schedule a meeting tomorrow at 2 PM using the calendar agent"
> /a2a  # View connected agents
```

See [A2A documentation](/a2a/) for creating custom agents, or use the [ADL CLI](/adl-cli/) to scaffold new A2A agents from YAML definitions.

### Parallel Tool Execution

Execute up to 5 tools concurrently for improved performance.

**Configuration:**

```yaml
agent:
  max_concurrent_tools: 5 # Default: 5
```

**Benefits:**

- Faster multi-file operations
- Concurrent web fetches
- Parallel code searches
- Reduced total execution time

## Workflows

### Bug Investigation and Fix

```bash
infer chat
# Shift+Tab to Plan Mode
> "Analyze bug in issue #123 and create fix plan"

# Shift+Tab to Standard Mode
> "Implement the fix according to the plan"

# Test and commit
> "Run test suite to verify"
> "/git commit"
```

### Feature Development

```bash
infer chat
> "Read CONTRIBUTING.md and understand project structure"

# Shift+Tab to Plan Mode
> "Design implementation for user profile feature with avatar upload"

# Shift+Tab twice to Auto-Accept Mode
> "Implement the user profile feature according to the plan"

# Shift+Tab to Standard Mode
> "Review changes and run all tests"
```

### Code Review and Refactoring

```bash
infer chat
# Plan Mode for analysis
> "Review authentication module for security issues and code quality"

# Standard Mode for implementation
> "Refactor based on recommendations, prioritize security issues"
```

### GitHub Issue Resolution

```bash
infer agent "Fix the bug described in GitHub issue #456"

# Agent autonomously:
# 1. Fetches issue details
# 2. Analyzes relevant code
# 3. Implements fix
# 4. Runs tests
# 5. Creates commit referencing issue
```

## Best Practices

### For Beginners

- Start with Plan Mode for unfamiliar code
- Always work in git repositories
- Review diff visualizations before approving
- Begin with simple tasks

### For Power Users

- Use Auto-Accept for trusted, repetitive tasks
- Create custom shortcuts for frequent commands
- Combine with scripts for automation
- Leverage A2A for specialized workflows

### Performance Tips

- Be specific with file paths and function names
- Use Grep to narrow down relevant files first
- Break large tasks into smaller subtasks
- Provide context with references

### Safety

- Review diffs before approving modifications
- Run tests after significant changes
- Have backups before extensive Auto-Accept usage
- Allow-list only trusted commands
- Add sensitive directories to protected paths

## Security

### Command allow-listing

The Bash tool is **default-deny**: a command auto-runs only when it matches the [per-mode allowed-list](#per-mode-allowed-list) for the active [agent mode](#agent-modes). The effective list is `mode.all.allow` (the every-mode baseline) unioned with the active mode's own entries:

```yaml
tools:
  bash:
    mode:
      all:
        allow:
          - ls( .*)?
          - pwd( .*)?
          - tree( .*)?
          - git status( .*)?
          - git diff( .*)?
          - npm (install|test|run).*
      auto:
        allow:
          - .* # unrestricted - Auto-Accept mode only
```

Read-only `gh` operations are in the baseline so the agent can inspect GitHub out of the box; **writes** (`gh issue/pr create|edit|comment`) and **destructive** operations (for example `gh pr merge`, `gh repo delete`) are not - they fall through to approval. See [Default gh allowed-list](#default-gh-allowed-list) for the full list.

Entries match the **whole** command, and a [clean-command guard](#clean-command-guard) rejects command substitution, multi-command chains/pipelines, file-write redirects, dangerous `find` actions, and environment-variable leaks before matching. The only thing that lifts the guard is the `.*` sentinel (Auto-Accept mode).

### Protected Paths

Automatically excluded from tool access:

- `.git/` - Repository data
- `*.env` - Environment files
- `.infer/` - Configuration directory
- Custom paths via sandbox config

### Approval Workflow

Tool approval has **two independent layers** - _whether_ an action needs approval, and _how_ that approval is delivered:

- **Whether** - `tools.safety.require_approval` (with per-tool overrides like `tools.bash.require_approval` / `tools.write.require_approval`, and for Bash the per-mode [allowed-list](#command-allow-listing)).
- **How** - `tools.safety.approval_behaviour`, one of:

| `approval_behaviour` | How a needed approval is delivered                                                      |
| -------------------- | --------------------------------------------------------------------------------------- |
| `prompt` (default)   | Prompt in the chat TUI; under a channel manager, deliver over IPC; otherwise block.     |
| `ipc`                | Deliver over IPC when a broker is attached (e.g. the channel manager); otherwise block. |
| `block`              | Always reject an approval-requiring action with a reason - never prompt.                |

```bash
infer config set tools.safety.require_approval true
infer config set tools.safety.approval_behaviour prompt
```

LLMs request approval before executing Write/Edit/Delete/Bash operations, with a colored, syntax-aware diff preview for file edits.

#### Headless secure-by-default

`infer agent` runs in **standard** mode, so an off-list or mutating action is **not** auto-run. With no approver reachable (CI, heartbeat) it is **blocked** with a reason; under a channel manager (`--require-approval`) it is sent for **IPC** approval (for example a Telegram confirmation). There is no `.*` default - full autonomy is an explicit opt-in (a curated allowed-list, the [append override](#append-only-override-ci), or `mode.auto` / `.*`).

For a CI agent that should edit files and run a curated command set with **no** interactive approver, use the **controlled-autonomy** profile - `block` everything that would need approval, but let the agent write files and run a vetted allowed-list:

```yaml
tools:
  safety:
    approval_behaviour: block # reject anything that would otherwise prompt
  write:
    require_approval: false # ...but let the agent write/edit files freely
  bash:
    mode:
      all:
        allow: # curate exactly what may run unattended
          - git status( .*)?
          - git add( .*)?
          - go (build|test)( .*)?
```

Add a couple more commands without touching config via `INFER_TOOLS_BASH_ALLOW_APPEND="git commit,git push"`.

## Troubleshooting

### Connection Issues

```bash
# Check configuration
infer config get

# Verify gateway status
infer status

# Debug mode
infer --debug chat
```

### Permission Issues

```bash
# Check configuration directory
ls -la ~/.infer/

# Recreate config.yaml from defaults
infer config init --overwrite

# Re-initialize the project
infer init
```

### Tool Execution Problems

```bash
# Inspect tool configuration
infer config get tools

# Check whether a bash command is allowed (without running it)
infer tools validate "git status"

# Enable debug logging
export INFER_LOGGING_DEBUG=true
infer agent "your task"
```

### Computer Use Issues

```bash
# Verify display server
echo $DISPLAY  # Linux/X11

# Check permissions (macOS)
# System Preferences > Security & Privacy > Accessibility

# Test screenshot
infer chat
> "Take a screenshot and describe what you see"
```

### Shell Completions Not Working

```bash
# Confirm the completion script generates
infer completion zsh | head

# Zsh: the file must live on a directory in $fpath and be named _infer,
# then start a fresh shell
infer completion zsh > "${fpath[1]}/_infer" && exec zsh

# Bash: source the generated file (or place it under a bash-completion dir)
source <(infer completion bash)
```

If completions still do not appear, the shell rc is usually not sourcing the completion file. Verify `compinit` is called for zsh (or `bash-completion` is installed for bash), confirm the file path is on `$fpath`/a bash-completion directory, then start a fresh shell.

## Command Reference

| Command                            | Description                                                      |
| ---------------------------------- | ---------------------------------------------------------------- |
| `infer init`                       | Initialize project configuration                                 |
| `infer status`                     | Check gateway health and resource usage                          |
| `infer chat`                       | Interactive chat session (TUI)                                   |
| `infer chat --web`                 | Web-based terminal interface                                     |
| `infer agent <task>`               | Autonomous task execution                                        |
| `infer skills <subcommand>`        | Manage Agent Skills (list, install, uninstall)                   |
| `infer channels-manager`           | Start the remote messaging daemon ([Channels](/cli-channels/))   |
| `infer config <subcommand>`        | Configuration management (`init`, `get`, `set`)                  |
| `infer tools <subcommand>`         | Run agent tools directly (`execute`, `validate`)                 |
| `infer agents <subcommand>`        | A2A agent management                                             |
| `infer conversations <subcommand>` | Conversation history management (`list`, `show`)                 |
| `infer completion <shell>`         | Generate a shell completion script (bash, zsh, fish, powershell) |
| `infer version`                    | Show version information (backwards-compatible subcommand)       |
| `infer --version`                  | Show version information (styled by fang)                        |
| `infer --help`                     | Display styled help information                                  |

## Support and Resources

- **Repository**: [github.com/inference-gateway/cli](https://github.com/inference-gateway/cli)
- **Issues**: [GitHub Issues](https://github.com/inference-gateway/cli/issues)
- **Releases**: [GitHub Releases](https://github.com/inference-gateway/cli/releases)
- **Documentation**: [Full Configuration Reference](https://github.com/inference-gateway/cli/blob/main/docs/configuration.md)

The CLI is actively developed with regular updates and new features. Check the repository for the latest releases and announcements.
