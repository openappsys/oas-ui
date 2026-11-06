/**
 * oas-gantt 类方法抽出的无状态纯函数（判断层拆分，零行为变更）：
 * 与实例无关（零 this 依赖；实例状态由 oas-gantt.ts 的薄转发方法显式传参）。
 * 拆分边界：重拖拽 / 渲染 / 键盘 / tooltip / i18n 等强实例耦合方法仍留在 oas-gantt.ts。
 * 类型见 gantt-types.ts，清洗与日期数学见 gantt-utils.ts，样式见 gantt-style.ts。
 */
import { formatToken, isoWeek, toISODate } from '../../form/calendar/date-grid.js'
import type { ResourcePool } from '../resource/pool/index.js'
import type { ResourceLoadResult } from '../../shared/resource-load.js'
import { DAY_MS, addLocalDays, ganttRenderDiag, intersectShiftWindows, parseTaskDate } from './gantt-utils.js'
import type {
  DatedConstraint,
  GanttDependency,
  GanttResource,
  GanttRow,
  GanttScale,
  GanttTask,
  TG,
} from './gantt-types.js'

// ===== 时间轴：步进与刻度标签 =====

/** 按 scale 步进 n 个单位（month/quarter/year 走日历运算防月末溢出；day/week 走日历日防 DST 漂移；
 *  hour 按绝对小时——跨跳变时本地标签自然跳过一个/重复一小时，是时间轴的正确语义） */
export function addUnits(d: Date, scale: GanttScale, n: number): Date {
  if (scale === 'hour') return new Date(d.getTime() + n * 3_600_000)
  if (scale === 'day') return new Date(addLocalDays(d.getTime(), n))
  if (scale === 'week') return new Date(addLocalDays(d.getTime(), n * 7))
  const months = n * (scale === 'month' ? 1 : scale === 'quarter' ? 3 : 12)
  return new Date(d.getFullYear(), d.getMonth() + months, 1)
}

export function majorLabel(d: Date, scale: GanttScale, locale: string): string {
  if (scale === 'hour') return formatToken(d, 'MM-dd', locale)
  if (scale === 'day' || scale === 'week' || scale === 'month') return formatToken(d, 'yyyy-MM', locale)
  if (scale === 'quarter') return formatToken(d, 'yyyy', locale)
  return `${Math.floor(d.getFullYear() / 10) * 10}`
}

