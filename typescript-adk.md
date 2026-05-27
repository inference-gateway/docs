---
title: TypeScript ADK
description: Build A2A-compatible agents in TypeScript with the @inference-gateway/adk package. Handler registration, JSON-RPC message/send and message/stream, SSE event sequence, CloudEvents v1.0 envelopes, STREAMING_STATUS_UPDATE_INTERVAL, DefaultBackgroundTaskHandler agentic loop with tool dispatch and usage metadata, MAX_CHAT_COMPLETION_ITERATIONS cap, reserved input_required tool, validation contract, id semantics, cancellation, and runnable client samples.
---

# TypeScript ADK

The TypeScript ADK (`@inference-gateway/adk`) is the Node.js Agent Development Kit for building [A2A (Agent-to-Agent)](/a2a) servers in TypeScript. It mirrors the [Go ADK](https://github.com/inference-gateway/adk) handler semantics and consumes the same canonical A2A schema (pinned from [inference-gateway/schemas](https://github.com/inference-gateway/schemas)), so agents written against either ADK speak the same wire protocol.

> **Pre-1.0 status.** The package is in early bootstrap. The public API is not yet stable and may change between minor versions until `1.0.0` is cut. Pin an exact version in production until then.

## Installation

```bash
pnpm add @inference-gateway/adk
```

- Requires **Node.js 24 LTS or newer**.
- The package is **ESM-only** (no CommonJS build). Consumers must use `import` syntax or dynamic `import()`.
- Repository: [inference-gateway/typescript-adk](https://github.com/inference-gateway/typescript-adk).

## What ships today

The ADK currently exposes the HTTP server core and the first A2A JSON-RPC method handler:

| Surface                             | Status    | Notes                                                                                    |
| ----------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| `A2AServer` / `createA2AServer`     | Available | Hono-backed HTTP server. Serves `/.well-known/agent-card.json`, `/health`, and JSON-RPC. |
| `MethodRegistry` / `registerMethod` | Available | Per-server JSON-RPC method dispatch table.                                               |
| `InMemoryTaskStorage`               | Available | In-process task queue + active task map. Swap for a custom `TaskStorage` in production.  |
| `createMessageSendHandler`          | Available | Synchronous `message/send` handler.                                                      |
| `createMessageStreamHandler`        | Available | Streaming `message/stream` handler. SSE response wrapped in CloudEvents v1.0 envelopes.  |
| `tasks/get`, etc.                   | Not yet   | Additional A2A methods land in subsequent releases.                                      |
| `DefaultBackgroundTaskHandler`      | Available | LLM-driven agentic loop with tool dispatch, history truncation, and an iteration cap.    |
| `A2AServerBuilder`                  | Available | Fluent server builder; validates that the agent card's capabilities match the handlers.  |

## The `message/send` JSON-RPC method

`message/send` is the synchronous entrypoint a client uses to submit a new conversation turn to the agent. The handler:

1. Validates the JSON-RPC `params` payload against `MessageSendParams`.
2. Mints a fresh task `id` (always) and, when the inbound message omits them, a fresh `contextId` and `messageId`.
3. Constructs a `PENDING` `ManagedTask`, persists it, and enqueues it on the configured `TaskStorage`.
4. Returns the wire-format `Task` immediately - it does **not** wait for any background worker.

This mirrors the Go ADK's [`HandleMessageSend`](https://github.com/inference-gateway/adk) / `CreateTaskFromMessage` semantics. Examples written against the Go ADK transfer over directly.

> Need the agent's reply to land incrementally rather than after the whole turn finishes? Use [`message/stream`](#the-messagestream-json-rpc-method) instead - same JSON-RPC params, but the response is a Server-Sent Events stream of CloudEvents v1.0 frames carrying status transitions and partial-message deltas.

### Registering the handler

```ts
import {
  MESSAGE_SEND_METHOD,
  createA2AServer,
  createMessageSendHandler,
} from '@inference-gateway/adk';
import { InMemoryTaskStorage } from '@inference-gateway/adk';
import type { AgentCard } from '@inference-gateway/adk';

const card: AgentCard = {
  name: 'echo-agent',
  description: 'Echoes user input back.',
  version: '0.1.0',
  protocolVersion: '1.0',
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/plain'],
  capabilities: { streaming: false },
  skills: [{ id: 'echo', name: 'Echo', description: 'Echo input.', tags: [] }],
};

const storage = new InMemoryTaskStorage();
const server = createA2AServer({ card });

server.registerMethod(MESSAGE_SEND_METHOD, createMessageSendHandler({ storage }));

await server.listen(8080, '0.0.0.0');
```

> **Use the exported method-name constant.** `MESSAGE_SEND_METHOD` resolves to the string `'message/send'`. Importing it (rather than hard-coding the literal) keeps the registration in lockstep with conformance tests and other consumers.

### Handler options

`createMessageSendHandler(options)` accepts:

| Option        | Required | Default             | Description                                                                                                   |
| ------------- | -------- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `storage`     | Yes      | -                   | Implementation of `TaskStorage` used to persist and enqueue the created task.                                 |
| `idGenerator` | No       | `crypto.randomUUID` | UUID generator used for the new task id, and for the context/message ids when the inbound message omits them. |
| `now`         | No       | `() => new Date()`  | Clock injection point for the task's status timestamp. Useful for deterministic tests.                        |

Both injection points exist primarily for testability. Production code should rely on the defaults.

### Request shape (`MessageSendParams`)

The JSON-RPC `params` object for `message/send` is:

```ts
interface MessageSendParams {
  readonly message: Message; // required
  readonly configuration?: SendMessageConfiguration;
  readonly metadata?: Struct; // free-form per-call metadata
}
```

`message` follows the A2A `Message` type from the generated schema:

| Field       | Required        | Notes                                                                                                 |
| ----------- | --------------- | ----------------------------------------------------------------------------------------------------- |
| `role`      | Yes             | Typically `'ROLE_USER'` for inbound traffic.                                                          |
| `parts`     | Yes (non-empty) | Array of `Part` objects (text, file, data). At least one element.                                     |
| `messageId` | No              | If omitted or empty, the handler mints a UUID.                                                        |
| `contextId` | No              | If omitted or empty, the handler mints a UUID. When present, it is reused so multi-turn state aligns. |

> The shape of `MessageSendParams` deliberately mirrors `types.MessageSendParams` from the Go ADK. The generated A2A schema models the HTTP-level `SendMessageRequest` envelope, which is a different shape from the JSON-RPC `params` payload - the ADK exposes the JSON-RPC form so registrations stay aligned with the dispatcher.

### Response shape

On success the handler returns the wire-format `Task`:

```jsonc
{
  "id": "9c8b8b7e-...", // always freshly minted
  "contextId": "ctx-1", // reused from request, or freshly minted
  "status": {
    "state": "TASK_STATE_SUBMITTED", // wire representation of the internal PENDING state
    "timestamp": "2026-05-26T12:00:00.000Z",
  },
  "history": [
    {
      "messageId": "client-msg",
      "role": "ROLE_USER",
      "contextId": "ctx-1",
      "parts": [{ "text": "hello agent" }],
    },
  ],
}
```

> **Status mapping.** The task is stored as `PENDING` in the internal `ManagedTask` model, and surfaced on the wire as `TASK_STATE_SUBMITTED`. Both refer to the same lifecycle stage: "accepted, queued, not yet processed." Clients see only the wire form.

The handler returns synchronously - the task is **already enqueued** by the time the caller receives the response. Downstream processing (LLM invocation, tool calls, status transitions) happens out of band and will eventually update the stored task; clients poll or stream subsequent updates via the still-to-land `tasks/get` and `message/stream` methods.

### Id semantics

The id contract is intentionally narrow so that proxies, fan-out clients, and replay tooling all behave predictably:

| Field               | Behaviour                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------- |
| Task `id`           | **Always freshly minted.** A client-supplied task id (if any) is ignored.                 |
| `message.contextId` | **Reused** when the client provides a non-empty value. Otherwise, a fresh UUID is minted. |
| `message.messageId` | **Reused** when the client provides a non-empty value. Otherwise, a fresh UUID is minted. |

The freshly-minted `contextId` (when applicable) is written back onto the message in `history`, so the stored conversation always carries the canonical id.

### Validation contract

All validation failures surface as JSON-RPC error code `-32602 Invalid Params` with a human-readable `message`. The handler rejects:

| Failure                                               | Error message contains                      |
| ----------------------------------------------------- | ------------------------------------------- |
| `params` is `null`, an array, or not an object        | `expected MessageSendParams object`         |
| `params.message` is missing, `null`, or not an object | `message is required and must be an object` |
| `params.message.parts` is missing or not an array     | `message.parts must be a non-empty array`   |
| `params.message.parts` is an empty array              | `message.parts must be a non-empty array`   |

On validation failure the handler throws **before** touching storage, so the task queue is never partially populated.

## Runnable example

Start the server from the [Registering the handler](#registering-the-handler) snippet above (`node ./dist/server.js` or whatever your build emits), then send a happy-path request:

```bash
curl -sS -X POST http://localhost:8080/ \
  -H 'Content-Type: application/json' \
  --data '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "message/send",
    "params": {
      "message": {
        "messageId": "client-msg",
        "role": "ROLE_USER",
        "contextId": "ctx-1",
        "parts": [{ "text": "hello agent" }]
      }
    }
  }'
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "id": "9c8b8b7e-3f4a-4b6e-9a1d-1b2c3d4e5f60",
    "contextId": "ctx-1",
    "status": {
      "state": "TASK_STATE_SUBMITTED",
      "timestamp": "2026-05-26T12:00:00.000Z"
    },
    "history": [
      {
        "messageId": "client-msg",
        "role": "ROLE_USER",
        "contextId": "ctx-1",
        "parts": [{ "text": "hello agent" }]
      }
    ]
  }
}
```

An invalid request (missing `parts`) returns a structured JSON-RPC error envelope rather than a 4xx HTTP status:

```bash
curl -sS -X POST http://localhost:8080/ \
  -H 'Content-Type: application/json' \
  --data '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "message/send",
    "params": {
      "message": { "messageId": "m", "role": "ROLE_USER" }
    }
  }'
```

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "error": {
    "code": -32602,
    "message": "invalid params: message.parts must be a non-empty array"
  }
}
```

The integration fixtures backing every example on this page live at [`tests/server/message-send.test.ts`](https://github.com/inference-gateway/typescript-adk/blob/main/tests/server/message-send.test.ts) in the source repo - useful as a copy-paste starting point for your own tests.

## The `message/stream` JSON-RPC method

`message/stream` is the streaming counterpart to `message/send`. The JSON-RPC `params` are structurally identical to `MessageSendParams` - the difference is the response: instead of a single JSON-RPC envelope, the server holds the HTTP connection open and emits an `text/event-stream` response carrying [CloudEvents v1.0](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md) envelopes that narrate the task's lifecycle from `WORKING` through to a terminal state.

The wire format is **byte-identical to the Go ADK's emitter** in `server/agent_streamable.go`. Both ADKs default to `source = 'adk/agent'` for every CloudEvents envelope so cross-language consumers can dedupe / route on a single value. A client that streams correctly against one ADK streams correctly against the other.

### Advertise streaming in the agent card

The agent must declare streaming support in its `AgentCard.capabilities`:

```ts
const card: AgentCard = {
  name: 'streaming-agent',
  description: 'Streams a reply token-by-token.',
  version: '0.1.0',
  protocolVersion: '1.0',
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/plain'],
  capabilities: { streaming: true },
  skills: [{ id: 'echo', name: 'Echo', description: 'Echo input.', tags: [] }],
};
```

Clients that respect the agent card MUST NOT issue `message/stream` against an agent that advertises `streaming: false`.

### Registering the handler

Streaming methods are registered on the server via `registerStreamingMethod`, not `registerMethod`. The server routes incoming requests to the streaming handler when the JSON-RPC `method` matches a streaming registration, opens an SSE response, and drives a user-supplied **executor** through the task lifecycle.

```ts
import {
  AGENT_EVENT_TYPE,
  InMemoryTaskStorage,
  MESSAGE_STREAM_METHOD,
  createA2AServer,
  createMessageStreamHandler,
  type StreamingTaskExecutor,
} from '@inference-gateway/adk';

const storage = new InMemoryTaskStorage();

const executor: StreamingTaskExecutor = async function* ({ message, signal }) {
  for (const chunk of ['hel', 'lo ', 'world']) {
    if (signal.aborted) return;
    yield {
      type: 'delta',
      message: {
        messageId: crypto.randomUUID(),
        role: 'ROLE_AGENT',
        parts: [{ text: chunk }],
      },
    };
  }
  // Returning without yielding a terminal status transitions the task to COMPLETED.
};

const server = createA2AServer({ card });
server.registerStreamingMethod(
  MESSAGE_STREAM_METHOD,
  createMessageStreamHandler({ storage, executor })
);

await server.listen(8080, '0.0.0.0');
```

> **Use the exported method-name constant.** `MESSAGE_STREAM_METHOD` resolves to the string `'message/stream'`. Importing it (rather than hard-coding the literal) keeps the registration in lockstep with conformance tests and other consumers.

#### Executor contract

`StreamingTaskExecutor` is an async generator that yields one of three event shapes:

| Yielded event                                | Effect                                                                                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `{ type: 'delta', message }`                 | Emits an `adk.agent.delta` SSE frame carrying a partial assistant `Message`. Does not change task state.                                                                 |
| `{ type: 'statusChanged', state, message? }` | Transitions the task to `state`, persists it, and emits `adk.agent.task.status.changed`. Terminal states (`COMPLETED` / `FAILED` / `CANCELLED`) end the stream.          |
| `{ type: 'inputRequired', message }`         | Transitions to `INPUT_REQUIRED` with `message` attached. Shortcut for the common tool-use pause; equivalent to a `statusChanged` event but kept separate for ergonomics. |

Lifecycle guarantees the handler enforces on top of what the executor yields:

- **Natural completion** (iterator exhausts without throwing and without yielding a terminal status) -> task transitions to `COMPLETED` automatically.
- **Thrown error** -> task transitions to `FAILED`; the error message is embedded in the final status frame's `status.message`.
- **`signal` aborted** -> task transitions to `CANCELLED`; the executor is expected to stop yielding promptly once it observes the abort.

The executor MUST NOT yield `PENDING` or attempt to re-enter terminal states.

### Handler options

`createMessageStreamHandler(options)` accepts:

| Option                   | Required | Default                                                                | Description                                                                                                                                                                                 |
| ------------------------ | -------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                | Yes      | -                                                                      | Implementation of `TaskStorage` used to persist task lifecycle transitions.                                                                                                                 |
| `executor`               | Yes      | -                                                                      | Producer that drives the task; see [Executor contract](#executor-contract).                                                                                                                 |
| `idGenerator`            | No       | `crypto.randomUUID`                                                    | UUID generator used for the task id and for the context / message ids when the inbound message omits them.                                                                                  |
| `now`                    | No       | `() => new Date()`                                                     | Clock injection point for status timestamps. Useful for deterministic tests.                                                                                                                |
| `statusUpdateIntervalMs` | No       | Parsed from `STREAMING_STATUS_UPDATE_INTERVAL`, falling back to `1000` | Interval (ms) between periodic `task.status.changed` re-emits while the task is `IN_PROGRESS`. Pass `0` to disable the heartbeat-style status updates (state-transition frames still fire). |
| `heartbeatMs`            | No       | `30000` (writer default)                                               | SSE comment-frame heartbeat interval. Keeps intermediate proxies from closing the connection. Pass `0` to disable.                                                                          |
| `eventSource`            | No       | `'adk/agent'`                                                          | Override the CloudEvents `source` attribute. Supply a stable URI-reference when running multiple agents and consumers need to disambiguate.                                                 |
| `env`                    | No       | `process.env`                                                          | Override the environment-variable source. Mainly a test seam.                                                                                                                               |

### Event sequence

Every successful `message/stream` invocation emits frames in this order:

1. **`adk.agent.task.status.changed`** with `status.state = 'TASK_STATE_WORKING'`, `final: false` - the task has transitioned out of `PENDING`.
2. **Zero or more `adk.agent.delta`** frames - partial assistant messages, in the order the executor yields them. Each frame carries a `Message` whose `role` is typically `ROLE_AGENT`.
3. **Optional periodic `adk.agent.task.status.changed`** frames with `status.state = 'TASK_STATE_WORKING'`, `final: false` - re-emitted every `statusUpdateIntervalMs` while the task is `IN_PROGRESS`. Acts as an application-level heartbeat distinct from the transport-level SSE comment heartbeat.
4. **Stream-ending `adk.agent.task.status.changed`** - exactly one of:
   - **Terminal**: `status.state in {'TASK_STATE_COMPLETED', 'TASK_STATE_FAILED', 'TASK_STATE_CANCELLED'}`, `final: true`. The stream then closes.
   - **Input required**: `status.state = 'TASK_STATE_INPUT_REQUIRED'`, `final: false`. The task is paused (not done); the stream still closes so the client can submit a follow-up `message/send` against the same `contextId`.

Clients should treat any `task.status.changed` frame as the stream's final application-level frame and stop reading once they have seen it. After the final frame the server closes the underlying TCP connection.

Interleaved transport-level frames the client should be ready to skip:

- **SSE comment heartbeats** of the form `: heartbeat\n\n` - emitted every `heartbeatMs` (default `30s`) while the stream is open. Carry no payload; safe to ignore.

### CloudEvents v1.0 envelope shape

Every `data:` frame body is a CloudEvents v1.0 JSON structured-mode envelope:

```json
{
  "specversion": "1.0",
  "id": "f4d9b1d2-...",
  "source": "adk/agent",
  "type": "adk.agent.task.status.changed",
  "time": "2026-05-26T12:00:00.123Z",
  "datacontenttype": "application/json",
  "subject": "9c8b8b7e-3f4a-4b6e-9a1d-1b2c3d4e5f60",
  "data": {
    "taskId": "9c8b8b7e-3f4a-4b6e-9a1d-1b2c3d4e5f60",
    "contextId": "ctx-1",
    "status": {
      "state": "TASK_STATE_WORKING",
      "timestamp": "2026-05-26T12:00:00.123Z"
    },
    "final": false
  }
}
```

Attribute meanings:

| CloudEvents attribute | Value                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `specversion`         | Always `"1.0"`.                                                                                                                |
| `id`                  | Unique per envelope (random UUID by default). Combined with `source`, satisfies the CloudEvents uniqueness rule.               |
| `source`              | `"adk/agent"` by default. Override via `eventSource` to disambiguate fleets of agents.                                         |
| `type`                | One of the `AGENT_EVENT_TYPE.*` constants - for the streaming transport, `adk.agent.task.status.changed` or `adk.agent.delta`. |
| `time`                | RFC 3339 timestamp of when the frame was emitted.                                                                              |
| `datacontenttype`     | Always `"application/json"`.                                                                                                   |
| `subject`             | The `taskId`. Stable across every frame on the stream - use it to correlate frames with the originating call.                  |
| `data`                | The payload. A `TaskStatusUpdateEvent` for `task.status.changed`, or a `Message` for `delta`.                                  |

`data` shape for a `delta` frame:

```json
{
  "specversion": "1.0",
  "id": "...",
  "source": "adk/agent",
  "type": "adk.agent.delta",
  "time": "2026-05-26T12:00:00.250Z",
  "datacontenttype": "application/json",
  "subject": "9c8b8b7e-3f4a-4b6e-9a1d-1b2c3d4e5f60",
  "data": {
    "messageId": "chunk-2",
    "role": "ROLE_AGENT",
    "parts": [{ "text": "lo " }]
  }
}
```

The full list of streaming event-type constants exposed on `AGENT_EVENT_TYPE` (identical to the Go ADK):

| Constant                               | Wire value                      |
| -------------------------------------- | ------------------------------- |
| `AGENT_EVENT_TYPE.DELTA`               | `adk.agent.delta`               |
| `AGENT_EVENT_TYPE.TASK_STATUS_CHANGED` | `adk.agent.task.status.changed` |
| `AGENT_EVENT_TYPE.INPUT_REQUIRED`      | `adk.agent.input.required`      |
| `AGENT_EVENT_TYPE.ITERATION_COMPLETED` | `adk.agent.iteration.completed` |
| `AGENT_EVENT_TYPE.TOOL_STARTED`        | `adk.agent.tool.started`        |
| `AGENT_EVENT_TYPE.TOOL_COMPLETED`      | `adk.agent.tool.completed`      |
| `AGENT_EVENT_TYPE.TOOL_FAILED`         | `adk.agent.tool.failed`         |
| `AGENT_EVENT_TYPE.TOOL_RESULT`         | `adk.agent.tool.result`         |
| `AGENT_EVENT_TYPE.TASK_INTERRUPTED`    | `adk.agent.task.interrupted`    |
| `AGENT_EVENT_TYPE.STREAM_FAILED`       | `adk.agent.stream.failed`       |

`message/stream` itself emits only `DELTA` and `TASK_STATUS_CHANGED`. The remaining types are reserved for higher-level agent loops (tool dispatch, iteration tracking) layered on top of the streaming transport.

### `STREAMING_STATUS_UPDATE_INTERVAL` environment variable

| Variable                           | Default | Format                                                                                                                            | Effect                                                                                                                                                                                |
| ---------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STREAMING_STATUS_UPDATE_INTERVAL` | `1s`    | Bare integer (interpreted as milliseconds, e.g. `250`), or a duration with a `ms` / `s` / `m` suffix (e.g. `500ms`, `30s`, `2m`). | Period at which the handler re-emits `task.status.changed` while the task is `IN_PROGRESS`. Set to `0` to disable the periodic re-emit entirely (state-transition frames still fire). |

The handler reads the variable from `process.env` once at construction. Set it via process environment, container `ENV`, or by passing an explicit `statusUpdateIntervalMs` (or an `env` override) to `createMessageStreamHandler` - the explicit option always wins.

The Go ADK exposes the same variable name and default in `server/config/config.go`, so a deployment that pins `STREAMING_STATUS_UPDATE_INTERVAL=500ms` produces the same on-the-wire cadence regardless of which ADK is serving.

Invalid values (negative numbers, unrecognised units, non-integer millisecond results) cause `createMessageStreamHandler` to throw `TypeError` at construction time - fail-fast rather than silently emitting at the wrong cadence.

### Cancellation on client disconnect

When the originating HTTP request is cancelled (browser navigates away, `fetch` is aborted, intermediate proxy drops the connection, server shuts down), the handler:

1. Aborts the `AbortSignal` it passed to the executor via `StreamingExecutorContext.signal`. Executors that propagate the signal to downstream calls (LLM provider, tool invocation, database query) unwind promptly.
2. Transitions the task to `TASK_STATE_CANCELLED` and persists the transition through `TaskStorage`.
3. Emits a final `adk.agent.task.status.changed` frame with `status.state = 'TASK_STATE_CANCELLED'` and `final: true` (best-effort; if the underlying socket is already gone, the frame is dropped silently).
4. Closes the SSE stream and moves the task into the dead-letter map for later inspection via `tasks/get`.

The executor is expected to observe the abort cooperatively. The handler does not forcibly terminate generator iteration; long-running executor work that ignores the signal will keep running until it naturally yields or returns.

### Validation and JSON-RPC error mapping

Validation runs **synchronously, before any SSE response is opened.** Failures surface as a regular JSON-RPC error envelope (HTTP 200 with `Content-Type: application/json`), and the SSE stream is never opened - clients that see a JSON response back from `message/stream` should treat it as a hard failure of the entire call.

| Failure                                               | JSON-RPC `error.code`     | `error.message` contains                    |
| ----------------------------------------------------- | ------------------------- | ------------------------------------------- |
| `params` is `null`, an array, or not an object        | `-32602` (Invalid Params) | `expected MessageStreamParams object`       |
| `params.message` is missing, `null`, or not an object | `-32602`                  | `message is required and must be an object` |
| `params.message.parts` is missing or not an array     | `-32602`                  | `message.parts must be a non-empty array`   |
| `params.message.parts` is an empty array              | `-32602`                  | `message.parts must be a non-empty array`   |

Errors that surface mid-stream (executor throws, storage write fails) are converted into a final `adk.agent.task.status.changed` frame with `status.state = 'TASK_STATE_FAILED'` and `final: true`, because the SSE response headers have already been flushed and there is no longer a way to switch to a JSON-RPC error envelope.

### Minimal client sample

Consuming a `message/stream` response with the platform `fetch` API and a tiny SSE parser:

```ts
type CloudEventFrame = {
  specversion: '1.0';
  id: string;
  source: string;
  type: string;
  time: string;
  datacontenttype: string;
  subject: string;
  data: unknown;
};

type TaskStatusUpdateEvent = {
  taskId: string;
  contextId: string;
  status: { state: string; timestamp?: string; message?: unknown };
  final: boolean;
};

async function streamMessage(baseUrl: string): Promise<void> {
  const res = await fetch(`${baseUrl}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'message/stream',
      params: {
        message: {
          messageId: crypto.randomUUID(),
          role: 'ROLE_USER',
          contextId: 'ctx-1',
          parts: [{ text: 'hello agent' }],
        },
      },
    }),
  });

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.startsWith('text/event-stream')) {
    // Validation failed before the stream opened - JSON-RPC error envelope.
    const body = await res.json();
    throw new Error(`message/stream rejected: ${JSON.stringify(body.error)}`);
  }
  if (res.body === null) throw new Error('no response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line (\n\n).
    while (true) {
      const idx = buffer.indexOf('\n\n');
      if (idx < 0) break;
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      // Skip comment heartbeats (": heartbeat") and anything that is not a data frame.
      if (!raw.startsWith('data: ')) continue;

      const envelope = JSON.parse(raw.slice('data: '.length)) as CloudEventFrame;

      if (envelope.type === 'adk.agent.delta') {
        // Partial assistant message - append to the in-progress reply.
        process.stdout.write(JSON.stringify(envelope.data));
        continue;
      }

      if (envelope.type === 'adk.agent.task.status.changed') {
        const status = envelope.data as TaskStatusUpdateEvent;
        if (status.final) {
          // Terminal state reached (COMPLETED / FAILED / CANCELLED).
          console.log(`\n[task ${status.taskId} -> ${status.status.state}]`);
          return;
        }
        if (status.status.state === 'TASK_STATE_INPUT_REQUIRED') {
          // Paused, awaiting a follow-up message/send against the same contextId.
          console.log(`\n[task ${status.taskId} -> INPUT_REQUIRED]`);
          return;
        }
        // Otherwise: an IN_PROGRESS heartbeat - safe to ignore for display.
      }
    }
  }
}
```

The same code works in browsers (no Node-specific APIs are used beyond the optional `process.stdout` write). Production clients should also handle network failures with retry / backoff, but the parser above is the complete happy-path implementation - no third-party SSE library required.

Integration tests covering every conformance assertion above (event ordering, envelope shape, validation, cancellation, periodic re-emit cadence) live at [`tests/server/message-stream-conformance.test.ts`](https://github.com/inference-gateway/typescript-adk/blob/main/tests/server/message-stream-conformance.test.ts) in the source repo.

## Background task handler (`DefaultBackgroundTaskHandler`)

`DefaultBackgroundTaskHandler` is the LLM-driven agentic loop the TypeScript ADK ships out of the box. It owns the conversation history, dispatches tool calls returned by the model, feeds the results back into the next LLM call, and drives the task through to one of the three terminal A2A states (`COMPLETED`, `INPUT_REQUIRED`, `FAILED`) - or `CANCELLED` when the originating request's `AbortSignal` fires.

It mirrors the Go ADK's `DefaultBackgroundTaskHandler` in [`adk/server/task_handler.go`](https://github.com/inference-gateway/adk/blob/main/server/task_handler.go). The TypeScript variant inlines the iteration loop because the early-bootstrap TS surface does not yet ship a stream-based agent abstraction; callers wire it into [`A2AServerBuilder`](#wiring-into-a2aserverbuilder) via the `withBackgroundTaskHandler` hook.

The handler depends only on the structural `LLMClient` and `ToolBox` interfaces - concrete implementations land separately in [typescript-adk#27](https://github.com/inference-gateway/typescript-adk/issues/27) (HTTP-backed LLM client) and [typescript-adk#31](https://github.com/inference-gateway/typescript-adk/issues/31) (tool registry). Until those ship, supply your own implementations of the two interfaces below.

### Constructor

```ts
import { DefaultBackgroundTaskHandler } from '@inference-gateway/adk';

