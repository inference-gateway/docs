import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import CLIContent from './CLIContent';

export const metadata: Metadata = pageMetadata({
  title: 'CLI',
  description:
    'Powerful CLI with interactive chat, autonomous agents, Computer Use tools for GUI automation, and development workflows. Features screenshot capture, mouse/keyboard control, web terminal, cost tracking, and comprehensive tool integration.',
  path: '/cli',
});

export default function CLIPage() {
  return <CLIContent />;
}
