import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'

// 本文件验证「编辑能力晚加入（late-join）」：宿主构造/连接时能力注册表为空，
// 之后能力包才注册（入口求值顺序、打包器重排、按需反向引入、动态 import 等场景），
// 宿主应经订阅通知幂等补齐 edit 能力 controller，而不是永久静默失效。
// vitest 按文件隔离模块图，本文件独享一份空注册表起点（首个动态 import 前 edit 未注册）。

const COLS = JSON.stringify([
  { key: 'name', title: '姓名', editable: true },
  { key: 'op', title: '操作', actions: true },
])

function mount(data: string): OASTable {
  const el = new OASTable()
  el.setAttribute('editable', '')
  el.setAttribute('columns', COLS)
  el.setAttribute('data', data)
  document.body.appendChild(el)
  return el
}

describe('OASTable edit 能力晚加入（late-join）', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    warnSpy.mockRestore()
  })

  it('构造/连接后才注册的 edit 能力应补齐注入已连接的宿主（重建行后出现编辑装饰与操作按钮）', async () => {
    const el = mount(JSON.stringify([{ name: '张三' }]))
    // 连接时注册表为空：行已建但无编辑能力 → 无可编辑装饰/铅笔图标/操作按钮
    expect(el.shadowRoot!.querySelector('td.editable-cell')).toBeNull()
    expect(el.shadowRoot!.querySelector('.cell-edit-icon')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="action-edit"]')).toBeNull()

    // 晚加入：动态 import 编辑能力包（模拟入口求值顺序/打包器重排/按需反向引入）
    await import('./edit/index.js')

    // 能力已注入（订阅通知 → 幂等 attach → editCap 就位）；编辑装饰在行重建时应用——
    // 触发一次数据驱动重建作为「补齐后下一次渲染」的观察点
    el.setAttribute('data', JSON.stringify([{ name: '李四' }]))
    expect(el.shadowRoot!.querySelector('td.editable-cell')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('.cell-edit-icon')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="action-edit"]')).not.toBeNull()
    el.remove()
  })

  it('断开的宿主退订：重连仍经 catch-up 补齐（多次重连不泄漏不重复注入）', () => {
    // 注册表已含 edit（上一条用例已 import）：构造快照即注入，装饰随首渲染出现
    const el = mount(JSON.stringify([{ name: '王五' }]))
    expect(el.shadowRoot!.querySelector('td.editable-cell')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="action-edit"]')).not.toBeNull()
    // 多次断开/重连：connectedCallback 重新订阅 + catch-up attach（attachedCaps 幂等去重），
    // 重建后装饰仍恰好一份（无重复注入导致的重复能力副作用）
    for (let i = 0; i < 2; i++) {
      el.remove()
      document.body.appendChild(el)
    }
    el.setAttribute('data', JSON.stringify([{ name: '赵六' }]))
    const editableCells = el.shadowRoot!.querySelectorAll('td.editable-cell')
    expect(editableCells.length).toBe(1)
    const editButtons = el.shadowRoot!.querySelectorAll('[part="action-edit"]')
    expect(editButtons.length).toBe(1)
    el.remove()
  })
})
