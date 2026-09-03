import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'
import {
  parseColor,
  formatColor,
  formatSwatch,
  rgbToHsv,
  hsvToRgb,
  xyToSv,
  hueFromY,
  parseGradient,
  formatGradient,
  gradientAt,
  insertStop,
  removeStopAt,
  moveStop,
  type RGBA,
  type GradientStop,
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

/** 渐变 stop 最小/最大数量（编辑器内受控，保证至少双 stop 语义完整） */
const MIN_GRAD_STOPS = 2
const MAX_GRAD_STOPS = 8

/** 2D 色域 / hue 竖条方向键微调步长（s/v/hue） */
const KEY_STEP = 0.01
const HUE_KEY_STEP = 1

/** 预设项：字符串任意 CSS 颜色，或 { color, label }（label 供可访问名） */
type PresetEntry = string | { color: string; label?: string }

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
:host([inline]) {
  display: block;
}
.wrapper {
  position: relative;
  display: inline-block;
}
:host([inline]) .wrapper {
  display: block;
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
:host([inline]) .trigger {
  display: none;
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
.swatch.grad-swatch {
  background-size: 100% 100%;
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
/* inline：面板就地渲染（host 自组弹层场景），无 popup 定位契约 */
:host([inline]) .panel {
  position: static;
  display: block;
  width: 100%;
  box-shadow: none;
  border-radius: var(--oas-radius-md);
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
.preset[hidden] {
  display: none;
}
/* 渐变编辑区（仅 mode=gradient） */
.grad {
  margin-bottom: var(--oas-space-3);
}
.grad[hidden] {
  display: none;
}
.grad-head {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--oas-space-1);
  margin-bottom: var(--oas-space-1);
}
.grad-tools {
  display: inline-flex;
  gap: var(--oas-space-1);
}
.grad-track {
  position: relative;
  height: 18px;
  border-radius: var(--oas-radius-sm);
  border: 1px solid var(--oas-color-border);
  overflow: visible;
}
.grad-bg {
  position: absolute;
  inset: 0;
  border-radius: var(--oas-radius-sm);
}
.grad-stops {
  position: absolute;
  inset: 0;
}
.grad-stop {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  box-sizing: border-box;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid var(--oas-color-bg);
  box-shadow: 0 0 0 1px var(--oas-color-border);
  cursor: ew-resize;
  touch-action: none;
}
.grad-stop[data-active='true'] {
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
  z-index: 2;
}
.grad-stop:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 2D 色域行：saturation/brightness 平面 + 右侧 hue 竖条 */
.sv-row {
  display: flex;
  gap: var(--oas-space-2);
  margin-bottom: var(--oas-space-2);
}
.sv2d {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  height: 140px;
  border-radius: var(--oas-radius-sm);
  border: 1px solid var(--oas-color-border);
  cursor: crosshair;
  touch-action: none;
}
.sv2d:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.sv2d-thumb,
.hue-thumb {
  position: absolute;
  box-sizing: border-box;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--oas-color-bg);
  box-shadow: 0 0 0 1px var(--oas-color-border);
  pointer-events: none;
}
.sv2d-thumb {
  transform: translate(-50%, -50%);
}
.hue {
  position: relative;
  flex: 0 0 16px;
  height: 140px;
  border-radius: var(--oas-radius-sm);
  border: 1px solid var(--oas-color-border);
  cursor: ns-resize;
  touch-action: none;
}
.hue:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.hue-thumb {
  left: 50%;
  transform: translate(-50%, -50%);
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
.footer-button:hover:not(:disabled) {
  color: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
}
.footer-button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.footer-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
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
.grad-add,
.grad-remove {
  padding: 0;
  width: 20px;
  height: 20px;
}
`

/** 图标为原始绘制（非字体图标/非位图），随 currentColor 换色 */
const EYEDROPPER_SVG = `
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M8 1.8c.1 0 4.6 4.7 4.6 7.4a4.6 4.6 0 0 1-9.2 0C3.4 6.5 7.9 1.8 8 1.8Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
    <circle cx="8" cy="9.2" r="1.5" fill="currentColor"/>
  </svg>
`

/** 渐变工具按钮图标（+ / − 原始绘制） */
const PLUS_SVG = `<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false"><path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`
const MINUS_SVG = `<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false"><path d="M1 5h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`

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
      'mode',
      'inline',
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
  /** 渐变模式 stops（mode=gradient 时生效；single 模式保持旧单色语义） */
  private gradStops: GradientStop[] = []
  /** 渐变当前选中 stop 下标 */
  private activeStop = 0
  /** 渐变 stop DOM 是否已按当前数量建立（数量变化才重建，避免每次更新打断焦点） */
  private gradStopsSig = -1
  /** 2D/hue/stop 拖拽临时态 */
  private dragging: 'sv' | 'hue' | 'grad' | null = null
  private dragIndex = -1
  private rafId: number | null = null
  /** 拖拽 rAF 累积的最新落点动作（pointermove 只更新此闭包，rAF/up 时统一消费） */
  private dragApply: (() => void) | null = null

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

  private isInline(): boolean {
    return this.hasAttr('inline')
  }

  private isGradientMode(): boolean {
    return this.getAttr('mode', 'single') === 'gradient'
  }

  private outputOpts(): { format: 'hex' | 'rgb'; uppercase: boolean; alpha: boolean } {
    return {
      format: this.currentFormat(),
      uppercase: this.hasAttr('uppercase'),
      alpha: this.alphaEnabled(),
    }
  }

  /** 归一 alpha：show-alpha 关闭时强制 1（与一期单色通道一致） */
  private normalizeAlpha(rgba: RGBA): RGBA {
    return this.alphaEnabled() ? rgba : { ...rgba, a: 1 }
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
          <div class="grad" hidden>
            <div class="grad-head">
              <div class="grad-tools">
                <button type="button" class="grad-add footer-button" part="grad-add"
                  aria-label="${this.t('dynamicInput.add')}">${PLUS_SVG}</button>
                <button type="button" class="grad-remove footer-button" part="grad-remove"
                  aria-label="${this.t('dynamicInput.remove')}" disabled>${MINUS_SVG}</button>
              </div>
            </div>
            <div class="grad-track" part="grad-track">
              <div class="grad-bg" part="grad-bg"></div>
              <div class="grad-stops"></div>
            </div>
          </div>
          <div class="sv-row">
            <div class="sv2d" part="sv" role="slider" tabindex="0"
              aria-label="${this.t('colorPicker.saturation')} / ${this.t('colorPicker.brightness')}"
              aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" aria-valuetext=""></div>
            <div class="hue" part="hue" role="slider" tabindex="0" aria-orientation="vertical"
              aria-label="${this.t('colorPicker.hue')}"
              aria-valuemin="0" aria-valuemax="360" aria-valuenow="0"></div>
          </div>
          <div class="row alpha-row" hidden>
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

    const num = (sel: string, key: 'r' | 'g' | 'b'): void => {
      this.shadow.querySelector<HTMLInputElement>(sel)?.addEventListener('input', (e) =>
        this.fromRgb((e.target as HTMLInputElement).value, key),
      )
    }
    num('.r', 'r')
    num('.g', 'g')
    num('.b', 'b')

    const alpha = this.shadow.querySelector<HTMLInputElement>('.alpha')
    alpha?.addEventListener('input', (e) => this.fromAlpha((e.target as HTMLInputElement).value))

    const hex = this.shadow.querySelector<HTMLInputElement>('[part="hex-input"]')
    hex?.addEventListener('focus', (e) => (e.target as HTMLInputElement).select())
    hex?.addEventListener('input', (e) => this.validateHexInput(e.target as HTMLInputElement))
    hex?.addEventListener('change', (e) => this.commitHexInput(e.target as HTMLInputElement))

    const eye = this.shadow.querySelector<HTMLButtonElement>('[part="eyedropper"]')
    eye?.addEventListener('click', () => this.pickWithEyeDropper())
    this.shadow.querySelector<HTMLButtonElement>('[part="clear"]')?.addEventListener('click', () => this.clearValue())

    // 2D 色域 + hue 竖条：键盘（角色 slider）
    const sv = this.shadow.querySelector<HTMLElement>('.sv2d')
    sv?.addEventListener('keydown', (e) => this.onSvKey(e as KeyboardEvent))
    sv?.addEventListener('pointerdown', (e) => this.startSvDrag(e as PointerEvent))
    const hue = this.shadow.querySelector<HTMLElement>('.hue')
    hue?.addEventListener('keydown', (e) => this.onHueKey(e as KeyboardEvent))
    hue?.addEventListener('pointerdown', (e) => this.startHueDrag(e as PointerEvent))

    // 渐变编辑器
    const gradAdd = this.shadow.querySelector<HTMLButtonElement>('[part="grad-add"]')
    gradAdd?.addEventListener('click', () => this.addGradStop())
    const gradRemove = this.shadow.querySelector<HTMLButtonElement>('[part="grad-remove"]')
    gradRemove?.addEventListener('click', () => this.removeActiveStop())
    const gradTrack = this.shadow.querySelector<HTMLElement>('.grad-track')
    gradTrack?.addEventListener('pointerdown', (e) => this.onGradPointerDown(e as PointerEvent))
    const gradStops = this.shadow.querySelector<HTMLElement>('.grad-stops')
    gradStops?.addEventListener('keydown', (e) => this.onGradStopKey(e as KeyboardEvent))
    // stop 获得焦点（Tab/点按）即选中：编辑面跟随
    gradStops?.addEventListener('focusin', (e) => {
      const handle = (e.target as HTMLElement).closest?.('.grad-stop')
      if (!handle || !this.shadow.contains(handle)) return
      const index = Array.from(this.shadow.querySelectorAll('.grad-stop')).indexOf(handle)
      if (index >= 0) this.selectStop(index)
    })

    // 面板内 Esc 关闭（数字/hex 输入获得焦点后仍可 Esc）
    this.panel?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape' && this.hasAttr('open')) this.closeByKeyboard()
    })

    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick, true))
    this.onCleanup(() => this.endDrag())
    this.onCleanup(() => {
      if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    })
    const reposition = (): void => {
      if (!this.isInline() && this.hasAttr('open') && !this.isLocked()) this.positionPanel()
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
    const inline = this.isInline()

    // inline：面板常显、无 popup 语义；否则走 open 状态机（首帧不派发事件）
    if (!inline) {
      const open = !locked && this.hasAttr('open')
      if (this.openSynced !== open) {
        this.openSynced = open
        this.syncPanelOpen(open)
        if (this.booted && this.isConnected) this.emit('open-change', { open })
      }
    } else {
      this.openSynced = true
      this.panel?.classList.add('open')
      this.triggerEl?.setAttribute('aria-expanded', 'true')
    }

    // value → 内部状态（单色 / 渐变）
    this.syncValue()
    // trigger（文本/色块/禁用）
    this.syncTrigger()
    // 预设网格
    this.renderPresets()
    // 渐变编辑器显隐 + stops 同步
    this.syncGradControls()
    // 面板控件状态
    this.syncControls()
    // 打开态定位（面板内容尺寸落定后）
    if (!inline && !locked && this.hasAttr('open')) this.positionPanel()
    this.booted = true
  }

  // ---------- 值同步 ----------

  /** 当前编辑色：渐变模式取活动 stop，单色模式取整色 */
  private editColor(): RGBA {
    if (this.isGradientMode()) {
      const s = this.gradStops[this.activeStop]
      return s ? s.color : this.color
    }
    return this.color
  }

  private syncValue(): void {
    const raw = this.getAttr('value', '')
    this.hasValue = raw.trim() !== ''
    if (this.isGradientMode()) this.syncGradientValue(raw)
    else this.syncSingleValue(raw)
  }

  /** 单色（一期契约）：宽容解析 → 内部 RGBA；空值占位（内部色保持）；非法保留旧色 */
  private syncSingleValue(raw: string): void {
    if (!raw.trim()) return
    const parsed = parseColor(raw)
    if (parsed) this.color = this.normalizeAlpha(parsed)
  }

  /**
   * 渐变模式 value → stops。
   * - 能按 linear-gradient 解析 → 直接用其 stops
   * - 是纯色串（值尚未被编辑器改写）→ 平铺为双 stop 同色（视觉即纯色，供继续编辑）
   * - 空/非法 → 保留上次 stops（空值起始用默认色铺两条）
   */
  private syncGradientValue(raw: string): void {
    if (!raw.trim()) {
      if (this.gradStops.length === 0) this.seedGradient()
      return
    }
    const parsed = parseGradient(raw)
    if (parsed && parsed.length >= 2) {
      this.gradStops = parsed.map((s) => ({ pos: s.pos, color: this.normalizeAlpha(s.color) }))
      this.activeStop = Math.min(this.activeStop, this.gradStops.length - 1)
      return
    }
    const solid = parseColor(raw)
    if (solid) {
      const c = this.normalizeAlpha(solid)
      this.gradStops = [
        { pos: 0, color: { ...c } },
        { pos: 1, color: { ...c } },
      ]
      this.activeStop = 0
      return
    }
    if (this.gradStops.length === 0) this.seedGradient()
  }

  /** 无值时的渐变起始态：默认色铺 0/100 两条 */
  private seedGradient(): void {
    const c = this.normalizeAlpha({ ...DEFAULT_COLOR })
    this.gradStops = [
      { pos: 0, color: { ...c } },
      { pos: 1, color: { ...c } },
    ]
    this.activeStop = 0
  }

  private displayText(): string {
    if (!this.hasValue) return this.t('colorPicker.empty')
    if (this.isGradientMode()) {
      const raw = this.getAttr('value', '')
      if (parseGradient(raw)) return raw
      // value 为纯色（尚未经编辑器改写为渐变串）：按单色展示，保持与 value 一致
      if (parseColor(raw)) return formatColor(this.normalizeAlpha(parseColor(raw)!), this.outputOpts())
      // 非法 value：展示兜底渐变（与单色模式非法时展示内部色一致）
      return formatGradient(this.gradStops, this.outputOpts())
    }
    return formatColor(this.color, this.outputOpts())
  }

  private syncTrigger(): void {
    const triggerEl = this.triggerEl
    if (!triggerEl) return
    triggerEl.disabled = this.injectDisabled()
    triggerEl.setAttribute('aria-label', this.t('colorPicker.label'))

    const swatch = this.shadow.querySelector<HTMLElement>('.swatch')
    if (swatch) {
      const grad = this.isGradientMode()
      swatch.classList.toggle('alpha-checker', !grad && this.alphaEnabled() && this.color.a < 1)
      swatch.classList.toggle('grad-swatch', grad)
      if (this.hasValue) {
        if (grad) {
          swatch.style.backgroundImage = formatGradient(this.gradStops, { alpha: true })
          swatch.style.backgroundColor = ''
        } else {
          swatch.style.backgroundImage = ''
          swatch.style.backgroundColor = formatSwatch(this.color)
        }
        swatch.removeAttribute('hidden')
      } else {
        swatch.style.backgroundImage = ''
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
    if (this.isLocked() || this.isInline()) return
    if (this.hasAttr('open')) this.removeAttribute('open')
    else this.setAttribute('open', '')
  }

  private closeByKeyboard(): void {
    if (this.isLocked() || this.isInline()) return
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

  // ---------- 渐变编辑器 ----------

  /** 渐变模式显隐 + stops DOM 数量签名同步 + 背景/手柄绘制 */
  private syncGradControls(): void {
    const grad = this.shadow.querySelector<HTMLElement>('.grad')
    if (!grad) return
    if (!this.isGradientMode()) {
      grad.toggleAttribute('hidden', true)
      // 退出渐变模式后，stop 数量签名失效：再进入时强制重建 DOM
      this.gradStopsSig = -1
      return
    }
    grad.toggleAttribute('hidden', false)
    if (this.gradStops.length < 2) this.seedGradient()
    const n = this.gradStops.length
    if (this.activeStop >= n) this.activeStop = n - 1
    const box = this.shadow.querySelector<HTMLElement>('.grad-stops')
    if (!box) return
    // 数量变化 → 重建手柄（避免每次 value 同步重建打断拖拽/焦点）
    if (this.gradStopsSig !== n) {
      this.gradStopsSig = n
      box.innerHTML = ''
      for (let i = 0; i < n; i++) {
        const stop = this.gradStops[i]
        if (!stop) continue
        const h = document.createElement('div')
        h.className = 'grad-stop'
        h.setAttribute('role', 'slider')
        h.setAttribute('tabindex', '0')
        h.setAttribute('aria-orientation', 'horizontal')
        h.setAttribute('aria-valuemin', '0')
        h.setAttribute('aria-valuemax', '100')
        // 色标无专属文案 key（i18n 表由主 agent 收口），可访问名用「位置 % + 颜色值」数据自述
        h.setAttribute('aria-label', `${formatColor(stop.color, { alpha: true })} ${Math.round(stop.pos * 100)}%`)
        h.setAttribute('aria-valuetext', `${formatColor(stop.color, { alpha: true })} ${Math.round(stop.pos * 100)}%`)
        box.appendChild(h)
      }
    }
    // 背景
    const bg = this.shadow.querySelector<HTMLElement>('.grad-bg')
    if (bg) bg.style.background = this.gradBgCss()
    // 每个手柄位置与颜色
    const handles = box.querySelectorAll<HTMLElement>('.grad-stop')
    for (let i = 0; i < handles.length; i++) {
      const stop = this.gradStops[i]
      const h = handles[i]
      if (!stop || !h) continue
      h.style.left = `${stop.pos * 100}%`
      h.style.backgroundColor = formatSwatch(stop.color)
      h.setAttribute('data-active', String(i === this.activeStop))
      h.setAttribute('aria-valuenow', String(Math.round(stop.pos * 100)))
      h.setAttribute('aria-valuetext', `${formatColor(stop.color, { alpha: true })} ${Math.round(stop.pos * 100)}%`)
    }
    // 移除按钮可用态
    const remove = this.shadow.querySelector<HTMLButtonElement>('[part="grad-remove"]')
    if (remove) remove.disabled = this.gradStops.length <= MIN_GRAD_STOPS
  }

  /** 渐变轨道背景（纯色 stop 内插；颜色走 formatSwatch 全精度） */
  private gradBgCss(): string {
    const parts = this.gradStops.map(
      (s) => `${formatSwatch(s.color)} ${Math.round(s.pos * 100)}%`,
    )
    return `linear-gradient(90deg, ${parts.join(', ')})`
  }

  /** 添加 stop：插在最大空隙中点，颜色取该处插值；最多 MAX_GRAD_STOPS */
  private addGradStop(): void {
    if (this.isLocked() || !this.isGradientMode()) return
    if (this.gradStops.length >= MAX_GRAD_STOPS) return
    const pos = this.maxGapPos()
    const color = gradientAt(this.gradStops, pos)
    this.gradStops = insertStop(this.gradStops, pos, this.normalizeAlpha(color))
    this.activeStop = this.gradStops.findIndex((s) => Math.abs(s.pos - pos) < 1e-6)
    if (this.activeStop < 0) this.activeStop = this.gradStops.length - 1
    this.gradStopsSig = -1
    this.commitGradient()
  }

  /** 最大空隙中点（无空隙取末端外侧） */
  private maxGapPos(): number {
    const n = this.gradStops.length
    if (n === 0) return 0.5
    if (n === 1) return this.gradStops[0]!.pos >= 0.5 ? 0 : 1
    let best = 0
    let bestPos = this.gradStops[0]!.pos / 2
    for (let i = 0; i < n - 1; i++) {
      const a = this.gradStops[i]!.pos
      const b = this.gradStops[i + 1]!.pos
      const gap = b - a
      if (gap > best) {
        best = gap
        bestPos = a + gap / 2
      }
    }
    // 两端外侧空余也算候选
    const first = this.gradStops[0]!.pos
    const last = this.gradStops[n - 1]!.pos
    if (first > best) {
      best = first
      bestPos = first / 2
    }
    if (1 - last > best) {
      best = 1 - last
      bestPos = last + (1 - last) / 2
    }
    return bestPos
  }

  private removeActiveStop(): void {
    if (this.isLocked() || !this.isGradientMode()) return
    if (this.gradStops.length <= MIN_GRAD_STOPS) return
    const idx = this.activeStop
    this.gradStops = removeStopAt(this.gradStops, idx)
    this.activeStop = Math.min(idx, this.gradStops.length - 1)
    this.gradStopsSig = -1
    this.commitGradient()
  }

  private selectStop(index: number): void {
    if (!this.isGradientMode() || this.gradStops.length === 0) return
    this.activeStop = Math.min(Math.max(index, 0), this.gradStops.length - 1)
    // 编辑面（rgb/hex/alpha/2D）跟随活动 stop 色
    this.color = this.editColor()
    this.syncGradControls()
    this.syncControls()
  }

  private onGradStopKey(e: KeyboardEvent): void {
    const handle = (e.target as HTMLElement).closest?.('.grad-stop')
    if (!handle || !this.shadow.contains(handle)) return
    const index = Array.from(this.shadow.querySelectorAll('.grad-stop')).indexOf(handle)
    if (index < 0 || this.isLocked() || !this.isGradientMode()) return
    const key = e.key
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      e.preventDefault()
      const dir = key === 'ArrowLeft' ? -1 : 1
      const cur = this.gradStops[index]!.pos
      this.gradStops = moveStop(this.gradStops, index, cur + dir * KEY_STEP)
      this.activeStop = index
      this.commitGradient()
    } else if (key === 'Delete' || key === 'Backspace') {
      e.preventDefault()
      this.selectStop(index)
      this.removeActiveStop()
    }
  }

  private onGradPointerDown(e: PointerEvent): void {
    if (this.isLocked() || !this.isGradientMode()) return
    const track = (e.target as HTMLElement).closest('.grad-track')
    if (!track || !this.shadow.contains(track)) return
    const stopEl = (e.target as HTMLElement).closest('.grad-stop')
    const rect = track.getBoundingClientRect()
    const pos = rect.width ? (e.clientX - rect.left) / rect.width : 0
    const clampPos = Math.min(Math.max(pos, 0), 1)
    if (stopEl) {
      // 拖拽既有 stop：定位到最近手柄
      const index = Array.from(this.shadow.querySelectorAll('.grad-stop')).indexOf(stopEl as HTMLElement)
      if (index >= 0) {
        this.activeStop = index
        this.dragging = 'grad'
        this.dragIndex = index
        this.applyGradPos(clampPos)
        this.attachDragListeners()
      }
    } else {
      // 空白区：距离最近手柄足够远时新增（就近则仅选中）
      const near = this.gradStops.findIndex((s) => Math.abs(s.pos - clampPos) < 0.025)
      if (near >= 0) {
        this.selectStop(near)
      } else {
        this.addStopAt(clampPos)
      }
    }
    e.preventDefault()
  }

  private addStopAt(pos: number): void {
    if (this.gradStops.length >= MAX_GRAD_STOPS) return
    const color = gradientAt(this.gradStops, pos)
    this.gradStops = insertStop(this.gradStops, pos, this.normalizeAlpha(color))
    this.activeStop = this.gradStops.findIndex((s) => Math.abs(s.pos - pos) < 1e-6)
    if (this.activeStop < 0) this.activeStop = this.gradStops.length - 1
    this.gradStopsSig = -1
    this.commitGradient()
  }

  /** 拖拽中把 stop 移动到 pos（夹取到邻居之间） */
  private applyGradPos(pos: number): void {
    if (this.dragIndex < 0 || !this.gradStops[this.dragIndex]) return
    this.gradStops = moveStop(this.gradStops, this.dragIndex, Math.min(Math.max(pos, 0), 1))
    this.commitGradient()
  }

  /** rAF 节流：累积最新动作，一帧只消费一次 */
  private scheduleApply(fn: () => void): void {
    this.dragApply = fn
    if (this.rafId !== null) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      if (!this.dragging) return
      const fn2 = this.dragApply
      this.dragApply = null
      if (fn2) fn2()
    })
  }

  /** 提交渐变值（value = formatGradient 规范串；颜色格式沿 color-format/uppercase/show-alpha） */
  private commitGradient(): void {
    if (this.isLocked()) return
    if (this.gradStops.length < 2) return
    const out = formatGradient(this.gradStops, this.outputOpts())
    if (this.getAttr('value', '') === out) {
      this.syncControls()
      return
    }
    this.setAttribute('value', out)
    this.emit('change', { value: out })
  }

  // ---------- 2D 色域 + hue 竖条 ----------

  private hsvOfEdit(): [number, number, number] {
    const { r, g, b } = this.editColor()
    return rgbToHsv(r, g, b)
  }

  private onSvKey(e: KeyboardEvent): void {
    if (this.isLocked()) return
    const [h, s, v] = this.hsvOfEdit()
    let ns = s
    let nv = v
    const key = e.key
    if (key === 'ArrowLeft') ns = Math.max(0, s - KEY_STEP)
    else if (key === 'ArrowRight') ns = Math.min(1, s + KEY_STEP)
    else if (key === 'ArrowUp') nv = Math.min(1, v + KEY_STEP)
    else if (key === 'ArrowDown') nv = Math.max(0, v - KEY_STEP)
    else if (key === 'Home') ns = 0
    else if (key === 'End') ns = 1
    else return
    e.preventDefault()
    this.commitFromSv(ns, nv)
  }

  private onHueKey(e: KeyboardEvent): void {
    if (this.isLocked()) return
    const [h] = this.hsvOfEdit()
    let nh = h
    const key = e.key
    if (key === 'ArrowUp') nh = Math.min(360, h + HUE_KEY_STEP)
    else if (key === 'ArrowDown') nh = Math.max(0, h - HUE_KEY_STEP)
    else if (key === 'Home') nh = 0
    else if (key === 'End') nh = 360
    else return
    e.preventDefault()
    this.commitFromHue(nh)
  }

  private startSvDrag(e: PointerEvent): void {
    if (this.isLocked()) return
    const sv = this.shadow.querySelector<HTMLElement>('.sv2d')
    if (!sv) return
    sv.focus()
    this.dragging = 'sv'
    this.applySvPointer(e, sv)
    this.attachDragListeners()
    e.preventDefault()
  }

  private startHueDrag(e: PointerEvent): void {
    if (this.isLocked()) return
    const hue = this.shadow.querySelector<HTMLElement>('.hue')
    if (!hue) return
    hue.focus()
    this.dragging = 'hue'
    this.applyHuePointer(e, hue)
    this.attachDragListeners()
    e.preventDefault()
  }

  private attachDragListeners(): void {
    document.addEventListener('pointermove', this.onDragMove)
    document.addEventListener('pointerup', this.endDrag)
  }

  private onDragMove = (e: PointerEvent): void => {
    if (!this.dragging) return
    if (this.dragging === 'grad') {
      const track = this.shadow.querySelector<HTMLElement>('.grad-track')
      if (!track) return
      const rect = track.getBoundingClientRect()
      if (!rect.width) return
      const pos = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
      this.scheduleApply(() => this.applyGradPos(pos))
      return
    }
    if (this.dragging === 'sv') {
      const sv = this.shadow.querySelector<HTMLElement>('.sv2d')
      if (!sv) return
      const rect = sv.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      const [s, v] = xyToSv(x, y)
      this.scheduleApply(() => this.commitFromSv(s, v))
      return
    }
    if (this.dragging === 'hue') {
      const hue = this.shadow.querySelector<HTMLElement>('.hue')
      if (!hue) return
      const rect = hue.getBoundingClientRect()
      if (!rect.height) return
      const hueVal = hueFromY((e.clientY - rect.top) / rect.height)
      this.scheduleApply(() => this.commitFromHue(hueVal))
    }
  }

  private applySvPointer(e: PointerEvent, sv: HTMLElement): void {
    const rect = sv.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const [s, v] = xyToSv(x, y)
    this.commitFromSv(s, v)
  }

  private applyHuePointer(e: PointerEvent, hue: HTMLElement): void {
    const rect = hue.getBoundingClientRect()
    if (!rect.height) return
    const y = (e.clientY - rect.top) / rect.height
    this.commitFromHue(hueFromY(y))
  }

  private endDrag = (): void => {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    if (!this.dragging) return
    // 释放前冲刷最后一次 rAF 累积（松手不丢最后一段位置）
    const fn = this.dragApply
    this.dragApply = null
    if (fn) fn()
    this.dragging = null
    this.dragIndex = -1
    document.removeEventListener('pointermove', this.onDragMove)
    document.removeEventListener('pointerup', this.endDrag)
  }

  private commitFromSv(s: number, v: number): void {
    const [h] = this.hsvOfEdit()
    const { r, g, b } = hsvToRgb(h, s, v)
    this.commit({ r, g, b, a: this.editColor().a })
  }

  private commitFromHue(hue: number): void {
    const [, s, v] = this.hsvOfEdit()
    const { r, g, b } = hsvToRgb(hue, s, v)
    this.commit({ r, g, b, a: this.editColor().a })
  }

  // ---------- 面板控件 ----------

  private syncControls(): void {
    const { r, g, b, a } = this.editColor()
    this.shadow.querySelector<HTMLInputElement>('.r')!.value = String(Math.round(r))
    this.shadow.querySelector<HTMLInputElement>('.g')!.value = String(Math.round(g))
    this.shadow.querySelector<HTMLInputElement>('.b')!.value = String(Math.round(b))
    const [h, s, v] = rgbToHsv(r, g, b)
    // 2D 色域背景（hue 驱动）+ 光标
    const sv = this.shadow.querySelector<HTMLElement>('.sv2d')
    if (sv) {
      sv.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h} 100% 50%))`
      sv.setAttribute('aria-valuenow', String(Math.round(s * 100)))
      sv.setAttribute('aria-valuetext', `${this.t('colorPicker.saturation')} ${Math.round(s * 100)}%，${this.t('colorPicker.brightness')} ${Math.round(v * 100)}%`)
      const thumb = sv.querySelector<HTMLElement>('.sv2d-thumb') ?? this.makeSvThumb(sv)
      thumb.style.left = `${s * 100}%`
      thumb.style.top = `${(1 - v) * 100}%`
      thumb.style.backgroundColor = formatSwatch(this.editColor())
    }
    // hue 竖条背景 + 光标
    const hue = this.shadow.querySelector<HTMLElement>('.hue')
    if (hue) {
      hue.style.background = hueGradientCss()
      hue.setAttribute('aria-valuenow', String(Math.round(h)))
      const thumb = hue.querySelector<HTMLElement>('.hue-thumb') ?? this.makeHueThumb(hue)
      thumb.style.top = `${((360 - h) / 360) * 100}%`
      thumb.style.backgroundColor = formatSwatch(this.editColor())
    }
    const alphaOn = this.alphaEnabled()
    const alphaRow = this.shadow.querySelector<HTMLElement>('.alpha-row')
    if (alphaRow) alphaRow.toggleAttribute('hidden', !alphaOn)
    const alphaInput = this.shadow.querySelector<HTMLInputElement>('.alpha')
    if (alphaInput) {
      alphaInput.value = String(Math.round(a * 100))
      alphaInput.disabled = alphaOn && this.hasAttr('disabled-alpha')
    }

    // hex 输入条：内容 = 单色格式化文本（渐变模式 = 活动 stop 色）；仅在展开/未聚焦时回写
    const hex = this.shadow.querySelector<HTMLInputElement>('[part="hex-input"]')
    const open = this.isInline() || (this.hasAttr('open') && !this.isLocked())
    if (hex && open && document.activeElement !== hex) {
      hex.value = this.hexInputText()
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

  private makeSvThumb(sv: HTMLElement): HTMLElement {
    const t = document.createElement('div')
    t.className = 'sv2d-thumb'
    t.setAttribute('aria-hidden', 'true')
    sv.appendChild(t)
    return t
  }

  private makeHueThumb(hue: HTMLElement): HTMLElement {
    const t = document.createElement('div')
    t.className = 'hue-thumb'
    t.setAttribute('aria-hidden', 'true')
    hue.appendChild(t)
    return t
  }

  /** hex 输入条文本：渐变模式取活动 stop 单色，其余取整体显示文本 */
  private hexInputText(): string {
    if (this.isGradientMode()) {
      return formatColor(this.editColor(), this.outputOpts())
    }
    return this.displayText()
  }

  // ---------- 提交 ----------

  /** 统一提交入口：单色模式写回 value；渐变模式改写活动 stop 色并序列化渐变 */
  private commit(rgba: RGBA): void {
    if (this.isLocked()) return
    const color = this.normalizeAlpha(rgba)
    if (this.isGradientMode()) {
      if (this.gradStops.length === 0) this.seedGradient()
      const stops = this.gradStops.map((s, i) => ({
        pos: s.pos,
        color: i === this.activeStop ? { ...color } : { ...s.color },
      }))
      this.gradStops = stops
      this.color = color
      this.commitGradient()
      return
    }
    const out = formatColor(color, this.outputOpts())
    this.color = color
    if (this.getAttr('value', '') === out) {
      this.syncTrigger()
      this.syncControls()
      return
    }
    this.setAttribute('value', out)
    this.emit('change', { value: out })
  }

  private fromRgb(value: string, which: 'r' | 'g' | 'b'): void {
    const base = this.editColor()
    const next = { ...base, [which]: Number(value) || 0 }
    this.commit(next)
  }

  private fromAlpha(value: string): void {
    const base = this.editColor()
    const next = { ...base, a: Math.min(1, Math.max(0, (Number(value) || 0) / 100)) }
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
        this.commit(this.alphaEnabled() ? { ...parsed, a: this.editColor().a } : parsed)
      })
      .catch(() => {
        /* 用户取消（AbortError）——保持现状 */
      })
  }
}

/** hue 竖条背景：顶部 360°（红）→ 底部 0°（红）的彩虹；stop 百分比与 thumb 位置一致
    （hue h 的视觉位置 y = (360 - h)/360，故 stop 颜色按 y 升序排列） */
function hueGradientCss(): string {
  const stops = [
    [360, '#ff0000'],
    [300, '#ff00ff'],
    [240, '#0000ff'],
    [180, '#00ffff'],
    [120, '#00ff00'],
    [60, '#ffff00'],
    [0, '#ff0000'],
  ] as const
  const parts = stops.map(([h, c]) => `${c} ${Math.round(((360 - h) / 360) * 1000) / 10}%`)
  return `linear-gradient(to bottom, ${parts.join(', ')})`
}
