import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 文档站图名守卫：组件页里出现的**内置图名**必须真实存在于内置集（`@oas-ui/icons` 的 47 名）。
 *
 * 背景：图标 opt-in 后，未命中内置集的名字**静默不渲染**（`lookupIcon` 返回 undefined）；
 * 曾出现 button.md `icon="setting"`、navigation-menu.md `"icon":"grid"/"book"` 这类不存在的名字 →
 * 文档站视觉缺陷，而 demo 探针只测属性/事件、抓不到。
 *
 * 判定：含自定义注册（`registerIcon(`）/ 远程库（`library=`）/ iconfont 的页面跳过（名字可能是动态/后注册的）；
 * 其余页提取 `icon="x"` / `"icon":"x"` / `name="x"` 等字面量，全部须 ∈ 内置集。
 */
const DOCS = resolve(import.meta.dirname, '../../../docs/docs') // packages/docs/docs
const REGISTRY = resolve(import.meta.dirname, '../../../icons/src/registry.ts')

function builtinNames(): Set<string> {
  const s = readFileSync(REGISTRY, 'utf8')
  return new Set((s.match(/'([a-z0-9-]+)':/g) ?? []).map((x) => x.slice(1, -2)))
}

/** 非图名的哨兵/布尔值（组件 API 约定的特殊值，非内置图名） */
const ALLOW = new Set(['none', 'true', 'false'])

const NAMES_RES: RegExp[] = [
  /<oas-icon[^>]*\bname="([a-z][a-z0-9-]*)"/g, // <oas-icon name="x">
  /(?<![\w-])icon="([a-z][a-z0-9-]*)"/g, // icon="x"（负向断言排除 show-icon / loading-icon 等复合属性）
  /"icon":"([a-z][a-z0-9-]*)"/g, // items JSON "icon":"x"
  /\b(?:prefix-icon|suffix-icon|close-icon|checked-icon|icon-end|clear-icon|filter-icon|selected-icon|separator)="([a-z][a-z0-9-]*)"/g,
]

function walk(dir: string, acc: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (n.endsWith('.md')) acc.push(p)
  }
  return acc
}

describe('文档站内置图名守卫', () => {
  it('所有字面量图名均存在于内置集（动态/自定义页跳过）', () => {
    const builtin = builtinNames()
    expect(builtin.size).toBeGreaterThan(40)
    const bad: string[] = []
    for (const f of walk(DOCS)) {
      const text = readFileSync(f, 'utf8')
      // 含自定义注册 / 远程库 / iconfont 的页面跳过（名字可能动态或后注册）
      if (/registerIcon\(|registerIconLibrary|iconfont-url|library=|\$\{/.test(text)) continue
      for (const re of NAMES_RES) {
        for (const m of text.matchAll(re)) {
          const name = m[1]!
          // 非图名的哨兵/布尔值（如 notice-bar `icon="none"` 隐藏图标、statistic `icon` 布尔开关）不校验
          if (ALLOW.has(name) || builtin.has(name)) continue
          bad.push(`${f.replace(DOCS, 'docs').replaceAll('\\', '/')} → "${name}"`)
        }
      }
    }
    expect(bad, '文档图名必须 ∈ 内置集（或该页自行注册）').toEqual([])
  })
})
