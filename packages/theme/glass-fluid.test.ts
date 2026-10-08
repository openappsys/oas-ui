import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  GLASS_FLUID_ACTIVE_ATTR,
  GLASS_REGISTRY,
  buildGlassFluidSheetCss,
  resolveGlassSurface,
  applyGlassPointer,
  shouldEnableGlassFluid,
  startGlassFluid,
  stopGlassFluid,
} from './glass-fluid.js'

/**
 * 液态玻璃「动态层」运行时（L1 单测）。
 *
 * 契约（B 档）：组件源码零玻璃规则体/零标记；运行时按注册表把共享样式表注入对应 shadow 根，
 * 并按 composedPath 命中注册表 surface 写坐标变量 + 运行时标记；app-bar 弹层状态由运行时镜像。
 */
function makeComponent(tag: string, hostSelector: string | null) {
  const host = document.createElement(tag) as HTMLElement
  document.body.appendChild(host)
  const root = host.attachShadow({ mode: 'open' })
  // 造一个 fake shadow 根（happy-dom 不自动建 shadowRoot）：注入路径用
  if (hostSelector) {
    const surface = document.createElement('div')
    surface.className = hostSelector.replace(/^\./, '')
    surface.getBoundingClientRect = () => ({ left: 100, top: 50, width: 200, height: 100 }) as DOMRect
    root.appendChild(surface)
  }
  return host
}

