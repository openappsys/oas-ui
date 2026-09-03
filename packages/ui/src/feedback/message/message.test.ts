import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { message, destroyAll, type OASMessage } from './index.js'
import '../../framework/app/index.js'

/** 出场动画只在不减动效环境运行；测试默认视为减动效（立即移除），动画行为单独开用例 */
function mockReducedMotion(reduced: boolean): void {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: reduced,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })
}

const EXIT_FALLBACK = 250

describe('message 命令式 API', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    mockReducedMotion(true)
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
    mockReducedMotion(true)
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
    mockReducedMotion(true)
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

describe('message 事件与关闭来源', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    mockReducedMotion(true)
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

  it('oas-close detail.source：destroy → destroy', async () => {
    const listener = vi.fn()
    document.body.addEventListener('oas-close', listener)
    message.info('x', { key: 'k1' })
    await Promise.resolve()
    message.destroy('k1')
    await Promise.resolve()
    expect(listener.mock.calls[0]![0].detail.source).toBe('destroy')
    document.body.removeEventListener('oas-close', listener)
  })

  it('oas-close detail.source：自动关闭 → auto', async () => {
    const listener = vi.fn()
    document.body.addEventListener('oas-close', listener)
    message.info('x', 1000)
    await Promise.resolve()
    vi.advanceTimersByTime(1000)
    await Promise.resolve()
    expect(listener.mock.calls[0]![0].detail.source).toBe('auto')
    document.body.removeEventListener('oas-close', listener)
  })

  it('关闭按钮 → source=close', async () => {
    const listener = vi.fn()
    document.body.addEventListener('oas-close', listener)
    message.info('x')
    await Promise.resolve()
    const btn = document.body
      .querySelector('oas-message')!
      .shadowRoot!.querySelector<HTMLButtonElement>('[part="close"]')!
    btn.click()
    expect(listener.mock.calls[0]![0].detail.source).toBe('close')
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-message').length).toBe(0)
    document.body.removeEventListener('oas-close', listener)
  })

  it('点击消息体触发 onClick 并以 source=click 关闭', async () => {
    const onClick = vi.fn()
    const listener = vi.fn()
    document.body.addEventListener('oas-close', listener)
    message.info('可点击', { onClick, duration: 0 })
    await Promise.resolve()
    const box = document.body
      .querySelector('oas-message')!
      .shadowRoot!.querySelector<HTMLElement>('[part="box"]')!
    box.click()
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0]![0].detail.source).toBe('click')
    document.body.removeEventListener('oas-close', listener)
  })
})

describe('P1 type 图标与 icon 自定义', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    mockReducedMotion(true)
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('内置类型渲染 iconRegistry 内联 SVG（info/success/warning/error）', async () => {
    message.info('信息')
    await Promise.resolve()
    const info = document.body.querySelector('oas-message')!
    expect(info.shadowRoot!.querySelector('[part="icon"]')!.innerHTML).toContain('<svg')
    destroyAll()
    message.success('成功')
    message.warning('警告')
    message.error('错误')
    await Promise.resolve()
    for (const el of document.body.querySelectorAll('oas-message')) {
      expect(el.shadowRoot!.querySelector('[part="icon"]')!.innerHTML).toContain('<svg')
    }
  })

  it('icon 属性自定义图标（查表通道，覆盖类型默认）', async () => {
    message.info('自定义图标', { icon: 'heart' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    expect(el.getAttribute('icon')).toBe('heart')
    expect(el.shadowRoot!.querySelector('[part="icon"]')!.innerHTML).toContain('<svg')
  })

  it('show-icon=false 隐藏类型图标', async () => {
    message.success('无图标', { showIcon: false })
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    expect(el.getAttribute('show-icon')).toBe('false')
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!.style.display,
    ).toBe('none')
  })

  it('默认显示图标（show-icon 未指定时 inline 显示）', async () => {
    message.info('默认图标')
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!.style.display,
    ).not.toBe('none')
  })
})

