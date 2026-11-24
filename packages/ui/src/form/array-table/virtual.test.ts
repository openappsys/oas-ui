import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { OASArrayTable } from './index.js'
import { OASForm } from '../form/index.js'
import '../input/index.js'

const COLUMNS = [
  { key: 'nick', label: '昵称' },
  { key: 'age', label: '年龄', width: 80 },
]

const TEMPLATE = `
  <oas-form-item label="昵称" data-schema-key="field:users.[].nick">
    <oas-input name="nick"></oas-input>
  </oas-form-item>
  <oas-form-item label="年龄" data-schema-key="field:users.[].age">
    <oas-input name="age"></oas-input>
  </oas-form-item>
`

function makeTable(
  attrs: Record<string, string> = { name: 'users', rows: '2' },
  templateHTML = TEMPLATE,
): { form: OASForm; table: OASArrayTable } {
  const form = new OASForm()
  const table = new OASArrayTable()
  for (const [k, v] of Object.entries(attrs)) table.setAttribute(k, v)
  table.setAttribute('columns', JSON.stringify(COLUMNS))
  if (templateHTML !== '') {
    const tpl = document.createElement('template')
    tpl.innerHTML = templateHTML
    table.appendChild(tpl)
  }
  form.appendChild(table)
  document.body.appendChild(form)
  return { form, table }
}

function rows(table: OASArrayTable): HTMLElement[] {
  return [...table.querySelectorAll<HTMLElement>('[data-oas-form-list-item]')]
}

function frames(table: OASArrayTable): HTMLElement[] {
  return [...table.shadowRoot!.querySelectorAll<HTMLElement>('.row-frame')]
}

function scroller(table: OASArrayTable): HTMLElement {
  return table.shadowRoot!.querySelector<HTMLElement>('.rows')!
}

function spacerHeight(table: OASArrayTable, which: 'top' | 'bottom'): number {
  const node = table.shadowRoot!.querySelector<HTMLElement>(`[data-vspacer="${which}"]`)
  return node ? Number(parseFloat(node.style.height)) : Number.NaN
}

