import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  text-align: center;
  padding: var(--oas-space-6);
  color: var(--oas-color-text-primary);
}
.icon {
  width: 72px;
  height: 72px;
  margin: 0 auto var(--oas-space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  line-height: 1;
}
.icon[data-status='success'] { color: var(--oas-color-success); }
.icon[data-status='error'] { color: var(--oas-color-danger); }
.icon[data-status='warning'] { color: var(--oas-color-warning); }
.icon[data-status='info'] { color: var(--oas-color-primary); }
.title {
  font-size: var(--oas-font-size-xl);
  font-weight: 600;
}
.description {
  margin-top: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
::slotted([slot='extra']) {
  margin-top: var(--oas-space-4);
  display: inline-block;
}
`

const ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
}

export class OASResult extends OASElement {
  static override get observedAttributes(): string[] {
    return ['status', 'title', 'description']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="icon" part="icon" role="status"></div>
      <div class="title" part="title"></div>
      <div class="description" part="description"></div>
      <slot name="extra"></slot>
    `
  }

  /** 无事件绑定（render 与水合路径共用，结构校验由 hydrate 完成） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（title 与 description 部件存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="title"]')) return false
    if (!this.shadow.querySelector('[part="description"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // status 增量同步：图标字形 + data-status + aria-label（SSR 快照与运行时变更共用同一通道）
    const status = this.getAttr('status', 'success')
    const icon = this.shadow.querySelector('[part="icon"]')
    icon?.setAttribute('data-status', status)
    icon?.setAttribute('aria-label', status)
    if (icon) icon.textContent = ICONS[status] ?? '✓'
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.getAttr(
      'title',
      '',
    )
    this.shadow.querySelector<HTMLElement>('[part="description"]')!.textContent = this.getAttr(
      'description',
      '',
    )
  }
}
