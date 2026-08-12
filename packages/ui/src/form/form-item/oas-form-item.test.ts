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
    expect(withLabel.shadowRoot!.querySelector('[part="label"]')!.hasAttribute('hidden')).toBe(
      false,
    )

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
