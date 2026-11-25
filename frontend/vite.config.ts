import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  server: { proxy: { "/api": "http://127.0.0.1:3001" } },
});

