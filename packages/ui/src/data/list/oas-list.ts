import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
[hidden] {
  display: none !important;
}
.list {
  border-radius: var(--oas-radius-md);
  overflow: hidden;
}
.list[data-bordered='true'] {
  border: 1px solid var(--oas-color-border);
}
.list[data-split='true'] ::slotted(oas-list-item) {
  border-bottom: 1px solid var(--oas-color-border);
}
.list[data-split='true'] ::slotted(oas-list-item:last-child) {
  border-bottom: none;
}
/* 加载态：骨架占位（复用 Skeleton 流光风格） */
.skeleton {
  padding: var(--oas-space-3) var(--oas-space-4);
}
.sk-line {
  height: var(--oas-control-height-sm);
  border-radius: var(--oas-radius-sm);
  background: linear-gradient(90deg, var(--oas-color-bg-hover) 25%, var(--oas-color-border) 50%, var(--oas-color-bg-hover) 75%);
  background-size: 200% 100%;
  animation: oas-list-shimmer 1.5s infinite;
  margin-bottom: var(--oas-space-3);
}
.sk-title {
  width: 40%;
}
.sk-short {
  width: 62%;
  margin-bottom: 0;
}
@keyframes oas-list-shimmer {
  to { background-position: -200% 0; }
}
/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--oas-space-6);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--oas-color-bg-hover);
  border: 1px dashed var(--oas-color-border-strong);
  margin-bottom: var(--oas-space-2);
}
`

export class OASList extends OASElement {
  static override get observedAttributes(): string[] {
    return ['bordered', 'split', 'loading', 'empty', 'empty-text']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="list" part="list">
        <div class="list-body" part="body"><slot></slot></div>
        <div class="skeleton" part="skeleton" hidden>
          <div class="sk-line sk-title"></div>
          <div class="sk-line"></div>
          <div class="sk-line sk-short"></div>
        </div>
        <div class="empty" part="empty" hidden>
          <div class="empty-icon" aria-hidden="true"></div>
          <span part="empty-text"></span>
        </div>
      </div>
    `
    this.update()
  }

  protected override update(): void {
    const list = this.shadow.querySelector('[part="list"]')
    if (!list) return
    list.setAttribute('data-bordered', String(this.hasAttr('bordered')))
    list.setAttribute('data-split', String(this.hasAttr('split') || !this.hasAttr('bordered')))

    const body = this.shadow.querySelector<HTMLElement>('[part="body"]')
    const skeleton = this.shadow.querySelector<HTMLElement>('[part="skeleton"]')
    const empty = this.shadow.querySelector<HTMLElement>('[part="empty"]')
    if (!body || !skeleton || !empty) return

    const loading = this.hasAttr('loading')
    const hasItems = Array.from(this.children).some(
      (c) => c.tagName.toLowerCase() === 'oas-list-item',
    )
    const isEmpty = !loading && (this.hasAttr('empty') || !hasItems)

    body.hidden = loading || isEmpty
    skeleton.hidden = !loading
    empty.hidden = !isEmpty
    const text = this.shadow.querySelector<HTMLElement>('[part="empty-text"]')
    if (text) text.textContent = this.getAttr('empty-text', this.t('list.empty'))
  }
}
