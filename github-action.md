---
title: GitHub Action
description: Run the Inference Gateway agent from GitHub Actions with infer-action. AI-driven issue triage, automated PRs, PR review, scheduled summaries, and release notes from CI.
---

# GitHub Action (`infer-action`)

[`inference-gateway/infer-action`](https://github.com/inference-gateway/infer-action) is the official GitHub Action wrapper for the [`infer` CLI](/cli/). It lets you run the Inference Gateway agent from a GitHub Actions workflow so that mentioning a trigger phrase in an issue or comment kicks off an automated, AI-driven response: plan posting, code edits, branch creation, and a pull request - all without leaving GitHub.

> **Current Version:** v0.10.1. Pin to a tagged release (`@v0.10.1`) rather than `@main` in production workflows.

## When to use it

Use `infer-action` when you want CI-driven inference instead of an interactive terminal session. Typical scenarios:

- **Issue triage and automated fixes** - mention `@infer` in an issue, the agent reads it, makes the change, and opens a PR.
- **Automated code review** - have the agent review pull requests on a schedule or on push.
- **Scheduled agents** - cron-driven release notes, changelog drafts, dependency upgrades, drift reports.
- **Advisory-only workflows** - run the agent in comment-only mode (`enable-git-operations: false`) to post suggestions without modifying the repo.

For local, interactive use the [CLI](/cli/) remains the right tool; `infer-action` is the headless, event-driven counterpart.

## Quick Start

Create `.github/workflows/infer.yml`:

```yaml
name: Infer Agent

on:
  issues:
    types: [opened, edited]
  issue_comment:
    types: [created]

permissions:
  issues: write
  contents: write
  pull-requests: write

jobs:
  infer:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6.0.2

      - uses: inference-gateway/infer-action@v0.10.1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          model: anthropic/claude-opus-4-8
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

Open an issue (or comment on one) containing `@infer` and the workflow takes over. The agent posts a "cooking" placeholder comment, runs, makes changes if needed, and finishes by either updating the comment with results or opening a pull request.

## How it works

1. **Trigger detection** - the action inspects `github.event.issue.title`, `github.event.issue.body`, or `github.event.comment.body` for the configured `trigger-phrase` (default `@infer`). Comments authored by bot users are ignored to prevent recursion.
2. **Reaction + cooking message** - on a hit, the action adds an `:eyes:` reaction to the trigger comment and posts a placeholder "I'm cooking..." comment. Stale cooking messages from earlier runs are cleaned up.
3. **CLI install** - downloads `infer` at the pinned `version` and runs `infer init --overwrite`.
4. **Git config** - sets `git user.name` / `user.email` to the `github-actions[bot]` identity so any commits the agent makes have a valid author.
5. **Agent run** - executes the agent with the selected `model` and provider API keys. The bash allow-list is augmented with `gh` and `git` unless `enable-git-operations: false`.
6. **PR creation** - when the agent produces file changes, it creates `fix/issue-{number}`, commits, pushes, and opens a PR titled `Fix #{number}: ...` with `Resolves #{number}` in the body.
7. **Result posting** - the final comment summarises completed work and the model used, links the PR if any, and appends a footer with token usage, per-session cost, and the agent's tool-call count and success rate (see [Result comment](#result-comment)).

### Dynamic model selection

Override the workflow's default model on a per-issue or per-comment basis by including `/model provider/model-name` in the trigger text:

```text
@infer /model deepseek/deepseek-v4-flash please analyze this bug and suggest a fix
```

The override is parsed by the action's trigger-detection step and exported as `INFER_AGENT_MODEL` for that run only.

### Result comment

When the run finishes, the action updates its comment with a result footer. Below the status, model, and job link, the footer reports:

- **Tokens** - prompt / completion / total token usage, plus the request count.
- **Cost** - per-session input / output / total cost, when the CLI reports pricing.
- **Tool calls** - the total number of tool calls the agent made, with the run's success rate. The rate is `succeeded / total` (where `succeeded = total - failed`), so a run with failures reads its failures in proportion. Any failed calls are listed in a collapsed section just below.

The **Tool calls** line is only rendered when the agent made at least one tool call:

```text
## ✅ Infer Result: Success

**Model:** `anthropic/claude-opus-4-8` · **Exit Code:** `0` · [View Job](...)

**Tokens:** 18,432 in · 2,106 out · 20,538 total (7 requests)

**Cost:** $0.04 in · $0.02 out · $0.06 total

**Tool calls:** 12 total · 83% success rate

<details><summary>⚠️ 2 failed tool call(s)</summary>
...
</details>
```

The total and failed tool-call counts are also exposed as the `total-tool-calls-count` and `failed-tool-calls-count` [outputs](#outputs) for use in downstream steps.

## Inputs

| Input                     | Required | Default   | Description                                                                                                                                                                                                                                                                                    |
| ------------------------- | -------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github-token`            | Yes      | -         | Token used for posting comments, creating branches, and opening PRs.                                                                                                                                                                                                                           |
| `model`                   | Yes      | -         | Model identifier in `provider/model-name` form (e.g. `anthropic/claude-opus-4-8`).                                                                                                                                                                                                             |
| `trigger-phrase`          | No       | `@infer`  | Phrase that activates the agent. Case-sensitive.                                                                                                                                                                                                                                               |
| `direct-prompt`           | No       | `''`      | Free-text task to run directly, bypassing issue/comment triggers. When set, the agent runs against this text under `workflow_dispatch` (or any event), commits to a new branch, and opens a PR; the result and PR link go to the job summary. See [Direct prompt](#direct-prompt-manual-runs). |
| `version`                 | No       | `v0.68.3` | `infer` CLI version to install inside the runner.                                                                                                                                                                                                                                              |
| `max-turns`               | No       | `50`      | Maximum agent iterations - acts as a runaway-cost guard.                                                                                                                                                                                                                                       |
| `custom-instructions`     | No       | `''`      | Extra instructions appended to the default system prompt (does **not** replace the defaults).                                                                                                                                                                                                  |
| `bash-whitelist-commands` | No       | `''`      | Comma-separated commands appended to the agent's bash allow-list (e.g. `npm,yarn,pnpm`).                                                                                                                                                                                                       |
| `bash-whitelist-patterns` | No       | `''`      | Comma-separated regex patterns appended to the agent's bash allow-list (e.g. `^npm .*,^yarn .*`).                                                                                                                                                                                              |
| `enable-git-operations`   | No       | `true`    | When `false`, the agent runs in comment-only mode - `git`/`gh` are not allow-listed and no PRs are created.                                                                                                                                                                                    |
| `mirror-agent-logs`       | No       | `true`    | When `true` (default), the agent's full stdout/stderr transcript (tool inputs, tool outputs, file contents it read, web-fetch payloads, intermediate text) is mirrored to the Actions run log. Set to `false` to suppress that transcript from the run log. See [Agent log mirroring](#agent-log-mirroring). |
| `dry-run`                 | No       | `false`   | Plan-only local-testing mode (e.g. with `act`): forces the bundled mock agent, simulates every GitHub mutation (`[dry-run] would ...`), and prints the resolved system/task/reminder prompts and tool allow-lists. Reads still run. See [Local testing with act](#local-testing-with-act).     |
| `mock-agent-scenario`     | No       | `happy`   | Which scenario the bundled mock agent runs under `dry-run`: `happy`, `failures`, `no-todos`, or `empty`.                                                                                                                                                                                       |
| `anthropic-api-key`       | No\*     | -         | Required when using an Anthropic model.                                                                                                                                                                                                                                                        |
| `openai-api-key`          | No\*     | -         | Required when using an OpenAI model.                                                                                                                                                                                                                                                           |
| `google-api-key`          | No\*     | -         | Required when using a Google/Gemini model.                                                                                                                                                                                                                                                     |
| `deepseek-api-key`        | No\*     | -         | Required when using a DeepSeek model.                                                                                                                                                                                                                                                          |
| `groq-api-key`            | No\*     | -         | Required when using a Groq model.                                                                                                                                                                                                                                                              |
| `mistral-api-key`         | No\*     | -         | Required when using a Mistral model.                                                                                                                                                                                                                                                           |
| `cloudflare-api-key`      | No\*     | -         | Required when using a Cloudflare Workers AI model.                                                                                                                                                                                                                                             |
| `cohere-api-key`          | No\*     | -         | Required when using a Cohere model.                                                                                                                                                                                                                                                            |
| `ollama-api-key`          | No\*     | -         | Required when using a self-hosted Ollama endpoint.                                                                                                                                                                                                                                             |
| `ollama-cloud-api-key`    | No\*     | -         | Required when using Ollama Cloud.                                                                                                                                                                                                                                                              |
| `moonshot-api-key`        | No\*     | -         | Required when using a Moonshot (Kimi) model.                                                                                                                                                                                                                                                   |

\* Provide the key matching the provider of the chosen `model`. Multiple keys can be supplied so the same workflow handles overrides to different providers.

## Outputs

| Output                    | Description                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `result`                  | Human-readable summary of the agent execution.                                                                          |
| `exit-code`               | Exit code returned by `infer` - non-zero means the agent failed.                                                        |
| `pr-url`                  | URL of the pull request the agent opened (empty if none). Populated for direct-prompt runs and any run that opens a PR. |
| `failed-tool-calls-count` | Number of failed tool calls detected in the agent output.                                                               |
| `total-tool-calls-count`  | Total number of tool calls the agent made during the run.                                                               |

Reference outputs in downstream steps via <code v-pre>${{ steps.&lt;id&gt;.outputs.result }}</code>.

## Direct prompt (manual runs)

Normally the action reads its task from the issue or comment that contains the trigger phrase. To run the agent against a free-text task with no issue or comment - for example from a manual `workflow_dispatch` form - pass the text through `direct-prompt`:

```yaml
name: Infer (manual)

on:
  workflow_dispatch:
    inputs:
      prompt:
        description: 'Task for the agent to work on'
        required: true
        type: string

permissions:
  contents: write
  pull-requests: write

jobs:
  infer:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6.0.2

      - uses: inference-gateway/infer-action@v0.10.1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          model: anthropic/claude-opus-4-8
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          direct-prompt: ${{ inputs.prompt }}
```

Trigger it from the **Actions** tab: pick the workflow, choose **Run workflow**, and type a task. No issue, comment, or trigger phrase is needed.

When `direct-prompt` is non-empty:

- The agent runs against that text instead of an issue or comment body, so no `issues`/`issue_comment` event is required - the action works under `workflow_dispatch` (or any event).
- There is no issue/PR thread to reply to, so the agent commits its work to a new branch and opens a pull request. The run's result and the PR link are written to the workflow **job summary**, and the PR URL is exposed as the `pr-url` [output](#outputs).
- All other inputs (`model`, `skills`, `max-turns`, `bash-whitelist-*`, provider keys, ...) compose as usual. A `/model` override embedded in the prompt text is honoured, just as in event-driven mode.
- With `enable-git-operations: false`, direct-prompt runs in advisory mode: the agent only writes its findings to the job summary, with no branch or PR.

Leave `direct-prompt` empty (the default) and event-driven behaviour is unchanged.

## Local testing with `act`

Set `dry-run: true` to exercise the whole workflow in a **plan-only** mode - ideal for trying a workflow locally with [`act`](https://github.com/nektos/act) before it runs for real. In dry-run the action:

- **Forces the bundled mock agent** - no real CLI install and no provider token, so it composes with any `model` without spending anything. (This replaces the former `use-mock-agent` input; use `dry-run: true` instead.)
- **Simulates every GitHub mutation.** Instead of creating or updating a comment, the `:eyes:` reaction, the "I'm cooking..." comment, comment zones, or the spinner, it logs a `[dry-run] would ...` line. Secret values are still redacted in the printed bodies.
- **Prints a DRY RUN banner** with the exact system / task / reminder prompts and the resolved bash allow-list and web-fetch domains the agent would receive.
- **Keeps GitHub reads real** so you see the actual target issue or PR. Reads fail soft when no token is available - a public-repo read still works unauthenticated; otherwise the run warns and continues.

`mock-agent-scenario` selects which scripted run the mock agent performs under dry-run: `happy` (the default - TodoWrite passes, a read, and a commit on a `fix/` branch), `failures` (the happy path with interspersed tool-call failures), `no-todos` (work without any TodoWrite calls), or `empty` (exit immediately with no tool calls).

The `infer-action` repo ships ready-to-run local workflows under [`examples/local/`](https://github.com/inference-gateway/infer-action/tree/main/examples/local) that run the working-tree action (`uses: ./`) in dry-run, driven through `act` by Taskfile helpers:

```bash
task test:issue     # issues event
task test:comment   # issue_comment event
task test:direct    # workflow_dispatch / direct-prompt mode
task test:all       # all three
```

No `.env`, token, or provider key is required - mutations are simulated and reads fail soft. Pass a token to resolve real reads:

```bash
task test:issue -- -s GITHUB_TOKEN=$(gh auth token)
```

## Recipes

### PR review on push

Run the agent against every push to a PR branch and have it leave review comments without modifying the code.

```yaml
name: AI PR Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  pull-requests: write
  contents: read

jobs:
  review:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6.0.2
        with:
          fetch-depth: 0

      - uses: inference-gateway/infer-action@v0.10.1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          model: anthropic/claude-opus-4-8
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          trigger-phrase: '@review'
          enable-git-operations: false
          custom-instructions: |
            - Focus on correctness, security, and performance.
            - Quote specific files and line numbers.
            - Do not modify code; post review feedback as a comment only.
```

Trigger by commenting `@review` on the PR.

### Scheduled summary / drift report

Run a daily agent that reads recent commits and posts a summary to a tracking issue.

```yaml
name: Daily Drift Summary

on:
  schedule:
    - cron: '0 7 * * *' # 07:00 UTC daily
  workflow_dispatch:

permissions:
  issues: write
  contents: read

jobs:
  summary:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6.0.2

      - uses: inference-gateway/infer-action@v0.10.1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          model: deepseek/deepseek-v4-flash
          deepseek-api-key: ${{ secrets.DEEPSEEK_API_KEY }}
          enable-git-operations: false
          max-turns: 20
          custom-instructions: |
            - Read the last 24 hours of commits on main.
            - Post a Markdown summary as a comment on issue #1 (the drift tracker).
            - Group changes by area (api, sdks, docs, infra).
```

Pair with a tracker issue containing the trigger phrase in its body so the schedule has something to fire against, or use `workflow_dispatch` to invoke the agent against a freshly created tracker issue.

### Agent-driven release notes

On every tag push, generate release notes by running the agent over the commits since the previous tag.

```yaml
name: Release Notes

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write
  issues: write

jobs:
  notes:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6.0.2
        with:
          fetch-depth: 0

      - uses: inference-gateway/infer-action@v0.10.1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          model: anthropic/claude-opus-4-8
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          bash-whitelist-commands: gh,git
          custom-instructions: |
            - Diff the current tag against the previous tag.
            - Categorise commits using Conventional Commits prefixes.
            - Publish the result via `gh release edit <tag> --notes-file ...`.
```

### Extending the bash allow-list

The default bash allow-list is intentionally narrow (read-only commands plus read-only `gh`; see [Default gh allowed-list](/cli/#default-gh-allowed-list)). Add what your project needs.

The action exposes inputs that append to the agent's allow-list:

```yaml
- uses: inference-gateway/infer-action@v0.10.1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    model: anthropic/claude-opus-4-8
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    bash-whitelist-commands: npm,yarn,pnpm,node,python3,pytest
    bash-whitelist-patterns: '^npm run .*,^yarn .*,^pytest .*'
```

The added entries are **appended** to the defaults - they do not replace them.

You can also append at the CLI layer with the `INFER_TOOLS_BASH_ALLOW_APPEND` environment variable (comma- or newline-separated), which merges onto the every-mode `mode.all` baseline. Handy for adding a couple of commands - for example letting a release agent commit and push without shipping the unrestricted `.*` sentinel:

```yaml
- uses: inference-gateway/infer-action@v0.10.1
  env:
    INFER_TOOLS_BASH_ALLOW_APPEND: 'git commit,git push'
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    model: anthropic/claude-opus-4-8
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Controlled-autonomy CI profile

A headless `infer agent` is [secure-by-default](/cli/#headless-secure-by-default): in CI there is no interactive approver, so any off-list or mutating action is **blocked** rather than auto-run. To let an unattended agent edit files and run a curated command set without prompting, combine a `block` approval behaviour with a relaxed write gate and a curated allow-list - set entirely through environment variables on the step:

```yaml
- uses: inference-gateway/infer-action@v0.10.1
  env:
    INFER_TOOLS_SAFETY_APPROVAL_BEHAVIOUR: block # reject anything that would otherwise prompt
    INFER_TOOLS_WRITE_REQUIRE_APPROVAL: 'false' # ...but let the agent write/edit files
    INFER_TOOLS_BASH_ALLOW_APPEND: 'git add,git commit,git push'
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    model: anthropic/claude-opus-4-8
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

This is the recommended shape for an autonomous CI agent: explicit about exactly what may run unattended, with everything else hard-blocked rather than silently auto-approved.

## Agent log mirroring

The `mirror-agent-logs` input controls whether the agent's full stdout/stderr transcript is mirrored to the GitHub Actions run log. When `true` (the default), every tool input, tool output, file content the agent reads, web-fetch payload, and intermediate text appears in the live log - useful for debugging and understanding what the agent did.

### Why suppress the log?

GitHub Actions run logs are persisted with the workflow run, downloadable as raw logs, and visible to everyone with **read** access to the repository. For public repositories that means the whole world. While `::add-mask::` redacts known secret values, it cannot catch everything - a private source file, customer data in a fetched page, or a secret printed by a tool could leak into the log. `mirror-agent-logs: false` is a hard off-switch for the entire transcript.

### What is still visible when logs are suppressed?

- **`/tmp/agent-output.txt`** - the full, unredacted transcript is still written to this file on the runner. It is **not** uploaded or persisted beyond the job.
- **Cooking-comment footer** - the result comment (status, model, token usage, cost, tool-call stats) is posted to the issue/PR as normal.
- **Step summary** - the job summary (`$GITHUB_STEP_SUMMARY`) renders in full.
- **Minimal heartbeat** - ticker updates and the final exit code still print, so the step is not completely silent.

### Example

```yaml
- uses: inference-gateway/infer-action@v0.10.1
  with:
    model: anthropic/claude-opus-4-8
    github-token: ${{ secrets.GITHUB_TOKEN }}
    mirror-agent-logs: false  # keep the full agent transcript out of the Actions run log
```

## Secrets and least-privilege

Three principles to follow:

1. **Never hardcode API keys.** Store them in GitHub Secrets and reference them via <code v-pre>${{ secrets.NAME }}</code>. The action only reads provider keys from `inputs`, which are injected as environment variables for the agent step.
2. **Grant the minimum workflow permissions for the mode you want.** For a PR-creating agent:

   ```yaml
   permissions:
     issues: write
     contents: write
     pull-requests: write
   ```

   For comment-only mode (`enable-git-operations: false`):

   ```yaml
   permissions:
     issues: write
     contents: read
   ```

3. **Prefer a GitHub App over the default `GITHUB_TOKEN` for cross-repo or higher-trust workflows.** The CLI's `/init-github-action` wizard automates the GitHub App setup (see the [CLI docs](/cli/#github-action-setup)). Using an App token lets PRs created by the agent trigger downstream CI - PRs opened with the default `GITHUB_TOKEN` do not, by GitHub design.

Additional hardening:

- Cap `max-turns` to prevent runaway loops and bound cost. `30-50` covers most issues.
- Set `enable-git-operations: false` whenever the agent only needs to read and comment.
- Keep the bash allow-list narrow - only add commands you trust the agent to invoke.
- Pin `inference-gateway/infer-action@<tag>` (not `@main`) so an upstream change cannot silently alter behaviour.

## CLI wizard integration

The CLI ships an interactive wizard, [`/init-github-action`](/cli/#github-action-setup), that automates everything in this page: creating a GitHub App, registering its credentials as secrets, and writing a workflow file under `.github/workflows/infer.yml`. Use the wizard for first-time setup; come back to this page when you need to customise inputs, write recipes by hand, or harden secrets handling beyond the defaults.

## Related

- [CLI](/cli/) - the `infer` binary that `infer-action` installs and drives.
- [Configuration](/configuration/) - environment variables understood by the gateway and CLI.
- [`infer-action` repository](https://github.com/inference-gateway/infer-action) - source, releases, and issue tracker.
