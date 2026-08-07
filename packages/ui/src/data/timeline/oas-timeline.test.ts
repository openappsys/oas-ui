import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASTimeline, OASTimelineItem } from './index.js'

function mount(): OASTimeline {
  const el = new OASTimeline()
  el.innerHTML = `
    <oas-timeline-item time="2024-01-01"><p>事件一</p></oas-timeline-item>
    <oas-timeline-item time="2024-02-01"><p>事件二</p></oas-timeline-item>
  `
  document.body.appendChild(el)
  return el
}

describe('OASTimeline', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染时间线项', () => {
    const el = mount()
    const items = el.shadowRoot!.querySelectorAll('[part="item"]')
    expect(items.length).toBe(2)
    expect(items[0]!.textContent).toContain('事件一')
    expect(items[0]!.textContent).toContain('2024-01-01')
  })

  it('item color 属性透传为标记色', () => {
    const el = new OASTimeline()
    el.innerHTML = `
      <oas-timeline-item time="2024-01-01" color="green"><p>事件一</p></oas-timeline-item>
    `
    document.body.appendChild(el)
    const items = el.shadowRoot!.querySelectorAll('[part="item"]')
    expect(items[0]!.getAttribute('data-color')).toBe('green')
  })
})
