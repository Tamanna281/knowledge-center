import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Fix workspace root warning
  outputFileTracingRoot: __dirname,

  // Optimize package imports - tree shake heavy libraries
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@dnd-kit/core',
      '@dnd-kit/utilities',
      '@dnd-kit/sortable',
      'framer-motion',
      'axios'
    ],
  },

  // Reduce logging in development
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
