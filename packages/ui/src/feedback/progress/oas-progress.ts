import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
/* line 形态 */
.track {
  position: relative;
  height: var(--oas-space-2);
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-full, 999px);
  overflow: hidden;
}
.track[hidden] {
  display: none;
}
.bar {
  height: 100%;
  background: var(--oas-color-primary);
  border-radius: inherit;
  transition: width var(--oas-transition-base) var(--oas-ease-out);
}
.bar.done,
.bar[data-status='success'] {
  background: var(--oas-color-success);
}
.bar[data-status='error'] {
  background: var(--oas-color-danger);
}
.text {
  margin-top: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  text-align: right;
}
/* circle 形态 */
.circle {
  position: relative;
  display: inline-block;
}
.circle[hidden] {
  display: none;
}
.circle .track-circle {
  fill: none;
  stroke: var(--oas-color-bg-hover);
}
.circle .bar-circle {
  fill: none;
  stroke: var(--oas-color-primary);
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke-dashoffset var(--oas-transition-base) var(--oas-ease-out);
}
.circle .bar-circle.done,
.circle .bar-circle[data-status='success'] {
  stroke: var(--oas-color-success);
}
.circle .bar-circle[data-status='error'] {
  stroke: var(--oas-color-danger);
}
.circle-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-primary);
  font-variant-numeric: tabular-nums;
}
`

export class OASProgress extends OASElement {
  static override get observedAttributes(): string[] {
    return ['percent', 'status', 'no-text', 'show-text', 'type', 'size', 'stroke-width']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="track" part="track">
        <div class="bar" part="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
      <div class="text" part="text"></div>
      <div class="circle" part="circle" role="progressbar" aria-valuemin="0" aria-valuemax="100" hidden>
        <svg class="svg" viewBox="0 0 48 48">
          <circle class="track-circle" part="circle-track" cx="24" cy="24" r="21"></circle>
          <circle class="bar-circle" part="circle-bar" cx="24" cy="24" r="21"></circle>
        </svg>
        <div class="circle-text" part="circle-text">0%</div>
      </div>
    `
    this.update()
  }

  protected override update(): void {
    const percent = this.clampPercent(Number(this.getAttr('percent', '0')) || 0)
    const status = this.getAttr('status', '')
    const type = this.getAttr('type', 'line') === 'circle' ? 'circle' : 'line'

    // line 形态（保持既有行为）
    const bar = this.shadow.querySelector<HTMLElement>('[part="bar"]')
    const track = this.shadow.querySelector<HTMLElement>('.track')
    const text = this.shadow.querySelector<HTMLElement>('[part="text"]')
    if (track) track.hidden = type !== 'line'
    if (bar) {
      bar.style.width = `${percent}%`
      bar.setAttribute('aria-valuenow', String(percent))
      bar.classList.toggle('done', percent >= 100 && !status)
      bar.setAttribute('data-status', status)
    }
    if (text) {
      text.textContent = `${percent}%`
      text.hidden =
        type !== 'line' || this.hasAttr('no-text') || this.getAttr('show-text', 'true') === 'false'
    }

    this.updateCircle(type, percent, status)
  }

  /** percent 夹取 0–100 */
  private clampPercent(value: number): number {
    return Math.min(100, Math.max(0, value))
  }

  private updateCircle(type: 'line' | 'circle', percent: number, status: string): void {
    const circle = this.shadow.querySelector<HTMLElement>('[part="circle"]')
    if (!circle) return
    circle.hidden = type !== 'circle'
    if (type !== 'circle') return

    const size = Math.max(0, Number(this.getAttr('size', '48')) || 48)
    const strokeWidth = Math.max(0, Number(this.getAttr('stroke-width', '6')) || 6)
    const radius = Math.max(1, (size - strokeWidth) / 2)
    const circumference = 2 * Math.PI * radius

    const svg = this.shadow.querySelector<SVGSVGElement>('.circle svg')
    if (svg) {
      svg.setAttribute('width', String(size))
      svg.setAttribute('height', String(size))
      svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
    }
    const center = size / 2
    const trackCircle = this.shadow.querySelector('.circle .track-circle')
    const barCircle = this.shadow.querySelector('.circle .bar-circle')
    for (const ring of [trackCircle, barCircle]) {
      ring?.setAttribute('cx', String(center))
      ring?.setAttribute('cy', String(center))
      ring?.setAttribute('r', String(radius))
      ring?.setAttribute('stroke-width', String(strokeWidth))
      ring?.setAttribute('stroke-dasharray', String(circumference))
    }
    barCircle?.setAttribute('stroke-dashoffset', String(circumference * (1 - percent / 100)))
    barCircle?.classList.toggle('done', percent >= 100 && !status)
    barCircle?.setAttribute('data-status', status)

    const circleText = this.shadow.querySelector<HTMLElement>('.circle-text')
    if (circleText) {
      circleText.textContent = `${percent}%`
      circleText.hidden = this.hasAttr('no-text') || this.getAttr('show-text', 'true') === 'false'
    }
    circle.setAttribute('aria-valuenow', String(percent))
  }
}
