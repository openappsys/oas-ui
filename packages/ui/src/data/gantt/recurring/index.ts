/**
 * gantt 周期任务展开（Pro helper 子路径，纯函数、零运行时依赖）：
 * - 按需引入：`@oas-ui/ui/data/gantt/recurring`（`import { expandRecurring }`）；
 *   运行闭包不含 oas-gantt 组件本体 / core / i18n（类型仅 `import type`，构建期擦除）。
 * - 日期运算 DST 安全：日索引 = Date.UTC(本地年月日) / 86400000（整天数）、
 *   日期回读经本地 Date 构造（new Date(y, m, d + n)），与 oas-gantt 的 dayIndex 同口径；
 *   本模块自包含实现，不 import 组件文件。
 */

import type { GanttTask } from '../oas-gantt.js'

const DAY_MS = 86_400_000

/** 周期规则（挂在任务对象 `recurring` 字段上；GanttTask 的索引签名允许携带） */
export interface GanttRecurringRule {
  /** 频率：每日 / 每周 / 每月 */
  freq: 'daily' | 'weekly' | 'monthly'
  /** 间隔（缺省 1；<1 或非有限按 1，小数向下取整） */
  interval?: number
  /** 每周生效星期（0=周日…6=周六）；缺省 = [master start 的星期]；非法值剔除、全非法回落缺省 */
  byWeekday?: number[]
  /**
   * 最多发生次数（按整个序列的发生计，含窗口外/窗口前的发生）。
   * **缺省 = 不限；提供但非法（< 1 或非有限）→ 整条规则无效，master 不展开**。
   */
  count?: number
  /**
   * 截止日期 'YYYY-MM-DD'（发生晚于该日即终止序列）。
   * **缺省 = 不限；提供但不可解析 → 整条规则无效，master 不展开**。
   */
  until?: string
}

/** 周期任务 = GanttTask + recurring 规则 */
export interface GanttRecurringTask extends GanttTask {
  recurring?: GanttRecurringRule
}

export interface ExpandRecurringOptions {
  /** 保留 master 本身（缺省剔除，只输出实例；保留时 master 在其实例之前） */
  keepMaster?: boolean
}

/** 日期串完整锚定（对齐核心 parseISODate 收敛域）：'YYYY-MM-DD[ T]HH:mm[:ss]'；拒绝其他后缀（含 Z/UTC 偏移） */
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/

/** 'YYYY-MM-DD…' → 自 epoch 起的整天数；非法返回 null。时刻成分校验（hh≤23 / mm≤59 / ss≤59） */
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

/** 提取 hour 成分（'T…' 或 ' …'，跟随日期之后原样保留）；串已过 DAY_RE 锚定 */
function timeSuffix(iso: string): string {
  const trimmed = iso.trim()
  return trimmed.length > 10 ? trimmed.slice(10) : ''
}

/** 拆日期串 → 日索引 + hour 成分；非法返回 null */
function parseDay(iso: unknown): { idx: number; suffix: string } | null {
  if (typeof iso !== 'string') return null
  const idx = dayIndex(iso)
  if (idx === null) return null
  return { idx, suffix: timeSuffix(iso) }
}

