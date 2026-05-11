import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ConfigurationContent from './ConfigurationContent';

export const metadata: Metadata = pageMetadata({
  title: 'Configuration',
  description:
    'Learn how to configure Inference Gateway settings, environment variables, and deployment options.',
  path: '/configuration',
});

export default function Page() {
  return <ConfigurationContent />;
}
