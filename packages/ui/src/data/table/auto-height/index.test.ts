import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from '../index.js'
// 本文件独立模块注册表（vitest 按文件隔离）：import 即注册真实 auto-height 能力
import './index.js'

/**
 * auto-height L3 控制器单测（happy-dom：ResizeObserver 为 noop stub——观测不回调，
 * 但 afterRender 的收缩探针放行逻辑真实执行，可确定性断言游标跨渲染持续轮转）。
 */

function mountVirtual(attrs: Record<string, string>): { el: OASTable; wrap: HTMLElement } {
  const el = new OASTable()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
  return { el, wrap }
}

const flushRaf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

describe('auto-height L3 控制器（收缩探针轮转）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })
  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('探针游标跨渲染持续：首渲染放行 rows[0]，滚动帧后放行 rows[1]（不重置回首行）', async () => {
    const { el, wrap } = mountVirtual({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ name: `行${i}` }))),
    })
    const stamped = () => [...el.shadowRoot!.querySelectorAll<HTMLElement>('tbody tr[data-oas-display-idx]')]
    // 首渲染：探针放行 cursor=0 → rows[0] 内联高被清空（游标 → 1）
    await flushRaf()
    const first = stamped()
    expect(first.length).toBeGreaterThan(2)
    expect(first[0]!.style.height, '首渲染放行 rows[0]').toBe('')
    expect(first[1]!.style.height, 'rows[1] 未被放行').not.toBe('')
    // 滚动触发滚动帧重建：若游标被重置回 0 则仍放行 rows[0]；持续轮转应放行 rows[1]
    wrap.scrollTop = 40
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const second = stamped()
    expect(second[1]!.style.height, '滚动帧后放行 rows[1]（游标跨渲染持续）').toBe('')
    expect(second[0]!.style.height, 'rows[0] 已被新渲染恢复定高').not.toBe('')
  })
})
