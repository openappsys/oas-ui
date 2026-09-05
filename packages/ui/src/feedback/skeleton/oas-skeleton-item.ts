import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
[part='indicator'] {
  display: block;
  width: 100%;
  height: var(--oas-control-height-sm);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-skeleton-color, var(--oas-color-bg-hover));
}
[part='indicator'][data-type='title'] {
  width: 50%;
  height: var(--oas-control-height-md);
}
[part='indicator'][data-type='avatar'] {
  width: var(--oas-control-height-lg);
  height: var(--oas-control-height-lg);
  border-radius: 50%;
}
[part='indicator'][data-type='button'] {
  width: 88px;
  height: var(--oas-control-height-md);
  border-radius: var(--oas-radius-md);
}
[part='indicator'][data-type='input'] {
  height: var(--oas-control-height-md);
}
[part='indicator'][data-type='image'] {
  height: 160px;
}
[part='indicator'][data-type='rect'] {
  height: var(--oas-control-height-lg);
}
[part='indicator'][data-effect='sheen'] {
  background: linear-gradient(90deg, var(--oas-skeleton-color, var(--oas-color-bg-hover)) 25%, var(--oas-skeleton-sheen, var(--oas-color-border)) 50%, var(--oas-skeleton-color, var(--oas-color-bg-hover)) 75%);
  background-size: 200% 100%;
  animation: oas-skeleton-item-shimmer var(--oas-skeleton-duration, 1.5s) infinite;
}
[part='indicator'][data-effect='pulse'] {
  animation: oas-skeleton-item-pulse var(--oas-skeleton-duration, 1.5s) ease-in-out infinite;
}
@keyframes oas-skeleton-item-shimmer {
  to { background-position: -200% 0; }
}
@keyframes oas-skeleton-item-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
`

const TYPES = ['text', 'title', 'avatar', 'button', 'input', 'image', 'rect'] as const

/**
 * oas-skeleton-item —— 单形状骨架占位块（oas-skeleton 的同目录子组件）。
 *
 * 与 oas-skeleton 的整组段落组合互补：item 表达单个形状占位（文本行/标题/头像/
 * 按钮/输入框/图片/矩形），多块组合出卡片、表格、表单等任意布局；
 * type 只收七档基础形，不膨胀为组件同形预设注册表。
 * width/height 为自由 CSS 值，内联覆盖各 type 的尺寸默认。
 */
export class OASSkeletonItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['type', 'width', 'height', 'effect']
  }

  private indicator: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <span part="indicator" aria-hidden="true"></span>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；无事件绑定） */
  private bind(): void {
    this.indicator = this.shadow.querySelector<HTMLElement>('[part="indicator"]')
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（indicator 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="indicator"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    if (!this.indicator) return
    // type 校验：七档之外回落 text（不告警，静默兜底）
    const rawType = this.getAttr('type', 'text')
    this.indicator.setAttribute(
      'data-type',
      (TYPES as readonly string[]).includes(rawType) ? rawType : 'text',
    )
    // 动效三档与 oas-skeleton 的 effect 语义一致（item 独立使用时自控，默认 none）
    const rawEff = this.getAttr('effect', '')
    this.indicator.setAttribute(
      'data-effect',
      rawEff === 'sheen' || rawEff === 'pulse' ? rawEff : 'none',
    )
    // width/height 为自由 CSS 值直接透传内联样式；缺省清空回落各 type 的样式默认
    this.indicator.style.width = this.getAttr('width', '')
    this.indicator.style.height = this.getAttr('height', '')
  }
}
