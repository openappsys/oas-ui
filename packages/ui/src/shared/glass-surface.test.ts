import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, afterEach } from 'vitest'
import { OASModal } from '../feedback/modal/index.js'
import { OASDrawer } from '../feedback/drawer/index.js'
import { OASPopover } from '../feedback/popover/index.js'
import { OASPopconfirm } from '../feedback/popconfirm/index.js'
import { OAStooltip } from '../feedback/tooltip/index.js'
import { OASHoverCard } from '../feedback/hover-card/index.js'
import { OASDropdown } from '../navigation/dropdown/index.js'
import { OASContextMenu } from '../navigation/contextmenu/index.js'
import { OASMessage } from '../feedback/message/index.js'
import { OASNotification } from '../feedback/notification/index.js'
import { OASToast } from '../feedback/toast/index.js'
import { OASSnackbar } from '../feedback/snackbar/index.js'
import { OASBottomSheet } from '../feedback/bottom-sheet/index.js'
import { OASSelect } from '../form/select/index.js'
import { OASCascader } from '../form/cascader/index.js'
import { OASTreeSelect } from '../form/tree-select/index.js'
import { OASDatePicker } from '../form/date-picker/index.js'
import { OASTimePicker } from '../form/time-picker/index.js'
import { OASColorPicker } from '../form/color-picker/index.js'
import { OASCombobox } from '../form/combobox/index.js'
import { OASAutoComplete } from '../form/auto-complete/index.js'
import { OASMentions } from '../form/mentions/index.js'
import { OASTour } from '../navigation/tour/index.js'
import { OASAppBar } from '../navigation/app-bar/index.js'
import { OASBottomNavigation } from '../navigation/bottom-navigation/index.js'

/**
 * 液态玻璃 L1：浮层 surface 统一接线共享测试。
 *
 * 每个浮层 surface 组件（容器级弹层面板/卡片本体，行级/长列表不接）的 shadow
 * 样式必须消费 `--oas-glass-blur` / `--oas-glass-ring` 两个效果变量（缺省值
 * 天然无效：blur 回落 none、ring 回落 transparent——不引 glass.css 时零影响）。
 */

/** 25 个浮层 surface 组件：[显示名, 工厂] */
const SURFACES: Array<[string, () => { new (): HTMLElement }]> = [
  ['modal', () => OASModal],
  ['drawer', () => OASDrawer],
  ['popover', () => OASPopover],
  ['popconfirm', () => OASPopconfirm],
  ['tooltip', () => OAStooltip],
  ['hover-card', () => OASHoverCard],
  ['dropdown', () => OASDropdown],
  ['context-menu', () => OASContextMenu],
  ['message', () => OASMessage],
  ['notification', () => OASNotification],
  ['toast', () => OASToast],
  ['snackbar', () => OASSnackbar],
  ['bottom-sheet', () => OASBottomSheet],
  ['select', () => OASSelect],
  ['cascader', () => OASCascader],
  ['tree-select', () => OASTreeSelect],
  ['date-picker', () => OASDatePicker],
  ['time-picker', () => OASTimePicker],
  ['color-picker', () => OASColorPicker],
  ['combobox', () => OASCombobox],
  ['auto-complete', () => OASAutoComplete],
  ['mentions', () => OASMentions],
  ['tour', () => OASTour],
  ['app-bar', () => OASAppBar],
  ['bottom-navigation', () => OASBottomNavigation],
]

function mount(Ctor: new () => HTMLElement): HTMLElement {
  const el = new Ctor()
  document.body.appendChild(el)
  return el
}

/** 组件 shadow 内首个 style 的文本（各组件模板均为单 style 节点） */
function styleText(el: HTMLElement): string {
  const style = el.shadowRoot?.querySelector('style')
  expect(style, `${el.localName} 应有 shadow style`).toBeTruthy()
  return style!.textContent ?? ''
}

describe('液态玻璃 L1：浮层 surface 接线', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('25 个 surface 组件均消费 --oas-glass-blur / --oas-glass-ring（漏接即红）', () => {
    for (const [name, Ctor] of SURFACES) {
      const el = mount(Ctor())
      const css = styleText(el)
      expect(css, `[${name}] 缺 backdrop-filter 消费`).toContain('backdrop-filter: var(--oas-glass-blur, none)')
      expect(css, `[${name}] 缺 -webkit-backdrop-filter 消费`).toContain(
        '-webkit-backdrop-filter: var(--oas-glass-blur, none)',
      )
      expect(css, `[${name}] 缺玻璃环 outline 消费`).toContain('outline: 1px solid var(--oas-glass-ring, transparent)')
      expect(css, `[${name}] 缺 outline-offset`).toContain('outline-offset: -1px')
      el.remove()
    }
  })

  it('默认态零影响：不引 glass.css 时 computed 为 blur=none / ring 透明（modal/message/select 代表）', () => {
    // [组件, shadow 内 surface 查询器]
    const reps: Array<[new () => HTMLElement, string]> = [
      [OASModal, '.dialog'],
      [OASMessage, '.box'],
      [OASSelect, '.dropdown'],
    ]
    for (const [Ctor, sel] of reps) {
      const el = mount(Ctor)
      const surface = el.shadowRoot!.querySelector<HTMLElement>(sel)
      expect(surface, `${el.localName} ${sel} 应存在`).toBeTruthy()
      const cs = getComputedStyle(surface!)
      expect(cs.backdropFilter, `${el.localName} 默认 backdrop-filter`).toBe('none')
      expect(cs.outlineColor, `${el.localName} 默认 outline-color`).toBe('transparent')
      el.remove()
    }
  })

  it('glass.css 皮肤包：效果变量定义 + [data-glass] 激活 + high-contrast 排除', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../../../packages/theme/glass.css'), 'utf8')
    expect(css).toContain('--oas-glass-blur:')
    expect(css).toContain('--oas-glass-ring:')
    expect(css).toContain('[data-glass]')
    // high-contrast 主题下不启用（实心可访问性档优先；引号风格不耦合 formatter）
    expect(css).toContain(':not([data-theme=')
    expect(css).toContain('high-contrast')
  })
})
