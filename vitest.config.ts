import { defineConfig } from "vitest/config";

// Resolve the "@/..." path alias the app uses, and run tests in Node
// (our tests cover server-side pure logic, no browser needed).
export default defineConfig({
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname.replace(/\/$/, ""),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
