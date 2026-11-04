import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  configFile: false,
  build: {
    emptyOutDir: false,
    outDir: "dist/injector",
    lib: {
      entry: resolve(import.meta.dirname, "src/page-entry.ts"),
      name: "AsciiSharkChatBackground",
      formats: ["iife"],
      fileName: () => "ascii-shark-inject.js",
    },
  },
});
