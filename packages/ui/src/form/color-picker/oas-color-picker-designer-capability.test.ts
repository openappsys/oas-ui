import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASColorPicker } from './index.js'

// 本文件验证「designer 能力未 import（core-only）」的边界行为：
// mode=gradient 配置静默失效 + 2D 色域/渐变编辑区不渲染 + dev 告警（同值去重）。
// 注意：不得在此文件 import './designer/index.js'——否则能力注册表被填充，core-only 语义失效。
// （vitest 按文件隔离模块图，本文件与 oas-color-picker-designer.test.ts 的注册表互不影响。）
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

function trigger(el: OASColorPicker): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button[part="trigger"]')!
}

function open(el: OASColorPicker): void {
  trigger(el).click()
}

describe('OASColorPicker designer 能力边界（core-only：未 import designer 能力包）', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    document.body.innerHTML = ''
    warnSpy.mockRestore()
  })

  const isDesignerHint = (call: unknown[]): boolean =>
    String(call[0]).includes('form/color-picker/designer')

  it('dev 告警：mode=gradient + 未 import designer → 提示按需 import（同值去重：多实例只告警一次）', () => {
    mount({ mode: 'gradient', value: GRAD_VALUE })
    const first = warnSpy.mock.calls.filter(isDesignerHint)
    expect(first.length, '首张 gradient 配置应告警一次').toBe(1)
    expect(String(first[0]![0])).toContain('@oas-ui/ui/form/color-picker/designer')
    // 第二张同配置：同值去重，不再重复告警
    warnSpy.mockClear()
    mount({ mode: 'gradient', value: GRAD_VALUE })
    expect(warnSpy.mock.calls.filter(isDesignerHint).length).toBe(0)
  })

  it('core-only：默认面板不渲染 2D 色域 / hue 竖条 / 渐变编辑区（无 .sv2d/.hue/.grad）', () => {
    const el = mount({ value: '#ff0000' })
    expect(el.shadowRoot!.querySelector('.sv2d')).toBeNull()
    expect(el.shadowRoot!.querySelector('.hue')).toBeNull()
    expect(el.shadowRoot!.querySelector('.grad')).toBeNull()
    expect(el.shadowRoot!.querySelector('.grad-stop')).toBeNull()
    el.remove()
  })

  it('mode=gradient 配置静默失效：无渐变编辑区，value 保持原样不重写', () => {
    const el = mount({ mode: 'gradient', value: GRAD_VALUE })
    // 能力缺失 → 模板不含渐变节点，面板保持 core 结构
    expect(el.shadowRoot!.querySelector('.grad')).toBeNull()
    expect(el.shadowRoot!.querySelector('.sv2d')).toBeNull()
    // value 属性原样保留（component 不崩溃、不改写）
    expect(el.getAttribute('value')).toBe(GRAD_VALUE)
    el.remove()
  })

  it('core-only：mode=gradient 下交互按单色语义走（预设点击写入单色 value）', () => {
    const el = mount({ mode: 'gradient', value: GRAD_VALUE, preset: '["#16a34a"]' })
    open(el)
    el.shadowRoot!.querySelector<HTMLButtonElement>('.preset')!.click()
    // 无 designer → 单色提交（非渐变串）
    expect(el.getAttribute('value')).toBe('#16a34a')
    el.remove()
  })

  it('core-only：无 mode=gradient 配置时正常渲染且不告警', () => {
    const plain = mount({ value: '#0b6cff' })
    expect(plain.shadowRoot!.querySelector('[part="trigger"]')).not.toBeNull()
    expect(warnSpy.mock.calls.filter(isDesignerHint).length).toBe(0)
  })
})
