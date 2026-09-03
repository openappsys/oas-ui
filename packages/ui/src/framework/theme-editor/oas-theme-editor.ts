import { OASElement } from '@oas-ui/core'

export type ThemeTokenType = 'color' | 'number'

export interface ThemeTokenDef {
  /** CSS 变量名，如 --oas-color-primary */
  name: string
  type: ThemeTokenType
  min?: number
  max?: number
  step?: number
}

export interface TokenGroup {
  key: string
  labelKey: string
  tokens: ThemeTokenDef[]
}

/* =========================================================================
 * CSS 颜色解析：自研确定性解析为主（happy-dom 与真实浏览器行为一致），
 * 浏览器 CSS 代理（临时元素 getComputedStyle）兜底命名色/lab 等。
 * 返回 #rrggbb 或 null（不可解析：var()/color-mix/非法）。
 * ========================================================================= */

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n))

const clamp255 = (n: number): number => Math.round(Math.min(255, Math.max(0, n)))

function toHexChannels(r: number, g: number, b: number): string {
  const to = (n: number) => clamp255(n).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/** 解析数字或百分比（CSS number）；百分比按 base 换算 */
function numOrPct(s: string, base: number): number | null {
  const t = s.trim()
  if (!t) return null
  if (t.endsWith('%')) {
    const v = parseFloat(t)
    return Number.isNaN(v) ? null : (v / 100) * base
  }
  const v = parseFloat(t)
  return Number.isNaN(v) ? null : v
}

/** 提取函数体分量（统一逗号/空格语法，剔除 / alpha 分量） */
function fnBodyParts(input: string): string[] | null {
  const m = input.match(/^[a-z]+\(([^)]*)\)$/i)
  if (!m) return null
  const body = m[1]!.replace(/\/\s*[\d.]+%?/, '').replace(/,/g, ' ')
  const parts = body.split(/\s+/).map((s) => s.trim()).filter(Boolean)
  return parts.length > 0 ? parts : null
}

/** hsl → rgb（色相 h∈[0,360)，s/l∈[0,1]） */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = h / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hp < 1) [r, g, b] = [c, x, 0]
  else if (hp < 2) [r, g, b] = [x, c, 0]
  else if (hp < 3) [r, g, b] = [0, c, x]
  else if (hp < 4) [r, g, b] = [0, x, c]
  else if (hp < 5) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return [r + m, g + m, b + m]
}

function parseRgbFn(input: string): string | null {
  const parts = fnBodyParts(input)
  if (!parts || parts.length < 3) return null
  const r = numOrPct(parts[0]!, 255)
  const g = numOrPct(parts[1]!, 255)
  const b = numOrPct(parts[2]!, 255)
  if (r === null || g === null || b === null) return null
  return toHexChannels(r, g, b)
}

function parseHslFn(input: string): string | null {
  const parts = fnBodyParts(input)
  if (!parts || parts.length < 3) return null
  let h = parseFloat(parts[0]!)
  if (Number.isNaN(h)) return null
  h = ((h % 360) + 360) % 360
  const s = clamp01(numOrPct(parts[1]!, 1) ?? 0)
  const l = clamp01(numOrPct(parts[2]!, 1) ?? 0)
  const [r, g, b] = hslToRgb(h, s, l)
  return toHexChannels(r * 255, g * 255, b * 255)
}

/** hwb：纯色相 hsl(h,100%,50%) × (1-w-b) + w（CSS Color 4 官方算法） */
function parseHwbFn(input: string): string | null {
  const parts = fnBodyParts(input)
  if (!parts || parts.length < 3) return null
  let h = parseFloat(parts[0]!)
  if (Number.isNaN(h)) return null
  h = ((h % 360) + 360) % 360
  const w = clamp01(numOrPct(parts[1]!, 1) ?? 0)
  const b = clamp01(numOrPct(parts[2]!, 1) ?? 0)
  if (w + b >= 1) {
    const gray = w / (w + b)
    return toHexChannels(gray * 255, gray * 255, gray * 255)
  }
  const [pr, pg, pb] = hslToRgb(h, 1, 0.5)
  const scale = 1 - w - b
  return toHexChannels((pr * scale + w) * 255, (pg * scale + w) * 255, (pb * scale + w) * 255)
}

