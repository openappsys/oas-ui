import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASForm, registerFormControl } from './index.js'
import type { Rule } from './index.js'
import { OASFormItem } from '../form-item/index.js'
import { OASInput } from '../input/index.js'
import '../switch/index.js'
import '../transfer/index.js'
import '../checkbox/index.js'
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

  it('submit() 走 requestSubmit：校验通过时与点击提交派发同样的 oas-submit 与 values', () => {
    const el = mount()
    const name = el.querySelector('oas-input[name="name"]')!
    const email = el.querySelector('oas-input[name="email"]')!
    name.setAttribute('value', '张三')
    email.setAttribute('value', 'zhang@example.com')
    let detail: unknown
    el.addEventListener('oas-submit', (e: Event) => (detail = (e as CustomEvent).detail))
    el.submit()
    expect((detail as { values: Record<string, string> }).values).toEqual({
      name: '张三',
      email: 'zhang@example.com',
    })
  })

  it('submit() 校验失败路径派发 oas-validate-fail，不派发 oas-submit', () => {
    const el = mount()
    let submitFired = 0
    let failDetail: unknown
    el.addEventListener('oas-submit', () => submitFired++)
    el.addEventListener('oas-validate-fail', (e: Event) => (failDetail = (e as CustomEvent).detail))
    el.submit()
    expect(submitFired).toBe(0)
    const name = el.querySelector('oas-input[name="name"]')!
    expect(name.hasAttribute('aria-invalid')).toBe(true)
    expect((failDetail as { errors: Record<string, string> }).errors.name).toBe('请输入姓名')
  })

  it('collectFields 覆盖常用控件（switch/transfer/date-picker/slider/rate）', () => {
    const el = new OASForm()
    el.innerHTML = `
      <oas-switch name="enabled" checked></oas-switch>
      <oas-transfer name="sel" model-value='["a","b"]'></oas-transfer>
      <oas-date-picker name="birth" value="2026-08-27"></oas-date-picker>
      <oas-slider name="age" value="25"></oas-slider>
      <oas-rate name="score" value="4"></oas-rate>
    `
    document.body.appendChild(el)
    let detail: unknown
    el.addEventListener('oas-submit', (e: Event) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    expect((detail as { values: Record<string, string> }).values).toEqual({
      enabled: 'true',
      sel: '["a","b"]',
      birth: '2026-08-27',
      age: '25',
      score: '4',
    })
  })

  it('collectFields 覆盖 dynamic-input（model-value 通道，复合系遗留补注册）', () => {
    const el = new OASForm()
    el.innerHTML = `
      <oas-dynamic-input name="env" model-value='[{"key":"A","value":"1"}]'></oas-dynamic-input>
    `
    document.body.appendChild(el)
    let detail: unknown
    el.addEventListener('oas-submit', (e: Event) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    expect((detail as { values: Record<string, string> }).values).toEqual({
      env: '[{"key":"A","value":"1"}]',
    })
  })

  it('registerFormControl 允许收集自定义控件', () => {
    const unreg = registerFormControl('oas-custom-field', (el) => el.getAttribute('model-value'))
    try {
      const el = new OASForm()
      el.innerHTML = '<oas-custom-field name="x" model-value="hello"></oas-custom-field>'
      document.body.appendChild(el)
      let detail: unknown
      el.addEventListener('oas-submit', (e: Event) => (detail = (e as CustomEvent).detail))
      el.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
      expect((detail as { values: Record<string, string> }).values).toEqual({ x: 'hello' })
    } finally {
      unreg()
    }
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
    const submit = () => el.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
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

describe('OASForm 行内布局（inline）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountInline(attrs: Record<string, string> = {}): OASForm {
    const el = new OASForm()
    el.setAttribute('inline', '')
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    document.body.appendChild(el)
    return el
  }

  it('inline：form 元素为可换行 flex 行，项间距默认 var(--oas-space-4)', () => {
    const el = mountInline()
    const form = el.shadowRoot!.querySelector('form')!
    expect(form.style.display).toBe('flex')
    expect(form.style.flexWrap).toBe('wrap')
    expect(form.style.alignItems).toBe('flex-start')
    expect(form.style.gap).toBe('var(--oas-space-4)')
  })

  it('inline：gap 属性可覆盖默认项间距', () => {
    const el = mountInline({ gap: 'var(--oas-space-2)' })
    const form = el.shadowRoot!.querySelector('form')!
    expect(form.style.gap).toBe('var(--oas-space-2)')
  })

  it('inline：host 暴露 --oas-form-layout=inline 与 --oas-form-label-align=left', () => {
    const el = mountInline()
    expect(el.style.getPropertyValue('--oas-form-layout')).toBe('inline')
    expect(el.style.getPropertyValue('--oas-form-label-align')).toBe('left')
  })

  it('inline 与 layout 并存：inline 优先于 grid（display flex、无 grid 列）', () => {
    const el = mountInline({ layout: 'grid' })
    const form = el.shadowRoot!.querySelector('form')!
    expect(form.style.display).toBe('flex')
    expect(form.style.gridTemplateColumns).toBe('')
  })

  it('inline 移除后回退 vertical（块级、无 flex）', () => {
    const el = mountInline()
    const form = el.shadowRoot!.querySelector('form')!
    el.removeAttribute('inline')
    expect(form.style.display).toBe('block')
    expect(form.style.flexWrap).toBe('')
    expect(el.style.getPropertyValue('--oas-form-layout')).toBe('vertical')
  })

  it('inline：form-item 感知行内模式（label-align 强制 left、label-width 自动）', () => {
    const el = new OASForm()
    el.setAttribute('inline', '')
    el.setAttribute('label-width', '120px')
    const item = new OASFormItem()
    item.setAttribute('label', '姓名')
    item.innerHTML = '<oas-input name="name"></oas-input>'
    el.appendChild(item)
    document.body.appendChild(el)
    expect(item.dataset.formLayout).toBe('inline')
    expect(item.dataset.formLabelAlign).toBe('left')
    expect(item.style.getPropertyValue('--oas-form-label-width')).toBe('')
  })

  it('inline：form-item 的 span 忽略（gridColumn 清空）', () => {
    const el = new OASForm()
    el.setAttribute('inline', '')
    const item = new OASFormItem()
    item.setAttribute('span', '6')
    item.innerHTML = '<oas-input name="name"></oas-input>'
    el.appendChild(item)
    document.body.appendChild(el)
    expect(item.style.gridColumn).toBe('')
  })

  it('inline 运行时切换 grid ↔ inline，form-item 即时重刷（refreshLayout 链路）', () => {
    const el = new OASForm()
    const item = new OASFormItem()
    item.innerHTML = '<oas-input name="name"></oas-input>'
    el.appendChild(item)
    document.body.appendChild(el)
    expect(item.dataset.formLabelAlign).toBe('top')

    el.setAttribute('inline', '')
    expect(item.dataset.formLayout).toBe('inline')
    expect(item.dataset.formLabelAlign).toBe('left')

    el.removeAttribute('inline')
    el.setAttribute('layout', 'grid')
    expect(item.dataset.formLayout).toBeUndefined()
    expect(item.dataset.formLabelAlign).toBe('top')
    expect(item.style.gridColumn).toBe('span 24')
  })

  it('inline：校验失败错误文本写入 form-item 错误位（角色 alert 可见）', () => {
    const el = new OASForm()
    el.setAttribute('inline', '')
    el.setAttribute('rules', JSON.stringify({ name: [{ required: true, message: '请输入用户名' }] }))
    const item = new OASFormItem()
    item.setAttribute('label', '用户名')
    item.setAttribute('required', '')
    item.innerHTML = '<oas-input name="name"></oas-input>'
    el.appendChild(item)
    document.body.appendChild(el)
    el.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    const input = item.querySelector('oas-input')!
    expect(input.hasAttribute('aria-invalid')).toBe(true)
    const err = item.shadowRoot!.querySelector('[part="error"]')!
    expect(err.hasAttribute('hidden')).toBe(false)
    expect(err.textContent).toBe('请输入用户名')
  })
})

describe('OASForm 栅格布局增强', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('layout="grid"：form 元素 24 列 grid + gap', () => {
    const el = new OASForm()
    el.setAttribute('layout', 'grid')
    el.setAttribute('gap', 'var(--oas-space-4)')
    document.body.appendChild(el)
    const form = el.shadowRoot!.querySelector('form')!
    expect(form.style.display).toBe('grid')
    expect(form.style.gridTemplateColumns).toBe('repeat(24, 1fr)')
    expect(form.style.gap).toBe('var(--oas-space-4)')
  })

  it('layout 非枚举值回退 vertical（块级、无 grid）', () => {
    const el = new OASForm()
    el.setAttribute('layout', 'inline')
    document.body.appendChild(el)
    const form = el.shadowRoot!.querySelector('form')!
    expect(form.style.display).toBe('block')
    expect(form.style.gridTemplateColumns).toBe('')
  })

  it('layout 运行时切换 grid ↔ vertical', () => {
    const el = new OASForm()
    document.body.appendChild(el)
    const form = el.shadowRoot!.querySelector('form')!
    el.setAttribute('layout', 'grid')
    expect(form.style.display).toBe('grid')
    el.setAttribute('layout', 'vertical')
    expect(form.style.display).toBe('block')
    expect(form.style.gridTemplateColumns).toBe('')
  })

  it('grid 模式下 form-item 的 label-align 默认 top', () => {
    const el = new OASForm()
    el.setAttribute('layout', 'grid')
    const item = new OASFormItem()
    item.innerHTML = '<oas-input name="name"></oas-input>'
    el.appendChild(item)
    document.body.appendChild(el)
    expect(item.dataset.formLabelAlign).toBe('top')
  })

  it('校验失败错误提示写入 form-item 错误位（字段后不插入 div）', () => {
    const el = new OASForm()
    el.setAttribute('rules', JSON.stringify({ name: [{ required: true, message: '请输入姓名' }] }))
    const item = new OASFormItem()
    item.setAttribute('label', '姓名')
    item.innerHTML = '<oas-input name="name"></oas-input>'
    el.appendChild(item)
    document.body.appendChild(el)
    const submit = () => el.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))

    submit()
    const input = item.querySelector('oas-input')!
    expect(input.hasAttribute('aria-invalid')).toBe(true)
    expect(input.nextElementSibling).toBeNull()
    const err = item.shadowRoot!.querySelector('[part="error"]')!
    expect(err.hasAttribute('hidden')).toBe(false)
    expect(err.textContent).toBe('请输入姓名')

    input.setAttribute('value', '张三')
    submit()
    expect(err.hasAttribute('hidden')).toBe(true)
  })

  it('form-item 与裸字段混合：错误提示分别路由，互不影响', () => {
    const el = new OASForm()
    el.setAttribute(
      'rules',
      JSON.stringify({
        a: [{ required: true, message: 'A 必填' }],
        b: [{ required: true, message: 'B 必填' }],
      }),
    )
    const item = new OASFormItem()
    item.innerHTML = '<oas-input name="a"></oas-input>'
    el.appendChild(item)
    el.insertAdjacentHTML('beforeend', '<oas-input name="b"></oas-input>')
    document.body.appendChild(el)
    el.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))

    const a = el.querySelector('oas-input[name="a"]')!
    const b = el.querySelector('oas-input[name="b"]')!
    expect(a.nextElementSibling).toBeNull() // a 被 form-item 收编
    expect(b.nextElementSibling!.classList.contains('error-text')).toBe(true) // b 裸字段保持旧行为
    expect(item.shadowRoot!.querySelector('[part="error"]')!.textContent).toBe('A 必填')
  })
})

