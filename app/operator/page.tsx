import type { Metadata } from 'next';
import OperatorContent from './OperatorContent';

export const metadata: Metadata = {
  title: 'Kubernetes Operator - Inference Gateway',
  description:
    'Manage Inference Gateway, A2A Agents, MCP servers, and chat-channel Orchestrators declaratively with the Inference Gateway Kubernetes Operator.',
};

export default function Page() {
  return <OperatorContent />;
}
