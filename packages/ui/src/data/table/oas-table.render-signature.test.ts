import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'

/**
 * client 模式渲染签名金本位。
 *
 * 目的：把 client 模式在典型配置下的 shadow DOM 结构（tag + 类名 + part 层级）
 * 固化为逐字节断言——后续行模型管道改造（server 分支短路本地过滤/排序等）必须
 * 保证 client 路径零漂移，本文件是可量化的判据；任何结构变化都应在此显式暴露。
 *
 * 覆盖配置（≥9）：基础表 / 排序态 / 过滤态 / 分组态 / 分页态 / 树展开 / 行选择 /
 * 合计 / 空态 / loading。
 */

/** shadow 内元素树序列化：tag.类名@part 缩进文本（STYLE 跳过；文本另用 bodyText 断言） */
function domSig(root: Element | ShadowRoot): string {
  const out: string[] = []
  const walk = (node: Element, depth: number): void => {
    if (node.tagName === 'STYLE') return
    const cls = [...node.classList].sort().join('.')
    const part = node.getAttribute('part')
    out.push(`${'  '.repeat(depth)}${node.tagName.toLowerCase()}${cls ? `.${cls}` : ''}${part ? `@${part}` : ''}`)
    for (const child of [...node.children]) walk(child, depth + 1)
  }
  for (const child of [...root.children]) walk(child, 0)
  return out.join('\n')
}

function mount(attrs: Record<string, string> = {}): OASTable {
  const el = new OASTable()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.columns)
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'age', title: '年龄' },
      ]),
    )
  if (!attrs.data)
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: '张三', age: 30 },
        { name: '李四', age: 25 },
        { name: '王五', age: 35 },
      ]),
    )
  document.body.appendChild(el)
  return el
}

const rowsOf = (el: OASTable): HTMLElement[] => [...el.shadowRoot!.querySelectorAll('[part="row"]')] as HTMLElement[]
const bodyText = (el: OASTable): string => el.shadowRoot!.querySelector('tbody')!.textContent ?? ''

