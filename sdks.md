---
title: SDKs
description: Official Inference Gateway SDKs for Python, TypeScript, Go, and Rust. Quick-start examples for chat completions, streaming, tool calls, and vision input across every supported language.
---

# Software Development Kits (SDKs)

Inference Gateway ships official SDKs for Python, TypeScript, Go, and Rust. Each one wraps the gateway's OpenAI-compatible REST API behind typed clients, handles streaming over Server-Sent Events, and exposes the same provider-agnostic surface (chat, tool calls, vision, MCP).

This page is a per-language quick reference. For the canonical REST contract see the [API Reference](/api-reference/); for Model Context Protocol setup see [MCP Integration](/mcp/); for Agent-to-Agent endpoints see [A2A Integration](/a2a/).

## Picking an SDK

All four SDKs target the same gateway endpoints, so the choice is driven by your runtime, not by feature parity. The matrix below tracks which language-level helpers are exposed today.

| Capability             | Python | TypeScript | Go  | Rust |
| ---------------------- | ------ | ---------- | --- | ---- |
| Chat completions       | Yes    | Yes        | Yes | Yes  |
| Streaming (SSE)        | Yes    | Yes        | Yes | Yes  |
| Tool / function calls  | Yes    | Yes        | Yes | Yes  |
| Vision (image input)   | Yes    | Yes        | Yes | Yes  |
| MCP tools (list)       | Yes    | Yes        | Yes | Yes  |
| Reasoning content      | Yes    | Yes        | Yes | Yes  |
| Proxy passthrough      | Yes    | Yes        | No  | No   |
| Built-in retry/backoff | No     | No         | Yes | No   |
| A2A JSON-RPC client    | No     | No         | No  | No   |

A2A is a gateway-side capability today and is consumed via raw HTTP / JSON-RPC against the gateway's `/a2a/*` endpoints rather than a typed SDK surface; see the [A2A page](/a2a/) for the wire format.

MCP tools are managed server-side. The SDKs expose `list_tools` for discovery and surface tool-call deltas during streaming; you do not need to ship per-tool client glue. Set `MCP_ENABLE=true` and `MCP_EXPOSE=true` on the gateway to enable the listing endpoint.

Reasoning content is emitted by reasoning-capable models rather than toggled by a dedicated flag: every SDK surfaces `reasoning` and `reasoning_content` on the streaming delta, and the TypeScript SDK adds an `onReasoning` callback. The shared `reasoning_format` request field (`raw` or `parsed`) controls whether think-tags stay inline or are split into `reasoning_content`.

## Python

The Python SDK targets Python 3.12+, uses Pydantic models for validation, and ships with both a `requests` and an `httpx` backend.

