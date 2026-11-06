/**
 * L3 能力子路径登记表（分层预算与包含关系的**单一登记源**）。
 *
 * 背景（docs/architecture.md §3.1）：L1 ⊇ L2、L2 不默认含 L3；但「L1 包含全部 L3」
 * 需要按 L3 的**激活方式**分成两类对账（2026-10-28 table 批实测闭包结论）：
 *
 * - `kind: 'capability'`（注册型）：import 即把能力写入组件能力注册表，组件属性/HTML
 *   即可触发（含迟到自愈）。若缺席 L1/CDN，「一把梭」消费者声明对应属性时能力静默失效——
 *   **必须含于 L1**。当前实例：`table/edit`、`tabs/manager`、`modal/prompt`、
 *   `popover/contextmenu`、`color-picker/designer`，以及 `data/resource/pool`
 *   （无能力注册动作，但 gantt 的 `pool` 属性静态 import 它——属运行时依赖，
 *   缺席族包即 gantt 运行时断链，故按 capability 口径要求含于族包）。
 * - `kind: 'helper'`（纯函数/宿主侧 helper 型）：**激活唯一入口是导出函数，必须由宿主
 *   代码显式调用才能生效；可含 import 期惰性注册，但没有 HTML/属性触发面**（CDN 无 JS
 *   的消费方式调不到这些函数），进 L1/CDN union 即死重——**不得进入 L1/CDN**，按需显式
 *   import。当前实例：table 家族 Pro 能力 `advanced / format / view / range / history /
 *   detail / pivot / value-format / query`，layout 家族的 `scroll-area/infinite`
 *   （无限滚动 headless 控制器），以及 gantt/resource 数据加工子路径
 *   `export / evm / alap / recurring / cost`。
 *   注：`format` / `range` 内部虽调用 `registerTableCapability`，宿主不调用
 *   导出函数则注册表项无效果，故按 helper 归类。
 *
 * `family`：所属 CDN 族包（`dist/cdn/<family>.js`）。族包产物是自包含 IIFE bundle
 * （无静态 import 可遍历），其 `.map` 的 `sources` 数组即 bundler 实际解析的构建输入
 * 模块清单——`familyInclusionViolations` 以它为「真实静态图」断言：
 * - 注册型 L3 **必须在**所属族包的构建输入里（缺 = CDN 一把梭消费者拿不到能力）；
 * - helper 型 L3 **必须不在**（在 = 无触发面的死重混进族包）。
 *
 * `measured: true` 的条目必须在 `scripts/perf/size.mjs` 拥有独立按需链测量
 * （COMPONENT_ENTRIES）与独立预算档（BUDGETS 带 `componentId` 标签）——table 家族的
 * L3 全部独立计量，layout 家族的 `scroll-area/infinite` 亦独立计量；非 table 的
 * capability L3（manager/prompt/contextmenu/designer）体量小且随宿主组件链计量，
 * 只做 L1 与族包包含断言，不立独立预算档。
 *
 * 消费方：`scripts/perf/size.mjs`（对 live dist 断言）与 perf-baseline 文档生成。
 * 登记表变更须同步 `docs/architecture.md` §3.1 的登记表文案（文档数值由生成块保证）。
 */
