/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@velora/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },

  server: {
    port: 5173,
    strictPort: true,
  },

  preview: {
    port: 4173,
  },

  build: {
    target: 'es2022',
    sourcemap: mode !== 'production',
    // Warn early: the storefront budget is ~250 kB gzip for the initial route.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        /**
         * Manual chunks keep the vendor libraries in long-lived cache entries.
         * Route-level code splitting is handled by React.lazy in the router.
         */
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'state-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'motion-vendor': ['framer-motion'],
          'form-vendor': ['formik', 'zod'],
          'i18n-vendor': ['i18next', 'react-i18next'],
        },
      },
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    exclude: ['node_modules', 'dist', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts'],
    },
  },
}));
