import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASAvatar } from './index.js'

describe('OASAvatar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('无 src 时显示文字首字符', () => {
    const el = new OASAvatar()
    el.textContent = '张三'
    document.body.appendChild(el)
    expect(el.shadowRoot!.textContent).toContain('张')
  })

  it('text 属性驱动首字符（响应式：宿主运行时改 text 亦刷新）', () => {
    const el = new OASAvatar()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toBe('?')
    el.setAttribute('text', '李') // 运行时改 → attributeChangedCallback 触发重渲染
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toBe('李')
  })

  it('src 时渲染图片', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/avatar.png')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('img')).not.toBeNull()
  })

  it('size 属性生效', () => {
    const el = new OASAvatar()
    el.setAttribute('size', '40')
    document.body.appendChild(el)
    expect(el.style.width).toBe('40px')
  })

  it('locale：默认 alt 随 setLocale 切换，alt 属性优先', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/avatar.png')
    document.body.appendChild(el)
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('img')!
    expect(img.getAttribute('alt')).toBe('头像')

    setLocale(en)
    expect(img.getAttribute('alt')).toBe('Avatar')

    setLocale('zh-CN')
    expect(img.getAttribute('alt')).toBe('头像')
  })

  it('alt 加入观察列表：动态修改立即生效', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/avatar.png')
    document.body.appendChild(el)
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('img')!
    el.setAttribute('alt', '新头像')
    expect(img.getAttribute('alt')).toBe('新头像')
  })
})

describe('OASAvatar badge（徽标叠加）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  function badge(el: OASAvatar): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('[part="badge"]')!
  }

  it('badge 文本徽标：显示在头像上，文本真实可见（非 aria-hidden，屏幕阅读器可读）', () => {
    const el = new OASAvatar()
    el.textContent = '张'
    el.setAttribute('badge', '99+')
    document.body.appendChild(el)
    expect(badge(el).hidden).toBe(false)
    expect(badge(el).textContent).toBe('99+')
    expect(badge(el).hasAttribute('aria-hidden')).toBe(false)
  })

  it('无 badge 属性时徽标隐藏', () => {
    const el = new OASAvatar()
    document.body.appendChild(el)
    expect(badge(el).hidden).toBe(true)
  })

  it('badge 布尔形式（空值）显示小圆点', () => {
    const el = new OASAvatar()
    el.setAttribute('badge', '')
    document.body.appendChild(el)
    expect(badge(el).hidden).toBe(false)
    expect(badge(el).classList.contains('dot')).toBe(true)
    expect(badge(el).textContent).toBe('')
  })

  it('badge-dot 显示小圆点且无文本（优先级高于 badge 文本）', () => {
    const el = new OASAvatar()
    el.setAttribute('badge-dot', '')
    el.setAttribute('badge', '5')
    document.body.appendChild(el)
    expect(badge(el).hidden).toBe(false)
    expect(badge(el).classList.contains('dot')).toBe(true)
    expect(badge(el).textContent).toBe('')
  })

  it('dot 与文本互切：dot 残留的内联 width/padding 不泄漏到文本模式', () => {
    const el = new OASAvatar()
    el.setAttribute('badge-dot', '')
    document.body.appendChild(el)
    expect(badge(el).classList.contains('dot')).toBe(true)
    el.removeAttribute('badge-dot')
    el.setAttribute('badge', '5')
    expect(badge(el).classList.contains('dot')).toBe(false)
    expect(badge(el).textContent).toBe('5')
    expect(badge(el).style.width).toBe('')
    expect(badge(el).style.padding).toBe('')
  })

  it('badge-color 映射语义 class，默认 danger', () => {
    const el = new OASAvatar()
    el.setAttribute('badge', '5')
    document.body.appendChild(el)
    expect(badge(el).classList.contains('color-danger')).toBe(true)
    el.setAttribute('badge-color', 'success')
    expect(badge(el).classList.contains('color-success')).toBe(true)
    expect(badge(el).classList.contains('color-danger')).toBe(false)
    el.setAttribute('badge-color', 'primary')
    expect(badge(el).classList.contains('color-primary')).toBe(true)
    el.setAttribute('badge-color', 'warning')
    expect(badge(el).classList.contains('color-warning')).toBe(true)
    expect(badge(el).classList.contains('color-danger')).toBe(false)
  })

  it('badge-placement 默认 top-right，可切 bottom-right', () => {
    const el = new OASAvatar()
    el.setAttribute('badge', '5')
    document.body.appendChild(el)
    expect(badge(el).classList.contains('placement-top-right')).toBe(true)
    expect(badge(el).classList.contains('placement-bottom-right')).toBe(false)
    el.setAttribute('badge-placement', 'bottom-right')
    expect(badge(el).classList.contains('placement-bottom-right')).toBe(true)
    expect(badge(el).classList.contains('placement-top-right')).toBe(false)
  })

  it('徽标尺寸随头像 size 缩放（32 → 16px，48 → 22px）', () => {
    const el = new OASAvatar()
    el.setAttribute('badge', '5')
    document.body.appendChild(el)
    expect(badge(el).style.height).toBe('16px')
    el.setAttribute('size', '48')
    expect(badge(el).style.height).toBe('22px')
  })

  it('图片头像同样支持徽标', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/avatar.png')
    el.setAttribute('badge', '7')
    document.body.appendChild(el)
    expect(badge(el).hidden).toBe(false)
    expect(badge(el).textContent).toBe('7')
  })
})

