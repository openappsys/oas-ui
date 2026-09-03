import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'
import {
  parseColor,
  formatColor,
  formatSwatch,
  rgbToHsv,
  hsvToRgb,
  type RGBA,
} from './color.js'

/** placement 合法取值：12 向（四基向 × start/end 交叉轴对齐），默认 bottom（与 date-picker 同一枚举） */
const VALID_PLACEMENTS: readonly Placement[] = [
  'top',
  'top-start',
  'top-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'left',
  'left-start',
  'left-end',
  'right',
  'right-start',
  'right-end',
]

/** 预设色板默认值（与一期前视觉一致） */
const DEFAULT_PRESETS = [
  '#0b6cff',
  '#16a34a',
  '#d97706',
  '#dc2626',
  '#9333ea',
  '#0ea5e9',
  '#18181b',
  '#71717a',
  '#a1a1aa',
  '#e4e4e7',
  '#ffffff',
  '#f4f4f5',
]

/** 内部缺省色：value 为空/非法时面板通道的起始值（仅展示用，不写回 value） */
const DEFAULT_COLOR: RGBA = { r: 0, g: 102, b: 255, a: 1 }

/** 视口夹取边距（与 date-picker 一致） */
const VIEWPORT_PADDING = 8
/** 面板与触发器的纵向间距（与一期前 top: calc(100% + 4px) 一致） */
const PANEL_GAP = 4

/** 预设项：字符串任意 CSS 颜色，或 { color, label }（label 供可访问名） */
type PresetEntry = string | { color: string; label?: string }

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.wrapper {
  position: relative;
  display: inline-block;
}
.trigger {
  appearance: none;
  box-sizing: border-box;
  min-height: var(--oas-control-height-md);
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
:host([size='large']) .trigger {
  min-height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-lg);
}
:host([size='small']) .trigger {
  min-height: var(--oas-control-height-sm);
  font-size: var(--oas-font-size-sm);
}
.trigger:hover {
  border-color: var(--oas-color-primary);
}
.trigger:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.trigger[aria-expanded='true'] {
  border-color: var(--oas-color-primary);
}
.trigger[disabled] {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
:host([readonly]) .trigger {
  cursor: default;
}
.swatch {
  width: 18px;
  height: 18px;
  border-radius: var(--oas-radius-sm);
  border: 1px solid var(--oas-color-border);
  flex-shrink: 0;
}
/* 半透明色：棋盘格底（色板颜色作 background-color 叠在上层） */
.swatch.alpha-checker {
  background-image: repeating-conic-gradient(
    var(--oas-color-bg-hover) 0% 25%,
    var(--oas-color-bg) 0% 50%
  );
  background-size: 10px 10px;
}
.swatch[hidden] {
  display: none;
}
.hex-text {
  font-variant-numeric: tabular-nums;
  min-width: 52px;
  text-align: left;
}
.hex-text.placeholder {
  color: var(--oas-color-text-secondary);
}
.hex-text[hidden] {
  display: none;
}
/* fixed + computePosition 锚定 trigger：与 date-picker 同定位契约——
   逃出祖先 overflow 容器裁剪；右缘/底缘不足自动夹取或翻转，collisionPadding 兜底 */
.panel {
  position: fixed;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-dropdown, 1000));
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--oas-color-overlay) 25%, transparent);
  padding: var(--oas-space-3);
  display: none;
  box-sizing: border-box;
  width: 224px;
}
.panel.open {
  display: block;
}
.preset-title {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  margin-bottom: var(--oas-space-2);
}
.presets {
  display: grid;
  grid-template-columns: repeat(var(--preset-cols, 8), 1fr);
  gap: var(--oas-space-1);
  margin-bottom: var(--oas-space-3);
}
.preset {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--oas-radius-sm);
  border: 1px solid var(--oas-color-border);
  cursor: pointer;
  padding: 0;
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
.preset.alpha-checker {
  background-image: repeating-conic-gradient(
    var(--oas-color-bg-hover) 0% 25%,
    var(--oas-color-bg) 0% 50%
  );
  background-size: 8px 8px;
}
.preset:hover {
  transform: scale(1.12);
}
.preset:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  margin-bottom: var(--oas-space-2);
}
.row[hidden] {
  display: none;
}
.row label {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  width: 32px;
  flex-shrink: 0;
}
.row input[type='range'] {
  flex: 1;
  accent-color: var(--oas-color-primary);
}
.row input[type='number'] {
  box-sizing: border-box;
  width: 56px;
  height: var(--oas-control-height-sm);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-xs);
  font-family: inherit;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  padding: 0 var(--oas-space-1);
}
.row input[type='number']:focus {
  outline: none;
  border-color: var(--oas-color-primary);
}
.footer {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  margin-top: var(--oas-space-2);
  padding-top: var(--oas-space-2);
  border-top: 1px solid var(--oas-color-border);
}
.hex-input {
  box-sizing: border-box;
  flex: 1;
  min-width: 0;
  height: var(--oas-control-height-sm);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-xs);
  font-variant-numeric: tabular-nums;
  font-family: inherit;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  padding: 0 var(--oas-space-2);
}
.hex-input:focus {
  outline: none;
  border-color: var(--oas-color-primary);
}
.hex-input.invalid,
.hex-input[aria-invalid='true'] {
  border-color: var(--oas-color-danger);
}
.footer-button {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: var(--oas-control-height-sm);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
  font-family: inherit;
  cursor: pointer;
  padding: 0 var(--oas-space-2);
  flex-shrink: 0;
  transition: color var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out);
}
.footer-button:hover {
  color: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
}
.footer-button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.footer-button[hidden] {
  display: none;
}
.clear {
  color: var(--oas-color-text-secondary);
}
.clear:hover {
  color: var(--oas-color-danger);
  border-color: var(--oas-color-danger);
}
`

/** 图标为原始绘制（非字体图标/非位图），随 currentColor 换色 */
const EYEDROPPER_SVG = `
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M8 1.8c.1 0 4.6 4.7 4.6 7.4a4.6 4.6 0 0 1-9.2 0C3.4 6.5 7.9 1.8 8 1.8Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
    <circle cx="8" cy="9.2" r="1.5" fill="currentColor"/>
  </svg>
