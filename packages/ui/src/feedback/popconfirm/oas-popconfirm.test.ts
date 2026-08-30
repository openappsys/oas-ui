import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASPopconfirm } from './index.js'

function mount(attrs: Record<string, string> = {}): OASPopconfirm {
  const el = new OASPopconfirm()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<button>删除</button>`
  document.body.appendChild(el)
  return el
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
    const pop = el.shadowRoot!.querySelector('[part="popover"]')!
    expect(pop).not.toBeNull()
    expect(pop.textContent).toContain('确认删除？')
    expect(el.shadowRoot!.querySelector('[part="ok"]')).not.toBeNull()
  })

  it('点击确定派发 oas-ok 并关闭，detail.source 指向本实例（修复 shadow retarget）', async () => {
    const el = mount({ open: '', title: '确认' })
    await Promise.resolve()
    let detail: unknown
    el.addEventListener('oas-ok', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect((detail as { source: unknown }).source).toBe(el)
    expect(el.shadowRoot!.querySelector('[part="popover"]')!.getAttribute('aria-hidden')).toBe(
      'true',
    )
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
    expect(el.shadowRoot!.querySelector('[part="popover"]')!.getAttribute('aria-hidden')).toBe(
      'false',
    )
  })

  it('键盘/脚本激活 ok（合成 click）后 open 不被误恢复', async () => {
    // element.click() 派发 composed=false 的 click，跨 shadow boundary 时浏览器会把
    // e.target retarget 成 host 自身；组件必须用 composedPath()[0] 判断，避免 toggle 误翻转。
    const el = mount({ open: '', title: '确认' })
    await Promise.resolve()
    const okBtn = el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement
    okBtn.click()
    expect(el.hasAttribute('open')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="popover"]')!.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })

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
      el.setAttribute('position', 'bottom') // 触发二次 update
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
