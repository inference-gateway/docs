import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const HOSTNAME = 'https://docs.inference-gateway.com';
const SITE_NAME = 'Inference Gateway';
const SITE_DESCRIPTION =
  'Documentation for Inference Gateway, an open-source, cloud-native gateway unifying multiple LLM providers (OpenAI, Anthropic, Groq, Cohere, Ollama, DeepSeek, Cloudflare and more) behind a single API.';
const OG_IMAGE = `${HOSTNAME}/logo.png`;

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${HOSTNAME}/#organization`,
      name: SITE_NAME,
      url: HOSTNAME,
      logo: `${HOSTNAME}/logo.png`,
      sameAs: ['https://github.com/inference-gateway'],
    },
    {
      '@type': 'WebSite',
      '@id': `${HOSTNAME}/#website`,
      url: HOSTNAME,
      name: `${SITE_NAME} Documentation`,
      description: SITE_DESCRIPTION,
      publisher: { '@id': `${HOSTNAME}/#organization` },
      inLanguage: 'en-US',
    },
    {
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      operatingSystem: 'Linux, macOS, Windows, Kubernetes',
      applicationCategory: 'DeveloperApplication',
      url: 'https://github.com/inference-gateway/inference-gateway',
      description:
        'An open-source, cloud-native, high-performance gateway unifying multiple LLM providers from local solutions like Ollama to major cloud providers such as OpenAI, Groq, Cohere, Anthropic, Cloudflare and DeepSeek.',
      license: 'https://opensource.org/licenses/MIT',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ],
};

