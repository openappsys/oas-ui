/**
 * 分页切片变换段（纯函数）：过滤 → 排序 → 分页切片（含外部分页 total 口径）。
 *
 * 与组件 `oas-table.ts` 的 `computeDisplayRoots` 单一真相源：组件侧为薄壳
 * （读属性 → 调用本模块 → 按返回的 `clamped` 建议值写回 current 属性），
 * 语义逐字节一致。纯函数**零副作用**——组件内原有的 `setAttribute('current', …)`
 * 钳制写回不在这里发生，只返回 `clampedCurrent` / `clamped` 由壳层执行。
 * windowed 模式（data 即宿主切好的绝对行窗口切片）不适用本函数，组件壳层自持。
 * 零 DOM 依赖。
 */
import { matchesFilters } from './filter.js'
import { columnTypeMap, compareRows } from './sort.js'
import type { DataColumn, DisplayRootsResult, FilterValues, SortState } from './types.js'

/** `computeDisplayRoots` 的输入：数据 + 各属性归一化前的原值（归一化在本函数内完成） */
export interface DisplayRootsInput<T = Record<string, unknown>> {
  /** 行数据（顶层行） */
  data: T[]
  /** 列定义（排序类型映射消费；不传时排序按原始值形态比较） */
  columns?: DataColumn[]
  /** 过滤值集合（serverModel=true 时被忽略；空对象 = 无过滤） */
  filterValues?: FilterValues
  /** 排序状态（serverModel=true 时被忽略；排序只在分页开启时在此执行——与组件口径一致） */
  sorts?: SortState[]
  /**
   * 分页输入：缺省/null = 未开启分页（无全局排序、无切片）。
   * total 在场 = 外部分页口径（data 即当前页切片：只排序不切片，total 直通输出）。
   */
  pagination?: { current: number; pageSize: number; total?: number } | null
  /** server 行模型语义：true = 跳过本地过滤与本地排序（全有或全无，不逐段混用） */
  serverModel?: boolean
}

/** 页尺寸归一化：非法/缺省回落 10，最小 1（与组件读属性口径一致） */
export function normalizePageSize(pageSize: unknown): number {
  return Math.max(1, Number(pageSize) || 10)
}

/** 页码归一化：非法/缺省回落 1，最小 1（与组件读属性口径一致） */
export function normalizeCurrent(current: unknown): number {
  return Math.max(1, Number(current) || 1)
}

/** 总页数：至少 1 页（total=0 也是 1 页，与组件钳制口径一致） */
export function pageCountOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

/**
 * 外部总数归一化（组件 `total` 属性的纯函数面）：带合法非负数字时生效——`data` 视为
 * 宿主已切好的当前页数据，组件不再内部分页切片，总数直通分页器。返回 null = 未启用
 * 外部总数（内部切片模式）：空串、非数字或负数一律回落。
 */
export function normalizeExternalTotal(raw: string): number | null {
  const v = raw.trim()
  if (v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

/**
 * 过滤 + 分页切片：顶层行先过滤（分页页数反映过滤后数据），分页开启时先全局排序
 * 再切片当前页。外部分页（pagination.total 在场）时 data 即宿主已切好的当前页切片：
 * client 路径只排序不再切片；server 路径（serverModel=true）排序/过滤整体跳过——
 * 「全有或全无」语义，不提供逐段混用配置。返回值不含任何 DOM 副作用：超页钳制只
 * 产出建议值（clampedCurrent + clamped），写回属性由调用方决定。
 */
export function computeDisplayRoots<T extends Record<string, unknown>>(
  input: DisplayRootsInput<T>,
): DisplayRootsResult<T> {
  const serverRows = input.serverModel === true
  const filterValues = input.filterValues ?? {}
  let all = input.data
  if (!serverRows && Object.keys(filterValues).length > 0) {
    all = all.filter((row) => matchesFilters(row, filterValues, input.columns ?? []))
  }
  // 分页切片前的完整筛选集合（summary-scope=all 合计的输入基准；保持过滤后原序）
  const fullRoots = all
  const paginationOn = input.pagination != null
  const pageSize = normalizePageSize(paginationOn ? input.pagination!.pageSize : undefined)
  let current = normalizeCurrent(paginationOn ? input.pagination!.current : undefined)
  // 外部总数（服务端分页）：total 在场时 data 已是当前页切片，总数不走 data 长度
  const externalTotal = paginationOn && input.pagination!.total !== undefined ? input.pagination!.total : null
  const total = externalTotal ?? all.length
  let clamped = false
  let pageCount = 1
  // 未开分页：排序与切片整体不执行（排序由展平层逐级进行，与组件口径一致）
  let sorted = all
  let pageRows = all
  if (paginationOn) {
    pageCount = pageCountOf(total, pageSize)
    if (current > pageCount) {
      current = pageCount
      clamped = true
    }
    // 内部切片模式：全局排序后取当前页；外部总数模式：宿主已切片，只排序不再切片。
    // server 行模型（前提即外部总数在场）：排序也由服务端负责——data 原样透传；
    // client 路径（外部总数在场但未开 server）保持现状：本地排序仍作用于当前页切片
    const sorts = serverRows ? [] : (input.sorts ?? [])
    if (externalTotal === null) {
      sorted = [...all]
      if (sorts.length > 0) {
        const tm = columnTypeMap(input.columns)
        sorted.sort((a, b) => compareRows(a, b, sorts, tm))
      }
      const start = (current - 1) * pageSize
      pageRows = sorted.slice(start, start + pageSize)
    } else if (!serverRows) {
      sorted = [...all]
      if (sorts.length > 0) {
        const tm = columnTypeMap(input.columns)
        sorted.sort((a, b) => compareRows(a, b, sorts, tm))
      }
      pageRows = sorted
    }
  }
  return {
    // roots = 过滤 + 排序后的全量顶层行（未切片）；pageRows = 当前页切片
    roots: sorted,
    fullRoots,
    pageRows,
    total,
    pageCount,
    clampedCurrent: current,
    clamped,
    paginationOn,
  }
}
