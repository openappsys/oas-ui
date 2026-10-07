import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  GLASS_SURFACE_ATTR,
  GLASS_FLUID_ACTIVE_ATTR,
  resolveGlassSurface,
  applyGlassPointer,
  shouldEnableGlassFluid,
  startGlassFluid,
  stopGlassFluid,
} from './glass-fluid.js'

/**
 * 液态玻璃动态流动感运行时（L1 单测）。
 *
 * 契约：
 * - 命中判定走事件 composedPath（shadow 内 surface 也能命中），取首个 [data-glass-surface]；
 * - 坐标写元素本地归一百分比（--oas-glass-px/py），并挂 active 标记（CSS 据此淡入高光）；
 * - 守卫：无 data-glass / reduced-motion / 粗指针 / high-contrast 均不启用；
 * - 生命周期幂等：start/stop 可重复调用；stop 清理监听与元素内联变量。
 */
function makeSurface() {
  const el = document.createElement('div')
  el.setAttribute(GLASS_SURFACE_ATTR, '')
  document.body.appendChild(el)
  // happy-dom 无布局：桩 rect
  el.getBoundingClientRect = () => ({ left: 100, top: 50, width: 200, height: 100 }) as DOMRect
  return el
}

describe('glass-fluid 运行时', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('data-glass')
  })
  afterEach(() => {
    stopGlassFluid()
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('data-glass')
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

  it('resolveGlassSurface：从 composedPath 取首个 surface（shadow 内也能命中）', () => {
    const surface = makeSurface()
    const inner = document.createElement('button')
    surface.appendChild(inner)
    // 模拟 shadow 穿透的 composedPath（inner → surface → body …）
    const ev = { composedPath: () => [inner, surface, document.body, document, window] }
    expect(resolveGlassSurface(ev)).toBe(surface)
    expect(resolveGlassSurface({ composedPath: () => [document.body] })).toBeNull()
  })

  it('applyGlassPointer：写本地归一百分比 + active 标记；命中 null 时清理', () => {
    const surface = makeSurface()
    applyGlassPointer(surface, 150, 75) // left100 top50 w200 h100 → (50/200, 25/100)
    expect(surface.style.getPropertyValue('--oas-glass-px')).toBe('25%')
    expect(surface.style.getPropertyValue('--oas-glass-py')).toBe('25%')
    expect(surface.hasAttribute(GLASS_FLUID_ACTIVE_ATTR)).toBe(true)
    // 清理（指针离开该 surface）
    applyGlassPointer(surface, null, null)
    expect(surface.style.getPropertyValue('--oas-glass-px')).toBe('')
    expect(surface.hasAttribute(GLASS_FLUID_ACTIVE_ATTR)).toBe(false)
  })

  it('坐标越界取整到 0~100%（元素边缘/外部指针不产生越界百分比）', () => {
    const surface = makeSurface()
    applyGlassPointer(surface, 0, 1000)
    expect(surface.style.getPropertyValue('--oas-glass-px')).toBe('0%')
    expect(surface.style.getPropertyValue('--oas-glass-py')).toBe('100%')
  })

  it('无 data-glass 时 start 不挂监听（零开销）', () => {
    const add = vi.spyOn(document, 'addEventListener')
    startGlassFluid()
    const pointerCalls = add.mock.calls.filter(([t]) => t === 'pointermove')
    expect(pointerCalls).toHaveLength(0)
    add.mockRestore()
  })

  it('data-glass 存在时 start 挂单文档 pointermove（passive），重复 start 幂等', () => {
    document.documentElement.setAttribute('data-glass', '')
    const add = vi.spyOn(document, 'addEventListener')
    startGlassFluid()
    startGlassFluid()
    const pointerCalls = add.mock.calls.filter(([t]) => t === 'pointermove')
    expect(pointerCalls).toHaveLength(1)
    expect(pointerCalls[0]![2]).toMatchObject({ passive: true })
    add.mockRestore()
  })

  it('非鼠标指针抬起（触屏 tap）→ 运行时经 pointerup 清理高光（无 pointerleave 路径的兜底）', async () => {
    document.documentElement.setAttribute('data-glass', '')
    const surface = makeSurface()
    startGlassFluid()
    // 走内部路径：先 pointermove（composedPath 命中 surface）→ rAF 写入 → currentSurface 就位
    const move = new Event('pointermove') as Event & {
      composedPath?: () => unknown[]
      clientX?: number
      clientY?: number
    }
    move.composedPath = () => [surface, document.body, document, window]
    move.clientX = 150
    move.clientY = 75
    document.dispatchEvent(move)
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    expect(surface.hasAttribute(GLASS_FLUID_ACTIVE_ATTR), 'pointermove 应亮高光').toBe(true)
    // 真派发 pointerup（pointerType=touch）——走 onPointerRelease 分支（非 stop 兜底）
    const up = new Event('pointerup') as Event & { pointerType?: string }
    up.pointerType = 'touch'
    document.dispatchEvent(up)
    expect(surface.hasAttribute(GLASS_FLUID_ACTIVE_ATTR), 'touch 抬起应清高光').toBe(false)
    expect(surface.style.getPropertyValue('--oas-glass-px')).toBe('')
    document.documentElement.removeAttribute('data-glass')
    stopGlassFluid()
  })

  it('禁用后恢复：满足守卫条件时可自动重启（观察器常驻，非一次性命中）', async () => {
    document.documentElement.setAttribute('data-glass', '')
    const add = vi.spyOn(document, 'addEventListener')
    startGlassFluid()
    const before = add.mock.calls.filter(([t]) => t === 'pointermove').length
    // 切到 high-contrast → 观察器应停用（清监听）
    document.documentElement.setAttribute('data-theme', 'high-contrast')
    await new Promise((r) => setTimeout(r, 0))
    // 移除 high-contrast → 观察器应重启（再挂 pointermove）
    document.documentElement.removeAttribute('data-theme')
    await new Promise((r) => setTimeout(r, 0))
    const after = add.mock.calls.filter(([t]) => t === 'pointermove').length
    expect(before, '初始应挂一次').toBe(1)
    expect(after, '恢复条件后应能再次挂载（自动起停双向）').toBeGreaterThanOrEqual(2)
    add.mockRestore()
    document.documentElement.removeAttribute('data-glass')
    stopGlassFluid()
  })

  it('stop 清理：清内联变量 + 移除 active + 监听退订（幂等）', () => {
    document.documentElement.setAttribute('data-glass', '')
    const surface = makeSurface()
    applyGlassPointer(surface, 150, 75)
    startGlassFluid()
    stopGlassFluid()
    stopGlassFluid()
    expect(surface.style.getPropertyValue('--oas-glass-px')).toBe('')
    expect(surface.hasAttribute(GLASS_FLUID_ACTIVE_ATTR)).toBe(false)
  })
})
