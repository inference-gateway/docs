---
title: Voice Input (Desktop)
description: Use speech-to-text in the Desktop app - the microphone button downloads a prebuilt whisper-cli binary and model automatically on first use, no Homebrew or manual setup required.
---

# Voice Input (Desktop)

The [Desktop app](/desktop/) includes built-in voice input. Click the microphone icon in the composer and speak - your speech is transcribed locally and inserted into the message box.

Unlike the [CLI speech-to-text](/cli-speech-to-text/), the desktop app handles all setup automatically. No Homebrew, no `ffmpeg`, no manual `whisper-cpp` install.

## How it works

1. Click the microphone icon in the chat composer.
2. A confirmation prompt appears: **"Download voice support (~75 MB)? One-time setup."**
3. On approval, the app downloads a prebuilt `whisper-cli` binary and the `ggml-tiny.bin` model from the `inference-gateway/stt-binaries` release, with a progress indicator.
4. Recording starts automatically. Speak, then click the stop button or press Enter to transcribe.
5. The transcribed text is inserted into the message box, ready to review and send.

Subsequent use skips the download - the binary and model are cached locally.

## Supported platforms

| Platform      | Supported |
| ------------- | --------- |
| macOS arm64   | Yes       |
| macOS amd64   | Yes       |
| Linux amd64   | Yes       |
| Linux arm64   | Yes       |
| Windows amd64 | Yes       |
| Windows arm64 | No        |

Unsupported platforms show **"Voice input isn't available on this platform"** when you click the microphone icon.

## Download locations

The downloaded files are stored under `~/.infer/`:

| File                  | Path                                           |
| --------------------- | ---------------------------------------------- |
| `whisper-cli` binary  | `~/.infer/bin/whisper-cli` (`.exe` on Windows) |
| `ggml-tiny.bin` model | `~/.infer/models/whisper/ggml-tiny.bin`        |

These files are shared with the [CLI](/cli-speech-to-text/) - if you have already used speech-to-text in the CLI, the desktop app reuses the existing binary and model.

## Override behavior

The desktop app checks for an existing whisper binary in this order:

1. `WHISPER_BIN` environment variable - if set, points to an explicit `whisper-cli` or `whisper-cpp` executable, and the download is skipped.
2. `whisper-cli` or `whisper-cpp` on `PATH` - if found, used as-is without downloading.
3. Otherwise, the auto-download runs on first use.

## Configuration

Voice input in the desktop app is always available when supported by the platform - there is no separate feature flag or config file toggle. The download prompt appears once; after that, clicking the microphone records and transcribes immediately.

## Related

- [Desktop App](/desktop/) - overview of the desktop client
- [CLI Speech-to-Text](/cli-speech-to-text/) - speech-to-text in the `infer` CLI
- [Configuration](/configuration/) - full configuration system
- [Desktop repository](https://github.com/inference-gateway/desktop) - source, releases, and contributing guide
