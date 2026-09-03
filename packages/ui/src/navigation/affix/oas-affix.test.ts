import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASAffix } from './index.js'

function mount(attrs: Record<string, string> = {}): OASAffix {
  const el = new OASAffix()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<div>固钉内容</div>`
  document.body.appendChild(el)
  return el
}

const flushRaf = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

/** happy-dom 无布局引擎：构造最小 DOMRect mock（top/bottom 由用例控制） */
function mockRect(top: number, bottom: number): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect
}

/** 判定基准是 shadow 内 .placeholder（文档流占位层）——mock 打在它上面 */
function mockPlaceholderRect(el: OASAffix, top: number, bottom: number): void {
  const ph = el.shadowRoot!.querySelector<HTMLElement>('.placeholder')!
  ph.getBoundingClientRect = () => mockRect(top, bottom)
}

/** happy-dom 中 window.scrollY 是只读 getter（恒 0），用 defineProperty 覆写模拟滚动位置 */
function mockScrollY(y: number): void {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true })
}

/** 模拟 window 滚动：改写 scrollY 并派发 scroll 事件（4px 去抖：首帧登记基线，位移 ≥4 才 apply） */
function scrollWindow(y: number): void {
  mockScrollY(y)
  window.dispatchEvent(new Event('scroll'))
}

/** 模拟 DSD 水合：构造器 attachShadow 后注入「SSR 快照 + 指纹 meta」（等价于 DSD template 解析结果） */
function dsdAffix(attrs: Record<string, string> = {}): OASAffix {
  const el = new OASAffix()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<div>固钉内容</div>`
  el.shadowRoot!.innerHTML = `
    <meta data-oas-ssr="oas-affix" data-oas-ssr-v="1">
    <style>.probe { color: red; }</style>
    <div class="placeholder"><div class="wrap" part="wrap"><slot></slot></div></div>
  `
  return el
}

