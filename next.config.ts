import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dalleprodaue.blob.core.windows.net',
        port: '',
        pathname: '/private/images/**',
      },
    ],
  },
};

export default nextConfig;
