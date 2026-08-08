import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASForm } from './index.js'
function mount(): OASForm {
  const el = new OASForm()
  el.setAttribute(
    'rules',
    JSON.stringify({
      name: [{ required: true, message: '请输入姓名' }],
      email: [
        { required: true, message: '请输入邮箱' },
        { pattern: '^\\S+@\\S+$', message: '邮箱格式不正确' },
      ],
    }),
  )
  el.innerHTML = `
    <oas-input name="name" value=""></oas-input>
    <oas-input name="email" value=""></oas-input>
  `
  document.body.appendChild(el)
  return el
}

describe('OASForm', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 form，含 slot', async () => {
    const el = mount()
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('form')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
  })

  it('校验通过时派发 oas-submit，detail 携带 values', () => {
    const el = mount()
    const name = el.querySelector('oas-input[name="name"]')!
    const email = el.querySelector('oas-input[name="email"]')!
    name.setAttribute('value', '张三')
    email.setAttribute('value', 'zhang@example.com')
    let detail: unknown
    el.addEventListener('oas-submit', (e: Event) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    expect((detail as { values: Record<string, string> }).values).toEqual({
      name: '张三',
      email: 'zhang@example.com',
    })
  })

  it('校验失败不派发 oas-submit，错误项标记 aria-invalid', () => {
    const el = mount()
    let fired = 0
    el.addEventListener('oas-submit', () => fired++)
    el.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(fired).toBe(0)
    const name = el.querySelector('oas-input[name="name"]')!
    expect(name.hasAttribute('aria-invalid')).toBe(true)
  })

  it('pattern 不匹配时校验失败，getErrors 含错误消息', () => {
    const el = mount()
    el.querySelector('oas-input[name="name"]')!.setAttribute('value', '李四')
    el.querySelector('oas-input[name="email"]')!.setAttribute('value', 'bad-email')
    let fired = 0
    el.addEventListener('oas-submit', () => fired++)
    el.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(fired).toBe(0)
    const errors = (el as unknown as OASForm).getErrors()
    expect(Object.values(errors).some((m) => m.includes('邮箱格式'))).toBe(true)
  })

  it('校验失败后字段后有 .error-text 显示 message，修正后移除', () => {
    const el = mount()
    const submit = () =>
      el.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    const name = el.querySelector('oas-input[name="name"]')!
    const email = el.querySelector('oas-input[name="email"]')!

    // 首次提交全部为空，两个字段都校验失败
    submit()
    expect(name.hasAttribute('aria-invalid')).toBe(true)
    expect(email.hasAttribute('aria-invalid')).toBe(true)
    const nameError = name.nextElementSibling!
    expect(nameError.classList.contains('error-text')).toBe(true)
    expect(nameError.textContent).toBe('请输入姓名')
    expect(email.nextElementSibling!.textContent).toBe('请输入邮箱')

    // 修正后重新校验通过，错误元素移除
    name.setAttribute('value', '张三')
    email.setAttribute('value', 'zhang@example.com')
    submit()
    expect(name.hasAttribute('aria-invalid')).toBe(false)
    expect(email.hasAttribute('aria-invalid')).toBe(false)
    expect(el.querySelector('.error-text')).toBeNull()
  })
})