export function minorLabel(d: Date, scale: GanttScale, locale: string): string {
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

// ===== 行树分组（展示层克隆） =====

/** 按 project 把根任务收进合成项目根（仅展示层克隆，不改原任务） */
export function groupTasksByProject(tasks: TG[]): TG[] {
  const groups = new Map<string, TG[]>()
  const order: string[] = []
  for (const t of tasks) {
    if (t.parent || !t.project) continue
    const list = groups.get(t.project)
    if (list) list.push(t)
    else {
      groups.set(t.project, [t])
      order.push(t.project)
    }
  }
  if (order.length === 0) return tasks
  const used = new Set(tasks.map((t) => t.id))
  const groupRoots = new Map<string, TG>()
  for (const project of order) {
    let id = `__oas_project__:${project}`
    let n = 2
    while (used.has(id)) id = `__oas_project__:${project}#${n++}`
    used.add(id)
    const members = groups.get(project)!
    let start = members[0]!.start
    let end = members[0]!.end ?? members[0]!.start
    for (const t of members) {
      if (t.start < start) start = t.start
      const e = t.end ?? t.start
      if (e > end) end = e
    }
    groupRoots.set(project, { id, name: project, start, end, type: 'summary', project } as TG)
  }
  const out: TG[] = []
  const emitted = new Set<string>()
  for (const t of tasks) {
    if (!t.parent && t.project) {
      if (emitted.has(t.project)) continue
      emitted.add(t.project)
      out.push(groupRoots.get(t.project)!)
      for (const member of groups.get(t.project)!) {
        out.push({ ...member, parent: groupRoots.get(t.project)!.id, children: undefined })
      }
    } else {
      out.push(t)
    }
  }
  return out
}

/** 按首个分配资源把根任务收进合成资源泳道（仅展示层克隆，不改原任务；未分配任务保持顶层） */
export function groupTasksByResource(tasks: TG[], calendars: Map<string, GanttResource>): TG[] {
  const groups = new Map<string, TG[]>()
  const order: string[] = []
  for (const t of tasks) {
    if (t.parent) continue
    const resource = t.resources?.[0]
    if (!resource) continue
    const list = groups.get(resource)
    if (list) list.push(t)
    else {
      groups.set(resource, [t])
      order.push(resource)
    }
  }
  if (order.length === 0) return tasks
  const used = new Set(tasks.map((t) => t.id))
  const groupRoots = new Map<string, TG>()
  for (const resource of order) {
    let id = `__oas_resource__:${resource}`
    let n = 2
    while (used.has(id)) id = `__oas_resource__:${resource}#${n++}`
    used.add(id)
    const members = groups.get(resource)!
    let start = members[0]!.start
    let end = members[0]!.end ?? members[0]!.start
    for (const t of members) {
      if (t.start < start) start = t.start
      const e = t.end ?? t.start
      if (e > end) end = e
    }
    groupRoots.set(resource, {
      id,
      name: calendars.get(resource)?.name ?? resource,
      start,
      end,
      type: 'summary',
    } as TG)
  }
  const out: TG[] = []
  const grouped = new Set([...groups.values()].flat().map((t) => t.id))
  for (const t of tasks) {
    if (grouped.has(t.id)) {
      const root = groupRoots.get(t.resources![0]!)
      if (root && !out.includes(root)) {
        out.push(root)
        for (const member of groups.get(t.resources![0]!)!) {
          out.push({ ...member, parent: root.id, children: undefined })
        }
      }
      continue
    }
    out.push(t)
  }
  return out
}

// ===== 泳道内嵌负荷缩略（group-by-resource 泳道摘要行） =====

/** 泳道合成根 id 前缀（groupTasksByResource 产物；与 __oas_project__ 同款命名约定） */
const LANE_ID_PREFIX = '__oas_resource__:'

/** 泳道负荷缩略缺省格数：概览条降采样目标（DOM 有界：泳道数 × 格数，滚动帧重建不放大） */
export const LANE_LOAD_CELLS = 24

/**
 * 泳道合成根 id → 资源 id（纯函数）：`__oas_resource__:ra` → `ra`；同名冲突的避让后缀
 * `__oas_resource__:ra#2` → `ra`；非泳道合成根返回 null（普通任务 / 项目合成根等）。
 */
export function laneResourceId(id: string): string | null {
  if (typeof id !== 'string' || !id.startsWith(LANE_ID_PREFIX)) return null
  const rest = id.slice(LANE_ID_PREFIX.length)
  const hash = rest.lastIndexOf('#')
  if (hash > 0) return rest.slice(0, hash)
  return rest
}

/**
 * 泳道负荷缩略降采样（纯函数）：把负荷桶序列压缩为固定格数的概览数据——每格取覆盖桶的
 * **最大负荷%**（峰值保持：超配信息不因缩略丢失），bucketDays ≤ 0 的桶不参与（与负荷面板
 * 口径一致）。输出与入参格数等长（几何稳定：空格 pct 0 不渲染但占位），pct 已取整、over
 * = 原始 pct > 100（取整前判定，99.5% 不误标超配）。
 */
export function laneLoadCells(
  buckets: number[],
  bucketDays: number[],
  cells: number = LANE_LOAD_CELLS,
): Array<{ pct: number; over: boolean }> {
  const n = buckets.length
  if (n === 0 || cells <= 0) return []
  const out: Array<{ pct: number; over: boolean }> = []
  for (let c = 0; c < cells; c++) {
    const lo = Math.floor((c * n) / cells)
    const hi = Math.min(n, Math.max(lo + 1, Math.floor(((c + 1) * n) / cells)))
    let best = 0
    for (let i = lo; i < hi; i++) {
      const days = bucketDays[i] ?? 0
      if (days <= 0) continue
      const pct = ((buckets[i] ?? 0) / days) * 100
      if (pct > best) best = pct
    }
    out.push({ pct: Math.round(best), over: best > 100 })
  }
  return out
}

// ===== 选中态写入（行名 / 任务条） =====

/**
 * 行名选中态写入（**建行与局部 patch 共用**，两条路径产物恒一致）：class `.selected` +
 * `aria-selected`（role=treeitem 支持该属性）+ `data-selected`（宿主可观测的选中标记）。
 * 值相同不写（局部 patch 每帧要对窗口内全部行求值，无谓的 setAttribute 属白工）。
 */
export function writeRowSelectionState(el: HTMLElement, on: boolean): void {
  if (el.classList.contains('selected') !== on) el.classList.toggle('selected', on)
  const v = String(on)
  if (el.getAttribute('aria-selected') !== v) el.setAttribute('aria-selected', v)
  if (el.getAttribute('data-selected') !== v) el.setAttribute('data-selected', v)
}

/**
 * 任务条选中态写入（建条与局部 patch 共用）。条 `role=button`，`aria-selected` 对 button
 * 非合法属性（会被 ARIA 校验判错）→ 只写 class + `data-selected`，选中语义由行名（treeitem）
 * 的 aria-selected 承载。
 */
export function writeBarSelectionState(el: HTMLElement, on: boolean): void {
  if (el.classList.contains('selected') !== on) el.classList.toggle('selected', on)
  const v = String(on)
  if (el.getAttribute('data-selected') !== v) el.setAttribute('data-selected', v)
}

// ===== 交互命中与指针几何 =====

/** 命中交互元素（行名/任务条/连线点/折叠钮/重命名框/新建钮）时忽略空白双击 */
export function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(
      '.row-name, .bar, .link-dot, .link-hit, .baseline, .toggle, .rename-input, .row-add, input, select, textarea, button, [contenteditable], [data-no-row-drag]',
    ) !== null
  )
}

