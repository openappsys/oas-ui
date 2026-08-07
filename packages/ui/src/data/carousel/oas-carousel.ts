import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  position: relative;
  overflow: hidden;
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-lg);
}
.viewport {
  overflow: hidden;
}
.track {
  display: flex;
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
}
::slotted(*) {
  flex: 0 0 100%;
  width: 100%;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.dots {
  position: absolute;
  bottom: var(--oas-space-3);
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: var(--oas-space-2);
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 0;
}
.dot[aria-current='true'] {
  background: #fff;
}
`

export class OASCarousel extends OASElement {
  static override get observedAttributes(): string[] {
    return ['index', 'autoplay', 'interval']
  }

  private count = 0
  private timer: ReturnType<typeof setInterval> | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="viewport" part="viewport">
        <div class="track" part="track"><slot></slot></div>
      </div>
      <div class="dots" part="dots" role="tablist"></div>
    `
    this.shadow.querySelector('.dots')?.addEventListener('click', (e) => {
      const dot = (e.target as HTMLElement).closest('[part="dot"]')
      if (dot) this.goto(Number((dot as HTMLElement).getAttribute('data-index')) || 0)
    })
    this.update()
  }

  protected override update(): void {
    this.count = this.children.length
    const track = this.shadow.querySelector('[part="track"]') as HTMLElement | null
    if (!track) return
    const index = Number(this.getAttr('index', '0')) || 0
    track.style.transform = `translateX(-${index * 100}%)`
    const dots = this.shadow.querySelector('[part="dots"]')
    if (!dots) return
    dots.innerHTML = ''
    for (let i = 0; i < this.count; i++) {
      const dot = document.createElement('button')
      dot.className = 'dot'
      dot.setAttribute('part', 'dot')
      dot.setAttribute('role', 'tab')
      dot.setAttribute('aria-current', String(i === index))
      dot.setAttribute('aria-label', `第 ${i + 1} 张`)
      dot.setAttribute('data-index', String(i))
      dots.appendChild(dot)
    }
    this.schedule()
  }

  private goto(index: number): void {
    if (this.count === 0) return
    const next = (index + this.count) % this.count
    this.setAttribute('index', String(next))
    this.emit('change', { index: next })
    this.update()
  }

  private schedule(): void {
    if (this.timer) clearInterval(this.timer)
    if (!this.hasAttr('autoplay')) return
    this.timer = setInterval(() => this.goto((Number(this.getAttr('index', '0')) || 0) + 1), Number(this.getAttr('interval', '3000')) || 3000)
  }

  protected override onCleanup(): void {
    if (this.timer) clearInterval(this.timer)
  }
}
