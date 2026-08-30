import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASList, OASListItem } from './index.js'

function mount(): OASList {
  const el = new OASList()
  el.innerHTML = `
    <oas-list-item title="条目一"><span>描述</span></oas-list-item>
    <oas-list-item title="条目二"></oas-list-item>
  `
  document.body.appendChild(el)
  return el
}

describe('OASList', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('渲染列表项', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="list"]')).not.toBeNull()
    expect(el.querySelectorAll('oas-list-item').length).toBe(2)
  })

  it('bordered 时加边框', () => {
    const el = mount()
    el.setAttribute('bordered', '')
    expect(el.shadowRoot!.querySelector('[part="list"]')!.getAttribute('data-bordered')).toBe(
      'true',
    )
  })

  it('loading 时显示骨架占位、隐藏列表项', () => {
    const el = mount()
    el.setAttribute('loading', '')
    const skeleton = el.shadowRoot!.querySelector('[part="skeleton"]')!
    const body = el.shadowRoot!.querySelector('[part="body"]')!
    expect(skeleton.hasAttribute('hidden')).toBe(false)
    expect(skeleton.querySelectorAll('.sk-line').length).toBe(3)
    expect(body.hasAttribute('hidden')).toBe(true)
  })

  it('empty 属性强制显示空态', () => {
    const el = new OASList()
    el.setAttribute('empty', '')
    document.body.appendChild(el)
    const empty = el.shadowRoot!.querySelector('[part="empty"]')!
    const body = el.shadowRoot!.querySelector('[part="body"]')!
    expect(empty.hasAttribute('hidden')).toBe(false)
    expect(body.hasAttribute('hidden')).toBe(true)
  })

  it('无子项时自动显示空态', () => {
    const el = new OASList()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.hasAttribute('hidden')).toBe(false)
  })

  it('loading 优先于空态', () => {
    const el = new OASList()
    el.setAttribute('empty', '')
    el.setAttribute('loading', '')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="skeleton"]')!.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('empty-text 自定义空态文案', () => {
    const el = new OASList()
    el.setAttribute('empty', '')
    el.setAttribute('empty-text', '没有更多数据了')
    document.body.appendChild(el)
    expect(el.shadowRoot!.textContent).toContain('没有更多数据了')
  })

  it('locale：默认空态文案随 setLocale 切换', () => {
    const el = new OASList()
    el.setAttribute('empty', '')
    document.body.appendChild(el)
    expect(el.shadowRoot!.textContent).toContain('暂无数据')

    setLocale(en)
    expect(el.shadowRoot!.textContent).toContain('No data')

    setLocale('zh-CN')
    expect(el.shadowRoot!.textContent).toContain('暂无数据')
  })

  it('locale：empty-text 属性覆盖 locale 默认文案', () => {
    const el = new OASList()
    el.setAttribute('empty', '')
    el.setAttribute('empty-text', '没有更多数据了')
    document.body.appendChild(el)
    expect(el.shadowRoot!.textContent).toContain('没有更多数据了')

    setLocale(en)
    expect(el.shadowRoot!.textContent).toContain('没有更多数据了')
  })

  describe('OASListItem title 吸收（消除宿主原生 tooltip）', () => {
    function mountItem(attrs: Record<string, string> = {}): OASListItem {
      const item = new OASListItem()
      for (const [k, v] of Object.entries(attrs)) item.setAttribute(k, v)
      document.body.appendChild(item)
      return item
    }

    function titleEl(el: OASListItem): HTMLElement {
      return el.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
    }

    it('挂载后宿主不再残留 title 属性，标题渲染进标题区', () => {
      const el = mountItem({ title: '条目一' })
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(titleEl(el).textContent).toBe('条目一')
    })

    it('吸收触发的二次 update 幂等（标题不丢失、无死循环）', () => {
      const el = mountItem({ title: '条目一' })
      el.setAttribute('data-x', '1')
      expect(titleEl(el).textContent).toBe('条目一')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('运行时改 title 属性：新值吸收渲染，宿主仍无残留', () => {
      const el = mountItem({ title: '旧标题' })
      el.setAttribute('title', '新标题')
      expect(titleEl(el).textContent).toBe('新标题')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title="" 清空标题（属性在场=宿主意图）', () => {
      const el = mountItem({ title: '条目一' })
      el.setAttribute('title', '')
      expect(titleEl(el).textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('水合从快照标题区恢复 title 缓存（宿主无 title，标题不丢）', () => {
      const el = new OASListItem()
      el.shadowRoot!.innerHTML =
        '<meta data-oas-ssr="oas-list-item" data-oas-ssr-v="1"><style></style>' +
        '<div class="main" part="main"><div class="title" part="title">快照标题</div>' +
        '<div class="desc" part="desc"><slot name="description"><slot></slot></slot></div></div>' +
        '<div class="extra"><slot name="extra"></slot></div>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      expect(el.hasAttribute('title')).toBe(false)
      expect(titleEl(el).textContent).toBe('快照标题')
    })
  })

  describe('OASListItem title 双通道（slot="title" 富内容覆盖属性文本）', () => {
    it('slot 有内容时覆盖属性文本（兜底隐藏、插槽渲染、属性仍被吸收）', () => {
      const el = new OASListItem()
      el.setAttribute('title', '属性标题')
      el.innerHTML = '<span slot="title">富标题</span><span>描述</span>'
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
      const el = new OASListItem()
      el.innerHTML = '<span slot="title">插槽标题</span>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('双空（无 title 无 slot）：标题区保持既有行为（兜底为空、不隐藏）', () => {
      const el = new OASListItem()
      document.body.appendChild(el)
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.textContent).toBe('')
      expect(fallback.hidden).toBe(false)
    })

    it('动态移除 slot 内容后回落属性文本', async () => {
      const el = new OASListItem()
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

    it('水合后 slot 内容显示正常（快照含 slot 结构，titleCache 恢复不影响显示）', () => {
      const el = new OASListItem()
      el.shadowRoot!.innerHTML =
        '<meta data-oas-ssr="oas-list-item" data-oas-ssr-v="1"><style></style>' +
        '<div class="main" part="main"><div class="title" part="title"><slot name="title"><span class="title-text">快照标题</span></slot></div>' +
        '<div class="desc" part="desc"><slot name="description"><slot></slot></slot></div></div>' +
        '<div class="extra"><slot name="extra"></slot></div>'
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
