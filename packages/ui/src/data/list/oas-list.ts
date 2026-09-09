import { OASElement } from '@oas-ui/core'
import type { OASVirtualList } from '../virtual-list/oas-virtual-list.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
[hidden] {
  display: none !important;
}
.list {
  border-radius: var(--oas-radius-md);
  overflow: hidden;
}
.list[data-bordered='true'] {
  border: 1px solid var(--oas-color-border);
}
.list[data-split='true'] ::slotted(oas-list-item) {
  border-bottom: 1px solid var(--oas-color-border);
}
.list[data-split='true'] ::slotted(oas-list-item:last-child) {
  border-bottom: none;
}
/* 数据通道行（shadow 内 oas-list-item）的分隔线 */
.list[data-split='true'] .data-items oas-list-item {
  border-bottom: 1px solid var(--oas-color-border);
}
/* 末行去分隔线：仅列表视觉末行——非组行（直挂 .data-items）末行，
   或最后一个分组容器 .group 内的末行（组内行分隔线保留到下一组头前） */
.list[data-split='true'] .data-items > oas-list-item:last-child,
.list[data-split='true'] .data-items .group:last-child > oas-list-item:last-child {
  border-bottom: none;
}
/* 数据通道分组：同组连续项归入 .group 容器，组头是容器内第一个元素。
   组头吸顶范围=本组容器——下一组到顶时把上一组头顶走（原生 sticky 语义，
   组头不等高也不会叠条）；背景用 token 不透明盖住滚经行。组头不是行，
   不参与行 hover/clickable/roving */
