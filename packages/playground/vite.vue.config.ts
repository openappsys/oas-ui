import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  root: 'vue',
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Web Components 以 oas- 前缀命名，Vue 模板编译期不解析为组件，
          // 避免 console 出现 "Failed to resolve component: oas-*" 警告
          isCustomElement: (tag) => tag.startsWith('oas-'),
        },
      },
    }),
  ],
  server: { port: 5181 },
  build: {
    outDir: '../dist-vue',
    // outDir 在 root（vue/）之外时 vite 默认不清空（emptyOutDir: false），旧 hash 产物会堆积；
    // 显式清空，保证 dist 只含本次构建
    emptyOutDir: true,
  },
  // React/Vue 两个 dev server 同跑时共用一个 node_modules/.vite 会互相失效缓存，
  // 各自独立 cacheDir 根治
  cacheDir: 'node_modules/.vite-vue',
  // workspace linked 包（@oas-ui/ui / @oas-ui/theme）走 dist ESM 直服：
  // 排除预构建，ui dist 重建后 dev 立即生效
  optimizeDeps: {
    exclude: ['@oas-ui/ui', '@oas-ui/theme'],
  },
})
