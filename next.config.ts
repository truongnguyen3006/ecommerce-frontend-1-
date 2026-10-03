import type { NextConfig } from 'next';

const gateway = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/+$/, '');
const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ] }];
  },
  images: {
    // Explicit hosts for Cloudinary uploads and existing catalog photography.
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'static.nike.com' },
      ...(process.env.PRODUCT_IMAGE_HOSTS || '').split(',').map((host) => host.trim()).filter(Boolean)
        .map((hostname) => ({ protocol: 'https' as const, hostname })),
    ],
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${gateway}/api/:path*` },
      { source: '/auth/:path*', destination: `${gateway}/auth/:path*` },
    ];
  },
};
export default nextConfig;