describe('P2 loading 类型', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    mockReducedMotion(true)
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('loading 默认不自动关、无关闭按钮、spinner 显示', async () => {
    message.loading('提交中')
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    expect(el.getAttribute('type')).toBe('loading')
    expect(el.getAttribute('duration')).toBe('0')
    expect(vi.getTimerCount()).toBe(0)
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.style.display,
    ).toBe('none')
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="spinner"]')!.style.display,
    ).not.toBe('none')
    vi.advanceTimersByTime(60000)
    await Promise.resolve()
    expect(document.body.querySelector('oas-message')).not.toBeNull()
  })

  it('loading 与 update 组合成轻量异步流', async () => {
    message.loading('上传中', { key: 'up' })
    await Promise.resolve()
    message.update('up', { content: '上传成功', type: 'success', duration: 2000 })
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    expect(el.getAttribute('type')).toBe('success')
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toBe('上传成功')
    // 成功后出现关闭按钮
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.style.display,
    ).not.toBe('none')
    vi.advanceTimersByTime(2000)
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-message').length).toBe(0)
  })
})

describe('P3 closable 开关', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    mockReducedMotion(true)
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('默认 true：关闭按钮在场（含 duration=0 手动关闭场景）', async () => {
    message.info('常驻', { duration: 0 })
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.style.display,
    ).not.toBe('none')
  })

  it('closable=false 隐藏关闭按钮', async () => {
    message.info('不可关', { closable: false, duration: 0 })
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    expect(el.getAttribute('closable')).toBe('false')
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.style.display,
    ).toBe('none')
  })
})

