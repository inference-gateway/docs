import createMDX from '@next/mdx';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/docs' : '',
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  images: {
    unoptimized: true,
  },
};

const withMDX = createMDX({})
 
export default withMDX(nextConfig);
