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
- [ADL CLI](/adl-cli/) - scaffold A2A agents you can publish to the registry
- [A2A Debugger](/a2a-debugger/) - inspect any A2A agent at the protocol level
- [Inference Gateway CLI](/cli/) - register and chat with agents through your gateway
- [Registry repository](https://github.com/inference-gateway/registry) - source, issues, and the catalogue itself
- [Browse the registry](https://registry.inference-gateway.com) - the live catalogue
