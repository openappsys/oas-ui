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
})
