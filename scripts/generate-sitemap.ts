import fs from 'fs';
import { glob } from 'glob';
import path from 'path';

const baseUrl = 'https://inference-gateway.github.io/docs';

async function generateSitemap() {
  const pages = await glob('app/**/page.{tsx,ts,js,jsx,mdx}', { 
    ignore: ['app/api/**', '**/node_modules/**'] 
  });

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  sitemap += `
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`;

  for (const page of pages) {
    if (page.includes('not-found') || 
        page.includes('error') || 
        page.includes('/api/')) {
      continue;
    }

    const route = page
      .replace('app', '')
      .replace(/\/page\.(tsx|ts|js|jsx|mdx)$/, '')
      .replace(/\\/g, '/')
      .replace(/\/index$/, '') || '/';

    if (route === '/sitemap' || route === '/robots') {
      continue;
    }

    const stats = fs.statSync(page);
    const lastMod = stats.mtime.toISOString();

    const segments = route.split('/').filter(Boolean).length;
    const priority = Math.max(0.1, 1.0 - (segments * 0.2)).toFixed(1);

    let changeFreq = 'monthly';
    if (route === '/') {
      changeFreq = 'weekly';
    } else if (route.includes('/blog/')) {
      changeFreq = 'weekly';
    }

    sitemap += `
  <url>
    <loc>${baseUrl}${route}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${changeFreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }

  sitemap += `
</urlset>`;

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
  console.log('Sitemap generated successfully at public/sitemap.xml');
}

generateSitemap().catch(console.error);
