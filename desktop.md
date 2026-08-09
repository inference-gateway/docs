---
title: Desktop App
description: Inference Gateway Desktop is a provider-agnostic native AI client built with Tauri v2 and React. Bring your own API keys, pick a model, and chat with agents across providers - no silos, no vendor lock-in.
---

# Desktop App

**Inference Gateway Desktop** is a native [Tauri v2](https://tauri.app) + [React](https://react.dev) desktop AI client. It works with any model provider - OpenAI, Anthropic, Google, local Ollama models, and any OpenAI-compatible endpoint. Like Codex or Co-Work, but provider-agnostic: bring your own API keys, pick a model, and work across providers from a single native window.

The app is open-source at [github.com/inference-gateway/desktop](https://github.com/inference-gateway/desktop) and powered by [Inference Gateway](/) under the hood.

## How it works

On first run, the app downloads the `infer` CLI binary and installs it to `~/.infer/bin/infer`. The CLI manages the gateway server and routes requests to whatever provider you configure. The gateway binary lands at `~/.infer/bin/inference-gateway`, and config lives under `~/.infer/`.

### ~/.infer layout

| Path                             | Purpose                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `~/.infer/bin/infer`             | The `infer` CLI - manages the gateway, routes requests, and drives agent interactions |
| `~/.infer/bin/inference-gateway` | The gateway server binary                                                             |
| `~/.infer/config.yaml`           | Gateway configuration (providers, API keys, model routing)                            |
| `~/.infer/agents.json`           | Registered A2A agent definitions                                                      |

Everything is scoped to your home directory - no system-wide installs, no vendor lock-in.

## Supported platforms

| Platform      | Asset name            |
| ------------- | --------------------- |
| Linux amd64   | `infer-linux-amd64`   |
| Linux arm64   | `infer-linux-arm64`   |
| macOS amd64   | `infer-darwin-amd64`  |
| macOS arm64   | `infer-darwin-arm64`  |
| Windows amd64 | `infer-windows-amd64` |
| Windows arm64 | `infer-windows-arm64` |

Downloads are available from the [releases page](https://github.com/inference-gateway/desktop/releases).

## First-install friction

Releases are not signed with an Apple Developer or Windows code-signing certificate, so the friction is confined to the **first install**:

- **macOS**: the downloaded `.dmg` is marked as quarantined by Gatekeeper. Right-click the app -> **Open** and confirm to launch it the first time.
- **Windows**: SmartScreen shows a warning. Click **More info** -> **Run anyway** to proceed.

Updates applied by the app itself are downloaded by the app rather than a browser, so they are not quarantined and do not repeat those prompts.

## Updates

The app updates itself. When a newer release is available the top bar shows an update button (the same one is in Settings under Updates). Clicking it reinstalls the `infer` CLI and gateway binaries, then downloads the new app bundle, verifies its signature (checksum-verified), and relaunches. Checks run at startup and every 6 hours.

## Chat and tool approval

Start a conversation by typing into the chat input and pressing Enter. The agent processes your request and streams the response back in real time.

When the agent wants to perform a tool action (read a file, execute a command, fetch a URL, or any other operation on your machine), it requests **permission** before proceeding. A prompt appears in the chat UI showing:

- The **tool** the agent wants to call
- The **arguments** it plans to pass

You click **Approve** to allow the action or **Deny** to reject it. This keeps the agent sandboxed to your intent - no silent file access, no unapproved side effects.

## Related

- [Getting Started](/getting-started/) - set up the Inference Gateway server
- [CLI](/cli/) - the `infer` CLI that powers the desktop backend
- [Voice Input](/desktop-speech-to-text/) - speech-to-text with automatic setup
- [A2A Integration](/a2a/) - chat with A2A agents from the desktop app
- [Configuration](/configuration/) - gateway configuration reference
- [Repository](https://github.com/inference-gateway/desktop) - source, releases, and contributing guide
