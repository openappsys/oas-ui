/**
 * oas-gantt 模块级纯函数与常量（从 oas-gantt.ts 机械迁移，零行为变更）：
 * 刻度常量 / 本地日历日期数学 / 任务与基线清洗 / 标签估宽与抽稀 / 基线差异 /
 * 资源冲突检测 / 稳定序列化与选择器转义 / 渲染诊断计数。
 * 拆分边界：本模块零组件依赖（不 import 任何 OASElement / DOM）；类内方法抽出的
 * 无状态 helper 见 gantt-helpers.ts，类型见 gantt-types.ts，样式见 gantt-style.ts。
 */
import { parseISODate, toISODate } from '../../form/calendar/date-grid.js'
import { devWarn } from '../../shared/dev-warn.js'
import type {
  DatedConstraint,
  GanttBaseline,
  GanttBaselineVariance,
  GanttDependency,
  GanttMajorGroup,
  GanttResourceConflict,
  GanttScale,
  GanttTask,
  TimeUnit,
  TG,
} from './gantt-types.js'

/**
 * 主刻度相邻同标签分组（纯函数）：buildUnits 时对**全列**预计算一次，renderHeader 的窗口切片
 * 只做二分定位 + 相交子集输出——旧实现逐帧对全列做相邻合并扫描，长跨度横向滚动每帧 O(总列数)；
 * 分组语义与旧「逐帧全量相邻合并」完全一致（产物逐格一致，见 oas-gantt.test.ts 回归）。
 */
export function buildMajorGroups(units: TimeUnit[]): GanttMajorGroup[] {
  const groups: GanttMajorGroup[] = []
  const n = units.length
  let i = 0
  while (i < n) {
    let j = i
    const label = units[i]!.major
    while (j + 1 < n && units[j + 1]!.major === label) j++
    groups.push({ startCol: i, endCol: j + 1, label })
    i = j + 1
  }
  return groups
}

export const SCALES: GanttScale[] = ['hour', 'day', 'week', 'month', 'quarter', 'year']
/** 各档列宽（px） */
export const SCALE_COL: Record<GanttScale, number> = {
  hour: 44,
  day: 36,
  week: 90,
  month: 110,
  quarter: 150,
  year: 130,
}
/** 各档列宽下限（px）：保证抽稀后的最小标签仍有呼吸位。
 *  旧实现统一取基准的 40%（day 档 14.4px），两位数日号在窄容器下首尾相接成一团不可读。 */
export const SCALE_MIN_COL: Record<GanttScale, number> = {
  hour: 22,
  day: 16,
  week: 36,
  month: 44,
  quarter: 60,
  year: 52,
}
/** 各档辅刻度抽稀步进阶梯（格）：取首个满足「步进 × 列宽 ≥ 标签估宽 + 间隙」者 */
export const SCALE_STRIDES: Record<GanttScale, number[]> = {
  hour: [1, 2, 3, 4, 6, 12, 24],
  day: [1, 2, 7, 14, 28],
  week: [1, 2, 4, 13, 26],
  month: [1, 2, 3, 6, 12],
  quarter: [1, 2, 4],
  year: [1, 2, 5, 10],
}
/** 标签估宽（px）：xs 字号下 ASCII 数字/字母/冒号/连字符的平均字宽 */
export const LABEL_CHAR_W = 6.6
/** 相邻可见标签之间的最小间隙（px） */
export const LABEL_GAP = 6
/** 起始留白（档位数）：保持小值——旧值 7 天在窄容器下把首个任务推到可见区右缘、左侧大片空白，
 *  今日线/里程碑随之滚出视口；起始留白只需留出条缘手柄的呼吸位。 */
export const SCALE_PAD_START: Record<GanttScale, number> = { hour: 1, day: 1, week: 1, month: 1, quarter: 1, year: 1 }
/** 末端留白（档位数）：给条外标签与依赖出线留余地 */
export const SCALE_PAD_END: Record<GanttScale, number> = { hour: 6, day: 3, week: 1, month: 1, quarter: 1, year: 1 }
export const DAY_MS = 86_400_000

