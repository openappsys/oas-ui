import { OASElement } from '@oas-ui/core'
// options 数据通道渲染 oas-checkbox 需保证自定义元素已定义（运行时副作用导入）
import './oas-checkbox.js'
import type { OASCheckbox } from './oas-checkbox.js'

/** size/status 归一化白名单（与单项侧一致，非法值不下发） */
const VALID_SIZES = ['small', 'medium', 'large'] as const
const VALID_STATUSES = ['error', 'warning', 'success'] as const

function normalizeChoice(raw: string, valid: readonly string[]): string {
  if (raw === '') return ''
  return (valid as readonly string[]).includes(raw) ? raw : ''
}

/** 组 options 数据通道的选项模型（与子元素声明式通道等价收敛） */
export interface CheckboxOption {
  label: string
  value: string
  disabled?: boolean
  /** 选项级辅助文本（下发子项 description） */
  description?: string
  /** 标记该项为全选选项（组内自动联动勾选/半选，不参与组 value） */
  checkAll?: boolean
}

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

export class OASCheckboxGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'disabled', 'options', 'direction', 'max', 'min', 'size', 'status', 'readonly']
  }

  private items: OASCheckbox[] = []
  /** 已挂 oas-change / oas-limit-blocked 监听的子项（去重，修复 collect 重复挂监听机制债） */
  private boundItems = new WeakSet<OASCheckbox>()
  /** options 原文缓存（增量渲染比对） */
  private lastOptionsRaw: string | null = null
  /** 焦点在组内（子项间转移不派发 oas-focus/oas-blur） */
  private focusWithin = false

  get options(): CheckboxOption[] {
    return this.parseOptions(this.getAttr('options', ''))
  }
  set options(value: CheckboxOption[] | string) {
    this.setAttribute('options', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <fieldset part="group">
        <legend part="legend"><slot name="label"></slot></legend>
        <slot class="slot-items" part="items"></slot>
        <div class="options" part="options"></div>
      </fieldset>
    `
  }

  /** 绑定 slotchange + 组级焦点事件 + 初次收集（render 与水合路径共用） */
  private bind(): void {
    const slot = this.shadow.querySelector('slot:not([name])')
    slot?.addEventListener('slotchange', () => this.collect())
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
      const cb = document.createElement('oas-checkbox')
      cb.setAttribute('value', opt.value)
      if (opt.description) cb.setAttribute('description', opt.description)
      if (opt.disabled) cb.setAttribute('disabled', '')
      if (opt.checkAll) cb.setAttribute('check-all', '')
      cb.textContent = opt.label
      box.appendChild(cb)
    }
  }

  /** 收集子项：options 模式取 shadow 容器内，否则取 light DOM */
  private collectItems(): OASCheckbox[] {
    if (this.hasAttribute('options')) {
      return [...this.shadow.querySelectorAll('.options oas-checkbox')] as OASCheckbox[]
    }
    return [...this.querySelectorAll('oas-checkbox')] as OASCheckbox[]
  }

  private collect(): void {
    const values = this.parseValue()
    const groupDisabled = this.hasAttr('disabled')
    const groupReadonly = this.hasAttr('readonly')
    const groupSize = normalizeChoice(this.getAttr('size', ''), VALID_SIZES)
    const groupStatus = normalizeChoice(this.getAttr('status', ''), VALID_STATUSES)
    this.items = this.collectItems()
    for (const cb of this.items) {
      const isAll = cb.hasAttribute('check-all')
      // 全选项勾选态由 syncCheckAll 联动计算，不随组 value 同步
      if (!isAll) cb.toggleAttribute('checked', values.includes(cb.getAttribute('value') ?? ''))
      // 组级下发走 data-group-*（与子项显式属性分立，不互相覆盖）
      cb.toggleAttribute('data-group-disabled', groupDisabled)
      cb.toggleAttribute('data-group-readonly', groupReadonly)
      if (groupSize) cb.setAttribute('data-group-size', groupSize)
      else cb.removeAttribute('data-group-size')
      if (groupStatus) cb.setAttribute('data-group-status', groupStatus)
      else cb.removeAttribute('data-group-status')
      cb.toggleAttribute('data-limit-blocked', this.limitBlockedFor(cb, values))
      // 监听只挂一次（WeakSet 去重；移出组的子项由 owns 守卫兜底）
      if (!this.boundItems.has(cb)) {
        this.boundItems.add(cb)
        cb.addEventListener('oas-change', this.handleItemChange)
        cb.addEventListener('oas-limit-blocked', this.handleLimitBlocked)
      }
    }
    this.syncCheckAll()
  }

  private handleItemChange = (e: Event): void => {
    const cb = e.target as OASCheckbox
    if (!this.items.includes(cb)) return
    if (cb.hasAttribute('check-all')) {
      this.applyCheckAll(cb)
      return
    }
    const value = cb.getAttribute('value') ?? ''
    const current = new Set(this.parseValue())
    if (cb.hasAttribute('checked')) {
      // max 防御回滚（点击路径已被 data-limit-blocked 拦截，此路覆盖键盘/程序直改）
      const max = this.maxLimit()
      if (max !== null && !current.has(value) && current.size >= max) {
        cb.removeAttribute('checked')
        this.emit('exceed-limit', { value, max })
        return
      }
      current.add(value)
    } else {
      // min 防御回滚（≤min 时已选项不可取消）
      const min = this.minLimit()
      if (min !== null && current.has(value) && current.size <= min) {
        cb.toggleAttribute('checked', true)
        return
      }
      current.delete(value)
    }
    const next = [...current]
    this.setAttribute('value', JSON.stringify(next))
    this.emit('change', { value: next })
  }

  /** 子项数量限制拦截转发：oas-limit-blocked（子项）→ oas-exceed-limit（组，detail: { value, max }） */
  private handleLimitBlocked = (e: Event): void => {
    const cb = e.target as OASCheckbox
    if (!this.items.includes(cb)) return
    const max = this.maxLimit()
    if (max !== null) {
      const value = cb.getAttribute('value') ?? ''
      this.emit('exceed-limit', { value, max })
    }
  }

  /** 全选项（check-all）联动：子项全勾 → 勾选；部分 → 半选；无 → 空态（跳过禁用项） */
  private syncCheckAll(): void {
    const values = this.parseValue()
    for (const cb of this.items) {
      if (!cb.hasAttribute('check-all')) continue
      const selectable = this.selectableValues()
      const count = selectable.filter((v) => values.includes(v)).length
      const all = count > 0 && count === selectable.length
      cb.toggleAttribute('checked', all)
      cb.toggleAttribute('indeterminate', count > 0 && !all)
    }
  }

  /** 全选项点击：目标全选（受 max 截断）/ 取消全选；check-all 项自身不参与组 value */
  private applyCheckAll(cb: OASCheckbox): void {
    void cb
    const selectable = this.selectableValues()
    const values = this.parseValue()
    const allSelected = selectable.length > 0 && selectable.every((v) => values.includes(v))
    let next: string[]
    if (allSelected) {
      next = []
    } else {
      const max = this.maxLimit()
      next = max !== null ? selectable.slice(0, max) : selectable
    }
    this.setAttribute('value', JSON.stringify(next))
    const value = [...next]
    this.emit('change', { value })
  }

  /** 可选值集合：非 check-all 且非显式禁用的子项 value（去空） */
  private selectableValues(): string[] {
    return this.items
      .filter((it) => !it.hasAttribute('check-all') && !it.hasAttribute('disabled'))
      .map((it) => it.getAttribute('value') ?? '')
      .filter((v) => v !== '')
  }

  /** 组数量限制：max 达上限未选项拦截 / min 达下限已选项拦截（双向，naive 对称语义） */
  private limitBlockedFor(cb: OASCheckbox, values: string[]): boolean {
    if (cb.hasAttribute('check-all')) return false
    const value = cb.getAttribute('value') ?? ''
    const checked = values.includes(value)
    const max = this.maxLimit()
    if (max !== null && !checked && values.length >= max) return true
    const min = this.minLimit()
    if (min !== null && checked && values.length <= min) return true
    return false
  }

  private maxLimit(): number | null {
    return this.positiveIntAttr('max')
  }

  private minLimit(): number | null {
    return this.positiveIntAttr('min')
  }

  private positiveIntAttr(name: string): number | null {
    const n = Number.parseInt(this.getAttr(name, '').trim(), 10)
    return Number.isNaN(n) || n <= 0 ? null : n
  }

  /** 焦点转移目标是否仍在组内（light 子项 / shadow options 子项 / 其 shadow 内部） */
  private isInternalFocusTarget(related: EventTarget | null): boolean {
    if (!(related instanceof Node)) return false
    const fieldset = this.shadow.querySelector('fieldset')
    if (fieldset?.contains(related) || this.contains(related)) return true
    return this.items.some((it) => it === related || (it.shadowRoot?.contains(related) ?? false))
  }

  private parseValue(): string[] {
    const raw = this.getAttr('value', '[]')
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
    } catch {
      return []
    }
  }

  private parseOptions(raw: string): CheckboxOption[] {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed)
        ? parsed.filter(
            (o): o is CheckboxOption => !!o && typeof o === 'object' && typeof (o as CheckboxOption).value === 'string',
          )
        : []
    } catch {
      return []
    }
  }
}
