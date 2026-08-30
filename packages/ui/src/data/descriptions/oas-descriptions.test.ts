import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASDescriptions, OASDescriptionsItem } from './index.js'

function mount(attrs: Record<string, string> = {}): OASDescriptions {
  const el = new OASDescriptions()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `
    <oas-descriptions-item label="姓名"><span>张三</span></oas-descriptions-item>
    <oas-descriptions-item label="年龄"><span>30</span></oas-descriptions-item>
  `
  document.body.appendChild(el)
  return el
}

describe('OASDescriptions', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染标签与内容', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="items"]')).not.toBeNull()
    const items = el.querySelectorAll('oas-descriptions-item')
    expect(items.length).toBe(2)
  })

  it('column 属性生效', () => {
    const el = mount({ column: '2' })
    expect(el.shadowRoot!.querySelector('[part="items"]')!.getAttribute('data-column')).toBe('2')
  })

  describe('title 吸收（消除宿主原生 tooltip）', () => {
    function titleEl(el: OASDescriptions): HTMLElement {
      return el.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
    }

    it('挂载后宿主不再残留 title 属性，标题渲染进标题区', () => {
      const el = mount({ title: '基本信息' })
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(titleEl(el).textContent).toBe('基本信息')
    })

    it('吸收触发的二次 update 幂等（标题不丢失、无死循环）', () => {
      const el = mount({ title: '基本信息' })
      el.setAttribute('data-x', '1')
      expect(titleEl(el).textContent).toBe('基本信息')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('运行时改 title 属性：新值吸收渲染，宿主仍无残留', () => {
      const el = mount({ title: '旧标题' })
      el.setAttribute('title', '新标题')
      expect(titleEl(el).textContent).toBe('新标题')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title="" 清空标题（属性在场=宿主意图）', () => {
      const el = mount({ title: '基本信息' })
      el.setAttribute('title', '')
      expect(titleEl(el).textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('水合从快照标题区恢复 title 缓存（宿主无 title，标题不丢）', () => {
      const el = new OASDescriptions()
      el.shadowRoot!.innerHTML =
        '<meta data-oas-ssr="oas-descriptions" data-oas-ssr-v="1"><style></style>' +
        '<div class="title" part="title">快照标题</div>' +
        '<div class="items" part="items"><slot></slot></div>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      expect(el.hasAttribute('title')).toBe(false)
      expect(titleEl(el).textContent).toBe('快照标题')
    })
  })

  describe('title 双通道（slot="title" 富内容覆盖属性文本）', () => {
    it('slot 有内容时覆盖属性文本（兜底隐藏、插槽渲染、属性仍被吸收）', () => {
      const el = new OASDescriptions()
      el.setAttribute('title', '属性标题')
      el.innerHTML =
        '<oas-descriptions-item label="a">1</oas-descriptions-item><b slot="title">富标题</b>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      // 属性仍被吸收缓存（兜底隐而不删），宿主无残留原生悬浮提示
      expect(fallback.textContent).toBe('属性标题')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('仅 slot 无属性：标题区渲染插槽内容', () => {
      const el = new OASDescriptions()
      el.innerHTML =
        '<oas-descriptions-item label="a">1</oas-descriptions-item><span slot="title">插槽标题</span>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('双空（无 title 无 slot）：标题区保持既有行为（兜底为空、不隐藏）', () => {
      const el = mount()
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.textContent).toBe('')
      expect(fallback.hidden).toBe(false)
    })

    it('动态移除 slot 内容后回落属性文本', async () => {
      const el = new OASDescriptions()
      el.setAttribute('title', '属性标题')
      el.innerHTML =
        '<oas-descriptions-item label="a">1</oas-descriptions-item><span slot="title">插槽标题</span>'
      document.body.appendChild(el)
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(true)
      const node = el.querySelector('span[slot="title"]')!
      el.removeChild(node)
      await new Promise((r) => setTimeout(r, 0))
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('属性标题')
    })

    it('水合后 slot 内容显示正常（快照含 slot 结构，titleCache 恢复不影响显示）', () => {
      const el = new OASDescriptions()
      el.shadowRoot!.innerHTML =
        '<meta data-oas-ssr="oas-descriptions" data-oas-ssr-v="1"><style></style>' +
        '<div class="title" part="title"><slot name="title"><span class="title-text">快照标题</span></slot></div>' +
        '<div class="items" part="items"><slot></slot></div>'
      const rich = document.createElement('b')
      rich.setAttribute('slot', 'title')
      rich.textContent = '富标题'
      el.appendChild(rich)
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      // 水合恢复 titleCache（快照兜底文本），但 slot 有内容 → 以插槽为准
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(true)
      expect(fallback.textContent).toBe('快照标题')
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      expect(slot.assignedNodes()).toContain(rich)
      expect(el.hasAttribute('title')).toBe(false)
    })
  })
})
