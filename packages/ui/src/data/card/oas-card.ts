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
    // href 链接卡：命中内部交互元素时额外阻止锚点默认导航（同一批排除元素）
    this.addEventListener('click', (e: Event) => {
      const interactive = this.hitsInteractive(e)
      if (interactive && this.getAttr('href', '') !== '') e.preventDefault()
      if (!this.hasAttr('clickable')) return
      if (interactive) return
      this.emit('click', { originalEvent: e })
    })
    this.addEventListener('keydown', (e: Event) => {
      const k = e as KeyboardEvent
      if (!this.hasAttr('clickable')) return
      if (k.key !== 'Enter' && k.key !== ' ') return
      if (this.hitsInteractive(e)) return
      k.preventDefault()
      this.emit('click', { originalEvent: k })
    })
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

    // clickable：整卡承担按钮角色；聚焦后可 Enter/Space 触发。
    // href 在场时例外：焦点已交给内部锚点，宿主保持普通容器语义
    if (this.hasAttr('clickable') && href === '') {
      this.setAttribute('role', 'button')
      this.setAttribute('tabindex', '0')
    } else {
      this.removeAttribute('role')
      this.removeAttribute('tabindex')
    }

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
