import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.panel {
  position: fixed;
  z-index: var(--oas-z-dropdown, 1000);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: var(--oas-space-4);
  min-width: 200px;
  color: var(--oas-color-text-primary);
  outline: none;
}
.panel[aria-hidden='true'] {
  display: none;
}
.title {
  font-weight: 600;
  font-size: var(--oas-font-size-md);
  margin-bottom: var(--oas-space-2);
}
.body {
  font-size: var(--oas-font-size-md);
  line-height: 1.6;
}
`

// 模块级浮层栈：所有打开中的 popover 按打开先后排序（后开者在上），
// 共享一个 document keydown 处理器——一次 Esc 只关闭最顶层（嵌套时即最内层），
// 实现「嵌套下 Esc 关闭层级」。栈空时自动移除监听，无孤儿。
const openLayers: OASPopover[] = []

function registerLayer(p: OASPopover): void {
  if (openLayers.includes(p)) return
  openLayers.push(p)
  if (openLayers.length === 1) document.addEventListener('keydown', onDocumentKey)
}

function unregisterLayer(p: OASPopover): void {
  const i = openLayers.indexOf(p)
  if (i === -1) return
  openLayers.splice(i, 1)
  if (openLayers.length === 0) document.removeEventListener('keydown', onDocumentKey)
}

function onDocumentKey(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return
  const top = openLayers[openLayers.length - 1]
  if (!top) return
  top.removeAttribute('open')
  top.restoreFocus()
}

export class OASPopover extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'open',
      'title',
      'content',
      'placement',
      'virtual',
      'virtual-x',
      'virtual-y',
      'virtual-anchor',
      'focus-on-open',
    ]
  }

  private panel: HTMLElement | null = null
  private anchor: Element | null = null
  /** 上一次 update() 的 open 状态，用于区分「打开瞬间」与「已打开后的属性微调」 */
  private wasOpen = false
  /** 上次 open 状态（null = 未初始化，首帧不派发事件，同 tooltip） */
  private prevOpen: boolean | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
      <div class="panel" part="panel" role="dialog" aria-hidden="true">
        <div class="title" part="title" id="pop-title"></div>
        <div class="body" part="body"><div class="content" part="content"></div><slot name="content"></slot></div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定点击/外部点击 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.panel = this.shadow.querySelector('.panel')
    this.anchor = this.querySelector(':scope > *') ?? this
    this.anchor?.addEventListener('click', () => {
      // virtual 模式无真实锚点，显隐完全由宿主通过 open/坐标控制
      if (this.hasAttr('virtual')) return
      this.toggle()
    })
    this.onCleanup(() => unregisterLayer(this))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutside))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（面板骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.panel')) return false
    this.bind()
    return true
  }

  private toggle(): void {
    if (this.hasAttr('open')) this.removeAttribute('open')
    else this.setAttribute('open', '')
  }

  private handleOutside = (e: MouseEvent): void => {
    if (!this.hasAttr('open')) return
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.removeAttribute('open')
    }
  }

  /**
   * Esc 关闭后焦点还原到触发元素（公开：模块级 Esc 处理器与宿主均可调用）。
   * virtual 模式无真实锚点，跳过（宿主自行管理焦点）。
   */
  restoreFocus(): void {
    if (this.hasAttr('virtual')) return
    ;(this.anchor as HTMLElement | null)?.focus()
  }

  /**
   * 虚拟锚点矩形（同 tooltip 的 virtual 语义）：
   * virtual-x / virtual-y 视口坐标 > virtual-anchor 元素选择器 > 无锚点（不定位）。
   */
  private virtualRect(): DOMRect | null {
    const x = parseFloat(this.getAttr('virtual-x'))
    const y = parseFloat(this.getAttr('virtual-y'))
    if (Number.isFinite(x) && Number.isFinite(y)) {
      // 0 尺寸点位：按坐标定位（视口坐标）
      return { left: x, top: y, right: x, bottom: y, width: 0, height: 0 } as DOMRect
    }
    const sel = this.getAttr('virtual-anchor')
    if (sel) {
      const el = document.querySelector(sel)
      if (el) return el.getBoundingClientRect()
    }
    return null
  }

  private position(): void {
    if (!this.panel) return
    const anchorRect = this.hasAttr('virtual')
      ? this.virtualRect()
      : this.anchor?.getBoundingClientRect()
    if (!anchorRect) return
    const panelRect = this.panel.getBoundingClientRect()
    const { top, left, placement } = computePosition(
      anchorRect,
      panelRect,
      this.getAttr('placement', 'top') as Placement,
      { width: window.innerWidth, height: window.innerHeight },
    )
    this.panel.style.top = `${top}px`
    this.panel.style.left = `${left}px`
    this.panel.setAttribute('data-placement', placement)
  }

  /**
   * 打开时把焦点移入面板内容（键盘可达）：
   * 优先面板内（shadow + 命名插槽 light DOM）第一个可聚焦元素；
   * 无可聚焦元素时让面板自身可编程聚焦（tabindex=-1，不进 Tab 序）。
   */
  private focusPanel(): void {
    if (!this.panel) return
    const sel = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const inShadow = this.panel.querySelector<HTMLElement>(sel)
    if (inShadow) {
      inShadow.focus()
      return
    }
    const slot = this.panel.querySelector<HTMLSlotElement>('slot[name="content"]')
    const nodes = slot ? slot.assignedNodes({ flatten: true }) : []
    for (const n of nodes) {
      if (!(n instanceof HTMLElement)) continue
      const f = n.matches(sel) ? n : n.querySelector<HTMLElement>(sel)
      if (f) {
        f.focus()
        return
      }
    }
    this.panel.setAttribute('tabindex', '-1')
    this.panel.focus()
  }

  /**
   * 父层关闭时级联关闭嵌套子浮层（popover / tooltip / hover-card / dropdown / popconfirm），
   * 保证「父关闭时子一并关」——子浮层在父的 light DOM 内，父面板隐藏不会自动带走它。
   */
  private closeNested(): void {
    this.querySelectorAll<HTMLElement>(
      'oas-popover, oas-tooltip, oas-hover-card, oas-dropdown, oas-popconfirm',
    ).forEach((el) => el.removeAttribute('open'))
  }

  protected override update(): void {
    if (!this.panel) return
    const open = this.hasAttr('open')
    this.panel.setAttribute('aria-hidden', String(!open))
    const titleEl = this.shadow.querySelector<HTMLElement>('[part="title"]')!
    const title = this.getAttr('title', '')
    titleEl.textContent = title
    if (title) this.panel.setAttribute('aria-labelledby', 'pop-title')
    else this.panel.removeAttribute('aria-labelledby')
    this.shadow.querySelector<HTMLElement>('[part="content"]')!.textContent = this.getAttr(
      'content',
      '',
    )
    // open 状态迁移 → oas-open-change（受控 setAttribute 与点击触发都会走到这里，同 tooltip）
    if (this.prevOpen !== null && this.prevOpen !== open) {
      this.emit('open-change', { open })
    }
    this.prevOpen = open
    if (open) {
      if (!this.wasOpen) {
        registerLayer(this)
        if (this.hasAttr('focus-on-open')) this.focusPanel()
      }
      // virtual 模式下生命周期由宿主控制，不注册外部点击关闭
      if (!this.hasAttr('virtual')) document.addEventListener('click', this.handleOutside)
      else document.removeEventListener('click', this.handleOutside)
      this.position()
    } else {
      if (this.wasOpen) this.closeNested()
      unregisterLayer(this)
      document.removeEventListener('click', this.handleOutside)
    }
    this.wasOpen = open
  }
}
