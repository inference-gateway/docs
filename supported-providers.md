---
title: Supported Providers
description: Provider matrix for Inference Gateway covering OpenAI, Anthropic, Cohere, Groq, Cloudflare, Ollama, Ollama Cloud, Google, DeepSeek, Mistral and Moonshot, with auth modes, default URLs, vision support, and per-provider request examples.
---

# Supported Providers

Inference Gateway provides a unified interface to interact with multiple LLM providers. This page details each supported provider, their configuration, and usage examples.

## Available Providers

| Provider     | Auth             | Default URL                                                     | Vision Support                                             |
| ------------ | ---------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| OpenAI       | Bearer Token     | `https://api.openai.com/v1`                                     | Yes - GPT-5 series, GPT-4.1, GPT-4o                        |
| DeepSeek     | Bearer Token     | `https://api.deepseek.com`                                      | No                                                         |
| Anthropic    | X-Header         | `https://api.anthropic.com/v1`                                  | Yes - Claude Opus 4.8, Claude Sonnet 4.6, Claude Haiku 4.5 |
| Cohere       | Bearer Token     | `https://api.cohere.ai`                                         | Yes - Command A Vision                                     |
| Groq         | Bearer Token     | `https://api.groq.com/openai/v1`                                | Yes - vision models                                        |
| Cloudflare   | Bearer Token     | `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai` | No                                                         |
| Ollama       | Optional API key | `http://ollama:8080/v1`                                         | Yes - LLaVA, Llama 4, Llama 3.2 Vision                     |
| Ollama Cloud | Bearer Token     | `https://ollama.com/v1`                                         | Yes - cloud-hosted vision models                           |
| Google       | Bearer Token     | `https://generativelanguage.googleapis.com/v1beta/openai`       | Yes - Gemini 3 Flash, Gemini 3 Pro                         |
| Mistral      | Bearer Token     | `https://api.mistral.ai/v1`                                     | Yes - Pixtral Large, Ministral 3, Mistral Large 3          |
| Moonshot     | Bearer Token     | `https://api.moonshot.ai/v1`                                    | No                                                         |

## Vision/Multimodal Support

Several providers support vision/multimodal capabilities, allowing you to process images alongside text. To use vision features, you must enable them in your configuration:

```bash
ENABLE_VISION=true
```

**Note:** Vision support is disabled by default for performance and security reasons. When disabled, requests containing image content will be rejected even if the model supports vision.

### Providers with Vision Support

- **OpenAI**: GPT-5 series, GPT-4.1, GPT-4o
- **Anthropic**: Claude Opus 4.8, Claude Sonnet 4.6, Claude Haiku 4.5
- **Google**: Gemini 3 Flash, Gemini 3 Pro
- **Cohere**: Command A Vision
- **Ollama**: LLaVA, Llama 4, Llama 3.2 Vision
- **Ollama Cloud**: Cloud-hosted vision models
- **Groq**: Vision models
- **Mistral**: Pixtral Large, Ministral 3, Mistral Large 3

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

Replace "PROVIDER" with the provider name (uppercase): OPENAI, ANTHROPIC, COHERE, GROQ, CLOUDFLARE, OLLAMA, OLLAMA_CLOUD, GOOGLE, DEEPSEEK, MISTRAL, MOONSHOT.

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
