import { OASElement } from '@oas-ui/core'

export interface BreadcrumbItem {
  label: string
  href?: string
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
:host([hidden]) {
  display: none;
}
nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.item {
  display: inline-flex;
  align-items: center;
}
.sep {
  margin: 0 var(--oas-space-2);
  color: var(--oas-color-border);
  user-select: none;
}
[part='link'] {
  color: var(--oas-color-text-secondary);
  text-decoration: none;
  cursor: pointer;
}
[part='link']:hover {
  color: var(--oas-color-primary);
}
[part='current'] {
  color: var(--oas-color-text-primary);
  font-weight: 500;
  white-space: nowrap;
}
`

export class OASBreadcrumb extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items', 'separator']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <nav part="nav"></nav>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；面包屑项事件在 update 重建时绑定） */
  private bind(): void {}

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
    nav.setAttribute('aria-label', this.t('breadcrumb.nav'))
    nav.innerHTML = ''
    let items: BreadcrumbItem[] = []
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      items = Array.isArray(parsed)
        ? parsed.filter((i): i is BreadcrumbItem => i && typeof i.label === 'string')
        : []
    } catch {
      items = []
    }
    const separator = this.getAttr('separator', '/')
    items.forEach((item, idx) => {
      const span = document.createElement('span')
      span.className = 'item'
      const isLast = idx === items.length - 1
      if (item.href && !isLast) {
        const link = document.createElement('a')
        link.setAttribute('part', 'link')
        link.href = item.href
        link.textContent = item.label
        link.addEventListener('click', (e: MouseEvent) => {
          e.preventDefault()
          this.emit('select', { value: item.href })
        })
        span.appendChild(link)
      } else {
        const current = document.createElement('span')
        current.setAttribute('part', 'current')
        current.setAttribute('aria-current', 'page')
        current.textContent = item.label
        span.appendChild(current)
      }
      nav.appendChild(span)
      if (!isLast) {
        const sep = document.createElement('span')
        sep.className = 'sep'
        sep.textContent = separator
        nav.appendChild(sep)
      }
    })
  }
}
