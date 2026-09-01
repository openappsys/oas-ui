import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASSpin } from './index.js'

describe('OASSpin', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染加载指示器，size 默认中号', () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="indicator"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="indicator"]')!.getAttribute('data-size')).toBe(
      'medium',
    )
  })

  it('size 五档：xs/small/medium/large/xl 映射到 data-size', () => {
    for (const s of ['xs', 'small', 'medium', 'large', 'xl'] as const) {
      const el = new OASSpin()
      el.setAttribute('size', s)
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="indicator"]')!.getAttribute('data-size')).toBe(s)
      el.remove()
    }
  })

  it('旧缩写 sm/md/lg 保留别名兼容（归一化为全拼）', () => {
    const map: Array<[string, string]> = [
      ['sm', 'small'],
      ['md', 'medium'],
      ['lg', 'large'],
    ]
    for (const [raw, normalized] of map) {
      const el = new OASSpin()
      el.setAttribute('size', raw)
      document.body.appendChild(el)
      expect(
        el.shadowRoot!.querySelector('[part="indicator"]')!.getAttribute('data-size'),
        `size=${raw}`,
      ).toBe(normalized)
      el.remove()
    }
  })

  it('role=status + aria-busy', () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    expect(indicator.getAttribute('role')).toBe('status')
    expect(el.getAttribute('aria-busy')).toBe('false')
    el.setAttribute('spinning', '')
    expect(el.getAttribute('aria-busy')).toBe('true')
  })

  it('包裹内容时嵌套显示', () => {
    const el = new OASSpin()
    el.setAttribute('spinning', '')
    el.innerHTML = `<p>内容</p>`
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="wrap"]')).not.toBeNull()
  })
})

describe('OASSpin delay 防闪烁', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('spinning 置位后 delay 到期才显示指示器；aria-busy 立即生效', () => {
    vi.useFakeTimers()
    const el = new OASSpin()
    el.setAttribute('delay', '500')
    el.setAttribute('spinning', '')
    document.body.appendChild(el)
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]')!
    expect(wrap.classList.contains('spinning')).toBe(false)
    // aria-busy 是语义状态，不等视觉 delay
    expect(el.getAttribute('aria-busy')).toBe('true')
    vi.advanceTimersByTime(499)
    expect(wrap.classList.contains('spinning')).toBe(false)
    vi.advanceTimersByTime(1)
    expect(wrap.classList.contains('spinning')).toBe(true)
  })

  it('delay 未到期时 spinning 结束则指示器完全不出现', () => {
    vi.useFakeTimers()
    const el = new OASSpin()
    el.setAttribute('delay', '500')
    el.setAttribute('spinning', '')
    document.body.appendChild(el)
    vi.advanceTimersByTime(200)
    el.removeAttribute('spinning')
    vi.advanceTimersByTime(2000)
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]')!
    expect(wrap.classList.contains('spinning')).toBe(false)
    expect(el.getAttribute('aria-busy')).toBe('false')
  })

  it('delay 到期显示后 spinning 结束立即隐藏；再次置位重新计时', () => {
    vi.useFakeTimers()
    const el = new OASSpin()
    el.setAttribute('delay', '300')
    el.setAttribute('spinning', '')
    document.body.appendChild(el)
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]')!
    vi.advanceTimersByTime(300)
    expect(wrap.classList.contains('spinning')).toBe(true)
    el.removeAttribute('spinning')
    expect(wrap.classList.contains('spinning')).toBe(false)
    el.setAttribute('spinning', '')
    expect(wrap.classList.contains('spinning')).toBe(false)
    vi.advanceTimersByTime(300)
    expect(wrap.classList.contains('spinning')).toBe(true)
  })

  it('delay 为 0/负数/非法值时立即显示', () => {
    for (const delay of ['0', '-100', 'abc', '']) {
      const el = new OASSpin()
      el.setAttribute('delay', delay)
      el.setAttribute('spinning', '')
      document.body.appendChild(el)
      const wrap = el.shadowRoot!.querySelector('[part="wrap"]')!
      expect(wrap.classList.contains('spinning'), `delay="${delay}"`).toBe(true)
      el.remove()
    }
  })

  it('无 delay 时 spinning 立即显示（既有行为不破坏）', () => {
    const el = new OASSpin()
    el.setAttribute('spinning', '')
    document.body.appendChild(el)
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]')!
    expect(wrap.classList.contains('spinning')).toBe(true)
  })

  it('断开连接后 delay timer 被清理，不再触发显示', () => {
    vi.useFakeTimers()
    const el = new OASSpin()
    el.setAttribute('delay', '500')
    el.setAttribute('spinning', '')
    document.body.appendChild(el)
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]')!
    el.remove()
    vi.advanceTimersByTime(1000)
    expect(wrap.classList.contains('spinning')).toBe(false)
  })

  it('delay 属性变化在 spinning 期间重新调度（未到期改短立即生效路径）', () => {
    vi.useFakeTimers()
    const el = new OASSpin()
    el.setAttribute('delay', '500')
    el.setAttribute('spinning', '')
    document.body.appendChild(el)
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]')!
    vi.advanceTimersByTime(100)
    el.setAttribute('delay', '50')
    vi.advanceTimersByTime(50)
    expect(wrap.classList.contains('spinning')).toBe(true)
  })
})

