import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServerRowsCache, serverCacheKey, type ServerCacheQuery } from './server-rows-cache.js'

/**
 * server 数据源缓存核心纯逻辑单测（批 C S1）。
 *
 * 模块零 DOM 依赖：签名（完整查询序列化）、条目（TTL 过期）、在途登记（合并/解除）
 * 三块可独立单测；TTL 推进用 fake timers（Date.now 被 mock）。
 * 与 createServerSource 的集成行为（命中回填 / SWR / purge）见 server-rows.test.ts。
 */

/** 基准查询（测试逐字段覆盖的起点） */
const baseQuery = (over: Partial<ServerCacheQuery> = {}): ServerCacheQuery => ({
  start: 0,
  end: 10,
  sortModel: [],
  filterValues: {},
  ...over,
})

describe('serverCacheKey（缓存键 = 完整查询签名）', () => {
  it('同查询重复生成同键（确定性——Map 键的前提）', () => {
    const q = baseQuery({ sortModel: [{ key: 'name', order: 'asc' }], filterValues: { name: '行' } })
    expect(serverCacheKey(q)).toBe(serverCacheKey({ ...q }))
  })

  it('区间参与键：start / end 任一不同则键不同', () => {
    const reference = serverCacheKey(baseQuery())
    expect(serverCacheKey(baseQuery({ start: 10 }))).not.toBe(reference)
    expect(serverCacheKey(baseQuery({ end: 20 }))).not.toBe(reference)
  })

  it('排序组序敏感：multi-sort 语义按序依次排序（[{a,asc},{b,desc}] ≠ [{b,desc},{a,asc}]）', () => {
    const ab = baseQuery({
      sortModel: [
        { key: 'a', order: 'asc' },
        { key: 'b', order: 'desc' },
      ],
    })
    const ba = baseQuery({
      sortModel: [
        { key: 'b', order: 'desc' },
        { key: 'a', order: 'asc' },
      ],
    })
    expect(serverCacheKey(ab)).not.toBe(serverCacheKey(ba))
    // 同组同序才是同键
    expect(serverCacheKey(ab)).toBe(
      serverCacheKey({
        ...ab,
        sortModel: [
          { key: 'a', order: 'asc' },
          { key: 'b', order: 'desc' },
        ],
      }),
    )
    // 单键反向也不同键
    expect(serverCacheKey(baseQuery({ sortModel: [{ key: 'a', order: 'asc' }] }))).not.toBe(
      serverCacheKey(baseQuery({ sortModel: [{ key: 'a', order: 'desc' }] })),
    )
  })

  it('过滤键序不敏感：宿主以不同键序写 filter-values 属语义同值（对齐组件 filterSig 心智）', () => {
    const aFirst = baseQuery({ filterValues: { name: '行', dept: '研发' } })
    const bFirst = baseQuery({ filterValues: { dept: '研发', name: '行' } })
    expect(serverCacheKey(aFirst)).toBe(serverCacheKey(bFirst))
  })

  it('过滤值类型敏感：数字 1 与字符串 "1" 是不同过滤条件（join 拼接会混同，键必须区分）', () => {
    const num = baseQuery({ filterValues: { amount: 1 } })
    const str = baseQuery({ filterValues: { amount: '1' } })
    expect(serverCacheKey(num)).not.toBe(serverCacheKey(str))
  })

  it('游标参与键：undefined（首块/无游标）与具体游标值是不同查询', () => {
    const noCursor = serverCacheKey(baseQuery())
    expect(serverCacheKey(baseQuery({ cursor: 'cursor-1' }))).not.toBe(noCursor)
    expect(serverCacheKey(baseQuery({ cursor: 'cursor-1' }))).not.toBe(
      serverCacheKey(baseQuery({ cursor: 'cursor-2' })),
    )
  })

  it('键不含 reason：init/sort/filter/paginate 同属查询态——键函数入参形状本身没有 reason 字段', () => {
    // 键函数的入参类型只收区间/排序/过滤/游标四组查询态；同一查询无论因何种 reason
    // 触发（首载、翻回、排序往返）都映射到同一缓存键——这正是「翻页往返命中」的机制。
    const q = baseQuery({ start: 10, end: 20, sortModel: [{ key: 'id', order: 'desc' }], filterValues: { a: 1 } })
    const key = serverCacheKey(q)
    expect(key).toBe(serverCacheKey(q))
    // 键形状断言：查询四组态齐备（防键悄悄漏字段——漏了任何一组态都会让不同查询混同）
    expect(key).toContain('"start":10')
    expect(key).toContain('"end":20')
    expect(key).toContain('"id"')
    expect(key).toContain('"desc"')
    expect(key).toContain('"a":1')
  })
})

