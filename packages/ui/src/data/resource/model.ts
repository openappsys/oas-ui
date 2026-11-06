/**
 * oas-resource 数据契约与纯函数层（自 oas-resource.ts 抽核，块体逐字节平移）：
 * - 对外类型：ResourceItem / ResourceTask / ResourceScale 与事件载荷（清洗前后共用同一形状）；
 * - 内部清洗模型：RS / RT / PeriodSpan / Span——算法核（level/）入参是清洗后的
 *   RS/RT，清洗层必须与数据契约同模块（留在组件侧会形成 level → 组件 → level 循环依赖）；
 * - 清洗族：safeGet / isArraySafe / cloneCustom / sanitize* / toPublic*（全链路防抛：
 *   抛异常 accessor getter 只丢键、revoked Proxy 只丢条目，绝不抛未捕获异常）；
 * - 纯函数：parseTaskDate / addDays / calendarDaysBetween / spansOf /
 *   periodCapacity / buildPeriodSpans（本地日历日运算，跨 DST 不漂移）。
 *
 * 本模块零组件依赖（只依赖 date-grid 与 dev-warn）；oas-resource.ts 与 level/ 均从本模块导入。
 * 行为红线：各函数自 oas-resource.ts 原位平移，语义逐位不变（见各函数注释）。
 */
import { parseISODate, startOfDay, toISODate } from '../../form/calendar/date-grid.js'
import { devWarn } from '../../shared/dev-warn.js'

/** 资源（负载视图行）：id 为任务分配的引用键；capacity 缺省回落组件 capacity 属性（最终 1） */
export interface ResourceItem {
  /** 资源 id（必填，重复/空 id 丢弃） */
  id?: string
  /** 资源名（必填，缺失丢弃） */
  name: string
  /** 并行容量（正数；未启用日历时是每 period 容量，启用后是每日容量；缺省回落 capacity 属性，最终 1） */
  capacity?: number
  /**
   * 每周可用日（0=周日…6=周六）。省略且 holidays/capacityOverrides 为空时沿用旧的每 period 容量语义；
   * [] 表示全不可用；非空但全部非法时按未声明处理并 devWarn。
   */
  workdays?: number[]
  /** 假期日期（严格 YYYY-MM-DD；非空时启用逐日容量，当天容量 0；空数组视为未声明） */
  holidays?: string[]
  /**
   * 日期级容量覆盖（严格 YYYY-MM-DD → 容量；非空时启用逐日容量，优先于 workdays/holidays）。
   * 可写小数（如 0.5），但任务负载按整日计数，0.5 日无法容纳整日任务。
   */
  capacityOverrides?: Record<string, number>
  /**
   * 资源技能标签（清洗：非数组→未声明、非字符串/空串项丢弃、去重、trim）。
   * reassign 时用于 requiredSkills 硬匹配（全量）；`show-skills` 开启时行头以 chip 展示
   * （展示截断 8 个防炸行高，全量经悬浮提示可见——截断只影响展示，不影响匹配）。
   */
  skills?: string[]
  /**
   * 小时费率（纯展示数据，不参与排程/负载计算）：`show-cost` 开启时参与泳道行头成本合计
   * Σ(可见/已装载周期内任务天数 × 8h × costRate)。缺失/非有限 → 该 lane 不显示成本。
   */
  costRate?: number
  [key: string]: unknown
}

/** 资源任务：start/end 为 'YYYY-MM-DD'（日精度，end 含端）；resources 为分配的资源 id 数组 */
export interface ResourceTask {
  /** 任务 id（必填，缺失丢弃） */
  id?: string
  /** 任务名（必填，缺失丢弃） */
  name: string
  /** 开始 'YYYY-MM-DD' */
  start: string
  /** 结束 'YYYY-MM-DD'（含当日） */
  end: string
  /** 分配的资源 id 数组（指向不存在资源的分配被忽略） */
  resources?: string[]
  /** 任务优先级（数值越小越优先；缺省 0）；均载时低优先级任务先让位 */
  priority?: number
  /** 任务需要的技能（reassign 目标必须全部具备；缺省空 = 不限制） */
  requiredSkills?: string[]
  /** 所属项目键（配合 projectOrder 做跨项目优先级） */
  project?: string
  [key: string]: unknown
}

