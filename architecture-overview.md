---
title: Architecture Overview
description: How Inference Gateway is structured, how requests flow through optional OIDC auth and the proxy layer to upstream LLM providers, and how the gateway runs on Kubernetes.
---

# Architecture Overview

This document provides a high-level overview of the architecture of the Inference Gateway. The Inference Gateway is designed to be modular and extensible, allowing easy integration of new models and providers.

## General Overview

A unified OpenAI-compatible request enters the gateway, optionally clears OIDC authentication, fans out to a horizontally-scalable gateway tier, and is normalised through a single proxy layer before being dispatched to whichever upstream provider serves the requested model.

```mermaid
flowchart TD
    Client(["Clients &nbsp;/&nbsp; Agents"])
    Client -- "POST /v1/chat/completions" --> Auth
    Auth{{"Optional OIDC"}}
    Auth --> GW1
    Auth --> GW2
    Auth --> GW3
    GW1["Inference Gateway"]
    GW2["Inference Gateway"]
    GW3["Inference Gateway"]
    GW1 --> Proxy
    GW2 --> Proxy
    GW3 --> Proxy
    Proxy(["Provider Proxy"])

    subgraph Providers["LLM Providers"]
        direction LR
        OpenAI["OpenAI"]
        Anthropic["Anthropic"]
        Groq["Groq"]
        Cohere["Cohere"]
        Google["Google"]
        Ollama["Ollama"]
        DeepSeek["DeepSeek"]
        Cloudflare["Cloudflare"]
        Mistral["Mistral"]
        Moonshot["Moonshot"]
    end

    Proxy --> Providers

    classDef client fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#1f2937
    classDef auth fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f
    classDef gateway fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#ffffff
    classDef proxy fill:#a78bfa,stroke:#7c3aed,stroke-width:2px,color:#ffffff
    classDef provider fill:#f3f4f6,stroke:#9ca3af,stroke-width:1px,color:#1f2937

    class Client client
    class Auth auth
    class GW1,GW2,GW3 gateway
    class Proxy proxy
    class OpenAI,Anthropic,Groq,Cohere,Google,Ollama,DeepSeek,Cloudflare,Mistral,Moonshot provider
```

The gateway tier is stateless. Replicas can be scaled horizontally behind any load balancer; per-request state (tool-call iteration, MCP context, A2A delegation) lives in the request lifecycle, not the pod.

## Kubernetes Setup

The Inference Gateway is built to run on Kubernetes. Traffic flows from an ingress through a `Service` to a pool of stateless gateway pods, each fronting the same provider proxy. Telemetry is scraped on a dedicated metrics port via a `ServiceMonitor`, and providers stay external.

```mermaid
flowchart TD
    ExtClient(["External Clients &nbsp;/&nbsp; Agents"])

    subgraph Cluster["Kubernetes Cluster"]
        direction TB
        Ingress["Ingress &nbsp;/&nbsp; API Gateway"]
        Svc[["Gateway Service"]]
        IntClient(["Internal Clients &nbsp;/&nbsp; Agents"])

        Ingress --> Svc
        IntClient --> Svc

        Svc --> Pod1
        Svc --> Pod2
        Svc --> Pod3

        subgraph Pod1["Inference Gateway Pod"]
            IG1["Gateway"] --> PP1["Provider Proxy"]
        end
        subgraph Pod2["Inference Gateway Pod"]
            IG2["Gateway"] --> PP2["Provider Proxy"]
        end
        subgraph Pod3["Inference Gateway Pod"]
            IG3["Gateway"] --> PP3["Provider Proxy"]
        end

        Svc -. ":9464 /metrics" .-> SM["ServiceMonitor"]
        SM -. "scrape" .-> Prom["Prometheus"]
        Prom --> Graf["Grafana"]
    end

    subgraph Providers["External LLM Providers"]
        direction LR
        P_OpenAI["OpenAI"]
        P_Anthropic["Anthropic"]
        P_Groq["Groq"]
        P_Cohere["Cohere"]
        P_Google["Google"]
        P_Ollama["Ollama"]
        P_DeepSeek["DeepSeek"]
        P_Cloudflare["Cloudflare"]
        P_Mistral["Mistral"]
        P_Moonshot["Moonshot"]
    end

    ExtClient --> Ingress
    PP1 --> Providers
    PP2 --> Providers
    PP3 --> Providers

    classDef client fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#1f2937
    classDef ingress fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a
    classDef service fill:#bfdbfe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a
    classDef gateway fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#ffffff
    classDef proxy fill:#a78bfa,stroke:#7c3aed,stroke-width:2px,color:#ffffff
    classDef monitor fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f
    classDef provider fill:#f3f4f6,stroke:#9ca3af,stroke-width:1px,color:#1f2937

    class ExtClient,IntClient client
    class Ingress ingress
    class Svc service
    class IG1,IG2,IG3 gateway
    class PP1,PP2,PP3 proxy
    class SM,Prom,Graf monitor
    class P_OpenAI,P_Anthropic,P_Groq,P_Cohere,P_Google,P_Ollama,P_DeepSeek,P_Cloudflare,P_Mistral,P_Moonshot provider
```

Pods are interchangeable. Add capacity with an HPA; remove pods with rolling updates. The `ServiceMonitor` lets kube-prometheus-stack discover the metrics port without per-deployment scrape config. See [Observability](/observability) for the full Prometheus / Grafana / OTLP setup, and the [Kubernetes Operator](/operator) for managing this topology declaratively as Custom Resources.