const handler = new DefaultBackgroundTaskHandler({
  llmClient,
  toolBox,
  systemPrompt: 'You are a helpful assistant.',
  maxIterations: 25,
  maxConversationHistory: 40,
});
```

#### Options

| Option                   | Required | Default                                             | Description                                                                                                                                                              |
| ------------------------ | -------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `llmClient`              | Yes      | -                                                   | OpenAI-compatible chat-completion client. Throws `TypeError` at construction time if omitted.                                                                            |
| `toolBox`                | No       | `undefined`                                         | Tool registry consulted on every iteration. Without one the handler runs a tool-free loop and stops after the first assistant message.                                   |
| `systemPrompt`           | No       | `undefined`                                         | Prepended verbatim to every LLM call as a `system` message. Not counted against `maxConversationHistory`.                                                                |
| `maxIterations`          | No       | `MAX_CHAT_COMPLETION_ITERATIONS` env var, else `50` | Upper bound on the LLM-call / tool-dispatch loop. Must be a positive integer; non-positive values throw `RangeError`.                                                    |
| `maxConversationHistory` | No       | `20`                                                | Upper bound on the number of conversation messages forwarded to the LLM per iteration. Older messages are dropped (oldest first); the system prompt is always preserved. |
| `logger`                 | No       | `NOOP_LOGGER`                                       | Structural logger (`debug` / `info` / `warn` / `error`). Use `console` or a `pino`-compatible logger to surface iteration diagnostics and tool-execution failures.       |
| `env`                    | No       | `process.env`                                       | Override the environment-variable source. Mainly a test seam.                                                                                                            |

### `LLMClient` and `ToolBox` interfaces

The handler is decoupled from any specific LLM provider or tool runtime - it depends only on these two structural interfaces:

```ts
interface LLMClient {
  createCompletion(options: CreateCompletionOptions): Promise<CompletionResult>;
}

