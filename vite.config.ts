import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        'popup.html': resolve(__dirname, 'src/popup/index.html'),
        'options.html': resolve(__dirname, 'src/options/index.html'),
        'history.html': resolve(__dirname, 'src/history/index.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.facadeModuleId?.includes('background.ts')) {
            return 'background.js'
          }
          return '[name].js'
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/css/[name]-[hash].css'
          }
          return 'assets/[name]-[hash].[ext]'
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true, // 每次构建前清空 dist 目录，确保输出干净
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
