import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
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

  it('连接线中心对准指示器中心（普通模式 28 盒圆心 sm/2+2、dot 模式 24 盒圆心 sm/2，线高/宽 2px 各减 1px）', () => {
    const el = mount({})
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    // 基础（普通模式，图标带 2px border）：线顶 = sm/2 + 1（圆心 sm/2+2）
    expect(css).toContain('top: calc(var(--oas-control-height-sm) / 2 + 1px)')
    // dot 模式覆盖（无边框）：线顶 = sm/2 - 1（圆心 sm/2）
    expect(css).toContain(".steps[data-progress-dot='true'] .item:not(:last-child)::after")
    // vertical：左缘 = sm/2 + 1（28 盒圆心 sm/2+2）
    expect(css).toContain('left: calc(var(--oas-control-height-sm) / 2 + 1px)')
    // 图标 top 对齐行盒顶（消除行内基线间隙）
    expect(css).toMatch(/\.icon\s*\{[^}]*vertical-align:\s*top/)
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

describe('StepItem.icon（图标指示器）', () => {
  it('显式 icon：指示器位置渲染内联 SVG，覆盖状态默认图标（wait 序号 / finish ✓）', () => {
    const el = mount({
      steps: JSON.stringify([
        { title: 'A', status: 'wait', icon: 'user' },
        { title: 'B', status: 'finish', icon: 'edit' },
      ]),
    })
    const list = items(el)
    const iconA = list[0]!.querySelector('.icon')!
    expect(iconA.querySelector('svg')).not.toBeNull()
    expect(iconA.textContent).toBe('')
    const iconB = list[1]!.querySelector('.icon')!
    expect(iconB.querySelector('svg')).not.toBeNull()
    expect(iconB.textContent).toBe('')
  })

  it('显式 icon 覆盖 error ✕；icon 无匹配注册表时回落状态默认图标（label/title 照常）', () => {
    const el = mount({
      steps: JSON.stringify([
        { title: 'A', status: 'error', icon: 'close-circle' },
        { title: 'B', status: 'wait', icon: 'no-such-icon' },
        { title: 'C', status: 'finish', icon: 'no-such-icon' },
      ]),
    })
    const list = items(el)
    // error + 匹配 icon → svg
    expect(list[0]!.querySelector('.icon svg')).not.toBeNull()
    // 无匹配 → 回落序号 / ✓
    expect(list[1]!.querySelector('.icon svg')).toBeNull()
    expect(list[1]!.querySelector('.icon')!.textContent).toBe('2')
    expect(list[2]!.querySelector('.icon')!.textContent).toBe('✓')
    expect(list[2]!.querySelector('.text')!.textContent).toBe('C')
  })

  it('progress-dot 下显式 icon 不渲染（保持点状装饰圆点）', () => {
    const el = mount({ 'progress-dot': '', steps: JSON.stringify([{ title: 'A', icon: 'user' }]) })
    const icon = items(el)[0]!.querySelector('.icon')!
    expect(icon.querySelector('svg')).toBeNull()
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.textContent).toBe('')
  })

  it('navigation 下显式 icon 不渲染（导航自身形态，无指示器）', () => {
    const el = mount({ navigation: '', steps: JSON.stringify([{ title: 'A', icon: 'user' }]) })
    expect(items(el)[0]!.querySelector('.icon')).toBeNull()
  })
})

describe('StepItem.disabled（禁用步骤）', () => {
  it('disabled：clickable 下无按钮语义，点击/键盘均不派发 oas-change', () => {
    const el = mount({
      clickable: '',
      current: '0',
      steps: JSON.stringify([
        { title: 'A' },
        { title: 'B', disabled: true },
        { title: 'C' },
      ]),
    })
    const list = items(el)
    expect(list[1]!.getAttribute('role')).toBeNull()
    expect(list[1]!.getAttribute('tabindex')).toBeNull()
    expect(list[1]!.getAttribute('aria-disabled')).toBe('true')
    expect(list[1]!.getAttribute('data-disabled')).toBe('true')
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    ;(list[1] as HTMLElement).click()
    ;(list[1] as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    expect(fired).toBe(0)
    expect(el.getAttribute('current')).toBe('0')
    // 非 disabled 项仍可点
    ;(list[2] as HTMLElement).click()
    expect(fired).toBe(1)
    expect(el.getAttribute('current')).toBe('2')
  })

  it('disabled：显式 status 仍正常显示（data-status 与图标内容保留）', () => {
    const el = mount({
      steps: JSON.stringify([
        { title: 'A', status: 'finish', disabled: true },
        { title: 'B', status: 'error', disabled: true },
      ]),
    })
    const list = items(el)
    expect(list[0]!.getAttribute('data-status')).toBe('finish')
    expect(list[0]!.querySelector('.icon')!.textContent).toBe('✓')
    expect(list[1]!.getAttribute('data-status')).toBe('error')
    expect(list[1]!.querySelector('.icon')!.textContent).toBe('✕')
  })

  it('disabled：视觉弱化引用弱化色 token', () => {
    const el = mount({})
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".item[data-disabled='true'] .text")
    expect(css).toContain('var(--oas-color-text-disabled)')
  })

  it('disabled：navigation 下禁点（无按钮语义、点击静默）', () => {
    const el = mount({
      navigation: '',
      current: '1',
      steps: JSON.stringify([
        { title: 'A' },
        { title: 'B', disabled: true },
        { title: 'C' },
      ]),
    })
    const list = items(el)
    expect(list[0]!.getAttribute('role')).toBe('button')
    expect(list[1]!.getAttribute('role')).toBeNull()
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    ;(list[1] as HTMLElement).click()
    expect(fired).toBe(0)
    expect(el.getAttribute('current')).toBe('1')
  })
})

describe('linear（线性推进）', () => {
  it('linear：clickable 下仅 index<=current 可点，未来步无按钮语义且点击静默', () => {
    const el = mount({ clickable: '', linear: '', current: '1' })
    const list = items(el)
    expect(list[0]!.getAttribute('role')).toBe('button')
    expect(list[1]!.getAttribute('role')).toBe('button')
    expect(list[2]!.getAttribute('role')).toBeNull()
    expect(list[2]!.getAttribute('tabindex')).toBeNull()
    expect(list[2]!.getAttribute('data-disabled')).toBe('true')
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    ;(list[2] as HTMLElement).click()
    expect(fired).toBe(0)
    expect(el.getAttribute('current')).toBe('1')
    // 已过步仍可回跳
    ;(list[0] as HTMLElement).click()
    expect(fired).toBe(1)
    expect(el.getAttribute('current')).toBe('0')
  })

  it('linear + disabled 叠加：都禁点', () => {
    const el = mount({
      clickable: '',
      linear: '',
      current: '1',
      steps: JSON.stringify([{ title: 'A' }, { title: 'B' }, { title: 'C', disabled: true }]),
    })
    const list = items(el)
    // C 显式 disabled（未来步 + disabled 叠加）
    expect(list[2]!.getAttribute('role')).toBeNull()
    expect(list[2]!.getAttribute('data-disabled')).toBe('true')
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    ;(list[2] as HTMLElement).click()
    expect(fired).toBe(0)
    expect(el.getAttribute('current')).toBe('1')
  })

  it('linear：navigation 下未来步禁点，底部按钮按序推进不受限', () => {
    const el = mount({ navigation: '', linear: '', current: '1' })
    const list = items(el)
    expect(list[0]!.getAttribute('role')).toBe('button')
    expect(list[2]!.getAttribute('role')).toBeNull()
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    ;(list[2] as HTMLElement).click()
    expect(fired).toBe(0)
    expect(el.getAttribute('current')).toBe('1')
    // 下一步按钮仍可顺序推进
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="next"]')!.click()
    expect(el.getAttribute('current')).toBe('2')
  })

  it('linear：非交互模式（无 clickable/navigation）下未来步不标记禁点（linear 只约束点击）', () => {
    const el = mount({ linear: '', current: '1' })
    const list = items(el)
    expect(list[2]!.getAttribute('data-disabled')).toBeNull()
    expect(list[2]!.getAttribute('role')).toBeNull()
    expect(list[0]!.getAttribute('role')).toBeNull()
  })
})

