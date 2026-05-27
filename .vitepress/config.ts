import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const HOSTNAME = 'https://docs.inference-gateway.com';
const SITE_NAME = 'Inference Gateway';
const SITE_DESCRIPTION =
  'Documentation for Inference Gateway, an open-source, cloud-native gateway unifying multiple LLM providers (OpenAI, Anthropic, Groq, Cohere, Ollama, DeepSeek, Cloudflare and more) behind a single API.';
const OG_IMAGE = `${HOSTNAME}/og-image.webp`;
const OG_IMAGE_TYPE = 'image/webp';
const SITEMAP_PAGE_PRIORITY = 0.8;
const SITEMAP_HOME_PRIORITY = 1.0;
const SITEMAP_CHANGE_FREQUENCY = 'weekly';
const withTrailingSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`);
const pageLink = (url: string) => (url === '/' ? url : withTrailingSlash(url));
const isHomeUrl = (url: string | undefined) =>
  !url || url === '/' || url === `${HOSTNAME}/` || url === 'index' || url === '/index';

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
    rewrites(id) {
      if (!id.endsWith('.md') || id === 'index.md' || id === '404.md') {
        return id;
      }

      return id.replace(/\.md$/, '/index.md');
    },
    lastUpdated: true,
    metaChunk: true,
    srcExclude: ['README.md', 'CHANGELOG.md', 'CLAUDE.md', 'AGENTS.md'],
    sitemap: {
      hostname: HOSTNAME + '/',
      transformItems(items) {
        return items
          .filter((item) => !item.url.endsWith('404'))
          .map((item) => {
            const url = item.url ? withTrailingSlash(item.url) : item.url;
            const isHomePage = isHomeUrl(item.url) || isHomeUrl(url);

            return {
              ...item,
              url,
              changefreq: SITEMAP_CHANGE_FREQUENCY,
              priority: isHomePage ? SITEMAP_HOME_PRIORITY : SITEMAP_PAGE_PRIORITY,
            };
          })
          .sort((a, b) => {
            if (isHomeUrl(a.url)) return -1;
            if (isHomeUrl(b.url)) return 1;
            return a.url.localeCompare(b.url);
          });
      },
    },
    buildEnd(siteConfig) {
      writeFileSync(join(siteConfig.outDir, '.nojekyll'), '');
    },
    transformHtml(html) {
      return html.replace(
        /<link[^>]+rel="modulepreload"[^>]+href="[^"]*\/assets\/chunks\/(?:[A-Za-z0-9]*Diagram-|diagram-|classDiagram|stateDiagram|wardley(?:Diagram)?-|dagre-|cose-bilkent-|cytoscape\.esm|katex|sankey|kanban-definition|timeline-definition|mindmap-definition|virtual_mermaid)[^"]*"[^>]*>\s*/g,
        ''
      );
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
      ['meta', { property: 'og:image:type', content: OG_IMAGE_TYPE }],
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '630' }],
      ['meta', { property: 'og:image:alt', content: `${SITE_NAME} logo` }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:title', content: `${SITE_NAME} Documentation` }],
      ['meta', { name: 'twitter:description', content: SITE_DESCRIPTION }],
      ['meta', { name: 'twitter:image', content: OG_IMAGE }],
      ['script', { type: 'application/ld+json' }, JSON.stringify(structuredData)],
      [
        'script',
        {},
        "document.addEventListener('DOMContentLoaded',function(){var e=document.getElementById('VPContent');if(e&&e.classList.contains('is-home')&&!e.querySelector('main'))e.setAttribute('role','main')});",
      ],
    ],
    transformPageData(pageData) {
      const canonicalUrl = withTrailingSlash(
        `${HOSTNAME}/${pageData.relativePath}`.replace(/index\.md$/, '').replace(/\.md$/, '')
      );
      pageData.frontmatter.head ??= [];
      pageData.frontmatter.head.push(['link', { rel: 'canonical', href: canonicalUrl }]);
      pageData.frontmatter.head.push(['meta', { property: 'og:url', content: canonicalUrl }]);
    },
    themeConfig: {
      logo: '/logo.png',
      siteTitle: SITE_NAME,
      nav: [
        {
          text: 'Getting Started',
          link: pageLink('/getting-started'),
          activeMatch: '^/getting-started/?$',
        },
        {
          text: 'Guides',
          items: [
            { text: 'Architecture Overview', link: pageLink('/architecture-overview') },
            { text: 'Configuration', link: pageLink('/configuration') },
            { text: 'Authentication', link: pageLink('/authentication') },
            { text: 'Deployment', link: pageLink('/deployment') },
            { text: 'Supported Providers', link: pageLink('/supported-providers') },
            { text: 'Examples', link: pageLink('/examples') },
            { text: 'IDEs', link: pageLink('/ides') },
            { text: 'Observability', link: pageLink('/observability') },
            { text: 'Troubleshooting', link: pageLink('/troubleshooting') },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'REST API', link: pageLink('/api-reference') },
            { text: 'SDKs', link: pageLink('/sdks') },
            { text: 'CLI', link: pageLink('/cli') },
            { text: 'ADL CLI', link: pageLink('/adl-cli') },
            { text: 'Channels', link: pageLink('/cli-channels') },
            { text: 'Kubernetes Operator', link: pageLink('/operator') },
            { text: 'GitHub Action', link: pageLink('/github-action') },
          ],
        },
        {
          text: 'Protocols',
          items: [
            { text: 'MCP Integration', link: pageLink('/mcp') },
            { text: 'A2A Integration', link: pageLink('/a2a') },
            { text: 'TypeScript ADK', link: pageLink('/typescript-adk') },
            { text: 'A2A Debugger', link: pageLink('/a2a-debugger') },
            { text: 'A2A Registry', link: pageLink('/registry') },
            { text: 'Skills Catalog', link: pageLink('/skills') },
          ],
        },
      ],
      sidebar: [
        {
          text: 'Getting Started',
          collapsed: false,
          items: [
            { text: 'Introduction', link: '/' },
            { text: 'Getting Started', link: pageLink('/getting-started') },
            { text: 'Architecture Overview', link: pageLink('/architecture-overview') },
          ],
        },
        {
          text: 'Core Concepts',
          collapsed: false,
          items: [
            { text: 'Configuration', link: pageLink('/configuration') },
            { text: 'Authentication', link: pageLink('/authentication') },
            { text: 'Deployment', link: pageLink('/deployment') },
            { text: 'Supported Providers', link: pageLink('/supported-providers') },
          ],
        },
        {
          text: 'Kubernetes Operator',
          collapsed: false,
          items: [{ text: 'Operator', link: pageLink('/operator') }],
        },
        {
          text: 'Model Context Protocol',
          collapsed: false,
          items: [{ text: 'MCP Integration', link: pageLink('/mcp') }],
        },
        {
          text: 'Agent-To-Agent (A2A)',
          collapsed: false,
          items: [
            { text: 'A2A Integration', link: pageLink('/a2a') },
            { text: 'TypeScript ADK', link: pageLink('/typescript-adk') },
            { text: 'A2A Debugger', link: pageLink('/a2a-debugger') },
            { text: 'A2A Registry', link: pageLink('/registry') },
          ],
        },
        {
          text: 'Agent Skills',
          collapsed: false,
          items: [{ text: 'Skills Catalog', link: pageLink('/skills') }],
        },
        {
          text: 'API Reference',
          collapsed: false,
          items: [
            { text: 'REST API', link: pageLink('/api-reference') },
            { text: 'SDKs', link: pageLink('/sdks') },
          ],
        },
        {
          text: 'Tools',
          collapsed: false,
          items: [
            { text: 'CLI', link: pageLink('/cli') },
            { text: 'ADL CLI', link: pageLink('/adl-cli') },
            { text: 'Channels', link: pageLink('/cli-channels') },
            { text: 'GitHub Action', link: pageLink('/github-action') },
          ],
        },
        {
          text: 'Guides',
          collapsed: false,
          items: [
            { text: 'Examples', link: pageLink('/examples') },
            { text: 'IDEs', link: pageLink('/ides') },
            { text: 'Observability', link: pageLink('/observability') },
            { text: 'Troubleshooting', link: pageLink('/troubleshooting') },
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
          'Released under the <a href="https://github.com/inference-gateway/docs/blob/main/LICENSE">Apache-2.0 License</a>.',
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
        modulePreload: {
          resolveDependencies: (_filename, deps) =>
            deps.filter(
              (d) =>
                !/(?:^|\/)(?:[A-Za-z0-9]*Diagram-|diagram-|classDiagram|stateDiagram|wardley(?:Diagram)?-|dagre-|cose-bilkent-|cytoscape\.esm|katex|sankey|kanban-definition|timeline-definition|mindmap-definition|virtual_mermaid)/.test(
                  d
                )
            ),
        },
      },
    },
  })
);
