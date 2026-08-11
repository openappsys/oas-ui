import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export class OASIcon extends OASElement {
  static override get observedAttributes(): string[] {
    return ['name', 'size', 'color', 'label']
  }

  private svgHost: SVGSVGElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return '<svg part="icon"></svg>'
  }

  /** 缓存节点引用（render 与水合路径共用） */
  private bind(): void {
    this.svgHost = this.shadow.querySelector('svg')
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：SVG 骨架缺失（非法 name 时快照为空 shadow）也属有效快照，由 update 按属性决定是否重建 */
  protected override hydrate(): boolean {
    this.bind()
    return true
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
      this.shadow.innerHTML = this.template()
      this.bind()
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
