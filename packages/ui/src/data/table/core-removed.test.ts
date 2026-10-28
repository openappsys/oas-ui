import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// DEP-EXPORT-0001：`@oas-ui/ui/data/table/core` 兼容别名已于 v2.6.5 移除
// （用户批准的 minor 单点例外：默认入口等价别名，v2.6.4 已预告；见 docs/deprecations.json）。
//
// 防回归门：别名目录若回流（源码层 exports 通配 `./*` 会立刻把 dist 残留变回可 import
// 入口），此测试立即报红。重新引入属破坏性变更，必须先走台账审批，不得静默恢复。
// dist 零残留由 `pnpm perf:size` 的结构门禁（已移除入口零残留）在构建后把关。

const here = dirname(fileURLToPath(import.meta.url))

describe('data/table/core 兼容别名已移除（v2.6.5，DEP-EXPORT-0001）', () => {
  it('src 别名入口文件不得残留', () => {
    expect(existsSync(resolve(here, './core/index.ts'))).toBe(false)
  })
})
