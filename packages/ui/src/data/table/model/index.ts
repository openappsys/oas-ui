/**
 * table 行模型数据层（headless 公开入口 `@oas-ui/ui/data/table/model`）。
 *
 * 框架无关、零 DOM 依赖、零副作用的行模型纯函数管道：
 *
 *   过滤 → 排序 → 分页切片 → 分组 → 展平 → 可见集（树展开/分组折叠）
 *
 * 与 `oas-table` 组件内部行模型**同一实现**（单一真相源）：组件壳层负责读属性 /
 * 写回属性（如 current 超页钳制）与 DOM 渲染，变换本体居 `model-core/`（组件静态
 * import 同一份实现——resourceLoad/level 同款「入口壳 + 实现分离」口径，入口路径
 * 自身无属性触发面、不进 L1/CDN 族包；实现随组件链进族包，两层互不干扰）——
 * 两种形态（组件渲染 / 拿数据自己渲染）共享同一套行语义，不会各算各的。
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
} from '../model-core/index.js'
export type {
  DataColumnType,
  DataColumn,
  DisplayRootsInput,
  DisplayRootsResult,
  FilterValues,
  FlatRow,
  PageInput,
  RowModelInput,
  RowModelResult,
  SortAttrs,
  SortDirection,
  SortState,
} from '../model-core/index.js'
