---
title: Examples
description: End-to-end examples for running Inference Gateway with Docker Compose and Kubernetes, plus per-provider chat completion examples and vision/multimodal request samples.
---

# Examples

This page provides examples of how to use Inference Gateway in various scenarios and environments.

## Docker Compose Examples

Docker Compose provides a simple way to set up Inference Gateway with various configurations.

### Basic Setup

A minimal setup with OpenAI integration:

```yaml
services:
  inference-gateway:
    image: ghcr.io/inference-gateway/inference-gateway:latest
    environment:
      - OPENAI_API_KEY=your-api-key
    ports:
      - '8080:8080'
```

For more [Docker Compose examples](https://github.com/inference-gateway/inference-gateway/tree/main/examples/docker-compose), check the official examples repository.

## Kubernetes Examples

Deploy Inference Gateway on Kubernetes with these example configurations.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inference-gateway
spec:
  replicas: 2
  selector:
    matchLabels:
      app: inference-gateway
  template:
    metadata:
      labels:
        app: inference-gateway
    spec:
      containers:
        - name: inference-gateway
          image: ghcr.io/inference-gateway/inference-gateway:latest
          ports:
            - containerPort: 8080
          env:
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: llm-secrets
                  key: openai-api-key
```

For complete Kubernetes deployment examples including Services, ConfigMaps, and Secrets, visit the [Kubernetes examples](https://github.com/inference-gateway/inference-gateway/tree/main/examples/kubernetes) in the GitHub repository.

## API Usage Examples

### Create Chat Completions with OpenAI

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-5",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Explain how Inference Gateway works."
      }
    ]
  }'
```

### Create Chat Completions with Anthropic

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "anthropic/claude-opus-4-8",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Compare and contrast different LLM providers."
      }
    ]
  }'
```

### Create Chat Completions with llama.cpp

Generate content with a self-hosted GGUF model via llama.cpp's `llama-server`:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llamacpp/llama-3.2-3b-instruct",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Explain how llama.cpp works in simple terms."
      }
    ]
  }'
```

### Vision/Multimodal Image Processing

Process images with vision-capable models. First, enable vision support:

```bash
ENABLE_VISION=true
```

#### Using HTTP Image URL

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "anthropic/claude-opus-4-8",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "What is in this image?"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
            }
          }
        ]
      }
    ]
  }'
```

#### Using Base64 Data URL

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "anthropic/claude-opus-4-8",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "What color is this pixel?"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
            }
          }
        ]
      }
    ]
  }'
```

**Supported Vision Models:**

- `anthropic/claude-opus-4-8`
- `openai/gpt-5`
- `google/gemini-3-flash`
- `ollama/llava`
- And more...

For more detailed examples and use cases, check out the full [examples directory](https://github.com/inference-gateway/inference-gateway/tree/main/examples) in the GitHub repository.
