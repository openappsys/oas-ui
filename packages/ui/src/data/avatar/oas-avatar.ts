import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  font-family: inherit;
  overflow: hidden;
  flex-shrink: 0;
  user-select: none;
}
:host([hidden]) {
  display: none;
}
img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
`

export class OASAvatar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['src', 'size']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      ${this.hasAttr('src') ? '<img part="image" alt="">' : '<span part="text"></span>'}
    `
  }

  /** 缓存节点引用（render 与水合路径共用；avatar 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（img/文本占位与当前 src 属性状态一致）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    const hasImg = this.shadow.querySelector('img') !== null
    if (hasImg !== this.hasAttr('src')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const size = this.getAttr('size', '32')
    this.style.width = `${size}px`
    this.style.height = `${size}px`
    this.style.fontSize = `${Math.max(12, Number(size) * 0.4)}px`
    const img = this.shadow.querySelector('img')
    if (img) {
      img.setAttribute('src', this.getAttr('src', ''))
      img.setAttribute('alt', this.getAttr('alt', this.t('avatar.defaultAlt')))
    }
    const text = this.shadow.querySelector('[part="text"]')
    if (text) text.textContent = (this.textContent ?? '').trim().charAt(0) || '?'
  }
}
