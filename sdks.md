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

## Supported providers

All four SDKs target the same gateway, so they share a single provider set. Route to a provider either by prefixing the model with its id - for example `nvidia/meta/llama-3.1-8b-instruct` - or, on `list_models`/`proxy`, by passing the id through your SDK's `Provider` enum (the Python SDK also accepts a plain string). The gateway routes to:

<!-- GENERATED:sdks-provider-list START (do not edit - run: task generate) -->

`openai`, `deepseek`, `anthropic`, `cohere`, `groq`, `cloudflare`, `ollama_cloud`, `ollama`, `llamacpp`, `google`, `mistral`, `minimax`, `moonshot`, `nvidia`, and `zai`.

<!-- GENERATED:sdks-provider-list END (do not edit - run: task generate) -->

The newest addition, `nvidia`, reaches the Nvidia Nim catalog at `https://integrate.api.nvidia.com/v1` (Nemotron, Llama, DeepSeek, Mistral, and Qwen) with bearer-token auth. See [Supported Providers](/supported-providers/) for auth modes, default URLs, and vision-capable models, and [Configuration](/configuration/) for the matching `*_API_KEY` and `*_API_URL` variables.

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

### Request parameters

`create_chat_completion` and `create_chat_completion_stream` require only `model` and `messages`. Every other field of the OpenAI-compatible chat-completion request - sampling controls, penalties, structured outputs, tool choice, and so on - is optional and passed as a keyword argument. These keyword arguments map one-to-one onto the fields of `CreateChatCompletionRequest`, which the client validates before sending.

The SDK forwards only the parameters you set explicitly. Unset spec defaults (`temperature=1`, `top_p=1`, `n=1`, `parallel_tool_calls=True`, and so on) are never added to the request body, so a bare call ships just `model`, `messages`, and `stream`.

```python
from inference_gateway import InferenceGatewayClient, Message

client = InferenceGatewayClient('http://localhost:8080/v1')

response = client.create_chat_completion(
    model='openai/gpt-4o',
    messages=[Message(role='user', content='Summarize the CAP theorem.')],
    temperature=0.7,           # 0-2, default 1
    top_p=0.9,                 # 0-1, default 1
    n=1,                       # 1-128 choices, default 1
    max_completion_tokens=512, # upper bound incl. reasoning tokens
    frequency_penalty=0.0,     # -2..2, default 0
    presence_penalty=0.0,      # -2..2, default 0
    seed=42,                   # best-effort determinism
    user='user-123',           # end-user identifier
    reasoning_effort='low',    # minimal | low | medium | high
)
```

Values are validated against `CreateChatCompletionRequest` before the request goes out, so an out-of-range argument (for example `temperature=3`) raises `InferenceGatewayValidationError` rather than reaching the gateway. The same keyword arguments work on `create_chat_completion_stream`.

The full set of optional request fields:

| Parameter               | Python value         | Values                                | Notes                                        |
| ----------------------- | -------------------- | ------------------------------------- | -------------------------------------------- |
| `temperature`           | `float`              | `0`-`2` (default `1`)                 | Higher is more random; tune this or `top_p`  |
| `top_p`                 | `float`              | `0`-`1` (default `1`)                 | Nucleus sampling mass                        |
| `n`                     | `int`                | `1`-`128` (default `1`)               | Number of choices to generate                |
| `stop`                  | `str` or `list[str]` | string or up to 4 strings             | See below                                    |
| `frequency_penalty`     | `float`              | `-2`-`2` (default `0`)                | Penalize tokens by existing frequency        |
| `presence_penalty`      | `float`              | `-2`-`2` (default `0`)                | Penalize tokens that already appeared        |
| `seed`                  | `int`                | any integer                           | Best-effort deterministic sampling           |
| `logprobs`              | `bool`               | default `False`                       | Return log probabilities of output tokens    |
| `top_logprobs`          | `int`                | `0`-`20`                              | Requires `logprobs=True`                     |
| `logit_bias`            | `dict[str, int]`     | bias `-100`-`100`                     | Maps token ID to a sampling bias             |
| `response_format`       | `dict`               | text / json_object / json_schema      | See below                                    |
| `tool_choice`           | `str` or `dict`      | `none` / `auto` / `required` / named  | See below                                    |
| `parallel_tool_calls`   | `bool`               | default `True`                        | Allow parallel function calls during tools   |
| `reasoning_effort`      | `str`                | `minimal` / `low` / `medium` / `high` | Reasoning models only                        |
| `user`                  | `str`                | any string                            | End-user identifier for abuse monitoring     |
| `max_completion_tokens` | `int`                | any integer                           | Upper bound incl. reasoning tokens           |
| `max_tokens`            | `int`                | any integer                           | **Deprecated** - use `max_completion_tokens` |

#### Stop sequences

`stop` halts generation when the model is about to emit one of your sequences. Pass a single string or a list of up to four strings:

