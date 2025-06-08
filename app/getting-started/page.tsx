import type { Metadata } from 'next';
import GettingStartedContent from './GettingStartedContent';

export const metadata: Metadata = {
  title: 'Getting Started - Inference Gateway',
  description:
    'Get started with Inference Gateway quickly with installation guides, quick start examples, and first steps.',
};

export default function Page() {
  return <GettingStartedContent />;
}
