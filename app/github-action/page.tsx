import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import GithubActionContent from './GithubActionContent';

export const metadata: Metadata = pageMetadata({
  title: 'GitHub Action',
  description:
    'Run the Inference Gateway agent from a GitHub Actions workflow with infer-action: automated issue triage, AI code review, scheduled agents, and pull request creation driven by trigger phrases.',
  path: '/github-action',
});

export default function GithubActionPage() {
  return <GithubActionContent />;
}