export default withMermaid(
  defineConfig({
    base: '/',
    lang: 'en-US',
    title: SITE_NAME,
    titleTemplate: ':title | Inference Gateway',
    description: SITE_DESCRIPTION,
    cleanUrls: true,
    lastUpdated: true,
    metaChunk: true,
    srcExclude: ['README.md', 'CHANGELOG.md', 'CLAUDE.md', 'AGENTS.md'],
    sitemap: {
      hostname: HOSTNAME + '/',
      transformItems(items) {
        return items.filter((item) => !item.url.endsWith('404'));
      },
    },
    buildEnd(siteConfig) {
      writeFileSync(join(siteConfig.outDir, '.nojekyll'), '');
    },
    head: [
      ['link', { rel: 'icon', type: 'image/png', href: '/logo.png' }],
      ['link', { rel: 'apple-touch-icon', href: '/logo.png' }],
      ['meta', { name: 'theme-color', content: '#7c3aed' }],
      ['meta', { name: 'author', content: 'Inference Gateway' }],
      ['meta', { name: 'robots', content: 'index, follow' }],
      [
        'meta',
        {
          name: 'keywords',
          content:
            'inference gateway, llm proxy, openai proxy, anthropic proxy, groq, ollama, model context protocol, mcp, agent-to-agent, a2a, kubernetes operator, llm api gateway',
        },
      ],
      ['meta', { property: 'og:site_name', content: SITE_NAME }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:locale', content: 'en_US' }],
      ['meta', { property: 'og:title', content: `${SITE_NAME} Documentation` }],
      ['meta', { property: 'og:description', content: SITE_DESCRIPTION }],
      ['meta', { property: 'og:url', content: HOSTNAME + '/' }],
      ['meta', { property: 'og:image', content: OG_IMAGE }],
      ['meta', { property: 'og:image:alt', content: `${SITE_NAME} logo` }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:title', content: `${SITE_NAME} Documentation` }],
      ['meta', { name: 'twitter:description', content: SITE_DESCRIPTION }],
      ['meta', { name: 'twitter:image', content: OG_IMAGE }],
      ['script', { type: 'application/ld+json' }, JSON.stringify(structuredData)],
    ],
    transformPageData(pageData) {
      const canonicalUrl = `${HOSTNAME}/${pageData.relativePath}`
        .replace(/index\.md$/, '')
        .replace(/\.md$/, '');
      pageData.frontmatter.head ??= [];
      pageData.frontmatter.head.push(['link', { rel: 'canonical', href: canonicalUrl }]);
      pageData.frontmatter.head.push(['meta', { property: 'og:url', content: canonicalUrl }]);
    },
    themeConfig: {
      logo: '/logo.png',
      siteTitle: SITE_NAME,
      nav: [
        { text: 'Getting Started', link: '/getting-started', activeMatch: '^/getting-started$' },
        {
          text: 'Guides',
          items: [
            { text: 'Architecture Overview', link: '/architecture-overview' },
            { text: 'Configuration', link: '/configuration' },
            { text: 'Authentication', link: '/authentication' },
            { text: 'Deployment', link: '/deployment' },
            { text: 'Supported Providers', link: '/supported-providers' },
            { text: 'Examples', link: '/examples' },
            { text: 'IDEs', link: '/ides' },
            { text: 'Observability', link: '/observability' },
            { text: 'Troubleshooting', link: '/troubleshooting' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'REST API', link: '/api-reference' },
            { text: 'SDKs', link: '/sdks' },
            { text: 'CLI', link: '/cli' },
            { text: 'ADL CLI', link: '/adl-cli' },
            { text: 'Channels', link: '/cli-channels' },
            { text: 'Kubernetes Operator', link: '/operator' },
            { text: 'GitHub Action', link: '/github-action' },
          ],
        },
        {
          text: 'Protocols',
          items: [
            { text: 'MCP Integration', link: '/mcp' },
            { text: 'A2A Integration', link: '/a2a' },
            { text: 'A2A Debugger', link: '/a2a-debugger' },
            { text: 'A2A Registry', link: '/registry' },
          ],
        },
      ],
      sidebar: [
        {
          text: 'Getting Started',
          collapsed: false,
          items: [
            { text: 'Introduction', link: '/' },
            { text: 'Getting Started', link: '/getting-started' },
            { text: 'Architecture Overview', link: '/architecture-overview' },
          ],
        },
        {
          text: 'Core Concepts',
          collapsed: false,
          items: [
            { text: 'Configuration', link: '/configuration' },
            { text: 'Authentication', link: '/authentication' },
            { text: 'Deployment', link: '/deployment' },
            { text: 'Supported Providers', link: '/supported-providers' },
          ],
        },
        {
          text: 'Kubernetes Operator',
          collapsed: false,
          items: [{ text: 'Operator', link: '/operator' }],
        },
        {
          text: 'Model Context Protocol',
          collapsed: false,
          items: [{ text: 'MCP Integration', link: '/mcp' }],
        },
        {
          text: 'Agent-To-Agent (A2A)',
          collapsed: false,
          items: [
            { text: 'A2A Integration', link: '/a2a' },
            { text: 'A2A Debugger', link: '/a2a-debugger' },
            { text: 'A2A Registry', link: '/registry' },
          ],
        },
        {
          text: 'API Reference',
          collapsed: false,
          items: [
            { text: 'REST API', link: '/api-reference' },
            { text: 'SDKs', link: '/sdks' },
          ],
        },
        {
          text: 'Tools',
          collapsed: false,
          items: [
            { text: 'CLI', link: '/cli' },
            { text: 'ADL CLI', link: '/adl-cli' },
            { text: 'Channels', link: '/cli-channels' },
            { text: 'GitHub Action', link: '/github-action' },
          ],
        },
        {
          text: 'Guides',
          collapsed: false,
          items: [
            { text: 'Examples', link: '/examples' },
            { text: 'IDEs', link: '/ides' },
            { text: 'Observability', link: '/observability' },
            { text: 'Troubleshooting', link: '/troubleshooting' },
          ],
        },
      ],
      socialLinks: [{ icon: 'github', link: 'https://github.com/inference-gateway' }],
      editLink: {
        pattern: 'https://github.com/inference-gateway/docs/edit/main/:path',
        text: 'Edit this page on GitHub',
      },
      footer: {
        message:
          'Released under the <a href="https://github.com/inference-gateway/docs/blob/main/LICENSE">MIT License</a>.',
        copyright:
          'Copyright © 2025 - <a href="https://github.com/inference-gateway">Inference Gateway</a>',
      },
      search: {
        provider: 'local',
        options: {
          detailedView: true,
        },
      },
      outline: {
        level: [2, 3],
        label: 'On this page',
      },
      docFooter: {
        prev: 'Previous page',
        next: 'Next page',
      },
      externalLinkIcon: true,
    },
    markdown: {
      languageAlias: {
        promql: 'sql',
        logql: 'sql',
      },
    },
    mermaid: {
      theme: 'base',
      themeVariables: {
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        fontSize: '16px',
        primaryColor: '#ede9fe',
        primaryTextColor: '#1f2937',
        primaryBorderColor: '#7c3aed',
        lineColor: '#6b7280',
        secondaryColor: '#fef3c7',
        tertiaryColor: '#f8fafc',
        clusterBkg: '#f9fafb',
        clusterBorder: '#e5e7eb',
        edgeLabelBackground: '#ffffff',
        labelTextColor: '#1f2937',
      },
      flowchart: {
        curve: 'basis',
        nodeSpacing: 60,
        rankSpacing: 70,
        padding: 24,
        useMaxWidth: true,
        htmlLabels: true,
      },
    },
    vite: {
      build: {
        chunkSizeWarningLimit: 1500,
      },
    },
  })
);
