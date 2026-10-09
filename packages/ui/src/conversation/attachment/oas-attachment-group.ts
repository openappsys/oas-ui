import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none !important;
}
/* 横向滚动行：proximity 吸附 + 边缘渐隐；键盘可聚焦后方向键滚动 */
.group {
  display: flex;
  align-items: stretch;
  gap: var(--oas-attachment-group-gap, var(--oas-space-2_5));
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x proximity;
  overscroll-behavior-x: contain;
  padding-block: 2px;
  padding-inline-end: 2px;
  scrollbar-width: thin;
}
.group:focus-visible {
  outline: var(--oas-focus-ring);
  outline-offset: -2px;
}
.group ::slotted(*) {
  flex: 0 0 auto;
  scroll-snap-align: start;
}
/* 边缘渐隐：可向该侧滚动时以 mask 淡出（黑/透明是遮罩明暗语义，非主题色）。
 * 起始端与结束端各自一条；两端都可滚时叠加两条取交集。 */
:host([data-scrollable~="start"]) .group {
  -webkit-mask-image: linear-gradient(to right, transparent, black var(--oas-attachment-group-fade, 24px));
  mask-image: linear-gradient(to right, transparent, black var(--oas-attachment-group-fade, 24px));
}
:host([data-scrollable~="end"]) .group {
  -webkit-mask-image: linear-gradient(to left, transparent, black var(--oas-attachment-group-fade, 24px));
  mask-image: linear-gradient(to left, transparent, black var(--oas-attachment-group-fade, 24px));
}
:host([data-scrollable~="start"][data-scrollable~="end"]) .group {
  -webkit-mask-image: linear-gradient(to right, transparent, black var(--oas-attachment-group-fade, 24px)), linear-gradient(to left, transparent, black var(--oas-attachment-group-fade, 24px));
  mask-image: linear-gradient(to right, transparent, black var(--oas-attachment-group-fade, 24px)), linear-gradient(to left, transparent, black var(--oas-attachment-group-fade, 24px));
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
}
/* RTL：逻辑 start/end 与物理左/右反向，渐隐方向随之翻转（data-rtl 由 isRtl 反射） */
:host([data-rtl][data-scrollable~="start"]) .group {
  -webkit-mask-image: linear-gradient(to left, transparent, black var(--oas-attachment-group-fade, 24px));
  mask-image: linear-gradient(to left, transparent, black var(--oas-attachment-group-fade, 24px));
}
:host([data-rtl][data-scrollable~="end"]) .group {
  -webkit-mask-image: linear-gradient(to right, transparent, black var(--oas-attachment-group-fade, 24px));
  mask-image: linear-gradient(to right, transparent, black var(--oas-attachment-group-fade, 24px));
}
:host([data-rtl][data-scrollable~="start"][data-scrollable~="end"]) .group {
  -webkit-mask-image: linear-gradient(to right, transparent, black var(--oas-attachment-group-fade, 24px)), linear-gradient(to left, transparent, black var(--oas-attachment-group-fade, 24px));
  mask-image: linear-gradient(to right, transparent, black var(--oas-attachment-group-fade, 24px)), linear-gradient(to left, transparent, black var(--oas-attachment-group-fade, 24px));
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
}
`

/**
 * oas-attachment-group —— 附件组横向滚动行（吸附 + 边缘渐隐）。
 *
 * 无数据属性（纯容器）：默认插槽放若干 `oas-attachment` 或任意卡片；横向溢出时可滚，
 * 子项 `scroll-snap-align: start` 逐项吸附。两侧可滚性由 `data-scrollable`
 * （`"start"` / `"end"` / `"start end"`，无可滚为空）反射，供边缘渐隐/宿主 CSS 判定。
 *
 * 属性：无（容器语义；间距/渐隐宽度走 CSS 变量开口）
 *
 * 插槽：默认（附件卡片序列）
 *
 * 部件：`group`
 *
 * ARIA：滚动行 `role="group"` + 可读名称（locale「附件组」）+ `tabindex="0"`（键盘可滚）。
 */
export class OASAttachmentGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['dir']
  }

  /** 内容尺寸观察（子项增删/图片撑宽后刷新边缘可滚态；视口 resize 同样经此） */
  private ro: ResizeObserver | null = null
  /** 默认 slot（slotchange 通道：新增子项后刷新边缘态） */
  private slotNode: HTMLSlotElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="group" part="group" role="group" tabindex="0" aria-label="${this.t('attachment.group')}"><slot></slot></div>
    `
  }

  private get group(): HTMLElement | null {
    return this.shadow.querySelector<HTMLElement>('.group')
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用；幂等可重入） */
  private bind(): void {
    this.group?.addEventListener('scroll', this.handleScroll, { passive: true })
    this.slotNode = this.shadow.querySelector('slot')
    this.slotNode?.addEventListener('slotchange', this.handleSlotChange)
    this.observeResize()
  }

  /** 尺寸观察：组盒 resize（容器变宽/变窄改变可滚态）；observe 幂等 */
  private observeResize(): void {
    const g = this.group
    if (!g || typeof ResizeObserver === 'undefined') return
    if (!this.ro) {
      this.ro = new ResizeObserver(() => this.syncScrollable())
      this.onCleanup(() => {
        this.ro?.disconnect()
        this.ro = null
      })
    }
    this.ro.observe(g)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（group 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.group) return false
    this.bind()
    return true
  }

  protected override onReconnect(): void {
    // 断开重连：ResizeObserver 已被 cleanup 断开，重挂（幂等）；slotchange/scroll 监听在 shadow 内保留
    this.observeResize()
    this.syncScrollable()
  }

  protected override update(): void {
    const g = this.group
    if (!g) return
    this.toggleAttribute('data-rtl', isRtl(this))
    g.setAttribute('aria-label', this.t('attachment.group'))
    this.syncScrollable()
  }

  /** 反射两侧可滚性：data-scrollable="start end"（无可滚为空串，CSS 不命中渐隐）。
   * RTL 下 scrollLeft 为负（Chrome/Firefox 规范：[-max, 0]），归一到「0 = inline-start」口径。 */
  private syncScrollable(): void {
    const g = this.group
    if (!g) return
    const epsilon = 1
    const max = g.scrollWidth - g.clientWidth
    const norm = isRtl(this) ? -g.scrollLeft : g.scrollLeft
    const dirs: string[] = []
    if (max > epsilon && norm > epsilon) dirs.push('start')
    if (max > epsilon && norm < max - epsilon) dirs.push('end')
    this.setAttribute('data-scrollable', dirs.join(' '))
  }

  private handleScroll = (): void => {
    this.syncScrollable()
  }

  private handleSlotChange = (): void => {
    this.syncScrollable()
  }
}
