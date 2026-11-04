import { defineConfig } from "vite";
import { resolve } from "node:path";
import { devConfigApi } from "./src/dev-config-api";

export default defineConfig({
  plugins: [devConfigApi()],
  server: {
    host: "127.0.0.1",
    port: 4181,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        demo: resolve(import.meta.dirname, "index.html"),
      },
    },
  },
});
