/**
 * gantt 挣值管理（EVM）计算（Pro helper 子路径，纯函数、零运行时依赖）：
 * - 按需引入：`@oas-ui/ui/data/gantt/evm`（`import { computeEvm }`）；
 *   运行闭包不含 oas-gantt 组件本体 / core / i18n（类型仅 `import type`，构建期擦除）。
 * - 日期运算 DST 安全：日索引 = Date.UTC(本地年月日) / 86400000（整天数，不经过 local 时间戳），
 *   与 oas-gantt 的 dayIndex 同口径；本模块自包含实现，不 import 组件文件。
 */

import type { GanttTask } from '../oas-gantt.js'

const DAY_MS = 86_400_000

/** 逐资源时薪 + 逐任务整包预算（taskCost 优先于资源时薪推导） */
export interface GanttEvmRates {
  /** 资源 id → 时薪；任务未分配资源或资源无费率时该路径贡献 0 */
  resourceHourly?: Record<string, number>
  /** 任务 id → 整包预算；命中（有限数）时完全替代资源时薪推导 */
  taskCost?: Record<string, number>
}

export interface GanttEvmOptions {
  /** 费率表（必填） */
  rates: GanttEvmRates
  /** 状态日期 'YYYY-MM-DD'（PV 截止日；非法/缺省按「早于所有任务」处理 → PV 全 0） */
  statusDate: string
  /**
   * 实际成本：number = 全项目总额；Record = 逐任务实际成本（对缺失任务键按 0 求和）；
   * 缺省（或非有限数）= EV（中性口径：AC 缺数据时按「成本绩效恰好达标」记，CPI = 1）
   */
  actualCost?: number | Record<string, number>
  /** 每工作日小时数（缺省 8；非有限数或负数回落 8，0 表示零人力成本） */
  hoursPerDay?: number
}

/** 单任务 EVM 中间量 */
export interface GanttEvmTaskResult {
  id: string
  name: string
  /** 完工预算 BAC（本任务） */
  budget: number
  /** 计划价值 PV（状态日止应完成比例 × budget） */
  planned: number
  /** 挣值 EV（实际进度 × budget） */
  earned: number
}

export interface GanttEvmResult {
  /** 计划价值合计 */
  pv: number
  /** 挣值合计 */
  ev: number
  /** 实际成本合计 */
  ac: number
  /** 进度偏差 sv = ev − pv */
  sv: number
  /** 成本偏差 cv = ev − ac */
  cv: number
  /** 进度绩效指数 spi = ev/pv（pv = 0 时为 null——无计划基线可除） */
  spi: number | null
  /** 成本绩效指数 cpi = ev/ac（ac = 0 时为 null——无实际成本可除） */
  cpi: number | null
  /** 逐任务结果（拍平后输入顺序，不含摘要） */
  byTask: GanttEvmTaskResult[]
}

/** 拍平行（与清洗层 flattenInput 同序：父在前、子随后） */
interface FlatRow {
  task: GanttTask
  /** 嵌套父 id（无带 id 祖先为 null；fromNest 语义与 flattenInput 一致） */
  nestParent: string | null
}

function flattenTasks(v: unknown, out: FlatRow[]): void {
  if (!Array.isArray(v)) return
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue
    const task = item as GanttTask
    const pid = typeof task.id === 'string' && task.id !== '' ? task.id : null
    out.push({ task, nestParent: Array.isArray(task.children) ? pid : null })
    if (Array.isArray(task.children)) flattenTasks(task.children, out)
  }
}

/** 日期串完整锚定（对齐核心 parseISODate 收敛域）：'YYYY-MM-DD[ T]HH:mm[:ss]'；拒绝其他后缀（含 Z/UTC 偏移） */
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/

/** 'YYYY-MM-DD…' → 自 epoch 起的整天数（本地日历日；UTC 毫秒整除，DST 安全）；非法返回 null。
 *  日粒度 helper：合法时刻成分校验后截断到当日（hh≤23 / mm≤59 / ss≤59）。 */
