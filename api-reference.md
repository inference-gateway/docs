---
title: REST API Reference
description: Full REST API reference for Inference Gateway, including chat completions, streaming over SSE, tool calls, vision input, the proxy endpoint, and the OpenAPI schemas.
---

# API Reference

Inference Gateway provides a RESTful API for interacting with language models from various providers. This reference documents all available endpoints, request formats, and response structures.

## Base URL

All API endpoints are relative to your Inference Gateway installation URL. By default, this is `http://localhost:8080` when running locally.

## Authentication

If authentication is enabled (`AUTH_ENABLE=true`), all requests must include a bearer token:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

The JWT token is issued by the configured Identity Provider (IdP) as specified in the OpenID Connect settings (`AUTH_OIDC_ISSUER`, `AUTH_OIDC_CLIENT_ID`, etc.). Inference Gateway validates these tokens against the IdP to authenticate requests.

## API Endpoints

### List All Models

Get a list of all available language models across all configured providers.

```http
GET /v1/models
```

**Query Parameters:**

| Parameter | Type     | Required | Description                                                                                                                                                                                                                                                               |
| --------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `include` | `string` |          | Comma-separated list of additional metadata keys to include per model. Supported keys: `context_window`, `pricing`. Unknown keys return `400 Bad Request`. Keys are trimmed and de-duplicated. When omitted, the response is byte-for-byte unchanged (OpenAI-compatible). |

**Response** (`ListModelsResponse`):

```http
Status: 200 OK
Content-Type: application/json

{
  "object": "list",
  "data": [
    {
      "id": "gpt-5",
      "object": "model",
      "created": 1741879542,
      "owned_by": "openai",
      "served_by": "openai",
    },
    {
      "id": "claude-opus-4-8",
      "object": "model",
      "created": 1741879542,
      "owned_by": "anthropic",
      "served_by": "anthropic",
    },
    {
      "id": "llama-3.3-70b-versatile",
      "object": "model",
      "created": 1741879542,
      "owned_by": "Meta",
      "served_by": "groq",
    }
    ...
  ]
}
```

The response body conforms to the `ListModelsResponse` schema, where `data` is an array of `Model` objects.

**Examples with `include`:**

Request additional metadata fields per model:

```http
GET /v1/models?include=context_window
```

```http
GET /v1/models?include=pricing,context_window
```

When `include` is specified, each `Model` object includes the requested fields. Requested-but-unresolved keys are returned as an explicit `null` (present, not absent), so clients can distinguish "not requested" from "requested but unavailable".

The `context_window` field resolves in the following order (first hit wins):

