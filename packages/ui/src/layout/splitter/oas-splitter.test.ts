import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import { OASSplitter } from './index.js'

/** 旧两面板模式：slot=left/right 子元素（legacy 零回归基线） */
function mount(): OASSplitter {
  const el = new OASSplitter()
  el.innerHTML = `<div slot="left">左面板</div><div slot="right">右面板</div>`
  document.body.appendChild(el)
  return el
}

/** 多面板模式：直接子元素即面板 */
function mountMulti(inner = `<div>一</div><div>二</div><div>三</div>`): OASSplitter {
  const el = new OASSplitter()
  el.innerHTML = inner
  document.body.appendChild(el)
  return el
}

function key(el: OASSplitter, keyName: string, splitterIdx = 0): void {
  el.shadowRoot!.querySelectorAll('[part="splitter"]')[splitterIdx]!.dispatchEvent(
    new KeyboardEvent('keydown', { key: keyName, bubbles: true }),
  )
}

/** 折叠按钮与分隔条同级挂在 .sep 容器内（不是 separator 后代，避免交互元素嵌套） */
function collapseBtnOf(el: OASSplitter, splitterIdx = 0): HTMLButtonElement {
  const splitter = el.shadowRoot!.querySelectorAll('[part="splitter"]')[splitterIdx]!
  return splitter.parentElement!.querySelector(':scope > .collapse-btn') as HTMLButtonElement
}

