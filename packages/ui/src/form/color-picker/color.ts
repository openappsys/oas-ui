/**
 * 颜色解析与格式化纯函数（无 DOM 依赖，SSR 与客户端共用）。
 *
 * 内部统一 RGBA（r/g/b 0-255，a 0-1）；对外序列化由调用方按 color-format
 * （hex / rgb）、uppercase、alpha 通道开关决定。解析宽容：接受 CSS 颜色名、
 * hex 3/4/6/8 位、rgb()/rgba()/hsl()/hsla()（逗号与现代空格语法），
 * 统一归一化到内部表示。
 */

/** CSS 命名颜色 → 24 位 RGB（CSS Color Module 标准色名表；'transparent' 单独按 rgba(0,0,0,0) 处理） */
export const NAMED_COLORS: Record<string, number> = {
  'aliceblue': 0xf0f8ff,
  'antiquewhite': 0xfaebd7,
  'aqua': 0x00ffff,
  'aquamarine': 0x7fffd4,
  'azure': 0xf0ffff,
  'beige': 0xf5f5dc,
  'bisque': 0xffe4c4,
  'black': 0x000000,
  'blanchedalmond': 0xffebcd,
  'blue': 0x0000ff,
  'blueviolet': 0x8a2be2,
  'brown': 0xa52a2a,
  'burlywood': 0xdeb887,
  'cadetblue': 0x5f9ea0,
  'chartreuse': 0x7fff00,
  'chocolate': 0xd2691e,
  'coral': 0xff7f50,
  'cornflowerblue': 0x6495ed,
  'cornsilk': 0xfff8dc,
  'crimson': 0xdc143c,
  'cyan': 0x00ffff,
  'darkblue': 0x00008b,
  'darkcyan': 0x008b8b,
  'darkgoldenrod': 0xb8860b,
  'darkgray': 0xa9a9a9,
  'darkgreen': 0x006400,
  'darkgrey': 0xa9a9a9,
  'darkkhaki': 0xbdb76b,
  'darkmagenta': 0x8b008b,
  'darkolivegreen': 0x556b2f,
  'darkorange': 0xff8c00,
  'darkorchid': 0x9932cc,
  'darkred': 0x8b0000,
  'darksalmon': 0xe9967a,
  'darkseagreen': 0x8fbc8f,
  'darkslateblue': 0x483d8b,
  'darkslategray': 0x2f4f4f,
  'darkslategrey': 0x2f4f4f,
  'darkturquoise': 0x00ced1,
  'darkviolet': 0x9400d3,
  'deeppink': 0xff1493,
  'deepskyblue': 0x00bfff,
  'dimgray': 0x696969,
  'dimgrey': 0x696969,
  'dodgerblue': 0x1e90ff,
  'firebrick': 0xb22222,
  'floralwhite': 0xfffaf0,
  'forestgreen': 0x228b22,
  'fuchsia': 0xff00ff,
  'gainsboro': 0xdcdcdc,
  'ghostwhite': 0xf8f8ff,
  'gold': 0xffd700,
  'goldenrod': 0xdaa520,
  'gray': 0x808080,
  'green': 0x008000,
  'greenyellow': 0xadff2f,
  'grey': 0x808080,
  'honeydew': 0xf0fff0,
  'hotpink': 0xff69b4,
  'indianred': 0xcd5c5c,
  'indigo': 0x4b0082,
  'ivory': 0xfffff0,
  'khaki': 0xf0e68c,
  'lavender': 0xe6e6fa,
  'lavenderblush': 0xfff0f5,
  'lawngreen': 0x7cfc00,
  'lemonchiffon': 0xfffacd,
  'lightblue': 0xadd8e6,
  'lightcoral': 0xf08080,
  'lightcyan': 0xe0ffff,
  'lightgoldenrodyellow': 0xfafad2,
  'lightgray': 0xd3d3d3,
  'lightgreen': 0x90ee90,
  'lightgrey': 0xd3d3d3,
  'lightpink': 0xffb6c1,
  'lightsalmon': 0xffa07a,
  'lightseagreen': 0x20b2aa,
  'lightskyblue': 0x87cefa,
  'lightslategray': 0x778899,
  'lightslategrey': 0x778899,
  'lightsteelblue': 0xb0c4de,
  'lightyellow': 0xffffe0,
  'lime': 0x00ff00,
  'limegreen': 0x32cd32,
  'linen': 0xfaf0e6,
  'magenta': 0xff00ff,
  'maroon': 0x800000,
  'mediumaquamarine': 0x66cdaa,
  'mediumblue': 0x0000cd,
  'mediumorchid': 0xba55d3,
  'mediumpurple': 0x9370db,
  'mediumseagreen': 0x3cb371,
  'mediumslateblue': 0x7b68ee,
  'mediumspringgreen': 0x00fa9a,
  'mediumturquoise': 0x48d1cc,
  'mediumvioletred': 0xc71585,
  'midnightblue': 0x191970,
  'mintcream': 0xf5fffa,
  'mistyrose': 0xffe4e1,
  'moccasin': 0xffe4b5,
  'navajowhite': 0xffdead,
  'navy': 0x000080,
  'oldlace': 0xfdf5e6,
  'olive': 0x808000,
  'olivedrab': 0x6b8e23,
  'orange': 0xffa500,
  'orangered': 0xff4500,
  'orchid': 0xda70d6,
  'palegoldenrod': 0xeee8aa,
  'palegreen': 0x98fb98,
  'paleturquoise': 0xafeeee,
  'palevioletred': 0xdb7093,
  'papayawhip': 0xffefd5,
  'peachpuff': 0xffdab9,
  'peru': 0xcd853f,
  'pink': 0xffc0cb,
  'plum': 0xdda0dd,
  'powderblue': 0xb0e0e6,
  'purple': 0x800080,
  'rebeccapurple': 0x663399,
  'red': 0xff0000,
  'rosybrown': 0xbc8f8f,
  'royalblue': 0x4169e1,
  'saddlebrown': 0x8b4513,
  'salmon': 0xfa8072,
  'sandybrown': 0xf4a460,
  'seagreen': 0x2e8b57,
  'seashell': 0xfff5ee,
  'sienna': 0xa0522d,
  'silver': 0xc0c0c0,
  'skyblue': 0x87ceeb,
  'slateblue': 0x6a5acd,
  'slategray': 0x708090,
  'slategrey': 0x708090,
  'snow': 0xfffafa,
  'springgreen': 0x00ff7f,
  'steelblue': 0x4682b4,
  'tan': 0xd2b48c,
  'teal': 0x008080,
  'thistle': 0xd8bfd8,
  'tomato': 0xff6347,
  'turquoise': 0x40e0d0,
  'violet': 0xee82ee,
  'wheat': 0xf5deb3,
  'white': 0xffffff,
  'whitesmoke': 0xf5f5f5,
  'yellow': 0xffff00,
  'yellowgreen': 0x9acd32,
}

