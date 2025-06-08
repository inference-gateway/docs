import type { Metadata } from 'next';
import UIContent from './UIContent';

export const metadata: Metadata = {
  title: 'User Interface - Inference Gateway',
  description:
    'Learn about the Inference Gateway UI, its features, and how to interact with the web-based management interface.',
};

export default function Page() {
  return <UIContent />;
}
