---
title: Judge Mode
description: Let an LLM judge answer tool-approval gates in the Inference Gateway CLI - the auto-with-judge agent mode, tools.safety.approval_behaviour judge, the .infer/judge.yaml schema (model, gateway_url, timeout, max_tokens, on_error, system_prompt, prompt) with INFER_JUDGE_* overrides, the JSON verdict contract, on_error semantics, the RequestApproval escalation for overriding a rejection, judge_verdict observability, and headless usage.
---

# Judge Mode

**Judge mode** (displayed as **Auto+Judge**) is an autonomous [agent mode](/cli/#agent-modes) of the [Inference Gateway CLI](/cli/) (`infer`): there is no human in the loop, but tool calls that would normally prompt you are decided by an **LLM judge** instead of bypassing approval the way [Auto-Accept](/cli/#auto-accept-mode) does. One judge call answers one pending tool call; everything else about the agent loop is unchanged.

It exists for unattended runs where a human approval prompt would deadlock (CI, [headless agents](/cli/#headless-agent-stream-output), [heartbeat](/cli-scheduling/) jobs) but you still want a gate on mutating or dangerous actions.

> Shipped in [inference-gateway/cli#1148](https://github.com/inference-gateway/cli/pull/1148). Disabled by default - Standard, Plan, and Auto-Accept behave exactly as before.

## Why use it

- CI and headless agents: the default headless behavior **blocks** any action that needs approval when no approver is reachable (see [Headless secure-by-default](/cli/#headless-secure-by-default)). Judge mode turns that dead end into a decision.
- A middle ground between Auto-Accept (no gate at all) and Standard (a human on every gate).
- Auditable autonomy: every verdict is published as an event, including the judge's reason for a rejection and the model that produced it.

## How to enter judge mode

### Chat TUI

Press **Shift+Tab** to cycle the agent mode until the status line reads **Auto+Judge**:

```text
Standard -> Plan Mode -> Auto-Accept -> Auto+Judge -> Standard -> ...
```

The mode indicator carries the judge model, so you can always see who is deciding: `AUTO+JUDGE - <model>`.

### Headless

```bash
infer headless --mode auto-with-judge "fix issue #42"
INFER_AGENT_MODE=auto-with-judge infer headless "fix issue #42"
```

The canonical mode key is `auto-with-judge` - accepted by `--mode`, by `INFER_AGENT_MODE`, and by the browser extension bridge (whose mode frame uses the same keys: `standard`, `plan`, `auto`, `auto-with-judge`). The headless runner validates the mode at start: if the judge is selected and no model can be resolved, startup fails fast with an explanation instead of failing later on the first gated call.

## What the judge decides

The standard approval policy still decides _which_ calls are gated - judge mode changes only _who answers the gate_:

- Bash commands on the active [allowed-list](/cli/#command-allow-listing) pass for free (judge mode uses the `standard` list, same as Standard mode). They never reach the judge.
- Anything else that would prompt a human - off-list commands, Write/Edit/Delete, per-tool `require_approval` - gets exactly one judge call.
- The judge prompt carries the first non-hidden user message of the session (the root intent), the latest non-hidden user message (the current intent), and the pending tool call (name plus arguments).
- An approved call executes. A **rejection does not end the turn**: it becomes a failed tool result whose content reads `rejected by judge: <model>: <reason>`, and the agent continues with that reason in context, so the model can adjust its approach rather than retry the same call. Only a **human** rejection ends the turn.
- The rejection result also **hints at the escalation path** - the judge is advisory, not a hard block, so the agent can ask you to override it with [`RequestApproval`](#escalating-a-rejection-requestapproval).

## Escalating a rejection (RequestApproval)

When the judge rejects a call you actually asked for, the agent can escalate that one call to you with the [`RequestApproval`](/cli/#requestapproval) tool instead of giving up or working around it.

- **When it applies**: only for a call the judge already rejected in this session. Escalating anything else fails with "no judge rejection is pending" - the agent must make the call and let the judge decide first.
- **What you see**: the regular approval box for the rejected call, with a context block above it - the judge's rejection reason, what the agent needs permission for, and why.
- **Approve** runs that exact call **once** with the judge bypassed; the bypass is consumed by that single invocation, and a later judge rejection of the same call can be escalated again.
- **Reject**, or dismissing the box, denies. The denial is a normal tool result, so the turn **continues** with the decision in context - and you can explain yourself in your next message.
- **One attempt per rejected call**: the escalation is consumed as soon as it is asked, including on dismissal, so a stubborn model cannot re-prompt you in a loop. A second attempt returns "already escalated once".

### No approver reachable

Headless runs, CI, [scheduled](/cli-scheduling/) jobs and any channel without an interactive approval form (the browser extension bridge and Telegram included) degrade the same way [`AskUserQuestion`](/cli/#askuserquestion) does: the tool returns a distinguishable **"no approver reachable"** result rather than blocking. Nothing hangs, the turn continues, and the agent is told not to retry - it either proceeds without the rejected call or ends the turn for a human to pick up.

## The verdict contract

The judge must answer with exactly one JSON object:

```json
{ "decision": "approved", "reason": "installing the dependency the user asked for" }
```

The parser strips code fences and surrounding prose, requires `decision` to be `approved` or `rejected`, and treats anything else as a failed judge call - see [`on_error`](#on-error-semantics).

## Configuring the judge (judge.yaml)

The judge has its own file, **`judge.yaml`** - the decision-sibling of [`hooks.yaml`](/cli-hooks/) and [`reminders.yaml`](/cli/#system-reminders), one file per concern. Project config wins over user config, and when the file is absent the built-in defaults are used:

| Scope   | Path                  |
| ------- | --------------------- |
| Project | `.infer/judge.yaml`   |
| User    | `~/.infer/judge.yaml` |

```yaml
model: '' # "provider/model" id for judge calls; empty falls back to agent.model
gateway_url: '' # send judge calls to another gateway; empty shares the agent's
timeout: 30 # per-call timeout in seconds
max_tokens: 2048 # response budget; reasoning models spend their thinking against it too
on_error: deny # what a failed judge call means: deny (default) or allow
system_prompt: |- # judge instructions, sent as the system message
  You are the approver for an autonomous coding agent. ...
prompt: |- # user-message template; {root_intent}, {intent} and {action} are filled in
  <root_request>
  {root_intent}
  </root_request>

  <latest_request>
  {intent}
  </latest_request>

  <tool_call>
  {action}
  </tool_call>
```

| Field           | Default | Purpose                                                                                                                                                                                                                  |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `model`         | `''`    | `provider/model` reference for judge calls; empty falls back to `agent.model` (same precedent as conversation title generation).                                                                                         |
| `gateway_url`   | `''`    | Send judge calls to a different gateway than the agent's - for example a real judge while the driver runs against a mock. Empty shares the agent's gateway.                                                              |
| `timeout`       | `30`    | Per-call timeout in seconds.                                                                                                                                                                                             |
| `max_tokens`    | `2048`  | Response budget per judge call; reasoning models spend their thinking against it.                                                                                                                                        |
| `on_error`      | `deny`  | What a failed judge call means - `deny` (fail closed) or `allow`.                                                                                                                                                        |
| `system_prompt` | builtin | The judge's instructions, sent as the system message so the user text and tool arguments stay data rather than instructions.                                                                                             |
| `prompt`        | builtin | User-message template. `{root_intent}` is the first non-hidden user message of the session, `{intent}` the latest one (a bare "continue" is judged next to the root it continues), and `{action}` the pending tool call. |

Environment overrides (env wins over the file):

`INFER_JUDGE_MODEL`, `INFER_JUDGE_GATEWAY_URL`, `INFER_JUDGE_TIMEOUT`, `INFER_JUDGE_MAX_TOKENS`, `INFER_JUDGE_ON_ERROR`, `INFER_JUDGE_SYSTEM_PROMPT`, `INFER_JUDGE_PROMPT`.

### `on_error` semantics

A judge call can fail (timeout, gateway error, unparseable output) or return garbage:

- `on_error: deny` (default) rejects the call with a distinguishable `judge unavailable: ...` reason - the same fail-closed default as the no-approver block path.
- `on_error: allow` approves instead. Choose it only when the judge is a convenience and availability matters more than the gate.

### Model resolution

`judge.model` falls back to `agent.model`. `tools.safety.approval_behaviour: judge` is the only setting that makes **config validation** require a resolvable judge model - selecting it with neither set is a configuration error caught at startup. The `auto-with-judge` mode is validated separately, by the headless runner at start (`--mode` or `INFER_AGENT_MODE`).

## Judge as the approval behavior, without the mode

You can route gated calls to the judge in **any** mode with `tools.safety.approval_behaviour: judge` (env: `INFER_TOOLS_SAFETY_APPROVAL_BEHAVIOUR`):

```bash
infer config set tools.safety.approval_behaviour judge
```

This is useful when you want a judge gate in Standard mode or under the [channel manager](/cli-channels/): the judge is always reachable (headless and CI included), so unlike `ipc` it is never downgraded to `block`. Mode selection and behavior selection compose - the `auto-with-judge` mode forces the judge regardless of `approval_behaviour`. See [Approval Workflow](/cli/#approval-workflow) for the other behaviors.

## Observability

The judge model is visible everywhere a verdict surfaces:

| Surface          | What you get                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--format json`  | A `judge_verdict` event per decision: tool, decision, reason, turn, and `model`.                                                                                       |
| `--format ag-ui` | The same verdict mirrored as a custom event.                                                                                                                           |
| `--format text`  | A line per rejection.                                                                                                                                                  |
| Chat TUI         | Status-line flash `Action rejected by judge policy (<model>): <reason>`, the judge model next to the `AUTO+JUDGE` indicator, and the model in each rejected tool card. |
| Debug logging    | Every judge call also emits a `judge_request` debug event (model, system prompt, rendered user prompt) alongside `judge_verdict`.                                      |

Judge token usage is added to the session totals and [telemetry](/cli/#telemetry) under the **judge model**, so [`/stats`](/cli/#telemetry-shortcuts) shows the judge on its own row whenever it runs on a different model than the agent.

## Related

- [CLI - Agent Modes](/cli/#agent-modes)
- [CLI - Approval Workflow](/cli/#approval-workflow)
- [Command Hooks](/cli-hooks/)
- [Scheduling](/cli-scheduling/)
