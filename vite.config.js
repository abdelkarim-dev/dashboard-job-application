import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Frontend lives in front/ (index.html + src/). Build output still lands in
  // the repo-root dist/ so the backend (back/server) serves it unchanged.
  root: "front",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/vendor": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
});
