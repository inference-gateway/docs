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

### Auto-Accept Mode

Zero approval prompts for maximum speed. Use with caution in version-controlled environments.

```bash
infer chat
# Press Shift+Tab twice to switch to Auto-Accept Mode
> "Run the test suite, fix all failing tests, and commit the changes"
# Agent executes everything immediately
```

**Important for Auto-Accept:** Ensure clean git working tree and backups.

### Headless Agent Stream Output

`infer agent <task>` runs the agent non-interactively and writes a **newline-delimited JSON (JSONL) stream** to stdout. Each line is one JSON object with a `type` discriminator, intended for programmatic consumers such as the [`infer-action` GitHub Action](/github-action/). The stream is additive: new `type` values may be introduced over time and consumers should ignore any `type` they do not recognize.

```bash
infer agent "Refactor the authentication module"
```

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

| Category              | Tools                                                                                             | Description                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **File System**       | Read, Write, Edit, MultiEdit, Delete, Tree, Grep                                                  | File operations and search with safety controls                                      |
| **Command Execution** | Bash, BashOutput, KillShell, ListShells                                                           | Whitelisted shell execution (including `gh` for GitHub) and background shell control |
| **Web**               | WebSearch, WebFetch                                                                               | Internet research and content fetching                                               |
| **Workflow**          | TodoWrite, Schedule, RequestPlanApproval                                                          | Task tracking, cron jobs, plan-mode approval                                         |
| **A2A Integration**   | A2A_QueryAgent, A2A_SubmitTask, A2A_QueryTask                                                     | Delegate to specialized agents - see [A2A](/a2a/)                                    |
| **Computer Use**      | GetLatestScreenshot, MouseMove, MouseClick, MouseScroll, KeyboardType, GetFocusedApp, ActivateApp | GUI automation - see the Computer Use section above                                  |
| **MCP**               | `MCP_<server>_<tool>`                                                                             | Dynamically registered tools from MCP servers - see [MCP](/mcp/)                     |

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

Execute a whitelisted bash command. Only commands matching the configured whitelist (exact commands or regex patterns) can run.

- **Parameters**: `command` (required - must match the whitelist), `format` (`text` or `json`)
- **Approval**: configurable via `tools.bash.require_approval`

```yaml
tools:
  bash:
    enabled: true
    whitelist:
      commands:
        - ls
        - pwd
        - git status
      patterns:
        - ^git branch.*
        - ^npm (install|test|run).*
    require_approval: false
```

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

Fetch content from a whitelisted URL. Optionally save the response to disk.

- **Parameters**: `url` (required), `format` (`text` or `json`), `download` (default `false` - when `true`, saves under `~/.infer/tmp`)
- **Notes**: only whitelisted domains are allowed; responses are cached (default 15-minute TTL)

```yaml
tools:
  web_fetch:
    enabled: true
    whitelisted_domains:
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

#### Default gh whitelist

GitHub operations run through Bash, so they obey the [Bash whitelist](#command-whitelisting). The default config auto-approves common **non-destructive** `gh` commands:

| Auto-approved by default | Examples                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Read-only reads          | `gh issue list`, `gh pr view 5`, `gh pr diff`, `gh repo view`, `gh release view v1`  |
| Auth status              | `gh auth status`                                                                     |
| Issue writes             | `gh issue create`, `gh issue edit 5 --add-label foo`, `gh issue comment 5 --body hi` |
| PR creation              | `gh pr create --title x --body y`                                                    |
| Read-only API (GET)      | `gh api repos/o/r/issues`, `gh api user --jq .login`                                 |

`gh api` is auto-approved **only for GET requests** - a bare endpoint optionally followed by read-only flags (`--paginate`, `--jq`, `-q`). Any mutating call - `-X`/`--method`, `-f`/`-F`/`--field`, or `--input` - is **not** auto-approved.

**Destructive operations are deliberately left off the whitelist** - for example `gh pr merge`, `gh pr close`, `gh issue delete`, `gh repo delete`, `gh release create`, `gh run cancel`, `gh auth login`, and any mutating `gh api`. They are **not blocked**; they fall through to the standard approval prompt so you can review and confirm them.

The shipped whitelist patterns:

```yaml
tools:
  bash:
    whitelist:
      patterns:
        - ^gh (issue|pr|repo|release|run|workflow) (list|view|status|diff|checks)( |$)
        - ^gh auth status( |$)
        - ^gh issue (create|edit|comment)( |$)
        - ^gh pr create( |$)
        - ^gh api [^ -][^ ]*( --paginate| --jq [^ ]+| -q [^ ]+)*$
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

#### RequestPlanApproval

Submit a completed plan for user approval. Available only in Plan Mode.

- **Parameters**: `plan` (required - the complete, detailed plan text)
- **Behavior**: pauses execution until the user approves (switches to execution mode) or rejects (provides feedback)

### Security Features

- **Command Whitelisting**: Only approved patterns allowed for Bash tool
- **Approval Prompts**: Safety confirmations for Write/Edit/Delete/Bash
- **Path Protection**: Sensitive directories automatically excluded (`.git/`, `*.env`, `.infer/`)
- **Sandbox Controls**: Restrict tool operations to allowed directories
- **Domain Whitelisting**: Control web fetch access
- **Diff Preview**: Visual diff before file modifications

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