/**
 * 按「本地日历日」平移时间戳：保留墙钟时分秒。
 * 用于 day/week 刻度步进、日期右界（次日零点）、工作日吸附与整日任务工期换算——
 * 直接 ±n × DAY_MS 在 DST 切换日（23/25 小时）会漂到 01:00/23:00，刻度错位、标签重复、数据被写脏。
 */
export function addLocalDays(ms: number, n: number): number {
  const d = new Date(ms)
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + n,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  ).getTime()
}

/** 本地墙钟（时:分）→ epoch ms：DST 切换日不能「当日零点 + 分钟数」（跳变那段不是 60 分钟/小时） */
export function localWallClockMs(y: number, month: number, day: number, minutes: number): number {
  return new Date(y, month, day, Math.floor(minutes / 60), minutes % 60).getTime()
}

/** 空白拖拽判拖阈值（px）：低于此位移视作点按（框选清空 / 不建任务） */
export const MARQUEE_THRESHOLD = 4

/**
 * 全量重算诊断计数（**仅内部诊断，非公开 API**）：模块级累加、只增不减，不参与任何渲染逻辑
 * （整块删除不影响组件行为；`index.ts` 不导出该符号，也不进 api-manifest）。
 * - `rowBuilds`：`buildRows` 调用次数（O(总量) 行树构建 + 摘要聚合）
 * - `unitBuilds`：`buildUnits` 调用次数（O(轴长) 刻度构建 + 主刻度分组）
 * - `cpComputes`：`criticalPathIds` 调用次数（O(V+E) 关键路径 / 违约判定）
 * 用途：测试锁定增量性能契约——**仅选择变化**（tasks / 依赖 / scale / expanded 等未变）时三者
 * 计数必须零增长（选择走局部 patch 路径，复用缓存 rows/units/criticalIds）；数据或刻度变化时
 * 必须增长（证明缓存正确失效，计数不是恒 0 的假绿）。
 */
export const ganttRenderDiag = { rowBuilds: 0, unitBuilds: 0, cpComputes: 0 }

export const DEP_TYPES = new Set(['fs', 'ss', 'ff', 'sf'])

/** 任务约束白名单（asap 等同无约束，清洗层丢弃，不落数据） */
export const CONSTRAINTS = new Set(['asap', 'snet', 'mso', 'fnlt'])
/** 组件已知字段（清洗时按各自口径处理）；此外的键视为宿主自定义字段，原样透传 */
export const RESERVED_TASK_KEYS = new Set([
  'id',
  'name',
  'start',
  'end',
  'type',
  'progress',
  'parent',
  'children',
  'dependencies',
  'color',
  'disabled',
  'expanded',
  'baseline',
  'baselines',
  'project',
  'resources',
  'deadline',
  'deadlines',
  'constraint',
  'constraintDate',
  'effort',
])

/** 工作日吸附步进上限（天）：防 workdays + holidays 组合意外占满时死循环 */
export const SNAP_MAX_DAYS = 400

/** 轴标签估宽（px，纯函数）：按字符数估算（刻度标签均为 ASCII，字宽近似等宽） */
export function estimateLabelWidth(text: string): number {
  return text.length * LABEL_CHAR_W
}

/**
 * 轴标签抽稀（纯函数）：返回应显示标签的下标集合。
 * 从 strides 阶梯取首个满足「步进 × 列宽 ≥ 最长标签估宽 + 间隙」的步进，
 * 列宽被压窄时按 N 取一显示，保证相邻可见标签不堆叠（密集日期轴可读性的通行做法）。
 * 列宽不可用（<=0，如无布局环境）或阶梯为空时全显示。
 */
export function pickVisibleLabels(labels: string[], colW: number, strides: number[], gap = LABEL_GAP): number[] {
  const n = labels.length
  if (n === 0) return []
  if (!(colW > 0) || strides.length === 0) return labels.map((_, i) => i)
  let maxW = 0
  for (const l of labels) {
    const w = estimateLabelWidth(l)
    if (w > maxW) maxW = w
  }
  const target = maxW + gap
  let step = strides[strides.length - 1]!
  for (const s of strides) {
    if (s * colW >= target) {
      step = s
      break
    }
  }
  const out: number[] = []
  for (let i = 0; i < n; i += step) out.push(i)
  return out
}

