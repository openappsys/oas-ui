import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-3);
  margin-bottom: var(--oas-space-4);
}
.title {
  font-weight: 600;
}
.items {
  display: grid;
  grid-template-columns: repeat(var(--oas-desc-columns, 3), 1fr);
  row-gap: var(--oas-space-4);
  column-gap: var(--oas-space-4);
}
/* bordered：网格线成表——items 外框补顶/左，单元格右/下描边由 item 经
   --oas-desc-cell-border 线宽变量补齐（默认 0px 无边框） */
:host([bordered]) .items {
  gap: 0;
  border-top: 1px solid var(--oas-color-border);
  border-inline-start: 1px solid var(--oas-color-border);
}
`

/** size 三档映射：字号开口（medium 缺省跟随外层字号）+ bordered 单元格内边距（token） */
const SIZE_MAP: Record<string, { font: string; py: string; px: string }> = {
  small: { font: 'var(--oas-font-size-sm)', py: 'var(--oas-space-1_5)', px: 'var(--oas-space-2)' },
  medium: { font: '', py: 'var(--oas-space-2)', px: 'var(--oas-space-3)' },
  large: { font: 'var(--oas-font-size-lg)', py: 'var(--oas-space-3)', px: 'var(--oas-space-4)' },
}

export class OASDescriptions extends OASElement {
  static override get observedAttributes(): string[] {
    return ['column', 'title', 'layout', 'bordered', 'colon', 'size']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="head" part="head">
        <div class="title" part="title"><slot name="title"><span class="title-text"></span></slot></div>
        <span class="extra" part="extra"><slot name="extra"></slot></span>
      </div>
      <div class="items" part="items"><slot></slot></div>
    `
  }

  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null

  /** 标题插槽是否有真实内容（元素节点或非空白文本）——slot 覆盖属性文案的判空依据 */
  private hasTitleSlotContent(slot: HTMLSlotElement): boolean {
    return slot
      .assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  /** 缓存节点引用（render 与水合路径共用；title 插槽内容增减时重刷标题区显隐） */
  private bind(): void {
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="title"]')
      ?.addEventListener('slotchange', () => this.update())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（items 网格存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="items"]')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  protected override update(): void {
    // title 吸收：title 渲染进可见标题区后即从宿主移除——title 是原生全局属性，
    // 残留在宿主上会让组件悬停弹出浏览器原生提示（与可见标题重复的视觉干扰）。
    // 状态机：属性在场（含空串）= 宿主意图（写入新值/空串清空）→ 更新缓存并移除；
    // 属性缺席 = 内部吸收后的常态（或宿主 removeAttribute，此时保持已渲染标题，
    // 清空请用 title=""）。缓存驱动渲染，吸收触发的二次 update 幂等。
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    // title 双通道：属性文本写入兜底 span；slot="title" 有真实内容时以插槽为准（兜底隐藏）
    const titleEl = this.shadow.querySelector<HTMLElement>('[part="title"]')
    const titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    const titleFallback = this.shadow.querySelector<HTMLElement>('.title-text')
    const title = this.titleCache ?? ''
    if (titleEl && titleSlot && titleFallback) {
      titleFallback.textContent = title
      titleFallback.hidden = this.hasTitleSlotContent(titleSlot)
    } else if (titleEl) {
      // 降级：无 slot 结构（旧版 SSR 快照）直接写标题区文本
      titleEl.textContent = title
    }
    const itemsEl = this.shadow.querySelector<HTMLElement>('[part="items"]')
    if (!itemsEl) return

    // column：未设置属性时不写内联变量——grid 回退默认 3 列且宿主可经
    // CSS 变量（含媒体查询）覆写；设置属性（含空串视为 3）则固定列数
    const column = this.getAttr('column', '3')
    itemsEl.setAttribute('data-column', column)
    if (this.hasAttribute('column')) itemsEl.style.setProperty('--oas-desc-columns', column)
    else itemsEl.style.removeProperty('--oas-desc-columns')

    // layout（默认 horizontal，破坏性变更）：item 内部按继承变量切换横/纵排布
    const layout = this.getAttr('layout', 'horizontal') === 'vertical' ? 'vertical' : 'horizontal'
    this.style.setProperty('--oas-desc-layout-dir', layout === 'vertical' ? 'column' : 'row')
    this.style.setProperty(
      '--oas-desc-item-gap',
      layout === 'vertical' ? 'var(--oas-space-1)' : 'var(--oas-space-2)',
    )
    this.setAttribute('data-layout', layout)

    // bordered：网格线成表。线宽/label 底色/单元格内边距经继承变量下发给 item
    // （跨 shadow 唯一通道）；label 底色走 bg-elevated token，dark 自动适配
    const bordered = this.hasAttr('bordered')
    this.style.setProperty('--oas-desc-cell-border', bordered ? '1px' : '0px')
    if (bordered) this.style.setProperty('--oas-desc-label-bg', 'var(--oas-color-bg-elevated)')
    else this.style.removeProperty('--oas-desc-label-bg')

    // colon：label 后冒号（item 侧 ::after 消费，默认无）
    if (this.hasAttr('colon')) this.style.setProperty('--oas-desc-colon', `':'`)
    else this.style.removeProperty('--oas-desc-colon')

    // size 三档：small/large 下发字号变量，medium（缺省）不限制字号跟随外层；
    // bordered 时同步下发单元格内边距，非边框模式移除（保持零内边距，间距归网格 gap）
    const size = SIZE_MAP[this.getAttr('size', 'medium')] ?? SIZE_MAP.medium!
    if (size.font !== '') this.style.setProperty('--oas-desc-font-size', size.font)
    else this.style.removeProperty('--oas-desc-font-size')
    if (bordered) {
      this.style.setProperty('--oas-desc-cell-py', size.py)
      this.style.setProperty('--oas-desc-cell-px', size.px)
    } else {
      this.style.removeProperty('--oas-desc-cell-py')
      this.style.removeProperty('--oas-desc-cell-px')
    }
  }
}