// ---------- 类型 ----------

/** 内部色值：r/g/b 0-255（通道会取整/钳制），a 0-1 */
export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

/** 序列化格式：hex 8 位（alpha 时）/ 6 位；rgb 输出 rgb()/rgba() */
export type ColorFormat = 'hex' | 'rgb'

export interface FormatOptions {
  format?: ColorFormat
  /** hex 输出大写（仅 hex 生效） */
  uppercase?: boolean
  /** 输出携带 alpha 通道：hex → 8 位 #rrggbbaa；rgb → rgba() */
  alpha?: boolean
}

// ---------- 工具 ----------

function clamp255(v: number): number {
  return Math.min(255, Math.max(0, Math.round(v)))
}

/** 解析 alpha 分量：'0.5' / '50%' → 0-1 */
function parseAlpha(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  if (t.endsWith('%')) {
    const n = Number(t.slice(0, -1))
    if (Number.isNaN(n)) return null
    return Math.min(1, Math.max(0, n / 100))
  }
  const n = Number(t)
  if (Number.isNaN(n)) return null
  return Math.min(1, Math.max(0, n))
}

/** 解析 rgb 通道分量：'255' / '100%' → 0-255 */
function parseChannel(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  if (t.endsWith('%')) {
    const n = Number(t.slice(0, -1))
    if (Number.isNaN(n)) return null
    return Math.min(255, Math.max(0, (n / 100) * 255))
  }
  const n = Number(t)
  if (Number.isNaN(n)) return null
  return Math.min(255, Math.max(0, n))
}

