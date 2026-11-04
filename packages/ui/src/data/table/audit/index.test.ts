// 审计记录器（table/audit，helper 型 L3）：订阅 oas-edit 事件流，按 行 key × 列 记录
// 修改历史（旧值 → 新值 + 时间戳），供审计/追溯场景查询。与 table/history（撤销栈）正交：
// 审计是观察日志，不回放不撤销。RED：模块未实现，本文件锁契约。
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASTable } from '../index.js'
// 注册编辑能力（oas-edit 事件源）
import '../edit/index.js'
import { createAuditLog } from './index.js'

function editableMount(): OASTable {
  const el = new OASTable()
  el.setAttribute('editable', '')
  el.setAttribute('row-key', 'id')
  el.columns = [
    { key: 'name', title: '名称', editable: true },
    { key: 'age', title: '年龄', editable: true },
  ]
  el.data = [{ id: 'r1', name: '甲', age: 30 }]
  document.body.appendChild(el)
  return el
}

function enterEdit(el: OASTable, key: string): HTMLTableCellElement {
  const td = el.shadowRoot!.querySelector<HTMLTableCellElement>(`td[data-col="${key}"]`)!
  td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  return td
}

function typeAndCommit(td: HTMLTableCellElement, value: string): void {
  const input = td.querySelector<HTMLInputElement>('input.cell-editor')!
  input.value = value
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
}

describe('table/audit 审计记录器（helper 型 L3）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('① 记录提交：按 行 key × 列 存 旧值→新值 + 时间戳；取消不记录', () => {
    const el = editableMount()
    const audit = createAuditLog(el)
    const td = enterEdit(el, 'age')
    typeAndCommit(td, '31')
    const history = audit.getCellHistory('r1', 'age')
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ key: 'r1', column: 'age', oldValue: '30', value: '31' })
    expect(typeof history[0]!.at).toBe('number')
    // 取消（Esc）不记录
    const td2 = enterEdit(el, 'name')
    td2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(audit.getCellHistory('r1', 'name')).toHaveLength(0)
    audit.destroy()
  })

  it('② 同行多列：getRowHistory 按时间序返回跨列记录', () => {
    const el = editableMount()
    const audit = createAuditLog(el)
    typeAndCommit(enterEdit(el, 'age'), '31')
    typeAndCommit(enterEdit(el, 'name'), '乙')
    const row = audit.getRowHistory('r1')
    expect(row.map((e) => e.column)).toEqual(['age', 'name'])
    expect(row[1]).toMatchObject({ oldValue: '甲', value: '乙' })
    audit.destroy()
  })

  it('③ 环形上限：超出 limit 淘汰最旧（默认上限防内存无限涨）', () => {
    const el = editableMount()
    const audit = createAuditLog(el, { limit: 3 })
    for (const v of ['31', '32', '33', '34']) typeAndCommit(enterEdit(el, 'age'), v)
    const row = audit.getRowHistory('r1')
    expect(row.map((e) => e.value)).toEqual(['32', '33', '34'])
    audit.destroy()
  })

  it('④ destroy 后停止记录（已记录仍可查询）；clear 清空；size 计数', () => {
    const el = editableMount()
    const audit = createAuditLog(el)
    typeAndCommit(enterEdit(el, 'age'), '31')
    expect(audit.size).toBe(1)
    audit.clear()
    expect(audit.size).toBe(0)
    typeAndCommit(enterEdit(el, 'age'), '32')
    audit.destroy()
    typeAndCommit(enterEdit(el, 'age'), '33')
    expect(audit.getRowHistory('r1').map((e) => e.value)).toEqual(['32'])
  })

  it('⑤ 多实例互不串扰；未提交（值未变）不记录', () => {
    const el = editableMount()
    const a1 = createAuditLog(el)
    const a2 = createAuditLog(el)
    // 值未变 → 不派发 oas-edit → 不记录
    const td = enterEdit(el, 'age')
    const input = td.querySelector<HTMLInputElement>('input.cell-editor')!
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(a1.size).toBe(0)
    typeAndCommit(enterEdit(el, 'age'), '40')
    expect(a1.size).toBe(1)
    expect(a2.size).toBe(1)
    a1.clear()
    expect(a1.size).toBe(0)
    expect(a2.size).toBe(1)
    a1.destroy()
    a2.destroy()
  })

  it('⑥ 保留 oldRawValue（number 原始形态）；查询返回浅拷贝不污染日志', () => {
    const el = editableMount()
    const audit = createAuditLog(el)
    typeAndCommit(enterEdit(el, 'age'), '31')
    const entry = audit.getCellHistory('r1', 'age')[0]!
    expect(entry.oldRawValue).toBe(30)
    // 浅拷贝：宿主原地修改返回值不改坏日志
    entry.value = 'tampered'
    expect(audit.getCellHistory('r1', 'age')[0]!.value).toBe('31')
    audit.destroy()
  })

  it('⑦ edit-controlled 受控模式：提交请求照记（实际生效以宿主回写为准）', () => {
    const el = editableMount()
    el.setAttribute('edit-controlled', '')
    const audit = createAuditLog(el)
    typeAndCommit(enterEdit(el, 'age'), '77')
    expect(audit.getCellHistory('r1', 'age')).toHaveLength(1)
    // 受控不回写 data，但审计记录的是「提交了什么」
    expect(JSON.parse(el.getAttribute('data')!)).toEqual([{ id: 'r1', name: '甲', age: 30 }])
    audit.destroy()
  })

  it('⑧ 畸形 detail 防御：key/column 非 string 的手工事件不记录', () => {
    const el = editableMount()
    const audit = createAuditLog(el)
    el.dispatchEvent(new CustomEvent('oas-edit', { detail: { key: 42, column: 'age', value: 'x' } }))
    el.dispatchEvent(new CustomEvent('oas-edit', { detail: null }))
    expect(audit.size).toBe(0)
    audit.destroy()
  })
})
