import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASModal } from './index.js'
import { iconRegistry } from '@oas-ui/icons'

function mount(attrs: Record<string, string> = {}): OASModal {
  const el = new OASModal()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<p>内容</p>`
  document.body.appendChild(el)
  return el
}

describe('OASModal', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('visible 为 true 时渲染对话框，含 role=dialog + aria-modal + slot', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector('[role="dialog"]')!
    expect(dialog).not.toBeNull()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    expect(el.textContent).toContain('内容')
  })

  it('visible 缺省时隐藏', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[role="dialog"]')!.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })

  it('body 滚动边缘有视觉指示（CSS-only scroll shadow：上下 bg 覆盖层 local + 径向阴影 scroll 分层）', () => {
    const el = mount({ visible: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    const bodyRule = css.match(/\.body\s*\{[^}]*\}/)?.[0] ?? ''
    expect(bodyRule, 'body 应有 bg 覆盖层（local attachment，边缘遮住阴影）').toContain(
      'background-attachment: local, local, scroll, scroll',
    )
    expect(bodyRule, 'body 应有上下径向阴影（scroll attachment 固定视口边缘）').toContain(
      'radial-gradient',
    )
    expect(bodyRule).toContain('background-color: var(--oas-color-bg)')
  })

  it('点击确定派发 oas-ok', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect(ok).toBe(1)
  })

  it('点击遮罩触发 oas-cancel（maskClosable）', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    el.shadowRoot!.querySelector('.mask')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(cancel).toBe(1)
  })

  it('Esc 关闭触发 oas-cancel', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(cancel).toBe(1)
  })

  it('无 footer 时不渲染按钮', async () => {
    const el = mount({ visible: '', 'no-footer': '' })
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('[part="ok"]')).toBeNull()
  })

  it('点击 ✕ 移除 visible 并派发 oas-cancel', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
    expect(el.hasAttribute('visible')).toBe(false)
    expect(cancel).toBe(1)
  })

  it('Esc 移除 visible', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('点击遮罩移除 visible', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    el.shadowRoot!.querySelector('.mask')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('点击确定移除 visible 并派发 oas-ok', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect(el.hasAttribute('visible')).toBe(false)
    expect(ok).toBe(1)
  })

  it('width 属性控制对话框宽度（px 与百分比，动态切换）', async () => {
    const el = mount({ visible: '', width: '640px' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    expect(dialog.style.width).toBe('640px')
    el.setAttribute('width', '60%')
    expect(dialog.style.width).toBe('60%')
  })

  it('未设置 width 时回退主题默认（无内联宽度），移除属性后恢复', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    expect(dialog.style.width).toBe('')
    el.setAttribute('width', '520px')
    expect(dialog.style.width).toBe('520px')
    el.removeAttribute('width')
    expect(dialog.style.width).toBe('')
  })

  it('centered 属性驱动 data-centered 标记（增删同步）', async () => {
    const el = mount({ visible: '', centered: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector('.dialog')!
    expect(dialog.getAttribute('data-centered')).not.toBeNull()
    el.removeAttribute('centered')
    expect(dialog.getAttribute('data-centered')).toBeNull()
  })

  it('无 centered 时不带 data-centered 标记', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('.dialog')!.getAttribute('data-centered')).toBeNull()
  })

  // 协作缺陷回归：dialog 用 transform 居中会让后代 position:fixed 浮层（select 等）以它为
  // 包含块，computePosition 按视口算的 left/top 被错位解释（实测：modal 内下拉升到屏幕外）。
  // 居中必须走 left/right 0 + margin auto（默认）/ inset 0 + margin auto（centered），不用 transform
  it('dialog 居中不用 transform（margin auto 方案），fixed 后代浮层包含块不被劫持', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    const base = /\.dialog\s*\{[^}]*\}/.exec(css)?.[0] ?? ''
    expect(base).toMatch(/left:\s*0/)
    expect(base).toMatch(/right:\s*0/)
    expect(base).toMatch(/margin:\s*0 auto/)
    expect(base).not.toMatch(/transform\s*:/) // 无 transform 声明（注释不含此格式）
    const centered = /\.dialog\[data-centered\]\s*\{[^}]*\}/.exec(css)?.[0] ?? ''
    expect(centered).toMatch(/inset:\s*0/)
    expect(centered).not.toMatch(/transform\s*:/)
  })

  it('draggable 时拖动标题栏改变对话框位置（内联 left/top），松手后停止跟随', async () => {
    const el = mount({ visible: '', draggable: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    el.shadowRoot!.querySelector('.header')!.dispatchEvent(pointer('pointerdown', 0, 0))
    expect(el.hasAttribute('dragging')).toBe(true)
    document.dispatchEvent(pointer('pointermove', 100, 50))
    expect(dialog.style.left).toBe('100px')
    expect(dialog.style.top).toBe('50px')
    expect(dialog.style.transform).toBe('none')
    document.dispatchEvent(pointer('pointerup', 100, 50))
    expect(el.hasAttribute('dragging')).toBe(false)
    document.dispatchEvent(pointer('pointermove', 200, 100))
    expect(dialog.style.left).toBe('100px')
  })

  it('未开启 draggable 时标题栏拖动无效', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    el.shadowRoot!.querySelector('.header')!.dispatchEvent(pointer('pointerdown', 0, 0))
    document.dispatchEvent(pointer('pointermove', 100, 50))
    expect(dialog.style.left).toBe('')
    expect(dialog.style.top).toBe('')
    expect(el.hasAttribute('dragging')).toBe(false)
  })

  it('拖动中 Esc 仍可关闭；关闭后重置拖拽位置', async () => {
    const el = mount({ visible: '', draggable: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    el.shadowRoot!.querySelector('.header')!.dispatchEvent(pointer('pointerdown', 0, 0))
    document.dispatchEvent(pointer('pointermove', 100, 50))
    expect(dialog.style.left).toBe('100px')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('visible')).toBe(false)
    expect(cancel).toBe(1)
    expect(dialog.style.left).toBe('')
    expect(dialog.style.top).toBe('')
    expect(dialog.style.transform).toBe('')
  })

  // —— fullscreen 全屏（优先级：fullscreen > width/centered/draggable）——
  it('fullscreen：dialog 标记 data-fullscreen 并清除内联宽度（width 被忽略）', async () => {
    const el = mount({ visible: '', fullscreen: '', width: '640px' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    expect(dialog.getAttribute('data-fullscreen')).not.toBeNull()
    expect(dialog.style.width).toBe('')
    el.removeAttribute('fullscreen')
    expect(dialog.getAttribute('data-fullscreen')).toBeNull()
    expect(dialog.style.width).toBe('640px')
  })

  it('fullscreen + centered：标记共存，布局优先级由 CSS（fullscreen 后置规则）接管', async () => {
    const el = mount({ visible: '', fullscreen: '', centered: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector('.dialog')!
    expect(dialog.getAttribute('data-fullscreen')).not.toBeNull()
    expect(dialog.getAttribute('data-centered')).not.toBeNull()
  })

  it('fullscreen + draggable：拖拽被禁用（优先级 fullscreen 胜出）', async () => {
    const el = mount({ visible: '', fullscreen: '', draggable: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    el.shadowRoot!.querySelector('.header')!.dispatchEvent(pointer('pointerdown', 0, 0))
    document.dispatchEvent(pointer('pointermove', 100, 50))
    expect(el.hasAttribute('dragging')).toBe(false)
    expect(dialog.style.left).toBe('')
    expect(dialog.style.top).toBe('')
  })

  it('fullscreen 下 Esc / 遮罩关闭照常', async () => {
    const el = mount({ visible: '', fullscreen: '' })
    await Promise.resolve()
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('visible')).toBe(false)
    expect(cancel).toBe(1)
    el.setAttribute('visible', '')
    el.shadowRoot!.querySelector('.mask')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('fullscreen 下 ARIA 与焦点行为不变（打开聚焦取消按钮，关闭还原来源焦点）', async () => {
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    const el = mount({ visible: '', fullscreen: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector('.dialog')!
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-hidden')).toBe('false')
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('[part="cancel"]'))
    el.removeAttribute('visible')
    await Promise.resolve()
    expect(dialog.getAttribute('aria-hidden')).toBe('true')
    expect(document.activeElement).toBe(outside)
  })

  // —— loading 确定按钮（禁止重复触发）——
  it('loading：确定按钮 disabled + aria-busy + spinner 显示，移除后恢复', async () => {
    const el = mount({ visible: '', loading: '' })
    await Promise.resolve()
    const okBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="ok"]')!
    expect(okBtn.disabled).toBe(true)
    expect(okBtn.getAttribute('aria-busy')).toBe('true')
    expect(okBtn.querySelector('.spinner')!.hasAttribute('hidden')).toBe(false)
    el.removeAttribute('loading')
    await Promise.resolve()
    expect(okBtn.disabled).toBe(false)
    expect(okBtn.getAttribute('aria-busy')).toBe('false')
    expect(okBtn.querySelector('.spinner')!.hasAttribute('hidden')).toBe(true)
  })

  it('loading 期间点击确定不派发 oas-ok 也不关闭', async () => {
    const el = mount({ visible: '', loading: '' })
    await Promise.resolve()
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect(ok).toBe(0)
    expect(el.hasAttribute('visible')).toBe(true)
  })

  it('loading 移除后可正常确定', async () => {
    const el = mount({ visible: '', loading: '' })
    await Promise.resolve()
    el.removeAttribute('loading')
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect(ok).toBe(1)
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('loading 中 Esc 仍可关闭', async () => {
    const el = mount({ visible: '', loading: '' })
    await Promise.resolve()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('visible')).toBe(false)
  })

  // —— 焦点陷阱（全屏与普通模式共用）——
  it('焦点陷阱：Tab 从末元素回到首元素，Shift+Tab 反向循环', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const root = el.shadowRoot!
    const close = root.querySelector<HTMLElement>('[part="close"]')!
    const cancel = root.querySelector<HTMLElement>('[part="cancel"]')!
    const ok = root.querySelector<HTMLElement>('[part="ok"]')!
    ok.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(root.activeElement).toBe(close)
    close.focus()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    )
    expect(root.activeElement).toBe(ok)
    // 中间元素 Tab 不触发 preventDefault（happy-dom 不实现原生 Tab 移动，故不断言位置）
  })

  it('焦点陷阱：焦点逃逸到对话框外时 Tab 拉回对话框内', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('[part="close"]'))
  })

  it('焦点陷阱：焦点在 slot 内嵌套输入框时不拉回（Tab 不打断嵌套控件导航）', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    // 模拟表单 modal：slot 内放一个嵌套 input，焦点落在其内层
    const input = document.createElement('input')
    el.appendChild(input)
    input.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    // happy-dom 无原生 Tab 移动，断言焦点未被拉回对话框按钮（仍在输入框）
    expect(document.activeElement).toBe(input)
  })

  it('焦点陷阱：多实例并存时仅最上层 modal 接管', async () => {
    const first = mount({ visible: '' })
    await Promise.resolve()
    const second = mount({ visible: '' })
    await Promise.resolve()
    const firstRoot = first.shadowRoot!
    const secondRoot = second.shadowRoot!
    secondRoot.querySelector<HTMLElement>('[part="ok"]')!.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    // 只有 second 接管陷阱 → Tab 从 ok 回到 second 的首个可聚焦元素
    expect(secondRoot.activeElement).toBe(secondRoot.querySelector('[part="close"]'))
  })

  it('视口高度保护：dialog 限高（max-height）且 body 可滚动（overflow auto）', () => {
    const el = mount({ visible: '' })
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('[part="dialog"]')!
    const body = el.shadowRoot!.querySelector<HTMLElement>('[part="body"]')!
    const csD = getComputedStyle(dialog)
    const csB = getComputedStyle(body)
    // 弹窗天然该有视口高度保护：小窗口下内容不得溢出（标题/关闭钮始终可达）
    expect(csD.maxHeight).not.toBe('none')
    expect(csD.display).toBe('flex')
    expect(csD.flexDirection).toBe('column')
    expect(csB.overflowY).toBe('auto')
    expect(csB.flex).toContain('1')
  })

  // —— type 语义变体图标 ——
  it('type 渲染语义图标（info → info 图标），移除 type 后隐藏', async () => {
    const el = mount({ visible: '', type: 'info' })
    await Promise.resolve()
    const icon = el.shadowRoot!.querySelector('[part="semantic-icon"]')!
    expect(icon.hasAttribute('hidden')).toBe(false)
    expect(icon.querySelector('svg')).not.toBeNull()
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    el.removeAttribute('type')
    await Promise.resolve()
    expect(icon.hasAttribute('hidden')).toBe(true)
    expect(icon.querySelector('svg')).toBeNull()
  })

  it('type 语义图标映射与颜色选择器（host 属性命中，只走 token）', async () => {
    const el = mount({ visible: '', type: 'success' })
    await Promise.resolve()
    const icon = el.shadowRoot!.querySelector('[part="semantic-icon"]')!
    // happy-dom 会把自闭合 SVG 标签序列化为显式闭合，用同源解析的参考元素比对
    const ref = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    ref.innerHTML = iconRegistry['check-circle']
    expect(icon.querySelector('svg')!.innerHTML).toBe(ref.innerHTML)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(":host([type='success']) .semantic-icon")
    expect(css).toContain(":host([type='warning']) .semantic-icon")
    expect(css).toContain(":host([type='error']) .semantic-icon")
    expect(css).toContain('var(--oas-color-success)')
    expect(css).toContain('var(--oas-color-warning)')
    expect(css).toContain('var(--oas-color-danger)')
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}/) // 无硬编码色值
  })

  it('非法 type 值不渲染图标（回退隐藏）', async () => {
    const el = mount({ visible: '', type: 'danger' })
    await Promise.resolve()
    const icon = el.shadowRoot!.querySelector('[part="semantic-icon"]')!
    expect(icon.hasAttribute('hidden')).toBe(true)
  })

  // —— ok-text / cancel-text ——
  it('ok-text / cancel-text 覆盖内置文案（含 aria-label），移除后回退 locale', async () => {
    const el = mount({ visible: '', 'ok-text': '确认删除', 'cancel-text': '取消吧' })
    await Promise.resolve()
    const okBtn = el.shadowRoot!.querySelector('[part="ok"]')!
    const cancelBtn = el.shadowRoot!.querySelector('[part="cancel"]')!
    expect(okBtn.textContent).toContain('确认删除')
    expect(cancelBtn.textContent).toContain('取消吧')
    expect(okBtn.getAttribute('aria-label')).toBe('确认删除')
    expect(cancelBtn.getAttribute('aria-label')).toBe('取消吧')
    el.removeAttribute('ok-text')
    el.removeAttribute('cancel-text')
    await Promise.resolve()
    expect(okBtn.textContent).toContain('确定')
    expect(cancelBtn.textContent).toContain('取消')
  })

  // —— no-cancel ——
  it('no-cancel 隐藏取消按钮（hidden），焦点陷阱选择器排除隐藏按钮', async () => {
    const el = mount({ visible: '', 'no-cancel': '' })
    await Promise.resolve()
    const cancelBtn = el.shadowRoot!.querySelector<HTMLElement>('[part="cancel"]')!
    expect(cancelBtn.hidden).toBe(true)
    // 焦点陷阱的 focusables 不含隐藏取消按钮：ok（末尾）Tab → close（首个）
    el.shadowRoot!.querySelector<HTMLElement>('[part="ok"]')!.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('[part="close"]'))
  })

  // —— 打开聚焦目标（focus-ok / no-cancel）——
  it('focus-ok：打开聚焦「确定」按钮（默认聚焦取消）', async () => {
    const el = mount({ visible: '', 'focus-ok': '' })
    await Promise.resolve()
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('[part="ok"]'))
  })

  it('no-cancel（无 focus-ok）时打开回退聚焦「确定」按钮', async () => {
    const el = mount({ visible: '', 'no-cancel': '' })
    await Promise.resolve()
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('[part="ok"]'))
  })

  it('close() 为公开方法：编程关闭移除 visible 并派发 oas-cancel', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    el.close('cancel')
    expect(el.hasAttribute('visible')).toBe(false)
    expect(cancel).toBe(1)
  })

  describe('title 吸收（消除宿主原生 tooltip）', () => {
    it('挂载后宿主不再残留 title 属性，标题照常渲染进标题区', async () => {
      const el = mount({ visible: '', title: '弹窗标题' })
      await Promise.resolve()
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('弹窗标题')
    })

    it('吸收触发的二次 update 幂等（标题不丢失，aria-labelledby 指向不受影响）', async () => {
      const el = mount({ visible: '', title: '弹窗标题' })
      await Promise.resolve()
      el.setAttribute('width', '600px') // 触发二次 update
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('弹窗标题')
      expect(el.hasAttribute('title')).toBe(false)
      expect(
        el.shadowRoot!.querySelector('[role="dialog"]')!.getAttribute('aria-labelledby'),
      ).toBe('oas-modal-title')
    })

    it('运行时改 title 属性：新值吸收渲染，宿主仍无残留', async () => {
      const el = mount({ visible: '', title: '旧标题' })
      await Promise.resolve()
      el.setAttribute('title', '新标题')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('新标题')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title="" 清空标题（属性在场=宿主意图）', async () => {
      const el = mount({ visible: '', title: '弹窗标题' })
      await Promise.resolve()
      el.setAttribute('title', '')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('水合恢复：快照标题区有文本时恢复缓存，水合后标题不丢失', () => {
      const ref = new OASModal()
      ref.setAttribute('title', '水合标题')
      document.body.appendChild(ref)
      const snap = ref.shadowRoot!.innerHTML
      ref.remove()

      const el = new OASModal()
      el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-modal" data-oas-ssr-v="1">${snap}`
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('水合标题')
      expect(el.hasAttribute('title')).toBe(false)
      el.remove()
    })
  })

  describe('title 双通道（slot 富内容覆盖属性文本）', () => {
    function mountWithSlot(title: string | null, slotHtml: string): OASModal {
      const el = new OASModal()
      el.setAttribute('visible', '')
      if (title !== null) el.setAttribute('title', title)
      el.innerHTML = `${slotHtml}<p>内容</p>`
      document.body.appendChild(el)
      return el
    }

    it('slot 有内容时覆盖属性文本，aria-labelledby 指向标题区容器（可访问名不丢）', async () => {
      const el = mountWithSlot('属性标题', '<span slot="title">插槽标题</span>')
      await Promise.resolve()
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      // 宿主 title 仍被吸收（吸收状态机不变）
      expect(el.hasAttribute('title')).toBe(false)
      // aria-labelledby 继续指向 oas-modal-title（id 保留在 part="title" 容器上，
      // 容器含 slot，插槽内容/属性文本两路径都可访问名解析）
      const dialog = el.shadowRoot!.querySelector('[role="dialog"]')!
      expect(dialog.getAttribute('aria-labelledby')).toBe('oas-modal-title')
      const titleContainer = el.shadowRoot!.querySelector('[part="title"]')!
      expect(titleContainer.id).toBe('oas-modal-title')
    })

    it('仅 slot 无属性：标题区渲染 slot 内容且不隐藏', async () => {
      const el = mountWithSlot(null, '<span slot="title">插槽标题</span>')
      await Promise.resolve()
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('双空（无 title 无 slot）：标题区不渲染文本（兜底为空、不隐藏）', async () => {
      const el = mountWithSlot(null, '')
      await Promise.resolve()
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('动态移除 slot 内容后回落属性文本', async () => {
      const el = mountWithSlot('属性标题', '<span slot="title">插槽标题</span>')
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(true)
      const node = el.querySelector('span[slot="title"]')!
      el.removeChild(node)
      await new Promise((r) => setTimeout(r, 0))
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('属性标题')
    })
  })
})

function pointer(type: string, clientX: number, clientY = 0): Event {
  const Ctor = (globalThis as Record<string, unknown>).PointerEvent as
    | typeof PointerEvent
    | undefined
  if (typeof Ctor === 'function') {
    return new Ctor(type, { bubbles: true, clientX, clientY })
  }
  return new MouseEvent(type, { bubbles: true, clientX, clientY })
}
