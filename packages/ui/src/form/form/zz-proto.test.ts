import { describe, it, expect } from 'vitest'
import { OASForm } from './index.js'
import '../input/index.js'

describe('null-proto 残留收口', () => {
  it('非法 rules JSON（catch 分支）+ 升级前 getter：均为普通原型（hasOwnProperty 可用）', () => {
    const el = new OASForm()
    // 升级前（connectedCallback 前的 getter 初值）
    expect(typeof el.rules.hasOwnProperty, '初值为普通原型').toBe('function')
    el.setAttribute('rules', '{bad json')
    el.innerHTML = '<oas-input name="a"></oas-input>'
    document.body.appendChild(el)
    expect(typeof el.rules.hasOwnProperty, 'catch 分支普通原型').toBe('function')
    el.remove()
  })
})
