import type { Metadata } from 'next';
import SDKsContent from './SDKsContent';

export const metadata: Metadata = {
  title: 'SDKs - Inference Gateway',
  description:
    'Explore official SDKs for Inference Gateway including TypeScript, Python, Go, and Rust implementations.',
};

export default function Page() {
  return <SDKsContent />;
}
