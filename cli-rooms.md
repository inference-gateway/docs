---
title: CLI Rooms
description: Group agents into named rooms with rooms.yaml, keep one append-only log per room, and inspect rooms with infer rooms list and infer rooms show.
---

# Rooms

A room is a named group of agents you talk to in one project. Every agent in a room keeps its own session for that room, and every post the room sees is appended to one log per room. Rooms are configured in `rooms.yaml` and inspected with [`infer rooms`](#inspecting-rooms-infer-rooms).

## Configuring rooms (rooms.yaml)

Rooms have their own file, **`rooms.yaml`** - a split sidecar like [`judge.yaml`](/cli-judge-mode/#configuring-the-judge-judgeyaml) and [`channels.yaml`](/cli-channels/), merged under the `rooms` key. A `rooms:` block in `config.yaml` never reaches the section. Project config wins over user config, and `infer init` seeds the user copy with the defaults:

| Scope   | Path                  |
| ------- | --------------------- |
| Project | `.infer/rooms.yaml`   |
| User    | `~/.infer/rooms.yaml` |

```yaml
router:
  model: '' # "provider/model" decision model - empty routes @mentions only
  min_confidence: 0.5 # the router's confidence bar, between 0 and 1
  fallback: top # a post nobody clears the bar for: top (default) or none
context_posts: 20 # past posts of the room log that ride along as context
rooms:
  - name: public
    agents: ['*']
```

| Field                   | Default  | Purpose                                                                                                                                       |
| ----------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `router.model`          | `''`     | `provider/model` decision model that decides who a post goes to. Empty routes `@mentions` only - see [How routing works](#how-routing-works). |
| `router.min_confidence` | `0.5`    | A member is addressed when the router's probability for it reaches this bar. Must be between `0` and `1`.                                     |
| `router.fallback`       | `top`    | What happens to a post no member clears the bar for - `top` hands it to the room's top match, `none` addresses nobody.                        |
| `context_posts`         | `20`     | How many past posts of the room log ride along as context. Must be `0` or more.                                                               |
| `rooms`                 | `public` | The rooms, each with a `name`, an optional `project` and an `agents` list.                                                                    |

`rooms.yaml` is validated at startup and a broken file fails the load: an unknown `fallback`, a `min_confidence` outside `0`-`1`, a negative `context_posts`, an invalid room name or a room defined twice are configuration errors.

### Rooms and members

Each entry of `rooms` is one room:

| Field     | Purpose                                                                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`    | The room's name. Letters, digits and underscores, starting with a letter or digit - no dashes. It names the log file and lands in session ids. |
| `project` | The project directory the members run in. A room without `project` runs its members in the daemon's default project dir.                       |
| `agents`  | The member agents. `"*"` stands for every agent that exists, the [built-ins](/cli/#markdown-subagent-presets) included.                        |

Members resolve each time the rooms are read, not once when the file is written:

- `"*"` becomes every agent [`infer agents list`](/cli/#markdown-subagent-presets) knows, sorted by name, so a newly added agent file joins the room without a `rooms.yaml` edit.
- A named agent stands for itself. A name no agent carries takes no seat.
- Duplicates collapse, keeping their first position.

### The default public room

Without any configuration there is one room, `public`, with `agents: ["*"]` - every agent, the built-ins included. A `rooms.yaml` that defines a room named `public` replaces the default. One that defines only other rooms keeps the default `public` next to them:

```yaml
# ~/.infer/rooms.yaml
rooms:
  - name: public
    agents: [main, explore] # replaces the default public room
  - name: release
    project: /home/me/src/my-service
    agents: [main, code-writer]
```

### Member sessions

Every member keeps its own session in the room with the deterministic id `room-<room>-<agent>`, like the per-sender `channel-<name>-<sender_id>` sessions of [channels](/cli-channels/). The `main` agent of the `public` room keeps `room-public-main`, and `code-writer` in `release` keeps `room-release-code-writer`. Room names have no dash, so the room part of an id ends at the first one and no two seats in different rooms share a session.

## How routing works

The router decides which members a post is addressed to, and there are two ways it works:

- **No decision model** (`router.model: ''`, the default) - only `@mentions` route. A post that mentions `@explore` goes to `explore`, and nothing is guessed.
- **A decision model** (`router.model` set to a `provider/model` id) - the model is asked with the room's members and returns a probability per member. A member is addressed when its probability reaches `router.min_confidence`. A post no member clears the bar for follows `router.fallback`.

This is the same thresholding the judge applies with its [decision-model backend](/cli-judge-mode/#decision-model-judge-backend-decisions): a decision model returns probabilities, and the confidence bar turns them into a decision. Every routed post records who it went to and the router's probability, which [`infer rooms show`](#infer-rooms-show) prints in its `Routing` column.

## The room log

Every post a room sees is appended to one JSONL log per room, under the per-project runtime root of the room's project:

```text
~/.infer/projects/<project-slug>/rooms/<room>.jsonl
```

The log is append-only - one JSON object per line, written by the user or a member:

```json
{
  "author": "user",
  "text": "@explore where is the retry logic?",
  "mentions": ["explore"],
  "routes": [{ "member": "explore", "probability": 1 }],
  "time": "2026-11-23T19:41:00Z"
}
```

`mentions` and `routes` are left out when empty. A line that does not decode, such as one a crash tore mid-write, is skipped on read and costs only itself.

## Inspecting rooms (infer rooms)

### `infer rooms list`

Lists every room with its members resolved now - `"*"` expanded to every agent that exists:

```bash
infer rooms list
infer rooms list --format json
```

The text output is a table of each room's name, project and members. `--format json` prints each room with its members and the session id each one keeps:

```json
[
  {
    "name": "public",
    "project": "/home/me/src/my-service",
    "members": [
      { "agent": "explore", "session_id": "room-public-explore" },
      { "agent": "main", "session_id": "room-public-main" }
    ]
  }
]
```

### `infer rooms show`

Shows one room - its project, the router settings that govern it, its members with their session ids, and the posts of its log:

```bash
infer rooms show public
infer rooms show public --format json
```

The text output lists the project, the router's model (`-` when empty), min confidence and fallback, then a members table (`Agent`, `Session ID`) and a log table (`Time`, `Author`, `Routing`, `Text`). `Routing` shows each route as `member@probability`, and `Text` is cut to one line. A room with an empty log prints `No posts yet.`, and an unknown room name fails with the list of known rooms.

`--format json` prints the same data as one object:

```json
{
  "room": {
    "name": "public",
    "project": "/home/me/src/my-service",
    "members": [{ "agent": "main", "session_id": "room-public-main" }]
  },
  "router": { "Model": "", "MinConfidence": 0.5, "Fallback": "top" },
  "posts": []
}
```
