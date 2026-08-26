import type { ReactiveController } from '@oas-ui/core'
import type { TableColumn } from './oas-table.js'

/**
 * 列设置能力（行为类）——通过 ReactiveController 注入宿主（OASTableBase）。
 *
 * 提供两类列级交互：
 * 1. 列拖拽重排：表头 th 可拖拽，dragstart/dragover/drop 委托到 thead，重排后调宿主 setColumnOrder；
 * 2. 列宽调整：表头 th 右缘 resize 热区（CSS ::after），pointerdown/move 拖拽调宽后调宿主 setColumnWidth。
 *
 * 只做交互与状态流转，不碰渲染结构——列显隐（column-keys/hidden）由核心 effectiveColumns 承载。
 * 宿主仅需暴露 setColumnOrder/setColumnWidth（基础列操作 API），能力通过它们写回并触发重渲染。
 */
export interface TableColumnSettingsHost {
  getColumns(): TableColumn[]
  setColumnOrder(keys: string[]): void
  setColumnWidth(key: string, width: number): void
  /** 宿主关闭/重渲染时需解绑的清理（默认无） */
  /* 无显式接口，绑定清理走控制器内部 */
}

/** 列宽调整的拖拽半径（热区宽度 px） */
const RESIZE_ZONE = 8
/** 列宽最小（px） */
const MIN_WIDTH = 40

export class TableColumnSettingsController implements ReactiveController {
  private hostEl: HTMLElement & TableColumnSettingsHost
  private thead: HTMLElement | null = null
  /** 当前列宽拖拽状态 */
  private resizeState: { key: string; startX: number; startWidth: number } | null = null

  constructor(private host: HTMLElement & TableColumnSettingsHost) {
    this.hostEl = host
  }

  hostConnected(): void {
    this.bind()
  }

  hostDisconnected(): void {
    this.unbind()
  }

  /** 宿主每次更新后：为可拖拽列头设置 draggable（列头重渲染后重新生效） */
  hostUpdated(): void {
    const thead = this.hostEl.shadowRoot?.querySelector('thead')
    if (!thead) return
    for (const th of thead.querySelectorAll<HTMLElement>('th[data-key]')) {
      th.setAttribute('draggable', 'true')
    }
  }

  private bind(): void {
    this.thead = this.hostEl.shadowRoot?.querySelector('thead') ?? null
    if (!this.thead) return
    this.thead.addEventListener('dragstart', this.onDragStart)
    this.thead.addEventListener('dragover', this.onDragOver)
    this.thead.addEventListener('drop', this.onDrop)
    this.thead.addEventListener('dragend', this.onDragEnd)
    this.thead.addEventListener('pointerdown', this.onPointerDown)
    this.thead.addEventListener('pointermove', this.onPointerMove)
    this.thead.addEventListener('pointerup', this.onPointerUp)
    this.hostUpdated()
  }

  private unbind(): void {
    if (!this.thead) return
    this.thead.removeEventListener('dragstart', this.onDragStart)
    this.thead.removeEventListener('dragover', this.onDragOver)
    this.thead.removeEventListener('drop', this.onDrop)
    this.thead.removeEventListener('dragend', this.onDragEnd)
    this.thead.removeEventListener('pointerdown', this.onPointerDown)
    this.thead.removeEventListener('pointermove', this.onPointerMove)
    this.thead.removeEventListener('pointerup', this.onPointerUp)
    this.thead = null
    this.resizeState = null
  }

  /** 拖拽中的列 key（拖动源） */
  private dragKey = ''
  /** 最近一次 dragover 计算的落点（目标列 + 插前/插后），drop 时据此重排 */
  private lastDrop: { key: string; pos: 'before' | 'after' } | null = null

  private onDragStart = (e: DragEvent): void => {
    const th = (e.target as HTMLElement).closest<HTMLElement>('th[data-key]')
    if (!th) return
    this.dragKey = th.dataset.key ?? ''
    this.lastDrop = null
    th.classList.add('drag-source')
    e.dataTransfer?.setData('text/plain', this.dragKey)
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  }

  private onDragOver = (e: DragEvent): void => {
    if (!this.dragKey) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    // 按指针落在目标列左/右半区决定「插前 / 插后」，落点宽容、可预测
    const hit = (e.target as HTMLElement).closest<HTMLElement>('th[data-key]')
    const target = hit ? this.splitTarget(hit, e.clientX) : this.nearestTarget(e.clientX)
    this.setDropTarget(target)
  }

  private onDrop = (e: DragEvent): void => {
    if (!this.dragKey) return
    e.preventDefault()
    const drop = this.lastDrop
    const fromKey = this.dragKey
    this.clearDragMarks()
    this.dragKey = ''
    if (!drop || drop.key === fromKey) return
    const keys = this.hostEl.getColumns().map((c) => c.key)
    this.hostEl.setColumnOrder(applyColumnReorder(keys, fromKey, drop.key, drop.pos))
  }

