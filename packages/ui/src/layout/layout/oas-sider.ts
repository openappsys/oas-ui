import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  width: var(--oas-sider-width, 200px);
  background: var(--oas-color-bg-hover);
  padding: var(--oas-space-4);
  flex-shrink: 0;
  transition: width var(--oas-transition-base, 180ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1));
}
:host([collapsed]) {
  width: var(--oas-sider-collapsed-width, 64px);
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
  private bind(): void {
    // 与内部可折叠侧栏联动：捕获嵌入的 oas-sidebar 的折叠事件，同步自身 collapsed。
    // 自定义事件会从光 DOM 子元素冒泡到宿主，capture 监听即可拿到，无需逐子排查。
    this.addEventListener('oas-collapse', this.onInnerCollapse, true)
    this.onCleanup(() => this.removeEventListener('oas-collapse', this.onInnerCollapse, true))
  }

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

  /** 内部侧栏折叠/展开时同步自身 collapsed（保持外轨宽度与内栏图标条匹配） */
  private onInnerCollapse = (e: Event): void => {
    const detail = (e as CustomEvent<{ collapsed?: boolean }>).detail
    if (detail?.collapsed === undefined) return
    if (detail.collapsed) this.setAttribute('collapsed', '')
    else this.removeAttribute('collapsed')
  }
}
