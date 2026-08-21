import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASLink } from './index.js'

function mount(attrs: Record<string, string> = {}, slot = '链接'): OASLink {
  const el = new OASLink()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function link(el: OASLink): HTMLAnchorElement {
  return el.shadowRoot!.querySelector('a')!
}

describe('OASLink', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 a 标签，href 透传，含 slot', async () => {
    const el = mount({ href: 'https://example.com' }, '文档')
    const a = link(el)
    await Promise.resolve()
    expect(a.tagName).toBe('A')
    expect(a.getAttribute('href')).toBe('https://example.com')
    expect(el.textContent).toContain('文档')
  })

  it('type 映射 class（default/primary/danger）', () => {
    const el = mount({ href: '#', type: 'primary' })
    expect(link(el).classList.contains('primary')).toBe(true)
  })

  it('underline 属性控制下划线', () => {
    const noUnderline = mount({ href: '#', underline: 'false' })
    expect(link(noUnderline).classList.contains('never')).toBe(true)
    noUnderline.remove()
    const underline = mount({ href: '#' })
    expect(link(underline).classList.contains('never')).toBe(false)
  })

  it('disabled：aria-disabled、点击不派发 oas-click', () => {
    const el = mount({ href: '#', disabled: '' })
    const a = link(el)
    expect(a.getAttribute('aria-disabled')).toBe('true')
    let fired = false
    el.addEventListener('oas-click', () => (fired = true))
    a.click()
    expect(fired).toBe(false)
  })

  describe('underline 三态（always/hover/never，默认 hover）', () => {
    it('缺省 hover：无常驻下划线，hover 出下划线（默认类名 hover）', () => {
      const el = mount({ href: '#' })
      const a = link(el)
      expect(a.classList.contains('hover')).toBe(true)
      expect(a.classList.contains('always')).toBe(false)
      expect(a.classList.contains('never')).toBe(false)
    })

    it('always：常驻下划线（兼容 bare underline 与 underline="true"）', () => {
      const bare = mount({ href: '#', underline: '' })
      expect(link(bare).classList.contains('always')).toBe(true)
      const tru = mount({ href: '#', underline: 'true' })
      expect(link(tru).classList.contains('always')).toBe(true)
    })

    it('never：永不下划线（兼容 underline="false"）', () => {
      const el = mount({ href: '#', underline: 'never' })
      expect(link(el).classList.contains('never')).toBe(true)
      const falsy = mount({ href: '#', underline: 'false' })
      expect(link(falsy).classList.contains('never')).toBe(true)
    })

    it('非法值回落 hover 并告警', () => {
      const el = mount({ href: '#', underline: 'wavy' })
      expect(link(el).classList.contains('hover')).toBe(true)
    })

    it('CSS：hover 态有 :hover 下划线规则、never 无下划线、always 常驻', () => {
      const el = mount({ href: '#' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/a\.hover:hover\s*{[^}]*text-decoration-line:\s*underline/)
      expect(css).toMatch(/a\.never\s*{[^}]*text-decoration-line:\s*none/)
      expect(css).toMatch(/a\.always\s*{[^}]*text-decoration-line:\s*underline/)
    })

    it('CSS 变量开口：--oas-link-underline-offset / --oas-link-underline-color', () => {
      const el = mount({ href: '#' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/text-underline-offset:\s*var\(--oas-link-underline-offset,\s*2px\)/)
      expect(css).toMatch(
        /text-decoration-color:\s*var\(--oas-link-underline-color,\s*currentColor\)/,
      )
    })
  })

  describe('icon 属性 + icon-position', () => {
    it('icon 进入 observedAttributes，渲染图标元素', () => {
      expect(OASLink.observedAttributes).toContain('icon')
      const el = mount({ href: '#', icon: 'search' })
      expect(el.shadowRoot!.querySelector('.icon')).not.toBeNull()
    })

    it('icon-position=start（默认）图标在文字前，end 在后', () => {
      const start = mount({ href: '#', icon: 'search' })
      const aStart = link(start)
      expect(aStart.firstElementChild!.classList.contains('icon')).toBe(true)
      const end = mount({ href: '#', icon: 'search', 'icon-position': 'end' })
      const aEnd = link(end)
      expect(aEnd.lastElementChild!.classList.contains('icon')).toBe(true)
    })

    it('CSS：图标与文字间有 gap', () => {
      const el = mount({ href: '#', icon: 'search' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.icon\s*{[^}]*display/)
    })
  })

  describe('external 外链', () => {
    it('external 进入 observedAttributes', () => {
      expect(OASLink.observedAttributes).toContain('external')
    })

    it('external：自动 target=_blank + rel=noopener noreferrer + 外链图标', () => {
      const el = mount({ href: 'https://example.com', external: '' })
      const a = link(el)
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toBe('noopener noreferrer')
      expect(a.querySelector('.icon-external')).not.toBeNull()
    })

    it('external 图标位置跟随 icon-position（默认 end）', () => {
      const el = mount({ href: 'https://example.com', external: '' })
      const a = link(el)
      expect(a.lastElementChild!.classList.contains('icon-external')).toBe(true)
    })
  })

  describe('rel 安全自动补', () => {
    it('target=_blank 自动补 rel="noopener noreferrer"', () => {
      const el = mount({ href: 'https://example.com', target: '_blank' })
      expect(link(el).getAttribute('rel')).toBe('noopener noreferrer')
    })

    it('无 target=_blank 不补 rel', () => {
      const el = mount({ href: 'https://example.com' })
      expect(link(el).getAttribute('rel')).toBeNull()
    })

    it('动态移除 target 后 rel 也移除', () => {
      const el = mount({ href: 'https://example.com', target: '_blank' })
      el.removeAttribute('target')
      expect(link(el).getAttribute('rel')).toBeNull()
    })
  })

  describe('info 语义色', () => {
    it('type=info 映射 info class', () => {
      const el = mount({ href: '#', type: 'info' })
      expect(link(el).classList.contains('info')).toBe(true)
    })

    it('CSS：info 文字色走 --oas-color-info-text token', () => {
      const el = mount({ href: '#', type: 'info' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/a\.info\s*{[^}]*--oas-color-info-text/)
    })
  })
})

it('点击派发 oas-click（bubbles + composed）', () => {
  const el = mount({ href: '#' })
  let detail: unknown
  el.addEventListener('oas-click', (e: Event) => (detail = e))
  link(el).click()
  expect((detail as CustomEvent).bubbles).toBe(true)
  expect((detail as CustomEvent).composed).toBe(true)
})

it('属性变化增量更新：切换 type 不重建引用', () => {
  const el = mount({ href: '#', type: 'primary' })
  const a = link(el)
  el.setAttribute('type', 'danger')
  expect(link(el)).toBe(a)
  expect(a.classList.contains('danger')).toBe(true)
})

describe('color 属性（统一协议：11 预设名→token / 任意 CSS 色值直注入）', () => {
  it('color 进入 observedAttributes', () => {
    expect(OASLink.observedAttributes).toContain('color')
  })

  it('预设名映射 --oas-preset-*-text 达标文字 token（非本色）', () => {
    const el = mount({ href: '#', color: 'geekblue' })
    expect(link(el).style.getPropertyValue('--oas-link-color')).toBe(
      'var(--oas-preset-geekblue-text)',
    )
    const gold = mount({ href: '#', color: 'gold' })
    expect(link(gold).style.getPropertyValue('--oas-link-color')).toBe(
      'var(--oas-preset-gold-text)',
    )
  })

  it('11 预设名全量映射 -text token', () => {
    const presets = [
      'magenta',
      'red',
      'volcano',
      'orange',
      'gold',
      'lime',
      'green',
      'cyan',
      'blue',
      'geekblue',
      'purple',
    ]
    for (const name of presets) {
      const el = mount({ href: '#', color: name })
      expect(link(el).style.getPropertyValue('--oas-link-color'), `preset=${name}`).toBe(
        `var(--oas-preset-${name}-text)`,
      )
      el.remove()
    }
  })

  it('任意 CSS 色值直接注入（#hex）', () => {
    const el = mount({ href: '#', color: '#0e7490' })
    expect(link(el).style.getPropertyValue('--oas-link-color')).toBe('#0e7490')
  })

  it('color 优先于 type 语义色（has-color class 胜出）', () => {
    const el = mount({ href: '#', type: 'primary', color: 'purple' })
    expect(link(el).classList.contains('has-color')).toBe(true)
  })

  it('type 语义色改指 -text 达标变体（存量 3.3:1 隐患修复）', () => {
    const el = mount({ href: '#', type: 'success' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/a\.success\s*\{[^}]*--oas-color-success-text/)
    expect(css).toMatch(/a\.warning\s*\{[^}]*--oas-color-warning-text/)
    expect(css).toMatch(/a\.danger\s*\{[^}]*--oas-color-danger-text/)
  })

  it('动态切换与移除即时生效', () => {
    const el = mount({ href: '#', color: 'red' })
    el.setAttribute('color', '#00b96b')
    expect(link(el).style.getPropertyValue('--oas-link-color')).toBe('#00b96b')
    el.removeAttribute('color')
    expect(link(el).style.getPropertyValue('--oas-link-color')).toBe('')
    expect(link(el).classList.contains('has-color')).toBe(false)
  })
})

describe('download 透传（原生 <a download>）', () => {
  it('download 进入 observedAttributes', () => {
    expect(OASLink.observedAttributes).toContain('download')
  })

  it('download 有值透传', () => {
    const el = mount({ href: '/file.pdf', download: 'report.pdf' })
    expect(link(el).getAttribute('download')).toBe('report.pdf')
  })

  it('download 空值布尔：属性存在即透传（浏览器用原链接文件名）', () => {
    const el = mount({ href: '/file.pdf', download: '' })
    expect(link(el).hasAttribute('download')).toBe(true)
  })

  it('动态移除 download 后属性清除', () => {
    const el = mount({ href: '/file.pdf', download: 'report.pdf' })
    el.removeAttribute('download')
    expect(link(el).hasAttribute('download')).toBe(false)
  })

  it('无 download 不注入', () => {
    const el = mount({ href: '/file.pdf' })
    expect(link(el).hasAttribute('download')).toBe(false)
  })
})

describe('size 字号档（small/medium/large）', () => {
  it('size 进入 observedAttributes；medium 默认无 class，small/large 映射 class', () => {
    expect(OASLink.observedAttributes).toContain('size')
    const md = mount({ href: '#' })
    expect(link(md).classList.contains('small')).toBe(false)
    expect(link(md).classList.contains('large')).toBe(false)
    const sm = mount({ href: '#', size: 'small' })
    expect(link(sm).classList.contains('small')).toBe(true)
    const lg = mount({ href: '#', size: 'large' })
    expect(link(lg).classList.contains('large')).toBe(true)
  })

  it('非法值回落 medium（无 class）并告警', () => {
    const el = mount({ href: '#', size: 'xxl' })
    expect(link(el).classList.contains('small')).toBe(false)
    expect(link(el).classList.contains('large')).toBe(false)
  })

  it('CSS：size 档位改字号（走 --oas-font-size-* token，无硬编码 px）', () => {
    const el = mount({ href: '#' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/a\.small\s*{[^}]*--oas-font-size-sm/)
    expect(css).toMatch(/a\.large\s*{[^}]*--oas-font-size-lg/)
  })

  it('动态切换与移除 size 即时生效', () => {
    const el = mount({ href: '#' })
    el.setAttribute('size', 'large')
    expect(link(el).classList.contains('large')).toBe(true)
    el.removeAttribute('size')
    expect(link(el).classList.contains('large')).toBe(false)
  })
})

describe('loading 态（转圈替换前置图标 + 禁点击）', () => {
  it('loading 进入 observedAttributes', () => {
    expect(OASLink.observedAttributes).toContain('loading')
  })

  it('loading：点击不派发 oas-click 且阻止默认跳转', () => {
    const el = mount({ href: 'https://example.com', loading: '' })
    const a = link(el)
    let fired = false
    el.addEventListener('oas-click', () => (fired = true))
    const evt = new MouseEvent('click', { cancelable: true, bubbles: true })
    a.dispatchEvent(evt)
    expect(evt.defaultPrevented).toBe(true)
    expect(fired).toBe(false)
  })

  it('非 loading 照常派发 oas-click（回归）', () => {
    const el = mount({ href: '#' })
    let fired = false
    el.addEventListener('oas-click', () => (fired = true))
    link(el).click()
    expect(fired).toBe(true)
  })

  it('loading 时前置图标替换为转圈（icon 位置保留、内容为 loading svg + spinning class）', () => {
    const el = mount({ href: '#', icon: 'search', loading: '' })
    const icon = el.shadowRoot!.querySelector<HTMLElement>('.icon')
    expect(icon).not.toBeNull()
    expect(icon!.classList.contains('spinning')).toBe(true)
    expect(icon!.innerHTML).toContain('stroke="currentColor"')
    // 位置不变：仍在文字前
    expect(link(el).firstElementChild).toBe(icon)
  })

  it('loading 且无 icon：自动补转圈图标（文字前）', () => {
    const el = mount({ href: '#', loading: '' })
    const icon = el.shadowRoot!.querySelector('.icon')
    expect(icon).not.toBeNull()
    expect(link(el).firstElementChild!.classList.contains('icon')).toBe(true)
  })

  it('退出 loading 后恢复原图标（spinning 移除、原 svg 恢复）', () => {
    const el = mount({ href: '#', icon: 'search', loading: '' })
    const icon = el.shadowRoot!.querySelector<HTMLElement>('.icon')!
    el.removeAttribute('loading')
    expect(icon.classList.contains('spinning')).toBe(false)
    // 恢复注册表 search 图标（path 以 M 开头、fill 壳）
    expect(icon.innerHTML).toContain('<path')
  })

  it('loading 时 aria-busy=true，退出恢复 false', () => {
    const el = mount({ href: '#', loading: '' })
    expect(link(el).getAttribute('aria-busy')).toBe('true')
    el.removeAttribute('loading')
    expect(link(el).getAttribute('aria-busy')).toBe('false')
  })

  it('CSS：转圈动画规则（spinning svg 旋转）与 loading 光标 progress', () => {
    const el = mount({ href: '#', loading: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/\.icon\.spinning svg/)
    expect(css).toMatch(/@keyframes/)
    expect(css).toMatch(/a\[loading\]\s*{[^}]*cursor:\s*progress/)
  })

  it('loading 与 disabled 互不干扰：disabled 仍有 aria-disabled', () => {
    const el = mount({ href: '#', disabled: '', loading: '' })
    expect(link(el).getAttribute('aria-disabled')).toBe('true')
    expect(link(el).getAttribute('aria-busy')).toBe('true')
  })
})
