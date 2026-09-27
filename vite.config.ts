import { defineConfig } from 'vite';

export default defineConfig({
  // Relative Pfade sind Pflicht, damit die App im Capacitor-WebView läuft.
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000, // Phaser ist groß, das ist okay
  },
});
