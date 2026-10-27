import { beforeEach, describe, expect, it } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from '../index.js'
import '../edit/index.js'
import { enableRangeSelection } from './index.js'

interface RangeOptions {
  enabled: boolean
}

function mount(editable = false): OASTable {
  const el = new OASTable()
  el.setAttribute(
    'columns',
    JSON.stringify([
      { key: 'name', title: '名称', editable },
      { key: 'age', title: '年龄' },
    ]),
  )
  if (editable) el.setAttribute('editable', '')
  el.setAttribute(
    'data',
    JSON.stringify([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
    ]),
  )
  document.body.appendChild(el)
  return el
}

function cell(el: OASTable, row: number, col: string): HTMLElement {
  const tr = [...el.shadowRoot!.querySelectorAll('tr.row')][row]!
  return [...tr.querySelectorAll<HTMLElement>('td[data-col]')].find((td) => td.getAttribute('data-col') === col)!
}

/** 只改 live capability options 再 requestUpdate：走 hostUpdated 装饰/清理，不重建 DOM */
function setRangeEnabledWithoutRender(el: OASTable, enabled: boolean): void {
  const host = el as unknown as {
    getCapabilityOptions<T>(name: string): T | undefined
    requestUpdate(): void
  }
  const current = host.getCapabilityOptions<RangeOptions>('range')
  if (!current) throw new Error('range 能力未启用')
  current.enabled = enabled
  host.requestUpdate()
}

describe('table/range tabindex 原值与所有权', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('无重渲染禁用时不覆盖 range 拥有期间外部写入的新 tabindex', () => {
    const el = mount()
    enableRangeSelection(el)
    const td = cell(el, 0, 'name')
    const row = el.shadowRoot!.querySelectorAll('tr.row')[0]!
    expect(td.getAttribute('tabindex')).toBe('0')

    // range 拥有期间外部能力把焦点格改成自定义停靠值
    td.setAttribute('tabindex', '5')
    setRangeEnabledWithoutRender(el, false)

    // 必须保留外部值（旧实现回写陈旧原值 null → 属性被移除）
    expect(td.getAttribute('tabindex')).toBe('5')
    expect(td.isConnected).toBe(true)
    expect(el.shadowRoot!.querySelectorAll('tr.row')[0]).toBe(row)

    // 条目已删除：再次启用时把外部值当作新原值，再禁用应还原到 5
    setRangeEnabledWithoutRender(el, true)
    expect(td.getAttribute('tabindex')).toBe('0')
    setRangeEnabledWithoutRender(el, false)
    expect(td.getAttribute('tabindex')).toBe('5')
    el.remove()
  })

  it('公共禁用恢复普通 td 无 tabindex、editable td 原 tabindex=0', () => {
    const el = mount(true)
    const editableBefore = cell(el, 0, 'name')
    const plainBefore = cell(el, 0, 'age')
    expect(editableBefore.getAttribute('tabindex')).toBe('0')
    expect(plainBefore.getAttribute('tabindex')).toBeNull()

    enableRangeSelection(el)
    enableRangeSelection(el, false)

    const editableAfter = cell(el, 0, 'name')
    const plainAfter = cell(el, 0, 'age')
    expect(editableAfter.getAttribute('tabindex')).toBe('0')
    expect(plainAfter.getAttribute('tabindex')).toBeNull()
    el.remove()
  })

  it('grid-navigation 接管后不留下 range 旧原值回写，且无额外 Tab 停靠点', () => {
    const el = mount()
    enableRangeSelection(el)
    el.setAttribute('grid-navigation', '')

    const container = el.shadowRoot!.querySelector<HTMLElement>('.table-scroll')!
    expect(container.getAttribute('tabindex')).toBe('0')
    expect(cell(el, 0, 'name').getAttribute('tabindex')).toBe('-1')

    // 接管期间关掉 range：不得回写旧原值（普通 td 原本无 tabindex → 会摘掉网格给的 -1）
    setRangeEnabledWithoutRender(el, false)
    expect(cell(el, 0, 'name').getAttribute('tabindex')).toBe('-1')
    const stops = [...el.shadowRoot!.querySelectorAll<HTMLElement>('td[data-col]')].filter((td) => td.tabIndex === 0)
    expect(stops).toHaveLength(0)
    expect(container.getAttribute('tabindex')).toBe('0')
    el.remove()
  })
})
