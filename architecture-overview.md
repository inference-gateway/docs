---
title: Architecture Overview
description: How Inference Gateway is structured, how requests flow through optional OIDC auth and the proxy layer to upstream LLM providers, and how the gateway runs on Kubernetes.
---

# Architecture Overview

This document provides a high-level overview of the architecture of the Inference Gateway. The gateway is designed to be modular and extensible, so new providers and routing strategies drop in without changing the request surface clients see.

## General Overview

A unified OpenAI-compatible request enters the gateway, optionally clears OIDC authentication, fans out to a horizontally-scalable gateway tier, and is normalised through a single proxy layer before being dispatched to whichever upstream provider serves the requested model.

```mermaid
flowchart LR
    Client["Clients / Agents"]
    Auth{{"Optional OIDC"}}
    Proxy["Provider Proxy"]
    Providers["LLM Providers"]

    Client -- "POST /v1/chat/completions" --> Auth

    subgraph GatewayTier["Inference Gateway Tier"]
        direction TB
        GW1["Gateway"]
        GW2["Gateway"]
        GW3["Gateway"]
    end

    Auth --> GW1
    Auth --> GW2
    Auth --> GW3
    GW1 --> Proxy
    GW2 --> Proxy
    GW3 --> Proxy
    Proxy --> Providers

    classDef client fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#1f2937
    classDef auth fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f
    classDef gateway fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#ffffff
    classDef proxy fill:#a78bfa,stroke:#7c3aed,stroke-width:2px,color:#ffffff
    classDef provider fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#065f46

    class Client client
    class Auth auth
    class GW1,GW2,GW3 gateway
    class Proxy proxy
    class Providers provider
```

The gateway tier is stateless - replicas scale horizontally behind any load balancer. Per-request state (tool-call iteration, MCP context, A2A delegation) lives in the request lifecycle, not the pod. See [Supported Providers](/supported-providers) for the full provider matrix: OpenAI, Anthropic, Groq, Cohere, Google, Ollama, DeepSeek, Cloudflare, Mistral, and Moonshot.

## Kubernetes Setup

The Inference Gateway is built to run on Kubernetes. Traffic flows from an ingress through a `Service` to a pool of stateless gateway pods, each fronting the same provider proxy. Telemetry is scraped on a dedicated metrics port via a `ServiceMonitor`, and providers stay external.

```mermaid
flowchart LR
    ExtClient["External Clients"]
    IntClient["Internal Clients"]
    Providers["External LLM Providers"]
    Monitoring["Monitoring Stack"]

    subgraph Cluster["Kubernetes Cluster"]
        direction TB
        Ingress["Ingress"]
        Svc["Gateway Service"]

        subgraph Pods["Gateway Pods"]
            direction TB
            Pod1["Gateway Pod"]
            Pod2["Gateway Pod"]
            Pod3["Gateway Pod"]
        end

        Ingress --> Svc
        Svc --> Pod1
        Svc --> Pod2
        Svc --> Pod3
        Svc -. ":9464 /metrics" .-> Monitoring
    end

    ExtClient --> Ingress
    IntClient --> Svc
    Pod1 --> Providers
    Pod2 --> Providers
    Pod3 --> Providers

    classDef client fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#1f2937
    classDef ingress fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a
    classDef service fill:#bfdbfe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a
    classDef gateway fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#ffffff
    classDef monitor fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f
    classDef provider fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#065f46

    class ExtClient,IntClient client
    class Ingress ingress
    class Svc service
    class Pod1,Pod2,Pod3 gateway
    class Monitoring monitor
    class Providers provider
```

Pods are interchangeable. Add capacity with an HPA, remove pods with rolling updates. The `Monitoring Stack` here represents the `ServiceMonitor` + Prometheus + Grafana pipeline kube-prometheus-stack deploys around the gateway - see [Observability](/observability) for the full setup, and the [Kubernetes Operator](/operator) for managing this topology declaratively as Custom Resources.
