import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASAvatarGroup } from './index.js'

function mount(count = 5): OASAvatarGroup {
  const el = new OASAvatarGroup()
  for (let i = 0; i < count; i++) {
    const a = document.createElement('oas-avatar')
    a.textContent = `成员${i}`
    el.appendChild(a)
  }
  document.body.appendChild(el)
  return el
}

describe('OASAvatarGroup', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染分组容器并保留全部头像', () => {
    const el = mount(5)
    expect(el.shadowRoot!.querySelector('[part="group"]')).not.toBeNull()
    expect(el.querySelectorAll('oas-avatar').length).toBe(5)
  })

  it('max 超限时隐藏多余头像并显示 +N 计数', () => {
    const el = mount(5)
    el.setAttribute('max', '3')
    const avatars = el.querySelectorAll<HTMLElement>('oas-avatar')
    expect(avatars[3]!.style.display).toBe('none')
    expect(avatars[4]!.style.display).toBe('none')
    const count = el.shadowRoot!.querySelector('[part="count"]')!
    expect(count.hasAttribute('hidden')).toBe(false)
    expect(count.textContent).toBe('+2')
  })

  it('未超过 max 时全部显示、无计数', () => {
    const el = mount(3)
    el.setAttribute('max', '5')
    const count = el.shadowRoot!.querySelector('[part="count"]')!
    expect(count.hasAttribute('hidden')).toBe(true)
    expect(count.textContent).toBe('')
  })

  it('移除 max 后恢复隐藏头像', () => {
    const el = mount(5)
    el.setAttribute('max', '3')
    el.removeAttribute('max')
    const avatars = el.querySelectorAll<HTMLElement>('oas-avatar')
    expect(avatars[3]!.style.display).toBe('')
    expect(el.shadowRoot!.querySelector('[part="count"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('重叠陈列使用负向 margin', () => {
    const el = mount()
    const style = el.shadowRoot!.querySelector('style')!.textContent
    expect(style).toContain('-8px')
  })

  it('size 属性透传给头像并适配计数圆点', () => {
    const el = mount(4)
    el.setAttribute('max', '3')
    el.setAttribute('size', '48')
    const avatars = el.querySelectorAll<HTMLElement>('oas-avatar')
    expect(avatars[0]!.getAttribute('size')).toBe('48')
    const count = el.shadowRoot!.querySelector<HTMLElement>('[part="count"]')!
    expect(count.style.width).toBe('48px')
  })
})
