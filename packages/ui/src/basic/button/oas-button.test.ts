import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASButton } from './index.js'
import '../../framework/config-provider/index.js'

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

  it('autofocus：挂载后聚焦内部按钮（原生 autofocus 不穿透 shadow）', async () => {
    const el = mount({ autofocus: '' })
    await new Promise<void>((r) => queueMicrotask(() => r()))
    expect(el.shadowRoot!.activeElement).toBe(shadowBtn(el))
  })

  it('wrap：默认无 wrap class（nowrap），显式属性才加 wrap class', async () => {
    const plain = mount({})
    expect(shadowBtn(plain).classList.contains('wrap')).toBe(false)
    const el = mount({ wrap: '' })
    expect(shadowBtn(el).classList.contains('wrap')).toBe(true)
    expect(OASButton.observedAttributes).toContain('wrap')
  })

  it('color：设置后加 has-color class 并注入 --oas-button-color（无 type 也生效）', async () => {
    const el = mount({ color: '#7c3aed' })
    const btn = shadowBtn(el)
    expect(btn.classList.contains('has-color')).toBe(true)
    expect(btn.style.getPropertyValue('--oas-button-color')).toBe('#7c3aed')
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

  it('size 缩写别名互认：sm/md/lg 等价 small/medium/large 且不告警（shared/size）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const pairs = [
      ['sm', 'small'],
      ['md', 'medium'],
      ['lg', 'large'],
    ] as const
    for (const [abbr, full] of pairs) {
      const el = mount({ size: abbr })
      expect(shadowBtn(el).classList.contains(full)).toBe(true)
      el.remove()
    }
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
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

describe('variant / color / wave / auto-insert-space', () => {
  const mountV = (attrs: Record<string, string> = {}): OASButton => {
    const el = document.createElement('oas-button') as OASButton
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.textContent = '按钮'
    document.body.appendChild(el)
    return el
  }

  it('variant=outlined 应用 outlined class', async () => {
    const el = mountV({ variant: 'outlined', type: 'primary' })
    await flush()
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn.classList.contains('outlined')).toBe(true)
    expect(btn.classList.contains('primary')).toBe(true)
    el.remove()
  })

  it('variant=dashed / filled / text / link 应用对应 class', async () => {
    for (const v of ['dashed', 'filled', 'text', 'link']) {
      const el = mountV({ variant: v })
      await flush()
      const btn = el.shadowRoot!.querySelector('button')!
      expect(btn.classList.contains(v), `variant=${v} 应有 ${v} class`).toBe(true)
      el.remove()
    }
  })

  it('variant 缺省为 solid（不加 variant class）', async () => {
    const el = mountV({ type: 'primary' })
    await flush()
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn.classList.contains('solid')).toBe(false)
    expect(btn.classList.contains('outlined')).toBe(false)
    el.remove()
  })

  it('向后兼容：ghost 映射 outlined、plain 映射 filled、type=text 映射 text', async () => {
    const g = mountV({ ghost: '', type: 'primary' })
    await flush()
    expect(g.shadowRoot!.querySelector('button')!.classList.contains('outlined')).toBe(true)
    g.remove()
    const p = mountV({ plain: '', type: 'primary' })
    await flush()
    expect(p.shadowRoot!.querySelector('button')!.classList.contains('filled')).toBe(true)
    p.remove()
    const t = mountV({ type: 'text' })
    await flush()
    expect(t.shadowRoot!.querySelector('button')!.classList.contains('text')).toBe(true)
    t.remove()
  })

  it('显式 variant 优先于旧属性映射', async () => {
    const el = mountV({ ghost: '', variant: 'dashed' })
    await flush()
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn.classList.contains('dashed')).toBe(true)
    expect(btn.classList.contains('outlined')).toBe(false)
    el.remove()
  })

  it('color 属性设置 --oas-button-color 自定义色', async () => {
    const el = mountV({ color: '#7c3aed', type: 'primary' })
    await flush()
    const btn = el.shadowRoot!.querySelector('button') as HTMLElement
    expect(btn.style.getPropertyValue('--oas-button-color')).toBe('#7c3aed')
    el.remove()
  })

  it('wave 默认开（press 反馈 class），wave="false" 关闭', async () => {
    const el = mountV({})
    await flush()
    expect(el.shadowRoot!.querySelector('button')!.classList.contains('wave')).toBe(true)
    el.remove()
    const off = mountV({ wave: 'false' })
    await flush()
    expect(off.shadowRoot!.querySelector('button')!.classList.contains('wave')).toBe(false)
    off.remove()
  })

  it('auto-insert-space：两个连续汉字间插入空格', async () => {
    const el = document.createElement('oas-button') as OASButton
    el.setAttribute('auto-insert-space', '')
    el.textContent = '保存设置'
    document.body.appendChild(el)
    await flush()
    expect(el.textContent).toBe('保 存 设 置')
    el.remove()
  })

  it('auto-insert-space 默认关（不插空格）', async () => {
    const el = document.createElement('oas-button') as OASButton
    el.textContent = '保存设置'
    document.body.appendChild(el)
    await flush()
    expect(el.textContent).toBe('保存设置')
    el.remove()
  })
})

