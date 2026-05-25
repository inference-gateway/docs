import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import TroubleshootingContent from './TroubleshootingContent';

export const metadata: Metadata = pageMetadata({
  title: 'Troubleshooting',
  description:
    'Diagnose and resolve common Inference Gateway issues: authentication failures, MCP disconnects, vision rejections, provider 4xx errors, and middleware bypass.',
  path: '/troubleshooting',
});

export default function Page() {
  return <TroubleshootingContent />;
}
