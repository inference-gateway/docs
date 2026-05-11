import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import MCPContent from './MCPContent';

export const metadata: Metadata = pageMetadata({
  title: 'Model Context Protocol (MCP)',
  description:
    'Learn how to use Model Context Protocol (MCP) with Inference Gateway to extend LLM capabilities and integrate external data sources.',
  path: '/mcp',
});

export default function Page() {
  return <MCPContent />;
}
