import { OASElement } from '@oas-ui/core'

export type DividerDirection = 'horizontal' | 'vertical'
export type DividerPosition = 'left' | 'center' | 'right'

const STYLE = `
:host {
  display: block;
  width: 100%;
  font-family: inherit;
}
:host([direction='vertical']) {
  display: inline-block;
  width: auto;
  vertical-align: middle;
}
.divider {
  display: flex;
  align-items: center;
  margin: var(--oas-space-4) 0;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  gap: var(--oas-space-3);
}
.divider.empty {
  gap: 0;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--oas-color-border-strong);
}
.divider.left::before {
  flex: 0 0 5%;
}
.divider.right::after {
  flex: 0 0 5%;
}
.divider.dashed::before,
.divider.dashed::after {
  background: repeating-linear-gradient(
    to right,
    var(--oas-color-border-strong) 0,
    var(--oas-color-border-strong) 4px,
    transparent 4px,
    transparent 8px
  );
}
:host([direction='vertical']) .divider {
  flex-direction: column;
  width: 1px;
  height: 1em;
  margin: 0 var(--oas-space-3);
  align-items: stretch;
}
:host([direction='vertical']) .divider::before,
:host([direction='vertical']) .divider::after {
  flex: 1;
  width: 1px;
  height: auto;
  background: var(--oas-color-border-strong);
}
`

export class OASDivider extends OASElement {
  static override get observedAttributes(): string[] {
    return ['direction', 'dashed', 'content-position']
  }

  private dividerEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="divider" part="divider" role="separator">
        <slot></slot>
      </div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用） */
  private bind(): void {
    this.dividerEl = this.shadow.querySelector('.divider')
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（关键节点 .divider 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.divider')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const el = this.dividerEl
    if (!el) return
    const direction = this.getAttr('direction', 'horizontal') as DividerDirection
    const dashed = this.hasAttr('dashed')
    const position = this.getAttr('content-position', 'center') as DividerPosition

    el.classList.toggle('dashed', dashed)
    el.classList.toggle('left', position === 'left')
    el.classList.toggle('right', position === 'right')
    el.setAttribute('aria-orientation', direction)
    const slot = el.querySelector('slot') as HTMLSlotElement | null
    el.classList.toggle('empty', !slot?.assignedNodes().length)
  }
}
