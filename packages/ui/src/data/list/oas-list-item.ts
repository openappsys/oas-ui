import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
  padding: var(--oas-space-3) var(--oas-space-4);
  font-family: inherit;
  box-sizing: border-box;
}
:host([hidden]) {
  display: none;
}
/* 尺寸档：自身 size 属性 或 oas-list 下发的 data-size（与 tree 内嵌先例一致） */
:host([size='sm']),
:host([data-size='sm']) {
  padding: var(--oas-space-2) var(--oas-space-3);
  gap: var(--oas-space-2);
}
:host([size='lg']),
:host([data-size='lg']) {
  padding: var(--oas-space-4) var(--oas-space-5);
  gap: var(--oas-space-4);
}
/* 斑马纹：oas-list 按视觉偶数行打 data-stripe */
:host([data-stripe]) {
  background: var(--oas-color-bg-hover);
}
/* 行交互：clickable 整行可点 + hover 反馈 */
:host([data-clickable]) {
  cursor: pointer;
}
:host([data-clickable]:hover) {
  background: var(--oas-color-bg-hover);
}
:host([data-clickable]:focus-visible) {
  box-shadow: inset var(--oas-focus-ring);
  outline: none;
}
/* 选中行高亮（aria-selected 同步，见 update） */
:host([selected]) {
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
/* 选中行 hover：保持 primary 系底（置于 clickable hover 浅灰规则之后压盖——
   否则 [data-clickable]:hover 的 bg-hover 浅灰会盖过选中蓝底，白字白底不可读） */
:host([selected]:hover) {
  background: var(--oas-color-primary-hover, var(--oas-color-primary));
}
:host([selected]) .desc {
  color: color-mix(in srgb, var(--oas-color-text-on-primary) 72%, transparent);
}
.avatar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
/* 作者层 display（.avatar flex / .avatar-img block）会压过 UA 的 [hidden] 隐藏，
   无头像内容时必须显式兜底，否则空 img 渲染成灰圈 + 破图残影（用户实测缺陷） */
[hidden] {
  display: none !important;
}
.avatar-img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  background: var(--oas-color-bg-hover);
}
:host([size='sm']) .avatar-img,
:host([data-size='sm']) .avatar-img {
  width: 24px;
  height: 24px;
}
:host([size='lg']) .avatar-img,
:host([data-size='lg']) .avatar-img {
  width: 40px;
  height: 40px;
}
.title {
  font-weight: 500;
  font-size: var(--oas-font-size-md);
}
:host([size='sm']) .title,
:host([data-size='sm']) .title {
  font-size: var(--oas-font-size-sm);
}
:host([size='lg']) .title,
:host([data-size='lg']) .title {
  font-size: var(--oas-font-size-lg);
}
.main {
  flex: 1;
  min-width: 0;
}
.desc {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.extra {
  flex-shrink: 0;
}
`

export class OASListItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['title', 'description', 'avatar', 'clickable', 'selected', 'size']
  }

  /** 数据通道上下文：所属 oas-list 注入的原始数据项（oas-click detail 回传） */
  itemData: unknown = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="avatar" part="avatar" hidden>
        <slot name="avatar"><img class="avatar-img" alt="" /></slot>
      </div>
      <div class="main" part="main">
        <div class="title" part="title"><slot name="title"><span class="title-text"></span></slot></div>
        <div class="desc" part="description"><slot name="description"><span class="desc-text"></span><slot></slot></slot></div>
      </div>
      <div class="extra"><slot name="extra"></slot></div>
    `
  }

  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null

  /** 插槽是否有真实内容（元素节点或非空白文本）——slot 覆盖属性文案的判空依据 */
  private slotHasContent(slot: HTMLSlotElement | null): boolean {
    if (!slot) return false
    return slot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  /** 缓存节点引用（render 与水合路径共用；title/description/avatar 插槽内容增减时重刷） */
  private bind(): void {
    for (const sel of ['slot[name="title"]', 'slot[name="description"]', 'slot:not([name])', 'slot[name="avatar"]']) {
      this.shadow.querySelector<HTMLSlotElement>(sel)?.addEventListener('slotchange', () => {
        // 属性吸收（title）触发的 slotchange 自激防护：下次微任务再刷，幂等
        queueMicrotask(() => this.update())
      })
    }
    this.addEventListener('keydown', (e) => this.handleKeydown(e as KeyboardEvent))
    this.addEventListener('click', () => {
      if (!this.hasAttribute('clickable')) return
      this.emit('click', { index: this.rowIndex(), item: this.itemData })
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（main 骨架存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="main"]')) return false
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
    // itemData 元数据兜底（数据通道行）：title/description/avatar 属性缺席时从
    // itemData 同名字段取——对象行不写模板也能开箱渲染，不再退化成 "[object Object]"
    const meta =
      this.itemData && typeof this.itemData === 'object'
        ? (this.itemData as { title?: unknown; description?: unknown; avatar?: unknown })
        : null
    if (this.titleCache == null && meta?.title != null) this.titleCache = String(meta.title)
    // title 双通道：属性文本写入兜底 span；slot="title" 有真实内容时以插槽为准（兜底隐藏）
    const titleEl = this.shadow.querySelector<HTMLElement>('[part="title"]')
    const titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    const titleFallback = this.shadow.querySelector<HTMLElement>('.title-text')
    const title = this.titleCache ?? ''
    if (titleEl && titleSlot && titleFallback) {
      titleFallback.textContent = title
      titleFallback.hidden = this.slotHasContent(titleSlot)
    } else if (titleEl) {
      // 降级：无 slot 结构（旧版 SSR 快照）直接写标题区文本
      titleEl.textContent = title
    }

    // description 双通道：属性文本兜底；slot="description" 优先；全无则隐藏描述行
    const descEl = this.shadow.querySelector<HTMLElement>('.desc')
    const descSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="description"]')
    const descFallback = this.shadow.querySelector<HTMLElement>('.desc-text')
    const defaultSlot = this.shadow.querySelector<HTMLSlotElement>('slot:not([name])')
    if (descEl && descSlot && descFallback) {
      const attr = this.getAttr('description', '') || (meta?.description != null ? String(meta.description) : '')
      descFallback.textContent = attr
      // 插槽（description 或默认插槽）有内容时隐藏属性兜底，防双显
      const hasDesc = this.slotHasContent(descSlot) || this.slotHasContent(defaultSlot)
      descFallback.hidden = hasDesc
      descEl.hidden = !hasDesc && attr === ''
    }

    // avatar 双通道：slot="avatar" 优先；avatar 属性（URL）渲染兜底头像图
    const avatarEl = this.shadow.querySelector<HTMLElement>('[part="avatar"]')
    const avatarSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="avatar"]')
    const avatarImg = this.shadow.querySelector<HTMLImageElement>('.avatar-img')
    const avatarUrl = this.getAttr('avatar', '') || (meta?.avatar != null ? String(meta.avatar) : '')
    if (avatarEl && avatarSlot && avatarImg) {
      const hasSlot = this.slotHasContent(avatarSlot)
      avatarImg.hidden = hasSlot || avatarUrl === ''
      if (avatarUrl !== '') avatarImg.src = avatarUrl
      avatarEl.hidden = !hasSlot && avatarUrl === ''
    }

    // 行交互：clickable → 可聚焦 + role + 高亮态钩子；selected → aria-selected
    const clickable = this.hasAttribute('clickable')
    this.toggleAttribute('data-clickable', clickable)
    if (clickable) {
      this.setAttribute('tabindex', '0')
      this.setAttribute('role', 'button')
    } else {
      this.removeAttribute('tabindex')
      this.removeAttribute('role')
    }
    this.setAttribute('aria-selected', String(this.hasAttribute('selected')))
  }

  /** 键盘可达：Enter / Space 触发行点击（Space 阻止页面滚动） */
  private handleKeydown(e: KeyboardEvent): void {
    if (!this.hasAttribute('clickable')) return
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    this.emit('click', { index: this.rowIndex(), item: this.itemData })
  }

  /** 在所属 oas-list 中的序号（数据通道行由 list 打 data-index；声明式行返回 null） */
  private rowIndex(): number | null {
    const raw = this.getAttribute('data-index')
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }
}
