import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import AuthenticationContent from './AuthenticationContent';

export const metadata: Metadata = pageMetadata({
  title: 'Authentication',
  description:
    'Configure authentication for Inference Gateway including API keys, OAuth, and other security methods.',
  path: '/authentication',
});

export default function Page() {
  return <AuthenticationContent />;
}
