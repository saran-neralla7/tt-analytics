import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['gvpihlr.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Timetable Analytics - GVP',
        short_name: 'TT Analytics',
        description: 'Gayatri Vidya Parishad Institute of Higher Learning & Research - Timetable & Room Vacancy Analytics',
        theme_color: '#1d4ed8',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Cache static assets with revision hashing
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        // Clean up outdated caches automatically on new builds
        cleanupOutdatedCaches: true,
        // Ensure immediate takeover without waiting
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ],
  server: {
    port: 3000,
    host: true,
    allowedHosts: true
  }
})