describe('OASTable client 渲染签名金本位', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('基础表：表头 + 数据行结构签名', () => {
    const el = mount()
    expect(rowsOf(el).length).toBe(3)
    expect(bodyText(el)).toContain('张三')
    expect(domSig(el.shadowRoot!)).toBe(
      [
        'div.table-toolbar@toolbar',
        'div.rows-error@rows-error',
        '  span.rows-error-icon',
        '    svg',
        '      circle',
        '      path',
        '      circle',
        '  span.rows-error-text',
        '  button.rows-error-retry@rows-error-retry',
        'div.table-scroll@scroll',
        '  table@table',
        '    thead@head',
        '      tr',
        '        th.align-left@header',
        '          button.col-move.up@col-move-up',
        '            svg',
        '              path',
        '          button.col-move.down@col-move-down',
        '            svg',
        '              path',
        '        th.align-left@header',
        '          button.col-move.up@col-move-up',
        '            svg',
        '              path',
        '          button.col-move.down@col-move-down',
        '            svg',
        '              path',
        '    tbody@body',
        '      tr.row@row',
        '        td',
        '        td',
        '      tr.row@row',
        '        td',
        '        td',
        '      tr.row@row',
        '        td',
        '        td',
        'div.pagination@pagination',
      ].join('\n'),
    )
  })

  it('排序态：sort-key/sort-order 受控排序行序与表头指示', () => {
    const el = mount({
      'sort-key': 'age',
      'sort-order': 'asc',
      columns: JSON.stringify([
        { key: 'name', title: '姓名', sortable: true },
        { key: 'age', title: '年龄', sortable: true },
      ]),
    })
    expect(rowsOf(el).length).toBe(3)
    expect(bodyText(el)).toContain('李四')
    expect(bodyText(el).indexOf('李四')).toBeLessThan(bodyText(el).indexOf('张三'))
    expect(el.shadowRoot!.querySelector('th[data-key="age"]')!.getAttribute('data-order')).toBe('asc')
    expect(el.shadowRoot!.querySelector('th[data-key="age"]')!.classList.contains('sortable')).toBe(true)
    // 结构金本位（sortable th 额外带 span.sort-icon；其余与基础表完全一致）
    expect(domSig(el.shadowRoot!)).toBe(
      [
        'div.table-toolbar@toolbar',
        'div.rows-error@rows-error',
        '  span.rows-error-icon',
        '    svg',
        '      circle',
        '      path',
        '      circle',
        '  span.rows-error-text',
        '  button.rows-error-retry@rows-error-retry',
        'div.table-scroll@scroll',
        '  table@table',
        '    thead@head',
        '      tr',
        '        th.align-left.sortable@header',
        '          span.sort-icon',
        '          button.col-move.up@col-move-up',
        '            svg',
        '              path',
        '          button.col-move.down@col-move-down',
        '            svg',
        '              path',
        '        th.align-left.sortable@header',
        '          span.sort-icon',
        '          button.col-move.up@col-move-up',
        '            svg',
        '              path',
        '          button.col-move.down@col-move-down',
        '            svg',
        '              path',
        '    tbody@body',
        '      tr.row@row',
        '        td',
        '        td',
        '      tr.row@row',
        '        td',
        '        td',
        '      tr.row@row',
        '        td',
        '        td',
        'div.pagination@pagination',
      ].join('\n'),
    )
  })

  it('过滤态：filter-values 命中行渲染', () => {
    const el = mount({ 'filter-values': JSON.stringify({ name: '张三' }) })
    expect(rowsOf(el).length).toBe(1)
    expect(bodyText(el)).toContain('张三')
    expect(bodyText(el)).not.toContain('李四')
  })

  it('分组态：group-by 分节头 + 组内行', () => {
    const el = mount({
      data: JSON.stringify([
        { name: 'A', age: 1 },
        { name: 'B', age: 2 },
        { name: 'A', age: 3 },
      ]),
      'group-by': 'name',
    })
    const groupHeaders = [...el.shadowRoot!.querySelectorAll('tr.group-header')]
    expect(groupHeaders.length).toBe(2)
    expect(rowsOf(el).length).toBe(3)
    expect(bodyText(el)).toContain('A')
    expect(domSig(el.shadowRoot!)).toContain('tr.group-header')
  })

  it('分页态：pagination 内部切片（第 1 页 10 行，翻第 2 页余行）', () => {
    const data = JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ name: `行${i}`, age: i })))
    const el = mount({ pagination: '', 'page-size': '10', current: '1', data })
    expect(rowsOf(el).length).toBe(10)
    expect(bodyText(el)).toContain('行0')
    el.setAttribute('current', '2')
    expect(rowsOf(el).length).toBe(2)
    expect(bodyText(el)).toContain('行10')
    expect(bodyText(el)).toContain('行11')
    expect(el.shadowRoot!.querySelector('.pagination oas-pagination')).not.toBeNull()
  })

  it('树展开：children + expanded 渲染父子行', () => {
    const el = mount({
      data: JSON.stringify([
        { name: '父', age: 1, children: [{ name: '子', age: 2 }] },
        { name: '旁', age: 3 },
      ]),
      'row-key': 'name',
      expanded: '父',
    })
    expect(rowsOf(el).length).toBe(3)
    expect(bodyText(el)).toContain('子')
    expect(el.shadowRoot!.querySelector('button.toggle')).not.toBeNull()
  })

  it('行选择：checkable + selected 行选中态', () => {
    const el = mount({ checkable: '', selected: '张三', 'row-key': 'name' })
    expect(el.shadowRoot!.querySelector('th.check-cell')).not.toBeNull()
    expect(rowsOf(el).length).toBe(3)
    const checked = el.shadowRoot!.querySelectorAll('tr.row[data-selected="true"]')
    expect(checked.length).toBe(1)
    expect(checked[0]!.getAttribute('data-key')).toBe('张三')
    expect(el.shadowRoot!.querySelectorAll('input[type="checkbox"]').length).toBe(4)
  })

  it('合计：summary 聚合行渲染', () => {
    const el = mount({ summary: JSON.stringify([{ key: 'age', type: 'sum' }]) })
    const summaryRow = el.shadowRoot!.querySelector('tr.summary')
    expect(summaryRow).not.toBeNull()
    expect(summaryRow!.textContent).toContain('90')
    expect(rowsOf(el).length).toBe(3)
  })

  it('空态：data 为空渲染 .empty 占位', () => {
    const el = mount({ data: '[]' })
    const emptyTd = el.shadowRoot!.querySelector('td.empty')
    expect(emptyTd).not.toBeNull()
    expect(emptyTd!.textContent).toContain('暂无数据')
    expect(rowsOf(el).length).toBe(0)
    expect(domSig(el.shadowRoot!)).toContain('td.empty')
  })

  it('loading：加载占位行（spin + 文案，表头保留）', () => {
    const el = mount({ loading: '' })
    const loadingTd = el.shadowRoot!.querySelector('td.loading')
    expect(loadingTd).not.toBeNull()
    expect(loadingTd!.querySelector('span.spin')).not.toBeNull()
    expect(loadingTd!.textContent).toContain('加载中')
    expect(rowsOf(el).length).toBe(0)
    expect(el.shadowRoot!.querySelector('thead th')).not.toBeNull()
    expect(domSig(el.shadowRoot!)).toContain('td.loading')
  })
})
