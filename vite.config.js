import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend base URL. Defaults to same-origin proxying off port 8080.
// This matches your Spring Boot development environment.
const BACKEND = process.env.VITE_DEV_BACKEND || 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  
  // Sockjs-client requires 'global' to be defined. 
  // This polyfill prevents 'ReferenceError: global is not defined' at runtime.
  define: {
    global: 'globalThis',
  },
  
  server: {
    port: 5173,
    proxy: {
      // Proxies all /api requests to the Spring Boot backend.
      '/api': {
        target: BACKEND,
        changeOrigin: true,
      },
      // Proxies WebSocket connections to the backend.
      '/ws': {
        target: BACKEND,
        ws: true,
        changeOrigin: true,
      },
      // Proxies static documentation requests[cite: 1].
      '/documentation.pdf': {
        target: BACKEND,
        changeOrigin: true,
      },
    },
  },
  
  build: {
    outDir: 'dist',
  },
});