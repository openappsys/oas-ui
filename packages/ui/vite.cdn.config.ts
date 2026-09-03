import { defineConfig } from 'vite'
import { resolve } from 'node:path'

/**
 * CDN IIFE bundle 构建（多入口，按需打包族）：
 * - 无 OAS_CDN_ENTRY：全量入口 src/index.ts → dist/cdn.js（副作用注册全部组件，向后兼容原单入口）
 * - OAS_CDN_ENTRY=<族名>：族入口 src/families/<族>.ts → dist/cdn/<族>.js（基座内联 + 该族组件）
 *   （逐族单独构建——IIFE 不支持多入口共享 chunk；@oas-ui/core/i18n/icons 全内联，零外部依赖）
 * - 与主构建（preserveModules ESM）互不干扰：单独配置文件 + emptyOutDir:false
 * - 浏览器直连 unpkg 可用，普通 <script> 标签即可（IIFE 自执行注册，无需 type=module）
 *
 * 构建驱动：packages/ui/package.json `build:cdn` 循环 8 次调用（7 族 + 全量）。
 */
const FAMILIES = ['basic', 'layout', 'navigation', 'form', 'data', 'feedback', 'floating']

export default defineConfig(() => {
  const family = (process.env.OAS_CDN_ENTRY ?? '').trim()
  const isFamily = FAMILIES.includes(family)
  const entry = isFamily
    ? resolve(import.meta.dirname, `src/families/${family}.ts`)
    : resolve(import.meta.dirname, 'src/index.ts')
  const fileName = isFamily ? `cdn/${family}.js` : 'cdn.js'

  return {
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
        entry,
        name: 'OASUI',
        formats: ['iife'] as 'iife'[],
        fileName: () => fileName,
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
  }
})
