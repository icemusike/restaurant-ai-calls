import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['@emotion/react', '@emotion/styled', '@mui/material'],
    esbuildOptions: {
      // Fix for MUI icons import issue
      resolveExtensions: ['.js', '.jsx', '.ts', '.tsx'],
    }
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  }
})
