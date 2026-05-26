---
title: TypeScript ADK
description: Build A2A-compatible agents in TypeScript with the @inference-gateway/adk package. Handler registration, JSON-RPC message/send, validation contract, id semantics, and runnable curl examples.
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
| `createMessageSendHandler`          | Available | Synchronous `message/send` handler (this page).                                          |
| `message/stream`, `tasks/get`, etc. | Not yet   | Additional A2A methods land in subsequent releases.                                      |
| LLM agent loop / tool dispatch      | Not yet   | The server core is deliberately decoupled from any LLM client.                           |

## The `message/send` JSON-RPC method

`message/send` is the synchronous entrypoint a client uses to submit a new conversation turn to the agent. The handler:

1. Validates the JSON-RPC `params` payload against `MessageSendParams`.
2. Mints a fresh task `id` (always) and, when the inbound message omits them, a fresh `contextId` and `messageId`.
3. Constructs a `PENDING` `ManagedTask`, persists it, and enqueues it on the configured `TaskStorage`.
4. Returns the wire-format `Task` immediately - it does **not** wait for any background worker.

This mirrors the Go ADK's [`HandleMessageSend`](https://github.com/inference-gateway/adk) / `CreateTaskFromMessage` semantics. Examples written against the Go ADK transfer over directly.

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

## Parity with the Go ADK

The TypeScript ADK is being grown in lockstep with the [Go ADK](https://github.com/inference-gateway/adk). The intent is that any A2A agent capability you can read about in the Go ADK reference applies semantically to the TypeScript ADK once the corresponding handler ships:

- The handler name, params shape, id semantics, validation rules, and synchronous return contract are **identical** to the Go implementation's `HandleMessageSend` / `CreateTaskFromMessage`.
- Internal storage state (`PENDING`) and wire state (`TASK_STATE_SUBMITTED`) follow the same mapping as the Go ADK.
- The generated `Message`, `Task`, and `Part` types are produced from the same `inference-gateway/schemas` source of truth, regenerated via `pnpm generate:types` and pinned to a specific schema commit.

Where the TypeScript ADK has not yet shipped a handler that the Go ADK has, cross-referencing the Go source is the safest reference point.

## Related resources

- [A2A Integration](/a2a) - protocol overview, CLI usage, custom-agent requirements.
- [A2A Debugger](/a2a-debugger) - inspect, stream, and replay tasks against any A2A server.
- [A2A Registry](/registry) - publish your built agent so others can discover and consume it.
- [ADL CLI](/adl-cli) - scaffold A2A agents from YAML manifests (Go / Rust today; TypeScript planned).
- Source: [github.com/inference-gateway/typescript-adk](https://github.com/inference-gateway/typescript-adk).
- Releases: [github.com/inference-gateway/typescript-adk/releases](https://github.com/inference-gateway/typescript-adk/releases).
