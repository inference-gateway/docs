import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import APIReferenceContent from './APIReferenceContent';

export const metadata: Metadata = pageMetadata({
  title: 'API Reference',
  description:
    'Complete API reference for Inference Gateway including endpoints, request/response formats, and authentication methods.',
  path: '/api-reference',
});

export default function Page() {
  return <APIReferenceContent />;
}
