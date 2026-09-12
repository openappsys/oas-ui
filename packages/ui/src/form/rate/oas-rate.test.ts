import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASRate } from './index.js'

function mount(attrs: Record<string, string> = {}): OASRate {
  const el = new OASRate()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function stars(el: OASRate): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('.star')] as HTMLElement[]
}

function sliderOf(el: OASRate): HTMLElement {
  return el.shadowRoot!.querySelector('.slider') as HTMLElement
}

function textOf(el: OASRate): HTMLElement {
  return el.shadowRoot!.querySelector('.text') as HTMLElement
}

/** mock 星形矩形（半区判定/hover 预览/拖拽取值均依赖 getBoundingClientRect） */
function rectAt(el: HTMLElement, left: number, width: number): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left,
    top: 0,
    right: left + width,
    bottom: 20,
    width,
    height: 20,
    x: left,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
}

describe('OASRate', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认 5 颗星，value 驱动选中数', async () => {
    const el = mount({ value: '3' })
    await Promise.resolve()
    expect(stars(el).length).toBe(5)
    expect(stars(el).filter((s) => s.classList.contains('active')).length).toBe(3)
  })

  it('value 受控同步 + 外部变更增量更新', () => {
    const el = mount({ value: '2' })
    el.setAttribute('value', '4')
    expect(stars(el).filter((s) => s.classList.contains('active')).length).toBe(4)
  })

  it('点击星星设置评分并派发 oas-change', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    stars(el)[3]!.click()
    expect(detail).toEqual({ value: 4 })
    expect(el.getAttribute('value')).toBe('4')
  })

  it('键盘方向键调节评分（role=slider）', () => {
    const el = mount({ value: '3' })
    const host = el.shadowRoot!.querySelector('[role="slider"]')!
    expect(host.getAttribute('aria-valuenow')).toBe('3')
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(host.getAttribute('aria-valuenow')).toBe('4')
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(host.getAttribute('aria-valuenow')).toBe('3')
  })

  it('disabled 时点击无效', () => {
    const el = mount({ disabled: '', value: '1' })
    stars(el)[4]!.click()
    expect(el.getAttribute('value')).toBe('1')
  })

  it('allow-clear 默认开启：点击当前已选中的同一颗星清空为 0', () => {
    const el = mount({ value: '4' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    stars(el)[3]!.click()
    expect(detail).toEqual({ value: 0 })
    expect(el.getAttribute('value')).toBe('0')
  })

  it('allow-clear 下点击其他星仍正常设值', () => {
    const el = mount({ value: '3' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    stars(el)[4]!.click()
    expect(detail).toEqual({ value: 5 })
    expect(el.getAttribute('value')).toBe('5')
  })

  it('allow-clear="false" 时点击已选中的星不清空', () => {
    const el = mount({ value: '4', 'allow-clear': 'false' })
    let emitted = false
    el.addEventListener('oas-change', () => (emitted = true))
    stars(el)[3]!.click()
    expect(el.getAttribute('value')).toBe('4')
    expect(emitted).toBe(false)
  })

  it('半值时点击半星所在星同样清空', () => {
    const el = mount({ value: '3.5', 'allow-half': '' })
    stars(el)[3]!.click() // 第 4 颗星（承载半星）
    expect(el.getAttribute('value')).toBe('0')
  })

  it('icon 属性自定义字符图标', () => {
    const el = mount({ icon: '♥', value: '3' })
    const s = stars(el)
    expect(s.length).toBe(5)
    for (const star of s) expect(star.textContent?.trim()).toBe('♥')
  })

  it('icon 属性支持 SVG 标记', () => {
    const el = mount({ icon: "<svg viewBox='0 0 16 16'></svg>" })
    expect(stars(el)[0]!.querySelector('svg')).not.toBeNull()
  })

  it('slot 自定义图标克隆到每颗星', async () => {
    const el = new OASRate()
    el.innerHTML = `<span slot="icon">★</span>`
    document.body.appendChild(el)
    await new Promise((r) => setTimeout(r, 0))
    const s = stars(el)
    expect(s.length).toBe(5)
    for (const star of s) expect(star.textContent?.trim()).toBe('★')
  })

  // —— 半选视觉（缺陷 9 回归）——
  // 半星 = 左半激活色（warning）+ 右半未激活色：由 .half-fill 覆盖层 + clip-path 垂直分割实现，
  // 替代旧「整星 opacity:0.5」实现。

  it('半选：半星渲染左半激活覆盖层（half-fill + clip-path 垂直分割），非透明度淡化', () => {
    const el = mount({ value: '2.5', 'allow-half': '' })
    const s = stars(el)
    // 2.5 = 两颗全黄 + 一颗半黄半灰 + 两颗全灰
    expect(s.filter((st) => st.classList.contains('active')).length).toBe(2)
    const half = s[2]!
    expect(half.classList.contains('half')).toBe(true)
    // 旧实现已移除：不再用 inline opacity 0.5
    expect(half.style.opacity).toBe('')
    const fill = half.querySelector<HTMLElement>('.half-fill')
    expect(fill).not.toBeNull()
    expect(fill!.getAttribute('aria-hidden')).toBe('true')
    expect(fill!.querySelector('svg')).not.toBeNull() // 覆盖层与基础星同图标
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    // 垂直分割保留左半 + 覆盖层用激活色（color/void-color/colors 通道经 --oas-rate-active 变量注入）
    expect(css).toMatch(/\.half-fill\s*\{[^}]*clip-path:\s*inset\(0\s+50%\s+0\s+0\)/)
    expect(css).toMatch(/\.half-fill\s*\{[^}]*color:\s*var\(--oas-rate-active,\s*var\(--oas-color-warning\)\)/)
    expect(css).toMatch(/\.star\s*\{[^}]*position:\s*relative/)
    // 未到半星的星没有覆盖层
    expect(s[3]!.querySelector('.half-fill')).toBeNull()
    expect(s[4]!.querySelector('.half-fill')).toBeNull()
  })

  it('半选：整数值/非半选模式不渲染 half-fill，值变化增量增删', () => {
    const el = mount({ value: '2.5', 'allow-half': '' })
    const s = stars(el)
    expect(s[2]!.querySelector('.half-fill')).not.toBeNull()
    // 值变回整数 → 覆盖层移除
    el.setAttribute('value', '3')
    expect(s[2]!.classList.contains('half')).toBe(false)
    expect(s[2]!.querySelector('.half-fill')).toBeNull()
    // 再变回半值 → 覆盖层重新出现
    el.setAttribute('value', '3.5')
    expect(s[3]!.classList.contains('half')).toBe(true)
    expect(s[3]!.querySelector('.half-fill')).not.toBeNull()
    // 非半选模式下半值按整星计，无覆盖层
    el.removeAttribute('allow-half')
    el.setAttribute('value', '2.5')
    expect(s[2]!.querySelector('.half-fill')).toBeNull()
  })

  it('半选：自定义 icon 同样有半选覆盖层（克隆当前图标）', () => {
    const el = mount({ value: '2.5', 'allow-half': '', icon: '♥' })
    const half = stars(el)[2]!
    const fill = half.querySelector<HTMLElement>('.half-fill')
    expect(fill).not.toBeNull()
    expect(fill!.textContent?.trim()).toBe('♥')
  })
})

describe('OASRate 能力补齐', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  // —— allow-half 交互化：半区点击 + 键盘 0.5 步进 ——

  it('allow-half：点击星左半区设半星值、右半区设整星值', () => {
    const el = mount({ 'allow-half': '' })
    const s = stars(el)
    rectAt(s[2]!, 100, 20)
    s[2]!.dispatchEvent(new MouseEvent('click', { clientX: 105 })) // 左半区
    expect(el.getAttribute('value')).toBe('2.5')
    s[2]!.dispatchEvent(new MouseEvent('click', { clientX: 115 })) // 右半区
    expect(el.getAttribute('value')).toBe('3')
  })

  it('allow-half：键盘方向键按 0.5 步进，Home/End 不受影响', () => {
    const el = mount({ 'allow-half': '', value: '3' })
    const host = el.shadowRoot!.querySelector('[role="slider"]')!
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.getAttribute('value')).toBe('3.5')
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(el.getAttribute('value')).toBe('3')
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    expect(el.getAttribute('value')).toBe('5')
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    expect(el.getAttribute('value')).toBe('0')
  })

  it('allow-half：半值点击同一半区且 allow-clear 开启时清空', () => {
    const el = mount({ 'allow-half': '', value: '2.5' })
    const s = stars(el)
    rectAt(s[2]!, 100, 20)
    s[2]!.dispatchEvent(new MouseEvent('click', { clientX: 105 })) // 2.5 === 2.5 → 清空
    expect(el.getAttribute('value')).toBe('0')
  })

  // —— hover 填充预览 + oas-hover 事件 ——

  it('hover 预览：悬停星星填充预览但不提交 value，派发 oas-hover', () => {
    const el = mount({ value: '1' })
    let detail: unknown
    el.addEventListener('oas-hover', (e: Event) => (detail = (e as CustomEvent).detail))
    stars(el)[3]!.dispatchEvent(new MouseEvent('mouseenter', { clientX: 0 }))
    // 预览视觉：4 颗激活；值不提交
    expect(stars(el).filter((s) => s.classList.contains('active')).length).toBe(4)
    expect(el.getAttribute('value')).toBe('1')
    expect(detail).toEqual({ value: 4 })
  })

  it('hover 预览：allow-half 下按半区预览 0.5 粒度（mousemove 重算）', () => {
    const el = mount({ 'allow-half': '', value: '1' })
    const s = stars(el)
    rectAt(s[3]!, 100, 20)
    const seen: number[] = []
    el.addEventListener('oas-hover', (e: Event) => seen.push((e as CustomEvent).detail.value))
    s[3]!.dispatchEvent(new MouseEvent('mousemove', { clientX: 105 }))
    expect(seen).toEqual([3.5])
    expect(stars(el).filter((x) => x.classList.contains('active')).length).toBe(3) // 3 预览
    expect(s[3]!.classList.contains('half')).toBe(true)
    s[3]!.dispatchEvent(new MouseEvent('mousemove', { clientX: 115 }))
    expect(seen).toEqual([3.5, 4])
    expect(stars(el).filter((x) => x.classList.contains('active')).length).toBe(4) // 4 预览
    expect(s[3]!.classList.contains('half')).toBe(false)
  })

  it('hover 预览：移出组件派发 oas-hover { value: null } 并回落原值显示', () => {
    const el = mount({ value: '2' })
    const seen: unknown[] = []
    el.addEventListener('oas-hover', (e: Event) => seen.push((e as CustomEvent).detail))
    stars(el)[4]!.dispatchEvent(new MouseEvent('mouseenter', { clientX: 0 }))
    sliderOf(el).dispatchEvent(new MouseEvent('mouseleave'))
    expect(seen[1]).toEqual({ value: null })
    expect(stars(el).filter((s) => s.classList.contains('active')).length).toBe(2)
  })

  it('disabled / readonly 下无 hover 预览与事件', () => {
    const dis = mount({ disabled: '', value: '1' })
    let fired = false
    dis.addEventListener('oas-hover', () => (fired = true))
    stars(dis)[3]!.dispatchEvent(new MouseEvent('mouseenter', { clientX: 0 }))
    expect(fired).toBe(false)
    expect(stars(dis).filter((s) => s.classList.contains('active')).length).toBe(1)

    const ro = mount({ readonly: '', value: '1' })
    let fired2 = false
    ro.addEventListener('oas-hover', () => (fired2 = true))
    stars(ro)[3]!.dispatchEvent(new MouseEvent('mouseenter', { clientX: 0 }))
    expect(fired2).toBe(false)
    expect(stars(ro).filter((s) => s.classList.contains('active')).length).toBe(1)
  })

  // —— readonly（独立于 disabled）——

  it('readonly：点击与键盘均不可改值，值保留', () => {
    const el = mount({ readonly: '', value: '3' })
    stars(el)[4]!.click()
    const host = el.shadowRoot!.querySelector('[role="slider"]')!
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.getAttribute('value')).toBe('3')
  })

  it('readonly：不变灰（无 data-disabled）、data-readonly 镜像、aria-readonly 同步', () => {
    const el = mount({ readonly: '', value: '3' })
    expect(el.hasAttribute('data-disabled')).toBe(false)
    expect(el.hasAttribute('data-readonly')).toBe(true)
    const host = el.shadowRoot!.querySelector('[role="slider"]')!
    expect(host.getAttribute('aria-readonly')).toBe('true')
    el.removeAttribute('readonly')
    expect(el.hasAttribute('data-readonly')).toBe(false)
    expect(host.hasAttribute('aria-readonly')).toBe(false)
  })

  it('readonly：任意小数展示（3.7 → 第 4 星 70% 宽覆盖层）', () => {
    const el = mount({ readonly: '', value: '3.7' })
    const s = stars(el)
    expect(s.filter((x) => x.classList.contains('active')).length).toBe(3)
    const fill = s[3]!.querySelector<HTMLElement>('.half-fill')
    expect(fill).not.toBeNull()
    expect(fill!.style.clipPath).toBe('inset(0 30% 0 0)')
  })

  it('非 allow-half 非 readonly 下小数值仍按整星（floor）展示', () => {
    const el = mount({ value: '3.7' })
    const s = stars(el)
    expect(s.filter((x) => x.classList.contains('active')).length).toBe(3)
    expect(s[3]!.querySelector('.half-fill')).toBeNull()
  })

  // —— size 档位 ——

  it('size 档位：data-size 镜像到宿主，CSS 有档位规则与 --oas-rate-star-size 变量', () => {
    const small = mount({ size: 'small' })
    expect(small.getAttribute('data-size')).toBe('small')
    const large = mount({ size: 'large' })
    expect(large.getAttribute('data-size')).toBe('large')
    const css = small.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toMatch(/--oas-rate-star-size:\s*20px/) // medium 默认
    expect(css).toMatch(/:host\(\[data-size='small'\]\)/)
    expect(css).toMatch(/:host\(\[data-size='large'\]\)/)
    expect(css).toMatch(/\.star\s*\{[^}]*font-size:\s*var\(--oas-rate-star-size\)/)
  })

  it('size 非法值回落 medium + console.warn 一次（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ size: 'huge' })
    expect(el.getAttribute('data-size')).toBe('medium')
    el.setAttribute('size', 'huge')
    el.setAttribute('size', 'tiny')
    expect(warn).toHaveBeenCalledTimes(2) // huge 一次 + tiny 一次
    expect(warn.mock.calls[0]![0]).toContain('huge')
  })

  // —— color / void-color / colors 分段阈值色 ——

  it('color：预设名映射 --oas-preset-*，任意 CSS 色值直注入 --oas-rate-active', () => {
    const el = mount({ color: 'red', value: '3' })
    expect(el.style.getPropertyValue('--oas-rate-active')).toBe('var(--oas-preset-red)')
    el.setAttribute('color', '#ff6b00')
    expect(el.style.getPropertyValue('--oas-rate-active')).toBe('#ff6b00')
    el.removeAttribute('color')
    expect(el.style.getPropertyValue('--oas-rate-active')).toBe('')
  })

  it('void-color：注入 --oas-rate-void，移除后回落', () => {
    const el = mount({ 'void-color': 'var(--oas-color-text-secondary)' })
    expect(el.style.getPropertyValue('--oas-rate-void')).toBe('var(--oas-color-text-secondary)')
    el.removeAttribute('void-color')
    expect(el.style.getPropertyValue('--oas-rate-void')).toBe('')
  })

  it('colors JSON 属性：按分值均分分段变色，跟随显示值（hover 预览联动）', () => {
    const el = mount({ value: '1', colors: '["red","gold","green"]' })
    expect(el.style.getPropertyValue('--oas-rate-active')).toBe('var(--oas-preset-red)')
    el.setAttribute('value', '5')
    expect(el.style.getPropertyValue('--oas-rate-active')).toBe('var(--oas-preset-green)')
    // hover 预览联动分段色（max=5 三段边界 1.67/3.33：星 1 → red，星 4 → green）
    stars(el)[0]!.dispatchEvent(new MouseEvent('mouseenter', { clientX: 0 }))
    expect(el.style.getPropertyValue('--oas-rate-active')).toBe('var(--oas-preset-red)')
    stars(el)[3]!.dispatchEvent(new MouseEvent('mouseenter', { clientX: 0 }))
    expect(el.style.getPropertyValue('--oas-rate-active')).toBe('var(--oas-preset-green)')
    sliderOf(el).dispatchEvent(new MouseEvent('mouseleave'))
    expect(el.style.getPropertyValue('--oas-rate-active')).toBe('var(--oas-preset-green)')
  })

  it('colors property 通道与非法 JSON 回落', () => {
    const el = mount({ colors: '["red","gold","green"]' })
    el.colors = ['blue', 'lime']
    el.setAttribute('value', '5')
    expect(el.style.getPropertyValue('--oas-rate-active')).toBe('var(--oas-preset-lime)')
    // property 置 null → 回落 colors 属性通道
    el.colors = null
    expect(el.style.getPropertyValue('--oas-rate-active')).toBe('var(--oas-preset-green)')
    // 属性也移除 → 回落 color 属性/默认（无注入）
    el.removeAttribute('colors')
    expect(el.style.getPropertyValue('--oas-rate-active')).toBe('')
    const bad = mount({ colors: '{oops}' })
    expect(bad.style.getPropertyValue('--oas-rate-active')).toBe('')
  })

  // —— texts + show-text / show-score ——

  it('show-text + texts：右侧显示当前分文案（半值取 ceil 档），空态为空', () => {
    const el = mount({
      value: '3',
      'show-text': '',
      texts: '极差,失望,一般,满意,惊喜',
    })
    expect(textOf(el).textContent).toBe('一般')
    el.setAttribute('value', '3.5')
    el.setAttribute('allow-half', '')
    expect(textOf(el).textContent).toBe('满意')
    el.setAttribute('value', '0')
    expect(textOf(el).textContent).toBe('')
  })

  it('show-text：texts 缺省时不显示文案', () => {
    const el = mount({ value: '3', 'show-text': '' })
    expect(textOf(el).textContent).toBe('')
  })

  it('show-score：score-template {value} 占位渲染，优先于 show-text', () => {
    const el = mount({
      value: '3.5',
      'allow-half': '',
      'show-score': '',
      'score-template': '{value} 分',
      'show-text': '',
      texts: '极差,失望,一般,满意,惊喜',
    })
    expect(textOf(el).textContent).toBe('3.5 分')
    // 移除 show-score 后回落 show-text
    el.removeAttribute('show-score')
    expect(textOf(el).textContent).toBe('满意')
  })

  it('texts 提供时 aria-valuetext 同步当前分文案', () => {
    const el = mount({ value: '2', texts: '极差,失望,一般,满意,惊喜' })
    const host = el.shadowRoot!.querySelector('[role="slider"]')!
    expect(host.getAttribute('aria-valuetext')).toBe('失望')
  })

  // —— void-icon 双态图标 ——

  it('void-icon 属性：未选中星用 void 图标、选中星用 icon 图标', () => {
    const el = mount({ value: '2', icon: '❤', 'void-icon': '♡' })
    const s = stars(el)
    expect(s[0]!.textContent?.trim()).toBe('❤')
    expect(s[1]!.textContent?.trim()).toBe('❤')
    expect(s[2]!.textContent?.trim()).toBe('♡')
    expect(s[4]!.textContent?.trim()).toBe('♡')
  })

  it('void-icon：半星基座为 void 图标、覆盖层为选中态图标', () => {
    const el = mount({ value: '2.5', 'allow-half': '', icon: '❤', 'void-icon': '♡' })
    const half = stars(el)[2]!
    expect(half.textContent?.trim()).toContain('♡')
    const fill = half.querySelector<HTMLElement>('.half-fill')
    expect(fill!.textContent?.trim()).toBe('❤')
  })

  it('slot="void-icon"：克隆到未选中星', async () => {
    const el = new OASRate()
    el.innerHTML = `<span slot="void-icon">○</span>`
    document.body.appendChild(el)
    await new Promise((r) => setTimeout(r, 0))
    const s = stars(el)
    expect(s[0]!.textContent?.trim()).toBe('○')
    expect(s[4]!.textContent?.trim()).toBe('○')
    el.setAttribute('value', '5')
    expect(s[0]!.textContent?.trim()).not.toBe('○') // 全选后回选中态图标
  })

  // —— icons 逐值自定义符号 + slot="icon-N" ——

  it('icons JSON 属性：每颗星渲染对应符号', () => {
    const el = mount({ value: '3', icons: '["😡","😠","😐","🙂","😍"]' })
    const s = stars(el)
    expect(s.map((x) => x.textContent?.trim())).toEqual(['😡', '😠', '😐', '🙂', '😍'])
  })

  it('icons property 通道', () => {
    const el = mount({ value: '3' })
    el.icons = ['😞', '😞', '😐', '😄', '😄']
    const s = stars(el)
    expect(s.map((x) => x.textContent?.trim())).toEqual(['😞', '😞', '😐', '😄', '😄'])
  })

  it('icons/colors property 收到非数组（宿主误绑字符串）静默回落属性通道', () => {
    const el = mount({ icons: '["a","b","c","d","e"]' })
    // @ts-expect-error 模拟宿主框架误把字符串绑到 property
    el.icons = '["x"]'
    expect(stars(el)[0]!.textContent?.trim()).toBe('a')
    const c = mount({ value: '5', colors: '["red","gold","green"]' })
    // @ts-expect-error 同上
    c.colors = 'oops'
    expect(c.style.getPropertyValue('--oas-rate-active')).toBe('var(--oas-preset-green)')
  })

  it('slot="icon-N" 逐位插槽：每颗星投影对应内容（声明式通道）', async () => {
    const emojis = ['😡', '😠', '😐', '🙂', '😍']
    const el = new OASRate()
    el.innerHTML = emojis.map((e, i) => `<span slot="icon-${i + 1}">${e}</span>`).join('')
    document.body.appendChild(el)
    await new Promise((r) => setTimeout(r, 0))
    const s = stars(el)
    // slot 投影不改变 star.textContent（投影属渲染层）：用 assignedNodes 断言真实投影关系
    for (let i = 1; i <= 5; i++) {
      const slot = s[i - 1]!.querySelector<HTMLSlotElement>(`slot[name="icon-${i}"]`)
      expect(slot, `第 ${i} 星应有逐位插槽`).not.toBeNull()
      expect(slot!.assignedNodes().map((n) => n.textContent)).toEqual([emojis[i - 1]])
    }
    // 值变化后逐位插槽仍稳定（applyIcons 幂等重写不丢投影）
    el.setAttribute('value', '5')
    for (let i = 1; i <= 5; i++) {
      const slot = s[i - 1]!.querySelector<HTMLSlotElement>(`slot[name="icon-${i}"]`)
      expect(slot).not.toBeNull()
      expect(slot!.assignedNodes().length).toBe(1)
    }
  })

  it('icons 逐值优先级高于 icon 属性与 slot="icon"', async () => {
    const el = new OASRate()
    el.innerHTML = `<span slot="icon">★</span>`
    el.setAttribute('icons', '["a","b","c","d","e"]')
    document.body.appendChild(el)
    await new Promise((r) => setTimeout(r, 0))
    expect(stars(el)[0]!.textContent?.trim()).toBe('a')
  })

  // —— highlight-selected-only ——

  it('highlight-selected-only：仅高亮选中那颗星', () => {
    const el = mount({ value: '3', 'highlight-selected-only': '' })
    const s = stars(el)
    expect(s.filter((x) => x.classList.contains('active')).length).toBe(1)
    expect(s[2]!.classList.contains('active')).toBe(true)
    // 半值：选中星按半星渲染（ceil(2.5)=3 → 第 3 颗星半星）
    el.setAttribute('allow-half', '')
    el.setAttribute('value', '2.5')
    expect(s[2]!.classList.contains('half')).toBe(true)
    expect(s.filter((x) => x.classList.contains('active')).length).toBe(0)
  })

  // —— tooltips 逐星提示（oas-tooltip 浅集成）——

  it('tooltips：hover 星时浅集成 oas-tooltip（virtual 点定位）按星开合', () => {
    const el = mount({ tooltips: '差,一般,好,很好,非常好' })
    const s = stars(el)
    s[1]!.dispatchEvent(new MouseEvent('mouseenter', { clientX: 10 }))
    const tip = el.shadowRoot!.querySelector('oas-tooltip')
    expect(tip).not.toBeNull()
    expect(tip!.hasAttribute('virtual')).toBe(true)
    expect(tip!.hasAttribute('open')).toBe(true)
    expect(tip!.getAttribute('content')).toBe('一般')
    expect(tip!.getAttribute('virtual-x')).not.toBe('')
    // 移出关闭
    sliderOf(el).dispatchEvent(new MouseEvent('mouseleave'))
    expect(tip!.hasAttribute('open')).toBe(false)
    // 未配置的星不出提示
    s[0]!.dispatchEvent(new MouseEvent('mouseenter', { clientX: 0 }))
    expect(tip!.getAttribute('content')).toBe('差')
  })

  it('tooltips 缺省时 shadow 内无 oas-tooltip 残留；readonly 不响应', () => {
    const el = mount({})
    expect(el.shadowRoot!.querySelector('oas-tooltip')).toBeNull()
    const ro = mount({ readonly: '', tooltips: 'a,b,c,d,e' })
    expect(ro.shadowRoot!.querySelector('oas-tooltip')).toBeNull()
  })

  // —— 触屏拖拽滑选 ——

  it('触屏 pointer 拖拽滑选取值并派发 oas-change（allow-half 半区粒度）', () => {
    const el = mount({ 'allow-half': '' })
    const slider = sliderOf(el)
    const s = stars(el)
    rectAt(s[2]!, 100, 20) // 第 3 颗星 100~120
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    slider.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 90 }))
    // 阈值内微动视为 tap：不进入拖拽（value 属性未被写入）
    slider.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch', clientX: 92 }))
    expect(el.hasAttribute('value')).toBe(false)
    // 越过阈值 → 拖拽滑选
    slider.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch', clientX: 110 }))
    expect(el.getAttribute('value')).toBe('2.5')
    expect(detail).toEqual({ value: 2.5 })
    slider.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch', clientX: 118 }))
    expect(el.getAttribute('value')).toBe('3')
    slider.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch' }))
  })

  it('拖拽结束后的合成 click 被吞掉（不触发 allow-clear 误清空）', () => {
    const el = mount({ 'allow-half': '' })
    const slider = sliderOf(el)
    const s = stars(el)
    rectAt(s[2]!, 100, 20)
    slider.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 100 }))
    slider.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch', clientX: 110 }))
    slider.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch' }))
    expect(el.getAttribute('value')).toBe('2.5')
    // 拖拽后的 click（同值，allow-clear 默认开）不得清空
    s[2]!.dispatchEvent(new MouseEvent('click', { clientX: 105 }))
    expect(el.getAttribute('value')).toBe('2.5')
    // 下一次正常点击不受影响
    s[4]!.dispatchEvent(new MouseEvent('click', { clientX: 0 }))
    expect(el.getAttribute('value')).toBe('4.5')
  })

  it('鼠标 pointer 不触发拖拽（桌面走 hover/click 路径）', () => {
    const el = mount({})
    const slider = sliderOf(el)
    rectAt(stars(el)[2]!, 100, 20)
    slider.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', clientX: 100 }))
    slider.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: 110 }))
    slider.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse' }))
    expect(el.hasAttribute('value')).toBe(false)
  })
})
