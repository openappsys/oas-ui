import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  position: fixed;
  bottom: var(--oas-space-6);
  right: var(--oas-space-6);
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-fixed, 1030));
}
:host([hidden]) {
  display: none;
}
.btn {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  font-size: var(--oas-font-size-xl);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  font-family: inherit;
}
.btn:hover {
  background: var(--oas-color-primary-hover);
}
.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: var(--oas-color-danger);
  color: var(--oas-color-text-on-danger);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
`

export class OASFloatButton extends OASElement {
  static override get observedAttributes(): string[] {
    return ['badge']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <button class="btn" part="btn" type="button">
        <slot name="icon">＋</slot>
        ${this.hasAttr('badge') ? '<span class="badge" part="badge"></span>' : ''}
      </button>
    `
  }

  /** 缓存节点引用 + 绑定点击（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('.btn')?.addEventListener('click', () => this.emit('click'))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（按钮存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.btn')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // 按钮 aria-label locale 驱动（setLocale 切换自动重刷）
    this.shadow
      .querySelector<HTMLElement>('[part="btn"]')
      ?.setAttribute('aria-label', this.t('floatButton.action'))
    const badge = this.shadow.querySelector('[part="badge"]')
    if (badge) badge.textContent = this.getAttr('badge', '')
  }
}
