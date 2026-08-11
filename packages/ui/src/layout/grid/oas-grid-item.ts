import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  min-width: 0;
}
:host([hidden]) {
  display: none;
}
`

export class OASGridItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['span', 'offset']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；grid-item 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（默认 slot 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('slot')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // simple-grid（父级 oas-grid 有 columns 且 >0）时自动布局，忽略 span/offset
    const grid = this.closest('oas-grid')
    const columns = grid?.getAttribute('columns') ?? ''
    const simpleGrid = columns !== '' && (Number(columns) || 0) > 0
    if (simpleGrid) {
      this.style.gridColumn = ''
      return
    }
    const span = Number(this.getAttr('span', '24')) || 24
    const offset = Number(this.getAttr('offset', '0')) || 0
    if (offset > 0) {
      this.style.gridColumn = `${offset + 1} / span ${span}`
    } else {
      this.style.gridColumn = `span ${span}`
    }
  }
}
