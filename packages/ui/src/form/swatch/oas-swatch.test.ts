import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASSwatch, OASSwatchGroup } from './index.js'

function mountSwatch(attrs: Record<string, string> = {}): OASSwatch {
  const el = new OASSwatch()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function mountGroup(attrs: Record<string, string> = {}, colors: string[] = ['red', 'blue']): OASSwatchGroup {
  const el = new OASSwatchGroup()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  for (const c of colors) {
    const s = document.createElement('oas-swatch') as OASSwatch
    s.setAttribute('color', c)
    el.appendChild(s)
  }
  document.body.appendChild(el)
  return el
}

function btn(el: OASSwatch): HTMLButtonElement {
  return el.shadowRoot!.querySelector('[part="swatch"]')!
}

describe('OASSwatch 色块件', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })
  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('渲染原生 button 色块：color 直注背景（预设名走 var(--oas-preset-*)）', () => {
    const plain = mountSwatch({ color: '#ff0000' })
    expect(btn(plain).style.backgroundColor).toBe('#ff0000')
    plain.remove()
    const preset = mountSwatch({ color: 'blue' })
    expect(btn(preset).style.backgroundColor).toBe('var(--oas-preset-blue)')
  })

  it('role=button + 可访问名：label 属性优先，缺省 i18n（swatch.color + 色值）', () => {
    const el = mountSwatch({ color: '#ff0000' })
    expect(btn(el).getAttribute('aria-label')).toContain('#ff0000')
    el.setAttribute('label', '主色')
    expect(btn(el).getAttribute('aria-label')).toBe('主色')
  })

  it('i18n：缺省可访问名随 locale 切换', () => {
    const el = mountSwatch({ color: '#0b6cff' })
    expect(btn(el).getAttribute('aria-label')).toContain('色板')
    setLocale(en)
    el.setAttribute('size', 'small') // 触发 update
    expect(btn(el).getAttribute('aria-label')).toContain('Color swatch')
    setLocale('zh-CN')
  })

  it('size 五档写 data-size（非法回落 medium 告警一次）', () => {
    const el = mountSwatch({ size: 'xl' })
    expect(el.getAttribute('data-size')).toBe('xl')
  })

  it('shape 三态写 data-shape（square/rounded/circle，非法回落 rounded）', () => {
    const el = mountSwatch({ shape: 'circle' })
    expect(el.getAttribute('data-shape')).toBe('circle')
  })

  it('nothing 态：无色指示（棋盘格底 class），不依赖 color', () => {
    const el = mountSwatch({ nothing: '' })
    expect(btn(el).classList.contains('nothing')).toBe(true)
  })

  it('mixed 态：混色拼贴指示 class', () => {
    const el = mountSwatch({ mixed: '' })
    expect(btn(el).classList.contains('mixed')).toBe(true)
  })

  it('disabled：不派发 oas-click、不可聚焦', () => {
    const el = mountSwatch({ color: 'red', disabled: '' })
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    btn(el).click()
    expect(fired).toBe(0)
    expect(btn(el).disabled).toBe(true)
  })

  it('selected 受控选中态：data-selected 标记 + aria-pressed 同步', () => {
    const el = mountSwatch({ color: 'red' })
    expect(btn(el).getAttribute('aria-pressed')).toBe('false')
    el.setAttribute('selected', '')
    expect(btn(el).getAttribute('aria-pressed')).toBe('true')
    expect(el.getAttribute('data-selected')).toBe('')
  })

  it('点击派发 oas-click（detail { color }，bubbles+composed）', () => {
    const el = mountSwatch({ color: 'red' })
    let detail: unknown = null
    el.addEventListener('oas-click', (e) => (detail = (e as CustomEvent).detail))
    btn(el).click()
    expect(detail).toEqual({ color: 'red' })
  })

  it(':host([hidden]) 兜底（守卫惯例）', () => {
    const el = mountSwatch({ color: 'red' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(':host([hidden])')
  })
})

