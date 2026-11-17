---
title: Command Hooks
description: Configure user-defined shell commands that run at agent-loop hook points with .infer/hooks.yaml - the schema (enabled, hooks[].name/hook/command/timeout), the full hook-point catalog, the per-mode bash allow-list authorization model (off-list commands are skipped, never run), the INFER_HOOKS_ENABLED and INFER_TOOLS_BASH_ALLOW_APPEND overrides, and a post_session CI post-processing example.
---

# Command Hooks

**Command Hooks** let the [Inference Gateway CLI](/cli/) (`infer`) run your own shell commands at fixed points in the agent loop - before a session starts, around each model stream, around each tool call, and after a session ends. They are the **executable sibling** of [system reminders](/cli/#configuration): where reminders inject text into the conversation, hooks run a command on disk and report what happened back.

Hooks live in a dedicated [`hooks.yaml`](#schema) file, are **feature-flagged off by default**, and every command is gated through the existing [per-mode bash allow-list](/cli/#command-allow-listing) - there is no new bypass of the secure-by-default model. An off-list command is **skipped and reported, never run**.

## Where hooks live

`hooks.yaml` is loaded from the same two scopes as the rest of the CLI configuration, with project config taking precedence over user config:

| Scope       | Path                  | Notes                                                       |
| ----------- | --------------------- | ----------------------------------------------------------- |
| Project     | `.infer/hooks.yaml`   | Checked into the repo. Shared with everyone on the project. |
| User-global | `~/.infer/hooks.yaml` | Personal defaults applied across every project.             |

`infer init` generates a project `.infer/hooks.yaml` pre-populated with the defaults and the hook points commented in, so the file is a ready-to-edit starting point.

## Quick start

```bash
# Generate .infer/hooks.yaml (alongside config.yaml, mcp.yaml, prompts.yaml, ...)
infer init
```

The generated file is disabled by default. Flip the master switch and add a hook:

```yaml
# .infer/hooks.yaml
enabled: true
hooks:
  - name: gofmt
    hook: post_session
    command: 'gofmt -w .'
    timeout: 30 # seconds; 0 -> default 30
```

The next `infer headless "..."` (or chat session) runs `gofmt -w .` once the agent finishes generating, subject to the [authorization model](#authorization-the-allow-list) below.

## Schema

`hooks.yaml` is a small YAML document with a master switch and a list of hook entries:

```yaml
enabled: false # master switch - default false
hooks:
  - name: <string> # required - short identifier, reported in stream events
    hook: <hook-point> # required - one of the hook points below
    command: <string> # required - the shell command to run
    timeout: <int> # optional - per-hook timeout in seconds; 0 -> default 30
```

| Field             | Type    | Required | Description                                                                                                      |
| ----------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `enabled`         | boolean | no       | Master switch for the whole file. Defaults to `false`. Overridable with [`INFER_HOOKS_ENABLED`](#master-switch). |
| `hooks[].name`    | string  | yes      | Short identifier for the hook. Reported back in the `hook_command` stream event.                                 |
| `hooks[].hook`    | string  | yes      | The [hook point](#hook-points) to run at - for example `post_session`.                                           |
| `hooks[].command` | string  | yes      | The shell command to execute. Treated as a single command string and matched against the allow-list.             |
| `hooks[].timeout` | integer | no       | Per-hook timeout in seconds. `0` (or omitted) falls back to the default of `30`.                                 |

> A hook with no `hooks` list, or `enabled: false`, is a no-op - nothing runs and nothing is reported. Removing a hook entry disables just that hook.

## Hook points

`hook` is one of the pre-defined points in the agent loop. They fire in order within a single turn, with the stream/tool points repeating per turn:

| Hook point         | When it fires                                                         | Typical use                                                    |
| ------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| `pre_session`      | Once, before the first model request of the session.                  | Set up state, seed scratch files, start a watcher.             |
| `pre_stream`       | Before each model stream (each LLM request).                          | Snapshot context, record turn counter.                         |
| `post_stream`      | After each model stream completes.                                    | Log the turn, capture the raw assistant text.                  |
| `pre_tool`         | Before each tool call is executed.                                    | Audit/log tool invocations, take a pre-state snapshot.         |
| `post_tool`        | After each tool call returns.                                         | Validate the tool's effect, run a quick check.                 |
| `pre_queue_drain`  | Before the background/async result queue is drained into the context. | Prepare to fold background results back in.                    |
| `post_queue_drain` | After the queue has been drained.                                     | React to freshly-injected background results.                  |
| `post_session`     | Once, after the agent has finished generating for the session.        | **Deterministic post-processing**: format, lint, test, notify. |

`post_session` ("agent finished generating") is the **primary** hook point and the one most hooks should target. It is the natural place for deterministic, always-run post-processing - run a formatter, run the test suite, push a notification - because it fires exactly once, after the agent is done editing, in every run mode (interactive chat, headless [`infer headless`](/cli/#headless-agent-stream-output), [channels](/cli-channels/), and [scheduled](/cli/#schedule) runs).

## Authorization: the allow-list

A hook command is **not** a free pass. Each `command` is matched against the active [agent mode](/cli/#agent-modes)'s **per-mode bash allow-list** (`tools.bash.mode.<mode>.allow`) - the exact same gate the [Bash](/cli/#bash) tool uses. Matching is **default-deny** and full-command:

- **On-list** - the command matches an entry (or the `.*` sentinel of [Auto-Accept](/cli/#auto-accept-mode) mode) and runs.
- **Off-list** - the command does not match. It is **skipped and reported**, never run. The run does not abort. The hook is simply not executed, and a `hook_command_skipped` event with a skip reason is emitted.
- **Clean-command guard** - the same [clean-command guard](/cli/#clean-command-guard) applies: no command substitution, no top-level pipes/chains, no file-write redirects, no dangerous `find` actions, no env-var leaks from printing commands. The only thing that lifts the guard is the `.*` sentinel.

This keeps the secure-by-default model intact: hooks cannot do anything the agent itself could not do with the Bash tool in the same mode. There is no hooks-specific bypass.

### Allowing a command to run unattended (CI)

In a headless [`infer headless`](/cli/#headless-agent-stream-output) run there is no interactive approver, so a hook command must be on the allow-list to execute - otherwise it is skipped. Add the command to the allow-list in config, or use the [append-only override](/cli/#append-only-override-ci) to graft a few commands onto the `mode.all` baseline without editing config:

```bash
# Append onto the every-mode baseline (comma- or newline-separated; the env var wins over the flag)
export INFER_TOOLS_BASH_ALLOW_APPEND="gofmt.*"

# Flag form
infer headless "Refactor the handlers package" --tools-bash-allow-append "gofmt.*"
```

With `INFER_TOOLS_BASH_ALLOW_APPEND="gofmt.*"`, the `gofmt -w .` command in the [quick-start](#quick-start) example matches the appended pattern and runs at `post_session` in any mode - including the standard mode a headless `infer headless` uses.

For a fully controlled CI profile (write files and run a vetted set, block everything else), see [Headless secure-by-default](/cli/#headless-secure-by-default) - the same `approval_behaviour: block` + curated `mode.all.allow` recipe works for hooks, since they share the allow-list.

## Master switch

The `enabled` field in `hooks.yaml` is the file-level master switch. It is overridable with an environment variable, which is handy for CI where you want hooks on for one job and off for another without editing the committed file:

```bash
# Force hooks on for this run regardless of hooks.yaml
export INFER_HOOKS_ENABLED=true

# Or scope it to a single invocation
INFER_HOOKS_ENABLED=true infer headless "Tidy the repo"
```

`INFER_HOOKS_ENABLED` takes precedence over the `enabled` field in `hooks.yaml`. There is no per-hook env override - disable an individual hook by removing or commenting its entry.

## Observability: the `hook_command` stream event

v1 is **fire-and-observe**. Each hook execution emits a single `hook_command` stream event on the [`infer headless` JSONL stream](/cli/#headless-agent-stream-output), so consumers (the [`infer-action` GitHub Action](/github-action/), log scrapers, channel managers) can report what ran without parsing command output. Hook output is **not** fed back into the conversation - the agent never sees it, so a hook cannot accidentally steer the model.

```json
{
  "type": "hook_command",
  "name": "gofmt",
  "hook": "post_session",
  "command": "gofmt -w .",
  "turn": 1,
  "exit_code": 0,
  "duration_ms": 412,
  "output": "...truncated stdout/stderr...",
  "error": ""
}
```

| Field         | Type   | Description                                                            |
| ------------- | ------ | ---------------------------------------------------------------------- |
| `type`        | string | Always `hook_command` for this event.                                  |
| `name`        | string | The hook's `name`.                                                     |
| `hook`        | string | The hook point it ran at.                                              |
| `command`     | string | The command that ran.                                                  |
| `turn`        | number | The agent turn the hook fired on.                                      |
| `exit_code`   | number | Process exit code. `-1` when the command could not start or timed out. |
| `duration_ms` | number | Wall-clock duration in milliseconds.                                   |
| `output`      | string | Combined stdout/stderr of the command, truncated at 4096 bytes.        |
| `error`       | string | The execution error, empty on success.                                 |

The command receives a small JSON context on stdin - `{"hook":"post_session","session_id":"...","turn":1}` - so a hook can tell which session and turn fired it.

An off-list command does not run and emits a `hook_command_skipped` event instead, carrying `name`, `hook`, `command`, `mode`, `reason` (`not_allowlisted`) and the allow-list `hint`:

```json
{
  "type": "hook_command_skipped",
  "name": "gofmt",
  "hook": "post_session",
  "command": "gofmt -w .",
  "mode": "standard",
  "reason": "not_allowlisted",
  "hint": "..."
}
```

**Behavior notes:**

- The event is **additive** - it does not replace any existing stream output, and consumers should **ignore unknown `type` values** to stay forward-compatible (see [Session stats summary line](/cli/#session-stats-summary-line)).
- A hook that **times out** is killed at its `timeout`. Its `hook_command` event reports `exit_code: -1`, the error, and the partial output captured so far.
- A skipped hook (off-list) emits `hook_command_skipped` with a reason, so CI logs show that a configured hook did **not** run and why.

## Example: `post_session` CI post-processing

The canonical use case is deterministic post-processing after an unattended agent run. Put the hook in the committed `.infer/hooks.yaml`, then allow the commands through the append override in your CI job:

```yaml
# .infer/hooks.yaml - committed to the repo
enabled: true
hooks:
  - name: gofmt
    hook: post_session
    command: 'gofmt -w .'
    timeout: 30

  - name: go-test
    hook: post_session
    command: 'go test ./...'
    timeout: 120

  - name: notify
    hook: post_session
    command: 'curl -s -X POST $WEBHOOK_URL -d "session done"'
    timeout: 10
```

```yaml
# .github/workflows/infer.yml (excerpt)
- name: Run infer headless
  env:
    INFER_TOOLS_BASH_ALLOW_APPEND: 'gofmt.*,go test.*,curl.*'
    INFER_HOOKS_ENABLED: 'true'
  run: infer headless "Refactor the handlers package and verify the build"
```

When the agent finishes, the three `post_session` hooks fire in listed order - format, test, notify - each gated by the appended allow-list entries. A command that fails the allow-list (or the clean-command guard) is skipped and reported in a `hook_command_skipped` event, so the run completes but the CI log shows which post-processing steps did not execute.

> Because hook output is **not** fed back into the conversation, a failing `go test` hook does not make the agent retry it. Use the hook for reporting/observability. If you want the agent to react to a failure, let it run the test itself via the Bash tool during the session.

## Runnable example

The CLI repository ships [`examples/hooks`](https://github.com/inference-gateway/cli/tree/main/examples/hooks), which runs offline against a scripted mock model with no API key or gateway. Its `.infer/hooks.yaml` holds one `post_session` hook whose command is `tee hook-runs.log`, so the JSON context the hook receives on stdin lands in the log:

| Task                 | What happens                                                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `task hook`          | Runs with `INFER_TOOLS_BASH_ALLOW_APPEND='tee hook-runs.log'` - the hook fires, a `hook_command` event is emitted, and `hook-runs.log` gains the payload |
| `task hook:skipped`  | Runs the same session without the allow-list entry - a `hook_command_skipped` event reports `not_allowlisted` and nothing is written                     |
| `task reminder`      | `.infer/reminders.yaml` with `merge: true` - one custom reminder fires next to the built-ins                                                             |
| `task reminder:swap` | `--reminders-file swap-reminders.yaml` replaces the whole reminder set                                                                                   |

The reminder tasks clear `INFER_REMINDERS_CONFIG` inline because that env var outranks both `--reminders-file` and `.infer/reminders.yaml` - see [reminders precedence](/cli/#configuration-sources-and-precedence) and the [reminders runnable example](/cli/#runnable-example).

## Security notes

- **Secure by default.** `enabled: false` is the shipped default, and every command passes the same [allow-list](/cli/#command-allow-listing) and [clean-command guard](/cli/#clean-command-guard) as an interactive Bash call. Hooks add no new escape hatch.
- **No conversation feedback.** Hook output is reported only as a stream event - it is never injected into the model context, so a hook cannot change the agent's behavior or leak content into the prompt.
- **Read the same path protections.** Hook commands run under the same [file sandbox](/cli/#file-sandbox) as any other shell command (`.git/`, `*.env` stay denied and `.infer/` still asks).
- **Curate your allow-list.** In CI, only append commands you would be happy for the agent to run unattended - the append override applies to the agent's Bash tool too, not just hooks.

## See also

- [CLI](/cli/) - the Bash tool, per-mode allow-lists, and headless `infer headless` stream
- [Channels](/cli-channels/) - running hooks from channel-driven sessions
- [GitHub Action](/github-action/) - consuming `hook_command` events in CI
- [Configuration](/configuration/) - gateway-server configuration reference
