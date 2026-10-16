import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase'
            if (id.includes('lucide-vue-next')) return 'vendor-icons'
            if (id.includes('break_eternity') || id.includes('lz-string') || id.includes('canvas-confetti')) return 'vendor-math-utils'
            if (id.includes('vue') || id.includes('pinia')) return 'vendor-vue'
          }
        }
      }
    }
  }
})
