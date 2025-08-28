import type { Metadata } from 'next';
import CLIContent from './CLIContent';

export const metadata: Metadata = {
  title: 'CLI - Inference Gateway',
  description:
    'Command-line interface for the Inference Gateway, providing convenient access to LLM providers, conversation management, and advanced features.',
  openGraph: {
    title: 'CLI - Inference Gateway',
    description:
      'Command-line interface for the Inference Gateway, providing convenient access to LLM providers, conversation management, and advanced features.',
  },
};

export default function CLIPage() {
  return <CLIContent />;
}
