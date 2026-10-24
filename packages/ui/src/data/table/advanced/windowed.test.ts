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

  it('请求失败派发 oas-window-error', async () => {
    const el = mount()
    const source = createWindowedSource(el, {
      fetchRows: async () => {
        throw new Error('network')
      },
    })
    const events: unknown[] = []
    el.addEventListener('oas-window-error', (event) => events.push((event as CustomEvent).detail))
    await vi.waitFor(() => expect(events).toHaveLength(1))
    source.destroy()
  })
})