describe('P4 hover/focus/页面隐藏暂停与编程式 pause/resume', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    mockReducedMotion(true)
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('悬停暂停计时（剩余时长记账），移开恢复', async () => {
    message.info('可暂停', 3000)
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    el.dispatchEvent(new Event('mouseenter'))
    expect(el.hasAttribute('paused')).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(2000)
    await Promise.resolve()
    expect(document.body.querySelector('oas-message')).not.toBeNull()
    el.dispatchEvent(new Event('mouseleave'))
    expect(el.hasAttribute('paused')).toBe(false)
    // 剩余时长记账：恢复后仍需完整 3000ms 才关闭
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(2999)
    await Promise.resolve()
    expect(document.body.querySelector('oas-message')).not.toBeNull()
    vi.advanceTimersByTime(2)
    await Promise.resolve()
    expect(document.body.querySelector('oas-message')).toBeNull()
  })

  it('悬停途中已过时长不重复计（记账精确）', async () => {
    message.info('过半再悬停', 3000)
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    vi.advanceTimersByTime(1000)
    el.dispatchEvent(new Event('mouseenter'))
    vi.advanceTimersByTime(1000)
    await Promise.resolve()
    el.dispatchEvent(new Event('mouseleave'))
    // 已过 1000ms，剩余 2000ms
    vi.advanceTimersByTime(1999)
    await Promise.resolve()
    expect(document.body.querySelector('oas-message')).not.toBeNull()
    vi.advanceTimersByTime(2)
    await Promise.resolve()
    expect(document.body.querySelector('oas-message')).toBeNull()
  })

  it('pause-on-hover=false 时悬停不暂停', async () => {
    message.info('不暂停', { pauseOnHover: false, duration: 3000 })
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    expect(el.getAttribute('pause-on-hover')).toBe('false')
    el.dispatchEvent(new Event('mouseenter'))
    expect(el.hasAttribute('paused')).toBe(false)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('焦点暂停：focusin 暂停、focusout 恢复', async () => {
    message.info('聚焦暂停', 3000)
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    el.dispatchEvent(new Event('focusin'))
    expect(el.hasAttribute('paused')).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(3000)
    await Promise.resolve()
    expect(document.body.querySelector('oas-message')).not.toBeNull()
    el.dispatchEvent(new Event('focusout'))
    vi.advanceTimersByTime(3000)
    await Promise.resolve()
    expect(document.body.querySelector('oas-message')).toBeNull()
  })

  it('visibilitychange 页面隐藏暂停、恢复继续', async () => {
    message.info('隐藏暂停', 3000)
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    Object.defineProperty(document, 'visibilityState', {
      get: () => 'hidden',
      configurable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(el.hasAttribute('paused')).toBe(true)
    vi.advanceTimersByTime(3000)
    await Promise.resolve()
    expect(document.body.querySelector('oas-message')).not.toBeNull()
    Object.defineProperty(document, 'visibilityState', {
      get: () => 'visible',
      configurable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(el.hasAttribute('paused')).toBe(false)
    vi.advanceTimersByTime(3000)
    await Promise.resolve()
    expect(document.body.querySelector('oas-message')).toBeNull()
  })

  it('编程式 handle.pause()/resume() 生效', async () => {
    const handle = message.info('编程暂停', 3000)
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    handle.pause()
    expect(el.hasAttribute('paused')).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(5000)
    await Promise.resolve()
    expect(document.body.querySelector('oas-message')).not.toBeNull()
    handle.resume()
    vi.advanceTimersByTime(3000)
    await Promise.resolve()
    expect(document.body.querySelector('oas-message')).toBeNull()
  })

  it('duration=0 与 loading 无计时器时 pause 为空操作', async () => {
    const handle = message.info('常驻', 0)
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    handle.pause()
    expect(el.hasAttribute('paused')).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('样式含 paused 时进度条动画暂停规则', async () => {
    message.info('进度暂停', { duration: 3000, showProgress: true })
    await Promise.resolve()
    const styleText = document.body
      .querySelector('oas-message')!
      .shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toContain(':host([paused]) .progress-fill')
  })
})

describe('P5 placement 与 offset', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    mockReducedMotion(true)
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('默认 top：顶部居中栈、offset 16', async () => {
    message.info('顶部')
    await Promise.resolve()
    const stack = document.body.querySelector('oas-message')!.parentElement!
    expect(stack.style.top).toBe('16px')
    expect(stack.style.flexDirection).toBe('column')
  })

  it('placement bottom：独立栈、column-reverse、底部偏移', async () => {
    message.info('底部', { placement: 'bottom' })
    await Promise.resolve()
    const stack = document.body.querySelector('oas-message')!.parentElement!
    expect(stack.style.bottom).toBe('16px')
    expect(stack.style.flexDirection).toBe('column-reverse')
    expect(document.body.querySelector('oas-message')!.getAttribute('placement')).toBe(
      'bottom',
    )
  })

  it('offset 单数字应用到栈', async () => {
    message.info('偏移', { offset: 48 })
    await Promise.resolve()
    const stack = document.body.querySelector('oas-message')!.parentElement!
    expect(stack.style.top).toBe('48px')
    destroyAll()
    message.info('底部偏移', { placement: 'bottom', offset: 80 })
    await Promise.resolve()
    const stack2 = document.body.querySelector('oas-message')!.parentElement!
    expect(stack2.style.bottom).toBe('80px')
  })

  it('top 与 bottom 互不影响（独立栈）', async () => {
    message.info('上')
    message.info('下', { placement: 'bottom' })
    await Promise.resolve()
    const stacks = new Set(
      Array.from(document.body.querySelectorAll('oas-message')).map(
        (m) => m.parentElement!,
      ),
    )
    expect(stacks.size).toBe(2)
  })
})

describe('P6 max 上限（丢最旧派）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    mockReducedMotion(true)
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('超出上限移除最旧消息（首个）', async () => {
    message.info('a', { max: 2, duration: 0 })
    message.info('b', { max: 2, duration: 0 })
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-message').length).toBe(2)
    message.info('c', { max: 2, duration: 0 })
    await Promise.resolve()
    const msgs = document.body.querySelectorAll('oas-message')
    expect(msgs.length).toBe(2)
    expect(msgs[0]!.textContent).toContain('b')
    expect(msgs[1]!.textContent).toContain('c')
  })

  it('max 逐栈生效（top/bottom 各自计数）', async () => {
    message.info('t1', { max: 1 })
    message.info('t2', { max: 1 })
    message.info('b1', { placement: 'bottom', max: 1 })
    message.info('b2', { placement: 'bottom', max: 1 })
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-message').length).toBe(2)
  })

  it('被挤出（丢最旧）的消息派发 oas-close 且 onClose 触发', async () => {
    const onClose = vi.fn()
    const listener = vi.fn()
    document.body.addEventListener('oas-close', listener)
    message.info('旧', { key: 'old', max: 1, onClose, duration: 0 })
    await Promise.resolve()
    message.info('新', { max: 1, duration: 0 })
    await Promise.resolve()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0]![0].detail.source).toBe('destroy')
    document.body.removeEventListener('oas-close', listener)
  })
})

describe('P7 富内容（string | Node）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    mockReducedMotion(true)
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('content 传 Node：Node 注入文本区渲染', async () => {
    const node = document.createElement('span')
    node.innerHTML = '<b>富内容</b>'
    message.info(node, { duration: 0 })
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    const inner = el.shadowRoot!.querySelector<HTMLElement>('.text-inner')!
    expect(inner.contains(node)).toBe(true)
  })

  it('string 内容走文本通道（不注入 Node）', async () => {
    message.info('纯文本', { duration: 0 })
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    expect(el.shadowRoot!.querySelector<HTMLElement>('.text-inner')!.textContent).toBe(
      '纯文本',
    )
  })

  it('update 支持 Node 内容替换', async () => {
    message.info('旧', { key: 'k', duration: 0 })
    await Promise.resolve()
    const node = document.createElement('em')
    node.textContent = '新富内容'
    message.update('k', { content: node })
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    expect(el.shadowRoot!.querySelector<HTMLElement>('.text-inner')!.contains(node)).toBe(
      true,
    )
  })
})

describe('P8 进出场动画', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    mockReducedMotion(true)
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('样式含进出场 keyframes、时长 CSS 变量、prefers-reduced-motion 降级', async () => {
    message.info('动画')
    await Promise.resolve()
    const styleText = document.body
      .querySelector('oas-message')!
      .shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toContain('@keyframes oas-msg-in')
    expect(styleText).toContain('@keyframes oas-msg-out')
    expect(styleText).toContain('--oas-message-anim-in')
    expect(styleText).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('减动效环境：close 立即移除（无 leaving 类）', async () => {
    message.info('立即', 0)
    await Promise.resolve()
    const el = document.body.querySelector<OASMessage>('oas-message')!
    el.close('auto')
    expect(el.shadowRoot!.querySelector('.box')!.classList.contains('leaving')).toBe(
      false,
    )
    expect(document.body.querySelectorAll('oas-message').length).toBe(0)
  })

  it('非减动效环境：close 后带 leaving 类，animationend 兜底超时后移除', async () => {
    mockReducedMotion(false)
    const listener = vi.fn()
    document.body.addEventListener('oas-close', listener)
    message.info('出场', 0)
    await Promise.resolve()
    const el = document.body.querySelector<OASMessage>('oas-message')!
    el.close('auto')
    // oas-close 同步派发（不等动画结束）
    expect(listener).toHaveBeenCalledTimes(1)
    const box = el.shadowRoot!.querySelector<HTMLElement>('.box')!
    expect(box.classList.contains('leaving')).toBe(true)
    // 动画期间仍在 DOM
    expect(document.body.querySelector('oas-message')).not.toBeNull()
    vi.advanceTimersByTime(EXIT_FALLBACK)
    await Promise.resolve()
    expect(document.body.querySelector('oas-message')).toBeNull()
    document.body.removeEventListener('oas-close', listener)
  })
})

describe('P10 question 类型', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    mockReducedMotion(true)
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('message.question 渲染问号图标与 primary 配色规则', async () => {
    message.question('需要确认吗')
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    expect(el.getAttribute('type')).toBe('question')
    expect(el.shadowRoot!.querySelector('[part="icon"]')!.innerHTML).toContain('<svg')
    const styleText = el.shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toContain(":host([type='question']) .box")
  })
})

describe('P11 promise 链', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    mockReducedMotion(true)
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('resolve 后切 success 并自动关闭', async () => {
    const p = Promise.resolve('数据')
    message.promise(p, {
      loading: '加载中',
      success: (d) => `成功：${d}`,
      error: '失败',
    })
    // loading 态在微任务流转前同步可见
    const el = document.body.querySelector('oas-message')!
    expect(el.getAttribute('type')).toBe('loading')
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toBe('加载中')
    await Promise.resolve()
    expect(el.getAttribute('type')).toBe('success')
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toBe('成功：数据')
    vi.advanceTimersByTime(3000)
    await Promise.resolve()
    expect(document.body.querySelector('oas-message')).toBeNull()
  })

  it('reject 后切 error', async () => {
    const p = Promise.reject(new Error('boom'))
    message.promise(p, {
      loading: '加载中',
      success: '成功',
      error: (e) => `失败：${(e as Error).message}`,
    })
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    expect(el.getAttribute('type')).toBe('error')
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toBe('失败：boom')
  })
})

describe('P12 倒计时进度条', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    mockReducedMotion(true)
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('showProgress 显示进度条，动画时长与 duration 同步', async () => {
    message.info('进度', { duration: 4000, showProgress: true })
    await Promise.resolve()
    const el = document.body.querySelector('oas-message')!
    const progress = el.shadowRoot!.querySelector<HTMLElement>('[part="progress"]')!
    expect(progress.hidden).toBe(false)
    expect(progress.querySelector<HTMLElement>('.progress-fill')!.style.animationDuration).toBe(
      '4000ms',
    )
  })

  it('未开 showProgress 或 duration=0 时隐藏', async () => {
    message.info('无进度', 3000)
    await Promise.resolve()
    expect(
      document.body
        .querySelector('oas-message')!
        .shadowRoot!.querySelector<HTMLElement>('[part="progress"]')!.hidden,
    ).toBe(true)
    destroyAll()
    message.info('常驻进度', { duration: 0, showProgress: true })
    await Promise.resolve()
    expect(
      document.body
        .querySelector('oas-message')!
        .shadowRoot!.querySelector<HTMLElement>('[part="progress"]')!.hidden,
    ).toBe(true)
  })

  it('loading 类型不显示进度条', async () => {
    message.loading('加载中')
    await Promise.resolve()
    expect(
      document.body
        .querySelector('oas-message')!
        .shadowRoot!.querySelector<HTMLElement>('[part="progress"]')!.hidden,
    ).toBe(true)
  })
})

