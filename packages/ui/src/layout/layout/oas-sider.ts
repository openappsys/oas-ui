import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  width: var(--oas-sider-width, 200px);
  /* 高度链：定高父（如 layout viewport 模式的 sider-part）时填满，配合内嵌
     sidebar height:100% 让其 panel 内部滚动；无定高父时忽略、行为不变 */
  height: 100%;
  box-sizing: border-box;
  background: var(--oas-color-bg-hover);
  padding: var(--oas-space-4);
  flex-shrink: 0;
  transition: width var(--oas-transition-base, 180ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1));
}
:host([collapsed]) {
  width: var(--oas-sider-collapsed-width, 64px);
}
/* 内嵌 sidebar 时轨道去 padding：sidebar 自带内边距体系（panel/item padding），
   轨道再叠 16px 会让 200px 轨道只剩 168px 有效宽，与内栏双重错位。
   data-embed 由 MutationObserver 同步（:host(:has()) 在 Chromium scoped CSS 不生效） */
:host([data-embed]) {
  padding: 0;
}
aside {
  height: 100%;
}
/* 内嵌 sidebar 填满轨道：宽度契约「sider 管轨道宽、sidebar 填满容器」——
   宿主改 --oas-sider-width 内栏自动跟随；sidebar 独立使用时仍走
   --oas-sidebar-width 默认 220px。min-width:0 防折叠态 64px 轨道被撑出横向滚动 */
::slotted(oas-sidebar) {
  width: 100%;
  min-width: 0;
}
:host([hidden]) {
  display: none;
}
`

export class OASSider extends OASElement {
  private observer: MutationObserver | null = null

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
    // 内嵌 oas-sidebar 检测：data-embed 驱动「去 padding + 填满轨道」组合
    // （:host(:has()) 在 Chromium scoped CSS 不生效，故 JS 同步属性）
    this.observer = new MutationObserver(() => this.syncEmbed())
    this.observer.observe(this, { childList: true })
    this.onCleanup(() => this.observer?.disconnect())
    this.syncEmbed()
  }

  /** 是否内嵌 oas-sidebar（直接子元素）：决定轨道让位给内栏填满 */
  private syncEmbed(): void {
    this.toggleAttribute('data-embed', this.querySelector(':scope > oas-sidebar') !== null)
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
