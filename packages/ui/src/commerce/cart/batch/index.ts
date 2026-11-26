/**
 * cart 批量操作编排（commerce helper 能力子路径）：
 *
 * 批量删除 / 批量移收藏的宿主侧编排——`oas-cart` 本体的勾选基础设施（每行常驻
 * checkbox + 全选联动 + 禁用条目不可勾选）已齐备，宿主在 `actions` 插槽放自己的
 * 批量按钮（「删除所选」「收藏所选」——收藏是宿主业务语义，收藏去向由宿主定义），
 * 勾选完成后调用本能力执行编排并回写 `items`。
 *
 * **形态决策（helper 型，不进 L1/CDN）**：批量编排是纯数据变换
 * （items + 目标集 → 结果清单 + 新 items），无生命周期 / 无实例状态 / 不读组件内部
 * （公开 `items` 访问器足够）；注册型（`<oas-cart batch>` 激活批量 UI）需要给本体加
 * attribute + 批量操作栏 + i18n 文案，违反 commerce「本体冻结在大众功能集」的族级
 * 分级决策，且「收藏」动作语义必须由宿主定义、组件无从内建。交互面：勾选 UI 本体
 * 已有，批量按钮归宿主（`actions` 插槽既有扩展位），helper 只补编排与事件。
 *
 * **禁用判定与本体同语义**：`executeBatch` 入口走 core 的 `injectDisabled`——
 * attribute `disabled` / config-provider 注入（provider 属性 + JSON 级判定，不写
 * attribute）任一命中即视为禁用；`disabled-skip` 豁免同语义生效。只判 attribute 会
 * 漏掉注入禁用（provider 包裹下本体按钮全禁而 helper 照删——数据破坏），故必须
 * import core 同一判定函数。
 *
 * 校验口径（与勾选面一致）：禁用条目跳过（勾选 UI 本就勾不中，编排层再拦一道防
 * 显式 ids 误伤——批量删除跳过禁用卡是「防误删」保守口径；失效商品的单删仍走本体
 * 行内删除钮，语义不受影响）；id 不存在跳过（items 快照与执行间隙的防御）。
 * 购物车整体禁用（attribute 或注入）时全部跳过、不回写，仍派 `oas-batch` 供宿主反馈。
 *
 * **回写以宿主 attribute 原文为基座、仅对成功项应用操作**：零操作（succeeded 为空）
 * 不回写——归一化整体回写会补写默认值并抹掉宿主手工设置的禁用条目 `selected:true`
 * 等原文；部分成功时未成功条目按原文保留。
 *
 * 按需引入：`@oas-ui/ui/commerce/cart/batch`；运行闭包含 core 的 config-context
 * （injectDisabled 判定）与 shared dev-warn，不含 oas-cart 本体 / i18n（类型仅
 * `import type`，构建期擦除）。helper 型能力：无 HTML/属性触发面，宿主显式 import
 * 调用导出函数；不进 L1 / CDN 族包。
 */

import { injectDisabled } from '@oas-ui/core/config-context'
import { devWarn } from '../../../shared/dev-warn.js'
import type { CartItem, OASCart } from '../oas-cart.js'

/** 批量操作目标条目（宿主业务字段自由携带；`favorite` 为本能力的收藏标记约定字段） */
export interface CartBatchItem extends CartItem {
  favorite?: boolean
}

export type CartBatchOpType = 'remove' | 'favorite'

/** 批量操作：remove（删除所选）/ favorite（移收藏 / 取消收藏） */
export interface CartBatchOp {
  type: CartBatchOpType
  /** favorite 的目标值（缺省 true）；remove 忽略该字段 */
  value?: boolean
}

export type CartBatchSkipReason = 'disabled' | 'not-found'

export interface CartBatchSkip {
  id: string
  reason: CartBatchSkipReason
}

/** 一次批量编排的结果（`oas-batch` detail 同形） */
export interface CartBatchOutcome {
  /** 本次执行的操作 */
  op: CartBatchOp
  /** 编排后的完整条目列表（成功项已应用；部分成功时以宿主原文为基座保留未成功条目） */
  items: CartBatchItem[]
  /** 成功执行的条目 id 清单 */
  succeeded: string[]
  /** 被跳过的条目清单（禁用条目 / id 不存在） */
  skipped: CartBatchSkip[]
  /** 实际改动条目的快照——remove = 被删条目、favorite = 改后条目
      （宿主据此调收藏 API / 撤销弹层） */
  changed: CartBatchItem[]
}

const OP_TYPES: readonly string[] = ['remove', 'favorite']

/** op 校验：type 非法 → devWarn 一次并返回 null（调用方零操作短路） */
function normalizeOp(op: CartBatchOp): CartBatchOp | null {
  if (!op || !OP_TYPES.includes(op.type as string)) {
    devWarn(`[oas-cart/batch] op.type "${String(op?.type)}" 非法（remove / favorite），已零操作返回`)
    return null
  }
  return op
}

/** 目标条目判定：显式 ids 优先（含顺序），否则取勾选集（selected === true） */
function targetIdsOf(items: CartBatchItem[], ids?: string[]): string[] {
  if (ids) return ids
  return items.filter((item) => item.selected === true).map((item) => item.id)
}