interface CreateCompletionOptions {
  readonly messages: readonly ChatMessage[];
  readonly tools?: readonly ToolDefinition[];
  readonly signal?: AbortSignal;
}

interface CompletionResult {
  readonly message: AssistantMessage;
  readonly usage?: CompletionUsage;
}

interface AssistantMessage {
  readonly content?: string;
  readonly toolCalls?: readonly ToolCall[];
}

interface CompletionUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens?: number;
}

interface ToolBox {
  list(): readonly ToolDefinition[];
  execute(name: string, args: string, context: ToolExecutionContext): Promise<string>;
}

interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Struct; // JSON Schema for the tool arguments
}

interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: string; // JSON-encoded blob, OpenAI convention
}

interface ToolExecutionContext {
  readonly task: ManagedTask;
  readonly signal: AbortSignal;
}
```

`ChatMessage` is a discriminated union covering the four OpenAI-style roles - `system`, `user`, `assistant` (with optional `toolCalls`), and `tool` (with the originating `toolCallId`). The handler manages the array internally; callers do not construct these directly.

> **Concrete implementations.** A first-party HTTP-backed `LLMClient` lands in [typescript-adk#27](https://github.com/inference-gateway/typescript-adk/issues/27); a tool registry built around the same JSON Schema surface lands in [typescript-adk#31](https://github.com/inference-gateway/typescript-adk/issues/31). Until then, supply your own - the interfaces are deliberately small.

### Iteration loop

Every `handle()` call walks the task through this loop. The handler enters the loop in `IN_PROGRESS` (transitioning from `PENDING` if necessary) and exits in exactly one of `COMPLETED`, `INPUT_REQUIRED`, `FAILED`, or `CANCELLED`.

```mermaid
flowchart TD
    Start(["handle(context)"])
    Pending{"task.state == PENDING?"}
    Promote["transition -> IN_PROGRESS"]
    Build["Build conversation:\nsystemPrompt + task.messages"]
    Iter{"iteration < maxIterations?"}
    Abort{"signal.aborted?"}
    Truncate["Truncate to maxConversationHistory\n(system always kept)"]
    Call["llmClient.createCompletion(messages, tools)"]
    NoTools{"toolCalls.length == 0?"}
    InputReq{"any toolCall.name == 'input_required'?"}
    Dispatch["For each tool call:\ntoolBox.execute(name, args, ctx)\nappend result to conversation"]
    Completed(["finalize COMPLETED"])
    InputRequired(["finalize INPUT_REQUIRED"])
    Cancelled(["finalize CANCELLED"])
    Failed(["finalize FAILED\n(iteration cap or thrown error)"])

    Start --> Pending
    Pending -- yes --> Promote
    Pending -- no --> Build
    Promote --> Build
    Build --> Iter
    Iter -- yes --> Abort
    Iter -- no --> Failed
    Abort -- yes --> Cancelled
    Abort -- no --> Truncate
    Truncate --> Call
    Call --> NoTools
    NoTools -- yes --> Completed
    NoTools -- no --> InputReq
    InputReq -- yes --> InputRequired
    InputReq -- no --> Dispatch
    Dispatch --> Iter
