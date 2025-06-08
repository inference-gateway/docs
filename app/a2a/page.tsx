import type { Metadata } from 'next';
import A2AContent from './A2AContent';

export const metadata: Metadata = {
  title: 'Agent-To-Agent (A2A) Integration - Inference Gateway',
  description:
    'Learn how to use Agent-To-Agent (A2A) integration in Inference Gateway to coordinate multiple specialized agents and extend LLM capabilities.',
};

export default function A2APage() {
  return <A2AContent />;
}