/** 日索引 → 'YYYY-MM-DD'（本地 Date 构造回读，DST 安全） */
function formatDay(idx: number): string {
  const dt = new Date(1970, 0, 1 + idx)
  const mo = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mo}-${d}`
}

/** 日索引的星期（0=周日…6=周六）；epoch 1970-01-01 是周四 */
function weekdayOf(idx: number): number {
  return (((idx + 4) % 7) + 7) % 7
}

const FREQS = new Set(['daily', 'weekly', 'monthly'])

/**
 * 周期任务展开。
 *
 * 口径与边界（v1）：
 * - 仅处理**顶层数组**：非周期任务原样透传（引用不变）；嵌套 children 原样随父透传，
 *   v1 不展开子树（master 带 children 且被剔除时子任务 parent 悬空，由组件清洗层按根渲染）。
 * - master 识别：`recurring` 为合法规则对象（freq 合法）+ 有非空 id + start 可解析 +
 *   **count / until 提供时合法**（count < 1 / 非有限、until 不可解析 → 整条规则无效，
 *   master 视为普通任务透传，不展开）；否则视为普通任务。
 * - 输出 = 非周期任务 + 实例；实例在 master 原位置按发生时间序展开。默认剔除 master；
 *   `keepMaster: true` 时 master 保留在其实例之前。
 * - 实例：id `${masterId}#${seq}`（seq = 序列内第几次发生，从 1 起，**不随窗口变化**——同一次发生
 *   在不同窗口下 id 稳定）、`masterId`、`recurringInstance: true`、`progress: 0`；
 *   日期平移保工期（end − start 天数）与 start/end 的 hour 成分。
 *   **实例与 master 的差异**：剥除 `children`（避免 N 份重复子行）、剥除 `dependencies`（依赖相对
 *   master 的语义不随平移成立）、剥除 `recurring`（防止二次展开）；`type` 若为 summary 强转 task
 *   （带 children 的 recurring summary 语义可疑，实例不继承摘要性）、milestone 保持；
 *   其余字段浅拷贝 master，**数组值字段切片克隆**（resources/deadlines 等与 master 引用隔离）。
 * - 发生（occurrence）自 master start 起按规则生成；**count 计整个序列的发生**
 *   （窗口前/外的发生同样消耗 count）；窗口 [range.start, range.end] 按发生日期（含端）过滤输出。
 *   终止取先达成者：count 用尽 / 序列右界（min(range.end, until)）已越。
 * - weekly：周锚点 = master start 所在周的**周一**，间隔按周数取模；周日归属锚点周（锚 +6）；
 *   缺省 byWeekday = [start 的星期]。
 * - monthly：同月日（如每月 31 日）；**短月无该日则跳过该月**（不顺延/前移到月末）。
 * - range 非法或 start > end → 窗口为空：只输出非周期任务（与 keepMaster 的 master），不生成发生。
 * - 日期串完整锚定（拒绝非法时刻 / 截断尾码 / Z 等后缀）；缺 id / start 非法 / recurring 非法的
 *   任务一律视为普通任务透传。
 */
