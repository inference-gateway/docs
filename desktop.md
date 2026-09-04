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
| `~/.infer/agents.yaml`           | Registered A2A agent definitions                                                      |
| `~/.infer/auth.json`             | Provider API keys saved from **Settings -> API Keys**                                 |

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

## Settings

Open Settings with the gear icon at the right of the top bar. A left rail lists the sections, and **Back** returns to the chat. Settings opens on **API Keys**.

| Section           | What it covers                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| **General**       | [Max concurrent sessions](#the-concurrency-cap) and the [text-to-speech toggle](#enabling-text-to-speech) |
| **API Keys**      | One API key per provider                                                                                  |
| **Agents**        | A2A agents the local agent can delegate to                                                                |
| **Voice samples** | [WAV reference recordings](#voice-samples) for voice cloning                                              |
| **Updates**       | Installed versions, manual check, and [Install updates](#updates)                                         |

### API Keys

Each supported provider gets one masked field. Fill in the providers you use and leave the rest blank:

| Provider     | Field                  |
| ------------ | ---------------------- |
| OpenAI       | `OPENAI_API_KEY`       |
| Anthropic    | `ANTHROPIC_API_KEY`    |
| DeepSeek     | `DEEPSEEK_API_KEY`     |
| Google       | `GOOGLE_API_KEY`       |
| Groq         | `GROQ_API_KEY`         |
| Mistral      | `MISTRAL_API_KEY`      |
| Cohere       | `COHERE_API_KEY`       |
| Cloudflare   | `CLOUDFLARE_API_KEY`   |
| NVIDIA       | `NVIDIA_API_KEY`       |
| Moonshot     | `MOONSHOT_API_KEY`     |
| MiniMax      | `MINIMAX_API_KEY`      |
| Ollama Cloud | `OLLAMA_CLOUD_API_KEY` |

**Save** writes the non-empty values to `~/.infer/auth.json` (mode `0600` on macOS and Linux), returns you to the chat, and restarts the gateway so the new keys take effect - which is also what refreshes the model list. Keys are passed to the agent as environment variables of the same name; nothing is sent anywhere else.

### Model picker

The model dropdown lives in the top bar, next to the **Restart CLI** button, rather than in Settings - but it is where the keys you saved show up as models you can pick.

The list comes from the gateway's [`GET /v1/models`](/api-reference/) endpoint (each entry's `id`), read from the gateway URL in `~/.infer/config.yaml`, defaulting to `http://localhost:8080`. Until the gateway answers, the picker shows **Waiting for gateway...**; the app retries roughly every 1.5 seconds. If the list stays empty, the usual cause is a missing or wrong API key for every configured provider.

Your selection is stored locally and restored on the next launch. If the saved model is no longer offered, the first model in the list is selected instead. The picker is disabled while the conversation you are viewing is streaming - switch to another chat or wait for the turn to finish.

### Agents

The **Agents** tab manages the [A2A](/a2a/) agents your local agent can delegate to. Selections are written to `~/.infer/agents.json` and loaded on startup, so they survive restarts.

**Local A2A agents (containers)** are listed from the public [agent registry](/registry/) catalog, each card showing the agent's name, version, description, and up to four skills. Tick the checkbox to enable an agent and untick it to remove it. The desktop registers local agents by name only, so the CLI assigns each one its known port - you still have to run that agent's container yourself for the delegation to reach anything. If the registry cannot be fetched, the tab shows **Couldn't load the agent registry.** instead of the cards; the rest of Settings is unaffected.

**Setting a model:** an enabled agent that has a model assigned shows a dropdown on its card, listing the same models as the top-bar picker. Pick one to change which model that agent runs on. If the agent's current model is not in the gateway's list, it is kept at the top of the dropdown rather than silently replaced.

**Remote agents** are ones you host or run elsewhere. Type the agent's URL (for example `http://localhost:8085`) into the field at the bottom and click **Add** or press Enter. Remote agents appear in their own list above the field, each with a **Remove** button.

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

## Images in chat

Images an agent produces are rendered inline in the transcript, not shown as a link or a file path. Markdown images (`![alt](url)`) render as-is, and a bare image URL or `data:image/...` URI on its own is turned into an image too. Images are sized to their natural dimensions up to the width of the chat bubble; one that fails to load is replaced with a short error line instead of a broken-image icon.

Hover an image (or focus it with the keyboard) to reveal a **download** button in its corner. Clicking it copies the file from `~/.infer/tmp/` to your Downloads folder - there is no save dialog, and an existing file with the same name is overwritten. The button reports what happened by swapping its icon:

| Icon           | State                                         |
| -------------- | --------------------------------------------- |
| Download arrow | Idle - ready to save                          |
| Spinner        | Saving - the copy is in progress              |
| Green check    | Saved - the file is in your Downloads folder  |
| Red cross      | Error - the copy failed, hover again to retry |

The button is disabled while saving, and the check or cross reverts to the download arrow after about two seconds.

## Conversations

The left sidebar lists your conversations, newest work at hand: a session that is running but has not been persisted yet is shown at the top, titled by its first prompt (or **New chat** until you send one), followed by the conversations saved on disk. A saved conversation with no title yet shows **(untitled)**; hover any entry to see its title, or its session id if it has none.

Click an entry to open it. The transcript is loaded from storage, so history survives restarts - except for a conversation that is still live in this app session, whose in-memory transcript is kept rather than being replaced by the on-disk copy.

### Deleting one conversation

Hover a conversation and a trash icon appears at its right edge. It is a two-click delete: the first click arms the button (it turns red, tooltip **Click again to delete**), the second deletes. Moving the pointer off the entry disarms it, so a stray click costs nothing.

Deleting a conversation that is currently running cancels its session first. Deleting the one you are viewing returns you to a new chat.

### Multi-select and bulk delete

You can select several conversations and delete them in one go:

| Action                                  | Result                                                    |
| --------------------------------------- | --------------------------------------------------------- |
| **Click**                               | Opens the conversation - and clears any current selection |
| **Ctrl+click** (**Cmd+click** on macOS) | Toggles that one conversation in or out of the selection  |
| **Shift+click**                         | Selects the contiguous range from the last clicked entry  |

Selected entries are tinted with an accent background and an accent bar on the left. Starting a **+ New chat** clears the selection too.

With at least one entry selected, a bar pins to the bottom of the sidebar with a **Delete N selected** button. It confirms the same way as the single delete: the first click arms it (**Click again to delete N**), the second deletes; moving the pointer off cancels. The deletions run in parallel and the list refreshes when they finish.

### Where conversations are stored

The app does not keep its own conversation store - it shells out to the [`infer` CLI's conversation management](/cli/#conversation-management) (`infer conversations list`, `show`, and `delete`), so the desktop app and the CLI see the same history.

With the default JSONL backend that means `~/.infer/projects/<project-slug>/conversations/`, one directory per project; with SQLite it means the shared `~/.infer/conversations.db`. Listings are scoped to the project the CLI runs in, and the desktop app runs it from your home directory. Point [`storage`](/cli/#conversation-management) at another backend in `~/.infer/config.yaml` and the sidebar follows it. Deletes go to the storage backend and are not recoverable from the app.

### Project groups

Organize conversations into named project groups in the sidebar. Each group
is a collapsible heading with a conversation count. Conversations that belong
to no group sit in the default **ungrouped** area.

- **Create** -- click the **New project** button at the bottom of the
  sidebar, type a name, and press Enter.
- **Rename** -- double-click the heading (or click the pencil icon on hover)
  and edit inline.
- **Delete** -- click the **X** on hover. Deleting a project removes the
  group but keeps the conversations -- they move to the ungrouped area.
- **Move conversations** -- drag a conversation from one group to another,
  or to the ungrouped area. The cursor shows where the item lands. You can
  also drag multiple selected conversations at once.
- **Collapse** -- click the chevron next to a heading to hide or show its
  conversations.

A project indicator appears at the top of the chat composer when a
conversation belongs to a project. New chats started while a project is
selected (the heading is highlighted in the sidebar) are automatically
assigned to that project.

**Per-project context** is managed in **Settings -> Projects**. Each project
has a text area for extra instructions that are sent with every message in
that project, alongside any global extra instructions.

Assignments are stored in `~/.infer/projects.json`, a JSON file with
`assignments`, `names`, and `contexts` keys. The desktop owns this file
entirely -- it is never read or written by the gateway or the CLI, and
project groups do not sync to any backend.

## Parallel sessions

You can run several agent sessions at once. Click **+ New chat** while another conversation is streaming and start typing - each session is backed by its own `infer headless` process, so they stream independently. `+ New chat` is never disabled by a running session.

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

## Text to speech

The other direction - spoken audio out - is handled by the [`infer` CLI's `TextToSpeech` tool](/cli-text-to-speech/). The desktop app synthesizes nothing itself: it flips the feature on, plays the resulting WAVs, and manages the reference recordings used for voice cloning.

### Enabling text to speech

**Settings -> General -> Text to speech -> Enable Text to Speech**. It is off by default; while it is off the `TextToSpeech` tool is not sent to the model at all.

Saving writes `text_to_speech.enabled` to `~/.infer/config.yaml` and, if the toggle changed, restarts the desktop-owned gateway - the same restart path as saving an API key. The restart is what makes the feature work: the gateway reads `AUDIO_ENABLED=true` and `AUDIO_LOCAL_AUTO_DOWNLOAD=true` at spawn, and those are only passed while the toggle is on, so [`POST /v1/audio/speech`](/api-reference/#audio-api) is unreachable until the gateway comes back up.

Only `enabled` is written. The other keys in the `text_to_speech` section - `engine`, `model`, `voice`, `output_dir` and the rest of the [configuration reference](/cli-text-to-speech/#configuration-reference) - are CLI-managed and pass through untouched, so a config you tuned for the CLI survives a save from the desktop.

### Playback in the transcript

A WAV produced by the tool renders inline in the transcript as an audio player rather than a file path: play/pause, a waveform decoded from the file itself, click anywhere on it to seek, and elapsed/total time. Hover it to reveal a **download** button that copies the file to your Downloads folder, reporting itself with the [same icon states](#images-in-chat) as the image download button.

The same player is used for [voice samples](#voice-samples).

**Output-dir caveat:** only WAVs under `~/.infer/tts/` (the default `text_to_speech.output_dir`) and `~/.infer/models/tts/samples/` are inside the app's asset scope. Point `output_dir` at a directory outside those and the turn degrades to a plain tool card showing the path - the audio is still generated, it just cannot be played or downloaded from the app.

### Voice samples

**Settings -> Voice samples** is a managed library of WAV reference recordings for zero-shot voice cloning, stored flat in `~/.infer/models/tts/samples/` (created on first use, next to the CLI's TTS model cache). Only `.wav` files are listed, non-recursively, sorted by name.

| Action      | How                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Add**     | **Add sample** opens the native file picker, filtered to `.wav`. The file is copied in under its base name, overwriting a sample of that name |
| **Record**  | Type a name, click the microphone, speak, click again to stop. Captured at the device's native sample rate, auto-stopped after 30 seconds     |
| **Preview** | Every sample card carries the same audio player as the transcript, download button included                                                   |
| **Delete**  | The trash icon on the card. Single click, no confirmation - the file is removed from disk                                                     |

A recording is saved as `<name>.wav` (the `.wav` is added for you; the name defaults to `my-voice`) and needs microphone permission - denying it shows **Microphone access denied**. Anything other than a `.wav` is rejected, and names must be bare file names, no directories.

To use a sample, name its full file name in chat: _"read this in the voice of my-voice.wav"_. The CLI's `voice_sample` argument takes a bare file name and looks it up in the working directory first, then in this library, so a sample added here is equally usable from the CLI. Sample-name lookup needs `infer` v0.189.1 or newer, which the app pins.

Cloning quality comes down to the reference: one speaker, no music or background noise, roughly 10-30 seconds.

## Related

- [Getting Started](/getting-started/) - set up the Inference Gateway server
- [CLI](/cli/) - the `infer` CLI that powers the desktop backend
- [Speech-to-Text](/cli-speech-to-text/) - speech-to-text in the `infer` CLI
- [Text-to-Speech](/cli-text-to-speech/) - the `TextToSpeech` tool behind the desktop toggle
- [A2A Integration](/a2a/) - chat with A2A agents from the desktop app
- [Agent Registry](/registry/) - the catalog behind the Agents tab
- [Configuration](/configuration/) - gateway configuration reference
- [Repository](https://github.com/inference-gateway/desktop) - source, releases, and contributing guide
