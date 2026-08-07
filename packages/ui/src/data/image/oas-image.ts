import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
.previewable {
  cursor: zoom-in;
  display: inline-block;
}
img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: var(--oas-radius-md);
}
.previewable img {
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
}
.previewable img:hover {
  transform: scale(1.02);
}
`

export class OASImage extends OASElement {
  static override get observedAttributes(): string[] {
    return ['src', 'alt', 'preview', 'fit']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="previewable" part="wrapper">
        <img part="image" alt="">
      </div>
    `
    this.shadow.querySelector('.previewable')?.addEventListener('click', () => {
      if (this.hasAttr('preview')) this.emit('preview', { src: this.getAttr('src', '') })
    })
    this.update()
  }

  protected override update(): void {
    const img = this.shadow.querySelector<HTMLImageElement>('img')
    if (!img) return
    img.setAttribute('src', this.getAttr('src', ''))
    img.setAttribute('alt', this.getAttr('alt', '图片'))
    const fit = this.getAttr('fit', '')
    if (fit) img.style.objectFit = fit
  }
}
