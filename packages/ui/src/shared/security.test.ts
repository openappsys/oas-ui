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
import { OASFloatButton } from '../navigation/float-button/index.js'
import { OASTabs } from '../navigation/tabs/index.js'
import { OASAttachment } from '../conversation/attachment/index.js'
import { OASNoticeBar } from '../feedback/notice-bar/index.js'
import { OASCard } from '../data/card/index.js'
import { OASListItem } from '../data/list/index.js'
import { OASBreadcrumb } from '../navigation/breadcrumb/index.js'
import { OASAnchor } from '../navigation/anchor/index.js'
import { OASPagination } from '../navigation/pagination/index.js'

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

function expectNoJavascriptHref(root: ParentNode): void {
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    expect(anchor.getAttribute('href') ?? '', '不得写入可执行协议 href').not.toMatch(/^javascript:/i)
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

  it('float-button / attachment / notice-bar / card / list-item 的 javascript: href 退化为非链接', async () => {
    const payload = 'javascript:window.__oas_xss=1'
    const floatButton = mount(new OASFloatButton(), { href: payload })
    const floatMenu = mount(new OASFloatButton(), {
      mode: 'menu',
      actions: JSON.stringify([{ label: 'Bad', href: payload }]),
    })
    const attachment = mount(new OASAttachment(), { name: 'a.pdf', href: payload })
    const notice = mount(new OASNoticeBar(), { 'action-text': '打开', href: payload })
    const card = mount(new OASCard(), { href: payload })
    const listItem = mount(new OASListItem(), { href: payload })
    await flush()
    floatMenu.shadowRoot!.querySelector<HTMLElement>('[part="btn"]')!.click()
    await flush()
    for (const el of [floatButton, floatMenu, attachment, notice, card, listItem]) {
      expectNoJavascriptHref(el.shadowRoot!)
      expectNoInjectedAttrs(el.shadowRoot!)
    }
  })

  it('tabs 的 panel/items javascript: href 不渲染链接 tab', async () => {
    const payload = 'javascript:window.__oas_xss=1'
    const el = new OASTabs()
    el.innerHTML = `<oas-tab-panel label="Bad" value="bad" href="${payload}"><p>x</p></oas-tab-panel>`
    mount(el)
    await flush()
    expectNoJavascriptHref(el.shadowRoot!)
    expect(el.shadowRoot!.querySelector('[role="tab"]')!.tagName).toBe('BUTTON')

    const viaItems = new OASTabs()
    viaItems.setAttribute('items', JSON.stringify([{ label: 'Bad', value: 'bad', href: payload }]))
    mount(viaItems)
    await flush()
    expectNoJavascriptHref(viaItems.shadowRoot!)
    expect(viaItems.shadowRoot!.querySelector('[role="tab"]')!.tagName).toBe('BUTTON')
  })

  it('breadcrumb / anchor / pagination 的 javascript: href 不写入链接（含 breadcrumb 嵌套 dropdown）', async () => {
    const payload = 'javascript:window.__oas_xss=1'
    const breadcrumb = mount(new OASBreadcrumb(), {
      items: JSON.stringify([
        { label: '带下拉', dropdown: [{ label: '嵌套坏链', href: payload }] },
        { label: '顶层', href: payload },
        { label: '末页' },
      ]),
    })
    const anchor = mount(new OASAnchor(), { items: JSON.stringify([{ href: payload, title: 'Bad' }]) })
    const anchorChild = new OASAnchor()
    anchorChild.innerHTML = `<oas-anchor-item href="${payload}">Bad</oas-anchor-item>`
    mount(anchorChild)
    const pagination = mount(new OASPagination(), { total: '30', 'href-template': `${payload}?page={page}` })
    await flush()
    for (const el of [breadcrumb, anchor, anchorChild, pagination]) {
      expectNoJavascriptHref(el.shadowRoot!)
      expectNoInjectedAttrs(el.shadowRoot!)
    }
  })

  it('data:/vbscript: 与 blob: 边界：可执行/内联文档协议拦截，同源 blob 对象 URL 放行', async () => {
    for (const payload of ['data:text/html,<script>1</script>', 'vbscript:msgbox(1)']) {
      const el = mount(new OASCard(), { href: payload })
      await flush()
      expectNoJavascriptHref(el.shadowRoot!)
      expect(el.shadowRoot!.querySelector('a')?.getAttribute('href') ?? '').not.toMatch(/^(?:data|vbscript):/i)
    }
    const blob = mount(new OASAttachment(), {
      name: 'a.png',
      href: 'blob:https://example.com/550e8400-e29b-41d4-a716-446655440000',
    })
    await flush()
    expect(blob.shadowRoot!.querySelector('a')?.getAttribute('href')).toContain('blob:https://example.com/')
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
