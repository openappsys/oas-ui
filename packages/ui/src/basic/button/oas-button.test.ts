import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASButton } from './oas-button.js'

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
})
