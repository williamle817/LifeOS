import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL("./", import.meta.url));
const contracts = fileURLToPath(
  new URL("../../packages/contracts/src/index.ts", import.meta.url),
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@lifeos/contracts": contracts,
      "@": here,
    },
  },
  test: {
    globals: false,
    projects: [
      {
        extends: true,
        test: {
          name: "lib",
          environment: "node",
          include: ["modules/*/tests/lib/**/*.test.ts", "tests/lib/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["modules/*/tests/components/**/*.test.tsx"],
          setupFiles: ["./tests/helpers/setup.ts"],
        },
      },
    ],
  },
});