/** 解析 hsl 的 s/l：'100%' → 1；无单位小数（≤1）按 0-1 分数；无单位大数按 0-100 百分比 */
function parseHslPart(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  if (t.endsWith('%')) {
    const n = Number(t.slice(0, -1))
    if (Number.isNaN(n)) return null
    return Math.min(1, Math.max(0, n / 100))
  }
  const n = Number(t)
  if (Number.isNaN(n)) return null
  const v = n <= 1 ? n : n / 100
  return Math.min(1, Math.max(0, v))
}

/** 解析角度（hue）：支持 deg 后缀、rad/grad/turn */
function parseAngle(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const m = /^([-+]?\d*\.?\d+)(deg|rad|grad|turn)?$/.exec(t)
  if (!m) return null
  const n = Number(m[1])
  if (Number.isNaN(n)) return null
  const unit = m[2]
  let deg = n
  if (unit === 'rad') deg = (n * 180) / Math.PI
  else if (unit === 'grad') deg = n * 0.9
  else if (unit === 'turn') deg = n * 360
  return deg
}

/** 取通道子串中顶层 '/'（括号外）下标，无则 -1 */
function findAlphaSlash(body: string): number {
  let depth = 0
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === '/' && depth === 0) return i
  }
  return -1
}

/** 颜色函数体 → 空格分隔的分量数组（逗号归一为空格） */
function splitTokens(channels: string): string[] {
  return channels.replace(/,/g, ' ').trim().split(/\s+/)
}

// ---------- 解析 ----------

function parseHex(input: string): RGBA | null {
  const body = input.trim().replace(/^#/, '')
  if (!/^[0-9a-f]+$/i.test(body)) return null
  let hex: string
  let a = 1
  if (body.length === 3 || body.length === 4) {
    hex = body
      .slice(0, 3)
      .split('')
      .map((c) => c + c)
      .join('')
    if (body.length === 4) a = Number.parseInt(body[3]! + body[3], 16) / 255
  } else if (body.length === 6 || body.length === 8) {
    hex = body.slice(0, 6)
    if (body.length === 8) a = Number.parseInt(body.slice(6), 16) / 255
  } else {
    return null
  }
  const n = Number.parseInt(hex, 16)
  if (Number.isNaN(n)) return null
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a }
}

function parseRgbFn(args: string, hasAlphaName: boolean): RGBA | null {
  const slash = findAlphaSlash(args)
  let channels = args
  let alpha: number | null = hasAlphaName ? 1 : null
  if (slash >= 0) {
    channels = args.slice(0, slash)
    alpha = parseAlpha(args.slice(slash + 1))
    if (alpha === null) return null
  }
  const tokens = splitTokens(channels)
  // 逗号 4 元形式 rgba(r, g, b, a)：末位即 alpha（rgba/hsla 命名与无后缀一致处理）
  if (tokens.length === 4) {
    alpha = parseAlpha(tokens.pop()!)
    if (alpha === null) return null
  }
  if (tokens.length !== 3) return null
  const r = parseChannel(tokens[0]!)
  const g = parseChannel(tokens[1]!)
  const b = parseChannel(tokens[2]!)
  if (r === null || g === null || b === null) return null
  return { r: clamp255(r), g: clamp255(g), b: clamp255(b), a: alpha ?? 1 }
}

function parseHslFn(args: string, hasAlphaName: boolean): RGBA | null {
  const slash = findAlphaSlash(args)
  let channels = args
  let alpha: number | null = hasAlphaName ? 1 : null
  if (slash >= 0) {
    channels = args.slice(0, slash)
    alpha = parseAlpha(args.slice(slash + 1))
    if (alpha === null) return null
  }
  const tokens = splitTokens(channels)
  // 逗号 4 元形式 hsla(h, s%, l%, a)：末位即 alpha
  if (tokens.length === 4) {
    alpha = parseAlpha(tokens.pop()!)
    if (alpha === null) return null
  }
  if (tokens.length !== 3) return null
  const hue = parseAngle(tokens[0]!)
  const s = parseHslPart(tokens[1]!)
  const l = parseHslPart(tokens[2]!)
  if (hue === null || s === null || l === null) return null
  return { ...hslToRgb(hue, s, l), a: alpha ?? 1 }
}

