import { OASElement } from '@oas-ui/core'

/** 气泡语义变体（default=中性浅底；ghost 无底无框且放开宽度上限） */
export type BubbleVariant = 'default' | 'secondary' | 'muted' | 'outline' | 'ghost' | 'destructive'

/** 反应条纵向位置：气泡下方（默认）/ 上方 */
export type BubbleReactionsSide = 'top' | 'bottom'
/** 反应条横向对齐；缺省跟随气泡 align（start/end） */
export type BubbleReactionsAlign = 'start' | 'end'

/**
 * 单条表情回应（`reactions` 属性的 JSON 数组元素）。
 * - `emoji`：表情字形（必填；缺失/空串的条目被忽略）
 * - `count`：计数（可选，缺省不显示计数）
 * - `active`：是否已由当前用户选中（可选，缺省 false）
 * - `label`：无障碍可读名称（可选；缺省用 emoji 本身，计数会追加在其后）
 */
export interface BubbleReaction {
  emoji: string
  count?: number
  active?: boolean
  label?: string
}

const STYLE = `
:host {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none !important;
}
/* 气泡表面：圆角/上限走变量开口，宿主可整链换肤 */
.bubble {
  display: inline-block;
  max-width: var(--oas-bubble-max-width, 80%);
  box-sizing: border-box;
  padding: var(--oas-space-2_5) var(--oas-space-3);
  border-radius: var(--oas-bubble-radius, var(--oas-radius-lg));
  border: 1px solid transparent;
  line-height: 1.6;
  word-break: break-word;
  background: var(--oas-color-bg-hover);
}
/* ghost 无底无框：放开宽度上限（长回答不被 80% 卡住） */
:host([variant="ghost"]) .bubble {
  max-width: none;
}
/* 方向：逻辑布局（inline-start 对齐随 RTL 自动镜像），不写物理边距 */
.bubble {
  margin-inline-start: 0;
}
:host([align="end"]) .bubble {
  margin-inline-start: auto;
  margin-inline-end: 0;
}
:host([align="end"]) {
  text-align: end;
}
/* 变体：全部语义 token，dark 自动适配（secondary/destructive 用 theme-aware 浅调混色） */
:host([variant="default"]) .bubble {
  background: var(--oas-color-bg-hover);
}
:host([variant="secondary"]) .bubble {
  background: color-mix(in srgb, var(--oas-color-primary) 10%, var(--oas-color-bg));
}
:host([variant="muted"]) .bubble {
  background: transparent;
  color: var(--oas-color-text-secondary);
}
:host([variant="outline"]) .bubble {
  background: var(--oas-color-bg);
  border-color: var(--oas-color-border-strong);
}
:host([variant="ghost"]) .bubble {
  background: transparent;
  padding-inline: 0;
  border: none;
}
:host([variant="destructive"]) .bubble {
  background: color-mix(in srgb, var(--oas-color-danger) 10%, var(--oas-color-bg));
  color: color-mix(in srgb, var(--oas-color-danger) 75%, var(--oas-color-text-primary));
}
/* loading：内容与打字点互斥显隐 */
.content {
  display: block;
}
.content[hidden] {
  display: none;
}
.typing {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1_5);
  min-height: 1em;
}
.typing[hidden] {
  display: none;
}
.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--oas-color-text-secondary);
  animation: bubble-typing 1.2s var(--oas-ease-in-out) infinite;
}
.typing span:nth-child(2) {
  animation-delay: 0.15s;
}
.typing span:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes bubble-typing {
  0%,
  60%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-2px);
  }
}
/* reduced-motion：停动画（全局有停过渡规则，动画单独再保一次） */
@media (prefers-reduced-motion: reduce) {
  .typing span {
    animation: none;
  }
}
/* 反应条：气泡之外的独立一行（side=top 用 order 提到气泡上方） */
.reactions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-1);
  max-width: 100%;
  margin-block-start: var(--oas-space-1);
  align-self: flex-start;
  order: 1;
}
.reactions[hidden] {
  display: none;
}
:host([reactions-side="top"]) .reactions {
  order: -1;
  margin-block-start: 0;
  margin-block-end: var(--oas-space-1);
}
/* 横向对齐：缺省跟随气泡 align，reactions-align 显式覆盖 */
:host([align="end"]) .reactions {
  align-self: flex-end;
}
:host([reactions-align="start"]) .reactions {
  align-self: flex-start;
}
:host([reactions-align="end"]) .reactions {
  align-self: flex-end;
}
/* 单条反应：真按钮（键盘可达 + 焦点环），选中态不只靠颜色（aria-pressed 语义 + 描边加粗） */
.reaction {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: 2px var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-secondary);
  font: inherit;
  font-size: var(--oas-font-size-xs);
  line-height: 1.6;
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out), color var(--oas-transition-fast) var(--oas-ease-out), border-color var(--oas-transition-fast) var(--oas-ease-out);
}
.reaction:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.reaction:focus-visible {
  outline: var(--oas-focus-ring);
  outline-offset: 1px;
}
.reaction[aria-pressed="true"] {
  border-color: color-mix(in srgb, var(--oas-color-primary) 45%, transparent);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, var(--oas-color-bg));
  color: var(--oas-color-primary-text);
}
.reaction .count {
  font-variant-numeric: tabular-nums;
}
`

