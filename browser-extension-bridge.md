---
title: Browser Extension Bridge
description: The WebSocket wire contract between the Inference Gateway CLI and the OpenTask browser extension - browser control, conversation list and resume, skills, artifacts, and tool approvals.
---

# Browser Extension Bridge

The [Inference Gateway CLI](/cli/) can drive **your real browser** through the [OpenTask extension](/opentask/) instead of a Playwright-launched one, and mirror the chat conversation into the extension sidepanel. This page is the wire contract the extension implements.

> **Note:** Every frame is a single JSON text message with a `type` discriminator. Unknown `type` values are ignored on both sides, so the protocol is forward-compatible by contract - there is no protocol version to negotiate.

## Transport

- The CLI listens on `ws://127.0.0.1:<port>/ws` (default port `52789`, `browser_use.yaml` -> `extension.port`). The extension dials in, because MV3 service workers cannot listen.
- Auth is a shared token (`extension.token` in `browser_use.yaml`, copied into the extension options). Browser WebSocket clients cannot set headers, so the token rides in the first message.
- One extension connection at a time; a newly authenticated connection replaces the previous one (service workers restart at will). The CLI sends WebSocket pings every ~20s to keep the service worker alive.
- Only `chrome-extension://`, `moz-extension://`, `safari-web-extension://` (or absent) `Origin` headers are accepted.

Enable with:

```yaml
# ~/.infer/browser_use.yaml
enabled: true
backend: extension
extension:
  port: 52789
  token: <shared secret; infer init seeds one>
```

## Handshake

Extension -> CLI, first frame, within 5 seconds of connecting:

```json
{ "type": "browser_hello", "token": "<shared secret>", "extension_version": "1.9.2" }
```

CLI -> extension on success (on failure the socket is closed):

```json
{ "type": "browser_hello_ack" }
```

The ack carries no fields. Nothing is pushed automatically after the handshake - the panel asks for what it needs.

## Browser commands (CLI -> extension)

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

Extension -> CLI, exactly one result per command id:

```json
{"type": "browser_result", "id": "<uuid>", "url": "https://example.com/", "title": "Example", "content": "...", "events": [], "error": ""}
{"type": "browser_result", "id": "<uuid>", "image": "<base64>", "image_mime_type": "image/png", "url": "...", "title": "..."}
{"type": "browser_result", "id": "<uuid>", "tabs": [{"index": 0, "url": "...", "title": "...", "active": true}]}
```

- `error != ""` means the command failed; other fields may be empty.
- `content` is only meaningful for `read`, `image`/`image_mime_type` for `screenshot`, `tabs` for `tabs`. `events` carries optional browser-initiated notices (console lines and similar) and may always be empty.
- `url`/`title` reflect the controlled tab after the action.

## Conversation list and resume

The panel drives which conversation it shows. The CLI does **not** auto-send a snapshot on connect - the panel lists and resumes conversations explicitly.

Extension -> CLI, list the stored conversations (the same ones `infer` resumes from, under `.infer/conversations`):

```json
{ "type": "list_conversations" }
```

CLI -> extension, newest-first (sorted by `updated_at` descending):

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
- The array is empty when the CLI runs without conversation persistence (`storage.enabled: false`).

Extension -> CLI, resume one, which makes it the active conversation:

```json
{ "type": "resume_conversation", "id": "<uuid>" }
```

CLI -> extension, the resumed conversation's history:

```json
{
  "type": "conversation_snapshot",
  "messages": [{ "role": "user", "content": "..." }]
}
```

- `messages` are the gateway SDK message objects of the resumed conversation.
- An unknown or empty `id` is ignored and no snapshot is sent.

