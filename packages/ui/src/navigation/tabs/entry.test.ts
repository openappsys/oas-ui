import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASTabs } from './index.js'

// 本文件验证「主路径入口语义」（v2.5.0 L3 子路径语义修正）：
// 主路径 index.js 顶部 import manager 能力包（import 即注册），因此经
// `@oas-ui/ui/navigation/tabs` 引入时 manager 能力默认就位——context-menu 右键菜单 /
// sortable 拖拽 / editable 双击重命名 配置直接可用，无需再显式引能力包
// （恢复 2.4.0 的「任何主路径引入行为一致」语义）。
// 纯核（/core 子路径不含能力）的边界由 ./core-entry.test.ts 单独覆盖。
// vitest 按文件隔离模块图，本文件独享一份「index 即含能力」的注册表起点。

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

function mountEditable(): OASTabs {
  const el = new OASTabs()
  el.innerHTML = `
    <oas-tab-panel label="文档一" value="a" editable><p>内容一</p></oas-tab-panel>
    <oas-tab-panel label="文档二" value="b"><p>内容二</p></oas-tab-panel>
  `
  document.body.appendChild(el)
  return el
}

function rightClickTab(el: OASTabs, value: string): void {
  const tab = el.shadowRoot!.querySelector(`[role="tab"][data-value="${value}"]`) as HTMLElement
  tab.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 200, clientY: 100 }))
}

describe('OASTabs 主路径入口（index 内含 manager 能力）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('context-menu：仅 import 主路径即可右键弹菜单（6 项，part=context-menu）', () => {
    const el = mount({ 'context-menu': '' })
    rightClickTab(el, 'b')
    const menu = el.shadowRoot!.querySelector('.ctx-menu') as HTMLElement
    expect(menu).not.toBeNull()
    expect(menu.hidden).toBe(false)
    expect(menu.getAttribute('part')).toBe('context-menu')
    const items = [...menu.querySelectorAll<HTMLElement>('.ctx-item')]
    expect(items.length).toBe(6)
    expect(items[0]!.textContent).toBe('新建')
  })

  it('sortable：仅 import 主路径即可拖拽（draggable=true，拖拽落点派发 oas-reorder）', () => {
    const el = mount({ sortable: '' })
    const tabs = el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"][data-value]')
    tabs.forEach((t) => expect(t.getAttribute('draggable')).toBe('true'))
    let fired = 0
    el.addEventListener('oas-reorder', () => fired++)
    const dataTransfer = {
      setData: () => {},
      getData: () => 'a',
      effectAllowed: '',
      dropEffect: '',
    } as unknown as DataTransfer
    tabs[0]!.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dataTransfer as DataTransfer }))
    tabs[1]!.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dataTransfer as DataTransfer }))
    expect(fired).toBe(1)
  })

  it('editable：仅 import 主路径即可双击进入重命名编辑态', () => {
    const el = mountEditable()
    const tabA = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
    tabA.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = tabA.querySelector<HTMLInputElement>('.tab-rename-input')
    expect(input).not.toBeNull()
    expect(input!.value).toBe('文档一')
  })
})
