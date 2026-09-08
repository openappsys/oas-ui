import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: flex;
  /* 布局方向：容器经 --oas-desc-layout-dir 下发（默认 row = horizontal，vertical 为 column） */
  flex-direction: var(--oas-desc-layout-dir, row);
  gap: var(--oas-desc-item-gap, var(--oas-space-2));
  font-family: inherit;
  /* 描述项是展示文本，跟随外层字号；定制开口：--oas-descriptions-item-font（优先）/ 容器 size 档位 */
  font-size: var(--oas-descriptions-item-font, var(--oas-desc-font-size, inherit));
  /* bordered 网格线：容器下发 --oas-desc-cell-border 线宽（默认 0px 无边框），item 补右/下边，
     顶/左由容器 .items 外框兜底（线宽 var 置 0 时不渲染，非边框模式间距归网格 gap） */
  border-inline-end: var(--oas-desc-cell-border, 0px) solid var(--oas-color-border);
  border-bottom: var(--oas-desc-cell-border, 0px) solid var(--oas-color-border);
}
:host([hidden]) {
  display: none;
}
.label {
  flex-shrink: 0;
  /* 行向（horizontal）stretch = 拉满单元格高度成 label 格；列向（vertical）stretch = 拉满内容宽成顶栏 */
  align-self: stretch;
  display: flex;
  align-items: center;
  /* 次级文本按比例跟随 host（原 sm/md ≈ 13/14） */
  font-size: 0.929em;
  color: var(--oas-desc-label-color, var(--oas-color-text-secondary));
  /* bordered 的 label 格淡底色（token 穿透，含 dark）；格内边距与 content 一致（容器按 size 档下发） */
  background: var(--oas-desc-label-bg, transparent);
  padding-block: var(--oas-desc-cell-py, 0);
  padding-inline: var(--oas-desc-cell-px, 0);
}
/* 冒号：容器 colon 时下发 --oas-desc-colon；label 为空（无属性无插槽）时不出冒号 */
.label::after {
  content: none;
}
:host([data-has-label]) .label::after {
  content: var(--oas-desc-colon, none);
}
.content {
  flex: 1;
  min-width: 0;
  color: var(--oas-color-text-primary);
  /* bordered 格内边距与 label 一致（容器按 size 档下发），保证标签与内容文字对齐 */
  padding-block: var(--oas-desc-cell-py, 0);
  padding-inline: var(--oas-desc-cell-px, 0);
}
`

export class OASDescriptionsItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['label', 'span']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="label" part="label"><slot name="label"><span class="label-text"></span></slot></div>
      <div class="content" part="content"><slot></slot></div>
    `
  }

  /** label 插槽是否有真实内容（元素节点或非空白文本）——slot 覆盖属性文案的判空依据 */
  private hasLabelSlotContent(slot: HTMLSlotElement): boolean {
    return slot
      .assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  /** 缓存节点引用（render 与水合路径共用；label 插槽内容增减时重刷双通道显隐） */
  private bind(): void {
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="label"]')
      ?.addEventListener('slotchange', () => this.update())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（label 区存在）后直接接管，跳过 shadow 重建。
   *  旧版快照 label 文本直写在 label 区（无 slot 结构）——接管后保留原文本，
   *  update 仅同步跨列与 data-* 钩子，不重建结构 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="label"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // span 跨列：正整数 N → grid-column: span N；缺省/0/非法值回到单格
    const rawSpan = Number.parseInt(this.getAttr('span', '1'), 10)
    const span = Number.isFinite(rawSpan) && rawSpan > 1 ? rawSpan : 1
    this.setAttribute('data-span', String(span))
    if (span > 1) this.style.setProperty('grid-column', `span ${span}`)
    else this.style.removeProperty('grid-column')
    // label 双通道：属性文本写入兜底 span；slot="label" 有真实内容时以插槽为准（兜底隐藏）
    const labelSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="label"]')
    const fallback = this.shadow.querySelector<HTMLElement>('.label-text')
    const label = this.getAttr('label', '')
    const hasSlot = labelSlot ? this.hasLabelSlotContent(labelSlot) : false
    if (fallback) {
      fallback.textContent = label
      fallback.hidden = hasSlot
    }
    // label 是否在场决定冒号显隐（::after 门控），也是宿主侧样式钩子
    this.toggleAttribute('data-has-label', label !== '' || hasSlot)
  }
}
