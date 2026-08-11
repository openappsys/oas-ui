import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  width: 200px;
  background: var(--oas-color-bg-hover);
  padding: var(--oas-space-4);
  flex-shrink: 0;
}
:host([collapsed]) {
  width: 64px;
}
:host([hidden]) {
  display: none;
}
`

export class OASSider extends OASElement {
  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <aside part="sider"><slot></slot></aside>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；sider 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（aside 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('aside')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // 侧边栏 aria-label locale 驱动（setLocale 切换自动重刷）
    this.shadow
      .querySelector<HTMLElement>('[part="sider"]')
      ?.setAttribute('aria-label', this.t('layout.sider'))
  }
}
