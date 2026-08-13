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

  it('success 类型颜色选择器从 host 属性命中（type 设在 host 上）', async () => {
    message.success('操作成功')
    await Promise.resolve()
    const msg = document.body.querySelector('oas-message')!
    expect(msg.getAttribute('type')).toBe('success')
    const styleText = msg.shadowRoot!.querySelector('style')!.textContent!
    // type 属性在 host 上，.box 颜色必须通过 host 属性选择器命中
    expect(styleText).toContain(":host([type='success']) .box")
    expect(styleText).toContain(":host([type='error']) .box")
    expect(styleText).toContain(":host([type='warning']) .box")
    // 不应再依赖 .box 自身的 type 属性（永不命中）
    expect(styleText).not.toContain('.box[type=')
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

describe('message 分组（group）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('相同 group 合并为一条，重复触发递增计数', async () => {
    message.success('保存成功', { group: 'save' })
    message.success('保存成功', { group: 'save' })
    await Promise.resolve()
    const msgs = document.body.querySelectorAll('oas-message')
    expect(msgs.length).toBe(1)
    expect(msgs[0]!.getAttribute('group')).toBe('save')
    const text = msgs[0]!.shadowRoot!.querySelector('[part="text"]')!.textContent!
    expect(text).toContain('保存成功')
    expect(text).toContain('×2')
  })

  it('相同 group 内容不同则替换内容并重置计数', async () => {
    message.info('同步中…', { group: 'sync' })
    message.info('同步完成', { group: 'sync' })
    await Promise.resolve()
    const msgs = document.body.querySelectorAll('oas-message')
    expect(msgs.length).toBe(1)
    const text = msgs[0]!.shadowRoot!.querySelector('[part="text"]')!.textContent!
    expect(text).toBe('同步完成')
  })

  it('不同 group 相互独立', async () => {
    message.info('a', { group: 'g1' })
    message.info('b', { group: 'g2' })
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-message').length).toBe(2)
  })

  it('分组合并后自动关闭计时按最近一次重置', async () => {
    message.info('a', { group: 'g' })
    await Promise.resolve()
    vi.advanceTimersByTime(2500)
    message.info('a', { group: 'g' })
    await Promise.resolve()
    vi.advanceTimersByTime(2500)
    // 距第二次触发仅 2500ms < 3000，尚未关闭
    expect(document.body.querySelectorAll('oas-message').length).toBe(1)
    vi.advanceTimersByTime(600)
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-message').length).toBe(0)
  })
})

describe('message 更新与销毁（update / destroy）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('update 更新已存在消息的内容与类型', async () => {
    message.info('处理中…', { key: 'upload', duration: 0 })
    await Promise.resolve()
    message.update('upload', { content: '上传成功', type: 'success' })
    await Promise.resolve()
    const msgs = document.body.querySelectorAll('oas-message')
    expect(msgs.length).toBe(1)
    const msg = msgs[0]!
    expect(msg.getAttribute('type')).toBe('success')
    expect(msg.shadowRoot!.querySelector('[part="text"]')!.textContent).toBe('上传成功')
  })

  it('update 不存在的 key 则新建', async () => {
    message.update('nokey', { content: '新建消息', type: 'warning' })
    await Promise.resolve()
    const msgs = document.body.querySelectorAll('oas-message')
    expect(msgs.length).toBe(1)
    expect(msgs[0]!.getAttribute('type')).toBe('warning')
    expect(msgs[0]!.shadowRoot!.textContent).toContain('新建消息')
    // 新建后可再次 update
    message.update('nokey', { content: '再次更新', type: 'success' })
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-message').length).toBe(1)
    expect(msgs[0]!.shadowRoot!.querySelector('[part="text"]')!.textContent).toBe('再次更新')
  })

  it('destroy 关闭指定 key 的消息，其他保留', async () => {
    message.info('a', { key: 'a' })
    message.info('b', { key: 'b' })
    await Promise.resolve()
    message.destroy('a')
    await Promise.resolve()
    const msgs = document.body.querySelectorAll('oas-message')
    expect(msgs.length).toBe(1)
    expect(msgs[0]!.textContent).toContain('b')
  })

  it('destroy 不存在的 key 静默无操作', async () => {
    message.info('a')
    await Promise.resolve()
    message.destroy('ghost')
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-message').length).toBe(1)
  })
})

describe('message 事件', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('关闭时派发 oas-close（detail 带 key）', async () => {
    const listener = vi.fn()
    document.body.addEventListener('oas-close', listener)
    message.info('你好', { key: 'hi' })
    await Promise.resolve()
    message.destroy('hi')
    await Promise.resolve()
    expect(listener).toHaveBeenCalledTimes(1)
    const detail = (listener.mock.calls[0]![0] as CustomEvent).detail
    expect(detail.key).toBe('hi')
    document.body.removeEventListener('oas-close', listener)
  })

  it('计时到期自动关闭同样派发 oas-close', async () => {
    const listener = vi.fn()
    document.body.addEventListener('oas-close', listener)
    message.info('过期消息', 2000)
    await Promise.resolve()
    vi.advanceTimersByTime(2000)
    await Promise.resolve()
    expect(listener).toHaveBeenCalledTimes(1)
    const detail = (listener.mock.calls[0]![0] as CustomEvent).detail
    expect(detail.key).toBeUndefined()
    document.body.removeEventListener('oas-close', listener)
  })

  it('onClose 回调在消息关闭时触发一次', async () => {
    const onClose = vi.fn()
    message.info('再见', { key: 'bye', onClose, duration: 0 })
    await Promise.resolve()
    message.destroy('bye')
    await Promise.resolve()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
