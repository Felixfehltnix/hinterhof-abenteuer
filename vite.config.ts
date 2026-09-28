import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Liefert als Modul `virtual:sound-files` die Liste aller Tondateien unter
 * public/assets/sounds/ (relativ zu public/assets/). So fragt das Spiel nie nach Dateien,
 * die es nicht gibt – ohne Dateien einfach eine leere Liste. Neue Dateien: Dev-Server neu starten.
 */
function soundManifest(): Plugin {
  const id = 'virtual:sound-files';
  const resolved = '\0' + id;
  const root = join(__dirname, 'public', 'assets');
  const list = (dir: string): string[] => {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return list(full);
      return /\.(mp3|ogg|wav|m4a)$/i.test(name) ? [relative(root, full).split(sep).join('/')] : [];
    });
  };
  return {
    name: 'sound-manifest',
    resolveId: (source) => (source === id ? resolved : undefined),
    load: (loadId) => (loadId === resolved ? `export default ${JSON.stringify(list(join(root, 'sounds')))};` : undefined),
  };
}

export default defineConfig({
  // Relative Pfade sind Pflicht, damit die App im Capacitor-WebView läuft.
  base: './',
  plugins: [soundManifest()],
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