describe('OASSplitter', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('渲染分割条', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelectorAll('[part="splitter"]').length).toBe(1)
  })

  it('方向键调整比例并派发 oas-resize', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    let detail: unknown
    el.addEventListener('oas-resize', (e: Event) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector('[part="splitter"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    )
    expect(detail).toEqual({ percent: 51 })
  })

  it('min/max 限制比例', () => {
    const el = mount()
    el.setAttribute('percent', '10')
    el.setAttribute('min', '30')
    el.setAttribute('max', '70')
    el.shadowRoot!.querySelector('[part="splitter"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    )
    expect(Number(el.getAttribute('percent'))).toBeGreaterThanOrEqual(30)
  })

  it('鼠标拖拽分割条改变 percent 并派发 oas-resize', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    let detail: unknown
    el.addEventListener('oas-resize', (e: Event) => (detail = (e as CustomEvent).detail))
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(pointer('pointerdown', 500))
    document.dispatchEvent(pointer('pointermove', 600))
    expect(Number(el.getAttribute('percent'))).toBe(60)
    expect(detail).toEqual({ percent: 60 })
    document.dispatchEvent(pointer('pointerup', 600))
    // 松手后不再响应
    document.dispatchEvent(pointer('pointermove', 700))
    expect(Number(el.getAttribute('percent'))).toBe(60)
  })

  it('拖拽受 min/max 限制', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    el.setAttribute('min', '20')
    el.setAttribute('max', '80')
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(pointer('pointerdown', 500))
    document.dispatchEvent(pointer('pointermove', 950))
    expect(Number(el.getAttribute('percent'))).toBe(80)
    document.dispatchEvent(pointer('pointerup', 950))
  })

  // ---------- vertical ----------

  it('vertical：上下堆叠、分隔条 aria-orientation=horizontal、ArrowUp/Down 调整', () => {
    const el = mount()
    el.setAttribute('vertical', '')
    el.setAttribute('percent', '50')
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    expect(splitter.getAttribute('aria-orientation')).toBe('horizontal')
    let detail: unknown
    el.addEventListener('oas-resize', (e: Event) => (detail = (e as CustomEvent).detail))
    key(el, 'ArrowUp')
    expect(detail).toEqual({ percent: 49 })
    key(el, 'ArrowDown')
    expect(Number(el.getAttribute('percent'))).toBe(50)
    // 垂直分隔条光标走 row-resize（样式类已按 vertical 覆盖）
    expect(JSON.stringify(el.shadowRoot!.querySelector('style')!.textContent)).toContain('cursor: row-resize')
  })

  it('RTL：dir=rtl 下拖拽方向翻转（向右拖 → 百分比减小）', () => {
    const el = mount()
    el.setAttribute('dir', 'rtl')
    el.setAttribute('percent', '50')
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(pointer('pointerdown', 500))
    document.dispatchEvent(pointer('pointermove', 600))
    expect(Number(el.getAttribute('percent'))).toBe(40)
    document.dispatchEvent(pointer('pointerup', 600))
  })

  it('RTL：方向键语义镜像（ArrowLeft → 前面板放大，与视觉行内轴一致）', () => {
    const el = mount()
    el.setAttribute('dir', 'rtl')
    el.setAttribute('percent', '50')
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(Number(el.getAttribute('percent'))).toBe(51)
    splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(Number(el.getAttribute('percent'))).toBe(50)
  })

  // ---------- collapsible ----------

  it('collapsible：折叠按钮渲染 + 点击收起（左面板 0%）+ collapsed 回写 + oas-collapse + 再点展开', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    el.setAttribute('collapsible', '')
    const btn = collapseBtnOf(el)
    expect(btn.getAttribute('aria-label')).toBe('收起面板')
    const left = el.shadowRoot!.querySelector('.pane:first-of-type') as HTMLElement
    let detail: unknown
    el.addEventListener('oas-collapse', (e: Event) => (detail = (e as CustomEvent).detail))
    // 收起
    btn.click()
    expect(left.style.flex).toBe('0 0 0%')
    expect(el.hasAttribute('collapsed')).toBe(true)
    expect(detail).toEqual({ collapsed: true, side: 'left' })
    expect(btn.getAttribute('aria-label')).toBe('展开面板')
    // 展开
    btn.click()
    expect(el.hasAttribute('collapsed')).toBe(false)
    expect(detail).toEqual({ collapsed: false, side: 'left' })
    expect(left.style.flex).toBe('0 0 50%')
    expect(btn.getAttribute('aria-label')).toBe('收起面板')
  })

  it('collapsible：折叠按钮文案随 setLocale 切换', () => {
    const el = mount()
    el.setAttribute('collapsible', '')
    const btn = el.shadowRoot!.querySelector('.collapse-btn') as HTMLButtonElement
    expect(btn.getAttribute('aria-label')).toBe('收起面板')
    setLocale(en)
    expect(btn.getAttribute('aria-label')).toBe('Collapse panel')
    setLocale('zh-CN')
    expect(btn.getAttribute('aria-label')).toBe('收起面板')
  })

  it('外部 collapsed 属性受控折叠：设置即收起，移除即展开', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    el.setAttribute('collapsible', '')
    el.setAttribute('collapsed', '')
    const left = el.shadowRoot!.querySelector('.pane:first-of-type') as HTMLElement
    expect(left.style.flex).toBe('0 0 0%')
    el.removeAttribute('collapsed')
    expect(left.style.flex).toBe('0 0 50%')
  })

  // ---------- reset（双击复位） ----------

  it('双击分隔条复位初始 percent 并派发 oas-resize', () => {
    const el = new OASSplitter()
    el.setAttribute('percent', '30')
    el.innerHTML = `<div slot="left">左面板</div><div slot="right">右面板</div>`
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    document.body.appendChild(el)
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(pointer('pointerdown', 500))
    document.dispatchEvent(pointer('pointermove', 600))
    expect(Number(el.getAttribute('percent'))).toBe(40)
    document.dispatchEvent(pointer('pointerup', 600))
    let detail: unknown
    el.addEventListener('oas-resize', (e: Event) => (detail = (e as CustomEvent).detail))
    splitter.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(Number(el.getAttribute('percent'))).toBe(30)
    expect(detail).toEqual({ percent: 30 })
  })

  // ---------- lazy ----------

  it('lazy：拖拽中不写 percent，松手才写 + resize 仅一次', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    el.setAttribute('lazy', '')
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    let count = 0
    let detail: unknown
    el.addEventListener('oas-resize', (e: Event) => {
      count++
      detail = (e as CustomEvent).detail
    })
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(pointer('pointerdown', 500))
    document.dispatchEvent(pointer('pointermove', 600))
    document.dispatchEvent(pointer('pointermove', 700))
    expect(Number(el.getAttribute('percent'))).toBe(50)
    expect(count).toBe(0)
    document.dispatchEvent(pointer('pointerup', 700))
    expect(Number(el.getAttribute('percent'))).toBe(70)
    expect(count).toBe(1)
    expect(detail).toEqual({ percent: 70 })
  })

  // ---------- handle 插槽 ----------

  it('handle 插槽：分隔条内可放自定义手柄内容（无 handle 时回退 grip）', () => {
    const el = mount()
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    // 无 handle：默认 grip 圆点
    expect(splitter.querySelectorAll('.grip').length).toBe(1)
    // 有 handle：分隔条内 slot 分发自定义内容
    el.innerHTML = '<div slot="left">左</div><div slot="right">右</div><span slot="handle" class="custom-dot">·</span>'
    expect(splitter.querySelectorAll('slot[name="handle"]').length).toBe(1)
    expect(el.querySelector('[slot="handle"]')?.textContent).toBe('·')
    // handle 不影响拖拽
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    splitter.dispatchEvent(pointer('pointerdown', 500))
    document.dispatchEvent(pointer('pointermove', 600))
    expect(Number(el.getAttribute('percent'))).toBe(60)
    document.dispatchEvent(pointer('pointerup', 600))
  })

  // ---------- 像素 min/max ----------

  it('min/max 支持像素值：200px/500px 按容器宽度换算夹取（数字百分比零回归）', () => {
    const el = mount()
    el.setAttribute('percent', '30')
    el.setAttribute('min', '200px')
    el.setAttribute('max', '500px')
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    // min=200px → 20%：ArrowLeft 从 30 只能到 20
    for (let i = 0; i < 20; i++) key(el, 'ArrowLeft')
    expect(Number(el.getAttribute('percent'))).toBe(20)
    // max=500px → 50%：拖拽夹取到 50
    el.setAttribute('percent', '30')
    splitter.dispatchEvent(pointer('pointerdown', 300))
    document.dispatchEvent(pointer('pointermove', 900))
    expect(Number(el.getAttribute('percent'))).toBe(50)
    document.dispatchEvent(pointer('pointerup', 900))
    // 数字百分比语义保持
    el.setAttribute('min', '10')
    el.setAttribute('max', '90')
    el.setAttribute('percent', '50')
    splitter.dispatchEvent(pointer('pointerdown', 500))
    document.dispatchEvent(pointer('pointermove', 600))
    expect(Number(el.getAttribute('percent'))).toBe(60)
    document.dispatchEvent(pointer('pointerup', 600))
  })

  // ---------- multiple（多面板） ----------

  it('multiple：3 面板渲染两个分隔条 + sizes 分配 + 子元素 slot 托管', () => {
    const el = mountMulti()
    el.setAttribute('sizes', '30,40,30')
    expect(el.shadowRoot!.querySelectorAll('[part="splitter"]').length).toBe(2)
    const panes = el.shadowRoot!.querySelectorAll('.pane')
    expect(panes.length).toBe(3)
    expect((panes[0] as HTMLElement).style.flex).toBe('0 0 30%')
    expect((panes[1] as HTMLElement).style.flex).toBe('0 0 40%')
    // 末面板吸收余量
    expect((panes[2] as HTMLElement).style.flex).toBe('1 1 0%')
    expect(el.children[0]!.getAttribute('slot')).toBe('pane-0')
    expect(el.children[2]!.getAttribute('slot')).toBe('pane-2')
  })

  it('multiple：拖拽中间分隔条调整相邻两面板（此消彼长）', () => {
    const el = mountMulti()
    el.setAttribute('sizes', '30,40,30')
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    const mid = el.shadowRoot!.querySelectorAll('[part="splitter"]')[1]!
    let detail: unknown
    el.addEventListener('oas-resize', (e: Event) => (detail = (e as CustomEvent).detail))
    mid.dispatchEvent(pointer('pointerdown', 700))
    document.dispatchEvent(pointer('pointermove', 800))
    document.dispatchEvent(pointer('pointerup', 800))
    const panes = el.shadowRoot!.querySelectorAll('.pane')
    expect((panes[1] as HTMLElement).style.flex).toBe('0 0 50%')
    expect((panes[2] as HTMLElement).style.flex).toBe('1 1 0%')
    expect(el.getAttribute('sizes')).toBe('30,50,20')
    expect(detail).toEqual({ percent: 50, index: 1, sizes: [30, 50, 20] })
  })

  it('multiple：键盘方向键调整对应分隔条相邻面板', () => {
    const el = mountMulti()
    el.setAttribute('sizes', '30,40,30')
    key(el, 'ArrowRight', 1)
    expect(el.getAttribute('sizes')).toBe('30,41,29')
    key(el, 'ArrowLeft', 0)
    expect(el.getAttribute('sizes')).toBe('29,42,29')
  })

  it('sizes 数量不匹配回落均分', () => {
    const el = mountMulti()
    el.setAttribute('sizes', '30,70')
    const panes = el.shadowRoot!.querySelectorAll('.pane')
    const flexOf = (i: number) => parseFloat((panes[i] as HTMLElement).style.flex.split(' ')[2] ?? '')
    expect(flexOf(0)).toBeCloseTo(33.33, 1)
    expect(flexOf(1)).toBeCloseTo(33.33, 1)
  })

  it('multiple：折叠按钮独立——每个分隔条各管相邻面板', () => {
    const el = mountMulti()
    el.setAttribute('sizes', '30,40,30')
    el.setAttribute('collapsible', '')
    const panes = el.shadowRoot!.querySelectorAll('.pane')
    const btn0 = collapseBtnOf(el, 0)
    const btn1 = collapseBtnOf(el, 1)
    expect(el.shadowRoot!.querySelectorAll('.collapse-btn').length, '每个分隔条各一个折叠按钮').toBe(2)
    expect([btn0, btn1].map((b) => b.getAttribute('data-splitter-index'))).toEqual(['0', '1'])
    btn0.click()
    expect((panes[0] as HTMLElement).style.flex).toBe('0 0 0%')
    expect(el.getAttribute('sizes')).toBe('0,70,30')
    // 第二个分隔条独立折叠面板 1
    btn1.click()
    expect((panes[1] as HTMLElement).style.flex).toBe('0 0 0%')
    expect(el.getAttribute('sizes')).toBe('0,0,100')
  })

  it('multiple：连接前设置的初始 collapsed 属性生效（不被首渲染 prune 吞掉）+ mount 事件次数', () => {
    const el = new OASSplitter()
    el.innerHTML = `<div>一</div><div>二</div><div>三</div>`
    el.setAttribute('sizes', '30,40,30')
    el.setAttribute('collapsible', '')
    el.setAttribute('collapsed', '')
    let collapse = 0
    let resize = 0
    let detail: unknown
    el.addEventListener('oas-collapse', (e: Event) => {
      collapse++
      detail = (e as CustomEvent).detail
    })
    el.addEventListener('oas-resize', () => resize++)
    document.body.appendChild(el)
    expect(el.hasAttribute('collapsed'), '显式 collapsed 属性应保留').toBe(true)
    expect((el.shadowRoot!.querySelectorAll('.pane')[0] as HTMLElement).style.flex).toBe('0 0 0%')
    expect(el.getAttribute('sizes')).toBe('0,70,30')
    // 与 legacy 显式 collapsed 对齐：mount 期派发一次 oas-collapse，不派发 oas-resize
    expect(collapse).toBe(1)
    expect(detail).toEqual({ collapsed: true, side: 'left' })
    expect(resize).toBe(0)
  })

  it('multiple：子元素增删自动同步分隔条数量', async () => {
    const el = mountMulti()
    expect(el.shadowRoot!.querySelectorAll('[part="splitter"]').length).toBe(2)
    el.innerHTML = `<div>一</div><div>二</div>`
    // MutationObserver 回调走微任务
    await new Promise((r) => setTimeout(r, 0))
    expect(el.shadowRoot!.querySelectorAll('[part="splitter"]').length).toBe(1)
    expect(el.children[0]!.getAttribute('slot')).toBe('pane-0')
  })

  it('multiple：结构重建不残留孤儿 .sep（含陈旧折叠按钮），.sep 与 separator 数量一致', async () => {
    const el = mountMulti(`<div>一</div><div>二</div><div>三</div>`)
    el.setAttribute('collapsible', '')
    expect(el.shadowRoot!.querySelectorAll('.sep').length).toBe(2)
    // 删一个面板触发结构重建
    el.innerHTML = `<div>一</div><div>二</div>`
    await new Promise((r) => setTimeout(r, 0))
    expect(el.shadowRoot!.querySelectorAll('.sep').length, '.sep 数量应随结构重建收敛').toBe(1)
    expect(el.shadowRoot!.querySelectorAll('[part="splitter"]').length).toBe(1)
    const btns = el.shadowRoot!.querySelectorAll('.collapse-btn')
    expect(btns.length, '不应残留陈旧折叠按钮').toBe(1)
    expect(btns[0]!.getAttribute('data-splitter-index')).toBe('0')
    const order = Array.from(el.shadowRoot!.children)
      .filter((n) => n.tagName !== 'STYLE')
      .map((n) => (n.classList.contains('sep') ? 'sep' : 'pane'))
    expect(order, '.sep 应夹在面板之间，不跑到头部').toEqual(['pane', 'sep', 'pane'])
  })

  it('legacy 零回归：slot=left/right 旧用法保持两面板 + 分隔条', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelectorAll('.pane').length).toBe(2)
    expect(el.shadowRoot!.querySelectorAll('[part="splitter"]').length).toBe(1)
    expect(el.shadowRoot!.querySelectorAll('[part="pane-left"]').length).toBe(1)
    expect(el.shadowRoot!.querySelectorAll('[part="pane-right"]').length).toBe(1)
  })

  it('折叠按钮与分隔条同级：不是 separator 后代（axe nested-interactive 回归固化）', () => {
    const el = mount()
    el.setAttribute('collapsible', '')
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    const btn = collapseBtnOf(el)
    expect(splitter.contains(btn), '交互按钮不能是 separator 的后代').toBe(false)
    expect(btn.parentElement!.contains(splitter)).toBe(true)
    expect(btn.getAttribute('data-splitter-index')).toBe('0')
  })

  it('multi：各折叠按钮携带自己的索引，点击折叠对应一侧', () => {
    const el = mountMulti()
    el.setAttribute('sizes', '30,40,30')
    el.setAttribute('collapsible', '')
    const btn1 = collapseBtnOf(el, 1)
    expect(btn1.getAttribute('data-splitter-index')).toBe('1')
    btn1.click()
    expect((el.shadowRoot!.querySelectorAll('.pane')[1] as HTMLElement).style.flex).toBe('0 0 0%')
    expect(el.getAttribute('sizes')).toBe('30,0,70')
  })

  it('折叠按钮键盘聚焦环走 --oas-focus-ring（无规则时落回 UA 默认黑环）', () => {
    // 回归：.collapse-btn 无 :focus-visible 规则，键盘聚焦得到 UA 默认 outline: rgb(16,16,16) auto，
    // 与全库 --oas-focus-ring（.splitter:focus-visible / .copy-btn:focus-visible 同款通道）不一致
    const el = mount()
    el.setAttribute('collapsible', '')
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style, '.collapse-btn 需要 :focus-visible 聚焦环规则').toMatch(
      /\.collapse-btn:focus-visible\s*\{[^}]*box-shadow:\s*var\(--oas-focus-ring\)/,
    )
    expect(style).toMatch(/\.collapse-btn:focus-visible\s*\{[^}]*outline:\s*none/)
  })
})

