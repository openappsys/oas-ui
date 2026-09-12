import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASInputNumber } from './index.js'

function mount(attrs: Record<string, string> = {}): OASInputNumber {
  const el = new OASInputNumber()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function input(el: OASInputNumber): HTMLInputElement {
  return el.shadowRoot!.querySelector('input')!
}

function upBtn(el: OASInputNumber): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button[part="up"]')!
}

function downBtn(el: OASInputNumber): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button[part="down"]')!
}

function clearBtn(el: OASInputNumber): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button[part="clear"]')!
}

function type(el: OASInputNumber, text: string): void {
  const i = input(el)
  i.value = text
  i.dispatchEvent(new Event('input', { bubbles: true }))
}

function commit(el: OASInputNumber): void {
  input(el).dispatchEvent(new Event('change'))
}

describe('OASInputNumber 基础', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('内层为 text 输入 + inputmode=decimal + role=spinbutton（换 text 路线后手动补 aria）', () => {
    const el = mount({ value: '5', min: '0', max: '10' })
    const i = input(el)
    expect(i.type).toBe('text')
    expect(i.getAttribute('inputmode')).toBe('decimal')
    expect(i.getAttribute('role')).toBe('spinbutton')
    expect(i.getAttribute('aria-valuemin')).toBe('0')
    expect(i.getAttribute('aria-valuemax')).toBe('10')
    expect(i.getAttribute('aria-valuenow')).toBe('5')
    expect(i.value).toBe('5')
  })

  it('value 受控同步：外部变更增量更新显示', () => {
    const el = mount({ value: '3' })
    const i = input(el)
    el.setAttribute('value', '7')
    expect(input(el)).toBe(i)
    expect(i.value).toBe('7')
    expect(i.getAttribute('aria-valuenow')).toBe('7')
  })

  it('步进按钮 + 增加、- 减少，触发 oas-change 并写回宿主', () => {
    const el = mount({ value: '5' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    upBtn(el).click()
    expect(input(el).value).toBe('6')
    expect(detail).toEqual({ value: 6 })
    expect(el.getAttribute('value')).toBe('6')
    downBtn(el).click()
    expect(input(el).value).toBe('5')
    expect(el.getAttribute('value')).toBe('5')
  })

  it('步进不越界 min/max，边界按钮禁用', () => {
    const el = mount({ value: '9', max: '10' })
    upBtn(el).click()
    upBtn(el).click()
    expect(input(el).value).toBe('10')
    expect(upBtn(el).disabled).toBe(true)
    expect(downBtn(el).disabled).toBe(false)
  })

  it('disabled 时步进按钮与键盘无效', () => {
    const el = mount({ value: '5', disabled: '' })
    upBtn(el).click()
    expect(input(el).value).toBe('5')
    input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true, bubbles: true }))
    expect(input(el).value).toBe('5')
  })

  it('写回不产生二次事件（受控幂等）', () => {
    const el = mount({ value: '5' })
    let changeCount = 0
    el.addEventListener('oas-change', () => changeCount++)
    type(el, '8')
    commit(el)
    expect(changeCount).toBe(1)
    // change 后紧跟 blur（真实浏览器失焦序列），不重复派发
    input(el).dispatchEvent(new Event('blur'))
    expect(changeCount).toBe(1)
    expect(el.getAttribute('value')).toBe('8')
  })
})

