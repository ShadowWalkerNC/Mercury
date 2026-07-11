import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // Allows imports like: import { useAuthStore } from '@/stores/authStore'
      '@': resolve(__dirname, 'src'),
    },
  },

  build: {
    // Explicit entry — eliminates main.ts / main.tsx ambiguity
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
    // Raise the inline asset limit — aurora CSS background-image data URIs
    assetsInlineLimit: 8192,
    // Source maps in production for release debugging
    sourcemap: true,
  },

  server: {
    port: 5173,
    // Proxy API + WS to local backend during dev
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/gateway': {
        target: 'ws://localhost:4001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