describe('OASSpin tip 加载文案', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('tip 属性渲染纯文本到 tip-text；tip 存在时容器标记可见', () => {
    const el = new OASSpin()
    el.setAttribute('tip', '数据加载中')
    document.body.appendChild(el)
    const tip = el.shadowRoot!.querySelector('[part="tip"]')!
    const text = el.shadowRoot!.querySelector('[part="tip-text"]')!
    expect(text.textContent).toBe('数据加载中')
    expect(tip.classList.contains('has-tip')).toBe(true)
  })

  it('无 tip 时容器不占位', () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    const tip = el.shadowRoot!.querySelector('[part="tip"]')!
    expect(tip.classList.contains('has-tip')).toBe(false)
  })

  it('tip 属性更新时文本跟随（textContent 注入不解析 HTML）', () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    el.setAttribute('tip', '<img src=x onerror=alert(1)>')
    const text = el.shadowRoot!.querySelector('[part="tip-text"]')!
    expect(text.textContent).toBe('<img src=x onerror=alert(1)>')
    expect(text.querySelector('img')).toBeNull()
  })

  it('tip 具名插槽分配时优先于属性文本', () => {
    const el = new OASSpin()
    el.setAttribute('tip', '属性文案')
    el.innerHTML = `<b slot="tip">富文案</b>`
    document.body.appendChild(el)
    const tip = el.shadowRoot!.querySelector('[part="tip"]')!
    const text = el.shadowRoot!.querySelector<HTMLElement>('[part="tip-text"]')!
    expect(tip.classList.contains('has-tip')).toBe(true)
    expect(text.hidden).toBe(true)
  })

  it('tip 插槽动态分配经 slotchange 同步可见态', async () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    const tip = el.shadowRoot!.querySelector('[part="tip"]')!
    expect(tip.classList.contains('has-tip')).toBe(false)
    const b = document.createElement('b')
    b.setAttribute('slot', 'tip')
    b.textContent = '后插入的文案'
    el.appendChild(b)
    await new Promise((r) => setTimeout(r, 0))
    expect(tip.classList.contains('has-tip')).toBe(true)
  })

  it('tip-position 四向映射到 body[data-tip-position]，非法值回落 below', () => {
    for (const [raw, expectPos] of [
      ['above', 'above'],
      ['below', 'below'],
      ['before', 'before'],
      ['after', 'after'],
      ['diagonal', 'below'],
    ] as Array<[string, string]>) {
      const el = new OASSpin()
      el.setAttribute('tip', '文案')
      el.setAttribute('tip-position', raw)
      document.body.appendChild(el)
      const body = el.shadowRoot!.querySelector('[part="body"]')!
      expect(body.getAttribute('data-tip-position'), `tip-position=${raw}`).toBe(expectPos)
      el.remove()
    }
  })

  it('hide-icon 隐藏指示器只留文案', () => {
    const el = new OASSpin()
    el.setAttribute('tip', '加载中')
    el.setAttribute('hide-icon', '')
    document.body.appendChild(el)
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]')!
    expect(wrap.classList.contains('hide-icon')).toBe(true)
  })

  it('包裹态 tip 与指示器一起居中显示（body 结构存在）', () => {
    const el = new OASSpin()
    el.setAttribute('spinning', '')
    el.setAttribute('tip', '加载中')
    el.innerHTML = '<p>内容</p>'
    document.body.appendChild(el)
    const body = el.shadowRoot!.querySelector('[part="body"]')!
    expect(body).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="indicator"]')!.parentElement).toBe(body)
  })
})

