import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASCascader } from './index.js'

const OPTIONS = JSON.stringify([
  {
    label: '浙江',
    value: 'zj',
    children: [
      { label: '杭州', value: 'hz' },
      { label: '宁波', value: 'nb' },
    ],
  },
  { label: '江苏', value: 'js', children: [{ label: '南京', value: 'nj' }] },
])

function mount(attrs: Record<string, string> = {}): OASCascader {
  const el = new OASCascader()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.options) el.setAttribute('options', OPTIONS)
  document.body.appendChild(el)
  return el
}

function trigger(el: OASCascader): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button[part="trigger"]')!
}

describe('OASCascader', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 trigger，未选择显示 placeholder', async () => {
    const el = mount({ placeholder: '请选择地区' })
    await Promise.resolve()
    expect(trigger(el).getAttribute('role')).toBe('combobox')
    expect(trigger(el).textContent).toContain('请选择地区')
  })

  it('value 为路径数组时显示各级 label 拼接', () => {
    const el = mount({ value: '["zj","hz"]' })
    expect(trigger(el).textContent).toContain('浙江 / 杭州')
  })

  it('点击展开显示第一级面板', () => {
    const el = mount()
    trigger(el).click()
    const panels = el.shadowRoot!.querySelectorAll('.panel')
    expect(panels.length).toBeGreaterThanOrEqual(1)
    expect(panels[0]!.querySelectorAll('[role="option"]').length).toBe(2)
  })

  it('逐级选择到叶子，value 更新为完整路径并派发 oas-change', () => {
    const el = mount()
    trigger(el).click()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const firstPanel = el.shadowRoot!.querySelector('.panel')!
    ;(firstPanel.querySelectorAll('[role="option"]')[0] as HTMLElement).click()
    const panels = el.shadowRoot!.querySelectorAll('.panel')
    expect(panels.length).toBe(2)
    ;(panels[1]!.querySelector('[role="option"]') as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['zj', 'hz'])
    expect(detail).toEqual({ value: ['zj', 'hz'] })
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('changeOnSelect：选中非叶子也立即派发并关闭', () => {
    const el = mount({ 'change-on-select': '' })
    trigger(el).click()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[role="option"]') as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['zj'])
    expect(detail).toEqual({ value: ['zj'] })
  })

  it('disabled 不可交互', () => {
    const el = mount({ disabled: '' })
    expect(trigger(el).disabled).toBe(true)
  })
})

describe('OASCascader focus 委托', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('host.focus() 委托到 shadow 内 trigger', () => {
    const el = new OASCascader()
    el.setAttribute('options', OPTIONS)
    document.body.appendChild(el)
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('button[part="trigger"]'))
  })
})
