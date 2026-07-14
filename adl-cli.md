---
title: ADL CLI
description: Scaffold enterprise-ready A2A agents from Agent Definition Language (ADL) YAML files. Multi-language code generation, dependency injection, CI/CD pipelines, and cloud deployment.
---

# ADL CLI

The ADL CLI is a command-line tool for generating enterprise-ready [A2A (Agent-to-Agent)](/a2a/) servers from [Agent Definition Language (ADL)](/adl/) YAML files. It eliminates boilerplate code and ensures consistent patterns across your agent implementations, letting you focus on business logic.

> For the canonical ADL spec, schema reference, and authoring guide, see [adl.inference-gateway.com](https://adl.inference-gateway.com). This page is the CLI-specific reference.
>
> **Note:** ADL CLI is in early development. Breaking changes may occur until a stable version is reached.

## Key Features

- **Multi-Language Code Generation** - Generate complete projects in Go or Rust (TypeScript planned)
- **Interactive Wizard** - Guided project initialization with `adl init`
- **Service Injection** - Type-safe dependency injection with interfaces and factory functions
- **Configuration Management** - Automatic environment variable mapping with structured config sections
- **CI/CD Generation** - GitHub Actions workflows with semantic-release CD pipelines
- **Cloud Deployment** - Kubernetes manifests, Google Cloud Run, Vercel, and Cloudflare Workers deployment
- **Sandbox Environments** - Flox and DevContainer support for isolated development
- **Smart Ignore Files** - Protect custom implementations with `.adl-ignore`
- **Post-Generation Hooks** - Run custom commands after code generation
- **Multi-Provider AI** - OpenAI, Anthropic, DeepSeek, Ollama, Ollama Cloud, Google AI, Mistral, Groq, Cohere, Cloudflare, MiniMax, Moonshot, and Nvidia
- **Artifacts Support** - Filesystem and MinIO object storage for artifact management

## Installation

### npm / npx (Recommended)

Most developers already have Node.js - run adl without a prior install:

```bash
npx @inference-gateway/adl-cli init my-agent
npx @inference-gateway/adl-cli generate --file agent.yaml --output ./agent
npx @inference-gateway/adl-cli validate agent.yaml
```

Or install it globally:

```bash
npm install -g @inference-gateway/adl-cli
adl --help
```

Prebuilt binaries cover Linux and macOS on x64/arm64.

### Install Script

```bash
curl -fsSL https://raw.githubusercontent.com/inference-gateway/adl-cli/main/install.sh | bash
```

Install a specific version:

```bash
curl -fsSL https://raw.githubusercontent.com/inference-gateway/adl-cli/main/install.sh | bash -s -- --version v1.0.0
```

Custom install directory:

```bash
INSTALL_DIR=~/bin curl -fsSL https://raw.githubusercontent.com/inference-gateway/adl-cli/main/install.sh | bash
```

### Go Install

```bash
go install github.com/inference-gateway/adl-cli@latest
```

### From Source

```bash
git clone https://github.com/inference-gateway/adl-cli.git
cd adl-cli
go install .
```

### Nix Flake

Run the latest version without installing:

```bash
nix run github:inference-gateway/adl-cli
```

Pin a specific version, install into your profile, or enter a development shell:

```bash
nix run github:inference-gateway/adl-cli/v0.41.3
nix profile install github:inference-gateway/adl-cli/v0.41.3
nix develop github:inference-gateway/adl-cli
```

### Flox

Pin `adl` to a specific version inside a [Flox](https://flox.dev) environment by adding it to your `.flox/env/manifest.toml`:

```toml
[install]
adl.flake = "github:inference-gateway/adl-cli/v0.41.3"
```

Then activate the environment:

```bash
flox activate
```

### Pre-built Binaries

Download pre-built binaries from the [GitHub releases page](https://github.com/inference-gateway/adl-cli/releases).

## Quick Start

### 1. Initialize a New Project

```bash
adl init my-weather-agent
```

This launches an interactive wizard that creates an ADL manifest file (`agent.yaml`).

### 2. Review the Generated YAML

```yaml
apiVersion: adl.inference-gateway.com/v1
kind: Agent
metadata:
  name: my-weather-agent
  description: 'Provides weather information'
  version: '0.1.0'
spec:
  capabilities:
    streaming: true
    pushNotifications: false
    stateTransitionHistory: false
  agent:
    provider: deepseek
    model: deepseek-v4-flash
    systemPrompt: 'You are a helpful weather assistant.'
    maxTokens: 4096
    temperature: 0.7
  tools:
    - id: get_weather
      name: get_weather
      description: 'Get current weather for a city'
      tags:
        - weather
      schema:
        type: object
        properties:
          city:
            type: string
            description: 'City name'
        required:
          - city
  server:
    port: 8080
    debug: false
  language:
    go:
      module: 'github.com/example/my-weather-agent'
      version: '1.26.2'
```

### 3. Validate the ADL File

```bash
adl validate agent.yaml
```

### 4. Generate the Project

```bash
adl generate --file agent.yaml --output ./my-weather-agent
```

### 5. Build and Run

```bash
cd my-weather-agent
task build
task run
```

Your A2A agent is now running and discoverable at `http://localhost:8080/.well-known/agent-card.json`.

## Commands

### adl init [project-name]

Creates an ADL manifest file interactively or with flags.

```bash
# Interactive wizard
adl init my-agent

# Use defaults for all prompts
adl init my-agent --defaults

# Non-interactive with specific configuration
adl init my-agent \
  --name "Weather Agent" \
  --description "Provides weather information" \
  --provider deepseek \
  --model deepseek-v4-flash \
  --language go \
  --flox
```

#### Flags

**Project Settings:**

| Flag            | Description                        |
| --------------- | ---------------------------------- |
| `--defaults`    | Use default values for all prompts |
| `--path`        | Project directory path             |
| `--name`        | Agent name                         |
| `--description` | Agent description                  |
| `--version`     | Agent version                      |

**Agent Configuration:**

| Flag              | Description                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--type`          | Agent type: `ai-powered` or `minimal`                                                                                                                          |
| `--provider`      | AI provider: `openai`, `anthropic`, `deepseek`, `ollama`, `google`, `mistral`, `groq`, `cohere`, `cloudflare`, `moonshot`, `ollama_cloud`, `nvidia`, `minimax` |
| `--model`         | AI model name                                                                                                                                                  |
| `--system-prompt` | System prompt for the agent                                                                                                                                    |
| `--max-tokens`    | Maximum tokens (integer)                                                                                                                                       |
| `--temperature`   | Temperature (0.0-2.0)                                                                                                                                          |

**Capabilities:**

| Flag              | Description                     |
| ----------------- | ------------------------------- |
| `--streaming`     | Enable streaming responses      |
| `--notifications` | Enable push notifications       |
| `--history`       | Enable state transition history |

**Server:**

| Flag      | Description           |
| --------- | --------------------- |
| `--port`  | Server port (integer) |
| `--debug` | Enable debug mode     |

**Language Options:**

| Flag                  | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `--language`          | Programming language: `go`, `rust` (TypeScript planned) |
| `--go-module`         | Go module path (e.g., `github.com/user/project`)        |
| `--go-version`        | Go version (e.g., `1.26.2`)                             |
| `--rust-package-name` | Rust package name                                       |
| `--rust-version`      | Rust version (e.g., `1.94`)                             |
| `--rust-edition`      | Rust edition (e.g., `2024`)                             |
| `--typescript-name`   | TypeScript package name                                 |

**Environment:**

| Flag             | Description                                               |
| ---------------- | --------------------------------------------------------- |
| `--flox`         | Set `spec.development.sandbox.flox.enabled: true`         |
| `--devcontainer` | Set `spec.development.sandbox.devcontainer.enabled: true` |

**Pipelines & AI assistants** (declarative - written into the manifest as `false` by default):

| Flag   | Manifest field written                                       | Effect on `adl generate`                                 |
| ------ | ------------------------------------------------------------ | -------------------------------------------------------- |
| `--ai` | `spec.development.ai.orchestrators.claudecode.enabled: true` | Generates `CLAUDE.md` + `.github/workflows/claude.yml`   |
| `--ci` | `spec.scm.ci: true`                                          | Generates `.github/workflows/ci.yml`                     |
| `--cd` | `spec.scm.cd: true`                                          | Generates `.github/workflows/cd.yml` + `.releaserc.yaml` |

To enable additional AI assistants (Codex, Gemini, OpenCode, Infer), edit `agent.yaml` after init - see [AI Assistants](#ai-assistants).

### adl generate

Generates project code from an ADL file.

```bash
# Basic generation
adl generate --file agent.yaml --output ./my-agent

# Overwrite existing files (respects .adl-ignore)
adl generate --file agent.yaml --output ./my-agent --overwrite

# Generate with CI workflow
adl generate --file agent.yaml --output ./my-agent --ci

# Generate with CD pipeline
adl generate --file agent.yaml --output ./my-agent --cd

# Generate with CloudRun deployment
adl generate --file agent.yaml --output ./my-agent --deployment cloudrun

# Generate with Kubernetes deployment
adl generate --file agent.yaml --output ./my-agent --deployment kubernetes

# Generate with Vercel deployment
adl generate --file agent.yaml --output ./my-agent --deployment vercel

# Generate with Cloudflare Workers deployment (TypeScript only)
adl generate --file agent.yaml --output ./my-agent --deployment cloudflare

# Full-featured generation
adl generate --file agent.yaml --output ./my-agent --ci --cd --deployment cloudrun
```

#### Flags

| Flag               | Description                                                              | Default      |
| ------------------ | ------------------------------------------------------------------------ | ------------ |
| `--file`, `-f`     | ADL file to generate from                                                | `agent.yaml` |
| `--output`, `-o`   | Output directory for generated code                                      | `.`          |
| `--template`, `-t` | Template to use                                                          | `minimal`    |
| `--overwrite`      | Overwrite existing files (respects `.adl-ignore`)                        | `false`      |
| `--ci`             | Generate CI workflow (GitHub Actions). Overrides `spec.scm.ci`.          | `false`      |
| `--cd`             | Generate CD pipeline with semantic-release. Overrides `spec.scm.cd`.     | `false`      |
| `--deployment`     | Deployment platform: `kubernetes`, `cloudrun`, `vercel`, or `cloudflare` | -            |

> **Manifest-driven equivalents.** `--ci` and `--cd` mirror `spec.scm.ci` and `spec.scm.cd`. The CLI flag is OR-merged on top of the manifest value - passing the flag wins; omitting it falls back to whatever the manifest declares. There is no `--ai` flag on `generate`; AI-assistant generation is entirely manifest-driven via the per-agent toggles under `spec.development.ai.orchestrators.*` (see [AI Assistants](#ai-assistants)).

**CI Generation** automatically detects the SCM provider from `spec.scm.provider` and creates language-specific workflows with caching, testing, and linting.

**CD Generation** adds semantic-release automation with conventional commits, container publishing to GitHub Container Registry, changelog generation, and deployment integration.

### adl validate [adl-file]

Validates an ADL file against the schema.

```bash
# Validate a specific file
adl validate agent.yaml

# Validate default file
adl validate
```

Returns validation errors if the file structure or required fields are invalid.

## ADL Schema Reference

> **Reflects ADL `schema/v1` (JSON Schema Draft-07) as of [`v0.14.0`](https://github.com/inference-gateway/adl/releases/tag/v0.14.0).** The field definitions below are an in-page convenience copy. The single source of truth is [`schema/v1/schema.json`](https://github.com/inference-gateway/adl/blob/main/schema/v1/schema.json) in `inference-gateway/adl` (rendered at [adl.inference-gateway.com](https://adl.inference-gateway.com)) - if anything here disagrees with the canonical schema, the canonical schema wins.

### Overview

ADL (Agent Definition Language) files are YAML documents that define your agent's configuration, capabilities, skills, and infrastructure. Every ADL file starts with:

```yaml
apiVersion: adl.inference-gateway.com/v1
kind: Agent
```

### Complete Example

```yaml
apiVersion: adl.inference-gateway.com/v1
kind: Agent
metadata:
  name: advanced-agent
  description: 'Enterprise agent with full feature set'
  version: '1.0.0'
spec:
  capabilities:
    streaming: true
    pushNotifications: true
    stateTransitionHistory: true
  card:
    protocolVersion: '0.3.0'
    preferredTransport: 'JSONRPC'
    defaultInputModes:
      - text
      - voice
    defaultOutputModes:
      - text
      - audio
    url: 'https://my-agent.example.com:8443'
    documentationUrl: 'https://github.com/company/my-agent/docs'
    iconUrl: 'https://github.com/company/my-agent/icon.png'
  agent:
    provider: deepseek
    model: deepseek-v4-flash
    systemPrompt: |
      You are a helpful assistant with enterprise capabilities.
      Always prioritize security and compliance.
    maxTokens: 8192
    temperature: 0.3
  config:
    tools:
      read:
        enabled: true
        max_lines: 2000
    database:
      connectionString: 'postgresql://user:pass@localhost:5432/db'
      maxConnections: '10'
      timeout: '30s'
    notifications:
      slackWebhook: 'https://hooks.slack.com/services/...'
      emailApiKey: 'your-email-api-key'
      retryAttempts: '3'
  services:
    database:
      type: service
      interface: DatabaseService
      factory: NewDatabaseService
      description: PostgreSQL database service for persistent storage
    notifications:
      type: service
      interface: NotificationService
      factory: NewNotificationService
      description: Multi-channel notification service
  tools:
    - id: read
    - id: query_database
      name: query_database
      description: 'Execute database queries with validation'
      tags:
        - database
        - query
        - data
      inject:
        - logger
        - database
      schema:
        type: object
        properties:
          query:
            type: string
            description: 'SQL query to execute'
          table:
            type: string
            description: 'Target table name'
          limit:
            type: integer
            description: 'Result limit'
            maximum: 1000
        required:
          - query
          - table
    - id: send_notification
      name: send_notification
      description: 'Send multi-channel notifications'
      tags:
        - notification
        - communication
      inject:
        - logger
        - notifications
      schema:
        type: object
        properties:
          recipient:
            type: string
            description: 'Recipient identifier'
          message:
            type: string
            description: 'Message content'
          priority:
            type: string
            enum:
              - low
              - medium
              - high
              - critical
          channel:
            type: string
            enum:
              - email
              - slack
              - teams
              - webhook
        required:
          - recipient
          - message
          - priority
          - channel
  skills:
    - id: incident-response
      bare: true
      name: incident-response
      description: 'How to triage a paged production incident, draft an initial response with the available tools, and notify stakeholders.'
      license: Apache-2.0
      tags:
        - operations
        - incident
        - on-call
  server:
    port: 8443
    scheme: https
    debug: false
    auth:
      enabled: true
  language:
    go:
      module: 'github.com/company/advanced-agent'
      version: '1.26.2'
  acronyms:
    - api
    - json
    - xml
  scm:
    provider: github
    url: 'https://github.com/company/advanced-agent'
    github_app: true
    issue_templates: true
    dependabot: true
    ci: true
    cd: true
  development:
    sandbox:
      flox:
        enabled: true
      devcontainer:
        enabled: false
    ai:
      orchestrators:
        claudecode:
          enabled: true
        codex:
          enabled: false
        gemini:
          enabled: false
        opencode:
          enabled: false
        infer:
          enabled: false
  deployment:
    type: cloudrun
    cloudrun:
      image:
        registry: gcr.io
        repository: advanced-agent
        tag: latest
        useCloudBuild: true
      resources:
        cpu: '2'
        memory: 1Gi
      scaling:
        minInstances: 1
        maxInstances: 100
        concurrency: 1000
      service:
        timeout: 3600
        allowUnauthenticated: false
        serviceAccount: agent@PROJECT_ID.iam.gserviceaccount.com
        executionEnvironment: gen2
      environment:
        LOG_LEVEL: info
        ENVIRONMENT: production
  hooks:
    post:
      - 'go mod tidy'
      - 'go generate ./...'
```

### Metadata

Top-level identification for your agent.

| Field         | Type   | Description                                                |
| ------------- | ------ | ---------------------------------------------------------- |
| `name`        | string | Agent name (used for project directory and package naming) |
| `description` | string | Human-readable description of the agent                    |
| `version`     | string | Semantic version (e.g., `"1.0.0"`)                         |

### Capabilities

Defines what the agent supports at the protocol level.

| Field                    | Type    | Default | Description                           |
| ------------------------ | ------- | ------- | ------------------------------------- |
| `streaming`              | boolean | `false` | Enable streaming responses            |
| `pushNotifications`      | boolean | `false` | Enable push notification support      |
| `stateTransitionHistory` | boolean | `false` | Enable task state transition tracking |

### Card

Optional A2A agent card configuration that controls how your agent is discovered and described.

| Field                | Type     | Description                                        |
| -------------------- | -------- | -------------------------------------------------- |
| `protocolVersion`    | string   | A2A protocol version (e.g., `"0.3.0"`)             |
| `preferredTransport` | string   | Transport protocol (e.g., `"JSONRPC"`)             |
| `defaultInputModes`  | string[] | Supported input modes (e.g., `["text", "voice"]`)  |
| `defaultOutputModes` | string[] | Supported output modes (e.g., `["text", "audio"]`) |
| `url`                | string   | Public URL where the agent is accessible           |
| `documentationUrl`   | string   | URL to agent documentation                         |
| `iconUrl`            | string   | URL to agent icon                                  |

### Agent Configuration

AI provider and model settings.

| Field          | Type    | Description                                                                                                                                                    |
| -------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`     | string  | AI provider: `openai`, `anthropic`, `deepseek`, `ollama`, `google`, `mistral`, `groq`, `cohere`, `cloudflare`, `moonshot`, `ollama_cloud`, `nvidia`, `minimax` |
| `model`        | string  | Model name (e.g., `deepseek-v4-flash`, `claude-opus-4-8`, `deepseek-v4-pro`)                                                                                   |
| `systemPrompt` | string  | System prompt for the AI model                                                                                                                                 |
| `maxTokens`    | integer | Maximum tokens for responses                                                                                                                                   |
| `temperature`  | float   | Sampling temperature (0.0-2.0)                                                                                                                                 |

### Tools

`spec.tools[]` defines function-call entrypoints the agent can invoke. Each user-defined tool is generated as code in the target language, with a JSON Schema describing its inputs. The agent decides at runtime when to invoke each tool based on its `description` and the conversation context.

```yaml
tools:
  - id: query_database
    name: query_database
    description: 'Execute database queries with validation'
    tags:
      - database
      - query
    inject:
      - logger
      - database
    schema:
      type: object
      properties:
        query:
          type: string
          description: 'SQL query to execute'
      required:
        - query
```

| Field         | Type     | Required (user-defined) | Description                                                               |
| ------------- | -------- | ----------------------- | ------------------------------------------------------------------------- |
| `id`          | string   | Yes                     | Unique tool identifier. Pattern: `^[a-zA-Z_][a-zA-Z0-9_]*$` (no hyphens). |
| `name`        | string   | Yes                     | Function name exposed to the LLM                                          |
| `description` | string   | Yes                     | What the tool does and when to use it (the LLM reads this to decide)      |
| `tags`        | string[] | Yes                     | Categorisation tags                                                       |
| `schema`      | object   | Yes                     | JSON Schema describing the tool's input parameters                        |
| `inject`      | string[] | No                      | Services / config subsections to inject (see [Services](#services))       |

> **User-defined vs reserved built-ins.** User-defined tools require `name`, `description`, `tags`, and `schema`. Reserved built-in tools (`read`, `write`, `edit`, `bash`, `fetch`) are referenced by **id only** - the generator supplies everything else. See [Built-in Tools](#built-in-tools).

### Skills

`spec.skills[]` defines **markdown playbooks** - separate from tools. Each entry is written to `skills/<id>/SKILL.md` in the generated project (matching [Anthropic's agent-skills convention](https://github.com/anthropics/skills)), advertised on the agent card so orchestrators can discover them, and prepended to the system prompt at runtime so the agent knows when and how to apply the playbook.

Skills are either **pulled from the skills registry** (when you omit `bare`) or **scaffolded locally** with `bare: true` so you can write the playbook yourself.

```yaml
skills:
  - id: incident-response
    bare: true
    name: incident-response
    description: 'How to triage a paged production incident, draft an initial response, and notify stakeholders.'
    license: Apache-2.0
    tags:
      - operations
      - incident
```

| Field         | Type     | Required | Description                                                                         |
| ------------- | -------- | -------- | ----------------------------------------------------------------------------------- |
| `id`          | string   | Yes      | Unique skill identifier. Pattern: `^[a-zA-Z0-9_][a-zA-Z0-9_-]*$` (hyphens allowed). |
| `name`        | string   | No       | Skill name - written to `SKILL.md` frontmatter                                      |
| `description` | string   | No       | When the agent should reach for this playbook                                       |
| `version`     | string   | No       | Pinned registry version                                                             |
| `source`      | string   | No       | Override source location (registry shorthand, GitHub URL, or local path)            |
| `bare`        | boolean  | No       | Scaffold an empty `SKILL.md` instead of fetching from the registry                  |
| `license`     | string   | No       | SPDX licence identifier or `Proprietary`. Mirrors `SKILL.md` frontmatter.           |
| `tags`        | string[] | No       | Categorisation tags                                                                 |

> Required in practice for `bare: true` skills so the generator can scaffold `SKILL.md` frontmatter.
>
> **Skills require the `read` built-in.** When `spec.skills` is non-empty, the validator requires `- id: read` under `spec.tools` and `spec.config.tools.read.enabled: true` - the model loads each skill's full `SKILL.md` body on demand via `read` (only the frontmatter is auto-injected into the system prompt at startup). See [The read and skills coupling](#the-read-and-skills-coupling) below.

#### Accepted `license` values

`license` must be one of these SPDX identifiers (or `Proprietary` for closed-source skills); SPDX expressions like `MIT OR Apache-2.0` are not currently accepted:

| Identifier     | Notes                                       |
| -------------- | ------------------------------------------- |
| `MIT`          | Permissive                                  |
| `Apache-2.0`   | Permissive, patent grant                    |
| `BSD-2-Clause` | Permissive                                  |
| `BSD-3-Clause` | Permissive                                  |
| `GPL-2.0`      | Copyleft                                    |
| `GPL-3.0`      | Copyleft                                    |
| `LGPL-2.1`     | Weak copyleft                               |
| `LGPL-3.0`     | Weak copyleft                               |
| `MPL-2.0`      | Weak copyleft                               |
| `ISC`          | Permissive                                  |
| `CC0-1.0`      | Public domain dedication                    |
| `CC-BY-4.0`    | Creative Commons, attribution               |
| `CC-BY-SA-4.0` | Creative Commons, attribution + share-alike |
| `Unlicense`    | Public domain dedication                    |
| `Proprietary`  | Closed-source / all rights reserved         |

### Built-in Tools

In addition to the custom tools you define under `spec.tools`, the ADL CLI ships a small set of **reserved built-in tool IDs** that the generator owns end-to-end. A reserved built-in is an entry under `spec.tools` that contains **only** an `id` field - the generator supplies the tool's name, description, JSON schema, and implementation. You configure its behaviour through `spec.config.tools.<id>`.

All built-ins default to `enabled: false`; you opt in explicitly per tool.

The reserved-ID set lives in [`internal/schema/builtin_config.go`](https://github.com/inference-gateway/adl-cli/blob/main/internal/schema/builtin_config.go) in the [adl-cli repo](https://github.com/inference-gateway/adl-cli).

#### Reserved IDs

| ID      | Purpose                            | Config struct        | Notes                                                                                                                                                                                                           |
| ------- | ---------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `read`  | Read files (capped lines per call) | `ReadBuiltinConfig`  | **Required and enabled** when `spec.skills` is non-empty (validator-enforced) - this is how `SKILL.md` bodies are loaded on demand                                                                              |
| `write` | Create or overwrite files          | `WriteBuiltinConfig` | Most destructive built-in; strictly opt-in                                                                                                                                                                      |
| `edit`  | In-place string replace            | `EditBuiltinConfig`  | Preferred file modifier (safer than `write`)                                                                                                                                                                    |
| `bash`  | Execute shell commands             | `BashBuiltinConfig`  | Command whitelist + timeout; runtime kill switch via `A2A_BASH_DISABLED=1`                                                                                                                                      |
| `fetch` | HTTP GET / file download           | `FetchBuiltinConfig` | Domain whitelist (suffix match via `.example.com`), `max_bytes`, `timeout_seconds`, `allow_downloads` + scoped `download_dir`, `save_path` traversal/abs-path rejection; kill switch via `A2A_FETCH_DISABLED=1` |

#### Declaring built-ins

A reserved built-in is referenced under `spec.tools` by ID only - never with `name`, `description`, or `schema`:

```yaml
spec:
  tools:
    - id: read
    - id: write
    - id: edit
    - id: bash
    - id: fetch
  config:
    tools:
      read:
        enabled: true
      write:
        enabled: false
      edit:
        enabled: true
      bash:
        enabled: true
        whitelist:
          - 'ls'
          - 'cat'
          - 'go test ./...'
        timeout_seconds: 30
      fetch:
        enabled: true
        allowed_domains:
          - 'pkg.go.dev'
          - '.rust-lang.org'
        max_bytes: 1048576
        timeout_seconds: 15
        allow_downloads: true
        download_dir: './downloads'
```

#### Runtime env-var overrides

Built-in tool settings can be overridden at runtime without regenerating code. The prefix depends on the target runtime:

| Runtime | Prefix         | Example                                                          |
| ------- | -------------- | ---------------------------------------------------------------- |
| Go      | `TOOLS_<ID>_*` | `TOOLS_FETCH_MAX_BYTES=2097152`, `TOOLS_BASH_WHITELIST='ls,cat'` |
| Rust    | `A2A_<ID>_*`   | `A2A_FETCH_TIMEOUT_SECONDS=20`, `A2A_BASH_TIMEOUT_SECONDS=60`    |

**Kill switches** (disable a tool entirely at runtime, regardless of compile-time config):

- `A2A_BASH_DISABLED=1`
- `A2A_FETCH_DISABLED=1`

**Precedence:** `env var` > `compile-time literal (from ADL)` > `built-in default (disabled)`.

> **Note:** These values do **not** flow through `config/config.go`. They are baked as compile-time literals into the tool-registration block in `main.<ext>` and read inside `tools/<id>.<ext>`.

#### The read and skills coupling

If `spec.skills` is non-empty, the ADL **must** declare `- id: read` under `spec.tools` **and** set `spec.config.tools.read.enabled: true`. The validator rejects ADL files that violate this.

At runtime, only each skill's frontmatter is auto-injected into the system prompt; the model reads the full `SKILL.md` body on demand via the `read` built-in. Disabling `read` would leave the agent unable to load its own skill instructions.

#### `fetch` specifics

| Field             | Type     | Description                                                                                                     |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `allowed_domains` | string[] | Exact host (e.g. `pkg.go.dev`) or suffix match prefixed with `.` (e.g. `.rust-lang.org` matches all subdomains) |
| `max_bytes`       | integer  | Response body cap per request                                                                                   |
| `timeout_seconds` | integer  | Per-request timeout                                                                                             |
| `allow_downloads` | boolean  | Gates the `save_path` argument. When `false`, calls passing `save_path` are rejected                            |
| `download_dir`    | string   | Required when `allow_downloads: true`. `save_path` is resolved **relative** to this directory                   |

The `save_path` argument is sanitised by the generated tool: absolute paths and `..` traversal segments are rejected before any file is written.

#### Working example

A complete ADL that exercises all five built-ins is available at [`examples/go-agent-builtin-tools.yaml`](https://github.com/inference-gateway/adl-cli/blob/main/examples/go-agent-builtin-tools.yaml) in the adl-cli repo.

### Services

Services provide dependency injection for tools. Define custom services with interfaces and factory functions; tools list them under `inject:` and receive typed handles at runtime.

```yaml
services:
  database:
    type: service
    interface: DatabaseService
    factory: NewDatabaseService
    description: PostgreSQL database service
```

| Field         | Type   | Description                                                          |
| ------------- | ------ | -------------------------------------------------------------------- |
| `type`        | string | One of `service`, `repository`, `client`, `middleware`               |
| `interface`   | string | Interface name for the service (Go/Rust trait)                       |
| `factory`     | string | Factory function name (`New<Interface>` is the conventional default) |
| `description` | string | Human-readable description                                           |

**Injection patterns** available in a tool's `inject` array:

```yaml
inject:
  - logger # Built-in logger (always available)
  - config # Entire config object
  - config.database # Specific config subsection
  - myService # Custom service from spec.services
```

**Config subsection injection** lets a tool receive only the configuration it needs:

```yaml
config:
  email:
    apiKey: ''
    fromAddress: 'noreply@example.com'
tools:
  - id: send_email
    name: send_email
    description: 'Send a transactional email'
    tags:
      - email
    inject:
      - logger
      - config.email # Only email config is injected
    schema:
      type: object
      properties:
        to: { type: string }
        subject: { type: string }
        body: { type: string }
      required: [to, subject, body]
```

This generates type-safe code where the tool receives `*config.EmailConfig` instead of the full config object.

### Server Configuration

| Field          | Type    | Default | Description                    |
| -------------- | ------- | ------- | ------------------------------ |
| `port`         | integer | `8080`  | Server port                    |
| `scheme`       | string  | `http`  | URL scheme (`http` or `https`) |
| `debug`        | boolean | `false` | Enable debug mode              |
| `auth.enabled` | boolean | `false` | Enable authentication          |

### Language Configuration

Configure language-specific settings. Only one language block should be specified.

**Go:**

```yaml
language:
  go:
    module: 'github.com/company/my-agent'
    version: '1.26.2'
```

| Field     | Type   | Description    |
| --------- | ------ | -------------- |
| `module`  | string | Go module path |
| `version` | string | Go version     |

**Rust:**

```yaml
language:
  rust:
    packageName: 'my-agent'
    version: '1.94'
    edition: '2024'
```

| Field         | Type   | Description                   |
| ------------- | ------ | ----------------------------- |
| `packageName` | string | Cargo package name            |
| `version`     | string | Rust version                  |
| `edition`     | string | Rust edition (`2024`, `2021`) |

**TypeScript** (planned):

```yaml
language:
  typescript:
    packageName: 'my-agent'
    nodeVersion: '22'
```

### Configuration Sections

The `config` block defines structured configuration sections that are mapped to environment variables.

```yaml
config:
  database:
    connectionString: 'postgresql://localhost:5432/db'
    maxConnections: '10'
    timeout: '30s'
  notifications:
    slackWebhook: 'https://hooks.slack.com/...'
    retryAttempts: '3'
```

Each section generates:

- A typed configuration struct (e.g., `DatabaseConfig`)
- Environment variable mappings with proper prefixes (e.g., `DATABASE_CONNECTION_STRING`)
- Integration with the service injection system

### Deployment

#### Kubernetes

```yaml
deployment:
  type: kubernetes
```

Generates a `k8s/deployment.yaml` with standard Kubernetes manifests including resource limits, health checks, ConfigMap/Secret integration, and Service/Ingress configurations.

#### Cloud Run

```yaml
deployment:
  type: cloudrun
  cloudrun:
    image:
      registry: gcr.io
      repository: my-agent
      tag: latest
      useCloudBuild: true
    resources:
      cpu: '1'
      memory: 512Mi
    scaling:
      minInstances: 0
      maxInstances: 100
      concurrency: 1000
    service:
      timeout: 3600
      allowUnauthenticated: true
      serviceAccount: agent@PROJECT_ID.iam.gserviceaccount.com
      executionEnvironment: gen2
    environment:
      LOG_LEVEL: info
```

Generates a `deploy` task in `Taskfile.yml` for `gcloud` deployment with configurable resources, scaling, and service options.

#### Vercel

An ADL agent is a TypeScript A2A HTTP server, so it deploys to Vercel as plain serverless functions on the **Node.js runtime** (Vercel's default) - not as a framework app like Next.js. Vercel builds from source, so - unlike Kubernetes and Cloud Run - there is no `image` (`ImageConfig`) block.

```yaml
deployment:
  type: vercel
  vercel:
    project: vercel-example
    team: my-team
    runtime: nodejs # nodejs (default) | edge
    regions:
      - iad1
    functions:
      memory: 1024
      maxDuration: 60
    environment:
      LOG_LEVEL: info
      ENVIRONMENT: production
```

> **Leave `framework` unset.** An ADL agent is a TypeScript server, not a framework app, so Vercel deploys the generated functions directly. Setting a preset such as `framework: nextjs` would make Vercel try to build the project as a Next.js app, which it is not. Likewise, keep `runtime: nodejs` (the default) - the Edge runtime runs in V8 isolates with a limited API and cannot run a full A2A server.

| Field         | Type     | Required | Description                                                                                                       |
| ------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `project`     | string   | Yes      | Vercel project name. Written to `.vercel/project.json` as `projectId`.                                            |
| `team`        | string   | Yes      | Vercel team / org slug. Written to `.vercel/project.json` as `orgId`.                                             |
| `framework`   | string   | No       | Framework preset (e.g. `nextjs`). Leave unset for ADL agents - they are TypeScript servers, not framework apps.   |
| `runtime`     | string   | No       | Function runtime: `nodejs` (default, full Node API) or `edge` (limited V8 runtime). Use `nodejs` for A2A servers. |
| `regions`     | string[] | No       | Vercel region slugs (e.g. `iad1`).                                                                                |
| `functions`   | object   | No       | Per-function limits: `memory` (MB) and `maxDuration` (seconds).                                                   |
| `environment` | map      | No       | Environment variables, written to `vercel.json` `env`.                                                            |

This generates:

- **`vercel.json`** with `regions`, a `functions` map (`memory` / `maxDuration`), and `env` from `vercel.environment`. With `runtime: nodejs` (the default) no `runtime` key is emitted, so Vercel uses its Node.js runtime; setting `runtime: edge` would instead emit `"runtime": "@vercel/edge"`. `framework` is written only when you set it - leaving it unset (the norm for A2A agents) lets Vercel deploy the functions directly.
- **`.vercel/project.json`** linking the local project to Vercel (`projectId` from `project`, `orgId` from `team`).
- A **`deploy` task** in `Taskfile.yml` that runs `vercel link` / `vercel pull` / `vercel deploy` for interactive deploys (requires the `vercel` CLI: `npm i -g vercel`).

Generated `vercel.json` (from the manifest above):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "env": {
    "ENVIRONMENT": "production",
    "LOG_LEVEL": "info"
  },
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  },
  "regions": ["iad1"]
}
```

Generated `.vercel/project.json`:

```json
{
  "orgId": "my-team",
  "projectId": "vercel-example"
}
```

> The `functions` glob key tracks the target language - `api/**/*.ts` for TypeScript, `api/**/*.go` for Go, `api/**/*.rs` for Rust.

#### Cloudflare Workers

Cloudflare Workers run on the V8-isolate edge runtime and, like Vercel and unlike Kubernetes/Cloud Run, deploy **from source** via `wrangler` rather than a prebuilt container image - so there is no `image` (`ImageConfig`) block. This target is **TypeScript-only**: Workers execute JS/TS on the edge, so a Go or Rust agent produces no Worker artifacts. It models Workers (the server/serverless product), not Pages.

```yaml
deployment:
  type: cloudflare
  cloudflare:
    name: cloudflare-example # Worker (script) name; falls back to metadata.name
    accountId: '${CLOUDFLARE_ACCOUNT_ID}' # prefer a ${VAR} placeholder
    compatibilityDate: '2025-01-01' # defaults to 2025-01-01 when omitted
    compatibilityFlags:
      - nodejs_compat # defaults to [nodejs_compat] when omitted
    routes:
      - agent.example.com/* # custom routes / domains
    workersDev: false # set false to serve exclusively via custom routes
    environment: # plain-text wrangler [vars]
      LOG_LEVEL: info
      ENVIRONMENT: production
```

> **Secrets stay out-of-band.** Only `${VAR}` placeholders for plain-text vars belong in `environment` (the `[vars]` table). Never inline a real secret - set Cloudflare secrets with `wrangler secret put <NAME>` and read them from `env` at runtime.

| Field                | Type     | Required | Description                                                                                                              |
| -------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `name`               | string   | No       | Worker (script) name registered with Cloudflare. Written to wrangler `name`. Falls back to `metadata.name` when omitted. |
| `accountId`          | string   | No       | Cloudflare account ID that owns the Worker. Prefer a `${VAR}` placeholder over inlining the value.                       |
| `compatibilityDate`  | string   | No       | Workers runtime compatibility date (`YYYY-MM-DD`). Defaults to `2025-01-01` when omitted.                                |
| `compatibilityFlags` | string[] | No       | Workers runtime compatibility flags. Defaults to `[nodejs_compat]` when omitted (the scaffold relies on Node.js APIs).   |
| `routes`             | string[] | No       | Custom routes / domains the Worker is served on (e.g. `agent.example.com/*`). Omit to rely on the workers.dev subdomain. |
| `workersDev`         | boolean  | No       | Whether the Worker is exposed on its `*.workers.dev` subdomain. Set `false` when serving exclusively via custom routes.  |
| `environment`        | map      | No       | Plain-text environment variables, written to the `[vars]` table. Use `${VAR}` placeholders; never inline secrets.        |

This generates:

- **`wrangler.toml`** with `name`, `main` (the `src/worker.ts` entrypoint), `compatibility_date`, `compatibility_flags`, `account_id`, `workers_dev`, `routes`, and a `[vars]` table from `environment`. `account_id`, `routes`, and `[vars]` are emitted only when set.
- **`src/worker.ts`** - a module-format Worker entrypoint scaffold exporting a `fetch` handler. It is added to `.adl-ignore`, so your completed handler survives later `adl generate --overwrite` runs.

Generated `wrangler.toml` (from the manifest above):

```toml
name = "cloudflare-example"
main = "src/worker.ts"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
account_id = "${CLOUDFLARE_ACCOUNT_ID}"
workers_dev = false
routes = ["agent.example.com/*"]

[vars]
ENVIRONMENT = "production"
LOG_LEVEL = "info"
```

The `wrangler` CLI is not installed by the scaffold. Set it up once, finish wiring the A2A handler in `src/worker.ts`, then deploy:

```bash
# One-time setup
pnpm add -D wrangler @cloudflare/workers-types
# then add "@cloudflare/workers-types" to compilerOptions.types in tsconfig.json

# Finish the handler in src/worker.ts, then
wrangler deploy
```

> Long-running / stateful work (the background task queue the Node entrypoint runs) needs Cloudflare Queues or Durable Objects. Resource bindings (KV, R2, D1, Durable Objects, Queues) are out of scope for the initial schema and may arrive in a later release.

### CI/CD

#### GitHub Actions CI

```yaml
scm:
  provider: github
```

With the `--ci` flag, generates `.github/workflows/ci.yml` with automated testing, format checking, linting, and Go/Rust module caching.

#### Semantic Release CD

With the `--cd` flag, generates:

- `.github/workflows/cd.yml` - CD workflow triggered manually
- `.releaserc.yaml` - Semantic-release configuration

Features include conventional commit versioning, container publishing to GitHub Container Registry, changelog generation, and deployment integration.

### Development

`spec.development` groups everything related to the local developer experience for an agent project - reproducible sandboxes and AI-assistant integration.

#### Sandbox

`spec.development.sandbox` selects reproducible dev environments. Each is independently toggleable; multiple can be enabled at once.

##### Flox

```yaml
development:
  sandbox:
    flox:
      enabled: true
```

Generates a `.flox/` directory with reproducible development environment configuration.

##### DevContainer

```yaml
development:
  sandbox:
    devcontainer:
      enabled: true
```

Generates `.devcontainer/devcontainer.json` for VS Code Dev Containers.

##### Docker Compose

```yaml
development:
  sandbox:
    dockerCompose:
      enabled: true
```

Generates `docker-compose.yml` for a containerised dev environment.

#### AI Assistants

`spec.development.ai.orchestrators` configures generation of AI-assistant documentation (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) and provisioning of coding agents inside the sandbox. Each supported agent is toggled independently via its own subsection under `orchestrators`, and **every agent is disabled by default**.

```yaml
development:
  ai:
    orchestrators:
      claudecode:
        enabled: true
      codex:
        enabled: false
      gemini:
        enabled: false
      opencode:
        enabled: false
      infer:
        enabled: false
```

| Toggle               | Coding agent              | Docs file the agent reads | GitHub Actions workflow generated?                                                |
| -------------------- | ------------------------- | ------------------------- | --------------------------------------------------------------------------------- |
| `claudecode.enabled` | Anthropic Claude Code     | `CLAUDE.md`               | yes (`.github/workflows/claude.yml`, uses `anthropics/claude-code-action`)        |
| `codex.enabled`      | OpenAI Codex              | `AGENTS.md` (shared)      | yes (`.github/workflows/codex.yml`, uses `openai/codex-action`)                   |
| `gemini.enabled`     | Google Gemini             | `GEMINI.md`               | yes (`.github/workflows/gemini.yml`, uses `google-github-actions/run-gemini-cli`) |
| `opencode.enabled`   | OpenCode                  | `AGENTS.md` (shared)      | no - docs only                                                                    |
| `infer.enabled`      | Inference Gateway `infer` | `AGENTS.md` (shared)      | yes (`.github/workflows/infer.yml`, uses `inference-gateway/infer-action`)        |

Notes:

- `AGENTS.md` is generated **once** and is shared by every enabled agent that reads from it (`codex`, `opencode`, `infer`); its contents are agent-agnostic.
- `CLAUDE.md` and `GEMINI.md` are agent-specific and only appear when the matching toggle is on.
- When `claudecode.enabled: true`, the sandbox environments (Flox, DevContainer) also gain the `claude-code` CLI / extension automatically.
- The `adl init --ai` flag is an init-time shortcut that writes `spec.development.ai.orchestrators.claudecode.enabled: true` into the manifest. Every other toggle stays `false`; enable additional agents by editing `agent.yaml` after init.
- The per-agent toggles live under `spec.development.ai.orchestrators`. Older manifests using the single `spec.development.ai.enabled: true` flag or the flat per-agent shape (e.g. `spec.development.ai.claudecode.enabled`, pre-`orchestrators`) are no longer accepted - `adl validate` and `adl generate` will fail with a migration hint. Move each toggle under `orchestrators` (e.g. `spec.development.ai.orchestrators.claudecode.enabled: true`).

### Hooks

Run commands after code generation:

```yaml
hooks:
  post:
    - 'go mod tidy'
    - 'go generate ./...'
    - 'go fmt ./...'
```

### Acronyms

Custom acronyms for better code generation naming:

```yaml
acronyms:
  - api
  - json
  - xml
  - url
  - http
```

### Artifacts

Enable artifact storage support:

```yaml
artifacts:
  enabled: true
```

Supports filesystem and MinIO/S3 storage backends.

### SCM

Source control management configuration:

```yaml
scm:
  provider: github
  url: 'https://github.com/company/my-agent'
  github_app: true
  issue_templates: true
  dependabot: true
  ci: true
  cd: false
```

| Field             | Type    | Description                                                                                                  |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `provider`        | string  | SCM provider: `github`, `gitlab`, or `bitbucket`                                                             |
| `url`             | string  | Repository URL                                                                                               |
| `github_app`      | boolean | Enable GitHub App for enhanced CD security                                                                   |
| `issue_templates` | boolean | Generate issue templates (bug report, feature request, refactor)                                             |
| `dependabot`      | boolean | Generate `.github/dependabot.yml`                                                                            |
| `ci`              | boolean | Generate CI workflow on `adl generate`. Equivalent to passing `--ci`; CLI flag OR-merges with this value.    |
| `cd`              | boolean | Generate CD pipeline + semantic-release on `adl generate`. Equivalent to passing `--cd`; CLI flag OR-merges. |

## Generated Project Structure

### Go Project

```text
my-go-agent/
├── main.go                         # Main server setup
├── go.mod                          # Go module definition
├── config/
│   └── config.go                   # Type-safe configuration with env mapping
├── internal/
│   ├── logger/
│   │   └── logger.go               # Built-in logger factory
│   └── <service>/
│       └── <service>.go            # Custom service with interface
├── tools/
│   ├── query_database.go           # User-defined tool implementations (TODO placeholders)
│   ├── send_notification.go
│   ├── read.go                     # Built-in tool (when listed under spec.tools)
│   └── ...                         # bash.go, write.go, edit.go, fetch.go (when listed)
├── skills/                         # When spec.skills is non-empty
│   └── <id>/
│       └── SKILL.md                # Markdown playbook (one directory per skill)
├── Taskfile.yml                    # Build, test, lint, run tasks
├── Dockerfile                      # Multi-stage container build
├── .adl-ignore                     # File protection configuration
├── .well-known/
│   └── agent-card.json             # A2A agent discovery manifest
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                  # When spec.scm.ci (or --ci)
│   │   ├── cd.yml                  # When spec.scm.cd (or --cd)
│   │   ├── claude.yml              # When spec.development.ai.orchestrators.claudecode.enabled
│   │   ├── codex.yml               # When spec.development.ai.orchestrators.codex.enabled
│   │   ├── gemini.yml              # When spec.development.ai.orchestrators.gemini.enabled
│   │   ├── infer.yml               # When spec.development.ai.orchestrators.infer.enabled
│   │   └── dependabot.yml          # When spec.scm.dependabot
│   └── ISSUE_TEMPLATE/             # When spec.scm.issue_templates
├── .releaserc.yaml                 # When spec.scm.cd (or --cd)
├── k8s/
│   └── deployment.yaml             # When --deployment kubernetes
├── vercel.json                     # When --deployment vercel
├── .vercel/
│   └── project.json                # When --deployment vercel
├── .flox/                          # When spec.development.sandbox.flox.enabled
├── .devcontainer/
│   └── devcontainer.json           # When spec.development.sandbox.devcontainer.enabled
├── CLAUDE.md                       # When spec.development.ai.orchestrators.claudecode.enabled
├── AGENTS.md                       # When codex/opencode/infer enabled (shared)
├── GEMINI.md                       # When spec.development.ai.orchestrators.gemini.enabled
├── .gitignore
├── .gitattributes                  # Marks generated files as linguist-generated
├── .editorconfig
└── README.md
```

### Rust Project

```text
my-rust-agent/
├── src/
│   ├── main.rs                     # Application entry point
│   └── tools/
│       ├── mod.rs                  # Module declarations
│       ├── query_database.rs       # User-defined tool implementations
│       ├── send_notification.rs
│       ├── read.rs                 # Built-in tools (when listed under spec.tools)
│       └── ...                     # bash.rs, write.rs, edit.rs, fetch.rs
├── skills/                         # When spec.skills is non-empty
│   └── <id>/
│       └── SKILL.md                # Markdown playbook (one directory per skill)
├── Cargo.toml                      # Rust package configuration
├── Taskfile.yml                    # Build, test, lint, run tasks
├── Dockerfile                      # Rust-optimised container
├── .adl-ignore                     # File protection
├── .well-known/
│   └── agent-card.json             # A2A agent discovery manifest
├── .github/workflows/
│   ├── ci.yml                      # When spec.scm.ci (or --ci)
│   ├── cd.yml                      # When spec.scm.cd (or --cd)
│   ├── claude.yml                  # When spec.development.ai.orchestrators.claudecode.enabled
│   ├── codex.yml                   # When spec.development.ai.orchestrators.codex.enabled
│   ├── gemini.yml                  # When spec.development.ai.orchestrators.gemini.enabled
│   └── infer.yml                   # When spec.development.ai.orchestrators.infer.enabled
├── .releaserc.yaml                 # When spec.scm.cd (or --cd)
├── k8s/
│   └── deployment.yaml             # When --deployment kubernetes
├── vercel.json                     # When --deployment vercel
├── .vercel/
│   └── project.json                # When --deployment vercel
├── CLAUDE.md                       # When spec.development.ai.orchestrators.claudecode.enabled
├── AGENTS.md                       # When codex/opencode/infer enabled (shared)
├── GEMINI.md                       # When spec.development.ai.orchestrators.gemini.enabled
└── README.md
```

> Generated files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, the per-agent workflows, `.releaserc.yaml`, etc.) are tagged `linguist-generated=true` in `.gitattributes` so they collapse in pull-request diffs.

## .adl-ignore

The `.adl-ignore` file protects files from being overwritten when re-running `adl generate --overwrite`. This lets you safely regenerate project scaffolding without losing custom implementations.

### Syntax

Uses glob patterns, one per line. Comments start with `#`.

```text
# Protect tool implementations
tools/*

# Protect skill playbooks
skills/**

# Protect specific files
main.go
config/config.go

# Protect by extension
*.go

# Protect directories
internal/
```

### Default Protected Files

Generated `.adl-ignore` files automatically protect tool implementation files, skill playbooks, and custom service files to prevent accidental overwriting.

## AI Provider Configuration

The ADL CLI supports multiple AI providers. Set the corresponding environment variable for your chosen provider:

| Provider     | `spec.agent.provider` | Environment Variable   | Example Model                              |
| ------------ | --------------------- | ---------------------- | ------------------------------------------ |
| OpenAI       | `openai`              | `OPENAI_API_KEY`       | `gpt-5-mini`                               |
| Anthropic    | `anthropic`           | `ANTHROPIC_API_KEY`    | `claude-opus-4-8`                          |
| DeepSeek     | `deepseek`            | `DEEPSEEK_API_KEY`     | `deepseek-v4-flash`                        |
| Ollama       | `ollama`              | - (local)              | `llama3.3`                                 |
| Google AI    | `google`              | `GOOGLE_API_KEY`       | `gemini-3-pro`                             |
| Mistral      | `mistral`             | `MISTRAL_API_KEY`      | `mistral-large-3`                          |
| Groq         | `groq`                | `GROQ_API_KEY`         | `llama-3.3-70b`                            |
| Cohere       | `cohere`              | `COHERE_API_KEY`       | `command-a-03-2025`                        |
| Cloudflare   | `cloudflare`          | `CLOUDFLARE_API_KEY`   | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| Moonshot     | `moonshot`            | `MOONSHOT_API_KEY`     | `kimi-k2-thinking`                         |
| Ollama Cloud | `ollama_cloud`        | `OLLAMA_CLOUD_API_KEY` | `gpt-oss:120b`                             |
| Nvidia       | `nvidia`              | `NVIDIA_API_KEY`       | `meta/llama-3.1-8b-instruct`               |
| MiniMax      | `minimax`             | `MINIMAX_API_KEY`      | `MiniMax-M3`                               |

## Integrating with Inference Gateway

Generated A2A agents can be connected to the Inference Gateway using the [CLI](/cli/):

```bash
# Add your running agent to the gateway
infer agents add my-agent http://localhost:8080

# Verify the agent is connected
infer agents show my-agent

# Chat with the agent through the gateway
infer chat
```

The gateway discovers agent capabilities automatically via the `/.well-known/agent-card.json` endpoint. See the [A2A Integration](/a2a/) documentation for more details on the agent protocol and architecture.

## Best Practices

- **Start with `adl init`** - Use the interactive wizard to scaffold your ADL file with sensible defaults
- **Validate early** - Run `adl validate` before generating to catch schema errors
- **Use `.adl-ignore`** - Protect your custom implementations before regenerating
- **Version control your ADL file** - Track `agent.yaml` alongside your code
- **Leverage service injection** - Use the `inject` system instead of global state for testability
- **Config subsection injection** - Inject only the config sections each tool needs (`config.email` instead of `config`)
- **Enable AI assistants per agent** - Flip on the assistants you actually use under `spec.development.ai.orchestrators.*.enabled` (start with `claudecode`; add `codex`/`gemini`/`opencode`/`infer` as needed)
- **Set up CI/CD declaratively** - Set `spec.scm.ci: true` / `spec.scm.cd: true` so pipelines regenerate on every `adl generate` without remembering flags

## Troubleshooting

### "file not found" when running `adl generate`

Ensure the ADL file exists and the path is correct. The default file is `agent.yaml` in the current directory.

```bash
adl generate --file ./path/to/agent.yaml
```

### Validation errors

Run `adl validate` to see detailed error messages about missing or invalid fields.

### Files overwritten after regeneration

Add files you want to protect to `.adl-ignore` before running `adl generate --overwrite`.

### Provider authentication errors at runtime

Ensure the appropriate environment variable is set for your AI provider (see [AI Provider Configuration](#ai-provider-configuration)).

### Build errors in generated code

Run the post-generation hooks manually:

```bash
# Go
go mod tidy

# Rust
cargo build
```

## Support and Resources

- **Repository:** [github.com/inference-gateway/adl-cli](https://github.com/inference-gateway/adl-cli)
- **Issues:** [github.com/inference-gateway/adl-cli/issues](https://github.com/inference-gateway/adl-cli/issues)
- **Releases:** [github.com/inference-gateway/adl-cli/releases](https://github.com/inference-gateway/adl-cli/releases)
- **ADL specification:** [adl.inference-gateway.com](https://adl.inference-gateway.com) - canonical schema, field reference, and authoring guide for `agent.yaml` manifests.
- **Publish your agent:** Once your generated agent ships a container image, list it in the [A2A Registry](/registry/) so others can discover and consume it.
- **Debug your agent:** Use the [A2A Debugger](/a2a-debugger/) to inspect agent cards, stream tasks, and replay conversations during development.
