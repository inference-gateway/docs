<h1 align="center">Inference Gateway Documentation</h1>

<p align="center">
  <!-- CI Status Badge -->
  <a href="https://github.com/inference-gateway/docs/actions/workflows/ci.yml?query=branch%3Amain">
    <img src="https://github.com/inference-gateway/docs/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI Status"/>
  </a>
  <!-- Version Badge -->
  <a href="https://github.com/inference-gateway/docs/releases">
    <img src="https://img.shields.io/github/v/release/inference-gateway/docs?color=blue&style=flat-square" alt="Version"/>
  </a>
  <!-- License Badge -->
  <a href="https://github.com/inference-gateway/docs/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/inference-gateway/docs?color=blue&style=flat-square" alt="License"/>
  </a>
</p>

This repository contains the documentation website for [Inference Gateway](https://github.com/inference-gateway/inference-gateway), an open-source API gateway for Large Language Models (LLMs) that provides a unified interface for accessing multiple AI providers.

## About Inference Gateway

Inference Gateway offers a unified API layer to interact with multiple LLM providers including OpenAI, DeepSeek, Anthropic, Groq, Cohere, Ollama and more. It provides a consistent interface for interacting with different LLMs, abstracting away the differences between each provider's API.

## Development

This documentation site is built with **VitePress** 1.x and Vue 3, and uses [Bun](https://bun.sh) (>= 1.2) as the runtime, package manager, and script runner.

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Static build → .vitepress/dist/
bun run build

# Markdown linting
bun run lint:md

# Prettier formatting
bun run format
bun run format:check

# Provider-docs generator regression tests
bun test
```

A [go-task](https://taskfile.dev) `Taskfile.yml` mirrors these scripts - every `bun run <name>` has an equivalent `task <name>` (run `task` with no args to list them). It also exposes the docs generator: `task generate` rebuilds the provider-specific sections of `configuration.md`, `supported-providers.md`, `rust-adk.md`, and `typescript-adk.md` from the canonical [`inference-gateway/schemas`](https://github.com/inference-gateway/schemas) OpenAPI schema, and `task generate:check` fails if those sections have drifted. Those sections sit between `GENERATED:*` markers and should not be edited by hand.

You can use **flox** for a consistent development environment (configured in `.flox/env/manifest.toml`).

> See [`AGENTS.md`](./AGENTS.md) or [`CLAUDE.md`](./CLAUDE.md) for the full list of commands and development conventions.

## Contributing

Contributions to improve the documentation are welcome! You can:

1. Edit existing Markdown files at the repo root (each `*.md` file becomes a page)
2. Add new documentation pages by creating `*.md` files at the repo root
3. Improve the site's design and functionality

> This site migrated from Next.js/MDX to VitePress. Content is authored as plain Markdown (`.md`) files — no `markdown/` directory or MDX extension is used.

## License

This project is licensed under the Apache 2.0 License.
