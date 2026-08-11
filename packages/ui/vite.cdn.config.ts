import { defineConfig } from 'vite'
import { resolve } from 'node:path'

/**
 * CDN 单文件 bundle（dist/cdn.js，IIFE）：
 * - 入口 src/index.ts（副作用注册全部组件），@oas-ui/core/i18n/icons 全内联，零外部依赖
 * - 与主构建（preserveModules ESM）互不干扰：单独配置文件 + emptyOutDir:false
 * - 浏览器直连 unpkg 可用，普通 <script> 标签即可（IIFE 自执行注册，无需 type=module）
 */
export default defineConfig({
  resolve: {
    alias: {
      // 内联工作区包源码而非其 dist，CDN 构建自包含、不依赖其他包先构建
      '@oas-ui/core': resolve(import.meta.dirname, '../core/src/index.ts'),
      '@oas-ui/i18n': resolve(import.meta.dirname, '../i18n/src/index.ts'),
      '@oas-ui/icons': resolve(import.meta.dirname, '../icons/src/index.ts'),
    },
  },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'OASUI',
      formats: ['iife'],
      fileName: () => 'cdn.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    outDir: 'dist',
    // 不清空 dist：主构建的 preserveModules ESM 输出保留在同一目录
    emptyOutDir: false,
    sourcemap: true,
  },
})