describe('OASInputNumber 空值语义（clearable）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('无 value 时为空值态：显示空、无 aria-valuenow（未填 ≠ 0）', () => {
    const el = mount()
    expect(input(el).value).toBe('')
    expect(input(el).hasAttribute('aria-valuenow')).toBe(false)
  })

  it('value="null" / value="NaN" 防御性归一为空值（oas-form JSON 写回互通）', () => {
    const el = mount({ value: 'null' })
    expect(input(el).value).toBe('')
    el.setAttribute('value', 'NaN')
    expect(input(el).value).toBe('')
  })

  it('clearable：有值显示清除按钮，点击清空并派发 oas-clear + oas-change null', () => {
    const el = mount({ value: '5', clearable: '' })
    const clear = clearBtn(el)
    expect(clear.hidden).toBe(false)
    let changeDetail: unknown
    let clearCount = 0
    el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-clear', () => clearCount++)
    clear.click()
    expect(clearCount).toBe(1)
    expect(changeDetail).toEqual({ value: null })
    expect(el.getAttribute('value')).toBe('')
    expect(input(el).value).toBe('')
    expect(input(el).hasAttribute('aria-valuenow')).toBe(false)
    // 清空后按钮隐藏
    expect(clearBtn(el).hidden).toBe(true)
  })

  it('clearable 空值/禁用/只读时清除按钮隐藏', () => {
    const el = mount({ clearable: '' })
    expect(clearBtn(el).hidden).toBe(true)
    el.setAttribute('value', '5')
    expect(clearBtn(el).hidden).toBe(false)
    el.setAttribute('disabled', '')
    expect(clearBtn(el).hidden).toBe(true)
    el.removeAttribute('disabled')
    el.setAttribute('readonly', '')
    expect(clearBtn(el).hidden).toBe(true)
  })

  it('键入空文本失焦提交 null', () => {
    const el = mount({ value: '5', clearable: '' })
    type(el, '')
    commit(el)
    expect(el.getAttribute('value')).toBe('')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    type(el, '')
    commit(el)
    expect(detail).toEqual({ value: null })
  })

  it('空值步进：无 min 从 0 起，有 min 从 min 起', () => {
    const el = mount({ step: '5' })
    upBtn(el).click()
    expect(input(el).value).toBe('5')

    const el2 = mount({ min: '10', step: '5' })
    upBtn(el2).click()
    expect(input(el2).value).toBe('15')
  })
})

describe('OASInputNumber 键盘与提交', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('ArrowUp / ArrowDown 键盘步进并阻止默认光标移动', () => {
    const el = mount({ value: '5' })
    const i = input(el)
    const up = i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true, bubbles: true }))
    expect(up).toBe(false) // preventDefault 生效
    expect(i.value).toBe('6')
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true, bubbles: true }))
    expect(i.value).toBe('5')
  })

  it('Enter 提交当前键入值', () => {
    const el = mount({ value: '5' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    type(el, '42')
    input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(detail).toEqual({ value: 42 })
    expect(el.getAttribute('value')).toBe('42')
  })

  it('Esc 还原本次键入（取消路径），不派发事件', () => {
    const el = mount({ value: '5' })
    let changeCount = 0
    el.addEventListener('oas-change', () => changeCount++)
    type(el, '99')
    input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(input(el).value).toBe('5')
    // 还原后失焦不再派发（值未变）
    input(el).dispatchEvent(new Event('blur'))
    expect(changeCount).toBe(0)
  })

  it('readonly：input 只读、按钮禁用、键盘不步进', () => {
    const el = mount({ value: '5', readonly: '' })
    const i = input(el)
    expect(i.readOnly).toBe(true)
    expect(i.getAttribute('aria-readonly')).toBe('true')
    expect(upBtn(el).disabled).toBe(true)
    expect(downBtn(el).disabled).toBe(true)
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true, bubbles: true }))
    expect(i.value).toBe('5')
  })

  it('placeholder 透传，aria-label 回退链 label > placeholder > 内置文案', () => {
    const el = mount({ placeholder: '请输入数量' })
    expect(input(el).placeholder).toBe('请输入数量')
    expect(input(el).getAttribute('aria-label')).toBe('请输入数量')
    el.setAttribute('label', '商品数量')
    expect(input(el).getAttribute('aria-label')).toBe('商品数量')
    el.removeAttribute('label')
    el.removeAttribute('placeholder')
    expect(input(el).getAttribute('aria-label')).toBe('数字输入框')
  })
})

