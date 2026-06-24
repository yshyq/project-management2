import { createServer } from "vite";
import { apiProxy, baseConfig, frontendHost, frontendPort } from "./vite-inline-config.mjs";

const server = await createServer({
  ...baseConfig,
  server: {
    host: frontendHost,
    port: frontendPort,
    strictPort: true,
    fs: {
      allow: [baseConfig.root]
    },
    proxy: apiProxy
  }
});

await server.listen();
server.printUrls();
