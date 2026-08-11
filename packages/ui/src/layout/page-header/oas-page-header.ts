import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  padding: var(--oas-space-4) var(--oas-space-5);
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--oas-control-height-md);
  height: var(--oas-control-height-md);
  margin-right: var(--oas-space-1);
  border: none;
  background: none;
  border-radius: 50%;
  cursor: pointer;
  color: var(--oas-color-text-primary);
  padding: 0;
  transition:
    background var(--oas-transition-fast) var(--oas-ease-out),
    color var(--oas-transition-fast) var(--oas-ease-out);
}
.back:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-primary);
}
.back:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.title {
  font-size: var(--oas-font-size-xl);
  font-weight: 600;
  flex: 1;
}
.extra {
  display: flex;
  gap: var(--oas-space-2);
}
`

export class OASPageHeader extends OASElement {
  static override get observedAttributes(): string[] {
    return ['title', 'back', 'subtitle']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致（back 存在性由宿主属性决定） */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="row" part="row">
        ${
          this.hasAttr('back')
            ? `<button class="back" part="back" type="button">
               <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                 <path d="M14.5 5.5 L8 12 L14.5 18.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
               </svg>
             </button>`
            : ''
        }
        <div>
          <div class="title" part="title"></div>
          <div class="subtitle" part="subtitle"></div>
        </div>
        <div class="extra"><slot name="extra"></slot></div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定返回按钮（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('[part="back"]')?.addEventListener('click', () => this.emit('back'))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（row 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.row')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // 返回按钮 aria-label locale 驱动（setLocale 切换自动重刷）
    const back = this.shadow.querySelector<HTMLElement>('[part="back"]')
    if (back) back.setAttribute('aria-label', this.t('pageHeader.back'))
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.getAttr(
      'title',
      '',
    )
    this.shadow.querySelector<HTMLElement>('[part="subtitle"]')!.textContent = this.getAttr(
      'subtitle',
      '',
    )
  }
}
