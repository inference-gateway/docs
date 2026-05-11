import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import A2AContent from './A2AContent';

export const metadata: Metadata = pageMetadata({
  title: 'Agent-To-Agent (A2A) Integration',
  description:
    'Learn how to use Agent-To-Agent (A2A) integration in Inference Gateway to coordinate multiple specialized agents and extend LLM capabilities.',
  path: '/a2a',
});

export default function A2APage() {
  return <A2AContent />;
}