export function parseTaskDate(s: unknown): Date | null {
  if (typeof s !== 'string') return null
  return parseISODate(s.trim())
}

/** 两组已排序日内班次窗口求交集（[start,end) 分钟；无交集返回 []） */
export function intersectShiftWindows(
  a: Array<{ start: number; end: number }>,
  b: Array<{ start: number; end: number }>,
): Array<{ start: number; end: number }> {
  const out: Array<{ start: number; end: number }> = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    const start = Math.max(a[i]!.start, b[j]!.start)
    const end = Math.min(a[i]!.end, b[j]!.end)
    if (start < end) out.push({ start, end })
    if (a[i]!.end <= b[j]!.end) i++
    else j++
  }
  return out
}

/** 本地日历日序号（UTC 归一，规避 DST 的 23/25 小时误差）；日期非法返回 null */
export function dayIndex(s: unknown): number | null {
  const d = parseTaskDate(s)
  if (!d) return null
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS)
}

/** 结束日索引：带时刻且恰为 00:00 时按前一日（渲染的 end 为右缘、日精度含端） */
export function endDayIndex(s: unknown): number | null {
  const idx = dayIndex(s)
  if (idx === null) return null
  return typeof s === 'string' && s.length > 10 && s.slice(11, 16) === '00:00' ? idx - 1 : idx
}

/**
 * 基线差异（纯函数，日精度）：逐任务比较当前 start/end/progress 与选中基线。
 * - 基线取数走 taskBaselines（baselines 数组优先，单 baseline 字段归一为 id 'default'）；
 *   无 id / 无合法基线 start 的任务跳过；基线 end 缺省按单点（= start）处理。
 * - 当前 end 缺省按里程碑（= start）处理；差值正数表示当前晚于基线/工期更长/进度更多。
 * - 基线 progress 未提供时 progressDelta=null（不把缺失当成 0）。
 * - baselineId（可选，对应组件 baseline-id 属性）：指定 id 命中该条基线；未命中回落每任务
 *   第一条并 devWarn 一次（模块级去重）。缺省 = 每任务第一条基线（既有调用不破坏）。
 */
export function computeVariance(tasks: GanttTask[], baselineId?: string): GanttBaselineVariance[] {
  const out: GanttBaselineVariance[] = []
  const want = typeof baselineId === 'string' ? baselineId.trim() : ''
  for (const t of tasks) {
    if (!t || typeof t.id !== 'string' || t.id === '') continue
    const bases = taskBaselines(t)
    if (bases.length === 0) continue
    // 选基线：指定 id 命中取命中，未命中回落第一条（模块级告警一次，防刷屏）；缺省取第一条
    let base = bases[0]!
    if (want !== '') {
      const hit = bases.find((b) => b.id === want)
      if (hit) base = hit
      else if (!varianceBaselineIdWarned) {
        varianceBaselineIdWarned = true
        devWarn(`[oas-gantt] computeVariance 未找到 id 为 "${want}" 的基线，已回落每任务第一条基线`)
      }
    }
    const curStart = dayIndex(t.start)
    const baseStart = dayIndex(base.start)
    if (curStart === null || baseStart === null) continue
    const curEnd = endDayIndex(t.end) ?? curStart
    const baseEnd = endDayIndex(base.end) ?? baseStart
    const baseProgress = parseProgress(base.progress)
    out.push({
      id: t.id,
      startDelta: curStart - baseStart,
      endDelta: curEnd - baseEnd,
      durationDelta: curEnd - curStart - (baseEnd - baseStart),
      progressDelta: baseProgress === undefined ? null : (parseProgress(t.progress) ?? 0) - baseProgress,
    })
  }
  return out
}

/** computeVariance 指定 baseline-id 未命中的模块级告警去重（纯函数无实例可挂，仅提示一次） */
let varianceBaselineIdWarned = false

export function parseProgress(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
  return Math.min(100, Math.max(0, Math.round(v)))
}