describe('OASForm 表单级 disabled', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountForm(fields: string, attrs: Record<string, string> = {}): OASForm {
    const el = new OASForm()
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.innerHTML = fields
    document.body.appendChild(el)
    return el
  }

  it('form disabled：字段经 formDisabled 通道并入 injectDisabled 禁用（镜像 data-disabled + 内层禁用），不回写字段 disabled 属性防自锁', () => {
    const el = mountForm('<oas-input name="name" value="x"></oas-input>', { disabled: '' })
    const field = el.querySelector('oas-input') as OASInput
    expect(field instanceof OASInput).toBe(true)
    expect(field.hasAttribute('disabled')).toBe(false)
    expect(field.hasAttribute('data-disabled')).toBe(true)
    const inner = field.shadowRoot!.querySelector('input') as HTMLInputElement
    expect(inner.disabled).toBe(true)
  })

  it('移除 form disabled：字段恢复可用（镜像清除、内层解禁）', () => {
    const el = mountForm('<oas-input name="name" value="x"></oas-input>', { disabled: '' })
    const field = el.querySelector('oas-input') as OASInput
    expect(field.hasAttribute('data-disabled')).toBe(true)
    el.removeAttribute('disabled')
    expect(field.hasAttribute('data-disabled')).toBe(false)
    const inner = field.shadowRoot!.querySelector('input') as HTMLInputElement
    expect(inner.disabled).toBe(false)
  })

  it('form disabled + 字段 disabled-skip：表单链路禁用优先于豁免（对齐 formDisabledCallback 原生语义，fieldset 场景一致）', () => {
    const el = mountForm('<oas-input name="name" value="x" disabled-skip></oas-input>', { disabled: '' })
    const field = el.querySelector('oas-input') as OASInput
    expect(field.hasAttribute('data-disabled')).toBe(true)
    el.removeAttribute('disabled')
    expect(field.hasAttribute('data-disabled')).toBe(false)
  })

  it('form disabled 时提交跳过校验：空必填字段不拦截 oas-submit', () => {
    const el = mountForm('<oas-input name="name" value=""></oas-input>', {
      disabled: '',
      rules: JSON.stringify({ name: [{ required: true, message: '必填' }] }),
    })
    let fired = 0
    let failed = 0
    el.addEventListener('oas-submit', () => fired++)
    el.addEventListener('oas-validate-fail', () => failed++)
    el.submit()
    expect(fired).toBe(1)
    expect(failed).toBe(0)
  })

  it('form disabled + disabled-skip 字段同样跳过校验（表单链路优先于豁免）：空必填不拦截 oas-submit', () => {
    const el = mountForm('<oas-input name="name" value="" disabled-skip></oas-input>', {
      disabled: '',
      rules: JSON.stringify({ name: [{ required: true, message: '必填' }] }),
    })
    let fired = 0
    let failed = 0
    el.addEventListener('oas-submit', () => fired++)
    el.addEventListener('oas-validate-fail', () => failed++)
    el.submit()
    expect(fired).toBe(1)
    expect(failed).toBe(0)
  })

  it('字段自身 disabled 恒禁：form 解除禁用后不连带解除字段自身禁用', () => {
    const el = mountForm('<oas-input name="name" value="x" disabled></oas-input>', { disabled: '' })
    const field = el.querySelector('oas-input') as OASInput
    const inner = field.shadowRoot!.querySelector('input') as HTMLInputElement
    expect(inner.disabled).toBe(true)
    el.removeAttribute('disabled')
    expect(inner.disabled).toBe(true)
  })

  it('非 form-associated 字段（未升级元素）按属性回退判定：form disabled 时同样跳过校验', () => {
    const el = mountForm(
      '<oas-textarea name="a" value="" disabled-skip></oas-textarea><oas-textarea name="b" value=""></oas-textarea>',
      {
        disabled: '',
        rules: JSON.stringify({
          a: [{ required: true, message: 'A 必填' }],
          b: [{ required: true, message: 'B 必填' }],
        }),
      },
    )
    let fired = 0
    let failed = 0
    el.addEventListener('oas-submit', () => fired++)
    el.addEventListener('oas-validate-fail', (e) => failed++)
    el.submit()
    expect(fired).toBe(1)
    expect(failed).toBe(0)
  })
})

