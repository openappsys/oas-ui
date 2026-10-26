import { OASElement } from '@oas-ui/core'
import { parseJsonArray } from '../../shared/json-array.js'

/** 视为"贴底"的滚动剩余距离阈值（px），小于等于该值判定用户停在底部 */
const AUTO_SCROLL_THRESHOLD = 8

/** 级别别名归一：宿主给的宽松级别名 → 四个受支持档位（空串 = 不着色） */
const LEVEL_ALIASES: Record<string, string> = {
  info: 'info',
  notice: 'info',
  debug: 'info',
  success: 'success',
  ok: 'success',
  warn: 'warning',
  warning: 'warning',
  error: 'error',
  fatal: 'error',
  critical: 'error',
}

/** 高亮条目：字符串 = 字面关键词；对象 = { text } 字面或 { pattern, flags } 正则 */
type HighlightRule = RegExp

/** 转义正则元字符，字面关键词安全匹配 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/* ===== ANSI SGR 解析（opt-in `ansi` 属性） ===== */

/** ANSI 颜色：class = 16 色板（CSS class + light-dark() 变量）；rgb = 256 色/truecolor（inline style） */
interface AnsiColor {
  kind: 'class' | 'rgb'
  /** class：色板名（如 `red` / `bright-cyan`）；rgb：css 颜色串（如 `rgb(0, 175, 255)`） */
  value: string
}

/** SGR 状态快照：fg/bg 为 null 表示继承（行 levels 语义色 / 宿主文字色继续生效） */
interface AnsiState {
  fg: AnsiColor | null
  bg: AnsiColor | null
  bold: boolean
  dim: boolean
  italic: boolean
  underline: boolean
  inverse: boolean
}

/** 渲染片段：行文本切片 + 当时 SGR 状态 */
interface AnsiSegment extends AnsiState {
  text: string
}

/**
 * 转义序列整体匹配（匹配到的全部从显示文本剔除）：
 * - CSI：`ESC [` 参数字节(0-?) + 中间字节(空格-/) + 终止字节(@-~)，SGR 即终止字节 `m`；半截 CSI 遇下一 ESC 时先吃掉当前段
 * - OSC：`ESC ]` 到 BEL（\x07）或 ST（`ESC \`），未终止吃满到行尾；若遇下一 ESC 则先吃掉当前 OSC，保留下一序列继续解析
 * - 字符串型 DCS/APC/PM（`ESC P`/`^`/`_`）：到 ST 或行尾；遇下一 ESC 同样先吃掉当前段
 * - 其余单字符 ESC 序列（ESC @ 到 ESC _）
 */
