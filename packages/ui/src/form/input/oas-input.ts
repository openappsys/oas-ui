import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

const VALID_SIZES = ['small', 'medium', 'large'] as const
const VALID_VARIANTS = ['outlined', 'filled', 'borderless'] as const
const VALID_STATUSES = ['error', 'warning', 'success'] as const
const VALID_CLEAR_ON = ['always', 'hover', 'focus'] as const

/** 原生属性透传白名单：镜像到 shadow 内 input（value/type/placeholder/disabled/readonly/maxlength 另有专门通道） */
const PASSTHROUGH_ATTRS = [
  'name',
  'autocomplete',
  'autofocus',
  'inputmode',
  'minlength',
  'required',
  'spellcheck',
  'enterkeyhint',
  'pattern',
] as const

const warnedValues = new Set<string>()

/** 非法值告警：dev 下 console.warn 一次（同值去重），值本身走调用处的回落 */
function warnOnce(kind: string, raw: string, fallback: string, valid: readonly string[]): void {
  const key = `${kind}:${raw}`
  if (warnedValues.has(key)) return
  warnedValues.add(key)
  console.warn(`[oas-input] 非法 ${kind} "${raw}"，已回落 ${fallback}；合法值：${valid.join('/')}`)
}

/** 枚举归一化：合法值原样返回，空/非法值回落默认并告警（空值静默回落） */
function normalizeChoice(kind: string, raw: string, fallback: string, valid: readonly string[]): string {
  if (raw === '') return fallback
  if ((valid as readonly string[]).includes(raw)) return raw
  warnOnce(kind, raw, fallback, valid)
  return fallback
}

/** 字素（grapheme）计数：Intl.Segmenter 优先（emoji/ZWJ 组合/变音符正确计数），Array.from 兜底 */
const graphemeSegmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

function countGraphemes(value: string): number {
  if (graphemeSegmenter) {
    let n = 0
    for (const _ of graphemeSegmenter.segment(value)) n++
    return n
  }
  return Array.from(value).length
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.root {
  display: block;
}
.wrapper {
  display: inline-flex;
  align-items: stretch;
  width: 100%;
}
.inner {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}
/* input 与测宽 mirror（.measure）共享水平布局规则：字号/内边距/边框一致才能等宽测量 */
:is(input, .measure) {
  box-sizing: border-box;
  min-width: 0;
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  /* compact/button-group 圆角合并协议：--oas-button-group-radius 优先，独立使用回落自身圆角 */
  border-radius: var(--oas-button-group-radius, var(--oas-radius-md));
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
input {
  appearance: none;
  width: 100%;
  height: var(--oas-control-height-md);
}
input:hover {
  border-color: var(--oas-color-primary);
}
input:focus {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}

/* ---- size 尺寸档位（默认 medium 走基础样式；高度对齐 --oas-control-height-* token） ---- */
:host([data-size='small']) :is(input, .measure) {
  height: var(--oas-control-height-sm);
  font-size: var(--oas-font-size-sm);
}
:host([data-size='large']) :is(input, .measure) {
  height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-lg);
}
:host([data-size='small']) :is(.affix, .affix-icon, .addon) {
  font-size: var(--oas-font-size-sm);
}
:host([data-size='large']) :is(.affix, .affix-icon, .addon) {
  font-size: var(--oas-font-size-lg);
}

/* ---- variant 形态：filled 填充 / borderless 无框（默认 outlined 走基础样式） ---- */
:host([data-variant='filled']) input {
  border-color: transparent;
  background: var(--oas-color-bg-hover);
}
:host([data-variant='filled']) input:hover {
  border-color: var(--oas-color-border);
}
:host([data-variant='filled']) input:focus {
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
:host([data-variant='filled']) input:disabled {
  background: var(--oas-color-bg-disabled);
}
:host([data-variant='borderless']) input {
  border-color: transparent;
  background: transparent;
}
:host([data-variant='borderless']) input:hover {
  border-color: transparent;
}
:host([data-variant='borderless']) input:focus {
  border-color: transparent;
  box-shadow: none;
}
:host([data-variant='borderless']) input:disabled {
  background: transparent;
}

/* ---- status 校验态：success / warning / error（error 兼容宿主 aria-invalid 通道，置于最后优先胜出） ---- */
:host([data-status='success']) input {
  border-color: var(--oas-color-success);
}
:host([data-status='success']) input:focus {
  border-color: var(--oas-color-success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-success) 30%, transparent);
}
:host([data-status='warning']) input {
  border-color: var(--oas-color-warning);
}
:host([data-status='warning']) input:focus {
  border-color: var(--oas-color-warning);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-warning) 30%, transparent);
}
:host([data-status='error']) input,
:host([aria-invalid='true']) input {
  border-color: var(--oas-color-danger);
}
:host([data-status='error']) input:focus,
:host([aria-invalid='true']) input:focus {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}

input:disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
input:disabled:hover {
  border-color: var(--oas-color-border);
}

/* ---- addon 区（prepend / append，独立 ::part；attribute 文本为 slot fallback，双通道） ---- */
.addon {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--oas-space-3);
  background: var(--oas-color-bg-hover);
  border: 1px solid var(--oas-color-border);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
  white-space: nowrap;
  user-select: none;
}
:host([disabled]) .addon,
:host([data-disabled]) .addon {
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
:host([addon-before]) [part='prepend']  {
  border-radius: var(--oas-radius-md) 0 0 var(--oas-radius-md);
  border-right: none;
}
:host([data-slot-prepend]) [part='prepend']  {
  border-radius: var(--oas-radius-md) 0 0 var(--oas-radius-md);
  border-right: none;
}
:host([addon-after]) [part='append']  {
  border-radius: 0 var(--oas-radius-md) var(--oas-radius-md) 0;
  border-left: none;
}
:host([data-slot-append]) [part='append']  {
  border-radius: 0 var(--oas-radius-md) var(--oas-radius-md) 0;
  border-left: none;
}
:host([addon-before]) input  {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
:host([data-slot-prepend]) input  {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
:host([addon-after]) input  {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
:host([data-slot-append]) input  {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
/* hidden 属性需要显式覆盖 display（避免 class 的 display 优先级压过 UA 的 [hidden] 规则） */
.addon[hidden] {
  display: none;
}

/* ---- 内嵌前后缀（prefix / suffix 文案 + prefix-icon / suffix-icon 图标） ---- */
.affix,
.affix-icon {
  position: absolute;
  display: inline-flex;
  align-items: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
  pointer-events: none;
  z-index: 1;
  max-width: 50%;
  overflow: hidden;
}
:host([disabled]) .affix,
:host([disabled]) .affix-icon,
:host([data-disabled]) .affix,
:host([data-disabled]) .affix-icon {
  color: var(--oas-color-text-disabled);
}
.affix-icon svg {
  width: 14px;
  height: 14px;
  display: block;
}
[part='prefix-icon'] {
  left: var(--oas-space-3);
}
[part='prefix'] {
  left: var(--oas-space-8, 40px);
}
:host(:not([prefix-icon])) [part='prefix'] {
  left: var(--oas-space-3);
}
[part='suffix-icon'] {
  right: var(--oas-space-8, 40px);
}
[part='suffix'] {
  right: calc(var(--oas-space-8, 40px) + 16px);
}
:host(:not([suffix-icon])) [part='suffix'] {
  right: var(--oas-space-8, 40px);
}
:host(:not([clearable])) [part='suffix-icon'] {
  right: var(--oas-space-3);
}
:host(:not([clearable])) [part='suffix'] {
  right: var(--oas-space-3);
}
.affix[hidden],
.affix-icon[hidden] {
  display: none;
}

/* 有前缀/图标时 input 左侧留位，有后缀/图标/可清空时右侧留位。
   slot 分发（data-slot-*）与 attribute（prefix/suffix）两条通道等价驱动布局；
   测宽 mirror 同享留位（保证 auto-width 测量含让位内边距） */
:host([prefix-text]) :is(input, .measure)  {
  padding-left: var(--oas-space-8, 40px);
}
:host([data-slot-prefix]) :is(input, .measure)  {
  padding-left: var(--oas-space-8, 40px);
}
:host([prefix-icon]) :is(input, .measure)  {
  padding-left: var(--oas-space-8, 40px);
}
:host([prefix-text][prefix-icon]) :is(input, .measure)  {
  padding-left: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([data-slot-prefix][prefix-icon]) :is(input, .measure)  {
  padding-left: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([suffix-text]) :is(input, .measure)  {
  padding-right: var(--oas-space-8, 40px);
}
:host([data-slot-suffix]) :is(input, .measure)  {
  padding-right: var(--oas-space-8, 40px);
}
:host([suffix-icon]) :is(input, .measure)  {
  padding-right: var(--oas-space-8, 40px);
}
:host([clearable]) :is(input, .measure)  {
  padding-right: var(--oas-space-8, 40px);
}
:host([clearable][suffix-text]) :is(input, .measure)  {
  padding-right: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([clearable][data-slot-suffix]) :is(input, .measure)  {
  padding-right: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([clearable][suffix-icon]) :is(input, .measure)  {
  padding-right: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}

/* show-password 眼睛按钮让位：输入框/清除按钮/内嵌后缀整体左移 */
:host([show-password]) :is(input, .measure) {
  padding-right: var(--oas-space-8, 40px);
}
:host([show-password][clearable]) :is(input, .measure)  {
  padding-right: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([show-password][suffix-text]) :is(input, .measure)  {
  padding-right: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([show-password][data-slot-suffix]) :is(input, .measure)  {
  padding-right: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([show-password][suffix-icon]) :is(input, .measure)  {
  padding-right: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([show-password][clearable][suffix-text]) :is(input, .measure)  {
  padding-right: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px) + var(--oas-space-5, 24px));
}
:host([show-password][clearable][data-slot-suffix]) :is(input, .measure)  {
  padding-right: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px) + var(--oas-space-5, 24px));
}
:host([show-password][clearable][suffix-icon]) :is(input, .measure)  {
  padding-right: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px) + var(--oas-space-5, 24px));
}
:host([show-password][type='password']) .clear-btn {
  right: var(--oas-space-8, 40px);
}
:host([show-password][clearable][suffix-icon]) .clear-btn {
  right: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([show-password]) [part='suffix-icon'] {
  right: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([show-password]:not([suffix-icon])) [part='suffix'] {
  right: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([show-password]) [part='suffix'] {
  right: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px) + 16px);
}

/* ---- 清除按钮 ---- */
.clear-btn {
  position: absolute;
  right: var(--oas-space-2);
  appearance: none;
  border: none;
  background: transparent;
  padding: 2px;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  display: inline-flex;
  border-radius: 50%;
  z-index: 2;
}
.clear-btn:hover {
  color: var(--oas-color-text-primary);
}
.clear-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.clear-btn[hidden] {
  display: none;
}
/* 清除按钮显隐策略：focus=仅聚焦时显示，hover=悬浮或聚焦时显示（默认 always 有值常显，不写 data-clear-on） */
:host([data-clear-on='focus']:not(:focus-within)) .clear-btn,
:host([data-clear-on='hover']:not(:hover):not(:focus-within)) .clear-btn {
  display: none;
}

/* ---- show-password 眼睛切换按钮 ---- */
.eye-btn {
  position: absolute;
  right: var(--oas-space-2);
  appearance: none;
  border: none;
  background: transparent;
  padding: 2px;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--oas-radius-sm);
  z-index: 2;
}
.eye-btn:hover {
  color: var(--oas-color-text-primary);
}
.eye-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.eye-btn svg {
  width: 14px;
  height: 14px;
  display: block;
}
:host([disabled]) .eye-btn,
:host([data-disabled]) .eye-btn {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
.eye-btn[hidden] {
  display: none;
}

/* ---- show-count 字数统计（outside 输入框右下角 / inside 输入区内右侧） ---- */
.count {
  position: absolute;
  top: 100%;
  inset-inline-end: 0;
  margin-top: var(--oas-space-1, 4px);
  display: block;
  font-size: var(--oas-font-size-sm);
  line-height: 1.4;
  color: var(--oas-color-text-secondary);
}
.count[data-over='true'] {
  color: var(--oas-color-danger);
}
.count[hidden] {
  display: none;
}
/* inside：回到 .inner 的 flex 流（输入区右侧、垂直居中），input 收缩让位不与文本重叠 */
.count[data-position='inside'] {
  position: static;
  margin-top: 0;
  margin-inline-start: var(--oas-space-2);
}
:host([data-count-inside]) input {
  flex: 1 1 0%;
  width: auto;
}
/* inside 计数与清除/眼睛/后缀并存时让位（绝对定位按钮在右侧占据一档宽度） */
:host([clearable]) .count[data-position='inside']  {
  margin-inline-end: var(--oas-space-5, 24px);
}
:host([suffix-text]) .count[data-position='inside']  {
  margin-inline-end: var(--oas-space-5, 24px);
}
:host([data-slot-suffix]) .count[data-position='inside']  {
  margin-inline-end: var(--oas-space-5, 24px);
}
:host([suffix-icon]) .count[data-position='inside']  {
  margin-inline-end: var(--oas-space-5, 24px);
}
:host([show-password]) .count[data-position='inside']  {
  margin-inline-end: var(--oas-space-5, 24px);
}
:host([show-password][clearable]) .count[data-position='inside']  {
  margin-inline-end: calc(var(--oas-space-5, 24px) + var(--oas-space-5, 24px));
}
:host([show-password][suffix-text]) .count[data-position='inside']  {
  margin-inline-end: calc(var(--oas-space-5, 24px) + var(--oas-space-5, 24px));
}
:host([show-password][data-slot-suffix]) .count[data-position='inside']  {
  margin-inline-end: calc(var(--oas-space-5, 24px) + var(--oas-space-5, 24px));
}
:host([show-password][suffix-icon]) .count[data-position='inside']  {
  margin-inline-end: calc(var(--oas-space-5, 24px) + var(--oas-space-5, 24px));
}

/* ---- auto-width 宽度自适应（mirror 测宽） ---- */
.measure {
  display: none;
}
:host([data-auto-width]) .measure {
  display: inline-block;
  position: absolute;
  visibility: hidden;
  white-space: pre;
  pointer-events: none;
  border: 1px solid transparent;
}
:host([data-auto-width]) input {
  width: var(--oas-input-measured, 100%);
  min-width: var(--oas-input-auto-min, 72px);
  max-width: var(--oas-input-auto-max, 100%);
}
`

export class OASInput extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'placeholder',
      'type',
      'disabled',
      'readonly',
      'clearable',
      'label',
      'addon-before',
      'addon-after',
      'prefix-text',
      'suffix-text',
      'prefix-icon',
      'suffix-icon',
      'show-password',
      'maxlength',
      'show-count',
      'disabled-skip',
      'size',
      'variant',
      'status',
      'count-position',
      'allow-over-max',
      'show-clear-on',
      'auto-width',
      'auto-width-min',
      'auto-width-max',
      ...PASSTHROUGH_ATTRS,
    ]
  }

  /** 显示格式化（仅 property 通道：`el.formatter = fn`，WC attribute 无法传函数）。
   *  display = formatter(raw)；设置/移除后立即重刷显示。 */
  private _formatter: ((value: string) => string) | null = null
  get formatter(): ((value: string) => string) | null {
    return this._formatter
  }
  set formatter(fn: ((value: string) => string) | null) {
    this._formatter = typeof fn === 'function' ? fn : null
    this.refreshFormatter()
  }

  /** 显示值反解析（仅 property 通道）：raw = parser(display)；事件 detail 携带解析后的值 */
  private _parser: ((value: string) => string) | null = null
  get parser(): ((value: string) => string) | null {
    return this._parser
  }
  set parser(fn: ((value: string) => string) | null) {
    this._parser = typeof fn === 'function' ? fn : null
    this.refreshFormatter()
  }

  private inputEl: HTMLInputElement | null = null
  private clearBtn: HTMLButtonElement | null = null
  private eyeBtn: HTMLButtonElement | null = null
  private countEl: HTMLElement | null = null
  private measureEl: HTMLElement | null = null
  /** show-password 明文/密文状态（仅 type=password 时生效） */
  private revealed = false
  /** 上次提交值（oas-change 的变更基线：受控 value 写入 / blur / Enter 提交时刷新） */
  private committedValue = ''
  /** 最近一次已知的原始（未格式化）值：formatter 移除时恢复显示用 */
  private lastRawValue = ''
  /** 超限状态（oas-validate 只在翻转时派发；首帧建立基线不派发） */
  private overLimit = false
  private overLimitInitialized = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="root" part="root">
        <span class="wrapper" part="wrapper">
          <span class="addon" part="prepend" hidden><slot name="prepend"><span class="addon-fallback" data-fallback></span></slot></span>
          <span class="inner" part="inner">
            <span class="affix-icon" part="prefix-icon" hidden></span>
            <span class="affix" part="prefix" hidden><slot name="prefix"><span class="affix-fallback" data-fallback></span></slot></span>
            <input part="input" />
            <span class="measure" aria-hidden="true"></span>
            <span class="affix" part="suffix" hidden><slot name="suffix"><span class="affix-fallback" data-fallback></span></slot></span>
            <span class="affix-icon" part="suffix-icon" hidden></span>
            <button class="clear-btn" part="clear" hidden>
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
                <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
            <button class="eye-btn" part="eye" type="button" hidden aria-pressed="false">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
                ${iconRegistry['eye']}
              </svg>
            </button>
            <span class="count" part="count" hidden></span>
          </span>
          <span class="addon" part="append" hidden><slot name="append"><span class="addon-fallback" data-fallback></span></slot></span>
        </span>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定输入/清空/密码眼/焦点事件（render 与水合路径共用） */
  private bind(): void {
    this.inputEl = this.shadow.querySelector('input')
    this.clearBtn = this.shadow.querySelector('.clear-btn')
    this.eyeBtn = this.shadow.querySelector('.eye-btn')
    this.countEl = this.shadow.querySelector('.count')
    this.measureEl = this.shadow.querySelector('.measure')

    this.inputEl?.addEventListener('input', () => {
      const pos = this.inputEl!.selectionStart
      const oldDisplay = this.inputEl!.value
      // formatter 在场：先把用户敲入的显示值反解析为原始值，再重新格式化显示；
      // 光标近似保持（按格式化前后长度差平移）
      if (this._formatter) {
        const typed = this._parser ? this._parser(oldDisplay) : oldDisplay
        this.lastRawValue = typed
        const display = this._formatter(typed)
        if (display !== oldDisplay) {
          this.inputEl!.value = display
          if (pos !== null) {
            const next = Math.max(0, Math.min(display.length, pos + (display.length - oldDisplay.length)))
            try {
              this.inputEl!.setSelectionRange(next, next)
            } catch {
              /* number/email 等类型不支持选区，忽略光标保持 */
            }
          }
        }
      } else {
        this.lastRawValue = oldDisplay
      }
      this.emit('input', { value: this.rawValue() })
      this.syncClearVisibility()
      this.syncCount()
      this.measureAutoWidth()
    })
    this.inputEl?.addEventListener('keydown', (e: KeyboardEvent) => {
      // 非输入法组合（IME 上屏）时按 Enter 才派发 oas-enter；Enter 同时作为值提交点
      if (e.key === 'Enter' && !e.isComposing) {
        this.emit('enter', { value: this.rawValue() })
        this.commitChange()
      }
    })
    this.inputEl?.addEventListener('focus', () => {
      this.emit('focus', { value: this.rawValue() })
    })
    this.inputEl?.addEventListener('blur', () => {
      this.emit('blur', { value: this.rawValue() })
      this.commitChange()
    })
    this.clearBtn?.addEventListener('click', () => {
      if (!this.inputEl) return
      this.inputEl.value = ''
      this.lastRawValue = ''
      this.emit('clear', { originalEvent: new MouseEvent('click') })
      // 值已变，实时通道同步派发（只听 oas-input 的宿主不能漏掉清除）
      this.emit('input', { value: this.rawValue() })
      this.inputEl.focus()
      this.syncClearVisibility()
      this.syncCount()
      this.measureAutoWidth()
    })
    this.eyeBtn?.addEventListener('click', () => {
      if (!this.inputEl || this.injectDisabled()) return
      this.revealed = !this.revealed
      this.syncPasswordReveal()
      this.inputEl.focus()
    })

    // 内嵌前后缀 / addon slot：light DOM 分发内容增减时同步显隐与 host 布局标记。
    // bind() 在 render/hydrate 二选一路径中各只执行一次，不存在重复注册；
    // 初始分发状态由 connectedCallback 调用的 update() → syncAffixes()/syncAddons() 读取。
    const observeSlot = (name: string, sync: () => void): void => {
      const slot = this.shadow.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
      slot?.addEventListener('slotchange', () => {
        sync()
        this.measureAutoWidth()
      })
    }
    observeSlot('prefix', () => this.syncAffixes())
    observeSlot('suffix', () => this.syncAffixes())
    observeSlot('prepend', () => this.syncAddons())
    observeSlot('append', () => this.syncAddons())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（主输入 input 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('input')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const i = this.inputEl
    if (!i) return
    // 遗留属性名规范：旧 prefix/suffix（与 DOM 内建只读冲突，Vue 走 property 会吞值）
    // 迁移到 prefix-text/suffix-text（纯 HTML 老用法自动升级，CSS 只认新名）
    this.normalizeLegacyAlias('prefix-text', 'prefix')
    this.normalizeLegacyAlias('suffix-text', 'suffix')
    const value = this.getAttr('value', '')
    const placeholder = this.getAttr('placeholder', '')
    const type = this.getAttr('type', 'text')
    // disabled 就近读取全局禁用注入（组件显式 disabled > 豁免 > provider 注入）
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')

    // 镜像最终禁用态到宿主 data-disabled（供 :host([data-disabled]) 样式消费，覆盖注入场景）
    this.toggleAttribute('data-disabled', disabled)

    // 尺寸/形态/校验态镜像（size 就近读取 config-provider 注入，与全局密度联动）
    const size = normalizeChoice('size', this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
    this.setAttribute('data-size', size)
    const variant = normalizeChoice('variant', this.getAttr('variant', ''), 'outlined', VALID_VARIANTS)
    this.setAttribute('data-variant', variant)
    const status = normalizeChoice('status', this.getAttr('status', ''), '', VALID_STATUSES)
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')
    // error 态同步内层 input 的 aria-invalid（warning/success 不是「无效」语义，不标）
    if (status === 'error') i.setAttribute('aria-invalid', 'true')
    else i.removeAttribute('aria-invalid')

    // 受控值 + formatter 显示通道：display = formatter(raw)，事件/提交基线走原始值
    this.lastRawValue = value
    const display = this._formatter ? this._formatter(value) : value
    if (i.value !== display) i.value = display
    this.committedValue = value

    i.placeholder = placeholder
    // maxlength 透传原生 input（空值即无限制；allow-over-max 时不透传——超限可继续输入，仅计数标红）
    const maxlength = this.getAttr('maxlength', '')
    if (maxlength === '' || this.hasAttr('allow-over-max')) i.removeAttribute('maxlength')
    else i.setAttribute('maxlength', maxlength)
    i.disabled = disabled
    i.readOnly = readonly
    // 原生属性透传白名单：host 有则镜像、无则同步移除
    for (const attr of PASSTHROUGH_ATTRS) {
      const v = this.getAttribute(attr)
      if (v == null) i.removeAttribute(attr)
      else i.setAttribute(attr, v)
    }
    // 内置文案走 locale registry（label/placeholder 属性优先，setLocale 切换自动刷新）
    i.setAttribute('aria-label', this.getAttr('label', placeholder) || this.t('input.defaultLabel'))
    // 清除按钮显隐策略（默认 always 不写标记，CSS 无规则即常显）
    const clearOn = normalizeChoice('show-clear-on', this.getAttr('show-clear-on', ''), 'always', VALID_CLEAR_ON)
    if (clearOn === 'always') this.removeAttribute('data-clear-on')
    else this.setAttribute('data-clear-on', clearOn)
    if (this.clearBtn) {
      this.clearBtn.setAttribute('aria-label', this.t('input.clear'))
      this.clearBtn.hidden = !this.shouldShowClear()
    }
    this.syncPasswordReveal()
    this.syncCount()
    this.syncAddons()
    this.syncAffixes()
    this.toggleAttribute('data-auto-width', this.hasAttr('auto-width'))
    this.syncAutoWidthVars()
    this.measureAutoWidth()
  }

  /** 当前原始值：parser 在场时从显示值反解析，否则显示值即原始值 */
  private rawValue(): string {
    const display = this.inputEl?.value ?? ''
    return this._parser ? this._parser(display) : display
  }

  /** 值提交（change 语义）：与上次提交基线不同才派发 oas-change */
  private commitChange(): void {
    if (!this.inputEl) return
    const raw = this.rawValue()
    if (raw !== this.committedValue) {
      this.committedValue = raw
      this.emit('change', { value: raw })
    }
  }

  /** formatter/parser property 变化后重刷显示（不动受控基线） */
  private refreshFormatter(): void {
    if (!this.inputEl) return
    if (this._formatter) {
      const display = this._formatter(this.lastRawValue)
      if (this.inputEl.value !== display) this.inputEl.value = display
    } else if (this.inputEl.value !== this.lastRawValue) {
      this.inputEl.value = this.lastRawValue
    }
    this.syncClearVisibility()
    this.syncCount()
    this.measureAutoWidth()
  }

  private shouldShowClear(): boolean {
    return (
      this.hasAttr('clearable') &&
      !this.injectDisabled() &&
      !this.hasAttr('readonly') &&
      this.inputEl !== null &&
      this.inputEl.value !== ''
    )
  }

  private syncClearVisibility(): void {
    if (!this.clearBtn || !this.inputEl) return
    this.clearBtn.hidden = !this.shouldShowClear()
  }

  /** show-password 眼睛按钮：仅 type=password + show-password + 未禁用时显示；切换明文/密文 */
  private syncPasswordReveal(): void {
    if (!this.inputEl || !this.eyeBtn) return
    const type = this.getAttr('type', 'text')
    const isPassword = type === 'password'
    if (!isPassword) this.revealed = false
    this.inputEl.type = isPassword && this.revealed ? 'text' : type
    const showEye = isPassword && this.hasAttr('show-password') && !this.injectDisabled()
    this.eyeBtn.hidden = !showEye
    if (showEye) {
      this.eyeBtn.setAttribute('aria-pressed', String(this.revealed))
      this.eyeBtn.setAttribute(
        'aria-label',
        this.revealed ? this.t('input.hidePassword') : this.t('input.showPassword'),
      )
    }
  }

  /** show-count 字数统计：字素（grapheme）计数，outside 右下角 / inside 输入区内；
   *  maxlength 在场显示 当前字素数/上限，超限标 data-over 并在状态翻转时派发 oas-validate */
  private syncCount(): void {
    if (!this.countEl || !this.inputEl) return
    const show = this.hasAttr('show-count')
    this.countEl.hidden = !show
    const position = this.getAttr('count-position', '') === 'inside' ? 'inside' : 'outside'
    this.countEl.setAttribute('data-position', position)
    this.toggleAttribute('data-count-inside', show && position === 'inside')
    if (!show) return
    const maxlength = this.getAttr('maxlength', '')
    const len = countGraphemes(this.rawValue())
    this.countEl.textContent = maxlength === '' ? String(len) : `${len}/${maxlength}`
    const over = maxlength !== '' && len > Number(maxlength)
    if (over) this.countEl.setAttribute('data-over', 'true')
    else this.countEl.removeAttribute('data-over')
    // oas-validate：越界状态翻转时派发（首帧建立基线静默，不响应初始渲染）
    if (!this.overLimitInitialized) {
      this.overLimitInitialized = true
      this.overLimit = over
    } else if (over !== this.overLimit) {
      this.overLimit = over
      this.emit('validate', { error: over ? 'exceed-maximum' : null })
    }
  }

  /** addon 区：addon-before/after 文案（attribute 文本为 slot fallback）+ prepend/append slot 复杂内容分发。
   *  双通道与 prefix/suffix 同构：slot 有分发时原生替换 fallback，显隐 = 有 attribute 文本 || slot 有内容；
   *  slot 分发时给 host 打 data-slot-prepend/append 驱动圆角合并选择器。 */
  private syncAddons(): void {
    const setAddon = (partName: string, attrName: string, slotMark: string): void => {
      const el = this.shadow.querySelector<HTMLElement>(`[part="${partName}"]`)
      if (!el) return
      const slotEl = el.querySelector<HTMLSlotElement>('slot')
      const fallback = el.querySelector<HTMLElement>('[data-fallback]')
      const text = this.getAttr(attrName, '')
      if (fallback) fallback.textContent = text
      // 注意不能用 flatten:true——空 slot 的扁平化结果会包含 fallback 子节点，导致恒判有内容
      const slotHasContent =
        slotEl !== null && slotEl.assignedNodes().some((n) => n.nodeType === 1 || (n.textContent ?? '').trim() !== '')
      el.hidden = text === '' && !slotHasContent
      if (slotHasContent) this.setAttribute(slotMark, '')
      else this.removeAttribute(slotMark)
    }
    setAddon('prepend', 'addon-before', 'data-slot-prepend')
    setAddon('append', 'addon-after', 'data-slot-append')
  }

  /** 内嵌前后缀：prefix/suffix 文案（attribute 文本为 slot fallback）+ prefix-icon/suffix-icon 图标（iconRegistry 内联 SVG）。
   *  attribute 与 slot 双通道并行：slot 有分发时原生替换 fallback（零 JS 优先级判断），attribute 文本只写 fallback 不直接覆盖 span
   *  （避免误清 slot 节点）；显隐 = 有 attribute 文本 || slot 有分发内容；slot 分发时给 host 打 data-slot-prefix/suffix 驱动 input 内边距。 */
  private syncAffixes(): void {
    const renderIcon = (part: string, iconName: string): void => {
      const el = this.shadow.querySelector<HTMLElement>(`[part="${part}"]`)
      if (!el) return
      const content = iconName ? iconRegistry[iconName as IconName] : undefined
      if (content) {
        el.hidden = false
        // 装饰性图标对读屏隐藏（输入框 aria-label 提供可访问名称）
        el.setAttribute('aria-hidden', 'true')
        el.textContent = ''
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('viewBox', '0 0 16 16')
        svg.setAttribute('width', '1em')
        svg.setAttribute('height', '1em')
        svg.setAttribute('aria-hidden', 'true')
        svg.setAttribute('focusable', 'false')
        svg.innerHTML = content
        el.appendChild(svg)
      } else {
        el.hidden = true
        el.removeAttribute('aria-hidden')
        el.textContent = ''
      }
    }
    const renderAffix = (part: string, text: string, slotMark: string): void => {
      const el = this.shadow.querySelector<HTMLElement>(`[part="${part}"]`)
      if (!el) return
      const slotEl = el.querySelector<HTMLSlotElement>('slot')
      const fallback = el.querySelector<HTMLElement>('[data-fallback]')
      if (fallback) fallback.textContent = text
      // 注意不能用 flatten:true——空 slot 的扁平化结果会包含 fallback 子节点，导致恒判有内容
      const slotHasContent =
        slotEl !== null && slotEl.assignedNodes().some((n) => n.nodeType === 1 || (n.textContent ?? '').trim() !== '')
      const visible = text !== '' || slotHasContent
      el.hidden = !visible
      // host 布局联动：slot 有内容时打标记驱动 input 内边距选择器（CSS :host([data-slot-*])）
      if (slotHasContent) this.setAttribute(slotMark, '')
      else this.removeAttribute(slotMark)
    }
    renderIcon('prefix-icon', this.getAttr('prefix-icon', ''))
    renderAffix('prefix', this.getAttr('prefix-text', ''), 'data-slot-prefix')
    renderIcon('suffix-icon', this.getAttr('suffix-icon', ''))
    renderAffix('suffix', this.getAttr('suffix-text', ''), 'data-slot-suffix')
  }

  /** auto-width 钳制变量：min/max 属性写入 CSS 变量（JS 不做钳制，交给 min-width/max-width） */
  private syncAutoWidthVars(): void {
    const readPx = (name: string): string | null => {
      const raw = this.getAttr(name, '')
      if (raw === '') return null
      const n = Number(raw)
      return Number.isFinite(n) && n >= 0 ? `${n}px` : null
    }
    if (this.hasAttr('auto-width')) {
      const min = readPx('auto-width-min')
      if (min) this.style.setProperty('--oas-input-auto-min', min)
      else this.style.removeProperty('--oas-input-auto-min')
      const max = readPx('auto-width-max')
      if (max) this.style.setProperty('--oas-input-auto-max', max)
      else this.style.removeProperty('--oas-input-auto-max')
    } else {
      this.style.removeProperty('--oas-input-auto-min')
      this.style.removeProperty('--oas-input-auto-max')
      this.style.removeProperty('--oas-input-measured')
    }
  }

  /** auto-width 测宽：mirror 文本 = 当前值（空值回落 placeholder），测量结果写入 --oas-input-measured。
   *  mirror 与 input 共享字号/内边距/边框规则（含前后缀让位），offsetWidth 即目标宽度；
   *  测量失败（0，如 SSR/无布局环境）不写入，回落 CSS width:100%。 */
  private measureAutoWidth(): void {
    if (!this.hasAttr('auto-width') || !this.inputEl || !this.measureEl) return
    this.measureEl.textContent = this.inputEl.value || this.getAttr('placeholder', '')
    const w = this.measureEl.offsetWidth
    if (w > 0) this.style.setProperty('--oas-input-measured', `${w}px`)
    else this.style.removeProperty('--oas-input-measured')
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内主输入（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLInputElement>('input')?.focus(options)
  }

  /** 失焦委托：把 blur 交给 shadow 内主输入 */
  override blur(): void {
    this.shadow.querySelector<HTMLInputElement>('input')?.blur()
  }

  /** 选中输入框全部内容（委托原生 input.select） */
  select(): void {
    this.shadow.querySelector<HTMLInputElement>('input')?.select()
  }
}
