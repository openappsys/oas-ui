/**
 * server 数据源缓存核心（批 C S1）：纯逻辑，零 DOM 依赖。
 *
 * 职责四块（与 createServerSource 的集成在 server-rows.ts）：
 * - `serverCacheKey`：缓存键 = 完整查询签名——区间 / 排序组 / 过滤组 / 分组键 / 游标序列化
 *   （稳定序）。reason 不参与键：init / sort / filter / paginate / group 同属查询态，同一查询
 *   无论因何种原因触发都命中同一条目（「翻页往返命中」的机制）；排序组数组序敏感
 *   （multi-sort 按序依次排序），过滤组按键排序后签名（宿主以不同键序写 filter-values
 *   属语义同值——对齐组件 rowsRequestSignature 的 filterSig 心智），序列化走
 *   JSON.stringify 保留值类型（数字 1 与字符串 "1" 是不同过滤条件，join 拼接会混同）。
 * - TTL 条目：写入时刻 + ttl 判过期；`get` 只认有效期内条目（过期即视为未命中——
 *   默认重新取数语义），`peek` 不判过期（stale-while-revalidate 陈旧回填的唯一输入）。
 *   含等号过期（now = storedAt + ttl 即过期）：快照时点的滞后宁可多请求一次，不回填
 *   已过门槛的数据。`ttlMs: 0` = 不缓存（含等号判定恒真，读侧等价 miss）；负数 / NaN
 *   属非法配置，一次性 devWarn 后回退默认（静默吞掉会变成「以为配了 TTL 实际没配」）。
 * - 条目上界（LRU）：`get` 命中过期即删条目（过期条目不滞留内存、不占名额）；命中重排
 *   （delete + re-set 移到写入序末尾）；`set` 超出 `maxEntries`（默认 200）淘汰最久未命中。
 * - 在途登记：同键在途 Promise 登记表——helper 用它做「同键请求在途时复用同一
 *   Promise」的去重。settle（fulfilled / rejected）后自动解除；显式 `untrack` 供
 *   abort 路径立即解除（被 abort 的在途不可复用）；settle 解除按引用比对（同键覆盖
 *   登记后旧 Promise 迟到 settle 不误删新登记）。
 *
 * 缓存层只在 helper 内，不影响组件协议；条目缓存 rows 引用（不深拷贝——回填通道
 * JSON 序列化时才落字符串，条目 value 与 fetchRows 返回同源，无别名写风险面）。
 */
import { devWarn } from '../../../shared/dev-warn.js'

/** 缓存键的输入 = 完整查询（与组件请求签名同一查询态口径，不含 reason / requestId） */
export interface ServerCacheQuery {
  /** 当前页期望区间起点（含） */
  start: number
  /** 当前页期望区间终点（不含） */
  end: number
  /** 排序模型（数组序敏感：multi-sort 按序依次排序） */
  sortModel: Array<{ key: string; order: string }>
  /** 过滤值（键序不敏感：键排序后签名） */
  filterValues: Record<string, string | number>
  /** 分组键（服务端分组形态；缺省 = 无分组查询） */
  groupBy?: string
  /** 无限滚动游标（缺省 = 首块/无游标查询） */
  cursor?: string
}

/** 取数结果归一形状（裸数组由 helper 归一为 { rows } 后入缓存） */
export interface ServerCacheValue {
  rows: unknown[]
  total?: number
}

/** 缓存条目：取数结果 + 写入时刻（TTL 判龄依据） */
export interface ServerCacheEntry extends ServerCacheValue {
  /** 写入时刻（Date.now()） */
  storedAt: number
}

/** 过滤组签名输入的稳定键序版本（键排序 → 序列化序稳定） */
const stableFilter = (filterValues: Record<string, string | number>): Record<string, string | number> => {
  const out: Record<string, string | number> = {}
  for (const key of Object.keys(filterValues).sort()) {
    const value = filterValues[key]
    if (value !== undefined) out[key] = value
  }
  return out
}

/**
 * 缓存键 = 完整查询签名。JSON.stringify 序列化（键序已稳定：固定字段序 + 过滤键排序），
 * 值类型保留；groupBy / cursor 缺省（undefined）时该键被省略——「无分组 / 无游标」与
 * 「值为 undefined」同键。
 */
export function serverCacheKey(query: ServerCacheQuery): string {
  return JSON.stringify({
    start: query.start,
    end: query.end,
    sort: query.sortModel,
    filter: stableFilter(query.filterValues),
    groupBy: query.groupBy,
    cursor: query.cursor,
  })
}

