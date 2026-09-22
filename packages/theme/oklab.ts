/**
 * 预设色板派生数学：sRGB ↔ OKLab/OKLCH 转换 + 感知对比度度量 + `-text` 安全档派生规则。
 *
 * 为什么存在：`index.css` 的 `--oas-preset-*-text` 曾靠逐个手调——修一组撞色就把另一组拉近，
 * 无可复算规则、下次再动又会重演。这里把「锁色相 + 对比度达标（含 bg-elevated 约束）+ 相邻可辨」
 * 三条约束写成可执行规则，由 `scripts/theme/derive-presets.mjs` 复算、由
 * `packages/ui/src/style-conventions.test.ts` 守卫。
 *
 * ⚠️ 本文件只被**测试与离线工具** import，不进任何运行时依赖：
 * theme 包 `files` 只发布 `index.css`，ui/core 的构建产物不含本模块。
 */

export type Rgb = [number, number, number]

/** OKLab：L ∈ [0,1]（0=黑 1=白），a/b 为对立色轴（绿↔红 / 蓝↔黄） */
export interface Oklab {
  L: number
  a: number
  b: number
}

/** OKLCH：L 同上，C 为彩度（0=灰），h 为色相角（度，0-360） */
export interface Oklch {
  L: number
  C: number
  h: number
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

export function hexToRgb(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) throw new Error(`非法 hex 色值：${hex}`)
  const n = parseInt(m[1]!, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex(rgb: Rgb): string {
  return `#${rgb
    .map((c) =>
      Math.round(clamp01(c / 255) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

/** sRGB 8bit 分量 → 线性光 [0,1]（sRGB 传输函数反解） */
export function srgbToLinear(c8: number): number {
  const c = c8 / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** 线性光 [0,1] → sRGB 8bit 分量（可能越界，调用方负责夹取/判定色域） */
export function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  return v * 255
}

export function srgbToOklab(rgb: Rgb): Oklab {
  const r = srgbToLinear(rgb[0])
  const g = srgbToLinear(rgb[1])
  const b = srgbToLinear(rgb[2])
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  }
}

/** OKLab → 线性 sRGB（未夹取；分量越界即出 sRGB 色域，用 inGamut 判定） */
export function oklabToLinearRgb(lab: Oklab): Rgb {
  const l = Math.pow(lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b, 3)
  const m = Math.pow(lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b, 3)
  const s = Math.pow(lab.L - 0.0894841775 * lab.a - 1.291485548 * lab.b, 3)
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

export function oklabToSrgb(lab: Oklab): Rgb {
  const [r, g, b] = oklabToLinearRgb(lab)
  return [linearToSrgb(r), linearToSrgb(g), linearToSrgb(b)]
}

export function oklabToOklch(lab: Oklab): Oklch {
  const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b)
  let h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI
  if (h < 0) h += 360
  return { L: lab.L, C, h }
}

export function oklchToOklab(lch: Oklch): Oklab {
  const rad = (lch.h * Math.PI) / 180
  return { L: lch.L, a: lch.C * Math.cos(rad), b: lch.C * Math.sin(rad) }
}

export function hexToOklch(hex: string): Oklch {
  return oklabToOklch(srgbToOklab(hexToRgb(hex)))
}

/** 是否落在 sRGB 色域内（容差吸收浮点误差） */
export function inGamut(lab: Oklab): boolean {
  return oklabToLinearRgb(lab).every((c) => c >= -1e-4 && c <= 1 + 1e-4)
}

/** 色域映射：保持 L 与 h，二分降低 C 直到落入 sRGB 色域（OKLCH 标准做法） */
export function gamutMap(lch: Oklch): Oklch {
  if (inGamut(oklchToOklab(lch))) return lch
  let lo = 0
  let hi = lch.C
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(oklchToOklab({ ...lch, C: mid }))) lo = mid
    else hi = mid
  }
  return { ...lch, C: lo }
}

/** OKLCH → sRGB hex（先色域映射再取整，保证输出即浏览器实际渲染色） */
export function oklchToHex(lch: Oklch): string {
  return rgbToHex(oklabToSrgb(oklchToOklab(gamutMap(lch))))
}

/** OKLab 欧氏色距 ×100（通行的 ΔE_OK 标度；1 单位 ≈ 大色块刚可辨） */
export function okDistance(a: Oklch, b: Oklch): number {
  const la = oklchToOklab(a)
  const lb = oklchToOklab(b)
  return Math.sqrt((la.L - lb.L) ** 2 + (la.a - lb.a) ** 2 + (la.b - lb.b) ** 2) * 100
}

/** 色相角差（度，取环形最短弧，0-180） */
export function hueDiff(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360)
  return d > 180 ? 360 - d : d
}

// ---------- 感知对比度（与 a11y 门禁同公式：公开数学定义的常数，原创实现） ----------
/** 感知亮度 Y（输入 8bit sRGB；量级 0-1） */
export function relativeLuminance(rgb: Rgb): number {
  const lin = (c: number) => Math.pow(c / 255, 2.4)
  return 0.2126729 * lin(rgb[0]!) + 0.7151522 * lin(rgb[1]!) + 0.072175 * lin(rgb[2]!)
}

/** 感知对比度（带符号：正=深字浅底，负=浅字深底；量级 0-100+） */
export function perceptualContrast(textY: number, bgY: number): number {
  if (Number.isNaN(textY) || Number.isNaN(bgY) || Math.min(textY, bgY) < 0 || Math.max(textY, bgY) > 1.1) return 0
  const clamp = (y: number) => (y > 0.022 ? y : y + Math.pow(0.022 - y, 1.414))
  const tY = clamp(textY)
  const bY = clamp(bgY)
  if (Math.abs(bY - tY) < 0.0005) return 0
  let raw: number
  let out: number
  if (bY > tY) {
    raw = (Math.pow(bY, 0.56) - Math.pow(tY, 0.57)) * 1.14
    out = raw < 0.1 ? 0 : raw - 0.027
  } else {
    raw = (Math.pow(bY, 0.65) - Math.pow(tY, 0.62)) * 1.14
    out = raw > -0.1 ? 0 : raw + 0.027
  }
  return out * 100
}

/** 感知对比度绝对值（fg/bg 为 hex） */
export function contrastScore(fgHex: string, bgHex: string): number {
  return Math.abs(perceptualContrast(relativeLuminance(hexToRgb(fgHex)), relativeLuminance(hexToRgb(bgHex))))
}

// ---------- 预设色板 `-text` 安全档：规则常量（守卫测试与离线工具共用同一真源） ----------
/** 预设色名全集（顺序即色相环序；相邻对冲突时的退让方向以本序为准） */
export const PRESET_NAMES = [
  'magenta',
  'red',
  'volcano',
  'orange',
  'gold',
  'lime',
  'green',
  'cyan',
  'blue',
  'geekblue',
  'purple',
] as const
export type PresetName = (typeof PRESET_NAMES)[number]

/** 语义相近、易混的相邻预设对（同一视觉族内必须保持可辨） */
export const ADJACENT_PRESET_PAIRS: readonly (readonly [PresetName, PresetName])[] = [
  ['gold', 'orange'],
  ['lime', 'green'],
  ['cyan', 'blue'],
  ['geekblue', 'blue'],
]

/** light 目标底：白底 + 灰卡底（与既有 `-text` 注释口径一致） */
export const LIGHT_TEXT_BGS = ['#ffffff', '#f5f5f5'] as const
/** dark 目标底：页面底 + `color-mix(elevated 12%, bg)` 软底（既有 `-text` 注释口径） */
export const DARK_TEXT_BGS = ['#18181b', '#1d1d20'] as const

/** `-text` 目标底感知分下限：既有 a11y 硬闸为 60，取 65 留 5 分余量 */
export const TEXT_MIN_SCORE = 65
/**
 * `-text` 在 `--oas-color-bg-elevated` 上的感知分下限：直接取 a11y 硬闸 60。
 * `bg-elevated`（light `#ffffff` / dark `#3f3f46`）是正式表面（snackbar / toolbar / app-bar /
 * sidebar / segmented / descriptions 等在用），属真实可达组合——但**不作求解目标**（只按目标底取极值档），
 * 而是作为**约束**：任一 `-text` 落到该底上不得低于硬闸，不达标即换解。
 */
export const TEXT_ELEVATED_MIN_SCORE = 60
/** 相邻预设 `-text` 的最小 OKLab 色距（ΔE_OK ×100）：人眼可靠可辨且不混淆 */
export const TEXT_MIN_DISTANCE = 8
/** `-text` 相对预设本色的最大色相漂移（度）：防调档时把金字调成红 */
export const TEXT_MAX_HUE_DRIFT = 12

/** `-text` 安全档每条底约束：`bg` 上感知分须 ≥ `min` */
export interface BgCheck {
  bg: string
  min: number
}

export interface PresetTokens {
  /** `--oas-preset-<name>`（本色） */
  base: Record<PresetName, string>
  /** `--oas-preset-<name>-text`（文字/实底安全档） */
  text: Record<PresetName, string>
}

function assertHex(value: string | undefined, token: string): string {
  if (!value) throw new Error(`theme/index.css 缺少 ${token} 的 hex 赋值`)
  return value
}

function parseBlock(block: string, suffix: string): Record<PresetName, string> {
  const out = {} as Record<PresetName, string>
  for (const name of PRESET_NAMES) {
    const token = `--oas-preset-${name}${suffix}`
    // 冒号紧跟色名，故 `--oas-preset-blue:` 不会误匹配 `--oas-preset-blue-text:`
    const m = block.match(new RegExp(`--oas-preset-${name}${suffix}:\\s*(#[0-9a-fA-F]{6})\\b`))
    out[name] = assertHex(m?.[1], token)
  }
  return out
}

/** 切出 light / dark 两个主题段的 CSS 文本（high-contrast 段之前） */
function splitThemeBlocks(cssText: string): { light: string; dark: string } {
  const darkAt = cssText.indexOf('[data-theme="dark"]')
  const hcAt = cssText.indexOf('[data-theme="high-contrast"]')
  if (darkAt < 0 || hcAt < darkAt) throw new Error('theme/index.css 结构变化：找不到 dark/high-contrast 主题段')
  return { light: cssText.slice(0, darkAt), dark: cssText.slice(darkAt, hcAt) }
}

/** 解析 index.css 的 light / dark 两套 `--oas-preset-*`（首个赋值即 light 段） */
export function parsePresetTokens(cssText: string): { light: PresetTokens; dark: PresetTokens } {
  const { light: lightBlock, dark: darkBlock } = splitThemeBlocks(cssText)
  return {
    light: { base: parseBlock(lightBlock, ''), text: parseBlock(lightBlock, '-text') },
    dark: { base: parseBlock(darkBlock, ''), text: parseBlock(darkBlock, '-text') },
  }
}

export interface ThemeElevatedBg {
  light: string
  dark: string
}

/** 解析 index.css 中 light / dark 的 `--oas-color-bg-elevated`（`-text` 的第三道底约束） */
export function parseElevatedBg(cssText: string): ThemeElevatedBg {
  const { light, dark } = splitThemeBlocks(cssText)
  const pick = (block: string): string => {
    const m = block.match(/--oas-color-bg-elevated:\s*(#[0-9a-fA-F]{6})\b/)
    const hex = m?.[1]
    if (!hex) throw new Error('theme/index.css 缺少 --oas-color-bg-elevated 的 hex 赋值')
    return hex
  }
  return { light: pick(light), dark: pick(dark) }
}

/** 目标底列表（按主题取） */
export function textBgs(mode: 'light' | 'dark'): readonly string[] {
  return mode === 'light' ? LIGHT_TEXT_BGS : DARK_TEXT_BGS
}

/**
 * `-text` 的完整底约束：既有目标底（≥ TEXT_MIN_SCORE）+ bg-elevated（≥ TEXT_ELEVATED_MIN_SCORE）。
 * 同一底色取更严的分值去重（light 的 bg-elevated 即白底，与目标底重合）。
 */
export function textBgChecks(mode: 'light' | 'dark', elevatedBg: string): BgCheck[] {
  const byBg = new Map<string, number>()
  for (const bg of textBgs(mode)) byBg.set(bg, TEXT_MIN_SCORE)
  byBg.set(elevatedBg, Math.max(byBg.get(elevatedBg) ?? 0, TEXT_ELEVATED_MIN_SCORE))
  return [...byBg].map(([bg, min]) => ({ bg, min }))
}

/** 单个候选色是否通过全部底约束 */
export function textChecksPass(hex: string, checks: readonly BgCheck[]): boolean {
  return checks.every((c) => contrastScore(hex, c.bg) >= c.min)
}

/**
 * 保色相取档：把预设本色沿 L 轴移到 L（彩度只在出 sRGB 色域时按色域映射压缩）。
 * 规则核心——`-text` 只允许在「亮度 / 彩度」上取档，色相不得漂移。
 */
export function presetTextHexAt(baseHex: string, L: number): string {
  const base = hexToOklch(baseHex)
  return oklchToHex({ L, C: base.C, h: base.h })
}

/** L 轴取样下限/上限（避免 L=0/1 处色相信息退化） */
export const MIN_L = 0.02
export const MAX_L = 0.99

/**
 * 对比度可行 L 区间（保持本色相与彩度，全部底约束均达标）：light 为 [0.02, L*]（越深越达标）、
 * dark 为 [L*, 0.99]（越亮越达标）。底约束含 bg-elevated（≥ 硬闸 60）。边界留 0.001 余量吸收
 * hex 取整误差。无解返回 null。
 */
export function feasibleLightnessRange(
  baseHex: string,
  mode: 'light' | 'dark',
  elevatedBg: string,
): { lo: number; hi: number } | null {
  const checks = textBgChecks(mode, elevatedBg)
  const ok = (L: number): boolean => textChecksPass(presetTextHexAt(baseHex, L), checks)
  const light = mode === 'light'
  const edge = light ? MIN_L : MAX_L
  if (!ok(edge)) return null
  if (!ok(light ? MAX_L : MIN_L)) {
    // 达标性沿 L 轴单调：二分找边界
    let passing = edge
    let failing = light ? MAX_L : MIN_L
    for (let i = 0; i < 60; i++) {
      const mid = (passing + failing) / 2
      if (ok(mid)) passing = mid
      else failing = mid
    }
    const margin = 0.001
    return light ? { lo: MIN_L, hi: passing - margin } : { lo: passing + margin, hi: MAX_L }
  }
  return { lo: MIN_L, hi: MAX_L }
}
