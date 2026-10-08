import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASTitlebar } from './index.js'

/**
 * oas-titlebar（窗口标题栏）单元测试。
 *
 * happy-dom 限制：CSS 类样式不进 element.style、getComputedStyle 不解析 var()——
 * 涉及样式的断言一律走「内联样式 + shadow 内 style 文本」双重路径。
 * 拖动契约：drag 属性 → host 内联 -webkit-app-region: drag + data-tauri-drag-region 属性；
 * 交互子件自动 no-drag 是样式表规则（::slotted），断言样式表文本含规则。
 */

type MountOptions = {
  attrs?: Record<string, string>
  html?: string
}

function mount(opts: MountOptions = {}): OASTitlebar {
  const el = new OASTitlebar()
  for (const [k, v] of Object.entries(opts.attrs ?? {})) el.setAttribute(k, v)
  if (opts.html) el.innerHTML = opts.html
  document.body.appendChild(el)
  return el
}

const bar = (el: OASTitlebar): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
const leadingWrap = (el: OASTitlebar): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="leading"]')!
const titlePart = (el: OASTitlebar): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
const subtitlePart = (el: OASTitlebar): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="subtitle"]')!
const docInput = (el: OASTitlebar): HTMLInputElement =>
  el.shadowRoot!.querySelector<HTMLInputElement>('[part="doc-title"]')!
const winBtn = (el: OASTitlebar, action: string): HTMLButtonElement =>
  el.shadowRoot!.querySelector<HTMLButtonElement>(`[part="win-button"][data-action="${action}"]`)!
const trailingWrap = (el: OASTitlebar): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="trailing"]')!
const centerSlot = (el: OASTitlebar): HTMLSlotElement =>
  el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="center"]')!

