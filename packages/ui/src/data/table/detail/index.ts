import { rowKeyValue } from '../oas-table-row-key.js'
import { isInteractiveEvent } from '../oas-table-interactive.js'

export interface RowDetail {
  row: Record<string, unknown>
  key: string
  /** 可见行下标（0 基；windowed 为当前窗口内下标） */
  rowIndex: number
}

export interface MasterDetailOptions {
  /** 宿主提供的详情容器（不注入表格 shadow，布局由宿主决定） */
  panel: HTMLElement
  /** 渲染详情内容；返回字符串按纯文本写入，返回 Node 直接挂载，返回空值走空态 */
  render: (detail: RowDetail) => string | Node | null | undefined
  /** 面板可访问名称（写入 aria-label，必填；语言由宿主决定） */
  label: string
  /** 空态文本（未选中任何行时显示，默认空字符串） */
  emptyText?: string
  /** 点击已选中的行是否收起详情（默认 false：保持展开并重新渲染） */
  collapsible?: boolean
  /** 选中变化回调（含清空） */
  onSelect?: (detail: RowDetail | null) => void
}

export interface MasterDetail {
  /** 以可见行下标选中/清空；越界或行不存在时清空 */
  select(rowIndex: number | null): void
  /** 当前选中（未选中为 null） */
  readonly selected: RowDetail | null
  destroy(): void
}

const STYLE_ID = 'oas-table-detail-style'
const DETAIL_STYLE = `
tr.row[data-detail-selected='true'] td {
  background: color-mix(in srgb, var(--oas-color-primary) 8%, transparent);
}
tr.row[data-detail-selected='true'] td:first-child {
  box-shadow: inset 3px 0 0 var(--oas-color-primary);
}
`
/** 同一 shadowRoot 可能被多个 master-detail 复用：样式引用计数，最后一个销毁时移除 */
const styleRefs = new WeakMap<ShadowRoot, { node: HTMLStyleElement; count: number }>()

function acquireStyle(root: ShadowRoot): void {
  const existing = styleRefs.get(root)
  if (existing) {
    existing.count++
    return
  }
  const node = document.createElement('style')
  node.id = STYLE_ID
  node.textContent = DETAIL_STYLE
  root.appendChild(node)
  styleRefs.set(root, { node, count: 1 })
}

function releaseStyle(root: ShadowRoot): void {
  const entry = styleRefs.get(root)
  if (!entry) return
  entry.count--
  if (entry.count > 0) return
  entry.node.remove()
  styleRefs.delete(root)
}

function rowsOf(table: HTMLElement): HTMLTableRowElement[] {
  return [...(table.shadowRoot?.querySelectorAll<HTMLTableRowElement>('tr.row') ?? [])]
}

/**
 * 主从详情胶水：点击行 → 渲染到宿主面板；行高亮挂在 `tr[data-detail-selected]`。
 *
 * 纯宿主侧 helper（不注册能力、不改表格数据）：面板布局、关闭按钮、数据来源由宿主决定。
 * 渲染后行节点会重建，用 MutationObserver 重新标记当前选中行。
 */