/**
 * 宽容解析任意 CSS 颜色输入 → RGBA。
 * hex（#rgb/#rgba/#rrggbb/#rrggbbaa，可省略 #）、CSS 颜色名、
 * rgb()/rgba()/hsl()/hsla()（逗号与现代空格 + 斜杠语法）；
 * 解析失败返回 null（调用方保持原值，不回退不抛错）。
 */
export function parseColor(input: string): RGBA | null {
  const t = input.trim()
  if (!t) return null
  if (t.startsWith('#')) {
    const hex = parseHex(t)
    if (hex) return hex
    return null
  }
  const m = /^(rgb|rgba|hsl|hsla)\(([\s\S]*)\)$/i.exec(t)
  if (m) {
    const fn = m[1]!.toLowerCase()
    const args = m[2]!
    if (fn === 'rgb' || fn === 'rgba') return parseRgbFn(args, fn === 'rgba')
    return parseHslFn(args, fn === 'hsla')
  }
  // 无 # 纯 hex（6/8/3/4 位）也宽容接受（与颜色名/函数式并列的第三种简写）
  const hex = parseHex(t)
  if (hex) return hex
  const lower = t.toLowerCase()
  if (lower === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  const named = NAMED_COLORS[lower]
  if (named !== undefined) {
    return { r: (named >> 16) & 255, g: (named >> 8) & 255, b: named & 255, a: 1 }
  }
  return null
}

// ---------- 格式化 ----------

function trimDecimals(v: number, max = 4): string {
  if (v === 0) return '0'
  const s = Number(v.toFixed(max)).toString()
  return s
}

/** 触发/面板色块内联背景：全精度 rgba() */
export function formatSwatch(rgba: RGBA): string {
  const a = Number(rgba.a.toFixed(6)).toString()
  return `rgba(${clamp255(rgba.r)}, ${clamp255(rgba.g)}, ${clamp255(rgba.b)}, ${a})`
}

function toHexByte(v: number): string {
  return clamp255(v).toString(16).padStart(2, '0')
}

/** hex 序列化：#rrggbb；alpha 开启 → 8 位 #rrggbbaa（含不透明 ff 尾，通道恒定） */
export function formatHex(rgba: RGBA, uppercase = false): string {
  let out = `#${toHexByte(rgba.r)}${toHexByte(rgba.g)}${toHexByte(rgba.b)}`
  if (uppercase) out = out.toUpperCase()
  return out
}

/** rgb 序列化：rgb(r, g, b)；alpha 开启 → rgba(r, g, b, a) */
export function formatRgb(rgba: RGBA, alpha = false): string {
  const r = clamp255(rgba.r)
  const g = clamp255(rgba.g)
  const b = clamp255(rgba.b)
  if (alpha) return `rgba(${r}, ${g}, ${b}, ${trimDecimals(Math.min(1, Math.max(0, rgba.a)))})`
  return `rgb(${r}, ${g}, ${b})`
}

/** 按 format/uppercase/alpha 序列化色值（value 属性 / 触发器文本 / 面板输入条的通用出口） */
export function formatColor(rgba: RGBA, opts: FormatOptions = {}): string {
  const { format = 'hex', uppercase = false, alpha = false } = opts
  if (format === 'rgb') return formatRgb(rgba, alpha)
  let hex = formatHex(rgba)
  if (alpha) hex = `${hex}${toHexByte(rgba.a * 255)}`
  if (uppercase) hex = hex.toUpperCase()
  return hex
}

// ---------- HSV 换算（面板 HS 通道） ----------

/** RGB(0-255) → HSV(h 0-360, s 0-1, v 0-1) */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === R) h = ((G - B) / d) % 6
    else if (max === G) h = (B - R) / d + 2
    else h = (R - G) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return [h, s, max]
}

/** HSV → RGB(0-255 未取整) */
export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s
  const hp = ((h % 360) + 360) % 360
  const x = c * (1 - Math.abs(((hp / 60) % 2) - 1))
  let rgb: [number, number, number]
  if (hp < 60) rgb = [c, x, 0]
  else if (hp < 120) rgb = [x, c, 0]
  else if (hp < 180) rgb = [0, c, x]
  else if (hp < 240) rgb = [0, x, c]
  else if (hp < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]
  const m = v - c
  return {
    r: (rgb[0]! + m) * 255,
    g: (rgb[1]! + m) * 255,
    b: (rgb[2]! + m) * 255,
  }
}

