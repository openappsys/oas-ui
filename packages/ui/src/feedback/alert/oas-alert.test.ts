import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASAlert } from './index.js'

function mount(attrs: Record<string, string> = {}): OASAlert {
  const el = new OASAlert()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `这是提示内容`
  document.body.appendChild(el)
  return el
}

describe('OASAlert', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染内容，type 默认 info', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    expect(el.textContent).toContain('这是提示内容')
    expect(el.shadowRoot!.querySelector('[part="box"]')!.getAttribute('data-type')).toBe('info')
  })

  it('error 类型 role=alert', () => {
    const el = mount({ type: 'error' })
    expect(el.shadowRoot!.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('closeable 显示关闭按钮并派发 oas-close', async () => {
    const el = mount({ closeable: '' })
    let close = 0
    el.addEventListener('oas-close', () => close++)
    ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
    expect(close).toBe(1)
    expect(el.hidden).toBe(true)
  })

  it('title 属性渲染标题', () => {
    const el = mount({ title: '警告' })
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('警告')
  })

  describe('title 吸收（消除宿主原生 tooltip）', () => {
    it('挂载后宿主不再残留 title 属性，标题照常渲染进标题区', () => {
      const el = mount({ title: '警告' })
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('警告')
    })

    it('吸收触发的二次 update 幂等（标题不丢失、无死循环）', () => {
      const el = mount({ title: '警告' })
      el.setAttribute('type', 'error') // 触发二次 update
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('警告')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('运行时改 title 属性：新值吸收渲染，宿主仍无残留', () => {
      const el = mount({ title: '旧标题' })
      el.setAttribute('title', '新警告')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('新警告')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title="" 清空标题（属性在场=宿主意图）', () => {
      const el = mount({ title: '警告' })
      el.setAttribute('title', '')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('水合恢复：快照标题区有文本时恢复缓存，水合后标题不丢失', () => {
      const ref = new OASAlert()
      ref.setAttribute('title', '水合标题')
      document.body.appendChild(ref)
      const snap = ref.shadowRoot!.innerHTML
      ref.remove()

      const el = new OASAlert()
      el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-alert" data-oas-ssr-v="1">${snap}`
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('水合标题')
      expect(el.hasAttribute('title')).toBe(false)
      el.remove()
    })
  })

  describe('title 双通道（slot 富内容覆盖属性文本）', () => {
    it('slot 有内容时覆盖属性文本', () => {
      const el = new OASAlert()
      el.setAttribute('title', '属性标题')
      el.innerHTML = '<span slot="title">插槽标题</span><p>正文</p>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      // 宿主 title 仍被吸收（吸收状态机不变）
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('仅 slot 无属性：标题区渲染 slot 内容且不隐藏', () => {
      const el = new OASAlert()
      el.innerHTML = '<span slot="title">插槽标题</span><p>正文</p>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('双空（无 title 无 slot）：标题区不渲染文本（兜底为空、不隐藏）', () => {
      const el = new OASAlert()
      el.innerHTML = '<p>正文</p>'
      document.body.appendChild(el)
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('动态移除 slot 内容后回落属性文本', async () => {
      const el = new OASAlert()
      el.setAttribute('title', '属性标题')
      el.innerHTML = '<span slot="title">插槽标题</span>'
      document.body.appendChild(el)
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
