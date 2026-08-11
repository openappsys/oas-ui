import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  position: relative;
  font-family: inherit;
}
.badge {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(50%, -50%);
  min-width: 16px;
  height: 16px;
  box-sizing: border-box;
  padding: 0 var(--oas-space-1);
  border-radius: 8px;
  background: var(--oas-color-danger);
  color: var(--oas-color-text-on-danger);
  font-size: var(--oas-font-size-xs);
  line-height: 16px;
  text-align: center;
  white-space: nowrap;
}
.badge.dot {
  min-width: 8px;
  width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 50%;
}
.badge[hidden] {
  display: none;
}
`

export class OASBadge extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'max', 'showZero', 'dot']
  }

  private badgeEl: HTMLElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <sup class="badge" part="badge" hidden></sup>
      <slot></slot>
    `
    this.badgeEl = this.shadow.querySelector('.badge')
    this.update()
  }

  protected override update(): void {
    const el = this.badgeEl
    if (!el) return

    const raw = this.getAttr('value', '')
    const dot = this.hasAttr('dot')
    const showZero = this.hasAttr('showZero')

    const value = raw === '' ? NaN : Number(raw)
    const hasValue = !Number.isNaN(value)

    el.classList.toggle('dot', dot)

    if (dot) {
      el.textContent = ''
      el.hidden = false
      return
    }

    if (!hasValue) {
      el.hidden = true
      return
    }

    if (value === 0 && !showZero) {
      el.hidden = true
      return
    }

    const max = this.getAttr('max', '')
    const maxNum = max === '' ? NaN : Number(max)
    const display = !Number.isNaN(maxNum) && value > maxNum ? `${maxNum}+` : String(value)

    el.textContent = display
    el.hidden = false
  }
}
