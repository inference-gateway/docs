import fs from 'fs/promises';
import path from 'path';

export type IndexEntry = {
  title: string;
  excerpt: string;
  url: string;
  category?: string;
}

async function generateSearchIndex() {
  const searchIndex: Record<string, IndexEntry[]> = {};
  const markdownDirPath = path.join(process.cwd(), 'markdown');
  
  try {
    await fs.access(markdownDirPath);
    const mdxFiles = await getAllMdxFiles(markdownDirPath);
    
    for (const file of mdxFiles) {
      try {
        const relativePath = path.relative(markdownDirPath, file);
        const content = await fs.readFile(file, 'utf-8');
        const fileName = path.basename(file, '.mdx');
        
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : fileName;
        
        const url = fileName === 'main' ? '/' : `/${fileName}`;
        const category = path.dirname(relativePath) !== '.' ? path.dirname(relativePath) : undefined;
        
        const excerptMatch = content.match(/^#\s+.+\n+(.+)/m);
        const excerpt = excerptMatch ? excerptMatch[1].trim() : '';
        
        const entry: IndexEntry = { title, excerpt, url, category };

        const headings = [...content.matchAll(/^#+\s+(.+)$/gm)].map(m => m[1]);
        const contentWords = content
          .toLowerCase()
          .split(/[\s,\.;:!"'\(\)\[\]\{\}\n]+/)
          .filter(word => word.length > 1 && word.length < 30);

        const keywords = [
          ...new Set([
            ...title.toLowerCase().split(/\s+/),
            ...headings.flatMap(h => h.toLowerCase().split(/\s+/)),
            ...fileName.split('-'),
            ...contentWords.slice(0, 500)
          ])
        ]
        .map(word => word.toLowerCase().replace(/[^\w]/g, ''))
        .filter(word => word.length > 1);

        for (const keyword of keywords) {
          if (keyword.length < 2 || keyword.length > 20) continue;
          
          if (!searchIndex[keyword]) {
            searchIndex[keyword] = [];
          }
          
          if (!searchIndex[keyword].some(e => e.url === entry.url)) {
            searchIndex[keyword].push(entry);
          }
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }

    const outputPath = path.join(process.cwd(), 'public', 'search-index.json');
    await fs.writeFile(outputPath, JSON.stringify(searchIndex));
    console.log(`Search index generated at ${outputPath}`);
  } catch (error) {
    console.error('Error generating search index:', error);
    process.exit(1);
  }
}

async function getAllMdxFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      return entry.isDirectory() 
        ? getAllMdxFiles(fullPath)
        : (entry.name.endsWith('.mdx') ? [fullPath] : []);
    })
  );
  return files.flat();
}

generateSearchIndex();