/** 刻度档：day/week/month（决定直方图 period 粒度与时间轴刻度文案） */
export type ResourceScale = 'day' | 'week' | 'month'

/** task-click 事件载荷 */
export interface ResourceTaskClickDetail {
  id: string
  task: ResourceTask
  resourceId: string
}

/** tasks-change 事件载荷 */
export interface ResourceTasksChangeDetail {
  tasks: ResourceTask[]
}

/** overload 单条超载档 */
export interface ResourceOverloadEntry {
  resourceId: string
  /** period 起始日期 'YYYY-MM-DD' */
  period: string
  load: number
  /** 该 period 的容量（启用日历时为逐日求和；否则为资源每档容量） */
  capacity: number
}

/** overload 事件载荷（每次 update 至多一个事件，聚合全部超载档） */
export interface ResourceOverloadDetail {
  overloads: ResourceOverloadEntry[]
}

/** 内部清洗后资源模型（capacity: null = 回落组件缺省容量；costRate: null = 未声明/非法）；白名单外键原样透传 */
export interface RS {
  id: string
  name: string
  capacity: number | null
  /** null = 未声明 workdays（旧语义：capacity 按 period 计，不按逐日求和） */
  workdays: number[] | null
  holidays: Set<string>
  capacityOverrides: Map<string, number> | null
  skills: string[] | null
  /** null = 未声明/非法 costRate（show-cost 下该 lane 不显示成本） */
  costRate: number | null
  [key: string]: unknown
}

/** 内部清洗后任务模型（日期已归一为本地日精度、end ≥ start）；白名单外键原样透传 */
export interface RT {
  id: string
  name: string
  start: string
  end: string
  resources: string[]
  priority: number
  requiredSkills: string[]
  project: string
  [key: string]: unknown
}

/** 任务时间跨度（负载统计与 level 迭代共用） */
export interface Span {
  startMs: number
  endMs: number
  index: number
}

/** 无文案 period（引擎用）：负载统计与 level 迭代只看 [startMs, endMs)，不需要刻度文案 */
export interface PeriodSpan {
  startMs: number
  endMs: number
}

export const SCALES: ResourceScale[] = ['day', 'week', 'month']

export const DAY_MS = 86_400_000

/** period 构建护栏（防脏数据撑爆循环） */
export const MAX_PERIODS = 5000

/** 资源已知字段（清洗时按各自口径处理）；此外的键视为宿主自定义字段，原样透传 */
export const RESERVED_RESOURCE_KEYS = new Set([
  'id',
  'name',
  'capacity',
  'workdays',
  'holidays',
  'capacityOverrides',
  'skills',
  'costRate',
])
/** 任务已知字段（清洗时按各自口径处理）；此外的键视为宿主自定义字段，原样透传 */
export const RESERVED_TASK_KEYS = new Set([
  'id',
  'name',
  'start',
  'end',
  'resources',
  'priority',
  'requiredSkills',
  'project',
])

/** 透传白名单外的自定义键时一律跳过的危险键：防 `__proto__` 等原型 setter / 内建键遮蔽 */
export const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** 属性读取哨兵：accessor getter 抛异常时返回（与合法的 undefined 值区分，供调用方按无效丢弃） */
export const READ_FAILED: unique symbol = Symbol('oas-resource-read-failed')

/**
 * 安全读取对象属性：宿主传入的对象可能带**抛异常的 accessor getter**（`Object.entries`/直接取键
 * 都会同步调用 getter 并冒泡，令 setter 抛未捕获异常）。这里逐键 try/catch，异常返回 READ_FAILED
 * 由调用方按无效丢弃——只丢该键，不影响其余键清洗。异常键的 devWarn 去重由调用方决定。
 */
export function safeGet(obj: object, key: string): unknown {
  try {
    return (obj as Record<string, unknown>)[key]
  } catch {
    return READ_FAILED
  }
}

/**
 * 顶层数组探测防抛：`Array.isArray` 走 IsArray 内部方法，**已吊销的 Proxy 会抛 TypeError**
 *（「是不是数组」这一步本身就可能炸，与条目级探测同源）。失败即视为无效输入：返回 false 并
 * 经 onInvalid 走既有无效告警通道（实例级 / 模块级去重），兑现「全链路防抛」；
 * 非数组的正常输入仍静默返回 false（不误报为结构性损坏）。
 */
