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

/** 通用 stub：任意元素固定矩形（锚点用） */
function stubRect(
  el: HTMLElement,
  r: { left: number; top: number; width: number; height: number },
): void {
  el.getBoundingClientRect = () =>
    ({
      x: r.left,
      y: r.top,
      width: r.width,
      height: r.height,
      left: r.left,
      top: r.top,
      right: r.left + r.width,
      bottom: r.top + r.height,
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

  // —— 箭头（arrow）——

  it('箭头元素存在：part=arrow + data-popper-arrow + aria-hidden，不破坏面板内容', () => {
    const el = mount({ open: '', title: '标题', content: '内容区' })
    const p = panelOf(el)
    const arrow = p.querySelector<HTMLElement>('[data-popper-arrow]')
    expect(arrow).not.toBeNull()
    expect(arrow!.getAttribute('part')).toBe('arrow')
    expect(arrow!.getAttribute('aria-hidden')).toBe('true')
    expect(p.querySelector('[part="title"]')!.textContent).toBe('标题')
    expect(p.querySelector('[part="content"]')!.textContent).toBe('内容区')
  })

  it('virtual 各 placement：箭头随面板就位在对应边上（尖朝锚点），两条外露边带边框色', () => {
    // computePosition 语义：placement=bottom 面板在锚点下方 → 箭头悬顶边(top:-4px、尖朝上)；
    //   top → 底边(bottom:-4px)；left → 右边(right:-4px)；right → 左边(left:-4px)。
    // 旋转 45° 后 border-top/right/bottom/left 依次对应菱形右上/右下/左下/左上边，
    //   「汇于尖端」的两条外露边需带 1px 边框色与面板描边衔接。
    const cases = {
      bottom: { edge: 'top', borders: ['border-top-width', 'border-left-width'] },
      top: { edge: 'bottom', borders: ['border-right-width', 'border-bottom-width'] },
      left: { edge: 'right', borders: ['border-top-width', 'border-right-width'] },
      right: { edge: 'left', borders: ['border-left-width', 'border-bottom-width'] },
    } as const
    for (const p of ['top', 'bottom', 'left', 'right'] as const) {
      const el = mount({
        open: '',
        virtual: '',
        'virtual-x': '400',
        'virtual-y': '300',
        placement: p,
      })
      const panel = panelOf(el)
      const arrow = panel.querySelector<HTMLElement>('[data-popper-arrow]')!
      expect(panel.getAttribute('data-placement')).toBe(p)
      expect(arrow).not.toBeNull()
      const cs = window.getComputedStyle(arrow)
      const c = cases[p]
      expect(cs.getPropertyValue(c.edge), `placement=${p} 箭头应落在面板${c.edge}边`).toBe('-4px')
      // happy-dom 不解析 var() 颜色的 border 声明（getComputedStyle 返回空串），
      // 边框对改由 shadow <style> 规则文本锁定——回归点：left/right 曾把外露边框对写反。
      const styleText = el.shadowRoot!.querySelector('style')!.textContent!
      const block = styleText.split(`.panel[data-placement='${p}'] .arrow {`)[1]!.split('}')[0]!
      for (const prop of ['top', 'right', 'bottom', 'left']) {
        const expectBorder = (c.borders as readonly string[]).includes(`border-${prop}-width`)
        const hasBorder = block.includes(`border-${prop}: 1px solid var(--oas-color-border)`)
        expect(
          hasBorder,
          `placement=${p} border-${prop} 应${expectBorder ? '' : '不'}出现在箭头规则中`,
        ).toBe(expectBorder)
      }
    }
  })

  // —— 箭头显隐（arrow，默认 true）——

  it('arrow 默认 true：箭头可见（hidden=false）', () => {
    const el = mount({ open: '', title: 'x' })
    const arrow = panelOf(el).querySelector<HTMLElement>('[data-popper-arrow]')!
    expect(arrow.hidden).toBe(false)
    expect(arrow.hasAttribute('hidden')).toBe(false)
  })

  it('arrow="false"：隐藏箭头（hidden=true），元素与 part 保留', () => {
    const el = mount({ open: '', title: 'x', arrow: 'false' })
    const arrow = panelOf(el).querySelector<HTMLElement>('[data-popper-arrow]')!
    expect(arrow).not.toBeNull()
    expect(arrow.getAttribute('part')).toBe('arrow')
    expect(arrow.hidden).toBe(true)
  })

  it('arrow 动态切换：arrow="false" ↔ 移除 → hidden 同步', () => {
    const el = mount({ open: '', title: 'x' })
    const arrow = panelOf(el).querySelector<HTMLElement>('[data-popper-arrow]')!
    el.setAttribute('arrow', 'false')
    expect(arrow.hidden).toBe(true)
    el.removeAttribute('arrow')
    expect(arrow.hidden).toBe(false)
  })

  // —— 箭头指向锚点中心（arrow-point-at-center，默认 false）——

  it('arrow-point-at-center：面板被视口边缘避让偏移时，箭头仍指向锚点中心（定位差异）', () => {
    const el = mount({ open: '', placement: 'bottom' })
    const p = panelOf(el)
    stubPanelRect(p, 240, 60)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 12, top: 300, width: 64, height: 32 }) // 锚点中心 X = 44
    setViewport(1280, 800)
    el.setAttribute('content', 'x') // 触发重定位（stub 尺寸生效）
    // 面板被 clamp 到视口左缘：left = max(4, 44-120) = 4 → 面板中心 124 ≠ 锚点中心 44
    expect(p.style.left).toBe('4px')
    const arrow = p.querySelector<HTMLElement>('[data-popper-arrow]')!
    // 默认（边缘对齐）：无内联偏移，箭头随面板居中
    expect(arrow.style.left).toBe('')
    // 开启 point-at-center：箭头指向锚点中心（面板局部 X = 44 - 4 = 40 → left = 36px）
    el.setAttribute('arrow-point-at-center', '')
    expect(arrow.style.left).toBe('36px')
    // 关闭后恢复 CSS 居中
    el.removeAttribute('arrow-point-at-center')
    expect(arrow.style.left).toBe('')
  })

  // —— 视口自动调整（auto-adjust-overflow，默认 true）——

  it('auto-adjust-overflow 默认 true：空间不足自动翻转', () => {
    const el = mount({ open: '', placement: 'bottom' })
    const p = panelOf(el)
    stubPanelRect(p, 240, 60)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 200, top: 760, width: 64, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    expect(p.getAttribute('data-placement')).toBe('top')
  })

  it('auto-adjust-overflow="false"：空间不足不翻转，保持声明 placement', () => {
    const el = mount({ open: '', placement: 'bottom', 'auto-adjust-overflow': 'false' })
    const p = panelOf(el)
    stubPanelRect(p, 240, 60)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 200, top: 760, width: 64, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    expect(p.getAttribute('data-placement')).toBe('bottom')
    expect(p.style.top).toBe('800px') // 792 + 8，不避让视口底缘
  })
})
