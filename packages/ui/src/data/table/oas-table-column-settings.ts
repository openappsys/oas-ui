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

  private onDragStart = (e: DragEvent): void => {
    const th = (e.target as HTMLElement).closest<HTMLElement>('th[data-key]')
    if (!th) return
    this.dragKey = th.dataset.key ?? ''
    e.dataTransfer?.setData('text/plain', this.dragKey)
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  }

  private onDragOver = (e: DragEvent): void => {
    if (!this.dragKey) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  }

  private onDrop = (e: DragEvent): void => {
    if (!this.dragKey) return
    const target = (e.target as HTMLElement).closest<HTMLElement>('th[data-key]')
    e.preventDefault()
    if (!target || target.dataset.key === this.dragKey) {
      this.dragKey = ''
      return
    }
    const fromKey = this.dragKey
    const toKey = target.dataset.key ?? ''
    const keys = this.hostEl.getColumns().map((c) => c.key).filter((k) => k !== fromKey)
    const toIndex = keys.indexOf(toKey)
    keys.splice(toIndex < 0 ? keys.length : toIndex, 0, fromKey)
    this.hostEl.setColumnOrder(keys)
    this.dragKey = ''
  }

  private onDragEnd = (): void => {
    this.dragKey = ''
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

/** 列设置能力可读的列类型（透传导出，便于调用方类型引用） */
export type { TableColumn }
