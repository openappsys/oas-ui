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
  /** 从「有选中」变为「无选中」时调用一次（collapsible 再点收起、close()/select(null)、Esc、行从数据消失），参数为被关闭的详情 */
  onClose?: (detail: RowDetail | null) => void
  /** Esc 是否关闭详情（默认 true；false 时完全不响应 Esc，含 window 兜底） */
  closeOnEscape?: boolean
}

export interface MasterDetail {
  /** 以可见行下标选中/清空；越界或行不存在时清空 */
  select(rowIndex: number | null): void
  /** 按行键选中（递归 children 查找）；行未渲染时保留选中（rowIndex = -1）；普通模式 key 不存在时清空，windowed 未装载/不存在时不改变当前选中 */
  selectByKey(key: string): void
  /** 清空选中（等价 select(null)） */
  close(): void
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

/**
 * 最近激活实例（最近一次成功选中者）的 Esc 关闭入口。
 * window 兜底 Esc 只让该实例响应；关闭/销毁后回退到仍选中的上一个实例。
 */
let activeEscapeClose: (() => void) | null = null
const escapeActivation: Array<{ close: () => void; table: HTMLElement }> = []
const detailHosts = new Map<HTMLElement, number>()

function registerDetailHost(host: HTMLElement): void {
  detailHosts.set(host, (detailHosts.get(host) ?? 0) + 1)
}

function unregisterDetailHost(host: HTMLElement): void {
  const count = (detailHosts.get(host) ?? 0) - 1
  if (count <= 0) detailHosts.delete(host)
  else detailHosts.set(host, count)
}

function activateEscape(close: () => void, table: HTMLElement): void {
  const index = escapeActivation.findIndex((item) => item.close === close)
  if (index >= 0) escapeActivation.splice(index, 1)
  escapeActivation.push({ close, table })
  activeEscapeClose = close
}

function deactivateEscape(close: () => void): void {
  const index = escapeActivation.findIndex((item) => item.close === close)
  if (index >= 0) escapeActivation.splice(index, 1)
  if (activeEscapeClose === close) activeEscapeClose = escapeActivation[escapeActivation.length - 1]?.close ?? null
}

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
 * 渲染后行节点会重建，用 MutationObserver 重新标记当前选中行；宿主卸载时必须调用 destroy 释放监听与实例引用。
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
  // Esc 响应开关：false 时本实例完全不响应 Esc（也不抢占「最近激活」标记，避免压过其它实例后 Esc 全体失效）
  const escEnabled = options.closeOnEscape !== false
  // 记录 helper 写入前面板的可访问性属性：destroy 时恢复宿主原值（helper 写入 role/aria-label 会覆盖）
  const panelOriginalRole = options.panel.getAttribute('role')
  const panelOriginalAriaLabel = options.panel.getAttribute('aria-label')

