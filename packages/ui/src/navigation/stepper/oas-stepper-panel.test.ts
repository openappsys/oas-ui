import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASStepperPanel } from './index.js'

function mount(value = '0', content = '<p>面板内容</p>'): OASStepperPanel {
  const el = new OASStepperPanel()
  el.setAttribute('value', value)
  el.innerHTML = content
  document.body.appendChild(el)
  return el
}

describe('OASStepperPanel', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染默认插槽内容（面板内容走默认插槽）', () => {
    const el = mount('0', '<p>第一步内容</p>')
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    expect(el.textContent).toContain('第一步内容')
  })

  it('value 属性：关联步骤序号字符串（value="0"）', () => {
    const el = mount('2')
    expect(el.getAttribute('value')).toBe('2')
  })

  it('value 属性变化仍保持面板内容（增量渲染不重建）', () => {
    const el = mount('0', '<p>内容</p>')
    const shadow = el.shadowRoot
    el.setAttribute('value', '1')
    expect(el.shadowRoot).toBe(shadow)
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
  })

  it(':host([hidden]) 显隐由外部（oas-stepper）驱动：hidden 时样式规则存在', () => {
    const el = mount('0')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/:host\(\[hidden\]\)\s*\{\s*display:\s*none/)
  })

  it('无 value 属性：渲染不报错（空态）', () => {
    const el = new OASStepperPanel()
    el.innerHTML = '<p>内容</p>'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
  })

  it('DSD 水合双路径：快照指纹命中 → hydrate 接管，跳过 shadow 重建', () => {
    // 参照实例产真实快照（与 template() 严格一致）
    const ref = mount('0', '<p>内容</p>')
    const snap = ref.shadowRoot!.innerHTML
    const el = new OASStepperPanel()
    el.setAttribute('value', '0')
    el.innerHTML = '<p>内容</p>'
    // 模拟浏览器 upgrade：shadow 里已有 SSR 快照（指纹 + 组件自身 template 结构）
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-stepper-panel" data-oas-ssr-v="1">${snap}`
    document.body.appendChild(el)
    // 水合成功：指纹 meta 被移除
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    expect(el.textContent).toContain('内容')
  })

  it('DSD 水合失败：坏快照 → 回退 render() 全量重建（正确性优先）', () => {
    const el = new OASStepperPanel()
    el.setAttribute('value', '0')
    el.innerHTML = '<p>内容</p>'
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-stepper-panel" data-oas-ssr-v="1"><span>broken</span>`
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
  })
})
