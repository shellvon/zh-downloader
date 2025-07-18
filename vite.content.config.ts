import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    cssCodeSplit: false, // 关键：不分割 CSS，输出 style.css
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        entryFileNames: 'content.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) return 'style.css'
          return 'assets/[name]-[hash][extname]'
        },
        format: 'iife',
        name: 'UniversalVideoDownloaderContentScript',
        extend: true,
        globals: {
          chrome: 'chrome',
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
