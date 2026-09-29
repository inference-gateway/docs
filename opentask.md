---
title: OpenTask
description: A browser extension that makes repo skills and bot directives discoverable inside GitHub's issue and PR comment box, records a tab so the agent can distill the flow into a skill, and bridges the Inference Gateway CLI to your real browser. Chrome-first, portable to Edge, Firefox, and Safari.
---

# OpenTask

**OpenTask** is a Manifest V3 browser extension that brings your repo's [Agent Skills](/skills/) and common bot directives right into GitHub's issue and PR comment box. Type `!` to open a fuzzy-filtered dropdown of the current repo's skills, or press `Ctrl/Cmd+Shift+P` to open a searchable palette of `@opentask` directives and editable templates.

It is built Chrome-first but deliberately portable to Edge, Firefox, and Safari. Source and releases live at [github.com/inference-gateway/opentask](https://github.com/inference-gateway/opentask).

## Installation

Download the `browser-extension.zip` from the [latest release](https://github.com/inference-gateway/opentask/releases), extract it, then:

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `dist/` folder inside the extracted ZIP.

## Usage

- **Skills**: type `!` at the start of a word in a comment box to open the skill dropdown. Arrow keys navigate, `Tab`/`Enter` inserts, `Esc` closes.
- **Quick prompts**: press `Ctrl/Cmd+Shift+P` (or click the toolbar button) to open the palette, filter, and insert a template at the caret.
- **Install the agent**: navigate to any GitHub repo and click the **Tasks** tab in the repo navigation bar to install the OpenTask Agent workflow via a pull request. The language toggle there (Go, Rust, Node/TypeScript, Python) maps to the `languages` input on the action.
- **Manage skills**: the **Skills** tab shows a searchable, multi-select list of the [skills registry](https://github.com/inference-gateway/skills). Check skills to install and uncheck to remove, then click **Apply** to open a PR.
- **Select agents**: the **Agents** tab lists available A2A agents from the [agents registry](https://github.com/inference-gateway/agents). Check the ones to include in the workflow, then re-install to bake them in.
- **Init a project**: the **Init** tab dispatches the workflow to scaffold an `AGENTS.md` for the repo and open a PR.
- **Record a workflow to turn into a skill**: click **Record tab** in the popup or side panel (Chrome and Edge only), perform the flow in the tab, then stop - or let it hard-stop at the cap. The file lands in Downloads as `opentask-recording-*.mp4`; attach it to a task or issue and the agent inspects the frames and proposes the skill via PR. See [Tab recording](#tab-recording).

## Tab recording

Instead of writing a skill by hand, you can **demonstrate** it. The **Record tab** control captures the active tab at 10 fps into an `opentask-recording-*.mp4` file (webm fallback where mp4 muxing is unavailable), saved through the browser's download flow. Chrome shows its own recording indicator on the captured tab, and the control shows elapsed and remaining time while recording.

The loop:

1. **Record** the flow you want to teach.
2. **Attach** the saved file to a task or issue. The capture bitrate is derived from the cap so the file stays under GitHub's 10 MB attachment limit.
3. **Review the PR**: the agent inspects the frames and proposes the skill under [`.agents/skills/<name>/`](/cli-skills/#on-disk-layout) via a pull request.

Settings live under **Options -> Orchestrator -> Tab recording**:

- **Recording cap (seconds)** - the hard stop for a recording (default 60, bounded to 5-300).

Audio capture and automatic upload of the recording are deliberately out of scope. Recording needs the `tabCapture`, `offscreen`, and `downloads` permissions, which only the Chrome and Edge builds request; on Firefox and Safari the control hides itself. Nothing on the gateway, CLI, or SDK side is involved - the capture never leaves your machine until you attach it yourself. Full details are in the extension's [Tab recording](https://github.com/inference-gateway/opentask#tab-recording) README section.

## Configuration

Right-click the extension icon and select **Options** (or navigate to the extension's details page and click _Extension options_). From there you can:

- **Accounts** - manage per-owner PATs and optional GitHub App bot configurations.
- **Quick prompts** - edit the JSON array of `{ id, label, description, insert }` templates shown in the palette.
- **Install models** - configure the model dropdown in the Tasks tab.
- **Permissions** - control what the agent may do at runtime (create PRs, issues, comments).
- **Workflow** - set the per-run job timeout (default 25 minutes).
- **Plugins** - toggle optional [infer-action](https://github.com/inference-gateway/infer-action) plugins.
- **Tab recording** - set the recording cap under the **Orchestrator** tab (see [Tab recording](#tab-recording)).
- **Self-hosted GPU models** - provision a [RunPod](https://runpod.io) GPU running llama.cpp from the extension popup.

## CLI bridge protocol

The [Inference Gateway CLI](/cli/) can drive **your real browser** through OpenTask instead of a Playwright-launched one, and mirror the chat conversation into the extension sidepanel. The rest of this page is the wire contract the extension implements.

> **Note:** Every frame is a single JSON text message with a `type` discriminator. Unknown `type` values are ignored on both sides, so the protocol is forward-compatible by contract.

### Connecting to the daemon

The extension connects to [`infer daemon`](/cli/#daemon) - the one hub that also serves the [desktop app](/desktop/) and the messaging channels. The daemon is the only process that binds the extension port, so there is no host to pick and no port to hand back and forth: whether you chat in the terminal or in the desktop app, the browser is driven through the same connection.

1. Start the daemon (or the desktop app, which starts it for you):

   ```bash
   infer daemon
   ```

2. Read the **port** and **token** from `~/.infer/browser_use.yaml` (the desktop app shows both with **Copy** buttons under **Settings -> General -> Browser Use**):

   ```yaml
   # ~/.infer/browser_use.yaml
   enabled: true
   backend: extension
   extension:
     port: 52789
     token: <shared secret; infer init seeds one>
   ```

3. Paste both into the extension options.

The panel then lists the daemon's threads - a thread is a project directory plus a conversation - and shows the live stream of whichever one you open. A standalone `infer chat` or `infer headless` with `backend: extension` reaches the browser as another daemon client (`client: "browser"` in the handshake) and starts `infer daemon` itself on the first browser call when none is running. The daemon needs the port to be free - if another process holds it, the daemon's boot fails with the port named rather than retrying.

### Transport

- The daemon listens on `ws://127.0.0.1:<port>/ws` (default port `52789`, `browser_use.yaml` -> `extension.port`). The extension dials in, because MV3 service workers cannot listen.
- Auth is a shared token (`extension.token` in `browser_use.yaml`, copied into the extension options). Browser WebSocket clients cannot set headers, so the token rides in the first message.
- One extension connection at a time; a newly authenticated connection replaces the previous one (service workers restart at will). The daemon sends WebSocket pings every ~20s to keep the service worker alive.
- Only `chrome-extension://`, `moz-extension://`, `safari-web-extension://` (or absent) `Origin` headers are accepted.
- Connects, disconnects and routing errors land in the [daemon log](/cli/#the-daemon-log).

### Handshake

Extension -> daemon, first frame, within 5 seconds of connecting:

```json
{
  "type": "browser_hello",
  "token": "<shared secret>",
  "client": "extension",
  "extension_version": "1.9.2",
  "protocol_version": 1
}
```

Daemon -> extension on success (on failure the socket is closed):

```json
{ "type": "browser_hello_ack", "protocol_version": 1 }
```

- `client` tells the daemon which kind of client this is (`extension` here, `desktop` for the app, `browser` for a CLI process that only needs the browser). An absent or unknown value counts as `extension`. One extension connection is kept, any number of `desktop` and `browser` ones.
- `protocol_version` is negotiated leniently: any valid-token hello is accepted, a hello without a version is logged as a warning, and a version the extension does not support surfaces as an "update" state in the panel instead of a closed socket.
- Nothing is pushed automatically after the handshake - the panel asks for what it needs.

### Events

Past the handshake the socket carries the [shared event stream](/cli/#shared-event-stream): AG-UI events out with an uppercase `type`, app frames in with a lowercase `type`, both bare - there is no `chat_event` envelope and no dialect of its own. The same frames travel on a session worker's stdio, so the panel and the desktop app decode one vocabulary. The per-event reference is in the CLI's [`docs/ag-ui-output.md`](https://github.com/inference-gateway/cli/blob/main/docs/ag-ui-output.md).

The browser frames below are the part specific to this transport.

### Browser commands (daemon -> extension)

One shape, six actions; only the fields relevant to the action are set. `timeout_ms` is the per-action budget the extension must enforce.

```json
{"type": "browser_command", "id": "<uuid>", "action": "navigate",   "url": "https://example.com", "timeout_ms": 30000}
{"type": "browser_command", "id": "<uuid>", "action": "click",      "selector": "button.submit", "timeout_ms": 30000}
{"type": "browser_command", "id": "<uuid>", "action": "type",       "selector": "input[name=q]", "text": "hello", "press_enter": true, "timeout_ms": 30000}
{"type": "browser_command", "id": "<uuid>", "action": "read",       "selector": "", "timeout_ms": 30000}
{"type": "browser_command", "id": "<uuid>", "action": "screenshot", "timeout_ms": 30000}
{"type": "browser_command", "id": "<uuid>", "action": "tabs",       "timeout_ms": 30000}
```

- `navigate` - open the URL in the controlled tab. The extension chooses and owns the controlled tab; the protocol has no tab id.
- `click` - `document.querySelector(selector).click()` semantics.
- `type` - replace the element's value with `text`, dispatch `input`/`change`, then a keyboard Enter when `press_enter` is true.
- `read` - `innerText` of the selector (an empty selector means `body`). Secrets must be redacted: the extension never returns the value of password, `current-password`/`new-password`/`one-time-code` autocomplete, or otherwise secret-looking inputs.
- `screenshot` - capture the visible controlled tab and return it base64-encoded in the result's `image` field.
- `tabs` - enumerate the open tabs and return them in the result's `tabs` array, flagging the controlled/active one.

Extension -> daemon, exactly one result per command id:

```json
{"type": "browser_result", "id": "<uuid>", "url": "https://example.com/", "title": "Example", "content": "...", "events": [], "error": ""}
{"type": "browser_result", "id": "<uuid>", "image": "<base64>", "image_mime_type": "image/png", "url": "...", "title": "..."}
{"type": "browser_result", "id": "<uuid>", "tabs": [{"index": 0, "url": "...", "title": "...", "active": true}]}
```

- `error != ""` means the command failed; other fields may be empty.
- `content` is only meaningful for `read`, `image`/`image_mime_type` for `screenshot`, `tabs` for `tabs`. `events` carries optional browser-initiated notices (console lines and similar) and may always be empty.
- `url`/`title` reflect the controlled tab after the action.

One browser serves everyone, so the daemon serializes every command it receives - from its session workers, from the desktop app and from `browser` clients - and returns each answer to whoever asked, by `id`. A `browser_command` a `desktop` or `browser` client posts on the socket is answered only on that connection. A standalone [`infer headless --serve`](/cli/#serve-worker---serve) worker binds no port either: it writes the same `browser_command` line on **stdout** and waits for the matching `browser_result` line on **stdin**, so whoever owns the subprocess relays both frames to the extension. When no extension is connected the browser tools fail with `no browser extension connected on port <port>`, and every client learns about it from the CUSTOM `browser_extension_status` event. A client pauses and resumes the agent's browsing with `{"type": "browser_use_control", "action": "pause"}`, answered with CUSTOM `browser_use_paused` / `browser_use_resumed` - the same shape as the computer-use pair.

### Threads, conversations and resume

The panel drives which thread it shows. The daemon does **not** auto-send a snapshot on connect - the panel lists and resumes conversations explicitly, scoped to a project directory.

Extension -> daemon, list the stored conversations (the same ones `infer` resumes from, under `~/.infer/projects/<project-slug>/conversations/` with the default JSONL backend):

```json
{ "type": "list_conversations", "project_dir": "/home/me/code/my-app" }
```

Daemon -> extension, newest-first (sorted by `updated_at` descending):

```json
{
  "type": "conversations",
  "conversations": [
    {
      "id": "<uuid>",
      "title": "...",
      "updated_at": "2026-08-16T12:00:00Z",
      "message_count": 12
    }
  ]
}
```

- `title` is the conversation's title (an auto-derived first-message preview until a better one is generated), `updated_at` is RFC 3339, and `message_count` is the number of stored messages.
- The array is empty when the daemon runs without conversation persistence (`storage.enabled: false`).

Extension -> daemon, open a thread on one of them (`new_session` starts a fresh conversation in the same shape, and both take the thread options - model, agent mode, prompt overrides, sandbox directories, max turns):

```json
{ "type": "resume_conversation", "project_dir": "/home/me/code/my-app", "id": "<uuid>" }
```

Daemon -> extension, the thread's history as an [AG-UI](https://docs.ag-ui.com/) event rather than a bespoke snapshot frame:

```json
{ "type": "MESSAGES_SNAPSHOT", "messages": [{ "role": "user", "content": "..." }] }
```

- An unknown or empty `id` is ignored and no snapshot is sent.
- After the snapshot the thread's live events arrive on the same socket. Each turn is one run, `RUN_STARTED` through `RUN_FINISHED` or `RUN_ERROR`, so the panel reads busy state off the run instead of guessing from message and tool events.

Extension -> daemon, to send a user message into the thread (queued if the agent is busy, exactly like typing in the TUI):

```json
{ "type": "user_message", "content": "please also check the docs page" }
```

Extension -> daemon, to stop the turn currently streaming (same as `esc` in the TUI; a no-op when nothing is running):

```json
{ "type": "interrupt" }
```

A stopped turn - from the panel or from the terminal (`esc`/Ctrl+C) - ends with `RUN_FINISHED` carrying outcome `cancelled`, which is how the panel clears its working state even when the cancel happened mid tool call.

### Skills

The panel offers a `/` autocomplete of the agent's [skills](/cli-skills/). It asks the daemon for the merged, scope-tagged list the CLI already resolves (project, `.agents`, user, plugin, catalog), so the menu mirrors what the TUI offers.

Extension -> daemon, list the available skills for a project:

```json
{ "type": "list_skills", "project_dir": "/home/me/code/my-app" }
```

Daemon -> extension, the discovered skills (empty when skills are unavailable):

```json
{
  "type": "skills",
  "skills": [{ "name": "tmux", "description": "...", "scope": "user" }]
}
```

- `name` is the qualified skill name (`pluginName:skillName` for plugin skills).
- `scope` is one of `project`, `agents`, `user`, `plugin`, `catalog`. Name conflicts are already resolved by precedence, so each name appears once. Unknown scopes are ignored by the extension.

### Artifacts (generated images)

Chat text can reference files the agent saved under the artifacts dir (`~/.infer/projects/<project-slug>/artifacts/<...>`, for example `ImageGeneration` output). An MV3 extension cannot load a local file path in `<img>`, so the extension rewrites a markdown image whose URL contains `/artifacts/` to an HTTP route on the bridge (stripping the prefix through and including `artifacts/`):

```text
GET http://127.0.0.1:<port>/artifacts/<relative-path>
```

The daemon does not serve that route yet, so it answers 404 and generated images do not render in the panel. One daemon serves many projects and the route names none, so it cannot pick an artifacts dir; a per-project form is planned. Only `infer chat`'s own binding, which is scoped to a single project, serves the directory today.

### Tool approvals

Approvals use the one contract every client shares, keyed by `tool_call_id`. The daemon sends a CUSTOM `approval_request` to each client of the thread, the extension shows Approve/Deny, and the decision goes back as an app frame. The same decision can still be made in the terminal or in the desktop app - whichever answers first wins, and the others get `approval_resolved` for the same id.

Daemon -> extension, one per pending tool call:

```json
{
  "type": "CUSTOM",
  "name": "approval_request",
  "value": {
    "tool_call_id": "call-1",
    "tool_name": "Bash",
    "tool_args": "{\"command\":\"ls\"}"
  }
}
```

- `tool_args` is the raw tool-call arguments JSON string and may be empty.

Extension -> daemon, the user's decision:

```json
{ "type": "approval_response", "tool_call_id": "call-1", "approved": true, "scope": "once" }
```

- `approved` is the decision; a missing or unparsable frame is ignored, so a rejection has to say so explicitly.
- `scope` widens the decision beyond this single call when the client offers it.

Daemon -> the thread's other clients, when the request is no longer pending:

```json
{ "type": "CUSTOM", "name": "approval_resolved", "value": { "tool_call_id": "call-1" } }
```

- A `tool_call_id` the extension does not recognize (already cleared, or never seen) is ignored. Duplicate `approval_resolved` events for the same id are fine.
- An `approval_response` for an unknown or already-answered `tool_call_id` is ignored by the daemon.

### Frame reference

Browser and session frames specific to this transport; the AG-UI and CUSTOM events both directions share are listed under [shared event stream](/cli/#shared-event-stream).

| Frame                                 | Direction     | Purpose                                                       |
| ------------------------------------- | ------------- | ------------------------------------------------------------- |
| `browser_hello`                       | ext -> daemon | Handshake with the shared token, `client`, `protocol_version` |
| `browser_hello_ack`                   | daemon -> ext | Handshake accepted, carries `protocol_version`                |
| `browser_command`                     | daemon -> ext | Navigate, click, type, read, screenshot, tabs                 |
| `browser_result`                      | ext -> daemon | One result per command id                                     |
| `browser_use_control`                 | ext -> daemon | Pause or resume the agent's browsing                          |
| `list_conversations`                  | ext -> daemon | Ask for a project's stored conversations                      |
| `conversations`                       | daemon -> ext | Conversation list, newest-first                               |
| `new_session` / `resume_conversation` | ext -> daemon | Open a thread, answered with `MESSAGES_SNAPSHOT`              |
| `user_message`                        | ext -> daemon | Send a user message into the thread                           |
| `interrupt`                           | ext -> daemon | Stop the turn currently streaming                             |
| `approval_response`                   | ext -> daemon | Approve or reject a pending tool call                         |
| `list_skills`                         | ext -> daemon | Ask for a project's available skills                          |
| `skills`                              | daemon -> ext | Skill list with `name`, `description`, `scope`                |

## Related

- [CLI daemon](/cli/#daemon) - the hub on the other end of the socket
- [Desktop App](/desktop/#browser-use-opentask-extension) - the other daemon client, enabled from Settings
- [Skills Catalog](/skills/) - the skills registry OpenTask discovers
- [CLI Skills](/cli-skills/) - using skills from the Inference Gateway CLI
- [Repository](https://github.com/inference-gateway/opentask) - source, issues, and releases
