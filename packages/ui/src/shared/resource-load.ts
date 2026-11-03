/**
 * gantt 资源负荷计算（纯函数、零运行时依赖；`show-resource-load` 属性与 Pro helper 共用实现）：
 * - 本体居 `src/shared/`：oas-gantt 组件的 `show-resource-load` 属性**静态**消费它（同步渲染、
 *   SSR 快照可用），`data/resource/load` Pro helper 入口 re-export 同一份实现——组件属性触发
 *   属运行时需求，实现随组件链进 L1/data 族包（resourcePool 改归 capability 的同款判定），
 *   而 helper 入口路径本身保持「无 HTML/属性触发面」的 helper 语义，不进 L1/族包
 *   （perf:size 登记表按 `/data/resource/load/` 路径标记核对，两不相扰）。
 * - 运行闭包不含组件本体 / core / i18n（GanttTask 仅 `import type`，构建期擦除）。
 * - 日历日运算 DST 安全：日索引 = Date.UTC(本地年月日) / 86400000（整天数，不经过 local 时间戳），
 *   与 oas-gantt / oas-resource 的 dayIndex 同口径；本模块自包含实现，不 import 组件文件。
 */

import type { GanttTask } from '../data/gantt/oas-gantt.js'

const DAY_MS = 86_400_000

/** 负荷时间桶粒度。 */
export type ResourceLoadUnit = 'day' | 'week' | 'month'

/** 桶数防御上限：超长区间（from/to 传错，如跨千年）截断到前 MAX_BUCKETS 个桶——
 *  对齐 gantt buildUnits 的 `guard < 5000` 量级；静默截断（防御路径，不进正常业务量纲）。 */
const MAX_BUCKETS = 5000

export interface ResourceLoadOptions {
  /** 时间桶粒度；缺省 day；非法值回落 day */
  unit?: ResourceLoadUnit
  /** 统计起点（'YYYY-MM-DD'，含端）；缺省取参与任务最早 start；非法忽略（回落推导） */
  from?: string
  /** 统计终点（'YYYY-MM-DD'，含端）；缺省取参与任务最晚 end；早于 from 时自动交换 */
  to?: string
  /** 周起始日（0=周日…6=周六；unit=week 桶锚定用）；缺省 1（周一，ISO 周语义） */
  weekStart?: number
  /**
   * 资源池快照（`getSharedResourcePool().list()` 兼容的 `{ id?, name? }` 形状；ResourceItem 可直接传入）：
   * id 与名称均非空时 ResourceLoadRow.name 取池名称；未提供 / 池外 id 时行名由宿主按 id 展示。
   */
  pool?: Array<{ id?: string; name?: string }>
}

export interface ResourceLoadRow {
  /** 资源 id（任务 resources 引用；池外 id 一样列出——负荷视图不要求资源已登记池） */
  id: string
  /** 展示名称：pool 命中且名称非空时提供；未提供 pool / 池外 id 省略 */
  name?: string
  /**
   * 每桶覆盖日数：**逐任务累计**（任务∩桶求交，日精度含端）——同资源任务在桶内重叠时
   * 会累计出超过桶天数的值，负荷% = buckets[i] / bucketDays[i]，>100% 即超配
   * （与 pool 超配检测「同资源区间交叠」同语义，只是按桶聚合并可视化）。
   */
  buckets: number[]
  /** 峰值桶覆盖日数 = max(buckets)；无桶时 0 */
  peak: number
}

export interface ResourceLoadResult {
  /** 资源行（按资源 id 在任务 resources 中的**首次出现序**；输入确定性，重复调用逐项相同） */
  resources: ResourceLoadRow[]
  /** 首桶起始 ISO 日（day=from 当日；week=含 from 的 weekStart 起始周；month=含 from 的当月 1 日）；无参与任务时 '' */
  bucketStart: string
  /** 每桶天数（[from,to] ∩ 桶的实际天数；week/month 首尾桶可为部分桶，但每桶 ≥1 天）；无桶时 [] */
  bucketDays: number[]
  /** 归一后的粒度 */
  unit: ResourceLoadUnit
}

/** 日期串完整锚定（对齐核心 parseISODate 收敛域）：'YYYY-MM-DD[ T]HH:mm[:ss]'；拒绝其他后缀（含 Z/UTC 偏移） */
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/

/** 'YYYY-MM-DD…' → 自 epoch 起的整天数（本地日历日；UTC 毫秒整除，DST 安全）；非法返回 null。
 *  对齐核心清洗「带时刻输入截断到当日」：合法时刻成分校验后按日粒度取日期（hh≤23 / mm≤59 / ss≤59）。 */
