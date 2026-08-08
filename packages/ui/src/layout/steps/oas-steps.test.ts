import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASSteps } from './index.js'

const STEPS = JSON.stringify([
  { title: '第一步', description: '开始' },
  { title: '第二步', description: '进行中' },
  { title: '第三步', description: '完成' },
])

function mount(attrs: Record<string, string> = {}): OASSteps {
  const el = new OASSteps()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.steps) el.setAttribute('steps', STEPS)
  document.body.appendChild(el)
  return el
}

describe('OASSteps', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染步骤，当前步标记 current', () => {
    const el = mount({ current: '1' })
    const items = el.shadowRoot!.querySelectorAll('[part="item"]')
    expect(items.length).toBe(3)
    expect(items[1]!.getAttribute('data-status')).toBe('current')
  })

  it('完成的步骤标记完成', () => {
    const el = mount({ current: '2' })
    const items = el.shadowRoot!.querySelectorAll('[part="item"]')
    expect(items[0]!.getAttribute('data-status')).toBe('finish')
  })

  it('direction=vertical 时纵向布局', () => {
    const el = mount({ direction: 'vertical' })
    expect(el.shadowRoot!.querySelector('[part="steps"]')!.getAttribute('data-direction')).toBe(
      'vertical',
    )
  })
})
