import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const apiProxyTarget = process.env.API_PROXY_TARGET || "http://127.0.0.1:8001";
const apiProxy = {
  "/api": {
    target: apiProxyTarget,
    changeOrigin: true
  }
};

export default defineConfig({
  root: rootDir,
  cacheDir: "node_modules/.vite",
  optimizeDeps: {
    noDiscovery: true,
    include: []
  },
  plugins: [vue()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts"]
  },
  server: {
    host: "127.0.0.1",
    port: 5175,
    strictPort: true,
    fs: {
      allow: [rootDir]
    },
    proxy: apiProxy
  },
  preview: {
    host: "127.0.0.1",
    port: 4175,
    strictPort: true,
    proxy: apiProxy
  }
});
