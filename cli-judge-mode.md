---
title: Judge Mode
description: Let an LLM or a decision model answer tool-approval gates in the Inference Gateway CLI - the auto-with-judge agent mode, safety.approval_behaviour judge in ~/.infer/tools.yaml, the .infer/judge.yaml schema (backend, model, min_confidence, gateway_url, timeout, max_tokens, on_error, system_prompt, prompt) with INFER_JUDGE_* overrides, the JSON verdict contract, the decisions backend over POST /v1/decisions with DECISIONS_ENABLED, on_error semantics, the RequestApproval escalation for overriding a rejection, judge_verdict observability, and headless usage.
---

# Judge Mode

**Judge mode** (displayed as **Auto+Judge**) is an autonomous [agent mode](/cli/#agent-modes) of the [Inference Gateway CLI](/cli/) (`infer`): there is no human in the loop, but tool calls that would normally prompt you are decided by a **model judge** - a generative model, or a [decision model](#decision-model-judge-backend-decisions) - instead of bypassing approval the way [Auto-Accept](/cli/#auto-accept-mode) does. One judge call answers one pending tool call; everything else about the agent loop is unchanged.

It exists for unattended runs where a human approval prompt would deadlock (CI, [headless agents](/cli/#headless-agent-stream-output), [heartbeat](/cli-scheduling/) jobs) but you still want a gate on mutating or dangerous actions.

> Disabled by default - Standard, Plan, and Auto-Accept behave exactly as before.

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

A **daemon session**'s worker relays the escalation to the chat attached to it, so a `RequestApproval` raised by a teleported or background session reaches the terminal or [web terminal](/cli/#web-terminal) tab you have open on it rather than going unanswered.

### Taking the screen over answers a Computer approval

When the rejected call is a [`Computer`](/cli/#computer-use-tools) action on a screen you are watching in the [web terminal](/cli/#web-terminal)'s Screen view, there is a third answer besides Approve and Reject: press **Take over** and do that step yourself.

- The take-over **resolves the open approval box as rejected**, because the agent no longer needs to perform the action.
- The agent is held while you hold the screen, and **Done** queues one continue message, so its next turn starts from a fresh screenshot of what you left behind.
- Your clicks and keystrokes during the take-over go through no approval gate, no judge call and no conversation entry - which is what makes it the right answer for a login, a two-factor code or a CAPTCHA the judge keeps rejecting.

See [take-over mode](/cli/#take-over-mode).

### No approver reachable

Headless runs, CI, [scheduled](/cli-scheduling/) jobs and any channel without an interactive approval form (the browser extension bridge and Telegram included) degrade the same way [`AskUserQuestion`](/cli/#askuserquestion) does: the tool returns a distinguishable **"no approver reachable"** result rather than blocking. Nothing hangs, the turn continues, and the agent is told not to retry - it either proceeds without the rejected call or ends the turn for a human to pick up.

## The verdict contract

This is the contract for the default `llm` backend. The [`decisions` backend](#decision-model-judge-backend-decisions) thresholds a probability instead and parses no prose.

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
backend: llm # who decides: llm (default) or decisions (a decision model)
model: '' # "provider/model" id for judge calls; empty falls back to agent.model
min_confidence: 0.7 # decisions backend only: approve when p(approve) >= this
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

| Field            | Default | Purpose                                                                                                                                                                                                                  |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `backend`        | `llm`   | Who answers the gate - `llm` (a generative model returning the JSON verdict above) or [`decisions`](#decision-model-judge-backend-decisions) (a decision model returning a probability).                                 |
| `model`          | `''`    | `provider/model` reference for judge calls; empty falls back to `agent.model` (same precedent as conversation title generation).                                                                                         |
| `min_confidence` | `0.7`   | `decisions` backend only: a call is approved when its `p(approve)` reaches this threshold, and rejected below it. Ignored by the `llm` backend.                                                                          |
| `gateway_url`    | `''`    | Send judge calls to a different gateway than the agent's - for example a real judge while the driver runs against a mock. Empty shares the agent's gateway.                                                              |
| `timeout`        | `30`    | Per-call timeout in seconds.                                                                                                                                                                                             |
| `max_tokens`     | `2048`  | Response budget per judge call; reasoning models spend their thinking against it.                                                                                                                                        |
| `on_error`       | `deny`  | What a failed judge call means - `deny` (fail closed) or `allow`.                                                                                                                                                        |
| `system_prompt`  | builtin | The judge's instructions, sent as the system message so the user text and tool arguments stay data rather than instructions.                                                                                             |
| `prompt`         | builtin | User-message template. `{root_intent}` is the first non-hidden user message of the session, `{intent}` the latest one (a bare "continue" is judged next to the root it continues), and `{action}` the pending tool call. |

Environment overrides (env wins over the file):

`INFER_JUDGE_BACKEND`, `INFER_JUDGE_MODEL`, `INFER_JUDGE_MIN_CONFIDENCE`, `INFER_JUDGE_GATEWAY_URL`, `INFER_JUDGE_TIMEOUT`, `INFER_JUDGE_MAX_TOKENS`, `INFER_JUDGE_ON_ERROR`, `INFER_JUDGE_SYSTEM_PROMPT`, `INFER_JUDGE_PROMPT`.

### `on_error` semantics

A judge call can fail (timeout, gateway error, unparseable output) or return garbage:

- `on_error: deny` (default) rejects the call with a distinguishable `judge unavailable: ...` reason - the same fail-closed default as the no-approver block path.
- `on_error: allow` approves instead. Choose it only when the judge is a convenience and availability matters more than the gate.

### Model resolution

`judge.model` falls back to `agent.model`. `safety.approval_behaviour: judge` in `tools.yaml` is the only setting that makes **config validation** require a resolvable judge model - selecting it with neither set is a configuration error caught at startup. The `auto-with-judge` mode is validated separately, by the headless runner at start (`--mode` or `INFER_AGENT_MODE`).

## Decision-model judge (backend: decisions)

A generative judge writes a verdict you parse. A **decision model** returns a probability you threshold. `backend: decisions` points the judge at the gateway's [Decisions API](/api-reference/#decisions-api) (`POST /v1/decisions`) instead of chat completions, so the CLI never speaks a vendor's decision format and holds no vendor credential - the `provider/model` prefix picks the upstream exactly as it does for chat.

```yaml
# .infer/judge.yaml
backend: decisions
model: ollama_cloud/clef:27b # or ollama/clef for a local pull, or openai/gpt-6-luna
min_confidence: 0.7 # approve only when p(approve) >= this
on_error: deny
```

What it asks, over the same evidence the LLM judge sees (your `prompt` rendered with the root intent, the latest intent and the pending tool call):

- a `predicate` for the pending call: does it serve the root and latest request, and is it safe to run unattended?
- a `choice` named `risk` over `benign`, `destructive`, `network`, `secrets` and `out_of_scope`, each with its own criterion.

Threshold semantics are **fail-closed**: a call is approved only when its probability reaches `min_confidence`, and anything below it is rejected. A missing or unusable answer is a failed judge call and follows [`on_error`](#on-error-semantics), which defaults to `deny`.

The reason the agent sees carries the numbers, so it has something to adjust on and the [`RequestApproval`](#escalating-a-rejection-requestapproval) escalation keeps working:

```text
rejected by judge: ollama/clef: rejected by the judge (decisions: p_approve=0.31, risk: destructive, below min_confidence 0.70)
```

An approved call records `decisions: p_approve=0.93, risk: benign`. `judge_verdict` events, usage accounting and the `AUTO+JUDGE` indicator are unchanged. `system_prompt` and `max_tokens` do not apply - decision models run no tools and generate no text.

### Gateway requirement

- The gateway must run with [`DECISIONS_ENABLED=true`](/configuration/) - while it is disabled `/v1/decisions` returns `404` and the judge fails closed. The CLI-managed local gateway sets it for you whenever `backend: decisions` is configured; an externally managed gateway needs the variable in its own environment.
- The judge model must list `decisions` among its [output modalities](/api-reference/#list-all-models). The gateway checks the modality before relaying and answers `400` otherwise.

Decision models read criteria literally and are weak at indirection, counting and adversarial content, so keep the evidence small and expect "does `git push` serve a bare `continue`" to be the hard case.

### Running it offline

The CLI's `examples/working-offline` compose runs the judge entirely on your machine: the gateway starts with `DECISIONS_ENABLED=true` and the `cli` service already sets `INFER_JUDGE_BACKEND=decisions` and `INFER_JUDGE_MODEL=ollama/clef`.

```bash
ollama pull clef     # the decision model, next to your local chat model
docker compose up -d
docker compose run --rm cli chat
```

Cycle the agent mode to **Auto+Judge** and off-list commands, writes and deletes are decided by the local `clef`. Ollama also serves `nimble`, `tev1` and `clef-flash` as decision models.

With network access, `INFER_JUDGE_MODEL=ollama_cloud/clef:27b` uses the hosted variant instead (`OLLAMA_CLOUD_API_KEY` in the example's `.env`).

## Judge as the approval behavior, without the mode

You can route gated calls to the judge in **any** mode with `safety.approval_behaviour: judge` in the userspace tools policy, `~/.infer/tools.yaml` (env: `INFER_TOOLS_SAFETY_APPROVAL_BEHAVIOUR`). `safety` sits at the top of that file, next to the other keys for every tool, and `infer config set tools.*` is rejected - see [Tool Configuration](/cli/#tool-configuration):

```yaml
# ~/.infer/tools.yaml
safety:
  approval_behaviour: judge
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

- [API Reference - Decisions API](/api-reference/#decisions-api)
- [CLI - Agent Modes](/cli/#agent-modes)
- [CLI - Approval Workflow](/cli/#approval-workflow)
- [Command Hooks](/cli-hooks/)
- [Scheduling](/cli-scheduling/)