describe('OASSplitter disabled（禁用调整，PRD P2）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('disabled 进 observedAttributes；分隔条标记 aria-disabled（动态切换）', () => {
    const el = mount()
    expect(OASSplitter.observedAttributes).toContain('disabled')
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    expect(splitter.getAttribute('aria-disabled')).toBe('false')
    el.setAttribute('disabled', '')
    expect(splitter.getAttribute('aria-disabled')).toBe('true')
    el.removeAttribute('disabled')
    expect(splitter.getAttribute('aria-disabled')).toBe('false')
  })

  it('disabled：键盘方向键不再调整、不派发 oas-resize', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    el.setAttribute('disabled', '')
    let fired = 0
    el.addEventListener('oas-resize', () => fired++)
    key(el, 'ArrowRight')
    expect(Number(el.getAttribute('percent'))).toBe(50)
    expect(fired).toBe(0)
  })

  it('disabled：指针拖拽无效（percent 冻结、无 dragging 态）', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    el.setAttribute('disabled', '')
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(pointer('pointerdown', 500))
    document.dispatchEvent(pointer('pointermove', 600))
    document.dispatchEvent(pointer('pointerup', 600))
    expect(el.getAttribute('percent')).toBe('50')
    expect(el.hasAttribute('dragging'), '禁用下不得进入拖拽态').toBe(false)
  })

  it('disabled：双击复位无效', () => {
    const el = mount()
    el.setAttribute('percent', '30')
    el.setAttribute('disabled', '')
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(Number(el.getAttribute('percent'))).toBe(30)
  })

  it('disabled：分隔条光标恢复常态（CSS 规则）', () => {
    const el = mount()
    el.setAttribute('disabled', '')
    // data-disabled 镜像（自身 disabled 与 config-provider 注入禁用共用消费点）
    expect(el.hasAttribute('data-disabled'), '禁用态应镜像 data-disabled 供样式消费').toBe(true)
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style, 'data-disabled 下分隔条 cursor 应为常态').toMatch(
      /:host\(\[data-disabled\]\)\s+\.splitter\s*\{[^}]*cursor:\s*default/,
    )
  })

  it('multi 模式：所有分隔条同步 aria-disabled 且拖拽冻结', () => {
    const el = mountMulti()
    el.setAttribute('disabled', '')
    const splitters = el.shadowRoot!.querySelectorAll('[part="splitter"]')
    expect(splitters.length).toBe(2)
    splitters.forEach((s) => expect(s.getAttribute('aria-disabled')).toBe('true'))
    el.setAttribute('sizes', '30,40,30')
    splitters[0]!.dispatchEvent(pointer('pointerdown', 300))
    document.dispatchEvent(pointer('pointermove', 400))
    document.dispatchEvent(pointer('pointerup', 400))
    expect(el.getAttribute('sizes')).toBe('30,40,30')
  })
})

describe('OASSplitter snap（拖拽吸附档位，PRD D18）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('snap 进 observedAttributes', () => {
    expect(OASSplitter.observedAttributes).toContain('snap')
  })

  it('拖到档位 ±8px 阈值内吸附落盘；阈值外不吸附', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    el.setAttribute('snap', '25,50,75')
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(pointer('pointerdown', 500))
    // 508 → 50.8%，距 50 档 0.8%（=8px）≤ 阈值 → 吸附 50
    document.dispatchEvent(pointer('pointermove', 508))
    expect(el.getAttribute('percent')).toBe('50')
    // 510 → 51%，距档 1%（=10px）> 阈值 → 不吸附
    document.dispatchEvent(pointer('pointermove', 510))
    expect(el.getAttribute('percent')).toBe('51')
    // 755 → 75.5% → 吸附 75
    document.dispatchEvent(pointer('pointermove', 755))
    expect(el.getAttribute('percent')).toBe('75')
    document.dispatchEvent(pointer('pointerup', 755))
    expect(el.getAttribute('percent')).toBe('75')
  })

  it('min 夹取优先：越界档位不吸附（min=30 时 25 档不可达）', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    el.setAttribute('snap', '25')
    el.setAttribute('min', '30')
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(pointer('pointerdown', 500))
    document.dispatchEvent(pointer('pointermove', 245)) // 24.5% → clamp 30；档位 25 < min → 不吸附
    expect(Number(el.getAttribute('percent'))).toBe(30)
    document.dispatchEvent(pointer('pointerup', 245))
  })

  it('键盘方向键在档位间落档；无档可落回落 ±1%', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    el.setAttribute('snap', '25,50,75')
    key(el, 'ArrowRight')
    expect(el.getAttribute('percent')).toBe('75')
    key(el, 'ArrowRight')
    expect(el.getAttribute('percent')).toBe('76') // 已在末档：回落 +1%
    key(el, 'ArrowLeft')
    expect(el.getAttribute('percent')).toBe('75')
    key(el, 'ArrowLeft')
    expect(el.getAttribute('percent')).toBe('50')
    key(el, 'ArrowLeft')
    expect(el.getAttribute('percent')).toBe('25')
    key(el, 'ArrowLeft')
    expect(el.getAttribute('percent')).toBe('24') // 已在首档：回落 -1%
  })

  it('multi 模式：键盘与拖拽吸附对应分隔条的相邻面板', () => {
    // 键盘：sizes[0]=30 → 下一档 50
    const kb = mountMulti()
    kb.setAttribute('sizes', '30,40,30')
    kb.setAttribute('snap', '25,50,75')
    key(kb, 'ArrowRight', 0)
    expect(kb.getAttribute('sizes')).toBe('50,20,30')
    // 拖拽第二分隔条（独立实例，sizes[1]=40）：645 → 24.5% 吸附 25
    const el = mountMulti()
    el.setAttribute('sizes', '30,40,30')
    el.setAttribute('snap', '25,50,75')
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    const mid = el.shadowRoot!.querySelectorAll('[part="splitter"]')[1]!
    mid.dispatchEvent(pointer('pointerdown', 800))
    document.dispatchEvent(pointer('pointermove', 645))
    document.dispatchEvent(pointer('pointerup', 645))
    expect(el.getAttribute('sizes')).toBe('30,25,45')
  })

  it('px 档位：200px 按容器宽度换算后吸附', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    el.setAttribute('snap', '200px')
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(pointer('pointerdown', 500))
    document.dispatchEvent(pointer('pointermove', 205)) // 20.5% → 200px 档（20%）在阈值内
    expect(el.getAttribute('percent')).toBe('20')
    document.dispatchEvent(pointer('pointerup', 205))
  })

  it('lazy：拖拽中不落盘，松手写吸附值', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    el.setAttribute('snap', '25,50,75')
    el.setAttribute('lazy', '')
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(pointer('pointerdown', 500))
    document.dispatchEvent(pointer('pointermove', 755))
    expect(el.getAttribute('percent')).toBe('50')
    document.dispatchEvent(pointer('pointerup', 755))
    expect(el.getAttribute('percent')).toBe('75')
  })

  it('snap 非法值静默忽略（正常 ±1% 拖拽/键盘）', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    el.setAttribute('snap', 'abc, ,x')
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(pointer('pointerdown', 500))
    document.dispatchEvent(pointer('pointermove', 600))
    document.dispatchEvent(pointer('pointerup', 600))
    expect(el.getAttribute('percent')).toBe('60')
    key(el, 'ArrowRight')
    expect(el.getAttribute('percent')).toBe('61')
  })

  it('vertical：方向键档位落档同样生效', () => {
    const el = mount()
    el.setAttribute('vertical', '')
    el.setAttribute('percent', '50')
    el.setAttribute('snap', '25,50,75')
    key(el, 'ArrowDown')
    expect(el.getAttribute('percent')).toBe('75')
    key(el, 'ArrowUp')
    expect(el.getAttribute('percent')).toBe('50')
  })
})

