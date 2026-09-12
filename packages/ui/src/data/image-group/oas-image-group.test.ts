import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASImageGroup } from './index.js'
import { OASImage } from '../image/index.js'

describe('OASImageGroup', () => {
  function mount(childrenHTML: string, attrs: Record<string, string> = {}): OASImageGroup {
    const el = new OASImageGroup()
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.innerHTML = childrenHTML
    document.body.appendChild(el)
    return el
  }

  function wall(srcs: string[], extra = ''): string {
    return srcs.map((s) => `<oas-image src="${s}" ${extra}></oas-image>`).join('')
  }

  function inner(g: OASImageGroup): OASImage {
    return g.shadowRoot!.querySelector('oas-image') as OASImage
  }

  function innerList(g: OASImageGroup): string[] {
    return JSON.parse(inner(g).getAttribute('preview-src-list') ?? '[]') as string[]
  }

  /** 内部预览宿主的浮层文档：portal 开启期间在 body 下，否则在内部 oas-image 的 shadow */
  function pdoc(g: OASImageGroup): ShadowRoot {
    const portal = document.querySelector('[data-oas-image-preview-portal]')
    if (portal?.shadowRoot?.querySelector('.preview-mask')) return portal.shadowRoot
    return inner(g).shadowRoot!
  }

  function pq<T extends Element = HTMLElement>(g: OASImageGroup, sel: string): T {
    return pdoc(g).querySelector(sel) as T
  }

  function clickChild(g: OASImageGroup, i: number): void {
    const child = g.querySelectorAll('oas-image')[i]!
    ;(child.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
  }

  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('渲染：默认插槽 + role=group + 可访问名称（locale 感知）', () => {
    const g = mount(wall(['/a.png']))
    expect(g.shadowRoot!.querySelector('slot')).not.toBeNull()
    const box = g.shadowRoot!.querySelector('[part="group"]')!
    expect(box.getAttribute('role')).toBe('group')
    expect(box.getAttribute('aria-label')).toBe('图集')
    setLocale(en)
    expect(g.shadowRoot!.querySelector('[part="group"]')!.getAttribute('aria-label')).toBe('Image gallery')
  })

  it('收集子图 src 为图集列表（preview-src-list 透传内部预览宿主）', () => {
    const g = mount(wall(['/a.png', '/b.png', '/c.png']))
    expect(innerList(g)).toEqual(['/a.png', '/b.png', '/c.png'])
    expect(inner(g).hasAttribute('preview')).toBe(true)
  })

  it('收集优先级：preview-src 优先于 src；preview-src-list 展平为多张', () => {
    const g = mount(
      '<oas-image src="/a.png" preview-src="/a-big.png"></oas-image>' +
        '<oas-image src="/b.png" preview-src-list=\'["/b1.png","/b2.png"]\'></oas-image>' +
        '<oas-image src="/c.png"></oas-image>',
    )
    expect(innerList(g)).toEqual(['/a-big.png', '/b1.png', '/b2.png', '/c.png'])
  })

  it('点击组内任一子图打开共享预览：从被点图索引起、页码指示 current/total', () => {
    const g = mount(wall(['/a.png', '/b.png', '/c.png']))
    clickChild(g, 1)
    expect(pq<HTMLImageElement>(g, '[part="preview-image"]').getAttribute('src')).toBe('/b.png')
    const counter = pq(g, '[part="preview-counter"]')
    expect(counter.hidden).toBe(false)
    expect(counter.textContent).toBe('2/3')
    expect(counter.getAttribute('aria-label')).toContain('2')
    expect(counter.getAttribute('aria-label')).toContain('3')
  })

  it('子图自身 preview 属性被容器接管：点击走组图集，子图自身预览不打开', () => {
    const g = mount(wall(['/a.png', '/b.png', '/c.png'], 'preview'))
    const child = g.querySelectorAll('oas-image')[1] as OASImage
    clickChild(g, 1)
    // 共享预览打开（portal 浮层）
    expect(pq(g, '.preview-mask').hasAttribute('hidden')).toBe(false)
    // 子图自身浮层保持关闭
    expect(child.shadowRoot!.querySelector('.preview-mask')!.hasAttribute('hidden')).toBe(true)
    expect(pq<HTMLImageElement>(g, '[part="preview-image"]').getAttribute('src')).toBe('/b.png')
  })

  it('无 preview 属性的子图同样可点开组图集', () => {
    const g = mount(wall(['/a.png', '/b.png']))
    clickChild(g, 0)
    expect(pq(g, '.preview-mask').hasAttribute('hidden')).toBe(false)
    expect(pq<HTMLImageElement>(g, '[part="preview-image"]').getAttribute('src')).toBe('/a.png')
  })

  it('prev/next 在整组图集间切换并派发 oas-change（detail {current, prev}）', () => {
    const g = mount(wall(['/a.png', '/b.png', '/c.png']))
    const changes: unknown[] = []
    g.addEventListener('oas-change', (e: Event) => changes.push((e as CustomEvent).detail))
    clickChild(g, 0)
    expect(changes.length).toBe(0)
    pq<HTMLElement>(g, '[part="preview-next"]').click()
    expect(pq<HTMLImageElement>(g, '[part="preview-image"]').getAttribute('src')).toBe('/b.png')
    expect(pq(g, '[part="preview-counter"]').textContent).toBe('2/3')
    expect(changes).toEqual([{ current: 1, prev: 0 }])
    pq<HTMLElement>(g, '[part="preview-prev"]').click()
    expect(changes).toEqual([
      { current: 1, prev: 0 },
      { current: 0, prev: 1 },
    ])
  })

  it('current 属性受控：在场时点击按 current 起开', () => {
    const g = mount(wall(['/a.png', '/b.png', '/c.png']), { current: '2' })
    clickChild(g, 0)
    expect(pq(g, '[part="preview-counter"]').textContent).toBe('3/3')
    expect(g.getAttribute('current')).toBe('2')
  })

  it('current 受控双向：打开后外部改 current 属性，预览跳图并派发 oas-change', () => {
    const g = mount(wall(['/a.png', '/b.png', '/c.png']))
    const changes: unknown[] = []
    g.addEventListener('oas-change', (e: Event) => changes.push((e as CustomEvent).detail))
    clickChild(g, 2)
    expect(pq(g, '[part="preview-counter"]').textContent).toBe('3/3')
    g.setAttribute('current', '0')
    expect(pq<HTMLImageElement>(g, '[part="preview-image"]').getAttribute('src')).toBe('/a.png')
    expect(pq(g, '[part="preview-counter"]').textContent).toBe('1/3')
    expect(changes).toContainEqual({ current: 0, prev: 2 })
  })

  it('infinite 透传内部预览宿主：首尾循环翻页', () => {
    const g = mount(wall(['/a.png', '/b.png', '/c.png']), { infinite: '' })
    expect(inner(g).hasAttribute('infinite')).toBe(true)
    clickChild(g, 2)
    pq<HTMLElement>(g, '[part="preview-next"]').click()
    expect(pq(g, '[part="preview-counter"]').textContent).toBe('1/3')
  })

  it('动态增删子图同步图集列表（slotchange/MutationObserver）', async () => {
    const g = mount(wall(['/a.png', '/b.png']))
    expect(innerList(g)).toEqual(['/a.png', '/b.png'])
    const added = document.createElement('oas-image')
    added.setAttribute('src', '/c.png')
    g.appendChild(added)
    await new Promise((r) => setTimeout(r, 0))
    expect(innerList(g)).toEqual(['/a.png', '/b.png', '/c.png'])
    added.remove()
    await new Promise((r) => setTimeout(r, 0))
    expect(innerList(g)).toEqual(['/a.png', '/b.png'])
    // 子图改 src：列表同步
    const first = g.querySelector('oas-image')!
    first.setAttribute('src', '/a2.png')
    await new Promise((r) => setTimeout(r, 0))
    expect(innerList(g)).toEqual(['/a2.png', '/b.png'])
  })

  it('空组（无可收集地址）：点击子图不打开预览', () => {
    const g = mount('<oas-image alt="无地址"></oas-image>')
    clickChild(g, 0)
    expect(document.querySelector('[data-oas-image-preview-portal]')).toBeNull()
    expect(inner(g).shadowRoot!.querySelector('.preview-mask')!.hasAttribute('hidden')).toBe(true)
  })

  it('oas-preview 从容器派发（detail.src 为当前张），内部 preview-change 不泄漏', () => {
    const g = mount(wall(['/a.png', '/b.png']))
    let previewDetail: unknown
    let previewChangeFired = 0
    g.addEventListener('oas-preview', (e: Event) => (previewDetail = (e as CustomEvent).detail))
    g.addEventListener('oas-preview-change', () => previewChangeFired++)
    clickChild(g, 1)
    expect(previewDetail).toEqual({ src: '/b.png' })
    expect(previewChangeFired).toBe(0)
  })

  it('非受控不造 current 属性：关闭后再点其他子图仍按被点图起开', () => {
    const g = mount(wall(['/a.png', '/b.png', '/c.png']))
    clickChild(g, 2)
    expect(pq(g, '[part="preview-counter"]').textContent).toBe('3/3')
    expect(g.hasAttribute('current'), '非受控模式不得反射 current').toBe(false)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    clickChild(g, 0)
    expect(pq(g, '[part="preview-counter"]').textContent).toBe('1/3')
    expect(g.hasAttribute('current')).toBe(false)
  })

  it('Esc 关闭共享预览：遮罩隐藏、portal 拆除', () => {
    const g = mount(wall(['/a.png', '/b.png']))
    clickChild(g, 0)
    expect(document.querySelector('[data-oas-image-preview-portal]')).not.toBeNull()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(document.querySelector('[data-oas-image-preview-portal]')).toBeNull()
    expect(inner(g).shadowRoot!.querySelector('.preview-mask')!.hasAttribute('hidden')).toBe(true)
  })

  it('断开连接无孤儿：移除容器时预览 portal 一并拆除', () => {
    const g = mount(wall(['/a.png', '/b.png']))
    clickChild(g, 0)
    expect(document.querySelector('[data-oas-image-preview-portal]')).not.toBeNull()
    g.remove()
    expect(document.querySelector('[data-oas-image-preview-portal]')).toBeNull()
  })

  it('template[slot="toolbar"] 透传共享预览宿主：自定义工具栏替换默认按钮组', async () => {
    const g = mount(
      wall(['/a.png', '/b.png', '/c.png']) +
        '<template slot="toolbar"><button type="button" data-cmd="zoom-in">放大</button>' +
        '<button type="button" data-cmd="next">下一张</button></template>',
    )
    // 宿主模板克隆进内部预览宿主（原模板保留在组图 light DOM）
    expect(inner(g).querySelector('template[slot="toolbar"]')).not.toBeNull()
    expect(g.querySelector('template[slot="toolbar"]')).not.toBeNull()

    // oas-toolbar-render 经共享宿主冒泡到组图（composed 跨 shadow）
    let detail: { element: HTMLElement; actions: Record<string, () => void> } | null = null
    g.addEventListener('oas-toolbar-render', (e: Event) => {
      detail = (e as CustomEvent).detail as never
    })
    clickChild(g, 0)
    await new Promise((r) => setTimeout(r, 0))
    expect(detail).not.toBeNull()

    const bar = pq(g, '[part="preview-toolbar"]')
    expect(bar.querySelector('[data-cmd="zoom-in"]')).not.toBeNull()
    expect(bar.querySelector('[part="preview-zoom-in"]')).toBeNull()

    // 命令接线实际生效：缩放 + 翻页
    const d = detail!
    d.element.querySelector<HTMLElement>('[data-cmd="zoom-in"]')!.onclick = d.actions.zoomIn!
    d.element.querySelector<HTMLElement>('[data-cmd="next"]')!.onclick = d.actions.next!
    d.element.querySelector<HTMLElement>('[data-cmd="zoom-in"]')!.click()
    expect(pq<HTMLElement>(g, '[part="preview-image"]').style.transform).toContain('scale(1.5)')
    d.element.querySelector<HTMLElement>('[data-cmd="next"]')!.click()
    expect(pq(g, '[part="preview-counter"]').textContent).toBe('2/3')
  })
})
