/**
 * gantt 最晚日期反推（ALAP / 后向 CPM）（Pro helper 子路径，纯函数、零运行时依赖）：
 * - 按需引入：`@oas-ui/ui/data/gantt/alap`（`import { computeLateDates }`）；
 *   运行闭包不含 oas-gantt 组件本体 / core / i18n（类型仅 `import type`，构建期擦除）。
 * - 日期运算 DST 安全：日索引 = Date.UTC(本地年月日) / 86400000（整天数），
 *   与 oas-gantt 的 dayIndex 同口径；本模块自包含实现，不 import 组件文件。
 */

import type { GanttTask } from '../oas-gantt.js'

const DAY_MS = 86_400_000

/** lag 安全域：对齐核心 sanitizeLag 的 LAG_MS_LIMIT（1e12 ms ≈ 11574 天 ≈ 31.7 年） */
const LAG_DAY_LIMIT = Math.floor(1e12 / DAY_MS)

/** 单任务最晚日期结果（day 精度 'YYYY-MM-DD'；输入带 hour 成分则原样保留） */
export interface GanttLateDates {
  id: string
  /** 最晚开始（含 hour 成分若有） */
  lateStart: string
  /** 最晚完成（含 hour 成分若有；含端日） */
  lateFinish: string
  /** 总浮时（天）= 最晚开始 − 当前开始；负值 = 当前排程相对项目右界不可行（排程漂移面） */
  totalFloatDays: number
}

/** 拍平行：task + 嵌套父指针（与清洗层 flattenInput 同序：父在前、子随后） */
interface FlatRow {
  task: GanttTask
  /** 嵌套父 id（无带 id 祖先为 null；fromNest 语义与 flattenInput 一致） */
  nestParent: string | null
}

/** 节点（进依赖图的任务：有 id、start 合法、非摘要） */
interface Node {
  id: string
  task: GanttTask
  /** 当前排程开始（日索引） */
  start: number
  /** 工期（天）：显式 milestone 或无合法 end = 0；否则 (含端 end + 1) − start */
  duration: number
  /** 输入 start 的 hour 成分（'T…' 或 ' …'，无则空串） */
  startSuffix: string
  /** 输入 end 的 hour 成分 */
  endSuffix: string
}

type DepType = 'fs' | 'ss' | 'ff' | 'sf'
const DEP_TYPES = new Set<DepType>(['fs', 'ss', 'ff', 'sf'])

/** 日期串完整锚定（对齐核心 parseISODate 收敛域）：'YYYY-MM-DD[ T]HH:mm[:ss]'；拒绝其他后缀（含 Z/UTC 偏移） */
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})(?:([T ])(\d{2}):(\d{2})(?::(\d{2}))?)?$/

/** 拆日期串 → { 日索引, hour 成分 }；非法返回 null。时刻合法性校验（hh≤23 / mm≤59 / ss≤59） */
function parseDay(iso: unknown): { idx: number; suffix: string } | null {
  if (typeof iso !== 'string') return null
  const trimmed = iso.trim()
  const m = DAY_RE.exec(trimmed)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  let suffix = ''
  if (m[4] != null) {
    const hh = Number(m[5])
    const mi = Number(m[6])
    const ss = m[7] != null ? Number(m[7]) : 0
    if (hh > 23 || mi > 59 || ss > 59) return null
    suffix = trimmed.slice(10)
  }
  const dt = new Date(y, mo - 1, d)
  // 越界校验：Date 会把 02-30 滚动到 03-02，必须回读确认是真实存在的一天
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  const idx = Math.round(Date.UTC(y, mo - 1, d) / DAY_MS)
  return Number.isFinite(idx) ? { idx, suffix } : null
}

