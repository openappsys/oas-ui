import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { registerLocale, setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import { OASTable } from './index.js'
import type { RowsRequestDetail } from './row-model.js'

/**
 * infinite（无限滚动 + cursor 分页）批：属性/模式判定、请求协议（cursor/load-more/
 * totalKnown 放宽）、appendRows 追加通道、滚动触底触发、底部 loading/到底态、
 * A11y 与能力闸门矩阵。
 *
 * 冻结契约（PRD 批 A + 设计定稿约束）：
 * - `infinite` 生效 = 属性在场 + 非 pagination（pagination 优先）+ 非 windowed（windowed 优先），互斥各 devWarn 一次；
 * - `total` 可选：未知总数场景 totalKnown=false，到底以宿主 appendRows 空数组信号为准；
 * - 请求 reason 增加 'load-more'（触底追加），detail.cursor 原样回传组件记录的游标；
 * - `data` 属性写 = 替换装载缓冲；`appendRows` = 追加（空数组 = 到底信号）；
 * - 零行为漂移：未开 infinite 的一切路径不变（既有 41 文件回归全绿守护）。
 */

const COLUMNS = JSON.stringify([
  { key: 'name', title: '名称', sortable: true },
  { key: 'age', title: '年龄' },
])

type RequestRecorder = { requests: RowsRequestDetail[] }

function mount(attrs: Record<string, string>): { el: OASTable; rec: RequestRecorder } {
  const el = new OASTable()
  // 监听先挂（append/首渲染之前）：init 请求在首渲染同步链内派发，挂晚了会漏接
  const rec: RequestRecorder = { requests: [] }
  el.addEventListener('oas-rows-request', (e) => {
    rec.requests.push((e as CustomEvent).detail as RowsRequestDetail)
  })
  el.setAttribute('columns', COLUMNS)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  // 默认 mock「远离底部」几何（appendChild 之后——wrap 在首渲染时创建）：happy-dom 无布局
  // （clientHeight/scrollHeight 恒 0），而 0,0,0 恰落在触底阈值内（distance 0 ≤ 200），会让
  // appendRows 末尾的主动续触发在无布局环境下意外派发 load-more。默认远离底部使各用例的
  // 请求断言只反映其显式 mock 的几何；触底用例经 scrollWrap/mockWrapGeometry 覆盖。
  mockWrapGeometry(el, { clientHeight: 100, scrollHeight: 5000, scrollTop: 0 })
  return { el, rec }
}

function mountInfinite(over: Record<string, string> = {}): { el: OASTable; rec: RequestRecorder } {
  return mount({ infinite: '', ...over })
}

const rowsOf = (el: OASTable): HTMLElement[] => [...el.shadowRoot!.querySelectorAll('[part="row"]')] as HTMLElement[]
const bodyRows = (el: OASTable): HTMLElement[] => [...el.shadowRoot!.querySelectorAll('tbody tr')] as HTMLElement[]

/** 等待微任务队列清空（前提告警复核在 queueMicrotask 回调中落定） */
const flushMicrotask = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

/** 等待 rAF 回调清空（触底检测与渲染帧走 requestAnimationFrame） */
const flushRaf = async (): Promise<void> => {
  await new Promise((r) => setTimeout(r, 60))
}

/** 模拟滚动容器几何与滚动事件（happy-dom 无布局——defineProperty 覆盖只读度量） */
function scrollWrap(el: OASTable, geometry: { clientHeight: number; scrollHeight: number; scrollTop: number }): void {
  mockWrapGeometry(el, geometry)
  const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
  wrap.dispatchEvent(new Event('scroll'))
}

/** 仅 mock 几何、不派 scroll 事件（appendRows 自动续派用例的精确触发源控制） */
function mockWrapGeometry(
  el: OASTable,
  geometry: { clientHeight: number; scrollHeight: number; scrollTop?: number },
): void {
  const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
  Object.defineProperty(wrap, 'clientHeight', { value: geometry.clientHeight, configurable: true })
  Object.defineProperty(wrap, 'scrollHeight', { value: geometry.scrollHeight, configurable: true })
  if (geometry.scrollTop !== undefined) wrap.scrollTop = geometry.scrollTop
}

describe('OASTable infinite：模式判定与互斥', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('infinite 在场 → init 请求派发（start=0、totalKnown 随 total 在场性），装载缓冲为空时走全表 loading', () => {
    const { el, rec } = mountInfinite()
    expect(rec.requests.length).toBe(1)
    expect(rec.requests[0]!.reason).toBe('init')
    expect(rec.requests[0]!.start).toBe(0)
    expect(rec.requests[0]!.end).toBe(0)
    expect(rec.requests[0]!.totalKnown).toBe(false)
    expect(rec.requests[0]!.cursor).toBeUndefined()
    // 首载（装载 0 + 在途）：全表 loading 行（存在且唯一）
    expect(el.shadowRoot!.querySelectorAll('[part="loading-row"]').length).toBe(1)
    // 行模型标志位进 flat 缓存键：infinite 形态渲染不残留 client 分页语义
    expect(el.hasAttribute('pagination')).toBe(false)
  })

  it('total 在场 → init 的 totalKnown=true（aria-rowcount 用 total）', () => {
    const { el, rec } = mountInfinite({ total: '100' })
    expect(rec.requests[0]!.totalKnown).toBe(true)
    expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount')).toBe('100')
  })

  it('total 缺席 → aria-rowcount 省略不写（未知总数场景读屏不作总数播报）', () => {
    const { el } = mountInfinite()
    expect(el.shadowRoot!.querySelector('table')!.hasAttribute('aria-rowcount')).toBe(false)
  })

  it('infinite + pagination 同开：pagination 优先 + devWarn 一次（不派发请求、不分页器缺席）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el, rec } = mountInfinite({ pagination: '', total: '30', data: JSON.stringify([{ name: '甲', age: 1 }]) })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('pagination')
    expect(rec.requests.length).toBe(0)
    // pagination 优先 = 既有分页语义完整保留（total 外部形态下分页器照常渲染）
    expect(el.shadowRoot!.querySelectorAll('.pagination').length).toBe(1)
    // 同实例再渲染不重复告警
    el.setAttribute('data', JSON.stringify([{ name: '乙', age: 2 }]))
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('infinite + windowed 同开：windowed 优先 + devWarn 一次（server 同款互斥先例）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el, rec } = mountInfinite({
      windowed: '',
      total: '100',
      'window-start': '10',
      data: JSON.stringify([{ name: '行10', age: 20 }]),
    })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('windowed')
    expect(rec.requests.length).toBe(0)
    // windowed 契约完整保留：切片行照常渲染
    expect(rowsOf(el).length).toBe(1)
    expect(rowsOf(el)[0]!.textContent).toContain('行10')
    warn.mockRestore()
  })

  it('infinite 缺席（client 缺省）→ 零请求、零告警、行为不变', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el, rec } = mount({ data: JSON.stringify([{ name: '甲', age: 1 }]) })
    await flushMicrotask()
    expect(rec.requests.length).toBe(0)
    expect(warn).not.toHaveBeenCalled()
    expect(rowsOf(el).length).toBe(1)
    warn.mockRestore()
  })

  it('row-model="server" + infinite 同开：infinite 接管（协议走 cursor/load-more，不落「缺 total」告警）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rec } = mountInfinite({ 'row-model': 'server' })
    await flushMicrotask()
    expect(warn).not.toHaveBeenCalled()
    expect(rec.requests.length).toBe(1)
    expect(rec.requests[0]!.reason).toBe('init')
    // total 缺席（server 前提对 infinite 放宽）：totalKnown=false
    expect(rec.requests[0]!.totalKnown).toBe(false)
    warn.mockRestore()
  })
})

