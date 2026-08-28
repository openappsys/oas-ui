import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASContainer } from './index.js'

function mount(attrs: Record<string, string> = {}): OASContainer {
  const el = new OASContainer()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

describe('OASContainer（定宽容器）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('注册 oas-container 自定义元素', () => {
    expect(customElements.get('oas-container')).not.toBeNull()
  })

  it('默认 size=lg 且居中', () => {
    const el = mount()
    expect(el.dataset.size).toBe('lg')
    expect(el.style.getPropertyValue('--oas-container-max')).toBe('var(--oas-container-lg)')
    expect(el.dataset.center).toBe('true')
  })

  it('size 映射对应 --oas-container-* token', () => {
    const cases = [
      ['xs', 'var(--oas-container-xs)'],
      ['sm', 'var(--oas-container-sm)'],
      ['md', 'var(--oas-container-md)'],
      ['lg', 'var(--oas-container-lg)'],
      ['xl', 'var(--oas-container-xl)'],
      ['full', 'var(--oas-container-full)'],
    ] as const
    for (const [size, token] of cases) {
      const el = mount({ size })
      expect(el.dataset.size).toBe(size)
      expect(el.style.getPropertyValue('--oas-container-max')).toBe(token)
    }
  })

  it('非法 size 回退 lg', () => {
    const el = mount({ size: 'huge' })
    expect(el.dataset.size).toBe('lg')
    expect(el.style.getPropertyValue('--oas-container-max')).toBe('var(--oas-container-lg)')
  })

  it('center="false" 关闭居中（margin-inline 归零）', () => {
    const el = mount({ center: 'false' })
    expect(el.dataset.center).toBe('false')
    expect(el.style.getPropertyValue('--oas-container-max')).toBe('var(--oas-container-lg)')
  })

  it('padding 属性覆盖 --oas-container-padding，移除后清空', () => {
    const el = mount({ padding: 'var(--oas-space-4)' })
    expect(el.style.getPropertyValue('--oas-container-padding')).toBe('var(--oas-space-4)')
    el.removeAttribute('padding')
    expect(el.style.getPropertyValue('--oas-container-padding')).toBe('')
  })

  it('属性变化增量同步（不重建 shadow DOM）', () => {
    const el = mount()
    const root = el.shadowRoot!.querySelector('[part="root"]')
    el.setAttribute('size', 'xl')
    expect(el.style.getPropertyValue('--oas-container-max')).toBe('var(--oas-container-xl)')
    el.setAttribute('center', 'false')
    expect(el.dataset.center).toBe('false')
    expect(el.shadowRoot!.querySelector('[part="root"]')).toBe(root)
  })

  it('无子元素不报错，slot 存在', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="root"]')).not.toBeNull()
  })

  it('渲染 slot 内容', () => {
    const el = mount()
    el.innerHTML = '<p>内容</p>'
    expect(el.querySelector('p')!.textContent).toBe('内容')
  })

  // ===== 布局批 1：fluid / breakout =====

  it('fluid：不挂 --oas-container-max，dataset.fluid=true', () => {
    const el = mount({ fluid: '' })
    expect(el.style.getPropertyValue('--oas-container-max')).toBe('')
    expect(el.dataset.fluid).toBe('true')
  })

  it('fluid 与 size 正交：fluid 存在时 size 限宽失效', () => {
    const el = mount({ fluid: '', size: 'xs' })
    expect(el.style.getPropertyValue('--oas-container-max')).toBe('')
  })

  it('fluid 移除后恢复定宽（--oas-container-max 重新挂载）', () => {
    const el = mount({ fluid: '' })
    expect(el.style.getPropertyValue('--oas-container-max')).toBe('')
    el.removeAttribute('fluid')
    expect(el.style.getPropertyValue('--oas-container-max')).toBe('var(--oas-container-lg)')
    expect(el.dataset.fluid).toBe('false')
  })

  it('fluid 样式规则：:host([fluid]) 关掉 max-width', () => {
    const el = mount()
    const styleText = el.shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toContain(':host([fluid])')
    expect(styleText).toContain('max-width: none')
  })

  it('breakout：slot 内带 breakout 属性的子元素突破定宽（100vw + margin 公式）', () => {
    const el = mount()
    const styleText = el.shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toContain('::slotted([breakout])')
    expect(styleText).toContain('width: 100vw')
    expect(styleText).toContain('margin-inline: calc(50% - 50vw)')
  })
})
