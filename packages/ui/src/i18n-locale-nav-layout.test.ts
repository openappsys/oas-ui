import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import './navigation/tour/index.js'
import './navigation/anchor/index.js'
import './navigation/breadcrumb/index.js'
import './navigation/back-top/index.js'
import './layout/page-header/index.js'
import './layout/splitter/index.js'
import './layout/layout/index.js'
import './layout/float-button/index.js'

/**
 * navigation + layout 组组件文案国际化集成测试：
 * 验证 setLocale('en') 后内置文案（按钮文本 / aria-label）即时切换，setLocale('zh-CN') 恢复默认中文。
 */
describe('navigation + layout 组件文案 locale 切换（i18n 集成）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('tour：跳过/上一步/下一步/完成 随 locale 切换', () => {
    const el = document.createElement('oas-tour')
    el.setAttribute(
      'steps',
      JSON.stringify([
        { selector: '#s1', title: 'A' },
        { selector: '#s2', title: 'B' },
      ]),
    )
    el.setAttribute('open', '')
    document.body.appendChild(el)
    const skip = el.shadowRoot!.querySelector<HTMLElement>('[part="skip"]')!
    const prev = el.shadowRoot!.querySelector<HTMLElement>('[part="prev"]')!
    const next = el.shadowRoot!.querySelector<HTMLElement>('[part="next"]')!

    expect(skip.textContent).toBe('跳过')
    expect(prev.textContent).toBe('上一步')
    expect(next.textContent).toBe('下一步')
    // 最后一步时 next 显示「完成」
    el.setAttribute('current', '1')
    expect(next.textContent).toBe('完成')

    setLocale(en)
    expect(skip.textContent).toBe('Skip')
    expect(prev.textContent).toBe('Previous')
    expect(next.textContent).toBe('Done')

    setLocale('zh-CN')
    expect(skip.textContent).toBe('跳过')
    expect(next.textContent).toBe('完成')
  })

  it('anchor：锚点导航 aria-label 随 locale 切换', () => {
    const el = document.createElement('oas-anchor')
    el.setAttribute('items', JSON.stringify([{ href: '#s1', title: 'S1' }]))
    document.body.appendChild(el)
    const nav = el.shadowRoot!.querySelector<HTMLElement>('nav')!

    expect(nav.getAttribute('aria-label')).toBe('锚点导航')
    setLocale(en)
    expect(nav.getAttribute('aria-label')).toBe('Anchor navigation')
    setLocale('zh-CN')
    expect(nav.getAttribute('aria-label')).toBe('锚点导航')
  })

  it('breadcrumb：面包屑 aria-label 随 locale 切换', () => {
    const el = document.createElement('oas-breadcrumb')
    el.setAttribute('items', JSON.stringify([{ label: '首页' }]))
    document.body.appendChild(el)
    const nav = el.shadowRoot!.querySelector<HTMLElement>('nav')!

    expect(nav.getAttribute('aria-label')).toBe('面包屑')
    setLocale(en)
    expect(nav.getAttribute('aria-label')).toBe('Breadcrumb')
    setLocale('zh-CN')
    expect(nav.getAttribute('aria-label')).toBe('面包屑')
  })

  it('back-top：回到顶部 aria-label 随 locale 切换', () => {
    const el = document.createElement('oas-back-top')
    el.setAttribute('visible', '')
    document.body.appendChild(el)
    const btn = el.shadowRoot!.querySelector<HTMLElement>('[part="btn"]')!

    expect(btn.getAttribute('aria-label')).toBe('回到顶部')
    setLocale(en)
    expect(btn.getAttribute('aria-label')).toBe('Back to top')
    setLocale('zh-CN')
    expect(btn.getAttribute('aria-label')).toBe('回到顶部')
  })

  it('page-header：返回 aria-label 随 locale 切换', () => {
    const el = document.createElement('oas-page-header')
    el.setAttribute('back', '')
    document.body.appendChild(el)
    const back = el.shadowRoot!.querySelector<HTMLElement>('[part="back"]')!

    expect(back.getAttribute('aria-label')).toBe('返回')
    setLocale(en)
    expect(back.getAttribute('aria-label')).toBe('Back')
    setLocale('zh-CN')
    expect(back.getAttribute('aria-label')).toBe('返回')
  })

  it('splitter：调整面板宽度 aria-label 随 locale 切换', () => {
    const el = document.createElement('oas-splitter')
    document.body.appendChild(el)
    const splitter = el.shadowRoot!.querySelector<HTMLElement>('[part="splitter"]')!

    expect(splitter.getAttribute('aria-label')).toBe('调整面板宽度')
    setLocale(en)
    expect(splitter.getAttribute('aria-label')).toBe('Resize panel')
    setLocale('zh-CN')
    expect(splitter.getAttribute('aria-label')).toBe('调整面板宽度')
  })

  it('sider：侧边栏 aria-label 随 locale 切换', () => {
    const el = document.createElement('oas-sider')
    document.body.appendChild(el)
    const aside = el.shadowRoot!.querySelector<HTMLElement>('[part="sider"]')!

    expect(aside.getAttribute('aria-label')).toBe('侧边栏')
    setLocale(en)
    expect(aside.getAttribute('aria-label')).toBe('Sidebar')
    setLocale('zh-CN')
    expect(aside.getAttribute('aria-label')).toBe('侧边栏')
  })

  it('float-button：悬浮操作 aria-label 随 locale 切换', () => {
    const el = document.createElement('oas-float-button')
    document.body.appendChild(el)
    const btn = el.shadowRoot!.querySelector<HTMLElement>('[part="btn"]')!

    expect(btn.getAttribute('aria-label')).toBe('悬浮操作')
    setLocale(en)
    expect(btn.getAttribute('aria-label')).toBe('Quick actions')
    setLocale('zh-CN')
    expect(btn.getAttribute('aria-label')).toBe('悬浮操作')
  })
})
