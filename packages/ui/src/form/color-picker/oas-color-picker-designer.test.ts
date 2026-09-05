import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASColorPicker } from './index.js'
// import 即注册：本文件具备 designer 能力（2D 色域/hue 竖条/gradient 多 stop 编辑器）
import './designer/index.js'

/**
 * color-picker designer 能力包测试（对应 @oas-ui/ui/form/color-picker/designer 子路径）。
 *
 * 与 core 文件隔离模块图（vitest 按文件隔离）：本文件 import 能力入口后，
 * 能力注册表填充 → OASColorPicker 构造时注入 designer controller，模板含
 * 2D 色域 / 渐变编辑区。core-only 时这些节点不存在，相关边界见
 * oas-color-picker-designer-capability.test.ts。
 */

const DEFAULT_VALUE = '#0066ff'

function mount(attrs: Record<string, string> = {}): OASColorPicker {
  const el = new OASColorPicker()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function trigger(el: OASColorPicker): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button[part="trigger"]')!
}

function panelEl(el: OASColorPicker): HTMLElement {
  return el.shadowRoot!.querySelector('[part="panel"]')!
}

function textEl(el: OASColorPicker): HTMLElement {
  return el.shadowRoot!.querySelector('.hex-text')!
}

function open(el: OASColorPicker): void {
  trigger(el).click()
}

function isOpen(el: OASColorPicker): boolean {
  return el.hasAttribute('open')
}

function setRect(el: Element, rect: Partial<DOMRect>): void {
  ;(el as unknown as { getBoundingClientRect(): DOMRect }).getBoundingClientRect = () =>
    ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, ...rect }) as DOMRect
}

function gradStopsOf(el: OASColorPicker): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.grad-stop')]
}

