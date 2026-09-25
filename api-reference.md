---
title: REST API Reference
description: Full REST API reference for Inference Gateway, including chat completions, streaming over SSE, tool calls, vision input, the proxy endpoint, and the OpenAPI schemas.
---

# API Reference

Inference Gateway provides a RESTful API for interacting with language models from various providers. This reference documents all available endpoints, request formats, and response structures.

## Base URL

All API endpoints are relative to your Inference Gateway installation URL. By default, this is `http://localhost:8080` when running locally.

## Authentication

If authentication is enabled (`AUTH_ENABLED=true`), all requests must include a bearer token:

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

| Parameter | Type     | Required | Description                                                                                                                                                                                                                                                                             |
| --------- | -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `include` | `string` |          | Comma-separated list of additional metadata keys to include per model. Supported keys: `context_window`, `pricing`, `modalities`. Unknown keys return `400 Bad Request`. Keys are trimmed and de-duplicated. When omitted, the response is byte-for-byte unchanged (OpenAI-compatible). |

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
3. **`null`** - no pricing could be resolved. Local providers (`ollama`, `llamacpp`) are intentionally absent from the community table.

Monetary values are USD per-token decimal strings (e.g. `"0.00000027"`) to avoid floating-point precision loss. Rates the source does not publish are omitted entirely (never `0` or `null`).

The pricing object may also include an optional `subscription` field (boolean, default `false`). When `true`, the model is gated behind a paid subscription: access is billed as a flat fee, not per token. The flag and the per-token rates are independent - a subscription-gated model may carry `"0"` rates or non-zero `input_per_token` / `output_per_token` rates. Non-zero rates on a subscription model are informational only (the provider's pay-as-you-go price for the same model) and must not be used to meter a session; the `subscription` flag decides billing. Models without the field (or with `subscription: false`) and zero rates are free-tier models with genuine zero per-token rates.

Every `ollama_cloud/*` model is subscription-gated: the community table applies the rule at the provider level, so all Ollama Cloud models resolve to a populated pricing object with `subscription: true` rather than `pricing: null`. Ollama Cloud sells both flat-fee subscription plans and pay-as-you-go API access, and models.dev publishes the pay-as-you-go rates, so priced Ollama Cloud models keep their rates alongside the flag. Clients should classify them as Subscription, not Free, and bill them at zero per-token cost - see how the [CLI handles subscription models](/cli/#model-categories-free-pay-as-you-go-subscription). See [Ollama Cloud Provider](/supported-providers/#ollama-cloud-provider) for the provider setup.

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

Example response for subscription-gated Ollama Cloud models with `include=pricing`:

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
      "id": "ollama_cloud/deepseek-v4-pro",
      "object": "model",
      "created": 1741879542,
      "owned_by": "ollama_cloud",
      "served_by": "ollama_cloud",
      "pricing": {
        "currency": "USD",
        "input_per_token": "0",
        "output_per_token": "0",
        "subscription": true,
        "source": "community"
      }
    },
    {
      "id": "ollama_cloud/glm-5.3-flash",
      "object": "model",
      "created": 1741879542,
      "owned_by": "ollama_cloud",
      "served_by": "ollama_cloud",
      "pricing": {
        "currency": "USD",
        "input_per_token": "0.00000015",
        "output_per_token": "0.00000050",
        "subscription": true,
        "source": "community"
      }
    }
  ]
}
```

Both models carry `subscription: true`, indicating they require a paid subscription. `deepseek-v4-pro` has no published pay-as-you-go rate, so its rates are `"0"`; `glm-5.3-flash` keeps the models.dev pay-as-you-go rate for reference, but the flag still applies and a subscription client bills it at zero. The flag is not limited to specific families - every Ollama Cloud model carries it. Compare with a free-tier model that also has zero rates but omits the `subscription` field entirely.

Models with no resolvable per-token pricing - locally hosted models or anything absent from both the provider listing and the community table - return `"pricing": null`.

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

### Responses API

The gateway exposes an OpenAI-compatible `POST /v1/responses` endpoint. The request body is forwarded to the upstream provider byte-for-byte (only the `model` prefix is stripped), so all Responses API fields like `input`, `instructions`, and `tools` pass through untouched.

```http
POST /v1/responses?provider={provider}
```

Only providers that natively implement the Responses API are supported (currently `openai`); other providers return `400 Bad Request`.

**Request Body:**

```bash
curl -X POST http://localhost:8080/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o",
    "input": "Hi, how are you doing today?",
    "instructions": "You are a helpful assistant."
  }'
```

**Response:**

```http
Status: 200 OK
Content-Type: application/json

{
  "id": "resp_67b5cf1e3e3481928c7a3b2f1a2b3c4d",
  "object": "response",
  "created_at": 1741879542,
  "status": "completed",
  "model": "gpt-4o-2024-08-06",
  "output": [
    {
      "type": "message",
      "id": "msg_67b5cf1e3e3481928c7a3b2f1a2b3c4d",
      "status": "completed",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "Hello! I'm doing well, thank you! How can I help you today?",
          "annotations": []
        }
      ]
    }
  ],
  "usage": {
    "input_tokens": 12,
    "output_tokens": 10,
    "total_tokens": 22
  }
}
```

#### Streaming

Set `"stream": true` to receive `ResponseStreamEvent` SSE frames verbatim from the upstream provider:

```bash
curl -N -X POST http://localhost:8080/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o",
    "input": "Hi",
    "stream": true
  }'
```

#### Unsupported providers

Requests routed to a provider that does not natively implement the Responses API return `400 Bad Request`:

```http
Status: 400 Bad Request
Content-Type: application/json

