import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export type SwitchSize = 'xs' | 'small' | 'medium' | 'large' | 'xl'

const VALID_SWITCH_SIZES: readonly SwitchSize[] = ['xs', 'small', 'medium', 'large', 'xl']
/** status 校验态：success / warning / error（error 联动 aria-invalid） */
const VALID_STATUSES = ['error', 'warning', 'success'] as const
const warnedSizes = new Set<string>()

/** label for/button id 关联：确定性计数器（SSR 快照可重复，浏览器多实例不冲突） */
let switchIdCounter = 0

/** 非法 size 归一化：回落 medium 并在 dev 下 console.warn 一次（同值去重） */
function normalizeSwitchSize(raw: string): SwitchSize {
  if ((VALID_SWITCH_SIZES as readonly string[]).includes(raw)) return raw as SwitchSize
  if (!warnedSizes.has(raw)) {
    warnedSizes.add(raw)
    console.warn(`[oas-switch] 非法 size "${raw}"，已回落 medium；合法值：xs/small/medium/large/xl`)
  }
  return 'medium'
}

/** 枚举归一化：合法值原样返回，空/非法值静默回落默认（非法值不告警，保持输出干净） */
function normalizeChoice(raw: string, fallback: string, valid: readonly string[]): string {
  if (raw === '') return fallback
  return valid.includes(raw) ? raw : fallback
}

/** 图标名是否可渲染（未注册名不渲染，与 tag 的 icon 通道一致） */
function isValidIcon(name: string): boolean {
  return name !== '' && iconRegistry[name as IconName] !== undefined
}

