import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Synapse VR',
        short_name: 'Synapse',
        description: 'Immersive VR Experience Controller',
        theme_color: '#000000',
        background_color: '#000000', // Critical for VR transition
        display: 'standalone', // Removes browser bars
        orientation: 'landscape', // Forces landscape for Cardboard
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Exclude socket.io and api calls from service worker caching
        navigateFallbackDenylist: [/^\/api/, /^\/socket.io/, /^\/experience/]
      }
    })
  ],
  server: {
    host: true, // Expose to network
    https: {},
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://127.0.0.1:3000',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'https://127.0.0.1:3000',
        changeOrigin: true,
        ws: true,
        secure: false
      },
      '/uploads': {
        target: 'https://127.0.0.1:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
