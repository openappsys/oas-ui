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
      expect(cs.getPropertyValue(c.edge), `placement=${p} 箭头应落在面板${c.edge}边`).toBe('-4px')
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
    // happy-dom 的 stub 矩形不随 style.left 更新：把面板矩形同步为实际落位（left=4）后
    // 触发重定位，验证箭头投影仍指向锚点中心：44 - 4 - 4 = 36
    stubRect(p, { left: 4, top: 340, width: 240, height: 60 })
    el.setAttribute('content', 'y')
    // 默认（边缘对齐）：无内联偏移，箭头随面板居中（--arrow-x 兜底 calc(50% - 4px)）
    expect(arrow.style.getPropertyValue('--arrow-x')).toBe('')
    // 开启 point-at-center：箭头指向锚点中心（面板局部 X = 44 - 4 = 40 → --arrow-x = 36px）
    el.setAttribute('arrow-point-at-center', '')
    expect(arrow.style.getPropertyValue('--arrow-x')).toBe('36px')
    // 关闭后恢复 CSS 居中
    el.removeAttribute('arrow-point-at-center')
    expect(arrow.style.getPropertyValue('--arrow-x')).toBe('')
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

  /** 面板可能被 portal 出 shadow（append-to），需在 shadow 与 body 两处查 */
  function panelAnywhere(el: OASPopover): HTMLElement {
    return (el.shadowRoot!.querySelector('[part="panel"]') ??
      document.body.querySelector('[part="panel"]')) as HTMLElement
  }

  it('append-to="body"：打开时面板移入 body，关闭移回 shadow', () => {
    const el = mount({ open: '', 'append-to': 'body' })
    const p = panelAnywhere(el)
    expect(document.body.contains(p)).toBe(true)
    expect(el.shadowRoot!.contains(p)).toBe(false)
    el.removeAttribute('open')
    expect(el.shadowRoot!.contains(p)).toBe(true)
  })

  it('append-to 选择器：面板移入指定容器', () => {
    const port = document.createElement('div')
    port.id = 'pop-port'
    document.body.appendChild(port)
    const el = mount({ open: '', 'append-to': '#pop-port' })
    expect(port.contains(panelAnywhere(el))).toBe(true)
  })

  it('append-to：面板移入 body 后点击面板内部不触发外部点击关闭', () => {
    const el = mount({ open: '', 'append-to': 'body' })
    const p = panelAnywhere(el)
    p.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('append-to：断开连接时面板不残留于 body（孤儿防御）', () => {
    const el = mount({ open: '', 'append-to': 'body' })
    const p = panelAnywhere(el)
    el.remove()
    expect(document.body.contains(p)).toBe(false)
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
    window.dispatchEvent(new Event('scroll'))
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
    // 变体只覆写 --pop-bg / --pop-border，面板与箭头共用
    expect(styleText).toMatch(/--pop-border:\s*var\(--oas-color-border\)/)
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
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
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

  it('arrow-merge 直角三角贴角共边：8 向箭头盒整悬面板外、transform none、描边仅直角两边、clip-path 直角三角', () => {
    const css = mergeCss(mount())
    const B = '1px solid var(--pop-border)'
    // 盒定位：主轴边外 -8px（压进面板描边带 1px 共带）、起止侧边 -1px（描边带对齐）；
    // 不旋转 + 描边只留两条直角边（斜边 clip 裁平不描边）+ clip-path 直角三角
    const rules: Record<string, string> = {
      'bottom-start': `top: -8px; left: -1px; transform: none; border: none; border-left: ${B}; border-bottom: ${B}; clip-path: polygon(0% 0%, 0% 100%, 100% 100%);`,
      'bottom-end': `top: -8px; right: -1px; left: auto; transform: none; border: none; border-right: ${B}; border-bottom: ${B}; clip-path: polygon(100% 0%, 0% 100%, 100% 100%);`,
      'top-start': `bottom: -8px; left: -1px; transform: none; border: none; border-left: ${B}; border-top: ${B}; clip-path: polygon(0% 0%, 100% 0%, 0% 100%);`,
      'top-end': `bottom: -8px; right: -1px; left: auto; transform: none; border: none; border-right: ${B}; border-top: ${B}; clip-path: polygon(0% 0%, 100% 0%, 100% 100%);`,
      'left-start': `right: -8px; top: -1px; transform: none; border: none; border-top: ${B}; border-left: ${B}; clip-path: polygon(0% 0%, 100% 0%, 0% 100%);`,
      'left-end': `right: -8px; bottom: -1px; top: auto; transform: none; border: none; border-bottom: ${B}; border-left: ${B}; clip-path: polygon(0% 0%, 0% 100%, 100% 100%);`,
      'right-start': `left: -8px; top: -1px; transform: none; border: none; border-top: ${B}; border-right: ${B}; clip-path: polygon(0% 0%, 100% 0%, 100% 100%);`,
      'right-end': `left: -8px; bottom: -1px; top: auto; transform: none; border: none; border-bottom: ${B}; border-right: ${B}; clip-path: polygon(100% 0%, 0% 100%, 100% 100%);`,
    }
    for (const [p, decl] of Object.entries(rules)) {
      expect(css, `merge ${p} 箭头应为直角三角贴角共边`).toContain(
        `.panel[data-placement='${p}'][data-arrow-merge] .arrow { ${decl} }`,
      )
    }
    // 旧「菱形骑角」规则（基向前缀 + 半宽 -4px 骑角）不得残留
    expect(css).not.toMatch(/\[data-placement\^='bottom'\]\[data-arrow-merge\] \.arrow/)
    expect(css).not.toMatch(/\[data-placement\^='top'\]\[data-arrow-merge\] \.arrow/)
    expect(css).not.toMatch(/\[data-placement\^='left'\]\[data-arrow-merge\] \.arrow/)
    expect(css).not.toMatch(/\[data-placement\^='right'\]\[data-arrow-merge\] \.arrow/)
  })

  it('arrow-merge 8 向三角几何：直角顶点贴面板角、两直角边与角两边共线、尖端正交外探 8px 指向锚点侧', () => {
    const css = mergeCss(mount())
    // 每向：clip-path 顶点（盒内 8×8 百分比坐标）→ 面板角点位于盒的哪个角 + 三角朝向
    // corner: 面板角点在箭头盒内的位置；edge: 贴边腿顶点相对角点的位移（沿面板边向内 8px，
    // 该腿与面板真实边段共边）；tip: 尖端相对角点的正交位移 8px（指向锚点侧）
    const geom: Record<string, { corner: [number, number]; edge: [number, number]; tip: [number, number] }> =
      {
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
      expect(near(rv[0], corner[0]) && near(rv[1], corner[1]), `${p} 直角顶点应落面板角点`).toBe(true)
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