export function isArraySafe(v: unknown, onInvalid?: () => void): v is unknown[] {
  try {
    return Array.isArray(v)
  } catch {
    onInvalid?.()
    return false
  }
}

/**
 * 自定义键值深拷贝（防抛外壳）：源值可能在写入与读取之间被结构性吊销（revoked Proxy——
 * `typeof` 探测不抛，但 `instanceof` / `Array.isArray` / `Object.keys` / `Object.getPrototypeOf`
 * 等结构性探测一律抛 TypeError），此处兜底返回 READ_FAILED，
 * 由调用方按「无效值」丢弃该键/该元素，兑现「读为拷贝绝不抛未捕获异常」。
 */
export function cloneCustom(v: unknown, memo?: WeakMap<object, unknown>, onKeyError?: (key: string) => void): unknown {
  try {
    return cloneCustomInner(v, memo, onKeyError)
  } catch {
    return READ_FAILED
  }
}

/**
 * 自定义键值深拷贝（实现体）：嵌套 plain object / array 逐层递归复制、Date 复制时间戳，
 * 类实例 / Set 等奇异对象与函数原样引用（组件数据契约是 JSON 可序列化面，奇异对象不擅自变形）。
 *
 * 记忆化：WeakMap 记「源对象 → 已建拷贝」（进入时登记、复用不复建）——
 * - 循环安全：再次遇到在拷中的源 → 直接返回其拷贝，拷贝图与源图同构（环闭合在拷贝上），
 *   绝不 RangeError / 栈溢出，也不静默泄漏内部引用；
 * - 共享保持：同一源对象在多处出现（兄弟位置/跨条目）→ 结果中是同一个拷贝引用，不复制成多份。
 * 递归经 cloneCustom 外壳逐层防抛：嵌套深处某层结构吊销时只让该层值无效，不冒泡到顶层调用方。
 */
function cloneCustomInner(v: unknown, memo?: WeakMap<object, unknown>, onKeyError?: (key: string) => void): unknown {
  if (v === null || typeof v !== 'object') return v
  if (v instanceof Date) return new Date(v.getTime())
  const seen = memo ?? new WeakMap<object, unknown>()
  const cached = seen.get(v)
  if (cached !== undefined) return cached
  if (Array.isArray(v)) {
    const out: unknown[] = []
    seen.set(v, out)
    for (const x of v) {
      const c = cloneCustom(x, seen, onKeyError)
      // 数组元素结构性无效（如 revoked Proxy）→ 置 null 占位（保留位序；不把会炸的引用递给宿主）
      out.push(c === READ_FAILED ? null : c)
    }
    return out
  }
  const proto = Object.getPrototypeOf(v)
  if (proto === Object.prototype || proto === null) {
    const out: Record<string, unknown> = {}
    seen.set(v, out)
    // Object.keys 不触发 getter；逐键 safeGet 读值，抛异常键丢弃（只丢该键）
    for (const k of Object.keys(v)) {
      if (UNSAFE_KEYS.has(k)) continue
      const val = safeGet(v, k)
      if (val === READ_FAILED) {
        onKeyError?.(k)
        continue
      }
      const c = cloneCustom(val, seen, onKeyError)
      if (c === READ_FAILED) {
        onKeyError?.(k)
        continue
      }
      out[k] = c
    }
    return out
  }
  return v
}

/**
 * 解析 'YYYY-MM-DD'（非法返回 null；与 gantt 同口径走 parseISODate）。
 * 仅日精度：带时刻输入截断到本地当日 00:00（文档承诺「带时刻输入按日处理」）。
 */
export function parseTaskDate(s: unknown): Date | null {
  if (typeof s !== 'string') return null
  const d = parseISODate(s.trim())
  return d ? startOfDay(d) : null
}

/** 本地日历日加减：结果恒为本地 00:00，跨 DST 边界不漂移（毫秒加减会偏移 1 小时） */
export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** 日历日差（b − a，忽略时刻/时区偏移；UTC 归一规避 DST 导致的 23/25 小时误差） */
export function calendarDaysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((ub - ua) / DAY_MS)
}

