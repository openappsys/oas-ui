import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASBackTop } from './index.js'

describe('OASBackTop', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认隐藏，滚动超过阈值显示', () => {
    const el = new OASBackTop()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="btn"]')!.getAttribute('aria-hidden')).toBe('true')
    el.setAttribute('visible', '')
    expect(el.shadowRoot!.querySelector('[part="btn"]')!.getAttribute('aria-hidden')).toBe('false')
  })

  it('点击派发 oas-click 并平滑滚动', () => {
    const el = new OASBackTop()
    document.body.appendChild(el)
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    ;(el.shadowRoot!.querySelector('[part="btn"]') as HTMLElement).click()
    expect(fired).toBe(1)
  })
})
