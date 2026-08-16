import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASSpace } from './index.js'

function mount(attrs: Record<string, string> = {}): OASSpace {
  const el = new OASSpace()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function mountWith(attrs: Record<string, string>, html: string): OASSpace {
  const el = new OASSpace()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

describe('OASSpace', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认水平等距布局：flex-row + medium 间距', async () => {
    const el = mount()
    await Promise.resolve()
    expect(el.style.flexDirection).toBe('row')
    expect(el.style.columnGap).toBe('var(--oas-space-3)')
    expect(el.style.rowGap).toBe('var(--oas-space-3)')
  })

  it('direction=vertical 切换为列布局', () => {
    const el = mount({ direction: 'vertical' })
    expect(el.style.flexDirection).toBe('column')
  })

  it('size 支持 token 名与数字像素', () => {
    const small = mount({ size: 'small' })
    expect(small.style.columnGap).toBe('var(--oas-space-2)')
    small.remove()
    const large = mount({ size: 'large' })
    expect(large.style.columnGap).toBe('var(--oas-space-5)')
    large.remove()
    const num = mount({ size: '16' })
    expect(num.style.columnGap).toBe('16px')
  })

  it('size 五档：xs=space-1/small=space-2/medium=space-3/large=space-5/xl=space-6', () => {
    const map: Array<[string, string]> = [
      ['xs', 'var(--oas-space-1)'],
      ['small', 'var(--oas-space-2)'],
      ['medium', 'var(--oas-space-3)'],
      ['large', 'var(--oas-space-5)'],
      ['xl', 'var(--oas-space-6)'],
    ]
    for (const [size, gap] of map) {
      const el = mount({ size })
      expect(el.style.columnGap, `size=${size}`).toBe(gap)
      el.remove()
    }
  })

  it('size 非法值回落 medium 且 dev 下 console.warn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ size: 'huge' })
    expect(el.style.columnGap).toBe('var(--oas-space-3)')
    el.setAttribute('size', 'huge')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    el.remove()
  })

  it('wrap 控制 flex-wrap', () => {
    const el = mount({ wrap: '' })
    expect(el.style.flexWrap).toBe('wrap')
  })

  it('align 控制 align-items', () => {
    const el = mount({ align: 'center' })
    expect(el.style.alignItems).toBe('center')
  })

  it('属性变化增量更新：改 direction/size 即时生效', () => {
    const el = mount()
    el.setAttribute('direction', 'vertical')
    el.setAttribute('size', 'large')
    expect(el.style.flexDirection).toBe('column')
    expect(el.style.columnGap).toBe('var(--oas-space-5)')
  })

  // ===== v2.0 能力补齐：separator / justify / reverse / size 数组 / fill =====

  it('separator：字符串在相邻子项间注入分隔符', () => {
    const el = mountWith(
      { separator: '|' },
      '<button>一</button><button>二</button><button>三</button>',
    )
    const seps = el.querySelectorAll<HTMLElement>(':scope > .oas-space-separator')
    expect(seps.length).toBe(2)
    expect(seps[0]!.textContent).toBe('|')
    expect(seps[1]!.textContent).toBe('|')
    expect(seps[0]!.getAttribute('aria-hidden')).toBe('true')
  })

  it('separator：重复 update 幂等，不产生重复分隔符', () => {
    const el = mountWith({ separator: '|' }, '<button>一</button><button>二</button>')
    expect(el.querySelectorAll(':scope > .oas-space-separator').length).toBe(1)
    // 同值再触发 update：分隔符数量不变
    el.setAttribute('separator', '|')
    expect(el.querySelectorAll(':scope > .oas-space-separator').length).toBe(1)
    // 改值同步更新内容
    el.setAttribute('separator', '/')
    const sep = el.querySelector<HTMLElement>(':scope > .oas-space-separator')
    expect(sep!.textContent).toBe('/')
    expect(el.querySelectorAll(':scope > .oas-space-separator').length).toBe(1)
    // 移除 separator：分隔符全部清理
    el.removeAttribute('separator')
    expect(el.querySelectorAll(':scope > .oas-space-separator').length).toBe(0)
  })

  it('separator：slot="separator" 自定义分隔优先于字符串', () => {
    const el = mountWith(
      { separator: '|' },
      '<button>一</button><span slot="separator">·</span><button>二</button>',
    )
    // 自定义分隔采纳：不注入字符串 span
    expect(el.querySelectorAll<HTMLElement>(':scope > [data-oas-space-sep]').length).toBe(0)
    // slot 元素去除 slot 属性并标记为分隔元素（留在原位参与布局）
    const custom = el.querySelector<HTMLElement>(':scope > span')
    expect(custom!.textContent).toBe('·')
    expect(custom!.hasAttribute('slot')).toBe(false)
    expect(custom!.classList.contains('oas-space-separator')).toBe(true)
  })

  it('justify 控制 justify-content（六值映射）', () => {
    const map: Array<[string, string]> = [
      ['start', 'flex-start'],
      ['center', 'center'],
      ['end', 'flex-end'],
      ['space-between', 'space-between'],
      ['space-around', 'space-around'],
      ['space-evenly', 'space-evenly'],
    ]
    for (const [v, expected] of map) {
      const el = mount({ justify: v })
      expect(el.style.justifyContent, `justify=${v}`).toBe(expected)
      el.remove()
    }
  })

  it('justify 缺省不设 justify-content', () => {
    const el = mount()
    expect(el.style.justifyContent).toBe('')
  })

  it('reverse 反向排列：horizontal→row-reverse / vertical→column-reverse', () => {
    const el = mount({ reverse: '' })
    expect(el.style.flexDirection).toBe('row-reverse')
    el.setAttribute('direction', 'vertical')
    expect(el.style.flexDirection).toBe('column-reverse')
    el.removeAttribute('reverse')
    expect(el.style.flexDirection).toBe('column')
  })

  it('size 数组：逗号分隔分别控制横向/纵向间距', () => {
    const el = mount({ size: '8,16' })
    expect(el.style.columnGap).toBe('8px')
    expect(el.style.rowGap).toBe('16px')
    el.remove()
    // 单值：两轴同值
    const single = mount({ size: 'small' })
    expect(single.style.columnGap).toBe('var(--oas-space-2)')
    expect(single.style.rowGap).toBe('var(--oas-space-2)')
  })

  it('fill：子项等分填满容器（flex: 1 等价物）', () => {
    const el = mountWith({ fill: '' }, '<span>一</span><span>二</span>')
    const items = el.querySelectorAll<HTMLElement>(':scope > span')
    expect(items[0]!.style.flex).toBe('1 1 0%')
    expect(items[1]!.style.flex).toBe('1 1 0%')
  })

  it('fill-ratio：子项按比例分配（100 为 1 份）', () => {
    const el = mountWith(
      { fill: '' },
      '<span>一</span><span fill-ratio="200">二</span><span fill-ratio="300">三</span>',
    )
    const items = el.querySelectorAll<HTMLElement>(':scope > span')
    expect(items[0]!.style.flex).toBe('1 1 0%')
    expect(items[1]!.style.flex).toBe('2 1 0%')
    expect(items[2]!.style.flex).toBe('3 1 0%')
  })

  it('fill 移除后清掉子项 flex；分隔符子项不受 fill 影响', () => {
    const el = mountWith({ fill: '', separator: '|' }, '<span>一</span><span>二</span>')
    const sep = el.querySelector<HTMLElement>(':scope > .oas-space-separator')
    expect(sep).not.toBeNull()
    expect(sep!.style.flex).toBe('')
    const items = el.querySelectorAll<HTMLElement>(':scope > span:not(.oas-space-separator)')
    expect(items[0]!.style.flex).toBe('1 1 0%')
    el.removeAttribute('fill')
    expect(items[0]!.style.flex).toBe('')
  })

  // ===== v2.0 能力补齐：响应式断点（direction/size 断点简写） =====

  it('direction 断点简写：var() 兜底基础值 + 生成 @media 规则', () => {
    const el = mount({ direction: 'column md:row' })
    expect(el.style.flexDirection).toBe('var(--oas-space-direction, column)')
    const css = el.shadowRoot!.querySelector('style[data-oas-space-breakpoints]')!.textContent!
    expect(css).toContain('@media (min-width: 768px) { :host { --oas-space-direction: row } }')
  })

  it('size 断点简写：多断点生成对应 min-width 规则（变量名与值正确）', () => {
    const el = mount({ size: 'small md:large xl:xl' })
    expect(el.style.columnGap).toBe('var(--oas-space-column-gap, var(--oas-space-2))')
    expect(el.style.rowGap).toBe('var(--oas-space-row-gap, var(--oas-space-2))')
    const css = el.shadowRoot!.querySelector('style[data-oas-space-breakpoints]')!.textContent!
    expect(css).toContain(
      '@media (min-width: 768px) { :host { --oas-space-column-gap: var(--oas-space-5); --oas-space-row-gap: var(--oas-space-5) } }',
    )
    expect(css).toContain(
      '@media (min-width: 1280px) { :host { --oas-space-column-gap: var(--oas-space-6); --oas-space-row-gap: var(--oas-space-6) } }',
    )
  })

  it('断点简写与 reverse 组合：断点值同样应用 reverse', () => {
    const el = mount({ direction: 'column md:row', reverse: '' })
    expect(el.style.flexDirection).toBe('var(--oas-space-direction, column-reverse)')
    const css = el.shadowRoot!.querySelector('style[data-oas-space-breakpoints]')!.textContent!
    expect(css).toContain('--oas-space-direction: row-reverse')
  })

  it('size 断点值支持逗号 pair：横向/纵向分别切换', () => {
    const el = mount({ size: '8,16 md:24,48' })
    expect(el.style.columnGap).toBe('var(--oas-space-column-gap, 8px)')
    expect(el.style.rowGap).toBe('var(--oas-space-row-gap, 16px)')
    const css = el.shadowRoot!.querySelector('style[data-oas-space-breakpoints]')!.textContent!
    expect(css).toContain(
      '@media (min-width: 768px) { :host { --oas-space-column-gap: 24px; --oas-space-row-gap: 48px } }',
    )
  })

  it('无断点纯值不生成 @media 规则（保持原内联直写）；移除断点后规则清空', () => {
    const el = mount({ direction: 'vertical', size: 'large' })
    expect(el.style.flexDirection).toBe('column')
    expect(el.style.columnGap).toBe('var(--oas-space-5)')
    const styleEl = el.shadowRoot!.querySelector('style[data-oas-space-breakpoints]')!
    expect(styleEl.textContent).toBe('')
    // 先带断点再移除：规则清空、回内联直写
    el.setAttribute('direction', 'column md:row')
    expect(styleEl.textContent).toContain('@media (min-width: 768px)')
    el.setAttribute('direction', 'vertical')
    expect(el.style.flexDirection).toBe('column')
    expect(styleEl.textContent).toBe('')
  })

  it('非法断点名：丢弃该断点 + dev 告警（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ direction: 'column foo:row' })
    expect(el.style.flexDirection).toBe('var(--oas-space-direction, column)')
    const css = el.shadowRoot!.querySelector('style[data-oas-space-breakpoints]')!.textContent!
    expect(css).toBe('')
    el.setAttribute('direction', 'column foo:row')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    el.remove()
  })

  it('非法断点值：回落基础值 + dev 告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ direction: 'column md:diagonal' })
    const css = el.shadowRoot!.querySelector('style[data-oas-space-breakpoints]')!.textContent!
    expect(css).toContain('@media (min-width: 768px) { :host { --oas-space-direction: column } }')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    el.remove()
  })

  it('SSR 快照含 @media 规则：shadow 样式与宿主 var() 兜底一并序列化', () => {
    const el = mount({ direction: 'column md:row', size: 'small md:large' })
    // 序列化 shadow 内容（renderToString 对 shadowRoot.innerHTML 原样输出；
    // happy-dom 序列化带属性 style 为 `style data-oas-space-breakpoints=""`）
    const shadowHtml = el.shadowRoot!.innerHTML
    expect(shadowHtml).toContain('style data-oas-space-breakpoints')
    expect(shadowHtml).toContain('@media (min-width: 768px)')
    expect(shadowHtml).toContain('--oas-space-column-gap: var(--oas-space-5)')
    // 序列化宿主 style 属性（renderToString 遍历 el.attributes 输出）
    const styleAttr = el.getAttribute('style')!
    expect(styleAttr).toContain('flex-direction: var(--oas-space-direction, column)')
    expect(styleAttr).toContain('column-gap: var(--oas-space-column-gap, var(--oas-space-2))')
    expect(styleAttr).toContain('row-gap: var(--oas-space-row-gap, var(--oas-space-2))')
  })
})
