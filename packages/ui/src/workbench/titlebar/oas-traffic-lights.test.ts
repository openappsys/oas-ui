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
    expect(el.shadowRoot!.querySelector('[part="group"]')!.getAttribute('aria-label')).toBe('标题栏')
  })

  it('点击派发 oas-window-action（detail { action }，与 window-actions 同契约）', () => {
    const el = mount()
    const evts: Array<{ action: string }> = []
    el.addEventListener('oas-window-action', (e) => evts.push((e as CustomEvent).detail))
    dots(el)[0]!.click()
    dots(el)[2]!.click()
    expect(evts).toEqual([{ action: 'close' }, { action: 'maximize' }])
  })

  it('disabled：不派发事件', () => {
    const el = mount({ disabled: '' })
    let n = 0
    el.addEventListener('oas-window-action', () => n++)
    dots(el)[0]!.click()
    expect(n).toBe(0)
  })

  it('dir=rtl：data-rtl 反射（顺序镜像）', () => {
    const el = mount({ dir: 'rtl' })
    expect(el.hasAttribute('data-rtl')).toBe(true)
  })
})
