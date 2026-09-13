import { describe, it, expect, afterEach } from 'vitest'
import { isRtl, resolveDirection } from './direction.js'

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

  it('组件用 host 判定（shadow 内元素 closest 不穿边界，由宿主代判）', () => {
    const h = host('rtl')
    const shadow = h.attachShadow({ mode: 'open' })
    shadow.innerHTML = '<div id="inner"></div>'
    expect(shadow.querySelector('#inner')).toBeTruthy()
    expect(isRtl(h)).toBe(true)
  })
})
