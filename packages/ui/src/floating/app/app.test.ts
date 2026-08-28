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

  describe('message 全局默认配置（message JSON 属性）', () => {
    it('duration 默认值生效（调用未指定时用 app 配置）', async () => {
      const app = document.createElement('oas-app')
      app.setAttribute('message', '{"duration": 800}')
      document.body.appendChild(app)

      message.info('默认时长')
      await Promise.resolve()
      const msg = app.querySelector('oas-message')!
      expect(msg.getAttribute('duration')).toBe('800')
    })

    it('调用参数优先于 app 默认（options 对象）', async () => {
      const app = document.createElement('oas-app')
      app.setAttribute('message', '{"duration": 800}')
      document.body.appendChild(app)

      message.info('覆盖时长', { duration: 3000 })
      await Promise.resolve()
      const msg = app.querySelector('oas-message')!
      expect(msg.getAttribute('duration')).toBe('3000')
    })

    it('调用第二参数数字时长同样优先', async () => {
      const app = document.createElement('oas-app')
      app.setAttribute('message', '{"duration": 800}')
      document.body.appendChild(app)

      message.info('数字时长', 5000)
      await Promise.resolve()
      const msg = app.querySelector('oas-message')!
      expect(msg.getAttribute('duration')).toBe('5000')
    })

    it('嵌套 app 就近：内层 app 配置生效', async () => {
      const outer = document.createElement('oas-app')
      outer.setAttribute('message', '{"duration": 800}')
      const inner = document.createElement('oas-app')
      inner.setAttribute('message', '{"duration": 1200}')
      outer.appendChild(inner)
      document.body.appendChild(outer)

      message.info('就近配置')
      await Promise.resolve()
      const msg = inner.querySelector('oas-message')!
      expect(msg.getAttribute('duration')).toBe('1200')
    })

    it('message 属性变化时配置即时更新', async () => {
      const app = document.createElement('oas-app')
      document.body.appendChild(app)
      app.setAttribute('message', '{"duration": 800}')

      message.info('初始配置')
      await Promise.resolve()
      const msg = app.querySelector('oas-message')!
      expect(msg.getAttribute('duration')).toBe('800')

      destroyAllMessage()
      app.setAttribute('message', '{"duration": 1500}')
      message.info('新配置')
      await Promise.resolve()
      const msg2 = app.querySelector('oas-message')!
      expect(msg2.getAttribute('duration')).toBe('1500')
    })

    it('非法 message JSON：忽略 + dev 告警（同值去重），回落默认时长', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const app = document.createElement('oas-app')
        app.setAttribute('message', '{bad json')
        document.body.appendChild(app)
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('非法 message JSON'))

        // 同值跨元素去重：不重复告警
        const app2 = document.createElement('oas-app')
        app2.setAttribute('message', '{bad json')
        document.body.appendChild(app2)
        expect(warn).toHaveBeenCalledTimes(1)

        // 非法配置被忽略 → 默认时长 3000
        message.info('无配置')
        await Promise.resolve()
        const msg = app2.querySelector('oas-message')!
        expect(msg.getAttribute('duration')).toBe('3000')
      } finally {
        warn.mockRestore()
      }
    })
  })

  describe('notification 全局默认配置（notification JSON 属性）', () => {
    it('duration/showProgress/scrollable 默认值生效', async () => {
      const app = document.createElement('oas-app')
      app.setAttribute(
        'notification',
        '{"duration": 6000, "showProgress": true, "scrollable": false}',
      )
      document.body.appendChild(app)

      notification.success({ title: '默认配置' })
      await Promise.resolve()
      const el = app.querySelector('oas-notification')!
      expect(el.getAttribute('duration')).toBe('6000')
      expect(el.hasAttribute('show-progress')).toBe(true)
      expect(el.getAttribute('scrollable')).toBe('false')
    })

    it('调用参数优先于 app 默认', async () => {
      const app = document.createElement('oas-app')
      app.setAttribute('notification', '{"duration": 6000, "showProgress": true}')
      document.body.appendChild(app)

      notification.success({ title: '覆盖', duration: 2000, showProgress: false })
      await Promise.resolve()
      const el = app.querySelector('oas-notification')!
      expect(el.getAttribute('duration')).toBe('2000')
      expect(el.hasAttribute('show-progress')).toBe(false)
    })

    it('嵌套 app 就近：内层 app 配置生效', async () => {
      const outer = document.createElement('oas-app')
      outer.setAttribute('notification', '{"duration": 6000}')
      const inner = document.createElement('oas-app')
      inner.setAttribute('notification', '{"duration": 7000}')
      outer.appendChild(inner)
      document.body.appendChild(outer)

      notification.success({ title: '就近' })
      await Promise.resolve()
      const el = inner.querySelector('oas-notification')!
      expect(el.getAttribute('duration')).toBe('7000')
    })

    it('非法 notification JSON：忽略 + dev 告警（同值去重），回落默认时长', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const app = document.createElement('oas-app')
        app.setAttribute('notification', '[1,2]')
        document.body.appendChild(app)
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('非法 notification 配置'),
        )

        // 同值跨元素去重：不重复告警
        const app2 = document.createElement('oas-app')
        app2.setAttribute('notification', '[1,2]')
        document.body.appendChild(app2)
        expect(warn).toHaveBeenCalledTimes(1)

        // 非法配置被忽略 → 默认时长 4500
        notification.success({ title: '无配置' })
        await Promise.resolve()
        const el = app2.querySelector('oas-notification')!
        expect(el.getAttribute('duration')).toBe('4500')
      } finally {
        warn.mockRestore()
      }
    })
  })
})
