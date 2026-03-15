import type { NextConfig } from "next";
import path from "path";

// Stub for @henrylabs-interview/payments: the SDK resolves '../db-store/history.json'
// from dist/utils/store.js via import.meta.url; that file is not shipped in the npm package.
const paymentsDist = path.join(
  process.cwd(),
  "node_modules/@henrylabs-interview/payments/dist"
);
const historyJsonStub = path.join(process.cwd(), "src/lib/payment-history-stub.json");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  transpilePackages: ["@henrylabs-interview/payments"],
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      // Resolve the SDK's internal history.json to our stub (file not in package)
      [path.join(paymentsDist, "db-store/history.json")]: historyJsonStub,
    };
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