describe('新增能力：icon-end / loading 宽度稳定 / loading-text / loading="auto" / disabled-focusable / download·rel', () => {
  // —— icon-end（尾部图标）——
  it('icon-end：文字后渲染第二个图标（[part="icon-end"]），带 has-icon 类', async () => {
    const el = mount({ icon: 'search', 'icon-end': 'chevron-right' }, '搜索')
    const btn = shadowBtn(el)
    const endIcon = btn.querySelector<HTMLElement>('[part="icon-end"]')
    expect(endIcon).not.toBeNull()
    expect(endIcon!.hidden).toBe(false)
    expect(endIcon!.querySelector('svg')).not.toBeNull()
    expect(btn.classList.contains('has-icon')).toBe(true)
    el.remove()
  })

  it('icon-end：无效图标名隐藏尾部图标', async () => {
    const el = mount({ 'icon-end': 'no-such-icon' }, '保存')
    const endIcon = shadowBtn(el).querySelector<HTMLElement>('[part="icon-end"]')
    expect(endIcon!.hidden).toBe(true)
    el.remove()
  })

  it('icon-end 纯图标（无 icon 无文字）：icon-only + aria-label 兜底取 icon-end 名', async () => {
    const el = mount({ 'icon-end': 'arrow-right' }, '')
    const btn = shadowBtn(el)
    expect(btn.classList.contains('icon-only')).toBe(true)
    expect(btn.getAttribute('aria-label')).toBe('arrow-right')
    el.remove()
  })

  it('icon + icon-end 并存：两个图标都渲染', async () => {
    const el = mount({ icon: 'download', 'icon-end': 'arrow-right' }, '下载')
    const btn = shadowBtn(el)
    const lead = btn.querySelector<HTMLElement>('[part="icon"]')
    const end = btn.querySelector<HTMLElement>('[part="icon-end"]')
    expect(lead!.hidden).toBe(false)
    expect(end!.hidden).toBe(false)
    expect(btn.querySelectorAll('[part="icon"], [part="icon-end"]').length).toBe(2)
    el.remove()
  })

  it('icon-end 属性在 observedAttributes 中', () => {
    expect(OASButton.observedAttributes).toContain('icon-end')
  })

  // —— loading 宽度稳定 + loading-text ——
  it('loading 态：按钮带 loading class，slot 保留占位（不设 hidden/display 移除，宽度不变）', async () => {
    const el = mount({ loading: '' }, '提交')
    const btn = shadowBtn(el)
    const slot = btn.querySelector('slot')
    expect(btn.classList.contains('loading')).toBe(true)
    // 宽度稳定机制：slot 不在 DOM 层移除（仅 CSS visibility 隐藏），保留占位宽度
    expect(slot!.hasAttribute('hidden')).toBe(false)
    el.remove()
  })

  it('loading-text：loading 时显示、非 loading 隐藏；带 loading-with-text class', async () => {
    const el = mount({ loading: '', 'loading-text': '提交中…' }, '提交')
    const btn = shadowBtn(el)
    const text = btn.querySelector<HTMLElement>('.loading-text')
    expect(text!.hidden).toBe(false)
    expect(text!.textContent).toBe('提交中…')
    expect(btn.classList.contains('loading-with-text')).toBe(true)
    // 退出 loading 后隐藏
    el.removeAttribute('loading')
    expect(text!.hidden).toBe(true)
    expect(btn.classList.contains('loading-with-text')).toBe(false)
    el.remove()
  })

  it('loading 但无 loading-text：loading-with-text class 不出现', async () => {
    const el = mount({ loading: '' }, '提交')
    expect(shadowBtn(el).classList.contains('loading-with-text')).toBe(false)
    el.remove()
  })

  it('loading-text 属性在 observedAttributes 中', () => {
    expect(OASButton.observedAttributes).toContain('loading-text')
  })

  // —— loading="auto" ——
  it('loading="auto" 本身不进入 loading（点击后才触发）', async () => {
    const el = mount({ loading: 'auto' }, '保存')
    const btn = shadowBtn(el)
    expect(btn.disabled).toBe(false)
    expect(btn.classList.contains('loading')).toBe(false)
    expect(btn.getAttribute('aria-busy')).toBe('false')
    el.remove()
  })

  it('loading="auto"：宿主 oas-click 返回 Promise 期间进入 loading，resolve 后退出', async () => {
    const el = mount({ loading: 'auto' }, '保存')
    let resolveFn!: () => void
    el.addEventListener(
      'oas-click',
      () =>
        new Promise<void>((r) => {
          resolveFn = r
        }),
    )
    const btn = shadowBtn(el)
    btn.click()
    // 同步进入 loading：禁用 + loading class + aria-busy
    expect(btn.disabled).toBe(true)
    expect(btn.classList.contains('loading')).toBe(true)
    expect(btn.getAttribute('aria-busy')).toBe('true')
    // loading 期间再点击被拦截（不重复派发）
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    btn.click()
    expect(fired).toBe(0)
    // resolve 后退出 loading
    resolveFn()
    await flush()
    await flush()
    expect(btn.disabled).toBe(false)
    expect(btn.classList.contains('loading')).toBe(false)
    el.remove()
  })

  it('loading="auto"：宿主处理 reject 后也退出 loading', async () => {
    const el = mount({ loading: 'auto' }, '保存')
    let rejectFn!: () => void
    el.addEventListener(
      'oas-click',
      () =>
        new Promise<void>((_, rj) => {
          rejectFn = rj
        }),
    )
    const btn = shadowBtn(el)
    btn.click()
    expect(btn.disabled).toBe(true)
    rejectFn()
    await flush()
    await flush()
    expect(btn.disabled).toBe(false)
    el.remove()
  })

  it('loading="auto"：宿主处理未返回 Promise 时点击后立即退出（不卡 loading）', async () => {
    const el = mount({ loading: 'auto' }, '保存')
    let called = 0
    el.addEventListener('oas-click', () => {
      called++
    })
    const btn = shadowBtn(el)
    btn.click()
    expect(called).toBe(1)
    expect(btn.disabled).toBe(false)
    el.remove()
  })

  // —— disabled-focusable ——
  it('disabled-focusable：不设原生 disabled（可聚焦/可 hover）、aria-disabled=true、带 disabled-focusable class', async () => {
    const el = mount({ 'disabled-focusable': '' }, '登录后可操作')
    const btn = shadowBtn(el)
    expect(btn.disabled).toBe(false)
    expect(btn.getAttribute('aria-disabled')).toBe('true')
    expect(btn.classList.contains('disabled-focusable')).toBe(true)
    el.remove()
  })

  it('disabled-focusable：点击被拦截，不派发 oas-click', async () => {
    const el = mount({ 'disabled-focusable': '' }, '操作')
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    shadowBtn(el).click()
    expect(fired).toBe(0)
    el.remove()
  })

  it('disabled-focusable + href（a 元素）：aria-disabled=true 且点击拦截', async () => {
    const el = mount({ href: '/guide', 'disabled-focusable': '' }, '跳转')
    const a = el.shadowRoot!.querySelector('a[part="button"]')!
    expect(a.getAttribute('aria-disabled')).toBe('true')
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(fired).toBe(0)
    el.remove()
  })

  it('disabled-focusable 属性在 observedAttributes 中', () => {
    expect(OASButton.observedAttributes).toContain('disabled-focusable')
  })

  // —— download / rel 透传 ——
  it('href + download + rel：a 元素透传 download 与 rel', async () => {
    const el = mount({ href: '/file.zip', download: 'report.zip', rel: 'noopener' }, '下载')
    const a = el.shadowRoot!.querySelector('a[part="button"]')!
    expect(a.getAttribute('download')).toBe('report.zip')
    expect(a.getAttribute('rel')).toBe('noopener')
    el.remove()
  })

  it('download（空值布尔）也透传', async () => {
    const el = mount({ href: '/file.zip', download: '' }, '下载')
    const a = el.shadowRoot!.querySelector('a[part="button"]')!
    expect(a.hasAttribute('download')).toBe(true)
    el.remove()
  })

  it('download/rel 属性变化增量同步到 a（不重建 DOM）', async () => {
    const el = mount({ href: '/file.zip', download: 'a.zip' }, '下载')
    const a = el.shadowRoot!.querySelector('a[part="button"]')!
    const before = a
    el.setAttribute('download', 'b.zip')
    el.setAttribute('rel', 'nofollow')
    expect(el.shadowRoot!.querySelector('a[part="button"]')).toBe(before)
    expect(a.getAttribute('download')).toBe('b.zip')
    expect(a.getAttribute('rel')).toBe('nofollow')
    el.removeAttribute('download')
    el.removeAttribute('rel')
    expect(a.hasAttribute('download')).toBe(false)
    expect(a.hasAttribute('rel')).toBe(false)
    el.remove()
  })

  it('download/rel 属性在 observedAttributes 中', () => {
    expect(OASButton.observedAttributes).toContain('download')
    expect(OASButton.observedAttributes).toContain('rel')
  })
})