/** pointerup 落点：事件未带坐标（合成事件）时回落最后一次 move 的坐标 */
export function upPoint(e: PointerEvent, fx: number, fy: number): { x: number; y: number } {
  if (e.clientX === 0 && e.clientY === 0 && (fx !== 0 || fy !== 0)) return { x: fx, y: fy }
  return { x: e.clientX, y: e.clientY }
}

/** 端点组合 → 依赖类型（后继 = 命中任务，前置 = 拖拽起点任务） */
export function linkType(src: 'start' | 'end', tgt: 'start' | 'end'): GanttDependency['type'] {
  if (src === 'end' && tgt === 'start') return 'fs'
  if (src === 'start' && tgt === 'start') return 'ss'
  if (src === 'end' && tgt === 'end') return 'ff'
  return 'sf'
}

// ===== 事件快照与格式化 =====

export function taskSnapshot(t: TG): GanttTask {
  const copy: GanttTask = { ...t }
  if (copy.dependencies) copy.dependencies = copy.dependencies.map((d) => ({ ...d }))
  if (copy.baseline) copy.baseline = { ...copy.baseline }
  if (copy.baselines) copy.baselines = copy.baselines.map((b) => ({ ...b }))
  delete copy.children
  return copy
}

export function fmtDay(ms: number): string {
  return toISODate(new Date(ms))
}

/** 时间戳 → 数据串：非整日时刻（非 snap 半格位移）强制带时间，防数据与视觉脱节 */
export function fmtIso(ms: number, datetimeHint: boolean, locale: string): string {
  const d = new Date(ms)
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
  return hasTime || datetimeHint ? formatToken(d, 'yyyy-MM-dd HH:mm', locale) : toISODate(d)
}

/** 区间右缘（exclusive）→ 结束数据串：日精度 -1ms 回含端日；时间精度按原时刻 */
export function fmtEnd(ms: number, datetimeHint: boolean, locale: string): string {
  if (datetimeHint) return formatToken(new Date(ms), 'yyyy-MM-dd HH:mm', locale)
  return toISODate(new Date(ms - 1))
}

/**
 * pool 模式 tooltip 资源行文本：任务 resources 逐 id 从传入池取名称（costRate 有限正值附
 * 「N/h」费率）；池未登记 id 忽略。纯取数不看开关、不自行取池（实例感知取池在调用侧——
 * 组件传当前生效池：宿主注入实例优先，缺省共享单例）。
 */
