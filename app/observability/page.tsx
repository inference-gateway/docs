import type { Metadata } from 'next';
import ObservabilityContent from './ObservabilityContent';

export const metadata: Metadata = {
  title: 'Observability - Inference Gateway',
  description:
    'Monitor and observe Inference Gateway with logging, metrics, tracing, and performance monitoring tools.',
};

export default function Page() {
  return <ObservabilityContent />;
}
