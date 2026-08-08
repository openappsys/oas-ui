import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASDynamicTags } from './index.js'

function mount(attrs: Record<string, string> = {}): OASDynamicTags {
  const el = new OASDynamicTags()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function tagEls(el: OASDynamicTags): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[role="listitem"]')]
}

function inputEl(el: OASDynamicTags): HTMLInputElement {
  return el.shadowRoot!.querySelector<HTMLInputElement>('input')!
}

function removeBtn(el: OASDynamicTags, idx: number): HTMLButtonElement {
  return tagEls(el)[idx]!.querySelector<HTMLButtonElement>('.tag-remove')!
}

function pressKey(el: OASDynamicTags, keyName: string): void {
  inputEl(el).dispatchEvent(
    new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }),
  )
}

function typeValue(el: OASDynamicTags, value: string): void {
  inputEl(el).value = value
}

describe('OASDynamicTags', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('model-value（JSON）渲染标签，容器 role=list、标签 role=listitem', async () => {
    const el = mount({ 'model-value': '["vue","react"]' })
    await Promise.resolve()
    expect(tagEls(el).length).toBe(2)
    expect(el.shadowRoot!.querySelector('[part="tags"]')!.getAttribute('role')).toBe('list')
    expect(tagEls(el)[0]!.getAttribute('role')).toBe('listitem')
  })

  it('Enter 提交新增标签，清空输入，派发 oas-add + oas-change', () => {
    const el = mount()
    const events: string[] = []
    el.addEventListener('oas-add', () => events.push('add'))
    el.addEventListener('oas-change', () => events.push('change'))
    typeValue(el, 'svelte')
    pressKey(el, 'Enter')
    expect(tagEls(el).length).toBe(1)
    expect(tagEls(el)[0]!.textContent).toContain('svelte')
    expect(inputEl(el).value).toBe('')
    expect(events).toEqual(['add', 'change'])
  })

  it('逗号提交新增标签', () => {
    const el = mount()
    typeValue(el, 'solid')
    pressKey(el, ',')
    expect(tagEls(el).length).toBe(1)
    expect(tagEls(el)[0]!.textContent).toContain('solid')
  })

  it('空输入按 Backspace 删除最后一个标签，派发 oas-remove', () => {
    const el = mount({ 'model-value': '["a","b"]' })
    let detail: unknown
    el.addEventListener('oas-remove', (e: Event) => (detail = (e as CustomEvent).detail))
    pressKey(el, 'Backspace')
    expect(tagEls(el).length).toBe(1)
    expect(tagEls(el)[0]!.textContent).toContain('a')
    expect(detail).toEqual({ value: 'b' })
  })

  it('默认不允许重复：重复提交不新增，输入框标记 aria-invalid', () => {
    const el = mount({ 'model-value': '["a"]' })
    typeValue(el, 'a')
    pressKey(el, 'Enter')
    expect(tagEls(el).length).toBe(1)
    expect(inputEl(el).getAttribute('aria-invalid')).toBe('true')
  })

  it('allow-duplicate 时允许重复', () => {
    const el = mount({ 'model-value': '["a"]', 'allow-duplicate': '' })
    typeValue(el, 'a')
    pressKey(el, 'Enter')
    expect(tagEls(el).length).toBe(2)
  })

  it('达到 max 后输入框禁用', () => {
    const el = mount({ max: '2', 'model-value': '["a","b"]' })
    expect(inputEl(el).disabled).toBe(true)
  })

  it('未达 max 输入框可用', () => {
    const el = mount({ max: '3', 'model-value': '["a"]' })
    expect(inputEl(el).disabled).toBe(false)
  })

  it('点击标签删除按钮移除标签并派发 oas-remove + oas-change', () => {
    const el = mount({ 'model-value': '["a","b"]' })
    const events: string[] = []
    el.addEventListener('oas-remove', () => events.push('remove'))
    el.addEventListener('oas-change', () => events.push('change'))
    removeBtn(el, 0).click()
    expect(tagEls(el).length).toBe(1)
    expect(tagEls(el)[0]!.textContent).toContain('b')
    expect(events).toEqual(['remove', 'change'])
  })

  it('placeholder 透传到输入框', () => {
    const el = mount({ placeholder: '请输入标签' })
    expect(inputEl(el).placeholder).toBe('请输入标签')
  })

  it('disabled 时输入框与删除按钮禁用', () => {
    const el = mount({ disabled: '', 'model-value': '["a"]' })
    expect(inputEl(el).disabled).toBe(true)
    expect(removeBtn(el, 0).disabled).toBe(true)
  })

  it('删除按钮可聚焦且带 aria-label', () => {
    const el = mount({ 'model-value': '["a"]' })
    const btn = removeBtn(el, 0)
    expect(btn.getAttribute('aria-label')).toBe('移除 a')
    btn.focus()
    expect(el.shadowRoot!.activeElement).toBe(btn)
  })

  it('受控：外部设置 modelValue 属性即时同步', () => {
    const el = mount()
    el.modelValue = ['x']
    expect(tagEls(el).length).toBe(1)
    expect(el.getAttribute('model-value')).toContain('x')
  })

  it('空值输入 Enter 不新增标签', () => {
    const el = mount()
    typeValue(el, '   ')
    pressKey(el, 'Enter')
    expect(tagEls(el).length).toBe(0)
  })
})