describe('OASSpin 自定义指示器 icon 插槽', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('icon 插槽分配时进入自定义形态（默认环隐藏）', () => {
    const el = new OASSpin()
    el.innerHTML = '<svg slot="icon" width="24" height="24"></svg>'
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    expect(indicator.classList.contains('custom-icon')).toBe(true)
    expect(el.shadowRoot!.querySelector('slot[name="icon"]')).not.toBeNull()
  })

  it('icon 插槽默认不旋转；rotate 属性开启旋转', () => {
    const el = new OASSpin()
    el.innerHTML = '<svg slot="icon"></svg>'
    document.body.appendChild(el)
    const custom = el.shadowRoot!.querySelector('[part="custom"]')!
    expect(custom.hasAttribute('data-rotate')).toBe(false)
    el.setAttribute('rotate', '')
    expect(custom.hasAttribute('data-rotate')).toBe(true)
  })

  it('icon 插槽动态撤空后回落默认环', async () => {
    const el = new OASSpin()
    const svg = document.createElement('svg')
    svg.setAttribute('slot', 'icon')
    el.appendChild(svg)
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    expect(indicator.classList.contains('custom-icon')).toBe(true)
    svg.remove()
    await new Promise((r) => setTimeout(r, 0))
    expect(indicator.classList.contains('custom-icon')).toBe(false)
  })

  it('rotate 属性对默认环无效（无 icon 插槽时不进入自定义形态）', () => {
    const el = new OASSpin()
    el.setAttribute('rotate', '')
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    expect(indicator.classList.contains('custom-icon')).toBe(false)
  })
})

describe('OASSpin size 任意值', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('纯数字按 px 直取：data-size=custom + 内联宽高', () => {
    const el = new OASSpin()
    el.setAttribute('size', '28')
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector<HTMLElement>('[part="indicator"]')!
    expect(indicator.getAttribute('data-size')).toBe('custom')
    expect(indicator.style.width).toBe('28px')
    expect(indicator.style.height).toBe('28px')
  })

  it('带单位 CSS 值直取：rem / % / vw', () => {
    for (const [raw, css] of [
      ['2.5rem', '2.5rem'],
      ['10%', '10%'],
      ['40vh', '40vh'],
    ] as Array<[string, string]>) {
      const el = new OASSpin()
      el.setAttribute('size', raw)
      document.body.appendChild(el)
      const indicator = el.shadowRoot!.querySelector<HTMLElement>('[part="indicator"]')!
      expect(indicator.style.width, `size=${raw}`).toBe(css)
      el.remove()
    }
  })

  it('calc() 表达式直取', () => {
    const el = new OASSpin()
    el.setAttribute('size', 'calc(100% - 8px)')
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector<HTMLElement>('[part="indicator"]')!
    expect(indicator.style.width).toBe('calc(100% - 8px)')
  })

  it('非法值回落 medium 并 console.warn（同值只警一次）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = new OASSpin()
    el.setAttribute('size', 'abc')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="indicator"]')!.getAttribute('data-size')).toBe(
      'medium',
    )
    el.setAttribute('size', '-20')
    expect(warn).toHaveBeenCalledTimes(2)
    // 同值去重：再设回 abc 不重复警
    el.setAttribute('size', 'abc')
    expect(warn).toHaveBeenCalledTimes(2)
    expect(String(warn.mock.calls[0]![0])).toContain('[oas-spin]')
  })

  it('任意值切回档位时清除内联尺寸', () => {
    const el = new OASSpin()
    el.setAttribute('size', '28')
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector<HTMLElement>('[part="indicator"]')!
    expect(indicator.style.width).toBe('28px')
    el.setAttribute('size', 'large')
    expect(indicator.getAttribute('data-size')).toBe('large')
    expect(indicator.style.width).toBe('')
    expect(indicator.style.height).toBe('')
  })

  it('空字符串视为缺省不告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = new OASSpin()
    el.setAttribute('size', '')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="indicator"]')!.getAttribute('data-size')).toBe(
      'medium',
    )
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('OASSpin CSS 变量开口与属性级视觉开关', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('STYLE 暴露组件级 CSS 变量：指示色/轨道色/线宽/时长/遮罩背景', () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('--oas-spin-indicator-color')
    expect(css).toContain('--oas-spin-track-color')
    expect(css).toContain('--oas-spin-border-width')
    expect(css).toContain('--oas-spin-duration')
    expect(css).toContain('--oas-spin-mask-bg')
  })

  it('inherit-color 属性级开关：指示色继承宿主文字色（currentcolor 规则存在）', () => {
    const el = new OASSpin()
    el.setAttribute('inherit-color', '')
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(':host([inherit-color])')
    expect(css).toContain('currentcolor')
  })

  it('block 块级：:host([block]) 规则存在', () => {
    const el = new OASSpin()
    el.setAttribute('block', '')
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(':host([block])')
  })

  it('show-overlay 默认开；"false" 关闭包裹遮罩（no-overlay class）', () => {
    const el = new OASSpin()
    el.setAttribute('spinning', '')
    el.innerHTML = '<p>内容</p>'
    document.body.appendChild(el)
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]')!
    expect(wrap.classList.contains('no-overlay')).toBe(false)
    el.setAttribute('show-overlay', 'false')
    expect(wrap.classList.contains('no-overlay')).toBe(true)
    el.setAttribute('show-overlay', 'true')
    expect(wrap.classList.contains('no-overlay')).toBe(false)
  })
})

