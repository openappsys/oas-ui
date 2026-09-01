import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { toast, destroyAll, type OASToast, type ToastHandle } from './index.js'
// 注册 oas-app（P5 全局默认配置白名单测试需要）
import '../../floating/app/index.js'

/** 离场动画默认时长（--oas-toast-leave-duration 回落常量，与组件一致） */
const LEAVE = 200

function el(): OASToast {
  return document.body.querySelector('oas-toast') as OASToast
}

function all(): OASToast[] {
  return [
    ...(document.body.querySelectorAll('oas-toast') as NodeListOf<OASToast>),
  ]
}

function titleOf(t: OASToast): string {
  return t.shadowRoot!.querySelector('[part="title"]')!.textContent ?? ''
}

/** 推进计时器并让微任务落定 */
function tick(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms)
  return Promise.resolve()
}

/** 关闭后等离场动画移除 */
async function settleClose(): Promise<void> {
  await tick(LEAVE)
}

function resetConfig(): void {
  toast.config({
    duration: undefined,
    position: undefined,
    closable: undefined,
    priority: undefined,
    max: undefined,
    politeness: undefined,
    variant: undefined,
    showProgress: undefined,
    progressRing: undefined,
    swipeDirection: undefined,
    grouping: undefined,
    stacked: undefined,
    pauseOnHover: undefined,
    pauseOnFocus: undefined,
    pauseOnWindowBlur: undefined,
  })
}