1. **`runtime`** - the serving runtime's configured window (e.g. llama.cpp `--ctx-size` / `/props` n_ctx, Ollama `num_ctx` / `context_length`). This can be smaller than the model's theoretical maximum and is the limit clients must respect.
2. **`provider`** - a window published by the upstream provider in its model listing (e.g. Mistral `max_context_length`, Cohere `context_length`).
3. **`community`** - a window from a table synced from the community-maintained [models.dev](https://models.dev) dataset (its `[limit]` section) and committed in the gateway repository. Maintainers refresh the table with `task contextwindow:sync` in the gateway repository (separate from `task pricing:sync`). Community limits can be conservative or tier-specific (e.g. free-tier listings below a model's native window), which is why runtime and provider values take precedence.
4. **`null`** - no window could be resolved from any source; a slow or failing lookup also resolves to `null` without failing the request. Local providers (`ollama`, `llamacpp`) are intentionally absent from the community table, so their models return an explicit `null` unless the runtime reports a window.

Example response for a llama.cpp model with a reduced `--ctx-size` of 4096:

```http
Status: 200 OK
Content-Type: application/json

{
  "object": "list",
  "data": [
    {
      "id": "llama-3.1-8b-instruct",
      "object": "model",
      "created": 1741879542,
      "owned_by": "Meta",
      "served_by": "llamacpp",
      "context_window": {
        "tokens": 4096,
        "source": "runtime"
      },
      "pricing": null
    }
  ]
}
```

The `pricing` field resolves in the following order (first hit wins):

1. **`provider`** - rates published by the upstream provider's model listing. If the provider publishes any per-token rate, provider pricing wins outright; the gateway never fills gaps with community rates.
2. **`community`** - rates from a table synced from the community-maintained [models.dev](https://models.dev) dataset and committed in the gateway repository. Free-tier models carry explicit `"0"` rates. Lookups tolerate common model-ID variants (Google's `models/` prefix, `-latest` aliases, and `-YYYYMMDD` date pins). Maintainers refresh the table with `task pricing:sync` in the gateway repository.
3. **`null`** - no pricing could be resolved. Local providers (`ollama`, `llamacpp`) are intentionally absent from the community table, and models with no per-token rate (e.g. subscription-gated models) also return an explicit `null`.

Monetary values are USD per-token decimal strings (e.g. `"0.00000027"`) to avoid floating-point precision loss. Rates the source does not publish are omitted entirely (never `0` or `null`).

Example response for an OpenAI model with `include=pricing`:

```http
GET /v1/models?include=pricing
```

```http
Status: 200 OK
Content-Type: application/json

{
  "object": "list",
  "data": [
    {
      "id": "gpt-5",
      "object": "model",
      "created": 1741879542,
      "owned_by": "openai",
      "served_by": "openai",
      "pricing": {
        "currency": "USD",
        "input_per_token": "0.00000250",
        "output_per_token": "0.00001000",
        "cache_read_per_token": "0.00000125",
        "source": "provider",
        "updated_at": "2026-07-20T00:00:00Z"
      }
    },
    {
      "id": "gpt-5-mini",
      "object": "model",
      "created": 1741879542,
      "owned_by": "openai",
      "served_by": "openai",
      "pricing": {
        "currency": "USD",
        "input_per_token": "0.00000015",
        "output_per_token": "0.00000060",
        "source": "community"
      }
    }
  ]
}
```

In this example, `gpt-5` carries provider-published rates while `gpt-5-mini` fell back to the community table (`source: "community"`; community entries omit `updated_at`).

Models with no resolvable per-token pricing - locally hosted models, subscription-gated models, or anything absent from both the provider listing and the community table - return `"pricing": null`.

### List Provider Models

Get a list of available models for a specific provider. The `include` parameter can be combined with `provider`.

```http
GET /v1/models?provider={provider}
```

where `{provider}` is one of: `openai`, `anthropic`, `cohere`, `groq`, `cloudflare`, `ollama`, `ollama_cloud`, `google`, `deepseek`, `mistral`, `minimax`, `moonshot`, `nvidia`.

**Query Parameters:**

| Parameter  | Type     | Required | Description                                                                                |
| ---------- | -------- | -------- | ------------------------------------------------------------------------------------------ |
| `provider` | `string` |          | Filter models by provider                                                                  |
| `include`  | `string` |          | Comma-separated list of additional metadata keys (see [List All Models](#list-all-models)) |

**Example:**

```http
GET /v1/models?provider=deepseek&include=pricing,context_window
```

**Response** (`ListModelsResponse`):

```http
Status: 200 OK
Content-Type: application/json

{
  "provider": "openai",
  "object": "list",
  "data": [
    {
      "id": "gpt-5",
      "object": "model",
      "created": 1741879542,
      "owned_by": "openai",
      "served_by": "openai",
    },
    {
      "id": "gpt-5-mini",
      "object": "model",
      "created": 1741879542,
      "owned_by": "openai",
      "served_by": "openai",
    }
  ]
}
```

### Chat Completions

Chat Completions using a specific provider's language model.

```http
POST /v1/chat/completions?provider={provider}
```

#### Request Body (`CreateChatCompletionRequest`)

The request body conforms to the `CreateChatCompletionRequest` schema:

```json
{
  "model": "ollama/deepseek-r1:1.5b",
  "messages": [
    {
      "role": "system",
      "content": "Hi, how are you doing today?"
    }
  ],
  "stream": false,
  "stream_options": {
    "include_usage": true
  },
  "max_completion_tokens": 1000,
  "temperature": 1,
  "top_p": 1,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "string",
        "description": "string",
        "parameters": {
          "type": "object",
          "properties": {},
          "required": []
        }
      }
    }
  ]
}
```

**Response** (`CreateChatCompletionResponse`):

```http
Status: 200 OK
Content-Type: application/json

{
  "id": "chatcmpl-753",
  "object": "chat.completion",
  "created": 1741879542,
  "model": "deepseek-r1:1.5b",
  "choices": [
    {
      "index": 0,
      "message": {
        "content": "Hello! How are you doing today?",
        "role": "assistant"
      },
      "finish_reason": "length"
    }
  ],
  "usage": {
    "prompt_tokens": 40,
    "completion_tokens": 40,
    "total_tokens": 80
  }
}
```

The response body conforms to the `CreateChatCompletionResponse` schema. Each element of `choices` is a `ChatCompletionChoice` with a `finish_reason` field of type `FinishReason`. The `usage` field is a `CompletionUsage` object reporting token counts.

#### Message Content Shapes

The `MessageContent` field in a `Message` can be either a plain string or an array of `ContentPart` objects for multimodal requests. Each `ContentPart` is one of:

- **`TextContentPart`** - `{ "type": "text", "text": "..." }`
- **`ImageContentPart`** - `{ "type": "image_url", "image_url": { ... } }` where `image_url` is an `ImageURL` object

The `MessageRole` type constrains the `role` field of a `Message` to one of: `"system"`, `"user"`, `"assistant"`, or `"tool"`.

```json
[
  {
    "type": "text",
    "text": "Describe this image"
  },
  {
    "type": "image_url",
    "image_url": {
      "url": "https://example.com/image.png"
    }
  }
]
```

### Streaming Response

When `stream: true` is specified, responses are streamed as [Server Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) objects. Each event is an `SSEvent` with a `data` field containing a `CreateChatCompletionStreamResponse` payload.

You can control streaming behaviour with `ChatCompletionStreamOptions` (e.g., `include_usage: true` to receive a final `CompletionUsage` chunk):

```http
curl -X POST http://localhost:8080/v1/chat/completions\?provider\=ollama -d '{
  "model": "deepseek-r1:1.5b",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hi, how are you doing today?"
    }
  ],
  "stream": true,
  "stream_options": {
    "include_usage": true
  },
  "max_completion_tokens": 40
}'
```

**Response** (`CreateChatCompletionStreamResponse`):

```http
Status: 200 OK
Content-Type: text/event-stream

data: {"id":"chatcmpl-509","object":"chat.completion.chunk","created":1742481679,"model":"deepseek-r1:1.5b","system_fingerprint":"fp_ollama","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-509","object":"chat.completion.chunk","created":1742481691,"model":"deepseek-r1:1.5b","system_fingerprint":"fp_ollama","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":"length"}]}

data: {"id":"chatcmpl-509","object":"chat.completion.chunk","created":1742481691,"model":"deepseek-r1:1.5b","system_fingerprint":"fp_ollama","choices":[],"usage":{"prompt_tokens":17,"completion_tokens":40,"total_tokens":57}}

data: [DONE]
```

Each line is an `SSEvent` whose `data` field is a `CreateChatCompletionStreamResponse`. The `choices` array contains `ChatCompletionStreamChoice` objects. Each choice has a `delta` field of type `ChatCompletionStreamResponseDelta`. When a tool call streams in chunks, the delta may include a `tool_calls` array of `ChatCompletionMessageToolCallChunk` objects.

Note that the final message contains the `CompletionUsage` metrics of the token completion (when `stream_options.include_usage` is `true`).

### Proxy Requests

Pass requests directly through to provider APIs. The response body is a `ProviderSpecificResponse` - the exact shape depends on the upstream provider. Each provider uses a `ProviderAuthType` to authenticate: `Bearer Token`, `X-Header`, or none.

```http
{METHOD} /proxy/{provider}/{path}
```

Where:

- `{METHOD}` is any HTTP method (GET, POST, PUT, DELETE, PATCH)
- `{provider}` is one of the supported providers
- `{path}` is the path to proxy to the provider API

#### Example: OpenAI Chat Completion

```http
POST /proxy/openai/v1/chat/completions
Content-Type: application/json

{
  "model": "gpt-5",
  "messages": [
    {
      "role": "user",
      "content": "Hello! How can I assist you today?"
    }
  ],
  "temperature": 0.7
}
```

### Health Check

Check if the Inference Gateway service is running.

```http
GET /health
```

**Response**:

```http
Status: 200 OK
```

### Push Metrics (OTLP)

Push usage metrics to the gateway via the OTLP/HTTP protocol. This endpoint is intended for subscription clients that bypass the gateway's inference path.

```http
POST /v1/metrics
```

**Opt-in**: This endpoint requires both `TELEMETRY_ENABLE=true` and `TELEMETRY_METRICS_PUSH_ENABLE=true`. Returns `403 Forbidden` when disabled.

**Authentication**: When OIDC auth is enabled (`AUTH_ENABLE=true`), this endpoint requires a valid bearer token.

**Request Body** (`ExportMetricsServiceRequest`):

The request body is an OTLP `ExportMetricsServiceRequest` encoded as either:

- `application/x-protobuf` — binary protobuf encoding
- `application/json` — JSON encoding via protojson

Gzip compression is supported via the `Content-Encoding: gzip` header. The maximum decoded payload size is 4 MiB.

```bash
curl -X POST http://localhost:8080/v1/metrics \
  -H 'Content-Type: application/json' \
  -d '{
    "resourceMetrics": [{
      "resource": {
        "attributes": [{ "key": "service.name", "value": { "stringValue": "infer-cli" } }]
      },
      "scopeMetrics": [{
        "metrics": [{
          "name": "gen_ai.client.token.usage",
          "sum": {
            "aggregationTemporality": 1,
            "dataPoints": [{
              "asInt": "1234",
              "attributes": [
                { "key": "gen_ai.provider.name", "value": { "stringValue": "anthropic" } },
                { "key": "gen_ai.token.type", "value": { "stringValue": "input" } },
                { "key": "source", "value": { "stringValue": "infer-cli" } }
              ]
            }]
          }
        }]
      }]
    }]
  }'
```

**Response** (`ExportMetricsServiceResponse`):

```http
Status: 200 OK
Content-Type: application/json

{
  "partialSuccess": {
    "rejectedDataPoints": "0",
    "errorMessage": ""
  }
}
```

If any data points were rejected (e.g. unsupported metric names, wrong temporality), the response includes `partial_success` details:

```http
Status: 200 OK
Content-Type: application/json

{
  "partialSuccess": {
    "rejectedDataPoints": "2",
    "errorMessage": "unsupported metric \"bogus\"; metric \"gen_ai.client.token.usage\": only delta temporality is supported"
  }
}
```

**Error status codes**:

| Status | Description                                                                       |
| ------ | --------------------------------------------------------------------------------- |
| `400`  | Malformed payload or invalid gzip data                                            |
| `401`  | Missing or invalid authentication                                                 |
| `403`  | Metrics push is not enabled                                                       |
| `413`  | Payload exceeds 4 MiB limit                                                       |
| `415`  | Unsupported content type (must be `application/x-protobuf` or `application/json`) |

## Error Responses

When an error occurs, the API returns an appropriate HTTP status code with an error message:

```http
{
  "error": "Error message description"
}
```

Common error status codes

- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication
- `500 Internal Server Error` - Server-side error

## Advanced Features

### Streaming Responses

You can stream responses from supported providers by setting the `stream` parameter to `true`:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek/deepseek-v4-flash",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Write a story about a space explorer."
      }
    ],
    "stream": true
  }'
```

### Tool Use

For providers that support function calling (like OpenAI and Anthropic), you can use the `tools` parameter. Each element of the `tools` array is a `ChatCompletionTool` with a `type` field of `ChatCompletionToolType` (currently `"function"`) and a `function` field of type `FunctionObject`. The `FunctionObject` contains a `parameters` field of type `FunctionParameters` (a JSON Schema definition).

When the model decides to call a tool, the response `ChatCompletionChoice` (or the corresponding `ChatCompletionStreamChoice` in streaming mode) will include a `tool_calls` array of `ChatCompletionMessageToolCall` objects. Each `ChatCompletionMessageToolCall` has a `function` field of type `ChatCompletionMessageToolCallFunction` that holds the called function name and arguments.

If additional metadata is attached to a tool call (for example, extended thinking traces), it is represented as a `ToolCallExtraContent` object alongside the call.

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek/deepseek-v4-flash",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
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
          "description": "Get the current weather in a location",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "The city and state, e.g. San Francisco, CA"
              }
            },
            "required": ["location"]
          }
        }
      }
    ]
  }'
```

### Controlling Tool Selection

By default the model decides whether to call a tool (`tool_choice` defaults to `"auto"` when `tools` are present). Use `tool_choice` to override that: `"none"` forces a plain text reply, `"required"` forces at least one tool call, and a named function forces that specific call. The model can return several tool calls in one turn; set `parallel_tool_calls` to `false` to force them one at a time.

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-5",
    "messages": [{ "role": "user", "content": "What is the weather in Paris?" }],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get the current weather in a location",
          "parameters": {
            "type": "object",
            "properties": { "location": { "type": "string" } },
            "required": ["location"]
          }
        }
      }
    ],
    "tool_choice": { "type": "function", "function": { "name": "get_weather" } }
  }'
