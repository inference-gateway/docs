---
title: A2A Debugger
description: A2A Debugger CLI for inspecting, streaming, and replaying tasks on any Agent-to-Agent server. Install via script or Go install; works with the Inference Gateway ecosystem.
---

# A2A Debugger

The **A2A Debugger** is the ultimate troubleshooting and inspection tool for [Agent-to-Agent (A2A)](/a2a/) servers. It's a small Go CLI (`a2a`) that connects to any A2A-compatible agent, lists and streams tasks, replays conversation histories, and inspects agent cards - so you can debug agent behaviour without writing throwaway client code.

> **Note:** A2A Debugger is in early development. Breaking changes are expected; pin to a specific version in scripts and watch the [CHANGELOG](https://github.com/inference-gateway/a2a-debugger/blob/main/CHANGELOG.md) for releases.

## When to reach for it

Use the A2A Debugger when you need to:

- **Verify an A2A server is reachable** and see what its agent card advertises (skills, streaming support, protocol version).
- **Inspect live or historical tasks** on an agent - filter by state, dump the full payload, or follow a conversation across messages.
- **Stream a task end-to-end** and see every status/artifact event as it arrives, plus a final summary with task ID, duration, and event counts.
- **Validate your own A2A implementation** during development - especially when scaffolding a new agent with the [ADL CLI](/adl-cli/).

It complements the [Inference Gateway CLI](/cli/)'s `infer agents` commands: where `infer` manages and chats with agents at a high level, `a2a` gives you raw protocol-level visibility into a single server.

## Installation

### Install script (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/inference-gateway/a2a-debugger/main/install.sh | bash
```

Pin a specific version or use a custom directory:

```bash
# Specific version
curl -fsSL https://raw.githubusercontent.com/inference-gateway/a2a-debugger/main/install.sh | bash -s -- --version v1.0.0

# Custom install location
INSTALL_DIR=~/bin curl -fsSL https://raw.githubusercontent.com/inference-gateway/a2a-debugger/main/install.sh | bash
```

### Go install

```bash
go install github.com/inference-gateway/a2a-debugger@latest
```

### Pre-built binaries

Download from the [GitHub releases page](https://github.com/inference-gateway/a2a-debugger/releases).

### Build from source

```bash
git clone https://github.com/inference-gateway/a2a-debugger.git
cd a2a-debugger
task build
```

## Quick start

Point the debugger at a running A2A server and verify the connection:

```bash
a2a connect --server-url http://localhost:8080
```

Persist the server URL so subsequent commands don't need the flag:

```bash
a2a config set server-url http://localhost:8080
```

List recent tasks, inspect one in detail, and replay its conversation:

```bash
a2a tasks list
a2a tasks get <task-id>
a2a tasks history <context-id>
```

## Command structure

The CLI uses a namespace-based layout: top-level verbs for server interactions, plus `config` and `tasks` namespaces for grouped operations.

### Server commands

```bash
a2a connect          # Test connection and print agent info
a2a agent-card       # Fetch and display the full agent card
```

### Config commands

```bash
a2a config set <key> <value>   # Persist a value to ~/.a2a.yaml
a2a config get <key>           # Read a single value
a2a config list                # Dump every configured value
```

### Task commands

```bash
a2a tasks list                          # List tasks on the server
a2a tasks get <task-id>                 # Show full task details
a2a tasks history <context-id>          # Replay a conversation by context
a2a tasks submit <message>              # Submit a task and wait for the response
a2a tasks submit-streaming <message>    # Submit a streaming task with live events
```

## Configuration

The debugger reads from `~/.a2a.yaml` by default. Override with `--config <path>`.

```yaml
server-url: http://localhost:8080
timeout: 30s
debug: false
insecure: false
output: yaml # or json
```

### Global flags

| Flag           | Description                      | Default                 |
| -------------- | -------------------------------- | ----------------------- |
| `--server-url` | A2A server URL                   | `http://localhost:8080` |
| `--timeout`    | Request timeout                  | `30s`                   |
| `--debug`      | Enable debug logging             | `false`                 |
| `--insecure`   | Skip TLS verification            | `false`                 |
| `--config`     | Config file path                 | `~/.a2a.yaml`           |
| `--output, -o` | Output format (`yaml` or `json`) | `yaml`                  |

### `tasks list` flags

| Flag                | Description                                                    | Default |
| ------------------- | -------------------------------------------------------------- | ------- |
| `--state`           | Filter by state: `submitted`, `working`, `completed`, `failed` | -       |
| `--context-id`      | Filter by context ID                                           | -       |
| `--limit`           | Maximum tasks to return                                        | `50`    |
| `--offset`          | Number of tasks to skip                                        | `0`     |
| `--include-history` | Include conversation history in the output                     | `false` |

### `tasks get` flags

| Flag               | Description                           |
| ------------------ | ------------------------------------- |
| `--history-length` | Number of history messages to include |

## Common flows

### Inspect an agent card

```bash
$ a2a connect --server-url http://localhost:8080

Successfully connected to A2A server!

Agent Information:
  Name: My A2A Agent
  Description: A helpful assistant agent
  Version: 1.0.0
  URL: http://localhost:8080

Capabilities:
  Streaming: true
  Push Notifications: false
  State Transition History: true
```

For the raw agent card payload:

```bash
a2a agent-card -o json
```

### List and filter tasks

By default, `tasks list` omits conversation history to keep output readable:

```bash
$ a2a tasks list --state working --limit 5

Tasks (Total: 23, Showing: 5)

1. Task ID: task-abc123
   Context ID: ctx-xyz789
   Status: working
   ...
```

Pull the full record (including message bodies) with `--include-history`:

```bash
a2a tasks list --limit 1 --include-history
```

### Drill into a single task

```bash
a2a tasks get task-abc123
```

Returns the current message, status, parts, and any artifacts attached to the task.

### Replay a conversation

`tasks history` walks every task that shares a `context-id`, in order:

```bash
$ a2a tasks history ctx-xyz789

Conversation History for Context: ctx-xyz789

Task: task-abc123 (Status: completed)
  1. [user] msg-123
     1: I need help with my project
  2. [assistant] msg-456
     1: Hello! How can I help you today?
```

### Stream a task end-to-end

`submit-streaming` keeps the connection open and prints every status/artifact event as it arrives, then closes with a summary:

```bash
$ a2a tasks submit-streaming "Hello, can you demonstrate streaming?"

# ... live event output ...

Streaming Summary:
  Task ID: task-xyz123
  Context ID: ctx-abc789
  Final Status: completed
  Duration: 2.5s
  Total Events: 5
    Status Updates: 3
    Artifact Updates: 2
  Final Message Parts: 2
```

Use `--context-id <id>` to continue an existing conversation and `--raw` to dump the underlying event JSON for protocol-level debugging:

```bash
a2a tasks submit-streaming "Continue our chat" --context-id ctx-abc789
a2a tasks submit-streaming "Debug me" --raw
```

### Output formats

All structured output supports YAML (default) and JSON via `-o`:

```bash
a2a tasks list --limit 2 -o json
```

This is the easiest way to pipe debugger output into `jq`, scripts, or test fixtures.

## Running against the example stack

The [`example/`](https://github.com/inference-gateway/a2a-debugger/tree/main/example) directory in the repo ships a `docker-compose.yml` that spins up a mock A2A server (no API keys required) alongside the debugger, so you can try every command without provisioning an agent:

```bash
git clone https://github.com/inference-gateway/a2a-debugger.git
cd a2a-debugger/example
docker compose up -d

docker compose run --rm a2a-debugger connect
docker compose run --rm a2a-debugger tasks submit-streaming "Hello"
```

The mock agent is the [Mock Agent](/mock-agent/) ([`mock-agent`](https://github.com/inference-gateway/mock-agent)) image, which simulates an LLM client end-to-end - no API keys required. See the [Mock Agent](/mock-agent/) page for its skills and tools.

## Related

- [A2A Integration](/a2a/) - protocol overview and how agents plug into the gateway
- [ADL CLI](/adl-cli/) - scaffold A2A agents you can then debug with `a2a`
- [Inference Gateway CLI](/cli/) - high-level `infer agents` workflows
- [A2A Registry](/registry/) - browse published A2A agents
- [Mock Agent](/mock-agent/) - the zero-config mock A2A server used in the example stack
- [Repository](https://github.com/inference-gateway/a2a-debugger) - source, issues, and releases
