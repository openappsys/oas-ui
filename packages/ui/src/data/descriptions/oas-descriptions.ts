import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.items {
  display: grid;
  grid-template-columns: repeat(var(--oas-desc-columns, 3), 1fr);
  row-gap: var(--oas-space-4);
  column-gap: var(--oas-space-4);
}
.title {
  font-weight: 600;
  margin-bottom: var(--oas-space-4);
}
`

export class OASDescriptions extends OASElement {
  static override get observedAttributes(): string[] {
    return ['column', 'title']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="title" part="title"></div>
      <div class="items" part="items"><slot></slot></div>
    `
  }

  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null

  /** 缓存节点引用（render 与水合路径共用；descriptions 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（items 网格存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="items"]')) return false
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
      const raw = this.getAttribute('title') ?? ''
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    const title = this.titleCache ?? ''
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = title
    const itemsEl = this.shadow.querySelector<HTMLElement>('[part="items"]')
    if (!itemsEl) return
    const column = this.getAttr('column', '3')
    itemsEl.setAttribute('data-column', column)
    itemsEl.style.setProperty('--oas-desc-columns', column)
  }
}
