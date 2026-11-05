---
title: Web Terminal
description: The Inference Gateway CLI web terminal - infer chat --web, the daemon binding that serves /terminal/, tabbed daemon sessions, the live Screen view of a session's computer-use frames, and the take-over mode where a person drives the screen directly (Take over, act, Done) while the agent is held, plus the screen_control, screen_input and screen_result protocol frames.
---

# Web Terminal

The **web terminal** is the [CLI](/cli/)'s chat TUI in a browser tab, served by [`infer daemon`](/cli/#daemon) over xterm.js. It exists so you can reach your sessions from a phone, a tablet or another machine without installing anything, and keep them running after the tab closes.

```bash
infer chat --web
```

The command starts the local daemon when none is listening, prints `http://127.0.0.1:<port>/terminal/?token=<token>` and opens it. Each tab runs one `infer chat --daemon` in a PTY on the daemon, which is the same client a terminal is. Click `+` for another tab and close one whenever you like: the session keeps running in the daemon, and `infer chat --daemon --session-id <id>` reattaches to it from a terminal.

```text
browser (xterm.js) ── /terminal/ws ──┐
                                     ├── infer daemon ── PTY: infer chat --daemon ── session worker,
desktop app, extension ── /ws ───────┘                                              or the workspace that owns the session
```

