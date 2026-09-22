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
import {
  ADJACENT_PRESET_PAIRS,
  PRESET_NAMES,
  TEXT_ELEVATED_MIN_SCORE,
  TEXT_MAX_HUE_DRIFT,
  TEXT_MIN_DISTANCE,
  TEXT_MIN_SCORE,
  contrastScore,
  hexToOklch,
  hueDiff,
  okDistance,
  parseElevatedBg,
  parsePresetTokens,
  textBgs,
} from '../../theme/oklab'

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

// ---------- theme 预设 -text 档：派生规则守卫（锁色相 + 对比度 + 相邻色距） ----------
// 背景：light 的 gold-text 曾手调成 #6a4c00 只为拉开与 orange 的 RGB 距离，结果 lime↔green
// 只剩 ΔE 3.9、geekblue↔blue 仅 5.1——没有可复算规则，下次再动又会重演。本组守卫把
// docs/ui-spec.md §1.2 的派生规则锁死（阈值常量与离线复算工具同源：packages/theme/oklab.ts）：
//   1. 目标底（light #ffffff/#f5f5f5、dark #18181b/#1d1d20）感知分 ≥ TEXT_MIN_SCORE；
//   2. `-text` 在主题 `--oas-color-bg-elevated` 上感知分 ≥ TEXT_ELEVATED_MIN_SCORE（硬闸 60）——
//      bg-elevated（dark #3f3f46）是 snackbar/toolbar/app-bar/sidebar/segmented/descriptions 等
//      正式表面，真实可达；它不作求解目标，只作约束；
//   3. `-text` 相对本色的色相漂移 ≤ TEXT_MAX_HUE_DRIFT（"gold 不许变成红"）；
//   4. 相邻易混组 ΔE_OK ≥ TEXT_MIN_DISTANCE。
// 复算：node scripts/theme/derive-presets.mjs（含违例清单与推导表）
const THEME_CSS = readFileSync(join(here, '../../theme/index.css'), 'utf8')
const TOKENS = parsePresetTokens(THEME_CSS)
const ELEVATED = parseElevatedBg(THEME_CSS)
const THEME_MODES = ['light', 'dark'] as const

type ThemeMode = (typeof THEME_MODES)[number]

/** 目标底感知分不达标的预设（返回违规明细，空数组 = 通过） */
function contrastViolations(mode: ThemeMode, tokens = TOKENS[mode]): string[] {
  const bgs = textBgs(mode)
  return PRESET_NAMES.filter((name) => bgs.some((bg) => contrastScore(tokens.text[name], bg) < TEXT_MIN_SCORE)).map(
    (name) =>
      `${mode} ${name}-text ${tokens.text[name]}：目标底感知分 ${bgs
        .map((bg) => `${bg}=${contrastScore(tokens.text[name], bg).toFixed(1)}`)
        .join(' / ')} < ${TEXT_MIN_SCORE}`,
  )
}

/** 在主题 bg-elevated 上低于硬闸的预设（空数组 = 通过；light 的 bg-elevated 即白底，被目标底覆盖） */
function elevatedViolations(mode: ThemeMode, tokens = TOKENS[mode]): string[] {
  const bg = ELEVATED[mode]
  return PRESET_NAMES.filter((name) => contrastScore(tokens.text[name], bg) < TEXT_ELEVATED_MIN_SCORE).map(
    (name) =>
      `${mode} ${name}-text ${tokens.text[name]}：bg-elevated(${bg}) 感知分 ${contrastScore(tokens.text[name], bg).toFixed(1)} < ${TEXT_ELEVATED_MIN_SCORE}`,
  )
}

/** 色相漂移超限的预设（空数组 = 通过） */
function hueDriftViolations(mode: ThemeMode, tokens = TOKENS[mode]): string[] {
  return PRESET_NAMES.filter(
    (name) => hueDiff(hexToOklch(tokens.base[name]).h, hexToOklch(tokens.text[name]).h) > TEXT_MAX_HUE_DRIFT,
  ).map((name) => {
    const drift = hueDiff(hexToOklch(tokens.base[name]).h, hexToOklch(tokens.text[name]).h)
    return `${mode} ${name}-text ${tokens.text[name]}：色相漂移 ${drift.toFixed(1)}° > ${TEXT_MAX_HUE_DRIFT}°（本色 ${tokens.base[name]}）`
  })
}

/** 相邻易混组色距不足的预设对（空数组 = 通过） */
function distanceViolations(mode: ThemeMode, tokens = TOKENS[mode]): string[] {
  return ADJACENT_PRESET_PAIRS.filter(
    ([a, b]) => okDistance(hexToOklch(tokens.text[a]), hexToOklch(tokens.text[b])) < TEXT_MIN_DISTANCE,
  ).map(([a, b]) => {
    const d = okDistance(hexToOklch(tokens.text[a]), hexToOklch(tokens.text[b]))
    return `${mode} ${a}-text ${tokens.text[a]} ↔ ${b}-text ${tokens.text[b]}：ΔE ${d.toFixed(1)} < ${TEXT_MIN_DISTANCE}`
  })
}

