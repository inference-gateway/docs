import type { Metadata } from 'next';
import MCPContent from './MCPContent';

export const metadata: Metadata = {
  title: 'Model Context Protocol (MCP) - Inference Gateway',
  description:
    'Learn how to use Model Context Protocol (MCP) with Inference Gateway to extend LLM capabilities and integrate external data sources.',
};

export default function Page() {
  return <MCPContent />;
}