describe('createServerRowsCache（TTL 条目）', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('默认 TTL = 300000ms（5 分钟，与通行值一致）', () => {
    expect(createServerRowsCache().ttlMs).toBe(300_000)
  })

  it('ttlMs 可配（ms 级）', () => {
    expect(createServerRowsCache({ ttlMs: 5000 }).ttlMs).toBe(5000)
  })

  it('写入后 TTL 内 get 命中：返回 rows / total / storedAt（回填通道的输入形状）', () => {
    const cache = createServerRowsCache({ ttlMs: 1000 })
    cache.set('k', { rows: [{ name: '行0' }], total: 100 })
    const hit = cache.get('k')
    expect(hit).toEqual({ rows: [{ name: '行0' }], total: 100, storedAt: 0 })
  })

  it('裸数组取数形状归一由 helper 负责——缓存条目 rows 恒为数组、total 可省略', () => {
    const cache = createServerRowsCache({ ttlMs: 1000 })
    cache.set('k', { rows: [] })
    expect(cache.get('k')).toEqual({ rows: [], storedAt: 0 })
  })

  it('过期后 get 返回 undefined（默认重新取数语义），未过期键不受影响', () => {
    const cache = createServerRowsCache({ ttlMs: 1000 })
    cache.set('expired', { rows: [1] })
    vi.setSystemTime(500)
    cache.set('fresh', { rows: [2] })
    vi.setSystemTime(1000)
    expect(cache.get('expired'), 'TTL 到期即过期').toBeUndefined()
    expect(cache.get('fresh'), '另一键按自身 storedAt 计龄，仍命中').toBeDefined()
  })

  it('过期边界：now = storedAt + ttl 恰好过期；storedAt + ttl - 1 仍命中（含等号过期）', () => {
    const cache = createServerRowsCache({ ttlMs: 1000 })
    cache.set('k', { rows: [] })
    vi.setSystemTime(999)
    expect(cache.get('k'), '差 1ms 到期仍命中').toBeDefined()
    vi.setSystemTime(1000)
    expect(cache.get('k'), '恰好到期即过期').toBeUndefined()
  })

  it('过期条目 peek 仍返回（SWR 陈旧回填的唯一输入），未写入键 peek 为 undefined', () => {
    const cache = createServerRowsCache({ ttlMs: 1000 })
    cache.set('k', { rows: ['旧'], total: 7 })
    vi.setSystemTime(2000)
    expect(cache.peek('k')).toEqual({ rows: ['旧'], total: 7, storedAt: 0 })
    expect(cache.peek('missing')).toBeUndefined()
  })

  it('同键重写按新 storedAt 重新计龄（翻页往返刷新陈旧条目的机制）', () => {
    const cache = createServerRowsCache({ ttlMs: 1000 })
    cache.set('k', { rows: ['旧'] })
    vi.setSystemTime(900)
    cache.set('k', { rows: ['新'] })
    vi.setSystemTime(1899)
    expect(cache.get('k')).toEqual({ rows: ['新'], storedAt: 900 })
    vi.setSystemTime(1900)
    expect(cache.get('k')).toBeUndefined()
  })

  it('delete 删单键（不误伤他键）；clear 清空全部（get/peek 均空）', () => {
    const cache = createServerRowsCache()
    cache.set('a', { rows: [1] })
    cache.set('b', { rows: [2] })
    cache.delete('a')
    expect(cache.peek('a')).toBeUndefined()
    expect(cache.get('b')).toBeDefined()
    cache.clear()
    expect(cache.peek('b')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
  })
})

