---
title: CLI Scheduling
description: Run Inference Gateway CLI jobs on a cron schedule - locally with the infer daemon, or in the cloud with the GitHub backend that materializes each job as a GitHub Actions scheduled workflow.
---

# Scheduling

The [`Schedule` tool](/cli/#schedule) lets the agent create jobs that fire on a cron schedule. Every fire runs a real agent session with the job's saved prompt.

Two backends run those jobs:

| Backend           | Where jobs run                         | Needs                                                 |
| ----------------- | -------------------------------------- | ----------------------------------------------------- |
| `local` (default) | `infer daemon` on your machine         | A long-running daemon process                         |
| `github`          | GitHub Actions in a repository you own | `gh auth login` plus a GitHub App and Actions secrets |

Both backends keep the local job list authoritative for the CLI, so `list` / `get` / `update` / `delete` behave the same either way.

## Local backend

Jobs are persisted through the configured storage backend and executed by `infer daemon`, which diffs its cron entries against storage every 2 seconds - created, updated, and deleted jobs are picked up within about 2 seconds without a restart.

```bash
infer daemon
# Scheduler started jobs=0
```

Each fire gets a brand-new session ID (nothing carries between fires) and persists a `RunRecord`. Jobs created from a [channel](/cli-channels/) session deliver their output back to that chat; jobs created anywhere else are record-only and read from storage.

Cron is the standard 5-field crontab format, plus the `@every` / `@daily` / `@hourly` descriptors:

| Expression     | Meaning                   |
| -------------- | ------------------------- |
| `0 8 * * *`    | Every day at 08:00        |
| `*/15 * * * *` | Every 15 minutes          |
| `0 9 * * 1-5`  | Weekdays at 09:00         |
| `@every 1h`    | Every hour                |
| `@daily`       | Equivalent to `0 0 * * *` |

## GitHub backend

Set `scheduler.backend: github` to run schedules on GitHub Actions instead of a local daemon - cloud scheduling with no user-owned infrastructure. Each job is materialized as one scheduled workflow (`.github/workflows/<job-id>.yml`) in a repository you configure, and the workflow runs the job's prompt via [`inference-gateway/infer-action`](https://github.com/inference-gateway/infer-action) under your infer GitHub App's bot identity.

```yaml
# .infer/config.yaml
scheduler:
  backend: github
  github:
    repository: '' # '' => <your login>/.routines, created private on first save
    pull_requests: false # true => deploy via PR instead of pushing to the default branch
    artifacts:
      enabled: true
      poll_interval: 10m
      initial_delay: 1m
      max_attempts: 3 # download attempts per artifact, then skipped
      rate_limit_backoff: 1h # pause after a rate-limited GitHub API call
```

### Setup

1. **Authenticate `gh`.** All GitHub access goes through the `gh` CLI, so run `gh auth login` once.
2. **Create a GitHub App** for the bot identity the workflows run as (see [GitHub Action Setup](/cli/#github-action-setup) for the same App flow used by `infer-action`).
3. **Add the repository Actions secrets** listed below. The CLI never writes secrets.
4. **Create a job** as usual - the first save creates the repository if it does not exist yet.

### Required repository secrets

Set these on the routines repository under Settings -> Secrets and variables -> Actions:

- `APP_CLIENT_ID` and `APP_PRIVATE_KEY` - your infer GitHub App's client ID and private key. The workflow mints an installation token with `actions/create-github-app-token` and runs `infer-action` as the App bot. For `run_once` self-disabling, the App needs the **Actions (read & write)** repository permission.
- The provider API key secret(s) your jobs use: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `CLOUDFLARE_API_KEY`, `COHERE_API_KEY`, `OLLAMA_CLOUD_API_KEY`, `MOONSHOT_API_KEY`, `MINIMAX_API_KEY`, `NVIDIA_API_KEY`, `ZAI_API_KEY`. Only the ones for the models your jobs reference are needed.

### Save-to-deploy flow

Creating, updating, or deleting a job clones the repository, writes (or removes) that job's workflow file, and pushes the commit to the default branch. Saving is deploying.

- **Pull-request mode.** With `pull_requests: true` the change lands on a branch and a PR is opened instead. Merging deploys, and the PR is your review step and audit trail.
- **Repo auto-creation.** If the configured repository does not exist it is created private, defaulting to `.routines` under the authenticated user.
- **No phantom jobs.** A failed GitHub sync aborts the save entirely.

### Cron translation and limits

GitHub Actions cron is UTC-only, 5-field, with a minimum interval of 5 minutes. Descriptors are translated at save time:

| Written      | Deployed as    | Result                                     |
| ------------ | -------------- | ------------------------------------------ |
| `@daily`     | `0 0 * * *`    | Accepted                                   |
| `@every 10m` | `*/10 * * * *` | Accepted                                   |
| `@every 7m`  | -              | Rejected - not expressible as a cron field |
| `* * * * *`  | -              | Rejected - below the 5-minute minimum      |

Rejections surface as a clear error when the job is saved, not silently at fire time. All times are UTC.

### One-off jobs

A `run_once` job renders a final step that disables the workflow after its first fire. The workflow file stays in the repository in a disabled state rather than being deleted (the local backend deletes the job instead).

### Conversation artifact pull-back

The workflow uploads the run's conversation `*.jsonl` files as an Actions artifact named `infer-conversations-<run_id>`. While `infer daemon` is running, an artifact poller downloads new artifacts into local conversation storage:

- First poll after `initial_delay` (default `1m`), then every `poll_interval` (default `10m`).
- Each artifact gets up to `max_attempts` download attempts (default `3`), after which it is skipped.
- A rate-limited GitHub API call pauses polling for `rate_limit_backoff` (default `1h`).
- **jsonl storage backend only.** Pull-back is skipped on other storage backends.

Set `artifacts.enabled: false` to turn the poller off.

### Out of scope in the first cut

- Channel delivery of GitHub-backed job output.
- Syncing GitHub runs into local `RunRecord`s.

## Configuration reference

| Config key                                      | Env var                                               | Default             | Description                                                              |
| ----------------------------------------------- | ----------------------------------------------------- | ------------------- | ------------------------------------------------------------------------ |
| `scheduler.backend`                             | `INFER_SCHEDULER_BACKEND`                             | `local`             | Scheduling backend: `local` or `github`                                  |
| `scheduler.github.repository`                   | `INFER_SCHEDULER_GITHUB_REPOSITORY`                   | `<login>/.routines` | Repository holding the generated workflows                               |
| `scheduler.github.pull_requests`                | `INFER_SCHEDULER_GITHUB_PULL_REQUESTS`                | `false`             | Deploy changes via pull request instead of pushing to the default branch |
| `scheduler.github.artifacts.enabled`            | `INFER_SCHEDULER_GITHUB_ARTIFACTS_ENABLED`            | `true`              | Pull conversation artifacts from GitHub runs into local storage          |
| `scheduler.github.artifacts.poll_interval`      | `INFER_SCHEDULER_GITHUB_ARTIFACTS_POLL_INTERVAL`      | `10m`               | Artifact poll interval                                                   |
| `scheduler.github.artifacts.initial_delay`      | `INFER_SCHEDULER_GITHUB_ARTIFACTS_INITIAL_DELAY`      | `1m`                | Delay before the first poll                                              |
| `scheduler.github.artifacts.max_attempts`       | `INFER_SCHEDULER_GITHUB_ARTIFACTS_MAX_ATTEMPTS`       | `3`                 | Download attempts per artifact before it is skipped                      |
| `scheduler.github.artifacts.rate_limit_backoff` | `INFER_SCHEDULER_GITHUB_ARTIFACTS_RATE_LIMIT_BACKOFF` | `1h`                | Polling pause after a rate-limited GitHub API call                       |

The `Schedule` tool itself is gated separately under `tools.schedule.*` - see [Tool Configuration](/cli/#tool-configuration).

## Troubleshooting

**Jobs are not firing (local backend).** Confirm `infer daemon` is running and logged `Scheduler started`, then inspect the job's `last_error` after the expected fire time.

**Jobs are not firing (github backend).** Check the Actions tab of the routines repository. GitHub disables scheduled workflows in repositories with no activity for 60 days, and scheduled runs can be delayed under load.

**Saving a job errors on the cron expression.** The expression is not expressible as UTC 5-field cron at a 5-minute-or-longer interval. Rewrite it, for example `@every 7m` as `*/10 * * * *`.

**Conversations are not showing up locally.** Artifact pull-back requires `infer daemon` running, `artifacts.enabled: true`, and the jsonl storage backend.
