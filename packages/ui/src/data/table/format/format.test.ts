import { beforeEach, describe, expect, it } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from '../index.js'
import '../edit/index.js'
import { getConditionalFormat, setConditionalFormat } from './index.js'
import type { ConditionalRule } from '../advanced/conditional.js'

function mount(): OASTable {
  const el = new OASTable()
  el.setAttribute(
    'columns',
    JSON.stringify([
      { key: 'name', title: '名称' },
      { key: 'amount', title: '金额' },
    ]),
  )
  el.setAttribute(
    'data',
    JSON.stringify([
      { name: 'A', amount: 30 },
      { name: 'B', amount: 5 },
    ]),
  )
  document.body.appendChild(el)
  return el
}

function cell(el: OASTable, row: number, key: string): HTMLElement {
  return [...el.shadowRoot!.querySelectorAll('tr.row')][row]!.querySelector<HTMLElement>(`[data-col="${key}"]`)!
}

describe('table/format 条件格式能力', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('按规则给单元格上色并追加 class，改规则后重刷', () => {
    const el = mount()
    const rules: ConditionalRule[] = [
      { field: 'amount', op: 'gte', value: 10, style: { color: 'rgb(185, 28, 28)', className: 'danger' } },
    ]
    setConditionalFormat(el, rules)
    expect(getConditionalFormat(el)).toEqual(rules)
    expect(cell(el, 0, 'amount').style.color).toBe('rgb(185, 28, 28)')
    expect(cell(el, 0, 'amount').classList.contains('danger')).toBe(true)
    expect(cell(el, 1, 'amount').style.color).toBe('')

    setConditionalFormat(el, [
      { field: 'amount', op: 'lt', value: 10, style: { backgroundColor: 'rgb(254, 243, 199)' } },
    ])
    expect(cell(el, 1, 'amount').style.backgroundColor).toBe('rgb(254, 243, 199)')
    expect(cell(el, 0, 'amount').style.backgroundColor).toBe('')
  })

  it('applyTo=row 装饰整行；与 edit 装饰链共存', () => {
    const el = new OASTable()
    el.setAttribute('editable', '')
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称', editable: true }]))
    el.setAttribute('data', JSON.stringify([{ name: 'A' }]))
    document.body.appendChild(el)
    setConditionalFormat(el, [
      { field: 'name', op: 'eq', value: 'A', applyTo: 'row', style: { backgroundColor: 'rgb(238, 238, 238)' } },
    ])
    const row = el.shadowRoot!.querySelector<HTMLElement>('tr.row')!
    const td = row.querySelector<HTMLElement>('[data-col="name"]')!
    expect(row.style.backgroundColor).toBe('rgb(238, 238, 238)')
    expect(td.classList.contains('editable-cell')).toBe(true)
  })

  it('非法 when 规则跳过，不影响其他规则', () => {
    const el = mount()
    setConditionalFormat(el, [
      { when: 'amount +', style: { color: 'red' } },
      { field: 'amount', op: 'gte', value: 10, style: { color: 'rgb(0, 128, 0)' } },
    ])
    expect(cell(el, 0, 'amount').style.color).toBe('rgb(0, 128, 0)')
  })
})