describe('OASInputNumber 越界与非法输入', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('键入越界临时红显（data-out-of-range），失焦矫正后移除', () => {
    const el = mount({ value: '5', min: '0', max: '100' })
    type(el, '200')
    expect(el.hasAttribute('data-out-of-range')).toBe(true)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    input(el).dispatchEvent(new Event('blur'))
    expect(el.hasAttribute('data-out-of-range')).toBe(false)
    expect(input(el).value).toBe('100')
    expect(detail).toEqual({ value: 100 })
  })

  it('键入越界不打断逐位输入（失焦才矫正）', () => {
    const el = mount({ value: '5', min: '50', max: '100' })
    // 先输 1（越界下限）再补 00 凑 100
    type(el, '1')
    expect(el.hasAttribute('data-out-of-range')).toBe(true)
    expect(input(el).value).toBe('1') // 不被即时钳制
    type(el, '100')
    expect(input(el).value).toBe('100')
    expect(el.hasAttribute('data-out-of-range')).toBe(false)
  })

  it('非法文本失焦还原为上一个有效值，不派发事件', () => {
    const el = mount({ value: '5' })
    let changeCount = 0
    el.addEventListener('oas-change', () => changeCount++)
    type(el, 'abc')
    expect(input(el).value).toBe('abc') // 键入过程容忍
    input(el).dispatchEvent(new Event('blur'))
    expect(input(el).value).toBe('5')
    expect(changeCount).toBe(0)
    expect(el.getAttribute('value')).toBe('5')
  })

  it('step-strictly：提交时吸附最近的 step 倍数', () => {
    const el = mount({ step: '5', 'step-strictly': '' })
    type(el, '3')
    commit(el)
    expect(el.getAttribute('value')).toBe('5')

    const el2 = mount({ step: '5', 'step-strictly': '' })
    type(el2, '2')
    commit(el2)
    expect(el2.getAttribute('value')).toBe('0')

    // 吸附后再钳制
    const el3 = mount({ min: '1', step: '5', 'step-strictly': '' })
    type(el3, '2')
    commit(el3)
    expect(el3.getAttribute('value')).toBe('1')
  })
})

describe('OASInputNumber 格式化（声明式 + 函数式）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('grouping 千分位显示，解析时剥离分组符', () => {
    const el = mount({ value: '1234567', grouping: '' })
    const expected = new Intl.NumberFormat(undefined, { useGrouping: true }).format(1234567)
    expect(input(el).value).toBe(expected)

    type(el, expected)
    commit(el)
    expect(el.getAttribute('value')).toBe('1234567')
    expect(input(el).value).toBe(expected) // 提交后回显格式化
  })

  it('format=currency:USD 货币显示（含 aria-valuetext）', () => {
    const el = mount({ value: '1234.5', format: 'currency:USD' })
    const expected = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
    }).format(1234.5)
    expect(input(el).value).toBe(expected)
    expect(input(el).getAttribute('aria-valuetext')).toBe(expected)
    type(el, expected)
    commit(el)
    expect(el.getAttribute('value')).toBe('1234.5')
  })

  it('format=percent 比率语义：0.15 显示 15%，键入 20 提交 0.2', () => {
    const el = mount({ value: '0.15', format: 'percent' })
    expect(input(el).value).toBe(new Intl.NumberFormat(undefined, { style: 'percent' }).format(0.15))
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    type(el, '20')
    commit(el)
    expect(detail).toEqual({ value: 0.2 })
    expect(el.getAttribute('value')).toBe('0.2')
  })

  it('precision 同时控制显示小数位：1.5 显示 1.50', () => {
    const el = mount({ value: '1.5', precision: '2' })
    const expected = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(1.5)
    expect(input(el).value).toBe(expected)
  })

  it('函数式 formatter/parser property：优先于声明式', () => {
    const el = mount({ value: '5', grouping: '' })
    el.formatter = (v) => `€${v}`
    el.parser = (s) => Number(s.replace('€', ''))
    expect(input(el).value).toBe('€5')
    type(el, '€9')
    commit(el)
    expect(el.getAttribute('value')).toBe('9')
    expect(input(el).value).toBe('€9')
    expect(input(el).getAttribute('aria-valuetext')).toBe('€9')
  })

  it('formatter 返回非法值防御性回退数字串', () => {
    const el = mount({ value: '5' })
    el.formatter = () => undefined as unknown as string
    expect(input(el).value).toBe('5')
  })

  it('parser 抛异常按非法输入处理（失焦还原）', () => {
    const el = mount({ value: '5' })
    el.parser = () => {
      throw new Error('bad')
    }
    type(el, '9')
    commit(el)
    expect(input(el).value).toBe('5')
    expect(el.getAttribute('value')).toBe('5')
  })
})

