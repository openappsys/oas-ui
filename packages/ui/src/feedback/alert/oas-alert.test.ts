import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASAlert } from './index.js'

function mount(attrs: Record<string, string> = {}, inner = '这是提示内容'): OASAlert {
  const el = new OASAlert()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = inner
  document.body.appendChild(el)
  return el
}

/** 等退场动画结束（CLOSE_ANIM_MS=200，取 260 裕量） */
function waitClose(): Promise<void> {
  return new Promise((r) => setTimeout(r, 260))
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

  it('error 类型 role=alert，其余类型 role=status', () => {
    const el = mount({ type: 'error' })
    expect(el.shadowRoot!.querySelector('[role="alert"]')).not.toBeNull()
    el.setAttribute('type', 'warning')
    expect(el.shadowRoot!.querySelector('[part="box"]')!.getAttribute('role')).toBe('status')
    el.setAttribute('type', 'info')
    expect(el.shadowRoot!.querySelector('[part="box"]')!.getAttribute('role')).toBe('status')
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

  describe('P1 图标（icon）', () => {
    it('icon 属性显示默认 type 图标（SVG）', () => {
      const el = mount({ icon: '' })
      const icon = el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!
      expect(icon.hidden).toBe(false)
      expect(icon.querySelector('svg')).not.toBeNull()
    })

    it('无 icon 属性不显示图标', () => {
      const el = mount()
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!.hidden).toBe(true)
    })

    it('type→图标映射：info 与 success 渲染不同图标', () => {
      const info = mount({ icon: '', type: 'info' })
      const ok = mount({ icon: '', type: 'success' })
      const a = info.shadowRoot!.querySelector('.icon-default')!.innerHTML
      const b = ok.shadowRoot!.querySelector('.icon-default')!.innerHTML
      expect(a.length).toBeGreaterThan(0)
      expect(a).not.toBe(b)
    })

    it('slot=icon 覆盖默认图标（fallback 隐藏）', () => {
      const el = mount({ icon: '' })
      el.innerHTML = '<span slot="icon">★</span>'
      const icon = el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!
      const fallback = icon.querySelector('.icon-default') as HTMLElement
      const slot = icon.querySelector('slot[name="icon"]') as HTMLSlotElement
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
    })

    it('仅 slot=icon 无 icon 属性也显示（显式自定义图标）', () => {
      const el = mount()
      el.innerHTML = '<span slot="icon">★</span>'
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!.hidden).toBe(false)
    })

    it('动态移除 slot=icon 后回落默认图标', async () => {
      const el = mount({ icon: '' })
      el.innerHTML = '<span slot="icon">★</span>'
      const fallback = el.shadowRoot!.querySelector('.icon-default') as HTMLElement
      expect(fallback.hidden).toBe(true)
      const node = el.querySelector('span[slot="icon"]')!
      el.removeChild(node)
      await new Promise((r) => setTimeout(r, 0))
      expect(fallback.hidden).toBe(false)
    })
  })

  describe('P2 操作区（slot=action）', () => {
    it('action 操作区渲染且在关闭按钮之前', () => {
      const el = mount({ closeable: '' })
      el.innerHTML = '<button slot="action">查看详情</button>'
      const box = el.shadowRoot!.querySelector('[part="box"]')!
      const actionSlot = box.querySelector('slot[name="action"]') as HTMLSlotElement
      const actionEl = box.querySelector('[part="actions"]')!
      const closeEl = box.querySelector('[part="close"]')!
      expect(actionSlot.assignedNodes().length).toBeGreaterThan(0)
      expect((actionSlot.assignedNodes()[0] as HTMLElement).textContent).toBe('查看详情')
      // action 在 close 之前
      expect(Array.from(box.children).indexOf(actionEl)).toBeLessThan(
        Array.from(box.children).indexOf(closeEl),
      )
    })

    it('无 action 时操作区为空（零孤儿）', () => {
      const el = mount()
      expect(el.shadowRoot!.querySelector('[part="actions"]')!.textContent).toBe('')
    })
  })

  describe('P3 描述（description）', () => {
    it('description 属性渲染描述，移除后隐藏', () => {
      const el = mount({ description: '请检查网络设置' })
      const desc = el.shadowRoot!.querySelector('[part="description"]') as HTMLElement
      expect(desc.hidden).toBe(false)
      expect(desc.querySelector('.description-text')!.textContent).toBe('请检查网络设置')
      el.removeAttribute('description')
      expect(desc.hidden).toBe(true)
    })

    it('无 title 无 description 无正文：描述区隐藏（empty 态）', () => {
      const el = mount({}, '')
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!.hidden).toBe(true)
      expect(el.shadowRoot!.querySelector('.title-text')!.textContent).toBe('')
    })

    it('slot=description 覆盖属性描述', () => {
      const el = mount({ description: '属性描述' })
      el.innerHTML = '<span slot="description">插槽描述</span><p>正文</p>'
      const slot = el.shadowRoot!.querySelector('slot[name="description"]') as HTMLSlotElement
      const fallback = el.shadowRoot!.querySelector('.description-text') as HTMLElement
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
    })

    it('描述与默认插槽正文并存', () => {
      const el = mount({ description: '描述文本' }, '<p>正文内容</p>')
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!.hidden).toBe(false)
      expect(el.shadowRoot!.querySelector('[part="body"]')!.querySelector('slot')).not.toBeNull()
      expect(el.textContent).toContain('正文内容')
    })
  })

  describe('P4 变体（variant）', () => {
    it('默认 tint，filled/outlined 同步 data-variant', () => {
      const el = mount()
      const box = el.shadowRoot!.querySelector('[part="box"]')!
      expect(box.getAttribute('data-variant')).toBe('tint')
      el.setAttribute('variant', 'filled')
      expect(box.getAttribute('data-variant')).toBe('filled')
      el.setAttribute('variant', 'outlined')
      expect(box.getAttribute('data-variant')).toBe('outlined')
      el.removeAttribute('variant')
      expect(box.getAttribute('data-variant')).toBe('tint')
    })

    it('非法 variant 回落 tint 并 console.warn', () => {
      const el = mount()
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      el.setAttribute('variant', 'weird-variant')
      expect(el.shadowRoot!.querySelector('[part="box"]')!.getAttribute('data-variant')).toBe('tint')
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('CSS 含三变体规则（tint 底色 / filled 实心 / outlined 描边），颜色只走 token', () => {
      const el = mount()
      const css = el.shadowRoot!.querySelector('style')!.textContent
      expect(css).toContain("data-variant='filled'")
      expect(css).toContain("data-variant='outlined'")
      expect(css).toContain('var(--oas-color-text-on-primary)')
      expect(css).toContain('var(--oas-color-text-on-success)')
      expect(css).toContain('var(--oas-color-text-on-warning)')
      expect(css).toContain('var(--oas-color-text-on-danger)')
    })
  })

  describe('P5 横幅（banner）', () => {
    it('banner 默认显示图标（联动 P1）', () => {
      const el = mount({ banner: '' })
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!.hidden).toBe(false)
    })

    it('banner CSS：去边框圆角、通栏', () => {
      const el = mount({ banner: '' })
      const css = el.shadowRoot!.querySelector('style')!.textContent
      expect(css).toMatch(/:host\(\[banner\]\)\s*\.box\s*\{[^}]*border-radius:\s*0/)
      expect(css).toMatch(/:host\(\[banner\]\)\s*\.box\s*\{[^}]*border/)
    })
  })

  describe('P6 关闭动画', () => {
    it('点击关闭：同步置 hidden 并进入退场过渡（data-closing）', () => {
      const el = mount({ closeable: '' })
      ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
      expect(el.hidden).toBe(true)
      expect(el.hasAttribute('data-closing')).toBe(true)
      // 退场期间宿主仍可见（[hidden][data-closing] 解除隐藏，播放淡出）
      const css = el.shadowRoot!.querySelector('style')!.textContent
      expect(css).toMatch(/:host\(\[hidden\]\[data-closing\]\)\s*\{[^}]*display:\s*block/)
    })

    it('过渡结束：移除 open、派发 oas-open-change(false) 与 oas-after-close', async () => {
      const el = mount({ closeable: '', open: '' })
      const events: string[] = []
      el.addEventListener('oas-after-close', () => events.push('after-close'))
      el.addEventListener('oas-open-change', (e) => {
        events.push(`open-change:${(e as CustomEvent).detail.open}`)
      })
      ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
      await waitClose()
      expect(events).toEqual(['open-change:false', 'after-close'])
      expect(el.hasAttribute('open')).toBe(false)
      expect(el.hidden).toBe(true)
      expect(el.hasAttribute('data-closing')).toBe(false)
    })

    it('关闭中重复点击不重复派发 oas-close', () => {
      const el = mount({ closeable: '' })
      let n = 0
      el.addEventListener('oas-close', () => n++)
      const btn = el.shadowRoot!.querySelector('[part="close"]') as HTMLElement
      btn.click()
      btn.click()
      expect(n).toBe(1)
    })

    it('prefers-reduced-motion 跳过过渡直接隐藏并派发事件', async () => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }))
      const el = mount({ closeable: '' })
      const events: string[] = []
      el.addEventListener('oas-after-close', () => events.push('after-close'))
      el.addEventListener('oas-open-change', (e) => {
        events.push(`open-change:${(e as CustomEvent).detail.open}`)
      })
      ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
      expect(el.hidden).toBe(true)
      expect(el.hasAttribute('data-closing')).toBe(false)
      expect(events).toEqual(['open-change:false', 'after-close'])
      vi.unstubAllGlobals()
    })
  })

  describe('P7 关闭自定义（close-text / slot=close）', () => {
    it('close-text 替换 ✕ 文案与 aria-label', () => {
      const el = mount({ closeable: '', 'close-text': '收起' })
      const close = el.shadowRoot!.querySelector('[part="close"]')!
      expect(close.querySelector('.close-text')!.textContent).toBe('收起')
      expect(close.getAttribute('aria-label')).toBe('收起')
    })

    it('默认 ✕ 文案 + locale aria-label', () => {
      const el = mount({ closeable: '' })
      const close = el.shadowRoot!.querySelector('[part="close"]')!
      expect(close.querySelector('.close-text')!.textContent).toBe('✕')
      expect(close.getAttribute('aria-label')).toBe('关闭')
    })

    it('slot=close 富自定义覆盖按钮内容', () => {
      const el = mount({ closeable: '' })
      el.innerHTML = '<span slot="close">移除提示</span>'
      const close = el.shadowRoot!.querySelector('[part="close"]')!
      expect(close.querySelector<HTMLSlotElement>('slot[name="close"]')!.assignedNodes().length).toBeGreaterThan(0)
    })
  })

  describe('P8 居中（center）', () => {
    it('center 同步 data-center，CSS 文本居中', () => {
      const el = mount({ center: '' })
      const box = el.shadowRoot!.querySelector('[part="box"]')!
      expect(box.hasAttribute('data-center')).toBe(true)
      const css = el.shadowRoot!.querySelector('style')!.textContent
      expect(css).toContain('text-align: center')
      el.removeAttribute('center')
      expect(box.hasAttribute('data-center')).toBe(false)
    })
  })

  describe('P9 受控显隐（open）', () => {
    it('挂载不派发 oas-open-change（默认开）', () => {
      const el = new OASAlert()
      let oc = 0
      el.addEventListener('oas-open-change', () => oc++)
      document.body.appendChild(el)
      expect(oc).toBe(0)
    })

    it('宿主重设 open 重开并派发 oas-open-change(open:true)', async () => {
      const el = mount({ closeable: '' })
      ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
      await waitClose()
      expect(el.hidden).toBe(true)
      const oc: boolean[] = []
      el.addEventListener('oas-open-change', (e) => oc.push((e as CustomEvent).detail.open))
      el.setAttribute('open', '')
      expect(el.hidden).toBe(false)
      expect(oc).toEqual([true])
    })

    it('受控：宿主移除 open 播放退场并落关闭态', async () => {
      const el = mount({ open: '' })
      el.removeAttribute('open')
      expect(el.hasAttribute('data-closing')).toBe(true)
      await waitClose()
      expect(el.hidden).toBe(true)
      expect(el.hasAttribute('open')).toBe(false)
    })

    it('退场动画期间宿主重开：取消隐藏、open 保持在场', async () => {
      const el = mount({ closeable: '', open: '' })
      ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
      el.setAttribute('open', '') // 动画期间重开
      await waitClose()
      expect(el.hidden).toBe(false)
      expect(el.hasAttribute('open')).toBe(true)
      expect(el.hasAttribute('data-closing')).toBe(false)
    })
  })

  describe('P10 折叠（max-line）', () => {
    it('max-line 折叠正文（line-clamp）+ 展开/收起切换', () => {
      const el = mount({ 'max-line': '2' }, '<p>很长很长很长的正文内容用于折叠演示</p>')
      const body = el.shadowRoot!.querySelector('.body') as HTMLElement
      expect(body.classList.contains('clamped')).toBe(true)
      expect(body.style.getPropertyValue('-webkit-line-clamp')).toBe('2')
      const toggle = el.shadowRoot!.querySelector('[part="toggle"]') as HTMLButtonElement
      expect(toggle.hidden).toBe(false)
      expect(toggle.textContent).toBe('展开')
      toggle.click()
      expect(body.classList.contains('clamped')).toBe(false)
      expect(toggle.textContent).toBe('收起')
      toggle.click()
      expect(body.classList.contains('clamped')).toBe(true)
      expect(toggle.textContent).toBe('展开')
    })

    it('无 max-line 不显示展开按钮（empty 边界）', () => {
      const el = mount()
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!.hidden).toBe(true)
    })

    it('非法 max-line 不折叠、不显示按钮', () => {
      const el = mount({ 'max-line': 'abc' })
      expect(el.shadowRoot!.querySelector('.body')!.classList.contains('clamped')).toBe(false)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!.hidden).toBe(true)
    })
  })

  describe('P11 大图标（prominent）', () => {
    it('prominent 需与 icon 联动才显示图标（单独存在不显示）', () => {
      const el = mount({ prominent: '' })
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!.hidden).toBe(true)
    })

    it('icon + prominent：CSS 含放大规则、box 同步 data-prominent', () => {
      const el = mount({ icon: '', prominent: '' })
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!.hidden).toBe(false)
      const css = el.shadowRoot!.querySelector('style')!.textContent
      expect(css).toMatch(/:host\(\[prominent\]\)/)
      expect(el.shadowRoot!.querySelector('[part="box"]')!.hasAttribute('data-prominent')).toBe(
        true,
      )
    })
  })

  describe('P12 色条（border）', () => {
    it('border 多侧同步 data-accent，CSS 含四侧规则', () => {
      const el = mount({ border: 'top end' })
      const box = el.shadowRoot!.querySelector('[part="box"]')!
      expect(box.getAttribute('data-accent')).toBe('top end')
      const css = el.shadowRoot!.querySelector('style')!.textContent
      expect(css).toMatch(/\[border~='top'\]/)
      expect(css).toMatch(/\[border~='bottom'\]/)
      expect(css).toMatch(/\[border~='start'\]/)
      expect(css).toMatch(/\[border~='end'\]/)
    })

    it('无 border 时 data-accent 为空', () => {
      const el = mount()
      expect(el.shadowRoot!.querySelector('[part="box"]')!.getAttribute('data-accent')).toBe('')
    })
  })

  describe('P13 尺寸（size）', () => {
    it('size small/medium/large 同步 data-size', () => {
      const el = mount({ size: 'large' })
      const box = el.shadowRoot!.querySelector('[part="box"]')!
      expect(box.getAttribute('data-size')).toBe('large')
      el.setAttribute('size', 'small')
      expect(box.getAttribute('data-size')).toBe('small')
      el.setAttribute('size', 'medium')
      expect(box.getAttribute('data-size')).toBe('medium')
      el.removeAttribute('size')
      expect(box.getAttribute('data-size')).toBe('medium')
    })

    it('非法 size 回落 medium 并 console.warn', () => {
      const el = mount()
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      el.setAttribute('size', 'huge-size')
      expect(el.shadowRoot!.querySelector('[part="box"]')!.getAttribute('data-size')).toBe('medium')
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe('水合与新能力共存', () => {
    it('水合后 icon/description/border 状态在 update 后保持', () => {
      const ref = new OASAlert()
      ref.setAttribute('icon', '')
      ref.setAttribute('type', 'error')
      ref.setAttribute('description', '水合描述')
      ref.setAttribute('border', 'top')
      document.body.appendChild(ref)
      const snap = ref.shadowRoot!.innerHTML
      ref.remove()

      const el = new OASAlert()
      el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-alert" data-oas-ssr-v="1">${snap}`
      el.setAttribute('icon', '')
      el.setAttribute('type', 'error')
      el.setAttribute('description', '水合描述')
      el.setAttribute('border', 'top')
      document.body.appendChild(el)
      const box = el.shadowRoot!.querySelector('[part="box"]')!
      expect(box.getAttribute('data-type')).toBe('error')
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!.hidden).toBe(false)
      expect(el.shadowRoot!.querySelector('.description-text')!.textContent).toBe('水合描述')
      expect(box.getAttribute('data-accent')).toBe('top')
      el.remove()
    })
  })
})
