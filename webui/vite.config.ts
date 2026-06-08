import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api': 'http://127.0.0.1:8080'
    }
  },
  build: {
    target: 'esnext'
  }
});
