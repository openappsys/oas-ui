import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '@oas-ui/i18n' // 副作用：注册默认 zh-CN translator（内置文案断言依赖）
import { OASDropdown } from './index.js'
import { OASMenu } from '../menu/index.js' // side effect：确保 oas-menu 已注册
const ITEMS = JSON.stringify([
  { label: '编辑', value: 'edit' },
  { label: '删除', value: 'delete' },
])

const NESTED_ITEMS = JSON.stringify([
  {
    label: '文件',
    value: 'file',
    children: [
      {
        label: '新建',
        value: 'new',
        children: [
          { label: '文件', value: 'new-file' },
          { label: '窗口', value: 'new-window' },
        ],
      },
      { label: '打开', value: 'open' },
    ],
  },
  { label: '编辑', value: 'edit' },
])

function mount(attrs: Record<string, string> = {}): OASDropdown {
  const el = new OASDropdown()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.items) el.setAttribute('items', ITEMS)
  el.innerHTML = `<button>操作</button>`
  document.body.appendChild(el)
  return el
}

/** 真实计时器等待（退场动画/防抖延时依赖） */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 浮层锚点容器（fixed 定位，承载内层 oas-menu） */
function anchorEl(el: OASDropdown): HTMLElement {
  return el.shadowRoot!.querySelector('.menu-anchor')!
}

/** 内层 oas-menu 的影子根 */
function innerMenuRoot(el: OASDropdown): ShadowRoot {
  const menu = el.shadowRoot!.querySelector('oas-menu') as OASMenu
  return menu.shadowRoot!
}