/** 容量清洗：正有限数才有效，其余回落 null（= 用组件缺省容量） */
export function sanitizeCapacity(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return null
  return v
}

/** 小时费率清洗（show-cost）：有限非负数才有效；缺失/负数/非有限回落 null（= 该 lane 不显示成本） */
function sanitizeCostRate(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null
  return v
}

export function hasCalendar(r: RS): boolean {
  // workdays 空数组是「显式全不可用」；空 holidays / 空 capacityOverrides 视为未声明，
  // 避免宿主用默认空配置时把旧「每档 capacity」语义悄悄切换成逐日语义。
  return r.workdays !== null || r.holidays.size > 0 || (r.capacityOverrides?.size ?? 0) > 0
}

let invalidWorkdaysWarned = false

function sanitizeWorkdays(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null
  if (v.length === 0) return []
  const out = new Set<number>()
  for (const n of v) if (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 6) out.add(n)
  if (out.size === 0) {
    // 非空但全部非法（字符串化、1..7 约定、越界）→ 按未声明处理，避免静默变成「永不排班」。
    if (!invalidWorkdaysWarned) {
      invalidWorkdaysWarned = true
      devWarn('[oas-resource] workdays 无合法值（应为 0=周日…6=周六 的整数），已按未声明处理')
    }
    return null
  }
  return [...out].sort((a, b) => a - b)
}

/** 严格日精度解析：只接受 YYYY-MM-DD 且日期真实存在（新日历字段不继承宽松 yyyy-MM 解析） */
function parseStrictDay(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const day = Number(m[3])
  const d = new Date(y, mo - 1, day)
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) return null
  return startOfDay(d)
}

function sanitizeHolidays(v: unknown): Set<string> {
  const out = new Set<string>()
  if (!Array.isArray(v)) return out
  for (const s of v) {
    if (typeof s !== 'string') continue
    const d = parseStrictDay(s)
    if (d) out.add(toISODate(d))
  }
  return out
}

function sanitizeCapacityOverrides(v: unknown): Map<string, number> | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null
  const out = new Map<string, number>()
  for (const key of Object.keys(v)) {
    const d = parseStrictDay(key)
    if (!d) continue
    const n = safeGet(v as Record<string, unknown>, key)
    if (n === READ_FAILED || typeof n !== 'number' || !Number.isFinite(n) || n < 0) continue
    out.set(toISODate(d), n)
  }
  return out
}

function sanitizeSkills(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null
  return [...new Set(v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()))]
}