describe('P13 定制杂项', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    mockReducedMotion(true)
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  describe('avatar 插槽', () => {
    it('options.avatar Node 渲染进 avatar 区', async () => {
      const avatar = document.createElement('span')
      avatar.textContent = '头像'
      message.info('内容', { avatar, duration: 0 })
      await Promise.resolve()
      const el = document.body.querySelector('oas-message')!
      expect(el.shadowRoot!.querySelector<HTMLElement>('.avatar')!.contains(avatar)).toBe(
        true,
      )
      expect(
        el.shadowRoot!.querySelector<HTMLElement>('[part="avatar"]')!.hidden,
      ).toBe(false)
    })

    it('声明式 slot="avatar" 渲染，未提供时 avatar 区隐藏', async () => {
      const el = document.createElement('oas-message')
      el.setAttribute('duration', '0')
      el.innerHTML = '<span slot="avatar">A</span>'
      document.body.appendChild(el)
      await Promise.resolve()
      expect(
        el.shadowRoot!.querySelector<HTMLElement>('[part="avatar"]')!.hidden,
      ).toBe(false)
      const el2 = document.createElement('oas-message')
      el2.setAttribute('duration', '0')
      document.body.appendChild(el2)
      expect(el2.shadowRoot!.querySelector<HTMLElement>('[part="avatar"]')!.hidden).toBe(
        true,
      )
    })
  })

  describe('spinner 自定义', () => {
    it('默认 spinner：CSS 圆环 + 旋转 keyframes', async () => {
      message.loading('加载')
      await Promise.resolve()
      const styleText = document.body
        .querySelector('oas-message')!
        .shadowRoot!.querySelector('style')!.textContent!
      expect(styleText).toContain('@keyframes oas-msg-spin')
    })

    it('spinner 传图标名：查表渲染内联 SVG 进 spinner 区', async () => {
      message.loading('加载', { spinner: 'refresh' })
      await Promise.resolve()
      const el = document.body.querySelector('oas-message')!
      expect(el.shadowRoot!.querySelector('.spinner-fallback')!.innerHTML).toContain(
        '<svg',
      )
    })

    it('spinner 传 Node：Node 注入 spinner 区', async () => {
      const node = document.createElement('span')
      node.textContent = '转'
      message.loading('加载', { spinner: node })
      await Promise.resolve()
      const el = document.body.querySelector('oas-message')!
      expect(el.shadowRoot!.querySelector<HTMLElement>('.spinner-fallback')!.contains(node)).toBe(
        true,
      )
    })
  })

  describe('registerType 自定义类型注册', () => {
    it('注册类型渲染：图标 + 颜色 + 不可关生效', async () => {
      message.registerType('custom-alert', { icon: 'alert-circle', color: '#7c3aed' })
      message.show('custom-alert', '自定义类型', { duration: 0 })
      await Promise.resolve()
      const el = document.body.querySelector<OASMessage>('oas-message')!
      expect(el.getAttribute('type')).toBe('custom-alert')
      expect(el.shadowRoot!.querySelector('[part="icon"]')!.innerHTML).toContain('<svg')
      expect(el.style.getPropertyValue('--oas-msg-type-color')).toBe('#7c3aed')
      const styleText = el.shadowRoot!.querySelector('style')!.textContent!
      expect(styleText).toContain('--oas-msg-type-color')
      expect(
        el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.style.display,
      ).not.toBe('none')
    })

    it('注册类型 closable:false 隐藏关闭按钮', async () => {
      message.registerType('custom-fixed', { closable: false })
      message.show('custom-fixed', '不可关', { duration: 0 })
      await Promise.resolve()
      const el = document.body.querySelector('oas-message')!
      expect(
        el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.style.display,
      ).toBe('none')
    })

    it('未注册类型回落 info（dev 告警）', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        message.show('ghost-type', '未知类型')
        await Promise.resolve()
        expect(warn).toHaveBeenCalled()
        const el = document.body.querySelector('oas-message')!
        expect(el.getAttribute('type')).toBe('ghost-type')
        // 无图标配置 → 图标区为空
        expect(el.shadowRoot!.querySelector('[part="icon"]')!.innerHTML).toBe('')
      } finally {
        warn.mockRestore()
      }
    })
  })

  describe('repeatNum 重复计数徽标', () => {
    it('repeatNum=true 时合并计数徽标随 count 更新', async () => {
      message.info('重复', { group: 'rep', repeatNum: true, duration: 0 })
      message.info('重复', { group: 'rep', repeatNum: true, duration: 0 })
      message.info('重复', { group: 'rep', repeatNum: true, duration: 0 })
      await Promise.resolve()
      const el = document.body.querySelector('oas-message')!
      const badge = el.shadowRoot!.querySelector<HTMLElement>('[part="badge"]')!
      expect(badge.hidden).toBe(false)
      expect(badge.textContent).toBe('3')
    })

    it('repeatNum 数字：静态徽标数字展示', async () => {
      message.info('热点', { repeatNum: 5, duration: 0 })
      await Promise.resolve()
      const el = document.body.querySelector('oas-message')!
      const badge = el.shadowRoot!.querySelector<HTMLElement>('[part="badge"]')!
      expect(badge.hidden).toBe(false)
      expect(badge.textContent).toBe('5')
    })

    it('未启用 repeatNum 时徽标隐藏', async () => {
      message.info('普通', { group: 'g', duration: 0 })
      message.info('普通', { group: 'g', duration: 0 })
      await Promise.resolve()
      expect(
        document.body
          .querySelector('oas-message')!
          .shadowRoot!.querySelector<HTMLElement>('[part="badge"]')!.hidden,
      ).toBe(true)
    })
  })

  describe('mask 遮罩', () => {
    it('mask 渲染遮罩层，点击遮罩以 source=mask 关闭', async () => {
      const listener = vi.fn()
      document.body.addEventListener('oas-close', listener)
      message.info('带遮罩', { mask: true, duration: 0 })
      await Promise.resolve()
      const el = document.body.querySelector('oas-message')!
      const mask = el.shadowRoot!.querySelector<HTMLElement>('[part="mask"]')!
      expect(mask.hidden).toBe(false)
      mask.click()
      expect(listener.mock.calls[0]![0].detail.source).toBe('mask')
      document.body.removeEventListener('oas-close', listener)
    })

    it('未开 mask 时遮罩隐藏', async () => {
      message.info('无遮罩', { duration: 0 })
      await Promise.resolve()
      expect(
        document.body
          .querySelector('oas-message')!
          .shadowRoot!.querySelector<HTMLElement>('[part="mask"]')!.hidden,
      ).toBe(true)
    })
  })
})

