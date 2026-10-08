import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--oas-space-2);
  font-family: inherit;
  /* marker 是行内小标记：字号跟随外层（次级文本 0.85em 比例，同 comment 先例） */
  font-size: var(--oas-marker-font, inherit);
  color: var(--oas-color-text-secondary);
}
:host([hidden]) {
  display: none !important;
}
/* 空态收起：default/border 无内容整件隐藏——走 data-empty 反射，
 * 不占用宿主 hidden（宿主显式隐藏意图不被组件清除） */
:host([data-empty]) {
  display: none !important;
}
.marker {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1_5);
  font-size: 0.857em;
  line-height: 1.6;
}
.icon {
  display: inline-flex;
  align-items: center;
  color: inherit;
}
.icon[hidden] {
  display: none !important;
}
.icon ::slotted(*) {
  display: inline-flex;
}
.content {
  min-width: 0;
}
.content:empty {
  display: none;
}
/* border：描边胶囊行 */
:host([variant="border"]) .marker {
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-full, 999px);
  padding: var(--oas-space-1) var(--oas-space-2_5);
  background: var(--oas-color-bg);
}
/* separator：两侧伸缩线 + 中间文字（时间戳/系统事件分隔主形态） */
:host([variant="default"]) .marker {
  color: var(--oas-color-text-secondary);
}
:host([variant="separator"]) {
  gap: var(--oas-space-3);
}
:host([variant="separator"]) .marker::before,
:host([variant="separator"]) .marker::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--oas-color-border);
}
:host([variant="separator"]) .marker {
  flex: 1;
  justify-content: center;
}
`

/**
 * oas-marker —— 会话时间戳/系统事件标记（行内小状态、描边行、分隔线）。
 *
 * 属性：
 * - `variant`：`default`（小号次级文字，默认）| `border`（描边胶囊行）| `separator`（两侧线 + 中间文字）
 *
 * role 约定：流式/进度状态由宿主直接写 `role="status"`（浏览器原生 ARIA 反射，
 * 组件不重复转发）；带文字分隔线**不得**加 `role="separator"`（其可读名来自 aria-label、
 * 文字被视为装饰——ARIA 纪律，文档明示）。
 *
 * 插槽：`icon`（装饰图标，包裹层 aria-hidden）、默认（文本）
 *
 * 空态：default/border 变体无内容时整件隐藏（`data-empty` 反射驱动，不占用宿主
 * `hidden`——宿主显式隐藏意图不被组件清除）；separator 保留分隔线本体。
 *
 * 部件：`marker` / `icon` / `content`
 */
export class OASMarker extends OASElement {
  static override get observedAttributes(): string[] {
    return ['variant']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="marker" part="marker">
        <span class="icon" part="icon" aria-hidden="true" hidden><slot name="icon"></slot></span>
        <span class="content" part="content"><slot></slot></span>
      </div>
    `
  }

  private bind(): void {
    for (const slot of this.shadow.querySelectorAll('slot')) {
      slot.addEventListener('slotchange', this.handleSlotChange)
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（marker 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="marker"]')) return false
    this.bind()
    return true
  }

  /** 插槽是否有实质内容：元素节点，或非纯空白文本（忽略源码缩进空白） */
  private slotHasContent(slot: HTMLSlotElement | null): boolean {
    if (!slot) return false
    return slot.assignedNodes().some((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) return true
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0
      return false
    })
  }

  protected override update(): void {
    const iconWrap = this.shadow.querySelector<HTMLElement>('[part="icon"]')
    const contentWrap = this.shadow.querySelector<HTMLElement>('[part="content"]')
    const iconSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="icon"]')
    const defaultSlot = this.shadow.querySelector<HTMLSlotElement>('slot:not([name])')
    if (iconWrap) iconWrap.hidden = !this.slotHasContent(iconSlot)
    const hasText = this.slotHasContent(defaultSlot)
    // 空态：default/border 无内容整件隐藏（data-empty 反射，不动宿主 hidden）；separator 保留分隔线本体
    this.toggleAttribute('data-empty', !hasText && this.getAttr('variant') !== 'separator')
    if (contentWrap) contentWrap.hidden = !hasText
  }

  private handleSlotChange = (): void => {
    this.update()
  }
}