describe('compound 双行变体（slot="description"）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountCompound(): OASButton {
    const el = new OASButton()
    el.textContent = '主操作'
    const sub = document.createElement('span')
    sub.setAttribute('slot', 'description')
    sub.textContent = '副文本说明'
    el.appendChild(sub)
    document.body.appendChild(el)
    return el
  }

  it('slot="description" 内容渲染进按钮第二行：data-compound 标记 + description 部件含插槽', () => {
    const el = mountCompound()
    expect(el.hasAttribute('data-compound')).toBe(true)
    const btn = shadowBtn(el)
    expect(btn.querySelector('[part="description"]')).not.toBeNull()
    const slot = btn.querySelector<HTMLSlotElement>('slot[name="description"]')!
    expect(slot.assignedNodes().length, '副文本节点分配进 description 插槽').toBe(1)
    expect((slot.assignedNodes()[0] as HTMLElement).textContent).toBe('副文本说明')
    el.remove()
  })

  it('无 description 内容：无 data-compound、description 部件隐藏（零回归）', () => {
    const el = mount({}, '按钮')
    expect(el.hasAttribute('data-compound')).toBe(false)
    const desc = shadowBtn(el).querySelector<HTMLElement>('[part="description"]')!
    expect(desc.hidden, 'description 部件应带 hidden（真实浏览器 UA 规则 display:none）').toBe(true)
    el.remove()
  })

  it('loading 态兼容：loading + description 并存（双行布局保持，spinner 在主行）', () => {
    const el = mountCompound()
    el.setAttribute('loading', '')
    const btn = shadowBtn(el)
    expect(btn.querySelector<HTMLElement>('[part="spinner"]')!.hidden).toBe(false)
    expect(btn.querySelector('[part="description"]')).not.toBeNull()
    el.remove()
  })

  it('空占位 description 元素（无文本无子元素）不触发 compound（无空白第二行）', async () => {
    const el = mount({}, '按钮')
    const empty = document.createElement('span')
    empty.setAttribute('slot', 'description')
    el.appendChild(empty)
    await new Promise((r) => setTimeout(r, 0))
    expect(el.hasAttribute('data-compound'), '空白占位元素不算有内容').toBe(false)
    const desc = shadowBtn(el).querySelector<HTMLElement>('[part="description"]')!
    expect(desc.hidden).toBe(true)
    el.remove()
  })

  it('动态增删 description 子节点：data-compound 跟随切换（slotchange）', async () => {
    const el = mount({}, '按钮')
    expect(el.hasAttribute('data-compound')).toBe(false)
    const sub = document.createElement('span')
    sub.setAttribute('slot', 'description')
    sub.textContent = '后来加的副文本'
    el.appendChild(sub)
    await new Promise((r) => setTimeout(r, 0))
    expect(el.hasAttribute('data-compound')).toBe(true)
    sub.remove()
    await new Promise((r) => setTimeout(r, 0))
    expect(el.hasAttribute('data-compound')).toBe(false)
    el.remove()
  })
})