describe('OASForm scroll-to-first-error', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  function mountForm(fields: string, attrs: Record<string, string> = {}): OASForm {
    const el = new OASForm()
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.innerHTML = fields
    document.body.appendChild(el)
    return el
  }

  function stubScrollIntoView(): { calls: ScrollIntoViewOptions[]; restore: () => void } {
    const calls: ScrollIntoViewOptions[] = []
    const orig = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (this: Element, opts?: ScrollIntoViewOptions) {
      if (opts) calls.push(opts)
    }
    return {
      calls,
      restore: () => {
        Element.prototype.scrollIntoView = orig
      },
    }
  }

  function rules(): string {
    return JSON.stringify({
      a: [{ required: true, message: 'A 必填' }],
      b: [{ required: true, message: 'B 必填' }],
    })
  }

  it('设置属性时校验失败平滑滚动到首个错误字段并聚焦其控件', () => {
    const stub = stubScrollIntoView()
    try {
      const el = mountForm('<oas-input name="a" value="ok"></oas-input><oas-input name="b" value=""></oas-input>', {
        'scroll-to-first-error': '',
        rules: rules(),
      })
      let failed = 0
      el.addEventListener('oas-validate-fail', () => failed++)
      el.submit()
      expect(failed).toBe(1)
      expect(stub.calls).toEqual([{ behavior: 'smooth', block: 'center' }])
      // activeElement 不穿 shadow 边界：聚焦内层 input 时报告宿主
      const b = el.querySelector('oas-input[name="b"]') as OASInput
      expect(document.activeElement).toBe(b)
    } finally {
      stub.restore()
    }
  })

  it('prefers-reduced-motion 时降级瞬跳（behavior auto）', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }))
    const stub = stubScrollIntoView()
    try {
      const el = mountForm('<oas-input name="a" value="ok"></oas-input><oas-input name="b" value=""></oas-input>', {
        'scroll-to-first-error': '',
        rules: rules(),
      })
      el.submit()
      expect(stub.calls).toEqual([{ behavior: 'auto', block: 'center' }])
    } finally {
      stub.restore()
    }
  })

  it('未设置属性时不滚动不聚焦（默认关闭）', () => {
    const stub = stubScrollIntoView()
    try {
      const el = mountForm('<oas-input name="a" value=""></oas-input>', { rules: rules() })
      el.submit()
      expect(stub.calls).toEqual([])
      const a = el.querySelector('oas-input[name="a"]') as OASInput
      expect(document.activeElement === a).toBe(false)
    } finally {
      stub.restore()
    }
  })

  it('校验全部通过时不滚动不聚焦', () => {
    const stub = stubScrollIntoView()
    try {
      const el = mountForm('<oas-input name="a" value="ok"></oas-input>', {
        'scroll-to-first-error': '',
        rules: rules(),
      })
      let fired = 0
      el.addEventListener('oas-submit', () => fired++)
      el.submit()
      expect(fired).toBe(1)
      expect(stub.calls).toEqual([])
    } finally {
      stub.restore()
    }
  })
})

