/**
 * filter 条件持久化（commerce helper 能力子路径，纯函数、零 DOM 零运行时依赖）：
 *
 * `oas-filter` 的 `conditions` JSON（`{ sort?, order?, groups? }`）的持久化编排——
 * URL（query / hash 共用 `conditions=<encoded>` 形态）与 Storage（localStorage /
 * sessionStorage / 宿主自有实现）双后端，宿主按场景取用或双写。组件本体不感知
 * 持久化（architecture §3.1 族级包体分级：本体冻结在大众功能集）；典型接法：
 *
 * ```js
 * import { fromQuery, toQuery, save, load } from '@oas-ui/ui/commerce/filter/persist'
 *
 * // 进页还原：URL 优先，回落本地记忆
 * const fromUrl = fromQuery(location.search) ?? load(localStorage, 'oas:filter')
 * if (fromUrl) filter.conditions = fromUrl
 * // 交互后落盘（双写）
 * filter.addEventListener('oas-change', () => {
 *   toQuery(new URLSearchParams(location.search), filter.conditions) // 宿主自行 history.replaceState
 *   save(localStorage, 'oas:filter', filter.conditions)
 * })
 * ```
 *
 * 按需引入：`@oas-ui/ui/commerce/filter/persist`；运行闭包不含 oas-filter 本体 /
 * core / i18n（类型仅 `import type`，构建期擦除）。helper 型能力：无 HTML/属性触发面，
 * 宿主显式 import 调用导出函数；不进 L1 / CDN 族包（进 union 即死重）。
 */

import type { FilterConditions } from '../oas-filter.js'

/** URL query / hash 上的参数名（`#conditions=...` / `?conditions=...`） */
export const PERSIST_QUERY_KEY = 'conditions'

/**
 * conditions 结构清洗（与 oas-filter 本体 sanitizeConditions 同规则的字段类型部分；
 * 「单选组 ≤1 项」截断依赖 groups 定义，本体读取侧已强制——本层只做类型收敛，
 * 保证 decode 输出可以直接安全喂给 `filter.conditions`）。
 */
function sanitize(conditions: FilterConditions): FilterConditions {
  const out: FilterConditions = {}
  if (conditions && typeof conditions === 'object' && !Array.isArray(conditions)) {
    if (typeof conditions.sort === 'string' && conditions.sort !== '') out.sort = conditions.sort
    if (conditions.order === 'asc' || conditions.order === 'desc') out.order = conditions.order
    if (conditions.groups && typeof conditions.groups === 'object' && !Array.isArray(conditions.groups)) {
      const groups: Record<string, string[]> = {}
      for (const [key, values] of Object.entries(conditions.groups)) {
        if (!Array.isArray(values)) continue
        // 空数组保留——本体「取消」语义的回显契约（单选组取消后 groups[key] = []）
        groups[key] = values.filter((v): v is string => typeof v === 'string')
      }
      if (Object.keys(groups).length > 0) out.groups = groups
    }
  }
  return out
}

/** 判断清洗后是否为空条件（无任何有效键） */
function isEmpty(conditions: FilterConditions): boolean {
  return conditions.sort === undefined && conditions.order === undefined && conditions.groups === undefined
}

/**
 * JSON 串 → 清洗后的 conditions；不可解析 / 非对象 → null。
 * null 与 {} 语义有别：null = 无有效持久化（宿主不还原），{} = 有效记录但条件为空。
 */
function parseConditions(raw: string): FilterConditions | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return sanitize(parsed as FilterConditions)
  } catch {
    return null
  }
}

/**
 * 序列化为 URL 安全串（encodeURIComponent(JSON)——中文与 `& = # %` 等保留字全转义，
 * 可直接拼进 hash / query 而不破坏 URL 结构）。encode 前先做结构清洗，
 * 与 decode 构成严格互逆（encode∘decode = sanitize 恒等，无脏值穿透）。
 */
