import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import IDEsContent from './IDEsContent';

export const metadata: Metadata = pageMetadata({
  title: 'IDE Integration',
  description:
    'Integrate Inference Gateway with popular IDEs and development environments for enhanced developer experience.',
  path: '/ides',
});

export default function Page() {
  return <IDEsContent />;
}