describe('toast 命令式 API（既有能力回归）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('toast.success 渲染并 3000ms 自动关闭（离场动画后移除，计时器清理）', async () => {
    toast.success({ title: '操作成功' })
    await Promise.resolve()
    const t = el()
    expect(t).not.toBeNull()
    expect(titleOf(t)).toBe('操作成功')
    expect(t.getAttribute('type')).toBe('success')
    expect(vi.getTimerCount()).toBe(1)
    await tick(3000)
    expect(vi.getTimerCount()).toBe(1) // 离场动画计时
    await settleClose()
    expect(document.body.querySelector('oas-toast')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('error 类型 role=alert，其余 role=status', () => {
    toast.error({ title: '出错了' })
    expect(el().shadowRoot!.querySelector('[role="alert"]')).not.toBeNull()
    destroyAll()
    toast.info({ title: '信息' })
    expect(el().shadowRoot!.querySelector('[role="status"]')).not.toBeNull()
  })

  it('duration 0 不自动关闭', async () => {
    toast.info({ title: '常驻', duration: 0 })
    await tick(60000)
    expect(document.body.querySelector('oas-toast')).not.toBeNull()
  })

  it('closable=false 关闭按钮隐藏（loading 恒不可关）', () => {
    toast.info({ title: '不可关', closable: false })
    const close = el().shadowRoot!.querySelector<HTMLElement>('[part="close"]')!
    expect(close).not.toBeNull()
    expect(close.hidden).toBe(true)
  })

  it('action 点击触发 onClick 并关闭 toast', async () => {
    const onClick = vi.fn()
    toast.info({ title: '有操作', action: { label: '查看', onClick } })
    const t = el()
    const btn = t.shadowRoot!.querySelector('[part="action"]') as HTMLButtonElement
    expect(btn).not.toBeNull()
    expect(btn.type).toBe('button')
    expect(btn.textContent).toBe('查看')
    btn.click()
    expect(onClick).toHaveBeenCalledTimes(1)
    await settleClose()
    expect(document.body.querySelector('oas-toast')).toBeNull()
  })

  it('loading 态不可关：无关闭按钮、不自动关', async () => {
    toast.loading({ title: '提交中' })
    const t = el()
    expect(t.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.hidden).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    await tick(60000)
    expect(document.body.querySelector('oas-toast')).not.toBeNull()
  })

  it('handle.close() 手动关闭并清理计时器', async () => {
    const handle = toast.info({ title: '手动关闭' })
    expect(vi.getTimerCount()).toBe(1)
    handle.close()
    await settleClose()
    expect(document.body.querySelectorAll('oas-toast').length).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('多开复用单容器（同一 position 共享 stack）', () => {
    toast.info({ title: 'a' })
    toast.success({ title: 'b' })
    const els = all()
    expect(els.length).toBe(2)
    expect(els[0]!.parentElement).toBe(els[1]!.parentElement)
  })

  it('不同 position 使用不同容器', () => {
    toast.info({ title: 'a', position: 'top-right' })
    toast.info({ title: 'b', position: 'bottom-left' })
    const els = all()
    expect(els.length).toBe(2)
    expect(els[0]!.parentElement).not.toBe(els[1]!.parentElement)
  })

  it('description 渲染与显隐', () => {
    toast.info({ title: '标题', description: '详情描述' })
    expect(el().shadowRoot!.querySelector('[part="description"]')!.textContent).toBe('详情描述')
    destroyAll()
    toast.info({ title: '无描述' })
    const desc = el().shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    expect(desc.style.display).toBe('none')
  })

  it('destroyAll 清空全部并触发外部移除（计时器清理）', async () => {
    const onClose = vi.fn()
    toast.info({ title: 'a' })
    toast.info({ title: 'b', onClose })
    expect(all().length).toBe(2)
    destroyAll()
    await Promise.resolve()
    expect(all().length).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('promise 链：resolve 后切 success 并自动关闭', async () => {
    toast.promise(Promise.resolve('数据'), {
      loading: '提交中',
      success: (d) => `成功：${d}`,
      error: '失败',
    })
    const t = el()
    expect(t.getAttribute('type')).toBe('loading')
    expect(titleOf(t)).toBe('提交中')
    await Promise.resolve()
    expect(t.getAttribute('type')).toBe('success')
    expect(titleOf(t)).toBe('成功：数据')
    await tick(3000)
    await settleClose()
    expect(document.body.querySelector('oas-toast')).toBeNull()
  })

  it('promise 链：reject 后切 error', async () => {
    toast.promise(Promise.reject(new Error('boom')), {
      loading: '提交中',
      success: '成功',
      error: (e) => `失败：${(e as Error).message}`,
    })
    await Promise.resolve()
    const t = el()
    expect(t.getAttribute('type')).toBe('error')
    expect(titleOf(t)).toBe('失败：boom')
  })

  it('关闭按钮 aria-label 走 locale（toast.close）', () => {
    toast.info({ title: '标题' })
    expect(
      el().shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.getAttribute('aria-label'),
    ).toBe('关闭')
  })

  describe('title 吸收（消除宿主原生 tooltip）', () => {
    it('挂载后宿主不再残留 title 属性，标题照常渲染进标题区', async () => {
      toast.success({ title: '操作成功' })
      await Promise.resolve()
      expect(el().hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(titleOf(el())).toBe('操作成功')
    })

    it('吸收后二次 update 幂等（type 变化不丢标题、宿主 title 不复活）', () => {
      toast.info({ title: '通知' })
      const t = el()
      t.setAttribute('type', 'success') // 触发二次 update
      expect(titleOf(t)).toBe('通知')
      expect(t.hasAttribute('title')).toBe(false)
    })

    it('transition() 数据通道：设置即吸收，宿主无残留、标题更新', () => {
      toast.loading({ title: '提交中' })
      const t = el()
      expect(t.hasAttribute('title')).toBe(false)
      t.transition('success', '成功：数据')
      expect(titleOf(t)).toBe('成功：数据')
      expect(t.hasAttribute('title')).toBe(false)
      expect(t.getAttribute('type')).toBe('success')
    })

    it('handle.update 清空标题（title="" 数据通道）', () => {
      const handle = toast.info({ title: '标题' })
      handle.update({ title: '' })
      expect(titleOf(el())).toBe('')
      expect(el().hasAttribute('title')).toBe(false)
    })
  })

  describe('title 双通道（slot 富内容 / 命令式 Node）', () => {
    it('title 插槽有内容时覆盖属性文本（slot 优先渲染）', () => {
      const t = document.createElement('oas-toast') as OASToast
      t.setAttribute('title', '属性标题')
      t.setAttribute('duration', '0')
      t.innerHTML = '<span slot="title">插槽标题</span>'
      document.body.appendChild(t)
      const slot = t.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = t.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      expect(t.hasAttribute('title')).toBe(false)
    })

    it('双空（无 title 无 slot）：标题区不渲染文本（兜底为空、不隐藏）', () => {
      const t = document.createElement('oas-toast') as OASToast
      t.setAttribute('duration', '0')
      document.body.appendChild(t)
      const fallback = t.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('')
      expect(t.hasAttribute('title')).toBe(false)
    })

    it('命令式 options.title 传 Node：Node 移动进标题区（忽略 titleCache 文本路径）', async () => {
      const node = document.createElement('span')
      node.textContent = '富内容标题'
      toast.success({ title: node })
      await Promise.resolve()
      const fallback = el().shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.contains(node)).toBe(true)
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('富内容标题')
      expect(el().hasAttribute('title')).toBe(false)
    })

    it('transition() title 传 Node：Node 渲染进标题区', () => {
      toast.loading({ title: '提交中' })
      const node = document.createElement('span')
      node.textContent = '加载中详情'
      el().transition('loading', node)
      const fallback = el().shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.contains(node)).toBe(true)
      expect(fallback.hidden).toBe(false)
      expect(el().hasAttribute('title')).toBe(false)
    })
  })
})

describe('P1 onClose 回调 + 生命周期事件', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('onClose 在自动关闭时触发一次', () => {
    const onClose = vi.fn()
    toast.info({ title: 'x', onClose })
    vi.advanceTimersByTime(3000)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('onClose 在手动 close 时触发一次', async () => {
    const onClose = vi.fn()
    const handle = toast.info({ title: 'x', onClose })
    handle.close()
    await Promise.resolve()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('onClose 在 destroyAll 时触发', async () => {
    const onClose = vi.fn()
    toast.info({ title: 'x', onClose })
    destroyAll()
    await Promise.resolve()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('open/close/destroy 事件全链（声明式）', async () => {
    const t = document.createElement('oas-toast') as OASToast
    t.setAttribute('title', 'x')
    t.setAttribute('duration', '0')
    const events: string[] = []
    t.addEventListener('oas-open', (e) => events.push(`open:${(e as CustomEvent).detail?.trigger}`))
    t.addEventListener('oas-close', (e) => events.push(`close:${(e as CustomEvent).detail?.trigger}`))
    t.addEventListener('oas-destroy', (e) => events.push(`destroy:${(e as CustomEvent).detail?.trigger}`))
    document.body.appendChild(t)
    expect(events).toEqual(['open:show'])
    t.close('manual')
    await Promise.resolve()
    expect(events).toEqual(['open:show', 'close:manual'])
    await settleClose()
    expect(events).toEqual(['open:show', 'close:manual', 'destroy:manual'])
  })

  it('close 事件可被宿主监听（命令式，携带 trigger=auto）', () => {
    const onCloseEvent = vi.fn()
    toast.info({ title: 'x' })
    el().addEventListener('oas-close', (e) =>
      onCloseEvent((e as CustomEvent).detail?.trigger),
    )
    vi.advanceTimersByTime(3000)
    expect(onCloseEvent).toHaveBeenCalledWith('auto')
  })
})

describe('P2 按 id 的 update 与 close', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('toast.update 原位更新内容/类型/时长', async () => {
    toast.info({ title: '旧标题', id: 'upload', duration: 0 })
    toast.update('upload', { title: '新标题', type: 'success', duration: 5000 })
    const t = document.body.querySelector('oas-toast[id="upload"]') as OASToast
    expect(t).not.toBeNull()
    expect(t.getAttribute('type')).toBe('success')
    expect(titleOf(t)).toBe('新标题')
    expect(t.getAttribute('duration')).toBe('5000')
    // 更新后重置计时：5s 到点才关
    await tick(4999)
    expect(document.body.querySelector('oas-toast[id="upload"]')).not.toBeNull()
    await tick(1)
    await settleClose()
    expect(document.body.querySelector('oas-toast[id="upload"]')).toBeNull()
  })

  it('同 id 再次调用视为更新（不新增）', () => {
    toast.info({ title: 'a', id: 'k', duration: 0 })
    toast.info({ title: 'b', id: 'k', duration: 0 })
    expect(all().length).toBe(1)
    expect(titleOf(el())).toBe('b')
  })

  it('toast.update 不存在则新建', () => {
    toast.update('new-id', { title: '新建', type: 'warning' })
    const t = document.body.querySelector('oas-toast[id="new-id"]') as OASToast
    expect(t).not.toBeNull()
    expect(t.getAttribute('type')).toBe('warning')
  })

  it('toast.dismiss 关闭指定 id，其余保留', async () => {
    toast.info({ title: 'a', id: 'a', duration: 0 })
    toast.info({ title: 'b', id: 'b', duration: 0 })
    toast.dismiss('a')
    await settleClose()
    expect(document.body.querySelector('oas-toast[id="a"]')).toBeNull()
    expect(document.body.querySelector('oas-toast[id="b"]')).not.toBeNull()
  })

  it('toast.dismiss 不存在则静默无操作', () => {
    expect(() => toast.dismiss('nope')).not.toThrow()
  })

  it('handle.update 可用且不新增', () => {
    const handle: ToastHandle = toast.info({ title: '旧', id: 'h', duration: 0 })
    handle.update({ title: '新' })
    expect(all().length).toBe(1)
    expect(titleOf(el())).toBe('新')
  })
})

describe('P3 max 可见数 + 超限队列 + priority 优先级', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    resetConfig()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('max=2：第三条排队不挂 DOM，关闭后补位', async () => {
    toast.config({ max: 2, duration: 0 })
    toast.info({ title: 'a', id: 'a', duration: 0 })
    toast.info({ title: 'b', id: 'b', duration: 0 })
    toast.info({ title: 'c', id: 'c', duration: 0 })
    expect(all().length).toBe(2)
    expect(document.body.querySelector('oas-toast[id="c"]')).toBeNull()
    // 关闭 a → c 补位
    toast.dismiss('a')
    await Promise.resolve()
    expect(document.body.querySelector('oas-toast[id="c"]')).not.toBeNull()
    await settleClose()
    expect(document.body.querySelector('oas-toast[id="a"]')).toBeNull()
    expect(all().length).toBe(2)
  })

  it('排队中的 toast 可 dismiss/update（队列操作）', async () => {
    toast.config({ max: 1, duration: 0 })
    toast.info({ title: 'a', id: 'a', duration: 0 })
    toast.info({ title: 'b', id: 'b', duration: 0 })
    // b 排队中 → update 内容
    toast.update('b', { title: 'b2' })
    // dismiss b → 队列清空
    toast.dismiss('b')
    toast.dismiss('a')
    await settleClose()
    expect(all().length).toBe(0)
  })

  it('高优先级抢占低优先级可见位', async () => {
    toast.config({ max: 1, duration: 0 })
    toast.info({ title: 'low', id: 'low', priority: 0 })
    toast.info({ title: 'high', id: 'high', priority: 5 })
    await Promise.resolve()
    expect(document.body.querySelector('oas-toast[id="high"]')).not.toBeNull()
    await settleClose()
    expect(document.body.querySelector('oas-toast[id="low"]')).toBeNull()
  })

  it('低/同级不抢占：入队等待', () => {
    toast.config({ max: 1, duration: 0 })
    toast.info({ title: 'a', id: 'a', priority: 5 })
    toast.info({ title: 'b', id: 'b', priority: 0 })
    expect(all().length).toBe(1)
    expect(document.body.querySelector('oas-toast[id="a"]')).not.toBeNull()
    expect(document.body.querySelector('oas-toast[id="b"]')).toBeNull()
  })

  it('抢占时队列已有补位：新 toast 入队不超 max', async () => {
    // 曾现缺口：抢占触发 dequeue 先补位，再挂新导致超 max。现要求二次判定入队。
    toast.config({ max: 1, duration: 0 })
    toast.info({ title: 'a', id: 'a', priority: 0 })
    toast.info({ title: 'b', id: 'b', priority: 0 }) // 同级 → 排队
    toast.info({ title: 'c', id: 'c', priority: 5 }) // 抢占 a → b 补位 → c 入队
    await settleClose() // a 离场完毕
    expect(all().length).toBe(1)
    expect(document.body.querySelector('oas-toast[id="b"]')).not.toBeNull()
    expect(document.body.querySelector('oas-toast[id="c"]')).toBeNull()
    // 关闭 b → c 出队补位（b 离场后只剩 c）
    toast.dismiss('b')
    expect(document.body.querySelector('oas-toast[id="c"]')).not.toBeNull()
    await settleClose()
    expect(all().length).toBe(1)
  })
})

describe('P4 hover/聚焦/窗口失焦暂停计时（剩余时长记账）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('hover 暂停：暂停期间不关闭，恢复后按剩余续跑', async () => {
    toast.info({ title: 'x', duration: 1000 })
    const t = el()
    t.dispatchEvent(new Event('pointerenter'))
    await tick(5000) // 暂停中推进
    expect(document.body.querySelector('oas-toast')).not.toBeNull()
    t.dispatchEvent(new Event('pointerleave'))
    await tick(999)
    expect(document.body.querySelector('oas-toast')).not.toBeNull()
    await tick(1)
    await settleClose()
    expect(document.body.querySelector('oas-toast')).toBeNull()
  })

  it('剩余时长记账：暂停前已消耗的时间不再计', async () => {
    toast.info({ title: 'x', duration: 1000 })
    const t = el()
    await tick(400) // 消耗 400ms
    t.dispatchEvent(new Event('pointerenter')) // 暂停，剩余 600
    await tick(5000)
    t.dispatchEvent(new Event('pointerleave'))
    await tick(599) // 剩余 600-599=1
    expect(document.body.querySelector('oas-toast')).not.toBeNull()
    await tick(1)
    await settleClose()
    expect(document.body.querySelector('oas-toast')).toBeNull()
  })

  it('聚焦暂停：focusin 暂停 / focusout 恢复', async () => {
    toast.info({ title: 'x', duration: 1000 })
    const t = el()
    t.dispatchEvent(new Event('focusin'))
    await tick(5000)
    expect(document.body.querySelector('oas-toast')).not.toBeNull()
    t.dispatchEvent(new Event('focusout'))
    await tick(1000)
    await settleClose()
    expect(document.body.querySelector('oas-toast')).toBeNull()
  })

  it('窗口失焦暂停：window blur 暂停 / focus 恢复', async () => {
    toast.info({ title: 'x', duration: 1000 })
    window.dispatchEvent(new Event('blur'))
    await tick(5000)
    expect(document.body.querySelector('oas-toast')).not.toBeNull()
    window.dispatchEvent(new Event('focus'))
    await tick(1000)
    await settleClose()
    expect(document.body.querySelector('oas-toast')).toBeNull()
  })

  it('pauseOnHover=false 关闭 hover 暂停', async () => {
    toast.info({ title: 'x', duration: 1000, pauseOnHover: false })
    el().dispatchEvent(new Event('pointerenter'))
    await tick(1000)
    await settleClose()
    expect(document.body.querySelector('oas-toast')).toBeNull()
  })

  it('暂停开关属性变化即时生效（update 清理失效暂停源）', async () => {
    toast.info({ title: 'x', duration: 1000 })
    const t = el()
    t.dispatchEvent(new Event('pointerenter'))
    t.setAttribute('pause-on-hover', 'false')
    await tick(1000)
    await settleClose()
    expect(document.body.querySelector('oas-toast')).toBeNull()
  })
})

describe('P5 全局默认配置（toast.config + app 白名单）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    resetConfig()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('toast.config 设置默认 duration，调用不传即生效', () => {
    toast.config({ duration: 5000 })
    toast.info({ title: 'x' })
    expect(el().getAttribute('duration')).toBe('5000')
  })

  it('调用参数优先于 config', () => {
    toast.config({ duration: 5000 })
    toast.info({ title: 'x', duration: 800 })
    expect(el().getAttribute('duration')).toBe('800')
  })

  it('config 可设默认位置/不可关', () => {
    toast.config({ position: 'bottom-left', closable: false })
    toast.info({ title: 'x' })
    const t = el()
    expect(t.parentElement!.style.cssText).toContain('bottom: 16px; left: 16px')
    expect(t.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.hidden).toBe(true)
  })

  it('app 白名单：<oas-app toast="{}"> 兜底默认 duration 且栈挂 app 内', () => {
    const app = document.createElement('oas-app')
    app.setAttribute('toast', '{"duration": 1500}')
    document.body.appendChild(app)
    toast.info({ title: 'x' })
    const t = app.querySelector('oas-toast') as OASToast
    expect(t).not.toBeNull()
    expect(t.getAttribute('duration')).toBe('1500')
  })

  it('优先级：调用 > config > app', () => {
    const app = document.createElement('oas-app')
    app.setAttribute('toast', '{"duration": 1500}')
    document.body.appendChild(app)
    toast.config({ duration: 2000 })
    toast.info({ title: 'x' })
    toast.info({ title: 'y', duration: 800 })
    const allT = all()
    expect(allT[0]!.getAttribute('duration')).toBe('2000')
    expect(allT[1]!.getAttribute('duration')).toBe('800')
  })

  it('app toast 配置非法 JSON：忽略 + 回落默认', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const app = document.createElement('oas-app')
    app.setAttribute('toast', '{bad json')
    document.body.appendChild(app)
    toast.info({ title: 'x' })
    expect(el().getAttribute('duration')).toBe('3000')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('非法 toast JSON'))
    warn.mockRestore()
  })
})

