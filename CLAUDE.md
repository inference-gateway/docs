# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the documentation website for Inference Gateway, built with Next.js and MDX. It serves as the primary documentation portal for an open-source API gateway that provides unified access to multiple LLM providers (OpenAI, Anthropic, Groq, Cohere, Ollama, etc.) with support for MCP (Model Context Protocol) and A2A (Agent-to-Agent) integrations.

## Architecture

- **Framework**: Next.js 15.3.0 with App Router
- **Content**: MDX files in `/markdown/` directory with React components in `/app/`
- **Styling**: Tailwind CSS with shadcn/ui components
- **Search**: Custom search functionality with generated index
- **Deployment**: Supports static export for various hosting platforms

The site renders MDX content through dedicated page components that import content from the `/markdown/` directory. Each page has both a content component (e.g., `GettingStartedContent.tsx`) and a page component (`page.tsx`).

## Development Commands

```bash
# Development
npm run dev              # Start development server on localhost:3000

# Build and deployment
npm run build           # Production build (includes prebuild steps)
npm run start           # Start production server
npm run serve           # Build and serve static export

# Code quality
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
npm run format:check    # Check formatting

# Content generation
npm run generate-sitemap        # Generate sitemap.xml
npm run generate-search-index   # Generate search index
npm run prebuild               # Run both generation tasks

# Utilities
npm run clean           # Clean build artifacts
```

## Key Directories

- `/app/` - Next.js app router pages and layouts
- `/markdown/` - MDX content files (source of truth for documentation)
- `/components/` - Reusable React components including UI components
- `/public/` - Static assets including images
- `/scripts/` - Build-time generation scripts for search and sitemap

## Content Management

Documentation content is written in MDX format in the `/markdown/` directory. Each MDX file corresponds to a documentation section and is imported by its respective content component in `/app/`.

The search functionality is powered by a generated search index that includes content from all MDX files. The index is regenerated on each build via the `prebuild` script.

## Important Notes

- Always run `npm run lint` and `npm run format:check` before committing
- The search index and sitemap are automatically regenerated during builds
- This is a documentation-only repository focused on content presentation
- Images should be placed in `/public/images/` and referenced accordingly
