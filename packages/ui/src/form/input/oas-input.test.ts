import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASInput } from './index.js'
import '../../framework/config-provider/index.js'

function mount(attrs: Record<string, string> = {}): OASInput {
  const el = new OASInput()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function input(el: OASInput): HTMLInputElement {
  return el.shadowRoot!.querySelector('input')!
}

function styleText(el: OASInput): string {
  return el.shadowRoot!.querySelector('style')?.textContent ?? ''
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

describe('OASInput 全局禁用注入（config-provider disabled）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('provider disabled：input 无显式 disabled 时继承禁用 + 宿主 data-disabled 镜像', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('disabled', '')
    const el = new OASInput()
    cp.appendChild(el)
    document.body.appendChild(cp)

    expect(input(el).disabled).toBe(true)
    expect(el.hasAttribute('data-disabled')).toBe(true)
  })

  it('provider disabled + disabled-skip：输入框保持可用（不镜像禁用标记）', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('disabled', '')
    const el = new OASInput()
    el.setAttribute('disabled-skip', '')
    cp.appendChild(el)
    document.body.appendChild(cp)

    expect(input(el).disabled).toBe(false)
    expect(el.hasAttribute('data-disabled')).toBe(false)
  })

  it('显式 disabled 优先：无 provider 时自身 disabled 仍生效且镜像', () => {
    const el = new OASInput()
    el.setAttribute('disabled', '')
    document.body.appendChild(el)
    expect(input(el).disabled).toBe(true)
    expect(el.hasAttribute('data-disabled')).toBe(true)
  })

  it('provider 移除 disabled 后恢复可用，镜像标记清除', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('disabled', '')
    const el = new OASInput()
    cp.appendChild(el)
    document.body.appendChild(cp)
    expect(input(el).disabled).toBe(true)

    cp.removeAttribute('disabled')
    expect(input(el).disabled).toBe(false)
    expect(el.hasAttribute('data-disabled')).toBe(false)
  })
})

// ---- 能力补齐：尺寸 / 形态 / 校验态 / 原生透传 / 事件方法 / addon slot / 计数增强 / 超限 / 格式化 / 清除显隐 / 自适应宽 ----

