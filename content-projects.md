---
title: Content Projects
description: Content projects in Inference Gateway Desktop - the <stem>.timeline.json contract, overlay cards rendered with HyperFrames, the timeline editor, and the ffmpeg export.
---

# Content Projects

A **content project** is a desktop project switched to the **Content** type in
**Settings -> Projects**. The agent gets the bundled `video-editing` skill and the tools it
needs (`ffmpeg`, `whisper-cli`), and the desktop renders a `<stem>.timeline.json` file in the
project folder as an editable timeline: a video lane, audio lanes for the cloned voice and music,
and **overlay** lanes for animated cards.

The agent only ever writes the timeline JSON and the media it generates. Rendering is the
desktop's job: you review the plan on the timeline and press **Export**.

## Project layout

| Path                   | Contents                                                                   |
| ---------------------- | -------------------------------------------------------------------------- |
| `<stem>.timeline.json` | The timeline - the contract between the agent, the editor, and the export  |
| `media/`               | The media pool: recordings, music, synthesized voice clips, rendered cards |
| `cards/`               | The HTML compositions that overlay cards are rendered from                 |
| `export/<output>`      | Where **Export** writes the finished video                                 |

Clip `src` paths are relative to the project folder and point into `media/`, so the folder stays
self-contained.

## Timeline contract

```json
{
  "version": 1,
  "duration": 42.3,
  "output": "demo.with-voice.mp4",
  "resolution": "1920x1080",
  "source_audio": "transcribe",
  "tracks": [
    {
      "id": "video",
      "kind": "video",
      "clips": [{ "id": "v1", "src": "media/demo.mov", "start": 0, "end": 42.3 }]
    },
    {
      "id": "voice",
      "kind": "audio",
      "voice_sample": "eden.wav",
      "clips": [
        {
          "id": "s1",
          "start": 0.0,
          "end": 6.2,
          "text": "First we open the settings panel.",
          "src": "media/demo-s1.wav",
          "status": "done"
        }
      ]
    },
    { "id": "music", "kind": "audio", "gain": 0.2, "clips": [] },
    {
      "id": "cards",
      "kind": "overlay",
      "clips": [
        {
          "id": "o1",
          "src": "media/o1-title.mov",
          "html": "cards/o1-title.html",
          "start": 0,
          "end": 3
        },
        {
          "id": "o2",
          "src": "media/o2-lower-third.mov",
          "html": "cards/o2-lower-third.html",
          "start": 4.5,
          "end": 9,
          "x": 0.05,
          "y": 0.78,
          "width": 0.4
        }
      ]
    }
  ]
}
```

All times are seconds.

| Field          | Meaning                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `duration`     | Length of the finished video                                                                                                 |
| `output`       | File name of the export, written to `export/<output>`                                                                        |
| `resolution`   | Export frame as `"WxH"` - `1920x1080` (default), `1080x1920`, or `1350x1350`; picked with the **Frame** select in the editor |
| `source_audio` | What to do with the recording's own audio: `transcribe`, `mute`, or `keep`                                                   |
| `tracks`       | Lanes of the timeline, each with an `id`, a `kind`, and `clips`                                                              |

### Track kinds

| Kind      | Lane                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------- |
| `video`   | The recording                                                                                  |
| `audio`   | Spoken clips (a clip with `text`) and plain files such as music, mixed with the track's `gain` |
| `overlay` | Animated cards composited over the picture                                                     |

The older `voice` kind still loads as `audio`.

### Overlay clips

A clip on an `overlay` track carries:

