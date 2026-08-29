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

export class OASPageHeader extends OASElement {
  static override get observedAttributes(): string[] {
    return ['title', 'back', 'subtitle']
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

  /** 缓存节点引用 + 绑定返回按钮与插槽变更监听（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('[part="back"]')?.addEventListener('click', () => this.emit('back'))
    // 插槽内容增减（slotchange 异步触发）时重刷区块显隐/双通道；
    // 监听挂在 shadow 内部节点上，随元素整体回收，无全局泄漏
    const onSlotChange = () => this.update()
    for (const name of ['', 'title', 'subtitle', 'back-icon', 'breadcrumb', 'footer']) {
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
    // back-icon 插槽覆盖内置 chevron：插槽有真实内容时隐藏内置图标
    const backIcon = this.shadow.querySelector<HTMLElement>('[part="back-icon"]')
    const backIconSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="back-icon"]')
    if (backIcon && backIconSlot) backIcon.hidden = this.hasSlotContent(backIconSlot)
    // title / subtitle 双通道：attribute 文案为默认通道，具名插槽有真实内容时覆盖
    this.syncHeading('title', 'title', this.getAttr('title', ''))
    this.syncHeading('subtitle', 'subtitle', this.getAttr('subtitle', ''))
    // 空区块：content / footer / breadcrumb 无插槽内容时不渲染（无空占位）
    this.syncBlock('content', null)
    this.syncBlock('footer', 'footer')
    this.syncBlock('breadcrumb', 'breadcrumb')
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