function sanitizePriority(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/**
 * 资源在某个 period 的容量。
 * - 未声明任何日历字段：保持旧语义，capacity 按 period 计（不是逐日求和）。
 * - 声明 workdays/holidays/capacityOverrides 任一：按日求容量并求和；
 *   workdays 缺省视为每天可用（不隐式改周末语义），holidays=0，capacityOverrides 优先。
 */
export function periodCapacity(
  r: RS,
  period: PeriodSpan,
  _scale: ResourceScale,
  _weekStart: number,
  capDefault: number,
): number {
  const base = r.capacity ?? capDefault
  if (!hasCalendar(r)) return base
  const workdays = r.workdays === null ? null : new Set(r.workdays)
  let total = 0
  let cursor = startOfDay(new Date(period.startMs))
  const end = new Date(period.endMs)
  while (cursor.getTime() < end.getTime()) {
    const key = toISODate(cursor)
    const override = r.capacityOverrides?.get(key)
    if (override != null) total += override
    else if (r.holidays.has(key)) total += 0
    else if (workdays === null || workdays.has(cursor.getDay())) total += base
    cursor = addDays(cursor, 1)
  }
  // 浮点 override（如 0.1）逐日累加会出现 0.999…；按 1e-6 归一，避免整数负载误判超载。
  return Math.round(total * 1e6) / 1e6
}

/**
 * 清洗资源数组（纯函数）：非对象/缺 id/缺名/空串丢弃；重复 id 保留首个；
 * capacity 非正有限数 → null（回落组件缺省容量）；白名单外的自定义键原样透传。
 * 逐键读取走 safeGet：宿主对象带抛异常的 accessor getter 时只丢该键（onKeyError 回调，供调用方告警）。
 * 结构性容错（onInvalid 回调）：条目为 revoked Proxy 等 ownKeys / 原型探测都会抛的对象时，
 * 该条整体丢弃、其余保留，绝不抛未捕获异常；**顶层数组本身**为 revoked Proxy 时（Array.isArray 抛）
 * 整体视为无效输入（返回空数组 + 同一告警通道）。
 */
export function sanitizeResources(v: unknown, onKeyError?: (key: string) => void, onInvalid?: () => void): RS[] {
  if (!isArraySafe(v, onInvalid)) return []
  const out: RS[] = []
  const seen = new Set<string>()
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue
    // 结构性探测：revoked Proxy 连 ownKeys（Object.keys）都不可用（typeof 却恒不抛）——
    // 预取自有键显式探测：失败即结构性无效（onInvalid 告警 + 整条丢弃），不滑进「缺 id 丢弃」静默路径；
    // 成功则复用该键数组做自定义键透传（ownKeys 不双调）
    let ownKeys: string[]
    try {
      ownKeys = Object.keys(item)
    } catch {
      onInvalid?.()
      continue
    }
    // 结构性容错：兜住条目处理全程的残余抛点（嵌套值的 Array.isArray / 原型探测等）
    try {
      const raw = item as Record<string, unknown>
      const id = safeGet(raw, 'id')
      const name = safeGet(raw, 'name')
      if (typeof id !== 'string' || id === '') continue
      if (typeof name !== 'string' || name === '') continue
      if (seen.has(id)) continue
      seen.add(id)
      const cap = safeGet(raw, 'capacity')
      const workdaysRaw = safeGet(raw, 'workdays')
      const holidaysRaw = safeGet(raw, 'holidays')
      const overridesRaw = safeGet(raw, 'capacityOverrides')
      const skillsRaw = safeGet(raw, 'skills')
      const costRateRaw = safeGet(raw, 'costRate')
      const r: RS = {
        id,
        name,
        capacity: cap === READ_FAILED ? null : sanitizeCapacity(cap),
        workdays: workdaysRaw === READ_FAILED ? null : sanitizeWorkdays(workdaysRaw),
        holidays: holidaysRaw === READ_FAILED ? new Set() : sanitizeHolidays(holidaysRaw),
        capacityOverrides: overridesRaw === READ_FAILED ? null : sanitizeCapacityOverrides(overridesRaw),
        skills: skillsRaw === READ_FAILED ? null : sanitizeSkills(skillsRaw),
        costRate: costRateRaw === READ_FAILED ? null : sanitizeCostRate(costRateRaw),
      }
      // 自定义字段透传（ResourceItem 的 `[key: string]: unknown` 契约）：白名单外的键原样保留
      for (const k of ownKeys) {
        if (RESERVED_RESOURCE_KEYS.has(k) || UNSAFE_KEYS.has(k)) continue
        const val = safeGet(raw, k)
        if (val === READ_FAILED) {
          onKeyError?.(k)
          continue
        }
        r[k] = val
      }
      out.push(r)
    } catch {
      onInvalid?.()
    }
  }
  return out
}

/**
 * 清洗任务数组（纯函数）：非对象/缺 id/缺名/日期不可解析丢弃；重复 id 保留首个（丢弃后续，
 * 与资源同口径，避免点击/事件/moved 按 id 取用时歧义）并告警一次；
 * start/end 归一为本地日精度（带时刻输入截断到当日）；end 早于 start 自愈交换（日精度 end 含当日）；
 * resources 过滤为非空字符串数组并去重（未知资源 id 的分配在渲染/统计层忽略）；
 * 白名单外的自定义键原样透传。逐键读取走 safeGet（抛异常 getter 只丢该键，onKeyError 回调）。
 * 结构性容错（onInvalid 回调）：条目为 revoked Proxy 等 ownKeys 探测都会抛的对象，
 * 或条目内嵌套值结构性不可读（如 resources 数组值已吊销）时，该条整体丢弃、其余保留；
 * **顶层数组本身**为 revoked Proxy 时（Array.isArray 抛）整体视为无效输入（返回空数组 + 同一告警通道）。
 */