describe('OASTable infinite：appendRows 追加通道', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('appendRows 追加已装载行（区别于 data 替换语义）并清在途 loading', () => {
    const { el, rec } = mountInfinite()
    expect(rowsOf(el).length).toBe(0)
    el.appendRows([
      { name: '甲', age: 1 },
      { name: '乙', age: 2 },
    ])
    // 追加行渲染（tr.row 数据行），loading 行收敛
    expect(rowsOf(el).length).toBe(2)
    expect(rowsOf(el)[0]!.textContent).toContain('甲')
    expect(el.shadowRoot!.querySelector('[part="loading-row"]')).toBeNull()
    expect(el.shadowRoot!.querySelector('table')!.hasAttribute('aria-busy')).toBe(false)
    // 第二块追加：累积不清旧
    el.appendRows([{ name: '丙', age: 3 }])
    expect(rowsOf(el).length).toBe(3)
    expect(rec.requests.length).toBe(1) // 回填不触发新请求（防请求循环）
  })

  it('options.cursor 记录游标，load-more 请求 detail.cursor 原样回传', () => {
    const { el, rec } = mountInfinite()
    el.appendRows([{ name: '甲', age: 1 }], { cursor: 'cursor-abc' })
    scrollWrap(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    return flushRaf().then(() => {
      const loadMore = rec.requests.find((r) => r.reason === 'load-more')
      expect(loadMore).toBeDefined()
      expect(loadMore!.cursor).toBe('cursor-abc')
      expect(loadMore!.start).toBe(1) // 已装载 1 行
      expect(loadMore!.end).toBe(1)
    })
  })

  it('options.total 提供时同步 total 属性与 aria-rowcount', () => {
    const { el } = mountInfinite()
    expect(el.getAttribute('total')).toBeNull()
    el.appendRows([{ name: '甲', age: 1 }], { total: 42 })
    expect(el.getAttribute('total')).toBe('42')
    expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount')).toBe('42')
  })

  it('data 属性写 = 替换装载缓冲（cursor 清空、到底信号复位）', () => {
    const { el, rec } = mountInfinite()
    el.appendRows([{ name: '甲', age: 1 }], { cursor: 'c1' })
    el.appendRows([], { cursor: 'c2' }) // 到底
    expect(el.shadowRoot!.querySelectorAll('[part="no-more-row"]').length).toBe(1)
    expect(el.shadowRoot!.querySelector('[part="no-more-row"]')!.textContent).toContain('没有更多')
    // data 替换：缓冲重置为 data 内容、到底态消失
    el.setAttribute('data', JSON.stringify([{ name: '新甲', age: 9 }]))
    expect(rowsOf(el).length).toBe(1)
    expect(rowsOf(el)[0]!.textContent).toContain('新甲')
    expect(el.shadowRoot!.querySelector('[part="no-more-row"]')).toBeNull()
    // 重置后滚动触底：cursor 已清（undefined）、请求重新可触发
    scrollWrap(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    return flushRaf().then(() => {
      const loadMore = rec.requests.find((r) => r.reason === 'load-more')
      expect(loadMore).toBeDefined()
      expect(loadMore!.cursor).toBeUndefined()
    })
  })

  it('requestId 守卫：晚到旧响应（序号不符）静默丢弃 + devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el, rec } = mountInfinite()
    const firstId = rec.requests[0]!.requestId
    // 回填首块（清在途）后滚动触底才可派发（在途守卫）
    el.appendRows([{ name: '甲', age: 1 }])
    scrollWrap(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    return flushRaf().then(() => {
      const loadMoreId = rec.requests.find((r) => r.reason === 'load-more')!.requestId
      expect(loadMoreId).toBe(firstId + 1)
      const rowsBefore = rowsOf(el).length
      // 晚到旧响应（init 序号）：丢弃不追加
      el.appendRows([{ name: '旧响应', age: -1 }], { requestId: firstId })
      expect(rowsOf(el).length).toBe(rowsBefore)
      el.appendRows([{ name: '新响应', age: 2 }], { requestId: loadMoreId })
      expect(rowsOf(el).length).toBe(rowsBefore + 1)
      expect(rowsOf(el)[rowsBefore]!.textContent).toContain('新响应')
      expect(warn).toHaveBeenCalledTimes(1)
      expect(String(warn.mock.calls[0]![0])).toContain('requestId')
      warn.mockRestore()
    })
  })

  it('requestId 幂等：同序号重复回填静默忽略 + devWarn 一次（双监听防线）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el, rec } = mountInfinite()
    const id = rec.requests[0]!.requestId
    el.appendRows([{ name: '甲', age: 1 }], { requestId: id })
    el.appendRows([{ name: '重复响应', age: -1 }], { requestId: id })
    expect(rowsOf(el).length).toBe(1)
    expect(rowsOf(el)[0]!.textContent).toContain('甲')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('幂等')
    warn.mockRestore()
  })

  it('不带 requestId 的自由通道：预填/手动多批 append 不误伤（无请求身份不去重）', () => {
    const { el } = mountInfinite()
    el.appendRows([{ name: '批一', age: 1 }])
    el.appendRows([{ name: '批二', age: 2 }])
    expect(rowsOf(el).length).toBe(2)
    expect(rowsOf(el)[1]!.textContent).toContain('批二')
  })

  it('空数组 appendRows = 到底信号：hostEnded 置位、停止触底触发、渲染「已到底」提示行', () => {
    const { el, rec } = mountInfinite()
    el.appendRows([{ name: '甲', age: 1 }])
    el.appendRows([])
    expect(el.shadowRoot!.querySelectorAll('[part="no-more-row"]').length).toBe(1)
    expect(el.shadowRoot!.querySelector('[part="no-more-row"]')!.textContent).toContain('没有更多')
    // 到底后滚动触底不再派发
    scrollWrap(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    return flushRaf().then(() => {
      expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(0)
    })
  })

  it('refreshRows({ purge }) 重置装载缓冲与到底信号 + 重发首块（reason=refresh）', () => {
    const { el, rec } = mountInfinite()
    el.appendRows([{ name: '甲', age: 1 }], { cursor: 'c1' })
    el.appendRows([])
    el.refreshRows({ purge: true })
    expect(rec.requests[rec.requests.length - 1]!.reason).toBe('refresh')
    expect(rowsOf(el).length).toBe(0)
    expect(el.shadowRoot!.querySelector('[part="no-more-row"]')).toBeNull()
    // 回填首块（清在途）后滚动触底可再触发（在途守卫在 refresh 未回填时同样生效）
    el.appendRows([{ name: '新块', age: 5 }], { cursor: 'c9' })
    scrollWrap(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    return flushRaf().then(() => {
      const loadMore = rec.requests.filter((r) => r.reason === 'load-more')
      expect(loadMore.length).toBe(1)
      expect(loadMore[0]!.cursor).toBe('c9')
    })
  })

  it('非 infinite 形态调用 appendRows：静默 no-op + devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mount({ data: JSON.stringify([{ name: '甲', age: 1 }]) })
    el.appendRows([{ name: '乙', age: 2 }])
    expect(rowsOf(el).length).toBe(1) // 未追加
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('appendRows')
    warn.mockRestore()
  })

  it('reportRowsError 在 infinite 生效：清 loading + 失败条 + oas-rows-error（同族失败通道复用）', () => {
    const { el, rec } = mountInfinite()
    const id = rec.requests[0]!.requestId
    const errors: unknown[] = []
    el.addEventListener('oas-rows-error', (e) => errors.push((e as CustomEvent).detail))
    el.reportRowsError({ requestId: id, reason: 'network' })
    expect(errors.length).toBe(1)
    expect(el.shadowRoot!.querySelector('.rows-error')!.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('.rows-error')!.textContent).toContain('加载失败')
    expect(el.shadowRoot!.querySelector('table')!.hasAttribute('aria-busy')).toBe(false)
  })

  it('reportRowsError 晚到失败（序号不符）静默丢弃（单调序号守卫同 server 口径）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountInfinite()
    el.reportRowsError({ requestId: 999 })
    expect(el.shadowRoot!.querySelector('.rows-error')!.hasAttribute('hidden')).toBe(true)
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})

describe('OASTable infinite：滚动触底触发', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('接近底部（距底 < max(200, 1.5×视口高)）→ load-more 请求（在途守卫 + hasMore 守卫）', () => {
    const { el, rec } = mountInfinite()
    el.appendRows([{ name: '甲', age: 1 }])
    scrollWrap(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    return flushRaf().then(() => {
      expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(1)
      // 在途未回填：再滚动不重复派发（在途守卫）
      scrollWrap(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 950 })
      return flushRaf().then(() => {
        expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(1)
        // 回填后（未到底）再滚动 → 第二次 load-more
        el.appendRows([{ name: '乙', age: 2 }], { cursor: 'c2' })
        scrollWrap(el, { clientHeight: 100, scrollHeight: 1200, scrollTop: 1100 })
        return flushRaf().then(() => {
          expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(2)
        })
      })
    })
  })

  it('远离底部不触发', () => {
    const { el, rec } = mountInfinite()
    el.appendRows([{ name: '甲', age: 1 }])
    scrollWrap(el, { clientHeight: 100, scrollHeight: 5000, scrollTop: 0 })
    return flushRaf().then(() => {
      expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(0)
    })
  })

  it('totalKnown 且已装载满 total → 不触发（装满即到底）', () => {
    const { el, rec } = mountInfinite({ total: '2' })
    el.appendRows([
      { name: '甲', age: 1 },
      { name: '乙', age: 2 },
    ])
    scrollWrap(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    return flushRaf().then(() => {
      expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(0)
      // 装满 total 也渲染「已到底」提示行
      expect(el.shadowRoot!.querySelectorAll('[part="no-more-row"]').length).toBe(1)
      expect(el.shadowRoot!.querySelector('[part="no-more-row"]')!.textContent).toContain('没有更多')
    })
  })

  it('在途时 aria-busy=true，回填后移除', () => {
    const { el } = mountInfinite()
    expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-busy')).toBe('true')
    el.appendRows([{ name: '甲', age: 1 }])
    expect(el.shadowRoot!.querySelector('table')!.hasAttribute('aria-busy')).toBe(false)
  })

  it('appendRows 后视口仍在触底阈值内 → 自动续派下一块（不依赖再次滚动）', () => {
    const { el, rec } = mountInfinite()
    // 显式 mock 近底几何且不派 scroll 事件：唯一触发源 = appendRows 末尾的主动续触发
    mockWrapGeometry(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    el.appendRows([{ name: '甲', age: 1 }])
    return flushRaf().then(() => {
      const loadMore = rec.requests.filter((r) => r.reason === 'load-more')
      expect(loadMore.length).toBe(1)
      expect(loadMore[0]!.start).toBe(1) // 已装载 1 行
    })
  })

  it('appendRows 后已离开触底阈值 → 不自动续派', () => {
    const { el, rec } = mountInfinite()
    mockWrapGeometry(el, { clientHeight: 100, scrollHeight: 5000, scrollTop: 0 })
    el.appendRows([{ name: '甲', age: 1 }])
    return flushRaf().then(() => {
      expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(0)
    })
  })

  it('appendRows 到底信号（空块回填）后不自动续派', () => {
    const { el, rec } = mountInfinite()
    mockWrapGeometry(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    el.appendRows([{ name: '甲', age: 1 }])
    el.appendRows([]) // 到底信号：hasMore 翻转
    return flushRaf().then(() => {
      expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(0)
      expect(el.shadowRoot!.querySelectorAll('[part="no-more-row"]').length).toBe(1)
    })
  })

  it('appendRows 装载满 total（totalKnown）后不自动续派', () => {
    const { el, rec } = mountInfinite({ total: '2' })
    mockWrapGeometry(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    el.appendRows([
      { name: '甲', age: 1 },
      { name: '乙', age: 2 },
    ])
    return flushRaf().then(() => {
      expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(0)
    })
  })

  it('appendRows 自动续派受在途守卫约束：rAF 排队期间已有新请求在途则不重发', () => {
    const { el, rec } = mountInfinite()
    mockWrapGeometry(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    el.appendRows([{ name: '甲', age: 1 }]) // 清在途 + 排自动续派 rAF
    // rAF 执行前 refreshRows 同步派发（serverLoading 置位）：自动续派回调时点复核在途 → 不重发
    el.refreshRows()
    return flushRaf().then(() => {
      const reasons = rec.requests.map((r) => r.reason)
      expect(reasons).toEqual(['init', 'refresh']) // 无 load-more 插入
    })
  })

  it('用户手势（wheel）清除回波吞位：布防后的真实滚动不被吞（触底检测照常触发）', async () => {
    const { el, rec } = mountInfinite()
    el.appendRows([{ name: '甲', age: 1 }])
    await flushRaf() // 先排掉 appendRows 自动续派的 rAF（此刻几何远离底部 → 不派）
    expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(0)
    // 白盒布防：happy-dom 无布局，restoreScrollPosition 的「真实位移才布防」条件无法自然
    // 达成——直接模拟 appendRows 渲染链路布防吞位后的实例状态（swallowScrollSeq = 当代次）
    ;(el as any).armScrollSwallow()
    mockWrapGeometry(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    // 用户手势先到（wheel 已挂 cancelScrollIntent）：吞位只应吞「无用户意图的程序写入回波」
    wrap.dispatchEvent(new Event('wheel'))
    // 手势后的真实滚动：不得被吞位吞掉——触底检测照常触发
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // 唯一触发源 = 手势后的 scroll 拍（近底几何 + 非在途 + hasMore）
    expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(1)
  })

  it('用户手势（键盘）清除回波吞位：布防后的原生键盘滚动不被吞（触底检测照常触发）', async () => {
    const { el, rec } = mountInfinite()
    el.appendRows([{ name: '甲', age: 1 }])
    await flushRaf() // 先排掉 appendRows 自动续派的 rAF（此刻几何远离底部 → 不派）
    expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(0)
    // 白盒布防：同 wheel 用例——happy-dom 无布局，直接模拟渲染链路布防吞位后的实例状态
    ;(el as any).armScrollSwallow()
    mockWrapGeometry(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    // 键盘滚动意图先到（keydown 已挂 cancelScrollIntentOnKey，同源豁免：键盘滚动同为
    // 真实用户输入）——焦点在滚动容器时的原生键盘滚动其后 scroll 是用户真实滚动
    wrap.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    // 键盘滚动后的真实滚动：不得被吞位吞掉——触底检测照常触发
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // 唯一触发源 = 键盘滚动后的 scroll 拍（近底几何 + 非在途 + hasMore）
    expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(1)
  })

  it('无用户手势时回波吞位照常生效且只吞一拍（吞位守卫机制不回退）', async () => {
    const { el, rec } = mountInfinite()
    el.appendRows([{ name: '甲', age: 1 }])
    await flushRaf() // 先排掉 appendRows 自动续派的 rAF（此刻几何远离底部 → 不派）
    ;(el as any).armScrollSwallow()
    mockWrapGeometry(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // 吞掉的一拍：无 load-more（程序写入回波守卫语义保留）
    expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(0)
    // 第二拍（吞位已消耗）恢复正常——守卫是一次性的，不吞后续真实滚动
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(1)
  })
})

describe('OASTable infinite：排序/过滤/页大小变更重置装载', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('排序变更 → 重置缓冲（行清空）+ 派 sort 请求（cursor=undefined、start=0）', () => {
    const { el, rec } = mountInfinite()
    el.appendRows([{ name: '乙', age: 2 }], { cursor: 'c1' })
    el.setAttribute('sort-key', 'name')
    el.setAttribute('sort-order', 'asc')
    const sortReq = rec.requests[rec.requests.length - 1]!
    expect(sortReq.reason).toBe('sort')
    expect(sortReq.cursor).toBeUndefined()
    expect(sortReq.start).toBe(0)
    expect(rowsOf(el).length).toBe(0) // 缓冲已重置
    expect(sortReq.sortModel).toEqual([{ key: 'name', order: 'asc' }])
  })

  it('排序变更不执行本地排序（装载序保持——排序职责在宿主，表头指示器照常）', () => {
    const { el } = mountInfinite()
    el.appendRows([
      { name: '乙', age: 2 },
      { name: '甲', age: 1 },
    ])
    el.setAttribute('sort-key', 'name')
    el.setAttribute('sort-order', 'asc')
    el.appendRows([
      { name: '乙', age: 2 },
      { name: '甲', age: 1 },
    ])
    // 宿主回传已按服务端排序的块：组件原样渲染（码点序 乙 > 甲——asc 下若本地排序会翻转）
    expect(rowsOf(el)[0]!.textContent).toContain('乙')
    // 表头排序指示器照常显示（受控属性）
    expect(el.shadowRoot!.querySelector('th.sortable')!.getAttribute('data-order')).toBe('asc')
  })

  it('过滤变更 → 派 filter 请求 + 重置缓冲', () => {
    const { el, rec } = mountInfinite()
    el.appendRows([{ name: '甲', age: 1 }], { cursor: 'c1' })
    el.setAttribute('filter-values', JSON.stringify({ name: '甲' }))
    const req = rec.requests[rec.requests.length - 1]!
    expect(req.reason).toBe('filter')
    expect(req.cursor).toBeUndefined()
    expect(req.filterValues).toEqual({ name: '甲' })
    expect(rowsOf(el).length).toBe(0)
  })

  it('页大小变更 → 派 paginate 请求 + 重置缓冲（infinite 下 paginate 仅页大小语义）', () => {
    const { el, rec } = mountInfinite({ 'page-size': '10' })
    el.appendRows([{ name: '甲', age: 1 }])
    el.setAttribute('page-size', '20')
    const req = rec.requests[rec.requests.length - 1]!
    expect(req.reason).toBe('paginate')
    expect(rowsOf(el).length).toBe(0)
  })

  it('current 属性写不触发请求（infinite 无页码概念——不写入、不参与签名）', () => {
    const { el, rec } = mountInfinite()
    const before = rec.requests.length
    el.setAttribute('current', '3')
    expect(rec.requests.length).toBe(before)
  })

  it('挂载带 current="3" → 仅 1 次 init，宿主回填与普通属性写零续发（记录/比对签名同口径，防无界请求循环）', () => {
    // 循环机理：dispatchRowsRequest 记录侧若存 raw current=3，而 syncInfiniteRows 比对侧
    // 用 infiniteRequestState()（current 恒 1），两侧签名永不匹配 → 每次 update（含宿主
    // appendRows 回填触发的 runUpdateAndNotify）都推得 paginate → 派发 → 回填 → 再派发
    // → 无界请求循环。修复后记录侧同样归一化，挂载快照只派 1 次 init。
    const { el, rec } = mountInfinite({ current: '3' })
    expect(rec.requests.length).toBe(1)
    expect(rec.requests[0]!.reason).toBe('init')
    // detail 区间语义与 current 无关：start/end = 已装载行数（挂载时为 0）
    expect(rec.requests[0]!.start).toBe(0)
    expect(rec.requests[0]!.end).toBe(0)
    // 宿主回填（真实循环的续发触发源）后零派发
    el.appendRows([{ name: '甲', age: 1 }])
    expect(rec.requests.length).toBe(1)
    // 后续普通属性写（不进请求签名键）同样零派发
    el.setAttribute('total', '100')
    el.setAttribute('striped', '')
    expect(rec.requests.length).toBe(1)
  })

  it('挂载带 current="3" + sort/filter 后归一化签名仍生效（非 current 组变更照常派发，current 组变更静默）', () => {
    // 归一化只抹平 current 组：排序/过滤/页大小组变更的派发语义不受影响
    const { el, rec } = mountInfinite({ current: '3' })
    expect(rec.requests.length).toBe(1)
    el.setAttribute('sort-key', 'name')
    el.setAttribute('sort-order', 'asc')
    expect(rec.requests.length).toBe(2)
    expect(rec.requests[1]!.reason).toBe('sort')
    // 排序态下的 current 属性写（同值组）仍静默——归一化后签名含 current=1 两侧一致
    el.setAttribute('current', '5')
    expect(rec.requests.length).toBe(2)
    el.appendRows([{ name: '甲', age: 1 }])
    expect(rec.requests.length).toBe(2)
  })
})

describe('OASTable infinite：底部状态行渲染', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('已装载 + 在途：底部 loading 行追加在数据行之后（复用 part="loading-row"）', () => {
    const { el } = mountInfinite()
    el.appendRows([{ name: '甲', age: 1 }])
    scrollWrap(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    return flushRaf().then(() => {
      const all = bodyRows(el)
      const loadingIdx = all.findIndex((r) => r.getAttribute('part') === 'loading-row')
      expect(loadingIdx).toBeGreaterThan(-1)
      expect(loadingIdx).toBe(all.length - 1) // 追加在最后
      // 数据行仍在（不全表 loading）
      expect(rowsOf(el).length).toBe(1)
      // loading 行带结构化内容（spin 元素 + 文案）
      expect(all[loadingIdx]!.querySelectorAll('.spin').length).toBe(1)
      expect(all[loadingIdx]!.textContent).toContain('加载中')
    })
  })

  it('locale 切换 → 底部提示文案随渲染签名刷新', () => {
    registerLocale(en)
    const { el } = mountInfinite()
    el.appendRows([{ name: '甲', age: 1 }])
    el.appendRows([])
    const zh = el.shadowRoot!.querySelector('[part="no-more-row"]')!.textContent
    setLocale('en')
    const enText = el.shadowRoot!.querySelector('[part="no-more-row"]')!.textContent
    expect(zh).not.toBe(enText)
    expect(enText).toBe('No more data')
    setLocale('zh-CN')
  })

  it('未装载行时不渲染任何底部状态节点（首载全表 loading / 空态由既有分支承担）', () => {
    const { el } = mountInfinite()
    expect(el.shadowRoot!.querySelectorAll('[part="loading-row"]').length).toBe(1) // 全表 loading
    el.appendRows([]) // 空块：到底 + 未装载 → 空态文案
    expect(el.shadowRoot!.querySelector('[part="no-more-row"]')).toBeNull()
    expect(el.shadowRoot!.querySelector('td.empty')!.textContent).toContain('暂无数据')
  })
})

describe('OASTable infinite：能力闸门矩阵（与 server 同口径逐项声明）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('导出仅已装载数据 + devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountInfinite()
    el.appendRows([{ name: '甲', age: 1 }])
    const content = el.exportData('csv')
    expect(content).toContain('甲')
    expect(content).not.toContain('未装载')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('导出')
    // 同实例再导出不重复告警
    el.exportData('csv')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('合计 scope=all 禁用 + devWarn 一次；scope=page 对已装载数据照常生效', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountInfinite({ summary: '[{"key":"age","type":"sum"}]' })
    el.appendRows([
      { name: '甲', age: 1 },
      { name: '乙', age: 2 },
    ])
    expect(el.shadowRoot!.querySelector('tbody tr')!.className).not.toContain('summary')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('summary-scope')
    warn.mockRestore()
    // scope=page：页内（已装载）合计生效
    const el2 = mountInfinite({
      summary: '[{"key":"age","type":"sum"}]',
      'summary-scope': 'page',
    }).el
    el2.appendRows([
      { name: '甲', age: 1 },
      { name: '乙', age: 2 },
    ])
    const summaryText = [...el2.shadowRoot!.querySelectorAll('tbody tr')].map((r) => r.textContent).join('|')
    expect(summaryText).toContain('3') // 1+2
  })

  it('合计 scope=all + summary-values（批 I）：宿主提供全量合计 → 合计行渲染（无 devWarn），取宿主值而非已装载聚合', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountInfinite({
      summary: '[{"key":"age","type":"sum"}]',
      'summary-values': '{"age":888}',
    })
    el.appendRows([
      { name: '甲', age: 1 },
      { name: '乙', age: 2 },
    ])
    const tr = el.shadowRoot!.querySelector('tbody tr.summary')
    // 强断言：宿主提供 summary-values 时合计行渲染（scope=all 不再禁用）——className 精确等于 'summary'
    expect(tr?.className, 'infinite 下宿主提供 summary-values 时合计行渲染').toBe('summary')
    // 宿主全量口径 888（非已装载聚合 3）——逐列落位（列序 name / age）
    const tds = [...tr!.querySelectorAll('td')] as HTMLTableCellElement[]
    expect(tds[1]!.textContent).toBe('888')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('合计 scope=all + summary-values 未提供：行为 = 现状（禁用 + devWarn 一次）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountInfinite({ summary: '[{"key":"age","type":"sum"}]' })
    el.appendRows([{ name: '甲', age: 1 }])
    expect(el.shadowRoot!.querySelector('tbody tr.summary')).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('summary-scope')
    warn.mockRestore()
  })

  it('group-by 禁用 + devWarn 一次（不渲染分节头）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountInfinite({ 'group-by': 'dept' })
    el.appendRows([
      { name: '甲', age: 1, dept: 'A' },
      { name: '乙', age: 2, dept: 'A' },
    ])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('group-by')
    // 数据行原样（无 group 分节行——group 行不带 tr.row）
    expect(rowsOf(el).length).toBe(2)
    warn.mockRestore()
  })

  it('row-draggable 禁用 + devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountInfinite({ 'row-draggable': '' })
    el.appendRows([{ name: '甲', age: 1 }])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('row-draggable')
    expect(el.shadowRoot!.querySelector('.drag-handle')).toBeNull()
    warn.mockRestore()
  })

  it('列序放行（批 F 契约）：setColumnOrder 写回 + 派发事件，列设置面板闸门恒 false（按钮可用性只由边界位决定）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountInfinite()
    let detail: unknown
    el.addEventListener('oas-column-order', (e: Event) => (detail = (e as CustomEvent).detail))
    el.setColumnOrder(['age', 'name'])
    // 列序是展示态（与服务端装载序无关）：写回 + 事件，与 client 同语义
    expect(el.getAttribute('column-keys')).toBe(JSON.stringify(['age', 'name']))
    expect(detail).toEqual({ keys: ['age', 'name'] })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('merge 列跳过合并 + devWarn 一次（已装载缓冲跨界合并语义不确定）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const cols = JSON.stringify([
      { key: 'dept', title: '部门', merge: true },
      { key: 'name', title: '名称' },
    ])
    const el = new OASTable()
    el.setAttribute('columns', cols)
    el.setAttribute('infinite', '')
    document.body.appendChild(el)
    el.appendRows([
      { dept: 'A', name: '甲' },
      { dept: 'A', name: '乙' },
    ])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('merge')
    // 无 rowspan 合并（两行独立）
    const tds = [...el.shadowRoot!.querySelectorAll('tbody td')]
    expect(tds.filter((td) => td.getAttribute('rowspan')).length).toBe(0)
    warn.mockRestore()
  })
})

describe('OASTable infinite：批 G 缓冲上界与淘汰（max-loaded-rows）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('缺省无上界（现状）：多块追加超过任何假想上界也不淘汰、零告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountInfinite()
    for (let i = 1; i <= 5; i++) el.appendRows([{ name: `行${i}`, age: i }])
    expect(rowsOf(el).length).toBe(5)
    expect(rowsOf(el)[0]!.textContent).toContain('行1')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('上界在场：追加超界淘汰最旧块——缓冲收敛到最近 N 行，渲染窗口不丢当前视口', () => {
    const { el } = mountInfinite({ 'max-loaded-rows': '3' })
    el.appendRows([{ name: '行1', age: 1 }])
    el.appendRows([{ name: '行2', age: 2 }])
    el.appendRows([{ name: '行3', age: 3 }])
    expect(rowsOf(el).length).toBe(3)
    // 第 4 行追加触发淘汰：最旧的行1出局，保留最近 3 行
    el.appendRows([{ name: '行4', age: 4 }])
    const texts = rowsOf(el).map((r) => r.textContent ?? '')
    expect(texts.length).toBe(3)
    expect(texts[0]).toContain('行2')
    expect(texts[2]).toContain('行4')
    expect(texts.join('|')).not.toContain('行1')
  })

  it('一块内一次追加超过上界：保留该块最近 N 行（一次淘汰到位）', () => {
    const { el } = mountInfinite({ 'max-loaded-rows': '2' })
    el.appendRows([
      { name: '行1', age: 1 },
      { name: '行2', age: 2 },
      { name: '行3', age: 3 },
      { name: '行4', age: 4 },
    ])
    const texts = rowsOf(el).map((r) => r.textContent ?? '')
    expect(texts).toEqual([expect.stringContaining('行3'), expect.stringContaining('行4')])
  })

  it('detail.start 用累计装载数（淘汰后仍连续）——游标链不受缓冲长度影响', () => {
    const { el, rec } = mountInfinite({ 'max-loaded-rows': '3' })
    for (let i = 1; i <= 5; i++) el.appendRows([{ name: `行${i}`, age: i }], { cursor: `c${i}` })
    // 缓冲只剩 3 行，但宿主已累计交付 5 行——下一块从第 5 行后起取
    expect(rowsOf(el).length).toBe(3)
    scrollWrap(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    return flushRaf().then(() => {
      const loadMore = rec.requests.find((r) => r.reason === 'load-more')
      expect(loadMore).toBeDefined()
      expect(loadMore!.start).toBe(5)
      expect(loadMore!.cursor).toBe('c5')
    })
  })

  it('hasMore 与淘汰交互：totalKnown 时按累计装载数判定（淘汰不影响到底判定）', () => {
    const { el, rec } = mountInfinite({ 'max-loaded-rows': '3', total: '5' })
    for (let i = 1; i <= 5; i++) el.appendRows([{ name: `行${i}`, age: i }])
    // 累计 5 行装满 total=5 → 到底（缓冲只剩最近 3 行也不续派）
    scrollWrap(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    return flushRaf().then(() => {
      expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(0)
      // 「已到底」提示行照常渲染（当前视口不丢）
      expect(el.shadowRoot!.querySelectorAll('[part="no-more-row"]').length).toBe(1)
    })
  })

  it('到底信号不受淘汰影响：空块信号置位后缓冲淘汰不复活 hasMore', () => {
    const { el, rec } = mountInfinite({ 'max-loaded-rows': '2' })
    el.appendRows([{ name: '行1', age: 1 }])
    el.appendRows([{ name: '行2', age: 2 }])
    el.appendRows([]) // 到底信号
    el.appendRows([{ name: '行3', age: 3 }]) // 淘汰行1，缓冲 2 行
    expect(rowsOf(el).length).toBe(2)
    scrollWrap(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    return flushRaf().then(() => {
      expect(rec.requests.filter((r) => r.reason === 'load-more').length).toBe(0)
      expect(el.shadowRoot!.querySelectorAll('[part="no-more-row"]').length).toBe(1)
    })
  })

  it('淘汰触发滚动锚定：视口回拉淘汰行数的行高（当前视口行不跳）；不足一行高时钳到 0', () => {
    const { el } = mountInfinite({ 'max-loaded-rows': '3' })
    el.appendRows([{ name: '行1', age: 1 }])
    el.appendRows([{ name: '行2', age: 2 }])
    el.appendRows([{ name: '行3', age: 3 }])
    // 视口停在行2 顶（scrollTop = 1 行高 = 40px）；追加行4 淘汰行1（1 行 = 40px）
    mockWrapGeometry(el, { clientHeight: 100, scrollHeight: 5000, scrollTop: 40 })
    el.appendRows([{ name: '行4', age: 4 }])
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    expect(wrap.scrollTop).toBe(0) // 40 - 40：原行2 内容留在视口顶
    // 钳制：scrollTop 不足淘汰行高时钳到 0（不为负）
    mockWrapGeometry(el, { clientHeight: 100, scrollHeight: 5000, scrollTop: 10 })
    el.appendRows([{ name: '行5', age: 5 }]) // 淘汰行2（1 行）
    expect(wrap.scrollTop).toBe(0)
    const texts = rowsOf(el).map((r) => r.textContent ?? '')
    expect(texts).toEqual([
      expect.stringContaining('行3'),
      expect.stringContaining('行4'),
      expect.stringContaining('行5'),
    ])
  })

  it('data 属性写 = 替换语义：装载计数重置 + 超上界按最近 N 行裁剪', () => {
    const { el, rec } = mountInfinite({ 'max-loaded-rows': '2' })
    el.appendRows([{ name: '行1', age: 1 }])
    el.appendRows([{ name: '行2', age: 2 }])
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: '新1', age: 1 },
        { name: '新2', age: 2 },
        { name: '新3', age: 3 },
      ]),
    )
    const texts = rowsOf(el).map((r) => r.textContent ?? '')
    expect(texts).toEqual([expect.stringContaining('新2'), expect.stringContaining('新3')])
    // 装载计数随替换重置为 data 交付的总行数（3；淘汰的 新1 仍计入——与 appendRows 累计口径一致）
    scrollWrap(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    return flushRaf().then(() => {
      const loadMore = rec.requests.find((r) => r.reason === 'load-more')
      expect(loadMore).toBeDefined()
      expect(loadMore!.start).toBe(3)
    })
  })

  it('非法值（非正整数）→ 一次性 devWarn + 无上界（现状行为）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountInfinite({ 'max-loaded-rows': 'abc' })
    for (let i = 1; i <= 4; i++) el.appendRows([{ name: `行${i}`, age: i }])
    expect(rowsOf(el).length).toBe(4) // 未淘汰
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('max-loaded-rows')
    warn.mockRestore()
  })

  it('非 infinite 形态：max-loaded-rows 在场零效果零告警（client 渲染不受影响）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el, rec } = mount({ 'max-loaded-rows': '2', data: JSON.stringify([{ name: '甲', age: 1 }]) })
    expect(rowsOf(el).length).toBe(1)
    expect(rec.requests.length).toBe(0)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('排序变更重置装载：缓冲与累计计数一并清零（上界状态不残留）', () => {
    const { el, rec } = mountInfinite({ 'max-loaded-rows': '2' })
    for (let i = 1; i <= 4; i++) el.appendRows([{ name: `行${i}`, age: i }])
    el.setAttribute('sort-key', 'name')
    el.setAttribute('sort-order', 'asc')
    expect(rowsOf(el).length).toBe(0) // 缓冲已重置
    el.appendRows([{ name: '新行', age: 9 }])
    scrollWrap(el, { clientHeight: 100, scrollHeight: 1000, scrollTop: 900 })
    return flushRaf().then(() => {
      const loadMore = rec.requests.find((r) => r.reason === 'load-more')
      expect(loadMore).toBeDefined()
      expect(loadMore!.start).toBe(1) // 重置后从 1 起（非 5）
    })
  })
})

describe('OASTable infinite：淘汰后行号不重编号（累计装载坐标）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  /** 追加一块连续行（名称即行键）：r<from> .. r<from+count-1> */
  const appendBlock = (el: OASTable, from: number, count: number): void => {
    el.appendRows(Array.from({ length: count }, (_, i) => ({ name: `r${from + i}`, age: from + i })))
  }
  const rowIndexOf = (el: OASTable): Array<string | null> => rowsOf(el).map((tr) => tr.getAttribute('data-row-index'))
  const ariaIndexOf = (el: OASTable): Array<string | null> => rowsOf(el).map((tr) => tr.getAttribute('aria-rowindex'))
  const keysOf = (el: OASTable): Array<string | null> => rowsOf(el).map((tr) => tr.getAttribute('data-key'))

  it('淘汰后保留行不重新编号：data-row-index / aria-rowindex 用累计装载坐标', () => {
    const { el } = mountInfinite({ total: '100', 'max-loaded-rows': '5', 'row-key': 'name' })
    appendBlock(el, 0, 4) // r0..r3（上界 5 内，无淘汰）
    appendBlock(el, 4, 4) // 追加 r4..r7 → 淘汰 r0..r2，缓冲 r3..r7
    appendBlock(el, 8, 4) // 追加 r8..r11 → 淘汰 r3..r6，缓冲 r7..r11
    // 缓冲只剩 5 行，但累计装载 12 行：保留行沿用累计坐标（淘汰不重新编号）
    expect(keysOf(el)).toEqual(['r7', 'r8', 'r9', 'r10', 'r11'])
    expect(rowIndexOf(el)).toEqual(['7', '8', '9', '10', '11'])
    expect(ariaIndexOf(el)).toEqual(['8', '9', '10', '11', '12'])
    // 读屏总数仍是全量口径（已装载 / 未装载不改变 total）
    expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount')).toBe('100')
  })

  it('无淘汰时零漂移：data-row-index 仍从 0 起（既有契约不变）', () => {
    const { el } = mountInfinite({ total: '100', 'row-key': 'name' })
    appendBlock(el, 0, 3)
    expect(rowIndexOf(el)).toEqual(['0', '1', '2'])
    expect(ariaIndexOf(el)).toEqual(['1', '2', '3'])
  })

  it('cell-click 的 rowIndex 与 data-row-index / aria-rowindex 同坐标（累计装载坐标）', () => {
    const { el } = mountInfinite({ total: '100', 'max-loaded-rows': '5', 'row-key': 'name' })
    appendBlock(el, 0, 4)
    appendBlock(el, 4, 4)
    appendBlock(el, 8, 4) // 缓冲 r7..r11
    const events: Array<{ rowIndex: number }> = []
    el.addEventListener('oas-cell-click', (e) => events.push((e as CustomEvent).detail))
    rowsOf(el)[0]!.querySelector<HTMLElement>('td[data-col="name"]')!.click()
    expect(events.length).toBe(1)
    expect(events[0]!.rowIndex, '事件 rowIndex 与 data-row-index 同坐标').toBe(7)
    expect(Number(rowsOf(el)[0]!.getAttribute('aria-rowindex')) - 1, '与 aria 播报同坐标').toBe(7)
  })

  it('displaySnapshot：rowIndexByKey / keysByIndex 同坐标，flatIndexByKey 保持缓冲内下标', () => {
    const { el } = mountInfinite({ total: '100', 'max-loaded-rows': '5', 'row-key': 'name' })
    appendBlock(el, 0, 4)
    appendBlock(el, 4, 4)
    appendBlock(el, 8, 4) // 缓冲 r7..r11
    const snapshot = el.getDisplaySnapshot()!
    expect(snapshot.rowIndexByKey.get('r7'), '按行键解析出累计装载坐标').toBe(7)
    expect(snapshot.rowIndexByKey.get('r11')).toBe(11)
    expect(snapshot.keysByIndex[7], '按坐标反解行键（range / paste 起点）').toBe('r7')
    expect(snapshot.keysByIndex[11]).toBe('r11')
    // 扁平滚动位置仍是缓冲内下标（虚拟窗口切片 / 展示序语义，不叠加累计偏移）
    expect(snapshot.flatIndexByKey.get('r7')).toBe(0)
    expect(snapshot.flatIndexByKey.get('r11')).toBe(4)
    expect(snapshot.flatCount).toBe(5)
  })

  it('data 属性替换后按新累计计数重编：淘汰的部分仍计入累计装载数', () => {
    const { el } = mountInfinite({ 'max-loaded-rows': '2', 'row-key': 'name' })
    appendBlock(el, 0, 3) // r0..r2 → 淘汰 r0，缓冲 r1..r2
    expect(rowIndexOf(el)).toEqual(['1', '2'])
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: 'n0', age: 0 },
        { name: 'n1', age: 1 },
        { name: 'n2', age: 2 },
      ]),
    )
    // 替换 = 重新装载：累计计数按新交付行数（3）起算，裁剪掉的首行仍计入 → 保留行 1..2
    expect(keysOf(el)).toEqual(['n1', 'n2'])
    expect(rowIndexOf(el)).toEqual(['1', '2'])
    expect(ariaIndexOf(el)).toEqual(['2', '3'])
  })

  it('排序 / refresh 重置缓冲后从 0 重新起算（累计坐标随装载重置清零）', () => {
    const { el } = mountInfinite({ total: '100', 'max-loaded-rows': '2', 'row-key': 'name' })
    appendBlock(el, 0, 4) // 缓冲 r2..r3，累计 4
    expect(rowIndexOf(el)).toEqual(['2', '3'])
    el.setAttribute('sort-key', 'name')
    el.setAttribute('sort-order', 'asc')
    expect(rowsOf(el).length, '缓冲已重置').toBe(0)
    appendBlock(el, 0, 2) // 新装载窗口从 0 起
    expect(rowIndexOf(el)).toEqual(['0', '1'])
    expect(ariaIndexOf(el)).toEqual(['1', '2'])
  })

  it('infinite × height（本地虚拟）路径同样用累计装载坐标（虚拟窗口切片不重置编号）', () => {
    const { el } = mountInfinite({
      total: '100',
      'max-loaded-rows': '5',
      'row-key': 'name',
      height: '200',
      'row-height': '40',
    })
    appendBlock(el, 0, 4)
    appendBlock(el, 4, 4)
    appendBlock(el, 8, 4) // 缓冲 r7..r11（累计 12）
    const rendered = rowsOf(el)
    expect(rendered.length, '虚拟窗口只渲染视口量级行').toBeLessThanOrEqual(5)
    // 视口在顶部 → 窗口从缓冲首行起；虚拟行号 = 缓冲下标 + 累计淘汰偏移（7）
    expect(rendered[0]!.getAttribute('data-key')).toBe('r7')
    expect(rendered[0]!.getAttribute('data-row-index')).toBe('7')
    expect(rendered[0]!.getAttribute('aria-rowindex')).toBe('8')
    const indexes = rowIndexOf(el).map((v) => Number(v))
    expect(Math.min(...indexes), '虚拟行号从累计偏移起（非 0）').toBeGreaterThanOrEqual(7)
    // 每渲染行与缓冲内下标一一对应（无跳号 / 无重置）
    expect(rowIndexOf(el)).toEqual(indexes.map((_, i) => String(7 + i)))
  })
})

