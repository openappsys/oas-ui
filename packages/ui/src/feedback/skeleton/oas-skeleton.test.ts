import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASSkeleton } from './index.js'

describe('OASSkeleton', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认渲染 3 段段落行', () => {
    const el = new OASSkeleton()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelectorAll('[part="line"]').length).toBe(3)
  })

  it('rows 属性控制行数', () => {
    const el = new OASSkeleton()
    el.setAttribute('rows', '5')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelectorAll('[part="line"]').length).toBe(5)
  })

  it('title/avatar 开关', () => {
    const el = new OASSkeleton()
    el.setAttribute('title', '')
    el.setAttribute('avatar', '')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="title"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="avatar"]')).not.toBeNull()
  })

  it('active 时带动画类', () => {
    const el = new OASSkeleton()
    el.setAttribute('active', '')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="block"]')!.classList.contains('active')).toBe(true)
  })
})
