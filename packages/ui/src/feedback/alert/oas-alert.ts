import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
/* 关闭态：host hidden 会被上面的作者级 display 规则覆盖，需显式补回（关闭按钮点击后真正隐藏） */
:host([hidden]) {
  display: none;
}
.box {
  display: flex;
  align-items: flex-start;
  gap: var(--oas-space-2);
  padding: var(--oas-space-3) var(--oas-space-4);
  border-radius: var(--oas-radius-md);
  border: 1px solid transparent;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg);
}
.box[data-type='info'] {
  border-color: color-mix(in srgb, var(--oas-color-primary) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-primary) 10%, transparent);
  color: var(--oas-color-primary);
}
.box[data-type='success'] {
  border-color: color-mix(in srgb, var(--oas-color-success) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-success) 10%, transparent);
  color: var(--oas-color-success);
}
.box[data-type='warning'] {
  border-color: color-mix(in srgb, var(--oas-color-warning) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-warning) 10%, transparent);
  color: var(--oas-color-warning);
}
.box[data-type='error'] {
  border-color: color-mix(in srgb, var(--oas-color-danger) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-danger) 10%, transparent);
  color: var(--oas-color-danger);
}
.title {
  font-weight: 600;
  margin-bottom: var(--oas-space-1);
}
.body {
  flex: 1;
  line-height: 1.6;
}
.close-btn {
  cursor: pointer;
  border: none;
  background: none;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
`

const ROLES = { info: 'status', success: 'status', warning: 'status', error: 'alert' } as const

export class OASAlert extends OASElement {
  static override get observedAttributes(): string[] {
    return ['type', 'title', 'closeable']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="box" part="box">
        <div class="body" part="body">
          <div class="title" part="title"></div>
          <slot></slot>
        </div>
        ${this.hasAttr('closeable') ? '<button class="close-btn" part="close" aria-label="">✕</button>' : ''}
      </div>
    `
  }

  /** 绑定关闭事件（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('[part="close"]')?.addEventListener('click', () => {
      this.emit('close')
      this.hidden = true
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（box 容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="box"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // type/role 增量同步（SSR 快照与运行时变更共用同一通道）
    const type = this.getAttr('type', 'info')
    const box = this.shadow.querySelector('[part="box"]')
    box?.setAttribute('data-type', type)
    box?.setAttribute('role', ROLES[type as keyof typeof ROLES] ?? 'status')
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.getAttr(
      'title',
      '',
    )
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow
      .querySelector<HTMLElement>('[part="close"]')
      ?.setAttribute('aria-label', this.t('alert.close'))
  }
}
