---
title: Desktop App
description: Inference Gateway Desktop is a provider-agnostic native AI client built with Tauri v2 and React. Bring your own API keys, pick a model, and chat with agents across providers - no silos, no vendor lock-in.
---

# Desktop App

**Inference Gateway Desktop** is a native [Tauri v2](https://tauri.app) + [React](https://react.dev) desktop AI client. It works with any model provider - OpenAI, Anthropic, Google, local Ollama models, and any OpenAI-compatible endpoint. Like Codex or Co-Work, but provider-agnostic: bring your own API keys, pick a model, and work across providers from a single native window.

The app is open-source at [github.com/inference-gateway/desktop](https://github.com/inference-gateway/desktop) and powered by [Inference Gateway](/) under the hood.

## How it works

On first run, the app downloads the `infer` CLI binary, installs it to `~/.infer/bin/infer`, and runs [`infer init`](/cli/#configuration) to seed the userspace baseline - `~/.infer/config.yaml` and the rest of the userspace config. The CLI manages the gateway server and routes requests to whatever provider you configure. The gateway binary lands at `~/.infer/bin/inference-gateway`, and config lives under `~/.infer/`.

On Windows the app spawns every child process - the CLI, the gateway, `git`, `gh`, `ffmpeg` - without a console window, so no terminal flashes while the app works. The CLI's own child processes are not covered by this yet.

Agents run through [`infer daemon`](/cli/#daemon), the CLI's hub. The app starts the daemon, connects to its AG-UI WebSocket binding as a `desktop` client, and asks it for a thread per conversation - it does not spawn a CLI process per prompt. The same daemon serves the [OpenTask browser extension](/opentask/) and the messaging channels, so all of them see one event stream, one approval contract and [one log](/cli/#the-daemon-log).

### ~/.infer layout

| Path                             | Purpose                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| `~/.infer/bin/infer`             | The `infer` CLI - manages the gateway, routes requests, and drives agent interactions    |
| `~/.infer/bin/inference-gateway` | The gateway server binary                                                                |
| `~/.infer/config.yaml`           | Gateway configuration (providers, API keys, model routing)                               |
| `~/.infer/agents.yaml`           | Registered A2A agent definitions                                                         |
| `~/.infer/auth.yaml`             | Provider API keys saved from **Settings -> API Keys**                                    |
| `~/.infer/avatars/`              | [Avatar portraits](#avatars) managed from **Settings -> Avatars**, one folder per avatar |

Everything is scoped to your home directory - no system-wide installs, no vendor lock-in.

## Supported platforms

| Platform      | Asset name            |
| ------------- | --------------------- |
| Linux amd64   | `infer-linux-amd64`   |
| Linux arm64   | `infer-linux-arm64`   |
| macOS amd64   | `infer-darwin-amd64`  |
| macOS arm64   | `infer-darwin-arm64`  |
| Windows amd64 | `infer-windows-amd64` |
| Windows arm64 | `infer-windows-arm64` |

Downloads are available from the [releases page](https://github.com/inference-gateway/desktop/releases).

## First-install friction

Releases are not signed with an Apple Developer or Windows code-signing certificate, so the friction is confined to the **first install**:

- **macOS**: the downloaded `.dmg` is marked as quarantined by Gatekeeper. Right-click the app -> **Open** and confirm to launch it the first time.
- **Windows**: SmartScreen shows a warning. Click **More info** -> **Run anyway** to proceed.

Updates applied by the app itself are downloaded by the app rather than a browser, so they are not quarantined and do not repeat those prompts.

## Updates

The app updates itself. When a newer release is available the top bar shows an update button (the same one is in Settings under Updates). Clicking it reinstalls the `infer` CLI and gateway binaries, then downloads the new app bundle, verifies its signature against the project's updater public key, and relaunches. Checks run at startup and every 6 hours.

## Settings

Open Settings with the gear icon at the right of the top bar. A left rail lists the sections, and **Back** returns to the chat. Settings opens on **API Keys**.

| Section           | What it covers                                                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **General**       | [Max concurrent sessions](#the-concurrency-cap), [Browser Use](#browser-use-opentask-extension), the [text-to-speech toggle](#enabling-text-to-speech), and the [text-to-video toggle](#enabling-text-to-video) |
| **API Keys**      | One API key per provider                                                                                                                                                                                        |
| **Agents**        | A2A agents the local agent can delegate to                                                                                                                                                                      |
| **Workspaces**    | [The `infer` daemon workspaces](#workspaces) an agent can use as [its own computer](#agent-computers)                                                                                                           |
| **Voice samples** | [WAV reference recordings](#voice-samples) for voice cloning                                                                                                                                                    |
| **Avatars**       | [Named portraits](#avatars) used for talking-avatar renders                                                                                                                                                     |
| **Updates**       | Installed versions, manual check, and [Install updates](#updates)                                                                                                                                               |

### API Keys

Each supported provider gets one masked field. Fill in the providers you use and leave the rest blank:

| Provider     | Field                  |
| ------------ | ---------------------- |
| OpenAI       | `OPENAI_API_KEY`       |
| Anthropic    | `ANTHROPIC_API_KEY`    |
| DeepSeek     | `DEEPSEEK_API_KEY`     |
| Google       | `GOOGLE_API_KEY`       |
| Groq         | `GROQ_API_KEY`         |
| Mistral      | `MISTRAL_API_KEY`      |
| Cohere       | `COHERE_API_KEY`       |
| Cloudflare   | `CLOUDFLARE_API_KEY`   |
| NVIDIA       | `NVIDIA_API_KEY`       |
| Moonshot     | `MOONSHOT_API_KEY`     |
| MiniMax      | `MINIMAX_API_KEY`      |
| Ollama Cloud | `OLLAMA_CLOUD_API_KEY` |
| ElevenLabs   | `ELEVENLABS_API_KEY`   |

**ElevenLabs** is the one entry that is not a chat provider: it is the key the gateway needs to render [talking avatars](#text-to-video), and it offers no models to the picker.

**Save** writes the non-empty values to `~/.infer/auth.yaml` (mode `0600` on macOS and Linux; keys still sitting in a legacy `~/.infer/auth.json` are read as a fallback but never written back), returns you to the chat, and restarts the gateway so the new keys take effect - which is also what refreshes the model list. Keys are passed to the agent as environment variables of the same name; nothing is sent anywhere else.

### Model picker

The model dropdown lives in the top bar, next to the **Restart CLI** button, rather than in Settings - but it is where the keys you saved show up as models you can pick.

The list comes from the gateway's [`GET /v1/models`](/api-reference/) endpoint (each entry's `id`), read from the gateway URL in `~/.infer/config.yaml`, defaulting to `http://localhost:8080`. Until the gateway answers, the picker shows **Waiting for gateway...**; the app retries roughly every 1.5 seconds. If the list stays empty, the usual cause is a missing or wrong API key for every configured provider.

Your selection is stored locally and restored on the next launch. If the saved model is no longer offered, the first model in the list is selected instead. The picker is disabled while the conversation you are viewing is streaming - switch to another chat or wait for the turn to finish.

### Agents

The **Agents** tab manages the [A2A](/a2a/) agents your local agent can delegate to. Selections are written to `~/.infer/agents.json` and loaded on startup, so they survive restarts.

**Local A2A agents (containers)** are listed from the public [agent registry](/registry/) catalog, each card showing the agent's name, version, description, and up to four skills. Tick the checkbox to enable an agent and untick it to remove it. The desktop registers local agents by name only, so the CLI assigns each one its known port - you still have to run that agent's container yourself for the delegation to reach anything. If the registry cannot be fetched, the tab shows **Couldn't load the agent registry.** instead of the cards; the rest of Settings is unaffected.

**Setting a model:** an enabled agent that has a model assigned shows a dropdown on its card, listing the same models as the top-bar picker. Pick one to change which model that agent runs on. If the agent's current model is not in the gateway's list, it is kept at the top of the dropdown rather than silently replaced.

**Remote agents** are ones you host or run elsewhere. Type the agent's URL (for example `http://localhost:8085`) into the field at the bottom and click **Add** or press Enter. Remote agents appear in their own list above the field, each with a **Remove** button.

The same tab's **Your agents** card is a different thing: it manages [your own Markdown agents](#your-own-agents), the ones you chat with yourself.

### Workspaces

The **Workspaces** tab is where you register the compute an agent can run on as [its own computer](#agent-computers), or that you [move a chat to](#moving-a-chat), so you no longer have to edit `~/.infer/daemon.yaml` by hand. Each workspace in the tab is one entry of the `infer` daemon's `workspaces` list in that file - see [Workspace kinds](/cli/#workspace-kinds) for the daemon's own reference. **Kubernetes** is the only type the form offers for now, and a type the form does not know (a `kind: local` entry you wrote yourself, say) is listed and can be deleted, but not edited.

Every workspace row shows its type, its `context / namespace`, and whether the daemon can reach it, with the daemon's own error when it cannot. **New workspace** opens the form, the pencil edits a workspace, and the trash deletes it with the same two-click arming as [deleting a conversation](#deleting-one-conversation).

The daemon only reads `daemon.yaml` when it starts, so saving, deleting or detecting shows a **Restart CLI now** button rather than applying the change by itself. **Restarting stops running chats**, which is why it is left to you.

**The form fields and what each one writes:**

| Field                   | `daemon.yaml` key | What it is                                                                                                 |
| ----------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| **Type**                | `kind`            | `kubernetes` is the only choice for now                                                                    |
| **Name**                | `name`            | How the workspace is picked in an agent's editor. Required, and two workspaces cannot share one            |
| **Kubernetes context**  | `context`         | The cluster to run in, suggested from the contexts of your kubeconfig. Required for a Kubernetes workspace |
| **Namespace**           | `namespace`       | Where the sessions run. Required for a Kubernetes workspace                                                |
| **Image**               | `image`           | The image every session's pod runs. It needs the `infer` CLI                                               |
| **Storage**             | `storage`         | The size of a session's volume, for example `5Gi`                                                          |
| **Idle after**          | `idle_ttl`        | How long a pod stays up without work, for example `2h`                                                     |
| **Keep suspended for**  | `retention`       | How long the operator keeps a suspended session before deleting it, for example `24h`                      |
| **Provider keys**       | `gateway_env`     | Variable **names** only, comma separated                                                                   |
| **Forwarded variables** | `forward_env`     | Names of variables the agent itself gets, such as a token it pushes with                                   |
| **Environment**         | `env`             | One `NAME=value` per line. Not for secrets - these land in the pod's spec                                  |

**Provider keys are names, not values.** The value of each name is taken from what you saved under [API Keys](#api-keys) and sent to the workspace's own gateway, never into the agent's pod, so nothing the agent runs can read a provider key into its context. Clearing a field removes its key from the entry, and an edit keeps the keys the form does not know (`mode`, `protocol`) along with every other entry of the file.

**Provision local cluster** is the one-click way to get a cluster at all, when you have none. The button sits next to **New workspace** and appears whenever **Docker is running** - Docker is the only thing it needs, with no `k3d`, `ctlptl`, `kubectl` or `kubeconfig` of your own. It streams each stage into the tab's notice line while it:

- runs k3s as a Docker container named `infer-k3s`, on a fixed local port so the kubeconfig keeps working across restarts
- installs agent-sandbox and the [Inference Gateway operator](/operator/) inside it, the Gateway API CRDs coming with k3s itself
- builds the computer-use Ubuntu desktop image for your installed `infer` version and loads it into the cluster
- adds an `infer-k3s` context to `~/.kube/config`, merged by entry name and leaving your current context alone. An unreadable kubeconfig stops the run rather than being overwritten
- creates the `infer-workspaces` namespace and labels it for the operator
- registers an `ubuntu-desktop` Kubernetes workspace in `~/.infer/daemon.yaml`, with that image and your saved [API keys](#api-keys) as its provider keys

Every step is repeatable, so **a second click repairs or refreshes the same cluster** rather than building a second one. It does refuse to start when an `ubuntu-desktop` workspace already points at **another** cluster - that entry is yours, so nothing is touched and the notice asks you to delete it first.

**Its agents use the computer and edit files without asking.** The provisioned workspace sets `INFER_COMPUTER_USE_ENABLED`, `INFER_COMPUTER_USE_APPROVAL: never` and the write and edit approvals off, because every session runs in a pod of its own and not on your machine.

As with any other change to the tab, the daemon only picks the new workspace up after **Restart CLI now**. Point an agent's [**Computer**](#agent-computers) at `ubuntu-desktop` and its chats get a desktop pod each.

**Detect clusters** fills the tab in from your kubeconfig: one Kubernetes workspace per context that has none yet, named after the context, in the `infer-workspaces` namespace, with the CLI image of the installed `infer` version and the names of your saved API keys as its provider keys. Existing workspaces are never replaced, and a second click adds nothing. It adds **every** context it finds, production clusters included, so review the list and delete what should not host agents.

**Prerequisites check.** Each Kubernetes workspace is checked when the tab opens and again with its refresh button. A cluster that has everything shows **Cluster has everything it needs**, and one that does not names what is missing and how to fix it:

| Item                                  | Means                                                             | Fix                                                                               |
| ------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Cluster reachable**                 | `kubectl` could talk to the context, with its error line when not | Check the context, your kubeconfig and the cluster itself                         |
| **agent-sandbox**                     | The `sandboxes.agents.x-k8s.io` CRD is installed                  | Install agent-sandbox **before** the operator, which looks for it only at startup |
| **Gateway API**                       | The Gateway API CRDs the operator requires are installed          | Install the Gateway API CRDs                                                      |
| **Inference Gateway operator**        | The operator's `Orchestrator` and `Gateway` CRDs are installed    | Install the [operator](/operator/) v0.29.0 or later                               |
| **Namespace `<name>`**                | The namespace the form names exists                               | `kubectl create namespace <name>`                                                 |
| **Namespace managed by the operator** | It carries `inference-gateway.com/managed=true`                   | `kubectl label namespace <name> inference-gateway.com/managed=true`               |

The check needs `kubectl` on your `PATH` - except for the `infer-k3s` context of a [provisioned local cluster](#workspaces), whose `kubectl` calls go through the container - and it looks at the CRDs and the namespace, **not** at whether the controllers behind them are actually running - a cluster that passes can still have a crashed operator.

**The running badge** next to a workspace's type counts the sessions running in it, taken from the `Orchestrator`s in its namespace whose `Ready` condition is true. Hover it for the suspended count, the ones kept for their `retention`. The badge is absent when the cluster cannot list them.

A saved Kubernetes workspace looks like this in `~/.infer/daemon.yaml`:

```yaml
workspaces:
  - name: ubuntu-desktop
    kind: kubernetes
    context: k3d-computer-use
    namespace: computer-use
    image: ghcr.io/inference-gateway/cli:0.245.0
    storage: 5Gi
    gateway_env:
      - OLLAMA_CLOUD_API_KEY
```

[`examples/computer-use`](https://github.com/inference-gateway/desktop/tree/main/examples/computer-use) is a runnable cluster with workspaces like this one already set up.

## Your own agents

An agent of your own is a **Markdown file**, `<name>.md`, in the same format the CLI uses for its [Markdown subagent presets](/cli/#markdown-subagent-presets) - a file written for either one works in both. **Settings -> Agents** lists them in the **Your agents** card, with **New agent**, an **Edit** button and a delete button per row, and the sidebar's **Agents** filter is where you start a chat with one.

A chat with one of your agents **runs as that agent through the CLI**: the app opens the daemon thread with the agent's name and the CLI reads the file itself. What the file decides:

| In the file                                        | In the chat                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| The Markdown body (**Instructions** in the editor) | The chat's system prompt                                                          |
| `model`                                            | The model the chat runs on                                                        |
| `tools`                                            | The only tools the agent may use in that chat                                     |
| `disallowedTools`                                  | Tools removed from that list                                                      |
| `workspace`                                        | The [computer](#agent-computers) its chats run on - a desktop key the CLI ignores |
| `project`                                          | The [project](#agent-projects) its new chats open in - another desktop-only key   |

**The model comes from the agent.** In an agent chat the top-bar [model picker](#model-picker) shows the agent's model read-only - you change it in **Edit agent -> Model**, which writes the front matter. An agent with no model of its own (an empty `model`, or `inherit`) follows the model selected in the top bar instead. `tools` and `disallowedTools` have no field in the editor, so edit the file to set them.

**Where agents are read from**, first match winning on a name:

1. `.infer/agents` of the directory the chat runs in
2. `.agents/agents` of that directory
3. `~/.infer/agents`
4. `~/.agents/agents`

Those are the same four places the CLI resolves an agent from, so the app lists exactly the agents a chat can open. **New agent** saves to `~/.infer/agents`, while editing, renaming, deleting and picking a picture act in the directory the agent was found in - the editor shows that folder under the **Name** field. Settings has no **Agents directory** field any more.

Agent chats need `infer` **v0.247.0 or newer**. An older CLI ignores the agent name, and the chat then runs without the agent's instructions.

### Agent projects

An agent can also default to one of your [project groups](#project-groups). Pick it as the **Project** in the agent's editor - the dropdown lists your projects and defaults to **No project** - and it is saved as `project` in the frontmatter, next to `workspace`:

```markdown
---
name: code-reviewer
description: Reviews the diff of the project it is pointed at
model: ollama_cloud/glm-5.3-flash
workspace: ubuntu-desktop
project: inference-gateway
---
```

Starting a chat with that agent **opens it in that project**, so the chat lands in the project's group and gets its [per-project context](#project-groups). The bar above the composer reads `code-reviewer (inference-gateway)`, or just `code-reviewer` when the chat has no project.

**The folder button in that bar changes it before the first message.** It opens a menu of **No project** plus **Use project `<name>`** for each of your projects, so a single agent still serves whichever project you point it at. Once the chat has started, it keeps the project it ran its first turn in.

A project that has been **renamed or deleted** since the agent was saved is not resolved: the new chat opens with no project, and the editor shows the stale value as `(missing)` until you pick another one.

## Agent computers

One of your own agents can get a computer of its own. Pick it as the **Computer** in the agent's editor - the dropdown lists the workspaces of the `infer` daemon, which you register under [**Settings -> Workspaces**](#workspaces) - and it is saved as `workspace` in the agent's frontmatter:

```markdown
---
name: researcher
description: Researches a topic in the browser of its own computer
model: ollama_cloud/glm-5.3-flash
workspace: ubuntu-desktop
---
```

Every new chat with that agent is teleported to that workspace before its first run, so its [Computer Use](/cli/#computer-use) drives that machine and not yours. A chat that already started can be [moved](#moving-a-chat) too. See [Workspace kinds](/cli/#workspace-kinds) for how the daemon registers and dials a workspace, and [`examples/computer-use`](https://github.com/inference-gateway/desktop/tree/main/examples/computer-use) for a runnable setup of three agents on Ubuntu desktops in a local Kubernetes cluster.

**Computers** in the top bar shows one tile per chat that runs on a workspace. Each tile carries the latest screen of that computer, the agent's face and name, the workspace, the agent's last computer action, and a status:

| Status              | Meaning                                                               |
| ------------------- | --------------------------------------------------------------------- |
| **Working**         | A run is in flight on that computer                                   |
| **Waiting for you** | The run is held on an approval or a question in the chat              |
| **Idle**            | No run in flight - the tile keeps the last screen it managed to fetch |

Tiles with a live run come first, and a running chat's screen is refreshed every 2 seconds. Clicking a tile opens that chat.

### Moving a chat

Any chat that already started can change computer. **Move to workspace** in its composer opens a menu of **this computer** plus the workspaces of the `infer` daemon, asked for when the menu opens: the one the chat runs on carries a check and cannot be picked, and one the daemon cannot reach is listed as `(unreachable)`, disabled, with the daemon's error as its hover. A move happens **between turns** - a turn still running is stopped first, a screen you hold is handed back, and the composer shows the current stage in place of the button until the chat lands.

**What travels** is the conversation and the project: the project's committed state plus a patch of its uncommitted and untracked changes, so the agent on the workspace continues on what you see here. A project directory that has no commit yet gets a repository and an empty first commit on its first move. Moving the chat back restores the project's files into your local folder again.

**The stages the app shows**, straight from the daemon's teleport:

| Stage           | What is happening                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| `provisioning`  | The target readies the session's compute - for a Kubernetes workspace the pod, its volumes and its gateway |
| `checkpointing` | The workspace the chat is leaving stops its worker and bundles the conversation and the project            |
| `restoring`     | The target restores that bundle and resumes the conversation there                                         |

A move that fails leaves the chat **where it was**, with the daemon's own message in the error banner (`Failed to move the chat: teleport to ubuntu-desktop failed: ...`), so a cluster that is missing the operator or a workspace that cannot be dialed costs you nothing but the attempt.

A chat that sits on one workspace **comes home first and then goes to the other one**. Both hops run automatically from the single menu pick, so you never have to bring it back by hand.

**Every chat on a workspace is a computer.** It gets a tile in [**Computers**](#agent-computers) and a **Take over** button, with or without an agent behind it - a plain chat you moved there is driven exactly like an agent's. A chat of an agent that has a **Computer** stays on the workspace it started on, so changing that agent's setting later moves nothing: move the open chat yourself, or start a new one.

**Where a chat runs is recorded** as `workspaces` in `~/.infer/projects.yaml`, keyed by conversation id, so the app still knows after a restart which chats live on which workspace and keeps showing their tiles.

Limits worth knowing:

- **The chat keeps its model.** The gateway of the workspace it lands on has to serve that same model, which means the provider's key belongs in that workspace's [**Provider keys**](#workspaces). Without it the first turn on the workspace fails on the missing key, not on the move. An [agent](#your-own-agents) whose front matter fixes its own model is never quietly switched to the workspace's model: the chat fails with a message naming the key to add, such as `ubuntu-desktop has no key for anthropic. Add ANTHROPIC_API_KEY to its provider keys in Settings > Workspaces`.
- **The record can go stale.** Once the cluster deletes a suspended session after its `retention`, the app still lists the chat on that workspace. Move it back to this computer to carry on from the local copy.

See [Workspace lifecycle and cleanup](/cli/#workspace-lifecycle-and-cleanup) and [Workspace kinds](/cli/#workspace-kinds) for the daemon's own account of teleports, and [`examples/computer-use`](https://github.com/inference-gateway/desktop/tree/main/examples/computer-use) for a cluster to try one on.

### Take over

When the agent reaches a step only a person can do - a login, a captcha, a cookie dialog in its way - **Take over** claims that screen for you. The button is on every computer tile and in the composer of an agent chat that runs on its own computer, and either one opens the Computers view with that screen filling it.

While you hold the screen:

- The agent's computer input **waits** for the hand-back. Its observations keep working.
- The view shows the screen live, refreshed every 300 ms.
- Clicks, double clicks, the wheel and keys inside the image go to that computer, one input after the other.

**Hand back** releases the screen, and so does pressing `Esc` twice. The agent then gets a single message to continue and starts from a fresh screenshot of what you left behind - it is not told the individual clicks and keystrokes you made, so a password or a one-time code typed during a take-over never reaches the transcript or the model's context.

Requirements and limits:

- `infer` **v0.245.0 or newer**. The take-over itself lives in the daemon, so the same feature is available from the CLI's web terminal - see [Take-over Mode](/cli/#take-over-mode).
- **One person holds a screen at a time.** Taking over a second computer hands the first one back, and a claim from another client is refused while you hold it.
- **A held key does not repeat.** Each key press sends one input.

## Chat and tool approval

Start a conversation by typing into the chat input and pressing Enter. The agent processes your request and streams the response back in real time.

When the agent wants to perform a tool action (read a file, execute a command, fetch a URL, or any other operation on your machine), it requests **permission** before proceeding. A prompt appears in the chat UI showing:

- The **tool** the agent wants to call
- The **arguments** it plans to pass

You click **Approve** to allow the action or **Deny** to reject it. This keeps the agent sandboxed to your intent - no silent file access, no unapproved side effects.

### Cancelled tool calls

A tool card ends in one of three states. Done is the normal result, failed is highlighted in red, and **cancelled** is a third, distinct state: the card turns grey and carries a `(cancelled)` tag instead of its output.

A call shows as cancelled when it never produced a result - you stopped the run while it was pending, for example at its approval prompt, or the CLI cancelled it itself. The card stays in the transcript rather than disappearing, so you can see which call was dropped and where the turn stopped.

### Conversation optimized notes

A note reading **Conversation optimized - X to Y messages** appears in the transcript when the CLI compacted a long conversation before running your request. It tells you history was summarized, not lost, and how many messages the run actually started from.

It needs `compact.enabled` (on by default), a model whose context window the CLI knows, and a conversation that has grown past `compact.auto_at` percent of that window - see [Compaction](/cli/#compaction) for the settings.

Both the cancelled state and the optimization note need `infer` **v0.246.0 or newer**, which sends them as AG-UI activities. Against an older CLI the transcript still works - a dropped call simply stays unfinished and no note appears.

### The slash menu

Typing `/` in the composer opens the slash menu. Every row is labelled with its kind, using the same wording as the [CLI autocomplete](/cli/#autocomplete-kinds):

| Label          | What `/<name>` does                                                             |
| -------------- | ------------------------------------------------------------------------------- |
| `command`      | Runs a built-in shortcut compiled into the CLI (`/model`, `/tools`, `/agents`)  |
| `shortcut`     | Runs a YAML shortcut from `.infer/shortcuts/*.yaml` (`/git`, `/mcp`, `/skills`) |
| `skill`        | Activates an installed [Agent Skill](/cli-skills/) for the turn                 |
| `remote skill` | Downloads a catalog skill first, after you confirm, then activates it           |

### The `@` file menu

Typing `@` at the start of the text or after a space opens a menu of the project's files, filtered by whatever you type after the `@`. **ArrowUp** and **ArrowDown** move through the rows, **Enter** inserts `@<path>`, and **Escape** closes it. Paths are relative to the project, followed by your `~/.infer` files as `~/.infer/<path>`. Hidden files, ignored directories and files beyond the expansion size limits are not offered.

On send, the CLI's worker expands each `@<path>` token before the run starts, so the agent sees the file rather than the token:

- A text file is inlined as a fenced block.
- A Markdown file contributes its `## Summary` section when it has one, and is inlined in full otherwise.
- A reference that does not resolve to a readable file stays in the message as typed.

See [Project file references](/opentask/#project-file-references) for the daemon frames behind the menu.

### The `#` issue menu

Typing `#` opens a menu of the project's **open GitHub issues**, each row shown as `#<number> <title>` and filtered by number or title. **Enter** inserts `#<number>`, which the worker expands into the issue's title, body and most recent comments before the run - at most **10 distinct issues** per message, with anything past the cap left as the raw token.

The menu needs a git repository with a GitHub remote, plus the [`gh` CLI](/cli/#github-operations) installed and authenticated. Without those it shows nothing rather than reporting an error. A `#` inside a word, such as `C#` or a URL fragment, opens nothing - the token only counts at the start of the text or after whitespace.

This is the same autocomplete the chat TUI offers, see [GitHub Issue References](/cli/#github-issue-references).

Both menus need `infer` **v0.246.0 or newer**. Against an older CLI they stay empty and the composer behaves as if you had typed an ordinary `@` or `#`.

## Reasoning and thinking view

Models that emit reasoning show it in the transcript in a collapsible **Thought process** block, rendered above the answer for that turn. It is collapsed by default - click the summary to expand it and read the reasoning. Reasoning is streamed live, so an expanded block fills in as the model thinks rather than appearing all at once when the turn ends.

While the model is working, an animated **thinking indicator** (pulsing dots) sits at the bottom of the transcript. It appears when you send a message and stays visible for the whole turn - through reasoning, streamed answer text, and tool calls - and resumes after you approve or deny a tool. It disappears only when the turn ends: completion, cancellation, an error, or a pending approval prompt.

Tool calls in the same turn render as their own collapsible cards next to the reasoning block, each labelled with the tool name and a preview of its arguments. Expand one to see the full arguments and the tool output; a running call shows an animated ellipsis, and a failed call is highlighted in red.

Reasoning requires a model that emits it and an `infer` CLI new enough to forward it. Against an older CLI the transcript still works - you just get no **Thought process** block.

## Images in chat

Images an agent produces are rendered inline in the transcript, not shown as a link or a file path. Markdown images (`![alt](url)`) render as-is, and a bare image URL or `data:image/...` URI on its own is turned into an image too. Images are sized to their natural dimensions up to the width of the chat bubble; one that fails to load is replaced with a short error line instead of a broken-image icon.

Hover an image (or focus it with the keyboard) to reveal a **download** button in its corner. Clicking it copies the file out of the session's [media root](/cli/#media-directories) to your Downloads folder - there is no save dialog, and an existing file with the same name is overwritten. The button reports what happened by swapping its icon:

| Icon           | State                                         |
| -------------- | --------------------------------------------- |
| Download arrow | Idle - ready to save                          |
| Spinner        | Saving - the copy is in progress              |
| Green check    | Saved - the file is in your Downloads folder  |
| Red cross      | Error - the copy failed, hover again to retry |

The button is disabled while saving, and the check or cross reverts to the download arrow after about two seconds.

## Conversations

The left sidebar lists your conversations, newest work at hand: a session that is running but has not been persisted yet is shown at the top, titled by its first prompt (or **New chat** until you send one), followed by the conversations saved on disk. A saved conversation with no title yet shows **(untitled)**; hover any entry to see its title, or its session id if it has none.

Click an entry to open it. The transcript is loaded from storage, so history survives restarts - except for a conversation that is still live in this app session, whose in-memory transcript is kept rather than being replaced by the on-disk copy.

### Deleting one conversation

Hover a conversation and a trash icon appears at its right edge. It is a two-click delete: the first click arms the button (it turns red, tooltip **Click again to delete**), the second deletes. Moving the pointer off the entry disarms it, so a stray click costs nothing.

Deleting a conversation that is currently running cancels its session first. Deleting the one you are viewing returns you to a new chat.

### Multi-select and bulk delete

You can select several conversations and delete them in one go:

| Action                                  | Result                                                    |
| --------------------------------------- | --------------------------------------------------------- |
| **Click**                               | Opens the conversation - and clears any current selection |
| **Ctrl+click** (**Cmd+click** on macOS) | Toggles that one conversation in or out of the selection  |
| **Shift+click**                         | Selects the contiguous range from the last clicked entry  |

Selected entries are tinted with an accent background and an accent bar on the left. Starting a **+ New chat** clears the selection too.

With at least one entry selected, a bar pins to the bottom of the sidebar with a **Delete N selected** button. It confirms the same way as the single delete: the first click arms it (**Click again to delete N**), the second deletes; moving the pointer off cancels. The deletions run in parallel and the list refreshes when they finish.

### Where conversations are stored

The app does not keep its own conversation store - it shells out to the [`infer` CLI's conversation management](/cli/#conversation-management) (`infer conversations list`, `show`, and `delete`), so the desktop app and the CLI see the same history.

With the default JSONL backend that means `~/.infer/projects/<project-slug>/conversations/`, one directory per project; with SQLite it means the shared `~/.infer/conversations.db`. Listings are scoped to the project the CLI runs in, and the desktop app runs it from your home directory. Point [`storage`](/cli/#conversation-management) at another backend in `~/.infer/config.yaml` and the sidebar follows it. Deletes go to the storage backend and are not recoverable from the app.

### Project groups

Organize conversations into named project groups in the sidebar. Each group
is a collapsible heading with a conversation count. Conversations that belong
to no group sit in the default **ungrouped** area.

- **Create** -- click the **New project** button at the bottom of the
  sidebar, type a name, and press Enter.
- **Rename** -- double-click the heading (or click the pencil icon on hover)
  and edit inline.
- **Delete** -- click the **X** on hover. Deleting a project removes the
  group but keeps the conversations -- they move to the ungrouped area.
- **Move conversations** -- drag a conversation from one group to another,
  or to the ungrouped area. The cursor shows where the item lands. You can
  also drag multiple selected conversations at once.
- **Collapse** -- click the chevron next to a heading to hide or show its
  conversations.

A project indicator appears at the top of the chat composer when a
conversation belongs to a project. New chats started while a project is
selected (the heading is highlighted in the sidebar) are automatically
assigned to that project.

**Per-project context** is managed in **Settings -> Projects**. Each project
has a text area for extra instructions that are sent with every message in
that project, alongside any global extra instructions.

Assignments are stored in `~/.infer/projects.json`, a JSON file with
`assignments`, `names`, and `contexts` keys. The desktop owns this file
entirely -- it is never read or written by the gateway or the CLI, and
project groups do not sync to any backend.

## Content projects

A **content project** is a project switched to the **Content** type in **Settings -> Projects**.
The agent gets the bundled `video-editing` skill and the tools it needs (`ffmpeg`,
`whisper-cli`), and the desktop renders a `<stem>.timeline.json` file in the project folder as an
editable timeline: a video lane, audio lanes for the cloned voice and music, **overlay** lanes for
animated cards, and a **captions** lane for on-screen text.

The agent only ever writes the timeline JSON and the media it generates. Rendering is the
desktop's job: you review the plan on the timeline and press **Export**.

### Project layout

| Path                   | Contents                                                                   |
| ---------------------- | -------------------------------------------------------------------------- |
| `<stem>.timeline.json` | The timeline - the contract between the agent, the editor, and the export  |
| `media/`               | The media pool: recordings, music, synthesized voice clips, rendered cards |
| `cards/`               | The HTML compositions that overlay cards are rendered from                 |
| `export/<output>`      | Where **Export** writes the finished video                                 |

Clip `src` paths are relative to the project folder and point into `media/`, so the folder stays
self-contained.

### Timeline contract

```json
{
  "version": 1,
  "duration": 42.3,
  "output": "demo.with-voice.mp4",
  "resolution": "1920x1080",
  "fps": 30,
  "source_audio": "transcribe",
  "tracks": [
    {
      "id": "video",
      "kind": "video",
      "clips": [
        { "id": "v1", "src": "media/demo.mov", "start": 0, "end": 30 },
        {
          "id": "v2",
          "src": "media/demo.mov",
          "start": 30,
          "end": 42.3,
          "offset": 61.5,
          "scale": 1.4,
          "x": 0.35,
          "y": 0.5
        }
      ]
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
          "voice_sample": "sample.wav",
          "status": "done"
        }
      ]
    },
    { "id": "music", "kind": "audio", "gain": 0.2, "clips": [] },
    {
      "id": "captions",
      "kind": "captions",
      "style": "classic",
      "position": "bottom",
      "clips": [
        { "id": "c1", "start": 0.0, "end": 4.6, "text": "First we open the settings panel." },
        {
          "id": "c2",
          "start": 4.6,
          "end": 9.2,
          "text": "Then pick a voice",
          "words": [
            { "text": "Then", "start": 4.6, "end": 5.1 },
            { "text": "pick", "start": 5.1, "end": 5.5 },
            { "text": "a", "start": 5.5, "end": 5.6 },
            { "text": "voice", "start": 5.9, "end": 6.4 }
          ]
        }
      ]
    },
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
| `fps`          | Optional. The rate the export renders at, `30` when absent. There is no control for it - the agent writes it                 |
| `source_audio` | What to do with the recording's own audio: `transcribe`, `mute`, or `keep`                                                   |
| `tracks`       | Lanes of the timeline, each with an `id`, a `kind`, and `clips`                                                              |

#### Track kinds

| Kind       | Lane                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `video`    | The picture: one or more clips, played in `start` order                                        |
| `audio`    | Spoken clips (a clip with `text`) and plain files such as music, mixed with the track's `gain` |
| `overlay`  | Animated cards composited over the picture                                                     |
| `captions` | On-screen text drawn over the picture, one track per timeline                                  |

The older `voice` kind still loads as `audio`.

#### Video clips

A video track holds as many clips as the cut needs - one recording chopped into pieces, or several
different files - and the export plays them in `start` order. A gap between two clips is black.

| Field          | Meaning                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src`          | The file under `media/`                                                                                                              |
| `start`, `end` | When the clip is on screen, in seconds on the finished video                                                                         |
| `offset`       | Optional. Where the clip starts inside its `src` file, in seconds. `0` when absent - the desktop sets it when you trim a clip's head |
| `scale`        | Optional. A multiplier on the size that covers the export frame. `1` (the default) fills the frame and crops                         |
| `x`, `y`       | Optional. The centre the clip is framed on, as fractions (0-1) of the frame. `0.5`, `0.5` when absent                                |
| `avatar`       | Optional. The [avatar](#avatars) this clip was rendered from - present only on an avatar clip                                        |
| `voice_sample` | Optional. The sample the paired spoken clip was cloned from, copied here so the lane can colour the clip                             |
| `status`       | Optional. On an avatar clip: `draft` means it still needs rendering, `done` means the mp4 at `src` is current                        |

So a clip plays its `src` from `offset` for `end - start` seconds. `scale`, `x`, and `y` are what
the framing controls under the preview write; an untouched recording carries none of them.

#### Avatar clips

A talking avatar is an ordinary video-track clip that happens to be a render of a face speaking one
spoken clip - not a new track kind. The two are paired by id: the avatar clip is
`"<spoken id>-avatar"` and carries the spoken clip's `start` and `end`.

```json
{ "id": "video", "kind": "video", "clips": [
  { "id": "s1-avatar", "start": 0, "end": 6.2, "src": "media/demo-s1-avatar.mp4",
    "avatar": "presenter", "voice_sample": "eden.wav", "status": "done" } ] },
{ "id": "voice", "kind": "audio", "voice_sample": "eden.wav", "clips": [
  { "id": "s1", "start": 0, "end": 6.2, "text": "Hi, welcome to the demo.",
    "src": "media/demo-s1.wav", "voice_sample": "eden.wav", "status": "done" } ] }
```

The voice stays on the spoken clip. The export mixes that wav, not the mp4's own sound, so a
timeline with avatar clips never sets `source_audio: "keep"` - that would play the voice twice.

Re-synthesizing a spoken clip puts its avatar clip back to `draft`, and **Redo drafts** re-renders
only the draft avatar clips, leaving finished ones alone.

#### Spoken clips

A clip on an `audio` track with `text` is spoken: the agent synthesizes it and writes the wav to
`src`.

| Field          | Where | Meaning                                                                                   |
| -------------- | ----- | ----------------------------------------------------------------------------------------- |
| `text`         | Clip  | What the voice says                                                                       |
| `status`       | Clip  | `draft` means it still needs synthesizing; `done` means the wav at `src` is current       |
| `voice_sample` | Clip  | Optional. The sample this clip's wav was cloned from. The timeline colours the clip by it |
| `voice_sample` | Track | The sample used for spoken clips that carry none of their own                             |

Picking a different sample for a clip in the inspector puts it back to `draft`, so **Redo drafts**
synthesizes it in the new voice; other clips on the lane keep theirs.

#### Overlay clips

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

#### Caption clips

A `captions` track carries the look of the text; its clips carry the text itself.

| Field      | Where | Meaning                                                                                                          |
| ---------- | ----- | ---------------------------------------------------------------------------------------------------------------- |
| `style`    | Track | The preset name - `classic`, `bold`, `highlight`, or `karaoke`. An unknown name falls back to `classic`          |
| `position` | Track | Optional. `bottom` (default), `center`, or `top`                                                                 |
| `x`, `y`   | Track | Optional. The centre of the caption block as fractions (0-1) of the frame. Set together they win over `position` |
| `id`       | Clip  | Stable identifier - the agent keeps it across edits                                                              |
| `start`    | Clip  | When the caption appears, in seconds on the video                                                                |
| `end`      | Clip  | When it disappears                                                                                               |
| `text`     | Clip  | The line to draw. Empty means "a range waiting for the agent to fill"                                            |
| `words`    | Clip  | Optional. Per-word timing, `{ "text", "start", "end" }` in absolute seconds, for the two word-by-word presets    |

One captions track per timeline, and caption clips never carry `src` or `status` - there is no
media behind a caption, so there is nothing to synthesize.

### Overlay cards

A card is an HTML composition rendered by [HyperFrames](https://github.com/heygen-com/hyperframes)
to a ProRes 4444 `.mov` with alpha, then placed as a clip on an overlay track.

#### Prerequisites

The agent reports missing prerequisites and stops - it never installs them. Set them up once:

| Prerequisite                   | How                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| The `hyperframes` skill        | [`infer skills install hyperframes motion-graphics --user`](/cli-skills/), or **Settings -> Skills** |
| Node.js 22 or newer            | `node --version` must print `v22` or higher                                                          |
| An `ffmpeg` that encodes H.264 | Bundled - only Intel Macs need their own. See the export troubleshooting below                       |
| A Chromium for HyperFrames     | Run `npx hyperframes browser ensure` once in a terminal if a render fails                            |

#### Card kinds

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

#### Rendering

```sh
npx --yes hyperframes render -c cards/<id>.html --format mov -o media/<id>.mov --quiet
```

Always `--format mov`: mp4 has no alpha channel, and the desktop's preview drops the alpha of a
VP9 WebM, so a WebM card shows a black box in the preview (it still composites correctly on
export). ProRes is large, so keep cards under about 10 seconds.

#### Sizing

- The export frame is the timeline's `resolution`. A full-frame card is a composition of exactly
  that size.
- A smaller card keeps the same pixel density: in a 1920-wide frame, `width: 0.4` is a 768 px wide
  composition.
- The composition's duration is the clip's `end - start`.

To change a card, edit the file named by its `html` and render over the same `src`; `start`, `end`,
and the placement fractions are edited on the timeline and need no re-render.

### Captions

Captions are drawn by the desktop itself: the same renderer paints the preview and the exported
frame, so what the preview shows is what the export burns in. No subtitle file is loaded at export
time and `libass` is not needed.

#### Preset catalogue

`style` picks one of four looks. Each preset is a whole look - size (a fraction of the frame
height), weight, case, outline, and colour - not one look with different word colouring.

| Preset      | Look                                                                       | Needs `words` |
| ----------- | -------------------------------------------------------------------------- | ------------- |
| `classic`   | A broadcast subtitle: white semibold text on a translucent rounded box     | No            |
| `bold`      | A short-form punch line: huge uppercase yellow with a thick black outline  | No            |
| `highlight` | Each word turns green as it is spoken and stays green; the rest stay white | Yes           |
| `karaoke`   | Words are dim grey until they are spoken, then white                       | Yes           |

`classic` and `bold` ignore `words` entirely. `highlight` and `karaoke` need it: without `words` a
clip is drawn as one whole line in the preset's spoken colour, so the effect is lost but nothing
breaks. Use `classic` unless you want a word-by-word look or a clip for a muted feed.

A line wraps to at most 90% of the frame width and sits a frame-height margin away from the edge
`position` names. Dragging the caption block on the preview sets the track's `x`/`y` instead;
double-clicking it clears them and puts the block back on `position`.

#### In the editor

- The captions lane sits with the overlay lanes above the video. Its preset is a select on the
  lane header, so switching the whole look is one click. The `+ Captions` button under the lane
  headers adds the lane, and disappears once the timeline has one.
- `+` on the lane header inserts a caption at the playhead - five seconds long, or shorter if
  another caption is in the way. When the playhead sits inside a caption the new one starts at
  that caption's end, so caption clips never overlap.
- Caption text is edited in place in the inspector, and caption clips move, trim, and delete like
  every other kind.
- **Speak this** on a caption adds a draft spoken clip with the same text and range on the voice
  track; **Redo drafts** then synthesizes it. The two tracks are independent afterwards - editing
  the caption does not touch the spoken clip.

#### Asking the agent for captions

The toolbar's captions button asks the agent for a captions track in the lane's current style. The
`video-editing` skill then:

- Takes the text from the timeline's spoken clips when it has them, and otherwise from the whisper
  transcript of the recording (`source_audio: transcribe`). With neither there is nothing to
  caption, and the agent says so rather than inventing lines.
- Chunks one caption per breath: about 5 seconds, at most ~12 words and two lines, breaking at
  sentence ends and pauses, never mid-word or mid-number. A long spoken clip splits into several
  captions inside its own range.
- Runs a second `whisper-cli -ml 1` pass for word timing, but only for `highlight` and `karaoke`,
  and writes `words` as absolute seconds on the timeline.
- Writes the JSON and stops. You review the captions on the timeline and press **Export**.

Asking for a change to one caption changes that clip's `text`: a misheard word is not a reason to
rebuild the track. A caption you add with empty `text` is a range for the agent to fill; one you
type yourself stays verbatim.

### Asking the agent for a talking avatar

Ask for a talking avatar, a presenter, or a talking head in a Content project and the
`video-editing` skill:

- Picks the avatar: the clip's own `avatar` when it has one, otherwise the single avatar in your
  [library](#avatars) - and asks you which one when there are several.
- Writes the script and voices it as spoken clips with `TextToSpeech`, exactly as for any voiceover.
- Renders each clip with `TextToVideo { avatar, audio, output_path }`, then copies the mp4 into
  `media/`.
- Places each render on the video track over its spoken clip, as an [avatar clip](#avatar-clips).
- Stops there. You review the result on the timeline and press **Export**.

This needs [Text to speech](#enabling-text-to-speech) and [Text to video](#enabling-text-to-video)
both enabled, an ElevenLabs key, and at least one avatar in the library.

### The timeline editor

- An avatar clip is labelled `<avatar>: <file>` and carries a coloured stripe per avatar, the same
  way spoken clips are coloured by their voice sample.
- Overlay lanes sit above the video lane and show thumbnails of their cards. Their clips move,
  trim, and delete exactly like audio clips.
- The preview stage draws the whole picture, with the export frame sharp inside a thin outline and
  whatever falls outside it blurred and dimmed - so you can see what a crop is leaving out. Cards
  and captions play over the video inside their time range, at the position their fractions
  describe: what is sharp is what the export puts there.
- Drag the video on the stage to move it and scroll to zoom; the slider under the preview does the
  same scaling, and arrow keys step it finely. **Fit** scales the whole clip to sit inside the
  frame, **Fill** puts it back to covering the frame with no offset (it clears `scale`, `x`, and
  `y`). The controls apply to the clip under the playhead, so each video clip is framed on its own.
- Dragging a clip's head moves what is under it with it: `start` and `offset` rise together, so
  trimming the head cuts the beginning off instead of sliding the picture. The tail of a plain file
  clip stops at the end of its source.
- The **Frame** select sets `resolution`.
- **Export** is enabled as soon as a timeline has overlay clips, even with no voice clips.

### Export

The export is deterministic: frame _n_ is always drawn at exactly `n / fps`, never in real time, so
the same JSON produces the same video.

1. The desktop composes each frame itself, at the timeline's `fps` and with the renderer the
   preview uses: the video clip that covers that moment, scaled and positioned by its `scale` and
   `x`/`y`, then the overlay cards that are on screen, then the caption that covers it.
2. The finished frames are handed to `ffmpeg` as raw pixels, so there is no video filter in the
   export at all - no scale, no pad, no `overlay`, no `subtitles`. Captions are already part of
   the picture.
3. `ffmpeg` mixes every audio clip at its track `gain`, delayed to its start, plus the recording's
   own sound when `source_audio` is `keep`, and encodes the result.
4. The video is written to `export/<output>`, out of the media pool. **Reveal** opens it there.
5. A timeline with captions also gets `export/<stem>.srt` next to it - the sidecar to upload to
   platforms that take their own subtitle file. Empty captions are left out of it.

### Content project troubleshooting

#### A card shows a black background in the preview

The card is a VP9 `.webm`. The webview plays WebM but drops its alpha channel, so the card renders
on black. Re-render it as a `.mov` (ProRes 4444, or HEVC with alpha):

```sh
npx --yes hyperframes render -c cards/<id>.html --format mov -o media/<id>.mov --quiet
```

The export draws its frames with the same renderer as the preview, so a `.webm` card lands on black
there too. `.mov` is the format to use.

#### The agent says Node.js 22 or newer is needed

HyperFrames needs Node 22+, and neither the desktop nor the agent installs it. Install a current
Node (for example `brew install node` or [nvm](https://github.com/nvm-sh/nvm)), confirm with
`node --version`, and ask the agent to render the card again.

If the render then fails because HyperFrames or its browser is missing, run
`npx hyperframes browser ensure` once in a terminal - the agent will not run it for you.

#### The app says no ffmpeg that can mix audio and encode H.264 was found

The export needs an `ffmpeg` that lists the `adelay`, `amix`, and `apad` filters and the `libx264`
and `aac` encoders. On a fresh install the desktop's own copy in `~/.infer/bin/tools/ffmpeg` covers
all of that - it ships with `libx264` and screen capture on macOS (Apple Silicon), Linux and
Windows - so export works with nothing else installed. Two cases still fall back to a full `ffmpeg`
on your `PATH`:

- An install carrying an older bundled copy, from before the bundled tools gained `libx264`.
  Updating the app replaces it.
- **Intel Macs**, which get no prebuilt bundled tools at all.

For those, install a full `ffmpeg` (`brew install ffmpeg`) and check it:

```sh
ffmpeg -hide_banner -filters | grep -E ' (adelay|amix|apad) '
ffmpeg -hide_banner -encoders | grep -E ' (libx264|aac) '
```

Captions need nothing extra here - the desktop draws them into the frame, so no `libass` and no
`subtitles` filter is involved.

#### Highlight or Karaoke captions show a plain line

Both presets colour each word as it is spoken, which needs the clip's `words` timing. Without it
the whole line is drawn at once in the preset's spoken colour. Ask the agent to add word timing to
the captions, or switch the lane to `classic` or `bold`, which never use it.

## Parallel sessions

You can run several agent sessions at once. Click **+ New chat** while another conversation is streaming and start typing - each session is a [daemon thread](/cli/#threads) with its own session worker, so they stream independently. `+ New chat` is never disabled by a running session.

Every conversation keeps its own transcript and approval prompts. Switching the active conversation mid-stream does not interrupt the others: a session you navigate away from keeps running in the background, and its output is waiting when you switch back.

### The concurrency cap

The number of sessions that can run at the same time is capped. Set it in **Settings -> General -> Max concurrent sessions**; the default is **5** and the minimum is 1. The value is stored locally in the app and persists across restarts.

The cap is checked when you start a **new** chat. If that many sessions are already running, the send is rejected with:

```text
Max 5 concurrent sessions reached - stop one to start another
```

Nothing is queued - the message is not sent. Stop or wait for a running session (or raise the cap in Settings), then send again. Sending another message into a conversation that is already open is not affected by the cap.

### Session status in the UI

Each conversation in the sidebar shows a status dot while it is active:

| Dot           | Meaning                                                       |
| ------------- | ------------------------------------------------------------- |
| Pulsing green | The session is running - the agent is working or streaming    |
| Amber         | The session is paused awaiting a tool approval - it needs you |
| No dot        | The session is idle                                           |

Amber is the one to look for when several sessions are in flight: it marks the conversation blocked on your **Approve** or **Deny**. A session that has started but has not been saved yet still appears in the sidebar so you can switch to it while it runs.

Quitting the app stops every running session.

## Browser use (opentask extension)

**Settings -> General -> Browser Use** lets the agent drive **your everyday browser** - the one with your sessions and logins - through the [OpenTask extension](/opentask/), instead of a separate automated browser. It is off by default.

Ticking **Enable Browser Use (extension)** writes `~/.infer/browser_use.yaml`:

```yaml
enabled: true
backend: extension
extension:
  port: 52789
  token: <generated when none is set>
```

Only those keys are touched; anything else you configured for the CLI passes through untouched. The connection is served by [`infer daemon`](/cli/#daemon) on `127.0.0.1:52789` (or on `extension.port` if you changed it), not by the app itself, and it comes up immediately - no restart.

### Connecting the extension

1. Enable the checkbox in **Settings -> General -> Browser Use**.
2. Settings shows the **port** and the **token**, each with a **Copy** button.
3. Open the [OpenTask extension](/opentask/) options and paste both in.

A browser indicator appears above the composer while the feature is enabled, showing **Browser connected** or **Browser disconnected**. It is hidden entirely when Browser Use is off.

The extension stays connected between agent turns. A browser tool call - `browser_navigate`, `browser_click`, `browser_type`, `browser_read`, `browser_screenshot` or `browser_tabs` - travels from the session worker through the daemon to the extension, which runs it in the controlled tab. The wire contract is documented in the [OpenTask bridge protocol](/opentask/#cli-bridge-protocol).

### One browser, many sessions

There is only one real browser, so the daemon owns it and serializes access:

- Only the daemon binds the extension port. The app, a terminal `infer chat` and a standalone `infer headless` with `backend: extension` all reach the browser as daemon clients, so nothing has to hand the port back. The CLI ones start the daemon themselves on the first browser call.
- Browser commands from every source - the app, the daemon's session workers and the CLI clients - are serialized rather than interleaved on the same tab, and each answer goes back to whoever asked.
- When no extension is connected, browser tool calls fail with `no browser extension connected on port <port>`, and the indicator follows the `browser_extension_status` event.

### Troubleshooting

If the indicator stays on **Browser disconnected**, check that the port and token in the extension options match Settings exactly, and that the extension is loaded and enabled.

Connects, disconnects and routing errors are logged to [`~/.infer/logs/daemon-<date>.log`](/cli/#the-daemon-log) with the client kind, the extension version and the protocol version, so that file shows whether the extension ever reached the daemon.

## Voice input

Click the microphone icon in the chat composer and speak - your speech is transcribed locally and inserted into the message box. Unlike the [CLI speech-to-text](/cli-speech-to-text/), the desktop app sets everything up for you: no Homebrew, no manual `whisper-cpp` install.

On first use a one-time prompt asks to download voice support (~75 MB). On approval the app downloads a prebuilt `whisper-cli` binary and the `ggml-tiny.bin` model with a progress indicator, then starts recording. Later use skips the download.

| File                  | Path                                           |
| --------------------- | ---------------------------------------------- |
| `whisper-cli` binary  | `~/.infer/bin/whisper-cli` (`.exe` on Windows) |
| `ggml-tiny.bin` model | `~/.infer/models/whisper/ggml-tiny.bin`        |

These are shared with the CLI - if you have already used speech-to-text there, the desktop app reuses them. You can also point at your own build: `WHISPER_BIN` wins if set, otherwise a `whisper-cli` or `whisper-cpp` on `PATH` is used as-is, and only failing both does the download run.

Voice input works on every supported platform except Windows arm64, where clicking the microphone shows **"Voice input isn't available on this platform"**.

**Intel Macs** are the exception to the automatic setup: no prebuilt `whisper-cli` is published for them, so the download has nothing to fetch. Install one yourself (`brew install whisper-cpp`) and make sure `whisper-cli` or `whisper-cpp` is on your `PATH` - the app uses it as-is. The same machines need a full [`ffmpeg` on `PATH`](#the-app-says-no-ffmpeg-that-can-mix-audio-and-encode-h-264-was-found) for timeline export.

## Text to speech

The other direction - spoken audio out - is handled by the [`infer` CLI's `TextToSpeech` tool](/cli-text-to-speech/). The desktop app synthesizes nothing itself: it flips the feature on, plays the resulting WAVs, and manages the reference recordings used for voice cloning.

### Enabling text to speech

**Settings -> General -> Text to speech -> Enable Text to Speech**. It is off by default; while it is off the `TextToSpeech` tool is not sent to the model at all.

Saving writes `text_to_speech.enabled` to `~/.infer/config.yaml` and, if the toggle changed, restarts the desktop-owned gateway - the same restart path as saving an API key. The restart is what makes the feature work: the gateway reads `AUDIO_ENABLED=true` and `AUDIO_LOCAL_AUTO_DOWNLOAD=true` at spawn, and those are only passed while the toggle is on, so [`POST /v1/audio/speech`](/api-reference/#audio-api) is unreachable until the gateway comes back up.

Only `enabled` is written. The other keys in the `text_to_speech` section - `engine`, `model`, `voice`, `output_dir` and the rest of the [configuration reference](/cli-text-to-speech/#configuration-reference) - are CLI-managed and pass through untouched, so a config you tuned for the CLI survives a save from the desktop.

### Playback in the transcript

A WAV produced by the tool renders inline in the transcript as an audio player rather than a file path: play/pause, a waveform decoded from the file itself, click anywhere on it to seek, and elapsed/total time. Hover it to reveal a **download** button that copies the file to your Downloads folder, reporting itself with the [same icon states](#images-in-chat) as the image download button.

The same player is used for [voice samples](#voice-samples).

**Output-dir caveat:** only WAVs inside the app's asset scope can be played or downloaded - the [media root](/cli/#media-directories) of the project whose sessions the app runs (`tts/` under it is the default `text_to_speech.output_dir`), plus `~/.infer/models/tts/samples/` and the legacy `~/.infer/tts/`. Point `output_dir` at a directory outside those and the turn degrades to a plain tool card showing the path - the audio is still generated, it just cannot be played or downloaded from the app.

### Voice samples

**Settings -> Voice samples** is a managed library of WAV reference recordings for zero-shot voice cloning, stored flat in `~/.infer/models/tts/samples/` (created on first use, next to the CLI's TTS model cache). Only `.wav` files are listed, non-recursively, sorted by name.

| Action      | How                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Add**     | **Add sample** opens the native file picker, filtered to `.wav`. The file is copied in under its base name, overwriting a sample of that name |
| **Record**  | Type a name, click the microphone, speak, click again to stop. Captured at the device's native sample rate, auto-stopped after 30 seconds     |
| **Preview** | Every sample card carries the same audio player as the transcript, download button included                                                   |
| **Delete**  | The trash icon on the card. Single click, no confirmation - the file is removed from disk                                                     |

A recording is saved as `<name>.wav` (the `.wav` is added for you; the name defaults to `my-voice`) and needs microphone permission - denying it shows **Microphone access denied**. Anything other than a `.wav` is rejected, and names must be bare file names, no directories.

To use a sample, name its full file name in chat: _"read this in the voice of my-voice.wav"_. The CLI's `voice_sample` argument takes a bare file name and looks it up in the working directory first, then in this library, so a sample added here is equally usable from the CLI. Sample-name lookup needs `infer` v0.189.1 or newer, which the app pins.

Cloning quality comes down to the reference: one speaker, no music or background noise, roughly 10-30 seconds.

## Text to video

Talking avatars come from the [`infer` CLI's `TextToVideo` tool](/cli-text-to-video/). The desktop app renders nothing itself: it flips the feature on, manages the portraits the renders use, and places the finished mp4s on a [Content project](#content-projects) timeline.

### Enabling text to video

**Settings -> General -> Text to video -> Enable Text to Video**. It is off by default; while it is off the `TextToVideo` tool is not sent to the model at all.

Saving writes `text_to_video.enabled` to `~/.infer/config.yaml` and, if the toggle changed, restarts the desktop-owned gateway with `VIDEOS_ENABLED=true` - the same restart path as saving an API key. Renders also need an [**ElevenLabs** API key](#api-keys): the default `avatar_model` is ElevenLabs `creatify-aurora`, and every render sends the avatar's portrait and the voice clip to that provider.

Only `enabled` is written. The rest of the `text_to_video` section - `model`, `avatar_model`, `output_dir`, `timeout` and the others in the [configuration reference](/cli-text-to-video/#configuration-reference) - is CLI-managed and passes through untouched.

The composer's **tools** dropdown lists `TextToSpeech` and `TextToVideo` while they are enabled, alongside the rest of the agent's tools.

### Avatars

**Settings -> Avatars** is a managed library of named portraits of you, stored one folder per avatar under `~/.infer/avatars/<name>/` - the same library the [CLI's `infer avatars`](/cli-text-to-video/#the-avatar-library) reads, so an avatar made here works from the CLI too.

| Action           | How                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| **Import photo** | Opens the native file picker, filtered to `.png`, `.jpg`, `.jpeg` and `.webp`                  |
| **Take photo**   | Opens the camera, then **Capture** takes the shot. macOS asks for camera access the first time |
| **Preview**      | Every image in the folder is shown on the avatar's card, including the generated views         |
| **Delete**       | The trash icon on the card, which runs `infer avatars delete` and removes the folder from disk |

Either source then runs `infer avatars create <name> --from <photo>`: your photo is kept as `01-front.<ext>` and two three-quarter views are generated through the gateway's image edit API. That takes a while, so the CLI's progress lines are shown in the tab while it runs.

```text
~/.infer/avatars/
  presenter/
    01-front.png       # the photo you imported - first in sort order, so this is the face that talks
    02-left.png
    03-right.png
```

Lip-sync takes a single image, so the **first image in sort order** is the one that talks. The other views are there to keep the face consistent in prompt renders.

> **Only your own likeness, or one you have the rights to use.** Do not create an avatar of someone else without their permission.

**Privacy:** creating an avatar uploads the photo to the image-edit provider to generate the extra views, and every render uploads the portrait and the voice clip to the video provider. Nothing is stored as an avatar at either provider - the library is yours, on your disk. Drop images into `~/.infer/avatars/<name>/` by hand to skip the image-edit round trip entirely.

## Related

- [Getting Started](/getting-started/) - set up the Inference Gateway server
- [Skills Catalog](/skills/) - `video-editing`, `hyperframes`, and `motion-graphics` behind [Content projects](#content-projects)
- [CLI](/cli/) - the `infer` CLI that powers the desktop backend
- [OpenTask](/opentask/) - the browser extension behind [Browser Use](#browser-use-opentask-extension)
- [Speech-to-Text](/cli-speech-to-text/) - speech-to-text in the `infer` CLI
- [Text-to-Speech](/cli-text-to-speech/) - the `TextToSpeech` tool behind the desktop toggle
- [Text-to-Video and Avatars](/cli-text-to-video/) - the `TextToVideo` tool and `infer avatars` behind [Avatars](#avatars)
- [A2A Integration](/a2a/) - chat with A2A agents from the desktop app
- [Agent Registry](/registry/) - the catalog behind the Agents tab
- [Configuration](/configuration/) - gateway configuration reference
- [Repository](https://github.com/inference-gateway/desktop) - source, releases, and contributing guide