describe('label-placement（标签排布）', () => {
  it('label-placement=horizontal：容器标记 data-label-placement，同行布局 CSS 存在', () => {
    const el = mount({ 'label-placement': 'horizontal' })
    const stepsEl = el.shadowRoot!.querySelector('[part="steps"]')!
    expect(stepsEl.getAttribute('data-label-placement')).toBe('horizontal')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-label-placement='horizontal'] .item")
    expect(css).toContain('display: flex')
  })

  it('label-placement 缺省 / 显式 vertical：不设 data-label-placement（保持现状）', () => {
    const plain = mount({})
    expect(
      plain.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-label-placement'),
    ).toBe(false)
    const v = mount({ 'label-placement': 'vertical' })
    expect(
      v.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-label-placement'),
    ).toBe(false)
  })

  it('label-placement=horizontal 在 progress-dot 下退化为现状点状（不设标记）', () => {
    const el = mount({ 'progress-dot': '', 'label-placement': 'horizontal' })
    expect(
      el.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-label-placement'),
    ).toBe(false)
  })

  it('label-placement=horizontal 在 navigation 下强制现状（不设标记）', () => {
    const el = mount({ navigation: '', 'label-placement': 'horizontal' })
    expect(
      el.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-label-placement'),
    ).toBe(false)
  })

  it('label-placement=horizontal 在 direction=vertical 下不生效（纵向保持图标左/标题右）', () => {
    const el = mount({ direction: 'vertical', 'label-placement': 'horizontal' })
    expect(
      el.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-label-placement'),
    ).toBe(false)
  })
})

describe('容器 status（覆盖当前步状态）', () => {
  it('status 属性覆盖 current 推导的当前步：当前步为 error，前序 finish / 后续 wait', () => {
    const el = mount({ current: '1', status: 'error' })
    expect(items(el).map((i) => i.getAttribute('data-status'))).toEqual(['finish', 'error', 'wait'])
  })

  it('status 只作用于当前步：前序步仍按 current 推导为 finish', () => {
    const el = mount({ current: '2', status: 'wait' })
    const list = items(el)
    expect(list[0]!.getAttribute('data-status')).toBe('finish')
    expect(list[1]!.getAttribute('data-status')).toBe('finish')
    expect(list[2]!.getAttribute('data-status')).toBe('wait')
  })

  it('StepItem 显式 status 仍最高优先（容器 status 不覆盖显式）', () => {
    const el = mount({
      current: '1',
      status: 'error',
      steps: JSON.stringify([
        { title: 'A', status: 'finish' },
        { title: 'B' },
      ]),
    })
    const list = items(el)
    // A 显式 finish（前序步）不被容器 status 影响
    expect(list[0]!.getAttribute('data-status')).toBe('finish')
    // B 是当前步：容器 status=error 覆盖推导的 process
    expect(list[1]!.getAttribute('data-status')).toBe('error')
  })

  it('status 非法值忽略：回落 process 推导', () => {
    const el = mount({ current: '1', status: 'bogus' })
    expect(items(el)[1]!.getAttribute('data-status')).toBe('process')
  })

  it('status=finish：全流程演示「当前步已完成」态', () => {
    const el = mount({ current: '1', status: 'finish' })
    expect(items(el)[1]!.getAttribute('data-status')).toBe('finish')
    expect(items(el)[1]!.querySelector('.icon')!.textContent).toBe('✓')
  })
})

