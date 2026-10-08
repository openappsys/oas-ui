import { OASElement } from '@oas-ui/core'

/** 发送状态（IM 惯例五态；非法值/缺省不渲染状态区） */
export type MessageRowStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  --oas-message-gap: var(--oas-space-4);
}
:host([hidden]) {
  display: none !important;
}
/* 行布局所有者：头像槽 + 内容列；头像底对齐（长消息贴底通行细节） */
.row {
  display: flex;
  align-items: flex-end;
  gap: var(--oas-space-2_5);
}
.avatar {
  flex-shrink: 0;
}
.avatar[hidden] {
  display: none !important;
}
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
}
/* 我方消息（align=end）：行方向翻转 + 文本列逻辑对齐（RTL 自动镜像） */
:host([align="end"]) .row {
  flex-direction: row-reverse;
}
:host([align="end"]) .main {
  align-items: flex-end;
}
:host([align="end"]) .header,
:host([align="end"]) .footer,
:host([align="end"]) .status {
  text-align: end;
}
.header {
  display: block;
  font-size: 0.857em;
  color: var(--oas-color-text-secondary);
}
.header[hidden] {
  display: none !important;
}
.content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}
:host([align="end"]) .content {
  align-items: flex-end;
}
.content ::slotted(*) {
  max-width: 100%;
}
.footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-2);
  font-size: 0.857em;
  color: var(--oas-color-text-secondary);
}
.footer[hidden] {
  display: none !important;
}
/* 发送状态：可见小字 + 装饰图标（语义不单靠颜色传达；error 追加 danger 色作增强） */
.status {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.status[hidden] {
  display: none !important;
}
.status svg {
  flex-shrink: 0;
}
/* sending 态双弧旋转（icon 自带 .spin 类；reduced-motion 停转） */
.status svg.spin {
  animation: message-row-spin 0.9s linear infinite;
}
@keyframes message-row-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .status svg.spin {
    animation: none;
  }
}
:host([status="read"]) .status {
  color: var(--oas-color-primary-text);
}
:host([status="error"]) .status {
  color: var(--oas-color-danger-text);
}
/* 连续同发送者聚拢：收行间距（与上一条消息同发送者时由宿主声明 grouped） */
:host([grouped]) {
  margin-block-start: calc(var(--oas-message-gap) * -1 + var(--oas-space-1));
}
`

/** 发送状态词表（IM 惯例五态） */
const STATUS_ORDER: readonly MessageRowStatus[] = ['sending', 'sent', 'delivered', 'read', 'error']

const STATUS_ICONS: Record<MessageRowStatus, string> = {
  // 发送中：双弧旋转
  sending:
    '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none" class="spin"><path d="M8 1.5 A6.5 6.5 0 1 0 14.5 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  // 已发送：单勾
  sent: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none"><path d="M3 8.5 L6.5 12 L13 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  // 已送达：双勾
  delivered:
    '<svg viewBox="0 0 16 16" width="13" height="12" aria-hidden="true" fill="none"><path d="M1.5 8.5 L4.5 11.5 L10.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 8.5 L9.5 11.5 L15 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  // 已读：双勾（颜色由 :host([status="read"]) 提升 primary）
  read: '<svg viewBox="0 0 16 16" width="13" height="12" aria-hidden="true" fill="none"><path d="M1.5 8.5 L4.5 11.5 L10.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 8.5 L9.5 11.5 L15 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  // 发送失败：圆叉
  error:
    '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.4"/><path d="M5.8 5.8 L10.2 10.2 M10.2 5.8 L5.8 10.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
}

/**
 * oas-message-row —— 会话消息行（组合行 = 头像 + 头/脚 + 气泡内容 + 发送态）。
 *
 * 行布局所有者：负责 avatar 槽、方向、header/footer 排布；可见表面由
 * `oas-bubble`（默认插槽内）提供。
 *
 * 属性：
 * - `align`：`start`（默认，对方）| `end`（我方）——逻辑属性，RTL 自动镜像
 * - `status`：`sending` | `sent` | `delivered` | `read` | `error`——发送态便利属性
 *   （渲染可见小字 + 装饰图标；非法值/缺省不渲染状态区）
 * - `grouped`：布尔在场——与上一条同发送者的连续消息（收行间距）
 *
 * 插槽：`avatar`、`header`（发送者名/时间）、默认（放 `oas-bubble`）、`footer`（操作/附加元数据）
 *
 * 事件：无（消息操作由 footer slot 内组件派发，宿主接管）
 *
 * 部件：`row` / `avatar` / `main` / `header` / `content` / `footer` / `status`
 */
export class OASMessageRow extends OASElement {
  static override get observedAttributes(): string[] {
    return ['align', 'status', 'grouped']
  }

  /** 命名插槽 → 包裹容器 part 名（默认插槽内容区单列） */
  private readonly slotParts: Record<string, string> = {
    avatar: 'avatar',
    header: 'header',
    footer: 'footer',
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="row" part="row">
        <div class="avatar" part="avatar" hidden><slot name="avatar"></slot></div>
        <div class="main" part="main">
          <div class="header" part="header" hidden><slot name="header"></slot></div>
          <div class="content" part="content"><slot></slot></div>
          <div class="footer" part="footer" hidden><slot name="footer"></slot></div>
          <div class="status" part="status" hidden></div>
        </div>
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

  /** 真水合：校验 SSR 快照结构（row 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="row"]')) return false
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
    // 命名插槽空自动收起
    for (const [slotName, part] of Object.entries(this.slotParts)) {
      const wrap = this.shadow.querySelector<HTMLElement>(`[part="${part}"]`)
      const slot = this.shadow.querySelector<HTMLSlotElement>(`slot[name="${slotName}"]`)
      if (wrap) wrap.hidden = !this.slotHasContent(slot)
    }
    // 发送状态：词表外不渲染；可见小字 + aria-hidden 图标（语义不靠颜色）
    const statusWrap = this.shadow.querySelector<HTMLElement>('[part="status"]')
    if (!statusWrap) return
    const status = this.getAttr('status') as MessageRowStatus
    if (STATUS_ORDER.includes(status)) {
      statusWrap.hidden = false
      statusWrap.innerHTML = `${STATUS_ICONS[status]}<span>${this.t(`messageRow.status.${status}`)}</span>`
    } else {
      statusWrap.hidden = true
      statusWrap.innerHTML = ''
    }
  }

  private handleSlotChange = (): void => {
    this.update()
  }
}
