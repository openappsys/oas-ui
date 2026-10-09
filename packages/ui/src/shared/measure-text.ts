/**
 * measure-text —— 纯文本宽度量测（reserve-width 类「锁最宽内容」需求的共享底层）。
 *
 * 三级降级（同一函数内自动回退，调用方无感知）：
 * 1. Canvas `measureText`：浏览器内精确（同步、无 DOM 插入、可带字体）；
 * 2. 离屏 span `offsetWidth`：canvas 不可用（越权环境/实现缺失）时的真实布局量测；
 * 3. 字符估算：无布局引擎（SSR / 测试环境 offsetWidth 恒 0）时按码点估宽
 *    （CJK/全角 1em、其余 0.6em）——精度有限但单调可比较，够「锁定相对最宽」用。
 *
 * 全链路只读、不留孤儿节点（span 即插即删）；SSR（无 document）直接走估算层。
 */

/** 量测字体（CSS 语义；估算层只消费 fontSize 的像素数值） */
export interface MeasureFont {
  fontSize?: string
  fontFamily?: string
}

/** 估算层：半角字符宽度系数（相对 1em） */
const EST_ASCII_EM = 0.6

/** 量测一批文本的最大宽度（px）；空白串不计入，全空返回 0 */
export function measureMaxTextWidth(texts: string[], font?: MeasureFont): number {
  const items = texts.filter((t) => t.trim() !== '')
  if (items.length === 0) return 0
  const fontStr = fontString(font)
  const byCanvas = measureByCanvas(items, fontStr)
  if (byCanvas > 0) return byCanvas
  const bySpan = measureBySpan(items, fontStr)
  if (bySpan > 0) return bySpan
  return estimateMaxWidth(items, font?.fontSize)
}

/** 拼 CSS font 简写（缺省字号 16px）；字体族缺省补 sans-serif——
 *  CSS font 简写必须同时带字号与字体族，缺族整条声明非法：canvas 会静默保留 10px 默认值
 *  （系统性低估约 40%，reserve-width 锁宽会小于真实 label 宽而继续抖动） */
function fontString(font?: MeasureFont): string {
  const size = font?.fontSize?.trim() || '16px'
  const family = font?.fontFamily?.trim() || 'sans-serif'
  return `${size} ${family}`
}

/** 层 1：Canvas measureText；context 不可用或全 0 返回 0（交由下层降级） */
function measureByCanvas(items: string[], fontStr: string): number {
  try {
    if (typeof document === 'undefined') return 0
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx || typeof ctx.measureText !== 'function') return 0
    ctx.font = fontStr
    let max = 0
    for (const t of items) max = Math.max(max, ctx.measureText(t).width)
    return max
  } catch {
    return 0
  }
}

/** 层 2：离屏 span offsetWidth（即插即删，不留孤儿节点）；不可测返回 0 */
function measureBySpan(items: string[], fontStr: string): number {
  try {
    if (typeof document === 'undefined' || !document.body) return 0
    const span = document.createElement('span')
    span.style.cssText =
      'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;pointer-events:none;'
    if (fontStr) span.style.font = fontStr
    let max = 0
    for (const t of items) {
      span.textContent = t
      document.body.appendChild(span)
      max = Math.max(max, span.offsetWidth)
    }
    span.remove()
    return max
  } catch {
    return 0
  }
}

/** 层 3：按码点估算（CJK/全角 1em、其余 0.6em）；无布局引擎环境（SSR/测试）的兜底 */
function estimateMaxWidth(items: string[], fontSize?: string): number {
  const em = Number.parseFloat(fontSize ?? '') || 16
  let max = 0
  for (const t of items) {
    let w = 0
    for (const ch of t) {
      const code = ch.codePointAt(0) ?? 0
      // CJK 统一表/扩展、全角形式、谚文等宽字符按 1em，其余按 0.6em
      const wide =
        (code >= 0x1100 && (code <= 0x115f || code === 0x2329 || code === 0x232a)) ||
        (code >= 0x2e80 && code <= 0xa4cf) ||
        (code >= 0xac00 && code <= 0xd7a3) ||
        (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0xfe30 && code <= 0xfe4f) ||
        (code >= 0xff00 && code <= 0xff60) ||
        (code >= 0xffe0 && code <= 0xffe6) ||
        (code >= 0x20000 && code <= 0x3fffd)
      w += wide ? em : em * EST_ASCII_EM
    }
    max = Math.max(max, w)
  }
  return max
}