describe('P6 键盘可达：Esc 关闭当前', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('焦点在 toast 内时按 Esc 关闭', async () => {
    toast.info({ title: 'x', duration: 0 })
    const t = el()
    t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await settleClose()
    expect(document.body.querySelector('oas-toast')).toBeNull()
  })

  it('Esc 触发的是 esc trigger（事件可查）', () => {
    const onClose = vi.fn()
    toast.info({ title: 'x', duration: 0, onClose })
    el().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('其他键不关闭', async () => {
    toast.info({ title: 'x', duration: 0 })
    el().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await Promise.resolve()
    expect(document.body.querySelector('oas-toast')).not.toBeNull()
  })
})

describe('P7 屏幕阅读器敏感度控制（politeness）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  function boxAttr(name: string): string | null {
    return el().shadowRoot!.querySelector('[part="box"]')!.getAttribute(name)
  }

  it('politeness=assertive → role=alert + aria-live=assertive + aria-atomic', () => {
    toast.info({ title: 'x', politeness: 'assertive' })
    expect(boxAttr('role')).toBe('alert')
    expect(boxAttr('aria-live')).toBe('assertive')
    expect(boxAttr('aria-atomic')).toBe('true')
  })

  it('politeness=polite → role=status + aria-live=polite', () => {
    toast.error({ title: 'x', politeness: 'polite' })
    expect(boxAttr('role')).toBe('status')
    expect(boxAttr('aria-live')).toBe('polite')
  })

  it('缺省按类型：error=assertive，其余 polite', () => {
    toast.error({ title: 'x' })
    expect(boxAttr('role')).toBe('alert')
    expect(boxAttr('aria-live')).toBe('assertive')
    destroyAll()
    toast.info({ title: 'x' })
    expect(boxAttr('role')).toBe('status')
    expect(boxAttr('aria-live')).toBe('polite')
  })
})