export function sanitizeTasks(v: unknown, onKeyError?: (key: string) => void, onInvalid?: () => void): RT[] {
  if (!isArraySafe(v, onInvalid)) return []
  const out: RT[] = []
  const seen = new Set<string>()
  let dupWarned = false
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue
    // 结构性探测（同 sanitizeResources）：revoked Proxy 连 ownKeys（Object.keys）都不可用——
    // 失败即结构性无效（onInvalid 告警 + 整条丢弃）；成功则复用该键数组做自定义键透传
    let ownKeys: string[]
    try {
      ownKeys = Object.keys(item)
    } catch {
      onInvalid?.()
      continue
    }
    // 结构性容错：兜住条目处理全程的残余抛点（嵌套 resources 值的 Array.isArray / 原型探测等）
    try {
      const raw = item as Record<string, unknown>
      const id = safeGet(raw, 'id')
      const name = safeGet(raw, 'name')
      if (typeof id !== 'string' || id === '') continue
      if (typeof name !== 'string' || name === '') continue
      const sd = parseTaskDate(safeGet(raw, 'start'))
      const ed = parseTaskDate(safeGet(raw, 'end'))
      if (!sd || !ed) continue
      if (seen.has(id)) {
        if (!dupWarned) {
          dupWarned = true
          devWarn(`[oas-resource] 重复任务 id "${id}"，已保留首个、丢弃后续`)
        }
        continue
      }
      seen.add(id)
      // 日期颠倒自愈：按渲染语义交换（日精度 end 含当日，故用日历日比较）
      let startDate = sd
      let endDate = ed
      if (endDate.getTime() < startDate.getTime()) {
        const tmp = startDate
        startDate = endDate
        endDate = tmp
      }
      const rawResources = safeGet(raw, 'resources')
      const resources = Array.isArray(rawResources)
        ? [...new Set(rawResources.filter((x): x is string => typeof x === 'string' && x !== ''))]
        : []
      const priorityRaw = safeGet(raw, 'priority')
      const requiredRaw = safeGet(raw, 'requiredSkills')
      const projectRaw = safeGet(raw, 'project')
      const t: RT = {
        id,
        name,
        start: toISODate(startDate),
        end: toISODate(endDate),
        resources,
        priority: priorityRaw === READ_FAILED ? 0 : sanitizePriority(priorityRaw),
        requiredSkills: requiredRaw === READ_FAILED ? [] : (sanitizeSkills(requiredRaw) ?? []),
        project: typeof projectRaw === 'string' ? projectRaw.trim() : '',
      }
      // 自定义字段透传（ResourceTask 的 `[key: string]: unknown` 契约）：白名单外的键原样保留
      for (const k of ownKeys) {
        if (RESERVED_TASK_KEYS.has(k) || UNSAFE_KEYS.has(k)) continue
        const val = safeGet(raw, k)
        if (val === READ_FAILED) {
          onKeyError?.(k)
          continue
        }
        t[k] = val
      }
      out.push(t)
    } catch {
      onInvalid?.()
    }
  }
  return out
}

/** 内部模型 → 对外任务拷贝（resources 缺省空数组不落字段；自定义键深拷贝并跳过危险键。
 * memo 由调用方传入时在同一次读内共享——同一源对象在结果中保持同一拷贝引用。
 * onKeyError：嵌套对象里抛异常的 getter 键丢弃时回调（只丢该键）；
 * 深拷贝遇结构性吊销值（revoked Proxy）同样只丢该键、绝不抛。 */
export function toPublicTask(t: RT, memo?: WeakMap<object, unknown>, onKeyError?: (key: string) => void): ResourceTask {
  const copy: ResourceTask = { id: t.id, name: t.name, start: t.start, end: t.end }
  if (t.resources.length > 0) copy.resources = [...t.resources]
  if (t.priority !== 0) copy.priority = t.priority
  if (t.requiredSkills.length > 0) copy.requiredSkills = [...t.requiredSkills]
  if (t.project !== '') copy.project = t.project
  for (const k of Object.keys(t)) {
    if (RESERVED_TASK_KEYS.has(k) || UNSAFE_KEYS.has(k)) continue
    const v = safeGet(t, k)
    if (v === READ_FAILED) {
      onKeyError?.(k)
      continue
    }
    const c = cloneCustom(v, memo, onKeyError)
    if (c === READ_FAILED) {
      onKeyError?.(k)
      continue
    }
    copy[k] = c
  }
  return copy
}

