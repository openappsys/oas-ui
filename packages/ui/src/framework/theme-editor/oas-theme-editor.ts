import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'

export type ThemeTokenType = 'color' | 'number'
export type ThemeEditorTheme = 'light' | 'dark'
export type ThemeTokenMap = Record<string, string>

export interface ThemeEditorSnapshot {
  light: ThemeTokenMap
  dark: ThemeTokenMap
}

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
  const parts = body
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
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
  const lin2srgb = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
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
 * 基于 packages/theme/index.css 默认值推导，保持档位比例协调。
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
:host([hidden]) {
  display: none;
}
.wrap {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
}
.editing-theme {
  align-self: flex-start;
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
input[type='number'].control.is-invalid,
input[type='text'].color-text.is-invalid {
  /* 非法草稿的真实可见态：1px danger 边框 + 内描边（暗色/高 DPI 下 1px 边框易被吃掉） */
  border-color: var(--oas-color-danger);
  box-shadow: inset 0 0 0 1px var(--oas-color-danger);
}
.slider {
  width: 96px;
  accent-color: var(--oas-color-primary);
}
.unit {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.value {
  min-width: 56px;
  max-width: 180px;
  text-align: end;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}
`

/** 默认 token 集：对应 packages/theme/index.css 的语义 token，按组划分 */
const DEFAULT_GROUPS: TokenGroup[] = [
  {
    key: 'color',
    labelKey: 'themeEditor.group.color',
    tokens: [
      '--oas-color-primary',
      '--oas-color-primary-hover',
      '--oas-color-primary-active',
      '--oas-color-primary-text',
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
    tokens: ['--oas-space-1', '--oas-space-2', '--oas-space-3', '--oas-space-4', '--oas-space-5', '--oas-space-6'].map(
      (name) => ({ name, type: 'number' as const, min: 0, max: 64, step: 1 }),
    ),
  },
  {
    key: 'radius',
    labelKey: 'themeEditor.group.radius',
    tokens: ['--oas-radius-xs', '--oas-radius-sm', '--oas-radius-md', '--oas-radius-lg', '--oas-radius-xl'].map(
      (name) => ({
        name,
        type: 'number' as const,
        min: 0,
        max: 32,
        step: 1,
      }),
    ),
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
 *   只调尺寸族 token），写入当前编辑桶，由 reset() 按桶清除
 * - `editing-theme` 只选择 light/dark 编辑桶；实际预览仍由 ConfigProvider/有效主题决定；
 *   运行时根 `class`（`html.dark` 等）变化会自动 reconcile 内联预览并在导出/读取前对齐
 *
 * 事件：`oas-change` detail `{ token, value, theme }`
 * 方法：旧扁平 API 只作用当前编辑桶；`exportThemes()` / `importThemes()` 读写双套数据
 */
export class OASThemeEditor extends OASElement {
  static override get observedAttributes(): string[] {
    return ['token', 'preset', 'editing-theme']
  }

  /** Vue/React 走 property 赋值时反射到 attribute，统一解析与更新链路 */
  get editingTheme(): ThemeEditorTheme {
    return this.getAttr('editing-theme', 'light') === 'dark' ? 'dark' : 'light'
  }
  set editingTheme(value: ThemeEditorTheme) {
    this.setAttribute('editing-theme', value)
  }

  private groupsEl: HTMLElement | null = null
  private searchEl: HTMLInputElement | null = null
  private editingThemeEl: HTMLSelectElement | null = null
  private rows: TokenRow[] = []
  private groups: GroupRef[] = []
  private lastTokenRaw: string | null = null
  private lastPresetRaw: string | null = null
  private overrides: Record<ThemeEditorTheme, Map<string, string>> = {
    light: new Map<string, string>(),
    dark: new Map<string, string>(),
  }
  private resolvedValues: Record<ThemeEditorTheme, Map<string, string>> = {
    light: new Map<string, string>(),
    dark: new Map<string, string>(),
  }
  private lastPreviewTheme: ThemeEditorTheme | null = null
  /** 观察文档根 class（VitePress 式 html.dark）：运行时 add/remove 不会触发属性回调，需主动 reconcile。 */
  private classObserver: MutationObserver | null = null
  private invalidPresetWarned = new Set<string>()
  private invalidImportKeyWarned = new Set<string>()
  private filtering = false
  private preFilterOpen = new Map<string, boolean>()

  override connectedCallback(): void {
    super.connectedCallback()
    this.bindPreviewObserver()
  }

  override disconnectedCallback(): void {
    this.classObserver?.disconnect()
    this.classObserver = null
    super.disconnectedCallback()
  }

  private bindPreviewObserver(): void {
    const root = this.ownerDocument?.documentElement
    if (!root) return
    this.classObserver?.disconnect()
    this.classObserver = new MutationObserver(() => this.update())
    this.classObserver.observe(root, { attributes: true, attributeFilter: ['class'] })
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrap" part="editor" role="group" aria-label="${this.t('themeEditor.label')}">
        <select class="editing-theme" part="editing-theme" aria-label="${this.t('themeEditor.editingTheme')}">
          <option value="light">${this.t('themeEditor.light')}</option>
          <option value="dark">${this.t('themeEditor.dark')}</option>
        </select>
        <input class="search" part="search" type="text" placeholder="${this.t('themeEditor.search')}" aria-label="${this.t('themeEditor.search')}" spellcheck="false">
        <div class="groups" part="groups"></div>
      </div>
    `
    this.groupsEl = this.shadow.querySelector('.groups')
    this.searchEl = this.shadow.querySelector('.search')
    this.editingThemeEl = this.shadow.querySelector('.editing-theme')
    this.searchEl?.addEventListener('input', () => this.applyFilter())
    this.editingThemeEl?.addEventListener('change', () => {
      this.editingTheme = this.editingThemeEl?.value === 'dark' ? 'dark' : 'light'
    })
    this.update()
  }

  protected override update(): void {
    this.syncPreviewTheme()
    const editingThemeEl = this.editingThemeEl
    if (editingThemeEl) {
      editingThemeEl.value = this.editingTheme
      editingThemeEl.setAttribute('aria-label', this.t('themeEditor.editingTheme'))
      editingThemeEl.options[0]!.textContent = this.t('themeEditor.light')
      editingThemeEl.options[1]!.textContent = this.t('themeEditor.dark')
    }
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
   * 导出当前编辑桶的扁平 token map（非预览桶时优先使用本桶 overrides）。
   */
  exportJson(): ThemeTokenMap {
    return this.exportThemeJson(this.editingTheme)
  }

  /** 导出 light/dark 双套扁平 token map。 */
  exportThemes(): ThemeEditorSnapshot {
    return {
      light: this.exportThemeJson('light'),
      dark: this.exportThemeJson('dark'),
    }
  }

  /**
   * 导出当前编辑桶为 CSS 文本（`:root { --oas-*: value; ... }`，与 exportJson 同源）。
   */
  exportCss(): string {
    this.syncPreviewTheme()
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
        devWarn('[oas-theme-editor] importJson 入参不是合法 JSON 字符串，已忽略')
        return
      }
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      devWarn('[oas-theme-editor] importJson 入参必须是对象（token -> value 映射），已忽略')
      return
    }
    const theme = this.editingTheme
    this.syncPreviewTheme()
    const root = this.themeRoot()
    const preview = this.previewTheme()
    this.resolvedValues[theme].clear()
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (!key.startsWith('--')) {
        if (!this.invalidImportKeyWarned.has(key)) {
          this.invalidImportKeyWarned.add(key)
          devWarn(`[oas-theme-editor] importJson 忽略非 CSS 变量键 "${key}"（须以 -- 开头）`)
        }
        continue
      }
      const normalized = String(value)
      this.overrides[theme].set(key, normalized)
      if (theme === preview) root.style.setProperty(key, normalized)
    }
    for (const row of this.rows) this.syncRow(row)
  }

  /**
   * 原子导入 light/dark 双套数据：先完整校验形状和全部 token，再替换两套 overrides。
   * 任一未知主题、非法 token 名或非字符串/嵌套值都整体忽略，不产生部分写入。
   */
  importThemes(themes: ThemeEditorSnapshot): void {
    if (!this.validThemeSnapshot(themes)) {
      devWarn('[oas-theme-editor] importThemes 入参必须是仅含 light/dark 的扁平字符串 token map，已整体忽略')
      return
    }
    this.syncPreviewTheme()
    const next: Record<ThemeEditorTheme, Map<string, string>> = {
      light: new Map<string, string>(Object.entries(themes.light)),
      dark: new Map<string, string>(Object.entries(themes.dark)),
    }
    const preview = this.previewTheme()
    const inlineTheme = this.lastPreviewTheme ?? preview
    const previousTokens = [...this.overrides[inlineTheme].keys()]
    this.overrides = next
    this.resolvedValues.light.clear()
    this.resolvedValues.dark.clear()
    this.removeInlineTokens(previousTokens)
    this.lastPreviewTheme = preview
    this.applyInlineOverrides(preview)
    this.syncValues()
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
   * 重置指定编辑桶；省略时只清当前 editingTheme。清另一套不改实际预览。
   */
  reset(theme?: ThemeEditorTheme): void {
    const target = theme ?? this.editingTheme
    if (target !== 'light' && target !== 'dark') return
    this.syncPreviewTheme()
    if (target === this.previewTheme()) this.removeInlineTokens(this.overrides[target].keys())
    this.resolvedValues[target].clear()
    this.overrides[target].clear()
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
      devWarn(`[oas-theme-editor] 未知预设主题 "${name}"，已忽略（可用：compact / comfortable / default）`)
    }
  }

  private applyPresetTokens(kind: 'compact' | 'comfortable'): void {
    this.syncPreviewTheme()
    const root = this.themeRoot()
    const theme = this.editingTheme
    const preview = this.previewTheme()
    this.resolvedValues[theme].clear()
    const spaceScale = kind === 'compact' ? 0.75 : 1.25
    const controlDelta = kind === 'compact' ? -4 : 4
    for (const [token, base] of Object.entries(PRESET_SPACE)) {
      const value = `${Math.round(base * spaceScale)}px`
      this.overrides[theme].set(token, value)
      if (theme === preview) root.style.setProperty(token, value)
    }
    for (const [token, base] of Object.entries(PRESET_CONTROL_HEIGHT)) {
      const value = `${base + controlDelta}px`
      this.overrides[theme].set(token, value)
      if (theme === preview) root.style.setProperty(token, value)
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
    // token 名是 LTR token（`--` 前缀在 RTL 下会被 bidi 排到词尾）
    label.dir = 'ltr'
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
      control.classList.toggle('is-invalid', Number.isNaN(parsed))
      if (Number.isNaN(parsed)) return
      this.applyValue(def, `${parsed}${unit}`)
    })
    slider.addEventListener('input', () => {
      const parsed = parseFloat(slider.value)
      if (Number.isNaN(parsed)) return
      // 同行另一控件写入合法值：清掉 number 输入的非法草稿并回填新值
      this.applyValue(def, `${parsed}${unit}`, true)
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
      // 同行色板写入合法值：清掉文本框的非法草稿并回填新值（切桶/外部同步仍保留草稿）
      this.applyValue(def, swatch.value, true)
    })
    const text = document.createElement('input')
    text.type = 'text'
    text.classList.add('control', 'color-text')
    // hex/颜色函数是 LTR token：RTL 宿主下不隔离会被 bidi 重排（#d97706 显成 d97706#、
    // color-mix(...) 逗号乱序），编辑/复制均错——固定 LTR 与取值语义一致
    text.dir = 'ltr'
    text.value = value
    text.setAttribute('aria-label', def.name)
    text.spellcheck = false
    text.addEventListener('input', () => {
      const raw = text.value.trim()
      const valid = raw.length > 0 && parseCssColorToHex(raw) !== null
      text.classList.toggle('is-invalid', !valid)
      if (valid) this.applyValue(def, raw)
    })
    // 只读值显示与输入框同语义（LTR token），一并隔离
    valueEl.dir = 'ltr'
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

  /**
   * 就地刷新单行控件状态（值显示 / 色板 / 文本框 / 滑块）。
   *
   * `clearDraft=true` 仅用于「同一行另一控件写入合法值」：此时用户的非法草稿已被真实意图取代，
   * 清 is-invalid 并回填新值。切桶/外部同步（默认 false）仍保留非法草稿，不打断编辑。
   */
  private syncRow(row: TokenRow, value?: string, clearDraft = false): void {
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
      if (row.colorText) {
        if (clearDraft) row.colorText.classList.remove('is-invalid')
        const preserveInvalidDraft = !clearDraft && row.colorText.classList.contains('is-invalid')
        if (!preserveInvalidDraft) row.colorText.value = value
      }
    } else {
      const num = parseFloat(value)
      if (!Number.isNaN(num)) {
        if (clearDraft) row.control.classList.remove('is-invalid')
        const preserveInvalidDraft = !clearDraft && row.control.classList.contains('is-invalid')
        if (!preserveInvalidDraft) row.control.value = String(num)
        if (row.slider) {
          row.slider.value = String(this.clampNum(num, row.def.min, row.def.max))
        }
      }
    }
  }

  private applyValue(def: ThemeTokenDef, value: string, clearDraft = false): void {
    this.syncPreviewTheme()
    const theme = this.editingTheme
    this.overrides[theme].set(def.name, value)
    this.resolvedValues[theme].clear()
    if (theme === this.previewTheme()) this.themeRoot().style.setProperty(def.name, value)
    this.emit('change', { token: def.name, value, theme })
    // 就地刷新值显示，避免整棵重建导致输入焦点丢失
    const row = this.rows.find((r) => r.def.name === def.name)
    if (row) this.syncRow(row, value, clearDraft)
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

  private exportThemeJson(theme: ThemeEditorTheme): ThemeTokenMap {
    // 运行时根 class 变化不会触发属性回调：读取/导出前先让内联预览与实际预览桶对齐，
    // 否则非预览桶导出会读到上一桶残留的内联值（双套退化为同一套）。
    this.syncPreviewTheme()
    if (theme !== this.previewTheme()) this.captureResolvedValues(theme)
    const out: ThemeTokenMap = {}
    for (const row of this.rows) {
      const value = this.readValue(row.def.name, theme)
      if (value) out[row.def.name] = value
    }
    return out
  }

  private validThemeSnapshot(value: unknown): value is ThemeEditorSnapshot {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const record = value as Record<string, unknown>
    const keys = Object.keys(record)
    if (keys.length !== 2 || keys.some((key) => key !== 'light' && key !== 'dark')) return false
    for (const theme of ['light', 'dark'] as const) {
      const bucket = record[theme]
      if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) return false
      for (const [token, tokenValue] of Object.entries(bucket as Record<string, unknown>)) {
        if (!token.startsWith('--') || token.length <= 2 || typeof tokenValue !== 'string') return false
      }
    }
    return true
  }

  /**
   * 实际预览桶只读有效主题；editingTheme 不参与这个判定。
   *
   * 判定顺序：
   * 1. 最近 `[data-theme]` 祖先（含 themeRoot 自身）：仅 `dark` 归 dark 桶，其余（light /
   *    high-contrast / 自定义主题名）归 light 桶——两桶模型只有明暗两档，高对比/自定义主题
   *    按「浅色基准」预览，不臆造第三桶；
   * 2. 无 `[data-theme]` 祖先时兼容根 class 式暗色（文档站 VitePress 用 `html.dark`，
   *    不设 data-theme）：`dark` / `dark-theme` / `theme-dark` 视为 dark，否则 light。
   *    显式 `[data-theme]` 祖先优先于根 class（局部浅色 provider 不被根暗色劫持）。
   */
  private previewTheme(): ThemeEditorTheme {
    const themed = this.themeRoot().closest('[data-theme]')
    if (themed) return themed.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
    const classes = this.ownerDocument?.documentElement?.classList
    if (classes?.contains('dark') || classes?.contains('dark-theme') || classes?.contains('theme-dark')) {
      return 'dark'
    }
    return 'light'
  }

  private syncPreviewTheme(): void {
    const preview = this.previewTheme()
    if (preview === this.lastPreviewTheme) return
    if (this.lastPreviewTheme) this.removeInlineTokens(this.overrides[this.lastPreviewTheme].keys())
    this.lastPreviewTheme = preview
    this.applyInlineOverrides(preview)
  }

  private removeInlineTokens(tokens: Iterable<string>): void {
    const root = this.themeRoot()
    for (const token of tokens) root.style.removeProperty(token)
  }

  private applyInlineOverrides(theme: ThemeEditorTheme): void {
    const root = this.themeRoot()
    for (const [token, value] of this.overrides[theme]) root.style.setProperty(token, value)
  }

  /**
   * 写读目标：位于 oas-config-provider 内部时写最近 provider（整个子树继承），
   * 否则写宿主自身。
   */
  private themeRoot(): HTMLElement {
    const provider = this.closest('oas-config-provider')
    return (provider as HTMLElement | null) ?? this
  }

  /**
   * 用同级隐藏 probe 读取非预览套的 computed 值。plain div 复制 root 的属性/class/id 与内联上下文，
   * 去掉两桶编辑器写入后设目标 data-theme，再只应用目标桶 overrides；不改 root，finally 销毁重复 id。
   */
  private captureResolvedValues(theme: ThemeEditorTheme): void {
    if (theme === this.previewTheme()) return
    const root = this.themeRoot()
    const parent = root.parentNode
    if (!parent) return
    const tokens = new Set(this.resolveGroups().flatMap((group) => group.tokens.map((token) => token.name)))
    const edited = new Set([...this.overrides.light.keys(), ...this.overrides.dark.keys()])
    const probe = document.createElement('div')
    for (const attr of root.attributes) {
      if (attr.name !== 'style' && attr.name !== 'data-theme') probe.setAttribute(attr.name, attr.value)
    }
    probe.style.cssText = root.style.cssText
    for (const token of edited) probe.style.removeProperty(token)
    probe.hidden = true
    probe.setAttribute('aria-hidden', 'true')
    probe.dataset.theme = theme
    for (const [token, value] of this.overrides[theme]) probe.style.setProperty(token, value)
    parent.appendChild(probe)
    try {
      const computed = getComputedStyle(probe)
      for (const token of tokens) this.resolvedValues[theme].set(token, computed.getPropertyValue(token).trim())
    } finally {
      probe.remove()
    }
  }

  private readValue(name: string, theme: ThemeEditorTheme = this.editingTheme): string {
    const override = this.overrides[theme].get(name)
    if (override !== undefined) return override
    if (theme === this.previewTheme()) {
      const value = getComputedStyle(this.themeRoot()).getPropertyValue(name).trim()
      if (value) this.resolvedValues[theme].set(name, value)
      return value
    }
    if (!this.resolvedValues[theme].has(name)) this.captureResolvedValues(theme)
    return this.resolvedValues[theme].get(name) ?? ''
  }

  private resolveGroups(): TokenGroup[] {
    const raw = this.getAttr('token')
    if (!raw) return DEFAULT_GROUPS
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return DEFAULT_GROUPS
      const names = parsed.filter((n): n is string => typeof n === 'string' && n.startsWith('--') && n.length > 2)
      if (names.length === 0) return DEFAULT_GROUPS
      const byGroup = new Map<string, ThemeTokenDef[]>()
      for (const name of names) {
        const key = this.groupOf(name)
        const def: ThemeTokenDef =
          key === 'color' ? { name, type: 'color' } : { name, type: 'number', min: 0, max: 100, step: 1 }
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
