/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { g92Pwa } from './src/kit/pwa.ts';

export default defineConfig({
  base: '/matematika/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA(
      g92Pwa('matematika', {
        name: 'Matematika – počítání s Hvězdičkou',
        description: 'Počítání, sčítání, odčítání, násobilka a dělení pro děti. Úrovně s hvězdičkami, nápovědy, hvězdné nebe a hvězdná kalkulačka.',
        // the legacy redirect pages (pocitadlo.html…) must be served as themselves
        navigateFallbackDenylist: [/\.html$/],
      }),
    ),
  ],
  server: { port: 5171, strictPort: true },
  preview: { port: 5171 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
