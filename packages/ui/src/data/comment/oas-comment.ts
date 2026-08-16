import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  /* 展示文本跟随外层字号；定制开口：--oas-comment-font（内部次级文本按 em 比例跟随） */
  font-size: var(--oas-comment-font, inherit);
}
:host([hidden]) {
  display: none;
}
[hidden] {
  display: none !important;
}
.main {
  display: flex;
  gap: var(--oas-space-2);
}
.avatar {
  flex-shrink: 0;
}
.body {
  flex: 1;
  min-width: 0;
}
.head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--oas-space-2);
}
.author {
  font-weight: 600;
}
.time {
  /* 次级文本按比例跟随 host（原 xs/md ≈ 12/14） */
  font-size: 0.857em;
  color: var(--oas-color-text-secondary);
}
.content {
  margin-block-start: var(--oas-space-1);
  line-height: 1.6;
  word-break: break-word;
}
.actions {
  display: flex;
  gap: var(--oas-space-3);
  margin-block-start: var(--oas-space-1);
}
/* 子评论：缩进 + 左侧引导线（逻辑属性，RTL 安全） */
.children {
  margin-block-start: var(--oas-space-3);
  margin-inline-start: var(--oas-space-6);
  padding-inline-start: var(--oas-space-4);
  border-inline-start: 1px solid var(--oas-color-border);
}
.children ::slotted(oas-comment) {
  display: block;
  margin-block-start: var(--oas-space-3);
}
.children ::slotted(oas-comment:first-child) {
  margin-block-start: 0;
}
`

/**
 * oas-comment —— 评论块（纯展示容器，非交互）。
 *
 * 插槽组装：
 * - `avatar`：作者头像
 * - `author`：作者名
 * - `time`：时间
 * - `content`：评论内容
 * - `actions`：操作区（回复/点赞等，由宿主提供）
 * - 默认插槽：嵌套的 `<oas-comment>` 子评论（自动缩进 + 引导线）
 *
 * 空插槽自动隐藏对应区块；无内容渲染不报错。
 */
export class OASComment extends OASElement {
  static override get observedAttributes(): string[] {
    return []
  }

  /** 命名插槽 → 包裹容器 part 名 */
  private readonly slotParts: Record<string, string> = {
    avatar: 'avatar',
    author: 'author',
    time: 'time',
    content: 'content',
    actions: 'actions',
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="comment" part="comment">
        <div class="main" part="main">
          <div class="avatar" part="avatar" hidden><slot name="avatar"></slot></div>
          <div class="body" part="body">
            <div class="head" part="head">
              <span class="author" part="author" hidden><slot name="author"></slot></span>
              <span class="time" part="time" hidden><slot name="time"></slot></span>
            </div>
            <div class="content" part="content" hidden><slot name="content"></slot></div>
            <div class="actions" part="actions" hidden><slot name="actions"></slot></div>
          </div>
        </div>
        <div class="children" part="children" hidden><slot></slot></div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    // slotchange 监听挂在 Shadow DOM 内部节点上，随元素整体回收，无全局泄漏；
    // 断开/重连后元素与监听一起保留，重连后仍能同步插槽内容。
    for (const slot of this.shadow.querySelectorAll('slot')) {
      slot.addEventListener('slotchange', this.handleSlotChange)
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（comment 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="comment"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    for (const [slotName, part] of Object.entries(this.slotParts)) {
      this.syncSlot(slotName, part)
    }
    this.syncChildren()
  }

  /** 命名插槽有内容才显示对应区块，空插槽自动收起 */
  private syncSlot(slotName: string, part: string): void {
    const wrap = this.shadow.querySelector<HTMLElement>(`[part="${part}"]`)
    if (!wrap) return
    const slot = this.shadow.querySelector<HTMLSlotElement>(`slot[name="${slotName}"]`)
    wrap.hidden = !this.slotHasContent(slot)
  }

  /** 默认插槽（嵌套子评论）有内容才显示缩进容器 */
  private syncChildren(): void {
    const wrap = this.shadow.querySelector<HTMLElement>('[part="children"]')
    if (!wrap) return
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot:not([name])')
    wrap.hidden = !this.slotHasContent(slot)
  }

  /** 插槽是否有实质内容：元素节点，或非纯空白文本（忽略源码缩进产生的空白文本节点） */
  private slotHasContent(slot: HTMLSlotElement | null): boolean {
    if (!slot) return false
    return slot.assignedNodes().some((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) return true
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0
      return false
    })
  }

  private handleSlotChange = (): void => {
    this.update()
  }
}
