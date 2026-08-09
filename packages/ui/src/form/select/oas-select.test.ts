import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASSelect } from './index.js'

const OPTIONS = JSON.stringify([
  { label: '苹果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
  { label: '橙子', value: 'orange' },
])

function mount(attrs: Record<string, string> = {}): OASSelect {
  const el = new OASSelect()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.options) el.setAttribute('options', OPTIONS)
  document.body.appendChild(el)
  return el
}

function trigger(el: OASSelect): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button[part="trigger"]')!
}

function open(el: OASSelect): void {
  trigger(el).click()
}

describe('OASSelect', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 trigger，未选择显示 placeholder，含 combobox 角色', async () => {
    const el = mount({ placeholder: '请选择' })
    await Promise.resolve()
    expect(trigger(el).getAttribute('role')).toBe('combobox')
    expect(trigger(el).textContent).toContain('请选择')
  })

  it('value 匹配时显示选项 label', () => {
    const el = mount({ value: 'banana' })
    expect(trigger(el).textContent).toContain('香蕉')
  })

  it('点击展开下拉，aria-expanded 同步', () => {
    const el = mount()
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    open(el)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    const listbox = el.shadowRoot!.querySelector('[role="listbox"]')
    expect(listbox).not.toBeNull()
    expect(listbox!.querySelectorAll('[role="option"]').length).toBe(3)
  })

  it('选择选项后更新 value 并关闭下拉，派发 oas-change', () => {
    const el = mount()
    open(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const options = el.shadowRoot!.querySelectorAll('[role="option"]')
    ;(options[1] as HTMLElement).click()
    expect(el.getAttribute('value')).toBe('banana')
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    expect(detail).toEqual({ value: 'banana' })
  })

  it('Esc 关闭下拉', () => {
    const el = mount()
    open(el)
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('多选：multiple 时选择叠加，chip 显示选中项', () => {
    const el = mount({ multiple: '' })
    open(el)
    const options = el.shadowRoot!.querySelectorAll('[role="option"]')
    ;(options[0] as HTMLElement).click()
    ;(options[1] as HTMLElement).click()
    const value = JSON.parse(el.getAttribute('value') ?? '[]')
    expect(value).toEqual(['apple', 'banana'])
    expect(el.shadowRoot!.querySelectorAll('.chip').length).toBe(2)
  })

  it('回归：多选 chip 渲染 label + 移除按钮（button ×），样式含固定高度与间距', () => {
    const el = mount({ multiple: '', value: JSON.stringify(['apple', 'banana']) })
    const chips = [...el.shadowRoot!.querySelectorAll('.chip')]
    expect(chips.length).toBe(2)
    const chip = chips[0]!
    const label = chip.children[0] as HTMLElement
    const rm = chip.children[1] as HTMLButtonElement
    expect(label.textContent).toBe('苹果')
    expect(rm.textContent).toBe('×')
    expect(rm.getAttribute('aria-label')).toBeTruthy()
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    const chipRule = style.match(/\.chip\s*\{[^}]*\}/)?.[0] ?? ''
    expect(chipRule).toContain('box-sizing: border-box')
    expect(chipRule).toContain('height: 20px')
    expect(chipRule).toContain('gap: var(--oas-space-1)')
  })

  it('回归：多选 chip 移除按钮可点击移除对应值', () => {
    const el = mount({ multiple: '', value: JSON.stringify(['apple', 'banana']) })
    el.shadowRoot!.querySelector<HTMLButtonElement>('.chip button')!.click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['banana'])
    expect(el.shadowRoot!.querySelectorAll('.chip').length).toBe(1)
  })

  it('disabled 时 trigger 不可交互', () => {
    const el = mount({ disabled: '' })
    expect(trigger(el).disabled).toBe(true)
  })

  it('属性变化增量更新：改 options 或 value 即时反映', () => {
    const el = mount()
    const btn = trigger(el)
    el.setAttribute('value', 'orange')
    expect(trigger(el)).toBe(btn)
    expect(trigger(el).textContent).toContain('橙子')
  })

  it('searchable：显示搜索框，输入过滤选项', () => {
    const el = mount({ searchable: '' })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    expect(searchInput.hidden).toBe(false)
    searchInput.value = '香'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    const options = [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    expect(options.length).toBe(1)
    expect(options[0]!.textContent).toContain('香蕉')
  })

  it('searchable：无匹配时显示空态', () => {
    const el = mount({ searchable: '' })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    searchInput.value = '不存在的'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.shadowRoot!.textContent).toContain('无匹配选项')
  })

  it('分组：渲染组标题（不可选），组内选项缩进，键盘导航跨组连续', () => {
    const grouped = JSON.stringify([
      { group: '温带水果', label: '苹果', value: 'apple' },
      { group: '温带水果', label: '香蕉', value: 'banana' },
      { group: '热带水果', label: '橙子', value: 'orange' },
      { group: '热带水果', label: '芒果', value: 'mango' },
    ])
    const el = mount({ options: grouped })
    open(el)
    const headers = [...el.shadowRoot!.querySelectorAll('.option-group')].map((h) => h.textContent)
    expect(headers).toEqual(['温带水果', '热带水果'])
    // 组标题不可选：仅可选项具备 role="option"，且组内选项有缩进标记
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(4)
    expect(el.shadowRoot!.querySelectorAll('.option.grouped').length).toBe(4)
    // 从第一组最后一项跨到第二组第一项
    const btn = trigger(el)
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    const active = el.shadowRoot!.querySelector('.option.active')!
    expect(active.textContent).toContain('橙子')
  })

  it('clearable：有值时显示清空按钮，点击清空并派发 oas-clear / oas-change', () => {
    const el = mount({ clearable: '', value: 'apple' })
    const clearBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!
    expect(clearBtn.hidden).toBe(false)
    let clearDetail: unknown
    let changeDetail: unknown
    el.addEventListener('oas-clear', (e: Event) => (clearDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
    clearBtn.click()
    expect(el.getAttribute('value')).toBeNull()
    expect(clearDetail).toEqual({ value: 'apple' })
    expect(changeDetail).toEqual({ value: '' })
    expect(clearBtn.hidden).toBe(true)
  })

  it('clearable：无值 / 禁用时不显示清空按钮', () => {
    const el = mount({ clearable: '' })
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.hidden).toBe(true)
    const el2 = mount({ clearable: '', disabled: '', value: 'apple' })
    expect(el2.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.hidden).toBe(true)
  })

  it('remote：loading 时下拉显示加载占位', () => {
    const el = mount({ remote: '', searchable: '' })
    open(el)
    el.setAttribute('loading', '')
    expect(el.shadowRoot!.textContent).toContain('加载中…')
  })

  it('remote：本地不过滤选项，输入派发 oas-input 供宿主请求', () => {
    const el = mount({ remote: '', searchable: '' })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    let inputDetail: unknown
    el.addEventListener('oas-input', (e: Event) => (inputDetail = (e as CustomEvent).detail))
    // 关键词在本地下拉中不存在，但 remote 不做本地过滤，全部选项仍渲染
    searchInput.value = '不存在的'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(3)
    expect(inputDetail).toEqual({ value: '不存在的' })
  })

  it('max-tag-count：多选超过数量折叠为 +N', () => {
    const el = mount({
      multiple: '',
      'max-tag-count': '2',
      value: JSON.stringify(['apple', 'banana', 'orange']),
    })
    const chips = [...el.shadowRoot!.querySelectorAll('.chip')]
    expect(chips.length).toBe(3)
    expect(chips[2]!.textContent).toBe('+1')
  })

  it('allow-create：无匹配时显示「创建 xxx」项，点击创建并纳入选中', () => {
    const el = mount({ 'allow-create': '', searchable: '' })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    searchInput.value = '火龙果'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    const createRow = el.shadowRoot!.querySelector<HTMLElement>('.create-option')!
    expect(createRow.textContent).toContain('创建 火龙果')
    let changeDetail: unknown
    el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
    createRow.click()
    expect(el.getAttribute('value')).toBe('火龙果')
    expect(trigger(el).textContent).toContain('火龙果')
    expect(changeDetail).toEqual({ value: '火龙果' })
  })

  it('allow-create：键盘 Enter 创建新选项', () => {
    const el = mount({ 'allow-create': '', searchable: '' })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    searchInput.value = '奇异果'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBe('奇异果')
  })

  it('键盘：展开态按 Enter 选中高亮项（回归：此前 Enter 分支为死代码）', () => {
    const el = mount()
    open(el)
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBe('banana')
  })

  it('键盘：搜索框内 ↑/↓ 移动高亮', () => {
    const el = mount({ searchable: '' })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    const active = el.shadowRoot!.querySelector('.option.active')!
    expect(active.textContent).toContain('香蕉')
  })
})
