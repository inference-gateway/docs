import type { Metadata } from 'next';
import ADLCLIContent from './ADLCLIContent';

export const metadata: Metadata = {
  title: 'ADL CLI - Inference Gateway',
  description:
    'Generate enterprise-ready A2A agent servers from Agent Definition Language (ADL) YAML files. Multi-language code generation, service injection, CI/CD pipelines, and cloud deployment.',
  openGraph: {
    title: 'ADL CLI - Inference Gateway',
    description:
      'Generate enterprise-ready A2A agent servers from Agent Definition Language (ADL) YAML files. Multi-language code generation, service injection, CI/CD pipelines, and cloud deployment.',
  },
};

export default function ADLCLIPage() {
  return <ADLCLIContent />;
}