.group-header {
  padding: var(--oas-space-2) var(--oas-space-4);
  font-size: var(--oas-font-size-sm);
  font-weight: 500;
  color: var(--oas-color-text-secondary);
  background: var(--oas-color-bg);
  border-bottom: 1px solid var(--oas-color-border);
}
.group-header[data-sticky] {
  position: sticky;
  top: 0;
  /* 吸顶时同列表后续分组滚经行（非定位）会盖在组头上——抬高组头图层压住行 */
  z-index: 1;
}
/* 滚动容器（max-height 设置时启用） */
.body {
  overflow-anchor: none;
}
/* 加载态：骨架占位（复用 Skeleton 流光风格） */
.skeleton {
  padding: var(--oas-space-3) var(--oas-space-4);
}
.sk-line {
  height: var(--oas-control-height-sm);
  border-radius: var(--oas-radius-sm);
  background: linear-gradient(90deg, var(--oas-color-bg-hover) 25%, var(--oas-color-border) 50%, var(--oas-color-bg-hover) 75%);
  background-size: 200% 100%;
  animation: oas-list-shimmer 1.5s infinite;
  margin-bottom: var(--oas-space-3);
}
.sk-title {
  width: 40%;
}
.sk-short {
  width: 62%;
  margin-bottom: 0;
}
@keyframes oas-list-shimmer {
  to { background-position: -200% 0; }
}
/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--oas-space-6);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--oas-color-bg-hover);
  border: 1px dashed var(--oas-color-border-strong);
  margin-bottom: var(--oas-space-2);
}
/* 页头 / 页尾 / 加载更多尾区 */
.header,
.footer {
  padding: var(--oas-space-3) var(--oas-space-4);
}
.header {
  border-bottom: 1px solid var(--oas-color-border);
}
.footer {
  border-top: 1px solid var(--oas-color-border);
}
.load-more {
  padding: var(--oas-space-3) var(--oas-space-4);
  text-align: center;
}
/* 内嵌虚拟列表的行与列表条目同款结构（分隔线由宿主模板自管） */
oas-virtual-list::part(item) {
  box-sizing: border-box;
}
`

/**
 * oas-list —— 数据/内容列表。
 *
 * 渲染两通道（与 oas-tree 的 data + template 惯例对齐）：
 * - 声明式：直接放 <oas-list-item> 子项；
 * - 数据通道：`data`（JSON 属性或 property）+ 可选 `template[slot="item"]` 克隆骨架，
 *   每行派发 `oas-item-render`（detail { index, item, element }）供宿主改写。
 * 有 data 走 data、无 data 回落声明式子项。
 *
 * 属性（kebab-case）：
 * - `bordered` / `split`：整体边框 / 条目分隔线（默认规则：无 bordered 自带分隔线）
 * - `size`：sm / md（默认）/ lg，行内边距与标题字号联动
 * - `loading`：骨架占位；`empty` / `empty-text`：空态；`stripe`：斑马纹
 * - `header` / `footer` / `load-more` / `empty`：命名插槽
 * - `max-height` + `bottom-offset`：滚动容器 + 触底事件 oas-reach-bottom
 * - `height` + `row-height`：虚拟滚动（内嵌 oas-virtual-list，要求 data 通道 + 定高行）
 * - 数据分组：数据项带 `group`（组名字符串，同组须连续）自动插入组头；可选
 *   `groupLabel` 字段自定义组头文案（缺省回落 group 值）。组头不占用行索引。
 *   普通渲染模式组头 `position: sticky` 吸顶（须在滚动容器内，配 max-height）；
 *   虚拟模式（height）下本批不做虚拟吸顶——分组数据自动回退全量渲染，
 *   组头以普通块呈现不吸顶。分组数据 + 超大行数不建议配 height 使用。
 *
 * 事件（bubbles + composed）：
 * - `oas-reach-bottom`：滚动触底（进入触底区派发一次，滚离后重新武装）
 * - `oas-item-render`：数据通道每行渲染后派发
 * - `oas-click`：条目点击（声明式/数据行由 oas-list-item 派发；虚拟行由列表代理）
 */
export class OASList extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'bordered',
      'split',
      'loading',
      'empty',
      'empty-text',
      'size',
      'stripe',
      'max-height',
      'bottom-offset',
      'height',
      'row-height',
      'data',
    ]
  }

  private rows: unknown[] = []
  private dataFromProperty = false
  private atBottom = false
  private raf = 0
  private body: HTMLElement | null = null
  private vlist: OASVirtualList | null = null

  get dataItems(): unknown[] {
    return this.rows.slice()
  }

  /** 数据通道 property（命名避坑：公开 attribute `data` 是 JSON 字符串通道，property 用
   *  `dataItems` 读取；写入经 `setData()`，避免与 HTMLElement.dataset 语义混淆） */
  set data(value: unknown[]) {
    this.setData(value)
  }

  setData(value: unknown[]): void {
    this.rows = Array.isArray(value) ? value.slice() : []
    this.dataFromProperty = true
    if (this.isConnected) this.update()
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="list" part="list">
        <div class="header" part="header" hidden><slot name="header"></slot></div>
        <div class="body" part="body">
          <div class="items" part="items"><slot></slot></div>
          <div class="data-items" part="data-items" hidden></div>
          <oas-virtual-list class="vlist" part="virtual" hidden></oas-virtual-list>
        </div>
        <div class="skeleton" part="skeleton" hidden>
          <div class="sk-line sk-title"></div>
          <div class="sk-line"></div>
          <div class="sk-line sk-short"></div>
        </div>
        <div class="empty" part="empty" hidden>
          <div class="empty-default" part="empty-default">
            <div class="empty-icon" aria-hidden="true"></div>
            <span part="empty-text"></span>
          </div>
          <slot name="empty"></slot>
        </div>
        <div class="footer" part="footer" hidden><slot name="footer"></slot></div>
        <div class="load-more" part="load-more" hidden><slot name="load-more"></slot></div>
      </div>
    `
  }

  /** 缓存节点引用 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.body = this.shadow.querySelector<HTMLElement>('[part="body"]')
    this.vlist = this.shadow.querySelector<OASVirtualList>('oas-virtual-list')
    this.body?.addEventListener('scroll', this.handleScroll, { passive: true })
    // 虚拟行点击代理（行是内嵌虚拟列表的 div，事件委托取 data-index）
    this.vlist?.addEventListener('click', this.handleVirtualClick)
    // 内嵌虚拟列表的 oas-item 拦截后以列表统一的 oas-item-render 契约重发
    this.vlist?.addEventListener('oas-item', this.handleVirtualItem as EventListener)
    for (const name of ['header', 'footer', 'load-more', 'empty']) {
      this.shadow
        .querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
        ?.addEventListener('slotchange', () => this.update())
    }
    this.onCleanup(() => {
      this.body?.removeEventListener('scroll', this.handleScroll)
      this.vlist?.removeEventListener('click', this.handleVirtualClick)
      this.vlist?.removeEventListener('oas-item', this.handleVirtualItem as EventListener)
      if (this.raf) cancelAnimationFrame(this.raf)
      this.raf = 0
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（list 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="list"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const list = this.shadow.querySelector('[part="list"]')
    if (!list) return
    const size = ['sm', 'lg'].includes(this.getAttr('size', '')) ? this.getAttr('size', '') : 'md'
    const stripe = this.hasAttr('stripe')
    list.setAttribute('data-bordered', String(this.hasAttr('bordered')))
    list.setAttribute('data-split', String(this.hasAttr('split') || !this.hasAttr('bordered')))
    list.setAttribute('data-size', size)

    this.parseData()

    const body = this.shadow.querySelector<HTMLElement>('[part="body"]')
    const itemsWrap = this.shadow.querySelector<HTMLElement>('[part="items"]')
    const dataItems = this.shadow.querySelector<HTMLElement>('[part="data-items"]')
    const skeleton = this.shadow.querySelector<HTMLElement>('[part="skeleton"]')
    const empty = this.shadow.querySelector<HTMLElement>('[part="empty"]')
    if (!body || !itemsWrap || !dataItems || !skeleton || !empty) return

    // 命名插槽显隐
    for (const name of ['header', 'footer', 'load-more'] as const) {
      const region = this.shadow.querySelector<HTMLElement>(`[part="${name}"]`)
      if (region) region.hidden = !this.slotHasContent(name)
    }
    const emptySlotHas = this.slotHasContent('empty')
    const emptyDefault = this.shadow.querySelector<HTMLElement>('[part="empty-default"]')
    if (emptyDefault) emptyDefault.hidden = emptySlotHas

    // 滚动容器（reach-bottom 载体）
    const maxHeight = this.getAttr('max-height', '')
    if (maxHeight !== '') {
      body.style.maxHeight = /^\d+$/.test(maxHeight) ? `${maxHeight}px` : maxHeight
      body.style.overflowY = 'auto'
    } else {
      body.style.maxHeight = ''
      body.style.overflowY = ''
    }

    const loading = this.hasAttr('loading')
    const dataActive = this.dataChannelActive()
    const grouped = dataActive && this.hasGroups()
    const virtualRequested = this.getAttr('height', '') !== ''
    // 分组 + 虚拟滚动：虚拟窗口下的吸顶与变高组头复杂，本批自动回退全量渲染
    // （组头普通块、不吸顶），避免虚拟列表误吞组头破坏行索引契约
    const virtual =
      !loading && dataActive && this.rows.length > 0 && virtualRequested && !grouped

    const hasDeclarative = Array.from(this.children).some(
      (c) => c.tagName.toLowerCase() === 'oas-list-item',
    )
    const isEmpty = !loading && (this.hasAttr('empty') || (dataActive ? this.rows.length === 0 : !hasDeclarative))

    body.hidden = loading || isEmpty
    skeleton.hidden = !loading
    empty.hidden = !isEmpty
    const text = this.shadow.querySelector<HTMLElement>('[part="empty-text"]')
    if (text && !emptySlotHas) text.textContent = this.getAttr('empty-text', this.t('list.empty'))

    itemsWrap.hidden = dataActive || virtual
    dataItems.hidden = !dataActive || virtual
    if (this.vlist) this.vlist.hidden = !virtual

    // 声明式子项：尺寸档与斑马纹下发（data-* 内部标记，条目 CSS 消费）
    if (!dataActive) {
      Array.from(this.children)
        .filter((c) => c.tagName.toLowerCase() === 'oas-list-item')
        .forEach((item, i) => {
          item.setAttribute('data-size', size)
          item.toggleAttribute('data-stripe', stripe && i % 2 === 1)
        })
    }

    // 先回迁模板（离开虚拟模式时模板从内嵌虚拟列表迁回 light DOM），再渲染数据行
    if (virtual) this.syncVirtual()
    else {
      this.restoreTemplate()
      if (dataActive) this.renderDataRows(dataItems, size, stripe, !virtualRequested)
    }

    // 触底检测（挂载即查一次是否已触底）
    if (maxHeight !== '') this.checkReachBottom()
  }

  /** 数据通道是否激活（property 或 data 属性给出过数组） */
  private dataChannelActive(): boolean {
    return this.dataFromProperty || this.getAttribute('data') != null
  }

  private parseData(): void {
    if (this.dataFromProperty) return
    const raw = this.getAttribute('data')
    if (raw == null) return
    try {
      const parsed: unknown = JSON.parse(raw)
      this.rows = Array.isArray(parsed) ? parsed : []
    } catch {
      /* 非法 JSON 忽略，保持内部值 */
    }
  }

  /** 命名插槽是否有真实内容（元素节点或非空白文本） */
  private slotHasContent(name: string): boolean {
    const slot = this.shadow.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
    if (!slot) return false
    return slot
      .assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  /** 数据通道行渲染：oas-list-item 承载模板克隆 + [data-index] 上下文绑定。
   *  连续同 `group` 的行归入一个 `.group` 容器（组头为首子元素）；组头带 data-sticky
   *  时在该组容器内吸顶（下一组到顶顶走上一组）。`stickyHeaders` 为 false（height 在设
   *  的分组回退）时组头普通渲染不吸顶。组头不计入行索引，行上下文/事件契约不变 */
  private renderDataRows(box: HTMLElement, size: string, stripe: boolean, stickyHeaders: boolean): void {
    box.innerHTML = ''
    const tpl = this.itemTemplate()
    let group: HTMLElement | null = null
    let prevGroup = ''
    this.rows.forEach((item, i) => {
      const meta =
        item != null && typeof item === 'object' && !Array.isArray(item)
          ? (item as { group?: unknown; groupLabel?: unknown })
          : null
      const groupName = meta && typeof meta.group === 'string' ? meta.group.trim() : ''
      // 组起点：新建分组容器（组头 + 本组行都收进容器，吸顶范围=本组）
      if (groupName !== '' && groupName !== prevGroup) {
        const rawLabel = meta && typeof meta.groupLabel === 'string' ? meta.groupLabel.trim() : ''
        const label = rawLabel !== '' ? rawLabel : groupName
        group = document.createElement('div')
        group.className = 'group'
        const header = document.createElement('div')
        header.className = 'group-header'
        if (stickyHeaders) header.setAttribute('data-sticky', '')
        // 语义：静态分隔/标题条，非可交互行——不进入行聚焦序列、不干扰行 roving
        header.setAttribute('role', 'separator')
        header.textContent = label
        group.appendChild(header)
        box.appendChild(group)
      } else if (groupName === '') {
        // 非组行重置分组段（直挂 data-items；其后同组字符串另起一组）
        group = null
      }
      prevGroup = groupName
      const row = document.createElement('oas-list-item')
      row.setAttribute('data-index', String(i))
      row.setAttribute('data-size', size)
      if (stripe && i % 2 === 1) row.setAttribute('data-stripe', '')
      ;(row as { itemData?: unknown }).itemData = item
      if (tpl) row.appendChild(cloneSlotContent(tpl))
      this.emit('item-render', { index: i, item, element: row })
      // 文本兜底仅用于原始值行：对象行的 title/description 由 item 的 itemData
      // 元数据兜底渲染（String(对象) 只会得到 "[object Object]"，用户实测缺陷）
      if (!tpl && !row.hasChildNodes() && (item == null || typeof item !== 'object'))
        row.textContent = String(item ?? '')
      ;(group ?? box).appendChild(row)
    })
  }

  /** 数据是否含分组字段（任一行的 group 为非空字符串即视为分组列表） */
  private hasGroups(): boolean {
    return this.rows.some((it) => {
      if (it == null || typeof it !== 'object' || Array.isArray(it)) return false
      const g = (it as { group?: unknown }).group
      return typeof g === 'string' && g.trim() !== ''
    })
  }

  /** 虚拟模式：内嵌 oas-virtual-list 接管（data → items、模板转发、行高透传） */
  private syncVirtual(): void {
    const v = this.vlist
    if (!v) return
    v.setAttribute('height', this.getAttr('height', '320'))
    v.setAttribute('item-height', this.getAttr('row-height', '64'))
    const tpl = this.itemTemplate()
    if (tpl) {
      for (const t of Array.from(v.querySelectorAll('template'))) {
        if (t !== tpl) t.remove()
      }
      if (tpl.parentElement !== v) v.appendChild(tpl)
    }
    v.items = this.rows
  }

  /** 离开虚拟模式：模板迁回宿主 light DOM（供普通数据渲染克隆） */
  private restoreTemplate(): void {
    const v = this.vlist
    if (!v) return
    for (const t of Array.from(v.querySelectorAll('template'))) {
      this.appendChild(t)
    }
  }

  private itemTemplate(): HTMLTemplateElement | null {
    const tpl = this.querySelector('template[slot="item"]')
    return tpl instanceof HTMLTemplateElement ? tpl : null
  }

  private handleScroll = (): void => {
    if (this.raf) return
    this.raf = requestAnimationFrame(() => {
      this.raf = 0
      this.checkReachBottom()
    })
  }

  /** 触底判定：剩余距离 ≤ bottom-offset 视为触底；进入时派发一次，滚离后重新武装 */
  private checkReachBottom(): void {
    const body = this.body
    if (!body) return
    const offset = Number(this.getAttr('bottom-offset', '0')) || 0
    const remaining = body.scrollHeight - body.scrollTop - body.clientHeight
    const atBottom = remaining <= offset
    if (atBottom && !this.atBottom) this.emit('reach-bottom', { scrollTop: body.scrollTop })
    this.atBottom = atBottom
  }

  /** 虚拟行点击代理：从内嵌虚拟列表行 div 的 data-index 还原 index/item */
  private handleVirtualClick = (e: Event): void => {
    const path = e.composedPath()
    const row = path.find(
      (n): n is HTMLElement => n instanceof HTMLElement && n.hasAttribute('data-index'),
    )
    if (!row) return
    const index = Number(row.getAttribute('data-index'))
    if (!Number.isInteger(index) || index < 0 || index >= this.rows.length) return
    this.emit('click', { index, item: this.rows[index] })
  }

  /** 内嵌虚拟列表的 oas-item 拦截重发（统一 oas-item-render 契约，detail 带 index/item/element） */
  private handleVirtualItem = (e: Event): void => {
    e.stopPropagation()
    const detail = (e as CustomEvent<{ index: number; item: unknown; element: HTMLElement }>).detail
    this.emit('item-render', detail)
  }
}

/**
 * <template> 子节点双形态克隆（静态 HTML/SSR 落在 template.content；Vue 等框架 CSR
 * 直插 template 元素时落在元素自身 childNodes、content 为空）——与 oas-tree 的
 * cloneSlotContent 同思路的就地实现（list 不依赖 tree 内部模块）。
 */
function cloneSlotContent(tpl: HTMLTemplateElement): DocumentFragment {
  const source = tpl.content.childNodes.length > 0 ? tpl.content : tpl
  const frag = document.createDocumentFragment()
  for (const node of Array.from(source.childNodes)) {
    frag.appendChild(node.cloneNode(true))
  }
  return frag
}