describe('P8 剩余时间进度条（轻量版）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('show-progress 且 duration>0：进度条可见，动画时长与 duration 同步', () => {
    toast.info({ title: 'x', showProgress: true, duration: 3000 })
    const progress = el().shadowRoot!.querySelector<HTMLElement>('[part="progress"]')!
    expect(progress.hidden).toBe(false)
    const fill = progress.querySelector<HTMLElement>('.progress-fill')!
    expect(fill.style.animationDuration).toBe('3000ms')
  })

  it('duration=0 不显示进度条', () => {
    toast.info({ title: 'x', showProgress: true, duration: 0 })
    expect(el().shadowRoot!.querySelector<HTMLElement>('[part="progress"]')!.hidden).toBe(true)
  })

  it('progress-position=top 切顶部', () => {
    toast.info({ title: 'x', showProgress: true, duration: 3000, progressPosition: 'top' })
    const progress = el().shadowRoot!.querySelector<HTMLElement>('[part="progress"]')!
    expect(progress.classList.contains('progress-top')).toBe(true)
  })

  it('暂停时进度动画定格（animation-play-state=paused）', () => {
    toast.info({ title: 'x', showProgress: true, duration: 3000 })
    const fill = el().shadowRoot!.querySelector<HTMLElement>('.progress-fill')!
    el().dispatchEvent(new Event('pointerenter'))
    expect(fill.style.animationPlayState).toBe('paused')
    el().dispatchEvent(new Event('pointerleave'))
    expect(fill.style.animationPlayState).toBe('running')
  })
})

