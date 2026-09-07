import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASTabs } from './core/index.js'

// 本文件验证「纯核入口语义」（v2.5.0 L3 子路径语义修正）：
// `@oas-ui/ui/navigation/tabs/core` 是不含 manager 能力包的 core-only 入口——经它引入时
// context-menu / sortable / editable 配置静默失效 + dev 告警一次（同值去重），
// 与 oas-tabs-manager-capability.test.ts 覆盖的 core-only 语义一致。
// 注意：不得在此文件 import './manager/index.js' 或 './index.js'——否则能力注册表被填充。
// vitest 按文件隔离模块图，本文件独享一份空注册表起点。
//
// 告警去重是模块级（同控件惯例：同值告警整页只一次），因此首个带 manager 配置的 mount
// 必须发生在「dev 告警」用例内；后续用例再挂 manager 配置不会再触发 console.warn。

function mount(attrs: Record<string, string> = {}): OASTabs {
  const el = new OASTabs()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `
    <oas-tab-panel label="标签一" value="a"><p>内容一</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
  `
  document.body.appendChild(el)
  return el
}

describe('OASTabs 纯核入口（core：不含 manager 能力）', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    document.body.innerHTML = ''
    warnSpy.mockRestore()
  })

  it('dev 告警：context-menu 配置 + core 入口 → 提示显式引能力包或换回主路径（同值去重）', () => {
    const isManagerHint = (call: unknown[]) => String(call[0]).includes('navigation/tabs/manager')
    // 首个带 manager 配置的实例：告警一次
    mount({ 'context-menu': '' })
    const first = warnSpy.mock.calls.filter(isManagerHint)
    expect(first.length, 'core 入口首张带 manager 配置的 tabs 应告警一次').toBe(1)
    expect(String(first[0]![0])).toContain('@oas-ui/ui/navigation/tabs/manager')
    // 第二个同配置实例：同值去重，不再重复告警
    warnSpy.mockClear()
    mount({ sortable: '' })
    expect(warnSpy.mock.calls.filter(isManagerHint).length).toBe(0)
  })

  it('context-menu 静默失效：core 入口下右键标签不弹菜单', () => {
    const el = mount({ 'context-menu': '' })
    const tab = el.shadowRoot!.querySelector('[role="tab"][data-value="b"]') as HTMLElement
    tab.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 200, clientY: 100 }))
    expect(el.shadowRoot!.querySelector('.ctx-menu')).toBeNull()
  })

  it('无 manager 配置时 core 入口渲染正常且不告警', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelectorAll('[role="tab"][data-value]').length).toBe(2)
    const managerWarns = warnSpy.mock.calls.filter((call: unknown[]) =>
      String(call[0]).includes('navigation/tabs/manager'),
    )
    expect(managerWarns.length).toBe(0)
  })
})
