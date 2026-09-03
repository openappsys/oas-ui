import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
    // 断言针对真实声明：先剔除注释（注释里解释性文本可能含 "transform:" 字样，非声明）
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const base = /\.dialog\s*\{[^}]*\}/.exec(clean)?.[0] ?? ''
    expect(base).toMatch(/left:\s*0/)
    expect(base).toMatch(/right:\s*0/)
    expect(base).toMatch(/margin:\s*0 auto/)
    expect(base).not.toMatch(/transform\s*:/) // 无 transform 声明
    const centered = /\.dialog\[data-centered\]\s*\{[^}]*\}/.exec(clean)?.[0] ?? ''
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

describe('OASModal 一期能力增强', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  // —— P1 body 滚动锁（多实例嵌套计数 + 滚动条宽度补偿 + 断开兜底解锁）——

  it('P1 打开锁 body 滚动（overflow hidden + padding 补偿），关闭还原', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    expect(document.body.style.overflow).toBe('hidden')
    // 滚动条宽度补偿：happy-dom 的 innerWidth/clientWidth 不可靠，仅断言设置了补偿（非空）；
    // 真实浏览器为 calc(原 padding + 滚动条宽度)，关闭时还原
    expect(document.body.style.paddingRight).not.toBe('')
    el.removeAttribute('visible')
    await Promise.resolve()
    expect(document.body.style.overflow).toBe('')
    expect(document.body.style.paddingRight).toBe('')
  })

  it('P1 多实例嵌套计数：全部关闭才解锁（最后一个解锁才恢复原值）', async () => {
    const a = mount({ visible: '' })
    const b = mount({ visible: '' })
    await Promise.resolve()
    expect(document.body.style.overflow).toBe('hidden')
    a.removeAttribute('visible')
    await Promise.resolve()
    expect(document.body.style.overflow, '仍有一个实例打开，锁不释放').toBe('hidden')
    b.removeAttribute('visible')
    await Promise.resolve()
    expect(document.body.style.overflow).toBe('')
  })

  it('P1 断开连接兜底解锁（未 closed 就被移除时不留残留锁）', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    expect(document.body.style.overflow).toBe('hidden')
    el.remove()
    expect(document.body.style.overflow).toBe('')
  })

  it('P1 no-scroll-lock 跳过滚动锁', async () => {
    const el = mount({ visible: '', 'no-scroll-lock': '' })
    await Promise.resolve()
    expect(document.body.style.overflow).toBe('')
  })

  // —— P2 before-close 拦截（cancelable，detail.source 标明来源）——

  it('P2 oas-before-close preventDefault 拦截关闭：不移除 visible、不派发 oas-close/oas-cancel', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let close = 0
    let cancel = 0
    el.addEventListener('oas-close', () => close++)
    el.addEventListener('oas-cancel', () => cancel++)
    el.addEventListener('oas-before-close', (e) => {
      expect((e as CustomEvent).detail.source).toBe('cancel')
      e.preventDefault()
    })
    el.shadowRoot!.querySelector<HTMLElement>('[part="cancel"]')!.click()
    expect(el.hasAttribute('visible')).toBe(true)
    expect(close).toBe(0)
    expect(cancel).toBe(0)
  })

  it('P2 before-close 放行（不拦截）时正常关闭；detail.source 携带来源', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const sources: string[] = []
    el.addEventListener('oas-before-close', (e) => {
      sources.push((e as CustomEvent).detail.source)
    })
    el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.click()
    expect(el.hasAttribute('visible')).toBe(false)
    expect(sources).toEqual(['close-btn'])
  })

  // —— P12/A32 关闭来源与取消/关闭区分（oas-close.detail）——

  it('P12 oas-close 携带来源与动作：ok→confirm、取消按钮→cancel、✕/遮罩/Esc→close', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const records: string[] = []
    el.addEventListener('oas-close', (e) => {
      records.push(`${(e as CustomEvent).detail.source}:${(e as CustomEvent).detail.action}`)
    })
    // ok
    el.shadowRoot!.querySelector<HTMLElement>('[part="ok"]')!.click()
    expect(records).toEqual(['ok:confirm'])
    expect(el.hasAttribute('visible')).toBe(false)
    // 取消按钮
    el.setAttribute('visible', '')
    el.shadowRoot!.querySelector<HTMLElement>('[part="cancel"]')!.click()
    expect(records).toEqual(['ok:confirm', 'cancel:cancel'])
    // ✕
    el.setAttribute('visible', '')
    el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.click()
    expect(records).toEqual(['ok:confirm', 'cancel:cancel', 'close-btn:close'])
    // 遮罩
    el.setAttribute('visible', '')
    el.shadowRoot!.querySelector('.mask')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(records).toEqual([
      'ok:confirm',
      'cancel:cancel',
      'close-btn:close',
      'mask:close',
    ])
    // Esc
    el.setAttribute('visible', '')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(records).toEqual([
      'ok:confirm',
      'cancel:cancel',
      'close-btn:close',
      'mask:close',
      'esc:close',
    ])
  })

  it('A32 取消/关闭兼容：✕/遮罩/Esc 同时派发 oas-cancel（旧语义保留）；取消按钮也派发', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.click()
    expect(cancel).toBe(1)
    el.setAttribute('visible', '')
    el.shadowRoot!.querySelector('.mask')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(cancel).toBe(2)
    el.setAttribute('visible', '')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(cancel).toBe(3)
  })

  it('P12 编程 close("programmatic") 派发 oas-close(source=programmatic, action=close)', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const detail = { source: '', action: '' }
    el.addEventListener('oas-close', (e) => {
      detail.source = (e as CustomEvent).detail.source
      detail.action = (e as CustomEvent).detail.action
    })
    el.close('programmatic')
    expect(el.hasAttribute('visible')).toBe(false)
    expect(detail.source).toBe('programmatic')
    expect(detail.action).toBe('close')
  })

  it('P2 编程关闭绕过 before-close 拦截（handle.close 必须可靠）', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let beforeClose = 0
    el.addEventListener('oas-before-close', (e) => {
      beforeClose++
      e.preventDefault()
    })
    el.close('programmatic')
    expect(el.hasAttribute('visible')).toBe(false)
    expect(beforeClose).toBe(0)
  })

  // —— P4 三开关：close-on-esc / close-on-mask（no-mask-close 已有）/ ✕ 显隐 ——

  it('P4 no-esc-close 禁用 Esc 关闭（✕/遮罩不受影响）', async () => {
    const el = mount({ visible: '', 'no-esc-close': '' })
    await Promise.resolve()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('visible')).toBe(true)
    el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.click()
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('P4 no-close-btn 隐藏关闭按钮（hidden，且不进入焦点陷阱）', async () => {
    const el = mount({ visible: '', 'no-close-btn': '' })
    await Promise.resolve()
    const close = el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!
    expect(close.hidden).toBe(true)
    // 打开默认聚焦取消（close 隐藏不参与回退聚焦）
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('[part="cancel"]'))
  })

  it('P4 Esc 仅最上层 modal 响应（多实例嵌套逐层关闭）', async () => {
    const first = mount({ visible: '' })
    const second = mount({ visible: '' })
    await Promise.resolve()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(second.hasAttribute('visible')).toBe(false)
    expect(first.hasAttribute('visible')).toBe(true)
  })

  // —— P5 footer 插槽 ——

  it('P5 slot="footer" 有内容时隐藏内置确定/取消按钮，插槽内容渲染', async () => {
    const el = new OASModal()
    el.setAttribute('visible', '')
    el.innerHTML = '<span slot="footer"><button class="custom">自定义</button></span>'
    document.body.appendChild(el)
    await Promise.resolve()
    const actions = el.shadowRoot!.querySelector<HTMLElement>('[part="footer-actions"]')!
    expect(actions.hidden).toBe(true)
    expect(el.shadowRoot!.querySelector('slot[name="footer"]')).not.toBeNull()
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="footer"]')!
    expect(slot.assignedNodes().length).toBeGreaterThan(0)
    // 插槽内容实际显示（未被内置按钮遮挡逻辑破坏）
    expect(el.textContent).toContain('自定义')
  })

  it('P5 无 footer 插槽内容时内置按钮照常显示', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="footer-actions"]')!.hidden).toBe(
      false,
    )
  })

  // —— P10 destroy-on-close ——

  it('P10 destroy-on-close：关闭动画结束（oas-closed）后清空 light DOM 内容', async () => {
    const el = mount({ visible: '', 'destroy-on-close': '' })
    await Promise.resolve()
    expect(el.children.length).toBeGreaterThan(0)
    el.removeAttribute('visible')
    expect(el.children.length, '动画未结束前不销毁').toBeGreaterThan(0)
    el.shadowRoot!.querySelector('.dialog')!.dispatchEvent(new Event('transitionend'))
    await Promise.resolve()
    expect(el.children.length).toBe(0)
  })

  it('P10 未开启 destroy-on-close：关闭动画结束后内容保留（默认不销毁 DOM）', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    expect(el.children.length).toBeGreaterThan(0)
    el.removeAttribute('visible')
    el.shadowRoot!.querySelector('.dialog')!.dispatchEvent(new Event('transitionend'))
    await Promise.resolve()
    expect(el.children.length).toBeGreaterThan(0)
  })

  // —— P7 append-to ——

  it('P7 append-to 把 mask/dialog 挂到指定容器 shadow（portal host），移除属性后回挂组件 shadow', async () => {
    const el = mount({ visible: '', 'append-to': 'body' })
    await Promise.resolve()
    const portal = document.querySelector('[data-oas-modal-portal]')!
    expect(portal).not.toBeNull()
    expect(portal.shadowRoot!.querySelector('.mask')).not.toBeNull()
    expect(portal.shadowRoot!.querySelector('.dialog')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('.dialog')).toBeNull()
    el.removeAttribute('append-to')
    await Promise.resolve()
    expect(portal.shadowRoot!.querySelector('.dialog')).toBeNull()
    expect(el.shadowRoot!.querySelector('.dialog')).not.toBeNull()
  })

  it('P7 append-to 选择器命中自定义容器；无效选择器回退组件 shadow', async () => {
    const host = document.createElement('div')
    host.id = 'modal-host'
    document.body.appendChild(host)
    const el = mount({ visible: '', 'append-to': '#modal-host' })
    await Promise.resolve()
    const portal = host.querySelector('[data-oas-modal-portal]')!
    expect(portal).not.toBeNull()
    expect(portal.shadowRoot!.querySelector('.dialog')).not.toBeNull()
    el.removeAttribute('append-to')
    await Promise.resolve()
    el.setAttribute('append-to', '#no-such-node')
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('.dialog')).not.toBeNull()
  })

  // —— P9 position top ——

  it('P9 position="top" 顶部贴边（CSS top: 0，默认 top: 100px 不受影响）', () => {
    const el = mount({ visible: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    const topRule = /:host\(\[position='top'\]\) \.dialog\s*\{[^}]*\}/.exec(css)?.[0] ?? ''
    expect(topRule).toContain('top: 0')
    // 默认定位规则仍存在
    expect(css).toMatch(/\.dialog\s*\{[^}]*top:\s*100px/)
  })

  // —— P11 遮罩样式变量开口 + blur 可选 ——

  it('P11 遮罩背景走 --oas-modal-mask-bg 变量（回退 overlay token），blur 走变量开口，无硬编码色值', () => {
    const el = mount({ visible: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    const maskRule = /\.mask\s*\{[^}]*\}/.exec(css)?.[0] ?? ''
    expect(maskRule).toContain('var(--oas-modal-mask-bg')
    expect(maskRule).toContain('var(--oas-color-overlay)')
    expect(maskRule).toContain('var(--oas-modal-mask-blur')
    expect(maskRule).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })

  // —— P13 焦点管理开关 + 焦点陷阱含 light DOM ——

  it('P13 no-focus-trap 关闭焦点陷阱：焦点逃逸不拉回', async () => {
    const el = mount({ visible: '', 'no-focus-trap': '' })
    await Promise.resolve()
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(outside)
  })

  it('P13 initial-focus 打开聚焦指定元素（light DOM 命中优先于 shadow 回退）', async () => {
    const el = new OASModal()
    el.setAttribute('visible', '')
    el.setAttribute('initial-focus', '#focus-me')
    el.innerHTML = '<input id="focus-me">'
    document.body.appendChild(el)
    await Promise.resolve()
    expect(document.activeElement).toBe(el.querySelector('#focus-me'))
  })

  it('P13 initial-focus 未命中时回退默认聚焦（取消按钮）', async () => {
    const el = mount({ visible: '', 'initial-focus': '#none' })
    await Promise.resolve()
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('[part="cancel"]'))
  })

  it('PB5 焦点陷阱含 slot 分配的 light DOM 输入框：Tab 序包含输入框（末元素循环回首个）', async () => {
    const el = new OASModal()
    el.setAttribute('visible', '')
    el.innerHTML = '<input id="i1">'
    document.body.appendChild(el)
    await Promise.resolve()
    const root = el.shadowRoot!
    const ok = root.querySelector<HTMLElement>('[part="ok"]')!
    const close = root.querySelector<HTMLElement>('[part="close"]')!
    // ok 是陷阱末元素（输入框在中间）：Tab 循环回 close
    ok.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(root.activeElement).toBe(close)
    // 输入框是中间元素：Tab 不拦截（不打断输入框导航）
    const input = el.querySelector<HTMLElement>('#i1')!
    input.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(input)
  })

  // —— P14 aria-describedby ——

  it('P14 description 插槽有内容时 dialog aria-describedby 关联描述容器；清空后移除', async () => {
    const el = new OASModal()
    el.setAttribute('visible', '')
    el.innerHTML = '<p slot="description">辅助说明</p>'
    document.body.appendChild(el)
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector('[role="dialog"]')!
    expect(dialog.getAttribute('aria-describedby')).toBe('oas-modal-desc')
    const desc = el.shadowRoot!.querySelector<HTMLElement>('#oas-modal-desc')!
    expect(desc.hidden).toBe(false)
    // 清空插槽 → 移除关联 + 隐藏容器
    el.innerHTML = ''
    await new Promise((r) => setTimeout(r, 0))
    expect(dialog.getAttribute('aria-describedby')).toBeNull()
    expect(desc.hidden).toBe(true)
  })

  it('P14 宿主 aria-describedby 属性透传（优先于插槽）', async () => {
    const el = mount({ visible: '', 'aria-describedby': 'ext-desc' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector('[role="dialog"]')!
    expect(dialog.getAttribute('aria-describedby')).toBe('ext-desc')
  })

  it('P14 无描述内容时不残留 aria-describedby', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector('[role="dialog"]')!
    expect(dialog.getAttribute('aria-describedby')).toBeNull()
  })

  // —— P24 role 属性（命令式确认/语义变体用 alertdialog）——

  it('P24 role 属性切换 dialog 语义（alertdialog），缺省保持 dialog', async () => {
    const el = mount({ visible: '', role: 'alertdialog' })
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('[role="alertdialog"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[role="dialog"]')).toBeNull()
  })
})