function dayIndex(iso: unknown): number | null {
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

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/**
 * 挣值管理（EVM）计算。
 *
 * 口径（日精度，与 gantt 清洗层/CPM 一致）：
 * - 输入先按清洗层同款顺序拍平嵌套 children；只统计「有 id + 有 name + start 合法 + **非摘要**」的任务：
 *   摘要（有子级——嵌套 children 或被其他任务以 `parent` 指针指向）的进度/日期由子级派生，
 *   计入会与子级**双计**，故 byTask 与 pv/ev 总额都不含摘要（对齐核心 CPM 的摘要排除口径）。
 * - **milestone：显式 `type === 'milestone'` 优先**（对齐核心 endMsOfTask）——工期按 0、`end` 忽略
 *   （预算只能来自 taskCost；PV 按 start ≤ statusDate 二值全计）；无 end / end 非法同样按工期 0。
 * - 工期天数 = end − start + 1（end 含端）；**start 晚于 end 时自愈交换**（对齐清洗层，负工期不出现）。
 * - budget = taskCost[id]（有限数优先）?? Σ(已分配资源：工期小时数 × resourceHourly[rid])；
 *   未分配资源 / 资源无费率 → 资源路径贡献 0。
 *   工期小时数 = 工期天数 × hoursPerDay。
 * - planned = budget × min(1, 已耗天数 / 工期天数)；已耗天数 = clamp(statusDate − start + 1, 0, 工期)；
 *   milestone：start ≤ statusDate 全计、否则 0；statusDate 早于 start → 0；statusDate 非法 → 全 0。
 * - earned = budget × clamp(progress, 0, 100) / 100（progress 缺省/非法按 0，与清洗层一致）。
 * - ac：number = 全局总额；Record = Σ 逐任务（缺键按 0）；缺省/非有限 = ev（中性口径，见类型注释）。
 * - spi = pv > 0 ? ev/pv : null；cpi = ac > 0 ? ev/ac : null。
 * - 日期串完整锚定（拒绝非法时刻 / 截断尾码 / Z 等后缀）；带合法时刻的输入按日粒度截断到当日。
 * - v1 日历无关：非工作日不扣减（工期按日历日），工作日口径由宿主在费率侧折算。
 */
export function computeEvm(tasks: GanttTask[], opts: GanttEvmOptions): GanttEvmResult {
  const flat: FlatRow[] = []
  flattenTasks(tasks, flat)

  // 摘要集（指针口径，与核心 childStructure 一致）：嵌套 children 非空 或 被其他任务的 parent 指向
  const summaryIds = new Set<string>()
  for (const row of flat) {
    const pid = typeof row.task.id === 'string' && row.task.id !== '' ? row.task.id : null
    if (pid !== null && Array.isArray(row.task.children) && row.task.children.length > 0) summaryIds.add(pid)
    const explicit = typeof row.task.parent === 'string' && row.task.parent !== '' ? row.task.parent : null
    if (explicit !== null) summaryIds.add(explicit)
  }
  // 显式 parent 指针只有指向本批真实任务时才算摘要（悬空按根，不掩蔽自身）
  const knownIds = new Set(flat.map((r) => r.task.id).filter((id): id is string => typeof id === 'string' && id !== ''))
  for (const id of [...summaryIds]) if (!knownIds.has(id)) summaryIds.delete(id)

  const statusIdx = dayIndex(opts.statusDate)
  const hoursPerDayRaw = num(opts.hoursPerDay)
  const hoursPerDay = hoursPerDayRaw !== null && hoursPerDayRaw >= 0 ? hoursPerDayRaw : 8
  const taskCost = opts.rates.taskCost
  const resourceHourly = opts.rates.resourceHourly

  const byTask: GanttEvmTaskResult[] = []
  let pv = 0
  let ev = 0
  for (const { task } of flat) {
    const id = task.id
    if (typeof id !== 'string' || id === '') continue
    if (typeof task.name !== 'string' || task.name === '') continue
    const startIdx = dayIndex(task.start)
    if (startIdx === null) continue
    if (summaryIds.has(id)) continue // 摘要：进度由子级派生，双计排除

    // 显式 milestone 优先（对齐核心 endMsOfTask）：工期 0、end 忽略
    const milestone = task.type === 'milestone'
    const endIdx = milestone ? null : dayIndex(task.end)
    // end 缺失/非法（非显式 milestone）→ 视为 milestone 口径（单点、工期 0），与「无 end = milestone」一致
    const isPoint = milestone || endIdx === null
    // start 晚于 end 自愈交换（对齐清洗层）：工期天数 = |end − start| + 1，负工期不出现；
    // 交换后 PV 基准 start 取较早端（清洗层会真实交换 start/end）
    const durationDays = isPoint || endIdx === null ? 0 : Math.abs(endIdx - startIdx) + 1
    const effectiveStart = isPoint || endIdx === null ? startIdx : Math.min(startIdx, endIdx)

    // 预算：taskCost 优先，否则按已分配资源时薪推导
    const explicit = taskCost ? num(taskCost[id]) : null
    let budget: number
    if (explicit !== null) {
      budget = explicit
    } else {
      budget = 0
      const durationHours = durationDays * hoursPerDay
      for (const rid of task.resources ?? []) {
        if (typeof rid !== 'string') continue
        const rate = resourceHourly ? num(resourceHourly[rid]) : null
        if (rate === null) continue
        budget += durationHours * rate
      }
    }

    // PV：已耗天数比例（milestone 二值；statusDate 非法/早于 start → 0）
    let planned = 0
    if (statusIdx !== null && statusIdx >= effectiveStart) {
      if (isPoint) {
        planned = budget
      } else {
        const elapsed = Math.min(statusIdx - effectiveStart + 1, durationDays)
        planned = durationDays > 0 ? budget * Math.min(1, elapsed / durationDays) : 0
      }
    }

    const progress = num(task.progress)
    const earned = (budget * Math.min(100, Math.max(0, progress ?? 0))) / 100

    pv += planned
    ev += earned
    byTask.push({ id, name: task.name, budget, planned, earned })
  }

  // AC：number 全局 / Record 逐任务求和 / 缺省 = EV（中性口径）
  let ac: number
  if (typeof opts.actualCost === 'number') {
    ac = Number.isFinite(opts.actualCost) ? opts.actualCost : ev
  } else if (opts.actualCost && typeof opts.actualCost === 'object') {
    ac = 0
    for (const t of byTask) {
      const v = num(opts.actualCost[t.id])
      if (v !== null) ac += v
    }
  } else {
    ac = ev
  }

  const sv = ev - pv
  const cv = ev - ac
  const spi = pv > 0 ? ev / pv : null
  const cpi = ac > 0 ? ev / ac : null
  return { pv, ev, ac, sv, cv, spi, cpi, byTask }
}
