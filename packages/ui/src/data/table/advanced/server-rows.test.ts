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
    expect(bar).not.toBeNull()
    expect(bar!.hasAttribute('hidden')).toBe(false)
    expect(bar!.querySelector('.rows-error-retry')).not.toBeNull()
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

  it('advanced 入口导出接线：createServerSource 与直连模块为同一函数', async () => {
    const { createServerSource: fromIndex } = await import('./index.js')
    expect(fromIndex).toBe(createServerSource)
  })
})