/** HSL（h 角度、s/l 0-1）→ RGB(0-255 未取整) */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hp = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hp / 60) % 2) - 1))
  let rgb: [number, number, number]
  if (hp < 60) rgb = [c, x, 0]
  else if (hp < 120) rgb = [x, c, 0]
  else if (hp < 180) rgb = [0, c, x]
  else if (hp < 240) rgb = [0, x, c]
  else if (hp < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]
  const m = l - c / 2
  return {
    r: (rgb[0]! + m) * 255,
    g: (rgb[1]! + m) * 255,
    b: (rgb[2]! + m) * 255,
  }
}

// ---------- 2D 色域指针换算（二期 2D 面板：x→饱和度、y 反转→亮度） ----------

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

/**
 * 2D 色域指针归一坐标（0..1）→ [s, v]。
 * x 左→右 = 饱和度升；y 上→下 = 亮度降（v = 1 - y）。越界钳到边界。
 */
export function xyToSv(x: number, y: number): [number, number] {
  return [clamp01(x), 1 - clamp01(y)]
}

/** hue 竖条 y 归一化（0..1，底端 0 = 红）→ 0..360 色相 */
export function hueFromY(y: number): number {
  return (1 - clamp01(y)) * 360
}

// ---------- 渐变（linear-gradient）解析 / 输出（二期渐变模式） ----------

/** 渐变 stop：pos 0..1（轴上相对位置），color 独立 RGBA */
export interface GradientStop {
  pos: number
  color: RGBA
}

