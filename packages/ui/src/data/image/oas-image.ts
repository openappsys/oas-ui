import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
[hidden] {
  display: none !important;
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
.placeholder,
.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 160px;
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
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
    return ['src', 'alt', 'preview', 'fit', 'placeholder', 'fallback']
  }

  private loaded = false
  private failed = false
  private fallbackTried = false
  private lastSrc = ''

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="previewable" part="wrapper">
        <div class="placeholder" part="placeholder" hidden>加载中…</div>
        <img part="image" alt="">
        <div class="fallback" part="fallback" hidden>图片加载失败</div>
      </div>
    `
    const img = this.shadow.querySelector<HTMLImageElement>('img')
    if (img) {
      img.addEventListener('load', () => this.handleLoad())
      img.addEventListener('error', () => this.handleError())
    }
    this.shadow.querySelector('.previewable')?.addEventListener('click', () => {
      if (this.hasAttr('preview')) this.emit('preview', { src: this.getAttr('src', '') })
    })
    this.update()
  }

  private handleLoad(): void {
    this.loaded = true
    this.failed = false
    this.sync()
  }

  private handleError(): void {
    if (this.hasAttr('fallback') && !this.fallbackTried) {
      // 首次失败：切换到兜底图继续加载
      this.fallbackTried = true
      this.loaded = false
      this.failed = false
      this.shadow.querySelector<HTMLImageElement>('img')?.setAttribute('src', this.getAttr('fallback', ''))
    } else {
      // 无兜底图或兜底图也失败：显示失败占位
      this.failed = true
      this.loaded = false
    }
    this.sync()
  }

  private sync(): void {
    const img = this.shadow.querySelector<HTMLElement>('img')
    const ph = this.shadow.querySelector<HTMLElement>('[part="placeholder"]')
    const fb = this.shadow.querySelector<HTMLElement>('[part="fallback"]')
    if (!img || !ph || !fb) return
    img.hidden = this.failed || (this.hasAttr('placeholder') && !this.loaded)
    ph.hidden = !this.hasAttr('placeholder') || this.loaded || this.failed
    fb.hidden = !this.failed
  }

  protected override update(): void {
    const img = this.shadow.querySelector<HTMLImageElement>('img')
    if (!img) return
    const src = this.getAttr('src', '')
    if (src !== this.lastSrc) {
      this.lastSrc = src
      this.loaded = false
      this.failed = false
      this.fallbackTried = false
    }
    img.setAttribute('src', src)
    img.setAttribute('alt', this.getAttr('alt', '图片'))
    const fit = this.getAttr('fit', '')
    if (fit) img.style.objectFit = fit
    this.sync()
  }
}