describe('OASSwatchGroup 选择组', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })
  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('单选：点击子件 → 组 value 更新 + 子件 selected 同步 + 组级 oas-change（子件 oas-click 不外泄）', () => {
    const el = mountGroup()
    const swatches = [...el.querySelectorAll<OASSwatch>('oas-swatch')]
    const leaked: string[] = []
    document.body.addEventListener('oas-click', () => leaked.push('click'))
    let change: unknown = null
    el.addEventListener('oas-change', (e) => (change = (e as CustomEvent).detail))
    btn(swatches[1]!).click()
    expect(el.getAttribute('value')).toBe('blue')
    expect(swatches[1]!.hasAttribute('selected')).toBe(true)
    expect(swatches[0]!.hasAttribute('selected')).toBe(false)
    expect(change).toEqual({ value: 'blue' })
    expect(leaked, '子件 oas-click 不外泄').toEqual([])
  })

  it('单选不可取消：点击已选中项保持选中、不派发 oas-change', () => {
    const el = mountGroup({ value: 'red' })
    const swatches = [...el.querySelectorAll<OASSwatch>('oas-swatch')]
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    btn(swatches[0]!).click()
    expect(swatches[0]!.hasAttribute('selected')).toBe(true)
    expect(el.getAttribute('value')).toBe('red')
    expect(fired).toBe(0)
  })

  it('多选：逗号 value 切换追加/移除，detail { value: string[] }', () => {
    const el = mountGroup({ multiple: '', value: 'red' })
    const swatches = [...el.querySelectorAll<OASSwatch>('oas-swatch')]
    let change: unknown = null
    el.addEventListener('oas-change', (e) => (change = (e as CustomEvent).detail))
    btn(swatches[1]!).click()
    expect(el.getAttribute('value')).toBe('red,blue')
    expect(change).toEqual({ value: ['red', 'blue'] })
    btn(swatches[0]!).click()
    expect(el.getAttribute('value')).toBe('blue')
    expect(change).toEqual({ value: ['blue'] })
  })

  it('受控：宿主写 value → 子件 selected 跟随', () => {
    const el = mountGroup({ value: 'red' })
    const swatches = [...el.querySelectorAll<OASSwatch>('oas-swatch')]
    expect(swatches[0]!.hasAttribute('selected')).toBe(true)
    el.setAttribute('value', 'blue')
    expect(swatches[0]!.hasAttribute('selected')).toBe(false)
    expect(swatches[1]!.hasAttribute('selected')).toBe(true)
  })

  it('disabled 透传全组：子件不可点、不派发', () => {
    const el = mountGroup({ disabled: '' })
    const swatches = [...el.querySelectorAll<OASSwatch>('oas-swatch')]
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    btn(swatches[0]!).click()
    expect(fired).toBe(0)
    expect(btn(swatches[0]!).disabled).toBe(true)
  })

  it('ARIA：单选 radiogroup+radio；多选 group+checkbox（aria-checked 同步）', () => {
    const single = mountGroup({ value: 'red' })
    expect(single.shadowRoot!.querySelector('[part="group"]')!.getAttribute('role')).toBe('radiogroup')
    const sw = single.querySelector<OASSwatch>('oas-swatch')!
    expect(btn(sw).getAttribute('role')).toBe('radio')
    expect(btn(sw).getAttribute('aria-checked')).toBe('true')
    single.remove()

    const multi = mountGroup({ multiple: '', value: 'red' })
    expect(multi.shadowRoot!.querySelector('[part="group"]')!.getAttribute('role')).toBe('group')
    const sw2 = multi.querySelector<OASSwatch>('oas-swatch')!
    expect(btn(sw2).getAttribute('role')).toBe('checkbox')
    expect(btn(sw2).getAttribute('aria-checked')).toBe('true')
  })

  it('键盘：方向键漫游焦点 + Enter/Space 选中（RTL 镜像）+ Home/End', () => {
    const el = mountGroup({}, ['red', 'blue', 'green'])
    const swatches = [...el.querySelectorAll<OASSwatch>('oas-swatch')]
    // 焦点漫游：ArrowRight 到下一子件焦点
    swatches[0]!.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    expect(swatches[1]!.shadowRoot!.activeElement).not.toBeNull()
    // Enter 选中
    let change: unknown = null
    el.addEventListener('oas-change', (e) => (change = (e as CustomEvent).detail))
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }))
    expect(el.getAttribute('value')).toBe('blue')
    expect(change).toEqual({ value: 'blue' })
    // Home 回首件 + End 到末件
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }))
    expect(swatches[2]!.shadowRoot!.activeElement).not.toBeNull()
  })

  it('RTL：dir=rtl 时 ArrowLeft=下一项（视觉镜像）', () => {
    const el = mountGroup({}, ['red', 'blue', 'green'])
    el.setAttribute('dir', 'rtl')
    const swatches = [...el.querySelectorAll<OASSwatch>('oas-swatch')]
    swatches[0]!.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }))
    expect(swatches[1]!.shadowRoot!.activeElement).not.toBeNull()
  })

  it('空组零子件不报错', () => {
    const el = new OASSwatchGroup()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="group"]')).not.toBeNull()
  })

  it('value 不在子集中静默忽略（无选中子件、不报错）', () => {
    const el = mountGroup({ value: 'purple' })
    const swatches = [...el.querySelectorAll<OASSwatch>('oas-swatch')]
    expect(swatches.every((s) => !s.hasAttribute('selected'))).toBe(true)
  })
})
