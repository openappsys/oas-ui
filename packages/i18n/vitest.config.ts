import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * 包级 vitest 配置：包内裸跑（`pnpm --filter @oas-ui/i18n exec vitest run`）时
 * cwd 在包目录，不会加载仓库根的 vitest.config.ts——环境会退回 node，任何触碰
 * DOM 的用例直接 `HTMLElement is not defined`。此处对齐根配置的关键项（happy-dom 环境、
 * globals、逐文件隔离、`@oas-ui/core` 指向源码），include 收窄到本包源码，
 * 使包内裸跑与仓根全量跑结果一致。
 */
export default defineConfig({
  resolve: {
    alias: {
      '@oas-ui/core': fileURLToPath(new URL('../core/src', import.meta.url)),
      '@oas-ui/icons': fileURLToPath(new URL('../icons/src', import.meta.url)),
      '@oas-ui/i18n': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    // 对齐根配置：共享 setup（localStorage 等 happy-dom 补丁）在包内裸跑同样生效
    setupFiles: [fileURLToPath(new URL('../../vitest.setup.ts', import.meta.url))],
    include: ['src/**/*.test.ts'],
  },
})
