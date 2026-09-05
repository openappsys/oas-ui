import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASResult } from './index.js'

describe('OASResult', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染标题与描述，status 默认 success', () => {
    const el = new OASResult()
    el.setAttribute('title', '操作成功')
    el.setAttribute('description', '已完成')
    document.body.appendChild(el)
    const sr = el.shadowRoot!
    expect(sr.textContent).toContain('操作成功')
    expect(sr.textContent).toContain('已完成')
    expect(sr.querySelector('[part="icon"]')!.getAttribute('data-status')).toBe('success')
  })

  it('error 状态渲染错误图标区域', () => {
    const el = new OASResult()
    el.setAttribute('status', 'error')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="icon"]')!.getAttribute('data-status')).toBe('error')
  })

  it('extra 插槽存在', () => {
    const el = new OASResult()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('slot[name="extra"]')).not.toBeNull()
  })

  describe('status 内置 SVG 图标（替换文字字形）', () => {
    it('内置状态渲染内联 SVG 字形，图标区不再有文字字形', () => {
      const el = new OASResult()
      el.setAttribute('status', 'success')
      document.body.appendChild(el)
      const glyph = el.shadowRoot!.querySelector<HTMLElement>('.icon-glyph')!
      expect(glyph.querySelector('svg')).not.toBeNull()
      expect(glyph.hidden).toBe(false)
      // ✓✕!i 文字字形淘汰
      expect(glyph.textContent).not.toMatch(/[✓✕!i]/)
    })

    it('图标区携带 role=status + aria-label=status', () => {
      const el = new OASResult()
      el.setAttribute('status', 'warning')
      document.body.appendChild(el)
      const icon = el.shadowRoot!.querySelector('[part="icon"]')!
      expect(icon.getAttribute('role')).toBe('status')
      expect(icon.getAttribute('aria-label')).toBe('warning')
    })
  })

  describe('HTTP 错误状态 403/404/500', () => {
    it('403 渲染自研挂锁字形与状态色映射', () => {
      const el = new OASResult()
      el.setAttribute('status', '403')
      document.body.appendChild(el)
      const icon = el.shadowRoot!.querySelector('[part="icon"]')!
      const glyph = el.shadowRoot!.querySelector<HTMLElement>('.icon-glyph')!
      expect(icon.getAttribute('data-status')).toBe('403')
      expect(icon.getAttribute('aria-label')).toBe('403')
      expect(glyph.querySelector('svg rect')).not.toBeNull()
    })

    it('404 渲染问号字形', () => {
      const el = new OASResult()
      el.setAttribute('status', '404')
      document.body.appendChild(el)
      const glyph = el.shadowRoot!.querySelector<HTMLElement>('.icon-glyph')!
      expect(glyph.querySelector('svg')).not.toBeNull()
      expect(el.shadowRoot!.querySelector('[part="icon"]')!.getAttribute('data-status')).toBe('404')
    })

    it('500 渲染服务器字形', () => {
      const el = new OASResult()
      el.setAttribute('status', '500')
      document.body.appendChild(el)
      const glyph = el.shadowRoot!.querySelector<HTMLElement>('.icon-glyph')!
      expect(glyph.querySelector('svg rect')).not.toBeNull()
      expect(el.shadowRoot!.querySelector('[part="icon"]')!.getAttribute('data-status')).toBe('500')
    })

    it('400/500/600 等未知值回落 success 并告警', () => {
      const warns: string[] = []
      const spy = vi.spyOn(console, 'warn').mockImplementation((m: string) => warns.push(m))
      const el = new OASResult()
      el.setAttribute('status', '418')
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="icon"]')!.getAttribute('data-status')).toBe('success')
      expect(warns.some((w) => w.includes('418'))).toBe(true)
      spy.mockRestore()
    })
  })

  describe('icon slot 自定义图标（中性态）', () => {
    it('slot=icon 有内容时进入中性态（去语义色、隐藏内置字形、移除 status aria）', async () => {
      const el = new OASResult()
      el.setAttribute('status', 'success')
      el.innerHTML = '<svg slot="icon" id="my-icon"></svg>'
      document.body.appendChild(el)
      await new Promise((r) => setTimeout(r, 0))
      const icon = el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!
      const glyph = el.shadowRoot!.querySelector<HTMLElement>('.icon-glyph')!
      expect(icon.hasAttribute('data-custom')).toBe(true)
      expect(icon.hasAttribute('role')).toBe(false)
      expect(icon.hasAttribute('aria-label')).toBe(false)
      expect(glyph.hidden).toBe(true)
    })

    it('移除自定义图标后回落内置图标与 aria', async () => {
      const el = new OASResult()
      el.innerHTML = '<svg slot="icon" id="my-icon"></svg>'
      document.body.appendChild(el)
      const node = el.querySelector('#my-icon')!
      el.removeChild(node)
      await new Promise((r) => setTimeout(r, 0))
      const icon = el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!
      const glyph = el.shadowRoot!.querySelector<HTMLElement>('.icon-glyph')!
      expect(icon.hasAttribute('data-custom')).toBe(false)
      expect(icon.getAttribute('role')).toBe('status')
      expect(glyph.hidden).toBe(false)
      expect(glyph.querySelector('svg')).not.toBeNull()
    })
  })

  describe('description 富内容 slot', () => {
    it('slot=description 有内容时覆盖属性文案', async () => {
      const el = new OASResult()
      el.setAttribute('description', '属性描述')
      el.innerHTML = '<span slot="description">富描述</span>'
      document.body.appendChild(el)
      await new Promise((r) => setTimeout(r, 0))
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.description-text')!
      const desc = el.shadowRoot!.querySelector<HTMLElement>('.description')!
      expect(fallback.hidden).toBe(true)
      expect(desc.hidden).toBe(false)
    })

    it('无描述时描述层隐藏', () => {
      const el = new OASResult()
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('.description')!.hidden).toBe(true)
    })
  })

  describe('默认 slot 内容区（错误详情清单场景）', () => {
    it('默认 slot 有内容时显示内容区', async () => {
      const el = new OASResult()
      el.innerHTML = '<ul><li>字段 A 不能为空</li><li>字段 B 格式错误</li></ul>'
      document.body.appendChild(el)
      await new Promise((r) => setTimeout(r, 0))
      const content = el.shadowRoot!.querySelector<HTMLElement>('.content')!
      expect(content.hidden).toBe(false)
      expect(content.querySelector('slot')!.assignedNodes().length).toBeGreaterThan(0)
    })

    it('无内容时内容区隐藏', () => {
      const el = new OASResult()
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('.content')!.hidden).toBe(true)
    })
  })

  describe('size 档位', () => {
    it('样式按宿主属性选择器命中档位，不落 data-size 宿主属性', () => {
      const el = new OASResult()
      el.setAttribute('size', 'small')
      document.body.appendChild(el)
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toContain(":host([size='small'])")
      expect(css).toContain(":host([size='large'])")
      expect(el.hasAttribute('data-size')).toBe(false)
    })

    it('图标直径随档位（默认 72 / small 56 / large 88）', () => {
      const el = new OASResult()
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('.icon')!.style.width).toBe('72px')

      const small = new OASResult()
      small.setAttribute('size', 'small')
      document.body.appendChild(small)
      expect(small.shadowRoot!.querySelector<HTMLElement>('.icon')!.style.width).toBe('56px')

      const large = new OASResult()
      large.setAttribute('size', 'large')
      document.body.appendChild(large)
      expect(large.shadowRoot!.querySelector<HTMLElement>('.icon')!.style.width).toBe('88px')
    })
  })

  describe('title 吸收（消除宿主原生 tooltip）', () => {
    function mount(attrs: Record<string, string> = {}): OASResult {
      const el = new OASResult()
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      document.body.appendChild(el)
      return el
    }

    it('挂载后宿主不再残留 title 属性，标题照常渲染进标题区', () => {
      const el = mount({ title: '操作成功' })
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('操作成功')
    })

    it('吸收触发的二次 update 幂等（标题不丢失）', () => {
      const el = mount({ title: '操作成功' })
      el.setAttribute('status', 'error') // 触发二次 update
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('操作成功')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('运行时改 title 属性：新值吸收渲染，宿主仍无残留', () => {
      const el = mount({ title: '旧标题' })
      el.setAttribute('title', '新结果')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('新结果')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title="" 清空标题（属性在场=宿主意图）', () => {
      const el = mount({ title: '操作成功' })
      el.setAttribute('title', '')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('水合恢复：快照标题区有文本时恢复缓存，水合后标题不丢失', () => {
      const ref = new OASResult()
      ref.setAttribute('title', '水合结果')
      document.body.appendChild(ref)
      const snap = ref.shadowRoot!.innerHTML
      ref.remove()

      const el = new OASResult()
      el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-result" data-oas-ssr-v="1">${snap}`
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('水合结果')
      expect(el.hasAttribute('title')).toBe(false)
      el.remove()
    })
  })

  describe('title 双通道（slot 富内容覆盖属性文本）', () => {
    it('slot 有内容时覆盖属性文本', async () => {
      const el = new OASResult()
      el.setAttribute('title', '属性标题')
      el.innerHTML = '<span slot="title">插槽标题</span>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      // 宿主 title 仍被吸收（吸收状态机不变）
      expect(el.hasAttribute('title')).toBe(false)
      expect(fallback.hidden).toBe(true)
    })

    it('仅 slot 无属性：标题区渲染 slot 内容且不隐藏', async () => {
      const el = new OASResult()
      el.innerHTML = '<span slot="title">插槽标题</span>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('双空（无 title 无 slot）：标题区不渲染文本（兜底为空、不隐藏）', () => {
      const el = new OASResult()
      document.body.appendChild(el)
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('动态移除 slot 内容后回落属性文本', async () => {
      const el = new OASResult()
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
