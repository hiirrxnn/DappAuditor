import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Only apply fallbacks for client-side builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        buffer: false,
        util: false,
        'node:stream': false,
        'node:crypto': false,
        'node:buffer': false,
        'node:util': false,
        'node:fs': false,
        'node:path': false,
        'node:os': false,
      };
    }

    // Ignore warnings about node: imports
    config.ignoreWarnings = [
      /Module not found: Error: Can't resolve 'node:/,
      /Critical dependency: the request of a dependency is an expression/,
    ];

    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    esmExternals: 'loose',
  },
};

export default nextConfig;