```

Numbered walkthrough of the same loop:

1. **Promote `PENDING` → `IN_PROGRESS`.** Already-terminal tasks short-circuit and are returned unchanged.
2. **Build the initial conversation** from `task.messages`, converting A2A `ROLE_USER` / `ROLE_AGENT` messages into OpenAI `user` / `assistant` chat messages. The configured `systemPrompt` is prepended (and is always preserved across truncations).
3. **For each iteration up to `maxIterations`:**
   1. If `context.signal` has been aborted, finalize the task as **`CANCELLED`** and return.
   2. Truncate the conversation to the last `maxConversationHistory` non-system messages.
   3. Call `llmClient.createCompletion({ messages, tools, signal })`. Token usage (when returned) accumulates into the internal `UsageTracker`.
   4. Append the assistant message to the conversation.
   5. **No tool calls** → write the assistant text back to `task.messages` and finalize as **`COMPLETED`** (text defaults to `'Done.'` when the assistant returned empty content).
   6. **Any tool call named `input_required`** → finalize as **`INPUT_REQUIRED`** with the extracted prompt as the agent message; no further tool calls in that iteration are executed.
   7. Otherwise dispatch every tool call through `toolBox.execute(name, args, { task, signal })`. Append each result as a `tool` message keyed by `toolCallId`, and re-enter the loop.
4. **If the iteration cap is hit** without reaching a terminal branch, finalize as **`FAILED`** with the message `"Iteration cap reached (<n>) without completion."`.
5. **If the LLM call or any tool throws**, the loop is unwound: if the signal is aborted the task finalizes as `CANCELLED`, otherwise it finalizes as `FAILED` with the error message. Tool-execution errors are **not** thrown - they are caught, formatted as `Error executing tool "<name>": <message>`, and fed back as a `tool` message so the model can recover.

`handle()` always resolves with the updated `ManagedTask` - it never rejects.

### `MAX_CHAT_COMPLETION_ITERATIONS` environment variable

| Variable                         | Default | Format                                                                                | Effect                                                                                                                                                          |
| -------------------------------- | ------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MAX_CHAT_COMPLETION_ITERATIONS` | `50`    | Positive integer parsed by `parseInt(_, 10)`. Non-positive or non-numeric falls back. | Upper bound on the LLM-call / tool-dispatch loop. An explicit `maxIterations` constructor option always wins; the env var is consulted only when it is omitted. |

