/**
 * 实底色「on 文字色」择色（跨组件共享，替代 7 处重复实现）。
 *
 * 按底色相对亮度择深/浅文字：解析 #rgb/#rrggbb/rgb(a)（快路径）与色名/oklch 等任意 CSS 颜色
 * （隐藏探针交浏览器解析）；`var()` 与非法色值返回 null（前者走调用方 CSS 兜底 token）。
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

/**
 * 按底色相对亮度择 on 色。W3C 相对亮度阈值 0.35：亮底取 `dark`、暗底取 `light`；
 * 色值不可解析 → `fallback`。
 */
export function pickOnColor(color: string, { dark, light, fallback }: OnColorArgs): string {
  const rgb = resolveRgb(color)
  if (!rgb) return fallback
  const f = (v: number): number => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const lum = 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b)
  return lum > 0.35 ? dark : light
}