/**
 * oas-bubble —— 会话消息气泡表面（纯外观容器）。
 *
 * 只负责气泡本身：边框/圆角/背景/最大宽度 + 内容；头像、名字、时间、操作
 * 不属气泡（归 oas-message-row 组合行）。
 *
 * 属性：
 * - `align`：`start`（默认）| `end`——我方/对方左右分侧（逻辑属性，RTL 自动镜像）
 * - `variant`：`default`（默认）| `secondary` | `muted` | `outline` | `ghost` | `destructive`
 * - `loading`：布尔在场——内容替换为三点打字指示（AI「正在输入」场景），宿主反射 aria-busy
 * - `reactions`：表情回应条 JSON 数组（每项 `{ emoji, count?, active?, label? }`；
 *   空数组/非法 JSON 不渲染反应条）
 * - `reactions-side`：`bottom`（默认，气泡下方）| `top`（气泡上方）
 * - `reactions-align`：`start` | `end`——横向对齐覆盖；缺省跟随气泡 `align`
 *
 * 插槽：默认（气泡内容）
 *
 * 事件：`oas-reaction`（点击某条反应，detail `{ emoji, count, active, index }`；反应数据仍由宿主拥有）
 *
 * 部件：`bubble` / `content` / `typing` / `reactions` / `reaction`
 */
export class OASBubble extends OASElement {
  static override get observedAttributes(): string[] {
    return ['loading', 'reactions', 'reactions-side', 'reactions-align']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="bubble" part="bubble">
        <div class="content" part="content" hidden><slot></slot></div>
        <div class="typing" part="typing" hidden role="status" aria-label="${this.t('bubble.loading')}"><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span></div>
      </div>
      <div class="reactions" part="reactions" role="group" hidden></div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    // 无交互事件；结构绑定留给 update()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（bubble 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="bubble"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const loading = this.hasAttr('loading')
    const content = this.shadow.querySelector<HTMLElement>('[part="content"]')
    const typing = this.shadow.querySelector<HTMLElement>('[part="typing"]')
    if (content) content.hidden = loading
    if (typing) {
      typing.hidden = !loading
      typing.setAttribute('aria-label', this.t('bubble.loading'))
    }
    // aria-busy 反射宿主：AT 在气泡外层即感知流式进行中
    if (loading) this.setAttribute('aria-busy', 'true')
    else this.removeAttribute('aria-busy')
    this.syncReactions()
  }

  /**
   * 解析 `reactions` 属性 JSON。非法 JSON / 非数组 / 缺 emoji 的条目一律忽略
   * （展示型容错：不抛错、不渲染坏数据）。
   */
  private parseReactions(): BubbleReaction[] {
    const raw = this.getAttribute('reactions')
    if (!raw) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter((r): r is BubbleReaction => {
        if (!r || typeof r !== 'object') return false
        const emoji = (r as { emoji?: unknown }).emoji
        return typeof emoji === 'string' && emoji.trim().length > 0
      })
    } catch {
      return []
    }
  }

  /** 重建反应条（真按钮：键盘可达 + 焦点环 + aria-pressed；内容走 textContent 无注入面） */
  private syncReactions(): void {
    const box = this.shadow.querySelector<HTMLElement>('[part="reactions"]')
    if (!box) return
    const list = this.parseReactions()
    box.hidden = list.length === 0
    box.textContent = ''
    if (list.length === 0) return
    box.setAttribute('aria-label', this.t('bubble.reactions'))
    list.forEach((reaction, index) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'reaction'
      button.setAttribute('part', 'reaction')
      button.setAttribute('aria-pressed', reaction.active ? 'true' : 'false')
      const count = typeof reaction.count === 'number' ? reaction.count : null
      const name = reaction.label ?? reaction.emoji
      button.setAttribute('aria-label', count === null ? name : `${name} ${count}`)
      const emoji = document.createElement('span')
      emoji.setAttribute('aria-hidden', 'true')
      emoji.textContent = reaction.emoji
      button.appendChild(emoji)
      if (count !== null) {
        const badge = document.createElement('span')
        badge.className = 'count'
        badge.textContent = String(count)
        button.appendChild(badge)
      }
      button.addEventListener('click', () => {
        this.emit('reaction', {
          emoji: reaction.emoji,
          count: count ?? 0,
          active: Boolean(reaction.active),
          index,
        })
      })
      box.appendChild(button)
    })
  }
}
