import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASFormElement } from './form-element.js'

/** happy-dom 不支持 attachInternals → 这里用替身注入验证 plumbing；真实原生关联走浏览器 e2e */
class FixtureInput extends OASFormElement {
  static override get observedAttributes(): string[] {
    return ['value']
  }

  private inner: HTMLInputElement | null = null
  private current = ''

  protected override render(): void {
    this.shadow.innerHTML = '<input />'
    this.inner = this.shadow.querySelector('input')
    this.inner!.addEventListener('input', () => {
      this.current = this.inner!.value
      this.syncFormValue()
    })
  }

  protected override update(): void {
    if (this.inner) this.inner.value = this.getAttribute('value') ?? ''
    this.current = this.getAttribute('value') ?? ''
    this.syncFormValue()
  }

  protected getFormValue(): string | null {
    return this.current
  }

  protected resetFormValue(): void {
    this.current = this.getAttribute('value') ?? ''
    if (this.inner) this.inner.value = this.current
  }

  focusSpy(): void {}
}

customElements.define('oas-form-fixture', FixtureInput)

function mount(attrs: Record<string, string> = {}): FixtureInput {
  const el = document.createElement('oas-form-fixture') as FixtureInput
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

type FakeInternals = {
  setFormValue: ReturnType<typeof vi.fn>
  setValidity: ReturnType<typeof vi.fn>
  labels: null
  form: null
}

function fakeInternals(el: FixtureInput): FakeInternals {
  const fake: FakeInternals = { setFormValue: vi.fn(), setValidity: vi.fn(), labels: null, form: null }
  ;(el as unknown as { internals_: unknown }).internals_ = fake
  return fake
}

describe('OASFormElement（form-associated 公共机制）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('静态声明 formAssociated = true（沿静态原型链继承到组件类）', () => {
    expect(OASFormElement.formAssociated).toBe(true)
    expect((FixtureInput as unknown as { formAssociated: boolean }).formAssociated).toBe(true)
  })

  it('环境不支持 ElementInternals 时静默降级（labels/form 为 null，不抛错）', () => {
    const el = mount({ value: 'a' })
    expect(el.labels).toBeNull()
    expect(el.form).toBeNull()
  })

  it('值同步：受控写入与输入都调 setFormValue；reset 恢复初始值并重同步', () => {
    const el = mount({ value: 'init' })
    const fake = fakeInternals(el)

    // 受控写入（value 属性即「默认值」）
    el.setAttribute('value', 'attr-change')
    expect(fake.setFormValue).toHaveBeenLastCalledWith('attr-change')
    el.setAttribute('value', 'init')

    // 用户输入（不动属性 → 默认值仍是 init）
    const inner = el.shadowRoot!.querySelector('input')!
    inner.value = 'typed'
    inner.dispatchEvent(new Event('input'))
    expect(fake.setFormValue).toHaveBeenLastCalledWith('typed')

    // reset：回到 value 属性的初始值，不派发事件、重同步表单数据
    el.formResetCallback()
    expect(inner.value).toBe('init')
    expect(fake.setFormValue).toHaveBeenLastCalledWith('init')
  })

  it('校验代理：无 ElementInternals 环境静默降级（willValidate=false、checkValidity/reportValidity 视为通过）', () => {
    const el = mount({})
    expect(el.willValidate).toBe(false)
    expect(el.validity).toBeNull()
    expect(el.validationMessage).toBe('')
    expect(el.checkValidity()).toBe(true)
    expect(el.reportValidity()).toBe(true)
  })

  it('setValidity 透传：带 message 与不带 message 两个分支', () => {
    const el = mount({})
    const fake = {
      setFormValue: vi.fn(),
      setValidity: vi.fn(),
      willValidate: true,
      validity: { valid: false } as ValidityState,
      validationMessage: 'msg',
      checkValidity: vi.fn(() => false),
      reportValidity: vi.fn(() => false),
      labels: null,
      form: null,
    }
    ;(el as unknown as { internals_: unknown }).internals_ = fake
    const setValidity = (flags: ValidityStateFlags, message?: string): void =>
      (el as unknown as { setValidity(f: ValidityStateFlags, m?: string): void }).setValidity(flags, message)

    setValidity({ valueMissing: true })
    expect(fake.setValidity).toHaveBeenLastCalledWith({ valueMissing: true })
    setValidity({ valueMissing: true }, '')
    expect(fake.setValidity).toHaveBeenLastCalledWith({ valueMissing: true }, '', undefined)

    expect(el.willValidate).toBe(true)
    expect(el.validity).toEqual({ valid: false })
    expect(el.validationMessage).toBe('msg')
    expect(el.checkValidity()).toBe(false)
    expect(el.reportValidity()).toBe(false)
  })

  it('formDisabledCallback：表单链路禁用经注入通道并入，不回写 disabled 属性（防自锁）', () => {
    const el = mount({})
    const resolved = (target: FixtureInput): boolean =>
      (target as unknown as { injectDisabled(): boolean }).injectDisabled()

    el.formDisabledCallback(true)
    expect(el.hasAttribute('disabled'), '不回写 disabled 属性（否则解除时回调不再触发，自锁）').toBe(false)
    expect(resolved(el)).toBe(true)

    el.formDisabledCallback(false)
    expect(resolved(el)).toBe(false)

    // 组件显式 disabled 仍优先生效
    el.setAttribute('disabled', '')
    el.formDisabledCallback(false)
    expect(resolved(el)).toBe(true)
  })

  it('label 点击转焦点：派发在宿主上的 click 聚焦 shadow 内真实控件；shadow 内部点击不抢焦点', () => {
    const el = mount({})
    const inner = el.shadowRoot!.querySelector('input')!
    const focusSpy = vi.spyOn(inner, 'focus')

    el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(focusSpy).toHaveBeenCalledTimes(1)

    focusSpy.mockClear()
    inner.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(focusSpy).not.toHaveBeenCalled()
  })

  it('focus() 转到 shadow 内真实控件', () => {
    const el = mount({})
    const inner = el.shadowRoot!.querySelector('input')!
    const focusSpy = vi.spyOn(inner, 'focus')
    el.focus()
    expect(focusSpy).toHaveBeenCalledTimes(1)
  })
})
