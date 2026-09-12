import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASAutoComplete } from './index.js'

const OPTIONS = JSON.stringify([
  { label: '苹果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
  { label: '橙子', value: 'orange' },
])

const GROUPED_OPTIONS = JSON.stringify([
  { group: '温带水果', label: '苹果', value: 'apple' },
  { group: '温带水果', label: '梨', value: 'pear' },
  { group: '热带水果', label: '香蕉', value: 'banana' },
])

function mount(attrs: Record<string, string> = {}): OASAutoComplete {
  const el = new OASAutoComplete()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.options) el.setAttribute('options', OPTIONS)
  document.body.appendChild(el)
  return el
}

function input(el: OASAutoComplete): HTMLInputElement {
  return el.shadowRoot!.querySelector('input')!
}

function rows(el: OASAutoComplete): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')]
}

/** 模拟输入：设置值并派发 input 事件（默认立即过滤展开） */
function type(el: OASAutoComplete, text: string): void {
  const i = input(el)
  i.value = text
  i.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('OASAutoComplete', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 input + combobox 角色，options 完整时展开', async () => {
    const el = mount()
    await Promise.resolve()
    const i = input(el)
    expect(i.getAttribute('role')).toBe('combobox')
    i.value = '苹'
    i.dispatchEvent(new Event('input'))
    const options = el.shadowRoot!.querySelectorAll('[role="option"]')
    expect(options.length).toBe(1)
    expect(options[0]!.textContent).toContain('苹果')
  })

  it('无匹配时显示空态', () => {
    const el = mount()
    const i = input(el)
    i.value = '不存在的'
    i.dispatchEvent(new Event('input'))
    expect(el.shadowRoot!.querySelector('.empty')).not.toBeNull()
  })

  it('输入派发 oas-input，选择派发 oas-change 并填入 input', () => {
    const el = mount()
    let inputDetail: unknown
    let changeDetail: unknown
    el.addEventListener('oas-input', (e: Event) => (inputDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
    const i = input(el)
    i.value = '香'
    i.dispatchEvent(new Event('input'))
    expect(inputDetail).toEqual({ value: '香' })
    ;(el.shadowRoot!.querySelector('[role="option"]') as HTMLElement).click()
    expect(changeDetail).toEqual({ value: 'banana', label: '香蕉' })
    expect(input(el).value).toBe('香蕉')
  })

  it('Esc 关闭下拉', () => {
    const el = mount()
    const i = input(el)
    i.value = '苹'
    i.dispatchEvent(new Event('input'))
    expect(i.getAttribute('aria-expanded')).toBe('true')
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(i.getAttribute('aria-expanded')).toBe('false')
  })

  it('disabled 时 input 禁用', () => {
    const el = mount({ disabled: '' })
    expect(input(el).disabled).toBe(true)
  })
})

describe('OASAutoComplete 机制补齐', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('aria-activedescendant 跟随键盘高亮，关闭时移除', () => {
    const el = mount()
    const i = input(el)
    type(el, '') // 空查询展开全部 3 项
    expect(i.getAttribute('aria-expanded')).toBe('true')
    expect(i.getAttribute('aria-activedescendant')).toBe('opt-0')
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(i.getAttribute('aria-activedescendant')).toBe('opt-1')
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(i.hasAttribute('aria-activedescendant')).toBe(false)
  })

  it('下拉 fixed 定位：open 后 computePosition 锚定（inline top/left/width 落位）', () => {
    const el = mount()
    type(el, '苹')
    const dd = el.shadowRoot!.querySelector<HTMLElement>('.dropdown')!
    expect(dd.style.top).toContain('px')
    expect(dd.style.left).toContain('px')
    expect(dd.style.width).toContain('px')
    // CSS 契约：fixed（逃出 overflow 祖先，与 select/combobox 定位契约一致）
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain('position: fixed')
  })

  it('mousemove 高亮增量同步：不重建 DOM（节点身份保持）', () => {
    const el = mount()
    type(el, '')
    const before = rows(el)
    expect(before.length).toBe(3)
    expect(before[0]!.classList.contains('active')).toBe(true)
    const row0 = before[0]!
    const row1 = before[1]!
    row1.dispatchEvent(new Event('mousemove', { bubbles: true }))
    const after = rows(el)
    expect(after[0]).toBe(row0) // 未整树重建
    expect(row0.classList.contains('active')).toBe(false)
    expect(row1.classList.contains('active')).toBe(true)
    expect(input(el).getAttribute('aria-activedescendant')).toBe(row1.id)
  })

  it('IME 组合期间不触发过滤与选中，compositionend 后恢复并补发', () => {
    const el = mount()
    const i = input(el)
    let inputEvents: string[] = []
    el.addEventListener('oas-input', (e: Event) => inputEvents.push((e as CustomEvent).detail.value))
    // 组合开始：拼音串进入输入框，但不派发不过滤不展开
    i.dispatchEvent(new Event('compositionstart'))
    i.value = 'zhong'
    i.dispatchEvent(new Event('input', { bubbles: true }))
    expect(inputEvents).toEqual([])
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(0)
    expect(i.getAttribute('aria-expanded')).toBe('false')
    // 组合期回车：确认候选词，不误选建议
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBeNull()
    // 组合结束：以最终文本补发一次过滤（zhong 无匹配 → 空态）
    i.dispatchEvent(new Event('compositionend'))
    expect(inputEvents).toEqual(['zhong'])
    expect(el.shadowRoot!.querySelector('.empty')).not.toBeNull()
    // 恢复正常输入
    type(el, '苹')
    expect(inputEvents).toEqual(['zhong', '苹'])
    expect(rows(el).length).toBe(1)
  })

  it('失焦关闭下拉（自由文本不回退）', () => {
    const el = mount()
    type(el, '苹')
    const i = input(el)
    expect(i.getAttribute('aria-expanded')).toBe('true')
    i.dispatchEvent(new FocusEvent('blur'))
    expect(i.getAttribute('aria-expanded')).toBe('false')
    expect(i.value).toBe('苹')
  })
})