Run any enabled tool outside a chat session, or check whether a bash command would pass the whitelist, with the top-level `infer tools` command.

```bash
# Execute a tool by name with JSON arguments (tool names are case-insensitive)
infer tools execute Read '{"file_path":"README.md"}'
infer tools execute grep '{"pattern":"func main","path":"."}'

# Validate whether a bash command is allowed by the whitelist (without running it)
infer tools validate "git status"
```

`infer tools execute <tool> [json-args]` resolves tool names case-insensitively in the CLI - the agent itself still uses the exact PascalCase names. `infer tools validate <command>` reports whether a bash command would be permitted by the configured whitelist, without executing it.

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
- Approval requirements per tool
- Command whitelists and patterns
- Sandbox directories
- Protected paths

**Storage Backends:**

- SQLite (default) - local file storage
- PostgreSQL - shared database for teams
- Redis - high-performance caching
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
```

### Configuration Commands

Configuration uses a generic key/value interface. `infer config get` reads the effective value of any key; `infer config set` writes one to `config.yaml`. Keys are dotted paths into the config (for example `agent.model`, `tools.bash.enabled`).

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
infer config set tools.web_fetch.whitelisted_domains "golang.org,github.com"

# Target the user-global ~/.infer/config.yaml instead of the project .infer/config.yaml
infer config set agent.model deepseek/deepseek-v4-flash --userspace

# Recreate config.yaml from defaults
infer config init --overwrite
```

> System prompts are **not** set via `config set` - they live in `prompts.yaml` (for example `prompts.agent.system_prompt`) and are edited there.

#### Command Mapping

The per-setting subcommands were removed in [inference-gateway/cli#601](https://github.com/inference-gateway/cli/pull/601) in favor of `config get`/`config set` and the top-level `infer tools` command:

| Old command                            | New command                                          |
| -------------------------------------- | ---------------------------------------------------- |
| `config agent set-model X`             | `config set agent.model X`                           |
| `config agent set-max-turns N`         | `config set agent.max_turns N`                       |
| `config agent verbose-tools enable`    | `config set agent.verbose_tools true`                |
| `config agent skills enable`           | `config set agent.skills.enabled true`               |
| `config tools enable`                  | `config set tools.enabled true`                      |
| `config tools bash enable`             | `config set tools.bash.enabled true`                 |
| `config tools safety enable`           | `config set tools.safety.require_approval true`      |
| `config tools safety set bash enabled` | `config set tools.bash.require_approval true`        |
| `config tools sandbox add DIR`         | `config set tools.sandbox.directories ".,DIR"`       |
| `config tools grep set-backend rg`     | `config set tools.grep.backend ripgrep`              |
| `config tools web-fetch add-domain D`  | `config set tools.web_fetch.whitelisted_domains "D"` |
| `config export set-model X`            | `config set export.summary_model X`                  |
| `config show`                          | `config get`                                         |
| `config tools exec <tool>`             | `tools execute <tool>`                               |
| `config tools validate <cmd>`          | `tools validate <cmd>`                               |

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
        uses: actions/checkout@v6.0.2
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
- **In-memory**: Temporary sessions

**Features:**

- Automatic conversation history
- AI-generated titles (batch: 10 messages)
- Token optimization with compaction
- Backend-agnostic inspection via the storage layer (works the same across `jsonl`, `sqlite`,
  `postgres`, `redis`, and `memory`)

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

Reusable, model-readable instruction folders that the agent loads on demand. The CLI uses the same on-disk format as Claude Code, Gemini CLI, and OpenAI Codex CLI, so a skill authored for any of those tools drops into `.infer/skills/` unchanged. Skills are **disabled by default** - zero token cost until you enable them.

```yaml
# .infer/config.yaml
agent:
  skills:
    enabled: true
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
- Whitelist only trusted commands
- Add sensitive directories to protected paths

## Security

### Command Whitelisting

Bash tool only executes whitelisted commands and patterns:

```yaml
tools:
  bash:
    whitelist:
      commands: [ls, pwd, tree, git]
      patterns:
        - ^git status$
        - ^git branch.*$
        - ^npm test$
        - ^gh (issue|pr|repo|release|run|workflow) (list|view|status|diff|checks)( |$)
        - ^gh pr create( |$)
        - ^gh api [^ -][^ ]*( --paginate| --jq [^ ]+| -q [^ ]+)*$
```

Non-destructive `gh` operations are whitelisted by default so the agent can work with GitHub out of the box; destructive ones (for example `gh pr merge`, `gh repo delete`) fall through to approval. See [GitHub Operations](#github-operations) for the full list.

### Protected Paths

Automatically excluded from tool access:

- `.git/` - Repository data
- `*.env` - Environment files
- `.infer/` - Configuration directory
- Custom paths via sandbox config

### Approval Workflow

Enable safety confirmations:

```bash
infer config set tools.safety.require_approval true
```

LLMs request approval before executing Write/Edit/Delete/Bash operations with real-time diff preview.

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

# Check whether a bash command is whitelisted (without running it)
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
