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

The app updates itself. When a newer release is available the top bar shows an update button (the same one is in Settings under Updates). Clicking it reinstalls the `infer` CLI and gateway binaries, then downloads the new app bundle, verifies its signature against the project's updater public key, and relaunches. Checks run at startup and every 6 hours.

## Chat and tool approval

Start a conversation by typing into the chat input and pressing Enter. The agent processes your request and streams the response back in real time.

When the agent wants to perform a tool action (read a file, execute a command, fetch a URL, or any other operation on your machine), it requests **permission** before proceeding. A prompt appears in the chat UI showing:

- The **tool** the agent wants to call
- The **arguments** it plans to pass

You click **Approve** to allow the action or **Deny** to reject it. This keeps the agent sandboxed to your intent - no silent file access, no unapproved side effects.

## Reasoning and thinking view

Models that emit reasoning show it in the transcript in a collapsible **Thought process** block, rendered above the answer for that turn. It is collapsed by default - click the summary to expand it and read the reasoning. Reasoning is streamed live, so an expanded block fills in as the model thinks rather than appearing all at once when the turn ends.

While the model is working, an animated **thinking indicator** (pulsing dots) sits at the bottom of the transcript. It appears when you send a message and stays visible for the whole turn - through reasoning, streamed answer text, and tool calls - and resumes after you approve or deny a tool. It disappears only when the turn ends: completion, cancellation, an error, or a pending approval prompt.

Tool calls in the same turn render as their own collapsible cards next to the reasoning block, each labelled with the tool name and a preview of its arguments. Expand one to see the full arguments and the tool output; a running call shows an animated ellipsis, and a failed call is highlighted in red.

Reasoning requires a model that emits it and an `infer` CLI new enough to forward it. Against an older CLI the transcript still works - you just get no **Thought process** block.

## Parallel sessions

You can run several agent sessions at once. Click **+ New chat** while another conversation is streaming and start typing - each session is backed by its own `infer agent` process, so they stream independently. `+ New chat` is never disabled by a running session.

Every conversation keeps its own transcript and approval prompts. Switching the active conversation mid-stream does not interrupt the others: a session you navigate away from keeps running in the background, and its output is waiting when you switch back.

### The concurrency cap

The number of sessions that can run at the same time is capped. Set it in **Settings -> General -> Max concurrent sessions**; the default is **5** and the minimum is 1. The value is stored locally in the app and persists across restarts.

The cap is checked when you start a **new** chat. If that many sessions are already running, the send is rejected with:

```text
Max 5 concurrent sessions reached - stop one to start another
```

Nothing is queued - the message is not sent. Stop or wait for a running session (or raise the cap in Settings), then send again. Sending another message into a conversation that is already open is not affected by the cap.

### Session status in the UI

Each conversation in the sidebar shows a status dot while it is active:

| Dot           | Meaning                                                       |
| ------------- | ------------------------------------------------------------- |
| Pulsing green | The session is running - the agent is working or streaming    |
| Amber         | The session is paused awaiting a tool approval - it needs you |
| No dot        | The session is idle                                           |

Amber is the one to look for when several sessions are in flight: it marks the conversation blocked on your **Approve** or **Deny**. A session that has started but has not been saved yet still appears in the sidebar so you can switch to it while it runs.

Quitting the app stops every running session.

## Voice input

Click the microphone icon in the chat composer and speak - your speech is transcribed locally and inserted into the message box. Unlike the [CLI speech-to-text](/cli-speech-to-text/), the desktop app sets everything up for you: no Homebrew, no manual `whisper-cpp` install.

On first use a one-time prompt asks to download voice support (~75 MB). On approval the app downloads a prebuilt `whisper-cli` binary and the `ggml-tiny.bin` model with a progress indicator, then starts recording. Later use skips the download.

| File                  | Path                                           |
| --------------------- | ---------------------------------------------- |
| `whisper-cli` binary  | `~/.infer/bin/whisper-cli` (`.exe` on Windows) |
| `ggml-tiny.bin` model | `~/.infer/models/whisper/ggml-tiny.bin`        |

These are shared with the CLI - if you have already used speech-to-text there, the desktop app reuses them. You can also point at your own build: `WHISPER_BIN` wins if set, otherwise a `whisper-cli` or `whisper-cpp` on `PATH` is used as-is, and only failing both does the download run.

Voice input works on every supported platform except Windows arm64, where clicking the microphone shows **"Voice input isn't available on this platform"**.

## Related

- [Getting Started](/getting-started/) - set up the Inference Gateway server
- [CLI](/cli/) - the `infer` CLI that powers the desktop backend
- [Speech-to-Text](/cli-speech-to-text/) - speech-to-text in the `infer` CLI
- [A2A Integration](/a2a/) - chat with A2A agents from the desktop app
- [Configuration](/configuration/) - gateway configuration reference
- [Repository](https://github.com/inference-gateway/desktop) - source, releases, and contributing guide
