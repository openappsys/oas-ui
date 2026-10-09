import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

export interface ScopeBarItem {
  label: string
  value: string
  disabled?: boolean
}

const STYLE = `
:host {
  display: inline-flex;
  font-family: inherit;
  outline: none;
  /* 尺寸档内部变量（类标记切换；不占公开 API，外部请用 size 属性）——medium 为默认档 */
  --_ch: var(--oas-control-height-md);
  --_fs: var(--oas-font-size-md);
  --_pad: var(--oas-space-3);
}
/* small 档：控高/字号/内边距收窄（缺省 medium 见 :host 基态） */
:host(.oas-sb-small) {
  --_ch: var(--oas-control-height-sm);
  --_fs: var(--oas-font-size-sm);
  --_pad: var(--oas-space-2);
}
:host(.oas-sb-large) {
  --_ch: var(--oas-control-height-lg);
  --_fs: var(--oas-font-size-lg);
  --_pad: var(--oas-space-4);
}
:host([hidden]) {
  display: none;
}
/* 药丸行轨道：圆角胶囊底 + 内边距（bg-hover token，dark 自动跟随） */
.group {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-1);
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-full, 999px);
  box-sizing: border-box;
}
.item {
  appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: var(--_ch);
  min-width: var(--_ch);
  padding: 0 var(--_pad);
  border: 1px solid transparent;
  border-radius: var(--oas-radius-full, 999px);
  background: transparent;
  color: var(--oas-color-text-primary);
  font-size: var(--_fs);
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    color var(--oas-transition-fast) var(--oas-ease-out);
}
.item:hover {
  background: var(--oas-color-bg-elevated);
  color: var(--oas-color-primary);
}
.item:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* active 填充：主色低透明度铺底 + 主色文字安全档（全 token 派生，dark 自动跟随） */
.item[aria-pressed='true'] {
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
  color: var(--oas-color-primary-text);
  font-weight: 500;
}
.item[aria-pressed='true']:hover {
  background: color-mix(in srgb, var(--oas-color-primary) 18%, transparent);
  color: var(--oas-color-primary-text);
}
.item[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
  color: var(--oas-color-text-disabled);
  background: transparent;
}
/* 整组禁用：宿主光标提示（子项各自禁用态见 .item[aria-disabled] ） */
:host([disabled]) {
  cursor: not-allowed;
}
/* ===== 移动端触摸目标：coarse pointer 下药丸最小高度抬到 --oas-touch-target-min ===== */
@media (pointer: coarse) {
  .item {
    min-height: var(--oas-touch-target-min, 44px);
  }
}
`

/**
 * oas-scope-bar —— 过滤药丸行（过滤器 / 作用域切换场景）。
 *
 * 一排可点击药丸，选中项以低透明度主色「active 填充」表达；单选（缺省，radio 语义——组内互斥，
 * 点已选中项不变更）与多选（`multiple`，每项独立切换）。`value` 受控（单选字符串 / 多选 JSON 数组），
 * 点击派发 `oas-change`。轻量、可与 `oas-toolbar` 组合（作为其中一个 Tab 停靠点，内部方向键自管）。
 *
 * 属性（kebab-case）：
 * - `items`：JSON `[{ label, value, disabled? }]`（property 赋值单向反射 attribute）
 * - `value`：单选为字符串（radio 语义）；`multiple` 时为 JSON 数组字符串
 * - `multiple`：多选模式（每个药丸独立切换）
 * - `disabled`：整组禁用（叠加最近 oas-toolbar 的 disabled）
 * - `size`：尺寸档位（small/medium/large），缺省跟随最近 oas-toolbar 的 size
 * - `label`：无障碍组名（`role="group"` 的 `aria-label`，宿主按语言自行传入）
 *
 * 事件（bubbles + composed）：
 * - `oas-change`：`{ value: string }`（单选）或 `{ value: string[] }`（多选）
 *
 * 语义：容器 `role="group"`（有 `label` 时带 `aria-label`），每个药丸 `aria-pressed`；
 * 键盘：单 Tab 停靠 + 内部 roving tabindex，方向键在组内移动（单选即选中，多选只移动焦点 +
 * Space/Enter 切换），Home/End 跳转首末；RTL 下水平方向键镜像。
 */
