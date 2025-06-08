import type { Metadata } from 'next';
import APIReferenceContent from './APIReferenceContent';

export const metadata: Metadata = {
  title: 'API Reference - Inference Gateway',
  description:
    'Complete API reference for Inference Gateway including endpoints, request/response formats, and authentication methods.',
};

export default function Page() {
  return <APIReferenceContent />;
}
