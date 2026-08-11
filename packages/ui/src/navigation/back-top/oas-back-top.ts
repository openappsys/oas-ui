import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.btn {
  width: var(--oas-control-height-lg);
  height: var(--oas-control-height-lg);
  border-radius: 50%;
  border: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-lg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
.btn[aria-hidden='true'] {
  display: none;
}
.btn:hover {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
`

export class OASBackTop extends OASElement {
  static override get observedAttributes(): string[] {
    return ['visible', 'bottom', 'right']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <button class="btn" part="btn" type="button" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M8 13 V3 M4 7 L8 3 L12 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    `
  }

  /** 缓存节点引用 + 绑定点击（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('.btn')?.addEventListener('click', () => {
      this.emit('click')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
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
    const btn = this.shadow.querySelector('.btn')
    if (!btn) return
    const visible = this.hasAttr('visible')
    // 按钮 aria-label locale 驱动（setLocale 切换自动重刷）
    btn.setAttribute('aria-label', this.t('backTop.backToTop'))
    btn.setAttribute('aria-hidden', String(!visible))
    if (!visible) return
    const btnEl = btn as HTMLElement
    btnEl.style.bottom = this.getAttr('bottom', '32px')
    btnEl.style.right = this.getAttr('right', '32px')
  }
}
