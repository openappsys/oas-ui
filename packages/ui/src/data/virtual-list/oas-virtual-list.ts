import { OASElement } from '@oas-ui/core'

export interface VirtualWindow {
  start: number
  end: number
}

/**
 * 虚拟滚动窗口计算 —— 单一事实源，供 oas-virtual-list / table / tree 复用。
 *
 * 定高模型：scrollTop 决定首可见项，视口高度决定可见项数，buffer 做上下越界预渲染。
 */
export function computeVirtualWindow(
  scrollTop: number,
  viewport: number,
  itemHeight: number,
  count: number,
  buffer = 4,
): VirtualWindow {
  if (!count || count <= 0) return { start: 0, end: 0 }
  const vh = Math.max(0, Number.isFinite(viewport) ? viewport : 0)
  const ih = Math.max(1, Number.isFinite(itemHeight) ? itemHeight : 0)
  const buf = Math.max(0, Number.isFinite(buffer) ? buffer : 0)
  // 夹取 scrollTop 到有效滚动区间，避免窗口越界（start >= end）
  const rawTop = Math.max(0, Number.isFinite(scrollTop) ? scrollTop : 0)
  const top = Math.min(rawTop, Math.max(0, count * ih - vh))
  const start = Math.max(0, Math.floor(top / ih) - buf)
  const end = Math.min(count, Math.ceil((top + vh) / ih) + buf)
  return { start, end }
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
}
:host([hidden]) {
  display: none;
}
.viewport {
  height: 100%;
  overflow: auto;
  overscroll-behavior: contain;
}
.inner {
  position: relative;
}
.padding {
  width: 100%;
}
.item {
  box-sizing: border-box;
  overflow: hidden;
}
`

/**
 * oas-virtual-list —— 视口窗口渲染的通用虚拟列表。
 *
 * 属性（kebab-case）：
 * - `height`：视口高度（px），默认 320
 * - `item-height`：定高项高度（px），默认 36
 * - `buffer`：上下预渲染项数，默认 4
 * - `scroll-target`：外部滚动容器 CSS 选择器（可选）。设置后组件不自带滚动条，
 *   改为监听外部容器的 scroll 并按其 scrollTop 计算窗口（组件本身占满全部内容高度）。
 * - `items`：JSON 字符串形式的数据（可选，property `items` 优先）
 *
 * property：
 * - `items: unknown[]` —— 数据数组（推荐通道，优先级高于 items 属性）
 *
 * 事件（bubbles + composed）：
 * - `oas-scroll`：`{ scrollTop, start, end }`，rAF 节流
 * - `oas-item`：`{ index, item, element }`，每个可见项渲染后派发，宿主可据此绑定内容
 *
 * slot：
 * - `template[slot="item"]`：可选模板，克隆到每个可见项容器；未提供时默认渲染 String(item)
 */
export class OASVirtualList extends OASElement {
  static override get observedAttributes(): string[] {
    return ['height', 'item-height', 'buffer', 'scroll-target', 'items']
  }

  private data: unknown[] = []
  private itemsFromProperty = false
  private start = 0
  private end = 0
  private raf = 0
  private viewport: HTMLElement | null = null
  private inner: HTMLElement | null = null
  private paddingTop: HTMLElement | null = null
  private paddingBottom: HTMLElement | null = null
  private itemsEl: HTMLElement | null = null
private itemRole = ''
  private boundTarget: HTMLElement | null = null

  get items(): unknown[] {
    return this.data.slice()
  }

  set items(value: unknown[]) {
    this.data = Array.isArray(value) ? value.slice() : []
    this.itemsFromProperty = true
    if (this.isConnected) this.update()
  }

  protected override render(): void {
    const innerHtml = `
      <div class="inner" part="inner">
        <div class="padding padding-top" part="padding-top"></div>
        <div class="items" part="items"></div>
        <div class="padding padding-bottom" part="padding-bottom"></div>
      </div>
    `
    // scroll-target 模式：不自建滚动视口，由外部容器滚动整段内容
    this.shadow.innerHTML = this.scrollTargetSelector()
      ? `<style>${STYLE}</style>${innerHtml}`
      : `<style>${STYLE}</style>
         <div class="viewport" part="viewport" tabindex="0">${innerHtml}</div>`
    this.viewport = this.shadow.querySelector('.viewport')
    this.inner = this.shadow.querySelector('.inner')
    this.paddingTop = this.shadow.querySelector('.padding-top')
    this.paddingBottom = this.shadow.querySelector('.padding-bottom')
    this.itemsEl = this.shadow.querySelector('.items')
    this.onCleanup(() => {
      if (this.boundTarget) this.boundTarget.removeEventListener('scroll', this.handleScrollEvt)
      this.boundTarget = null
      if (this.raf) cancelAnimationFrame(this.raf)
      this.raf = 0
    })
    this.update()
  }

  protected override update(): void {
    this.parseItems()
    this.syncTarget()
    this.syncRoles()
    this.renderWindow()
  }

  /** items-role 透传到 .items 容器、item-role 透传到每个 item（opt-in，供 tree 等虚拟化 ARIA 层级用） */
  private syncRoles(): void {
    const role = this.getAttribute('items-role')
    const itemsEl = this.itemsEl
    if (itemsEl) {
      if (role) itemsEl.setAttribute('role', role)
      else itemsEl.removeAttribute('role')
    }
    this.itemRole = this.getAttribute('item-role') ?? ''
  }

  private listHeight(): number {
    return Number(this.getAttr('height', '320')) || 320
  }

  private itemHeight(): number {
    return Number(this.getAttr('item-height', '36')) || 36
  }

  private buffer(): number {
    return Number(this.getAttr('buffer', '4')) || 4
  }

  private scrollTargetSelector(): string {
    return this.getAttr('scroll-target', '')
  }

  private parseItems(): void {
    if (this.itemsFromProperty) return
    const raw = this.getAttribute('items')
    if (raw == null) return
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) this.data = parsed
    } catch {
      /* 非法 JSON 忽略，保持内部值 */
    }
  }

  /** 解析滚动目标并绑定 scroll 监听（可切换：外部容器 → 自身视口） */
  private syncTarget(): void {
    const selector = this.scrollTargetSelector()
    let target: HTMLElement | null = null
    if (selector) {
      const root = this.getRootNode() as Document | ShadowRoot
      target = (root.querySelector(selector) as HTMLElement | null) ?? null
    }
    target ??= this.viewport
    if (!target || target === this.boundTarget) return
    if (this.boundTarget) this.boundTarget.removeEventListener('scroll', this.handleScrollEvt)
    target.addEventListener('scroll', this.handleScrollEvt, { passive: true })
    this.boundTarget = target
  }

  private renderWindow(): void {
    const itemsEl = this.itemsEl
    if (!itemsEl) return
    const count = this.data.length
    const ih = this.itemHeight()
    const vh = this.listHeight()
    // 数据收缩时夹取 scrollTop，避免窗口越界
    const target = this.boundTarget ?? this.viewport
    const scrollTop = Math.min(
      Math.max(0, target ? target.scrollTop : 0),
      Math.max(0, count * ih - vh),
    )
    const win = computeVirtualWindow(scrollTop, vh, ih, count, this.buffer())
    this.start = win.start
    this.end = win.end
    if (this.inner) this.inner.style.height = `${count * ih}px`
    if (this.paddingTop) this.paddingTop.style.height = `${win.start * ih}px`
    if (this.paddingBottom) this.paddingBottom.style.height = `${(count - win.end) * ih}px`
    this.renderItems()
  }

  private renderItems(): void {
    const itemsEl = this.itemsEl
    if (!itemsEl) return
    itemsEl.innerHTML = ''
    const tpl = this.itemTemplate()
    const ih = this.itemHeight()
    for (let i = this.start; i < this.end; i++) {
      const item = this.data[i]
      const el = document.createElement('div')
      el.className = 'item'
      el.setAttribute('part', 'item')
      el.setAttribute('data-index', String(i))
      if (this.itemRole) el.setAttribute('role', this.itemRole)
      el.style.height = `${ih}px`
      if (tpl) {
        el.appendChild(tpl.content.cloneNode(true))
        this.emit('item', { index: i, item, element: el })
      } else {
        // 先派发 oas-item 让宿主（如 oas-tree）填充内容；宿主没填才回退 String(item)，
        // 否则对象项会残留 "[object Object]" 文本（此前 tree 虚拟滚动的 bug）
        this.emit('item', { index: i, item, element: el })
        if (!el.hasChildNodes()) el.textContent = String(item ?? '')
      }
      itemsEl.appendChild(el)
    }
  }

  private itemTemplate(): HTMLTemplateElement | null {
    const tpl = this.querySelector('template[slot="item"]')
    return tpl instanceof HTMLTemplateElement ? tpl : null
  }

  private handleScrollEvt = (): void => {
    if (this.raf) return
    this.raf = requestAnimationFrame(() => {
      this.raf = 0
      const target = this.boundTarget ?? this.viewport
      const scrollTop = target ? target.scrollTop : 0
      this.renderWindow()
      this.emit('scroll', { scrollTop, start: this.start, end: this.end })
    })
  }
}