describe('OASSplitter sizes property（框架字符串/数组双通道）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('连接前写入数组：attribute 写 JSON、连接后布局比例生效', () => {
    const el = new OASSplitter()
    el.innerHTML = `<div>一</div><div>二</div><div>三</div>`
    el.sizes = [30, 40, 30]
    expect(el.getAttribute('sizes')).toBe('[30,40,30]')
    document.body.appendChild(el)
    const panes = el.shadowRoot!.querySelectorAll('.pane')
    expect((panes[0] as HTMLElement).style.flex).toBe('0 0 30%')
    expect((panes[1] as HTMLElement).style.flex).toBe('0 0 40%')
    expect(el.sizes).toEqual([30, 40, 30])
  })

  it('连接前写入 CSV 字符串（文档写法）：解析并写回 JSON attribute，布局 30/40/30', () => {
    const el = new OASSplitter()
    el.innerHTML = `<div>一</div><div>二</div><div>三</div>`
    el.sizes = '30,40,30'
    expect(el.getAttribute('sizes')).toBe('[30,40,30]')
    document.body.appendChild(el)
    const panes = el.shadowRoot!.querySelectorAll('.pane')
    expect((panes[0] as HTMLElement).style.flex).toBe('0 0 30%')
    expect((panes[1] as HTMLElement).style.flex).toBe('0 0 40%')
    expect(el.sizes).toEqual([30, 40, 30])
  })

  it('连接后写入 JSON 字符串（SPA property 通道）：解析为数组并重排布局', () => {
    const el = mountMulti()
    el.setAttribute('sizes', '50,25,25')
    el.sizes = '[30,40,30]'
    expect(el.getAttribute('sizes')).toBe('[30,40,30]')
    const panes = el.shadowRoot!.querySelectorAll('.pane')
    expect((panes[0] as HTMLElement).style.flex).toBe('0 0 30%')
    expect((panes[1] as HTMLElement).style.flex).toBe('0 0 40%')
    expect(el.sizes).toEqual([30, 40, 30])
  })

  it('连接后写入 CSV 字符串（文档 demo / SPA property 通道）：解析为数组并重排布局', () => {
    const el = mountMulti()
    el.setAttribute('sizes', '50,25,25')
    el.sizes = '30,40,30'
    expect(el.getAttribute('sizes')).toBe('[30,40,30]')
    const panes = el.shadowRoot!.querySelectorAll('.pane')
    expect((panes[0] as HTMLElement).style.flex).toBe('0 0 30%')
    expect((panes[1] as HTMLElement).style.flex).toBe('0 0 40%')
    expect(el.sizes).toEqual([30, 40, 30])
  })

  it('非法/空 sizes property 不覆盖既有 attribute（保留受控值）+ devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mountMulti()
      el.setAttribute('sizes', '30,40,30')
      el.sizes = '{bad-sizes'
      expect(el.getAttribute('sizes'), '非法串不得覆盖受控 attribute').toBe('30,40,30')
      const panes = el.shadowRoot!.querySelectorAll('.pane')
      expect((panes[0] as HTMLElement).style.flex).toBe('0 0 30%')
      el.sizes = ''
      expect(el.getAttribute('sizes'), '空值不得覆盖受控 attribute').toBe('30,40,30')
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('oas-splitter')).length).toBe(2)
    } finally {
      warn.mockRestore()
    }
  })

  it('面板数不匹配：布局回落均分，getter 跟随 attribute（不返回陈旧均分数组）', () => {
    const el = mountMulti()
    el.setAttribute('sizes', '30,70')
    const panes = el.shadowRoot!.querySelectorAll('.pane')
    const flexOf = (i: number) => parseFloat((panes[i] as HTMLElement).style.flex.split(' ')[2] ?? '')
    expect(flexOf(0)).toBeCloseTo(33.33, 1)
    expect(flexOf(1)).toBeCloseTo(33.33, 1)
    expect(el.sizes).toEqual([30, 70])
  })

  it('连接前 own property（字符串 / 数组）回收进 setter：不遮蔽访问器、布局生效', () => {
    for (const own of ['30,40,30', [30, 40, 30]] as const) {
      const el = new OASSplitter()
      el.innerHTML = `<div>一</div><div>二</div><div>三</div>`
      Object.defineProperty(el, 'sizes', {
        value: own,
        writable: true,
        configurable: true,
        enumerable: true,
      })
      document.body.appendChild(el)
      expect(Object.hasOwn(el, 'sizes'), 'own property 应被删除').toBe(false)
      expect(el.getAttribute('sizes')).toBe('[30,40,30]')
      const panes = el.shadowRoot!.querySelectorAll('.pane')
      expect((panes[0] as HTMLElement).style.flex).toBe('0 0 30%')
      expect((panes[1] as HTMLElement).style.flex).toBe('0 0 40%')
      expect(el.sizes).toEqual([30, 40, 30])
      el.remove()
    }
  })

  it('连接前 own 回收后双击复位回预设比例（基线不固化为均分）', () => {
    // 回归：回收发生在 super.connectedCallback（首渲染）之后，若不重置基线标志，
    // initialSizes 已固化为均分 [33.33,33.33,33.33]，双击第一分隔条得 35/35/30
    const el = new OASSplitter()
    el.innerHTML = `<div>一</div><div>二</div><div>三</div>`
    Object.defineProperty(el, 'sizes', {
      value: '30,40,30',
      writable: true,
      configurable: true,
      enumerable: true,
    })
    document.body.appendChild(el)
    const first = el.shadowRoot!.querySelectorAll('[part="splitter"]')[0]!
    first.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    // 基线正确时：相邻对按预设 30/40 等比还原（pairSum=70 → 30/40/30）；
    // 基线错误（均分）时得 35/35/30
    expect(el.getAttribute('sizes')).toBe('30,40,30')
  })

  it('正常 attribute 路径：双击复位回初始 30/40/30（拖乱后还原）', () => {
    const el = new OASSplitter()
    el.setAttribute('sizes', '30,40,30')
    el.innerHTML = `<div>一</div><div>二</div><div>三</div>`
    document.body.appendChild(el)
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    const first = el.shadowRoot!.querySelectorAll('[part="splitter"]')[0]!
    // 先拖乱：30/40/30 → 40/30/30
    first.dispatchEvent(pointer('pointerdown', 300))
    document.dispatchEvent(pointer('pointermove', 400))
    document.dispatchEvent(pointer('pointerup', 400))
    expect(el.getAttribute('sizes')).toBe('40,30,30')
    // 双击复位回初始比例
    first.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(el.getAttribute('sizes')).toBe('30,40,30')
  })

  it('sizes getter 返回副本，不暴露内部数组', () => {
    const el = mountMulti()
    el.sizes = [20, 30, 50]
    const read = el.sizes
    read[0] = 99
    expect(el.sizes).toEqual([20, 30, 50])
    expect(el.getAttribute('sizes')).toBe('[20,30,50]')
  })

  it('非法 JSON：不抛、回落默认均分、devWarn 同值只告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mountMulti()
      expect(() => {
        el.sizes = '{bad-sizes'
      }).not.toThrow()
      const panes = el.shadowRoot!.querySelectorAll('.pane')
      const flexOf = (i: number) => parseFloat((panes[i] as HTMLElement).style.flex.split(' ')[2] ?? '')
      expect(flexOf(0)).toBeCloseTo(33.33, 1)
      expect(flexOf(1)).toBeCloseTo(33.33, 1)
      el.sizes = '{bad-sizes'
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('oas-splitter')).length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('非数组 JSON / 数组内非法数值：回落默认均分 + 告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mountMulti()
      el.sizes = '{"a":1}'
      const panes = el.shadowRoot!.querySelectorAll('.pane')
      expect(parseFloat((panes[0] as HTMLElement).style.flex.split(' ')[2] ?? '')).toBeCloseTo(33.33, 1)
      el.sizes = [30, -1, 70]
      expect(parseFloat((panes[0] as HTMLElement).style.flex.split(' ')[2] ?? '')).toBeCloseTo(33.33, 1)
      expect(
        warn.mock.calls.filter((c) => String(c[0]).includes('oas-splitter')).length,
        '两次非法 sizes 各告警一次',
      ).toBe(2)
    } finally {
      warn.mockRestore()
    }
  })
})

