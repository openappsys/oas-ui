import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import {
  OASActionBar,
  OASActionBarButton,
  OASActionBarWell,
  OASStatisticWell,
  OASTaskProgressWell,
  OASTransportWell,
  OASMusicWell,
} from './index.js'

/**
 * oas-action-bar（操作栏）+ button/well/statistic-well/task-progress-well/
 * transport-well/music-well 子件单元测试。
 *
 * happy-dom 限制：CSS 类样式不进 element.style、getComputedStyle 不解析 var()——
 * 三表体/tint/按压态等视觉断言走「属性钩子 + 内联变量 + shadow 内 style 文本」路径。
 */

type MountOptions<T> = {
  attrs?: Record<string, string>
  html?: string
  Ctor?: new () => T
}

function mount<T extends HTMLElement = OASActionBar>(opts: MountOptions<T> = {}): T {
  const Ctor = (opts.Ctor ?? OASActionBar) as new () => T
  const el = new Ctor()
  for (const [k, v] of Object.entries(opts.attrs ?? {})) el.setAttribute(k, v)
  if (opts.html) el.innerHTML = opts.html
  document.body.appendChild(el)
  return el
}

const barPart = (el: OASActionBar): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
const btnPart = (el: OASActionBarButton): HTMLButtonElement =>
  el.shadowRoot!.querySelector<HTMLButtonElement>('[part="button"]')!
const wellPart = (
  el: OASActionBarWell | OASStatisticWell | OASTaskProgressWell | OASTransportWell | OASMusicWell,
): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="well"]')!
const cancelBtn = (el: OASTaskProgressWell): HTMLButtonElement =>
  el.shadowRoot!.querySelector<HTMLButtonElement>('[part="well-cancel"]')!
const progressbar = (el: OASTaskProgressWell): HTMLElement =>
  el.shadowRoot!.querySelector<HTMLElement>('[role="progressbar"]')!
const progressFill = (el: OASTaskProgressWell): HTMLElement =>
  el.shadowRoot!.querySelector<HTMLElement>('[part="well-fill"]')!

