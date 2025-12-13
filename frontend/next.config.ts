import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
  // Allow access from local network devices to suppress warnings
  allowedDevOrigins: ["192.168.0.124", "192.168.1.101"],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://172.18.0.1:8000/api/:path*',
      },
      {
        source: '/media/:path*',
        destination: 'http://172.18.0.1:8000/media/:path*',
      },
    ]
  },
};

export default nextConfig;
