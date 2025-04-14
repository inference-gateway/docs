"use client";

import React, { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

const TableOfContents = () => {
  const [headings, setHeadings] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const pathname = usePathname();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const clickedRef = useRef<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const contentEl = document.querySelector('.docs-content');
    if (!contentEl) return;

    const headingElements = Array.from(contentEl.querySelectorAll('h1, h2, h3'));
    
    const items: TOCItem[] = headingElements.map((el) => {
      if (!el.id) {
        el.id = el.textContent?.toLowerCase().replace(/\s+/g, '-') || '';
      }
      
      return {
        id: el.id,
        text: el.textContent || '',
        level: parseInt(el.tagName[1], 10),
      };
    });
    
    setHeadings(items);

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const visibleHeadings = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (clickedRef.current) {
          return;
        }

        entries.forEach((entry) => {
          visibleHeadings.set(entry.target.id, entry.intersectionRatio);
        });

        let maxRatio = 0;
        let currentActiveId = '';
        
        visibleHeadings.forEach((ratio, id) => {
          if (ratio > maxRatio) {
            maxRatio = ratio;
            currentActiveId = id;
          }
        });

        if (currentActiveId && currentActiveId !== activeId) {
          setActiveId(currentActiveId);
        }
      },
      {
        root: null,
        rootMargin: '-80px 0px -40% 0px',
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1]
      }
    );

    headingElements.forEach((el) => {
      if (observerRef.current) {
        observerRef.current.observe(el);
      }
    });

    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      setActiveId(id);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname, activeId]);

  const handleClick = (e: React.MouseEvent, headingId: string) => {
    e.preventDefault();
    const targetEl = document.getElementById(headingId);
    if (targetEl) {
      clickedRef.current = true;

      setActiveId(headingId);

      window.history.pushState(null, '', `#${headingId}`);

      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        clickedRef.current = false;
      }, 1000);
    }
  };

  if (headings.length === 0) return null;

  return (
    <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto py-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-500">On this page</p>
        <ul className="space-y-2 text-sm">
          {headings.map((heading) => (
            <li 
              key={heading.id} 
              className={cn(
                "border-l-2",
                activeId === heading.id 
                  ? "border-primary" 
                  : "border-gray-200"
              )}
              style={{ paddingLeft: `${(heading.level - 2) * 0.75}rem` }}
            >
              <a 
                href={`#${heading.id}`}
                className={cn(
                  "block pl-3 py-1 text-sm",
                  activeId === heading.id 
                    ? "text-primary font-medium" 
                    : "text-gray-600 hover:text-gray-900"
                )}
                onClick={(e) => handleClick(e, heading.id)}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TableOfContents;
