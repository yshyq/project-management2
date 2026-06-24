import { preview } from "vite";
import { apiProxy, baseConfig } from "./vite-inline-config.mjs";

const server = await preview({
  ...baseConfig,
  preview: {
    host: "127.0.0.1",
    port: 4175,
    strictPort: true,
    proxy: apiProxy
  }
});

server.printUrls();
