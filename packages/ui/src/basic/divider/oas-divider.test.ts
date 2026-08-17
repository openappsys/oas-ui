import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASDivider } from './index.js'

function mount(attrs: Record<string, string> = {}, slot = '分割'): OASDivider {
  const el = new OASDivider()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function line(el: OASDivider): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>('.divider')
}

describe('OASDivider', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认水平分割线：role=separator 且 aria-orientation=horizontal', async () => {
    const el = mount({}, '')
    const d = line(el)!
    await Promise.resolve()
    expect(d.getAttribute('role')).toBe('separator')
    expect(d.getAttribute('aria-orientation')).toBe('horizontal')
  })

  it('direction=vertical 切换竖线', () => {
    const el = mount({ direction: 'vertical' }, '')
    const d = line(el)!
    expect(d.getAttribute('aria-orientation')).toBe('vertical')
  })

  it('有内容时两侧留线，content-position 控制位置', () => {
    const el = mount({ 'content-position': 'left' }, '标题')
    const d = line(el)!
    expect(el.textContent).toContain('标题')
    expect(d.classList.contains('left')).toBe(true)
  })

  it('dashed 属性加虚线样式类', () => {
    const el = mount({ dashed: '' }, '')
    expect(line(el)!.classList.contains('dashed')).toBe(true)
  })

  describe('variant 线型（solid/dashed/dotted/double）', () => {
    it('variant 进入 observedAttributes，四值映射 class，solid 不加 class', () => {
      expect(OASDivider.observedAttributes).toContain('variant')
      for (const v of ['dashed', 'dotted', 'double'] as const) {
        const el = mount({ variant: v }, '')
        expect(line(el)!.classList.contains(v), `variant=${v}`).toBe(true)
      }
      const solid = mount({}, '')
      expect(line(solid)!.classList.contains('solid')).toBe(false)
    })

    it('dashed 布尔兼容：dashed 属性等价 variant=dashed（布尔优先）', () => {
      const el = mount({ dashed: '' }, '')
      expect(line(el)!.classList.contains('dashed')).toBe(true)
    })

    it('显式 variant 优先于 dashed 布尔（variant=dotted + dashed → dotted）', () => {
      const el = mount({ dashed: '', variant: 'dotted' }, '')
      const d = line(el)!
      expect(d.classList.contains('dotted')).toBe(true)
      expect(d.classList.contains('dashed')).toBe(false)
    })

    it('非法值回落 solid（无任何线型 class）并告警', () => {
      const el = mount({ variant: 'wavy' }, '')
      expect(line(el)!.classList.contains('dashed')).toBe(false)
      expect(line(el)!.classList.contains('dotted')).toBe(false)
      expect(line(el)!.classList.contains('double')).toBe(false)
    })

    it('CSS：dotted/double 线型规则 + double 间隙变量', () => {
      const el = mount({}, '')
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toContain('.divider.dotted::before')
      expect(css).toContain('.divider.double::before')
      expect(css).toMatch(/--oas-divider-double-gap/)
    })

    it('SSR 快照结构含四线型支持（class 驱动，快照与客户端同模板）', () => {
      const el = mount({ variant: 'dotted' }, '')
      expect(el.shadowRoot!.querySelector('.divider.dotted')).not.toBeNull()
    })
  })

  describe('inset / middle 缩进', () => {
    it('inset/middle 进入 observedAttributes 并映射 class', () => {
      expect(OASDivider.observedAttributes).toContain('inset')
      expect(OASDivider.observedAttributes).toContain('middle')
      const inset = mount({ inset: '' }, '')
      expect(line(inset)!.classList.contains('inset')).toBe(true)
      const mid = mount({ middle: '' }, '')
      expect(line(mid)!.classList.contains('middle')).toBe(true)
    })

    it('CSS：inset 起始侧留空 / middle 两侧留空', () => {
      const el = mount({}, '')
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toContain('.divider.inset::before')
      expect(css).toContain('.divider.middle::before')
      expect(css).toContain('.divider.middle::after')
    })

    it('无内容时 inset/middle 同样生效（空线缩进）', () => {
      const el = mount({ inset: '' }, '')
      expect(line(el)!.classList.contains('inset')).toBe(true)
    })
  })

  describe('size 间距档（small/medium/large）', () => {
    it('size 进入 observedAttributes，medium 默认无 class（零回归），small/large 映射 class', () => {
      expect(OASDivider.observedAttributes).toContain('size')
      const md = mount({}, '')
      expect(line(md)!.classList.contains('small')).toBe(false)
      expect(line(md)!.classList.contains('large')).toBe(false)
      const sm = mount({ size: 'small' }, '')
      expect(line(sm)!.classList.contains('small')).toBe(true)
      const lg = mount({ size: 'large' }, '')
      expect(line(lg)!.classList.contains('large')).toBe(true)
    })

    it('非法值回落 medium 并告警', () => {
      const el = mount({ size: 'xxl' }, '')
      const d = line(el)!
      expect(d.classList.contains('small')).toBe(false)
      expect(d.classList.contains('large')).toBe(false)
    })

    it('CSS：size 档位改 margin', () => {
      const el = mount({}, '')
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.divider\.small\s*{[^}]*margin/)
      expect(css).toMatch(/\.divider\.large\s*{[^}]*margin/)
    })

    it('vertical 忽略 size（间距档只对水平布局生效）', () => {
      const el = mount({ direction: 'vertical', size: 'large' }, '')
      const d = line(el)!
      expect(d.classList.contains('large')).toBe(false)
    })
  })

  describe('strong 强调文字', () => {
    it('strong 进入 observedAttributes 并映射 class', () => {
      expect(OASDivider.observedAttributes).toContain('strong')
      const el = mount({ strong: '' }, '标题')
      expect(line(el)!.classList.contains('strong')).toBe(true)
    })

    it('CSS：strong 加粗（600）', () => {
      const el = mount({}, '')
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.divider\.strong\s*{[^}]*font-weight/)
    })

    it('strong 动态切换即时生效', () => {
      const el = mount({}, '标题')
      el.setAttribute('strong', '')
      expect(line(el)!.classList.contains('strong')).toBe(true)
      el.removeAttribute('strong')
      expect(line(el)!.classList.contains('strong')).toBe(false)
    })
  })

  describe('CSS 变量开口（width/color/spacing/title-inset）', () => {
    it('CSS：四个变量都有 fallback 接线（消费点）', () => {
      const el = mount({}, '')
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/--oas-divider-width/)
      expect(css).toMatch(/--oas-divider-color/)
      expect(css).toMatch(/--oas-divider-spacing/)
      expect(css).toMatch(/--oas-divider-title-inset/)
    })

    it('间距变量接线：margin 消费 --oas-divider-spacing（jsdom 不解析自定义属性，静态断言规则；真实生效由 e2e 验证）', () => {
      const el = mount({}, '')
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/margin:\s*var\(--oas-divider-spacing,\s*var\(--oas-space-4\)\)/)
      // size 档位同样走 spacing 变量（宿主注入优先生效于三档）
      expect(css).toMatch(/--oas-divider-spacing,\s*var\(--oas-space-2\)/)
      expect(css).toMatch(/--oas-divider-spacing,\s*var\(--oas-space-6\)/)
    })
  })

  describe('vertical 在 flex/grid 容器自动撑满', () => {
    it('CSS：vertical 高度自适应容器（不再固定 1em）', () => {
      const el = mount({ direction: 'vertical' }, '')
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      // 撑满机制：host 侧 align-self: stretch 或等价（匹配 stretch 关键字）
      expect(css).toMatch(/stretch/)
    })

    it('宿主 display:flex 容器内 vertical 撑满（jsdom 无布局，静态断言撑满机制；真实生效由 e2e 验证）', () => {
      // 撑满机制：.divider height:100% + min-height 兜底 + host 不锁高（flex 容器默认 stretch 拉伸 host）
      const el = mount({ direction: 'vertical' }, '')
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      const rule = css.match(/:host\(\[direction='vertical'\]\)\s*\.divider\s*{[^}]*}/)?.[0] ?? ''
      expect(rule).toMatch(/height:\s*100%/)
      expect(rule).toMatch(/min-height:\s*1em/)
      // host 侧无 height 锁定（撑满前提）
      const hostVertical = css.match(/:host\(\[direction='vertical'\]\)\s*{[^}]*}/)?.[0] ?? ''
      expect(hostVertical).not.toMatch(/height/)
    })
  })

  it('属性变化增量更新：切换 direction 即时生效', () => {
    const el = mount({}, '')
    const d = line(el)!
    el.setAttribute('direction', 'vertical')
    expect(d).toBe(line(el))
    expect(d.getAttribute('aria-orientation')).toBe('vertical')
  })

  describe('真水合（hydrate 接管 SSR 快照）', () => {
    /** 用组件自身 template() 产快照内容（保证与客户端渲染结构严格一致），前置指纹 meta */
    function snapshotWith(el: OASDivider, fingerprintTag: string): string {
      const template = (el as unknown as { template(): string }).template()
      return `<meta data-oas-ssr="${fingerprintTag}" data-oas-ssr-v="1">${template}`
    }

    it('指纹匹配 + 结构完整：跳过重建、DOM 引用保持、update 照常同步 aria-orientation、指纹移除', () => {
      const el = new OASDivider()
      el.setAttribute('direction', 'vertical')
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-divider')
      const d = el.shadowRoot!.querySelector('.divider')!
      document.body.appendChild(el)

      expect(el.shadowRoot!.querySelector('.divider')).toBe(d)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      // update() 照常执行：direction 同步到 aria-orientation
      expect(d.getAttribute('aria-orientation')).toBe('vertical')
      el.remove()
    })

    it('指纹 tag 不匹配：回退 render() 重建', () => {
      const el = new OASDivider()
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-tag')
      const pre = el.shadowRoot!.querySelector('.divider')
      document.body.appendChild(el)

      expect(el.shadowRoot!.querySelector('.divider')).not.toBe(pre)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      el.remove()
    })
  })
})
