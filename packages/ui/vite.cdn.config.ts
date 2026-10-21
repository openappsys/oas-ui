import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { stripStyleComments } from './scripts/strip-css-comments'

/**
 * CDN IIFE bundle 构建（多入口，按需打包族）：
 * - 无 OAS_CDN_ENTRY：全量入口 src/index.ts → dist/cdn.js（副作用注册全部组件，向后兼容原单入口）
 * - OAS_CDN_ENTRY=<族名>：族入口 src/families/<族>.ts → dist/cdn/<族>.js（基座内联 + 该族组件）
 *   （逐族单独构建——IIFE 不支持多入口共享 chunk；@oas-ui/core/i18n/icons 全内联，零外部依赖）
 * - 与主构建（preserveModules ESM）互不干扰：单独配置文件 + emptyOutDir:false
 * - 浏览器直连 unpkg 可用，普通 <script> 标签即可（IIFE 自执行注册，无需 type=module）
 *
 * 构建驱动：packages/ui/package.json `build` 内两段——`vite build --config vite.cdn.config.ts` 产全量
 * cdn.js（无 OAS_CDN_ENTRY），`build:cdn`（node scripts/build-cdn.mjs）循环 9 族产 dist/cdn/<族>.js。
 */

const FAMILIES = ['basic', 'layout', 'form', 'feedback', 'navigation', 'data', 'conversation', 'workbench', 'framework']

export default defineConfig(() => {
  const family = (process.env.OAS_CDN_ENTRY ?? '').trim()
  const isFamily = FAMILIES.includes(family)
  const entry = isFamily
    ? resolve(import.meta.dirname, `src/families/${family}.ts`)
    : resolve(import.meta.dirname, 'src/index.ts')
  const fileName = isFamily ? `cdn/${family}.js` : 'cdn.js'

  return {
    plugins: [
      {
        name: 'oas-strip-style-comments',
        enforce: 'pre',
        transform(code, id) {
          if (!/[\\/]packages[\\/]ui[\\/]src[\\/].*\.ts$/.test(id)) return null
          const out = stripStyleComments(code)
          return out === code ? null : { code: out, map: null }
        },
      },
    ],
    resolve: {
      // 数组形式保证匹配顺序：更具体的子路径必须先于包名映射（对象形式的匹配顺序不保证先长后短）
      alias: [
        // 内联工作区包源码而非其 dist，CDN 构建自包含、不依赖其他包先构建
        { find: '@oas-ui/core', replacement: resolve(import.meta.dirname, '../core/src/index.ts') },
        { find: '@oas-ui/i18n', replacement: resolve(import.meta.dirname, '../i18n/src/index.ts') },
        { find: '@oas-ui/icons/register', replacement: resolve(import.meta.dirname, '../icons/src/register.ts') },
        { find: '@oas-ui/icons/runtime', replacement: resolve(import.meta.dirname, '../icons/src/runtime.ts') },
        { find: '@oas-ui/icons/registry', replacement: resolve(import.meta.dirname, '../icons/src/registry.ts') },
        // 正则 + $1 捕获：字符串前缀 alias 在 rolldown 下可能被更短的包名先匹配，正则语义无歧义
        {
          find: /^@oas-ui\/icons\/icons\/(.*)$/,
          replacement: `${resolve(import.meta.dirname, '../icons/src/icons').replaceAll('\\', '/')}/$1`,
        },
        { find: '@oas-ui/icons', replacement: resolve(import.meta.dirname, '../icons/src/index.ts') },
      ],
    },
    build: {
      lib: {
        entry,
        name: 'OASUI',
        formats: ['iife'] as 'iife'[],
        fileName: () => fileName,
      },
      // IIFE 单入口本身不产 chunk；Vite 8 已默认 codeSplitting:false，
      // 旧的 output.inlineDynamicImports 会被忽略并告警，故不再显式设置。
      outDir: 'dist',
      // 不清空 dist：主构建的 preserveModules ESM 输出保留在同一目录
      emptyOutDir: false,
      sourcemap: true,
    },
  }
})
