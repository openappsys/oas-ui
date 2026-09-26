import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASFormItem } from './index.js'
import { OASForm } from '../form/index.js'
import { OASInput } from '../input/index.js'

function mount(attrs: Record<string, string> = {}, innerHTML = '<input />'): OASFormItem {
  const el = new OASFormItem()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = innerHTML
  document.body.appendChild(el)
  return el
}

function mountInForm(
  formAttrs: Record<string, string> = {},
  itemAttrs: Record<string, string> = {},
): { form: OASForm; item: OASFormItem } {
  const form = new OASForm()
  for (const [k, v] of Object.entries(formAttrs)) form.setAttribute(k, v)
  const item = new OASFormItem()
  for (const [k, v] of Object.entries(itemAttrs)) item.setAttribute(k, v)
  item.innerHTML = '<input name="name" />'
  form.appendChild(item)
  document.body.appendChild(form)
  return { form, item }
}

describe('OASFormItem 行内布局适配', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('inline 模式：data-form-layout=inline、label-align 强制 left、label-width 自动、span 忽略', () => {
    const { item } = mountInForm(
      { inline: '', 'label-align': 'top', 'label-width': '120px' },
      { label: '姓名', span: '6' },
    )
    expect(item.dataset.formLayout).toBe('inline')
    expect(item.dataset.formLabelAlign).toBe('left')
    expect(item.style.getPropertyValue('--oas-form-label-width')).toBe('')
    expect(item.style.gridColumn).toBe('')
  })

  it('inline 模式：错误文本渲染在 control 内（slot 之后、角色 alert）', () => {
    const { item } = mountInForm({ inline: '' }, { label: '姓名' })
    item.setError('请填写')
    const err = item.shadowRoot!.querySelector('[part="error"]')!
    const control = item.shadowRoot!.querySelector('[part="control"]')!
    expect(control.contains(err)).toBe(true)
    expect(err.getAttribute('role')).toBe('alert')
    expect(err.hasAttribute('hidden')).toBe(false)
    expect(err.textContent).toBe('请填写')
  })

  it('移除 inline 后回退默认感知（refreshLayout 链路）', () => {
    const { form, item } = mountInForm({ inline: '' }, { label: '姓名' })
    expect(item.dataset.formLayout).toBe('inline')
    expect(item.dataset.formLabelAlign).toBe('left')
    form.removeAttribute('inline')
    expect(item.dataset.formLayout).toBeUndefined()
    expect(item.dataset.formLabelAlign).toBe('top')
  })
})

