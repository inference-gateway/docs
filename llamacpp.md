---
title: llama.cpp Provider
description: Configure and use llama.cpp as an Inference Gateway provider for self-hosted GGUF models via llama-server's OpenAI-compatible API.
---

# llama.cpp Provider

[llama.cpp](https://github.com/ggml-org/llama.cpp) is a high-performance C/C++ inference engine for running GGUF-format LLMs on CPU, GPU, and Apple Silicon. Its built-in `llama-server` exposes an OpenAI-compatible HTTP API, making it a drop-in provider for Inference Gateway.

## Provider Details

| Attribute         | Value                                                                        |
| ----------------- | ---------------------------------------------------------------------------- |
| Provider prefix   | `llamacpp` (e.g. `llamacpp/llama-3.2-3b-instruct`)                           |
| Default URL       | `http://llamacpp:8000/v1`                                                    |
| Auth type         | Bearer token (optional - `--api-key` can be enabled on `llama-server`)       |
| Vision support    | Yes (via `--mmproj`)                                                         |
| API compatibility | OpenAI-compatible (chat completions, models list, SSE streaming, embeddings) |

## Configuration

Set the following environment variables to configure the llama.cpp provider:

| Variable           | Default                   | Description                                                       |
| ------------------ | ------------------------- | ----------------------------------------------------------------- |
| `LLAMACPP_API_URL` | `http://llamacpp:8000/v1` | Base URL of the llama.cpp server                                  |
| `LLAMACPP_API_KEY` | `""`                      | API key (required if `llama-server` was started with `--api-key`) |

### Basic Configuration

```bash
export LLAMACPP_API_URL=http://llamacpp:8000/v1
# Optional: set an API key if llama-server was started with --api-key
export LLAMACPP_API_KEY=your-api-key
```

### Docker Compose

Run `llama-server` alongside Inference Gateway:

```yaml
services:
  inference-gateway:
    image: ghcr.io/inference-gateway/inference-gateway:latest
    environment:
      - LLAMACPP_API_URL=http://llamaserver:8000/v1
    ports:
      - '8080:8080'

  llamaserver:
    image: ghcr.io/ggml-org/llama.cpp:full
    command:
      - --server
      - --model
      - /models/llama-3.2-3b-instruct.Q4_K_M.gguf
      - --host
      - 0.0.0.0
      - --port
      - '8000'
    volumes:
      - ./models:/models
    ports:
      - '8000:8000'
```

## Usage

### Chat Completions

Send a chat completion request to a model served by `llama-server`:

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

### Streaming

SSE streaming works out of the box:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llamacpp/llama-3.2-3b-instruct",
    "messages": [
      {
        "role": "user",
        "content": "Write a short poem about llamas."
      }
    ],
    "stream": true
  }'
```

### List Models

A single `llama-server` instance typically serves one loaded model. List it through the gateway:

```bash
curl http://localhost:8080/v1/models?provider=llamacpp
```

### Vision / Multimodal

If `llama-server` was started with a multimodal projection (`--mmproj`), you can send image content. First enable vision support:

```bash
export ENABLE_VISION=true
```

Then send a vision request:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llamacpp/llama-3.2-11b-vision-instruct",
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

### Embeddings

llama.cpp supports embedding generation when the model is loaded with `--embeddings`:

```bash
curl -X POST http://localhost:8080/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llamacpp/llama-3.2-3b-instruct",
    "input": "The quick brown fox jumps over the lazy dog"
  }'
```

### Tool / Function Calling

Recent versions of llama.cpp support tool/function calling when started with `--jinja`. Quality varies by model and template:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llamacpp/llama-3.2-3b-instruct",
    "messages": [
      {
        "role": "user",
        "content": "What is the weather in Paris?"
      }
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get the current weather for a city",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "The city name"
              }
            },
            "required": ["location"]
          }
        }
      }
    ]
  }'
```

## Starting llama-server

Here are common ways to start `llama-server` with different configurations:

### Basic (CPU inference)

```bash
llama-server --model /path/to/model.gguf --host 0.0.0.0 --port 8000
```

### With GPU acceleration (CUDA)

```bash
llama-server --model /path/to/model.gguf --host 0.0.0.0 --port 8000 -ngl 99
```

### With vision support

```bash
llama-server --model /path/to/model.gguf --mmproj /path/to/mmproj-model.bin --host 0.0.0.0 --port 8000
```

### With API key authentication

```bash
llama-server --model /path/to/model.gguf --host 0.0.0.0 --port 8000 --api-key your-secret-key
```

### With tool calling support

```bash
llama-server --model /path/to/model.gguf --host 0.0.0.0 --port 8000 --jinja
```

## Notes

- A single `llama-server` instance typically serves one loaded model at a time. The `/v1/models` endpoint lists just that model.
- For multiple models, run separate `llama-server` instances on different ports and configure multiple provider entries, or use a model loader like [llama-swap](https://github.com/mostlygeek/llama-swap).
- The provider prefix is `llamacpp` (not `llama.cpp`) to match the gateway's provider identifier convention.
- Embeddings require the model to be loaded with `--embeddings` on `llama-server`.
- Tool/function calling requires `--jinja` and works best with instruction-tuned models.
