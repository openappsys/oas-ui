import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASFloatButton } from './index.js'

function mount(attrs: Record<string, string> = {}, inner = ''): OASFloatButton {
  const el = new OASFloatButton()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = inner || `<span slot="icon">+</span>`
  document.body.appendChild(el)
  return el
}

function btn(el: OASFloatButton): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="btn"]')!
}

describe('OASFloatButton', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('渲染悬浮按钮', () => {
    const el = mount()
    expect(btn(el)).not.toBeNull()
  })

  it('点击派发 oas-click，detail 携带 originalEvent（文档契约）', () => {
    const el = mount()
    let detail: { originalEvent?: Event } | undefined
    el.addEventListener('oas-click', (e) => {
      detail = (e as CustomEvent).detail
    })
    btn(el).click()
    expect(detail).toBeTruthy()
    expect(detail!.originalEvent).toBeInstanceOf(MouseEvent)
  })

  it('badge 属性渲染角标', () => {
    const el = mount({ badge: '5' })
    expect(el.shadowRoot!.querySelector('[part="badge"]')!.textContent).toContain('5')
  })

  it('shape：默认 circle，square 同步到 host data-shape', () => {
    const el = mount()
    expect(el.getAttribute('data-shape')).toBe('circle')
    el.setAttribute('shape', 'square')
    expect(el.getAttribute('data-shape')).toBe('square')
  })

  it('type：默认 primary，default 切换 btn 类名', () => {
    const el = mount()
    expect(btn(el).classList.contains('primary')).toBe(true)
    el.setAttribute('type', 'default')
    expect(btn(el).classList.contains('default')).toBe(true)
    expect(btn(el).classList.contains('primary')).toBe(false)
  })

  it('扩展文字：默认插槽有文字时自动 extended 胶囊形态（label 可见）', () => {
    const el = mount({}, '新建')
    expect(btn(el).classList.contains('extended')).toBe(true)
    const label = el.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!
    expect(label.hidden).toBe(false)
  })

  it('仅图标（无默认插槽文字）不进入 extended，label 隐藏', () => {
    const el = mount()
    expect(btn(el).classList.contains('extended')).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.hidden).toBe(true)
  })

  it('动态增删文字：slotchange 后 extended 与 label 同步', async () => {
    const el = mount()
    expect(btn(el).classList.contains('extended')).toBe(false)
    const text = document.createTextNode('新建')
    el.appendChild(text)
    await new Promise((r) => setTimeout(r, 0))
    expect(btn(el).classList.contains('extended')).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.hidden).toBe(false)
    el.removeChild(text)
    await new Promise((r) => setTimeout(r, 0))
    expect(btn(el).classList.contains('extended')).toBe(false)
  })

  it('size：五档 xs/sm/md/lg/xl，默认 lg（data-size 同步）', () => {
    const el = mount()
    expect(el.getAttribute('data-size')).toBe('lg')
    for (const s of ['xs', 'sm', 'md', 'xl']) {
      el.setAttribute('size', s)
      expect(el.getAttribute('data-size')).toBe(s)
    }
  })

  it('size：非法值回落 lg 并 console.warn 告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ size: 'huge' })
    expect(el.getAttribute('data-size')).toBe('lg')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('非法 size'))
  })

  it('disabled：原生 disabled + aria-disabled，点击不派发 oas-click', () => {
    const el = mount({ disabled: '' })
    const b = btn(el) as HTMLButtonElement
    expect(b.disabled).toBe(true)
    expect(b.getAttribute('aria-disabled')).toBe('true')
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    b.click()
    expect(fired).toBe(0)
  })

  it('非 disabled 时无原生禁用与 aria-disabled', () => {
    const el = mount()
    const b = btn(el) as HTMLButtonElement
    expect(b.disabled).toBe(false)
    expect(b.hasAttribute('aria-disabled')).toBe(false)
  })

  it('href 渲染 a 元素并透传 target（原生链接语义）', () => {
    const el = mount({ href: 'https://example.com', target: '_blank' })
    const a = el.shadowRoot!.querySelector<HTMLAnchorElement>('a[part="btn"]')
    expect(a).not.toBeNull()
    expect(a!.getAttribute('href')).toBe('https://example.com')
    expect(a!.getAttribute('target')).toBe('_blank')
    expect(el.shadowRoot!.querySelector('button[part="btn"]')).toBeNull()
  })

  it('href + disabled 降级为 span（不可点击、aria-disabled）', () => {
    const el = mount({ href: 'https://example.com', disabled: '' })
    expect(el.shadowRoot!.querySelector('a[part="btn"]')).toBeNull()
    const span = el.shadowRoot!.querySelector<HTMLElement>('span[part="btn"]')
    expect(span).not.toBeNull()
    expect(span!.getAttribute('aria-disabled')).toBe('true')
  })

  it('href 增删触发 shadow 重建（button ↔ a 切换）', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('button[part="btn"]')).not.toBeNull()
    el.setAttribute('href', '#x')
    expect(el.shadowRoot!.querySelector('a[part="btn"]')).not.toBeNull()
    el.removeAttribute('href')
    expect(el.shadowRoot!.querySelector('button[part="btn"]')).not.toBeNull()
  })

  it('定位 CSS 变量开口：--oas-float-button-bottom/right 默认 space-6', () => {
    const el = mount()
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain('var(--oas-float-button-bottom, var(--oas-space-6))')
    expect(style).toContain('var(--oas-float-button-right, var(--oas-space-6))')
  })

  it('aria-label：纯图标用 locale 文案；有可见文字时让位（不覆盖）', () => {
    const el = mount()
    expect(btn(el).getAttribute('aria-label')).toBe('悬浮操作')
    const el2 = mount({}, '新建')
    expect(btn(el2).hasAttribute('aria-label')).toBe(false)
  })

  it('宿主显式 aria-label 优先', () => {
    const el = mount({}, '新建')
    el.setAttribute('aria-label', '自定义标签')
    expect(btn(el).getAttribute('aria-label')).toBe('自定义标签')
  })
})
