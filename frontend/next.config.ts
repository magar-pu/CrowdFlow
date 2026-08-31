import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  serverExternalPackages: [],
  allowedDevOrigins: ['172.17.224.1'],
  async rewrites() {
    const isProd = process.env.NODE_ENV === 'production';
    const backendUrl = process.env.BACKEND_URL || (isProd ? 'http://backend:8080' : 'http://localhost:8080');
    
    const rules = [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
    if (!isProd) {
      rules.push({
        source: '/admin/:path*',
        destination: 'http://localhost:3001/admin/:path*',
      });
    }
    return rules;
  },
  // M6 link hygiene (plan_2026-08-30_dynamic_qr_ticketman.md): the booking
  // link IS the credential, so nothing must cause the browser to leak the
  // URL onward or let it get indexed. No third-party scripts are loaded on
  // these pages either — see BookingWatermark / the booking page components.
  async headers() {
    return [
      {
        source: '/booking/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