  acquireStyle(root)
  registerDetailHost(table)
  registerDetailHost(options.panel)

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
    const previous = selected
    const sameKey = next !== null && selected !== null && next.key === selected.key
    if (!next && !selected) return
    if (sameKey && !options.collapsible) {
      // 同一行重复点击：刷新内容但不重复派发选中变化
      selected = next
      highlight()
      renderPanel()
      if (escEnabled) activateEscape(escapeClose, table)
      return
    }
    selected = sameKey && options.collapsible ? null : next
    if (!selected) deactivateEscape(escapeClose)
    highlight()
    renderPanel()
    emit()
    if (selected) {
      // 成功选中：本实例成为「最近激活」，window 兜底 Esc 优先关它
      if (escEnabled) activateEscape(escapeClose, table)
    } else if (previous) {
      // 从有选中变为无选中：通知关闭（onSelect 已派发清空，此处补充被关闭的详情）
      options.onClose?.(previous)
    }
  }

  /** data 变化（含行内编辑回写）后刷新详情内容；数据中行消失才清空（滚出渲染窗口不清空） */
  const refresh = (): void => {
    if (!selected) return
    const row = findRow(selected.key)
    if (!row) {
      // windowed 的切片换窗只是「不在当前装载区间」，不是数据删除：保留选中（rowIndex=-1）
      if (table.hasAttribute('windowed')) {
        selected = { ...selected, rowIndex: -1 }
        highlight()
        renderPanel()
        return
      }
      apply(null)
      return
    }
    const rowIndex = rowsOf(table).findIndex((tr) => tr.getAttribute('data-key') === selected?.key)
    selected = rowIndex >= 0 ? { ...selected, row, rowIndex } : { ...selected, row, rowIndex: -1 }
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

  /** Esc 关闭当前详情并把焦点归还到原行单元格（调用方保证 selected 非空） */
  const escapeClose = (): void => {
    if (!selected) return
    const key = selected.key
    apply(null)
    const tr = rowsOf(table).find((item) => item.getAttribute('data-key') === key)
    const target = tr?.querySelector<HTMLElement>('td[data-col]')
    if (!target) return
    // 系统恢复聚焦：range 不应把它当作用户进入单元格而重建单格选区
    target.setAttribute('data-oas-focus-restore', '')
    try {
      // 普通 TD 保留 -1 作为程序聚焦入口；移除它会让 Chromium 同步失焦
      if (!target.hasAttribute('tabindex')) target.tabIndex = -1
      target.focus()
    } finally {
      target.removeAttribute('data-oas-focus-restore')
    }
  }

  const onKeydown = (event: Event): void => {
    if (!escEnabled || (event as KeyboardEvent).key !== 'Escape' || !selected) return
    // 同表多实例只让最近激活者处理；其它表的活动实例不影响本地按键
    const active = escapeActivation[escapeActivation.length - 1]
    if (active && active.table === table && active.close !== escapeClose) return
    // 行内编辑器 / 面板内输入框的 Esc 归控件（取消编辑），不关闭详情、不抢焦
    if (event.defaultPrevented || isInputTarget(event.target) || isInteractiveEvent(event)) return
    event.preventDefault()
    event.stopPropagation()
    escapeClose()
  }

  /** window 冒泡兜底：只有最近激活实例响应；事件来自其它已注册表格/面板时不跨实例串台 */
  const onWindowKeydown = (event: Event): void => {
    if (activeEscapeClose !== escapeClose) return
    const path = event.composedPath()
    for (const host of detailHosts.keys()) {
      if (host === table || host === options.panel) continue
      if (path.includes(host)) return
    }
    onKeydown(event)
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
  // （多实例互不牵连：只有最近激活——最近一次成功选中的——实例响应兜底 Esc）
  window.addEventListener('keydown', onWindowKeydown)

  observer = new MutationObserver(() => {
    // 排序/过滤/虚拟滚动重建后刷新渲染下标（数据未变时行对象与面板不必重绘）
    if (selected) {
      const index = rowIndexByKey(selected.key)
      if (index !== selected.rowIndex) selected = { ...selected, rowIndex: index }
    }
    highlight()
  })
  observer.observe(table.shadowRoot as ShadowRoot, { childList: true, subtree: true })
  const dataObserver = new MutationObserver(() => refresh())
  dataObserver.observe(table, { attributes: true, attributeFilter: ['data'] })

  renderPanel()

  return {
    select(rowIndex) {
      if (destroyed) return
      if (rowIndex === null) {
        apply(null)
        return
      }
      const detail = detailAt(rowIndex)
      apply(detail)
    },
    selectByKey(key) {
      if (destroyed) return
      const row = findRow(key)
      if (!row) {
        if (table.hasAttribute('windowed')) {
          // 未装载的 windowed 切片：不当作删除，保留当前选中/忽略此次选择
          if (selected && selected.key === key) {
            selected = { ...selected, rowIndex: -1 }
            highlight()
            renderPanel()
          }
          return
        }
        apply(null)
        return
      }
      // 行未渲染（滚出窗口/树形未展开）时 rowIndexByKey 返回 -1：保留选中，rowIndex 取 -1
      apply({ row, key, rowIndex: rowIndexByKey(key) })
    },
    close() {
      if (destroyed) return
      apply(null)
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
      window.removeEventListener('keydown', onWindowKeydown)
      observer?.disconnect()
      observer = null
      dataObserver.disconnect()
      // 移除自己的激活记录；仍有选中实例时回退到上一个最近激活者
      deactivateEscape(escapeClose)
      unregisterDetailHost(table)
      unregisterDetailHost(options.panel)
      for (const tr of rowsOf(table)) tr.removeAttribute('data-detail-selected')
      options.panel.textContent = ''
      // 恢复 helper 写入前的 role/aria-label（宿主自带值原样还原，原本无值则移除）
      if (panelOriginalRole === null) options.panel.removeAttribute('role')
      else options.panel.setAttribute('role', panelOriginalRole)
      if (panelOriginalAriaLabel === null) options.panel.removeAttribute('aria-label')
      else options.panel.setAttribute('aria-label', panelOriginalAriaLabel)
      releaseStyle(table.shadowRoot as ShadowRoot)
      selected = null
    },
  }
}
