import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: flex;
  height: 100%;
  font-family: inherit;
}
.pane {
  flex: 1;
  min-width: 0;
  overflow: auto;
}
.splitter {
  width: 6px;
  cursor: col-resize;
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-sm);
  flex-shrink: 0;
  touch-action: none;
}
.splitter:hover {
  background: var(--oas-color-primary);
}
.splitter:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 1px;
}
`

export class OASSplitter extends OASElement {
  static override get observedAttributes(): string[] {
    return ['percent', 'min', 'max']
  }

  private leftPane: HTMLElement | null = null
  private rightPane: HTMLElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="pane" part="pane-left"><slot name="left"><slot></slot></slot></div>
      <div class="splitter" part="splitter" tabindex="0" role="separator" aria-orientation="vertical" aria-label="调整面板宽度"></div>
      <div class="pane" part="pane-right"><slot name="right"></slot></div>
    `
    this.leftPane = this.shadow.querySelector('.pane:first-of-type') as HTMLElement
    this.rightPane = this.shadow.querySelector('.pane:last-of-type') as HTMLElement
    this.shadow.querySelector('.splitter')?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    this.update()
  }

  private handleKey(e: KeyboardEvent): void {
    let delta = 0
    if (e.key === 'ArrowLeft') delta = -1
    else if (e.key === 'ArrowRight') delta = 1
    else return
    e.preventDefault()
    const percent = Number(this.getAttr('percent', '50')) || 50
    this.setPercent(percent + delta)
  }

  private setPercent(percent: number): void {
    const min = Number(this.getAttr('min', '10')) || 10
    const max = Number(this.getAttr('max', '90')) || 90
    const clamped = Math.min(max, Math.max(min, percent))
    this.setAttribute('percent', String(clamped))
    this.emit('resize', { percent: clamped })
    this.applyPercent()
  }

  protected override update(): void {
    this.applyPercent()
  }

  private applyPercent(): void {
    if (!this.leftPane || !this.rightPane) return
    const percent = Number(this.getAttr('percent', '50')) || 50
    this.leftPane.style.flex = `0 0 ${percent}%`
    this.rightPane.style.flex = `1 1 0%`
  }
}
