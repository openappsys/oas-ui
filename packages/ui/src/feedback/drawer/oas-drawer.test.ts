import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASDrawer } from './index.js'

function mount(attrs: Record<string, string> = {}): OASDrawer {
  const el = new OASDrawer()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<p>抽屉内容</p>`
  document.body.appendChild(el)
  return el
}

describe('OASDrawer', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('visible 时渲染面板，placement 默认 right', async () => {
    const el = mount({ visible: '', title: '筛选' })
    await Promise.resolve()
    const panel = el.shadowRoot!.querySelector('[part="panel"]')!
    expect(panel).not.toBeNull()
    expect(panel.getAttribute('role')).toBe('dialog')
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('筛选')
  })

  it('placement 属性控制方向', async () => {
    const el = mount({ visible: '', placement: 'left' })
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('[part="panel"]')!.getAttribute('data-placement')).toBe(
      'left',
    )
  })

  it('关闭按钮触发 oas-close', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let close = 0
    el.addEventListener('oas-close', () => close++)
    ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
    expect(close).toBe(1)
  })

  it('visible 缺省时隐藏', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="panel"]')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('点击 ✕ 移除 visible 并派发 oas-close', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let close = 0
    el.addEventListener('oas-close', () => close++)
    ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
    expect(el.hasAttribute('visible')).toBe(false)
    expect(close).toBe(1)
  })

  it('Esc 移除 visible', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('点击遮罩移除 visible', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    el.shadowRoot!.querySelector('.mask')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('点击取消移除 visible', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    ;(el.shadowRoot!.querySelector('[part="cancel"]') as HTMLElement).click()
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('点击确定移除 visible 并派发 oas-ok', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect(el.hasAttribute('visible')).toBe(false)
    expect(ok).toBe(1)
  })

  it('width 属性控制面板宽度（px 与百分比，动态切换）', async () => {
    const el = mount({ visible: '', width: '640px' })
    await Promise.resolve()
    const panel = el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
    expect(panel.style.width).toBe('640px')
    el.setAttribute('width', '60%')
    expect(panel.style.width).toBe('60%')
    el.removeAttribute('width')
    expect(panel.style.width).toBe('')
  })

  it('size 档位映射预设宽度（small/medium/large）', async () => {
    const cases: Array<[string, string]> = [
      ['small', '256px'],
      ['medium', '378px'],
      ['large', '736px'],
    ]
    for (const [size, width] of cases) {
      const el = mount({ visible: '', size })
      await Promise.resolve()
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!.style.width).toBe(width)
      el.remove()
    }
  })

  it('size 支持具体值（纯数字视为 px，长度/百分比原样生效）', async () => {
    const el = mount({ visible: '', size: '512' })
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!.style.width).toBe('512px')
    el.setAttribute('size', '40%')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!.style.width).toBe('40%')
  })

  it('width 优先级高于 size', async () => {
    const el = mount({ visible: '', size: 'small', width: '400px' })
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!.style.width).toBe('400px')
  })

  it('未设置 width/size 时回退 CSS 默认（无内联宽度）', () => {
    const el = mount({ visible: '' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!.style.width).toBe('')
  })

  describe('title 吸收（消除宿主原生 tooltip）', () => {
    it('挂载后宿主不再残留 title 属性，标题照常渲染进标题区', () => {
      const el = mount({ visible: '', title: '筛选' })
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('筛选')
    })

    it('吸收触发的二次 update 幂等（标题不丢失）', () => {
      const el = mount({ visible: '', title: '筛选' })
      el.setAttribute('placement', 'left') // 触发二次 update
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('筛选')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('运行时改 title 属性：新值吸收渲染，宿主仍无残留', () => {
      const el = mount({ visible: '', title: '旧标题' })
      el.setAttribute('title', '新筛选')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('新筛选')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title="" 清空标题（属性在场=宿主意图）', () => {
      const el = mount({ visible: '', title: '筛选' })
      el.setAttribute('title', '')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('水合恢复：快照标题区有文本时恢复缓存，水合后标题不丢失', () => {
      const ref = new OASDrawer()
      ref.setAttribute('title', '水合标题')
      document.body.appendChild(ref)
      const snap = ref.shadowRoot!.innerHTML
      ref.remove()

      const el = new OASDrawer()
      el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-drawer" data-oas-ssr-v="1">${snap}`
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('水合标题')
      expect(el.hasAttribute('title')).toBe(false)
      el.remove()
    })
  })

  describe('title 双通道（slot 富内容覆盖属性文本）', () => {
    it('slot 有内容时覆盖属性文本', () => {
      const el = new OASDrawer()
      el.setAttribute('visible', '')
      el.setAttribute('title', '属性标题')
      el.innerHTML = '<span slot="title">插槽标题</span><p>抽屉内容</p>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      // 宿主 title 仍被吸收（吸收状态机不变）
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('仅 slot 无属性：标题区渲染 slot 内容且不隐藏', () => {
      const el = new OASDrawer()
      el.setAttribute('visible', '')
      el.innerHTML = '<span slot="title">插槽标题</span><p>抽屉内容</p>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('双空（无 title 无 slot）：标题区不渲染文本（兜底为空、不隐藏）', () => {
      const el = new OASDrawer()
      el.setAttribute('visible', '')
      el.innerHTML = '<p>抽屉内容</p>'
      document.body.appendChild(el)
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('动态移除 slot 内容后回落属性文本', async () => {
      const el = new OASDrawer()
      el.setAttribute('visible', '')
      el.setAttribute('title', '属性标题')
      el.innerHTML = '<span slot="title">插槽标题</span>'
      document.body.appendChild(el)
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(true)
      const node = el.querySelector('span[slot="title"]')!
      el.removeChild(node)
      await new Promise((r) => setTimeout(r, 0))
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('属性标题')
    })
  })
})
