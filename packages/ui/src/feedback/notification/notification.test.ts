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

  describe('title 吸收（消除宿主原生 tooltip）', () => {
    it('挂载后宿主不再残留 title 属性，标题照常渲染进标题区', async () => {
      notification.success({ title: '成功' })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('成功')
    })

    it('吸收后二次 update 幂等（type 等观察属性变化不丢标题、不复活宿主 title）', async () => {
      notification.success({ title: '成功' })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      el.setAttribute('type', 'error') // 触发二次 update
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('成功')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('初始 title=""（空串=宿主意图清空）：标题区为空 + 宿主无残留', async () => {
      const el = document.createElement('oas-notification')
      el.setAttribute('title', '')
      el.setAttribute('duration', '0')
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
      el.remove()
    })

    it('宿主 removeAttribute("title") 保持已渲染标题（清空请用 title=""）', async () => {
      const el = document.createElement('oas-notification')
      el.setAttribute('title', '常驻标题')
      el.setAttribute('duration', '0')
      document.body.appendChild(el)
      el.removeAttribute('title')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('常驻标题')
      expect(el.hasAttribute('title')).toBe(false)
      el.remove()
    })
  })

  describe('title 双通道（slot 富内容 / 命令式 Node）', () => {
    it('命令式 options.title 传 Node：Node 移动进标题区（忽略 titleCache 文本路径）', async () => {
      const node = document.createElement('span')
      node.textContent = '富内容标题'
      notification.success({ title: node })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.contains(node)).toBe(true)
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('富内容标题')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title 插槽有内容时覆盖属性文本（slot 优先渲染）', () => {
      const el = document.createElement('oas-notification')
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
      const el = document.createElement('oas-notification')
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
      const el = document.createElement('oas-notification')
      el.setAttribute('duration', '0')
      document.body.appendChild(el)
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })
  })
})
