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

function items(el: OASSteps): Element[] {
  return Array.from(el.shadowRoot!.querySelectorAll('[part="item"]'))
}

describe('OASSteps', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染步骤，当前步标记 process', () => {
    const el = mount({ current: '1' })
    const list = items(el)
    expect(list.length).toBe(3)
    expect(list[1]!.getAttribute('data-status')).toBe('process')
  })

  it('按 current 推导状态：前序 finish / 当前 process / 后续 wait', () => {
    const el = mount({ current: '1' })
    const list = items(el)
    expect(list[0]!.getAttribute('data-status')).toBe('finish')
    expect(list[1]!.getAttribute('data-status')).toBe('process')
    expect(list[2]!.getAttribute('data-status')).toBe('wait')
  })

  it('direction=vertical 时纵向布局', () => {
    const el = mount({ direction: 'vertical' })
    expect(el.shadowRoot!.querySelector('[part="steps"]')!.getAttribute('data-direction')).toBe(
      'vertical',
    )
  })

  it('显式 status 覆盖推导：error 步骤即使已过仍为 error', () => {
    const el = mount({
      current: '2',
      steps: JSON.stringify([
        { title: 'A', status: 'error' },
        { title: 'B', status: 'process' },
        { title: 'C', status: 'wait' },
        { title: 'D', status: 'finish' },
      ]),
    })
    const list = items(el)
    expect(list.map((i) => i.getAttribute('data-status'))).toEqual([
      'error',
      'process',
      'wait',
      'finish',
    ])
  })

  it('四种状态渲染对应图标：wait/process 序号，finish ✓，error ✕', () => {
    const el = mount({
      steps: JSON.stringify([
        { title: 'A', status: 'wait' },
        { title: 'B', status: 'process' },
        { title: 'C', status: 'finish' },
        { title: 'D', status: 'error' },
      ]),
    })
    const list = items(el)
    expect(list[0]!.querySelector('.icon')!.textContent).toBe('1')
    expect(list[1]!.querySelector('.icon')!.textContent).toBe('2')
    expect(list[2]!.querySelector('.icon')!.textContent).toBe('✓')
    expect(list[3]!.querySelector('.icon')!.textContent).toBe('✕')
  })

  it('四种状态颜色规则挂在 data-status 上并引用 token（wait 次要 / process 主色 / finish 成功 / error 危险）', () => {
    const el = mount({})
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".item[data-status='process'] .icon")
    expect(css).toContain('var(--oas-color-primary)')
    expect(css).toContain(".item[data-status='finish'] .icon")
    expect(css).toContain('var(--oas-color-success)')
    expect(css).toContain(".item[data-status='error'] .icon")
    expect(css).toContain('var(--oas-color-danger)')
    expect(css).toContain('var(--oas-color-text-secondary)')
  })

  it('clickable：步骤项带按钮语义，点击派发 oas-change{index} 并切换 current', () => {
    const el = mount({ clickable: '' })
    const list = items(el)
    expect(list[0]!.getAttribute('role')).toBe('button')
    expect(list[0]!.getAttribute('tabindex')).toBe('0')
    let fired = 0
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => {
      fired++
      detail = e
    })
    ;(list[2] as HTMLElement).click()
    expect(fired).toBe(1)
    expect((detail as CustomEvent).detail).toEqual({ index: 2 })
    expect((detail as CustomEvent).bubbles).toBe(true)
    expect((detail as CustomEvent).composed).toBe(true)
    expect(el.getAttribute('current')).toBe('2')
  })

  it('clickable：Enter/Space 键盘触发 oas-change', () => {
    const el = mount({ clickable: '' })
    const list = items(el)
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    ;(list[1] as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    expect(fired).toBe(1)
    ;(list[0] as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
    )
    expect(fired).toBe(2)
    expect(el.getAttribute('current')).toBe('0')
  })

  it('非 clickable：无按钮语义、点击不派发 oas-change', () => {
    const el = mount({})
    const list = items(el)
    expect(list[0]!.getAttribute('role')).toBeNull()
    expect(list[0]!.getAttribute('tabindex')).toBeNull()
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    ;(list[0] as HTMLElement).click()
    expect(fired).toBe(0)
  })
})
