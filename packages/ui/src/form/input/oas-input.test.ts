import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASInput } from './index.js'

function mount(attrs: Record<string, string> = {}): OASInput {
  const el = new OASInput()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function input(el: OASInput): HTMLInputElement {
  return el.shadowRoot!.querySelector('input')!
}

describe('OASInput', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 input，属性透传', async () => {
    const el = mount({ placeholder: '请输入', disabled: '' })
    const i = input(el)
    await Promise.resolve()
    expect(i.tagName).toBe('INPUT')
    expect(i.placeholder).toBe('请输入')
    expect(i.disabled).toBe(true)
  })

  it('type 属性透传到原生 input', () => {
    const el = mount({ type: 'password' })
    expect(input(el).type).toBe('password')
  })

  it('value 属性同步到 input.value（受控通道）', () => {
    const el = mount({ value: 'hello' })
    expect(input(el).value).toBe('hello')
  })

  it('外部改 value 属性后 input.value 增量同步', () => {
    const el = mount({ value: 'a' })
    const i = input(el)
    el.setAttribute('value', 'b')
    expect(input(el)).toBe(i)
    expect(i.value).toBe('b')
  })

  it('输入派发 oas-input，detail 携带 value', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-input', (e: Event) => (detail = (e as CustomEvent).detail))
    input(el).value = 'x'
    input(el).dispatchEvent(new Event('input'))
    expect(detail).toEqual({ value: 'x' })
  })

  it('clearable + 有值时渲染清除按钮，点击派发 oas-clear 并清空', () => {
    const el = mount({ clearable: '', value: 'abc' })
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn).not.toBeNull()
    let detail: unknown
    el.addEventListener('oas-clear', (e: Event) => (detail = e))
    btn.click()
    expect(input(el).value).toBe('')
    expect((detail as CustomEvent).bubbles).toBe(true)
  })

  it('无值时 clearable 按钮隐藏', () => {
    const el = mount({ clearable: '' })
    expect(el.shadowRoot!.querySelector('button')!.hidden).toBe(true)
  })

  it('空内容（仅占位符）时清除按钮隐藏', () => {
    const el = mount({ clearable: '', placeholder: '请输入' })
    expect(el.shadowRoot!.querySelector('button')!.hidden).toBe(true)
  })

  it('输入内容后清除按钮显示', () => {
    const el = mount({ clearable: '' })
    const i = input(el)
    i.value = 'abc'
    i.dispatchEvent(new Event('input'))
    expect(el.shadowRoot!.querySelector('button')!.hidden).toBe(false)
  })

  it('清空后清除按钮隐藏', () => {
    const el = mount({ clearable: '', value: 'abc' })
    const btn = el.shadowRoot!.querySelector('button')!
    btn.click()
    expect(btn.hidden).toBe(true)
  })

  it('disabled 时即使有值也隐藏清除按钮', () => {
    const el = mount({ clearable: '', value: 'abc', disabled: '' })
    expect(el.shadowRoot!.querySelector('button')!.hidden).toBe(true)
  })

  it('readonly 时即使有值也隐藏清除按钮', () => {
    const el = mount({ clearable: '', value: 'abc', readonly: '' })
    expect(el.shadowRoot!.querySelector('button')!.hidden).toBe(true)
  })

  it('属性变化增量更新：placeholder 变更不重建引用', () => {
    const el = mount({ placeholder: 'a' })
    const i = input(el)
    el.setAttribute('placeholder', 'b')
    expect(input(el)).toBe(i)
    expect(i.placeholder).toBe('b')
  })

  // ---- v1.3 addon / 图标增强 ----

  function part(el: OASInput, name: string): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)!
  }

  it('prepend/append 渲染 addon 文案块（独立 ::part）', () => {
    const el = mount({ 'addon-before': 'http://', 'addon-after': '.com' })
    const prepend = part(el, 'prepend')
    const append = part(el, 'append')
    expect(prepend.textContent).toBe('http://')
    expect(append.textContent).toBe('.com')
    expect(prepend.hidden).toBe(false)
    expect(append.hidden).toBe(false)
  })

  it('prepend/append 为空时 addon 区域隐藏', () => {
    const el = mount()
    expect(part(el, 'prepend').hidden).toBe(true)
    expect(part(el, 'append').hidden).toBe(true)
  })

  it('prefix/suffix 渲染内嵌文案', () => {
    const el = mount({ prefix: '$', suffix: '元' })
    expect(part(el, 'prefix').textContent).toBe('$')
    expect(part(el, 'suffix').textContent).toBe('元')
    expect(part(el, 'prefix').hidden).toBe(false)
  })

  it('prefix-icon/suffix-icon 用 iconRegistry 渲染内联 SVG', () => {
    const el = mount({ 'prefix-icon': 'search', 'suffix-icon': 'close' })
    expect(el.shadowRoot!.querySelector('[part="prefix-icon"] svg')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="suffix-icon"] svg')).not.toBeNull()
  })

  it('无效图标名不渲染 SVG，图标区域隐藏', () => {
    const el = mount({ 'prefix-icon': 'no-such-icon' })
    expect(el.shadowRoot!.querySelector('[part="prefix-icon"] svg')).toBeNull()
    expect(part(el, 'prefix-icon').hidden).toBe(true)
  })

  it('与 clearable 并存：addon + 清除按钮互不干扰', () => {
    const el = mount({ clearable: '', value: 'x', 'addon-before': 'http://' })
    const btn = el.shadowRoot!.querySelector('button')!
    btn.click()
    expect(input(el).value).toBe('')
  })

  it('disabled 时 addon 灰化（host 携带 disabled，addon 文案保留）', () => {
    const el = mount({ disabled: '', 'addon-after': '元' })
    const append = part(el, 'append')
    expect(append.textContent).toBe('元')
    expect(el.hasAttribute('disabled')).toBe(true)
  })

  it('属性变化增量更新 addon/图标，不重建 input 引用', () => {
    const el = mount({ 'addon-before': 'a' })
    const i = input(el)
    el.setAttribute('addon-before', 'b')
    el.setAttribute('prefix-icon', 'search')
    expect(input(el)).toBe(i)
    expect(part(el, 'prepend').textContent).toBe('b')
    expect(el.shadowRoot!.querySelector('[part="prefix-icon"] svg')).not.toBeNull()
  })

  // ---- v1.4 show-password / maxlength / show-count / oas-enter ----

  function eye(el: OASInput): HTMLButtonElement {
    return el.shadowRoot!.querySelector<HTMLButtonElement>('.eye-btn')!
  }

  function countEl(el: OASInput): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('.count')!
  }

  it('show-password：type=password 时渲染眼睛按钮，点击在明文/密文间切换', () => {
    const el = mount({ type: 'password', 'show-password': '', value: 'secret' })
    const btn = eye(el)
    expect(btn.hidden).toBe(false)
    expect(input(el).type).toBe('password')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('aria-label')).toBe('显示密码')
    btn.click()
    expect(input(el).type).toBe('text')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('aria-label')).toBe('隐藏密码')
    btn.click()
    expect(input(el).type).toBe('password')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
  })

  it('show-password：type 非 password 时眼睛按钮隐藏', () => {
    const el = mount({ 'show-password': '' })
    expect(eye(el).hidden).toBe(true)
    const pwd = mount({ type: 'password' })
    expect(eye(pwd).hidden).toBe(true)
  })

  it('show-password：disabled 时眼睛按钮隐藏且点击不生效', () => {
    const el = mount({ type: 'password', 'show-password': '', disabled: '' })
    expect(eye(el).hidden).toBe(true)
  })

  it('show-password：reveal 后外部属性变化触发 update() 不覆盖明文状态', () => {
    const el = mount({ type: 'password', 'show-password': '', value: 'x' })
    eye(el).click()
    expect(input(el).type).toBe('text')
    el.setAttribute('value', 'y')
    expect(input(el).type).toBe('text')
    expect(input(el).value).toBe('y')
  })

  it('show-password：从 password 切回 text 时重置 reveal 状态', () => {
    const el = mount({ type: 'password', 'show-password': '' })
    eye(el).click()
    expect(input(el).type).toBe('text')
    el.setAttribute('type', 'text')
    expect(input(el).type).toBe('text')
    el.setAttribute('type', 'password')
    expect(input(el).type).toBe('password')
  })

  it('maxlength 透传到原生 input', () => {
    const el = mount({ maxlength: '10' })
    expect(input(el).getAttribute('maxlength')).toBe('10')
    expect(input(el).maxLength).toBe(10)
  })

  it('移除 maxlength 属性后原生 input 解除限制', () => {
    const el = mount({ maxlength: '10' })
    el.removeAttribute('maxlength')
    expect(input(el).hasAttribute('maxlength')).toBe(false)
  })

  it('show-count：显示当前长度（无 maxlength）', () => {
    const el = mount({ 'show-count': '', value: 'abc' })
    expect(countEl(el).hidden).toBe(false)
    expect(countEl(el).textContent).toBe('3')
  })

  it('show-count + maxlength：显示 当前长度/maxlength', () => {
    const el = mount({ 'show-count': '', maxlength: '10', value: 'abc' })
    expect(countEl(el).textContent).toBe('3/10')
    expect(countEl(el).hasAttribute('data-over')).toBe(false)
  })

  it('show-count：超限时数字标 data-over（danger 色由 CSS 变量控制）', () => {
    const el = mount({ 'show-count': '', maxlength: '2', value: 'abc' })
    expect(countEl(el).textContent).toBe('3/2')
    expect(countEl(el).getAttribute('data-over')).toBe('true')
  })

  it('show-count：无 show-count 属性时计数元素隐藏', () => {
    const el = mount({ value: 'abc' })
    expect(countEl(el).hidden).toBe(true)
  })

  it('show-count：输入时计数实时更新，回退到限制内清除 data-over', () => {
    const el = mount({ 'show-count': '', maxlength: '10' })
    const i = input(el)
    i.value = 'hello'
    i.dispatchEvent(new Event('input'))
    expect(countEl(el).textContent).toBe('5/10')
    i.value = 'hello world'
    i.dispatchEvent(new Event('input'))
    expect(countEl(el).textContent).toBe('11/10')
    expect(countEl(el).getAttribute('data-over')).toBe('true')
  })

  it('按 Enter 派发 oas-enter，detail 携带当前 value', () => {
    const el = mount({ value: 'hi' })
    let detail: unknown
    el.addEventListener('oas-enter', (e: Event) => (detail = (e as CustomEvent).detail))
    input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(detail).toEqual({ value: 'hi' })
  })

  it('输入法组合（isComposing）中按 Enter 不派发 oas-enter', () => {
    const el = mount()
    let fired = false
    el.addEventListener('oas-enter', () => (fired = true))
    input(el).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true }),
    )
    expect(fired).toBe(false)
  })

  it('非 Enter 按键不派发 oas-enter', () => {
    const el = mount()
    let fired = false
    el.addEventListener('oas-enter', () => (fired = true))
    input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(fired).toBe(false)
  })

  // ---- slot 内容分发（prefix / suffix slot，attribute 通道保留为 fallback） ----

  function slotOf(el: OASInput, name: string): HTMLSlotElement {
    return el.shadowRoot!.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)!
  }

  it('无 slot 分发时回落 attribute 文本（fallback 渲染，现状行为不变）', () => {
    const el = mount({ prefix: '$', suffix: '元' })
    expect(slotOf(el, 'prefix').assignedNodes().length).toBe(0)
    expect(slotOf(el, 'suffix').assignedNodes().length).toBe(0)
    expect(part(el, 'prefix').textContent).toContain('$')
    expect(part(el, 'suffix').textContent).toContain('元')
    expect(part(el, 'prefix').hidden).toBe(false)
    expect(el.hasAttribute('data-slot-prefix')).toBe(false)
    expect(el.hasAttribute('data-slot-suffix')).toBe(false)
  })

  it('slot 分发内容替换 fallback，host 同步 data-slot-prefix', async () => {
    const el = mount({ prefix: '$' })
    const icon = document.createElement('span')
    icon.textContent = 'ICON'
    icon.setAttribute('slot', 'prefix')
    el.appendChild(icon)
    await new Promise((r) => setTimeout(r, 0))
    expect(slotOf(el, 'prefix').assignedNodes()).toContain(icon)
    expect(part(el, 'prefix').hidden).toBe(false)
    expect(el.hasAttribute('data-slot-prefix')).toBe(true)
    // fallback 文本仍在树中（分发时不渲染，attribute 文本被替换）
    const fallback = el.shadowRoot!.querySelector<HTMLElement>('[part="prefix"] [data-fallback]')!
    expect(fallback.textContent).toBe('$')
  })

  it('slot 有内容时 attribute 文本变更只更新 fallback，分发内容不受影响', async () => {
    const el = mount({ prefix: '$' })
    const icon = document.createElement('span')
    icon.textContent = 'ICON'
    icon.setAttribute('slot', 'prefix')
    el.appendChild(icon)
    await new Promise((r) => setTimeout(r, 0))
    el.setAttribute('prefix', '¥')
    expect(slotOf(el, 'prefix').assignedNodes()).toContain(icon)
    expect(part(el, 'prefix').hidden).toBe(false)
    expect(el.hasAttribute('data-slot-prefix')).toBe(true)
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="prefix"] [data-fallback]')!.textContent,
    ).toBe('¥')
  })

  it('动态增删 slot 内容：slotchange 后显隐与 data-slot-prefix 同步', async () => {
    const el = mount()
    expect(part(el, 'prefix').hidden).toBe(true)
    expect(el.hasAttribute('data-slot-prefix')).toBe(false)
    const icon = document.createElement('span')
    icon.textContent = 'ICON'
    icon.setAttribute('slot', 'prefix')
    el.appendChild(icon)
    await new Promise((r) => setTimeout(r, 0))
    expect(part(el, 'prefix').hidden).toBe(false)
    expect(el.hasAttribute('data-slot-prefix')).toBe(true)
    el.removeChild(icon)
    await new Promise((r) => setTimeout(r, 0))
    expect(part(el, 'prefix').hidden).toBe(true)
    expect(el.hasAttribute('data-slot-prefix')).toBe(false)
  })

  it('suffix slot 同样驱动显隐与 data-slot-suffix', async () => {
    const el = mount()
    const span = document.createElement('span')
    span.textContent = 'SUFFIX'
    span.setAttribute('slot', 'suffix')
    el.appendChild(span)
    await new Promise((r) => setTimeout(r, 0))
    expect(slotOf(el, 'suffix').assignedNodes()).toContain(span)
    expect(part(el, 'suffix').hidden).toBe(false)
    expect(el.hasAttribute('data-slot-suffix')).toBe(true)
    el.removeChild(span)
    await new Promise((r) => setTimeout(r, 0))
    expect(el.hasAttribute('data-slot-suffix')).toBe(false)
    expect(part(el, 'suffix').hidden).toBe(true)
  })
})

describe('OASInput focus 委托', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('host.focus() 委托到 shadow 内主输入', () => {
    const el = new OASInput()
    document.body.appendChild(el)
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('input'))
  })
})
