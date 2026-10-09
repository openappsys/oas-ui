import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASInspector, OASInspectorTabs, OASInspectorSection, OASInspectorRow } from './index.js'

/**
 * oas-inspector（属性检视面板）+ tabs/section/row 子件单元测试。
 *
 * happy-dom 限制：CSS 类样式不进 element.style、getComputedStyle 不解析 var()——
 * 折叠动画/密度档等视觉断言走「属性钩子 + shadow 内 style 文本」路径。
 */

type MountOptions<T> = {
  attrs?: Record<string, string>
  html?: string
  Ctor?: new () => T
}

function mount<T extends HTMLElement = OASInspector>(opts: MountOptions<T> = {}): T {
  const Ctor = (opts.Ctor ?? OASInspector) as new () => T
  const el = new Ctor()
  for (const [k, v] of Object.entries(opts.attrs ?? {})) el.setAttribute(k, v)
  if (opts.html) el.innerHTML = opts.html
  document.body.appendChild(el)
  return el
}

const panel = (el: OASInspector): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
const tabsWrap = (el: OASInspector): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="tabs"]')!
const bodyPart = (el: OASInspector): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="body"]')!
const emptyPart = (el: OASInspector): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!
const headerWrap = (el: OASInspector): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="header"]')!
const footerWrap = (el: OASInspector): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!

const tabEls = (el: OASInspectorTabs): HTMLButtonElement[] => [
  ...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
]
const tablist = (el: OASInspectorTabs): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[role="tablist"]')!

const secToggle = (el: OASInspectorSection): HTMLButtonElement =>
  el.shadowRoot!.querySelector<HTMLButtonElement>('[part="section-toggle"]')!
const secHeading = (el: OASInspectorSection): HTMLElement =>
  el.shadowRoot!.querySelector<HTMLElement>('[part="section-heading"]')!
const secBody = (el: OASInspectorSection): HTMLElement =>
  el.shadowRoot!.querySelector<HTMLElement>('[part="section-body"]')!

const rowLabel = (el: OASInspectorRow): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="row-label"]')!
const rowValue = (el: OASInspectorRow): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="row-value"]')!
const rowResetBtn = (el: OASInspectorRow): HTMLButtonElement =>
  el.shadowRoot!.querySelector<HTMLButtonElement>('[part="row-reset"]')!

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

// ===== inspector 容器 =====