{
  "error": "The Responses API is not supported by this provider yet. Use /v1/chat/completions instead."
}
```

### Images API

Create and modify images using the OpenAI-compatible Images endpoints. Both return the same `ImagesResponse` shape with one or more images as URLs or base64-encoded JSON data, and both require `IMAGES_ENABLED=true`.

| Endpoint                      | Body                  | Purpose                             |
| ----------------------------- | --------------------- | ----------------------------------- |
| `POST /v1/images/generations` | `application/json`    | Generate images from a text prompt. |
| `POST /v1/images/edits`       | `multipart/form-data` | Edit or extend a source image.      |

Not every provider implements the Images API. Requests routed to a provider that does not support it return `400 Bad Request`; use `/v1/chat/completions` for those providers.

#### Generations

```http
POST /v1/images/generations?provider={provider}
```

**Request Body** (`CreateImageRequest`):

```bash
curl -X POST http://localhost:8080/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{
"model": "openai/gpt-image-2",
"prompt": "A cute cat sitting on a windowsill, digital art style",
"n": 1,
"size": "1024x1024"
  }'
```

**Response** (`ImagesResponse`):

```http
Status: 200 OK
Content-Type: application/json

{
  "created": 1730419200,
  "data": [
{
  "url": "https://example.com/image.png",
  "revised_prompt": "A cute cat in a garden"
}
  ]
}
```

The `CreateImageRequest` fields:

| Field             | Type     | Required | Description                                                                 |
| ----------------- | -------- | -------- | --------------------------------------------------------------------------- |
| `prompt`          | `string` | Yes      | A text description of the desired image.                                    |
| `model`           | `string` |          | Model ID to use for image generation.                                       |
| `n`               | `int`    |          | Number of images to generate (1-10, default 1).                             |
| `size`            | `string` |          | Image size: `256x256`, `512x512`, `1024x1024`, `1024x1792`, or `1792x1024`. |
| `quality`         | `string` |          | Image quality: `standard` or `hd`.                                          |
| `response_format` | `string` |          | Response format: `url` (default) or `b64_json`.                             |

#### Edits

Edit or extend an existing image. The body is `multipart/form-data`, not JSON.

```http
POST /v1/images/edits?provider={provider}
```

```bash
curl -X POST http://localhost:8080/v1/images/edits \
  -H "Authorization: Bearer $INFERENCE_GATEWAY_API_KEY" \
  -F image=@cat.png \
  -F mask=@cat-mask.png \
  -F prompt="Add a red wizard hat on the cat" \
  -F model=openai/gpt-image-2 \
  -F n=1 \
  -F size=1024x1024
```

The form fields:

| Field             | Type     | Required | Description                                                    |
| ----------------- | -------- | -------- | -------------------------------------------------------------- |
| `image`           | `binary` | Yes      | The source image to edit.                                      |
| `prompt`          | `string` | Yes      | A text description of the desired edit.                        |
| `mask`            | `binary` |          | Image whose transparent areas mark where the edit is applied.  |
| `model`           | `string` |          | Model ID to use.                                               |
| `n`               | `int`    |          | Number of images to generate (1-10, default 1).                |
| `size`            | `string` |          | Image size, for example `1024x1024`.                           |
| `quality`         | `string` |          | Image quality: `auto`, `standard`, `low`, `medium`, or `high`. |
| `response_format` | `string` |          | Response format: `url` (default) or `b64_json`.                |

The response is the same `ImagesResponse` shown above.

#### Unsupported providers

Requests routed to a provider that does not implement the Images API return `400 Bad Request`:

```http
Status: 400 Bad Request
Content-Type: application/json

{
  "error": "The Images API is not supported by this provider yet."
}
```

### Audio API

Generate audio from text. Three operations share the API: `POST /v1/audio/speech` synthesizes a voice, [`POST /v1/audio/sfx`](#sound-effects) generates a non-speech clip - a sound effect or ambience - and [`POST /v1/audio/music`](#music) composes a music clip. All three require `AUDIO_ENABLED=true`; while disabled they return `404 Not Found` with `The Audio API is not enabled. Set AUDIO_ENABLED=true to enable it.`

#### Speech synthesis

Speech requests are served by the `openai` provider (`openai/tts-1`, `openai/gpt-4o-mini-tts`), the `elevenlabs` provider (`elevenlabs/<model>` with an [ElevenLabs voice id](#elevenlabs-voices)), or the gateway's [built-in local engine](#local-speech-engine-local-qwen3-tts) under the reserved model id `local/qwen3-tts`. Those three are the only supported backends today: the `llamacpp` provider has a Speech endpoint wired in the gateway registry, but that path is a work in progress and is not supported yet.

```http
POST /v1/audio/speech?provider={provider}
```

Unlike every other gateway endpoint, a successful response is **not JSON**: the body is the raw audio bytes, and the `Content-Type` header reflects the requested `response_format`.

| `response_format` | Response `Content-Type` |
| ----------------- | ----------------------- |
| `mp3` (default)   | `audio/mpeg`            |
| `opus`            | `audio/opus`            |
| `aac`             | `audio/aac`             |
| `flac`            | `audio/flac`            |
| `wav`             | `audio/wav`             |
| `pcm`             | `audio/pcm`             |

**Request Body** (`CreateSpeechRequest`):

```bash
curl -X POST http://localhost:8080/v1/audio/speech \
  -H "Authorization: Bearer $INFERENCE_GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -o speech.mp3 \
  -d '{
"model": "openai/tts-1",
"input": "Hello from the Inference Gateway.",
"voice": "alloy",
"response_format": "mp3",
"speed": 1.0
  }'
```

Write the response to a file (`-o speech.mp3` above) or pipe it to a player - do not print it to a terminal.

**Response**:

```http
Status: 200 OK
Content-Type: audio/mpeg