describe('OASFormItem', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('span 归一化：1-24 整数原样、非法值按 24（仅 grid 布局下生效）', () => {
    const cases: Array<[string | null, string]> = [
      ['12', 'span 12'],
      ['24', 'span 24'],
      ['1', 'span 1'],
      ['0', 'span 24'],
      ['-3', 'span 24'],
      ['999', 'span 24'],
      ['12.5', 'span 24'],
      ['abc', 'span 24'],
      [null, 'span 24'],
    ]
    for (const [span, expected] of cases) {
      document.body.innerHTML = ''
      const { item } = mountInForm({ layout: 'grid' }, span === null ? {} : { span })
      expect(item.style.gridColumn, `span="${span}"`).toBe(expected)
    }
  })

  it('label 属性渲染为标签文本；无 label 时标签行隐藏', () => {
    const withLabel = mount({ label: '姓名' })
    expect(withLabel.shadowRoot!.querySelector('.label-text')!.textContent).toBe('姓名')
    expect(withLabel.shadowRoot!.querySelector('[part="label"]')!.hasAttribute('hidden')).toBe(false)

    document.body.innerHTML = ''
    const noLabel = mount({})
    expect(noLabel.shadowRoot!.querySelector('[part="label"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('required 属性控制必填星号显隐（aria-hidden）', () => {
    const el = mount({ label: '姓名', required: '' })
    const star = el.shadowRoot!.querySelector('[part="required"]')!
    expect(star.hasAttribute('hidden')).toBe(false)
    expect(star.getAttribute('aria-hidden')).toBe('true')
    expect(star.textContent).toBe('*')
  })

  it('setError 写入错误位（role="alert"），空消息隐藏', () => {
    const el = mount({ label: '邮箱' })
    const err = el.shadowRoot!.querySelector('[part="error"]')!
    expect(err.getAttribute('role')).toBe('alert')
    expect(err.hasAttribute('hidden')).toBe(true)

    el.setError('邮箱格式不正确')
    expect(err.hasAttribute('hidden')).toBe(false)
    expect(err.textContent).toBe('邮箱格式不正确')

    el.setError(null)
    expect(err.hasAttribute('hidden')).toBe(true)
    expect(err.textContent).toBe('')
  })

  it('grid 布局：form layout=grid 时按 span 占列', () => {
    const { item } = mountInForm({ layout: 'grid' }, { span: '12' })
    expect(item.style.gridColumn).toBe('span 12')
  })

  it('vertical / 无 form 时 span 忽略（gridColumn 清空）', () => {
    const standalone = mount({ span: '12' })
    expect(standalone.style.gridColumn).toBe('')

    document.body.innerHTML = ''
    const { item } = mountInForm({ layout: 'vertical' }, { span: '6' })
    expect(item.style.gridColumn).toBe('')
  })

  it('label-align 默认 top（grid 模式）', () => {
    const { item } = mountInForm({ layout: 'grid' })
    expect(item.dataset.formLabelAlign).toBe('top')
  })

  it('label-align 感知 form 属性（left/right/top，非法回退 top）', () => {
    for (const align of ['left', 'right', 'top']) {
      document.body.innerHTML = ''
      const { item } = mountInForm({ layout: 'grid', 'label-align': align })
      expect(item.dataset.formLabelAlign, `align=${align}`).toBe(align)
    }
    document.body.innerHTML = ''
    const { item } = mountInForm({ layout: 'grid', 'label-align': 'bottom' })
    expect(item.dataset.formLabelAlign).toBe('top')
  })

  it('label-width 透传到宿主 CSS 变量', () => {
    const { item } = mountInForm({ layout: 'grid', 'label-align': 'left', 'label-width': '120px' })
    expect(item.style.getPropertyValue('--oas-form-label-width')).toBe('120px')
  })

  it('form 布局属性变化后 form-item 即时同步（refreshLayout 链路）', () => {
    const { form, item } = mountInForm({ layout: 'grid' })
    expect(item.dataset.formLabelAlign).toBe('top')
    expect(item.style.gridColumn).toBe('span 24')

    form.setAttribute('label-align', 'right')
    expect(item.dataset.formLabelAlign).toBe('right')

    form.setAttribute('layout', 'vertical')
    expect(item.style.gridColumn).toBe('')
  })

  it('点击 label 聚焦默认插槽控件', () => {
    const el = mount({ label: '姓名' }, '<input id="name-field" />')
    el.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.click()
    expect(document.activeElement).toBe(el.querySelector('#name-field'))
  })

  it('点击 label 聚焦自定义控件宿主（focus 委托链：label → host.focus() → shadow 内主输入）', () => {
    const el = mount({ label: '姓名' }, '')
    const control = new OASInput()
    el.appendChild(control)
    expect(control.shadowRoot).not.toBeNull() // 自定义元素已渲染
    el.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.click()
    // happy-dom 重定向：document.activeElement 为宿主，shadowRoot.activeElement 指向内层 input
    expect(document.activeElement).toBe(control)
    expect(control.shadowRoot!.activeElement).toBe(control.shadowRoot!.querySelector('input'))
  })

  it('refreshLayout 可主动触发重刷', () => {
    const el = mount({ label: '姓名' })
    el.refreshLayout()
    expect(el.shadowRoot!.querySelector('.label-text')!.textContent).toBe('姓名')
  })
})

describe('OASFormItem RTL 逻辑方向化', () => {
  it('dir=rtl 时宿主镜像 data-rtl，默认 LTR 不带该标记', () => {
    const ltr = mount({ label: '姓名' })
    expect(ltr.hasAttribute('data-rtl')).toBe(false)
    const rtl = mount({ dir: 'rtl', label: '姓名' })
    expect(rtl.hasAttribute('data-rtl')).toBe(true)
  })

  it('label-align=right 物理对齐 API 在 RTL 下的钉定规则存在（flex-start 抵消 flex-end 的 dir 镜像）', () => {
    const el = mount({ label: '姓名' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(":host([data-rtl][data-form-label-align='right']) .label")
  })
})

describe('OASFormItem help 帮助文案', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('help 属性渲染帮助文本（control 内、error 之前）', () => {
    const el = new OASFormItem()
    el.setAttribute('label', '密码')
    el.setAttribute('help', '至少 8 位字符')
    document.body.appendChild(el)
    const help = el.shadowRoot!.querySelector('[part="help"]')!
    expect(help.hasAttribute('hidden')).toBe(false)
    expect(help.textContent).toBe('至少 8 位字符')
    const control = el.shadowRoot!.querySelector('[part="control"]')!
    const err = el.shadowRoot!.querySelector('[part="error"]')!
    expect(control.contains(help)).toBe(true)
    expect(control.contains(err)).toBe(true)
    const children = [...control.children]
    expect(children.indexOf(help!), 'help 应在 error 之前').toBeLessThan(children.indexOf(err!))
  })

  it('help 缺省时帮助位隐藏', () => {
    const el = new OASFormItem()
    el.setAttribute('label', '密码')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="help"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('help 与校验错误并存（独立通道，互不覆盖）', () => {
    const el = new OASFormItem()
    el.setAttribute('label', '密码')
    el.setAttribute('help', '至少 8 位字符')
    document.body.appendChild(el)
    el.setError('密码太短')
    const help = el.shadowRoot!.querySelector('[part="help"]')!
    const err = el.shadowRoot!.querySelector('[part="error"]')!
    expect(help.hasAttribute('hidden')).toBe(false)
    expect(err.hasAttribute('hidden')).toBe(false)
    el.setError(null)
    expect(help.hasAttribute('hidden')).toBe(false)
    expect(err.hasAttribute('hidden')).toBe(true)
  })

  it('help 运行时切换：设置即显示，清空即隐藏', () => {
    const el = new OASFormItem()
    el.setAttribute('label', '密码')
    document.body.appendChild(el)
    el.setAttribute('help', '提示 A')
    const help = el.shadowRoot!.querySelector('[part="help"]')!
    expect(help.textContent).toBe('提示 A')
    el.setAttribute('help', '')
    expect(help.hasAttribute('hidden')).toBe(true)
  })
})

describe('OASFormItem status-icon 校验状态图标', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('status-icon + setError(错误)：图标显示且 aria-hidden（文本已播报）', () => {
    const el = new OASFormItem()
    el.setAttribute('label', '用户名')
    el.setAttribute('status-icon', '')
    document.body.appendChild(el)
    el.setError('用户名已存在')
    const icon = el.shadowRoot!.querySelector('[part="status-icon"]')!
    expect(icon.hasAttribute('hidden')).toBe(false)
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.querySelector('svg'), '图标内联 svg 渲染').not.toBeNull()
  })

  it('setError(null)：图标随错误位一起隐藏', () => {
    const el = new OASFormItem()
    el.setAttribute('label', '用户名')
    el.setAttribute('status-icon', '')
    document.body.appendChild(el)
    el.setError('错误')
    el.setError(null)
    expect(el.shadowRoot!.querySelector('[part="status-icon"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('未设置 status-icon：错误时不渲染图标（默认关闭）', () => {
    const el = new OASFormItem()
    el.setAttribute('label', '用户名')
    document.body.appendChild(el)
    el.setError('错误')
    expect(el.shadowRoot!.querySelector('[part="status-icon"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('status-icon 运行时开启：已有错误在场时立即显示图标', () => {
    const el = new OASFormItem()
    el.setAttribute('label', '用户名')
    document.body.appendChild(el)
    el.setError('错误')
    expect(el.shadowRoot!.querySelector('[part="status-icon"]')!.hasAttribute('hidden')).toBe(true)
    el.setAttribute('status-icon', '')
    expect(el.shadowRoot!.querySelector('[part="status-icon"]')!.hasAttribute('hidden')).toBe(false)
  })

  it('form 校验链路联动：提交失败后 form-item 内图标可见，修正后隐藏', () => {
    const form = new OASForm()
    form.setAttribute('rules', JSON.stringify({ name: [{ required: true, message: '必填' }] }))
    const item = new OASFormItem()
    item.setAttribute('label', '姓名')
    item.setAttribute('status-icon', '')
    item.innerHTML = '<oas-input name="name"></oas-input>'
    form.appendChild(item)
    document.body.appendChild(form)
    form.submit()
    expect(item.shadowRoot!.querySelector('[part="status-icon"]')!.hasAttribute('hidden')).toBe(false)
    item.querySelector('oas-input')!.setAttribute('value', '张三')
    form.submit()
    expect(item.shadowRoot!.querySelector('[part="status-icon"]')!.hasAttribute('hidden')).toBe(true)
  })
})

describe('OASFormItem colon 感知（form 级开关）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('form colon 在场 → data-colon 镜像；label 行存在时 CSS ::after 生效', () => {
    const form = new OASForm()
    form.setAttribute('colon', '')
    const item = new OASFormItem()
    item.setAttribute('label', '姓名')
    form.appendChild(item)
    document.body.appendChild(form)
    expect(item.hasAttribute('data-colon')).toBe(true)
  })

  it('form colon 缺省 → 无 data-colon', () => {
    const form = new OASForm()
    const item = new OASFormItem()
    item.setAttribute('label', '姓名')
    form.appendChild(item)
    document.body.appendChild(form)
    expect(item.hasAttribute('data-colon')).toBe(false)
  })
})
