import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASColorPicker } from './index.js'

// 本文件验证「designer 能力晚加入（late-join）」：宿主构造时能力注册表为空，
// 之后能力包才注册（入口求值顺序、打包器重排、按需反向引入、动态 import 等场景）。
// 2D 色域/渐变编辑区由 template() 在首渲染一次性输出，因此补齐注入须发生在宿主连接渲染前
// （construct → import → connect 顺序）；已连接后再 import 的能力 attach 就绪但模板已定，
// designer 结构不会追补（组件按能力注册前结构渲染，属设计边界，本文件只覆盖可补齐路径）。
// vitest 按文件隔离模块图，本文件独享一份空注册表起点（首个动态 import 前 designer 未注册）。
// DOM 可观察标记：`.sv2d`/`.hue`（designer 专属结构，core-only 模板不含）。

describe('OASColorPicker designer 能力晚加入（late-join）', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    document.body.innerHTML = ''
    warnSpy.mockRestore()
  })

  it('构造后才注册的 designer 能力应在连接渲染时补齐（首帧模板含 2D 色域/渐变区）', async () => {
    const el = new OASColorPicker()
    el.setAttribute('value', '#ff0000')
    // 构造时注册表为空：connect 前无 designer 结构（shadow 尚未渲染）

    // 晚加入：动态 import designer 能力包（模拟入口求值顺序/打包器重排/按需反向引入）
    await import('./designer/index.js')

    // 连接渲染：catch-up attach 先于基类 render → designerCap 就位 → 模板含 .sv2d/.hue/.grad
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('.sv2d')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('.hue')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('.grad')).not.toBeNull()
    el.remove()
  })

  it('断开的宿主退订：重连仍经 catch-up 补齐（多次重连幂等、designer 结构不重复）', () => {
    // 注册表已含 designer（上一条用例已 import）：构造快照即注入，首渲染即带 designer 结构
    const el = new OASColorPicker()
    el.setAttribute('value', '#ff0000')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('.sv2d')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('.grad')).not.toBeNull()
    // 多次断开/重连：connectedCallback 重新订阅 + catch-up attach（attachedCaps 幂等去重），
    // designer 结构恰好一份（无重复注入导致的重复节点/监听）
    for (let i = 0; i < 2; i++) {
      el.remove()
      document.body.appendChild(el)
    }
    expect(el.shadowRoot!.querySelectorAll('.sv2d').length).toBe(1)
    expect(el.shadowRoot!.querySelectorAll('.grad').length).toBe(1)
    el.remove()
  })
})
