import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale, registerLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import { OASAttachmentGroup } from './index.js'

function mount(inner = ''): OASAttachmentGroup {
  const el = new OASAttachmentGroup()
  el.innerHTML = inner
  document.body.appendChild(el)
  return el
}

describe('OASAttachmentGroup', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 group 骨架：role=group + tabindex=0 + locale 可读名称', () => {
    const el = mount('<oas-attachment name="a.pdf"></oas-attachment>')
    const g = el.shadowRoot!.querySelector('[part="group"]')!
    expect(g.getAttribute('role')).toBe('group')
    expect(g.getAttribute('tabindex')).toBe('0')
    expect(g.getAttribute('aria-label')).toBe('附件组')
  })

  it('locale 切换刷新可读名称', () => {
    const el = mount()
    registerLocale(en)
    setLocale('en')
    expect(el.shadowRoot!.querySelector('[part="group"]')!.getAttribute('aria-label')).toBe('Attachments')
  })

  it('横向吸附与边缘渐隐纯 CSS（无硬编码色值）', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('scroll-snap-type')
    expect(css).toContain('scroll-snap-align')
    expect(css).toContain('mask-image')
    expect(css).toContain(':host([data-scrollable~="start"][data-scrollable~="end"])')
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/rgba?\(/)
  })

  it('data-scrollable 反射：无可滚为空；单侧/双侧可滚正确', () => {
    const el = mount()
    const g = el.shadowRoot!.querySelector<HTMLElement>('[part="group"]')!
    const setGeo = (o: Partial<Record<'scrollWidth' | 'clientWidth' | 'scrollLeft', number>>) => {
      for (const [k, v] of Object.entries(o)) Object.defineProperty(g, k, { configurable: true, value: v })
    }
    setGeo({ scrollWidth: 100, clientWidth: 100, scrollLeft: 0 })
    g.dispatchEvent(new Event('scroll'))
    expect(el.getAttribute('data-scrollable')).toBe('')

    setGeo({ scrollWidth: 300, clientWidth: 100, scrollLeft: 0 })
    g.dispatchEvent(new Event('scroll'))
    expect(el.getAttribute('data-scrollable')).toBe('end')

    setGeo({ scrollLeft: 100 })
    g.dispatchEvent(new Event('scroll'))
    expect(el.getAttribute('data-scrollable')).toBe('start end')

    setGeo({ scrollLeft: 200 })
    g.dispatchEvent(new Event('scroll'))
    expect(el.getAttribute('data-scrollable')).toBe('start')
  })

  it('默认插槽直通子项', async () => {
    const el = mount()
    const child = document.createElement('oas-attachment')
    el.appendChild(child)
    await new Promise((r) => setTimeout(r, 0))
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot:not([name])')!
    expect(slot.assignedNodes()).toContain(child)
  })

  it('无公开数据属性（纯容器；仅观察全局 dir 以驱动 RTL）', () => {
    expect(OASAttachmentGroup.observedAttributes).toEqual(['dir'])
  })
})
