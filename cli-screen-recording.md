---
title: Screen Recording
description: Record the screen from the Inference Gateway CLI with the RecordStart and RecordStop agent tools - screen, window and region capture to H.264 MP4, configuration, approval behaviour, and the AG-UI screen_recording event.
---

# Screen Recording

The [Inference Gateway CLI](/cli/) can record the screen to an MP4 file (H.264, `yuv420p` - it plays in browsers and QuickTime) through two agent tools:

- **`RecordStart`** - begins a recording of the whole primary screen, a single window, or a region, and returns the output path and the captured rectangle. Recording continues in the background.
- **`RecordStop`** - finalizes the recording and returns the path, duration and file size.

Typical uses are an unattended audit trail of a [computer-use](/cli/#computer-use) run, and recording a tutorial or a bug reproduction while the agent drives the desktop.

> **Disabled by default.** While `computer_use.recording.enabled` is `false`, neither tool is registered, so they cost zero prompt tokens. Recording captures whatever is on your screen - that is why it is opt-in.

## Enabling

Recording lives under `recording` in `.infer/computer_use.yaml` (project) or `~/.infer/computer_use.yaml` (user). It works on its own - `computer_use.enabled` is not required.

```yaml
# .infer/computer_use.yaml
recording:
  enabled: true # register the RecordStart/RecordStop tools (default: false)
  max_duration: 120 # seconds; the recording stops and finalizes itself at this cap
  output_dir: '' # empty = ~/.infer/tmp/recordings
  framerate: 24 # frames per second
```

```bash
export INFER_COMPUTER_USE_RECORDING_ENABLED=true
```

## Configuration reference

Every key has an `INFER_COMPUTER_USE_RECORDING_`-prefixed environment variable that takes precedence over the YAML value.

| Config key                            | Environment variable                        | Type   | Default                   | Notes                                                                  |
| ------------------------------------- | ------------------------------------------- | ------ | ------------------------- | ---------------------------------------------------------------------- |
| `computer_use.recording.enabled`      | `INFER_COMPUTER_USE_RECORDING_ENABLED`      | bool   | `false`                   | Feature flag - both tools are absent from the LLM payload when `false` |
| `computer_use.recording.max_duration` | `INFER_COMPUTER_USE_RECORDING_MAX_DURATION` | int    | `120`                     | Seconds; the recording finalizes itself at the cap. Must be positive   |
| `computer_use.recording.output_dir`   | `INFER_COMPUTER_USE_RECORDING_OUTPUT_DIR`   | string | `~/.infer/tmp/recordings` | Where MP4s are written, as `<timestamp>.mp4`; created on first use     |
| `computer_use.recording.framerate`    | `INFER_COMPUTER_USE_RECORDING_FRAMERATE`    | int    | `24`                      | Capture frame rate. Must be positive                                   |

## Requirements

The recorder shells out to **ffmpeg with libx264 and the platform's screen grabber**, found on `PATH` - for example `brew install ffmpeg` (macOS) or `apt install ffmpeg` (Debian/Ubuntu). A minimal ffmpeg build without the encoder or the grabber cannot record.

| Platform    | Grabber        | Extra requirements                                                                                                                       |
| ----------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **macOS**   | `avfoundation` | Your terminal app needs **Screen Recording** permission, plus **Accessibility** for `window` mode (System Settings > Privacy & Security) |
| **Linux**   | `x11grab`      | An X11 session. Wayland is not supported yet                                                                                             |
| **Windows** | `gdigrab`      | None                                                                                                                                     |

## Capture modes

`RecordStart` takes an optional `mode`:

- `screen` (default) - the entire primary display.
- `window` - a single window, selected by `window`: `frontmost` (default), `app:<name>`, `pid:<number>`, or a bare application name. This is the same target syntax as the [`Computer` tool](/cli/#computer-use-tools).
- `region` - a rectangle, given as `region` with `x`, `y`, `width` and `height` in the frame coordinate space (the same space as `Computer` screenshots and accessibility bounding boxes).

```json
{ "mode": "screen" }
{ "mode": "window", "window": "app:Safari" }
{ "mode": "region", "region": { "x": 0, "y": 80, "width": 1280, "height": 720 } }
```

`window` mode captures the window's bounds **at the moment the recording starts**: anything drawn over that area is recorded too, and moving the window afterwards does not move the capture.

## Behaviour

`RecordStart` returns the file path and the captured rectangle and leaves ffmpeg running in the background. `RecordStop` takes no arguments and returns the path, duration and size.

- **One recording at a time, machine wide.** While ffmpeg runs, the recording holds `~/.infer/run/screen-recording.lock`. A `RecordStart` from any other `infer` process - another chat, a Desktop app session, a channel run - fails with an error naming the owning pid, and the active recording is left alone. `RecordStop` with nothing recording is an error too.
- **Self-finalizing.** A recording stops and finalizes itself at `max_duration` (120s by default); `RecordStop` still returns that file. One that stops on its own - the cap, an ffmpeg exit, or a stop from `/tasks` - queues a note asking the agent to collect it with `RecordStop`.
- **Clean exit.** On normal exit, Ctrl+C or SIGTERM the CLI finalizes an active recording and leaves no ffmpeg process behind. Call `RecordStop` in the same session; channel and scheduled runs each start a fresh process.
- **Visibility.** The chat status bar shows a `REC` badge while a recording runs, and the recording is listed in [`/tasks`](/cli/#tasks-view) under Screen Recordings as a background job of kind `recording`.
- `infer tools execute` refuses both tools.

## Approval

`RecordStart` **always requires approval**, except in auto-accept (`auto`) mode:

- In chat you get the usual approval prompt.
- In [`infer headless`](/cli/#headless-agent-stream-output) it follows [`approval_behaviour`](/cli/#approval-workflow): sent over IPC when the run has `--require-approval`, decided by the [LLM judge](/cli-judge-mode/) in `auto-with-judge` mode, otherwise blocked.

`RecordStop` follows [`computer_use.approval`](/cli/#computer-use-approval): under `never` (the default) and `destructive` it runs without a prompt - it counts as an observation - and only `always` asks.

## Headless and AG-UI hosts

A running recording is a background job, so `infer headless` **waits for it** (up to `a2a.task.agent_mode_max_wait_seconds`, 300s by default) instead of exiting and cutting it short.

How the stop request reaches the recording depends on the caller:

- **Desktop app and other stdin hosts** send a `user_message` line on stdin, which reaches `RecordStop` in the same process.
- **Channel, scheduled and heartbeat runs** do not forward follow-up messages into a running process, so there a recording runs until `max_duration` and the agent collects the file afterwards.

With `--format ag-ui` (the format the [desktop app](/desktop/) consumes):

| Event                                                                                         | Payload                                                                                |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `CUSTOM` event `screen_recording` - on `RecordStart`, `RecordStop`, or the `max_duration` cap | `{ "active": true }` / `{ "active": false }`                                           |
| `CUSTOM` event `background_tasks`                                                             | The recording appears among `jobs` with kind `recording`                               |
| `approval_request`                                                                            | `RecordStart` when the run has `--require-approval`; without an approver it is blocked |

A recording still running when the run ends is finalized **after** the terminal event, so no `screen_recording` event with `active: false` follows it - clear the indicator on `RUN_FINISHED` or `RUN_ERROR`.