describe('OASSpin 读屏可读文本与 reduced-motion', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('indicator 内置视觉隐藏读屏文本：默认走 locale 兜底文案', () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    const label = el.shadowRoot!.querySelector('[part="label"]')!
    expect(label.textContent).not.toBe('')
    // 兜底文案来自 locale registry（loading.loading，注入的 zh 翻译器生效）
    expect(el.shadowRoot!.textContent).toContain(el.shadowRoot!.textContent!.match(/加载中|Loading|loading\.loading/)![0])
  })

  it('tip 属性时读屏文本读 tip', () => {
    const el = new OASSpin()
    el.setAttribute('tip', '正在同步数据')
    document.body.appendChild(el)
    const label = el.shadowRoot!.querySelector('[part="label"]')!
    expect(label.textContent).toBe('正在同步数据')
  })

  it('tip 具名插槽分配时读屏文本读插槽内容', () => {
    const el = new OASSpin()
    el.innerHTML = '<span slot="tip">富文案内容</span>'
    document.body.appendChild(el)
    const label = el.shadowRoot!.querySelector('[part="label"]')!
    expect(label.textContent).toBe('富文案内容')
  })

  it('宿主 aria-label 优先同步到 indicator 的可访问名', () => {
    const el = new OASSpin()
    el.setAttribute('aria-label', '页面内容加载中')
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    expect(indicator.getAttribute('aria-label')).toBe('页面内容加载中')
    el.removeAttribute('aria-label')
    expect(indicator.hasAttribute('aria-label')).toBe(false)
  })

  it('prefers-reduced-motion 降级：动画停用规则存在', () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('prefers-reduced-motion')
  })

  it('读屏文本容器视觉隐藏（vh class）但保留在可访问树', () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    const label = el.shadowRoot!.querySelector('[part="label"]')!
    expect(label.className).toBe('vh')
  })
})

describe('OASSpin fullscreen 全屏模式', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('fullscreen 属性：fixed 全屏规则与 z-index 变量开口存在', () => {
    const el = new OASSpin()
    el.setAttribute('fullscreen', '')
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(':host([fullscreen])')
    expect(css).toContain('--oas-spin-z-index')
  })

  it('OASSpin.fullscreen() 命令式：挂载全屏实例，close() 移除', () => {
    const handle = OASSpin.fullscreen()
    const el = document.body.querySelector('oas-spin:last-child') as OASSpin
    expect(el).not.toBeNull()
    expect(el.hasAttribute('fullscreen')).toBe(true)
    expect(el.hasAttribute('spinning')).toBe(true)
    handle.close()
    expect(el.isConnected).toBe(false)
  })

  it('OASSpin.fullscreen() 透传 tip 与 delay', () => {
    const handle = OASSpin.fullscreen({ tip: '全屏加载中', delay: 300 })
    const el = document.body.querySelector('oas-spin:last-child') as OASSpin
    expect(el.getAttribute('tip')).toBe('全屏加载中')
    expect(el.getAttribute('delay')).toBe('300')
    handle.close()
  })
})