<binary audio bytes>
```

The `CreateSpeechRequest` fields:

| Field             | Type     | Required | Description                                                                                                                                                                                                                                                                   |
| ----------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`           | `string` | Yes      | Model ID to use for speech synthesis, for example `openai/tts-1`, `openai/gpt-4o-mini-tts`, `elevenlabs/<model>` or the reserved local id `local/qwen3-tts`.                                                                                                                  |
| `input`           | `string` | Yes      | The text to synthesize (4096 characters maximum).                                                                                                                                                                                                                             |
| `voice`           | `string` | Yes      | Voice to speak with. OpenAI built-ins are `alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `onyx`, `nova`, `sage`, `shimmer`, `verse`, `marin`, `cedar`. Other providers accept their own voice identifiers - for `elevenlabs` this is a voice id, including a cloned one. |
| `response_format` | `string` |          | Audio format: `mp3` (default), `opus`, `aac`, `flac`, `wav`, or `pcm`.                                                                                                                                                                                                        |
| `speed`           | `number` |          | Playback speed between `0.25` and `4.0` (default `1.0`).                                                                                                                                                                                                                      |
| `instructions`    | `string` |          | Extra guidance on how the voice should sound (4096 characters maximum). Ignored by `tts-1` and `tts-1-hd`.                                                                                                                                                                    |
| `reference_audio` | `string` |          | Base64-encoded audio sample for zero-shot voice cloning. Only `local/qwen3-tts` honors it today; OpenAI does not support cloning.                                                                                                                                             |
| `language`        | `string` |          | ISO 639-1 language code hint for synthesis (default `en`). Non-standard: forwarded to providers as-is; `local/qwen3-tts` validates it (see below).                                                                                                                            |

#### ElevenLabs voices

ElevenLabs is reached with `"model": "elevenlabs/<model>"` and an ElevenLabs **voice id** in `voice` - either a stock voice or one you cloned in your ElevenLabs account. Set `ELEVENLABS_API_KEY` (and optionally `ELEVENLABS_API_URL`); the gateway authenticates with the `xi-api-key` header on your behalf. See [Configuration](/configuration/#elevenlabs).

```bash
curl -X POST http://localhost:8080/v1/audio/speech \
  -H "Authorization: Bearer $INFERENCE_GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -o speech.mp3 \
  -d '{
"model": "elevenlabs/eleven_multilingual_v2",
"input": "Hello from the Inference Gateway.",
"voice": "21m00Tcm4TlvDq8ikWAM",
"response_format": "mp3"
  }'
```

ElevenLabs has no chat-completions API, so it is audio-only - speech, [sound effects](#sound-effects) and [music](#music): a `/v1/chat/completions` request routed to it is not supported.

#### Voice cloning

`reference_audio` carries a base64-encoded voice sample for zero-shot cloning, so the generated speech mimics the voice in the sample. Use a clean mono recording between 1 and 30 seconds - WAV is the safest container.

Cloning is served by `local/qwen3-tts`, which handles the sample in-process. OpenAI's Speech API does not support cloning and accepts only its built-in voices, so `local/qwen3-tts` is the only way to clone a voice from a sample in the request today - ElevenLabs clones voices in your ElevenLabs account instead and you pass the resulting voice id in `voice`. Cloning through a self-hosted Qwen3-TTS server behind the `llamacpp` provider is a work in progress and is not supported yet.

```bash
curl -X POST http://localhost:8080/v1/audio/speech \
  -H "Authorization: Bearer $INFERENCE_GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -o cloned.wav \
  -d "{
  \"model\": \"local/qwen3-tts\",
  \"input\": \"This is my cloned voice speaking.\",
  \"voice\": \"custom\",
  \"response_format\": \"wav\",
  \"reference_audio\": \"$(base64 < my-voice-sample.wav)\"
}"
```

For a fully local alternative that never leaves your machine, the CLI synthesizes with `llama-tts` directly - see [Text-to-Speech](/cli-text-to-speech/).

#### Local speech engine (`local/qwen3-tts`)

`local/qwen3-tts` is a reserved model id served by the gateway itself: no provider, no API key, no outbound request. The gateway shells out to llama.cpp's one-shot `llama-tts` binary with [Qwen3-TTS](https://huggingface.co/ggml-org/Qwen3-TTS-12Hz-1.7B-Base-GGUF) GGUF weights and returns the raw WAV. `reference_audio` cloning works the same as above, handled locally.

The optional `language` field (ISO 639-1, default `en`) must be one of the ten codes Qwen3-TTS supports - `zh`, `en`, `de`, `it`, `pt`, `es`, `ja`, `ko`, `fr`, `ru` - and is passed to `llama-tts --tts-lang`. Any other code returns `400 Bad Request` with a message naming the supported set.

```bash
curl -X POST http://localhost:8080/v1/audio/speech \
  -H "Authorization: Bearer $INFERENCE_GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -o speech.wav \
  -d '{"model":"local/qwen3-tts","input":"Hallo vom Inference Gateway.","voice":"default","language":"de","response_format":"wav"}'
```

**Assets and cache.** The binary and weights are fetched in the background on first use and cached in fixed, non-configurable locations shared with the [CLI](/cli-text-to-speech/): GGUF models in `~/.infer/models/tts`, binaries in `~/.infer/bin`. A `llama-tts` already on `PATH` wins; otherwise the binary comes from the [inference-gateway/binaries](https://github.com/inference-gateway/binaries) release assets and is sha256-verified against the published `checksums.txt`. Downloads write to a temp file and atomically rename, so a CLI and a gateway downloading at the same time never corrupt the cache.

**While assets are downloading**, the endpoint answers `503 Service Unavailable` with a `Retry-After` header and download progress in the body rather than holding the request open. Boot and chat routes are never blocked; a failed download is retried in the background on the next request.

```http
Status: 503 Service Unavailable
Retry-After: 30
```

With `AUDIO_LOCAL_AUTO_DOWNLOAD=false` the gateway never downloads anything and consumes only pre-existing `PATH`/cache assets; when they are missing the request fails with an actionable error naming what to install or place in the cache.

**Tuning** (see [Configuration](/configuration/#general-settings)):

| Variable                      | Default | Effect                                                                 |
| ----------------------------- | ------- | ---------------------------------------------------------------------- |
| `AUDIO_LOCAL_AUTO_DOWNLOAD`   | `true`  | Allow on-demand download of the binary and weights                     |
| `AUDIO_LOCAL_MAX_CONCURRENCY` | `2`     | Concurrent syntheses; requests beyond the limit queue rather than fail |
| `AUDIO_LOCAL_TIMEOUT`         | `300`   | Per-request synthesis timeout in seconds, surfaced as `504`            |

**Known ceiling.** Each request pays model and graph initialization (roughly 1s warm, slower cold or on GPU) and there is no cross-request batching - fine for agent speech, not for bulk synthesis. The local path is a stopgap until llama.cpp ships server-side TTS, after which the gateway can proxy to `llama-server` instead.

#### Sound effects

`POST /v1/audio/sfx` turns a text prompt into a non-speech audio clip - a sound effect or an ambience loop - the way `/v1/audio/speech` turns text into a voice. It is a gateway extension: OpenAI has no sound-effects endpoint, so the operation is shaped like `/v1/audio/speech` (JSON in, raw audio bytes out) rather than mirroring an upstream OpenAI body. The provider comes from the `provider/model` prefix or the `provider` query parameter, and the endpoint shares the `AUDIO_ENABLED` gate with `/v1/audio/speech`.

```http
POST /v1/audio/sfx?provider={provider}
```

`elevenlabs` is the only provider that serves it today, with `eleven_text_to_sound_v2`.

```bash
curl -X POST http://localhost:8080/v1/audio/sfx \
  -H "Authorization: Bearer $INFERENCE_GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -o thunder.mp3 \
  -d '{
