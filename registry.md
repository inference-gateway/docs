---
title: A2A Registry
description: Browse the Inference Gateway A2A Registry to discover, consume, and publish containerized Agent-to-Agent services with rich metadata, categories, and a static catalogue site.
---

# A2A Registry

The **A2A Registry** is the central catalogue for discovering [Agent-to-Agent (A2A)](/a2a/) services in the Inference Gateway ecosystem. It's a static web application - hosted at [registry.inference-gateway.com](https://registry.inference-gateway.com) - that lets you browse containerised A2A agents, inspect their metadata, and pull the OCI images you need into your own gateway deployment.

> The registry is open-source. The catalogue, schema, and site code all live at [github.com/inference-gateway/registry](https://github.com/inference-gateway/registry).

## What's in the registry

Each entry is a self-contained A2A agent published as an OCI container image. Entries carry rich metadata describing:

- **Identity**: stable `id`, human-readable `name`, semantic `version`.
- **Purpose**: a short `description` plus a longer markdown `longDescription` with features and usage notes.
- **Container**: image `repository`, `tag`, and `size` so you know what you're pulling.
- **Provenance**: `author`, `license`, `homepage`, `repository`, and `documentation` URLs.
- **Discoverability**: `categories` and `tags` for filtering.

The current site lets you search across name, description, and tags, and filter by category to narrow down agents by use case (productivity, browsing, documentation, scheduling, etc.).

## Featured agents

The full catalogue is browsable at [registry.inference-gateway.com](https://registry.inference-gateway.com). The entries below are documented here so you can see the shape of a published agent - its skill, the tools that skill calls, and the configuration it accepts - before pulling the image.

### Google Calendar Agent

Calendar management and scheduling, published as the OCI image `ghcr.io/inference-gateway/google-calendar-agent`. Register it with your gateway using the [`infer agents add`](#discovering-and-consuming-agents) workflow below.

**Skill:**

- `schedule-meeting`: Schedule a meeting, book a slot, or find a time that works. Resolves a conflict-free booking by finding open slots, validating that nothing overlaps, and creating the event.

**Tools:**

The `schedule-meeting` skill is backed by a set of calendar tools the agent calls internally:

- `list_calendar_events`: List upcoming events for a time range, with optional free-text search
- `create_calendar_event`: Create a new event, including attendees and location
- `update_calendar_event`: Update an existing event by ID
- `delete_calendar_event`: Delete an event by ID
- `get_calendar_event`: Retrieve the details of a specific event by ID
- `find_available_time`: Find open time slots of a given duration within a date range
- `check_conflicts`: Check for scheduling conflicts in a time range
- `get_current_datetime`: Return the current date/time and the user's IANA timezone, called first for any time-relative request so events land in the correct timezone

**Configuration:**

Pass these as environment variables when you register or run the agent (e.g. `infer agents add google-calendar http://localhost:8080 --oci ghcr.io/inference-gateway/google-calendar-agent:<tag> --run --environment KEY=value`):

- `GOOGLE_CALENDAR_MOCK_MODE` (default `false`): serve in-memory mock data instead of calling the Google Calendar API - useful for demos and testing without credentials
- `GOOGLE_CALENDAR_TIMEZONE` (default `UTC`): default IANA timezone applied when a request does not specify one
- `GOOGLE_CALENDAR_ID` (default `primary`): the calendar the agent reads from and writes to
- `GOOGLE_SERVICE_ACCOUNT_JSON` / `GOOGLE_CREDENTIALS_PATH` (default empty): Google service-account credentials as inline JSON or a path to the credentials file, used for live Google Calendar API access; leave unset when `GOOGLE_CALENDAR_MOCK_MODE` is `true`

**Repository:** [github.com/inference-gateway/google-calendar-agent](https://github.com/inference-gateway/google-calendar-agent)

For this agent in the context of multi-agent gateway coordination, see the [A2A Integration guide](/a2a/#google-calendar-agent).

### [Documentation Agent](/documentation-agent/)

Context7-style documentation retrieval, published as the OCI image `ghcr.io/inference-gateway/documentation-agent`. It resolves a library name to a Context7-compatible ID and fetches version-scoped documentation, so other agents can ground their code generation in up-to-date library docs before writing against an unfamiliar API. [Learn more →](/documentation-agent/)

**Skill:**

- `library-documentation-lookup`: Fetch up-to-date documentation for a third-party library or framework before writing code against it. First resolves the library name to a Context7-compatible ID via `resolve_library_id` (when the caller does not already supply one in the `/org/project` or `/org/project/version` form), then retrieves focused, topic-scoped documentation via `get_library_docs`. Good for filling in unknowns about specific APIs, hooks, configuration options, or version-specific behavior.

**Tools:**

The `library-documentation-lookup` skill is backed by a set of documentation tools the agent calls internally:

- `resolve_library_id`: Resolve an official library name (e.g. `Next.js`, `Three.js`) plus the caller's query into a ranked list of Context7-compatible library IDs
- `get_library_docs`: Fetch up-to-date, topic-scoped documentation for a Context7-compatible library ID (e.g. `/vercel/next.js`, or version-pinned `/vercel/next.js/v14.3.0-canary.87`), answering a specific question rather than a broad keyword
- `read`: Read a file from disk by path, optionally sliced by line offset/limit - used to load skill bodies on demand

**Behavior:**

The agent is a Context7-compatible documentation-lookup service. A typical request is two steps: call `resolve_library_id` to turn a human-readable library name into a canonical `/org/project` (optionally `/org/project/version`) identifier, then call `get_library_docs` with that ID and a specific question to retrieve version-scoped documentation. Callers that already know the exact ID can skip straight to `get_library_docs`. Responses are capped at `maxTokens` 4096, so queries should be specific (`How to set up JWT auth in Express.js`, not `auth`).

**Configuration:**

Like any ADK-built agent, point it at an LLM backend with the standard A2A client variables, then toggle the read tool as needed:

- `A2A_AGENT_CLIENT_PROVIDER` / `A2A_AGENT_CLIENT_MODEL` / `A2A_AGENT_CLIENT_API_KEY`: the LLM provider, model, and key the agent uses to drive the lookup (e.g. `openai`, `anthropic`, `ollama`)
- `A2A_AGENT_CLIENT_MAX_TOKENS` (default `4096`): maximum tokens for the documentation responses the agent returns
- `TOOLS_READ_ENABLED` (default `true`): enable the `read` tool

**Repository:** [github.com/inference-gateway/documentation-agent](https://github.com/inference-gateway/documentation-agent)

## How it relates to ADK-built agents

If you scaffold an agent with the [ADL CLI](/adl-cli/), the registry is where you publish it once it's ready for others to consume. The ADL toolchain already produces everything the registry needs:

- A container image (built via the generated `Dockerfile` and `Taskfile.yml`).
- An A2A-compliant agent card at `/.well-known/agent-card.json`.
- A `README.md` and SCM metadata you can point `homepage` / `documentation` at.

Browsing the registry is also a good way to find reference implementations before writing your own - every published agent links back to its source repository, which typically includes its `agent.yaml` ADL manifest.

## Discovering and consuming agents

### 1. Browse the registry

Open [registry.inference-gateway.com](https://registry.inference-gateway.com) and filter by category or search by keyword. Each agent card lists the OCI image (e.g. `ghcr.io/inference-gateway/google-calendar-agent:0.4.23`) and links to the source repo and docs.

### 2. Add the agent to your gateway

Use the [Inference Gateway CLI](/cli/)'s `infer agents` commands to register the agent with your gateway. The CLI can pull and run the image locally, or just point at an already-running URL:

```bash
# Register a remote agent already running somewhere
infer agents add my-agent https://my-agent.example.com

# Pull and run the OCI image locally, then register it
infer agents add my-agent http://localhost:8080 \
  --oci ghcr.io/inference-gateway/google-calendar-agent:0.4.23 \
  --run

# Pass environment variables required by the agent
infer agents add my-agent http://localhost:8080 \
  --oci ghcr.io/inference-gateway/google-calendar-agent:0.4.23 \
  --run \
  --environment GOOGLE_API_KEY=...
```

See the [A2A Integration guide](/a2a/#using-a2a-with-the-inference-gateway-cli) for the full CLI workflow.

### 3. Verify and use the agent

Once registered, confirm capabilities with the gateway and start chatting:

```bash
infer agents show my-agent
infer chat
> "What can the calendar agent do?"
```

For raw protocol-level inspection (agent card, task streams, conversation replay), use the [A2A Debugger](/a2a-debugger/):

```bash
a2a connect --server-url http://localhost:8080
a2a agent-card
```

## Publishing your own agent

The registry is a static, build-time site: agent metadata is defined in YAML files under [`agents/`](https://github.com/inference-gateway/registry/tree/main/agents), processed by a Vite plugin at build time, and rendered into the catalogue. There is no API to push to - publication is a pull request against the registry repo.

### 1. Build and publish your container image

Push your A2A agent's OCI image to a registry such as `ghcr.io/<org>/<agent>:<version>`. If you scaffolded with the [ADL CLI](/adl-cli/) and enabled `spec.scm.cd: true`, the generated `cd.yml` workflow already handles versioning, tagging, and publishing on every release.

### 2. Add a `metadata.yaml`

Create `agents/<your-agent-id>/metadata.yaml` in the [registry repo](https://github.com/inference-gateway/registry) using the schema below:

```yaml
id: unique-agent-id
name: Human-readable Agent Name
version: 1.0.0
description: Brief description of the agent's purpose
longDescription: |
  Detailed description with features and capabilities,
  written as markdown. Use this to highlight what the
  agent does, what tools/skills it exposes, and any
  setup requirements.

image:
  repository: ghcr.io/inference-gateway/agent-name
  tag: 1.0.0
  size: 25.3MB

author:
  name: Author Name
  email: author@example.com
  url: https://github.com/your-org

license: Apache-2.0
homepage: https://github.com/org/agent
repository: https://github.com/org/agent
documentation: https://docs.example.com

categories:
  - category1
  - category2

tags:
  - tag1
  - tag2
```

| Field             | Required | Notes                                                                |
| ----------------- | -------- | -------------------------------------------------------------------- |
| `id`              | Yes      | Stable unique identifier (also used for the directory name)          |
| `name`            | Yes      | Human-readable display name                                          |
| `version`         | Yes      | Semantic version, must match the published image tag                 |
| `description`     | Yes      | One-line summary surfaced in search results                          |
| `longDescription` | Yes      | Markdown body shown on the agent's detail page                       |
| `image`           | Yes      | `repository`, `tag`, and `size` of the OCI image                     |
| `author`          | Yes      | `name`, `email`, and optional `url`                                  |
| `license`         | Yes      | SPDX identifier (e.g. `Apache-2.0`, `MIT`)                           |
| `homepage`        | Yes      | Project homepage URL                                                 |
| `repository`      | Yes      | Source code repository URL                                           |
| `documentation`   | Yes      | URL to documentation (can be a README, docs site, or this docs site) |
| `categories`      | Yes      | Categorisation tags used by the registry's category filter           |
| `tags`            | Yes      | Free-form tags surfaced in search                                    |

The [`agents/google-calendar/metadata.yaml`](https://github.com/inference-gateway/registry/blob/main/agents/google-calendar/metadata.yaml) entry is a complete working example.

### 3. Open a pull request

Submit the new `agents/<id>/metadata.yaml` against the [registry repo](https://github.com/inference-gateway/registry). Once merged, the static site is rebuilt and your agent appears in the catalogue automatically.

## Related

- [A2A Integration](/a2a/) - protocol overview and CLI integration
- [n8n Agent](/n8n-agent/) - a worked example of a published A2A agent and its skill/tools
- [Grafana Agent](/grafana-agent/) - an A2A agent that builds Grafana dashboards and PromQL queries
- [Mock Agent](/mock-agent/) - a zero-config A2A testing aid (mock LLM, no API keys) for exercising clients, gateways, and the debugger
- [Browser Agent](/browser-agent/) - an A2A agent for browser automation and web testing on Playwright
- [ADL CLI](/adl-cli/) - scaffold A2A agents you can publish to the registry
- [A2A Debugger](/a2a-debugger/) - inspect any A2A agent at the protocol level
- [Inference Gateway CLI](/cli/) - register and chat with agents through your gateway
- [Registry repository](https://github.com/inference-gateway/registry) - source, issues, and the catalogue itself
- [Browse the registry](https://registry.inference-gateway.com) - the live catalogue
