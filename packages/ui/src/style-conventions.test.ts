/**
 * 源码级样式/图标约定守卫（vitest，随 pnpm test 全量跑）。
 *
 * 背景一：`:host(...)` 之后链 `:not(...)` 的写法（如 `:host(:hover):not([data-readonly])`）在
 * Chromium 下**整条规则不匹配**——样式静默失效、单测/typecheck 都抓不到，肉眼也容易漏
 * （实测 slider 的纵向拇指 hover 放大因此从未生效）。正确写法是把 `:not` 放进 `:host()` 参数内：
 * `:host(:hover:not([data-readonly]))`（实测可匹配）。
 *
 * 背景二：内联 chevron 图标的 path 被写坏（`M4 6 L8 10 L12 6 L4 12`，标准 V 形后多一段回折线）
 * → 图标渲染成乱纹；visual.spec 只截图不做基线比对，故一路带病发布到 2.5.4。这里锁定
 * 「所有 class="chevron" 的 path 必须是规范 V 形」。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(p))
    else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) out.push(p)
  }
  return out
}

/**
 * 找出「:host(...) 的右括号之后紧跟 :not(」的链式写法所在行号。
 * 用括号配对精确定位 :host(...) 的结束位置，因此不会误报参数内的合法写法
 * （如 `:host([data-clear-on='hover']:not(:hover))`）。
 */
function findChainedHostNotLines(text: string): number[] {
  const lines: number[] = []
  const re = /:host\(/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    let depth = 1
    let i = m.index + m[0].length
    while (i < text.length && depth > 0) {
      const c = text[i]
      if (c === '(') depth++
      else if (c === ')') depth--
      i++
    }
    if (text.startsWith(':not(', i)) {
      lines.push(text.slice(0, m.index).split('\n').length)
    }
  }
  return lines
}

describe('样式约定：不得使用 :host(...) 后链 :not(...)（Chromium 下整条规则静默失效）', () => {
  it('全部组件源码无链式 :host(...):not(...) 写法', () => {
    const offenders: string[] = []
    for (const file of walk(here)) {
      const text = readFileSync(file, 'utf8')
      for (const line of findChainedHostNotLines(text)) {
        offenders.push(`${file.slice(here.length + 1)}:${line}`)
      }
    }
    expect(
      offenders,
      '链式 :host(...):not(...) 在 Chromium 下不匹配，请改写为 :host(...:not(...))（参数内写法）',
    ).toEqual([])
  })

  it('守卫自身有效：能识别链式写法、不误报参数内写法', () => {
    expect(findChainedHostNotLines(':host(:hover):not([data-readonly]) .thumb { }')).toEqual([1])
    expect(findChainedHostNotLines(':host([data-clear-on="hover"]:not(:hover):not(:focus-within)) .x { }')).toEqual([])
    expect(findChainedHostNotLines(':host(:hover:not([data-readonly])) .thumb { }')).toEqual([])
  })
})

/** 规范 chevron V 形（与 @oas-ui/icons 的 chevron-down 一致） */
const CANONICAL_CHEVRON = 'M4 6 L8 10 L12 6'

/** 找出 class="chevron" 但 path 非规范 V 形的内联图标（返回违规的 d 值） */
function findNonCanonicalChevrons(text: string): string[] {
  const bad: string[] = []
  for (const m of text.matchAll(/class="chevron"[\s\S]{0,200}?d="([^"]+)"/g)) {
    if (m[1] !== CANONICAL_CHEVRON) bad.push(m[1]!)
  }
  return bad
}

describe('内联图标约定：class="chevron" 的 path 必须是规范 V 形', () => {
  it('全部组件源码的内联 chevron 路径一致（曾写坏为 M4 6 L8 10 L12 6 L4 12 → 图标乱纹）', () => {
    const offenders: string[] = []
    let checked = 0
    for (const file of walk(here)) {
      const raw = readFileSync(file, 'utf8')
      checked += [...raw.matchAll(/class="chevron"[\s\S]{0,200}?d="([^"]+)"/g)].length
      for (const d of findNonCanonicalChevrons(raw)) {
        offenders.push(`${file.slice(here.length + 1)}: d="${d}"（应为 "${CANONICAL_CHEVRON}"）`)
      }
    }
    expect(checked, '应至少扫描到内联 chevron（否则匹配规则失效）').toBeGreaterThan(0)
    expect(offenders, '内联 chevron 路径与规范 V 形不一致，图标会画歪').toEqual([])
  })

  it('守卫自身有效：能识别坏 path、不误报规范 path', () => {
    const wrap = (d: string): string => `<svg class="chevron" viewBox="0 0 16 16"><path d="${d}"/></svg>`
    expect(findNonCanonicalChevrons(wrap('M4 6 L8 10 L12 6 L4 12'))).toEqual(['M4 6 L8 10 L12 6 L4 12'])
    expect(findNonCanonicalChevrons(wrap(CANONICAL_CHEVRON))).toEqual([])
  })
})
