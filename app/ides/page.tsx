import type { Metadata } from 'next';
import IDEsContent from './IDEsContent';

export const metadata: Metadata = {
  title: 'IDE Integration - Inference Gateway',
  description:
    'Integrate Inference Gateway with popular IDEs and development environments for enhanced developer experience.',
};

export default function Page() {
  return <IDEsContent />;
}
