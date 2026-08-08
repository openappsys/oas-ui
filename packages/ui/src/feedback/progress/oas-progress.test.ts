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
    expect(el.shadowRoot!.querySelector('[part="bar"]')!.getAttribute('data-status')).toBe(
      'success',
    )
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
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="circle"]')!.hasAttribute('hidden'),
    ).toBe(true)
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
    expect(high.shadowRoot!.querySelector('[part="circle"]')!.getAttribute('aria-valuenow')).toBe(
      '100',
    )
    const low = mount({ type: 'circle', percent: '-10' })
    expect(low.shadowRoot!.querySelector('[part="circle"]')!.getAttribute('aria-valuenow')).toBe(
      '0',
    )
  })

  it('status="success|error" 整环变色（data-status 同步）', () => {
    const ok = mount({ type: 'circle', percent: '80', status: 'success' })
    expect(ok.shadowRoot!.querySelector('.circle .bar-circle')!.getAttribute('data-status')).toBe(
      'success',
    )
    const err = mount({ type: 'circle', percent: '80', status: 'error' })
    expect(err.shadowRoot!.querySelector('.circle .bar-circle')!.getAttribute('data-status')).toBe(
      'error',
    )
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
})