describe('P9 同内容去重 grouping（badge 计数）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('grouping 同内容：合并为一条并递增计数徽标', () => {
    toast.info({ title: '保存成功', grouping: true, duration: 0 })
    toast.info({ title: '保存成功', grouping: true, duration: 0 })
    expect(all().length).toBe(1)
    expect(el().getAttribute('count')).toBe('2')
    const badge = el().shadowRoot!.querySelector<HTMLElement>('[part="count"]')!
    expect(badge.hidden).toBe(false)
    expect(badge.textContent).toBe('×2')
  })

  it('grouping 不同内容：各自独立', () => {
    toast.info({ title: '保存成功', grouping: true, duration: 0 })
    toast.info({ title: '删除成功', grouping: true, duration: 0 })
    expect(all().length).toBe(2)
  })

  it('grouping 合并后重置计时（新阅读时长）', () => {
    toast.info({ title: 'x', grouping: true, duration: 1000 })
    toast.info({ title: 'x', grouping: true, duration: 1000 })
    // 第二次调用重置 → 再过 1000ms 才关
    vi.advanceTimersByTime(999)
    expect(document.body.querySelector('oas-toast')).not.toBeNull()
  })

  it('未开启 grouping 不合并', () => {
    toast.info({ title: 'x', duration: 0 })
    toast.info({ title: 'x', duration: 0 })
    expect(all().length).toBe(2)
  })
})

