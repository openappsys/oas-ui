import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

function styleText(el: OASPinInput): string {
  return el.shadowRoot!.querySelector('style')!.textContent ?? ''
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

function fireFocus(
  cell: HTMLInputElement,
  type: 'focusin' | 'focusout',
  relatedTarget: EventTarget | null,
): void {
  cell.dispatchEvent(new FocusEvent(type, { bubbles: true, composed: true, relatedTarget }))
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
    typeCell(cells(el)[1]!, '5')
    expect(detail).toEqual({ value: '5', index: 1 })
  })

  // ===== change 语义变更（破坏性）：oas-change 失焦提交 / oas-complete 填满 =====

  it('填满派发 oas-complete，不再同时派发 oas-change（新语义）', () => {
    const el = mount({ length: '3' })
    const events: string[] = []
    el.addEventListener('oas-change', () => events.push('change'))
    el.addEventListener('oas-complete', () => events.push('complete'))
    typeCell(cells(el)[0]!, '1')
    typeCell(cells(el)[1]!, '2')
    typeCell(cells(el)[2]!, '3')
    expect(events).toEqual(['complete'])
  })

  it('oas-complete 只在整个 value 首次变完整时派发（回退重填再次派发）', () => {
    const el = mount({ length: '2' })
    let completeCount = 0
    el.addEventListener('oas-complete', () => completeCount++)
    typeCell(cells(el)[0]!, '1')
    typeCell(cells(el)[1]!, '2')
    expect(completeCount).toBe(1)
    key(cells(el)[1]!, 'Backspace')
    typeCell(cells(el)[1]!, '3')
    expect(completeCount).toBe(2)
  })

  it('oas-change 失焦提交：编辑后失焦派发（value 相对聚焦时变化才发）', () => {
    const el = mount({ length: '4' })
    const cs = cells(el)
    const changes: unknown[] = []
    el.addEventListener('oas-change', (e) => changes.push((e as CustomEvent).detail))
    fireFocus(cs[0]!, 'focusin', null)
    typeCell(cs[0]!, '1')
    fireFocus(cs[0]!, 'focusout', null)
    expect(changes).toEqual([{ value: '1' }])
    // 再聚焦、未修改、失焦：不重复派发
    fireFocus(cs[0]!, 'focusin', null)
    fireFocus(cs[0]!, 'focusout', null)
    expect(changes).toEqual([{ value: '1' }])
    // 再聚焦、修改、失焦：再次派发
    fireFocus(cs[1]!, 'focusin', null)
    typeCell(cs[1]!, '2')
    fireFocus(cs[1]!, 'focusout', null)
    expect(changes).toEqual([{ value: '1' }, { value: '12' }])
  })

  it('格间移动不触发 oas-change，跨格编辑后一次失焦仅派发一次', () => {
    const el = mount({ length: '4' })
    const cs = cells(el)
    let count = 0
    let last = ''
    el.addEventListener('oas-change', (e) => {
      count++
      last = (e as CustomEvent).detail.value
    })
    fireFocus(cs[0]!, 'focusin', null)
    typeCell(cs[0]!, '1')
    fireFocus(cs[0]!, 'focusout', cs[1]!) // 内部移动
    fireFocus(cs[1]!, 'focusin', cs[0]!)
    typeCell(cs[1]!, '2')
    fireFocus(cs[1]!, 'focusout', null) // 真正离开
    expect(count).toBe(1)
    expect(last).toBe('12')
  })

  // ===== oas-focus / oas-blur 组件级事件 =====

  it('oas-focus/oas-blur：组件级进出派发（携带 index），格间移动不派发', () => {
    const el = mount({ length: '4' })
    const cs = cells(el)
    const got: Array<[string, unknown]> = []
    el.addEventListener('oas-focus', (e) => got.push(['focus', (e as CustomEvent).detail]))
    el.addEventListener('oas-blur', (e) => got.push(['blur', (e as CustomEvent).detail]))
    fireFocus(cs[1]!, 'focusin', null)
    // 格间移动（relatedTarget 是另一格）：不派发
    fireFocus(cs[1]!, 'focusout', cs[2]!)
    fireFocus(cs[2]!, 'focusin', cs[1]!)
    expect(got).toEqual([['focus', { index: 1 }]])
    // 真正离开组件
    fireFocus(cs[2]!, 'focusout', null)
    expect(got).toEqual([
      ['focus', { index: 1 }],
      ['blur', { index: 2 }],
    ])
  })

  // ===== type 语义化 + 字符过滤（修复 number 透传可输 e/E/±/. 缺陷） =====

  it('type 默认 number：格子恒为原生 text + inputmode=numeric，e/E/±/. 被拒绝', () => {
    const el = mount()
    const cs = cells(el)
    expect(cs[0]!.type).toBe('text')
    expect(cs[0]!.getAttribute('inputmode')).toBe('numeric')
    for (const bad of ['e', 'E', '+', '-', '.']) {
      typeCell(cs[0]!, bad)
      expect(cs[0]!.value, `字符 ${bad} 应被拒绝`).toBe('')
    }
    typeCell(cs[0]!, '5')
    expect(cs[0]!.value).toBe('5')
  })

  it('type=alphanumeric：字母数字放行、符号拒绝', () => {
    const el = mount({ type: 'alphanumeric' })
    const cs = cells(el)
    typeCell(cs[0]!, 'a')
    expect(cs[0]!.value).toBe('a')
    typeCell(cs[1]!, '7')
    expect(cs[1]!.value).toBe('7')
    typeCell(cs[2]!, '!')
    expect(cs[2]!.value).toBe('')
  })

  it('type=text：任意字符放行且不设 inputmode', () => {
    const el = mount({ type: 'text' })
    const cs = cells(el)
    expect(cs[0]!.getAttribute('inputmode')).toBeNull()
    typeCell(cs[0]!, '!')
    expect(cs[0]!.value).toBe('!')
  })

  it('type 非法值回落 number 语义并告警（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const a = mount({ type: 'tel' })
    const b = mount({ type: 'tel' })
    expect(cells(a)[0]!.getAttribute('inputmode')).toBe('numeric')
    expect(warn).toHaveBeenCalledTimes(1)
    void b
    warn.mockRestore()
  })

  it('mask 优先于 type：password 型且不设 inputmode', () => {
    const el = mount({ mask: '', type: 'number' })
    expect(cells(el)[0]!.type).toBe('password')
    expect(cells(el)[0]!.getAttribute('inputmode')).toBeNull()
  })

  it('pattern 覆盖 type 字符约束（逐字符匹配）', () => {
    const el = mount({ type: 'text', pattern: '[0-3]', length: '2' })
    const cs = cells(el)
    typeCell(cs[0]!, '5')
    expect(cs[0]!.value).toBe('')
    typeCell(cs[0]!, '2')
    expect(cs[0]!.value).toBe('2')
  })

  it('pattern 非法正则告警并回落 type 约束', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ pattern: '[0-9' })
    const cs = cells(el)
    typeCell(cs[0]!, 'e')
    expect(cs[0]!.value).toBe('')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('value 分发同步过滤（默认 number 下非法字符被滤除）', () => {
    const el = mount({ value: '1a2', length: '4' })
    const cs = cells(el)
    expect(cs[0]!.value).toBe('1')
    expect(cs[1]!.value).toBe('2')
    expect(cs[2]!.value).toBe('')
  })

  it('粘贴分发自动分发到后续格子', () => {
    const el = mount({ length: '4' })
    const cs = cells(el)
    cs[0]!.focus()
    const evt = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(evt, 'clipboardData', {
      value: { getData: () => '1234' },
    })
    container(el).dispatchEvent(evt)
    expect(cs.map((c) => c.value).join('')).toBe('1234')
  })

  it('粘贴分发同步过滤非法字符', () => {
    const el = mount({ length: '4' })
    const evt = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(evt, 'clipboardData', { value: { getData: () => '1a2b' } })
    container(el).dispatchEvent(evt)
    expect(cells(el).map((c) => c.value).join('')).toBe('12')
  })

  // ===== otp 自动填充 =====

  it('otp 属性置各格 autocomplete=one-time-code，默认 off', () => {
    const a = mount({ otp: '' })
    expect(cells(a)[0]!.autocomplete).toBe('one-time-code')
    expect(cells(a)[5]!.autocomplete).toBe('one-time-code')
    const b = mount()
    expect(cells(b)[0]!.autocomplete).toBe('off')
  })

  // ===== separator 分隔符 =====

  it('separator+separator-after：在指定位后插入分隔元素', () => {
    const el = mount({ length: '6', separator: '-', 'separator-after': '3' })
    const kids = [...container(el).children]
    expect(kids.filter((n) => n.classList.contains('separator')).length).toBe(1)
    const sep = kids[3] as HTMLElement
    expect(sep.classList.contains('separator')).toBe(true)
    expect(sep.getAttribute('part')).toBe('separator')
    expect(sep.getAttribute('aria-hidden')).toBe('true')
    expect(sep.textContent).toBe('-')
    expect(cells(el).length).toBe(6)
  })

  it('separator 缺省 separator-after：每相邻对之间插入', () => {
    const el = mount({ length: '4', separator: ' ' })
    expect(container(el).querySelectorAll('.separator').length).toBe(3)
  })

  it('separator-after 逗号列表多位插入，属性变更幂等', () => {
    const el = mount({ length: '6', separator: '.', 'separator-after': '2,4' })
    const cont = container(el)
    expect(cont.querySelectorAll('.separator').length).toBe(2)
    el.setAttribute('separator-after', '3')
    expect(cont.querySelectorAll('.separator').length).toBe(1)
    el.removeAttribute('separator')
    expect(cont.querySelectorAll('.separator').length).toBe(0)
  })

  // ===== size / placeholder / autofocus =====

  it('size 三档映射 data-size，非法回落 medium 并告警（同值去重）', () => {
    const el = mount({ size: 'small' })
    expect(container(el).getAttribute('data-size')).toBe('small')
    el.setAttribute('size', 'large')
    expect(container(el).getAttribute('data-size')).toBe('large')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = mount({ size: 'huge' })
    expect(container(bad).getAttribute('data-size')).toBe('medium')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('size 档位 CSS 走 control-height token（小/大档）', () => {
    const css = styleText(mount())
    expect(css).toMatch(/\.container\[data-size='small'\] input\s*\{[^}]*--oas-control-height-sm/)
    expect(css).toMatch(/\.container\[data-size='large'\] input\s*\{[^}]*--oas-control-height-lg/)
  })

  it('placeholder 透传到各格', () => {
    const el = mount({ placeholder: '○' })
    expect(cells(el).every((c) => c.placeholder === '○')).toBe(true)
  })

  it('autofocus：连接后聚焦首个空格', () => {
    const el = mount({ value: '12', length: '4', autofocus: '' })
    expect(el.shadowRoot!.activeElement).toBe(cells(el)[2])
  })

  // ===== focus(index?) / blur() 公共方法 =====

  it('focus() 缺省聚焦首个空格，全部填满时聚焦末格', () => {
    const el = mount({ value: '12', length: '4' })
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(cells(el)[2])
    el.setAttribute('value', '1234')
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(cells(el)[3])
  })

  it('focus(index) 聚焦指定格；越界回落默认策略', () => {
    const el = mount({ length: '4' })
    el.focus(2)
    expect(el.shadowRoot!.activeElement).toBe(cells(el)[2])
    el.focus(99)
    expect(el.shadowRoot!.activeElement).toBe(cells(el)[0])
  })

  it('blur() 使活动格失焦', () => {
    const el = mount({ length: '4' })
    el.focus(1)
    el.blur()
    expect(el.shadowRoot!.activeElement).toBeNull()
  })

  // ===== auto-submit 填满自动提交 =====

  it('auto-submit：填满后调用关联 form 的 requestSubmit', () => {
    const form = document.createElement('form')
    const el = new OASPinInput()
    el.setAttribute('length', '2')
    el.setAttribute('auto-submit', '')
    form.appendChild(el)
    document.body.appendChild(form)
    const spy = vi.fn()
    form.requestSubmit = spy as unknown as HTMLFormElement['requestSubmit']
    typeCell(cells(el)[0]!, '1')
    typeCell(cells(el)[1]!, '2')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('未设 auto-submit 时填满不自动提交', () => {
    const form = document.createElement('form')
    const el = new OASPinInput()
    el.setAttribute('length', '1')
    form.appendChild(el)
    document.body.appendChild(form)
    const spy = vi.fn()
    form.requestSubmit = spy as unknown as HTMLFormElement['requestSubmit']
    typeCell(cells(el)[0]!, '9')
    expect(spy).not.toHaveBeenCalled()
  })

  it('auto-submit 无关联 form 时安全 no-op（不抛错）', () => {
    const el = mount({ 'auto-submit': '', length: '1' })
    expect(() => typeCell(cells(el)[0]!, '9')).not.toThrow()
    expect(el.getAttribute('value')).toBe('9')
  })

  // ===== loading 提交中态 =====

  it('loading：格子禁用、容器 aria-busy、spinner 显示，输入键盘全拦截', () => {
    const el = mount({ value: '12', length: '3', loading: '' })
    const cs = cells(el)
    expect(cs[0]!.disabled).toBe(true)
    expect(container(el).getAttribute('aria-busy')).toBe('true')
    const spinner = el.shadowRoot!.querySelector<HTMLElement>('.spinner')!
    expect(spinner.hidden).toBe(false)
    typeCell(cs[2]!, '9')
    expect(el.getAttribute('value')).toBe('12')
    key(cs[1]!, 'Backspace')
    expect(cs[1]!.value).toBe('2')
    expect(el.getAttribute('value')).toBe('12')
    el.removeAttribute('loading')
    expect(cs[0]!.disabled).toBe(false)
    expect(container(el).getAttribute('aria-busy')).toBeNull()
    expect(spinner.hidden).toBe(true)
  })

  it('loading spinner CSS 存在（旋转动画 + token 颜色）', () => {
    const css = styleText(mount())
    expect(css).toMatch(/@keyframes oas-pin-input-spin/)
    expect(css).toMatch(/\.spinner::after\s*\{[^}]*--oas-color-primary/)
  })

  // ===== success 成功态 / variant 形态 / attached 连体 =====

  it('success 成功态：CSS 使用 success token，error（aria-invalid）规则优先', () => {
    const el = mount({ success: '' })
    expect(el.hasAttribute('success')).toBe(true)
    const css = styleText(el)
    expect(css).toMatch(/:host\(\[success\]\) \.container input\s*\{[^}]*--oas-color-success/)
    expect(css.indexOf(':host([success]) .container input')).toBeLessThan(
      css.indexOf(":host([aria-invalid='true']) .container input"),
    )
  })

  it('variant 形态：filled/underlined 映射 data-variant，非法回落 outlined 并告警', () => {
    const el = mount({ variant: 'filled' })
    expect(container(el).getAttribute('data-variant')).toBe('filled')
    el.setAttribute('variant', 'underlined')
    expect(container(el).getAttribute('data-variant')).toBe('underlined')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = mount({ variant: 'dashed' })
    expect(container(bad).getAttribute('data-variant')).toBe('outlined')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('variant CSS：filled 用 bg-hover token、underlined 用 block-end 逻辑边框', () => {
    const css = styleText(mount())
    expect(css).toMatch(/\.container\[data-variant='filled'\] input\s*\{[^}]*--oas-color-bg-hover/)
    expect(css).toMatch(/\.container\[data-variant='underlined'\] input\s*\{[^}]*border-block-end/)
  })

  it('attached 连体：data-attached 映射 + gap 归零 + 邻接负 margin（逻辑属性）', () => {
    const el = mount({ attached: '' })
    expect(container(el).hasAttribute('data-attached')).toBe(true)
    const css = styleText(el)
    expect(css).toMatch(/\.container\[data-attached\]\s*\{[^}]*gap:\s*0/)
    expect(css).toMatch(/margin-inline-start:\s*-1px/)
  })

  // ===== RTL =====

  it('RTL：dir=rtl 时方向键语义反转（ArrowLeft 前进、ArrowRight 后退）', () => {
    const rtl = document.createElement('div')
    rtl.setAttribute('dir', 'rtl')
    document.body.appendChild(rtl)
    const el = new OASPinInput()
    rtl.appendChild(el)
    const cs = cells(el)
    cs[2]!.focus()
    key(cs[2]!, 'ArrowLeft')
    expect(el.shadowRoot!.activeElement).toBe(cs[3])
    key(cs[3]!, 'ArrowRight')
    expect(el.shadowRoot!.activeElement).toBe(cs[2])
  })

  // ===== 既有行为回归 =====

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
    typeCell(cells(el)[0]!, '7')
    expect(el.getAttribute('value')).toBe('7')
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

  it('新增属性在 observedAttributes 中（动态切换即时生效）', () => {
    expect(OASPinInput.observedAttributes).toEqual(
      expect.arrayContaining([
        'otp',
        'separator',
        'separator-after',
        'size',
        'placeholder',
        'variant',
        'attached',
        'loading',
        'pattern',
      ]),
    )
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