describe('glass-fluid 运行时（动态层）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('data-glass')
    vi.stubGlobal(
      'CSSStyleSheet',
      class {
        cssText = ''
        replaceSync(t: string) {
          this.cssText = t
        }
      },
    )
  })
  afterEach(() => {
    stopGlassFluid()
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('data-glass')
    vi.unstubAllGlobals()
  })

  it('shouldEnableGlassFluid：无 data-glass / reduced-motion / 粗指针 / HC 均不启用', () => {
    const env = (over = {}) => ({
      hasGlass: true,
      reducedMotion: false,
      coarsePointer: false,
      highContrast: false,
      ...over,
    })
    expect(shouldEnableGlassFluid(env())).toBe(true)
    expect(shouldEnableGlassFluid(env({ hasGlass: false }))).toBe(false)
    expect(shouldEnableGlassFluid(env({ reducedMotion: true }))).toBe(false)
    expect(shouldEnableGlassFluid(env({ coarsePointer: true }))).toBe(false)
    expect(shouldEnableGlassFluid(env({ highContrast: true }))).toBe(false)
  })

  it('注册表覆盖 9 控件域组件（button/switch/slider/app-bar/bottom-navigation/message/toast/snackbar/notification）', () => {
    expect(GLASS_REGISTRY.map((e) => e.tag)).toEqual([
      'oas-button',
      'oas-switch',
      'oas-slider',
      'oas-app-bar',
      'oas-bottom-navigation',
      'oas-message',
      'oas-toast',
      'oas-snackbar',
      'oas-notification',
    ])
    expect(GLASS_REGISTRY.find((e) => e.tag === 'oas-app-bar')?.host).toBe(true)
  })

  it('注入样式表含高光/按压/slider 伪元素/app-bar 让位规则，且静止不生成 background', () => {
    const css = buildGlassFluidSheetCss()
    expect(css).toContain(`[${GLASS_FLUID_ACTIVE_ATTR}]::after`)
    expect(css).toContain(':active::after')
    expect(css).toContain('::-webkit-slider-thumb')
    expect(css).toContain('::-moz-range-thumb')
    // 静止（未命中）不得生成背景（axe 采样不受扰）：凡声明 background 的规则，选择器都必须带激活标记
    const blocks = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
      sel: (m[1] ?? '').trim(),
      body: m[2] ?? '',
    }))
    const withBg = blocks.filter((b) => /background\s*:/.test(b.body))
    expect(withBg.length, '应有高光背景规则').toBeGreaterThan(0)
    for (const b of withBg) {
      expect(b.sel, `声明背景的规则应仅作用于命中标记：${b.sel}`).toContain(GLASS_FLUID_ACTIVE_ATTR)
    }
    // 淡入/淡出保留：基态层（无标记）声明 opacity:0 + transition（离开淡出）
    const baseBlock = blocks.find((b) => b.body.includes('transition') && /content:\s*''/.test(b.body))
    expect(baseBlock, '存在基态高光层（用于过渡）').toBeTruthy()
    expect(baseBlock!.body).toContain('opacity: 0')
    expect(baseBlock!.sel).not.toContain(GLASS_FLUID_ACTIVE_ATTR)
  })

  it('基态/命中高光层成对（含 .box）且高光落在文字之下（isolation + z-index:-1）', () => {
    const css = buildGlassFluidSheetCss()
    // 每个基态 `::after` 选择器都必须存在：漏了它 → 命中规则无 content → 伪元素不生成 → 高光整体失效
    for (const s of ['button::after', 'a[part="button"]::after', '.box::after', '.tablist::after', ':host::after']) {
      expect(css, `基态层缺 ${s}`).toContain(s)
    }
    for (const s of [
      'button[data-glass-fluid]::after',
      '.box[data-glass-fluid]::after',
      ':host([data-glass-fluid])::after',
    ]) {
      expect(css, `命中层缺 ${s}`).toContain(s)
    }
    // 实心按钮：hover 高光与玻璃面一致；**按压走边缘内描边（非提亮）**守住白字对比度；
    // 实心判定与组件 oas-button.ts 同构且整段 :where() 归零特异性（不得反超禁用守卫）
    expect(css, '实心按压须用边缘内描边').toContain('box-shadow: inset')
    expect(css, '实心表面判定缺失').toContain(':where(.primary,.success,.warning,.danger,.has-color)')
    expect(css, '实心判定须含变体豁免').toContain(':where(:not(.plain):not(.ghost)')
    // 高光层落在「surface 背景之上、文字之下」：surface 自成层叠上下文 + 基态层负 z-index
    expect(css, 'surface 需自成层叠上下文').toMatch(/isolation:\s*isolate/)
    expect(css, '高光层需置负 z-index（文字之下）').toMatch(/z-index:\s*-1/)
    // 禁用守卫须同时覆盖原生 disabled 与链接形态的 aria-disabled（a[part=button] 无原生 disabled），并清 box-shadow
    expect(css).toMatch(/button\[data-glass-fluid\]\[disabled\]::after/)
    expect(css).toContain(`a[part="button"][data-glass-fluid][aria-disabled='true']::after`)
    expect(css, '禁用守卫须清 box-shadow').toMatch(/opacity:\s*0;\s*background:\s*none;\s*box-shadow:\s*none;/)
  })

  it('定位锚点只覆盖基础态未定位的 surface（不得覆盖 fixed/absolute 宿主与 fixed .box）', () => {
    const css = buildGlassFluidSheetCss()
    const posBlock = css.match(/([^{}]*)\{\s*\n?\s*position:\s*relative;/)?.[1] ?? ''
    expect(posBlock, '不得覆盖 .box（snackbar 为 fixed；message/toast 自带 relative）').not.toContain('.box')
    expect(posBlock, '宿主锚点必须限定 static（fixed/absolute/floating 自带包含块）').not.toMatch(
      /:host\(\[data-glass-fluid\]\)/,
    )
    expect(posBlock).toContain(":host([data-glass-fluid][data-position='static'])")
    expect(posBlock).toContain('.tablist[data-glass-fluid]')
  })

  it('stop 真移除注入表（停用即净，非仅标记惰性）', () => {
    document.documentElement.setAttribute('data-glass', '')
    const host = document.createElement('oas-button')
    const root = host.attachShadow({ mode: 'open' }) as ShadowRoot & { adoptedStyleSheets: unknown[] }
    Object.defineProperty(root, 'adoptedStyleSheets', { value: [], writable: true, configurable: true })
    document.body.appendChild(host)
    startGlassFluid()
    expect(root.adoptedStyleSheets.length).toBe(1)
    stopGlassFluid()
    expect(root.adoptedStyleSheets.length, 'stop 应摘除注入表').toBe(0)
  })

  it('瞬态 shadow 宿主断连后观察器被 prune（帧内至多一次，防瞬态实例累积泄漏）', async () => {
    document.documentElement.setAttribute('data-glass', '')
    const raf: typeof requestAnimationFrame =
      globalThis.requestAnimationFrame ?? ((cb) => setTimeout(() => cb(0), 0) as unknown as number)
    const disconnects: number[] = []
    const Orig = globalThis.MutationObserver
    class Spy extends Orig {
      override disconnect(): void {
        disconnects.push(1)
        super.disconnect()
      }
    }
    globalThis.MutationObserver = Spy as unknown as typeof MutationObserver
    try {
      const mk = () => {
        const h = document.createElement('oas-button')
        const r = h.attachShadow({ mode: 'open' }) as ShadowRoot & { adoptedStyleSheets: unknown[] }
        Object.defineProperty(r, 'adoptedStyleSheets', { value: [], writable: true, configurable: true })
        document.body.appendChild(h)
        return h
      }
      mk()
      const gone = mk()
      startGlassFluid()
      gone.remove()
      // 触发文档级 mutation → docObserver 回调排程 prune
      document.body.appendChild(document.createElement('div'))
      await new Promise((r) => raf(() => r(null)))
      await new Promise((r) => raf(() => r(null)))
      expect(disconnects.length, '断连宿主对应的观察器应被摘除（prune）').toBeGreaterThan(0)
    } finally {
      globalThis.MutationObserver = Orig
      stopGlassFluid()
    }
  })

  it('resolveGlassSurface：注册表匹配（shadow 内 surface + 宿主级 surface；非注册组件不命中）', () => {
    const btn = document.createElement('oas-button')
    const root = btn.attachShadow({ mode: 'open' })
    const inner = document.createElement('button')
    root.appendChild(inner)
    document.body.appendChild(btn)
    const bar = document.createElement('oas-app-bar')
    document.body.appendChild(bar)
    expect(resolveGlassSurface({ composedPath: () => [inner, btn, document.body] })).toBe(inner)
    expect(resolveGlassSurface({ composedPath: () => [bar, document.body] })).toBe(bar)
    // 非注册自定义元素内的 button 不命中（避免误伤普通按钮）
    const other = document.createElement('oas-modal')
    const oroot = other.attachShadow({ mode: 'open' })
    const obtn = document.createElement('button')
    oroot.appendChild(obtn)
    document.body.appendChild(other)
    expect(resolveGlassSurface({ composedPath: () => [obtn, other, document.body] })).toBeNull()
  })

  it('applyGlassPointer：写本地归一百分比（子像素）+ 运行时标记；命中 null 时清理', () => {
    const el = document.createElement('div')
    el.getBoundingClientRect = () => ({ left: 100, top: 50, width: 200, height: 100 }) as DOMRect
    applyGlassPointer(el, 150, 75)
    expect(el.style.getPropertyValue('--oas-glass-px')).toBe('25%')
    expect(el.style.getPropertyValue('--oas-glass-py')).toBe('25%')
    expect(el.hasAttribute(GLASS_FLUID_ACTIVE_ATTR)).toBe(true)
    applyGlassPointer(el, null, null)
    expect(el.style.getPropertyValue('--oas-glass-px')).toBe('')
    expect(el.hasAttribute(GLASS_FLUID_ACTIVE_ATTR)).toBe(false)
  })

  it('坐标越界 clamp 到 0~100%', () => {
    const el = document.createElement('div')
    el.getBoundingClientRect = () => ({ left: 100, top: 50, width: 200, height: 100 }) as DOMRect
    applyGlassPointer(el, 0, 1000)
    expect(el.style.getPropertyValue('--oas-glass-px')).toBe('0%')
    expect(el.style.getPropertyValue('--oas-glass-py')).toBe('100%')
  })

  it('无 data-glass 时不注入样式表（零 DOM 改动）', () => {
    startGlassFluid()
    const host = document.createElement('oas-button')
    document.body.appendChild(host)
    const root = host.attachShadow({ mode: 'open' })
    expect(Array.isArray(root.adoptedStyleSheets) ? root.adoptedStyleSheets.length : 0).toBe(0)
  })

  it('有 data-glass 时向注册表组件的 shadow 根注入共享样式表（含挂载后新增，幂等）', async () => {
    document.documentElement.setAttribute('data-glass', '')
    startGlassFluid()
    const host = document.createElement('oas-button')
    const root = host.attachShadow({ mode: 'open' }) as ShadowRoot & { adoptedStyleSheets: unknown[] }
    // happy-dom 会校验 adoptedStyleSheets 必须是其内部 CSSStyleSheet 实例；用自有属性绕过（仅测试夹具）
    Object.defineProperty(root, 'adoptedStyleSheets', { value: [], writable: true, configurable: true })
    document.body.appendChild(host)
    // MutationObserver 异步派发（happy-dom 需让出一轮微/宏任务）
    await new Promise((r) => setTimeout(r, 0))
    expect(root.adoptedStyleSheets.length, '挂载后应被增量扫描注入').toBe(1)
  })

  it('start 幂等：单文档只挂一个 pointermove（passive）', () => {
    document.documentElement.setAttribute('data-glass', '')
    const add = vi.spyOn(document, 'addEventListener')
    startGlassFluid()
    startGlassFluid()
    const pointerCalls = add.mock.calls.filter(([t]) => t === 'pointermove')
    expect(pointerCalls).toHaveLength(1)
    expect(pointerCalls[0]![2]).toMatchObject({ passive: true })
    add.mockRestore()
  })

  it('非鼠标指针抬起（触屏 tap）→ 经 pointerup 清理高光', async () => {
    document.documentElement.setAttribute('data-glass', '')
    const host = document.createElement('oas-button')
    const root = host.attachShadow({ mode: 'open' }) as ShadowRoot & { adoptedStyleSheets: unknown[] }
    Object.defineProperty(root, 'adoptedStyleSheets', { value: [], writable: true, configurable: true })
    const surface = document.createElement('button')
    surface.getBoundingClientRect = () => ({ left: 100, top: 50, width: 200, height: 100 }) as DOMRect
    root.appendChild(surface)
    document.body.appendChild(host)
    startGlassFluid()
    const move = new Event('pointermove') as Event & {
      composedPath?: () => unknown[]
      clientX?: number
      clientY?: number
    }
    move.composedPath = () => [surface, document.body]
    move.clientX = 150
    move.clientY = 75
    document.dispatchEvent(move)
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    expect(surface.hasAttribute(GLASS_FLUID_ACTIVE_ATTR), 'pointermove 应亮高光').toBe(true)
    const up = new Event('pointerup') as Event & { pointerType?: string }
    up.pointerType = 'touch'
    document.dispatchEvent(up)
    expect(surface.hasAttribute(GLASS_FLUID_ACTIVE_ATTR), 'touch 抬起应清高光').toBe(false)
  })

  it('stop 幂等：清内联变量与标记', () => {
    document.documentElement.setAttribute('data-glass', '')
    const el = document.createElement('div')
    document.body.appendChild(el)
    applyGlassPointer(el, 150, 75)
    startGlassFluid()
    stopGlassFluid()
    stopGlassFluid()
    expect(el.style.getPropertyValue('--oas-glass-px')).toBe('')
    expect(el.hasAttribute(GLASS_FLUID_ACTIVE_ATTR)).toBe(false)
  })
})
