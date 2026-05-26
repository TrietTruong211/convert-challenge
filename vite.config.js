import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'assets',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'src/app.js'),
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: { api: 'modern' },
    },
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
});
