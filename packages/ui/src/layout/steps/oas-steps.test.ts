import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
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

  it('连接线垂直/水平居中于指示器（top/left 为控件高度一半）', () => {
    const el = mount({})
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('top: calc(var(--oas-control-height-sm) / 2)')
    expect(css).toContain('left: calc(var(--oas-control-height-sm) / 2)')
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

describe('progress-dot（点状步骤）', () => {
  it('progress-dot 属性：容器标记 data-progress-dot', () => {
    const el = mount({ 'progress-dot': '' })
    expect(el.shadowRoot!.querySelector('[part="steps"]')!.getAttribute('data-progress-dot')).toBe(
      'true',
    )
  })

  it('点状模式：指示器为空圆点（不渲染序号/✓/✕）且 aria-hidden 装饰性', () => {
    const el = mount({ 'progress-dot': '' })
    items(el).forEach((item) => {
      const icon = item.querySelector('.icon')!
      expect(icon.textContent).toBe('')
      expect(icon.getAttribute('aria-hidden')).toBe('true')
    })
  })

  it('点状模式：连线为细线并垂直居中于圆点，状态色走 token（wait 灰 / process 主色放大 / finish 主色 / error 危险）', () => {
    const el = mount({ 'progress-dot': '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-progress-dot='true'] .item:not(:last-child)::after")
    expect(css).toContain('var(--oas-color-text-disabled)')
    expect(css).toContain(
      ".steps[data-progress-dot='true'] .item[data-status='process'] .icon::before",
    )
    expect(css).toContain('var(--oas-color-primary)')
    expect(css).toContain(
      ".steps[data-progress-dot='true'] .item[data-status='finish'] .icon::before",
    )
    expect(css).toContain(
      ".steps[data-progress-dot='true'] .item[data-status='error'] .icon::before",
    )
    expect(css).toContain('var(--oas-color-danger)')
  })

  it('点状模式 + clickable：圆点可点，Enter/Space 键盘切换并派发 oas-change', () => {
    const el = mount({ 'progress-dot': '', clickable: '' })
    const list = items(el)
    expect(list[0]!.getAttribute('role')).toBe('button')
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    ;(list[2] as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    expect(fired).toBe(1)
    expect(el.getAttribute('current')).toBe('2')
  })
})

describe('navigation（导航模式）', () => {
  beforeEach(() => {
    setLocale('zh-CN')
  })
  afterEach(() => {
    setLocale('zh-CN')
  })

  it('navigation 属性：容器标记 data-navigation，方向强制横向', () => {
    const el = mount({ navigation: '', direction: 'vertical' })
    const stepsEl = el.shadowRoot!.querySelector('[part="steps"]')!
    expect(stepsEl.getAttribute('data-navigation')).toBe('true')
    expect(stepsEl.getAttribute('data-direction')).toBe('horizontal')
  })

  it('导航模式：底部渲染上一步/下一步按钮（locale 驱动文案），非导航模式隐藏', () => {
    const el = mount({ navigation: '' })
    const nav = el.shadowRoot!.querySelector('[part="nav"]')!
    expect(nav.hasAttribute('hidden')).toBe(false)
    expect(nav.querySelector<HTMLButtonElement>('[part="prev"]')!.textContent).toBe('上一步')
    expect(nav.querySelector<HTMLButtonElement>('[part="next"]')!.textContent).toBe('下一步')

    const plain = mount({})
    expect(plain.shadowRoot!.querySelector('[part="nav"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('导航模式：当前步骤高亮 aria-current=step，状态规则与普通模式一致', () => {
    const el = mount({ navigation: '', current: '1' })
    const list = items(el)
    expect(list[0]!.getAttribute('data-status')).toBe('finish')
    expect(list[1]!.getAttribute('data-status')).toBe('process')
    expect(list[1]!.getAttribute('aria-current')).toBe('step')
    expect(list[2]!.getAttribute('data-status')).toBe('wait')
  })

  it('导航模式：无步骤时底部导航按钮隐藏', () => {
    const el = mount({ navigation: '', steps: '[]' })
    expect(el.shadowRoot!.querySelector('[part="nav"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('导航模式：步骤项隐式可点（无需 clickable），点击切换并派发 oas-change', () => {
    const el = mount({ navigation: '', current: '1' })
    const list = items(el)
    expect(list[0]!.getAttribute('role')).toBe('button')
    expect(list[0]!.getAttribute('tabindex')).toBe('0')
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    ;(list[2] as HTMLElement).click()
    expect(fired).toBe(1)
    expect(el.getAttribute('current')).toBe('2')
  })

  it('导航模式：首步上一步禁用、末步下一步禁用', () => {
    const el = mount({ navigation: '', current: '0' })
    const prev = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="prev"]')!
    const next = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="next"]')!
    expect(prev.disabled).toBe(true)
    expect(next.disabled).toBe(false)
    el.setAttribute('current', '2')
    expect(prev.disabled).toBe(false)
    expect(next.disabled).toBe(true)
  })

  it('导航模式：上一步/下一步点击切换 current 并派发 oas-change{index}', () => {
    const el = mount({ navigation: '', current: '1' })
    const prev = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="prev"]')!
    const next = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="next"]')!
    const details: unknown[] = []
    el.addEventListener('oas-change', (e: Event) => details.push((e as CustomEvent).detail))
    next.click()
    expect(el.getAttribute('current')).toBe('2')
    prev.click()
    expect(el.getAttribute('current')).toBe('1')
    expect(details).toEqual([{ index: 2 }, { index: 1 }])
  })

  it('导航模式：CSS 引用主色/on-primary token，箭头形状挂在非末项上', () => {
    const el = mount({ navigation: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-navigation='true'] .item")
    expect(css).toContain('var(--oas-color-primary)')
    expect(css).toContain('var(--oas-color-text-on-primary)')
    expect(css).toContain(".steps[data-navigation='true'] .item:not(:last-child)::after")
  })
})
