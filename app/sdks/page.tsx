import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import SDKsContent from './SDKsContent';

export const metadata: Metadata = pageMetadata({
  title: 'SDKs',
  description:
    'Explore official SDKs for Inference Gateway including TypeScript, Python, Go, and Rust implementations.',
  path: '/sdks',
});

export default function Page() {
  return <SDKsContent />;
}