describe('OASInputNumber prefix / suffix', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('prefix / suffix 属性渲染为内嵌文案', () => {
    const el = mount({ value: '1280', prefix: '$', suffix: '.00' })
    expect(el.shadowRoot!.querySelector('[part="prefix"]')!.textContent).toBe('$')
    expect(el.shadowRoot!.querySelector('[part="suffix"]')!.textContent).toBe('.00')
    expect(input(el).value).toBe('1280')
  })

  it('prefix / suffix 同名插槽覆盖属性文案，空态隐藏', () => {
    const el = mount({ prefix: 'x' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="prefix"]')!.hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="suffix"]')!.hidden).toBe(true)

    el.innerHTML = '<span slot="prefix">¥</span>'
    const slot = el.shadowRoot!.querySelector('slot[name="prefix"]') as HTMLSlotElement
    slot.dispatchEvent(new Event('slotchange'))
    const prefixEl = el.shadowRoot!.querySelector<HTMLElement>('[part="prefix"]')!
    expect(prefixEl.hidden).toBe(false)
    expect(slot.assignedNodes().length).toBe(1)
  })

  it('prefix-text 渲染且遗留 prefix 迁移（不再被 Vue 劫持）', () => {
    const el = mount({ 'prefix-text': '¥' })
    expect(el.shadowRoot!.querySelector('[part="prefix"]')!.textContent).toContain('¥')
    expect(el.getAttribute('prefix-text')).toBe('¥')
    // 遗留 prefix 在首帧 update 迁移到 prefix-text
    const legacy = mount({ prefix: '$' })
    expect(legacy.getAttribute('prefix-text')).toBe('$')
    expect(legacy.getAttribute('prefix')).toBeNull()
    expect(legacy.shadowRoot!.querySelector('[part="prefix"]')!.textContent).toContain('$')
  })
})

describe('OASInputNumber controls 显隐与位置', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('controls="false" 隐藏步进按钮，键盘仍可步进', () => {
    const el = mount({ value: '5', controls: 'false' })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain(":host([controls='false']) .controls")
    expect(css).toContain('display: none')
    // 隐藏后键盘箭头仍可用（属性只管视觉）
    input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true, bubbles: true }))
    expect(input(el).value).toBe('6')
  })

  it('controls-position=both 切换两侧 +/- 形态（CSS 规则存在性）', () => {
    const el = mount({ value: '5', 'controls-position': 'both' })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain(":host([controls-position='both'])")
    expect(css).toContain('display: contents')
    // both 形态下 +/- 图标显示、chevron 隐藏
    expect(css).toContain('.icon-sign')
    expect(css).toContain('.icon-chevron')
    // 步进仍工作
    upBtn(el).click()
    expect(input(el).value).toBe('6')
  })

  it('非法 controls-position 值不崩溃（回落 right 形态）', () => {
    const el = mount({ value: '5', 'controls-position': 'diagonal' })
    expect(input(el).value).toBe('5')
    upBtn(el).click()
    expect(input(el).value).toBe('6')
  })
})

describe('OASInputNumber size / status / readonly 样式', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('size 三档走控件高度 token（CSS 规则存在性，无硬编码色值）', () => {
    const el = mount({ value: '5' })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain(":host([size='sm'])")
    expect(css).toContain(': var(--oas-control-height-sm)')
    expect(css).toContain(":host([size='lg'])")
    expect(css).toContain(': var(--oas-control-height-lg)')
    // 属性变化不崩溃
    el.setAttribute('size', 'sm')
    el.setAttribute('size', 'lg')
    expect(input(el).value).toBe('5')
  })

  it('status 三态边框走语义 token（error/warning/success）', () => {
    const el = mount({ value: '5' })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain(":host([status='error']) input")
    expect(css).toContain(":host([status='warning']) input")
    expect(css).toContain(":host([status='success']) input")
    expect(css).toContain('var(--oas-color-danger)')
    expect(css).toContain('var(--oas-color-warning)')
    expect(css).toContain('var(--oas-color-success)')
    el.setAttribute('status', 'error')
    el.setAttribute('status', 'warning')
    el.setAttribute('status', 'success')
    expect(input(el).value).toBe('5')
  })

  it('data-out-of-range 越界红显样式走 danger token', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain(':host([data-out-of-range])')
    expect(css).toContain('var(--oas-color-danger)')
  })

  it('disabled 注入镜像 data-disabled 到宿主', () => {
    const el = mount({ value: '5', disabled: '' })
    expect(el.hasAttribute('data-disabled')).toBe(true)
    el.removeAttribute('disabled')
    expect(el.hasAttribute('data-disabled')).toBe(false)
  })
})