/**
 * infinite × max-loaded-rows × render-chunk 交叉：淘汰后的分批帧同样走累计装载坐标。
 * 单独成组是因为本组以可控 rAF 队列验证「首帧」与「末帧」两处行号——full-sync 路径
 * （非分批）的同一口径已由上组覆盖，本组必须证明断言经由 renderChunkedBody 的
 * dataIndex 起点（而非全量同步循环）成立。
 */
describe('OASTable infinite × render-chunk：淘汰后分批帧沿用累计装载坐标', () => {
  let rafHandles: Map<number, () => void>
  let rafSeq = 0

  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    rafHandles = new Map()
    rafSeq = 0
    vi.stubGlobal('requestAnimationFrame', (cb: () => void): number => {
      const id = ++rafSeq
      rafHandles.set(id, cb)
      return id
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
      rafHandles.delete(id)
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    vi.unstubAllGlobals()
  })

  /** 推进直到无待执行帧（分批渲染跑完） */
  const flushRafAll = (maxFrames = 50): void => {
    for (let f = 0; f < maxFrames && rafHandles.size > 0; f++) {
      const pending = [...rafHandles.values()]
      rafHandles.clear()
      for (const cb of pending) cb()
    }
  }

  const appendBlock = (el: OASTable, from: number, count: number): void => {
    el.appendRows(Array.from({ length: count }, (_, i) => ({ name: `r${from + i}`, age: from + i })))
  }
  const rowIndexOf = (el: OASTable): Array<string | null> => rowsOf(el).map((tr) => tr.getAttribute('data-row-index'))
  const ariaIndexOf = (el: OASTable): Array<string | null> => rowsOf(el).map((tr) => tr.getAttribute('aria-rowindex'))
  const keysOf = (el: OASTable): Array<string | null> => rowsOf(el).map((tr) => tr.getAttribute('data-key'))

  it('淘汰后首帧与末帧行号都是累计坐标：无重复、不回 0（分批路径，非全量同步）', () => {
    const { el } = mountInfinite({
      total: '100',
      'max-loaded-rows': '5',
      'row-key': 'name',
      'render-chunk': '2',
    })
    appendBlock(el, 0, 4) // r0..r3：上界 5 内无淘汰
    flushRafAll()
    expect(rowIndexOf(el)).toEqual(['0', '1', '2', '3'])
    appendBlock(el, 4, 4) // 追加 r4..r7 → 淘汰 r0..r2，缓冲 r3..r7（累计装载 8）
    // 首帧：分批只铺 chunk=2 行（缓冲 5 行 → 渲染 2 行，证明走 renderChunkedBody，
    // 而非全量同步循环——全量路径此刻会一次铺满 5 行）
    expect(rowsOf(el).length, '首帧只铺 chunk 行（分批路径生效）').toBe(2)
    expect(keysOf(el)).toEqual(['r3', 'r4'])
    expect(rowIndexOf(el), '首帧行号从累计淘汰偏移 3 起').toEqual(['3', '4'])
    expect(ariaIndexOf(el), '首帧 aria-rowindex 与 data-row-index 同坐标（+1）').toEqual(['4', '5'])
    // 末帧：剩余行逐帧追加，行号严格递增、不重复、不再回到 0
    flushRafAll()
    expect(rafHandles.size, '末帧后无在途帧').toBe(0)
    expect(keysOf(el)).toEqual(['r3', 'r4', 'r5', 'r6', 'r7'])
    expect(rowIndexOf(el)).toEqual(['3', '4', '5', '6', '7'])
    expect(ariaIndexOf(el)).toEqual(['4', '5', '6', '7', '8'])
    // 二次淘汰：偏移随累计装载数前移（7），分批帧仍同一口径
    appendBlock(el, 8, 4) // 追加 r8..r11 → 淘汰 r3..r6，缓冲 r7..r11（累计装载 12）
    expect(rowsOf(el).length, '二次淘汰仍分批（首帧 chunk 行）').toBe(2)
    expect(keysOf(el), '首帧 = 新缓冲前 chunk 行').toEqual(['r7', 'r8'])
    expect(rowIndexOf(el)).toEqual(['7', '8'])
    flushRafAll()
    expect(rowIndexOf(el)).toEqual(['7', '8', '9', '10', '11'])
    expect(ariaIndexOf(el)).toEqual(['8', '9', '10', '11', '12'])
    expect(new Set(rowIndexOf(el)).size, '无重复行号').toBe(5)
  })
})
