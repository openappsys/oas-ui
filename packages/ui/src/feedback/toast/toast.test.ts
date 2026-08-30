import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { toast, destroyAll, type OASToast } from './index.js'

describe('toast 命令式 API', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('toast.success 渲染并 3000ms 自动关闭（计时器清理）', async () => {
    toast.success({ title: '操作成功' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-toast')!
    expect(el).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('操作成功')
    expect(el.getAttribute('type')).toBe('success')
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(3000)
    await Promise.resolve()
    expect(document.body.querySelector('oas-toast')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('error 类型 role=alert，其余 role=status', () => {
    toast.error({ title: '出错了' })
    const err = document.body.querySelector('oas-toast')!
    expect(err.shadowRoot!.querySelector('[role="alert"]')).not.toBeNull()
    destroyAll()
    toast.info({ title: '信息' })
    const info = document.body.querySelector('oas-toast')!
    expect(info.shadowRoot!.querySelector('[role="status"]')).not.toBeNull()
  })

  it('duration 0 不自动关闭', async () => {
    toast.info({ title: '常驻', duration: 0 })
    vi.advanceTimersByTime(60000)
    await Promise.resolve()
    expect(document.body.querySelector('oas-toast')).not.toBeNull()
  })

  it('closable=false 不渲染关闭按钮', () => {
    toast.info({ title: '不可关', closable: false })
    const el = document.body.querySelector('oas-toast')!
    expect(el.shadowRoot!.querySelector('[part="close"]')).toBeNull()
  })

  it('action 点击触发 onClick 并关闭 toast', async () => {
    const onClick = vi.fn()
    toast.info({ title: '有操作', action: { label: '查看', onClick } })
    const el = document.body.querySelector('oas-toast')!
    const btn = el.shadowRoot!.querySelector('[part="action"]') as HTMLButtonElement
    expect(btn).not.toBeNull()
    expect(btn.type).toBe('button')
    expect(btn.textContent).toBe('查看')
    btn.click()
    expect(onClick).toHaveBeenCalledTimes(1)
    await Promise.resolve()
    expect(document.body.querySelector('oas-toast')).toBeNull()
  })

  it('loading 态不可关：无关闭按钮、不自动关', async () => {
    toast.loading({ title: '提交中' })
    const el = document.body.querySelector('oas-toast')!
    expect(el.shadowRoot!.querySelector('[part="close"]')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(60000)
    await Promise.resolve()
    expect(document.body.querySelector('oas-toast')).not.toBeNull()
  })

  it('handle.close() 手动关闭并清理计时器', async () => {
    const handle = toast.info({ title: '手动关闭' })
    expect(vi.getTimerCount()).toBe(1)
    handle.close()
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-toast').length).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('多开复用单容器（同一 position 共享 stack）', () => {
    toast.info({ title: 'a' })
    toast.success({ title: 'b' })
    const els = document.body.querySelectorAll('oas-toast')
    expect(els.length).toBe(2)
    expect(els[0]!.parentElement).toBe(els[1]!.parentElement)
  })

  it('不同 position 使用不同容器', () => {
    toast.info({ title: 'a', position: 'top-right' })
    toast.info({ title: 'b', position: 'bottom-left' })
    const els = document.body.querySelectorAll('oas-toast')
    expect(els.length).toBe(2)
    expect(els[0]!.parentElement).not.toBe(els[1]!.parentElement)
  })

  it('description 渲染与显隐', () => {
    toast.info({ title: '标题', description: '详情描述' })
    const el = document.body.querySelector('oas-toast')!
    expect(el.shadowRoot!.querySelector('[part="description"]')!.textContent).toBe('详情描述')
    destroyAll()
    toast.info({ title: '无描述' })
    const el2 = document.body.querySelector('oas-toast')!
    const desc = el2.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    expect(desc.style.display).toBe('none')
  })

  it('destroyAll 清空全部', () => {
    toast.info({ title: 'a' })
    toast.info({ title: 'b' })
    expect(document.body.querySelectorAll('oas-toast').length).toBe(2)
    destroyAll()
    expect(document.body.querySelectorAll('oas-toast').length).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('promise 链：resolve 后切 success 并自动关闭', async () => {
    const p = Promise.resolve('数据')
    toast.promise(p, {
      loading: '提交中',
      success: (d) => `成功：${d}`,
      error: '失败',
    })
    const el = document.body.querySelector('oas-toast')!
    expect(el.getAttribute('type')).toBe('loading')
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('提交中')
    await Promise.resolve()
    expect(el.getAttribute('type')).toBe('success')
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('成功：数据')
    vi.advanceTimersByTime(3000)
    await Promise.resolve()
    expect(document.body.querySelector('oas-toast')).toBeNull()
  })

  it('promise 链：reject 后切 error', async () => {
    const p = Promise.reject(new Error('boom'))
    toast.promise(p, {
      loading: '提交中',
      success: '成功',
      error: (e) => `失败：${(e as Error).message}`,
    })
    await Promise.resolve()
    const el = document.body.querySelector('oas-toast')!
    expect(el.getAttribute('type')).toBe('error')
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('失败：boom')
  })

  it('关闭按钮 aria-label 走 locale（toast.close）', () => {
    toast.info({ title: '标题' })
    const el = document.body.querySelector('oas-toast')!
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.getAttribute('aria-label'),
    ).toBe('关闭')
  })

  describe('title 吸收（消除宿主原生 tooltip）', () => {
    it('挂载后宿主不再残留 title 属性，标题照常渲染进标题区', async () => {
      toast.success({ title: '操作成功' })
      await Promise.resolve()
      const el = document.body.querySelector('oas-toast')!
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('操作成功')
    })

    it('吸收后二次 update 幂等（type 变化不丢标题、宿主 title 不复活）', () => {
      toast.info({ title: '通知' })
      const el = document.body.querySelector('oas-toast')!
      el.setAttribute('type', 'success') // 触发二次 update
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('通知')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('transition() 数据通道：设置即吸收，宿主无残留、标题更新', () => {
      const handle = toast.loading({ title: '提交中' })
      const el = document.body.querySelector('oas-toast')!
      expect(el.hasAttribute('title')).toBe(false)
      // element 为内部句柄字段（公开 ToastHandle 仅暴露 close）
      ;(handle as unknown as { element: OASToast }).element.transition('success', '成功：数据')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('成功：数据')
      expect(el.hasAttribute('title')).toBe(false)
      expect(el.getAttribute('type')).toBe('success')
    })

    it('title="" 清空标题（属性在场=宿主意图，经 transition 数据通道）', () => {
      const handle = toast.info({ title: '标题' })
      const el = document.body.querySelector('oas-toast')!
      ;(handle as unknown as { element: OASToast }).element.transition('info', '')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })
  })

  describe('title 双通道（slot 富内容 / 命令式 Node）', () => {
    it('title 插槽有内容时覆盖属性文本（slot 优先渲染）', () => {
      const el = document.createElement('oas-toast')
      el.setAttribute('title', '属性标题')
      el.setAttribute('duration', '0')
      el.innerHTML = '<span slot="title">插槽标题</span>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      // 宿主 title 仍被吸收（吸收状态机不变）
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('仅 slot 无属性：标题区渲染 slot 内容且不隐藏', () => {
      const el = document.createElement('oas-toast')
      el.setAttribute('duration', '0')
      el.innerHTML = '<span slot="title">插槽标题</span>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('双空（无 title 无 slot）：标题区不渲染文本（兜底为空、不隐藏）', () => {
      const el = document.createElement('oas-toast')
      el.setAttribute('duration', '0')
      document.body.appendChild(el)
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('命令式 options.title 传 Node：Node 移动进标题区（忽略 titleCache 文本路径）', async () => {
      const node = document.createElement('span')
      node.textContent = '富内容标题'
      toast.success({ title: node })
      await Promise.resolve()
      const el = document.body.querySelector('oas-toast')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.contains(node)).toBe(true)
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('富内容标题')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('transition() title 传 Node：Node 渲染进标题区', () => {
      const handle = toast.loading({ title: '提交中' })
      const el = document.body.querySelector('oas-toast')!
      const node = document.createElement('span')
      node.textContent = '加载中详情'
      ;(handle as unknown as { element: OASToast }).element.transition('loading', node)
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.contains(node)).toBe(true)
      expect(fallback.hidden).toBe(false)
      expect(el.hasAttribute('title')).toBe(false)
    })
  })
})
