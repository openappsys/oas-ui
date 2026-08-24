import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  min-height: 100%;
  font-family: inherit;
  background: var(--oas-color-bg);
}
:host([hidden]) {
  display: none;
}
.struct {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.struct.has-sider .main {
  flex-direction: row;
}
.sider-part {
  flex-shrink: 0;
}
.content-part {
  flex: 1;
  min-width: 0;
}
`

export class OASLayout extends OASElement {
  private observer: MutationObserver | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="struct" part="root" data-has-sider="false">
        <slot name="header"></slot>
        <div class="main">
          <div class="sider-part" part="sider"><slot name="sider"></slot></div>
          <div class="content-part" part="content"><slot name="content"></slot></div>
        </div>
        <slot name="footer"></slot>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定观察器 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.observer = new MutationObserver(() => this.update())
    this.observer.observe(this, { childList: true, subtree: false })
    this.onCleanup(() => this.observer?.disconnect())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（struct 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.struct')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const struct = this.shadow.querySelector<HTMLElement>('.struct')
    if (!struct) return
    // 用 slot="sider" 判定而非标签 oas-sider：允许任意元素（oas-sider/div 等）进左轨，
    // 否则非 oas-sider 的 slot 元素会静默渲染成全宽顶带且无警告
    const hasSider = this.querySelector('[slot="sider"]') !== null
    struct.classList.toggle('has-sider', hasSider)
    struct.setAttribute('data-has-sider', String(hasSider))
  }
}
