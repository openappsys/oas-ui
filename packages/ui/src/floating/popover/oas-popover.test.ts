import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASPopover } from './index.js'
import '../tooltip/index.js' // 副作用：确保 oas-tooltip 已注册（嵌套关闭断言用）

function mount(attrs: Record<string, string> = {}): OASPopover {
  const el = new OASPopover()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<button>触发</button>`
  document.body.appendChild(el)
  return el
}

function panelOf(el: OASPopover): HTMLElement {
  return el.shadowRoot!.querySelector('[part="panel"]')!
}

/** happy-dom 无布局引擎：stub 面板 getBoundingClientRect，让 computePosition 拿到固定尺寸 */
function stubPanelRect(p: HTMLElement, w: number, h: number): void {
  p.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      width: w,
      height: h,
      left: 0,
      top: 0,
      right: w,
      bottom: h,
      toJSON: () => ({}),
    }) as DOMRect
}

/** 固定视口尺寸（定位越界/翻转断言依赖确定性的 viewport） */
function setViewport(w: number, h: number): void {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true })
}

/** 组装嵌套浮层：父 popover 的 content 插槽内再放一个 popover 子层 */
function mountNested(): { parent: OASPopover; child: OASPopover } {
  const parent = mount({ title: '父' })
  const child = document.createElement('oas-popover') as OASPopover
  child.setAttribute('title', '子')
  child.innerHTML = '<button>子触发</button>'
  parent.appendChild(child)
  parent.setAttribute('open', '')
  child.setAttribute('open', '')
  return { parent, child }
}

describe('OASPopover', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('open 时显示面板，含标题与内容', async () => {
    const el = mount({ open: '', title: '标题', content: '内容区域' })
    await Promise.resolve()
    const panel = el.shadowRoot!.querySelector('[part="panel"]')!
    expect(panel).not.toBeNull()
    expect(panel.getAttribute('role')).toBe('dialog')
    expect(el.shadowRoot!.textContent).toContain('标题')
    expect(el.shadowRoot!.querySelector('[part="content"]')!.textContent).toContain('内容区域')
  })

  it('点击触发元素切换 open', async () => {
    const el = mount({ title: 'x' })
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.shadowRoot!.querySelector('[part="panel"]')!.getAttribute('aria-hidden')).toBe(
      'false',
    )
  })

  it('外部点击关闭', async () => {
    const el = mount({ open: '', title: 'x' })
    await Promise.resolve()
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.shadowRoot!.querySelector('[part="panel"]')!.getAttribute('aria-hidden')).toBe('true')
  })

  describe('嵌套浮层（nested）', () => {
    it('父关闭时嵌套子浮层一并关闭', () => {
      const { parent, child } = mountNested()
      expect(panelOf(child).getAttribute('aria-hidden')).toBe('false')
      parent.removeAttribute('open')
      expect(panelOf(child).getAttribute('aria-hidden')).toBe('true')
      expect(panelOf(parent).getAttribute('aria-hidden')).toBe('true')
    })

    it('父关闭时嵌套 tooltip 一并关闭', () => {
      const parent = mount({ title: '父' })
      const tip = document.createElement('oas-tooltip')
      tip.setAttribute('open', '')
      parent.appendChild(tip)
      parent.setAttribute('open', '')
      tip.setAttribute('open', '')
      const tipEl = tip.shadowRoot!.querySelector('[part="tip"]')!
      expect(tipEl.getAttribute('aria-hidden')).toBe('false')
      parent.removeAttribute('open')
      expect(tipEl.getAttribute('aria-hidden')).toBe('true')
    })

    it('Esc 一次只关闭最内层，逐层关闭', () => {
      const { parent, child } = mountNested()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      expect(panelOf(child).getAttribute('aria-hidden')).toBe('true')
      expect(panelOf(parent).getAttribute('aria-hidden')).toBe('false')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      expect(panelOf(parent).getAttribute('aria-hidden')).toBe('true')
    })

    it('父层 open 期间子层受控可独立关闭，父不受影响', () => {
      const { parent, child } = mountNested()
      child.removeAttribute('open')
      expect(panelOf(child).getAttribute('aria-hidden')).toBe('true')
      expect(panelOf(parent).getAttribute('aria-hidden')).toBe('false')
    })
  })

  describe('虚拟触发（virtual，同 tooltip）', () => {
    it('virtual 模式按 virtual-x/virtual-y 坐标定位（无锚点元素）', () => {
      const el = mount({
        open: '',
        virtual: '',
        'virtual-x': '100',
        'virtual-y': '80',
        placement: 'right',
      })
      const p = panelOf(el)
      expect(p.getAttribute('aria-hidden')).toBe('false')
      expect(p.getAttribute('data-placement')).toBe('right')
      expect(p.style.left).toBeTruthy()
      expect(p.style.top).toBeTruthy()
    })

    it('virtual-anchor：按选择器锚定元素定位', () => {
      const dot = document.createElement('div')
      dot.id = 'pop-dot-test'
      document.body.appendChild(dot)
      const el = mount({ open: '', virtual: '', 'virtual-anchor': '#pop-dot-test' })
      const p = panelOf(el)
      expect(p.getAttribute('aria-hidden')).toBe('false')
      expect(p.getAttribute('data-placement')).toBeTruthy()
      expect(p.style.left).toBeTruthy()
    })

    it('virtual 坐标精确定位：placement=right → left=x+8、top=y-h/2（不依赖真实布局）', () => {
      const el = mount({ virtual: '', 'virtual-x': '160', 'virtual-y': '90', placement: 'right' })
      const p = panelOf(el)
      // happy-dom 无布局引擎：stub 面板尺寸，computePosition 用该尺寸计算
      stubPanelRect(p, 200, 60)
      setViewport(1280, 800)
      el.setAttribute('open', '') // 打开瞬间读取 stub 尺寸完成定位
      expect(p.getAttribute('aria-hidden')).toBe('false')
      expect(p.getAttribute('data-placement')).toBe('right')
      expect(p.style.left).toBe('168px') // 160 + gap 8
      expect(p.style.top).toBe('60px') // 90 - 60/2
    })

    it('virtual 坐标更新（宿主移动鼠标）→ 面板重新定位', () => {
      const el = mount({ virtual: '', 'virtual-x': '100', 'virtual-y': '100', placement: 'top' })
      const p = panelOf(el)
      stubPanelRect(p, 200, 60)
      setViewport(1280, 800)
      el.setAttribute('open', '')
      el.setAttribute('virtual-x', '500')
      el.setAttribute('virtual-y', '300')
      expect(p.style.top).toBe('232px') // 300 - 60 - 8
      expect(p.style.left).toBe('400px') // 500 - 200/2
    })

    it('点位贴视口顶：placement=top 自动翻转到 bottom 且不越界', () => {
      const el = mount({ virtual: '', 'virtual-x': '300', 'virtual-y': '0', placement: 'top' })
      const p = panelOf(el)
      stubPanelRect(p, 200, 60)
      setViewport(1280, 800)
      el.setAttribute('open', '')
      expect(p.getAttribute('data-placement')).toBe('bottom')
      expect(p.style.top).toBe('8px')
      expect(p.style.left).toBe('200px') // 300 - 200/2
    })

    it('点位贴视口右缘：placement=right 自动翻转到 left 并避让不越界', () => {
      const el = mount({ virtual: '', 'virtual-x': '1260', 'virtual-y': '200', placement: 'right' })
      const p = panelOf(el)
      stubPanelRect(p, 200, 60)
      setViewport(1280, 800)
      el.setAttribute('open', '')
      expect(p.getAttribute('data-placement')).toBe('left')
      expect(p.style.left).toBe('1052px') // 1260 - 200 - 8
      expect(p.style.top).toBe('170px') // 200 - 30
      expect(parseFloat(p.style.left) + 200).toBeLessThanOrEqual(1280)
    })

    it('virtual 模式点击触发元素不切换显隐（宿主控制）', () => {
      const el = mount({ virtual: '' })
      ;(el.querySelector('button') as HTMLElement).click()
      expect(panelOf(el).getAttribute('aria-hidden')).toBe('true')
    })

    it('virtual 模式外部点击不关闭（宿主控制生命周期）', () => {
      const el = mount({ open: '', virtual: '' })
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(panelOf(el).getAttribute('aria-hidden')).toBe('false')
    })

    it('未设置坐标与锚点时打开不定位且不报错', () => {
      const el = mount({ open: '', virtual: '' })
      const p = panelOf(el)
      expect(p.getAttribute('aria-hidden')).toBe('false')
      expect(p.style.left).toBe('')
    })

    it('open 变化派发 oas-open-change（detail.open 布尔）', () => {
      const el = mount({ title: 'x' })
      const opened: boolean[] = []
      el.addEventListener('oas-open-change', (e) =>
        opened.push((e as CustomEvent<{ open: boolean }>).detail.open),
      )
      el.setAttribute('open', '')
      expect(opened).toEqual([true])
      el.removeAttribute('open')
      expect(opened).toEqual([true, false])
    })
  })

  describe('焦点管理', () => {
    it('focus-on-open：打开时焦点移入面板内可聚焦内容', () => {
      const el = mount({ title: 'x', 'focus-on-open': '' })
      const inner = document.createElement('button')
      inner.setAttribute('slot', 'content')
      inner.textContent = '面板按钮'
      el.appendChild(inner)
      el.setAttribute('open', '')
      expect(document.activeElement).toBe(inner)
    })

    it('Esc 关闭后焦点还原到触发元素', () => {
      const el = mount({ open: '', title: 'x' })
      const trigger = el.querySelector('button')!
      trigger.focus()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      expect(panelOf(el).getAttribute('aria-hidden')).toBe('true')
      expect(document.activeElement).toBe(trigger)
    })

    it('嵌套 Esc 关闭子层后焦点还原到子层触发元素', () => {
      const { child } = mountNested()
      const childTrigger = child.querySelector('button')!
      childTrigger.focus()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      expect(document.activeElement).toBe(childTrigger)
    })
  })
})