export const L3_REGISTRY = [
  // —— table 家族（独立计量 + 独立预算档） ——
  { id: 'tableEdit', entry: 'data/table/edit', family: 'data', kind: 'capability', measured: true },
  {
    id: 'tableStructuralRender',
    entry: 'data/table/structural-render',
    family: 'data',
    kind: 'capability',
    measured: true,
  },
  { id: 'tableAdvanced', entry: 'data/table/advanced', family: 'data', kind: 'helper', measured: true },
  { id: 'tableFormat', entry: 'data/table/format', family: 'data', kind: 'helper', measured: true },
  { id: 'tableView', entry: 'data/table/view', family: 'data', kind: 'helper', measured: true },
  { id: 'tableRange', entry: 'data/table/range', family: 'data', kind: 'helper', measured: true },
  { id: 'tableHistory', entry: 'data/table/history', family: 'data', kind: 'helper', measured: true },
  { id: 'tableDetail', entry: 'data/table/detail', family: 'data', kind: 'helper', measured: true },
  // table 数据加工 helper 型 L3（细分职责拆包）：透视 / 值格式化 / 查询。
  // 激活唯一入口是显式 import 纯函数，无 HTML/属性触发面；进 L1/data 族包即死重。
  { id: 'tablePivot', entry: 'data/table/pivot', family: 'data', kind: 'helper', measured: true },
  {
    id: 'tableAudit',
    entry: 'data/table/audit',
    family: 'data',
    kind: 'helper',
    measured: true,
  },
  { id: 'tableValueFormat', entry: 'data/table/value-format', family: 'data', kind: 'helper', measured: true },
  { id: 'tableQuery', entry: 'data/table/query', family: 'data', kind: 'helper', measured: true },
  // 逐行动态行高（row-auto-height 注册型 capability L3；核心接缝为亚 KB 常数判空钩子）
  {
    id: 'tableAutoHeight',
    entry: 'data/table/auto-height',
    family: 'data',
    kind: 'capability',
    measured: true,
  },
  // —— 非 table 注册型 L3（只做 L1/族包包含断言；不立独立预算档） ——
  { id: 'tabsManager', entry: 'navigation/tabs/manager', family: 'navigation', kind: 'capability', measured: false },
  { id: 'modalPrompt', entry: 'feedback/modal/prompt', family: 'feedback', kind: 'capability', measured: false },
  {
    id: 'popoverContextmenu',
    entry: 'feedback/popover/contextmenu',
    family: 'feedback',
    kind: 'capability',
    measured: false,
  },
  {
    id: 'colorPickerDesigner',
    entry: 'form/color-picker/designer',
    family: 'form',
    kind: 'capability',
    measured: false,
  },
  // —— layout 家族 helper 型 L3（独立计量 + 独立预算档） ——
  // 无限滚动 headless 控制器：激活唯一入口是 createInfiniteScroll/InfiniteScrollController 导出函数，
  // 无 HTML/属性触发面；进 L1/layout 族包即死重，必须显式 import。
  {
    id: 'infiniteScroll',
    entry: 'layout/scroll-area/infinite',
    family: 'layout',
    kind: 'helper',
    measured: true,
  },
  // —— data 家族 helper 型 L3：gantt / resource 纯函数子路径（独立计量 + 独立预算档） ——
  // 数据加工 helper（CSV 导出 / EVM / 反推最晚日期 / 周期展开 / 成本核算 / 资源池）：
  // 激活唯一入口是显式 import 按需函数，无 HTML/属性触发面；进 L1/data 族包即死重，必须显式 import。
  { id: 'ganttExport', entry: 'data/gantt/export', family: 'data', kind: 'helper', measured: true },
  { id: 'ganttEvm', entry: 'data/gantt/evm', family: 'data', kind: 'helper', measured: true },
  { id: 'ganttAlap', entry: 'data/gantt/alap', family: 'data', kind: 'helper', measured: true },
  { id: 'ganttRecurring', entry: 'data/gantt/recurring', family: 'data', kind: 'helper', measured: true },
  { id: 'resourceCost', entry: 'data/resource/cost', family: 'data', kind: 'helper', measured: true },
  // 2026-11-03 T10 批起 gantt `pool` 属性静态依赖本模块（运行时随 gantt 进链/进族包，缺失即 gantt 运行时 import 断链）——
  // 不再符合 helper 型「无 HTML/属性触发面、进 L1/CDN 即死重」的判定前提，改归 capability 口径（族包必填）。
  // 无能力注册动作，纯数据模块；独立按需链计量仍保留（宿主仍可显式按需 import）。
  { id: 'resourcePool', entry: 'data/resource/pool', family: 'data', kind: 'capability', measured: true },
  // 资源负荷统计（gantt `show-resource-load` 属性与宿主按需 import 共用）：helper 型——
  // 入口路径 `data/resource/load` 本体只有 re-export（实现居 `src/shared/resource-load.ts`，
  // 组件属性**静态**消费同一份实现，实现随组件链进 L1/data 族包——resourcePool capability 同款
  // 判定「属性触发属运行时需求」）。入口路径自身无属性触发面，不进 L1/族包（路径标记
  // `/data/resource/load/` 只匹配入口，不匹配 `src/shared/` 实现——两层口径互不干扰）。
  { id: 'resourceLoad', entry: 'data/resource/load', family: 'data', kind: 'helper', measured: true },
  // 资源均衡算法核（levelResources 抽核，2026-11-06 Z11 批）：helper 型——
  // 入口路径 `data/resource/level` 本体只有 re-export（实现居 `src/shared/resource-level.ts`，
  // 组件桶静态消费同一份实现，实现随组件链进 L1/data 族包——resourceLoad 同款判定）。
  // 入口路径自身无属性触发面，不进 L1/族包（路径标记 `/data/resource/level/` 只匹配入口，
  // 不匹配 `src/shared/` 实现——两层口径互不干扰；family IIFE 入口为纯副作用，纯函数模块
  // 本就摇除——resource-utils 既有同款）。独立按需链计量保留：宿主显式 import 本入口
  // 绕开组件本体（抽核前须经组件模块单文件 16.25 KB gz；抽核后瘦链 ~13.2 KB，见预算档）。
  { id: 'resourceLevel', entry: 'data/resource/level', family: 'data', kind: 'helper', measured: true },
]

const normalize = (file) => file.replaceAll('\\', '/')

