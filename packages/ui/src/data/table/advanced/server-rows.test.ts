import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from '../index.js'
import { createServerSource, type ServerRowsRequest } from './server-rows.js'

/**
 * createServerSource（server 行模型宿主侧 helper）单测。
 *
 * 模式参照 windowed.test.ts：mount 真实 OASTable + vi.fn fetchRows + vi.waitFor +
 * 断言属性回写（happy-dom 不解析 var()，一律断言属性/属性值而非样式）。
 * 组件侧协议契约（requestId 语义 / detail 形状 / reportRowsError 幂等）已由
 * oas-table-server-rows.test.ts 冻结，本文件只测 helper 的桥接行为。
 */

/** server 挂载：不预写 row-model/total——那是 helper 的职责（total 生效前提测试依赖） */
function mount(): OASTable {
  const el = new OASTable()
  el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称', sortable: true }]))
  el.setAttribute('data', '[]')
  document.body.appendChild(el)
  return el
}

describe('createServerSource', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('未升级元素抛错', () => {
    expect(() => createServerSource(document.createElement('div'), { fetchRows: async () => [] })).toThrow(
      /需要已升级的 oas-table/,
    )
  })

  it('未连接元素抛错（须先 append 再创建）', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    expect(() => createServerSource(el, { fetchRows: async () => [] })).toThrow(/需要已连接（已挂载）/)
  })

  it('静态标签首载兜底：升级先于 helper（init 丢失）→ 创建时主动 refreshRows 取首屏并回填 data', async () => {
    // 真实浏览器时序陷阱：静态 HTML 标签在脚本执行前已升级，init 请求同步派发时 helper
    // 监听尚未挂上 → 事件丢失；helper 后续 row-model/total 同值写入不再触发组件请求。
    // 创建时兜底 refreshRows（reason=refresh 绕过同值去重）保证取数。
    document.body.innerHTML =
      '<oas-table row-model="server" total="10" columns=\'[{"key":"name","title":"名称"}]\'></oas-table>'
    const el = document.querySelector<OASTable>('oas-table')!
    const fetchRows = vi.fn(async ({ end }: ServerRowsRequest) => ({
      rows: Array.from({ length: end }, (_, i) => ({ name: `行${i}` })),
      total: 10,
    }))
    const source = createServerSource(el, { fetchRows })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    expect(fetchRows.mock.calls[0]![0]).toMatchObject({ reason: 'refresh', start: 0, end: 10 })
    await vi.waitFor(() => expect(el.data).toHaveLength(10))
    expect((el.data[0] as { name: string }).name).toBe('行0')
    source.destroy()
  })

  it('预填 data（SSR 预填）：创建时不兜底刷新（首屏由宿主负责），后续状态变更照常接管', async () => {
    document.body.innerHTML =
      '<oas-table row-model="server" total="10" columns=\'[{"key":"name","title":"名称"}]\' data=\'[{"name":"预填行"}]\'></oas-table>'
    const el = document.querySelector<OASTable>('oas-table')!
    const fetchRows = vi.fn(async (_request: ServerRowsRequest) => ({ rows: [{ name: '服务端行' }], total: 10 }))
    const source = createServerSource(el, { fetchRows })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fetchRows, '预填在场：不主动刷新').not.toHaveBeenCalled()
    expect((el.data[0] as { name: string }).name).toBe('预填行')
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    expect(fetchRows.mock.calls[0]![0]).toMatchObject({ reason: 'paginate', start: 10, end: 20 })
    source.destroy()
  })

  it('首载：init 请求派发 → fetchRows 收到 detail 全字段（含 signal）→ 回填 data/total', async () => {
    const el = mount()
    const fetchRows = vi.fn(async ({ start, end }: ServerRowsRequest) => ({
      rows: Array.from({ length: end - start }, (_, i) => ({ name: `行${start + i}` })),
      total: 100,
    }))
    const source = createServerSource(el, { fetchRows, total: 100 })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    const req = fetchRows.mock.calls[0]![0]
    expect(req).toMatchObject({ requestId: 1, start: 0, end: 10, sortModel: [], filterValues: {}, reason: 'init' })
    expect(req.signal).toBeInstanceOf(AbortSignal)
    expect(req.signal.aborted).toBe(false)
    // helper 接管惯例：自动激活 server 行模型（对齐 windowed 自动设 windowed）
    expect(el.getAttribute('row-model')).toBe('server')
    expect(el.getAttribute('total')).toBe('100')
    expect(el.data).toHaveLength(10)
    expect((el.data[0] as { name: string }).name).toBe('行0')
    expect((el.data[9] as { name: string }).name).toBe('行9')
    source.destroy()
  })

  it('fetch 返回裸数组（无 total）→ data 回填、total 属性不被覆盖', async () => {
    const el = mount()
    el.setAttribute('total', '100')
    const fetchRows = vi.fn(async ({ end }: ServerRowsRequest) =>
      Array.from({ length: end }, (_, i) => ({ name: `行${i}` })),
    )
    const source = createServerSource(el, { fetchRows })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    expect(el.data).toHaveLength(10)
    expect(el.getAttribute('total'), '裸数组返回不写 total').toBe('100')
    source.destroy()
  })

  it('options.total：挂载前 total 属性在位（server 生效前提），前提满足不触发前提告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount()
    const fetchRows = vi.fn(async () => [])
    createServerSource(el, { fetchRows, total: 50 })
    // 先 total 后 row-model：激活时前提已在场（微任务前提复核静默）
    expect(el.getAttribute('total')).toBe('50')
    expect(el.getAttribute('row-model')).toBe('server')
    // 生效证据：init 请求同步派发且被 helper 接住（client 模式不会发请求）
    expect(fetchRows).toHaveBeenCalledTimes(1)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('翻页：current 变更 → paginate 请求 → 新 fetchRows（上一在途被 abort）', async () => {
    const el = mount()
    const signals: AbortSignal[] = []
    const fetchRows = vi.fn(({ signal }: ServerRowsRequest) => {
      signals.push(signal)
      return new Promise<never>(() => {})
    })
    const source = createServerSource(el, { fetchRows, total: 100 })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2))
    expect(fetchRows.mock.calls[1]![0]).toMatchObject({ requestId: 2, start: 10, end: 20, reason: 'paginate' })
    expect(signals[0]!.aborted, '新请求派发即中止上一笔在途').toBe(true)
    expect(signals[1]!.aborted).toBe(false)
    source.destroy()
  })

  it('竞态：慢请求 A（不 resolve）+ 快请求 B → B 回填后 A 才 resolve → A 的回写被丢弃', async () => {
    const el = mount()
    const resolvers: Array<(result: unknown[] | { rows: unknown[]; total?: number }) => void> = []
    const fetchRows = vi.fn(
      () =>
        new Promise<unknown[] | { rows: unknown[]; total?: number }>((resolve) => {
          resolvers.push(resolve)
        }),
    )
    const source = createServerSource(el, { fetchRows, total: 100 })
    await vi.waitFor(() => expect(resolvers).toHaveLength(1))
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect(resolvers).toHaveLength(2))
    // B（页 2，requestId 2）先回填
    resolvers[1]!({ rows: [{ name: '页2' }], total: 100 })
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('页2'))
    // A（页 1，requestId 1）迟到 resolve：晚到旧响应静默丢弃（组件 requestId 单调性保证比对可靠）
    resolvers[0]!({ rows: [{ name: '页1旧' }], total: 1 })
    await Promise.resolve()
    await Promise.resolve()
    expect((el.data[0] as { name: string }).name, 'data 仍是 B 的').toBe('页2')
    expect(el.getAttribute('total'), 'total 不被晚到旧响应覆盖').toBe('100')
    source.destroy()
  })

  it('失败：fetchRows reject → oas-rows-error 派发 + 错误条可见（桥接 reportRowsError）', async () => {
    const el = mount()
    const errs: CustomEvent[] = []
    el.addEventListener('oas-rows-error', (e) => errs.push(e as CustomEvent))
    const source = createServerSource(el, {
      fetchRows: async () => {
        throw new Error('network')
      },
      total: 100,
    })
    await vi.waitFor(() => expect(errs).toHaveLength(1))
    expect(errs[0]!.detail).toMatchObject({ requestId: 1, reason: 'init' })
    expect(errs[0]!.detail.error).toBeInstanceOf(Error)
    expect(errs[0]!.bubbles).toBe(true)
    expect(errs[0]!.composed).toBe(true)
    // 组件内建失败条可见（reportRowsError 生效形态），错误可重试入口在场
    const bar = el.shadowRoot!.querySelector('.rows-error')
    expect(bar?.hasAttribute('hidden'), '失败条模板节点在场且可见（缺席 → undefined ≠ false 一并拦下）').toBe(false)
    expect(bar?.querySelector('.rows-error-retry')?.tagName, '重试入口在场且为按钮').toBe('BUTTON')
    source.destroy()
  })

  it('晚到失败静默丢弃：旧请求 reject 晚于新请求派发 → 不桥接 reportRowsError（错误条不亮）', async () => {
    const el = mount()
    const errs: CustomEvent[] = []
    el.addEventListener('oas-rows-error', (e) => errs.push(e as CustomEvent))
    const rejects: Array<(reason: unknown) => void> = []
    const fetchRows = vi.fn(
      () =>
        new Promise<never>((_, reject) => {
          rejects.push(reject)
        }),
    )
    const source = createServerSource(el, { fetchRows, total: 100 })
    await vi.waitFor(() => expect(rejects).toHaveLength(1))
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect(rejects).toHaveLength(2))
    // 旧请求（init，requestId 1）此刻才失败：已被新请求作废，helper 同序号校验拦截，
    // 不上报组件（组件侧晚到 devWarn 噪音也不会出现）
    rejects[0]!(new Error('stale'))
    await Promise.resolve()
    await Promise.resolve()
    expect(errs).toHaveLength(0)
    expect(el.shadowRoot!.querySelector('.rows-error')!.hasAttribute('hidden')).toBe(true)
    source.destroy()
  })

  it('fetchRows 同步 throw 走同一失败路径（一次 error，可重试）', async () => {
    const el = mount()
    const errs: CustomEvent[] = []
    el.addEventListener('oas-rows-error', (e) => errs.push(e as CustomEvent))
    let mode: 'ok' | 'throw' = 'ok'
    const fetchRows = vi.fn(({ end }: ServerRowsRequest) => {
      if (mode === 'throw') throw new Error('sync network')
      return Promise.resolve({ rows: Array.from({ length: end }, (_, i) => ({ name: `行${i}` })), total: 100 })
    })
    const source = createServerSource(el, { fetchRows, total: 100 })
    await vi.waitFor(() => expect(el.data).toHaveLength(10))
    mode = 'throw'
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect(errs).toHaveLength(1))
    expect(errs[0]!.detail).toMatchObject({ requestId: 2, reason: 'paginate' })
    // 修正后可重试：翻回第 1 页成功回填，错误不再新增
    mode = 'ok'
    el.setAttribute('current', '1')
    await vi.waitFor(() => expect(el.data).toHaveLength(10))
    expect(errs).toHaveLength(1)
    source.destroy()
  })

  it('refresh → refreshRows → reason=refresh；destroy 后 refresh no-op', async () => {
    const el = mount()
    const fetchRows = vi.fn(async ({ end }: ServerRowsRequest) => ({
      rows: Array.from({ length: end }, (_, i) => ({ name: `行${i}` })),
      total: 100,
    }))
    const source = createServerSource(el, { fetchRows, total: 100 })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    source.refresh()
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2))
    expect(fetchRows.mock.calls[1]![0]).toMatchObject({ requestId: 2, reason: 'refresh', start: 0, end: 10 })
    source.destroy()
    source.refresh()
    expect(fetchRows, 'destroy 后 refresh 静默 no-op').toHaveBeenCalledTimes(2)
  })

  it('destroy：解绑后属性变更不再触发 fetchRows；在途 abort；迟到结果不写回', async () => {
    const el = mount()
    const signals: AbortSignal[] = []
    const resolvers: Array<() => void> = []
    const fetchRows = vi.fn(({ signal }: ServerRowsRequest) => {
      signals.push(signal)
      return new Promise<never>((resolve) => {
        resolvers.push(resolve as () => void)
      })
    })
    const source = createServerSource(el, { fetchRows, total: 100 })
    await vi.waitFor(() => expect(resolvers).toHaveLength(1))
    source.destroy()
    expect(signals[0]!.aborted, 'destroy 即中止在途').toBe(true)
    // 组件侧仍会派发请求（组件未解绑），helper 已解绑：不再触发 fetchRows
    const before = fetchRows.mock.calls.length
    el.setAttribute('current', '2')
    expect(fetchRows).toHaveBeenCalledTimes(before)
    // 迟到结果不写回（不动宿主属性）
    resolvers[0]!()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(el.data).toEqual([])
  })

  it('destroy 后迟到失败不桥接 reportRowsError（零错误条、零事件）', async () => {
    const el = mount()
    const errs: CustomEvent[] = []
    el.addEventListener('oas-rows-error', (e) => errs.push(e as CustomEvent))
    const rejects: Array<(reason: unknown) => void> = []
    const fetchRows = vi.fn(
      () =>
        new Promise<never>((_, reject) => {
          rejects.push(reject)
        }),
    )
    const source = createServerSource(el, { fetchRows, total: 100 })
    await vi.waitFor(() => expect(rejects).toHaveLength(1))
    source.destroy()
    rejects[0]!(new Error('late'))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(errs).toHaveLength(0)
    expect(el.shadowRoot!.querySelector('.rows-error')!.hasAttribute('hidden')).toBe(true)
  })

  it('二次创建：devWarn 一次 + 照常返回新实例（新实例可取数；生产不阻断）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount()
    const fetchRows1 = vi.fn(async () => [{ name: '第一实例' }])
    const source1 = createServerSource(el, { fetchRows: fetchRows1, total: 100 })
    await vi.waitFor(() => expect(fetchRows1).toHaveBeenCalledTimes(1))
    expect(warn).not.toHaveBeenCalled()
    // 同元素二次创建：告警一次，新实例照常接线（组件库不炸宿主）
    const fetchRows2 = vi.fn(async () => [{ name: '第二实例' }])
    const source2 = createServerSource(el, { fetchRows: fetchRows2, total: 100 })
    expect(warn, '重复创建 devWarn 一次').toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('createServerSource')
    // 新实例功能完整：refresh 触发自身 fetchRows（双实例并存是宿主自担的错用，helper 不阻断）
    source2.refresh()
    await vi.waitFor(() => expect(fetchRows2.mock.calls.length).toBeGreaterThanOrEqual(1))
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    source1.destroy()
    source2.destroy()
  })

  it('destroy 后可重建：无重复创建告警（WeakMap 登记随 destroy 解除）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount()
    const fetchRows1 = vi.fn(async () => [{ name: 'A' }])
    const source1 = createServerSource(el, { fetchRows: fetchRows1, total: 100 })
    await vi.waitFor(() => expect(fetchRows1).toHaveBeenCalledTimes(1))
    source1.destroy()
    // destroy 解除登记：重建同一元素不告警。重建的 row-model/total 为同值写入（组件同值静默，
    // 不重发 init——与静态标签首载兜底注释同口径），取数由强刷触发
    const fetchRows2 = vi.fn(async (_request: ServerRowsRequest) => [{ name: 'B' }])
    const source2 = createServerSource(el, { fetchRows: fetchRows2, total: 100 })
    expect(warn, 'destroy 后重建无告警').not.toHaveBeenCalled()
    // 新实例接线完整：refresh 强刷（reason='refresh' 绕过同值去重）触发自身取数
    source2.refresh()
    await vi.waitFor(() => expect(fetchRows2).toHaveBeenCalledTimes(1))
    expect(fetchRows2.mock.calls[0]![0]).toMatchObject({ reason: 'refresh' })
    warn.mockRestore()
    source2.destroy()
  })

  it('advanced 入口导出接线：createServerSource 与直连模块为同一函数', async () => {
    const { createServerSource: fromIndex } = await import('./index.js')
    expect(fromIndex).toBe(createServerSource)
  })
})

