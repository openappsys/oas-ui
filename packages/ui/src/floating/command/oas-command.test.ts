import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '@oas-ui/i18n'
import { OASCommand } from './index.js'

const ITEMS = JSON.stringify([
  { label: '新建文件', value: 'new-file', keywords: ['create', 'file'] },
  { label: '打开文件', value: 'open-file', group: '文件' },
  { label: '保存文件', value: 'save', group: '文件' },
  { label: '撤销', value: 'undo', group: '编辑' },
])

function mount(attrs: Record<string, string> = {}): OASCommand {
  const el = new OASCommand()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.items) el.setAttribute('items', ITEMS)
  document.body.appendChild(el)
  return el
}

function overlay(el: OASCommand): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="overlay"]')!
}

function search(el: OASCommand): HTMLInputElement {
  return el.shadowRoot!.querySelector<HTMLInputElement>('[part="search"]')!
}

function options(el: OASCommand): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]')]
}

function fireInput(el: OASCommand, value: string): void {
  search(el).value = value
  search(el).dispatchEvent(new Event('input'))
}

describe('OASCommand', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认关闭；open 后显示面板并自动聚焦搜索框', () => {
    const el = mount()
    expect(overlay(el).hidden).toBe(true)
    el.setAttribute('open', '')
    expect(overlay(el).hidden).toBe(false)
    // happy-dom 下 document.activeElement 回退到宿主，用 shadowRoot.activeElement 断言真实聚焦元素
    expect(el.shadowRoot!.activeElement).toBe(search(el))
  })

  it('渲染 items 为选项（role=listbox/option）', () => {
    const el = mount({ open: '' })
    expect(el.shadowRoot!.querySelector('[role="listbox"]')).not.toBeNull()
    expect(options(el).length).toBe(4)
    expect(options(el)[0]!.getAttribute('role')).toBe('option')
  })

  it('渲染分组标题（group）', () => {
    const el = mount({ open: '' })
    const groups = [...el.shadowRoot!.querySelectorAll('.group')].map((g) => g.textContent)
    expect(groups).toEqual(['文件', '编辑'])
  })

  it('搜索按 label 过滤', () => {
    const el = mount({ open: '' })
    fireInput(el, '打开')
    expect(options(el).map((o) => o.textContent)).toEqual(['打开文件'])
  })

  it('搜索匹配 keywords', () => {
    const el = mount({ open: '' })
    fireInput(el, 'create')
    expect(options(el).map((o) => o.textContent)).toEqual(['新建文件'])
  })

  it('无匹配显示空态文案', () => {
    const el = mount({ open: '' })
    fireInput(el, 'zzz')
    expect(options(el).length).toBe(0)
    expect(el.shadowRoot!.querySelector('.empty')!.textContent).toBe('无匹配命令')
  })

  it('搜索后分组标题跟随过滤结果', () => {
    const el = mount({ open: '' })
    fireInput(el, '文件')
    expect(options(el).map((o) => o.textContent)).toEqual(['新建文件', '打开文件', '保存文件'])
    expect(el.shadowRoot!.querySelectorAll('.group').length).toBe(1)
  })

  it('ArrowDown/ArrowUp 移动高亮，aria-activedescendant 跟随', () => {
    const el = mount({ open: '' })
    search(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(options(el)[1]!.classList.contains('active')).toBe(true)
    expect(search(el).getAttribute('aria-activedescendant')).toBe(options(el)[1]!.id)
    search(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    expect(options(el)[0]!.classList.contains('active')).toBe(true)
  })

  it('Enter 执行当前项：派发 oas-select 并关闭', () => {
    const el = mount({ open: '' })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    search(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    search(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(detail).toEqual({ value: 'open-file' })
    expect(overlay(el).hidden).toBe(true)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('点击选项同样选中并关闭', () => {
    const el = mount({ open: '' })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    options(el)[0]!.click()
    expect(detail).toEqual({ value: 'new-file' })
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('Escape 关闭面板', () => {
    const el = mount({ open: '' })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(overlay(el).hidden).toBe(true)
  })

  it('⌘K / Ctrl+K 切换打开状态', () => {
    const el = mount()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    expect(el.hasAttribute('open')).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'K', ctrlKey: true }))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('焦点陷阱：Tab 在搜索框与选项之间循环', () => {
    const el = mount({ open: '' })
    search(el).focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(el.shadowRoot!.activeElement).toBe(options(el)[0])
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(el.shadowRoot!.activeElement).toBe(options(el)[1])
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }))
    expect(el.shadowRoot!.activeElement).toBe(options(el)[0])
  })

  it('disabled 项 Enter 不可选中', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        { label: '只读项', value: 'ro', disabled: true },
        { label: '可用项', value: 'ok' },
      ]),
    })
    let fired = 0
    el.addEventListener('oas-select', () => fired++)
    // 初始 active=0（只读项），Enter 不可选中
    search(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(fired).toBe(0)
  })

  it('方向键跳过 disabled 项', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        { label: '可用项1', value: 'a' },
        { label: '只读项', value: 'ro', disabled: true },
        { label: '可用项2', value: 'b' },
      ]),
    })
    search(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(options(el)[2]!.classList.contains('active')).toBe(true)
  })

  it('items 数据变化增量重渲染', () => {
    const el = mount({ open: '' })
    el.setAttribute(
      'items',
      JSON.stringify([
        { label: '新增', value: 'add' },
        { label: '删除', value: 'del' },
      ]),
    )
    expect(options(el).map((o) => o.textContent)).toEqual(['新增', '删除'])
  })
})