describe('OASAvatar fallback（加载失败回退）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  function img(el: OASAvatar): HTMLImageElement {
    return el.shadowRoot!.querySelector<HTMLImageElement>('img')!
  }

  function fb(el: OASAvatar): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('[part="fallback"]')!
  }

  it('图片加载失败回退到内容首字符', () => {
    const el = new OASAvatar()
    el.textContent = '张'
    el.setAttribute('src', '/missing.png')
    document.body.appendChild(el)
    img(el).dispatchEvent(new Event('error'))
    expect(img(el).hidden).toBe(true)
    expect(fb(el).hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!.textContent).toBe('张')
  })

  it('加载失败且无内容时显示 ? 占位', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/missing.png')
    document.body.appendChild(el)
    img(el).dispatchEvent(new Event('error'))
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!.textContent).toBe('?')
  })

  it('fallback 命名插槽内容在失败时显示，首字符隐藏', () => {
    const el = new OASAvatar()
    el.innerHTML = '<span slot="fallback">!</span>'
    el.setAttribute('src', '/missing.png')
    document.body.appendChild(el)
    img(el).dispatchEvent(new Event('error'))
    expect(fb(el).hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!.hidden).toBe(true)
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="fallback"]')!
    expect(slot.assignedNodes().length).toBeGreaterThan(0)
  })

  it('失败状态保持：其他属性变化不恢复图片', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/missing.png')
    document.body.appendChild(el)
    img(el).dispatchEvent(new Event('error'))
    el.setAttribute('badge', '5')
    expect(img(el).hidden).toBe(true)
    expect(fb(el).hidden).toBe(false)
  })

  it('更换 src 重置失败状态并重新尝试加载', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/missing.png')
    document.body.appendChild(el)
    img(el).dispatchEvent(new Event('error'))
    expect(img(el).hidden).toBe(true)
    el.setAttribute('src', '/ok.png')
    expect(img(el).hidden).toBe(false)
    expect(img(el).getAttribute('src')).toBe('/ok.png')
  })

  it('移除 src 后回退到文本占位', () => {
    const el = new OASAvatar()
    el.textContent = '李'
    el.setAttribute('src', '/missing.png')
    document.body.appendChild(el)
    img(el).dispatchEvent(new Event('error'))
    el.removeAttribute('src')
    expect(fb(el).hidden).toBe(false)
    expect(img(el).hidden).toBe(true)
  })

  it('动态补设 src 后渲染图片（模板常驻 img 骨架）', () => {
    const el = new OASAvatar()
    el.textContent = '王'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('img')).not.toBeNull()
    expect(img(el).hidden).toBe(true)
    el.setAttribute('src', '/new.png')
    expect(img(el).hidden).toBe(false)
    expect(img(el).getAttribute('src')).toBe('/new.png')
  })

  it('DSD 真水合：快照含 img 与 fallback 容器时接管成功', () => {
    const ref = new OASAvatar()
    ref.setAttribute('src', '/a.png')
    document.body.appendChild(ref)
    const snap = ref.shadowRoot!.innerHTML
    ref.remove()

    const el = new OASAvatar()
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-avatar" data-oas-ssr-v="1">${snap}`
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector('img')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="fallback"]')).not.toBeNull()
  })
})