function styleText(el: OASTitlebar): string {
  return el.shadowRoot!.querySelector('style')!.textContent!
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

// ===== 结构与语义 =====

describe('OASTitlebar 结构与语义', () => {
  it('容器 role=group + aria-label（内置文案走 t()），随 locale 切换——回归：aria-label 曾挂在无 role 的 div 上（AT 忽略）', () => {
    const el = mount()
    expect(bar(el).getAttribute('role')).toBe('group')
    expect(bar(el).getAttribute('aria-label')).toBe('标题栏')
    setLocale(en)
    expect(bar(el).getAttribute('aria-label')).toBe('Title bar')
    setLocale('zh-CN')
    expect(bar(el).getAttribute('role')).toBe('group')
  })

  it('observedAttributes 完整（含 dir）', () => {
    expect(OASTitlebar.observedAttributes).toEqual(
      expect.arrayContaining([
        'size',
        'drag',
        'title',
        'subtitle',
        'editable',
        'window-actions',
        'leading-inset',
        'trailing-inset',
        'dir',
      ]),
    )
  })

  it('title 属性渲染进标题区后被吸收（宿主属性移除，防原生 tooltip），运行时重设跟随', () => {
    const el = mount({ attrs: { title: '未命名文档', subtitle: '已保存 · 刚刚' } })
    expect(titlePart(el).textContent).toBe('未命名文档')
    // 吸收：title 是原生全局属性，渲染后从宿主移除（残留会弹原生 tooltip 干扰）
    expect(el.hasAttribute('title')).toBe(false)
    // 运行时重设（宿主意图）：再次写 title 属性 → 吸收进缓存并渲染
    el.setAttribute('title', '报表 v2')
    expect(el.hasAttribute('title')).toBe(false)
    expect(titlePart(el).textContent).toBe('报表 v2')
    el.setAttribute('subtitle', '')
    expect(subtitlePart(el).hidden).toBe(true)
  })

  it('title="" 显式清空（吸收状态机：空串=清除缓存）', () => {
    const el = mount({ attrs: { title: '旧标题' } })
    expect(titlePart(el).textContent).toBe('旧标题')
    el.setAttribute('title', '')
    expect(titlePart(el).textContent).toBe('')
    expect(titlePart(el).hidden).toBe(true)
  })

  it('无标题时标题区不塌陷（bar 保持高度）且 title part 隐藏', () => {
    const el = mount()
    expect(titlePart(el).hidden).toBe(true)
    expect(styleText(el)).toContain('min-height')
  })

  it('slot="title" 富标题覆盖属性文本', () => {
    const el = mount({ attrs: { title: '占位' }, html: '<span slot="title">富标题</span>' })
    expect(titlePart(el).hidden).toBe(true)
  })

  it('leading/trailing 插槽空时容器隐藏，有内容时显示', () => {
    const el = mount()
    expect(leadingWrap(el).hidden).toBe(true)
    expect(trailingWrap(el).hidden).toBe(true)
    const el2 = mount({ html: '<span slot="leading">品牌</span><oas-button slot="trailing">操作</oas-button>' })
    expect(leadingWrap(el2).hidden).toBe(false)
    expect(trailingWrap(el2).hidden).toBe(false)
  })

  it('slot="center" 有内容时标题/副标题/文档井全部让位', () => {
    const el = mount({ attrs: { title: '占位', editable: '' }, html: '<div slot="center">文档井</div>' })
    expect(centerSlot(el).assignedElements().length).toBe(1)
    expect(titlePart(el).hidden).toBe(true)
    expect(docInput(el).hidden).toBe(true)
  })
})

// ===== size 两档 =====

describe('OASTitlebar size', () => {
  it('默认 compact，data-size 钩子写 compact', () => {
    const el = mount()
    expect(el.getAttribute('data-size')).toBe('compact')
  })

  it('size=large 切换 data-size，非法值回落 compact 并 dev 告警（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ attrs: { size: 'large' } })
    expect(el.getAttribute('data-size')).toBe('large')
    el.setAttribute('size', 'giant')
    expect(el.getAttribute('data-size')).toBe('compact')
    expect(warn).toHaveBeenCalledTimes(1)
    // 同值去重：再改一次同非法值不重复告警
    el.setAttribute('size', 'giant')
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('两档高度走 token（样式表含 compact/large 高度变量）', () => {
    const el = mount()
    const css = styleText(el)
    expect(css).toContain('--oas-titlebar-compact-height')
    expect(css).toContain('--oas-titlebar-large-height')
  })
})

// ===== 拖动契约 =====

describe('OASTitlebar 拖动契约', () => {
  it('默认无 drag：host 无 data-drag-region / data-tauri-drag-region 标记', () => {
    const el = mount()
    expect(el.hasAttribute('data-drag-region')).toBe(false)
    expect(el.hasAttribute('data-tauri-drag-region')).toBe(false)
  })

  it('drag 属性在场 → data-drag-region（样式表写 -webkit-app-region: drag）+ data-tauri-drag-region', () => {
    const el = mount({ attrs: { drag: '' } })
    expect(el.hasAttribute('data-drag-region')).toBe(true)
    expect(el.hasAttribute('data-tauri-drag-region')).toBe(true)
    expect(styleText(el)).toMatch(/:host\(\[data-drag-region\]\)[^}]*-webkit-app-region:\s*drag/)
  })

  it('drag 属性移除后拖动契约完全撤除（无残留）', () => {
    const el = mount({ attrs: { drag: '' } })
    el.removeAttribute('drag')
    expect(el.hasAttribute('data-drag-region')).toBe(false)
    expect(el.hasAttribute('data-tauri-drag-region')).toBe(false)
  })

  it('样式表给交互子件 no-drag（::slotted 交互元素 + [data-no-drag] 逃生口）', () => {
    const el = mount({ attrs: { drag: '' } })
    const css = styleText(el)
    expect(css).toContain('no-drag')
    expect(css).toContain('::slotted(button)')
    expect(css).toContain('[data-no-drag]')
  })

  it('shadow 内交互部件（窗口操作钮/文档井输入）自身 no-drag', () => {
    const el = mount({ attrs: { drag: '', editable: '', 'window-actions': 'close' } })
    const css = styleText(el)
    // 内建交互部件的 no-drag 规则存在（类选择器）
    expect(css).toMatch(/\.win-btn[^}]*no-drag/)
    expect(css).toMatch(/\.doc-title[^}]*no-drag/)
  })
})

// ===== 窗口操作 =====

describe('OASTitlebar 窗口操作', () => {
  it('window-actions 控制内建钮显隐（默认全隐藏）', () => {
    const el = mount()
    expect(winBtn(el, 'minimize').hidden).toBe(true)
    expect(winBtn(el, 'maximize').hidden).toBe(true)
    expect(winBtn(el, 'close').hidden).toBe(true)
    const el2 = mount({ attrs: { 'window-actions': 'minimize,maximize,close' } })
    expect(winBtn(el2, 'minimize').hidden).toBe(false)
    expect(winBtn(el2, 'maximize').hidden).toBe(false)
    expect(winBtn(el2, 'close').hidden).toBe(false)
  })

  it('window-actions 子集只显示对应钮，非法名忽略', () => {
    const el = mount({ attrs: { 'window-actions': 'close, bogus' } })
    expect(winBtn(el, 'close').hidden).toBe(false)
    expect(winBtn(el, 'minimize').hidden).toBe(true)
    expect(winBtn(el, 'bogus')).toBeNull()
  })

  it('点击内建钮派发 oas-window-action（detail { action }），组件不执行窗口操作', () => {
    const el = mount({ attrs: { 'window-actions': 'minimize,maximize,close' } })
    const events: string[] = []
    el.addEventListener('oas-window-action', (e) => {
      events.push((e as CustomEvent).detail.action)
    })
    winBtn(el, 'minimize').click()
    winBtn(el, 'close').click()
    expect(events).toEqual(['minimize', 'close'])
  })

  it('窗口操作钮 aria-label（i18n）', () => {
    const el = mount({ attrs: { 'window-actions': 'minimize,maximize,close' } })
    expect(winBtn(el, 'minimize').getAttribute('aria-label')).toBe('最小化')
    expect(winBtn(el, 'maximize').getAttribute('aria-label')).toBe('最大化')
    expect(winBtn(el, 'close').getAttribute('aria-label')).toBe('关闭')
  })
})

