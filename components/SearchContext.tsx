'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSearch } from '@/hooks/useSearch';
import type { SearchResult } from '@/lib/utils';

type SearchContextType = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isLoading: boolean;
  selectedIndex: number;
  indexStatus: 'loading' | 'ready' | 'error';
  performSearch: (query: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  toggleSearch: () => void;
  rebuildIndex: () => Promise<void>;
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const searchState = useSearch();

  return <SearchContext.Provider value={searchState}>{children}</SearchContext.Provider>;
}

export function useSearchContext() {
  const context = useContext(SearchContext);

  if (context === undefined) {
    throw new Error('useSearchContext must be used within a SearchProvider');
  }

  return context;
}
