import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  border-block-end: 1px solid var(--oas-inspector-divider-color, var(--oas-color-border));
}
:host([hidden]) {
  display: none;
}
.head {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  min-height: var(--oas-inspector-section-header-height, 36px);
  box-sizing: border-box;
}
.head-text {
  flex: 1;
  min-width: 0;
  font-size: var(--oas-font-size-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--oas-inspector-section-header-fg, var(--oas-color-text-secondary));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.head-text[hidden] {
  display: none;
}
/* 折叠钮：覆盖整行的幽灵按钮（heading 文本 + 箭头） */
.head-btn {
  appearance: none;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  min-height: inherit;
  box-sizing: border-box;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font: inherit;
  text-align: start;
  color: inherit;
}
.head-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
  border-radius: var(--oas-radius-sm);
}
.head-btn .head-text {
  cursor: inherit;
}
.head-btn[hidden] {
  display: none;
}
.arrow {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  color: var(--oas-color-text-secondary);
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
}
:host([data-open]) .arrow {
  transform: rotate(90deg);
}
.extra {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.extra:not([hidden]) ~ .extra-placeholder {
  display: none;
}
/* 展开动画：grid-template-rows 0fr→1fr 纯 CSS 方案，内容 overflow 裁剪（对齐 collapse 经验） */
.body-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--oas-transition-base) var(--oas-ease-out);
}
:host([data-open]) .body-wrap {
  grid-template-rows: 1fr;
}
.body {
  overflow: hidden;
  min-height: 0;
}
@media (prefers-reduced-motion: reduce) {
  .body-wrap,
  .arrow {
    transition: none;
  }
}
`

/** 折叠箭头（原创 SVG，规范 chevron） */
const CHEVRON =
  '<svg class="chevron" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 6 L8 10 L12 6"/></svg>'

/**
 * oas-inspector-section —— 属性面板可折叠分节（自建薄分节，不复用 collapse：
 * API 贴属性面板语义，密度档经 CSS 变量继承容器 data-density）。
 *
 * 属性（kebab-case）：
 * - `heading`：分节标题（折叠钮 aria-label 同源）
 * - `name`：分节名（oas-toggle detail 携带；缺省空串）
 * - `collapsible`：布尔，启用折叠（缺省纯标题不可折叠）
 * - `open`：展开状态（属性即状态——点击切换并反射该属性，宿主可监听 oas-toggle 协调）
 * - `default-open`：初始默认展开（非受控便利：无 open 属性时首帧写入 open）
 *
 * 插槽：默认（分节内容）、`extra`（标题行末端操作区，折叠点击解耦）。
 *
 * 事件：`oas-toggle`（detail `{ name, open }`，bubbles + composed）。
 *
 * a11y：折叠钮 `aria-expanded` + aria-label（heading）；折叠动画 grid rows 过渡
 * （reduced-motion 停用）；RTL：`data-rtl` 钩子。
 */
export class OASInspectorSection extends OASElement {
  static override get observedAttributes(): string[] {
    return ['heading', 'name', 'collapsible', 'open', 'default-open', 'dir']
  }

  private headBtnEl: HTMLButtonElement | null = null
  private headTextEl: HTMLElement | null = null
  private bodyEl: HTMLElement | null = null

  /** default-open 是否已消费：仅首帧写入一次 open（此后 open 是唯一状态源，用户折叠不被回弹） */
  private defaultOpenApplied = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <section class="section" part="section">
        <div class="head" part="section-header">
          <button class="head-btn" part="section-toggle" type="button" hidden aria-expanded="false">
            <span class="arrow" aria-hidden="true">${CHEVRON}</span>
            <span class="head-text" part="section-heading"></span>
          </button>
          <span class="head-text" part="section-heading" hidden></span>
          <div class="extra" part="section-extra" hidden><slot name="extra"></slot></div>
        </div>
        <div class="body-wrap" part="section-body-wrap">
          <div class="body" part="section-body" role="group"><slot></slot></div>
        </div>
      </section>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.headBtnEl = this.shadow.querySelector('[part="section-toggle"]')
    this.headTextEl = this.shadow.querySelector('.head > [part="section-heading"]')
    this.bodyEl = this.shadow.querySelector('[part="section-body"]')
    // 折叠点击：切换 open 属性（反射）+ 派发 oas-toggle
    this.headBtnEl?.addEventListener('click', () => this.toggle())
    // extra 操作区与折叠点击解耦：内部点击不冒泡触达折叠钮
    this.shadow.querySelector('.extra')?.addEventListener('click', (e) => e.stopPropagation())
    for (const s of this.shadow.querySelectorAll('slot')) {
      s.addEventListener('slotchange', () => this.update())
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（section 部件存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="section"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.toggleAttribute('data-rtl', isRtl(this))
    // default-open 非受控便利：仅首帧写入一次（消费即置位，否则用户折叠后会被 update 反复回弹 → 折不动）
    if (!this.defaultOpenApplied && this.hasAttr('default-open') && !this.hasAttr('open')) {
      this.defaultOpenApplied = true
      this.setAttribute('open', '')
    }
    const collapsible = this.hasAttr('collapsible')
    // 非折叠分节恒展开：没有 collapsible 时 open 不是状态源，若按 open 缺席算收起，
    // 0fr 会把分节内容整段裁没（纯标题分节变空壳）。折叠态只对 collapsible 分节生效。
    const open = collapsible ? this.hasAttr('open') : true
    this.toggleAttribute('data-open', open)
    const heading = this.getAttr('heading', '')
    // 折叠钮（collapsible）：heading 文本 + aria；纯标题模式（非 collapsible）：head-text 直接渲染
    if (this.headBtnEl) {
      this.headBtnEl.hidden = !collapsible
      this.headBtnEl.setAttribute('aria-expanded', String(open))
      this.headBtnEl.setAttribute('aria-label', heading)
      const inner = this.headBtnEl.querySelector<HTMLElement>('[part="section-heading"]')
      if (inner) inner.textContent = heading
    }
    if (this.headTextEl) {
      this.headTextEl.textContent = heading
      this.headTextEl.hidden = collapsible || heading === ''
    }
    // extra 空态：无内容不渲染容器
    const extraSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="extra"]')
    const extraWrap = this.shadow.querySelector<HTMLElement>('[part="section-extra"]')
    if (extraWrap && extraSlot) extraWrap.hidden = !this.hasSlotContent(extraSlot)
    // 折叠语义：body role=group + aria-labelledby 指向标题文本位（同 shadow 内 ID 引用有效）
    if (this.bodyEl) {
      if (heading !== '') {
        this.bodyEl.setAttribute('aria-label', heading)
      } else {
        this.bodyEl.removeAttribute('aria-label')
      }
    }
  }

  /** 折叠切换：翻转 open 属性（状态源）+ 派发 oas-toggle（宿主可监听回写实现受控协调） */
  private toggle(): void {
    const next = !this.hasAttr('open')
    if (next) this.setAttribute('open', '')
    else this.removeAttribute('open')
    this.emit('toggle', { name: this.getAttr('name', ''), open: next })
  }

  /** 插槽是否有「真实内容」：注释节点与纯空白文本不算（对齐 app-bar 判据） */
  private hasSlotContent(slot: HTMLSlotElement): boolean {
    const nodes = slot.assignedNodes({ flatten: true })
    return nodes.length > 0 && nodes.some((n) => this.isRealNode(n))
  }

  private isRealNode(node: Node): boolean {
    if (node.nodeType === Node.COMMENT_NODE) return false
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim() !== ''
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      if (el.tagName.includes('-')) return true
      return el.childNodes.length === 0 || [...el.childNodes].some((c) => this.isRealNode(c))
    }
    return true
  }
}
