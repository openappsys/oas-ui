import { readFileSync, readdirSync } from 'node:fs'
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
 * 磨砂玻璃 L1：浮层 surface 统一接线共享测试。
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

describe('磨砂玻璃 L1：浮层 surface 接线', () => {
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

  it('浅色玻璃阴影带发丝线（白底面板边缘不消失；dark 段不加——范围纪律）', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../../../packages/theme/glass.css'), 'utf8')
    const darkIdx = css.indexOf('[data-theme="dark"]')
    const lightPart = darkIdx > 0 ? css.slice(0, darkIdx) : css
    const darkPart = darkIdx > 0 ? css.slice(darkIdx) : ''
    // 浅色 surface 白叠白 + 白色折光边 → 白底上边界消失（用户实抓）；发丝线隐入 busy 投影不可见
    expect(lightPart).toContain('0 0 0 1px rgba(0, 0, 0,')
    expect(darkPart, 'dark 阴影段不得加发丝线（范围纪律：只修浅色白底场景）').not.toContain('0 0 0 1px')
  })

  it('浅色玻璃结构线（border token）为深色发丝（白面板上内部隔断不消失；dark 段保持白色结构线）', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../../../packages/theme/glass.css'), 'utf8')
    const darkIdx = css.indexOf('[data-theme="dark"]')
    const lightPart = darkIdx > 0 ? css.slice(0, darkIdx) : css
    const darkPart = darkIdx > 0 ? css.slice(darkIdx) : ''
    // modal 标题/底部分割线走 border token——白色版在白面板上消失（用户实抓：浅色无分割线、暗色有）；
    // 折光边职责归 --oas-glass-ring（白色 outline），结构线与折光边分工（iOS 浅色半透明面板同款）
    expect(lightPart).toContain('--oas-color-border: rgba(0, 0, 0,')
    expect(darkPart).toContain('--oas-color-border: rgba(255, 255, 255,')
  })
})

describe('玻璃跨浏览器一致性：不依赖浏览器专属位移滤镜', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('玻璃控件源码不消费 --oas-glass-refraction（Chromium 执行 / Firefox 忽略会造成外观分叉）', () => {
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
      const source = readFileSync(resolve(import.meta.dirname, `../../../../packages/ui/src/${rel}`), 'utf8')
      expect(source, `[${name}] 不得再消费位移折射滤镜`).not.toContain('--oas-glass-refraction')
    }
  })

  it('glass.css 不再定义位移折射滤镜（保留 blur / ring / sheen 跨浏览器材质）', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../../../packages/theme/glass.css'), 'utf8')
    expect(css).not.toContain('--oas-glass-refraction')
    expect(css).not.toContain('feDisplacementMap')
    expect(css).toContain('--oas-glass-blur:')
    expect(css).toContain('--oas-glass-ring:')
    expect(css).toContain('--oas-glass-sheen:')
  })

  it('app-bar 不再维护折射防裁切标记（滤镜移除后不留死钩子）', () => {
    const src = readFileSync(
      resolve(import.meta.dirname, '../../../../packages/ui/src/navigation/app-bar/oas-app-bar.ts'),
      'utf8',
    )
    expect(src).not.toMatch(/data-glass/)
    expect(src).not.toContain('data-panel-open')
  })

  it('玻璃消费点纪律：组件源码只允许 var 消费行（零规则体/零标记属性/零高光逻辑）', () => {
    // B 档契约：动态层（高光样式 + 命中标记 + 状态镜像）全部由 @oas-ui/theme/glass-fluid.js 注入；
    // 组件只保留「主题变量消费」——不引 glass 层时回落 none/transparent 零影响。
    const glassDir = resolve(import.meta.dirname, '../../../../packages/ui/src')
    const files: string[] = []
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = resolve(dir, e.name)
        if (e.isDirectory()) walk(p)
        else if (e.name.startsWith('oas-') && e.name.endsWith('.ts') && !e.name.includes('.test.')) files.push(p)
      }
    }
    walk(glassDir)
    const ALLOWED = [
      /--oas-glass-blur/,
      /--oas-glass-ring/,
      /^\/\*/, // 块注释行
      /^\*/,
      /^\/\//, // 行注释
    ]
    for (const f of files) {
      const source = readFileSync(f, 'utf8')
      const lines = source.split('\n')
      lines.forEach((line, i) => {
        if (!/glass/i.test(line)) return
        const ok = ALLOWED.some((re) => re.test(line.trim()))
        expect(
          ok,
          `[${f.replace(glassDir, 'src')}:${i + 1}] 组件内不得出现玻璃规则体/标记（只允许 var 消费行）：${line.trim()}`,
        ).toBe(true)
      })
      expect(source, `[${f}] 不得含 data-glass* 标记属性`).not.toMatch(/data-glass/)
      expect(source, `[${f}] 不得含玻璃高光规则（sheen）`).not.toContain('oas-glass-sheen')
    }
  })

  it('prefers-reduced-transparency 回退实心并关闭模糊/折光边/高光', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../../../packages/theme/glass.css'), 'utf8')
    const idx = css.indexOf('prefers-reduced-transparency')
    expect(idx).toBeGreaterThan(0)
    const block = css.slice(idx)
    expect(block).toContain('--oas-glass-blur: none')
    expect(block).toContain('--oas-glass-ring: transparent')
    expect(block).toContain('--oas-glass-sheen: transparent')
    expect(block).toContain('--oas-color-bg: #ffffff')
    expect(block).toContain('--oas-color-bg: #18181b')
  })

  it('glass.css 定义动态流动感高光变量（sheen/半径/按压档，明暗双段）', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../../../packages/theme/glass.css'), 'utf8')
    expect(css).toContain('--oas-glass-sheen:')
    expect(css).toContain('--oas-glass-sheen-size:')
    expect(css).toContain('--oas-glass-sheen-press:')
    const darkIdx = css.indexOf('[data-theme="dark"]')
    expect(darkIdx).toBeGreaterThan(0)
    expect(css.slice(darkIdx), 'dark 段应有独立 sheen 档').toContain('--oas-glass-sheen:')
  })
})
