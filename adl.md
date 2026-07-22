---
title: Agent Definition Language (ADL)
description: Agent Definition Language (ADL) is a declarative YAML format for defining A2A agents as code. Describe an agent's provider, model, tools, skills, and infrastructure once, then generate an enterprise-ready Go or Rust server with the ADL CLI. Canonical spec at adl.inference-gateway.com.
---

# Agent Definition Language (ADL)

**Agent Definition Language (ADL)** is a declarative YAML format for defining an [A2A (Agent-to-Agent)](/a2a/) agent as code. A single `agent.yaml` manifest captures everything about an agent - its provider and model, the tools it can call, the skills it knows, its server and authentication settings, and its CI/CD and deployment wiring - so the whole agent is version-controlled, reviewable, and reproducible instead of scattered across hand-written boilerplate.

ADL is the declarative layer that sits above the [Agent Development Kit (ADK)](/adk/). You describe the agent once in ADL, and the [ADL CLI](/adl-cli/) generates a complete, enterprise-ready project - in Go or Rust (TypeScript planned) - that builds on the ADK runtime. Regenerating after an edit preserves your custom code through `.adl-ignore`, so the manifest stays the single source of truth as the agent evolves.

> **Canonical reference.** The full ADL schema, field reference, and authoring guide live at **[adl.inference-gateway.com](https://adl.inference-gateway.com)**. This page is a conceptual overview; the [ADL CLI](/adl-cli/) reference documents the tooling that consumes ADL files.

## What an ADL file looks like

Every ADL manifest is a YAML document that starts with an `apiVersion` and `kind`, then describes the agent under `spec`:

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
  agent:
    provider: deepseek
    model: deepseek-v4-flash
    systemPrompt: 'You are a helpful weather assistant.'
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
  language:
    go:
      module: 'github.com/example/my-weather-agent'
      version: '1.26.2'
```

Scaffold, validate, and generate a runnable project from a manifest like this with the ADL CLI:

```bash
adl init my-weather-agent      # interactive wizard writes agent.yaml
adl validate agent.yaml        # check it against the schema
adl generate --file agent.yaml --output ./my-weather-agent
```

See the [ADL CLI](/adl-cli/) reference for the complete command surface and a full field-by-field schema breakdown.

## Connecting to MCP servers

An agent can reach out to [Model Context Protocol (MCP)](/mcp/) servers at runtime to discover and call external tools, on top of the tools it defines locally under `spec.tools`. This is configured with a single `spec.agent.mcp` block: `servers` lists which servers to connect to, and the remaining fields tune the ADK's built-in MCP client (endpoint, refresh, timeouts, retries) globally across them.

```yaml
spec:
  agent:
    provider: deepseek
    model: deepseek-v4-flash
    mcp:
      enabled: true
      servers:
        - name: filesystem
          transport: http
          url: http://localhost:3000
```

`enabled` is the master switch and is **required** whenever the `mcp` block is present - when it is `false` (the default) no MCP client is generated, regardless of what `servers` lists. See the [ADL CLI schema reference](/adl-cli/#mcp-servers) for every field and its default.

## How ADL fits the ecosystem

- **ADL** - the declarative YAML contract that describes an agent. Canonical spec: [adl.inference-gateway.com](https://adl.inference-gateway.com).
- **[ADL CLI](/adl-cli/)** - reads an ADL file and generates a runnable A2A agent project, including tool stubs, skills, CI/CD, and deployment manifests.
- **[Agent Development Kit (ADK)](/adk/)** - the [Go](/adk/), [TypeScript](/typescript-adk/), and [Rust](/rust-adk/) runtime libraries that generated projects build on.
- **[A2A](/a2a/)** - the Agent-to-Agent protocol the generated agent speaks, so the gateway and its [CLI](/cli/) can discover and call it.

## Related

- [ADL CLI](/adl-cli/) - the command-line tool that scaffolds and regenerates agents from ADL files.
- [Go ADK](/adk/), [TypeScript ADK](/typescript-adk/), [Rust ADK](/rust-adk/) - the runtimes generated projects build on.
- [A2A Integration](/a2a/) - the protocol ADL-defined agents speak.
- [ADL specification](https://adl.inference-gateway.com) - canonical schema, field reference, and authoring guide.
