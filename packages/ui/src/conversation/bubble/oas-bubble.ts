import { OASElement } from '@oas-ui/core'

/** 气泡语义变体（default=中性浅底；ghost 无底无框且放开宽度上限） */
export type BubbleVariant = 'default' | 'secondary' | 'muted' | 'outline' | 'ghost' | 'destructive'

const STYLE = `
:host {
  display: block;
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
 *
 * 插槽：默认（气泡内容）
 *
 * 部件：`bubble` / `content` / `typing`
 */
export class OASBubble extends OASElement {
  static override get observedAttributes(): string[] {
    return ['loading']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="bubble" part="bubble">
        <div class="content" part="content" hidden><slot></slot></div>
        <div class="typing" part="typing" hidden role="status" aria-label="${this.t('bubble.loading')}"><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span></div>
      </div>
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
  }
}
