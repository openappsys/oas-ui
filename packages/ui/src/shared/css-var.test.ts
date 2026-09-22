import { describe, it, expect, afterEach } from 'vitest'
import { cssVarPx } from './css-var.js'

describe('cssVarPx：CSS 变量像素值读取', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('宿主内联设置的 px 值被解析为数值', () => {
    const el = document.createElement('div')
    el.style.setProperty('--oas-x-size', '20px')
    document.body.appendChild(el)
    expect(cssVarPx(el, '--oas-x-size', 12)).toBe(20)
  })

  it('缺省 / 空串 / 非数值一律回退 fallback', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    expect(cssVarPx(el, '--oas-absent', 12)).toBe(12)
    el.style.setProperty('--oas-x-size', '')
    expect(cssVarPx(el, '--oas-x-size', 12)).toBe(12)
    el.style.setProperty('--oas-x-size', 'abc')
    expect(cssVarPx(el, '--oas-x-size', 12)).toBe(12)
  })
})

// 注：CSS 变量「继承」（容器层 → 子元素）在 happy-dom 的 getComputedStyle 中不生效，
// 该场景由浏览器 e2e（浮层箭头自定义 token）验证。
