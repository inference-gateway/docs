'use client';

import type { MDXComponents } from 'mdx/types';
import React, { useEffect, useRef, useState } from 'react';

import { Check, Copy, FileCode, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageModal } from '@/components/ImageModal';

import Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-shell-session';
import 'prismjs/components/prism-http';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';

declare global {
  interface Window {
    Prism: {
      highlightElement: (element: HTMLElement | null) => void;
    };
  }
}

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

const MermaidDiagram = ({ children }: { children: string }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const diagramId = useRef(`mermaid-${Math.random().toString(36).substring(2, 11)}`);

  useEffect(() => {
    const renderDiagram = async () => {
      if (typeof window === 'undefined') return;

      try {
        const mermaid = (await import('mermaid')).default;

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
            tertiaryColor: '#edf2f7',
          },
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

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  if (error) {
    return (
      <div className="mermaid-error p-4 border border-red-300 bg-red-50 text-red-800 rounded">
        <p className="font-bold">Mermaid Diagram Error:</p>
        <pre>{error}</pre>
        <pre className="line-numbers mt-2 p-2 bg-gray-100 rounded overflow-auto">{children}</pre>
      </div>
    );
  }

  return (
    <>
      <div
        className="mermaid-diagram my-6 relative group cursor-zoom-in border border-transparent hover:border-gray-200 rounded-lg p-2 transition-all"
        onClick={handleOpenModal}
        ref={mermaidRef}
      >
        <div className="absolute top-2 right-2 bg-white/80 p-1 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="h-4 w-4 text-gray-500" />
        </div>
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      </div>

      <ImageModal isOpen={isModalOpen} onClose={handleCloseModal} content={svg} title="Diagram" />
    </>
  );
};

interface CodeBlockProps {
  children: string;
  className?: string;
  filename?: string;
}

const CodeBlock = ({ children, className, filename }: CodeBlockProps) => {
  const language = className?.replace(/language-/, '') || '';
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    Prism.highlightAll();
  }, []);

  const copyToClipboard = async () => {
    if (!codeRef.current?.textContent) return;

    try {
      await navigator.clipboard.writeText(codeRef.current.textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code to clipboard:', error);
    }
  };

  const displayLang =
    {
      js: 'JavaScript',
      jsx: 'JSX',
      ts: 'TypeScript',
      tsx: 'TSX',
      bash: 'Terminal',
      sh: 'Shell',
      html: 'HTML',
      css: 'CSS',
      json: 'JSON',
      yaml: 'YAML',
      md: 'Markdown',
      mdx: 'MDX',
      http: 'HTTP',
    }[language] || language.toUpperCase();

  return (
    <div className="my-6 group relative rounded-lg overflow-hidden border border-gray-200">
      {/* Header with filename and language info */}
      <div className="flex items-center justify-between bg-gray-100 px-4 py-2 text-xs text-gray-700">
        <div className="flex items-center">
          {filename && (
            <div className="flex items-center text-gray-500 mr-2">
              <FileCode className="mr-1.5 h-3.5 w-3.5" />
              <span>{filename}</span>
            </div>
          )}
        </div>
        <div className="font-mono">{displayLang}</div>
      </div>

      {/* Code content */}
      <div className="relative">
        <pre
          ref={codeRef}
          className={cn(
            'line-numbers overflow-x-auto p-4 text-sm leading-relaxed',
            'bg-[--color-code-bg] text-[--color-code-text]',
            className
          )}
          tabIndex={0}
        >
          <code className={`language-${language}`}>{children}</code>
        </pre>

        {/* Copy button */}
        <button
          onClick={copyToClipboard}
          className={cn(
            'absolute right-2 top-2 rounded-md p-1.5 transition-opacity',
            'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50',
            'focus:outline-none focus:ring-2 focus:ring-gray-400',
            copied ? 'bg-green-100' : 'bg-gray-100/80'
          )}
          aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
        >
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
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
    ol: (props) => <ol className="list-decimal pl-8 my-4 space-y-2" {...props} />,
    ul: (props) => <ul className="list-disc pl-8 my-4 space-y-2" {...props} />,
    li: (props) => <li className="pl-1" {...props} />,
    pre: (props) => {
      const children = props.children;

      if (
        children &&
        children.props &&
        children.props.className &&
        children.props.className.includes('language-mermaid')
      ) {
        return <MermaidDiagram>{children.props.children}</MermaidDiagram>;
      }

      if (
        children &&
        children.props &&
        children.props.className &&
        /language-/.test(children.props.className)
      ) {
        return (
          <CodeBlock
            className={children.props.className}
            filename={children.props.filename || children.props['data-filename']}
          >
            {children.props.children}
          </CodeBlock>
        );
      }

      return <pre {...props} />;
    },
    a: ({ href, children, ...props }) => {
      if (href?.startsWith('#')) {
        return (
          <a
            href={href}
            {...props}
            onClick={(e) => {
              e.preventDefault();
              const targetId = href.replace('#', '');
              const targetElement = document.getElementById(targetId);
              if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                  top: offsetPosition,
                  behavior: 'smooth',
                });

                window.history.pushState(null, '', href);
              }
            }}
          >
            {children}
          </a>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    },
    code: (props) => {
      return <code {...props} />;
    },
    ...components,
  };
}
