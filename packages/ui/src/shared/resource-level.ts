/**
 * levelResources 算法核实现本体（自 oas-resource.ts 抽核，块体逐字节平移；Z11 批按
 * resourceLoad 先例居 src/shared/——组件桶静态消费同一份实现，实现随组件链进 L1/data
 * 族包；公开子路径 data/resource/level/index.ts 为薄转发入口，见该文件头部口径）。
 *
 * 职责：负载均衡引擎——shift（整体顺延，改日期保工期）/ reassign（改派资源，日期不动）。
 * 入参是清洗后的 RS/RT（清洗族居 ../data/resource/model.ts，同链路避免循环依赖）；
 * period 无文案（buildPeriodSpans），本模块不依赖 locale 文案设施（formatToken/isoWeek）。
 *
 * 模块级 devWarn 去重（periodsTruncWarned / pureAccessorKeyWarned / pureInvalidEntryWarned）：
 * 纯函数无实例可挂，沿抽核前口径——模块内仅提示一次。
 */
import { addMonthsClamped, toISODate } from '../form/calendar/date-grid.js'
import { devWarn } from './dev-warn.js'
import {
  addDays,
  buildPeriodSpans,
  calendarDaysBetween,
  MAX_PERIODS,
  parseTaskDate,
  periodCapacity,
  SCALES,
  sanitizeCapacity,
  sanitizeResources,
  sanitizeTasks,
  spansOf,
  toPublicTask,
} from '../data/resource/model.js'
import type { PeriodSpan, ResourceItem, ResourceScale, ResourceTask, RS, RT, Span } from '../data/resource/model.js'

// 数据契约类型随子路径再导出（helper-only 消费者只 import 本子路径即可拿到完整签名，不必两处引）
export type { ResourceItem, ResourceScale, ResourceTask } from '../data/resource/model.js'

/** levelResources 平衡模式：shift=整体顺延（改日期、保工期）；reassign=改派资源（日期不变、尊重 capacity） */
export type LevelResourcesMode = 'shift' | 'reassign'

/** levelResources 选项 */
export interface LevelResourcesOptions {
  /** 步进粒度（缺省 day） */
  scale?: ResourceScale
  /** 资源未声明 capacity 时的缺省容量（缺省 1） */
  capacity?: number
  /** 迭代上限（缺省 500，达上限即停，返回已移动部分） */
  maxIter?: number
  /** week 档周起始（0=周日 … 6=周六；缺省 1=周一，纯函数无 locale 上下文） */
  weekStart?: number
  /**
   * 平衡模式（缺省 shift）：
   * - shift：把超载档内优先级最低的任务整体后移一个 period（改日期、保工期，对截止日不友好）；
   *   workdays 显式为空且未来没有足够的正容量 override 时保持原日期并 devWarn，不推到 maxIter 之后。
   * - reassign：把任务改派给整段都有余量的资源（日期不变、尊重 capacity；找不到目标即停，不退化顺延）
   */
  mode?: LevelResourcesMode
  /** reassign 时是否要求目标资源具备 task.requiredSkills（缺省 true；无技能数据时无影响） */
  respectSkills?: boolean
  /** 跨项目优先级：数组靠前的项目优先；未列出的项目排在最后（仅 levelResources 使用） */
  projectOrder?: string[]
}

/** levelResources 缺省迭代上限 */
const DEFAULT_MAX_ITER = 500

/** MAX_PERIODS 截断告警去重（levelResources 纯函数路径：模块内仅提示一次，防 maxIter 循环刷屏） */
let periodsTruncWarned = false

/** 抛异常 accessor getter 丢弃告警去重（levelResources 纯函数路径：模块级仅提示一次，无实例可挂） */
let pureAccessorKeyWarned = false

/** 纯函数路径的「抛异常 getter 键丢弃」告警回调（模块级去重一次，无实例上下文） */
function pureAccessorKeyError(): (key: string) => void {
  return (key) => {
    if (pureAccessorKeyWarned) return
    pureAccessorKeyWarned = true
    devWarn(`[oas-resource] 数据含抛异常的自定义键 getter（如「${key}」），已丢弃该键（其余键保留）`)
  }
}

let pureInvalidEntryWarned = false