export function poolResourceText(t: TG, pool: ResourcePool): string {
  if (!Array.isArray(t.resources) || t.resources.length === 0) return ''
  const parts: string[] = []
  for (const rid of t.resources) {
    const item = pool.get(rid)
    if (!item) continue
    parts.push(
      typeof item.costRate === 'number' && Number.isFinite(item.costRate) && item.costRate > 0
        ? `${item.name} ${item.costRate}/h`
        : item.name,
    )
  }
  return parts.join(' · ')
}

// ===== 重排 / 依赖图（环检测 / 树结构 / 祖先判定） =====

/** 目标不得是拖拽件自身或其后代（防环；成环数据用访问集防死循环；byId 由调用方缓存传入） */
export function canReparent(dragId: string, targetId: string, byId: Map<string, TG>): boolean {
  if (dragId === targetId) return false
  const seen = new Set<string>()
  let cur = byId.get(targetId)
  while (cur && cur.parent && !seen.has(cur.id)) {
    seen.add(cur.id)
    if (cur.parent === dragId) return false
    cur = byId.get(cur.parent)
  }
  return true
}

export function isDescendantOf(node: TG, ancestorId: string, byId: Map<string, TG>): boolean {
  const seen = new Set<string>()
  let cur: TG | undefined = byId.get(node.id)
  while (cur && cur.parent && !seen.has(cur.id)) {
    seen.add(cur.id)
    if (cur.parent === ancestorId) return true
    cur = byId.get(cur.parent)
  }
  return false
}

/** 与 buildRows 同源的树结构：childMap（有效父级且本节点非断环）与 hasChildren 集 */
export function childStructure(
  tasks: TG[],
  byId: Map<string, TG>,
): { childMap: Map<string, string[]>; hasChildren: Set<string> } {
  const childMap = new Map<string, string[]>()
  const color = new Map<string, 1 | 2>()
  const broken = new Set<string>()
  for (const t of tasks) {
    if (color.has(t.id)) continue
    const stack: TG[] = []
    let cur: TG | undefined = t
    while (cur && cur.parent && byId.has(cur.parent) && !color.has(cur.id)) {
      color.set(cur.id, 1)
      stack.push(cur)
      cur = byId.get(cur.parent)
    }
    if (cur && cur.parent && byId.has(cur.parent) && color.get(cur.id) === 1) broken.add(cur.id)
    for (const n of stack) color.set(n.id, 2)
  }
  for (const t of tasks) {
    if (t.parent && byId.has(t.parent) && !broken.has(t.id)) {
      const list = childMap.get(t.parent) ?? []
      list.push(t.id)
      childMap.set(t.parent, list)
    }
  }
  return { childMap, hasChildren: new Set(childMap.keys()) }
}

/**
 * 依赖图中「处于环内」的节点集合：所在强连通分量（SCC）大小 > 1，或自身成环（自环）。
 * 实现为**迭代式 Tarjan**（显式栈；递归版在超长依赖链下会爆调用栈）。
 *
 * 用途：环内节点排程无解，只让位它们（保持现网日期），环外节点照常前推；
 * 关键路径也把环内节点排除在节点集之外——替代旧版「整图有环即整体停摆/返回空集」。
 */
