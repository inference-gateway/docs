"use client"

import type { MDXComponents } from 'mdx/types'
import React, { useEffect, useRef, useState } from 'react'

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

// Mermaid diagram component
const MermaidDiagram = ({ children }: { children: string }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const diagramId = useRef(`mermaid-${Math.random().toString(36).substring(2, 11)}`);

  useEffect(() => {
    const renderDiagram = async () => {
      if (typeof window === 'undefined') return;

      try {
        // Dynamically import mermaid to avoid SSR issues
        const mermaid = (await import('mermaid')).default;
        
        // Initialize mermaid with default config
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'strict',
          flowchart: { htmlLabels: true, curve: 'linear' },
          themeVariables: {
            primaryColor: '#3182ce',
            primaryTextColor: '#ffffff',
            primaryBorderColor: '#2b6cb0',
            lineColor: '#4a5568',
            secondaryColor: '#f7fafc',
            tertiaryColor: '#edf2f7'
          }
        });

        const { svg } = await mermaid.render(diagramId.current, children);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(`Diagram rendering error`);
      }
    };

    renderDiagram();
  }, [children]);

  if (error) {
    return (
      <div className="mermaid-error p-4 border border-red-300 bg-red-50 text-red-800 rounded">
        <p className="font-bold">Mermaid Diagram Error:</p>
        <pre>{error}</pre>
        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">{children}</pre>
      </div>
    );
  }

  return (
    <div className="mermaid-diagram my-6" dangerouslySetInnerHTML={{ __html: svg }} ref={mermaidRef} />
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
    // Support mermaid code blocks
    pre: (props) => {
      const children = props.children;
      
      // Check if this is a mermaid code block
      if (
        children &&
        children.props &&
        children.props.className &&
        children.props.className.includes('language-mermaid')
      ) {
        return <MermaidDiagram>{children.props.children}</MermaidDiagram>;
      }
      
      return <pre {...props} />;
    },
    a: ({ href, children, ...props }) => {
      if (href?.startsWith('#')) {
        return (
          <a href={href} {...props} onClick={(e) => {
            e.preventDefault();
            const targetId = href.replace('#', '');
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
              const headerOffset = 80;
              const elementPosition = targetElement.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
              
              window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
              });
              
              window.history.pushState(null, '', href);
            }
          }}>
            {children}
          </a>
        );
      }
      return <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>;
    },
    ...components,
  }
}
