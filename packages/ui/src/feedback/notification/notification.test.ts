import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { notification, destroyAll } from './index.js'

describe('notification 命令式 API', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('渲染标题与描述', async () => {
    notification.success({ title: '成功', description: '操作已完成' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-notification')!
    expect(el).not.toBeNull()
    const sr = el.shadowRoot!
    expect(sr.textContent).toContain('成功')
    expect(sr.textContent).toContain('操作已完成')
  })

  it('success 类型颜色选择器从 host 属性命中（type 设在 host 上）', async () => {
    notification.success({ title: '成功' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-notification')!
    expect(el.getAttribute('type')).toBe('success')
    const styleText = el.shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toContain(":host([type='success']) .icon")
    expect(styleText).toContain(":host([type='error']) .icon")
    expect(styleText).toContain(":host([type='warning']) .icon")
    // icon 不再携带冗余的 type 属性
    expect(el.shadowRoot!.querySelector('[part="icon"]')!.hasAttribute('type')).toBe(false)
  })

  it('默认 4500ms 自动关闭', async () => {
    notification.info({ title: '通知' })
    await Promise.resolve()
    vi.advanceTimersByTime(4500)
    await Promise.resolve()
    expect(document.body.querySelector('oas-notification')).toBeNull()
  })

  it('destroyAll 清空', async () => {
    notification.warning({ title: 'a' })
    notification.error({ title: 'b' })
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-notification').length).toBe(2)
    destroyAll()
    expect(document.body.querySelectorAll('oas-notification').length).toBe(0)
  })

  it('show-progress：命令式 API 透传属性并渲染进度条', async () => {
    notification.success({ title: '成功', showProgress: true, duration: 8000 })
    await Promise.resolve()
    const el = document.body.querySelector('oas-notification')!
    expect(el.hasAttribute('show-progress')).toBe(true)
    expect(el.getAttribute('duration')).toBe('8000')
    const progress = el.shadowRoot!.querySelector('[part="progress"]')!
    expect(progress.hasAttribute('hidden')).toBe(false)
    // 进度动画与 auto-close 时长同步：fill 的 animation-duration = duration
    const fill = el.shadowRoot!.querySelector('.progress-fill') as HTMLElement
    expect(fill.style.animationDuration).toBe('8000ms')
  })

  it('show-progress 未开启时进度条隐藏', async () => {
    notification.info({ title: 'x' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-notification')!
    expect(el.shadowRoot!.querySelector('[part="progress"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('progress-position="top" 时进度条切到顶部位置', async () => {
    notification.info({ title: 'x', showProgress: true, progressPosition: 'top' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-notification')!
    expect(el.getAttribute('progress-position')).toBe('top')
    const progress = el.shadowRoot!.querySelector('[part="progress"]')!
    expect(progress.classList.contains('progress-top')).toBe(true)
  })

  it('duration=0（不自动关闭）时进度条不显示', async () => {
    notification.info({ title: 'x', showProgress: true, duration: 0 })
    await Promise.resolve()
    const el = document.body.querySelector('oas-notification')!
    expect(el.shadowRoot!.querySelector('[part="progress"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('scrollable：默认开启（内容区限高 + overflow-y auto）', async () => {
    notification.info({ title: 'x', description: '内容' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-notification')!
    const desc = el.shadowRoot!.querySelector('[part="description"]')!
    expect(desc.classList.contains('scrollable')).toBe(true)
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain('.description.scrollable')
    expect(style).toContain('max-height')
    expect(style).toContain('overflow-y: auto')
  })

  it('scrollable="false" 时描述区不限制高度', async () => {
    notification.info({ title: 'x', description: '内容', scrollable: false })
    await Promise.resolve()
    const el = document.body.querySelector('oas-notification')!
    expect(el.getAttribute('scrollable')).toBe('false')
    expect(
      el.shadowRoot!.querySelector('[part="description"]')!.classList.contains('scrollable'),
    ).toBe(false)
  })

  it('命令式 API 透传 scrollable / show-progress 组合', async () => {
    notification.warning({ title: 'x', showProgress: true, scrollable: true })
    await Promise.resolve()
    const el = document.body.querySelector('oas-notification')!
    expect(el.hasAttribute('show-progress')).toBe(true)
    expect(el.getAttribute('scrollable')).toBe('true')
  })
})
