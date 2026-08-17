---
title: Architecture Overview
description: How Inference Gateway is structured, how requests flow through optional OIDC auth and the proxy layer to upstream LLM providers, and how the gateway runs on Kubernetes.
---

# Architecture Overview

This document provides a high-level overview of the architecture of the Inference Gateway. The gateway is designed to be modular and extensible, so new providers and routing strategies drop in without changing the request surface clients see.

## General Overview

A unified OpenAI-compatible request enters the gateway and passes through a middleware pipeline - optional [OIDC authentication](/authentication/), optional [guardrails](/configuration/), and the [MCP](/mcp/) tool-call loop - before [model routing](/model-routing/) resolves the target model and the provider proxy dispatches it to whichever upstream provider serves it. [A2A agents](/a2a/) are clients too: the [CLI](/cli/) delegates tasks to them, and they call the same OpenAI-compatible API themselves - the gateway does not proxy the A2A protocol.

<FlowDiagram flow="request" />

The pipeline order matches the binary: `cmd/gateway/main.go` registers the auth, guardrails, and MCP middlewares in exactly this sequence before the `/v1/*` handlers. The gateway is stateless - replicas scale horizontally behind any load balancer, and per-request state (tool-call iteration, MCP context) lives in the request lifecycle, not the process. See [Supported Providers](/supported-providers/) for the full provider matrix: OpenAI, DeepSeek, Anthropic, Cohere, Groq, Cloudflare, Ollama, Ollama Cloud, Google, Mistral, MiniMax, Moonshot, and Nvidia.

## Kubernetes Setup

The Inference Gateway is built to run on Kubernetes. Traffic enters through the Kubernetes Gateway API - an [Envoy Gateway](https://gateway.envoyproxy.io/) data plane fronting a `Service` - and reaches a pool of stateless gateway pods, each fronting the same provider proxy. The operator provisions these Gateway API resources from a `Gateway` CR's `gatewayAPI` spec (the successor to Ingress); see the [Kubernetes Operator](/operator/#routing-gateway-api) guide. Telemetry is scraped on a dedicated metrics port via a `ServiceMonitor`, and providers stay external.

<FlowDiagram flow="kubernetes" />

Pods are interchangeable. Add capacity with an HPA, remove pods with rolling updates. The `Monitoring Stack` here represents the `ServiceMonitor` + Prometheus + Grafana pipeline kube-prometheus-stack deploys around the gateway - see [Observability](/observability/) for the full setup, and the [Kubernetes Operator](/operator/) for managing this topology declaratively as Custom Resources.
