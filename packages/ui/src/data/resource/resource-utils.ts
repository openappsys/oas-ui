import { toISODate } from '../../form/calendar/date-grid.js'
import type { ResourceItem, ResourceScale, ResourceTask } from './oas-resource.js'

const DAY_MS = 86_400_000
const MAX_REPORT_DAYS = 5000

function parseDay(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number) as [number, number, number]
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

function dayKey(date: Date): string {
  return toISODate(date)
}

function dayDiff(a: Date, b: Date): number {
  return Math.round(
    (Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) /
      DAY_MS,
  )
}

function addDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
}

function startOfWeek(date: Date, weekStart: number): Date {
  const start = weekStart === 0 ? 0 : 1
  const diff = (date.getDay() - start + 7) % 7
  return addDays(date, -diff)
}

function capacityOnDay(resource: ResourceItem, date: Date, defaultCapacity: number): number {
  const base =
    typeof resource.capacity === 'number' && Number.isFinite(resource.capacity) && resource.capacity > 0
      ? resource.capacity
      : defaultCapacity
  const key = dayKey(date)
  const override = resource.capacityOverrides?.[key]
  if (typeof override === 'number' && Number.isFinite(override) && override >= 0) return override
  if (resource.holidays?.includes(key)) return 0
  if (resource.workdays === undefined) return base
  return resource.workdays.includes(date.getDay()) ? base : 0
}

/** 资源日历导出格式（版本化，便于宿主持久化/交换）。 */
export interface ResourceCalendarFile {
  version: 1
  resources: ResourceCalendarEntry[]
}

/** 单个资源的日历字段；只包含可持久化的日历与技能信息。 */
export interface ResourceCalendarEntry {
  id: string
  name: string
  capacity?: number
  workdays?: number[]
  holidays?: string[]
  capacityOverrides?: Record<string, number>
  skills?: string[]
}

/** 导出资源日历（JSON 字符串）；忽略没有 id 的资源。 */
export function exportResourceCalendars(resources: ResourceItem[]): string {
  const entries: ResourceCalendarEntry[] = []
  for (const resource of resources) {
    const id = typeof resource.id === 'string' && resource.id.trim() !== '' ? resource.id : ''
    if (!id) continue
    const entry: ResourceCalendarEntry = { id, name: resource.name }
    if (typeof resource.capacity === 'number' && Number.isFinite(resource.capacity)) entry.capacity = resource.capacity
    if (Array.isArray(resource.workdays)) entry.workdays = [...resource.workdays]
    if (Array.isArray(resource.holidays)) entry.holidays = [...resource.holidays]
    if (resource.capacityOverrides) entry.capacityOverrides = { ...resource.capacityOverrides }
    if (Array.isArray(resource.skills)) entry.skills = [...resource.skills]
    entries.push(entry)
  }
  return JSON.stringify({ version: 1, resources: entries } satisfies ResourceCalendarFile, null, 2)
}

/** 解析资源日历 JSON；结构非法时抛错，宿主可 catch 后提示。 */
export function importResourceCalendars(input: string): ResourceCalendarFile {
  const parsed: unknown = JSON.parse(input)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('resource calendar: root must be an object')
  }
  const version = (parsed as { version?: unknown }).version
  if (version !== 1) throw new Error('resource calendar: unsupported version')
  const raw = (parsed as { resources?: unknown }).resources
  if (!Array.isArray(raw)) throw new Error('resource calendar: resources must be an array')
  const resources: ResourceCalendarEntry[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) continue
    const record = item as Record<string, unknown>
    const id = typeof record.id === 'string' ? record.id.trim() : ''
    if (!id) continue
    const name = typeof record.name === 'string' && record.name.trim() !== '' ? record.name.trim() : id
    const entry: ResourceCalendarEntry = { id, name }
    const capacity = record.capacity
    if (typeof capacity === 'number' && Number.isFinite(capacity) && capacity > 0) entry.capacity = capacity
    if (Array.isArray(record.workdays)) {
      entry.workdays = [
        ...new Set(
          record.workdays.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 6),
        ),
      ]
    }
    if (Array.isArray(record.holidays)) {
      entry.holidays = [
        ...new Set(
          record.holidays
            .filter((x): x is string => typeof x === 'string' && !!parseDay(x))
            .map((x) => dayKey(parseDay(x)!)),
        ),
      ]
    }
    if (
      record.capacityOverrides &&
      typeof record.capacityOverrides === 'object' &&
      !Array.isArray(record.capacityOverrides)
    ) {
      const overrides: Record<string, number> = {}
      for (const [key, value] of Object.entries(record.capacityOverrides)) {
        if (!parseDay(key)) continue
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) overrides[key] = value
      }
      if (Object.keys(overrides).length > 0) entry.capacityOverrides = overrides
    }
    if (Array.isArray(record.skills)) {
      entry.skills = [
        ...new Set(
          record.skills.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()),
        ),
      ]
    }
    resources.push(entry)
  }
  return { version: 1, resources }
}