/** L3 入口在 dist 文件/构建输入清单中的判定标记（collectGraph 只收集 .js；sourcemap sources 为模块路径） */
const chainMarkerOf = (item) => `/${item.entry}/`

/**
 * L1 包含关系判定（全量入口链 vs 登记表）。
 * - capability 缺席 L1 → `{ reason: 'missing' }`（「一把梭」消费者拿不到能力）；
 * - helper 出现在 L1 → `{ reason: 'leaked' }`（纯函数/宿主 helper 混进 union = 死重）。
 * 违规数组为空 = 通过。
 */
export function l1InclusionViolations(registry, fullEntryFileList) {
  const files = fullEntryFileList.map(normalize)
  const out = []
  for (const item of registry) {
    const inChain = files.some((file) => file.includes(chainMarkerOf(item)))
    if (item.kind === 'capability' && !inChain) out.push({ item, reason: 'missing' })
    if (item.kind === 'helper' && inChain) out.push({ item, reason: 'leaked' })
  }
  return out
}

/**
 * L2 默认链零 L3 判定：`data/table` 默认链不得包含登记表中任何 table L3 入口
 * （含 edit——「默认不含 edit」是 v2.6.4 起的按需语义，此前门禁漏了这一段）。
 */
export function proLeakViolations(registry, defaultTableChainFileList) {
  const files = defaultTableChainFileList.map(normalize)
  const out = []
  for (const item of registry) {
    if (!item.entry.startsWith('data/table/')) continue
    const leaked = files.filter((file) => file.includes(chainMarkerOf(item)))
    if (leaked.length > 0) out.push({ item, reason: 'leaked', files: leaked })
  }
  return out
}

/**
 * 登记表中出现过的 family 集合（去重、保持首次出现顺序）。
 * perf:size 的族包收集清单**唯一来源**——不得在脚本里另手工维护第二份族包清单
 * （两处手工同步会漂移；typo family 会被派生进收集清单并因 map 缺失 fail closed）。
 */
export function registryFamilies(registry) {
  return [...new Set(registry.map((item) => item.family).filter(Boolean))]
}

/**
 * CDN 族包包含关系判定（族包构建输入 vs 登记表）。
 *
 * `familySources`：`{ [family]: string[] | null }`——各 `dist/cdn/<family>.js.map` 的
 * `sources` 数组（bundler 实际解析的输入模块，即真实静态图；IIFE bundle 本体无静态
 * import 可遍历，sourcemap 是唯一精确的构建输入证据）。判定对**登记表自身不完整**
 * 也不静默：
 * - 条目缺 `family` 字段 → `{ reason: 'missing-family' }`（登记不完整，不得跳过）；
 * - family 不在 `familySources` 键集 → `{ reason: 'unknown-family' }`（收集清单与
 *   登记表脱节，正常接线下不应发生——收集清单应由 `registryFamilies` 派生）；
 * - family 的值为 null/非数组（map 缺失或不可解析）→ `{ reason: 'no-map' }`
 *   （fail closed：禁用 sourcemap 或改产物布局必须同步此门禁）；
 * - capability 不在族包输入 → `{ reason: 'missing' }`；
 * - helper 在族包输入 → `{ reason: 'leaked' }`。
 */
export function familyInclusionViolations(registry, familySources) {
  const out = []
  for (const item of registry) {
    if (!item.family) {
      out.push({ item, family: null, reason: 'missing-family' })
      continue
    }
    if (!(item.family in familySources)) {
      out.push({ item, family: item.family, reason: 'unknown-family' })
      continue
    }
    const sources = familySources[item.family]
    if (!Array.isArray(sources)) {
      out.push({ item, family: item.family, reason: 'no-map' })
      continue
    }
    const inBundle = sources.some((source) => normalize(String(source)).includes(chainMarkerOf(item)))
    if (item.kind === 'capability' && !inBundle) out.push({ item, family: item.family, reason: 'missing' })
    if (item.kind === 'helper' && inBundle) out.push({ item, family: item.family, reason: 'leaked' })
  }
  return out
}

/**
 * 独立预算覆盖判定：`measured: true` 的 L3 必须同时满足
 * ① 在 COMPONENT_ENTRIES 有按需链测量（measuredIds）；② 在 BUDGETS 有带
 * `componentId` 标签的独立预算档（budgetComponentIds）。缺任一即违规——
 * 防「登记了却没计量」与「计量了却混进别家预算」。
 */
export function budgetCoverageViolations(registry, measuredIds, budgetComponentIds) {
  const measured = new Set(measuredIds)
  const budgeted = new Set(budgetComponentIds)
  const out = []
  for (const item of registry) {
    if (!item.measured) continue
    if (!measured.has(item.id)) out.push({ item, reason: 'unmeasured' })
    if (!budgeted.has(item.id)) out.push({ item, reason: 'no-budget' })
  }
  return out
}
