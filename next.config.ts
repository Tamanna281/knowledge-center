import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Fix workspace root warning
  outputFileTracingRoot: __dirname,

  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },

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