/** 利用率报告选项。 */
export interface UtilizationOptions {
  /** 汇总粒度；缺省 day。 */
  scale?: ResourceScale
  /** 资源缺省 capacity；缺省 1。 */
  capacity?: number
  /** 报告起止（含端）；缺省从任务最早开始到最晚结束。 */
  rangeStart?: string
  rangeEnd?: string
  /** 周起始日；0=周日、1=周一（缺省 1）。 */
  weekStart?: number
}

/** 单个 period 的利用率。 */
export interface UtilizationPeriod {
  start: string
  end: string
  load: number
  capacity: number
  utilization: number
}

/** 单个资源在报告区间内的利用率。 */
export interface ResourceUtilization {
  resourceId: string
  name: string
  load: number
  capacity: number
  utilization: number
  periods: UtilizationPeriod[]
}

/** 资源利用率报告（E47）。 */
export interface UtilizationReport {
  rangeStart: string
  rangeEnd: string
  resources: ResourceUtilization[]
  totalLoad: number
  totalCapacity: number
  utilization: number
}

function taskDays(task: ResourceTask): { start: Date; end: Date } | null {
  const start = parseDay(task.start)
  if (!start) return null
  const end = parseDay(task.end) ?? start
  return end < start ? { start: end, end: start } : { start, end }
}

function periodKey(date: Date, scale: ResourceScale, weekStart: number): string {
  if (scale === 'month') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  if (scale === 'week') return dayKey(startOfWeek(date, weekStart))
  return dayKey(date)
}