export class OASScopeBar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items', 'value', 'multiple', 'disabled', 'size', 'label']
  }

  private itemsList: ScopeBarItem[] = []
  private buttons: HTMLButtonElement[] = []
  private group: HTMLElement | null = null
  /** items 原文（上次比对基准）：未变化时跳过全量重建，只增量同步选中态 */
  private lastItemsRaw: string | null = null
  private lastMultiple = false
  /** 组内 roving 焦点项下标（多选模式移动焦点用；单选跟随选中值） */
  private focusIndex = 0

  /** items 数据通道：Vue/React 模板渲染时命中实例属性走 property 赋值，setter 单向反射 attribute */
  get items(): ScopeBarItem[] {
    return this.itemsList
  }
  set items(value: ScopeBarItem[] | string) {
    this.setAttribute('items', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 当前选中值集合（供外部读取） */
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
    const multiple = this.hasAttr('multiple')
    const multipleChanged = multiple !== this.lastMultiple
    this.lastMultiple = multiple
    const itemsRaw = this.getAttr('items', '[]')
    const itemsChanged = itemsRaw !== this.lastItemsRaw
    this.lastItemsRaw = itemsRaw
    this.parseItems()
    this.syncSize()
    if (itemsChanged || multipleChanged) {
      this.renderItems()
    } else {
      this.syncState()
    }
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter(
            (o): o is ScopeBarItem =>
              !!o &&
              typeof o === 'object' &&
              typeof (o as ScopeBarItem).value === 'string' &&
              typeof (o as ScopeBarItem).label === 'string',
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
    this.classList.toggle('oas-sb-small', size === 'small')
    this.classList.toggle('oas-sb-large', size === 'large')
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
    // 优先选中项、其次首个可用项：跳过 disabled，保证 roving 恒有一个 tab stop
    const selIdx = this.itemsList.findIndex((it) => it.value === selected[0] && !it.disabled)
    if (selIdx >= 0) return selIdx
    const first = this.itemsList.findIndex((it) => !it.disabled)
    return first >= 0 ? first : 0
  }

  private syncState(): void {
    const group = this.group
    if (!group) return
    group.setAttribute('role', 'group')
    // 无障碍组名：宿主 label 属性（内容相关，按语言由宿主传入）；无则不设 aria-label
    const label = this.getAttr('label', '')
    if (label) group.setAttribute('aria-label', label)
    else group.removeAttribute('aria-label')
    const { disabled, focusable } = this.disabledState()
    const selected = this.parseSelected()
    // roving 校正：焦点索引落在 disabled 项时移到首个可用项（恢复「恰好一个 tab stop」）
    if (this.itemsList[this.focusIndex]?.disabled) this.focusIndex = this.resolveInitialFocus(selected)
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

  private selectItem(item: ScopeBarItem): void {
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

  /** 按 value 触发一次选择（单选选中/多选切换）——供外部程序化调用 */
  selectValue(value: string): void {
    const item = this.itemsList.find((it) => it.value === value)
    if (item) this.selectItem(item)
  }

  private handleKey(e: KeyboardEvent): void {
    const { disabled, focusable } = this.disabledState()
    if (disabled && !focusable) return
    const items = this.itemsList
    if (items.length === 0) return
    const enabled = items.map((it, i) => (it.disabled || (disabled && !focusable) ? -1 : i)).filter((i) => i >= 0)
    if (enabled.length === 0) return
    const multiple = this.hasAttr('multiple')

    // RTL 镜像：水平轴方向键换向（flex 视觉序随书写方向反转），竖向键不受影响
    const fwd = isRtl(this) ? 'ArrowLeft' : 'ArrowRight'
    const back = isRtl(this) ? 'ArrowRight' : 'ArrowLeft'
    if (e.key === fwd || e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      this.move(1, enabled, multiple)
    } else if (e.key === back || e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      this.move(-1, enabled, multiple)
    } else if (e.key === 'Home') {
      e.preventDefault()
      e.stopPropagation()
      this.moveTo(enabled[0]!, multiple)
    } else if (e.key === 'End') {
      e.preventDefault()
      e.stopPropagation()
      this.moveTo(enabled[enabled.length - 1]!, multiple)
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
    this.moveTo(next, multiple)
  }

  private moveTo(index: number, multiple: boolean): void {
    this.focusIndex = index
    if (!multiple) {
      const item = this.itemsList[index]
      if (item && !item.disabled) {
        this.selectItem(item)
        this.focusInternal()
        return
      }
    }
    this.syncState()
    this.buttons[index]?.focus()
  }

  private focusInternal(): void {
    const btn = this.buttons[this.focusIndex] ?? this.buttons.find((_, i) => !this.itemsList[i]?.disabled)
    if (btn) btn.focus()
  }
}