describe('OASAffix', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    mockScrollY(0) // 复位 scrollY mock，防止泄漏到下个用例
  })

  it('渲染包裹内容', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
  })

  it('offset 属性生效', () => {
    const el = mount({ offset: '80' })
    expect(el.getAttribute('offset')).toBe('80')
  })

  it('纯 CSR：update 同步写吸顶态（行为不变）', () => {
    const el = mount({ offset: '80' })
    const wrap = el.shadowRoot!.querySelector<HTMLElement>('.wrap')!
    // happy-dom rect 全 0 → top=0 <= offset=80 → 吸顶态同步写入
    expect(wrap.classList.contains('fixed')).toBe(true)
    expect(wrap.style.top).toBe('80px')
  })

  it('DSD 水合：首帧不写吸顶态，rAF 后按真实布局校正', async () => {
    const el = dsdAffix()
    document.body.appendChild(el)
    const wrap = el.shadowRoot!.querySelector<HTMLElement>('.wrap')!
    // 水合接管：指纹移除、wrap 引用保持（shadow 未重建）
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector('.wrap')).toBe(wrap)
    // 首帧：吸顶态尚未写入（延迟到 rAF）
    expect(wrap.classList.contains('fixed')).toBe(false)
    // rAF 校正：happy-dom rect 全 0 → top=0 <= offset=0 → 吸顶写入
    await flushRaf()
    expect(wrap.classList.contains('fixed')).toBe(true)
    el.remove()
  })

  it('DSD 水合：rAF 前抑制所有布局写入（含重复 update），校正后恢复正常', async () => {
    const el = dsdAffix({ offset: '80' })
    document.body.appendChild(el)
    const wrap = el.shadowRoot!.querySelector<HTMLElement>('.wrap')!
    // rAF 前再次触发 update（如属性变化）：仍被抑制
    el.setAttribute('offset', '120')
    expect(wrap.classList.contains('fixed')).toBe(false)
    expect(wrap.style.top).toBe('')
    await flushRaf()
    // rAF 后校正按最新 offset 写入
    expect(wrap.classList.contains('fixed')).toBe(true)
    expect(wrap.style.top).toBe('120px')
    // 校正后：属性变化同步写入（水合后恢复正常行为）
    el.setAttribute('offset', '40')
    expect(wrap.style.top).toBe('40px')
    el.remove()
  })

  // ---------- v2.x：position / target / oas-change ----------

  it('position="bottom"：底缘越过视口底部吸附线时吸附为 fixed bottom', () => {
    const el = mount({ position: 'bottom', offset: '80' })
    const wrap = el.shadowRoot!.querySelector<HTMLElement>('.wrap')!
    // 初始：元素在视口下方（底缘 1060 > 吸附线 vh-80）→ 不吸附
    // （mount 时初始 apply 用全 0 rect 已判吸，mock 后滚动触发重判）
    mockPlaceholderRect(el, 1000, 1060)
    scrollWindow(0)
    expect(wrap.classList.contains('fixed')).toBe(false)
    // 滚动：底缘越过吸附线（660 <= vh-80）且元素顶仍在吸附线上方 → 吸附（fixed + bottom:80px）
    mockPlaceholderRect(el, 300, 660)
    scrollWindow(100)
    scrollWindow(200) // 4px 去抖：位移 |200-100| >= 4 才触发 apply
    expect(wrap.classList.contains('fixed')).toBe(true)
    expect(wrap.style.bottom).toBe('80px')
    expect(wrap.style.top).toBe('')
    // 占位高度同步（wrap fixed 脱流后 placeholder 兜住文档流；happy-dom 高度 0）
    expect(el.shadowRoot!.querySelector<HTMLElement>('.placeholder')!.style.height).toBe('0px')
  })

  it('position 非法值回落 top 且 console.warn 一次（同值去重）', () => {
    const warns: unknown[][] = []
    const orig = console.warn
    console.warn = (...a: unknown[]) => warns.push(a)
    try {
      const el = mount({ position: 'sideways' })
      const wrap = el.shadowRoot!.querySelector<HTMLElement>('.wrap')!
      // 回落 top 语义：rect 全 0 → top=0 <= offset=0 → 吸顶（fixed + top:0px）
      expect(wrap.classList.contains('fixed')).toBe(true)
      expect(wrap.style.top).toBe('0px')
      expect(warns.length).toBe(1)
      expect(String(warns[0]?.[0])).toContain('[oas-affix]')
      // 同值不重复告警
      mount({ position: 'sideways' })
      expect(warns.length).toBe(1)
    } finally {
      console.warn = orig
    }
  })

  it('target：容器内滚动吸附，吸附判定相对容器可视区', () => {
    const sc = document.createElement('div')
    sc.id = 'affix-sc'
    document.body.appendChild(sc)
    const el = mount({ target: '#affix-sc', offset: '20' })
    const wrap = el.shadowRoot!.querySelector<HTMLElement>('.wrap')!
    // 占位 top 相对容器可视区顶 5px（<= offset 20）→ 吸附
    sc.getBoundingClientRect = () => mockRect(0, 200)
    mockPlaceholderRect(el, 5, 25)
    sc.scrollTop = 100
    sc.dispatchEvent(new Event('scroll')) // 登记去抖基线
    sc.scrollTop = 160
    sc.dispatchEvent(new Event('scroll')) // 触发 apply
    expect(wrap.classList.contains('fixed')).toBe(true)
    expect(wrap.style.top).toBe('20px')
    // 滚出吸附区：相对容器顶 50 > 20 → 解除吸附
    mockPlaceholderRect(el, 50, 70)
    sc.scrollTop = 300
    sc.dispatchEvent(new Event('scroll')) // 触发 apply
    expect(wrap.classList.contains('fixed')).toBe(false)
    // 容器滚出视口（下方未到/上方已过）→ 不吸附，元素随文档流走
    sc.getBoundingClientRect = () => mockRect(2000, 2200)
    sc.dispatchEvent(new Event('scroll'))
    expect(wrap.classList.contains('fixed')).toBe(false)
    sc.getBoundingClientRect = () => mockRect(-500, -300)
    sc.dispatchEvent(new Event('scroll'))
    expect(wrap.classList.contains('fixed')).toBe(false)
    // 容器回到视口内且占位相对容器顶 5 <= 20 → 恢复吸附（scrollTop 变化跨过去抖阈值）
    sc.getBoundingClientRect = () => mockRect(0, 200)
    mockPlaceholderRect(el, 5, 25)
    sc.scrollTop = 400
    sc.dispatchEvent(new Event('scroll'))
    expect(wrap.classList.contains('fixed')).toBe(true)
  })

  it('target 选择器无匹配：console.warn 且回落 window 监听', () => {
    const warns: unknown[][] = []
    const orig = console.warn
    console.warn = (...a: unknown[]) => warns.push(a)
    try {
      const el = mount({ target: '#affix-no-such', offset: '80' })
      const wrap = el.shadowRoot!.querySelector<HTMLElement>('.wrap')!
      // 回落 window：window 滚动触发 apply（占位 top=0 <= offset → 吸顶）
      mockPlaceholderRect(el, 0, 40)
      scrollWindow(100)
      scrollWindow(200)
      expect(wrap.classList.contains('fixed')).toBe(true)
      expect(wrap.style.top).toBe('80px')
      expect(warns.length).toBe(1)
      expect(String(warns[0]?.[0])).toContain('target')
    } finally {
      console.warn = orig
    }
  })

  it('target 元素后挂载：滚动时惰性重解析并切到容器监听', () => {
    const warns: unknown[][] = []
    const orig = console.warn
    console.warn = (...a: unknown[]) => warns.push(a)
    try {
      // 挂载时容器尚不存在 → 回落 window（告警一次）
      const el = mount({ target: '#affix-late', offset: '20' })
      const wrap = el.shadowRoot!.querySelector<HTMLElement>('.wrap')!
      // 后挂载容器
      const sc = document.createElement('div')
      sc.id = 'affix-late'
      document.body.appendChild(sc)
      sc.getBoundingClientRect = () => mockRect(0, 200)
      mockPlaceholderRect(el, 5, 25)
      // window 滚动触发惰性重解析（切到容器监听）
      scrollWindow(100)
      sc.scrollTop = 150
      sc.dispatchEvent(new Event('scroll')) // 容器滚动（|150-0|>=4）触发 apply
      expect(wrap.classList.contains('fixed')).toBe(true)
      expect(wrap.style.top).toBe('20px')
      expect(warns.length).toBe(1) // 仅挂载时告警一次，重解析成功不再告警
    } finally {
      console.warn = orig
    }
  })

  it('resize 时重新解析 target（元素后挂载场景）', () => {
    const warns: unknown[][] = []
    const orig = console.warn
    console.warn = (...a: unknown[]) => warns.push(a)
    try {
      // 挂载时容器尚不存在 → 回落 window（告警一次）
      const el = mount({ target: '#affix-resize', offset: '20' })
      const wrap = el.shadowRoot!.querySelector<HTMLElement>('.wrap')!
      const sc = document.createElement('div')
      sc.id = 'affix-resize'
      document.body.appendChild(sc)
      sc.getBoundingClientRect = () => mockRect(0, 200)
      mockPlaceholderRect(el, 5, 25)
      window.dispatchEvent(new Event('resize')) // 重解析 → 切到容器监听 + 立即 apply
      expect(wrap.classList.contains('fixed')).toBe(true)
      expect(wrap.style.top).toBe('20px')
      expect(warns.length).toBe(1) // 重解析成功后不再告警
    } finally {
      console.warn = orig
    }
  })

  it('oas-change：吸附状态真实翻转才派发，detail { fixed, top }', () => {
    const el = new OASAffix()
    el.setAttribute('offset', '80')
    el.innerHTML = `<div>固钉内容</div>`
    const seen: Array<{ fixed: boolean; top: number }> = []
    el.addEventListener('oas-change', (e: Event) =>
      seen.push((e as CustomEvent).detail as { fixed: boolean; top: number }),
    )
    document.body.appendChild(el)
    // 首帧（占位 rect 全 0 → 吸顶）：fixed:true，top=offset
    expect(seen).toEqual([{ fixed: true, top: 80 }])
    // 滚动离开吸顶区 → 翻转派发 fixed:false（top 仍为吸附参考值 offset）
    mockPlaceholderRect(el, 500, 540)
    scrollWindow(100)
    scrollWindow(200)
    expect(seen.length).toBe(2)
    expect(seen[1]).toEqual({ fixed: false, top: 80 })
    // 同状态继续滚动 → 不重复派发
    mockPlaceholderRect(el, 600, 640)
    scrollWindow(300)
    expect(seen.length).toBe(2)
    // 滚回吸顶区 → 第三次
    mockPlaceholderRect(el, 10, 50)
    scrollWindow(400)
    expect(seen.length).toBe(3)
    expect(seen[2]).toEqual({ fixed: true, top: 80 })
  })

  it('oas-change bottom 吸附：detail.top 为元素当前 rect.top', () => {
    const el = new OASAffix()
    el.setAttribute('position', 'bottom')
    el.innerHTML = `<div>固钉内容</div>`
    const seen: Array<{ fixed: boolean; top: number }> = []
    el.addEventListener('oas-change', (e: Event) =>
      seen.push((e as CustomEvent).detail as { fixed: boolean; top: number }),
    )
    document.body.appendChild(el)
    // 首帧判定用全 0 rect（吸），mock 视口下方位置后滚动触发重判：不吸附
    mockPlaceholderRect(el, 1000, 1060)
    scrollWindow(0)
    expect(seen.length).toBe(2) // 初始全 0 判吸 1 次 + 重判解除 1 次
    expect(seen[1]).toEqual({ fixed: false, top: window.innerHeight })
    // 底缘越过吸附线 → 吸附派发，top=吸附后元素 top（vh - offset - 高度，happy-dom 高度 0）
    mockPlaceholderRect(el, 300, 660)
    scrollWindow(100)
    scrollWindow(200)
    expect(seen.length).toBe(3)
    expect(seen[2]).toEqual({ fixed: true, top: window.innerHeight })
  })

  it('DSD 水合：首帧抑制不派发 oas-change，rAF 校正后翻转才派发且不重复', async () => {
    const el = dsdAffix({ offset: '80' })
    document.body.appendChild(el)
    const seen: Array<{ fixed: boolean; top: number }> = []
    el.addEventListener('oas-change', (e: Event) =>
      seen.push((e as CustomEvent).detail as { fixed: boolean; top: number }),
    )
    await flushRaf()
    // rAF 校正（rect 全 0 → 吸顶）：派发一次
    expect(seen).toEqual([{ fixed: true, top: 80 }])
    // 同状态属性变化 → 不重复派发
    el.setAttribute('offset', '40')
    expect(seen.length).toBe(1)
    el.remove()
  })
})