/**
 * 多基线清洗（纯函数）：非数组返回 null；逐条校验——id 必填非空字符串、start 必填可解析、
 * end 缺省省略（非法丢弃 end 保条目）、progress 越界 clamp；全组无效（无合法条目）返回 null。
 * 条内 start 晚于 end 时按渲染语义交换（同单 baseline 口径）。不做去重：同 id 保留首个
 * （baseline-id 取数按首个命中，后续同 id 条目不参与）。
 */
export function sanitizeBaselines(v: unknown): GanttBaseline[] | null {
  if (!Array.isArray(v)) return null
  const out: GanttBaseline[] = []
  const seen = new Set<string>()
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue
    const b = item as Record<string, unknown>
    const id = typeof b.id === 'string' ? b.id.trim() : ''
    if (id === '' || seen.has(id)) continue
    const s = typeof b.start === 'string' ? b.start.trim() : ''
    if (!s || !parseTaskDate(s)) continue
    seen.add(id)
    const one: GanttBaseline = { id, start: s }
    const e = typeof b.end === 'string' ? b.end.trim() : ''
    if (e && parseTaskDate(e)) {
      const sD = parseTaskDate(s)!
      const eD = parseTaskDate(e)!
      const eMs = e.length > 10 ? eD.getTime() : addLocalDays(eD.getTime(), 1)
      if (eMs < sD.getTime()) {
        one.start = e
        one.end = s
      } else {
        one.end = e
      }
    }
    const bp = parseProgress(b.progress)
    if (bp !== undefined) one.progress = bp
    out.push(one)
  }
  return out.length > 0 ? out : null
}

/**
 * 单 baseline 字段 → GanttBaseline 的归一（纯函数）：id 固定 'default'，end/progress 缺省省略。
 * taskBaselines（读侧）与未来清洗侧共用同一条归一路径，避免双实现漂移。
 */
export function normalizeSingleBaseline(b: { start: string; end?: string; progress?: number }): GanttBaseline {
  const one: GanttBaseline = { id: 'default', start: b.start }
  if (b.end !== undefined) one.end = b.end
  if (b.progress !== undefined) one.progress = b.progress
  return one
}

/**
 * 任务的多基线读取（**读时归一**；纯函数通道对未清洗输入兜底兼容）：
 * 显式 baselines 数组非空优先；否则单 baseline 字段**在读侧**归一为 `[{ id: 'default', ... }]`
 * （清洗层不物化派生数组——否则 updateTask/updateTasks 的 patch 合并 {...旧, ...patch} 会保留旧
 * 派生数组、令 patch.baseline 的新值/删除被静默遮蔽，回归见「updateTask 改/删单 baseline」用例）；两者皆无返回 []。
 */
export function taskBaselines(t: GanttTask | undefined | null): GanttBaseline[] {
  if (!t) return []
  if (Array.isArray(t.baselines) && t.baselines.length > 0) return t.baselines
  if (t.baseline) return [normalizeSingleBaseline(t.baseline)]
  return []
}

/**
 * 任务约束清洗（纯函数）：白名单外的 constraint 一律丢弃（→ 无约束）；
 * `asap` 等同无约束（丢弃）；`snet`/`mso`/`fnlt` 必须携带可解析的 constraintDate，
 * 否则整体丢弃该约束并告警一次（key `constraint:${id}` 由调用方 warnOnce 去重）。
 */
export function sanitizeConstraint(
  raw: Record<string, unknown>,
  id: string,
  onWarn?: (key: string, msg: string) => void,
): { mode: DatedConstraint; date: string } | null {
  const mode = raw.constraint
  if (typeof mode !== 'string' || !CONSTRAINTS.has(mode)) return null
  if (mode === 'asap') return null
  const date = typeof raw.constraintDate === 'string' ? raw.constraintDate.trim() : ''
  if (!parseTaskDate(date)) {
    onWarn?.(
      `constraint:${id}`,
      `[oas-gantt] 任务 "${id}" 的 constraint="${mode}" 缺少可解析的 constraintDate，该约束已丢弃`,
    )
    return null
  }
  return { mode: mode as DatedConstraint, date }
}

/**
 * workdays 属性解析（纯函数）：JSON 周几数组（0=周日 … 6=周六）。
 * opt-in：属性缺省 / JSON 非法 / 非数组 / 过滤非法项后为空 → 返回 null = 不限制（全周工作）。
 */
