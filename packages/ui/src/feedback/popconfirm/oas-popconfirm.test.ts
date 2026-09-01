import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASPopconfirm } from './index.js'

function mount(attrs: Record<string, string> = {}, inner = '<button>删除</button>'): OASPopconfirm {
  const el = new OASPopconfirm()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = inner
  document.body.appendChild(el)
  return el
}

/** 取面板元素 */
function pop(el: OASPopconfirm): HTMLElement {
  return el.shadowRoot!.querySelector('[part="popover"]')!
}

describe('OASPopconfirm', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('open 时渲染气泡，含 title 与操作按钮', async () => {
    const el = mount({ open: '', title: '确认删除？' })
    await Promise.resolve()
    const p = pop(el)
    expect(p).not.toBeNull()
    expect(p.textContent).toContain('确认删除？')
    expect(el.shadowRoot!.querySelector('[part="ok"]')).not.toBeNull()
  })

  it('点击确定派发 oas-ok 并关闭，detail.source 指向本实例（修复 shadow retarget）', async () => {
    const el = mount({ open: '', title: '确认' })
    await Promise.resolve()
    let detail: unknown
    el.addEventListener('oas-ok', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect((detail as { source: unknown }).source).toBe(el)
    expect(pop(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('点击取消派发 oas-cancel 并关闭', async () => {
    const el = mount({ open: '' })
    await Promise.resolve()
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    ;(el.shadowRoot!.querySelector('[part="cancel"]') as HTMLElement).click()
    expect(cancel).toBe(1)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('点击 slot 内触发元素切换 open', async () => {
    const el = mount({ title: '确认' })
    await Promise.resolve()
    ;(el.querySelector('button') as HTMLElement).click()
    expect(pop(el).getAttribute('aria-hidden')).toBe('false')
  })

  it('键盘/脚本激活 ok（合成 click）后 open 不被误恢复', async () => {
    // element.click() 派发 composed=false 的 click，跨 shadow boundary 时浏览器会把
    // e.target retarget 成 host 自身；组件必须用 composedPath()[0] 判断，避免 toggle 误翻转。
    const el = mount({ open: '', title: '确认' })
    await Promise.resolve()
    const okBtn = el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement
    okBtn.click()
    expect(el.hasAttribute('open')).toBe(false)
    expect(pop(el).getAttribute('aria-hidden')).toBe('true')
  })

  // —— ⑦-9 placement 12 向 + 引擎接入（替换 position，旧值兼容回落） ——

  describe('placement 12 向（定位引擎接入）', () => {
    it('12 向 placement 写入面板 data-placement（关溢出翻转后等于请求值）', async () => {
      const el = mount({ open: '', placement: 'bottom-start', 'auto-adjust-overflow': 'false' })
      await Promise.resolve()
      expect(pop(el).getAttribute('data-placement')).toBe('bottom-start')
    })

    it('打开时面板写入 fixed 视口坐标（style.top/left 为数字）', async () => {
      const el = mount({ open: '', 'auto-adjust-overflow': 'false' })
      await Promise.resolve()
      expect(pop(el).style.top).toMatch(/^-?\d+(\.\d+)?px$/)
      expect(pop(el).style.left).toMatch(/^-?\d+(\.\d+)?px$/)
    })

    it('非法 placement 回落 top', async () => {
      const el = mount({ open: '', placement: 'diagonal', 'auto-adjust-overflow': 'false' })
      await Promise.resolve()
      expect(pop(el).getAttribute('data-placement')).toBe('top')
    })

    it('旧 position 属性兼容：placement 缺席时作为定位源生效', async () => {
      const el = mount({ open: '', position: 'right', 'auto-adjust-overflow': 'false' })
      await Promise.resolve()
      expect(pop(el).getAttribute('data-placement')).toBe('right')
    })

    it('placement 优先于旧 position', async () => {
      const el = mount({
        open: '',
        position: 'bottom',
        placement: 'left-end',
        'auto-adjust-overflow': 'false',
      })
      await Promise.resolve()
      expect(pop(el).getAttribute('data-placement')).toBe('left-end')
    })

    it('默认溢出自动调整：视口放不下时主轴翻转（保留对齐后缀）', async () => {
      // happy-dom 默认视口 1024x768、锚点 rect 全 0：请求 top（0-0-8>=0 不成立）翻转 bottom
      const el = mount({ open: '', placement: 'top-start' })
      await Promise.resolve()
      expect(pop(el).getAttribute('data-placement')).toBe('bottom-start')
    })

    it('auto-adjust-overflow="false" 时不翻转', async () => {
      const el = mount({ open: '', placement: 'top-start', 'auto-adjust-overflow': 'false' })
      await Promise.resolve()
      expect(pop(el).getAttribute('data-placement')).toBe('top-start')
    })

    it('面板含箭头元素（默认显示）', async () => {
      const el = mount({ open: '' })
      await Promise.resolve()
      const arrow = pop(el).querySelector('[data-popper-arrow]') as HTMLElement
      expect(arrow).not.toBeNull()
      expect(arrow.hidden).toBe(false)
    })

    it('arrow="false" 隐藏箭头', async () => {
      const el = mount({ open: '', arrow: 'false' })
      await Promise.resolve()
      expect((pop(el).querySelector('[data-popper-arrow]') as HTMLElement).hidden).toBe(true)
    })

    it('width 数字写入面板宽度（px）', async () => {
      const el = mount({ open: '', width: '240' })
      await Promise.resolve()
      expect(pop(el).style.width).toBe('240px')
    })

    it('width 缺省时面板宽度不被内联覆盖', async () => {
      const el = mount({ open: '' })
      await Promise.resolve()
      expect(pop(el).style.width).toBe('')
    })

    it('virtual 坐标锚点：virtual-x/y 定位打开不依赖 trigger', async () => {
      const el = mount({ open: '', virtual: '', 'virtual-x': '100', 'virtual-y': '200' }, '')
      await Promise.resolve()
      expect(pop(el).getAttribute('aria-hidden')).toBe('false')
      expect(pop(el).style.top).toMatch(/px$/)
    })

    it('virtual 模式不注册外部点击关闭（宿主控制生命周期）', async () => {
      const el = mount({ open: '', virtual: '', 'virtual-x': '10', 'virtual-y': '10' }, '')
      await Promise.resolve()
      document.body.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true }),
      )
      expect(el.hasAttribute('open')).toBe(true)
    })
  })

  // —— trigger 触发体系（默认 click 不变） ——

  describe('trigger 触发方式', () => {
    it('默认 click：trigger 元素点击 toggle', async () => {
      const el = mount({})
      await Promise.resolve()
      const btn = el.querySelector('button') as HTMLElement
      btn.click()
      expect(el.hasAttribute('open')).toBe(true)
      btn.click()
      expect(el.hasAttribute('open')).toBe(false)
    })

    it('trigger="manual"：点击不触发，仅 open 属性/方法控制', async () => {
      const el = mount({ trigger: 'manual' })
      await Promise.resolve()
      ;(el.querySelector('button') as HTMLElement).click()
      expect(el.hasAttribute('open')).toBe(false)
      el.setAttribute('open', '')
      expect(el.hasAttribute('open')).toBe(true)
    })

    it('trigger="hover"：mouseenter 打开（防抖后），mouseleave 关闭', async () => {
      vi.useFakeTimers()
      try {
        const el = mount({ trigger: 'hover' })
        await Promise.resolve()
        el.dispatchEvent(new MouseEvent('mouseenter'))
        expect(el.hasAttribute('open')).toBe(false) // 防抖期内未开
        vi.advanceTimersByTime(200)
        expect(el.hasAttribute('open')).toBe(true)
        el.dispatchEvent(
          new MouseEvent('mouseleave', { relatedTarget: document.body }),
        )
        vi.advanceTimersByTime(200)
        expect(el.hasAttribute('open')).toBe(false)
      } finally {
        vi.useRealTimers()
      }
    })

    it('trigger="focus"：聚焦打开、失焦关闭', async () => {
      const el = mount({ trigger: 'focus' })
      await Promise.resolve()
      el.dispatchEvent(new FocusEvent('focusin'))
      expect(el.hasAttribute('open')).toBe(true)
      el.dispatchEvent(new FocusEvent('focusout', { relatedTarget: document.body }))
      expect(el.hasAttribute('open')).toBe(false)
    })

    it('trigger="contextmenu"：右键打开并阻止默认菜单', async () => {
      const el = mount({ trigger: 'contextmenu' })
      await Promise.resolve()
      const btn = el.querySelector('button') as HTMLElement
      const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
      btn.dispatchEvent(e)
      expect(e.defaultPrevented).toBe(true)
      expect(el.hasAttribute('open')).toBe(true)
    })

    it('trigger 多选空格分隔："click focus" 两种方式都触发', async () => {
      const el = mount({ trigger: 'click focus' })
      await Promise.resolve()
      el.dispatchEvent(new FocusEvent('focusin'))
      expect(el.hasAttribute('open')).toBe(true)
      el.removeAttribute('open')
      ;(el.querySelector('button') as HTMLElement).click()
      expect(el.hasAttribute('open')).toBe(true)
    })
  })

  // —— ⑦-4 disabled ——

  describe('disabled 禁用', () => {
    it('disabled 时不弹气泡（点击 trigger 无效）', async () => {
      const el = mount({ disabled: '' })
      await Promise.resolve()
      ;(el.querySelector('button') as HTMLElement).click()
      expect(el.hasAttribute('open')).toBe(false)
    })

    it('disabled 同步 aria-disabled 到宿主', async () => {
      const el = mount({ disabled: '' })
      await Promise.resolve()
      expect(el.getAttribute('aria-disabled')).toBe('true')
      el.removeAttribute('disabled')
      await Promise.resolve()
      expect(el.hasAttribute('aria-disabled')).toBe(false)
    })
  })

  // —— ⑦-6 oas-open-change（detail 带 reason） ——

  describe('oas-open-change（detail.reason 来源）', () => {
    it('trigger 点击打开 → reason=trigger', async () => {
      const el = mount({})
      await Promise.resolve()
      const reasons: unknown[] = []
      el.addEventListener('oas-open-change', (e: Event) =>
        reasons.push((e as CustomEvent).detail),
      )
      ;(el.querySelector('button') as HTMLElement).click()
      expect(reasons).toEqual([{ open: true, reason: 'trigger' }])
    })

    it('trigger 再次点击关闭 → reason=trigger', async () => {
      const el = mount({})
      await Promise.resolve()
      ;(el.querySelector('button') as HTMLElement).click()
      const reasons: unknown[] = []
      el.addEventListener('oas-open-change', (e: Event) =>
        reasons.push((e as CustomEvent).detail),
      )
      ;(el.querySelector('button') as HTMLElement).click()
      expect(reasons).toEqual([{ open: false, reason: 'trigger' }])
    })

    it('ok 关闭 → reason=ok；cancel 关闭 → reason=cancel', async () => {
      const el = mount({ open: '' })
      await Promise.resolve()
      const reasons: string[] = []
      el.addEventListener('oas-open-change', (e: Event) =>
        reasons.push((e as CustomEvent).detail.reason),
      )
      ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
      expect(reasons).toEqual(['ok'])
      // 宿主直改 open 重开（reason=api 是设计内行为）后再点取消
      el.setAttribute('open', '')
      ;(el.shadowRoot!.querySelector('[part="cancel"]') as HTMLElement).click()
      expect(reasons).toEqual(['ok', 'api', 'cancel'])
    })

    it('Esc 关闭 → reason=esc', async () => {
      const el = mount({ open: '' })
      await Promise.resolve()
      const reasons: string[] = []
      el.addEventListener('oas-open-change', (e: Event) =>
        reasons.push((e as CustomEvent).detail.reason),
      )
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(el.hasAttribute('open')).toBe(false)
      expect(reasons).toEqual(['esc'])
    })

    it('外部点击关闭 → reason=outside', async () => {
      const el = mount({ open: '' })
      await Promise.resolve()
      const reasons: string[] = []
      el.addEventListener('oas-open-change', (e: Event) =>
        reasons.push((e as CustomEvent).detail.reason),
      )
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(el.hasAttribute('open')).toBe(false)
      expect(reasons).toEqual(['outside'])
    })

    it('宿主直接改 open 属性 → 派发 reason=api', async () => {
      const el = mount({})
      await Promise.resolve()
      const details: unknown[] = []
      el.addEventListener('oas-open-change', (e: Event) =>
        details.push((e as CustomEvent).detail),
      )
      el.setAttribute('open', '')
      expect(details).toEqual([{ open: true, reason: 'api' }])
    })

    it('show()/hide() 方法 → reason=api', async () => {
      const el = mount({})
      await Promise.resolve()
      const details: unknown[] = []
      el.addEventListener('oas-open-change', (e: Event) =>
        details.push((e as CustomEvent).detail),
      )
      el.show()
      el.hide()
      expect(details).toEqual([
        { open: true, reason: 'api' },
        { open: false, reason: 'api' },
      ])
    })

    it('重复同值 setAttribute 不重复派发', async () => {
      const el = mount({})
      await Promise.resolve()
      let count = 0
      el.addEventListener('oas-open-change', () => count++)
      el.setAttribute('open', '')
      el.setAttribute('open', '')
      expect(count).toBe(1)
    })
  })

  // —— ⑦-7 oas-ok / oas-cancel detail 补原生 event ——

  describe('oas-ok / oas-cancel detail 补 event', () => {
    it('点击 ok 的 detail.event 是触发 click 事件', async () => {
      const el = mount({ open: '' })
      await Promise.resolve()
      let ev: unknown
      el.addEventListener('oas-ok', (e: Event) => (ev = (e as CustomEvent).detail.event))
      const okBtn = el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement
      okBtn.click()
      expect(ev).toBeInstanceOf(Event)
      expect((ev as Event).type).toBe('click')
    })

    it('点击 cancel 的 detail.event 是触发 click 事件', async () => {
      const el = mount({ open: '' })
      await Promise.resolve()
      let ev: unknown
      el.addEventListener('oas-cancel', (e: Event) => (ev = (e as CustomEvent).detail.event))
      ;(el.shadowRoot!.querySelector('[part="cancel"]') as HTMLElement).click()
      expect((ev as Event).type).toBe('click')
    })
  })

  // —— ③ 焦点管理（恒定行为）+ role 升 alertdialog + aria 关联 ——

  describe('焦点管理与 ARIA', () => {
    it('面板 role="alertdialog"', async () => {
      const el = mount({ open: '' })
      await Promise.resolve()
      expect(pop(el).getAttribute('role')).toBe('alertdialog')
    })

    it('trigger 同步 aria-expanded + aria-controls 指向面板 id', async () => {
      const el = mount({})
      await Promise.resolve()
      const btn = el.querySelector('button') as HTMLElement
      const panelId = pop(el).id
      expect(panelId).not.toBe('')
      expect(btn.getAttribute('aria-controls')).toBe(panelId)
      expect(btn.getAttribute('aria-expanded')).toBe('false')
      btn.click()
      expect(btn.getAttribute('aria-expanded')).toBe('true')
    })

    it('面板 aria-labelledby 关联标题区（有标题时）', async () => {
      const el = mount({ open: '', title: '确认' })
      await Promise.resolve()
      const labelledby = pop(el).getAttribute('aria-labelledby')
      expect(labelledby).toBeTruthy()
      expect(el.shadowRoot!.getElementById(labelledby!)).not.toBeNull()
    })

    it('打开时焦点移入气泡（ok 按钮优先）', async () => {
      const el = mount({})
      await Promise.resolve()
      ;(el.querySelector('button') as HTMLElement).click()
      const okBtn = el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement
      expect(el.shadowRoot!.activeElement).toBe(okBtn)
    })

    it('关闭时焦点回 trigger', async () => {
      const el = mount({})
      await Promise.resolve()
      const btn = el.querySelector('button') as HTMLElement
      btn.click()
      ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
      expect(document.activeElement).toBe(btn)
    })

    it('actions 插槽替代内置按钮时聚焦插槽内首个可聚焦元素', async () => {
      const el = mount(
        {},
        '<button>删除</button><div slot="actions"><button data-x="custom">自定义</button></div>',
      )
      await Promise.resolve()
      ;(el.querySelector('button') as HTMLElement).click()
      const custom = el.querySelector('[data-x="custom"]') as HTMLElement
      expect(custom, 'slotted 自定义按钮存在').toBeTruthy()
      expect(document.activeElement, '焦点落在插槽内自定义按钮（light DOM）').toBe(custom)
      // 内置 ok 按钮已随 builtin-actions 隐藏，不持有焦点
      const builtin = el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement
      expect(el.shadowRoot!.activeElement ?? document.activeElement).not.toBe(builtin)
    })

    it('多实例 Esc 只关最顶层（打开栈序）', async () => {
      const a = mount({ open: '' })
      const b = mount({ open: '' })
      await Promise.resolve()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(a.hasAttribute('open'), '先开者保持').toBe(true)
      expect(b.hasAttribute('open'), '后开者（栈顶）关闭').toBe(false)
    })
  })

  // —— ⑦-1 ok-text / cancel-text ——

  describe('ok-text / cancel-text', () => {
    it('自定义按钮文案覆盖 locale', async () => {
      const el = mount({ open: '', 'ok-text': '删除', 'cancel-text': '再想想' })
      await Promise.resolve()
      expect(el.shadowRoot!.querySelector('[part="ok"]')!.textContent).toContain('删除')
      expect(el.shadowRoot!.querySelector('[part="cancel"]')!.textContent).toContain('再想想')
    })

    it('空值回落 locale 文案', async () => {
      const el = mount({ open: '' })
      await Promise.resolve()
      const ok = el.shadowRoot!.querySelector('[part="ok"]')!.textContent
      const cancel = el.shadowRoot!.querySelector('[part="cancel"]')!.textContent
      expect(ok).toBe(el['t']('popconfirm.ok'))
      expect(cancel).toBe(el['t']('popconfirm.cancel'))
    })
  })

  // —— ④ theme 语义主题 ——

  describe('theme 语义主题', () => {
    it('默认无 data-theme（default）', async () => {
      const el = mount({ open: '' })
      await Promise.resolve()
      expect(pop(el).hasAttribute('data-theme')).toBe(false)
    })

    it('theme="warning" 写入 data-theme', async () => {
      const el = mount({ open: '', theme: 'warning' })
      await Promise.resolve()
      expect(pop(el).getAttribute('data-theme')).toBe('warning')
    })

    it('theme="danger" 写入 data-theme，ok 按钮转危险色阶', async () => {
      const el = mount({ open: '', theme: 'danger' })
      await Promise.resolve()
      const ok = el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement
      expect(pop(el).getAttribute('data-theme')).toBe('danger')
      expect(ok.getAttribute('data-tone')).toBe('danger')
    })

    it('非法 theme 值回落 default（无 data-theme）', async () => {
      const el = mount({ open: '', theme: 'purple' })
      await Promise.resolve()
      expect(pop(el).hasAttribute('data-theme')).toBe(false)
    })

    it('theme 联动默认图标：default=警示三角、danger=感叹圆', async () => {
      const a = mount({ open: '' })
      await Promise.resolve()
      const iconA = a.shadowRoot!.querySelector('[part="icon"] svg path')!
      const b = mount({ open: '', theme: 'danger' })
      await Promise.resolve()
      const iconB = b.shadowRoot!.querySelector('[part="icon"] svg path')!
      expect(iconA.getAttribute('d')).not.toBe(iconB.getAttribute('d'))
    })
  })

  // —— ⑦-2 图标族 ——

  describe('图标族', () => {
    it('默认渲染语义图标（svg 存在）', async () => {
      const el = mount({ open: '' })
      await Promise.resolve()
      const icon = el.shadowRoot!.querySelector('[part="icon"]')!
      expect(icon.querySelector('svg')).not.toBeNull()
    })

    it('hide-icon 隐藏图标区', async () => {
      const el = mount({ open: '', 'hide-icon': '' })
      await Promise.resolve()
      expect((el.shadowRoot!.querySelector('[part="icon"]') as HTMLElement).hidden).toBe(true)
    })

    it('icon 插槽有内容时覆盖默认图标', async () => {
      const el = mount(
        { open: '' },
        '<button>删除</button><span slot="icon">⚠️</span>',
      )
      await Promise.resolve()
      const icon = el.shadowRoot!.querySelector('[part="icon"]') as HTMLElement
      const slot = icon.querySelector('slot[name="icon"]') as HTMLSlotElement
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(icon.querySelector('svg')).not.toBeNull() // 默认 svg 作为 slot fallback 保留在 DOM
    })
  })

  // —— ⑦-3 description 二级文案 ——

  describe('description 双通道', () => {
    it('description 属性渲染进描述区', async () => {
      const el = mount({ open: '', title: '确认', description: '删除后不可恢复' })
      await Promise.resolve()
      expect(el.shadowRoot!.querySelector('[part="description"]')!.textContent).toContain(
        '删除后不可恢复',
      )
    })

    it('description 插槽覆盖属性文案', async () => {
      const el = mount(
        { open: '', description: '属性描述' },
        '<button>删除</button><span slot="description">插槽描述</span>',
      )
      await Promise.resolve()
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>(
        'slot[name="description"]',
      )!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.description-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
    })

    it('无 description 无插槽：描述区不渲染文本', async () => {
      const el = mount({ open: '' })
      await Promise.resolve()
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.description-text')!
      expect(fallback.textContent).toBe('')
      expect(fallback.hidden).toBe(false)
    })
  })

  // —— ⑦-5 show-cancel ——

  describe('show-cancel', () => {
    it('默认显示取消按钮', async () => {
      const el = mount({ open: '' })
      await Promise.resolve()
      expect((el.shadowRoot!.querySelector('[part="cancel"]') as HTMLElement).hidden).toBe(
        false,
      )
    })

    it('show-cancel="false" 隐藏取消按钮（单按钮确认）', async () => {
      const el = mount({ open: '', 'show-cancel': 'false' })
      await Promise.resolve()
      expect((el.shadowRoot!.querySelector('[part="cancel"]') as HTMLElement).hidden).toBe(
        true,
      )
    })
  })

  // —— ② ok-loading 异步确认 ——

  describe('ok-loading 异步确认', () => {
    it('ok-loading 在场：ok 按钮 loading 态（aria-busy + data-loading）', async () => {
      const el = mount({ open: '', 'ok-loading': '' })
      await Promise.resolve()
      const ok = el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement
      expect(ok.getAttribute('aria-busy')).toBe('true')
      expect(ok.hasAttribute('data-loading')).toBe(true)
    })

    it('loading 中点击 ok：不派发 oas-ok、不关闭', async () => {
      const el = mount({ open: '', 'ok-loading': '' })
      await Promise.resolve()
      let fired = 0
      el.addEventListener('oas-ok', () => fired++)
      ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
      expect(fired).toBe(0)
      expect(el.hasAttribute('open')).toBe(true)
    })

    it('无 loading 点击 ok 后同步置 ok-loading：气泡不自动关', async () => {
      const el = mount({ open: '' })
      await Promise.resolve()
      el.addEventListener('oas-ok', () => el.setAttribute('ok-loading', ''))
      ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
      expect(el.hasAttribute('open'), '宿主同步置 loading 后不自动关').toBe(true)
      expect(el.hasAttribute('ok-loading')).toBe(true)
    })

    it('异步完成移除 ok-loading 后手动关闭：正常路径恢复', async () => {
      const el = mount({ open: '' })
      await Promise.resolve()
      const syncLoading = () => el.setAttribute('ok-loading', '')
      el.addEventListener('oas-ok', syncLoading)
      ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
      el.removeEventListener('oas-ok', syncLoading)
      el.removeAttribute('ok-loading')
      el.removeAttribute('open')
      expect(el.hasAttribute('open')).toBe(false)
      // 再次点击 ok 正常派发并关闭（loading 闸门已解除）
      el.setAttribute('open', '')
      let fired = 0
      el.addEventListener('oas-ok', () => fired++)
      ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
      expect(fired).toBe(1)
      expect(el.hasAttribute('open')).toBe(false)
    })

    it('移除 ok-loading 属性：按钮退出 loading 态', async () => {
      const el = mount({ open: '', 'ok-loading': '' })
      await Promise.resolve()
      el.removeAttribute('ok-loading')
      const ok = el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement
      expect(ok.hasAttribute('aria-busy')).toBe(false)
      expect(ok.hasAttribute('data-loading')).toBe(false)
    })
  })

  // —— ⑦-8 actions 插槽 + show()/hide() ——

  describe('actions 插槽 + show()/hide()', () => {
    it('actions 插槽有内容时隐藏内置按钮区', async () => {
      const el = mount(
        { open: '' },
        '<button>删除</button><div slot="actions"><button>知道了</button></div>',
      )
      await Promise.resolve()
      const builtin = el.shadowRoot!.querySelector('.builtin-actions') as HTMLElement
      expect(builtin.hidden).toBe(true)
    })

    it('无 actions 插槽内容时显示内置按钮区', async () => {
      const el = mount({ open: '' })
      await Promise.resolve()
      const builtin = el.shadowRoot!.querySelector('.builtin-actions') as HTMLElement
      expect(builtin.hidden).toBe(false)
    })

    it('show()/hide() 控制气泡显隐', async () => {
      const el = mount({})
      await Promise.resolve()
      el.show()
      expect(pop(el).getAttribute('aria-hidden')).toBe('false')
      el.hide()
      expect(pop(el).getAttribute('aria-hidden')).toBe('true')
    })

    it('show() 打开时派发 oas-open-change（reason=api）', async () => {
      const el = mount({})
      await Promise.resolve()
      let detail: unknown
      el.addEventListener('oas-open-change', (e: Event) => (detail = (e as CustomEvent).detail))
      el.show()
      expect(detail).toEqual({ open: true, reason: 'api' })
    })
  })

  // —— title 吸收（消除宿主原生 tooltip）——

  describe('title 吸收（消除宿主原生 tooltip）', () => {
    it('挂载后宿主不再残留 title 属性，标题照常渲染进气泡标题区', async () => {
      const el = mount({ open: '', title: '确认删除？' })
      await Promise.resolve()
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('确认删除？')
    })

    it('吸收触发的二次 update 幂等（标题不丢失）', async () => {
      const el = mount({ open: '', title: '确认删除？' })
      await Promise.resolve()
      el.setAttribute('placement', 'bottom') // 触发二次 update
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('确认删除？')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('运行时改 title 属性：新值吸收渲染，宿主仍无残留', async () => {
      const el = mount({ open: '', title: '旧标题' })
      await Promise.resolve()
      el.setAttribute('title', '新确认文案')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('新确认文案')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title="" 清空标题（属性在场=宿主意图）', async () => {
      const el = mount({ open: '', title: '确认删除？' })
      await Promise.resolve()
      el.setAttribute('title', '')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('水合恢复：快照标题区有文本时恢复缓存，水合后标题不丢失', () => {
      const ref = new OASPopconfirm()
      ref.setAttribute('title', '水合确认')
      document.body.appendChild(ref)
      const snap = ref.shadowRoot!.innerHTML
      ref.remove()

      const el = new OASPopconfirm()
      el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-popconfirm" data-oas-ssr-v="1">${snap}`
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('水合确认')
      expect(el.hasAttribute('title')).toBe(false)
      el.remove()
    })
  })

  // —— title 双通道（slot 富内容覆盖属性文本）——

  describe('title 双通道（slot 富内容覆盖属性文本）', () => {
    it('slot 有内容时覆盖属性文本', async () => {
      const el = new OASPopconfirm()
      el.setAttribute('open', '')
      el.setAttribute('title', '属性文案')
      el.innerHTML = '<button>删除</button><span slot="title">插槽文案</span>'
      document.body.appendChild(el)
      await Promise.resolve()
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      // 宿主 title 仍被吸收（吸收状态机不变）
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('仅 slot 无属性：标题区渲染 slot 内容且不隐藏', async () => {
      const el = new OASPopconfirm()
      el.setAttribute('open', '')
      el.innerHTML = '<button>删除</button><span slot="title">插槽文案</span>'
      document.body.appendChild(el)
      await Promise.resolve()
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('双空（无 title 无 slot）：标题区不渲染文本（兜底为空、不隐藏）', async () => {
      const el = new OASPopconfirm()
      el.setAttribute('open', '')
      el.innerHTML = '<button>删除</button>'
      document.body.appendChild(el)
      await Promise.resolve()
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })
  })
})