describe('P15 声明式元素用法', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    mockReducedMotion(true)
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('声明式渲染文本、类型样式与自动关闭', async () => {
    const el = document.createElement('oas-message')
    el.setAttribute('type', 'success')
    el.setAttribute('duration', '2000')
    el.textContent = '声明式消息'
    document.body.appendChild(el)
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toBe('声明式消息')
    expect(el.getAttribute('type')).toBe('success')
    vi.advanceTimersByTime(2000)
    await Promise.resolve()
    expect(document.body.querySelector('oas-message')).toBeNull()
  })

  it('声明式 slot="content" 富内容渲染', async () => {
    const el = document.createElement('oas-message')
    el.setAttribute('duration', '0')
    el.innerHTML = '<b slot="content">加粗富内容</b>'
    document.body.appendChild(el)
    await Promise.resolve()
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="content"]')!
    expect(slot.assignedNodes().length).toBeGreaterThan(0)
    expect(el.shadowRoot!.querySelector<HTMLElement>('.text-inner')!.hidden).toBe(true)
  })
})

describe('P16 app 全局默认白名单', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    mockReducedMotion(true)
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('新 options 键补进 app 白名单：placement/offset/closable/showProgress/pauseOnHover/showIcon/max 生效', async () => {
    const app = document.createElement('oas-app')
    app.setAttribute(
      'message',
      JSON.stringify({
        placement: 'bottom',
        offset: 40,
        closable: false,
        showProgress: true,
        pauseOnHover: false,
        showIcon: false,
        max: 1,
      }),
    )
    document.body.appendChild(app)

    message.info('第一条')
    await Promise.resolve()
    const el = app.querySelector('oas-message')!
    expect(el.getAttribute('placement')).toBe('bottom')
    expect(el.getAttribute('closable')).toBe('false')
    expect(el.hasAttribute('show-progress')).toBe(true)
    expect(el.getAttribute('pause-on-hover')).toBe('false')
    expect(el.getAttribute('show-icon')).toBe('false')
    expect(el.parentElement!.style.bottom).toBe('40px')

    // max=1：第二条挤掉第一条
    message.info('第二条')
    await Promise.resolve()
    expect(app.querySelectorAll('oas-message').length).toBe(1)
    expect(app.querySelector('oas-message')!.textContent).toContain('第二条')
  })

  it('调用参数优先于 app 默认', async () => {
    const app = document.createElement('oas-app')
    app.setAttribute('message', '{"placement": "bottom", "closable": false}')
    document.body.appendChild(app)

    message.info('覆盖', { placement: 'top', closable: true })
    await Promise.resolve()
    const el = app.querySelector('oas-message')!
    expect(el.getAttribute('placement')).toBe('top')
    expect(el.hasAttribute('closable')).toBe(false)
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.style.display,
    ).not.toBe('none')
  })

  it('非白名单键不生效（group/key/onClose 运行时键）', async () => {
    const app = document.createElement('oas-app')
    app.setAttribute('message', '{"group": "gg", "onClose": 1}')
    document.body.appendChild(app)

    message.info('无组')
    await Promise.resolve()
    const el = app.querySelector('oas-message')!
    expect(el.getAttribute('group')).toBeNull()
  })
})
