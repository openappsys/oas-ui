import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import '@oas-ui/i18n'
import { OASTextarea } from './index.js'

function mount(attrs: Record<string, string> = {}): OASTextarea {
  const el = new OASTextarea()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function ta(el: OASTextarea): HTMLTextAreaElement {
  return el.shadowRoot!.querySelector('textarea')!
}

/** 行高：优先像素值，无单位倍数 × font-size（与组件内一致） */
function lineHeight(t: HTMLTextAreaElement): number {
  const cs = getComputedStyle(t)
  const lh = parseFloat(cs.lineHeight)
  return cs.lineHeight.endsWith('px') ? lh : lh * parseFloat(cs.fontSize)
}

describe('OASTextarea', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 textarea，rows 默认 3', async () => {
    const el = mount()
    const t = ta(el)
    await Promise.resolve()
    expect(t.tagName).toBe('TEXTAREA')
    expect(Number(t.rows)).toBe(3)
  })

  it('rows/resize 属性生效', () => {
    const el = mount({ rows: '5', resize: 'both' })
    expect(Number(ta(el).rows)).toBe(5)
    expect(ta(el).style.resize).toBe('both')
  })

  it('value 受控同步 + 外部变更增量更新', () => {
    const el = mount({ value: 'a' })
    const t = ta(el)
    expect(t.value).toBe('a')
    el.setAttribute('value', 'b')
    expect(ta(el)).toBe(t)
    expect(t.value).toBe('b')
  })

  it('输入派发 oas-input，detail 携带 value', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-input', (e: Event) => (detail = (e as CustomEvent).detail))
    ta(el).value = '文本'
    ta(el).dispatchEvent(new Event('input'))
    expect(detail).toEqual({ value: '文本' })
  })

  it('placeholder/disabled 透传', () => {
    const el = mount({ placeholder: '请输入内容', disabled: '' })
    expect(ta(el).placeholder).toBe('请输入内容')
    expect(ta(el).disabled).toBe(true)
  })

  // ---- v1.3 autosize 增强 ----

  it('autosize 输入后高度自适应（增量 style.height，不重建 DOM）', () => {
    const el = mount({ autosize: '' })
    const t = ta(el)
    Object.defineProperty(t, 'scrollHeight', { configurable: true, value: 60 })
    t.value = '第一行\n第二行'
    t.dispatchEvent(new Event('input'))
    expect(parseInt(t.style.height)).toBeGreaterThan(0)
    expect(ta(el)).toBe(t)
  })

  it('autosize 高度受 min-rows/max-rows 约束（默认 min 1 / max 6）', () => {
    const el = mount({ autosize: '', 'min-rows': '2', 'max-rows': '4' })
    const t = ta(el)
    const lh = lineHeight(t)
    expect(t.style.minHeight).toBe(`${Math.round(lh * 2 + 16)}px`) // 行高×2+上下 padding
    expect(t.style.maxHeight).toBe(`${Math.round(lh * 4 + 16)}px`)
  })

  it('内容超出 max-rows 时高度封顶并出现滚动条', () => {
    const el = mount({ autosize: '', 'max-rows': '2' })
    const t = ta(el)
    const lh = lineHeight(t)
    const maxH = Math.round(lh * 2 + 16)
    Object.defineProperty(t, 'scrollHeight', { configurable: true, value: 500 })
    t.value = '很长的内容'.repeat(20)
    t.dispatchEvent(new Event('input'))
    expect(t.style.overflowY).toBe('auto')
    expect(parseInt(t.style.height)).toBeLessThanOrEqual(maxH)
  })

  it('空内容回到 min-rows 高度', () => {
    const el = mount({ autosize: '', 'min-rows': '1' })
    const t = ta(el)
    const lh = lineHeight(t)
    Object.defineProperty(t, 'scrollHeight', { configurable: true, value: 0 })
    t.value = ''
    t.dispatchEvent(new Event('input'))
    expect(parseInt(t.style.height)).toBe(Math.round(lh + 16))
  })

  it('auto-height 旧属性兼容触发 autosize', () => {
    const el = mount({ 'auto-height': '' })
    const t = ta(el)
    Object.defineProperty(t, 'scrollHeight', { configurable: true, value: 80 })
    t.value = '内容'
    t.dispatchEvent(new Event('input'))
    expect(parseInt(t.style.height)).toBe(80)
  })

  it('无 autosize 时高度自适应不生效', () => {
    const el = mount()
    const t = ta(el)
    t.value = '内容'
    t.dispatchEvent(new Event('input'))
    expect(t.style.height).toBe('')
  })
})

describe('OASTextarea focus 委托', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('host.focus() 委托到 shadow 内 textarea', () => {
    const el = new OASTextarea()
    document.body.appendChild(el)
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('textarea'))
  })
})