describe('OASForm Rule.validator', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountForm(fields: string, rules?: unknown): OASForm {
    const el = new OASForm()
    if (rules !== undefined) el.setAttribute('rules', JSON.stringify(rules))
    el.innerHTML = fields
    document.body.appendChild(el)
    return el
  }

  it('同步 validator 返回 string 为错误消息，返回 true 通过', () => {
    const el = mountForm('<oas-input name="name" value="admin"></oas-input>')
    el.rules = { name: [{ validator: (v) => (v === 'admin' ? '用户名被占用' : true) }] }
    let errors: Record<string, string> = {}
    el.addEventListener('oas-validate-fail', (e) => (errors = (e as CustomEvent).detail.errors))
    el.submit()
    expect(errors.name).toBe('用户名被占用')

    const field = el.querySelector('oas-input')!
    field.setAttribute('value', 'free')
    let values: Record<string, string> = {}
    el.addEventListener('oas-submit', (e) => (values = (e as CustomEvent).detail.values))
    el.submit()
    expect(values.name).toBe('free')
  })

  it('异步 validator（Promise）：resolve string 报错、resolve true 通过', async () => {
    const el = mountForm('<oas-input name="name" value="bad"></oas-input>')
    el.rules = {
      name: [{ validator: (v) => Promise.resolve(v === 'bad' ? '异步校验失败' : true) }],
    }
    let errors: Record<string, string> = {}
    el.addEventListener('oas-validate-fail', (e) => (errors = (e as CustomEvent).detail.errors))
    el.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(errors.name).toBe('异步校验失败')

    el.querySelector('oas-input')!.setAttribute('value', 'good')
    let fired = 0
    el.addEventListener('oas-submit', () => fired++)
    el.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(fired).toBe(1)
  })

  it('validator 最后跑：同 rule 内 required 先失败时 validator 不执行', () => {
    const validator = vi.fn(() => '校验器消息')
    const el = mountForm('<oas-input name="name" value=""></oas-input>')
    el.rules = { name: [{ required: true, message: '必填', validator }] }
    let errors: Record<string, string> = {}
    el.addEventListener('oas-validate-fail', (e) => (errors = (e as CustomEvent).detail.errors))
    el.submit()
    expect(errors.name).toBe('必填')
    expect(validator).not.toHaveBeenCalled()
  })

  it('validator 收到 (value, values) 两参（values 为全表快照）', () => {
    let seen: { value: string; values: Record<string, string> } | null = null
    const el = mountForm('<oas-input name="a" value="x"></oas-input><oas-input name="b" value="y"></oas-input>')
    el.rules = {
      a: [
        {
          validator: (v, values) => {
            seen = { value: v, values: { ...values } }
            return true
          },
        },
      ],
    }
    el.submit()
    expect(seen).toEqual({ value: 'x', values: { a: 'x', b: 'y' } })
  })

  it('validator 返回非 true 非 string（false/undefined）按默认文案失败', () => {
    const el = mountForm('<oas-input name="name" value="x"></oas-input>')
    el.rules = { name: [{ validator: (() => false) as unknown as Rule['validator'] }] }
    let errors: Record<string, string> = {}
    el.addEventListener('oas-validate-fail', (e) => (errors = (e as CustomEvent).detail.errors))
    el.submit()
    expect(typeof errors.name).toBe('string')
    expect(errors.name!.length).toBeGreaterThan(0)
  })

  it('validator 与既有规则组合：先到先报（pattern 失败则 validator 不再执行）', () => {
    const validator = vi.fn((): true => true)
    const el = mountForm('<oas-input name="name" value="abc"></oas-input>')
    el.rules = {
      name: [{ pattern: '^\\d+$', message: '仅数字', validator }],
    }
    let errors: Record<string, string> = {}
    el.addEventListener('oas-validate-fail', (e) => (errors = (e as CustomEvent).detail.errors))
    el.submit()
    expect(errors.name).toBe('仅数字')
    expect(validator).not.toHaveBeenCalled()
  })
})

