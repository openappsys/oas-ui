import { OASElement } from '@oas-ui/core/oas-element'

/** `oas-submit` 事件 detail：提交文本（trim 后）。数据仍由宿主持有，组件不内部追加列表 */
export interface CommentSubmitDetail {
  text: string
}

/** `oas-resolve` 事件 detail：条目 id（`comment-id` 属性）与目标解决态，宿主写回数据 */
export interface CommentResolveDetail {
  id: string
  resolved: boolean
}

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
/* align=right：时间右挤、操作区右对齐（逻辑属性，RTL 下自动翻转） */
:host([align="right"]) .time {
  margin-inline-start: auto;
}
:host([align="right"]) .actions {
  justify-content: flex-end;
}
/* 回复目标 / 引用区：次级文本 + 左侧 2px token 色边（逻辑属性，RTL 安全） */
.reply,
.quote {
  margin-block-start: var(--oas-space-1);
  padding-inline-start: var(--oas-space-2);
  border-inline-start: 2px solid var(--oas-color-border-strong);
  color: var(--oas-color-text-secondary);
  font-size: 0.857em;
  line-height: 1.6;
  word-break: break-word;
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
/* 已解决条目（resolved 在场）：弱色 + 正文划线，全部 token 化（暗色跟随 token 变体） */
:host([resolved]) .author,
:host([resolved]) .time,
:host([resolved]) .reply,
:host([resolved]) .quote {
  color: var(--oas-color-text-disabled);
}
:host([resolved]) .content {
  color: var(--oas-color-text-secondary);
  text-decoration: line-through;
  text-decoration-color: var(--oas-color-text-disabled);
}
/* 内置 resolve/unresolve 触发钮：与宿主 actions 插槽同行的文本钮（resolvable 在场才可见） */
.resolve-btn {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font: inherit;
  font-size: 0.857em;
  font-weight: 600;
  color: var(--oas-color-primary);
}
.resolve-btn:hover {
  color: var(--oas-color-primary-hover);
}
.resolve-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
  border-radius: var(--oas-radius-sm);
}
/* 已解决标记：head 行内的弱色描边徽标 */
.resolved-flag {
  flex-shrink: 0;
  font-size: 0.857em;
  line-height: 1.6;
  padding: 0 var(--oas-space-2);
  border: 1px solid var(--oas-color-border-strong);
  border-radius: var(--oas-radius-full, 999px);
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
}
/* 内置输入行：textarea + 提交按钮（评论区底部；children 之后） */
.composer {
  display: flex;
  align-items: flex-end;
  gap: var(--oas-space-2);
  margin-block-start: var(--oas-space-3);
  padding: var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated, var(--oas-color-bg));
}
.composer:focus-within {
  border-color: var(--oas-color-primary);
}
.composer-input {
  flex: 1;
  min-width: 0;
  resize: none;
  border: 0;
  outline: 0;
  padding: 0;
  min-height: 36px;
  max-height: 160px;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: 1.5;
}
.composer-input::placeholder {
  color: var(--oas-color-text-secondary);
}
.composer-send {
  appearance: none;
  border: 0;
  border-radius: var(--oas-radius-full, 999px);
  padding: 0 var(--oas-space-3);
  min-height: 32px;
  cursor: pointer;
  font: inherit;
  font-size: var(--oas-font-size-sm);
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.composer-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.composer-send:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 2px;
}
`

/**
 * oas-comment —— 评论块（插槽组装展示 + 内置输入行 + resolve 态）。
 *
 * 插槽组装：
 * - `avatar`：作者头像
 * - `author`：作者名
 * - `time`：时间
 * - `content`：评论内容
 * - `actions`：操作区（回复/点赞等，由宿主提供）
 * - `quote`：引用区（被引用的原文，视觉为次级文本 + 左侧色边）
 * - `reply`：回复目标区（如「回复 @某人」，显示在作者行下方）
 * - 默认插槽：嵌套的 `<oas-comment>` 子评论（自动缩进 + 引导线）
 *
 * 属性：
 * - `align`：`'left' | 'right'`，时间与操作区的对齐（默认 left，CSS 级，RTL 安全）
 * - `inputtable="false"`：隐藏内置输入行（缺省 = 显示；与 prompt-input 的 `submit-on-enter`
 *   同款「显式 false 关闭」惯例）
 * - `resolvable`：布尔在场属性，显示 resolve/unresolve 触发钮（默认关，视觉零变化）
 * - `resolved`：布尔在场属性，已解决态（正文划线 + 条目弱色）；数据驱动——宿主写回数据后
 *   同步该属性，组件不内部翻转
 * - `comment-id`：条目 id，随 `oas-resolve` detail 回传（`message-id` 同款家族命名，与 DOM id 解耦）
 *
 * 事件：
 * - `oas-submit` detail `{ text }`：输入行提交（Enter / 提交按钮；空文本静默不派发）。
 *   数据驱动写回范式：组件不内部追加列表，宿主监听后追加数据并渲染新条目
 * - `oas-resolve` detail `{ id, resolved }`：点击 resolve/unresolve 触发钮，宿主写回数据
 *
 * 键盘：输入行内 Enter 提交、Shift+Enter 原生换行；输入法组合中 Enter 不提交。
 *
 * 空插槽自动隐藏对应区块；无内容渲染不报错。
 */
export class OASComment extends OASElement {
  static override get observedAttributes(): string[] {
    return ['align', 'inputtable', 'resolvable', 'resolved', 'comment-id']
  }

  /** 命名插槽 → 包裹容器 part 名（actions 有内置钮参与显隐，单独走 syncActions） */
  private readonly slotParts: Record<string, string> = {
    avatar: 'avatar',
    author: 'author',
    time: 'time',
    reply: 'reply',
    quote: 'quote',
    content: 'content',
  }

  private composerEl: HTMLElement | null = null
  private inputEl: HTMLTextAreaElement | null = null
  private sendEl: HTMLButtonElement | null = null
  private resolveEl: HTMLButtonElement | null = null
  private flagEl: HTMLElement | null = null
  /** 输入法组合标记（compositionstart/end 之间 Enter 不提交） */
  private composing = false

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
              <span class="resolved-flag" part="resolved-flag" hidden></span>
            </div>
            <div class="reply" part="reply" hidden><slot name="reply"></slot></div>
            <div class="quote" part="quote" hidden><slot name="quote"></slot></div>
            <div class="content" part="content" hidden><slot name="content"></slot></div>
            <div class="actions" part="actions" hidden>
              <slot name="actions"></slot>
              <button class="resolve-btn" part="resolve" type="button" hidden></button>
            </div>
          </div>
        </div>
        <div class="children" part="children" hidden><slot></slot></div>
        <div class="composer" part="composer">
          <textarea class="composer-input" part="composer-input" rows="2"></textarea>
          <button class="composer-send" part="composer-send" type="button"></button>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用；handler 为类字段，同引用重入规范去重） */
  private bind(): void {
    // slotchange 监听挂在 Shadow DOM 内部节点上，随元素整体回收，无全局泄漏；
    // 断开/重连后元素与监听一起保留，重连后仍能同步插槽内容。
    for (const slot of this.shadow.querySelectorAll('slot')) {
      slot.addEventListener('slotchange', this.handleSlotChange)
    }
    this.composerEl = this.shadow.querySelector<HTMLElement>('[part="composer"]')
    this.inputEl = this.shadow.querySelector<HTMLTextAreaElement>('[part="composer-input"]')
    this.sendEl = this.shadow.querySelector<HTMLButtonElement>('[part="composer-send"]')
    this.resolveEl = this.shadow.querySelector<HTMLButtonElement>('[part="resolve"]')
    this.flagEl = this.shadow.querySelector<HTMLElement>('[part="resolved-flag"]')
    const input = this.inputEl
    if (input) {
      input.addEventListener('input', this.handleInput)
      input.addEventListener('compositionstart', this.handleCompositionStart)
      input.addEventListener('compositionend', this.handleCompositionEnd)
      input.addEventListener('keydown', this.handleKeyDown)
    }
    this.sendEl?.addEventListener('click', this.handleSendClick)
    this.resolveEl?.addEventListener('click', this.handleResolveClick)
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
    this.syncActions()
    this.syncChildren()
    this.syncResolve()
    this.syncComposer()
  }

  /** 命名插槽有内容才显示对应区块，空插槽自动收起 */
  private syncSlot(slotName: string, part: string): void {
    const wrap = this.shadow.querySelector<HTMLElement>(`[part="${part}"]`)
    if (!wrap) return
    const slot = this.shadow.querySelector<HTMLSlotElement>(`slot[name="${slotName}"]`)
    wrap.hidden = !this.slotHasContent(slot)
  }

  /**
   * actions 区显隐：宿主插槽有内容，或 `resolvable` 在场（内置触发钮可见）。
   * 与其他区块不同——actions 是「插槽 + 内置钮」混合区，不能只看插槽内容。
   */
  private syncActions(): void {
    const wrap = this.shadow.querySelector<HTMLElement>('[part="actions"]')
    if (!wrap) return
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot[name="actions"]')
    wrap.hidden = !(this.slotHasContent(slot) || this.hasAttr('resolvable'))
  }

  /** 默认插槽（嵌套子评论）有内容才显示缩进容器 */
  private syncChildren(): void {
    const wrap = this.shadow.querySelector<HTMLElement>('[part="children"]')
    if (!wrap) return
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot:not([name])')
    wrap.hidden = !this.slotHasContent(slot)
  }

  /** resolve 触发钮与已解决标记：文案/aria 随 resolved 态切换 */
  private syncResolve(): void {
    const btn = this.resolveEl
    if (btn) {
      const resolved = this.hasAttr('resolved')
      btn.hidden = !this.hasAttr('resolvable')
      btn.textContent = this.t(resolved ? 'comment.unresolve' : 'comment.resolve')
      btn.setAttribute('aria-pressed', resolved ? 'true' : 'false')
    }
    const flag = this.flagEl
    if (flag) {
      const resolved = this.hasAttr('resolved')
      flag.hidden = !resolved
      flag.textContent = this.t('comment.resolved')
    }
  }

  /** 输入行显隐与 i18n 文案（placeholder 走 property 赋值，不进模板字符串） */
  private syncComposer(): void {
    const composer = this.composerEl
    const input = this.inputEl
    const send = this.sendEl
    if (!composer || !input || !send) return
    composer.hidden = this.getAttr('inputtable', 'true') === 'false'
    const placeholder = this.t('comment.placeholder')
    input.placeholder = placeholder
    input.setAttribute('aria-label', placeholder)
    send.textContent = this.t('comment.submit')
    send.disabled = input.value.trim() === ''
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

  private handleInput = (): void => {
    this.syncComposer()
  }

  private handleCompositionStart = (): void => {
    this.composing = true
  }

  private handleCompositionEnd = (): void => {
    this.composing = false
  }

  private handleKeyDown = (e: Event): void => {
    const ke = e as KeyboardEvent
    if (ke.key !== 'Enter' || ke.isComposing || this.composing) return
    if (ke.shiftKey) return // Shift+Enter：textarea 原生换行，不拦截
    // Enter 语义固定为提交：阻止默认换行；空文本静默不派发
    ke.preventDefault()
    this.submit()
  }

  private handleSendClick = (): void => {
    this.submit()
  }

  private handleResolveClick = (): void => {
    // 只派发，不内部翻转 resolved：数据由宿主持有，宿主写回后同步属性（受控语义）
    this.emit('resolve', {
      id: this.getAttr('comment-id', ''),
      resolved: !this.hasAttr('resolved'),
    } satisfies CommentResolveDetail)
  }

  /**
   * 提交输入行当前文本；空文本 / 输入行隐藏返回 false 且不派发。
   * 提交后清空输入并保持焦点（连续输入场景）。
   */
  submit(): boolean {
    const input = this.inputEl
    if (!input || this.getAttr('inputtable', 'true') === 'false') return false
    const text = input.value.trim()
    if (!text) return false
    this.emit('submit', { text } satisfies CommentSubmitDetail)
    input.value = ''
    this.syncComposer()
    input.focus()
    return true
  }
}
