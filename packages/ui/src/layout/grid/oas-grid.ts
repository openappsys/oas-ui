import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  font-family: inherit;
  gap: 0;
}
:host([hidden]) {
  display: none;
}
`

export class OASGrid extends OASElement {
  static override get observedAttributes(): string[] {
    return ['gap', 'cols', 'columns']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；grid 无事件绑定） */
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
    const columns = this.getAttr('columns', '')
    const cols = Number(this.getAttr('cols', '24')) || 24
    this.style.display = 'grid'
    this.style.gap = this.getAttr('gap', '0')
    if (columns !== '') {
      // simple-grid：按 columns 自动等分，子项忽略 span（由 GridItem 侧配合）
      const n = Math.max(1, Number(columns) || 1)
      this.style.gridTemplateColumns = `repeat(${n}, 1fr)`
    } else {
      this.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
    }
  }
}
