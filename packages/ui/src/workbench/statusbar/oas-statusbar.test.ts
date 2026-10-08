import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASStatusbar, OASStatusbarItem } from './index.js'

/**
 * oas-statusbar（状态栏）+ oas-statusbar-item（状态单元格）单元测试。
 *
 * happy-dom 限制：CSS 类样式不进 element.style、getComputedStyle 不解析 var()——
 * 语义色/旋转等视觉断言走「属性钩子 + shadow 内 style 文本」路径。
 */

type MountOptions = {
  attrs?: Record<string, string>
  html?: string
}

function mountBar(opts: MountOptions = {}): OASStatusbar {
  const el = new OASStatusbar()
  for (const [k, v] of Object.entries(opts.attrs ?? {})) el.setAttribute(k, v)
  if (opts.html) el.innerHTML = opts.html
  document.body.appendChild(el)
  return el
}

function mountItem(opts: MountOptions = {}): OASStatusbarItem {
  const el = new OASStatusbarItem()
  for (const [k, v] of Object.entries(opts.attrs ?? {})) el.setAttribute(k, v)
  if (opts.html) el.innerHTML = opts.html
  document.body.appendChild(el)
  return el
}

const barPart = (el: OASStatusbar): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
const endPart = (el: OASStatusbar): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="end"]')!
const itemPart = (el: OASStatusbarItem): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="item"]')!
const labelPart = (el: OASStatusbarItem): HTMLElement =>
  el.shadowRoot!.querySelector<HTMLElement>('[part="item-label"]')!
const valuePart = (el: OASStatusbarItem): HTMLElement =>
  el.shadowRoot!.querySelector<HTMLElement>('[part="item-value"]')!
const spinner = (el: OASStatusbarItem): HTMLElement | null =>
  el.shadowRoot!.querySelector<HTMLElement>('[part="item-spinner"]')
const iconSvg = (el: OASStatusbarItem): SVGElement | null =>
  el.shadowRoot!.querySelector<SVGElement>('[part="item-icon"] svg')

