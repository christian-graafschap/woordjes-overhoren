/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relatieve paden: werkt op GitHub Pages onder https://<gebruiker>.github.io/<repo>/, ongeacht de repo-naam.
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
