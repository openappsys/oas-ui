import { OASElement } from '@oas-ui/core'

const STAR = `
<svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" focusable="false">
  <path d="M8 2.4 L9.9 6.2 L14 6.8 L11 9.7 L11.6 13.8 L8 12 L4.4 13.8 L5 9.7 L2 6.8 L6.1 6.2 Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.slider {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
}
.star {
  display: inline-flex;
  cursor: pointer;
  color: var(--oas-color-border);
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
.star:hover {
  transform: scale(1.1);
}
.star.active {
  color: var(--oas-color-warning);
}
.star:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
  border-radius: 2px;
}
:host([disabled]) .star {
  cursor: not-allowed;
  opacity: 0.7;
}
`

export class OASRate extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'max', 'disabled', 'allow-half']
  }

  private slider: HTMLElement | null = null
  private starEls: HTMLElement[] = []

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <span class="slider" part="slider" role="slider" tabindex="0" aria-valuemin="0"></span>
    `
    this.slider = this.shadow.querySelector('.slider')
    this.slider?.addEventListener('keydown', (e: KeyboardEvent) => {
      const max = this.maxValue()
      let value = this.currentValue()
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') value = Math.min(value + 1, max)
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') value = Math.max(value - 1, 0)
      else if (e.key === 'Home') value = 0
      else if (e.key === 'End') value = max
      else return
      e.preventDefault()
      this.setValue(value)
    })
    this.update()
  }

  protected override update(): void {
    if (!this.slider) return
    const max = this.maxValue()
    const value = this.currentValue()

    this.slider.innerHTML = ''
    this.starEls = []
    for (let i = 1; i <= max; i++) {
      const star = document.createElement('span')
      star.className = 'star'
      star.setAttribute('part', 'star')
      star.tabIndex = -1
      star.innerHTML = STAR
      star.addEventListener('click', () => {
        if (this.hasAttr('disabled')) return
        this.setValue(i)
      })
      this.slider.appendChild(star)
      this.starEls.push(star)
    }

    this.syncStars()
    this.slider.setAttribute('aria-valuemax', String(max))
    this.slider.setAttribute('aria-valuenow', String(value))
    this.slider.setAttribute('aria-label', '评分')
  }

  private syncStars(): void {
    const value = this.currentValue()
    this.starEls.forEach((star, idx) => {
      star.classList.toggle('active', idx < Math.floor(value))
      if (this.hasAttr('allow-half') && idx === Math.floor(value) && value % 1 !== 0) {
        star.classList.add('half')
        star.style.opacity = '0.5'
      } else {
        star.classList.remove('half')
        star.style.opacity = ''
      }
    })
  }

  private currentValue(): number {
    return Number(this.getAttr('value', '0')) || 0
  }

  private maxValue(): number {
    return Number(this.getAttr('max', '5')) || 5
  }

  private setValue(v: number): void {
    this.setAttribute('value', String(v))
    this.emit('change', { value: v })
  }
}