describe('P10 滑动关闭（swipe）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  function swipe(fromX: number, toX: number): void {
    const box = el().shadowRoot!.querySelector<HTMLElement>('.box')!
    box.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: fromX, clientY: 50, pointerId: 1 }),
    )
    window.dispatchEvent(
      new PointerEvent('pointermove', { clientX: toX, clientY: 50, pointerId: 1 }),
    )
    window.dispatchEvent(
      new PointerEvent('pointerup', { clientX: toX, clientY: 50, pointerId: 1 }),
    )
  }

  it('超过阈值（80px）滑动关闭', async () => {
    toast.info({ title: 'x', duration: 0 })
    swipe(100, 250) // dx=150 > 80
    await Promise.resolve()
    await settleClose()
    expect(document.body.querySelector('oas-toast')).toBeNull()
  })

  it('未达阈值回弹不关闭', async () => {
    toast.info({ title: 'x', duration: 0 })
    swipe(100, 140) // dx=40 < 80
    await Promise.resolve()
    const box = el().shadowRoot!.querySelector<HTMLElement>('.box')!
    expect(box.classList.contains('swipe-back')).toBe(true)
    expect(document.body.querySelector('oas-toast')).not.toBeNull()
  })

  it('swipe-direction=left 只认左滑', async () => {
    toast.info({ title: 'x', duration: 0, swipeDirection: 'left' })
    swipe(100, 250) // 右滑不符合方向 → 不关
    await Promise.resolve()
    expect(document.body.querySelector('oas-toast')).not.toBeNull()
    destroyAll()
    toast.info({ title: 'y', duration: 0, swipeDirection: 'left' })
    swipe(250, 100) // 左滑 → 关
    await settleClose()
    expect(document.body.querySelector('oas-toast')).toBeNull()
  })

  it('swipe 关闭携带 trigger=swipe', () => {
    const onClose = vi.fn()
    toast.info({ title: 'x', duration: 0, onClose })
    swipe(100, 250)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('P11 折叠堆叠模式（+N 折叠 / stacked peek 层叠）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('stacked 开启：栈 data-stacked + +N 徽标（N=隐藏条数）', () => {
    toast.info({ title: 'a', duration: 0, stacked: true })
    toast.info({ title: 'b', duration: 0 })
    const stack = el().parentElement!
    expect(stack.classList.contains('oas-toast-stack')).toBe(true)
    expect(stack.getAttribute('data-stacked')).toBe('true')
    const badge = stack.querySelector<HTMLElement>('.oas-toast-stack-badge')!
    expect(badge).not.toBeNull()
    expect(badge.textContent).toBe('+1')
    expect(badge.hidden).toBe(false)
  })

  it('单条不折叠（无 data-stacked）', () => {
    toast.info({ title: 'a', duration: 0, stacked: true })
    expect(el().parentElement!.getAttribute('data-stacked')).toBeNull()
  })

  it('点击 +N 徽标持久展开（is-expanded + 徽标隐藏）', () => {
    toast.info({ title: 'a', duration: 0, stacked: true })
    toast.info({ title: 'b', duration: 0 })
    const stack = el().parentElement!
    const badge = stack.querySelector<HTMLElement>('.oas-toast-stack-badge')!
    badge.click()
    expect(stack.classList.contains('is-expanded')).toBe(true)
    expect(badge.hidden).toBe(true)
  })

  it('关闭一条后徽标计数更新（+1→+0 隐藏）', async () => {
    toast.info({ title: 'a', id: 'a', duration: 0, stacked: true })
    toast.info({ title: 'b', id: 'b', duration: 0 })
    const stack = document.body.querySelector('oas-toast[id="b"]')!.parentElement!
    toast.dismiss('a')
    await settleClose()
    const badge = stack.querySelector<HTMLElement>('.oas-toast-stack-badge')!
    expect(badge.textContent).toBe('+0')
    expect(badge.hidden).toBe(true)
  })

  it('堆叠样式只走 transform/opacity 且引用 token', () => {
    toast.info({ title: 'a', duration: 0, stacked: true })
    const style = [...document.querySelectorAll('style')]
      .map((s) => s.textContent)
      .find((t) => t.includes('.oas-toast-stack[data-stacked]'))!
    expect(style).toContain('transform: scale(0.94)')
    expect(style).toContain('opacity: 0.35')
    expect(style).toContain('var(--oas-color-primary)')
    expect(style).not.toContain('background: rgb') // 硬编码色值
  })
})