/** 覆盖若干 `-text` 值后的 token 副本（供守卫自检注入历史缺陷） */
function withText(mode: ThemeMode, overrides: Partial<Record<string, string>>) {
  return { base: TOKENS[mode].base, text: { ...TOKENS[mode].text, ...overrides } }
}

describe('theme 预设 -text 档：目标底感知分 ≥65（light 白底/灰卡底、dark 页底/软底）', () => {
  for (const mode of THEME_MODES) {
    it(`${mode}：全部预设 -text 目标底达标`, () => {
      expect(contrastViolations(mode), '预设 -text 目标底感知分不达标，文字不可读').toEqual([])
    })
  }

  it('守卫自身有效：能识别低对比注入、不误报当前值', () => {
    const injected = withText('light', { gold: '#ffd666' })
    expect(contrastViolations('light', injected)).toHaveLength(1)
    expect(contrastViolations('light')).toEqual([])
  })
})

describe('theme 预设 -text 档：bg-elevated 感知分 ≥60 硬闸（dark #3f3f46 为真实可达表面）', () => {
  for (const mode of THEME_MODES) {
    it(`${mode}：全部预设 -text 在 bg-elevated 上达标`, () => {
      expect(
        elevatedViolations(mode),
        '预设 -text 落在 bg-elevated（snackbar/toolbar/app-bar/sidebar 等正式表面）上低于硬闸，文字不可读',
      ).toEqual([])
    })
  }

  it('守卫自身有效：能捕获「目标底达标、仅 bg-elevated 不达标」的注入、不误报当前值', () => {
    // #ffaa43 在 dark 页底/软底上 65.6/65.0（目标底 ≥65 达标），却在 bg-elevated #3f3f46 上仅 57.1
    // ——证明本断言独立于目标底断言，不是重复覆盖
    const injected = withText('dark', { orange: '#ffaa43' })
    expect(contrastViolations('dark', injected), '该注入值目标底仍达标（是断言独立性的前提）').toEqual([])
    expect(elevatedViolations('dark', injected)).toHaveLength(1)
    expect(elevatedViolations('dark')).toEqual([])
    expect(elevatedViolations('light')).toEqual([])
  })
})

describe('theme 预设 -text 档：锁色相（漂移 ≤ 12°）', () => {
  for (const mode of THEME_MODES) {
    it(`${mode}：全部预设 -text 保持本色相`, () => {
      expect(hueDriftViolations(mode), '预设 -text 色相漂移超限（会把金字调成红字这类事故）').toEqual([])
    })
  }

  it('守卫自身有效：gold 调成 red 能被捕获、当前值不误报', () => {
    expect(hueDriftViolations('light', withText('light', { gold: '#da1e28' })).length).toBeGreaterThan(0)
    // 本色相跨度远大于阈值：gold(76°) → red(26°) 这种"改色相"必被拦
    expect(hueDiff(hexToOklch('#faad14').h, hexToOklch('#f5222d').h)).toBeGreaterThan(TEXT_MAX_HUE_DRIFT)
    expect(hueDriftViolations('light')).toEqual([])
  })
})

describe('theme 预设 -text 档：相邻易混组 ΔE_OK ≥ 8（gold↔orange / lime↔green / cyan↔blue / geekblue↔blue）', () => {
  for (const mode of THEME_MODES) {
    it(`${mode}：全部相邻组色距达标`, () => {
      expect(distanceViolations(mode), '相邻预设 -text 撞色不可辨，请按 ui-spec §1.2 规则重跑派生工具').toEqual([])
    })
  }

  it('守卫自身有效：能捕获历史撞色（lime/green 3.9、geekblue/blue 5.1）、不误报当前值', () => {
    expect(distanceViolations('light', withText('light', { green: '#357f11' }))).not.toEqual([])
    expect(distanceViolations('light', withText('light', { geekblue: '#2f54eb' }))).not.toEqual([])
    expect(distanceViolations('dark', withText('dark', { geekblue: '#b3c4fb', blue: '#b8d6ff' }))).not.toEqual([])
    // 历史缺陷的确低于下限（该组对若被"改回去"必然 RED）
    expect(okDistance(hexToOklch('#357f11'), hexToOklch('#5a7a0a'))).toBeLessThan(TEXT_MIN_DISTANCE)
    expect(okDistance(hexToOklch('#b3c4fb'), hexToOklch('#b8d6ff'))).toBeLessThan(TEXT_MIN_DISTANCE)
  })
})
