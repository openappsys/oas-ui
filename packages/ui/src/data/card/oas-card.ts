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
/* hoverable：悬停阴影 + 提升，过渡由 --oas-transition-base 控制 */
.card.hoverable {
  transition:
    box-shadow var(--oas-transition-base) var(--oas-ease-out),
    transform var(--oas-transition-base) var(--oas-ease-out);
  cursor: pointer;
}
.card.hoverable:hover {
  box-shadow: 0 4px 16px color-mix(in srgb, var(--oas-color-overlay) 24%, transparent);
  transform: translateY(-2px);
}
/* clickable：整卡可点，指针 + focus-visible 焦点环（放在 hover 之后，聚焦时优先级更高） */
:host([clickable]) .card {
  cursor: pointer;
}
:host([clickable]:focus-visible) .card {
  outline: none;
  box-shadow: var(--oas-focus-ring);
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
  justify-content: space-between;
  padding: var(--oas-space-4);
  border-bottom: 1px solid var(--oas-color-border);
}
/* hidden 属性会被本类 .header{display:flex} 作者级覆盖，需显式补回（与 .cover[hidden] 同款兜底） */
.header[hidden] {
  display: none;
}
.title {
  font-weight: 600;
  font-size: var(--oas-font-size-lg);
}
.extra {
  display: flex;
}
.body {
  padding: var(--oas-space-4);
  font-size: var(--oas-font-size-md);
  line-height: 1.6;
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
`

/** 整卡点击的排除选择器：命中这些交互元素时不派发 oas-click（避免与内部按钮/链接冲突） */
const INTERACTIVE_SEL = 'button, a, input, select, textarea, [role="button"], oas-button, oas-link'

export class OASCard extends OASElement {
  static override get observedAttributes(): string[] {
    return ['title', 'hoverable', 'cover-src', 'cover-alt', 'clickable']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="card" part="card">
        <div class="cover" part="cover" hidden>
          <slot name="cover"></slot>
          <img class="cover-img" part="cover-img" alt="" hidden>
        </div>
        <div class="header" part="header">
          <span class="title" part="title"><slot name="title"><span class="title-text"></span></slot></span>
          <div class="extra"><slot name="extra"></slot></div>
        </div>
        <div class="body" part="body"><slot></slot></div>
        <div class="actions" part="actions" hidden>
          <slot name="actions"></slot>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用；事件绑定幂等性由 rendered 标志保证只走一次） */
  private bind(): void {
    // 插槽内容增减时重新同步封面/操作区/标题区显隐（title 插槽纳入：双通道 slot 覆盖判空）
    for (const slot of ['cover', 'extra', 'actions', 'title']) {
      this.shadow
        .querySelector<HTMLSlotElement>(`slot[name="${slot}"]`)
        ?.addEventListener('slotchange', () => this.update())
    }
    // 整卡可点（clickable）：点击/Enter/Space 派发 oas-click；命中内部交互元素时跳过
    this.addEventListener('click', (e: Event) => {
      if (!this.hasAttr('clickable')) return
      if (this.hitsInteractive(e)) return
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

  /** 事件路径是否命中交互元素（composedPath 含 shadow 内部，排除内嵌按钮/链接；宿主自身不算） */
  private hitsInteractive(e: Event): boolean {
    return e
      .composedPath()
      .some((n) => n instanceof Element && n !== this && n.matches(INTERACTIVE_SEL))
  }

  /** 标题插槽是否有真实内容（元素节点或非空白文本）——slot 覆盖属性文案的判空依据 */
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
    card.classList.toggle('hoverable', this.hasAttr('hoverable'))

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

    // clickable：整卡承担按钮角色；聚焦后可 Enter/Space 触发
    if (this.hasAttr('clickable')) {
      this.setAttribute('role', 'button')
      this.setAttribute('tabindex', '0')
    } else {
      this.removeAttribute('role')
      this.removeAttribute('tabindex')
    }

    // 标题区：title（属性或插槽）为空且 extra 插槽无内容时隐藏（避免空条占位）
    const header = this.shadow.querySelector<HTMLElement>('[part="header"]')
    const extraSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="extra"]')
    if (header && extraSlot) {
      const hasTitle = title !== '' || hasSlotTitle
      const hasExtra = extraSlot.assignedNodes({ flatten: true }).length > 0
      header.hidden = !hasTitle && !hasExtra
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
  }
}
