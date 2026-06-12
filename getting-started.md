---
title: Getting Started
description: Install Inference Gateway with Docker, Docker Compose, or Kubernetes and send your first chat completion request.
---

# Getting Started

Learn how to install and set up Inference Gateway.

## Installation

### Using Docker

```bash
docker pull ghcr.io/inference-gateway/inference-gateway:latest
docker run --rm -it -p 8080:8080 -e OPENAI_API_KEY=your_key_here ghcr.io/inference-gateway/inference-gateway:latest
```

### Using Docker Compose

Checkout the examples in the [Docker Compose examples](https://github.com/inference-gateway/inference-gateway/tree/main/examples/docker-compose).

### Using Kubernetes

Deploy to Kubernetes with the [Kubernetes Operator](/operator/) - the recommended path. It manages the gateway and related resources declaratively as Custom Resources. Follow the [Operator quick start](/operator/#quick-start-minimal-gateway) to apply your first `Gateway`, or browse the runnable [Kubernetes examples](https://github.com/inference-gateway/inference-gateway/tree/main/examples/kubernetes).

The [Helm chart](/deployment/) is deprecated and kept only for existing installs.

## Basic Usage

Send a request to the Inference Gateway:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
-d '{
"model": "deepseek/deepseek-v4-flash",
"messages": [
        {
            "role": "system",
            "content": "You are a helpful assistant."
        },
        {
            "role": "user",
            "content": "Hello, world!"
        }
    ]
}
```

## Next steps

- Explore the [Architecture Overview](/architecture-overview/) to see how requests flow through the gateway.
- Connect tools and data sources with [MCP Integration](/mcp/), or coordinate specialized agents with [A2A Integration](/a2a/).
- **Define an agent as code** with the [Agent Definition Language (ADL)](/adl/), then scaffold a Go or Rust A2A server using the [ADL CLI](/adl-cli/).