export function expandRecurring(
  tasks: GanttTask[],
  range: { start: string; end: string },
  opts?: ExpandRecurringOptions,
): GanttTask[] {
  const out: GanttTask[] = []
  const rangeStart = dayIndex(range?.start)
  const rangeEnd = dayIndex(range?.end)
  const windowed = rangeStart !== null && rangeEnd !== null && rangeEnd >= rangeStart

  for (const task of tasks ?? []) {
    if (typeof task !== 'object' || task === null) continue
    const rule = (task as GanttRecurringTask).recurring
    const masterId = task.id
    const start = parseDay(task.start)
    // count / until：缺省 = 不限；提供但非法 → 整条规则无效（master 不展开）
    const count = rule?.count
    const countInvalid = count !== undefined && (typeof count !== 'number' || !Number.isFinite(count) || count < 1)
    const untilInvalid = rule?.until !== undefined && dayIndex(rule.until) === null
    const isMaster =
      typeof rule === 'object' &&
      rule !== null &&
      FREQS.has(rule.freq) &&
      typeof masterId === 'string' &&
      masterId !== '' &&
      start !== null &&
      !countInvalid &&
      !untilInvalid
    if (!isMaster) {
      out.push(task)
      continue
    }

    if (opts?.keepMaster === true) out.push(task)

    // —— 规则归一化（isMaster 守卫后 count/until 只可能是合法或缺省）——
    const freq = rule!.freq
    const interval =
      typeof rule!.interval === 'number' && Number.isFinite(rule!.interval) && rule!.interval >= 1
        ? Math.floor(rule!.interval)
        : 1
    const defaultWeekday = weekdayOf(start!.idx)
    const byWeekdayRaw = Array.isArray(rule!.byWeekday)
      ? rule!.byWeekday.filter((w) => typeof w === 'number' && Number.isInteger(w) && w >= 0 && w <= 6)
      : []
    // 周内按「距周一的偏移」升序 → 生成保持时间序
    const weekdayOffsets = [...new Set(byWeekdayRaw.length > 0 ? byWeekdayRaw : [defaultWeekday])]
      .map((w) => (w + 6) % 7)
      .sort((x, y) => x - y)
    const countLimit =
      typeof rule!.count === 'number' && Number.isFinite(rule!.count) && rule!.count >= 1
        ? Math.floor(rule!.count)
        : null
    const untilIdx = rule!.until != null ? dayIndex(rule!.until) : null
    // 窗口无效（start/end 不可解析或 start > end）→ 不生成任何发生（emit 的 null 比较会全放行，必须先短路）
    if (!windowed) continue

    const seriesEnd = Math.min(rangeEnd!, untilIdx ?? Number.MAX_SAFE_INTEGER)

    // —— 发生序列 + 输出（master start 起；右界 = min(range.end, until)，有限必终止）——
    const endParsed = parseDay(task.end)
    const durationDays = endParsed === null ? 0 : endParsed.idx - start!.idx
    let seen = 0 // 序列内发生计数（含窗口外，消耗 count；同时作为实例 seq）
    const emit = (occ: number): boolean => {
      seen += 1
      if (countLimit !== null && seen > countLimit) return false // count 用尽（含窗外发生）→ 终止
      if (occ < rangeStart! || occ > rangeEnd!) return true // 窗口外：计数但不输出
      const instance: GanttTask = { ...task }
      // 剥除：recurring（防二次展开）/ dependencies（依赖语义不随平移成立）/ children（避免 N 份重复子行）
      delete (instance as GanttRecurringTask).recurring
      delete instance.dependencies
      delete instance.children
      // type 强转：summary 实例不继承摘要性（无 children 的 summary 语义可疑）→ task；milestone 保持
      if (instance.type === 'summary') instance.type = 'task'
      // 数组值字段切片克隆：实例与 master 的数组引用隔离（改实例数组不串改 master）
      for (const key of Object.keys(instance)) {
        const value = (instance as Record<string, unknown>)[key]
        if (Array.isArray(value)) (instance as Record<string, unknown>)[key] = [...value]
      }
      instance.id = `${masterId}#${seen}`
      instance.masterId = masterId
      instance.recurringInstance = true
      instance.start = formatDay(occ) + start!.suffix
      if (durationDays > 0) instance.end = formatDay(occ + durationDays) + endParsed!.suffix
      else delete instance.end
      instance.progress = 0
      out.push(instance)
      return true
    }

    if (freq === 'daily') {
      for (let idx = start!.idx; idx <= seriesEnd; idx += interval) {
        if (!emit(idx)) break
      }
    } else if (freq === 'weekly') {
      // 周锚点 = master start 所在周的周一；周日偏移 = +6（归属锚点周）
      const anchor = start!.idx - ((weekdayOf(start!.idx) + 6) % 7)
      let aborted = false
      for (let week = anchor; week <= seriesEnd && !aborted; week += 7 * interval) {
        for (const offset of weekdayOffsets) {
          const idx = week + offset
          if (idx < start!.idx) continue // 周内 master start 之前不发生
          if (idx > seriesEnd) break
          if (!emit(idx)) {
            aborted = true // count 用尽：内层退出后外层一并终止
            break
          }
        }
      }
    } else {
      // monthly：同月日；映射日单调递增必越过右界（有限终止）；短月无该日（Date 滚到下月）→ 跳过该月
      const base = new Date(1970, 0, 1 + start!.idx)
      const dayOfMonth = base.getDate()
      for (let m = 0; ; m += interval) {
        const dt = new Date(base.getFullYear(), base.getMonth() + m, dayOfMonth)
        const idx = Math.round(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) / DAY_MS)
        if (idx > seriesEnd) break
        if (dt.getDate() !== dayOfMonth) continue // 短月无该日 → 跳过该月（不顺延到月末）
        if (!emit(idx)) break
      }
    }
  }
  return out
}