"model": "elevenlabs/eleven_text_to_sound_v2",
"prompt": "distant thunder rolling over a valley",
"duration_seconds": 8,
"prompt_influence": 0.5,
"response_format": "mp3"
  }'
```

As with speech, the response is **not JSON** - it is the raw audio bytes, with the `Content-Type` reflecting `response_format` (see the [table above](#audio-api)). Write it to a file or pipe it to a player.

```http
Status: 200 OK
Content-Type: audio/mpeg

<binary audio bytes>
```

The `CreateSFXRequest` fields:

| Field              | Type      | Required | Description                                                                                                                                                                                                                                               |
| ------------------ | --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`            | `string`  | Yes      | Model ID to use for sound-effect generation, for example `elevenlabs/eleven_text_to_sound_v2`.                                                                                                                                                            |
| `prompt`           | `string`  | Yes      | Description of the sound to generate, for example `distant thunder rolling over a valley`.                                                                                                                                                                |
| `duration_seconds` | `number`  |          | Length of the clip, between `0.5` and `30`. Omit it to let the provider pick a length that fits the prompt.                                                                                                                                               |
| `prompt_influence` | `number`  |          | How closely the generation follows the prompt, between `0` and `1` - higher stays closer, lower varies more. Omit it for the provider default.                                                                                                            |
| `loop`             | `boolean` |          | Generate a clip that loops seamlessly. Useful for ambience beds.                                                                                                                                                                                          |
| `response_format`  | `string`  |          | Audio format: `mp3` (default), `opus`, `aac`, `flac`, or `pcm`. `wav` is not accepted here (unlike `/v1/audio/speech`) - use `mp3` instead. ElevenLabs produces only `mp3`, `opus` and `pcm`; the rest return `400 Bad Request` naming the supported set. |