describe('OASSpin variant 形态变体', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('variant=dot：data-variant 标记 + 三点结构存在', () => {
    const el = new OASSpin()
    el.setAttribute('variant', 'dot')
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    expect(indicator.getAttribute('data-variant')).toBe('dot')
    expect(el.shadowRoot!.querySelector('[part="dots"]')!.children.length).toBe(3)
  })

  it('variant=bars：data-variant 标记 + 三条结构存在', () => {
    const el = new OASSpin()
    el.setAttribute('variant', 'bars')
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    expect(indicator.getAttribute('data-variant')).toBe('bars')
    expect(el.shadowRoot!.querySelector('[part="bars"]')!.children.length).toBe(3)
  })

  it('默认 ring；非法值回落 ring 并告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = new OASSpin()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="indicator"]')!.getAttribute('data-variant')).toBe(
      'ring',
    )
    el.setAttribute('variant', 'wave')
    expect(el.shadowRoot!.querySelector('[part="indicator"]')!.getAttribute('data-variant')).toBe(
      'ring',
    )
    expect(warn).toHaveBeenCalledTimes(1)
    el.setAttribute('variant', 'wave')
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('dot/bars 动画规则与错峰节奏存在（transform/opacity 动画）', () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('@keyframes oas-spin-dot')
    expect(css).toContain('@keyframes oas-spin-bar')
    // 错峰：第二/三个元素带 animation-delay
    expect(css).toMatch(/\.dots i:nth-child\(2\)/)
    expect(css).toMatch(/\.bars i:nth-child\(3\)/)
  })

  it('inherit-color 同样覆盖 dot/bars 形态颜色', () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/inherit-color[\s\S]*\.dots i/)
    expect(css).toMatch(/inherit-color[\s\S]*\.bars i/)
  })

  it('reduced-motion 降级同样停用 dot/bars 动画', () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion'))
    expect(reduced).toContain('.dots i')
    expect(reduced).toContain('.bars i')
  })
})

describe('OASSpin percent determinate 进度', () => {
  const C = 2 * Math.PI * 21

  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('percent=40：role=progressbar + aria 三件套 + SVG 环 dashoffset', () => {
    const el = new OASSpin()
    el.setAttribute('percent', '40')
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    const bar = el.shadowRoot!.querySelector('[part="progress-bar"]') as SVGCircleElement
    expect(indicator.getAttribute('role')).toBe('progressbar')
    expect(indicator.getAttribute('aria-valuemin')).toBe('0')
    expect(indicator.getAttribute('aria-valuemax')).toBe('100')
    expect(indicator.getAttribute('aria-valuenow')).toBe('40')
    expect(indicator.classList.contains('determinate')).toBe(true)
    expect(bar.getAttribute('stroke-dasharray')).not.toBeNull()
    expect(Number(bar.getAttribute('stroke-dashoffset'))).toBeCloseTo(C * 0.6, 3)
  })

  it('移除 percent 回落 indeterminate（role=status、aria-value 移除）', () => {
    const el = new OASSpin()
    el.setAttribute('percent', '40')
    document.body.appendChild(el)
    el.removeAttribute('percent')
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    expect(indicator.getAttribute('role')).toBe('status')
    expect(indicator.hasAttribute('aria-valuenow')).toBe(false)
    expect(indicator.classList.contains('determinate')).toBe(false)
  })

  it('percent 越界夹取 0-100', () => {
    for (const [raw, now] of [
      ['150', '100'],
      ['-10', '0'],
    ] as Array<[string, string]>) {
      const el = new OASSpin()
      el.setAttribute('percent', raw)
      document.body.appendChild(el)
      expect(
        el.shadowRoot!.querySelector('[part="indicator"]')!.getAttribute('aria-valuenow'),
        `percent=${raw}`,
      ).toBe(now)
      el.remove()
    }
  })

  it('percent 非法值忽略并告警一次（回落 indeterminate）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = new OASSpin()
    el.setAttribute('percent', 'abc')
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    expect(indicator.getAttribute('role')).toBe('status')
    expect(warn).toHaveBeenCalledTimes(1)
    el.setAttribute('percent', 'abc')
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('icon 插槽优先于 percent（不进 determinate 形态）', () => {
    const el = new OASSpin()
    el.setAttribute('percent', '40')
    el.innerHTML = '<svg slot="icon"></svg>'
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    expect(indicator.classList.contains('custom-icon')).toBe(true)
    expect(indicator.classList.contains('determinate')).toBe(false)
  })

  it("percent='auto'：激活后自动推进且上限 90，结束后复位（再次激活从头推进）", () => {
    vi.useFakeTimers()
    const el = new OASSpin()
    el.setAttribute('percent', 'auto')
    el.setAttribute('spinning', '')
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    const now = () => Number(indicator.getAttribute('aria-valuenow') ?? '-1')
    expect(now()).toBeLessThanOrEqual(0)
    vi.advanceTimersByTime(600)
    expect(now()).toBeGreaterThan(0)
    for (let i = 0; i < 100; i++) vi.advanceTimersByTime(500)
    expect(now()).toBeLessThanOrEqual(90)
    // spinning 结束：停表并复位（再次激活从头推进，不接续 90）
    el.removeAttribute('spinning')
    vi.advanceTimersByTime(3000)
    el.setAttribute('spinning', '')
    vi.advanceTimersByTime(600)
    const restarted = now()
    expect(restarted).toBeGreaterThan(0)
    expect(restarted).toBeLessThan(90)
  })

  it("percent='auto' 未 spinning 时不推进", () => {
    vi.useFakeTimers()
    const el = new OASSpin()
    el.setAttribute('percent', 'auto')
    document.body.appendChild(el)
    vi.advanceTimersByTime(3000)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    expect(indicator.getAttribute('aria-valuenow') ?? '-1').toBe('-1')
  })

  it('SVG 进度环样式：变量开口 + inherit-color 覆盖', () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('.progress .progress-bar')
    expect(css).toMatch(/inherit-color[\s\S]*\.progress-bar/)
    expect(css).toContain('stroke-dashoffset')
  })
})