// ---- 能力补齐：maxlength + show-count ----

describe('OASTextarea maxlength + show-count', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('maxlength 透传原生 textarea，移除后同步摘除', () => {
    const el = mount({ maxlength: '10' })
    expect(ta(el).getAttribute('maxlength')).toBe('10')
    el.removeAttribute('maxlength')
    expect(ta(el).hasAttribute('maxlength')).toBe(false)
  })

  it('show-count 无 maxlength 时只显示当前长度', () => {
    const el = mount({ 'show-count': '', value: 'abc' })
    const count = el.shadowRoot!.querySelector<HTMLElement>('.count')!
    expect(count.hidden).toBe(false)
    expect(count.textContent).toBe('3')
  })

  it('show-count + maxlength 显示 n/max（多数派口径），超限标 data-over', () => {
    const el = mount({ 'show-count': '', maxlength: '5', value: '123456' })
    const count = el.shadowRoot!.querySelector<HTMLElement>('.count')!
    expect(count.textContent).toBe('6/5')
    expect(count.getAttribute('data-over')).toBe('true')
    el.setAttribute('value', '123')
    expect(count.textContent).toBe('3/5')
    expect(count.getAttribute('data-over')).toBeNull()
  })

  it('show-count 计数带 aria-live=polite（读屏播报）', () => {
    const el = mount({ 'show-count': '' })
    expect(el.shadowRoot!.querySelector('.count')!.getAttribute('aria-live')).toBe('polite')
  })

  it('未开 show-count 时计数隐藏', () => {
    const el = mount({ maxlength: '5', value: 'abc' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('.count')!.hidden).toBe(true)
  })
})

// ---- 能力补齐：status / size / variant ----

describe('OASTextarea status / size / variant', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('status=error 反射宿主 data-status 并给 textarea 标 aria-invalid', () => {
    const el = mount({ status: 'error' })
    expect(el.getAttribute('data-status')).toBe('error')
    expect(ta(el).getAttribute('aria-invalid')).toBe('true')
  })

  it('status=warning / success 反射 data-status，不标 aria-invalid', () => {
    const w = mount({ status: 'warning' })
    expect(w.getAttribute('data-status')).toBe('warning')
    expect(ta(w).hasAttribute('aria-invalid')).toBe(false)
    const s = mount({ status: 'success' })
    expect(s.getAttribute('data-status')).toBe('success')
    expect(ta(s).hasAttribute('aria-invalid')).toBe(false)
  })

  it('status 移除或非法值不残留 data-status / aria-invalid', () => {
    const el = mount({ status: 'error' })
    el.removeAttribute('status')
    expect(el.hasAttribute('data-status')).toBe(false)
    expect(ta(el).hasAttribute('aria-invalid')).toBe(false)
    el.setAttribute('status', 'oops')
    expect(el.hasAttribute('data-status')).toBe(false)
  })

  it('size 反射宿主 data-size：默认 medium，small/large 生效，非法回落 medium', () => {
    expect(mount().getAttribute('data-size')).toBe('medium')
    expect(mount({ size: 'small' }).getAttribute('data-size')).toBe('small')
    expect(mount({ size: 'large' }).getAttribute('data-size')).toBe('large')
    expect(mount({ size: 'xx' }).getAttribute('data-size')).toBe('medium')
  })

  it('variant 反射宿主 data-variant：默认 outlined，filled/borderless 生效，非法回落 outlined', () => {
    expect(mount().getAttribute('data-variant')).toBe('outlined')
    expect(mount({ variant: 'filled' }).getAttribute('data-variant')).toBe('filled')
    expect(mount({ variant: 'borderless' }).getAttribute('data-variant')).toBe('borderless')
    expect(mount({ variant: 'xx' }).getAttribute('data-variant')).toBe('outlined')
  })
})

// ---- 能力补齐：clearable ----

