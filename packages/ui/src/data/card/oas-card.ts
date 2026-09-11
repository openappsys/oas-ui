import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
/* 无边框形态：variant="borderless" 时去掉容器描边（默认 outlined 保持上边框） */
:host([variant="borderless"]) {
  border: none;
}
/* 链接卡：内部锚点做整卡包装，透明化锚点自身样式；有 href 时才呈现手型 */
.card-link {
  display: block;
  color: inherit;
  text-decoration: none;
  border-radius: inherit;
}
.card-link[href] {
  cursor: pointer;
}
.card-link:focus {
  outline: none;
}
/* href 卡焦点落在内部锚点上（host 不再可聚焦，焦点环跟随锚点） */
.card-link:focus-visible .card {
  box-shadow: var(--oas-focus-ring);
}
/* shadow-hover：悬停阴影 + 提升，过渡由 --oas-transition-base 控制（hoverable 布尔映射到这一态） */
.card.shadow-hover {
  transition:
    box-shadow var(--oas-transition-base) var(--oas-ease-out),
    transform var(--oas-transition-base) var(--oas-ease-out);
  cursor: pointer;
}
.card.shadow-hover:hover {
  box-shadow: 0 4px 16px color-mix(in srgb, var(--oas-color-overlay) 24%, transparent);
  transform: translateY(-2px);
}
/* shadow-always：常显阴影（比悬浮略浅，无位移） */
.card.shadow-always {
  box-shadow: 0 2px 8px color-mix(in srgb, var(--oas-color-overlay) 16%, transparent);
}
/* clickable：整卡可点，指针 + focus-visible 焦点环（放在 hover 之后，聚焦时优先级更高） */
:host([clickable]) .card {
  cursor: pointer;
}
:host([clickable]:focus-visible) .card {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 紧凑尺寸：size="small" 收紧内边距、标题小一号（medium 为默认档位，无需覆盖规则） */
:host([size="small"]) .header {
  padding: var(--oas-space-3) var(--oas-space-4);
}
:host([size="small"]) .title {
  font-size: var(--oas-font-size-md);
}
:host([size="small"]) .body {
  padding: var(--oas-space-3) var(--oas-space-4);
}
:host([size="small"]) .actions {
  padding: var(--oas-space-2) var(--oas-space-4);
}
:host([size="small"]) .footer {
  padding: var(--oas-space-2) var(--oas-space-4);
}
/* 封面区：顶部全宽，圆角贴合卡片（上圆下直），裁切溢出的图片 */
.cover {
  position: relative;
  overflow: hidden;
  border-radius: var(--oas-radius-lg) var(--oas-radius-lg) 0 0;
}
.cover-img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}
/* hidden 属性会被作者级 display 覆盖，需显式补回 */
.cover[hidden],
.cover slot[hidden] {
  display: none;
}
.header {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
  padding: var(--oas-space-4);
  border-bottom: 1px solid var(--oas-color-border);
}
/* hidden 属性会被本类 .header{display:flex} 作者级覆盖，需显式补回（与 .cover[hidden] 同款兜底） */
.header[hidden] {
  display: none;
}
/* header-bordered="false"：关闭标题区底部分割线（默认恒有，兼容现状） */
:host([header-bordered="false"]) .header {
  border-bottom: none;
}
/* Meta 形态：头像区左置，标题/副文案纵排在右 */
.avatar {
  display: flex;
  align-items: center;
  flex: none;
}
.avatar[hidden],
.avatar slot[hidden] {
  display: none;
}
.head-main {
  flex: 1;
  min-width: 0;
}
.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-3);
}
.title {
  font-weight: 600;
  font-size: var(--oas-font-size-lg);
}
.extra {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.description {
  margin-top: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.description[hidden] {
  display: none;
}
.body {
  padding: var(--oas-space-4);
  font-size: var(--oas-font-size-md);
  line-height: 1.6;
}
/* loading：正文插槽隐藏，骨架占位显示 */
.body slot[hidden] {
  display: none;
}
.skeleton {
  padding: var(--oas-space-1) 0;
}
.skeleton[hidden] {
  display: none;
}
.sk-title,
.sk-line {
  border-radius: var(--oas-radius-sm);
  background: linear-gradient(
    90deg,
    var(--oas-skeleton-color, var(--oas-color-bg-hover)) 25%,
    var(--oas-skeleton-sheen, var(--oas-color-border)) 50%,
    var(--oas-skeleton-color, var(--oas-color-bg-hover)) 75%
  );
  background-size: 200% 100%;
  animation: oas-card-sk var(--oas-skeleton-duration, 1.5s) infinite;
}
.sk-title {
  width: 40%;
  height: var(--oas-control-height-sm);
  margin-bottom: var(--oas-space-3);
}
.sk-line {
  height: var(--oas-control-height-sm);
  margin-bottom: var(--oas-space-2);
}
.sk-line:last-child {
  margin-bottom: 0;
}
.sk-line:nth-child(odd) {
  width: 92%;
}
.sk-line:nth-child(even) {
  width: 76%;
}
@keyframes oas-card-sk {
  to {
    background-position: -200% 0;
  }
}
/* 操作区：底部，上方分隔线 */
.actions {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-3) var(--oas-space-4);
  border-top: 1px solid var(--oas-color-border);
}
.actions[hidden],
.actions slot[hidden] {
  display: none;
}
/* 底条：与操作区相互独立的任意底栏，同样上方分隔线 */
.footer {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-3) var(--oas-space-4);
  border-top: 1px solid var(--oas-color-border);
}
.footer[hidden],
.footer slot[hidden] {
  display: none;
}
/* 卡体作为内部绝对定位（勾选角标）的包含块 */
.card {
  position: relative;
}
/* selectable：整卡点选切换选中态（大容器富内容的多选形态） */
:host([selectable]) {
  cursor: pointer;
}
:host([selectable][loading]) {
  cursor: default;
}
/* 选中态：primary 描边 + 浅 primary 底（6% 混底，dark 下同样可读）；
   描边用 inset 环——与既有 1px 边框重合不增厚，borderless 形态也能呈现 */
