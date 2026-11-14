/**
 * table 行模型数据层（headless 子路径 `@oas-ui/ui/data/table/model`）。
 *
 * 框架无关、零 DOM 依赖、零副作用的行模型纯函数管道：
 *
 *   过滤 → 排序 → 分页切片 → 分组 → 展平 → 可见集（树展开/分组折叠）
 *
 * 与 `oas-table` 组件内部行模型**同一实现**（单一真相源）：组件壳层负责读属性 /
 * 写回属性（如 current 超页钳制）与 DOM 渲染，变换本身全部走本模块——两种形态
 * （组件渲染 / 拿数据自己渲染）共享同一套行语义，不会各算各的。
 *
 * - 按需引入：`import { computeRowModel } from '@oas-ui/ui/data/table/model'`；
 *   运行闭包不含组件本体 / core / i18n / 任何 DOM API，可在 node / worker / SSR
 *   / 程序化驱动场景直接使用（i18n 文案以参数注入，如 `groupEmptyLabel`）。
 * - 组件内原有的 `setAttribute` 钳制等 DOM 副作用不在这里发生：纯函数只返回
 *   建议值（`clampedCurrent` / `clamped`），写回由调用方（组件壳层或宿主）决定。
 * - 零行为漂移守护：组件接线以渲染签名金本位（10 配置）+ 全量套件断言。
 *
 * 最小用法（拿行模型自己渲染）：
 *
 * ```ts
 * import { computeRowModel } from '@oas-ui/ui/data/table/model'
 *
 * const model = computeRowModel({
 *   data: rows,
 *   columns: [{ key: 'name' }, { key: 'age', type: 'number' }],
 *   sorters: [{ key: 'age', order: 'desc' }],
 *   filters: { name: '张' },
 *   pagination: { current: 1, pageSize: 10 },
 *   expanded: new Set(['n1']),
 * })
 * render(model.visible) // 或消费 pageRows / total / pageCount 自行拼装
 * ```
 */
import { buildFlat } from './group.js'
import {
  computeDisplayRoots,
  normalizeCurrent,
  normalizeExternalTotal,
  normalizePageSize,
  pageCountOf,
  type DisplayRootsInput,
} from './paginate.js'
import { parseFilterValues, matchesFilters, flattenLeaves } from './filter.js'
import { resolveSorts, columnTypeMap, codePointCompare, compareRows, type SortAttrs } from './sort.js'
import { visibleFlat } from './visible.js'
import type {
  DataColumnType,
  DataColumn,
  DisplayRootsResult,
  FilterValues,
  FlatRow,
  RowModelInput,
  RowModelResult,
  SortDirection,
  SortState,
} from './types.js'

// —— 公开面：管道入口 + 分段纯函数 + 归一化工具 + 全部类型 ——
export {
  // 管道入口
  computeRowModel,
  // 分段纯函数（可单独组合）
  computeDisplayRoots,
  buildFlat,
  visibleFlat,
  parseFilterValues,
  matchesFilters,
  resolveSorts,
  compareRows,
  codePointCompare,
  columnTypeMap,
  flattenLeaves,
  // 属性归一化（壳层读属性 → 纯函数输入的共用口径）
  normalizePageSize,
  normalizeCurrent,
  normalizeExternalTotal,
  pageCountOf,
}
export type {
  DataColumnType,
  DataColumn,
  DisplayRootsInput,
  DisplayRootsResult,
  FilterValues,
  FlatRow,
  RowModelInput,
  RowModelResult,
  SortAttrs,
  SortDirection,
  SortState,
}

/** 模块级只读空集合（expanded / collapsedGroups 缺省值） */
const EMPTY_SET: ReadonlySet<string> = new Set()

/**
 * 行模型管道入口：过滤 → 排序 → 分页切片 → 分组 → 展平 → 可见集，一次算齐全部派生值。
 *
 * - `serverModel: true`：本地过滤与本地排序整体跳过（服务端已按当前条件返回当前页
 *   切片，data 原样透传）；分页切片仍由调用方输入描述（外部分页口径）。
 * - `pagination.total` 在场 = 外部分页口径：data 即当前页切片，只排序不切片，
 *   total 直通输出；缺省 = 内部切片模式。
 * - 纯函数：不改写入参（data / filters / sorters 等均不被修改），无 DOM 副作用；
 *   超页钳制只产出 `clampedCurrent` / `clamped` 建议值。
 */
function computeRowModel<T extends Record<string, unknown>>(input: RowModelInput<T>): RowModelResult<T> {
  const serverModel = input.serverModel === true
  // server「全有或全无」：排序/过滤输入整体作废（与组件 renderSorts / 过滤跳过同口径）
  const sorts = serverModel ? [] : (input.sorters ?? [])
  const filters = serverModel ? {} : (input.filters ?? {})
  const rowKey = input.rowKey ?? 'key'
  const groupBy = input.grouping?.by ?? ''
  const display = computeDisplayRoots<T>({
    data: input.data,
    columns: input.columns,
    filterValues: filters,
    sorts,
    pagination: input.pagination ?? null,
    serverModel,
  })
  const flat = buildFlat(display.pageRows as Array<Record<string, unknown>>, input.columns, {
    sorts,
    rowKey,
    groupBy,
    groupEmptyLabel: input.groupEmptyLabel,
  })
  const visible = visibleFlat(flat, input.expanded ?? EMPTY_SET, rowKey, input.collapsedGroups ?? EMPTY_SET)
  return {
    roots: display.roots,
    pageRows: display.pageRows,
    total: display.total,
    pageCount: display.pageCount,
    clampedCurrent: display.clampedCurrent,
    clamped: display.clamped,
    flat,
    visible,
  }
}