The [Rust SDK](/sdks/#sound-effects-and-music-2) wraps this endpoint as [`create_sfx`](/sdks/#sound-effects-and-music-2), which returns the raw audio bytes:

```rust
let sfx = client
    .create_sfx(
        Some(Provider::Elevenlabs),
        CreateSFXRequest {
            model: "elevenlabs/eleven_text_to_sound_v2".to_string(),
            prompt: "rain on a tin roof, steady".to_string(),
            duration_seconds: Some(10.0),
            loop_: Some(true),
            prompt_influence: None,
            response_format: CreateSFXRequestResponseFormat::Mp3,
        },
    )
    .await?;
```

The [TypeScript SDK](/sdks/#sound-effects-and-music-1) wraps it as [`createSFX`](/sdks/#sound-effects-and-music-1), which resolves to a `Blob` of the raw audio:

```typescript
const sfx = await client.createSFX(
  {
    model: 'elevenlabs/eleven_text_to_sound_v2',
    prompt: 'rain on a tin roof, steady',
    duration_seconds: 10,
    loop: true,
  },
  Provider.elevenlabs
);
```

The [Python SDK](/sdks/#sound-effects-and-music) wraps it as [`create_sfx`](/sdks/#sound-effects-and-music), returning the raw audio as `bytes`:

```python
sfx = client.create_sfx(
    'elevenlabs/eleven_text_to_sound_v2',
    'rain on a tin roof, steady',
    provider='elevenlabs',
    duration_seconds=10.0,
    loop=True,
)
```

The Go SDK does not wrap it yet - call it over plain HTTP in the meantime.

Set `ELEVENLABS_API_KEY` (and optionally `ELEVENLABS_API_URL`) so the gateway can authenticate - see [Configuration](/configuration/#elevenlabs).

The CLI wraps this endpoint in the opt-in [`TextToSFX` tool](/cli/#texttosfx-tool), so the agent can generate a clip during a chat.

#### Music

`POST /v1/audio/music` composes a music clip from a text prompt. Like [sound effects](#sound-effects) it is a gateway extension shaped after `/v1/audio/speech` - JSON in, raw audio bytes out - and shares the `AUDIO_ENABLED` gate. The provider comes from the `provider/model` prefix or the `provider` query parameter.

```http
POST /v1/audio/music?provider={provider}
```

`elevenlabs` is the only provider that serves it today, through its `POST /v1/music` API, with `music_v2` and `music_v2_5`. ElevenLabs' own models endpoint returns speech models only, so the gateway appends its music, sound-effect and video models to `GET /v1/models` for discovery. Filter on `modalities` (text in, audio out) to find them:

```bash
curl -s 'http://localhost:8080/v1/models?provider=elevenlabs&include=modalities' \
  | jq '.data[] | select(.modalities.output == ["audio"]) | .id'
```

`pricing` and `context_window` are `null` for every ElevenLabs model: billing is credit-based and there is no token window.

```bash
curl -X POST http://localhost:8080/v1/audio/music \
  -H "Authorization: Bearer $INFERENCE_GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -o track.mp3 \
  -d '{
"model": "elevenlabs/music_v2_5",
"prompt": "upbeat lo-fi hip hop with a warm piano loop",
"duration_seconds": 30,
"instrumental": true,
"response_format": "mp3"
  }'
```

The response is the raw audio bytes, with the `Content-Type` reflecting `response_format` (see the [table above](#audio-api)). Write it to a file or pipe it to a player.

```http
Status: 200 OK
Content-Type: audio/mpeg

<binary audio bytes>
```

The `CreateMusicRequest` fields:

| Field              | Type      | Required | Description                                                                                                                                 |
| ------------------ | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`            | `string`  | Yes      | Model ID to use for music generation, for example `elevenlabs/music_v2_5`.                                                                  |
| `prompt`           | `string`  | Yes      | Description of the music to compose - genre, mood, instruments, tempo.                                                                      |
| `duration_seconds` | `number`  |          | Length of the clip, between `3` and `600`. Omit it to let the provider pick a length.                                                       |
| `instrumental`     | `boolean` |          | Compose without vocals (default `false`).                                                                                                   |
| `response_format`  | `string`  |          | Audio format: `mp3` (default), `opus`, `aac`, `flac`, or `pcm`. `wav` is not accepted here (unlike `/v1/audio/speech`) - use `mp3` instead. |

A request routed to a provider without music support returns `400 Bad Request` (see [Unsupported providers](#unsupported-providers)). The Rust SDK wraps this endpoint as [`create_music`](/sdks/#sound-effects-and-music-2), returning the raw audio bytes like `create_sfx`:

```rust
let track = client
    .create_music(
        Some(Provider::Elevenlabs),
        CreateMusicRequest {
            model: "elevenlabs/music_v2_5".to_string(),
            prompt: "upbeat lo-fi hip hop with a warm piano loop".to_string(),
            duration_seconds: Some(30.0),
            instrumental: Some(true),
            response_format: CreateMusicRequestResponseFormat::Mp3,
        },
    )
    .await?;
```

The TypeScript SDK wraps it as [`createMusic`](/sdks/#sound-effects-and-music-1), the `createSFX` sibling, resolving to a `Blob`:

```typescript
const music = await client.createMusic(
  {
    model: 'elevenlabs/music_v2_5',
    prompt: 'upbeat lo-fi hip hop with a warm piano loop',
    duration_seconds: 30,
    instrumental: true,
  },
  Provider.elevenlabs
);
```

The Python SDK wraps it as [`create_music`](/sdks/#sound-effects-and-music), the `create_sfx` sibling, returning `bytes`:

```python
music = client.create_music(
    'elevenlabs/music_v2_5',
    'upbeat lo-fi hip hop with a warm piano loop',
    provider='elevenlabs',
    duration_seconds=30.0,
    instrumental=True,
)
```

The Go SDK does not wrap it yet - call it over plain HTTP in the meantime.

#### Unsupported providers

Not every provider implements the Audio API. Requests routed to a provider without speech synthesis support return `400 Bad Request`:

```http
Status: 400 Bad Request
Content-Type: application/json

{
  "error": "The Audio API is not supported by this provider yet."
}
```

Sound-effect generation is gated separately, because a provider can serve speech without serving sound effects. A `/v1/audio/sfx` request routed to a provider without text-to-sound support - `openai` and the local engine included - returns `400 Bad Request`:

```http
Status: 400 Bad Request
Content-Type: application/json

{
  "error": "Sound effect generation is not supported by this provider yet."
}
```

Music generation is gated the same way. A `/v1/audio/music` request routed to a provider other than `elevenlabs` returns `400 Bad Request`:

```http
Status: 400 Bad Request
Content-Type: application/json

{
  "error": "Music generation is not supported by this provider yet."
}
```

Because the gateway proxies the request, speech traffic shows up in gateway logs, tracing and pricing like any other endpoint. See [Text-to-Speech](/cli-text-to-speech/) for the CLI-side tooling.

The SDKs wrap this endpoint as a single call that returns the raw audio: [`create_speech`](/sdks/#speech-synthesis) in Python (raw `bytes`), [`createSpeech`](/sdks/#speech-synthesis-1) in TypeScript (a `Blob`), [`CreateSpeech`](/sdks/#speech-synthesis-2) in Go and [`create_speech`](/sdks/#speech-synthesis-3) in Rust (raw bytes).

### Videos API

Generate a video from a prompt, a reference image, or an audio clip. The API mirrors the OpenAI Videos API and is split into three operations because video generation is **asynchronous at every provider**: `POST /v1/videos` creates a job and returns at once, `GET /v1/videos/{video_id}` polls it, and `GET /v1/videos/{video_id}/content` downloads the rendered bytes once `status` is `completed`. All three require `VIDEOS_ENABLED=true`; while disabled they return `404 Not Found`.

`elevenlabs` is the only provider that serves it today, with `elevenlabs/creatify-aurora` - a talking-avatar model that renders at `480p` or `720p`. Set `ELEVENLABS_API_KEY` (and optionally `ELEVENLABS_API_URL`) so the gateway can authenticate - see [Configuration](/configuration/#elevenlabs).

The gateway keeps **no job state**. The job `id` is opaque - it may encode the provider - and must be sent back verbatim; the two `GET` operations take the same optional `provider` query parameter as `POST` for when the id alone is not enough to route the request.

#### Create a video generation job

```http
POST /v1/videos?provider={provider}
```

Unlike the other JSON endpoints, the request is `multipart/form-data`, so the reference images and audio clip are uploaded as binary fields. The whole body - every file together - must fit inside `SERVER_MAX_REQUEST_BODY_SIZE` (10 MiB by default).

```bash
curl -X POST http://localhost:8080/v1/videos \
  -H "Authorization: Bearer $INFERENCE_GATEWAY_API_KEY" \
  -F model=elevenlabs/creatify-aurora \
  -F prompt="medium shot, presenter facing the camera, soft studio light" \
  -F size=720x1280 \
  -F input_reference=@portrait.png \
  -F audio=@dialogue.mp3
```

**Response** (`VideoJob`):

```http
Status: 200 OK
Content-Type: application/json

{
  "id": "elevenlabs:vid_01j9x5k2m4",
  "object": "video",
  "model": "elevenlabs/creatify-aurora",
  "status": "queued",
  "progress": 0,
  "created_at": 1758550200,
  "completed_at": null,
  "seconds": "12",
  "size": "720x1280",
  "error": null
}
```

The `CreateVideoRequest` fields:

| Field              | Type     | Required | Description                                                                                                                                                                                                                                                                                                      |
| ------------------ | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`            | `string` | Yes      | Model ID to use for video generation, for example `elevenlabs/creatify-aurora`.                                                                                                                                                                                                                                  |
| `prompt`           | `string` |          | Text description of the video. Optional for audio-driven avatar models, where the dialogue comes from `audio` and the prompt describes framing only - never the spoken words.                                                                                                                                    |
| `input_reference`  | `file`   |          | Image used as the first frame or, for avatar models, the portrait to animate.                                                                                                                                                                                                                                    |
| `reference_images` | `file[]` |          | Repeated binary parts carrying reference images of the subject - the same person or object from several angles - for models that keep a character consistent across shots. Distinct from `input_reference`; avatar (lip-sync) models ignore it. See [Reference images](#reference-images).                       |
| `audio`            | `file`   |          | **Non-standard**: an `audio/wav` or `audio/mpeg` clip that drives a talking-avatar render. When present, the model lip-syncs `input_reference` to it and the video lasts as long as the clip, so `seconds` is ignored. Forwarded as-is; only providers with avatar support honor it, others ignore or reject it. |
| `seconds`          | `string` |          | Requested duration in seconds, as a string (`4`, `8`, `12`). Providers accept a limited set; omit for the provider default. Ignored when `audio` is present.                                                                                                                                                     |
| `size`             | `string` |          | Requested resolution as `widthxheight` (for example `720x1280`). Providers accept a limited set - `creatify-aurora` maps to `480p` and `720p`. Omit for the provider default.                                                                                                                                    |

#### Reference images

`reference_images` is an array, so send one multipart part **per image, all under the same field name** - do not index or bracket the name:

```bash
curl -X POST http://localhost:8080/v1/videos \
  -H "Authorization: Bearer $INFERENCE_GATEWAY_API_KEY" \
  -F model=elevenlabs/veo-3.1-fast-generate-001 \
  -F prompt="the same woman walking through a rainy street at night, neon reflections" \
  -F reference_images=@subject-front.png \
  -F reference_images=@subject-side.png \
  -F reference_images=@subject-three-quarter.png
```

In JavaScript that is `append`, not `set`, which would overwrite the previous part:

```typescript
for (const name of ['subject-front.png', 'subject-side.png']) {
  form.append('reference_images', new Blob([await fs.readFile(name)]), name);
}
```

It is **not** the same field as `input_reference`:

- `input_reference` is a single image the render starts from - the first frame, or for avatar models the portrait to animate.
- `reference_images` describes **what the subject looks like**, so the model can keep the character consistent across shots. It does not fix the first frame.

Both may be sent together. Models that keep a character consistent honor it - `elevenlabs/veo-3.1-*` and `bytedance-seedance-v2*` today - while avatar (lip-sync) models such as `elevenlabs/creatify-aurora` ignore `reference_images` entirely and animate `input_reference` instead.

Every part counts against the gateway's request body limit: `SERVER_MAX_REQUEST_BODY_SIZE` (10 MiB by default) applies to the **whole multipart body**, not per file, so a portrait, an audio clip and several reference images share that budget. Oversized requests are rejected before they reach the provider - downscale the images or raise the limit.

#### Audio-driven avatars

`audio` is a gateway extension the way `reference_audio` is on [`/v1/audio/speech`](#voice-cloning): OpenAI's Videos API has no audio field. Pair it with `input_reference` (the portrait) and the model lip-syncs the face to the clip; the output is exactly as long as the audio. Keep `prompt` to framing, lighting and camera notes - anything spoken must come from the clip, and a prompt that contains dialogue is not read aloud. Today only `elevenlabs/creatify-aurora` honors the field.

A common pipeline synthesizes the dialogue first with [`/v1/audio/speech`](#speech-synthesis), then feeds the resulting file to `/v1/videos` as `audio`.

#### Poll the job

```http
GET /v1/videos/{video_id}?provider={provider}
```

```bash
curl http://localhost:8080/v1/videos/elevenlabs:vid_01j9x5k2m4 \
  -H "Authorization: Bearer $INFERENCE_GATEWAY_API_KEY"
```

Returns the same `VideoJob` shape as create. `status` moves through `queued`, `in_progress` and ends at `completed` or `failed`; `progress` is a `0`-`100` percentage, `completed_at` is `null` until the job finishes, and `error` (`code` + `message`) is set only on failure.

#### Download the rendered video

```http
GET /v1/videos/{video_id}/content?provider={provider}
```

```bash
curl http://localhost:8080/v1/videos/elevenlabs:vid_01j9x5k2m4/content \
  -H "Authorization: Bearer $INFERENCE_GATEWAY_API_KEY" \
  -o avatar.mp4
```

As with audio, the response is **not JSON** - it is the raw video bytes, with a `Content-Type` reflecting the container the provider produced (for example `video/mp4`). Write it to a file. The operation returns `404 Not Found` while the job is still `queued` or `in_progress`, or if it `failed`, so poll first.

#### End-to-end: create, poll, download

The SDKs do not wrap these operations yet - call them over plain HTTP in the meantime:

```typescript
const base = 'http://localhost:8080/v1';
const headers = { Authorization: `Bearer ${process.env.INFERENCE_GATEWAY_API_KEY}` };

const form = new FormData();
form.set('model', 'elevenlabs/creatify-aurora');
form.set('prompt', 'medium shot, presenter facing the camera');
form.set('size', '720x1280');
form.set('input_reference', new Blob([await fs.readFile('portrait.png')]), 'portrait.png');
form.set('audio', new Blob([await fs.readFile('dialogue.mp3')]), 'dialogue.mp3');

let job = await (await fetch(`${base}/videos`, { method: 'POST', headers, body: form })).json();

while (job.status === 'queued' || job.status === 'in_progress') {
  await new Promise((r) => setTimeout(r, 5000));
  job = await (await fetch(`${base}/videos/${job.id}`, { headers })).json();
}
if (job.status === 'failed') throw new Error(job.error?.message);

const res = await fetch(`${base}/videos/${job.id}/content`, { headers });
await fs.writeFile('avatar.mp4', Buffer.from(await res.arrayBuffer()));
```

#### Unsupported providers

Requests routed to a provider without video support return `400 Bad Request`:

```http
Status: 400 Bad Request
Content-Type: application/json

{
  "error": "The Videos API is not supported by this provider yet."
}
```

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

### MCP Server (JSON-RPC)

Expose the gateway itself as an MCP server. Available when both `MCP_ENABLED=true` and `MCP_EXPOSE=true`. Otherwise the gateway answers `403`. The endpoint lives at the **root**, not under `/v1` - `/v1/*` is the OpenAI-compatible surface, while MCP is its own protocol.

```http
POST /mcp
```

The endpoint speaks MCP protocol version `2026-07-28` **only**, over the stateless Streamable HTTP transport. There is no `initialize` handshake and no session. The request body is a single JSON-RPC 2.0 request (or a notification, sent without `id`, acknowledged with `202`):

| Method            | Params                       | Result                                                              |
| ----------------- | ---------------------------- | ------------------------------------------------------------------- |
| `server/discover` | `_meta` only                 | `supportedVersions` (`["2026-07-28"]`) and `capabilities` (`tools`) |
| `tools/list`      | `_meta`, optional `cursor`   | Aggregated, namespaced tools of every healthy MCP server            |
| `tools/call`      | `_meta`, `name`, `arguments` | The tool result                                                     |

Every request's `params._meta` carries `io.modelcontextprotocol/protocolVersion`, `io.modelcontextprotocol/clientInfo` and `io.modelcontextprotocol/clientCapabilities`, mirrored in required headers:

| Header                 | Required         | Must equal                                                |
| ---------------------- | ---------------- | --------------------------------------------------------- |
| `MCP-Protocol-Version` | always           | `params._meta["io.modelcontextprotocol/protocolVersion"]` |
| `Mcp-Method`           | always           | The JSON-RPC `method`                                     |
| `Mcp-Name`             | for `tools/call` | `params.name`; non-ASCII values use `=?base64?<value>?=`  |

Proxies and ingresses must forward these three headers unchanged - stripping or rewriting one answers `400` with `-32020`.

Requests and responses are plain JSON - one JSON-RPC message per `POST`, one JSON body back. There is no SSE response stream; `GET /mcp` and `DELETE /mcp` answer `405`, and a request carrying an `Origin` header is refused with `403` (MCP clients are not browsers - this blocks DNS rebinding). With no `Mcp-Session-Id`, the endpoint needs no session affinity and load-balances freely across replicas. Do not point a probe or ingress health check at it; use `GET /health`.

Tool names are namespaced <code v-pre>mcp_&lt;server alias&gt;_&lt;tool name&gt;</code>, for example `mcp_deepwiki_ask_question`. Aliases come from the `alias=url` syntax in `MCP_SERVERS`. `MCP_INCLUDE_TOOLS` and `MCP_EXCLUDE_TOOLS` apply to this endpoint too: a filtered tool is neither listed nor callable. `tools/list` returns the tools of the healthy servers and skips unreachable ones instead of failing; a `tools/call` routed to an unavailable server returns `-32603`.

```http
POST /mcp
Content-Type: application/json
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: mcp_deepwiki_ask_question

{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "mcp_deepwiki_ask_question",
    "arguments": {
      "repoName": "inference-gateway/inference-gateway",
      "question": "How is MCP wired up?"
    },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientInfo": { "name": "my-client", "version": "1.0.0" },
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

Protocol errors are returned with HTTP `200` and a JSON-RPC error envelope: `-32700` parse error, `-32600` invalid request, `-32602` invalid params (unknown tool name or bad arguments), `-32603` internal error (upstream MCP server failure or unavailability); `-32601` method not found answers `404`. Header and version failures answer HTTP `400` - `-32020` when a required header is missing, malformed, or disagrees with the body (a legacy `initialize` request lands here too), `-32022` for an unsupported protocol version, whose `data` carries `requested` and `supported`. A [guardrails](/configuration/#guardrails) block answers HTTP `403` with the server-defined code `-32001` and the policy's message, for a block at any phase - `pre_call` on the request body, or `tool_args` / `tool_output` around a `tools/call`. Transport-level failures use HTTP status codes - `401` when auth is enabled and the token is missing or invalid, `403` when the MCP surface is not exposed.

The endpoint is covered by the gateway's global auth, so with `AUTH_ENABLED=true` it requires a bearer token like every route except `/health` and the metadata document below. See the [MCP guide](/mcp/#gateway-as-an-mcp-server) for a walkthrough and client configuration.

#### MCP Protected Resource Metadata

```http
GET /.well-known/oauth-protected-resource/mcp
```

The [RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728) Protected Resource Metadata document for `POST /mcp`, which MCP `2026-07-28` requires every protected MCP server to publish. Served without a token, and referenced by the `resource_metadata` parameter of every `401` challenge on `POST /mcp`.

```json
{
  "resource": "https://gateway.example.com/mcp",
  "authorization_servers": ["https://keycloak.example.com/realms/inference-gateway-realm"],
  "bearer_methods_supported": ["header"]
}
```

| Field                      | Type       | Description                                                           |
| -------------------------- | ---------- | --------------------------------------------------------------------- |
| `resource`                 | `string`   | Canonical public URL of the protected resource (`POST /mcp`)          |
| `authorization_servers`    | `string[]` | Issuer identifiers of the authorization servers minting tokens for it |
| `bearer_methods_supported` | `string[]` | How a bearer token may be sent; the gateway reads the header only     |

Returns `404` unless `AUTH_ENABLED=true` and the MCP endpoint is exposed (`MCP_ENABLED=true` and `MCP_EXPOSE=true`). `resource` is `MCP_RESOURCE_URL` when set, otherwise the request scheme (honouring `X-Forwarded-Proto`) and `Host` with `/mcp` appended. Tokens must be issued for that resource ([RFC 8707](https://datatracker.ietf.org/doc/html/rfc8707)); see [MCP resource discovery](/authentication/#mcp-resource-discovery-rfc-9728).

#### MCP status endpoints

Two REST endpoints sit alongside the JSON-RPC surface, both requiring `MCP_ENABLED=true` and `MCP_EXPOSE=true`:

```http
GET /v1/mcp/tools
GET /v1/mcp/health
```

`GET /v1/mcp/tools` returns a [`ListToolsResponse`](#listtoolsresponse) listing the discovered tools with their namespaced names and owning server alias. It is superseded by the `tools/list` method above and is being removed - use `POST /mcp` for new clients. `GET /v1/mcp/health` reports the health of each connected MCP server.

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
POST /metrics
```

::: warning Breaking change
The push endpoint moved from `POST /v1/metrics` to `POST /metrics`, with no fallback. Existing push clients must be updated. Because standard OTLP exporters append `/v1/metrics` to a bare `OTEL_EXPORTER_OTLP_ENDPOINT`, clients must set the full per-signal URL instead:

```bash
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://gateway:8080/metrics
```

:::

**Opt-in**: This endpoint requires both `TELEMETRY_ENABLED=true` and `TELEMETRY_METRICS_PUSH_ENABLED=true`. Returns `403 Forbidden` when disabled.

**Authentication**: When OIDC auth is enabled (`AUTH_ENABLED=true`), this endpoint requires a valid bearer token.

**Request Body** (`ExportMetricsServiceRequest`):

The request body is an OTLP `ExportMetricsServiceRequest` encoded as either:

- `application/x-protobuf` — binary protobuf encoding
- `application/json` — JSON encoding via protojson

Gzip compression is supported via the `Content-Encoding: gzip` header. The maximum decoded payload size is 4 MiB.

```bash
curl -X POST http://localhost:8080/metrics \
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

For vision-capable models, you can include images in your requests using either HTTP URLs or base64-encoded data URLs. Set `VISION_ENABLED=true` in your configuration to have the gateway handle image content (see the note below for what changes).

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

**Note:** When `VISION_ENABLED=false` (the default), the gateway does not inspect image content - it is forwarded to the provider untouched, and the provider decides how to handle it. When `VISION_ENABLED=true`, image parts are stripped only from requests to models known to accept non-image input only and the request continues with text only; every other model, including ones the gateway has no modality information for, is passed through. The gateway does not reject a request for containing an image in either mode.

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

| Field            | Type               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | `string`           | Model identifier (e.g., `"gpt-5"`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `object`         | `string`           | Always `"model"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `created`        | `integer`          | Unix timestamp of model creation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `owned_by`       | `string`           | Organization that owns the model                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `served_by`      | `string`           | Provider serving the model                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `context_window` | `object` \| `null` | Context window object with `tokens` (int) and `source` (`"runtime"`, `"provider"`, or `"community"`). Only present when `include=context_window` is requested. Resolution order, first hit wins: (1) `runtime` - the serving runtime's configured window (e.g. llama.cpp `--ctx-size`, Ollama `num_ctx`), (2) `provider` - the upstream provider's published window, (3) `community` - a window from a table synced from the community-maintained [models.dev](https://models.dev) dataset, (4) `null` - no window could be resolved (models absent from the community table, such as local providers, return an explicit `null`).                                                                                                                                                                                                                                                      |
| `pricing`        | `object` \| `null` | Pricing information. Only present when `include=pricing` is requested. Returns a pricing object with `currency` (string), `input_per_token` (decimal string), `output_per_token` (decimal string), optionally `cache_read_per_token` and `cache_write_per_token` (decimal strings), `source` (`"provider"` or `"community"`), optionally `updated_at` (ISO 8601 string), and optionally `subscription` (boolean, default `false`). When `subscription` is `true`, the model is gated behind a paid subscription with zero per-token rates. Provider-published pricing wins; otherwise rates resolve from a table synced from the community-maintained [models.dev](https://models.dev) dataset (`source: "community"`). Rates the source does not publish are omitted. Models resolvable from neither source (including local providers such as `ollama` and `llamacpp`) return `null`. |

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

Returned by `GET /v1/mcp/tools` when `MCP_EXPOSE=true`. Lists all tools discovered from connected MCP servers. This listing is superseded by the `tools/list` method of [`POST /mcp`](#mcp-server-json-rpc) and is being removed.

| Field   | Type        | Description                               |
| ------- | ----------- | ----------------------------------------- |
| `tools` | `MCPTool[]` | Array of tools available from MCP servers |

#### `MCPTool`

Describes a single tool exposed by an MCP server.

| Field         | Type     | Description                                        |
| ------------- | -------- | -------------------------------------------------- |
| `name`        | `string` | Namespaced tool name, `mcp_<alias>_<tool name>`    |
| `description` | `string` | Human-readable description of what the tool does   |
| `server`      | `string` | Alias of the MCP server that provides this tool    |
| `inputSchema` | `object` | JSON Schema describing the tool's input parameters |

## OpenAPI Specification

For a complete API reference in OpenAPI format, see the [OpenAPI specification file](https://github.com/inference-gateway/inference-gateway/blob/main/openapi.yaml).
