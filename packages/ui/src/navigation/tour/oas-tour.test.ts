import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASTour } from './index.js'

const STEPS = JSON.stringify([
  { selector: '#step1', title: '第一步', description: '这里是第一步' },
  { selector: '#step2', title: '第二步', description: '这里是第二步' },
])

function mount(): OASTour {
  document.body.innerHTML = `<div id="step1" style="height:40px"></div><div id="step2" style="height:40px"></div>`
  const el = new OASTour()
  el.setAttribute('steps', STEPS)
  document.body.appendChild(el)
  return el
}

describe('OASTour', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('open 时显示引导气泡与遮罩', async () => {
    const el = mount()
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('[part="mask"]')).not.toBeNull()
    expect(el.shadowRoot!.textContent).toContain('第一步')
  })

  it('下一步切换步骤并派发 oas-step', async () => {
    const el = mount()
    el.setAttribute('open', '')
    let detail: unknown
    el.addEventListener('oas-step', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[part="next"]') as HTMLElement).click()
    expect(detail).toEqual({ index: 1 })
    expect(el.shadowRoot!.textContent).toContain('第二步')
  })

  it('最后一步完成派发 oas-finish 并关闭', async () => {
    const el = mount()
    el.setAttribute('open', '')
    el.setAttribute('current', '1')
    let finished = 0
    el.addEventListener('oas-finish', () => finished++)
    ;(el.shadowRoot!.querySelector('[part="next"]') as HTMLElement).click()
    expect(finished).toBe(1)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('Esc 跳过派发 oas-cancel', async () => {
    const el = mount()
    el.setAttribute('open', '')
    let cancelled = 0
    el.addEventListener('oas-cancel', () => cancelled++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(cancelled).toBe(1)
    expect(el.hasAttribute('open')).toBe(false)
  })
})
