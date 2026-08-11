import { OASElement } from '@oas-ui/core'

export interface AnchorItem {
  href: string
  title: string
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
nav {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
}
[part='link'] {
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  text-decoration: none;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  border-left: 2px solid transparent;
}
[part='link']:hover {
  color: var(--oas-color-primary);
}
[part='link'][aria-current='true'] {
  color: var(--oas-color-primary);
  border-left-color: var(--oas-color-primary);
  font-weight: 500;
}
`

export class OASAnchor extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items', 'active', 'offset']
  }

  private _items: AnchorItem[] = []

  /** Vue/React 会把 items 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get items(): AnchorItem[] {
    return this._items
  }
  set items(value: AnchorItem[] | string) {
    this.setAttribute('items', typeof value === 'string' ? value : JSON.stringify(value))
  }
  private observer: IntersectionObserver | null = null
  private activeHref = ''

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <nav part="nav"></nav>
    `
  }

  /** 缓存节点引用 + 注册清理（render 与水合路径共用；链接点击/observer 由 update 重建时绑定） */
  private bind(): void {
    this.onCleanup(() => this.observer?.disconnect())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（nav 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('nav')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const nav = this.shadow.querySelector('nav')
    if (!nav) return
    // 导航 aria-label locale 驱动（setLocale 切换自动重刷）
    nav.setAttribute('aria-label', this.t('anchor.nav'))
    this.parseItems()
    this.activeHref = this.getAttr('active', '')
    nav.innerHTML = ''
    const targets: Element[] = []
    for (const item of this._items) {
      const link = document.createElement('a')
      link.setAttribute('part', 'link')
      link.href = item.href
      link.textContent = item.title
      link.setAttribute('aria-current', String(item.href === this.activeHref))
      link.addEventListener('click', (e: MouseEvent) => {
        e.preventDefault()
        this.emit('change', { href: item.href })
        this.scrollToTarget(item.href)
      })
      nav.appendChild(link)
      const target = document.querySelector(item.href)
      if (target) targets.push(target)
    }
    if (typeof IntersectionObserver !== 'undefined' && targets.length > 0) {
      this.observer?.disconnect()
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const id = `#${entry.target.id}`
              this.activeHref = id
              this.setAttribute('active', id)
              this.renderActive(nav)
            }
          }
        },
        { rootMargin: `-${this.getAttr('offset', '0')}px 0px -60% 0px` },
      )
      for (const target of targets) this.observer.observe(target)
    }
  }

  private scrollToTarget(href: string): void {
    const el = document.querySelector(href)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  private renderActive(nav: HTMLElement): void {
    for (const link of nav.querySelectorAll('[part="link"]')) {
      const href = link.getAttribute('href')
      link.setAttribute('aria-current', String(href === this.activeHref))
    }
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this._items = Array.isArray(parsed)
        ? parsed.filter(
            (i): i is AnchorItem => i && typeof i.href === 'string' && typeof i.title === 'string',
          )
        : []
    } catch {
      this._items = []
    }
  }
}