export function dependencyCyclicNodes(byId: Map<string, TG>): Set<string> {
  const index = new Map<string, number>()
  const low = new Map<string, number>()
  const onStack = new Set<string>()
  const stack: string[] = []
  const cyclic = new Set<string>()
  let counter = 0
  for (const root of byId.keys()) {
    if (index.has(root)) continue
    index.set(root, counter)
    low.set(root, counter)
    counter++
    stack.push(root)
    onStack.add(root)
    const work: Array<{ id: string; i: number }> = [{ id: root, i: 0 }]
    while (work.length > 0) {
      const frame = work[work.length - 1]!
      const deps = byId.get(frame.id)?.dependencies ?? []
      if (frame.i < deps.length) {
        const depId = deps[frame.i]!.id
        frame.i++
        if (!byId.has(depId)) continue // 前置不存在 → 该边不参与（与排程同口径）
        if (depId === frame.id) {
          cyclic.add(frame.id) // 自环：自身即环内
          continue
        }
        if (!index.has(depId)) {
          index.set(depId, counter)
          low.set(depId, counter)
          counter++
          stack.push(depId)
          onStack.add(depId)
          work.push({ id: depId, i: 0 })
        } else if (onStack.has(depId)) {
          low.set(frame.id, Math.min(low.get(frame.id)!, index.get(depId)!))
        }
        continue
      }
      work.pop()
      const parent = work[work.length - 1]
      if (parent) low.set(parent.id, Math.min(low.get(parent.id)!, low.get(frame.id)!))
      if (low.get(frame.id) === index.get(frame.id)) {
        const comp: string[] = []
        for (;;) {
          const w = stack.pop()!
          onStack.delete(w)
          comp.push(w)
          if (w === frame.id) break
        }
        if (comp.length > 1) for (const c of comp) cyclic.add(c)
      }
    }
  }
  return cyclic
}

// ===== 排程几何（约束 / 起止 / 工期 / 班次窗口） =====

/**
 * 任务约束快照：mode + 约束日起点 ms + 约束日右缘 ms（fnlt 判定用；日精度 +DAY_MS 含端日）。
 * 缺省/非法（清洗层已兜底，此处再防御一次）→ null = 无约束。
 */
export function constraintOf(t: TG): { mode: DatedConstraint; ms: number; endMs: number; dateOnly: boolean } | null {
  const mode = t.constraint
  if (mode !== 'snet' && mode !== 'mso' && mode !== 'fnlt') return null
  const dateStr = typeof t.constraintDate === 'string' ? t.constraintDate.trim() : ''
  const d = parseTaskDate(dateStr)
  if (!d) return null
  const ms = d.getTime()
  const dateOnly = dateStr.length <= 10
  return { mode, ms, endMs: dateOnly ? addLocalDays(ms, 1) : ms, dateOnly }
}

/** 任务起点 ms（数据非法回 0，与 buildRows 同口径） */
export function startMsOfTask(t: TG): number {
  return parseTaskDate(t.start)?.getTime() ?? 0
}

/** 任务区间右缘 ms（exclusive）：里程碑 = 起点；日精度 end 含端 → 次日本地零点 */
export function endMsOfTask(t: TG): number {
  if (t.type === 'milestone' || !t.end) return startMsOfTask(t)
  const e = parseTaskDate(t.end)
  if (!e) return startMsOfTask(t)
  return t.end.length > 10 ? e.getTime() : addLocalDays(e.getTime(), 1)
}

/** 整日任务（start / end 均日期精度）：工期按日历日计，跨 DST 的绝对毫秒差是 23/25 小时的倍数 */
export function isWholeDayTask(t: TG): boolean {
  return typeof t.start === 'string' && t.start.length <= 10 && (t.end === undefined || t.end.length <= 10)
}

/** 按工期平移端点：整日任务按日历日（跨 DST 不漂 1 小时），时间精度按绝对毫秒 */
export function shiftByDuration(ms: number, duration: number, wholeDay: boolean): number {
  return wholeDay ? addLocalDays(ms, Math.round(duration / DAY_MS)) : ms + duration
}

/** 任务的班次窗口：所有声明 shifts 的分配资源取交集；未声明 shifts 的资源不约束 */
export function shiftWindows(
  task: GanttTask | undefined,
  calendars: Map<string, GanttResource>,
): Array<{ start: number; end: number }> | null {
  if (!task?.resources?.length) return null
  let acc: Array<{ start: number; end: number }> | null = null
  let sawShifts = false
  for (const id of task.resources) {
    const shifts = calendars.get(id)?.shifts
    if (shifts === undefined) continue
    sawShifts = true
    const windows: Array<{ start: number; end: number }> = []
    for (const shift of shifts) {
      const [sh, sm] = shift.start.split(':').map(Number)
      const [eh, em] = shift.end.split(':').map(Number)
      const start = sh! * 60 + sm!
      const end = eh! * 60 + em!
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue
      windows.push({ start, end })
    }
    windows.sort((a, b) => a.start - b.start)
    acc = acc === null ? windows : intersectShiftWindows(acc, windows)
    if (acc.length === 0) break
  }
  if (!sawShifts) return null
  return acc ?? []
}