/** 顶层逗号分隔（忽略括号内逗号，如 rgba()/hsl() 内部） */
function splitTopLevel(input: string): string[] {
  const parts: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of input) {
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
    if (ch === ',' && depth === 0) {
      parts.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  parts.push(cur)
  return parts
}

/** 取色 stop 尾部顶层百分比位置（1-2 个，如 'red 0%' / 'red 0% 50%'） */
function peelStopPositions(raw: string): { body: string; pos: number | null } {
  const s = raw.trim()
  const lastParen = s.lastIndexOf(')')
  const start = lastParen >= 0 ? lastParen + 1 : 0
  const tail = s.slice(start)
  const tokens = tail === '' ? [] : tail.trim().split(/\s+/)
  // 从尾部收拢百分比 token（非百分比即 stop 结束）
  const posPcts: string[] = []
  for (let k = tokens.length - 1; k >= 0; k--) {
    if (!/^-?\d*\.?\d+%$/.test(tokens[k]!)) break
    posPcts.unshift(tokens[k]!)
  }
  const keep = tokens.slice(0, tokens.length - posPcts.length)
  const body = (s.slice(0, start) + (keep.length ? ' ' + keep.join(' ') : '')).trim()
  return {
    body,
    pos: posPcts[0] ? clamp01(parseFloat(posPcts[0]!) / 100) : null,
  }
}

/** 首个 token 是否为方向声明（90deg / to right / 0.25turn 等） */
function isDirectionToken(token: string): boolean {
  const t = token.trim()
  if (/^to\s+/i.test(t)) return true
  return /^-?\d*\.?\d+(deg|grad|rad|turn)$/i.test(t)
}

/** 缺省 stop 位置按 CSS 规则补齐：首/尾缺失 → 0/1，中间 run 在邻接位置间均分 */
function fillDefaultPositions(stops: Array<{ pos: number | null }>): void {
  const n = stops.length
  if (n === 0) return
  if (stops[0]!.pos === null) stops[0]!.pos = 0
  if (stops[n - 1]!.pos === null) stops[n - 1]!.pos = 1
  let i = 0
  while (i < n) {
    if (stops[i]!.pos !== null) {
      i++
      continue
    }
    let j = i
    while (j < n && stops[j]!.pos === null) j++
    const left = i > 0 ? stops[i - 1]!.pos! : 0
    const right = j < n ? stops[j]!.pos! : 1
    const count = j - i
    for (let k = 0; k < count; k++) {
      stops[i + k]!.pos = left + ((right - left) * (k + 1)) / (count + 1)
    }
    i = j
  }
}

/**
 * 解析 CSS linear-gradient 串 → 有序 GradientStop[]。
 * 兼容 90deg / 方向词 / 缺省位置 / 单双位置 stop；颜色宽容（parseColor 同款）。
 * 仅支持线性渐变（radial/conic/repeating 返回 null），解析失败返回 null（调用方保持原值）。
 */
export function parseGradient(input: string): GradientStop[] | null {
  const t = input.trim()
  if (!/^linear-gradient\(/i.test(t) || !t.endsWith(')')) return null
  const body = t.slice('linear-gradient('.length, -1).trim()
  if (!body) return null
  let segments = splitTopLevel(body)
  if (segments.length === 0) return null
  // 方向 token（首个，非 stop）跳过
  if (segments.length > 1 && isDirectionToken(segments[0]!.trim())) segments = segments.slice(1)
  if (segments.length === 0) return null
  const raw: Array<{ color: RGBA; pos: number | null }> = []
  for (const seg of segments) {
    const { body: colorBody, pos } = peelStopPositions(seg)
    if (!colorBody) return null
    const color = parseColor(colorBody)
    if (!color) return null
    raw.push({ color, pos })
  }
  fillDefaultPositions(raw)
  return raw
    .map((r) => ({ pos: r.pos!, color: r.color }))
    .sort((a, b) => a.pos - b.pos)
}

/** 0..1 → 百分比展示（两位内去尾零） */
export function formatPosPct(pos: number): string {
  const pct = clamp01(pos) * 100
  const s = Number(pct.toFixed(2)).toString()
  return `${s}%`
}

/** stops → 规范 `linear-gradient(90deg, ...)` 串（颜色按 opts 透传 color-format/uppercase/alpha） */
export function formatGradient(stops: GradientStop[], opts: FormatOptions = {}): string {
  const parts = stops.map((s) => `${formatColor(s.color, opts)} ${formatPosPct(s.pos)}`)
  return `linear-gradient(90deg, ${parts.join(', ')})`
}

/** 在 pos 处取渐变插值色（线性夹取端部；相邻 stop 间按位置线性插值） */
export function gradientAt(stops: GradientStop[], pos: number): RGBA {
  if (stops.length === 0) return { r: 0, g: 0, b: 0, a: 1 }
  if (stops.length === 1) return { ...stops[0]!.color }
  const p = clamp01(pos)
  if (p <= stops[0]!.pos) return { ...stops[0]!.color }
  const last = stops[stops.length - 1]!
  if (p >= last.pos) return { ...last.color }
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!
    const b = stops[i + 1]!
    if (p >= a.pos && p <= b.pos) {
      const span = b.pos - a.pos
      const k = span <= 0 ? 0 : (p - a.pos) / span
      const lerp = (x: number, y: number): number => x + (y - x) * k
      return {
        r: lerp(a.color.r, b.color.r),
        g: lerp(a.color.g, b.color.g),
        b: lerp(a.color.b, b.color.b),
        a: lerp(a.color.a, b.color.a),
      }
    }
  }
  return { ...last.color }
}

/** 新增 stop（按 pos 有序插入；越界钳 0..1） */
export function insertStop(stops: GradientStop[], pos: number, color: RGBA): GradientStop[] {
  const next = [
    ...stops.map((s) => ({ ...s, color: { ...s.color } })),
    { pos: clamp01(pos), color: { ...color } },
  ]
  next.sort((a, b) => a.pos - b.pos)
  return next
}

/** 移除指定索引 stop（越界/空列表返回副本） */
export function removeStopAt(stops: GradientStop[], index: number): GradientStop[] {
  if (index < 0 || index >= stops.length) return [...stops]
  return stops
    .filter((_, i) => i !== index)
    .map((s) => ({ ...s, color: { ...s.color } }))
}

/** 移动 stop：夹到相邻 stop 之间（保序不越邻居），pos 钳 0..1 */
export function moveStop(stops: GradientStop[], index: number, pos: number): GradientStop[] {
  if (index < 0 || index >= stops.length) return [...stops]
  const lower = index > 0 ? stops[index - 1]!.pos : 0
  const upper = index < stops.length - 1 ? stops[index + 1]!.pos : 1
  const clamped = Math.min(Math.max(clamp01(pos), lower), upper)
  return stops.map((s, i) => ({
    pos: i === index ? clamped : s.pos,
    color: { ...s.color },
  }))
}