describe('OASSpin paused 暂停动画', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('paused 属性冻结一切循环动画（animation-play-state，保留当前帧）', () => {
    const el = new OASSpin()
    el.setAttribute('paused', '')
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(':host([paused])')
    const pausedBlock = css.slice(css.indexOf(':host([paused])'))
    expect(pausedBlock).toContain('animation-play-state: paused')
    // 覆盖全部动画载体：默认环 / 自定义旋转 / dot / bars
    expect(
      pausedBlock.includes('.indicator') &&
        pausedBlock.includes('[data-rotate]') &&
        pausedBlock.includes('.dots i') &&
        pausedBlock.includes('.bars i'),
    ).toBe(true)
  })
})

describe('OASSpin 全局默认指示器 setDefaultIndicator', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    OASSpin.setDefaultIndicator(null)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    OASSpin.setDefaultIndicator(null)
  })

  it('注册后新实例渲染全局默认指示器（global-icon 形态）', () => {
    OASSpin.setDefaultIndicator('<b class="brand-mark">◉</b>')
    const el = new OASSpin()
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    const g = el.shadowRoot!.querySelector('[part="global-icon"]')!
    expect(g.innerHTML).toContain('brand-mark')
    expect(indicator.classList.contains('global-icon')).toBe(true)
  })

  it('icon 插槽分配优先于全局默认指示器', () => {
    OASSpin.setDefaultIndicator('<b class="brand-mark">◉</b>')
    const el = new OASSpin()
    el.innerHTML = '<svg slot="icon"></svg>'
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    expect(indicator.classList.contains('custom-icon')).toBe(true)
    expect(indicator.classList.contains('global-icon')).toBe(false)
  })

  it('置 null 恢复内置环（后续新实例不再带全局标记）', () => {
    OASSpin.setDefaultIndicator('<b>x</b>')
    OASSpin.setDefaultIndicator(null)
    const el = new OASSpin()
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    expect(indicator.classList.contains('global-icon')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="global-icon"]')).toBeNull()
  })

  it('rotate 属性同样作用于全局默认指示器', () => {
    OASSpin.setDefaultIndicator('<b>x</b>')
    const el = new OASSpin()
    el.setAttribute('rotate', '')
    document.body.appendChild(el)
    const custom = el.shadowRoot!.querySelector('[part="custom"]')!
    expect(custom.hasAttribute('data-rotate')).toBe(true)
  })
})
