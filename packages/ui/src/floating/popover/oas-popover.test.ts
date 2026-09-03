import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASPopover } from './index.js'
import '../tooltip/index.js' // 副作用：确保 oas-tooltip 已注册（嵌套关闭断言用）

/** 本测试文件内所有 mount 的元素（happy-dom 的 innerHTML 清空不触发 disconnectedCallback，
 *  模块级状态——modal 滚动锁计数 / Esc 层栈——必须靠显式 remove() 复位，见 unmountAll） */
const mounted: OASPopover[] = []

function mount(attrs: Record<string, string> = {}): OASPopover {
  const el = new OASPopover()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<button>触发</button>`
  document.body.appendChild(el)
  mounted.push(el)
  return el
}

/** 显式移除全部挂载元素（remove 触发 disconnectedCallback → 模块级监听/计数复位，无跨测试泄漏；
 *  happy-dom 的 isConnected getter 在 afterEach 时机不可靠，remove() 对已 detach 元素本就是 no-op） */
function unmountAll(): void {
  while (mounted.length) {
    const el = mounted.pop()
    if (el) el.remove()
  }
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

/** 模拟页面纵向滚动（scrollY 变化——滞留 scroll 事件防御按 scrollY 比对，真实滚动必然变值） */
function setScrollY(y: number): void {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
}

// 文件级复位：scrollY stub 跨测试不残留（滞留 scroll 守卫按「打开时 scrollY」比对）
beforeEach(() => setScrollY(0))

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

  afterEach(() => unmountAll())

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

  it('外部点击关闭（退场动画结束后隐藏）', async () => {
    const el = mount({ open: '', title: 'x' })
    await Promise.resolve()
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(false)
    await sleep(220) // 退场动画（fade/scale）结束后才落 aria-hidden
    expect(el.shadowRoot!.querySelector('[part="panel"]')!.getAttribute('aria-hidden')).toBe('true')
  })

  describe('嵌套浮层（nested）', () => {
    it('父关闭时嵌套子浮层一并关闭（退场动画结束后双双隐藏）', async () => {
      const { parent, child } = mountNested()
      expect(panelOf(child).getAttribute('aria-hidden')).toBe('false')
      parent.removeAttribute('open')
      await sleep(220)
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

    it('Esc 一次只关闭最内层，逐层关闭', async () => {
      const { parent, child } = mountNested()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await sleep(220) // 子层退场动画结束
      expect(panelOf(child).getAttribute('aria-hidden')).toBe('true')
      expect(panelOf(parent).getAttribute('aria-hidden')).toBe('false')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await sleep(220) // 父层退场动画结束
      expect(panelOf(parent).getAttribute('aria-hidden')).toBe('true')
    })

    it('父层 open 期间子层受控可独立关闭，父不受影响', async () => {
      const { parent, child } = mountNested()
      child.removeAttribute('open')
      await sleep(220)
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

    it('Esc 关闭后焦点还原到触发元素', async () => {
      const el = mount({ open: '', title: 'x' })
      const trigger = el.querySelector('button')!
      trigger.focus()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await sleep(220) // 退场动画结束才隐藏，焦点还原立即发生
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
      expect(cs.getPropertyValue(c.edge), `placement=${p} 箭头应落在面板${c.edge}边`).toBe('-6px')
      // happy-dom 不解析 var() 颜色的 border 声明（getComputedStyle 返回空串），
      // 边框对改由 shadow <style> 规则文本锁定——回归点：left/right 曾把外露边框对写反。
      // 12 向 placement（bottom-start 等）使 data-placement 带对齐后缀，箭头落边规则用前缀匹配；
      // 边框色走 --pop-border（.panel 上定义的 CSS 变量，颜色变体只覆写该变量）
      const styleText = el.shadowRoot!.querySelector('style')!.textContent!
      const block = styleText.split(`.panel[data-placement^='${p}'] .arrow {`)[1]!.split('}')[0]!
      for (const prop of ['top', 'right', 'bottom', 'left']) {
        const expectBorder = (c.borders as readonly string[]).includes(`border-${prop}-width`)
        const hasBorder = block.includes(`border-${prop}: 1px solid var(--pop-border)`)
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

  // —— 箭头永远跟随锚点（实测：窄视口 clamp 后默认箭头不指宿主）——

  it('箭头默认跟随锚点：面板被视口边缘 clamp 平移时，箭头仍指向锚点中心（无需 arrow-point-at-center）', () => {
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
    // happy-dom 的 stub 矩形不随 style.left 更新：把面板矩形同步为实际落位（left=4）后
    // 触发重定位，验证箭头投影跟随锚点中心：44 - 4 - 6 = 34
    stubRect(p, { left: 4, top: 340, width: 240, height: 60 })
    el.setAttribute('content', 'y')
    // 默认（无 arrow-point-at-center）：clamp 后箭头也跟随锚点中心 → --arrow-x = 34px
    expect(arrow.style.getPropertyValue('--arrow-x')).toBe('34px')
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

/** 真实计时器等待（防抖延时 / 退场动画 / auto-close） */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 中段坐标四向均不翻转的基准：锚点 {400,300,80,32}，面板 {350,332,200,100}，视口 1280x800 */
function mountOpen(attrs: Record<string, string>): OASPopover {
  const el = mount(attrs)
  stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
  stubPanelRect(panelOf(el), 200, 100)
  setViewport(1280, 800)
  el.setAttribute('open', '')
  return el
}

describe('OASPopover 触发方式（trigger）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => unmountAll())

  it('trigger / hover-delay / hover-hide-delay / open-delay / close-delay 列入 observedAttributes', () => {
    expect(OASPopover.observedAttributes).toEqual(
      expect.arrayContaining([
        'trigger',
        'hover-delay',
        'hover-hide-delay',
        'open-delay',
        'close-delay',
      ]),
    )
  })

  it('trigger="hover"：悬停开、移出关（hover-delay=0 立即）', async () => {
    const el = mount({ trigger: 'hover', 'hover-delay': '0', 'hover-hide-delay': '0' })
    el.dispatchEvent(new MouseEvent('mouseenter'))
    await sleep(20)
    expect(el.hasAttribute('open')).toBe(true)
    el.dispatchEvent(new MouseEvent('mouseleave'))
    await sleep(20)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('hover 悬停到浮层面板不关闭（悬停区域 = 宿主 + 面板）', async () => {
    const el = mount({ trigger: 'hover', 'hover-delay': '0', 'hover-hide-delay': '0' })
    el.dispatchEvent(new MouseEvent('mouseenter'))
    await sleep(20)
    el.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: panelOf(el) }))
    await sleep(30)
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('hover-delay / hover-hide-delay：开合防抖延时生效', async () => {
    const el = mount({ trigger: 'hover', 'hover-delay': '60', 'hover-hide-delay': '60' })
    el.dispatchEvent(new MouseEvent('mouseenter'))
    expect(el.hasAttribute('open')).toBe(false) // 开延时未到不开
    await sleep(90)
    expect(el.hasAttribute('open')).toBe(true)
    el.dispatchEvent(new MouseEvent('mouseleave'))
    expect(el.hasAttribute('open')).toBe(true) // 关延时未到仍开
    await sleep(90)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('trigger="focus"：聚焦开、失焦（焦点移出宿主/面板）关', () => {
    const el = mount({ trigger: 'focus' })
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(true)
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('trigger 多选 "click hover"：click 切换与 hover 开合共存', async () => {
    const el = mount({ trigger: 'click hover', 'hover-delay': '0', 'hover-hide-delay': '0' })
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.hasAttribute('open')).toBe(true)
    el.dispatchEvent(new MouseEvent('mouseleave'))
    await sleep(20)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('trigger="hover"（无 click）：点击不切换', () => {
    const el = mount({ trigger: 'hover' })
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('trigger="manual"：click/hover/focus 均不改变状态（宿主 open 控制）', async () => {
    const el = mount({ trigger: 'manual', 'hover-delay': '0' })
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.hasAttribute('open')).toBe(false)
    el.dispatchEvent(new MouseEvent('mouseenter'))
    await sleep(20)
    expect(el.hasAttribute('open')).toBe(false)
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(false)
    el.setAttribute('open', '')
    expect(panelOf(el).getAttribute('aria-hidden')).toBe('false')
  })

  it('trigger 含 contextmenu：右键打开', () => {
    const el = mount({ trigger: 'click contextmenu' })
    const btn = el.querySelector('button') as HTMLElement
    btn.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('disabled：click / hover / focus 触发均不响应', async () => {
    const el = mount({
      disabled: '',
      trigger: 'click hover focus',
      'hover-delay': '0',
      'hover-hide-delay': '0',
    })
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.hasAttribute('open')).toBe(false)
    el.dispatchEvent(new MouseEvent('mouseenter'))
    await sleep(20)
    expect(el.hasAttribute('open')).toBe(false)
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('disabled：宿主 aria-disabled 同步 + 视觉降饱和规则', () => {
    const el = mount({ disabled: '' })
    expect(el.getAttribute('aria-disabled')).toBe('true')
    const styleText = el.shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toMatch(/:host\(\[disabled\]\)\s*\{[^}]*opacity:\s*0\.6/)
  })

  it('open-delay / close-delay：点击打开延迟、关闭延迟', async () => {
    const el = mount({ 'open-delay': '60', 'close-delay': '60' })
    const btn = el.querySelector('button') as HTMLElement
    btn.click()
    expect(el.hasAttribute('open')).toBe(false) // open-delay 未到
    await sleep(90)
    expect(el.hasAttribute('open')).toBe(true)
    btn.click()
    expect(el.hasAttribute('open')).toBe(true) // close-delay 未到
    await sleep(90)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('trigger-keys：指定按键在触发元素聚焦时切换开合', () => {
    const el = mount({ 'trigger-keys': 'Enter' })
    const btn = el.querySelector('button') as HTMLElement
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.hasAttribute('open')).toBe(true)
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('trigger-keys 未指定的按键不响应', () => {
    const el = mount({ 'trigger-keys': 'Enter' })
    const btn = el.querySelector('button') as HTMLElement
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(el.hasAttribute('open')).toBe(false)
  })
})

describe('OASPopover 12 向 placement', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => unmountAll())

  it('-start/-end 交叉轴对齐：bottom-start 左对齐（最常见形态）、bottom-end 右对齐', () => {
    const start = mountOpen({ placement: 'bottom-start' })
    expect(panelOf(start).getAttribute('data-placement')).toBe('bottom-start')
    expect(panelOf(start).style.top).toBe('340px') // 332 + 8
    expect(panelOf(start).style.left).toBe('400px') // 面板左缘 = 锚点左缘
    const end = mountOpen({ placement: 'bottom-end' })
    expect(panelOf(end).getAttribute('data-placement')).toBe('bottom-end')
    expect(panelOf(end).style.left).toBe('280px') // 锚点右缘 480 - 面板宽 200
  })

  it('right-start：面板上缘对齐锚点上缘；top-end：下缘对齐', () => {
    const rs = mountOpen({ placement: 'right-start' })
    expect(panelOf(rs).getAttribute('data-placement')).toBe('right-start')
    expect(panelOf(rs).style.left).toBe('488px') // 480 + 8
    expect(panelOf(rs).style.top).toBe('300px') // 面板上缘 = 锚点上缘
    const te = mountOpen({ placement: 'top-end' })
    expect(panelOf(te).getAttribute('data-placement')).toBe('top-end')
    expect(panelOf(te).style.top).toBe('192px') // 300 - 100 - 8
    expect(panelOf(te).style.left).toBe('280px')
  })

  it('翻转保留对齐后缀：bottom-start 空间不足 → top-start（不回落为无对齐 top）', () => {
    const el = mount({ placement: 'bottom-start' })
    stubRect(el.querySelector('button')!, { left: 400, top: 700, width: 80, height: 32 })
    stubPanelRect(panelOf(el), 200, 100)
    setViewport(1280, 800)
    el.setAttribute('open', '')
    expect(panelOf(el).getAttribute('data-placement')).toBe('top-start')
    expect(panelOf(el).style.top).toBe('592px') // 700 - 100 - 8
    expect(panelOf(el).style.left).toBe('400px') // 对齐后缀在翻转后仍保留
  })

  it('对齐后再视口夹取：bottom-start 靠视口右缘不越界', () => {
    const el = mount({ placement: 'bottom-start' })
    stubRect(el.querySelector('button')!, { left: 1200, top: 300, width: 80, height: 32 })
    stubPanelRect(panelOf(el), 200, 100)
    setViewport(1280, 800)
    el.setAttribute('open', '')
    expect(panelOf(el).style.left).toBe('1076px') // 1280 - 200 - 4
  })

  it('auto-adjust-overflow=false：bottom-start 严格保持不翻转不避让', () => {
    const el = mount({ placement: 'bottom-start', 'auto-adjust-overflow': 'false' })
    stubRect(el.querySelector('button')!, { left: 400, top: 700, width: 80, height: 32 })
    stubPanelRect(panelOf(el), 200, 100)
    setViewport(1280, 800)
    el.setAttribute('open', '')
    expect(panelOf(el).getAttribute('data-placement')).toBe('bottom-start')
    expect(panelOf(el).style.top).toBe('740px') // 732 + 8
  })

  it('非法 placement 回落 top', () => {
    const el = mount({ placement: 'diagonal' })
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    stubPanelRect(panelOf(el), 200, 100)
    setViewport(1280, 800)
    el.setAttribute('open', '')
    expect(panelOf(el).getAttribute('data-placement')).toBe('top')
  })
})

describe('OASPopover 12 向箭头对准锚点（-start/-end 贴向对齐端部并指向锚点）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => unmountAll())

  /** mountOpen 打开（面板 200x100、锚点 {400,300,80,32}、视口 1280x800）后，
   *  把面板 stub rect 同步为实际落位再触发一次重定位——positionArrow 读面板
   *  getBoundingClientRect 计算箭头局部坐标（真实浏览器由强制布局保证同步） */
  function openWithSyncedRect(placement: string, extra: Record<string, string> = {}): OASPopover {
    const el = mountOpen({ placement, ...extra })
    const p = panelOf(el)
    stubRect(p, {
      left: parseFloat(p.style.left),
      top: parseFloat(p.style.top),
      width: 200,
      height: 100,
    })
    el.setAttribute('content', 'sync') // 触发重定位（箭头用同步后的面板 rect 计算）
    return el
  }

  it('-start/-end 8 向：箭头内联偏移指向锚点中心投影（对准宿主，不再恒居中）', () => {
    // mountOpen 基准：锚点 {400,300,80,32}（中心 440,316）；面板 200x100：
    //   bottom/top-start 面板 left=400、-end 面板 left=280；
    //   left/right-start 面板 top=300、-end 面板 top=232
    const cases: Record<string, { prop: string; value: string }> = {
      'bottom-start': { prop: '--arrow-x', value: '34px' }, // 440-400-6
      'bottom-end': { prop: '--arrow-x', value: '154px' }, // 440-280-6
      'top-start': { prop: '--arrow-x', value: '34px' },
      'top-end': { prop: '--arrow-x', value: '154px' },
      'left-start': { prop: '--arrow-y', value: '10px' }, // 316-300-6
      'left-end': { prop: '--arrow-y', value: '78px' }, // 316-232-6
      'right-start': { prop: '--arrow-y', value: '10px' },
      'right-end': { prop: '--arrow-y', value: '78px' },
    }
    for (const [placement, { prop, value }] of Object.entries(cases)) {
      const el = openWithSyncedRect(placement)
      const arrow = panelOf(el).querySelector<HTMLElement>('[data-popper-arrow]')!
      expect(
        arrow.style.getPropertyValue(prop),
        `${placement} 箭头应指向锚点中心投影（${prop}=${value}）`,
      ).toBe(value)
    }
  })

  it('center（无后缀）placement：箭头跟随锚点中心（未 clamp 时计算值与 CSS 中心一致）', () => {
    // 新契约：箭头永远跟随锚点，clamp 平移后不漂移；
    // 未 clamp 时 bottom：锚点中心 440、面板 left=340（居中未避让）→ 440-340-6=94 = calc(50%-6px)
    const el = openWithSyncedRect('bottom')
    const arrow = panelOf(el).querySelector<HTMLElement>('[data-popper-arrow]')!
    expect(arrow.style.getPropertyValue('--arrow-x')).toBe('94px')
    expect(arrow.style.getPropertyValue('--arrow-y')).toBe('')
  })

  it('锚点中心投影越出面板边时箭头夹取（clamp 到面板内不越界）', () => {
    const el = mount({ placement: 'bottom-start' })
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 400, height: 32 }) // 锚点比面板宽
    stubPanelRect(panelOf(el), 200, 100)
    setViewport(1280, 800)
    el.setAttribute('open', '')
    const p = panelOf(el)
    stubRect(p, {
      left: parseFloat(p.style.left),
      top: parseFloat(p.style.top),
      width: 200,
      height: 100,
    })
    el.setAttribute('content', 'sync')
    // 面板 [400,600]、锚点中心 X=600 → 裸算 194 超过 200-8-12=180 → 夹取 180
    const arrow = p.querySelector<HTMLElement>('[data-popper-arrow]')!
    expect(arrow.style.getPropertyValue('--arrow-x')).toBe('180px')
  })

  it('virtual 坐标点：箭头指向虚拟锚点坐标（P6 定夺：箭头对准点本身）', () => {
    const el = mount({ virtual: '', 'virtual-x': '160', 'virtual-y': '90', placement: 'right' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    setViewport(1280, 800)
    el.setAttribute('open', '')
    stubRect(p, {
      left: parseFloat(p.style.left),
      top: parseFloat(p.style.top),
      width: 200,
      height: 60,
    })
    el.setAttribute('content', 'sync')
    // 面板 top = 90-30 = 60；箭头 y = 90 - 60 - 6 = 24px
    const arrow = p.querySelector<HTMLElement>('[data-popper-arrow]')!
    expect(arrow.style.getPropertyValue('--arrow-y')).toBe('24px')
  })

  it('virtual 点近视口缘翻转后：箭头仍指向虚拟点（避让偏移不失准）', () => {
    const el = mount({ virtual: '', 'virtual-x': '1200', 'virtual-y': '200', placement: 'right' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    setViewport(1280, 800)
    el.setAttribute('open', '')
    expect(p.getAttribute('data-placement')).toBe('left') // 翻转
    stubRect(p, {
      left: parseFloat(p.style.left),
      top: parseFloat(p.style.top),
      width: 200,
      height: 60,
    })
    el.setAttribute('content', 'sync')
    // 翻转 left：面板 left = 1200-200-8 = 992、箭头 x = 1200 - 992 - 4 = 204 > 184 → 夹 184？
    // 等等——翻转后箭头悬面板右边（right 系基向 left → ^='left' 悬 right 边），--arrow-y 才是交叉轴：
    // left 基向是垂直交叉轴 → 箭头 y = 200 - 170 - 6 = 24px
    const arrow = p.querySelector<HTMLElement>('[data-popper-arrow]')!
    expect(arrow.style.getPropertyValue('--arrow-y')).toBe('24px')
  })
})

describe('OASPopover 宽度（width）与偏移（offset 双轴）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => unmountAll())

  it('width 数字：面板宽度设为 px', () => {
    const el = mount({ open: '', width: '300' })
    expect(panelOf(el).style.width).toBe('300px')
  })

  it('width="trigger"：面板与触发元素同宽', () => {
    const el = mount({ open: '', width: 'trigger' })
    const btn = el.querySelector('button') as HTMLElement
    stubRect(btn, { left: 100, top: 200, width: 180, height: 32 })
    el.setAttribute('content', 'x') // 触发重定位应用宽度
    expect(panelOf(el).style.width).toBe('180px')
  })

  it('width CSS 值（如 50%）原样应用', () => {
    const el = mount({ open: '', width: '50%' })
    expect(panelOf(el).style.width).toBe('50%')
  })

  it('offset="16"：主轴间距 16（默认 8）', () => {
    const el = mount({ placement: 'bottom', 'auto-adjust-overflow': 'false', offset: '16' })
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    stubPanelRect(panelOf(el), 200, 100)
    setViewport(1280, 800)
    el.setAttribute('open', '')
    expect(panelOf(el).style.top).toBe('348px') // 332 + 16
  })

  it('offset="12, 20"：主轴 12 + 交叉轴 skid 20（bottom → 面板右移 20）', () => {
    const el = mount({ placement: 'bottom', 'auto-adjust-overflow': 'false', offset: '12, 20' })
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    stubPanelRect(panelOf(el), 200, 100)
    setViewport(1280, 800)
    el.setAttribute('open', '')
    expect(panelOf(el).style.top).toBe('344px') // 332 + 12
    expect(panelOf(el).style.left).toBe('360px') // 340 + 20
  })

  it('offset="12, 20"：right placement 交叉轴 skid 向下', () => {
    const el = mount({ placement: 'right', 'auto-adjust-overflow': 'false', offset: '12, 20' })
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    stubPanelRect(panelOf(el), 200, 100)
    setViewport(1280, 800)
    el.setAttribute('open', '')
    expect(panelOf(el).style.left).toBe('492px') // 480 + 12
    expect(panelOf(el).style.top).toBe('286px') // 316 - 50 + 20
  })
})

describe('OASPopover 开合动画', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => unmountAll())

  it('入场/退场 keyframes + oas-closing 类 + transform-origin 变量 + 减少动效保护', () => {
    const styleText = mount().shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toContain('@keyframes oas-pop-in')
    expect(styleText).toContain('@keyframes oas-pop-out')
    expect(styleText).toContain('.panel.oas-closing .panel-inner')
    expect(styleText).toMatch(/transform-origin:\s*var\(--oas-origin-x/)
    expect(styleText).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })

  it('transform-origin 感知方向：bottom-start → 顶左（top left）、right-end → 左底', () => {
    const start = mountOpen({ placement: 'bottom-start' })
    const panel = panelOf(start)
    expect(panel.style.getPropertyValue('--oas-origin-x')).toBe('left')
    expect(panel.style.getPropertyValue('--oas-origin-y')).toBe('top')
    const re = mountOpen({ placement: 'right-end' })
    const rePanel = panelOf(re)
    expect(rePanel.style.getPropertyValue('--oas-origin-x')).toBe('left')
    expect(rePanel.style.getPropertyValue('--oas-origin-y')).toBe('bottom')
  })

  it('关闭时 aria-hidden 立即落地 + oas-closing 播完退场动画（语义状态不滞后于动画）', async () => {
    const el = mount()
    const p = panelOf(el)
    ;(el.querySelector('button') as HTMLElement).click()
    expect(p.getAttribute('aria-hidden')).toBe('false')
    ;(el.querySelector('button') as HTMLElement).click()
    // 语义状态立即落地（Esc 栈/外部观察者同步可见）；oas-closing 类让面板保持显示播完退场动画
    expect(p.getAttribute('aria-hidden')).toBe('true')
    expect(p.classList.contains('oas-closing')).toBe(true) // 动画期间仍在屏（CSS: [aria-hidden=true].oas-closing 保持显示）
    await sleep(220)
    expect(p.getAttribute('aria-hidden')).toBe('true')
    expect(p.classList.contains('oas-closing')).toBe(false)
  })

  it('退场期间重开：取消隐藏、不残留 oas-closing 类', async () => {
    const el = mount()
    const p = panelOf(el)
    ;(el.querySelector('button') as HTMLElement).click()
    ;(el.querySelector('button') as HTMLElement).click() // 开始退场
    expect(p.classList.contains('oas-closing')).toBe(true)
    ;(el.querySelector('button') as HTMLElement).click() // 重开
    expect(p.classList.contains('oas-closing')).toBe(false)
    expect(p.getAttribute('aria-hidden')).toBe('false')
    await sleep(220) // 旧退场定时器到点不应误关已重开的面板
    expect(p.getAttribute('aria-hidden')).toBe('false')
    expect(el.hasAttribute('open')).toBe(true)
  })
})

describe('OASPopover 初始焦点（initial-focus）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => unmountAll())

  it('initial-focus：打开时焦点移入指定选择器元素（优先于 focus-on-open）', () => {
    const el = mount({ 'focus-on-open': '', 'initial-focus': '#pop-focus-target' })
    const target = document.createElement('button')
    target.id = 'pop-focus-target'
    target.setAttribute('slot', 'content')
    el.appendChild(target)
    el.setAttribute('open', '')
    expect(document.activeElement).toBe(target)
  })

  it('initial-focus 解析不到时回落 focus-on-open 首个可聚焦', () => {
    const el = mount({ 'focus-on-open': '', 'initial-focus': '#pop-nonexistent' })
    const inner = document.createElement('button')
    inner.setAttribute('slot', 'content')
    el.appendChild(inner)
    el.setAttribute('open', '')
    expect(document.activeElement).toBe(inner)
  })

  it('initial-focus 存在但 focus-on-open 未开：仍按 initial-focus 聚焦', () => {
    const el = mount({ 'initial-focus': '#pop-focus-only' })
    const target = document.createElement('button')
    target.id = 'pop-focus-only'
    target.setAttribute('slot', 'content')
    el.appendChild(target)
    el.setAttribute('open', '')
    expect(document.activeElement).toBe(target)
  })
})

describe('OASPopover portal（append-to）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => unmountAll())

  /** body 上的 portal host（每实例一个，data-oas-popover-portal 标记） */
  function portalHostOf(): HTMLElement | null {
    return document.querySelector<HTMLElement>('[data-oas-popover-portal]')
  }

  /** 面板可能被 portal 出 shadow（append-to），需在原 shadow 与 portal host shadow 两处查 */
  function panelAnywhere(el: OASPopover): HTMLElement {
    return (el.shadowRoot!.querySelector('[part="panel"]') ??
      portalHostOf()?.shadowRoot?.querySelector('[part="panel"]') ??
      document.body.querySelector('[part="panel"]')) as HTMLElement
  }

  it('append-to="body"：面板移入 body 的 portal host（独立 shadow + STYLE 注入保真），关闭移回 shadow、host 无孤儿', () => {
    // 曾缺陷（P2）：裸 appendChild 到 body——面板脱离 shadow 树后 scoped CSS 全部失效
    // （position:fixed / 背景 / 边框 / 圆角丢失），以 static 掉到文档流末尾且随滚动乱飘
    const el = mount({ open: '', 'append-to': 'body' })
    const p = panelAnywhere(el)
    const host = portalHostOf()
    expect(host).not.toBeNull()
    expect(document.body.contains(host!)).toBe(true)
    expect(host!.shadowRoot!.contains(p)).toBe(true)
    expect(el.shadowRoot!.contains(p)).toBe(false)
    // 样式作用域保真：portal shadow 内注入同一份 STYLE
    const st = host!.shadowRoot!.querySelector('style')
    expect(st).not.toBeNull()
    expect(st!.textContent).toContain('.panel')
    // 关闭：面板移回原 shadow，host 从 body 移除（无孤儿产物）
    el.removeAttribute('open')
    expect(el.shadowRoot!.contains(p)).toBe(true)
    expect(portalHostOf()).toBeNull()
  })

  it('append-to 选择器：portal host 挂到指定容器', () => {
    const port = document.createElement('div')
    port.id = 'pop-port'
    document.body.appendChild(port)
    const el = mount({ open: '', 'append-to': '#pop-port' })
    const host = port.querySelector<HTMLElement>('[data-oas-popover-portal]')
    expect(host).not.toBeNull()
    expect(host!.shadowRoot!.contains(panelAnywhere(el))).toBe(true)
  })

  it('append-to：slot 内容桥接——slotted 节点随面板移入 portal host light DOM（跨 host 分配不断供），关闭移回宿主', () => {
    const el = mount({ open: '', 'append-to': 'body' })
    const inner = document.createElement('button')
    inner.setAttribute('slot', 'content')
    inner.textContent = '面板按钮'
    el.appendChild(inner)
    el.setAttribute('content', 'x') // 触发 update（后加的 slot 节点也要桥接）
    const host = portalHostOf()!
    expect(host.contains(inner)).toBe(true)
    // slot 分配生效：面板内 slot 的 assignedNodes 含桥接节点
    const slot = panelAnywhere(el).querySelector('slot[name="content"]') as HTMLSlotElement
    expect(slot.assignedNodes()).toContain(inner)
    el.removeAttribute('open')
    expect(el.contains(inner)).toBe(true)
  })

  it('append-to：portal 后点击面板内部不触发外部点击关闭', () => {
    const el = mount({ open: '', 'append-to': 'body' })
    const p = panelAnywhere(el)
    p.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('append-to：断开连接时面板与 slot 节点移回、portal host 不残留于 body（孤儿防御）', () => {
    const el = mount({ open: '', 'append-to': 'body' })
    const inner = document.createElement('button')
    inner.setAttribute('slot', 'content')
    el.appendChild(inner)
    el.setAttribute('content', 'x')
    const p = panelAnywhere(el)
    el.remove()
    expect(document.body.contains(p)).toBe(false)
    expect(portalHostOf()).toBeNull()
    expect(el.contains(inner)).toBe(true)
    expect(el.shadowRoot!.contains(p)).toBe(true)
  })

  it('append-to + modal：portal host z 序高于遮罩层（面板抬到遮罩之上）', () => {
    const el = mount({ open: '', 'append-to': 'body', modal: '' })
    const host = portalHostOf()!
    expect(host.style.zIndex).toContain('--oas-z-overlay')
    const plain = mount({ open: '', 'append-to': 'body' })
    const hosts = document.querySelectorAll('[data-oas-popover-portal]')
    const plainHost = hosts[hosts.length - 1] as HTMLElement
    expect(plainHost.style.zIndex).toContain('--oas-z-dropdown')
    expect(plain).toBeTruthy()
  })
})

describe('OASPopover 碰撞细调（collision-padding / fallback-placements / hide-when-detached）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => unmountAll())

  it('collision-padding：视口夹取边距可配（默认 4）', () => {
    const el = mount({ open: '', placement: 'bottom', 'collision-padding': '20' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 12, top: 300, width: 64, height: 32 }) // 锚点中心 X = 44 → 面板左缘 -76 → 夹取
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    expect(p.style.left).toBe('20px')
  })

  it('fallback-placements：请求不 fit 时按序列选首个 fit 回退', () => {
    const el = mount({
      open: '',
      placement: 'bottom',
      'fallback-placements': 'left, right',
    })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 400, top: 780, width: 80, height: 32 }) // bottom 不 fit（812+60+8 > 796）
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    expect(p.getAttribute('data-placement')).toBe('left')
    expect(p.style.left).toBe('192px') // 400 - 200 - 8
  })

  it('fallback-placements：请求 fit 时用请求 placement（回退不生效）', () => {
    const el = mount({
      open: '',
      placement: 'bottom',
      'fallback-placements': 'left, right',
    })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    expect(p.getAttribute('data-placement')).toBe('bottom')
  })

  it('hide-when-detached：锚点完全脱离视口时面板隐藏', () => {
    const el = mount({ open: '', 'hide-when-detached': '', placement: 'bottom' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: -300, top: -200, width: 80, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    expect(p.hidden).toBe(true)
  })

  it('hide-when-detached：锚点在视口内正常显示', () => {
    const el = mount({ open: '', 'hide-when-detached': '', placement: 'bottom' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    expect(p.hidden).toBe(false)
  })

  it('打开期间滚动：rAF 节流重算定位（fixed 与页面脱节修复）', async () => {
    const el = mount({ open: '', placement: 'bottom' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    expect(p.style.top).toBe('340px') // 332 + 8
    stubRect(btn, { left: 400, top: 250, width: 80, height: 32 }) // 页面滚动：锚点随视口上移
    setScrollY(300); window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(p.style.top).toBe('290px') // 282 + 8
  })
})

describe('OASPopover 关闭按钮与声明式关层', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => unmountAll())

  it('closable：显示关闭按钮（part=close），点击关闭并还原焦点', () => {
    const el = mount({ open: '', closable: '', title: 'x' })
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="close"]')!
    expect(btn).not.toBeNull()
    expect(btn.hidden).toBe(false)
    const trigger = el.querySelector('button')!
    trigger.focus()
    btn.click()
    expect(el.hasAttribute('open')).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('closable：面板挂 oas-closable 类（CSS .panel.oas-closable .close-btn 显示规则的钩子，右上角 ✕ 可见）', () => {
    // 回归点：close-btn 默认 display:none，可见性由 `.panel.oas-closable .close-btn` 驱动；
    // 曾缺陷——CSS 有该规则但无人给面板挂类，✕ 永不显示（hidden 移除了也看不见）
    const el = mount({ open: '', closable: '', title: 'x' })
    expect(panelOf(el).classList.contains('oas-closable')).toBe(true)
    el.removeAttribute('closable')
    expect(panelOf(el).classList.contains('oas-closable')).toBe(false)
    el.setAttribute('closable', '')
    expect(panelOf(el).classList.contains('oas-closable')).toBe(true)
  })

  it('无 closable：关闭按钮隐藏', () => {
    const el = mount({ open: '', title: 'x' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.hidden).toBe(true)
  })

  it('声明式关层：内容内 data-popover="close" 按钮点击关闭', () => {
    const el = mount({ open: '' })
    const inner = document.createElement('button')
    inner.setAttribute('slot', 'content')
    inner.setAttribute('data-popover', 'close')
    el.appendChild(inner)
    inner.click()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('内容内普通按钮不触发声明式关层', () => {
    const el = mount({ open: '' })
    const inner = document.createElement('button')
    inner.setAttribute('slot', 'content')
    el.appendChild(inner)
    inner.click()
    expect(el.hasAttribute('open')).toBe(true)
  })
})

describe('OASPopover 颜色变体（color）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => unmountAll())

  it('color="primary"：面板写 data-color，变体走 token（color-mix + --pop-* 变量覆写）', () => {
    const el = mount({ open: '', color: 'primary' })
    expect(panelOf(el).getAttribute('data-color')).toBe('primary')
    const styleText = el.shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toContain(".panel[data-color='primary']")
    expect(styleText).toMatch(/var\(--oas-color-primary\)/)
    // 变体只覆写 --pop-bg / --pop-border（P8 后默认值走 --oas-popover-* 变量链），面板与箭头共用
    expect(styleText).toMatch(/--pop-border:\s*var\(--oas-popover-border,\s*var\(--oas-color-border\)\)/)
  })

  it('color 未知值：不写 data-color（默认中性面板）', () => {
    const el = mount({ open: '', color: 'what' })
    expect(panelOf(el).hasAttribute('data-color')).toBe(false)
  })
})

describe('OASPopover modal 化', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => unmountAll())

  it('modal：backdrop 显示 + aria-modal + 焦点移入面板', () => {
    const el = mount({ open: '', modal: '' })
    const backdrop = el.shadowRoot!.querySelector<HTMLElement>('.backdrop')!
    expect(backdrop).not.toBeNull()
    expect(backdrop.classList.contains('oas-show')).toBe(true)
    expect(panelOf(el).getAttribute('aria-modal')).toBe('true')
  })

  it('非 modal：backdrop 隐藏、无 aria-modal', () => {
    const el = mount({ open: '' })
    const backdrop = el.shadowRoot!.querySelector<HTMLElement>('.backdrop')!
    expect(backdrop.classList.contains('oas-show')).toBe(false)
    expect(panelOf(el).hasAttribute('aria-modal')).toBe(false)
  })

  it('modal：点击 backdrop 关闭', () => {
    const el = mount({ open: '', modal: '' })
    el.shadowRoot!.querySelector<HTMLElement>('.backdrop')!.click()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('modal：焦点陷阱 Tab/Shift+Tab 在面板内循环', () => {
    const el = mount({ open: '', modal: '' })
    const a = document.createElement('button')
    a.setAttribute('slot', 'content')
    el.appendChild(a)
    const b = document.createElement('button')
    b.setAttribute('slot', 'content')
    el.appendChild(b)
    el.setAttribute('open', '')
    b.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(a)
    a.focus()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    )
    expect(document.activeElement).toBe(b)
  })

  it('modal：焦点逃逸到面板外时 Tab 拉回首个可聚焦', () => {
    const el = mount({ open: '', modal: '' })
    const a = document.createElement('button')
    a.setAttribute('slot', 'content')
    el.appendChild(a)
    el.setAttribute('open', '')
    const out = document.createElement('button')
    document.body.appendChild(out)
    out.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(a)
  })

  it('modal：焦点陷阱仅最上层 modal 接管（子层 modal 不被父层拉回）', () => {
    const parent = mount({ open: '', modal: '' })
    const pa = document.createElement('button')
    pa.setAttribute('slot', 'content')
    parent.appendChild(pa)
    const child = document.createElement('oas-popover') as OASPopover
    child.setAttribute('modal', '')
    child.setAttribute('open', '')
    child.innerHTML = '<button>子触发</button><button slot="content">子面板按钮</button>'
    document.body.appendChild(child)
    mounted.push(child) // 手动创建元素同样追踪，afterEach remove() 复位模块级 modal 滚动锁计数
    const childPanelBtn = child.querySelector('button[slot="content"]') as HTMLElement
    const childTrigger = child.querySelector('button') as HTMLElement
    childTrigger.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(childPanelBtn)
    expect(document.activeElement).not.toBe(pa) // 父层未接管
  })

  it('modal：打开时锁定滚动（wheel preventDefault），关闭后解锁', () => {
    const el = mount({ open: '', modal: '' })
    const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true })
    window.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true)
    // 回归固化：open 期间多次 update（内容变化触发）不得重复加锁，否则关闭只解一次锁会残留
    el.setAttribute('content', 'x')
    const ev1b = new WheelEvent('wheel', { bubbles: true, cancelable: true })
    window.dispatchEvent(ev1b)
    expect(ev1b.defaultPrevented).toBe(true)
    el.removeAttribute('open')
    const ev2 = new WheelEvent('wheel', { bubbles: true, cancelable: true })
    window.dispatchEvent(ev2)
    expect(ev2.defaultPrevented).toBe(false)
  })
})

describe('OASPopover fresh / auto-close / arrow-merge', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => unmountAll())

  it('无 fresh：关闭时内容不持续更新（冻结，打开时写入最新）', () => {
    const el = mount({ title: '旧', content: '旧内容' })
    el.setAttribute('content', '新内容')
    expect(el.shadowRoot!.querySelector('[part="content"]')!.textContent).toBe('旧内容')
    el.setAttribute('open', '')
    expect(el.shadowRoot!.querySelector('[part="content"]')!.textContent).toBe('新内容')
  })

  it('fresh：关闭时内容持续更新', () => {
    const el = mount({ title: 'x', fresh: '' })
    el.setAttribute('content', '第一版')
    expect(el.shadowRoot!.querySelector('[part="content"]')!.textContent).toBe('第一版')
    el.setAttribute('content', '第二版')
    expect(el.shadowRoot!.querySelector('[part="content"]')!.textContent).toBe('第二版')
  })

  it('auto-close：打开后超时自动关闭', async () => {
    const el = mount({ open: '', 'auto-close': '80' })
    expect(el.hasAttribute('open')).toBe(true)
    await sleep(120)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('auto-close 未设置：不自动关闭', async () => {
    const el = mount({ open: '' })
    await sleep(120)
    expect(el.hasAttribute('open')).toBe(true)
  })

  // ================= arrow-merge 直角三角形态（对齐 tooltip 的「直角三角贴角共边」） =================
  // 曾现缺陷：merge 箭头沿用 8×8 方块 rotate(45deg) 旋转菱形、菱心骑在面板角点上、尖端
  // 沿 45° 斜向凸出——不指向锚点，观感「怪」（tooltip 同款用户反馈缺陷族）。改为通用
  // 形态：不旋转方块整悬面板外贴角 + clip-path 裁直角三角——直角顶点贴面板角点，两条
  // 直角边与角两边共线，尖端正交外探 8px 指向锚点侧。popover 面板有 1px 描边：箭头贴角
  // 让位 1px（主轴边压进面板描边带、起止侧边 -1px），两条直角边的描边（--pop-border）
  // 恰好与面板描边带共带续接，斜边不描边（clip 裁平，视觉干净）。

  /** shadow 内 STYLE 文本（空白折叠后做规则断言） */
  function mergeCss(el: OASPopover): string {
    return (el.shadowRoot!.querySelector('style')!.textContent ?? '').replace(/\s+/g, ' ')
  }

  it('arrow-merge：面板写 data-arrow-merge，center placement 不触发贴角规则（仅 -start/-end 生效）', () => {
    const el = mount({ open: '', placement: 'bottom-start', 'arrow-merge': '' })
    expect(panelOf(el).hasAttribute('data-arrow-merge')).toBe(true)
    const css = mergeCss(el)
    expect(css).toMatch(/\[data-placement='bottom-start'\]\[data-arrow-merge\]/)
    expect(css).toContain('border-top-left-radius: 0')
    // bottom 无后缀 → 不匹配贴角规则
    expect(css).not.toMatch(/\[data-placement='bottom'\]\[data-arrow-merge\]/)
  })

  it('arrow-merge 逐角置零：8 个 -start/-end placement 的角 radius 规则各就各位', () => {
    const css = mergeCss(mount())
    const cornerOf: Record<string, string> = {
      // bottom 系箭头悬顶边：start→左上角、end→右上角
      'bottom-start': 'border-top-left-radius: 0;',
      'bottom-end': 'border-top-right-radius: 0;',
      // top 系箭头悬底边：start→左下角、end→右下角
      'top-start': 'border-bottom-left-radius: 0;',
      'top-end': 'border-bottom-right-radius: 0;',
      // left 系箭头悬右边：start→右上角、end→右下角
      'left-start': 'border-top-right-radius: 0;',
      'left-end': 'border-bottom-right-radius: 0;',
      // right 系箭头悬左边：start→左上角、end→左下角
      'right-start': 'border-top-left-radius: 0;',
      'right-end': 'border-bottom-left-radius: 0;',
    }
    for (const [p, decl] of Object.entries(cornerOf)) {
      expect(css, `merge ${p} 应置零 ${decl}`).toContain(
        `[data-placement='${p}'][data-arrow-merge] { ${decl} }`,
      )
    }
  })

  it('arrow-merge 直角三角贴角共边：8 向箭头盒整悬面板外、transform none、描边覆盖汇于尖端的两条边（直角边 + 斜边）', () => {
    const css = mergeCss(mount())
    const B = '1px solid var(--pop-border)'
    // 盒定位：主轴边外 -8px（压进面板描边带 1px 共带）、起止侧边 -1px（描边带对齐）；
    // 不旋转 + 描边策略（实测反馈）：直角边（贴面板边、与面板描边共带续接）用 border；
    // 斜边（汇于尖端的主要外露边）用 45°/135° 渐变带补 2px 法向线（45° 抗锯齿下与直角边 1px 同观感）——斜边精确落在渐变 50%
    // 等值线上（盒对角线上），clip 保留三角内侧。贴面板的那条直角边是「融合边」不留描边
    // （只在外露的两条边留线），否则融合处多一条线、观感割裂。曾缺陷：斜边不描边→箭头尖端
    // 轮廓缺失、白三角贴白页不可见；贴边有描边→融合处割裂
    const grad = (angle: number) =>
      `linear-gradient(${angle}deg, var(--pop-bg) 0 calc(50% - 1px), var(--pop-border) calc(50% - 1px) calc(50% + 1px), var(--pop-bg) calc(50% + 1px))`
    const rules: Record<string, string> = {
      'bottom-start': `top: -8px; left: -1px; transform: none; border: none; border-left: ${B}; background: ${grad(45)}; clip-path: polygon(0% 0%, 0% 100%, 100% 100%);`,
      'bottom-end': `top: -8px; right: -1px; left: auto; transform: none; border: none; border-right: ${B}; background: ${grad(135)}; clip-path: polygon(100% 0%, 0% 100%, 100% 100%);`,
      'top-start': `bottom: -8px; left: -1px; transform: none; border: none; border-left: ${B}; background: ${grad(135)}; clip-path: polygon(0% 0%, 100% 0%, 0% 100%);`,
      'top-end': `bottom: -8px; right: -1px; left: auto; transform: none; border: none; border-right: ${B}; background: ${grad(45)}; clip-path: polygon(0% 0%, 100% 0%, 100% 100%);`,
      'left-start': `right: -8px; top: -1px; transform: none; border: none; border-top: ${B}; background: ${grad(135)}; clip-path: polygon(0% 0%, 100% 0%, 0% 100%);`,
      'left-end': `right: -8px; bottom: -1px; top: auto; transform: none; border: none; border-bottom: ${B}; background: ${grad(45)}; clip-path: polygon(0% 0%, 0% 100%, 100% 100%);`,
      'right-start': `left: -8px; top: -1px; transform: none; border: none; border-top: ${B}; background: ${grad(45)}; clip-path: polygon(0% 0%, 100% 0%, 100% 100%);`,
      'right-end': `left: -8px; bottom: -1px; top: auto; transform: none; border: none; border-bottom: ${B}; background: ${grad(135)}; clip-path: polygon(100% 0%, 0% 100%, 100% 100%);`,
    }
    for (const [p, decl] of Object.entries(rules)) {
      expect(css, `merge ${p} 箭头应为直角三角贴角共边（斜边渐变描边）`).toContain(
        `.panel[data-placement='${p}'][data-arrow-merge] .arrow { ${decl} }`,
      )
    }
    // 旧「菱形骑角」规则（基向前缀 + 半宽 -4px 骑角）不得残留
    expect(css).not.toMatch(/\[data-placement\^='bottom'\]\[data-arrow-merge\] \.arrow/)
    expect(css).not.toMatch(/\[data-placement\^='top'\]\[data-arrow-merge\] \.arrow/)
    expect(css).not.toMatch(/\[data-placement\^='left'\]\[data-arrow-merge\] \.arrow/)
    expect(css).not.toMatch(/\[data-placement\^='right'\]\[data-arrow-merge\] \.arrow/)
  })

  it('arrow-merge 斜边渐变角度几何：斜边精确落渐变 50% 等值线（45° 斜边配 45deg、反斜配 135deg）', () => {
    // 盒 8x8：斜边 (0%,0%)→(100%,100%)（主对角线）时轴 (1,-1)=45deg 命中；
    // 斜边 (100%,0%)→(0%,100%)（反对角线）时轴 (1,1)=135deg 命中。
    // 45/135deg 渐变的 gradient line 沿对角方向、长度 8√2，斜边恰在 50% 处（垂直于轴）
    const diagonalOf: Record<string, 'main' | 'anti'> = {
      'bottom-start': 'main',
      'bottom-end': 'anti',
      'top-start': 'anti',
      'top-end': 'main',
      'left-start': 'anti',
      'left-end': 'main',
      'right-start': 'main',
      'right-end': 'anti',
    }
    const css = mergeCss(mount())
    for (const [p, diag] of Object.entries(diagonalOf)) {
      const angle = diag === 'main' ? 45 : 135
      const m = css.match(
        new RegExp(
          `\\.panel\\[data-placement='${p}'\\]\\[data-arrow-merge\\] \\.arrow \\{ [^}]*background: linear-gradient\\((\\d+)deg`,
        ),
      )
      expect(m, `merge ${p} 应有斜边渐变`).not.toBeNull()
      expect(Number(m![1]), `merge ${p} 斜边 ${diag} 对角线应配 ${angle}deg 渐变`).toBe(angle)
    }
  })

  it('arrow-merge 8 向三角几何：直角顶点贴面板角、两直角边与角两边共线、尖端正交外探 8px 指向锚点侧', () => {
    const css = mergeCss(mount())
    // 每向：clip-path 顶点（盒内 8×8 百分比坐标）→ 面板角点位于盒的哪个角 + 三角朝向
    // corner: 面板角点在箭头盒内的位置；edge: 贴边腿顶点相对角点的位移（沿面板边向内 8px，
    // 该腿与面板真实边段共边）；tip: 尖端相对角点的正交位移 8px（指向锚点侧）
    const geom: Record<
      string,
      { corner: [number, number]; edge: [number, number]; tip: [number, number] }
    > = {
      // bottom 系：盒悬顶边上方 → 角点在盒底边；start 贴左（贴边腿向右）、end 贴右（向左）；尖端朝上
      'bottom-start': { corner: [0, 8], edge: [8, 0], tip: [0, -8] },
      'bottom-end': { corner: [8, 8], edge: [-8, 0], tip: [0, -8] },
      // top 系：盒悬底边下方 → 角点在盒顶边；尖端朝下
      'top-start': { corner: [0, 0], edge: [8, 0], tip: [0, 8] },
      'top-end': { corner: [8, 0], edge: [-8, 0], tip: [0, 8] },
      // left 系：盒悬右边右侧 → 角点在盒左边；贴边腿沿面板右边（start 向下、end 向上）；尖端朝右
      'left-start': { corner: [0, 0], edge: [0, 8], tip: [8, 0] },
      'left-end': { corner: [0, 8], edge: [0, -8], tip: [8, 0] },
      // right 系：盒悬左边左侧 → 角点在盒右边；尖端朝左
      'right-start': { corner: [8, 0], edge: [0, 8], tip: [-8, 0] },
      'right-end': { corner: [8, 8], edge: [0, -8], tip: [-8, 0] },
    }
    // 从 STYLE 文本解析某 placement 的 clip-path 顶点（百分比 → 8×8 盒内 px 坐标）
    const verticesOf = (p: string): Array<[number, number]> => {
      const m = css.match(
        new RegExp(
          `\\.panel\\[data-placement='${p}'\\]\\[data-arrow-merge\\] \\.arrow \\{ [^}]*clip-path: polygon\\(([^)]+)\\)`,
        ),
      )
      if (!m) throw new Error(`merge ${p} 规则缺失`)
      return m[1]!.split(',').map((v) => {
        const [xs, ys] = v.trim().split(/\s+/)
        return [(parseFloat(xs!) / 100) * 8, (parseFloat(ys!) / 100) * 8] as [number, number]
      })
    }
    const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6
    for (const [p, { corner, edge, tip }] of Object.entries(geom)) {
      const vs = verticesOf(p)
      expect(vs.length, `${p} clip-path 应为三角（3 顶点）`).toBe(3)
      // 找直角顶点：与另两顶点构成的向量内积为 0
      const rightIdx = vs.findIndex((v, i) => {
        const a = vs[(i + 1) % 3]!
        const b = vs[(i + 2) % 3]!
        return near((a[0] - v[0]) * (b[0] - v[0]) + (a[1] - v[1]) * (b[1] - v[1]), 0)
      })
      expect(rightIdx, `${p} clip-path 应含直角顶点`).toBeGreaterThanOrEqual(0)
      const rv = vs[rightIdx]!
      // 直角顶点精确落面板角点（角点在盒内的已知位置）
      expect(near(rv[0], corner[0]) && near(rv[1], corner[1]), `${p} 直角顶点应落面板角点`).toBe(
        true,
      )
      // 另两顶点：一个沿面板边向内 8px（贴边腿与面板真实边段共边）、一个为尖端
      // （角点 + 正交位移 8px 指向锚点侧）
      const others = vs.filter((_, i) => i !== rightIdx)
      const isEdge = (v: [number, number]): boolean =>
        near(v[0] - rv[0], edge[0]) && near(v[1] - rv[1], edge[1])
      const isTip = (v: [number, number]): boolean =>
        near(v[0] - rv[0], tip[0]) && near(v[1] - rv[1], tip[1])
      expect(
        (isEdge(others[0]!) && isTip(others[1]!)) || (isTip(others[0]!) && isEdge(others[1]!)),
        `${p} 两直角边应分别与面板边共边（向内 8px）与正交外探尖端（8px）`,
      ).toBe(true)
    }
  })

  it('arrow-merge + arrow-point-at-center：箭头钉死角点，不写内联偏移（直角三角不脱离角）', () => {
    const el = mount({
      open: '',
      placement: 'bottom-start',
      'arrow-merge': '',
      'arrow-point-at-center': '',
    })
    const p = panelOf(el)
    stubPanelRect(p, 240, 60)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 12, top: 300, width: 64, height: 32 }) // 锚点中心≠面板中心（有内联偏移动机）
    setViewport(1280, 800)
    el.setAttribute('content', 'x') // 触发重定位
    const arrow = p.querySelector<HTMLElement>('[data-popper-arrow]')!
    expect(arrow.style.getPropertyValue('--arrow-x')).toBe('')
    expect(arrow.style.getPropertyValue('--arrow-y')).toBe('')
  })
})

describe('OASPopover title 吸收（消除宿主原生 tooltip）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => unmountAll())

  it('挂载后宿主不再残留 title 属性，标题照常渲染进面板标题区', () => {
    const el = mount({ open: '', title: '面板标题' })
    expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
    expect(panelOf(el).querySelector('[part="title"]')!.textContent).toBe('面板标题')
    // aria-labelledby 仍指向标题区（无障碍语义不受吸收影响）
    expect(panelOf(el).getAttribute('aria-labelledby')).toBe('pop-title')
  })

  it('吸收触发的二次 update 幂等（标题不丢失）', () => {
    const el = mount({ open: '', title: '面板标题' })
    el.setAttribute('content', '新内容') // 触发二次 update
    expect(panelOf(el).querySelector('[part="title"]')!.textContent).toBe('面板标题')
    expect(el.hasAttribute('title')).toBe(false)
  })

  it('打开态运行时改 title 属性：新值吸收渲染，宿主仍无残留', () => {
    const el = mount({ open: '', title: '旧标题' })
    el.setAttribute('title', '新标题')
    expect(panelOf(el).querySelector('[part="title"]')!.textContent).toBe('新标题')
    expect(el.hasAttribute('title')).toBe(false)
  })

  it('title="" 清空标题（属性在场=宿主意图），头部折叠', () => {
    const el = mount({ open: '', title: '面板标题' })
    el.setAttribute('title', '')
    expect(panelOf(el).querySelector('[part="title"]')!.textContent).toBe('')
    expect(panelOf(el).querySelector('.head')!.classList.contains('oas-empty')).toBe(true)
    expect(el.hasAttribute('title')).toBe(false)
  })

  it('无 fresh：关闭态冻结对缓存生效——title 不重写不吸收，打开时写入最新', () => {
    const el = mount({ title: '旧' })
    expect(panelOf(el).querySelector('[part="title"]')!.textContent).toBe('旧')
    expect(el.hasAttribute('title')).toBe(false)
    // 关闭态（非 fresh）改 title：冻结 gate 拦住缓存更新与吸收（宿主暂留属性，语义不变）
    el.setAttribute('title', '新')
    expect(panelOf(el).querySelector('[part="title"]')!.textContent).toBe('旧')
    // 打开：不冻结 → 吸收新值渲染
    el.setAttribute('open', '')
    expect(panelOf(el).querySelector('[part="title"]')!.textContent).toBe('新')
    expect(el.hasAttribute('title')).toBe(false)
  })

  it('fresh：关闭态也持续吸收更新', () => {
    const el = mount({ title: 'x', fresh: '' })
    expect(panelOf(el).querySelector('[part="title"]')!.textContent).toBe('x')
    expect(el.hasAttribute('title')).toBe(false)
    el.setAttribute('title', '新')
    expect(panelOf(el).querySelector('[part="title"]')!.textContent).toBe('新')
    expect(el.hasAttribute('title')).toBe(false)
  })

    it('水合恢复：快照标题区有文本时恢复缓存，水合后标题不丢失', () => {
      const ref = new OASPopover()
      ref.setAttribute('title', '水合标题')
      ref.innerHTML = '<button>触发</button>'
      document.body.appendChild(ref)
      const snap = ref.shadowRoot!.innerHTML
      ref.remove()

      const el = new OASPopover()
      el.innerHTML = '<button>触发</button>'
      el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-popover" data-oas-ssr-v="1">${snap}`
      document.body.appendChild(el)
      expect(
        el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!.querySelector(
          '[part="title"]',
        )!.textContent,
      ).toBe('水合标题')
      expect(el.hasAttribute('title')).toBe(false)
      el.remove()
    })
  })

  describe('OASPopover title 双通道（slot="title" 富内容覆盖属性文本）', () => {
    it('slot 有内容时覆盖属性文本（兜底隐藏、插槽渲染、aria 保持可访问名）', () => {
      const el = new OASPopover()
      el.setAttribute('open', '')
      el.setAttribute('title', '属性标题')
      el.innerHTML = `<button>触发</button><b slot="title">富标题</b>`
      document.body.appendChild(el)
      mounted.push(el)
      const p = panelOf(el)
      const slot = p.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = p.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      // 属性仍被吸收缓存（兜底隐而不删），宿主无残留原生悬浮提示
      expect(fallback.textContent).toBe('属性标题')
      expect(el.hasAttribute('title')).toBe(false)
      // aria-labelledby 关联标题区容器（含插槽内容）→ 富内容同样构成面板可访问名
      expect(p.getAttribute('aria-labelledby')).toBe('pop-title')
    })

    it('仅 slot 无属性：标题区渲染插槽内容，head 不折叠', () => {
      const el = new OASPopover()
      el.setAttribute('open', '')
      el.innerHTML = `<button>触发</button><span slot="title">插槽标题</span>`
      document.body.appendChild(el)
      mounted.push(el)
      const p = panelOf(el)
      const slot = p.querySelector<HTMLSlotElement>('slot[name="title"]')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(p.querySelector<HTMLElement>('.title-text')!.hidden).toBe(true)
      expect(p.querySelector('.head')!.classList.contains('oas-empty')).toBe(false)
      expect(p.getAttribute('aria-labelledby')).toBe('pop-title')
    })

    it('双空（无 title 无 slot）：头部折叠保持（oas-empty）', () => {
      const el = mount({ open: '' })
      const p = panelOf(el)
      expect(p.querySelector<HTMLElement>('.title-text')!.textContent).toBe('')
      expect(p.querySelector<HTMLElement>('.title-text')!.hidden).toBe(false)
      expect(p.querySelector('.head')!.classList.contains('oas-empty')).toBe(true)
      expect(p.hasAttribute('aria-labelledby')).toBe(false)
    })

    it('fresh 冻结：关闭态 slot 变更不重写面板（冻结语义回归），打开后以插槽为准', async () => {
      const el = mount() // 关闭、非 fresh
      const p = panelOf(el)
      // 初始写入已完成（contentWritten=true），关闭态非 fresh → 冻结
      expect(p.querySelector('.head')!.classList.contains('oas-empty')).toBe(true)
      // 关闭态加 slot 标题：slotchange 被冻结 gate 拦截 → 面板不被重写（头部仍折叠、aria 不新增）
      const rich = document.createElement('b')
      rich.setAttribute('slot', 'title')
      rich.textContent = '富标题'
      el.appendChild(rich)
      await new Promise((r) => setTimeout(r, 0))
      expect(p.querySelector('.head')!.classList.contains('oas-empty')).toBe(true)
      expect(p.querySelector<HTMLElement>('.title-text')!.hidden).toBe(false)
      expect(p.hasAttribute('aria-labelledby')).toBe(false)
      // 打开：解除冻结 → slot 生效（兜底隐藏、head 展开、aria 就位）
      el.setAttribute('open', '')
      expect(p.querySelector<HTMLElement>('.title-text')!.hidden).toBe(true)
      expect(p.querySelector('.head')!.classList.contains('oas-empty')).toBe(false)
      expect(p.getAttribute('aria-labelledby')).toBe('pop-title')
    })

    it('fresh 开启：关闭态 slot 变更即生效（不被冻结）', async () => {
      const el = mount({ fresh: '' })
      const p = panelOf(el)
      const rich = document.createElement('b')
      rich.setAttribute('slot', 'title')
      rich.textContent = '富标题'
      el.appendChild(rich)
      await new Promise((r) => setTimeout(r, 0))
      expect(p.querySelector<HTMLElement>('.title-text')!.hidden).toBe(true)
      expect(p.querySelector('.head')!.classList.contains('oas-empty')).toBe(false)
      expect(p.getAttribute('aria-labelledby')).toBe('pop-title')
    })

    it('动态移除 slot 内容后回落属性文本（头部状态同步）', async () => {
      const el = new OASPopover()
      el.setAttribute('open', '')
      el.setAttribute('title', '属性标题')
      el.innerHTML = `<button>触发</button><span slot="title">插槽标题</span>`
      document.body.appendChild(el)
      mounted.push(el)
      const p = panelOf(el)
      const fallback = p.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(true)
      const node = el.querySelector('span[slot="title"]')!
      el.removeChild(node)
      await new Promise((r) => setTimeout(r, 0))
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('属性标题')
      expect(p.getAttribute('aria-labelledby')).toBe('pop-title')
    })

    it('append-to portal 期间 title slot 桥接（跨 host 分配不断供），关闭移回宿主', () => {
      const el = mount({ open: '', 'append-to': 'body' })
      const rich = document.createElement('b')
      rich.setAttribute('slot', 'title')
      rich.textContent = '富标题'
      el.appendChild(rich)
      el.setAttribute('content', 'x') // 触发 update 桥接
      const host = document.querySelector<HTMLElement>('[data-oas-popover-portal]')!
      expect(host.contains(rich)).toBe(true)
      const p = el.shadowRoot!.querySelector('[part="panel"]') ??
        document.querySelector<HTMLElement>('[data-oas-popover-portal]')?.shadowRoot?.querySelector('[part="panel"]')
      const slot = p!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      expect(slot.assignedNodes()).toContain(rich)
      el.removeAttribute('open')
      expect(el.contains(rich)).toBe(true)
    })
  })