describe('OASForm validate-trigger', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountForm(fields: string, attrs: Record<string, string> = {}): OASForm {
    const el = new OASForm()
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.innerHTML = fields
    document.body.appendChild(el)
    return el
  }

  const RULES = JSON.stringify({ name: [{ pattern: '^\\d+$', message: '仅数字' }] })

  function fireInput(el: OASForm, name: string, value: string): void {
    const field = el.querySelector(`oas-input[name="${name}"]`)!
    field.dispatchEvent(new CustomEvent('oas-input', { bubbles: true, composed: true, detail: { value } }))
  }

  function fireChange(el: OASForm, name: string, value: string): void {
    const field = el.querySelector(`oas-input[name="${name}"]`)!
    field.dispatchEvent(new CustomEvent('oas-change', { bubbles: true, composed: true, detail: { value } }))
  }

  function fireBlur(el: OASForm, name: string, value: string): void {
    const field = el.querySelector(`oas-input[name="${name}"]`)!
    field.dispatchEvent(new CustomEvent('oas-blur', { bubbles: true, composed: true, detail: { value } }))
  }

  function invalid(el: OASForm, name: string): boolean {
    return el.querySelector(`oas-input[name="${name}"]`)!.hasAttribute('aria-invalid')
  }

  it('默认 change：字段 oas-change 即校验该字段（失败标记 aria-invalid + 错误文案）', () => {
    const el = mountForm('<oas-input name="name" value=""></oas-input>', { rules: RULES })
    fireChange(el, 'name', 'abc')
    expect(invalid(el, 'name')).toBe(true)
    const err = el.querySelector('.error-text')!
    expect(err.textContent).toBe('仅数字')

    fireChange(el, 'name', '123')
    expect(invalid(el, 'name')).toBe(false)
    expect(el.querySelector('.error-text')).toBeNull()
  })

  it('validate-trigger=blur：oas-change 不校验，oas-blur 校验（值以 oas-input 同步为准）', () => {
    const el = mountForm('<oas-input name="name" value=""></oas-input>', {
      rules: RULES,
      'validate-trigger': 'blur',
    })
    fireChange(el, 'name', 'abc')
    expect(invalid(el, 'name')).toBe(false)

    fireInput(el, 'name', 'abc')
    fireBlur(el, 'name', 'abc')
    expect(invalid(el, 'name')).toBe(true)
  })

  it('validate-trigger=input：oas-input 即校验', () => {
    const el = mountForm('<oas-input name="name" value=""></oas-input>', {
      rules: RULES,
      'validate-trigger': 'input',
    })
    fireInput(el, 'name', 'abc')
    expect(invalid(el, 'name')).toBe(true)

    fireInput(el, 'name', '1')
    expect(invalid(el, 'name')).toBe(false)
  })

  it('Rule.validateTrigger 覆盖表级（表 change、字段 blur）', () => {
    const el = mountForm('<oas-input name="name" value=""></oas-input>', {
      rules: JSON.stringify({ name: [{ pattern: '^\\d+$', message: '仅数字', validateTrigger: 'blur' }] }),
    })
    fireInput(el, 'name', 'abc')
    fireChange(el, 'name', 'abc')
    expect(invalid(el, 'name')).toBe(false)

    fireBlur(el, 'name', 'abc')
    expect(invalid(el, 'name')).toBe(true)
  })

  it('触发校验不派发 oas-submit / oas-validate-fail（仅字段级状态更新）', () => {
    const el = mountForm('<oas-input name="name" value=""></oas-input>', { rules: RULES })
    let submitFired = 0
    let failFired = 0
    el.addEventListener('oas-submit', () => submitFired++)
    el.addEventListener('oas-validate-fail', () => failFired++)
    fireChange(el, 'name', 'abc')
    expect(submitFired).toBe(0)
    expect(failFired).toBe(0)
    expect(invalid(el, 'name')).toBe(true)
  })

  it('非法 validate-trigger 值回退 change；禁用字段不触发校验', () => {
    const el = mountForm('<oas-input name="name" value="" disabled></oas-input>', {
      rules: RULES,
      'validate-trigger': 'nonsense',
    })
    fireChange(el, 'name', 'abc')
    expect(invalid(el, 'name')).toBe(false)
  })
})

