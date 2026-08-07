import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  root: 'vue',
  plugins: [vue()],
  server: { port: 5181 },
  build: { outDir: '../dist-vue' },
})
