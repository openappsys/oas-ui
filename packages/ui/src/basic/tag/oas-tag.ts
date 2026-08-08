import { OASElement } from '@oas-ui/core'

export type TagType = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
export type TagSize = 'small' | 'medium' | 'large'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  box-sizing: border-box;
  height: var(--oas-control-height-sm);
  padding: 0 var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  border: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-xs);
}
.tag.success {
  border-color: color-mix(in srgb, var(--oas-color-success) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-success) 12%, transparent);
  color: var(--oas-color-success);
}
.tag.warning {
  border-color: color-mix(in srgb, var(--oas-color-warning) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-warning) 12%, transparent);
  color: var(--oas-color-warning);
}
.tag.danger {
  border-color: color-mix(in srgb, var(--oas-color-danger) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-danger) 12%, transparent);
  color: var(--oas-color-danger);
}
.tag.info {
  border-color: color-mix(in srgb, var(--oas-color-primary) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
  color: var(--oas-color-primary-active);
}
.tag.primary {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: #fff;
}
.tag.round {
  border-radius: var(--oas-control-height-sm);
}
.tag.small {
  height: 20px;
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
}
.tag.large {
  height: var(--oas-control-height-md);
  font-size: var(--oas-font-size-md);
  padding: 0 var(--oas-space-3);
}
.tag button {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: inherit;
  display: inline-flex;
  align-items: center;
  font-size: 1em;
}
.tag button[hidden] {
  display: none;
}
.tag button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
  border-radius: 50%;
}
`

export class OASTag extends OASElement {
  static override get observedAttributes(): string[] {
    return ['type', 'size', 'closable', 'round']
  }

  private tagRoot: HTMLElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <span class="tag" part="tag">
        <slot></slot>
        <button part="close" aria-label="" hidden>
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
            <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </span>
    `
    this.tagRoot = this.shadow.querySelector<HTMLElement>('.tag')
    this.shadow.querySelector('button')?.addEventListener('click', () => {
      const event = new CustomEvent('oas-close', {
        bubbles: true,
        composed: true,
        cancelable: true,
      })
      const notPrevented = this.dispatchEvent(event)
      if (notPrevented) this.remove()
    })
    this.update()
  }

  protected override update(): void {
    if (!this.tagRoot) return
    const type = this.getAttr('type', 'default') as TagType
    const size = this.getAttr('size', 'medium') as TagSize
    const closable = this.hasAttr('closable')
    const round = this.hasAttr('round')

    this.tagRoot.className = `tag ${type} ${size}${round ? ' round' : ''}`
    const btn = this.tagRoot.querySelector('button')
    if (btn) {
      btn.hidden = !closable
      // 关闭按钮内置文案走 locale registry（setLocale 切换自动刷新）
      btn.setAttribute('aria-label', this.t('tag.close'))
    }
  }
}
