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
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
        port: '',
        pathname: '/private/images/**',
      },
      {
        protocol: 'https',
        hostname: 'dalleprodsec.blob.core.windows.net',
        port: '',
        pathname: '/private/images/**',
      },
    ],
  },
};

export default nextConfig;