/**
 * 数据层缓存（批 C S2）：createServerSource 集成行为。
 *
 * 语义定稿：缓存键 = 完整查询签名（start/end/sortModel/filterValues/cursor，与 reason
 * 无关）；命中（未过期）直接回填不调 fetchRows；过期默认重取（SWR 开启时先回填陈旧值
 * 再后台重取）；同键在途复用同一 Promise；refresh() 无 purge 绕过读并更新缓存；
 * refresh({ purge: true }) 清空全部缓存后强制重取；失败 / abort 不写缓存；destroy
 * 清缓存与在途登记。默认启用缓存（TTL 5 分钟、无后台刷新）——cache: false 完全关闭
 * （既有行为零漂移的对照档）。
 *
 * TTL 推进用真实时钟 + 小 ttl（25ms）配真等待（组件链路含 setTimeout 回填，fake
 * timers 会牵连组件时序）；TTL 判定边界已在 server-rows-cache.test.ts 用 fake
 * timers 精确固化，此处只测集成行为。
 */
describe('createServerSource 数据层缓存（批 C）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  /** 按调用序生成可区分内容的 fetchRows（第 n 次调用返回「v{n}」前缀行），便于断言两阶段回填 */
  const versionedFetchRows = (): {
    fetchRows: (request: ServerRowsRequest) => Promise<unknown[] | { rows: unknown[]; total?: number }>
    /** 指定调用序（1 起）返回手动 Promise（hold），其余正常 resolve */
    holdAt: (n: number) => void
    resolvers: Array<(v: { rows: unknown[]; total: number }) => void>
  } => {
    let calls = 0
    const resolvers: Array<(v: { rows: unknown[]; total: number }) => void> = []
    const held = new Set<number>()
    const fetchRows = vi.fn(({ start, end }: ServerRowsRequest) => {
      calls++
      const version = calls
      const rows = Array.from({ length: end - start }, (_, i) => ({ name: `v${version}行${start + i}` }))
      if (held.has(version)) {
        return new Promise<{ rows: unknown[]; total: number }>((resolve) => resolvers.push(resolve))
      }
      return Promise.resolve({ rows, total: 100 })
    })
    return { fetchRows, holdAt: (n: number) => void held.add(n), resolvers }
  }

  it('默认启用缓存：翻页往返命中不重调 fetchRows（同键同步回填 data）', async () => {
    const el = mount()
    const { fetchRows } = versionedFetchRows()
    const source = createServerSource(el, { fetchRows, total: 100 })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('v1行0'))
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('v2行10'))
    expect(fetchRows).toHaveBeenCalledTimes(2)
    // 翻回页1：同键（start/end/sort/filter 全同，reason 从 paginate→paginate 无关键）命中缓存
    el.setAttribute('current', '1')
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('v1行0'), {
      timeout: 1000,
    })
    expect(fetchRows, '命中不重调 fetchRows（调用计数不增）').toHaveBeenCalledTimes(2)
    expect((el.data[9] as { name: string }).name, '缓存回填整页 10 行').toBe('v1行9')
    source.destroy()
  })

  it('cache: false 完全关闭：翻页往返重新取数（既有行为零漂移对照档）', async () => {
    const el = mount()
    const { fetchRows } = versionedFetchRows()
    const source = createServerSource(el, { fetchRows, total: 100, cache: false })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2))
    el.setAttribute('current', '1')
    await vi.waitFor(() => expect(fetchRows, '关闭缓存：翻回重新取数').toHaveBeenCalledTimes(3))
    expect((el.data[0] as { name: string }).name).toBe('v3行0')
    source.destroy()
  })

  it('TTL 过期后命中退化为重新取数（默认无 SWR：过期即未命中）', async () => {
    const el = mount()
    const { fetchRows } = versionedFetchRows()
    const source = createServerSource(el, { fetchRows, total: 100, cache: { ttlMs: 25 } })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2))
    await new Promise((resolve) => setTimeout(resolve, 30))
    el.setAttribute('current', '1')
    await vi.waitFor(() => expect(fetchRows, '过期条目按未命中处理：重新取数').toHaveBeenCalledTimes(3))
    expect((el.data[0] as { name: string }).name).toBe('v3行0')
    source.destroy()
  })

  it('SWR 两阶段：过期命中先回填陈旧值（不重调前台）+ 后台重取成功后 data 更新为新值', async () => {
    const el = mount()
    const { fetchRows, holdAt, resolvers } = versionedFetchRows()
    holdAt(3) // 第 3 次调用 = SWR 后台重取：hold 住让两阶段可分（阶段一断言时后台未 settle）
    const source = createServerSource(el, {
      fetchRows,
      total: 100,
      cache: { ttlMs: 25, staleWhileRevalidate: true },
    })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('v1行0'))
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('v2行10'))
    await new Promise((resolve) => setTimeout(resolve, 30))
    el.setAttribute('current', '1')
    // 阶段一：陈旧值立即回填（用户立即看到旧数据而非 loading），后台重取已发起（hold 在途）
    await vi.waitFor(() => expect(fetchRows, '陈旧命中仍发起后台重取').toHaveBeenCalledTimes(3))
    await Promise.resolve()
    expect((el.data[0] as { name: string }).name, 'SWR 先回填陈旧值（后台未 settle，停在旧数据）').toBe('v1行0')
    // 阶段二：后台重取 settle → data 更新为新值（两阶段可见）
    resolvers[0]!({
      rows: Array.from({ length: 10 }, (_, i) => ({ name: `v3行${i}` })),
      total: 100,
    })
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('v3行0'))
    expect(fetchRows, 'SWR 全程恰 3 次取数（init + 页2 + 后台），无重复').toHaveBeenCalledTimes(3)
    source.destroy()
  })

  it('SWR 在途合并：后台重取在途时同键再触发不重复 fetch（复用同一 Promise 回填）', async () => {
    const el = mount()
    const { fetchRows, holdAt, resolvers } = versionedFetchRows()
    holdAt(3) // 第 3 次调用 = SWR 后台重取，hold 住制造在途窗口
    const source = createServerSource(el, {
      fetchRows,
      total: 100,
      cache: { ttlMs: 25, staleWhileRevalidate: true },
    })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2))
    await new Promise((resolve) => setTimeout(resolve, 30))
    el.setAttribute('current', '1') // SWR：陈旧回填 + 后台重取（hold，在途）
    await vi.waitFor(() => expect(resolvers).toHaveLength(1))
    el.setAttribute('current', '2') // 翻走：页2 条目与页1 同批写入、此刻同样已过期 → 页2 也 SWR 后台重取
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(4))
    el.setAttribute('current', '1') // 翻回页1：陈旧命中 + 同键在途 → 复用，不再发起
    expect(fetchRows, '同键在途复用：不重复 fetch').toHaveBeenCalledTimes(4)
    await Promise.resolve()
    expect((el.data[0] as { name: string }).name, '复用时先陈旧回填').toBe('v1行0')
    // 后台重取 settle：复用等待者按自身 requestId 校验后回填新值
    resolvers[0]!({
      rows: Array.from({ length: 10 }, (_, i) => ({ name: `后台行${i}` })),
      total: 100,
    })
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('后台行0'))
    source.destroy()
  })

  it('refresh() 无 purge：绕过缓存强制重取并更新缓存（refresh 后翻回命中新值）', async () => {
    const el = mount()
    const { fetchRows } = versionedFetchRows()
    const source = createServerSource(el, { fetchRows, total: 100 })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    source.refresh() // reason=refresh 绕过读：强制重取（第 2 次）
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('v2行0'))
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(3))
    el.setAttribute('current', '1')
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('v2行0'), {
      timeout: 1000,
    })
    expect(fetchRows, 'refresh 更新过缓存：翻回命中（不再取数）').toHaveBeenCalledTimes(3)
    source.destroy()
  })

  it('refresh({ purge: true })：清空全部缓存后强制重取（purge 清全部，refresh 自身取数更新当前键缓存）', async () => {
    const el = mount()
    const { fetchRows } = versionedFetchRows()
    const source = createServerSource(el, { fetchRows, total: 100 })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2))
    // 当前页 = 页2：purge 清空两键缓存后，强刷取回页2（v3）并重新写入页2 缓存
    source.refresh({ purge: true })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(3))
    el.setAttribute('current', '1')
    await vi.waitFor(() => expect(fetchRows, 'purge 后页1 缓存已清：重取').toHaveBeenCalledTimes(4))
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('v3行10'), { timeout: 1000 })
    expect(fetchRows, 'refresh({purge}) 自身取数更新了当前键缓存：翻回页2 命中不重取').toHaveBeenCalledTimes(4)
    source.destroy()
  })

  it('fetchRows 失败不写缓存：失败页翻回时重新取数（重试语义不受缓存影响）', async () => {
    const el = mount()
    let calls = 0
    const fetchRows = vi.fn(({ start, end }: ServerRowsRequest) => {
      calls++
      const rows = Array.from({ length: end - start }, (_, i) => ({ name: `v${calls}行${start + i}` }))
      return calls === 2 ? Promise.reject(new Error('page2 fail')) : Promise.resolve({ rows, total: 100 })
    })
    const source = createServerSource(el, { fetchRows, total: 100 })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2))
    // 页2 失败（不写缓存）；翻回页1 命中（不取数）→ 再翻页2：重新取数（重试机会不被缓存吞掉）
    el.setAttribute('current', '1')
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('v1行0'), { timeout: 1000 })
    expect(fetchRows).toHaveBeenCalledTimes(2)
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect(fetchRows, '失败页无缓存：翻回重新取数').toHaveBeenCalledTimes(3))
    expect((el.data[0] as { name: string }).name).toBe('v3行10')
    source.destroy()
  })

  it('被 abort 的在途不写缓存且登记移除：迟到 resolve 不落缓存（翻回重新取数）', async () => {
    const el = mount()
    const resolvers: Array<{ resolve: (v: { rows: unknown[]; total: number }) => void; start: number }> = []
    let calls = 0
    const signals: AbortSignal[] = []
    const fetchRows = vi.fn(({ start, signal }: ServerRowsRequest) => {
      calls++
      signals.push(signal)
      const rows = Array.from({ length: 10 }, (_, i) => ({ name: `v${calls}行${start + i}` }))
      if (calls === 1) {
        return new Promise<{ rows: unknown[]; total: number }>((resolve) => resolvers.push({ resolve, start }))
      }
      return Promise.resolve({ rows, total: 100 })
    })
    const source = createServerSource(el, { fetchRows, total: 100 })
    await vi.waitFor(() => expect(resolvers).toHaveLength(1))
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('v2行10'))
    expect(signals[0]!.aborted, '翻页中止页1 在途').toBe(true)
    // 页1 迟到 resolve：回填被 requestId 校验丢弃 + 不写缓存（signal.aborted 拦截）
    resolvers[0]!.resolve({ rows: [{ name: '迟到页1' }], total: 100 })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect((el.data[0] as { name: string }).name, '迟到响应不回填').toBe('v2行10')
    el.setAttribute('current', '1')
    await vi.waitFor(() => expect(fetchRows, 'abort 的在途不落缓存：翻回重新取数').toHaveBeenCalledTimes(3))
    expect((el.data[0] as { name: string }).name).toBe('v3行0')
    source.destroy()
  })

  it('命中回填与成功路径同一通道：data 与 total 属性同步写（缓存条目 total 参与回填）', async () => {
    const el = mount()
    let calls = 0
    const fetchRows = vi.fn(({ start, end }: ServerRowsRequest) => {
      calls++
      const rows = Array.from({ length: end - start }, (_, i) => ({ name: `行${start + i}` }))
      return Promise.resolve({ rows, total: calls === 2 ? 200 : 100 })
    })
    const source = createServerSource(el, { fetchRows, total: 100 })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    expect(el.getAttribute('total')).toBe('100')
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect(el.getAttribute('total'), '页2 响应 total=200 回写').toBe('200'))
    el.setAttribute('current', '1')
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('行0'), { timeout: 1000 })
    expect(fetchRows).toHaveBeenCalledTimes(2)
    expect(el.getAttribute('total'), '缓存条目的 total 随命中回填同步回写').toBe('100')
    source.destroy()
  })

  it('destroy 清缓存与在途登记：SWR 背景在途被中止、settle 后不回填不落缓存', async () => {
    const el = mount()
    const { fetchRows, holdAt, resolvers } = versionedFetchRows()
    holdAt(3) // SWR 后台重取 hold
    const signals: AbortSignal[] = []
    const wrappedFetch = vi.fn((req: ServerRowsRequest) => {
      signals.push(req.signal)
      return fetchRows(req)
    })
    const source = createServerSource(el, {
      fetchRows: wrappedFetch,
      total: 100,
      cache: { ttlMs: 25, staleWhileRevalidate: true },
    })
    await vi.waitFor(() => expect(signals).toHaveLength(1))
    el.setAttribute('current', '2')
    await vi.waitFor(() => expect(signals).toHaveLength(2))
    await new Promise((resolve) => setTimeout(resolve, 30))
    el.setAttribute('current', '1') // SWR：陈旧回填 + 后台重取（hold）
    await vi.waitFor(() => expect(resolvers).toHaveLength(1))
    expect(signals[2]!.aborted, '背景在途未 destroy 前不中止').toBe(false)
    source.destroy()
    expect(signals[2]!.aborted, 'destroy 中止 SWR 背景在途').toBe(true)
    resolvers[0]!({ rows: [{ name: '迟到后台' }], total: 100 })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect((el.data[0] as { name: string }).name, 'destroy 后背景 settle 不回填').toBe('v1行0')
    // 缓存已随 destroy 清空：重建同元素不命中旧数据（新实例新缓存）。
    // 重建实例不自动取首屏（data 在场，首载兜底只对无数据元素生效）——refresh 触发取数
    const source2 = createServerSource(el, { fetchRows: wrappedFetch, total: 100 })
    source2.refresh()
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name, '重建后重新取数（旧缓存已清）').toBe('v4行0'))
    source2.destroy()
  })
})
