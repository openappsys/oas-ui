import { OASElement } from '@oas-ui/core'

export interface ToggleItem {
  label: string
  value: string
  disabled?: boolean
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.group {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--oas-space-2);
}
.item {
  appearance: none;
  box-sizing: border-box;
  min-height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    color var(--oas-transition-fast) var(--oas-ease-out);
}
.item:hover {
  border-color: var(--oas-color-primary);
}
.item:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.item[aria-checked='true'] {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
.item[aria-disabled='true'] {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
  border-color: var(--oas-color-border);
}
`

/**
 * oas-toggle-group —— 切换组（单选/多选互斥按钮组）。
 *
 * 属性（kebab-case）：
 * - `items`：JSON `[{ label, value, disabled? }]`
 * - `value`：单选为字符串；`multiple` 时为 JSON 数组字符串
 * - `multiple`：多选模式（checkbox 语义）
 *
 * 事件（bubbles + composed）：
 * - `oas-change`：`{ value: string }`（单选）或 `{ value: string[] }`（多选）
 *
 * 语义：单选 `role="radiogroup"` + `radio`；多选 `role="group"` + `checkbox`；
 * 键盘方向键移动（单选即选中、多选移动焦点 + Space 切换），roving tabindex。
 */
export class OASToggleGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'multiple', 'items']
  }

  private itemsList: ToggleItem[] = []
  private buttons: HTMLButtonElement[] = []
  private group: HTMLElement | null = null
  private lastItemsRaw: string | null = ''
  private lastMultiple = false
  /** 子元素通道结构签名（上次比对基准）；与 lastItemsRaw 互斥标记当前数据源 */
  private lastChildSig = ''
  /** 子元素通道观察器：light DOM 里 oas-toggle-item 增删或属性/文本变化 → 重解析渲染 */
  private childObserver: MutationObserver | null = null
  /** 多选模式 roving tabindex 的焦点项下标 */
  private focusIndex = 0

  /**
   * items 数据通道：Vue/React 模板渲染时 `items` 命中实例属性走 property 赋值，
   * setter 单向反射到 attribute（attribute 为唯一权威数据源），经 attributeChangedCallback
   * 走既有 parse/update 链路——与 table/select 的数据组件 JSON attribute 通道约定一致。
   */
  get items(): ToggleItem[] {
    return this.itemsList
  }
  set items(value: ToggleItem[] | string) {
    this.setAttribute('items', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="group" part="group"></div>
    `
  }

  /** 缓存节点引用 + 绑定键盘导航（render 与水合路径共用） */
  private bind(): void {
    this.group = this.shadow.querySelector('.group')
    this.group?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（group 容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.group')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // 子元素通道观察器（重连后重建；items 属性显式时子元素被忽略，观察器空转无副作用）
    this.ensureChildObserver()
    const multiple = this.hasAttr('multiple')
    const multipleChanged = multiple !== this.lastMultiple
    this.lastMultiple = multiple
    let itemsChanged: boolean
    // 双通道：items 属性显式设置时数据驱动优先；否则解析子元素收敛到同一 items 模型渲染。
    // items 通道沿用增量比对（原文未变化跳过全量重建）；子元素通道按结构签名比对，
    // 数据源切换（items ⇄ 子元素）由 lastItemsRaw/lastChildSig 互斥标记强制触发重建
    if (this.hasAttribute('items')) {
      const itemsRaw = this.getAttribute('items') ?? ''
      itemsChanged = itemsRaw !== this.lastItemsRaw
      this.lastItemsRaw = itemsRaw
      this.lastChildSig = ''
      this.parseItems()
    } else {
      const sig = this.childSig()
      itemsChanged = sig !== this.lastChildSig || this.lastItemsRaw !== null
      this.lastChildSig = sig
      this.lastItemsRaw = null
      this.parseChildItems()
    }
    if (itemsChanged || multipleChanged) {
      this.renderItems()
    } else {
      this.syncState()
    }
  }

  // ===== 子元素声明式通道 =====

  /** 子元素通道签名：轻量序列化 light DOM 数据载体（tag + 属性 + 文本），供增量比对跳过无变化重建 */
  private childSig(): string {
    const walk = (el: Element): string => {
      let s = `${el.tagName}:`
      for (const a of Array.from(el.attributes)) s += `${a.name}=${a.value};`
      s += `#${el.textContent ?? ''}`
      return s
    }
    return Array.from(this.children).map(walk).join('|')
  }

  /** 解析 light DOM 的 `<oas-toggle-item>` 数据载体为 ToggleItem[]（其余 light DOM 内容忽略） */
  private parseChildItems(): void {
    const items: ToggleItem[] = []
    for (const child of Array.from(this.children)) {
      if (child.tagName !== 'OAS-TOGGLE-ITEM') continue
      const item: ToggleItem = {
        label: this.childLabel(child),
        value: child.getAttribute('value') ?? '',
      }
      if (child.hasAttribute('disabled')) item.disabled = true
      items.push(item)
    }
    this.itemsList = items
  }

  /** 默认插槽 label 文本（trim） */
  private childLabel(el: Element): string {
    let text = ''
    for (const node of el.childNodes) {
      text += node.textContent ?? ''
    }
    return text.trim()
  }

  /**
   * 子元素通道观察器：只监听 light DOM 子元素（数据载体增删/属性/文本变化 → 重解析）。
   * 组件自身动作不写 light DOM，无需自引用守卫。
   */
  private ensureChildObserver(): void {
    if (this.childObserver) return
    const observer = new MutationObserver(() => {
      this.update()
    })
    observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: ['value', 'disabled', 'slot'],
    })
    this.childObserver = observer
    this.onCleanup(() => {
      observer.disconnect()
      this.childObserver = null
    })
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter(
            (o): o is ToggleItem =>
              !!o &&
              typeof o === 'object' &&
              typeof (o as ToggleItem).value === 'string' &&
              typeof (o as ToggleItem).label === 'string',
          )
        : []
    } catch {
      this.itemsList = []
    }
  }

  private selectedValues(): string[] {
    if (!this.hasAttr('multiple')) {
      const v = this.getAttr('value', '')
      return v ? [v] : []
    }
    try {
      const parsed = JSON.parse(this.getAttr('value', '[]'))
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
    } catch {
      return []
    }
  }

  private renderItems(): void {
    const group = this.group
    if (!group) return
    group.innerHTML = ''
    this.buttons = []
    const selected = this.selectedValues()
    this.focusIndex = this.resolveInitialFocus(selected)
    for (const item of this.itemsList) {
      const btn = document.createElement('button')
      btn.className = 'item'
      btn.setAttribute('part', 'item')
      btn.type = 'button'
      btn.textContent = item.label
      btn.addEventListener('click', () => this.selectItem(item))
      this.buttons.push(btn)
      group.appendChild(btn)
    }
    this.syncState()
  }

  private resolveInitialFocus(selected: string[]): number {
    const idx = this.itemsList.findIndex((it) => it.value === selected[0])
    return idx >= 0 ? idx : 0
  }

  private syncState(): void {
    const group = this.group
    if (!group) return
    const multiple = this.hasAttr('multiple')
    group.setAttribute('role', multiple ? 'group' : 'radiogroup')
    group.setAttribute('aria-label', this.t('toggleGroup.group'))
    const selected = this.selectedValues()
    this.buttons.forEach((btn, i) => {
      const item = this.itemsList[i]
      if (!item) return
      btn.setAttribute('role', multiple ? 'checkbox' : 'radio')
      btn.setAttribute('aria-checked', String(selected.includes(item.value)))
      btn.setAttribute('aria-disabled', String(item.disabled ?? false))
      if (item.disabled) btn.tabIndex = -1
      else if (multiple) btn.tabIndex = i === this.focusIndex ? 0 : -1
      else btn.tabIndex = item.value === selected[0] ? 0 : -1
    })
  }

  private selectItem(item: ToggleItem): void {
    if (item.disabled) return
    if (this.hasAttr('multiple')) {
      const set = new Set(this.selectedValues())
      if (set.has(item.value)) set.delete(item.value)
      else set.add(item.value)
      const next = [...set]
      this.setAttribute('value', JSON.stringify(next))
      this.emit('change', { value: next })
    } else {
      if (this.getAttr('value') === item.value) return
      this.setAttribute('value', item.value)
      this.emit('change', { value: item.value })
    }
    this.focusIndex = this.buttons.findIndex((_b, i) => this.itemsList[i] === item)
    this.update()
  }

  private currentRadioIndex(): number {
    const selected = this.selectedValues()
    const idx = this.itemsList.findIndex((it) => it.value === selected[0])
    return idx >= 0 ? idx : 0
  }

  private handleKey(e: KeyboardEvent): void {
    const items = this.itemsList
    if (items.length === 0) return
    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0)
    if (enabled.length === 0) return
    const multiple = this.hasAttr('multiple')

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      this.move(1, enabled)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      this.move(-1, enabled)
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      const idx = multiple ? this.focusIndex : this.currentRadioIndex()
      const item = items[idx]
      if (item) this.selectItem(item)
    }
  }

  private move(dir: 1 | -1, enabled: number[]): void {
    const multiple = this.hasAttr('multiple')
    const curIdx = multiple ? this.focusIndex : this.currentRadioIndex()
    const cur = enabled.indexOf(curIdx)
    const next = enabled[(cur + dir + enabled.length) % enabled.length]
    if (next === undefined) return
    const item = this.itemsList[next]
    if (!item) return
    if (multiple) {
      this.focusIndex = next
      this.syncState()
      this.buttons[next]?.focus()
    } else {
      this.selectItem(item)
      this.buttons[next]?.focus()
    }
  }
}
