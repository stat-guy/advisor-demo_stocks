import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(root, "src"),
      "@shared": resolve(root, "shared"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the Bun server during development.
      "/api": "http://localhost:3000",
    },
  },
  build: { outDir: "dist" },
});
