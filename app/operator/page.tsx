import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import OperatorContent from './OperatorContent';

export const metadata: Metadata = pageMetadata({
  title: 'Kubernetes Operator',
  description:
    'Manage Inference Gateway, A2A Agents, MCP servers, and chat-channel Orchestrators declaratively with the Inference Gateway Kubernetes Operator.',
  path: '/operator',
});

export default function Page() {
  return <OperatorContent />;
}
