/**
 * oas-gantt 超配自动排程避让纯引擎（levelConflicts 方法的实现本体，零组件依赖——
 * 不 import 任何 OASElement / DOM，对齐 gantt-utils.ts 模块边界）。
 *
 * 职责：对 pool 模式的资源冲突（computeResourceConflicts 产物）做「整体后移受害者」迭代，
 * 直到无冲突或达迭代上限。判据与检测**同源**：初始冲突对与终检直接调
 * computeResourceConflicts（扫描线）；迭代内用同款半开区间谓词局部重检（相切不算，
 * 日精度 end 含端语义照 gantt 口径）。
 *
 * 裁定口径（Z2 B 路线，立项评审拍板）：
 * - 受害者排序（逐条出处见 victimCompare 注释）：disabled / 资源日历 days 空集 /
 *   constraint==='mso' 永不让位；有 deadline 者后让位（都有按最晚 deadline 后让位）；
 *   startMs 晚者先让位；输入序靠后者先让位。
 * - 平移：day 步进 addLocalDays（保墙钟时刻，DST 不漂移），end 按保工期推导
 *   （整日按日历日、时间精度同步平移）；工作日吸附放**收敛后最终落点**（calendar 回调
 *   逐日前进，上限同款 SNAP_MAX_DAYS），吸附后复检一次交叠，复检不过继续迭代；
 *   每步纯 day 步进保单调。
 * - maxIter 缺省 500（对齐 resource levelResources DEFAULT_MAX_ITER），达上限
 *   truncated: true + unresolved 如实返回，不静默。
 * - 里程碑 / summary / 池外资源不参与（与检测同口径），以 skipped 如实回报。
 * - 纯函数：不改入参（任务对象与数组均原样），确定性输出（同输入同结果）。
 */
import { parseISODate, toISODate } from '../../form/calendar/date-grid.js'
import { devWarn } from '../../shared/dev-warn.js'
import { addLocalDays, computeResourceConflicts, SNAP_MAX_DAYS } from './gantt-utils.js'
import type {
  GanttLevelCalendar,
  GanttLevelMoved,
  GanttLevelOptions,
  GanttLevelResult,
  GanttLevelSkipped,
  GanttLevelUnresolved,
  GanttTask,
  TG,
} from './gantt-types.js'

/** 缺省迭代上限（对齐 resource levelResources DEFAULT_MAX_ITER） */
const DEFAULT_MAX_ITER = 500

/**
 * 诊断计数（**仅内部诊断，非公开 API**，模式同 gantt-utils.ganttRenderDiag）：
 * lastSteps = 最近一次 levelGanttConflicts 实际推进步数（移动 +1 天与吸附推进各计一步）。
 * 用途：朴素参考实现对拍断言「引擎步数 ≤ 参考步数」；不参与任何组件逻辑，
 * index.ts 不导出该符号，也不进 api-manifest。
 */
export const ganttLevelDiag = { lastSteps: 0 }

/** 日历回调兜底告警去重（宿主回调抛异常时模块级仅提示一次） */
let calendarThrowWarned = false

/** 参与者内部状态（位置以 ms 持有，写回串由精度推导；输入对象零改动） */
interface Participant {
  /** 输入序（受害者排序与输出序契约） */
  index: number
  /** 工作副本（浅拷贝；start/end 串随移动更新，供 computeResourceConflicts 读取） */
  copy: TG
  /** start / end 是否时间精度（'YYYY-MM-DD HH:mm'；决定写回串格式，参与者必有 end） */
  startTimed: boolean
  endTimed: boolean
  /** 当前开始（本地 ms） */
  startMs: number
  /** 当前结束：时间精度 = 原时刻 ms；日精度 = 结束日本地零点（含端日） */
  endInMs: number
  /** 当前互斥右缘（日精度 = endIn + 1 天；与检测 parse 口径逐位一致） */
  endEdgeMs: number
  /** 池内资源（去重后；决定冲突面与局部重检范围） */
  poolRes: string[]
  /** 日历快照（回调在初始化时调用一次并缓存；吸附用） */
  days: Set<number> | null
  holidays: Set<string>
  /** 永不让位（disabled / days 空集 / mso 三条裁定合并判定） */
  pinned: boolean
  /** deadline 键：deadline + deadlines 合并取最早（最紧约束）；无则 null */
  deadlineMs: number | null
  /** 是否被移动过（moved 输出与吸附对象） */
  dirty: boolean
}