export interface ServerRowsCache {
  /** 生效 TTL（ms）——默认 300000（5 分钟）；0 = 不缓存（读侧等价 miss） */
  readonly ttlMs: number
  /** 条目上界（LRU 淘汰）——默认 200 */
  readonly maxEntries: number
  /** 有效期内命中返回条目；过期 / 缺失返回 undefined（默认重新取数语义；过期条目即时删除） */
  get(key: string): ServerCacheEntry | undefined
  /** 不判过期（stale-while-revalidate 陈旧回填输入） */
  peek(key: string): ServerCacheEntry | undefined
  /** 写入（同键覆盖，按当前时刻重新计龄；超上界淘汰最旧） */
  set(key: string, value: ServerCacheValue): void
  /** 删单键 */
  delete(key: string): void
  /** 清空缓存条目与在途登记（destroy / purge 落点） */
  clear(): void
  /** 同键在途 Promise（无则 undefined）——在途合并的复用对象（值形状由消费方归一） */
  inflight(key: string): Promise<unknown> | undefined
  /** 登记在途：settle 后自动解除（引用比对）；返回原 Promise（不改变取数链） */
  track(key: string, promise: Promise<unknown>): Promise<unknown>
  /** 显式解除在途登记（abort 路径：被 abort 的在途不可复用，不等 settle）；幂等 */
  untrack(key: string): void
}

/** TTL 默认 5 分钟：数据层缓存的通行值（ms 级可配） */
const DEFAULT_TTL_MS = 300_000

/** 条目上界默认 200：翻页往返场景的合理驻留面（LRU 可配） */
const DEFAULT_MAX_ENTRIES = 200

export function createServerRowsCache(options?: { ttlMs?: number; maxEntries?: number }): ServerRowsCache {
  // TTL 归一：0 = 不缓存（合法配置，读侧等价 miss）；负数 / NaN = 非法，devWarn 一次回退默认
  let ttlMs = DEFAULT_TTL_MS
  const requestedTtl = options?.ttlMs
  if (requestedTtl != null) {
    if (Number.isFinite(requestedTtl) && requestedTtl >= 0) {
      ttlMs = requestedTtl
    } else {
      devWarn(
        `[oas-table] createServerRowsCache 的 ttlMs 需为非负有限数字（收到 ${String(requestedTtl)}），已回退默认 300000ms`,
      )
    }
  }
  const maxEntries =
    options?.maxEntries != null && Number.isFinite(options.maxEntries) && options.maxEntries > 0
      ? options.maxEntries
      : DEFAULT_MAX_ENTRIES
  const entries = new Map<string, ServerCacheEntry>()
  const inflight = new Map<string, Promise<unknown>>()

  return {
    ttlMs,
    maxEntries,
    get(key) {
      const entry = entries.get(key)
      if (!entry) return undefined
      // 含等号过期：now = storedAt + ttl 即过期（宁可多请求一次，不回填已过门槛的数据）；
      // ttl 0 恒真 = 不缓存。过期即删条目——不滞留内存、不占 LRU 名额（peek 也不再命中）
      if (Date.now() - entry.storedAt >= ttlMs) {
        entries.delete(key)
        return undefined
      }
      // LRU 命中重排：delete + re-set 移到写入序末尾（Map 迭代序 = 插入序），
      // 超界淘汰按「最久未命中」而非「最早写入」；条目对象原样复用（storedAt 不变）
      entries.delete(key)
      entries.set(key, entry)
      return entry
    },
    peek(key) {
      return entries.get(key)
    },
    set(key, value) {
      // 重写同键也移到写入序末尾（写 = 最近使用；Map.set 对已存在键不改插入序，先删后写）
      entries.delete(key)
      entries.set(key, { rows: value.rows, total: value.total, storedAt: Date.now() })
      // 条目上界：超出即淘汰最旧（Map 首键 = 最旧写入且未被 get/set 重排的键）
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value
        if (oldest === undefined) break
        entries.delete(oldest)
      }
    },
    delete(key) {
      entries.delete(key)
    },
    clear() {
      entries.clear()
      inflight.clear()
    },
    inflight(key) {
      return inflight.get(key)
    },
    track(key, promise) {
      inflight.set(key, promise)
      // settle 即解除（引用比对：同键覆盖登记后旧 Promise 迟到 settle 不误删新登记）
      void promise.then(
        () => {
          if (inflight.get(key) === promise) inflight.delete(key)
        },
        () => {
          if (inflight.get(key) === promise) inflight.delete(key)
        },
      )
      return promise
    },
    untrack(key) {
      inflight.delete(key)
    },
  }
}