describe('StepItem.extra（操作提示行）', () => {
  it('extra 渲染为描述下方的弱化小字（textContent 内容）', () => {
    const el = mount({ steps: JSON.stringify([{ title: 'A', description: 'd', extra: '提示' }]) })
    const item = items(el)[0]!
    const extra = item.querySelector<HTMLElement>('.extra')!
    expect(extra).not.toBeNull()
    expect(extra.textContent).toBe('提示')
    // 顺序：title → desc → extra
    const text = item.querySelector<HTMLElement>('.text')!
    const desc = item.querySelector<HTMLElement>('.desc')!
    expect(text.compareDocumentPosition(extra) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(desc.compareDocumentPosition(extra) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('extra 走 textContent：HTML 字符串不生成元素（防注入）', () => {
    const el = mount({
      steps: JSON.stringify([{ title: 'A', extra: '<img src=x onerror=alert(1)>' }]),
    })
    const extra = items(el)[0]!.querySelector('.extra')!
    expect(extra.querySelector('img')).toBeNull()
    expect(extra.textContent).toBe('<img src=x onerror=alert(1)>')
  })

  it('navigation 下 extra 隐藏（与 desc 一致）', () => {
    const el = mount({ navigation: '', steps: JSON.stringify([{ title: 'A', extra: 'x' }]) })
    expect(items(el)[0]!.querySelector('.extra')).toBeNull()
  })

  it('extra 弱化小字走 text-disabled token', () => {
    const el = mount({})
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('.extra')
    expect(css).toContain('var(--oas-color-text-disabled)')
  })
})

describe('StepItem.id（标识回传）', () => {
  it('oas-change detail 带 id：{ index, id }（index 兼容不变）', () => {
    const el = mount({
      clickable: '',
      steps: JSON.stringify([
        { title: 'A', id: 'step-a' },
        { title: 'B', id: 'step-b' },
      ]),
    })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(items(el)[1] as HTMLElement).click()
    expect(detail).toEqual({ index: 1, id: 'step-b' })
  })

  it('无 id 步骤 detail 保持 { index }（向后兼容）', () => {
    const el = mount({ clickable: '' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(items(el)[0] as HTMLElement).click()
    expect(detail).toEqual({ index: 0 })
  })

  it('navigation 底部按钮跳转 detail 带对应步 id', () => {
    const el = mount({
      navigation: '',
      current: '0',
      steps: JSON.stringify([
        { title: 'A', id: 'a' },
        { title: 'B', id: 'b' },
      ]),
    })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="next"]')!.click()
    expect(detail).toEqual({ index: 1, id: 'b' })
  })
})

describe('oas-before-change（跳步前拦截）', () => {
  it('clickable 跳步前派发 detail { index }，默认放行（current 更新 + change 派发）', () => {
    const el = mount({ clickable: '' })
    const befores: unknown[] = []
    const changes: unknown[] = []
    el.addEventListener('oas-before-change', (e: Event) => befores.push((e as CustomEvent).detail))
    el.addEventListener('oas-change', (e: Event) => changes.push((e as CustomEvent).detail))
    ;(items(el)[2] as HTMLElement).click()
    expect(befores).toEqual([{ index: 2 }])
    expect(changes).toEqual([{ index: 2 }])
    expect(el.getAttribute('current')).toBe('2')
  })

  it('preventDefault 取消跳步：current 不变、不派发 oas-change', () => {
    const el = mount({ clickable: '', current: '0' })
    el.addEventListener('oas-before-change', (e: Event) => e.preventDefault())
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    ;(items(el)[2] as HTMLElement).click()
    expect(fired).toBe(0)
    expect(el.getAttribute('current')).toBe('0')
  })

  it('键盘 Enter 跳步同样可被拦截', () => {
    const el = mount({ clickable: '', current: '0' })
    el.addEventListener('oas-before-change', (e: Event) => e.preventDefault())
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    ;(items(el)[1] as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    expect(fired).toBe(0)
    expect(el.getAttribute('current')).toBe('0')
  })

  it('navigation 上一步/下一步按钮同样可被拦截', () => {
    const el = mount({ navigation: '', current: '1' })
    el.addEventListener('oas-before-change', (e: Event) => e.preventDefault())
    const next = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="next"]')!
    const prev = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="prev"]')!
    next.click()
    expect(el.getAttribute('current')).toBe('1')
    prev.click()
    expect(el.getAttribute('current')).toBe('1')
  })

  it('disabled / linear 未来步禁点：点击静默（不派发 before-change）', () => {
    const el = mount({
      clickable: '',
      linear: '',
      current: '1',
      steps: JSON.stringify([
        { title: 'A' },
        { title: 'B' },
        { title: 'C', disabled: true },
      ]),
    })
    let befores = 0
    el.addEventListener('oas-before-change', () => befores++)
    ;(items(el)[2] as HTMLElement).click()
    expect(befores).toBe(0)
  })

  it('oas-before-change 为 cancelable 事件（bubbles + composed）', () => {
    const el = mount({ clickable: '' })
    let ev: Event | null = null
    el.addEventListener('oas-before-change', (e: Event) => (ev = e))
    ;(items(el)[1] as HTMLElement).click()
    expect(ev!.cancelable).toBe(true)
    expect(ev!.bubbles).toBe(true)
    expect(ev!.composed).toBe(true)
  })
})

describe('StepItem.loading（加载指示器）', () => {
  it('loading：指示器渲染旋转圈（.spinner），序号/✓/✕ 让位', () => {
    const el = mount({
      current: '0',
      steps: JSON.stringify([
        { title: 'A' },
        { title: 'B', loading: true },
        { title: 'C', status: 'finish' },
      ]),
    })
    const list = items(el)
    // A 是当前步（process）：非 loading 照常渲染序号
    expect(list[0]!.querySelector('.icon .spinner')).toBeNull()
    expect(list[0]!.querySelector('.icon')!.textContent).toBe('1')
    // B 是后续步（wait + loading）：loading 渲染旋转圈，序号让位
    expect(list[1]!.querySelector('.icon .spinner')).not.toBeNull()
    expect(list[1]!.querySelector('.icon')!.textContent).toBe('')
    // C 显式 finish：照常 ✓
    expect(list[2]!.querySelector('.icon')!.textContent).toBe('✓')
  })

  it('loading 优先于显式 icon：有 icon 时 icon 让位', () => {
    const el = mount({ steps: JSON.stringify([{ title: 'A', loading: true, icon: 'user' }]) })
    const icon = items(el)[0]!.querySelector('.icon')!
    expect(icon.querySelector('.spinner')).not.toBeNull()
    expect(icon.querySelector('svg')).toBeNull()
  })

  it('progress-dot / navigation / simple 下 loading 让位（不渲染 spinner）', () => {
    const dot = mount({ 'progress-dot': '', steps: JSON.stringify([{ title: 'A', loading: true }]) })
    expect(items(dot)[0]!.querySelector('.icon .spinner')).toBeNull()
    const nav = mount({ navigation: '', steps: JSON.stringify([{ title: 'A', loading: true }]) })
    expect(items(nav)[0]!.querySelector('.spinner')).toBeNull()
    const simple = mount({ simple: '', steps: JSON.stringify([{ title: 'A', loading: true }]) })
    expect(items(simple)[0]!.querySelector('.icon .spinner')).toBeNull()
  })

  it('spinner 走 token：主色旋转圈 + bg-hover 轨道 + keyframes 动画', () => {
    const el = mount({})
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('border-top-color: var(--oas-color-primary)')
    expect(css).toContain('var(--oas-color-bg-hover)')
    expect(css).toContain('@keyframes')
  })
})

describe('StepItem.optional（可选标记）', () => {
  it('optional：标题旁渲染弱化「可选」文案（i18n zh）', () => {
    setLocale('zh-CN')
    const el = mount({ steps: JSON.stringify([{ title: 'A', optional: true }]) })
    const opt = items(el)[0]!.querySelector<HTMLElement>('.text .optional')!
    expect(opt).not.toBeNull()
    expect(opt.textContent).toBe('可选')
  })

  it('optional 文案随 locale：en 为 Optional', () => {
    setLocale(en)
    const el = mount({ steps: JSON.stringify([{ title: 'A', optional: true }]) })
    expect(items(el)[0]!.querySelector('.text .optional')!.textContent).toBe('Optional')
    setLocale('zh-CN')
  })

  it('非 optional 步不渲染标记', () => {
    const el = mount({ steps: JSON.stringify([{ title: 'A' }]) })
    expect(items(el)[0]!.querySelector('.optional')).toBeNull()
  })

  it('optional 弱化样式引用 text-disabled token', () => {
    const el = mount({})
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('.optional')
    expect(css).toContain('var(--oas-color-text-disabled)')
  })
})

describe('lineless（无连接线）', () => {
  it('lineless：容器标记 data-lineless，CSS 隐藏连接线', () => {
    const el = mount({ lineless: '' })
    const stepsEl = el.shadowRoot!.querySelector('[part="steps"]')!
    expect(stepsEl.getAttribute('data-lineless')).toBe('true')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-lineless='true'] .item:not(:last-child)::after")
    expect(css).toContain('display: none')
  })
})

describe('simple（紧凑模式）', () => {
  it('simple：容器标记 data-simple，CSS 单行小尺寸（指示器缩小、描述隐藏、连接线贴紧）', () => {
    const el = mount({ simple: '', current: '1' })
    const stepsEl = el.shadowRoot!.querySelector('[part="steps"]')!
    expect(stepsEl.getAttribute('data-simple')).toBe('true')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-simple='true'] .item")
    expect(css).toContain('display: flex')
    expect(css).toContain(".steps[data-simple='true'] .icon")
  })

  it('simple：描述隐藏、指示器与标题同行（item flex 行布局）', () => {
    const el = mount({ simple: '', steps: JSON.stringify([{ title: 'A', description: 'd' }]) })
    const item = items(el)[0]!
    expect(item.querySelector('.desc')).toBeNull()
    expect(item.querySelector('.icon')!.textContent).toBe('1')
  })

  it('simple 优先于 progress-dot：不设 data-progress-dot、不渲染装饰圆点', () => {
    const el = mount({ simple: '', 'progress-dot': '' })
    const stepsEl = el.shadowRoot!.querySelector('[part="steps"]')!
    expect(stepsEl.hasAttribute('data-progress-dot')).toBe(false)
    expect(items(el)[0]!.querySelector('.icon')!.textContent).toBe('1')
  })

  it('simple 优先于 navigation：不设 data-navigation、底部导航隐藏', () => {
    const el = mount({ simple: '', navigation: '', current: '1' })
    const stepsEl = el.shadowRoot!.querySelector('[part="steps"]')!
    expect(stepsEl.hasAttribute('data-navigation')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="nav"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('simple 下 loading/percent 让位（不渲染 spinner/进度环）', () => {
    const el = mount({
      simple: '',
      current: '0',
      steps: JSON.stringify([{ title: 'A', loading: true, percent: 60 }]),
    })
    const icon = items(el)[0]!.querySelector('.icon')!
    expect(icon.querySelector('.spinner')).toBeNull()
    expect(icon.querySelector('svg')).toBeNull()
  })

  it('simple 下 label-placement 不生效（simple 自身单行布局）', () => {
    const el = mount({ simple: '', 'label-placement': 'horizontal' })
    expect(
      el.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-label-placement'),
    ).toBe(false)
  })
})

describe('separator（连接线形态）', () => {
  it('separator 缺省为 line：不设 data-separator', () => {
    const el = mount({})
    expect(el.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-separator')).toBe(
      false,
    )
  })

  it('separator=dashed：data-separator 标记 + CSS border dashed（走 token）', () => {
    const el = mount({ separator: 'dashed' })
    const stepsEl = el.shadowRoot!.querySelector('[part="steps"]')!
    expect(stepsEl.getAttribute('data-separator')).toBe('dashed')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-separator='dashed'] .item:not(:last-child)::after")
    expect(css).toContain('dashed')
    expect(css).toContain('var(--oas-color-border)')
  })

  it('separator=arrow：data-separator 标记 + CSS 三角（border 实现）', () => {
    const el = mount({ separator: 'arrow' })
    const stepsEl = el.shadowRoot!.querySelector('[part="steps"]')!
    expect(stepsEl.getAttribute('data-separator')).toBe('arrow')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-separator='arrow'] .item:not(:last-child)::before")
    expect(css).toContain('border-right: 8px solid')
    expect(css).toContain('var(--oas-color-border)')
  })

  it('separator 非法值回落 line（不设 data-separator）', () => {
    const el = mount({ separator: 'zigzag' })
    expect(el.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-separator')).toBe(
      false,
    )
  })

  it('navigation 下 separator 不生效（导航自身箭头形态）', () => {
    const el = mount({ navigation: '', separator: 'arrow' })
    expect(el.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-separator')).toBe(
      false,
    )
  })
})

describe('StepItem.percent（进度圆环）', () => {
  it('process 步 percent：指示器渲染 SVG 进度环（stroke-dasharray 按百分比）', () => {
    const el = mount({
      current: '1',
      steps: JSON.stringify([{ title: 'A' }, { title: 'B', percent: 60 }, { title: 'C' }]),
    })
    const icon = items(el)[1]!.querySelector('.icon')!
    const bar = icon.querySelector<SVGCircleElement>('.progress-bar')!
    expect(bar).not.toBeNull()
    expect(bar.getAttribute('stroke-dasharray')).toBe('60 40')
    expect(icon.querySelector('.percent-text')!.textContent).toBe('60%')
  })

  it('percent 序号让位：进度环步不渲染序号/✓/✕/icon', () => {
    const el = mount({
      current: '0',
      steps: JSON.stringify([{ title: 'A', percent: 30, icon: 'user' }]),
    })
    const icon = items(el)[0]!.querySelector('.icon')!
    expect(icon.querySelector('.progress-bar')).not.toBeNull()
    expect(icon.querySelector('.spinner')).toBeNull()
    expect(icon.querySelector('.percent-text')!.textContent).toBe('30%')
  })

  it('非 process 步 percent 忽略（渲染状态默认图标）', () => {
    const el = mount({
      current: '1',
      steps: JSON.stringify([{ title: 'A', percent: 50 }, { title: 'B' }]),
    })
    // A 是 finish（前序）：percent 不生效 → 渲染 ✓
    expect(items(el)[0]!.querySelector('.icon .progress-bar')).toBeNull()
    expect(items(el)[0]!.querySelector('.icon')!.textContent).toBe('✓')
  })

  it('percent 越界/非法忽略（<0 / >100 / NaN）', () => {
    const el = mount({
      current: '0',
      steps: JSON.stringify([
        { title: 'A', percent: -5 },
        { title: 'B', percent: 120 },
        { title: 'C', percent: 'abc' as unknown as number },
      ]),
    })
    const list = items(el)
    for (const item of list) {
      expect(item.querySelector('.icon .progress-bar')).toBeNull()
      expect(item.querySelector('.icon')!.textContent).toMatch(/^\d$/)
    }
  })

  it('percent 圆环走 token（track bg-hover / bar primary）', () => {
    const el = mount({})
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('.progress-track')
    expect(css).toContain('var(--oas-color-bg-hover)')
    expect(css).toContain('.progress-bar')
    expect(css).toContain('var(--oas-color-primary)')
  })

  it('progress-dot / navigation / simple 下 percent 让位', () => {
    const dot = mount({
      'progress-dot': '',
      current: '0',
      steps: JSON.stringify([{ title: 'A', percent: 50 }]),
    })
    expect(items(dot)[0]!.querySelector('.icon .progress-bar')).toBeNull()
    const nav = mount({
      navigation: '',
      current: '0',
      steps: JSON.stringify([{ title: 'A', percent: 50 }]),
    })
    expect(items(nav)[0]!.querySelector('.icon')).toBeNull()
    const simple = mount({
      simple: '',
      current: '0',
      steps: JSON.stringify([{ title: 'A', percent: 50 }]),
    })
    expect(items(simple)[0]!.querySelector('.icon .progress-bar')).toBeNull()
  })
})

describe('StepItem.prefix（自定义编号）', () => {
  it('prefix 在指示器位替代默认序号（wait/process 步）', () => {
    const el = mount({
      steps: JSON.stringify([
        { title: 'A', prefix: '01' },
        { title: 'B', prefix: '02' },
      ]),
    })
    const list = items(el)
    expect(list[0]!.querySelector('.icon')!.textContent).toBe('01')
    expect(list[1]!.querySelector('.icon')!.textContent).toBe('02')
  })

  it('优先级：显式 icon > prefix（icon 匹配时 prefix 不显示）', () => {
    const el = mount({
      steps: JSON.stringify([{ title: 'A', prefix: '01', icon: 'user' }]),
    })
    const icon = items(el)[0]!.querySelector('.icon')!
    expect(icon.querySelector('svg')).not.toBeNull()
    expect(icon.textContent).toBe('')
  })

  it('icon 无匹配回落 prefix（不落回默认序号）', () => {
    const el = mount({
      steps: JSON.stringify([{ title: 'A', prefix: '01', icon: 'no-such-icon' }]),
    })
    expect(items(el)[0]!.querySelector('.icon')!.textContent).toBe('01')
  })

  it('finish / error 的 ✓/✕ 不受 prefix 影响', () => {
    const el = mount({
      steps: JSON.stringify([
        { title: 'A', status: 'finish', prefix: '01' },
        { title: 'B', status: 'error', prefix: '02' },
      ]),
    })
    const list = items(el)
    expect(list[0]!.querySelector('.icon')!.textContent).toBe('✓')
    expect(list[1]!.querySelector('.icon')!.textContent).toBe('✕')
  })

  it('prefix 走 textContent：HTML 字符串不生成元素（防注入）', () => {
    const el = mount({
      steps: JSON.stringify([{ title: 'A', prefix: '<img src=x onerror=alert(1)>' }]),
    })
    const icon = items(el)[0]!.querySelector('.icon')!
    expect(icon.querySelector('img')).toBeNull()
    expect(icon.textContent).toBe('<img src=x onerror=alert(1)>')
  })

  it('loading / percent 优先于 prefix（让位与序号一致）', () => {
    const loading = mount({ steps: JSON.stringify([{ title: 'A', prefix: '01', loading: true }]) })
    expect(items(loading)[0]!.querySelector('.icon .spinner')).not.toBeNull()
    expect(items(loading)[0]!.querySelector('.icon')!.textContent).toBe('')
    const pct = mount({ current: '0', steps: JSON.stringify([{ title: 'A', prefix: '01', percent: 40 }]) })
    expect(items(pct)[0]!.querySelector('.icon .progress-bar')).not.toBeNull()
  })

  it('空字符串 prefix 回落默认序号', () => {
    const el = mount({ steps: JSON.stringify([{ title: 'A', prefix: '' }]) })
    expect(items(el)[0]!.querySelector('.icon')!.textContent).toBe('1')
  })

  it('progress-dot / navigation 下 prefix 不渲染（跟随指示器让位规则）', () => {
    const dot = mount({ 'progress-dot': '', steps: JSON.stringify([{ title: 'A', prefix: '01' }]) })
    expect(items(dot)[0]!.querySelector('.icon')!.textContent).toBe('')
    const nav = mount({ navigation: '', steps: JSON.stringify([{ title: 'A', prefix: '01' }]) })
    expect(items(nav)[0]!.querySelector('.icon')).toBeNull()
  })
})

describe('max-count（中段折叠省略）', () => {
  const TEN = JSON.stringify(
    Array.from({ length: 10 }, (_, i) => ({ title: `S${i + 1}` })),
  )

  it('步骤数 <= max-count：全部显示，无省略步', () => {
    const el = mount({ 'max-count': '5', steps: STEPS })
    expect(items(el).length).toBe(3)
    expect(el.shadowRoot!.querySelector('.item-ellipsis')).toBeNull()
  })

  it('超出折叠：保留首步与末步，中段渲染省略步（current 在头部 → 首段窗口 + 尾部省略）', () => {
    const el = mount({ 'max-count': '5', current: '0', steps: TEN })
    const list = items(el)
    // 槽位 = [S1,S2,S3] ⋯ [S10]
    expect(list.length).toBe(5)
    expect((list[0]!.querySelector('.text') as HTMLElement).textContent).toBe('S1')
    expect((list[3]!.querySelector('.text') as HTMLElement)?.textContent ?? null).toBeNull()
    expect(list[3]!.classList.contains('item-ellipsis')).toBe(true)
    expect((list[4]!.querySelector('.text') as HTMLElement).textContent).toBe('S10')
  })

  it('current 永远可见：current 在中段 → 双省略 + 中间窗口含 current', () => {
    const el = mount({ 'max-count': '5', current: '5', steps: TEN })
    const list = items(el)
    // 槽位 = [S1] ⋯ [S6] ⋯ [S10]（窗口以 current 为中心）
    expect(list.length).toBe(5)
    expect(list[0]!.querySelector('.text')!.textContent).toBe('S1')
    expect(list[1]!.classList.contains('item-ellipsis')).toBe(true)
    expect(list[2]!.getAttribute('aria-current')).toBe('step')
    expect(list[2]!.querySelector('.text')!.textContent).toBe('S6')
    expect(list[3]!.classList.contains('item-ellipsis')).toBe(true)
    expect(list[4]!.querySelector('.text')!.textContent).toBe('S10')
  })

  it('窗口随 current 平移：current 靠尾 → 首部省略 + 尾段窗口', () => {
    const el = mount({ 'max-count': '5', current: '8', steps: TEN })
    const list = items(el)
    // 槽位 = [S1] ⋯ [S8,S9,S10]（current=8 即 S9 带 aria-current）
    expect(list.length).toBe(5)
    expect(list[0]!.querySelector('.text')!.textContent).toBe('S1')
    expect(list[1]!.classList.contains('item-ellipsis')).toBe(true)
    expect(list[3]!.querySelector('.text')!.textContent).toBe('S9')
    expect(list[3]!.getAttribute('aria-current')).toBe('step')
    expect(list[4]!.querySelector('.text')!.textContent).toBe('S10')
  })

  it('省略步不可点：clickable 下无按钮语义、点击静默不派发事件', () => {
    const el = mount({ clickable: '', 'max-count': '5', current: '0', steps: TEN })
    const ell = items(el)[3]!
    expect(ell.classList.contains('item-ellipsis')).toBe(true)
    expect(ell.getAttribute('role')).toBeNull()
    expect(ell.getAttribute('tabindex')).toBeNull()
    expect(ell.getAttribute('aria-hidden')).toBe('true')
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    ;(ell as HTMLElement).click()
    expect(fired).toBe(0)
  })

  it('省略步复用 .item 连接线类（连接线连续）且有独立几何规则（dots 无边框圆心 sm/2）', () => {
    const el = mount({ 'max-count': '5', current: '0', steps: TEN })
    const ell = items(el)[3]!
    expect(ell.classList.contains('item')).toBe(true)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('.item-ellipsis:not(:last-child)::after')
    expect(css).toContain('.dots')
  })

  it('navigation / arrow 形态下省略步禁 hover 反馈与 pointer 光标（不可点语义一致）', () => {
    const el = mount({ 'max-count': '5', current: '0', steps: TEN })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-navigation='true'] .item-ellipsis")
    expect(css).toContain(".steps[data-arrow='true'] .item-ellipsis")
    expect(css).toContain('cursor: default')
  })

  it('非法值（NaN / < 2）忽略：全部显示', () => {
    const nan = mount({ 'max-count': 'abc', steps: TEN })
    expect(items(nan).length).toBe(10)
    const one = mount({ 'max-count': '1', steps: TEN })
    expect(items(one).length).toBe(10)
  })

  it('max-count 属性变化响应：从全显改折叠后省略步出现', () => {
    const el = mount({ steps: TEN })
    expect(el.shadowRoot!.querySelector('.item-ellipsis')).toBeNull()
    el.setAttribute('max-count', '4')
    expect(el.shadowRoot!.querySelector('.item-ellipsis')).not.toBeNull()
  })

  it('current 移动窗口平移：current 0→8 省略位置从头侧换到尾侧', () => {
    const el = mount({ 'max-count': '5', current: '0', steps: TEN })
    const head = items(el)
    expect(head[3]!.classList.contains('item-ellipsis')).toBe(true)
    el.setAttribute('current', '8')
    const tail = items(el)
    expect(tail[1]!.classList.contains('item-ellipsis')).toBe(true)
    expect(tail[0]!.querySelector('.text')!.textContent).toBe('S1')
  })
})

describe('reverse（视觉倒序）', () => {
  it('reverse 属性：容器标记 data-reverse，CSS row-reverse / column-reverse 规则存在', () => {
    const el = mount({ reverse: '' })
    const stepsEl = el.shadowRoot!.querySelector('[part="steps"]')!
    expect(stepsEl.getAttribute('data-reverse')).toBe('true')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('flex-direction: row-reverse')
    expect(css).toContain('flex-direction: column-reverse')
  })

  it('编号显示 = 总数 - index（DOM 序不变，视觉流向递增）', () => {
    const el = mount({ reverse: '', current: '0' })
    const list = items(el)
    expect(list[0]!.querySelector('.icon')!.textContent).toBe('3')
    expect(list[1]!.querySelector('.icon')!.textContent).toBe('2')
    expect(list[2]!.querySelector('.icon')!.textContent).toBe('1')
  })

  it('状态推导不变：仍按 steps 数组序（前序 finish / 当前 process / 后续 wait）', () => {
    const el = mount({ reverse: '', current: '1' })
    expect(items(el).map((i) => i.getAttribute('data-status'))).toEqual([
      'finish',
      'process',
      'wait',
    ])
  })

  it('aria-current 仍在数组 current 步（DOM 位置不变）', () => {
    const el = mount({ reverse: '', current: '1' })
    const list = items(el)
    expect(list[0]!.getAttribute('aria-current')).toBeNull()
    expect(list[1]!.getAttribute('aria-current')).toBe('step')
  })

  it('vertical 下 column-reverse 标记规则存在（纵向倒序）', () => {
    const el = mount({ reverse: '', direction: 'vertical' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-direction='vertical'][data-reverse='true']")
    expect(css).toContain('flex-direction: column-reverse')
  })

  it('reverse 下点击仍派发数组 index（oas-change detail 不变）', () => {
    const el = mount({ reverse: '', clickable: '' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(items(el)[2] as HTMLElement).click()
    expect(detail).toEqual({ index: 2 })
    expect(el.getAttribute('current')).toBe('2')
  })

  it('prefix 显式文本不参与 reverse 换算（原样显示）', () => {
    const el = mount({ reverse: '', steps: JSON.stringify([{ title: 'A', prefix: '01' }]) })
    expect(items(el)[0]!.querySelector('.icon')!.textContent).toBe('01')
  })

  it('finish / error 的 ✓/✕ 不参与换算；percent 回落序号走换算', () => {
    const el = mount({
      reverse: '',
      current: '0',
      steps: JSON.stringify([
        { title: 'A', percent: -5 },
        { title: 'B', status: 'finish' },
        { title: 'C', status: 'error' },
      ]),
    })
    const list = items(el)
    expect(list[0]!.querySelector('.icon')!.textContent).toBe('3')
    expect(list[1]!.querySelector('.icon')!.textContent).toBe('✓')
    expect(list[2]!.querySelector('.icon')!.textContent).toBe('✕')
  })
})

describe('content-placement（内容块位置）', () => {
  it('缺省 bottom：不设 data-content-placement（内容在指示器下方）', () => {
    const el = mount({})
    expect(
      el.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-content-placement'),
    ).toBe(false)
  })

  it('right + 横向：容器标记 data-content-placement=right，item flex 行布局（icon 左、内容块右）', () => {
    const el = mount({ 'content-placement': 'right', current: '1' })
    const stepsEl = el.shadowRoot!.querySelector('[part="steps"]')!
    expect(stepsEl.getAttribute('data-content-placement')).toBe('right')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-content-placement='right'] .item")
    expect(css).toContain('display: flex')
    expect(css).toContain(".steps[data-content-placement='right'] .text")
  })

  it('纵向忽略：direction=vertical 时不设标记（纵向本身即图标左/内容右）', () => {
    const el = mount({ direction: 'vertical', 'content-placement': 'right' })
    expect(
      el.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-content-placement'),
    ).toBe(false)
  })

  it('与 label-placement 正交：同设时两个标记并存（各自独立语义）', () => {
    const el = mount({ 'content-placement': 'right', 'label-placement': 'horizontal' })
    const stepsEl = el.shadowRoot!.querySelector('[part="steps"]')!
    expect(stepsEl.getAttribute('data-content-placement')).toBe('right')
    expect(stepsEl.getAttribute('data-label-placement')).toBe('horizontal')
  })

  it('非法值忽略（不设标记）', () => {
    const el = mount({ 'content-placement': 'top' })
    expect(
      el.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-content-placement'),
    ).toBe(false)
  })

  it('progress-dot / navigation / simple 下让位（与 label-placement 同规则）', () => {
    const dot = mount({ 'progress-dot': '', 'content-placement': 'right' })
    expect(
      dot.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-content-placement'),
    ).toBe(false)
    const nav = mount({ navigation: '', 'content-placement': 'right' })
    expect(
      nav.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-content-placement'),
    ).toBe(false)
    const simple = mount({ simple: '', 'content-placement': 'right' })
    expect(
      simple.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-content-placement'),
    ).toBe(false)
  })

  it('right 模式描述/extra 保留在右侧内容块（不隐藏）', () => {
    const el = mount({
      'content-placement': 'right',
      steps: JSON.stringify([{ title: 'A', description: 'd', extra: 'e' }]),
    })
    const item = items(el)[0]!
    expect(item.querySelector('.desc')).not.toBeNull()
    expect(item.querySelector('.extra')).not.toBeNull()
  })

  it('right 模式连线对准指示器中心（与 label-placement=horizontal 同几何）', () => {
    const el = mount({ 'content-placement': 'right' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(
      ".steps[data-content-placement='right'] .item:not(:last-child)::after",
    )
  })
})

describe('arrow（箭头分格形态）', () => {
  it('arrow 属性：容器标记 data-arrow，clip-path polygon 分格 CSS 存在', () => {
    const el = mount({ arrow: '' })
    const stepsEl = el.shadowRoot!.querySelector('[part="steps"]')!
    expect(stepsEl.getAttribute('data-arrow')).toBe('true')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-arrow='true'] .item")
    expect(css).toContain('clip-path: polygon(')
  })

  it('状态填充走 token：process 主色 / finish 浅主色 color-mix / wait 灰 bg-hover', () => {
    const el = mount({ arrow: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-arrow='true'] .item[data-status='process']")
    expect(css).toContain('var(--oas-color-primary)')
    expect(css).toContain(".steps[data-arrow='true'] .item[data-status='finish']")
    expect(css).toContain('color-mix(in srgb, var(--oas-color-primary) 15%, transparent)')
    expect(css).toContain(".steps[data-arrow='true'] .item[data-status='wait']")
    expect(css).toContain('var(--oas-color-bg-hover)')
  })

  it('首项平头 / 末项无右凸 / 中间凹凸衔接（:first-child 与 :last-child 专属 polygon）', () => {
    const el = mount({ arrow: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-arrow='true'] .item:first-child")
    expect(css).toContain(".steps[data-arrow='true'] .item:last-child")
  })

  it('与 simple 互斥（simple 优先）：不设 data-arrow 标记', () => {
    const el = mount({ arrow: '', simple: '' })
    expect(el.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-arrow')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="steps"]')!.getAttribute('data-simple')).toBe('true')
  })

  it('navigation 下忽略：不设 data-arrow 标记（导航自身箭头形态）', () => {
    const el = mount({ arrow: '', navigation: '' })
    expect(el.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-arrow')).toBe(false)
  })

  it('纵向忽略：direction=vertical 不设标记（横向专用）', () => {
    const el = mount({ arrow: '', direction: 'vertical' })
    expect(el.shadowRoot!.querySelector('[part="steps"]')!.hasAttribute('data-arrow')).toBe(false)
  })

  it('连接线隐藏（分格自衔接）：arrow 下 ::after/::before display none', () => {
    const el = mount({ arrow: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-arrow='true'] .item:not(:last-child)::after")
    expect(css).toContain('display: none')
  })

  it('指示器保留且透明化（无圆形边框，序号直读格子填充色）', () => {
    const el = mount({ arrow: '', current: '0' })
    const icon = items(el)[0]!.querySelector('.icon')!
    expect(icon).not.toBeNull()
    expect(icon.textContent).toBe('1')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-arrow='true'] .icon")
  })

  it('reverse 组合：镜像 polygon 规则存在（凹凸随视觉流向翻转）', () => {
    const el = mount({ arrow: '', reverse: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-arrow='true'][data-reverse='true'] .item")
  })

  it('clickable 组合 hover 反馈规则存在（filter brightness）', () => {
    const el = mount({ arrow: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(".steps[data-arrow='true'] .item:hover")
  })

  it('形态互斥：arrow 下 separator / label-placement / content-placement 让位（arrow 自身即行格形态）', () => {
    const el = mount({
      arrow: '',
      separator: 'dashed',
      'label-placement': 'horizontal',
      'content-placement': 'right',
    })
    const stepsEl = el.shadowRoot!.querySelector('[part="steps"]')!
    expect(stepsEl.getAttribute('data-arrow')).toBe('true')
    expect(stepsEl.hasAttribute('data-separator')).toBe(false)
    expect(stepsEl.hasAttribute('data-label-placement')).toBe(false)
    expect(stepsEl.hasAttribute('data-content-placement')).toBe(false)
  })

  it('间距走 --oas-steps-arrow-gap 变量：缺省 0（凹凸互嵌贴边，靠负 margin 重叠），宿主可设正值留间距', () => {
    const el = mount({ arrow: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('gap: var(--oas-steps-arrow-gap, 0px)')
    expect(css).toContain('margin-inline-start: calc(-1 * var(--oas-steps-arrow))')
  })

  it('状态填充重构为中间变量：data-status 只设 --oas-steps-item-bg，.item 基础 background 走 var 链', () => {
    const el = mount({ arrow: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('background: var(--oas-steps-item-bg, var(--oas-color-bg-hover))')
    expect(css).toContain(".steps[data-arrow='true'] .item[data-status='process']")
    expect(css).toContain('--oas-steps-item-bg: var(--oas-color-primary)')
    expect(css).toContain(".steps[data-arrow='true'] .item[data-status='finish']")
    expect(css).toContain(
      '--oas-steps-item-bg: color-mix(in srgb, var(--oas-color-primary) 15%, transparent)',
    )
    expect(css).toContain(".steps[data-arrow='true'] .item[data-status='error']")
    expect(css).toContain('--oas-steps-item-bg: var(--oas-color-danger)')
    expect(css).toContain(".steps[data-arrow='true'] .item[data-status='wait']")
    expect(css).toContain('--oas-steps-item-bg: var(--oas-color-bg-hover)')
  })

  it('per-index 颜色开口：arrow 下 .item:nth-child(1..8) 各一条 var(--oas-steps-arrow-item-bg-N) 链', () => {
    const el = mount({ arrow: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    for (let i = 1; i <= 8; i++) {
      expect(css).toContain(`.steps[data-arrow='true'] .item:nth-child(${i})`)
      expect(css).toContain(
        `--oas-steps-arrow-item-bg-${i}, var(--oas-steps-item-bg, var(--oas-color-bg-hover))`,
      )
    }
  })

  it('per-index 链优先级形状：宿主变量 > 状态中间变量 > bg-hover（nth-child 规则后置覆盖 .item 基础 background）', () => {
    const el = mount({ arrow: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    // 链整体形状（nth-child 规则的 background 值）——宿主设 --oas-steps-arrow-item-bg-1 即第 1 格变色
    expect(css).toContain(
      'background: var(--oas-steps-arrow-item-bg-1, var(--oas-steps-item-bg, var(--oas-color-bg-hover)))',
    )
    // nth-child 规则必须出现在 .item 基础规则之后（同特异性后写胜出）
    const itemBase = css.indexOf(".steps[data-arrow='true'] .item {")
    const nth1 = css.indexOf(".steps[data-arrow='true'] .item:nth-child(1)")
    expect(itemBase).toBeGreaterThanOrEqual(0)
    expect(nth1).toBeGreaterThan(itemBase)
  })
})

describe('responsive（窄屏自动纵向）', () => {
  let lastRO: { cb: () => void } | null = null
  class FakeRO {
    cb: () => void
    constructor(cb: () => void) {
      this.cb = cb
      lastRO = this
    }
    observe() {}
    disconnect() {}
    unobserve() {}
  }

  function mountResponsive(attrs: Record<string, string> = {}): OASSteps {
    vi.stubGlobal('ResizeObserver', FakeRO as unknown as typeof ResizeObserver)
    return mount({ responsive: '', ...attrs })
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    lastRO = null
  })

  it('宽 >= 640 保持方向；窄于 640 自动转 vertical（RO 回调驱动）', () => {
    const el = mountResponsive()
    const stepsEl = el.shadowRoot!.querySelector('[part="steps"]')!
    // clientWidth=0（未布局/SSR）不误判为窄
    expect(stepsEl.getAttribute('data-direction')).toBe('horizontal')
    Object.defineProperty(el, 'clientWidth', { value: 500, configurable: true })
    lastRO!.cb()
    expect(stepsEl.getAttribute('data-direction')).toBe('vertical')
    Object.defineProperty(el, 'clientWidth', { value: 900, configurable: true })
    lastRO!.cb()
    expect(stepsEl.getAttribute('data-direction')).toBe('horizontal')
  })

  it('responsive 优先于显式 direction：窄屏即使 direction=horizontal 也转 vertical', () => {
    const el = mountResponsive({ direction: 'horizontal' })
    const stepsEl = el.shadowRoot!.querySelector('[part="steps"]')!
    expect(stepsEl.getAttribute('data-direction')).toBe('horizontal')
    Object.defineProperty(el, 'clientWidth', { value: 400, configurable: true })
    lastRO!.cb()
    expect(stepsEl.getAttribute('data-direction')).toBe('vertical')
  })

  it('navigation 下 responsive 忽略：窄屏仍强制横向', () => {
    const el = mountResponsive({ navigation: '' })
    const stepsEl = el.shadowRoot!.querySelector('[part="steps"]')!
    Object.defineProperty(el, 'clientWidth', { value: 300, configurable: true })
    lastRO!.cb()
    expect(stepsEl.getAttribute('data-direction')).toBe('horizontal')
  })

  it('断开连接清理 ResizeObserver', () => {
    const el = mountResponsive()
    const spy = vi.spyOn(FakeRO.prototype, 'disconnect')
    el.remove()
    expect(spy).toHaveBeenCalled()
  })
})