// ---------- storage-key：opt-in 尺寸持久化（Task 8B） ----------

/** 等待组件首连后的延迟恢复微任务 + 存储写入合并窗口外的静默期 */
async function settle(ms = 0): Promise<void> {
  await new Promise((r) => setTimeout(r, ms))
}

function snapshotOf(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

function mountWith(
  attrs: Record<string, string>,
  inner: string = `<div slot="left">左面板</div><div slot="right">右面板</div>`,
): OASSplitter {
  const el = new OASSplitter()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = inner
  return el
}

describe('OASSplitter storage-key（opt-in 尺寸持久化）', () => {
  const KEY = 'oas-splitter-test'

  beforeEach(() => {
    document.body.innerHTML = ''
    window.localStorage.clear()
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    window.localStorage.clear()
    setLocale('zh-CN')
  })

  it('storage-key 进 observedAttributes；无 key 时不读写存储（opt-in）', async () => {
    expect(OASSplitter.observedAttributes).toContain('storage-key')
    const get = vi.spyOn(window.localStorage, 'getItem')
    const set = vi.spyOn(window.localStorage, 'setItem')
    try {
      const el = new OASSplitter()
      el.innerHTML = `<div slot="left">左</div><div slot="right">右</div>`
      document.body.appendChild(el)
      Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
      const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
      splitter.dispatchEvent(pointer('pointerdown', 500))
      document.dispatchEvent(pointer('pointermove', 600))
      document.dispatchEvent(pointer('pointerup', 600))
      await settle()
      expect(get).not.toHaveBeenCalled()
      expect(set).not.toHaveBeenCalled()
    } finally {
      get.mockRestore()
      set.mockRestore()
    }
  })

  it('legacy：合法存储恢复 percent，恢复零事件；后续用户操作事件次数不增加', async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, mode: 'legacy', percent: 60, collapsed: [], prev: {} }))
    const el = mountWith({ 'storage-key': KEY, collapsible: '' })
    let resize = 0
    let collapse = 0
    el.addEventListener('oas-resize', () => resize++)
    el.addEventListener('oas-collapse', () => collapse++)
    document.body.appendChild(el)
    const styleRef = el.shadowRoot!.querySelector('style')
    await settle()
    expect(el.getAttribute('percent')).toBe('60')
    expect((el.shadowRoot!.querySelector('.pane') as HTMLElement).style.flex).toBe('0 0 60%')
    expect(el.shadowRoot!.querySelector('[part="splitter"]')!.getAttribute('aria-valuenow')).toBe('60')
    expect(el.shadowRoot!.querySelector('style'), 'CSR 恢复不得重建 shadow').toBe(styleRef)
    expect(resize, '恢复不得派发 oas-resize').toBe(0)
    expect(collapse, '恢复不得派发 oas-collapse').toBe(0)
    // 用户操作仍只派发一次
    key(el, 'ArrowRight')
    expect(el.getAttribute('percent')).toBe('61')
    expect(resize).toBe(1)
    collapseBtnOf(el).click()
    expect(collapse).toBe(1)
  })

  it('legacy：指针拖拽后写入版本化快照（pointerup 立即落盘）', async () => {
    const el = mountWith({ 'storage-key': KEY, percent: '50' })
    document.body.appendChild(el)
    await settle()
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(pointer('pointerdown', 500))
    document.dispatchEvent(pointer('pointermove', 600))
    document.dispatchEvent(pointer('pointerup', 600))
    const snap = snapshotOf(window.localStorage.getItem(KEY))
    expect(snap).toMatchObject({ v: 1, mode: 'legacy', percent: 60 })
    expect(el.getAttribute('percent')).toBe('60')
  })

  it('优先级：显式初始属性 > 合法存储 > 默认值', async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, mode: 'legacy', percent: 80, collapsed: [], prev: {} }))
    // 显式 percent 胜出，且存储不被恢复覆盖
    const explicit = mountWith({ 'storage-key': KEY, percent: '30' })
    document.body.appendChild(explicit)
    await settle()
    expect(explicit.getAttribute('percent')).toBe('30')
    expect(snapshotOf(window.localStorage.getItem(KEY))).toMatchObject({ percent: 80 })
    explicit.remove()

    // 无显式属性 → 合法存储
    const stored = mountWith({ 'storage-key': KEY })
    document.body.appendChild(stored)
    await settle()
    expect(stored.getAttribute('percent')).toBe('80')
    stored.remove()

    // 无 key / 无存储 → 默认 50（缺省不写 percent 属性，等价 50）
    const fallback = mountWith({})
    document.body.appendChild(fallback)
    await settle()
    expect(fallback.getAttribute('percent') ?? '50').toBe('50')
    expect((fallback.shadowRoot!.querySelector('.pane') as HTMLElement).style.flex).toBe('0 0 50%')
  })

  it('mount 期显式 collapsed + 已有快照：零交互不得覆盖存储', async () => {
    const raw = JSON.stringify({ v: 1, mode: 'legacy', percent: 60, collapsed: [0], prev: { 0: 60 } })
    window.localStorage.setItem(KEY, raw)
    const el = mountWith({ 'storage-key': KEY, collapsed: '', collapsible: '' })
    document.body.appendChild(el)
    await settle(200)
    expect(window.localStorage.getItem(KEY), 'mount 期折叠不得写回存储').toBe(raw)
    // 用户交互后恢复写入
    key(el, 'ArrowRight')
    await settle(180)
    expect(window.localStorage.getItem(KEY)).not.toBe(raw)
  })

  it('upgrade 前 own sizes + 已有快照：回收触发的 setter 不得覆盖存储', async () => {
    const raw = JSON.stringify({ v: 1, mode: 'multi', sizes: [20, 30, 50], collapsed: [], prev: {} })
    window.localStorage.setItem(KEY, raw)
    const el = new OASSplitter()
    el.setAttribute('storage-key', KEY)
    el.innerHTML = `<div>一</div><div>二</div><div>三</div>`
    Object.defineProperty(el, 'sizes', {
      value: '40,30,30',
      writable: true,
      configurable: true,
      enumerable: true,
    })
    document.body.appendChild(el)
    await settle(200)
    expect(el.getAttribute('sizes'), '显式 own sizes 仍优先').toBe('[40,30,30]')
    expect(window.localStorage.getItem(KEY), 'own sizes 回收不得写回存储').toBe(raw)
    // 用户交互后恢复写入
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    const mid = el.shadowRoot!.querySelectorAll('[part="splitter"]')[1]!
    mid.dispatchEvent(pointer('pointerdown', 700))
    document.dispatchEvent(pointer('pointermove', 760))
    document.dispatchEvent(pointer('pointerup', 760))
    await settle(180)
    expect(window.localStorage.getItem(KEY)).not.toBe(raw)
  })

  it('无快照时 mount 不新建 key；用户交互后才创建', async () => {
    const el = mountWith({ 'storage-key': KEY, collapsed: '', collapsible: '' })
    document.body.appendChild(el)
    await settle(200)
    expect(window.localStorage.getItem(KEY), 'mount 期不得创建空快照').toBeNull()
    collapseBtnOf(el).click()
    await settle(180)
    expect(snapshotOf(window.localStorage.getItem(KEY))).toMatchObject({ v: 1, mode: 'legacy' })
  })

  it.each([
    ['坏 JSON', '{bad-json'],
    ['非对象', '[1,2,3]'],
    ['版本不符', JSON.stringify({ v: 2, mode: 'legacy', percent: 80 })],
    ['模式不符', JSON.stringify({ v: 1, mode: 'multi', sizes: [20, 80] })],
    ['形状不符（percent 非数字）', JSON.stringify({ v: 1, mode: 'legacy', percent: '80' })],
    ['形状不符（越界 percent）', JSON.stringify({ v: 1, mode: 'legacy', percent: 180 })],
    ['形状不符（percent:0）', JSON.stringify({ v: 1, mode: 'legacy', percent: 0 })],
    ['形状不符（collapsed 非数组）', JSON.stringify({ v: 1, mode: 'legacy', percent: 80, collapsed: '0' })],
    [
      '形状不符（collapsed 越界）',
      JSON.stringify({ v: 1, mode: 'legacy', percent: 80, collapsed: [1], prev: { 1: 80 } }),
    ],
    [
      '形状不符（collapsed 非整数）',
      JSON.stringify({ v: 1, mode: 'legacy', percent: 80, collapsed: ['0'], prev: { 0: 80 } }),
    ],
    ['形状不符（缺 prev）', JSON.stringify({ v: 1, mode: 'legacy', percent: 80, collapsed: [0], prev: {} })],
    ['形状不符（prev 非法）', JSON.stringify({ v: 1, mode: 'legacy', percent: 80, collapsed: [0], prev: { 0: -5 } })],
  ])('坏存储安全降级：%s → 默认 50、不抛', async (_name, raw) => {
    window.localStorage.setItem(KEY, raw)
    const el = mountWith({ 'storage-key': KEY })
    expect(() => document.body.appendChild(el)).not.toThrow()
    await settle()
    expect(el.getAttribute('percent') ?? '50').toBe('50')
    expect((el.shadowRoot!.querySelector('.pane') as HTMLElement).style.flex).toBe('0 0 50%')
  })

  it.each([
    ['sizes 负数', JSON.stringify({ v: 1, mode: 'multi', sizes: [10, -10, 100], collapsed: [], prev: {} })],
    ['sizes 总和 0', JSON.stringify({ v: 1, mode: 'multi', sizes: [0, 0, 0], collapsed: [], prev: {} })],
    [
      'collapsed 越界（末面板不可折叠）',
      JSON.stringify({ v: 1, mode: 'multi', sizes: [10, 20, 70], collapsed: [2], prev: { 2: 10 } }),
    ],
    [
      'collapsed 非整数',
      JSON.stringify({ v: 1, mode: 'multi', sizes: [10, 20, 70], collapsed: [0.5], prev: { 0.5: 10 } }),
    ],
    ['collapsed 缺 prev', JSON.stringify({ v: 1, mode: 'multi', sizes: [0, 70, 30], collapsed: [0], prev: {} })],
    ['prev 非法', JSON.stringify({ v: 1, mode: 'multi', sizes: [0, 70, 30], collapsed: [0], prev: { 0: -10 } })],
    ['prev 键非法', JSON.stringify({ v: 1, mode: 'multi', sizes: [0, 70, 30], collapsed: [0], prev: { x: 30 } })],
  ])('multi 坏存储安全降级：%s → 均分、不抛', async (_name, raw) => {
    window.localStorage.setItem(KEY, raw)
    const el = mountWith({ 'storage-key': KEY }, `<div>一</div><div>二</div><div>三</div>`)
    expect(() => document.body.appendChild(el)).not.toThrow()
    await settle()
    const panes = el.shadowRoot!.querySelectorAll('.pane')
    expect(el.getAttribute('sizes')).toBeNull()
    expect(parseFloat((panes[0] as HTMLElement).style.flex.split(' ')[2] ?? '')).toBeCloseTo(100 / 3, 1)
  })

  it('storage get/set 异常安全降级：读取回默认，写入失败不影响拖拽', async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, mode: 'legacy', percent: 60 }))
    const get = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    const set = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    try {
      const el = mountWith({ 'storage-key': KEY })
      expect(() => document.body.appendChild(el)).not.toThrow()
      await settle()
      // 无显式 percent：真正验证 getItem 抛异常时回落默认 50（布局而非属性写入）
      expect(el.getAttribute('percent')).toBeNull()
      expect((el.shadowRoot!.querySelector('.pane') as HTMLElement).style.flex).toBe('0 0 50%')
      Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
      const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
      expect(() => {
        splitter.dispatchEvent(pointer('pointerdown', 500))
        document.dispatchEvent(pointer('pointermove', 600))
        document.dispatchEvent(pointer('pointerup', 600))
      }).not.toThrow()
      expect(el.getAttribute('percent')).toBe('60')
    } finally {
      get.mockRestore()
      set.mockRestore()
    }
  })

  it('multi：多面板 sizes 完整往返；数量不匹配的存储整体忽略', async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ v: 1, mode: 'multi', sizes: [20, 30, 50], collapsed: [], prev: {} }),
    )
    const el = mountWith({ 'storage-key': KEY }, `<div>一</div><div>二</div><div>三</div>`)
    document.body.appendChild(el)
    await settle()
    expect(el.getAttribute('sizes')).toBe('20,30,50')
    expect(el.sizes).toEqual([20, 30, 50])
    const panes = el.shadowRoot!.querySelectorAll('.pane')
    expect((panes[0] as HTMLElement).style.flex).toBe('0 0 20%')
    expect((panes[1] as HTMLElement).style.flex).toBe('0 0 30%')
    // 显式 sizes 优先于存储
    el.remove()
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ v: 1, mode: 'multi', sizes: [20, 30, 50], collapsed: [], prev: {} }),
    )
    const explicit = mountWith({ 'storage-key': KEY, sizes: '40,30,30' }, `<div>一</div><div>二</div><div>三</div>`)
    document.body.appendChild(explicit)
    await settle()
    expect(explicit.getAttribute('sizes')).toBe('40,30,30')
    explicit.remove()
    // 面板数不匹配 → 整份快照忽略，回落均分
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ v: 1, mode: 'multi', sizes: [20, 30, 50], collapsed: [], prev: {} }),
    )
    const mismatch = mountWith({ 'storage-key': KEY }, `<div>一</div><div>二</div>`)
    document.body.appendChild(mismatch)
    await settle()
    const panes2 = mismatch.shadowRoot!.querySelectorAll('.pane')
    expect(parseFloat((panes2[0] as HTMLElement).style.flex.split(' ')[2] ?? '')).toBeCloseTo(50, 1)
  })

  it('折叠前尺寸持久化：legacy 刷新恢复折叠态，展开回到折叠前尺寸', async () => {
    const first = mountWith({ 'storage-key': KEY, percent: '40', collapsible: '' })
    document.body.appendChild(first)
    await settle()
    collapseBtnOf(first).click()
    expect(first.hasAttribute('collapsed')).toBe(true)
    await settle(180)
    const snap = snapshotOf(window.localStorage.getItem(KEY))
    expect(snap).toMatchObject({ v: 1, mode: 'legacy', percent: 40, collapsed: [0] })
    expect((snap!.prev as Record<string, number>)['0']).toBe(40)
    first.remove()

    const restored = mountWith({ 'storage-key': KEY, collapsible: '' })
    let collapseEvents = 0
    restored.addEventListener('oas-collapse', () => collapseEvents++)
    document.body.appendChild(restored)
    await settle()
    expect(restored.hasAttribute('collapsed')).toBe(true)
    expect((restored.shadowRoot!.querySelector('.pane') as HTMLElement).style.flex).toBe('0 0 0%')
    expect(restored.shadowRoot!.querySelector('[part="splitter"]')!.getAttribute('aria-valuenow')).toBe('40')
    expect(collapseBtnOf(restored).getAttribute('aria-label'), '恢复折叠态后按钮应翻转为展开').toBe('展开面板')
    expect(collapseEvents, '恢复折叠态不得派发 oas-collapse').toBe(0)
    collapseBtnOf(restored).click()
    expect(restored.hasAttribute('collapsed')).toBe(false)
    expect((restored.shadowRoot!.querySelector('.pane') as HTMLElement).style.flex).toBe('0 0 40%')
    expect(collapseBtnOf(restored).getAttribute('aria-label')).toBe('收起面板')
  })

  it('折叠前尺寸持久化：multi 刷新恢复折叠态，展开回到折叠前比例', async () => {
    const first = mountWith(
      { 'storage-key': KEY, sizes: '30,40,30', collapsible: '' },
      `<div>一</div><div>二</div><div>三</div>`,
    )
    document.body.appendChild(first)
    await settle()
    collapseBtnOf(first, 0).click()
    expect(first.getAttribute('sizes')).toBe('0,70,30')
    await settle(180)
    const snap = snapshotOf(window.localStorage.getItem(KEY))
    expect(snap).toMatchObject({ v: 1, mode: 'multi', sizes: [0, 70, 30], collapsed: [0] })
    expect((snap!.prev as Record<string, number>)['0']).toBe(30)
    first.remove()

    const restored = mountWith({ 'storage-key': KEY, collapsible: '' }, `<div>一</div><div>二</div><div>三</div>`)
    let collapseEvents = 0
    restored.addEventListener('oas-collapse', () => collapseEvents++)
    document.body.appendChild(restored)
    await settle()
    expect(restored.hasAttribute('collapsed')).toBe(true)
    expect(restored.getAttribute('sizes')).toBe('0,70,30')
    expect(collapseEvents, '恢复折叠态不得派发 oas-collapse').toBe(0)
    collapseBtnOf(restored, 0).click()
    expect(restored.getAttribute('sizes')).toBe('30,40,30')
  })

  it('显式 collapsed 属性 + 存储 sizes：折叠保持，展开还原到恢复后的比例（不丢尺寸）', async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ v: 1, mode: 'multi', sizes: [30, 40, 30], collapsed: [], prev: {} }),
    )
    const el = mountWith(
      { 'storage-key': KEY, collapsed: '', collapsible: '' },
      `<div>一</div><div>二</div><div>三</div>`,
    )
    document.body.appendChild(el)
    await settle()
    expect(el.hasAttribute('collapsed')).toBe(true)
    expect(el.getAttribute('sizes')).toBe('0,70,30')
    collapseBtnOf(el, 0).click()
    expect(el.getAttribute('sizes')).toBe('30,40,30')
  })

  it('改 key 不自动重载；同 key 在线实例不 live sync', async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, mode: 'legacy', percent: 60 }))
    window.localStorage.setItem(`${KEY}-b`, JSON.stringify({ v: 1, mode: 'legacy', percent: 20 }))
    const el = mountWith({ 'storage-key': KEY })
    document.body.appendChild(el)
    await settle()
    expect(el.getAttribute('percent')).toBe('60')
    el.setAttribute('storage-key', `${KEY}-b`)
    await settle()
    expect(el.getAttribute('percent'), '改 key 不得自动重载').toBe('60')

    // 同 key 在线实例：A 拖拽写存储，B 不跟随（无 storage 事件监听）
    const a = mountWith({ 'storage-key': `${KEY}-live`, percent: '50' })
    const b = mountWith({ 'storage-key': `${KEY}-live` })
    document.body.appendChild(a)
    document.body.appendChild(b)
    await settle()
    Object.defineProperty(a, 'clientWidth', { value: 1000, configurable: true })
    const splitter = a.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(pointer('pointerdown', 500))
    document.dispatchEvent(pointer('pointermove', 600))
    document.dispatchEvent(pointer('pointerup', 600))
    expect(a.getAttribute('percent')).toBe('60')
    expect(b.getAttribute('percent') ?? '50', '同 key 在线实例不得 live sync').toBe('50')
    expect((b.shadowRoot!.querySelector('.pane') as HTMLElement).style.flex).toBe('0 0 50%')
  })

  it('写入合并：多次 pointermove 不逐帧同步写，pointerup 只落盘一次', async () => {
    const el = mountWith({ 'storage-key': KEY })
    document.body.appendChild(el)
    await settle()
    const set = vi.spyOn(window.localStorage, 'setItem')
    try {
      Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
      const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
      splitter.dispatchEvent(pointer('pointerdown', 500))
      for (let x = 510; x <= 600; x += 10) document.dispatchEvent(pointer('pointermove', x))
      expect(set.mock.calls.length, '拖拽中不得每个 pointermove 同步写').toBe(0)
      document.dispatchEvent(pointer('pointerup', 600))
      expect(set.mock.calls.length, 'pointerup 合并落盘一次').toBe(1)
      expect(snapshotOf(window.localStorage.getItem(KEY))).toMatchObject({ percent: 60 })
      // 定时器已清，不再补写
      await settle(180)
      expect(set.mock.calls.length).toBe(1)
    } finally {
      set.mockRestore()
    }
  })

  it('写入合并：键盘连续微调在延迟窗口内只写一次', async () => {
    const el = mountWith({ 'storage-key': KEY, percent: '50' })
    document.body.appendChild(el)
    await settle()
    const set = vi.spyOn(window.localStorage, 'setItem')
    try {
      key(el, 'ArrowRight')
      key(el, 'ArrowRight')
      key(el, 'ArrowRight')
      expect(set.mock.calls.length).toBe(0)
      await settle(180)
      expect(set.mock.calls.length).toBe(1)
      expect(snapshotOf(window.localStorage.getItem(KEY))).toMatchObject({ percent: 53 })
    } finally {
      set.mockRestore()
    }
  })

  it('disconnectedCallback：合并窗口内 remove 立即 flush 一次，之后不再补写', async () => {
    const el = mountWith({ 'storage-key': KEY, percent: '50' })
    document.body.appendChild(el)
    await settle()
    const set = vi.spyOn(window.localStorage, 'setItem')
    try {
      key(el, 'ArrowRight')
      expect(set.mock.calls.length).toBe(0)
      el.remove()
      expect(set.mock.calls.length, '断开时应 flush 待写').toBe(1)
      expect(snapshotOf(window.localStorage.getItem(KEY))).toMatchObject({ percent: 51 })
      await settle(180)
      expect(set.mock.calls.length).toBe(1)
    } finally {
      set.mockRestore()
    }
  })

  it('schedule 时捕获 key：窗口内改 storage-key 本次写回旧 key', async () => {
    const el = mountWith({ 'storage-key': KEY, percent: '50' })
    document.body.appendChild(el)
    await settle()
    key(el, 'ArrowRight')
    el.setAttribute('storage-key', `${KEY}-b`)
    await settle(180)
    expect(snapshotOf(window.localStorage.getItem(KEY)), '本次写回旧 key').toMatchObject({ percent: 51 })
    expect(window.localStorage.getItem(`${KEY}-b`), '不得凭空写新 key').toBeNull()
    // 后续交互写新 key
    key(el, 'ArrowRight')
    await settle(180)
    expect(snapshotOf(window.localStorage.getItem(`${KEY}-b`))).toMatchObject({ percent: 52 })
  })

  it('相同快照不重复 setItem（lastWritten 比较）', async () => {
    const el = mountWith({ 'storage-key': KEY, percent: '50' })
    document.body.appendChild(el)
    await settle()
    const set = vi.spyOn(window.localStorage, 'setItem')
    try {
      key(el, 'ArrowRight')
      await settle(180)
      expect(set.mock.calls.length).toBe(1)
      // 回到相同最终态（51）：不应再写
      key(el, 'ArrowLeft')
      key(el, 'ArrowRight')
      await settle(180)
      expect(set.mock.calls.length, '相同快照不得重复写').toBe(1)
    } finally {
      set.mockRestore()
    }
  })

  it('双击复位基线=显式初始属性/默认，不随恢复改变；复位结果持久化', async () => {
    // 无显式：存储 60 → 恢复 60，双击回默认 50，并作为用户操作写回 50
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, mode: 'legacy', percent: 60 }))
    const restored = mountWith({ 'storage-key': KEY })
    document.body.appendChild(restored)
    await settle()
    expect(restored.getAttribute('percent')).toBe('60')
    restored
      .shadowRoot!.querySelector('[part="splitter"]')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(restored.getAttribute('percent'), '恢复不改变复位基线（默认 50）').toBe('50')
    await settle(180)
    expect(snapshotOf(window.localStorage.getItem(KEY)), '复位结果按用户操作持久化').toMatchObject({ percent: 50 })
    restored.remove()

    // 显式 30：基线 30，不被存储 60 改变
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, mode: 'legacy', percent: 60 }))
    const explicit = mountWith({ 'storage-key': KEY, percent: '30' })
    document.body.appendChild(explicit)
    await settle()
    key(explicit, 'ArrowRight')
    explicit
      .shadowRoot!.querySelector('[part="splitter"]')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(explicit.getAttribute('percent')).toBe('30')
    await settle(180)
    expect(snapshotOf(window.localStorage.getItem(KEY))).toMatchObject({ percent: 30 })
  })

  it('恢复只尝试一次：首连无 key 后加 key 不恢复', async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, mode: 'legacy', percent: 70 }))
    const el = mountWith({})
    document.body.appendChild(el)
    await settle()
    el.setAttribute('storage-key', KEY)
    await settle(200)
    expect(el.getAttribute('percent') ?? '50', '首连无 key 后加 key 不恢复').toBe('50')
    expect((el.shadowRoot!.querySelector('.pane') as HTMLElement).style.flex).toBe('0 0 50%')
  })

  it('恢复只尝试一次：microtask 前断开重连不恢复', async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, mode: 'legacy', percent: 70 }))
    const el = mountWith({ 'storage-key': KEY })
    document.body.appendChild(el)
    el.remove()
    document.body.appendChild(el)
    await settle(200)
    expect(el.getAttribute('percent') ?? '50', 'microtask 前断开重连不恢复').toBe('50')
  })

  it('SSR 渲染标记下零存储访问（读写均跳过）', async () => {
    const w = window as unknown as Record<string, unknown>
    w.__OAS_SSR__ = true
    const get = vi.spyOn(window.localStorage, 'getItem')
    const set = vi.spyOn(window.localStorage, 'setItem')
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ v: 1, mode: 'legacy', percent: 70 }))
      get.mockClear()
      set.mockClear()
      const el = mountWith({ 'storage-key': KEY, percent: '50' })
      document.body.appendChild(el)
      await settle()
      expect(el.getAttribute('percent')).toBe('50')
      key(el, 'ArrowRight')
      await settle(180)
      expect(get).not.toHaveBeenCalled()
      expect(set).not.toHaveBeenCalled()
    } finally {
      get.mockRestore()
      set.mockRestore()
      delete w.__OAS_SSR__
    }
  })
})

