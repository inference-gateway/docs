"use client";

import React, { useEffect, useState } from 'react';
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

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-100px 0% -80% 0%',
        threshold: 1.0,
      }
    );

    headingElements.forEach((el) => {
      observer.observe(el);
    });

    return () => {
      headingElements.forEach((el) => {
        observer.unobserve(el);
      });
    };
  }, [pathname]);

  if (headings.length === 0) return null;

  return (
    <div className="sticky top-24">
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
