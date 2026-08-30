import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASStepper, type StepperStep } from './index.js'

const STEPS = JSON.stringify([
  { title: '创建订单', description: '填写订单信息' },
  { title: '确认支付', description: '选择支付方式' },
  { title: '完成发货', description: '等待收货' },
])

function mount(
  attrs: Record<string, string> = {},
  steps = STEPS,
  panelCount = 3,
): OASStepper {
  const el = new OASStepper()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.steps) el.setAttribute('steps', steps)
  el.innerHTML = Array.from(
    { length: panelCount },
    (_, i) => `<oas-stepper-panel value="${i}"><p>面板${i}</p></oas-stepper-panel>`,
  ).join('')
  document.body.appendChild(el)
  return el
}

function tabs(el: OASStepper): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]'))
}

function panels(el: OASStepper): Element[] {
  return Array.from(el.querySelectorAll('oas-stepper-panel'))
}

function pressKey(el: OASStepper, key: string): void {
  el.shadowRoot!.querySelector('.tablist')!.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true }),
  )
}

describe('OASStepper 渲染与状态', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染步骤头：每步一个 role=tab，标题/描述正确', () => {
    const el = mount()
    const list = tabs(el)
    expect(list.length).toBe(3)
    expect(list[0]!.querySelector('.title')!.textContent).toBe('创建订单')
    expect(list[0]!.querySelector('.desc')!.textContent).toBe('填写订单信息')
    expect(list[0]!.getAttribute('role')).toBe('tab')
  })

  it('tablist 容器 role=tablist，方向默认 horizontal（aria-orientation）', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('.tablist')!.getAttribute('role')).toBe('tablist')
    expect(el.shadowRoot!.querySelector('.tablist')!.getAttribute('aria-orientation')).toBe(
      'horizontal',
    )
  })

  it('current 同步 aria-selected（默认 0 第一项选中）', () => {
    const el = mount()
    const list = tabs(el)
    expect(list.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false'])
  })

  it('current 属性变化 → aria-selected 增量同步', () => {
    const el = mount({ current: '1' })
    let list = tabs(el)
    expect(list.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false'])
    el.setAttribute('current', '2')
    list = tabs(el)
    expect(list.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true'])
  })

  it('状态推导按 current：前序 finish（✓）/ 当前 process（序号）/ 后续 wait（序号）', () => {
    const el = mount({ current: '1' })
    const list = tabs(el)
    expect(list[0]!.getAttribute('data-status')).toBe('finish')
    expect(list[0]!.querySelector('.indicator')!.textContent).toBe('✓')
    expect(list[1]!.getAttribute('data-status')).toBe('process')
    expect(list[2]!.getAttribute('data-status')).toBe('wait')
    expect(list[2]!.querySelector('.indicator')!.textContent).toBe('3')
  })

  it('显式 status 覆盖推导：error 步即使已过仍为 error（✕）', () => {
    const el = mount({
      current: '1',
      steps: JSON.stringify([
        { title: 'A', status: 'error' },
        { title: 'B', status: 'process' },
        { title: 'C', status: 'wait' },
      ]),
    })
    const list = tabs(el)
    expect(list[0]!.getAttribute('data-status')).toBe('error')
    expect(list[0]!.querySelector('.indicator')!.textContent).toBe('✕')
  })

  it('icon 字段：显式 icon（iconRegistry 键）优先于状态默认图标渲染内联 SVG', () => {
    const el = mount({
      steps: JSON.stringify([
        { title: 'A', icon: 'check-circle' },
        { title: 'B' },
        { title: 'C' },
      ]),
    })
    const list = tabs(el)
    expect(list[0]!.querySelector('.indicator svg')).not.toBeNull()
    expect(list[1]!.querySelector('.indicator svg')).toBeNull()
  })

  it('空 steps（非法 JSON / 非数组 / 空数组）回退空渲染，不报错', () => {
    const el1 = mount({ steps: 'not-json' }, 'not-json')
    expect(tabs(el1).length).toBe(0)
    const el2 = mount({ steps: '{}' }, '{}')
    expect(tabs(el2).length).toBe(0)
    const el3 = mount({ steps: '[]' }, '[]')
    expect(tabs(el3).length).toBe(0)
  })

  it('非法 current 回落：NaN → 0；负数 → 0；越界 → 夹取到末位', () => {
    const el1 = mount({ current: 'abc' })
    expect(tabs(el1)[0]!.getAttribute('aria-selected')).toBe('true')
    const el2 = mount({ current: '-3' })
    expect(tabs(el2)[0]!.getAttribute('aria-selected')).toBe('true')
    const el3 = mount({ current: '99' })
    expect(tabs(el3)[2]!.getAttribute('aria-selected')).toBe('true')
  })

  it('非法 size 回落 medium + dev 告警（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ size: 'huge' })
    expect(el.classList.contains('oas-stepper--medium')).toBe(true)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('oas-stepper')
    warn.mockRestore()
  })

  it('合法 size 档位映射 host class', () => {
    const el = mount({ size: 'large' })
    expect(el.classList.contains('oas-stepper--large')).toBe(true)
    expect(el.classList.contains('oas-stepper--medium')).toBe(false)
  })

  it('steps property 赋值（Vue/React property 通道）反射到 attribute 走统一解析链路', () => {
    const el = mount()
    el.steps = [{ title: 'X' }, { title: 'Y' }] as StepperStep[]
    expect(el.getAttribute('steps')).toContain('"title":"X"')
    expect(tabs(el).length).toBe(2)
  })
})