```

### Structured Outputs

Use `response_format` to constrain the shape of the response. `{ "type": "json_object" }` enables the older JSON mode, while `{ "type": "json_schema", ... }` enables Structured Outputs, which makes the model match a JSON Schema you supply. Set `strict: true` to enforce exact schema adherence.

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-5",
    "messages": [{ "role": "user", "content": "Extract the name and age from: Ada is 36." }],
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "person",
        "strict": true,
        "schema": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "age": { "type": "integer" }
          },
          "required": ["name", "age"],
          "additionalProperties": false
        }
      }
    }
  }'
```

### Reasoning Effort

For reasoning-capable models, `reasoning_effort` trades reasoning depth for latency and token cost. Supported values are `minimal`, `low`, `medium`, and `high`; lower effort yields faster responses with fewer reasoning tokens. Pair it with `reasoning_format` (`raw` or `parsed`) to control how the reasoning is returned.

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek/deepseek-reasoner",
    "messages": [{ "role": "user", "content": "How many r are in strawberry?" }],
    "reasoning_effort": "low",
    "reasoning_format": "parsed"
  }'
```

### Vision/Multimodal Support

For vision-capable models, you can include images in your requests using either HTTP URLs or base64-encoded data URLs. Vision support must be enabled with `ENABLE_VISION=true` in your configuration.

The `messages[].content` field accepts an array of `ContentPart` objects. Use a `TextContentPart` for text and an `ImageContentPart` for images. The `image_url` inside an `ImageContentPart` is an `ImageURL` object with a `url` field that accepts either an HTTPS URL or a `data:` URI.

#### Using HTTP URL

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
            "text": "Describe this image"
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

**Supported Providers with Vision:**

- OpenAI (GPT-5 series, GPT-4.1, GPT-4o)
- Anthropic (Claude Opus 4.8, Claude Sonnet 4.6, Claude Haiku 4.5)
- Google (Gemini 3 Flash, Gemini 3 Pro)
- Cohere (Command A Vision)
- Ollama (LLaVA, Llama 4, Llama 3.2 Vision)
- Groq (vision models)
- Mistral (Pixtral Large, Ministral 3, Mistral Large 3)
- Moonshot (Kimi K2, Kimi K2 Thinking)
- NVIDIA (Nemotron, Llama, DeepSeek, Mistral, Qwen)

**Note:** When `ENABLE_VISION=false` (default), requests containing image content will be rejected even if the model supports vision. This is disabled by default for performance and security reasons.

### Direct API Proxy

For more advanced use cases, you can proxy requests directly to the provider's API. The proxied response is a `ProviderSpecificResponse` whose shape is determined by the upstream provider. The authentication method used is the `ProviderAuthType` configured for that provider.

```bash
curl -X POST http://localhost:8080/proxy/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

