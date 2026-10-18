import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
    // Phaser alone is ~1.2 MB; that's fine for a game served over the LAN.
    chunkSizeWarningLimit: 2000,
  },
  // host: true exposes the dev server on the LAN so phones can open it.
  server: { host: true, port: 5173 },
});