// ===== 关键路径（CPM）与违约判定 =====

/**
 * 关键路径任务 id 集合（CPM 前后向计算，日精度）：
 * - 工期 dur = endMsOfTask − startMsOfTask（日精度 end 含端，与 buildRows 一致）；里程碑 dur=0。
 * - 前向 ES_i 取任务**当前排期**的 startMs（以现网数据为基准，不做重排）。
 * - 项目完成 projectEnd = max(endMsOfTask)（里程碑也算；摘要取自身 data 日期）。
 * - 反向：无后继任务起 LF = projectEnd，按依赖约束 + lag 反推前置 LS/LF。**按拓扑序**：
 *   节点集在**排除依赖环内节点**后为 DAG，故按逆拓扑序一趟即得精确 LF（O(V+E)，替代旧版迭代松弛）：
 *     fs: LF_pred = LS_succ − lag      ss: LF_pred = LS_succ − lag（LF_pred = LS_pred + dur_pred）
 *     ff: LF_pred = LF_succ − lag      sf: LF_pred = LS_succ − lag（LF_pred = LS_pred + dur_pred）
 * - 每个任务 LS = LF − dur、float = LS − ES；|float| < 1e-6（日精度）判为关键。
 * - 摘要（有子级，日期派生）不参与；disabled 照算（不特殊处理，仅作可视化）。
 * - 依赖环内节点不参与 CP（排程端让位后无法定义 CP 序），环外节点照常计算；全为环内 → 空集。
 * - 违约集 conflict = 负总时差 ∪ 约束违反（snet 未达约束日 / mso 未落在约束日 / fnlt 超出约束日右缘）。
 */