describe('OASInputNumber 长按连击', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('按住 800ms 后每 100ms 连击，松手停止', () => {
    const el = mount({ value: '0' })
    const btn = upBtn(el)
    btn.dispatchEvent(new Event('pointerdown'))
    // 未到 800ms 不连击（此时仅等待，步进由 release 后的 click 承担）
    vi.advanceTimersByTime(799)
    expect(input(el).value).toBe('0')
    vi.advanceTimersByTime(1) // 800ms：连击启动
    vi.advanceTimersByTime(100)
    expect(input(el).value).toBe('1')
    vi.advanceTimersByTime(300)
    expect(input(el).value).toBe('4')
    btn.dispatchEvent(new Event('pointerup'))
    vi.advanceTimersByTime(1000)
    expect(input(el).value).toBe('4')
    // 松手后的 click 正常步进一次（快速点击路径）
    btn.click()
    expect(input(el).value).toBe('5')
  })

  it('断连清理连击计时器', () => {
    const el = mount({ value: '0' })
    const btn = upBtn(el)
    btn.dispatchEvent(new Event('pointerdown'))
    vi.advanceTimersByTime(900)
    el.remove()
    vi.advanceTimersByTime(1000)
    expect(input(el).value).toBe('1') // 断连后不再步进
  })

  it('disabled / readonly 不启动连击', () => {
    const el = mount({ value: '0', readonly: '' })
    const btn = upBtn(el)
    btn.dispatchEvent(new Event('pointerdown'))
    vi.advanceTimersByTime(2000)
    expect(input(el).value).toBe('0')
  })
})

describe('OASInputNumber 滚轮步进', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('wheel 属性 + 聚焦时滚轮步进并阻止页面滚动', () => {
    const el = mount({ value: '5', wheel: '' })
    el.focus()
    const down = input(el).dispatchEvent(new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true }))
    expect(down).toBe(false) // preventDefault 生效
    expect(input(el).value).toBe('4')
    input(el).dispatchEvent(new WheelEvent('wheel', { deltaY: -120, cancelable: true, bubbles: true }))
    expect(input(el).value).toBe('5')
  })

  it('未设 wheel 属性时滚轮不劫持（默认不 preventDefault）', () => {
    const el = mount({ value: '5' })
    el.focus()
    const notPrevented = input(el).dispatchEvent(
      new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true }),
    )
    expect(notPrevented).toBe(true)
    expect(input(el).value).toBe('5')
  })

  it('wheel 未聚焦时不步进', () => {
    const el = mount({ value: '5', wheel: '' })
    // 不 focus
    input(el).dispatchEvent(new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true }))
    expect(input(el).value).toBe('5')
  })
})

describe('OASInputNumber focus 委托与水合结构', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('host.focus() 委托到 shadow 内主输入', () => {
    const el = new OASInputNumber()
    document.body.appendChild(el)
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('input'))
  })

  it('hydrate 接管结构指纹：主输入与步进按钮存在', () => {
    const el = new OASInputNumber()
    document.body.appendChild(el)
    // SSR 水合路径由 form/ssr-hydrate.test.ts 覆盖；此处校验 render 后结构稳定
    expect(el.shadowRoot!.querySelector('input[part="input"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('button[part="up"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('button[part="down"]')).not.toBeNull()
  })
})