describe('OASAvatar shape（形态）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shape 走 :host 属性选择器：square 直角 / round 小圆角 token / 缺省圆形', () => {
    const el = new OASAvatar()
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(':host([shape="square"])')
    expect(css).toContain(':host([shape="round"])')
    expect(css).toMatch(/:host\s*\{[^}]*border-radius:\s*50%/s)
    expect(css).toMatch(/:host\(\[shape="square"\]\)\s*\{[^}]*border-radius:\s*0/s)
    expect(css).toMatch(/:host\(\[shape="round"\]\)\s*\{[^}]*var\(--oas-radius-md\)/s)
  })

  it('img / fallback / trigger 圆角继承宿主（border-radius: inherit）', () => {
    const el = new OASAvatar()
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/img,\s*\.fallback[^{]*\{[^}]*border-radius:\s*inherit/s)
  })
})

describe('OASAvatar size 枚举别名', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('small/medium/large 映射 24/32/40（对齐 ui-spec 尺寸梯度）', () => {
    const el = new OASAvatar()
    document.body.appendChild(el)
    el.setAttribute('size', 'small')
    expect(el.style.width).toBe('24px')
    el.setAttribute('size', 'medium')
    expect(el.style.width).toBe('32px')
    el.setAttribute('size', 'large')
    expect(el.style.width).toBe('40px')
  })

  it('数字用法保留，非法值回落 32', () => {
    const el = new OASAvatar()
    el.setAttribute('size', '56')
    document.body.appendChild(el)
    expect(el.style.width).toBe('56px')
    el.setAttribute('size', 'huge')
    expect(el.style.width).toBe('32px')
  })
})

describe('OASAvatar color（背景色统一协议）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('语义色：映射 token 背景 + on-token 文字色（含 dark 变体）', () => {
    const el = new OASAvatar()
    el.setAttribute('color', 'danger')
    document.body.appendChild(el)
    expect(el.style.getPropertyValue('--oas-avatar-bg')).toBe('var(--oas-color-danger)')
    expect(el.style.getPropertyValue('--oas-avatar-on-color')).toBe('var(--oas-color-text-on-danger)')
    el.setAttribute('color', 'success')
    expect(el.style.getPropertyValue('--oas-avatar-bg')).toBe('var(--oas-color-success)')
  })

  it('预设色板名：解析 --oas-preset-* token', () => {
    const el = new OASAvatar()
    el.setAttribute('color', 'blue')
    document.body.appendChild(el)
    expect(el.style.getPropertyValue('--oas-avatar-bg')).toBe('var(--oas-preset-blue)')
    expect(el.style.getPropertyValue('--oas-avatar-on-color')).toBe('var(--oas-color-text-on-primary)')
  })

  it('任意色值：原值注入，文字色按亮度自动取黑/白（pickOnColor 协议）', () => {
    const el = new OASAvatar()
    el.setAttribute('color', '#ff6b00')
    document.body.appendChild(el)
    expect(el.style.getPropertyValue('--oas-avatar-bg')).toBe('#ff6b00')
    expect(el.style.getPropertyValue('--oas-avatar-on-color')).toBe('#ffffff')
    el.setAttribute('color', '#eeeeee')
    expect(el.style.getPropertyValue('--oas-avatar-on-color')).toBe('#18181b')
  })

  it('无 color 属性时清除变量（回落默认 primary token）', () => {
    const el = new OASAvatar()
    el.setAttribute('color', 'danger')
    document.body.appendChild(el)
    el.removeAttribute('color')
    expect(el.style.getPropertyValue('--oas-avatar-bg')).toBe('')
    expect(el.style.getPropertyValue('--oas-avatar-on-color')).toBe('')
  })
})