/** 纯函数路径的「结构性无效条目丢弃」告警回调（模块级去重一次，无实例上下文） */
function pureInvalidEntryError(): () => void {
  return () => {
    if (pureInvalidEntryWarned) return
    pureInvalidEntryWarned = true
    devWarn(`[oas-resource] 输入含结构性不可读条目（如已吊销的 Proxy），已丢弃该条目（其余条目保留）`)
  }
}

/**
 * 是否存在足够的未来可排容量（结构判定，不受当前 period 窗口影响）：
 * 只有「workdays 显式为空」才需要看 override；从该资源自身最早任务起，
 * 未来正 override 的容量总和必须覆盖其任务占用的档数（多日任务按档数计）。
 * 容量按数值累加，因此 week/month 档内的小数 override 可合并（如 0.5+0.5）。
 * 其余情况（含当前连续假期/0 override）未来仍可能恢复基础容量，shift 允许继续移动。
 */
function hasPotentialCapacity(r: RS, fromMs: number, demand: number): boolean {
  if (r.workdays === null || r.workdays.length > 0) return true
  if (!r.capacityOverrides) return false
  let total = 0
  for (const [key, n] of r.capacityOverrides) {
    if (n <= 0) continue
    const d = parseTaskDate(key)
    if (!d || d.getTime() < fromMs) continue
    total += n
    if (total >= demand) return true
  }
  // 与 periodCapacity 同口径做 1e-6 归一：0.3+0.7 之类的浮点累加不应误判不可排。
  return Math.round(total * 1e6) / 1e6 >= demand
}

/**
 * workdays 的循环最长连续可用日段（周界回绕）：[1..5] → 5；[5,6,0] → 3（五→六→日跨周界）；
 * [0..6] → 7。只由声明值决定，与 holidays/override 无关——假期只造成局部凹陷，
 * 不减少循环最长段的上界（下一段完整工作周仍会到达该上界）。
 * 空数组语义是「显式全不可用」，调用方在此之前已单独处理（zero-capacity 路径）。
 */
function longestWorkdayRun(workdays: number[]): number {
  const set = new Set(workdays)
  let best = 0
  for (const start of set) {
    let len = 0
    let cursor = start
    while (set.has(cursor)) {
      len++
      cursor = (cursor + 1) % 7
    }
    if (len > best) best = len
  }
  return best
}

/** 跨度守卫告警去重（模块级一次，无实例可挂——同 pure* 口径） */
let spanGuardWarned = false

function sanitizeSkillsMatch(v: unknown): boolean {
  return v !== false
}

