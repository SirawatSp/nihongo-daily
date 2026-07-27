/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' (not silent autoUpdate): the app shows a "New version
      // available — reload" toast and never swaps content mid-session.
      registerType: 'prompt',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,json,png,svg}'],
        navigateFallback: '/index.html',
      },
      manifest: {
        name: 'Nihongo Daily',
        short_name: 'Nihongo',
        description: 'Daily Japanese practice — kana, vocab SRS, listening, speaking, reading.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#18181b',
        background_color: '#fafafa',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    globals: false,
  },
});