const STYLE = `
:host {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-2);
  font-family: inherit;
  /* 热区一致性（视觉=热区）：宿主收缩到内容宽——竖向 flex 容器（如 oas-space direction="vertical"）
     里不再被 align-items: stretch 拉成整行宽而点击热区只有拨杆；
     点击热区扩展走 label 通道（label 属性/默认插槽渲染可点标签），不做整行空白可点 */
  width: fit-content;
  max-width: 100%;
}
button {
  /* 尺寸变量：medium 为默认值，.xs/.small/.large/.xl 覆盖；
     宿主可用 --oas-switch-width / --oas-switch-height / --oas-switch-thumb-size
     CSS 变量跨尺寸档覆盖轨道宽/高/滑块大小（WC 系共识的定制开口，不占属性 API） */
  --track-w: var(--oas-switch-width, 40px);
  --track-h: var(--oas-switch-height, 22px);
  --thumb-size: var(--oas-switch-thumb-size, 18px);
  --thumb-offset: 2px;
  --label-font: var(--oas-font-size-sm);
  appearance: none;
  border: none;
  padding: 0;
  cursor: pointer;
  position: relative;
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  min-width: var(--track-w);
  height: var(--track-h);
  border-radius: calc(var(--track-h) / 2);
  background: var(--oas-color-border);
  transition: background var(--oas-transition-base) var(--oas-ease-out);
}
button.xs {
  --track-w: var(--oas-switch-width, 22px);
  --track-h: var(--oas-switch-height, 12px);
  --thumb-size: var(--oas-switch-thumb-size, 8px);
  --label-font: var(--oas-font-size-xs);
}
button.small {
  --track-w: var(--oas-switch-width, 28px);
  --track-h: var(--oas-switch-height, 16px);
  --thumb-size: var(--oas-switch-thumb-size, 12px);
  --label-font: var(--oas-font-size-xs);
}
button.large {
  --track-w: var(--oas-switch-width, 52px);
  --track-h: var(--oas-switch-height, 28px);
  --thumb-size: var(--oas-switch-thumb-size, 24px);
  --label-font: var(--oas-font-size-md);
}
button.xl {
  --track-w: var(--oas-switch-width, 64px);
  --track-h: var(--oas-switch-height, 34px);
  --thumb-size: var(--oas-switch-thumb-size, 28px);
  --label-font: var(--oas-font-size-lg);
}
button[aria-checked='true'] {
  background: var(--oas-color-primary);
}
button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
button[disabled] {
  cursor: not-allowed;
  opacity: 0.6;
}
.thumb {
  position: absolute;
  top: var(--thumb-offset);
  left: var(--thumb-offset);
  width: var(--thumb-size);
  height: var(--thumb-size);
  border-radius: 50%;
  background: var(--oas-color-bg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: left var(--oas-transition-base) var(--oas-ease-out);
}
button[aria-checked='true'] .thumb {
  /* 锚定右端而非固定位移：轨道带文案自动加宽时也能贴右端，不遮文案 */
  left: calc(100% - var(--thumb-size) - var(--thumb-offset));
}
/* 滑块图标：checked-icon / unchecked-icon 渲染 <oas-icon>，铺满滑块居中（尺寸跟随滑块） */
.thumb-icon {
  position: absolute;
  inset: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--thumb-size) * 0.6);
  color: var(--oas-color-primary);
  pointer-events: none;
}
.thumb-icon[hidden] {
  display: none;
}
/* 轨道内文案：显示在滑块对侧，nowrap 不换行、轨道随文案自动加宽（不溢出不变形） */
.label {
  font-size: var(--label-font);
  line-height: 1;
  white-space: nowrap;
  user-select: none;
  pointer-events: none;
  transition: color var(--oas-transition-base) var(--oas-ease-out);
}
.label[hidden] {
  display: none;
}
/* 单 flex 项（滑块绝对定位不参与 flex）：未开启文案靠右、开启文案靠左 */
button:not([aria-checked='true']) {
  justify-content: flex-end;
}
button[aria-checked='true'] {
  justify-content: flex-start;
}
button:not([aria-checked='true']) .label {
  padding-left: calc(var(--thumb-size) + var(--thumb-offset) * 2 + var(--oas-space-1));
  padding-right: var(--oas-space-2);
  color: var(--oas-color-text-secondary);
}
button[aria-checked='true'] .label {
  padding-right: calc(var(--thumb-size) + var(--thumb-offset) * 2 + var(--oas-space-1));
  padding-left: var(--oas-space-2);
  color: var(--oas-color-bg);
}
/* 轨道外侧文案（size=xs/small 时展示） */
.outside-label {
  font-size: var(--oas-font-size-sm);
  line-height: 1;
  white-space: nowrap;
  user-select: none;
  color: var(--oas-color-text-secondary);
}
.outside-label[hidden] {
  display: none;
}
/* 外部标签（label 属性 / 默认插槽）：原生 label for 配对内部 button，
   点击标签即切换（热区承接通道），同时为 role=switch 提供可访问名称 */
.ext-label {
  order: 1;
  font-size: var(--oas-font-size-md);
  line-height: 1.4;
  color: var(--oas-color-text-primary);
  cursor: pointer;
  user-select: none;
}
.ext-label[hidden] {
  display: none;
}
:host([data-label-position='start']) .ext-label {
  order: -1;
}
:host([disabled]) .ext-label,
:host([data-disabled]) .ext-label {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
/* ---- status 校验态：轨道随状态着色（覆盖默认灰/主色两态），焦点环同步染色 ----
   注意置于 checked 背景规则之后（同特异性下后者胜出需靠源顺序，status 优先） */
:host([data-status='success']) button {
  background: var(--oas-color-success);
}
:host([data-status='warning']) button {
  background: var(--oas-color-warning);
}
:host([data-status='error']) button,
:host([aria-invalid='true']) button {
  background: var(--oas-color-danger);
}
:host([data-status='success']) button:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-success) 30%, transparent);
}
:host([data-status='warning']) button:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-warning) 30%, transparent);
}
:host([data-status='error']) button:focus-visible,
:host([aria-invalid='true']) button:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
/* 加载指示：放在滑块对侧、垂直居中（loading 时轨道内文案隐藏，互不遮挡） */
.spinner {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  margin-top: -7px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: oas-spin 0.8s linear infinite;
}
button:not([aria-checked='true']) .spinner {
  right: calc(var(--thumb-offset) + 2px);
  color: var(--oas-color-text-secondary);
}
button[aria-checked='true'] .spinner {
  left: calc(var(--thumb-offset) + 2px);
  color: var(--oas-color-bg);
}
@keyframes oas-spin {
  to {
    transform: rotate(360deg);
  }
}
`

