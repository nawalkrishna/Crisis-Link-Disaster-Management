import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development the browser calls /api/... on the Vite server, which forwards
    // it to the API. Same origin for the browser = no CORS headaches locally.
    proxy: {
      '/api': 'http://localhost:4000',
      // Live updates: `ws: true` forwards the WebSocket upgrade, not just plain HTTP.
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});