/** OKLab → 线性 sRGB（CSS Color 4 §19 参考实现），随后 gamma 编码 + 钳制 */
function oklabToSrgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  const lin2srgb = (c: number): number =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
  return [clamp01(lin2srgb(r)), clamp01(lin2srgb(g)), clamp01(lin2srgb(bl))]
}

function parseOklchFn(input: string): string | null {
  const parts = fnBodyParts(input)
  if (!parts || parts.length < 3) return null
  const lRaw = numOrPct(parts[0]!, 1)
  const cRaw = numOrPct(parts[1]!, 0.4) // C 百分比基准 0.4
  const h = parseFloat(parts[2]!)
  if (lRaw === null || cRaw === null || Number.isNaN(h)) return null
  const L = clamp01(lRaw)
  const C = Math.max(0, cRaw)
  const hr = ((h % 360) + 360) % 360
  const rad = (hr * Math.PI) / 180
  const [r, g, b] = oklabToSrgb(L, C * Math.cos(rad), C * Math.sin(rad))
  return toHexChannels(r * 255, g * 255, b * 255)
}

function parseOklabFn(input: string): string | null {
  const parts = fnBodyParts(input)
  if (!parts || parts.length < 3) return null
  const lRaw = numOrPct(parts[0]!, 1)
  const a = numOrPct(parts[1]!, 0.4) ?? 0
  const b = numOrPct(parts[2]!, 0.4) ?? 0
  if (lRaw === null) return null
  const [r, g, bl] = oklabToSrgb(clamp01(lRaw), a, b)
  return toHexChannels(r * 255, g * 255, bl * 255)
}

/** CSS 代理兜底：临时元素 style.color = value → getComputedStyle 归一化 rgb()/rgba() */
function proxyResolveColor(value: string): string | null {
  const el = document.createElement('div')
  el.style.color = value
  const computed = getComputedStyle(el).color.trim()
  if (!computed) return null
  const m = computed.match(/^rgba?\(([^)]*)\)$/i)
  if (m) {
    const nums = m[1]!.split(',').map((s) => Number(s.trim()))
    if (nums.length >= 3 && nums.slice(0, 3).every(Number.isFinite)) {
      return toHexChannels(nums[0]!, nums[1]!, nums[2]!)
    }
  }
  if (/^#[0-9a-f]{6}$/i.test(computed)) return computed.toLowerCase()
  return null
}

/**
 * 把任意 CSS 颜色值解析为 #rrggbb（供色板承载）；无法解析返回 null。
 * - hex（#rgb/#rgba/#rrggbb/#rrggbbaa）→ 展开为 6 位（alpha 不承载）
 * - rgb()/rgba()/hsl()/hsla()/hwb()/oklch()/oklab() 自研确定性解析
 * - 含 var()/env()/attr()/calc() 等动态引用 → null（色板置中性态不可编辑）
 * - 其余（命名色、lab/lch、color()、color-mix 等）走 CSS 代理（真实浏览器可解析）
 */