describe('OASModal 二期能力增强', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function dialogOf(el: OASModal): HTMLElement {
    return el.shadowRoot!.querySelector('.dialog') as HTMLElement
  }

  /** 触发关闭动画结束（happy-dom 无真实过渡，手动派发 transitionend） */
  function endClose(el: OASModal): void {
    dialogOf(el).dispatchEvent(new Event('transitionend'))
  }

  /** 覆写视口尺寸并触发 resize（P19 断点测试） */
  function setViewport(width: number, height: number): void {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: height, configurable: true })
    window.dispatchEvent(new Event('resize'))
  }

  // ===== P3 开关动画 + opened/closed =====

  it('P3 打开：mask/dialog 写入 data-open、移除 data-closed（驱动 CSS 过渡），并派发 oas-open', async () => {
    const el = mount()
    let open = 0
    el.addEventListener('oas-open', () => open++)
    el.setAttribute('visible', '')
    await Promise.resolve()
    expect(open).toBe(1)
    expect(el.shadowRoot!.querySelector('.mask')!.getAttribute('data-open')).not.toBeNull()
    expect(dialogOf(el).getAttribute('data-open')).not.toBeNull()
    expect(dialogOf(el).getAttribute('data-closed')).toBeNull()
  })

  it('P3 打开动画走 transform/opacity（CSS 含过渡），prefers-reduced-motion 关闭过渡', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('transform')
    expect(css).toContain('opacity')
    expect(css).toContain('prefers-reduced-motion')
  })

  it('P3 动画结束（transitionend）后派发 oas-opened', () => {
    const el = mount({ visible: '' })
    let opened = 0
    el.addEventListener('oas-opened', () => opened++)
    expect(opened).toBe(0)
    endClose(el)
    expect(opened).toBe(1)
  })

  it('P3 visibility 的 0s 离散 transitionend 不提前触发 opened（等 transform/opacity 结束）', () => {
    const el = mount({ visible: '' })
    let opened = 0
    el.addEventListener('oas-opened', () => opened++)
    const vis = new Event('transitionend')
    Object.defineProperty(vis, 'propertyName', { value: 'visibility' })
    dialogOf(el).dispatchEvent(vis)
    expect(opened).toBe(0)
    endClose(el)
    expect(opened).toBe(1)
  })

  it('P3 关闭：移除 data-open + 加 data-closed，动画结束派发 oas-closed（事件在关闭开始时派发）', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const closeDetail: { source: string } = { source: '' }
    let closed = 0
    el.addEventListener('oas-close', (e) => {
      closeDetail.source = (e as CustomEvent<{ source: string }>).detail.source
    })
    el.addEventListener('oas-closed', () => closed++)
    el.shadowRoot!.querySelector<HTMLElement>('[part="cancel"]')!.click()
    expect(closeDetail.source).toBe('cancel')
    expect(el.hasAttribute('visible')).toBe(false)
    expect(dialogOf(el).getAttribute('data-open')).toBeNull()
    expect(dialogOf(el).getAttribute('data-closed')).not.toBeNull()
    expect(closed).toBe(0)
    endClose(el)
    expect(closed).toBe(1)
  })

  it('P3 关闭动画结束前 opened/closing 语义：closing 期间再移除不重复走关闭边沿', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    expect(el.opened).toBe(true)
    expect(el.closing).toBe(false)
    el.shadowRoot!.querySelector<HTMLElement>('[part="cancel"]')!.click()
    expect(el.opened).toBe(false)
    expect(el.closing).toBe(true)
    // closing 期间 removeAttribute 幂等（不重复解锁/派发）
    let close = 0
    el.addEventListener('oas-close', () => close++)
    el.removeAttribute('visible')
    expect(close).toBe(0)
    endClose(el)
    expect(el.closing).toBe(false)
  })

  it('P3 transition="none"：无过渡声明，动画结束事件同步完成（无 timer 依赖）', () => {
    const el = mount()
    let opened = 0
    let closed = 0
    el.addEventListener('oas-opened', () => opened++)
    el.addEventListener('oas-closed', () => closed++)
    el.setAttribute('transition', 'none')
    el.setAttribute('visible', '')
    // 打开瞬间 opened 已同步派发（无过渡可播）
    expect(opened).toBe(1)
    el.removeAttribute('visible')
    expect(closed).toBe(1)
    expect(dialogOf(el).getAttribute('data-open')).toBeNull()
  })

  it('P3 transition="fade"：data-closed 不写 transform（仅透明度淡入淡出）', () => {
    const el = mount({ visible: '', transition: 'fade' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/:host\(\[transition='fade'\]\)[^{]*data-closed[^{]*\{[^}]*transform:\s*none/)
  })

  it('P3 命令式销毁时序：关闭后等 oas-closed 才卸载（本层由命令式 API 驱动）', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    el.addEventListener('oas-closed', () => el.remove())
    el.removeAttribute('visible')
    expect(el.isConnected).toBe(true)
    endClose(el)
    expect(el.isConnected).toBe(false)
  })

  // ===== P22 点击位置动画原点 =====

  it('P22 打开瞬间记录指针位置：transform-origin 走 CSS 变量指向点击点', () => {
    const el = mount()
    document.dispatchEvent(pointer('pointerdown', 700, 400))
    el.setAttribute('visible', '')
    const dialog = dialogOf(el)
    expect(dialog.style.getPropertyValue('--oas-modal-origin-x')).toBe('700px')
    expect(dialog.style.getPropertyValue('--oas-modal-origin-y')).toBe('400px')
  })

  it('P22 无近期指针记录（如键盘打开）时回退居中（CSS 变量清空）', () => {
    const el = mount()
    // 无 pointerdown（时间戳久远）：变量未写入，CSS 回退 center
    el.setAttribute('visible', '')
    const dialog = dialogOf(el)
    expect(dialog.style.getPropertyValue('--oas-modal-origin-x')).toBe('')
  })

  // ===== P8 no-mask 非模态 =====

  it('P8 no-mask：遮罩隐藏 + 焦点陷阱关闭（打开不聚焦、Tab 不拉回）', async () => {
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    const el = mount({ visible: '', 'no-mask': '' })
    await Promise.resolve()
    const mask = el.shadowRoot!.querySelector<HTMLElement>('.mask')!
    expect(mask.hidden).toBe(true)
    // 打开不抢焦点（非模态）
    expect(document.activeElement).toBe(outside)
    // Tab 逃逸不拉回
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(outside)
  })

  it('P8 无 no-mask 时遮罩照常显示、打开聚焦（回归对照）', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector<HTMLElement>('.mask')!.hidden).toBe(false)
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('[part="cancel"]'))
  })

  it('P8 no-mask 下关闭 / Esc 关闭语义保持（由 no-esc-close 另行关闭 Esc）', async () => {
    const el = mount({ visible: '', 'no-mask': '' })
    await Promise.resolve()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('visible')).toBe(false)
  })

  // ===== P16 拖拽钳制在视口内 =====

  it('P16 拖拽钳制：超出视口右边/下边时坐标被夹回视口内（默认开启）', () => {
    const el = mount({ visible: '', draggable: '' })
    const dialog = dialogOf(el)
    const vw = window.innerWidth
    const vh = window.innerHeight
    const spy = vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      left: 252,
      top: 100,
      width: 520,
      height: 260,
      right: 772,
      bottom: 360,
      x: 252,
      y: 100,
      toJSON: () => ({}),
    } as DOMRect)
    // 起手于 (0,0)，拖到视口外右下
    el.shadowRoot!.querySelector('.header')!.dispatchEvent(pointer('pointerdown', 0, 0))
    document.dispatchEvent(pointer('pointermove', vw + 5000, vh + 5000))
    expect(dialog.style.left).toBe(`${vw - 520}px`)
    expect(dialog.style.top).toBe(`${vh - 260}px`)
    // 拖到视口外左上：夹回 0
    document.dispatchEvent(pointer('pointermove', -5000, -5000))
    expect(dialog.style.left).toBe('0px')
    expect(dialog.style.top).toBe('0px')
    document.dispatchEvent(pointer('pointerup', -5000, -5000))
    spy.mockRestore()
  })

  // ===== P18 声明式 trigger =====

  it('P18 trigger 绑定元素点击打开（只 setAttribute visible，不触碰受控模型）', async () => {
    const btn = document.createElement('button')
    btn.id = 'modal-trigger-a'
    document.body.appendChild(btn)
    const el = mount({ trigger: 'modal-trigger-a' })
    await Promise.resolve()
    expect(el.hasAttribute('visible')).toBe(false)
    btn.click()
    expect(el.hasAttribute('visible')).toBe(true)
    // 已打开时再次点击不重复副作用（保持打开）
    btn.click()
    expect(el.hasAttribute('visible')).toBe(true)
  })

  it('P18 trigger 目标不存在时不抛错、不绑定', () => {
    const el = mount({ trigger: 'no-such-id' })
    expect(() => el.setAttribute('visible', '')).not.toThrow()
  })

  // ===== P19 fullscreen-breakpoint + size 预设 =====

  it('P19 size 预设：sm/lg 映射宽度（width 显式优先，非法值回退主题默认）', async () => {
    const a = mount({ visible: '', size: 'sm' })
    const b = mount({ visible: '', size: 'lg' })
    const c = mount({ visible: '', size: 'xl', width: '640px' })
    const d = mount({ visible: '', size: 'bogus' })
    await Promise.resolve()
    expect(dialogOf(a).style.width).toBe('400px')
    expect(dialogOf(b).style.width).toBe('720px')
    expect(dialogOf(c).style.width).toBe('640px') // width 优先
    expect(dialogOf(d).style.width).toBe('') // 非法 size 回退主题默认
  })

  it('P19 fullscreen-breakpoint：视口窄于阈值自动全屏，宽于阈值恢复', async () => {
    const origW = window.innerWidth
    const origH = window.innerHeight
    try {
      setViewport(1280, 800)
      const el = mount({ visible: '', 'fullscreen-breakpoint': '900', width: '640px' })
      await Promise.resolve()
      expect(dialogOf(el).getAttribute('data-fullscreen')).toBeNull()
      // 收窄视口 → 自动全屏（标记 data-fullscreen + 清除内联宽度）
      setViewport(800, 600)
      expect(dialogOf(el).getAttribute('data-fullscreen')).not.toBeNull()
      expect(dialogOf(el).style.width).toBe('')
      // 拉宽视口 → 恢复常规（宽度回到显式 width）
      setViewport(1280, 800)
      expect(dialogOf(el).getAttribute('data-fullscreen')).toBeNull()
      expect(dialogOf(el).style.width).toBe('640px')
    } finally {
      setViewport(origW, origH)
    }
  })

  // ===== P21 confirm-on-enter =====

  it('P21 confirm-on-enter：弹窗内无文本输入控件时 Enter 触发确定', async () => {
    const el = mount({ visible: '', 'confirm-on-enter': '', 'no-cancel': '' })
    await Promise.resolve()
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    // 焦点落在非交互区域（tabindex=-1 的 div）
    const spot = document.createElement('div')
    spot.tabIndex = -1
    el.appendChild(spot)
    spot.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(ok).toBe(1)
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('P21 缺省（无 confirm-on-enter）时 Enter 不触发确定', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    const spot = document.createElement('div')
    spot.tabIndex = -1
    el.appendChild(spot)
    spot.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(ok).toBe(0)
    expect(el.hasAttribute('visible')).toBe(true)
  })

  it('P21 弹窗内有文本输入控件（input）时 Enter 不触发确定（不打断输入流程）', async () => {
    const el = mount({ visible: '', 'confirm-on-enter': '', 'no-cancel': '' })
    await Promise.resolve()
    const input = document.createElement('input')
    el.appendChild(input)
    input.focus()
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(ok).toBe(0)
    expect(el.hasAttribute('visible')).toBe(true)
  })

  it('P21 焦点在原生按钮上时 Enter 不重复触发（交还按钮原生激活）', async () => {
    const el = mount({ visible: '', 'confirm-on-enter': '', 'no-cancel': '' })
    await Promise.resolve()
    const okBtn = el.shadowRoot!.querySelector<HTMLElement>('[part="ok"]')!
    okBtn.focus()
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(ok).toBe(0)
  })

  // ===== P23 shake 防误关反馈 =====

  it('P23 before-close 被拦截时对话框 shake 反馈（class 加后移除，可重播）', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    el.addEventListener('oas-before-close', (e) => e.preventDefault())
    const dialog = dialogOf(el)
    el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.click()
    expect(el.hasAttribute('visible')).toBe(true)
    expect(dialog.classList.contains('oas-shake')).toBe(true)
    await new Promise((r) => setTimeout(r, 400))
    expect(dialog.classList.contains('oas-shake')).toBe(false)
  })

  it('P23 shake keyframes 只走 transform（性能纪律），无硬编码色值', () => {
    const el = mount({ visible: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    const kf = /@keyframes\s+oas-modal-shake[\s\S]*?\}/.exec(css)?.[0] ?? ''
    expect(kf).toMatch(/transform:\s*translateX/)
    expect(css).toContain('.dialog.oas-shake')
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })

  // ===== P27 close-icon 插槽 =====

  it('P27 slot="close-icon" 覆盖默认 ✕（插槽内容渲染进关闭按钮）', async () => {
    const el = mount({ visible: '' })
    const icon = document.createElement('span')
    icon.setAttribute('slot', 'close-icon')
    icon.textContent = '关闭'
    el.appendChild(icon)
    await Promise.resolve()
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="close-icon"]')!
    const assigned = slot.assignedNodes()
    expect(assigned.length).toBeGreaterThan(0)
    // 插槽分配内容即自定义关闭图标（shadow textContent 不扁平化，断言分配到 light DOM 节点）
    expect(assigned[0]!.textContent).toContain('关闭')
    // 关闭按钮本体仍可点
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.hidden).toBe(false)
  })

  it('P27 无 close-icon 插槽内容时回退默认 ✕ 字符', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const closeBtn = el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!
    expect(closeBtn.textContent).toContain('✕')
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
