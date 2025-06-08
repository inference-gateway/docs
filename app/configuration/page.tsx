import type { Metadata } from 'next';
import ConfigurationContent from './ConfigurationContent';

export const metadata: Metadata = {
  title: 'Configuration - Inference Gateway',
  description:
    'Learn how to configure Inference Gateway settings, environment variables, and deployment options.',
};

export default function Page() {
  return <ConfigurationContent />;
}