describe('P14 受控/声明式双模式（open 属性）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('open 缺省可见并自动关闭', async () => {
    const t = document.createElement('oas-toast') as OASToast
    t.setAttribute('title', 'x')
    t.setAttribute('duration', '1000')
    document.body.appendChild(t)
    await tick(1000)
    await settleClose()
    expect(document.body.querySelector('oas-toast')).toBeNull()
  })

  it('open=false 隐藏且计时暂停（受控关闭）', async () => {
    const t = document.createElement('oas-toast') as OASToast
    t.setAttribute('title', 'x')
    t.setAttribute('duration', '1000')
    document.body.appendChild(t)
    t.setAttribute('open', 'false')
    await tick(5000)
    expect(document.body.querySelector('oas-toast')).not.toBeNull()
    // 重新打开 → 重新计时
    t.setAttribute('open', 'true')
    await tick(1000)
    await settleClose()
    expect(document.body.querySelector('oas-toast')).toBeNull()
  })

  it('声明式宿主可监听 open/close 事件', () => {
    const t = document.createElement('oas-toast') as OASToast
    t.setAttribute('title', 'x')
    t.setAttribute('duration', '0')
    const events: string[] = []
    t.addEventListener('oas-open', () => events.push('open'))
    t.addEventListener('oas-close', () => events.push('close'))
    document.body.appendChild(t)
    t.close()
    expect(events).toEqual(['open', 'close'])
  })
})

describe('P15 position 扩展（center/left/right）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('center/left/right 与既有方向并集：各自独立栈', () => {
    toast.info({ title: 'c', position: 'center' })
    toast.info({ title: 'l', position: 'left' })
    toast.info({ title: 'r', position: 'right' })
    toast.info({ title: 'tr', position: 'top-right' })
    expect(document.querySelectorAll('.oas-toast-stack').length).toBe(4)
  })

  it('center 栈样式含垂直/水平居中定位', () => {
    toast.info({ title: 'c', position: 'center' })
    const stack = el().parentElement!
    expect(stack.style.cssText).toContain('translate(-50%, -50%)')
  })
})

describe('P16 挂载点控制（container）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('container 元素：栈挂载到指定容器', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    toast.info({ title: 'x', container: host })
    const stack = host.querySelector('.oas-toast-stack')!
    expect(stack).not.toBeNull()
    expect(stack.querySelector('oas-toast')).not.toBeNull()
    expect(document.body.querySelector('body > .oas-toast-stack')).toBeNull()
  })

  it('container 函数：惰性求值', () => {
    const host = document.createElement('section')
    document.body.appendChild(host)
    toast.info({ title: 'x', container: () => host })
    expect(host.querySelector('.oas-toast-stack')).not.toBeNull()
  })

  it('container 缺省仍挂默认宿主（body）', () => {
    toast.info({ title: 'x' })
    expect(document.body.querySelector('body > .oas-toast-stack')).not.toBeNull()
  })
})

describe('P17 按钮扩展（action 多按钮 + 变体 + noDismiss）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('多按钮渲染：数量/文案/变体类', () => {
    const a = vi.fn()
    const b = vi.fn()
    toast.info({
      title: '多操作',
      duration: 0,
      actions: [
        { label: '重做', onClick: a, variant: 'danger' },
        { label: '保留', onClick: b, noDismiss: true },
      ],
    })
    const btns = [...el().shadowRoot!.querySelectorAll('.action')] as HTMLButtonElement[]
    expect(btns.length).toBe(2)
    expect(btns[0]!.textContent).toBe('重做')
    expect(btns[0]!.classList.contains('danger')).toBe(true)
    expect(btns[0]!.type).toBe('button')
    expect(btns[1]!.classList.contains('danger')).toBe(false)
  })

  it('noDismiss 点击不自动关闭；默认点击即关', async () => {
    const a = vi.fn()
    const b = vi.fn()
    toast.info({
      title: '多操作',
      duration: 0,
      actions: [
        { label: '保留', onClick: a, noDismiss: true },
        { label: '关闭', onClick: b },
      ],
    })
    const btns = [...el().shadowRoot!.querySelectorAll('.action')] as HTMLButtonElement[]
    btns[0]!.click()
    expect(a).toHaveBeenCalledTimes(1)
    expect(document.body.querySelector('oas-toast')).not.toBeNull()
    btns[1]!.click()
    expect(b).toHaveBeenCalledTimes(1)
    await settleClose()
    expect(document.body.querySelector('oas-toast')).toBeNull()
  })

  it('单 action 兼容（旧 API）：等价 actions=[action]', () => {
    const onClick = vi.fn()
    toast.info({ title: 'x', duration: 0, action: { label: '查看', onClick } })
    const btn = el().shadowRoot!.querySelector('.action') as HTMLButtonElement
    btn.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('P18 动画配置（默认进出场，时长走 CSS 变量开口）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('close 后先离场动画再移除（延迟 = 默认 200ms）', async () => {
    toast.info({ title: 'x', duration: 0 })
    const handle = toast.info({ title: 'y', id: 'y', duration: 0 })
    handle.close()
    await Promise.resolve()
    // 离场中：仍在 DOM
    const closing = document.body.querySelector('oas-toast[id="y"]') as OASToast
    expect(closing).not.toBeNull()
    expect(
      closing.shadowRoot!.querySelector('[part="box"]')!.classList.contains('closing'),
    ).toBe(true)
    await settleClose()
    expect(document.body.querySelector('oas-toast[id="y"]')).toBeNull()
    expect(all().length).toBe(1)
  })

  it('入场/离场动画只动 transform/opacity', () => {
    toast.info({ title: 'x', duration: 0 })
    const css = el().shadowRoot!.querySelector('style')!.textContent
    const enter = /@keyframes oas-toast-enter \{([^}]*)\}/.exec(css)![1]!
    const leave = /@keyframes oas-toast-leave \{([^}]*)\}/.exec(css)![1]!
    for (const block of [enter, leave]) {
      expect(block).toMatch(/opacity:/)
      expect(block).toMatch(/transform:/)
      expect(block).not.toContain('background')
    }
  })

  it('动画时长/曲线走 CSS 变量（--oas-toast-*-duration / --oas-toast-ease）', () => {
    toast.info({ title: 'x', duration: 0 })
    const css = el().shadowRoot!.querySelector('style')!.textContent
    expect(css).toContain('--oas-toast-enter-duration')
    expect(css).toContain('--oas-toast-leave-duration')
    expect(css).toContain('animation: oas-toast-enter var(--oas-toast-enter-duration) var(--oas-toast-ease)')
  })
})