describe('OASAvatar fit（图片填充）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('fit 映射 img object-fit，默认 cover 兼容现状', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/a.png')
    document.body.appendChild(el)
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('img')!
    expect(img.style.objectFit).toBe('cover')
    el.setAttribute('fit', 'contain')
    expect(img.style.objectFit).toBe('contain')
    el.setAttribute('fit', 'fill')
    expect(img.style.objectFit).toBe('fill')
  })
})

describe('OASAvatar fallback 回退图链 + oas-error', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function img(el: OASAvatar): HTMLImageElement {
    return el.shadowRoot!.querySelector<HTMLImageElement>('img')!
  }

  it('主图失败且给了 fallback 属性：切换到回退图 URL 并保持可见', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/missing.png')
    el.setAttribute('fallback', '/fallback.png')
    document.body.appendChild(el)
    img(el).dispatchEvent(new Event('error'))
    expect(img(el).getAttribute('src')).toBe('/fallback.png')
    expect(img(el).hidden).toBe(false)
  })

  it('回退图也失败：进入文字回退链、img 隐藏', () => {
    const el = new OASAvatar()
    el.textContent = '张'
    el.setAttribute('src', '/missing.png')
    el.setAttribute('fallback', '/fallback.png')
    document.body.appendChild(el)
    img(el).dispatchEvent(new Event('error'))
    img(el).dispatchEvent(new Event('error'))
    expect(img(el).hidden).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="fallback"]')!.hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!.textContent).toBe('张')
  })

  it('更换 src 重置回退链：再次 error 会重试 fallback URL', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/missing.png')
    el.setAttribute('fallback', '/fallback.png')
    document.body.appendChild(el)
    img(el).dispatchEvent(new Event('error'))
    img(el).dispatchEvent(new Event('error'))
    el.setAttribute('src', '/another.png')
    expect(img(el).hidden).toBe(false)
    img(el).dispatchEvent(new Event('error'))
    expect(img(el).getAttribute('src')).toBe('/fallback.png')
  })

  it('每次加载失败派发 oas-error（detail.src 为失败的 URL，主图与回退图各派一次）', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/missing.png')
    el.setAttribute('fallback', '/fallback.png')
    document.body.appendChild(el)
    const fired: Array<unknown> = []
    el.addEventListener('oas-error', (e) => fired.push((e as CustomEvent).detail))
    img(el).dispatchEvent(new Event('error'))
    img(el).dispatchEvent(new Event('error'))
    expect(fired).toEqual([{ src: '/missing.png' }, { src: '/fallback.png' }])
  })
})

describe('OASAvatar icon 插槽', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('slot="icon" 有内容时显示 icon 层、首字符隐藏（不截首字）', () => {
    const el = new OASAvatar()
    el.textContent = ''
    el.innerHTML = '<svg slot="icon"></svg>'
    document.body.appendChild(el)
    const icon = el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!
    const text = el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!
    expect(icon.hidden).toBe(false)
    expect(text.hidden).toBe(true)
  })

  it('无 icon 插槽时 icon 层隐藏、首字符照常', () => {
    const el = new OASAvatar()
    el.textContent = '张'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!.hidden).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!.hidden).toBe(false)
  })

  it('运行时补插 icon 内容（slotchange）刷新显隐', () => {
    const el = new OASAvatar()
    el.textContent = '张'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!.hidden).toBe(true)
    const svg = document.createElement('span')
    svg.setAttribute('slot', 'icon')
    el.appendChild(svg)
    // slotchange 异步触发
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!.hidden).toBe(false)
        expect(el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!.hidden).toBe(true)
        resolve()
      }, 0)
    })
  })
})

