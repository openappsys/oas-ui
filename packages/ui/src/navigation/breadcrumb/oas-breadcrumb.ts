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

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <nav part="nav" aria-label="面包屑"></nav>
    `
    this.update()
  }

  protected override update(): void {
    const nav = this.shadow.querySelector('nav')
    if (!nav) return
    nav.innerHTML = ''
    let items: BreadcrumbItem[] = []
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      items = Array.isArray(parsed) ? parsed.filter((i): i is BreadcrumbItem => i && typeof i.label === 'string') : []
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
