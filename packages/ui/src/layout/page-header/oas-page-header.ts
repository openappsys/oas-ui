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
  margin-inline-end: var(--oas-space-1);
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
/* 头部独立行：breadcrumb 具名插槽（组合 oas-breadcrumb 原组件，不做数据通道） */
.breadcrumb {
  margin-bottom: var(--oas-space-2);
}
/* 标题行下方正文区：默认插槽 */
.content {
  margin-top: var(--oas-space-3);
}
/* 底部区：footer 具名插槽（分割线 + 上间距） */
.footer {
  margin-top: var(--oas-space-4);
  border-top: 1px solid var(--oas-color-border);
  padding-top: var(--oas-space-3);
}
/* ghost 透明背景变体：页头背景规则置 none（强制透明，让所在容器/页面底色透出），
   footer 分隔线一并去除；标题/文字色保持 :host 既有主题前景 token，其余布局不变 */
:host(.oas-page-header--ghost) {
  background: none;
}
:host(.oas-page-header--ghost) .footer {
  border-top: none;
}
/* hidden 属性会被作者级 display 覆盖，需显式补回（空区块渲染层不空占位） */
.breadcrumb[hidden] {
  display: none;
}
.content[hidden] {
  display: none;
}
.footer[hidden] {
  display: none;
}
.avatar[hidden] {
  display: none;
}
.title[hidden] {
  display: none;
}
.subtitle[hidden] {
  display: none;
}
.back-icon[hidden] {
  display: none;
}
`

/**
 * oas-page-header —— 页面头部信息区。
 *
 * 属性（kebab-case）：
 * - `title` / `subtitle`：标题/副标题文案（渲染进可见标题区后 title 即从宿主移除，不残留悬浮提示）
 * - `back`：布尔，显示返回按钮（点击派发 `oas-back`）
 * - `ghost`：布尔，透明背景变体——背景规则置 none、footer 分隔线去除，文字色保持主题前景 token；
 *   适合叠加在有色背景容器/页面上让底色透出；缺省 false 保持默认形态
 *
 * 插槽：正文默认插槽；`breadcrumb` / `footer` / `avatar` 无内容时不渲染；
 * `title` / `subtitle` / `back-icon` 插槽有内容时覆盖属性/内置图标。
 */
export class OASPageHeader extends OASElement {
  static override get observedAttributes(): string[] {
    return ['title', 'back', 'subtitle', 'ghost']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致（back 存在性由宿主属性决定） */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="breadcrumb" part="breadcrumb" hidden>
        <slot name="breadcrumb"></slot>
      </div>
      <div class="row" part="row">
        ${
          this.hasAttr('back')
            ? `<button class="back" part="back" type="button">
               <svg class="back-icon" part="back-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                 <path d="M14.5 5.5 L8 12 L14.5 18.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
               </svg>
               <slot name="back-icon"></slot>
             </button>`
            : ''
        }
        <div class="avatar" part="avatar" hidden>
          <slot name="avatar"></slot>
        </div>
        <div>
          <div class="title" part="title"></div>
          <slot name="title"></slot>
          <div class="subtitle" part="subtitle"></div>
          <slot name="subtitle"></slot>
        </div>
        <div class="extra"><slot name="extra"></slot></div>
      </div>
      <div class="content" part="content" hidden>
        <slot></slot>
      </div>
      <div class="footer" part="footer" hidden>
        <slot name="footer"></slot>
      </div>
    `
  }

  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null

  /** 缓存节点引用 + 绑定返回按钮与插槽变更监听（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('[part="back"]')?.addEventListener('click', () => this.emit('back'))
    // 插槽内容增减（slotchange 异步触发）时重刷区块显隐/双通道；
    // 监听挂在 shadow 内部节点上，随元素整体回收，无全局泄漏
    const onSlotChange = () => this.update()
    for (const name of ['', 'title', 'subtitle', 'back-icon', 'breadcrumb', 'footer', 'avatar']) {
      this.shadow
        .querySelector<HTMLSlotElement>(name === '' ? 'slot:not([name])' : `slot[name="${name}"]`)
        ?.addEventListener('slotchange', onSlotChange)
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（row 存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉（subtitle 非原生全局属性、无吸收，不走恢复） */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.row')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  protected override update(): void {
    // ghost 透明背景变体：宿主类名作 CSS 钩子（背景置 none + footer 分隔线去除，颜色走 token）
    this.classList.toggle('oas-page-header--ghost', this.hasAttr('ghost'))
    // 返回按钮 aria-label locale 驱动（setLocale 切换自动重刷）
    const back = this.shadow.querySelector<HTMLElement>('[part="back"]')
    if (back) back.setAttribute('aria-label', this.t('pageHeader.back'))
    // back-icon 插槽覆盖内置 chevron：插槽有真实内容时隐藏内置图标
    const backIcon = this.shadow.querySelector<HTMLElement>('[part="back-icon"]')
    const backIconSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="back-icon"]')
    if (backIcon && backIconSlot) backIcon.hidden = this.hasSlotContent(backIconSlot)
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
    // title / subtitle 双通道：attribute 文案为默认通道，具名插槽有真实内容时覆盖
    this.syncHeading('title', 'title', title)
    this.syncHeading('subtitle', 'subtitle', this.getAttr('subtitle', ''))
    // 空区块：content / footer / breadcrumb / avatar 无插槽内容时不渲染（无空占位）
    this.syncBlock('content', null)
    this.syncBlock('footer', 'footer')
    this.syncBlock('breadcrumb', 'breadcrumb')
    this.syncBlock('avatar', 'avatar')
  }

  /** title/subtitle 双通道：attribute 文本写入 part 元素，插槽有真实内容时隐藏之（富内容占位） */
  private syncHeading(partName: string, slotName: string, text: string): void {
    const el = this.shadow.querySelector<HTMLElement>(`[part="${partName}"]`)
    const slot = this.shadow.querySelector<HTMLSlotElement>(`slot[name="${slotName}"]`)
    if (!el || !slot) return
    el.textContent = text
    el.hidden = this.hasSlotContent(slot)
  }

  /** 空区块显隐：有真实插槽内容显示、无则隐藏（hidden + CSS 兜底，渲染层不空占位） */
  private syncBlock(partName: string, slotName: string | null): void {
    const block = this.shadow.querySelector<HTMLElement>(`[part="${partName}"]`)
    const slot = this.shadow.querySelector<HTMLSlotElement>(
      slotName === null ? 'slot:not([name])' : `slot[name="${slotName}"]`,
    )
    if (!block || !slot) return
    block.hidden = !this.hasSlotContent(slot)
  }

  /**
   * 插槽是否有「真实内容」：注释节点与纯空白文本不算（back-icon 空注释兜底等边界）；
   * 元素递归判定——自定义元素（自身 shadow 渲染）与无子节点叶元素（svg path 等）算内容
   */
  private hasSlotContent(slot: HTMLSlotElement): boolean {
    const nodes = slot.assignedNodes({ flatten: true })
    return nodes.length > 0 && nodes.some((n) => this.isRealNode(n))
  }

  private isRealNode(node: Node): boolean {
    if (node.nodeType === Node.COMMENT_NODE) return false
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim() !== ''
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      // 自定义元素（含连字符）：由自身 shadow DOM 渲染，直接算内容
      if (el.tagName.includes('-')) return true
      // 无子节点的叶元素（如 svg path）算内容；否则递归看子节点
      return el.childNodes.length === 0 || [...el.childNodes].some((c) => this.isRealNode(c))
    }
    return true
  }
}
