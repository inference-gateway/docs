import type { Metadata } from 'next';
import DeploymentContent from './DeploymentContent';

export const metadata: Metadata = {
  title: 'Deployment - Inference Gateway',
  description:
    'Deploy Inference Gateway in production environments including Docker, Kubernetes, and cloud platforms.',
};

export default function Page() {
  return <DeploymentContent />;
}
