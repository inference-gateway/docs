import type { Metadata } from 'next';
import CLIContent from './CLIContent';

export const metadata: Metadata = {
  title: 'CLI - Inference Gateway',
  description:
    'Powerful CLI with interactive chat, autonomous agents, Computer Use tools for GUI automation, and development workflows. Features screenshot capture, mouse/keyboard control, web terminal, cost tracking, and comprehensive tool integration.',
  openGraph: {
    title: 'CLI - Inference Gateway',
    description:
      'Powerful CLI with interactive chat, autonomous agents, Computer Use tools for GUI automation, and development workflows. Features screenshot capture, mouse/keyboard control, web terminal, cost tracking, and comprehensive tool integration.',
  },
};

export default function CLIPage() {
  return <CLIContent />;
}
