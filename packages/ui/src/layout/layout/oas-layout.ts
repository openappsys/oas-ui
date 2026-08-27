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
/* 侧栏位置切换：side 属性（left 默认 / right / top）控制 main 主轴方向，
   使 sider 槽内容落位于 左/右/顶（顶部菜单可复用 oas-menubar/oas-navigation-menu 等水平导航） */
.struct.has-sider[data-side='right'] .main {
  flex-direction: row-reverse;
}
.struct.has-sider[data-side='top'] .main {
  flex-direction: column;
}
.struct.has-sider[data-side='top'] .sider-part {
  width: 100%;
}
.sider-part {
  flex-shrink: 0;
}
.content-part {
  flex: 1;
  min-width: 0;
}
/* ===== viewport：视口锁定模式（admin 场景——顶栏固定 + 侧栏/内容各自独立滚动） =====
   默认仍是整页滚动模型（min-height 100%）；viewport 属性 opt-in 锁定高度：
   100dvh 优先（移动端地址栏友好）、100vh 级联回退；--oas-layout-height 开口
   供宿主改 100% / calc(100vh - 顶部条) 等 */
:host([viewport]) {
  height: 100vh;
  height: var(--oas-layout-height, 100dvh);
  min-height: 0;
}
.struct.is-viewport {
  height: 100%;
  min-height: 0;
}
.struct.is-viewport .main {
  min-height: 0;
}
/* 各区独立滚动：任意槽内容超视口时在本区内滚，页面整体不出滚动条 */
.struct.is-viewport .sider-part {
  overflow-y: auto;
  min-height: 0;
}
.struct.is-viewport .content-part {
  overflow-y: auto;
  min-height: 0;
}
`

export class OASLayout extends OASElement {
  static override get observedAttributes(): string[] {
    return ['viewport', 'side']
  }

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
    // viewport：CSS 走 :host([viewport])，这里同步结构层类钩子（struct/main/part 级滚动规则）
    const viewport = this.hasAttr('viewport')
    struct.classList.toggle('is-viewport', viewport)
    struct.setAttribute('data-viewport', String(viewport))
    // side：侧栏位置（left/right/top），非法值回落 left；写入 data-side 供 CSS/host 挂钩
    const rawSide = this.getAttr('side', 'left')
    const side = rawSide === 'right' || rawSide === 'top' ? rawSide : 'left'
    struct.setAttribute('data-side', side)
  }
}