describe('OASInspector 容器', () => {
  it('role=complementary + aria-label（内置文案走 t()），label 属性覆盖', () => {
    const el = mount()
    expect(panel(el).getAttribute('role')).toBe('complementary')
    expect(panel(el).getAttribute('aria-label')).toBe('属性面板')
    const el2 = mount({ attrs: { label: '变换属性' } })
    expect(panel(el2).getAttribute('aria-label')).toBe('变换属性')
  })

  it('aria-label 随 locale 切换（zh-CN ↔ en）', () => {
    const el = mount()
    setLocale(en)
    expect(panel(el).getAttribute('aria-label')).toBe('Inspector')
    setLocale('zh-CN')
  })

  it('observedAttributes 完整（含 dir）', () => {
    expect(OASInspector.observedAttributes).toEqual(
      expect.arrayContaining(['side', 'active-tab', 'density', 'empty', 'label', 'dir']),
    )
  })

  it('side 钩子：默认 right，非法值回落 right 并 dev 告警（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount()
    expect(el.getAttribute('data-side')).toBe('right')
    const el2 = mount({ attrs: { side: 'left' } })
    expect(el2.getAttribute('data-side')).toBe('left')
    el2.setAttribute('side', 'top')
    expect(el2.getAttribute('data-side')).toBe('right')
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('density 钩子：默认 default，compact 档写入行高变量（token 通道）', () => {
    const el = mount({ attrs: { density: 'compact' } })
    expect(el.getAttribute('data-density')).toBe('compact')
    const css = styleText(el)
    expect(css).toContain('--oas-inspector-row-height')
  })

  it('empty 属性：默认插槽隐藏、空态显示（含内置文案），移除后恢复', () => {
    const el = mount({ attrs: { empty: '' }, html: '<oas-inspector-section heading="变换"></oas-inspector-section>' })
    expect(bodyPart(el).hidden).toBe(true)
    expect(emptyPart(el).hidden).toBe(false)
    expect(emptyPart(el).textContent).toContain('未选中对象')
    el.removeAttribute('empty')
    expect(bodyPart(el).hidden).toBe(false)
    expect(emptyPart(el).hidden).toBe(true)
  })

  it('empty 插槽内容覆盖内置空态文案', () => {
    const el = mount({ attrs: { empty: '' }, html: '<div slot="empty">先选中一个图层</div>' })
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="empty"]')!
    expect(slot.assignedNodes().some((n) => (n.textContent ?? '').includes('先选中一个图层'))).toBe(true)
    const fallback = el.shadowRoot!.querySelector<HTMLElement>('[part="empty"] [data-fallback]')!
    expect(fallback.hidden, '有自定义内容时内置文案隐藏').toBe(true)
  })

  it('header/footer 插槽空时隐藏，有内容时显示', () => {
    const el = mount()
    expect(headerWrap(el).hidden).toBe(true)
    expect(footerWrap(el).hidden).toBe(true)
    const el2 = mount({ html: '<div slot="header">头部</div><div slot="footer">底部</div>' })
    expect(headerWrap(el2).hidden).toBe(false)
    expect(footerWrap(el2).hidden).toBe(false)
  })

  it('dir=rtl + 逻辑属性布局 + token 纪律', () => {
    const el = mount({ attrs: { dir: 'rtl' } })
    expect(el.hasAttribute('data-rtl')).toBe(true)
    const css = styleText(el)
    expect(css).not.toMatch(/margin-left|margin-right|padding-left|padding-right/)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('active-tab 双向协调：在场下发给 oas-inspector-tabs.value，子件选中变化反射回属性', () => {
    const el = mount({
      attrs: { 'active-tab': 'file' },
      html: `<oas-inspector-tabs slot="tabs" items='[{"label":"摘要","value":"summary"},{"label":"文件","value":"file"}]' value="summary"></oas-inspector-tabs>`,
    })
    const tabs = el.querySelector('oas-inspector-tabs') as OASInspectorTabs
    expect(tabs.getAttribute('value'), 'active-tab 下发给子件').toBe('file')
    // 子件点击选中 → oas-change 冒泡 → 容器 active-tab 反射
    const fileTab = tabEls(tabs).find((t) => t.dataset.value === 'file')!
    fileTab.click()
    expect(el.getAttribute('active-tab')).toBe('file')
    const summaryTab = tabEls(tabs).find((t) => t.dataset.value === 'summary')!
    summaryTab.click()
    expect(el.getAttribute('active-tab')).toBe('summary')
  })
})

// ===== inspector-tabs =====

describe('OASInspectorTabs', () => {
  it('observedAttributes 完整（含 dir）', () => {
    expect(OASInspectorTabs.observedAttributes).toEqual(expect.arrayContaining(['items', 'value', 'dir']))
  })

  it('items JSON 渲染 tablist + tab，aria-selected 跟随 value', () => {
    const el = mount<OASInspectorTabs>({
      Ctor: OASInspectorTabs,
      attrs: { items: '[{"label":"摘要","value":"summary"},{"label":"文件","value":"file"}]', value: 'file' },
    })
    expect(tablist(el).getAttribute('role')).toBe('tablist')
    const tabs = tabEls(el)
    expect(tabs.length).toBe(2)
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('false')
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true')
    expect(tabs[1]!.textContent).toBe('文件')
  })

  it('非法 items JSON：渲染为空不抛错（dev 告警一次）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount<OASInspectorTabs>({ Ctor: OASInspectorTabs, attrs: { items: '{broken' } })
    expect(tabEls(el).length).toBe(0)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('value 属性变化跟随（受控）；离场时内部态反射回 value 属性', () => {
    const el = mount<OASInspectorTabs>({
      Ctor: OASInspectorTabs,
      attrs: { items: '[{"label":"A","value":"a"},{"label":"B","value":"b"}]', value: 'a' },
    })
    el.setAttribute('value', 'b')
    expect(tabEls(el)[1]!.getAttribute('aria-selected')).toBe('true')
    // 非受控：移除 value 属性后点击 tab b → 反射 value=b
    el.removeAttribute('value')
    tabEls(el)[1]!.click()
    expect(el.getAttribute('value')).toBe('b')
  })

  it('点击 tab 派发 oas-change（detail { value }），bubbles + composed', () => {
    const el = mount<OASInspectorTabs>({
      Ctor: OASInspectorTabs,
      attrs: { items: '[{"label":"A","value":"a"},{"label":"B","value":"b"}]' },
    })
    const events: Array<{ value: string }> = []
    let composed = false
    el.addEventListener('oas-change', (e) => {
      events.push((e as CustomEvent).detail)
      composed = e.composed
    })
    tabEls(el)[1]!.click()
    expect(events).toEqual([{ value: 'b' }])
    expect(composed).toBe(true)
  })

  it('键盘：方向键移动焦点（roving tabindex），Home/End 跳两端，Enter/Space 选中', () => {
    const el = mount<OASInspectorTabs>({
      Ctor: OASInspectorTabs,
      attrs: {
        items: '[{"label":"A","value":"a"},{"label":"B","value":"b"},{"label":"C","value":"c"}]',
        value: 'a',
      },
    })
    const tabs = tabEls(el)
    expect(tabs[0]!.getAttribute('tabindex')).toBe('0')
    expect(tabs[1]!.getAttribute('tabindex')).toBe('-1')
    tabs[0]!.focus()
    tablist(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
    expect(tabs[1]!.getAttribute('tabindex')).toBe('0')
    expect(tabs[0]!.getAttribute('tabindex')).toBe('-1')
    tablist(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }))
    expect(tabs[2]!.hasAttribute('tabindex') ? tabs[2]!.getAttribute('tabindex') : '').toBe('0')
    tablist(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.getAttribute('value')).toBe('c')
  })

  it('RTL 下方向键镜像（ArrowLeft = 下一个）', () => {
    const el = mount<OASInspectorTabs>({
      Ctor: OASInspectorTabs,
      attrs: {
        dir: 'rtl',
        items: '[{"label":"A","value":"a"},{"label":"B","value":"b"}]',
        value: 'a',
      },
    })
    const tabs = tabEls(el)
    tabs[0]!.focus()
    tablist(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }))
    expect(tabs[1]!.getAttribute('tabindex')).toBe('0')
  })

  it('dir=rtl 钩子 + token 纪律', () => {
    const el = mount<OASInspectorTabs>({ Ctor: OASInspectorTabs, attrs: { dir: 'rtl' } })
    expect(el.hasAttribute('data-rtl')).toBe(true)
    expect(styleText(el)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})

// ===== inspector-section =====

describe('OASInspectorSection', () => {
  it('observedAttributes 完整（含 dir）', () => {
    expect(OASInspectorSection.observedAttributes).toEqual(
      expect.arrayContaining(['heading', 'name', 'collapsible', 'open', 'default-open', 'dir']),
    )
  })

  it('heading 渲染进分节标题；默认（无 collapsible）为纯标题不可折叠', () => {
    const el = mount<OASInspectorSection>({ Ctor: OASInspectorSection, attrs: { heading: '变换' } })
    expect(secHeading(el).textContent).toBe('变换')
    expect(secToggle(el).hidden).toBe(true)
  })

  it('collapsible 在场渲染折叠钮（aria-expanded），open 属性即状态', () => {
    const el = mount<OASInspectorSection>({
      Ctor: OASInspectorSection,
      attrs: { heading: '变换', collapsible: '', open: '' },
    })
    expect(secToggle(el).hidden).toBe(false)
    expect(secToggle(el).getAttribute('aria-expanded')).toBe('true')
    expect(el.hasAttribute('data-open')).toBe(true)
    el.removeAttribute('open')
    expect(secToggle(el).getAttribute('aria-expanded')).toBe('false')
    expect(el.hasAttribute('data-open')).toBe(false)
  })

  it('点击折叠钮切换 open 属性并派发 oas-toggle（detail { name, open }）', () => {
    const el = mount<OASInspectorSection>({
      Ctor: OASInspectorSection,
      attrs: { heading: '外观', name: 'appearance', collapsible: '' },
    })
    const events: Array<{ name: string; open: boolean }> = []
    el.addEventListener('oas-toggle', (e) => events.push((e as CustomEvent).detail))
    secToggle(el).click()
    expect(el.hasAttribute('open')).toBe(true)
    expect(events).toEqual([{ name: 'appearance', open: true }])
    secToggle(el).click()
    expect(events).toEqual([
      { name: 'appearance', open: true },
      { name: 'appearance', open: false },
    ])
  })

  it('default-open：初始无 open 时自动展开（非受控便利）', () => {
    const el = mount<OASInspectorSection>({
      Ctor: OASInspectorSection,
      attrs: { heading: '变换', collapsible: '', 'default-open': '' },
    })
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('default-open="false" 不播种展开（值语义，防 Vue 布尔绑定反向坑，同 oas-collapsible）', () => {
    const el = mount<OASInspectorSection>({
      Ctor: OASInspectorSection,
      attrs: { heading: '变换', collapsible: '', 'default-open': 'false' },
    })
    expect(el.hasAttribute('open')).toBe(false)
    expect(el.hasAttribute('data-open')).toBe(false)
  })

  it('default-open 只在首帧生效：用户折叠后保持收起（不被 update 回弹）', () => {
    const el = mount<OASInspectorSection>({
      Ctor: OASInspectorSection,
      attrs: { heading: '变换', collapsible: '', 'default-open': '' },
    })
    expect(el.hasAttribute('data-open')).toBe(true)
    secToggle(el).click()
    // 折叠后 open 移除，data-open 必须跟随（回归：default-open 曾每次 update 回弹 open，导致折不动）
    expect(el.hasAttribute('open')).toBe(false)
    expect(el.hasAttribute('data-open')).toBe(false)
    secToggle(el).click()
    expect(el.hasAttribute('open')).toBe(true)
    expect(el.hasAttribute('data-open')).toBe(true)
  })

  it('非折叠分节恒展开（无 collapsible 时 data-open 在场，内容不被 0fr 裁没）', () => {
    const el = mount<OASInspectorSection>({ Ctor: OASInspectorSection, attrs: { heading: '变换' } })
    expect(el.hasAttribute('collapsible')).toBe(false)
    expect(secToggle(el).hidden).toBe(true)
    expect(el.hasAttribute('data-open'), '非折叠分节必须展开').toBe(true)
  })

  it('name 缺省时事件 detail.name 为空串（不抛错）', () => {
    const el = mount<OASInspectorSection>({ Ctor: OASInspectorSection, attrs: { heading: 'x', collapsible: '' } })
    const events: Array<{ name: string }> = []
    el.addEventListener('oas-toggle', (e) => events.push((e as CustomEvent).detail))
    secToggle(el).click()
    expect(events[0]!.name).toBe('')
  })

  it('折叠动画走 grid rows（样式表含 grid-template-rows 过渡），reduced-motion 停用', () => {
    const el = mount<OASInspectorSection>({ Ctor: OASInspectorSection, attrs: { heading: 'x', collapsible: '' } })
    const css = styleText(el)
    expect(css).toContain('grid-template-rows')
    expect(css).toContain('prefers-reduced-motion')
  })

  it('aria：折叠钮可访问名 = heading；dir=rtl 钩子 + token 纪律', () => {
    const el = mount<OASInspectorSection>({
      Ctor: OASInspectorSection,
      attrs: { heading: '变换', name: 't', collapsible: '', dir: 'rtl' },
    })
    expect(secToggle(el).getAttribute('aria-label')).toBe('变换')
    expect(el.hasAttribute('data-rtl')).toBe(true)
    expect(styleText(el)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})

// ===== inspector-row =====

describe('OASInspectorRow', () => {
  it('observedAttributes 完整（含 dir）', () => {
    expect(OASInspectorRow.observedAttributes).toEqual(
      expect.arrayContaining(['label', 'value', 'mixed', 'reset', 'dir']),
    )
  })

  it('只读键值行（无默认插槽分发内容）：label ↔ value，value 走 tabular-nums', () => {
    const el = mount<OASInspectorRow>({ Ctor: OASInspectorRow, attrs: { label: '帧率', value: '25 fps' } })
    expect(rowLabel(el).textContent).toBe('帧率')
    expect(rowValue(el).textContent).toBe('25 fps')
    expect(styleText(el)).toContain('tabular-nums')
  })

  it('默认插槽有控件 → 控件行（value 文本让位、插槽分发）', () => {
    const el = mount<OASInspectorRow>({
      Ctor: OASInspectorRow,
      attrs: { label: '不透明度' },
      html: '<oas-slider></oas-slider>',
    })
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot')!
    expect(slot.assignedElements().length).toBe(1)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="row-value-text"]')!.hidden).toBe(true)
  })

  it('mixed 属性显示混合值（内置文案），value 文本让位', () => {
    const el = mount<OASInspectorRow>({ Ctor: OASInspectorRow, attrs: { label: '颜色', value: '#fff', mixed: '' } })
    expect(rowValue(el).textContent).toBe('混合值')
    el.removeAttribute('mixed')
    expect(rowValue(el).textContent).toBe('#fff')
  })

  it('mixed 文案随 locale 切换（zh-CN ↔ en）', () => {
    const el = mount<OASInspectorRow>({ Ctor: OASInspectorRow, attrs: { label: 'x', mixed: '' } })
    setLocale(en)
    expect(rowValue(el).textContent).toBe('Mixed')
    setLocale('zh-CN')
  })

  it('reset 属性显示行级复位钮，点击派发 oas-row-reset（detail { label }）', () => {
    const el = mount<OASInspectorRow>({ Ctor: OASInspectorRow, attrs: { label: '曝光', value: '0', reset: '' } })
    expect(rowResetBtn(el).hidden).toBe(false)
    const events: Array<{ label: string }> = []
    el.addEventListener('oas-row-reset', (e) => events.push((e as CustomEvent).detail))
    rowResetBtn(el).click()
    expect(events).toEqual([{ label: '曝光' }])
    const el2 = mount<OASInspectorRow>({ Ctor: OASInspectorRow, attrs: { label: '无复位' } })
    expect(rowResetBtn(el2).hidden).toBe(true)
  })

  it('复位钮 aria-label（i18n）', () => {
    const el = mount<OASInspectorRow>({ Ctor: OASInspectorRow, attrs: { label: 'x', reset: '' } })
    expect(rowResetBtn(el).getAttribute('aria-label')).toBe('复位')
  })

  it('label 为空时标签区隐藏（空态不塌占位）', () => {
    const el = mount<OASInspectorRow>({ Ctor: OASInspectorRow, attrs: { value: 'x' } })
    expect(rowLabel(el).hidden).toBe(true)
  })

  it('dir=rtl 钩子 + token 纪律', () => {
    const el = mount<OASInspectorRow>({ Ctor: OASInspectorRow, attrs: { dir: 'rtl', reset: '' } })
    expect(el.hasAttribute('data-rtl')).toBe(true)
    expect(styleText(el)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
