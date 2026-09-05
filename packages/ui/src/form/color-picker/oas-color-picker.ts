import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'
import {
  parseColor,
  formatColor,
  formatSwatch,
  type RGBA,
} from './color.js'
import { registeredColorPickerCapabilities } from './oas-color-picker-capability.js'

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

/**
 * color-picker 的设计器能力（2D 色域 + hue 竖条 + gradient 多 stop 编辑器）在
 * 宿主渲染/更新管线上的挂接点（能力包 controller 实现；与 table 的 TableEditCapability 同构）。
 *
 * 核心（OASColorPicker）不实现任何 2D/gradient 逻辑：能力包经能力注册表
 * （oas-color-picker-capability.js）注入后，模板按需输出设计器区域并把对应分支委托给
 * 本接口方法；未注入能力时设计器 UI 不渲染、mode=gradient 配置静默失效并在 dev 告警一次。
 */
export interface ColorPickerDesignerCapability {
  /** 同步渐变值：解析 value（linear-gradient/纯色/空）→ stops；非渐变 no-op */
  syncValue(): void
  /** 当前编辑色：渐变模式 = 活动 stop 色；否则 null（核心以单色兜底） */
  editingColor(): RGBA | null
  /** 编辑提交路由：渐变模式改写活动 stop 色并序列化提交；非渐变返回 false（核心走单色） */
  applyColor(color: RGBA): boolean
  /** 同步渐变编辑区（显隐 + stops 手柄/背景 + 移除可用态） */
  syncGradientControls(): void
  /** 渐变 trigger 展示（色块渐变背景 + 文本）——渐变模式下核心委托 */
  paintGradientTrigger(): void
  /** 2D 色域 + hue 竖条绘制（读当前编辑色） */
  paintSvHue(): void
}

/** 渐变模式是否请求（mode 属性意图；与能力是否已注入无关） */
const DESIGNER_CAPABILITY_HINT = '[oas-color-picker] 2D 色域/gradient 设计器能力未启用：检测到 mode=gradient 配置，但未 import 设计器能力包，相关配置已静默失效。请按需 import "@oas-ui/ui/form/color-picker/designer"（全量入口 @oas-ui/ui 与 CDN 表单族包已内含，无需额外引用）'

/** 设计器能力告警去重（同值去重，同控件惯例） */
const warnedDesignerCapability = new Set<string>()

