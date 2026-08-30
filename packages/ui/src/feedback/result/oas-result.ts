import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  text-align: center;
  padding: var(--oas-space-6);
  color: var(--oas-color-text-primary);
}
.icon {
  width: 72px;
  height: 72px;
  margin: 0 auto var(--oas-space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  line-height: 1;
}
.icon[data-status='success'] { color: var(--oas-color-success); }
.icon[data-status='error'] { color: var(--oas-color-danger); }
.icon[data-status='warning'] { color: var(--oas-color-warning); }
.icon[data-status='info'] { color: var(--oas-color-primary); }
.title {
  font-size: var(--oas-font-size-xl);
  font-weight: 600;
}
.description {
  margin-top: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
::slotted([slot='extra']) {
  margin-top: var(--oas-space-4);
  display: inline-block;
}
`

const ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
}

export class OASResult extends OASElement {
  static override get observedAttributes(): string[] {
    return ['status', 'title', 'description']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="icon" part="icon" role="status"></div>
      <div class="title" part="title"><slot name="title"><span class="title-text"></span></slot></div>
      <div class="description" part="description"></div>
      <slot name="extra"></slot>
    `
  }

  /** 无事件绑定（render 与水合路径共用，结构校验由 hydrate 完成） */
  private bind(): void {
    // title 插槽内容增减（slot 覆盖属性文案）时重刷双通道
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="title"]')
      ?.addEventListener('slotchange', () => this.update())
  }

  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null

  /** 标题插槽是否有真实内容（元素节点或非空白文本）——slot 覆盖属性文案的判空依据 */
  private hasTitleSlotContent(slot: HTMLSlotElement): boolean {
    return slot
      .assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（title 与 description 部件存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="title"]')) return false
    if (!this.shadow.querySelector('[part="description"]')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  protected override update(): void {
    // status 增量同步：图标字形 + data-status + aria-label（SSR 快照与运行时变更共用同一通道）
    const status = this.getAttr('status', 'success')
    const icon = this.shadow.querySelector('[part="icon"]')
    icon?.setAttribute('data-status', status)
    icon?.setAttribute('aria-label', status)
    if (icon) icon.textContent = ICONS[status] ?? '✓'
    // title 吸收：title 渲染进可见标题区后即从宿主移除——title 是原生全局属性，
    // 残留在宿主上会让整组件悬停弹出浏览器原生提示（与可见标题重复的视觉干扰）。
    // 状态机：属性在场（含空串）= 宿主意图（写入新值/空串清空）→ 更新缓存并移除；
    // 属性缺席 = 内部吸收后的常态（或宿主 removeAttribute，此时保持已渲染标题，
    // 清空请用 title=""）。缓存驱动渲染，吸收触发的二次 update 幂等。
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    // title 双通道：slot 有真实内容时隐藏兜底 span（富内容优先），无则渲染 titleCache 文本
    const titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    const titleFallback = this.shadow.querySelector<HTMLElement>('.title-text')
    if (titleSlot && titleFallback) {
      titleFallback.textContent = this.titleCache ?? ''
      titleFallback.hidden = this.hasTitleSlotContent(titleSlot)
    }
    this.shadow.querySelector<HTMLElement>('[part="description"]')!.textContent = this.getAttr(
      'description',
      '',
    )
  }
}