function pointer(type: string, clientX: number): Event {
  const Ctor = (globalThis as Record<string, unknown>).PointerEvent as typeof PointerEvent | undefined
  if (typeof Ctor === 'function') {
    return new Ctor(type, { bubbles: true, clientX })
  }
  return new MouseEvent(type, { bubbles: true, clientX })
}

describe('OASSplitter multi 删栏收敛（M9 回归）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('三栏折叠索引 1 → 删除第三栏：越界索引收敛、重建后布局/模型/属性三方一致', async () => {
    const el = new OASSplitter()
    el.setAttribute('mode', 'multi')
    el.setAttribute('collapsible', '')
    el.setAttribute('sizes', '30,40,30')
    el.innerHTML = '<div>一</div><div>二</div><div>三</div>'
    document.body.appendChild(el)
    // 首渲染：通过折叠按钮折叠面板 1（用户真实路径）
    collapseBtnOf(el, 1).click()
    expect(el.hasAttribute('collapsed')).toBe(true)
    // 删除第三栏（真实 childList 变更 → MutationObserver → syncPanels）
    el.children[2]!.remove()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    const panes = el.shadowRoot!.querySelectorAll('[part="pane"]')
    expect(panes.length).toBe(2)
    // 残留折叠索引 1（≥ n-1）必须被收敛：collapsed 属性移除
    expect(el.hasAttribute('collapsed')).toBe(false)
    // 布局/模型/属性三方一致（M9 fix round 2）：ensureSizes 必须先于 applyPercent——
    // 旧长度 sizesData（30,0,110）渲染两块面板会得到 30/70（DOM)vs 50/50（模型）三方不一致
    expect((panes[0] as HTMLElement).style.flex, '面板 0 按归一后尺寸渲染').toBe('0 0 50%')
    expect((panes[1] as HTMLElement).style.flex, '末面板吸收剩余').toBe('1 1 0%')
    expect(el.getAttribute('sizes'), 'sizes 属性按新面板数回写').toBe('50,50')
    expect(el.shadowRoot!.querySelectorAll('[part="splitter"]').length).toBe(1)
  })

  it('三栏折叠索引 0 → 删除第一栏：折叠态全清空，新首面板不被错误折叠（无 key 面板的结构变更重置）', async () => {
    const el = new OASSplitter()
    el.setAttribute('mode', 'multi')
    el.setAttribute('collapsible', '')
    el.setAttribute('sizes', '30,40,30')
    el.innerHTML = '<div>一</div><div>二</div><div>三</div>'
    document.body.appendChild(el)
    // 折叠面板 0（用户真实路径）
    collapseBtnOf(el, 0).click()
    expect(el.hasAttribute('collapsed')).toBe(true)
    // 删除第一栏（折叠的那块）：light DOM 无 key，删除目标不可知——
    // 语义定为「结构变更重置派生折叠态」（按索引保留会把折叠错配到存活面板 → 零宽复发）
    el.children[0]!.remove()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    const panes = el.shadowRoot!.querySelectorAll('[part="pane"]')
    expect(panes.length).toBe(2)
    expect(el.hasAttribute('collapsed'), '折叠态随结构变更收敛').toBe(false)
    for (const pane of panes as NodeListOf<HTMLElement>) {
      expect(pane.style.flex, '存活面板不得被错误折叠（零宽复发）').not.toBe('0 0 0%')
      expect(pane.style.flex).not.toBe('')
    }
    expect(el.shadowRoot!.querySelectorAll('[part="splitter"]').length).toBe(1)
  })
  it('三栏折叠 → 删第三栏：storage-key 快照不残留越界折叠与旧长度 sizes', async () => {
    const el = new OASSplitter()
    el.setAttribute('mode', 'multi')
    el.setAttribute('collapsible', '')
    el.setAttribute('storage-key', '__m9_store__')
    el.setAttribute('sizes', '30,40,30')
    el.innerHTML = '<div>一</div><div>二</div><div>三</div>'
    document.body.appendChild(el)
    // 首连恢复微任务结束后解除持久化抑制
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    collapseBtnOf(el, 1).click()
    // PERSIST_DELAY=120ms 合并窗口：等落盘
    await new Promise<void>((resolve) => setTimeout(resolve, 200))
    const stored = snapshotOf(window.localStorage.getItem('__m9_store__'))
    expect(stored?.collapsed, '折叠已落盘').toEqual([1])
    // 删第三栏：越界折叠收敛后必须重新落盘（否则下次两面板挂载整份拒收、用户布局被重置）
    el.children[2]!.remove()
    await new Promise<void>((resolve) => setTimeout(resolve, 300))
    const snap = JSON.parse(window.localStorage.getItem('__m9_store__')!) as {
      collapsed?: number[]
      sizes?: number[]
    }
    expect(snap.collapsed ?? [], '快照折叠索引收敛为空').toEqual([])
    expect(snap.sizes, '快照 sizes 按新面板数').toEqual([50, 50])
  })
})

// 高对比（forced-colors: active）兜底契约：拖拽手柄只凭 --oas-color-border 底色表达，
// 系统强制 background 后 6px 手柄带整体消失（无边框、无文本），必须在 forced-colors
// 媒体查询内有 outline 兜底；且必须内缩（不占布局），否则面板几何与拖拽命中区会漂移。
describe('OASSplitter forced-colors 高对比兜底', () => {
  it('拖拽手柄内缩 outline 兜底（outline 不占布局，面板几何零漂移）', () => {
    const css = mount().shadowRoot!.querySelector('style')!.textContent!
    const start = css.indexOf('@media (forced-colors: active)')
    expect(start, '存在 forced-colors 回退块').toBeGreaterThan(-1)
    const block = css.slice(start)
    expect(block, '手柄 outline 兜底').toMatch(/\.splitter\s*\{[^}]*outline:\s*1px solid/)
    expect(block, '内缩 outline（不用 border，避免手柄/面板位移）').toMatch(/outline-offset:\s*-1px/)
  })
})
