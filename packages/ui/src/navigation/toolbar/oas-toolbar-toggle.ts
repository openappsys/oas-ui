import { OASElement } from '@oas-ui/core'

export interface ToolbarToggleItem {
  label: string
  value: string
  disabled?: boolean
}

const STYLE = `
:host {
  display: inline-flex;
  font-family: inherit;
  outline: none;
}
.group {
  display: inline-flex;
  gap: var(--oas-space-1);
}
.item {
  appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--oas-control-height-md);
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-2);
  border: 1px solid transparent;
  border-radius: var(--oas-radius-md);
  background: transparent;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    color var(--oas-transition-fast) var(--oas-ease-out);
}
.item:hover {
  background: var(--oas-color-bg-hover);
}
.item:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.item[aria-pressed='true'] {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.item[aria-pressed='true']:hover {
  background: var(--oas-color-primary-hover);
  border-color: var(--oas-color-primary-hover);
}
.item[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
  background: transparent;
  border-color: transparent;
  color: var(--oas-color-text-disabled);
}
:host([size='small']) .item,
:host(.oas-tt-small) .item {
  min-width: var(--oas-control-height-sm);
  height: var(--oas-control-height-sm);
  font-size: var(--oas-font-size-sm);
  padding: 0 var(--oas-space-1);
}
:host([size='large']) .item,
:host(.oas-tt-large) .item {
  min-width: var(--oas-control-height-lg);
  height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-lg);
  padding: 0 var(--oas-space-3);
}
`

/**
 * oas-toolbar-toggle —— 工具栏切换组（编辑器加粗/斜体/对齐等场景）。
 *
 * 属性（kebab-case）：
 * - `items`：JSON `[{ label, value, disabled? }]`（property 赋值单向反射 attribute）
 * - `value`：单选为字符串（radio 语义）；`multiple` 时为 JSON 数组字符串
 * - `multiple`：多选模式（每个按钮独立切换）
 * - `disabled`：整组禁用
 * - `size`：尺寸档位（small/medium/large），缺省跟随最近 oas-toolbar 的 size
 *
 * 事件（bubbles + composed）：
 * - `oas-change`：`{ value: string }`（单选）或 `{ value: string[] }`（多选）
 *
 * 语义：容器 `role="group"` + `aria-label`，每个按钮 `aria-pressed`（工具栏 toggle 按钮惯例）；
 * 键盘：方向键在组内移动（单选即选中，多选只移动焦点 + Space/Enter 切换）；
 * 内部 roving tabindex，宿主聚焦时转发到当前项（作为工具栏的一个 Tab 停靠点）。
 */
