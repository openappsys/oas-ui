import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 图标库 opt-in 纪律守卫（防回退）：
 * - 组件源码**不得**从 `@oas-ui/icons`（主入口）或 `/registry` / `/icons/index` 取全量集；
 * - `lookupIcon` 必须来自 `@oas-ui/icons/runtime`（不含全量集）；
 * - 全量入口 + 各 CDN 族入口静态注册内置集；`vite.config` 白名单保留该外部副作用导入；
 * - `@oas-ui/icons` 主入口**不得**再导出 `iconRegistry`/`iconNames`（破坏性承诺防回退）；
 * - icons 包 `sideEffects` 覆盖 `./src/register.ts`（CDN 构建 alias 到源文件时不被摇掉）。
 */
const SRC = resolve(import.meta.dirname, '..') // packages/ui/src
const ICONS = resolve(import.meta.dirname, '../../../icons')
const FAMILIES = ['basic', 'layout', 'form', 'feedback', 'navigation', 'data', 'conversation', 'workbench', 'framework']

function walk(dir: string, acc: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (n.endsWith('.ts') && !n.endsWith('.test.ts') && !n.endsWith('.spec.ts')) acc.push(p)
  }
  return acc
}

const rel = (f: string) => f.replace(SRC, 'src').replaceAll('\\', '/')
const flat = (f: string) => readFileSync(f, 'utf8').replace(/\s+/g, ' ')

describe('图标库 opt-in 纪律（源码守卫）', () => {
  const files = walk(SRC)

  it('组件源码不得从主入口 / /registry / /icons/index 取 iconRegistry / iconNames', () => {
    const bad: string[] = []
    for (const f of files) {
      const s = flat(f)
      if (/from '@oas-ui\/icons\/registry'/.test(s)) bad.push(`${rel(f)} (import /registry)`)
      if (/from '@oas-ui\/icons\/icons\/index'/.test(s)) bad.push(`${rel(f)} (import /icons/index)`)
      for (const m of s.matchAll(/import\s*\{([^}]*)\}\s*from\s*'@oas-ui\/icons'/g)) {
        if (/\biconRegistry\b|\biconNames\b/.test(m[1]!)) bad.push(`${rel(f)} (barrel iconRegistry/iconNames)`)
      }
    }
    expect(bad, '应改用 @oas-ui/icons/runtime 或精确 path').toEqual([])
  })

  it('lookupIcon 必须从 @oas-ui/icons/runtime 导入', () => {
    const bad: string[] = []
    for (const f of files) {
      for (const m of flat(f).matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']*)'/g)) {
        if (/\blookupIcon\b/.test(m[1]!) && m[2] !== '@oas-ui/icons/runtime') bad.push(`${rel(f)} <- ${m[2]}`)
      }
    }
    expect(bad).toEqual([])
  })

  it('保留的固定 chrome 图标走精确 path（抽查）', () => {
    for (const r of [
      'navigation/dropdown/oas-dropdown.ts',
      'feedback/modal/oas-modal.ts',
      'layout/splitter/oas-splitter.ts',
    ]) {
      expect(
        /from\s*'@oas-ui\/icons\/icons\//.test(readFileSync(join(SRC, r), 'utf8')),
        `${r} 应精确导入图标 path`,
      ).toBe(true)
    }
  })

  it('全量入口 + 各 CDN 族入口静态注册内置集；vite.config 白名单保留该外部副作用导入', () => {
    expect(readFileSync(join(SRC, 'index.ts'), 'utf8')).toMatch(/import\s+['"]@oas-ui\/icons\/register['"]/)
    expect(readFileSync(join(SRC, '..', 'vite.config.ts'), 'utf8')).toContain('@oas-ui/icons/register')
    for (const fam of FAMILIES) {
      expect(readFileSync(join(SRC, `families/${fam}.ts`), 'utf8'), `${fam}.ts 应 import register`).toContain(
        "import '@oas-ui/icons/register'",
      )
    }
  })

  it('@oas-ui/icons 主入口不再导出 iconRegistry / iconNames；sideEffects 覆盖 src/register.ts', () => {
    const idx = readFileSync(join(ICONS, 'src/index.ts'), 'utf8').replace(/\s+/g, ' ')
    expect(idx, '主入口不得再导出 iconRegistry').not.toMatch(/export\s*\{[^}]*\biconRegistry\b/)
    expect(idx, '主入口不得再导出 iconNames').not.toMatch(/export\s*\{[^}]*\biconNames\b/)
    expect(idx, 'IconName 类型应保留').toMatch(/export type \{ IconName \}/)
    const pkg = readFileSync(join(ICONS, 'package.json'), 'utf8')
    expect(pkg, 'sideEffects 需覆盖 src/register.ts（CDN alias 到源文件时不被摇掉）').toContain('./src/register.ts')
  })
})
