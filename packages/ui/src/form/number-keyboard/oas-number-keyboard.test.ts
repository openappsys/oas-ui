import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASNumberKeyboard } from './index.js'

function mount(attrs: Record<string, string> = {}): OASNumberKeyboard {
  const el = new OASNumberKeyboard()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function keys(el: OASNumberKeyboard): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="key"]')]
}

function digitKeys(el: OASNumberKeyboard): HTMLButtonElement[] {
  return keys(el).filter((b) => b.dataset.key !== undefined)
}

function byAction(el: OASNumberKeyboard, action: string): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!
}

function keyOf(el: OASNumberKeyboard, key: string): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>(`[data-key="${key}"]`)!
}

function press(btn: HTMLButtonElement): void {
  btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
}

function physical(el: OASNumberKeyboard, key: string): void {
  el.shadowRoot!.querySelector('.kb')!.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }),
  )
}

describe('OASNumberKeyboard', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('默认渲染 0-9 十个数字键 + 删除 + 完成，容器 role=group 带可读名称', () => {
    const el = mount()
    expect(digitKeys(el).map((b) => b.textContent)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'])
    expect(byAction(el, 'delete').getAttribute('aria-label')).toBe('删除')
    expect(byAction(el, 'done').textContent).toBe('完成')
    const kb = el.shadowRoot!.querySelector('[part="keyboard"]')!
    expect(kb.getAttribute('role')).toBe('group')
    expect(kb.getAttribute('aria-label')).toBe('数字键盘')
  })

  it('点击数字键追加到 value 并派发 oas-input（携带完整值与按键）', () => {
    const el = mount({ value: '1' })
    const events: unknown[] = []
    el.addEventListener('oas-input', (e) => events.push((e as CustomEvent).detail))
    press(keyOf(el, '2'))
    expect(el.getAttribute('value')).toBe('12')
    expect(events).toEqual([{ value: '12', key: '2' }])
  })

  it('maxlength 达到上限后不再追加、不派发事件', () => {
    const el = mount({ maxlength: '2', value: '12' })
    let fired = 0
    el.addEventListener('oas-input', () => fired++)
    press(keyOf(el, '3'))
    expect(el.getAttribute('value')).toBe('12')
    expect(fired).toBe(0)
  })

  it('删除键移除末位并派发 oas-delete', () => {
    const el = mount({ value: '123' })
    const events: unknown[] = []
    el.addEventListener('oas-delete', (e) => events.push((e as CustomEvent).detail))
    press(byAction(el, 'delete'))
    expect(el.getAttribute('value')).toBe('12')
    expect(events).toEqual([{ value: '12' }])
  })

  it('空值时删除不派发事件', () => {
    const el = mount()
    let fired = 0
    el.addEventListener('oas-delete', () => fired++)
    press(byAction(el, 'delete'))
    expect(fired).toBe(0)
  })

  it('完成键派发 oas-done（携带当前值）', () => {
    const el = mount({ value: '42' })
    let detail: unknown
    el.addEventListener('oas-done', (e) => (detail = (e as CustomEvent).detail))
    press(byAction(el, 'done'))
    expect(detail).toEqual({ value: '42' })
  })

  it('random 打乱数字键顺序：仍是 0-9 全排列', () => {
    // 固定随机源，结果确定（Fisher-Yates 反序时得到确定排列）
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const el = mount({ random: '' })
    const order = digitKeys(el).map((b) => b.dataset.key)
    expect([...order].sort()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
    expect(order).not.toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'])
  })

  it('randomize() 重新排序（可程序化刷新键盘）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const el = mount({ random: '' })
    const first = digitKeys(el).map((b) => b.dataset.key)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    el.randomize()
    const second = digitKeys(el).map((b) => b.dataset.key)
    expect([...second].sort()).toEqual([...first].sort())
    expect(second).not.toEqual(first)
  })

  it('layout=plate 渲染字母键（排除 I/O）与省份键', () => {
    const el = mount({ layout: 'plate' })
    const letters = keys(el)
      .filter((b) => b.dataset.key && /^[A-Z]$/.test(b.dataset.key))
      .map((b) => b.dataset.key)
    expect(letters.length).toBe(24)
    expect(letters).not.toContain('I')
    expect(letters).not.toContain('O')
    expect(byAction(el, 'province').textContent).toBe('省份')
  })

  it('plate 布局点击字母追加并转为大写', () => {
    const el = mount({ layout: 'plate' })
    press(keyOf(el, 'A'))
    expect(el.getAttribute('value')).toBe('A')
  })

  it('省份面板可展开，选中省份后追加并收起面板', () => {
    const el = mount({ layout: 'plate' })
    const panel = el.shadowRoot!.querySelector<HTMLElement>('[part="provinces"]')!
    expect(panel.hidden).toBe(true)
    press(byAction(el, 'province'))
    expect(panel.hidden).toBe(false)
    const jing = [...panel.querySelectorAll<HTMLButtonElement>('[part="key"]')].find((b) => b.textContent === '京')!
    press(jing)
    expect(el.getAttribute('value')).toBe('京')
    expect(panel.hidden).toBe(true)
  })

  it('省份键显示当前已选省份简称', () => {
    const el = mount({ layout: 'plate', value: '京A' })
    expect(byAction(el, 'province').textContent).toBe('京')
  })

  it('disabled 锁定全部按键：按钮禁用且不派发事件', () => {
    const el = mount({ disabled: '', value: '1' })
    let fired = 0
    el.addEventListener('oas-input', () => fired++)
    el.addEventListener('oas-done', () => fired++)
    expect(keyOf(el, '2').disabled).toBe(true)
    press(keyOf(el, '2'))
    press(byAction(el, 'done'))
    expect(fired).toBe(0)
    expect(el.getAttribute('value')).toBe('1')
  })

  it('readonly 保持可聚焦但拦截输入（aria-readonly 同步）', () => {
    const el = mount({ readonly: '', value: '1' })
    let detail: unknown
    el.addEventListener('oas-input', (e) => (detail = (e as CustomEvent).detail))
    expect(keyOf(el, '2').disabled).toBe(false)
    press(keyOf(el, '2'))
    expect(el.getAttribute('value')).toBe('1')
    expect(detail).toBeUndefined()
    expect(el.shadowRoot!.querySelector('[part="keyboard"]')!.getAttribute('aria-readonly')).toBe('true')
  })

  it('物理键盘：数字/字母输入追加，Backspace 删除', () => {
    const el = mount({ layout: 'plate' })
    physical(el, 'a')
    expect(el.getAttribute('value')).toBe('A')
    physical(el, '1')
    expect(el.getAttribute('value')).toBe('A1')
    physical(el, 'Backspace')
    expect(el.getAttribute('value')).toBe('A')
  })

  it('数字布局下字母键被忽略', () => {
    const el = mount()
    physical(el, 'a')
    expect(el.getAttribute('value') ?? '').toBe('')
  })

  it('宿主外部改写 value 即时同步（无内部副本漂移）', () => {
    const el = mount({ value: '1' })
    el.setAttribute('value', '7')
    press(keyOf(el, '8'))
    expect(el.getAttribute('value')).toBe('78')
  })

  it('非法 layout 回落 number 并单次告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ layout: 'nope' })
    expect(el.shadowRoot!.querySelector('[part="keyboard"]')!.getAttribute('data-layout')).toBe('number')
    expect(warn).toHaveBeenCalled()
  })
})
