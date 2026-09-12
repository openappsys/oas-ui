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
      el.innerHTML = '<oas-descriptions-item label="a">1</oas-descriptions-item><b slot="title">富标题</b>'
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
      el.innerHTML = '<oas-descriptions-item label="a">1</oas-descriptions-item><span slot="title">插槽标题</span>'
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
      el.innerHTML = '<oas-descriptions-item label="a">1</oas-descriptions-item><span slot="title">插槽标题</span>'
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

  describe('布局与形态（layout / bordered / colon / size / extra）', () => {
    it('默认 horizontal：下发 row 方向与间距变量（破坏性变更：horizontal 为默认布局）', () => {
      const el = mount()
      expect(el.style.getPropertyValue('--oas-desc-layout-dir')).toBe('row')
      expect(el.style.getPropertyValue('--oas-desc-item-gap')).toBe('var(--oas-space-2)')
      expect(el.getAttribute('data-layout')).toBe('horizontal')
    })

    it('layout="vertical"：下发 column 方向与纵向间距变量', () => {
      const el = mount({ layout: 'vertical' })
      expect(el.style.getPropertyValue('--oas-desc-layout-dir')).toBe('column')
      expect(el.style.getPropertyValue('--oas-desc-item-gap')).toBe('var(--oas-space-1)')
      expect(el.getAttribute('data-layout')).toBe('vertical')
    })

    it('bordered：下发网格线宽与 label 底色（token）变量；默认无边框', () => {
      const plain = mount()
      expect(plain.style.getPropertyValue('--oas-desc-cell-border')).toBe('0px')
      expect(plain.style.getPropertyValue('--oas-desc-label-bg')).toBe('')
      const el = mount({ bordered: '' })
      expect(el.style.getPropertyValue('--oas-desc-cell-border')).toBe('1px')
      expect(el.style.getPropertyValue('--oas-desc-label-bg')).toBe('var(--oas-color-bg-elevated)')
      // 样式表含网格成表规则（网格线走 border token，含 dark 变体）
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(style).toContain(':host([bordered]) .items')
    })

    it('colon：下发冒号变量；默认无冒号', () => {
      expect(mount().style.getPropertyValue('--oas-desc-colon')).toBe('')
      const el = mount({ colon: '' })
      expect(el.style.getPropertyValue('--oas-desc-colon')).toBe(`':'`)
    })

    it('size 三档：small/large 下发字号变量；medium/缺省/非法值不限制字号（跟随外层）', () => {
      expect(mount({ size: 'small' }).style.getPropertyValue('--oas-desc-font-size')).toBe('var(--oas-font-size-sm)')
      expect(mount({ size: 'large' }).style.getPropertyValue('--oas-desc-font-size')).toBe('var(--oas-font-size-lg)')
      expect(mount().style.getPropertyValue('--oas-desc-font-size')).toBe('')
      expect(mount({ size: 'medium' }).style.getPropertyValue('--oas-desc-font-size')).toBe('')
      expect(mount({ size: 'weird' }).style.getPropertyValue('--oas-desc-font-size')).toBe('')
    })

    it('size 在 bordered 下同步单元格内边距变量；非边框模式保持零内边距（网格 gap 负责间距）', () => {
      const el = mount({ bordered: '', size: 'large' })
      expect(el.style.getPropertyValue('--oas-desc-cell-py')).toBe('var(--oas-space-3)')
      expect(el.style.getPropertyValue('--oas-desc-cell-px')).toBe('var(--oas-space-4)')
      expect(mount({ bordered: '' }).style.getPropertyValue('--oas-desc-cell-py')).toBe('var(--oas-space-2)')
      expect(mount().style.getPropertyValue('--oas-desc-cell-py')).toBe('')
    })

    it('未设置 column 属性时不写内联列数变量（宿主可经 CSS 变量覆写），设置时写入', () => {
      const el = mount()
      const items = el.shadowRoot!.querySelector<HTMLElement>('[part="items"]')!
      expect(items.style.getPropertyValue('--oas-desc-columns')).toBe('')
      const fixed = mount({ column: '2' })
      expect(
        fixed.shadowRoot!.querySelector<HTMLElement>('[part="items"]')!.style.getPropertyValue('--oas-desc-columns'),
      ).toBe('2')
    })

    it('slot="extra"：标题同排操作区存在且插槽有内容', () => {
      const el = new OASDescriptions()
      el.setAttribute('title', '基本信息')
      el.innerHTML =
        '<oas-descriptions-item label="a">1</oas-descriptions-item>' +
        '<oas-button slot="extra" size="small">编辑</oas-button>'
      document.body.appendChild(el)
      const extra = el.shadowRoot!.querySelector<HTMLElement>('[part="extra"]')!
      const slot = extra.querySelector<HTMLSlotElement>('slot[name="extra"]')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
    })
  })
})

