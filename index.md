---
layout: home
title: Inference Gateway Documentation
titleTemplate: Open-source LLM proxy for OpenAI, Anthropic, Groq, Ollama and more
description: Inference Gateway is an open-source, cloud-native proxy that unifies multiple LLM providers behind a single OpenAI-compatible API. Enterprise-ready, lightweight, Kubernetes-native.

hero:
  name: Inference Gateway
  text: One API for every LLM
  tagline: Open-source, cloud-native proxy unifying OpenAI, Anthropic, Groq, Cohere, Ollama, DeepSeek, Cloudflare, Google, Mistral and Moonshot behind a single OpenAI-compatible API.
  image:
    src: /logo.png
    alt: Inference Gateway logo
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/
    - theme: alt
      text: View on GitHub
      link: https://github.com/inference-gateway/inference-gateway
    - theme: alt
      text: Architecture
      link: /architecture-overview/

features:
  - icon: 🚀
    title: Unified API access
    details: Talk to OpenAI, Anthropic, Groq, Cohere, Ollama, DeepSeek, Cloudflare, Google, Mistral and Moonshot through one OpenAI-compatible endpoint.
    link: /supported-providers/
    linkText: Supported providers
  - icon: 🔌
    title: MCP integration
    details: Native Model Context Protocol support. Auto-discover tools from connected MCP servers and execute tool calls server-side.
    link: /mcp/
    linkText: MCP guide
  - icon: 🤖
    title: Agent-to-Agent (A2A)
    details: Coordinate specialized agents from inside any chat completion. Discover capabilities, delegate tasks, stream results.
    link: /a2a/
    linkText: A2A guide
  - icon: 📝
    title: Define agents as code
    details: Describe an A2A agent once in an Agent Definition Language (ADL) YAML file, then generate an enterprise-ready Go or Rust server with the ADL CLI.
    link: /adl/
    linkText: Agent Definition Language
  - icon: 🌊
    title: Streaming first-class
    details: Server-Sent Events streaming with token-level deltas, tool-call chunks, and final usage metrics.
    link: /api-reference/
    linkText: API reference
  - icon: ☸️
    title: Kubernetes-native
    details: Kubernetes Operator with CRDs for gateways, agents, MCP servers, and chat orchestrators - declarative, GitOps-friendly cluster management.
    link: /operator/
    linkText: Operator guide
  - icon: 📊
    title: OpenTelemetry built-in
    details: Prometheus metrics, OTLP tracing, structured JSON logs, reference Grafana dashboards. Production observability out of the box.
    link: /observability/
    linkText: Observability
  - icon: 🛡️
    title: Enterprise-ready auth
    details: OIDC authentication with Keycloak and any standards-compliant identity provider. JWT validation against the issuer's JWKS.
    link: /authentication/
    linkText: Authentication
  - icon: 🌿
    title: Lightweight
    details: ~10.8 MB static binary. Minimal CPU and memory footprint. Designed to scale horizontally with HPA in Kubernetes.
  - icon: 🔒
    title: Privacy-first
    details: No analytics, no telemetry phoning home. Self-host anywhere - on-prem, cloud, or air-gapped.
---

## Why Inference Gateway?

Building against multiple LLM providers means juggling SDKs, API quirks, auth schemes, and streaming protocols that drift constantly. **Inference Gateway** sits in front of every provider and exposes a single, stable, OpenAI-compatible surface so your application code never has to care which model is on the other end.

- Switch providers with one config change, no application redeploys.
- Centralise API keys, rate limiting, and audit logging at the gateway.
- Add MCP tools or A2A agents once, get them for every model that supports tool calls.
- Run the same binary in Docker or Kubernetes - and let the [Kubernetes Operator](/operator/) manage gateways, agents, MCP servers, and orchestrators as Custom Resources.

## How it works

Inference Gateway acts as an intermediary between your applications and various LLM providers. By standardising the API interactions, it lets you:

- Access multiple LLM providers through a single integration.
- Switch between providers without changing application code.
- Implement sophisticated routing and fallback mechanisms.
- Centralise API key management and security policies.

## Model Context Protocol (MCP)

Native support for the **Model Context Protocol** lets LLMs automatically access external tools and data sources. With MCP integration, you can:

- Automatically discover tools from connected MCP servers.
- Execute tool calls seamlessly without client-side management.
- Connect multiple data sources like filesystems, databases, and APIs.
- Extend LLM capabilities with custom tools and integrations.

```bash
# Enable MCP with multiple servers
export MCP_ENABLE=true
export MCP_SERVERS="http://filesystem-server:8081/mcp,http://search-server:8082/mcp"

# LLMs automatically get access to all available tools
curl -X POST http://localhost:8080/v1/chat/completions \
  -d '{"model": "deepseek/deepseek-v4-flash", "messages": [{"role": "user", "content": "List files and search for recent AI news"}]}'
```

Learn more about [MCP Integration](/mcp/) and explore the [examples](/examples/).

## Agent-to-Agent (A2A)

**Agent-to-Agent** support lets LLMs coordinate with multiple specialised agents in a single conversation. Agents can:

- Coordinate multiple agents in a single conversation.
- Access specialised services like calendars, calculators, and weather APIs.
- Discover agent capabilities automatically.
- Scale agent ecosystems with distributed architecture.

The best way to use A2A is through the **Inference Gateway CLI**, which provides seamless integration with A2A agents:

```bash
# Install the CLI
curl -fsSL https://raw.githubusercontent.com/inference-gateway/cli/main/install.sh | bash

# Initialize and start chatting
infer init
infer chat

# Delegate tasks to A2A agents
> "Schedule a team meeting for tomorrow at 2 PM"
> "Check my calendar for conflicts this week"
```

Learn more about [A2A Integration](/a2a/) and see how to build your own agents.

## Agent Definition Language (ADL)

Prefer to **define an agent as code**? The **Agent Definition Language (ADL)** describes an entire A2A agent - provider, model, tools, skills, server, and deployment - in a single declarative `agent.yaml` file. The [ADL CLI](/adl-cli/) turns that manifest into an enterprise-ready Go or Rust project, so the agent stays version-controlled and reproducible.

```bash
# Scaffold, validate, and generate an A2A agent from a declarative manifest
adl init my-weather-agent
adl validate agent.yaml
adl generate --file agent.yaml --output ./my-weather-agent
```

Read the [Agent Definition Language overview](/adl/) to see how ADL, the ADL CLI, and the ADK fit together, or jump straight to the canonical spec at [adl.inference-gateway.com](https://adl.inference-gateway.com).

## Community

Inference Gateway is an open-source project maintained by a growing community. Contributions are welcome on [GitHub](https://github.com/inference-gateway/inference-gateway).
