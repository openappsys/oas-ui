import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASAffix } from './index.js'

function mount(attrs: Record<string, string> = {}): OASAffix {
  const el = new OASAffix()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<div>固钉内容</div>`
  document.body.appendChild(el)
  return el
}

describe('OASAffix', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染包裹内容', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
  })

  it('offset 属性生效', () => {
    const el = mount({ offset: '80' })
    expect(el.getAttribute('offset')).toBe('80')
  })
})
