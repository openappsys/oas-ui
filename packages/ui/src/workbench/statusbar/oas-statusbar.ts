import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

const STYLE = `
:host {
  display: flex;
  align-items: center;
  font-family: inherit;
  color: var(--oas-color-text-secondary);
  background: var(--oas-statusbar-bg, color-mix(in srgb, var(--oas-color-text-primary) 5%, var(--oas-color-bg)));
  border-block-start: 1px solid var(--oas-color-border);
  box-sizing: border-box;
  min-height: var(--oas-statusbar-height, 24px);
  font-size: var(--oas-font-size-xs);
}
:host([hidden]) {
  display: none;
}
.bar {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  min-width: 0;
  width: 100%;
  padding: 0 var(--oas-space-2);
  box-sizing: border-box;
}
/* 右段：margin-inline-start auto 推到书写方向远端（状态栏惯例：主项靠近端、上下文项靠远端，RTL 自动镜像） */
.end {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  min-width: 0;
  margin-inline-start: auto;
}
.end[hidden] {
  display: none;
}
::slotted(*) {
  flex-shrink: 0;
}
`

/**
 * oas-statusbar —— 状态栏（底部静默信息条）。
 *
 * 与 oas-footer（内容页脚）的分工：statusbar 承载状态词汇——左右分段、可点单元格、
 * 聚合状态、进度/告警语义色单元格；footer 是语义化内容页脚。
 *
 * 结构：默认插槽（左段单元格，与整个工作区相关的聚合状态）+ `end` 插槽（右段，
 * 次要/上下文项，margin auto 推远端，RTL 自动镜像）。
 *
 * 属性：
 * - `label`：可访问名称（缺省走 i18n「状态栏」）
 *
 * a11y：容器 `role="status"`（聚合状态变化可被读屏感知）+ aria-label；
 * 可点单元格为原生 button（键盘可达）；RTL：`data-rtl` 钩子 + 全逻辑属性布局。
 *
 * 事件：子件 `oas-item-click` 冒泡（bubbles + composed），容器与宿主均可监听。
 */
export class OASStatusbar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['label', 'dir']
  }

  private barEl: HTMLElement | null = null
  private endWrapEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="bar" part="bar" role="status">
        <slot></slot>
        <div class="end" part="end" hidden><slot name="end"></slot></div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.barEl = this.shadow.querySelector('[part="bar"]')
    this.endWrapEl = this.shadow.querySelector('[part="end"]')
    for (const s of this.shadow.querySelectorAll('slot')) {
      s.addEventListener('slotchange', () => this.update())
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（bar + slot 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="bar"]')) return false
    if (!this.shadow.querySelector('slot')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.toggleAttribute('data-rtl', isRtl(this))
    // 可访问名称：label 属性 > i18n 默认（locale 反应式）
    this.barEl?.setAttribute('aria-label', this.getAttr('label', '') || this.t('statusbar.label'))
    // end 段空态：无内容时不渲染容器（无空占位）
    const endSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="end"]')
    if (this.endWrapEl && endSlot) this.endWrapEl.hidden = !this.hasSlotContent(endSlot)
  }

  /** 插槽是否有「真实内容」：注释节点与纯空白文本不算（对齐 app-bar 判据） */
  private hasSlotContent(slot: HTMLSlotElement): boolean {
    const nodes = slot.assignedNodes({ flatten: true })
    return nodes.length > 0 && nodes.some((n) => this.isRealNode(n))
  }

  private isRealNode(node: Node): boolean {
    if (node.nodeType === Node.COMMENT_NODE) return false
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim() !== ''
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      if (el.tagName.includes('-')) return true
      return el.childNodes.length === 0 || [...el.childNodes].some((c) => this.isRealNode(c))
    }
    return true
  }
}
