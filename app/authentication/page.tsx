import type { Metadata } from 'next';
import AuthenticationContent from './AuthenticationContent';

export const metadata: Metadata = {
  title: 'Authentication - Inference Gateway',
  description:
    'Configure authentication for Inference Gateway including API keys, OAuth, and other security methods.',
};

export default function Page() {
  return <AuthenticationContent />;
}
