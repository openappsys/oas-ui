import { describe, it, expect, beforeEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTrafficLights } from './index.js'

function mount(attrs: Record<string, string> = {}): OASTrafficLights {
  const el = new OASTrafficLights()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function dots(el: OASTrafficLights): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.dot')]
}

describe('OASTrafficLights', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('渲染三点（close/minimize/maximize，macOS 顺序）+ 组名与 aria-label', () => {
    const el = mount()
    const d = dots(el)
    expect(d.map((x) => x.dataset.action)).toEqual(['close', 'minimize', 'maximize'])
    expect(d[0]!.getAttribute('aria-label')).toBe('关闭')
    expect(d[1]!.getAttribute('aria-label')).toBe('最小化')
    expect(d[2]!.getAttribute('aria-label')).toBe('最大化')
    expect(el.shadowRoot!.querySelector('[part="group"]')!.getAttribute('aria-label')).toBe('窗口控制')
  })

  it('点击派发 oas-window-action（detail { action }，与 window-actions 同契约）', () => {
    const el = mount()
    const evts: Array<{ action: string }> = []
    el.addEventListener('oas-window-action', (e) => evts.push((e as CustomEvent).detail))
    dots(el)[0]!.click()
    dots(el)[2]!.click()
    expect(evts).toEqual([{ action: 'close' }, { action: 'maximize' }])
  })

  it('disabled：不派发事件，且三点原生 disabled 置位', () => {
    const el = mount({ disabled: '' })
    let n = 0
    el.addEventListener('oas-window-action', () => n++)
    dots(el)[0]!.click()
    expect(n).toBe(0)
    expect(
      dots(el).every((b) => b.disabled),
      '三点原生 disabled（键盘焦点排除 + not-allowed）',
    ).toBe(true)
    el.removeAttribute('disabled')
    expect(
      dots(el).some((b) => b.disabled),
      '移除后恢复可点',
    ).toBe(false)
  })

  it('dir=rtl：data-rtl 反射（顺序镜像）', () => {
    const el = mount({ dir: 'rtl' })
    expect(el.hasAttribute('data-rtl')).toBe(true)
  })

  it('拖动区自防御：.dot 声明 -webkit-app-region: no-drag（置于 drag titlebar 不被拖动吞点击）', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('style')!.textContent).toContain('-webkit-app-region: no-drag')
  })

  it('disabled 悬停不显符号（.dot:not(:disabled) 守卫）', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('style')!.textContent).toContain(':not(:disabled)')
  })

  it('maximize 符号为两枚外向实心三角（回归：曾误写共享中心顶点的双折线，渲染成与 close 相同的 ×）', () => {
    const el = mount()
    const maxPath = el.shadowRoot!.querySelector('.dot[data-action="maximize"] svg path')!
    const d = maxPath.getAttribute('d') ?? ''
    // 两条闭合子路径（z×2）+ 实心填充 = 外向三角；旧 bug 是描边折线（无 z、无 fill），会渲染成 ×
    expect((d.match(/z/gi) ?? []).length, '两枚闭合三角子路径').toBe(2)
    expect(maxPath.getAttribute('fill'), '实心 currentColor（非描边折线）').toBe('currentColor')
    // 与 close 的 × 形状不同（两者的 d 不应相同）
    const closePath = el.shadowRoot!.querySelector('.dot[data-action="close"] svg path')!
    expect(d).not.toBe(closePath.getAttribute('d'))
  })
})