function styleText(el: OASStatusbar | OASStatusbarItem): string {
  return el.shadowRoot!.querySelector('style')!.textContent!
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

// ===== statusbar 容器 =====

describe('OASStatusbar 容器', () => {
  it('role=status + aria-label（内置文案走 t()），label 属性覆盖', () => {
    const el = mountBar()
    expect(barPart(el).getAttribute('role')).toBe('status')
    expect(barPart(el).getAttribute('aria-label')).toBe('状态栏')
    const el2 = mountBar({ attrs: { label: '渲染状态' } })
    expect(barPart(el2).getAttribute('aria-label')).toBe('渲染状态')
  })

  it('aria-label 随 locale 切换（zh-CN ↔ en）', () => {
    const el = mountBar()
    setLocale(en)
    expect(barPart(el).getAttribute('aria-label')).toBe('Status bar')
    setLocale('zh-CN')
    expect(barPart(el).getAttribute('aria-label')).toBe('状态栏')
  })

  it('observedAttributes 完整（含 dir）', () => {
    expect(OASStatusbar.observedAttributes).toEqual(expect.arrayContaining(['label', 'dir']))
  })

  it('默认段（左）+ end 段（右）双插槽；end 无内容时容器隐藏', () => {
    const el = mountBar({ html: '<oas-statusbar-item label="左项"></oas-statusbar-item>' })
    expect(endPart(el).hidden).toBe(true)
    const el2 = mountBar({
      html: '<oas-statusbar-item label="左项"></oas-statusbar-item><oas-statusbar-item slot="end" label="右项"></oas-statusbar-item>',
    })
    expect(endPart(el2).hidden).toBe(false)
  })

  it('子项点击事件冒泡出容器（oas-item-click 可在容器上监听）', () => {
    const el = mountBar({ html: '<oas-statusbar-item button label="同步" value="sync"></oas-statusbar-item>' })
    const events: Array<{ value: string; label: string }> = []
    el.addEventListener('oas-item-click', (e) => events.push((e as CustomEvent).detail))
    ;(el.querySelector('oas-statusbar-item') as OASStatusbarItem)
      .shadowRoot!.querySelector<HTMLElement>('[part="item"]')!
      .click()
    expect(events).toEqual([{ value: 'sync', label: '同步' }])
  })

  it('dir=rtl 时 data-rtl 钩子写入', () => {
    const el = mountBar({ attrs: { dir: 'rtl' } })
    expect(el.hasAttribute('data-rtl')).toBe(true)
  })

  it('布局全走逻辑属性（样式表无物理方向 margin）', () => {
    const el = mountBar()
    const css = styleText(el)
    expect(css).not.toMatch(/margin-left|margin-right|padding-left|padding-right/)
    expect(css).toContain('margin-inline-start')
  })

  it('颜色全走 token（样式表无硬编码 hex）', () => {
    const el = mountBar()
    expect(styleText(el)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})

// ===== statusbar-item =====

describe('OASStatusbarItem 单元格', () => {
  it('observedAttributes 完整（含 dir）', () => {
    expect(OASStatusbarItem.observedAttributes).toEqual(
      expect.arrayContaining(['value', 'label', 'icon', 'button', 'status', 'spinning', 'dir']),
    )
  })

  it('label/value 渲染进对应 part，value 走 tabular-nums（样式表声明）', () => {
    const el = mountItem({ attrs: { label: '场景', value: '15' } })
    expect(labelPart(el).textContent).toBe('场景')
    expect(valuePart(el).textContent).toBe('15')
    expect(styleText(el)).toContain('tabular-nums')
  })

  it('默认非按钮（div 语义），button 属性在场渲染为 button（原生键盘可达）', () => {
    const el = mountItem({ attrs: { label: '只读' } })
    expect(itemPart(el).tagName).toBe('DIV')
    const el2 = mountItem({ attrs: { button: '', label: '可点' } })
    expect(itemPart(el2).tagName).toBe('BUTTON')
    expect(itemPart(el2).getAttribute('type')).toBe('button')
  })

  it('button 模式点击派发 oas-item-click（detail { value, label }），非 button 模式不派发', () => {
    const el = mountItem({ attrs: { button: '', label: '分支', value: 'main' } })
    const events: Array<{ value: string; label: string }> = []
    el.addEventListener('oas-item-click', (e) => events.push((e as CustomEvent).detail))
    itemPart(el).click()
    expect(events).toEqual([{ value: 'main', label: '分支' }])
    const el2 = mountItem({ attrs: { label: '只读' } })
    const events2: unknown[] = []
    el2.addEventListener('oas-item-click', (e) => events2.push(e))
    itemPart(el2).click()
    expect(events2).toEqual([])
  })

  it('事件 bubbles + composed（可穿出 shadow DOM）', () => {
    const el = mountItem({ attrs: { button: '', label: 'x' } })
    let composed = false
    let bubbles = false
    el.addEventListener('oas-item-click', (e) => {
      composed = e.composed
      bubbles = e.bubbles
    })
    itemPart(el).click()
    expect(composed).toBe(true)
    expect(bubbles).toBe(true)
  })

  it('spinning 属性显示 spinner（旋转动画走样式表），移除后隐藏', () => {
    const el = mountItem({ attrs: { label: '同步中', spinning: '' } })
    expect(spinner(el)).not.toBeNull()
    expect(styleText(el)).toContain('animation')
    el.removeAttribute('spinning')
    expect(spinner(el)!.hidden).toBe(true)
  })

  it('icon 属性从内置图标注册表渲染 svg，未知图标名不渲染', () => {
    const el = mountItem({ attrs: { label: 'git', icon: 'check' } })
    expect(iconSvg(el)).not.toBeNull()
    const el2 = mountItem({ attrs: { label: 'x', icon: 'not-exist-icon' } })
    expect(iconSvg(el2)).toBeNull()
  })

  it('status 语义：非法值回落 default 并 dev 告警（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mountItem({ attrs: { label: 'x', status: 'bogus' } })
    expect(el.getAttribute('data-status')).toBe('default')
    expect(warn).toHaveBeenCalledTimes(1)
    el.setAttribute('status', 'bogus')
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('status 合法值写 data-status 钩子（CSS 按钩子切语义色）', () => {
    for (const s of ['default', 'info', 'warning', 'error', 'progress']) {
      const el = mountItem({ attrs: { label: 'x', status: s } })
      expect(el.getAttribute('data-status')).toBe(s)
    }
  })

  it('语义色走 token（样式表含 warning/error 底色 + on-warning/on-danger 前景引用）', () => {
    const el = mountItem({ attrs: { label: 'x', status: 'warning' } })
    const css = styleText(el)
    expect(css).toContain('--oas-color-warning')
    expect(css).toContain('--oas-color-text-on-warning')
    expect(css).toContain('--oas-color-danger')
    expect(css).toContain('--oas-color-text-on-danger')
  })

  it('dir=rtl 时 data-rtl 钩子写入', () => {
    const el = mountItem({ attrs: { dir: 'rtl' } })
    expect(el.hasAttribute('data-rtl')).toBe(true)
  })

  it('全空态：宿主打 data-empty 反射 + item 隐藏（宿主 display:none 无布局足迹，不留 gap 位）——回归：曾只藏内部格子、宿主仍占 4px 幽灵 gap', () => {
    const el = mountItem()
    expect(el.hasAttribute('data-empty'), '无任何属性时宿主打 data-empty').toBe(true)
    expect(itemPart(el).hidden, '无任何属性时 item 不可见').toBe(true)
    expect(styleText(el), '宿主级 display:none 规则就位（消除 flex gap 幽灵占位）').toMatch(
      /:host\(\[data-empty\]\)\s*\{[^}]*display:\s*none/,
    )
    const el2 = mountItem({ attrs: { button: '' } })
    expect(el2.hasAttribute('data-empty'), '空内容 button 同样标记（不产生可聚焦空钮）').toBe(true)
    expect(itemPart(el2).hidden).toBe(true)
    // 任一内容通道在场即恢复可见
    el2.setAttribute('label', '就绪')
    expect(el2.hasAttribute('data-empty')).toBe(false)
    expect(itemPart(el2).hidden).toBe(false)
    // 内容清空后重新标记
    el2.removeAttribute('label')
    expect(el2.hasAttribute('data-empty')).toBe(true)
    expect(itemPart(el2).hidden).toBe(true)
    // spinning 也算内容通道（后台活动指示非空）
    const el3 = mountItem({ attrs: { spinning: '' } })
    expect(el3.hasAttribute('data-empty')).toBe(false)
  })

  it('颜色全走 token（样式表无硬编码 hex）', () => {
    const el = mountItem({ attrs: { button: '', label: 'x', icon: 'check', spinning: '' } })
    expect(styleText(el)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
