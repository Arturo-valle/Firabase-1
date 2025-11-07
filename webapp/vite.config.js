
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Obtenido del Project Console de Firebase
const FIREBASE_PROJECT_ID = 'mvp-nic-market';
const FIREBASE_REGION = 'us-central1';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`,
        changeOrigin: true,
        // Reescribe la ruta para añadir el prefijo '/api' que necesita la Cloud Function
        rewrite: (path) => `/api${path}`,
      },
    },
  },
});