describe('OASArrayTable 虚拟滚动（virtual，v2.6.9 批 A）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** 大表挂载（轻量模板：oas-input 单列） */
  function makeBig(count: number, attrs: Record<string, string> = {}): OASArrayTable {
    return makeTable(
      { name: 'users', rows: String(count), ...attrs },
      '<oas-form-item label="昵称" data-schema-key="field:users.[].nick"><oas-input name="nick"></oas-input></oas-form-item>',
    ).table
  }

  it('缺省关（零漂移）：无 spacer、无滚动类、帧数=行数（全量帧）', () => {
    const table = makeBig(5)
    expect(table.shadowRoot!.querySelectorAll('[data-vspacer]').length).toBe(0)
    expect(frames(table).length).toBe(5)
    expect(scroller(table).classList.contains('vscroll')).toBe(false)
    expect(rows(table).length).toBe(5)
  })

  it('virtual 开启：aria-rowcount 保持总量、行数快照不窗口化', () => {
    const table = makeBig(500, { virtual: '', 'viewport-height': '320' })
    const grid = table.shadowRoot!.querySelector<HTMLElement>('[role="table"]')!
    expect(grid.getAttribute('aria-rowcount')).toBe('501')
    expect(table.rowCount).toBe(500)
    expect(rows(table).length).toBe(500)
    expect(frames(table).length).toBeLessThanOrEqual(24)
  }, 30000)

  it('1000 行性能冒烟：shadow 帧节点有界、light DOM 行齐全', () => {
    const table = makeBig(1000, { virtual: '', 'viewport-height': '320' })
    expect(frames(table).length).toBeLessThan(50)
    expect(rows(table).length).toBe(1000)
    expect(table.querySelectorAll('oas-input').length).toBe(1000)
  }, 30000)

  it('窗口外字段仍索引化：users.999.nick 在场（name 重编号覆盖全量行）', () => {
    const table = makeBig(1000, { virtual: '', 'viewport-height': '320' })
    expect(rows(table)[999]!.querySelector('oas-input')!.getAttribute('name')).toBe('users.999.nick')
  }, 30000)

  it('滚动重算：scrollTop 变化 → 帧窗口平移、spacer 更新', () => {
    const table = makeBig(200, {
      virtual: '',
      'viewport-height': '320',
      'estimated-row-height': '50',
    })
    expect(spacerHeight(table, 'top')).toBe(0)
    const sc = scroller(table)
    sc.scrollTop = 2000
    sc.dispatchEvent(new Event('scroll'))
    // 2000/50 → 首可见行 40，start = 35 → top spacer = 1750
    expect(spacerHeight(table, 'top')).toBe(1750)
    expect(Number(frames(table)[0]!.dataset.rowIndex)).toBe(35)
    sc.scrollTop = 0
    sc.dispatchEvent(new Event('scroll'))
    expect(spacerHeight(table, 'top')).toBe(0)
  })

  it('行操作在虚拟态可用：删除第 0 行 → 值随行保留、重编号、播报', () => {
    const table = makeBig(60, { virtual: '', 'viewport-height': '320', 'estimated-row-height': '50' })
    rows(table)[0]!.querySelector('oas-input')!.setAttribute('value', 'doomed')
    rows(table)[5]!.querySelector('oas-input')!.setAttribute('value', 'keepme')
    let detail: unknown
    table.addEventListener('oas-remove', (e) => (detail = (e as CustomEvent).detail))
    actionClick(table, 0, 'remove')
    expect(table.rowCount).toBe(59)
    expect(detail).toEqual({ index: 0 })
    expect(rows(table)[4]!.querySelector('oas-input')!.getAttribute('value')).toBe('keepme')
    expect(rows(table)[4]!.querySelector('oas-input')!.getAttribute('name')).toBe('users.4.nick')
  })

  it('受控通道在虚拟态正常：setRowCount / insertRowAt 越窗行、不派发事件', () => {
    const table = makeBig(50, { virtual: '', 'viewport-height': '320' })
    const events: string[] = []
    table.addEventListener('oas-add', () => events.push('add'))
    table.addEventListener('oas-remove', () => events.push('remove'))
    table.setRowCount(80)
    expect(table.rowCount).toBe(80)
    expect(rows(table)[79]!.querySelector('oas-input')!.getAttribute('name')).toBe('users.79.nick')
    table.setRowCount(10)
    expect(table.rowCount).toBe(10)
    expect(table.insertRowAt(3)).toBe(true)
    expect(rows(table)[3]!.querySelector('oas-input')!.getAttribute('name')).toBe('users.3.nick')
    expect(events).toEqual([])
  })

  it('虚拟态主表提交：窗口外行值完整进 values', () => {
    const { form, table } = makeTable(
      { name: 'users', rows: '30', virtual: '', 'viewport-height': '200', 'estimated-row-height': '50' },
      TEMPLATE,
    )
    const inputs = [...table.querySelectorAll('oas-input')]
    expect(inputs.length).toBe(60)
    inputs[0]!.setAttribute('value', 'first')
    inputs[59]!.setAttribute('value', 'last-age')
    let detail: unknown
    form.addEventListener('oas-submit', (e) => (detail = (e as CustomEvent).detail))
    form.submit()
    const values = (detail as { values: { users: Array<{ nick?: string; age?: string }> } }).values
    expect(values.users.length).toBe(30)
    expect(values.users[0]!.nick).toBe('first')
    // 最后一行的第 2 个字段（窗口外）也完整提交
    expect(values.users[29]!.age).toBe('last-age')
  })

  it('关闭虚拟零漂移：移除 virtual 属性恢复全量帧并拆掉 spacer', () => {
    const table = makeBig(30, { virtual: '', 'viewport-height': '320' })
    expect(table.shadowRoot!.querySelectorAll('[data-vspacer]').length).toBe(2)
    table.removeAttribute('virtual')
    expect(table.shadowRoot!.querySelectorAll('[data-vspacer]').length).toBe(0)
    expect(frames(table).length).toBe(30)
    expect(scroller(table).classList.contains('vscroll')).toBe(false)
  })

  it('overscan / viewport-height 属性控制窗口规模', () => {
    const narrow = makeBig(200, { virtual: '', 'viewport-height': '100', 'estimated-row-height': '50', overscan: '0' })
    const wide = makeBig(200, { virtual: '', 'viewport-height': '900', 'estimated-row-height': '50', overscan: '20' })
    expect(frames(narrow).length).toBeLessThan(frames(wide).length)
  })

  it('行操作按钮在窗口内与行号对位：复制第 8 行 → oas-duplicate {from:8,to:9}', () => {
    const table = makeBig(60, { virtual: '', 'viewport-height': '320', 'estimated-row-height': '50' })
    rows(table)[8]!.querySelector('oas-input')!.setAttribute('value', 'copy-me')
    let detail: unknown
    table.addEventListener('oas-duplicate', (e) => (detail = (e as CustomEvent).detail))
    actionClick(table, 8, 'duplicate')
    expect(detail).toEqual({ from: 8, to: 9 })
    expect(rows(table)[9]!.querySelector('oas-input')!.getAttribute('value')).toBe('copy-me')
    expect(table.rowCount).toBe(61)
  })

  it('virtual 属性缺省不存在时 observedAttributes 不影响既有行为（head/empty 照常）', () => {
    const table = makeBig(2)
    expect(table.shadowRoot!.querySelectorAll<HTMLElement>('[role="columnheader"]').length).toBeGreaterThan(1)
    const empty = makeBig(0)
    expect(empty.shadowRoot!.querySelector<HTMLElement>('.empty')!.hidden).toBe(false)
  })
})

/** 点击第 index 行（light DOM 行上的操作按钮，跨帧存在） */
function actionClick(table: OASArrayTable, index: number, action: string): void {
  rows(table)[index]!.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.click()
}
