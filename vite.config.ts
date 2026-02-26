import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
            plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['vite.svg'],
          manifest: {
            name: 'SPeakUp | SPJIMR',
            short_name: 'SPeakUp',
            description: 'A privacy-first mental health ecosystem for SPJIMR, featuring SParsh AI.',
            theme_color: '#E6DDD0',
            icons: [
              {
                src: 'vite.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
                purpose: 'any maskable'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