export function criticalPathIds(tasks: TG[]): {
  critical: Set<string>
  conflict: Set<string>
  totalFloat: Map<string, number>
  freeFloat: Map<string, number>
} {
  ganttRenderDiag.cpComputes++ // 仅内部诊断（见 ganttRenderDiag）
  const empty = {
    critical: new Set<string>(),
    conflict: new Set<string>(),
    totalFloat: new Map<string, number>(),
    freeFloat: new Map<string, number>(),
  }
  if (tasks.length === 0) return empty
  const byId = new Map<string, TG>()
  for (const t of tasks) byId.set(t.id, t)
  const { hasChildren } = childStructure(tasks, byId)
  // 环内节点让位：不进入节点集（旧版「有环即返回空集」会让环外关键链也无从高亮）
  const cyclic = dependencyCyclicNodes(byId)
  const nodes = tasks.filter((t) => !hasChildren.has(t.id) && !cyclic.has(t.id))
  if (nodes.length === 0) return empty
  const dur = new Map<string, number>()
  const es = new Map<string, number>()
  for (const t of nodes) {
    const s = startMsOfTask(t)
    es.set(t.id, s)
    dur.set(t.id, Math.max(endMsOfTask(t) - s, 0))
  }
  let projectEnd = Number.NEGATIVE_INFINITY
  // 仅按 CP 节点（叶子/里程碑，摘要已排除）取项目完成：摘要自身 data 日期可能过期，
  // 其派生日期由子级（节点）覆盖，故不参与（与渲染/排程的聚合口径一致）
  for (const t of nodes) {
    const e = endMsOfTask(t)
    if (e > projectEnd) projectEnd = e
  }
  if (!Number.isFinite(projectEnd)) projectEnd = 0
  // 后继表：predId → 引用它的依赖（succ/type/lag）；仅连接「双方均为节点」的边
  const successors = new Map<string, Array<{ succ: string; type: string; lag: number }>>()
  const indeg = new Map<string, number>()
  for (const t of nodes) indeg.set(t.id, 0)
  for (const t of nodes) {
    for (const d of t.dependencies ?? []) {
      if (!dur.has(d.id)) continue // 前置为摘要/环内/不存在/非法 → 该边不参与
      const lag = typeof d.lag === 'number' && Number.isFinite(d.lag) ? d.lag : 0
      const list = successors.get(d.id) ?? []
      list.push({ succ: t.id, type: d.type ?? 'fs', lag })
      successors.set(d.id, list)
      indeg.set(t.id, (indeg.get(t.id) ?? 0) + 1)
    }
  }
  // Kahn 拓扑序（节点集为 DAG，环内节点已排除）：入度 0 起逐层出队
  const topo: string[] = []
  const queue: string[] = []
  for (const t of nodes) if ((indeg.get(t.id) ?? 0) === 0) queue.push(t.id)
  for (let qi = 0; qi < queue.length; qi++) {
    const id = queue[qi]!
    topo.push(id)
    for (const { succ } of successors.get(id) ?? []) {
      const next = (indeg.get(succ) ?? 0) - 1
      indeg.set(succ, next)
      if (next === 0) queue.push(succ)
    }
  }
  // 防御：DAG 下 topo 应覆盖全部节点；万一有残留（理论不可达）按剩余顺序补入，保证 LF 全部有值
  if (topo.length < nodes.length) {
    const seen = new Set(topo)
    for (const t of nodes) if (!seen.has(t.id)) topo.push(t.id)
  }
  // 逆拓扑序反向松弛：LF_pred = min(projectEnd, 各后继约束隐含值)；后继 LF 此时已定
  const lf = new Map<string, number>()
  for (let i = topo.length - 1; i >= 0; i--) {
    const id = topo[i]!
    const durPred = dur.get(id)!
    let value = projectEnd
    for (const { succ, type, lag } of successors.get(id) ?? []) {
      const lfSucc = lf.get(succ)!
      const lsSucc = lfSucc - dur.get(succ)!
      const lagMs = lag * DAY_MS
      const implied =
        type === 'fs'
          ? lsSucc - lagMs
          : type === 'ss'
            ? lsSucc - lagMs + durPred
            : type === 'ff'
              ? lfSucc - lagMs
              : lfSucc - lagMs + durPred // sf
      if (implied < value) value = implied
    }
    lf.set(id, value)
  }
  // 总浮时 = LF − EF；自由浮时 = 不被任何后继约束压缩的最大可延后量。
  // 自由浮时按依赖类型逐边计算后取最小值；无后继任务可延后到项目完成。
  const totalFloat = new Map<string, number>()
  const freeFloat = new Map<string, number>()
  for (const t of nodes) {
    const start = es.get(t.id)!
    const duration = dur.get(t.id)!
    const end = start + duration
    totalFloat.set(t.id, lf.get(t.id)! - end)
    let ff = projectEnd - end
    for (const { succ, type, lag } of successors.get(t.id) ?? []) {
      const succStart = es.get(succ)!
      const succEnd = succStart + dur.get(succ)!
      const lagMs = lag * DAY_MS
      const implied =
        type === 'fs'
          ? succStart - end - lagMs
          : type === 'ss'
            ? succStart - start - lagMs
            : type === 'ff'
              ? succEnd - end - lagMs
              : succEnd - start - lagMs
      if (implied < ff) ff = implied
    }
    freeFloat.set(t.id, ff)
  }
  const critical = new Set<string>()
  const conflict = new Set<string>()
  for (const t of nodes) {
    const float = totalFloat.get(t.id)!
    if (Math.abs(float) < 1e-6) critical.add(t.id)
    else if (float < -1e-6) conflict.add(t.id) // 负总时差 = 已违反后继约束（违约）
    // 约束违反并入违约集（与负总时差同样呈现 .conflict）；日精度约束按**日历日**比较（本地时区安全）
    const con = constraintOf(t)
    if (!con) continue
    const dayStr = (ms: number): string => toISODate(new Date(ms))
    const startMs = startMsOfTask(t)
    if (con.mode === 'snet') {
      if (con.dateOnly ? dayStr(startMs) < dayStr(con.ms) : startMs < con.ms) conflict.add(t.id)
    } else if (con.mode === 'mso') {
      if (con.dateOnly ? dayStr(startMs) !== dayStr(con.ms) : startMs !== con.ms) conflict.add(t.id)
      // mso：被依赖要求的起点晚于锚点 → 该任务自身违约
      let required = Number.NEGATIVE_INFINITY
      for (const [predId, list] of successors) {
        for (const e of list) {
          if (e.succ !== t.id) continue
          const pS = es.get(predId)
          const pD = dur.get(predId)
          if (pS === undefined || pD === undefined) continue
          const lagMs = e.lag * DAY_MS
          const dSelf = dur.get(t.id)!
          const need =
            e.type === 'fs'
              ? pS + pD + lagMs
              : e.type === 'ss'
                ? pS + lagMs
                : e.type === 'ff'
                  ? pS + pD + lagMs - dSelf
                  : pS + lagMs - dSelf
          if (need > required) required = need
        }
      }
      if (required > con.ms + 1e-6) conflict.add(t.id)
    } else if (con.mode === 'fnlt') {
      const endInclusive = endMsOfTask(t) - 1
      if (con.dateOnly ? dayStr(endInclusive) > dayStr(con.ms) : endMsOfTask(t) > con.endMs) {
        conflict.add(t.id)
      }
    }
  }
  return { critical, conflict, totalFloat, freeFloat }
}

