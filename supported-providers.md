---
title: Supported Providers
description: Provider matrix for Inference Gateway covering OpenAI, Anthropic, Cohere, Groq, Cloudflare, Ollama, Ollama Cloud, Google, DeepSeek, Mistral, MiniMax, Moonshot and Nvidia, with auth modes, default URLs, vision support, and per-provider request examples.
---

# Supported Providers

Inference Gateway provides a unified interface to interact with multiple LLM providers. This page details each supported provider, their configuration, and usage examples.

## Available Providers

<!-- GENERATED:providers-table START (do not edit - run: task generate) -->

| Provider     | Auth             | Default URL                                                     | Vision Support                                                          |
| ------------ | ---------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| OpenAI       | Bearer Token     | `https://api.openai.com/v1`                                     | Yes - GPT-5 series, GPT-4.1, GPT-4o                                     |
| DeepSeek     | Bearer Token     | `https://api.deepseek.com`                                      | No                                                                      |
| Anthropic    | X-Header         | `https://api.anthropic.com/v1`                                  | Yes - Claude Opus 4.8, Claude Sonnet 4.6, Claude Haiku 4.5              |
| Cohere       | Bearer Token     | `https://api.cohere.ai`                                         | Yes - Command A Vision                                                  |
| Groq         | Bearer Token     | `https://api.groq.com/openai/v1`                                | Yes - vision models                                                     |
| Cloudflare   | Bearer Token     | `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai` | No                                                                      |
| Ollama       | Optional API key | `http://ollama:8080/v1`                                         | Yes - LLaVA, Llama 4, Llama 3.2 Vision                                  |
| Ollama Cloud | Bearer Token     | `https://ollama.com/v1`                                         | Yes - cloud-hosted vision models                                        |
| Google       | Bearer Token     | `https://generativelanguage.googleapis.com/v1beta/openai`       | Yes - Gemini 3 Flash, Gemini 3 Pro                                      |
| Mistral      | Bearer Token     | `https://api.mistral.ai/v1`                                     | Yes - Pixtral Large, Ministral 3, Mistral Large 3                       |
| MiniMax      | Bearer Token     | `https://api.minimax.io/v1`                                     | Yes - MiniMax-M3                                                        |
| Moonshot     | Bearer Token     | `https://api.moonshot.ai/v1`                                    | Yes - moonshot-v1-\*-vision-preview, kimi-latest, kimi-thinking-preview |
| NVIDIA       | Bearer Token     | `https://integrate.api.nvidia.com/v1`                           | Yes - Nemotron, Llama, DeepSeek, Mistral, Qwen                          |
| llama.cpp    | Optional API key | `http://llamacpp:8080/v1`                                       | Yes - multimodal GGUF models (via --mmproj)                             |
| Z-AI         | Bearer Token     | `https://api.z.ai/v1`                                           | Yes - GLM 5.2                                                           |

<!-- GENERATED:providers-table END (do not edit - run: task generate) -->

## Vision/Multimodal Support

Several providers support vision/multimodal capabilities, allowing you to process images alongside text. To use vision features, you must enable them in your configuration:

```bash
ENABLE_VISION=true
```

**Note:** Vision support is disabled by default for performance and security reasons. When disabled, requests containing image content will be rejected even if the model supports vision.

### Providers with Vision Support

<!-- GENERATED:vision-list START (do not edit - run: task generate) -->

- **OpenAI**: GPT-5 series, GPT-4.1, GPT-4o
- **Anthropic**: Claude Opus 4.8, Claude Sonnet 4.6, Claude Haiku 4.5
- **Cohere**: Command A Vision
- **Groq**: vision models
- **Ollama**: LLaVA, Llama 4, Llama 3.2 Vision
- **Ollama Cloud**: cloud-hosted vision models
- **Google**: Gemini 3 Flash, Gemini 3 Pro
- **Mistral**: Pixtral Large, Ministral 3, Mistral Large 3
- **MiniMax**: MiniMax-M3
- **Moonshot**: moonshot-v1-\*-vision-preview, kimi-latest, kimi-thinking-preview
- **NVIDIA**: Nemotron, Llama, DeepSeek, Mistral, Qwen
- **llama.cpp**: multimodal GGUF models (via --mmproj)
- **Z-AI**: GLM 5.2

<!-- GENERATED:vision-list END (do not edit - run: task generate) -->

### Example Vision Request

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
              "url": "https://example.com/image.jpg"
            }
          }
        ]
      }
    ]
  }'