// ===== 文档井（editable）=====

describe('OASTitlebar 文档井（editable）', () => {
  it('editable 在场渲染 input（值 = title），aria-label 就位', () => {
    const el = mount({ attrs: { title: '设计稿', editable: '' } })
    expect(docInput(el).hidden).toBe(false)
    expect(docInput(el).value).toBe('设计稿')
    expect(docInput(el).getAttribute('aria-label')).toBe('文档标题')
    expect(titlePart(el).hidden).toBe(true)
  })

  it('Enter 提交：派发 oas-title-change { title }，吸收缓存更新（title 不常驻宿主属性）', () => {
    const el = mount({ attrs: { title: '旧标题', editable: '' } })
    const events: Array<{ title: string }> = []
    el.addEventListener('oas-title-change', (e) => events.push((e as CustomEvent).detail))
    docInput(el).value = '新标题'
    docInput(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(events).toEqual([{ title: '新标题' }])
    expect(el.hasAttribute('title'), '提交不把 title 写回宿主属性（吸收语义）').toBe(false)
    // 外部重写 title 属性 → 终止编辑（缓存更新，input 跟随）
    el.setAttribute('title', '外部新标题')
    expect(docInput(el).value).toBe('外部新标题')
  })

  it('Esc 取消：恢复 input 值为缓存标题、零事件、无属性变化', () => {
    const el = mount({ attrs: { title: '原标题', editable: '' } })
    const events: unknown[] = []
    el.addEventListener('oas-title-change', (e) => events.push(e))
    docInput(el).value = '改了一半'
    docInput(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(docInput(el).value).toBe('原标题')
    expect(events).toEqual([])
  })

  it('blur 时值有变化也提交（与 Enter 同路径）', () => {
    const el = mount({ attrs: { title: 'A', editable: '' } })
    const events: Array<{ title: string }> = []
    el.addEventListener('oas-title-change', (e) => events.push((e as CustomEvent).detail))
    docInput(el).value = 'B'
    docInput(el).dispatchEvent(new FocusEvent('blur'))
    expect(events).toEqual([{ title: 'B' }])
  })

  it('无 editable 属性时不渲染 input（纯标题）', () => {
    const el = mount({ attrs: { title: '纯标题' } })
    expect(docInput(el).hidden).toBe(true)
  })

  it('editable 下 subtitle 照常显示（文档井 + 文档状态上下排布；回归：曾被 editable 强制隐藏）', () => {
    const el = mount({ attrs: { title: '未命名设计稿', subtitle: '已保存 · 刚刚', editable: '' } })
    expect(docInput(el).hidden).toBe(false)
    expect(subtitlePart(el).hidden, '文档状态下拉在 editable 时不被隐藏').toBe(false)
    expect(subtitlePart(el).textContent).toBe('已保存 · 刚刚')
    // 运行时撤除 subtitle → 隐藏
    el.removeAttribute('subtitle')
    expect(subtitlePart(el).hidden).toBe(true)
  })
})

// ===== 安全区 =====

describe('OASTitlebar 安全区', () => {
  it('leading-inset/trailing-inset 写入内联 CSS 变量（原生控件防压）', () => {
    const el = mount({ attrs: { 'leading-inset': '80px', 'trailing-inset': '140px' } })
    expect(el.style.getPropertyValue('--oas-titlebar-leading-inset')).toBe('80px')
    expect(el.style.getPropertyValue('--oas-titlebar-trailing-inset')).toBe('140px')
  })

  it('属性移除后变量撤除（回落默认 0px）', () => {
    const el = mount({ attrs: { 'leading-inset': '80px' } })
    el.removeAttribute('leading-inset')
    expect(el.style.getPropertyValue('--oas-titlebar-leading-inset')).toBe('')
  })
})

// ===== RTL 与 token 纪律 =====

describe('OASTitlebar RTL 与 token', () => {
  it('dir=rtl 时 data-rtl 钩子写入', () => {
    const el = mount({ attrs: { dir: 'rtl' } })
    expect(el.hasAttribute('data-rtl')).toBe(true)
    el.setAttribute('dir', 'ltr')
    expect(el.hasAttribute('data-rtl')).toBe(false)
  })

  it('布局全走逻辑属性（样式表无物理方向 padding/margin）', () => {
    const el = mount()
    const css = styleText(el)
    expect(css).not.toMatch(/padding-left|padding-right|margin-left|margin-right/)
    expect(css).toContain('padding-inline-start')
  })

  it('颜色全走 token（样式表无硬编码 hex）', () => {
    const el = mount({ attrs: { drag: '', 'window-actions': 'close', editable: '' } })
    const css = styleText(el)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
