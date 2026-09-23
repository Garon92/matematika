/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/matematika/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Matematika – počítání s hvězdičkou',
        short_name: 'Matematika',
        description: 'Počítání, sčítání, odčítání, násobilka a dělení pro děti. Úrovně, hvězdy a hvězdné nebe.',
        lang: 'cs',
        start_url: '/matematika/',
        scope: '/matematika/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#1b1640',
        theme_color: '#7b61ff',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/matematika/index.html',
      },
    }),
  ],
  server: { port: 5171, strictPort: true },
  preview: { port: 5171 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
