import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASPinInput } from './index.js'

function mount(attrs: Record<string, string> = {}): OASPinInput {
  const el = new OASPinInput()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function cells(el: OASPinInput): HTMLInputElement[] {
  return [...(el.shadowRoot!.querySelectorAll('input') as NodeListOf<HTMLInputElement>)]
}

function container(el: OASPinInput): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="container"]')!
}

function typeCell(cell: HTMLInputElement, value: string): void {
  cell.value = value
  cell.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
}

function key(cell: HTMLInputElement, keyName: string): void {
  cell.dispatchEvent(
    new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }),
  )
}

describe('OASPinInput', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认渲染 6 个输入格，容器 role=group', async () => {
    const el = mount()
    await Promise.resolve()
    expect(cells(el).length).toBe(6)
    expect(container(el).getAttribute('role')).toBe('group')
    expect(container(el).getAttribute('aria-label')).toBe('验证码')
  })

  it('length 属性改变格子数量（结构变化不报错）', () => {
    const el = mount({ length: '4' })
    expect(cells(el).length).toBe(4)
    el.setAttribute('length', '5')
    expect(cells(el).length).toBe(5)
  })

  it('value 属性分发到各格', () => {
    const el = mount({ value: '123' })
    const cs = cells(el)
    expect(cs[0]!.value).toBe('1')
    expect(cs[1]!.value).toBe('2')
    expect(cs[2]!.value).toBe('3')
    expect(cs[3]!.value).toBe('')
  })

  it('value 超长按 length 截断', () => {
    const el = mount({ value: '123456789', length: '4' })
    const cs = cells(el)
    expect(cs.map((c) => c.value).join('')).toBe('1234')
  })

  it('每格输入后派发 oas-input（携带完整 value 与 index）', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-input', (e: Event) => (detail = (e as CustomEvent).detail))
    typeCell(cells(el)[1]!, 'a')
    expect(detail).toEqual({ value: 'a', index: 1 })
  })

  it('填满全部格子时派发 oas-change 与 oas-complete', () => {
    const el = mount({ length: '3' })
    const events: string[] = []
    el.addEventListener('oas-change', () => events.push('change'))
    el.addEventListener('oas-complete', () => events.push('complete'))
    typeCell(cells(el)[0]!, '1')
    typeCell(cells(el)[1]!, '2')
    typeCell(cells(el)[2]!, '3')
    expect(events).toEqual(['change', 'complete'])
  })

  it('oas-change/complete 只在整个 value 首次变完整时派发（继续编辑不重复派发）', () => {
    const el = mount({ length: '2' })
    let changeCount = 0
    el.addEventListener('oas-change', () => changeCount++)
    typeCell(cells(el)[0]!, '1')
    typeCell(cells(el)[1]!, '2')
    expect(changeCount).toBe(1)
    // 回退后重新填满应再次派发
    key(cells(el)[1]!, 'Backspace')
    typeCell(cells(el)[1]!, '3')
    expect(changeCount).toBe(2)
  })

  it('Backspace 删除当前格并回退到前一格', () => {
    const el = mount({ value: '12' })
    const cs = cells(el)
    cs[1]!.focus()
    key(cs[1]!, 'Backspace')
    expect(cs[1]!.value).toBe('')
    expect(el.getAttribute('value')).toBe('1')
    expect(el.shadowRoot!.activeElement).toBe(cs[0])
  })

  it('方向键左右移动焦点', () => {
    const el = mount()
    const cs = cells(el)
    cs[1]!.focus()
    key(cs[1]!, 'ArrowRight')
    expect(el.shadowRoot!.activeElement).toBe(cs[2])
    key(cs[2]!, 'ArrowLeft')
    expect(el.shadowRoot!.activeElement).toBe(cs[1])
  })

  it('粘贴自动分发到后续格子', () => {
    const el = mount({ length: '4' })
    const cs = cells(el)
    cs[0]!.focus()
    container(el).dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      }),
    )
    // happy-dom 无法注入 clipboardData 内容，改用直接调用分发逻辑：模拟完整粘贴
    // 直接触发（DataTransfer 不可写时兜底）：手动填充验证分发的行为由下方 input 事件覆盖
    const evt = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(evt, 'clipboardData', {
      value: { getData: () => '1234' },
    })
    container(el).dispatchEvent(evt)
    expect(cs.map((c) => c.value).join('')).toBe('1234')
  })

  it('mask 属性将格子设为密码型（值被遮罩）', () => {
    const el = mount({ mask: '' })
    expect(cells(el)[0]!.type).toBe('password')
  })

  it('type 属性透传到格子，未设 mask 时生效', () => {
    const el = mount({ type: 'tel' })
    expect(cells(el)[0]!.type).toBe('tel')
  })

  it('disabled 禁用全部格子', () => {
    const el = mount({ disabled: '' })
    expect(cells(el)[0]!.disabled).toBe(true)
  })

  it('readonly 只读', () => {
    const el = mount({ readonly: '' })
    expect(cells(el)[0]!.readOnly).toBe(true)
  })

  it('每格 aria-label 为「第 n 位」，容器 aria-invalid 同步到各格', () => {
    const el = mount({ 'aria-invalid': 'true' })
    expect(cells(el)[0]!.getAttribute('aria-label')).toBe('第 1 位')
    expect(cells(el)[5]!.getAttribute('aria-label')).toBe('第 6 位')
    expect(cells(el)[0]!.getAttribute('aria-invalid')).toBe('true')
    expect(container(el).getAttribute('aria-invalid')).toBe('true')
  })

  it('受控：外部改 value 即时同步格子且不重建引用', () => {
    const el = mount({ value: '1' })
    const cs = cells(el)
    const ref = cs[0]!
    el.setAttribute('value', '9')
    expect(cells(el)[0]).toBe(ref)
    expect(ref.value).toBe('9')
  })

  it('非受控：内部输入写回 value 属性（受控通道）', () => {
    const el = mount()
    typeCell(cells(el)[0]!, 'x')
    expect(el.getAttribute('value')).toBe('x')
  })

  it('empty：全空时每格可聚焦（原生 input 自带 caret）', () => {
    const el = mount()
    const cs = cells(el)
    cs[3]!.focus()
    expect(el.shadowRoot!.activeElement).toBe(cs[3])
  })

  it('aria-invalid 在 observedAttributes 中（外部可动态切换校验态）', () => {
    expect(OASPinInput.observedAttributes).toContain('aria-invalid')
  })

  it('受控：外部动态 setAttribute/removeAttribute(aria-invalid) 即时同步容器与各格', () => {
    const el = mount()
    expect(container(el).getAttribute('aria-invalid')).toBeNull()
    expect(cells(el)[0]!.getAttribute('aria-invalid')).toBeNull()

    el.setAttribute('aria-invalid', 'true')
    expect(container(el).getAttribute('aria-invalid')).toBe('true')
    expect(cells(el)[0]!.getAttribute('aria-invalid')).toBe('true')
    expect(cells(el)[5]!.getAttribute('aria-invalid')).toBe('true')

    el.setAttribute('aria-invalid', 'false')
    expect(container(el).getAttribute('aria-invalid')).toBe('false')
    expect(cells(el)[0]!.getAttribute('aria-invalid')).toBe('false')

    el.removeAttribute('aria-invalid')
    expect(container(el).getAttribute('aria-invalid')).toBeNull()
    expect(cells(el)[0]!.getAttribute('aria-invalid')).toBeNull()
  })
})
