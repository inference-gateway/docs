---
title: Speech-to-Text (Whisper)
description: Transcribe speech to text in the Inference Gateway CLI with local whisper.cpp - use the /voice chat shortcut to dictate prompts and have inbound Telegram voice messages transcribed automatically, fully offline.
---

# Speech-to-Text (Whisper)

The [Inference Gateway CLI](/cli/) can turn speech into text in two places:

- **Chat mode** - the [`/voice`](#using-voice-in-chat) shortcut records your microphone, transcribes it, and drops the text into the input field.
- **Channels mode** - inbound [Telegram voice messages](#telegram-voice-messages) are transcribed to text before the agent sees them, so you can talk to the agent from your phone.

Both use a local [whisper.cpp](https://github.com/ggml-org/whisper.cpp) binary and run fully offline once the model is downloaded. The feature is **disabled by default** because the model download can take time and the runtime depends on external tools.

> **Note:** Speech-to-text shells out to `whisper.cpp` and `ffmpeg` - no CGO is added to the `infer` binary. When a required tool is missing, the CLI reports an actionable error naming what to install; it never fails silently.

## Prerequisites

Speech-to-text relies on two external programs:

| Tool                             | Used for                                                         | Install                                                                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `whisper-cli` (or `whisper-cpp`) | Transcription                                                    | macOS: `brew install whisper-cpp` - Nix: `nix profile install nixpkgs#openai-whisper-cpp` - or build from [whisper.cpp](https://github.com/ggml-org/whisper.cpp) |
| `ffmpeg`                         | Microphone capture and decoding voice messages (OGG/Opus to WAV) | macOS: `brew install ffmpeg` - Debian/Ubuntu: `apt install ffmpeg`                                                                                               |

On Linux, `arecord` (ALSA) or `sox` can substitute for `ffmpeg` for microphone capture. See [Platform notes](#platform-notes) for details.

## Enabling

Add a `speech_to_text` section to `.infer/config.yaml` (project) or `~/.infer/config.yaml` (user):

```yaml
speech_to_text:
  enabled: true # feature flag (default: false)
  engine: whisper.cpp # transcription engine
  model: tiny # tiny | base | small | medium | large-v3-turbo | *.en (default: tiny)
  language: '' # ISO code (e.g. "en"); empty = auto-detect
  auto_download: true # download the model on first use if missing
  max_recording_seconds: 30 # /voice hard recording cap
  silence_timeout: 2 # stop /voice this many seconds after you go quiet (0 = record full cap)
  # Optional overrides:
  binary_path: '' # explicit whisper-cli/whisper-cpp path; empty = resolve on PATH
  ffmpeg_path: '' # explicit ffmpeg path; empty = resolve on PATH
  models_dir: '' # where models are cached; empty = ~/.infer/models/whisper
  input_device: '' # microphone device; empty = platform default
  timeout: 120 # transcription timeout (seconds)
```

Every field can also be set via an `INFER_SPEECH_TO_TEXT_*` environment variable - see [Environment variables](#environment-variables).

## Configuration reference

All options live under `speech_to_text` in `.infer/config.yaml`:

| Key                                    | Type   | Default       | Description                                                                              |
| -------------------------------------- | ------ | ------------- | ---------------------------------------------------------------------------------------- |
| `speech_to_text.enabled`               | bool   | `false`       | Feature flag - must be `true` to enable `/voice` and Telegram voice transcription        |
| `speech_to_text.engine`                | string | `whisper.cpp` | Transcription engine                                                                     |
| `speech_to_text.binary_path`           | string | `""`          | Explicit `whisper-cli`/`whisper-cpp` path; empty resolves the binary on `PATH`           |
| `speech_to_text.model`                 | string | `tiny`        | Model to use: `tiny`, `base`, `small`, `medium`, `large-v3-turbo`, or an `.en` variant   |
| `speech_to_text.models_dir`            | string | `""`          | Where models are cached; empty defaults to `~/.infer/models/whisper`                     |
| `speech_to_text.language`              | string | `""`          | ISO language code (e.g. `en`); empty auto-detects                                        |
| `speech_to_text.auto_download`         | bool   | `true`        | Download the model on first use if it is missing                                         |
| `speech_to_text.timeout`               | int    | `120`         | Transcription timeout in seconds                                                         |
| `speech_to_text.max_recording_seconds` | int    | `30`          | Hard cap on `/voice` recording length in seconds                                         |
| `speech_to_text.silence_timeout`       | int    | `2`           | Stop `/voice` this many seconds after the speaker goes quiet (`0` = record the full cap) |
| `speech_to_text.ffmpeg_path`           | string | `""`          | Explicit `ffmpeg` path; empty resolves `ffmpeg` on `PATH`                                |
| `speech_to_text.input_device`          | string | `""`          | Microphone device; empty uses the system default, an index overrides it                  |

## Environment variables

Every YAML key has an `INFER_SPEECH_TO_TEXT_`-prefixed environment variable that takes precedence over the config file.

| Variable                                     | Maps to                                |
| -------------------------------------------- | -------------------------------------- |
| `INFER_SPEECH_TO_TEXT_ENABLED`               | `speech_to_text.enabled`               |
| `INFER_SPEECH_TO_TEXT_ENGINE`                | `speech_to_text.engine`                |
| `INFER_SPEECH_TO_TEXT_BINARY_PATH`           | `speech_to_text.binary_path`           |
| `INFER_SPEECH_TO_TEXT_MODEL`                 | `speech_to_text.model`                 |
| `INFER_SPEECH_TO_TEXT_MODELS_DIR`            | `speech_to_text.models_dir`            |
| `INFER_SPEECH_TO_TEXT_LANGUAGE`              | `speech_to_text.language`              |
| `INFER_SPEECH_TO_TEXT_AUTO_DOWNLOAD`         | `speech_to_text.auto_download`         |
| `INFER_SPEECH_TO_TEXT_TIMEOUT`               | `speech_to_text.timeout`               |
| `INFER_SPEECH_TO_TEXT_MAX_RECORDING_SECONDS` | `speech_to_text.max_recording_seconds` |
| `INFER_SPEECH_TO_TEXT_SILENCE_TIMEOUT`       | `speech_to_text.silence_timeout`       |
| `INFER_SPEECH_TO_TEXT_FFMPEG_PATH`           | `speech_to_text.ffmpeg_path`           |
| `INFER_SPEECH_TO_TEXT_INPUT_DEVICE`          | `speech_to_text.input_device`          |

For example:

```bash
export INFER_SPEECH_TO_TEXT_ENABLED=true
export INFER_SPEECH_TO_TEXT_MODEL=base
```

## Choosing a model

The GGML model is downloaded on first use from [`huggingface.co/ggerganov/whisper.cpp`](https://huggingface.co/ggerganov/whisper.cpp) and cached under `~/.infer/models/whisper/` (e.g. `ggml-tiny.bin`). Larger models are more accurate but slower and heavier:

| Model            | Size    | Notes                              |
| ---------------- | ------- | ---------------------------------- |
| `tiny`           | ~75 MB  | Fastest, lowest accuracy (default) |
| `base`           | ~142 MB | Good balance                       |
| `small`          | ~466 MB | More accurate                      |
| `medium`         | ~1.5 GB | High accuracy                      |
| `large-v3-turbo` | ~1.5 GB | Best accuracy, optimized speed     |

Append `.en` (e.g. `base.en`) for English-only variants. You can also pass a full filename (`ggml-small.bin`), or place a model in `models_dir` manually and set `auto_download: false` to skip the download.

## Using `/voice` in chat

The `/voice` shortcut records audio from your microphone, transcribes it locally, and places the text into the input field - ready to review and send. It only appears when `speech_to_text.enabled` is `true`.

1. Type `/voice` and press Enter - recording starts immediately.
2. Speak. Recording stops automatically about `silence_timeout` seconds after you go quiet, at the `max_recording_seconds` cap, or when you pass a per-call override like `/voice 8`. Set `silence_timeout: 0` to always record the full cap instead.
3. Review and edit the transcription in the input field, then press Enter to send.

Under the hood, `/voice` shells out to `ffmpeg` (or `arecord`/`sox` on Linux) to capture 16 kHz mono audio, then to the `whisper-cli`/`whisper-cpp` binary to transcribe it. The first run downloads the model; subsequent runs use the cache. See the [Shortcuts](/cli/#shortcuts) section of the CLI docs for the full shortcut list.

## Telegram voice messages

When `speech_to_text.enabled` is set and you run `infer channels-manager`, voice notes sent to your Telegram bot are downloaded, decoded with `ffmpeg` (OGG/Opus to WAV), transcribed, and forwarded to the agent as text - so you can talk to the agent from your phone.

When speech-to-text is **disabled**, inbound voice messages are ignored (the previous behavior). Text and image messages are unaffected either way. See [Channels](/cli-channels/) for Telegram setup and access control.

## Platform notes

Microphone capture is platform-specific. The defaults work out of the box on most systems; override `input_device` only when you need a non-default microphone.

### macOS

`ffmpeg` captures audio through `avfoundation`. With `input_device` empty, the system default microphone is used. To target a specific device, list the available inputs and set `input_device` to the index:

```bash
ffmpeg -f avfoundation -list_devices true -i ""
```

Grant microphone permission to your terminal (System Settings - Privacy & Security - Microphone), otherwise capture produces silence.

### Linux

`ffmpeg` captures through ALSA or PulseAudio. If `ffmpeg` microphone capture is unavailable on your system, install `arecord` (ALSA) or `sox` as a fallback - the CLI will use whichever capture tool it finds. Install the decoder/encoder with your package manager, e.g. `apt install ffmpeg`.

## Troubleshooting

| Symptom                    | What to check                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `whisper binary not found` | Install whisper.cpp, or set `speech_to_text.binary_path` to the `whisper-cli`/`whisper-cpp` executable                                                  |
| `ffmpeg not found`         | Install ffmpeg, or set `speech_to_text.ffmpeg_path`                                                                                                     |
| No audio captured on macOS | Grant microphone permission to your terminal, list devices with `ffmpeg -f avfoundation -list_devices true -i ""`, then set `input_device` to the index |
| Wrong language detected    | Set `language` to the ISO code (e.g. `en`) instead of relying on auto-detect                                                                            |
| First `/voice` is slow     | The model downloads once on first use; subsequent runs use the cache under `~/.infer/models/whisper/`                                                   |
| `/voice` does not appear   | Set `speech_to_text.enabled: true` (or `INFER_SPEECH_TO_TEXT_ENABLED=true`) - the shortcut is hidden when disabled                                      |

## Related

- [CLI](/cli/) - overview of the `infer` command-line tool, chat mode, and shortcuts
- [Channels](/cli-channels/) - Telegram setup, access control, and how inbound messages reach the agent
- [Configuration](/configuration/) - full configuration system across the gateway and CLI
- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) - the local transcription engine
