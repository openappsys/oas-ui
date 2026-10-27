import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from '../index.js'
import { createWindowedSource } from './index.js'

function mount(): OASTable {
  const el = new OASTable()
  el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
  el.setAttribute('data', JSON.stringify([]))
  document.body.appendChild(el)
  return el
}

describe('createWindowedSource', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('首屏请求 + oas-window-request 回填 data/window-start/total，覆盖区间不重复拉取', async () => {
    const el = mount()
    const fetchRows = vi.fn(async ({ start, end }: { start: number; end: number; signal: AbortSignal }) => {
      return { rows: Array.from({ length: end - start }, (_, i) => ({ name: `${start + i}` })), total: 100 }
    })
    const source = createWindowedSource(el, { fetchRows, windowSize: 5 })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    expect(fetchRows.mock.calls[0]![0]).toMatchObject({ start: 0, end: 5 })
    expect(el.hasAttribute('windowed')).toBe(true)
    expect(el.getAttribute('window-start')).toBe('0')
    expect(el.getAttribute('total')).toBe('100')
    expect((el.data[0] as { name: string }).name).toBe('0')

    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 10, end: 20 } }))
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2))
    expect(el.getAttribute('window-start')).toBe('10')
    expect((el.data[0] as { name: string }).name).toBe('10')

    // 覆盖区间：不再请求
    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 12, end: 18 } }))
    expect(fetchRows).toHaveBeenCalledTimes(2)

    source.refresh()
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(3))
    source.destroy()
    source.refresh()
    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 30, end: 40 } }))
    expect(fetchRows).toHaveBeenCalledTimes(3)
  })

  it('windowSize 小于视口时，total 到达后按表格视口请求补齐', async () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('height', '200')
    document.body.appendChild(el)
    const fetchRows = vi.fn(async ({ start, end }: { start: number; end: number; signal: AbortSignal }) => ({
      rows: Array.from({ length: end - start }, (_, i) => ({ name: `${start + i}` })),
      total: 100,
    }))
    const source = createWindowedSource(el, { fetchRows, windowSize: 2 })
    await vi.waitFor(() => expect(el.data.length).toBeGreaterThan(2))
    expect(fetchRows.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(el.getAttribute('window-start')).toBe('0')
    expect(el.getAttribute('total')).toBe('100')
    source.destroy()
  })

  it('先挂监听再写 total：接住表格同步 init 请求（视口窗口优先于 windowSize）', async () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('height', '200')
    el.setAttribute('data', JSON.stringify([]))
    document.body.appendChild(el)
    const fetchRows = vi.fn(async ({ start, end }: { start: number; end: number; signal: AbortSignal }) => ({
      rows: Array.from({ length: end - start }, (_, i) => ({ name: `${start + i}` })),
      total: 100,
    }))
    const source = createWindowedSource(el, { fetchRows, total: 100, windowSize: 5 })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalled())
    expect(fetchRows.mock.calls[0]![0].end).toBeGreaterThan(5)
    expect(el.getAttribute('window-start')).toBe('0')
    source.destroy()
  })

  it('未升级元素抛错', () => {
    expect(() => createWindowedSource(document.createElement('div'), { fetchRows: async () => [] })).toThrow(
      /需要已升级的 oas-table/,
    )
  })

  it('部分页自动向后补齐同一窗口（不把缺口误判为已覆盖）', async () => {
    const el = mount()
    const fetchRows = vi.fn(async ({ start, end }: { start: number; end: number; signal: AbortSignal }) => {
      // 模拟服务端单次上限 2 行（请求 5 行只回 2 行）
      return {
        rows: Array.from({ length: Math.min(2, end - start) }, (_, i) => ({ name: `${start + i}` })),
        total: 100,
      }
    })
    const source = createWindowedSource(el, { fetchRows, windowSize: 5 })
    await vi.waitFor(() => expect(el.data).toHaveLength(5))
    expect(el.getAttribute('window-start')).toBe('0')
    expect(el.data.map((row) => (row as { name: string }).name)).toEqual(['0', '1', '2', '3', '4'])
    const calls = fetchRows.mock.calls.length
    // 已连续覆盖 [0,5)：重复请求不再拉取
    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 0, end: 4 } }))
    expect(fetchRows).toHaveBeenCalledTimes(calls)
    source.destroy()
  })

  it('过期请求被中止，不回填旧结果', async () => {
    const el = mount()
    const resolvers: Array<(rows: unknown[]) => void> = []
    const source = createWindowedSource(el, {
      windowSize: 2,
      fetchRows: () =>
        new Promise((resolve) => {
          resolvers.push((rows) => resolve(rows))
        }),
    })
    await vi.waitFor(() => expect(resolvers).toHaveLength(1))
    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 10, end: 12 } }))
    await vi.waitFor(() => expect(resolvers).toHaveLength(2))
    resolvers[1]!([{ name: 'new' }])
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('new'))
    resolvers[0]!([{ name: 'old' }])
    await Promise.resolve()
    expect((el.data[0] as { name: string }).name).toBe('new')
    source.destroy()
  })

  it('过期请求失败不清空新请求的 filling（同区间不重复拉取）', async () => {
    const el = mount()
    let rejectFirst: ((reason?: unknown) => void) | null = null
    const fetchRows = vi.fn(({ start, end, signal }: { start: number; end: number; signal: AbortSignal }) => {
      if (start === 0) {
        return new Promise<never>((_, reject) => {
          rejectFirst = reject
        })
      }
      // 第二笔在途不返回，保证 filling 还在
      return new Promise<never>(() => {})
    })
    const source = createWindowedSource(el, { fetchRows, windowSize: 5 })
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 10, end: 20 } }))
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2))
    rejectFirst!(new Error('stale failure'))
    // 等 then 的拒绝传播到 catch，再发同区间请求；否则会把尚未处理的旧拒绝误判成 filling 仍在
    await Promise.resolve()
    await Promise.resolve()
    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 10, end: 20 } }))
    expect(fetchRows, '过期失败不得触发同区间第三次请求').toHaveBeenCalledTimes(2)
    source.destroy()
  })

  it('请求失败派发 oas-window-error', async () => {
    const el = mount()
    const source = createWindowedSource(el, {
      fetchRows: async () => {
        throw new Error('network')
      },
    })
    const events: CustomEvent[] = []
    const parent = el.parentElement!
    const listener = (event: Event): void => {
      events.push(event as CustomEvent)
    }
    parent.addEventListener('oas-window-error', listener)
    try {
      await vi.waitFor(() => expect(events).toHaveLength(1))
      expect(events[0]!.detail).toMatchObject({ start: 0, end: 50 })
      expect(events[0]!.detail.error).toBeInstanceOf(Error)
      expect(events[0]!.bubbles).toBe(true)
      expect(events[0]!.composed).toBe(true)
    } finally {
      parent.removeEventListener('oas-window-error', listener)
      source.destroy()
    }
  })

  it('宿主外部清空 data 后同窗口请求重新拉取（不依赖内部 loaded 缓存）', async () => {
    const el = mount()
    const fetchRows = vi.fn(async ({ start, end }: { start: number; end: number; signal: AbortSignal }) => ({
      rows: Array.from({ length: end - start }, (_, index) => ({ name: `${start + index}` })),
      total: 100,
    }))
    const source = createWindowedSource(el, { fetchRows, windowSize: 5 })
    await vi.waitFor(() => expect(el.data).toHaveLength(5))
    el.setAttribute('data', '[]')
    await new Promise((resolve) => setTimeout(resolve, 20))
    const before = fetchRows.mock.calls.length
    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 0, end: 5 } }))
    await vi.waitFor(() => expect(fetchRows.mock.calls.length).toBe(before + 1))
    expect(el.data).toHaveLength(5)
    expect(el.getAttribute('window-start')).toBe('0')
    source.destroy()
  })

  it('宿主外部换窗后原视口请求不被旧 loaded 吞掉', async () => {
    const el = mount()
    const fetchRows = vi.fn(async ({ start, end }: { start: number; end: number; signal: AbortSignal }) => ({
      rows: Array.from({ length: end - start }, (_, index) => ({ name: `${start + index}` })),
      total: 100,
    }))
    const source = createWindowedSource(el, { fetchRows, windowSize: 5 })
    await vi.waitFor(() => expect(el.data).toHaveLength(5))
    el.setAttribute('window-start', '10')
    el.setAttribute('data', JSON.stringify(Array.from({ length: 5 }, (_, index) => ({ name: `${10 + index}` }))))
    await new Promise((resolve) => setTimeout(resolve, 20))
    const before = fetchRows.mock.calls.length
    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 0, end: 5 } }))
    await vi.waitFor(() => expect(fetchRows.mock.calls.length).toBe(before + 1))
    expect(fetchRows.mock.calls.at(-1)![0]).toMatchObject({ start: 0, end: 5 })
    expect(el.getAttribute('window-start')).toBe('0')
    expect((el.data[0] as { name: string }).name).toBe('0')
    source.destroy()
  })

  it('fetchRows 同步 throw 派发 oas-window-error，且同窗口可重试', async () => {
    const el = mount()
    let mode: 'ok' | 'throw' = 'ok'
    const fetchRows = vi.fn(({ start, end }: { start: number; end: number; signal: AbortSignal }) => {
      if (mode === 'throw') throw new Error('sync network')
      return Promise.resolve({
        rows: Array.from({ length: end - start }, (_, index) => ({ name: `${start + index}` })),
        total: 100,
      })
    })
    const source = createWindowedSource(el, { fetchRows, windowSize: 5 })
    await vi.waitFor(() => expect(el.data).toHaveLength(5))
    const errors: CustomEvent[] = []
    el.addEventListener('oas-window-error', (event) => errors.push(event as CustomEvent))

    mode = 'throw'
    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 10, end: 15 } }))
    await vi.waitFor(() => expect(errors).toHaveLength(1))
    expect(errors[0]!.detail).toMatchObject({ start: 10, end: 15 })
    expect(errors[0]!.detail.error).toBeInstanceOf(Error)
    expect(fetchRows).toHaveBeenCalledTimes(2)

    mode = 'ok'
    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 10, end: 15 } }))
    await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(3))
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('10'))
    expect(errors).toHaveLength(1)
    source.destroy()
  })

  it('Promise rejection 失败后同窗口可重试', async () => {
    const el = mount()
    let fail = false
    const fetchRows = vi.fn(async ({ start, end }: { start: number; end: number; signal: AbortSignal }) => {
      if (fail) throw new Error('async network')
      return {
        rows: Array.from({ length: end - start }, (_, index) => ({ name: `${start + index}` })),
        total: 100,
      }
    })
    const source = createWindowedSource(el, { fetchRows, windowSize: 5 })
    await vi.waitFor(() => expect(el.data).toHaveLength(5))
    const errors: CustomEvent[] = []
    el.addEventListener('oas-window-error', (event) => errors.push(event as CustomEvent))
    fail = true
    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 10, end: 15 } }))
    await vi.waitFor(() => expect(errors).toHaveLength(1))
    fail = false
    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 10, end: 15 } }))
    await vi.waitFor(() => expect((el.data[0] as { name: string }).name).toBe('10'))
    expect(fetchRows).toHaveBeenCalledTimes(3)
    source.destroy()
  })

  it('在途同窗口只拉一次；destroy 后迟到结果不写回', async () => {
    const el = mount()
    const resolvers: Array<(rows: unknown[]) => void> = []
    const source = createWindowedSource(el, {
      windowSize: 5,
      fetchRows: () =>
        new Promise((resolve) => {
          resolvers.push((rows) => resolve(rows))
        }),
    })
    await vi.waitFor(() => expect(resolvers).toHaveLength(1))
    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 0, end: 5 } }))
    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 1, end: 4 } }))
    expect(resolvers).toHaveLength(1)
    source.destroy()
    resolvers[0]!([{ name: 'late' }])
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(el.data).toEqual([])
  })
})

