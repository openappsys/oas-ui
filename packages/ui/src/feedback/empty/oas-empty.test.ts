import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASEmpty } from './index.js'

describe('OASEmpty', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染默认描述文案', () => {
    const el = new OASEmpty()
    document.body.appendChild(el)
    expect(el.shadowRoot!.textContent).toContain('暂无数据')
  })

  it('description 属性自定义文案', () => {
    const el = new OASEmpty()
    el.setAttribute('description', '没有更多了')
    document.body.appendChild(el)
    expect(el.shadowRoot!.textContent).toContain('没有更多了')
  })

  it('渲染原创插画区域', () => {
    const el = new OASEmpty()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="image"]')).not.toBeNull()
  })

  it('illustration 属性（SVG 标记）替换默认插画', () => {
    const el = new OASEmpty()
    el.setAttribute('illustration', '<svg id="custom"><circle r="10"/></svg>')
    document.body.appendChild(el)
    const content = el.shadowRoot!.querySelector<HTMLElement>('[part="illustration"]')!
    expect(content.querySelector('#custom')).not.toBeNull()
    expect(content.querySelector('rect')).toBeNull()
    expect(content.getAttribute('data-default')).toBeNull()
  })

  it('illustration 属性（图片 URL）渲染 img', () => {
    const el = new OASEmpty()
    el.setAttribute('illustration', 'https://example.com/empty.png')
    document.body.appendChild(el)
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('[part="illustration"] img')!
    expect(img.getAttribute('src')).toBe('https://example.com/empty.png')
    expect(img.getAttribute('alt')).toBe('')
  })

  it('slot="illustration" 优先级高于 illustration 属性', async () => {
    const el = new OASEmpty()
    el.setAttribute('illustration', '<svg id="attr-illu"></svg>')
    el.innerHTML = '<svg slot="illustration" id="slot-illu"></svg>'
    document.body.appendChild(el)
    await new Promise((r) => setTimeout(r, 0))
    const content = el.shadowRoot!.querySelector<HTMLElement>('[part="illustration"]')!
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="illustration"]')!
    expect(content.hidden).toBe(true)
    expect(slot.hidden).toBe(false)
    expect(slot.assignedNodes().length).toBeGreaterThan(0)
  })

  it('无 slot 时使用 illustration 属性', async () => {
    const el = new OASEmpty()
    el.setAttribute('illustration', '<svg id="attr-illu"></svg>')
    document.body.appendChild(el)
    await new Promise((r) => setTimeout(r, 0))
    const content = el.shadowRoot!.querySelector<HTMLElement>('[part="illustration"]')!
    expect(content.hidden).toBe(false)
    expect(content.querySelector('#attr-illu')).not.toBeNull()
  })

  it('image-size 控制插画尺寸', () => {
    const el = new OASEmpty()
    el.setAttribute('image-size', '128')
    document.body.appendChild(el)
    const image = el.shadowRoot!.querySelector<HTMLElement>('.image')!
    expect(image.style.width).toBe('128px')
    expect(image.style.height).toBe('128px')
  })

  it('image-size 缺省为 96px（size=medium）', () => {
    const el = new OASEmpty()
    document.body.appendChild(el)
    const image = el.shadowRoot!.querySelector<HTMLElement>('.image')!
    expect(image.style.width).toBe('96px')
    expect(image.style.height).toBe('96px')
  })

  it('size 档位联动媒体尺寸（small 72 / large 120），image-size 优先', () => {
    const small = new OASEmpty()
    small.setAttribute('size', 'small')
    document.body.appendChild(small)
    expect(small.shadowRoot!.querySelector<HTMLElement>('.image')!.style.width).toBe('72px')

    const large = new OASEmpty()
    large.setAttribute('size', 'large')
    document.body.appendChild(large)
    expect(large.shadowRoot!.querySelector<HTMLElement>('.image')!.style.width).toBe('120px')

    const both = new OASEmpty()
    both.setAttribute('size', 'large')
    both.setAttribute('image-size', '150')
    document.body.appendChild(both)
    expect(both.shadowRoot!.querySelector<HTMLElement>('.image')!.style.width).toBe('150px')
  })

  describe('title 标题层（属性吸收 + slot 双通道）', () => {
    function mount(attrs: Record<string, string> = {}): OASEmpty {
      const el = new OASEmpty()
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      document.body.appendChild(el)
      return el
    }

    it('挂载后宿主不残留 title，标题渲染进标题区', () => {
      const el = mount({ title: '列表为空' })
      expect(el.hasAttribute('title')).toBe(false)
      const part = el.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
      expect(part.textContent).toBe('列表为空')
      expect(el.shadowRoot!.querySelector<HTMLElement>('.title')!.hidden).toBe(false)
    })

    it('无标题时标题层隐藏（不占布局）', () => {
      const el = new OASEmpty()
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('.title')!.hidden).toBe(true)
    })

    it('title="" 清空标题并隐藏标题层', () => {
      const el = mount({ title: '旧标题' })
      el.setAttribute('title', '')
      expect(el.hasAttribute('title')).toBe(false)
      expect(el.shadowRoot!.querySelector<HTMLElement>('.title')!.hidden).toBe(true)
    })

    it('运行时改 title 吸收渲染', () => {
      const el = mount({ title: '旧标题' })
      el.setAttribute('title', '新标题')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('新标题')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('slot="title" 富内容覆盖属性文案', async () => {
      const el = mount({ title: '属性标题' })
      el.innerHTML = '<b slot="title">插槽标题</b>'
      await new Promise((r) => setTimeout(r, 0))
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      expect(el.hasAttribute('title')).toBe(false)
      expect(el.shadowRoot!.querySelector<HTMLElement>('.title')!.hidden).toBe(false)
    })

    it('动态移除 slot 内容后回落属性文本', async () => {
      const el = mount({ title: '属性标题' })
      el.innerHTML = '<b slot="title">插槽标题</b>'
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(true)
      const node = el.querySelector('b[slot="title"]')!
      el.removeChild(node)
      await new Promise((r) => setTimeout(r, 0))
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('属性标题')
    })
  })

  describe('description 富内容（默认 slot 覆盖属性）', () => {
    function mount(attrs: Record<string, string> = {}, html = ''): OASEmpty {
      const el = new OASEmpty()
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      if (html) el.innerHTML = html
      document.body.appendChild(el)
      return el
    }

    it('默认 slot 有真实内容时隐藏 description 属性区', async () => {
      const el = mount({ description: '属性描述' }, '<p>富内容描述</p>')
      await new Promise((r) => setTimeout(r, 0))
      const desc = el.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot:not([name])')!
      expect(desc.hidden).toBe(true)
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
    })

    it('纯空白文本不算富内容（仍走属性通道）', async () => {
      const el = mount({ description: '属性描述' }, '   \n  ')
      await new Promise((r) => setTimeout(r, 0))
      const desc = el.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
      expect(desc.hidden).toBe(false)
      expect(desc.textContent).toBe('属性描述')
    })

    it('动态移除富内容后回落属性文案', async () => {
      const el = mount({ description: '属性描述' }, '<p>富内容描述</p>')
      const desc = el.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
      expect(desc.hidden).toBe(true)
      const node = el.querySelector('p')!
      el.removeChild(node)
      await new Promise((r) => setTimeout(r, 0))
      expect(desc.hidden).toBe(false)
      expect(desc.textContent).toBe('属性描述')
    })
  })

  describe('size / align / variant 档位样式（宿主属性选择器，不落 data-* 属性）', () => {
    it('样式按宿主原始属性选择器命中档位', () => {
      const el = new OASEmpty()
      document.body.appendChild(el)
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toContain(":host([size='small'])")
      expect(css).toContain(":host([size='large'])")
      expect(css).toContain(":host([align='start']) .body")
      expect(css).toContain(":host([align='end']) .body")
      expect(css).toContain(":host([variant='outlined'])")
      expect(css).toContain(":host([variant='filled'])")
    })

    it('挂载不写 data-size/data-align/data-variant 宿主属性（SSR 快照宿主开标签稳定）', () => {
      const el = new OASEmpty()
      el.setAttribute('size', 'small')
      el.setAttribute('align', 'end')
      el.setAttribute('variant', 'outlined')
      document.body.appendChild(el)
      expect(el.hasAttribute('data-size')).toBe(false)
      expect(el.hasAttribute('data-align')).toBe(false)
      expect(el.hasAttribute('data-variant')).toBe(false)
    })

    it('非法 align 单次告警且不改宿主属性（回落默认纵向）', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const el = new OASEmpty()
      el.setAttribute('align', 'left')
      document.body.appendChild(el)
      expect(warn).toHaveBeenCalled()
      expect(el.getAttribute('align')).toBe('left')
    })

    it('非法 size 回落默认媒体尺寸并告警', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const el = new OASEmpty()
      el.setAttribute('size', 'xl')
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('.image')!.style.width).toBe('96px')
      expect(warn).toHaveBeenCalled()
    })
  })

  describe('图标型媒体（icon 属性，圆形底色指示器）', () => {
    it('icon=registry 名进入图标形态，与默认插画互斥', () => {
      const el = new OASEmpty()
      el.setAttribute('icon', 'search')
      document.body.appendChild(el)
      const content = el.shadowRoot!.querySelector<HTMLElement>('[part="illustration"]')!
      expect(content.dataset.mode).toBe('icon')
      expect(content.querySelector('svg')).not.toBeNull()
      expect(content.getAttribute('data-default')).toBeNull()
      expect(content.getAttribute('hidden')).toBeNull()
    })

    it('非法 icon 回落默认插画（不崩溃）', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const el = new OASEmpty()
      el.setAttribute('icon', 'not-a-registry-icon')
      document.body.appendChild(el)
      const content = el.shadowRoot!.querySelector<HTMLElement>('[part="illustration"]')!
      expect(content.dataset.mode).toBe('media')
      expect(content.getAttribute('data-default')).toBe('')
      expect(warn).toHaveBeenCalled()
    })

    it('slot="illustration" 优先级高于 icon 属性', async () => {
      const el = new OASEmpty()
      el.setAttribute('icon', 'search')
      el.innerHTML = '<svg slot="illustration" id="slot-illu"></svg>'
      document.body.appendChild(el)
      await new Promise((r) => setTimeout(r, 0))
      const content = el.shadowRoot!.querySelector<HTMLElement>('[part="illustration"]')!
      expect(content.hidden).toBe(true)
      expect(
        el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="illustration"]')!.assignedNodes().length,
      ).toBeGreaterThan(0)
    })
  })

  describe('内置第二套简约插画（illustration="simple"）', () => {
    it('渲染简约版插画并标记内置（降透明）', () => {
      const el = new OASEmpty()
      el.setAttribute('illustration', 'simple')
      document.body.appendChild(el)
      const content = el.shadowRoot!.querySelector<HTMLElement>('[part="illustration"]')!
      expect(content.getAttribute('data-default')).toBe('')
      expect(content.querySelector('ellipse')).not.toBeNull()
      expect(content.querySelector('rect')).toBeNull()
    })

    it('与默认插画互不相同（内容不相等）', () => {
      const a = new OASEmpty()
      document.body.appendChild(a)
      const b = new OASEmpty()
      b.setAttribute('illustration', 'simple')
      document.body.appendChild(b)
      const ma = a.shadowRoot!.querySelector<HTMLElement>('[part="illustration"]')!.dataset.markup!
      const mb = b.shadowRoot!.querySelector<HTMLElement>('[part="illustration"]')!.dataset.markup!
      expect(ma).not.toBe(mb)
    })
  })

  describe('真水合（hydrate 接管 SSR 快照）', () => {
    /** 用组件自身 template() 产快照内容（保证与客户端渲染结构严格一致），前置指纹 meta */
    function snapshotWith(el: OASEmpty, fingerprintTag: string): string {
      const template = (el as unknown as { template(): string }).template()
      return `<meta data-oas-ssr="${fingerprintTag}" data-oas-ssr-v="1">${template}`
    }

    it('指纹匹配 + 结构完整：跳过重建、DOM 引用保持、update 照常同步文案、指纹移除', () => {
      const el = new OASEmpty()
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-empty')
      const desc = el.shadowRoot!.querySelector('[part="description"]')!
      document.body.appendChild(el)

      expect(el.shadowRoot!.querySelector('[part="description"]')).toBe(desc)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      // update() 照常执行：默认文案与默认插画尺寸已同步
      expect(desc.textContent).toBe('暂无数据')
      const image = el.shadowRoot!.querySelector<HTMLElement>('.image')!
      expect(image.style.width).toBe('96px')
      el.remove()
    })

    it('快照含标题文本时恢复 title 缓存（水合后标题不丢）', () => {
      const ref = new OASEmpty()
      ref.setAttribute('title', '水合标题')
      document.body.appendChild(ref)
      const snap = ref.shadowRoot!.innerHTML
      ref.remove()

      const el = new OASEmpty()
      el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-empty" data-oas-ssr-v="1">${snap}`
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('水合标题')
      expect(el.hasAttribute('title')).toBe(false)
      el.remove()
    })

    it('指纹 tag 不匹配：回退 render() 重建', () => {
      const el = new OASEmpty()
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-button')
      const pre = el.shadowRoot!.querySelector('[part="description"]')
      document.body.appendChild(el)

      expect(el.shadowRoot!.querySelector('[part="description"]')).not.toBe(pre)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      el.remove()
    })
  })
})