/** 截止日违约集：结束日晚于 deadline（日精度按含端日期比较；时刻精度按 ms） */
export function deadlineConflictIds(tasks: TG[]): Set<string> {
  const out = new Set<string>()
  for (const t of tasks) {
    const values = [...(t.deadline ? [t.deadline] : []), ...(t.deadlines ?? [])]
    if (values.length === 0) continue
    const end = endMsOfTask(t)
    if (end <= 0) continue
    for (const value of values) {
      const d = parseTaskDate(value)
      if (!d) continue
      const dateOnly = value.length <= 10
      const late = dateOnly ? toISODate(new Date(end - 1)) > toISODate(new Date(d.getTime())) : end > d.getTime()
      if (late) {
        out.add(t.id)
        break
      }
    }
  }
  return out
}

// ===== 资源负荷（opt-in） =====

/** 图表 scale → 负荷桶粒度映射：hour/day → day、week → week、month/quarter/year → month */
export function loadUnit(scale: GanttScale): 'day' | 'week' | 'month' {
  if (scale === 'week') return 'week'
  if (scale === 'month' || scale === 'quarter' || scale === 'year') return 'month'
  return 'day'
}

/** 负荷桶 i 的起始本地零点 ms（与 xOf 同一 local 时区坐标系）：day/week 按日历日推进、month 按月历推进 */
export function loadBucketStartMs(result: ResourceLoadResult, i: number): number {
  const d = parseTaskDate(result.bucketStart)
  if (!d) return 0
  if (result.unit === 'month') return new Date(d.getFullYear(), d.getMonth() + i, 1).getTime()
  const step = result.unit === 'week' ? i * 7 : i
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + step).getTime()
}

// ===== 状态线 =====

/**
 * 计划进度比（0-1，**含端日粒度**口径，与 evm computeEvm 的 planned 同构）：
 * 已耗天数 = status 日与 start 之间的日历日数（含 status 当日、start 当日 = 1），clamp 到工期；
 * ratio = 已耗天数 / 工期天数（0 工期防护为 0）。里程碑保持二值（未到 0 / 已到 1）。
 * 日差按「本地日历日 → UTC 零点」归一计算，DST 23/25h 日不漂（同 evm/dst.test 的 dayDiff 口径）。
 */
export function plannedRatio(row: GanttRow, statusMs: number): number {
  if (row.isMilestone) return statusMs >= row.startMs ? 1 : 0
  const durationDays = Math.round((row.endMs - row.startMs) / DAY_MS)
  if (durationDays <= 0) return statusMs >= row.endMs ? 1 : 0
  const startDay = new Date(row.startMs)
  const statusDay = new Date(statusMs)
  const dayDiff = Math.round(
    (Date.UTC(statusDay.getFullYear(), statusDay.getMonth(), statusDay.getDate()) -
      Date.UTC(startDay.getFullYear(), startDay.getMonth(), startDay.getDate())) /
      DAY_MS,
  )
  const elapsed = Math.min(durationDays, Math.max(0, dayDiff + 1))
  return elapsed / durationDays
}