describe('OASButton 原生表单提交（html-type + form 属性组）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** 挂一个含 name 输入框的原生 form，oas-button 置于 form 内 */
  function mountInForm(buttonAttrs: Record<string, string> = {}): {
    form: HTMLFormElement
    btn: OASButton
    input: HTMLInputElement
  } {
    const form = document.createElement('form')
    const input = document.createElement('input')
    input.name = 'username'
    // defaultValue 走属性（reset 回落目标）；JS 直设 .value 是 dirty value，reset 不会回落
    input.setAttribute('value', 'alice')
    form.appendChild(input)
    const btn = new OASButton()
    for (const [k, v] of Object.entries(buttonAttrs)) btn.setAttribute(k, v)
    btn.textContent = '提交'
    form.appendChild(btn)
    document.body.appendChild(form)
    return { form, btn, input }
  }

  /** 收集表单 submit 事件（测试环境 preventDefault 阻止真实提交） */
  function collectSubmit(form: HTMLFormElement): { events: SubmitEvent[] } {
    const events: SubmitEvent[] = []
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      events.push(e as SubmitEvent)
    })
    return { events }
  }

  it('html-type 属性组进入 observedAttributes', () => {
    for (const name of ['html-type', 'form', 'formaction', 'formmethod', 'formnovalidate', 'formtarget']) {
      expect(OASButton.observedAttributes).toContain(name)
    }
  })

  it('默认（无 html-type）点击不触发表单提交（零破坏）', () => {
    const { form, btn } = mountInForm()
    const { events } = collectSubmit(form)
    shadowBtn(btn).click()
    expect(events.length).toBe(0)
  })

  it('html-type=submit 点击触发原生 submit 事件，submitter 为代理按钮', () => {
    const { form, btn } = mountInForm({ 'html-type': 'submit' })
    const { events } = collectSubmit(form)
    shadowBtn(btn).click()
    expect(events.length).toBe(1)
    const submitter = events[0]!.submitter as HTMLElement | null
    expect(submitter?.hasAttribute('data-oas-form-proxy'), 'submitter 应为组件注入的代理按钮').toBe(true)
  })

  it('点击后 light DOM 无代理残留（代理为点击期临时节点，防宿主框架 textContent 补丁抹除）', () => {
    const { btn } = mountInForm({ 'html-type': 'submit' })
    shadowBtn(btn).click()
    expect(btn.querySelector('button[data-oas-form-proxy]')).toBeNull()
  })

  it('html-type=reset 点击触发表单 reset（输入恢复初始值）', () => {
    const { form, btn, input } = mountInForm({ 'html-type': 'reset' })
    let resetFired = 0
    form.addEventListener('reset', () => resetFired++)
    input.value = 'changed'
    shadowBtn(btn).click()
    expect(resetFired).toBe(1)
    expect(input.value).toBe('alice')
  })

  it('form 属性跨树关联：button 在 form 外，form="id" 指向目标表单也能提交', () => {
    const form = document.createElement('form')
    form.id = 'target-form'
    document.body.appendChild(form)
    const { events } = collectSubmit(form)
    const btn = new OASButton()
    btn.setAttribute('html-type', 'submit')
    btn.setAttribute('form', 'target-form')
    btn.textContent = '外部提交'
    document.body.appendChild(btn)
    shadowBtn(btn).click()
    expect(events.length).toBe(1)
  })

  it('formaction/formmethod/formtarget 镜像到代理 submitter（原生 submitter 机制消费）', () => {
    const { form, btn } = mountInForm({
      'html-type': 'submit',
      formaction: '/search',
      formmethod: 'post',
      formtarget: '_blank',
    })
    const { events } = collectSubmit(form)
    shadowBtn(btn).click()
    expect(events.length).toBe(1)
    const submitter = events[0]!.submitter as HTMLElement
    expect(submitter.getAttribute('formaction')).toBe('/search')
    expect(submitter.getAttribute('formmethod')).toBe('post')
    expect(submitter.getAttribute('formtarget')).toBe('_blank')
  })

  it('formnovalidate：必填输入为空仍触发提交（跳过原生校验）；未设置时校验失败不提交', () => {
    const blocking = mountInForm({ 'html-type': 'submit' })
    blocking.input.value = ''
    blocking.input.required = true
    const blocked = collectSubmit(blocking.form)
    shadowBtn(blocking.btn).click()
    expect(blocked.events.length, '无 formnovalidate 时必填为空阻止提交').toBe(0)

    const skipping = mountInForm({ 'html-type': 'submit', formnovalidate: '' })
    skipping.input.value = ''
    skipping.input.required = true
    const skipped = collectSubmit(skipping.form)
    shadowBtn(skipping.btn).click()
    expect(skipped.events.length, 'formnovalidate 跳过校验照常提交').toBe(1)
  })

  it('disabled / loading 态点击不触发提交', () => {
    const disabled = mountInForm({ 'html-type': 'submit', disabled: '' })
    const d = collectSubmit(disabled.form)
    shadowBtn(disabled.btn).click()
    expect(d.events.length).toBe(0)

    const loading = mountInForm({ 'html-type': 'submit', loading: '' })
    const l = collectSubmit(loading.form)
    shadowBtn(loading.btn).click()
    expect(l.events.length).toBe(0)
  })

  it('href 链接模式（a 元素）：html-type 属性组静默无效', () => {
    const { form, btn } = mountInForm({ href: '/guide', 'html-type': 'submit', formaction: '/search' })
    const { events } = collectSubmit(form)
    const a = btn.shadowRoot!.querySelector('a[part="button"]')!
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(events.length, '链接按钮不桥接表单提交').toBe(0)
  })

  it('html-type 非法值回落 button（不提交）', () => {
    const { form, btn } = mountInForm({ 'html-type': 'danger' })
    const { events } = collectSubmit(form)
    shadowBtn(btn).click()
    expect(events.length).toBe(0)
  })

  it('点击仍派发 oas-click（组件事件与原生提交并存）', () => {
    const { form, btn } = mountInForm({ 'html-type': 'submit' })
    const { events } = collectSubmit(form)
    let fired = 0
    btn.addEventListener('oas-click', () => fired++)
    shadowBtn(btn).click()
    expect(fired).toBe(1)
    expect(events.length).toBe(1)
  })
})