// ==================== 视觉适配器（visual protocol） ====================

/**
 * 模拟真实宿主视觉适配器：全量 dataTotal 行数据，`expanded` 中的行占两个视觉槽位
 * （数据行 + 行内嵌展开内容行）。getGeometry 返回当前快照（visual-start=切片首行视觉号，
 * visual-total=全量视觉行数）；getDataRange 把视觉区间映射回相交的数据行区间。
 * 状态全部挂在返回对象上（方法经 `this` 读取）：测试可在请求与响应之间改变布局
 * （extraBefore / expanded）或注入非法行为（mode）。
 */
function makeVisualLayout(dataTotal = 200, expanded: number[] = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]) {
  return {
    dataTotal,
    expanded,
    /** 模拟「请求与响应之间宿主改变布局」：切片前多出 extraBefore 个展开槽位（视觉坐标整体 +1） */
    extraBefore: 0,
    /** 测试注入：'invalid' 返回非法快照/映射，'throw' 同步抛错（geometry=快照通道，range=映射通道） */
    geometryMode: 'ok' as 'ok' | 'invalid' | 'throw',
    rangeMode: 'ok' as 'ok' | 'invalid' | 'throw',
    getGeometryCalls: [] as number[],
    getDataRangeCalls: [] as Array<[number, number]>,
    getGeometry(dataStart: number): { start: number; total: number } {
      this.getGeometryCalls.push(dataStart)
      if (this.geometryMode === 'throw') throw new Error('geometry boom')
      if (this.geometryMode === 'invalid') return { start: -1, total: 0 }
      const es = this.expanded
      const slotOf = (i: number): number => i + es.filter((e) => e < i).length
      return { start: slotOf(dataStart) + this.extraBefore, total: this.dataTotal + es.length + this.extraBefore }
    },
    getDataRange(visualStart: number, visualEnd: number): { start: number; end: number } {
      this.getDataRangeCalls.push([visualStart, visualEnd])
      if (this.rangeMode === 'throw') throw new Error('map boom')
      if (this.rangeMode === 'invalid') return { start: Number.NaN, end: 20 }
      const es = this.expanded
      const slotOf = (i: number): number => i + es.filter((e) => e < i).length
      let lo = Infinity
      let hi = -Infinity
      for (let i = 0; i < this.dataTotal; i++) {
        const s = slotOf(i) + this.extraBefore
        const len = es.includes(i) ? 2 : 1
        if (s + len <= visualStart || s >= visualEnd) continue
        if (i < lo) lo = i
        if (i + 1 > hi) hi = i + 1
      }
      return { start: lo, end: hi }
    },
  }
}

