import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import './index.js'
import '../config-provider/index.js'
import { message, destroyAll as destroyAllMessage } from '../../feedback/message/index.js'
import {
  notification,
  destroyAll as destroyAllNotification,
} from '../../feedback/notification/index.js'

/**
 * app 容器测试：
 * - app 容器存在时，命令式 message/notification 挂到 app 内（而非 document.body）
 * - 无 app 容器时回退挂 body（不破坏旧行为）
 */
describe('oas-app', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAllMessage()
    destroyAllNotification()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('app 容器内 message 挂载到 app 内（而非 body）', async () => {
    const app = document.createElement('oas-app')
    document.body.appendChild(app)

    message.success('操作成功')
    await Promise.resolve()

    const msg = app.querySelector('oas-message')!
    expect(msg).not.toBeNull()
    // 不在 body 直接子级（栈容器挂在 app 内）
    expect(document.body.querySelector('oas-message')).toBe(msg)
    expect(msg.parentElement?.parentElement).toBe(app)
  })

  it('app 容器内 notification 挂载到 app 内', async () => {
    const app = document.createElement('oas-app')
    document.body.appendChild(app)

    notification.success({ title: '成功' })
    await Promise.resolve()

    const el = app.querySelector('oas-notification')!
    expect(el).not.toBeNull()
    expect(el.parentElement?.parentElement).toBe(app)
  })

  it('无 app 容器时 message 仍挂到 body（不破坏旧行为）', async () => {
    message.info('提示')
    await Promise.resolve()
    const msg = document.body.querySelector('oas-message')!
    expect(msg).not.toBeNull()
  })

  it('app 断开后 message 回退挂 body', async () => {
    const app = document.createElement('oas-app')
    document.body.appendChild(app)
    app.remove()

    message.info('提示')
    await Promise.resolve()
    const msg = document.body.querySelector('oas-message')!
    expect(msg).not.toBeNull()
  })

  it('app 与 config-provider 配套（app 嵌套在 config-provider 内）', async () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('locale', 'en')
    const app = document.createElement('oas-app')
    cp.appendChild(app)
    document.body.appendChild(cp)

    message.info('hello')
    await Promise.resolve()
    const msg = app.querySelector('oas-message')!
    expect(msg).not.toBeNull()
  })
})
