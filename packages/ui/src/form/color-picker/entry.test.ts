import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASColorPicker } from './index.js'

// 本文件验证「主路径入口语义」（v2.5.0 L3 子路径语义修正）：
// 主路径 index.js 顶部 import designer 能力包（import 即注册），因此经
// `@oas-ui/ui/form/color-picker` 引入时 2D 色域 + gradient 设计器能力默认就位——
// 模板含 .sv2d/.hue/.grad，mode=gradient 配置直接可用，无需再显式引能力包
// （恢复 2.4.0 语义）。
// 纯核（/core 子路径不含能力）的边界由 ./core-entry.test.ts 单独覆盖。
// vitest 按文件隔离模块图，本文件独享一份「index 即含能力」的注册表起点。

const GRAD_VALUE = 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)'

function mount(attrs: Record<string, string> = {}): OASColorPicker {
  const el = new OASColorPicker()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function open(el: OASColorPicker): void {
  el.shadowRoot!.querySelector<HTMLButtonElement>('button[part="trigger"]')!.click()
}

describe('OASColorPicker 主路径入口（index 内含 designer 能力）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('仅 import 主路径即渲染 2D 色域 + hue 竖条（能力注入后的 designer 结构）', () => {
    const el = mount({ value: '#ff0000' })
    open(el)
    expect(el.shadowRoot!.querySelector('.sv2d')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('.hue')).not.toBeNull()
    el.remove()
  })

  it('mode=gradient：仅 import 主路径即可用渐变编辑区（.grad 显现、stops 解析为双 stop）', () => {
    const el = mount({ mode: 'gradient', value: GRAD_VALUE })
    open(el)
    const grad = el.shadowRoot!.querySelector<HTMLElement>('.grad')
    expect(grad).not.toBeNull()
    expect(grad!.hasAttribute('hidden')).toBe(false)
    const stops = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.grad-stop')]
    expect(stops.length).toBe(2)
    expect(stops[0]!.getAttribute('aria-valuenow')).toBe('0')
    expect(stops[1]!.getAttribute('aria-valuenow')).toBe('100')
    el.remove()
  })
})
