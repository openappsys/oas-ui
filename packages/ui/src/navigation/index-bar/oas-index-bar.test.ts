import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASIndexBar } from './index.js'

/**
 * oas-index-bar（navigation 族，移动原生形态批）—— 索引栏。
 *
 * 设计前必答清单（AGENTS.md 六问）：
 * 1. 取消路径：纯数据展示 + 导航，无浮层/计时器；scroll/pointer 监听经 onCleanup 统一清理，
 *    断开连接零孤儿（拖动中捕获的 pointer 由 pointerup/cancel + 断连清理兜底）。
 * 2. 属性默认值：`sections` 缺省 `[]`（空态：空列表 + 空侧栏，不报错）；`height` 缺省无（列表自适应）；
 *    `sticky` 缺省 true（仅在显式 `sticky="false"` 时关闭）。
 * 3. 多步交互失败点：分节 JSON 非法/非数组 → 空态；条目 `value` 缺省回退 label；
 *   跳转目标缺失 → 静默不改高亮；滚动联动只在 key 真正变化时派发 `oas-change`。
 * 4. 破坏性选项：无破坏性操作；空态不渲染任何可交互项。
 * 5. 键盘/ARIA：侧栏 `role="navigation"` + aria-label（i18n）；字母为 button（roving tabindex，
 *   ↑/↓ 移动、Home/End 首尾、Enter/Space 跳转）；条目为原生 button（Enter/Space 派发 oas-item-click）；
 *   分节头 role="heading" + aria-level，section 以 aria-labelledby 关联。
 * 6. 受控/非受控：`sections`/`height`/`sticky` 均为声明式属性（非 DOM 内建 property，宿主框架桥接安全），
 *   内部高亮为纯派生状态。
 *
 * happy-dom 限制：getComputedStyle 不解析 var()——配色断言锁「样式表含 token 表达式」的机制形态，
 * 真实配色 / RTL 侧栏位置 / 拖拽感知由 e2e（qa-regression/index-bar.spec.ts）在浏览器复核。
 */

const SECTIONS = JSON.stringify([
  { key: 'A', title: 'A', items: [{ label: 'Alice', value: 'alice' }, { label: 'Amy' }] },
  { key: 'B', items: [{ label: 'Bob', value: 'bob' }] },
  { key: 'C', title: 'C', items: [{ label: 'Cara', value: 'cara' }] },
])

interface RectLike {
  top: number
  bottom: number
  height: number
  left: number
  right: number
  width: number
  x: number
  y: number
  toJSON?: () => unknown
}

function rect(top: number, height = 40): RectLike {
  return { top, bottom: top + height, height, left: 0, right: 100, width: 100, x: 0, y: top, toJSON: () => ({}) }
}

function stubRect(el: Element, r: RectLike): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(r as unknown as DOMRect)
}

function mount(attrs: Record<string, string> = {}): OASIndexBar {
  const el = new OASIndexBar()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!('sections' in attrs)) el.setAttribute('sections', SECTIONS)
  document.body.appendChild(el)
  return el
}

function list(el: OASIndexBar): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="list"]')!
}
function bar(el: OASIndexBar): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
}
function letters(el: OASIndexBar): HTMLButtonElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button[part="letter"]'))
}
function items(el: OASIndexBar): HTMLButtonElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button[part="item"]'))
}
function sectionEls(el: OASIndexBar): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('[part="section"]'))
}
function activeLetter(el: OASIndexBar): string | null {
  const b = letters(el).find((x) => x.getAttribute('aria-current') === 'true')
  return b ? b.textContent : null
}
function styleText(el: OASIndexBar): string {
  return el.shadowRoot!.querySelector('style')!.textContent!
}

/** 让 list.scrollTop 可读写（happy-dom 下避免只读） */
function makeScrollable(listEl: HTMLElement): void {
  let v = 0
  Object.defineProperty(listEl, 'scrollTop', {
    get: () => v,
    set: (x: number) => {
      v = x
    },
    configurable: true,
  })
}

/** 可控 prefers-reduced-motion */
function stubReducedMotion(reduced: boolean): void {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: reduced,
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }))
}

/** 手动 rAF：收集回调，由测试逐帧推进 */
function stubRafManual(): { run: (now: number) => void } {
  const queue: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    queue.push(cb)
    return queue.length
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  return {
    run: (now: number) => {
      const cbs = queue.splice(0)
      for (const cb of cbs) cb(now)
    },
  }
}

