import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASColorPicker } from './core/index.js'

// 本文件验证「纯核入口语义」（v2.5.0 L3 子路径语义修正）：
// `@oas-ui/ui/form/color-picker/core` 是不含 designer 能力包的 core-only 入口——经它引入时
// mode=gradient 配置静默失效 + dev 告警一次（同值去重），
// 与 oas-color-picker-designer-capability.test.ts 覆盖的 core-only 语义一致。
// 注意：不得在此文件 import './designer/index.js' 或 './index.js'——否则能力注册表被填充。
// vitest 按文件隔离模块图，本文件独享一份空注册表起点。
//
// 告警去重是模块级（同控件惯例：同值告警整页只一次），因此首个带 mode=gradient 配置的 mount
// 必须发生在「dev 告警」用例内；后续用例再挂 gradient 配置不会再触发 console.warn。

const GRAD_VALUE = 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)'

function mount(attrs: Record<string, string> = {}): OASColorPicker {
  const el = new OASColorPicker()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

describe('OASColorPicker 纯核入口（core：不含 designer 能力）', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    document.body.innerHTML = ''
    warnSpy.mockRestore()
  })

  it('dev 告警：mode=gradient + core 入口 → 提示显式引能力包或换回主路径（同值去重）', () => {
    const isDesignerHint = (call: unknown[]): boolean =>
      String(call[0]).includes('form/color-picker/designer')
    // 首个带 gradient 配置的实例：告警一次
    mount({ mode: 'gradient', value: GRAD_VALUE })
    const first = warnSpy.mock.calls.filter(isDesignerHint)
    expect(first.length, 'core 入口首张 gradient 配置应告警一次').toBe(1)
    expect(String(first[0]![0])).toContain('@oas-ui/ui/form/color-picker/designer')
    // 第二张同配置：同值去重，不再重复告警
    warnSpy.mockClear()
    mount({ mode: 'gradient', value: GRAD_VALUE })
    expect(warnSpy.mock.calls.filter(isDesignerHint).length).toBe(0)
  })

  it('mode=gradient 静默失效：core 入口无 2D 色域/渐变编辑区，value 原样不重写', () => {
    const el = mount({ mode: 'gradient', value: GRAD_VALUE })
    expect(el.shadowRoot!.querySelector('.sv2d')).toBeNull()
    expect(el.shadowRoot!.querySelector('.hue')).toBeNull()
    expect(el.shadowRoot!.querySelector('.grad')).toBeNull()
    expect(el.getAttribute('value')).toBe(GRAD_VALUE)
    el.remove()
  })

  it('无 gradient 配置时 core 入口渲染正常且不告警', () => {
    const plain = mount({ value: '#0b6cff' })
    expect(plain.shadowRoot!.querySelector('[part="trigger"]')).not.toBeNull()
    const designerWarns = warnSpy.mock.calls.filter((call: unknown[]) =>
      String(call[0]).includes('form/color-picker/designer'),
    )
    expect(designerWarns.length).toBe(0)
  })
})
