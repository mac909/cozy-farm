import { defineConfig } from "vite";
import { SERVER_PORT } from "./shared/constants";

export default defineConfig({
  root: "client",
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
    // Phaser alone is ~1.2 MB; that's fine for a game served over the LAN.
    chunkSizeWarningLimit: 2000,
  },
  server: {
    // host: true exposes the dev server on the LAN so phones can open it.
    host: true,
    port: 5173,
    // The game server's web routes (the Who's playing list); the real farm serves them itself.
    proxy: { "/api": `http://localhost:${SERVER_PORT}` },
  },
});