  private onDragEnd = (): void => {
    this.clearDragMarks()
    this.dragKey = ''
    this.lastDrop = null
  }

  /** 目标列按指针在左/右半区 → 插前/插后 */
  private splitTarget(th: HTMLElement, clientX: number): { key: string; pos: 'before' | 'after' } {
    const rect = th.getBoundingClientRect()
    return { key: th.dataset.key ?? '', pos: clientX < rect.left + rect.width / 2 ? 'before' : 'after' }
  }

  /** 指针不在任何列头上时，就近取目标列头并定插前/插后 */
  private nearestTarget(clientX: number): { key: string; pos: 'before' | 'after' } | null {
    const ths = [...(this.thead?.querySelectorAll<HTMLElement>('th[data-key]') ?? [])]
    if (ths.length === 0) return null
    let best: HTMLElement = ths[0]!
    let bestDist = Infinity
    for (const th of ths) {
      const rect = th.getBoundingClientRect()
      const dist = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0
      if (dist < bestDist) {
        bestDist = dist
        best = th
      }
    }
    return this.splitTarget(best, clientX)
  }

  /** 标记落点目标列（插前/插后高亮线），并清除上次标记 */
  private setDropTarget(target: { key: string; pos: 'before' | 'after' } | null): void {
    if (!this.thead) return
    for (const th of this.thead.querySelectorAll<HTMLElement>('th[data-key]')) {
      th.classList.remove('drop-before', 'drop-after')
    }
    this.lastDrop = target
    if (!target) return
    const th = this.thead.querySelector<HTMLElement>(`th[data-key="${target.key}"]`)
    th?.classList.add(target.pos === 'before' ? 'drop-before' : 'drop-after')
  }

  /** 清空拖拽视觉标记 */
  private clearDragMarks(): void {
    if (!this.thead) return
    for (const th of this.thead.querySelectorAll<HTMLElement>('th[data-key]')) {
      th.classList.remove('drag-source', 'drop-before', 'drop-after')
    }
  }

  /** 判断事件目标是否落在列头右缘 resize 热区内 */
  private inResizeZone(e: PointerEvent): HTMLElement | null {
    const target = e.target as HTMLElement | null
    const th = target?.closest<HTMLElement>('th[data-key]') ?? null
    if (!th) return null
    const rect = th.getBoundingClientRect()
    // 命中 th 右缘 RESIZE_ZONE 内
    return e.clientX >= rect.right - RESIZE_ZONE && e.clientX <= rect.right ? th : null
  }

  private onPointerDown = (e: PointerEvent): void => {
    const th = this.inResizeZone(e)
    if (!th) return
    e.preventDefault()
    const width = this.parseWidth(th)
    this.resizeState = { key: th.dataset.key ?? '', startX: e.clientX, startWidth: width }
    this.hostEl.setAttribute('data-col-resizing', '')
    th.setPointerCapture?.(e.pointerId)
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.resizeState) return
    const delta = e.clientX - this.resizeState.startX
    const next = Math.max(MIN_WIDTH, this.resizeState.startWidth + delta)
    const th = this.thead?.querySelector<HTMLElement>(`th[data-key="${this.resizeState.key}"]`)
    if (th) th.style.width = `${next}px`
  }

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.resizeState) return
    const { key } = this.resizeState
    const th = this.thead?.querySelector<HTMLElement>(`th[data-key="${key}"]`)
    const width = th ? this.parseWidth(th) : 0
    this.resizeState = null
    this.hostEl.removeAttribute('data-col-resizing')
    if (width > 0) this.hostEl.setColumnWidth(key, width)
  }

  private parseWidth(th: HTMLElement): number {
    // 优先列显式 width / style；未显式设置（自适应列）时取实际渲染宽度，保证拖拽以真实宽度为基准
    const w = th.style.width || th.getAttribute('width') || ''
    const n = parseFloat(w)
    if (Number.isFinite(n) && n > 0) return n
    return th.getBoundingClientRect().width
  }
}

/** 便捷：构造列设置 controller（供组装类 addController 用） */
export function createColumnSettingsController(host: HTMLElement & TableColumnSettingsHost): TableColumnSettingsController {
  return new TableColumnSettingsController(host)
}

/** 计算列拖拽重排后的列顺序：把 fromKey 移到 toKey 之前/之后（pos），返回新 keys 数组。
    纯函数便于单测锁定重排逻辑；toKey 不存在时兜底插到最前/最后。 */
export function applyColumnReorder(
  keys: string[],
  fromKey: string,
  toKey: string,
  pos: 'before' | 'after',
): string[] {
  const rest = keys.filter((k) => k !== fromKey)
  const idx = rest.indexOf(toKey)
  if (pos === 'before') rest.splice(idx < 0 ? 0 : idx, 0, fromKey)
  else rest.splice(idx < 0 ? rest.length : idx + 1, 0, fromKey)
  return rest
}

/** 列设置能力可读的列类型（透传导出，便于调用方类型引用） */
export type { TableColumn }
