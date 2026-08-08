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

  it('pending 尾节点显示进行中标记与默认文案', () => {
    const el = new OASTimeline()
    el.innerHTML = `
      <oas-timeline-item time="2024-01-01"><p>事件一</p></oas-timeline-item>
      <oas-timeline-item pending></oas-timeline-item>
    `
    document.body.appendChild(el)
    const items = el.shadowRoot!.querySelectorAll('[part="item"]')
    expect(items[0]!.hasAttribute('data-pending')).toBe(false)
    expect(items[1]!.hasAttribute('data-pending')).toBe(true)
    expect(items[1]!.textContent).toContain('敬请期待')
  })

  it('pending 节点有内容时保留内容', () => {
    const el = new OASTimeline()
    el.innerHTML = `
      <oas-timeline-item time="2024-01-01"><p>事件一</p></oas-timeline-item>
      <oas-timeline-item pending>正在开发中</oas-timeline-item>
    `
    document.body.appendChild(el)
    const items = el.shadowRoot!.querySelectorAll('[part="item"]')
    expect(items[1]!.textContent).toContain('正在开发中')
  })
})
