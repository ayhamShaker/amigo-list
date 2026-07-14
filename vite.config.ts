import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'AMIGO',
        short_name: 'AMIGO',
        description: 'Your personal assistant — todos, debts, expenses & alarms',
        theme_color: '#0c1117',
        background_color: '#0c1117',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'ar',
        shortcuts: [
          {
            name: 'احكي مع AMIGO',
            short_name: 'احكي',
            description: 'افتح المايك واطلب من AMIGO',
            url: '/?tab=amigo&listen=1',
            icons: [{ src: 'pwa-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Talk to AMIGO',
            short_name: 'Talk',
            description: 'Open mic and talk to AMIGO',
            url: '/?tab=amigo&listen=1',
            icons: [{ src: 'pwa-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})
