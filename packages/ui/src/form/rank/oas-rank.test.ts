import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASRank } from './index.js'

const OPTIONS = JSON.stringify([
  { key: 'a', label: '苹果' },
  { key: 'b', label: '香蕉' },
  { key: 'c', label: '橙子' },
])

function mount(attrs: Record<string, string> = {}): OASRank {
  const el = new OASRank()
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  document.body.appendChild(el)
  return el
}

function options(el: OASRank): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.option')]
}

function rankedLabels(el: OASRank): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.ranked-label')]
}

function badges(el: OASRank): string[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.badge')].map((badge) => badge.textContent ?? '')
}

function action(el: OASRank, key: string, actionName: string): HTMLButtonElement | null {
  for (const button of el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.action')) {
    if (button.dataset.key === key && button.dataset.action === actionName) return button
  }
  return null
}

function optionOf(el: OASRank, key: string): HTMLButtonElement {
  return options(el).find((button) => button.dataset.key === key)!
}

function errorText(el: OASRank): string {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!.textContent ?? ''
}

describe('OASRank', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('按 options 渲染可选按钮（JSON 属性）', () => {
    const el = mount({ options: OPTIONS })
    expect(options(el).map((button) => button.textContent)).toEqual(['苹果', '香蕉', '橙子'])
    expect(options(el).map((button) => button.dataset.action)).toEqual(['add', 'add', 'add'])
    expect(rankedLabels(el)).toHaveLength(0)
  })

  it('点击选项加入排名：值、名次徽标、oas-change 同步', () => {
    const el = mount({ options: OPTIONS })
    const events: Array<Record<string, unknown>> = []
    el.addEventListener('oas-change', (event) => events.push((event as CustomEvent).detail))
    optionOf(el, 'b').click()
    expect(el.value).toEqual(['b'])
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['b'])
    expect(rankedLabels(el).map((button) => button.textContent)).toEqual(['香蕉'])
    expect(badges(el)).toEqual(['1'])
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ value: ['b'], key: 'b', rank: 1, action: 'add' })
    expect(options(el).some((button) => button.dataset.key === 'b')).toBe(false)
  })

  it('再点已选项（ranked-label）取消排名，选项回到可选区', () => {
    const el = mount({ options: OPTIONS })
    optionOf(el, 'a').click()
    optionOf(el, 'c').click()
    expect(badges(el)).toEqual(['1', '2'])
    rankedLabels(el)[0]!.click()
    expect(el.value).toEqual(['c'])
    expect(badges(el)).toEqual(['1'])
    expect(optionOf(el, 'a').dataset.action).toBe('add')
  })

  it('移除按钮取消排名', () => {
    const el = mount({ options: OPTIONS })
    optionOf(el, 'b').click()
    action(el, 'b', 'remove')!.click()
    expect(el.value).toEqual([])
    expect(rankedLabels(el)).toHaveLength(0)
    expect(optionOf(el, 'b').disabled).toBe(false)
  })

  it('上移 / 下移调整名次，边界按钮禁用', () => {
    const el = mount({ options: OPTIONS })
    optionOf(el, 'a').click()
    optionOf(el, 'b').click()
    optionOf(el, 'c').click()
    expect(el.value).toEqual(['a', 'b', 'c'])
    expect(action(el, 'a', 'up')!.disabled).toBe(true)
    expect(action(el, 'c', 'down')!.disabled).toBe(true)
    action(el, 'c', 'up')!.click()
    expect(el.value).toEqual(['a', 'c', 'b'])
    expect(badges(el)).toEqual(['1', '2', '3'])
    action(el, 'a', 'down')!.click()
    expect(el.value).toEqual(['c', 'a', 'b'])
  })

  it('options property：数组与 JSON 字符串双通道，均反射 attribute', () => {
    const el = mount()
    el.options = [
      { key: 'x', label: 'X' },
      { key: 'y', label: 'Y' },
    ]
    expect(JSON.parse(el.getAttribute('options') ?? '[]')).toEqual([
      { key: 'x', label: 'X' },
      { key: 'y', label: 'Y' },
    ])
    expect(options(el).map((button) => button.textContent)).toEqual(['X', 'Y'])
    el.options = '[{"key":"z","label":"Probe Z"}]'
    expect(options(el).map((button) => button.textContent)).toEqual(['Probe Z'])
  })

  it('value property：数组 / JSON 字符串 / 裸 key 三形态容错并同步渲染', () => {
    const el = mount({ options: OPTIONS })
    el.value = ['b', 'a']
    expect(badges(el)).toEqual(['1', '2'])
    expect(rankedLabels(el).map((button) => button.textContent)).toEqual(['香蕉', '苹果'])
    el.value = '["c"]'
    expect(el.value).toEqual(['c'])
    expect(rankedLabels(el).map((button) => button.textContent)).toEqual(['橙子'])
    el.value = 'b'
    expect(el.value).toEqual(['b'])
  })

  it('value 属性去重保序，未知 key 首屏保留原值但不渲染，首次交互后丢弃', () => {
    const el = mount({ options: OPTIONS, value: '["b","b","ghost","a"]' })
    expect(el.value).toEqual(['b', 'ghost', 'a'])
    expect(rankedLabels(el).map((button) => button.textContent)).toEqual(['香蕉', '苹果'])
    optionOf(el, 'c').click()
    expect(el.value, '交互回写只保留已知项').toEqual(['b', 'a', 'c'])
  })

  it('min-ranks validate 失败：派发 oas-invalid、可视化错误、data-invalid', () => {
    const el = mount({ options: OPTIONS, 'min-ranks': '2' })
    const details: Array<Record<string, unknown>> = []
    el.addEventListener('oas-invalid', (event) => details.push((event as CustomEvent).detail))
    expect(el.validate()).toBe(false)
    expect(details[0]).toMatchObject({ reason: 'min-ranks', min: 2, count: 0 })
    expect(el.hasAttribute('data-invalid')).toBe(true)
    expect(errorText(el)).not.toBe('')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!.hidden).toBe(false)
    optionOf(el, 'a').click()
    expect(el.hasAttribute('data-invalid')).toBe(true)
    optionOf(el, 'b').click()
    expect(el.hasAttribute('data-invalid')).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!.hidden).toBe(true)
    expect(el.validate()).toBe(true)
  })

  it('无 min-ranks 时 validate 恒通过且不派发 invalid', () => {
    const el = mount({ options: OPTIONS })
    let count = 0
    el.addEventListener('oas-invalid', () => count++)
    expect(el.validate()).toBe(true)
    expect(count).toBe(0)
  })

  it('min-ranks 非法值忽略（不参与校验）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ options: OPTIONS, 'min-ranks': '0' })
    expect(el.validate()).toBe(true)
    expect(warn.mock.calls.filter((call) => String(call[0]).includes('非法 min-ranks'))).toHaveLength(1)
  })

  it('min-ranks 超过可加入总数：告警一次，渲染与交互不受影响', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ options: OPTIONS, 'min-ranks': '5' })
    expect(options(el), '下限不可达不拦截渲染').toHaveLength(3)
    optionOf(el, 'a').click()
    expect(el.value).toEqual(['a'])
    // 后续 update / refresh 不重复告警
    el.setAttribute('label', '排序题')
    expect(warn.mock.calls.filter((call) => String(call[0]).includes('下限不可达'))).toHaveLength(1)

    document.body.innerHTML = ''
    const opts = JSON.stringify([
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B', disabled: true },
    ])
    mount({ options: opts, 'min-ranks': '2' })
    // 禁用项不计入可选总数：2 > 1 仍不可达
    expect(warn.mock.calls.filter((call) => String(call[0]).includes('可加入的选项总数 1'))).toHaveLength(1)
  })

  it('禁用选项不可加入；禁用组全部不可操作', () => {
    const opts = JSON.stringify([
      { key: 'a', label: '苹果' },
      { key: 'b', label: '香蕉', disabled: true },
    ])
    const el = mount({ options: opts })
    expect(optionOf(el, 'b').disabled).toBe(true)
    optionOf(el, 'b').click()
    expect(el.value).toEqual([])
    document.body.innerHTML = ''
    const disabled = mount({ options: OPTIONS, disabled: '' })
    expect(options(disabled).every((button) => button.disabled)).toBe(true)
    options(disabled)[0]!.click()
    expect(disabled.value).toEqual([])
  })

  it('只读：点击与外部 change 都不改变排名', () => {
    const el = mount({ options: OPTIONS, readonly: '', value: '["a"]' })
    expect(el.hasAttribute('data-readonly')).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('.rank')!.getAttribute('aria-disabled')).toBe('false')
    optionOf(el, 'b').click()
    expect(el.value).toEqual(['a'])
    action(el, 'a', 'remove')!.click()
    expect(el.value).toEqual(['a'])
    expect(el.getAttribute('value')).toBe('["a"]')
  })

  it('aria-live 播报名次变化', () => {
    const el = mount({ options: OPTIONS })
    optionOf(el, 'a').click()
    const live = el.shadowRoot!.querySelector<HTMLElement>('[part="live"]')!
    expect(live.getAttribute('aria-live')).toBe('polite')
    expect(live.textContent).toContain('苹果')
    expect(live.textContent).toContain('1')
    optionOf(el, 'b').click()
    expect(live.textContent).toContain('2')
    action(el, 'b', 'remove')!.click()
    expect(live.textContent).toContain('香蕉')
  })

  it('调整 / 移除按钮的可访问名带选项名（同名按钮可区分）', () => {
    const el = mount({ options: OPTIONS, value: '["a","b"]' })
    expect(action(el, 'b', 'up')!.getAttribute('aria-label')).toContain('香蕉')
    expect(action(el, 'b', 'down')!.getAttribute('aria-label')).toContain('香蕉')
    expect(action(el, 'a', 'remove')!.getAttribute('aria-label')).toContain('苹果')
  })

  it('键盘流：焦点在选项上加入排名后交还给新排名项', () => {
    const el = mount({ options: OPTIONS })
    const button = optionOf(el, 'c')
    button.focus()
    button.click()
    const active = el.shadowRoot!.activeElement as HTMLElement | null
    expect(active?.classList.contains('ranked-label')).toBe(true)
    expect(active?.dataset.key).toBe('c')
  })

  it('clear() 清空排名并派发 oas-change（action=clear）', () => {
    const el = mount({ options: OPTIONS, value: '["a","b"]' })
    let detail: Record<string, unknown> | null = null
    el.addEventListener('oas-change', (event) => (detail = (event as CustomEvent).detail))
    el.clear()
    expect(el.value).toEqual([])
    expect(rankedLabels(el)).toHaveLength(0)
    expect(errorText(el)).toBe('')
    expect(detail).toMatchObject({ value: [], action: 'clear' })
  })

  it('空态：无 options 显示占位，非法 JSON 回落空列表', () => {
    const el = mount({ options: '[]' })
    const empty = el.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!
    expect(empty.hidden).toBe(false)
    expect(empty.textContent).not.toBe('')
    document.body.innerHTML = ''
    const bad = mount({ options: '{oops' })
    expect(bad.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!.hidden).toBe(false)
    expect(options(bad)).toHaveLength(0)
  })
})