export class OASSwitch extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'checked',
      'disabled',
      'loading',
      'checked-text',
      'unchecked-text',
      'size',
      'color',
      'disabled-skip',
      'label',
      'label-position',
      'checked-icon',
      'unchecked-icon',
      'true-value',
      'false-value',
      'status',
      'aria-label',
    ]
  }

  private btn: HTMLButtonElement | null = null
  private btnId = ''
  /** before-change 异步在途：期间按钮禁用 + spinner（与 loading 同视觉），防重复触发 */
  private pending = false
  /** aria-invalid 由 status=error 设置的所有权标志（清理时只移除自己设置的，不动宿主自设值） */
  private invalidByStatus = false
  /** light DOM 默认插槽是否有实际内容（label slot 通道；MutationObserver 维护增量） */
  private slotHasContent = false
  private childObserver: MutationObserver | null = null

  /**
   * 切换前拦截钩子（JS property 通道，attribute 传不了函数，对齐 select 的 el.filterMethod 先例）：
   * `(next: boolean) => boolean | Promise<boolean>`，返回 false 或 Promise reject 则不切换；
   * 异步在途期间组件进入加载态（spinner + 禁点）。reject 视为否决（错误不重抛，
   * 避免 WC 事件链外产生未处理 rejection 噪音；宿主需要在钩子内部自行处理错误）。
   */
  beforeChange: ((next: boolean) => boolean | Promise<boolean>) | null = null

  /** 当前映射值：true-value/false-value 在场时为对应字符串，否则为布尔开关态 */
  get value(): string | boolean {
    return this.mappedValue(this.hasAttr('checked'))
  }
  set value(v: string | boolean) {
    const tv = this.getAttr('true-value', '')
    const fv = this.getAttr('false-value', '')
    if (tv !== '' && v === tv) this.toggleAttribute('checked', true)
    else if (fv !== '' && v === fv) this.toggleAttribute('checked', false)
    else if (tv === '' && fv === '') this.toggleAttribute('checked', v === true || v === 'true')
    // 未匹配映射值：忽略（不猜测语义）
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <button part="switch" role="switch" aria-checked="false">
        <span class="thumb" part="thumb"><span class="thumb-icon" hidden></span></span>
        <span class="label" part="label" hidden></span>
        <span class="spinner" hidden></span>
      </button>
      <span class="outside-label" part="label" hidden></span>
      <label class="ext-label" part="label" hidden>
        <span class="label-text"></span>
        <span class="slot-wrap" hidden><slot></slot></span>
      </label>
    `
  }

  /** 缓存节点引用 + 绑定切换/焦点事件 + 分配确定性 id（render 与水合路径共用） */
  private bind(): void {
    this.btn = this.shadow.querySelector('button')
    this.btnId = `oas-switch-${++switchIdCounter}`
    if (this.btn) this.btn.id = this.btnId
    this.shadow.querySelector('.ext-label')?.setAttribute('for', this.btnId)

    this.btn?.addEventListener('click', () => this.requestToggle())
    // 焦点事件：内部 button 获得/失去焦点时派发 oas-focus / oas-blur
    this.btn?.addEventListener('focus', () => this.emit('focus'))
    this.btn?.addEventListener('blur', () => this.emit('blur'))

    // light DOM 默认插槽内容观察：label slot 通道内容增删/文本变化 → 重算标签可见性
    if (!this.childObserver) {
      const observer = new MutationObserver(() => {
        this.slotHasContent = this.computeSlotContent()
        this.update()
      })
      observer.observe(this, { childList: true, characterData: true, subtree: true })
      this.childObserver = observer
      this.onCleanup(() => {
        observer.disconnect()
        this.childObserver = null
      })
    }
    this.slotHasContent = this.computeSlotContent()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（switch 按钮存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('button[part="switch"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const btn = this.btn
    if (!btn) return
    const checked = this.hasAttr('checked')
    // disabled 就近读取全局禁用注入（组件显式 disabled > 豁免 > provider 注入）
    const disabled = this.injectDisabled()
    const busy = this.hasAttr('loading') || this.pending

    btn.setAttribute('aria-checked', String(checked))
    btn.disabled = disabled || busy

    // 尺寸：自身属性 > config-provider 注入 > medium（复用 button 的注入约定）；
    // 非法值回落 medium + dev warn（不再静默吞值）
    const size = normalizeSwitchSize(this.injectValue('size', 'medium'))
    btn.className = size

    // 可访问名称便捷通道：宿主直设 aria-label 时镜像给内部 button（显式 aria 优先于 label 关联名）
    const ariaLabel = this.getAttribute('aria-label')
    if (ariaLabel != null && ariaLabel !== '') btn.setAttribute('aria-label', ariaLabel)
    else btn.removeAttribute('aria-label')

    // 开关文案：开启显示 checked-text，关闭显示 unchecked-text；
    // xs/small 尺寸时文案放轨道外侧（小轨道塞不下文字），其余尺寸显示在轨道内滑块对侧
    const text = checked ? this.getAttr('checked-text') : this.getAttr('unchecked-text')
    const showOutside = (size === 'xs' || size === 'small') && text !== ''
    const label = btn.querySelector<HTMLElement>('.label')
    const outside = this.shadow.querySelector<HTMLElement>('.outside-label')
    if (label) {
      label.hidden = showOutside || busy || text === ''
      label.textContent = showOutside ? '' : text
    }
    if (outside) {
      outside.hidden = !showOutside || busy
      outside.textContent = showOutside ? text : ''
    }
    this.classList.toggle('has-outside-label', showOutside && !busy)

    const spinner = btn.querySelector<HTMLElement>('.spinner')
    if (spinner) spinner.hidden = !busy

    // 滑块图标：开启显示 checked-icon、关闭显示 unchecked-icon（未设置/非法名隐藏；dataset 缓存增量换名）
    const thumbIcon = btn.querySelector<HTMLElement>('.thumb-icon')
    if (thumbIcon) {
      const name = checked ? this.getAttr('checked-icon', '') : this.getAttr('unchecked-icon', '')
      const valid = isValidIcon(name)
      thumbIcon.hidden = !valid
      if (valid) {
        if (thumbIcon.dataset.icon !== name) {
          thumbIcon.innerHTML = `<oas-icon name="${name}"></oas-icon>`
          thumbIcon.dataset.icon = name
        }
      } else {
        thumbIcon.innerHTML = ''
        delete thumbIcon.dataset.icon
      }
    }

    // 外部标签：默认插槽内容优先于 label 属性文本
    const ext = this.shadow.querySelector<HTMLElement>('.ext-label')
    if (ext) {
      const textSpan = ext.querySelector<HTMLElement>('.label-text')
      const slotWrap = ext.querySelector<HTMLElement>('.slot-wrap')
      const labelText = this.getAttr('label', '')
      ext.hidden = !(this.slotHasContent || labelText !== '')
      if (textSpan) {
        textSpan.hidden = this.slotHasContent
        textSpan.textContent = labelText
      }
      if (slotWrap) slotWrap.hidden = !this.slotHasContent
    }
    // label-position 镜像（start/end，非法值静默回落 end）
    this.setAttribute(
      'data-label-position',
      normalizeChoice(this.getAttr('label-position', ''), 'end', ['start', 'end']),
    )

    // status 镜像 + aria-invalid 所有权（同 select 惯例；宿主自设 aria-invalid 等效 error 视觉）
    const status = normalizeChoice(this.getAttr('status', ''), '', VALID_STATUSES)
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')
    if (status === 'error') {
      if (!this.hasAttribute('aria-invalid')) this.invalidByStatus = true
      this.setAttribute('aria-invalid', 'true')
    } else if (this.invalidByStatus) {
      this.invalidByStatus = false
      this.removeAttribute('aria-invalid')
    }

    // 注入禁用态镜像（:host([data-disabled]) 的 label 视觉联动钩子）
    this.toggleAttribute('data-disabled', disabled)

    // 开启态自定义主色：以 --oas-color-primary 变量覆盖（焦点环等派生色一并生效）
    const color = this.getAttr('color')
    if (color) {
      btn.style.setProperty('--oas-color-primary', color)
    } else {
      btn.style.removeProperty('--oas-color-primary')
    }
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内 button */
  override focus(options?: FocusOptions): void {
    this.btn?.focus(options)
  }

  override blur(): void {
    this.btn?.blur()
  }

  /** 默认插槽是否有实际内容（元素节点或非空白文本节点；空白文本不算） */
  private computeSlotContent(): boolean {
    const slot = this.shadow.querySelector('slot')
    const nodes = slot?.assignedNodes({ flatten: true }) ?? []
    return nodes.some(
      (n) => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== ''),
    )
  }

  /** true-value/false-value 映射：未设置为布尔，部分设置时缺失侧回落布尔 */
  private mappedValue(next: boolean): string | boolean {
    const tv = this.getAttr('true-value', '')
    const fv = this.getAttr('false-value', '')
    if (tv === '' && fv === '') return next
    if (next) return tv !== '' ? tv : true
    return fv !== '' ? fv : false
  }

  /** 切换请求统一入口：disabled/loading/pending 拦截，before-change 钩子仲裁 */
  private requestToggle(): void {
    if (this.injectDisabled() || this.hasAttr('loading') || this.pending) return
    const next = !this.hasAttr('checked')
    const hook = this.beforeChange
    if (typeof hook !== 'function') {
      this.applyToggle(next)
      return
    }
    this.pending = true
    this.update()
    Promise.resolve()
      .then(() => hook(next))
      .then((ok) => {
        if (ok !== false) this.applyToggle(next)
      })
      .catch(() => {
        // reject = 否决（不切换 + 恢复可点），错误不重抛：宿主在钩子内自行处理
      })
      .finally(() => {
        this.pending = false
        this.update()
      })
  }

  private applyToggle(next: boolean): void {
    this.toggleAttribute('checked', next)
    this.emit('change', { checked: next, value: this.mappedValue(next) })
  }
}