```python
# A single stop sequence.
client.create_chat_completion(
    model='openai/gpt-4o',
    messages=[Message(role='user', content='Count to ten.')],
    stop='\n\n',
)

# Or up to four sequences.
client.create_chat_completion(
    model='openai/gpt-4o',
    messages=[Message(role='user', content='Count to ten.')],
    stop=['END', 'STOP'],
)
```

#### Response format (Structured Outputs)

`response_format` constrains the shape of the model's output. Pass a dict whose `type` selects one of three modes:

- `{'type': 'text'}` - free-form text, the default when the field is omitted.
- `{'type': 'json_object'}` - JSON mode: the model is constrained to emit syntactically valid JSON. Tell it to produce JSON in a system or user message, otherwise it may stall.
- `{'type': 'json_schema', 'json_schema': {...}}` - Structured Outputs: pins the response to a JSON Schema on models that support it.

```python
response = client.create_chat_completion(
    model='openai/gpt-4o',
    messages=[
        Message(role='system', content='Respond with a JSON object.'),
        Message(role='user', content='Return the capital of France as {"city": "..."}.'),
    ],
    response_format={'type': 'json_object'},
)
```

For strict Structured Outputs, switch to `json_schema` and supply a named schema with `strict` set. Only a subset of JSON Schema is supported when `strict` is `True`.

```python
response = client.create_chat_completion(
    model='openai/gpt-4o',
    messages=[Message(role='user', content='Which city is the Eiffel Tower in?')],
    response_format={
        'type': 'json_schema',
        'json_schema': {
            'name': 'city',
            'strict': True,
            'schema': {
                'type': 'object',
                'properties': {'city': {'type': 'string'}},
                'required': ['city'],
            },
        },
    },
)
```

#### Tool choice

