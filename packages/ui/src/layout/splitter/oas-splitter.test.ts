import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
    expect(el.shadowRoot!.querySelector('[part="splitter"]')).not.toBeNull()
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
    expect(JSON.stringify(el.shadowRoot!.querySelector('style')!.textContent)).toContain(
      'cursor: row-resize',
    )
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

  // ---------- collapsible ----------

  it('collapsible：折叠按钮渲染 + 点击收起（左面板 0%）+ collapsed 回写 + oas-collapse + 再点展开', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    el.setAttribute('collapsible', '')
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    const btn = splitter.querySelector('.collapse-btn') as HTMLButtonElement
    expect(btn).not.toBeNull()
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
    expect(splitter.querySelector('.grip')).not.toBeNull()
    // 有 handle：分隔条内 slot 分发自定义内容
    el.innerHTML =
      '<div slot="left">左</div><div slot="right">右</div><span slot="handle" class="custom-dot">·</span>'
    expect(splitter.querySelector('slot[name="handle"]')).not.toBeNull()
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
    const flexOf = (i: number) =>
      parseFloat((panes[i] as HTMLElement).style.flex.split(' ')[2] ?? '')
    expect(flexOf(0)).toBeCloseTo(33.33, 1)
    expect(flexOf(1)).toBeCloseTo(33.33, 1)
  })

  it('multiple：折叠按钮独立——每个分隔条各管相邻面板', () => {
    const el = mountMulti()
    el.setAttribute('sizes', '30,40,30')
    el.setAttribute('collapsible', '')
    const splitters = el.shadowRoot!.querySelectorAll('[part="splitter"]')
    const panes = el.shadowRoot!.querySelectorAll('.pane')
    const btn0 = splitters[0]!.querySelector('.collapse-btn') as HTMLButtonElement
    const btn1 = splitters[1]!.querySelector('.collapse-btn') as HTMLButtonElement
    expect(btn0).not.toBeNull()
    expect(btn1).not.toBeNull()
    btn0.click()
    expect((panes[0] as HTMLElement).style.flex).toBe('0 0 0%')
    expect(el.getAttribute('sizes')).toBe('0,70,30')
    // 第二个分隔条独立折叠面板 1
    btn1.click()
    expect((panes[1] as HTMLElement).style.flex).toBe('0 0 0%')
    expect(el.getAttribute('sizes')).toBe('0,0,100')
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

  it('legacy 零回归：slot=left/right 旧用法保持两面板 + 分隔条', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelectorAll('.pane').length).toBe(2)
    expect(el.shadowRoot!.querySelectorAll('[part="splitter"]').length).toBe(1)
    expect(el.shadowRoot!.querySelector('[part="pane-left"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="pane-right"]')).not.toBeNull()
  })
})

function pointer(type: string, clientX: number): Event {
  const Ctor = (globalThis as Record<string, unknown>).PointerEvent as
    | typeof PointerEvent
    | undefined
  if (typeof Ctor === 'function') {
    return new Ctor(type, { bubbles: true, clientX })
  }
  return new MouseEvent(type, { bubbles: true, clientX })
}