The variable name and default match the Go ADK's `config.MaxChatCompletionIterations` in [`server/config/config.go`](https://github.com/inference-gateway/adk/blob/main/server/config/config.go), so a deployment that pins `MAX_CHAT_COMPLETION_ITERATIONS=10` produces the same agentic-loop budget regardless of which ADK is serving.

### Reserved `input_required` tool

The handler reserves the tool name `input_required` (exported as `INPUT_REQUIRED_TOOL`) to pause a task without consuming an iteration. When the assistant returns a tool call with this name, the handler:

1. Skips the configured `ToolBox` entirely - the tool is **never** dispatched through `toolBox.execute`.
2. Extracts a human-readable prompt from the `arguments` blob (see below).
3. Appends a `ROLE_AGENT` message carrying the prompt to `task.messages`.
4. Transitions the task to `TASK_STATE_INPUT_REQUIRED` and returns. The originating `message/send` task is now paused; the client resumes by submitting a follow-up `message/send` against the same `contextId`.

Prompt extraction from `arguments`:

| Shape of `arguments`                                    | Extracted prompt                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| JSON object with a non-empty string `message` key       | `arguments.message`                                                             |
| JSON object with a non-empty string `prompt` key        | `arguments.prompt` (fallback when `message` is absent or empty)                 |
| JSON object with a non-empty string `question` key      | `arguments.question` (fallback when `message` and `prompt` are absent or empty) |
| JSON object without any of those keys / empty arguments | `"Additional input required."`                                                  |
| String that is not valid JSON                           | The raw string verbatim                                                         |