export function parseCssColorToHex(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  const hexM = v.match(/^#([0-9a-f]{3,8})$/i)
  if (hexM) {
    let h = hexM[1]!.toLowerCase()
    if (h.length === 3 || h.length === 4) {
      h = h
        .split('')
        .map((c) => c + c)
        .join('')
    }
    if (h.length === 6) return `#${h}`
    if (h.length === 8) return `#${h.slice(0, 6)}`
    return null
  }
  // 动态引用（var 依赖计算期才能解析）——色板无法承载，置不可编辑
  if (/\b(var|env|attr|calc)\s*\(/i.test(v)) return null
  const fnM = v.match(/^([a-z]+)\(/i)
  if (fnM) {
    const fn = fnM[1]!.toLowerCase()
    if (fn === 'rgb' || fn === 'rgba') {
      const hex = parseRgbFn(v)
      if (hex) return hex
    } else if (fn === 'hsl' || fn === 'hsla') {
      const hex = parseHslFn(v)
      if (hex) return hex
    } else if (fn === 'hwb') {
      const hex = parseHwbFn(v)
      if (hex) return hex
    } else if (fn === 'oklch') {
      const hex = parseOklchFn(v)
      if (hex) return hex
    } else if (fn === 'oklab') {
      const hex = parseOklabFn(v)
      if (hex) return hex
    }
  }
  return proxyResolveColor(v)
}

/** 色板中性态（不可解析值）的兜底色 */
const NEUTRAL_SWATCH_HEX = '#808080'

/* =========================================================================
 * 预设主题：只调尺寸族 token（control-height / space），不动颜色。
 * 基于 theme/src/index.css 默认值推导，保持档位比例协调。
 * ========================================================================= */

const PRESET_SPACE: Record<string, number> = {
  '--oas-space-1': 4,
  '--oas-space-2': 8,
  '--oas-space-3': 12,
  '--oas-space-4': 16,
  '--oas-space-5': 24,
  '--oas-space-6': 32,
}

const PRESET_CONTROL_HEIGHT: Record<string, number> = {
  '--oas-control-height-xs': 20,
  '--oas-control-height-sm': 24,
  '--oas-control-height-md': 32,
  '--oas-control-height-lg': 40,
  '--oas-control-height-xl': 48,
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
.wrap {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
}
.search {
  width: 100%;
  height: var(--oas-control-height-sm);
  box-sizing: border-box;
  padding: 0 var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
}
.search::placeholder {
  color: var(--oas-color-text-disabled);
}
.group {
  border-bottom: 1px solid var(--oas-color-border);
}
.group:last-child {
  border-bottom: none;
}
.group-title {
  margin: 0;
  padding: var(--oas-space-1) 0;
  font-size: var(--oas-font-size-sm);
  font-weight: 600;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  user-select: none;
  list-style: none;
}
.group-title::-webkit-details-marker {
  display: none;
}
.rows {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  padding-bottom: var(--oas-space-1);
}
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
  padding: var(--oas-space-1) 0;
}
.row-label {
  font-size: var(--oas-font-size-sm);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-right {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--oas-space-2);
  flex-shrink: 0;
}
input[type='color'].swatch {
  width: 32px;
  height: var(--oas-control-height-sm);
  padding: 0;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  cursor: pointer;
}
input[type='color'].swatch:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  filter: grayscale(1);
}
input[type='color'].swatch-neutral {
  opacity: 0.45;
  filter: grayscale(1);
}
input[type='number'].control {
  width: 64px;
  height: var(--oas-control-height-sm);
  box-sizing: border-box;
  padding: 0 var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
}
input[type='text'].color-text {
  flex: 1 1 140px;
  min-width: 120px;
  height: var(--oas-control-height-sm);
  box-sizing: border-box;
  padding: 0 var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: var(--oas-font-size-xs);
}
input[type='text'].color-text.is-invalid {
  border-color: var(--oas-color-danger);
}
.slider {
  width: 96px;
  accent-color: var(--oas-color-primary);
}
.unit {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-disabled);
}
.value {
  min-width: 56px;
  max-width: 180px;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-disabled);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}