function sanitizeProjectOrder(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const x of v) {
    if (typeof x !== 'string') continue
    const s = x.trim()
    if (s === '' || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

function hasRequiredSkills(r: RS, t: RT): boolean {
  if (t.requiredSkills.length === 0) return true
  if (!r.skills) return false
  return t.requiredSkills.every((skill) => r.skills!.includes(skill))
}

function projectRank(project: string, order: string[]): number {
  const i = order.indexOf(project)
  return i < 0 ? order.length : i
}

/** 均载受害者/改派候选排序：低优先级先让位；并列保持 start 晚→早、输入序后→前 */
function compareLowPriorityFirst(a: Span, b: Span, tasks: RT[], projectOrder: string[]): number {
  const ta = tasks[a.index]!
  const tb = tasks[b.index]!
  const projectDiff = projectRank(tb.project, projectOrder) - projectRank(ta.project, projectOrder)
  if (projectDiff !== 0) return projectDiff
  const priorityDiff = tb.priority - ta.priority
  if (priorityDiff !== 0) return priorityDiff
  return b.startMs - a.startMs || b.index - a.index
}

/**
 * 负载均衡（纯函数）：保持每任务工期不变，若某资源某 period 超载，
 * 把与该 period 重叠的任务中优先级最低者整体后移一个 period，迭代至无超载或达 maxIter。
 * 返回「被后移的任务数组」（不改入参）；组件不自动调用。
 *
 * 确定性约定：超载档按资源输入序 → period 时序取第一个处理；受害者先比 projectOrder
 * （靠后项目先让位）、再比 priority（数值大者先让位），并列取 startMs 最大者、输入序靠后者。
 * workdays 显式为空且未来没有足够的正容量 override 时视为永久不可排（不移动、devWarn），避免把任务推到 maxIter 之后。
 * 跨度守卫：任务日历天数 > 其分配资源的最长连续工作日段（workdays 循环回绕计）时，
 * 任何整体后移都找不到全段空档，该任务不参与移动并 devWarn（模块级去重一次）。
 * week 档周起始由 opts.weekStart 决定（缺省周一，纯函数无 locale 上下文；与组件 locale
 * 周起始不同时，周粒度判定可能存在边界差）。
 */
export function levelResources(
  resources: ResourceItem[],
  tasks: ResourceTask[],
  opts: LevelResourcesOptions = {},
): ResourceTask[] {
  const onKeyError = pureAccessorKeyError()
  const rs = sanitizeResources(resources, onKeyError, pureInvalidEntryError())
  const work = sanitizeTasks(tasks, onKeyError, pureInvalidEntryError())
  if (rs.length === 0 || work.length === 0) return []
  const scale: ResourceScale = opts.scale != null && (SCALES as string[]).includes(opts.scale) ? opts.scale : 'day'
  const capDefault = sanitizeCapacity(opts.capacity) ?? 1
  const maxIter =
    typeof opts.maxIter === 'number' && Number.isFinite(opts.maxIter) && opts.maxIter >= 0
      ? Math.floor(opts.maxIter)
      : DEFAULT_MAX_ITER
  const weekStart =
    typeof opts.weekStart === 'number' && Number.isInteger(opts.weekStart) ? ((opts.weekStart % 7) + 7) % 7 : 1
  const respectSkills = sanitizeSkillsMatch(opts.respectSkills)
  const projectOrder = sanitizeProjectOrder(opts.projectOrder)

  // 日历容量按 (resource, period) 缓存：shift 每次迭代、reassign 每轮候选会重复询问同一档；
  // 无日历资源仍走 periodCapacity 的 O(1) 早退，缓存表不改变结果。
  const capCache = new Map<string, number>()
  const capAt = (r: RS, period: PeriodSpan): number => {
    const key = `${r.id}|${period.startMs}|${period.endMs}`
    const hit = capCache.get(key)
    if (hit !== undefined) return hit
    const value = periodCapacity(r, period, scale, weekStart, capDefault)
    capCache.set(key, value)
    return value
  }

  if (opts.mode === 'reassign')
    return reassignOverload(rs, work, capAt, scale, weekStart, maxIter, respectSkills, projectOrder, onKeyError)

  const moved = new Set<string>()
  let zeroCapacityWarned = false
  let iter = 0
  for (;;) {
    if (iter >= maxIter) break
    const spans = spansOf(work)
    if (spans.length === 0) break
    let minMs = Number.POSITIVE_INFINITY
    let maxMs = Number.NEGATIVE_INFINITY
    for (const s of spans) {
      if (s.startMs < minMs) minMs = s.startMs
      if (s.endMs > maxMs) maxMs = s.endMs
    }
    const periods = buildPeriodSpans(minMs, maxMs, scale, weekStart, () => {
      // 纯函数路径模块级去重：levelResources 迭代内反复构建 period，防刷屏
      if (periodsTruncWarned) return
      periodsTruncWarned = true
      devWarn(`[oas-resource] period 数超过 ${MAX_PERIODS}，已截断（任务日期跨度可能异常）`)
    })
    if (periods.length === 0) break
    // 找第一个超载档（资源输入序 → period 时序）
    let victimIndex = -1
    let victimPeriod: PeriodSpan | null = null
    outer: for (const r of rs) {
      // workdays: [] 时容量只来自 override；必须从该资源自身最早任务起，
      // 确认未来 override 总容量足以覆盖任务占用的档数，否则整体跳过、避免先移走再放弃。
      // 非空 workdays / 未声明 workdays 即使当前连续假期，未来仍会恢复基础容量，不在此判死。
      if (r.workdays !== null && r.workdays.length === 0) {
        let resourceMin = Number.POSITIVE_INFINITY
        let demand = 0
        for (const s of spans) {
          if (!work[s.index]!.resources.includes(r.id)) continue
          if (s.startMs < resourceMin) resourceMin = s.startMs
          for (const p of periods) {
            if (s.startMs < p.endMs && s.endMs > p.startMs) demand++
          }
        }
        if (resourceMin !== Number.POSITIVE_INFINITY && !hasPotentialCapacity(r, resourceMin, demand)) {
          if (!zeroCapacityWarned) {
            zeroCapacityWarned = true
            devWarn('[oas-resource] 资源 workdays 为空且未来无足够正容量 override，shift 无法消除超载，已保持原日期')
          }
          continue
        }
      }
      // 跨度守卫：任务日历天数 > 该资源最长连续工作日段时，任何整体后移都找不到全段空档
      //（任何窗口都必含零容量日），逐档后移只会把任务推到 maxIter 之外（周末发散缺陷）。
      // 该任务不参与移动并 devWarn（模块级去重）；跨度可容的任务照常参与。
      const maxRun = r.workdays !== null && r.workdays.length > 0 ? longestWorkdayRun(r.workdays) : -1
      for (const period of periods) {
        const cap = capAt(r, period)
        let load = 0
        let bestSpan: Span | null = null
        for (const s of spans) {
          const t = work[s.index]!
          if (!t.resources.includes(r.id)) continue
          if (maxRun >= 0) {
            // 跨度按本地日历日计（毫秒差在 DST 时区会差 1 小时，不能用毫秒除法）
            const sd = parseTaskDate(t.start)
            const ed = parseTaskDate(t.end)
            const days = sd && ed ? calendarDaysBetween(sd, ed) + 1 : 0
            if (days > maxRun) {
              if (!spanGuardWarned) {
                spanGuardWarned = true
                devWarn(
                  `[oas-resource] 任务跨度 ${days} 天超过资源 workdays 最长连续工作日段（${maxRun} 天），shift 无法容纳，已保持原日期（任务「${t.name}」）`,
                )
              }
              continue
            }
          }
          if (s.startMs < period.endMs && s.endMs > period.startMs) {
            load++
            // 受害者：低优先级先让位；并列开始较晚者、输入序靠后
            if (!bestSpan || compareLowPriorityFirst(s, bestSpan, work, projectOrder) < 0) bestSpan = s
          }
        }
        if (load > cap && bestSpan) {
          victimIndex = bestSpan.index
          victimPeriod = period
          break outer
        }
      }
    }
    if (victimIndex < 0 || !victimPeriod) break
    shiftTaskByOne(work[victimIndex]!, scale)
    moved.add(work[victimIndex]!.id)
    iter++
  }

  // 返回被后移的任务（按输入序，稳定输出）
  const out: ResourceTask[] = []
  for (const t of work) {
    if (moved.has(t.id)) out.push(toPublicTask(t, undefined, onKeyError))
  }
  return out
}

/**
 * 重分配模式（levelResources 内部实现）：日期不动，把超载资源上的任务改派给「整段都有余量」的资源。
 *
 * 约定：
 * - 超载档按资源输入序 → period 时序；候选任务先按 projectOrder（靠后先让位）、priority
 *   （数值大先让位），再按开始晚→早、输入序靠后→靠前（与 shift 受害者口径一致）；
 * - 目标资源须在任务覆盖的**每个** period 满足 load + 1 ≤ capacity，按 worst load ratio 取最空闲者
 *   （并列取资源输入序在前）；已分配给该任务的资源不重复选；
 * - 每次成功改派只降低超载资源负载、且不制造新超载（目标已校验），故有限步收敛；
 * - 找不到可行目标即停（**不退化顺延**）；达 maxIter 亦停。不改入参，返回被改派任务。
 */
function reassignOverload(
  rs: RS[],
  work: RT[],
  capAt: (r: RS, period: PeriodSpan) => number,
  scale: ResourceScale,
  weekStart: number,
  maxIter: number,
  respectSkills: boolean,
  projectOrder: string[],
  onKeyError?: (key: string) => void,
): ResourceTask[] {
  const spans = spansOf(work)
  if (spans.length === 0) return []
  let minMs = Number.POSITIVE_INFINITY
  let maxMs = Number.NEGATIVE_INFINITY
  for (const s of spans) {
    if (s.startMs < minMs) minMs = s.startMs
    if (s.endMs > maxMs) maxMs = s.endMs
  }
  const periods = buildPeriodSpans(minMs, maxMs, scale, weekStart, () => {
    if (periodsTruncWarned) return
    periodsTruncWarned = true
    devWarn(`[oas-resource] period 数超过 ${MAX_PERIODS}，已截断（任务日期跨度可能异常）`)
  })
  if (periods.length === 0) return []

  const overlaps = (s: Span, p: PeriodSpan): boolean => s.startMs < p.endMs && s.endMs > p.startMs
  const spanIdxs = (s: Span): number[] => {
    const out: number[] = []
    for (let i = 0; i < periods.length; i++) if (overlaps(s, periods[i]!)) out.push(i)
    return out
  }

  // 资源 × period 负载矩阵（与直方图同口径：任务与 period 相交即计 1）
  const load = new Map<string, number[]>()
  for (const r of rs) load.set(r.id, new Array<number>(periods.length).fill(0))
  for (const s of spans) {
    for (const rid of work[s.index]!.resources) {
      const arr = load.get(rid)
      if (!arr) continue
      for (const i of spanIdxs(s)) arr[i] = (arr[i] ?? 0) + 1
    }
  }

  const changed = new Set<string>()
  let iter = 0
  while (iter < maxIter) {
    let hit: { rid: string; idx: number } | null = null
    for (const r of rs) {
      const arr = load.get(r.id)!
      for (let i = 0; i < arr.length; i++) {
        if ((arr[i] ?? 0) > capAt(r, periods[i]!)) {
          hit = { rid: r.id, idx: i }
          break
        }
      }
      if (hit) break
    }
    if (!hit) break
    const rid = hit.rid
    const period = periods[hit.idx]!
    const candidates = spans
      .filter((s) => work[s.index]!.resources.includes(rid) && overlaps(s, period))
      .sort((a, b) => compareLowPriorityFirst(a, b, work, projectOrder))

    let progressed = false
    for (const s of candidates) {
      const t = work[s.index]!
      const idxs = spanIdxs(s)
      let bestRid: string | null = null
      let bestScore = Number.POSITIVE_INFINITY
      for (const r of rs) {
        if (r.id === rid || t.resources.includes(r.id)) continue
        if (respectSkills && !hasRequiredSkills(r, t)) continue
        const arr = load.get(r.id)!
        let worst = 0
        let feasible = true
        for (const i of idxs) {
          const cap = capAt(r, periods[i]!)
          if (!(cap > 0)) {
            feasible = false
            break
          }
          const after = (arr[i] ?? 0) + 1
          if (after > cap) {
            feasible = false
            break
          }
          worst = Math.max(worst, after / cap)
        }
        if (feasible && worst < bestScore) {
          bestScore = worst
          bestRid = r.id
        }
      }
      if (!bestRid) continue
      const at = t.resources.indexOf(rid)
      if (at < 0) continue
      t.resources = [...t.resources]
      t.resources[at] = bestRid
      const from = load.get(rid)!
      const to = load.get(bestRid)!
      for (const i of idxs) {
        from[i] = (from[i] ?? 0) - 1
        to[i] = (to[i] ?? 0) + 1
      }
      changed.add(t.id)
      iter++
      progressed = true
      break
    }
    if (!progressed) break
  }

  const out: ResourceTask[] = []
  for (const t of work) if (changed.has(t.id)) out.push(toPublicTask(t, undefined, onKeyError))
  return out
}

/**
 * 任务整体后移一个 period（原地改副本的 start/end 字符串，工期按日历日保持不变）：
 * day/week 本地日历日平移（跨 DST 不漂移）；month 用 addMonthsClamped 平移开始日所在自然月
 * （月末日期钳到目标月月末，如 01-31 → 02-28/29，不发生 31 号溢出到下下月），工期不变量照保。
 */
function shiftTaskByOne(t: RT, scale: ResourceScale): void {
  const s = parseTaskDate(t.start)!
  const e = parseTaskDate(t.end)!
  const dayCount = calendarDaysBetween(s, e)
  const nextStart = scale === 'month' ? addMonthsClamped(s, 1) : addDays(s, scale === 'week' ? 7 : 1)
  t.start = toISODate(nextStart)
  t.end = toISODate(addDays(nextStart, dayCount))
}
