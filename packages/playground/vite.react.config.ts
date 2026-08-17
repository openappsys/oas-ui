import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5180 },
  build: { outDir: 'dist-react' },
  // React/Vue 两个 dev server 同跑时共用一个 node_modules/.vite 会互相失效缓存
  // （React 缓存 react.js、Vue 缓存 vue.js，彼此把对方的优化结果判为 Outdated），
  // 各自独立 cacheDir 根治
  cacheDir: 'node_modules/.vite-react',
  // workspace linked 包（@oas-ui/ui / @oas-ui/theme）走 dist ESM 直服：
  // 排除预构建，ui dist 重建后 dev 立即生效，避免 "Outdated Optimize Dep" 504 白屏
  optimizeDeps: {
    exclude: ['@oas-ui/ui', '@oas-ui/theme'],
  },
})
