import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASToggleButton } from './index.js'

function mount(attrs: Record<string, string> = {}): OASToggleButton {
  const el = new OASToggleButton()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function btn(el: OASToggleButton): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button')!
}

describe('OASToggleButton', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 button，role=button 且 aria-pressed 默认 false', async () => {
    const el = mount()
    await Promise.resolve()
    expect(btn(el).getAttribute('role')).toBe('button')
    expect(btn(el).getAttribute('aria-pressed')).toBe('false')
  })

  it('pressed 属性驱动 aria-pressed 与按下态', () => {
    const el = mount({ pressed: '' })
    expect(btn(el).getAttribute('aria-pressed')).toBe('true')
  })

  it('点击切换 pressed 并派发 oas-change（含 value/pressed）', () => {
    const el = mount({ value: 'bold' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    btn(el).click()
    expect(el.hasAttribute('pressed')).toBe(true)
    expect(btn(el).getAttribute('aria-pressed')).toBe('true')
    expect(detail).toEqual({ value: 'bold', pressed: true })
    btn(el).click()
    expect(detail).toEqual({ value: 'bold', pressed: false })
    expect(el.hasAttribute('pressed')).toBe(false)
  })

  it('disabled 时不可切换', () => {
    const el = mount({ disabled: '' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    btn(el).click()
    expect(detail).toBeUndefined()
    expect(btn(el).getAttribute('aria-pressed')).toBe('false')
  })

  it('属性变化增量更新且不重建按钮引用', () => {
    const el = mount()
    const b = btn(el)
    el.setAttribute('pressed', '')
    expect(btn(el)).toBe(b)
    expect(btn(el).getAttribute('aria-pressed')).toBe('true')
  })
})

describe('OASToggleButton 尺寸档（size）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('size 镜像 data-size：small/large 生效，缺省 medium', () => {
    expect(mount({ size: 'small' }).getAttribute('data-size')).toBe('small')
    expect(mount({ size: 'large' }).getAttribute('data-size')).toBe('large')
    expect(mount().getAttribute('data-size')).toBe('medium')
  })

  it('非法 size 回落 medium', () => {
    expect(mount({ size: 'huge' }).getAttribute('data-size')).toBe('medium')
  })

  it('就近读取 config-provider 注入的 size（自身未显式设置时）', () => {
    const provider = document.createElement('oas-config-provider')
    provider.setAttribute('size', 'small')
    document.body.appendChild(provider)
    const el = new OASToggleButton()
    provider.appendChild(el)
    expect(el.getAttribute('data-size')).toBe('small')
  })

  it('自身显式 size 优先于 provider 注入', () => {
    const provider = document.createElement('oas-config-provider')
    provider.setAttribute('size', 'small')
    document.body.appendChild(provider)
    const el = new OASToggleButton()
    el.setAttribute('size', 'large')
    provider.appendChild(el)
    expect(el.getAttribute('data-size')).toBe('large')
  })

  it('CSS：size 档控高/字号走 control-height/font-size token', () => {
    const css = mount().shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toMatch(/:host\(\[data-size='small'\]\) button\s*{[^}]*--oas-control-height-sm[^}]*--oas-font-size-sm/)
    expect(css).toMatch(/:host\(\[data-size='large'\]\) button\s*{[^}]*--oas-control-height-lg[^}]*--oas-font-size-lg/)
  })
})

