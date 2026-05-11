import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ObservabilityContent from './ObservabilityContent';

export const metadata: Metadata = pageMetadata({
  title: 'Observability',
  description:
    'Monitor and observe Inference Gateway with logging, metrics, tracing, and performance monitoring tools.',
  path: '/observability',
});

export default function Page() {
  return <ObservabilityContent />;
}
