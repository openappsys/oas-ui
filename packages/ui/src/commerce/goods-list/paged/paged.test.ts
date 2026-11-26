import { describe, expect, it, vi } from 'vitest'
import { createPagedSource, type PagedSource } from './index.js'

interface Page {
  items: { id: string }[]
  cursor?: string | null
}

/** 手动 resolve 的 deferred（状态机时序测试用） */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function page(n: number, next?: string | null): Page {
  return { items: [{ id: `p${n}-a` }, { id: `p${n}-b` }], cursor: next ?? null }
}

/** 三页数据源：p1→c2→p2→c3→p3→（无 cursor） */
function pagingLoad() {
  return vi.fn(async (ctx: { cursor: string | null; page: number }): Promise<Page> => {
    if (ctx.cursor === null) return page(1, 'c2')
    if (ctx.cursor === 'c2') return page(2, 'c3')
    if (ctx.cursor === 'c3') return page(3, null)
    throw new Error(`unexpected cursor: ${ctx.cursor}`)
  })
}

describe('goods-list paged · cursor 状态机', () => {
  it('首页：cursor=null、page=0 发起；完成后 items 累计、cursor 推进、page=1', async () => {
    const load = pagingLoad()
    const source = createPagedSource<{ id: string }, Page>({ load })
    await source.loadPage()
    expect(load).toHaveBeenCalledOnce()
    expect(load.mock.calls[0]![0]).toEqual({ cursor: null, page: 0 })
    expect(source.items.map((i) => i.id)).toEqual(['p1-a', 'p1-b'])
    expect(source.cursor).toBe('c2')
    expect(source.page).toBe(1)
    expect(source.done).toBe(false)
    expect(source.pending).toBe(false)
  })

  it('cursor 传递：第二页携带上一页尾 cursor、page 递增', async () => {
    const load = pagingLoad()
    const source = createPagedSource<{ id: string }, Page>({ load })
    await source.loadPage()
    await source.loadPage()
    expect(load.mock.calls[1]![0]).toEqual({ cursor: 'c2', page: 1 })
    expect(source.items.map((i) => i.id)).toEqual(['p1-a', 'p1-b', 'p2-a', 'p2-b'])
    expect(source.cursor).toBe('c3')
    expect(source.page).toBe(2)
  })

  it('尾页：无 cursor → done=true；done 后 loadPage 不再发请求且正常 resolve', async () => {
    const load = pagingLoad()
    const source = createPagedSource<{ id: string }, Page>({ load })
    await source.loadPage()
    await source.loadPage()
    await source.loadPage()
    expect(source.items).toHaveLength(6)
    expect(source.done).toBe(true)
    const count = load.mock.calls.length
    await expect(source.loadPage()).resolves.toBeUndefined()
    expect(load.mock.calls.length).toBe(count) // 零新请求
  })

  it('pending 防重：在途中再调 loadPage 返回同一 Promise、load 只调一次', async () => {
    const d = deferred<Page>()
    const load = vi.fn(() => d.promise)
    const source = createPagedSource<{ id: string }, Page>({ load })
    const first = source.loadPage()
    const second = source.loadPage()
    expect(second).toBe(first)
    expect(load).toHaveBeenCalledOnce()
    expect(source.pending).toBe(true)
    d.resolve(page(1, 'c2'))
    await Promise.all([first, second])
    expect(source.items).toHaveLength(2)
    expect(source.pending).toBe(false)
  })

  it('错误恢复：error 落盘、cursor/page 不动；重试同一 cursor、成功后 error 清空', async () => {
    const load = pagingLoad()
    const source = createPagedSource<{ id: string }, Page>({ load })
    await source.loadPage()
    // 第二页注入失败
    load.mockImplementationOnce(async () => {
      throw new Error('network down')
    })
    await expect(source.loadPage()).rejects.toThrow('network down')
    expect(source.error).toBeInstanceOf(Error)
    expect(source.cursor).toBe('c2') // 不推进
    expect(source.page).toBe(1) // 不递增
    expect(source.pending).toBe(false)
    expect(source.items).toHaveLength(2) // 无脏数据
    // 重试：同一 cursor
    await source.loadPage()
    expect(load.mock.calls[2]![0]).toEqual({ cursor: 'c2', page: 1 })
    expect(source.error).toBeNull()
    expect(source.items).toHaveLength(4)
  })

  it('reset：清 items/cursor/page/done 并自动加载首页（cursor=null）', async () => {
    const load = pagingLoad()
    const source = createPagedSource<{ id: string }, Page>({ load })
    await source.loadPage()
    await source.loadPage()
    await source.loadPage()
    expect(source.done).toBe(true)
    const next = await source.reset()
    expect(next).toBe(source) // 链式可用
    expect(load.mock.calls[3]![0]).toEqual({ cursor: null, page: 0 })
    expect(source.items.map((i) => i.id)).toEqual(['p1-a', 'p1-b'])
    expect(source.cursor).toBe('c2')
    expect(source.page).toBe(1)
    expect(source.done).toBe(false)
  })

  it('reset 代际守卫：切换条件后旧在途页 resolve 不污染新列表', async () => {
    const d1 = deferred<Page>()
    const d2 = deferred<Page>()
    const loads = [d1.promise, d2.promise]
    let call = 0
    const load = vi.fn(() => loads[call++]!)
    const source = createPagedSource<{ id: string }, Page>({ load })
    const first = source.loadPage() // 旧请求在途
    // 宿主切筛选：不等旧请求，直接 reset（新首页在途）
    const resetPromise = source.reset()
    d1.resolve(page(9, 'c9')) // 旧请求迟到 resolve
    await first
    expect(source.items).toEqual([]) // 陈旧页被丢弃
    d2.resolve(page(1, 'c2'))
    await resetPromise
    expect(source.items.map((i) => i.id)).toEqual(['p1-a', 'p1-b']) // 只有新首页
    expect(source.cursor).toBe('c2')
    expect(source.page).toBe(1)
  })

  it('reset 后恢复可加载（done 状态复位）', async () => {
    const load = pagingLoad()
    const source = createPagedSource<{ id: string }, Page>({ load })
    await source.loadPage()
    await source.loadPage()
    await source.loadPage()
    expect(source.done).toBe(true)
    await source.reset()
    await source.loadPage()
    expect(source.items).toHaveLength(4)
    expect(source.done).toBe(false)
  })

  it('reset 在途时 loadPage 复用同一在途请求（防重）', async () => {
    const d = deferred<Page>()
    const load = vi.fn(() => d.promise)
    const source = createPagedSource<{ id: string }, Page>({ load })
    const resetPromise = source.reset()
    expect(source.pending).toBe(true)
    expect(source.loadPage()).toBe(resetPromise)
    expect(load).toHaveBeenCalledOnce()
    d.resolve(page(1, 'c2'))
    await Promise.all([resetPromise, source.loadPage()])
    expect(source.items).toHaveLength(2)
  })

  it('getItems / getCursor：适配宿主服务端响应形状', async () => {
    const load = vi.fn(async (ctx: { cursor: string | null }) =>
      ctx.cursor === null
        ? { data: { list: [{ id: 'x1' }], next: 'n2' } }
        : { data: { list: [{ id: 'x2' }], next: undefined } },
    )
    const source = createPagedSource<{ id: string }, unknown>({
      load,
      getItems: (res) => (res as { data: { list: { id: string }[] } }).data.list,
      getCursor: (res) => (res as { data: { next?: string } }).data.next,
    })
    await source.loadPage()
    expect(source.items).toEqual([{ id: 'x1' }])
    expect(source.cursor).toBe('n2')
    await source.loadPage()
    expect(source.items).toEqual([{ id: 'x1' }, { id: 'x2' }])
    expect(source.done).toBe(true)
  })

  it('缺省适配：页对象读 items / cursor 字段', async () => {
    const load = vi.fn(async () => ({ items: [{ id: 'a' }], cursor: 'c2' }))
    const source = createPagedSource<{ id: string }>({ load })
    await source.loadPage()
    expect(source.items).toEqual([{ id: 'a' }])
    expect(source.cursor).toBe('c2')
  })

  it('load 结果非法（getItems 非数组）→ 视为空页推进，不污染累计', async () => {
    const load = vi.fn(async () => ({ junk: true }))
    const source = createPagedSource<{ id: string }, unknown>({ load })
    await source.loadPage()
    expect(source.items).toEqual([])
    expect(source.done).toBe(true) // 读不到 cursor = 没有下一页
  })

  it('状态机接口面（与本体触底协议对接的宿主胶水依赖项）', async () => {
    const source: PagedSource<{ id: string }, Page> = createPagedSource<{ id: string }, Page>({
      load: pagingLoad(),
    })
    expect(source.pending).toBe(false)
    expect(source.done).toBe(false)
    expect(source.cursor).toBeNull()
    expect(source.page).toBe(0)
    expect(source.error).toBeNull()
  })

  // —— 复核修复批回归（真实浏览器复核发现项固化）——

  it('响应适配抛错（getItems 读 res.data.list 遇 500 错误体）：pending 复位、error 落盘、可重试', async () => {
    let calls = 0
    const source = createPagedSource<{ id: string }, unknown>({
      load: async () => {
        calls += 1
        // 首次返回 500 错误体（无 data 字段——getItems 抛 TypeError）
        return calls === 1 ? { message: 'Internal Server Error' } : { data: { list: [{ id: 'ok' }], next: null } }
      },
      getItems: (res) => (res as { data: { list: { id: string }[] } }).data.list,
      getCursor: (res) => (res as { data: { next?: string | null } }).data.next ?? null,
    })
    // 修复前：适配抛错发生在 .then 成功回调——pending 恒 true / inflight 残留 / error=null，
    // README 胶水的 if (source.pending) return 永久阻断
    await expect(source.loadPage()).rejects.toThrow()
    expect(source.pending).toBe(false)
    expect(source.error).toBeInstanceOf(TypeError)
    expect(source.items).toEqual([])
    expect(source.cursor).toBeNull()
    expect(source.page).toBe(0)
    // 重试成功（同一 cursor=首页）
    await source.loadPage()
    expect(source.items).toEqual([{ id: 'ok' }])
    expect(source.error).toBeNull()
    expect(source.done).toBe(true)
  })

  it('load 同步抛错：走失败分支（Promise 契约）而非同步逃出，状态可重试', async () => {
    let calls = 0
    const source = createPagedSource<{ id: string }, Page>({
      load: () => {
        if (calls === 0) {
          calls += 1
          throw new Error('sync boom') // 同步抛（不经 Promise）
        }
        return Promise.resolve(page(1, null))
      },
    })
    // 修复前：load(ctx) 在 try 外同步调用——loadPage() 本身同步 throw，违反 Promise 契约
    await expect(source.loadPage()).rejects.toThrow('sync boom')
    expect(source.pending).toBe(false)
    expect(source.error).toBeInstanceOf(Error)
    expect(source.cursor).toBeNull()
    expect(source.page).toBe(0)
    expect(source.items).toEqual([])
    // 同步抛错后 inflight 不残留：可直接重试成功
    await source.loadPage()
    expect(source.items).toHaveLength(2)
    expect(source.error).toBeNull()
    expect(source.done).toBe(true)
  })
})
