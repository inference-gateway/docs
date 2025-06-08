import type { Metadata } from 'next';
import ExamplesContent from './ExamplesContent';

export const metadata: Metadata = {
  title: 'Examples - Inference Gateway',
  description:
    'Explore practical examples and use cases for implementing Inference Gateway in various scenarios.',
};

export default function Page() {
  return <ExamplesContent />;
}