The arg-key fallback order is `message` → `prompt` → `question`. This means a tool definition exposed to the model with parameters `{ "message": "string" }`, `{ "prompt": "string" }`, or `{ "question": "string" }` all work; the model can use whichever key best fits the conversation.

```ts
import { INPUT_REQUIRED_TOOL } from '@inference-gateway/adk';

const inputRequiredTool = {
  name: INPUT_REQUIRED_TOOL, // resolves to 'input_required'
  description: 'Ask the user a clarifying question and pause the task.',
  parameters: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Question to surface to the user.' },
    },
    required: ['message'],
  },
};
```

Reserve this tool by exposing it via your `ToolBox.list()` implementation - the handler does **not** advertise it automatically. The Go ADK uses the same reserved name, so the prompt-extraction conventions transfer between implementations.

### Usage metadata (`setEnableUsageMetadata`)

Usage tracking is off by default. Toggle it with `setEnableUsageMetadata(true)`:

```ts
const handler = new DefaultBackgroundTaskHandler({ llmClient, toolBox });
handler.setEnableUsageMetadata(true);
handler.isUsageMetadataEnabled(); // true
```

When enabled, every terminal transition (`COMPLETED`, `INPUT_REQUIRED`, `FAILED`, `CANCELLED`) merges the accumulated metadata into `task.metadata`:

```jsonc
{
  "metadata": {
    "execution_stats": {
      "iterations": 3,
      "tool_calls": 5,
      "failed_tools": 1,
    },
    "usage": {
      "prompt_tokens": 1240,
      "completion_tokens": 318,
      "total_tokens": 1558,
    },
  },
}
```

Field meanings:

| Key                            | Description                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `execution_stats.iterations`   | Number of LLM-call iterations executed in the loop (incremented before each call, so an iteration that was aborted or threw still counts). |
| `execution_stats.tool_calls`   | Total tool calls returned by the model and dispatched through the toolbox. The reserved `input_required` tool does **not** count here.     |
| `execution_stats.failed_tools` | Subset of `tool_calls` whose `toolBox.execute` threw, or that were attempted while no toolbox was configured.                              |
| `usage.prompt_tokens`          | Sum of `usage.promptTokens` across every completion the LLM client reported. Omitted if the LLM client never returned a `usage` block.     |
| `usage.completion_tokens`      | Sum of `usage.completionTokens` across every completion the LLM client reported.                                                           |
| `usage.total_tokens`           | Sum of `usage.totalTokens` when reported; otherwise falls back to `promptTokens + completionTokens` per call.                              |

Edge-case behaviour:

- The `usage` block is omitted entirely when the LLM client never returned a `usage` field (so the totals stayed at zero). `execution_stats` is always present once any iteration has run.
- Existing `task.metadata` keys are preserved on merge; the `execution_stats` and `usage` keys overwrite any same-named keys already on the task.
- If `setEnableUsageMetadata(true)` is called but the handler returns before the first iteration (already-terminal task on entry), no metadata is attached because there is nothing to report.

