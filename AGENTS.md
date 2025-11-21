# AGENTS.md - Inference Gateway Documentation

This file provides comprehensive guidance for AI agents working with the Inference Gateway documentation project.

## Project Overview

**Inference Gateway Documentation** is a Next.js-based documentation website for the [Inference Gateway](https://github.com/inference-gateway/inference-gateway) - an open-source API gateway for Large Language Models (LLMs) that provides a unified interface for accessing multiple AI providers.

### Key Technologies

- **Framework**: Next.js 16.0.3 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Content**: MDX with remark-gfm for GitHub Flavored Markdown
- **Build**: Static export for deployment
- **Search**: Custom search functionality with generated index

## Architecture and Structure

### Directory Structure

```
├── app/                          # Next.js App Router pages and layouts
│   ├── [section]/                # Documentation sections (A2A, API, etc.)
│   │   ├── page.tsx              # Page component
│   │   └── [Section]Content.tsx  # Content wrapper component
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/                   # Reusable React components
│   ├── ui/                       # shadcn/ui components
│   ├── Header.tsx                # Site header
│   ├── Sidebar.tsx               # Navigation sidebar
│   └── TableOfContents.tsx       # Auto-generated TOC
├── markdown/                     # MDX content files (source of truth)
│   └── *.mdx                     # Documentation content
├── public/                       # Static assets
│   ├── images/                   # Documentation images
│   └── search-index.json         # Generated search index
├── scripts/                      # Build-time generation scripts
│   ├── generate-sitemap.ts
│   └── generate-search-index.ts
└── lib/                          # Utility functions
```

### Content Architecture

- **MDX files** in `/markdown/` directory are the source of truth
- Each MDX file corresponds to a documentation section
- React components in `/app/` import and render MDX content
- Search index is generated from MDX content during build

## Development Environment Setup

### Prerequisites

- Node.js 24.11.0 (specified in package.json engines)
- npm 11.6.1

### Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### DevContainer (Recommended)

The project includes a fully configured devcontainer with:

- Pre-installed VS Code extensions
- Docker-in-Docker support
- MCP servers (Context7, GitHub)
- Git commit signing
- Format-on-save

## Key Commands

### Development

```bash
npm run dev              # Start development server (localhost:3000)
npm run build            # Production build (includes prebuild steps)
npm run start            # Start production server
npm run serve            # Build and serve static export
```

### Code Quality

```bash
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
npm run format:check    # Check formatting without fixing
npm run lint:md         # Lint markdown files
npm run lint:md:fix     # Fix markdown linting issues
```

### Content Generation

```bash
npm run generate-sitemap        # Generate sitemap.xml
npm run generate-search-index   # Generate search index
npm run prebuild                # Run both generation tasks (auto-runs before build)
```

### Utilities

```bash
npm run clean           # Clean build artifacts (.next/, out/)
git status              # Check git status
git log --oneline -n 5  # View recent commits
```

## Testing Instructions

This project uses the following testing and quality assurance tools:

### Linting

- **ESLint**: JavaScript/TypeScript linting with Next.js config
- **Markdownlint**: Markdown/MDX file linting with custom rules
- **Prettier**: Code formatting with consistent style

### Quality Gates

- **Pre-commit hooks**: Husky runs linting and formatting checks
- **CI/CD**: GitHub Actions run on every push to main
- **Release automation**: Semantic release with conventional commits

## Project Conventions and Coding Standards

### Code Style

- **TypeScript**: Strict mode enabled, no implicit any
- **Prettier**: 2-space indentation, single quotes, semicolons
- **ESLint**: Next.js configuration with custom rules
- **Imports**: Use absolute imports with `@/*` path mapping

### Markdown/MDX Standards

- **Headings**: ATX-style (`#`, `##`, etc.)
- **Lists**: Use dashes for unordered lists
- **Line length**: No hard limits (MD013 disabled)
- **Code blocks**: Use triple backticks with language specification
- **Images**: Store in `/public/images/` and reference with relative paths

### Git Conventions

- **Commit messages**: Conventional commits format
- **Branch naming**: feature/name, fix/name, docs/name
- **Release process**: Automated via semantic-release

## Important Files and Configurations

### Core Configuration Files

- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.ts` - Next.js configuration with MDX
- `eslint.config.mjs` - ESLint configuration
- `.prettierrc.json` - Code formatting rules
- `.markdownlint.json` - Markdown linting rules

### Build System

- `postcss.config.mjs` - PostCSS with Tailwind
- `scripts/generate-search-index.ts` - Search index generation
- `scripts/generate-sitemap.ts` - Sitemap generation

### Development Workflow

- `.devcontainer/` - Development container configuration
- `.github/workflows/` - CI/CD pipelines
- `.husky/` - Git hooks

## Content Management

### Adding New Documentation

1. Create MDX file in `/markdown/` directory
2. Create corresponding page in `/app/[section]/`
3. Import MDX content in the page component
4. Update sidebar navigation if needed
5. Run `npm run generate-search-index` to update search

### Search Functionality

- Search index is automatically generated during build
- Uses keywords from MDX content, headings, and file names
- Index is stored in `/public/search-index.json`

### Static Assets

- Images: Place in `/public/images/`
- Reference with relative paths: `/images/filename.png`
- No image optimization (static export)

## Deployment and CI/CD

### Build Process

```bash
npm run prebuild    # Generate search index and sitemap
npm run build       # Build static site
npm run serve       # Serve built site
```

### Release Process

- Automated via semantic-release
- Conventional commits trigger version bumps
- GitHub Pages deployment on release
- Changelog automatically generated

### Environment Variables

- No environment-specific configuration needed
- Static export means all content is baked in
- Images are unoptimized for static hosting

## Common Tasks for AI Agents

### Documentation Updates

- Edit MDX files in `/markdown/` directory
- Run `npm run lint:md` to check markdown quality
- Run `npm run format` to ensure consistent formatting
- Test search functionality after changes

### Component Development

- Place components in `/components/` directory
- Use TypeScript with strict typing
- Follow existing component patterns
- Test with `npm run dev`

### Bug Fixes

- Reproduce issue in development environment
- Check console logs and browser dev tools
- Run `npm run lint` and `npm run format`
- Test across different screen sizes

### Performance Optimization

- Use static generation where possible
- Minimize client-side JavaScript
- Optimize images before adding to `/public/images/`
- Test build performance with `npm run build`

## Troubleshooting

### Common Issues

- **Search not working**: Run `npm run generate-search-index`
- **Build failures**: Check for TypeScript errors and run `npm run lint`
- **Styling issues**: Verify Tailwind classes and CSS imports
- **MDX rendering problems**: Check for syntax errors in markdown

### Development Tips

- Use the devcontainer for consistent environment
- Enable format-on-save in VS Code
- Use the search functionality to find relevant documentation
- Check the CHANGELOG.md for recent changes

---

This documentation is maintained as part of the Inference Gateway project. For issues or contributions, refer to the main repository.
