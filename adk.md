---
title: Go ADK
description: The Go ADK (github.com/inference-gateway/adk) is the original and reference Agent Development Kit for building A2A-compatible agents in Go. Covers the A2AServerBuilder and AgentBuilder fluent builders, the A2AClient and its full JSON-RPC method surface (SendTask, SendTaskStreaming, GetTask, ListTasks, CancelTask, ResubscribeTask, push-notification config CRUD, GetAuthenticatedExtendedCard), custom TaskHandler / StreamableTaskHandler implementations, the ToolBox and custom tools, the six BeforeAgent/AfterAgent/BeforeModel/AfterModel/BeforeTool/AfterTool lifecycle callbacks with short-circuit and replace semantics, adk.agent.* CloudEvents streaming, in-memory and Redis storage, OIDC authentication, filesystem and MinIO artifacts, OpenTelemetry, build-time LD-flag metadata, and the full environment-variable configuration surface.
---

# Go ADK

The Go ADK (`github.com/inference-gateway/adk`) is the original and reference [Agent Development Kit](https://github.com/inference-gateway/adk) for building [A2A (Agent-to-Agent)](/a2a/) servers and clients. It is the implementation whose handler semantics and wire protocol the [TypeScript ADK](/typescript-adk/) and [Rust ADK](/rust-adk/) mirror, so agents written against any of the three speak the same canonical A2A schema.

> **Early-stage status.** The ADK is under active development and its public API may change between minor versions. Pin an exact version in production and be prepared to update when upgrading.

This page is a feature reference for the module: the server and agent builders, the client and its full JSON-RPC method surface, custom tools and task handlers, lifecycle callbacks, streaming via CloudEvents, storage backends, authentication, artifacts, telemetry, build-time metadata, and the environment-variable configuration surface. The canonical upstream source is the repository [`README.md`](https://github.com/inference-gateway/adk/blob/main/README.md) and the [`examples/`](https://github.com/inference-gateway/adk/tree/main/examples) directory.

## Installation

```bash
go get github.com/inference-gateway/adk
```

The module requires **Go 1.26 or later**. The public packages are:

| Import path                                      | Purpose                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `github.com/inference-gateway/adk/server`        | Server builder, agent builder, task handlers, tools, callbacks.    |
| `github.com/inference-gateway/adk/server/config` | The `Config` struct and its environment-variable loader.           |
| `github.com/inference-gateway/adk/client`        | The `A2AClient` for talking to any A2A server.                     |
| `github.com/inference-gateway/adk/types`         | Generated A2A schema types (`Task`, `Message`, `AgentCard`, etc.). |

## Quick start

### Minimal server

The smallest runnable server attaches a custom `TaskHandler` and an agent card. No LLM credentials are required - the handler below simply echoes the user's message back. `Build()` validates its inputs: an agent card is **required**, and at least one task handler must be configured.

```go
package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	uuid "github.com/google/uuid"
	zap "go.uber.org/zap"

	server "github.com/inference-gateway/adk/server"
	config "github.com/inference-gateway/adk/server/config"
	types "github.com/inference-gateway/adk/types"
)

type EchoHandler struct{ agent server.OpenAICompatibleAgent }

func (h *EchoHandler) HandleTask(ctx context.Context, task *types.Task, message *types.Message) (*types.Task, error) {
	text := "Hello! Send me a message and I'll echo it back."
	if message != nil {
		for _, part := range message.Parts {
			if part.Text != nil {
				text = "Echo: " + *part.Text
			}
		}
	}

	reply := types.Message{
		MessageID: uuid.New().String(),
		ContextID: &task.ContextID,
		TaskID:    &task.ID,
		Role:      types.RoleAgent,
		Parts:     []types.Part{types.CreateTextPart(text)},
	}
	task.History = append(task.History, reply)
	task.Status.State = types.TaskStateCompleted
	task.Status.Message = &reply
	return task, nil
}

func (h *EchoHandler) SetAgent(a server.OpenAICompatibleAgent) { h.agent = a }
func (h *EchoHandler) GetAgent() server.OpenAICompatibleAgent  { return h.agent }

func main() {
	logger, _ := zap.NewDevelopment()
	defer func() { _ = logger.Sync() }()

	port := "8080"
	agentURL := fmt.Sprintf("http://localhost:%s", port)

	cfg := config.Config{
		AgentName:        "minimal-agent",
		AgentDescription: "A minimal A2A server that echoes messages",
		AgentVersion:     "0.1.0",
		Debug:            true,
		QueueConfig:      config.QueueConfig{CleanupInterval: 5 * time.Minute},
		ServerConfig:     config.ServerConfig{Port: port},
	}

	a2aServer, err := server.NewA2AServerBuilder(cfg, logger).
		WithBackgroundTaskHandler(&EchoHandler{}).
		WithAgentCard(types.AgentCard{
			Name:            cfg.AgentName,
			Description:     cfg.AgentDescription,
			Version:         cfg.AgentVersion,
			URL:             &agentURL,
			ProtocolVersion: "0.3.0",
			Capabilities: types.AgentCapabilities{
				Streaming:              &[]bool{false}[0],
				PushNotifications:      &[]bool{false}[0],
				StateTransitionHistory: &[]bool{false}[0],
			},
			DefaultInputModes:  []string{"text/plain"},
			DefaultOutputModes: []string{"text/plain"},
			Skills:             []types.AgentSkill{},
		}).
		Build()
	if err != nil {
		logger.Fatal("failed to create server", zap.Error(err))
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func() {
		if err := a2aServer.Start(ctx); err != nil {
			logger.Fatal("server failed to start", zap.Error(err))
		}
	}()
	logger.Info("server running", zap.String("port", port))

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	_ = a2aServer.Stop(shutdownCtx)
}
```

See the [`minimal`](https://github.com/inference-gateway/adk/tree/main/examples/minimal) example for the full runnable version with a companion client.

### AI-powered server

Wire an LLM by building an `OpenAICompatibleAgent` and attaching it to the server. `config.Load` reads the environment (`AGENT_CLIENT_PROVIDER`, `AGENT_CLIENT_MODEL`, `AGENT_CLIENT_API_KEY`, ...) on top of any defaults you set programmatically. With an agent attached, `WithDefaultTaskHandlers()` gives you working `message/send` and `message/stream` handling - including automatic input-required pausing - without writing handler code.

```go
ctx := context.Background()

// Start from defaults, then overlay environment values (AGENT_CLIENT_*, etc.).
cfg, err := config.Load(ctx, &config.Config{
	AgentName:          server.BuildAgentName,
	AgentDescription:   server.BuildAgentDescription,
	AgentVersion:       server.BuildAgentVersion,
	CapabilitiesConfig: config.CapabilitiesConfig{Streaming: true},
	ServerConfig:       config.ServerConfig{Port: "8080"},
})
if err != nil {
	logger.Fatal("failed to load config", zap.Error(err))
}

// A custom tool the model can call.
weatherTool := server.NewBasicTool(
	"get_weather",
	"Get current weather information for a city",
	map[string]any{
		"type": "object",
		"properties": map[string]any{
			"location": map[string]any{"type": "string", "description": "The city name"},
		},
		"required": []string{"location"},
	},
	func(ctx context.Context, args map[string]any) (string, error) {
		location, _ := args["location"].(string)
		return fmt.Sprintf(`{"location": %q, "temperature": "22C", "condition": "sunny"}`, location), nil
	},
)

toolBox := server.NewDefaultToolBox(&cfg.AgentConfig.ToolBoxConfig)
toolBox.AddTool(weatherTool)

llmClient, err := server.NewOpenAICompatibleLLMClient(&cfg.AgentConfig, logger)
if err != nil {
	logger.Fatal("failed to create LLM client", zap.Error(err))
}

agent, err := server.NewAgentBuilder(logger).
	WithConfig(&cfg.AgentConfig).
	WithLLMClient(llmClient).
	WithSystemPrompt("You are a helpful weather assistant. Be concise.").
	WithMaxChatCompletion(10).
	WithToolBox(toolBox).
	Build()
if err != nil {
	logger.Fatal("failed to build agent", zap.Error(err))
}

agentURL := fmt.Sprintf("http://localhost:%s", cfg.ServerConfig.Port)
a2aServer, err := server.NewA2AServerBuilder(*cfg, logger).
	WithAgent(agent).
	WithDefaultTaskHandlers().
	WithAgentCard(types.AgentCard{
		Name:            cfg.AgentName,
		Description:     cfg.AgentDescription,
		Version:         cfg.AgentVersion,
		URL:             &agentURL,
		ProtocolVersion: "0.3.0",
		Capabilities: types.AgentCapabilities{
			Streaming:              &cfg.CapabilitiesConfig.Streaming,
			PushNotifications:      &cfg.CapabilitiesConfig.PushNotifications,
			StateTransitionHistory: &cfg.CapabilitiesConfig.StateTransitionHistory,
		},
		DefaultInputModes:  []string{"text/plain"},
		DefaultOutputModes: []string{"text/plain"},
		Skills:             []types.AgentSkill{},
	}).
	Build()
```

See [`ai-powered`](https://github.com/inference-gateway/adk/tree/main/examples/ai-powered) and [`ai-powered-streaming`](https://github.com/inference-gateway/adk/tree/main/examples/ai-powered-streaming) for the complete programs.

## The server and its builder

`A2AServer` terminates the A2A JSON-RPC protocol. You never construct it directly - `A2AServerBuilder` assembles one through a fluent interface, and `Start(ctx)` binds the listener while `Stop(ctx)` shuts it down gracefully. Create the builder with `NewA2AServerBuilder(cfg, logger)`.

| Method                                   | Purpose                                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `WithAgent(agent)`                       | Attach a pre-built `OpenAICompatibleAgent` for the task handlers to delegate to.             |
| `WithAgentCard(card)`                    | Set the card served at `/.well-known/agent-card.json` from an in-memory value. **Required.** |
| `WithAgentCardFromFile(path, overrides)` | Load the card from a JSON file, replacing top-level attributes from the `overrides` map.     |
| `WithBackgroundTaskHandler(h)`           | Register a custom `message/send` (polling/queue) handler.                                    |
| `WithStreamingTaskHandler(h)`            | Register a custom `message/stream` (SSE) handler.                                            |
| `WithDefaultBackgroundTaskHandler()`     | Opt into the bundled background handler.                                                     |
| `WithDefaultStreamingTaskHandler()`      | Opt into the bundled streaming handler.                                                      |
| `WithDefaultTaskHandlers()`              | Opt into both bundled handlers at once.                                                      |
| `WithTaskResultProcessor(p)`             | Plug in custom business logic for deciding when a task is complete from tool-call results.   |
| `WithArtifactService(svc)`               | Supply an artifact service so the agent can emit URI-based downloadable files.               |
| `WithLogger(logger)`                     | Override the logger used by the builder and resulting server.                                |
| `Build()`                                | Validate and construct the `A2AServer`.                                                      |

> **Builder validation.** `Build()` returns an error unless an agent card is configured and at least one task handler is present. It also cross-checks the card's `Capabilities.Streaming` flag: a streaming-enabled card **requires** a streaming handler, and a streaming-disabled card **requires** a background handler. `WithDefaultTaskHandlers()` satisfies both. When the card advertises `PushNotifications`, the builder wires an HTTP push-notification sender automatically.

The default handlers delegate to the agent registered via `WithAgent` when one is present; without an agent they fall back to a built-in reply, which is what lets the [minimal server](#minimal-server) run with no LLM wired up. Storage, authentication, telemetry, and artifacts are driven by `Config` (see the [configuration reference](#configuration-reference)) and applied during `Build()`.

## AgentBuilder

`AgentBuilder` constructs the `OpenAICompatibleAgent` that lives inside the server. Create it with `NewAgentBuilder(logger)`, then either seed it with an entire `AgentConfig` via `WithConfig(&cfg)` or layer individual setters on top.

```go
agent, err := server.NewAgentBuilder(logger).
	WithConfig(&cfg.AgentConfig).
	WithLLMClient(llmClient).
	WithSystemPrompt("You are a helpful assistant").
	WithMaxChatCompletion(10).
	WithToolBox(toolBox).
	WithCallbacks(&server.CallbackConfig{ /* see Lifecycle callbacks */ }).
	Build()
```

| Method                            | Purpose                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `WithConfig(*AgentConfig)`        | Seed the builder from an `AgentConfig` (provider, model, key, generation parameters).     |
| `WithLLMClient(LLMClient)`        | Attach a pre-configured LLM client (build one with `NewOpenAICompatibleLLMClient`).       |
| `WithToolBox(ToolBox)`            | Provide a custom toolbox of callable tools.                                               |
| `WithDefaultToolBox()`            | Use the default toolbox (built-in `input_required`, plus `create_artifact` when enabled). |
| `WithSystemPrompt(string)`        | Override the system prompt prepended to every conversation.                               |
| `WithMaxChatCompletion(int)`      | Cap the chat-completion/tool-call loop iterations per turn (default `50`).                |
| `WithMaxConversationHistory(int)` | Cap the conversation-history messages retained per context (default `20`).                |
| `WithCallbacks(*CallbackConfig)`  | Register lifecycle callbacks (see [Lifecycle callbacks](#lifecycle-callbacks)).           |
| `Build()`                         | Construct the agent.                                                                      |

Convenience constructors wrap common combinations: `SimpleAgent(logger)`, `AgentWithConfig(logger, cfg)`, `AgentWithLLM(logger, client)`, and `FullyConfiguredAgent(logger, cfg, client, toolBox)`.

## Tools and the ToolBox

A `ToolBox` is a named collection of `Tool`s the agent exposes to the model as OpenAI-style function calls. The quickest way to define a tool is `NewBasicTool(name, description, parametersSchema, executor)`; register it with `toolBox.AddTool(tool)`.

```go
toolBox := server.NewToolBox() // or NewDefaultToolBox(&cfg.AgentConfig.ToolBoxConfig)

toolBox.AddTool(server.NewBasicTool(
	"get_current_time",
	"Get the current date and time",
	map[string]any{"type": "object", "properties": map[string]any{}},
	func(ctx context.Context, args map[string]any) (string, error) {
		return server.JSONTool(map[string]any{"now": time.Now().Format(time.RFC3339)})
	},
))
```

`NewDefaultToolBox(cfg)` pre-registers two built-ins:

- **`input_required`** - always present. The agent intercepts calls to it and pauses the task in the `input-required` state, surfacing the tool's `message` argument to the caller. This is the mechanism behind interactive, multi-turn conversations.
- **`create_artifact`** - registered only when `ToolBoxConfig.EnableCreateArtifact` is `true` (env `AGENT_CLIENT_TOOLS_CREATE_ARTIFACT=true`). It lets the model autonomously persist content as a downloadable artifact. See [Artifacts](#artifacts).

To implement a richer tool, satisfy the `Tool` interface directly (`GetName`, `GetDescription`, `GetParameters`, `Execute`); `BasicTool` is just the function-callback implementation of it.

## Task handlers

The ADK defines two handler interfaces, one per protocol entrypoint:

```go
type TaskHandler interface {
	HandleTask(ctx context.Context, task *types.Task, message *types.Message) (*types.Task, error)
	SetAgent(agent OpenAICompatibleAgent)
	GetAgent() OpenAICompatibleAgent
}

type StreamableTaskHandler interface {
	HandleStreamingTask(ctx context.Context, task *types.Task, message *types.Message) (<-chan cloudevents.Event, error)
	SetAgent(agent OpenAICompatibleAgent)
	GetAgent() OpenAICompatibleAgent
}
```

- **`TaskHandler`** backs `message/send` and background queue processing. It runs the task to a terminal state and returns the updated `Task`.
- **`StreamableTaskHandler`** backs `message/stream`. It returns a channel of [CloudEvents](#streaming-and-cloudevents) that the protocol handler forwards to the client as Server-Sent Events; close the channel when streaming is complete.

You can register your own (`WithBackgroundTaskHandler` / `WithStreamingTaskHandler`) or use the bundled defaults (`WithDefaultBackgroundTaskHandler` / `WithDefaultStreamingTaskHandler` / `WithDefaultTaskHandlers`). The default handlers consume the agent's event stream, drive task status transitions, attach [usage metadata](#configuration-reference) on terminal states, and handle input-required pausing automatically. Streaming handlers require an agent to be configured.

## Streaming and CloudEvents

Agents emit progress as [CloudEvents](https://cloudevents.io/). A `StreamableTaskHandler` returns `<-chan cloudevents.Event`; each event carries a typed payload you read with `event.DataAs(&target)`. The event types are stable string constants in the `types` package, all under the `adk.agent.*` namespace:

| Constant                        | Type string                     | Emitted when                                                 |
| ------------------------------- | ------------------------------- | ------------------------------------------------------------ |
| `types.EventDelta`              | `adk.agent.delta`               | An incremental token/text delta is produced.                 |
| `types.EventIterationCompleted` | `adk.agent.iteration.completed` | One chat-completion iteration finishes; carries a `Message`. |
| `types.EventToolStarted`        | `adk.agent.tool.started`        | A tool call begins.                                          |
| `types.EventToolCompleted`      | `adk.agent.tool.completed`      | A tool call returns successfully.                            |
| `types.EventToolFailed`         | `adk.agent.tool.failed`         | A tool call errors.                                          |
| `types.EventToolResult`         | `adk.agent.tool.result`         | A tool result is available.                                  |
| `types.EventInputRequired`      | `adk.agent.input.required`      | The agent needs more input; the task pauses.                 |
| `types.EventTaskInterrupted`    | `adk.agent.task.interrupted`    | The task is interrupted.                                     |
| `types.EventTaskStatusChanged`  | `adk.agent.task.status.changed` | The task transitions to a new `TaskStatus` state.            |
| `types.EventStreamFailed`       | `adk.agent.stream.failed`       | The agent stream fails.                                      |

A handler typically drives the agent with `agent.RunWithStream(ctx, messages)` and reacts to the events:

```go
streamChan, err := h.agent.RunWithStream(ctx, []types.Message{*message})
if err != nil {
	return nil, err
}

var full string
for event := range streamChan {
	switch event.Type() {
	case types.EventDelta:
		var delta types.Message
		if event.DataAs(&delta) == nil {
			for _, part := range delta.Parts {
				if part.Text != nil {
					full += *part.Text
				}
			}
		}
	case types.EventIterationCompleted:
		h.logger.Debug("iteration completed")
	}
}
```

## Lifecycle callbacks

Callbacks hook into agent execution at six points, grouped into three Before/After pairs. Register them on the agent with `WithCallbacks(&server.CallbackConfig{...})`; each field is a slice, so multiple callbacks run in order.

```go
callbacks := &server.CallbackConfig{
	BeforeModel: []server.BeforeModelCallback{
		func(ctx context.Context, cc *server.CallbackContext, req *server.LLMRequest) *server.LLMResponse {
			// Return a non-nil LLMResponse here to short-circuit the LLM call (caching, guardrails).
			return nil // nil => proceed to the model
		},
	},
	AfterTool: []server.AfterToolCallback{
		func(ctx context.Context, tool server.Tool, args map[string]any, tc *server.ToolContext, result map[string]any) map[string]any {
			// Return a non-nil map to replace the tool result; nil keeps it unchanged.
			return nil
		},
	},
}

agent, _ := server.NewAgentBuilder(logger).WithConfig(&cfg.AgentConfig).WithCallbacks(callbacks).Build()
```

The **Before** and **After** callbacks differ in how a non-nil return is treated:

| Callback              | Signature returns | A non-nil return...                                                                 |
| --------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `BeforeAgentCallback` | `*types.Message`  | **Short-circuits** agent execution and uses the message as the final response.      |
| `AfterAgentCallback`  | `*types.Message`  | **Replaces** the agent's output.                                                    |
| `BeforeModelCallback` | `*LLMResponse`    | **Short-circuits** the LLM call and uses the response as if it came from the model. |
| `AfterModelCallback`  | `*LLMResponse`    | **Replaces** the raw LLM response.                                                  |
| `BeforeToolCallback`  | `map[string]any`  | **Short-circuits** tool execution and uses the map as the tool result.              |
| `AfterToolCallback`   | `map[string]any`  | **Replaces** the tool result.                                                       |

Flow-control details that hold across all six:

- **Before** callbacks run in sequence; the **first** non-nil return wins and skips both the default behavior and any remaining Before callbacks.
- **After** callbacks **chain** - each receives the previous callback's (possibly modified) output, and the final non-nil value is used.
- A panic in any callback is recovered and logged; execution then continues with the next callback or the default behavior.
- `AfterModel` always runs, even when `BeforeModel` supplied a synthetic response, so post-processing (logging, redaction) sees every response.

`CallbackContext` (agent/model callbacks) and `ToolContext` (tool callbacks) expose `AgentName`, `InvocationID`, `TaskID`, `ContextID`, a mutable `State map[string]any`, and a `Logger`. See the [`callbacks`](https://github.com/inference-gateway/adk/tree/main/examples/callbacks) example for guardrail, caching, and logging patterns.

## The A2A client

`client.A2AClient` talks to any A2A server - one built with this ADK, or any other A2A-compliant agent. Construct one with `client.NewClient(baseURL)` for defaults, or `client.NewClientWithConfig(&client.Config{...})` to set timeout, headers, retries, a custom `*http.Client`, or a logger.

```go
import "github.com/inference-gateway/adk/client"

a2a := client.NewClient("http://localhost:8080")

resp, err := a2a.SendTask(ctx, types.MessageSendParams{
	Message: types.Message{
		MessageID: uuid.New().String(),
		Role:      types.RoleUser,
		Parts:     []types.Part{types.CreateTextPart("What's the weather in Berlin?")},
	},
})
```

The interface covers the entire A2A JSON-RPC surface:

| Method                                          | A2A method                            | Returns                               |
| ----------------------------------------------- | ------------------------------------- | ------------------------------------- |
| `GetAgentCard(ctx)`                             | `GET /.well-known/agent-card.json`    | `*types.AgentCard`                    |
| `GetAuthenticatedExtendedCard(ctx, params)`     | `agent/getAuthenticatedExtendedCard`  | `*types.JSONRPCSuccessResponse`       |
| `GetHealth(ctx)`                                | `GET /health`                         | `*client.HealthResponse`              |
| `SendTask(ctx, params)`                         | `message/send`                        | `*types.JSONRPCSuccessResponse`       |
| `SendTaskStreaming(ctx, params)`                | `message/stream`                      | `<-chan types.JSONRPCSuccessResponse` |
| `GetTask(ctx, params)`                          | `tasks/get`                           | `*types.JSONRPCSuccessResponse`       |
| `ListTasks(ctx, params)`                        | `tasks/list`                          | `*types.JSONRPCSuccessResponse`       |
| `CancelTask(ctx, params)`                       | `tasks/cancel`                        | `*types.JSONRPCSuccessResponse`       |
| `ResubscribeTask(ctx, params)`                  | `tasks/resubscribe`                   | `<-chan types.JSONRPCSuccessResponse` |
| `SetTaskPushNotificationConfig(ctx, params)`    | `tasks/pushNotificationConfig/set`    | `*types.JSONRPCSuccessResponse`       |
| `GetTaskPushNotificationConfig(ctx, params)`    | `tasks/pushNotificationConfig/get`    | `*types.JSONRPCSuccessResponse`       |
| `ListTaskPushNotificationConfig(ctx, params)`   | `tasks/pushNotificationConfig/list`   | `*types.JSONRPCSuccessResponse`       |
| `DeleteTaskPushNotificationConfig(ctx, params)` | `tasks/pushNotificationConfig/delete` | `*types.JSONRPCSuccessResponse`       |

Configuration helpers (`SetTimeout`, `SetHTTPClient`, `GetBaseURL`, `SetLogger`, `GetLogger`) and `GetArtifactHelper()` round out the interface.

### Streaming a task

`SendTaskStreaming` returns a channel of success responses, one per server-sent event:

```go
events, err := a2a.SendTaskStreaming(ctx, params)
if err != nil {
	log.Fatal(err)
}
for evt := range events {
	payload, _ := json.Marshal(evt.Result)
	log.Printf("event: %s", payload)
}
```

### Cancelling, listing, and resubscribing

```go
// tasks/cancel - works for any non-terminal task.
_, _ = a2a.CancelTask(ctx, types.TaskIdParams{ID: taskID})

// tasks/list - Limit (server caps at 100, default 50) + Offset paginate; filter by ContextID or State.
resp, _ := a2a.ListTasks(ctx, types.TaskListParams{Limit: 20, Offset: 0})

// tasks/resubscribe - re-attach to a streaming task after the SSE connection dropped.
events, _ := a2a.ResubscribeTask(ctx, types.TaskResubscriptionParams{Name: taskID})
for evt := range events {
	// server re-emits current state, then forwards further events
}
```

### Push-notification configuration

Register webhooks the server POSTs to as a task changes state. The four methods form a CRUD cycle keyed by the task ID; server-side push requires `CAPABILITIES_PUSH_NOTIFICATIONS=true`.

```go
configID := uuid.New().String()
token := "shared-secret"

_, _ = a2a.SetTaskPushNotificationConfig(ctx, types.TaskPushNotificationConfig{
	Name: taskID,
	PushNotificationConfig: types.PushNotificationConfig{
		ID:    &configID,
		URL:   "https://example.com/webhook",
		Token: &token,
	},
})
_, _ = a2a.GetTaskPushNotificationConfig(ctx, types.GetTaskPushNotificationConfigParams{Name: taskID})
_, _ = a2a.ListTaskPushNotificationConfig(ctx, types.ListTaskPushNotificationConfigParams{Parent: taskID})
_, _ = a2a.DeleteTaskPushNotificationConfig(ctx, types.DeleteTaskPushNotificationConfigParams{Name: taskID})
```

### Authenticated extended card

`GetAuthenticatedExtendedCard` is the JSON-RPC counterpart to the public agent card. The response is the same `AgentCard`, but the call passes through the server's auth middleware - useful when an extended card should only be visible to authenticated callers.

The [`protocol-methods`](https://github.com/inference-gateway/adk/tree/main/examples/protocol-methods) example ties all of these together end to end.

## Storage backends

Task state lives in a pluggable queue/store selected by `QUEUE_PROVIDER`:

- **`memory`** (default) - fast in-memory storage for development and single-instance deployments.
- **`redis`** - persistent storage with horizontal scaling. Set `QUEUE_URL` to a `redis://` or `rediss://` connection string. Tasks survive restarts and multiple server instances can share one queue.

```bash
export QUEUE_PROVIDER=redis
export QUEUE_URL=redis://localhost:6379
# auth / db / TLS variants:
export QUEUE_URL=redis://username:password@redis.example.com:6379/1
export QUEUE_URL=rediss://username:password@redis.example.com:6380/0
```

See the [`queue-storage`](https://github.com/inference-gateway/adk/tree/main/examples/queue-storage) example for in-memory and Redis variants side by side.

## Authentication

Enable OIDC/OAuth2 bearer-token authentication with the `AUTH_*` variables. When enabled, the server validates tokens against the configured issuer before dispatching JSON-RPC calls.

| Variable             | Default                                               | Purpose                         |
| -------------------- | ----------------------------------------------------- | ------------------------------- |
| `AUTH_ENABLE`        | `false`                                               | Enable OIDC authentication.     |
| `AUTH_ISSUER_URL`    | `http://keycloak:8080/realms/inference-gateway-realm` | OIDC issuer for discovery/JWKS. |
| `AUTH_CLIENT_ID`     | `inference-gateway-client`                            | Expected client/audience.       |
| `AUTH_CLIENT_SECRET` | _(empty)_                                             | Client secret, when required.   |

## Artifacts

Artifacts are files, structured data, or rich content an agent produces during a task. Enable the subsystem with `ARTIFACTS_ENABLE=true` and pick a storage backend with `ARTIFACTS_STORAGE_PROVIDER`:

- **`filesystem`** (default) - store on local disk (`ARTIFACTS_STORAGE_BASE_PATH`), suitable for single-instance deployments.
- **`minio`** - S3-compatible object storage for distributed deployments. Configure `ARTIFACTS_STORAGE_ENDPOINT`, `ARTIFACTS_STORAGE_ACCESS_KEY`, `ARTIFACTS_STORAGE_SECRET_KEY`, and `ARTIFACTS_STORAGE_BUCKET_NAME`.

By default downloads are **proxied** through the artifacts HTTP server (`ARTIFACTS_SERVER_PORT`, default `8081`) for auth and logging; set `ARTIFACTS_STORAGE_BASE_URL` to serve **direct** download URLs from the storage backend instead.

There are two ways to produce artifacts:

1. **Programmatically**, from a custom handler, with the artifact helper:

   ```go
   helper := server.NewArtifactHelper()
   art := helper.CreateTextArtifact("Report", "Analysis output", "...content...")
   helper.AddArtifactToTask(task, art)
   ```

   The helper also creates file artifacts (`CreateFileArtifactFromBytes`, `CreateFileArtifactFromURI`), structured-data artifacts (`CreateDataArtifact`), and multi-part artifacts (`CreateMultiPartArtifact`).

2. **Autonomously**, by enabling the built-in `create_artifact` tool (`AGENT_CLIENT_TOOLS_CREATE_ARTIFACT=true` plus `WithDefaultToolBox()`), letting the model save content and return a download URL on its own.

On the client side, `a2a.GetArtifactHelper()` extracts artifacts from responses and downloads them to disk with `DownloadAllArtifacts(ctx, task, &client.DownloadConfig{OutputDir: "downloads", OrganizeByArtifactID: true})`, handling both byte-embedded and URI-referenced files.

The [`artifacts-filesystem`](https://github.com/inference-gateway/adk/tree/main/examples/artifacts-filesystem), [`artifacts-minio`](https://github.com/inference-gateway/adk/tree/main/examples/artifacts-minio), [`artifacts-autonomous-tool`](https://github.com/inference-gateway/adk/tree/main/examples/artifacts-autonomous-tool), and [`artifacts-with-default-handlers`](https://github.com/inference-gateway/adk/tree/main/examples/artifacts-with-default-handlers) examples cover each path; the upstream [artifacts guide](https://github.com/inference-gateway/adk/blob/main/docs/artifacts.md) has the full API.

## Telemetry

The ADK's telemetry layer is built on [OpenTelemetry](https://opentelemetry.io/). `TELEMETRY_ENABLE=true` is the master switch; once it is on, the standard `OTEL_*` variables select which exporters run per signal. Metrics are exported either through a **Prometheus pull** endpoint (`/metrics`, default port `9090`) or **pushed via OTLP** to a collector; traces are exported over OTLP by default. The OpenTelemetry `service.name` resource attribute is derived from the agent's build-time name (the agent card `name`), and `service.version` from the build-time version - so no extra variables are needed. For agents generated by the [ADL CLI](/adl-cli/), these values are sourced from the ADL manifest `metadata.name` and `metadata.version` via Go linker flags. They are **build-time metadata** and are NOT overridable via environment variables (the ADK does not env-map them).

```bash
export TELEMETRY_ENABLE=true
export OTEL_METRICS_EXPORTER=prometheus   # prometheus | otlp | none
export OTEL_TRACES_EXPORTER=otlp          # otlp | none
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

Exporters are selected with the standard OpenTelemetry variables, which are read without a prefix:

| Variable                        | Default                 | Purpose                                                   |
| ------------------------------- | ----------------------- | --------------------------------------------------------- |
| `TELEMETRY_ENABLE`              | `false`                 | Master switch for the telemetry subsystem.                |
| `OTEL_METRICS_EXPORTER`         | `prometheus`            | Metrics exporter: `prometheus`, `otlp`, or `none`.        |
| `OTEL_TRACES_EXPORTER`          | `otlp`                  | Traces exporter: `otlp` or `none`.                        |
| `OTEL_EXPORTER_OTLP_ENDPOINT`   | `http://localhost:4318` | OTLP endpoint base URL shared by traces and metrics.      |
| `OTEL_EXPORTER_OTLP_PROTOCOL`   | `http/protobuf`         | OTLP transport: `http/protobuf` or `grpc`.                |
| `OTEL_EXPORTER_PROMETHEUS_HOST` | _(all)_                 | Bind host for the Prometheus pull endpoint (empty = all). |
| `OTEL_EXPORTER_PROMETHEUS_PORT` | `9090`                  | Port for the Prometheus pull endpoint.                    |

When `OTEL_METRICS_EXPORTER=otlp`, metrics are pushed to `OTEL_EXPORTER_OTLP_ENDPOINT` with a periodic reader and the Prometheus pull server is not started - the pull server runs only when metrics resolve to the `prometheus` exporter.

The session-id and tool-call-id keys used for both baggage propagation and the span attributes written from them are configurable, and default to the OTel semantic conventions:

| Variable                          | Default               | Purpose                                                     |
| --------------------------------- | --------------------- | ----------------------------------------------------------- |
| `TELEMETRY_ATTR_SESSION_ID_KEY`   | `session.id`          | Baggage member and span attribute key for the session id.   |
| `TELEMETRY_ATTR_TOOL_CALL_ID_KEY` | `gen_ai.tool.call.id` | Baggage member and span attribute key for the tool-call id. |

The original `TELEMETRY_*` names remain supported as **deprecated aliases** (`TELEMETRY_METRICS_HOST`/`PORT`, `TELEMETRY_TRACE_ENDPOINT`, `TELEMETRY_TRACE_HEADERS`); the `OTEL_*` variable wins whenever both are set. Prefer the standard names in new deployments. See the upstream [telemetry guide](https://github.com/inference-gateway/adk/blob/main/docs/telemetry.md) for the full reference.

## Build-time agent metadata

The agent's identity fields (`AgentName`, `AgentDescription`, `AgentVersion`) are **not** environment-configurable - they are baked into the binary at build time through Go linker flags, making them immutable in production images. The package exposes three variables in `server` you can set with `-ldflags`:

| Variable                       | LD-flag target                                                  |
| ------------------------------ | --------------------------------------------------------------- |
| `server.BuildAgentName`        | `github.com/inference-gateway/adk/server.BuildAgentName`        |
| `server.BuildAgentDescription` | `github.com/inference-gateway/adk/server.BuildAgentDescription` |
| `server.BuildAgentVersion`     | `github.com/inference-gateway/adk/server.BuildAgentVersion`     |

```bash
go build -ldflags "\
  -X 'github.com/inference-gateway/adk/server.BuildAgentName=Weather Assistant' \
  -X 'github.com/inference-gateway/adk/server.BuildAgentDescription=AI-powered weather agent' \
  -X 'github.com/inference-gateway/adk/server.BuildAgentVersion=0.1.1'" \
  -o bin/agent .
```

In a Dockerfile, drive these from `ARG`s so images can be tagged per release:

```dockerfile
FROM golang:1.26-alpine AS builder
ARG AGENT_NAME="My A2A Agent"
ARG AGENT_DESCRIPTION="A custom A2A agent built with the ADK"
ARG AGENT_VERSION="0.1.0"
WORKDIR /app
COPY . .
RUN go mod download && go build -ldflags "\
  -X 'github.com/inference-gateway/adk/server.BuildAgentName=${AGENT_NAME}' \
  -X 'github.com/inference-gateway/adk/server.BuildAgentDescription=${AGENT_DESCRIPTION}' \
  -X 'github.com/inference-gateway/adk/server.BuildAgentVersion=${AGENT_VERSION}'" -o bin/agent .
```

Reference them in code as `server.BuildAgentName`, etc., when constructing the `Config` and `AgentCard`.

## Configuration reference

`config.Config` is loaded with `config.Load(ctx, &base)`, which overlays environment variables onto an optional base config and applies struct-tag defaults. Variables are grouped by prefix; every value is optional and falls back to the default shown.

**Core server** - the listener and top-level toggles.

| Variable                           | Default   | Purpose                                     |
| ---------------------------------- | --------- | ------------------------------------------- |
| `SERVER_PORT`                      | `8080`    | HTTP listener port.                         |
| `DEBUG`                            | `false`   | Verbose logging.                            |
| `AGENT_URL`                        | _(unset)_ | Public URL advertised for the agent.        |
| `AGENT_CARD_FILE_PATH`             | _(unset)_ | Path to a static agent-card JSON file.      |
| `TIMEZONE`                         | `UTC`     | Timezone for timestamps.                    |
| `STREAMING_STATUS_UPDATE_INTERVAL` | `1s`      | How often to emit streaming status updates. |
| `SERVER_TLS_ENABLE`                | `false`   | Terminate TLS/HTTPS on the listener.        |
| `SERVER_TLS_CERT_PATH`             | _(unset)_ | Path to the TLS certificate.                |
| `SERVER_TLS_KEY_PATH`              | _(unset)_ | Path to the TLS private key.                |

**Agent / LLM client** (`AGENT_CLIENT_` prefix)

| Variable                                      | Default            | Purpose                                                 |
| --------------------------------------------- | ------------------ | ------------------------------------------------------- |
| `AGENT_CLIENT_PROVIDER`                       | _(unset)_          | LLM provider (`openai`, `anthropic`, ...).              |
| `AGENT_CLIENT_MODEL`                          | _(unset)_          | Model name.                                             |
| `AGENT_CLIENT_BASE_URL`                       | _(unset)_          | Custom LLM endpoint URL.                                |
| `AGENT_CLIENT_API_KEY`                        | _(unset)_          | Provider API key.                                       |
| `AGENT_CLIENT_TIMEOUT`                        | `30s`              | Per-request timeout.                                    |
| `AGENT_CLIENT_MAX_RETRIES`                    | `3`                | Retry budget for failed LLM calls.                      |
| `AGENT_CLIENT_MAX_CHAT_COMPLETION_ITERATIONS` | `50`               | Max tool-call/completion loop iterations.               |
| `AGENT_CLIENT_MAX_TOKENS`                     | `4096`             | Max tokens per completion.                              |
| `AGENT_CLIENT_TEMPERATURE`                    | `0.7`              | Sampling temperature.                                   |
| `AGENT_CLIENT_SYSTEM_PROMPT`                  | _(default prompt)_ | System prompt prepended to conversations.               |
| `AGENT_CLIENT_MAX_CONVERSATION_HISTORY`       | `20`               | Messages retained per context.                          |
| `AGENT_CLIENT_ENABLE_USAGE_METADATA`          | `true`             | Attach token usage + execution stats to terminal tasks. |
| `AGENT_CLIENT_TOOLS_CREATE_ARTIFACT`          | `false`            | Register the autonomous `create_artifact` tool.         |

**Capabilities** (`CAPABILITIES_` prefix)

| Variable                                | Default | Purpose                               |
| --------------------------------------- | ------- | ------------------------------------- |
| `CAPABILITIES_STREAMING`                | `true`  | Advertise `message/stream` support.   |
| `CAPABILITIES_PUSH_NOTIFICATIONS`       | `true`  | Advertise push-notification support.  |
| `CAPABILITIES_STATE_TRANSITION_HISTORY` | `false` | Record task state-transition history. |

**Queue / storage, retention, auth, telemetry, artifacts** are documented in [Storage backends](#storage-backends), [Authentication](#authentication), [Telemetry](#telemetry), and [Artifacts](#artifacts). Task retention is controlled by `TASK_RETENTION_MAX_COMPLETED_TASKS` (default `100`), `TASK_RETENTION_MAX_FAILED_TASKS` (default `50`), and `TASK_RETENTION_CLEANUP_INTERVAL` (default `5m`).

## Examples

The [`examples/`](https://github.com/inference-gateway/adk/tree/main/examples) directory ships sixteen runnable scenarios, each a self-contained Go module with its own README and (where relevant) a `docker-compose.yaml`.

**Without an LLM** - no provider keys required:

| Example                                                                                            | What it shows                                                     |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [minimal](https://github.com/inference-gateway/adk/tree/main/examples/minimal)                     | Bare A2A server + client with an echo handler - no agent.         |
| [static-agent-card](https://github.com/inference-gateway/adk/tree/main/examples/static-agent-card) | Load agent metadata from a JSON file via `WithAgentCardFromFile`. |
| [streaming](https://github.com/inference-gateway/adk/tree/main/examples/streaming)                 | A custom streaming handler emits CloudEvents over SSE.            |
| [default-handlers](https://github.com/inference-gateway/adk/tree/main/examples/default-handlers)   | Built-in task processing with `WithDefaultTaskHandlers()`.        |
| [protocol-methods](https://github.com/inference-gateway/adk/tree/main/examples/protocol-methods)   | End-to-end walk-through of every A2A JSON-RPC method.             |

**With an LLM** - require an Inference Gateway / provider key:

| Example                                                                                                  | What it shows                                                         |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [ai-powered](https://github.com/inference-gateway/adk/tree/main/examples/ai-powered)                     | An LLM agent with custom function tools (weather, time).              |
| [ai-powered-streaming](https://github.com/inference-gateway/adk/tree/main/examples/ai-powered-streaming) | The same agent streamed over `message/stream`.                        |
| [callbacks](https://github.com/inference-gateway/adk/tree/main/examples/callbacks)                       | Lifecycle hooks for guardrails, caching, and logging.                 |
| [usage-metadata](https://github.com/inference-gateway/adk/tree/main/examples/usage-metadata)             | Token usage + execution metrics attached to terminal tasks.           |
| [input-required](https://github.com/inference-gateway/adk/tree/main/examples/input-required)             | Interactive pausing in `input-required`, streaming and non-streaming. |

**Storage, security, and artifacts:**

| Example                                                                                                                        | What it shows                                                   |
| ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| [queue-storage](https://github.com/inference-gateway/adk/tree/main/examples/queue-storage)                                     | In-memory and Redis storage backends.                           |
| [tls-server](https://github.com/inference-gateway/adk/tree/main/examples/tls-server)                                           | HTTPS termination with TLS certificates.                        |
| [artifacts-filesystem](https://github.com/inference-gateway/adk/tree/main/examples/artifacts-filesystem)                       | Filesystem-backed downloadable artifacts.                       |
| [artifacts-minio](https://github.com/inference-gateway/adk/tree/main/examples/artifacts-minio)                                 | MinIO/S3-backed artifacts with direct and proxy download modes. |
| [artifacts-autonomous-tool](https://github.com/inference-gateway/adk/tree/main/examples/artifacts-autonomous-tool)             | The model creates artifacts via the `create_artifact` tool.     |
| [artifacts-with-default-handlers](https://github.com/inference-gateway/adk/tree/main/examples/artifacts-with-default-handlers) | Artifacts combined with the default handlers.                   |

## Related

- [Agent Definition Language (ADL)](/adl/) - define an agent declaratively in YAML instead of wiring the builders by hand.
- [ADL CLI](/adl-cli/) - scaffold an A2A agent project (built on this ADK) from an ADL file, then fill in the generated tool stubs.
- [A2A Integration](/a2a/) - the Agent-to-Agent protocol these agents speak, and how the gateway consumes them.
- [TypeScript ADK](/typescript-adk/) - the sibling ADK for Node/TypeScript agents.
- [Rust ADK](/rust-adk/) - the sibling ADK for Rust agents.
- [A2A Debugger](/a2a-debugger/) - inspect and exercise A2A agents from the command line.
- [Go ADK on GitHub](https://github.com/inference-gateway/adk) - source, issues, and the full example catalogue.
- [Inference Gateway](https://github.com/inference-gateway/inference-gateway) - the gateway the agents call for LLM completions.