| Field             | Meaning                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src`             | The rendered card under `media/` - a `.mov` with alpha, or a VP9 `.webm` (export only, see below)                         |
| `start`, `end`    | When the card is on screen, in seconds on the video                                                                       |
| `html`            | Optional. The composition under `cards/` the card was rendered from, so it can be re-rendered instead of rewritten        |
| `x`, `y`          | Optional. Position of the card's top-left corner as fractions (0-1) of the export frame, top-left origin                  |
| `width`, `height` | Optional. Size as fractions (0-1) of the export frame. `width` alone keeps the aspect ratio; neither set means full width |

Nothing other than cards belongs on an overlay track, and clips on one track must not overlap in
time - use a second overlay track when two cards share a range.

## Overlay cards

A card is an HTML composition rendered by [HyperFrames](https://github.com/heygen-com/hyperframes)
to a ProRes 4444 `.mov` with alpha, then placed as a clip on an overlay track.

### Prerequisites

The agent reports missing prerequisites and stops - it never installs them. Set them up once:

| Prerequisite                       | How                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| The `hyperframes` skill            | [`infer skills install hyperframes motion-graphics`](/cli-skills/), or **Settings -> Skills** |
| Node.js 22 or newer                | `node --version` must print `v22` or higher                                                   |
| `ffmpeg` with the `overlay` filter | Installed with the Content project type; `ffmpeg -hide_banner -filters \| grep overlay`       |
| A Chromium for HyperFrames         | Run `npx hyperframes browser ensure` once in a terminal if a render fails                     |

### Card kinds

The compositions themselves come from the catalog's
[`hyperframes` and `motion-graphics` skills](/skills/), which own how a card is written and
animated. The `video-editing` skill owns where it goes on the timeline. The usual five:

| Card         | Typical placement                                                        |
| ------------ | ------------------------------------------------------------------------ |
| Title        | Full frame, at the head of the video                                     |
| Lower third  | Bottom left, roughly `x: 0.05`, `y: 0.78`, `width: 0.4`                  |
| Callout      | Next to the thing it points at, sized with `width`                       |
| Step counter | A corner, held across the step it numbers                                |
| Bar chart    | Centered or beside the picture, usually the longest card on the timeline |

### Rendering

```sh
npx --yes hyperframes render -c cards/<id>.html --format mov -o media/<id>.mov --quiet
```

Always `--format mov`: mp4 has no alpha channel, and the desktop's preview drops the alpha of a
VP9 WebM, so a WebM card shows a black box in the preview (it still composites correctly on
export). ProRes is large, so keep cards under about 10 seconds.

### Sizing

- The export frame is the timeline's `resolution`. A full-frame card is a composition of exactly
  that size.
- A smaller card keeps the same pixel density: in a 1920-wide frame, `width: 0.4` is a 768 px wide
  composition.
- The composition's duration is the clip's `end - start`.

To change a card, edit the file named by its `html` and render over the same `src`; `start`, `end`,
and the placement fractions are edited on the timeline and need no re-render.

## The timeline editor

- Overlay lanes sit above the video lane and show thumbnails of their cards. Their clips move,
  trim, and delete exactly like audio clips.
- The preview stage has the export's aspect ratio and plays each card over the video inside its
  time range, at the position its fractions describe - what you see is where the export puts it.
- The **Frame** select sets `resolution`.
- **Export** is enabled as soon as a timeline has overlay clips, even with no voice clips.

## Export

`ffmpeg` renders the timeline deterministically:

1. The recording is scaled to fit and padded into the timeline's `resolution`, so the picture is
   always re-encoded.
2. Every overlay clip is added as an input, scaled to its fraction of the frame, and composited
   with `overlay` and `enable=between(...)` for its time range. A `.webm` card is decoded with
   `libvpx-vp9` so its alpha survives.
3. Audio clips are mixed with their track `gain`. A timeline with overlays but no audio clips
   keeps the source audio as is.
4. The result is written to `export/<output>`, out of the media pool. **Reveal** opens it there.

## Troubleshooting

### A card shows a black background in the preview

The card is a VP9 `.webm`. The webview plays WebM but drops its alpha channel, so the card renders
on black. Re-render it as a `.mov` (ProRes 4444, or HEVC with alpha):

```sh
npx --yes hyperframes render -c cards/<id>.html --format mov -o media/<id>.mov --quiet
```

The export composites a `.webm` with its alpha intact, so this is a preview-only limitation - but
`.mov` is the format to use so the preview matches the export.

### The agent says Node.js 22 or newer is needed

HyperFrames needs Node 22+, and neither the desktop nor the agent installs it. Install a current
Node (for example `brew install node` or [nvm](https://github.com/nvm-sh/nvm)), confirm with
`node --version`, and ask the agent to render the card again.

If the render then fails because HyperFrames or its browser is missing, run
`npx hyperframes browser ensure` once in a terminal - the agent will not run it for you.

### Export is unavailable or complains about a filter

The export needs an `ffmpeg` built with the `overlay` filter. The Content project type installs a
suitable build into `~/.infer/bin/tools/ffmpeg`; if you point the app at your own `ffmpeg`, check
it with `ffmpeg -hide_banner -filters | grep ' overlay '`.

## Related

- [Desktop App](/desktop/) - the app that hosts content projects
- [Skills Catalog](/skills/) - `video-editing`, `hyperframes`, and `motion-graphics`
- [Text-to-Speech](/cli-text-to-speech/) - the voice cloning behind spoken clips
- [Speech-to-Text](/cli-speech-to-text/) - transcribing a recording's own audio
