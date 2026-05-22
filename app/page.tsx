import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import HomeContent from './HomeContent';

const home = pageMetadata({
  title: 'Inference Gateway Documentation',
  description:
    'Open-source proxy for multiple language model APIs. Unify access to OpenAI, Anthropic, Google, Groq, Ollama, and more - with MCP, A2A, and observability built in.',
  path: '/',
});

export const metadata: Metadata = {
  ...home,
  title: {
    absolute: 'Inference Gateway Documentation',
  },
};

export default function Home() {
  return <HomeContent />;
}
