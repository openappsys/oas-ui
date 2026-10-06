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

describe('玻璃边缘折射 v1：controls/nav/notification 消费', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('9 个范围组件消费 --oas-glass-refraction（缺省回落 none 零副作用）', () => {
    // 直接读样式文本断言（消费行存在性；滤镜缺省 none 不改变默认渲染）
    const files: Array<[string, string]> = [
      ['oas-button', 'basic/button/oas-button.ts'],
      ['oas-switch', 'form/switch/oas-switch.ts'],
      ['oas-slider', 'form/slider/oas-slider.ts'],
      ['oas-app-bar', 'navigation/app-bar/oas-app-bar.ts'],
      ['oas-bottom-navigation', 'navigation/bottom-navigation/oas-bottom-navigation.ts'],
      ['oas-message', 'feedback/message/oas-message.ts'],
      ['oas-toast', 'feedback/toast/oas-toast.ts'],
      ['oas-snackbar', 'feedback/snackbar/oas-snackbar.ts'],
      ['oas-notification', 'feedback/notification/oas-notification.ts'],
    ]
    for (const [name, rel] of files) {
      const src = readFileSync(resolve(import.meta.dirname, `../../../../packages/ui/src/${rel}`), 'utf8')
      expect(src, `[${name}] 缺 --oas-glass-refraction 消费`).toContain('filter: var(--oas-glass-refraction, none)')
    }
  })

  it('范围纪律：内容面板（modal/drawer/popover + select 全族）不进折射 v1', () => {
    const out: Array<[string, string]> = [
      ['oas-modal', 'feedback/modal/oas-modal.ts'],
      ['oas-drawer', 'feedback/drawer/oas-drawer.ts'],
      ['oas-popover', 'feedback/popover/oas-popover.ts'],
      ['oas-select', 'form/select/oas-select.ts'],
      ['oas-cascader', 'form/cascader/oas-cascader.ts'],
      ['oas-tree-select', 'form/tree-select/oas-tree-select.ts'],
      ['oas-date-picker', 'form/date-picker/oas-date-picker.ts'],
      ['oas-time-picker', 'form/time-picker/oas-time-picker.ts'],
      ['oas-color-picker', 'form/color-picker/oas-color-picker.ts'],
      ['oas-combobox', 'form/combobox/oas-combobox.ts'],
      ['oas-auto-complete', 'form/auto-complete/oas-auto-complete.ts'],
      ['oas-mentions', 'form/mentions/oas-mentions.ts'],
    ]
    for (const [name, rel] of out) {
      const src = readFileSync(resolve(import.meta.dirname, `../../../../packages/ui/src/${rel}`), 'utf8')
      expect(src, `[${name}] 不得进折射 v1（范围纪律）`).not.toContain('--oas-glass-refraction')
    }
  })

  it('app-bar 溢出弹层打开期间关折射（filter 非 none 会把弹层裁进滤镜区域——review 实抓回归锁）', () => {
    const src = readFileSync(
      resolve(import.meta.dirname, '../../../../packages/ui/src/navigation/app-bar/oas-app-bar.ts'),
      'utf8',
    )
    expect(src).toContain(':host([data-more-open])')
    expect(src).toContain("this.setAttribute('data-more-open', '')")
    expect(src).toContain("this.removeAttribute('data-more-open')")
  })

  it('禁用关折射跨组件统一：switch button[disabled] + slider 双伪元素 disabled 守卫（UA 伪元素无 computed 通道，锁源码形态）', () => {
    const sw = readFileSync(
      resolve(import.meta.dirname, '../../../../packages/ui/src/form/switch/oas-switch.ts'),
      'utf8',
    )
    expect(sw).toMatch(/button\[disabled\]\s*\{[^}]*filter:\s*none/)
    const slider = readFileSync(
      resolve(import.meta.dirname, '../../../../packages/ui/src/form/slider/oas-slider.ts'),
      'utf8',
    )
    expect(slider).toContain('input:disabled::-webkit-slider-thumb')
    expect(slider).toContain('input:disabled::-moz-range-thumb')
    // webkit/moz 守卫必须分条书写（合并选择器遇到不认识的伪元素整条失效）
    expect(slider).toMatch(/input:disabled::-webkit-slider-thumb\s*\{\s*filter:\s*none/)
    expect(slider).toMatch(/input:disabled::-moz-range-thumb\s*\{\s*filter:\s*none/)
  })

  it('glass.css 定义 --oas-glass-refraction：data-URI 自包含滤镜（shadow 内可解析）且仅在 data-glass 作用域', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../../../packages/theme/glass.css'), 'utf8')
    // data-URI 内联 SVG：url(#id) 片段引用在 shadow DOM 内无法跨树解析（实测静默忽略），
    // 自包含 data-URI 是唯一能穿透 shadow 边界的滤镜引用方式
    expect(css).toContain('--oas-glass-refraction: url("data:image/svg+xml,')
    expect(css).toContain('feDisplacementMap')
    // 硬约束①：discrete 阈值归一（alpha≥0.5→1）——半透明玻璃面与不透明面统一实心剪影，
    // 「中心恒不变形」与表面透明度无关的前提（不归一则玻璃面中心偏离中性，review 实抓）
    expect(css).toContain("type='discrete'")
    expect(css).toContain("tableValues='0%201'")
    // 硬约束②：法向位移——Sobel 双卷积把轮廓梯度编入 R/G 通道（bias 0.5 中性），
    // feDisplacementMap 按 R/G 双通道取位移矢量：每个边缘带沿自身法线微膨胀（非 45° 对角拖影）
    expect(css).toContain('feConvolveMatrix')
    expect(css).toContain("bias='0.5'")
    expect(css).toContain("xChannelSelector='R'")
    expect(css).toContain("yChannelSelector='G'")
    // 硬约束③：scale=10——膨胀峰值实测 ±4px（外包络宽高各 +8px，控制视觉膨胀与热区偏差）
    expect(css).toContain("scale='10'")
    // 硬约束④：滤镜区域横向 -50%/200%、纵向 -100%/300%——投影主下探（shadow-md 尾部约 40px），
    // 矮元素（message box 约 36px 高）纵向 -50% 缓冲仍可能切在衰减段（review 两轮实抓）
    expect(css).toContain("x='-50%25'")
    expect(css).toContain("width='200%25'")
    expect(css).toContain("y='-100%25'")
    expect(css).toContain("height='300%25'")
    expect(css).toContain('[data-glass]')
  })
})
