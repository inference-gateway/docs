import type { Metadata } from 'next';
import CLIChannelsContent from './CLIChannelsContent';

export const metadata: Metadata = {
  title: 'Channels - Inference Gateway',
  description:
    'Control the Inference Gateway agent remotely from messaging platforms like Telegram. Setup, configuration, tool approval, scheduled tasks, and troubleshooting.',
  openGraph: {
    title: 'Channels - Inference Gateway',
    description:
      'Control the Inference Gateway agent remotely from messaging platforms like Telegram. Setup, configuration, tool approval, scheduled tasks, and troubleshooting.',
  },
};

export default function CLIChannelsPage() {
  return <CLIChannelsContent />;
}