After the snapshot the CLI streams live chat activity for the active conversation, one frame per [AG-UI](https://docs.ag-ui.com/) event (the same encoding as `infer headless --output ag-ui`):

```json
{ "type": "chat_event", "event": { "type": "TEXT_MESSAGE_CONTENT", "delta": "..." } }
```

The extension renders these however it likes; ignoring event types it does not understand is expected.

Extension -> CLI, to send a user message into the conversation (queued if the agent is busy, exactly like typing in the TUI):

```json
{ "type": "user_message", "content": "please also check the docs page" }
```

## Skills

The panel offers a `/` autocomplete of the agent's [skills](/cli-skills/). It asks the CLI for the merged, scope-tagged list the CLI already resolves (project, `.agents`, user, plugin, catalog), so the menu mirrors what the TUI offers.

Extension -> CLI, list the available skills:

```json
{ "type": "list_skills" }
```

CLI -> extension, the discovered skills (empty when skills are unavailable):

```json
{
  "type": "skills",
  "skills": [{ "name": "tmux", "description": "...", "scope": "user" }]
}
```

- `name` is the qualified skill name (`pluginName:skillName` for plugin skills).
- `scope` is one of `project`, `agents`, `user`, `plugin`, `catalog`. Name conflicts are already resolved by precedence, so each name appears once. Unknown scopes are ignored by the extension.

## Artifacts (generated images)

Chat text can reference files the agent saved under the artifacts dir (`~/.infer/artifacts/<...>`, for example `ImageGeneration` output). An MV3 extension cannot load a local file path in `<img>`, so alongside `/ws` the CLI serves that directory read-only over HTTP:

```text
GET http://127.0.0.1:<port>/artifacts/<relative-path>
```

The extension rewrites a markdown image whose URL contains `/.infer/artifacts/` to this route (stripping the prefix through and including `artifacts/`) and renders it inline. The route is loopback-only and unauthenticated, since the artifacts are your own generated files; path traversal is blocked.

## Tool approvals

When a tool call needs approval, the CLI sends an approval request instead of mirroring it as a chat line. The extension shows Approve/Deny and sends the decision back. The same decision can still be made in the terminal - whichever answers first wins, and the loser is a harmless no-op.

CLI -> extension, one per pending tool call:

```json
{
  "type": "approval_request",
  "request_id": "<uuid>",
  "tool_name": "Bash",
  "tool_args": "{\"command\":\"ls\"}"
}
```

- `tool_args` is the raw tool-call arguments JSON string and may be empty.

Extension -> CLI, the user's decision:

```json
{ "type": "approval_response", "request_id": "<uuid>", "action": "approve" }
```

- `action` is `"approve"` or `"reject"`. Any other value, including unknown future actions, is treated as `reject`, failing safe.

CLI -> extension, when the request is no longer pending (answered in the panel **or** in the terminal) so the extension can clear its prompt:

```json
{ "type": "approval_resolved", "request_id": "<uuid>" }
```

- A `request_id` the extension does not recognize (already cleared, or never seen) is ignored. Duplicate `approval_resolved` frames for the same id are fine.
- An `approval_response` for an unknown or already-answered `request_id` is ignored by the CLI.

## Frame reference

| Frame                   | Direction  | Purpose                                        |
| ----------------------- | ---------- | ---------------------------------------------- |
| `browser_hello`         | ext -> CLI | Handshake with the shared token                |
| `browser_hello_ack`     | CLI -> ext | Handshake accepted (no fields)                 |
| `browser_command`       | CLI -> ext | Navigate, click, type, read, screenshot, tabs  |
| `browser_result`        | ext -> CLI | One result per command id                      |
| `list_conversations`    | ext -> CLI | Ask for the stored conversations               |
| `conversations`         | CLI -> ext | Conversation list, newest-first                |
| `resume_conversation`   | ext -> CLI | Make a conversation active                     |
| `conversation_snapshot` | CLI -> ext | History of the resumed conversation            |
| `chat_event`            | CLI -> ext | Live AG-UI event for the active conversation   |
| `user_message`          | ext -> CLI | Send a user message into the conversation      |
| `list_skills`           | ext -> CLI | Ask for the available skills                   |
| `skills`                | CLI -> ext | Skill list with `name`, `description`, `scope` |
| `approval_request`      | CLI -> ext | A tool call is waiting for approval            |
| `approval_response`     | ext -> CLI | Approve or reject a pending tool call          |
| `approval_resolved`     | CLI -> ext | The request is no longer pending               |

## Related

- [CLI](/cli/) - the agent on the other end of the bridge
- [OpenTask Extension](/opentask/) - the browser extension itself
- [Agent Skills](/cli-skills/) - what `list_skills` surfaces