## Schema Reference

This section documents each request and response schema defined in the [OpenAPI specification](https://github.com/inference-gateway/schemas/blob/main/openapi.yaml).

### Models and Providers

#### `Model`

A model descriptor returned in the `data` array of a `ListModelsResponse`.

| Field            | Type               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | `string`           | Model identifier (e.g., `"gpt-5"`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `object`         | `string`           | Always `"model"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `created`        | `integer`          | Unix timestamp of model creation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `owned_by`       | `string`           | Organization that owns the model                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `served_by`      | `string`           | Provider serving the model                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `context_window` | `object` \| `null` | Context window object with `tokens` (int) and `source` (`"runtime"`, `"provider"`, or `"community"`). Only present when `include=context_window` is requested. Resolution order, first hit wins: (1) `runtime` - the serving runtime's configured window (e.g. llama.cpp `--ctx-size`, Ollama `num_ctx`), (2) `provider` - the upstream provider's published window, (3) `community` - a window from a table synced from the community-maintained [models.dev](https://models.dev) dataset, (4) `null` - no window could be resolved (models absent from the community table, such as local providers, return an explicit `null`).                                                                                        |
| `pricing`        | `object` \| `null` | Pricing information. Only present when `include=pricing` is requested. Returns a pricing object with `currency` (string), `input_per_token` (decimal string), `output_per_token` (decimal string), optionally `cache_read_per_token` and `cache_write_per_token` (decimal strings), `source` (`"provider"` or `"community"`), and optionally `updated_at` (ISO 8601 string). Provider-published pricing wins; otherwise rates resolve from a table synced from the community-maintained [models.dev](https://models.dev) dataset (`source: "community"`). Rates the source does not publish are omitted. Models resolvable from neither source (including local providers such as `ollama` and `llamacpp`) return `null`. |

#### `ListModelsResponse`

Returned by `GET /v1/models` and `GET /v1/models?provider={provider}`. Contains a `data` array of `Model` objects and an optional `provider` field when filtering by provider.

| Field      | Type       | Description                         |
| ---------- | ---------- | ----------------------------------- |
| `object`   | `string`   | Always `"list"`                     |
| `data`     | `Model[]`  | Array of model descriptors          |
| `provider` | `Provider` | Provider identifier (when filtered) |

#### `ProviderAuthType`

Enumerates the authentication method that each provider uses:

| Value        | Description                                     |
| ------------ | ----------------------------------------------- |
| `"bearer"`   | Standard `Authorization: Bearer <token>` header |
| `"x-header"` | Provider-specific header (e.g., `x-api-key`)    |
| `"none"`     | No authentication required (e.g., Ollama)       |

#### `ProviderSpecificResponse`

The raw response body returned by proxy endpoints (`{METHOD} /proxy/{provider}/{path}`). The exact JSON structure depends on the upstream provider and is passed through without modification.

### Chat Completion Request

#### `CreateChatCompletionRequest`

The body sent to `POST /v1/chat/completions`. Only `model` and `messages` are required; every other field is optional and falls back to the model/provider default.

| Field                   | Type                             | Required | Description                                                                                                                                                                                                              |
| ----------------------- | -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `model`                 | `string`                         | Yes      | Model identifier (e.g., `"deepseek/deepseek-v4-flash"`). Use the `nvidia/` prefix to route to NVIDIA NIM models (e.g. `"nvidia/meta/llama-3.1-8b-instruct"`). Alternatively, use `?provider=nvidia` in the query string. |
| `messages`              | `Message[]`                      | Yes      | Conversation history                                                                                                                                                                                                     |
| `max_completion_tokens` | `integer`                        |          | Upper bound for generated tokens, including visible output and reasoning tokens                                                                                                                                          |
| `max_tokens`            | `integer`                        |          | **Deprecated** - use `max_completion_tokens`. Maximum tokens to generate; not compatible with o-series                                                                                                                   |
| `temperature`           | `number`                         |          | Sampling temperature, `0`-`2` (default `1`). Higher values make output more random                                                                                                                                       |
| `top_p`                 | `number`                         |          | Nucleus sampling mass, `0`-`1` (default `1`). Alter this or `temperature`, not both                                                                                                                                      |
| `frequency_penalty`     | `number`                         |          | `-2`-`2` (default `0`). Positive values penalize tokens by their existing frequency                                                                                                                                      |
| `presence_penalty`      | `number`                         |          | `-2`-`2` (default `0`). Positive values penalize tokens that already appeared                                                                                                                                            |
| `n`                     | `integer`                        |          | Number of completion choices to generate, `1`-`128` (default `1`)                                                                                                                                                        |
| `stop`                  | `string` \| `string[]`           |          | Up to 4 sequences where the API stops generating further tokens                                                                                                                                                          |
| `seed`                  | `integer`                        |          | Best-effort deterministic sampling; pair with the `system_fingerprint` response field                                                                                                                                    |
| `logprobs`              | `boolean`                        |          | Return log probabilities of the output tokens (default `false`)                                                                                                                                                          |
| `top_logprobs`          | `integer`                        |          | Most likely tokens to return per position, `0`-`20`. Requires `logprobs: true`                                                                                                                                           |
| `response_format`       | `ResponseFormat`                 |          | Output format: `text`, `json_object`, or `json_schema` (Structured Outputs)                                                                                                                                              |
| `logit_bias`            | `object`                         |          | Maps token IDs to a bias from `-100` to `100` applied to logits before sampling                                                                                                                                          |
| `tools`                 | `ChatCompletionTool[]`           |          | Tools available to the model                                                                                                                                                                                             |
| `tool_choice`           | `ChatCompletionToolChoiceOption` |          | Which tool (if any) the model calls: `"none"`, `"auto"`, `"required"`, or a named function                                                                                                                               |
| `parallel_tool_calls`   | `boolean`                        |          | Enable parallel function calling during tool use (default `true`)                                                                                                                                                        |
| `stream`                | `boolean`                        |          | Enable SSE streaming (default: `false`)                                                                                                                                                                                  |
| `stream_options`        | `ChatCompletionStreamOptions`    |          | Streaming behaviour options                                                                                                                                                                                              |
| `reasoning_effort`      | `string`                         |          | Constrains reasoning effort: `"minimal"`, `"low"`, `"medium"`, or `"high"`                                                                                                                                               |
| `reasoning_format`      | `string`                         |          | Reasoning output format: `"raw"` or `"parsed"`                                                                                                                                                                           |
| `user`                  | `string`                         |          | Unique end-user identifier to help monitor and detect abuse                                                                                                                                                              |

#### `ChatCompletionStreamOptions`

Controls streaming behaviour when `stream: true`.

| Field           | Type      | Description                                                      |
| --------------- | --------- | ---------------------------------------------------------------- |
| `include_usage` | `boolean` | Include a final `CompletionUsage` chunk at the end of the stream |

#### `ResponseFormat`

The `response_format` field of a `CreateChatCompletionRequest`. A discriminated union - one of `ResponseFormatText`, `ResponseFormatJsonObject`, or `ResponseFormatJsonSchema`, distinguished by the `type` field. Omitting it returns free-form text (equivalent to `ResponseFormatText`).

#### `ResponseFormatText`

The default response format, used to generate free-form text.

| Field  | Type     | Required | Description     |
| ------ | -------- | -------- | --------------- |
| `type` | `string` | Yes      | Always `"text"` |

#### `ResponseFormatJsonObject`

The older JSON mode. Ensures the model emits valid JSON. The prompt must still instruct the model to produce JSON. Prefer `ResponseFormatJsonSchema` on models that support it.

| Field  | Type     | Required | Description            |
| ------ | -------- | -------- | ---------------------- |
| `type` | `string` | Yes      | Always `"json_object"` |

#### `ResponseFormatJsonSchema`

Structured Outputs. Constrains the model to emit JSON that matches a supplied JSON Schema.

| Field         | Type     | Required | Description                                  |
| ------------- | -------- | -------- | -------------------------------------------- |
| `type`        | `string` | Yes      | Always `"json_schema"`                       |
| `json_schema` | `object` | Yes      | Structured Outputs configuration (see below) |

The `json_schema` object holds:

| Field         | Type                             | Required | Description                                                                       |
| ------------- | -------------------------------- | -------- | --------------------------------------------------------------------------------- |
| `name`        | `string`                         | Yes      | Format name. `a-z`, `A-Z`, `0-9`, underscores, and dashes; max length 64          |
| `schema`      | `ResponseFormatJsonSchemaSchema` |          | The JSON Schema the output must satisfy                                           |
| `description` | `string`                         |          | What the format is for; helps the model decide how to respond                     |
| `strict`      | `boolean`                        |          | Enforce exact schema adherence (default `false`). A subset of JSON Schema applies |

#### `ResponseFormatJsonSchemaSchema`

The JSON Schema object supplied in `json_schema.schema`, described as a standard JSON Schema document (arbitrary keys are allowed).

### Message Content

#### `Message`

One element of the `messages` array in a `CreateChatCompletionRequest`.

| Field               | Type                              | Required | Description                                 |
| ------------------- | --------------------------------- | -------- | ------------------------------------------- |
| `role`              | `MessageRole`                     | Yes      | Role of the message sender                  |
| `content`           | `MessageContent`                  | Yes      | Text or multimodal message content          |
| `tool_calls`        | `ChatCompletionMessageToolCall[]` |          | Tool calls returned by an assistant message |
| `tool_call_id`      | `string`                          |          | Tool-call ID for a tool response message    |
| `reasoning_content` | `string`                          |          | Reasoning content emitted by the provider   |
| `reasoning`         | `string`                          |          | Alias for `reasoning_content`               |

#### `MessageRole`

The `role` field of a `Message`. One of: `"system"`, `"user"`, `"assistant"`, `"tool"`.

#### `MessageContent`

The `content` field of a `Message`. Either:

- A plain `string` for simple text messages.
- An array of `ContentPart` objects for multimodal messages.

#### `ContentPart`

A discriminated union - either a `TextContentPart` or an `ImageContentPart`, distinguished by the `type` field.

#### `TextContentPart`

| Field  | Type     | Description      |
| ------ | -------- | ---------------- |
| `type` | `string` | Always `"text"`  |
| `text` | `string` | The text content |

#### `ImageContentPart`

| Field       | Type       | Description          |
| ----------- | ---------- | -------------------- |
| `type`      | `string`   | Always `"image_url"` |
| `image_url` | `ImageURL` | Image URL descriptor |

#### `ImageURL`

| Field    | Type     | Description                                           |
| -------- | -------- | ----------------------------------------------------- |
| `url`    | `string` | HTTPS URL or `data:` URI (base64) of the image        |
| `detail` | `string` | Optional detail level: `"auto"`, `"low"`, or `"high"` |

### Chat Completion Response

#### `CreateChatCompletionResponse`

Returned by `POST /v1/chat/completions` when `stream: false`.

| Field     | Type                     | Description                    |
| --------- | ------------------------ | ------------------------------ |
| `id`      | `string`                 | Unique completion identifier   |
| `object`  | `string`                 | Always `"chat.completion"`     |
| `created` | `integer`                | Unix timestamp of creation     |
| `model`   | `string`                 | Model used                     |
| `choices` | `ChatCompletionChoice[]` | One or more completion choices |
| `usage`   | `CompletionUsage`        | Token usage statistics         |

#### `ChatCompletionChoice`

One element of the `choices` array in a `CreateChatCompletionResponse`.

| Field           | Type                                     | Description                      |
| --------------- | ---------------------------------------- | -------------------------------- |
| `index`         | `integer`                                | Choice index                     |
| `message`       | `Message`                                | The generated message            |
| `finish_reason` | `FinishReason`                           | Why the model stopped generating |
| `logprobs`      | `ChatCompletionTokenLogprob[]` \| `null` | Token log-probability groups     |

When present, `logprobs` contains `content` and `refusal` arrays of
`ChatCompletionTokenLogprob` objects.

#### `FinishReason`

Why the model stopped generating tokens. One of:

| Value              | Description                                             |
| ------------------ | ------------------------------------------------------- |
| `"stop"`           | Natural end of output or stop sequence hit              |
| `"length"`         | `max_completion_tokens` (or `max_tokens`) limit reached |
| `"tool_calls"`     | Model issued one or more tool calls                     |
| `"content_filter"` | Output was filtered                                     |

#### `CompletionUsage`

Token usage statistics returned in both streaming and non-streaming responses.

| Field               | Type      | Description                         |
| ------------------- | --------- | ----------------------------------- |
| `prompt_tokens`     | `integer` | Tokens in the input prompt          |
| `completion_tokens` | `integer` | Tokens in the generated output      |
| `total_tokens`      | `integer` | Sum of prompt and completion tokens |

#### `ChatCompletionTokenLogprob`

Per-token log-probability information, present when `logprobs: true` is requested.

| Field          | Type                           | Description                  |
| -------------- | ------------------------------ | ---------------------------- |
| `token`        | `string`                       | The token string             |
| `logprob`      | `number`                       | Log probability of the token |
| `bytes`        | `integer[]`                    | UTF-8 bytes of the token     |
| `top_logprobs` | `ChatCompletionTokenLogprob[]` | Top alternative tokens       |

### Streaming Response Schemas

#### `CreateChatCompletionStreamResponse`

Returned by `POST /v1/chat/completions` when `stream: true`. Each SSE event carries one of these objects in its `data` field.

| Field              | Type                           | Description                                       |
| ------------------ | ------------------------------ | ------------------------------------------------- |
| `id`               | `string`                       | Unique completion identifier (same across chunks) |
| `object`           | `string`                       | Always `"chat.completion.chunk"`                  |
| `created`          | `integer`                      | Unix timestamp                                    |
| `model`            | `string`                       | Model used                                        |
| `choices`          | `ChatCompletionStreamChoice[]` | Streaming choices (empty in the usage chunk)      |
| `usage`            | `CompletionUsage`              | Present only in the final usage chunk             |
| `reasoning_format` | `string`                       | Reasoning output format: `"raw"` or `"parsed"`    |

#### `SSEvent`

A Server-Sent Event as defined by the W3C SSE specification. Each event sent over the `text/event-stream` connection has:

| Field   | Type     | Description                                                   |
| ------- | -------- | ------------------------------------------------------------- |
| `data`  | `string` | JSON-encoded `CreateChatCompletionStreamResponse` or `[DONE]` |
| `event` | `string` | Optional event type (omitted in most chunks)                  |
| `id`    | `string` | Optional event identifier                                     |

#### `ChatCompletionStreamChoice`

One element of the `choices` array in a `CreateChatCompletionStreamResponse`.

| Field           | Type                                | Description                         |
| --------------- | ----------------------------------- | ----------------------------------- |
| `index`         | `integer`                           | Choice index                        |
| `delta`         | `ChatCompletionStreamResponseDelta` | Incremental content for this chunk  |
| `logprobs`      | `object`                            | Token log-probability groups        |
| `finish_reason` | `FinishReason` \| `null`            | Set on the final chunk for a choice |

#### `ChatCompletionStreamResponseDelta`

The incremental content carried by each `ChatCompletionStreamChoice`.

| Field               | Type                                   | Description                                         |
| ------------------- | -------------------------------------- | --------------------------------------------------- |
| `role`              | `MessageRole`                          | Sent once in the first chunk (`"assistant"`)        |
| `content`           | `string`                               | Partial text content                                |
| `reasoning_content` | `string`                               | Partial reasoning content                           |
| `reasoning`         | `string`                               | Alias for `reasoning_content`                       |
| `tool_calls`        | `ChatCompletionMessageToolCallChunk[]` | Partial tool-call data (when the model calls tools) |

#### `ChatCompletionMessageToolCallChunk`

A partial `ChatCompletionMessageToolCall` that arrives over multiple stream chunks.

| Field      | Type      | Description                                             |
| ---------- | --------- | ------------------------------------------------------- |
| `index`    | `integer` | Tool-call index within the response                     |
| `id`       | `string`  | Tool-call ID (present in the first chunk)               |
| `type`     | `string`  | Always `"function"`                                     |
| `function` | `object`  | Partial `{ name, arguments }` accumulated across chunks |

### Tool-Calling Schemas

#### `ChatCompletionTool`

One element of the `tools` array in a `CreateChatCompletionRequest`.

| Field      | Type                     | Description                             |
| ---------- | ------------------------ | --------------------------------------- |
| `type`     | `ChatCompletionToolType` | The tool category (always `"function"`) |
| `function` | `FunctionObject`         | The function definition                 |

#### `ChatCompletionToolType`

An enum for the `type` field of a `ChatCompletionTool`. Currently only `"function"` is supported.

#### `FunctionObject`

The function definition inside a `ChatCompletionTool`.

| Field         | Type                 | Required | Description                            |
| ------------- | -------------------- | -------- | -------------------------------------- |
| `name`        | `string`             | Yes      | Function name (snake_case recommended) |
| `description` | `string`             |          | What the function does                 |
| `parameters`  | `FunctionParameters` |          | JSON Schema describing the parameters  |

#### `FunctionParameters`

A JSON Schema object that describes the parameters accepted by a `FunctionObject`. Typically:

```json
{
  "type": "object",
  "properties": {
    "param1": { "type": "string", "description": "..." }
  },
  "required": ["param1"]
}
```

#### `ChatCompletionToolChoiceOption`

The `tool_choice` field of a `CreateChatCompletionRequest`. Controls which (if any) tool the model calls. It is either a string mode or a `ChatCompletionNamedToolChoice` that forces a specific function.

| Value / Type                    | Description                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `"none"`                        | The model will not call a tool and instead generates a message (default when no tools are present) |
| `"auto"`                        | The model chooses between a message or one or more tool calls (default when tools are present)     |
| `"required"`                    | The model must call one or more tools                                                              |
| `ChatCompletionNamedToolChoice` | Force the model to call one specific function                                                      |

#### `ChatCompletionNamedToolChoice`

Forces the model to call a specific function.

| Field      | Type                     | Required | Description                                              |
| ---------- | ------------------------ | -------- | -------------------------------------------------------- |
| `type`     | `ChatCompletionToolType` | Yes      | The tool category (always `"function"`)                  |
| `function` | `object`                 | Yes      | `{ "name": "my_function" }` identifying the tool to call |

#### `ChatCompletionMessageToolCall`

Represents a tool call made by the model in a non-streaming response.

| Field      | Type                                    | Description                  |
| ---------- | --------------------------------------- | ---------------------------- |
| `id`       | `string`                                | Unique tool-call identifier  |
| `type`     | `string`                                | Always `"function"`          |
| `function` | `ChatCompletionMessageToolCallFunction` | Function called and its args |

#### `ChatCompletionMessageToolCallFunction`

The function invocation details inside a `ChatCompletionMessageToolCall`.

| Field       | Type     | Description                                             |
| ----------- | -------- | ------------------------------------------------------- |
| `name`      | `string` | Name of the function called                             |
| `arguments` | `string` | JSON-encoded string of arguments passed to the function |

#### `ToolCallExtraContent`

Additional metadata that may be attached to a tool call response (e.g., extended thinking traces from models that support chain-of-thought output alongside tool calls).

| Field     | Type     | Description                              |
| --------- | -------- | ---------------------------------------- |
| `type`    | `string` | Content type identifier                  |
| `content` | `string` | The extra content (e.g., thinking trace) |

### MCP Tool Schemas

#### `ListToolsResponse`

Returned by `GET /v1/mcp/tools` when `MCP_EXPOSE=true`. Lists all tools discovered from connected MCP servers.

| Field   | Type        | Description                               |
| ------- | ----------- | ----------------------------------------- |
| `tools` | `MCPTool[]` | Array of tools available from MCP servers |

#### `MCPTool`

Describes a single tool exposed by an MCP server.

| Field         | Type     | Description                                        |
| ------------- | -------- | -------------------------------------------------- |
| `name`        | `string` | Unique tool name                                   |
| `description` | `string` | Human-readable description of what the tool does   |
| `server`      | `string` | URL of the MCP server that provides this tool      |
| `inputSchema` | `object` | JSON Schema describing the tool's input parameters |

## OpenAPI Specification

For a complete API reference in OpenAPI format, see the [OpenAPI specification file](https://github.com/inference-gateway/inference-gateway/blob/main/openapi.yaml).
