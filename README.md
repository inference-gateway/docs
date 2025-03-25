<h1 align="center">Inference Gateway Documentation</h1>

<p align="center">
  <!-- Release Status Badge -->
  <a href="https://github.com/inference-gateway/docs/actions/workflows/ci.yml?query=branch%3Amain">
    <img src="https://github.com/inference-gateway/docs/actions/workflows/release.yml/badge.svg?branch=main" alt="CI Status"/>
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

This documentation site is built with Next.js.

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

You can use the devcontainer for a consistent development environment. The devcontainer is configured with all the necessary tools and extensions for development.

## Contributing

Contributions to improve the documentation are welcome! You can:

1. Edit existing MDX files in the markdown directory
2. Add new documentation pages
3. Improve the site's design and functionality

## License

This project is licensed under the MIT License.
