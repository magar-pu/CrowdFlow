import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  serverExternalPackages: [],
  allowedDevOrigins: ['172.17.224.1'],
  async rewrites() {
    const isProd = process.env.NODE_ENV === 'production';
    const rules = [
      {
        source: '/api/:path*',
        destination: isProd
          ? 'http://backend:8080/api/:path*'
          : 'http://localhost:8081/api/:path*',
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
};

export default nextConfig;
