import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    cssCodeSplit: false, // 关键：不分割 CSS，输出固定名称的 CSS
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        entryFileNames: 'content.js',
        assetFileNames: (assetInfo) => {
          // 确保 CSS 文件输出为固定名称
          if (assetInfo.name?.endsWith('.css')) {
            return 'content.css'
          }
          return 'assets/[name]-[hash].[ext]'
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