describe('OASToggleButton 图标（icon / icon-only）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** 带文本内容挂载（textContent 经 appendChild 设置） */
  function mountText(text: string, attrs: Record<string, string> = {}): OASToggleButton {
    const el = new OASToggleButton()
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.textContent = text
    document.body.appendChild(el)
    return el
  }

  it('icon 渲染 iconRegistry 内联 SVG（装饰性 aria-hidden）+ has-icon 布局类', () => {
    const el = mountText('收藏', { icon: 'star' })
    const b = btn(el)
    expect(b.classList.contains('has-icon')).toBe(true)
    const icon = b.querySelector('.icon')!
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    const svg = icon.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('0 0 16 16')
  })

  it('有文字时不设 aria-label（可见文本即可访问名）', () => {
    const el = mountText('收藏', { icon: 'star' })
    expect(btn(el).getAttribute('aria-label')).toBe(null)
  })

  it('纯图标（无文字）：icon-only 等宽类 + aria-label 兜底图标名', () => {
    const el = mountText('', { icon: 'star' })
    const b = btn(el)
    expect(b.classList.contains('icon-only')).toBe(true)
    expect(b.getAttribute('aria-label')).toBe('star')
  })

  it('宿主 aria-label 覆盖图标名兜底', () => {
    const el = mountText('', { icon: 'star', 'aria-label': '收藏' })
    expect(btn(el).getAttribute('aria-label')).toBe('收藏')
  })

  it('非法图标名：不渲染图标、无 has-icon/icon-only 类', () => {
    const el = mountText('', { icon: 'not-exist' })
    const b = btn(el)
    expect(b.classList.contains('has-icon')).toBe(false)
    expect(b.classList.contains('icon-only')).toBe(false)
    expect(b.querySelector('.icon svg')).toBe(null)
    expect(b.getAttribute('aria-label')).toBe(null)
  })

  it('CSS：icon-only 等宽正方形 + 图标文字间距', () => {
    const css = mount().shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toMatch(/button\.icon-only\s*{[^}]*aspect-ratio:\s*1/)
    expect(css).toMatch(/button\.has-icon\s*{[^}]*gap/)
  })
})

describe('OASToggleButton 选中色（color，ui-spec 三级协议）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('预设名解析为 var(--oas-preset-*) 注入 --oas-toggle-color', () => {
    const el = mount({ color: 'purple' })
    expect(el.style.getPropertyValue('--oas-toggle-color')).toBe('var(--oas-preset-purple)')
  })

  it('字面色原值注入 + 暗底 on-color 取白', () => {
    const el = mount({ color: '#7c3aed' })
    expect(el.style.getPropertyValue('--oas-toggle-color')).toBe('#7c3aed')
    expect(el.style.getPropertyValue('--oas-toggle-on-color')).toBe('#ffffff')
  })

  it('亮底 on-color 取深字', () => {
    const el = mount({ color: '#e5e7eb' })
    expect(el.style.getPropertyValue('--oas-toggle-on-color')).toBe('#18181b')
  })

  it('移除 color 后清理内联变量', () => {
    const el = mount({ color: '#7c3aed' })
    el.removeAttribute('color')
    expect(el.style.getPropertyValue('--oas-toggle-color')).toBe('')
    expect(el.style.getPropertyValue('--oas-toggle-on-color')).toBe('')
  })

  it('CSS：pressed 选中态引用 --oas-toggle-color（含主色兜底）', () => {
    const css = mount().shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toMatch(/button\[aria-pressed='true'\]\s*{[^}]*var\(--oas-toggle-color,\s*var\(--oas-color-primary\)\)/)
  })
})

describe('OASToggleButton 校验态（status）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('status 镜像 data-status', () => {
    expect(mount({ status: 'success' }).getAttribute('data-status')).toBe('success')
    expect(mount({ status: 'warning' }).getAttribute('data-status')).toBe('warning')
    expect(mount().getAttribute('data-status')).toBe(null)
  })

  it('error 联动 aria-invalid，移除 status 后还原', () => {
    const el = mount({ status: 'error' })
    expect(el.getAttribute('aria-invalid')).toBe('true')
    el.setAttribute('status', 'success')
    expect(el.getAttribute('aria-invalid')).toBe(null)
    el.removeAttribute('status')
    expect(el.getAttribute('data-status')).toBe(null)
  })

  it('宿主自设 aria-invalid 不被 status 清理（所有权标志）', () => {
    const el = mount()
    el.setAttribute('aria-invalid', 'true')
    el.setAttribute('status', 'success')
    expect(el.getAttribute('aria-invalid')).toBe('true')
    el.removeAttribute('status')
    expect(el.getAttribute('aria-invalid')).toBe('true')
  })

  it('CSS：data-status 三色边框规则存在', () => {
    const css = mount().shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toMatch(/:host\(\[data-status='success'\]\) button\s*{[^}]*--oas-color-success/)
    expect(css).toMatch(/:host\(\[data-status='warning'\]\) button\s*{[^}]*--oas-color-warning/)
    // error 与宿主 aria-invalid 等效通道并列（选择器列表），匹配时允许逗号续行
    expect(css).toMatch(/:host\(\[data-status='error'\]\) button[^{]*{[^}]*--oas-color-danger/)
  })
})
