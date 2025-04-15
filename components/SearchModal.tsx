'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useSearchContext } from './SearchContext';
import { Search, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export function SearchModal() {
  const {
    isOpen,
    setIsOpen,
    query,
    results,
    isLoading,
    selectedIndex,
    indexStatus,
    performSearch,
    handleKeyDown,
    rebuildIndex,
  } = useSearchContext();

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (results.length > 0 && resultsContainerRef.current) {
      const selectedEl = resultsContainerRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, results]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[--color-search-backdrop] backdrop-blur-md transition-opacity"
        aria-hidden="true"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="relative mx-auto max-w-2xl transform overflow-hidden rounded-xl bg-[--color-search-bg] shadow-2xl ring-1 ring-[--color-search-border] transition-all">
        {/* Search input */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[--color-search-icon]" />
          <input
            ref={inputRef}
            type="text"
            className="h-12 w-full border-0 bg-transparent pl-11 pr-11 text-[--color-search-text] placeholder:text-[--color-search-placeholder] focus:outline-none focus:ring-0 sm:text-sm"
            placeholder="Search documentation..."
            value={query}
            onChange={(e) => performSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="absolute right-3 top-3.5 flex items-center gap-1"
            onClick={() => setIsOpen(false)}
          >
            <span className="text-xs text-[--color-search-placeholder] hidden sm:inline">ESC</span>
            <X className="h-5 w-5 text-[--color-search-icon] hover:text-[--color-search-text]" />
          </button>
        </div>

        {/* Search results */}
        <div className="max-h-80 overflow-y-auto p-2 pb-4" ref={resultsContainerRef}>
          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-[--color-search-icon]" />
            </div>
          )}

          {/* Index loading state */}
          {!isLoading && indexStatus === 'loading' && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-[--color-search-icon] mb-2" />
              <p className="text-sm text-[--color-search-text]">Building search index...</p>
              <p className="text-xs text-[--color-search-placeholder] mt-1">
                This might take a moment
              </p>
            </div>
          )}

          {/* Index error state */}
          {!isLoading && indexStatus === 'error' && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <AlertCircle className="h-6 w-6 text-[--color-destructive] mb-2" />
              <p className="text-sm text-[--color-search-text]">Error building search index</p>
              <button
                onClick={() => rebuildIndex()}
                className="mt-2 inline-flex items-center text-xs text-[--color-accent] hover:text-[--color-accent-hover]"
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Try again
              </button>
            </div>
          )}

          {/* No results state */}
          {!isLoading && indexStatus === 'ready' && query && results.length === 0 && (
            <p className="p-4 text-sm text-[--color-search-placeholder]">
              No results found for &quot;{query}&quot;
            </p>
          )}

          {/* Results list */}
          {!isLoading && results.length > 0 && (
            <ul className="divide-y divide-[--color-search-border]">
              {results.map((result, index) => (
                <li
                  key={result.url}
                  data-index={index}
                  className={cn(
                    'cursor-pointer px-4 py-3',
                    index === selectedIndex
                      ? 'bg-[--color-search-selected] border-l-2 border-[--color-search-selected-border]'
                      : 'hover:bg-[--color-search-button-hover] border-l-2 border-transparent'
                  )}
                >
                  <Link href={result.url} className="block" onClick={() => setIsOpen(false)}>
                    <h3 className="truncate text-sm font-medium text-[--color-search-text]">
                      {result.title}
                    </h3>
                    {result.category && (
                      <p className="mt-1 truncate text-xs text-[--color-search-placeholder]">
                        {result.category}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-[--color-search-placeholder] line-clamp-2">
                      {result.excerpt}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Keyboard shortcuts */}
        <div className="border-t border-[--color-search-border] bg-[--color-search-button] px-4 py-3 flex justify-between text-xs text-[--color-search-placeholder]">
          <div className="flex gap-2">
            <kbd className="px-1 bg-[--color-bg] rounded border border-[--color-search-border]">
              ↑
            </kbd>
            <kbd className="px-1 bg-[--color-bg] rounded border border-[--color-search-border]">
              ↓
            </kbd>
            <span>to navigate</span>
          </div>
          <div className="flex gap-2">
            <kbd className="px-1 bg-[--color-bg] rounded border border-[--color-search-border]">
              Enter
            </kbd>
            <span>to select</span>
          </div>
          <div className="flex gap-2">
            <kbd className="px-1 bg-[--color-bg] rounded border border-[--color-search-border]">
              Esc
            </kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
