import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: false,
        watch: {
          ignored: ['**/uploads/**']
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.VITE_USE_VERTEX_AI': JSON.stringify(env.VITE_USE_VERTEX_AI),
        'process.env.VITE_GCP_PROJECT_ID': JSON.stringify(env.VITE_GCP_PROJECT_ID),
        'process.env.VITE_GCP_LOCATION': JSON.stringify(env.VITE_GCP_LOCATION),
        'process.env.VITE_VERTEX_API_KEY': JSON.stringify(env.VITE_VERTEX_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
