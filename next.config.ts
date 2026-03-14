import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  transpilePackages: ["@henrylabs-interview/payments"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Provide Node.js polyfills for Bun APIs used by the payment SDK
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