// ============================================================================
// 能力增强（P1-P25，2026-09 批次）
// ============================================================================

/** 构造带 touches 的 touch 事件（happy-dom 不完整支持 Touch，挂数组兜底；同 context-menu 测试） */
function touchEvent(
  type: string,
  touches: Array<{ clientX: number; clientY: number }>,
): Event {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(e, 'touches', { value: touches })
  return e
}

/** 非原生 button 锚点挂载（trigger-keys 默认值 / 幂等守卫场景：div 锚点不合成 click） */
function mountDivAnchor(attrs: Record<string, string> = {}): OASPopover {
  const el = new OASPopover()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = '<div tabindex="0">触发</div>'
  document.body.appendChild(el)
  mounted.push(el)
  return el
}

describe('OASPopover P1 触发元素 ARIA 关联', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('绑定时机：锚点同步 aria-haspopup="dialog"', () => {
    const el = mount()
    const btn = el.querySelector('button')!
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog')
  })

  it('开/关时机：aria-expanded 随 open 同步，aria-controls 指向面板 id（文档唯一）', () => {
    const el = mount()
    const btn = el.querySelector('button')!
    el.setAttribute('open', '')
    const p = panelOf(el)
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    expect(p.id).toBeTruthy()
    expect(btn.getAttribute('aria-controls')).toBe(p.id)
    el.removeAttribute('open')
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    // 关闭后 aria-controls 保留指向（面板仍在 DOM，关联关系不变）
    expect(btn.getAttribute('aria-controls')).toBe(p.id)
  })

  it('多实例面板 id 不冲突', () => {
    const a = mount()
    const b = mount()
    a.setAttribute('open', '')
    b.setAttribute('open', '')
    expect(panelOf(a).id).not.toBe(panelOf(b).id)
  })

  it('virtual 模式不写触发元素 ARIA（宿主自管触发器）', () => {
    const el = mount({ virtual: '' })
    const btn = el.querySelector('button')!
    expect(btn.hasAttribute('aria-haspopup')).toBe(false)
    expect(btn.hasAttribute('aria-expanded')).toBe(false)
  })
})

