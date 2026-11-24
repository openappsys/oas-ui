import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'
import { isRtl } from '../../shared/direction.js'
import { cloneSlotContent } from '../../shared/slot-template.js'
import {
  applyRowNaming,
  copyRowValue,
  indexedRowName,
  rowWrappers,
  swapRowValues,
  type NamedRowField,
} from '../shared/list-row-ops.js'
import { writeFormControlValue } from '../form/index.js'

/**
 * oas-array-table —— 对象数组的行内编辑表格（schema-form 的 `uiSchema.widget: 'array-table'` 承载件）。
 *
 * 分工（与 oas-form-list 同构的数组渲染机制，只多做二维布局与行操作列）：
 * - **行模板由 schema-form 渲染**（form-item 单元格 + `data-schema-key` + 行内字段名），本组件
 *   只克隆模板、索引化 name、维护行数——因此 schema-form 对数组容器的全部 DOM 契约
 *   （`data-schema-array-key` + `[data-oas-form-list-item]`）零成本继承；
 * - 本组件只负责 ARIA 表格语义（`table` / `columnheader` / `row` / `cell`）+ CSS grid 二维布局
 *   + 行操作列（删除 / 复制 / 上移 / 下移，末尾追加行）。
 *
 * 布局实现说明：行 wrapper 与单元格是 light DOM（主表只收集 light DOM，放进 shadow 就收不到值），
 * shadow 样式够不到它们，因此几何（grid-template-columns / padding / 边框）以**内联样式**写在
 * 行 wrapper 与单元格上；列定义与表头（shadow 内）用同一份轨道串，保证表头与行严格对齐。
 *
 * 不用原生 table 元素：slot 产不出 `td`，行内容又必须留在 light DOM——原生表格语义无法成立。
 *
 * 行操作契约与 oas-form-list 完全同源：值读写走内核通道（upload 跳过）、操作后按索引重聚焦、
 * aria-live 播报；事件 `oas-add` / `oas-remove` `{ index }` + `oas-duplicate` / `oas-move` `{ from, to }`。
 */
const STYLE = `
:host {
  display: block;
  font-family: inherit;
  min-width: 0;
}
:host([hidden]) {
  display: none;
}
.table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
  overflow: hidden;
}
.head {
  display: grid;
  gap: var(--oas-space-2);
  align-items: center;
  padding: var(--oas-space-2) var(--oas-space-3);
  background: var(--oas-color-bg-hover);
  border-bottom: 1px solid var(--oas-color-border);
}
.head[hidden] {
  display: none;
}
.head-cell {
  min-width: 0;
  position: relative;
  font-size: var(--oas-font-size-sm);
  font-weight: 600;
  color: var(--oas-color-text-secondary-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-inline-end: var(--oas-space-2);
}
/* 列头可拖拽重排（运行时展示态；uiSchema 顺序仍权威） */
.head-cell[draggable='true'] {
  cursor: grab;
}
.head-cell[data-drag-over] {
  box-shadow: inset 2px 0 0 var(--oas-color-primary);
}
.head-cell[aria-hidden='true'] {
  display: none;
}
/* 列宽拖拽手柄：贴列头分隔线，指针与键盘都可调 */
.col-resize {
  position: absolute;
  inset-block: 0;
  inset-inline-end: 0;
  width: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  touch-action: none;
  outline: none;
}
.col-resize::before {
  content: '';
  width: 1px;
  height: 60%;
  background: var(--oas-color-border);
}
.col-resize:hover::before {
  width: 2px;
  background: var(--oas-color-primary);
}
.col-resize:focus-visible::before {
  width: 2px;
  background: var(--oas-color-primary);
}
.col-resize:focus-visible {
  box-shadow: var(--oas-focus-ring);
  border-radius: var(--oas-radius-sm);
}
.head-actions {
  text-align: end;
}
/* 必填星号（列头承担；单元格自身不渲染标签） */
.required-mark {
  color: var(--oas-color-danger);
}
.rows {
  display: block;
}
.empty {
  display: grid;
  padding: var(--oas-space-3);
}
.empty[hidden] {
  display: none;
}
.empty-cell {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.add {
  appearance: none;
  align-self: flex-start;
  border: 1px dashed var(--oas-color-border);
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  height: var(--oas-control-height-md);
  border-radius: var(--oas-radius-md);
  font-size: var(--oas-font-size-sm);
  padding: 0 var(--oas-space-3);
  font-family: inherit;
  margin-top: var(--oas-space-2);
}
.add:hover:not(:disabled) {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.add:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
.add:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.live {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@media (forced-colors: active) {
  .add:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
    box-shadow: none;
  }
}
`

