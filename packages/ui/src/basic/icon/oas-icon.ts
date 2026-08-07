import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export class OASIcon extends OASElement {
  static override get observedAttributes(): string[] {
    return ['name', 'size', 'color', 'label']
  }

  private svgHost: SVGSVGElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = '<svg part="icon"></svg>'
    this.svgHost = this.shadow.querySelector('svg')
    this.update()
  }

  protected override update(): void {
    const name = this.getAttr('name', '') as IconName
    const content = name ? iconRegistry[name] : undefined

    if (!content) {
      this.shadow.innerHTML = ''
      this.svgHost = null
      this.style.color = ''
      this.setAttribute('aria-hidden', 'true')
      this.removeAttribute('role')
      this.removeAttribute('aria-label')
      return
    }

    if (!this.svgHost) {
      this.shadow.innerHTML = '<svg part="icon"></svg>'
      this.svgHost = this.shadow.querySelector('svg')
    }
    const host = this.svgHost
    if (!host) return

    const size = this.getAttr('size', '')
    const color = this.getAttr('color', '')
    const label = this.getAttr('label', '')

    host.innerHTML = content
    host.setAttribute('viewBox', '0 0 16 16')
    host.setAttribute('width', size || '1em')
    host.setAttribute('height', size || '1em')
    host.setAttribute('aria-hidden', 'true')
    host.setAttribute('focusable', 'false')

    this.style.color = color

    if (label) {
      this.setAttribute('role', 'img')
      this.setAttribute('aria-label', label)
      this.removeAttribute('aria-hidden')
    } else {
      this.setAttribute('aria-hidden', 'true')
      this.removeAttribute('role')
      this.removeAttribute('aria-label')
    }
  }
}
