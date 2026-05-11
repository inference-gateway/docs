import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import GettingStartedContent from './GettingStartedContent';

export const metadata: Metadata = pageMetadata({
  title: 'Getting Started',
  description:
    'Get started with Inference Gateway quickly with installation guides, quick start examples, and first steps.',
  path: '/getting-started',
});

export default function Page() {
  return <GettingStartedContent />;
}
