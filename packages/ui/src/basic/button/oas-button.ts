import { OASElement } from '@oas-ui/core'

export type ButtonType = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'text'
export type ButtonSize = 'small' | 'medium' | 'large'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
button {
  appearance: none;
  border: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-4);
  /* button-group 通过自定义属性合并相邻圆角/拉满宽度（::slotted 后不支持链 ::part，故走变量穿透） */
  border-radius: var(--oas-button-group-radius, var(--oas-radius-md));
  width: var(--oas-button-group-width, auto);
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-1);
}
button:hover {
  background: var(--oas-color-bg-hover);
}
button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
button[part~='button'][disabled],
button[disabled] {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
button.primary {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: #fff;
}
button.primary:hover {
  background: var(--oas-color-primary-hover);
  border-color: var(--oas-color-primary-hover);
}
button.primary:active {
  background: var(--oas-color-primary-active);
  border-color: var(--oas-color-primary-active);
}
button.success {
  background: color-mix(in srgb, var(--oas-color-success) 80%, black);
  border-color: color-mix(in srgb, var(--oas-color-success) 80%, black);
  color: #fff;
}
button.success:hover {
  filter: brightness(1.08);
}
button.warning {
  background: color-mix(in srgb, var(--oas-color-warning) 80%, black);
  border-color: color-mix(in srgb, var(--oas-color-warning) 80%, black);
  color: #fff;
}
button.warning:hover {
  filter: brightness(1.08);
}
button.danger {
  background: color-mix(in srgb, var(--oas-color-danger) 80%, black);
  border-color: color-mix(in srgb, var(--oas-color-danger) 80%, black);
  color: #fff;
}
button.danger:hover {
  filter: brightness(1.08);
}
button.small {
  height: var(--oas-control-height-sm);
  font-size: var(--oas-font-size-sm);
  padding: 0 var(--oas-space-2);
}
button.large {
  height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-lg);
  padding: 0 var(--oas-space-5);
}
button.text {
  border-color: transparent;
  background: transparent;
}
.spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: oas-spin 0.8s linear infinite;
}
.spinner[hidden] {
  display: none;
}
@keyframes oas-spin {
  to {
    transform: rotate(360deg);
  }
}
`

export class OASButton extends OASElement {
  static override get observedAttributes(): string[] {
    return ['type', 'size', 'disabled', 'loading']
  }

  private btn: HTMLButtonElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <button part="button">
        <span class="spinner" part="spinner" hidden></span>
        <slot></slot>
      </button>
    `
    this.btn = this.shadow.querySelector('button')

    this.btn?.addEventListener('click', (e: MouseEvent) => {
      if (this.hasAttr('disabled') || this.hasAttr('loading')) {
        e.preventDefault()
        return
      }
      this.emit('click', { originalEvent: e })
    })
  }

  protected override update(): void {
    if (!this.btn) return
    const type = this.getAttr('type', 'default') as ButtonType
    // size 就近读取 config-provider 注入值（自身属性 > config-provider > medium）
    const size = this.injectValue('size', 'medium') as ButtonSize
    const disabled = this.hasAttr('disabled')
    const loading = this.hasAttr('loading')

    this.btn.className = `${type} ${size}`
    this.btn.disabled = disabled || loading
    this.btn.setAttribute('aria-busy', loading ? 'true' : 'false')

    const spinner = this.btn.querySelector<HTMLElement>('.spinner')
    if (spinner) spinner.hidden = !loading
  }
}
