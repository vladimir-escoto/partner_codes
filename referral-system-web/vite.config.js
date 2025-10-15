import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',                  // ✅ el index.html está aquí mismo
  build: {
    outDir: '../dist',          // ✅ carpeta destino, un nivel arriba
    emptyOutDir: true           // ✅ limpia el directorio antes de construir
  },
  server: {
    port: 5173,
    open: true
  }
});
