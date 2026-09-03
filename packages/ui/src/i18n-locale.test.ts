import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import './feedback/modal/index.js'
import './feedback/empty/index.js'
import './navigation/pagination/index.js'
import './feedback/alert/index.js'
import './feedback/drawer/index.js'
import './feedback/message/index.js'
import './feedback/notification/index.js'
import './feedback/popconfirm/index.js'

/**
 * 组件文案国际化集成测试：验证 setLocale('en') 后示范组件（modal/empty/pagination）
 * 内置文案即时切换，setLocale('zh-CN') 恢复默认中文。
 */
describe('组件文案 locale 切换（i18n 集成）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('modal：确定/取消 随 locale 切换为 OK/Cancel', () => {
    const el = document.createElement('oas-modal')
    el.setAttribute('visible', '')
    document.body.appendChild(el)
    const ok = el.shadowRoot!.querySelector<HTMLElement>('[part="ok"] .ok-label')!
    const cancel = el.shadowRoot!.querySelector<HTMLElement>('[part="cancel"]')!
    const close = el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!

    expect(ok.textContent).toBe('确定')
    expect(cancel.textContent).toBe('取消')
    expect(close.getAttribute('aria-label')).toBe('关闭')

    setLocale(en)
    expect(ok.textContent).toBe('OK')
    expect(cancel.textContent).toBe('Cancel')
    expect(close.getAttribute('aria-label')).toBe('Close')

    setLocale('zh-CN')
    expect(ok.textContent).toBe('确定')
  })

  it('empty：暂无数据 随 locale 切换为 No data', () => {
    const el = document.createElement('oas-empty')
    document.body.appendChild(el)
    const desc = el.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!

    expect(desc.textContent).toBe('暂无数据')
    setLocale(en)
    expect(desc.textContent).toBe('No data')
    setLocale('zh-CN')
    expect(desc.textContent).toBe('暂无数据')
  })

  it('empty：description 属性覆盖 locale 默认文案', () => {
    const el = document.createElement('oas-empty')
    el.setAttribute('description', '没有更多了')
    document.body.appendChild(el)
    const desc = el.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    expect(desc.textContent).toBe('没有更多了')
    setLocale(en)
    expect(desc.textContent).toBe('没有更多了')
  })

  it('pagination：分页导航 aria-label 随 locale 切换', () => {
    const el = document.createElement('oas-pagination')
    el.setAttribute('total', '100')
    el.setAttribute('page-size', '10')
    document.body.appendChild(el)
    const nav = el.shadowRoot!.querySelector<HTMLElement>('[part="group"]')!
    const prev = el.shadowRoot!.querySelector<HTMLElement>('[part="prev"]')!
    const next = el.shadowRoot!.querySelector<HTMLElement>('[part="next"]')!

    expect(nav.getAttribute('aria-label')).toBe('分页')
    expect(prev.getAttribute('aria-label')).toBe('上一页')
    expect(next.getAttribute('aria-label')).toBe('下一页')

    setLocale(en)
    expect(nav.getAttribute('aria-label')).toBe('Pagination')
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="prev"]')!.getAttribute('aria-label'),
    ).toBe('Previous page')
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="next"]')!.getAttribute('aria-label'),
    ).toBe('Next page')

    setLocale('zh-CN')
    expect(nav.getAttribute('aria-label')).toBe('分页')
  })

  it('alert：关闭按钮 aria-label 随 locale 切换为 Close', () => {
    const el = document.createElement('oas-alert')
    el.setAttribute('closeable', '')
    document.body.appendChild(el)
    const close = el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!

    expect(close.getAttribute('aria-label')).toBe('关闭')
    setLocale(en)
    expect(close.getAttribute('aria-label')).toBe('Close')
    setLocale('zh-CN')
    expect(close.getAttribute('aria-label')).toBe('关闭')
  })

  it('drawer：关闭/确定/取消 随 locale 切换', () => {
    const el = document.createElement('oas-drawer')
    el.setAttribute('visible', '')
    document.body.appendChild(el)
    const ok = el.shadowRoot!.querySelector<HTMLElement>('[part="ok"]')!
    const cancel = el.shadowRoot!.querySelector<HTMLElement>('[part="cancel"]')!
    const close = el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!

    expect(ok.textContent).toBe('确定')
    expect(cancel.textContent).toBe('取消')
    expect(close.getAttribute('aria-label')).toBe('关闭')

    setLocale(en)
    expect(ok.textContent).toBe('OK')
    expect(cancel.textContent).toBe('Cancel')
    expect(close.getAttribute('aria-label')).toBe('Close')

    setLocale('zh-CN')
    expect(ok.textContent).toBe('确定')
    expect(cancel.textContent).toBe('取消')
  })

  it('message：关闭按钮 aria-label 随 locale 切换为 Close', () => {
    const el = document.createElement('oas-message')
    el.setAttribute('duration', '0')
    el.textContent = 'hello'
    document.body.appendChild(el)
    const close = el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!

    expect(close.getAttribute('aria-label')).toBe('关闭')
    setLocale(en)
    expect(close.getAttribute('aria-label')).toBe('Close')
    setLocale('zh-CN')
    expect(close.getAttribute('aria-label')).toBe('关闭')
  })

  it('notification：区域/关闭 aria-label 随 locale 切换', () => {
    const el = document.createElement('oas-notification')
    el.setAttribute('duration', '0')
    el.setAttribute('title', '通知标题')
    document.body.appendChild(el)
    const box = el.shadowRoot!.querySelector<HTMLElement>('[part="box"]')!
    const close = el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!

    expect(box.getAttribute('aria-label')).toBe('通知')
    expect(close.getAttribute('aria-label')).toBe('关闭')

    setLocale(en)
    expect(box.getAttribute('aria-label')).toBe('Notification')
    expect(close.getAttribute('aria-label')).toBe('Close')

    setLocale('zh-CN')
    expect(box.getAttribute('aria-label')).toBe('通知')
    expect(close.getAttribute('aria-label')).toBe('关闭')
  })

  it('popconfirm：确定/取消 随 locale 切换为 OK/Cancel', () => {
    const el = document.createElement('oas-popconfirm')
    el.setAttribute('open', '')
    document.body.appendChild(el)
    const ok = el.shadowRoot!.querySelector<HTMLElement>('[part="ok"]')!
    const cancel = el.shadowRoot!.querySelector<HTMLElement>('[part="cancel"]')!

    expect(ok.textContent).toBe('确定')
    expect(cancel.textContent).toBe('取消')

    setLocale(en)
    expect(ok.textContent).toBe('OK')
    expect(cancel.textContent).toBe('Cancel')

    setLocale('zh-CN')
    expect(ok.textContent).toBe('确定')
    expect(cancel.textContent).toBe('取消')
  })
})