/** 内部模型 → 对外资源拷贝（capacity 缺省不落字段；自定义键深拷贝并跳过危险键；memo/onKeyError 语义同 toPublicTask） */
export function toPublicResource(
  r: RS,
  memo?: WeakMap<object, unknown>,
  onKeyError?: (key: string) => void,
): ResourceItem {
  const copy: ResourceItem = { id: r.id, name: r.name }
  if (r.capacity != null) copy.capacity = r.capacity
  if (r.workdays !== null) copy.workdays = [...r.workdays]
  if (r.holidays.size > 0) copy.holidays = [...r.holidays]
  if (r.capacityOverrides) copy.capacityOverrides = Object.fromEntries(r.capacityOverrides)
  if (r.skills && r.skills.length > 0) copy.skills = [...r.skills]
  if (r.costRate !== null) copy.costRate = r.costRate
  for (const k of Object.keys(r)) {
    if (RESERVED_RESOURCE_KEYS.has(k) || UNSAFE_KEYS.has(k)) continue
    const v = safeGet(r, k)
    if (v === READ_FAILED) {
      onKeyError?.(k)
      continue
    }
    const c = cloneCustom(v, memo, onKeyError)
    if (c === READ_FAILED) {
      onKeyError?.(k)
      continue
    }
    copy[k] = c
  }
  return copy
}

/** 任务跨度（end 含端 → 右缘次日 00:00，日历步进防 DST 漂移；清洗层保证日期合法，此处防御跳过） */
export function spansOf(tasks: RT[]): Span[] {
  const spans: Span[] = []
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]!
    const s = parseTaskDate(t.start)
    const e = parseTaskDate(t.end)
    if (!s || !e) continue
    const startMs = s.getTime()
    spans.push({ startMs, endMs: Math.max(addDays(e, 1).getTime(), addDays(s, 1).getTime()), index: i })
  }
  return spans
}

/** 按 scale 步进 n 个 period（全档走本地日历运算防月末溢出与 DST 漂移；period 边界恒为本地 00:00） */
function addPeriods(d: Date, scale: ResourceScale, n: number): Date {
  if (scale === 'day') return addDays(d, n)
  if (scale === 'week') return addDays(d, n * 7)
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

/** 首个 period 锚点：day → 当日起点；week → 对齐周起始；month → 当月 1 日 */
function anchorOf(min: Date, scale: ResourceScale, weekStart: number): Date {
  if (scale === 'day') return startOfDay(min)
  if (scale === 'week') {
    const diff = (min.getDay() + 7 - weekStart) % 7
    return new Date(min.getFullYear(), min.getMonth(), min.getDate() - diff)
  }
  return new Date(min.getFullYear(), min.getMonth(), 1)
}

/**
 * 由任务区间推导 period 序列（覆盖 [minMs, maxMs) 的整 period），无文案（引擎用）。
 * 纯函数：locale 只影响文案（levelResources 从不消费 label——抽核后 level 链不再依赖
 * formatToken/isoWeek，这是 helper-only 消费者体积收益的来源）；组件侧 buildPeriods
 * 在本函数结果上补 locale 文案（同一 cursor 推导，输出与拆分前逐位一致）。
 * 截断时回调 onTruncated 至多一次（去重粒度由调用方定：组件实例级 / 纯函数模块级）。
 */
export function buildPeriodSpans(
  minMs: number,
  maxMs: number,
  scale: ResourceScale,
  weekStart: number,
  onTruncated?: () => void,
): PeriodSpan[] {
  if (!Number.isFinite(minMs) || !Number.isFinite(maxMs) || maxMs <= minMs) return []
  const anchor = anchorOf(new Date(minMs), scale, weekStart)
  const periods: PeriodSpan[] = []
  let cursor = anchor.getTime()
  let guard = 0
  while (cursor < maxMs && guard++ < MAX_PERIODS) {
    const next = addPeriods(new Date(cursor), scale, 1)
    periods.push({ startMs: cursor, endMs: next.getTime() })
    cursor = next.getTime()
  }
  if (cursor < maxMs) onTruncated?.()
  return periods
}
