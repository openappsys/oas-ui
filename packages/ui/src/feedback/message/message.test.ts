import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { message, destroyAll } from './index.js'

describe('message 命令式 API', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('message.success 渲染消息并自动关闭', async () => {
    message.success('操作成功')
    await Promise.resolve()
    const msg = document.body.querySelector('oas-message')!
    expect(msg).not.toBeNull()
    expect(msg.shadowRoot!.textContent).toContain('操作成功')
    expect(msg.getAttribute('type')).toBe('success')
    vi.advanceTimersByTime(3000)
    await Promise.resolve()
    expect(document.body.querySelector('oas-message')).toBeNull()
  })

  it('error 类型使用 role=alert', async () => {
    message.error('出错了')
    await Promise.resolve()
    const msg = document.body.querySelector('oas-message')!
    expect(msg.shadowRoot!.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('destroyAll 立即清空全部', async () => {
    message.info('a')
    message.info('b')
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-message').length).toBe(2)
    destroyAll()
    expect(document.body.querySelectorAll('oas-message').length).toBe(0)
  })

  it('返回 handle 可手动关闭', async () => {
    const handle = message.info('手动关闭')
    await Promise.resolve()
    handle.close()
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-message').length).toBe(0)
  })
})