:host([selectable][selected]) {
  background: color-mix(in srgb, var(--oas-color-primary) 6%, var(--oas-color-bg));
  border-color: var(--oas-color-primary);
  box-shadow: inset 0 0 0 1px var(--oas-color-primary);
}
/* 焦点环与 clickable 同款（落在 .card 层，与 host 层的选中 inset 环不冲突） */
:host([selectable]:focus-visible) .card {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 右上勾选角标：直角三角（对角渐变裁出）+ 原创 ✓ SVG；逻辑属性 RTL 自动翻转 */
.check-badge {
  position: absolute;
  top: 0;
  inset-inline-end: 0;
  width: 26px;
  height: 26px;
  pointer-events: none;
  z-index: 1;
}
.check-badge[hidden] {
  display: none;
}
.check-badge .check-corner {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom left, var(--oas-color-primary) 50%, transparent 50%);
  border-start-end-radius: var(--oas-radius-lg);
}
.check-badge .check-icon {
  position: absolute;
  top: 3px;
  inset-inline-end: 3px;
  width: 11px;
  height: 11px;
  color: var(--oas-color-text-on-primary);
}
`

/** 整卡点击的排除选择器：命中这些交互元素时不派发 oas-click（避免与内部按钮/链接冲突） */
const INTERACTIVE_SEL = 'button, a, input, select, textarea, [role="button"], oas-button, oas-link'

export class OASCard extends OASElement {
  static override get observedAttributes(): string[] {
    // size / variant / header-bordered 为纯 CSS 属性（:host([..]) 选择器驱动）；
    // 仍进观察列表——API 扫描以观察列表为发现通道，且变更时重渲染无副作用
    return [
      'title',
      'hoverable',
      'cover-src',
      'cover-alt',
      'clickable',
      'loading',
      'size',
      'variant',
      'header-bordered',
      'shadow',
      'href',
      'target',
      'description',
      'selectable',
      'selected',
    ]
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <a class="card-link" part="link">
        <div class="card" part="card">
          <div class="cover" part="cover" hidden>
            <slot name="cover"></slot>
            <img class="cover-img" part="cover-img" alt="" hidden>
          </div>
          <div class="header" part="header">
            <span class="avatar" part="avatar" hidden><slot name="avatar"></slot></span>
            <div class="head-main">
              <div class="head-row">
                <span class="title" part="title"><slot name="title"><span class="title-text"></span></slot></span>
                <div class="extra"><slot name="extra"></slot></div>
              </div>
              <div class="description" part="description" hidden>
                <span class="desc-text"></span>
                <slot name="description"></slot>
              </div>
            </div>
          </div>
          <div class="body" part="body">
            <slot></slot>
            <div class="skeleton" part="skeleton" hidden aria-hidden="true">
              <div class="sk-title"></div>
              <div class="sk-line"></div>
              <div class="sk-line"></div>
              <div class="sk-line"></div>
            </div>
          </div>
          <div class="actions" part="actions" hidden>
            <slot name="actions"></slot>
          </div>
          <div class="footer" part="footer" hidden>
            <slot name="footer"></slot>
          </div>
          <span class="check-badge" part="check-badge" hidden>
            <span class="check-corner"></span>
            <svg class="check-icon" viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" focusable="false"><path d="M2.4 6.3 5 8.8 9.7 3.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
        </div>
      </a>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用；事件绑定幂等性由 rendered 标志保证只走一次） */
  private bind(): void {
    // 插槽内容增减时重新同步封面/操作区/底条/标题区/Meta 区显隐（title/description 双通道判空）
    for (const slot of ['cover', 'extra', 'actions', 'title', 'footer', 'avatar', 'description']) {
      this.shadow
        .querySelector<HTMLSlotElement>(`slot[name="${slot}"]`)
        ?.addEventListener('slotchange', () => this.update())
    }
    // 整卡可点（clickable）：点击/Enter/Space 派发 oas-click；命中内部交互元素时跳过。
    // selectable：点击/Enter/Space 切换选中（loading 骨架态不切换；命中内部交互元素时跳过）；
    // href 链接卡同设时命中卡本体优先选中并阻止默认导航（内部按钮/链接仍走各自操作）。
    // href 链接卡：命中内部交互元素时额外阻止锚点默认导航（同一批排除元素）
    this.addEventListener('click', (e: Event) => {
      const interactive = this.hitsInteractive(e)
      const href = this.getAttr('href', '')
      if (interactive && href !== '') e.preventDefault()
      if (this.hasAttr('selectable') && !this.hasAttr('loading') && !interactive) {
        this.toggleSelected()
        if (href !== '') e.preventDefault()
      }
      if (!this.hasAttr('clickable')) return
      if (interactive) return
      this.emit('click', { originalEvent: e })
    })
    this.addEventListener('keydown', (e: Event) => {
      const k = e as KeyboardEvent
      if (k.key !== 'Enter' && k.key !== ' ') return
      if (this.hitsInteractive(e)) return
      if (this.hasAttr('selectable') && !this.hasAttr('loading')) {
        k.preventDefault()
        this.toggleSelected()
      }
      if (!this.hasAttr('clickable')) return
      k.preventDefault()
      this.emit('click', { originalEvent: k })
    })
  }

  /** selectable 受控探测：selected 属性变化来自宿主（非自身反射）→ 进入受控模式，
   *  此后只派发 oas-change、不再自改属性（宿主监听事件回写） */
  private reflectingSelected = false
  private selectedControlled = false

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name === 'selected' && oldValue !== newValue && !this.reflectingSelected) {
      this.selectedControlled = true
    }
    super.attributeChangedCallback(name, oldValue, newValue)
  }

  /** 切换选中态：派发 oas-change（detail 为切换后的新状态）；
   *  非受控时反射 selected 属性（aria-checked / 视觉由 update() 增量同步） */
  private toggleSelected(): void {
    const next = !this.hasAttr('selected')
    this.emit('change', { selected: next })
    if (this.selectedControlled) return
    this.reflectingSelected = true
    if (next) this.setAttribute('selected', '')
    else this.removeAttribute('selected')
    this.reflectingSelected = false
  }

  /** 事件路径是否命中交互元素（composedPath 含 shadow 内部，排除内嵌按钮/链接；
   *  宿主自身与卡自身的包装锚点 [part="link"] 不算——它是卡结构的一部分） */
  private hitsInteractive(e: Event): boolean {
    const link = this.shadow.querySelector('[part="link"]')
    return e
      .composedPath()
      .some((n) => n instanceof Element && n !== this && n !== link && n.matches(INTERACTIVE_SEL))
  }

  /** 标题插槽是否有真实内容（元素节点或非空白文本）—— slot 覆盖属性文案的判空依据 */
  private hasTitleSlotContent(slot: HTMLSlotElement): boolean {
    return slot
      .assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（card 骨架存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="card"]')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  protected override update(): void {
    const card = this.shadow.querySelector('[part="card"]')
    if (!card) return

    // 阴影三态：显式 shadow 优先；hoverable 布尔是 shadow=hover 的兼容别名；默认无阴影
    const shadowAttr = this.getAttr('shadow', '')
    const shadowState = shadowAttr !== '' ? shadowAttr : this.hasAttr('hoverable') ? 'hover' : 'none'
    card.classList.toggle('shadow-hover', shadowState === 'hover')
    card.classList.toggle('shadow-always', shadowState === 'always')

    // title 吸收：title 渲染进可见标题区后即从宿主移除——title 是原生全局属性，
    // 残留在宿主上会让整卡悬停弹出浏览器原生提示（与可见标题重复的视觉干扰）。
    // 状态机：属性在场（含空串）= 宿主意图（写入新值/空串清空）→ 更新缓存并移除；
    // 属性缺席 = 内部吸收后的常态（或宿主 removeAttribute，此时保持已渲染标题，
    // 清空请用 title=""）。缓存驱动渲染，吸收触发的二次 update 幂等。
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    const title = this.titleCache ?? ''
    // title 双通道：slot 有真实内容时隐藏兜底 span（富内容优先），无则渲染 titleCache 文本
    const titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    const titleFallback = this.shadow.querySelector<HTMLElement>('.title-text')
    let hasSlotTitle = false
    if (titleSlot && titleFallback) {
      hasSlotTitle = this.hasTitleSlotContent(titleSlot)
      titleFallback.textContent = title
      titleFallback.hidden = hasSlotTitle
    }

    // description 双通道（非原生全局属性，无需吸收）：slot 有真实内容时隐藏兜底 span
    const description = this.getAttr('description', '')
    const descSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="description"]')
    const descFallback = this.shadow.querySelector<HTMLElement>('.desc-text')
    const descEl = this.shadow.querySelector<HTMLElement>('[part="description"]')
    let hasDescSlot = false
    if (descSlot && descFallback && descEl) {
      hasDescSlot = this.hasTitleSlotContent(descSlot)
      descFallback.textContent = description
      descFallback.hidden = hasDescSlot
      descEl.hidden = description === '' && !hasDescSlot
    }

    // avatar 区：slot 有内容时显示
    const avatar = this.shadow.querySelector<HTMLElement>('[part="avatar"]')
    const avatarSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="avatar"]')
    let hasAvatar = false
    if (avatar && avatarSlot) {
      hasAvatar = avatarSlot.assignedNodes({ flatten: true }).length > 0
      avatar.hidden = !hasAvatar
    }

    // loading：内容区切骨架占位（正文插槽隐藏、骨架显示），宿主同步 aria-busy
    const loading = this.hasAttr('loading')
    const bodySlot = this.shadow.querySelector<HTMLSlotElement>('slot:not([name])')
    const skeleton = this.shadow.querySelector<HTMLElement>('[part="skeleton"]')
    if (bodySlot && skeleton) {
      bodySlot.hidden = loading
      skeleton.hidden = !loading
    }
    if (loading) this.setAttribute('aria-busy', 'true')
    else this.removeAttribute('aria-busy')

    // href 链接卡：整卡语义为链接——内部锚点承载 href/target 与焦点，
    // 宿主不再叠加 button 角色/焦点（避免嵌套交互语义；键盘 Enter 由锚点原生支持）
    const href = this.getAttr('href', '')
    const link = this.shadow.querySelector<HTMLAnchorElement>('[part="link"]')
    if (link) {
      if (href !== '') {
        link.setAttribute('href', href)
        const target = this.getAttr('target', '')
        if (target !== '') link.setAttribute('target', target)
        else link.removeAttribute('target')
      } else {
        link.removeAttribute('href')
        link.removeAttribute('target')
      }
    }

    // clickable / selectable 的角色与焦点语义：
    // href 在场时例外：焦点已交给内部锚点，宿主保持普通容器语义（避免嵌套交互语义）。
    // selectable 优先于 clickable 的角色语义（aria-checked 需 checkbox 角色承载）；
    // 宿主显式角色优先——多卡组可挂 role="radio" 做单选组合，组件不覆盖、仅同步 aria-checked；
    // loading 骨架态不可选：不挂交互语义（点击/键盘拦截在事件层同样兜底）
    const clickableActive = this.hasAttr('clickable') && href === ''
    const selectableActive = this.hasAttr('selectable') && href === '' && !loading
    const authorRole = this.getAttribute('role')
    if (selectableActive) {
      if (authorRole == null) this.setAttribute('role', 'checkbox')
      this.setAttribute('tabindex', '0')
      this.setAttribute('aria-checked', this.hasAttr('selected') ? 'true' : 'false')
    } else if (clickableActive) {
      if (authorRole == null) this.setAttribute('role', 'button')
      this.setAttribute('tabindex', '0')
      this.removeAttribute('aria-checked')
    } else {
      // 只清理组件自己挂的缺省角色；宿主显式角色（radio 等）不碰
      const role = this.getAttribute('role')
      if (role === 'checkbox' || role === 'button') this.removeAttribute('role')
      this.removeAttribute('tabindex')
      this.removeAttribute('aria-checked')
    }

    // 勾选角标：selectable 且选中时显示（CSS 层 :host([selectable][selected]) 配套呈现）
    const badge = this.shadow.querySelector<HTMLElement>('[part="check-badge"]')
    if (badge) badge.hidden = !(this.hasAttr('selectable') && this.hasAttr('selected'))

    // 标题区：title（属性或插槽）/extra/avatar/description 全空时隐藏（避免空条占位）
    const header = this.shadow.querySelector<HTMLElement>('[part="header"]')
    const extraSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="extra"]')
    if (header && extraSlot) {
      const hasTitle = title !== '' || hasSlotTitle
      const hasExtra = extraSlot.assignedNodes({ flatten: true }).length > 0
      const hasDesc = description !== '' || hasDescSlot
      header.hidden = !hasTitle && !hasExtra && !hasAvatar && !hasDesc
    }

    // 封面：cover-src 优先（渲染 <img>）；否则 cover 插槽有内容时显示插槽；都没有则隐藏整区
    const cover = this.shadow.querySelector<HTMLElement>('[part="cover"]')
    const coverSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="cover"]')
    const coverImg = this.shadow.querySelector<HTMLImageElement>('[part="cover-img"]')
    if (cover && coverSlot && coverImg) {
      const hasSrc = this.getAttr('cover-src', '') !== ''
      const hasSlot = coverSlot.assignedNodes({ flatten: true }).length > 0
      cover.hidden = !hasSrc && !hasSlot
      coverImg.hidden = !hasSrc
      coverSlot.hidden = hasSrc || !hasSlot
      coverImg.src = this.getAttr('cover-src', '')
      coverImg.alt = this.getAttr('cover-alt', '')
    }

    // 操作区：actions 插槽有内容时显示
    const actions = this.shadow.querySelector<HTMLElement>('[part="actions"]')
    const actionsSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="actions"]')
    if (actions && actionsSlot) {
      actions.hidden = actionsSlot.assignedNodes({ flatten: true }).length === 0
    }

    // 底条：footer 插槽有内容时显示（与 actions 相互独立）
    const footer = this.shadow.querySelector<HTMLElement>('[part="footer"]')
    const footerSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="footer"]')
    if (footer && footerSlot) {
      footer.hidden = footerSlot.assignedNodes({ flatten: true }).length === 0
    }
  }
}