When you attach tools (see [Tool calls](#tool-calls)), `tool_choice` controls whether and which tool the model calls. Pass one of the string modes - `'none'`, `'auto'`, or `'required'` - or a dict that names a specific function. Here `tools` comes from the Tool calls example above.

```python
# Force the model to call at least one tool.
client.create_chat_completion(
    model='openai/gpt-4o',
    messages=[Message(role='user', content='What is the weather in New York?')],
    tools=tools,
    tool_choice='required',
)

# Or force one specific function by name.
client.create_chat_completion(
    model='openai/gpt-4o',
    messages=[Message(role='user', content='What is the weather in New York?')],
    tools=tools,
    tool_choice={'type': 'function', 'function': {'name': 'get_current_weather'}},
)
```

`parallel_tool_calls` (default `True`) governs whether the model may emit several tool calls in one turn; pass `parallel_tool_calls=False` to force them one at a time.

#### Log probabilities and logit bias

Set `logprobs=True` to receive per-token log probabilities on each choice's `logprobs`, and `top_logprobs` (0-20) to also list the most likely alternatives at each position - `top_logprobs` requires `logprobs=True`. `logit_bias` nudges sampling by mapping a token ID (as a string) to a bias from -100 to 100:

```python
response = client.create_chat_completion(
    model='openai/gpt-4o',
    messages=[Message(role='user', content='Pick a number.')],
    logprobs=True,
    top_logprobs=5,             # 0-20; requires logprobs=True
    logit_bias={'50256': -100}, # token ID -> bias (-100..100)
)
```

#### Deprecation: `max_tokens`

`max_tokens` still serializes to the wire, but it is deprecated in favor of `max_completion_tokens`, which also counts reasoning tokens and is compatible with o-series models. Prefer `max_completion_tokens` in new code.

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

### Responses API

`create_response` calls the OpenAI-compatible Responses API at `POST /responses` - an alternative to chat completions that takes either a single text `input` or a list of input items (for batched, multi-turn input in one request) and returns a `Response` whose `output` is a list of typed items (output messages, function tool calls, and reasoning items). `create_response_stream` streams the same request, yielding `SSEvent` chunks you decode into `ResponseStreamEvent`.

> **Note:** The Responses API is provider-dependent. Today only the **OpenAI** provider implements it - routing to any other provider returns `400 Bad Request`, so use [`create_chat_completion`](#chat-completion) for those providers. It is also not served by the gateway yet: `POST /responses` is defined in the OpenAI-compatible schema and the SDK ships the typed client, but the gateway does not route the endpoint at this time, so calls return `404` until a future gateway release adds the handler.

```python
from inference_gateway import InferenceGatewayClient
from inference_gateway.models import ResponseOutputMessage, ResponseOutputText

client = InferenceGatewayClient('http://localhost:8080/v1')

response = client.create_response(
    model='openai/gpt-4o',
    input='Write a haiku about the ocean.',
    max_output_tokens=256,
)

# response.output is a list of typed items; print each output_text part.
for item in response.output:
    message = item.root
    if isinstance(message, ResponseOutputMessage):
        for part in message.content:
            if isinstance(part.root, ResponseOutputText):
                print(part.root.text)
```

`input` accepts a plain string (above) or a list of `ResponseInputItem` (or plain dicts) for multi-turn conversations. Pass `tools` as a list of `ResponseTool` to expose function tools - note the Responses API uses a flattened function shape (`name`, `description`, and `parameters` at the top level) rather than the nested `function` object that [chat completions](#tool-calls) uses. Extra request fields (`instructions`, `temperature`, `top_p`, `tool_choice`, `reasoning`, and so on) pass through as keyword arguments and are validated against `CreateResponseRequest` before the request is sent.

#### Streaming

`create_response_stream` yields `SSEvent` objects. Parse `chunk.data` into `ResponseStreamEvent` and switch on `event.type` - text arrives on `response.output_text.delta` events (mirroring the chat [Streaming](#streaming) example).

```python
import json
from inference_gateway import InferenceGatewayClient
from inference_gateway.models import ResponseStreamEvent

client = InferenceGatewayClient('http://localhost:8080/v1')

for chunk in client.create_response_stream(
    model='openai/gpt-4o',
    input='Tell me a story about a lighthouse.',
):
    if not chunk.data:
        continue
    event = ResponseStreamEvent.model_validate(json.loads(chunk.data))
    if event.type == 'response.output_text.delta' and event.delta:
        print(event.delta, end='', flush=True)
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
nvidia_models = client.list_models(provider='nvidia')

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

- Package: [`@inference-gateway/sdk`](https://www.npmjs.com/package/@inference-gateway/sdk) (latest: `0.11.0`)
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

### Request parameters

`createChatCompletion` and `streamChatCompletion` take a single request object, and only `model` and `messages` are required. Every other field of the OpenAI-compatible chat-completion request - sampling controls, penalties, structured outputs, tool choice, and so on - is optional. The object is typed as `SchemaCreateChatCompletionRequest` (exported from the package), so your editor type-checks and autocompletes every field.

The SDK serializes only the fields you set, then manages `stream` for you - it forces `stream: false` for `createChatCompletion` and `stream: true` for `streamChatCompletion`, so you never set it yourself (both `stream` and `stream_options` are stripped from the request type). Unset fields, and the spec defaults they would carry (`temperature` `1`, `top_p` `1`, `n` `1`, `parallel_tool_calls` `true`, and so on), never appear in the request body, so a bare call ships just `model`, `messages`, and `stream`.

```typescript
import { InferenceGatewayClient, MessageRole } from '@inference-gateway/sdk';

const client = new InferenceGatewayClient({
  baseURL: 'http://localhost:8080/v1',
});

const response = await client.createChatCompletion({
  model: 'openai/gpt-4o',
  messages: [{ role: MessageRole.User, content: 'Summarize the CAP theorem.' }],
  temperature: 0.7, // 0-2, default 1
  top_p: 0.9, // 0-1, default 1
  n: 1, // 1-128 choices, default 1
  max_completion_tokens: 512, // upper bound incl. reasoning tokens
  frequency_penalty: 0.0, // -2..2, default 0
  presence_penalty: 0.0, // -2..2, default 0
  seed: 42, // best-effort determinism
  user: 'user-123', // end-user identifier
  reasoning_effort: 'low', // minimal | low | medium | high
});
```

The same fields work on `streamChatCompletion`. The full set of optional request fields:

| Parameter               | TypeScript type          | Values                                | Notes                                        |
| ----------------------- | ------------------------ | ------------------------------------- | -------------------------------------------- |
| `temperature`           | `number`                 | `0`-`2` (default `1`)                 | Higher is more random; tune this or `top_p`  |
| `top_p`                 | `number`                 | `0`-`1` (default `1`)                 | Nucleus sampling mass                        |
| `n`                     | `number`                 | `1`-`128` (default `1`)               | Number of choices to generate                |
| `stop`                  | `string \| string[]`     | string or up to 4 strings             | See below                                    |
| `frequency_penalty`     | `number`                 | `-2`-`2` (default `0`)                | Penalize tokens by existing frequency        |
| `presence_penalty`      | `number`                 | `-2`-`2` (default `0`)                | Penalize tokens that already appeared        |
| `seed`                  | `number`                 | any integer                           | Best-effort deterministic sampling           |
| `logprobs`              | `boolean`                | default `false`                       | Return log probabilities of output tokens    |
| `top_logprobs`          | `number`                 | `0`-`20`                              | Requires `logprobs: true`                    |
| `logit_bias`            | `Record<string, number>` | bias `-100`-`100`                     | Maps token ID to a sampling bias             |
| `response_format`       | `object`                 | text / json_object / json_schema      | See below                                    |
| `tool_choice`           | `string \| object`       | `none` / `auto` / `required` / named  | See below                                    |
| `parallel_tool_calls`   | `boolean`                | default `true`                        | Allow parallel function calls during tools   |
| `reasoning_effort`      | `string`                 | `minimal` / `low` / `medium` / `high` | Reasoning models only                        |
| `user`                  | `string`                 | any string                            | End-user identifier for abuse monitoring     |
| `max_completion_tokens` | `number`                 | any integer                           | Upper bound incl. reasoning tokens           |
| `max_tokens`            | `number`                 | any integer                           | **Deprecated** - use `max_completion_tokens` |

#### Stop sequences

`stop` halts generation when the model is about to emit one of your sequences. Pass a single string or an array of up to four strings:

```typescript
// A single stop sequence.
await client.createChatCompletion({
  model: 'openai/gpt-4o',
  messages: [{ role: MessageRole.User, content: 'Count to ten.' }],
  stop: '\n\n',
});

// Or up to four sequences.
await client.createChatCompletion({
  model: 'openai/gpt-4o',
  messages: [{ role: MessageRole.User, content: 'Count to ten.' }],
  stop: ['END', 'STOP'],
});
```

#### Response format (Structured Outputs)

`response_format` constrains the shape of the model's output. The `type` field selects one of three modes:

- `{ type: 'text' }` - free-form text, the default when the field is omitted.
- `{ type: 'json_object' }` - JSON mode: the model is constrained to emit syntactically valid JSON. Tell it to produce JSON in a system or user message, otherwise it may stall.
- `{ type: 'json_schema', json_schema: { ... } }` - Structured Outputs: pins the response to a JSON Schema on models that support it.

```typescript
const response = await client.createChatCompletion({
  model: 'openai/gpt-4o',
  messages: [
    { role: MessageRole.System, content: 'Respond with a JSON object.' },
    { role: MessageRole.User, content: 'Return the capital of France as {"city": "..."}.' },
  ],
  response_format: { type: 'json_object' },
});
```

For strict Structured Outputs, switch to `json_schema` and supply a named schema with `strict` set. Only a subset of JSON Schema is supported when `strict` is `true`.

```typescript
const response = await client.createChatCompletion({
  model: 'openai/gpt-4o',
  messages: [{ role: MessageRole.User, content: 'Which city is the Eiffel Tower in?' }],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'city',
      strict: true,
      schema: {
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city'],
      },
    },
  },
});
```

#### Tool choice

When you attach tools (see the Tool calls example above), `tool_choice` controls whether and which tool the model calls. Pass one of the string modes - `'none'`, `'auto'`, or `'required'` - or an object that names a specific function. Here `tools` is the weather-tool array from that example.

```typescript
// Force the model to call at least one tool.
await client.createChatCompletion({
  model: 'openai/gpt-4o',
  messages: [{ role: MessageRole.User, content: "What's the weather in San Francisco?" }],
  tools,
  tool_choice: 'required',
});

// Or force one specific function by name.
await client.createChatCompletion({
  model: 'openai/gpt-4o',
  messages: [{ role: MessageRole.User, content: "What's the weather in San Francisco?" }],
  tools,
  tool_choice: { type: 'function', function: { name: 'get_weather' } },
});
```

`parallel_tool_calls` (default `true`) governs whether the model may emit several tool calls in one turn; pass `parallel_tool_calls: false` to force them one at a time.

#### Log probabilities and logit bias

Set `logprobs: true` to receive per-token log probabilities on each choice's `logprobs`, and `top_logprobs` (0-20) to also list the most likely alternatives at each position - `top_logprobs` requires `logprobs: true`. `logit_bias` nudges sampling by mapping a token ID (as a string) to a bias from -100 to 100:

```typescript
const response = await client.createChatCompletion({
  model: 'openai/gpt-4o',
  messages: [{ role: MessageRole.User, content: 'Pick a number.' }],
  logprobs: true,
  top_logprobs: 5, // 0-20; requires logprobs: true
  logit_bias: { '50256': -100 }, // token ID -> bias (-100..100)
});
```

#### Deprecation: `max_tokens`

`max_tokens` still serializes to the wire, but it is deprecated in favor of `max_completion_tokens`, which also counts reasoning tokens and is compatible with o-series models. Prefer `max_completion_tokens` in new code.

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
const nvidiaModels = await client.listModels(Provider.nvidia);

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

- Module: [`github.com/inference-gateway/sdk`](https://pkg.go.dev/github.com/inference-gateway/sdk) (latest: `v1.19.0`)
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

### Request parameters

`GenerateContent` and `GenerateContentStream` only take the provider, model, and messages. Every other field of the chat-completion request - sampling controls, penalties, structured outputs, and so on - is optional and set through `WithOptions`, which stores a `*sdk.CreateChatCompletionRequest` and merges it into each subsequent call on that client.

The optional fields are pointers, so the examples below use a one-line generic helper to take the address of a literal:

```go
func ptr[T any](v T) *T { return &v }
```

```go
options := &sdk.CreateChatCompletionRequest{
    Temperature:         ptr(float32(0.7)), // 0-2, default 1
    TopP:                ptr(float32(0.9)), // 0-1, default 1
    N:                   ptr(1),            // 1-128 choices, default 1
    MaxCompletionTokens: ptr(512),          // upper bound incl. reasoning tokens
    FrequencyPenalty:    ptr(float32(0.0)), // -2..2, default 0
    PresencePenalty:     ptr(float32(0.0)), // -2..2, default 0
    Seed:                ptr(42),           // best-effort determinism
    User:                ptr("user-123"),   // end-user identifier
    ReasoningEffort:     ptr(sdk.Low),      // minimal | low | medium | high
}

resp, err := client.WithOptions(options).GenerateContent(
    ctx,
    sdk.Openai,
    "openai/gpt-4o",
    []sdk.Message{
        {Role: sdk.User, Content: sdk.NewMessageContent("Summarize the CAP theorem.")},
    },
)
```

Three rules govern how `WithOptions` interacts with the generation calls:

- `Stream` is overwritten on every call - forced to `false` for `GenerateContent` and `true` for `GenerateContentStream` - so you never set it yourself.
- The `model` and `messages` passed to `GenerateContent` / `GenerateContentStream` win over anything carried in the options.
- Options persist on the client for all later calls; pass `WithOptions(nil)` to clear them.

The full set of optional fields on `CreateChatCompletionRequest`:

| Field                 | Go type                                       | Values                                             | Notes                                      |
| --------------------- | --------------------------------------------- | -------------------------------------------------- | ------------------------------------------ |
| `Temperature`         | `*float32`                                    | `0`-`2` (default `1`)                              | Higher is more random; tune this or `TopP` |
| `TopP`                | `*float32`                                    | `0`-`1` (default `1`)                              | Nucleus sampling mass                      |
| `N`                   | `*int`                                        | `1`-`128` (default `1`)                            | Number of choices to generate              |
| `Stop`                | `*CreateChatCompletionRequest_Stop`           | string or up to 4 strings                          | oneOf union - see below                    |
| `FrequencyPenalty`    | `*float32`                                    | `-2`-`2` (default `0`)                             | Penalize tokens by existing frequency      |
| `PresencePenalty`     | `*float32`                                    | `-2`-`2` (default `0`)                             | Penalize tokens that already appeared      |
| `Seed`                | `*int`                                        | any integer                                        | Best-effort deterministic sampling         |
| `Logprobs`            | `*bool`                                       | default `false`                                    | Return log probabilities of output tokens  |
| `TopLogprobs`         | `*int`                                        | `0`-`20`                                           | Requires `Logprobs: ptr(true)`             |
| `LogitBias`           | `*map[string]int`                             | bias `-100`-`100`                                  | Maps token ID to a sampling bias           |
| `ResponseFormat`      | `*CreateChatCompletionRequest_ResponseFormat` | text / json_object / json_schema                   | oneOf union - see below                    |
| `ToolChoice`          | `*ChatCompletionToolChoiceOption`             | `none` / `auto` / `required` / named               | oneOf union - see below                    |
| `ParallelToolCalls`   | `*bool`                                       | default `true`                                     | Allow parallel function calls during tools |
| `ReasoningEffort`     | `*CreateChatCompletionRequestReasoningEffort` | `sdk.Minimal`, `sdk.Low`, `sdk.Medium`, `sdk.High` | Reasoning models only                      |
| `User`                | `*string`                                     | any string                                         | End-user identifier for abuse monitoring   |
| `MaxCompletionTokens` | `*int`                                        | any integer                                        | Upper bound incl. reasoning tokens         |
| `MaxTokens`           | `*int`                                        | any integer                                        | **Deprecated** - use `MaxCompletionTokens` |

#### Log probabilities and logit bias

```go
options := &sdk.CreateChatCompletionRequest{
    Logprobs:    ptr(true),                     // return token log probabilities
    TopLogprobs: ptr(5),                        // 0-20; requires Logprobs: ptr(true)
    LogitBias:   &map[string]int{"1234": -100}, // token ID -> bias (-100..100)
}
```

#### Stop sequences

`stop` is a oneOf - a single string or an array of up to four strings. Build the value with the generated constructors, then point the field at it. The `From...` constructors return an `error` you should check in production code.

```go
// A single stop sequence.
var stop sdk.CreateChatCompletionRequest_Stop
_ = stop.FromCreateChatCompletionRequestStop0("\n\n")

// Or up to four sequences.
var stops sdk.CreateChatCompletionRequest_Stop
_ = stops.FromCreateChatCompletionRequestStop1([]string{"END", "STOP"})

options := &sdk.CreateChatCompletionRequest{Stop: &stop}
```

#### Response format (Structured Outputs)

`response_format` is a oneOf over plain text, JSON mode, and a JSON Schema. Use the matching `From...` constructor. Setting a JSON Schema with `Strict: ptr(true)` enables Structured Outputs, which forces the model to match your schema.

```go
schema := sdk.ResponseFormatJSONSchema{Type: sdk.JSONSchema}
schema.JSONSchema.Name = "weather"
schema.JSONSchema.Strict = ptr(true)
schema.JSONSchema.Schema = &sdk.ResponseFormatJSONSchemaSchema{
    "type": "object",
    "properties": map[string]any{
        "city": map[string]any{"type": "string"},
    },
    "required": []string{"city"},
}

var format sdk.CreateChatCompletionRequest_ResponseFormat
_ = format.FromResponseFormatJSONSchema(schema)

options := &sdk.CreateChatCompletionRequest{ResponseFormat: &format}
```

`FromResponseFormatJSONObject` (`{"type":"json_object"}`) and `FromResponseFormatText` (`{"type":"text"}`, the default) cover the other two variants.

#### Tool choice

When you attach tools (see [Tool calls](#tool-calls)), `tool_choice` controls whether and which tool the model calls. It is a oneOf over the string modes `none`, `auto`, `required` and a named-function choice:

```go
// Force the model to call at least one tool.
var choice sdk.ChatCompletionToolChoiceOption
_ = choice.FromChatCompletionToolChoiceOption0(sdk.ChatCompletionToolChoiceOption0Required)

// Or force one specific function by name.
named := sdk.ChatCompletionNamedToolChoice{Type: sdk.Function}
named.Function.Name = "get_current_weather"

var namedChoice sdk.ChatCompletionToolChoiceOption
_ = namedChoice.FromChatCompletionNamedToolChoice(named)

// Chain WithTools and WithOptions; `tools` comes from the Tool calls example.
resp, err := client.
    WithTools(&tools).
    WithOptions(&sdk.CreateChatCompletionRequest{ToolChoice: &choice}).
    GenerateContent(ctx, sdk.Openai, "openai/gpt-4o", messages)
```

`parallel_tool_calls` (default `true`) governs whether the model may emit several tool calls in one turn; set `ParallelToolCalls: ptr(false)` to force them one at a time.

#### Deprecation: `MaxTokens`

`MaxTokens` still serializes to the wire, but it is deprecated in favor of `MaxCompletionTokens`, which also counts reasoning tokens and is compatible with o-series models. Prefer `MaxCompletionTokens` in new code.

### Vision (image input)

Use `NewImageContentPart` / `NewTextContentPart` and pass them via `NewImageMessage`.

```go
textPart, _ := sdk.NewTextContentPart("What is in this image?")
imagePart, _ := sdk.NewImageContentPart(
    "https://example.com/image.jpg",
    nil, // nil -> auto. Pass &sdk.ImageURLDetailHigh or &sdk.ImageURLDetailLow to override.
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

// Or scope to NVIDIA's GPU-served catalog.
nvidiaModels, err := client.ListProviderModels(ctx, sdk.Nvidia)
if err != nil {
    log.Fatalf("list provider models: %v", err)
}
fmt.Printf("provider: %s\n", *nvidiaModels.Provider)

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

#### Requesting per-model metadata

`ListModels` and `ListProviderModels` accept optional variadic `include` values that request additional per-model fields from the gateway. Pass `sdk.ListModelsParamsIncludeContextWindow` to populate `Model.ContextWindow`, or `sdk.ListModelsParamsIncludePricing` for pricing data. Multiple values are joined as `?include=context_window,pricing`.

`Model.ContextWindow` is `nil` when not requested, populated when the gateway resolves a window, and an explicit `null` from the gateway when requested but unresolvable (for example, a local provider with no runtime window).

```go
// Request context_window for every model.
detailedModels, err := client.ListModels(ctx, sdk.ListModelsParamsIncludeContextWindow)
if err != nil {
    log.Fatalf("list models: %v", err)
}
for _, model := range detailedModels.Data {
    if model.ContextWindow != nil {
        fmt.Printf("%s context window: %d tokens (source: %s)\n",
            model.ID, model.ContextWindow.Tokens, model.ContextWindow.Source)
    }
}

// Combine with a provider filter and request both context_window and pricing.
providerModels, err := client.ListProviderModels(
    ctx, sdk.Groq,
    sdk.ListModelsParamsIncludeContextWindow,
    sdk.ListModelsParamsIncludePricing,
)
if err != nil {
    log.Fatalf("list provider models: %v", err)
}
for _, model := range providerModels.Data {
    if model.ContextWindow != nil {
        fmt.Printf("%s: %d tokens\n", model.ID, model.ContextWindow.Tokens)
    }
}
```

Example JSON output for a model with `include=context_window`:

```json
{
  "id": "llama-3.1-8b-instruct",
  "object": "model",
  "created": 1741879542,
  "owned_by": "Meta",
  "served_by": "llamacpp",
  "context_window": {
    "tokens": 4096,
    "source": "runtime"
  }
}
```

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

#### Cancellation preserves the underlying error

Cancelling the request mid-retry keeps the failure that triggered the backoff. If the context is cancelled (or its deadline expires) while the retry loop is sleeping between attempts, the returned error wraps both the last transport or HTTP error that caused the retry and the cancellation cause, formatted as `<last error> (cancelled while retrying: <context error>)`. `errors.Is(err, context.Canceled)` and `errors.Is(err, context.DeadlineExceeded)` still report the cancellation, and the underlying HTTP status stays readable in the error message and through `errors.Is` / `errors.As`. Bounding a slow request by cancelling its context no longer collapses every failure into a bare `context canceled` / `context deadline exceeded` and hides why the request was being retried.

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

resp, err := client.GenerateContent(ctx, sdk.Openai, "openai/gpt-4o", messages)
if err != nil {
    // The deadline can fire mid-retry, but the HTTP 500 that triggered the
    // backoff is still visible, e.g.:
    //   "... HTTP 500 ... (cancelled while retrying: context deadline exceeded)".
    if errors.Is(err, context.DeadlineExceeded) {
        log.Printf("gave up mid-retry, underlying failure preserved: %v", err)
    }
}
```

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

### Request parameters

`generate_content` and `generate_content_stream` take only the provider, model, and messages. Internally they build a `CreateChatCompletionRequest`, shaping it through the client's two request builders - `with_tools` sets the `tools` list and `with_max_tokens` sets the (now-deprecated) `max_tokens` - and filling every remaining field from the schema default via the type's `Default` impl. The other OpenAI-compatible fields (sampling controls, penalties, structured outputs, tool choice, and so on) are not yet surfaced through a client builder, but they are public on `CreateChatCompletionRequest`, which is re-exported from the crate root with every field `pub`. Construct one with `..Default::default()` to serialize a request, assert against it in tests, or return it from a mock of the `InferenceGatewayAPI` trait.

```rust
use inference_gateway_sdk::{
    CreateChatCompletionRequest, CreateChatCompletionRequestReasoningEffort, MessageRole,
};

// `message` is the helper from the Chat completion example above.
let request = CreateChatCompletionRequest {
    model: "openai/gpt-4o".to_string(),
    messages: vec![message(MessageRole::User, "Summarize the CAP theorem.")],
    temperature: 0.7,                   // 0-2, default 1
    top_p: 0.9,                         // 0-1, default 1
    seed: Some(42),                     // best-effort determinism
    user: Some("user-123".to_string()), // end-user identifier
    reasoning_effort: Some(CreateChatCompletionRequestReasoningEffort::Low),
    max_completion_tokens: Some(512),   // upper bound incl. reasoning tokens
    ..Default::default()
};
```

Seven fields carry a schema `default:` and are generated as non-`Option`, so they serialize on every request even when you leave them untouched: `temperature` (`1.0`), `top_p` (`1.0`), `n` (`1`), `frequency_penalty` (`0.0`), `presence_penalty` (`0.0`), `logprobs` (`false`), and `parallel_tool_calls` (`true`). This is a wire-format change from earlier releases - and from the Python and Go SDKs, which omit unset fields - so a bare Rust request now ships these documented defaults. The remaining optional fields stay off the wire until you set them (`logit_bias` and `tools` are skipped while empty; the rest are `Option<...>`).

The full set of request fields on `CreateChatCompletionRequest`:

| Field                   | Rust type                                            | Values                                | Notes                                        |
| ----------------------- | ---------------------------------------------------- | ------------------------------------- | -------------------------------------------- |
| `temperature`           | `f64`                                                | `0`-`2` (default `1`)                 | Always sent; tune this or `top_p`            |
| `top_p`                 | `f64`                                                | `0`-`1` (default `1`)                 | Always sent; nucleus sampling mass           |
| `n`                     | `NonZeroU64`                                         | `1`-`128` (default `1`)               | Always sent; number of choices to generate   |
| `stop`                  | `Option<CreateChatCompletionRequestStop>`            | string or up to 4 strings             | Untagged union - see below                   |
| `frequency_penalty`     | `f64`                                                | `-2`-`2` (default `0`)                | Always sent; penalize by existing frequency  |
| `presence_penalty`      | `f64`                                                | `-2`-`2` (default `0`)                | Always sent; penalize already-present tokens |
| `seed`                  | `Option<i64>`                                        | any integer                           | Best-effort deterministic sampling           |
| `logprobs`              | `bool`                                               | default `false`                       | Always sent; return token log probabilities  |
| `top_logprobs`          | `Option<i64>`                                        | `0`-`20`                              | Requires `logprobs = true`                   |
| `logit_bias`            | `HashMap<String, i64>`                               | bias `-100`-`100`                     | Maps token ID to bias; omitted when empty    |
| `response_format`       | `Option<CreateChatCompletionRequestResponseFormat>`  | text / json_object / json_schema      | Untagged union - see below                   |
| `tool_choice`           | `Option<ChatCompletionToolChoiceOption>`             | `none` / `auto` / `required` / named  | Untagged union - see below                   |
| `parallel_tool_calls`   | `bool`                                               | default `true`                        | Always sent; allow parallel tool calls       |
| `reasoning_effort`      | `Option<CreateChatCompletionRequestReasoningEffort>` | `minimal` / `low` / `medium` / `high` | Reasoning models only                        |
| `user`                  | `Option<String>`                                     | any string                            | End-user identifier for abuse monitoring     |
| `max_completion_tokens` | `Option<i64>`                                        | any integer                           | Upper bound incl. reasoning tokens           |
| `max_tokens`            | `Option<i64>`                                        | any integer                           | **Deprecated** - use `max_completion_tokens` |

#### Log probabilities and logit bias

Set `logprobs` to `true` to receive per-token log probabilities on each choice, and `top_logprobs` (0-20) to also list the most likely alternatives at each position - `top_logprobs` requires `logprobs = true`. `logit_bias` is a `HashMap` that maps a token ID (as a string) to a bias from -100 to 100, and is omitted from the wire while it is empty.

```rust
use std::collections::HashMap;
use inference_gateway_sdk::{CreateChatCompletionRequest, MessageRole};

let request = CreateChatCompletionRequest {
    model: "openai/gpt-4o".to_string(),
    messages: vec![message(MessageRole::User, "Pick a number.")],
    logprobs: true,                                            // always present; flip to opt in
    top_logprobs: Some(5),                                     // 0-20; requires logprobs = true
    logit_bias: HashMap::from([("50256".to_string(), -100)]),  // token ID -> bias (-100..100)
    ..Default::default()
};
```

#### Stop sequences

`stop` is a `oneOf` - a single string or an array of up to four strings - that typify emits as the `#[serde(untagged)]` enum `CreateChatCompletionRequestStop`. Build the variant you need and assign it to the field.

```rust
use inference_gateway_sdk::CreateChatCompletionRequestStop;

// A single stop sequence.
let stop = CreateChatCompletionRequestStop::String("\n\n".to_string());

// Or up to four sequences.
let stop = CreateChatCompletionRequestStop::Array(vec!["END".to_string(), "STOP".to_string()]);
```

#### Response format (Structured Outputs)

`response_format` is the untagged enum `CreateChatCompletionRequestResponseFormat` over plain text, JSON mode, and a JSON Schema. Each variant disambiguates on its inner `type` field. Setting a schema with `strict: true` enables Structured Outputs, which forces the model to match it; only a subset of JSON Schema is supported when `strict` is `true`.

```rust
use inference_gateway_sdk::{
    CreateChatCompletionRequestResponseFormat, ResponseFormatJsonObject,
    ResponseFormatJsonObjectType, ResponseFormatJsonSchema, ResponseFormatJsonSchemaJsonSchema,
    ResponseFormatJsonSchemaSchema, ResponseFormatJsonSchemaType,
};
use serde_json::json;

// JSON mode: constrain the model to syntactically valid JSON.
let response_format =
    CreateChatCompletionRequestResponseFormat::JsonObject(ResponseFormatJsonObject {
        type_: ResponseFormatJsonObjectType::JsonObject,
    });

// Structured Outputs: pin the response to a JSON Schema.
let schema = json!({
    "type": "object",
    "properties": { "city": { "type": "string" } },
    "required": ["city"]
});
let response_format =
    CreateChatCompletionRequestResponseFormat::JsonSchema(ResponseFormatJsonSchema {
        type_: ResponseFormatJsonSchemaType::JsonSchema,
        json_schema: ResponseFormatJsonSchemaJsonSchema {
            name: "city".to_string(),
            description: None,
            schema: Some(ResponseFormatJsonSchemaSchema(schema.as_object().unwrap().clone())),
            strict: true,
        },
    });
```

The plain-text default is `CreateChatCompletionRequestResponseFormat::Text(ResponseFormatText { type_: ResponseFormatTextType::Text })`. Each enum also has `From` impls for its variants, so `.into()` works where the target type is known.

#### Tool choice

When you attach tools with `with_tools` (see the Tool calls example above), `tool_choice` controls whether and which tool the model calls. It is the untagged enum `ChatCompletionToolChoiceOption` over the string modes (`None`, `Auto`, `Required`) and a named function.

```rust
use inference_gateway_sdk::{
    ChatCompletionNamedToolChoice, ChatCompletionNamedToolChoiceFunction,
    ChatCompletionToolChoiceOption, ChatCompletionToolChoiceOptionString, ChatCompletionToolType,
};

// Force the model to call at least one tool.
let tool_choice =
    ChatCompletionToolChoiceOption::String(ChatCompletionToolChoiceOptionString::Required);

// Or force one specific function by name.
let tool_choice = ChatCompletionToolChoiceOption::ChatCompletionNamedToolChoice(
    ChatCompletionNamedToolChoice {
        type_: ChatCompletionToolType::Function,
        function: ChatCompletionNamedToolChoiceFunction {
            name: "get_current_weather".to_string(),
        },
    },
);
```

`parallel_tool_calls` (default `true`, always sent) governs whether the model may emit several tool calls in one turn; set it to `false` to force them one at a time.

#### Deprecation: `max_tokens`

`with_max_tokens` still populates `max_tokens` for backward compatibility, and the field continues to serialize, but `max_tokens` is deprecated in favor of `max_completion_tokens`, which also counts reasoning tokens and is compatible with o-series models. There is no dedicated builder for `max_completion_tokens` yet - set it on the request struct, as in the example above - so prefer it in new code.

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
