import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.card {
  position: fixed;
  z-index: var(--oas-z-tooltip, 1080);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: var(--oas-space-4);
  min-width: 200px;
  color: var(--oas-color-text-primary);
}
.card[aria-hidden='true'] {
  display: none;
}
.title {
  font-weight: 600;
  font-size: var(--oas-font-size-md);
  margin-bottom: var(--oas-space-2);
}
.content {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  line-height: 1.6;
}
`

export class OASHoverCard extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'title', 'content', 'placement', 'delay']
  }

  private card: HTMLElement | null = null
  private anchor: Element | null = null
  private showTimer: ReturnType<typeof setTimeout> | null = null
  private hideTimer: ReturnType<typeof setTimeout> | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
      <div class="card" part="card" role="dialog" aria-hidden="true">
        <div class="title" part="title"></div>
        <div class="content" part="content"></div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 清理计时器（render 与水合路径共用） */
  private bind(): void {
    this.card = this.shadow.querySelector('.card')
    this.anchor = this.querySelector(':scope > *') ?? this
    this.anchor?.addEventListener('mouseenter', () => this.scheduleShow())
    this.anchor?.addEventListener('mouseleave', () => this.scheduleHide())
    this.anchor?.addEventListener('focusin', () => this.scheduleShow())
    this.anchor?.addEventListener('focusout', () => this.scheduleHide())
    this.onCleanup(() => {
      if (this.showTimer) clearTimeout(this.showTimer)
      if (this.hideTimer) clearTimeout(this.hideTimer)
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（card 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.card')) return false
    this.bind()
    return true
  }

  private scheduleShow(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer)
    const delay = Number(this.getAttr('delay', '100'))
    this.showTimer = setTimeout(() => this.setAttribute('open', ''), delay)
  }

  private scheduleHide(): void {
    if (this.showTimer) clearTimeout(this.showTimer)
    const delay = Number(this.getAttr('delay', '100'))
    this.hideTimer = setTimeout(() => this.removeAttribute('open'), delay)
  }

  protected override update(): void {
    if (!this.card) return
    const open = this.hasAttr('open')
    this.card.setAttribute('aria-hidden', String(!open))
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.getAttr(
      'title',
      '',
    )
    this.shadow.querySelector<HTMLElement>('[part="content"]')!.textContent = this.getAttr(
      'content',
      '',
    )
    if (!open) return
    const anchorRect = this.anchor?.getBoundingClientRect()
    if (!anchorRect) return
    const cardRect = this.card.getBoundingClientRect()
    const { top, left } = computePosition(
      anchorRect,
      cardRect,
      this.getAttr('placement', 'top') as Placement,
      { width: window.innerWidth, height: window.innerHeight },
    )
    this.card.style.top = `${top}px`
    this.card.style.left = `${left}px`
  }
}