describe('OASPopover P2 trigger-keys 默认 Enter/Space', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('未设置 trigger-keys：div 锚点 Enter / Space 默认切换开合', () => {
    const el = mountDivAnchor()
    const div = el.querySelector('div')!
    div.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.hasAttribute('open')).toBe(true)
    div.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.hasAttribute('open')).toBe(false)
    div.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('未设置 trigger-keys：非 Enter/Space 按键不响应', () => {
    const el = mountDivAnchor()
    el.querySelector('div')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true }),
    )
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('幂等守卫：原生 button 锚点 keydown(Enter) 立即切换，同一次按键的合成 click 被吞没', () => {
    const el = mount() // 默认锚点 <button>，trigger 含 click
    const btn = el.querySelector('button')!
    // 模拟浏览器对 button Enter 的完整派发序列：keydown（preventDefault + toggle）→ 合成 click。
    // 守卫：keydown 已切换（open=true），随后同一次按键的合成 click 在时间窗内被吞没，不闪断
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.hasAttribute('open')).toBe(true)
    btn.click() // 同一次按键的合成 click → 吞没
    expect(el.hasAttribute('open')).toBe(true)
    // 第二轮：关闭方向同样单次切换
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.hasAttribute('open')).toBe(false)
    btn.click()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('幂等守卫：Space 在 button 上同样单次切换（合成 click 吞没）', () => {
    const el = mount()
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
    expect(el.hasAttribute('open')).toBe(true)
    btn.click()
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('时间窗外的独立 click 正常切换（守卫不误伤）', () => {
    const el = mount()
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.hasAttribute('open')).toBe(true)
    // 模拟时间窗外的一次全新 click（真实用户隔 350ms+ 的再次点击）
    ;(el as unknown as Record<string, number>).lastKeydownToggle = -1e6
    btn.click()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('幂等守卫：trigger 不含 click 时 keydown 直接 toggle（无 click 路径可让位）', () => {
    const el = mount({ trigger: 'manual' })
    // trigger=manual：鼠标路径全关，但 trigger-keys 键盘路径仍可用（与现状语义一致）
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('按键重复（e.repeat）不重复触发', () => {
    const el = mountDivAnchor()
    const div = el.querySelector('div')!
    div.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, repeat: true }),
    )
    // repeat 的第一次 keydown 视为持续按住的重复事件，不触发
    expect(el.hasAttribute('open')).toBe(false)
    div.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.hasAttribute('open')).toBe(true)
    // 按住不放的后续 repeat 不把面板关掉
    div.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, repeat: true }),
    )
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('trigger-keys 可覆盖默认（设置后只响应指定键）', () => {
    const el = mountDivAnchor({ 'trigger-keys': 'F2' })
    const div = el.querySelector('div')!
    div.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.hasAttribute('open')).toBe(false)
    div.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true, cancelable: true }))
    expect(el.hasAttribute('open')).toBe(true)
  })
})

