import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--oas-space-6);
  font-family: inherit;
  color: var(--oas-color-text-secondary);
}
.image {
  width: 96px;
  height: 96px;
  opacity: 0.7;
}
.description {
  margin-top: var(--oas-space-3);
  font-size: var(--oas-font-size-sm);
}
:host([hide-image]) .image {
  display: none;
}
::slotted([slot='action']) {
  margin-top: var(--oas-space-3);
}
`

const ILLUSTRATION = `
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" width="96" height="96" aria-hidden="true">
  <rect x="28" y="36" width="64" height="44" rx="8" fill="#e4e4e7" stroke="#a1a1aa" stroke-width="2"/>
  <line x1="28" y1="50" x2="92" y2="50" stroke="#a1a1aa" stroke-width="2"/>
  <line x1="40" y1="60" x2="80" y2="60" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
  <line x1="48" y1="68" x2="72" y2="68" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
  <circle cx="60" cy="84" r="14" fill="#0b6cff" opacity="0.15"/>
  <circle cx="60" cy="84" r="5" fill="#0b6cff"/>
</svg>
`

export class OASEmpty extends OASElement {
  static override get observedAttributes(): string[] {
    return ['description', 'hide-image']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="image" part="image">${ILLUSTRATION}</div>
      <div class="description" part="description"></div>
      <slot name="action"></slot>
    `
    this.update()
  }

  protected override update(): void {
    // description 属性优先，缺省走 locale registry 默认文案（setLocale 切换自动刷新）
    const description = this.hasAttr('description') ? this.getAttr('description') : this.t('empty.noData')
    this.shadow.querySelector<HTMLElement>('[part="description"]')!.textContent = description
  }
}
