import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/search': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/smart_search': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/elements': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/notes': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/tasks': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/images': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/audios': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/scribble': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});