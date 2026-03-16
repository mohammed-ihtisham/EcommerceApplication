import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      include: ["src/components/__tests__/**/*.test.tsx"],
      setupFiles: ["./src/__tests__/setup.ts", "./src/__tests__/setup-dom.ts"],
    },
  })
);