describe('OASDescriptionsItem', () => {
  function mountItem(attrs: Record<string, string> = {}, html = '<span>张三</span>'): OASDescriptionsItem {
    const el = new OASDescriptionsItem()
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.innerHTML = html
    document.body.appendChild(el)
    return el
  }

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('label 属性写入兜底文本', () => {
    const el = mountItem({ label: '姓名' })
    const fallback = el.shadowRoot!.querySelector<HTMLElement>('.label-text')!
    expect(fallback.textContent).toBe('姓名')
    expect(fallback.hidden).toBe(false)
  })

  it('label 为空时无 data-has-label（冒号不悬空）', () => {
    expect(mountItem().hasAttribute('data-has-label')).toBe(false)
    expect(mountItem({ label: '姓名' }).hasAttribute('data-has-label')).toBe(true)
  })

  it('slot="label" 覆盖属性文本（兜底隐藏、插槽渲染、属性仍在）', () => {
    const el = mountItem({ label: '属性标签' }, '<b slot="label">富标签</b><span>内容</span>')
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="label"]')!
    const fallback = el.shadowRoot!.querySelector<HTMLElement>('.label-text')!
    expect(slot.assignedNodes().length).toBeGreaterThan(0)
    expect(fallback.hidden).toBe(true)
    expect(fallback.textContent).toBe('属性标签')
  })

  it('slot 有内容时 data-has-label 成立（无属性文本）', () => {
    const el = mountItem({}, '<i slot="label">icon</i><span>内容</span>')
    expect(el.hasAttribute('data-has-label')).toBe(true)
  })

  it('动态移除 slot 内容后回落属性文本', async () => {
    const el = mountItem({ label: '属性标签' }, '<span slot="label">插槽标签</span><span>内容</span>')
    const fallback = el.shadowRoot!.querySelector<HTMLElement>('.label-text')!
    expect(fallback.hidden).toBe(true)
    el.removeChild(el.querySelector('span[slot="label"]')!)
    await new Promise((r) => setTimeout(r, 0))
    expect(fallback.hidden).toBe(false)
    expect(fallback.textContent).toBe('属性标签')
  })

  it('span：正整数 N 下发 grid-column 跨列并镜像 data-span', () => {
    const el = mountItem({ span: '2' })
    expect(el.style.getPropertyValue('grid-column')).toBe('span 2')
    expect(el.getAttribute('data-span')).toBe('2')
  })

  it('span 缺省/0/非法值回到单格（移除内联跨列）', () => {
    expect(mountItem().style.getPropertyValue('grid-column')).toBe('')
    expect(mountItem({ span: '0' }).style.getPropertyValue('grid-column')).toBe('')
    expect(mountItem({ span: '-3' }).style.getPropertyValue('grid-column')).toBe('')
    expect(mountItem({ span: 'abc' }).style.getPropertyValue('grid-column')).toBe('')
    expect(mountItem({ span: 'abc' }).getAttribute('data-span')).toBe('1')
  })

  it('运行时改 span 属性增量同步', () => {
    const el = mountItem({ span: '2' })
    el.setAttribute('span', '3')
    expect(el.style.getPropertyValue('grid-column')).toBe('span 3')
    el.removeAttribute('span')
    expect(el.style.getPropertyValue('grid-column')).toBe('')
  })

  it('水合兼容：旧版快照（label 文本直写在 label 区）接管后文本保留', () => {
    const el = new OASDescriptionsItem()
    el.shadowRoot!.innerHTML =
      '<meta data-oas-ssr="oas-descriptions-item" data-oas-ssr-v="1"><style></style>' +
      '<div class="label" part="label">姓名</div>' +
      '<div class="content" part="content"><slot></slot></div>'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.textContent).toBe('姓名')
    expect(el.shadowRoot!.querySelector<HTMLElement>('.label-text')).toBeNull()
  })
})