`

/** EyeDropper 全局（Chromium；能力检测用宽松类型） */
interface EyeDropperCtor {
  new (): { open(): Promise<{ sRGBHex: string }> }
}

export class OASColorPicker extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'preset',
      'disabled',
      'disabled-skip',
      'placement',
      'show-alpha',
      'disabled-alpha',
      'color-format',
      'clearable',
      'value-on-clear',
      'size',
      'show-text',
      'uppercase',
      'readonly',
      'open',
      'preset-columns',
      'preset-rows',
    ]
  }

  private triggerEl: HTMLButtonElement | null = null
  private panel: HTMLElement | null = null
  private presets: PresetEntry[] = DEFAULT_PRESETS
  private presetsSig = ''
  private color: RGBA = { ...DEFAULT_COLOR }
  private hasValue = false
  /** open 状态机当前值（open 属性为准；首帧不派发 oas-open-change） */
  private openSynced = false
  private booted = false
  private placementWarned = false

  // ---------- 属性读取 ----------

  private alphaEnabled(): boolean {
    return this.hasAttr('show-alpha')
  }

  private currentFormat(): 'hex' | 'rgb' {
    return this.getAttr('color-format', 'hex') === 'rgb' ? 'rgb' : 'hex'
  }

  private isLocked(): boolean {
    return this.injectDisabled() || this.hasAttr('readonly')
  }

  private outputOpts(): { format: 'hex' | 'rgb'; uppercase: boolean; alpha: boolean } {
    return {
      format: this.currentFormat(),
      uppercase: this.hasAttr('uppercase'),
      alpha: this.alphaEnabled(),
    }
  }

  // ---------- 模板（纯函数：SSR 快照与客户端共用，结构严格一致） ----------

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper">
        <button class="trigger" part="trigger" type="button"
          aria-haspopup="dialog" aria-expanded="false" aria-label="${this.t('colorPicker.label')}">
          <slot name="trigger"><span class="swatch" part="swatch"></span></slot>
          <span class="hex-text" part="hex-text"></span>
        </button>
        <div class="panel" part="panel" role="dialog" aria-label="${this.t('colorPicker.label')}">
          <div class="preset-title">${this.t('colorPicker.preset')}</div>
          <div class="presets" part="presets"></div>
          <div class="row">
            <label for="cp-hue">${this.t('colorPicker.hue')}</label>
            <input id="cp-hue" class="hue" type="range" min="0" max="360" step="1" aria-label="${this.t('colorPicker.hue')}" />
          </div>
          <div class="row">
            <label for="cp-sat">${this.t('colorPicker.saturation')}</label>
            <input id="cp-sat" class="sat" type="range" min="0" max="100" step="1" aria-label="${this.t('colorPicker.saturation')}" />
          </div>
          <div class="row">
            <label for="cp-val">${this.t('colorPicker.brightness')}</label>
            <input id="cp-val" class="val" type="range" min="0" max="100" step="1" aria-label="${this.t('colorPicker.brightness')}" />
          </div>
          <div class="row alpha-row">
            <label for="cp-alpha">${this.t('colorPicker.alpha')}</label>
            <input id="cp-alpha" class="alpha" type="range" min="0" max="100" step="1" aria-label="${this.t('colorPicker.alpha')}" />
          </div>
          <div class="row">
            <label for="cp-r">${this.t('colorPicker.red')}</label>
            <input id="cp-r" class="r" type="number" min="0" max="255" aria-label="${this.t('colorPicker.red')}" />
          </div>
          <div class="row">
            <label for="cp-g">${this.t('colorPicker.green')}</label>
            <input id="cp-g" class="g" type="number" min="0" max="255" aria-label="${this.t('colorPicker.green')}" />
          </div>
          <div class="row">
            <label for="cp-b">${this.t('colorPicker.blue')}</label>
            <input id="cp-b" class="b" type="number" min="0" max="255" aria-label="${this.t('colorPicker.blue')}" />
          </div>
          <div class="footer">
            <input class="hex-input" part="hex-input" spellcheck="false" autocomplete="off"
              aria-label="${this.t('colorPicker.hexInput')}" />
            <button type="button" class="eyedropper footer-button" part="eyedropper"
              aria-label="${this.t('colorPicker.eyedropper')}">${EYEDROPPER_SVG}</button>
            <button type="button" class="clear footer-button" part="clear"></button>
          </div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合共用） */
  private bind(): void {
    this.triggerEl = this.shadow.querySelector('[part="trigger"]')
    this.panel = this.shadow.querySelector('[part="panel"]')

    this.triggerEl?.addEventListener('click', () => this.toggleOpen())
    this.triggerEl?.addEventListener('keydown', (e) => {
      const key = (e as KeyboardEvent).key
      if (key === 'Escape' && this.hasAttr('open')) this.closeByKeyboard()
    })

    const range = (sel: string, fn: (v: string) => void): void => {
      this.shadow.querySelector<HTMLInputElement>(sel)?.addEventListener('input', (e) =>
        fn((e.target as HTMLInputElement).value),
      )
    }
    range('.hue', (v) => this.fromHsv(v, 'h'))
    range('.sat', (v) => this.fromHsv(v, 's'))
    range('.val', (v) => this.fromHsv(v, 'v'))
    range('.alpha', (v) => this.fromAlpha(v))
    const num = (sel: string, key: 'r' | 'g' | 'b'): void => {
      this.shadow.querySelector<HTMLInputElement>(sel)?.addEventListener('input', (e) =>
        this.fromRgb((e.target as HTMLInputElement).value, key),
      )
    }
    num('.r', 'r')
    num('.g', 'g')
    num('.b', 'b')

    const hex = this.shadow.querySelector<HTMLInputElement>('[part="hex-input"]')
    hex?.addEventListener('focus', (e) => (e.target as HTMLInputElement).select())
    hex?.addEventListener('input', (e) => this.validateHexInput(e.target as HTMLInputElement))
    hex?.addEventListener('change', (e) => this.commitHexInput(e.target as HTMLInputElement))

    const eye = this.shadow.querySelector<HTMLButtonElement>('[part="eyedropper"]')
    eye?.addEventListener('click', () => this.pickWithEyeDropper())
    this.shadow.querySelector<HTMLButtonElement>('[part="clear"]')?.addEventListener('click', () => this.clearValue())

    // 面板内 Esc 关闭（范围/数字/hex 输入获得焦点后仍可 Esc）
    this.panel?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape' && this.hasAttr('open')) this.closeByKeyboard()
    })

    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick, true))
    const reposition = (): void => {
      if (this.hasAttr('open') && !this.isLocked()) this.positionPanel()
    }
    window.addEventListener('resize', reposition)
    this.onCleanup(() => window.removeEventListener('resize', reposition))
    window.addEventListener('scroll', reposition, true)
    this.onCleanup(() => window.removeEventListener('scroll', reposition, true))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（trigger/panel 存在）后接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="trigger"]')) return false
    if (!this.shadow.querySelector('[part="panel"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const locked = this.isLocked()

    // open 状态机：open 属性为唯一真源（受控外改/内部切换统一收敛于此）；首帧不派发事件
    const open = !locked && this.hasAttr('open')
    if (this.openSynced !== open) {
      this.openSynced = open
      this.syncPanelOpen(open)
      if (this.booted && this.isConnected) this.emit('open-change', { open })
    }

    // value → 内部色
    this.syncColor()
    // trigger（文本/色块/禁用）
    this.syncTrigger()
    // 预设网格
    this.renderPresets()
    // 面板控件状态
    this.syncControls(open)
    // 打开态定位（面板内容尺寸落定后）
    if (open) this.positionPanel()

    this.booted = true
  }

  // ---------- 值同步 ----------

  /** value 宽容解析为内部 RGBA；空值进入占位态（内部色保持，供面板起始）；非法保留旧色 */
  private syncColor(): void {
    const raw = this.getAttr('value', '')
    this.hasValue = raw.trim() !== ''
    if (!this.hasValue) return
    const parsed = parseColor(raw)
    if (parsed) this.color = this.alphaEnabled() ? parsed : { ...parsed, a: 1 }
  }

  private displayText(): string {
    if (!this.hasValue) return this.t('colorPicker.empty')
    return formatColor(this.color, this.outputOpts())
  }

  private syncTrigger(): void {
    const triggerEl = this.triggerEl
    if (!triggerEl) return
    triggerEl.disabled = this.injectDisabled()
    triggerEl.setAttribute('aria-label', this.t('colorPicker.label'))

    const swatch = this.shadow.querySelector<HTMLElement>('.swatch')
    if (swatch) {
      swatch.classList.toggle('alpha-checker', this.alphaEnabled() && this.color.a < 1)
      if (this.hasValue) {
        swatch.style.backgroundColor = formatSwatch(this.color)
        swatch.removeAttribute('hidden')
      } else {
        swatch.style.backgroundColor = ''
        swatch.setAttribute('hidden', '')
      }
    }

    const text = this.shadow.querySelector<HTMLElement>('.hex-text')
    if (text) {
      const showText = this.getAttr('show-text', 'true') !== 'false'
      if (!showText) {
        text.setAttribute('hidden', '')
      } else {
        text.removeAttribute('hidden')
        text.classList.toggle('placeholder', !this.hasValue)
        text.textContent = this.displayText()
      }
    }
  }

  // ---------- 预设 ----------

  private parsePresets(): void {
    const raw = this.getAttr('preset', '')
    if (!raw.trim()) {
      this.presets = DEFAULT_PRESETS
      return
    }
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        this.presets = DEFAULT_PRESETS
        return
      }
      const entries: PresetEntry[] = []
      for (const item of parsed) {
        if (typeof item === 'string') {
          if (parseColor(item)) entries.push(item)
        } else if (item && typeof item === 'object') {
          const o = item as { color?: unknown; label?: unknown }
          if (typeof o.color === 'string' && parseColor(o.color)) {
            entries.push({ color: o.color, label: typeof o.label === 'string' ? o.label : undefined })
          }
        }
      }
      this.presets = entries.length > 0 ? entries : DEFAULT_PRESETS
    } catch {
      this.presets = DEFAULT_PRESETS
    }
  }

  /** 面板可见预设数：列 × 行（preset-rows 缺省不设上限，兼容一期 12 项全显） */
  private presetLimit(): number {
    const cols = this.presetColumns()
    const rows = Number.parseInt(this.getAttr('preset-rows', ''), 10)
    if (!Number.isFinite(rows) || rows <= 0) return Number.POSITIVE_INFINITY
    return cols * rows
  }

  private presetColumns(): number {
    const cols = Number.parseInt(this.getAttr('preset-columns', '8'), 10)
    return Number.isFinite(cols) && cols > 0 ? cols : 8
  }

  /** 预设只在内容签名变化时重建（避免每次 value 同步清空按钮、打断预设区焦点） */
  private renderPresets(): void {
    const sig = `${this.getAttr('preset', '')}|${this.getAttr('preset-columns', '')}|${this.getAttr('preset-rows', '')}`
    const box = this.shadow.querySelector<HTMLElement>('.presets')
    if (!box) return
    if (sig === this.presetsSig && box.childElementCount > 0) return
    this.presetsSig = sig
    this.parsePresets()
    box.style.setProperty('--preset-cols', String(this.presetColumns()))
    box.innerHTML = ''
    const limit = this.presetLimit()
    const max = Number.isFinite(limit) ? Math.min(this.presets.length, limit) : this.presets.length
    for (let i = 0; i < max; i++) {
      const entry = this.presets[i]!
      const item = typeof entry === 'string' ? { color: entry, label: entry } : entry
      const parsed = parseColor(item.color)
      if (!parsed) continue
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'preset'
      btn.setAttribute('part', 'preset')
      btn.style.backgroundColor = formatSwatch(parsed)
      if (parsed.a < 1) btn.classList.add('alpha-checker')
      btn.setAttribute('aria-label', item.label ?? item.color)
      btn.addEventListener('click', () => this.commit(parsed))
      box.appendChild(btn)
    }
  }

  // ---------- 开关 ----------

  private toggleOpen(): void {
    if (this.isLocked()) return
    if (this.hasAttr('open')) this.removeAttribute('open')
    else this.setAttribute('open', '')
  }

  private closeByKeyboard(): void {
    if (this.isLocked()) return
    this.removeAttribute('open')
  }

  private syncPanelOpen(open: boolean): void {
    if (!this.panel || !this.triggerEl) return
    this.panel.classList.toggle('open', open)
    this.triggerEl.setAttribute('aria-expanded', String(open))
    if (open) document.addEventListener('click', this.handleOutsideClick, true)
    else document.removeEventListener('click', this.handleOutsideClick, true)
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.closeByKeyboard()
    }
  }

  // ---------- 定位（FD1/FD2/FD3：computePosition 锚定 + 视口夹取/翻转） ----------

  private resolvePlacement(): Placement {
    const raw = this.getAttr('placement', 'bottom')
    if ((VALID_PLACEMENTS as readonly string[]).includes(raw)) return raw as Placement
    if (!this.placementWarned) {
      this.placementWarned = true
      console.warn(
        `[oas-color-picker] 非法 placement "${raw}"，已回落 bottom（支持 12 向：top/bottom/left/right × start/end）`,
      )
    }
    return 'bottom'
  }

  /** 交叉轴对齐自动调整：bottom-start 贴视口右缘右溢出 → 翻转 bottom-end（面板右缘对齐触发器右缘），反向同理 */
  private adjustCrossAlignment(
    anchor: DOMRect,
    popup: DOMRect,
    viewport: { width: number; height: number },
    placement: Placement,
  ): Placement {
    const main = placement.split('-')[0] as string
    if (main !== 'top' && main !== 'bottom') return placement
    if (placement.endsWith('-start') && anchor.left + popup.width > viewport.width - VIEWPORT_PADDING) {
      return `${main}-end` as Placement
    }
    if (placement.endsWith('-end') && anchor.right - popup.width < VIEWPORT_PADDING) {
      return `${main}-start` as Placement
    }
    return placement
  }

  private positionPanel(): void {
    if (!this.panel || !this.triggerEl) return
    const anchorRect = this.triggerEl.getBoundingClientRect()
    const popupRect = this.panel.getBoundingClientRect()
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const placement = this.adjustCrossAlignment(anchorRect, popupRect, viewport, this.resolvePlacement())
    const { top, left, placement: actual } = computePosition(
      anchorRect,
      popupRect,
      placement,
      viewport,
      PANEL_GAP,
      true,
      { collisionPadding: VIEWPORT_PADDING },
    )
    this.panel.style.top = `${top}px`
    this.panel.style.left = `${left}px`
    this.panel.setAttribute('data-placement', actual)
  }

  // ---------- 面板控件 ----------

  private syncControls(open: boolean): void {
    const { r, g, b, a } = this.color
    this.shadow.querySelector<HTMLInputElement>('.r')!.value = String(Math.round(r))
    this.shadow.querySelector<HTMLInputElement>('.g')!.value = String(Math.round(g))
    this.shadow.querySelector<HTMLInputElement>('.b')!.value = String(Math.round(b))
    const [h, s, v] = rgbToHsv(r, g, b)
    this.shadow.querySelector<HTMLInputElement>('.hue')!.value = String(Math.round(h))
    this.shadow.querySelector<HTMLInputElement>('.sat')!.value = String(Math.round(s * 100))
    this.shadow.querySelector<HTMLInputElement>('.val')!.value = String(Math.round(v * 100))

    const alphaOn = this.alphaEnabled()
    const alphaRow = this.shadow.querySelector<HTMLElement>('.alpha-row')
    if (alphaRow) alphaRow.toggleAttribute('hidden', !alphaOn)
    const alphaInput = this.shadow.querySelector<HTMLInputElement>('.alpha')
    if (alphaInput) {
      alphaInput.value = String(Math.round(a * 100))
      alphaInput.disabled = alphaOn && this.hasAttr('disabled-alpha')
    }

    // hex 输入条：仅在展开且未聚焦时回写（避免打断用户正在进行的编辑/光标）
    const hex = this.shadow.querySelector<HTMLInputElement>('[part="hex-input"]')
    if (hex && open && document.activeElement !== hex) {
      hex.value = this.displayText()
      hex.classList.remove('invalid')
      hex.removeAttribute('aria-invalid')
    }

    // clear 按钮：clearable + 有值 + 展开时可见
    const clear = this.shadow.querySelector<HTMLButtonElement>('[part="clear"]')
    if (clear) {
      const visible = this.hasAttr('clearable') && this.hasValue && open
      clear.toggleAttribute('hidden', !visible)
      clear.textContent = this.t('colorPicker.clear')
    }

    // 吸管：仅浏览器支持 EyeDropper 时可见
    const eye = this.shadow.querySelector<HTMLButtonElement>('[part="eyedropper"]')
    if (eye) eye.toggleAttribute('hidden', !this.eyeDropperSupported())
  }

  // ---------- 提交 ----------

  /** 统一提交入口：格式化写回 value + 派发 oas-change（值相同则不重复派发） */
  private commit(rgba: RGBA): void {
    if (this.isLocked()) return
    const color = this.alphaEnabled() ? rgba : { ...rgba, a: 1 }
    const out = formatColor(color, this.outputOpts())
    this.color = color
    if (this.getAttr('value', '') === out) {
      this.syncTrigger()
      this.syncControls(this.hasAttr('open'))
      return
    }
    this.setAttribute('value', out)
    this.emit('change', { value: out })
  }

  private fromHsv(value: string, which: 'h' | 's' | 'v'): void {
    const [h, s, v] = rgbToHsv(this.color.r, this.color.g, this.color.b)
    const num = Number(value) || 0
    const nextH = which === 'h' ? num : h
    const nextS = which === 's' ? num / 100 : s
    const nextV = which === 'v' ? num / 100 : v
    const { r, g, b } = hsvToRgb(nextH, nextS, nextV)
    this.commit({ r, g, b, a: this.color.a })
  }

  private fromRgb(value: string, which: 'r' | 'g' | 'b'): void {
    const next = { ...this.color, [which]: Number(value) || 0 }
    this.commit(next)
  }

  private fromAlpha(value: string): void {
    const next = { ...this.color, a: Math.min(1, Math.max(0, (Number(value) || 0) / 100)) }
    this.commit(next)
  }

  // ---------- hex 文本输入 ----------

  /** 输入过程实时校验（合法去红框；不做中途提交，避免打断多字符输入） */
  private validateHexInput(input: HTMLInputElement): void {
    if (input.value.trim() === '' || parseColor(input.value)) {
      input.classList.remove('invalid')
      input.removeAttribute('aria-invalid')
    } else {
      input.classList.add('invalid')
      input.setAttribute('aria-invalid', 'true')
    }
  }

  /** Enter/失焦提交：合法 → commit；非法 → 红框不生效（组件值不变） */
  private commitHexInput(input: HTMLInputElement): void {
    const raw = input.value.trim()
    if (raw === '') return
    const parsed = parseColor(raw)
    if (parsed) {
      this.commit(parsed)
      input.classList.remove('invalid')
      input.removeAttribute('aria-invalid')
    } else {
      input.classList.add('invalid')
      input.setAttribute('aria-invalid', 'true')
    }
  }

  // ---------- 清除 ----------

  private clearValue(): void {
    if (this.isLocked()) return
    const prev = this.getAttr('value', '')
    const fallback = this.getAttr('value-on-clear', '')
    if (fallback) this.setAttribute('value', fallback)
    else this.removeAttribute('value')
    this.emit('clear', { value: prev })
    this.emit('change', { value: fallback })
  }

  // ---------- 吸管 ----------

  private eyeDropperSupported(): boolean {
    const w = window as unknown as { EyeDropper?: unknown }
    return typeof w.EyeDropper === 'function'
  }

  private pickWithEyeDropper(): void {
    const w = window as unknown as { EyeDropper?: EyeDropperCtor }
    if (typeof w.EyeDropper !== 'function') return
    const picker = new w.EyeDropper()
    // 取到的为不透明 sRGBHex；保留现有 alpha（通道开启时），Esc/取消静默忽略
    picker
      .open()
      .then((res) => {
        const parsed = parseColor(res.sRGBHex)
        if (!parsed) return
        this.commit(this.alphaEnabled() ? { ...parsed, a: this.color.a } : parsed)
      })
      .catch(() => {
        /* 用户取消（AbortError）——保持现状 */
      })
  }
}
