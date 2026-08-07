import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASProgress } from './index.js'

function mount(attrs: Record<string, string> = {}): OASProgress {
  const el = new OASProgress()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

describe('OASProgress', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('percent 驱动进度条宽度与 ARIA', () => {
    const el = mount({ percent: '40' })
    const bar = el.shadowRoot!.querySelector('[part="bar"]')!
    expect(bar.style.width).toBe('40%')
    const pb = el.shadowRoot!.querySelector('[role="progressbar"]')!
    expect(pb.getAttribute('aria-valuenow')).toBe('40')
    expect(pb.getAttribute('aria-valuemin')).toBe('0')
    expect(pb.getAttribute('aria-valuemax')).toBe('100')
  })

  it('percent 100 显示完成状态', () => {
    const el = mount({ percent: '100' })
    expect(el.shadowRoot!.querySelector('[part="bar"]')!.classList.contains('done')).toBe(true)
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toContain('100%')
  })

  it('default 显示当前百分比文本', () => {
    const el = mount({ percent: '60' })
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toContain('60%')
  })
})