function periodStart(date: Date, scale: ResourceScale, weekStart: number): Date {
  if (scale === 'month') return new Date(date.getFullYear(), date.getMonth(), 1)
  if (scale === 'week') return startOfWeek(date, weekStart)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * 计算资源利用率（E47）。
 * 负载口径与 oas-resource 一致：任务与某日相交，则每个 assigned resource 记 1；
 * 容量按资源日历逐日求和，未声明日历字段时 capacity 为逐日基数。
 */
export function computeUtilization(
  resources: ResourceItem[],
  tasks: ResourceTask[],
  options: UtilizationOptions = {},
): UtilizationReport {
  const scale = options.scale ?? 'day'
  const defaultCapacity =
    typeof options.capacity === 'number' && Number.isFinite(options.capacity) && options.capacity > 0
      ? options.capacity
      : 1
  const weekStart = options.weekStart === 0 ? 0 : 1
  const prepared: Array<{ task: ResourceTask; start: Date; end: Date }> = []
  for (const task of tasks) {
    const span = taskDays(task)
    if (!span) continue
    prepared.push({ task, ...span })
  }
  let rangeStart = parseDay(options.rangeStart)
  let rangeEnd = parseDay(options.rangeEnd)
  if (prepared.length > 0) {
    const min = prepared.reduce((acc, item) => (item.start < acc ? item.start : acc), prepared[0]!.start)
    const max = prepared.reduce((acc, item) => (item.end > acc ? item.end : acc), prepared[0]!.end)
    rangeStart ??= min
    rangeEnd ??= max
  }
  if (!rangeStart || !rangeEnd) {
    return { rangeStart: '', rangeEnd: '', resources: [], totalLoad: 0, totalCapacity: 0, utilization: 0 }
  }
  if (rangeEnd < rangeStart) [rangeStart, rangeEnd] = [rangeEnd, rangeStart]
  const dayCount = dayDiff(rangeEnd, rangeStart) + 1
  if (dayCount > MAX_REPORT_DAYS) rangeEnd = addDays(rangeStart, MAX_REPORT_DAYS - 1)

  const reportRows: ResourceUtilization[] = []
  let totalLoad = 0
  let totalCapacity = 0
  for (const resource of resources) {
    const resourceId = typeof resource.id === 'string' && resource.id.trim() !== '' ? resource.id : ''
    if (!resourceId) continue
    const buckets = new Map<string, UtilizationPeriod>()
    const assigned = prepared.filter(({ task }) => Array.isArray(task.resources) && task.resources.includes(resourceId))
    for (let i = 0; i < dayCount; i++) {
      const date = addDays(rangeStart, i)
      const key = periodKey(date, scale, weekStart)
      const bucketStart = periodStart(date, scale, weekStart)
      let bucket = buckets.get(key)
      if (!bucket) {
        const bucketEnd =
          scale === 'month'
            ? addDays(new Date(bucketStart.getFullYear(), bucketStart.getMonth() + 1, 1), -1)
            : scale === 'week'
              ? addDays(bucketStart, 6)
              : bucketStart
        bucket = { start: dayKey(bucketStart), end: dayKey(bucketEnd), load: 0, capacity: 0, utilization: 0 }
        buckets.set(key, bucket)
      }
      bucket.capacity += capacityOnDay(resource, date, defaultCapacity)
      for (const item of assigned) {
        if (date >= item.start && date <= item.end) bucket.load += 1
      }
    }
    const periods = [...buckets.values()]
    let load = 0
    let capacity = 0
    for (const period of periods) {
      load += period.load
      capacity += period.capacity
      period.utilization = period.capacity > 0 ? period.load / period.capacity : 0
    }
    totalLoad += load
    totalCapacity += capacity
    reportRows.push({
      resourceId,
      name: resource.name,
      load,
      capacity,
      utilization: capacity > 0 ? load / capacity : 0,
      periods,
    })
  }
  return {
    rangeStart: dayKey(rangeStart),
    rangeEnd: dayKey(rangeEnd),
    resources: reportRows,
    totalLoad,
    totalCapacity,
    utilization: totalCapacity > 0 ? totalLoad / totalCapacity : 0,
  }
}

/** 技能矩阵（E42）：所有资源技能并集 + 每个资源的具备情况。 */
export interface SkillMatrix {
  skills: string[]
  resources: Array<{ resourceId: string; name: string; has: Record<string, boolean> }>
}

/** 构建只读技能矩阵；技能按字母序，资源保持输入顺序。 */
export function buildSkillMatrix(resources: ResourceItem[]): SkillMatrix {
  const skillSet = new Set<string>()
  for (const resource of resources) {
    if (!Array.isArray(resource.skills)) continue
    for (const skill of resource.skills)
      if (typeof skill === 'string' && skill.trim() !== '') skillSet.add(skill.trim())
  }
  const skills = [...skillSet].sort((a, b) => a.localeCompare(b))
  const rows: SkillMatrix['resources'] = []
  for (const resource of resources) {
    const resourceId = typeof resource.id === 'string' && resource.id.trim() !== '' ? resource.id : ''
    if (!resourceId) continue
    const owned = new Set(
      (Array.isArray(resource.skills) ? resource.skills : [])
        .filter((skill): skill is string => typeof skill === 'string')
        .map((skill) => skill.trim()),
    )
    const has: Record<string, boolean> = {}
    for (const skill of skills) has[skill] = owned.has(skill)
    rows.push({ resourceId, name: resource.name, has })
  }
  return { skills, resources: rows }
}

/** 指派建议（E44）：按技能缺口、利用率、容量排序。 */
export interface AssignmentSuggestion {
  resourceId: string
  name: string
  skills: string[]
  missingSkills: string[]
  load: number
  capacity: number
  utilization: number
  score: number
}

/** 为任务推荐资源；不修改任何数据。 */
export function suggestAssignments(
  task: ResourceTask,
  resources: ResourceItem[],
  tasks: ResourceTask[] = [],
  options: UtilizationOptions = {},
): AssignmentSuggestion[] {
  const span = taskDays(task)
  if (!span) return []
  const required = Array.isArray(task.requiredSkills) ? task.requiredSkills : []
  const pool = tasks.some((t) => t === task) ? tasks : [...tasks, task]
  const report = computeUtilization(resources, pool, {
    ...options,
    scale: 'day',
    rangeStart: options.rangeStart ?? dayKey(span.start),
    rangeEnd: options.rangeEnd ?? dayKey(span.end),
  })
  const byId = new Map(report.resources.map((row) => [row.resourceId, row]))
  const out: AssignmentSuggestion[] = []
  for (const resource of resources) {
    const resourceId = typeof resource.id === 'string' && resource.id.trim() !== '' ? resource.id : ''
    if (!resourceId) continue
    const skills = Array.isArray(resource.skills) ? resource.skills : []
    const missingSkills = required.filter((skill) => !skills.includes(skill))
    const row = byId.get(resourceId)
    const load = row?.load ?? 0
    const capacity = row?.capacity ?? 0
    const utilization = capacity > 0 ? load / capacity : 0
    const score = missingSkills.length * 1000 + utilization * 100 - capacity
    out.push({
      resourceId,
      name: resource.name,
      skills: [...skills],
      missingSkills,
      load,
      capacity,
      utilization,
      score,
    })
  }
  return out.sort((a, b) => a.score - b.score || a.resourceId.localeCompare(b.resourceId))
}