// ===== append-to（teleport 传送） =====

// ===== append-to（teleport 传送：host 整体移动 + 原位占位） =====

// ===== append-to（teleport 传送：wrap 移动 + light DOM 内容实体化随行） =====

describe('OASAffix append-to（teleport 传送）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    mockScrollY(0)
  })

  /** 取 wrap 节点：传送时 wrap 在目标容器内，解除后回 shadow placeholder */
  function locateWrap(el: OASAffix, containers: HTMLElement[]): HTMLElement | null {
    for (const c of containers) {
      const w = c.querySelector<HTMLElement>('.wrap')
      if (w) return w
    }
    return el.shadowRoot!.querySelector<HTMLElement>('.wrap')
  }

  it('append-to 列入 observedAttributes', () => {
    expect(OASAffix.observedAttributes).toContain('append-to')
  })

  it('吸附时 wrap 传送到目标容器且 light DOM 内容实体化随行，解除时内容搬回 + wrap 归位', () => {
    const dest = document.createElement('div')
    dest.id = 'affix-dest'
    document.body.appendChild(dest)
    const el = mount({ 'append-to': '#affix-dest', offset: '80' })
    const btn = el.querySelector('oas-button')!
    // 首帧吸顶：wrap 在 dest 内，且 light DOM 内容实体已搬入 wrap（不再依赖 slot 投影）
    const wrapInDest = dest.querySelector<HTMLElement>('.wrap')!
    expect(wrapInDest).not.toBeNull()
    expect(el.querySelector('oas-button')).toBeNull()
    expect(wrapInDest.querySelector('oas-button')).toBe(btn)
    // 解除吸附：内容搬回 host（light DOM），wrap 归位 placeholder
    mockPlaceholderRect(el, 500, 540)
    scrollWindow(100)
    scrollWindow(200)
    const wrap = el.shadowRoot!.querySelector<HTMLElement>('.wrap')!
    expect(wrap.classList.contains('fixed')).toBe(false)
    expect(wrap.parentElement).toBe(el.shadowRoot!.querySelector('.placeholder'))
    expect(el.querySelector('oas-button')).toBe(btn)
    // 再次吸附 → 重新传送
    mockPlaceholderRect(el, 5, 25)
    scrollWindow(300)
    expect(locateWrap(el, [dest])).toBe(dest.querySelector('.wrap'))
  })

  it('传送仅移动 wrap，shadow 内 placeholder 留原位（占位高度逻辑保持）', () => {
    const dest = document.createElement('div')
    dest.id = 'affix-dest'
    document.body.appendChild(dest)
    const el = mount({ 'append-to': '#affix-dest', offset: '80' })
    const placeholder = el.shadowRoot!.querySelector<HTMLElement>('.placeholder')!
    expect(dest.querySelector<HTMLElement>('.wrap')).not.toBeNull()
    expect(placeholder.parentNode).toBe(el.shadowRoot!)
    expect(placeholder.style.height).toBe('0px')
  })

  it('append-to 无匹配：告警一次并回落不传送（wrap 保持 placeholder 内原位）', () => {
    const warns: unknown[][] = []
    const orig = console.warn
    console.warn = (...a: unknown[]) => warns.push(a)
    try {
      const el = mount({ 'append-to': '#affix-no-such', offset: '80' })
      const wrap = el.shadowRoot!.querySelector<HTMLElement>('.wrap')!
      const placeholder = el.shadowRoot!.querySelector<HTMLElement>('.placeholder')!
      // 首帧吸顶但无匹配目标 → 回落不传送，wrap 留在 placeholder 内（fixed 视觉不变）
      expect(wrap.classList.contains('fixed')).toBe(true)
      expect(wrap.parentElement).toBe(placeholder)
      expect(warns.length).toBe(1)
      expect(String(warns[0]?.[0])).toContain('[oas-affix]')
      expect(String(warns[0]?.[0])).toContain('append-to')
      // 同值不重复告警（继续滚动触发 apply 不再告警）
      mockPlaceholderRect(el, 0, 40)
      scrollWindow(100)
      scrollWindow(200)
      expect(warns.length).toBe(1)
    } finally {
      console.warn = orig
    }
  })

  it('append-to 属性动态变化：吸附态下即时归位/重传', () => {
    const a = document.createElement('div')
    a.id = 'affix-a'
    document.body.appendChild(a)
    const b = document.createElement('div')
    b.id = 'affix-b'
    document.body.appendChild(b)
    const el = mount({ 'append-to': '#affix-a', offset: '80' })
    const placeholder = el.shadowRoot!.querySelector<HTMLElement>('.placeholder')!
    // 首帧吸顶 → 传送到 #affix-a
    expect(locateWrap(el, [a, b])).toBe(a.querySelector('.wrap'))
    // 仍处吸附态：append-to 改为 #affix-b → 即时重传到新容器
    el.setAttribute('append-to', '#affix-b')
    expect(locateWrap(el, [a, b])).toBe(b.querySelector('.wrap'))
    expect(a.querySelector('.wrap')).toBeNull()
    // 移除 append-to → 无传送目标，内容搬回 + wrap 归位 placeholder
    el.removeAttribute('append-to')
    expect(placeholder.querySelector('.wrap')).not.toBeNull()
    expect(a.querySelector('.wrap')).toBeNull()
    expect(b.querySelector('.wrap')).toBeNull()
    // 内容实体搬回 host（light DOM 原位，textContent 断言不依赖具体元素）
    expect(el.textContent).toContain('固钉内容')
  })

  it('onCleanup：断开连接时 wrap 归位到 placeholder（不遗留孤儿节点）', () => {
    const dest = document.createElement('div')
    dest.id = 'affix-dest'
    document.body.appendChild(dest)
    const el = mount({ 'append-to': '#affix-dest', offset: '80' })
    expect(dest.querySelector<HTMLElement>('.wrap')).not.toBeNull()
    el.remove()
    // 断开连接清理后重新连接：render 重建 shadow（wrap 回归），滚动触发 apply 后可正常再次传送
    document.body.appendChild(el)
    mockPlaceholderRect(el, 5, 25)
    scrollWindow(100)
    scrollWindow(300)
    expect(dest.querySelector<HTMLElement>('.wrap')).not.toBeNull()
  })
})