describe('OASAvatar text 多字自适应', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function text(el: OASAvatar): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!
  }

  it('text 多字渲染全量文本（不再截首字）', () => {
    const el = new OASAvatar()
    el.setAttribute('text', '开源实验室')
    document.body.appendChild(el)
    expect(text(el).textContent).toBe('开源实验室')
  })

  it('单字 fontSize 为基准值 max(12, size*0.4)', () => {
    const el = new OASAvatar()
    el.setAttribute('size', '40')
    el.setAttribute('text', '张')
    document.body.appendChild(el)
    expect(text(el).style.fontSize).toBe('16px')
  })

  it('多字超宽时收缩字号（scrollWidth 测量），从基准值递减', () => {
    const el = new OASAvatar()
    el.setAttribute('size', '40')
    el.setAttribute('text', '某某组织')
    document.body.appendChild(el)
    let reads = 0
    Object.defineProperty(text(el), 'scrollWidth', {
      configurable: true,
      get: () => (reads++ < 3 ? 100 : 0),
    })
    el.setAttribute('text', '某某组织!')
    expect(parseFloat(text(el).style.fontSize)).toBeCloseTo(13)
  })

  it('收缩有下限：再宽也不低于 10px', () => {
    const el = new OASAvatar()
    el.setAttribute('size', '64')
    el.setAttribute('text', '极长组织全名超过容器宽度许多')
    document.body.appendChild(el)
    Object.defineProperty(text(el), 'scrollWidth', {
      configurable: true,
      get: () => 9999,
    })
    el.setAttribute('text', '极长组织全名超过容器宽度许多!')
    expect(text(el).style.fontSize).toBe('10px')
  })

  it('text 从多字改回单字：fontSize 恢复基准值', () => {
    const el = new OASAvatar()
    el.setAttribute('size', '40')
    el.setAttribute('text', '某某组织')
    document.body.appendChild(el)
    Object.defineProperty(text(el), 'scrollWidth', {
      configurable: true,
      get: () => 9999,
    })
    el.setAttribute('text', '某某组织!')
    expect(text(el).style.fontSize).toBe('10px')
    el.setAttribute('text', '张')
    expect(text(el).style.fontSize).toBe('16px')
  })

  it('无 text 属性时 textContent 快照仍只取首字符（现状保留）', () => {
    const el = new OASAvatar()
    el.textContent = '开源实验室'
    document.body.appendChild(el)
    expect(text(el).textContent).toBe('开')
  })
})

describe('OASAvatar trigger（换头像入口）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })
  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('slot="trigger" 有节点时遮罩按钮显示（空节点启用默认相机图标）', () => {
    const el = new OASAvatar()
    el.setAttribute('text', '张')
    const holder = document.createElement('span')
    holder.setAttribute('slot', 'trigger')
    el.appendChild(holder)
    document.body.appendChild(el)
    const trigger = el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!
    expect(trigger.hidden).toBe(false)
    expect(trigger.tagName).toBe('BUTTON')
    expect(trigger.getAttribute('aria-label')).toBe('更换头像')
    // 空占位节点：显示默认相机图标（has-content 不置位，.trigger-default 由 CSS 展示）
    expect(trigger.classList.contains('has-content')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="trigger-default"]')).not.toBeNull()
  })

  it('trigger 遮罩有实质内容时隐藏默认相机图标', () => {
    const el = new OASAvatar()
    el.setAttribute('text', '张')
    const holder = document.createElement('span')
    holder.setAttribute('slot', 'trigger')
    holder.textContent = '更换'
    el.appendChild(holder)
    document.body.appendChild(el)
    const trigger = el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!
    expect(trigger.classList.contains('has-content')).toBe(true)
  })

  it('无 trigger 插槽时遮罩隐藏', () => {
    const el = new OASAvatar()
    el.setAttribute('text', '张')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!.hidden).toBe(true)
  })

  it('点击遮罩派发 oas-trigger（上传宿主自理）', () => {
    const el = new OASAvatar()
    el.setAttribute('text', '张')
    const holder = document.createElement('span')
    holder.setAttribute('slot', 'trigger')
    el.appendChild(holder)
    document.body.appendChild(el)
    let fired = 0
    el.addEventListener('oas-trigger', () => fired++)
    el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!.click()
    expect(fired).toBe(1)
  })
})