export class OASToolbarToggle extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items', 'value', 'multiple', 'disabled', 'size']
  }

  private itemsList: ToolbarToggleItem[] = []
  private buttons: HTMLButtonElement[] = []
  private group: HTMLElement | null = null
  private lastItemsRaw: string | null = ''
  private lastMultiple = false
  /** 子元素通道结构签名（上次比对基准）；与 lastItemsRaw 互斥标记当前数据源 */
  private lastChildSig = ''
  /** 子元素通道观察器：light DOM 里 oas-toolbar-toggle-item 增删或属性/文本变化 → 重解析渲染 */
  private childObserver: MutationObserver | null = null
  /** 组内 roving 焦点项下标（多选模式移动焦点用；单选跟随选中值） */
  private focusIndex = 0

  /** items 数据通道：Vue/React 模板渲染时命中实例属性走 property 赋值，setter 单向反射 attribute */
  get items(): ToolbarToggleItem[] {
    return this.itemsList
  }
  set items(value: ToolbarToggleItem[] | string) {
    this.setAttribute('items', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 当前选中值集合（供工具栏溢出镜像等外部读取） */
  get selectedValues(): string[] {
    return this.parseSelected()
  }

  /** 当前选中值（单选场景的 value 属性原文） */
  get currentValue(): string {
    return this.getAttr('value', '')
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="group" part="group" role="group"></div>
    `
  }

  /** 缓存节点引用 + 绑定键盘/焦点转发（render 与水合路径共用） */
  private bind(): void {
    this.group = this.shadow.querySelector('.group')
    this.group?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    // 组内 focusin：记录焦点项（内部 roving 的 tabindex 基准）
    this.group?.addEventListener('focusin', (e) => {
      const target = e.target as HTMLElement
      const idx = this.buttons.indexOf(target as HTMLButtonElement)
      if (idx >= 0) {
        this.focusIndex = idx
        this.syncState()
      }
    })
    // 宿主聚焦转发：工具栏 roving 把焦点给宿主（Tab 停靠点），内部把焦点给当前项
    this.addEventListener('focusin', () => this.focusInternal())
    this.tabIndex = 0
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
    this.syncSize()
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

  /** 解析 light DOM 的 `<oas-toolbar-toggle-item>` 数据载体为 ToolbarToggleItem[]（其余 light DOM 内容忽略） */
  private parseChildItems(): void {
    const items: ToolbarToggleItem[] = []
    for (const child of Array.from(this.children)) {
      if (child.tagName !== 'OAS-TOOLBAR-TOGGLE-ITEM') continue
      const item: ToolbarToggleItem = {
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
            (o): o is ToolbarToggleItem =>
              !!o &&
              typeof o === 'object' &&
              typeof (o as ToolbarToggleItem).value === 'string' &&
              typeof (o as ToolbarToggleItem).label === 'string',
          )
        : []
    } catch {
      this.itemsList = []
    }
  }

  /** 尺寸：自身 size 属性 > 最近 oas-toolbar 的 size > medium（类标记，不反射回 attribute 防递归） */
  private effectiveSize(): string {
    const own = this.getAttr('size', '')
    if (own === 'small' || own === 'medium' || own === 'large') return own
    const tb = this.closest('oas-toolbar')
    const tbSize = tb?.getAttribute('size') ?? ''
    return tbSize === 'small' || tbSize === 'large' ? tbSize : 'medium'
  }

  private syncSize(): void {
    const size = this.effectiveSize()
    this.classList.toggle('oas-tt-small', size === 'small')
    this.classList.toggle('oas-tt-large', size === 'large')
  }

  /** 禁用判定：自身 disabled 或最近工具栏 disabled。focusable = 工具栏 focusable-when-disabled 模式 */
  private disabledState(): { disabled: boolean; focusable: boolean } {
    const ownDisabled = this.hasAttr('disabled')
    const tb = this.closest('oas-toolbar')
    const tbDisabled = tb?.hasAttribute('disabled') ?? false
    const tbFocusable = tbDisabled && (tb?.hasAttribute('focusable-when-disabled') ?? false)
    return { disabled: ownDisabled || tbDisabled, focusable: !ownDisabled && tbFocusable }
  }

  private parseSelected(): string[] {
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
    const selected = this.parseSelected()
    this.focusIndex = this.resolveInitialFocus(selected)
    for (const item of this.itemsList) {
      const btn = document.createElement('button')
      btn.className = 'item'
      btn.setAttribute('part', 'item')
      btn.type = 'button'
      btn.dataset.value = item.value
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
    group.setAttribute('role', 'group')
    group.setAttribute('aria-label', this.t('toolbar.toggleGroup'))
    const { disabled, focusable } = this.disabledState()
    const selected = this.parseSelected()
    this.buttons.forEach((btn, i) => {
      const item = this.itemsList[i]
      if (!item) return
      btn.setAttribute('aria-pressed', String(selected.includes(item.value)))
      const itemDisabled = item.disabled || disabled
      btn.setAttribute('aria-disabled', String(itemDisabled))
      if (itemDisabled && !focusable) btn.tabIndex = -1
      else btn.tabIndex = i === this.focusIndex ? 0 : -1
    })
  }

  /** 内部 roving 焦点项下标（跳过禁用项） */
  private resolveFocusIndex(): number {
    const { disabled, focusable } = this.disabledState()
    const enabled = this.itemsList
      .map((it, i) => (it.disabled || (disabled && !focusable) ? -1 : i))
      .filter((i) => i >= 0)
    if (enabled.length === 0) return -1
    if (!enabled.includes(this.focusIndex)) this.focusIndex = enabled[0]!
    return this.focusIndex
  }

  private selectItem(item: ToolbarToggleItem): void {
    const { disabled } = this.disabledState()
    if (item.disabled || disabled) return
    this.focusIndex = this.itemsList.indexOf(item)
    if (this.hasAttr('multiple')) {
      const set = new Set(this.parseSelected())
      if (set.has(item.value)) set.delete(item.value)
      else set.add(item.value)
      const next = [...set]
      this.setAttribute('value', JSON.stringify(next))
      this.emit('change', { value: next })
    } else {
      if (this.getAttr('value', '') === item.value) return
      this.setAttribute('value', item.value)
      this.emit('change', { value: item.value })
    }
    this.syncState()
  }

  /** 供工具栏溢出镜像调用：按 value 触发一次选择（单选选中/多选切换） */
  selectValue(value: string): void {
    const item = this.itemsList.find((it) => it.value === value)
    if (item) this.selectItem(item)
  }

  private handleKey(e: KeyboardEvent): void {
    const { disabled, focusable } = this.disabledState()
    if (disabled && !focusable) return
    const items = this.itemsList
    if (items.length === 0) return
    const enabled = items
      .map((it, i) => (it.disabled || (disabled && !focusable) ? -1 : i))
      .filter((i) => i >= 0)
    if (enabled.length === 0) return
    const multiple = this.hasAttr('multiple')

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      this.move(1, enabled, multiple)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      this.move(-1, enabled, multiple)
    } else if (e.key === ' ' || e.key === 'Enter') {
      if (multiple) {
        e.preventDefault()
        e.stopPropagation()
        const item = items[this.focusIndex]
        if (item) this.selectItem(item)
      }
      // 单选：radio 语义，方向键移动即选中；Space/Enter 不重复处理（原生 button 已激活）
    }
  }

  private move(dir: 1 | -1, enabled: number[], multiple: boolean): void {
    if (!enabled.includes(this.focusIndex)) {
      this.focusIndex = enabled[0] ?? -1
    }
    const cur = enabled.indexOf(this.focusIndex)
    const next = enabled[(cur + dir + enabled.length) % enabled.length]
    if (next === undefined) return
    this.focusIndex = next
    if (!multiple) {
      const item = this.itemsList[next]
      if (item) this.selectItem(item)
    } else {
      this.syncState()
      this.buttons[next]?.focus()
    }
  }

  private focusInternal(): void {
    this.resolveFocusIndex()
    const btn = this.buttons[this.focusIndex]
    if (btn) btn.focus()
  }
}
