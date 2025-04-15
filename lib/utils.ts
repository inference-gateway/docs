import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SearchResult = {
  title: string;
  excerpt: string;
  url: string;
  category?: string;
};

let searchIndex: Record<string, SearchResult[]> = {};

export async function loadSearchIndex() {
  try {
    const response = await fetch('/search-index.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    searchIndex = await response.json();
    return true;
  } catch (error) {
    console.error('Failed to load search index:', error);
    return false;
  }
}

export function isSearchIndexLoaded(): boolean {
  return Object.keys(searchIndex).length > 0;
}

export function searchDocumentation(query: string): SearchResult[] {
  if (!query || query.trim().length === 0) return [];
  if (!isSearchIndexLoaded()) return [];

  query = query.toLowerCase().trim();
  const terms = query.split(/\s+/);
  let results: SearchResult[] = [];

  terms.forEach((term) => {
    if (term.length < 2) return;

    if (searchIndex[term]) {
      results = [...results, ...searchIndex[term]];
    }

    Object.entries(searchIndex).forEach(([key, entries]) => {
      if (key.includes(term)) {
        results = [...results, ...entries];
      }
    });
  });

  const uniqueResults = results.filter(
    (result, index, self) => index === self.findIndex((r) => r.url === result.url)
  );

  return uniqueResults.slice(0, 10);
}
