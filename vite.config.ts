import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// ad-hoc 根目录调试/脚本用（不是 docs、CDN 或 playground 的构建配置，那些各自有独立 config）。
// 注意：字符串 alias 是前缀匹配，子路径必须先于包名映射，否则 `@oas-ui/core/format-byte`
// 会被拼成 `core/src/index.ts/format-byte`；这里用数组形式明确匹配顺序（与 packages/ui/vite.cdn.config.ts 同口径）。
export default defineConfig({
  resolve: {
    alias: [
      // core 公开子路径逐条映射（新增 core exports 时同步补）；包名映射必须排在其后
      {
        find: '@oas-ui/core/format-byte',
        replacement: resolve(import.meta.dirname, 'packages/core/src/format-byte.ts'),
      },
      {
        find: '@oas-ui/core/oas-element',
        replacement: resolve(import.meta.dirname, 'packages/core/src/oas-element.ts'),
      },
      {
        find: '@oas-ui/core/form-element',
        replacement: resolve(import.meta.dirname, 'packages/core/src/form-element.ts'),
      },
      {
        find: '@oas-ui/core/escape',
        replacement: resolve(import.meta.dirname, 'packages/core/src/escape.ts'),
      },
      {
        find: '@oas-ui/core/config-context',
        replacement: resolve(import.meta.dirname, 'packages/core/src/config-context.ts'),
      },
      {
        find: '@oas-ui/core/translator',
        replacement: resolve(import.meta.dirname, 'packages/core/src/translator.ts'),
      },
      { find: '@oas-ui/ui', replacement: resolve(import.meta.dirname, 'packages/ui/src/index.ts') },
      { find: '@oas-ui/core', replacement: resolve(import.meta.dirname, 'packages/core/src/index.ts') },
      { find: '@oas-ui/theme', replacement: resolve(import.meta.dirname, 'packages/theme/index.css') },
      { find: '@oas-ui/icons', replacement: resolve(import.meta.dirname, 'packages/icons/src/index.ts') },
    ],
  },
})
