import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--oas-color-primary);
  color: #fff;
  font-family: inherit;
  overflow: hidden;
  flex-shrink: 0;
  user-select: none;
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

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      ${this.hasAttr('src') ? '<img part="image" alt="">' : '<span part="text"></span>'}
    `
    this.update()
  }

  protected override update(): void {
    const size = this.getAttr('size', '32')
    this.style.width = `${size}px`
    this.style.height = `${size}px`
    this.style.fontSize = `${Math.max(12, Number(size) * 0.4)}px`
    const img = this.shadow.querySelector('img')
    if (img) {
      img.setAttribute('src', this.getAttr('src', ''))
      img.setAttribute('alt', this.getAttr('alt', '头像'))
    }
    const text = this.shadow.querySelector('[part="text"]')
    if (text) text.textContent = (this.textContent ?? '').trim().charAt(0) || '?'
  }
}
