import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

/** items JSON 条目 */
export interface InspectorTabItem {
  label: string
  value: string
  disabled?: boolean
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  min-width: 0;
}
:host([hidden]) {
  display: none;
}
.tablist {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  min-width: 0;
  overflow-x: auto;
}
.tab {
  appearance: none;
  box-sizing: border-box;
  flex-shrink: 0;
  height: var(--oas-control-height-xs, 20px);
  padding: 0 var(--oas-space-2);
  border: 1px solid transparent;
  border-radius: var(--oas-radius-full, 999px);
  background: transparent;
  color: var(--oas-color-text-secondary);
  font: inherit;
  font-size: var(--oas-font-size-xs);
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
}
.tab:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.tab:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.tab[aria-selected='true'] {
  background: var(--oas-inspector-tab-active-bg, var(--oas-color-primary));
  color: var(--oas-color-text-on-primary);
  font-weight: 500;
}
.tab[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.6;
}
.tab[aria-disabled='true']:hover {
  background: transparent;
  color: var(--oas-color-text-secondary);
}
`

/**
 * oas-inspector-tabs —— 属性面板胶囊 tab 条。
 *
 * 属性（kebab-case）：
 * - `items`：JSON `[{ label, value, disabled? }]`（attribute 声明式通道，对齐库内数据组件惯例）；
 *   非法 JSON 渲染为空并 dev 告警一次
 * - `value`：当前 tab（属性即状态——点击后组件更新并反射该属性，宿主可监听 oas-change 协调）
 *
 * 事件：`oas-change`（detail `{ value }`，bubbles + composed）。
 *
 * a11y：`role="tablist"` + `role="tab"` + `aria-selected` + roving tabindex（方向键移动、
 * Home/End 跳两端、Enter/Space 选中；RTL 下方向键镜像）；disabled 项 aria-disabled 可聚焦。
 */
export class OASInspectorTabs extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items', 'value', 'dir']
  }

  private tablistEl: HTMLElement | null = null
  private itemsCache: InspectorTabItem[] = []
  private warnedBrokenItems = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="tablist" part="tablist" role="tablist"></div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.tablistEl = this.shadow.querySelector('[part="tablist"]')
    this.tablistEl?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const tab = target.closest?.('[role="tab"]') as HTMLElement | null
      if (!tab || tab.getAttribute('aria-disabled') === 'true') return
      this.selectTab(tab.dataset.value ?? '')
    })
    this.tablistEl?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（tablist 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="tablist"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.toggleAttribute('data-rtl', isRtl(this))
    this.parseItems()
    this.renderTabs()
  }

  /** 解析 items JSON（attribute 声明式通道）：非法 JSON 渲染为空 + dev 告警一次 */
  private parseItems(): void {
    const raw = this.getAttr('items', '')
    const parsed: InspectorTabItem[] = []
    if (raw !== '') {
      try {
        const arr = JSON.parse(raw) as unknown
        if (Array.isArray(arr)) {
          for (const it of arr) {
            if (
              it &&
              typeof it === 'object' &&
              typeof (it as InspectorTabItem).label === 'string' &&
              typeof (it as InspectorTabItem).value === 'string'
            ) {
              parsed.push(it as InspectorTabItem)
            }
          }
        }
      } catch {
        if (!this.warnedBrokenItems) {
          this.warnedBrokenItems = true
          console.warn('[oas-inspector-tabs] items JSON 解析失败，已按空列表渲染')
        }
      }
    }
    this.itemsCache = parsed
  }

  /** 渲染 tab 列表（全量重建：items 集合小，重建成本可忽略），aria-selected/roving 同步 */
  private renderTabs(): void {
    const list = this.tablistEl
    if (!list) return
    list.innerHTML = ''
    const current = this.getAttr('value', '')
    for (const item of this.itemsCache) {
      const tab = document.createElement('button')
      tab.type = 'button'
      tab.setAttribute('part', 'tab')
      tab.setAttribute('role', 'tab')
      tab.dataset.value = item.value
      tab.textContent = item.label
      tab.setAttribute('aria-selected', String(item.value === current))
      if (item.disabled) tab.setAttribute('aria-disabled', 'true')
      list.appendChild(tab)
    }
    this.syncRoving()
  }

  /**
   * roving tabindex：当前项进 Tab 序列，其余 -1。
   * 当前项定位：shadow.activeElement（焦点移动中）优先，无焦点回落 aria-selected 项，
   * 再回落首项（无选中且无焦点——初始态）。
   */
  private syncRoving(): void {
    const tabs = this.tabs()
    if (tabs.length === 0) return
    const ae = this.shadow.activeElement
    const focusIdx = tabs.findIndex((t) => t === ae)
    const current =
      focusIdx >= 0 ? tabs[focusIdx]! : (tabs.find((t) => t.getAttribute('aria-selected') === 'true') ?? tabs[0]!)
    for (const t of tabs) t.setAttribute('tabindex', t === current ? '0' : '-1')
  }

  private tabs(): HTMLButtonElement[] {
    return [...(this.tablistEl?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])]
  }

  /** 选中 tab：更新 value 属性（反射）+ 派发 oas-change；值未变时零事件（幂等） */
  private selectTab(value: string): void {
    if (value === this.getAttr('value', '')) return
    this.setAttribute('value', value)
    this.emit('change', { value })
  }

  /**
   * tablist 键盘流：方向键移动焦点（roving）、Home/End 跳两端、Enter/Space 选中。
   * RTL 下横向方向键镜像（ArrowLeft = 视觉下一个）。
   * 当前位置定位：shadow.activeElement 优先（真实浏览器），happy-dom 等环境拿不到时
   * 回落 aria-selected 项（roving 语义下两者一致）。
   */
  private handleKey(e: KeyboardEvent): void {
    const tabs = this.tabs().filter((t) => t.getAttribute('aria-disabled') !== 'true')
    if (tabs.length === 0) return
    const rtl = isRtl(this)
    const nextKey = rtl ? 'ArrowLeft' : 'ArrowRight'
    const prevKey = rtl ? 'ArrowRight' : 'ArrowLeft'
    const ae = this.shadow.activeElement
    let cur = tabs.findIndex((t) => t === ae)
    if (cur < 0) cur = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')
    if (e.key === nextKey || e.key === prevKey || e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      let idx = cur
      if (e.key === nextKey) idx = cur < 0 ? 0 : (cur + 1) % tabs.length
      else if (e.key === prevKey) idx = cur < 0 ? tabs.length - 1 : (cur - 1 + tabs.length) % tabs.length
      else if (e.key === 'Home') idx = 0
      else idx = tabs.length - 1
      const target = tabs[idx]
      if (target) {
        target.focus()
        this.syncRoving()
      }
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (ae instanceof HTMLButtonElement && ae.getAttribute('aria-disabled') !== 'true') {
        this.selectTab(ae.dataset.value ?? '')
      }
    }
  }
}