export function parseWorkdays(raw: string): Set<number> | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!Array.isArray(parsed)) return null
  const days = new Set<number>()
  for (const x of parsed) {
    if (typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 6) days.add(x)
  }
  return days.size > 0 ? days : null
}

/**
 * lag 安全域上限（ms）：lag 必须有限且 |lag × DAY_MS| ≤ LAG_MS_LIMIT。
 * 背景：Date 合法域为 ±8.64e15 ms；极大有限 lag（1e8~1e10 天）能通过 `Number.isFinite`
 * 检查，但叠加到任务日期后会把排程运算的 ms 推出 Date 域 → `new Date(huge)` 为 Invalid
 * Date → `fmtIso` 内 `Intl.formatToParts` 抛 RangeError（auto-schedule 场景整图白屏）。
 * 取 1e12 ms（= 1e12 / 86_400_000 ≈ 11574 天 ≈ 31.7 年）：远大于业务可能的 lag（按年计）；
 * 常见 4 位年份（如 2026）叠加后仍为 4 位年份——写回日期经 toISODate 序列化后能再被
 * parseTaskDate 回读（parseISODate 只收 4 位年）；边界年份（如 9999）由
 * writeStartKeepingDuration 的写回域守卫兜底（结果不可回读则跳过本次写回）。
 * 旧上限 1e15 ms 实为 ≈1.15e7 天（≈3.17 万年）：lag=1e7 天即可写出 29405-…（5 位年份），
 * parseTaskDate 无法回读 → `el.tasks = el.tasks` 这类回写会静默丢任务。
 */
export const LAG_MS_LIMIT = 1e12

/**
 * lag 清洗（纯函数，三条入口共用：sanitizeDeps / addDependency / updateDependency）：
 * 合法（有限数值且在安全域内）原样返回；否则返回 undefined = 调用方丢弃该 lag（等价 0/缺省，
 * 依赖本身保留——与既有「NaN/非数值丢弃为无 lag」清洗口径一致）。
 */
export function sanitizeLag(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
  if (Math.abs(v * DAY_MS) > LAG_MS_LIMIT) return undefined
  return v
}