export function createMasterDetail(table: HTMLElement, options: MasterDetailOptions): MasterDetail {
  const root = table.shadowRoot
  if (!root) throw new Error('[oas-table] createMasterDetail 需要已升级的 oas-table 元素（请先 import 表格入口）')
  if (!options.label || options.label.trim() === '') {
    throw new Error('[oas-table] createMasterDetail 需要非空 label（详情面板的可访问名称）')
  }
  let selected: RowDetail | null = null
  let observer: MutationObserver | null = null
  let destroyed = false

  acquireStyle(root)

  const highlight = (): void => {
    for (const tr of rowsOf(table)) {
      tr.toggleAttribute('data-detail-selected', selected !== null && tr.getAttribute('data-key') === selected.key)
    }
  }

  const renderPanel = (): void => {
    const panel = options.panel
    panel.textContent = ''
    if (panel.getAttribute('role') === null) panel.setAttribute('role', 'region')
    panel.setAttribute('aria-label', options.label)
    if (!selected) {
      if (options.emptyText) panel.textContent = options.emptyText
      return
    }
    const content = options.render(selected)
    if (content == null) {
      if (options.emptyText) panel.textContent = options.emptyText
    } else if (typeof content === 'string') {
      panel.textContent = content
    } else {
      panel.appendChild(content)
    }
  }

  const findRow = (key: string): Record<string, unknown> | null => {
    const data = (table as unknown as { data?: Array<Record<string, unknown>> }).data ?? []
    const rowKeyAttr = table.getAttribute('row-key') ?? 'key'
    const walk = (rows: readonly Record<string, unknown>[]): Record<string, unknown> | null => {
      for (const item of rows) {
        if (rowKeyValue(item, rowKeyAttr) === key) return item
        const children = item.children
        if (Array.isArray(children)) {
          const found = walk(children as Array<Record<string, unknown>>)
          if (found) return found
        }
      }
      return null
    }
    return walk(data)
  }

  const detailAt = (rowIndex: number): RowDetail | null => {
    const tr = rowsOf(table)[rowIndex]
    const key = tr?.getAttribute('data-key')
    if (!tr || key == null) return null
    const row = findRow(key)
    return row ? { row, key, rowIndex } : null
  }

  const emit = (): void => {
    table.dispatchEvent(new CustomEvent('oas-detail-change', { detail: selected }))
    options.onSelect?.(selected)
  }

  const apply = (next: RowDetail | null): void => {
    const sameKey = next !== null && selected !== null && next.key === selected.key
    if (!next && !selected) return
    if (sameKey && !options.collapsible) {
      // 同一行重复点击：刷新内容但不重复派发选中变化
      selected = next
      highlight()
      renderPanel()
      return
    }
    selected = sameKey && options.collapsible ? null : next
    highlight()
    renderPanel()
    emit()
  }

  /** data 变化（含行内编辑回写）后刷新详情内容；数据中行消失才清空（滚出渲染窗口不清空） */
  const refresh = (): void => {
    if (!selected) return
    const row = findRow(selected.key)
    if (!row) {
      apply(null)
      return
    }
    const rowIndex = rowsOf(table).findIndex((tr) => tr.getAttribute('data-key') === selected?.key)
    selected = rowIndex >= 0 ? { ...selected, row, rowIndex } : { ...selected, row }
    highlight()
    renderPanel()
  }

  const rowIndexByKey = (key: string): number => rowsOf(table).findIndex((tr) => tr.getAttribute('data-key') === key)

  const onRowClick = (event: Event): void => {
    const detail = (event as CustomEvent).detail as { row?: Record<string, unknown>; key?: string } | undefined
    if (!detail?.key || !detail.row) return
    const rowIndex = rowIndexByKey(detail.key)
    if (rowIndex < 0) return
    apply({ row: detail.row, key: detail.key, rowIndex })
  }

  /** checkable 表的行点击被勾选语义占用（不派发 oas-row-click），用单元格点击补齐主从选择 */
  const onCellClick = (event: Event): void => {
    if (!table.hasAttribute('checkable')) return
    const detail = (event as CustomEvent).detail as { row?: Record<string, unknown>; rowIndex?: number } | undefined
    if (!detail?.row) return
    // oas-cell-click 的 rowIndex 是绝对数据行号（windowed 从 window-start 起），不能直接索引切片
    const key = rowKeyValue(detail.row, table.getAttribute('row-key') ?? 'key')
    const rowIndex = rowIndexByKey(key)
    if (rowIndex < 0) return
    apply({ row: detail.row, key, rowIndex })
  }

  const isInputTarget = (target: EventTarget | null): boolean => {
    const element = target as HTMLElement | null
    return Boolean(
      element && typeof element.closest === 'function' && element.closest('input, textarea, select, [contenteditable]'),
    )
  }

  const onKeydown = (event: Event): void => {
    if ((event as KeyboardEvent).key !== 'Escape' || !selected) return
    // 行内编辑器 / 面板内输入框的 Esc 归控件（取消编辑），不关闭详情、不抢焦
    if (event.defaultPrevented || isInputTarget(event.target) || isInteractiveEvent(event)) return
    event.preventDefault()
    const key = selected.key
    apply(null)
    const tr = rowsOf(table).find((item) => item.getAttribute('data-key') === key)
    const target = tr?.querySelector<HTMLElement>('td[data-col]')
    // 纯表格（无 range/grid-navigation/editable）的 td 不可聚焦：临时给 -1 让焦点能归位
    if (target && !target.hasAttribute('tabindex')) target.tabIndex = -1
    target?.focus()
  }

  const onEnter = (event: Event): void => {
    const keyboard = event as KeyboardEvent
    if (keyboard.key !== 'Enter' || keyboard.defaultPrevented) return
    if (isInteractiveEvent(event)) return
    const target = event.target as HTMLElement | null
    const td = target?.closest?.<HTMLElement>('td[data-col]')
    const tr = td?.closest<HTMLTableRowElement>('tr.row')
    const key = tr?.getAttribute('data-key')
    if (!tr || key == null) return
    const rowIndex = rowIndexByKey(key)
    const detail = detailAt(rowIndex)
    if (detail) {
      apply(detail)
      event.preventDefault()
    }
  }

  table.addEventListener('oas-row-click', onRowClick)
  table.addEventListener('oas-cell-click', onCellClick)
  table.addEventListener('keydown', onEnter)
  table.addEventListener('keydown', onKeydown)
  options.panel.addEventListener('keydown', onKeydown)
  // 普通表鼠标点行后焦点不在表格内：window 冒泡兜底，Esc 仍能关闭详情
  // （多实例会同时响应同一次 Esc；宿主需要独立关闭时自行在 onSelect 里判断）
  window.addEventListener('keydown', onKeydown)

  observer = new MutationObserver(() => {
    // 排序/过滤/虚拟滚动重建后刷新渲染下标（数据未变时行对象与面板不必重绘）
    if (selected) {
      const index = rowIndexByKey(selected.key)
      if (index >= 0 && index !== selected.rowIndex) selected = { ...selected, rowIndex: index }
    }
    highlight()
  })
  observer.observe(table.shadowRoot as ShadowRoot, { childList: true, subtree: true })
  const dataObserver = new MutationObserver(() => refresh())
  dataObserver.observe(table, { attributes: true, attributeFilter: ['data'] })

  renderPanel()

  return {
    select(rowIndex) {
      if (rowIndex === null) {
        apply(null)
        return
      }
      const detail = detailAt(rowIndex)
      apply(detail)
    },
    get selected() {
      return selected
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      table.removeEventListener('oas-row-click', onRowClick)
      table.removeEventListener('oas-cell-click', onCellClick)
      table.removeEventListener('keydown', onEnter)
      table.removeEventListener('keydown', onKeydown)
      options.panel.removeEventListener('keydown', onKeydown)
      window.removeEventListener('keydown', onKeydown)
      observer?.disconnect()
      observer = null
      dataObserver.disconnect()
      for (const tr of rowsOf(table)) tr.removeAttribute('data-detail-selected')
      options.panel.textContent = ''
      releaseStyle(table.shadowRoot as ShadowRoot)
      selected = null
    },
  }
}
