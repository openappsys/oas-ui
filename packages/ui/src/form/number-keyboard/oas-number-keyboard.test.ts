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

  it('readonly 保持可聚焦但拦截输入（不暴露非法 aria-readonly）', () => {
    const el = mount({ readonly: '', value: '1' })
    let detail: unknown
    el.addEventListener('oas-input', (e) => (detail = (e as CustomEvent).detail))
    expect(keyOf(el, '2').disabled).toBe(false)
    press(keyOf(el, '2'))
    expect(el.getAttribute('value')).toBe('1')
    expect(detail).toBeUndefined()
    // 容器 role="group" 不允许 aria-readonly（axe aria-allowed-attr 违规）：只读语义靠不写值表达
    expect(el.shadowRoot!.querySelector('[part="keyboard"]')!.hasAttribute('aria-readonly')).toBe(false)
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

  it('车牌布局物理输入按屏上字符集过滤：I / O 与其他字符被忽略', () => {
    const el = mount({ layout: 'plate' })
    physical(el, 'i')
    physical(el, 'O')
    physical(el, '-')
    expect(el.getAttribute('value') ?? '').toBe('')
    physical(el, 'b')
    expect(el.getAttribute('value')).toBe('B')
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

describe('OASNumberKeyboard 长按连删（v2.6.9 批 A）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  function pointer(type: string): Event {
    return new PointerEvent(type, { bubbles: true, composed: true, cancelable: true, pointerId: 1, button: 0 })
  }

  /** 长按删除键一段时间 */
  function hold(del: HTMLButtonElement, ms: number): void {
    del.dispatchEvent(pointer('pointerdown'))
    vi.advanceTimersByTime(ms)
  }

  it('按住 400ms 起连删：间隔 300 起步、每次递减 50、150 触底', () => {
    const el = mount({ value: '123456789' })
    hold(byAction(el, 'delete'), 399)
    expect(el.getAttribute('value'), '未到 400ms 不连删').toBe('123456789')
    vi.advanceTimersByTime(1)
    expect(el.getAttribute('value'), '400ms 触发首次连删').toBe('12345678')
    vi.advanceTimersByTime(300)
    expect(el.getAttribute('value'), '首个连删间隔 300ms').toBe('1234567')
    vi.advanceTimersByTime(250)
    expect(el.getAttribute('value'), '间隔递减 250ms').toBe('123456')
    vi.advanceTimersByTime(200)
    expect(el.getAttribute('value'), '间隔递减 200ms').toBe('12345')
    vi.advanceTimersByTime(150)
    expect(el.getAttribute('value'), '间隔触底 150ms').toBe('1234')
    vi.advanceTimersByTime(150)
    expect(el.getAttribute('value'), '触底后保持 150ms').toBe('123')
  })

  it('pointerup / pointerleave / pointercancel 停止连删', () => {
    for (const stop of ['pointerup', 'pointerleave', 'pointercancel'] as const) {
      const el = mount({ value: '12345' })
      const del = byAction(el, 'delete')
      hold(del, 400)
      expect(el.getAttribute('value')).toBe('1234')
      del.dispatchEvent(pointer(stop))
      vi.advanceTimersByTime(2000)
      expect(el.getAttribute('value'), `${stop} 后停止连删`).toBe('1234')
    }
  })

  it('每次连删派发 oas-delete（与单击删除同事件通道）', () => {
    const el = mount({ value: '12' })
    const values: string[] = []
    el.addEventListener('oas-delete', (e) => values.push((e as CustomEvent<{ value: string }>).detail.value))
    hold(byAction(el, 'delete'), 700)
    expect(values).toEqual(['1', ''])
  })

  it('值删空后连删静默（不再派发 oas-delete）', () => {
    const el = mount({ value: '1' })
    let fired = 0
    el.addEventListener('oas-delete', () => fired++)
    hold(byAction(el, 'delete'), 400)
    expect(el.getAttribute('value')).toBe('')
    vi.advanceTimersByTime(2000)
    expect(fired, '空值继续长按不派发事件').toBe(1)
  })

  it('no-repeat-delete 属性关闭长按连删（按住 2s 不删）', () => {
    const el = mount({ value: '123', 'no-repeat-delete': '' })
    hold(byAction(el, 'delete'), 2000)
    expect(el.getAttribute('value'), '连删关闭：按住不连删').toBe('123')
  })

  it('readonly 下长按无效；disabled 下不启动计时', () => {
    const ro = mount({ value: '123', readonly: '' })
    hold(byAction(ro, 'delete'), 800)
    expect(ro.getAttribute('value')).toBe('123')
    const dis = mount({ value: '123', disabled: '' })
    hold(byAction(dis, 'delete'), 800)
    expect(dis.getAttribute('value')).toBe('123')
  })

  it('键盘 Backspace 行为不变（keydown 单删一次，不进入长按连删）', () => {
    const el = mount({ value: '123' })
    physical(el, 'Backspace')
    vi.advanceTimersByTime(2000)
    expect(el.getAttribute('value')).toBe('12')
  })

  it('长按期间阻止 contextmenu（长按弹菜单会打断连删）', () => {
    const el = mount({ value: '123' })
    const del = byAction(el, 'delete')
    const notPrevented = del.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, composed: true, cancelable: true }),
    )
    expect(notPrevented, '删除键 contextmenu 必须被阻止').toBe(false)
    // 数字键不阻止 contextmenu
    const digit = keyOf(el, '5')
    expect(digit.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))).toBe(true)
  })

  it('collision-guard：原型不得有 noRepeatDelete / repeatDelete 成员（撞属性 camelCase）', () => {
    const proto = OASNumberKeyboard.prototype as unknown as Record<string, unknown>
    expect(proto['noRepeatDelete']).toBeUndefined()
    expect(proto['repeatDelete']).toBeUndefined()
  })

  it('长按后的收尾 click 不多删一次（pointerup 补发 click 被抑制），下次单击恢复正常', () => {
    const el = mount({ value: '1234' })
    const del = byAction(el, 'delete')
    // 长按一轮：400ms 首删 + 300ms 二删，随后 pointerup + 浏览器补发的 click
    hold(del, 700)
    expect(el.getAttribute('value')).toBe('12')
    del.dispatchEvent(pointer('pointerup'))
    press(del)
    expect(el.getAttribute('value'), '收尾 click 被抑制（不重复删除）').toBe('12')
    // 新的按下重置抑制：单击恢复正常删除
    del.dispatchEvent(pointer('pointerdown'))
    press(del)
    expect(el.getAttribute('value')).toBe('1')
    del.dispatchEvent(pointer('pointerup'))
  })

  it('pointerleave 结束长按后（无补发 click），下一次单击仍正常删除', () => {
    const el = mount({ value: '123' })
    const del = byAction(el, 'delete')
    hold(del, 400)
    expect(el.getAttribute('value')).toBe('12')
    del.dispatchEvent(pointer('pointerleave'))
    press(del)
    expect(el.getAttribute('value')).toBe('1')
  })
})