`

/** 默认 token 集：对应 theme/src/index.css 的语义 token，按组划分 */
const DEFAULT_GROUPS: TokenGroup[] = [
  {
    key: 'color',
    labelKey: 'themeEditor.group.color',
    tokens: [
      '--oas-color-primary',
      '--oas-color-primary-hover',
      '--oas-color-primary-active',
      '--oas-color-success',
      '--oas-color-warning',
      '--oas-color-danger',
      '--oas-color-text-primary',
      '--oas-color-text-secondary',
      '--oas-color-text-disabled',
      '--oas-color-border',
      '--oas-color-border-strong',
      '--oas-color-bg',
      '--oas-color-bg-elevated',
      '--oas-color-bg-hover',
      '--oas-color-bg-disabled',
    ].map((name) => ({ name, type: 'color' as const })),
  },
  {
    key: 'fontSize',
    labelKey: 'themeEditor.group.fontSize',
    tokens: [
      '--oas-font-size-xs',
      '--oas-font-size-sm',
      '--oas-font-size-md',
      '--oas-font-size-lg',
      '--oas-font-size-xl',
    ].map((name) => ({ name, type: 'number' as const, min: 8, max: 48, step: 1 })),
  },
  {
    key: 'space',
    labelKey: 'themeEditor.group.space',
    tokens: [
      '--oas-space-1',
      '--oas-space-2',
      '--oas-space-3',
      '--oas-space-4',
      '--oas-space-5',
      '--oas-space-6',
    ].map((name) => ({ name, type: 'number' as const, min: 0, max: 64, step: 1 })),
  },
  {
    key: 'radius',
    labelKey: 'themeEditor.group.radius',
    tokens: [
      '--oas-radius-xs',
      '--oas-radius-sm',
      '--oas-radius-md',
      '--oas-radius-lg',
      '--oas-radius-xl',
    ].map((name) => ({
      name,
      type: 'number' as const,
      min: 0,
      max: 32,
      step: 1,
    })),
  },
  {
    key: 'controlHeight',
    labelKey: 'themeEditor.group.controlHeight',
    tokens: [
      '--oas-control-height-xs',
      '--oas-control-height-sm',
      '--oas-control-height-md',
      '--oas-control-height-lg',
      '--oas-control-height-xl',
    ].map((name) => ({ name, type: 'number' as const, min: 16, max: 80, step: 1 })),
  },
]

const GROUP_LABELS: Record<string, string> = {
  color: 'themeEditor.group.color',
  fontSize: 'themeEditor.group.fontSize',
  space: 'themeEditor.group.space',
  radius: 'themeEditor.group.radius',
  controlHeight: 'themeEditor.group.controlHeight',
  custom: 'themeEditor.group.custom',
}

interface TokenRow {
  def: ThemeTokenDef
  rowEl: HTMLElement
  control: HTMLInputElement
  valueEl: HTMLElement
  colorText?: HTMLInputElement
  slider?: HTMLInputElement
}

interface GroupRef {
  key: string
  detailsEl: HTMLDetailsElement
  rows: TokenRow[]
}

/**
 * oas-theme-editor —— 主题 token 编辑面板。
 *
 * - 读取宿主（或最近 oas-config-provider）computed style 中的 `--oas-*` 变量，按组展示
 * - 颜色 token 行 = 色板 + 文本框双通道：色板只承载可解析为 #rrggbb 的值；
 *   文本框始终可编辑原始值（rgb()/oklch()/color-mix() 等任意 CSS 颜色函数）；
 *   无法解析的值（含 var() 等）色板置中性态不可编辑，仅文本框可编辑
 * - 数字 token 行 = range 滑块 + number 输入联动（min/max/step 复用 def），写回带原单位
 * - 组用 details/summary 可折叠；面板顶部搜索框按 token 名子串过滤（过滤时组自动展开）
 * - 编辑即时写入宿主 CSS 变量（style.setProperty），子树实时继承预览
 * - 位于 oas-config-provider 内部时写入该 provider 元素，实现整个子树继承
 * - `token` 属性自定义要编辑的 token 列表（JSON 字符串数组），缺省读默认集；
 *   变量不存在时跳过；非法 JSON 回退默认集
 * - `preset` 属性/`applyPreset()` 应用内置预设主题（compact/comfortable/default，
 *   只调尺寸族 token），写入记录进 writtenTokens 由 reset() 一并清除
 *
 * 事件：`oas-change` detail `{ token, value }`
 * 方法：`exportJson()` 导出当前 token 集；`exportCss()` 导出 :root CSS 文本；
 *       `importJson(json)` 应用 token 集；`reset()` 清除已写入的内联变量
 */
export class OASThemeEditor extends OASElement {
  static override get observedAttributes(): string[] {
    return ['token', 'preset']
  }

  private groupsEl: HTMLElement | null = null
  private searchEl: HTMLInputElement | null = null
  private rows: TokenRow[] = []
  private groups: GroupRef[] = []
  private lastTokenRaw: string | null = null
  private lastPresetRaw: string | null = null
  private writtenTokens = new Set<string>()
  private invalidPresetWarned = new Set<string>()
  private invalidImportKeyWarned = new Set<string>()
  private filtering = false
  private preFilterOpen = new Map<string, boolean>()

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrap" part="editor" role="group" aria-label="${this.t('themeEditor.label')}">
        <input class="search" part="search" type="text" placeholder="${this.t('themeEditor.search')}" aria-label="${this.t('themeEditor.search')}" spellcheck="false">
        <div class="groups" part="groups"></div>
      </div>
    `
    this.groupsEl = this.shadow.querySelector('.groups')
    this.searchEl = this.shadow.querySelector('.search')
    this.searchEl?.addEventListener('input', () => this.applyFilter())
    this.update()
  }

  protected override update(): void {
    const tokenRaw = this.getAttr('token')
    if (tokenRaw !== this.lastTokenRaw) {
      this.lastTokenRaw = tokenRaw
      this.rebuild()
    } else {
      this.syncValues()
    }
    const presetRaw = this.getAttr('preset')
    if (presetRaw !== this.lastPresetRaw) {
      this.lastPresetRaw = presetRaw
      if (presetRaw) this.applyPresetRequested(presetRaw)
    }
  }

  /**
   * 导出当前 token 集 JSON（`{ '--oas-*': value }`，值为实时 computed 值）。
   */
  exportJson(): Record<string, string> {
    const out: Record<string, string> = {}
    for (const row of this.rows) {
      const value = this.readValue(row.def.name)
      if (value) out[row.def.name] = value
    }
    return out
  }

  /**
   * 导出当前 token 集为 CSS 文本（`:root { --oas-*: value; ... }`，与 exportJson 同源）。
   */
  exportCss(): string {
    const lines: string[] = []
    for (const row of this.rows) {
      const value = this.readValue(row.def.name)
      if (value) lines.push(`  ${row.def.name}: ${value};`)
    }
    const body = lines.join('\n')
    return body ? `:root {\n${body}\n}` : ':root {\n}'
  }

  /**
   * 应用 token 集到 themeRoot：`{ '--oas-*': value }`，非 `--` 开头键忽略并 dev 告警
   * （同值去重）；写入后就地同步面板（不整棵重建，不丢输入焦点）。
   */
  importJson(json: Record<string, unknown> | string): void {
    let data: unknown = json
    if (typeof json === 'string') {
      try {
        data = JSON.parse(json)
      } catch {
        console.warn('[oas-theme-editor] importJson 入参不是合法 JSON 字符串，已忽略')
        return
      }
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      console.warn('[oas-theme-editor] importJson 入参必须是对象（token -> value 映射），已忽略')
      return
    }
    const root = this.themeRoot()
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (!key.startsWith('--')) {
        if (!this.invalidImportKeyWarned.has(key)) {
          this.invalidImportKeyWarned.add(key)
          console.warn(`[oas-theme-editor] importJson 忽略非 CSS 变量键 "${key}"（须以 -- 开头）`)
        }
        continue
      }
      root.style.setProperty(key, String(value))
      this.writtenTokens.add(key)
    }
    for (const row of this.rows) this.syncRow(row)
  }

  /**
   * 应用内置预设主题。只调尺寸族 token（control-height / space），不动颜色：
   * - `compact`：control-height 各档 -4px、space 各档按比例收缩
   * - `comfortable`：control-height 各档 +4px、space 各档按比例放大
   * - `default`：等价 reset()，清除已写入的内联变量
   * 非法 preset 名忽略并 dev 告警（同值去重）。
   */
  applyPreset(name: string): void {
    this.applyPresetRequested(name)
    if (this.getAttr('preset') !== name) this.setAttribute('preset', name)
  }

  /**
   * 重置：清除本组件写入宿主的内联 CSS 变量，恢复默认主题值。
   */
  reset(): void {
    const root = this.themeRoot()
    for (const name of this.writtenTokens) {
      root.style.removeProperty(name)
    }
    this.writtenTokens.clear()
    this.update()
  }

  private applyPresetRequested(name: string): void {
    this.lastPresetRaw = name
    const normalized = name.trim().toLowerCase()
    if (normalized === '') return
    if (normalized === 'default') {
      this.reset()
      return
    }
    if (normalized === 'compact' || normalized === 'comfortable') {
      this.applyPresetTokens(normalized)
      return
    }
    if (!this.invalidPresetWarned.has(normalized)) {
      this.invalidPresetWarned.add(normalized)
      console.warn(
        `[oas-theme-editor] 未知预设主题 "${name}"，已忽略（可用：compact / comfortable / default）`,
      )
    }
  }

  private applyPresetTokens(kind: 'compact' | 'comfortable'): void {
    const root = this.themeRoot()
    const spaceScale = kind === 'compact' ? 0.75 : 1.25
    const controlDelta = kind === 'compact' ? -4 : 4
    for (const [token, base] of Object.entries(PRESET_SPACE)) {
      root.style.setProperty(token, `${Math.round(base * spaceScale)}px`)
      this.writtenTokens.add(token)
    }
    for (const [token, base] of Object.entries(PRESET_CONTROL_HEIGHT)) {
      root.style.setProperty(token, `${base + controlDelta}px`)
      this.writtenTokens.add(token)
    }
    // 就地刷新面板（不整棵重建，不丢输入焦点）
    for (const row of this.rows) this.syncRow(row)
  }

  private rebuild(): void {
    const groupsEl = this.groupsEl
    if (!groupsEl) return
    groupsEl.innerHTML = ''
    this.rows = []
    this.groups = []
    for (const group of this.resolveGroups()) {
      const groupRows: TokenRow[] = []
      for (const def of group.tokens) {
        const value = this.readValue(def.name)
        if (!value) continue // 边界：变量不存在跳过
        const row = this.buildRow(def, value)
        if (row) groupRows.push(row)
      }
      if (groupRows.length === 0) continue
      this.rows.push(...groupRows)
      const details = document.createElement('details')
      details.className = 'group'
      details.setAttribute('part', 'group')
      details.open = true
      const summary = document.createElement('summary')
      summary.className = 'group-title'
      summary.setAttribute('part', 'group-title')
      summary.textContent = this.t(group.labelKey)
      details.appendChild(summary)
      const container = document.createElement('div')
      container.className = 'rows'
      for (const r of groupRows) container.appendChild(r.rowEl)
      details.appendChild(container)
      groupsEl.appendChild(details)
      this.groups.push({ key: group.key, detailsEl: details, rows: groupRows })
    }
    this.applyFilter()
  }

  private buildRow(def: ThemeTokenDef, value: string): TokenRow | null {
    const rowEl = document.createElement('div')
    rowEl.className = 'row'
    rowEl.setAttribute('part', 'row')

    const label = document.createElement('span')
    label.className = 'row-label'
    label.textContent = def.name
    rowEl.appendChild(label)

    const right = document.createElement('span')
    right.className = 'row-right'

    const valueEl = document.createElement('span')
    valueEl.className = 'value'

    if (def.type === 'color') {
      return this.buildColorRow(def, value, rowEl, right, valueEl)
    }

    // 数字 token：range 滑块 + number 输入联动
    const num = parseFloat(value)
    if (Number.isNaN(num)) return null
    const min = def.min ?? 0
    const max = def.max ?? 100
    const step = def.step ?? 1
    const unit = this.extractUnit(value)
    const control = document.createElement('input')
    control.type = 'number'
    control.classList.add('control')
    control.min = String(min)
    control.max = String(max)
    control.step = String(step)
    control.value = String(num)
    control.setAttribute('aria-label', def.name)
    const slider = document.createElement('input')
    slider.type = 'range'
    slider.classList.add('slider')
    slider.min = String(min)
    slider.max = String(max)
    slider.step = String(step)
    slider.value = String(this.clampNum(num, min, max))
    slider.setAttribute('aria-label', def.name)
    control.addEventListener('input', () => {
      const parsed = parseFloat(control.value)
      if (Number.isNaN(parsed)) return
      this.applyValue(def, `${parsed}${unit}`)
    })
    slider.addEventListener('input', () => {
      const parsed = parseFloat(slider.value)
      if (Number.isNaN(parsed)) return
      this.applyValue(def, `${parsed}${unit}`)
    })
    right.appendChild(slider)
    right.appendChild(control)
    if (unit) {
      const unitEl = document.createElement('span')
      unitEl.className = 'unit'
      unitEl.textContent = unit
      right.appendChild(unitEl)
    }
    valueEl.textContent = value
    right.appendChild(valueEl)
    rowEl.appendChild(right)
    return { def, rowEl, control, valueEl, slider }
  }

  private buildColorRow(
    def: ThemeTokenDef,
    value: string,
    rowEl: HTMLElement,
    right: HTMLElement,
    valueEl: HTMLElement,
  ): TokenRow {
    const swatch = document.createElement('input')
    swatch.type = 'color'
    swatch.classList.add('control', 'swatch')
    swatch.setAttribute('aria-label', def.name)
    const hex = parseCssColorToHex(value)
    if (hex) {
      swatch.value = hex
    } else {
      swatch.value = NEUTRAL_SWATCH_HEX
      swatch.disabled = true
      swatch.classList.add('swatch-neutral')
    }
    swatch.addEventListener('input', () => {
      if (swatch.disabled) return
      this.applyValue(def, swatch.value)
    })
    const text = document.createElement('input')
    text.type = 'text'
    text.classList.add('control', 'color-text')
    text.value = value
    text.setAttribute('aria-label', def.name)
    text.spellcheck = false
    text.addEventListener('input', () => {
      const raw = text.value.trim()
      const valid = raw.length > 0 && parseCssColorToHex(raw) !== null
      text.classList.toggle('is-invalid', !valid)
      if (valid) this.applyValue(def, raw)
    })
    valueEl.textContent = value
    right.appendChild(swatch)
    right.appendChild(text)
    right.appendChild(valueEl)
    rowEl.appendChild(right)
    return { def, rowEl, control: swatch, valueEl, colorText: text }
  }

  private syncValues(): void {
    for (const row of this.rows) {
      const value = this.readValue(row.def.name)
      if (value) this.syncRow(row, value)
    }
  }

  /** 就地刷新单行控件状态（值显示 / 色板 / 文本框 / 滑块） */
  private syncRow(row: TokenRow, value?: string): void {
    if (value === undefined) {
      const v = this.readValue(row.def.name)
      if (!v) return
      value = v
    }
    row.valueEl.textContent = value
    if (row.def.type === 'color') {
      const hex = parseCssColorToHex(value)
      const swatch = row.control
      if (hex) {
        swatch.value = hex
        swatch.disabled = false
        swatch.classList.remove('swatch-neutral')
      } else {
        swatch.value = NEUTRAL_SWATCH_HEX
        swatch.disabled = true
        swatch.classList.add('swatch-neutral')
      }
      if (row.colorText) row.colorText.value = value
    } else {
      const num = parseFloat(value)
      if (!Number.isNaN(num)) {
        row.control.value = String(num)
        if (row.slider) {
          row.slider.value = String(this.clampNum(num, row.def.min, row.def.max))
        }
      }
    }
  }

  private applyValue(def: ThemeTokenDef, value: string): void {
    const root = this.themeRoot()
    root.style.setProperty(def.name, value)
    this.writtenTokens.add(def.name)
    this.emit('change', { token: def.name, value })
    // 就地刷新值显示，避免整棵重建导致输入焦点丢失
    const row = this.rows.find((r) => r.def.name === def.name)
    if (row) this.syncRow(row, value)
  }

  /** 搜索过滤：按 token 名子串（大小写不敏感），无匹配组隐藏，过滤时组自动展开 */
  private applyFilter(): void {
    const search = this.searchEl
    if (!search) return
    const q = search.value.trim().toLowerCase()
    const filtering = q.length > 0
    if (filtering && !this.filtering) {
      // 进入过滤：记录当前折叠状态并展开全部组
      this.preFilterOpen.clear()
      for (const g of this.groups) this.preFilterOpen.set(g.key, g.detailsEl.open)
      for (const g of this.groups) g.detailsEl.open = true
    }
    if (!filtering && this.filtering) {
      // 清空：恢复过滤前的折叠状态
      for (const g of this.groups) {
        const prev = this.preFilterOpen.get(g.key)
        if (prev !== undefined) g.detailsEl.open = prev
      }
      this.preFilterOpen.clear()
    }
    for (const g of this.groups) {
      let visible = 0
      for (const row of g.rows) {
        const hit = !filtering || row.def.name.toLowerCase().includes(q)
        row.rowEl.style.display = hit ? '' : 'none'
        if (hit) visible++
      }
      g.detailsEl.style.display = visible > 0 ? '' : 'none'
    }
    this.filtering = filtering
  }

  /**
   * 写读目标：位于 oas-config-provider 内部时写最近 provider（整个子树继承），
   * 否则写宿主自身。
   */
  private themeRoot(): HTMLElement {
    const provider = this.closest('oas-config-provider')
    return (provider as HTMLElement | null) ?? this
  }

  private readValue(name: string): string {
    return getComputedStyle(this.themeRoot()).getPropertyValue(name).trim()
  }

  private resolveGroups(): TokenGroup[] {
    const raw = this.getAttr('token')
    if (!raw) return DEFAULT_GROUPS
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return DEFAULT_GROUPS
      const names = parsed.filter(
        (n): n is string => typeof n === 'string' && n.startsWith('--') && n.length > 2,
      )
      if (names.length === 0) return DEFAULT_GROUPS
      const byGroup = new Map<string, ThemeTokenDef[]>()
      for (const name of names) {
        const key = this.groupOf(name)
        const def: ThemeTokenDef =
          key === 'color'
            ? { name, type: 'color' }
            : { name, type: 'number', min: 0, max: 100, step: 1 }
        const list = byGroup.get(key)
        if (list) list.push(def)
        else byGroup.set(key, [def])
      }
      const groups: TokenGroup[] = []
      for (const key of ['color', 'fontSize', 'space', 'radius', 'controlHeight', 'custom']) {
        const tokens = byGroup.get(key)
        if (!tokens || tokens.length === 0) continue
        groups.push({ key, labelKey: GROUP_LABELS[key] ?? 'themeEditor.group.custom', tokens })
      }
      return groups
    } catch {
      return DEFAULT_GROUPS
    }
  }

  private groupOf(name: string): string {
    if (name.includes('color')) return 'color'
    if (name.startsWith('--oas-font-size-')) return 'fontSize'
    if (name.startsWith('--oas-space-')) return 'space'
    if (name.startsWith('--oas-radius-')) return 'radius'
    if (name.startsWith('--oas-control-height-')) return 'controlHeight'
    return 'custom'
  }

  private clampNum(n: number, min?: number, max?: number): number {
    let v = n
    if (min !== undefined) v = Math.max(min, v)
    if (max !== undefined) v = Math.min(max, v)
    return v
  }

  private extractUnit(value: string): string {
    const m = value.match(/[a-z%]+$/i)
    return m ? m[0] : ''
  }
}