/** 日索引 → 'YYYY-MM-DD'（本地日历日；经本地 Date 构造回读，DST 安全） */
function formatDay(idx: number): string {
  const dt = new Date(1970, 0, 1 + idx)
  const mo = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mo}-${d}`
}

/** lag 消毒（对齐核心 sanitizeLag：非有限或超安全域 → 丢弃为 0；依赖本身保留） */
function sanitizeLag(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0
  if (Math.abs(v) > LAG_DAY_LIMIT) return 0
  return v
}

/**
 * 最晚日期反推（ALAP）。
 *
 * 口径与边界（v1，与核心 criticalPathIds 对齐）：
 * - **摘要（有子级）不进依赖图**：判定按指针口径（对齐核心 childStructure）——拍平后存在
 *   节点以它为父（嵌套父或显式 `parent` 字段指向本批任务）即摘要；摘要在输出中**不列出**
 *   （其日期由子级派生，自身 data 日期可能过期），也不参与 projectEnd。
 * - 输入视为**当前排程结果**（不做正向重排，ES 取任务自身 start）；totalFloat = lateStart − 当前 start（天）。
 * - **milestone：显式 `type === 'milestone'` 优先**（对齐核心 endMsOfTask）——工期按 0、`end` 忽略；
 *   无 end / end 非法同样按工期 0。
 * - 节点 = 有 id 且 start 可解析的非摘要任务；缺 id / start 非法 / 重复 id（首条生效，后续跳过）不产出。
 * - 依赖边两端任一缺失（悬空）→ 跳过该边，不抛；自依赖（任务依赖自身）视为数据错误跳过；
 *   type 非法按 fs；lag 非有限或 |lag| 超 11574 天安全域按 0（对齐核心 sanitizeLag 丢弃为 0）。
 * - 工期 = 任务自身 end − start（天，end 含端即 +1）；milestone / 无 end = 0。
 * - projectEnd 缺省 = max(end)（**仅按依赖图节点**，摘要不抬右界）；显式传入为「项目最晚完成日（含当日）」。
 * - 反向公式（与核心同约定，lag 正值 = 推迟后继）：
 *   fs: LF_pred = LS_succ − lag；ss: LF_pred = LS_succ − lag + dur_pred；
 *   ff: LF_pred = LF_succ − lag；sf: LF_pred = LF_succ − lag + dur_pred。
 * - **依赖环：best-effort**——环内节点不参与精确拓扑序，补入段按输入顺序做**一趟**松弛：
 *   min 松弛在环上无不动点（每绕一圈再降一天，多轮会无限下坠），单趟结果确定、有界、不抛；
 *   但**经过环节点的链路值与输入顺序相关**（环节点之间及其松弛到的直接前置都可能偏保守），
 *   不经过环节点的纯 DAG 链路仍按逆拓扑精确；依赖环本身属数据错误，宿主应优先修复数据。
 * - v1 日历无关：非工作日不吸附（工期按日历日），工作日日历口径由核心 auto-schedule 负责。
 * - 负总浮时表示「当前排程相对 projectEnd 不可行」（排程漂移面）；约束/截止日违约判定不在本 helper 范围。
 * - 输出 day 精度 'YYYY-MM-DD'，输入 start/end 带 hour 成分（'YYYY-MM-DD HH:mm'）则原样保留；
 *   日期串完整锚定（拒绝非法时刻 / 截断尾码 / Z 等后缀，对齐核心 parseISODate 收敛域）。
 */
export function computeLateDates(tasks: GanttTask[], opts?: { projectEnd?: string }): GanttLateDates[] {
  // 拍平（与清洗层 flattenInput 同序，收集嵌套父指针）
  const flat: FlatRow[] = []
  const flatten = (v: unknown, parent: string | null): void => {
    if (!Array.isArray(v)) return
    for (const item of v) {
      if (typeof item !== 'object' || item === null) continue
      const task = item as GanttTask
      flat.push({ task, nestParent: parent })
      if (Array.isArray(task.children)) {
        const pid = typeof task.id === 'string' && task.id !== '' ? task.id : null
        flatten(task.children, pid)
      }
    }
  }
  flatten(tasks, null)

  // 候选集：有 id（首条生效）+ start 合法
  const candidates = new Map<string, { task: GanttTask; start: { idx: number; suffix: string } }>()
  const order: string[] = []
  for (const { task } of flat) {
    const id = task.id
    if (typeof id !== 'string' || id === '' || candidates.has(id)) continue
    const start = parseDay(task.start)
    if (start === null) continue
    candidates.set(id, { task, start })
    order.push(id)
  }

  // 摘要集（指针口径）：候选中以某 id 为父（嵌套父或显式 parent 字段）→ 该 id 是摘要
  const summaryIds = new Set<string>()
  for (const row of flat) {
    const effectiveParent =
      row.nestParent ?? (typeof row.task.parent === 'string' && row.task.parent !== '' ? row.task.parent : null)
    if (effectiveParent !== null && candidates.has(effectiveParent)) summaryIds.add(effectiveParent)
  }

  // 节点（非摘要候选，保持输入顺序）
  const nodes: Node[] = []
  const byId = new Map<string, Node>()
  for (const id of order) {
    if (summaryIds.has(id)) continue
    const { task, start } = candidates.get(id)!
    // 显式 milestone 优先（对齐核心 endMsOfTask）：工期 0、end 忽略
    const milestone = task.type === 'milestone'
    const endParsed = milestone
      ? null
      : typeof task.end === 'string' && task.end.trim() !== ''
        ? parseDay(task.end)
        : null
    const node: Node = {
      id,
      task,
      start: start.idx,
      duration: endParsed === null ? 0 : endParsed.idx - start.idx + 1,
      startSuffix: start.suffix,
      endSuffix: endParsed === null ? start.suffix : endParsed.suffix,
    }
    nodes.push(node)
    byId.set(id, node)
  }
  if (nodes.length === 0) return []

  // 边收集：前置 id → 后继列表；悬空端点 / 自依赖跳过；type 非法按 fs；lag 消毒
  const successors = new Map<string, Array<{ succ: Node; type: DepType; lag: number }>>()
  for (const node of nodes) {
    for (const dep of node.task.dependencies ?? []) {
      if (!dep || typeof dep !== 'object') continue
      if (dep.id === node.id) continue // 自依赖跳过
      const pred = byId.get(dep.id)
      if (!pred) continue // 悬空（前置不存在 / 是摘要被排除）
      const type: DepType = DEP_TYPES.has(dep.type as DepType) ? (dep.type as DepType) : 'fs'
      const lag = sanitizeLag(dep.lag)
      const list = successors.get(pred.id) ?? []
      list.push({ succ: node, type, lag })
      successors.set(pred.id, list)
    }
  }

  // 项目右界（「排程位置」空间：位置 p = 含端日 p−1 的次日零点，与核心 endMs 同口径）
  const endPos = (n: Node): number => n.start + n.duration
  let projectEndPos = Number.NEGATIVE_INFINITY
  if (opts?.projectEnd != null) {
    const parsed = parseDay(opts.projectEnd)
    if (parsed !== null) projectEndPos = parsed.idx + 1 // 含端日 → 排程右界
  }
  if (!Number.isFinite(projectEndPos)) {
    for (const n of nodes) if (endPos(n) > projectEndPos) projectEndPos = endPos(n)
  }

  // Kahn 拓扑序（前向）；环内节点剩余按输入顺序补入（best-effort 段）
  const indeg = new Map<string, number>()
  for (const n of nodes) indeg.set(n.id, 0)
  for (const list of successors.values()) {
    for (const { succ } of list) indeg.set(succ.id, (indeg.get(succ.id) ?? 0) + 1)
  }
  const queue: string[] = []
  for (const n of nodes) if ((indeg.get(n.id) ?? 0) === 0) queue.push(n.id)
  const topo: string[] = []
  for (let qi = 0; qi < queue.length; qi++) {
    const id = queue[qi]!
    topo.push(id)
    for (const { succ } of successors.get(id) ?? []) {
      const next = (indeg.get(succ.id) ?? 0) - 1
      indeg.set(succ.id, next)
      if (next === 0) queue.push(succ.id)
    }
  }
  const ordered = [...topo]
  if (ordered.length < nodes.length) {
    const seen = new Set(ordered)
    for (const n of nodes) if (!seen.has(n.id)) ordered.push(n.id) // 环内节点（best-effort，输入顺序）
  }

  // 反向松弛（逆序）：LF 初值全部 = 项目右界；约束只做 min 收紧。
  // 环内节点（补入段，位于 ordered 尾部故最先被处理）只参与这一趟：
  // 它们读到的后继值可能是初值，且相互松弛顺序 = 输入序的逆序——结果确定但与输入顺序相关；
  // 纯 DAG 段随后按逆拓扑一趟精确。
  const lf = new Map<string, number>()
  for (const n of nodes) lf.set(n.id, projectEndPos)
  for (let i = ordered.length - 1; i >= 0; i--) {
    const node = byId.get(ordered[i]!)
    if (!node) continue
    let value = lf.get(node.id)!
    const durPred = node.duration
    for (const { succ, type, lag } of successors.get(node.id) ?? []) {
      const lfSucc = lf.get(succ.id)!
      const lsSucc = lfSucc - succ.duration
      const implied =
        type === 'fs'
          ? lsSucc - lag
          : type === 'ss'
            ? lsSucc - lag + durPred
            : type === 'ff'
              ? lfSucc - lag
              : lfSucc - lag + durPred // sf
      if (implied < value) value = implied
    }
    lf.set(node.id, value)
  }

  // 输出：lateFinish = LF 排程位置 − 1（含端日）；工期 0（milestone/单点）时「完成」即该点本身，
  // 位置即当日（与核心「里程碑 endMs = startMs」口径一致），不再 −1；lateStart = LF − 工期。
  return nodes.map((n) => {
    const finish = lf.get(n.id)!
    const lateStartPos = finish - n.duration
    return {
      id: n.id,
      lateStart: formatDay(lateStartPos) + n.startSuffix,
      lateFinish: formatDay(n.duration > 0 ? finish - 1 : finish) + n.endSuffix,
      totalFloatDays: lateStartPos - n.start,
    }
  })
}