describe('OASTextarea clearable', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('clearable 有值时显示清除按钮，点击清空并派发 oas-clear，焦点回到 textarea', () => {
    const el = mount({ clearable: '', value: '旧内容' })
    const t = ta(el)
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('.clear-btn')!
    expect(btn.hidden).toBe(false)
    expect(btn.getAttribute('aria-label')).toBe('清除')
    let detail: unknown = null
    el.addEventListener('oas-clear', (e: Event) => (detail = (e as CustomEvent).detail))
    btn.click()
    expect(t.value).toBe('')
    expect(detail).not.toBeNull()
    expect((detail as { originalEvent: MouseEvent }).originalEvent).toBeInstanceOf(MouseEvent)
    expect(btn.hidden).toBe(true)
    expect(el.shadowRoot!.activeElement).toBe(t)
  })

  it('clearable 在空值 / disabled / readonly 时清除按钮隐藏', () => {
    const clearHidden = (el: OASTextarea) => el.shadowRoot!.querySelector<HTMLElement>('.clear-btn')!.hidden
    expect(clearHidden(mount({ clearable: '' }))).toBe(true)
    expect(clearHidden(mount({ clearable: '', value: 'x', disabled: '' }))).toBe(true)
    expect(clearHidden(mount({ clearable: '', value: 'x', readonly: '' }))).toBe(true)
  })

  it('autosize 下清除内容后高度回收', () => {
    const el = mount({ autosize: '', clearable: '', 'max-rows': '0', value: '' })
    const t = ta(el)
    Object.defineProperty(t, 'scrollHeight', {
      configurable: true,
      get: () => t.value.length * 30,
    })
    t.value = '12345678'
    t.dispatchEvent(new Event('input'))
    const grown = parseInt(t.style.height)
    el.shadowRoot!.querySelector<HTMLButtonElement>('.clear-btn')!.click()
    const cleared = parseInt(t.style.height)
    expect(grown).toBeGreaterThan(cleared)
    expect(cleared).toBeGreaterThan(0)
  })
})

// ---- 能力补齐：focus / blur / change 事件与方法 ----

describe('OASTextarea focus / blur / change 事件与方法', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('聚焦/失焦派发 oas-focus / oas-blur，detail 携带当前值', () => {
    const el = mount({ value: 'abc' })
    const got: string[] = []
    el.addEventListener('oas-focus', (e: Event) => got.push(`focus:${(e as CustomEvent).detail.value}`))
    el.addEventListener('oas-blur', (e: Event) => got.push(`blur:${(e as CustomEvent).detail.value}`))
    ta(el).dispatchEvent(new Event('focus'))
    ta(el).dispatchEvent(new Event('blur'))
    expect(got).toEqual(['focus:abc', 'blur:abc'])
  })

  it('oas-change 在原生 change（失焦且值已变）时派发，detail 携带 value', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const t = ta(el)
    t.value = '提交值'
    t.dispatchEvent(new Event('change'))
    expect(detail).toEqual({ value: '提交值' })
  })

  it('host.blur() 与 host.select() 委托内部 textarea', () => {
    const el = mount()
    const t = ta(el)
    const blurSpy = vi.spyOn(t, 'blur')
    const selectSpy = vi.spyOn(t, 'select')
    el.blur()
    el.select()
    expect(blurSpy).toHaveBeenCalled()
    expect(selectSpy).toHaveBeenCalled()
  })
})

// ---- 能力补齐：label 通道与原生属性透传包 ----

describe('OASTextarea label 通道与原生透传', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('label 通道：label 属性 > placeholder 回退 > locale 默认文案', () => {
    expect(ta(mount({ label: '备注' })).getAttribute('aria-label')).toBe('备注')
    expect(ta(mount({ placeholder: '请输入备注' })).getAttribute('aria-label')).toBe('请输入备注')
    expect(ta(mount()).getAttribute('aria-label')).toBe('多行文本框')
  })

  it('原生属性透传：name/minlength/wrap/spellcheck 字符串 + autofocus/required 布尔', () => {
    const el = mount({
      name: 'bio',
      minlength: '2',
      wrap: 'hard',
      spellcheck: 'false',
      autofocus: '',
      required: '',
    })
    const t = ta(el)
    expect(t.getAttribute('name')).toBe('bio')
    expect(t.getAttribute('minlength')).toBe('2')
    expect(t.getAttribute('wrap')).toBe('hard')
    expect(t.getAttribute('spellcheck')).toBe('false')
    expect(t.hasAttribute('autofocus')).toBe(true)
    expect(t.hasAttribute('required')).toBe(true)
    el.removeAttribute('name')
    el.removeAttribute('required')
    expect(t.hasAttribute('name')).toBe(false)
    expect(t.hasAttribute('required')).toBe(false)
  })
})

// ---- 能力补齐：autosize 无上限出口 ----

describe('OASTextarea autosize 无上限出口', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('max-rows="0" 显式无上限：不设 maxHeight、高度随内容增长、不出滚动条', () => {
    const el = mount({ autosize: '', 'max-rows': '0' })
    const t = ta(el)
    Object.defineProperty(t, 'scrollHeight', { configurable: true, value: 300 })
    t.value = '很长'.repeat(50)
    t.dispatchEvent(new Event('input'))
    expect(t.style.maxHeight).toBe('')
    expect(parseInt(t.style.height)).toBe(300)
    expect(t.style.overflowY).toBe('hidden')
  })

  it('max-rows 缺省仍默认 6 封顶（默认行为不变）', () => {
    const el = mount({ autosize: '' })
    const t = ta(el)
    const lh = lineHeight(t)
    expect(t.style.maxHeight).toBe(`${Math.round(lh * 6 + 16)}px`)
  })
})
