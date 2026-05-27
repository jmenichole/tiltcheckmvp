import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@tiltcheck/trust', '@tiltcheck/shared'],
};

export default nextConfig;
