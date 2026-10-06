import { OASElement } from '@oas-ui/core'
import {
  formatToken,
  getWeekStart,
  isoWeek,
  parseISODate,
  resolveLocale,
  startOfDay,
  toISODate,
} from '../../form/calendar/date-grid.js'
import { computeVirtualWindow } from '../virtual-list/oas-virtual-list.js'
import { isRtl } from '../../shared/direction.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  min-width: 0;
}
:host([hidden]) {
  display: none;
}
.gantt {
  display: flex;
  align-items: stretch;
  height: var(--oas-gantt-height, 320px);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  overflow: hidden;
  position: relative;
  font-size: var(--oas-font-size-sm);
}
.side {
  width: var(--oas-gantt-list-width, 220px);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-inline-end: 1px solid var(--oas-color-border);
  background: var(--oas-gantt-header-bg, var(--oas-color-bg));
}
.side-head {
  height: var(--oas-gantt-header-height, 44px);
  flex-shrink: 0;
  border-bottom: 1px solid var(--oas-gantt-grid-line-color, var(--oas-color-border));
}
.side-body {
  flex: 1;
  overflow: hidden;
  position: relative;
}
.side-inner {
  position: relative;
  height: 100%;
}
.row-name {
  position: absolute;
  inset-inline-start: 0;
  width: 100%;
  height: var(--oas-gantt-row-height, 36px);
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding-inline-start: var(--indent, 8px);
  padding-inline-end: var(--oas-space-2);
  box-sizing: border-box;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--oas-color-text-primary);
}
.toggle {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--oas-color-text-secondary-strong);
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: var(--oas-radius-xs);
  padding: 0;
  font-size: var(--oas-font-size-xs);
  line-height: 1;
}
.toggle:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-primary);
}
.toggle:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.thead {
  height: var(--oas-gantt-header-height, 44px);
  flex-shrink: 0;
  overflow: hidden;
  border-bottom: 1px solid var(--oas-gantt-grid-line-color, var(--oas-color-border));
  background: var(--oas-gantt-header-bg, var(--oas-color-bg));
  position: relative;
}
.head-major,
.head-minor {
  position: relative;
  height: 50%;
}
.head-minor {
  border-top: 1px solid var(--oas-gantt-grid-line-color, var(--oas-color-border));
}
.head-major .unit,
.head-minor .unit {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--oas-color-text-secondary-strong);
  font-size: var(--oas-font-size-xs);
  white-space: nowrap;
  overflow: hidden;
  box-sizing: border-box;
}
.head-minor .unit {
  border-inline-start: 1px solid var(--oas-gantt-grid-line-color, var(--oas-color-border));
}
.head-minor .unit:first-child {
  border-inline-start: none;
}
.tbody {
  flex: 1;
  overflow: auto;
  position: relative;
  overscroll-behavior: contain;
}
.inner {
  position: relative;
}
.grid-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.grid-canvas .cell {
  position: absolute;
  top: 0;
  background: var(--oas-gantt-weekend-bg, color-mix(in srgb, var(--oas-color-bg-hover) 60%, transparent));
}
.grid-canvas .cell.holiday {
  background: var(--oas-gantt-holiday-bg, color-mix(in srgb, var(--oas-color-warning) 12%, transparent));
}
svg.links {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}
svg.links path {
  fill: none;
  stroke: var(--oas-gantt-link-color, var(--oas-color-primary));
  stroke-width: 1.5;
}
svg.links marker path {
  fill: var(--oas-gantt-link-color, var(--oas-color-primary));
  stroke: none;
}
.bars {
  position: absolute;
  inset: 0;
}
.bar {
  position: absolute;
  height: var(--oas-gantt-bar-height, 22px);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-gantt-bar-bg, color-mix(in srgb, var(--oas-gantt-bar-color, var(--oas-color-primary)) 22%, transparent));
  cursor: grab;
  box-sizing: border-box;
  overflow: visible;
}
.bar:active {
  cursor: grabbing;
}
.bar:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 2px;
}
.bar[disabled] {
  cursor: not-allowed;
  opacity: 0.6;
}
.bar-progress {
  position: absolute;
  inset-inline-start: 0;
  top: 0;
  height: 100%;
  border-radius: inherit;
  background: var(--oas-gantt-bar-progress-bg, var(--oas-gantt-bar-color, var(--oas-color-primary)));
  opacity: 0.9;
  pointer-events: none;
}
.bar-label {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  pointer-events: none;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-xs);
}
.bar.label-inside .bar-label {
  inset-inline-start: 6px;
  max-width: calc(100% - 12px);
}
.bar.label-right .bar-label {
  inset-inline-start: calc(100% + 6px);
}
.bar.label-left .bar-label {
  inset-inline-end: calc(100% + 6px);
}
.handle {
  position: absolute;
  top: 0;
  height: 100%;
  width: 8px;
  cursor: ew-resize;
}
.handle-start {
  inset-inline-start: -4px;
}
.handle-end {
  inset-inline-end: -4px;
}
.progress-handle {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: var(--oas-gantt-bar-progress-bg, var(--oas-gantt-bar-color, var(--oas-color-primary)));
  border: 2px solid var(--oas-color-bg);
  box-shadow: var(--oas-shadow-sm);
  cursor: ew-resize;
  box-sizing: border-box;
}
.bar.milestone {
  background: transparent;
  overflow: visible;
}
.bar.milestone .dia {
  position: absolute;
  top: 50%;
  width: 15px;
  height: 15px;
  transform: translate(-50%, -50%) rotate(45deg);
  background: var(--oas-gantt-milestone-color, var(--oas-color-warning));
  border-radius: 2px;
}
.bar.summary {
  height: 8px;
  background: var(--oas-gantt-summary-bg, var(--oas-color-text-secondary-strong));
  border-radius: var(--oas-radius-xs);
  cursor: default;
}
.bar.summary::before,
.bar.summary::after {
  content: '';
  position: absolute;
  top: 100%;
  width: 0;
  height: 0;
  border-inline: 4px solid transparent;
  border-top: 5px solid var(--oas-gantt-summary-bg, var(--oas-color-text-secondary-strong));
}
.bar.summary::before {
  inset-inline-start: 0;
}
.bar.summary::after {
  inset-inline-end: 0;
}
.today-line {
  position: absolute;
  top: 0;
  width: 2px;
  background: var(--oas-gantt-today-color, var(--oas-color-danger));
  pointer-events: none;
  z-index: 1;
}
.today-line[hidden] {
  display: none !important;
}
.tooltip {
  position: absolute;
  z-index: 3;
  max-width: 280px;
  padding: var(--oas-space-2) var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  box-shadow: var(--oas-shadow-md);
  font-size: var(--oas-font-size-xs);
  pointer-events: none;
}
.tooltip[hidden] {
  display: none !important;
}
.tooltip .tip-name {
  font-weight: 600;
  margin-bottom: 2px;
}
.tooltip .tip-line {
  color: var(--oas-color-text-secondary-strong);
}
.empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--oas-color-text-secondary-strong);
  background: var(--oas-color-bg);
  z-index: 2;
}
.empty[hidden] {
  display: none !important;
}
`

/** 甘特任务（数据契约：扁平 `parent` 指针为主；嵌套 `children` 输入在清洗层自动拍平兼容） */
export interface GanttTask {
  id?: string
  /** 任务名（必填，缺失丢弃） */
  name: string
  /** 开始 'YYYY-MM-DD'（hour 档支持 'YYYY-MM-DD HH:mm'） */
  start: string
  /** 结束；缺省 = 里程碑（单点） */
  end?: string
  /** 类型；缺省推导：有子 = summary、无 end = milestone、其余 task */
  type?: 'task' | 'milestone' | 'summary'
  /** 进度 0-100（越界 clamp；缺省 0） */
  progress?: number
  /** 父任务 id（扁平指针；悬空按根渲染并告警一次） */
  parent?: string
  /** 嵌套子任务（兼容输入通道；清洗层拍平为 parent 指针） */
  children?: GanttTask[]
  /** 依赖（id 指向其他任务；type 缺省 fs） */
  dependencies?: GanttDependency[]
  /** 条色覆盖（走 CSS 变量解析） */
  color?: string
  /** 任务级禁拖/禁改 */
  disabled?: boolean
  /** summary 初始展开（缺省收起；expanded 属性受控优先） */
  expanded?: boolean
  [key: string]: unknown
}

/** 依赖关系 */
export interface GanttDependency {
  /** 被依赖任务 id（不存在则该线跳过） */
  id: string
  /** 依赖类型：fs 完成-开始（缺省）/ ss 开始-开始 / ff 完成-完成 / sf 开始-完成 */
  type?: 'fs' | 'ss' | 'ff' | 'sf'
}

/** 时间刻度档 */
export type GanttScale = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

/** task-click / task-dblclick 事件载荷 */
export interface GanttTaskClickDetail {
  id: string
  task: GanttTask
}

/** task-change 事件载荷（拖拽/拉伸/键盘改期收口，含旧值） */
export interface GanttTaskChangeDetail {
  id: string
  task: GanttTask
  oldStart: string
  oldEnd: string
  start: string
  end: string
}

/** progress-change 事件载荷 */
export interface GanttProgressChangeDetail {
  id: string
  task: GanttTask
  progress: number
}

/** tasks-change 事件载荷 */
export interface GanttTasksChangeDetail {
  tasks: GanttTask[]
}

/** expand-change 事件载荷 */
export interface GanttExpandChangeDetail {
  id: string
  expanded: boolean
}

/** scale-change 事件载荷 */
export interface GanttScaleChangeDetail {
  scale: GanttScale
}

/** task-render 事件载荷 */
export interface GanttTaskRenderDetail {
  task: GanttTask
  element: HTMLElement
}

type TG = GanttTask & { id: string }

interface GanttRow {
  task: TG
  depth: number
  startMs: number
  endMs: number
  progress: number
  isSummary: boolean
  isMilestone: boolean
  hasChildren: boolean
}

interface TimeUnit {
  startMs: number
  endMs: number
  major: string
  minor: string
}

type DragMode = 'move' | 'resize-start' | 'resize-end' | 'progress'

interface DragCtx {
  id: string
  mode: DragMode
  startX: number
  origStartMs: number
  origEndMs: number
  origProgress: number
  datetime: boolean
  bar: HTMLElement
  newStartMs?: number
  newEndMs?: number
  newProgress?: number
}

const SCALES: GanttScale[] = ['hour', 'day', 'week', 'month', 'quarter', 'year']
/** 各档列宽（px）与前后留白档数 */
const SCALE_COL: Record<GanttScale, number> = { hour: 44, day: 36, week: 90, month: 110, quarter: 150, year: 130 }
const SCALE_PAD: Record<GanttScale, number> = { hour: 12, day: 7, week: 2, month: 2, quarter: 1, year: 1 }
const DAY_MS = 86_400_000

const DEP_TYPES = new Set(['fs', 'ss', 'ff', 'sf'])

function parseTaskDate(s: unknown): Date | null {
  if (typeof s !== 'string') return null
  return parseISODate(s.trim())
}

function parseProgress(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
  return Math.min(100, Math.max(0, Math.round(v)))
}

function sanitizeDeps(v: unknown): GanttDependency[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: GanttDependency[] = []
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue
    const it = item as Record<string, unknown>
    if (typeof it.id !== 'string' || it.id === '') continue
    const dep: GanttDependency = { id: it.id }
    if (typeof it.type === 'string' && DEP_TYPES.has(it.type)) dep.type = it.type as GanttDependency['type']
    out.push(dep)
  }
  return out.length > 0 ? out : undefined
}

/** 展开中的嵌套输入先拍平（保 DFS 序：父在前、子随后），再统一清洗；fromNest 标记 parent 来自嵌套推导 */
function flattenInput(
  v: unknown,
  out: Array<{ raw: Record<string, unknown>; parent: string | null; fromNest: boolean }>,
  parent: string | null,
): void {
  if (!Array.isArray(v)) return
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue
    const raw = item as Record<string, unknown>
    out.push({ raw, parent, fromNest: parent !== null })
    if (Array.isArray(raw.children)) {
      const pid = typeof raw.id === 'string' && raw.id !== '' ? raw.id : null
      flattenInput(raw.children, out, pid)
    }
  }
}

/**
 * 清洗任务数组：坏数据丢弃；children 嵌套拍平为 parent 指针；缺 id 自动分配并避让
 * （显式 id 重复/冲突时自动避让，对齐 scheduler 语义）；type 推导在渲染模型层完成。
 */
function sanitizeTasks(v: unknown, allocId: (used: Set<string>) => string): TG[] {
  const flat: Array<{ raw: Record<string, unknown>; parent: string | null; fromNest: boolean }> = []
  flattenInput(v, flat, null)

  // 首趟：校验 + 定 id（自动 id 避让「显式 id + 本批已分配」）
  const avoid = new Set<string>()
  for (const { raw } of flat) if (typeof raw.id === 'string' && raw.id !== '') avoid.add(raw.id)
  const seen = new Set<string>()
  const idOf = new Map<number, string>()
  for (let i = 0; i < flat.length; i++) {
    const { raw } = flat[i]!
    if (typeof raw.name !== 'string' || raw.name === '') continue
    if (!parseTaskDate(raw.start)) continue
    let id: string
    if (typeof raw.id === 'string' && raw.id !== '' && !seen.has(raw.id)) {
      id = raw.id
    } else {
      id = allocId(avoid)
      avoid.add(id)
    }
    seen.add(id)
    avoid.add(id)
    idOf.set(i, id)
  }
  const validIds = new Set(idOf.values())
  // 二趟：组装。parent 处理：
  // - 指向本批真实任务 → 保留指针
  // - 来自显式 parent 字段且悬空 → 保留（渲染层按根渲染并告警一次，帮宿主发现数据错误）
  // - 来自嵌套拍平且父被丢弃（如父缺名）→ 静默丢弃（级联悬空不是宿主写错的 parent）
  const out: TG[] = []
  for (let i = 0; i < flat.length; i++) {
    const id = idOf.get(i)
    if (!id) continue
    const { raw, parent, fromNest } = flat[i]!
    const t: TG = { id, name: raw.name as string, start: (raw.start as string).trim() }
    const endRaw = typeof raw.end === 'string' && raw.end.trim() !== '' ? raw.end.trim() : undefined
    if (endRaw && parseTaskDate(endRaw)) t.end = endRaw
    const progress = parseProgress(raw.progress)
    if (progress !== undefined) t.progress = progress
    const parentVal = fromNest ? parent : typeof raw.parent === 'string' && raw.parent !== '' ? raw.parent : undefined
    if (parentVal) {
      if (validIds.has(parentVal) && parentVal !== id) t.parent = parentVal
      else if (!fromNest) t.parent = parentVal
    }
    const deps = sanitizeDeps(raw.dependencies)
    if (deps) t.dependencies = deps
    if (typeof raw.color === 'string' && raw.color !== '') t.color = raw.color
    if (raw.disabled === true) t.disabled = true
    if (raw.expanded === true || raw.expanded === false) t.expanded = raw.expanded
    if (raw.type === 'task' || raw.type === 'milestone' || raw.type === 'summary') t.type = raw.type
    out.push(t)
  }
  return out
}

export class OASGantt extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'tasks',
      'scale',
      'expanded',
      'readonly',
      'dates-readonly',
      'progress-readonly',
      'show-today',
      'weekends',
      'holidays',
      'first-day-of-week',
      'locale',
      'height',
      'row-height',
      'label-position',
      'snap',
    ]
  }

  private _tasks: TG[] = []
  private tasksAttrCache = ''
  private nextId = 1
  private expandedAttrCache = ''
  /** 展开集合：null = 未受控（数据 expanded 初始化）；expanded 属性出现后受控 */
  private expanded: Set<string> | null = null
  private units: TimeUnit[] = []
  private rows: GanttRow[] = []
  private canvasW = 0
  private lastScale = ''
  private warnedParents = new Set<string>()
  private dragCtx: DragCtx | null = null
  private tbody: HTMLElement | null = null
  private theadEl: HTMLElement | null = null
  private sideBody: HTMLElement | null = null
  private sideRows: HTMLElement | null = null
  private barsEl: HTMLElement | null = null
  private linksEl: SVGSVGElement | null = null
  private gridEl: HTMLElement | null = null
  private innerEl: HTMLElement | null = null
  private todayEl: HTMLElement | null = null
  private tooltipEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  private winStart = 0
  private winEnd = 0

  /**
   * @apiProperty 甘特任务（公开读/写通道）：读为数组拷贝（含自动分配的 id，嵌套输入已拍平为
   * parent 指针）；写为程序性赋值（序列化进受控 `tasks` 属性并重渲染、派发 oas-tasks-change）。
   */
  get tasks(): GanttTask[] {
    return this._tasks.map((t) => {
      const copy: GanttTask = { ...t }
      if (copy.dependencies) copy.dependencies = copy.dependencies.map((d) => ({ ...d }))
      delete copy.children
      return copy
    })
  }
  set tasks(v: GanttTask[]) {
    this._tasks = sanitizeTasks(v, (used) => this.allocId(used))
    this.tasksAttrCache = JSON.stringify(this._tasks)
    this.setAttribute('tasks', this.tasksAttrCache)
    this.update()
    this.emitTasksChange()
  }

  /** 按 id 单条增量更新（浅合并 patch 后走 sanitize 清洗；找不到或非法 patch 返回 false） */
  updateTask(id: string, patch: Partial<GanttTask>): boolean {
    const idx = this._tasks.findIndex((t) => t.id === id)
    if (idx < 0) return false
    const merged = { ...this._tasks[idx]!, ...patch, id }
    const [clean] = sanitizeTasks([merged], (used) => this.allocId(used))
    if (!clean) return false
    clean.id = id
    this._tasks = [...this._tasks.slice(0, idx), clean, ...this._tasks.slice(idx + 1)]
    this.syncTasksAttr()
    this.update()
    this.emitTasksChange()
    return true
  }

  /** 滚动到指定任务行（虚拟滚动下委托内部视口，目标行垂直居中）；找不到为空操作。
   *  命名避开 DOM 内建 Element.scrollTo（签名不兼容会崩宿主 property 通道，同 prefix/blur 先例） */
  scrollToTask(id: string): void {
    const idx = this.rows.findIndex((r) => r.task.id === id)
    if (idx < 0 || !this.tbody) return
    const vh = this.viewportH()
    this.tbody.scrollTop = Math.max(0, idx * this.rowHeight() - vh / 2 + this.rowHeight() / 2)
    this.renderWindow()
  }

  /** 滚动到指定日期（水平居中）；非法日期忽略 */
  scrollToDate(date: string): void {
    const d = parseTaskDate(date)
    if (!d || !this.tbody) return
    const x = this.mirrorX(this.xOf(d.getTime()))
    const half = this.tbody.clientWidth / 2
    this.tbody.scrollLeft = Math.max(0, x - half)
  }

  /** 滚动到今天 */
  scrollToToday(): void {
    this.scrollToDate(toISODate(new Date()))
  }

  private allocId(used: Set<string>): string {
    let id = `gt${this.nextId++}`
    while (used.has(id)) id = `gt${this.nextId++}`
    return id
  }

  private syncTasksAttr(): void {
    this.tasksAttrCache = JSON.stringify(this._tasks)
    this.setAttribute('tasks', this.tasksAttrCache)
  }

  private emitTasksChange(): void {
    this.emit('tasks-change', { tasks: this.tasks } satisfies GanttTasksChangeDetail)
  }

  private syncTasks(): void {
    const raw = this.getAttr('tasks', '')
    if (raw === this.tasksAttrCache) return
    this.tasksAttrCache = raw
    let parsed: unknown
    try {
      parsed = raw === '' ? [] : JSON.parse(raw)
    } catch {
      parsed = []
    }
    this._tasks = sanitizeTasks(parsed, (used) => this.allocId(used))
  }

  /** expanded 属性同步（JSON 数组受控；属性缺席回落数据 expanded 初始集合） */
  private syncExpanded(): void {
    const raw = this.getAttr('expanded', '')
    if (raw === '') {
      if (this.expandedAttrCache !== '') {
        this.expandedAttrCache = ''
        this.expanded = null
      }
      return
    }
    if (raw === this.expandedAttrCache) return
    this.expandedAttrCache = raw
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = []
    }
    this.expanded = new Set(Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [])
  }

  private effectiveLocale(): string {
    const own = this.getAttr('locale', '')
    if (own) return own
    return resolveLocale(this)
  }

  private scale(): GanttScale {
    const raw = this.getAttr('scale', '')
    return (SCALES as string[]).includes(raw) ? (raw as GanttScale) : 'day'
  }

  private colW(): number {
    return SCALE_COL[this.scale()]
  }

  private rowHeight(): number {
    const n = Number(this.getAttr('row-height', '36'))
    return Number.isFinite(n) && n >= 20 ? n : 36
  }

  private heightPx(): number {
    const n = Number(this.getAttr('height', '320'))
    return Number.isFinite(n) && n > 0 ? n : 320
  }

  private labelPosition(): 'inside' | 'right' | 'left' {
    const raw = this.getAttr('label-position', '')
    return raw === 'inside' || raw === 'left' ? raw : 'right'
  }

  private snapOn(): boolean {
    return this.getAttr('snap', '') !== 'false'
  }

  private showToday(): boolean {
    return this.getAttr('show-today', '') !== 'false'
  }

  private weekendsOn(): boolean {
    return this.getAttr('weekends', '') !== 'false'
  }

  private holidaySet(): Set<string> {
    const raw = this.getAttr('holidays', '')
    if (!raw) return new Set()
    try {
      const parsed: unknown = JSON.parse(raw)
      return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [])
    } catch {
      return new Set()
    }
  }

  private weekStart(): number {
    const raw = this.getAttr('first-day-of-week', '')
    if (/^[0-6]$/.test(raw)) return Number(raw)
    return getWeekStart(this.effectiveLocale())
  }

  private datesReadonly(): boolean {
    return this.hasAttr('readonly') || this.hasAttr('dates-readonly')
  }

  private progressReadonly(): boolean {
    return this.hasAttr('readonly') || this.hasAttr('progress-readonly')
  }

  // ===== 时间轴模型 =====

  /** 按 scale 步进 n 个单位（month/quarter/year 走日历运算防月末溢出；其余毫秒加减） */
  private static addUnits(d: Date, scale: GanttScale, n: number): Date {
    if (scale === 'hour') return new Date(d.getTime() + n * 3_600_000)
    if (scale === 'day') return new Date(d.getTime() + n * DAY_MS)
    if (scale === 'week') return new Date(d.getTime() + n * 7 * DAY_MS)
    const months = n * (scale === 'month' ? 1 : scale === 'quarter' ? 3 : 12)
    return new Date(d.getFullYear(), d.getMonth() + months, 1)
  }

  private buildUnits(): void {
    const scale = this.scale()
    let minMs = Number.POSITIVE_INFINITY
    let maxMs = Number.NEGATIVE_INFINITY
    for (const r of this.rows) {
      if (r.startMs < minMs) minMs = r.startMs
      if (r.endMs > maxMs) maxMs = r.endMs
    }
    if (!Number.isFinite(minMs)) {
      const now = Date.now()
      minMs = now
      maxMs = now
    }
    const min = new Date(minMs)
    let anchor: Date
    switch (scale) {
      case 'hour':
        anchor = new Date(min.getFullYear(), min.getMonth(), min.getDate(), min.getHours())
        break
      case 'day':
        anchor = startOfDay(min)
        break
      case 'week': {
        const ws = this.weekStart()
        const diff = (min.getDay() + 7 - ws) % 7
        anchor = new Date(min.getFullYear(), min.getMonth(), min.getDate() - diff)
        break
      }
      case 'month':
        anchor = new Date(min.getFullYear(), min.getMonth(), 1)
        break
      case 'quarter':
        anchor = new Date(min.getFullYear(), Math.floor(min.getMonth() / 3) * 3, 1)
        break
      case 'year':
        anchor = new Date(min.getFullYear(), 0, 1)
        break
    }
    const pad = SCALE_PAD[scale]
    const locale = this.effectiveLocale()
    let cursor = OASGantt.addUnits(anchor, scale, -pad)
    const endBound = OASGantt.addUnits(new Date(maxMs), scale, pad + 1).getTime()
    const units: TimeUnit[] = []
    let guard = 0
    while (cursor.getTime() < endBound && guard++ < 5000) {
      const next = OASGantt.addUnits(cursor, scale, 1)
      units.push({
        startMs: cursor.getTime(),
        endMs: next.getTime(),
        major: this.majorLabel(cursor, scale, locale),
        minor: this.minorLabel(cursor, scale, locale),
      })
      cursor = next
    }
    this.units = units
    this.canvasW = units.length * this.colW()
  }

  private majorLabel(d: Date, scale: GanttScale, locale: string): string {
    if (scale === 'hour') return formatToken(d, 'MM-dd', locale)
    if (scale === 'day' || scale === 'week' || scale === 'month') return formatToken(d, 'yyyy-MM', locale)
    if (scale === 'quarter') return formatToken(d, 'yyyy', locale)
    return `${Math.floor(d.getFullYear() / 10) * 10}`
  }

  private minorLabel(d: Date, scale: GanttScale, locale: string): string {
    switch (scale) {
      case 'hour':
        return formatToken(d, 'HH:mm', locale)
      case 'day':
        return formatToken(d, 'dd', locale)
      case 'week':
        return `W${isoWeek(d)}`
      case 'month':
        return formatToken(d, 'yyyy-MM', locale)
      case 'quarter':
        return `Q${Math.floor(d.getMonth() / 3) + 1}`
      case 'year':
        return formatToken(d, 'yyyy', locale)
    }
  }

  /** 时间 → LTR 画布 x（px）：单位索引 + 单位内比例（月/季/年不等长按比例内插） */
  private xOf(ms: number): number {
    const units = this.units
    const colW = this.colW()
    if (units.length === 0) return 0
    if (ms <= units[0]!.startMs) return 0
    const last = units[units.length - 1]!
    if (ms >= last.endMs) return units.length * colW
    let lo = 0
    let hi = units.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (ms < units[mid]!.endMs) hi = mid
      else lo = mid + 1
    }
    const u = units[lo]!
    const frac = (ms - u.startMs) / (u.endMs - u.startMs)
    return (lo + frac) * colW
  }

  /** LTR x → 渲染坐标（RTL 镜像：改距右缘） */
  private mirrorX(x: number): number {
    return isRtl(this) ? this.canvasW - x : x
  }

  // ===== 渲染模型（行树 + 摘要聚合）=====

  private buildRows(): void {
    const tasks = this._tasks
    const byId = new Map<string, TG>()
    for (const t of tasks) byId.set(t.id, t)
    const childMap = new Map<string, string[]>()
    const roots: TG[] = []
    for (const t of tasks) {
      if (t.parent && byId.has(t.parent)) {
        const list = childMap.get(t.parent!) ?? []
        list.push(t.id)
        childMap.set(t.parent!, list)
      } else {
        if (t.parent && !byId.has(t.parent) && !this.warnedParents.has(t.parent)) {
          this.warnedParents.add(t.parent)
          console.warn(`[oas-gantt] parent "${t.parent}" 不存在，任务 "${t.id}" 已按根节点渲染`)
        }
        roots.push(t)
      }
    }

    const startMsOf = (t: TG): number => parseTaskDate(t.start)?.getTime() ?? 0
    const endMsOf = (t: TG): number => {
      if (!t.end) return startMsOf(t)
      const e = parseTaskDate(t.end)
      if (!e) return startMsOf(t)
      // 日精度 end 含当日（区间右缘 = 次日 00:00）；带时间精度按原值
      return t.end.length > 10 ? e.getTime() : e.getTime() + DAY_MS
    }
    // 摘要聚合（递归后代 min/max + 工期加权进度；叶子 = 自身）
    const agg = new Map<string, { startMs: number; endMs: number; progress: number }>()
    const aggregate = (id: string): { startMs: number; endMs: number; progress: number } => {
      const memo = agg.get(id)
      if (memo) return memo
      const t = byId.get(id)!
      const childIds = childMap.get(id) ?? []
      if (childIds.length === 0) {
        const r = {
          startMs: startMsOf(t),
          endMs: Math.max(endMsOf(t), startMsOf(t)),
          progress: typeof t.progress === 'number' ? t.progress : 0,
        }
        agg.set(id, r)
        return r
      }
      let min = Number.POSITIVE_INFINITY
      let max = Number.NEGATIVE_INFINITY
      let weighted = 0
      let totalDays = 0
      for (const cid of childIds) {
        const c = aggregate(cid)
        if (c.startMs < min) min = c.startMs
        if (c.endMs > max) max = c.endMs
        const days = Math.max((c.endMs - c.startMs) / DAY_MS, 0.5)
        weighted += c.progress * days
        totalDays += days
      }
      const r = { startMs: min, endMs: max, progress: totalDays > 0 ? Math.round(weighted / totalDays) : 0 }
      agg.set(id, r)
      return r
    }

    const expanded = this.effectiveExpandedSet(childMap)
    const rows: GanttRow[] = []
    const walk = (t: TG, depth: number): void => {
      const childIds = childMap.get(t.id) ?? []
      const hasChildren = childIds.length > 0
      const isMilestone = !t.end && !hasChildren
      const isSummary = hasChildren || (t.type === 'summary' && !isMilestone)
      const a = aggregate(t.id)
      rows.push({
        task: t,
        depth,
        startMs: a.startMs,
        endMs: a.endMs,
        progress: a.progress,
        isSummary,
        isMilestone,
        hasChildren,
      })
      if (hasChildren && expanded.has(t.id)) for (const cid of childIds) walk(byId.get(cid)!, depth + 1)
    }
    for (const r of roots) walk(r, 0)
    this.rows = rows
  }

  /** 生效展开集合：受控属性优先；未受控时缺省全展开（数据 expanded:false 为显式收起的例外） */
  private effectiveExpandedSet(childMap: Map<string, string[]>): Set<string> {
    if (this.expanded) return this.expanded
    const set = new Set<string>()
    for (const t of this._tasks) {
      if (t.expanded !== false && (childMap.has(t.id) || t.type === 'summary')) set.add(t.id)
    }
    return set
  }

  /** 当前展开集合（toggle 用；未受控时从数据构建） */
  private currentExpandedSet(): Set<string> {
    if (this.expanded) return this.expanded
    const childMap = new Map<string, string[]>()
    for (const t of this._tasks) {
      if (t.parent && this._tasks.some((x) => x.id === t.parent)) {
        const list = childMap.get(t.parent!) ?? []
        list.push(t.id)
        childMap.set(t.parent!, list)
      }
    }
    return new Set(this.effectiveExpandedSet(childMap))
  }

  private toggleExpand(id: string): void {
    const set = this.currentExpandedSet()
    const next = new Set(set)
    const willExpand = !set.has(id)
    if (willExpand) next.add(id)
    else next.delete(id)
    this.expanded = next
    this.expandedAttrCache = JSON.stringify([...next])
    this.setAttribute('expanded', this.expandedAttrCache)
    this.update()
    this.emit('expand-change', { id, expanded: willExpand } satisfies GanttExpandChangeDetail)
  }

  // ===== 生命周期 =====

  /** 缓存节点引用 + 幂等注册滚动同步（render 与水合路径共用） */
  private bind(): void {
    this.tbody = this.shadow.querySelector('.tbody')
    this.theadEl = this.shadow.querySelector('.thead')
    this.sideBody = this.shadow.querySelector('.side-body')
    this.sideRows = this.shadow.querySelector('.side-rows')
    this.barsEl = this.shadow.querySelector('.bars')
    this.linksEl = this.shadow.querySelector('svg.links')
    this.gridEl = this.shadow.querySelector('.grid-canvas')
    this.innerEl = this.shadow.querySelector('.inner')
    this.todayEl = this.shadow.querySelector('.today-line')
    this.tooltipEl = this.shadow.querySelector('.tooltip')
    this.emptyEl = this.shadow.querySelector('.empty')
    this.tbody?.addEventListener('scroll', this.onScroll, { passive: true })
    this.onCleanup(() => {
      this.tbody?.removeEventListener('scroll', this.onScroll)
      this.dragCtx = null
    })
  }

  private onScroll = (): void => {
    if (!this.tbody) return
    if (this.theadEl) this.theadEl.scrollLeft = this.tbody.scrollLeft
    if (this.sideBody) this.sideBody.scrollTop = this.tbody.scrollTop
    this.hideTooltip()
    this.renderWindow()
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="gantt" part="gantt">
        <div class="side" part="side">
          <div class="side-head" part="side-head"></div>
          <div class="side-body" part="side-body">
            <div class="side-inner">
              <div class="side-rows" role="tree"></div>
            </div>
          </div>
        </div>
        <div class="main" part="main">
          <div class="thead" part="thead">
            <div class="head-major"></div>
            <div class="head-minor"></div>
          </div>
          <div class="tbody" part="tbody">
            <div class="inner">
              <div class="grid-canvas"></div>
              <svg class="links" aria-hidden="true"></svg>
              <div class="bars"></div>
              <div class="today-line" aria-hidden="true" hidden></div>
            </div>
          </div>
        </div>
        <div class="tooltip" hidden></div>
        <div class="empty" hidden></div>
      </div>
    `
    this.bind()
    this.update()
  }

  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.gantt')) return false
    if (!this.shadow.querySelector('.tbody')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // 拖拽中数据被外部重写 → 终止拖拽回滚（受控纪律：外部数据为准）
    if (this.dragCtx) this.cancelDrag()
    this.syncTasks()
    this.syncExpanded()
    this.toggleAttribute('data-rtl', isRtl(this))
    this.buildRows()
    const scale = this.scale()
    if (this.lastScale === '') {
      this.lastScale = scale // 首次吸收不派发
    } else if (this.lastScale !== scale) {
      this.lastScale = scale
      this.emit('scale-change', { scale } satisfies GanttScaleChangeDetail)
    }
    this.buildUnits()
    if (this.innerEl) {
      this.innerEl.style.width = `${this.canvasW}px`
      this.innerEl.style.height = `${this.rows.length * this.rowHeight()}px`
    }
    const sideInner = this.shadow.querySelector<HTMLElement>('.side-inner')
    if (sideInner) sideInner.style.height = `${Math.max(this.rows.length * this.rowHeight(), 1)}px`
    const isEmpty = this._tasks.length === 0
    if (this.emptyEl) {
      this.emptyEl.hidden = !isEmpty
      if (isEmpty) {
        const tpl = this.querySelector('template[slot="empty"]')
        if (tpl instanceof HTMLTemplateElement) {
          this.emptyEl.innerHTML = ''
          this.emptyEl.appendChild(tpl.content.cloneNode(true))
        } else {
          this.emptyEl.textContent = this.t('gantt.empty')
        }
      }
    }
    if (this.tbody) this.tbody.style.visibility = isEmpty ? 'hidden' : ''
    const sideHead = this.shadow.querySelector('.side-head')
    if (sideHead) sideHead.setAttribute('aria-label', this.t('gantt.listLabel'))
    this.renderHeader()
    this.renderWindow()
    this.renderToday()
  }

  /** 双层刻度表头（上层主刻度相邻同标签合并 + 下层辅刻度逐格） */
  private renderHeader(): void {
    const major = this.shadow.querySelector('.head-major')
    const minor = this.shadow.querySelector('.head-minor')
    if (!major || !minor) return
    const colW = this.colW()
    major.innerHTML = ''
    minor.innerHTML = ''
    const frag1 = document.createDocumentFragment()
    const frag2 = document.createDocumentFragment()
    let i = 0
    while (i < this.units.length) {
      let j = i
      while (j + 1 < this.units.length && this.units[j + 1]!.major === this.units[i]!.major) j++
      const cell = document.createElement('div')
      cell.className = 'unit'
      cell.textContent = this.units[i]!.major
      cell.style.left = `${this.mirrorX(i * colW)}px`
      cell.style.width = `${(j - i + 1) * colW}px`
      frag1.appendChild(cell)
      i = j + 1
    }
    for (let k = 0; k < this.units.length; k++) {
      const cell = document.createElement('div')
      cell.className = 'unit'
      cell.textContent = this.units[k]!.minor
      cell.style.left = `${this.mirrorX(k * colW)}px`
      cell.style.width = `${colW}px`
      frag2.appendChild(cell)
    }
    major.appendChild(frag1)
    minor.appendChild(frag2)
  }

  /** 虚拟窗口：只渲染可视行（+buffer）——名称列、任务条、依赖连线、背景列全部窗口化 */
  private renderWindow(): void {
    if (!this.tbody || !this.innerEl) return
    const rowH = this.rowHeight()
    const count = this.rows.length
    const win = computeVirtualWindow(this.tbody.scrollTop, this.viewportH(), rowH, count, 6)
    this.winStart = win.start
    this.winEnd = win.end
    this.renderSideRows()
    this.renderBars()
    this.renderGrid()
    this.renderLinks()
    this.renderToday()
  }

  private viewportH(): number {
    // happy-dom 无布局：clientHeight 为 0 时回落 height 属性值
    return this.tbody && this.tbody.clientHeight > 10 ? this.tbody.clientHeight : this.heightPx()
  }

  /** 左列名称树（窗口行） */
  private renderSideRows(): void {
    const container = this.sideRows
    if (!container) return
    container.innerHTML = ''
    const rowH = this.rowHeight()
    const expanded = this.currentExpandedSet()
    const frag = document.createDocumentFragment()
    for (let i = this.winStart; i < this.winEnd; i++) {
      const row = this.rows[i]!
      const el = document.createElement('div')
      el.className = 'row-name'
      el.dataset.key = row.task.id
      el.setAttribute('role', 'treeitem')
      el.setAttribute('aria-level', String(row.depth + 1))
      el.style.top = `${i * rowH}px`
      el.style.setProperty('--indent', `${8 + row.depth * 16}px`)
      el.setAttribute('part', 'row-name')
      if (row.hasChildren) {
        const expandedNow = expanded.has(row.task.id)
        const toggle = document.createElement('button')
        toggle.type = 'button'
        toggle.className = 'toggle'
        toggle.setAttribute('aria-expanded', String(expandedNow))
        toggle.setAttribute('aria-label', this.t(expandedNow ? 'gantt.collapse' : 'gantt.expand'))
        toggle.textContent = expandedNow ? '−' : '+'
        toggle.addEventListener('click', (e) => {
          e.stopPropagation()
          this.toggleExpand(row.task.id)
        })
        el.appendChild(toggle)
      }
      const name = document.createElement('span')
      name.className = 'name'
      name.textContent = row.task.name
      el.appendChild(name)
      frag.appendChild(el)
    }
    container.appendChild(frag)
  }

  /** 任务条层（窗口行）：task / milestone / summary 三形态 + 手柄 + 标签 + task-render 通道 */
  private renderBars(): void {
    const container = this.barsEl
    if (!container) return
    container.innerHTML = ''
    const rowH = this.rowHeight()
    const colW = this.colW()
    const rtl = isRtl(this)
    const tplTask = this.querySelector('template[slot="task"]')
    const roDates = this.datesReadonly()
    const roProgress = this.progressReadonly()
    const frag = document.createDocumentFragment()
    for (let i = this.winStart; i < this.winEnd; i++) {
      const row = this.rows[i]!
      const disabled = row.task.disabled === true
      const bar = document.createElement('div')
      bar.className = 'bar'
      bar.dataset.id = row.task.id
      bar.setAttribute('part', 'bar')
      bar.style.top = `${i * rowH + (rowH - (row.isSummary ? 8 : 22)) / 2}px`
      if (row.task.color) bar.style.setProperty('--oas-gantt-bar-color', row.task.color)
      if (disabled) bar.setAttribute('disabled', '')

      if (row.isMilestone) {
        bar.classList.add('milestone')
        const center = this.mirrorX(this.xOf(row.startMs) + colW / 2)
        bar.style.left = `${center - 8}px`
        bar.style.width = '16px'
        const dia = document.createElement('span')
        dia.className = 'dia'
        dia.style.left = '50%'
        bar.appendChild(dia)
        bar.setAttribute('role', 'button')
        bar.tabIndex = 0
        bar.setAttribute(
          'aria-label',
          this.t('gantt.milestoneAria', { name: row.task.name, date: this.fmtDay(row.startMs) }),
        )
      } else {
        const x1 = this.xOf(row.startMs)
        const x2 = this.xOf(row.endMs)
        const w = Math.max(x2 - x1, 2)
        bar.style.left = `${this.mirrorX(x1) - (rtl ? w : 0)}px`
        bar.style.width = `${w}px`
        if (row.isSummary) {
          bar.classList.add('summary')
        } else {
          bar.classList.add(`label-${this.labelPosition()}`)
          bar.setAttribute('role', 'button')
          bar.tabIndex = 0
          bar.setAttribute(
            'aria-label',
            this.t('gantt.taskAria', {
              name: row.task.name,
              start: this.fmtDay(row.startMs),
              end: this.fmtDay(row.endMs - 1),
              progress: row.progress,
            }),
          )
          const prog = document.createElement('span')
          prog.className = 'bar-progress'
          prog.style.width = `${row.progress}%`
          bar.appendChild(prog)
          const label = document.createElement('span')
          label.className = 'bar-label'
          if (tplTask instanceof HTMLTemplateElement) {
            label.appendChild(tplTask.content.cloneNode(true))
            const bound = label.querySelector<HTMLElement>('[data-task-name]')
            if (bound) bound.textContent = row.task.name
          } else {
            label.textContent = row.task.name
          }
          bar.appendChild(label)
          // 手柄（只读/禁用态不出手柄，视觉即语义）
          if (!roDates && !disabled) {
            const hs = document.createElement('span')
            hs.className = 'handle handle-start'
            bar.appendChild(hs)
            const he = document.createElement('span')
            he.className = 'handle handle-end'
            bar.appendChild(he)
          }
          if (!roProgress && !disabled && row.task.end) {
            const ph = document.createElement('span')
            ph.className = 'progress-handle'
            ph.style.insetInlineStart = `${row.progress}%`
            bar.appendChild(ph)
          }
        }
      }

      this.bindBar(bar, row)
      frag.appendChild(bar)
      this.emit('task-render', { task: this.taskSnapshot(row.task), element: bar } satisfies GanttTaskRenderDetail)
    }
    container.appendChild(frag)
  }

  private fmtDay(ms: number): string {
    return toISODate(new Date(ms))
  }

  private taskSnapshot(t: TG): GanttTask {
    const copy: GanttTask = { ...t }
    if (copy.dependencies) copy.dependencies = copy.dependencies.map((d) => ({ ...d }))
    delete copy.children
    return copy
  }

  private bindBar(bar: HTMLElement, row: GanttRow): void {
    bar.addEventListener('click', () => {
      this.emit('task-click', { id: row.task.id, task: this.taskSnapshot(row.task) } satisfies GanttTaskClickDetail)
    })
    bar.addEventListener('dblclick', () => {
      this.emit('task-dblclick', { id: row.task.id, task: this.taskSnapshot(row.task) } satisfies GanttTaskClickDetail)
    })
    bar.addEventListener('pointerdown', (e) => this.onBarPointerDown(e as PointerEvent, row, bar))
    bar.addEventListener('keydown', (e) => this.onBarKeyDown(e as KeyboardEvent, row))
    bar.addEventListener('mouseenter', () => this.showTooltip(row, bar))
    bar.addEventListener('mouseleave', () => this.hideTooltip())
  }

  // ===== 拖拽三件套（改期 / 拉伸 / 进度）：pointer 序列，收口（pointerup）一次性写回 + 派发 =====
  //
  // move/up/cancel 统一挂 document（冒泡终点）：setPointerCapture 在部分引擎对合成指针不生效
  // （实测 Firefox），capture 失败后拖出条元素的指针事件不再经过条本身——document 层监听在
  // 两个引擎都是可靠路径；capture 仅保留为指针快速移出窗口时的视觉辅助，不作事件依赖。

  private docPointerMove = (e: PointerEvent): void => {
    if (this.dragCtx) this.onBarPointerMove(e)
  }
  private docPointerUp = (e: PointerEvent): void => {
    if (!this.dragCtx) return
    this.unbindDocDrag()
    this.onBarPointerUp(e)
  }
  private docPointerCancel = (): void => {
    if (!this.dragCtx) return
    this.unbindDocDrag()
    this.cancelDrag()
  }

  private bindDocDrag(): void {
    document.addEventListener('pointermove', this.docPointerMove)
    document.addEventListener('pointerup', this.docPointerUp)
    document.addEventListener('pointercancel', this.docPointerCancel)
  }

  private unbindDocDrag(): void {
    document.removeEventListener('pointermove', this.docPointerMove)
    document.removeEventListener('pointerup', this.docPointerUp)
    document.removeEventListener('pointercancel', this.docPointerCancel)
  }

  private onBarPointerDown(e: PointerEvent, row: GanttRow, bar: HTMLElement): void {
    if (e.button !== 0 || this.dragCtx) return
    const target = e.target as HTMLElement
    let mode: DragMode = 'move'
    if (target.classList.contains('handle-start')) mode = 'resize-start'
    else if (target.classList.contains('handle-end')) mode = 'resize-end'
    else if (target.classList.contains('progress-handle')) mode = 'progress'
    else if (row.isSummary) return // 摘要条不可拖（时间派生自子级）
    if (row.task.disabled === true) return
    if (mode !== 'progress' && this.datesReadonly()) return
    if (mode === 'progress' && this.progressReadonly()) return
    this.dragCtx = {
      id: row.task.id,
      mode,
      startX: e.clientX,
      origStartMs: row.startMs,
      origEndMs: row.endMs,
      origProgress: row.progress,
      datetime: row.task.start.length > 10,
      bar,
    }
    try {
      bar.setPointerCapture(e.pointerId)
    } catch {
      /* 环境不支持 capture：事件流走 document 层兜底路径 */
    }
    this.bindDocDrag()
  }

  private onBarPointerMove(e: PointerEvent): void {
    const ctx = this.dragCtx
    if (!ctx) return
    const colW = this.colW()
    const rtl = isRtl(this)
    let dx = e.clientX - ctx.startX
    if (rtl) dx = -dx
    if (ctx.mode === 'progress') {
      const barW = Math.max(this.xOf(ctx.origEndMs) - this.xOf(ctx.origStartMs), 1)
      const next = Math.min(100, Math.max(0, ctx.origProgress + (dx / barW) * 100))
      ctx.newProgress = Math.round(next)
      const fill = ctx.bar.querySelector<HTMLElement>('.bar-progress')
      const handle = ctx.bar.querySelector<HTMLElement>('.progress-handle')
      if (fill) fill.style.width = `${ctx.newProgress}%`
      if (handle) handle.style.insetInlineStart = `${ctx.newProgress}%`
      return
    }
    const shiftUnits = this.snapOn() ? Math.round(dx / colW) : dx / colW
    let newStartMs: number
    let newEndMs: number
    if (this.snapOn()) {
      // 整格平移：日历安全（month/quarter/year 不产生月末幻影日期）
      newStartMs = this.addUnitsMs(ctx.origStartMs, Math.round(shiftUnits))
      newEndMs = this.addUnitsMs(ctx.origEndMs, Math.round(shiftUnits))
      if (ctx.mode === 'move') {
        const dur = ctx.origEndMs - ctx.origStartMs
        newEndMs = newStartMs + dur
      } else if (ctx.mode === 'resize-start') {
        newEndMs = ctx.origEndMs
      } else {
        newStartMs = ctx.origStartMs
      }
    } else {
      const delta = shiftUnits * this.avgUnitMs()
      newStartMs = ctx.origStartMs + delta
      newEndMs = ctx.origEndMs + delta
      if (ctx.mode === 'resize-start') newEndMs = ctx.origEndMs
      if (ctx.mode === 'resize-end') newStartMs = ctx.origStartMs
    }
    const minSpan = this.snapOn() ? this.addUnitsMs(ctx.origStartMs, 1) - ctx.origStartMs : this.avgUnitMs()
    if (ctx.mode === 'resize-start' && newStartMs > ctx.origEndMs - minSpan) newStartMs = ctx.origEndMs - minSpan
    if (ctx.mode === 'resize-end' && newEndMs < ctx.origStartMs + minSpan) newEndMs = ctx.origStartMs + minSpan
    ctx.newStartMs = newStartMs
    ctx.newEndMs = newEndMs
    // 视觉更新（不重建 DOM）
    if (ctx.mode === 'move' || ctx.mode === 'resize-start') {
      if (ctx.bar.classList.contains('milestone')) {
        const center = this.mirrorX(this.xOf(newStartMs) + colW / 2)
        ctx.bar.style.left = `${center - 8}px`
      } else {
        const endRef = ctx.mode === 'move' ? newEndMs : ctx.origEndMs
        const x1 = this.xOf(newStartMs)
        const x2 = this.xOf(endRef)
        const w = Math.max(x2 - x1, 2)
        ctx.bar.style.left = `${this.mirrorX(x1) - (rtl ? w : 0)}px`
        if (ctx.mode === 'resize-start') ctx.bar.style.width = `${w}px`
      }
    }
    if (ctx.mode === 'resize-end') {
      const x1 = this.xOf(ctx.origStartMs)
      const x2 = this.xOf(newEndMs)
      ctx.bar.style.width = `${Math.max(x2 - x1, 2)}px`
    }
  }

  /** 按 scale 日历步进 n 个单位（snap 对齐用） */
  private addUnitsMs(ms: number, n: number): number {
    return OASGantt.addUnits(new Date(ms), this.scale(), n).getTime()
  }

  private avgUnitMs(): number {
    if (this.units.length === 0) return DAY_MS
    return (this.units[this.units.length - 1]!.endMs - this.units[0]!.startMs) / this.units.length
  }

  private onBarPointerUp(_e: PointerEvent): void {
    const ctx = this.dragCtx
    this.dragCtx = null
    if (!ctx) return
    if (ctx.mode === 'progress') {
      const next = ctx.newProgress
      if (next === undefined || next === ctx.origProgress) return
      this.commitProgress(ctx.id, next)
      return
    }
    const newStart = ctx.newStartMs ?? ctx.origStartMs
    const newEnd = ctx.newEndMs ?? ctx.origEndMs
    if (newStart === ctx.origStartMs && newEnd === ctx.origEndMs) return
    this.commitDates(ctx.id, newStart, newEnd, ctx.datetime, ctx.origStartMs, ctx.origEndMs)
  }

  /** 取消拖拽：视觉回滚、零事件零写回、无孤儿 ctx */
  private cancelDrag(): void {
    const ctx = this.dragCtx
    this.dragCtx = null
    this.unbindDocDrag()
    if (!ctx) return
    if (ctx.mode === 'progress') {
      const fill = ctx.bar.querySelector<HTMLElement>('.bar-progress')
      const handle = ctx.bar.querySelector<HTMLElement>('.progress-handle')
      if (fill) fill.style.width = `${ctx.origProgress}%`
      if (handle) handle.style.insetInlineStart = `${ctx.origProgress}%`
      return
    }
    if (ctx.bar.classList.contains('milestone')) {
      const center = this.mirrorX(this.xOf(ctx.origStartMs) + this.colW() / 2)
      ctx.bar.style.left = `${center - 8}px`
      return
    }
    const x1 = this.xOf(ctx.origStartMs)
    const x2 = this.xOf(ctx.origEndMs)
    const w = Math.max(x2 - x1, 2)
    ctx.bar.style.left = `${this.mirrorX(x1) - (isRtl(this) ? w : 0)}px`
    ctx.bar.style.width = `${w}px`
  }

  /** 写回改期：内部更新 + 属性反射 + task-change（old/new）+ tasks-change */
  private commitDates(
    id: string,
    newStartMs: number,
    newEndMs: number,
    datetime: boolean,
    oldStartMs: number,
    oldEndMs: number,
  ): void {
    const task = this._tasks.find((t) => t.id === id)
    if (!task) return
    const start = this.fmtIso(newStartMs, datetime)
    // 里程碑只写 start（end 保持缺省，不把 milestone 改写成 task）；
    // end 数据串按含端语义（endMs 为区间右缘 exclusive，日精度 -1ms 回到含端日）
    const endStr = task.end ? this.fmtEnd(newEndMs, datetime) : start
    const patch: Partial<GanttTask> = task.end ? { start, end: endStr } : { start }
    if (!this.applyPatch(id, patch)) return
    this.emit('task-change', {
      id,
      task: this.taskSnapshot(this._tasks.find((t) => t.id === id)!),
      oldStart: this.fmtIso(oldStartMs, datetime),
      oldEnd: task.end ? this.fmtEnd(oldEndMs, datetime) : start,
      start,
      end: endStr,
    } satisfies GanttTaskChangeDetail)
  }

  private commitProgress(id: string, progress: number): void {
    if (!this.applyPatch(id, { progress })) return
    this.emit('progress-change', {
      id,
      task: this.taskSnapshot(this._tasks.find((t) => t.id === id)!),
      progress,
    } satisfies GanttProgressChangeDetail)
  }

  /** 内部写回单条 + 属性反射 + 重渲染 + tasks-change（收口路径唯一出口） */
  private applyPatch(id: string, patch: Partial<GanttTask>): boolean {
    const idx = this._tasks.findIndex((t) => t.id === id)
    if (idx < 0) return false
    this._tasks[idx] = { ...this._tasks[idx]!, ...patch, id }
    this.syncTasksAttr()
    this.update()
    this.emitTasksChange()
    return true
  }

  /** 时间戳 → 数据串：非整日时刻（非 snap 半格位移）强制带时间，防数据与视觉脱节 */
  private fmtIso(ms: number, datetimeHint: boolean): string {
    const d = new Date(ms)
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
    return hasTime || datetimeHint ? formatToken(d, 'yyyy-MM-dd HH:mm', this.effectiveLocale()) : toISODate(d)
  }

  /** 区间右缘（exclusive）→ 结束数据串：日精度 -1ms 回含端日；时间精度按原时刻 */
  private fmtEnd(ms: number, datetimeHint: boolean): string {
    if (datetimeHint) return formatToken(new Date(ms), 'yyyy-MM-dd HH:mm', this.effectiveLocale())
    return toISODate(new Date(ms - 1))
  }

  private onBarKeyDown(e: KeyboardEvent, row: GanttRow): void {
    if (e.key === 'Escape' && this.dragCtx) {
      e.stopPropagation()
      this.cancelDrag()
      return
    }
    if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || !e.shiftKey) return
    if (row.task.disabled === true || row.isSummary || this.datesReadonly()) return
    e.preventDefault()
    const dir = (e.key === 'ArrowRight' ? 1 : -1) * (isRtl(this) ? -1 : 1)
    const datetime = row.task.start.length > 10
    this.commitDates(
      row.task.id,
      this.addUnitsMs(row.startMs, dir),
      this.addUnitsMs(row.endMs, dir),
      datetime,
      row.startMs,
      row.endMs,
    )
  }

  // ===== 依赖连线（SVG 单画布覆盖层，窗口行内绘制）=====

  private renderLinks(): void {
    const svg = this.linksEl
    if (!svg) return
    const totalH = this.rows.length * this.rowHeight()
    svg.setAttribute('width', String(this.canvasW))
    svg.setAttribute('height', String(totalH))
    svg.innerHTML =
      '<defs><marker id="oas-gantt-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z"/></marker></defs>'
    if (this.rows.length === 0) return
    const rowH = this.rowHeight()
    const rowIdx = new Map<string, number>()
    for (let i = this.winStart; i < this.winEnd; i++) rowIdx.set(this.rows[i]!.task.id, i)
    const frag = document.createDocumentFragment()
    const ns = 'http://www.w3.org/2000/svg'
    for (let i = this.winStart; i < this.winEnd; i++) {
      const t = this.rows[i]!
      for (const dep of t.task.dependencies ?? []) {
        const fromIdx = rowIdx.get(dep.id)
        const toIdx = rowIdx.get(t.task.id)
        if (fromIdx === undefined || toIdx === undefined) continue
        const from = this.rows[fromIdx]!
        const to = this.rows[toIdx]!
        const type = dep.type ?? 'fs'
        // 锚点：fs 前任务完成点→后任务开始点；ss 开始→开始；ff 完成→完成；sf 开始→完成
        const fromX = type === 'fs' || type === 'ff' ? this.xOf(from.endMs) : this.xOf(from.startMs)
        const toX = type === 'fs' || type === 'ss' ? this.xOf(to.startMs) : this.xOf(to.endMs)
        const y1 = fromIdx * rowH + rowH / 2
        const y2 = toIdx * rowH + rowH / 2
        const x1 = this.mirrorX(fromX)
        const x2 = this.mirrorX(toX)
        // 折线：水平出 14px → 垂直 → 水平进（终点带箭头）；过近时绕外侧
        const out = x2 >= x1 + 28 ? x2 - 14 : Math.max(x1, x2) + 14
        const path = document.createElementNS(ns, 'path')
        path.setAttribute('d', `M ${x1} ${y1} L ${out} ${y1} L ${out} ${y2} L ${x2} ${y2}`)
        path.setAttribute('data-from', t.task.id)
        path.setAttribute('data-to', dep.id)
        path.setAttribute('data-type', type)
        path.setAttribute('marker-end', 'url(#oas-gantt-arrow)')
        frag.appendChild(path)
      }
    }
    svg.appendChild(frag)
  }

  /** 周末/假日列高亮（day/hour 档；week+ 档跨度大不高亮） */
  private renderGrid(): void {
    const grid = this.gridEl
    if (!grid) return
    grid.innerHTML = ''
    const scale = this.scale()
    if (scale !== 'day' && scale !== 'hour') return
    if (this.rows.length === 0) return
    const colW = this.colW()
    const totalH = this.rows.length * this.rowHeight()
    const holidays = this.holidaySet()
    const weekends = this.weekendsOn()
    const frag = document.createDocumentFragment()
    for (const u of this.units) {
      const d = new Date(u.startMs)
      const iso = toISODate(d)
      const isHoliday = holidays.has(iso)
      const isWeekend = weekends && (d.getDay() === 0 || d.getDay() === 6)
      if (!isHoliday && !isWeekend) continue
      const cell = document.createElement('div')
      cell.className = `cell${isHoliday ? ' holiday' : ' weekend'}`
      cell.style.left = `${this.mirrorX(this.xOf(u.startMs))}px`
      cell.style.width = `${colW}px`
      cell.style.height = `${totalH}px`
      frag.appendChild(cell)
    }
    grid.appendChild(frag)
  }

  /** 今日线（show-today 默认开；today 在范围内才渲染；装饰层 aria-hidden） */
  private renderToday(): void {
    const line = this.todayEl
    if (!line) return
    const todayMs = startOfDay(new Date()).getTime()
    const inRange =
      this.units.length > 0 && todayMs >= this.units[0]!.startMs && todayMs < this.units[this.units.length - 1]!.endMs
    if (!this.showToday() || !inRange || this.rows.length === 0) {
      line.hidden = true
      return
    }
    line.hidden = false
    line.style.left = `${this.mirrorX(this.xOf(todayMs))}px`
    line.style.height = `${this.rows.length * this.rowHeight()}px`
    line.setAttribute('title', this.t('gantt.today'))
  }

  // ===== tooltip（单例浮层：名称 + 区间 + 进度；template[slot=tooltip] 覆盖内容）=====

  private showTooltip(row: GanttRow, bar: HTMLElement): void {
    const tip = this.tooltipEl
    if (!tip) return
    const tpl = this.querySelector('template[slot="tooltip"]')
    if (tpl instanceof HTMLTemplateElement) {
      tip.innerHTML = ''
      tip.appendChild(tpl.content.cloneNode(true))
      const nameEl = tip.querySelector<HTMLElement>('[data-task-name]')
      if (nameEl) nameEl.textContent = row.task.name
      const rangeEl = tip.querySelector<HTMLElement>('[data-task-range]')
      if (rangeEl) rangeEl.textContent = this.rangeText(row)
      const progEl = tip.querySelector<HTMLElement>('[data-task-progress]')
      if (progEl) progEl.textContent = this.t('gantt.tooltipProgress', { progress: row.progress })
    } else {
      tip.innerHTML = ''
      const name = document.createElement('div')
      name.className = 'tip-name'
      name.textContent = row.task.name
      tip.appendChild(name)
      const range = document.createElement('div')
      range.className = 'tip-line'
      range.textContent = row.isMilestone
        ? `${this.t('gantt.milestone')} · ${this.fmtDay(row.startMs)}`
        : this.rangeText(row)
      tip.appendChild(range)
      if (!row.isMilestone && row.task.end) {
        const prog = document.createElement('div')
        prog.className = 'tip-line'
        prog.textContent = this.t('gantt.tooltipProgress', { progress: row.progress })
        tip.appendChild(prog)
      }
    }
    tip.hidden = false
    // 定位：条上方居中（宿主视口内夹取）；无布局环境（rect 全 0）时回落原点不炸
    const hostRect = this.getBoundingClientRect()
    const barRect = bar.getBoundingClientRect()
    const tipW = tip.offsetWidth || 180
    const tipH = tip.offsetHeight || 56
    let left = barRect.left - hostRect.left + barRect.width / 2 - tipW / 2
    let top = barRect.top - hostRect.top - tipH - 6
    if (top < 0) top = barRect.top - hostRect.top + barRect.height + 6
    left = Math.max(4, Math.min(left, Math.max(hostRect.width - tipW - 4, 4)))
    tip.style.left = `${Math.max(0, left)}px`
    tip.style.top = `${Math.max(0, top)}px`
  }

  private rangeText(row: GanttRow): string {
    return this.t('gantt.tooltipRange', { start: this.fmtDay(row.startMs), end: this.fmtDay(row.endMs - 1) })
  }

  private hideTooltip(): void {
    if (this.tooltipEl) this.tooltipEl.hidden = true
  }

  override disconnectedCallback(): void {
    this.dragCtx = null
    this.unbindDocDrag()
    super.disconnectedCallback()
  }
}
