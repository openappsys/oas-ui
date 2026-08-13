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
  const el = new OASDropdown
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.items) el.setAttribute('items', ITEMS)
  el.innerHTML = `<button>操作</button>`
  document.body.appendChild(el)
  return el
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

describe('OASDropdown',  => {
  beforeEach( => {
    document.body.innerHTML = ''
  })

  afterEach( => {
    document.body.innerHTML = ''
  })

  it('open 时显示浮层菜单（内层 oas-menu 渲染 items）', async  => {
    const el = mount({ open: '' })
    await Promise.resolve
    expect(anchorEl(el).hasAttribute('hidden')).toBe(false)
    expect(innerMenuRoot(el).querySelectorAll('[part="item"]').length).toBe(2)
  })

  it('点击触发切换 open',  => {
    const el = mount
    ;(el.querySelector('button') as HTMLElement).click
    expect(anchorEl(el).hasAttribute('hidden')).toBe(false)
  })

  it('选择菜单项派发 oas-select 并关闭', async  => {
    const el = mount({ open: '' })
    await Promise.resolve
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(innerMenuRoot(el).querySelector('[part="item"]') as HTMLElement).click
    expect(detail).toEqual({ value: 'edit' })
    expect(el.hasAttribute('open')).toBe(false)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('多级子菜单：hover 级联展开内层菜单子菜单，选中叶子项派发 select', async  => {
    const el = mount({ open: '', items: NESTED_ITEMS })
    await Promise.resolve
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    const root = innerMenuRoot(el)
    const file = root.querySelector<HTMLElement>('[part="item"][data-value="file"]')!
    file.dispatchEvent(new MouseEvent('mouseenter'))
    const newItem = root.querySelector<HTMLElement>('[part="item"][data-value="new"]')!
    expect(newItem).not.toBeNull
    newItem.dispatchEvent(new MouseEvent('mouseenter'))
    const windowItem = root.querySelector<HTMLElement>('[part="item"][data-value="new-window"]')!
    expect(windowItem).not.toBeNull
    windowItem.click
    expect(detail).toEqual({ value: 'new-window' })
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('关闭后重开：不残留级联子菜单展开态', async  => {
    const el = mount({ open: '', items: NESTED_ITEMS })
    await Promise.resolve
    const root = innerMenuRoot(el)
    root
      .querySelector<HTMLElement>('[part="item"][data-value="file"]')!
      .dispatchEvent(new MouseEvent('mouseenter'))
    expect(root.querySelectorAll('.item.open').length).toBeGreaterThan(0)
    // 外部点击关闭 → 重开：级联展开态应清空
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(false)
    el.setAttribute('open', '')
    await Promise.resolve
    expect(root.querySelectorAll('.item.open').length).toBe(0)
  })
})

// —— P1 补缺：下拉按钮（split 模式）——
// 主按钮 + 拆分箭头按钮：点箭头开菜单，主按钮点击派发 oas-action。

describe('OASDropdown split 下拉按钮',  => {
  beforeEach( => {
    document.body.innerHTML = ''
  })

  afterEach( => {
    document.body.innerHTML = ''
  })

  function arrowBtn(el: OASDropdown): HTMLButtonElement {
    return el.shadowRoot!.querySelector<HTMLButtonElement>('.arrow-btn')!
  }

  it('split 属性列入 observedAttributes',  => {
    expect(OASDropdown.observedAttributes).toContain('split')
  })

  it('渲染箭头按钮；非 split 时隐藏（display:none）',  => {
    const plain = mount
    const arrow = arrowBtn(plain)
    expect(arrow).not.toBeNull
    expect(arrow.getAttribute('aria-haspopup')).toBe('menu')
    const css = plain.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toMatch(/:host\(:not\(\[split\]\)\)\s*\.arrow-btn\s*\{[^}]*display:\s*none/)
    const split = mount({ split: '' })
    expect(split.hasAttribute('split')).toBe(true)
  })

  it('split：点主按钮派发 oas-action 且不打开菜单',  => {
    const el = mount({ split: '' })
    let detail: unknown
    el.addEventListener('oas-action', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.querySelector('button') as HTMLElement).click
    expect(detail).toBeDefined
    expect(el.hasAttribute('open')).toBe(false)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('split：点箭头按钮切换菜单',  => {
    const el = mount({ split: '' })
    arrowBtn(el).click
    expect(el.hasAttribute('open')).toBe(true)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(false)
    arrowBtn(el).click
    expect(anchorEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('箭头按钮 aria-expanded 随 open 同步，aria-label 走 locale',  => {
    const el = mount({ split: '' })
    expect(arrowBtn(el).getAttribute('aria-expanded')).toBe('false')
    expect(arrowBtn(el).getAttribute('aria-label')).toBe('打开菜单')
    arrowBtn(el).click
    expect(arrowBtn(el).getAttribute('aria-expanded')).toBe('true')
  })

  it('split：选择菜单项派发 oas-select 并关闭', async  => {
    const el = mount({ split: '' })
    arrowBtn(el).click
    await Promise.resolve
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(innerMenuRoot(el).querySelector('[part="item"]') as HTMLElement).click
    expect(detail).toEqual({ value: 'edit' })
    expect(el.hasAttribute('open')).toBe(false)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('split：打开菜单后点主按钮不开不关，点箭头关闭',  => {
    const el = mount({ split: '' })
    arrowBtn(el).click
    expect(el.hasAttribute('open')).toBe(true)
    ;(el.querySelector('button') as HTMLElement).click
    expect(el.hasAttribute('open')).toBe(true)
    arrowBtn(el).click
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('非 split：主按钮点击仍是切换菜单（原行为不变）',  => {
    const el = mount
    ;(el.querySelector('button') as HTMLElement).click
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('拆分箭头按钮 part=split-arrow（与浮层箭头 part=arrow 区分，避免 ::part(arrow) 一选二）',  => {
    const el = mount({ split: '' })
    expect(arrowBtn(el).getAttribute('part')).toBe('split-arrow')
  })
})

// —— P2 补缺：箭头——
// 面板带指向触发元素的箭头（默认显示）：`arrow="false"` 隐藏；`arrow-point-at-center`
// 固定指向面板中心（默认按触发元素投影定位）；`auto-adjust-overflow="false"` 关闭视口翻转。

describe('OASDropdown 箭头（arrow）',  => {
  beforeEach( => {
    document.body.innerHTML = ''
  })

  afterEach( => {
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
    ;(el as HTMLElement).getBoundingClientRect =  =>
      ({
        x: r.left,
        y: r.top,
        width: r.width,
        height: r.height,
        left: r.left,
        top: r.top,
        right: r.left + r.width,
        bottom: r.top + r.height,
        toJSON:  => ({}),
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

  it('箭头元素存在：part=arrow + data-popper-arrow + aria-hidden，不破坏菜单渲染', async  => {
    const el = mount({ open: '' })
    await Promise.resolve
    const arrow = arrowOf(el)
    expect(arrow).not.toBeNull
    expect(arrow.getAttribute('part')).toBe('arrow')
    expect(arrow.getAttribute('aria-hidden')).toBe('true')
    // 菜单项照常渲染（箭头骨架不破坏内层 oas-menu 内容）
    expect(innerMenuRoot(el).querySelectorAll('[part="item"]').length).toBe(2)
  })

  it('新增属性列入 observedAttributes',  => {
    expect(OASDropdown.observedAttributes).toEqual(
      expect.arrayContaining(['arrow', 'arrow-point-at-center', 'auto-adjust-overflow']),
    )
  })

  it('open 后面板写 data-placement，箭头按 4 向 placement 落边（外露边框对与面板描边衔接）',  => {
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
      expect(arrow).not.toBeNull
      // 悬空边为 -4px（8px 方块半宽外探）：happy-dom 可解析 shadow <style> 的简单声明
      expect(window.getComputedStyle(arrow).getPropertyValue(cases[p].edge)).toBe('-4px')
      // 边框对：var 颜色 happy-dom 不解析，锁样式规则文本（left/right 曾把外露边框对写反）
      const styleText = el.shadowRoot!.querySelector('style')!.textContent!
      const block = styleText
        .split(`.menu-anchor[data-placement='${p}'] .arrow {`)[1]!
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

  it('arrow="false" 隐藏箭头（hidden 属性驱动，骨架保留）',  => {
    const hidden = mount({ open: '', arrow: 'false' })
    expect(arrowOf(hidden).hasAttribute('hidden')).toBe(true)
    expect(arrowOf(hidden)).not.toBeNull // 骨架保留（DSD 快照结构稳定）
    const shown = mount({ open: '' })
    expect(arrowOf(shown).hasAttribute('hidden')).toBe(false)
  })

  it('point-at-center（默认 false）：箭头沿面板边指向触发元素中心（锚点中心投影 + 边距夹取）',  => {
    const el = mountOpen({ placement: 'bottom' })
    const arrow = arrowOf(el)
    // 锚点中心 x = 400 + 40 = 440；面板 left=350 → 投影 90 - 箭头半宽 4 = 86 → --arrow-x: 86px
    expect(arrow.style.getPropertyValue('--arrow-x')).toBe('')
    expect(arrow.style.getPropertyValue('--arrow-y')).toBe('')
  })

  it('arrow-point-at-center=true：不写内联偏移，箭头居中（CSS calc(50% - 4px) 兜底）',  => {
    const el = mountOpen({ placement: 'bottom', 'arrow-point-at-center': '' })
    const arrow = arrowOf(el)
    expect(arrow.style.getPropertyValue('--arrow-x')).toBe('86px')
    expect(arrow.style.getPropertyValue('--arrow-y')).toBe('')
    const styleText = el.shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toContain('left: var(--arrow-x, calc(50% - 4px))')
  })

  it('auto-adjust-overflow=false：视口不足不翻转（placement 严格保持请求值，可越出视口）',  => {
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
