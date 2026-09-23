---
title: Text-to-Video and Avatars
description: Render video clips from the Inference Gateway CLI with the TextToVideo agent tool - text prompts, lip-synced avatar renders from a portrait and an audio clip, and the ~/.infer/avatars library managed by infer avatars.
---

# Text-to-Video and Avatars

The [Inference Gateway CLI](/cli/) can render short video clips through the `TextToVideo` agent tool, in two modes:

- **Prompt render** - a text prompt in, an MP4 out. Optionally pass a portrait as the first frame, or an avatar from the library as [reference images](#reference-images-in-prompt-renders) so the same person shows up in the clip.
- **Avatar render (lip-sync)** - a portrait plus a `.wav` or `.mp3` clip in, an MP4 of that face speaking the audio out. Pair it with [Text-to-Speech](/cli-text-to-speech/) to go from a script to a talking-head clip without leaving the chat.

Rendering goes through the gateway's Videos API (`POST /v1/videos`, then polling `GET /v1/videos/{id}` until the job finishes and downloading `GET /v1/videos/{id}/content`) - the CLI holds no provider key, the gateway does, so renders show up in gateway logs, traces and pricing.

> **Disabled by default.** While `text_to_video.enabled` is `false`, the `TextToVideo` tool definition is not sent to the LLM at all, so it costs zero prompt tokens. Avatar renders upload a picture of your face and a recording of your voice to a third-party provider - that is why this feature is opt-in rather than on by default.

## Enabling

Add a top-level `text_to_video` section to `.infer/config.yaml` (project) or `~/.infer/config.yaml` (user):

```yaml
text_to_video:
  enabled: true # feature flag (default: false) - tool absent from the LLM payload when false
  # model: elevenlabs/veo-3.1-fast-generate-001 # prompt renders
  # avatar_model: elevenlabs/creatify-aurora # lip-synced avatar renders
  # size: '' # "widthxheight", passed through to the provider; empty = provider default
  # output_dir: ~/.infer/tmp/video
  # timeout: 900 # seconds to wait for a render job
  # poll_interval: 5 # seconds between job status polls
  # create_avatar: false # also register the CreateAvatar agent tool
  require_approval: false # optional; unset = no approval, like the image tools
```

**Gateway requirements:** the Videos API must be enabled on the gateway (`VIDEOS_ENABLED=true`, gateway v0.54.0 or newer) and the gateway must hold credentials for the provider behind `model` / `avatar_model` (an ElevenLabs API key for the defaults). A gateway the CLI starts itself gets `VIDEOS_ENABLED=true` automatically while `text_to_video.enabled` is on, and an already-running instance without the Videos API is restarted. Point the CLI at an externally managed gateway and you set `VIDEOS_ENABLED=true` and the provider key there yourself.

## Configuration reference

All options live under `text_to_video` in `.infer/config.yaml`. Every key also has an `INFER_TEXT_TO_VIDEO_`-prefixed environment variable that takes precedence over the config file.

| Config key                       | Environment variable                   | Type   | Default                                | Notes                                                                                       |
| -------------------------------- | -------------------------------------- | ------ | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `text_to_video.enabled`          | `INFER_TEXT_TO_VIDEO_ENABLED`          | bool   | `false`                                | Feature flag - must be `true` for the `TextToVideo` tool to reach the LLM                   |
| `text_to_video.model`            | `INFER_TEXT_TO_VIDEO_MODEL`            | string | `elevenlabs/veo-3.1-fast-generate-001` | Gateway `provider/model` id used for prompt renders                                         |
| `text_to_video.avatar_model`     | `INFER_TEXT_TO_VIDEO_AVATAR_MODEL`     | string | `elevenlabs/creatify-aurora`           | Gateway `provider/model` id used for lip-synced avatar renders                              |
| `text_to_video.size`             | `INFER_TEXT_TO_VIDEO_SIZE`             | string | `""`                                   | `widthxheight` passed through to the provider; empty leaves the provider default            |
| `text_to_video.output_dir`       | `INFER_TEXT_TO_VIDEO_OUTPUT_DIR`       | string | `~/.infer/tmp/video`                   | Where rendered MP4s are written                                                             |
| `text_to_video.timeout`          | `INFER_TEXT_TO_VIDEO_TIMEOUT`          | int    | `900`                                  | Seconds to wait for a render job before giving up                                           |
| `text_to_video.poll_interval`    | `INFER_TEXT_TO_VIDEO_POLL_INTERVAL`    | int    | `5`                                    | Seconds between job status polls                                                            |
| `text_to_video.create_avatar`    | `INFER_TEXT_TO_VIDEO_CREATE_AVATAR`    | bool   | `false`                                | Also register the [`CreateAvatar`](#creating-avatars-from-chat) tool; needs `enabled` too   |
| `text_to_video.require_approval` | `INFER_TEXT_TO_VIDEO_REQUIRE_APPROVAL` | bool   | unset (no approval)                    | Tri-state: unset keeps the tool's own default, an explicit value pins the policy either way |

For example:

```bash
export INFER_TEXT_TO_VIDEO_ENABLED=true
export INFER_TEXT_TO_VIDEO_AVATAR_MODEL=elevenlabs/creatify-aurora
```

## Using the tool

With `text_to_video.enabled` set, the agent gains a `TextToVideo` tool - see [TextToVideo](/cli/#texttovideo-tool) in the tools reference for the full parameter list. In chat, just ask:

- _"render a 5 second clip of rain on a window"_ - prompt render with `model`.
- _"make my alice avatar say this"_ (with a generated or recorded audio clip) - lip-synced render with `avatar_model`.

**Limits:** the portrait plus the audio clip travel in one request, so together they must stay under the gateway's 10 MiB request body limit - trim the clip or downscale the portrait if a render is rejected. `creatify-aurora` renders at 480p or 720p and keeps the portrait's aspect ratio, so a vertical portrait yields a vertical video.

## The avatar library

Avatars live under `~/.infer/avatars/`, one folder per avatar holding one or more portrait images (`.png`, `.jpg`, `.jpeg`, `.webp`) - for example a few angles of the same face:

```text
~/.infer/avatars/
  alice/
    alice.png          # primary image, first in sort order
    alice-left.png
    alice-right.png
  bob/
    bob.jpg
```

Lip-sync models take a single image, so the CLI uses **the first image in sort order** within the folder. The library is userspace-wide (shared by every project) and is **preserved by [`/reset`](/cli/#reset-shortcut)** along with the rest of your configuration.

### Reference images in prompt renders

How an `avatar` is sent depends on whether there is `audio`:

| `avatar` value      | With `audio`                                          | Without `audio`                                                                         |
| ------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Library avatar name | First image in sort order, lip-synced as the portrait | **Every image in the folder** as [`reference_images`](/api-reference/#reference-images) |
| Local image file    | The file, lip-synced as the portrait                  | The file as the first frame                                                             |

So a prompt render with a library avatar describes **what the person looks like** from several angles rather than pinning the opening shot, which keeps the face consistent across the clip. The gateway never combines the two: a render sends either a first frame or reference images, not both.

**Requires gateway v0.55.0 or newer** - the `reference_images` field does not exist on earlier gateways.

**Per-model image limits** are enforced by the gateway, which rejects an over-limit render with a `400` naming the limit:

| Model                     | Max reference images | Notes                                                 |
| ------------------------- | -------------------- | ----------------------------------------------------- |
| `elevenlabs/veo-3.1-*`    | 3                    | Needs its default 8 s duration - do not set `seconds` |
| `bytedance-seedance-v2`   | 9                    |                                                       |
| `bytedance-seedance-v2.5` | 30                   |                                                       |

Avatar (lip-sync) models such as `creatify-aurora` ignore reference images entirely. Keep folders small for Veo: the limit counts every image in the avatar folder.

### Managing avatars

```bash
# List avatars and their images
infer avatars list
infer avatars list --format json

# Create an avatar from a photo, generating extra views
infer avatars create alice --from ~/Pictures/alice.png

# Delete an avatar folder and its images
infer avatars delete alice
```

`infer avatars create <name> --from <photo>` copies the photo in as the primary image and then generates additional views of the same face - by default both three-quarter angles - through the gateway's image edit API using the `tools.image_edit.model` model.

| Flag        | Default     | Description                                |
| ----------- | ----------- | ------------------------------------------ |
| `--from`    | required    | Path to the source photo                   |
| `--angles`  | both angles | Which extra views to generate              |
| `--quality` | `high`      | Image quality passed to the image edit API |
| `--size`    | `1024x1536` | Size of the generated views                |

Creating an avatar **normalises the photo first**: a JPEG is turned upright according to its EXIF orientation and re-encoded without its metadata, so a phone photo stored sideways arrives the right way up and camera and GPS tags never reach the library or a provider. The generated views come from that stored image, not the original file. PNG and WebP pass through unchanged.

`create` never overwrites an existing avatar - delete it first if you want to rebuild it.

> **Privacy:** generating views uploads the photo to the image-edit provider (OpenAI by default), and an avatar render uploads the portrait and the audio clip to the video provider. Drop images into `~/.infer/avatars/<name>/` by hand to build a library without the image-edit round trip.

### Creating avatars from chat

`CreateAvatar` is the agent-side twin of `infer avatars create` - it lets the model build an avatar from a portrait it just generated, a selfie sent over a [channel](/cli-channels/), or a photo in the project, without you dropping to a shell.

It is **opt-in on top of the feature flag**: registered only when both `text_to_video.enabled` and `text_to_video.create_avatar` are `true`.

```yaml
text_to_video:
  enabled: true
  create_avatar: true
```

```bash
export INFER_TEXT_TO_VIDEO_CREATE_AVATAR=true
```

It **requires approval by default**, unlike the other media tools, because it writes to your userspace avatar library and uploads a photo of a face. An explicit `text_to_video.require_approval` overrides that either way.

| Parameter | Required | Default     | Description                                                                                                                   |
| --------- | -------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `name`    | yes      | -           | Avatar name, which becomes the folder under `~/.infer/avatars/`                                                               |
| `photo`   | yes      | -           | Bare file name, looked up in the working directory then the session artifacts directory; absolute paths and `..` are rejected |
| `angles`  | no       | both angles | Extra views to generate; `[]` stores the photo only, with no image-edit call                                                  |
| `quality` | no       | `high`      | Image quality passed to the image edit API                                                                                    |
| `size`    | no       | `1024x1536` | Size of the generated views                                                                                                   |

The tool **never overwrites** an avatar and has **no delete counterpart** - the agent can add to your library but not replace or remove anything in it. Photo normalisation (EXIF orientation, metadata stripped) applies here too.

## Troubleshooting

| Symptom                                     | What to check                                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| The model never calls `TextToVideo`         | Set `text_to_video.enabled: true` (or `INFER_TEXT_TO_VIDEO_ENABLED=true`) - the tool is hidden when disabled              |
| `404` or "videos API not enabled"           | Run the gateway with `VIDEOS_ENABLED=true` (gateway v0.54.0+); an externally managed gateway is not reconfigured for you  |
| Request rejected as too large               | Portrait plus audio must fit in the gateway's 10 MiB request body - shorten the clip or downscale the portrait            |
| The render times out                        | Raise `text_to_video.timeout` - renders routinely take minutes                                                            |
| `avatar ... not found`                      | Check `infer avatars list`; the folder name is the avatar name and it must contain at least one supported image           |
| The wrong face angle is used for a lip-sync | Lip-sync uses the first image in sort order - rename the preferred portrait so it sorts first                             |
| `400` naming a reference-image limit        | The avatar folder holds more images than the model takes (Veo 3.1: 3, Seedance v2: 9, v2.5: 30) - trim it or switch model |
| Reference images are ignored or rejected    | `reference_images` needs gateway v0.55.0+; lip-sync models ignore it by design                                            |
| The model never calls `CreateAvatar`        | Set both `text_to_video.enabled` and `text_to_video.create_avatar` to `true`                                              |

## Related

- [CLI](/cli/#texttovideo-tool) - the tool reference entry, parameters, and the rest of the `infer` command-line tool
- [CreateAvatar](/cli/#createavatar-tool) - the tool reference entry for building avatars from chat
- [Videos API](/api-reference/#reference-images) - how `reference_images` and `input_reference` differ on the wire
- [Text-to-Speech](/cli-text-to-speech/) - generate the voice track an avatar render lip-syncs to
- [TextToMusic](/cli/#texttomusic-tool) and [TextToSFX](/cli/#texttosfx-tool) - the audio siblings, with the same `output_path` rules
- [Configuration](/configuration/) - full configuration system across the gateway and CLI