describe('OASAutoComplete 能力项', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  // ---- clearable ----

  it('clearable：有输入时显示清空按钮，点击清空并派发 oas-clear / oas-change', () => {
    const el = mount({ clearable: '' })
    const clearBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!
    expect(clearBtn.hidden).toBe(true)
    type(el, '香')
    expect(clearBtn.hidden).toBe(false)
    ;(el.shadowRoot!.querySelector('[role="option"]') as HTMLElement).click()
    expect(el.getAttribute('value')).toBe('banana')
    let clearDetail: unknown
    let changeDetail: unknown
    el.addEventListener('oas-clear', (e: Event) => (clearDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
    clearBtn.click()
    expect(input(el).value).toBe('')
    expect(el.getAttribute('value')).toBeNull()
    expect(clearDetail).toEqual({ value: 'banana' })
    expect(changeDetail).toEqual({ value: '', label: '' })
    expect(clearBtn.hidden).toBe(true)
  })

  it('clearable：无输入 / 禁用时不显示清空按钮', () => {
    const el = mount({ clearable: '' })
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.hidden).toBe(true)
    const el2 = mount({ clearable: '', disabled: '' })
    type(el2, '苹')
    expect(el2.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.hidden).toBe(true)
  })

  // ---- loading ----

  it('loading：下拉显示加载占位（role=status），不渲染选项', () => {
    const el = mount({ loading: '' })
    type(el, '苹')
    const status = el.shadowRoot!.querySelector('[role="status"]')!
    expect(status.textContent).toContain('加载中')
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(0)
  })

  // ---- debounce ----

  it('debounce：防抖派发 oas-input 与过滤，输入回显不被防抖', () => {
    vi.useFakeTimers()
    const el = mount({ debounce: '100' })
    const i = input(el)
    let values: string[] = []
    el.addEventListener('oas-input', (e: Event) => values.push((e as CustomEvent).detail.value))
    i.value = '苹'
    i.dispatchEvent(new Event('input', { bubbles: true }))
    // 输入框回显即时（原生），事件与过滤防抖中
    expect(i.value).toBe('苹')
    expect(values).toEqual([])
    expect(i.getAttribute('aria-expanded')).toBe('false')
    vi.advanceTimersByTime(99)
    expect(values).toEqual([])
    vi.advanceTimersByTime(1)
    expect(values).toEqual(['苹'])
    expect(i.getAttribute('aria-expanded')).toBe('true')
    // 连续输入只派发末次
    i.value = '香蕉'
    i.dispatchEvent(new Event('input', { bubbles: true }))
    i.value = '橙'
    i.dispatchEvent(new Event('input', { bubbles: true }))
    vi.advanceTimersByTime(100)
    expect(values).toEqual(['苹', '橙'])
    expect(rows(el).length).toBe(1)
  })

  // ---- trigger-on-focus ----

  it('trigger-on-focus：默认关闭聚焦不展开；开启后聚焦展示全部建议', () => {
    const el = mount()
    input(el).dispatchEvent(new FocusEvent('focus'))
    expect(input(el).getAttribute('aria-expanded')).toBe('false')

    const el2 = mount({ 'trigger-on-focus': '' })
    input(el2).dispatchEvent(new FocusEvent('focus'))
    expect(input(el2).getAttribute('aria-expanded')).toBe('true')
    expect(rows(el2).length).toBe(3)
  })

  // ---- size / status ----

  it('size：data-size 镜像，非法值回落 medium，样式档位规则存在', () => {
    expect(mount().getAttribute('data-size')).toBe('medium')
    expect(mount({ size: 'small' }).getAttribute('data-size')).toBe('small')
    expect(mount({ size: 'large' }).getAttribute('data-size')).toBe('large')
    expect(mount({ size: 'huge' }).getAttribute('data-size')).toBe('medium')
    const css = mount().shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain("[data-size='small']")
    expect(css).toContain("[data-size='large']")
  })

  it('status：data-status 镜像；error 同步内层 input aria-invalid', () => {
    const el = mount({ status: 'error' })
    expect(el.getAttribute('data-status')).toBe('error')
    expect(input(el).getAttribute('aria-invalid')).toBe('true')
    expect(mount({ status: 'warning' }).getAttribute('data-status')).toBe('warning')
    expect(mount({ status: 'success' }).getAttribute('data-status')).toBe('success')
    el.removeAttribute('status')
    expect(el.hasAttribute('data-status')).toBe(false)
    expect(input(el).hasAttribute('aria-invalid')).toBe(false)
    const css = mount().shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain("[data-status='error']")
    expect(css).toContain("[data-status='warning']")
    expect(css).toContain("[data-status='success']")
  })

  // ---- readonly ----

  it('readonly：输入只读，聚焦/键盘/输入均不展开', () => {
    const el = mount({ readonly: '', 'trigger-on-focus': '' })
    const i = input(el)
    expect(i.readOnly).toBe(true)
    i.dispatchEvent(new FocusEvent('focus'))
    expect(i.getAttribute('aria-expanded')).toBe('false')
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(i.getAttribute('aria-expanded')).toBe('false')
    let inputEvents = 0
    el.addEventListener('oas-input', () => inputEvents++)
    type(el, '苹')
    expect(inputEvents).toBe(0)
    expect(i.getAttribute('aria-expanded')).toBe('false')
  })

  // ---- group ----

  it('group：分组标题渲染（不可选），组内选项带 grouped 类', () => {
    const el = mount({ options: GROUPED_OPTIONS })
    type(el, '')
    const groups = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.option-group')]
    expect(groups.map((g) => g.textContent)).toEqual(['温带水果', '热带水果'])
    expect(groups.every((g) => g.getAttribute('role') !== 'option')).toBe(true)
    const list = rows(el)
    expect(list.length).toBe(3)
    expect(list.every((r) => r.classList.contains('grouped'))).toBe(true)
    // 键盘导航跨组连续（跳过组标题）：↓ 两次到第三项
    const i = input(el)
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(i.getAttribute('aria-activedescendant')).toBe('opt-2')
  })

  // ---- 自定义渲染 ----

  it('oas-option-render：每个选项行派发，宿主可改写 element', () => {
    const el = mount()
    const details: Array<{ index: number; option: unknown; element: unknown }> = []
    el.addEventListener('oas-option-render', (e: Event) => {
      const d = (e as CustomEvent).detail
      details.push({ index: d.index, option: d.option, element: d.element })
      if (d.index === 0 && d.element instanceof HTMLElement) d.element.textContent = '改写首项'
    })
    type(el, '')
    expect(details.length).toBe(3)
    expect(details[0]!.option).toEqual({ label: '苹果', value: 'apple' })
    expect(rows(el)[0]!.textContent).toBe('改写首项')
    expect(rows(el)[1]!.textContent).toBe('香蕉')
  })

  it('template[slot="option"]：模板克隆 + data-option-label 绑定', () => {
    const el = mount()
    el.innerHTML = '<template slot="option"><span>🏷 </span><span data-option-label></span></template>'
    type(el, '')
    const list = rows(el)
    expect(list[0]!.textContent).toBe('🏷 苹果')
    expect(list[1]!.textContent).toBe('🏷 香蕉')
  })

  // ---- header / footer / empty 插槽 ----

  it('header/footer 插槽：light DOM 提供时显示，缺席时隐藏', () => {
    const el = mount()
    type(el, '苹')
    const header = el.shadowRoot!.querySelector<HTMLElement>('[part="header"]')!
    const footer = el.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!
    expect(header.hidden).toBe(true)
    expect(footer.hidden).toBe(true)

    const el2 = mount()
    el2.innerHTML = '<span slot="header">最近搜索</span><span slot="footer">查看全部</span>'
    type(el2, '苹')
    expect(el2.shadowRoot!.querySelector<HTMLElement>('[part="header"]')!.hidden).toBe(false)
    expect(el2.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!.hidden).toBe(false)
  })

  it('empty 插槽：自定义空态替换默认文案', () => {
    const el = mount()
    el.innerHTML = '<span slot="empty">换个关键词试试</span>'
    type(el, '不存在的')
    const empty = el.shadowRoot!.querySelector<HTMLElement>('.empty')!
    expect(empty.querySelector('slot[name="empty"]')).not.toBeNull()
    expect(empty.querySelector<HTMLElement>('.empty-default')!.hidden).toBe(true)

    const el2 = mount()
    type(el2, '不存在的')
    const empty2 = el2.shadowRoot!.querySelector<HTMLElement>('.empty')!
    expect(empty2.querySelector<HTMLElement>('.empty-default')!.hidden).toBe(false)
    expect(empty2.querySelector<HTMLElement>('.empty-default')!.textContent).toBe('无匹配结果')
  })
})

describe('OASAutoComplete focus 委托', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('host.focus() 委托到 shadow 内主输入', () => {
    const el = new OASAutoComplete()
    el.setAttribute('options', OPTIONS)
    document.body.appendChild(el)
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('input'))
  })
})
