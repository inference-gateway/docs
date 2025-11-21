'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { loadSearchIndex, searchDocumentation, type SearchResult } from '@/lib/utils';

export function useSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [indexStatus, setIndexStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const router = useRouter();
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      previousPathnameRef.current = pathname;
      setIsOpen(false);
      setQuery('');
      setResults([]);
    }
  }, [pathname]);

  useEffect(() => {
    async function loadIndex() {
      setIndexStatus('loading');
      try {
        const success = await loadSearchIndex();
        setIndexStatus(success ? 'ready' : 'error');
      } catch (error) {
        setIndexStatus('error');
        console.error('Failed to load search index:', error);
      }
    }
    loadIndex();
  }, []);

  const performSearch = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);

      if (searchQuery.trim().length === 0) {
        setResults([]);
        return;
      }

      if (indexStatus !== 'ready') {
        console.warn('Search index not ready yet');
        return;
      }

      setIsLoading(true);

      const timer = setTimeout(() => {
        const searchResults = searchDocumentation(searchQuery);
        setResults(searchResults);
        setSelectedIndex(0);
        setIsLoading(false);
      }, 200);

      return () => clearTimeout(timer);
    },
    [indexStatus]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prevIndex) =>
          prevIndex < results.length - 1 ? prevIndex + 1 : prevIndex
        );
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : prevIndex));
      }

      if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        const selectedResult = results[selectedIndex];
        if (selectedResult) {
          router.push(selectedResult.url);
          setIsOpen(false);
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    },
    [results, selectedIndex, router]
  );

  const toggleSearch = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  const rebuildIndex = useCallback(() => {
    console.log('Search index is static and rebuilt during build process');
    return Promise.resolve();
  }, []);

  return {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    results,
    isLoading,
    selectedIndex,
    indexStatus,
    performSearch,
    handleKeyDown,
    toggleSearch,
    rebuildIndex,
  };
}