function styleText(el: HTMLElement): string {
  return el.shadowRoot!.querySelector('style')!.textContent!
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

// ===== action-bar 容器 =====

describe('OASActionBar 容器', () => {
  it('role=group + aria-label（内置文案走 t()），随 locale 切换——降级取舍：center 槽常规承载读数井（progressbar/aria-live 非命令控件），不满足 toolbar 的 roving 契约前提，group 语义诚实', () => {
    const el = mount()
    expect(barPart(el).getAttribute('role')).toBe('group')
    expect(barPart(el).getAttribute('aria-label')).toBe('操作栏')
    setLocale(en)
    expect(barPart(el).getAttribute('aria-label')).toBe('Action bar')
    setLocale('zh-CN')
    expect(barPart(el).getAttribute('role')).toBe('group')
  })

  it('observedAttributes 完整（含 dir）', () => {
    expect(OASActionBar.observedAttributes).toEqual(expect.arrayContaining(['theme', 'dir']))
  })

  it('theme 三表体钩子：默认 charcoal，非法值回落并 dev 告警（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount()
    expect(el.getAttribute('data-surface')).toBe('charcoal')
    el.setAttribute('theme', 'dark')
    expect(el.getAttribute('data-surface')).toBe('dark')
    el.setAttribute('theme', 'light')
    expect(el.getAttribute('data-surface')).toBe('light')
    el.setAttribute('theme', 'noir')
    expect(el.getAttribute('data-surface')).toBe('charcoal')
    expect(warn).toHaveBeenCalledTimes(1)
    el.setAttribute('theme', 'noir')
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('三表体走恒深 token（charcoal/dark 用 --oas-color-ink*，light 用主题 bg）', () => {
    const el = mount()
    const css = styleText(el)
    expect(css).toContain('--oas-color-ink')
    expect(css).toContain('--oas-color-on-ink')
  })

  it('light 表体下发主题前景淡底变量给 slotted 按钮/井（本色浅底上按钮/井不消失）', () => {
    const el = mount({ attrs: { theme: 'light' } })
    const css = styleText(el)
    expect(css).toMatch(/:host\(\[data-surface='light'\]\)\s*\{[^}]*--oas-action-bar-button-bg/)
    expect(css).toMatch(/:host\(\[data-surface='light'\]\)\s*\{[^}]*--oas-action-bar-well-bg/)
  })

  it('四插槽通道：start / 默认（命令区）/ center（读数井）/ end', () => {
    const el = mount({
      html: `
        <span slot="start">起点</span>
        <span>命令</span>
        <oas-action-bar-well slot="center"></oas-action-bar-well>
        <span slot="end">终点</span>
      `,
    })
    const slots = [...el.shadowRoot!.querySelectorAll<HTMLSlotElement>('slot')]
    const named = Object.fromEntries(slots.map((s) => [s.name || 'default', s]))
    expect(named['start']!.assignedElements().length).toBe(1)
    expect(named['default']!.assignedElements().length).toBe(1)
    expect(named['center']!.assignedElements().length).toBe(1)
    expect(named['end']!.assignedElements().length).toBe(1)
  })

  it('无井时退化为纯命令条（center 无内容不塌占位——auto margin 由插槽容器承担）', () => {
    const el = mount({ html: '<span>只有命令</span>' })
    expect(el.shadowRoot!.querySelector('[part="center"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="center"]')!.hidden).toBe(true)
  })

  it('end 段推远端契约：center 隐藏时 end 用 auto margin 接棒（回归：曾固定间距贴命令区，末端语义失效）', () => {
    const el = mount({ html: '<span>命令</span><span slot="end">末端</span>' })
    const css = styleText(el)
    // end 默认 auto margin 推远端；center 可见时相邻兄弟选择器改回固定间距
    expect(css).toMatch(/\.end\s*\{[^}]*margin-inline-start:\s*auto/)
    expect(css).toMatch(/\.center:not\(\[hidden\]\)\s*\+\s*\.end\s*\{[^}]*margin-inline-start:\s*var\(--oas-space-2\)/)
    // center hidden 钩子在样式表有 display:none 承担（auto margin 对 display:none 元素失效）
    expect(css).toMatch(/\.center\[hidden\]/)
  })

  it('slotted 焦点环 + 逻辑属性布局 + token 纪律', () => {
    const el = mount({ attrs: { dir: 'rtl' } })
    expect(el.hasAttribute('data-rtl')).toBe(true)
    const css = styleText(el)
    expect(css).toContain('focus-visible')
    expect(css).toContain('focus-ring')
    expect(css).not.toMatch(/margin-left|margin-right|padding-left|padding-right/)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})

// ===== action-bar-button =====

describe('OASActionBarButton', () => {
  it('observedAttributes 完整（含 dir）', () => {
    expect(OASActionBarButton.observedAttributes).toEqual(
      expect.arrayContaining(['value', 'active', 'active-tint', 'plain', 'disabled', 'dir']),
    )
  })

  it('原生 button 承载（键盘可达），内容走插槽', () => {
    const el = mount<OASActionBarButton>({ Ctor: OASActionBarButton, attrs: { value: 'play' }, html: '播放' })
    expect(btnPart(el).tagName).toBe('BUTTON')
    expect(btnPart(el).getAttribute('type')).toBe('button')
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot')!
    expect(slot.assignedNodes().some((n) => n.textContent === '播放')).toBe(true)
  })

  it('点击派发 oas-action（detail { value, active }），active 取点击时刻状态', () => {
    const el = mount<OASActionBarButton>({ Ctor: OASActionBarButton, attrs: { value: 'record' } })
    const events: Array<{ value: string; active: boolean }> = []
    el.addEventListener('oas-action', (e) => events.push((e as CustomEvent).detail))
    btnPart(el).click()
    expect(events).toEqual([{ value: 'record', active: false }])
    el.setAttribute('active', '')
    btnPart(el).click()
    expect(events[1]).toEqual({ value: 'record', active: true })
  })

  it('active 钩子 data-active（CSS 选中态），tint 值预设名解析为 preset token', () => {
    const el = mount<OASActionBarButton>({
      Ctor: OASActionBarButton,
      attrs: { active: '', 'active-tint': 'red' },
    })
    expect(el.hasAttribute('data-active')).toBe(true)
    expect(el.style.getPropertyValue('--oas-action-bar-active-tint')).toBe('var(--oas-preset-red)')
  })

  it('tint 任意色值原样注入（宿主显式给定值优先即胜）', () => {
    const el = mount<OASActionBarButton>({ Ctor: OASActionBarButton, attrs: { 'active-tint': '#e11d48' } })
    expect(el.style.getPropertyValue('--oas-action-bar-active-tint')).toBe('#e11d48')
  })

  it('tint 移除后变量撤除', () => {
    const el = mount<OASActionBarButton>({ Ctor: OASActionBarButton, attrs: { 'active-tint': 'blue' } })
    el.removeAttribute('active-tint')
    expect(el.style.getPropertyValue('--oas-action-bar-active-tint')).toBe('')
  })

  it('disabled 透传原生 button + aria-disabled', () => {
    const el = mount<OASActionBarButton>({ Ctor: OASActionBarButton, attrs: { disabled: '' } })
    expect(btnPart(el).disabled).toBe(true)
    expect(btnPart(el).getAttribute('aria-disabled')).toBe('true')
  })

  it('plain 钩子 data-plain（组内无填充）', () => {
    const el = mount<OASActionBarButton>({ Ctor: OASActionBarButton, attrs: { plain: '' } })
    expect(el.hasAttribute('data-plain')).toBe(true)
  })

  it('选中态样式选择器挂在宿主（:host([data-active]) .btn），不得写 .btn[data-active]（选中态无视觉回归）', () => {
    const el = mount<OASActionBarButton>({ Ctor: OASActionBarButton, attrs: { active: '' } })
    const css = styleText(el)
    expect(css).toContain(':host([data-active]) .btn')
    // data-active 挂在宿主，内部 .btn[data-active] 永远不匹配——出现即为回归
    expect(css).not.toMatch(/\.btn\[data-active\]/)
  })

  it('dir=rtl 钩子 + token 纪律（按压态含 color-mix transparent 先例合规）', () => {
    const el = mount<OASActionBarButton>({ Ctor: OASActionBarButton, attrs: { dir: 'rtl' } })
    expect(el.hasAttribute('data-rtl')).toBe(true)
    const css = styleText(el)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).toContain('--oas-color-ink')
  })
})

// ===== action-bar-well =====

describe('OASActionBarWell', () => {
  it('observedAttributes 完整（含 dir）', () => {
    expect(OASActionBarWell.observedAttributes).toEqual(expect.arrayContaining(['max-width', 'dir']))
  })

  it('max-width 写入内联变量（默认 320 兜底在样式表）', () => {
    const el = mount<OASActionBarWell>({ Ctor: OASActionBarWell, attrs: { 'max-width': '240' } })
    expect(el.style.getPropertyValue('--oas-action-bar-well-max-width')).toBe('240px')
    expect(styleText(el)).toContain('320px')
    el.removeAttribute('max-width')
    expect(el.style.getPropertyValue('--oas-action-bar-well-max-width')).toBe('')
  })

  it('非法 max-width 忽略（不写变量）', () => {
    const el = mount<OASActionBarWell>({ Ctor: OASActionBarWell, attrs: { 'max-width': 'abc' } })
    expect(el.style.getPropertyValue('--oas-action-bar-well-max-width')).toBe('')
  })

  it('负值 clamp 到 0', () => {
    const el = mount<OASActionBarWell>({ Ctor: OASActionBarWell, attrs: { 'max-width': '-5' } })
    expect(el.style.getPropertyValue('--oas-action-bar-well-max-width')).toBe('0px')
  })

  it('dir=rtl 钩子 + token 纪律', () => {
    const el = mount<OASActionBarWell>({ Ctor: OASActionBarWell, attrs: { dir: 'rtl' } })
    expect(el.hasAttribute('data-rtl')).toBe(true)
    expect(styleText(el)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})

// ===== statistic-well =====

describe('OASStatisticWell', () => {
  it('observedAttributes 完整（含 dir）', () => {
    expect(OASStatisticWell.observedAttributes).toEqual(expect.arrayContaining(['label', 'value', 'detail', 'dir']))
  })

  it('label/value/detail 渲染，空段隐藏（无空占位）', () => {
    const el = mount<OASStatisticWell>({ Ctor: OASStatisticWell, attrs: { label: '帧率', value: '25 fps' } })
    const parts = el.shadowRoot!.querySelectorAll<HTMLElement>('[part]')
    const byPart = Object.fromEntries([...parts].map((p) => [p.getAttribute('part')!, p]))
    expect(byPart['well-label']!.textContent).toBe('帧率')
    expect(byPart['well-value']!.textContent).toBe('25 fps')
    expect(byPart['well-detail']!.hidden).toBe(true)
    el.setAttribute('detail', 'Rec. 709')
    expect(byPart['well-detail']!.hidden).toBe(false)
  })

  it('全空态：宿主打 data-empty 反射（label/value/detail 全缺）——回归：空井曾留固定高胶囊占位（32px 圆角底不可见但占布局）', () => {
    const el = mount<OASStatisticWell>({ Ctor: OASStatisticWell })
    expect(el.hasAttribute('data-empty'), '全空时宿主打 data-empty').toBe(true)
    expect(styleText(el), '宿主级 display:none 规则就位').toMatch(/:host\(\[data-empty\]\)\s*\{[^}]*display:\s*none/)
    // 任一段落在场即恢复
    el.setAttribute('value', '25 fps')
    expect(el.hasAttribute('data-empty')).toBe(false)
    el.removeAttribute('value')
    expect(el.hasAttribute('data-empty')).toBe(true)
    el.setAttribute('label', '帧率')
    expect(el.hasAttribute('data-empty')).toBe(false)
  })

  it('井读数 aria-live=polite（进度/状态变化可读）', () => {
    const el = mount<OASStatisticWell>({ Ctor: OASStatisticWell, attrs: { value: '1' } })
    expect(wellPart(el).getAttribute('aria-live')).toBe('polite')
  })

  it('数值 tabular-nums（等宽对齐）', () => {
    const el = mount<OASStatisticWell>({ Ctor: OASStatisticWell, attrs: { value: '1' } })
    expect(styleText(el)).toContain('tabular-nums')
  })

  it('dir=rtl 钩子 + token 纪律', () => {
    const el = mount<OASStatisticWell>({ Ctor: OASStatisticWell, attrs: { dir: 'rtl' } })
    expect(el.hasAttribute('data-rtl')).toBe(true)
    expect(styleText(el)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})

// ===== task-progress-well =====

describe('OASTaskProgressWell', () => {
  it('observedAttributes 完整（含 dir）', () => {
    expect(OASTaskProgressWell.observedAttributes).toEqual(
      expect.arrayContaining(['label', 'progress', 'detail', 'dir']),
    )
  })

  it('progress 渲染：progressbar aria 三件套 + fill 宽度内联 + 百分比文本', () => {
    const el = mount<OASTaskProgressWell>({ Ctor: OASTaskProgressWell, attrs: { label: '导出', progress: '40' } })
    expect(progressbar(el).getAttribute('aria-valuenow')).toBe('40')
    expect(progressbar(el).getAttribute('aria-valuemin')).toBe('0')
    expect(progressbar(el).getAttribute('aria-valuemax')).toBe('100')
    expect(progressFill(el).style.width).toBe('40%')
    const text = el.shadowRoot!.querySelector<HTMLElement>('[part="well-progress-text"]')!
    expect(text.textContent).toBe('40%')
  })

  it('progress clamp 0-100，非法值回落 0', () => {
    const el = mount<OASTaskProgressWell>({ Ctor: OASTaskProgressWell, attrs: { progress: '150' } })
    expect(progressbar(el).getAttribute('aria-valuenow')).toBe('100')
    el.setAttribute('progress', 'abc')
    expect(progressbar(el).getAttribute('aria-valuenow')).toBe('0')
    el.setAttribute('progress', '-3')
    expect(progressbar(el).getAttribute('aria-valuenow')).toBe('0')
  })

  it('进度 100% 保留完成态（组件不自行移除，宿主决定隐藏）', () => {
    const el = mount<OASTaskProgressWell>({ Ctor: OASTaskProgressWell, attrs: { progress: '100' } })
    expect(progressbar(el).getAttribute('aria-valuenow')).toBe('100')
    expect(wellPart(el).hidden).toBe(false)
  })

  it('cancel 钮派发 oas-cancel（detail { label }），aria-label 走 i18n', () => {
    const el = mount<OASTaskProgressWell>({ Ctor: OASTaskProgressWell, attrs: { label: '渲染中' } })
    expect(cancelBtn(el).getAttribute('aria-label')).toBe('取消任务')
    const events: Array<{ label: string }> = []
    el.addEventListener('oas-cancel', (e) => events.push((e as CustomEvent).detail))
    cancelBtn(el).click()
    expect(events).toEqual([{ label: '渲染中' }])
  })

  it('progressbar 可访问名：label 属性优先，缺省 i18n 兜底（axe aria-progressbar-name 硬闸）', () => {
    const el = mount<OASTaskProgressWell>({ Ctor: OASTaskProgressWell, attrs: { label: '导出', progress: '10' } })
    expect(progressbar(el).getAttribute('aria-label')).toBe('导出')
    const el2 = mount<OASTaskProgressWell>({ Ctor: OASTaskProgressWell, attrs: { progress: '10' } })
    expect(progressbar(el2).getAttribute('aria-label')).toBe('任务进度')
    setLocale(en)
    expect(progressbar(el2).getAttribute('aria-label')).toBe('Task progress')
    setLocale('zh-CN')
  })

  it('aria-live=polite + label 为空时隐藏标签区', () => {
    const el = mount<OASTaskProgressWell>({ Ctor: OASTaskProgressWell, attrs: { progress: '10' } })
    expect(wellPart(el).getAttribute('aria-live')).toBe('polite')
    const label = el.shadowRoot!.querySelector<HTMLElement>('[part="well-label"]')!
    expect(label.hidden).toBe(true)
  })

  it('全空态（label/detail 全缺且未设 progress）：宿主 data-empty 反射（整体退场，无布局足迹）', () => {
    const empty = mount<OASTaskProgressWell>({ Ctor: OASTaskProgressWell, attrs: {} })
    expect(empty.hasAttribute('data-empty')).toBe(true)
    // 任一内容出现即恢复（progress 在场即有意义）
    empty.setAttribute('progress', '0')
    expect(empty.hasAttribute('data-empty')).toBe(false)
    empty.removeAttribute('progress')
    expect(empty.hasAttribute('data-empty')).toBe(true)
    empty.setAttribute('label', '导出')
    expect(empty.hasAttribute('data-empty')).toBe(false)
  })

  it('dir=rtl 钩子 + token 纪律', () => {
    const el = mount<OASTaskProgressWell>({ Ctor: OASTaskProgressWell, attrs: { dir: 'rtl' } })
    expect(el.hasAttribute('data-rtl')).toBe(true)
    expect(styleText(el)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})

// ===== transport-well =====

const tcSlider = (el: OASTransportWell): HTMLElement =>
  el.shadowRoot!.querySelector<HTMLElement>('[part="well-value"]')!

function pressKey(el: OASTransportWell, key: string): void {
  tcSlider(el).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('OASTransportWell', () => {
  it('observedAttributes 完整（含 dir）', () => {
    expect(OASTransportWell.observedAttributes).toEqual(
      expect.arrayContaining(['label', 'frames', 'frame-rate', 'duration', 'detail', 'dir']),
    )
  })

  it('时间码换算：frames+frame-rate → HH:MM:SS:FF（纯展示换算，表格数字体）', () => {
    const el = mount<OASTransportWell>({ Ctor: OASTransportWell, attrs: { frames: '1079', 'frame-rate': '25' } })
    expect(tcSlider(el).textContent).toBe('00:00:43:04')
  })

  it('非法 frame-rate：时间码退化为原始帧数显示（valuetext 同步）', () => {
    const el = mount<OASTransportWell>({ Ctor: OASTransportWell, attrs: { frames: '1079', 'frame-rate': 'abc' } })
    expect(tcSlider(el).textContent).toBe('1079')
    expect(tcSlider(el).getAttribute('aria-valuetext')).toBe('1079')
  })

  it('frames 非法回落 0、负值 clamp 0', () => {
    const el = mount<OASTransportWell>({ Ctor: OASTransportWell, attrs: { frames: 'abc', 'frame-rate': '25' } })
    expect(tcSlider(el).textContent).toBe('00:00:00:00')
    el.setAttribute('frames', '-5')
    expect(tcSlider(el).textContent).toBe('00:00:00:00')
  })

  it('duration：/总时长 段 + seek 上界（frames 越界 clamp）+ valuemax 同步', () => {
    const el = mount<OASTransportWell>({
      Ctor: OASTransportWell,
      attrs: { frames: '5000', 'frame-rate': '25', duration: '1500' },
    })
    const total = el.shadowRoot!.querySelector<HTMLElement>('[part="well-total"]')!
    expect(total.textContent).toBe('/ 00:01:00:00')
    expect(total.hidden).toBe(false)
    expect(tcSlider(el).textContent, 'frames 超 duration clamp 到总帧数').toBe('00:01:00:00')
    expect(tcSlider(el).getAttribute('aria-valuemax')).toBe('1500')
    el.removeAttribute('duration')
    expect(total.hidden).toBe(true)
    expect(tcSlider(el).getAttribute('aria-valuemax'), '无 duration 时 valuemax 撤除').toBeNull()
  })

  it('detail 段自动拼帧率（25 fps）+ detail 属性，两缺则整段隐藏', () => {
    const el = mount<OASTransportWell>({
      Ctor: OASTransportWell,
      attrs: { frames: '0', 'frame-rate': '25', detail: '3840 × 2160' },
    })
    const detail = el.shadowRoot!.querySelector<HTMLElement>('[part="well-detail"]')!
    expect(detail.textContent).toBe('25 fps · 3840 × 2160')
    el.removeAttribute('frame-rate')
    expect(detail.textContent).toBe('3840 × 2160')
    el.removeAttribute('detail')
    expect(detail.hidden).toBe(true)
  })

  it('label 渲染，空时隐藏', () => {
    const el = mount<OASTransportWell>({ Ctor: OASTransportWell, attrs: { label: 'Timecode', frames: '0' } })
    const label = el.shadowRoot!.querySelector<HTMLElement>('[part="well-label"]')!
    expect(label.textContent).toBe('Timecode')
    expect(label.hidden).toBe(false)
    el.removeAttribute('label')
    expect(label.hidden).toBe(true)
  })

  it('scrub 滑轨语义：role=slider + tabindex=0 + valuenow/valuetext + aria-live=polite', () => {
    const el = mount<OASTransportWell>({ Ctor: OASTransportWell, attrs: { frames: '1079', 'frame-rate': '25' } })
    const slider = tcSlider(el)
    expect(slider.getAttribute('role')).toBe('slider')
    expect(slider.getAttribute('tabindex')).toBe('0')
    expect(slider.getAttribute('aria-valuemin')).toBe('0')
    expect(slider.getAttribute('aria-valuenow')).toBe('1079')
    expect(slider.getAttribute('aria-valuetext')).toBe('00:00:43:04')
    expect(wellPart(el).getAttribute('aria-live')).toBe('polite')
  })

  it('滑轨可访问名：label 属性优先，缺省 i18n 兜底且随 locale 切换', () => {
    const el = mount<OASTransportWell>({ Ctor: OASTransportWell, attrs: { label: 'Timecode', frames: '0' } })
    expect(tcSlider(el).getAttribute('aria-label')).toBe('Timecode')
    const el2 = mount<OASTransportWell>({ Ctor: OASTransportWell, attrs: { frames: '0' } })
    expect(tcSlider(el2).getAttribute('aria-label')).toBe('跳转到指定帧')
    setLocale(en)
    expect(tcSlider(el2).getAttribute('aria-label')).toBe('Seek to frame')
    setLocale('zh-CN')
  })

  it('键盘 seek：→ +1 帧、← -1 帧、↑ +1 秒（fps 帧）、Home 0、End 尾帧，均派发 oas-seek', () => {
    const el = mount<OASTransportWell>({
      Ctor: OASTransportWell,
      attrs: { frames: '50', 'frame-rate': '25', duration: '100' },
    })
    const events: Array<{ frames: number }> = []
    el.addEventListener('oas-seek', (e) => events.push((e as CustomEvent).detail))
    pressKey(el, 'ArrowRight')
    expect(events.at(-1)).toEqual({ frames: 51 })
    pressKey(el, 'ArrowLeft')
    expect(events.at(-1)).toEqual({ frames: 49 })
    pressKey(el, 'ArrowUp')
    expect(events.at(-1)).toEqual({ frames: 75 })
    pressKey(el, 'ArrowDown')
    expect(events.at(-1)).toEqual({ frames: 25 })
    pressKey(el, 'Home')
    expect(events.at(-1)).toEqual({ frames: 0 })
    pressKey(el, 'End')
    expect(events.at(-1)).toEqual({ frames: 100 })
  })

  it('seek 提议值 clamp：低于 0 抬到 0、超 duration 压到尾帧；无 duration 时 End 不派发', () => {
    const el = mount<OASTransportWell>({
      Ctor: OASTransportWell,
      attrs: { frames: '1', 'frame-rate': '25', duration: '10' },
    })
    const events: Array<{ frames: number }> = []
    el.addEventListener('oas-seek', (e) => events.push((e as CustomEvent).detail))
    pressKey(el, 'ArrowLeft')
    expect(events.at(-1)).toEqual({ frames: 0 })
    pressKey(el, 'ArrowDown')
    expect(events.at(-1)).toEqual({ frames: 0 })
    el.removeAttribute('duration')
    pressKey(el, 'End')
    expect(events).toHaveLength(2)
  })

  it('RTL 镜像水平方向键（→ 退帧、← 进帧），垂直键不受影响', () => {
    const el = mount<OASTransportWell>({
      Ctor: OASTransportWell,
      attrs: { frames: '50', 'frame-rate': '25', dir: 'rtl' },
    })
    const events: Array<{ frames: number }> = []
    el.addEventListener('oas-seek', (e) => events.push((e as CustomEvent).detail))
    expect(el.hasAttribute('data-rtl')).toBe(true)
    pressKey(el, 'ArrowRight')
    expect(events.at(-1)).toEqual({ frames: 49 })
    pressKey(el, 'ArrowLeft')
    expect(events.at(-1)).toEqual({ frames: 51 })
  })

  it('受控显示：键盘 seek 只发事件不自改 frames 属性（宿主回写驱动，同 task-progress progress）', () => {
    const el = mount<OASTransportWell>({ Ctor: OASTransportWell, attrs: { frames: '50', 'frame-rate': '25' } })
    pressKey(el, 'ArrowRight')
    expect(el.getAttribute('frames')).toBe('50')
    expect(tcSlider(el).getAttribute('aria-valuenow')).toBe('50')
  })

  it('全空态（label/frames/frame-rate/duration/detail 全缺）：宿主 data-empty 反射（整体退场，零足迹）', () => {
    const el = mount<OASTransportWell>({ Ctor: OASTransportWell })
    expect(el.hasAttribute('data-empty')).toBe(true)
    expect(styleText(el), '宿主级 display:none 规则就位').toMatch(/:host\(\[data-empty\]\)\s*\{[^}]*display:\s*none/)
    el.setAttribute('frames', '0')
    expect(el.hasAttribute('data-empty'), 'frames 在场即有意义（起点帧）').toBe(false)
    el.removeAttribute('frames')
    expect(el.hasAttribute('data-empty')).toBe(true)
    el.setAttribute('frame-rate', '25')
    expect(el.hasAttribute('data-empty')).toBe(false)
  })

  it('无时间数据时 value 段隐藏（不留 00:00:00:00 假读数）', () => {
    const el = mount<OASTransportWell>({ Ctor: OASTransportWell, attrs: { label: 'Timecode' } })
    expect(tcSlider(el).hidden).toBe(true)
    el.setAttribute('frames', '0')
    expect(tcSlider(el).hidden).toBe(false)
  })

  it('dir=rtl 钩子 + token 纪律（颜色全走变量）', () => {
    const el = mount<OASTransportWell>({ Ctor: OASTransportWell, attrs: { dir: 'rtl' } })
    expect(el.hasAttribute('data-rtl')).toBe(true)
    expect(styleText(el)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(styleText(el)).toContain('focus-ring')
  })
})

// ===== music-well =====

const musicValue = (el: OASMusicWell): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="well-value"]')!
const musicDetail = (el: OASMusicWell): HTMLElement =>
  el.shadowRoot!.querySelector<HTMLElement>('[part="well-detail"]')!

describe('OASMusicWell', () => {
  it('observedAttributes 完整（含 dir）', () => {
    expect(OASMusicWell.observedAttributes).toEqual(
      expect.arrayContaining(['label', 'bars', 'beats', 'tempo', 'meter', 'detail', 'dir']),
    )
  })

  it('小节.节拍位置段：bars.beats（1 起显示），bars/beats 双缺时整段隐藏', () => {
    const el = mount<OASMusicWell>({ Ctor: OASMusicWell, attrs: { bars: '5', beats: '3' } })
    expect(musicValue(el).textContent).toBe('5.3')
    expect(musicValue(el).hidden).toBe(false)
    el.removeAttribute('bars')
    expect(musicValue(el).textContent, '仅 beats 在场仍显示（bars 缺省按 1 起）').toBe('1.3')
    el.removeAttribute('beats')
    expect(musicValue(el).hidden).toBe(true)
  })

  it('bars/beats 非法/越界回落 1（位置段 1.1 起步，不出 0/负数假位置）', () => {
    const el = mount<OASMusicWell>({ Ctor: OASMusicWell, attrs: { bars: 'abc', beats: '-2' } })
    expect(musicValue(el).textContent).toBe('1.1')
  })

  it('detail 段自动拼 BPM 与拍号 + detail 属性，全缺则整段隐藏', () => {
    const el = mount<OASMusicWell>({
      Ctor: OASMusicWell,
      attrs: { tempo: '120', meter: '4/4', detail: 'Stereo' },
    })
    expect(musicDetail(el).textContent).toBe('120 BPM · 4/4 · Stereo')
    el.setAttribute('tempo', 'abc')
    expect(musicDetail(el).textContent, '非法 tempo 忽略').toBe('4/4 · Stereo')
    el.removeAttribute('meter')
    el.removeAttribute('detail')
    expect(musicDetail(el).hidden).toBe(true)
  })

  it('label 渲染，空时隐藏；井读数 aria-live=polite + 数值 tabular-nums', () => {
    const el = mount<OASMusicWell>({ Ctor: OASMusicWell, attrs: { label: 'Position', bars: '1' } })
    const label = el.shadowRoot!.querySelector<HTMLElement>('[part="well-label"]')!
    expect(label.textContent).toBe('Position')
    expect(label.hidden).toBe(false)
    el.removeAttribute('label')
    expect(label.hidden).toBe(true)
    expect(wellPart(el).getAttribute('aria-live')).toBe('polite')
    expect(styleText(el)).toContain('tabular-nums')
  })

  it('全空态（label/bars/beats/tempo/meter/detail 全缺）：宿主 data-empty 反射（整体退场，零足迹）', () => {
    const el = mount<OASMusicWell>({ Ctor: OASMusicWell })
    expect(el.hasAttribute('data-empty')).toBe(true)
    expect(styleText(el)).toMatch(/:host\(\[data-empty\]\)\s*\{[^}]*display:\s*none/)
    el.setAttribute('bars', '1')
    expect(el.hasAttribute('data-empty')).toBe(false)
    el.removeAttribute('bars')
    el.setAttribute('meter', '4/4')
    expect(el.hasAttribute('data-empty')).toBe(false)
  })

  it('dir=rtl 钩子 + token 纪律（颜色全走变量）', () => {
    const el = mount<OASMusicWell>({ Ctor: OASMusicWell, attrs: { dir: 'rtl' } })
    expect(el.hasAttribute('data-rtl')).toBe(true)
    expect(styleText(el)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
