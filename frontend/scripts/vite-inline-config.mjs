import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";

export const rootDir = fileURLToPath(new URL("..", import.meta.url));
export const frontendHost = process.env.FRONTEND_HOST || "127.0.0.1";
export const frontendPort = Number(process.env.FRONTEND_PORT || 5175);
export const apiProxyTarget = process.env.API_PROXY_TARGET || "http://127.0.0.1:8001";

export const apiProxy = {
  "/api": {
    target: apiProxyTarget,
    changeOrigin: true
  }
};

export const baseConfig = {
  configFile: false,
  root: rootDir,
  cacheDir: "node_modules/.vite",
  optimizeDeps: {
    noDiscovery: true,
    include: []
  },
  plugins: [vue()]
};