export function sanitizeDeps(
  v: unknown,
  id: string,
  onWarn?: (key: string, msg: string) => void,
): GanttDependency[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: GanttDependency[] = []
  const seen = new Set<string>()
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue
    const it = item as Record<string, unknown>
    if (typeof it.id !== 'string' || it.id === '') continue
    const dep: GanttDependency = { id: it.id }
    if (typeof it.type === 'string' && DEP_TYPES.has(it.type)) dep.type = it.type as GanttDependency['type']
    // lag（天，可负=提前/重叠）：有限且在安全域内才保留，否则丢弃为无 lag（防 Invalid Date / 5 位年份）
    const lag = sanitizeLag(it.lag)
    if (lag !== undefined) dep.lag = lag
    else if (typeof it.lag === 'number' && Number.isFinite(it.lag)) {
      // 属性通道越域告警（实例级一次，key 固定）：NaN/字符串等非法值保持既有静默丢弃口径
      onWarn?.(
        'lag-domain',
        `[oas-gantt] 依赖 lag=${String(it.lag)}（任务 "${id}"）超出安全域（|lag×天| ≤ 1e12 ms，约 11574 天），已按 0 处理`,
      )
    }
    // 同源同型去重（重复项会渲染重合连线，且一处删除会连带删掉）；lag 不参与去重键
    const key = `${dep.id}|${dep.type ?? 'fs'}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(dep)
  }
  return out.length > 0 ? out : undefined
}

/** 展开中的嵌套输入先拍平（保 DFS 序：父在前、子随后），再统一清洗；fromNest 标记 parent 来自嵌套推导 */
export function flattenInput(
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
 * onWarn：数据自愈告警通道（key 去重由调用方持有，模块函数保持无状态）。
 */
export function sanitizeTasks(
  v: unknown,
  allocId: (used: Set<string>) => string,
  onWarn?: (key: string, msg: string) => void,
): TG[] {
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
    // 自定义字段透传（GanttTask 的 `[key: string]: unknown` 契约）：白名单之外的键原样保留，
    // 供宿主携带 owner/assignee/tag 等业务字段（已知字段随后按校验口径覆盖或丢弃）
    for (const [k, v] of Object.entries(raw)) {
      if (!RESERVED_TASK_KEYS.has(k)) (t as Record<string, unknown>)[k] = v
    }
    const endRaw = typeof raw.end === 'string' && raw.end.trim() !== '' ? raw.end.trim() : undefined
    if (endRaw && parseTaskDate(endRaw)) {
      // start 晚于 end（日期颠倒）自愈：按渲染语义交换（不静默渲染 2px 假条）。
      // 颠倒判定与渲染层 endMsOf 同口径：日精度 end 含当日（区间右缘 = 次日 00:00）
      const startD = parseTaskDate(t.start)!
      const endD = parseTaskDate(endRaw)!
      const endMs = endRaw.length > 10 ? endD.getTime() : addLocalDays(endD.getTime(), 1)
      let endStr = endRaw
      if (endMs < startD.getTime()) {
        onWarn?.(t.id, `[oas-gantt] 任务 "${t.id}" start 晚于 end（日期颠倒），已自动交换`)
        const tmp = t.start
        t.start = endStr
        endStr = tmp
      }
      t.end = endStr
    }
    const progress = parseProgress(raw.progress)
    if (progress !== undefined) t.progress = progress
    const parentVal = fromNest ? parent : typeof raw.parent === 'string' && raw.parent !== '' ? raw.parent : undefined
    if (parentVal) {
      if (validIds.has(parentVal) && parentVal !== id) t.parent = parentVal
      else if (!fromNest) t.parent = parentVal
    }
    const deps = sanitizeDeps(raw.dependencies, t.id, onWarn)
    if (deps) t.dependencies = deps
    // 排程约束（opt-in）：白名单 + snet/mso/fnlt 必须带合法 constraintDate，否则丢弃并告警一次
    const con = sanitizeConstraint(raw, t.id, onWarn)
    if (con) {
      t.constraint = con.mode
      t.constraintDate = con.date
    }
    if (typeof raw.color === 'string' && raw.color !== '') t.color = raw.color
    if (raw.disabled === true) t.disabled = true
    if (raw.expanded === true || raw.expanded === false) t.expanded = raw.expanded
    if (raw.type === 'task' || raw.type === 'milestone' || raw.type === 'summary') t.type = raw.type
    if (typeof raw.project === 'string' && raw.project.trim() !== '') t.project = raw.project.trim()
    if (Array.isArray(raw.resources)) {
      const resources = [
        ...new Set(
          raw.resources.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()),
        ),
      ]
      if (resources.length > 0) t.resources = resources
    }
    const deadline = typeof raw.deadline === 'string' ? raw.deadline.trim() : ''
    if (deadline && parseTaskDate(deadline)) t.deadline = deadline
    else if (deadline) {
      onWarn?.(`deadline:${t.id}`, `[oas-gantt] 任务 "${t.id}" 的 deadline 非法，已丢弃`)
    }
    if (Array.isArray(raw.deadlines)) {
      const list: string[] = []
      for (const x of raw.deadlines) {
        if (typeof x !== 'string') continue
        const value = x.trim()
        if (!value || !parseTaskDate(value) || list.includes(value)) continue
        list.push(value)
      }
      if (list.length > 0) t.deadlines = list
    }
    const base = raw.baseline
    if (typeof base === 'object' && base !== null) {
      const b = base as Record<string, unknown>
      const s = typeof b.start === 'string' ? b.start.trim() : ''
      if (s && parseTaskDate(s)) {
        const bb: { start: string; end?: string; progress?: number } = { start: s }
        const e = typeof b.end === 'string' ? b.end.trim() : ''
        if (e && parseTaskDate(e)) {
          const sD = parseTaskDate(s)!
          const eD = parseTaskDate(e)!
          const eMs = e.length > 10 ? eD.getTime() : addLocalDays(eD.getTime(), 1)
          if (eMs < sD.getTime()) {
            onWarn?.(`baseline:${t.id}`, `[oas-gantt] 任务 "${t.id}" baseline start 晚于 end，已自动交换`)
            bb.start = e
            bb.end = s
          } else {
            bb.end = e
          }
        }
        const bp = parseProgress(b.progress)
        if (bp !== undefined) bb.progress = bp
        t.baseline = bb
      }
    }
    const baselines = sanitizeBaselines(raw.baselines)
    if (baselines) {
      // 多基线通道（显式 baselines）优先：与单 baseline 并存时单字段被忽略（数据面归一口径）。
      // **只物化显式数组**——单 baseline 字段保持原样不派生（否则 updateTask(patch.baseline) 会被
      // 旧对象的派生 baselines 遮蔽：patch 合并 {...旧, ...patch} 后 baselines 仍在、单字段被忽略）。
      // 读侧归一统一走 taskBaselines()（单字段 → [{ id: 'default', ... }]）。
      t.baselines = baselines
    }
    // 工时估算（纯展示，单位天）：仅保留有限**非负**数值；NaN/±Infinity/负数/非 number 丢弃为无工时（显示空）
    if (typeof raw.effort === 'number' && Number.isFinite(raw.effort) && raw.effort >= 0) t.effort = raw.effort
    out.push(t)
  }
  return out
}

/**
 * 键序无关的稳定序列化（语义判等用）：对象键排序、数组保序、undefined 值按 JSON 语义省略。
 * 同 scheduler 的 sameEvents 口径——宿主受控回写常带键序/自定义字段顺序差异，不应被当成数据变更。
 */
export function stableStringify(v: unknown): string {
  if (v === undefined) return 'null'
  if (v === null || typeof v !== 'object') {
    const s = JSON.stringify(v)
    return s === undefined ? 'null' : s
  }
  if (Array.isArray(v)) return `[${v.map((item) => stableStringify(item)).join(',')}]`
  const obj = v as Record<string, unknown>
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

/** 选择器 id 转义（宿主 id 可能含引号/方括号，直接拼接会抛 DOMException） */
export function escId(s: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(s) : s.replace(/["\\\]]/g, '\\$&')
}

/**
 * 工时单元格格式化（show-effort）：单位天，最多保留两位小数并去掉尾随零（3 → '3'、2.5 → '2.5'、
 * 1.25 → '1.25'）；非有限/负值返回空串（清洗层已按 costRate 同口径丢弃负数/非有限，此处双保险）。
 * 不加单位——单位语义由单元格 aria-label（gantt.effortValue）与列头（gantt.effort）承载。
 * 超大值（≥ 1e12，字符串 13+ 位）转科学计数，防 21 位长数字撑破列宽（1e21 → '1.00e+21'）。
 */
export function formatEffortCell(v: unknown): string {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return ''
  const rounded = Math.round(v * 100) / 100
  const s = String(rounded)
  return rounded >= 1e12 || s.length > 13 ? rounded.toExponential(2) : s
}

/**
 * 资源池超配检测（pool 属性 opt-in 纯函数，亦导出供宿主/测试复用）：
 * - 同资源任务区间求交（半开 [start, end)，**相切不算**）；
 * - 里程碑按点处理不触发（无时长不占用产能）；summary（被 parent 指向）不触发（聚合形态无资源语义）；
 * - registeredIds = 池内已登记资源 id 集：任务引用池外资源一律忽略（pool 模式下池是唯一权威，
 *   未登记 id 视为宿主遗留数据）；池登记变化不会自动通知组件——宿主改池后须触发重算（如重写 tasks）；
 * - 输出确定性：资源按首次出现序分组（Map 插入序），组内对按输入序 i<j 字典序产出；
 * - 复杂度：每资源扫描线 O(k log k + P)（P = 实际相交对数，稀疏数据 ≪ k²）——按 start 排序 +
 *   活跃集剪枝（活跃集内任务 start ≤ 当前 start 且 end > 当前 start，必然与当前任务相交），
 *   替代旧版组内 i<j 双循环 O(k²)（千级任务卡顿根因）；
 * - onOverCapacity：某资源最大并发 >2（任一时刻 ≥3 任务同时活跃）时逐资源回调一次，
 *   供组件侧 devWarn。扫描线统计：同刻先处理结束（-1）后处理开始（+1），相切不累计并发。
 * - 交叠区间按日精度含端日期输出（hour 档同样按日期表达）；判定本身按 ms 精度。
 */
export function computeResourceConflicts(
  tasks: TG[],
  registeredIds: Set<string>,
  onOverCapacity?: (resourceId: string, peak: number) => void,
): GanttResourceConflict[] {
  // summary 判定与 unschedulableIds 同源：被 parent 指向即有子级（清洗层已拍平嵌套）
  const hasChildren = new Set<string>()
  for (const t of tasks) if (t.parent) hasChildren.add(t.parent)
  // 资源 → 区间列表分组（只收池内已注册 id；里程碑 / summary 不参与）
  const byResource = new Map<string, Array<{ task: TG; startMs: number; endMs: number }>>()
  for (const t of tasks) {
    if (hasChildren.has(t.id)) continue
    if (t.type === 'milestone' || !t.end) continue
    if (!Array.isArray(t.resources)) continue
    const s = parseTaskDate(t.start)
    if (!s) continue
    const e = parseTaskDate(t.end)
    if (!e) continue
    const startMs = s.getTime()
    // 日精度 end 含端 → 次日本地零点（与 endMsOfTask 渲染口径一致）；时间精度按绝对 ms
    const endMs = t.end.length > 10 ? e.getTime() : addLocalDays(e.getTime(), 1)
    if (endMs <= startMs) continue
    for (const rid of t.resources) {
      if (!registeredIds.has(rid)) continue
      let list = byResource.get(rid)
      if (!list) {
        list = []
        byResource.set(rid, list)
      }
      list.push({ task: t, startMs, endMs })
    }
  }
  const out: GanttResourceConflict[] = []
  for (const [resourceId, list] of byResource) {
    // 扫描线找相交对：按 start 升序处理（索引数组排序，免包装对象分配），活跃集 = 已开始且
    // end > 当前 start 的任务——组内全部与当前任务相交（start ≤ 当前 start 由处理序保证），
    // 一次遍历同时清理过期与产出对，总成本 O(k log k + Σ|活跃集|) = O(k log k + P)。
    const pairs: Array<[number, number]> = []
    const order: number[] = Array.from(list, (_, idx) => idx)
    order.sort((x, y) => list[x]!.startMs - list[y]!.startMs)
    let active: number[] = []
    for (const cur of order) {
      const curStart = list[cur]!.startMs
      const still: number[] = []
      for (const a of active) {
        // 半开区间严格判交（endMs == curStart 相切不算，与旧双循环口径一致）
        if (list[a]!.endMs > curStart) {
          still.push(a)
          pairs.push(a < cur ? [a, cur] : [cur, a])
        }
      }
      still.push(cur)
      active = still
    }
    // 输出契约：组内 pair 按输入序 i<j 字典序（== 旧双循环产出顺序），扫描线按时间序产出后重排
    pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1])
    for (const [i, j] of pairs) {
      const a = list[i]!
      const b = list[j]!
      const ovStart = Math.max(a.startMs, b.startMs)
      const ovEndEx = Math.min(a.endMs, b.endMs) // 半开右缘
      out.push({
        taskA: a.task.id,
        taskB: b.task.id,
        resourceId,
        overlapStart: toISODate(new Date(ovStart)),
        overlapEnd: toISODate(new Date(ovEndEx - 1)), // 含端末日
      })
    }
    if (onOverCapacity) {
      // 最大并发扫描线：>2 即超限（3 个任务任一时刻同时活跃）
      const events: Array<[number, number]> = []
      for (const item of list) {
        events.push([item.startMs, 1], [item.endMs, -1])
      }
      // 同刻先 -1 后 +1（相切不累计）；delta 升序使 -1 排前
      events.sort((x, y) => x[0] - y[0] || x[1] - y[1])
      let cur = 0
      let peak = 0
      for (const [, delta] of events) {
        cur += delta
        if (cur > peak) peak = cur
      }
      if (peak > 2) onOverCapacity(resourceId, peak)
    }
  }
  return out
}
