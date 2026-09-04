---
title: Text-to-Speech
description: Synthesize speech from text in the Inference Gateway CLI - through the gateway's Audio API by default, or fully offline with a local llama.cpp llama-tts binary and Qwen3-TTS GGUF models, including zero-shot voice cloning from a reference WAV.
---

# Text-to-Speech

The [Inference Gateway CLI](/cli/) can turn text into spoken audio through the `TextToSpeech` agent tool, in two modes:

- **Text to speech** - text in, spoken `.wav` out, using a stock voice.
- **Voice to voice (voice cloning)** - text plus a short reference recording of the target speaker (~10-30s of clean `.wav`) in, spoken WAV out in that voice. This is the interesting mode for dubbing and video-editing workflows.

Two engines are available. The default, `gateway`, synthesizes through the gateway's [`POST /v1/audio/speech`](/api-reference/#audio-api) endpoint using the `local/qwen3-tts` model unless `text_to_speech.model` names another `provider/model`. Setting `engine: qwen3-tts` instead runs everything locally: the tool shells out to llama.cpp's `llama-tts` binary running [Qwen3-TTS](https://huggingface.co/ggml-org/Qwen3-TTS-12Hz-1.7B-Base-GGUF) GGUF models, the same GGUF ecosystem as the [whisper.cpp speech-to-text](/cli-speech-to-text/) feature. Either way it is **disabled by default**: while `text_to_speech.enabled` is `false`, the `TextToSpeech` tool definition is not sent to the LLM at all, so it costs zero prompt tokens.

## Synthesizing through the gateway (the default)

The gateway also exposes an OpenAI-compatible [`POST /v1/audio/speech`](/api-reference/#audio-api) endpoint (`AUDIO_ENABLED=true`), which takes `model`, `input`, `voice`, `language` and `response_format` and returns raw audio bytes. Routing TTS through it means speech requests appear in gateway logs, tracing and pricing, and no local `llama-tts` build is required:

```bash
curl -X POST http://localhost:8080/v1/audio/speech \
  -H "Authorization: Bearer $INFERENCE_GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -o speech.mp3 \
  -d '{"model":"openai/tts-1","input":"Hello","voice":"alloy","response_format":"mp3"}'
```

The gateway can also synthesize without any provider: the reserved model id `local/qwen3-tts` runs the same `llama-tts` binary and Qwen3-TTS GGUFs inside the gateway, sharing the `~/.infer/models/tts` and `~/.infer/bin` caches with the CLI - see [Local speech engine](/api-reference/#local-speech-engine-local-qwen3-tts).

This gateway-backed engine (`engine: gateway`, [cli#1126](https://github.com/inference-gateway/cli/issues/1126)) is what the CLI's `TextToSpeech` tool uses by default. The rest of this page - prerequisites, models, `llama-tts`/`ffmpeg` - applies to the local `qwen3-tts` engine; under `gateway` the CLI just posts to the Audio API and the gateway downloads whatever its engine needs.

> **Note:** Under the `qwen3-tts` engine, text-to-speech shells out to `llama-tts` and `ffmpeg` - no CGO is added to the `infer` binary. When a required tool is missing, the CLI reports an actionable error naming what to install; it never fails silently.

## Prerequisites

| Tool        | Used for                                                        | Install                                                                                                                                 |
| ----------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `llama-tts` | Synthesis                                                       | Build the `llama-tts` target from [llama.cpp](https://github.com/ggml-org/llama.cpp), or set `text_to_speech.binary_path` to your build |
| `ffmpeg`    | Normalizing the voice sample for cloning (16 kHz mono, max 30s) | macOS: `brew install ffmpeg` - Debian/Ubuntu: `apt install ffmpeg`                                                                      |

`ffmpeg` is only needed for voice cloning; stock-voice synthesis passes text straight to `llama-tts`. If `ffmpeg` is missing and `auto_download` is on, a prebuilt binary is downloaded into `~/.infer/bin` as a last resort, mirroring speech-to-text.

Building `llama-tts` is one cmake invocation:

```bash
cmake -B build -DGGML_NATIVE=ON && cmake --build build --target llama-tts
```

## Enabling

Add a `text_to_speech` section to `.infer/config.yaml` (project) or `~/.infer/config.yaml` (user):

```yaml
text_to_speech:
  enabled: true # feature flag (default: false) - tool absent from the LLM payload when false
  engine: gateway # gateway (default) | qwen3-tts (local llama-tts)
  model: '' # gateway: "provider/model", "" = local/qwen3-tts - qwen3-tts: "" = base preset; q8 | bf16 | explicit GGUF filenames
  voice: '' # gateway engine only: voice name passed to /v1/audio/speech
  auto_download: true # download models (and ffmpeg) on first use if missing
  output_dir: '' # where generated WAVs go; empty = ~/.infer/tts
  # Optional overrides:
  binary_path: '' # explicit llama-tts path; empty = resolve on PATH
  models_dir: '' # model cache; empty = ~/.infer/models/tts
  timeout: 300 # synthesis timeout (seconds)
  ffmpeg_path: '' # explicit ffmpeg path; empty = resolve on PATH
```

## Configuration reference

All options live under `text_to_speech` in `.infer/config.yaml`. Every key also has an `INFER_TEXT_TO_SPEECH_`-prefixed environment variable that takes precedence over the config file.

| Key                            | Environment variable                 | Type   | Default   | Description                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------ | ------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `text_to_speech.enabled`       | `INFER_TEXT_TO_SPEECH_ENABLED`       | bool   | `false`   | Feature flag - must be `true` for the `TextToSpeech` tool to reach the LLM                                                                                                                                         |
| `text_to_speech.engine`        | `INFER_TEXT_TO_SPEECH_ENGINE`        | string | `gateway` | Synthesis engine: `gateway` (the gateway's Audio API) or `qwen3-tts` (local `llama-tts`) - validated only when `enabled` is `true`                                                                                 |
| `text_to_speech.binary_path`   | `INFER_TEXT_TO_SPEECH_BINARY_PATH`   | string | `""`      | `qwen3-tts` only: explicit `llama-tts` path; empty resolves the binary on `PATH`                                                                                                                                   |
| `text_to_speech.model`         | `INFER_TEXT_TO_SPEECH_MODEL`         | string | `""`      | `gateway`: `provider/model` id, empty defaults to `local/qwen3-tts` - `qwen3-tts`: preset (`""`/`base`, `q8`, `bf16`) or explicit `<backbone>[,<mmproj>].gguf` filenames - validated only when `enabled` is `true` |
| `text_to_speech.voice`         | `INFER_TEXT_TO_SPEECH_VOICE`         | string | `""`      | `gateway` only: voice name passed to `/v1/audio/speech`                                                                                                                                                            |
| `text_to_speech.models_dir`    | `INFER_TEXT_TO_SPEECH_MODELS_DIR`    | string | `""`      | `qwen3-tts` only: where models are cached; empty defaults to `~/.infer/models/tts`                                                                                                                                 |
| `text_to_speech.output_dir`    | `INFER_TEXT_TO_SPEECH_OUTPUT_DIR`    | string | `""`      | Where generated WAVs are written; empty defaults to `~/.infer/tts`                                                                                                                                                 |
| `text_to_speech.auto_download` | `INFER_TEXT_TO_SPEECH_AUTO_DOWNLOAD` | bool   | `true`    | Download models (and `ffmpeg`) on first use if missing                                                                                                                                                             |
| `text_to_speech.timeout`       | `INFER_TEXT_TO_SPEECH_TIMEOUT`       | int    | `300`     | Synthesis timeout in seconds                                                                                                                                                                                       |
| `text_to_speech.ffmpeg_path`   | `INFER_TEXT_TO_SPEECH_FFMPEG_PATH`   | string | `""`      | `qwen3-tts` only: explicit `ffmpeg` path; empty resolves `ffmpeg` on `PATH`                                                                                                                                        |

`engine` and `model` are only validated while `enabled` is `true`. With text-to-speech disabled the CLI never reads those sub-fields, so an unknown engine or
model value - for example one written by a newer `infer` binary sharing the same `~/.infer/config.yaml`, such as the older CLI bundled with the desktop app - is
ignored instead of failing config loading. Flip `enabled: true` and the same value is rejected at load time with a fast, explicit error
([cli#1142](https://github.com/inference-gateway/cli/pull/1142)).

For example:

```bash
export INFER_TEXT_TO_SPEECH_ENABLED=true
export INFER_TEXT_TO_SPEECH_MODEL=q8
```

## Choosing a model

The backbone and `mmproj` (audio adapter) GGUF files are downloaded on first use from [`huggingface.co/ggml-org/Qwen3-TTS-12Hz-1.7B-Base-GGUF`](https://huggingface.co/ggml-org/Qwen3-TTS-12Hz-1.7B-Base-GGUF) and cached under `~/.infer/models/tts/`:

| Model                   | Backbone                               | Notes                            |
| ----------------------- | -------------------------------------- | -------------------------------- |
| `""` / `base` (default) | `Qwen3-TTS-12Hz-1.7B-Base-Q4_K_M.gguf` | ~1 GB, good balance              |
| `q8`                    | `Qwen3-TTS-12Hz-1.7B-Base-Q8_0.gguf`   | ~1.9 GB, slightly better quality |
| `bf16`                  | `Qwen3-TTS-12Hz-1.7B-Base-bf16.gguf`   | ~3.4 GB, best fidelity           |

Each preset downloads the matching `mmproj-*` file automatically. You can also pass explicit filenames as `model: '<backbone>.gguf,<mmproj>.gguf'` (or just the backbone, in which case the `mmproj-<name>-Q8_0.gguf` pair is derived), or place both files in `models_dir` manually and set `auto_download: false`.

The `llama-tts` binary is resolved from `binary_path`, then from `PATH`. No prebuilt `llama-tts` asset is published today, so build it once from llama.cpp; if an asset is added later it is downloaded into `~/.infer/bin` automatically on first use, like `ffmpeg`.

## Using the tool

With `text_to_speech.enabled` set, the agent gains a `TextToSpeech` tool:

- `text` (required) - the text to speak.
- `voice_sample` (optional) - bare file name (no directories, no absolute paths) of a WAV of the target speaker, resolved against the working directory first and then the voice samples library at `~/.infer/models/tts/samples/`. The sample is normalized with `ffmpeg` (16 kHz mono, capped at 30s) and passed to the engine's `--tts-speaker-file` for zero-shot cloning. A name that resolves nowhere fails with an error listing the paths tried.
- `output_path` (optional) - destination WAV; otherwise a timestamped file is written to `output_dir` (default `~/.infer/tts/`). The tool result reports the path and audio duration.

In chat, just ask: _"say this out loud and write it to say.wav"_ for a stock voice, or _"read this in the voice of narrator.wav"_ to clone.

### The voice samples library

`~/.infer/models/tts/samples/` is the shared home for reference recordings. Drop WAVs in there by hand, or manage them from the [desktop app's **Settings -> Voice samples** tab](/desktop/#voice-samples), which uploads through a native file picker, records new samples from your microphone, previews them inline, and deletes them. Either way the CLI resolves the same bare file names, so a sample added on the desktop clones from `infer` on the command line too.

Voice cloning quality depends entirely on the reference sample: one speaker, minimal background noise, no music, roughly 10-30 seconds.

## Troubleshooting

| Symptom                                              | What to check                                                                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `llama-tts binary not found`                         | Build the `llama-tts` target from llama.cpp, or set `text_to_speech.binary_path`                                      |
| `ffmpeg not found`                                   | Install ffmpeg, or set `text_to_speech.ffmpeg_path`                                                                   |
| `tts model ... not found ... auto_download disabled` | Enable `auto_download`, or place the backbone and `mmproj` GGUFs in `models_dir`                                      |
| Slow first call                                      | Models download once (~1 GB by default); subsequent runs use the cache under `~/.infer/models/tts/`                   |
| `voice sample ... not found` (lists paths tried)     | Put the WAV in the working directory, or add it to `~/.infer/models/tts/samples/` - pass a bare file name, not a path |
| Clone sounds wrong                                   | Use a cleaner or longer reference sample (10-30s, single speaker), and try the `q8` or `bf16` preset                  |
| Timeouts on long text                                | Raise `timeout` - synthesis takes multiple seconds of compute per second of audio on most hardware                    |
| The model never calls `TextToSpeech`                 | Set `text_to_speech.enabled: true` (or `INFER_TEXT_TO_SPEECH_ENABLED=true`) - the tool is hidden when disabled        |

## Related

- [CLI](/cli/) - overview of the `infer` command-line tool, chat mode, and the full tool reference
- [Speech-to-Text](/cli-speech-to-text/) - the reverse direction, local transcription with whisper.cpp
- [Desktop App](/desktop/#text-to-speech) - the settings toggle, inline playback, and the voice samples library
- [Configuration](/configuration/) - full configuration system across the gateway and CLI
- [llama.cpp](https://github.com/ggml-org/llama.cpp) - the local synthesis engine