Everything the [daemon chat](/cli/#daemon) does applies to a tab, including [`/teleport <workspace>`](/cli/#workspace-kinds), which moves the tab's session to another machine or a Kubernetes pod between turns.

## Where it is served

The page lives at `/terminal/` on the daemon's [binding](/cli/#starting-the-daemon) listener, next to `/ws`, `/artifacts/` and `/a2a`, so its host, port, token and TLS are the binding's (`~/.infer/daemon.yaml`, or the `INFER_DAEMON_BINDING_*` overrides). The daemon logs the URL as `web terminal available` when it starts.

The page sends the token once, in the first frame of each tab's socket, and keeps it in the browser's session storage after the first load, so a URL without the token works in the same browser session. A socket without the token, or without a verified client certificate when the binding requires one, is closed. A browser that cannot present the client certificate `tls.mode: ca` requires is served the page but opens no tab.

### From other devices

A binding on any host but loopback must serve TLS. Point `binding.host` at `0.0.0.0` with `tls.mode: files` and a certificate, then open the URL with this machine's address:

```yaml
# ~/.infer/daemon.yaml
binding:
  enabled: true
  host: 0.0.0.0
  port: 52789
  token: <shared secret>
  tls:
    mode: files
    cert_file: ~/.infer/tls/server.crt
    key_file: ~/.infer/tls/server.key
```

The token grants every holder a shell as your user wherever the session runs, so treat it like an SSH key: keep the binding on loopback or a VPN interface, and never put it behind a proxy that strips TLS.

## The Screen view

With [Computer Use](/cli/#computer-use) streaming on (`computer_use.screenshot.streaming_enabled`), the **Screen** button shows what the tab's session sees. The daemon asks the session's worker for its latest frame and serves it at `/screen/?id=<session>`, which the page polls every two seconds.

The frame comes from wherever the session runs, so after a `/teleport` to a desktop workspace the view shows that desktop, relayed through this daemon. Nothing else needs to be installed in the browser: the Screen view is a polled image, not a remote-desktop client.

## Take-over mode

When the agent reaches a step only a person can do - a login, a two-factor code, a CAPTCHA, a cookie dialog the [judge](/cli-judge-mode/) keeps rejecting - press **Take over** in the Screen view. The image takes focus, and clicks, wheel and keys inside it drive the session's screen directly, with the poll dropping to 250 ms so typing feels live. **Done**, or `Esc` twice, hands the screen back.

| Step              | What happens                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Take over**     | The screen is claimed for you. A second claim, from another tab or viewer, is refused while you hold it                                       |
| While you hold it | The agent is held: its input actions wait for the hand-back, its observations keep working, and every client sees who drives on the run state |
| **Done**          | The screen is released and one continue message is queued, so the agent's next turn starts from a fresh screenshot of what you left behind    |

An open approval box for a `Computer` call is **resolved as rejected** by the take-over, because you are about to do that step yourself. See [Escalating a rejection](/cli-judge-mode/#escalating-a-rejection-requestapproval) for the other way an agent asks a person to step in.

### Inputs during a take-over never enter the conversation

What you type while you hold the screen is yours alone. Those inputs drive the display directly, which means they create:

- **no approval prompt** - they are not tool calls
- **no judge call** - there is nothing for a judge to decide
- **no conversation entry** - a password or a one-time code typed during a take-over never reaches the transcript, the model's context or the session history

Only the frame the agent captures after the hand-back shows what changed, so keep a credential entry off the screen the agent will screenshot next if the page echoes it back in plain text.

### Walkthrough: a browser on a remote desktop

The CLI repo's [`examples/computer-use`](https://github.com/inference-gateway/cli/tree/main/examples/computer-use) runs this end to end with Docker Compose and a mock model, so it needs no API key. Two daemons stand in for your laptop and a remote Linux desktop: `laptop` serves the web terminal, and `desktop` runs Xvfb with Chromium and Computer Use enabled, registered on the laptop as a `kind: daemon` workspace.

```bash
docker compose up --build
```

Open the laptop's terminal URL, accept its self-signed certificate, click `+` for a tab, then:

1. `/teleport desktop`. The status bar flips to `⇄ desktop` once the session lands there.
2. Click **Screen**. The view shows Chromium on the desktop container, refreshed every two seconds.
3. `browse to example.com`. The model takes a screenshot, clicks into the browser, presses `ctrl+l`, types the URL and presses `enter` - each one a `Computer` call on the desktop, with the Screen view following along.
4. The run stops at the site's cookie dialog, which the agent cannot get past. Click **Take over**, dismiss the dialog yourself in the image, then click **Done**. The agent continues from a fresh screenshot of the page you left behind.

The same example also ships a real-model variant that runs the agent in [Auto+Judge](/cli-judge-mode/) with a decision model approving each click.

## Protocol frames

Integrators that drive the screen themselves use the same frames the web terminal does, on the daemon binding, authenticated with the binding's bearer token.

Read the latest frame:

```json
{ "type": "read_frame", "project_dir": "/abs/path/to/project", "id": "<conversation id>" }
```

```json
{
  "type": "frame",
  "id": "<conversation id>",
  "frame": {
    "id": "f-1",
    "timestamp": "2026-11-04T12:00:00Z",
    "data": "<base64>",
    "width": 1280,
    "height": 800,
    "format": "jpeg"
  }
}
```

The same listener takes the take-over over `POST /screen/?id=<conversation id>`, whose body accepts `screen_control` and `screen_input`:

```json
{
  "type": "screen_control",
  "project_dir": "/abs/path/to/project",
  "id": "<conversation id>",
  "action": "take_over"
}
```

```json
{ "type": "screen_result", "id": "<request id>", "held": true }
```

| Frame            | Meaning                                                                                                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `read_frame`     | The latest frame of the screen the session's worker streams. With `project_dir` it runs on the thread of the session `id` names, relaunching that session's worker when it is not running. `error` replaces `frame` when the worker streams no screen or captured nothing yet                    |
| `screen_control` | `action: take_over` claims the screen and resolves an open `Computer` approval as rejected. A second claim while it is held errors. `action: hand_back` releases it and queues the worker's continue message                                                                                     |
| `screen_input`   | One person input in the frame space the `GET` image answers in: `{"kind": "move" \| "click" \| "double_click" \| "scroll" \| "type" \| "key", "x", "y", "text", "combo", "button", "direction", "amount"}`. It drives the display directly, with no approval, no judge and no conversation entry |
| `screen_result`  | One reply per request id, carrying `held`                                                                                                                                                                                                                                                        |

An input for a screen nobody holds errors, and the HTTP `POST` answers it with `409 Conflict`, so a stale tab cannot drive what it handed back.

## Related

- [CLI - Daemon](/cli/#daemon)
- [CLI - Computer Use](/cli/#computer-use)
- [Judge Mode](/cli-judge-mode/)
- [Desktop App](/desktop/)