type VisualLayout = ReturnType<typeof makeVisualLayout>

/** 视觉适配器用表格：height 可测视口（init 请求走表格视口窗口） */
function mountVisual(columns: Array<{ key: string; title: string }> = [{ key: 'name', title: '名称' }]): OASTable {
  const el = new OASTable()
  el.setAttribute('columns', JSON.stringify(columns))
  el.setAttribute('data', '[]')
  el.setAttribute('height', '200')
  el.setAttribute('row-height', '40')
  el.setAttribute('row-key', 'name')
  document.body.appendChild(el)
  return el
}

/** 视觉取数桩：按请求区间造行（name=行N），total 固定 */
function stubFetch(total: number) {
  return async ({ start, end }: { start: number; end: number }) => ({
    rows: Array.from({ length: end - start }, (_, k) => ({ name: `行${start + k}` })),
    total,
  })
}

describe('createWindowedSource × 视觉适配器', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('初始化齐写 visual 属性先于首拉；首拉按视觉区间映射数据坐标；回填重新求值 geometry', async () => {
    const el = mountVisual()
    const layout = makeVisualLayout()
    const events: Array<{ start: number; end: number; visualStart?: number; visualEnd?: number }> = []
    el.addEventListener('oas-window-request', (e) => events.push((e as CustomEvent).detail))
    const fetchRows = vi.fn(async ({ start, end }: { start: number; end: number }) => ({
      rows: Array.from({ length: end - start }, (_, k) => ({ name: `行${start + k}` })),
      total: 200,
    }))
    const source = createWindowedSource(el, { fetchRows, total: 200, windowSize: 5, visual: layout })
    try {
      await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
      // 初始化：visual 属性齐写（geometry 快照 = dataStart 0）
      expect(el.getAttribute('visual-start')).toBe('0')
      expect(el.getAttribute('visual-total')).toBe('210')
      // 首拉请求携带视觉字段（协议在请求派发前已生效）→ getDataRange 用事件视觉区间映射
      expect(events[0]!.visualStart).toBe(0)
      expect(events[0]!.visualEnd).toBeGreaterThan(0)
      expect(layout.getDataRangeCalls[0]).toEqual([events[0]!.visualStart, events[0]!.visualEnd])
      // fetchRows 收到映射后的数据坐标（行0 占双槽位：视觉 [0,9) 相交的数据行 = [0,8)）
      expect(fetchRows.mock.calls[0]![0]).toMatchObject({ start: 0, end: 8 })
      // 回填重新求值 geometry：init 一次 + 响应回填一次（同一 dataStart）
      expect(layout.getGeometryCalls).toEqual([0, 0])
      // 回填齐写：window-start + visual-start + data（同一快照）+ total + visual-total
      expect(el.getAttribute('window-start')).toBe('0')
      expect(el.getAttribute('visual-start')).toBe('0')
      expect(el.getAttribute('visual-total')).toBe('210')
      expect(el.getAttribute('total')).toBe('200')
      expect(el.data).toHaveLength(8)
      // 回声：回写后不自拉取
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(fetchRows).toHaveBeenCalledTimes(1)
    } finally {
      source.destroy()
    }
  })

  it('请求与响应之间宿主改变展开布局：回填使用响应时最新 geometry（非请求时旧快照）', async () => {
    const el = mountVisual()
    const layout = makeVisualLayout()
    let resolveFetch: (() => void) | null = null
    const fetchRows = vi.fn(
      ({ start, end }: { start: number; end: number }) =>
        new Promise<{ rows: unknown[]; total: number }>((resolve) => {
          resolveFetch = () =>
            resolve({ rows: Array.from({ length: end - start }, (_, k) => ({ name: `行${start + k}` })), total: 200 })
        }),
    )
    const source = createWindowedSource(el, { fetchRows, total: 200, windowSize: 5, visual: layout })
    try {
      await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(1))
      const geometryCallsAtRequest = layout.getGeometryCalls.length
      // 请求在途时宿主改变展开布局（切片前多一个展开槽位 → 视觉坐标整体 +1）
      layout.extraBefore = 1
      resolveFetch!()
      await vi.waitFor(() => expect(el.data).toHaveLength(8))
      // 回填重新求值：visual 属性反映最新快照（不是请求时旧值）
      expect(layout.getGeometryCalls.length).toBeGreaterThan(geometryCallsAtRequest)
      expect(el.getAttribute('visual-start')).toBe('1')
      expect(el.getAttribute('visual-total')).toBe('211')
    } finally {
      source.destroy()
    }
  })

  it('回声抑制：source 自写视觉属性不触发自拉取；后续真实视口请求仍可达', async () => {
    const el = mountVisual()
    const layout = makeVisualLayout()
    const fetchRows = vi.fn(async ({ start, end }: { start: number; end: number }) => ({
      rows: Array.from({ length: end - start }, (_, k) => ({ name: `行${start + k}` })),
      total: 200,
    }))
    const source = createWindowedSource(el, { fetchRows, total: 200, windowSize: 5, visual: layout })
    try {
      await vi.waitFor(() => expect(el.data).toHaveLength(8))
      const before = fetchRows.mock.calls.length
      await new Promise((resolve) => setTimeout(resolve, 30))
      expect(fetchRows, '回写视觉属性/数据/total 不自拉取').toHaveBeenCalledTimes(before)
      // 后续真实视口请求（未装载区间）仍可达且按映射取数
      el.dispatchEvent(
        new CustomEvent('oas-window-request', { detail: { start: 30, end: 40, visualStart: 33, visualEnd: 43 } }),
      )
      await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(before + 1))
      expect(layout.getDataRangeCalls.at(-1)).toEqual([33, 43])
      // 映射：视觉 [33,43) 相交数据行 30..38（行39 属主槽位 43 恰在窗口外）→ 数据 [30,39)
      expect(fetchRows.mock.calls.at(-1)![0]).toMatchObject({ start: 30, end: 39 })
    } finally {
      source.destroy()
    }
  })

  it('getDataRange 映射非法：不 fetch、不残留 filling、一次 oas-window-error（含视觉与原始数据区间）、修正后可重试', async () => {
    const el = mountVisual()
    const layout = makeVisualLayout()
    const fetchRows = vi.fn(async ({ start, end }: { start: number; end: number }) => ({
      rows: Array.from({ length: end - start }, (_, k) => ({ name: `行${start + k}` })),
      total: 200,
    }))
    const source = createWindowedSource(el, { fetchRows, total: 200, windowSize: 5, visual: layout })
    const errors: CustomEvent[] = []
    el.addEventListener('oas-window-error', (e) => errors.push(e as CustomEvent))
    try {
      await vi.waitFor(() => expect(el.data).toHaveLength(8))
      const before = fetchRows.mock.calls.length
      layout.rangeMode = 'invalid'
      el.dispatchEvent(
        new CustomEvent('oas-window-request', { detail: { start: 30, end: 40, visualStart: 33, visualEnd: 43 } }),
      )
      expect(fetchRows, '映射非法不 fetch').toHaveBeenCalledTimes(before)
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(errors).toHaveLength(1)
      expect(errors[0]!.detail).toMatchObject({ start: 30, end: 40, visualStart: 33, visualEnd: 43 })
      expect(errors[0]!.detail.error).toBeInstanceOf(Error)
      expect(errors[0]!.bubbles).toBe(true)
      expect(errors[0]!.composed).toBe(true)
      // 不残留 filling：修正映射后同一窗口可重试
      layout.rangeMode = 'ok'
      el.dispatchEvent(
        new CustomEvent('oas-window-request', { detail: { start: 30, end: 40, visualStart: 33, visualEnd: 43 } }),
      )
      await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(before + 1))
      expect(errors).toHaveLength(1)
    } finally {
      source.destroy()
    }
  })

  it('getDataRange 同步 throw 走同一失败路径：一次 error、修正后可重试', async () => {
    const el = mountVisual()
    const layout = makeVisualLayout()
    const fetchRows = vi.fn(async ({ start, end }: { start: number; end: number }) => ({
      rows: Array.from({ length: end - start }, (_, k) => ({ name: `行${start + k}` })),
      total: 200,
    }))
    const source = createWindowedSource(el, { fetchRows, total: 200, windowSize: 5, visual: layout })
    const errors: CustomEvent[] = []
    el.addEventListener('oas-window-error', (e) => errors.push(e as CustomEvent))
    try {
      await vi.waitFor(() => expect(el.data).toHaveLength(8))
      const before = fetchRows.mock.calls.length
      layout.rangeMode = 'throw'
      el.dispatchEvent(
        new CustomEvent('oas-window-request', { detail: { start: 30, end: 40, visualStart: 33, visualEnd: 43 } }),
      )
      await vi.waitFor(() => expect(errors).toHaveLength(1))
      expect(fetchRows).toHaveBeenCalledTimes(before)
      layout.rangeMode = 'ok'
      el.dispatchEvent(
        new CustomEvent('oas-window-request', { detail: { start: 30, end: 40, visualStart: 33, visualEnd: 43 } }),
      )
      await vi.waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(before + 1))
    } finally {
      source.destroy()
    }
  })

  it.each([
    ['start 非有限', { start: Number.NaN, total: 210 }],
    ['total 非有限', { start: 0, total: Number.POSITIVE_INFINITY }],
    ['start < 0', { start: -1, total: 210 }],
    ['total <= 0', { start: 0, total: 0 }],
    ['start > total', { start: 211, total: 210 }],
    ['total < 数据 total', { start: 0, total: 199 }],
  ])('回填 geometry 非法（%s）：不写错误视觉属性（陈旧属性移除）、一次 error、修正后重试恢复', async (_label, bad) => {
    const el = mountVisual()
    const layout = makeVisualLayout()
    // adapter 委托 layout，但 getGeometry 快照可切换（初始化合法 → 回填非法 → 修正恢复）
    let geometry: { start: number; total: number } = { start: 0, total: 210 }
    const adapter = {
      getGeometry(dataStart: number): { start: number; total: number } {
        layout.getGeometryCalls.push(dataStart)
        return geometry
      },
      getDataRange: (...args: Parameters<VisualLayout['getDataRange']>) => layout.getDataRange(...args),
    }
    const fetchRows = vi.fn(stubFetch(200))
    const source = createWindowedSource(el, { fetchRows, total: 200, windowSize: 5, visual: adapter })
    const errors: CustomEvent[] = []
    el.addEventListener('oas-window-error', (e) => errors.push(e as CustomEvent))
    try {
      await vi.waitFor(() => expect(el.data).toHaveLength(8))
      expect(el.getAttribute('visual-total')).toBe('210')
      // 下一笔回填 geometry 变非法：数据照常回填，视觉属性不写错误值（陈旧值移除）
      geometry = bad
      el.dispatchEvent(
        new CustomEvent('oas-window-request', { detail: { start: 30, end: 39, visualStart: 33, visualEnd: 43 } }),
      )
      await vi.waitFor(() => expect(errors).toHaveLength(1))
      expect(el.getAttribute('window-start')).toBe('30')
      expect(el.data).toHaveLength(9)
      expect(el.hasAttribute('visual-start'), '不写错误 visual-start（陈旧属性移除）').toBe(false)
      expect(el.hasAttribute('visual-total'), '不写错误 visual-total（陈旧属性移除）').toBe(false)
      expect(errors[0]!.detail.error).toBeInstanceOf(Error)
      // 修正后重试：refresh 重拉同窗口，geometry 恢复合法 → 视觉属性齐写、协议重新生效
      //（refresh 回填后表格还会按视口 scrollTop=0 重派请求并重拉 [0,8)——真实视口数据需求，属正常链路）
      geometry = { start: 30, total: 210 }
      source.refresh()
      await vi.waitFor(() => expect(el.getAttribute('visual-total')).toBe('210'))
      expect(el.getAttribute('visual-start')).toBe('30')
      expect(errors, '修正后重试不再派发 error').toHaveLength(1)
      await new Promise((resolve) => setTimeout(resolve, 30))
      expect(el.getAttribute('visual-total'), '重试后协议保持生效').toBe('210')
    } finally {
      source.destroy()
    }
  })

  it('回填 geometry 抛错：数据照常回填、视觉属性移除、一次 error', async () => {
    const el = mountVisual()
    const layout = makeVisualLayout()
    const fetchRows = vi.fn(async ({ start, end }: { start: number; end: number }) => ({
      rows: Array.from({ length: end - start }, (_, k) => ({ name: `行${start + k}` })),
      total: 200,
    }))
    const source = createWindowedSource(el, { fetchRows, total: 200, windowSize: 5, visual: layout })
    const errors: CustomEvent[] = []
    el.addEventListener('oas-window-error', (e) => errors.push(e as CustomEvent))
    try {
      await vi.waitFor(() => expect(el.data).toHaveLength(8))
      layout.geometryMode = 'throw'
      el.dispatchEvent(
        new CustomEvent('oas-window-request', { detail: { start: 30, end: 39, visualStart: 33, visualEnd: 43 } }),
      )
      await vi.waitFor(() => expect(errors).toHaveLength(1))
      expect(el.getAttribute('window-start')).toBe('30')
      expect(el.data).toHaveLength(9)
      expect(el.hasAttribute('visual-start')).toBe(false)
      expect(el.hasAttribute('visual-total')).toBe(false)
    } finally {
      source.destroy()
    }
  })

  it('初始 geometry 非法或抛错：抛给调用方且不留半初始化状态（无属性、无监听）', () => {
    const invalids: Array<{ start: number; total: number }> = [
      { start: Number.NaN, total: 210 },
      { start: 0, total: Number.NaN },
      { start: -1, total: 210 },
      { start: 0, total: 0 },
      { start: 211, total: 210 },
      { start: 0, total: 199 }, // total < 数据 total（options.total=200）
    ]
    for (const bad of invalids) {
      const el = mountVisual()
      const fetchRows = vi.fn(async () => [])
      expect(() =>
        createWindowedSource(el, {
          fetchRows,
          total: 200,
          visual: { getGeometry: () => bad, getDataRange: () => ({ start: 0, end: 1 }) },
        }),
      ).toThrow(/visual\.getGeometry/)
      expect(el.hasAttribute('windowed'), `非法 ${JSON.stringify(bad)} 不写 windowed`).toBe(false)
      expect(el.hasAttribute('visual-start')).toBe(false)
      expect(el.hasAttribute('visual-total')).toBe(false)
      expect(el.getAttribute('total')).toBe(null)
      // 监听未挂：请求不触发拉取
      el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 0, end: 5 } }))
      expect(fetchRows).not.toHaveBeenCalled()
    }
    // adapter 同步 throw 同样抛给调用方、零副作用
    const el = mountVisual()
    expect(() =>
      createWindowedSource(el, {
        fetchRows: async () => [],
        total: 200,
        visual: {
          getGeometry: () => {
            throw new Error('boom')
          },
          getDataRange: () => ({ start: 0, end: 1 }),
        },
      }),
    ).toThrow('boom')
    expect(el.hasAttribute('windowed')).toBe(false)
  })

  it('宿主外部清空 data / 改 visual-start 后同窗口可重拉，回填视觉属性以 adapter 快照为准', async () => {
    // 无 height：表格不派发视口请求（非虚拟），fallback 首拉 + 手动同窗口请求 → 纯 source 契约
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('data', '[]')
    el.setAttribute('row-key', 'name')
    document.body.appendChild(el)
    const layout = makeVisualLayout()
    const fetchRows = vi.fn(async ({ start, end }: { start: number; end: number }) => ({
      rows: Array.from({ length: end - start }, (_, k) => ({ name: `行${start + k}` })),
      total: 200,
    }))
    const source = createWindowedSource(el, { fetchRows, total: 200, windowSize: 5, visual: layout })
    try {
      // fallback 首拉（无视觉字段 → 数据坐标直通）[0,5)
      await vi.waitFor(() => expect(el.data).toHaveLength(5))
      // 外部清空 data + 手改 visual-start：同窗口（映射后未覆盖的）请求重新拉取
      el.setAttribute('data', '[]')
      el.setAttribute('visual-start', '3')
      await new Promise((resolve) => setTimeout(resolve, 20))
      const before = fetchRows.mock.calls.length
      // 视觉 [6,12) 映射 = 数据 [5,10)（行5..9；行0 双槽位把视觉起点推到 6）→ loaded [0,0) 未覆盖 → 重拉
      el.dispatchEvent(
        new CustomEvent('oas-window-request', { detail: { start: 0, end: 5, visualStart: 6, visualEnd: 12 } }),
      )
      await vi.waitFor(() => expect(fetchRows.mock.calls.length).toBe(before + 1))
      // 视觉 [6,12) 映射 = 数据 [5,11)（行10 的双槽位 [11,13) 仍与窗口相交）
      expect(fetchRows.mock.calls.at(-1)![0]).toMatchObject({ start: 5, end: 11 })
      expect(el.data).toHaveLength(6)
      expect(el.getAttribute('window-start')).toBe('5')
      // 回填视觉属性以 adapter 当前快照为准（dataStart=5 → visual-start=6，覆盖宿主手改的 3）
      expect(el.getAttribute('visual-start')).toBe('6')
      expect(el.getAttribute('visual-total')).toBe('210')
    } finally {
      source.destroy()
    }
  })

  it('destroy 后迟到结果不写数据也不写视觉属性', async () => {
    const el = mountVisual()
    const layout = makeVisualLayout()
    const resolvers: Array<() => void> = []
    const source = createWindowedSource(el, {
      windowSize: 5,
      total: 200,
      visual: layout,
      fetchRows: ({ start, end }: { start: number; end: number }) =>
        new Promise((resolve) => {
          resolvers.push(() =>
            resolve({ rows: Array.from({ length: end - start }, (_, k) => ({ name: `行${start + k}` })), total: 200 }),
          )
        }),
    })
    await vi.waitFor(() => expect(resolvers).toHaveLength(1))
    source.destroy()
    resolvers[0]!()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(el.data).toEqual([])
    expect(el.hasAttribute('window-start')).toBe(false)
    expect(el.getAttribute('visual-start')).toBe('0')
    expect(el.getAttribute('visual-total')).toBe('210')
  })

  it('未提供 visual：不写任何视觉属性，既有行为逐值不变', async () => {
    const el = mountVisual()
    const fetchRows = vi.fn(async ({ start, end }: { start: number; end: number }) => ({
      rows: Array.from({ length: end - start }, (_, k) => ({ name: `行${start + k}` })),
      total: 200,
    }))
    const source = createWindowedSource(el, { fetchRows, windowSize: 5 })
    try {
      await vi.waitFor(() => expect(el.data).toHaveLength(17))
      expect(el.hasAttribute('visual-start')).toBe(false)
      expect(el.hasAttribute('visual-total')).toBe(false)
      // 既有行为：fallback 首拉 windowSize 窗口 → total 落位后表格补发视口 init 请求（事件 start/end 直通）
      expect(fetchRows.mock.calls[0]![0]).toMatchObject({ start: 0, end: 5 })
      expect(fetchRows.mock.calls.at(-1)![0]).toMatchObject({ start: 0, end: 17 })
    } finally {
      source.destroy()
    }
  })

  it('协议下宿主回写 expanded/visual-start/data：焦点仍在同一 row-key，ARIA/displaySnapshot 数据口径不变', async () => {
    const el = mountVisual()
    const layout = makeVisualLayout(1000, [])
    const fetchRows = vi.fn(async ({ start, end }: { start: number; end: number }) => ({
      rows: Array.from({ length: end - start }, (_, k) => ({ name: `行${start + k}` })),
      total: 1000,
    }))
    const source = createWindowedSource(el, { fetchRows, total: 1000, windowSize: 5, visual: layout })
    try {
      await vi.waitFor(() => expect(el.data).toHaveLength(9))
      el.setAttribute('grid-navigation', '')
      const tdOf = (key: string): HTMLElement =>
        el.shadowRoot!.querySelector<HTMLElement>(`tr[data-key="${key}"] td[data-col="name"]`)!
      tdOf('行3').focus()
      expect(el.shadowRoot!.activeElement).toBe(tdOf('行3'))
      // 宿主单源控制展开：改 adapter 布局 + 回写 expanded → source.refresh 重拉回填（data/visual-start 重写）
      layout.expanded = [2]
      el.setAttribute('expanded', '行2')
      source.refresh()
      await vi.waitFor(() => expect(el.getAttribute('visual-total')).toBe('1001'))
      const restored = el.shadowRoot!.activeElement as HTMLElement | null
      expect(restored, '回填后焦点应恢复').toBeTruthy()
      expect(restored!.closest('tr')!.getAttribute('data-key'), '焦点回锚同一 row-key').toBe('行3')
      expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'), 'ARIA 仍为数据 total').toBe('1000')
      const snapshot = (
        el as unknown as { getDisplaySnapshot(): { rowIndexByKey: Map<string, number> } }
      ).getDisplaySnapshot()
      expect(snapshot!.rowIndexByKey.get('行3'), 'displaySnapshot 仍解析绝对数据行号').toBe(3)
    } finally {
      source.destroy()
    }
  })
})
