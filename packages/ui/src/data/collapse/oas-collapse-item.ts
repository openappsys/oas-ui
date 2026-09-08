import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.head-row {
  display: flex;
  align-items: stretch;
}
.heading {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
}
.head {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  min-width: 0;
  padding: var(--oas-space-3) var(--oas-space-4);
  border: none;
  background: none;
  cursor: pointer;
  font: inherit;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
  text-align: left;
}
.head:hover {
  background: var(--oas-color-bg-hover);
}
.head:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.header-text {
  order: 1;
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: break-word;
}
.header-slot {
  order: 1;
  display: none;
  flex: 1 1 auto;
  min-width: 0;
}
:host([has-header-slot]) .header-slot {
  display: flex;
  align-items: center;
}
:host([has-header-slot]) .header-text {
  display: none;
}
.arrow {
  order: 2;
  flex: none;
  display: inline-flex;
  align-items: center;
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
}
:host([icon-placement="start"]) .arrow {
  order: 0;
}
:host([open]) .arrow {
  transform: rotate(90deg);
}
.extra {
  display: none;
  align-items: center;
  padding: 0 var(--oas-space-4) 0 0;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
}
:host([has-extra]) .extra {
  display: flex;
}
/* 展开动画：grid-template-rows 0fr→1fr 纯 CSS 方案，内容 overflow 裁剪 */
.body-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--oas-transition-base) var(--oas-ease-out);
}
.body {
  overflow: hidden;
  min-height: 0;
  padding: 0 var(--oas-space-4);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
  transition: padding var(--oas-transition-base) var(--oas-ease-out);
}
:host([open]) .body-wrap {
  grid-template-rows: 1fr;
}
:host([open]) .body {
  padding: var(--oas-space-3) var(--oas-space-4);
}
/* disabled：不可聚焦、视觉降饱和，文字走 text-disabled token（含暗色变体） */
:host([disabled]) .head {
  cursor: not-allowed;
  opacity: 0.6;
}
:host([disabled]) .head,
:host([disabled]) .header-text {
  color: var(--oas-color-text-disabled);
}
:host([disabled]) .head:hover {
  background: none;
}
@media (prefers-reduced-motion: reduce) {
  .body-wrap,
  .body,
  .arrow {
    transition: none;
  }
}
`

/**
 * slot 模板克隆：浏览器对 <template> 子节点存在两种挂载形态（静态 HTML 在 content，
 * Vue 等框架 CSR 直插在元素 childNodes），按内容优先取源再深克隆，双形态都能渲染。
 */
function cloneSlotContent(tpl: HTMLTemplateElement): DocumentFragment {
  const source = tpl.content.childNodes.length > 0 ? tpl.content : tpl
  const frag = document.createDocumentFragment()
  for (const node of Array.from(source.childNodes)) {
    frag.appendChild(node.cloneNode(true))
  }
  return frag
}

export class OASCollapseItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['name', 'header', 'open', 'disabled', 'icon-placement', 'heading-level', 'destroy-on-collapse', 'force-render']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="item" part="item">
        <div class="head-row">
          <div class="heading" part="heading">
            <button class="head" part="head" type="button" aria-expanded="false" aria-controls="body">
              <span class="header-text" part="header"></span>
              <span class="header-slot" part="header-slot"><slot name="header"></slot></span>
              <span class="arrow" part="arrow" aria-hidden="true">›</span>
            </button>
          </div>
          <div class="extra" part="extra"><slot name="extra"></slot></div>
        </div>
        <div class="body-wrap" part="body-wrap" id="body">
          <div class="body" part="body"><slot></slot></div>
        </div>
      </div>
    `
  }

  private headEl: HTMLButtonElement | null = null
  private bodyEl: HTMLElement | null = null
  private contentSlot: HTMLSlotElement | null = null
  /** 最近一次展开图标克隆来源（template 引用）；变化时才重填，避免无关 update 抹掉自定义图标状态 */
  private toggleTpl: HTMLTemplateElement | null = null

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.headEl = this.shadow.querySelector<HTMLButtonElement>('.head')
    this.bodyEl = this.shadow.querySelector<HTMLElement>('.body')
    this.contentSlot = this.shadow.querySelector<HTMLSlotElement>('slot:not([name])')
    this.fillToggle()
    this.headEl?.addEventListener('click', () => {
      if (this.isDisabled()) return
      this.dispatchEvent(
        new CustomEvent('oas-collapse-item-click', {
          detail: { item: this },
          bubbles: true,
          composed: true,
        }),
      )
    })
    // extra 操作区与折叠点击解耦：内部点击不向外冒泡触达容器/宿主文档监听
    this.shadow.querySelector('.extra')?.addEventListener('click', (e) => {
      e.stopPropagation()
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
    this.notifyContainerSync()
  }

  /** 真水合：校验 SSR 快照结构（item 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.item')) return false
    this.bind()
    this.notifyContainerSync()
    return true
  }

  /** 升级晚于容器时（define 顺序窗口），连接后微任务请容器重同步 roving/disabled 态（最终一致） */
  private notifyContainerSync(): void {
    queueMicrotask(() => {
      ;(this.closest('oas-collapse') as { requestSync?: () => void } | null)?.requestSync?.()
    })
  }

  /** 展开图标：item 级 template[slot="toggle"] 自定义内容优先，默认箭头字符 › */
  private fillToggle(): void {
    const arrow = this.shadow.querySelector<HTMLElement>('.arrow')
    if (!arrow) return
    const tpl = this.querySelector<HTMLTemplateElement>('template[slot="toggle"]')
    this.toggleTpl = tpl ?? null
    arrow.textContent = ''
    if (tpl) {
      arrow.appendChild(cloneSlotContent(tpl))
    } else {
      arrow.textContent = '›'
    }
  }

  /** 容器 roving tabindex / 键盘移动用：头 button 是否可 Tab 聚焦 */
  setRoving(active: boolean): void {
    if (this.headEl) this.headEl.tabIndex = active ? 0 : -1
  }

  /** 容器 roving 键盘移动用：聚焦头 button */
  focusHead(): void {
    this.headEl?.focus()
  }

  /** 生效禁用态（显式 disabled 属性；config-provider 注入的全局禁用同样生效） */
  isDisabled(): boolean {
    return this.injectDisabled()
  }

  protected override update(): void {
    // 展开图标：template[slot="toggle"] 在连接后才挂载（框架异步插入）时按引用比对补克隆
    const tpl = this.querySelector<HTMLTemplateElement>('template[slot="toggle"]')
    if ((tpl ?? null) !== this.toggleTpl) this.fillToggle()

    // 标题文本：header 属性进文本位；slot="header" 在场时 slot 优先（文本位置空，has-header-slot 切显隐）
    const hasHeaderSlot = this.querySelector('[slot="header"]') !== null
    const hasExtra = this.querySelector('[slot="extra"]') !== null
    this.shadow.querySelector<HTMLElement>('[part="header"]')!.textContent = hasHeaderSlot
      ? ''
      : this.getAttr('header', '')
    if (hasHeaderSlot) this.setAttribute('has-header-slot', '')
    else this.removeAttribute('has-header-slot')
    if (hasExtra) this.setAttribute('has-extra', '')
    else this.removeAttribute('has-extra')

    // 头 button 状态同步
    const disabled = this.isDisabled()
    if (this.headEl) {
      this.headEl.disabled = disabled
      this.headEl.setAttribute('aria-expanded', String(this.hasAttr('open')))
      this.headEl.setAttribute('aria-disabled', String(disabled))
    }

    // 标题语义：heading-level 1-6 时标题区承担 heading 角色（默认 none 无语义）
    const level = this.getAttr('heading-level', '')
    const heading = this.shadow.querySelector<HTMLElement>('[part="heading"]')
    if (heading) {
      if (/^[1-6]$/.test(level)) {
        heading.setAttribute('role', 'heading')
        heading.setAttribute('aria-level', level)
      } else {
        heading.removeAttribute('role')
        heading.removeAttribute('aria-level')
      }
    }

    // 渲染策略：destroy-on-collapse 收起时卸载默认 slot（force-render 优先）
    this.syncContentSlot()
  }

  /** 渲染策略同步：destroy-on-collapse 且非 force-render 时，收起态移除默认 slot（内容卸载） */
  private syncContentSlot(): void {
    const slot = this.contentSlot
    if (!slot || !this.bodyEl) return
    const destroy = this.hasAttr('destroy-on-collapse') && !this.hasAttr('force-render')
    const open = this.hasAttr('open')
    if (destroy && !open) {
      // 收起即卸载：destroy 模式不保留关闭动画（收起高度由 wrap 决定，内容即刻释放）
      slot.remove()
    } else if (!slot.isConnected) {
      this.bodyEl.appendChild(slot)
    }
  }
}
