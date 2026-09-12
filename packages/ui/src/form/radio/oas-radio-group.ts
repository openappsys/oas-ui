import { OASElement } from '@oas-ui/core'
// options 数据通道渲染 oas-radio 需保证自定义元素已定义（运行时副作用导入）
import './oas-radio.js'
import type { OASRadio } from './oas-radio.js'

/** size/status 归一化白名单（与单项侧一致，非法值不下发） */
const VALID_SIZES = ['small', 'medium', 'large'] as const
const VALID_STATUSES = ['error', 'warning', 'success'] as const

function normalizeChoice(raw: string, valid: readonly string[]): string {
  if (raw === '') return ''
  return (valid as readonly string[]).includes(raw) ? raw : ''
}

/** 组 options 数据通道的选项模型（与子元素声明式通道等价收敛） */
export interface RadioOption {
  label: string
  value: string
  disabled?: boolean
  /** 选项级辅助文本（下发子项 description） */
  description?: string
}

/** 键盘导航键集合（radiogroup 模式：方向键 + Home/End） */
const NAV_KEYS = new Set(['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'])

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
fieldset {
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
legend {
  padding: 0;
  margin-bottom: var(--oas-space-1);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
/* ---- direction 横排：flex-wrap 换行，列距放宽到 space-4 ---- */
:host([data-direction='horizontal']) fieldset {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--oas-space-2) var(--oas-space-4);
}
/* ---- options 数据通道：light 声明式让位（子项渲染进 shadow options 容器） ---- */
.options {
  display: contents;
}
:host([data-options-mode]) .slot-items {
  display: none;
}
`

/** 组内互斥 name：确定性计数器（SSR 快照可重复，浏览器多实例不冲突） */
let radioGroupCounter = 0

export class OASRadioGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'disabled', 'options', 'direction', 'size', 'status', 'readonly']
  }

  private items: OASRadio[] = []
  private groupName = `oas-radio-group-${++radioGroupCounter}`
  /** 已挂 oas-change 监听的子项（去重，修复 collect 重复挂监听机制债） */
  private boundItems = new WeakSet<OASRadio>()
  /** options 原文缓存（增量渲染比对） */
  private lastOptionsRaw: string | null = null
  /** 焦点在组内（子项间转移不派发 oas-focus/oas-blur） */
  private focusWithin = false

  get options(): RadioOption[] {
    return this.parseOptions(this.getAttr('options', ''))
  }
  set options(value: RadioOption[] | string) {
    this.setAttribute('options', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <fieldset part="group" role="radiogroup">
        <legend part="legend"><slot name="label"></slot></legend>
        <slot class="slot-items" part="items"></slot>
        <div class="options" part="options"></div>
      </fieldset>
    `
  }

  /** 绑定 slotchange + 键盘导航 + 组级焦点事件 + 初次收集（render 与水合路径共用） */
  private bind(): void {
    const slot = this.shadow.querySelector('slot:not([name])')
    slot?.addEventListener('slotchange', () => this.collect())
    // 键盘组模式（radiogroup 单停 + 方向键循环即选中）：原生 input 各藏 shadow，
    // 浏览器同名方向键分组跨 shadow 失效（playwright 实测），host 层 keydown 补齐。
    // shadow 内 input 的 keydown composed 冒泡到子项 host（retarget），再冒泡到组 host。
    this.addEventListener('keydown', this.handleKeydown)
    const fieldset = this.shadow.querySelector('fieldset')
    fieldset?.addEventListener('focusin', () => {
      if (this.focusWithin) return
      this.focusWithin = true
      this.emit('focus')
    })
    fieldset?.addEventListener('focusout', (e) => {
      if (!this.focusWithin) return
      if (this.isInternalFocusTarget((e as FocusEvent).relatedTarget)) return
      this.focusWithin = false
      this.emit('blur')
    })
    this.collect()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（fieldset 与默认 slot 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('fieldset')) return false
    if (!this.shadow.querySelector('slot:not([name])')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // direction 镜像（非法值回落 vertical）
    const direction = this.getAttr('direction', 'vertical')
    this.setAttribute('data-direction', direction === 'horizontal' ? 'horizontal' : 'vertical')
    this.syncOptionsMode()
    this.collect()
  }

  /** options 数据通道：属性在场时渲染 shadow 子项（原文未变跳过重建）；缺席时清空让位 light 声明式 */
  private syncOptionsMode(): void {
    const raw = this.getAttribute('options')
    if (raw === null) {
      if (this.lastOptionsRaw !== null) {
        this.lastOptionsRaw = null
        const box = this.shadow.querySelector('.options')
        if (box) box.innerHTML = ''
      }
      this.removeAttribute('data-options-mode')
      return
    }
    this.setAttribute('data-options-mode', '')
    if (raw === this.lastOptionsRaw) return
    this.lastOptionsRaw = raw
    const box = this.shadow.querySelector('.options')
    if (!box) return
    box.innerHTML = ''
    for (const opt of this.parseOptions(raw)) {
      const r = document.createElement('oas-radio')
      r.setAttribute('value', opt.value)
      if (opt.description) r.setAttribute('description', opt.description)
      if (opt.disabled) r.setAttribute('disabled', '')
      r.textContent = opt.label
      box.appendChild(r)
    }
  }

  /** 收集子项：options 模式取 shadow 容器内，否则取 light DOM */
  private collectItems(): OASRadio[] {
    if (this.hasAttribute('options')) {
      return [...this.shadow.querySelectorAll('.options oas-radio')] as OASRadio[]
    }
    return [...this.querySelectorAll('oas-radio')] as OASRadio[]
  }

  private collect(): void {
    const value = this.getAttr('value', '')
    const groupDisabled = this.hasAttr('disabled')
    const groupReadonly = this.hasAttr('readonly')
    const groupSize = normalizeChoice(this.getAttr('size', ''), VALID_SIZES)
    const groupStatus = normalizeChoice(this.getAttr('status', ''), VALID_STATUSES)
    this.items = this.collectItems()
    for (const r of this.items) {
      r.setAttribute('name', this.groupName)
      r.toggleAttribute('checked', r.getAttribute('value') === value)
      // 组级下发走 data-group-*（与子项显式属性分立，不互相覆盖）
      r.toggleAttribute('data-group-disabled', groupDisabled)
      r.toggleAttribute('data-group-readonly', groupReadonly)
      if (groupSize) r.setAttribute('data-group-size', groupSize)
      else r.removeAttribute('data-group-size')
      if (groupStatus) r.setAttribute('data-group-status', groupStatus)
      else r.removeAttribute('data-group-status')
      // 监听只挂一次（WeakSet 去重；移出组的子项由 items.includes 守卫兜底）
      if (!this.boundItems.has(r)) {
        this.boundItems.add(r)
        r.addEventListener('oas-change', this.handleItemChange)
      }
    }
    this.syncRoving()
  }

  /** roving tabindex：选中项（无选中时首个可用项）为唯一 Tab 停靠点，其余 -1 */
  private syncRoving(): void {
    const value = this.getAttr('value', '')
    let stop = this.items.findIndex((r) => !this.isItemBlocked(r) && r.getAttribute('value') === value)
    if (stop < 0) stop = this.items.findIndex((r) => !this.isItemBlocked(r))
    this.items.forEach((r, i) => {
      const input = r.shadowRoot?.querySelector('input')
      if (input) input.tabIndex = i === stop ? 0 : -1
    })
  }

  /** 子项是否可用（键盘导航参与判定）：非显式禁用 / 非组下发禁用 / 非只读 */
  private isItemBlocked(r: OASRadio): boolean {
    return (
      r.hasAttribute('disabled') ||
      r.hasAttribute('data-group-disabled') ||
      r.hasAttribute('data-group-readonly') ||
      r.hasAttribute('readonly')
    )
  }

  /** 键盘导航：方向键/Home/End 移动即选中（radio 语义），跳过禁用与只读项，循环回绕 */
  private handleKeydown = (e: KeyboardEvent): void => {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    if (!NAV_KEYS.has(e.key)) return
    const enabled = this.items.map((r, i) => (this.isItemBlocked(r) ? -1 : i)).filter((i) => i >= 0)
    if (enabled.length === 0) return
    e.preventDefault()
    const value = this.getAttr('value', '')
    const currentIdx = Math.max(
      0,
      this.items.findIndex((r) => r.getAttribute('value') === value),
    )
    const cur = enabled.indexOf(currentIdx)
    let next: number | undefined
    if (e.key === 'Home') {
      next = enabled[0]
    } else if (e.key === 'End') {
      next = enabled[enabled.length - 1]
    } else {
      const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1
      next = enabled[(cur + dir + enabled.length) % enabled.length]
    }
    if (next === undefined) return
    const target = this.items[next]
    if (!target) return
    // 移动即选中：程序点击复用全链路（原生切换 + 同名互斥 + oas-change + 组 value 同步）
    target.shadowRoot?.querySelector('input')?.click()
    target.focus()
  }

  private handleItemChange = (e: Event): void => {
    const r = e.target as OASRadio
    if (!this.items.includes(r)) return
    if (!r.hasAttribute('checked')) return
    const value = r.getAttribute('value') ?? ''
    this.setAttribute('value', value)
    this.emit('change', { value })
  }

  /** 焦点转移目标是否仍在组内（light 子项 / shadow options 子项 / 其 shadow 内部） */
  private isInternalFocusTarget(related: EventTarget | null): boolean {
    if (!(related instanceof Node)) return false
    const fieldset = this.shadow.querySelector('fieldset')
    if (fieldset?.contains(related) || this.contains(related)) return true
    return this.items.some((it) => it === related || (it.shadowRoot?.contains(related) ?? false))
  }

  private parseOptions(raw: string): RadioOption[] {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed)
        ? parsed.filter(
            (o): o is RadioOption => !!o && typeof o === 'object' && typeof (o as RadioOption).value === 'string',
          )
        : []
    } catch {
      return []
    }
  }
}