/** 解析渐变串（供方向键断言回读 pos） */
function parseGradientStr(v: string): Array<{ pos: number }> | null {
  if (!/^linear-gradient\(/.test(v)) return null
  const body = v.slice('linear-gradient('.length, -1)
  const segs = body.split(',').map((s) => s.trim())
  // 去掉 90deg 方向 token
  if (segs.length && /deg$/.test(segs[0]!)) segs.shift()
  return segs.map((s) => {
    const m = s.match(/([\d.]+)%$/)
    return { pos: m ? Number(m[1]) / 100 : 0 }
  })
}

describe('OASColorPicker designer（import 即注册）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  // ---------- P-C 2D 面板（能力注入后渲染 sv2d/hue） ----------

  it('渲染 2D 色域 + hue 竖条（不再渲染 H/S/V 三滑轨）', () => {
    const el = mount({ value: '#ff0000' })
    expect(el.shadowRoot!.querySelector('.sv2d')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('.hue')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('input.hue')).toBeNull()
    expect(el.shadowRoot!.querySelector('input.sat')).toBeNull()
    expect(el.shadowRoot!.querySelector('input.val')).toBeNull()
    el.remove()
  })

  it('hue 竖条 pointerdown 定位：y 归一 → 色相（#ff0000 h=0）', () => {
    const el = mount({ value: '#ff0000' })
    open(el)
    const hue = el.shadowRoot!.querySelector<HTMLElement>('.hue')!
    setRect(hue, { left: 0, top: 0, width: 16, height: 360 })
    // 中点 y=180 → (1-0.5)*360=180 → cyan
    hue.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 8, clientY: 180 }))
    expect(el.getAttribute('value')).toBe('#00ffff')
  })

  it('2D 色域 pointerdown：x→saturation，y 反转→value（#ff0000 拖动到左上白）', () => {
    const el = mount({ value: '#ff0000' }) // h0 s1 v1
    open(el)
    const sv = el.shadowRoot!.querySelector<HTMLElement>('.sv2d')!
    setRect(sv, { left: 0, top: 0, width: 100, height: 100 })
    // x=0,y=0 → s0 v1 → 白
    sv.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }))
    expect(el.getAttribute('value')).toBe('#ffffff')
    // 右下 → s1 v0 → 黑
    sv.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }))
    expect(el.getAttribute('value')).toBe('#000000')
  })

  it('2D 色域方向键：ArrowRight +s / ArrowUp +v / Home 归零 s', () => {
    const el = mount({ value: '#804040' }) // h0 s0.5 v0.5
    open(el)
    const sv = el.shadowRoot!.querySelector<HTMLElement>('.sv2d')!
    const key = (k: string) => sv.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
    const before = el.getAttribute('value')!
    key('ArrowRight')
    const afterRight = el.getAttribute('value')!
    expect(afterRight).not.toBe(before)
    key('ArrowUp')
    // v 升一档
    expect(el.getAttribute('value')).not.toBe(afterRight)
    key('Home')
    // Home → s=0，v 不变 → r=g=b
    const home = el.getAttribute('value')!
    expect(home).toMatch(/^#([0-9a-f]{2})\1\1$/i)
  })

  it('RGB 数字输入后 2D 面板光标跟随（aria-valuetext 描述当前 s/v）', () => {
    const el = mount({ value: '#000000' }) // h0 s0 v0
    open(el)
    const sv = el.shadowRoot!.querySelector<HTMLElement>('.sv2d')!
    const g = el.shadowRoot!.querySelector<HTMLInputElement>('.g')!
    g.value = '255'
    g.dispatchEvent(new Event('input', { bubbles: true }))
    // #00ff00 → s1 v1
    expect(sv.getAttribute('aria-valuetext')).toContain('饱和度 100%')
    el.remove()
  })

  it('拖拽 sv2d 的 hue 不变（commitFromSv 保持当前色相），颜色与 value 同步', () => {
    const el = mount({ value: '#ff0000' }) // h0
    open(el)
    const sv = el.shadowRoot!.querySelector<HTMLElement>('.sv2d')!
    setRect(sv, { left: 0, top: 0, width: 100, height: 100 })
    // 拖到 s=1,v=0.5 → #800000 沿 0 度 hue 变暗
    sv.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 50 }))
    const v = el.getAttribute('value')!
    expect(v).toMatch(/^#(7f|80)0000$/)
  })

  // ---------- P-E 渐变模式 ----------

  it('mode=gradient：面板出现渐变编辑条，value 解析为 stops', () => {
    const el = mount({ mode: 'gradient', value: 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)' })
    open(el)
    const grad = el.shadowRoot!.querySelector<HTMLElement>('.grad')!
    expect(grad.hasAttribute('hidden')).toBe(false)
    const stops = gradStopsOf(el)
    expect(stops.length).toBe(2)
    // 手柄 aria-valuenow = 位置百分比
    expect(stops[0]!.getAttribute('aria-valuenow')).toBe('0')
    expect(stops[1]!.getAttribute('aria-valuenow')).toBe('100')
    el.remove()
  })

  it('渐变模式：单色 value（尚未编辑器改写）→ 双 stop 同色铺平，触发文本仍显示原色', () => {
    const el = mount({ mode: 'gradient', value: '#0b6cff' })
    expect(textEl(el).textContent).toBe('#0b6cff')
    expect(gradStopsOf(el).length).toBe(2)
    // 渐变 swatch 为平铺背景
    const sw = el.shadowRoot!.querySelector<HTMLElement>('.swatch')!
    expect(sw.style.backgroundImage).toContain('linear-gradient')
  })

  it('渐变 + 空值：seed 双默认 stop，编辑后写回线性渐变 value', () => {
    const el = mount({ mode: 'gradient' })
    open(el)
    expect(gradStopsOf(el).length).toBe(2)
    expect(el.getAttribute('value')).toBeNull()
    // 点击第一个手柄并改 G → 触发渐变提交
    const stops = gradStopsOf(el)
    stops[0]!.dispatchEvent(new MouseEvent('focusin', { bubbles: true }))
    const g = el.shadowRoot!.querySelector<HTMLInputElement>('.g')!
    g.value = '0'
    g.dispatchEvent(new Event('input', { bubbles: true }))
    // 默认 #0066ff 的 g=102 被置 0 → #0000ff
    expect(el.getAttribute('value')).toMatch(/^linear-gradient\(90deg, #0000ff 0%,/)
    el.remove()
  })

  it('渐变 stop 增删：+ 按钮插入最大空隙中点，- 删除活动 stop（最小 2 个）', () => {
    const el = mount({ mode: 'gradient', value: 'linear-gradient(90deg, #000 0%, #fff 100%)' })
    open(el)
    const add = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="grad-add"]')!
    add.click()
    let stops = gradStopsOf(el)
    expect(stops.length).toBe(3)
    // 新 stop 落在 0.5
    expect(stops.map((s) => s.getAttribute('aria-valuenow'))).toContain('50')
    // 删除活动 stop（新插入的自动激活）
    const remove = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="grad-remove"]')!
    expect(remove.disabled).toBe(false)
    remove.click()
    stops = gradStopsOf(el)
    expect(stops.length).toBe(2)
    expect(remove.disabled).toBe(true) // 只剩 2 个，删除禁用
    el.remove()
  })

  it('渐变 stop 键盘方向键移动位置（夹取在邻居之间）', () => {
    const el = mount({ mode: 'gradient', value: 'linear-gradient(90deg, #000 0%, #888 50%, #fff 100%)' })
    open(el)
    const stops = gradStopsOf(el)
    expect(stops.length).toBe(3)
    const mid = stops[1]!
    mid.focus()
    expect(el.getAttribute('value')).toContain('#888')
    // ArrowRight → pos 0.51
    mid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    const value = el.getAttribute('value')!
    expect(value).toContain('#888')
    expect(value).not.toContain('#888 50%')
    expect(parseGradientStr(value)![1]!.pos).toBeCloseTo(0.51, 2)
    el.remove()
  })

  it('渐变 stop 拖拽（pointerdown 在手柄 + pointermove + pointerup）后 value 位置移动', () => {
    const el = mount({ mode: 'gradient', value: 'linear-gradient(90deg, #000 0%, #fff 100%)' })
    open(el)
    const track = el.shadowRoot!.querySelector<HTMLElement>('.grad-track')!
    setRect(track, { left: 0, top: 0, width: 200, height: 18 })
    const handle = gradStopsOf(el)[1]!
    // pointerdown 落在 100% 手柄上：命中最近手柄 → 开始拖拽（index 1）
    handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 9 }))
    // 拖到 25%：x=50 → pos 0.25（rAF 节流累积；pointerup 冲刷最后落点）
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 50, clientY: 9 }))
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
    const out = el.getAttribute('value')!
    expect(parseGradientStr(out)![1]!.pos).toBe(0.25)
    el.remove()
  })

  it('渐变 + 预设：点击预设改写活动 stop 颜色并序列化', () => {
    const el = mount({
      mode: 'gradient',
      value: 'linear-gradient(90deg, #000000 0%, #0000ff 100%)',
      preset: '["#ff0000"]',
    })
    open(el)
    // 激活第 0 个 stop
    gradStopsOf(el)[0]!.dispatchEvent(new MouseEvent('focusin', { bubbles: true }))
    el.shadowRoot!.querySelector<HTMLButtonElement>('.preset')!.click()
    expect(el.getAttribute('value')).toBe('linear-gradient(90deg, #ff0000 0%, #0000ff 100%)')
    el.remove()
  })

  it('渐变模式：hue 竖条/sv2d 编辑改写活动 stop（非整体色）', () => {
    const el = mount({ mode: 'gradient', value: 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)' })
    open(el)
    // 激活第 0 个 stop（#ff0000 h0），sv2d 拖到 s=0 v=1 → 白
    gradStopsOf(el)[0]!.dispatchEvent(new MouseEvent('focusin', { bubbles: true }))
    const sv = el.shadowRoot!.querySelector<HTMLElement>('.sv2d')!
    setRect(sv, { left: 0, top: 0, width: 100, height: 100 })
    sv.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }))
    expect(el.getAttribute('value')).toBe('linear-gradient(90deg, #ffffff 0%, #0000ff 100%)')
    el.remove()
  })

  it('渐变模式 clearable 清除：清空 value 回到占位', () => {
    const el = mount({
      mode: 'gradient',
      value: 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)',
      clearable: '',
    })
    open(el)
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.click()
    expect(el.hasAttribute('value')).toBe(false)
    el.remove()
  })

  it('渐变模式 show-alpha：活动 stop alpha 变化 → 8 位 hex 序列化（#rrggbbaa）', () => {
    const el = mount({
      mode: 'gradient',
      'show-alpha': '',
      value: 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)',
    })
    open(el)
    const alpha = el.shadowRoot!.querySelector<HTMLInputElement>('.alpha')!
    alpha.value = '50'
    alpha.dispatchEvent(new Event('input', { bubbles: true }))
    // 编辑活动 stop（0 号）alpha → 50 → 8 位 hex
    expect(el.getAttribute('value')).toContain('#ff000080 0%')
    el.remove()
  })

  // ---------- P-D inline 纯面板（designer 下含 2D/渐变完整控件） ----------

  it('inline：无 trigger，面板就地常显（不依赖 open 属性）', () => {
    const el = mount({ inline: '', value: '#0b6cff' })
    // 面板可见（open class 常驻）
    expect(panelEl(el).classList.contains('open')).toBe(true)
    // trigger 虽存在（SSR 结构一致）但视觉隐藏，点击不开/关 open
    trigger(el).click()
    expect(el.hasAttribute('open')).toBe(false)
    // 不派发 open-change
    let fired = 0
    el.addEventListener('oas-open-change', () => fired++)
    trigger(el).click()
    expect(fired).toBe(0)
    el.remove()
  })

  it('inline：编辑仍然生效（RGB 输入提交）', () => {
    const el = mount({ inline: '', value: '#000000' })
    const r = el.shadowRoot!.querySelector<HTMLInputElement>('.r')!
    r.value = '255'
    r.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.getAttribute('value')).toBe('#ff0000')
    el.remove()
  })

  it('inline + gradient：渐变编辑可用（stop 增删提交）', () => {
    const el = mount({
      inline: '',
      mode: 'gradient',
      value: 'linear-gradient(90deg, #000 0%, #fff 100%)',
    })
    const add = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="grad-add"]')!
    add.click()
    expect(gradStopsOf(el).length).toBe(3)
    expect(el.getAttribute('value')).toContain('linear-gradient(')
    el.remove()
  })

  // ---------- 单色核心语义在 designer 下保持 ----------

  it('designer 下重复点击同一预设不重复派发 oas-change', () => {
    const el = mount({ value: '#16a34a', preset: '["#16a34a"]' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    open(el)
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('.preset')!
    btn.click()
    btn.click()
    expect(fired).toBe(0)
    expect(isOpen(el)).toBe(true)
  })

  it('designer 下 hex 输入 / RGB 数字提交仍走单色语义', () => {
    const el = mount({ value: '#0b6cff' })
    open(el)
    const hex = el.shadowRoot!.querySelector<HTMLInputElement>('[part="hex-input"]')!
    hex.value = '#dc2626'
    hex.dispatchEvent(new Event('change', { bubbles: true }))
    expect(el.getAttribute('value')).toBe('#dc2626')
    expect(textEl(el).textContent).toBe('#dc2626')
    el.remove()
  })
})