describe('P19 plain/translucent 变体', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('variant=plain / translucent 映射 host 属性', () => {
    toast.info({ title: 'p', variant: 'plain', duration: 0 })
    toast.info({ title: 't', variant: 'translucent', duration: 0 })
    expect(all()[0]!.getAttribute('variant')).toBe('plain')
    expect(all()[1]!.getAttribute('variant')).toBe('translucent')
  })

  it('缺省 variant 不设属性（solid 默认）', () => {
    toast.info({ title: 'x', duration: 0 })
    expect(el().getAttribute('variant')).toBeNull()
  })

  it('变体样式只走 token / color-mix（无硬编码色值）', () => {
    toast.info({ title: 'p', variant: 'plain', duration: 0 })
    const css = el().shadowRoot!.querySelector('style')!.textContent
    expect(css).toContain(":host([variant='plain'])")
    expect(css).toContain(":host([variant='translucent'])")
    expect(css).toContain('color-mix(in srgb, var(--oas-color-bg) 78%, transparent)')
    expect(css).not.toContain('background: rgb')
  })
})

describe('P23 多 toaster 实例（命名实例并行管理）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    resetConfig()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('命名实例与默认实例独立栈并行', () => {
    const side = toast.toaster('side')
    side.info({ title: 's', duration: 0 })
    toast.info({ title: 'm', duration: 0 })
    expect(all().length).toBe(2)
    expect(document.querySelectorAll('.oas-toast-stack').length).toBe(2)
  })

  it('命名实例 destroyAll 只清自己', () => {
    const side = toast.toaster('side')
    side.info({ title: 's', duration: 0 })
    toast.info({ title: 'm', duration: 0 })
    side.destroyAll()
    expect(document.body.querySelector('oas-toast')!.shadowRoot).not.toBeNull()
    expect(all().length).toBe(1)
    expect(titleOf(el())).toBe('m')
  })

  it('命名实例有自己的 config', () => {
    const side = toast.toaster('side')
    side.config({ duration: 9000 })
    side.info({ title: 's' })
    toast.info({ title: 'm' })
    const [s, m] = all()
    expect(s!.getAttribute('duration')).toBe('9000')
    expect(m!.getAttribute('duration')).toBe('3000')
  })

  it('全局 destroyAll 清空所有实例', () => {
    const side = toast.toaster('side')
    side.info({ title: 's', duration: 0 })
    toast.info({ title: 'm', duration: 0 })
    destroyAll()
    expect(all().length).toBe(0)
  })
})

describe('P25 进度环式关闭按钮', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('progress-ring 且 duration>0：环可见，动画时长与 duration 同步', () => {
    toast.info({ title: 'x', progressRing: true, duration: 3000 })
    const ring = el().shadowRoot!.querySelector<HTMLElement>('.ring')!
    expect(ring.hidden).toBe(false)
    const ringFill = ring.querySelector<HTMLElement>('.ring-fill')!
    expect(ringFill.style.animationDuration).toBe('3000ms')
    // 环不遮挡关闭操作：close 仍在
    expect(el().shadowRoot!.querySelector('[part="close"]')).not.toBeNull()
  })

  it('duration=0 不显示进度环', () => {
    toast.info({ title: 'x', progressRing: true, duration: 0 })
    expect(el().shadowRoot!.querySelector<HTMLElement>('.ring')!.hidden).toBe(true)
  })

  it('进度环样式走 token', () => {
    toast.info({ title: 'x', progressRing: true, duration: 3000 })
    const css = el().shadowRoot!.querySelector('style')!.textContent
    expect(css).toContain('stroke: var(--oas-color-primary)')
    expect(css).toContain('stroke: var(--oas-color-bg-hover)')
  })
})