describe('OASPopover P3 trap-focus 独立开关', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('trap-focus（无 modal）：Tab/Shift+Tab 在面板内循环，且不出现遮罩', () => {
    const el = mount({ open: '', 'trap-focus': '' })
    const a = document.createElement('button')
    a.setAttribute('slot', 'content')
    const b = document.createElement('button')
    b.setAttribute('slot', 'content')
    el.appendChild(a)
    el.appendChild(b)
    el.setAttribute('content', 'x') // 触发 update
    b.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(a)
    a.focus()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    )
    expect(document.activeElement).toBe(b)
    expect(el.shadowRoot!.querySelector('.backdrop')!.classList.contains('oas-show')).toBe(false)
  })

  it('trap-focus 关闭后解除陷阱', () => {
    const el = mount({ open: '', 'trap-focus': '' })
    const a = document.createElement('button')
    a.setAttribute('slot', 'content')
    el.appendChild(a)
    el.setAttribute('content', 'x')
    el.removeAttribute('open')
    const out = document.createElement('button')
    document.body.appendChild(out)
    out.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(out) // 不再被拉回
  })

  it('modal + trap-focus 叠加幂等：陷阱只挂一份、关闭恰好解一次', () => {
    const el = mount({ open: '', modal: '', 'trap-focus': '' })
    const a = document.createElement('button')
    a.setAttribute('slot', 'content')
    el.appendChild(a)
    el.setAttribute('content', 'x') // open 期间二次 update 不重复挂
    const out = document.createElement('button')
    document.body.appendChild(out)
    out.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(a)
    el.removeAttribute('open')
    out.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(out)
  })

  it('默认（无 trap-focus 无 modal）：无焦点陷阱', () => {
    const el = mount({ open: '' })
    const out = document.createElement('button')
    document.body.appendChild(out)
    out.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(out)
  })
})

