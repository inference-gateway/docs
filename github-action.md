---
title: GitHub Action
description: Run the Inference Gateway agent from GitHub Actions with infer-action. AI-driven issue triage, automated PRs, PR review, scheduled summaries, and release notes from CI.
---

# GitHub Action (`infer-action`)

[`inference-gateway/infer-action`](https://github.com/inference-gateway/infer-action) is the official GitHub Action wrapper for the [`infer` CLI](/cli/). It lets you run the Inference Gateway agent from a GitHub Actions workflow so that mentioning a trigger phrase in an issue or comment kicks off an automated, AI-driven response: plan posting, code edits, branch creation, and a pull request - all without leaving GitHub.

> **Current Version:** v0.4.0. Pin to a tagged release (`@v0.4.0`) rather than `@main` in production workflows.

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

      - uses: inference-gateway/infer-action@v0.4.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          model: anthropic/claude-sonnet-4
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

Open an issue (or comment on one) containing `@infer` and the workflow takes over. The agent posts a "cooking" placeholder comment, runs, makes changes if needed, and finishes by either updating the comment with results or opening a pull request.

## How it works

1. **Trigger detection** - the action inspects `github.event.issue.title`, `github.event.issue.body`, or `github.event.comment.body` for the configured `trigger-phrase` (default `@infer`). Comments authored by bot users are ignored to prevent recursion.
2. **Reaction + cooking message** - on a hit, the action adds an `:eyes:` reaction to the trigger comment and posts a placeholder "I'm cooking..." comment. Stale cooking messages from earlier runs are cleaned up.
3. **CLI install** - downloads `infer` at the pinned `version` and runs `infer init --overwrite`.
4. **Git config** - sets `git user.name` / `user.email` to the `github-actions[bot]` identity so any commits the agent makes have a valid author.
5. **Agent run** - executes the agent with the selected `model` and provider API keys. The bash whitelist is augmented with `gh` and `git` unless `enable-git-operations: false`.
6. **PR creation** - when the agent produces file changes, it creates `fix/issue-{number}`, commits, pushes, and opens a PR titled `Fix #{number}: ...` with `Resolves #{number}` in the body.
7. **Result posting** - the final comment summarises completed work, the model used, and links the PR if any.

### Dynamic model selection

Override the workflow's default model on a per-issue or per-comment basis by including `/model provider/model-name` in the trigger text:

```text
@infer /model openai/gpt-4 please analyze this bug and suggest a fix
```

The override is parsed by the action's trigger-detection step and exported as `INFER_AGENT_MODEL` for that run only.

## Inputs

| Input                     | Required | Default   | Description                                                                                                |
| ------------------------- | -------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| `github-token`            | Yes      | -         | Token used for posting comments, creating branches, and opening PRs.                                       |
| `model`                   | Yes      | -         | Model identifier in `provider/model-name` form (e.g. `anthropic/claude-sonnet-4`).                         |
| `trigger-phrase`          | No       | `@infer`  | Phrase that activates the agent. Case-sensitive.                                                           |
| `version`                 | No       | `v0.68.3` | `infer` CLI version to install inside the runner.                                                          |
| `max-turns`               | No       | `50`      | Maximum agent iterations - acts as a runaway-cost guard.                                                   |
| `custom-instructions`     | No       | `''`      | Extra instructions appended to the default system prompt (does **not** replace the defaults).              |
| `bash-whitelist-commands` | No       | `''`      | Comma-separated commands added to the bash whitelist (e.g. `npm,yarn,pnpm`).                               |
| `bash-whitelist-patterns` | No       | `''`      | Comma-separated regex patterns added to the bash whitelist (e.g. `^npm .*,^yarn .*`).                      |
| `enable-git-operations`   | No       | `true`    | When `false`, the agent runs in comment-only mode - `git`/`gh` are not whitelisted and no PRs are created. |
| `anthropic-api-key`       | No\*     | -         | Required when using an Anthropic model.                                                                    |
| `openai-api-key`          | No\*     | -         | Required when using an OpenAI model.                                                                       |
| `google-api-key`          | No\*     | -         | Required when using a Google/Gemini model.                                                                 |
| `deepseek-api-key`        | No\*     | -         | Required when using a DeepSeek model.                                                                      |
| `groq-api-key`            | No\*     | -         | Required when using a Groq model.                                                                          |
| `mistral-api-key`         | No\*     | -         | Required when using a Mistral model.                                                                       |
| `cloudflare-api-key`      | No\*     | -         | Required when using a Cloudflare Workers AI model.                                                         |
| `cohere-api-key`          | No\*     | -         | Required when using a Cohere model.                                                                        |
| `ollama-api-key`          | No\*     | -         | Required when using a self-hosted Ollama endpoint.                                                         |
| `ollama-cloud-api-key`    | No\*     | -         | Required when using Ollama Cloud.                                                                          |

\* Provide the key matching the provider of the chosen `model`. Multiple keys can be supplied so the same workflow handles overrides to different providers.

## Outputs

| Output      | Description                                                      |
| ----------- | ---------------------------------------------------------------- |
| `result`    | Human-readable summary of the agent execution.                   |
| `exit-code` | Exit code returned by `infer` - non-zero means the agent failed. |

Reference outputs in downstream steps via <code v-pre>${{ steps.&lt;id&gt;.outputs.result }}</code>.

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

      - uses: inference-gateway/infer-action@v0.4.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          model: anthropic/claude-sonnet-4
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

      - uses: inference-gateway/infer-action@v0.4.0
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

      - uses: inference-gateway/infer-action@v0.4.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          model: anthropic/claude-sonnet-4
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          bash-whitelist-commands: gh,git
          custom-instructions: |
            - Diff the current tag against the previous tag.
            - Categorise commits using Conventional Commits prefixes.
            - Publish the result via `gh release edit <tag> --notes-file ...`.
```

### Whitelisting build tooling

The default bash whitelist is intentionally narrow. Add what your project needs:

```yaml
- uses: inference-gateway/infer-action@v0.4.0
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    model: anthropic/claude-sonnet-4
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    bash-whitelist-commands: npm,yarn,pnpm,node,python3,pytest
    bash-whitelist-patterns: '^npm run .*,^yarn .*,^pytest .*'
```

The whitelisted entries are **added** to the defaults - they do not replace them.

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
- Whitelist bash commands narrowly - only add tools you trust the agent to invoke.
- Pin `inference-gateway/infer-action@<tag>` (not `@main`) so an upstream change cannot silently alter behaviour.

## CLI wizard integration

The CLI ships an interactive wizard, [`/init-github-action`](/cli/#github-action-setup), that automates everything in this page: creating a GitHub App, registering its credentials as secrets, and writing a workflow file under `.github/workflows/infer.yml`. Use the wizard for first-time setup; come back to this page when you need to customise inputs, write recipes by hand, or harden secrets handling beyond the defaults.

## Related

- [CLI](/cli/) - the `infer` binary that `infer-action` installs and drives.
- [Configuration](/configuration/) - environment variables understood by the gateway and CLI.
- [`infer-action` repository](https://github.com/inference-gateway/infer-action) - source, releases, and issue tracker.
