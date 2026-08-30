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

// ===== draggable 拖拽 + magnetic 磁吸 =====

/** 拖拽/点击判定阈值：位移 >4px 视为拖拽（与组件常量一致） */
const DRAG_THRESHOLD = 4

/** 向 shadow 内 .btn 派发 pointer 事件（与组件监听目标一致） */
function pointer(target: HTMLElement, type: string, x: number, y: number): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: 1,
      clientX: x,
      clientY: y,
      button: 0,
    }),
  )
}

describe('OASFloatButton draggable + magnetic', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('observedAttributes 声明 draggable / magnetic', () => {
    expect(OASFloatButton.observedAttributes).toContain('draggable')
    expect(OASFloatButton.observedAttributes).toContain('magnetic')
  })

  it('draggable：pointer 拖拽把位置写入 host 内联 left/top（fixed 定位系），清空 bottom/right', () => {
    const el = mount({ draggable: '' })
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 80,
      width: 48,
      height: 48,
    } as DOMRect)
    pointer(btn(el), 'pointerdown', 100, 80)
    pointer(btn(el), 'pointermove', 200, 150)
    expect(el.style.left).toBe('200px')
    expect(el.style.top).toBe('150px')
    expect(el.style.bottom).toBe('')
    expect(el.style.right).toBe('')
    pointer(btn(el), 'pointerup', 200, 150)
  })

  it('拖拽位移超阈值（>4px）：pointerup 后合成 click 被抑制，不派发 oas-click；下次真实点击恢复', () => {
    const el = mount({ draggable: '' })
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    pointer(btn(el), 'pointerdown', 100, 100)
    pointer(btn(el), 'pointermove', 200, 100) // dx=100 > 4
    pointer(btn(el), 'pointerup', 200, 100)
    // 浏览器在捕获目标上合成的 click → 被抑制
    btn(el).click()
    expect(fired).toBe(0)
    // 下一次真实点击恢复正常
    btn(el).click()
    expect(fired).toBe(1)
  })

  it('拖拽位移在阈值内（≤4px）视为点击：仍派发 oas-click', () => {
    const el = mount({ draggable: '' })
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    pointer(btn(el), 'pointerdown', 100, 100)
    pointer(btn(el), 'pointermove', 102, 101) // dx=2, dy=1 ≤ 4
    pointer(btn(el), 'pointerup', 102, 101)
    btn(el).click()
    expect(fired).toBe(1)
  })

  it('边界夹取：拖出视口回夹到边缘（left/top 不超视口）', () => {
    const el = mount({ draggable: '' })
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 900,
      top: 700,
      width: 48,
      height: 48,
    } as DOMRect)
    pointer(btn(el), 'pointerdown', 900, 700)
    pointer(btn(el), 'pointermove', 900 + 2000, 700 + 2000)
    expect(el.style.left).toBe(`${window.innerWidth}px`)
    expect(el.style.top).toBe(`${window.innerHeight}px`)
    pointer(btn(el), 'pointerup', 900 + 2000, 700 + 2000)
  })

  it('无 magnetic：松手保持拖拽位置（不吸附）', () => {
    const el = mount({ draggable: '' })
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 80,
      width: 48,
      height: 48,
    } as DOMRect)
    pointer(btn(el), 'pointerdown', 100, 80)
    pointer(btn(el), 'pointermove', 200, 120)
    pointer(btn(el), 'pointerup', 200, 120)
    expect(el.style.left).toBe('200px')
    expect(el.style.top).toBe('120px')
  })

  it('magnetic="x"：松手吸附到最近的左右边缘（左近贴左、右近贴右）', () => {
    // 右近：left=900 距右 124 < 距左 900 → 贴右
    const el = mount({ draggable: '', magnetic: 'x' })
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 900,
      top: 80,
      width: 48,
      height: 48,
    } as DOMRect)
    pointer(btn(el), 'pointerdown', 900, 80)
    pointer(btn(el), 'pointermove', 1000, 120)
    pointer(btn(el), 'pointerup', 1000, 120)
    expect(el.style.left).toBe(`${window.innerWidth}px`)
    // 左近：left=100 距左 100 < 距右 924 → 贴左
    const el2 = mount({ draggable: '', magnetic: 'x' })
    vi.spyOn(el2, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 80,
      width: 48,
      height: 48,
    } as DOMRect)
    pointer(btn(el2), 'pointerdown', 100, 80)
    pointer(btn(el2), 'pointermove', 200, 120)
    pointer(btn(el2), 'pointerup', 200, 120)
    expect(el2.style.left).toBe('0px')
  })

  it('magnetic="y"：松手吸附到最近的上下边缘', () => {
    // 下近：top=730 距下 38 < 距上 730 → 贴下
    const el = mount({ draggable: '', magnetic: 'y' })
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 700,
      width: 48,
      height: 48,
    } as DOMRect)
    pointer(btn(el), 'pointerdown', 100, 700)
    pointer(btn(el), 'pointermove', 150, 730)
    pointer(btn(el), 'pointerup', 150, 730)
    expect(el.style.top).toBe(`${window.innerHeight}px`)
  })

  it('magnetic 吸附带过渡：拖拽中 transition 置 none（跟手），吸附时恢复 left/top 过渡', () => {
    const el = mount({ draggable: '', magnetic: 'x' })
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 80,
      width: 48,
      height: 48,
    } as DOMRect)
    pointer(btn(el), 'pointerdown', 100, 80)
    expect(el.style.transition).toBe('none') // 拖拽中禁止过渡（跟手）
    pointer(btn(el), 'pointermove', 200, 120)
    pointer(btn(el), 'pointerup', 200, 120) // 吸附：恢复过渡
    expect(el.style.transition).toContain('left')
    expect(el.style.transition).toContain('var(--oas-transition-base)')
  })

  it('reduced-motion：磁吸位置直切（无过渡）', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      () => ({ matches: true }) as MediaQueryList,
    )
    const el = mount({ draggable: '', magnetic: 'x' })
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 80,
      width: 48,
      height: 48,
    } as DOMRect)
    pointer(btn(el), 'pointerdown', 100, 80)
    pointer(btn(el), 'pointermove', 200, 120)
    pointer(btn(el), 'pointerup', 200, 120)
    expect(el.style.left).toBe('0px') // 吸附到位
    expect(el.style.transition).toBe('none') // 直切无过渡
  })

  it('非 draggable：pointer 拖拽零行为变化（不写位置、点击照常派发）', () => {
    const el = mount()
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    pointer(btn(el), 'pointerdown', 100, 100)
    pointer(btn(el), 'pointermove', 300, 300)
    pointer(btn(el), 'pointerup', 300, 300)
    expect(el.style.left).toBe('')
    expect(el.style.top).toBe('')
    expect(el.style.bottom).toBe('')
    btn(el).click()
    expect(fired).toBe(1)
  })

  it('禁用态不可拖：pointer 拖拽不移动位置', () => {
    const el = mount({ draggable: '', disabled: '' })
    pointer(btn(el), 'pointerdown', 100, 100)
    pointer(btn(el), 'pointermove', 300, 300)
    pointer(btn(el), 'pointerup', 300, 300)
    expect(el.style.left).toBe('')
    expect(el.style.top).toBe('')
  })

  it('draggable 时 touch-action:none（拖拽不触发手势滚动）；非 draggable 时为空（零回归）', () => {
    const el = mount({ draggable: '' })
    expect(el.style.touchAction).toBe('none')
    el.removeAttribute('draggable')
    expect(el.style.touchAction).toBe('')
  })
})