describe('OASInput 能力补齐', () => {
  function part(el: OASInput, name: string): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)!
  }

  function countEl(el: OASInput): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('.count')!
  }

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  // ---- size 尺寸档位 ----

  it('size/variant/status 等新属性进入 observedAttributes', () => {
    const attrs = OASInput.observedAttributes
    for (const name of [
      'size',
      'variant',
      'status',
      'name',
      'autocomplete',
      'autofocus',
      'inputmode',
      'minlength',
      'required',
      'spellcheck',
      'enterkeyhint',
      'pattern',
      'count-position',
      'allow-over-max',
      'show-clear-on',
      'auto-width',
      'auto-width-min',
      'auto-width-max',
    ]) {
      expect(attrs).toContain(name)
    }
  })

  it('size 默认 medium（data-size 镜像）', () => {
    const el = mount()
    expect(el.getAttribute('data-size')).toBe('medium')
  })

  it('size=small 镜像 data-size，切 large 增量更新', () => {
    const el = mount({ size: 'small' })
    expect(el.getAttribute('data-size')).toBe('small')
    const i = input(el)
    el.setAttribute('size', 'large')
    expect(el.getAttribute('data-size')).toBe('large')
    expect(input(el)).toBe(i)
  })

  it('非法 size 回落 medium', () => {
    const el = mount({ size: 'huge' })
    expect(el.getAttribute('data-size')).toBe('medium')
  })

  it('size 样式档位规则存在（small/large 高度与字号）', () => {
    const el = mount()
    const css = styleText(el)
    expect(css).toContain("[data-size='small']")
    expect(css).toContain("[data-size='large']")
    expect(css).toContain('--oas-control-height-sm')
    expect(css).toContain('--oas-control-height-lg')
  })

  it('config-provider 注入 size：无自身属性时继承，自身属性优先', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('size', 'small')
    const el = new OASInput()
    cp.appendChild(el)
    document.body.appendChild(cp)
    expect(el.getAttribute('data-size')).toBe('small')
    el.setAttribute('size', 'large')
    expect(el.getAttribute('data-size')).toBe('large')
  })

  // ---- variant 形态 ----

  it('variant 默认 outlined（data-variant 镜像）', () => {
    const el = mount()
    expect(el.getAttribute('data-variant')).toBe('outlined')
  })

  it('variant=filled/borderless 镜像，非法值回落 outlined', () => {
    const el = mount({ variant: 'filled' })
    expect(el.getAttribute('data-variant')).toBe('filled')
    el.setAttribute('variant', 'borderless')
    expect(el.getAttribute('data-variant')).toBe('borderless')
    el.setAttribute('variant', 'fancy')
    expect(el.getAttribute('data-variant')).toBe('outlined')
  })

  it('variant 形态样式规则存在（filled/borderless）', () => {
    const css = styleText(mount())
    expect(css).toContain("[data-variant='filled']")
    expect(css).toContain("[data-variant='borderless']")
  })

  // ---- status 校验态 ----

  it('status=error：data-status 镜像 + 内层 input 标 aria-invalid', () => {
    const el = mount({ status: 'error' })
    expect(el.getAttribute('data-status')).toBe('error')
    expect(input(el).getAttribute('aria-invalid')).toBe('true')
  })

  it('status=warning/success：镜像 data-status，不设 aria-invalid', () => {
    const warn = mount({ status: 'warning' })
    expect(warn.getAttribute('data-status')).toBe('warning')
    expect(input(warn).getAttribute('aria-invalid')).toBeNull()
    const ok = mount({ status: 'success' })
    expect(ok.getAttribute('data-status')).toBe('success')
    expect(input(ok).getAttribute('aria-invalid')).toBeNull()
  })

  it('移除 status 后镜像与 aria-invalid 清理', () => {
    const el = mount({ status: 'error' })
    el.removeAttribute('status')
    expect(el.hasAttribute('data-status')).toBe(false)
    expect(input(el).getAttribute('aria-invalid')).toBeNull()
  })

  it('status 样式规则存在（error/warning/success）', () => {
    const css = styleText(mount())
    expect(css).toContain("[data-status='error']")
    expect(css).toContain("[data-status='warning']")
    expect(css).toContain("[data-status='success']")
  })

  // ---- 原生属性透传包 ----

  it('name/autocomplete/inputmode/minlength/enterkeyhint/spellcheck/pattern 透传到原生 input', () => {
    const el = mount({
      name: 'username',
      autocomplete: 'username',
      inputmode: 'numeric',
      minlength: '2',
      enterkeyhint: 'search',
      spellcheck: 'false',
      pattern: '[a-z]+',
    })
    const i = input(el)
    expect(i.getAttribute('name')).toBe('username')
    expect(i.getAttribute('autocomplete')).toBe('username')
    expect(i.getAttribute('inputmode')).toBe('numeric')
    expect(i.getAttribute('minlength')).toBe('2')
    expect(i.getAttribute('enterkeyhint')).toBe('search')
    expect(i.getAttribute('spellcheck')).toBe('false')
    expect(i.getAttribute('pattern')).toBe('[a-z]+')
  })

  it('required/autofocus 透传', () => {
    const el = mount({ required: '', autofocus: '' })
    const i = input(el)
    expect(i.required).toBe(true)
    expect(i.hasAttribute('required')).toBe(true)
    expect(i.hasAttribute('autofocus')).toBe(true)
  })

  it('移除透传属性后原生 input 同步解除', () => {
    const el = mount({ minlength: '2', name: 'a' })
    el.removeAttribute('minlength')
    el.removeAttribute('name')
    const i = input(el)
    expect(i.hasAttribute('minlength')).toBe(false)
    expect(i.hasAttribute('name')).toBe(false)
  })

  it('透传属性增量更新不重建 input 引用', () => {
    const el = mount({ name: 'a' })
    const i = input(el)
    el.setAttribute('name', 'b')
    expect(input(el)).toBe(i)
    expect(i.getAttribute('name')).toBe('b')
  })

  // ---- oas-focus / oas-blur / oas-change 事件 ----

  it('内层 input 聚焦派发 oas-focus，detail 携带 value', () => {
    const el = mount({ value: 'hi' })
    let detail: unknown
    el.addEventListener('oas-focus', (e: Event) => (detail = (e as CustomEvent).detail))
    input(el).dispatchEvent(new FocusEvent('focus'))
    expect(detail).toEqual({ value: 'hi' })
  })

  it('内层 input 失焦派发 oas-blur，detail 携带 value', () => {
    const el = mount({ value: 'hi' })
    let detail: unknown
    el.addEventListener('oas-blur', (e: Event) => (detail = (e as CustomEvent).detail))
    input(el).dispatchEvent(new FocusEvent('blur'))
    expect(detail).toEqual({ value: 'hi' })
  })

  it('输入后失焦派发 oas-change（提交语义），detail 携带新值', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    input(el).dispatchEvent(new FocusEvent('focus'))
    input(el).value = 'x'
    input(el).dispatchEvent(new Event('input'))
    input(el).dispatchEvent(new FocusEvent('blur'))
    expect(detail).toEqual({ value: 'x' })
  })

  it('值未变化的失焦不派发 oas-change', () => {
    const el = mount({ value: 'a' })
    let fired = false
    el.addEventListener('oas-change', () => (fired = true))
    input(el).dispatchEvent(new FocusEvent('focus'))
    input(el).dispatchEvent(new FocusEvent('blur'))
    expect(fired).toBe(false)
  })

  it('按 Enter 提交派发 oas-change', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    input(el).dispatchEvent(new FocusEvent('focus'))
    input(el).value = 'x'
    input(el).dispatchEvent(new Event('input'))
    input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(detail).toEqual({ value: 'x' })
  })

  it('同一值重复失焦不重复派发 oas-change', () => {
    const el = mount()
    let count = 0
    el.addEventListener('oas-change', () => count++)
    input(el).dispatchEvent(new FocusEvent('focus'))
    input(el).value = 'x'
    input(el).dispatchEvent(new Event('input'))
    input(el).dispatchEvent(new FocusEvent('blur'))
    input(el).dispatchEvent(new FocusEvent('focus'))
    input(el).dispatchEvent(new FocusEvent('blur'))
    expect(count).toBe(1)
  })

  it('受控回写 value 后失焦不误报 oas-change', () => {
    const el = mount()
    input(el).dispatchEvent(new FocusEvent('focus'))
    input(el).value = 'x'
    input(el).dispatchEvent(new Event('input'))
    el.setAttribute('value', 'host-value')
    let fired = false
    el.addEventListener('oas-change', () => (fired = true))
    input(el).dispatchEvent(new FocusEvent('blur'))
    expect(fired).toBe(false)
  })

  it('清除按钮清空后失焦派发 oas-change（value 为空串）', () => {
    const el = mount({ clearable: '', value: 'abc' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector('button')!.click()
    input(el).dispatchEvent(new FocusEvent('blur'))
    expect(detail).toEqual({ value: '' })
  })

  // ---- blur() / select() 方法 ----

  it('host.blur() 委托到 shadow 内主输入', () => {
    const el = mount()
    const i = input(el)
    const spy = vi.spyOn(i, 'blur')
    el.blur()
    expect(spy).toHaveBeenCalled()
  })

  it('select() 委托到 shadow 内主输入', () => {
    const el = mount({ value: 'hello' })
    const i = input(el)
    const spy = vi.spyOn(i, 'select')
    el.select()
    expect(spy).toHaveBeenCalled()
  })

  // ---- addon 复杂内容 slot（prepend / append） ----

  function addonSlot(el: OASInput, name: string): HTMLSlotElement {
    return el.shadowRoot!.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)!
  }

  it('slot=prepend 分发复杂内容：addon 可见 + host 打 data-slot-prepend', async () => {
    const el = mount()
    const sel = document.createElement('span')
    sel.textContent = '.com'
    sel.setAttribute('slot', 'prepend')
    el.appendChild(sel)
    await new Promise((r) => setTimeout(r, 0))
    expect(addonSlot(el, 'prepend').assignedNodes()).toContain(sel)
    expect(part(el, 'prepend').hidden).toBe(false)
    expect(el.hasAttribute('data-slot-prepend')).toBe(true)
  })

  it('slot=append 分发：append addon 可见 + data-slot-append', async () => {
    const el = mount()
    const btn = document.createElement('span')
    btn.textContent = 'BTN'
    btn.setAttribute('slot', 'append')
    el.appendChild(btn)
    await new Promise((r) => setTimeout(r, 0))
    expect(part(el, 'append').hidden).toBe(false)
    expect(el.hasAttribute('data-slot-append')).toBe(true)
  })

  it('addon-before 属性文本作为 slot fallback：slot 分发时被替换，移除分发后回落', async () => {
    const el = mount({ 'addon-before': 'http://' })
    expect(part(el, 'prepend').textContent).toContain('http://')
    const node = document.createElement('span')
    node.textContent = 'https://'
    node.setAttribute('slot', 'prepend')
    el.appendChild(node)
    await new Promise((r) => setTimeout(r, 0))
    expect(part(el, 'prepend').hidden).toBe(false)
    el.removeChild(node)
    await new Promise((r) => setTimeout(r, 0))
    expect(part(el, 'prepend').hidden).toBe(false)
    expect(part(el, 'prepend').textContent).toContain('http://')
    expect(el.hasAttribute('data-slot-prepend')).toBe(false)
  })

  it('addon slot 场景的圆角合并规则存在（data-slot-prepend/append）', () => {
    const css = styleText(mount())
    expect(css).toContain('[data-slot-prepend]')
    expect(css).toContain('[data-slot-append]')
  })

  // ---- count-position + grapheme 计数 ----

  it('count-position 默认 outside，inside 时 count 标记 data-position', () => {
    const el = mount({ 'show-count': '', value: 'abc' })
    expect(countEl(el).getAttribute('data-position')).toBe('outside')
    el.setAttribute('count-position', 'inside')
    expect(countEl(el).getAttribute('data-position')).toBe('inside')
  })

  it('inside 计数渲染在输入区内（.inner 内部），host 打 data-count-inside 驱动布局', () => {
    const el = mount({ 'show-count': '', 'count-position': 'inside', value: 'abc' })
    expect(countEl(el).closest('.inner')).not.toBeNull()
    expect(el.hasAttribute('data-count-inside')).toBe(true)
    el.removeAttribute('count-position')
    expect(el.hasAttribute('data-count-inside')).toBe(false)
  })

  it('grapheme 计数：emoji 按字素聚簇计数（👍a = 2）', () => {
    const el = mount({ 'show-count': '', value: '👍a' })
    expect(countEl(el).textContent).toBe('2')
  })

  it('grapheme 计数：ZWJ 组合家庭 emoji 计 1（Intl.Segmenter）', () => {
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const el = mount({ 'show-count': '', value: '👨‍👩‍👧' })
      expect(countEl(el).textContent).toBe('1')
    }
  })

  it('grapheme 计数 + maxlength 显示 当前字素数/上限', () => {
    const el = mount({ 'show-count': '', maxlength: '5', value: '👍ab' })
    expect(countEl(el).textContent).toBe('3/5')
  })

  // ---- allow-over-max 超限不截断 + oas-validate ----

  it('allow-over-max：maxlength 不再透传原生（超限可继续输入）', () => {
    const el = mount({ maxlength: '3', 'allow-over-max': '' })
    expect(input(el).hasAttribute('maxlength')).toBe(false)
    el.removeAttribute('allow-over-max')
    expect(input(el).getAttribute('maxlength')).toBe('3')
  })

  it('allow-over-max + 预置超限值：计数标 data-over 但不截断', () => {
    const el = mount({ maxlength: '2', 'allow-over-max': '', 'show-count': '', value: 'abc' })
    expect(input(el).value).toBe('abc')
    expect(countEl(el).textContent).toBe('3/2')
    expect(countEl(el).getAttribute('data-over')).toBe('true')
  })

  it('输入越过上限派发 oas-validate（error=exceed-maximum），回落派发 error=null', () => {
    const el = mount({ maxlength: '2', 'allow-over-max': '', 'show-count': '' })
    const details: unknown[] = []
    el.addEventListener('oas-validate', (e: Event) => details.push((e as CustomEvent).detail))
    input(el).value = 'abc'
    input(el).dispatchEvent(new Event('input'))
    expect(details).toEqual([{ error: 'exceed-maximum' }])
    input(el).value = 'ab'
    input(el).dispatchEvent(new Event('input'))
    expect(details).toEqual([{ error: 'exceed-maximum' }, { error: null }])
  })

  it('持续超限不重复派发 oas-validate', () => {
    const el = mount({ maxlength: '2', 'allow-over-max': '', 'show-count': '' })
    let count = 0
    el.addEventListener('oas-validate', () => count++)
    input(el).value = 'abc'
    input(el).dispatchEvent(new Event('input'))
    input(el).value = 'abcd'
    input(el).dispatchEvent(new Event('input'))
    expect(count).toBe(1)
  })

  // ---- formatter / parser（仅 property 通道） ----

  const thousand = (v: string): string => v.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const unthousand = (v: string): string => v.replace(/,/g, '')

  it('formatter 设置后显示格式化（千分位）', () => {
    const el = mount({ value: '1234567' })
    expect(input(el).value).toBe('1234567')
    el.formatter = thousand
    expect(input(el).value).toBe('1,234,567')
  })

  it('parser 设置后 oas-input 事件携带解析值', () => {
    const el = mount()
    el.formatter = thousand
    el.parser = unthousand
    let detail: unknown
    el.addEventListener('oas-input', (e: Event) => (detail = (e as CustomEvent).detail))
    input(el).value = '1234'
    input(el).dispatchEvent(new Event('input'))
    expect(detail).toEqual({ value: '1234' })
    expect(input(el).value).toBe('1,234')
  })

  it('无 parser 时事件携带显示值', () => {
    const el = mount()
    el.formatter = (v) => v.toUpperCase()
    let detail: unknown
    el.addEventListener('oas-input', (e: Event) => (detail = (e as CustomEvent).detail))
    input(el).value = 'abc'
    input(el).dispatchEvent(new Event('input'))
    expect(input(el).value).toBe('ABC')
    expect(detail).toEqual({ value: 'ABC' })
  })

  it('移除 formatter（置 null）后显示回原始值', () => {
    const el = mount({ value: '1234567' })
    el.formatter = thousand
    expect(input(el).value).toBe('1,234,567')
    el.formatter = null
    expect(input(el).value).toBe('1234567')
  })

  it('formatter 在场时受控 value 属性变化重新格式化显示', () => {
    const el = mount({ value: '1234' })
    el.formatter = thousand
    el.parser = unthousand
    el.setAttribute('value', '9876543')
    expect(input(el).value).toBe('9,876,543')
  })

  // ---- show-clear-on 清除按钮显隐策略 ----

  it('show-clear-on 默认 always：有值即显（现状不变），不写 data-clear-on', () => {
    const el = mount({ clearable: '', value: 'x' })
    expect(el.hasAttribute('data-clear-on')).toBe(false)
    expect(el.shadowRoot!.querySelector('button')!.hidden).toBe(false)
  })

  it('show-clear-on=focus/hover：host 镜像 data-clear-on（CSS 控制显隐），hidden 机制不变', () => {
    const el = mount({ clearable: '', value: 'x', 'show-clear-on': 'focus' })
    expect(el.getAttribute('data-clear-on')).toBe('focus')
    expect(el.shadowRoot!.querySelector('button')!.hidden).toBe(false)
    el.setAttribute('show-clear-on', 'hover')
    expect(el.getAttribute('data-clear-on')).toBe('hover')
  })

  it('非法 show-clear-on 回落 always（不写 data-clear-on）', () => {
    const el = mount({ clearable: '', value: 'x', 'show-clear-on': 'sometimes' })
    expect(el.hasAttribute('data-clear-on')).toBe(false)
  })

  it('show-clear-on 显隐规则存在（focus/hover 隐藏选择器）', () => {
    const css = styleText(mount())
    expect(css).toContain("[data-clear-on='focus']")
    expect(css).toContain("[data-clear-on='hover']")
  })

  // ---- auto-width 宽度自适应（mirror 测宽） ----

  function mirror(el: OASInput): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('.measure')!
  }

  it('auto-width：host 打 data-auto-width，shadow 内渲染测宽 mirror', () => {
    const el = mount({ 'auto-width': '' })
    expect(el.hasAttribute('data-auto-width')).toBe(true)
    expect(mirror(el)).not.toBeNull()
    el.removeAttribute('auto-width')
    expect(el.hasAttribute('data-auto-width')).toBe(false)
  })

  it('mirror 文本随 value 同步，空值回落 placeholder', () => {
    const el = mount({ 'auto-width': '', value: 'hello', placeholder: '请输入' })
    expect(mirror(el).textContent).toBe('hello')
    el.setAttribute('value', '')
    expect(mirror(el).textContent).toBe('请输入')
  })

  it('测量结果写入 --oas-input-measured，min/max 写入钳制变量', () => {
    const el = mount({
      'auto-width': '',
      'auto-width-min': '80',
      'auto-width-max': '300',
      value: 'hi',
    })
    expect(el.style.getPropertyValue('--oas-input-auto-min')).toBe('80px')
    expect(el.style.getPropertyValue('--oas-input-auto-max')).toBe('300px')
    Object.defineProperty(mirror(el), 'offsetWidth', { value: 120, configurable: true })
    el.setAttribute('value', 'hello')
    expect(el.style.getPropertyValue('--oas-input-measured')).toBe('120px')
  })

  it('测量失败（offsetWidth=0）不写入宽度（回落 CSS 100%）', () => {
    const el = mount({ 'auto-width': '', value: 'hello' })
    Object.defineProperty(mirror(el), 'offsetWidth', { value: 0, configurable: true })
    el.setAttribute('value', 'world')
    expect(el.style.getPropertyValue('--oas-input-measured')).toBe('')
  })

  it('输入时实时重测宽度', () => {
    const el = mount({ 'auto-width': '', value: 'a' })
    Object.defineProperty(mirror(el), 'offsetWidth', { value: 50, configurable: true })
    input(el).value = 'longer text'
    input(el).dispatchEvent(new Event('input'))
    expect(el.style.getPropertyValue('--oas-input-measured')).toBe('50px')
  })
})
