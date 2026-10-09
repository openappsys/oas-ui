import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
  padding: var(--oas-space-3) var(--oas-space-4);
  font-family: inherit;
  box-sizing: border-box;
  position: relative;
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
  /* 选中主色底上的描述文字：跟随宿主对底文字色（72% 透明化的浅蓝字压主色底 感知分不达标） */
  color: var(--oas-color-text-on-primary);
}
.avatar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
/* 前置图标位（slot="icon"）：通用图标通道，尺寸跟随内容（oas-icon 自带尺寸），仅占布局位 */
.lead-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
/* 方形缩略图位（slot="image"）：与 avatar 同尺寸档联动，方形 + 小圆角 + 裁剪填充 */
.lead-image {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--oas-radius-sm);
  overflow: hidden;
  background: var(--oas-color-bg-hover);
}
:host([size='sm']) .lead-image,
:host([data-size='sm']) .lead-image {
  width: 24px;
  height: 24px;
}
:host([size='lg']) .lead-image,
:host([data-size='lg']) .lead-image {
  width: 40px;
  height: 40px;
}
.lead-image ::slotted(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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
/* extra 操作区位于整行链接覆盖层之上：链接行（href）里放行内控件仍有可点热区 */
.extra {
  position: relative;
  z-index: 2;
}
/* 整行链接覆盖层（href 时渲染）：绝对定位铺满整行，z-index 压过行内文本（点击即导航），
   在 .extra（z-index 2）之下——操作区控件不受覆盖层遮挡 */
.row-link {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  outline: none;
}
.row-link:focus-visible {
  box-shadow: inset var(--oas-focus-ring);
}
`

/** 行内交互元素判定选择器（命中则不触发行点击；含原生控件、ARIA 控件角色与可编辑区） */
const INTERACTIVE_SEL =
  'button, a, input, select, textarea, [role="button"], [role="switch"], [role="link"], [role="checkbox"], [role="radio"], [role="menuitem"], [contenteditable="true"], oas-button, oas-link'

export class OASListItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['title', 'description', 'avatar', 'clickable', 'selected', 'size', 'href', 'target', 'rel']
  }

  /** 数据通道上下文：所属 oas-list 注入的原始数据项（oas-click detail 回传） */
  itemData: unknown = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="lead-icon" part="lead-icon" hidden><slot name="icon"></slot></div>
      <div class="lead-image" part="lead-image" hidden><slot name="image"></slot></div>
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

  /** 缓存节点引用（render 与水合路径共用；title/description/avatar/icon/image 插槽内容增减时重刷） */
  private bind(): void {
    for (const sel of [
      'slot[name="title"]',
      'slot[name="description"]',
      'slot:not([name])',
      'slot[name="avatar"]',
      'slot[name="icon"]',
      'slot[name="image"]',
    ]) {
      this.shadow.querySelector<HTMLSlotElement>(sel)?.addEventListener('slotchange', () => {
        // 属性吸收（title）触发的 slotchange 自激防护：下次微任务再刷，幂等
        queueMicrotask(() => this.update())
      })
    }
    this.addEventListener('keydown', (e) => this.handleKeydown(e as KeyboardEvent))
    this.addEventListener('click', (e) => {
      // 链接行：点击 = 原生导航（覆盖 <a> 承担），不派 oas-click（语义分离避免双触发）
      if (this.hasAttribute('href')) return
      if (!this.hasAttribute('clickable')) return
      if (this.hitsInteractive(e)) return
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

    // 前置图标 / 方形缩略图位（slot="icon" / slot="image"）：无内容即隐藏（不占布局空位）
    const iconEl = this.shadow.querySelector<HTMLElement>('[part="lead-icon"]')
    if (iconEl) iconEl.hidden = !this.slotHasContent(this.shadow.querySelector<HTMLSlotElement>('slot[name="icon"]'))
    const imageEl = this.shadow.querySelector<HTMLElement>('[part="lead-image"]')
    if (imageEl) {
      imageEl.hidden = !this.slotHasContent(this.shadow.querySelector<HTMLSlotElement>('slot[name="image"]'))
    }

    // 行交互：clickable（或 href 链接行）→ hover 反馈钩子；链接行不派 oas-click
    //（点击=导航，语义分离）——钩子仅驱动高亮态 CSS。
    // role / aria-pressed 组件一律不自设也不删——宿主显式挂的（如想恢复行级按钮语义的
    // role="button" + aria-pressed）原样保留不覆盖（与 card「宿主显式角色不覆盖」口径一致）
    const linked = this.hasAttribute('href')
    const clickable = this.hasAttribute('clickable') || linked
    this.toggleAttribute('data-clickable', clickable)
    // 焦点：链接行的键盘焦点由内部覆盖 <a> 承担（host 不设 tabindex，避免双 Tab 停靠点）
    if (clickable && !linked) this.setAttribute('tabindex', '0')
    else this.removeAttribute('tabindex')
    // 整行链接覆盖层同步（href 缺席即摘除，不残留死链接）
    this.syncRowLink()
  }

  /** 链接覆盖层可访问名称：title 缓存 → slot="title" 文本 → 行整体文本（axe link-name 达标） */
  private linkLabel(): string {
    if (this.titleCache) return this.titleCache
    const titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    const slotText = (titleSlot?.assignedNodes() ?? [])
      .map((n) => n.textContent ?? '')
      .join('')
      .trim()
    if (slotText) return slotText
    return (this.textContent ?? '').trim()
  }

  /** 整行链接覆盖层同步：href 在场渲染 absolute inset-0 的 <a>（z-index 1，位于 .extra 之下） */
  private syncRowLink(): void {
    let a = this.shadow.querySelector<HTMLAnchorElement>('a.row-link')
    const href = this.getAttr('href', '')
    if (href === '') {
      a?.remove()
      return
    }
    if (!a) {
      a = document.createElement('a')
      a.className = 'row-link'
      a.setAttribute('part', 'link')
      // appendChild 到 shadow 末尾：覆盖层位于所有布局位之后（配合 inset:0 + z-index 生效）
      this.shadow.appendChild(a)
    }
    a.setAttribute('href', href)
    const target = this.getAttr('target', '')
    if (target) a.setAttribute('target', target)
    else a.removeAttribute('target')
    const rel = this.getAttr('rel', '')
    if (rel) a.setAttribute('rel', rel)
    else if (target) a.setAttribute('rel', 'noopener noreferrer')
    else a.removeAttribute('rel')
    const label = this.linkLabel()
    if (label) a.setAttribute('aria-label', label)
    else a.removeAttribute('aria-label')
  }

  /** 行内交互元素判定：命中则不触发行点击（防止点行内开关/按钮时行与控件双触发） */
  private hitsInteractive(e: Event): boolean {
    return e.composedPath().some((n) => n instanceof Element && n !== this && n.matches(INTERACTIVE_SEL))
  }

  /** 键盘可达：Enter / Space 触发行点击（Space 阻止页面滚动）；焦点在行内控件时不接管；
   *  链接行 Enter 导航由内部原生 <a> 承担（preventDefault 会吞掉原生跳转，直接跳过） */
  private handleKeydown(e: KeyboardEvent): void {
    if (this.hasAttribute('href')) return
    if (!this.hasAttribute('clickable')) return
    if (e.key !== 'Enter' && e.key !== ' ') return
    if (this.hitsInteractive(e)) return
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