describe('OASButton 全局禁用注入（config-provider disabled）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function inProvider(attrs: Record<string, string> = {}, slot = '注入按钮'): OASButton {
    const cp = document.createElement('oas-config-provider')
    for (const [k, v] of Object.entries(attrs)) cp.setAttribute(k, v)
    const btn = new OASButton()
    btn.textContent = slot
    cp.appendChild(btn)
    document.body.appendChild(cp)
    return btn
  }

  it('provider disabled：按钮无显式 disabled 时继承禁用', () => {
    const btn = inProvider({ disabled: '' })
    expect(shadowBtn(btn).disabled).toBe(true)
  })

  it('provider disabled + disabled-skip：单个按钮逃逸保持可用', () => {
    const btn = inProvider({ disabled: '' })
    btn.setAttribute('disabled-skip', '')
    expect(shadowBtn(btn).disabled).toBe(false)
  })

  it('provider disabled 时点击不派发 oas-click', () => {
    const btn = inProvider({ disabled: '' })
    let fired = false
    btn.addEventListener('oas-click', () => (fired = true))
    shadowBtn(btn).click()
    expect(fired).toBe(false)
  })

  it('provider 移除 disabled 后按钮恢复可点并派发 oas-click', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('disabled', '')
    const btn = new OASButton()
    btn.textContent = '注入按钮'
    cp.appendChild(btn)
    document.body.appendChild(cp)
    expect(shadowBtn(btn).disabled).toBe(true)

    cp.removeAttribute('disabled')
    expect(shadowBtn(btn).disabled).toBe(false)
    let fired = false
    btn.addEventListener('oas-click', () => (fired = true))
    shadowBtn(btn).click()
    expect(fired).toBe(true)
  })
})

