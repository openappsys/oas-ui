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
})