function pointer(type: string, clientY: number): Event {
  const Ctor = (globalThis as unknown as { PointerEvent?: typeof PointerEvent }).PointerEvent
  const init = { pointerId: 1, clientY, bubbles: true, cancelable: true, composed: true }
  return Ctor ? new Ctor(type, init) : new MouseEvent(type, init)
}

function key(k: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })
}

describe('OASIndexBar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('dir')
    stubReducedMotion(true)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('dir')
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // ---------- 空态 / 容错 ----------

  it('空态：无 sections 渲染空列表与空侧栏，不报错', () => {
    const el = mount({ sections: '[]' })
    expect(items(el).length).toBe(0)
    expect(letters(el).length).toBe(0)
    expect(sectionEls(el).length).toBe(0)
  })

  it('非法 JSON / 非数组 → 空态', () => {
    expect(items(mount({ sections: '{bad' })).length).toBe(0)
    expect(items(mount({ sections: '{"a":1}' })).length).toBe(0)
  })

  it('过滤非法 section（缺 key / 非对象）与非法 item（缺 label）', () => {
    const el = mount({
      sections: JSON.stringify([
        null,
        { title: 'no key', items: [{ label: 'x' }] },
        { key: 'A', items: [{ label: 'ok', value: 'v' }, { nope: 1 }, 'str'] },
      ]),
    })
    expect(letters(el).map((b) => b.textContent)).toEqual(['A'])
    expect(items(el).map((b) => b.textContent)).toEqual(['ok'])
  })

  it('重复 key 只保留首个（高亮/跳转无歧义）', () => {
    const el = mount({
      sections: JSON.stringify([
        { key: 'A', items: [{ label: 'first' }] },
        { key: 'A', items: [{ label: 'second' }] },
      ]),
    })
    expect(letters(el).length).toBe(1)
    expect(items(el).map((b) => b.textContent)).toEqual(['first'])
  })

  // ---------- 渲染 ----------

  it('渲染分节列表：分节头 + 条目按钮，条目为原生 button', () => {
    const el = mount()
    expect(sectionEls(el).length).toBe(3)
    expect(items(el).map((b) => b.textContent)).toEqual(['Alice', 'Amy', 'Bob', 'Cara'])
    expect(items(el).every((b) => b.tagName === 'BUTTON')).toBe(true)
    const headers = Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('[part="section-header"]'))
    expect(headers.map((h) => h.textContent)).toEqual(['A', 'B', 'C'])
    expect(headers.every((h) => h.getAttribute('role') === 'heading')).toBe(true)
  })

  it('title 缺省回退 key（分节头与字母文本）', () => {
    const el = mount({
      sections: JSON.stringify([{ key: 'B', items: [{ label: 'Bob' }] }]),
    })
    expect(el.shadowRoot!.querySelector('[part="section-header"]')!.textContent).toBe('B')
    expect(letters(el)[0]!.textContent).toBe('B')
  })

  it('侧栏字母从 sections 派生，顺序与标题一致', () => {
    const el = mount()
    expect(letters(el).map((b) => b.textContent)).toEqual(['A', 'B', 'C'])
    expect(letters(el).map((b) => b.dataset.key)).toEqual(['A', 'B', 'C'])
  })

  it('section 以 aria-labelledby 关联分节头', () => {
    const el = mount()
    const sec = sectionEls(el)[0]!
    const header = sec.querySelector('[part="section-header"]')!
    expect(sec.getAttribute('aria-labelledby')).toBe(header.id)
    expect(header.id).toBeTruthy()
  })

  // ---------- height / sticky ----------

  it('height 设置列表固定高度并加滚动类', () => {
    const el = mount({ height: '240' })
    expect(list(el).style.height).toBe('240px')
    expect(list(el).classList.contains('scrollable')).toBe(true)
  })

  it('height 非法 / 缺省：列表自适应，无滚动类', () => {
    const el = mount({ height: 'abc' })
    expect(list(el).style.height).toBe('')
    expect(list(el).classList.contains('scrollable')).toBe(false)
  })

  it('sticky 默认开启（样式含 position: sticky），sticky="false" 关闭', () => {
    const on = mount()
    expect(list(on).classList.contains('sticky')).toBe(true)
    expect(styleText(on)).toContain('position: sticky')
    const off = mount({ sticky: 'false' })
    expect(list(off).classList.contains('sticky')).toBe(false)
  })

  // ---------- a11y ----------

  it('侧栏 role=navigation + aria-label（i18n）', () => {
    const el = mount()
    expect(bar(el).getAttribute('role')).toBe('navigation')
    expect(bar(el).getAttribute('aria-label')).toBe('字母索引导航')
  })

  it('首字母初始高亮 aria-current=true，其余 false', () => {
    const el = mount()
    expect(activeLetter(el)).toBe('A')
    expect(letters(el)[1]!.getAttribute('aria-current')).toBe('false')
  })

  // ---------- oas-item-click ----------

  it('点击条目派发 oas-item-click（detail value/label/section）', () => {
    const el = mount()
    const details: unknown[] = []
    el.addEventListener('oas-item-click', (e) => details.push((e as CustomEvent).detail))
    items(el)[0]!.click()
    expect(details).toEqual([{ value: 'alice', label: 'Alice', section: 'A' }])
  })

  it('条目 value 缺省回退 label', () => {
    const el = mount()
    const details: Array<{ value: string }> = []
    el.addEventListener('oas-item-click', (e) => details.push((e as CustomEvent).detail))
    items(el)[1]!.click() // Amy 无 value
    expect(details[0]!.value).toBe('Amy')
  })

  it('oas-item-click 冒泡且 composed（穿出 shadow）', () => {
    const el = mount()
    let seen = false
    document.body.addEventListener('oas-item-click', () => (seen = true))
    items(el)[0]!.click()
    expect(seen).toBe(true)
  })

  // ---------- 跳转 + oas-change ----------

  it('初始渲染不派发 oas-change', () => {
    let count = 0
    const el = new OASIndexBar()
    el.setAttribute('sections', SECTIONS)
    el.addEventListener('oas-change', () => count++)
    document.body.appendChild(el)
    expect(count).toBe(0)
  })

  it('点字母跳转：滚动到分节 + 高亮迁移 + oas-change', () => {
    const el = mount({ height: '200' })
    makeScrollable(list(el))
    stubRect(list(el), rect(0))
    sectionEls(el).forEach((s, i) => stubRect(s, rect(i * 400)))
    const changes: Array<{ key: string }> = []
    el.addEventListener('oas-change', (e) => changes.push((e as CustomEvent).detail))
    // 点击第 3 个字母（C）
    letters(el)[2]!.click()
    expect(activeLetter(el)).toBe('C')
    expect((list(el) as HTMLElement).scrollTop).toBe(800)
    expect(changes).toEqual([{ key: 'C' }])
  })

  it('点当前字母不重复派发 oas-change', () => {
    const el = mount({ height: '200' })
    makeScrollable(list(el))
    stubRect(list(el), rect(0))
    sectionEls(el).forEach((s, i) => stubRect(s, rect(i * 400)))
    let count = 0
    el.addEventListener('oas-change', () => count++)
    letters(el)[0]!.click() // 已是 A
    expect(count).toBe(0)
  })

  it('prefers-reduced-motion 下瞬跳（同步写入 scrollTop，无动画）', () => {
    stubReducedMotion(true)
    const el = mount({ height: '200' })
    makeScrollable(list(el))
    stubRect(list(el), rect(0))
    sectionEls(el).forEach((s, i) => stubRect(s, rect(i * 100)))
    letters(el)[1]!.click()
    expect((list(el) as HTMLElement).scrollTop).toBe(100)
  })

  it('程序化平滑滚动期间抑制 scrollspy（避免途经中间分节抢占高亮）', () => {
    stubReducedMotion(false)
    const raf = stubRafManual()
    const el = mount({ height: '200' })
    makeScrollable(list(el))
    stubRect(list(el), rect(0))
    const secs = sectionEls(el)
    stubRect(secs[0]!, rect(0))
    stubRect(secs[1]!, rect(400))
    stubRect(secs[2]!, rect(800))
    const changes: Array<{ key: string }> = []
    el.addEventListener('oas-change', (e) => changes.push((e as CustomEvent).detail))
    letters(el)[2]!.click() // 跳 C，启动平滑动画
    expect(activeLetter(el)).toBe('C')
    // 动画途中制造一次「仍停在 A 附近」的 scroll 事件 → 被抑制，不改写不派发
    raf.run(performance.now() + 100)
    list(el).dispatchEvent(new Event('scroll'))
    expect(activeLetter(el)).toBe('C')
    // 动画落定后交回 scrollspy（此时几何显示 C 贴顶，保持 C）
    stubRect(secs[0]!, rect(-800))
    stubRect(secs[1]!, rect(-400))
    stubRect(secs[2]!, rect(0))
    raf.run(performance.now() + 1000)
    expect(activeLetter(el)).toBe('C')
    expect(changes.map((c) => c.key)).toEqual(['C'])
  })

  // ---------- scrollspy ----------

  it('列表滚动联动：高亮最近一个越顶分节并派发 oas-change', () => {
    const el = mount({ height: '200' })
    makeScrollable(list(el))
    stubRect(list(el), rect(0))
    const secs = sectionEls(el)
    // 模拟已滚到 B：A 头已滚出（top<0）、B 头贴顶、C 头在下方
    stubRect(secs[0]!, rect(-400))
    stubRect(secs[1]!, rect(0))
    stubRect(secs[2]!, rect(400))
    const changes: Array<{ key: string }> = []
    el.addEventListener('oas-change', (e) => changes.push((e as CustomEvent).detail))
    list(el).dispatchEvent(new Event('scroll'))
    expect(activeLetter(el)).toBe('B')
    expect(changes).toEqual([{ key: 'B' }])
  })

  it('滚动回顶部：高亮首分节', () => {
    const el = mount({ height: '200' })
    makeScrollable(list(el))
    stubRect(list(el), rect(0))
    const secs = sectionEls(el)
    stubRect(secs[0]!, rect(-400))
    stubRect(secs[1]!, rect(0))
    stubRect(secs[2]!, rect(400))
    list(el).dispatchEvent(new Event('scroll'))
    expect(activeLetter(el)).toBe('B')
    stubRect(secs[0]!, rect(0))
    stubRect(secs[1]!, rect(400))
    stubRect(secs[2]!, rect(800))
    list(el).dispatchEvent(new Event('scroll'))
    expect(activeLetter(el)).toBe('A')
  })

  it('无 height 时监听 window 滚动联动', () => {
    const el = mount() // 无 height
    Object.defineProperty(window, 'scrollY', { value: 500, configurable: true, writable: true })
    const secs = sectionEls(el)
    stubRect(secs[0]!, rect(-500))
    stubRect(secs[1]!, rect(-100))
    stubRect(secs[2]!, rect(300))
    const changes: Array<{ key: string }> = []
    el.addEventListener('oas-change', (e) => changes.push((e as CustomEvent).detail))
    window.dispatchEvent(new Event('scroll'))
    expect(activeLetter(el)).toBe('B')
    expect(changes).toEqual([{ key: 'B' }])
  })

  // ---------- 拖拽 ----------

  it('侧栏按下拖拽：pointerdown/move 经过字母即跳转', () => {
    const el = mount({ height: '200' })
    makeScrollable(list(el))
    stubRect(list(el), rect(0))
    sectionEls(el).forEach((s, i) => stubRect(s, rect(i * 100)))
    const barc = bar(el)
    letters(el).forEach((b, i) => stubRect(b, rect(i * 20, 20)))
    const changes: Array<{ key: string }> = []
    el.addEventListener('oas-change', (e) => changes.push((e as CustomEvent).detail))
    letters(el)[0]!.dispatchEvent(pointer('pointerdown', 5))
    expect(activeLetter(el)).toBe('A')
    barc.dispatchEvent(pointer('pointermove', 25))
    expect(activeLetter(el)).toBe('B')
    barc.dispatchEvent(pointer('pointermove', 45))
    expect(activeLetter(el)).toBe('C')
    barc.dispatchEvent(pointer('pointerup', 45))
    // 拖拽结束再移动不再触发
    barc.dispatchEvent(pointer('pointermove', 5))
    expect(activeLetter(el)).toBe('C')
    expect(changes.map((c) => c.key)).toEqual(['B', 'C'])
  })

  // ---------- 键盘 ----------

  it('键盘：↓ 移动 roving 焦点，Enter 跳转', () => {
    const el = mount({ height: '200' })
    makeScrollable(list(el))
    stubRect(list(el), rect(0))
    sectionEls(el).forEach((s, i) => stubRect(s, rect(i * 100)))
    const barc = bar(el)
    barc.dispatchEvent(key('ArrowDown'))
    expect(letters(el)[1]!.tabIndex).toBe(0)
    expect(letters(el)[0]!.tabIndex).toBe(-1)
    barc.dispatchEvent(key('ArrowUp'))
    expect(letters(el)[0]!.tabIndex).toBe(0)
    barc.dispatchEvent(key('ArrowDown'))
    barc.dispatchEvent(key('Enter'))
    expect(activeLetter(el)).toBe('B')
  })

  it('键盘：Home/End 首尾', () => {
    const el = mount({ height: '200' })
    makeScrollable(list(el))
    stubRect(list(el), rect(0))
    sectionEls(el).forEach((s, i) => stubRect(s, rect(i * 100)))
    const barc = bar(el)
    barc.dispatchEvent(key('End'))
    expect(letters(el)[2]!.tabIndex).toBe(0)
    barc.dispatchEvent(key('Home'))
    expect(letters(el)[0]!.tabIndex).toBe(0)
  })

  // ---------- RTL ----------

  it('RTL：data-rtl 标记随根 dir 变更', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    const el = mount()
    expect(el.hasAttribute('data-rtl')).toBe(true)
    document.documentElement.setAttribute('dir', 'ltr')
    // 属性变更触发 update 后同步（sections 重设触发一次更新）
    el.setAttribute('sections', '[]')
    expect(el.hasAttribute('data-rtl')).toBe(false)
  })

  // ---------- 样式 token ----------

  it('配色只走 CSS 变量 token（无硬编码色值），dark 随 token 适配', () => {
    const el = mount()
    const css = styleText(el)
    expect(css).toContain('var(--oas-color-text-secondary)')
    expect(css).toContain('var(--oas-color-primary)')
    expect(css).toContain('--oas-index-bar-letter-active-color')
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/rgba?\(/)
  })

  // ---------- 运行时更新 ----------

  it('运行时改 sections 重渲染并重建侧栏', () => {
    const el = mount()
    expect(letters(el).length).toBe(3)
    el.setAttribute('sections', JSON.stringify([{ key: 'Z', items: [{ label: 'Zed' }] }]))
    expect(letters(el).map((b) => b.textContent)).toEqual(['Z'])
    expect(items(el).map((b) => b.textContent)).toEqual(['Zed'])
  })

  it('运行时移除 height 恢复自适应', () => {
    const el = mount({ height: '200' })
    expect(list(el).style.height).toBe('200px')
    el.removeAttribute('height')
    expect(list(el).style.height).toBe('')
    expect(list(el).classList.contains('scrollable')).toBe(false)
  })

  // ---------- 安全 ----------

  it('label/title 含 HTML 时按纯文本渲染（零注入面）', () => {
    const el = mount({
      sections: JSON.stringify([
        { key: '<img src=x>', title: '<b>T</b>', items: [{ label: '<img src=x onerror=alert(1)>' }] },
      ]),
    })
    expect(el.shadowRoot!.querySelectorAll('img').length).toBe(0)
    expect(items(el)[0]!.textContent).toBe('<img src=x onerror=alert(1)>')
    expect(letters(el)[0]!.textContent).toBe('<b>T</b>')
  })

  // ---------- DSD 真水合 ----------

  it('DSD 真水合：快照接管（shadow 不重建、指纹移除、结构保留），水合后属性变化可更新', () => {
    const ref = new OASIndexBar()
    ref.setAttribute('sections', SECTIONS)
    document.body.appendChild(ref)
    const snapshot = ref.shadowRoot!.innerHTML
    expect(snapshot).toContain('<style>')
    ref.remove()

    const el = new OASIndexBar()
    el.setAttribute('sections', SECTIONS)
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-index-bar" data-oas-ssr-v="1">${snapshot}`
    const styleRef = el.shadowRoot!.querySelector('style')
    document.body.appendChild(el)

    expect(el.shadowRoot!.querySelector('style')).toBe(styleRef)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(letters(el).length).toBe(3)
    expect(items(el).length).toBe(4)

    el.setAttribute('sections', JSON.stringify([{ key: 'Z', items: [{ label: 'Zed' }] }]))
    expect(letters(el).map((b) => b.textContent)).toEqual(['Z'])
  })

  it('DSD 回退：快照缺关键结构时 render 全量重建', () => {
    const el = new OASIndexBar()
    el.setAttribute('sections', SECTIONS)
    el.shadowRoot!.innerHTML = '<meta data-oas-ssr="oas-index-bar" data-oas-ssr-v="1"><span>broken</span>'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="root"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(letters(el).length).toBe(3)
  })
})
