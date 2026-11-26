import { describe, it, expect, afterEach } from 'vitest'
import { isRtl, resolveDirection } from './direction.js'
import { isRtlDom, resolveDomDirection } from './direction-dom.js'

function host(dir?: string): HTMLElement {
  const el = document.createElement('div')
  if (dir) el.setAttribute('dir', dir)
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('isRtl / resolveDirection 书写方向判定', () => {
  it('最近 [dir=rtl] → RTL', () => {
    expect(isRtl(host('rtl'))).toBe(true)
    expect(resolveDirection(host('rtl'))).toBe('rtl')
  })

  it('就近声明优先：外层 rtl、内层 ltr → 内层胜', () => {
    const outer = host('rtl')
    const inner = document.createElement('div')
    inner.setAttribute('dir', 'ltr')
    outer.appendChild(inner)
    expect(isRtl(inner)).toBe(false)
    expect(resolveDirection(inner)).toBe('ltr')
  })

  it('无显式 dir 回退计算样式/ locale（默认 LTR）', () => {
    expect(isRtl(host())).toBe(false)
    expect(resolveDirection(host())).toBe('ltr')
  })

  it('CSS direction 通道按需开启：默认不读 computed style（update 热路径零重算），显式传 computed 才认', () => {
    // 组件内联 RTL 判定原先直接读 getComputedStyle；收敛到 isRtl 后该通道按需保留
    const el = host()
    el.style.direction = 'rtl'
    expect(resolveDirection(el), '默认不读 computed，保持既有 70+ 调用点的零重算行为').toBe('ltr')
    expect(resolveDirection(el, { computed: true })).toBe('rtl')
    expect(isRtl(el, { computed: true })).toBe(true)
  })

  it('组件用 host 判定（shadow 内元素 closest 不穿边界，由宿主代判）', () => {
    const h = host('rtl')
    const shadow = h.attachShadow({ mode: 'open' })
    shadow.innerHTML = '<div id="inner"></div>'
    expect(shadow.querySelector('#inner')!.id).toBe('inner')
    expect(isRtl(h)).toBe(true)
  })

  it('DOM 层件（零依赖）：[dir] 声明 / 无声明返回 null；computed 仅按需', () => {
    expect(resolveDomDirection(host('rtl'))).toBe('rtl')
    expect(resolveDomDirection(host())).toBeNull()
    expect(isRtlDom(host())).toBe(false)
    const el = host()
    el.style.direction = 'rtl'
    expect(resolveDomDirection(el)).toBeNull()
    expect(isRtlDom(el, { computed: true })).toBe(true)
  })
})