const ANSI_SEQ_RE =
  /\x1b\[([0-?]*)([ -/]*)([@-~])|\x1b\[[0-?]*[ -/]*$|\x1b\[[0-?]*[ -/]*(?=\x1b)|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\|$)|\x1b\][^\x07\x1b]*(?=\x1b)|\x1b[P^_][^\x1b]*(?:\x1b\\|$)|\x1b[P^_][^\x1b]*(?=\x1b)|\x1b[()#%][0-9A-Za-z@-_]|\x1b[78=>]|\x1b[@-_]|\x1b|[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g

/** 16 色板名：30-37/40-47 基本色 + 90-97/100-107 同名亮色（bright- 前缀） */
const ANSI_NAMES = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'] as const

/** ANSI 16 色板 CSS 规则：前景走主题可读色板，背景走标准 ANSI 固定色（避免浅色主题背景被映射成灰） */
const ANSI_COLOR_CSS = ANSI_NAMES.flatMap((n) => [
  `.ansi-fg-${n} { color: var(--ansi-${n}); }`,
  `.ansi-bg-${n} { background-color: var(--ansi-bg-${n}); }`,
  `.ansi-fg-bright-${n} { color: var(--ansi-bright-${n}); }`,
  `.ansi-bg-bright-${n} { background-color: var(--ansi-bg-bright-${n}); }`,
]).join('\n')

function freshAnsiState(): AnsiState {
  return { fg: null, bg: null, bold: false, dim: false, italic: false, underline: false, inverse: false }
}

function resetAnsiState(s: AnsiState): void {
  s.fg = null
  s.bg = null
  s.bold = false
  s.dim = false
  s.italic = false
  s.underline = false
  s.inverse = false
}

function segKey(s: AnsiState): string {
  const c = (v: AnsiColor | null): string => (v ? `${v.kind}:${v.value}` : '-')
  return `${c(s.fg)}|${c(s.bg)}|${s.bold ? 1 : 0}${s.dim ? 1 : 0}${s.italic ? 1 : 0}${s.underline ? 1 : 0}${
    s.inverse ? 1 : 0
  }`
}

function validChannel(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 255
}

/** 256 色索引 → 颜色：0-15 复用 16 色板 class；16-231 为 6×6×6 立方；232-255 灰阶 */
function palette256(idx: number): AnsiColor {
  if (idx < 16) {
    return { kind: 'class', value: `${idx >= 8 ? 'bright-' : ''}${ANSI_NAMES[idx % 8]}` }
  }
  if (idx < 232) {
    const n = idx - 16
    const lv = [0, 95, 135, 175, 215, 255]
    return { kind: 'rgb', value: `rgb(${lv[Math.floor(n / 36)]}, ${lv[Math.floor(n / 6) % 6]}, ${lv[n % 6]})` }
  }
  const v = 8 + (idx - 232) * 10
  return { kind: 'rgb', value: `rgb(${v}, ${v}, ${v})` }
}

/** 对一段 SGR 参数串做状态迁移；未识别/非法参数忽略，不影响后续文本与参数 */
function applySgr(raw: string, state: AnsiState): void {
  if (raw.length > 256) return // 防超长参数串
  const parts = raw === '' ? ['0'] : raw.split(';')
  for (let i = 0; i < parts.length; i++) {
    const n = Number(parts[i])
    if (!Number.isInteger(n)) continue
    if (n === 0) resetAnsiState(state)
    else if (n === 1) state.bold = true
    else if (n === 2) state.dim = true
    else if (n === 3) state.italic = true
    else if (n === 4) state.underline = true
    else if (n === 7) state.inverse = true
    else if (n === 22) {
      state.bold = false
      state.dim = false
    } else if (n === 23) state.italic = false
    else if (n === 24) state.underline = false
    else if (n === 27) state.inverse = false
    else if (n >= 30 && n <= 37) state.fg = { kind: 'class', value: ANSI_NAMES[n - 30]! }
    else if (n === 39) state.fg = null
    else if (n >= 40 && n <= 47) state.bg = { kind: 'class', value: ANSI_NAMES[n - 40]! }
    else if (n === 49) state.bg = null
    else if (n >= 90 && n <= 97) state.fg = { kind: 'class', value: `bright-${ANSI_NAMES[n - 90]!}` }
    else if (n >= 100 && n <= 107) state.bg = { kind: 'class', value: `bright-${ANSI_NAMES[n - 100]!}` }
    else if (n === 38 || n === 48) {
      // 扩展色：38/48 前景/背景 + 5;n（256 色）或 2;r;g;b（truecolor）；参数不完整/非法整段忽略
      const isFg = n === 38
      const mode = Number(parts[i + 1])
      if (mode === 5) {
        const idx = Number(parts[i + 2])
        if (validChannel(idx)) {
          const c = palette256(idx)
          if (isFg) state.fg = c
          else state.bg = c
        }
        i += 2
      } else if (mode === 2) {
        const r = Number(parts[i + 2])
        const g = Number(parts[i + 3])
        const b = Number(parts[i + 4])
        if (validChannel(r) && validChannel(g) && validChannel(b)) {
          const c: AnsiColor = { kind: 'rgb', value: `rgb(${r}, ${g}, ${b})` }
          if (isFg) state.fg = c
          else state.bg = c
        }
        i += 4
      }
      // 其它 mode：忽略该参数（i 仅步进 1），后续参数继续按普通 SGR 处理
    }
  }
}

/** 单行 ANSI 解析：剔除全部转义序列，按 SGR 状态把文本切片段（相邻同态合并，控制 span 数量） */
function parseAnsiLine(raw: string): AnsiSegment[] {
  const out: AnsiSegment[] = []
  const state = freshAnsiState()
  let key = segKey(state)
  let cursor = 0
  ANSI_SEQ_RE.lastIndex = 0
  let m: RegExpExecArray | null
  const push = (text: string): void => {
    if (!text) return
    const k = segKey(state)
    const prev = out[out.length - 1]
    if (prev && k === key) prev.text += text
    else out.push({ ...state, text })
    key = k
  }
  while ((m = ANSI_SEQ_RE.exec(raw)) !== null) {
    if (m.index > cursor) push(raw.slice(cursor, m.index))
    if (m[3] === 'm') applySgr(m[1] ?? '', state)
    cursor = m.index + m[0].length
  }
  if (cursor < raw.length) push(raw.slice(cursor))
  return out
}

/** 在可见文本上求高亮命中区间（排序 + 合并重叠，避免重复 mark） */
function matchRanges(text: string, rules: HighlightRule[]): Array<[number, number]> {
  const spans: Array<[number, number]> = []
  for (const re of rules) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      spans.push([m.index, m.index + m[0].length])
      if (m[0].length === 0) re.lastIndex++
    }
  }
  if (!spans.length) return []
  spans.sort((a, b) => a[0] - b[0] || b[1] - a[1])
  const merged: Array<[number, number]> = []
  for (const [start, end] of spans) {
    if (end <= start) continue
    const last = merged[merged.length - 1]
    if (last && start <= last[1]) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }
  return merged
}

/** 片段是否有任何 ANSI 样式（无样式片段直接挂 line，保持旧节点结构） */
function hasAnsiStyle(s: AnsiState): boolean {
  return Boolean(s.fg || s.bg || s.bold || s.dim || s.italic || s.underline || s.inverse)
}

/** 剔除 ANSI 转义序列（搜索/过滤使用可见文本，避免转义码影响命中） */
function stripAnsi(text: string): string {
  ANSI_SEQ_RE.lastIndex = 0
  return text.replace(ANSI_SEQ_RE, '')
}

/** 渲染视角下的有效前景（inverse 交换后）：决定 mark 是否继承外层 ANSI 前景色 */
function hasEffectiveFg(s: AnsiState): boolean {
  return s.inverse ? Boolean(s.bg) : Boolean(s.fg)
}

/** 16 色标准终端 RGB（用于「彩色背景 + 16 色前景」的对比度兜底；与主题色板解耦） */
const ANSI_RGB: Record<string, string> = {
  black: '#000000',
  red: '#cd3131',
  green: '#0ba66b',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#109ec1',
  white: '#e5e5e5',
  'bright-black': '#666666',
  'bright-red': '#f14c4c',
  'bright-green': '#23d18b',
  'bright-yellow': '#f5f543',
  'bright-blue': '#3b8eea',
  'bright-magenta': '#c969c9',
  'bright-cyan': '#2299b6',
  'bright-white': '#ffffff',
}

