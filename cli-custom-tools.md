---
title: Custom Tools
description: Add your own tools to the Inference Gateway CLI with one YAML manifest per tool - user tools in ~/.infer/tools, project tools in .infer/tools and .agents/tools, the manifest reference, the JSON-on-stdin call contract, modes and approval, name rules, tool-directory write protection, and the security model.
---

# Custom Tools

**Custom tools** let you add tools written in any language to the [Inference Gateway CLI](/cli/) (`infer`). Drop one YAML manifest per tool into `~/.infer/tools/`, or into a project's `.infer/tools/` or `.agents/tools/`, and the CLI offers the tool to the model next to the built-in ones. A call runs the manifest's `command` with the call's arguments as JSON on stdin, and whatever the command prints on stdout is the result. There is no SDK to import and no server to run.

A custom tool behaves like a built-in tool: the model sees it under its own name, you can run it yourself with `!!Name(arg="v")` in chat or `infer tools execute Name '{...}'`, and it follows the same agent modes and approval flow.

> For a runnable version, see [`examples/tools`](https://github.com/inference-gateway/cli/tree/main/examples/tools) in the CLI repository - a user tool and a project tool driven by a scripted mock model, so it needs no API key.

## Quick start

A tool that counts the words in a file, written as a shell script.

`~/.infer/tools/WordCount.yaml`:

```yaml
name: WordCount
description: Count the words in a text file.
command:
  - ./word-count.sh
parameters:
  type: object
  properties:
    path:
      type: string
      description: Path of the file to count
  required:
    - path
modes:
  - standard
  - auto
  - auto-with-judge
  - plan
  - readonly
require_approval: false
```

`~/.infer/tools/word-count.sh` (make it executable with `chmod +x`):

```sh
#!/bin/sh
path=$(jq -r .path)
wc -w < "$path"
```

Try it without the model:

```bash
infer tools execute WordCount '{"path":"README.md"}'
```

## User tools and project tools

The CLI loads custom tools from three directories and merges them:

| Directory                                 | Kind                                         | Approval                                  |
| ----------------------------------------- | -------------------------------------------- | ----------------------------------------- |
| `~/.infer/tools/` (or `tools.custom_dir`) | User tools, which you installed              | As the manifest's `require_approval` says |
| `.infer/tools/` in the working directory  | Project tools, which the repository supplies | Always, except in `auto` mode             |
| `.agents/tools/` in the working directory | Project tools, which the repository supplies | Always, except in `auto` mode             |

When two directories define a tool with the same name, the project tool wins over the user tool, and `.infer/tools/` wins over `.agents/tools/`.

A project tool comes with whatever repository you cloned, so the CLI never lets it run silently. Every call needs approval, even when its manifest says `require_approval: false` and even in `readonly` mode, which runs every other tool it offers without asking. Only `auto` mode, which runs every call unapproved, runs a project tool without asking. `!!Name(...)` and `infer tools execute` count as your approval, as for any tool.

## Manifest reference

A custom tool manifest uses the same format as the manifests of the CLI's built-in tools, plus three fields that only custom tools have: `command`, `timeout` and `enabled`. Unknown fields are rejected, so a misspelled key fails loudly instead of silently falling back to a default.

| Field              | Required | Default                               | Meaning                                                                                                                                                        |
| ------------------ | -------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`             | yes      |                                       | Tool name the model sees. Must match the file name (`WordCount.yaml`), start with a letter, and use only letters, digits and underscores, up to 64 characters. |
| `description`      | yes      |                                       | What the tool does and when to use it. The model reads this to decide when to call the tool.                                                                   |
| `command`          | yes      |                                       | Program and fixed arguments, as a list. It runs without a shell, see below.                                                                                    |
| `parameters`       | yes      |                                       | JSON Schema of type `object` for the call's arguments, sent to the model unchanged.                                                                            |
| `modes`            | no       | `standard`, `auto`, `auto-with-judge` | Agent modes that offer the tool, see [Modes and approval](#modes-and-approval).                                                                                |
| `require_approval` | no       | `tools.safety.require_approval`       | Whether a call needs approval before it runs.                                                                                                                  |
| `timeout`          | no       | `30`                                  | Seconds before the call is killed.                                                                                                                             |
| `enabled`          | no       | `true`                                | `false` keeps the manifest on disk without loading the tool.                                                                                                   |

`command[0]` is resolved like this:

- A bare name such as `infer-desktop-tools` is looked up on `PATH`.
- A path containing a slash such as `./word-count.sh` or `bin/tool` resolves against the manifest's directory, so a tool can ship next to its manifest.
- An absolute path is used as is.

## How a call runs

1. The CLI checks the arguments against `parameters`: every `required` property must be present and each property must have its declared type. A call that fails the check never starts the process.
2. It starts `command` without a shell, in the session's working directory, with the CLI's environment.
3. It writes the arguments to stdin as one JSON object, for example `{"path":"README.md"}`, and closes stdin.
4. **Exit code 0**: stdout is the tool result, as text. **Non-zero exit code**: the call fails, and stderr (or stdout when stderr is empty) goes back to the model as the error.
5. The process is killed when `timeout` expires or the turn is cancelled. On Linux and macOS the whole process group is killed, so the children a script started die too. On Windows only the direct child is killed.

Like every tool result, the output the model sees is capped at `tools.max_result_bytes`.

## Modes and approval

Custom tools follow the same policy as built-in tools:

- **`modes`** lists the agent modes that offer the tool. Without it the tool is offered in `standard`, `auto` and `auto-with-judge`, and hidden in `plan` and `readonly`, like an MCP tool. A tool that only reads can list every mode, as the `WordCount` example in [Quick start](#quick-start) does. A call outside the tool's modes is refused.
- **`require_approval`** decides whether a user tool's call needs approval. Without it the tool follows the global `tools.safety.require_approval` (default `true`). A project tool always needs approval, see [User tools and project tools](#user-tools-and-project-tools). How the approval is asked for follows `tools.safety.approval_behaviour` (`prompt`, `ipc`, `judge` or `block`) in both chat and headless mode.

> **Listing `readonly` declares the tool safe.** Read-only mode runs the tools it offers without asking for approval, so only list `readonly` (and `plan`) for tools that do not change anything.

Approval applies to calls the model makes. `!!Name(...)` in chat and `infer tools execute` are started by you and count as approved, as they do for built-in tools. `infer tools execute --format json` still reports `approval_required` for callers that handle approval themselves.

`tools.enabled: false` turns custom tools off together with the other local tools. Markdown subagents (`.infer/agents/*.md`) can list custom tools in their `tools:` field.

## Tool names

Custom tools get no prefix, so they look like built-in tools to the model. To keep that unambiguous, the CLI skips a manifest whose name:

- matches the name of any built-in tool, even one your configuration switches off, compared case-insensitively (`read` is rejected because of `Read`), or
- starts with `MCP_`, which is reserved for [MCP](/mcp/) tools.

A custom tool never replaces a built-in or MCP tool, and no built-in or MCP tool replaces a custom tool. Between custom tools, a project tool replaces a user tool of the same name.

## Example: one binary for many tools (Rust)

A compiled program can back several tools through subcommands, one manifest per tool.

`~/.infer/tools/TakeScreenshot.yaml`:

```yaml
name: TakeScreenshot
description: Capture a screenshot of a desktop app window and return the PNG path.
command:
  - infer-desktop-tools
  - screenshot
parameters:
  type: object
  properties:
    window:
      type: string
      description: Title of the window to capture
  required:
    - window
timeout: 60
```

`src/main.rs` (with `serde` and `serde_json` as dependencies):

```rust
use serde::Deserialize;
use std::io::Read;

#[derive(Deserialize)]
struct ScreenshotArgs {
    window: String,
}

fn screenshot(args: ScreenshotArgs) -> Result<String, String> {
    let path = format!("/tmp/{}.png", args.window.replace(' ', "_"));
    // Capture the window here.
    Ok(path)
}

fn main() {
    let mut input = String::new();
    std::io::stdin().read_to_string(&mut input).expect("reading stdin");

    let result = match std::env::args().nth(1).as_deref() {
        Some("screenshot") => serde_json::from_str(&input)
            .map_err(|e| format!("invalid arguments: {e}"))
            .and_then(screenshot),
        other => Err(format!("unknown subcommand {other:?}")),
    };

    match result {
        Ok(output) => println!("{output}"),
        Err(message) => {
            eprintln!("{message}");
            std::process::exit(1);
        }
    }
}
```

Install the binary on `PATH` (or reference it by a path relative to the manifest), and every manifest pointing at it becomes a tool.

## Custom tools vs MCP

[MCP servers](/mcp/) also add tools in any language. Custom tools are the lighter option when you control the tool:

- No server to start or health-check. Nothing runs until a call is made, which keeps each `infer headless` start cheap.
- No prefix: the tool is `TakeScreenshot`, not `MCP_<server>_TakeScreenshot`.
- Per-tool `modes` and `require_approval`. MCP tools are hidden in plan mode and use the global approval setting.

`~/.infer/tools/` is yours. It is unrelated to `~/.infer/bin/tools/`, which `infer binaries` owns and fills with the prebuilt helper programs the CLI itself uses (ffmpeg, whisper-cli, llama-tts).

## Security

A custom tool runs with **your** permissions and can do anything you can. The sandbox settings (`tools.sandbox.directories`, `tools.sandbox.protected_paths`) only restrict the CLI's built-in file tools, not the programs custom tools start. Only install manifests and programs you trust, keep `require_approval` on for tools that change things, and list `plan`/`readonly` in `modes` only for tools that do not.

- **Project tools always ask.** A cloned repository can offer tools, but none of them runs without your approval outside `auto` mode.
- **The CLI never edits the tool directories.** The Write, Edit, MultiEdit and Delete tools refuse any path inside `~/.infer/tools/`, `tools.custom_dir`, `.infer/tools/` or `.agents/tools/`, also through a symlink or another spelling of the path, so the model cannot write itself a tool that skips approval. This cannot be switched off. The Bash tool is not covered: in `auto` mode it runs any command.
- **A project's `.infer/config.yaml` is trusted like your own.** It can set `tools.custom_dir`, the Bash allow-list and the approval settings, so review it before running the CLI in a repository you do not trust.

## Using another directory

Set `tools.custom_dir` in `config.yaml`, or the `INFER_TOOLS_CUSTOM_DIR` environment variable, to load your user tools from another directory instead of `~/.infer/tools/`. The project directories still load:

```bash
infer config set tools.custom_dir /opt/my-app/tools
```

```bash
INFER_TOOLS_CUSTOM_DIR=/opt/my-app/tools infer headless "Take a screenshot of the editor"
```

An app that embeds the CLI can use this to offer its own tools without adding them to the user's terminal CLI.

## Troubleshooting

- **The tool does not show up.** The CLI skips an invalid manifest with a warning in its logs (`~/.infer/logs/`) and starts anyway. The warning names the file and the reason, such as an unknown field, a name that does not match the file name, or a taken name.
- **Test a tool without the model.** `infer tools execute Name '{"arg":"value"}'` runs it directly and prints the result or the error.
- **The call fails with "executable file not found".** A bare command name must be on the `PATH` the CLI runs with. Use a path relative to the manifest, or an absolute path, instead.

## Related

- [CLI](/cli/) - installation, tools, configuration, and agent modes
- [Agent Skills](/cli-skills/) - instruction folders the agent reads on demand
- [MCP Integration](/mcp/) - tools served over the Model Context Protocol
