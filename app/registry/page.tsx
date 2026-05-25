import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import RegistryContent from './RegistryContent';

export const metadata: Metadata = pageMetadata({
  title: 'A2A Registry',
  description:
    'Discover containerised Agent-to-Agent (A2A) services in the Inference Gateway ecosystem. Browse, consume, and publish A2A agents through the registry at registry.inference-gateway.com.',
  path: '/registry',
});

export default function RegistryPage() {
  return <RegistryContent />;
}