describe('createServerRowsCache（在途合并登记）', () => {
  /** 手控 Promise（模拟 fetchRows 慢/挂起取数） */
  function deferred(): { promise: Promise<unknown>; resolve: (v: unknown) => void; reject: (e: unknown) => void } {
    let resolve!: (v: unknown) => void
    let reject!: (e: unknown) => void
    const promise = new Promise<unknown>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }

  it('track 后 inflight 返回同一 Promise（同键复用的合并对象）', () => {
    const cache = createServerRowsCache()
    const { promise } = deferred()
    cache.track('k', promise as Promise<{ rows: unknown[] }>)
    expect(cache.inflight('k')).toBe(promise)
  })

  it('fulfilled 后自动解除登记（settle 即可复用终点，不会拿到已 settle 的旧 Promise）', async () => {
    const cache = createServerRowsCache()
    const { promise, resolve } = deferred()
    cache.track('k', promise as Promise<{ rows: unknown[] }>)
    resolve({ rows: [] })
    await promise
    expect(cache.inflight('k')).toBeUndefined()
  })

  it('rejected 后同样解除登记（失败不残留死登记——下次触发可重新取数）', async () => {
    const cache = createServerRowsCache()
    const { promise, reject } = deferred()
    cache.track('k', promise as Promise<{ rows: unknown[] }>)
    reject(new Error('network'))
    await promise.catch(() => {})
    expect(cache.inflight('k')).toBeUndefined()
  })

  it('同键覆盖登记：新 track 后旧 Promise settle 不误删新登记（引用比对防并发覆盖误删）', async () => {
    const cache = createServerRowsCache()
    const p1 = deferred()
    const p2 = deferred()
    cache.track('k', p1.promise as Promise<{ rows: unknown[] }>)
    // refresh 绕过读直取时会同键再 track（覆盖登记指向最新取数）
    cache.track('k', p2.promise as Promise<{ rows: unknown[] }>)
    expect(cache.inflight('k')).toBe(p2.promise)
    p1.resolve({ rows: ['旧在途'] })
    await p1.promise
    expect(cache.inflight('k'), '旧 Promise settle 不清掉新登记').toBe(p2.promise)
    p2.resolve({ rows: [] })
    await p2.promise
    expect(cache.inflight('k')).toBeUndefined()
  })

  it('显式 untrack：被 abort 的在途立即解除（不等 settle——abort 的在途不可复用）', () => {
    const cache = createServerRowsCache()
    const { promise } = deferred()
    cache.track('k', promise as Promise<{ rows: unknown[] }>)
    cache.untrack('k')
    expect(cache.inflight('k')).toBeUndefined()
  })

  it('untrack 幂等（新请求派发 abort 旧在途的路径可能重复触发，不抛错）', () => {
    const cache = createServerRowsCache()
    cache.untrack('never-tracked')
    const { promise } = deferred()
    cache.track('k', promise as Promise<{ rows: unknown[] }>)
    cache.untrack('k')
    cache.untrack('k')
    expect(cache.inflight('k')).toBeUndefined()
  })

  it('clear 同时清缓存条目与在途登记（destroy / purge 语义的落点）', async () => {
    const cache = createServerRowsCache()
    const { promise, resolve } = deferred()
    cache.set('k', { rows: [] })
    cache.track('k', promise as Promise<{ rows: unknown[] }>)
    cache.clear()
    expect(cache.peek('k')).toBeUndefined()
    expect(cache.inflight('k')).toBeUndefined()
    // 已被 clear 的登记 settle：引用比对落空，无副作用不抛错
    resolve({ rows: [] })
    await promise
  })
})
