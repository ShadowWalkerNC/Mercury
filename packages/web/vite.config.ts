import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ['react', 'react-dom', 'react-router-dom'],
          zustand:  ['zustand'],
          mediasoup: ['mediasoup-client'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api':  { target: 'http://localhost:3000', changeOrigin: true },
      '/ws':   { target: 'ws://localhost:3000',   changeOrigin: true, ws: true },
    },
  },
});
