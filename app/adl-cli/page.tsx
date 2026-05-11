import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ADLCLIContent from './ADLCLIContent';

export const metadata: Metadata = pageMetadata({
  title: 'ADL CLI',
  description:
    'Generate enterprise-ready A2A agent servers from Agent Definition Language (ADL) YAML files. Multi-language code generation, service injection, CI/CD pipelines, and cloud deployment.',
  path: '/adl-cli',
});

export default function ADLCLIPage() {
  return <ADLCLIContent />;
}
