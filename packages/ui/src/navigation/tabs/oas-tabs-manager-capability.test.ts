import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASTabs } from './index.js'

// 本文件验证「manager 能力包未 import（core-only）」的边界行为：
// context-menu 右键菜单 / sortable 拖拽排序 / editable 双击重命名 配置静默失效 + dev 告警（同值去重）。
// 注意：不得在此文件 import './manager/index.js'——否则能力注册表被填充，core-only 语义失效。
// （vitest 按文件隔离模块图，本文件与 oas-tabs.test.ts 的注册表互不影响。）
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

/** 带 editable 面板的挂载（重命名用例专用） */
function mountEditable(attrs: Record<string, string> = {}): OASTabs {
  const el = new OASTabs()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `
    <oas-tab-panel label="文档一" value="a" editable><p>内容一</p></oas-tab-panel>
    <oas-tab-panel label="文档二" value="b"><p>内容二</p></oas-tab-panel>
  `
  document.body.appendChild(el)
  return el
}

describe('OASTabs manager 能力边界（core-only：未 import manager 能力包）', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    warnSpy.mockRestore()
  })

  it('dev 告警：context-menu / sortable / editable 配置 + 未 import manager → 提示按需 import（同值去重：多实例只告警一次）', () => {
    const isManagerHint = (call: unknown[]) => String(call[0]).includes('navigation/tabs/manager')
    // 首个带 manager 配置的实例：告警一次
    mount({ 'context-menu': '' })
    const first = warnSpy.mock.calls.filter(isManagerHint)
    expect(first.length, '首张带 manager 配置的 tabs 应告警一次').toBe(1)
    expect(String(first[0]![0])).toContain('@oas-ui/ui/navigation/tabs/manager')
    // 第二个同样配置（含另一种 manager 特性）的实例：同值去重，不再重复告警
    warnSpy.mockClear()
    mountEditable({ sortable: '', 'context-menu': '' })
    expect(warnSpy.mock.calls.filter(isManagerHint).length).toBe(0)
  })

  it('context-menu 静默失效：右键标签不弹菜单', () => {
    const el = mount({ 'context-menu': '' })
    const tab = el.shadowRoot!.querySelector('[role="tab"][data-value="b"]') as HTMLElement
    tab.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 200, clientY: 100 }))
    expect(el.shadowRoot!.querySelector('.ctx-menu')).toBeNull()
    // 事件未被默认动作拦截的副作用（preventDefault 不调用 = 浏览器原生菜单不受影响）
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    tab.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(false)
  })

  it('sortable 静默失效：标签不可拖拽，拖拽落点不派发 oas-reorder', () => {
    const el = mount({ sortable: '' })
    const tabs = el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"][data-value]')
    tabs.forEach((t) => expect(t.getAttribute('draggable')).not.toBe('true'))
    let fired = 0
    el.addEventListener('oas-reorder', () => fired++)
    const dataTransfer = {
      setData: () => {},
      getData: () => 'a',
      effectAllowed: '',
      dropEffect: '',
    } as unknown as DataTransfer
    tabs[0]!.dispatchEvent(
      new DragEvent('dragstart', { bubbles: true, dataTransfer: dataTransfer as DataTransfer }),
    )
    tabs[1]!.dispatchEvent(
      new DragEvent('drop', { bubbles: true, dataTransfer: dataTransfer as DataTransfer }),
    )
    expect(fired).toBe(0)
  })

  it('editable 静默失效：双击标签不进入重命名编辑态', () => {
    const el = mountEditable()
    const tabA = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
    tabA.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(tabA.querySelector('.tab-rename-input')).toBeNull()
    expect(el.shadowRoot!.querySelector('.tab-rename-input')).toBeNull()
    // 标签文字原样保留（未被替换）
    expect(tabA.querySelector('.tab-label')!.textContent).toBe('文档一')
  })

  it('无 manager 配置时渲染正常且不告警', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelectorAll('[role="tab"][data-value]').length).toBe(2)
    const managerWarns = warnSpy.mock.calls.filter((call: unknown[]) =>
      String(call[0]).includes('navigation/tabs/manager'),
    )
    expect(managerWarns.length).toBe(0)
  })
})