describe('OASForm initial-values 与 reset', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountForm(fields: string, attrs: Record<string, string> = {}): OASForm {
    const el = new OASForm()
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.innerHTML = fields
    document.body.appendChild(el)
    return el
  }

  const FIELDS =
    '<oas-input name="name" value=""></oas-input><oas-switch name="enabled"></oas-switch><oas-transfer name="tags" model-value=""></oas-transfer>'

  it('initial-values 属性挂载后写入对应字段（input value / switch checked / transfer model-value）', () => {
    const el = mountForm(FIELDS, {
      'initial-values': JSON.stringify({ name: '张三', enabled: true, tags: ['a', 'b'] }),
    })
    expect(el.querySelector('oas-input')!.getAttribute('value')).toBe('张三')
    expect(el.querySelector('oas-switch')!.hasAttribute('checked')).toBe(true)
    expect(el.querySelector('oas-transfer')!.getAttribute('model-value')).toBe('["a","b"]')
  })

  it('initialValues property 通道生效且优先于 attribute', () => {
    const el = mountForm(FIELDS, { 'initial-values': JSON.stringify({ name: '王五' }) })
    expect(el.querySelector('oas-input')!.getAttribute('value')).toBe('王五')
    el.initialValues = { name: '李四' }
    expect(el.querySelector('oas-input')!.getAttribute('value')).toBe('李四')
    expect(el.querySelector('oas-switch')!.hasAttribute('checked')).toBe(false)
  })

  it('reset()：修改后回到初始值，且不派发 oas-input / oas-change / oas-values-change', () => {
    const el = mountForm(FIELDS, {
      'initial-values': JSON.stringify({ name: '初始', enabled: true }),
    })
    let events = 0
    el.addEventListener('oas-input', () => events++)
    el.addEventListener('oas-change', () => events++)
    el.addEventListener('oas-values-change', () => events++)

    el.querySelector('oas-input')!.setAttribute('value', '改了')
    el.querySelector('oas-switch')!.removeAttribute('checked')
    el.reset()
    expect(el.querySelector('oas-input')!.getAttribute('value')).toBe('初始')
    expect(el.querySelector('oas-switch')!.hasAttribute('checked')).toBe(true)
    expect(events).toBe(0)
  })

  it('reset() 同时清除校验错误态（aria-invalid + 错误文案）', () => {
    const el = mountForm('<oas-input name="name" value="初始"></oas-input>', {
      'initial-values': JSON.stringify({ name: '初始' }),
      rules: JSON.stringify({ name: [{ required: true, message: '必填' }] }),
    })
    el.querySelector('oas-input')!.setAttribute('value', '')
    el.submit()
    expect(el.querySelector('oas-input')!.hasAttribute('aria-invalid')).toBe(true)
    el.reset()
    expect(el.querySelector('oas-input')!.hasAttribute('aria-invalid')).toBe(false)
    expect(el.querySelector('.error-text')).toBeNull()
    expect(el.querySelector('oas-input')!.getAttribute('value')).toBe('初始')
  })

  it('未配置 initial-values 时 reset() 清空字段（回到挂载时值基线）', () => {
    const el = mountForm(
      '<oas-input name="name" value="出厂值"></oas-input><oas-switch name="on" checked></oas-switch>',
    )
    el.querySelector('oas-input')!.setAttribute('value', '改了')
    el.reset()
    expect(el.querySelector('oas-input')!.getAttribute('value')).toBe('出厂值')
    expect(el.querySelector('oas-switch')!.hasAttribute('checked')).toBe(true)
  })

  it('initial-values 覆盖字段出厂值：reset 回 initial-values 而非出厂值', () => {
    const el = mountForm('<oas-input name="name" value="出厂值"></oas-input>', {
      'initial-values': JSON.stringify({ name: '初始值' }),
    })
    el.reset()
    expect(el.querySelector('oas-input')!.getAttribute('value')).toBe('初始值')
  })
})