/** 冲突对工作项（队列元素；seq/aIdx/bIdx 用于与检测输出一致的 canonical 排序） */
interface Pair {
  taskA: string
  taskB: string
  resourceId: string
  seq: number
  aIdx: number
  bIdx: number
}

/** 本地零点 ms → 'YYYY-MM-DD' */
function fmtDay(ms: number): string {
  return toISODate(new Date(ms))
}

/** ms → 'YYYY-MM-DD HH:mm'（保墙钟；组件时间精度数据串规格） */
function fmtTimed(ms: number): string {
  const d = new Date(ms)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${fmtDay(ms)} ${h}:${m}`
}

/** 安全解析（parseISODate 包一层，非法返回 null） */
function parseDate(s: string): Date | null {
  return parseISODate(s.trim())
}

/**
 * 受害者排序（裁定逐条实现；返回负数 = a 先让位，正数 = b 先让位，0 = 并列取 a）：
 * 1. disabled → 永不让位（排最后；双侧让不出由调用方放弃该对）；
 * 2. 日历 days 空集 → 永不让位（与 disabled 同级合并为 pinned）；
 * 3. constraint==='mso' → 永不让位（同级）；
 * 4. 有 deadline 者后让位（deadline 是比工期更强的外部承诺，让位会直接威胁承诺日）；
 * 5. 都有 deadline 按最晚者后让位（deadline 早者更紧迫，先动把它安顿好）；
 * 6. startMs 晚者先让位（晚开始的任务整体后移对社会时序扰动最小，对齐 levelResources 口径）；
 * 7. 输入序靠后者先让位（宿主数据序即优先级表达，稳定且可预测）。
 */
function victimCompare(a: Participant, b: Participant): number {
  if (a.pinned !== b.pinned) return a.pinned ? 1 : -1
  const da = a.deadlineMs
  const db = b.deadlineMs
  if ((da !== null) !== (db !== null)) return da !== null ? 1 : -1
  if (da !== null && db !== null && da !== db) return da - db
  if (a.startMs !== b.startMs) return b.startMs - a.startMs
  return b.index - a.index
}

/**
 * 超配避让主入口（纯函数）：tasks 原样读取零改动；registeredIds = 池内已登记资源 id 集；
 * calendar 回调逐任务提供资源日历（组件传 taskCalendar 同构快照）；opts.maxIter 缺省 500。
 */
export function levelGanttConflicts(
  tasks: GanttTask[],
  registeredIds: Set<string>,
  calendar: (task: GanttTask) => GanttLevelCalendar,
  opts: GanttLevelOptions = {},
): GanttLevelResult {
  const maxIter =
    typeof opts.maxIter === 'number' && Number.isFinite(opts.maxIter) && opts.maxIter >= 0
      ? Math.floor(opts.maxIter)
      : DEFAULT_MAX_ITER

  // summary 判定与 computeResourceConflicts 同源：被 parent 指向即有子级
  const hasChildren = new Set<string>()
  for (const t of tasks) {
    if (t && typeof t === 'object' && typeof t.parent === 'string' && t.parent !== '') hasChildren.add(t.parent)
  }

  // 资源 first-seen 序（与检测 byResource 插入序一致，供 canonical 排序）
  const resourceSeq = new Map<string, number>()
  const seqOf = (rid: string): number => resourceSeq.get(rid) ?? Number.MAX_SAFE_INTEGER

  const skipped: GanttLevelSkipped[] = []
  const work: TG[] = [] // 全量浅拷贝（含非参与者，检测的 hasChildren 需要 parent 链）
  const participants: Participant[] = []
  const byId = new Map<string, Participant>()
  const byResource = new Map<string, Participant[]>()

  const pushSkipped = (id: string, reason: GanttLevelSkipped['reason']): void => {
    skipped.push({ id, reason })
  }

  for (let index = 0; index < tasks.length; index++) {
    const raw = tasks[index]
    if (!raw || typeof raw !== 'object') continue
    const copy = { ...raw } as TG
    work.push(copy)
    const id = typeof raw.id === 'string' ? raw.id : ''
    if (id === '') continue // 无 id 不参与（与检测同口径静默；无法写回也无法回报）
    const resources = Array.isArray(raw.resources) ? raw.resources : []
    const hasRes = resources.length > 0
    if (hasChildren.has(id)) {
      if (hasRes) pushSkipped(id, 'summary')
      continue
    }
    if (raw.type === 'milestone' || !raw.end) {
      if (hasRes) pushSkipped(id, 'milestone')
      continue
    }
    if (!hasRes) continue // 无资源引用：检测同样静默忽略（不进 skipped）
    const s = parseDate(raw.start)
    const e = parseDate(raw.end)
    if (!s || !e) {
      pushSkipped(id, 'invalid-dates')
      continue
    }
    const startMs = s.getTime()
    const startTimed = raw.start.length > 10
    const endTimed = raw.end.length > 10
    const endInMs = e.getTime()
    const endEdgeMs = endTimed ? endInMs : addLocalDays(endInMs, 1)
    if (endEdgeMs <= startMs) {
      pushSkipped(id, 'invalid-dates')
      continue
    }
    const poolRes: string[] = []
    for (const rid of resources) {
      if (typeof rid !== 'string' || !registeredIds.has(rid)) continue
      if (!resourceSeq.has(rid)) resourceSeq.set(rid, resourceSeq.size)
      if (!poolRes.includes(rid)) poolRes.push(rid)
    }
    if (poolRes.length === 0) {
      pushSkipped(id, 'off-pool')
      continue
    }
    // 日历快照（回调只调一次；抛异常兜底为不限日历——宁可不吸附不可炸调用链）
    let days: Set<number> | null = null
    let holidays: Set<string> = new Set()
    try {
      const cal = calendar(raw)
      if (cal) {
        if (cal.days === null || cal.days instanceof Set) days = cal.days
        if (cal.holidays instanceof Set) holidays = cal.holidays
      }
    } catch {
      if (!calendarThrowWarned) {
        calendarThrowWarned = true
        devWarn('[oas-gantt] levelConflicts 的 calendar 回调抛异常，该任务已按不限日历处理（不吸附）')
      }
    }
    // deadline 键：deadline + deadlines 合并取最早（最紧约束）；非法项忽略
    let deadlineMs: number | null = null
    const dlList: string[] = []
    if (typeof raw.deadline === 'string') dlList.push(raw.deadline)
    if (Array.isArray(raw.deadlines)) for (const d of raw.deadlines) if (typeof d === 'string') dlList.push(d)
    for (const d of dlList) {
      const p = parseDate(d)
      if (!p) continue
      const ms = p.getTime()
      if (deadlineMs === null || ms < deadlineMs) deadlineMs = ms
    }
    const pinned = raw.disabled === true || (days !== null && days.size === 0) || raw.constraint === 'mso'
    const p: Participant = {
      index,
      copy,
      startTimed,
      endTimed,
      startMs,
      endInMs,
      endEdgeMs,
      poolRes,
      days,
      holidays,
      pinned,
      deadlineMs,
      dirty: false,
    }
    participants.push(p)
    byId.set(id, p)
    for (const rid of poolRes) {
      let list = byResource.get(rid)
      if (!list) {
        list = []
        byResource.set(rid, list)
      }
      list.push(p)
    }
  }

  const applyPosition = (p: Participant): void => {
    p.copy.start = p.startTimed ? fmtTimed(p.startMs) : fmtDay(p.startMs)
    p.copy.end = p.endTimed ? fmtTimed(p.endInMs) : fmtDay(p.endInMs)
    p.endEdgeMs = p.endTimed ? p.endInMs : addLocalDays(p.endInMs, 1)
  }

  /** 单步 +1 天（保墙钟；两端同步平移 = 工期不变） */
  const stepForward = (p: Participant): void => {
    p.startMs = addLocalDays(p.startMs, 1)
    p.endInMs = addLocalDays(p.endInMs, 1)
    applyPosition(p)
    p.dirty = true
  }

  /** 起点是否落在工作日（假期恒非工作日；days null = 不限周几） */
  const allowedDay = (p: Participant): boolean => {
    const d = new Date(p.startMs)
    if (p.holidays.has(toISODate(d))) return false
    if (!p.days) return true
    return p.days.has(d.getDay())
  }

  /** 半开区间谓词（与检测同款：相切不算；ms 精度） */
  const overlaps = (a: Participant, b: Participant): boolean => a.startMs < b.endEdgeMs && b.startMs < a.endEdgeMs

  /** 受害者 v 的全部现役冲突对（逐池内资源局部重检；taskA 恒输入序在前） */
  const pairsOf = (v: Participant): Pair[] => {
    const out: Pair[] = []
    for (const rid of v.poolRes) {
      const list = byResource.get(rid)!
      for (const other of list) {
        if (other === v) continue
        if (!overlaps(v, other)) continue
        const a = v.index < other.index ? v : other
        const b = v.index < other.index ? other : v
        out.push({ taskA: a.copy.id, taskB: b.copy.id, resourceId: rid, seq: seqOf(rid), aIdx: a.index, bIdx: b.index })
      }
    }
    return out
  }

  const canonical = (x: Pair, y: Pair): number => x.seq - y.seq || x.aIdx - y.aIdx || x.bIdx - y.bIdx

  /** 检测产物 → 队列元素（taskA===taskB 的病态对交由主循环放弃） */
  const toPair = (c: { taskA: string; taskB: string; resourceId: string }): Pair => ({
    taskA: c.taskA,
    taskB: c.taskB,
    resourceId: c.resourceId,
    seq: seqOf(c.resourceId),
    aIdx: byId.get(c.taskA)?.index ?? Number.MAX_SAFE_INTEGER,
    bIdx: byId.get(c.taskB)?.index ?? Number.MAX_SAFE_INTEGER,
  })

  /** 挑受害者；双侧让不出（v pinned / 病态自对 / id 悬空）返回 null（放弃该对） */
  const victimOf = (pr: Pair): Participant | null => {
    if (pr.taskA === pr.taskB) return null
    const a = byId.get(pr.taskA)
    const b = byId.get(pr.taskB)
    if (!a || !b) return null
    const victim = victimCompare(a, b) <= 0 ? a : b
    return victim.pinned ? null : victim
  }

  let steps = 0
  let truncated = false
  // 初始冲突对直接调检测（判据同源）；队列保持 canonical 序（与检测输出序一致）
  let queue: Pair[] = computeResourceConflicts(work, registeredIds).map(toPair)

  for (;;) {
    // ---- 阶段 A：day 步进至队列清空（局部重检：移动受害者后只刷新涉其冲突对）----
    for (;;) {
      if (queue.length === 0) break
      const pr = queue[0]!
      const victim = victimOf(pr)
      if (victim === null) {
        // 双侧永不让位 / 病态对：放弃该对（终检会如实回报为 unresolved），不耗预算
        queue.shift()
        continue
      }
      if (steps >= maxIter) {
        truncated = true
        break
      }
      stepForward(victim)
      steps++
      // 局部重检：非涉受害者对不受移动影响（区间未变），仅刷新受害者对
      const rest = queue.filter((x) => x.taskA !== victim.copy.id && x.taskB !== victim.copy.id)
      queue = [...rest, ...pairsOf(victim)].sort(canonical)
    }
    if (truncated) break
    // ---- 阶段 B：吸附（收敛后最终落点逐日前进；上限同款 SNAP_MAX_DAYS；预算共享）----
    let snapped = false
    for (const p of participants) {
      if (!p.dirty) continue
      for (let i = 0; i < SNAP_MAX_DAYS; i++) {
        if (allowedDay(p)) break
        if (steps >= maxIter) {
          truncated = true
          break
        }
        stepForward(p)
        steps++
        snapped = true
      }
      if (truncated) break
    }
    if (truncated) break
    if (!snapped) break
    // ---- 阶段 C：吸附后复检一次交叠；复检不过继续迭代 ----
    const remaining = computeResourceConflicts(work, registeredIds)
    if (remaining.length === 0) break
    queue = remaining.map(toPair)
  }

  // 终检（判据同源）：残留冲突如实透传（双侧不让位 / 截断时非空）
  const finalConflicts = computeResourceConflicts(work, registeredIds)
  const unresolved: GanttLevelUnresolved[] = finalConflicts.map((c) => ({
    taskA: c.taskA,
    taskB: c.taskB,
    resourceId: c.resourceId,
  }))
  const moved: GanttLevelMoved[] = []
  for (const p of participants) {
    if (!p.dirty) continue
    // end 由精度旗标推导（参与者必有 end；与 copy.end 串恒一致）
    moved.push({ id: p.copy.id, start: p.copy.start, end: p.endTimed ? fmtTimed(p.endInMs) : fmtDay(p.endInMs) })
  }
  ganttLevelDiag.lastSteps = steps
  const result: GanttLevelResult = { moved, unresolved, truncated, skipped }
  return result
}