/** dev 告警：mode=gradient 配置但设计器能力未注入（页面级仅告警一次） */
function warnDesignerNotImported(): void {
  if (warnedDesignerCapability.has(DESIGNER_CAPABILITY_HINT)) return
  warnedDesignerCapability.add(DESIGNER_CAPABILITY_HINT)
  console.warn(DESIGNER_CAPABILITY_HINT)
}

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
/* 渐变编辑区（仅 mode=gradient，designer 能力注入后模板输出） */
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
/* 2D 色域行：saturation/brightness 平面 + 右侧 hue 竖条（designer 能力注入后模板输出） */
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
  /** designer 能力 controller（经能力注册表注入；无则模板不渲染 2D/渐变区、mode=gradient 静默失效） */
  private designerCap: ColorPickerDesignerCapability | null = null

  // ---------- 构造：遍历能力注册表注入能力控制器 ----------

  constructor() {
    super()
    for (const { name, factory } of registeredColorPickerCapabilities()) {
      const controller = factory(this)
      this.addController(controller)
      if (name === 'designer') {
        this.designerCap = controller as unknown as ColorPickerDesignerCapability
      }
    }
  }

  // ---------- 属性读取 ----------

  private alphaEnabled(): boolean {
    return this.hasAttr('show-alpha')
  }

  private currentFormat(): 'hex' | 'rgb' {
    return this.getAttr('color-format', 'hex') === 'rgb' ? 'rgb' : 'hex'
  }

  isLocked(): boolean {
    return this.injectDisabled() || this.hasAttr('readonly')
  }

  private isInline(): boolean {
    return this.hasAttr('inline')
  }

  /** mode 属性是否请求渐变模式（与 designer 能力是否注入无关） */
  private wantsGradient(): boolean {
    return this.getAttr('mode', 'single') === 'gradient'
  }

  /** 渐变模式是否生效（须已注入 designer 能力）：核心只在此时委托设计器分支 */
  private gradientDesign(): boolean {
    return this.wantsGradient() && this.designerCap != null
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
          ${this.designerCap ? this.designerTemplate() : ''}
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

  /** designer 区域模板：渐变编辑条 + 2D 色域行（仅能力注入后输出，DOM 事件/绘制由 designer controller 负责） */
  private designerTemplate(): string {
    return `
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

    // 面板内 Esc 关闭（数字/hex 输入获得焦点后仍可 Esc）
    this.panel?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape' && this.hasAttr('open')) this.closeByKeyboard()
    })

    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick, true))
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

    // 请求渐变模式但未 import designer 能力 → dev 告警（同值去重），并按单色静默处理
    if (this.wantsGradient() && !this.designerCap) warnDesignerNotImported()

    // value → 内部状态（单色 / 渐变委托 designer）
    this.syncValue()
    // trigger（文本/色块/禁用；渐变分支委托 designer）
    this.syncTrigger()
    // 预设网格
    this.renderPresets()
    // 渐变编辑区显隐 + stops 同步（designer）
    this.designerCap?.syncGradientControls()
    // 面板控件状态（RGB/hex/clear/吸管）
    this.syncControls()
    // 2D 色域 + hue 竖条绘制（designer）
    this.designerCap?.paintSvHue()
    // 打开态定位（面板内容尺寸落定后）
    if (!inline && !locked && this.hasAttr('open')) this.positionPanel()
    this.booted = true
  }

  // ---------- 值同步 ----------

  /** 当前编辑色：渐变模式取活动 stop（designer），单色模式取整色 */
  private editColor(): RGBA {
    if (this.gradientDesign()) return this.designerCap?.editingColor() ?? this.color
    return this.color
  }

  private syncValue(): void {
    const raw = this.getAttr('value', '')
    this.hasValue = raw.trim() !== ''
    if (this.gradientDesign()) {
      this.designerCap!.syncValue()
      return
    }
    this.syncSingleValue(raw)
  }

  /** 单色（一期契约）：宽容解析 → 内部 RGBA；空值占位（内部色保持）；非法保留旧色 */
  private syncSingleValue(raw: string): void {
    if (!raw.trim()) return
    const parsed = parseColor(raw)
    if (parsed) this.color = this.normalizeAlpha(parsed)
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

    // 渐变模式：色块/文本由 designer 绘制（依赖 stops，需经其序列化）
    if (this.gradientDesign()) {
      this.designerCap?.paintGradientTrigger()
      return
    }

    const swatch = this.shadow.querySelector<HTMLElement>('.swatch')
    if (swatch) {
      const alphaChecker = this.alphaEnabled() && this.color.a < 1
      swatch.classList.toggle('alpha-checker', alphaChecker)
      swatch.classList.toggle('grad-swatch', false)
      if (this.hasValue) {
        swatch.style.backgroundImage = ''
        swatch.style.backgroundColor = formatSwatch(this.color)
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

  // ---------- 面板控件 ----------

  /** 宿主能力面：designer 活动 stop 变化后重绘核心控件（RGB/hex/clear 等） */
  refreshControls(): void {
    this.syncControls()
  }

  private syncControls(): void {
    const { r, g, b, a } = this.editColor()
    this.shadow.querySelector<HTMLInputElement>('.r')!.value = String(Math.round(r))
    this.shadow.querySelector<HTMLInputElement>('.g')!.value = String(Math.round(g))
    this.shadow.querySelector<HTMLInputElement>('.b')!.value = String(Math.round(b))
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

  /** hex 输入条文本：渐变模式取活动 stop 单色，其余取整体显示文本 */
  private hexInputText(): string {
    if (this.gradientDesign()) {
      return formatColor(this.editColor(), this.outputOpts())
    }
    return this.displayText()
  }

  // ---------- 提交 ----------

  /** 宿主能力面：designer 的 sv/hue/stop 拖拽统一提交入口（单色提交 / 渐变改写活动 stop） */
  commitColor(rgba: RGBA): void {
    this.commit(rgba)
  }

  /** 宿主能力面：记录当前单色编辑色快照（designer 渐变编辑后同步，保持模式切换一致） */
  setColorValue(color: RGBA): void {
    this.color = { ...color }
  }

  /** 宿主能力面：当前单色编辑色（designer 非渐变时 sv/hue 基准） */
  colorValue(): RGBA {
    return { ...this.color }
  }

  /** 宿主能力面：翻译内置文案（就近 config-provider / locale；与 table 能力同构） */
  translateText(key: string, params?: Record<string, string | number>): string {
    return this.t(key, params)
  }

  /** 统一提交入口：渐变模式改写活动 stop 色并委托设计器序列化；单色模式写回 value */
  private commit(rgba: RGBA): void {
    if (this.isLocked()) return
    const color = this.normalizeAlpha(rgba)
    this.color = color
    if (this.designerCap?.applyColor(color)) return
    const out = formatColor(color, this.outputOpts())
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