describe('OASButton 触控目标（coarse pointer 抬升）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('coarse 媒体查询进样式表：按钮与链接按钮 min-height 走 --oas-touch-target-min', () => {
    const el = new OASButton()
    el.textContent = '按钮'
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('@media (pointer: coarse)')
    expect(css).toContain('var(--oas-touch-target-min, 44px)')
    // 只抬 min-height：padding / 字号 / 圆角规则不被 coarse 块触碰
    expect(css).not.toMatch(/@media \(pointer: coarse\)[\s\S]*padding:/)
  })

  it('触控规则只在 coarse 媒体查询内：fine pointer（PC）样式表零抬升', () => {
    const el = new OASButton()
    el.textContent = '按钮'
    document.body.appendChild(el)
    // 剥离注释后再扫（注释里也提到 token，不算样式规则）
    const css = el.shadowRoot!.querySelector('style')!.textContent!.replace(/\/\*[\s\S]*?\*\//g, '')
    const mediaIdx = css.indexOf('@media (pointer: coarse)')
    expect(mediaIdx).toBeGreaterThan(-1)
    // coarse 块置于样式表末尾：所有触控 token 出现位置都在媒体查询之后（PC 不会命中）
    let idx = -1
    while ((idx = css.indexOf('--oas-touch-target-min', idx + 1)) !== -1) {
      expect(idx).toBeGreaterThan(mediaIdx)
    }
    // 基础按钮仍由固定 height 控制（PC 各档高度不变）
    expect(css).toMatch(/button,\s*a\[part='button'\]\s*\{[^}]*height: var\(--oas-control-height-md\)/)
  })
})