function dayIndexOf(iso: unknown): number | null {
  if (typeof iso !== 'string') return null
  const m = DAY_RE.exec(iso.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  if (m[4] != null) {
    const hh = Number(m[4])
    const mi = Number(m[5])
    const ss = m[6] != null ? Number(m[6]) : 0
    if (hh > 23 || mi > 59 || ss > 59) return null
  }
  const dt = new Date(y, mo - 1, d)
  // 越界校验：Date 会把 02-30 滚动到 03-02，必须回读确认是真实存在的一天
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  const idx = Math.round(Date.UTC(y, mo - 1, d) / DAY_MS)
  return Number.isFinite(idx) ? idx : null
}

/** 日索引 → ISO 'YYYY-MM-DD'（日索引按 UTC 归一，UTC getter 即恢复日历日） */
function isoOf(idx: number): string {
  const d = new Date(idx * DAY_MS)
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${dd}`
}

/** 日索引 → 本地星期几（0=周日…6=周六） */
function dayOfWeek(idx: number): number {
  return new Date(idx * DAY_MS).getUTCDay()
}

/** 日索引 → [年, 月(0 基), 日]（UTC getter 恢复日历日） */
function calendarOf(idx: number): [number, number, number] {
  const d = new Date(idx * DAY_MS)
  return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()]
}

/** 参与负荷统计的任务（清洗产物，日索引区间 + 清洗后资源 id） */
interface LoadTask {
  /** 覆盖首日（含） */
  startIdx: number
  /** 覆盖末日（含） */
  endIdx: number
  resources: string[]
}

/** 拍平行（与清洗层 flattenInput / evm / csv 同序：父在前、子随后） */
interface FlatRow {
  task: GanttTask
  /** 生效父指针：来自嵌套时为最近带 id 祖先；顶层为显式 parent 字段（非空字符串）或 null */
  parent: string | null
  hasChildren: boolean
}

function flattenTasks(v: unknown, out: FlatRow[], parent: string | null): void {
  if (!Array.isArray(v)) return
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue
    const task = item as GanttTask
    const hasChildren = Array.isArray(task.children)
    out.push({ task, parent, hasChildren })
    if (hasChildren) {
      const pid = typeof task.id === 'string' && task.id !== '' ? task.id : null
      flattenTasks(task.children, out, pid)
    }
  }
}

/**
 * 任务清洗（gantt 清洗口径的**最小子集**，注释留档——与组件 sanitizeTasks 的差集仅约束类字段：
 * - **name 必填非空**：gantt 清洗同款——缺名任务在组件里不会渲染成条，负荷统计不为其计数，
 *   保证「负荷视图」与「任务条」看到的任务集合一致；
 * - start 合法必填（非法丢弃）；end 缺省/非法 → 按里程碑（点不占资源工期，贡献 0 天）；
 *   显式 type 'milestone' 同款——对齐 computeResourceConflicts 的 `type === 'milestone' || !t.end` 口径；
 * - end 早于 start → 自愈交换（对齐清洗层，负区间不出现）；
 * - end 带时刻且恰为 00:00 → 末日按前一日（gantt endDayIndex「渲染右缘、日精度含端」同款）；
 * - summary（显式 type / 有 children / 被其他任务 parent 指针引用）不参与：聚合形态无资源语义；
 * - resources：数组内字符串 trim 去空、去重（同组件清洗）；无有效 resources 的任务不参与。
 */
function prepareTasks(tasks: readonly unknown[]): LoadTask[] {
  const flat: FlatRow[] = []
  flattenTasks(tasks, flat, null)
  // summary 判定一：被 parent 指针引用的 id（显式 parent 与嵌套拍平都算）
  const referenced = new Set<string>()
  for (const row of flat) {
    if (typeof row.parent === 'string' && row.parent !== '') referenced.add(row.parent)
  }
  const out: LoadTask[] = []
  for (const row of flat) {
    const task = row.task
    if (typeof task.name !== 'string' || task.name === '') continue
    const startIdx = dayIndexOf(task.start)
    if (startIdx === null) continue
    // summary 判定二：显式 type 或有子级（聚合形态无资源语义，同 conflicts 的 hasChildren 口径）
    if (task.type === 'summary' || row.hasChildren) continue
    const id = typeof task.id === 'string' ? task.id : ''
    if (id !== '' && referenced.has(id)) continue
    if (task.type === 'milestone') continue
    const endRaw = typeof task.end === 'string' ? task.end.trim() : ''
    let endIdx: number | null = endRaw !== '' ? dayIndexOf(endRaw) : null
    if (endIdx !== null && endRaw.length > 10 && endRaw.slice(11, 16) === '00:00') endIdx -= 1
    if (endIdx === null) continue
    let s = startIdx
    let e = endIdx
    if (e < s) [s, e] = [e, s]
    if (!Array.isArray(task.resources)) continue
    const resources = [
      ...new Set(
        task.resources.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()),
      ),
    ]
    if (resources.length === 0) continue
    out.push({ startIdx: s, endIdx: e, resources })
  }
  return out
}

/**
 * 计算资源负荷（桶统计）。
 *
 * 口径（与 gantt 冲突检测/渲染同源，详见各接口与 prepareTasks 注释）：
 * - 时间桶：unit=day 逐日历日；unit=week 自「含 from 的 weekStart 起始周」起每 7 天一桶；
 *   unit=month 逐自然月。桶只覆盖 [from, to]，首尾桶按区间裁剪（bucketDays 为实际天数）。
 * - 负荷值：每资源每桶 = Σ(该资源每条任务的覆盖日∩桶天数)，重叠任务逐任务累计 → 可超桶天数；
 *   里程碑按点计 0 天、summary 不参与；池外资源 id 一样列出（负荷视图不要求登记池）。
 * - 输出确定性：资源按 id 首次出现序（Map 插入序）；输入不 mutate；桶数上限 MAX_BUCKETS。
 */
export function computeResourceLoad(
  tasks: readonly GanttTask[] | readonly unknown[],
  options: ResourceLoadOptions = {},
): ResourceLoadResult {
  const unit: ResourceLoadUnit = options.unit === 'week' || options.unit === 'month' ? options.unit : 'day'
  const rawWeekStart = options.weekStart
  const weekStart =
    typeof rawWeekStart === 'number' && Number.isInteger(rawWeekStart) && rawWeekStart >= 0 && rawWeekStart <= 6
      ? rawWeekStart
      : 1
  const prepared = prepareTasks(tasks)

  // from/to：显式合法值优先（颠倒自动交换）；缺省取参与任务 min/max（无参与任务 → 空结果）
  let fromIdx = dayIndexOf(options.from)
  let toIdx = dayIndexOf(options.to)
  if (fromIdx === null || toIdx === null) {
    if (prepared.length === 0) {
      return { resources: [], bucketStart: '', bucketDays: [], unit }
    }
    let min = prepared[0]!.startIdx
    let max = prepared[0]!.endIdx
    for (const t of prepared) {
      if (t.startIdx < min) min = t.startIdx
      if (t.endIdx > max) max = t.endIdx
    }
    if (fromIdx === null) fromIdx = min
    if (toIdx === null) toIdx = max
  }
  if (toIdx < fromIdx) [fromIdx, toIdx] = [toIdx, fromIdx]

  // 桶 0 锚点：day = from 当日；week = 含 from 的 weekStart 起始周首日；month = 含 from 的当月 1 日
  let anchorIdx = fromIdx
  let anchorY = 0
  let anchorMo = 0
  if (unit === 'week') {
    anchorIdx = fromIdx - ((dayOfWeek(fromIdx) - weekStart + 7) % 7)
  } else if (unit === 'month') {
    ;[anchorY, anchorMo] = calendarOf(fromIdx)
    anchorIdx = Math.round(Date.UTC(anchorY, anchorMo, 1) / DAY_MS)
  }

  // 桶区间与桶天数（首尾桶按 [from,to] 裁剪；循环条件保证每桶 ∩ 区间非空 → bucketDays ≥ 1）
  const bucketStartIdx: number[] = []
  const bucketEndIdx: number[] = []
  const bucketDays: number[] = []
  for (let k = 0; k < MAX_BUCKETS; k++) {
    let s: number
    let e: number
    if (unit === 'day') {
      s = anchorIdx + k
      e = s
    } else if (unit === 'week') {
      s = anchorIdx + k * 7
      e = s + 6
    } else {
      s = Math.round(Date.UTC(anchorY, anchorMo + k, 1) / DAY_MS)
      e = Math.round(Date.UTC(anchorY, anchorMo + k + 1, 0) / DAY_MS) // 次月 0 日 = 当月最后一天
    }
    if (s > toIdx) break
    bucketStartIdx.push(s)
    bucketEndIdx.push(e)
    bucketDays.push(Math.min(e, toIdx) - Math.max(s, fromIdx) + 1)
  }

  // 逐资源逐桶累计覆盖日（任务∩桶求交；重叠任务逐任务累计）
  const n = bucketStartIdx.length
  const byResource = new Map<string, number[]>()
  for (const t of prepared) {
    for (const rid of t.resources) {
      let buckets = byResource.get(rid)
      if (!buckets) {
        buckets = new Array<number>(n).fill(0)
        byResource.set(rid, buckets)
      }
      for (let k = 0; k < n; k++) {
        const lo = Math.max(t.startIdx, bucketStartIdx[k]!)
        const hi = Math.min(t.endIdx, bucketEndIdx[k]!)
        if (hi >= lo) buckets[k]! += hi - lo + 1
      }
    }
  }

  // 池名称表（同 id 保留末次——对齐 ResourcePool.register 的同 id 覆盖语义；非法条目跳过）
  const poolNames = new Map<string, string>()
  if (Array.isArray(options.pool)) {
    for (const item of options.pool) {
      if (typeof item !== 'object' || item === null) continue
      const pid = typeof item.id === 'string' ? item.id : ''
      const pname = typeof item.name === 'string' && item.name !== '' ? item.name : ''
      if (pid !== '' && pname !== '') poolNames.set(pid, pname)
    }
  }

  const resources: ResourceLoadRow[] = []
  for (const [id, buckets] of byResource) {
    let peak = 0
    for (const v of buckets) if (v > peak) peak = v
    const name = poolNames.get(id)
    resources.push(name !== undefined ? { id, name, buckets, peak } : { id, buckets, peak })
  }
  return {
    resources,
    bucketStart: n > 0 ? isoOf(bucketStartIdx[0]!) : '',
    bucketDays,
    unit,
  }
}
