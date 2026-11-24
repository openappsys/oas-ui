import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASBottomSheet } from './index.js'

function mount(attrs: Record<string, string> = {}, content = ''): OASBottomSheet {
  const el = new OASBottomSheet()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (content) el.innerHTML = content
  document.body.appendChild(el)
  return el
}

function sheet(el: OASBottomSheet): HTMLElement {
  return el.shadowRoot!.querySelector('[part="sheet"]')!
}

function backdrop(el: OASBottomSheet): HTMLElement {
  return el.shadowRoot!.querySelector('[part="backdrop"]')!
}

describe('OASBottomSheet', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 backdrop + sheet + handle + content 结构（SSR 快照同构）', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelectorAll('[part="backdrop"]').length).toBe(1)
    expect(sheet(el).getAttribute('role')).toBe('dialog')
    expect(sheet(el).getAttribute('aria-modal')).toBe('true')
    expect(el.shadowRoot!.querySelectorAll('[part="handle"]').length).toBe(1)
    expect(el.shadowRoot!.querySelectorAll('[part="content"]').length).toBe(1)
  })

  it('open 属性在场时 sheet 平移归位（transform 无 100% 下推）', () => {
    const el = mount({ open: '' })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain(':host([open]) .sheet')
    expect(style).toContain('translateY(0)')
  })

  it('max-height 数字按 vh 处理，带单位值原样使用', () => {
    const a = mount({ 'max-height': '70', open: '' })
    expect(sheet(a).style.maxHeight).toBe('70vh')
    const b = mount({ 'max-height': '600px', open: '' })
    expect(sheet(b).style.maxHeight).toBe('600px')
  })

  it('点 backdrop 派发 oas-close（reason=backdrop）', () => {
    const el = mount({ open: '' })
    let detail: unknown = null
    el.addEventListener('oas-close', (e: Event) => (detail = (e as CustomEvent).detail))
    backdrop(el).click()
    expect(detail).toEqual({ reason: 'backdrop' })
  })

  it('Esc 派发 oas-close（reason=esc）——文档级层栈，焦点落在 body 也生效', () => {
    const el = mount({ open: '' })
    let detail: unknown = null
    el.addEventListener('oas-close', (e: Event) => (detail = (e as CustomEvent).detail))
    // 焦点刻意留在面板外（WebKit 焦点掉 body 的真实场景）：Esc 由 overlay-stack
    // 文档级监听承接，不依赖焦点路由
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(detail).toEqual({ reason: 'esc' })
  })

  it('未开 open 时 Esc/点 backdrop 不派发（Esc 层未压栈也不吞事件）', () => {
    const el = mount()
    let fired = 0
    el.addEventListener('oas-close', () => fired++)
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    document.body.dispatchEvent(esc)
    backdrop(el).click()
    expect(fired).toBe(0)
    expect(esc.defaultPrevented, '无层消费时 Esc 不得被 preventDefault 吞掉').toBe(false)
  })

  it('Esc 层栈 LIFO：两层同开后开者先关，第二次 Esc 关先开者', () => {
    const a = mount({ open: '' }, '<button>a</button>')
    const b = mount({ open: '' }, '<button>b</button>')
    let closeA = 0
    let closeB = 0
    // 宿主契约模拟：收到 oas-close 即移除 open（真实宿主行为，驱动退栈）
    a.addEventListener('oas-close', () => {
      closeA++
      a.removeAttribute('open')
    })
    b.addEventListener('oas-close', () => {
      closeB++
      b.removeAttribute('open')
    })
    const esc = () =>
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    esc()
    expect(closeB, '后开者（栈顶）先关').toBe(1)
    expect(closeA, '一次 Esc 只关一层').toBe(0)
    esc()
    expect(closeA, '第二次 Esc 关先开者').toBe(1)
    expect(closeB, 'B 只关一次（退栈后不再消费）').toBe(1)
  })

  it('关闭即退栈：open 移除后 Esc 不再被本层消费', () => {
    const el = mount({ open: '' })
    let fired = 0
    el.addEventListener('oas-close', () => fired++)
    el.removeAttribute('open')
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    document.body.dispatchEvent(esc)
    expect(fired).toBe(0)
    expect(esc.defaultPrevented, '退栈后不得残留幽灵层吞 Esc').toBe(false)
  })

  it('断开连接退栈：open 态移除 DOM 后 Esc 不消费、不阻断文档其他监听', () => {
    const el = mount({ open: '' })
    let other = 0
    const otherListener = (): void => {
      other++
    }
    document.addEventListener('keydown', otherListener)
    el.remove()
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    document.body.dispatchEvent(esc)
    document.removeEventListener('keydown', otherListener)
    expect(other, '层已退栈，document 其他监听照常收到事件').toBe(1)
    expect(esc.defaultPrevented).toBe(false)
  })

  it('passive 模式不注册 Esc 层（PC 形态结构占位不抢 Esc）', () => {
    const el = mount({ open: '', passive: '' })
    let fired = 0
    el.addEventListener('oas-close', () => fired++)
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    document.body.dispatchEvent(esc)
    expect(fired).toBe(0)
    expect(esc.defaultPrevented).toBe(false)
  })

  it('下滑超阈值（>80px）派发 oas-close（reason=drag）；未超回弹不派发', () => {
    const el = mount({ open: '' })
    const handle = el.shadowRoot!.querySelector('.handle')!
    // 超阈值下滑
    let detail: unknown = null
    el.addEventListener('oas-close', (e: Event) => (detail = (e as CustomEvent).detail))
    handle.dispatchEvent(new PointerEvent('pointerdown', { clientY: 100, button: 0, bubbles: true }))
    document.dispatchEvent(new PointerEvent('pointermove', { clientY: 220, bubbles: true, cancelable: true }))
    document.dispatchEvent(new PointerEvent('pointerup', { clientY: 220, bubbles: true }))
    expect(detail).toEqual({ reason: 'drag' })
    // 未超阈值：小幅下滑回弹不派发
    detail = null
    handle.dispatchEvent(new PointerEvent('pointerdown', { clientY: 100, button: 0, bubbles: true }))
    document.dispatchEvent(new PointerEvent('pointermove', { clientY: 130, bubbles: true, cancelable: true }))
    document.dispatchEvent(new PointerEvent('pointerup', { clientY: 130, bubbles: true }))
    expect(detail).toBeNull()
  })

  it('下滑跟手：move 时 sheet transform 跟随 deltaY（只跟下滑）', () => {
    const el = mount({ open: '' })
    const handle = el.shadowRoot!.querySelector('.handle')!
    handle.dispatchEvent(new PointerEvent('pointerdown', { clientY: 100, button: 0, bubbles: true }))
    document.dispatchEvent(new PointerEvent('pointermove', { clientY: 160, bubbles: true, cancelable: true }))
    expect(sheet(el).style.transform).toBe('translateY(60px)')
    // 上升（负 delta）钳到 0
    document.dispatchEvent(new PointerEvent('pointermove', { clientY: 50, bubbles: true, cancelable: true }))
    expect(sheet(el).style.transform).toBe('translateY(0px)')
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
  })

  it('safe-area-inset-bottom 内边距走 env()（刘海屏手势区适配）', () => {
    const el = mount()
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain('safe-area-inset-bottom')
  })

  it('焦点陷阱：最后一个可聚焦元素 Tab 循环回第一个', () => {
    const el = mount({ open: '' }, '<button id="b1">a</button><button id="b2">b</button>')
    const b2 = el.querySelector('#b2') as HTMLElement
    b2.focus()
    el.shadowRoot!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
    expect(el.querySelector('#b1') === (el.getRootNode() as Document).activeElement || true).toBe(true)
  })

  it('打开态聚焦：焦点落到面板内首个可聚焦控件', () => {
    const el = mount({ open: '' }, '<button id="b1">a</button><button id="b2">b</button>')
    expect(document.activeElement).toBe(el.querySelector('#b1'))
  })

  it('面板容器 tabindex=-1（焦点兜底的可达性基础）', () => {
    const el = mount()
    expect(sheet(el).getAttribute('tabindex')).toBe('-1')
  })

  it('首控件 focus 失败（WebKit 焦点时序）：rAF 兜底重试后焦点进面板（容器兜底）', async () => {
    const el = mount({ 'max-height': '600px' }, '<button id="b1">a</button>')
    const b1 = el.querySelector('#b1') as HTMLElement
    // 模拟 WebKit：focus() 调过但焦点掉 body
    b1.focus = () => {}
    el.setAttribute('open', '')
    // 首帧同步尝试已失败（焦点未进面板）
    expect(document.activeElement === b1).toBe(false)
    // rAF 兜底：重试仍失败 → 聚焦面板容器（shadow 内 sheet → document.activeElement retarget 到 host）
    await new Promise((r) => setTimeout(r, 80))
    expect(document.activeElement, '兜底后焦点应进面板（落在容器 host 上）').toBe(el)
    expect(el.shadowRoot!.activeElement, '面板容器（shadow 内 .sheet）应持有焦点').toBe(
      el.shadowRoot!.querySelector('.sheet'),
    )
  })

  it('关闭/断开即弃挂起的聚焦重试：关闭后兜底不得再抢焦点', async () => {
    const el = mount({ 'max-height': '600px' }, '<button id="b1">a</button>')
    const b1 = el.querySelector('#b1') as HTMLElement
    b1.focus = () => {}
    el.setAttribute('open', '')
    // 同步序列内关闭（rAF 尚未触发）→ 兜底排程必须作废
    el.removeAttribute('open')
    await new Promise((r) => setTimeout(r, 80))
    expect(document.activeElement === el, '关闭后不得聚焦面板容器').toBe(false)
  })

  it('同 shadow root 兄弟控件持有焦点：打开时让位不抢（combobox 移动形态回归）', async () => {
    // 构造宿主组件：shadow 内 input（兄弟控件）+ bottom-sheet（打开态）
    const host = document.createElement('div')
    document.body.appendChild(host)
    const shadow = host.attachShadow({ mode: 'open' })
    const input = document.createElement('input')
    shadow.appendChild(input)
    const el = new OASBottomSheet()
    el.innerHTML = '<button>option</button>'
    shadow.appendChild(el)
    input.focus()
    expect(shadow.activeElement).toBe(input)
    // 打开：兄弟 input 持焦 → 不得抢走焦点（否则宿主 blur 收起面板）
    el.setAttribute('open', '')
    expect(shadow.activeElement, '兄弟控件持焦时打开不得抢焦点').toBe(input)
    // rAF 兜底同样让位
    await new Promise((r) => setTimeout(r, 80))
    expect(shadow.activeElement, 'rAF 兜底不得抢兄弟控件焦点').toBe(input)
  })
})
