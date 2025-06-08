import type { Metadata } from 'next';
import SupportedProvidersContent from './SupportedProvidersContent';

export const metadata: Metadata = {
  title: 'Supported Providers - Inference Gateway',
  description:
    'Discover all supported AI model providers and services that work with Inference Gateway including OpenAI, Anthropic, and more.',
};

export default function Page() {
  return <SupportedProvidersContent />;
}
