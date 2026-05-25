import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import A2ADebuggerContent from './A2ADebuggerContent';

export const metadata: Metadata = pageMetadata({
  title: 'A2A Debugger',
  description:
    'Debug, monitor, and inspect Agent-to-Agent (A2A) servers from the command line. Test connectivity, list and stream tasks, replay conversations, and inspect agent cards with the a2a CLI.',
  path: '/a2a-debugger',
});

export default function A2ADebuggerPage() {
  return <A2ADebuggerContent />;
}