```

## Using Providers

### Provider Configuration

Each provider requires specific configuration through environment variables:

- `PROVIDER_API_URL`: The base URL for the provider's API
- `PROVIDER_API_KEY`: The authentication key for the provider

<!-- GENERATED:provider-uppercase START (do not edit - run: task generate) -->

Replace "PROVIDER" with the provider name (uppercase): OPENAI, DEEPSEEK, ANTHROPIC, COHERE, GROQ, CLOUDFLARE, OLLAMA, OLLAMA_CLOUD, GOOGLE, MISTRAL, MINIMAX, MOONSHOT, NVIDIA, LLAMACPP, ZAI.

<!-- GENERATED:provider-uppercase END (do not edit - run: task generate) -->

### API Endpoints

Inference Gateway offers two main approaches to interact with providers:

#### 1. Unified Generate API

The unified API allows you to generate content with a consistent interface across all providers:

```http
POST /v1/chat/completions
Content-Type: application/json

{
  "model": "MODEL_NAME",
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

#### 2. Provider Proxy

You can also proxy requests directly to the provider's native API:

```bash
POST /proxy/{provider}/{path}
Content-Type: application/json

// Provider-specific request body
```

## Provider-Specific Examples

### OpenAI Provider

Generate content with OpenAI models:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5",
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
  }'
```

List all available models:

```bash
curl http://localhost:8080/v1/models
```

### DeepSeek Provider

Generate content with DeepSeek models:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek/deepseek-v4-pro",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "What is the capital of France?"
      }
    ]
  }'
```

List available models:

```bash
curl http://localhost:8080/v1/models?provider=deepseek
```

### Anthropic Provider

Generate content with Anthropic Claude models:

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
        "content": "Explain quantum computing in simple terms."
      }
    ]
  }'
```

List available models:

```bash
curl http://localhost:8080/v1/models?provider=anthropic
```

### Cohere Provider

Generate content with Cohere models:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "cohere/command-a-03-2025",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Write a short poem about AI."
      }
    ]
  }'
```

### Groq Provider

Generate content with Groq's high-performance models:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "groq/llama-3.3-70b-versatile",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "What are the benefits of quantum computing?"
      }
    ]
  }'
```

### Cloudflare Provider

Generate content with Cloudflare Workers AI:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "cloudflare/@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Explain how neural networks work."
      }
    ]
  }'
```

### Ollama Provider

Generate content with locally-hosted Ollama models:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "ollama/llama3.3",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Write a function to calculate Fibonacci numbers in Python."
      }
    ]
  }'
```

### Ollama Cloud Provider

Generate content with Ollama's cloud-hosted models:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "ollama_cloud/gpt-oss:120b",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Summarize the benefits of running models in the cloud."
      }
    ]
  }'
```

### Google Provider

Generate content with Google's Gemini models:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemini-3-flash",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Explain the concept of machine learning in simple terms."
      }
    ]
  }'
```

> **Note:** The default Google base URL ends in `/v1beta/openai`, which is Google's OpenAI-compatible endpoint. The gateway speaks the OpenAI protocol (`/chat/completions`, `/models`), so this suffix is required for routing to work. It is distinct from Google's native Gemini API at `/v1`, which uses a different request/response format and is not OpenAI-compatible. Keep the `/v1beta/openai` suffix when overriding `GOOGLE_API_URL`.

### Mistral Provider

Generate content with Mistral AI models:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral/mistral-large-3",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Explain the differences between supervised and unsupervised learning."
      }
    ]
  }'
```

### Moonshot Provider

Generate content with Moonshot AI models:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "moonshot/kimi-k2-thinking",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "What are the key principles of clean code?"
      }
    ]
  }'
```

Generate content with a Moonshot vision model, using an image URL:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "moonshot/kimi-latest",
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
              "url": "https://example.com/image.jpg"
            }
          }
        ]
      }
    ]
  }'
```

### NVIDIA Provider

Generate content with NVIDIA NIM models hosted on the build.nvidia.com API catalog:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nvidia/meta/llama-3.1-8b-instruct",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Explain the concept of GPU acceleration."
      }
    ]
  }'
```

List available models:

```bash
curl http://localhost:8080/v1/models?provider=nvidia
```

> **Note:** NVIDIA is additive alongside Groq. Groq provides ultra-low-latency inference via LPU hardware, while NVIDIA offers a broad GPU-served catalog including Nemotron, Llama, DeepSeek, Mistral, and Qwen. They are complementary providers.

### llama.cpp Provider

Generate content with self-hosted GGUF models via llama.cpp's `llama-server`:

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

List available models:

```bash
curl http://localhost:8080/v1/models?provider=llamacpp
```

### Z-AI Provider

Generate content with Z-AI models for direct access to open-weight models like GLM:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "zai/glm-5.2",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Explain the benefits of open-weight models."
      }
    ]
  }'
```

List available models:

```bash
curl http://localhost:8080/v1/models?provider=zai
```
