---
title: OpenTask
description: A browser extension that makes repo skills and bot directives discoverable inside GitHub's issue and PR comment box. Chrome-first, portable to Edge, Firefox, and Safari.
---

# OpenTask

**OpenTask** is a Manifest V3 browser extension that brings your repo's [Agent Skills](/skills/) and common bot directives right into GitHub's issue and PR comment box. Type `!` to open a fuzzy-filtered dropdown of the current repo's skills, or press `Ctrl/Cmd+Shift+P` to open a searchable palette of `@opentask` directives and editable templates.

It is built Chrome-first but deliberately portable to Edge, Firefox, and Safari. Source and releases live at [github.com/inference-gateway/opentask](https://github.com/inference-gateway/opentask).

## Installation

Download the `browser-extension.zip` from the [latest release](https://github.com/inference-gateway/opentask/releases), extract it, then:

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `dist/` folder inside the extracted ZIP.

## Usage

- **Skills**: type `!` at the start of a word in a comment box to open the skill dropdown. Arrow keys navigate, `Tab`/`Enter` inserts, `Esc` closes.
- **Quick prompts**: press `Ctrl/Cmd+Shift+P` (or click the toolbar button) to open the palette, filter, and insert a template at the caret.
- **Install the agent**: navigate to any GitHub repo and click the **Tasks** tab in the repo navigation bar to install the OpenTask Agent workflow via a pull request. The language toggle there (Go, Rust, Node/TypeScript, Python) maps to the `languages` input on the action.
- **Manage skills**: the **Skills** tab shows a searchable, multi-select list of the [skills registry](https://github.com/inference-gateway/skills). Check skills to install and uncheck to remove, then click **Apply** to open a PR.
- **Select agents**: the **Agents** tab lists available A2A agents from the [agents registry](https://github.com/inference-gateway/agents). Check the ones to include in the workflow, then re-install to bake them in.
- **Init a project**: the **Init** tab dispatches the workflow to scaffold an `AGENTS.md` for the repo and open a PR.

## Configuration

Right-click the extension icon and select **Options** (or navigate to the extension's details page and click _Extension options_). From there you can:

- **Accounts** - manage per-owner PATs and optional GitHub App bot configurations.
- **Quick prompts** - edit the JSON array of `{ id, label, description, insert }` templates shown in the palette.
- **Install models** - configure the model dropdown in the Tasks tab.
- **Permissions** - control what the agent may do at runtime (create PRs, issues, comments).
- **Workflow** - set the per-run job timeout (default 25 minutes).
- **Plugins** - toggle optional [infer-action](https://github.com/inference-gateway/infer-action) plugins.
- **Self-hosted GPU models** - provision a [RunPod](https://runpod.io) GPU running llama.cpp from the extension popup.

## Related

- [Browser Extension Bridge](/browser-extension-bridge/) - the wire protocol between the CLI and the extension sidepanel
- [Skills Catalog](/skills/) - the skills registry OpenTask discovers
- [CLI Skills](/cli-skills/) - using skills from the Inference Gateway CLI
- [Repository](https://github.com/inference-gateway/opentask) - source, issues, and releases
