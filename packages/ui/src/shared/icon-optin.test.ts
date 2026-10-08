import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 图标库 opt-in 纪律回归锁（防回退）：
 * - 组件源码**不得**从 `@oas-ui/icons` 主入口导入 `iconRegistry` / `iconNames`（那是全量集，
 *   会把整套图标拖进该组件链——opt-in 后应由 `@oas-ui/icons/register` 注册全量集）；
 * - `lookupIcon` 必须从 `@oas-ui/icons/runtime` 导入（不经 `oas-icon.js`，避免把整个 `<oas-icon>` 组件拉进链）。
 *
 * 收益锚点：button 链 34.1→24.8 KB（见 docs/perf-baseline.md）；`perf:size` 另断言链闭包不含 registry.js。
 */
const SRC = resolve(import.meta.dirname, '..') // packages/ui/src

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, acc)
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.spec.ts')) acc.push(full)
  }
  return acc
}

describe('图标库 opt-in 纪律（源码守卫）', () => {
  const files = walk(SRC)

  it('组件源码不得从 @oas-ui/icons 主入口导入 iconRegistry / iconNames', () => {
    const bad: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      const re = /import\s*\{([^}]*)\}\s*from\s*'@oas-ui\/icons'/g
      for (const m of src.matchAll(re)) {
        if (/\biconRegistry\b|\biconNames\b/.test(m[1] ?? '')) bad.push(f.replace(SRC, 'src'))
      }
    }
    expect(bad, '应改用 lookupIcon（@oas-ui/icons/runtime）或精确 path').toEqual([])
  })

  it('lookupIcon 必须从 @oas-ui/icons/runtime 导入（不经 oas-icon.js）', () => {
    const bad: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      const re = /import\s*\{([^}]*)\}\s*from\s*'([^']*)'/g
      for (const m of src.matchAll(re)) {
        const names = m[1] ?? ''
        const from = m[2] ?? ''
        if (/\blookupIcon\b/.test(names) && !from.startsWith('@oas-ui/icons')) {
          bad.push(`${f.replace(SRC, 'src')} <- ${from}`)
        }
      }
    }
    expect(bad, 'lookupIcon 应从 @oas-ui/icons/runtime 导入').toEqual([])
  })

  it('保留的固定 chrome 图标走精确 path（抽查关键组件不整包引 barrel 值）', () => {
    const fixed = [
      'navigation/dropdown/oas-dropdown.ts',
      'feedback/modal/oas-modal.ts',
      'layout/splitter/oas-splitter.ts',
    ]
    for (const rel of fixed) {
      const src = readFileSync(join(SRC, rel), 'utf8')
      expect(/from\s*'@oas-ui\/icons\/icons\//.test(src), `${rel} 应精确导入图标 path`).toBe(true)
    }
  })

  it('全量入口必须静态导入 @oas-ui/icons/register（开箱即用所依赖的副作用；且构建需保留）', () => {
    const entry = readFileSync(join(SRC, 'index.ts'), 'utf8')
    expect(entry, 'index.ts 应含 import "@oas-ui/icons/register"').toMatch(/import\s+['"]@oas-ui\/icons\/register['"]/)
    // 构建侧：vite treeshake.moduleSideEffects 须保留该外部副作用导入（防被当无副作用摇掉）
    const vite = readFileSync(join(SRC, '..', 'vite.config.ts'), 'utf8')
    expect(vite, 'vite.config moduleSideEffects 应白名单 @oas-ui/icons/register').toContain('@oas-ui/icons/register')
  })
})
