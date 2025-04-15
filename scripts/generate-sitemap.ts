import fs from 'fs';
import { glob } from 'glob';
import path from 'path';

const baseUrl = 'https://docs.inference-gateway.com';

async function generateSitemap() {
  const pages = await glob('app/**/page.{tsx,ts,js,jsx,mdx}', {
    ignore: ['app/api/**', '**/node_modules/**'],
  });

  const markdownFiles = await glob('markdown/**/*.mdx');

  const routeToMarkdownMap = new Map<string, string>();
  markdownFiles.forEach((mdxFile) => {
    const baseName = path.basename(mdxFile, '.mdx');
    routeToMarkdownMap.set(`/${baseName}`, mdxFile);
  });

  const rootMdxPath = 'markdown/main.mdx';
  const rootLastMod = fs.existsSync(rootMdxPath)
    ? fs.statSync(rootMdxPath).mtime.toISOString()
    : new Date().toISOString();

  const urlEntries: Array<{
    url: string;
    lastmod: string;
    changefreq: string;
    priority: string;
  }> = [];

  urlEntries.push({
    url: baseUrl,
    lastmod: rootLastMod,
    changefreq: 'weekly',
    priority: '1.0',
  });

  const addedUrls = new Set([baseUrl]);

  for (const page of pages) {
    if (page.includes('not-found') || page.includes('error') || page.includes('/api/')) {
      continue;
    }

    const route =
      page
        .replace('app', '')
        .replace(/\/page\.(tsx|ts|js|jsx|mdx)$/, '')
        .replace(/\\/g, '/')
        .replace(/\/index$/, '') || '/';

    if (route === '/sitemap' || route === '/robots') {
      continue;
    }

    const fullUrl = `${baseUrl}${route}`;

    if (addedUrls.has(fullUrl)) {
      continue;
    }
    addedUrls.add(fullUrl);

    let lastMod: string;
    if (routeToMarkdownMap.has(route)) {
      const mdxFile = routeToMarkdownMap.get(route)!;
      lastMod = fs.statSync(mdxFile).mtime.toISOString();
    } else {
      lastMod = fs.statSync(page).mtime.toISOString();
    }

    const segments = route.split('/').filter(Boolean).length;
    const priority = Math.max(0.1, 1.0 - segments * 0.2).toFixed(1);

    let changeFreq = 'monthly';
    if (route === '/') {
      changeFreq = 'weekly';
    } else if (route.includes('/blog/')) {
      changeFreq = 'weekly';
    }

    urlEntries.push({
      url: fullUrl,
      lastmod: lastMod,
      changefreq: changeFreq,
      priority: priority,
    });
  }

  urlEntries.sort((a, b) => a.url.localeCompare(b.url));

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  for (const entry of urlEntries) {
    sitemap += `
  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`;
  }

  sitemap += `
</urlset>`;

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapPath = path.join(publicDir, 'sitemap.xml');

  if (!fs.existsSync(sitemapPath) || fs.readFileSync(sitemapPath, 'utf-8') !== sitemap) {
    fs.writeFileSync(sitemapPath, sitemap);
    console.log('Sitemap generated with changes at public/sitemap.xml');
  } else {
    console.log('No changes to sitemap detected, skipping write');
  }
}

generateSitemap().catch(console.error);
