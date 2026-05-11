import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import DeploymentContent from './DeploymentContent';

export const metadata: Metadata = pageMetadata({
  title: 'Deployment',
  description:
    'Deploy Inference Gateway in production environments including Docker, Kubernetes, and cloud platforms.',
  path: '/deployment',
});

export default function Page() {
  return <DeploymentContent />;
}
