import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    return [
      {
        source: '/admin/:path*',
        destination: 'http://localhost:3001/admin/:path*',
      },
      {
        source: '/api/:path*',
        destination: (process.env.NODE_ENV as string) === 'production'
          ? 'http://backend:8080/api/:path*'
          : 'http://localhost:8081/api/:path*',
      },
    ];
  },
};

export default nextConfig;