/**
 * 纯函数编排（不触碰 DOM、不派事件）：对条目列表执行一次批量操作。
 * 输入数组与条目对象均不被 mutate（成功项浅拷贝后改写）。
 *
 * @param items 条目列表（宿主持有的数据，原文即可——禁用/勾选按条目字段判定）
 * @param op    批量操作（remove / favorite）
 * @param ids   显式目标 id 清单；缺省取 `selected === true` 的勾选集
 */
export function applyBatch(items: CartBatchItem[], op: CartBatchOp, ids?: string[]): CartBatchOutcome {
  const validOp = normalizeOp(op)
  if (!validOp) {
    return { op, items: [...items], succeeded: [], skipped: [], changed: [] }
  }
  const targets = targetIdsOf(items, ids)
  const targetSet = new Set(targets)
  const out: CartBatchItem[] = []
  const succeeded: string[] = []
  const skipped: CartBatchSkip[] = []
  const changed: CartBatchItem[] = []
  const seen = new Set<string>()
  for (const item of items) {
    if (!targetSet.has(item.id)) {
      out.push(item)
      continue
    }
    seen.add(item.id)
    if (item.disabled === true) {
      skipped.push({ id: item.id, reason: 'disabled' })
      out.push(item)
      continue
    }
    succeeded.push(item.id)
    if (validOp.type === 'remove') {
      // changed = 被删条目快照（保留宿主字段）
      changed.push({ ...item })
      continue
    }
    // favorite：写标记字段（浅拷贝隔离，不 mutate 输入）
    const next: CartBatchItem = { ...item, favorite: validOp.value !== false }
    changed.push(next)
    out.push(next)
  }
  // 显式 ids 里指向不存在条目的目标 → not-found（勾选集天然全存在，不会走这）
  for (const id of targets) {
    if (!seen.has(id)) skipped.push({ id, reason: 'not-found' })
  }
  return { op: validOp, items: out, succeeded, skipped, changed }
}

/**
 * 宿主 attribute 原文条目（不经本体归一——归一会把禁用条目 `selected` 收敛为 false、
 * 补写缺省 quantity 等默认值；编排与回写都以原文为基座，宿主手工设置的任何字段不被
 * 零操作或部分成功抹掉）。非法 JSON / 非对象条目跳过（本体渲染层自会按空列表处理）。
 */
function rawItemsOf(cart: OASCart): CartBatchItem[] {
  const raw = cart.getAttribute('items')
  if (raw == null || raw.trim() === '') return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is CartBatchItem =>
        typeof item === 'object' && item !== null && typeof (item as CartBatchItem).id === 'string',
    )
  } catch {
    return []
  }
}

/**
 * 实例编排：`applyBatch`（原文基座）+ 成功时 `cart.items` 回写 + `oas-batch` 事件
 * （bubbles + composed，detail = outcome）。
 *
 * - **禁用判定与本体同语义**：`injectDisabled`（attribute / config-provider 注入 /
 *   disabled-skip 豁免）。禁用时全部跳过、不回写，仍派 `oas-batch`——宿主据此给出
 *   「不可操作」反馈。
 * - **零操作不回写**：succeeded 为空（无勾选 / 全部跳过 / op 非法）只派事件——归一化
 *   整体回写会补写默认值并抹掉宿主原文（如禁用条目手工 `selected:true`）。
 * - **部分成功增量回写**：outcome.items 以宿主原文为基座（未成功条目原文保留）。
 *
 * 与本体事件协议的关系：回写 `items` attribute 走本体既有属性通道（本体不因外部
 * 写入派发 `oas-change`）；合计变化由宿主按既有方式监听（attribute 变化或重读
 * `cart.items`）。`oas-batch` 是批量编排自身的汇总事件，不替代逐条的
 * `oas-remove`（批量场景逐卡弹确认不合理——宿主应在调用前自行确认）。
 */
export function executeBatch(cart: OASCart, op: CartBatchOp): CartBatchOutcome {
  const items = rawItemsOf(cart)
  const zeroOutcome = (): CartBatchOutcome => ({ op, items, succeeded: [], skipped: [], changed: [] })
  // op 非法：零操作短路——不回写、不派发（devWarn 已由 normalizeOp 发出）
  if (!normalizeOp(op)) return zeroOutcome()
  // 禁用判定与本体 isDisabled 同语义（attribute 或 config-provider 注入均视为禁用）
  if (injectDisabled(cart)) {
    const targets = targetIdsOf(items)
    const outcome: CartBatchOutcome = {
      op,
      items,
      succeeded: [],
      skipped: targets.map((id) => ({ id, reason: 'disabled' as const })),
      changed: [],
    }
    dispatchBatch(cart, outcome)
    return outcome
  }
  const outcome = applyBatch(items, op)
  // 零操作（含全跳过）不回写：只派事件反馈，宿主 attribute 原文不被归一化抹写
  if (outcome.succeeded.length > 0) cart.items = outcome.items
  dispatchBatch(cart, outcome)
  return outcome
}

/** oas-batch 派发（与 OASElement.emit 同语义：bubbles + composed） */
function dispatchBatch(cart: OASCart, outcome: CartBatchOutcome): void {
  cart.dispatchEvent(new CustomEvent('oas-batch', { detail: outcome, bubbles: true, composed: true }))
}
