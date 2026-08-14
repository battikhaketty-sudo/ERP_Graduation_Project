import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const proxyTarget = env.VITE_API_PROXY_TARGET || "http://mag-erp-system.runasp.net";

  const apiProxy = proxyTarget
    ? {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        // Employee/profile media lives outside `/api` on the backend host.
        // Match with leading caret so Vite always proxies instead of SPA fallback.
        "^/media": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/media/, "") || "/",
        },
      }
    : undefined;

  return {
    plugins: [react()],
    server: {
      host: true,
      proxy: apiProxy,
    },
    preview: {
      proxy: apiProxy,
    },
  };
});