const ADD_ICON_PATH = 'M8 3 L8 13 M3 8 L13 8'
const REMOVE_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M3 5 L13 5 M5.5 5 L6.5 14 L9.5 14 L10.5 5 M6 5 L6 3 L10 3 L10 5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const DUPLICATE_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M5 2 L12 2 L12 9 M3 5 L10 5 L10 13 L3 13 Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`
const UP_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M8 12 L8 4 M4.5 7.5 L8 4 L11.5 7.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const DOWN_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M8 4 L8 12 M4.5 8.5 L8 12 L11.5 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const ROW_ACTIONS = ['duplicate', 'move-up', 'move-down', 'remove'] as const
type RowAction = (typeof ROW_ACTIONS)[number]

/** 列定义（顺序 = 单元格顺序；hidden 列保留单元格与值，只隐藏视觉） */
export interface ArrayTableColumn {
  key: string
  label: string
  /** grid 轨道尺寸：数字 → px，字符串原样（如 `2fr` / `120px`） */
  width?: number | string
  align?: 'left' | 'center' | 'right'
  hidden?: boolean
  /** 必填列：列头追加 `*`（单元格自身不渲染标签） */
  required?: boolean
}

/** 行操作列固定宽度（表头与每行同值，保证末列对齐） */
const ACTIONS_TRACK = 'var(--oas-array-table-actions-width, 148px)'
/** 列宽拖拽下限（px）：低于此值控件会挤到不可用 */
const MIN_COLUMN_WIDTH = 48

interface TableItem {
  uid: number
  wrapper: HTMLElement
  named: NamedRowField[]
  /** 行内单元格（模板克隆后的直接子节点，顺序 = 列顺序） */
  cells: HTMLElement[]
  actions: HTMLElement
}

const OPS_STYLE = 'display:flex;align-items:center;justify-content:flex-end;gap:var(--oas-space-1);min-width:0;'

export class OASArrayTable extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'name',
      'rows',
      'min',
      'max',
      'disabled',
      'columns',
      'label',
      'add-text',
      'remove-text',
      'duplicate-text',
      'move-up-text',
      'move-down-text',
    ]
  }

  private rowsEl: HTMLElement | null = null
  private headEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  private tableEl: HTMLElement | null = null
  private addBtn: HTMLButtonElement | null = null
  private liveEl: HTMLElement | null = null
  private items: TableItem[] = []
  private uidCounter = 0
  private lastTemplate: HTMLTemplateElement | null = null
  private pendingInitialReplay = true
  private childObserver: MutationObserver | null = null
  private frameKey = ''
  /** 列定义原文缓存（变更才重排表头/单元格几何） */
  private columnsRaw: string | null = null
  /** 列宽内存态（key → px；**不序列化**，uiSchema `width` 只作初始值） */
  private columnWidths = new Map<string, number>()
  /** 列顺序内存态（key 数组；uiSchema 顺序仍权威，这里只是运行时展示顺序） */
  private columnOrder: string[] = []
  /** 列头拖拽重排：按下时的列 key（无 DataTransfer 时也能工作） */
  private dragColumnKey: string | null = null
  /** 列宽拖拽会话（指针移动期间） */
  private resizeSession: { key: string; startX: number; startWidth: number } | null = null
  /** 粘贴超限告警只提示一次（实例级） */
  private pasteTruncationWarned = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="table" part="table" role="table">
        <div class="head" part="head" role="row"></div>
        <div class="rows" part="rows"><slot></slot></div>
        <div class="empty" part="empty" role="row" hidden>
          <div class="empty-cell" role="cell"></div>
        </div>
      </div>
      <div class="live" part="live" role="status" aria-live="polite" aria-atomic="true"></div>
      <button class="add" part="add" type="button"></button>
    `
  }

  private bind(): void {
    this.tableEl = this.shadow.querySelector('.table')
    this.headEl = this.shadow.querySelector('.head')
    this.rowsEl = this.shadow.querySelector('.rows')
    this.emptyEl = this.shadow.querySelector('.empty')
    this.addBtn = this.shadow.querySelector('.add')
    this.liveEl = this.shadow.querySelector('.live')
    this.addBtn?.addEventListener('click', this.handleAddClick)
    // 跨行粘贴：事件从单元格控件（light DOM）冒泡到宿主；处理器幂等绑定（重连会再次 bind）
    this.removeEventListener('paste', this.handlePasteEvent)
    this.addEventListener('paste', this.handlePasteEvent)

    if (!this.childObserver) {
      const observer = new MutationObserver(() => this.handleDomMutation())
      observer.observe(this, { childList: true })
      this.childObserver = observer
      this.onCleanup(() => {
        observer.disconnect()
        this.childObserver = null
      })
    }
    // 列宽拖拽会话挂 document：拖拽中宿主被移除/重建时，监听必须随断开一起摘除，
    // 否则悬挂的 pointermove 会在重连后的新实例布局上调宽（幂等：无会话时是空操作）
    this.onCleanup(() => this.handleResizeEnd())
    // 行状态（items / lastTemplate）不随断开清理：行 wrapper 仍在 light DOM，清空记录会让重连时再建一遍
  }

  /** 断开重连：观察器已由 cleanup 摘除 → 重新绑定（幂等） */
  protected override onReconnect(): void {
    this.bind()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（表格容器 + 行容器 + 添加按钮）后接管 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.table')) return false
    if (!this.shadow.querySelector('.rows')) return false
    if (!this.shadow.querySelector('.add')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const tpl = this.resolveTemplate()
    if (tpl !== this.lastTemplate) {
      this.lastTemplate = tpl
      this.rebuild()
    }
    this.ensureItems()
    this.applyNaming()
    this.syncLayout()
    this.syncShadow()
    this.replayInitialValues()
  }

  private resolveTemplate(): HTMLTemplateElement | null {
    return this.querySelector('template:not([slot])')
  }

  /** 列定义（JSON attribute；非法形态按空列处理——表头缺列好过整表不渲染） */
  get columns(): ArrayTableColumn[] {
    return this.parseColumns(this.getAttr('columns', ''))
  }
  set columns(value: ArrayTableColumn[] | string) {
    this.setAttribute('columns', typeof value === 'string' ? value : JSON.stringify(value))
  }

  private parseColumns(raw: string): ArrayTableColumn[] {
    if (raw === '') return []
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed
        .filter((col): col is Record<string, unknown> => !!col && typeof col === 'object')
        .map((col) => ({
          key: typeof col.key === 'string' ? col.key : '',
          label: typeof col.label === 'string' ? col.label : '',
          width: typeof col.width === 'number' || typeof col.width === 'string' ? col.width : undefined,
          align:
            col.align === 'center' || col.align === 'right' ? col.align : col.align === 'left' ? 'left' : undefined,
          hidden: col.hidden === true,
          required: col.required === true,
        }))
    } catch {
      return []
    }
  }

  private minValue(): number {
    return Math.max(0, Number(this.getAttr('min', '0')) || 0)
  }

  private initialRowCount(): number {
    const rows = this.getAttr('rows', '')
    if (rows !== '') {
      const n = Number(rows)
      return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
    }
    return this.minValue()
  }

  private maxValue(): number {
    const raw = this.getAttr('max', '')
    if (raw === '') return Number.POSITIVE_INFINITY
    const n = Number(raw)
    return Number.isFinite(n) ? Math.max(0, n) : Number.POSITIVE_INFINITY
  }

  private rebuild(): void {
    for (const item of this.items) item.wrapper.remove()
    this.items = []
    this.frameKey = ''
    this.pendingInitialReplay = true
  }

  private ensureItems(): void {
    if (!this.lastTemplate) return
    let grew = false
    const target = this.initialRowCount()
    while (this.items.length < target) {
      this.addItem()
      grew = true
    }
    if (grew) this.pendingInitialReplay = true
  }

  /** 创建一行：克隆模板 → 单元格标注（role=cell + 列几何）+ 操作单元格 */
  private addItem(at: number = this.items.length): TableItem {
    const uid = this.uidCounter++
    const listName = this.getAttr('name', '')
    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-oas-form-list-item', '')
    wrapper.setAttribute('slot', `oas-array-table-row-${uid}`)
    wrapper.setAttribute('role', 'row')

    const named: NamedRowField[] = []
    const content = cloneSlotContent(this.lastTemplate!)
    for (const el of [...content.querySelectorAll('[name]')]) {
      const tplName = el.getAttribute('name') ?? ''
      const next = indexedRowName(tplName, at, listName)
      if (next !== tplName) el.setAttribute('name', next)
      named.push({ el, tplName })
    }
    const cells: HTMLElement[] = []
    for (const node of [...content.children]) {
      if (!(node instanceof HTMLElement)) continue
      node.setAttribute('role', 'cell')
      cells.push(node)
      wrapper.appendChild(node)
    }
    const actions = document.createElement('div')
    actions.setAttribute('role', 'cell')
    actions.setAttribute('part', 'actions')
    actions.style.cssText = OPS_STYLE
    for (const action of ROW_ACTIONS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'op'
      btn.setAttribute('part', action)
      btn.setAttribute('data-action', action)
      btn.style.cssText = [
        'appearance:none',
        'border:none',
        'background:transparent',
        'cursor:pointer',
        'padding:0',
        'width:28px',
        'height:28px',
        'display:inline-flex',
        'align-items:center',
        'justify-content:center',
        'border-radius:var(--oas-radius-sm)',
        'color:var(--oas-color-text-secondary)',
        'font-family:inherit',
      ].join(';')
      btn.innerHTML =
        action === 'duplicate'
          ? DUPLICATE_ICON
          : action === 'move-up'
            ? UP_ICON
            : action === 'move-down'
              ? DOWN_ICON
              : REMOVE_ICON
      btn.addEventListener('mouseenter', () => {
        if (btn.disabled) return
        btn.style.background = 'var(--oas-color-bg-hover)'
        btn.style.color = action === 'remove' ? 'var(--oas-color-danger)' : 'var(--oas-color-primary)'
      })
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent'
        btn.style.color = 'var(--oas-color-text-secondary)'
      })
      btn.addEventListener('focus', () => {
        btn.style.boxShadow = 'var(--oas-focus-ring)'
        // 强制色模式下 box-shadow 被 UA 弃用：焦点环回退系统色实线 outline（WCAG 2.4.7）
        if (globalThis.matchMedia?.('(forced-colors: active)').matches) {
          btn.style.outline = '1px solid CanvasText'
          btn.style.outlineOffset = '1px'
        }
      })
      btn.addEventListener('blur', () => {
        btn.style.boxShadow = 'none'
        btn.style.outline = 'none'
      })
      actions.appendChild(btn)
    }
    wrapper.appendChild(actions)

    const item: TableItem = { uid, wrapper, named, cells, actions }
    // 行操作直接绑在按钮上（不靠 shadow 容器委托：light DOM 里的按钮跨 shadow 的冒泡路径在部分实现里丢失）
    for (const btn of actions.querySelectorAll<HTMLButtonElement>('[data-action]')) {
      const action = btn.getAttribute('data-action') as RowAction | null
      if (!action) continue
      btn.addEventListener('click', () => {
        const index = this.items.indexOf(item)
        if (index >= 0) this.runAction(action, index)
      })
    }
    const anchor = this.items[at]?.wrapper ?? null
    if (anchor) this.insertBefore(wrapper, anchor)
    else this.appendChild(wrapper)
    this.items.splice(at, 0, item)
    return item
  }

  private applyNaming(): void {
    if (this.items.length === 0) return
    applyRowNaming(
      this.items.map((item) => item.named),
      this.getAttr('name', ''),
    )
  }

  /** 表头 + 行/单元格几何（列定义 / 列序 / 列宽变化才重排；文案与禁用态每次刷新） */
  private syncLayout(): void {
    const raw = this.getAttr('columns', '')
    const columns = this.columns
    const display = this.displayColumns(columns)
    const gridTemplate = this.gridTemplate(display)
    const orderKey = display.map((column) => column.key).join('\u0000')
    if (raw !== this.columnsRaw || orderKey !== this.headOrderKey) {
      this.columnsRaw = raw
      this.headOrderKey = orderKey
      this.renderHead(display, gridTemplate)
    } else {
      this.applyHeadMetrics(display, gridTemplate)
    }
    for (const item of this.items) {
      item.wrapper.style.cssText = [
        'display:grid',
        `grid-template-columns:${gridTemplate}`,
        'gap:var(--oas-space-2)',
        'align-items:start',
        'padding:var(--oas-space-2) var(--oas-space-3)',
        'border-top:1px solid var(--oas-color-border)',
        `border-inline-start:3px solid transparent`,
      ].join(';')
      item.cells.forEach((cell, index) => {
        const column = columns[index]
        const position = column ? display.findIndex((entry) => entry.key === column.key) : -1
        const style = ['min-width:0']
        if (!column || column.hidden === true || position < 0) style.push('display:none')
        else style.push(`grid-column:${position + 1}`)
        if (column?.align) style.push(`text-align:${column.align}`)
        cell.style.cssText = style.join(';')
        // 控件宽度不得越出单元格：固定像素宽度的控件（如 select 默认 220px）会被 max-width 收窄，
        // 否则会溢出到行操作列、抢占点击
        for (const widget of cell.querySelectorAll<HTMLElement>('[data-schema-widget]')) {
          widget.style.maxWidth = '100%'
        }
      })
    }
  }

  /** 显示顺序的列（内存态顺序优先；新增列按 uiSchema 顺序追加） */
  private displayColumns(columns: ArrayTableColumn[]): ArrayTableColumn[] {
    const byKey = new Map(columns.map((column) => [column.key, column]))
    const out: ArrayTableColumn[] = []
    for (const key of this.columnOrder) {
      const column = byKey.get(key)
      if (column) {
        out.push(column)
        byKey.delete(key)
      }
    }
    for (const column of byKey.values()) out.push(column)
    return out
  }

  /** 列宽（内存态优先；uiSchema 数值作初始宽；缺省 120px 作为拖拽基准） */
  private columnWidth(column: ArrayTableColumn): number {
    const stored = this.columnWidths.get(column.key)
    if (stored !== undefined) return stored
    if (typeof column.width === 'number' && Number.isFinite(column.width) && column.width > 0) {
      return Math.round(column.width)
    }
    return 120
  }

  /** 网格轨道串：可见列（显示顺序）+ 行操作列 */
  private gridTemplate(display: ArrayTableColumn[]): string {
    const tracks = display
      .filter((column) => column.hidden !== true)
      .map((column) => {
        const stored = this.columnWidths.get(column.key)
        return stored !== undefined ? `${stored}px` : columnTrack(column.width)
      })
    return `${tracks.length > 0 ? tracks.join(' ') : 'minmax(0, 1fr)'} ${ACTIONS_TRACK}`
  }

  private headOrderKey = ''

  /** 表头（shadow 内）：列头 + 分割线手柄 + 行操作列头；零行时隐藏表头（空态优先） */
  private renderHead(display: ArrayTableColumn[], gridTemplate: string): void {
    const head = this.headEl
    if (!head) return
    head.textContent = ''
    head.style.cssText = [
      'display:grid',
      `grid-template-columns:${gridTemplate}`,
      'gap:var(--oas-space-2)',
      'align-items:center',
      'padding:var(--oas-space-2) var(--oas-space-3)',
      'background:var(--oas-color-bg-hover)',
      'border-bottom:1px solid var(--oas-color-border)',
    ].join(';')
    let visibleIndex = 0
    for (const column of display) {
      const cell = document.createElement('div')
      cell.className = 'head-cell'
      cell.setAttribute('part', 'columnheader')
      cell.setAttribute('role', 'columnheader')
      cell.setAttribute('data-column-key', column.key)
      const title = document.createElement('span')
      title.textContent = column.label !== '' ? column.label : column.key
      cell.appendChild(title)
      // 必填标记：单元格不渲染标签，星号由列头承担（星号 aria-hidden，必填语义由单元格控件的 aria-required 承担）
      if (column.required === true) {
        const mark = document.createElement('span')
        mark.className = 'required-mark'
        mark.setAttribute('aria-hidden', 'true')
        mark.textContent = ' *'
        cell.appendChild(mark)
      }
      if (column.hidden === true) {
        cell.style.display = 'none'
        cell.setAttribute('aria-hidden', 'true')
      } else {
        visibleIndex += 1
        cell.style.gridColumn = String(visibleIndex)
        cell.setAttribute('draggable', 'true')
        cell.setAttribute('title', this.t('schemaForm.reorderColumn'))
        cell.addEventListener('dragstart', this.handleHeadDragStart)
        cell.addEventListener('dragover', this.handleHeadDragOver)
        cell.addEventListener('dragleave', this.handleHeadDragLeave)
        cell.addEventListener('drop', this.handleHeadDrop)
        cell.addEventListener('dragend', this.handleHeadDragEnd)
        const handle = document.createElement('div')
        handle.className = 'col-resize'
        handle.setAttribute('part', 'column-resize')
        handle.setAttribute('role', 'separator')
        handle.setAttribute('aria-orientation', 'vertical')
        handle.setAttribute('aria-label', `${this.t('schemaForm.resizeColumn')}：${title.textContent}`)
        handle.setAttribute('aria-valuemin', String(MIN_COLUMN_WIDTH))
        handle.setAttribute('aria-valuenow', String(this.columnWidth(column)))
        handle.tabIndex = 0
        handle.addEventListener('pointerdown', this.handleResizeStart)
        handle.addEventListener('dragstart', (event) => event.preventDefault())
        handle.addEventListener('keydown', this.handleResizeKeydown)
        cell.appendChild(handle)
      }
      if (column.align) cell.style.textAlign = column.align
      head.appendChild(cell)
    }
    const actions = document.createElement('div')
    actions.className = 'head-cell head-actions'
    actions.setAttribute('part', 'columnheader-actions')
    actions.setAttribute('role', 'columnheader')
    actions.textContent = this.t('schemaForm.rowActions')
    head.appendChild(actions)
  }

  /** 已存在表头的轻量刷新（列宽变化：只改轨道与 aria 值，不重建节点 → 焦点不丢） */
  private applyHeadMetrics(display: ArrayTableColumn[], gridTemplate: string): void {
    const head = this.headEl
    if (!head) return
    head.style.gridTemplateColumns = gridTemplate
    let visibleIndex = 0
    for (const cell of head.querySelectorAll<HTMLElement>('[data-column-key]')) {
      const key = cell.getAttribute('data-column-key') ?? ''
      const column = display.find((entry) => entry.key === key)
      if (!column || column.hidden === true) continue
      visibleIndex += 1
      cell.style.gridColumn = String(visibleIndex)
      const handle = cell.querySelector<HTMLElement>('[part="column-resize"]')
      if (handle) handle.setAttribute('aria-valuenow', String(this.columnWidth(column)))
    }
  }

  // ---------- 列宽拖拽（指针 + 键盘） ----------

  private readonly handleResizeStart = (event: Event): void => {
    const pointer = event as PointerEvent
    if (pointer.button !== undefined && pointer.button !== 0) return
    // 阻止列头原生拖拽（同一区块上的两个手势必须分开）
    pointer.preventDefault()
    pointer.stopPropagation()
    const cell = (pointer.currentTarget as HTMLElement | null)?.closest<HTMLElement>('[data-column-key]')
    const key = cell?.getAttribute('data-column-key') ?? ''
    const column = this.columns.find((entry) => entry.key === key)
    if (!column) return
    this.resizeSession = { key, startX: pointer.clientX, startWidth: this.columnWidth(column) }
    // 监听挂 document：拖拽中指针离开列头/表格也要继续跟手；pointerup 落在任何位置都能收尾
    // （只挂宿主会在指针移出后失去事件、session 悬挂，下一次在表头移动时误调宽）
    const doc = this.ownerDocument
    doc.addEventListener('pointermove', this.handleResizeMove)
    doc.addEventListener('pointerup', this.handleResizeEnd)
    doc.addEventListener('pointercancel', this.handleResizeEnd)
  }

  private readonly handleResizeMove = (event: Event): void => {
    const session = this.resizeSession
    if (!session) return
    const pointer = event as PointerEvent
    // RTL 镜像：手柄贴 inline-end（RTL 下在列**左**缘），拖拽方向与 LTR 相反 → delta 取反
    const delta = (pointer.clientX - session.startX) * (isRtl(this) ? -1 : 1)
    const next = Math.max(MIN_COLUMN_WIDTH, Math.round(session.startWidth + delta))
    if (this.columnWidths.get(session.key) === next) return
    this.columnWidths.set(session.key, next)
    this.syncLayout()
  }

  private readonly handleResizeEnd = (): void => {
    this.resizeSession = null
    const doc = this.ownerDocument
    doc.removeEventListener('pointermove', this.handleResizeMove)
    doc.removeEventListener('pointerup', this.handleResizeEnd)
    doc.removeEventListener('pointercancel', this.handleResizeEnd)
  }

  /** 键盘调宽：左右键 ±8px（step），到下限即停；Home 回落到 uiSchema 初始宽 */
  private readonly handleResizeKeydown = (event: Event): void => {
    const key = event as KeyboardEvent
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(key.key)) return
    key.preventDefault()
    const cell = (key.currentTarget as HTMLElement | null)?.closest<HTMLElement>('[data-column-key]')
    const columnKey = cell?.getAttribute('data-column-key') ?? ''
    const column = this.columns.find((entry) => entry.key === columnKey)
    if (!column) return
    const step = key.shiftKey ? 24 : 8
    if (key.key === 'Home') {
      this.columnWidths.delete(columnKey)
    } else {
      const base = this.columnWidth(column)
      this.columnWidths.set(columnKey, Math.max(MIN_COLUMN_WIDTH, base + (key.key === 'ArrowRight' ? step : -step)))
    }
    this.syncLayout()
  }

  // ---------- 列顺序重排（列头拖拽，运行时展示态） ----------

  private readonly handleHeadDragStart = (event: Event): void => {
    const cell = event.currentTarget as HTMLElement
    const key = cell.getAttribute('data-column-key') ?? ''
    this.dragColumnKey = key
    cell.style.opacity = '0.6'
    const dataTransfer = (event as DragEvent).dataTransfer
    // 真实浏览器路径：写入纯文本（Firefox 需要 setData 才会启动拖拽）；测试环境无 DataTransfer 时靠实例态
    dataTransfer?.setData('text/plain', key)
    if (dataTransfer) dataTransfer.effectAllowed = 'move'
  }

  private readonly handleHeadDragOver = (event: Event): void => {
    const cell = event.currentTarget as HTMLElement
    if (!this.dragColumnKey || cell.getAttribute('data-column-key') === this.dragColumnKey) return
    event.preventDefault()
    cell.setAttribute('data-drag-over', '')
  }

  private readonly handleHeadDragLeave = (event: Event): void => {
    ;(event.currentTarget as HTMLElement).removeAttribute('data-drag-over')
  }

  private readonly handleHeadDrop = (event: Event): void => {
    const cell = event.currentTarget as HTMLElement
    cell.removeAttribute('data-drag-over')
    const from = this.dragColumnKey ?? (event as DragEvent).dataTransfer?.getData('text/plain') ?? ''
    const to = cell.getAttribute('data-column-key') ?? ''
    this.dragColumnKey = null
    if (!from || !to || from === to) return
    event.preventDefault()
    const order = this.displayColumns(this.columns).map((column) => column.key)
    const fromIndex = order.indexOf(from)
    const toIndex = order.indexOf(to)
    if (fromIndex < 0 || toIndex < 0) return
    order.splice(fromIndex, 1)
    order.splice(toIndex, 0, from)
    this.columnOrder = order
    this.syncLayout()
    this.announce(this.t('schemaForm.columnsReordered', { column: this.columnLabel(to) }))
  }

  private readonly handleHeadDragEnd = (event: Event): void => {
    this.dragColumnKey = null
    for (const cell of this.headEl?.querySelectorAll<HTMLElement>('[data-column-key]') ?? []) {
      cell.style.opacity = ''
      cell.removeAttribute('data-drag-over')
    }
    ;(event.currentTarget as HTMLElement).style.opacity = ''
  }

  private columnLabel(key: string): string {
    const column = this.columns.find((entry) => entry.key === key)
    return column ? column.label || column.key : key
  }

  private syncShadow(): void {
    const table = this.tableEl
    if (!table) return
    const head = this.headEl
    if (head) head.hidden = this.items.length === 0
    const empty = this.emptyEl
    if (empty) {
      empty.hidden = this.items.length > 0
      const cell = empty.querySelector<HTMLElement>('.empty-cell')
      if (cell) cell.textContent = this.t('schemaForm.emptyArray')
    }
    table.setAttribute('aria-label', this.getAttr('label', '') || this.t('schemaForm.tableLabel'))
    table.setAttribute('aria-rowcount', String(this.items.length + 1))

    const frames = [...(this.rowsEl?.querySelectorAll<HTMLElement>(':scope > .row-frame') ?? [])]
    const key = this.items.map((item) => item.uid).join(',')
    if (key !== this.frameKey) {
      this.frameKey = key
      for (const frame of frames) frame.remove()
      for (const item of this.items) {
        const frame = document.createElement('div')
        frame.className = 'row-frame'
        const slot = document.createElement('slot')
        slot.setAttribute('name', `oas-array-table-row-${item.uid}`)
        frame.appendChild(slot)
        this.rowsEl?.appendChild(frame)
      }
    }

    const frozen = this.hasAttr('disabled')
    const atMin = this.items.length <= this.minValue()
    const atMax = this.items.length >= this.maxValue()
    const last = this.items.length - 1
    this.items.forEach((item, index) => {
      const states: Record<RowAction, boolean> = {
        duplicate: frozen || atMax,
        'move-up': frozen || index === 0,
        'move-down': frozen || index === last,
        remove: frozen || atMin,
      }
      for (const action of ROW_ACTIONS) {
        const btn = item.actions.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)
        if (!btn) continue
        btn.disabled = states[action]
        btn.style.cursor = btn.disabled ? 'not-allowed' : 'pointer'
        btn.style.color = btn.disabled ? 'var(--oas-color-text-disabled)' : 'var(--oas-color-text-secondary)'
        const label = this.resolveActionText(action)
        if (btn.getAttribute('aria-label') !== label) btn.setAttribute('aria-label', label)
      }
    })

    const addBtn = this.addBtn
    if (addBtn) {
      addBtn.disabled = frozen || atMax
      addBtn.setAttribute('aria-label', this.resolveAddText())
      addBtn.textContent = ''
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      icon.setAttribute('viewBox', '0 0 16 16')
      icon.setAttribute('width', '12')
      icon.setAttribute('height', '12')
      icon.setAttribute('aria-hidden', 'true')
      icon.setAttribute('focusable', 'false')
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', ADD_ICON_PATH)
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', 'currentColor')
      path.setAttribute('stroke-width', '1.4')
      path.setAttribute('stroke-linecap', 'round')
      icon.appendChild(path)
      icon.style.setProperty('margin-inline-end', 'var(--oas-space-1)')
      icon.style.verticalAlign = '-2px'
      addBtn.appendChild(icon)
      const span = document.createElement('span')
      span.textContent = this.resolveAddText()
      addBtn.appendChild(span)
    }
  }

  private resolveActionText(action: RowAction): string {
    const raw = this.getAttr(`${action}-text`, '')
    if (raw !== '') return raw
    if (action === 'duplicate') return this.t('schemaForm.rowDuplicate')
    if (action === 'move-up') return this.t('schemaForm.rowUp')
    if (action === 'move-down') return this.t('schemaForm.rowDown')
    return this.t('schemaForm.rowRemove')
  }

  private resolveAddText(): string {
    const raw = this.getAttr('add-text', '')
    return raw !== '' ? raw : this.t('schemaForm.rowAdd')
  }

  private replayInitialValues(): void {
    if (!this.pendingInitialReplay) return
    this.pendingInitialReplay = false
    const form = this.closest('oas-form') as { reapplyInitialValues?: () => void } | null
    form?.reapplyInitialValues?.()
  }

  private handleDomMutation(): void {
    const tpl = this.resolveTemplate()
    if (tpl !== this.lastTemplate) {
      this.lastTemplate = tpl
      this.rebuild()
      this.ensureItems()
      this.applyNaming()
      this.syncLayout()
      this.syncShadow()
      this.replayInitialValues()
    }
  }

  get rowCount(): number {
    return this.items.length
  }

  /** 行数收敛（受控数组缩容 / 行值内层数组对齐用）：增补空行、缩减从末尾删行，不派发事件 */
  setRowCount(count: number): void {
    if (!this.lastTemplate) return
    const target = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : this.items.length
    if (target === this.items.length) return
    let grew = false
    while (this.items.length < target) {
      this.addItem()
      grew = true
    }
    while (this.items.length > target) {
      const [removed] = this.items.splice(this.items.length - 1, 1)
      removed?.wrapper.remove()
    }
    if (grew) this.pendingInitialReplay = true
    this.applyNaming()
    this.syncLayout()
    this.syncShadow()
    this.replayInitialValues()
  }

  insertRowAt(index: number): boolean {
    if (!this.lastTemplate) return false
    if (this.items.length >= this.maxValue()) return false
    const at = Math.min(Math.max(0, Math.floor(index)), this.items.length)
    this.addItem(at)
    this.pendingInitialReplay = true
    this.applyNaming()
    this.syncLayout()
    this.syncShadow()
    this.replayInitialValues()
    return true
  }

  private readonly handleAddClick = (): void => this.handleAdd()

  // ---------- 跨行粘贴（TSV） ----------

  private readonly handlePasteEvent = (event: Event): void => this.handlePaste(event as ClipboardEvent)

  /**
   * 表格区粘贴 TSV：按 `\t` 分列、换行分行，从当前单元格起向右下填充。
   *
   * 纪律：
   * - 单值粘贴（无制表符 / 换行）不接管——原生输入行为保持不变；
   * - 目标行不足时补行，超过 `max` 截断并以**实例级一次** devWarn + aria-live 提示；
   * - 值按单元格控件现有写入通道落地（类型校验由 schema-form 既有投影 / 校验链承接）；
   * - 隐藏列不参与粘贴（视觉上没有列，写进去会变成「看不见的值」）。
   */
  private handlePaste(event: ClipboardEvent): void {
    if (this.hasAttr('disabled')) return
    const text = event.clipboardData?.getData('text/plain') ?? ''
    if (text === '') return
    const normalized = text.replace(/\r\n?/g, '\n')
    if (!normalized.includes('\t') && !normalized.includes('\n')) return
    const anchor = this.pasteAnchor(event)
    if (!anchor) return
    const lines = normalized.split('\n')
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
    if (lines.length === 0) return
    const matrix = lines.map((line) => line.split('\t'))
    const columns = this.columns
    const visibleColumns = this.displayColumns(columns).filter((column) => column.hidden !== true)
    const startColumn = visibleColumns.findIndex((column) => column.key === anchor.columnKey)
    if (startColumn < 0) return
    const max = this.maxValue()
    const wanted = anchor.rowIndex + matrix.length
    const targetRows = Math.min(wanted, Number.isFinite(max) ? max : wanted)
    const truncated = wanted > targetRows
    event.preventDefault()
    const rowsBefore = this.items.length
    if (targetRows > rowsBefore) {
      while (this.items.length < targetRows) this.addItem()
      this.pendingInitialReplay = true
      this.applyNaming()
      this.syncLayout()
      this.syncShadow()
      this.replayInitialValues()
    }
    let filledColumns = 0
    for (let offset = 0; offset < targetRows - anchor.rowIndex; offset++) {
      const values = matrix[offset] ?? []
      const item = this.items[anchor.rowIndex + offset]
      if (!item) continue
      const limit = Math.min(values.length, visibleColumns.length - startColumn)
      for (let c = 0; c < limit; c++) {
        const column = visibleColumns[startColumn + c]!
        const cellIndex = columns.findIndex((entry) => entry.key === column.key)
        const cell = item.cells[cellIndex]
        const widget = cell?.querySelector<HTMLElement>('[name]')
        if (!widget) continue
        this.writePastedValue(widget, values[c] ?? '')
        filledColumns = Math.max(filledColumns, c + 1)
      }
    }
    const rowsFilled = Math.max(0, Math.min(matrix.length, targetRows - anchor.rowIndex))
    if (truncated) {
      if (!this.pasteTruncationWarned) {
        this.pasteTruncationWarned = true
        devWarn(`[oas-array-table] 粘贴内容超过行数上限（${Number.isFinite(max) ? max : '∞'}），已截断到上限`)
      }
      this.announce(this.t('schemaForm.pasteTruncated', { max: Number.isFinite(max) ? max : wanted }))
    } else {
      this.announce(this.t('schemaForm.pasted', { rows: rowsFilled, cols: filledColumns }))
    }
    this.syncShadow()
    // 数组容器不知道值被改写（写入走控件通道）：事件供 schema-form 做值同步 / 联动重算 / 脏态刷新。
    // `addedRows` = 本次粘贴补出的行数：schema-form 据此区分「补行粘贴」（行号面变化，错误视觉
    // 随重编号一起清）与「纯值粘贴」（只在现有单元格填值，错误视觉按内核契约保持）。
    this.emit('paste', {
      startRow: anchor.rowIndex,
      startColumn,
      rows: rowsFilled,
      columns: filledColumns,
      truncated,
      addedRows: Math.max(0, targetRows - rowsBefore),
    })
  }

  /** 粘贴锚点：命中的单元格（role=cell）→ 行号 + 列 key */
  private pasteAnchor(event: ClipboardEvent): { rowIndex: number; columnKey: string } | null {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : []
    const cell = path.find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.getAttribute('role') === 'cell' && this.contains(node),
    )
    if (!cell) return null
    const item = this.items.find((entry) => entry.wrapper.contains(cell))
    if (!item) return null
    const cellIndex = item.cells.indexOf(cell)
    const column = this.columns[cellIndex]
    if (!column) return null
    return { rowIndex: this.items.indexOf(item), columnKey: column.key }
  }

  /** 粘贴值写入控件：优先内核 writer，未注册 writer 时回落 value 属性（与快照回填同判据） */
  private writePastedValue(widget: HTMLElement, value: string): void {
    if (widget.tagName.toLowerCase() === 'oas-upload') return
    if (writeFormControlValue(widget, value)) return
    widget.setAttribute('value', value)
  }

  /** 行操作分派（按钮点击 / 键盘激活同一入口） */
  private runAction(action: RowAction, index: number): void {
    if (action === 'remove') this.removeRow(index)
    else if (action === 'duplicate') this.duplicateRow(index)
    else this.moveRow(index, action === 'move-up' ? index - 1 : index + 1)
  }

  private handleAdd(): void {
    if (this.hasAttr('disabled')) return
    if (this.items.length >= this.maxValue()) return
    if (!this.lastTemplate) return
    this.addItem()
    this.applyNaming()
    this.syncLayout()
    this.syncShadow()
    this.replayInitialValues()
    const index = this.items.length - 1
    this.emit('add', { index })
    this.announce(this.t('schemaForm.rowAdded', { index: index + 1 }))
    this.focusItem(index)
  }

  private removeRow(index: number): void {
    if (this.hasAttr('disabled')) return
    if (this.items.length <= this.minValue()) return
    const [item] = this.items.splice(index, 1)
    item!.wrapper.remove()
    this.applyNaming()
    this.syncLayout()
    this.syncShadow()
    this.emit('remove', { index })
    this.announce(this.t('schemaForm.rowRemoved', { index: index + 1 }))
    const next = Math.min(index, this.items.length - 1)
    if (next >= 0) this.focusAction(next, 'remove')
  }

  private duplicateRow(index: number): void {
    if (this.hasAttr('disabled')) return
    if (this.items.length >= this.maxValue()) return
    const target = index + 1
    if (!this.insertRowAt(target)) return
    copyRowValue(this, this.getAttr('name', ''), index, target)
    this.emit('duplicate', { from: index, to: target })
    this.announce(this.t('schemaForm.rowDuplicated', { index: target + 1 }))
    this.focusAction(target, 'duplicate')
  }

  private moveRow(from: number, to: number): void {
    if (this.hasAttr('disabled')) return
    if (to < 0 || to >= this.items.length) return
    swapRowValues(this, this.getAttr('name', ''), from, to)
    this.emit('move', { from, to })
    this.announce(this.t('schemaForm.rowMoved', { from: from + 1, to: to + 1 }))
    this.focusAction(to, to < from ? 'move-up' : 'move-down')
  }

  private announce(message: string): void {
    if (!this.liveEl) return
    this.liveEl.textContent = message
  }

  /** 焦点落点：优先被点按钮的同位按钮；边界处该按钮已禁用（首行上移 / 末行下移）则退到该行首个可用操作钮 */
  private focusAction(index: number, action: RowAction): void {
    const actions = this.items[index]?.actions
    if (!actions) return
    const preferred = actions.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)
    if (preferred && !preferred.disabled) {
      preferred.focus()
      return
    }
    // 边界处优先退到「反向」操作钮（刚上移到首行 → 下移可撤销），再退首个可用
    const opposite = action === 'move-up' ? 'move-down' : action === 'move-down' ? 'move-up' : null
    const order: RowAction[] = opposite ? [opposite, ...ROW_ACTIONS] : [...ROW_ACTIONS]
    for (const candidate of order) {
      const btn = actions.querySelector<HTMLButtonElement>(`[data-action="${candidate}"]`)
      if (btn && !btn.disabled) {
        btn.focus()
        return
      }
    }
  }

  /** 聚焦新行首个可聚焦控件（oas-input 聚焦其内部 input） */
  private focusItem(index: number): void {
    const row = this.items[index]?.wrapper
    if (!row) return
    const oasInput = row.querySelector<HTMLElement>('oas-input')
    const inner = oasInput?.shadowRoot?.querySelector<HTMLElement>('input')
    if (inner) {
      inner.focus()
      return
    }
    row.querySelector<HTMLElement>('input, textarea, select, button, [tabindex]')?.focus()
  }
}

/** 列宽 → grid 轨道串（数字按 px；字符串原样；缺省等分且可收缩） */
function columnTrack(width: number | string | undefined): string {
  if (typeof width === 'number' && Number.isFinite(width) && width > 0) return `${Math.round(width)}px`
  if (typeof width === 'string' && width.trim() !== '') return width.trim()
  return 'minmax(0, 1fr)'
}
