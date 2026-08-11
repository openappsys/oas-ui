import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASSwitch } from './index.js'

function mount(attrs: Record<string, string> = {}): OASSwitch {
  const el = new OASSwitch()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function sw(el: OASSwitch): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button')!
}

describe('OASSwitch', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 button 且 role=switch，aria-checked 随 checked 同步', async () => {
    const el = mount({ checked: '' })
    const btn = sw(el)
    await Promise.resolve()
    expect(btn.tagName).toBe('BUTTON')
    expect(btn.getAttribute('role')).toBe('switch')
    expect(btn.getAttribute('aria-checked')).toBe('true')
  })

  it('点击切换状态并派发 oas-change', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    sw(el).click()
    expect(detail).toEqual({ checked: true })
    expect(el.hasAttribute('checked')).toBe(true)
    expect(sw(el).getAttribute('aria-checked')).toBe('true')
  })

  it('disabled 不可点击', () => {
    const el = mount({ disabled: '', checked: '' })
    sw(el).click()
    expect(sw(el).getAttribute('aria-checked')).toBe('true')
  })

  it('loading 显示 spinner 且禁止切换', () => {
    const el = mount({ loading: '', checked: '' })
    expect(sw(el).querySelector('.spinner')).not.toBeNull()
    sw(el).click()
    expect(sw(el).getAttribute('aria-checked')).toBe('true')
  })

  it('属性变化增量更新：改 checked 同步 aria-checked 且不重建引用', () => {
    const el = mount()
    const btn = sw(el)
    el.setAttribute('checked', '')
    expect(sw(el)).toBe(btn)
    expect(btn.getAttribute('aria-checked')).toBe('true')
  })

  it('checked-text/unchecked-text：初始关闭显示 unchecked-text，点击切换为 checked-text', () => {
    const el = mount({ 'checked-text': '开', 'unchecked-text': '关' })
    const label = sw(el).querySelector<HTMLElement>('.label')!
    expect(label.hidden).toBe(false)
    expect(label.textContent).toBe('关')
    sw(el).click()
    expect(label.textContent).toBe('开')
  })

  it('改 checked-text 增量更新文案且不重建引用', () => {
    const el = mount({ checked: '', 'checked-text': '开', 'unchecked-text': '关' })
    const label = sw(el).querySelector<HTMLElement>('.label')!
    expect(label.textContent).toBe('开')
    el.setAttribute('checked-text', 'YES')
    expect(label.textContent).toBe('YES')
    expect(sw(el).querySelector('.label')).toBe(label)
  })

  it('未设置文案时轨道内 label 隐藏', () => {
    const el = mount()
    const label = sw(el).querySelector<HTMLElement>('.label')!
    expect(label.hidden).toBe(true)
  })

  it('size 类名：small / 默认 medium / large', () => {
    const small = mount({ size: 'small' })
    expect(sw(small).className).toBe('small')
    const medium = mount()
    expect(sw(medium).className).toBe('medium')
    const large = mount({ size: 'large' })
    expect(sw(large).className).toBe('large')
  })

  it('size 五档：xs/small/medium/large/xl 均反映到 class', () => {
    for (const s of ['xs', 'small', 'medium', 'large', 'xl'] as const) {
      const el = mount({ size: s })
      expect(sw(el).className).toBe(s)
      el.remove()
    }
  })

  it('size 非法值回落 medium 且 dev 下 console.warn 一次（白名单修复）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ size: 'huge' })
    expect(sw(el).className).toBe('medium')
    expect(sw(el).classList.contains('huge')).toBe(false)
    el.setAttribute('size', 'huge')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    el.remove()
  })

  it('size=xs 且设置文案时文案放轨道外侧（outside-label），同 small 行为', () => {
    const el = mount({ size: 'xs', 'checked-text': '开', 'unchecked-text': '关' })
    const outside = el.shadowRoot!.querySelector<HTMLElement>('.outside-label')!
    expect(outside.hidden).toBe(false)
    expect(outside.textContent).toBe('关')
    expect(sw(el).querySelector<HTMLElement>('.label')!.hidden).toBe(true)
    expect(el.classList.contains('has-outside-label')).toBe(true)
    sw(el).click()
    expect(outside.textContent).toBe('开')
  })

  it('size=small 且设置文案时文案放轨道外侧（outside-label）', () => {
    const el = mount({ size: 'small', 'checked-text': '开', 'unchecked-text': '关' })
    const outside = el.shadowRoot!.querySelector<HTMLElement>('.outside-label')!
    expect(outside.hidden).toBe(false)
    expect(outside.textContent).toBe('关')
    expect(sw(el).querySelector<HTMLElement>('.label')!.hidden).toBe(true)
    expect(el.classList.contains('has-outside-label')).toBe(true)
    sw(el).click()
    expect(outside.textContent).toBe('开')
  })

  it('size=medium 时文案显示在轨道内而非外侧', () => {
    const el = mount({ size: 'medium', 'checked-text': '开', 'unchecked-text': '关' })
    const outside = el.shadowRoot!.querySelector<HTMLElement>('.outside-label')!
    const label = sw(el).querySelector<HTMLElement>('.label')!
    expect(label.hidden).toBe(false)
    expect(outside.hidden).toBe(true)
    expect(el.classList.contains('has-outside-label')).toBe(false)
  })

  it('color 内联样式：--oas-color-primary 覆盖，移除属性后清除', () => {
    const el = mount({ color: '#16a34a', checked: '' })
    expect(sw(el).style.getPropertyValue('--oas-color-primary')).toBe('#16a34a')
    el.removeAttribute('color')
    expect(sw(el).style.getPropertyValue('--oas-color-primary')).toBe('')
  })
})