- Package: [`inference-gateway`](https://pypi.org/project/inference-gateway/) (latest: `0.6.2`)
- Repository: [inference-gateway/python-sdk](https://github.com/inference-gateway/python-sdk)
- Examples: [python-sdk/examples](https://github.com/inference-gateway/python-sdk/tree/main/examples)

```bash
pip install inference-gateway
```

### Chat completion

```python
from inference_gateway import InferenceGatewayClient, Message

client = InferenceGatewayClient('http://localhost:8080/v1')

response = client.create_chat_completion(
    model='deepseek/deepseek-v4-flash',
    messages=[
        Message(role='system', content='You are a helpful assistant.'),
        Message(role='user', content='What is Python?'),
    ],
)

print(response.choices[0].message.content.root)
```

### Streaming

`create_chat_completion_stream` yields `SSEvent` objects; parse `chunk.data` into `CreateChatCompletionStreamResponse` to walk deltas.

```python
import json
from inference_gateway import InferenceGatewayClient, Message
from inference_gateway.models import CreateChatCompletionStreamResponse

client = InferenceGatewayClient('http://localhost:8080/v1')

for chunk in client.create_chat_completion_stream(
    model='deepseek/deepseek-v4-flash',
    messages=[Message(role='user', content='Tell me a story.')],
):
    if not chunk.data:
        continue
    data = json.loads(chunk.data)
    stream_response = CreateChatCompletionStreamResponse.model_validate(data)
    for choice in stream_response.choices:
        if choice.delta.content:
            print(choice.delta.content, end='', flush=True)
```

### Tool calls

```python
from inference_gateway import InferenceGatewayClient, Message
from inference_gateway.models import ChatCompletionTool, FunctionObject, FunctionParameters

client = InferenceGatewayClient('http://localhost:8080/v1')

tools = [
    ChatCompletionTool(
        type='function',
        function=FunctionObject(
            name='get_current_weather',
            description='Get the current weather in a given location',
            parameters=FunctionParameters(
                type='object',
                properties={
                    'location': {
                        'type': 'string',
                        'description': 'The city and state, e.g. San Francisco, CA',
                    },
                    'unit': {
                        'type': 'string',
                        'enum': ['celsius', 'fahrenheit'],
                    },
                },
                required=['location'],
            ),
        ),
    ),
]

response = client.create_chat_completion(
    model='deepseek/deepseek-v4-flash',
    messages=[Message(role='user', content='What is the weather in New York?')],
    tools=tools,
)

for tool_call in response.choices[0].message.tool_calls or []:
    print(tool_call.function.name, tool_call.function.arguments)
```

### Vision (image input)

```python
from inference_gateway import (
    InferenceGatewayClient,
    Message,
    TextContentPart,
    ImageContentPart,
    ImageURL,
)

client = InferenceGatewayClient('http://localhost:8080/v1')

response = client.create_chat_completion(
    model='anthropic/claude-opus-4-8',
    messages=[
        Message(
            role='user',
            content=[
                TextContentPart(type='text', text='What is in this image?'),
                ImageContentPart(
                    type='image_url',
                    image_url=ImageURL(
                        url='https://example.com/image.jpg',
                        detail='auto',
                    ),
                ),
            ],
        ),
    ],
)
```

Base64 data URLs (`data:image/jpeg;base64,...`) are accepted for the `url` field. Detail levels: `auto` (default), `low`, `high`.

### Reasoning

Reasoning-capable models emit their chain-of-thought separately from the answer. The `reasoning_format` request field controls the shape: `raw` leaves think-tags inline in the content, while `parsed` splits the chain-of-thought into the message's `reasoning_content` (also mirrored on `reasoning`). Pass it as a keyword argument and it flows through to the request body.

```python
from inference_gateway import InferenceGatewayClient, Message

client = InferenceGatewayClient('http://localhost:8080/v1')

response = client.create_chat_completion(
    model='deepseek/deepseek-reasoner',
    messages=[Message(role='user', content='How many r are in strawberry?')],
    reasoning_format='parsed',
)

message = response.choices[0].message
print('Reasoning:', message.reasoning_content)
print('Answer:', message.content.root)
```

During streaming the same fields ride on each delta. In the Streaming loop above, read them next to the content:

```python
for choice in stream_response.choices:
    if choice.delta.reasoning_content:
        print(choice.delta.reasoning_content, end='', flush=True)
    if choice.delta.content:
        print(choice.delta.content, end='', flush=True)
```

### Provider-specific tool-call metadata

Some providers attach opaque metadata to a tool call that must survive the round-trip. Google Gemini's extended-thinking models return a `thought_signature` on every reasoning-enabled tool call; the gateway surfaces it on `tool_call.extra_content.google.thought_signature` (typed as `ToolCallExtraContent` / `Google`). Gemini rejects the follow-up request unless that signature is echoed back verbatim with the same tool call.

The SDK preserves it for you: append the returned assistant `Message` to your conversation unchanged and `extra_content` round-trips automatically. Inspect it directly only if you need to log or forward it. (Here `messages` and `tools` come from the Tool calls example above, and `run_tool` is your own executor that runs a tool call and returns its result as a string.)

```python
response = client.create_chat_completion(
    model='google/gemini-3-flash',
    messages=messages,
    tools=tools,
)

assistant_message = response.choices[0].message

for tool_call in assistant_message.tool_calls or []:
    extra = tool_call.extra_content
    if extra and extra.google and extra.google.thought_signature:
        print('thought_signature:', extra.google.thought_signature)

# Append the assistant message unchanged so extra_content (Google's
# thought_signature) is echoed back verbatim on the follow-up request.
messages.append(assistant_message)
for tool_call in assistant_message.tool_calls or []:
    result = run_tool(tool_call)  # your executor -> str
    messages.append(Message(role='tool', tool_call_id=tool_call.id, content=result))

final = client.create_chat_completion(
    model='google/gemini-3-flash',
    messages=messages,
    tools=tools,
)
```

### Models, tools, and health

`list_models` returns every model across configured providers, or a single provider's catalog when you pass `provider=`. `list_tools` enumerates gateway-managed MCP tools and requires MCP to be exposed (`MCP_ENABLE=true` and `MCP_EXPOSE=true`); otherwise the call raises `InferenceGatewayAPIError`. `health_check` probes the gateway and returns a `bool` - it swallows transport errors and returns `False` rather than raising.

```python
from inference_gateway import InferenceGatewayClient

client = InferenceGatewayClient('http://localhost:8080/v1')

# Liveness probe - True when healthy, False on any error (never raises).
if not client.health_check():
    raise RuntimeError('gateway is not healthy')

# Every model across all configured providers.
models = client.list_models()
for model in models.data:
    print('model:', model.id, '->', model.served_by.root)

# Narrow the listing to a single provider.
openai_models = client.list_models(provider='openai')

# MCP tools (requires MCP exposed on the gateway).
tools = client.list_tools()
for tool in tools.data:
    print(f'tool: {tool.name} (server: {tool.server})')
```

`list_models` accepts a `Provider` or a plain string; `model.served_by` is a `Provider`, so read its string via `.root`.

### Proxy passthrough

`proxy_request` forwards a raw request to a provider through the gateway's `/proxy/{provider}/{path}` route and returns the parsed JSON body as a `dict`, letting you reach provider endpoints the typed surface doesn't wrap (for example embeddings). Pass `method='POST'` with a `json_data` dict for write calls.

```python
from inference_gateway import InferenceGatewayClient

client = InferenceGatewayClient('http://localhost:8080/v1')

embeddings = client.proxy_request(
    provider='openai',
    path='embeddings',
    method='POST',
    json_data={
        'model': 'text-embedding-3-small',
        'input': 'Hello world',
    },
)

print(embeddings)
```

`provider` accepts a `Provider` or a plain string; `method` defaults to `GET`.

### Client options

The constructor takes the gateway URL plus three optional settings.

| Parameter   | Type            | Default      | Purpose                                                        |
| ----------- | --------------- | ------------ | -------------------------------------------------------------- |
| `base_url`  | `str`           | _(required)_ | Gateway base URL, including the `/v1` suffix.                  |
| `token`     | `str` \| `None` | `None`       | Sent as an `Authorization: Bearer` header on every request.    |
| `timeout`   | `float`         | `30.0`       | Per-request timeout in seconds.                                |
| `use_httpx` | `bool`          | `False`      | Use the `httpx` backend instead of the default `requests` one. |

The client is also a context manager: enter it with `with` and it calls `close()` on exit, which releases the connection pool when you're on the `httpx` backend.

```python
from inference_gateway import InferenceGatewayClient, Message

with InferenceGatewayClient(
    'http://localhost:8080/v1',
    token='your-api-token',
    timeout=60.0,
    use_httpx=True,
) as client:
    response = client.create_chat_completion(
        model='deepseek/deepseek-v4-flash',
        messages=[Message(role='user', content='Hello!')],
    )
    print(response.choices[0].message.content.root)
```

## TypeScript

The TypeScript SDK targets Node 18+ and runs in any environment with `fetch` and Web Streams (Node, Deno, Bun, modern browsers, edge runtimes).

- Package: [`@inference-gateway/sdk`](https://www.npmjs.com/package/@inference-gateway/sdk) (latest: `0.8.5`)
- Repository: [inference-gateway/typescript-sdk](https://github.com/inference-gateway/typescript-sdk)
- Examples: [typescript-sdk/examples](https://github.com/inference-gateway/typescript-sdk/tree/main/examples)

```bash
npm i @inference-gateway/sdk
```

### Chat completion

```typescript
import { InferenceGatewayClient, MessageRole } from '@inference-gateway/sdk';

const client = new InferenceGatewayClient({
  baseURL: 'http://localhost:8080/v1',
});

const response = await client.createChatCompletion({
  model: 'deepseek/deepseek-v4-flash',
  messages: [
    { role: MessageRole.System, content: 'You are a helpful assistant.' },
    { role: MessageRole.User, content: 'Tell me a joke.' },
  ],
});

console.log(response.choices[0].message.content);
```

### Streaming

Streaming uses a callback API rather than an async iterator so consumers can plug straight into UI event loops.

```typescript
import { InferenceGatewayClient, MessageRole } from '@inference-gateway/sdk';

const client = new InferenceGatewayClient({
  baseURL: 'http://localhost:8080/v1',
});

await client.streamChatCompletion(
  {
    model: 'deepseek/deepseek-v4-flash',
    messages: [{ role: MessageRole.User, content: 'Tell me a story.' }],
  },
  {
    onOpen: () => console.log('Stream opened'),
    onContent: (content) => process.stdout.write(content),
    onUsageMetrics: (metrics) => console.log('Usage:', metrics),
    onFinish: () => console.log('\nDone'),
    onError: (error) => console.error('Stream error:', error),
  }
);
```

### Tool calls

The `onTool` callback fires for every tool-call delta the model emits. Inspect `toolCall.function.name` and `toolCall.function.arguments` to dispatch.

```typescript
import { InferenceGatewayClient, MessageRole } from '@inference-gateway/sdk';

const client = new InferenceGatewayClient({
  baseURL: 'http://localhost:8080/v1',
});

await client.streamChatCompletion(
  {
    model: 'deepseek/deepseek-v4-flash',
    messages: [{ role: MessageRole.User, content: "What's the weather in San Francisco?" }],
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'City and state' },
            },
            required: ['location'],
          },
        },
      },
    ],
  },
  {
    onTool: (toolCall) => {
      console.log('Tool:', toolCall.function.name, toolCall.function.arguments);
    },
    onContent: (content) => process.stdout.write(content),
    onFinish: () => console.log('\nDone'),
  }
);
```

### Vision (image input)

Pass an array of content parts (text + `image_url`) as the message content. Works with the same `createChatCompletion` / `streamChatCompletion` methods.

```typescript
import { InferenceGatewayClient, MessageRole } from '@inference-gateway/sdk';

const client = new InferenceGatewayClient({
  baseURL: 'http://localhost:8080/v1',
});

const response = await client.createChatCompletion({
  model: 'anthropic/claude-opus-4-8',
  messages: [
    {
      role: MessageRole.User,
      content: [
        { type: 'text', text: 'What is in this image?' },
        {
          type: 'image_url',
          image_url: {
            url: 'https://example.com/image.jpg',
            detail: 'auto',
          },
        },
      ],
    },
  ],
});

console.log(response.choices[0].message.content);
```

### Reasoning and MCP tool callbacks

`streamChatCompletion` decodes each SSE delta and fans it out to typed callbacks. Beyond the handlers shown above, the full set covers reasoning models and gateway-managed MCP tools:

| Callback         | Fires on                                                       |
| ---------------- | -------------------------------------------------------------- |
| `onOpen`         | the stream connection opening                                  |
| `onChunk`        | every raw `CreateChatCompletionStreamResponse` delta           |
| `onReasoning`    | `reasoning` / `reasoning_content` deltas from reasoning models |
| `onContent`      | assistant content deltas                                       |
| `onTool`         | a completed tool call you supplied in `request.tools`          |
| `onMCPTool`      | a completed server-side MCP tool call                          |
| `onUsageMetrics` | the final usage block (the SDK sets `include_usage` for you)   |
| `onFinish`       | the stream ending (receives the final chunk or `null`)         |
| `onError`        | transport failures and mid-stream gateway errors               |

`onReasoning` receives the reasoning text as a plain string. Pair it with the request's `reasoning_format` field (`raw` or `parsed`) to control whether think-tags stay inline or are split into `reasoning_content`.

```typescript
import { InferenceGatewayClient, MessageRole } from '@inference-gateway/sdk';

const client = new InferenceGatewayClient({
  baseURL: 'http://localhost:8080/v1',
});

await client.streamChatCompletion(
  {
    model: 'deepseek/deepseek-reasoner',
    messages: [{ role: MessageRole.User, content: 'How many r are in strawberry?' }],
  },
  {
    onReasoning: (reasoning) => process.stdout.write(reasoning),
    onContent: (content) => process.stdout.write(content),
    onFinish: () => console.log('\nDone'),
  }
);
```

`onMCPTool` is distinct from `onTool`. The SDK records every tool name you pass in `request.tools`; a completed tool call whose name matches one of those routes to `onTool`, and any other completed call is treated as a gateway-managed MCP tool and routed to `onMCPTool` once its JSON arguments parse cleanly. MCP tools are discovered and executed server-side, so you never register them on the request - enable them with `MCP_ENABLE=true` and `MCP_EXPOSE=true` on the gateway and they stream in alongside your own tools.

```typescript
await client.streamChatCompletion(
  {
    model: 'deepseek/deepseek-v4-flash',
    messages: [{ role: MessageRole.User, content: 'What files are in the project root?' }],
  },
  {
    onMCPTool: (toolCall) => {
      console.log('MCP tool:', toolCall.function.name);
      console.log('Arguments:', toolCall.function.arguments);
    },
    onContent: (content) => process.stdout.write(content),
    onFinish: () => console.log('\nDone'),
  }
);
```

### Models, tools, and health

`listModels` returns every model across configured providers, or a single provider's catalog when you pass a `Provider`. `listTools` enumerates MCP tools and only resolves when MCP is exposed on the gateway - an un-exposed gateway answers `403 Forbidden`. `healthCheck` probes the gateway's root `/health` endpoint and resolves to a boolean rather than throwing.

```typescript
import { InferenceGatewayClient, Provider } from '@inference-gateway/sdk';

const client = new InferenceGatewayClient({
  baseURL: 'http://localhost:8080/v1',
});

// Liveness probe - true on success, false on any error.
if (!(await client.healthCheck())) {
  throw new Error('gateway is not healthy');
}

// Every model from every configured provider.
const models = await client.listModels();
for (const model of models.data) {
  console.log('model:', model.id);
}

// Narrow the listing to a single provider.
const openaiModels = await client.listModels(Provider.openai);

// MCP tools (requires MCP exposed on the gateway).
const tools = await client.listTools();
for (const tool of tools.data) {
  console.log(`tool: ${tool.name} (server: ${tool.server})`);
}
```

### Proxy passthrough

`proxy` forwards a raw request to a provider through the gateway's `/proxy/{provider}/{path}` route and returns the parsed JSON body, letting you reach provider endpoints the typed surface doesn't wrap (for example embeddings). The proxy route lives at the gateway root rather than under `/v1`, so point the client at the base host for these calls.

```typescript
import { InferenceGatewayClient, Provider } from '@inference-gateway/sdk';

// Proxy and health live at the gateway root, not under /v1.
const client = new InferenceGatewayClient({
  baseURL: 'http://localhost:8080',
});

const embeddings = await client.proxy(Provider.openai, 'embeddings', {
  method: 'POST',
  body: JSON.stringify({
    model: 'text-embedding-3-small',
    input: 'Hello world',
  }),
});

console.log(embeddings);
```

`proxy` is generic (`proxy<T>(...)`), so annotate the call with the provider's response type when you know its shape.

### Client options

The constructor accepts a `ClientOptions` object; every field is optional.

| Option           | Type                     | Default                    | Purpose                                                              |
| ---------------- | ------------------------ | -------------------------- | -------------------------------------------------------------------- |
| `baseURL`        | `string`                 | `http://localhost:8080/v1` | Gateway base URL.                                                    |
| `apiKey`         | `string`                 | -                          | Sent as an `Authorization: Bearer` header on every request.          |
| `defaultHeaders` | `Record<string, string>` | `{}`                       | Merged into the headers of every request.                            |
| `defaultQuery`   | `Record<string, string>` | `{}`                       | Merged into the query string of every request.                       |
| `timeout`        | `number`                 | `60000`                    | Per-request timeout in milliseconds, enforced via `AbortController`. |
| `fetch`          | `typeof fetch`           | `globalThis.fetch`         | Custom `fetch` implementation for non-standard runtimes.             |

`withOptions` returns a new client with the supplied options merged over the current ones - `defaultHeaders` and `defaultQuery` are shallow-merged while the other fields are replaced - so you can derive a per-call client without mutating the original.

```typescript
import { InferenceGatewayClient } from '@inference-gateway/sdk';

const client = new InferenceGatewayClient({
  baseURL: 'http://localhost:8080/v1',
  apiKey: process.env.INFERENCE_GATEWAY_API_KEY,
  timeout: 30000,
});

// Derive a client that adds a tracing header without touching the original.
const traced = client.withOptions({
  defaultHeaders: { 'X-Trace-Id': 'checkout-flow' },
});
```

## Go

The Go SDK ships an idiomatic context-aware client with built-in exponential-backoff retries and header chaining.

- Module: [`github.com/inference-gateway/sdk`](https://pkg.go.dev/github.com/inference-gateway/sdk) (latest: `v1.16.4`)
- Repository: [inference-gateway/sdk](https://github.com/inference-gateway/sdk)
- Examples: [sdk/examples](https://github.com/inference-gateway/sdk/tree/main/examples)

```bash
go get github.com/inference-gateway/sdk
```

### Chat completion

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"

    sdk "github.com/inference-gateway/sdk"
)

func main() {
    client := sdk.NewClient(&sdk.ClientOptions{
        BaseURL: "http://localhost:8080/v1",
    })

    ctx := context.Background()
    resp, err := client.GenerateContent(
        ctx,
        sdk.Deepseek,
        "deepseek/deepseek-v4-flash",
        []sdk.Message{
            {Role: sdk.System, Content: sdk.NewMessageContent("You are a helpful assistant.")},
            {Role: sdk.User, Content: sdk.NewMessageContent("What is Go?")},
        },
    )
    if err != nil {
        log.Fatalf("generate: %v", err)
    }

    var chat sdk.CreateChatCompletionResponse
    if err := json.Unmarshal(resp.RawResponse, &chat); err != nil {
        log.Fatalf("unmarshal: %v", err)
    }
    fmt.Println(chat.Choices[0].Message.Content)
}
```

### Streaming

`GenerateContentStream` returns a channel of typed SSE events. Decode `event.Data` into `CreateChatCompletionStreamResponse` to read deltas.

```go
events, err := client.GenerateContentStream(
    ctx,
    sdk.Deepseek,
    "deepseek/deepseek-v4-flash",
    []sdk.Message{
        {Role: sdk.User, Content: sdk.NewMessageContent("Write a poem.")},
    },
)
if err != nil {
    log.Fatalf("stream: %v", err)
}

for event := range events {
    if event.Event == nil || event.Data == nil {
        continue
    }
    switch *event.Event {
    case sdk.ContentDelta:
        var chunk sdk.CreateChatCompletionStreamResponse
        if err := json.Unmarshal(*event.Data, &chunk); err != nil {
            continue
        }
        for _, choice := range chunk.Choices {
            if choice.Delta.Content != "" {
                fmt.Print(choice.Delta.Content)
            }
        }
    case sdk.StreamEnd:
        fmt.Println()
    }
}
```

### Tool calls

`WithTools` attaches tools to the next request. The model's tool calls land on `Message.ToolCalls`.

```go
tools := []sdk.ChatCompletionTool{
    {
        Type: sdk.Function,
        Function: sdk.FunctionObject{
            Name:        "get_current_weather",
            Description: sdk.Ptr("Get the current weather in a given location"),
            Parameters: &sdk.FunctionParameters{
                "type": "object",
                "properties": map[string]any{
                    "location": map[string]any{
                        "type":        "string",
                        "description": "City and state",
                    },
                    "unit": map[string]any{
                        "type": "string",
                        "enum": []string{"celsius", "fahrenheit"},
                    },
                },
                "required": []string{"location"},
            },
        },
    },
}

resp, err := client.WithTools(&tools).GenerateContent(
    ctx,
    sdk.Deepseek,
    "deepseek/deepseek-v4-flash",
    []sdk.Message{
        {Role: sdk.User, Content: sdk.NewMessageContent("What is the weather in New York?")},
    },
)
```

### Vision (image input)

Use `NewImageContentPart` / `NewTextContentPart` and pass them via `NewImageMessage`.

```go
textPart, _ := sdk.NewTextContentPart("What is in this image?")
imagePart, _ := sdk.NewImageContentPart(
    "https://example.com/image.jpg",
    nil, // nil -> auto. Pass &sdk.High or &sdk.Low to override.
)

visionMessage, _ := sdk.NewImageMessage(sdk.User, []sdk.ContentPart{textPart, imagePart})

resp, err := client.GenerateContent(
    ctx,
    sdk.Anthropic,
    "anthropic/claude-opus-4-8",
    []sdk.Message{visionMessage},
)
```

Base64 data URLs are accepted as the image URL.

### Models, tools, and health

`ListModels` returns every model across all configured providers, while `ListProviderModels` scopes the listing to a single `Provider`. `ListTools` enumerates gateway-managed MCP tools from the `/mcp/tools` endpoint and requires MCP to be exposed (`MCP_ENABLE=true` and `MCP_EXPOSE=true`); otherwise it returns an error. Unlike the other SDKs, Go's `HealthCheck` returns an `error` rather than a `bool` - it probes the gateway's root `/health` endpoint and returns `nil` when the gateway is healthy.

```go
client := sdk.NewClient(&sdk.ClientOptions{
    BaseURL: "http://localhost:8080/v1",
})
ctx := context.Background()

// Liveness probe - a nil error means healthy.
if err := client.HealthCheck(ctx); err != nil {
    log.Fatalf("gateway is not healthy: %v", err)
}

// Every model across all configured providers.
models, err := client.ListModels(ctx)
if err != nil {
    log.Fatalf("list models: %v", err)
}
for _, model := range models.Data {
    fmt.Printf("model: %s (served by %s)\n", model.ID, model.ServedBy)
}

// Narrow the listing to a single provider.
groqModels, err := client.ListProviderModels(ctx, sdk.Groq)
if err != nil {
    log.Fatalf("list provider models: %v", err)
}
fmt.Printf("provider: %s\n", *groqModels.Provider)

// MCP tools (requires MCP exposed on the gateway).
tools, err := client.ListTools(ctx)
if err != nil {
    log.Fatalf("list tools: %v", err)
}
for _, tool := range tools.Data {
    fmt.Printf("tool: %s (server: %s)\n", tool.Name, tool.Server)
}
```

`ListModelsResponse.Provider` is a `*Provider`, so dereference it (`*groqModels.Provider`) when you read the scoped listing's provider back.

### Middleware bypass

`WithMiddlewareOptions` is a Go-only escape hatch that controls gateway middleware for subsequent requests. `SkipMCP` sends `X-MCP-Bypass: true` to skip MCP processing, and `DirectProvider` sends `X-Direct-Provider: true` to route straight to the upstream provider. Both flags are off by default, and the call clears any bypass header it does not set, so pass every flag you want enabled in a single call.

```go
resp, err := client.
    WithMiddlewareOptions(&sdk.MiddlewareOptions{
        SkipMCP:        true,
        DirectProvider: true,
    }).
    GenerateContent(
        ctx,
        sdk.Deepseek,
        "deepseek/deepseek-v4-flash",
        []sdk.Message{
            {Role: sdk.User, Content: sdk.NewMessageContent("Answer without MCP tooling.")},
        },
    )
```

You can also set the headers yourself, which is handy when you only want one of them:

```go
resp, err := client.
    WithHeader("X-MCP-Bypass", "true").
    GenerateContent(ctx, sdk.Deepseek, "deepseek/deepseek-v4-flash", messages)
```

Both headers require a gateway build that honors them; a gateway that does not recognize the bypass runs the full middleware chain anyway. A runnable walkthrough lives in [sdk/examples/middleware-bypass](https://github.com/inference-gateway/sdk/tree/main/examples/middleware-bypass).

### Custom headers

Set headers globally through `ClientOptions.Headers`, or chain them onto an existing client with `WithHeaders` (a map) and `WithHeader` (a single name/value pair). All three apply to every subsequent request, so reach for them when you need tenancy tags, tracing IDs, or provider-specific passthrough headers.

```go
// Set on construction.
client := sdk.NewClient(&sdk.ClientOptions{
    BaseURL: "http://localhost:8080/v1",
    Headers: map[string]string{
        "X-Tenant-ID": "acme",
    },
})

// Or chain onto an existing client.
client = client.
    WithHeader("X-Trace-Id", "checkout-flow").
    WithHeaders(map[string]string{
        "X-Env":    "staging",
        "X-Caller": "batch-job",
    })
```

### Retry and backoff

Retries are on by default: every request method runs through an exponential-backoff loop that retries transient transport errors plus the retryable status codes `408`, `429`, `500`, `502`, `503`, and `504`. On a `429` the client honors the response's `Retry-After` header (seconds or an HTTP-date) instead of its computed backoff. Tune or disable all of this through `ClientOptions.RetryConfig`.

| Field                  | Type                                                | Default                        | Purpose                                                            |
| ---------------------- | --------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------ |
| `Enabled`              | `bool`                                              | `true`                         | Master switch; set `false` to issue each request exactly once.     |
| `MaxAttempts`          | `int`                                               | `3`                            | Total attempts, including the initial request.                     |
| `InitialBackoffSec`    | `int`                                               | `2`                            | Delay before the first retry, in seconds.                          |
| `MaxBackoffSec`        | `int`                                               | `30`                           | Ceiling for the computed backoff, in seconds.                      |
| `BackoffMultiplier`    | `int`                                               | `2`                            | Factor the delay grows by on each attempt.                         |
| `RetryableStatusCodes` | `[]int`                                             | `408, 429, 500, 502, 503, 504` | Status codes that trigger a retry; replaces the defaults when set. |
| `OnRetry`              | `func(attempt int, err error, delay time.Duration)` | `nil`                          | Callback fired before each retry - handy for logging.              |

```go
client := sdk.NewClient(&sdk.ClientOptions{
    BaseURL: "http://localhost:8080/v1",
    RetryConfig: &sdk.RetryConfig{
        Enabled:              true,
        MaxAttempts:          5,
        InitialBackoffSec:    1,
        MaxBackoffSec:        20,
        BackoffMultiplier:    2,
        RetryableStatusCodes: []int{429, 503},
        OnRetry: func(attempt int, err error, delay time.Duration) {
            log.Printf("retry %d after %s: %v", attempt, delay, err)
        },
    },
})
```

Leave `RetryConfig` nil to inherit the defaults above, or set `Enabled: false` to turn retries off entirely.

### Client options

`NewClient` takes a `ClientOptions` struct; only `BaseURL` is required.

| Field         | Type                    | Default      | Purpose                                                        |
| ------------- | ----------------------- | ------------ | -------------------------------------------------------------- |
| `BaseURL`     | `string`                | _(required)_ | Gateway base URL, including the `/v1` suffix.                  |
| `APIKey`      | `string`                | -            | Sent as an `Authorization: Bearer` header on every request.    |
| `Timeout`     | `time.Duration`         | none         | Per-request timeout; unset means no client-side timeout.       |
| `Tools`       | `*[]ChatCompletionTool` | `nil`        | Default tools attached to every request (see Tool calls).      |
| `Headers`     | `map[string]string`     | `nil`        | Custom headers merged into every request (see Custom headers). |
| `RetryConfig` | `*RetryConfig`          | _(built-in)_ | Retry/backoff tuning (see Retry and backoff).                  |

## Rust

The Rust SDK is async-only (Tokio) and exposes the gateway over a typed `InferenceGatewayAPI` trait for easy mocking in tests.

- Crate: [`inference-gateway-sdk`](https://crates.io/crates/inference-gateway-sdk) (latest: `0.13.4`)
- Repository: [inference-gateway/rust-sdk](https://github.com/inference-gateway/rust-sdk)
- Examples: [rust-sdk/examples](https://github.com/inference-gateway/rust-sdk/tree/main/examples)

```bash
cargo add inference-gateway-sdk
```

### Client setup

`InferenceGatewayClient::new(base_url)` targets an explicit gateway URL. `new_default()` instead reads the `INFERENCE_GATEWAY_URL` environment variable, falling back to `http://localhost:8080/v1` when it is unset. Both return an owned client; the `with_token` and `with_max_tokens` builders consume and return `self`, so chain them before issuing a request.

```rust
use inference_gateway_sdk::InferenceGatewayClient;

// Explicit base URL.
let client = InferenceGatewayClient::new("http://localhost:8080/v1");

// Or read INFERENCE_GATEWAY_URL (falls back to http://localhost:8080/v1).
let client = InferenceGatewayClient::new_default()
    .with_token("my-api-token") // Bearer token sent on every request.
    .with_max_tokens(Some(1024)); // Cap tokens generated per request.
```

`with_token` accepts anything that is `Into<String>`; `with_max_tokens` takes an `Option<i64>`, so pass `None` to clear a previously set cap.

### Chat completion

```rust
use inference_gateway_sdk::{
    CreateChatCompletionResponse, GatewayError, InferenceGatewayAPI, InferenceGatewayClient,
    Message, MessageContent, MessageRole, Provider,
};

fn message(role: MessageRole, text: &str) -> Message {
    Message {
        role,
        content: MessageContent::String(text.to_string()),
        reasoning: None,
        reasoning_content: None,
        tool_call_id: None,
        tool_calls: Vec::new(),
    }
}

#[tokio::main]
async fn main() -> Result<(), GatewayError> {
    let client = InferenceGatewayClient::new("http://localhost:8080/v1");

    let response: CreateChatCompletionResponse = client
        .generate_content(
            Provider::Deepseek,
            "deepseek-v4-flash",
            vec![
                message(MessageRole::System, "You are a helpful assistant."),
                message(MessageRole::User, "What is Rust?"),
            ],
        )
        .await?;

    println!("{:?}", response.choices[0].message.content);
    Ok(())
}
```

### Streaming

`generate_content_stream` returns a `Stream` of typed SSE events. Pin it and iterate with `StreamExt::next`.

```rust
use futures_util::{pin_mut, StreamExt};
use inference_gateway_sdk::{
    CreateChatCompletionStreamResponse, GatewayError, InferenceGatewayAPI,
    InferenceGatewayClient, MessageRole, Provider,
};

#[tokio::main]
async fn main() -> Result<(), GatewayError> {
    let client = InferenceGatewayClient::new("http://localhost:8080/v1");
    let stream = client.generate_content_stream(
        Provider::Deepseek,
        "deepseek-v4-flash",
        vec![message(MessageRole::User, "Write a poem")],
    );
    pin_mut!(stream);

    while let Some(event) = stream.next().await {
        let event = event?;
        if event.data == "[DONE]" {
            break;
        }
        let chunk: CreateChatCompletionStreamResponse = serde_json::from_str(&event.data)?;
        if let Some(choice) = chunk.choices.first() {
            if let Some(content) = choice.delta.content.as_ref() {
                print!("{}", content);
            }
        }
    }
    Ok(())
}
```

### Tool calls

Attach tools with `with_tools`. Tool calls show up on `choice.message.tool_calls`; reply to them with `MessageRole::Tool` messages carrying the matching `tool_call_id`.

```rust
use inference_gateway_sdk::{
    ChatCompletionTool, ChatCompletionToolType, FunctionObject, FunctionParameters,
    GatewayError, InferenceGatewayAPI, InferenceGatewayClient, MessageRole, Provider,
};
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), GatewayError> {
    let client = InferenceGatewayClient::new("http://localhost:8080/v1");

    let parameters = json!({
        "type": "object",
        "properties": {
            "location": { "type": "string", "description": "City and state" }
        },
        "required": ["location"]
    });
    let tools = vec![ChatCompletionTool {
        type_: ChatCompletionToolType::Function,
        function: FunctionObject {
            name: "get_current_weather".to_string(),
            description: Some("Get the weather for a location".to_string()),
            parameters: Some(FunctionParameters(parameters.as_object().unwrap().clone())),
            strict: false,
        },
    }];

    let response = client
        .with_tools(Some(tools))
        .generate_content(
            Provider::Deepseek,
            "deepseek-v4-flash",
            vec![message(MessageRole::User, "What is the weather in Berlin?")],
        )
        .await?;

    if let Some(choice) = response.choices.first() {
        for call in &choice.message.tool_calls {
            println!("tool: {} args: {}", call.function.name, call.function.arguments);
        }
    }
    Ok(())
}
```

`function.arguments` arrives as a JSON-encoded string (the OpenAI wire format), not a structured object. Rather than hand-parsing it, call `parse_arguments::<T>()` on the tool-call function to deserialize straight into any `serde::Deserialize` type.

```rust
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct WeatherArgs {
    location: String,
}

if let Some(choice) = response.choices.first() {
    for call in &choice.message.tool_calls {
        // `arguments` is a JSON string; parse it into your own type.
        let args: WeatherArgs = call.function.parse_arguments()?;
        println!("tool: {} location: {}", call.function.name, args.location);
    }
}
```

### Vision (image input)

`MessageContent` is an enum: `String(...)` for plain text, `Array(Vec<ContentPart>)` for multimodal. Build image messages with `ContentPart::ImageContentPart`.

```rust
use inference_gateway_sdk::{
    ContentPart, ImageContentPart, ImageContentPartType, ImageUrl, InferenceGatewayAPI,
    InferenceGatewayClient, Message, MessageContent, MessageRole, Provider, TextContentPart,
    TextContentPartType,
};

let parts = vec![
    ContentPart::TextContentPart(TextContentPart {
        type_: TextContentPartType::Text,
        text: "What is in this image?".to_string(),
    }),
    ContentPart::ImageContentPart(ImageContentPart {
        type_: ImageContentPartType::ImageUrl,
        image_url: ImageUrl {
            url: "https://example.com/image.jpg".to_string(),
            detail: None,
        },
    }),
];

let vision_message = Message {
    role: MessageRole::User,
    content: MessageContent::Array(parts),
    reasoning: None,
    reasoning_content: None,
    tool_call_id: None,
    tool_calls: Vec::new(),
};

let response = client
    .generate_content(Provider::Anthropic, "claude-opus-4-8", vec![vision_message])
    .await?;
```

### Models, tools, and health

The `InferenceGatewayAPI` trait also exposes discovery and health probes. `list_models` returns every model across all configured providers, while `list_models_by_provider` scopes the listing to one `Provider`. `list_tools` enumerates MCP tools and requires MCP to be exposed on the gateway - an un-exposed gateway answers `403 Forbidden`. `health_check` resolves to a `bool` and probes the gateway's root `/health` endpoint rather than the versioned API path.

```rust
use inference_gateway_sdk::{
    GatewayError, InferenceGatewayAPI, InferenceGatewayClient, ListModelsResponse,
    ListToolsResponse, Provider,
};

#[tokio::main]
async fn main() -> Result<(), GatewayError> {
    let client = InferenceGatewayClient::new_default();

    // Liveness probe - true on HTTP 200.
    if !client.health_check().await? {
        eprintln!("gateway is not healthy");
        return Ok(());
    }

    // Every model from every configured provider.
    let models: ListModelsResponse = client.list_models().await?;
    for model in models.data {
        println!("model: {}", model.id);
    }

    // Narrow the listing to a single provider.
    let groq: ListModelsResponse = client.list_models_by_provider(Provider::Groq).await?;
    println!("provider: {:?}", groq.provider);

    // MCP tools (requires MCP exposed on the gateway).
    let tools: ListToolsResponse = client.list_tools().await?;
    for tool in tools.data {
        println!("tool: {} (server: {})", tool.name, tool.server);
    }

    Ok(())
}
```

## Next steps

- Spin up the gateway: [Getting Started](/getting-started/).
- Wire MCP tools end-to-end: [MCP Integration](/mcp/).
- Talk to agents over JSON-RPC: [A2A Integration](/a2a/).
- Skip the SDKs and call the REST surface directly: [API Reference](/api-reference/).
