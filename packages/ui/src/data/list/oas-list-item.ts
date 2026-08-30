import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
  padding: var(--oas-space-3) var(--oas-space-4);
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.title {
  font-weight: 500;
  font-size: var(--oas-font-size-md);
}
.main {
  flex: 1;
  min-width: 0;
}
.desc {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.extra {
  flex-shrink: 0;
}
`

export class OASListItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['title']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="main" part="main">
        <div class="title" part="title"></div>
        <div class="desc" part="desc"><slot name="description"><slot></slot></slot></div>
      </div>
      <div class="extra"><slot name="extra"></slot></div>
    `
  }

  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null

  /** 缓存节点引用（render 与水合路径共用；list-item 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（main 骨架存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="main"]')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  protected override update(): void {
    // title 吸收：title 渲染进可见标题区后即从宿主移除——title 是原生全局属性，
    // 残留在宿主上会让组件悬停弹出浏览器原生提示（与可见标题重复的视觉干扰）。
    // 状态机：属性在场（含空串）= 宿主意图（写入新值/空串清空）→ 更新缓存并移除；
    // 属性缺席 = 内部吸收后的常态（或宿主 removeAttribute，此时保持已渲染标题，
    // 清空请用 title=""）。缓存驱动渲染，吸收触发的二次 update 幂等。
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    const title = this.titleCache ?? ''
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = title
  }
}