The underlying counters are exposed as the `UsageTracker` class for direct use in tests and downstream tooling that wants to surface a running tally between iterations.

### Wiring into `A2AServerBuilder`

`A2AServerBuilder.withBackgroundTaskHandler` consumes a `BackgroundTaskHandler` function (`(context) => Promise<ManagedTask>`), not a class instance. Use the `asHandler()` adapter to bridge them:

```ts
import {
  A2AServerBuilder,
  DefaultBackgroundTaskHandler,
  type AgentCard,
  type LLMClient,
  type ToolBox,
} from '@inference-gateway/adk';

// Wire up your concrete LLM client and tool registry. The interfaces are
// structural - any implementation that satisfies them will do.
declare const llmClient: LLMClient;
declare const toolBox: ToolBox;

const card: AgentCard = {
  name: 'support-agent',
  description: 'Answers product questions and looks up account state.',
  version: '0.1.0',
  protocolVersion: '1.0',
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/plain'],
  capabilities: { streaming: false },
  skills: [
    {
      id: 'support',
      name: 'Customer support',
      description: 'Answer questions using account-lookup tools.',
      tags: [],
    },
  ],
};

const handler = new DefaultBackgroundTaskHandler({
  llmClient,
  toolBox,
  systemPrompt: 'You are a customer-support agent. Use the tools when you need account state.',
  maxIterations: 25,
});
handler.setEnableUsageMetadata(true);

const server = new A2AServerBuilder()
  .withAgentCard(card)
  .withBackgroundTaskHandler(handler.asHandler())
  .build();

await server.listen(8080, '0.0.0.0');
```

Because the agent card above advertises `capabilities.streaming: false`, the builder only requires a background handler. To support `message/stream` as well, add `.withStreamingTaskHandler(...)` and flip the capability to `true` - the builder validates the handler-vs-capability pairing at `build()` time and throws `A2AServerBuilderError` on a mismatch.

> **Why `asHandler()` instead of passing `handler` directly?** The builder type signature is `withBackgroundTaskHandler(handler: BackgroundTaskHandler)`, where `BackgroundTaskHandler` is a plain function. `asHandler()` returns a closure that forwards each invocation to `handler.handle(context)`, so the same handler instance (and its accumulated usage tracker state) serves every dequeued task.

## Parity with the Go ADK

The TypeScript ADK is being grown in lockstep with the [Go ADK](https://github.com/inference-gateway/adk). The intent is that any A2A agent capability you can read about in the Go ADK reference applies semantically to the TypeScript ADK once the corresponding handler ships:

- The handler name, params shape, id semantics, validation rules, and synchronous return contract are **identical** to the Go implementation's `HandleMessageSend` / `CreateTaskFromMessage`.
- Internal storage state (`PENDING`) and wire state (`TASK_STATE_SUBMITTED`) follow the same mapping as the Go ADK.
- The `message/stream` SSE wire format - CloudEvents v1.0 envelopes, `source = 'adk/agent'`, `subject = taskId`, and the `AGENT_EVENT_TYPE.*` constants - is **byte-identical** to the Go ADK's emitter in `server/agent_streamable.go`. Client implementations target one canonical wire contract regardless of which ADK the agent is built with.
- `STREAMING_STATUS_UPDATE_INTERVAL` shares its name, default (`1s`), and accepted format with the Go ADK's `server/config/config.go`.
- `DefaultBackgroundTaskHandler` mirrors the Go ADK's [`DefaultBackgroundTaskHandler`](https://github.com/inference-gateway/adk/blob/main/server/task_handler.go) - same iteration cap default (`50`), same `MAX_CHAT_COMPLETION_ITERATIONS` env var name, same reserved `input_required` tool and `message` / `prompt` / `question` arg-key fallback, and the same `execution_stats` / `usage` metadata shape on `task.metadata`.
- The generated `Message`, `Task`, and `Part` types are produced from the same `inference-gateway/schemas` source of truth, regenerated via `pnpm generate:types` and pinned to a specific schema commit.

Where the TypeScript ADK has not yet shipped a handler that the Go ADK has, cross-referencing the Go source is the safest reference point.

## Related resources

- [A2A Integration](/a2a) - protocol overview, CLI usage, custom-agent requirements.
- [A2A Debugger](/a2a-debugger) - inspect, stream, and replay tasks against any A2A server.
- [A2A Registry](/registry) - publish your built agent so others can discover and consume it.
- [ADL CLI](/adl-cli) - scaffold A2A agents from YAML manifests (Go / Rust today; TypeScript planned).
- Source: [github.com/inference-gateway/typescript-adk](https://github.com/inference-gateway/typescript-adk).
- Releases: [github.com/inference-gateway/typescript-adk/releases](https://github.com/inference-gateway/typescript-adk/releases).
