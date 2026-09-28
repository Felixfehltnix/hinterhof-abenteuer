/// <reference types="vite/client" />
// Vom Vite-Plugin in vite.config.ts erzeugt: alle Tondateien unter public/assets/sounds/.
declare module 'virtual:sound-files' {
  const files: string[];
  export default files;
}
