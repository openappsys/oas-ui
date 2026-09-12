import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASProgress } from './index.js'

function mount(attrs: Record<string, string> = {}): OASProgress {
  const el = new OASProgress()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

describe('OASProgress', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('percent 驱动进度条宽度与 ARIA', () => {
    const el = mount({ percent: '40' })
    const bar = el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
    expect(bar.style.width).toBe('40%')
    const pb = el.shadowRoot!.querySelector('[role="progressbar"]')!
    expect(pb.getAttribute('aria-valuenow')).toBe('40')
    expect(pb.getAttribute('aria-valuemin')).toBe('0')
    expect(pb.getAttribute('aria-valuemax')).toBe('100')
  })

  it('percent 100 显示完成状态', () => {
    const el = mount({ percent: '100' })
    expect(el.shadowRoot!.querySelector('[part="bar"]')!.classList.contains('done')).toBe(true)
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toContain('100%')
  })

  it('default 显示当前百分比文本', () => {
    const el = mount({ percent: '60' })
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toContain('60%')
  })

  it('status="success" 整条变绿（data-status 同步）', () => {
    const el = mount({ percent: '80', status: 'success' })
    expect(el.shadowRoot!.querySelector('[part="bar"]')!.getAttribute('data-status')).toBe('success')
  })

  // ---- circle 圆环形态 ----

  it('type="circle" 显示圆环并隐藏 line', () => {
    const el = mount({ type: 'circle', percent: '60' })
    const circle = el.shadowRoot!.querySelector<HTMLElement>('[part="circle"]')!
    const track = el.shadowRoot!.querySelector<HTMLElement>('.track')!
    expect(circle.hasAttribute('hidden')).toBe(false)
    expect(track.hasAttribute('hidden')).toBe(true)
    expect(circle.getAttribute('role')).toBe('progressbar')
    expect(circle.getAttribute('aria-valuenow')).toBe('60')
    expect(circle.getAttribute('aria-valuemin')).toBe('0')
    expect(circle.getAttribute('aria-valuemax')).toBe('100')
  })

  it('默认 type 为 line（不破坏现有形态）', () => {
    const el = mount({ percent: '30' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('.track')!.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="circle"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('percent 驱动 stroke-dashoffset（默认 size=48 / stroke-width=6 → r=21）', () => {
    const el = mount({ type: 'circle', percent: '50' })
    const bar = el.shadowRoot!.querySelector('.circle .bar-circle')!
    const c = 2 * Math.PI * 21
    expect(bar.getAttribute('stroke-dasharray')).toBe(String(c))
    expect(bar.getAttribute('stroke-dashoffset')).toBe(String(c * 0.5))
  })

  it('percent 夹取 0–100', () => {
    const high = mount({ type: 'circle', percent: '150' })
    expect(high.shadowRoot!.querySelector('[part="circle"]')!.getAttribute('aria-valuenow')).toBe('100')
    const low = mount({ type: 'circle', percent: '-10' })
    expect(low.shadowRoot!.querySelector('[part="circle"]')!.getAttribute('aria-valuenow')).toBe('0')
  })

  it('status="success|error" 整环变色（data-status 同步）', () => {
    const ok = mount({ type: 'circle', percent: '80', status: 'success' })
    expect(ok.shadowRoot!.querySelector('.circle .bar-circle')!.getAttribute('data-status')).toBe('success')
    const err = mount({ type: 'circle', percent: '80', status: 'error' })
    expect(err.shadowRoot!.querySelector('.circle .bar-circle')!.getAttribute('data-status')).toBe('error')
  })

  it('size / stroke-width 应用到 svg 与圆环几何', () => {
    const el = mount({ type: 'circle', size: '72', 'stroke-width': '10', percent: '20' })
    const svg = el.shadowRoot!.querySelector<SVGSVGElement>('.circle svg')!
    expect(svg.getAttribute('width')).toBe('72')
    expect(svg.getAttribute('viewBox')).toBe('0 0 72 72')
    const bar = el.shadowRoot!.querySelector('.circle .bar-circle')!
    expect(bar.getAttribute('stroke-width')).toBe('10')
    const c = 2 * Math.PI * 31 // r = (72-10)/2
    expect(bar.getAttribute('stroke-dashoffset')).toBe(String(c * 0.8))
  })

  it('圆心显示百分比；show-text="false" 隐藏', () => {
    const el = mount({ type: 'circle', percent: '40' })
    const ct = el.shadowRoot!.querySelector<HTMLElement>('.circle-text')!
    expect(ct.textContent).toContain('40%')
    el.setAttribute('show-text', 'false')
    expect(ct.hidden).toBe(true)
  })

  it('line 形态在 type 切换时互斥切换显示', () => {
    const el = mount({ percent: '50' })
    expect(el.shadowRoot!.querySelector('[part="circle"]')!.hasAttribute('hidden')).toBe(true)
    el.setAttribute('type', 'circle')
    expect(el.shadowRoot!.querySelector('[part="circle"]')!.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('.track')!.hasAttribute('hidden')).toBe(true)
  })

  // ---- max 值域 ----

  it('max 泛化值域：percent 语义为当前值，宽度/文本按 value/max 换算，aria 同步', () => {
    const el = mount({ percent: '100', max: '200' })
    const bar = el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
    expect(bar.style.width).toBe('50%')
    expect(bar.getAttribute('aria-valuenow')).toBe('100')
    expect(bar.getAttribute('aria-valuemax')).toBe('200')
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toContain('50%')
  })

  it('max 下 percent 夹取 0–max', () => {
    const high = mount({ percent: '300', max: '200' })
    expect(high.shadowRoot!.querySelector('[part="bar"]')!.getAttribute('aria-valuenow')).toBe('200')
    expect(high.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!.style.width).toBe('100%')
    const low = mount({ percent: '-10', max: '200' })
    expect(low.shadowRoot!.querySelector('[part="bar"]')!.getAttribute('aria-valuenow')).toBe('0')
  })

  it('max 非法值回退 100', () => {
    const el = mount({ percent: '40', max: 'abc' })
    expect(el.shadowRoot!.querySelector('[part="bar"]')!.getAttribute('aria-valuemax')).toBe('100')
  })

  // ---- label 无障碍名 ----

  it('label 属性写入 aria-label（line 与 circle 均同步）', () => {
    const el = mount({ percent: '40', label: '文件上传进度' })
    expect(el.shadowRoot!.querySelector('[part="bar"]')!.getAttribute('aria-label')).toBe('文件上传进度')
    el.setAttribute('type', 'circle')
    expect(el.shadowRoot!.querySelector('[part="circle"]')!.getAttribute('aria-label')).toBe('文件上传进度')
  })

  it('移除 label 后 aria-label 同步摘除', () => {
    const el = mount({ percent: '40', label: 'x' })
    el.removeAttribute('label')
    expect(el.shadowRoot!.querySelector('[part="bar"]')!.getAttribute('aria-label')).toBeNull()
  })

  // ---- warning 状态 ----

  it('status="warning" 橙色（data-status 同步，line 与 circle）', () => {
    const el = mount({ percent: '66', status: 'warning' })
    expect(el.shadowRoot!.querySelector('[part="bar"]')!.getAttribute('data-status')).toBe('warning')
    el.setAttribute('type', 'circle')
    expect(el.shadowRoot!.querySelector('.circle .bar-circle')!.getAttribute('data-status')).toBe('warning')
  })

  // ---- color / track-color 自定义色 ----

  it('color 属性注入 --oas-progress-color（任意 CSS 色串/渐变串原值注入）', () => {
    const el = mount({ percent: '40', color: '#7c3aed' })
    expect(el.style.getPropertyValue('--oas-progress-color')).toBe('#7c3aed')
    el.setAttribute('color', 'linear-gradient(90deg, #7c3aed, #22d3ee)')
    expect(el.style.getPropertyValue('--oas-progress-color')).toBe('linear-gradient(90deg, #7c3aed, #22d3ee)')
  })

  it('color 预设名解析为 --oas-preset-* 变量', () => {
    const el = mount({ percent: '40', color: 'magenta' })
    expect(el.style.getPropertyValue('--oas-progress-color')).toBe('var(--oas-preset-magenta)')
  })

  it('移除 color 后清理内联变量（回退语义色）', () => {
    const el = mount({ percent: '40', color: '#7c3aed' })
    el.removeAttribute('color')
    expect(el.style.getPropertyValue('--oas-progress-color')).toBe('')
  })

  it('track-color 属性注入 --oas-progress-track-color（预设名同协议）', () => {
    const el = mount({ percent: '40', 'track-color': 'rgba(0,0,0,.08)' })
    expect(el.style.getPropertyValue('--oas-progress-track-color')).toBe('rgba(0,0,0,.08)')
    el.setAttribute('track-color', 'cyan')
    expect(el.style.getPropertyValue('--oas-progress-track-color')).toBe('var(--oas-preset-cyan)')
    el.removeAttribute('track-color')
    expect(el.style.getPropertyValue('--oas-progress-track-color')).toBe('')
  })

  // ---- 默认 slot 自定义文本 ----

  it('默认 slot 覆盖内置百分比（line：slot 投影、内置 value 隐藏）', () => {
    const el = mount({ percent: '60' })
    el.innerHTML = '<span>剩余 2 分 10 秒</span>'
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('[part="text"] slot')!
    slot.dispatchEvent(new Event('slotchange'))
    const value = el.shadowRoot!.querySelector<HTMLElement>('.text-value')!
    expect(value.hidden).toBe(true)
    expect(slot.assignedNodes({ flatten: true }).length).toBeGreaterThan(0)
  })

  it('slot 无内容时内置百分比照常显示', () => {
    const el = mount({ percent: '60' })
    el.innerHTML = ''
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('[part="text"] slot')!
    slot.dispatchEvent(new Event('slotchange'))
    const value = el.shadowRoot!.querySelector<HTMLElement>('.text-value')!
    expect(value.hidden).toBe(false)
    expect(value.textContent).toContain('60%')
  })

  it('circle 形态 slot 投影到圆心（slot 节点移动 + 内置 value 隐藏）', () => {
    const el = mount({ type: 'circle', percent: '60' })
    el.innerHTML = '<b>3/5</b>'
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('.circle-text slot')
    slot?.dispatchEvent(new Event('slotchange'))
    expect(el.shadowRoot!.querySelector('.circle-text slot')).not.toBeNull()
    const value = el.shadowRoot!.querySelector<HTMLElement>('.circle-value')!
    expect(value.hidden).toBe(true)
  })

  it('动态增删 slot 内容经 slotchange 同步显隐', async () => {
    const el = mount({ percent: '60' })
    el.innerHTML = '<span>自定义</span>'
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('[part="text"] slot')!
    slot.dispatchEvent(new Event('slotchange'))
    expect(el.shadowRoot!.querySelector<HTMLElement>('.text-value')!.hidden).toBe(true)
    el.innerHTML = ''
    slot.dispatchEvent(new Event('slotchange'))
    expect(el.shadowRoot!.querySelector<HTMLElement>('.text-value')!.hidden).toBe(false)
  })

  // ---- striped 条纹 ----

  it('striped / striped-flow 切换 bar 类名（line 限定）', () => {
    const el = mount({ percent: '60', striped: '' })
    const bar = el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
    expect(bar.classList.contains('striped')).toBe(true)
    el.setAttribute('striped-flow', '')
    expect(bar.classList.contains('striped-flow')).toBe(true)
    expect(bar.classList.contains('striped')).toBe(true)
    el.removeAttribute('striped')
    el.removeAttribute('striped-flow')
    expect(bar.classList.contains('striped')).toBe(false)
  })

  // ---- buffer 缓冲段 ----

  it('buffer 渲染浅色缓冲层（宽度按 buffer/max 换算、aria-hidden）', () => {
    const el = mount({ percent: '40', buffer: '80' })
    const buf = el.shadowRoot!.querySelector<HTMLElement>('[part="buffer"]')!
    expect(buf.hidden).toBe(false)
    expect(buf.style.width).toBe('80%')
    expect(buf.getAttribute('aria-hidden')).toBe('true')
  })

  it('buffer 未设置时隐藏；超界夹取', () => {
    const plain = mount({ percent: '40' })
    expect(plain.shadowRoot!.querySelector<HTMLElement>('[part="buffer"]')!.hidden).toBe(true)
    const over = mount({ percent: '40', buffer: '300' })
    expect(over.shadowRoot!.querySelector<HTMLElement>('[part="buffer"]')!.style.width).toBe('100%')
  })

  it('buffer 与 max 值域联动', () => {
    const el = mount({ percent: '100', buffer: '160', max: '200' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="buffer"]')!.style.width).toBe('80%')
  })

  // ---- steps 步进分段 ----

  it('steps 把 line 切成等分段，亮段数随 percent 联动（round），bar 连续层隐藏', () => {
    const el = mount({ percent: '50', steps: '5' })
    const steps = el.shadowRoot!.querySelector<HTMLElement>('[part="steps"]')!
    expect(steps.hidden).toBe(false)
    const segs = steps.querySelectorAll('.step')
    expect(segs.length).toBe(5)
    expect(steps.querySelectorAll('.step.active').length).toBe(3) // round(50% * 5) = 3
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!.style.width).toBe('0%')
    el.setAttribute('percent', '100')
    expect(steps.querySelectorAll('.step.active').length).toBe(5)
  })

  it('steps < 2 或非法值忽略（连续 bar 照常）', () => {
    const el = mount({ percent: '50', steps: '1' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="steps"]')!.hidden).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!.style.width).toBe('50%')
    el.setAttribute('steps', 'abc')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="steps"]')!.hidden).toBe(true)
  })

  // ---- text-inside 内嵌文本 ----

  it('text-inside：文本进条内（.inside 显示、外部 .text 隐藏、内置值渲染）', () => {
    const el = mount({ percent: '60', 'text-inside': '', 'stroke-width': '20' })
    const inside = el.shadowRoot!.querySelector<HTMLElement>('[part="inside"]')!
    expect(inside.hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!.hidden).toBe(true)
    expect(inside.querySelector<HTMLElement>('.inside-value')!.textContent).toContain('60%')
  })

  it('text-inside 未显式粗度时轨道高度自动提升', () => {
    const el = mount({ percent: '60', 'text-inside': '' })
    expect(el.style.getPropertyValue('--oas-progress-height')).toContain('var(--oas-font-size-sm)')
    const explicit = mount({ percent: '60', 'text-inside': '', 'stroke-width': '10' })
    expect(explicit.style.getPropertyValue('--oas-progress-height')).toBe('10px')
  })

  // ---- line 粗细 / 尺寸档 ----

  it('line 形态 stroke-width 泛化为轨道高度（内联 --oas-progress-height）', () => {
    const el = mount({ percent: '40', 'stroke-width': '16' })
    expect(el.style.getPropertyValue('--oas-progress-height')).toBe('16px')
  })

  it('line 形态 size 档位映射高度 token（small/large），显式 stroke-width 优先', () => {
    const s = mount({ percent: '40', size: 'small' })
    expect(s.style.getPropertyValue('--oas-progress-height')).toBe('var(--oas-space-1)')
    const l = mount({ percent: '40', size: 'large' })
    expect(l.style.getPropertyValue('--oas-progress-height')).toBe('var(--oas-space-3)')
    const both = mount({ percent: '40', size: 'large', 'stroke-width': '10' })
    expect(both.style.getPropertyValue('--oas-progress-height')).toBe('10px')
    const circle = mount({ type: 'circle', percent: '40', 'stroke-width': '10' })
    expect(circle.style.getPropertyValue('--oas-progress-height')).toBe('')
  })

  // ---- indeterminate 不确定态 ----

  it('line indeterminate：bar 类同步、宽度交由 CSS 动画、aria-valuenow 摘除', () => {
    const el = mount({ indeterminate: '' })
    const bar = el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
    expect(bar.classList.contains('indeterminate')).toBe(true)
    expect(bar.style.width).toBe('')
    expect(bar.getAttribute('aria-valuenow')).toBeNull()
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
  })

  it('circle indeterminate：分段弧 + 旋转动画类、aria-valuenow 摘除', () => {
    const el = mount({ type: 'circle', indeterminate: '' })
    const circle = el.shadowRoot!.querySelector<HTMLElement>('[part="circle"]')!
    const bar = el.shadowRoot!.querySelector<HTMLElement>('.circle .bar-circle')!
    expect(circle.classList.contains('indeterminate')).toBe(true)
    expect(bar.getAttribute('aria-valuenow') ?? circle.getAttribute('aria-valuenow')).toBeNull()
    const c = 2 * Math.PI * 21
    expect(bar.getAttribute('stroke-dasharray')).toBe(`${c * 0.25} ${c * 0.75}`)
  })

  it('indeterminate 优先级最高：steps/buffer/striped 全部压制', () => {
    const el = mount({
      indeterminate: '',
      percent: '50',
      steps: '5',
      buffer: '80',
      striped: '',
    })
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="steps"]')!.hidden).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="buffer"]')!.hidden).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!.classList.contains('striped')).toBe(false)
  })

  it('indeterminate 内置百分比隐藏；slot 自定义内容照常显示', () => {
    const el = mount({ indeterminate: '' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('.text-value')!.hidden).toBe(true)
    el.innerHTML = '<span>加载中…</span>'
    el.shadowRoot!.querySelector<HTMLSlotElement>('[part="text"] slot')!.dispatchEvent(new Event('slotchange'))
    expect(el.shadowRoot!.querySelector<HTMLElement>('.text-value')!.hidden).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!.hidden).toBe(false)
  })

  it('移除 indeterminate 后恢复 determinate 渲染', () => {
    const el = mount({ indeterminate: '', percent: '40' })
    el.removeAttribute('indeterminate')
    const bar = el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
    expect(bar.classList.contains('indeterminate')).toBe(false)
    expect(bar.style.width).toBe('40%')
    expect(bar.getAttribute('aria-valuenow')).toBe('40')
  })

  // ---- dashboard 仪表盘形态 ----

  it('type="dashboard" 复用 circle 结构：270° 弧、data-type 标记、line 隐藏', () => {
    const el = mount({ type: 'dashboard', percent: '50' })
    const circle = el.shadowRoot!.querySelector<HTMLElement>('[part="circle"]')!
    const bar = el.shadowRoot!.querySelector<SVGElement>('.circle .bar-circle')!
    expect(circle.hasAttribute('hidden')).toBe(false)
    expect(circle.getAttribute('data-type')).toBe('dashboard')
    expect(el.shadowRoot!.querySelector<HTMLElement>('.track')!.hasAttribute('hidden')).toBe(true)
    const c = 2 * Math.PI * 21
    expect(bar.getAttribute('stroke-dasharray')).toBe(String(c * 0.75))
    expect(bar.getAttribute('stroke-dashoffset')).toBe(String(c * 0.75 * 0.5))
  })

  it('dashboard aria 与 label 同步；indeterminate 时摘 valuenow', () => {
    const el = mount({ type: 'dashboard', percent: '60', label: '吞吐量' })
    const circle = el.shadowRoot!.querySelector<HTMLElement>('[part="circle"]')!
    expect(circle.getAttribute('aria-valuenow')).toBe('60')
    expect(circle.getAttribute('aria-label')).toBe('吞吐量')
    el.setAttribute('indeterminate', '')
    expect(circle.getAttribute('aria-valuenow')).toBeNull()
  })

  // ---- stroke-linecap 端帽 ----

  it('stroke-linecap 应用到环（默认 round，可切 butt）', () => {
    const el = mount({ type: 'circle', percent: '40' })
    const bar = el.shadowRoot!.querySelector('.circle .bar-circle')!
    expect(bar.getAttribute('stroke-linecap')).toBe('round')
    el.setAttribute('stroke-linecap', 'butt')
    expect(el.shadowRoot!.querySelector('.circle .bar-circle')!.getAttribute('stroke-linecap')).toBe('butt')
    el.setAttribute('stroke-linecap', 'bogus')
    expect(el.shadowRoot!.querySelector('.circle .bar-circle')!.getAttribute('stroke-linecap')).toBe('round')
  })

  // ---- circle 状态图标替代文本 ----

  it('status 时圆心渲染状态图标（真 SVG、aria-hidden），内置百分比隐藏', () => {
    const ok = mount({ type: 'circle', percent: '80', status: 'success' })
    const icon = ok.shadowRoot!.querySelector<HTMLElement>('.circle-icon')!
    const svg = icon.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.getAttribute('viewBox')).toBe('0 0 16 16')
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(ok.shadowRoot!.querySelector<HTMLElement>('.circle-value')!.hidden).toBe(true)
    const err = mount({ type: 'circle', percent: '80', status: 'error' })
    expect(err.shadowRoot!.querySelector('.circle-icon svg')).not.toBeNull()
    const warn = mount({ type: 'circle', percent: '80', status: 'warning' })
    expect(warn.shadowRoot!.querySelector('.circle-icon svg')).not.toBeNull()
  })

  it('percent 满值无 status 自动显示成功图标；恢复进度后还原百分比', () => {
    const el = mount({ type: 'circle', percent: '100' })
    expect(el.shadowRoot!.querySelector('.circle-icon svg')).not.toBeNull()
    expect(el.shadowRoot!.querySelector<HTMLElement>('.circle-value')!.hidden).toBe(true)
    el.setAttribute('percent', '40')
    expect(el.shadowRoot!.querySelector('.circle-icon svg')).toBeNull()
    expect(el.shadowRoot!.querySelector<HTMLElement>('.circle-value')!.hidden).toBe(false)
  })

  it('slot 自定义内容优先于状态图标', () => {
    const el = mount({ type: 'circle', percent: '100' })
    el.innerHTML = '<b>完成</b>'
    el.shadowRoot!.querySelector<HTMLSlotElement>('.circle-text slot')?.dispatchEvent(new Event('slotchange'))
    expect(el.shadowRoot!.querySelector('.circle-icon svg')).toBeNull()
  })

  // ---- value 别名（percent 的别名；两者同设 percent 优先）----

  it('value：percent 缺失时作为别名生效（宽度/文本/ARIA）', () => {
    // 曾现 bug：宿主写 value 静默无效（组件只读 percent）
    const el = mount({ value: '60' })
    const bar = el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
    expect(bar.style.width).toBe('60%')
    const pb = el.shadowRoot!.querySelector('[role="progressbar"]')!
    expect(pb.getAttribute('aria-valuenow')).toBe('60')
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toContain('60%')
  })

  it('value：circle 形态同样走别名', () => {
    const el = mount({ type: 'circle', value: '60' })
    const bar = el.shadowRoot!.querySelector('.circle .bar-circle')!
    const c = 2 * Math.PI * 21
    expect(bar.getAttribute('stroke-dashoffset')).toBe(String(c * 0.4))
    expect(el.shadowRoot!.querySelector('[part="circle"]')!.getAttribute('aria-valuenow')).toBe('60')
  })

  it('value：与 percent 同设时 percent 优先', () => {
    const el = mount({ value: '60', percent: '30' })
    const bar = el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
    expect(bar.style.width).toBe('30%')
    expect(bar.getAttribute('aria-valuenow')).toBe('30')
  })

  it('value：max 值域下按 value/max 换算', () => {
    const el = mount({ value: '50', max: '200' })
    const bar = el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
    expect(bar.style.width).toBe('25%')
    expect(bar.getAttribute('aria-valuenow')).toBe('50')
    expect(bar.getAttribute('aria-valuemax')).toBe('200')
  })

  it('value：动态 setAttribute 触发重渲染', () => {
    const el = mount({ value: '10' })
    const bar = el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
    expect(bar.style.width).toBe('10%')
    el.setAttribute('value', '70')
    expect(bar.style.width).toBe('70%')
    expect(bar.getAttribute('aria-valuenow')).toBe('70')
  })

  it('value：移除 percent 后回退到 value', () => {
    const el = mount({ value: '60', percent: '30' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!.style.width).toBe('30%')
    el.removeAttribute('percent')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!.style.width).toBe('60%')
  })
})