describe('OASStepper 点击跳步（oas-change）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('点击可点步骤：派发 oas-change{index}（bubbles + composed）+ 写回 current', () => {
    const el = mount({ current: '1' })
    let fired = 0
    let detail: unknown
    let bubbles = false
    let composed = false
    el.addEventListener('oas-change', (e: Event) => {
      fired++
      detail = (e as CustomEvent).detail
      bubbles = (e as CustomEvent).bubbles
      composed = (e as CustomEvent).composed
    })
    tabs(el)[2]!.click()
    expect(fired).toBe(1)
    expect(detail).toEqual({ index: 2 })
    expect(bubbles).toBe(true)
    expect(composed).toBe(true)
    expect(el.getAttribute('current')).toBe('2')
    expect(tabs(el)[2]!.getAttribute('aria-selected')).toBe('true')
  })

  it('clickable 默认 true：未设 clickable 属性也可点击跳步', () => {
    const el = mount()
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    tabs(el)[1]!.click()
    expect(fired).toBe(1)
  })

  it('clickable="false"：点击静默（不派发、不写 current、不切 aria-selected）', () => {
    const el = mount({ current: '0', clickable: 'false' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    tabs(el)[1]!.click()
    expect(fired).toBe(0)
    expect(el.getAttribute('current')).toBe('0')
  })

  it('linear：未来步（index > current）aria-disabled + 点击静默；当前/前序步仍可点', () => {
    const el = mount({ current: '1', linear: '' })
    const list = tabs(el)
    expect(list[2]!.getAttribute('aria-disabled')).toBe('true')
    expect(list[1]!.getAttribute('aria-disabled')).toBeNull()
    expect(list[0]!.getAttribute('aria-disabled')).toBeNull()
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    list[2]!.click() // 禁跳
    expect(fired).toBe(0)
    expect(el.getAttribute('current')).toBe('1')
    list[0]!.click() // 回跳
    expect(fired).toBe(1)
    expect(el.getAttribute('current')).toBe('0')
  })

  it('disabled 步骤：aria-disabled + 点击静默', () => {
    const el = mount({
      steps: JSON.stringify([
        { title: 'A' },
        { title: 'B', disabled: true },
        { title: 'C' },
      ]),
    })
    const list = tabs(el)
    expect(list[1]!.getAttribute('aria-disabled')).toBe('true')
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    list[1]!.click()
    expect(fired).toBe(0)
  })
})