/** 16 色背景 CSS（与 ANSI_RGB 同源，避免前景判定与渲染色漂移） */
const ANSI_BG_CSS = Object.entries(ANSI_RGB)
  .map(([name, value]) => `  --ansi-bg-${name}: ${value};`)
  .join('\n')

function parseRgbColor(value: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(value)
  if (hex) {
    const n = Number.parseInt(hex[1]!, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const rgb = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(value)
  if (!rgb) return null
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
}

function luminanceRgb(rgb: [number, number, number]): number {
  const channels = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

function rgbString(rgb: [number, number, number]): string {
  return `rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`
}

/** 感知对比度（与主题/无障碍门禁同一公开公式，量级 0-100+） */
function perceptualScore(fg: [number, number, number], bg: [number, number, number]): number {
  const y = (rgb: [number, number, number]): number =>
    0.2126729 * (rgb[0] / 255) ** 2.4 + 0.7151522 * (rgb[1] / 255) ** 2.4 + 0.072175 * (rgb[2] / 255) ** 2.4
  const clamp = (v: number): number => (v > 0.022 ? v : v + (0.022 - v) ** 1.414)
  const tY = clamp(y(fg))
  const bY = clamp(y(bg))
  if (Math.abs(bY - tY) < 0.0005) return 0
  if (bY > tY) {
    const raw = (bY ** 0.56 - tY ** 0.57) * 1.14
    return Math.abs(raw < 0.1 ? 0 : raw - 0.027) * 100
  }
  const raw = (bY ** 0.65 - tY ** 0.62) * 1.14
  return Math.abs(raw > -0.1 ? 0 : raw + 0.027) * 100
}

/** 把任意 RGB 调整为在给定底色上感知对比度 ≥62 的可读色（保持色相，向黑/白混合） */
function adjustForBackground(
  rgb: [number, number, number],
  background: [number, number, number],
): [number, number, number] {
  const lightBg = luminanceRgb(background) > 0.5
  let out = [...rgb] as [number, number, number]
  for (let i = 0; i < 40 && perceptualScore(out, background) < 62; i++) {
    out = out.map((v) => (lightBg ? v * 0.86 : v + (255 - v) * 0.14)) as [number, number, number]
  }
  return out
}

/**
 * 256 / truecolor 前景：ANSI 允许任意颜色，浅色主题下 #00afff 这类亮色会低于感知对比度门禁。
 * 用 `light-dark(浅色主题校正值, 暗色主题校正值)` 交给浏览器按 color-scheme 切换；
 * 校正值走 CSS 自定义属性，避免不支持 light-dark() 的解析环境丢弃整条 style。
 */
function themedRgbColor(value: string): { light: string; dark: string } | null {
  const rgb = parseRgbColor(value)
  if (!rgb) return null
  const light = adjustForBackground(rgb, [255, 255, 255])
  const dark = adjustForBackground(rgb, [24, 24, 27])
  return { light: rgbString(light), dark: rgbString(dark) }
}

/** 彩色背景上的前景兜底：显式前景达标则保留，否则自动选黑/白中对比更高者 */
function readableOnBackground(fgRgb: [number, number, number] | null, bgRgb: [number, number, number]): string {
  if (fgRgb && perceptualScore(fgRgb, bgRgb) >= 62) return rgbString(fgRgb)
  const dark: [number, number, number] = [0, 0, 0]
  const light: [number, number, number] = [255, 255, 255]
  return rgbString(perceptualScore(dark, bgRgb) >= perceptualScore(light, bgRgb) ? dark : light)
}

/** 16 色背景上的前景兜底：显式前景按标准 ANSI RGB 渲染；不达标或未给前景时自动选黑/白 */
function coloredBackgroundForeground(fg: AnsiColor | null, bg: AnsiColor): string | null {
  if (bg.kind !== 'class') return null
  const bgRgb = parseRgbColor(ANSI_RGB[bg.value] ?? '')
  if (!bgRgb) return null
  const fgRgb = fg ? parseRgbColor(fg.kind === 'class' ? (ANSI_RGB[fg.value] ?? '') : fg.value) : null
  return readableOnBackground(fgRgb, bgRgb)
}

/** 把片段状态落到 span 元素（class 走 16 色板，rgb 走 inline style）；inverse 交换前景/背景 */
function applyAnsiSpan(el: HTMLElement, seg: AnsiState): void {
  let fg = seg.fg
  let bg = seg.bg
  if (seg.inverse) {
    const prevFg = fg
    fg = bg
    bg = prevFg
  }
  const classes: string[] = []
  if (seg.bold) classes.push('ansi-bold')
  if (seg.dim) classes.push('ansi-dim')
  if (seg.italic) classes.push('ansi-italic')
  if (seg.underline) classes.push('ansi-underline')
  if (fg) {
    if (fg.kind === 'class') classes.push(`ansi-fg-${fg.value}`)
    else {
      const themed = themedRgbColor(fg.value)
      if (themed) {
        classes.push('ansi-rgb-fg')
        el.style.setProperty('--ansi-fg-light', themed.light)
        el.style.setProperty('--ansi-fg-dark', themed.dark)
      }
    }
  }
  if (bg) {
    if (bg.kind === 'class') {
      classes.push(`ansi-bg-${bg.value}`)
      // 16 色背景：显式前景按标准 ANSI 色渲染；对比不足/未给前景时自动黑/白，避免彩色底不可读
      const safeFg = coloredBackgroundForeground(fg, bg)
      if (safeFg) el.style.color = safeFg
    } else {
      el.style.backgroundColor = bg.value
      // 任意背景色：显式前景达标则保留，否则按感知对比度选黑/白
      const bgRgb = parseRgbColor(bg.value)
      if (bgRgb) {
        // 前景可能是 16 色 class 或 truecolor；两者都按实际 RGB 判定是否达标
        const fgRgb = fg ? parseRgbColor(fg.kind === 'class' ? (ANSI_RGB[fg.value] ?? '') : fg.value) : null
        el.style.color = readableOnBackground(fgRgb, bgRgb)
      }
    }
  }
  // inverse 但原本无任何色可交换：token 反白（亮底暗字/暗底亮字随主题翻转）
  if (seg.inverse && !fg && !bg) classes.push('ansi-inverse')
  if (classes.length) el.className = classes.join(' ')
}

/**
 * oas-log —— 等宽字体的日志流。
 *
 * 属性（kebab-case）：
 * - `lines`（property，`string[]`）：日志行数据（property 通道优先；也支持 `lines` 属性传 JSON 字符串）
 * - `auto-scroll`：追加后自动滚动到底，默认 `true`；仅当用户本就停靠在底部（未上翻）时滚动
 * - `line-number`：显示左侧行号栏
 * - `empty-text`：空态文案（覆盖 locale 默认值）
 * - `loading`：加载浮层（首屏拉取/历史加载遮罩）
 * - `offset-top` / `offset-bottom`：上/下分段加载触发阈值（px，默认 0）
 * - `levels`：JSON 字符串数组，与 lines 按索引对齐的行级别
 *   （info/success/warning/error，含 warn/fatal 等别名），映射 token 语义色
 * - `highlight`：JSON 高亮条目数组（字面关键词字符串，或 { text } / { pattern, flags } 对象）
 * - `keyword`：搜索过滤关键字（大小写不敏感）。非空时只显示命中行，命中片段包 mark
 *   （与 highlight 通道同一视觉体系）；清空/移除恢复全部行。过滤不改宿主数据，
 *   行号与 levels 仍按原始 data 索引对齐
 * - `ansi`：解析并渲染每行的 ANSI SGR 转义序列（布尔，默认关）。支持前景/背景 16 色
 *   （30-37 / 90-97 / 40-47 / 100-107，light-dark() 色板双主题）、256 色（38;5;n / 48;5;n）
 *   与 truecolor（38;2;r;g;b / 48;2;r;g;b，inline style），及 bold/dim/italic/underline/inverse
 *   与 reset（0）与逐项关闭（22/23/24/27）；非 SGR 的 CSI/OSC/字符串型控制序列一并剔除防泄漏。
 *   ANSI 前景色优先于行 levels 语义色；keyword/highlight 命中 mark 仍生效且继承 ANSI 前景色。
 *   过滤（keyword）按可见文本匹配（开启 ansi 时先剥离转义序列）
 *
 * 事件：
 * - `oas-require-more`：滚动进入顶部/底部阈值区时派发（detail `{ from: 'top' | 'bottom' }`），
 *   边缘触发——停留在区域内不连发，离开区域后复位
 * - `oas-search`：keyword 或数据变化时派发（detail `{ keyword, matched, total }`，
 *   matched=当前命中行数、total=总行数；过滤窗口为当前已加载行）
 *
 * 方法：
 * - `scrollTo('top' | 'bottom' | number)`：滚动视口到顶/底/指定像素位置
 *
 * 实现要点：lines 更新按 key（行内容）对齐 reconcile——公共前缀/后缀行复用已有节点，
 * 支持尾部追加、顶部插入历史行与中间修改；滚动监听实时维护"是否贴底"状态，
 * 顶部插入时补偿 scrollTop 保持阅读位置；断开连接时经 onCleanup 清理。
 */
const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  /* 日志流跟随外层字号；定制开口：--oas-log-font（行内文本按 em 比例跟随） */
  font-size: var(--oas-log-font, inherit);
}
:host([hidden]) {
  display: none;
}
[hidden] {
  display: none !important;
}
.viewport {
  position: relative;
  height: 100%;
  overflow: auto;
  overscroll-behavior: contain;
  box-sizing: border-box;
}
.log {
  box-sizing: border-box;
  min-height: 100%;
}
/* 等宽字体：日志流逐行对齐 */
.row {
  display: flex;
  align-items: baseline;
  padding-inline: var(--oas-space-3);
  line-height: 1.6;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  /* 等宽行按比例跟随 host（原 sm/md ≈ 13/14） */
  font-size: 0.929em;
}
.row:hover {
  background: var(--oas-color-bg-hover);
}
.gutter {
  flex-shrink: 0;
  min-width: 2.5em;
  padding-inline-end: var(--oas-space-3);
  text-align: end;
  color: var(--oas-color-text-secondary);
  user-select: none;
}
.log[data-line-number='false'] .gutter {
  display: none;
}
.line {
  min-width: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
/* 行级高亮命中片段（token 语义底色，暗色自动跟随） */
.mark {
  background: var(--oas-log-mark-bg, color-mix(in srgb, var(--oas-color-warning) 18%, transparent));
  color: var(--oas-log-mark-color, var(--oas-color-warning-text));
  border-radius: 2px;
  padding: 0 1px;
}
/* 级别着色通道：levels 字段 → token 语义色（暗色自动换色） */
.row[data-level='info'] .line {
  color: var(--oas-color-info-text);
}
.row[data-level='success'] .line {
  color: var(--oas-color-success-text);
}
.row[data-level='warning'] .line {
  color: var(--oas-color-warning-text);
}
.row[data-level='error'] .line {
  color: var(--oas-color-danger-text);
}
/* ===== ANSI 着色（opt-in ansi 属性）=====
   色板以 light-dark() 双主题取值：color-scheme 随宿主继承（@oas-ui/theme 的
   [data-theme="dark"] 已设置 color-scheme: dark）；宿主只挂暗色标记未带 color-scheme 时
   由 :host-context 保险兜底。不支持 light-dark() 的浏览器整条声明无效 → 退化为继承色。 */
:host-context([data-theme='dark']),
:host-context(html.dark) {
  color-scheme: dark;
}
/* 色板挂在 :host：宿主可在 oas-log 元素上直接覆盖 --ansi-* 变量（文档树声明优先于 :host） */
:host {
  --ansi-black: light-dark(#43484f, #b2bac5);
  --ansi-red: light-dark(#c22f2f, #ffa1a1);
  --ansi-green: light-dark(#177a37, #7ad383);
  --ansi-yellow: light-dark(#96690a, #ffd066);
  --ansi-blue: light-dark(#0f5cb8, #88bcff);
  --ansi-magenta: light-dark(#a11da1, #e3a4ff);
  --ansi-cyan: light-dark(#0d7a8a, #74ded1);
  --ansi-white: light-dark(#5c616c, #d8dce4);
  --ansi-bright-black: light-dark(#676d7a, #d0d6de);
  --ansi-bright-red: light-dark(#e04b44, #ffa09d);
  --ansi-bright-green: light-dark(#2c9548, #a5ecab);
  --ansi-bright-yellow: light-dark(#b07c11, #ffe099);
  --ansi-bright-blue: light-dark(#2f7fe0, #b0d4ff);
  --ansi-bright-magenta: light-dark(#c23cc2, #f2c4ff);
  --ansi-bright-cyan: light-dark(#2596a8, #a2ece2);
  --ansi-bright-white: light-dark(#7e8490, #f2f4f8);
  /* 背景色为 ANSI 标准色相按感知对比度微调明度（保证黑/白前景至少一档 ≥60） */
${ANSI_BG_CSS}
}
${ANSI_COLOR_CSS}
/* 256 / truecolor 前景：按 color-scheme 在浅/暗主题选用对比度校正后的颜色 */
.ansi-rgb-fg {
  color: light-dark(var(--ansi-fg-light, inherit), var(--ansi-fg-dark, inherit));
}
.ansi-bold {
  font-weight: 600;
}
.ansi-dim {
  opacity: 0.72;
}
.ansi-italic {
  font-style: italic;
}
.ansi-underline {
  text-decoration: underline;
  text-underline-offset: 2px;
}
/* inverse 且无色可交换：token 反白（随主题翻转） */
.ansi-inverse {
  color: var(--oas-color-bg);
  background-color: var(--oas-color-text-primary);
}
/* ANSI 前景色存在时 mark 不覆盖片段颜色（继承外层 ANSI 色） */
.mark.ansi-colored {
  color: inherit;
}
/* 空态占位 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-6);
  color: var(--oas-color-text-secondary);
  /* 空态文本按比例跟随 host（原 sm/md ≈ 13/14） */
  font-size: 0.929em;
}
.empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--oas-color-bg-hover);
  border: 1px dashed var(--oas-color-border-strong);
}
/* 加载浮层（首屏拉取/上翻加载历史时遮罩视口） */
.loading {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-2);
  background: var(--oas-log-loading-mask, color-mix(in srgb, var(--oas-color-bg) 65%, transparent));
  color: var(--oas-color-text-secondary);
  font-size: 0.929em;
}
.spinner {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border: 2px solid var(--oas-color-bg-hover);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-log-spin 0.8s linear infinite;
}
@keyframes oas-log-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
`

export class OASLog extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'lines',
      'auto-scroll',
      'line-number',
      'empty-text',
      'loading',
      'offset-top',
      'offset-bottom',
      'levels',
      'highlight',
      'keyword',
      'ansi',
    ]
  }

  private data: string[] = []
  private linesFromProperty = false
  private viewport: HTMLElement | null = null
  private logEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  private loadingEl: HTMLElement | null = null
  /** 用户是否停靠在底部（未上翻）——由滚动事件实时维护 */
  private stickToBottom = true
  /** 分段加载边缘触发状态：已进入对应阈值区则置位，离开后复位 */
  private topZone = false
  private bottomZone = false
  /** 组件自身写入 scrollTop 时置位，避免程序化滚动误触发分段加载事件 */
  private programmaticScroll = false
  /** 上次 reconcile 已应用的高亮/级别通道签名，变化时重刷已有行 */
  private contentSig = ''
  /** 上次 reconcile 后每行对应的 data 索引（过滤/插入导致行号漂移时重算） */
  private renderedViewMap: number[] = []
  /** 渲染窗口：keyword 非空时为命中行子集（过滤视图），否则与 data 一致 */
  private view: string[] = []
  /** 视口行索引 → data 索引映射：过滤后行号/levels 仍对齐原始数据 */
  private viewMap: number[] = []
  /** 上次 oas-search 派发的搜索签名（keyword + 数据内容）：变化才重复派发 */
  private searchSig = ''
  /** 每行原始文本（含 ANSI 转义码）：ansi 开启时 line.textContent 已剔除转义码，
   *  reconcile 的 key 对齐改用原始文本比较，避免显示文本相同的不同行被误判复用 */
  private rawLineTexts = new WeakMap<HTMLElement, string>()

  get lines(): string[] {
    return this.data.slice()
  }

  set lines(value: string[]) {
    this.data = parseJsonArray<string>(value as unknown).filter((l): l is string => typeof l === 'string')
    this.linesFromProperty = true
    if (this.isConnected) this.update()
  }

  /**
   * 滚动视口：`'top'` 到顶、`'bottom'` 到底、数字为像素 scrollTop；
   * 也接受 `{ top: number }` / `{ position: 'top' | 'bottom' }` 对象形态（与原生
   * Element.scrollTo 的 ScrollToOptions 并集，签名兼容基类）。
   * 非法目标忽略；滚动后重算贴底状态。
   */
  override scrollTo(target?: (ScrollToOptions & { position?: 'top' | 'bottom' }) | 'top' | 'bottom' | number): void {
    const vp = this.viewport
    if (!vp) return
    let top: number | null = null
    if (target === 'top') top = 0
    else if (target === 'bottom') top = vp.scrollHeight
    else if (typeof target === 'number') top = target
    else if (target && typeof target === 'object') {
      if (typeof target.top === 'number') top = target.top
      else if (target.position === 'top') top = 0
      else if (target.position === 'bottom') top = vp.scrollHeight
    }
    if (top == null) return
    this.setScrollTop(vp, Math.max(0, top))
    this.stickToBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight <= AUTO_SCROLL_THRESHOLD
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="viewport" part="viewport" tabindex="0">
        <div class="log" part="log" role="log" aria-live="polite" hidden></div>
        <div class="empty" part="empty" hidden>
          <div class="empty-icon" aria-hidden="true"></div>
          <span part="empty-text"></span>
        </div>
        <div class="loading" part="loading" hidden>
          <span class="spinner" aria-hidden="true"></span>
          <span part="loading-text"></span>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.viewport = this.shadow.querySelector('.viewport')
    this.logEl = this.shadow.querySelector('.log')
    this.emptyEl = this.shadow.querySelector('.empty')
    this.loadingEl = this.shadow.querySelector('.loading')
    this.viewport?.addEventListener('scroll', this.handleScroll, { passive: true })
    this.onCleanup(() => {
      this.viewport?.removeEventListener('scroll', this.handleScroll)
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（视口/日志容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.viewport') || !this.shadow.querySelector('.log')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseLines()
    this.computeView()
    // 在改动 DOM 前记录停靠状态与高度：追加/插入后 scrollHeight 已变大，事后无法判断原状态
    const wasStuck = this.stickToBottom
    const prevHeight = this.viewport?.scrollHeight ?? 0
    const prepended = this.reconcileRows()
    this.syncEmpty()
    this.syncSearch()
    this.syncLineNumber()
    this.syncLoading()
    const vp = this.viewport
    if (!vp) return
    if (prepended) {
      // 顶部插入历史行：下方内容整体下移，补偿 scrollTop 保持用户阅读位置
      this.setScrollTop(vp, vp.scrollTop + (vp.scrollHeight - prevHeight))
    }
    if (this.autoScrollOn() && wasStuck) {
      this.setScrollTop(vp, vp.scrollHeight)
    }
  }

  /** 程序化写入 scrollTop：浏览器对 scrollTop 赋值同步派发 scroll 事件，此处抑制分段加载误触发 */
  private setScrollTop(vp: HTMLElement, value: number): void {
    this.programmaticScroll = true
    vp.scrollTop = value
    this.programmaticScroll = false
  }

  private autoScrollOn(): boolean {
    return this.getAttr('auto-scroll', 'true') !== 'false'
  }

  private parseLines(): void {
    if (this.linesFromProperty) return
    const raw = this.getAttribute('lines')
    if (raw == null) return
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        this.data = parsed.filter((l): l is string => typeof l === 'string')
      }
    } catch {
      /* 非法 JSON 忽略，保持内部值 */
    }
  }

  /** 当前搜索关键字（trim 后；空串 = 不过滤） */
  private keywordOf(): string {
    return this.getAttr('keyword', '').trim()
  }

  /**
   * 计算渲染窗口：keyword 非空时过滤为命中行子集（大小写不敏感），否则全量。
   * 仅影响渲染，不改 this.data（宿主数据保持不变）；同时维护 viewMap 供
   * 行号/levels 回溯原始索引。过滤窗口为当前已加载行，与分段加载兼容。
   */
  private computeView(): void {
    const keyword = this.keywordOf()
    this.view = []
    this.viewMap = []
    if (!keyword) {
      this.view = this.data.slice()
      this.viewMap = this.data.map((_, i) => i)
      return
    }
    const re = new RegExp(escapeRegExp(keyword), 'i')
    const ansi = this.hasAttr('ansi')
    this.data.forEach((line, i) => {
      const text = ansi ? stripAnsi(line) : line
      if (re.test(text)) {
        this.view.push(line)
        this.viewMap.push(i)
      }
    })
  }

  /**
   * key 对齐的增量 reconcile：以行内容为 key 求最长公共前缀/后缀，
   * 前缀行原样复用、中间差异行重建、后缀行复用并重排行号/级别/高亮。
   * 支持尾部追加（热路径零重建）、顶部插入历史行（审计上翻）、中间修改。
   * reconcile 对象是过滤后的渲染窗口（this.view），keyword 变化等同一行内容
   * 子序列的变化由公共前缀/后缀对齐天然复用节点。
   * @returns 是否发生了顶部插入（调用方据此补偿 scrollTop）
   */
  private reconcileRows(): boolean {
    const logEl = this.logEl
    if (!logEl) return false
    const next = this.view
    const rules = this.contentRules()
    const rowEls = Array.from(logEl.children) as HTMLElement[]
    const prevCount = rowEls.length
    // 原始文本（含转义码）优先；无记录的旧节点（水合迁移等）回退显示文本
    const oldTexts = rowEls.map((r) => this.rawLineTexts.get(r) ?? r.querySelector('[part="line"]')?.textContent ?? '')

    let p = 0
    while (p < prevCount && p < next.length && oldTexts[p] === next[p]) p++
    let s = 0
    while (s < prevCount - p && s < next.length - p && oldTexts[prevCount - 1 - s] === next[next.length - 1 - s]) {
      s++
    }

    for (let i = prevCount - s - 1; i >= p; i--) rowEls[i]!.remove()
    const anchor = s > 0 ? rowEls[prevCount - s]! : null
    for (let i = p; i < next.length - s; i++) {
      logEl.insertBefore(this.createRow(i, rules), anchor)
    }

    // 后缀行索引已偏移，重排行号/级别/高亮；前缀行在通道签名或 data 索引映射变化时重刷
    const sigChanged = this.contentSig !== this.channelsSig()
    const common = Math.min(this.renderedViewMap.length, this.viewMap.length)
    const mapChanged = this.renderedViewMap.slice(0, common).some((v, i) => v !== this.viewMap[i])
    const rowsNow = Array.from(logEl.children) as HTMLElement[]
    for (let i = 0; i < rowsNow.length; i++) {
      if (i >= p && i < next.length - s) continue // 新建行已在 createRow 内同步
      if (i < p && !sigChanged && !mapChanged) continue
      this.syncRowMeta(rowsNow[i]!, i, rules)
    }
    this.contentSig = this.channelsSig()
    this.renderedViewMap = this.viewMap.slice()
    return p === 0 && s > 0 && prevCount > 0
  }

  private createRow(index: number, rules: HighlightRule[]): HTMLElement {
    const row = document.createElement('div')
    row.className = 'row'
    row.setAttribute('part', 'row')
    const gutter = document.createElement('div')
    gutter.className = 'gutter'
    gutter.setAttribute('part', 'line-number')
    const line = document.createElement('div')
    line.className = 'line'
    line.setAttribute('part', 'line')
    row.append(gutter, line)
    this.syncRowMeta(row, index, rules)
    return row
  }

  /** 同步单行派生态：行号文本（原始 data 行号）、级别语义色、高亮片段 */
  private syncRowMeta(row: HTMLElement, index: number, rules: HighlightRule[]): void {
    const dataIndex = this.viewMap[index] ?? index
    const gutter = row.querySelector<HTMLElement>('[part="line-number"]')
    if (gutter) gutter.textContent = String(dataIndex + 1)
    const level = this.levelOf(dataIndex)
    if (level) row.setAttribute('data-level', level)
    else row.removeAttribute('data-level')
    const line = row.querySelector<HTMLElement>('[part="line"]')
    const raw = this.view[index] ?? ''
    if (line) this.fillLine(line, raw, rules)
    this.rawLineTexts.set(row, raw)
  }

  /**
   * 行内容填充：无高亮规则且 ansi 关闭走 textContent（零开销热路径）；
   * 有规则拆分段落、命中片段包 mark（文本节点防注入）；ansi 开启时先按 SGR
   * 切片段渲染（转义码剔除），命中 mark 包在 ANSI 片段内层（继承其前景色）
   */
  private fillLine(lineEl: HTMLElement, text: string, rules: HighlightRule[]): void {
    lineEl.textContent = ''
    if (!this.hasAttr('ansi')) {
      if (!rules.length) {
        lineEl.textContent = text
        return
      }
      this.appendMarked(lineEl, text, rules, false)
      return
    }
    const segments = parseAnsiLine(text)
    // 高亮区间在「可见文本」上求，再映射回各 ANSI 片段：命中跨转义边界时不丢 mark
    const ranges = rules.length ? matchRanges(segments.map((s) => s.text).join(''), rules) : []
    let offset = 0
    for (const seg of segments) {
      const segStart = offset
      offset += seg.text.length
      const styled = hasAnsiStyle(seg)
      if (!styled && !ranges.length) {
        lineEl.append(document.createTextNode(seg.text))
        continue
      }
      // 有样式包 span（class/inline style 落在片段上）；无样式直接用 line 承载（与旧结构一致）
      const host = styled ? document.createElement('span') : lineEl
      if (styled) {
        applyAnsiSpan(host, seg)
        lineEl.append(host)
      }
      if (ranges.length) this.appendSegmentMarked(host, seg.text, segStart, ranges, hasEffectiveFg(seg))
      else host.append(document.createTextNode(seg.text))
    }
  }

  /** 命中 mark 元素（colored = ANSI 前景存在时继承片段色，不被 mark 默认色覆盖） */
  private createMark(text: string, colored: boolean): HTMLElement {
    const mark = document.createElement('span')
    mark.className = colored ? 'mark ansi-colored' : 'mark'
    mark.setAttribute('part', 'mark')
    mark.textContent = text
    return mark
  }

  /** 按可见文本坐标把单个 ANSI 片段切成「普通文本 / mark」并追加 */
  private appendSegmentMarked(
    host: HTMLElement,
    text: string,
    offset: number,
    ranges: Array<[number, number]>,
    colored: boolean,
  ): void {
    const segEnd = offset + text.length
    let cursor = offset
    for (const [start, end] of ranges) {
      const s = Math.max(start, offset)
      const e = Math.min(end, segEnd)
      if (e <= s) continue
      if (s > cursor) host.append(document.createTextNode(text.slice(cursor - offset, s - offset)))
      host.append(this.createMark(text.slice(s - offset, e - offset), colored))
      cursor = e
    }
    if (cursor < segEnd) host.append(document.createTextNode(text.slice(cursor - offset)))
  }

  /**
   * 按 rules 把 text 切分追加到 host：命中片段包 mark、其余为文本节点（防注入）。
   * colored = 该片段存在 ANSI 前景色 → mark 加 ansi-colored 继承外层色（不被 mark 默认色覆盖）
   */
  private appendMarked(host: HTMLElement, text: string, rules: HighlightRule[], colored: boolean): void {
    const ranges = matchRanges(text, rules)
    if (!ranges.length) {
      host.append(document.createTextNode(text))
      return
    }
    let cursor = 0
    for (const [start, end] of ranges) {
      if (start > cursor) host.append(document.createTextNode(text.slice(cursor, start)))
      host.append(this.createMark(text.slice(start, end), colored))
      cursor = end
    }
    if (cursor < text.length) host.append(document.createTextNode(text.slice(cursor)))
  }

  /** 行内容规则：highlight 通道 + keyword 命中高亮（keyword 字面转义，大小写不敏感，同 mark 视觉体系） */
  private contentRules(): HighlightRule[] {
    const rules = this.parseHighlight()
    const keyword = this.keywordOf()
    if (keyword) rules.push(new RegExp(escapeRegExp(keyword), 'gi'))
    return rules
  }

  /** 解析 highlight JSON：字符串条目按字面关键词，对象条目支持 text/pattern；非法条目/正则跳过 */
  private parseHighlight(): HighlightRule[] {
    const raw = this.getAttr('highlight', '').trim()
    if (!raw) return []
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return []
    }
    if (!Array.isArray(parsed)) return []
    const out: HighlightRule[] = []
    for (const item of parsed) {
      try {
        if (typeof item === 'string') {
          if (item) out.push(new RegExp(escapeRegExp(item), 'gi'))
          continue
        }
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>
          const src = typeof o.pattern === 'string' ? o.pattern : typeof o.text === 'string' ? escapeRegExp(o.text) : ''
          if (!src) continue
          const flags = typeof o.flags === 'string' && /^[dgimsuvy]*$/.test(o.flags) ? o.flags : 'gi'
          out.push(new RegExp(src, flags.includes('g') ? flags : `${flags}g`))
        }
      } catch {
        /* 非法正则跳过 */
      }
    }
    return out
  }

  /** 解析 levels JSON（与 lines 按索引对齐），归一为受支持档位 */
  private levelOf(index: number): string {
    const raw = this.getAttr('levels', '').trim()
    if (!raw) return ''
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return ''
      const lv = parsed[index]
      if (typeof lv !== 'string') return ''
      return LEVEL_ALIASES[lv.trim().toLowerCase()] ?? ''
    } catch {
      return ''
    }
  }

  /** 高亮/级别/搜索/ANSI 通道签名：判定是否需要重刷已有行的派生态（ansi 切换时全行重刷） */
  private channelsSig(): string {
    return `${this.hasAttr('ansi') ? 1 : 0}|${this.getAttr('highlight', '')}|${this.getAttr('levels', '')}|${this.getAttr('keyword', '')}`
  }

  private syncEmpty(): void {
    const keyword = this.keywordOf()
    const isEmpty = this.view.length === 0
    if (this.logEl) this.logEl.hidden = isEmpty
    if (this.emptyEl) this.emptyEl.hidden = !isEmpty
    const text = this.shadow.querySelector<HTMLElement>('[part="empty-text"]')
    if (!text) return
    // 数据非空但过滤无命中 → 「无匹配」空态；数据本空 → 常规空态文案
    const noMatch = Boolean(keyword) && this.data.length > 0
    text.textContent = noMatch ? this.t('log.no-match') : this.getAttr('empty-text', this.t('log.empty'))
  }

  /** 搜索过滤结果上报：keyword 或数据内容变化时派发（同状态去重，不连发） */
  private syncSearch(): void {
    const keyword = this.keywordOf()
    const sig = `${keyword}\n${this.data.join('\n')}`
    if (sig === this.searchSig) return
    this.searchSig = sig
    this.emit('search', { keyword, matched: this.view.length, total: this.data.length })
  }

  private syncLineNumber(): void {
    this.logEl?.setAttribute('data-line-number', String(this.hasAttr('line-number')))
  }

  /** loading 态：加载浮层显隐 + aria-busy 同步到 role=log 容器 */
  private syncLoading(): void {
    const loading = this.hasAttr('loading')
    if (this.loadingEl) {
      this.loadingEl.hidden = !loading
      const text = this.loadingEl.querySelector<HTMLElement>('[part="loading-text"]')
      if (text) text.textContent = this.t('loading.loading')
    }
    if (this.logEl) this.logEl.setAttribute('aria-busy', String(loading))
  }

  private offsetOf(name: string): number {
    const n = Number(this.getAttr(name, '0'))
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  private handleScroll = (): void => {
    if (this.programmaticScroll) return
    const vp = this.viewport
    if (!vp) return
    const remaining = vp.scrollHeight - vp.scrollTop - vp.clientHeight
    this.stickToBottom = remaining <= AUTO_SCROLL_THRESHOLD
    // 分段加载：进入顶/底阈值区边缘触发一次（停留不连发，离开复位）
    if (vp.scrollTop <= this.offsetOf('offset-top')) {
      if (!this.topZone) {
        this.topZone = true
        this.emit('require-more', { from: 'top' })
      }
    } else {
      this.topZone = false
    }
    if (remaining <= this.offsetOf('offset-bottom')) {
      if (!this.bottomZone) {
        this.bottomZone = true
        this.emit('require-more', { from: 'bottom' })
      }
    } else {
      this.bottomZone = false
    }
  }
}
