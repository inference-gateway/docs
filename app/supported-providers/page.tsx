import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import SupportedProvidersContent from './SupportedProvidersContent';

export const metadata: Metadata = pageMetadata({
  title: 'Supported Providers',
  description:
    'Discover all supported AI model providers and services that work with Inference Gateway including OpenAI, Anthropic, and more.',
  path: '/supported-providers',
});

export default function Page() {
  return <SupportedProvidersContent />;
}