describe('OASForm oas-values-change', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountForm(fields: string, attrs: Record<string, string> = {}): OASForm {
    const el = new OASForm()
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.innerHTML = fields
    document.body.appendChild(el)
    return el
  }

  it('字段 oas-input 派发 oas-values-change，detail { name, value, values }（values 全表快照）', () => {
    const el = mountForm('<oas-input name="a" value=""></oas-input><oas-input name="b" value="keep"></oas-input>')
    let detail: { name: string; value: string; values: Record<string, string> } | null = null
    let count = 0
    el.addEventListener('oas-values-change', (e) => {
      detail = (e as CustomEvent).detail
      count++
    })
    const a = el.querySelector('oas-input[name="a"]')!
    a.dispatchEvent(new CustomEvent('oas-input', { bubbles: true, composed: true, detail: { value: 'v1' } }))
    expect(count).toBe(1)
    expect(detail!.name).toBe('a')
    expect(detail!.value).toBe('v1')
    expect(detail!.values).toEqual({ a: 'v1', b: 'keep' })
    expect(a.getAttribute('value')).toBe('v1')
  })

  it('字段 oas-change 同样派发（复合值 JSON 串形态）', () => {
    const el = mountForm('<oas-input name="a" value=""></oas-input>')
    let detail: { name: string; value: string; values: Record<string, string> } | null = null
    el.addEventListener('oas-values-change', (e) => (detail = (e as CustomEvent).detail))
    const a = el.querySelector('oas-input[name="a"]')!
    a.dispatchEvent(new CustomEvent('oas-change', { bubbles: true, composed: true, detail: { value: ['x', 'y'] } }))
    expect(detail!.name).toBe('a')
    expect(detail!.value).toBe('["x","y"]')
    expect(detail!.values).toEqual({ a: '["x","y"]' })
  })

  it('无名目标不派发', () => {
    const el = mountForm('<oas-input value=""></oas-input>')
    let count = 0
    el.addEventListener('oas-values-change', () => count++)
    el.querySelector('oas-input')!.dispatchEvent(
      new CustomEvent('oas-input', { bubbles: true, composed: true, detail: { value: 'v' } }),
    )
    expect(count).toBe(0)
  })

  it('reset() / initial-values 写入不派发 oas-values-change（静默通道）', () => {
    const el = mountForm('<oas-input name="a" value=""></oas-input>', {
      'initial-values': JSON.stringify({ a: 'x' }),
    })
    let count = 0
    el.addEventListener('oas-values-change', () => count++)
    el.reset()
    expect(count).toBe(0)
  })
})

