import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ExamplesContent from './ExamplesContent';

export const metadata: Metadata = pageMetadata({
  title: 'Examples',
  description:
    'Explore practical examples and use cases for implementing Inference Gateway in various scenarios.',
  path: '/examples',
});

export default function Page() {
  return <ExamplesContent />;
}
