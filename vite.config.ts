import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    // 数组形式保证匹配顺序：包内子路径必须先于包名映射（字符串 alias 是前缀匹配）
    alias: [
      {
        find: '@oas-ui/core/format-byte',
        replacement: resolve(import.meta.dirname, 'packages/core/src/format-byte.ts'),
      },
      { find: '@oas-ui/ui', replacement: resolve(import.meta.dirname, 'packages/ui/src/index.ts') },
      { find: '@oas-ui/core', replacement: resolve(import.meta.dirname, 'packages/core/src/index.ts') },
      { find: '@oas-ui/theme', replacement: resolve(import.meta.dirname, 'packages/theme/index.css') },
      { find: '@oas-ui/icons', replacement: resolve(import.meta.dirname, 'packages/icons/src/index.ts') },
    ],
  },
})
