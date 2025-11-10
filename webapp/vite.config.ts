
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Redirige las peticiones de /api al backend de Firebase Functions
      '/api': {
        target: 'https://us-central1-mvp-nic-market.cloudfunctions.net',
        changeOrigin: true, // Necesario para vhosts
        secure: false, // No validar certificados SSL (útil en algunos entornos)
      },
    },
  },
});