describe('OASPopover P4 外点 / Esc 关闭开关', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('close-on-outside="false"：外部点击不关闭（默认 true 保持现行为）', () => {
    const el = mount({ open: '', 'close-on-outside': 'false' })
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(true)
    // 对照：默认外点关闭
    const other = mount({ open: '' })
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(other.hasAttribute('open')).toBe(false)
  })

  it('close-on-escape="false"：Esc 不关闭该层（默认 true 保持现行为）', async () => {
    const el = mount({ open: '', 'close-on-escape': 'false' })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(el.hasAttribute('open')).toBe(true)
    const other = mount({ open: '' })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await sleep(220)
    expect(other.hasAttribute('open')).toBe(false)
  })

  it('Esc 栈跳过禁 Esc 层：禁 Esc 的下层打开时，Esc 关闭的是栈内最近可关层', async () => {
    // 先开禁 Esc 层（栈底），再开普通层（栈顶）：Esc 只关普通层
    const muted = mount({ open: '', 'close-on-escape': 'false', title: 'm' })
    const normal = mount({ open: '', title: 'n' })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await sleep(220)
    expect(normal.hasAttribute('open')).toBe(false)
    expect(muted.hasAttribute('open')).toBe(true)
    expect(normal).toBeTruthy()
  })
})

