import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { registerIcon, registerIconLibrary } from '@oas-ui/icons/runtime'
import { OASButton } from '../basic/button/index.js'
import { OASIcon } from '../basic/icon/index.js'
import { OASLink } from '../basic/link/index.js'
import { OASTag } from '../basic/tag/index.js'
import { OASQRCode } from '../data/qrcode/index.js'
import { OASSidebar } from '../layout/sidebar/index.js'
import { OASMenu } from '../navigation/menu/index.js'
import { OASMenubar } from '../navigation/menubar/index.js'
import { OASNavigationMenu } from '../navigation/navigation-menu/index.js'

const PAYLOAD = 'red" onload="window.__oas_xss=1'
const flush = async (): Promise<void> => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

function mount<T extends HTMLElement>(el: T, attrs: Record<string, string> = {}): T {
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  document.body.appendChild(el)
  return el
}

function expectNoInjectedAttrs(root: ParentNode): void {
  for (const el of root.querySelectorAll('*')) {
    expect(el.getAttribute('onload'), `${el.tagName} 不应出现 onload`).toBeNull()
    expect(el.getAttribute('onmouseover'), `${el.tagName} 不应出现 onmouseover`).toBeNull()
    expect(el.getAttribute('onclick'), `${el.tagName} 不应出现 onclick`).toBeNull()
  }
}

describe('HTML/SVG 注入安全回归', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    registerIcon('evil', '<path d="M0 0 L1 1" stroke="currentColor"/>')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('button 的 href/target/rel 不逃逸属性上下文，javascript: 退化为 button', async () => {
    const escaped = mount(new OASButton(), {
      href: 'https://example.com/?a=" onmouseover="window.__oas_xss=1',
      target: '_blank" onload="window.__oas_xss=1',
      rel: 'noopener" onload="window.__oas_xss=1',
    })
    await flush()
    expectNoInjectedAttrs(escaped.shadowRoot!)

    const unsafe = mount(new OASButton(), { href: 'javascript:window.__oas_xss=1' })
    await flush()
    expect(unsafe.shadowRoot!.querySelector('a')).toBeNull()
    expect(unsafe.shadowRoot!.querySelector('button')).not.toBeNull()
  })

  it('tag 的链接属性不逃逸，javascript: 退化为 span', async () => {
    const escaped = mount(new OASTag(), {
      href: 'https://example.com/?a=" onmouseover="window.__oas_xss=1',
      target: '_blank" onload="window.__oas_xss=1',
    })
    await flush()
    expectNoInjectedAttrs(escaped.shadowRoot!)

    const unsafe = mount(new OASTag(), { href: 'javascript:window.__oas_xss=1' })
    await flush()
    expect(unsafe.shadowRoot!.querySelector('a')).toBeNull()
    expect(unsafe.shadowRoot!.querySelector('span.tag')).not.toBeNull()
  })

  it('tag 的 icon 名不逃逸属性上下文', async () => {
    const el = mount(new OASTag(), { icon: 'evil" onload="window.__oas_xss=1' })
    await flush()
    expectNoInjectedAttrs(el.shadowRoot!)
  })

  it('icon sprite 的 library/name 不逃逸 <use> 属性上下文', async () => {
    registerIconLibrary('evil-sprite', {
      resolver: () => 'https://example.com/icons.svg',
      spriteSheet: true,
    })
    const el = mount(new OASIcon(), {
      library: 'evil-sprite',
      name: 'x"></use><image href="x" onerror="window.__oas_xss=1',
    })
    await flush()
    expectNoInjectedAttrs(el.shadowRoot!)
    expect(el.shadowRoot!.querySelector('image')).toBeNull()
  })

  it('qrcode 的 color/bg-color 不逃逸 SVG 属性上下文', async () => {
    const el = mount(new OASQRCode(), {
      value: 'HELLO',
      color: PAYLOAD,
      'bg-color': PAYLOAD,
    })
    await flush()
    expectNoInjectedAttrs(el.shadowRoot!)
  })

  for (const [name, ctor] of [
    ['menu', OASMenu],
    ['menubar', OASMenubar],
    ['navigation-menu', OASNavigationMenu],
  ] as const) {
    it(`${name} 的 items href 不写入 javascript:`, async () => {
      const items = JSON.stringify([{ label: 'Bad', value: 'bad', href: 'javascript:window.__oas_xss=1' }])
      const el = mount(new ctor(), { items })
      await flush()
      for (const anchor of el.shadowRoot!.querySelectorAll<HTMLAnchorElement>('a[href]')) {
        expect(anchor.getAttribute('href') ?? '').not.toMatch(/^javascript:/i)
      }
    })
  }

  it('link 的 javascript: 不写入 href', async () => {
    const el = mount(new OASLink(), { href: 'javascript:window.__oas_xss=1' })
    await flush()
    expect(el.shadowRoot!.querySelector('a')!.hasAttribute('href')).toBe(false)
  })

  for (const [name, ctor] of [
    ['sidebar', OASSidebar],
    ['menu', OASMenu],
    ['menubar', OASMenubar],
    ['navigation-menu', OASNavigationMenu],
  ] as const) {
    it(`${name} 的 icon-color 不逃逸 SVG 属性上下文`, async () => {
      const items = JSON.stringify([
        { label: 'Home', value: 'home', icon: 'evil', iconColor: `${PAYLOAD} $& onclick=window.__oas_xss=1` },
      ])
      const el = mount(new ctor(), { items })
      await flush()
      expectNoInjectedAttrs(el.shadowRoot!)
    })
  }
})