describe('OASDropdown', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('open 时显示浮层菜单（内层 oas-menu 渲染 items）', async () => {
    const el = mount({ open: '' })
    await Promise.resolve()
    expect(anchorEl(el).hasAttribute('hidden')).toBe(false)
    expect(innerMenuRoot(el).querySelectorAll('[part="item"]').length).toBe(2)
  })

  it('点击触发切换 open', () => {
    const el = mount()
    ;(el.querySelector('button') as HTMLElement).click()
    expect(anchorEl(el).hasAttribute('hidden')).toBe(false)
  })

  it('选择菜单项派发 oas-select 并关闭', async () => {
    const el = mount({ open: '' })
    await Promise.resolve()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(innerMenuRoot(el).querySelector('[part="item"]') as HTMLElement).click()
    expect(detail).toEqual({ value: 'edit' })
    expect(el.hasAttribute('open')).toBe(false)
    // 退场动画（fade/scale）结束后落 hidden
    await sleep(220)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('多级子菜单：hover 级联展开内层菜单子菜单，选中叶子项派发 select', async () => {
    const el = mount({ open: '', items: NESTED_ITEMS })
    await Promise.resolve()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    const root = innerMenuRoot(el)
    const file = root.querySelector<HTMLElement>('[part="item"][data-value="file"]')!
    file.dispatchEvent(new MouseEvent('mouseenter'))
    const newItem = root.querySelector<HTMLElement>('[part="item"][data-value="new"]')!
    expect(newItem).not.toBeNull()
    newItem.dispatchEvent(new MouseEvent('mouseenter'))
    const windowItem = root.querySelector<HTMLElement>('[part="item"][data-value="new-window"]')!
    expect(windowItem).not.toBeNull()
    windowItem.click()
    expect(detail).toEqual({ value: 'new-window' })
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('关闭后重开：不残留级联子菜单展开态', async () => {
    const el = mount({ open: '', items: NESTED_ITEMS })
    await Promise.resolve()
    const root = innerMenuRoot(el)
    root
      .querySelector<HTMLElement>('[part="item"][data-value="file"]')!
      .dispatchEvent(new MouseEvent('mouseenter'))
    expect(root.querySelectorAll('.item.open').length).toBeGreaterThan(0)
    // 外部点击关闭 → 重开：级联展开态应清空
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(false)
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(root.querySelectorAll('.item.open').length).toBe(0)
  })
})

// —— P1 补缺：下拉按钮（split 模式）——
// 主按钮 + 拆分箭头按钮：点箭头开菜单，主按钮点击派发 oas-action。

describe('OASDropdown split 下拉按钮', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function arrowBtn(el: OASDropdown): HTMLButtonElement {
    return el.shadowRoot!.querySelector<HTMLButtonElement>('.arrow-btn')!
  }

  it('split 属性列入 observedAttributes', () => {
    expect(OASDropdown.observedAttributes).toContain('split')
  })

  it('渲染箭头按钮；非 split 时隐藏（display:none）', () => {
    const plain = mount()
    const arrow = arrowBtn(plain)
    expect(arrow).not.toBeNull()
    expect(arrow.getAttribute('aria-haspopup')).toBe('menu')
    const css = plain.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toMatch(/:host\(:not\(\[split\]\)\)\s*\.arrow-btn\s*\{[^}]*display:\s*none/)
    const split = mount({ split: '' })
    expect(split.hasAttribute('split')).toBe(true)
  })

  it('split：点主按钮派发 oas-action 且不打开菜单', () => {
    const el = mount({ split: '' })
    let detail: unknown
    el.addEventListener('oas-action', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.querySelector('button') as HTMLElement).click()
    expect(detail).toBeDefined()
    expect(el.hasAttribute('open')).toBe(false)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('split：点箭头按钮切换菜单', async () => {
    const el = mount({ split: '' })
    arrowBtn(el).click()
    expect(el.hasAttribute('open')).toBe(true)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(false)
    arrowBtn(el).click()
    expect(el.hasAttribute('open')).toBe(false)
    await sleep(220)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('箭头按钮 aria-expanded 随 open 同步，aria-label 走 locale', () => {
    const el = mount({ split: '' })
    expect(arrowBtn(el).getAttribute('aria-expanded')).toBe('false')
    expect(arrowBtn(el).getAttribute('aria-label')).toBe('打开菜单')
    arrowBtn(el).click()
    expect(arrowBtn(el).getAttribute('aria-expanded')).toBe('true')
  })

  it('split：选择菜单项派发 oas-select 并关闭', async () => {
    const el = mount({ split: '' })
    arrowBtn(el).click()
    await Promise.resolve()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(innerMenuRoot(el).querySelector('[part="item"]') as HTMLElement).click()
    expect(detail).toEqual({ value: 'edit' })
    expect(el.hasAttribute('open')).toBe(false)
    await sleep(220)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('split：打开菜单后点主按钮不开不关，点箭头关闭', async () => {
    const el = mount({ split: '' })
    arrowBtn(el).click()
    expect(el.hasAttribute('open')).toBe(true)
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.hasAttribute('open')).toBe(true)
    arrowBtn(el).click()
    expect(el.hasAttribute('open')).toBe(false)
    await sleep(220)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('非 split：主按钮点击仍是切换菜单（原行为不变）', () => {
    const el = mount()
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('拆分箭头按钮 part=split-arrow（与浮层箭头 part=arrow 区分，避免 ::part(arrow) 一选二）', () => {
    const el = mount({ split: '' })
    expect(arrowBtn(el).getAttribute('part')).toBe('split-arrow')
  })
})

// —— P2 补缺：箭头——
// 面板带指向触发元素的箭头（默认显示）：`arrow="false"` 隐藏；`arrow-point-at-center`
// 固定指向面板中心（默认按触发元素投影定位）；`auto-adjust-overflow="false"` 关闭视口翻转。

describe('OASDropdown 箭头（arrow）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function arrowOf(el: OASDropdown): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('[data-popper-arrow]')!
  }

  /** happy-dom 无布局引擎：stub 元素矩形，让定位拿到确定性尺寸 */
  function stubRect(
    el: Element,
    r: { left: number; top: number; width: number; height: number },
  ): void {
    ;(el as HTMLElement).getBoundingClientRect = () =>
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

  /** 固定视口尺寸（翻转断言依赖确定性的 viewport） */
  function setViewport(w: number, h: number): void {
    Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: h, configurable: true })
  }

  /** 组装：mount 后 stub 触发按钮/面板矩形与视口，再 setAttribute open 触发定位（中段坐标四向均不翻转） */
  function mountOpen(attrs: Record<string, string>): OASDropdown {
    const el = mount(attrs)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    stubRect(anchorEl(el), { left: 350, top: 332, width: 200, height: 100 })
    setViewport(1280, 800)
    el.setAttribute('open', '')
    return el
  }

  it('箭头元素存在：part=arrow + data-popper-arrow + aria-hidden，不破坏菜单渲染', async () => {
    const el = mount({ open: '' })
    await Promise.resolve()
    const arrow = arrowOf(el)
    expect(arrow).not.toBeNull()
    expect(arrow.getAttribute('part')).toBe('arrow')
    expect(arrow.getAttribute('aria-hidden')).toBe('true')
    // 菜单项照常渲染（箭头骨架不破坏内层 oas-menu 内容）
    expect(innerMenuRoot(el).querySelectorAll('[part="item"]').length).toBe(2)
  })

  it('新增属性列入 observedAttributes', () => {
    expect(OASDropdown.observedAttributes).toEqual(
      expect.arrayContaining(['arrow', 'arrow-point-at-center', 'auto-adjust-overflow']),
    )
  })

  it('open 后面板写 data-placement，箭头按 4 向 placement 落边（外露边框对与面板描边衔接）', () => {
    const cases = {
      bottom: { edge: 'top', borders: ['border-top-width', 'border-left-width'] },
      top: { edge: 'bottom', borders: ['border-right-width', 'border-bottom-width'] },
      left: { edge: 'right', borders: ['border-top-width', 'border-right-width'] },
      right: { edge: 'left', borders: ['border-left-width', 'border-bottom-width'] },
    } as const
    for (const p of ['top', 'bottom', 'left', 'right'] as const) {
      const el = mountOpen({ placement: p })
      const panel = anchorEl(el)
      expect(panel.getAttribute('data-placement')).toBe(p)
      const arrow = arrowOf(el)
      expect(arrow).not.toBeNull()
      // 悬空边为 -4px（8px 方块半宽外探）：happy-dom 可解析 shadow <style> 的简单声明
      expect(window.getComputedStyle(arrow).getPropertyValue(cases[p].edge)).toBe('-6px')
      // 边框对：var 颜色 happy-dom 不解析，锁样式规则文本（left/right 曾把外露边框对写反）
      // 12 向 placement（bottom-start 等）使 data-placement 带对齐后缀，箭头落边规则用前缀匹配
      const styleText = el.shadowRoot!.querySelector('style')!.textContent!
      const block = styleText
        .split(`.menu-anchor[data-placement^='${p}'] .arrow {`)[1]!
        .split('}')[0]!
      for (const prop of ['top', 'right', 'bottom', 'left']) {
        const expectBorder = (cases[p].borders as readonly string[]).includes(
          `border-${prop}-width`,
        )
        const hasBorder = block.includes(`border-${prop}: 1px solid var(--oas-color-border)`)
        expect(
          hasBorder,
          `placement=${p} border-${prop} 应${expectBorder ? '' : '不'}出现在箭头规则中`,
        ).toBe(expectBorder)
      }
    }
  })

  it('arrow="false" 隐藏箭头（hidden 属性驱动，骨架保留）', () => {
    const hidden = mount({ open: '', arrow: 'false' })
    expect(arrowOf(hidden).hasAttribute('hidden')).toBe(true)
    expect(arrowOf(hidden)).not.toBeNull // 骨架保留（DSD 快照结构稳定）
    const shown = mount({ open: '' })
    expect(arrowOf(shown).hasAttribute('hidden')).toBe(false)
  })

  it('point-at-center（默认 false）：箭头沿面板边指向触发元素中心（锚点中心投影 + 边距夹取）', () => {
    const el = mountOpen({ placement: 'bottom' })
    const arrow = arrowOf(el)
    // 锚点中心 x = 400 + 40 = 440；面板 left=350 → 投影 90 - 箭头半宽 4 = 86 → --arrow-x: 86px
    expect(arrow.style.getPropertyValue('--arrow-x')).toBe('')
    expect(arrow.style.getPropertyValue('--arrow-y')).toBe('')
  })

  it('arrow-point-at-center=true：不写内联偏移，箭头居中（CSS calc(50% - 6px) 兜底）', () => {
    const el = mountOpen({ placement: 'bottom', 'arrow-point-at-center': '' })
    const arrow = arrowOf(el)
    expect(arrow.style.getPropertyValue('--arrow-x')).toBe('84px')
    expect(arrow.style.getPropertyValue('--arrow-y')).toBe('')
    const styleText = el.shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toContain('left: var(--arrow-x, calc(50% - 6px))')
  })

  it('auto-adjust-overflow=false：视口不足不翻转（placement 严格保持请求值，可越出视口）', () => {
    const el = mount({ placement: 'top' })
    stubRect(el.querySelector('button')!, { left: 400, top: 0, width: 80, height: 32 })
    stubRect(anchorEl(el), { left: 350, top: 0, width: 200, height: 60 })
    setViewport(1280, 800)
    // 默认：贴视口顶 → 自动翻转到 bottom
    el.setAttribute('open', '')
    expect(anchorEl(el).getAttribute('data-placement')).toBe('bottom')
    el.removeAttribute('open')
    // auto-adjust-overflow=false：保持 top，位置 = 原始计算（不避让可越出视口）
    el.setAttribute('auto-adjust-overflow', 'false')
    el.setAttribute('open', '')
    expect(anchorEl(el).getAttribute('data-placement')).toBe('top')
    expect(anchorEl(el).style.top).toBe('-68px') // 0 - 60 - 8
  })
})

// —— 触发与定位增强（trigger / 12 向 placement / 事件 / 禁用 / 动画 / 滚动 / 偏移）——

describe('OASDropdown 触发方式（trigger）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('trigger / hover-delay / hover-hide-delay 列入 observedAttributes', () => {
    expect(OASDropdown.observedAttributes).toEqual(
      expect.arrayContaining(['trigger', 'hover-delay', 'hover-hide-delay']),
    )
  })

  it('trigger="hover"：悬停开、移出关（无 click 触发）', async () => {
    const el = mount({ trigger: 'hover', 'hover-delay': '0', 'hover-hide-delay': '0' })
    el.dispatchEvent(new MouseEvent('mouseenter'))
    await sleep(20)
    expect(el.hasAttribute('open')).toBe(true)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(false)
    el.dispatchEvent(new MouseEvent('mouseleave'))
    await sleep(20)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('hover 悬停到浮层面板不关闭（悬停区域 = 宿主 + 面板）', async () => {
    const el = mount({ trigger: 'hover', 'hover-delay': '0', 'hover-hide-delay': '0' })
    el.dispatchEvent(new MouseEvent('mouseenter'))
    await sleep(20)
    // 从宿主移入浮层面板：mouseleave 的 relatedTarget 在 shadow 内 → 不触发关闭
    el.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: anchorEl(el) }))
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
    const el = mount({ trigger: 'hover', 'hover-delay': '0' })
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('trigger="click focus"：鼠标点击由 click 接管，focusin 只响应键盘/程序化聚焦（不双开双关）', () => {
    const el = mount({ trigger: 'click focus' })
    const btn = el.querySelector('button') as HTMLElement
    // 真实鼠标点击序列：mousedown → focusin（被 click 触发接管，跳过 focus 打开）→ mouseup → click
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(false) // focusin 不重复开
    btn.click()
    expect(el.hasAttribute('open')).toBe(true) // click 完成打开
    btn.click()
    expect(el.hasAttribute('open')).toBe(false) // 再点正常切换关闭
    // 键盘 Tab 聚焦（无 mousedown）：focusin 正常打开
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(true)
  })
})

describe('OASDropdown 12 向 placement', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function stubRect(
    el: Element,
    r: { left: number; top: number; width: number; height: number },
  ): void {
    ;(el as HTMLElement).getBoundingClientRect = () =>
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

  function setViewport(w: number, h: number): void {
    Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: h, configurable: true })
  }

  /** 中段坐标四向均不翻转的基准：锚点 {400,300,80,32}，面板 {350,332,200,100}，视口 1280x800 */
  function mountOpen(attrs: Record<string, string>): OASDropdown {
    const el = mount(attrs)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    stubRect(anchorEl(el), { left: 350, top: 332, width: 200, height: 100 })
    setViewport(1280, 800)
    el.setAttribute('open', '')
    return el
  }

  it('-start/-end 交叉轴对齐：bottom-start 左对齐（最常见形态）、bottom-end 右对齐', () => {
    const start = mountOpen({ placement: 'bottom-start' })
    expect(anchorEl(start).getAttribute('data-placement')).toBe('bottom-start')
    expect(anchorEl(start).style.top).toBe('340px') // 332 + 8
    expect(anchorEl(start).style.left).toBe('400px') // 面板左缘 = 锚点左缘
    const end = mountOpen({ placement: 'bottom-end' })
    expect(anchorEl(end).getAttribute('data-placement')).toBe('bottom-end')
    expect(anchorEl(end).style.left).toBe('280px') // 锚点右缘 480 - 面板宽 200
  })

  it('right-start：面板上缘对齐锚点上缘；top-end：下缘对齐', () => {
    const rs = mountOpen({ placement: 'right-start' })
    expect(anchorEl(rs).getAttribute('data-placement')).toBe('right-start')
    expect(anchorEl(rs).style.left).toBe('488px') // 480 + 8
    expect(anchorEl(rs).style.top).toBe('300px') // 面板上缘 = 锚点上缘
    const te = mountOpen({ placement: 'top-end' })
    expect(anchorEl(te).getAttribute('data-placement')).toBe('top-end')
    expect(anchorEl(te).style.top).toBe('192px') // 300 - 100 - 8
    expect(anchorEl(te).style.left).toBe('280px')
  })

  it('翻转保留对齐后缀：bottom-start 空间不足 → top-start（不再回落为无对齐 top）', () => {
    const el = mount({ placement: 'bottom-start' })
    stubRect(el.querySelector('button')!, { left: 400, top: 700, width: 80, height: 32 })
    stubRect(anchorEl(el), { left: 350, top: 732, width: 200, height: 100 })
    setViewport(1280, 800)
    el.setAttribute('open', '')
    expect(anchorEl(el).getAttribute('data-placement')).toBe('top-start')
    expect(anchorEl(el).style.top).toBe('592px') // 700 - 100 - 8
    expect(anchorEl(el).style.left).toBe('400px') // 对齐后缀在翻转后仍保留
  })

  it('对齐后再视口夹取：bottom-start 靠视口右缘不越界', () => {
    const el = mount({ placement: 'bottom-start' })
    stubRect(el.querySelector('button')!, { left: 1200, top: 300, width: 80, height: 32 })
    stubRect(anchorEl(el), { left: 350, top: 332, width: 200, height: 100 })
    setViewport(1280, 800)
    el.setAttribute('open', '')
    expect(anchorEl(el).style.left).toBe('1076px') // 1280 - 200 - 4
  })

  it('auto-adjust-overflow=false：bottom-start 严格保持不翻转不避让', () => {
    const el = mount({ placement: 'bottom-start', 'auto-adjust-overflow': 'false' })
    stubRect(el.querySelector('button')!, { left: 400, top: 700, width: 80, height: 32 })
    stubRect(anchorEl(el), { left: 350, top: 732, width: 200, height: 100 })
    setViewport(1280, 800)
    el.setAttribute('open', '')
    expect(anchorEl(el).getAttribute('data-placement')).toBe('bottom-start')
    expect(anchorEl(el).style.top).toBe('740px') // 732 + 8
  })

  it('12 向 placement 箭头仍按基向落边（data-placement 前缀匹配 + arrow-point-at-center 投影）', async () => {
    const el = mountOpen({ placement: 'bottom-start', 'arrow-point-at-center': '' })
    const arrow = el.shadowRoot!.querySelector<HTMLElement>('[data-popper-arrow]')!
    expect(window.getComputedStyle(arrow).getPropertyValue('top')).toBe('-6px')
    // happy-dom 的 stub 矩形不随 style.left 更新：把面板矩形同步为对齐落位（left=400）后
    // 重新定位（滚动触发），验证 12 向对齐下箭头投影仍指向锚点中心：440 - 400 - 4 = 36
    stubRect(anchorEl(el), { left: 400, top: 340, width: 200, height: 100 })
    window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(arrow.style.getPropertyValue('--arrow-x')).toBe('34px')
  })
})

describe('OASDropdown oas-open-change 事件', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('点击切换派发 oas-open-change（detail.open 布尔，开关各一次）', () => {
    const el = mount()
    const log: boolean[] = []
    el.addEventListener('oas-open-change', (e) =>
      log.push((e as CustomEvent<{ open: boolean }>).detail.open),
    )
    ;(el.querySelector('button') as HTMLElement).click()
    ;(el.querySelector('button') as HTMLElement).click()
    expect(log).toEqual([true, false])
  })

  it('受控 setAttribute 同样触发（同 tooltip/popover 语义），无变化不派发', () => {
    const el = mount()
    const log: boolean[] = []
    el.addEventListener('oas-open-change', (e) =>
      log.push((e as CustomEvent<{ open: boolean }>).detail.open),
    )
    el.setAttribute('open', '')
    el.setAttribute('open', '') // 无状态迁移不派发
    el.removeAttribute('open')
    expect(log).toEqual([true, false])
  })

  it('初始 open 不派发（首帧无迁移，同 tooltip/popover）', () => {
    const el = mount({ open: '' })
    const log: boolean[] = []
    el.addEventListener('oas-open-change', (e) =>
      log.push((e as CustomEvent<{ open: boolean }>).detail.open),
    )
    el.removeAttribute('open')
    expect(log).toEqual([false])
  })

  it('选择菜单项关闭也派发 oas-open-change', async () => {
    const el = mount({ open: '' })
    await Promise.resolve()
    const log: boolean[] = []
    el.addEventListener('oas-open-change', (e) =>
      log.push((e as CustomEvent<{ open: boolean }>).detail.open),
    )
    ;(innerMenuRoot(el).querySelector('[part="item"]') as HTMLElement).click()
    expect(log).toEqual([false])
  })

  it('hover 触发开合同样派发 oas-open-change', async () => {
    const el = mount({ trigger: 'hover', 'hover-delay': '0', 'hover-hide-delay': '0' })
    const log: boolean[] = []
    el.addEventListener('oas-open-change', (e) =>
      log.push((e as CustomEvent<{ open: boolean }>).detail.open),
    )
    el.dispatchEvent(new MouseEvent('mouseenter'))
    await sleep(20)
    el.dispatchEvent(new MouseEvent('mouseleave'))
    await sleep(20)
    expect(log).toEqual([true, false])
  })
})

describe('OASDropdown disabled / hide-on-click / offset', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('disabled：click/hover/focus 触发均不响应', async () => {
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

  it('disabled：拆分箭头按钮 native disabled + 宿主 aria-disabled + 视觉降饱和规则', () => {
    const el = mount({ split: '', disabled: '' })
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('.arrow-btn')!
    expect(btn.disabled).toBe(true)
    expect(el.getAttribute('aria-disabled')).toBe('true')
    const styleText = el.shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toMatch(/:host\(\[disabled\]\)\s*\{[^}]*opacity:\s*0\.6/)
  })

  it('hide-on-click="false"：选中菜单项不关闭（多选/勾选场景），value 仍更新', async () => {
    const el = mount({ open: '', 'hide-on-click': 'false' })
    await Promise.resolve()
    ;(innerMenuRoot(el).querySelector('[part="item"]') as HTMLElement).click()
    expect(el.getAttribute('value')).toBe('edit')
    expect(el.hasAttribute('open')).toBe(true)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(false)
  })

  it('hide-on-click 默认 true：选中即关（行为回归）', async () => {
    const el = mount({ open: '' })
    await Promise.resolve()
    ;(innerMenuRoot(el).querySelector('[part="item"]') as HTMLElement).click()
    expect(el.hasAttribute('open')).toBe(false)
    await sleep(220)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('offset 偏移：面板与触发器间距可配（默认 8，offset=16 生效）', () => {
    const el = mount({ placement: 'bottom', 'auto-adjust-overflow': 'false', offset: '16' })
    ;(el.querySelector('button') as HTMLElement).getBoundingClientRect = () =>
      ({ left: 400, top: 300, width: 80, height: 32, right: 480, bottom: 332 }) as DOMRect
    ;(anchorEl(el) as HTMLElement).getBoundingClientRect = () =>
      ({ left: 350, top: 332, width: 200, height: 100, right: 550, bottom: 432 }) as DOMRect
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    el.setAttribute('open', '')
    expect(anchorEl(el).style.top).toBe('348px') // 332 + 16
  })
})

describe('OASDropdown 开合动画与滚动重定位', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function stubRect(
    el: Element,
    r: { left: number; top: number; width: number; height: number },
  ): void {
    ;(el as HTMLElement).getBoundingClientRect = () =>
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

  function setViewport(w: number, h: number): void {
    Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: h, configurable: true })
  }

  function mountOpen(attrs: Record<string, string>): OASDropdown {
    const el = mount(attrs)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    stubRect(anchorEl(el), { left: 350, top: 332, width: 200, height: 100 })
    setViewport(1280, 800)
    el.setAttribute('open', '')
    return el
  }

  it('开合动画：入场/退场 keyframes + oas-closing 类 + transform-origin 变量 + 减少动效保护', () => {
    const styleText = mount().shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toContain('@keyframes oas-drop-in')
    expect(styleText).toContain('@keyframes oas-drop-out')
    expect(styleText).toContain('.menu-anchor.oas-closing oas-menu')
    expect(styleText).toMatch(/transform-origin:\s*var\(--oas-origin-x/)
    expect(styleText).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })

  it('transform-origin 感知方向：bottom-start → 顶左（top left）、right-end → 左底', () => {
    const start = mountOpen({ placement: 'bottom-start' })
    const panel = anchorEl(start)
    expect(panel.style.getPropertyValue('--oas-origin-x')).toBe('left')
    expect(panel.style.getPropertyValue('--oas-origin-y')).toBe('top')
    const re = mountOpen({ placement: 'right-end' })
    const rePanel = anchorEl(re)
    expect(rePanel.style.getPropertyValue('--oas-origin-x')).toBe('left')
    expect(rePanel.style.getPropertyValue('--oas-origin-y')).toBe('bottom')
  })

  it('关闭播放退场动画后再落 hidden（oas-closing 类 + 延时隐藏）', async () => {
    const el = mount()
    const panel = anchorEl(el)
    ;(el.querySelector('button') as HTMLElement).click()
    expect(panel.hasAttribute('hidden')).toBe(false)
    ;(el.querySelector('button') as HTMLElement).click()
    expect(panel.classList.contains('oas-closing')).toBe(true)
    expect(panel.hasAttribute('hidden')).toBe(false) // 动画期间仍在屏
    await sleep(220)
    expect(panel.hasAttribute('hidden')).toBe(true)
    expect(panel.classList.contains('oas-closing')).toBe(false)
  })

  it('退场期间重开：取消隐藏、不残留 oas-closing 类', async () => {
    const el = mount()
    const panel = anchorEl(el)
    ;(el.querySelector('button') as HTMLElement).click()
    ;(el.querySelector('button') as HTMLElement).click() // 开始退场
    expect(panel.classList.contains('oas-closing')).toBe(true)
    ;(el.querySelector('button') as HTMLElement).click() // 重开
    expect(panel.classList.contains('oas-closing')).toBe(false)
    expect(panel.hasAttribute('hidden')).toBe(false)
    await sleep(220) // 旧退场定时器到点不应误关已重开的面板
    expect(panel.hasAttribute('hidden')).toBe(false)
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('打开期间滚动：rAF 节流重算定位（fixed 与页面脱节的修复）', async () => {
    const el = mountOpen({ placement: 'bottom' })
    expect(anchorEl(el).style.top).toBe('340px') // 332 + 8
    // 模拟页面滚动：锚点随视口上移 50px
    stubRect(el.querySelector('button')!, { left: 400, top: 250, width: 80, height: 32 })
    window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(anchorEl(el).style.top).toBe('290px') // 282 + 8
  })

  it('close-on-scroll：滚动即关闭（fixed 脱节的兜底方案）', async () => {
    const el = mountOpen({ 'close-on-scroll': '' })
    expect(el.hasAttribute('open')).toBe(true)
    window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('关闭后移除滚动监听（无孤儿）：再滚动不改变状态', async () => {
    const el = mountOpen({ placement: 'bottom' })
    el.removeAttribute('open')
    await sleep(220) // 退场动画结束落 hidden
    const before = anchorEl(el).style.top
    window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => setTimeout(() => resolve(undefined), 20))
    expect(anchorEl(el).style.top).toBe(before)
    expect(el.hasAttribute('open')).toBe(false)
  })
})

// —— 子元素声明式通道（oas-dropdown-item / oas-dropdown-group / oas-dropdown-divider）——
// 与 menu 子元素通道同范式：items 属性显式设置时数据驱动优先，否则解析子元素收敛到同一渲染路径。
// 载体元素直接继承 menu 系数据载体（display:none + observedAttributes + render），宿主零重复实现。

/** 子元素通道挂载：light DOM 填触发按钮 + 数据载体（不设 items 属性） */
function mountDropdownChild(html: string, attrs: Record<string, string> = {}): OASDropdown {
  const el = document.createElement('oas-dropdown') as OASDropdown
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

describe('OASDropdown 子元素声明式通道', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('基础：普通项/分组/divider/嵌套子菜单混排解析渲染，点击选中事件 detail 与 items 通道一致', async () => {
    const el = mountDropdownChild(`
      <oas-button>操作</oas-button>
      <oas-dropdown-group label="导航">
        <oas-dropdown-item value="home">首页</oas-dropdown-item>
        <oas-dropdown-item value="about">关于</oas-dropdown-item>
      </oas-dropdown-group>
      <oas-dropdown-divider></oas-dropdown-divider>
      <oas-dropdown-item value="edit">编辑
        <oas-dropdown-item value="copy">复制</oas-dropdown-item>
        <oas-dropdown-item value="cut">剪切</oas-dropdown-item>
      </oas-dropdown-item>
    `)
    el.setAttribute('open', '')
    await Promise.resolve()
    const root = innerMenuRoot(el)
    // 分组标题 + 组内子项 + divider + 嵌套项（顶层 item = 首页/关于/编辑）
    expect(root.querySelector<HTMLElement>('[part="group"]')!.textContent).toBe('导航')
    const menuChildren = [...root.querySelector('.menu')!.children]
    expect(menuChildren.filter((c) => c.classList.contains('item')).length).toBe(3)
    expect(menuChildren.filter((c) => c.classList.contains('divider')).length).toBe(1)
    // 嵌套子菜单 hover 展开出子项（aria 语义与 items 通道一致）
    const edit = root.querySelector<HTMLElement>('[part="item"][data-value="edit"]')!
    expect(edit.getAttribute('role')).toBe('menuitem')
    edit.dispatchEvent(new MouseEvent('mouseenter'))
    expect(edit.getAttribute('aria-expanded')).toBe('true')
    expect(root.querySelector('[part="item"][data-value="copy"]')).not.toBeNull()
    // 点击选中事件 detail 与 items 通道一致（{ value } + 默认关闭）
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(root.querySelector('[part="item"][data-value="copy"]') as HTMLElement).click()
    expect(detail).toEqual({ value: 'copy' })
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('items 属性显式设置时优先（子元素被忽略）', async () => {
    const el = mountDropdownChild(
      `<oas-button>操作</oas-button><oas-dropdown-item value="home">首页</oas-dropdown-item>`,
      {
        items: JSON.stringify([
          { label: '数据项', value: 'data' },
          { label: '末项', value: 'last' },
        ]),
      },
    )
    el.setAttribute('open', '')
    await Promise.resolve()
    const labels = [...innerMenuRoot(el).querySelectorAll('[part="item"] .label')].map(
      (l) => l.textContent,
    )
    expect(labels).toEqual(['数据项', '末项'])
    expect(innerMenuRoot(el).querySelector('[data-value="home"]')).toBeNull()
  })

  it('属性映射：checkbox 勾选 / danger 红字 / href 链接项 / loading / disabled', async () => {
    const el = mountDropdownChild(`
      <oas-button>操作</oas-button>
      <oas-dropdown-item value="grid" kind="checkbox">网格线</oas-dropdown-item>
      <oas-dropdown-item value="del" danger>删除</oas-dropdown-item>
      <oas-dropdown-item value="docs" href="/guide" target="_blank" rel="noopener">文档</oas-dropdown-item>
      <oas-dropdown-item value="save" loading>加载中</oas-dropdown-item>
      <oas-dropdown-item value="off" disabled>禁用</oas-dropdown-item>
    `)
    el.setAttribute('open', '')
    await Promise.resolve()
    const root = innerMenuRoot(el)
    // checkbox：menuitemcheckbox + 方块勾选框
    const grid = root.querySelector<HTMLElement>('[part="item"][data-value="grid"]')!
    expect(grid.getAttribute('role')).toBe('menuitemcheckbox')
    expect(grid.querySelector('.check--box')).not.toBeNull()
    // danger 红字类
    expect(root.querySelector('[data-value="del"]')!.classList.contains('danger')).toBe(true)
    // href 链接项渲染为 <a>
    const docs = root.querySelector<HTMLAnchorElement>('[part="item"][data-value="docs"]')!
    expect(docs.tagName).toBe('A')
    expect(docs.getAttribute('href')).toBe('/guide')
    expect(docs.getAttribute('target')).toBe('_blank')
    expect(docs.getAttribute('rel')).toBe('noopener')
    // loading：spinner + aria-busy + 禁点
    const save = root.querySelector<HTMLElement>('[part="item"][data-value="save"]')!
    expect(save.classList.contains('loading')).toBe(true)
    expect(save.getAttribute('aria-busy')).toBe('true')
    expect(save.getAttribute('aria-disabled')).toBe('true')
    expect(save.querySelector('.spin')).not.toBeNull()
    // disabled 禁点
    const off = root.querySelector<HTMLElement>('[part="item"][data-value="off"]')!
    expect(off.getAttribute('aria-disabled')).toBe('true')
    // loading/disabled 点击不派发 select（oas-select 冒泡 composed，宿主收两次同值 detail——断言值而非计数）
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    save.click()
    off.click()
    expect(detail).toBeUndefined()
    // checkbox 点击：派发 oas-select（detail 与 items 通道一致）+ 宿主 value 同步为该项
    grid.click()
    expect(detail).toMatchObject({ value: 'grid' })
    expect(el.getAttribute('value')).toBe('grid')
  })

  it('MutationObserver：运行时 append oas-dropdown-item 后菜单刷新出现新项', async () => {
    const el = mountDropdownChild(`
      <oas-button>操作</oas-button>
      <oas-dropdown-item value="home">首页</oas-dropdown-item>
    `)
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(innerMenuRoot(el).querySelectorAll('[part="item"]').length).toBe(1)
    const item = document.createElement('oas-dropdown-item')
    item.setAttribute('value', 'about')
    item.textContent = '关于'
    el.appendChild(item)
    await new Promise((r) => setTimeout(r, 0))
    expect(innerMenuRoot(el).querySelectorAll('[part="item"]').length).toBe(2)
    expect(innerMenuRoot(el).querySelector('[part="item"][data-value="about"]')).not.toBeNull()
  })

  it('trigger click 开合不受影响（触发按钮仍为首子元素，载体不误当锚点）', async () => {
    const el = mountDropdownChild(`
      <button>操作</button>
      <oas-dropdown-item value="home">首页</oas-dropdown-item>
      <oas-dropdown-divider></oas-dropdown-divider>
    `)
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.hasAttribute('open')).toBe(true)
    await Promise.resolve()
    expect(innerMenuRoot(el).querySelector('[part="item"][data-value="home"]')).not.toBeNull()
    expect(innerMenuRoot(el).querySelector('[part="divider"]')).not.toBeNull()
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('placement 翻转不受影响（子元素通道数据同样走定位引擎）', () => {
    const el = mountDropdownChild(
      `<button>操作</button><oas-dropdown-item value="home">首页</oas-dropdown-item>`,
      { placement: 'bottom' },
    )
    ;(el.querySelector('button') as HTMLElement).getBoundingClientRect = () =>
      ({ left: 400, top: 740, width: 80, height: 32, right: 480, bottom: 772 }) as DOMRect
    ;(anchorEl(el) as HTMLElement).getBoundingClientRect = () =>
      ({ left: 350, top: 0, width: 200, height: 60, right: 550, bottom: 60 }) as DOMRect
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    el.setAttribute('open', '')
    // 底部空间不足（772+60+8 > 800）→ 翻转到 top
    expect(anchorEl(el).getAttribute('data-placement')).toBe('top')
  })
})
