import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El cliente corre en el puerto 5173 y reenvía todo lo que empiece por /api
// al servidor Node que está en el puerto 8080. Así en desarrollo se sienten
// como una sola aplicación.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/webhook': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
