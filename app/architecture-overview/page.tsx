import type { Metadata } from 'next';
import ArchitectureOverviewContent from './ArchitectureOverviewContent';

export const metadata: Metadata = {
  title: 'Architecture Overview - Inference Gateway',
  description:
    'Learn about the architecture and design principles of Inference Gateway, including core components and system organization.',
};

export default function Page() {
  return <ArchitectureOverviewContent />;
}
