import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import CLIChannelsContent from './CLIChannelsContent';

export const metadata: Metadata = pageMetadata({
  title: 'Channels',
  description:
    'Control the Inference Gateway agent remotely from messaging platforms like Telegram. Setup, configuration, tool approval, scheduled tasks, and troubleshooting.',
  path: '/cli-channels',
});

export default function CLIChannelsPage() {
  return <CLIChannelsContent />;
}
