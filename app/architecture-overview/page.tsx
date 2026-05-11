import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ArchitectureOverviewContent from './ArchitectureOverviewContent';

export const metadata: Metadata = pageMetadata({
  title: 'Architecture Overview',
  description:
    'Learn about the architecture and design principles of Inference Gateway, including core components and system organization.',
  path: '/architecture-overview',
});

export default function Page() {
  return <ArchitectureOverviewContent />;
}
