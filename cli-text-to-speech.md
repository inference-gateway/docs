---
title: Text-to-Speech
description: Synthesize speech from text in the Inference Gateway CLI through the gateway's Audio API, with the built-in local/qwen3-tts engine or any provider model, including zero-shot voice cloning from a reference WAV.
---

# Text-to-Speech

The [Inference Gateway CLI](/cli/) can turn text into spoken audio through the `TextToSpeech` agent tool, in two modes:

- **Text to speech** - text in, spoken `.wav` out, using a stock voice.
- **Voice to voice (voice cloning)** - text plus a short reference recording of the target speaker (~10-30s of clean `.wav`) in, spoken WAV out in that voice. This is the interesting mode for dubbing and video-editing workflows.

Speech always goes through the gateway's [`POST /v1/audio/speech`](/api-reference/#audio-api) endpoint, so speech requests appear in gateway logs, [traces](/cli/#tracing) and pricing like any other request, and the CLI needs no local build of anything.

`text_to_speech.model` is a `provider/model` id. The default, `local/qwen3-tts`, is the gateway's own [local speech engine](/api-reference/#local-speech-engine-local-qwen3-tts): llama.cpp's `llama-tts` running [Qwen3-TTS](https://huggingface.co/ggml-org/Qwen3-TTS-12Hz-1.7B-Base-GGUF) on the machine the gateway runs on. It needs no provider key, and the gateway downloads the binary and the models itself. Any other `provider/model` with Audio API support works too, for example `openai/gpt-4o-mini-tts`.

The feature is **disabled by default**: while `text_to_speech.enabled` is `false`, the `TextToSpeech` tool definition is not sent to the LLM at all, so it costs zero prompt tokens.

## Enabling

Add a `text_to_speech` section to `.infer/config.yaml` (project) or `~/.infer/config.yaml` (user):

```yaml
text_to_speech:
  enabled: true # feature flag (default: false) - tool absent from the LLM payload when false
  model: local/qwen3-tts # provider/model, e.g. openai/gpt-4o-mini-tts
  voice: '' # provider voice id (OpenAI: alloy, echo, nova, ...), unused by local/qwen3-tts
  auto_download: true # let the gateway download what local/qwen3-tts needs
  output_dir: '' # where generated WAVs go; empty = tts/ under the media root
  require_approval: true # optional - leave unset for the tool's own default (no approval)
```

Leaving `require_approval` unset is not the same as setting it to `false`: unset keeps the tool's own default, an explicit value pins the policy.

## The gateway's Audio API

The gateway serves `/v1/audio/speech` only when it runs with `AUDIO_ENABLED=true`.

- **The gateway the CLI starts** gets `AUDIO_ENABLED=true` and `AUDIO_LOCAL_AUTO_DOWNLOAD=<text_to_speech.auto_download>` automatically while `text_to_speech.enabled` is set. It then fetches the `local/qwen3-tts` binary and models on first use, about 1.4 GB into `~/.infer/bin/tools` and `~/.infer/models/tts`. Requests answer `503` with a `Retry-After` while it warms up.
- **A gateway you run yourself** needs `AUDIO_ENABLED=true` set on it. For a model other than `local/...`, only providers with Audio API support can serve the endpoint.

`infer binaries status` and `infer binaries install` manage the same `~/.infer/bin/tools` cache, so `llama-tts` can be installed ahead of time.

```bash
curl -X POST http://localhost:8080/v1/audio/speech \
  -H "Authorization: Bearer $INFERENCE_GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -o speech.wav \
  -d '{"model":"local/qwen3-tts","input":"Hello","response_format":"wav"}'
```

## Configuration reference

All options live under `text_to_speech` in `.infer/config.yaml`. Every key also has an `INFER_TEXT_TO_SPEECH_`-prefixed environment variable that takes precedence over the config file.

| Key                               | Environment variable                    | Type   | Default           | Description                                                                                                   |
| --------------------------------- | --------------------------------------- | ------ | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `text_to_speech.enabled`          | `INFER_TEXT_TO_SPEECH_ENABLED`          | bool   | `false`           | Feature flag - must be `true` for the `TextToSpeech` tool to reach the LLM                                    |
| `text_to_speech.model`            | `INFER_TEXT_TO_SPEECH_MODEL`            | string | `local/qwen3-tts` | `provider/model` id passed to `/v1/audio/speech` - validated only when `enabled` is `true`                    |
| `text_to_speech.voice`            | `INFER_TEXT_TO_SPEECH_VOICE`            | string | `""`              | Provider voice id passed to `/v1/audio/speech`. `local/qwen3-tts` ignores it                                  |
| `text_to_speech.auto_download`    | `INFER_TEXT_TO_SPEECH_AUTO_DOWNLOAD`    | bool   | `true`            | Sets `AUDIO_LOCAL_AUTO_DOWNLOAD` on the gateway the CLI starts, letting it fetch what `local/qwen3-tts` needs |
| `text_to_speech.output_dir`       | `INFER_TEXT_TO_SPEECH_OUTPUT_DIR`       | string | `""`              | Where generated WAVs are written; empty defaults to `tts/` under the [media root](/cli/#media-directories)    |
| `text_to_speech.require_approval` | `INFER_TEXT_TO_SPEECH_REQUIRE_APPROVAL` | bool   | unset             | Pins the approval policy. Unset keeps the tool's own default, which is no approval                            |

`model` is only validated while `enabled` is `true`. With text-to-speech disabled the CLI never reads those sub-fields, so an unknown value - for example one written by a different `infer` binary sharing the same `~/.infer/config.yaml` - is ignored instead of failing config loading. Flip `enabled: true` and the same value is rejected at load time with a fast, explicit error.

For example:

```bash
export INFER_TEXT_TO_SPEECH_ENABLED=true
export INFER_TEXT_TO_SPEECH_MODEL=local/qwen3-tts
```

### The removed local engine

Earlier versions had a second engine, `text_to_speech.engine: qwen3-tts`, where the CLI ran `llama-tts` itself. It is gone: the gateway's `local/qwen3-tts` runs the same model from the same caches.

A config that still names that engine keeps working. `engine` is ignored with a warning in the log, and so is its `model`, which was a preset of that engine (`base`, `q8`, `bf16`) rather than a gateway model. Remove `engine`, `binary_path`, `models_dir`, `timeout` and `ffmpeg_path` from the section, and set `model` to a `provider/model` id.

## Using the tool

With `text_to_speech.enabled` set, the agent gains a `TextToSpeech` tool:

- `text` (required) - the text to speak.
- `voice_sample` (optional) - bare file name (no directories, no absolute paths) of a WAV of the target speaker, resolved against the working directory first and then the voice samples library at `~/.infer/voice/samples/`. The sample is sent as it is, as `reference_audio`, so keep it short: the gateway refuses a request over its body size limit, 10 MiB by default. A name that resolves nowhere fails with an error listing the paths tried.
- `output_path` (optional) - destination as a bare file name inside `output_dir`; otherwise a timestamped file is written there. `output_dir` defaults to `tts/` under the [media root](/cli/#media-directories) - `~/.infer/projects/<project-slug>/tmp/media/tts/` in a project, `~/.infer/tmp/media/tts/` with no project open. The tool result reports the path and audio duration.

In chat, just ask: _"say this out loud and write it to say.wav"_ for a stock voice, or _"read this in the voice of narrator.wav"_ to clone.

Cloning works where the model supports it. `local/qwen3-tts` clones from the sample, and providers without cloning support, such as OpenAI, ignore or reject it.

### The voice samples library

`~/.infer/voice/samples/` is the shared home for reference recordings. Drop WAVs in there by hand, or manage them from the [desktop app's **Settings -> Voice samples** tab](/desktop/#voice-samples), which uploads through a native file picker, records new samples from your microphone, previews them inline, and deletes them. Either way the CLI resolves the same bare file names, so a sample added on the desktop clones from `infer` on the command line too.

The library used to live at `~/.infer/models/tts/samples`, next to the model cache. Move an existing one over once:

```bash
mkdir -p ~/.infer/voice && mv ~/.infer/models/tts/samples ~/.infer/voice/samples
```

Voice cloning quality depends entirely on the reference sample: one speaker, minimal background noise, no music, roughly 10-30 seconds.

### Sessions on a workspace

A session that [teleports to a workspace](/cli/#workspace-kinds) runs its tools there, so a `voice_sample` has to exist on that machine. Set `forward_voice_samples: true` on the workspace entry in `daemon.yaml` and every teleport to it carries this machine's library along - the top-level `.wav` files of `~/.infer/voice/samples`, up to 64 MiB. They land in the target's own library, a sample of the same name is replaced, the target's other samples stay, and a teleport back carries none. The agent then names a sample the same way as at home.

A workspace's gateway only serves its Audio API when the workspace asks for it - see [Where the gateway runs (`mode`)](/cli/#where-the-gateway-runs-mode).

## Troubleshooting

| Symptom                                          | What to check                                                                                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| A `404` from `/v1/audio/speech`                  | The gateway runs without its Audio API. Set `AUDIO_ENABLED=true` on a gateway you run yourself - the one the CLI starts gets it automatically |
| `speech assets are still downloading`            | The gateway is fetching the `local/qwen3-tts` binary and models, about 1.4 GB the first time. Try again when it is done                       |
| The gateway is killed while speaking             | `local/qwen3-tts` held about 6 GiB of memory for one sentence when measured. Give a gateway under a memory limit more than that               |
| Suspect a corrupt model file                     | Delete the offending file under `~/.infer/models/tts/` **on the gateway's machine** to download a fresh copy                                  |
| `voice sample ... not found` (lists paths tried) | Put the WAV in the working directory, or add it to `~/.infer/voice/samples/` - pass a bare file name, not a path                              |
| Clone sounds wrong                               | Use a cleaner or longer reference sample (10-30s, single speaker)                                                                             |
| Timeouts on long text                            | A request waits for `client.timeout` seconds. Split a long passage into one call per sentence or two                                          |
| The model never calls `TextToSpeech`             | Set `text_to_speech.enabled: true` (or `INFER_TEXT_TO_SPEECH_ENABLED=true`) - the tool is hidden when disabled                                |

## Related

- [CLI](/cli/) - overview of the `infer` command-line tool, chat mode, and the full tool reference
- [Speech-to-Text](/cli-speech-to-text/) - the reverse direction, local transcription with whisper.cpp
- [Text-to-Video and Avatars](/cli-text-to-video/) - lip-sync a generated voice track onto an avatar portrait
- [TextToMusic](/cli/#texttomusic-tool) and [TextToSFX](/cli/#texttosfx-tool) - the non-speech siblings: music clips and sound effects through the gateway, with the same `output_path` rules
- [Audio API](/api-reference/#audio-api) - the endpoint itself, and the gateway's local speech engine
- [Operator](/operator/#audio-spec-audio) - turning the Audio API on for a gateway in Kubernetes
- [Desktop App](/desktop/#text-to-speech) - the settings toggle, inline playback, and the voice samples library
- [Configuration](/configuration/) - full configuration system across the gateway and CLI
