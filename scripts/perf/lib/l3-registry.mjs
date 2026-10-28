/**
 * L3 能力子路径登记表（分层预算与包含关系的**单一登记源**）。
 *
 * 背景（docs/architecture.md §3.1）：L1 ⊇ L2、L2 不默认含 L3；但「L1 包含全部 L3」
 * 需要按 L3 的**激活方式**分成两类对账（2026-10-28 table 批实测闭包结论）：
 *
 * - `kind: 'capability'`（注册型）：import 即把能力写入组件能力注册表，组件属性/HTML
 *   即可触发（含迟到自愈）。若缺席 L1/CDN，「一把梭」消费者声明对应属性时能力静默失效——
 *   **必须含于 L1**。当前实例：`table/edit`、`tabs/manager`、`modal/prompt`、
 *   `popover/contextmenu`、`color-picker/designer`。
 * - `kind: 'helper'`（纯函数/宿主侧 helper 型）：只导出函数，必须由宿主代码显式调用才能
 *   生效（无 HTML/属性触发面）。CDN 无 JS 的消费方式根本调不到这些函数，进 union 即死重——
 *   **不得进入 L1/CDN**，按需显式 import。当前实例：table 家族 Pro 能力
 *   `advanced / format / view / range / history / detail`。
 *   注：`format` / `range` 内部虽调用 `registerTableCapability`，但其激活唯一入口是
 *   导出函数（setConditionalFormat / setRangeSelection…），宿主不调用则注册表项无效果，
 *   故按 helper 归类。
 *
 * `measured: true` 的条目必须在 `scripts/perf/size.mjs` 拥有独立按需链测量
 * （COMPONENT_ENTRIES）与独立预算档（BUDGETS 带 `componentId` 标签）——table 家族的
 * L3 全部独立计量；非 table 的 capability L3（manager/prompt/contextmenu/designer）
 * 体量小且随宿主组件链计量，只做 L1 包含断言，不立独立预算档。
 *
 * 消费方：`scripts/perf/size.mjs`（对 live dist 图断言）与 perf-baseline 文档生成。
 * 登记表变更须同步 `docs/architecture.md` §3.1 的登记表文案（文档数值由生成块保证）。
 */
export const L3_REGISTRY = [
  // —— table 家族（独立计量 + 独立预算档） ——
  { id: 'tableEdit', entry: 'data/table/edit', kind: 'capability', measured: true },
  { id: 'tableAdvanced', entry: 'data/table/advanced', kind: 'helper', measured: true },
  { id: 'tableFormat', entry: 'data/table/format', kind: 'helper', measured: true },
  { id: 'tableView', entry: 'data/table/view', kind: 'helper', measured: true },
  { id: 'tableRange', entry: 'data/table/range', kind: 'helper', measured: true },
  { id: 'tableHistory', entry: 'data/table/history', kind: 'helper', measured: true },
  { id: 'tableDetail', entry: 'data/table/detail', kind: 'helper', measured: true },
  // —— 非 table 注册型 L3（只做 L1 包含断言；不立独立预算档） ——
  { id: 'tabsManager', entry: 'navigation/tabs/manager', kind: 'capability', measured: false },
  { id: 'modalPrompt', entry: 'feedback/modal/prompt', kind: 'capability', measured: false },
  { id: 'popoverContextmenu', entry: 'feedback/popover/contextmenu', kind: 'capability', measured: false },
  { id: 'colorPickerDesigner', entry: 'form/color-picker/designer', kind: 'capability', measured: false },
]

const normalize = (file) => file.replaceAll('\\', '/')

/** L3 入口在 dist 文件清单中的判定标记（collectGraph 只收集 .js，路径形如 packages/ui/dist/<entry>/…） */
const chainMarkerOf = (item) => `dist/${item.entry}/`

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