export function encode(conditions: FilterConditions): string {
  return encodeURIComponent(JSON.stringify(sanitize(conditions)))
}

/**
 * encode 的逆：解码 + 解析 + 清洗。宽容两层输入——编码串（`%7B%22sort%22...`）与
 * 裸 JSON（无 `%` 时 decodeURIComponent 原样通过）。不可解析（垃圾串 / 截断转义 /
 * JSON 数组 / 标量）→ null。
 */
export function decode(raw: string): FilterConditions | null {
  if (typeof raw !== 'string') return null
  let text: string
  try {
    text = decodeURIComponent(raw)
  } catch {
    return null
  }
  return parseConditions(text)
}

/**
 * 把 conditions 写进 URLSearchParams（`conditions=` 键；空条件移除该键，
 * 不在 URL 留空尾巴）。值存 **JSON 原文**——编码统一交给 URLSearchParams 的
 * toString/get（单层转义，`& = #` 等保留字自动安全）；`fromQuery` 读侧走宽容
 * decode，对「手工 encode 拼接」的形态（如 hash 里 `#conditions=%7B…`）同样兼容。
 * 原地修改并返回同一 params，便于链式拼参数。
 */
export function toQuery(params: URLSearchParams, conditions: FilterConditions): URLSearchParams {
  const clean = sanitize(conditions)
  if (isEmpty(clean)) {
    params.delete(PERSIST_QUERY_KEY)
    return params
  }
  params.set(PERSIST_QUERY_KEY, JSON.stringify(clean))
  return params
}

/**
 * 从 query / hash 串或 URLSearchParams 读取 conditions。
 * 接受带 / 不带 `?` / `#` 前缀的原始串；无该键或值不可解析 → null。
 *
 * 值形态双兼容：`toQuery` 存 JSON 原文（URLSearchParams.get() 已解一层 URL 编码）——
 * **直接解析原文**（对 JSON 内容二次 decodeURIComponent 会把值里的裸 `%` 变 URIError
 * 或静默篡改 `%41` → `A`）；解析失败再回退 `decode`（兼容手工 `encode` 拼接的形态，
 * 如 hash 里 `#conditions=%7B…`）。
 */
export function fromQuery(source: string | URLSearchParams): FilterConditions | null {
  let params: URLSearchParams
  if (source instanceof URLSearchParams) {
    params = source
  } else if (typeof source === 'string') {
    // 去掉 ? / # 前缀（location.search / location.hash 原样可喂）
    params = new URLSearchParams(source.replace(/^[?#]/, ''))
  } else {
    return null
  }
  const raw = params.get(PERSIST_QUERY_KEY)
  if (raw === null) return null
  const direct = parseConditions(raw)
  if (direct !== null) return direct
  return decode(raw)
}

/**
 * 把 conditions 存进 Storage（JSON 原文直存，可调试直读；空条件 removeItem 不留尾巴）。
 * storage 异常（QuotaExceededError / SecurityError 等——隐私模式 / 配额满）try-catch
 * 降级返回 false，不抛错；返回 true = 落盘成功。
 */
export function save(
  storage: Pick<Storage, 'setItem' | 'removeItem'>,
  key: string,
  conditions: FilterConditions,
): boolean {
  const clean = sanitize(conditions)
  try {
    if (isEmpty(clean)) storage.removeItem(key)
    else storage.setItem(key, JSON.stringify(clean))
    return true
  } catch {
    return false
  }
}

/**
 * 从 Storage 读 conditions；缺失键 / 脏值（不可解析）/ storage 异常 → null（不抛错）。
 * 值与 URL 后端同一套解析清洗内核（decode 兼容裸 JSON）。
 */
export function load(storage: Pick<Storage, 'getItem'>, key: string): FilterConditions | null {
  let raw: string | null
  try {
    raw = storage.getItem(key)
  } catch {
    return null
  }
  if (raw === null) return null
  return parseConditions(raw)
}
