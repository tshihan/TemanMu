import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    // Installable caregiver app. The service worker only runs in production builds (`npm run build && npm run preview`).
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'TemanMu Caregiver',
        short_name: 'TemanMu',
        description: 'Daily reassurance and safety alerts for the people you care for.',
        start_url: '/#caregiver',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#faf7f0',
        theme_color: '#faf7f0',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell only; live data comes from the backend over REST and WebSocket and is never cached.
        globPatterns: ['**/*.{js,css,html,png,svg,webp,jpg}'],
        // The 3D home's large model files are not needed by the caregiver app.
        globIgnores: ['models/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
      },
    }),
  ],
})
