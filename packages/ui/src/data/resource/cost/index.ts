/**
 * resource 任务成本核算（Pro helper 子路径，纯函数、零运行时依赖）：
 * - 按需引入：`@oas-ui/ui/data/resource/cost`（`import { computeCost }`）；
 *   运行闭包不含 oas-resource 组件本体 / core / i18n（类型仅 `import type`，构建期擦除）。
 * - 日期运算 DST 安全：日索引 = Date.UTC(本地年月日) / 86400000（整天数），
 *   与 oas-gantt / oas-resource 的 dayDiff 同口径；本模块自包含实现，不 import 组件文件。
 */

import type { ResourceTask } from '../oas-resource.js'

const DAY_MS = 86_400_000

/** 日期串完整锚定（对齐核心 parseISODate 收敛域）：'YYYY-MM-DD[ T]HH:mm[:ss]'；拒绝其他后缀（含 Z/UTC 偏移） */
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/

/** 'YYYY-MM-DD…' → 自 epoch 起的整天数（本地日历日；UTC 毫秒整除，DST 安全）；非法返回 null。
 *  对齐核心清洗「带时刻输入截断到当日」：合法时刻成分校验后按日粒度取日期（hh≤23 / mm≤59 / ss≤59）。 */
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

export interface ResourceCostOptions {
  /** 资源 id → 时薪；任务未分配资源 / 资源无费率时资源路径贡献 0 */
  resourceHourly?: Record<string, number>
  /** 任务 id → 整包成本；命中（有限数）时优先于资源时薪推导 */
  taskCost?: Record<string, number>
  /** 每工作日小时数（缺省 8；非有限数或负数回落 8，0 表示零人力成本） */
  hoursPerDay?: number
}

export interface ResourceCostResult {
  /** 逐任务成本（全额；键 = 任务 id，无原型容器——id 撞 Object.prototype 键名也安全） */
  perTask: Record<string, number>
  /**
   * 逐资源分摊成本：任务成本按「实际计费的分配资源数」**均摊**（每资源得 cost / n）。
   * 口径：只有「分配且在 resourceIds 集合内且有有限费率」的资源参与计费与分摊
   * （谁计费谁分摊；无费率 / 不在集合内的分配不分摊也不计费）。
   */
  perResource: Record<string, number>
  /** 总成本 = Σ perTask */
  total: number
}

/**
 * 资源任务成本核算。
 *
 * 口径（对齐 oas-resource 清洗层）：
 * - 日期归一日精度：**带时刻输入截断到当日**（时刻合法性校验，非法整体拒收）。
 * - 工期 = end − start + 1（**end 含当日**，与组件的日粒度负载口径一致）；
 *   **end 早于 start 自愈交换**（对齐清洗层，负工期不出现）。
 * - 任务成本：taskCost[id]（有限数）优先；否则 Σ(已分配资源：工期天数 × hoursPerDay × 时薪)；
 *   未分配 / 资源无费率 → 0。
 * - `resourceIds` 限定/校验资源集合：分配中不在集合内的资源 id **不计费**也不分摊；
 *   集合内重复 id 去重。
 * - perResource 均摊口径：任务成本由「实际计费的分配资源数」均摊（见类型注释）；
 *   perTask 为全额，total = Σ perTask（= Σ perResource，浮点求和路径不同可能有 1ulp 级差异）。
 * - 跳过项：缺 id / start / end 非法的任务不计入 perTask；任务 id 重复时首条生效、后续跳过。
 * - perTask / perResource 用无原型容器（Object.create(null)）承载：
 *   任务 id 为 `constructor` / `toString` / `__proto__` 等原型键名时不会被误判/误读。
 */
export function computeCost(
  tasks: ResourceTask[],
  resourceIds: string[],
  opts?: ResourceCostOptions,
): ResourceCostResult {
  const billable = new Set<string>()
  for (const id of resourceIds ?? []) if (typeof id === 'string' && id !== '') billable.add(id)

  const hoursPerDayRaw = num(opts?.hoursPerDay)
  const hoursPerDay = hoursPerDayRaw !== null && hoursPerDayRaw >= 0 ? hoursPerDayRaw : 8
  const taskCost = opts?.taskCost
  const resourceHourly = opts?.resourceHourly

  // 无原型容器：id 撞 Object.prototype 键名（constructor/toString/__proto__…）不被误判/误读
  const perTask: Record<string, number> = Object.create(null)
  const perResource: Record<string, number> = Object.create(null)
  const seenIds = new Set<string>()

  for (const task of tasks ?? []) {
    if (typeof task !== 'object' || task === null) continue
    const id = task.id
    if (typeof id !== 'string' || id === '' || seenIds.has(id)) continue
    const startIdx = dayIndex(task.start)
    const endIdx = dayIndex(task.end)
    if (startIdx === null || endIdx === null) continue
    seenIds.add(id)
    // end 早于 start 自愈交换（对齐清洗层）；工期 = 含端天数，负工期不出现
    const durationDays = Math.abs(endIdx - startIdx) + 1
    const hours = durationDays * hoursPerDay

    const explicit = taskCost ? num(taskCost[id]) : null
    let cost = 0
    if (explicit !== null) {
      cost = explicit
    } else {
      // 资源路径：只统计「已分配 ∩ resourceIds ∩ 有有限费率」的资源
      for (const rid of task.resources ?? []) {
        if (typeof rid !== 'string' || !billable.has(rid)) continue
        const rate = resourceHourly ? num(resourceHourly[rid]) : null
        if (rate === null) continue
        cost += hours * rate
      }
    }

    perTask[id] = cost
    // 均摊：谁计费谁分摊（taskCost 整包按「分配 ∩ 集合」的资源数均摊；无费率资源不参与）
    if (cost !== 0) {
      const billed: string[] = []
      for (const rid of task.resources ?? []) {
        if (typeof rid !== 'string' || !billable.has(rid)) continue
        if (explicit === null && (resourceHourly ? num(resourceHourly[rid]) : null) === null) continue
        if (!billed.includes(rid)) billed.push(rid)
      }
      if (billed.length > 0) {
        const share = cost / billed.length
        for (const rid of billed) perResource[rid] = (perResource[rid] ?? 0) + share
      }
    }
  }

  let total = 0
  for (const v of Object.values(perTask)) total += v
  return { perTask, perResource, total }
}
