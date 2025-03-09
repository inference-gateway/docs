"use client"

import type { MDXComponents } from 'mdx/types'
import { useEffect, useRef } from 'react'

const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-');
};

type HeadingProps = {
  as: React.ElementType;
  id?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLHeadingElement>;
const Heading = ({ as: Component, id, children, ...props }: HeadingProps) => {
  const slug = id || createSlug(typeof children === 'string' ? children : '');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Check if there's a hash in the URL that matches this heading
    if (typeof window !== 'undefined' && headingRef.current) {
      const { hash } = window.location;
      if (hash === `#${slug}`) {
        headingRef.current.scrollIntoView();
      }
    }
  }, [slug]);

  return (
    <Component id={slug} ref={headingRef} {...props}>
      <a href={`#${slug}`} className="anchor-link">
        {children}
      </a>
    </Component>
  );
};

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => <Heading as="h1" {...props} />,
    h2: (props) => <Heading as="h2" {...props} />,
    h3: (props) => <Heading as="h3" {...props} />,
    h4: (props) => <Heading as="h4" {...props} />,
    h5: (props) => <Heading as="h5" {...props} />,
    h6: (props) => <Heading as="h6" {...props} />,
    a: ({ href, children, ...props }) => {
      if (href?.startsWith('#')) {
        return (
          <a href={href} {...props} onClick={(e) => {
            e.preventDefault();
            const targetId = href.replace('#', '');
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
              targetElement.scrollIntoView({ behavior: 'instant' });
              window.history.pushState(null, '', href);
            }
          }}>
            {children}
          </a>
        );
      }
      return <a href={href} {...props}>{children}</a>;
    },
    ...components,
  }
}
