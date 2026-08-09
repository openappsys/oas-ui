import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASButton } from './index.js'

function mount(attrs: Record<string, string> = {}, slot = '按钮'): OASButton {
  const el = new OASButton()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function shadowBtn(el: OASButton): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button')!
}

async function flush(): Promise<void> {
  await Promise.resolve()
}

describe('OASButton', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染默认按钮：类型 default、尺寸 medium、含 slot 文本', async () => {
    const el = mount({}, '保存')
    const btn = shadowBtn(el)
    await flush()
    expect(btn.classList.contains('default')).toBe(true)
    expect(btn.classList.contains('medium')).toBe(true)
    expect(el.textContent).toContain('保存')
    expect(btn.querySelector('slot')).not.toBeNull()
    expect(btn.disabled).toBe(false)
  })

  it('属性映射：type/size 反映到 class', () => {
    const el = mount({ type: 'primary', size: 'large' })
    const btn = shadowBtn(el)
    expect(btn.classList.contains('primary')).toBe(true)
    expect(btn.classList.contains('large')).toBe(true)
  })

  it('disabled 属性使原生按钮禁用', () => {
    const el = mount({ disabled: '' })
    expect(shadowBtn(el).disabled).toBe(true)
  })

  it('loading 态禁用点击并设 aria-busy', () => {
    const el = mount({ loading: '' })
    const btn = shadowBtn(el)
    expect(btn.disabled).toBe(true)
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect(btn.querySelector('.spinner')).not.toBeNull()
  })

  it('点击派发 oas-click 事件（bubbles + composed）', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-click', (e) => {
      detail = (e as CustomEvent).detail
    })
    shadowBtn(el).click()
    expect(detail).toMatchObject({ originalEvent: expect.any(MouseEvent) })
  })

  it('disabled/loading 时点击不派发 oas-click', () => {
    const el = mount({ disabled: '' })
    let fired = false
    el.addEventListener('oas-click', () => (fired = true))
    shadowBtn(el).click()
    expect(fired).toBe(false)
  })

  it('attributeChangedCallback 响应属性变化重新渲染', () => {
    const el = mount()
    el.setAttribute('type', 'danger')
    expect(shadowBtn(el).classList.contains('danger')).toBe(true)
  })

  it('属性变化不重建内部 DOM（增量更新，保持元素引用）', () => {
    const el = mount()
    const before = shadowBtn(el)
    el.setAttribute('type', 'primary')
    el.setAttribute('loading', '')
    expect(shadowBtn(el)).toBe(before)
    expect(before.classList.contains('primary')).toBe(true)
    expect(before.disabled).toBe(true)
    expect(before.getAttribute('aria-busy')).toBe('true')
  })

  it('icon 渲染：按钮内出现 iconRegistry 内联 SVG，带 has-icon 类', () => {
    const el = mount({ icon: 'search' }, '搜索')
    const btn = shadowBtn(el)
    const iconEl = btn.querySelector<HTMLElement>('.icon')
    expect(iconEl).not.toBeNull()
    expect(iconEl!.hidden).toBe(false)
    expect(iconEl!.querySelector('svg')).not.toBeNull()
    expect(btn.classList.contains('has-icon')).toBe(true)
  })

  it('纯图标按钮：等宽 icon-only 类 + aria-label 兜底（取图标名）', () => {
    const el = mount({ icon: 'search' }, '')
    const btn = shadowBtn(el)
    expect(btn.classList.contains('icon-only')).toBe(true)
    expect(btn.getAttribute('aria-label')).toBe('search')
  })

  it('有文字时不再判为纯图标，aria-label 兜底移除', () => {
    const el = mount({ icon: 'check' }, '确认')
    const btn = shadowBtn(el)
    expect(btn.classList.contains('icon-only')).toBe(false)
    expect(btn.hasAttribute('aria-label')).toBe(false)
  })

  it('宿主 aria-label 同步到内部 button', () => {
    const el = mount({ icon: 'close', 'aria-label': '关闭' })
    expect(shadowBtn(el).getAttribute('aria-label')).toBe('关闭')
  })

  it('block 宽度：button 带 block 类，host 声明块级布局', () => {
    const el = mount({ block: '' })
    const btn = shadowBtn(el)
    expect(btn.classList.contains('block')).toBe(true)
    expect(el.hasAttribute('block')).toBe(true)
  })

  it('round 类名：button 带 round 类', () => {
    const el = mount({ round: '' })
    expect(shadowBtn(el).classList.contains('round')).toBe(true)
  })

  it('ghost 类名：button 带 ghost 类', () => {
    const el = mount({ ghost: '' })
    expect(shadowBtn(el).classList.contains('ghost')).toBe(true)
  })
})
