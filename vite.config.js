import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Field Sales',
        short_name: 'FieldSales',
        description: 'Field sales & inventory management',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // Pre-cache all app assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        // Skip large seed data files from precache
        globIgnores: ['**/seedData*.js'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/u\//],
        runtimeCaching: [
          // Supabase API: NetworkFirst (try network, fall back to cache)
          {
            urlPattern: /^https:\/\/.*supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Supabase Storage (images): CacheFirst — images don't change often
          {
            urlPattern: /^https:\/\/.*supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Maps: StaleWhileRevalidate
          {
            urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-maps',
              expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split large chunks for better performance
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'maps': ['@googlemaps/js-api-loader'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Enable minification optimizations
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
    },
  },
})
