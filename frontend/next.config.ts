import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return ['', 'about', 'services', 'activities', 'volunteer', 'donate', 'contact', 'login'].map(page => ({
      source: page ? `/${page}` : '/',
      destination: page ? `/en/${page}` : '/en',
      permanent: false,
    }));
  },
};
export default nextConfig;
