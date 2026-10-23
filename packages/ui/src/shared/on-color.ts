/**
 * 实底色「on 文字色」择色（跨组件共享，替代 7 处重复实现）。
 *
 * 按底色与候选前景色的 WCAG 对比度择色：解析 #rgb/#rrggbb/rgb(a)（快路径）与色名/oklch 等任意 CSS 颜色
 * （隐藏探针交浏览器解析）；候选不可解析时回落相对亮度阈值启发式；`var()` 与非法底色返回 null
 * （前者走调用方 CSS 兜底 token）。
 */
export function resolveRgb(color: string): { r: number; g: number; b: number } | null {
  const c = color.trim()
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const h = hex[1]!.length === 3 ? hex[1]!.replace(/(.)/g, '$1$1') : hex[1]!
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
  }
  const rgb = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i)
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) }
  if (/var\(/i.test(c) || c === '') return null
  if (typeof document === 'undefined' || !document.body) return null
  const probe = document.createElement('span')
  probe.style.color = c
  if (probe.style.color === '') return null // 非法色值被 CSSOM 丢弃，避免回落继承色造成假阳性
  probe.style.cssText += ';position:absolute;visibility:hidden;pointer-events:none'
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  const m = resolved.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i)
  return m ? { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) } : null
}

/** on 色返回约定：dark=亮底取深字、light=暗底取浅字、fallback=不可解析时（走调用方 CSS token） */
export interface OnColorArgs {
  dark: string
  light: string
  fallback: string
}

/** WCAG 2.x 相对亮度（sRGB 通道线性化后加权；黑 0 → 白 1） */
function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const f = (v: number): number => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** WCAG 对比度：(较亮 + 0.05) / (较暗 + 0.05)，范围 1 ~ 21 */
function contrastRatio(a: number, b: number): number {
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * 按底色择 on 色：分别计算 `dark`/`light` 与底色的 WCAG 对比度，取更高者。
 *
 * - 候选色均可解析 → 对比度择色（中间色调不再被亮度阈值一刀切，如 #3b82f6 选深字）；
 * - 候选色不可解析（如 `var(--token)` 字符串）→ 回落旧启发式：底色相对亮度 > 0.35 取 `dark`，否则 `light`；
 * - 对比度相等 → 保持旧偏好（亮度 > 0.35 取 `dark`，否则 `light`），行为可预期；
 * - 底色不可解析 → `fallback`。
 */
export function pickOnColor(color: string, { dark, light, fallback }: OnColorArgs): string {
  const rgb = resolveRgb(color)
  if (!rgb) return fallback
  const bgLum = relativeLuminance(rgb)
  const darkRgb = resolveRgb(dark)
  const lightRgb = resolveRgb(light)
  // 候选色是 CSS token/变量时无法测对比度，保留历史阈值行为（调用方多以 token 表达主题色）
  const legacy = (): string => (bgLum > 0.35 ? dark : light)
  if (!darkRgb || !lightRgb) return legacy()
  const darkContrast = contrastRatio(bgLum, relativeLuminance(darkRgb))
  const lightContrast = contrastRatio(bgLum, relativeLuminance(lightRgb))
  // 浮点相等（理论上可无解，防御性保留旧偏好）
  if (Math.abs(darkContrast - lightContrast) < 1e-9) return legacy()
  return lightContrast > darkContrast ? light : dark
}