describe('OASStepper 键盘（roving tabindex）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function focusTab(el: OASStepper, idx: number): void {
    tabs(el)[idx]!.focus()
  }

  it('roving tabindex：仅选中 tab 为 0，其余 -1；方向键移动焦点并同步 tabindex', () => {
    const el = mount({ current: '1' })
    expect(tabs(el).map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '0', '-1'])
    focusTab(el, 1)
    pressKey(el, 'ArrowRight')
    expect(el.shadowRoot!.activeElement).toBe(tabs(el)[2])
    expect(tabs(el).map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '-1', '0'])
    pressKey(el, 'ArrowLeft')
    expect(el.shadowRoot!.activeElement).toBe(tabs(el)[1])
    expect(tabs(el).map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '0', '-1'])
  })

  it('方向键循环回绕：末位 ArrowRight → 首位；首位 ArrowLeft → 末位', () => {
    const el = mount({ current: '2' })
    focusTab(el, 2)
    pressKey(el, 'ArrowRight')
    expect(el.shadowRoot!.activeElement).toBe(tabs(el)[0])
    focusTab(el, 0)
    pressKey(el, 'ArrowLeft')
    expect(el.shadowRoot!.activeElement).toBe(tabs(el)[2])
  })

  it('方向键跳过 disabled 步骤', () => {
    const el = mount({
      steps: JSON.stringify([
        { title: 'A' },
        { title: 'B' },
        { title: 'C', disabled: true },
        { title: 'D' },
      ]),
    })
    // B（index 1）→ ArrowRight 跳过 C（disabled）到 D（index 3）
    focusTab(el, 1)
    pressKey(el, 'ArrowRight')
    expect(el.shadowRoot!.activeElement).toBe(tabs(el)[3])
  })

  it('Home 跳首位、End 跳末位（跳过 disabled）', () => {
    const el = mount({
      steps: JSON.stringify([
        { title: 'A' },
        { title: 'B', disabled: true },
        { title: 'C' },
        { title: 'D' },
      ]),
    })
    focusTab(el, 2)
    pressKey(el, 'End')
    expect(el.shadowRoot!.activeElement).toBe(tabs(el)[3])
    pressKey(el, 'Home')
    expect(el.shadowRoot!.activeElement).toBe(tabs(el)[0])
  })

  it('Enter 激活跳步：写 current + 派发 oas-change；焦点落回目标 tab（roving 同步）', () => {
    const el = mount({ current: '0' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    focusTab(el, 2)
    pressKey(el, 'Enter')
    expect(fired).toBe(1)
    expect(el.getAttribute('current')).toBe('2')
    expect(tabs(el)[2]!.getAttribute('aria-selected')).toBe('true')
    expect(tabs(el)[2]!.getAttribute('tabindex')).toBe('0')
    expect(el.shadowRoot!.activeElement).toBe(tabs(el)[2])
  })

  it('Space 激活跳步（与 Enter 同语义）', () => {
    const el = mount({ current: '0' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    focusTab(el, 1)
    pressKey(el, ' ')
    expect(fired).toBe(1)
    expect(el.getAttribute('current')).toBe('1')
  })

  it('Enter 在 linear 未来步静默（不派发、不跳）', () => {
    const el = mount({ current: '1', linear: '' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    focusTab(el, 2)
    pressKey(el, 'Enter')
    expect(fired).toBe(0)
    expect(el.getAttribute('current')).toBe('1')
  })

  it('clickable="false" 时 Enter 静默', () => {
    const el = mount({ current: '0', clickable: 'false' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    focusTab(el, 1)
    pressKey(el, 'Enter')
    expect(fired).toBe(0)
  })

  it('direction=vertical：ArrowUp/ArrowDown 移动焦点', () => {
    const el = mount({ current: '0', direction: 'vertical' })
    expect(el.shadowRoot!.querySelector('.tablist')!.getAttribute('aria-orientation')).toBe(
      'vertical',
    )
    focusTab(el, 0)
    pressKey(el, 'ArrowDown')
    expect(el.shadowRoot!.activeElement).toBe(tabs(el)[1])
    pressKey(el, 'ArrowUp')
    expect(el.shadowRoot!.activeElement).toBe(tabs(el)[0])
  })

  it('方向键 roving 不切换 current（仅移动焦点，Enter/Space 才激活）', () => {
    const el = mount({ current: '0' })
    focusTab(el, 0)
    pressKey(el, 'ArrowRight')
    pressKey(el, 'ArrowRight')
    expect(el.getAttribute('current')).toBe('0')
    expect(tabs(el)[2]!.getAttribute('aria-selected')).toBe('false')
  })
})

describe('OASStepper 面板联动（oas-stepper-panel value 关联）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('仅 current 匹配 value 的面板可见，其余 hidden', () => {
    const el = mount({ current: '1' })
    const list = panels(el)
    expect(list[0]!.hasAttribute('hidden')).toBe(true)
    expect(list[1]!.hasAttribute('hidden')).toBe(false)
    expect(list[2]!.hasAttribute('hidden')).toBe(true)
    el.setAttribute('current', '2')
    expect(panels(el)[1]!.hasAttribute('hidden')).toBe(true)
    expect(panels(el)[2]!.hasAttribute('hidden')).toBe(false)
  })

  it('面板 role=tabpanel + aria-labelledby 关联对应 tab', () => {
    const el = mount({ current: '0' })
    const panel = panels(el)[0]!
    const tab = tabs(el)[0]!
    expect(panel.getAttribute('role')).toBe('tabpanel')
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id)
    expect(tab.getAttribute('aria-controls')).toBe(panel.id)
  })

  it('current 与 steps 数量不一致（面板 value 无匹配）时全部隐藏', () => {
    const el = mount({ current: '0' }, STEPS, 2)
    const list = panels(el)
    expect(list[0]!.hasAttribute('hidden')).toBe(false)
    expect(list[1]!.hasAttribute('hidden')).toBe(true)
  })
})

describe('OASStepper 样式契约', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('横向连接线/指示器/状态色只走 token（primary/success/danger/border）', () => {
    const el = mount({ current: '1' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('var(--oas-color-border)')
    expect(css).toContain('var(--oas-color-primary)')
    expect(css).toMatch(/\.tab\[data-status='process'\]/)
    expect(css).toMatch(/\.tab\[data-status='finish'\]/)
    expect(css).toContain('var(--oas-color-success)')
    expect(css).toMatch(/\.tab\[data-status='error'\]/)
    expect(css).toContain('var(--oas-color-danger)')
  })

  it('vertical：tablist flex-direction column（CSS 变量开口、逻辑属性）', () => {
    const el = mount({ direction: 'vertical' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(
      /:host\(\.oas-stepper--vertical\)\s*\.tablist\s*\{\s*flex-direction:\s*column/,
    )
    expect(el.classList.contains('oas-stepper--vertical')).toBe(true)
  })

  it('面板插槽区：slot part=panels，面板间距走 token', () => {
    const el = mount()
    const slot = el.shadowRoot!.querySelector<HTMLElement>('slot[part="panels"]')
    expect(slot).not.toBeNull()
    expect(el.shadowRoot!.querySelector('style')!.textContent!).toContain(
      'var(--oas-space-4)',
    )
  })

  it('focus-visible 焦点环走 --oas-focus-ring', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/\.tab:focus-visible\s*\{[^}]*var\(--oas-focus-ring\)/)
  })
})

describe('OASStepper DSD 水合双路径', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('快照指纹命中 → hydrate 接管（meta 移除），upgrade 后标签重建 + 交互可用', () => {
    // 参照实例产真实快照（render + update 后含已构建标签栏）
    const ref = mount({ current: '1' })
    const snap = ref.shadowRoot!.innerHTML
    const el = new OASStepper()
    el.setAttribute('steps', STEPS)
    el.setAttribute('current', '1')
    el.innerHTML = `<oas-stepper-panel value="0"><p>0</p></oas-stepper-panel><oas-stepper-panel value="1"><p>1</p></oas-stepper-panel><oas-stepper-panel value="2"><p>2</p></oas-stepper-panel>`
    // 模拟浏览器 upgrade：shadow 里已有 SSR 快照（指纹 + template 结构）
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-stepper" data-oas-ssr-v="1">${snap}`
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    // upgrade 后 update 重建标签栏（与快照一致）
    expect(tabs(el).length).toBe(3)
    // 交互可用：点击跳步
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    tabs(el)[2]!.click()
    expect(fired).toBe(1)
  })

  it('坏快照（无 tablist）→ hydrate 回退 render() 全量重建', () => {
    const el = new OASStepper()
    el.setAttribute('steps', STEPS)
    el.innerHTML = `<oas-stepper-panel value="0"><p>0</p></oas-stepper-panel>`
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-stepper" data-oas-ssr-v="1"><span>broken</span>`
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector('.tablist')).not.toBeNull()
    expect(tabs(el).length).toBe(3)
  })
})