describe('OASForm review 回归（真实路径，非合成事件造假绿）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('C1：form 内真实键击→blur，字段 oas-change 正常派发 + change 触发即时校验（值同步回声不得吞提交）', () => {
    const el = ((): OASForm => {
      const f = new OASForm()
      f.setAttribute('rules', JSON.stringify({ n1: [{ pattern: '^\\d+$', message: '只收数字' }] }))
      f.innerHTML = '<oas-input name="n1"></oas-input>'
      document.body.appendChild(f)
      return f
    })()
    const field = el.querySelector('oas-input') as OASInput
    let changeFired = 0
    field.addEventListener('oas-change', () => changeFired++)
    const inner = field.shadowRoot!.querySelector('input')!
    inner.value = 'abc'
    inner.dispatchEvent(new Event('input', { bubbles: true }))
    inner.dispatchEvent(new Event('blur'))
    expect(changeFired, 'blur 提交应派发 oas-change（回声不得吞掉）').toBe(1)
    expect(field.getAttribute('aria-invalid'), 'change 触发即时校验：非数字应判错').toBe('true')
  })

  it('C2：calendar range 在 form 内提交（detail 无 value 键）不抹字段 value', () => {
    const el = ((): OASForm => {
      const f = new OASForm()
      f.innerHTML = '<oas-calendar name="dates" range></oas-calendar>'
      document.body.appendChild(f)
      return f
    })()
    const cal = el.querySelector('oas-calendar')!
    cal.setAttribute('value', '["2026-08-05","2026-08-15"]')
    cal.dispatchEvent(
      new CustomEvent('oas-change', {
        detail: { start: '2026-08-05', end: '2026-08-15' },
        bubbles: true,
        composed: true,
      }),
    )
    expect(cal.getAttribute('value'), 'range 区间 JSON 不得被值同步抹掉').toBe('["2026-08-05","2026-08-15"]')
  })

  it('I3：validate-trigger=input + 异步 validator，慢旧结果不覆盖快新结果（竞态令牌）', async () => {
    const el = ((): OASForm => {
      const f = new OASForm()
      f.setAttribute('validate-trigger', 'input')
      f.innerHTML = '<oas-input name="n1"></oas-input>'
      document.body.appendChild(f)
      return f
    })()
    // 慢旧（'a' → 60ms 后判错）+ 快新（'ab' → 5ms 后通过）
    el.rules = {
      n1: [
        {
          validator: (v: string) =>
            new Promise<true | string>((res) => setTimeout(() => res(v === 'a' ? '错A' : true), v === 'a' ? 60 : 5)),
        },
      ],
    }
    const field = el.querySelector('oas-input') as OASInput
    const inner = field.shadowRoot!.querySelector('input')!
    inner.value = 'a'
    inner.dispatchEvent(new Event('input', { bubbles: true }))
    inner.value = 'ab'
    inner.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 90))
    expect(field.getAttribute('aria-invalid'), '最新一次（快，通过）生效，慢旧结果不得覆盖').toBeNull()
  })

  it('I4：initial-values 经 checkbox property setter 驱动映射勾选 + reset 恢复 checked', async () => {
    const el = ((): OASForm => {
      const f = new OASForm()
      f.setAttribute('initial-values', JSON.stringify({ agree: 'YES' }))
      f.innerHTML = '<oas-checkbox name="agree" true-value="YES" false-value="NO"></oas-checkbox>'
      document.body.appendChild(f)
      return f
    })()
    const cb = el.querySelector('oas-checkbox')!
    await new Promise((r) => setTimeout(r, 0))
    expect(cb.hasAttribute('checked'), 'initial-values YES 应勾选（true-value 映射）').toBe(true)
    cb.removeAttribute('checked')
    el.reset()
    await new Promise((r) => setTimeout(r, 0))
    expect(cb.hasAttribute('checked'), 'reset 应恢复 checked=true（初始值基线）').toBe(true)
  })
})
