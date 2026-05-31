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
    model='openai/gpt-4o-mini',
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
    model='groq/llama-3.3-70b-versatile',
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
    model='openai/gpt-4o',
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
    model='openai/gpt-4o',
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
  model: 'openai/gpt-4o-mini',
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
    model: 'groq/llama-3.3-70b-versatile',
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
    model: 'openai/gpt-4o',
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
  model: 'openai/gpt-4o',
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
        sdk.Openai,
        "openai/gpt-4o-mini",
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
    sdk.Groq,
    "groq/llama-3.3-70b-versatile",
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
    sdk.Openai,
    "openai/gpt-4o",
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
    sdk.Openai,
    "openai/gpt-4o",
    []sdk.Message{visionMessage},
)
```

Base64 data URLs are accepted as the image URL.

## Rust

The Rust SDK is async-only (Tokio) and exposes the gateway over a typed `InferenceGatewayAPI` trait for easy mocking in tests.

- Crate: [`inference-gateway-sdk`](https://crates.io/crates/inference-gateway-sdk) (latest: `0.13.4`)
- Repository: [inference-gateway/rust-sdk](https://github.com/inference-gateway/rust-sdk)
- Examples: [rust-sdk/examples](https://github.com/inference-gateway/rust-sdk/tree/main/examples)

```bash
cargo add inference-gateway-sdk
```

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
            Provider::Openai,
            "gpt-4o-mini",
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
        Provider::Groq,
        "llama-3.3-70b-versatile",
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
            Provider::Openai,
            "gpt-4o",
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
    .generate_content(Provider::Openai, "gpt-4o", vec![vision_message])
    .await?;
```

## Next steps

- Spin up the gateway: [Getting Started](/getting-started/).
- Wire MCP tools end-to-end: [MCP Integration](/mcp/).
- Talk to agents over JSON-RPC: [A2A Integration](/a2a/).
- Skip the SDKs and call the REST surface directly: [API Reference](/api-reference/).
