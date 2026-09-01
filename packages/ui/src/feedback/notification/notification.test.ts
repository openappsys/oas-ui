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

  describe('P3 pause-on-hover（悬停暂停计时与进度条）', () => {
    it('默认开启：mouseenter 后暂停计时，进度条 animation-play-state 同步 paused', async () => {
      notification.info({ title: 'x', duration: 5000, showProgress: true })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      vi.advanceTimersByTime(2000)
      el.dispatchEvent(new MouseEvent('mouseenter'))
      const fill = el.shadowRoot!.querySelector('.progress-fill') as HTMLElement
      expect(fill.style.animationPlayState).toBe('paused')
      // 暂停期间时间流逝不关闭
      vi.advanceTimersByTime(4000)
      await Promise.resolve()
      expect(document.body.querySelector('oas-notification')).not.toBeNull()
    })

    it('mouseleave 恢复：剩余时间继续倒计时后关闭', async () => {
      notification.info({ title: 'x', duration: 5000 })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      vi.advanceTimersByTime(2000)
      el.dispatchEvent(new MouseEvent('mouseenter'))
      vi.advanceTimersByTime(9999) // 暂停期间任意流逝
      el.dispatchEvent(new MouseEvent('mouseleave'))
      const fill = el.shadowRoot!.querySelector('.progress-fill') as HTMLElement
      expect(fill.style.animationPlayState).not.toBe('paused')
      // 剩余 3000ms：2999 不关，3000 关
      vi.advanceTimersByTime(2999)
      await Promise.resolve()
      expect(document.body.querySelector('oas-notification')).not.toBeNull()
      vi.advanceTimersByTime(1)
      await Promise.resolve()
      expect(document.body.querySelector('oas-notification')).toBeNull()
    })

    it('pause-on-hover="false" 关闭：hover 不暂停', async () => {
      notification.info({ title: 'x', duration: 3000, pauseOnHover: false })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      expect(el.getAttribute('pause-on-hover')).toBe('false')
      el.dispatchEvent(new MouseEvent('mouseenter'))
      vi.advanceTimersByTime(3000)
      await Promise.resolve()
      expect(document.body.querySelector('oas-notification')).toBeNull()
    })

    it('命令式默认不设 pause-on-hover 属性（组件内默认开启）', async () => {
      notification.info({ title: 'x' })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      expect(el.hasAttribute('pause-on-hover')).toBe(false)
    })
  })

  describe('P4 onClose（关闭回调统一收口）', () => {
    it('自动关闭触发 onClose 一次，oas-close 事件 detail.source=auto', async () => {
      const onClose = vi.fn()
      let detail: unknown = null
      notification.info({ title: 'x', duration: 1000, onClose })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      el.addEventListener('oas-close', (e) => (detail = (e as CustomEvent).detail))
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
      expect(onClose).toHaveBeenCalledTimes(1)
      expect((detail as { source: string }).source).toBe('auto')
    })

    it('关闭按钮触发 onClose，detail.source=button', async () => {
      const onClose = vi.fn()
      notification.info({ title: 'x', duration: 0, onClose })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      let detail: unknown = null
      el.addEventListener('oas-close', (e) => (detail = (e as CustomEvent).detail))
      el.shadowRoot!.querySelector<HTMLButtonElement>('[part="close"]')!.click()
      await Promise.resolve()
      expect(onClose).toHaveBeenCalledTimes(1)
      expect((detail as { source: string }).source).toBe('button')
    })

    it('命令式 handle.close() 触发 onClose', async () => {
      const onClose = vi.fn()
      const handle = notification.info({ title: 'x', duration: 0, onClose })
      await Promise.resolve()
      handle.close()
      await Promise.resolve()
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('P5 onClick（通知体点击回调）', () => {
    it('点击卡片触发 onClick 与 oas-click 事件', async () => {
      const onClick = vi.fn()
      notification.info({ title: 'x', duration: 0, onClick })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      expect(el.hasAttribute('clickable')).toBe(true)
      let fired = false
      el.addEventListener('oas-click', () => (fired = true))
      el.shadowRoot!.querySelector<HTMLElement>('[part="box"]')!.click()
      await Promise.resolve()
      expect(onClick).toHaveBeenCalledTimes(1)
      expect(fired).toBe(true)
    })

    it('点击关闭按钮不触发 onClick（stopPropagation）', async () => {
      const onClick = vi.fn()
      notification.info({ title: 'x', duration: 0, onClick })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      el.shadowRoot!.querySelector<HTMLButtonElement>('[part="close"]')!.click()
      await Promise.resolve()
      expect(onClick).not.toHaveBeenCalled()
    })

    it('无 onClick 不设 clickable 属性', async () => {
      notification.info({ title: 'x', duration: 0 })
      await Promise.resolve()
      expect(document.body.querySelector('oas-notification')!.hasAttribute('clickable')).toBe(
        false,
      )
    })
  })

  describe('P6 closable（关闭开关）', () => {
    it('默认渲染关闭按钮', async () => {
      notification.info({ title: 'x' })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      expect(el.shadowRoot!.querySelector('[part="close"]')).not.toBeNull()
    })

    it('closable=false 隐藏关闭按钮', async () => {
      notification.info({ title: 'x', closable: false })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      expect(el.getAttribute('closable')).toBe('false')
      const close = el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!
      expect(close.hidden).toBe(true)
    })
  })

  describe('P7 icon / close-icon 插槽与命令式 Node 通道', () => {
    it('slot="icon" 覆盖类型默认图标', async () => {
      const el = document.createElement('oas-notification')
      el.setAttribute('duration', '0')
      el.innerHTML = '<span slot="icon">🔔</span>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="icon"]')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      el.remove()
    })

    it('无 slot 时 icon 插槽 fallback 按类型渲染（success → ✓）', async () => {
      const el = document.createElement('oas-notification')
      el.setAttribute('type', 'success')
      el.setAttribute('duration', '0')
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector('slot[name="icon"]')!
      expect(slot.textContent).toBe('✓')
      el.remove()
    })

    it('slot="close-icon" 覆盖默认 ✕', async () => {
      const el = document.createElement('oas-notification')
      el.setAttribute('duration', '0')
      el.innerHTML = '<span slot="close-icon">关闭</span>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="close-icon"]')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(slot.textContent).toBe('✕') // fallback 保持
      el.remove()
    })

    it('命令式 icon/closeIcon Node 通道渲染', async () => {
      const icon = document.createElement('span')
      icon.textContent = '🌟'
      const closeIcon = document.createElement('span')
      closeIcon.textContent = 'CloseMe'
      notification.info({ title: 'x', duration: 0, icon, closeIcon })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      const iconSlot = el.shadowRoot!.querySelector('slot[name="icon"]')!
      const closeSlot = el.shadowRoot!.querySelector('slot[name="close-icon"]')!
      expect(iconSlot.contains(icon)).toBe(true)
      expect(closeSlot.contains(closeIcon)).toBe(true)
    })
  })

  describe('P9 进度条颜色变量穿透', () => {
    it('进度条 fill 颜色走 --oas-notification-progress-color 变量（默认 primary）', async () => {
      notification.info({ title: 'x', duration: 5000, showProgress: true })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(style).toContain('--oas-notification-progress-color, var(--oas-color-primary)')
    })
  })

  describe('P12 footer 操作区', () => {
    it('footer Node 渲染进 footer 区且区可见', async () => {
      const btn = document.createElement('button')
      btn.textContent = '查看详情'
      notification.info({ title: 'x', duration: 0, footer: btn })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      const footer = el.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!
      expect(footer.hidden).toBe(false)
      expect(footer.contains(btn)).toBe(true)
      expect(footer.textContent).toContain('查看详情')
    })

    it('无 footer 时 footer 区隐藏', async () => {
      notification.info({ title: 'x', duration: 0 })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!.hidden).toBe(true)
    })

    it('声明式 slot="footer" 渲染', async () => {
      const el = document.createElement('oas-notification')
      el.setAttribute('duration', '0')
      el.innerHTML = '<span slot="footer">撤销</span>'
      document.body.appendChild(el)
      const footer = el.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!
      expect(footer.hidden).toBe(false)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="footer"]')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      el.remove()
    })

    it('footer 数组通道：多个 Node 聚合渲染', async () => {
      const a = document.createElement('button')
      a.textContent = '查看详情'
      const b = document.createElement('button')
      b.textContent = '撤销'
      notification.warning({ title: 'x', duration: 0, footer: [a, b] })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      const footer = el.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!
      expect(footer.hidden).toBe(false)
      expect(footer.contains(a)).toBe(true)
      expect(footer.contains(b)).toBe(true)
    })
  })

  describe('P16 content 富内容 + size 档', () => {
    it('content Node 渲染进描述区（覆盖 description 文本通道）', async () => {
      const code = document.createElement('code')
      code.textContent = 'npm install @oas-ui/ui'
      notification.info({ title: 'x', description: '文本描述', content: code, duration: 0 })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      const desc = el.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
      expect(desc.contains(code)).toBe(true)
      expect(desc.textContent).toContain('npm install')
    })

    it('声明式 slot="content" 覆盖 description 文本', async () => {
      const el = document.createElement('oas-notification')
      el.setAttribute('duration', '0')
      el.setAttribute('description', '属性文本')
      el.innerHTML = '<div slot="content">富内容</div>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="content"]')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(el.shadowRoot!.querySelector('.desc-text')!.textContent).toBe('属性文本')
      el.remove()
    })

    it('size 透传与档位样式', async () => {
      notification.info({ title: 'x', duration: 0, size: 'small' })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      expect(el.getAttribute('size')).toBe('small')
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(style).toContain(":host([size='small'])")
      expect(style).toContain(":host([size='large'])")
    })

    it('默认不设 size 属性（medium 档）', async () => {
      notification.info({ title: 'x', duration: 0 })
      await Promise.resolve()
      expect(document.body.querySelector('oas-notification')!.hasAttribute('size')).toBe(false)
    })
  })

  describe('P16/P8 duration 属性动态变化重置计时与进度动画', () => {
    it('duration 变化后按新时长计时', async () => {
      notification.info({ title: 'x', duration: 2000 })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      el.setAttribute('duration', '5000')
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      expect(document.body.querySelector('oas-notification')).not.toBeNull()
      vi.advanceTimersByTime(3000)
      await Promise.resolve()
      expect(document.body.querySelector('oas-notification')).toBeNull()
    })
  })

  describe('P1 position 四角栈', () => {
    it('默认 top-right：top/right 定位 + flex-end', async () => {
      notification.info({ title: 'x', duration: 0 })
      await Promise.resolve()
      const stack = document.body.querySelector('oas-notification')!.parentElement!
      expect(stack.style.top).toBe('16px')
      expect(stack.style.right).toBe('16px')
      expect(stack.style.alignItems).toBe('flex-end')
      expect(stack.style.bottom).toBe('')
      expect(stack.style.left).toBe('')
    })

    it('top-left / bottom-left / bottom-right 各自定位', async () => {
      notification.info({ title: 'a', duration: 0, position: 'top-left' })
      notification.info({ title: 'b', duration: 0, position: 'bottom-left' })
      notification.info({ title: 'c', duration: 0, position: 'bottom-right' })
      await Promise.resolve()
      const els = document.body.querySelectorAll('oas-notification')
      const tl = els[0]!.parentElement!
      const bl = els[1]!.parentElement!
      const br = els[2]!.parentElement!
      expect(tl.style.top).toBe('16px')
      expect(tl.style.left).toBe('16px')
      expect(bl.style.bottom).toBe('16px')
      expect(bl.style.left).toBe('16px')
      expect(bl.style.flexDirection).toBe('column-reverse')
      expect(br.style.bottom).toBe('16px')
      expect(br.style.right).toBe('16px')
    })

    it('同 position 复用同一栈容器', async () => {
      notification.info({ title: 'a', duration: 0 })
      notification.info({ title: 'b', duration: 0 })
      await Promise.resolve()
      const els = document.body.querySelectorAll('oas-notification')
      expect(els[0]!.parentElement).toBe(els[1]!.parentElement)
    })
  })

  describe('P2 max 上限（超限丢最老）', () => {
    it('max=3 连发 5 条只保留最新 3 条', async () => {
      for (let i = 1; i <= 5; i++) {
        notification.info({ title: `n${i}`, duration: 0, max: 3 })
        await Promise.resolve()
      }
      const els = document.body.querySelectorAll('oas-notification')
      expect(els.length).toBe(3)
      expect(els[0]!.shadowRoot!.textContent).toContain('n3')
      expect(els[2]!.shadowRoot!.textContent).toContain('n5')
    })

    it('被挤出的通知触发 onClose（source=evict）', async () => {
      const onClose = vi.fn()
      notification.info({ title: 'old', duration: 0, max: 2, onClose })
      await Promise.resolve()
      notification.info({ title: 'mid', duration: 0, max: 2 })
      await Promise.resolve()
      notification.info({ title: 'new', duration: 0, max: 2 })
      await Promise.resolve()
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('默认不限（max 未传不裁剪）', async () => {
      for (let i = 1; i <= 6; i++) notification.info({ title: `n${i}`, duration: 0 })
      await Promise.resolve()
      expect(document.body.querySelectorAll('oas-notification').length).toBe(6)
    })
  })

  describe('P10 offset 偏移', () => {
    it('offset 作用于当前 position 方向（top 栈改 top）', async () => {
      notification.info({ title: 'x', duration: 0, offset: 64 })
      await Promise.resolve()
      const stack = document.body.querySelector('oas-notification')!.parentElement!
      expect(stack.style.top).toBe('64px')
    })

    it('bottom 栈 offset 改 bottom；默认 16', async () => {
      notification.info({ title: 'x', duration: 0, position: 'bottom-right', offset: 80 })
      await Promise.resolve()
      const stack = document.body.querySelector('oas-notification')!.parentElement!
      expect(stack.style.bottom).toBe('80px')
    })
  })

  describe('P11 container 自定义挂载', () => {
    it('options.container 挂到指定元素', async () => {
      const host = document.createElement('div')
      document.body.appendChild(host)
      notification.info({ title: 'x', duration: 0, container: host })
      await Promise.resolve()
      expect(host.querySelector('oas-notification')).not.toBeNull()
      // 默认栈（body 直属）里没有通知
      expect(document.body.querySelector(':scope > div.oas-notification-stack > oas-notification')).toBeNull()
      host.remove()
    })

    it('不同 container 互不串栈', async () => {
      const host = document.createElement('div')
      document.body.appendChild(host)
      notification.info({ title: 'a', duration: 0 })
      notification.info({ title: 'b', duration: 0, container: host })
      await Promise.resolve()
      expect(host.querySelectorAll('oas-notification').length).toBe(1)
      expect(
        document.body.querySelectorAll(':scope > div > oas-notification').length +
          host.querySelectorAll('oas-notification').length,
      ).toBe(2)
      host.remove()
    })
  })

  describe('P13 priority 抢占', () => {
    it('高优插入：normal 之后的 high 占最新位，再来的 normal 插到 high 之前', async () => {
      notification.info({ title: 'n1', duration: 0 })
      await Promise.resolve()
      notification.info({ title: 'h1', duration: 0, priority: 'high' })
      await Promise.resolve()
      notification.info({ title: 'n2', duration: 0 })
      await Promise.resolve()
      const els = document.body.querySelectorAll('oas-notification')
      expect(els.length).toBe(3)
      const titles = [...els].map((el) => el.shadowRoot!.textContent)
      // DOM 序（= 时间序）应为 n1, n2, h1 —— high 恒占最新侧
      expect(titles[0]).toContain('n1')
      expect(titles[1]).toContain('n2')
      expect(titles[2]).toContain('h1')
    })

    it('max 场景低优先被挤出：high 进来优先丢最老 normal', async () => {
      notification.info({ title: 'n1', duration: 0, max: 2 })
      await Promise.resolve()
      notification.info({ title: 'n2', duration: 0, max: 2 })
      await Promise.resolve()
      notification.info({ title: 'h1', duration: 0, max: 2, priority: 'high' })
      await Promise.resolve()
      const els = document.body.querySelectorAll('oas-notification')
      expect(els.length).toBe(2)
      const titles = [...els].map((el) => el.shadowRoot!.textContent)
      expect(titles.join()).not.toContain('n1') // 最老 normal 被挤出
      expect(titles.join()).toContain('n2')
      expect(titles.join()).toContain('h1')
    })

    it('全 high 满栈时丢最老', async () => {
      notification.info({ title: 'h1', duration: 0, max: 2, priority: 'high' })
      await Promise.resolve()
      notification.info({ title: 'h2', duration: 0, max: 2, priority: 'high' })
      await Promise.resolve()
      notification.info({ title: 'h3', duration: 0, max: 2, priority: 'high' })
      await Promise.resolve()
      const els = document.body.querySelectorAll('oas-notification')
      expect(els.length).toBe(2)
      expect([...els].map((el) => el.shadowRoot!.textContent).join()).not.toContain('h1')
    })
  })

  describe('P14 stack 治理', () => {
    it('collapsible：超过 threshold 折叠旧通知 + "+N" 徽章', async () => {
      for (let i = 1; i <= 4; i++) {
        notification.info({ title: `n${i}`, duration: 0, stackMode: 'collapsible' })
        await Promise.resolve()
      }
      const stack = document.body.querySelector('oas-notification')!.parentElement!
      expect(stack.className).toContain('stack-collapsible')
      const els = [...stack.querySelectorAll('oas-notification')]
      expect(els.length).toBe(4)
      const collapsed = els.filter((el) => el.classList.contains('oas-notification-collapsed'))
      expect(collapsed.length).toBe(3) // 最新 1 条显示，旧 3 条折叠
      const badge = stack.querySelector<HTMLButtonElement>('.stack-badge')
      expect(badge).not.toBeNull()
      expect(badge!.textContent).toBe('+3')
      expect(badge!.hidden).toBe(false)
    })

    it('collapsible：点击徽章展开全部，再点收起', async () => {
      for (let i = 1; i <= 4; i++) {
        notification.info({ title: `n${i}`, duration: 0, stackMode: 'collapsible' })
        await Promise.resolve()
      }
      const stack = document.body.querySelector('oas-notification')!.parentElement!
      const badge = stack.querySelector<HTMLButtonElement>('.stack-badge')!
      badge.click()
      await Promise.resolve()
      expect(stack.dataset.expanded).toBe('true')
      const collapsed = [...stack.querySelectorAll('oas-notification')].filter((el) =>
        el.classList.contains('oas-notification-collapsed'),
      )
      expect(collapsed.length).toBe(0)
      badge.click()
      await Promise.resolve()
      expect(stack.dataset.expanded).toBe('false')
      expect(
        [...stack.querySelectorAll('oas-notification')].filter((el) =>
          el.classList.contains('oas-notification-collapsed'),
        ).length,
      ).toBe(3)
    })

    it('collapsible：不超过 threshold 不折叠无徽章', async () => {
      notification.info({ title: 'a', duration: 0, stackMode: 'collapsible' })
      notification.info({ title: 'b', duration: 0, stackMode: 'collapsible' })
      await Promise.resolve()
      const stack = document.body.querySelector('oas-notification')!.parentElement!
      expect(
        [...stack.querySelectorAll('oas-notification')].filter((el) =>
          el.classList.contains('oas-notification-collapsed'),
        ).length,
      ).toBe(0)
      expect(stack.querySelector<HTMLElement>('.stack-badge')!.hidden ?? false).toBeTruthy()
    })

    it('collapsible：自定义 threshold', async () => {
      for (let i = 1; i <= 3; i++) {
        notification.info({ title: `n${i}`, duration: 0, stackMode: 'collapsible', stackThreshold: 1 })
        await Promise.resolve()
      }
      const stack = document.body.querySelector('oas-notification')!.parentElement!
      const collapsed = [...stack.querySelectorAll('oas-notification')].filter((el) =>
        el.classList.contains('oas-notification-collapsed'),
      )
      expect(collapsed.length).toBe(2)
    })

    it('peek：栈容器标 stack-peek 类，非最新卡收起（全局样式规则存在）', async () => {
      for (let i = 1; i <= 3; i++) {
        notification.info({ title: `n${i}`, duration: 0, stackMode: 'peek' })
        await Promise.resolve()
      }
      const stack = document.body.querySelector('oas-notification')!.parentElement!
      expect(stack.className).toContain('stack-peek')
      // peek 展开规则注入在全局 style（栈容器为普通 div，无 shadow）
      const globalStyle = document.querySelector('style[data-oas-notification-stack]')!
      expect(globalStyle).not.toBeNull()
      expect(globalStyle.textContent).toContain('.stack-peek')
      expect(globalStyle.textContent).toContain(':not(:last-of-type)')
      expect(globalStyle.textContent).toContain(':hover')
    })
  })

  describe('P8 key / update / destroy', () => {
    it('同 key 二次调用视为更新：不新增元素，内容刷新', async () => {
      notification.info({ title: 'v1', key: 'upload', duration: 0 })
      await Promise.resolve()
      notification.success({ title: 'v2', description: 'done', key: 'upload', duration: 0 })
      await Promise.resolve()
      const els = document.body.querySelectorAll('oas-notification')
      expect(els.length).toBe(1)
      expect(els[0]!.getAttribute('type')).toBe('success')
      expect(els[0]!.shadowRoot!.textContent).toContain('v2')
      expect(els[0]!.shadowRoot!.textContent).toContain('done')
    })

    it('notification.update 更新已存在 key 的标题/描述/类型', async () => {
      notification.info({ title: '上传中', key: 'k1', duration: 0 })
      await Promise.resolve()
      notification.update('k1', {
        type: 'success',
        title: '上传完成',
        description: '文件已保存',
        duration: 0,
      })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      expect(el.getAttribute('type')).toBe('success')
      expect(el.shadowRoot!.textContent).toContain('上传完成')
      expect(el.shadowRoot!.textContent).toContain('文件已保存')
    })

    it('notification.update 不存在的 key 静默新建', async () => {
      notification.update('nope', { title: '新建的', duration: 0 })
      await Promise.resolve()
      const els = document.body.querySelectorAll('oas-notification')
      expect(els.length).toBe(1)
      expect(els[0]!.shadowRoot!.textContent).toContain('新建的')
    })

    it('update 更新 duration 重置计时', async () => {
      notification.info({ title: 'x', key: 'k2', duration: 2000 })
      await Promise.resolve()
      vi.advanceTimersByTime(1500)
      notification.update('k2', { title: 'y', duration: 5000 })
      await Promise.resolve()
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      expect(document.body.querySelector('oas-notification')).not.toBeNull()
      vi.advanceTimersByTime(3500)
      await Promise.resolve()
      expect(document.body.querySelector('oas-notification')).toBeNull()
    })

    it('update 支持 title/description Node 通道', async () => {
      notification.info({ title: 'x', key: 'k3', duration: 0 })
      await Promise.resolve()
      const node = document.createElement('span')
      node.textContent = 'NodeTitle'
      notification.update('k3', { title: node, duration: 0 })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      expect(el.shadowRoot!.querySelector('.title-text')!.contains(node)).toBe(true)
    })

    it('notification.destroy(key) 关闭指定通知并触发 onClose', async () => {
      const onClose = vi.fn()
      notification.info({ title: 'a', key: 'd1', duration: 0, onClose })
      notification.info({ title: 'b', duration: 0 })
      await Promise.resolve()
      notification.destroy('d1')
      await Promise.resolve()
      const els = document.body.querySelectorAll('oas-notification')
      expect(els.length).toBe(1)
      expect(els[0]!.shadowRoot!.textContent).toContain('b')
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('notification.destroy 不存在的 key 静默无操作', async () => {
      notification.destroy('ghost')
      expect(document.body.querySelectorAll('oas-notification').length).toBe(0)
    })

    it('关闭后 key 登记清理（同 key 再 show 是新建）', async () => {
      notification.info({ title: 'a', key: 'k4', duration: 100 })
      await Promise.resolve()
      vi.advanceTimersByTime(100)
      await Promise.resolve()
      notification.info({ title: 'b', key: 'k4', duration: 0 })
      await Promise.resolve()
      const els = document.body.querySelectorAll('oas-notification')
      expect(els.length).toBe(1)
      expect(els[0]!.shadowRoot!.textContent).toContain('b')
    })

    it('被 evict 挤出的通知也清理 key 登记', async () => {
      notification.info({ title: 'a', key: 'k5', duration: 0, max: 1 })
      await Promise.resolve()
      notification.info({ title: 'b', duration: 0, max: 1 })
      await Promise.resolve()
      // k5 已被挤出，同 key 新建不应命中已断开的登记
      notification.info({ title: 'c', key: 'k5', duration: 0 })
      await Promise.resolve()
      const els = document.body.querySelectorAll('oas-notification')
      expect(els.length).toBe(2)
    })
  })

  describe('P15 loading 态与 promise 链', () => {
    it('notification.loading：spinner 显示、图标隐藏、不计时、不可关', async () => {
      notification.loading({ title: '提交中' })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      expect(el.getAttribute('type')).toBe('loading')
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(style).toContain(":host([type='loading']) .spinner")
      expect(vi.getTimerCount()).toBe(0)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.hidden).toBe(true)
      vi.advanceTimersByTime(60000)
      await Promise.resolve()
      expect(document.body.querySelector('oas-notification')).not.toBeNull()
    })

    it('promise resolve：loading 切 success，4500ms 后自动关闭', async () => {
      let resolveFn: (v: string) => void = () => {}
      const p = new Promise<string>((res) => (resolveFn = res))
      notification.promise(p, {
        loading: '部署中',
        success: (data) => `部署完成：${data}`,
        error: '部署失败',
      })
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      expect(el.getAttribute('type')).toBe('loading')
      resolveFn('v2.1.0')
      await Promise.resolve()
      await Promise.resolve()
      expect(el.getAttribute('type')).toBe('success')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toContain('部署完成：v2.1.0')
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.hidden).toBe(false)
      vi.advanceTimersByTime(4500)
      await Promise.resolve()
      expect(document.body.querySelector('oas-notification')).toBeNull()
    })

    it('promise reject：loading 切 error', async () => {
      let rejectFn: (e: unknown) => void = () => {}
      const p = new Promise<string>((_, rej) => (rejectFn = rej))
      notification.promise(p, { loading: '上传中', success: '上传完成', error: '上传失败' })
      await Promise.resolve()
      rejectFn(new Error('boom'))
      await Promise.resolve()
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      expect(el.getAttribute('type')).toBe('error')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toContain('上传失败')
      destroyAll()
    })

    it('promise success 支持静态 string', async () => {
      const p = Promise.resolve('data')
      notification.promise(p, { loading: 'L', success: 'OK', error: 'ERR' })
      await Promise.resolve()
      await Promise.resolve()
      const el = document.body.querySelector('oas-notification')!
      expect(el.getAttribute('type')).toBe('success')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toContain('OK')
      destroyAll()
    })
  })
})