describe('OASPopover P5 可取消 oas-before-close', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  /** 挂 preventDefault 拦截器，返回收集到的 source 列表 */
  function intercept(el: OASPopover): string[] {
    const sources: string[] = []
    el.addEventListener('oas-before-close', (e) => {
      sources.push((e as CustomEvent<{ source: string }>).detail.source)
      e.preventDefault()
    })
    return sources
  }

  it('事件 cancelable：preventDefault 后触发路径不关闭', async () => {
    const el = mount({ 'close-delay': '0' })
    const sources = intercept(el)
    const btn = el.querySelector('button')!
    btn.click() // 开
    expect(el.hasAttribute('open')).toBe(true)
    btn.click() // 关（trigger 路径，被拦）
    expect(el.hasAttribute('open')).toBe(true)
    expect(sources).toContain('trigger')
  })

  it('外点路径被拦截不关闭', () => {
    const el = mount({ open: '' })
    intercept(el)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('Esc 路径被拦截不关闭', () => {
    const el = mount({ open: '' })
    intercept(el)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('关闭按钮 / 声明式关层 / backdrop 路径被拦截不关闭', () => {
    const el = mount({ open: '', closable: '', modal: '', title: 'x' })
    intercept(el)
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="close"]')!.click()
    expect(el.hasAttribute('open')).toBe(true)
    const inner = document.createElement('button')
    inner.setAttribute('slot', 'content')
    inner.setAttribute('data-popover', 'close')
    el.appendChild(inner)
    inner.click()
    expect(el.hasAttribute('open')).toBe(true)
    el.shadowRoot!.querySelector<HTMLElement>('.backdrop')!.click()
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('auto-close 路径被拦截不关闭', async () => {
    const el = mount({ open: '', 'auto-close': '60' })
    intercept(el)
    await sleep(120)
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('未拦截时正常关闭且 detail.source 正确（外点 = outside）', () => {
    const el = mount({ open: '' })
    const sources: string[] = []
    el.addEventListener('oas-before-close', (e) =>
      sources.push((e as CustomEvent<{ source: string }>).detail.source),
    )
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(false)
    expect(sources).toEqual(['outside'])
  })

  it('拦截与 P2 幂等守卫互斥场景：before-close 拦截后再次触发 Enter→click 走完整关闭流（仍被拦）', () => {
    const el = mount()
    const btn = el.querySelector('button')!
    intercept(el)
    btn.click() // 开
    btn.click() // 关被拦（source=trigger）
    expect(el.hasAttribute('open')).toBe(true)
    btn.click() // 此时 open 仍为 true → 再关（仍被拦，open 不震荡）
    expect(el.hasAttribute('open')).toBe(true)
  })
})

describe('OASPopover P6 size 尺寸变体', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('size 写 data-size，默认 medium', () => {
    const el = mount({ open: '' })
    expect(panelOf(el).getAttribute('data-size')).toBe('medium')
  })

  it('small / large 档位生效', () => {
    expect(panelOf(mount({ open: '', size: 'small' })).getAttribute('data-size')).toBe('small')
    expect(panelOf(mount({ open: '', size: 'large' })).getAttribute('data-size')).toBe('large')
  })

  it('非法值回落 medium', () => {
    expect(panelOf(mount({ open: '', size: 'huge' })).getAttribute('data-size')).toBe('medium')
  })

  it('尺寸档 CSS 规则走 token（padding / min-width / 字号分档）', () => {
    const css = mount().shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/\.panel\[data-size='small'\]/)
    expect(css).toMatch(/\.panel\[data-size='large'\]/)
    expect(css).toMatch(/--oas-popover-padding/)
  })
})

describe('OASPopover P7 description 插槽', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('slot="description" 渲染且面板 aria-describedby 关联', () => {
    const el = mount({ open: '', title: 'x' })
    const desc = document.createElement('p')
    desc.setAttribute('slot', 'description')
    desc.textContent = '补充说明'
    el.appendChild(desc)
    el.setAttribute('content', 'x') // 触发 update
    const p = panelOf(el)
    const descBox = p.querySelector('[part="description"]')!
    expect(descBox).not.toBeNull()
    // slot 分配判定（shadow 容器 textContent 不含分配内容）
    expect(descBox.querySelector<HTMLSlotElement>('slot[name="description"]')!.assignedNodes()).toContain(desc)
    expect(p.getAttribute('aria-describedby')).toBeTruthy()
    expect(p.getAttribute('aria-describedby')).toBe(descBox.id)
  })

  it('无 description：不渲染关联、无 aria-describedby', () => {
    const el = mount({ open: '', title: 'x' })
    expect(panelOf(el).hasAttribute('aria-describedby')).toBe(false)
  })

  it('description 移除后 aria-describedby 同步摘除', async () => {
    const el = mount({ open: '', title: 'x' })
    const desc = document.createElement('p')
    desc.setAttribute('slot', 'description')
    desc.textContent = '说明'
    el.appendChild(desc)
    el.setAttribute('content', 'x')
    expect(panelOf(el).hasAttribute('aria-describedby')).toBe(true)
    desc.remove()
    await new Promise((r) => setTimeout(r, 0))
    expect(panelOf(el).hasAttribute('aria-describedby')).toBe(false)
  })
})

describe('OASPopover P8 面板 CSS 变量暴露', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('面板 bg/border/阴影/圆角/内边距变量走 --oas-popover-*（fallback token，dark 自动跟随）', () => {
    const css = mount().shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/--pop-bg:\s*var\(--oas-popover-bg,\s*var\(--oas-color-bg\)\)/)
    expect(css).toMatch(/--pop-border:\s*var\(--oas-popover-border,\s*var\(--oas-color-border\)\)/)
    expect(css).toMatch(/box-shadow:\s*var\(--oas-popover-shadow,/)
    expect(css).toMatch(/border-radius:\s*var\(--oas-popover-radius,\s*var\(--oas-radius-md\)\)/)
    expect(css).toMatch(/padding:\s*var\(--oas-popover-padding,/)
    expect(css).toMatch(/min-width:\s*var\(--oas-popover-min-width,/)
  })
})

describe('OASPopover P9 available-height / P10 scrollable', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('available-height：面板 max-height 约束为视口剩余空间（主轴方向）', () => {
    const el = mount({ open: '', 'available-height': '', placement: 'bottom' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    // 底部剩余：800 - (300+32) - 8(gap) - 4(pad) = 456
    expect(p.style.maxHeight).toBe('456px')
  })

  it('available-height：top 向按锚点上方剩余空间', () => {
    const el = mount({ open: '', 'available-height': '', placement: 'top' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    // 上方剩余：300 - 8 - 4 = 288
    expect(p.style.maxHeight).toBe('288px')
  })

  it('available-height 未开启：不写 max-height（现行为不变）', () => {
    const el = mount({ open: '', placement: 'bottom' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    expect(p.style.maxHeight).toBe('')
  })

  it('scrollable：面板挂 data-scrollable，CSS 走 body 区滚动（head/foot 固定）', () => {
    const el = mount({ open: '', scrollable: '', placement: 'bottom' })
    const p = panelOf(el)
    expect(p.hasAttribute('data-scrollable')).toBe(true)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/\.panel\[data-scrollable\][\s\S]*?overflow-y:\s*auto/)
  })

  it('scrollable 单独开启：max-height 兜底视口约束（滚动有界）', () => {
    const el = mount({ open: '', scrollable: '', placement: 'bottom' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    expect(p.style.maxHeight).toBe('456px')
  })
})

describe('OASPopover P11 header / footer 插槽', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('slot="header" 有内容时接管头部（title 兜底隐藏）', () => {
    const el = mount({ open: '', title: '属性标题' })
    const header = document.createElement('div')
    header.setAttribute('slot', 'header')
    header.textContent = '自定义头部'
    el.appendChild(header)
    el.setAttribute('content', 'x')
    const p = panelOf(el)
    const headerSlot = p.querySelector<HTMLSlotElement>('slot[name="header"]')!
    expect(headerSlot.assignedNodes()).toContain(header)
    expect(p.querySelector<HTMLElement>('.title-text')!.hidden).toBe(true)
  })

  it('slot="footer" 有内容时显示 foot 区，无内容不显示', () => {
    const el = mount({ open: '' })
    el.setAttribute('content', 'x')
    const p = panelOf(el)
    const foot = p.querySelector<HTMLElement>('[part="foot"]')!
    expect(foot).not.toBeNull()
    expect(foot.classList.contains('oas-empty')).toBe(true)
    const footer = document.createElement('div')
    footer.setAttribute('slot', 'footer')
    footer.textContent = '底部操作'
    el.appendChild(footer)
    el.setAttribute('content', 'y')
    expect(foot.classList.contains('oas-empty')).toBe(false)
    expect(foot.querySelector<HTMLSlotElement>('slot[name="footer"]')!.assignedNodes()).toContain(footer)
  })

  it('header/footer 与 title/content 并存（互不挤占）', () => {
    const el = mount({ open: '', title: 'T', content: 'C' })
    el.innerHTML = '<button>触发</button><div slot="header">H</div><div slot="footer">F</div>'
    el.setAttribute('open', '')
    const p = panelOf(el)
    expect(p.querySelector<HTMLSlotElement>('slot[name="header"]')!.assignedNodes().length).toBeGreaterThan(0)
    expect(p.querySelector('[part="content"]')!.textContent).toBe('C')
    expect(p.querySelector<HTMLSlotElement>('slot[name="footer"]')!.assignedNodes().length).toBeGreaterThan(0)
  })
})

describe('OASPopover P13 final-focus（关闭后焦点归还目标）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('final-focus 选择器：Esc 关闭后焦点到指定元素（非触发元素）', () => {
    const other = document.createElement('button')
    other.id = 'pop-final-target'
    document.body.appendChild(other)
    const el = mount({ open: '', 'final-focus': '#pop-final-target' })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(document.activeElement).toBe(other)
  })

  it('finalFocusEl property 优先于 final-focus 选择器与触发元素', () => {
    const viaProp = document.createElement('button')
    viaProp.id = 'pop-final-prop'
    document.body.appendChild(viaProp)
    const el = mount({ open: '', 'final-focus': '#pop-final-prop' })
    const viaAttr = document.createElement('button')
    viaAttr.id = 'pop-final-attr'
    document.body.appendChild(viaAttr)
    el.setAttribute('final-focus', '#pop-final-attr')
    el.finalFocusEl = viaProp
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(document.activeElement).toBe(viaProp)
  })

  it('未配置时维持现行为：归还触发元素', () => {
    const el = mount({ open: '' })
    const trigger = el.querySelector('button')!
    trigger.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(document.activeElement).toBe(trigger)
  })
})

describe('OASPopover P14 close-on-scroll', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('close-on-scroll：打开期间页面滚动即关闭（默认关闭，现行为是跟随重定位）', async () => {
    const el = mount({ open: '', 'close-on-scroll': '', placement: 'bottom' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    setScrollY(300); window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('默认（未开启）：滚动不关闭，跟随重定位（现行为回归）', async () => {
    const el = mount({ open: '', placement: 'bottom' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    setScrollY(300); window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(el.hasAttribute('open')).toBe(true)
  })
})

describe('OASPopover P15 hide-empty（无内容隐藏面板）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('无 title/content/slot 内容：触发路径不打开（open 属性不挂）', () => {
    const el = mount({ 'hide-empty': '' })
    el.querySelector('button')!.click()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('受控强开：面板保持隐藏（aria-hidden=true，无空白面板）', () => {
    const el = mount({ open: '', 'hide-empty': '' })
    expect(panelOf(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('有内容正常打开（title 或 content 任一即可）', () => {
    const a = mount({ 'hide-empty': '', title: 'x' })
    a.querySelector('button')!.click()
    expect(panelOf(a).getAttribute('aria-hidden')).toBe('false')
    const b = mount({ 'hide-empty': '', content: 'x' })
    b.querySelector('button')!.click()
    expect(panelOf(b).getAttribute('aria-hidden')).toBe('false')
  })

  it('slot 内容（content/header/footer/description）也算有内容', () => {
    const el = mount({ 'hide-empty': '' })
    const s = document.createElement('div')
    s.setAttribute('slot', 'content')
    s.textContent = 'x'
    el.appendChild(s)
    el.querySelector('button')!.click()
    expect(el.hasAttribute('open')).toBe(true)
  })
})

describe('OASPopover P18 sticky（关闭位粘滞三档）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('默认 partial：滚动跟随重定位（现行为不变）', async () => {
    const el = mount({ open: '', placement: 'bottom' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    expect(p.style.top).toBe('340px')
    stubRect(el.querySelector('button')!, { left: 400, top: 250, width: 80, height: 32 })
    setScrollY(300); window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(p.style.top).toBe('290px')
  })

  it('sticky="off"：滚动不跟随（面板原地不动）', async () => {
    const el = mount({ open: '', sticky: 'off', placement: 'bottom' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    expect(p.style.top).toBe('340px')
    stubRect(el.querySelector('button')!, { left: 400, top: 250, width: 80, height: 32 })
    setScrollY(300); window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(p.style.top).toBe('340px')
  })

  it('sticky="always"：锚点滚出视口后面板贴视口边缘不消失', async () => {
    const el = mount({ open: '', sticky: 'always', placement: 'bottom' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    expect(p.style.top).toBe('340px')
    // 锚点滚出视口底：面板贴视口（clamp 到 800-60-4=736 内）
    stubRect(el.querySelector('button')!, { left: 400, top: 900, width: 80, height: 32 })
    setScrollY(300); window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(p.hidden).toBe(false)
    expect(parseFloat(p.style.top)).toBeLessThanOrEqual(736)
  })

  it('sticky="always" + hide-when-detached：always 优先，锚点滚出不隐藏', async () => {
    const el = mount({ open: '', sticky: 'always', 'hide-when-detached': '', placement: 'bottom' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    stubRect(el.querySelector('button')!, { left: 400, top: 900, width: 80, height: 32 })
    setScrollY(300); window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(p.hidden).toBe(false)
  })

  it('sticky="always" 打开瞬间就贴边：打开时锚点已脱离视口，面板直接贴视口边缘', () => {
    const el = mount({ sticky: 'always', placement: 'bottom' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 900, width: 80, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('open', '')
    expect(p.hidden).toBe(false)
    expect(parseFloat(p.style.top)).toBeLessThanOrEqual(736)
  })
})

describe('OASPopover P20 contextmenu 光标定位 + 触屏长按', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('contextmenu 触发：面板定位到光标坐标（非锚点矩形）', () => {
    const el = mount({ trigger: 'contextmenu', placement: 'right' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.querySelector('button')!.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 600,
        clientY: 200,
      }),
    )
    expect(el.hasAttribute('open')).toBe(true)
    expect(p.getAttribute('data-placement')).toBe('right')
    // 光标 (600,200)：left = 600 + 8 = 608、top = 200 - 30 = 170（按光标点而非锚点中心）
    expect(p.style.left).toBe('608px')
    expect(p.style.top).toBe('170px')
  })

  it('contextmenu 光标定位后滚动重定位回到锚点（光标点无滚动语义）', async () => {
    const el = mount({ trigger: 'contextmenu', placement: 'right' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    btn.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 600, clientY: 200 }),
    )
    expect(p.style.left).toBe('608px')
    // 滚动：锚点上移 50 → 回到锚点定位：left = 480 + 8 = 488、top = 锚点中心 266 - 30 = 236
    stubRect(btn, { left: 400, top: 250, width: 80, height: 32 })
    setScrollY(300); window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(p.style.left).toBe('488px')
    expect(p.style.top).toBe('236px')
  })

  it('click 触发（无 contextmenu）：打开仍按锚点定位（现行为不变）', () => {
    const el = mount({ placement: 'right' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.querySelector('button')!.click()
    expect(p.style.left).toBe('488px')
    expect(p.style.top).toBe('286px') // 锚点中心 316 - 30
  })

  it('滞留 scroll 事件防御：scrollY 未变（打开前滚动的异步派发）不重定位，光标定位不被锚点覆盖', async () => {
    // 真实浏览器实测竞态：scrollIntoViewIfNeeded 滚动后立即触发打开，scroll 事件 task
    // 异步派发晚于打开执行——若不防御会把 contextmenu 光标定位覆盖回锚点定位
    const el = mount({ trigger: 'contextmenu', placement: 'right' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.querySelector('button')!.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 600, clientY: 200 }),
    )
    expect(p.style.left).toBe('608px')
    // 打开后到达的滞留 scroll（scrollY 与打开瞬间相同 → 无有效滚动）
    window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(p.style.left).toBe('608px')
    expect(p.style.top).toBe('170px')
  })

  it('触屏长按（trigger 含 contextmenu）：默认 500ms 打开并定位到触点', async () => {
    const el = mount({ trigger: 'contextmenu', placement: 'right' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    const btn = el.querySelector('button')!
    btn.dispatchEvent(touchEvent('touchstart', [{ clientX: 300, clientY: 120 }]))
    await sleep(80)
    expect(el.hasAttribute('open')).toBe(false) // 未到 500ms
    await sleep(480)
    expect(el.hasAttribute('open')).toBe(true)
    expect(p.style.left).toBe('308px') // 300 + 8
    expect(p.style.top).toBe('90px') // 120 - 30
  })

  it('触屏滑动超过阈值取消长按（滚动手势）', async () => {
    const el = mount({ trigger: 'contextmenu', placement: 'right' })
    const btn = el.querySelector('button')!
    btn.dispatchEvent(touchEvent('touchstart', [{ clientX: 100, clientY: 90 }]))
    await sleep(60)
    btn.dispatchEvent(touchEvent('touchmove', [{ clientX: 160, clientY: 95 }]))
    await sleep(520)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('触屏提前抬起取消长按', async () => {
    const el = mount({ trigger: 'contextmenu', placement: 'right' })
    const btn = el.querySelector('button')!
    btn.dispatchEvent(touchEvent('touchstart', [{ clientX: 100, clientY: 90 }]))
    await sleep(60)
    btn.dispatchEvent(touchEvent('touchend', []))
    await sleep(520)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('trigger 不含 contextmenu：长按不触发', async () => {
    const el = mount({ placement: 'right' })
    const btn = el.querySelector('button')!
    btn.dispatchEvent(touchEvent('touchstart', [{ clientX: 100, clientY: 90 }]))
    await sleep(560)
    expect(el.hasAttribute('open')).toBe(false)
  })
})

describe('OASPopover P21 dismiss-on-select', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('dismiss-on-select：面板内点击（slot 内容）即关闭', () => {
    const el = mount({ open: '', 'dismiss-on-select': '' })
    const inner = document.createElement('button')
    inner.setAttribute('slot', 'content')
    inner.textContent = '选项 A'
    el.appendChild(inner)
    el.setAttribute('content', 'x')
    inner.click()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('未开启：面板内点击不关闭（现行为）', () => {
    const el = mount({ open: '' })
    const inner = document.createElement('button')
    inner.setAttribute('slot', 'content')
    el.appendChild(inner)
    el.setAttribute('content', 'x')
    inner.click()
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('dismiss-on-select 与 oas-before-close 汇聚：面板内点击的关闭可被拦截', () => {
    const el = mount({ open: '', 'dismiss-on-select': '' })
    el.addEventListener('oas-before-close', (e) => e.preventDefault())
    const inner = document.createElement('button')
    inner.setAttribute('slot', 'content')
    el.appendChild(inner)
    el.setAttribute('content', 'x')
    inner.click()
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('dismiss-on-select：触发元素点击（默认 slot）不触发 dismiss（点开即关防御）', () => {
    const el = mount({ 'dismiss-on-select': '' })
    const trigger = el.querySelector('button')!
    trigger.click() // 打开（同一次 click 冒泡到 host 不得触发 dismiss）
    expect(el.hasAttribute('open')).toBe(true)
    // 打开后再点触发元素（toggle 关闭路径，dismiss 不抢先/不叠加）
    trigger.click()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('dismiss-on-select：面板 shadow 内点击（含关闭按钮）也走 dismiss 汇聚', () => {
    const el = mount({ open: '', 'dismiss-on-select': '', closable: '', title: 'x' })
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="close"]')!.click()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('关闭按钮在 dismiss-on-select 下照常关闭（幂等）', () => {
    const el = mount({ open: '', 'dismiss-on-select': '', closable: '', title: 'x' })
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="close"]')!.click()
    expect(el.hasAttribute('open')).toBe(false)
  })
})

describe('OASPopover P22 destroy-on-hide（关闭后销毁内容）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('关闭后卸载面板内容：content 文本清空、slot 节点暂存不可见', async () => {
    const el = mount({ 'destroy-on-hide': '', title: 'T' })
    const inner = document.createElement('button')
    inner.setAttribute('slot', 'content')
    inner.textContent = '面板按钮'
    el.appendChild(inner)
    el.querySelector('button')!.click() // 开
    const p = panelOf(el)
    expect(p.querySelector<HTMLSlotElement>('slot[name="content"]')!.assignedNodes()).toContain(inner)
    el.removeAttribute('open')
    await sleep(20)
    // 关闭后：slot 节点仍在宿主（宿主资产不删）但脱离面板分配（移入暂存区不可见）
    expect(el.contains(inner)).toBe(true)
    expect(p.querySelector<HTMLSlotElement>('slot[name="content"]')!.assignedNodes()).not.toContain(inner)
    expect(inner.hidden).toBe(true)
  })

  it('重开后内容重新挂载（slot 分配恢复、content 属性文本重写）', async () => {
    const el = mount({ 'destroy-on-hide': '', title: 'T', content: '文本内容' })
    const inner = document.createElement('button')
    inner.setAttribute('slot', 'content')
    inner.textContent = '面板按钮'
    el.appendChild(inner)
    el.querySelector('button')!.click()
    const p = panelOf(el)
    el.removeAttribute('open')
    await sleep(20)
    el.setAttribute('open', '')
    expect(p.querySelector<HTMLSlotElement>('slot[name="content"]')!.assignedNodes()).toContain(inner)
    expect(inner.hidden).toBe(false)
    // content 属性是声明式 API：重开照常写入（销毁的是 DOM 呈现，不是宿主声明）
    expect(p.querySelector('[part="content"]')!.textContent).toBe('文本内容')
  })

  it('未开启：关闭后内容保留（冻结语义现行为）', () => {
    const el = mount({ open: '', title: 'T', content: 'C' })
    el.removeAttribute('open')
    expect(panelOf(el).querySelector('[part="content"]')!.textContent).toBe('C')
  })
})

describe('OASPopover P23 breakpoints（断点响应）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('placement 断点简写："bottom md:right"——窄屏用 base，md 宽屏用 right', () => {
    const el = mount({ open: '', placement: 'bottom md:right' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(700, 800) // < 768
    el.setAttribute('content', 'x')
    expect(p.getAttribute('data-placement')).toBe('bottom')
    setViewport(900, 800) // >= 768
    el.setAttribute('content', 'y')
    expect(p.getAttribute('data-placement')).toBe('right')
  })

  it('多断点梯次："bottom sm:right xl:top" 按最宽命中生效', () => {
    const el = mount({ open: '', placement: 'bottom sm:right xl:top' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(700, 800) // 命中 sm
    el.setAttribute('content', 'x')
    expect(p.getAttribute('data-placement')).toBe('right')
    setViewport(1400, 800) // 命中 xl
    el.setAttribute('content', 'y')
    expect(p.getAttribute('data-placement')).toBe('top')
  })

  it('size 断点简写："small md:large" 生效值随断点切换', () => {
    const el = mount({ open: '', size: 'small md:large' })
    setViewport(700, 800)
    el.setAttribute('content', 'x')
    expect(panelOf(el).getAttribute('data-size')).toBe('small')
    setViewport(900, 800)
    el.setAttribute('content', 'y')
    expect(panelOf(el).getAttribute('data-size')).toBe('large')
  })

  it('非法断点名回落基础值（不生效）', () => {
    const el = mount({ open: '', placement: 'bottom xx:right' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1400, 800)
    el.setAttribute('content', 'x')
    expect(p.getAttribute('data-placement')).toBe('bottom')
  })
})

describe('OASPopover P24 trigger=mousedown', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('trigger="mousedown"：按下切换开合（无需抬起）', () => {
    const el = mount({ trigger: 'mousedown' })
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(true)
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('默认（无 mousedown）：mousedown 不触发（click 才触发）', () => {
    const el = mount()
    el.querySelector('button')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('mousedown 与 click 多选并存时各自生效一次（不叠加）', () => {
    const el = mount({ trigger: 'mousedown click' })
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(true)
    // 同一次交互的 click 不再切换（mousedown 已处理该次按压）——由 suppress 标记守卫
    btn.click()
    expect(el.hasAttribute('open')).toBe(true)
  })
})

describe('OASPopover P25 render-panel（无触发纯面板）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => unmountAll())

  it('无触发子元素也能挂载不报错，open 受控显示面板', () => {
    const el = new OASPopover()
    el.setAttribute('render-panel', '')
    el.setAttribute('title', '纯面板')
    document.body.appendChild(el)
    mounted.push(el)
    expect(() => el.setAttribute('open', '')).not.toThrow()
    expect(panelOf(el).getAttribute('aria-hidden')).toBe('false')
  })

  it('点击宿主内容不切换（trigger 一律按 manual 处理）', () => {
    const el = new OASPopover()
    el.setAttribute('render-panel', '')
    el.innerHTML = '<button>子元素</button>'
    document.body.appendChild(el)
    mounted.push(el)
    el.querySelector('button')!.click()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('trigger-keys 键盘路径同样关闭（纯面板无任何触发）', () => {
    const el = new OASPopover()
    el.setAttribute('render-panel', '')
    el.innerHTML = '<button>子元素</button>'
    document.body.appendChild(el)
    mounted.push(el)
    el.querySelector('button')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('触发元素 ARIA 关联跳过（宿主自组触发器）', () => {
    const el = new OASPopover()
    el.setAttribute('render-panel', '')
    el.innerHTML = '<button>子元素</button>'
    document.body.appendChild(el)
    mounted.push(el)
    expect(el.querySelector('button')!.hasAttribute('aria-haspopup')).toBe(false)
  })

  it('配合 virtual 坐标定位（宿主自组场景常见组合）', () => {
    const el = new OASPopover()
    el.setAttribute('render-panel', '')
    el.setAttribute('virtual-x', '100')
    el.setAttribute('virtual-y', '80')
    el.setAttribute('placement', 'right')
    document.body.appendChild(el)
    mounted.push(el)
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    setViewport(1280, 800)
    el.setAttribute('open', '')
    expect(p.style.left).toBe('108px')
    expect(p.style.top).toBe('50px')
  })
})
