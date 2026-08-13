import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASButton } from './index.js'

function mount(attrs: Record<string, string> = {}, slot = '按钮'): OASButton {
  const el = new OASButton()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function shadowBtn(el: OASButton): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button')!
}

async function flush(): Promise<void> {
  await Promise.resolve()
}

describe('OASButton', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染默认按钮：类型 default、尺寸 medium、含 slot 文本', async () => {
    const el = mount({}, '保存')
    const btn = shadowBtn(el)
    await flush()
    expect(btn.classList.contains('default')).toBe(true)
    expect(btn.classList.contains('medium')).toBe(true)
    expect(el.textContent).toContain('保存')
    expect(btn.querySelector('slot')).not.toBeNull()
    expect(btn.disabled).toBe(false)
  })

  it('属性映射：type/size 反映到 class', () => {
    const el = mount({ type: 'primary', size: 'large' })
    const btn = shadowBtn(el)
    expect(btn.classList.contains('primary')).toBe(true)
    expect(btn.classList.contains('large')).toBe(true)
  })

  it('size 五档：xs/small/medium/large/xl 均反映到 class', () => {
    for (const s of ['xs', 'small', 'medium', 'large', 'xl'] as const) {
      const el = mount({ size: s })
      expect(shadowBtn(el).classList.contains(s)).toBe(true)
      el.remove()
    }
  })

  it('size 非法值回落 medium 且 dev 下 console.warn 一次（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ size: 'huge' })
    const btn = shadowBtn(el)
    expect(btn.classList.contains('medium')).toBe(true)
    expect(btn.classList.contains('huge')).toBe(false)
    el.setAttribute('size', 'huge')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('oas-button')
    warn.mockRestore()
    el.remove()
  })

  it('disabled 属性使原生按钮禁用', () => {
    const el = mount({ disabled: '' })
    expect(shadowBtn(el).disabled).toBe(true)
  })

  it('loading 态禁用点击并设 aria-busy', () => {
    const el = mount({ loading: '' })
    const btn = shadowBtn(el)
    expect(btn.disabled).toBe(true)
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect(btn.querySelector('.spinner')).not.toBeNull()
  })

  it('点击派发 oas-click 事件（bubbles + composed）', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-click', (e) => {
      detail = (e as CustomEvent).detail
    })
    shadowBtn(el).click()
    expect(detail).toMatchObject({ originalEvent: expect.any(MouseEvent) })
  })

  it('disabled/loading 时点击不派发 oas-click', () => {
    const el = mount({ disabled: '' })
    let fired = false
    el.addEventListener('oas-click', () => (fired = true))
    shadowBtn(el).click()
    expect(fired).toBe(false)
  })

  it('attributeChangedCallback 响应属性变化重新渲染', () => {
    const el = mount()
    el.setAttribute('type', 'danger')
    expect(shadowBtn(el).classList.contains('danger')).toBe(true)
  })

  it('属性变化不重建内部 DOM（增量更新，保持元素引用）', () => {
    const el = mount()
    const before = shadowBtn(el)
    el.setAttribute('type', 'primary')
    el.setAttribute('loading', '')
    expect(shadowBtn(el)).toBe(before)
    expect(before.classList.contains('primary')).toBe(true)
    expect(before.disabled).toBe(true)
    expect(before.getAttribute('aria-busy')).toBe('true')
  })

  it('icon 渲染：按钮内出现 iconRegistry 内联 SVG，带 has-icon 类', () => {
    const el = mount({ icon: 'search' }, '搜索')
    const btn = shadowBtn(el)
    const iconEl = btn.querySelector<HTMLElement>('.icon')
    expect(iconEl).not.toBeNull()
    expect(iconEl!.hidden).toBe(false)
    expect(iconEl!.querySelector('svg')).not.toBeNull()
    expect(btn.classList.contains('has-icon')).toBe(true)
  })

  it('纯图标按钮：等宽 icon-only 类 + aria-label 兜底（取图标名）', () => {
    const el = mount({ icon: 'search' }, '')
    const btn = shadowBtn(el)
    expect(btn.classList.contains('icon-only')).toBe(true)
    expect(btn.getAttribute('aria-label')).toBe('search')
  })

  it('有文字时不再判为纯图标，aria-label 兜底移除', () => {
    const el = mount({ icon: 'check' }, '确认')
    const btn = shadowBtn(el)
    expect(btn.classList.contains('icon-only')).toBe(false)
    expect(btn.hasAttribute('aria-label')).toBe(false)
  })

  it('宿主 aria-label 同步到内部 button', () => {
    const el = mount({ icon: 'close', 'aria-label': '关闭' })
    expect(shadowBtn(el).getAttribute('aria-label')).toBe('关闭')
  })

  it('block 宽度：button 带 block 类，host 声明块级布局', () => {
    const el = mount({ block: '' })
    const btn = shadowBtn(el)
    expect(btn.classList.contains('block')).toBe(true)
    expect(el.hasAttribute('block')).toBe(true)
  })

  it('round 类名：button 带 round 类', () => {
    const el = mount({ round: '' })
    expect(shadowBtn(el).classList.contains('round')).toBe(true)
  })

  it('ghost 类名：button 带 ghost 类', () => {
    const el = mount({ ghost: '' })
    expect(shadowBtn(el).classList.contains('ghost')).toBe(true)
  })

  describe('真水合（hydrate 接管 SSR 快照）', () => {
    /** 用组件自身 template() 产快照内容（保证与客户端渲染结构严格一致），前置指纹 meta */
    function snapshotWith(el: OASButton, fingerprintTag: string): string {
      const template = (el as unknown as { template(): string }).template()
      return `<meta data-oas-ssr="${fingerprintTag}" data-oas-ssr-v="1">${template}`
    }

    it('指纹匹配 + 结构完整：跳过重建、DOM 引用保持、事件已绑定、指纹移除', () => {
      const el = new OASButton()
      el.setAttribute('type', 'primary')
      // 模拟浏览器 upgrade：shadow 里已有 SSR 快照（指纹 + 组件自身 template 结构）
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-button')
      const btn = el.shadowRoot!.querySelector('button')!
      const slot = el.shadowRoot!.querySelector('slot')!
      el.textContent = '确定'
      document.body.appendChild(el)

      // 真水合：render 未重建，button/slot 是同一对象
      expect(el.shadowRoot!.querySelector('button')).toBe(btn)
      expect(el.shadowRoot!.querySelector('slot')).toBe(slot)
      // 指纹移除
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      // 事件已绑定：点击派发 oas-click 一次
      let fired = 0
      el.addEventListener('oas-click', () => fired++)
      btn.click()
      expect(fired).toBe(1)
      // update() 照常执行：类型同步到 class
      expect(btn.classList.contains('primary')).toBe(true)
      el.remove()
    })

    it('指纹 tag 不匹配：回退 render() 重建，行为正确', () => {
      const el = new OASButton()
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-tag')
      const preBtn = el.shadowRoot!.querySelector('button')
      document.body.appendChild(el)

      // 重建后 button 是新对象（非快照里的节点）
      expect(el.shadowRoot!.querySelector('button')).not.toBe(preBtn)
      // 指纹被 innerHTML 清掉
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      // 重建后功能正常
      let fired = 0
      el.addEventListener('oas-click', () => fired++)
      el.shadowRoot!.querySelector('button')!.click()
      expect(fired).toBe(1)
      el.remove()
    })
  })

  describe('circle / icon-position / plain / href', () => {
    it('circle: renders circle class', async () => {
      const el = mount({ icon: 'search', circle: '' }, '')
      const btn = shadowBtn(el)
      expect(btn.classList.contains('circle')).toBe(true)
      el.remove()
    })

    it('icon-position=end: icon-end class', async () => {
      const el = mount({ icon: 'arrow-right', 'icon-position': 'end' })
      expect(shadowBtn(el).classList.contains('icon-end')).toBe(true)
      const el2 = mount({ icon: 'arrow-right' })
      expect(shadowBtn(el2).classList.contains('icon-end')).toBe(false)
      el.remove()
      el2.remove()
    })

    it('plain: renders plain class', async () => {
      const el = mount({ type: 'primary', plain: '' })
      expect(shadowBtn(el).classList.contains('plain')).toBe(true)
      el.remove()
    })

    it('href: renders <a> instead of <button>, carries href/target', async () => {
      const el = mount({ href: '/guide', target: '_blank' })
      const a = el.shadowRoot!.querySelector('a[part="button"]')
      expect(a).not.toBeNull()
      expect(a!.getAttribute('href')).toBe('/guide')
      expect(a!.getAttribute('target')).toBe('_blank')
      expect(el.shadowRoot!.querySelector('button')).toBeNull()
      el.remove()
    })

    it('href + disabled: a uses aria-disabled, click blocked', async () => {
      const el = mount({ href: '/guide', disabled: '' })
      const a = el.shadowRoot!.querySelector('a[part="button"]')!
      expect(a.getAttribute('aria-disabled')).toBe('true')
      let fired = 0
      el.addEventListener('oas-click', () => fired++)
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      expect(fired).toBe(0)
      el.remove()
    })

    it('href removed: rebuilds back to <button>', async () => {
      const el = mount({ href: '/guide' })
      expect(el.shadowRoot!.querySelector('a')).not.toBeNull()
      el.removeAttribute('href')
      await flush()
      expect(el.shadowRoot!.querySelector('button')).not.toBeNull()
      expect(el.shadowRoot!.querySelector('a')).toBeNull()
      el.remove()
    })
  })
})