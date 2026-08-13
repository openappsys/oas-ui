import { OASElement } from '@oas-ui/core'
import { iconRegistry } from '@oas-ui/icons'
import { computePosition, type Placement } from '../../overlay/floating/index.js'
import '../menu/index.js' // 副作用：确保 oas-menu 已注册
import type { OASMenu } from '../menu/index.js'
import type { MenuItem } from '../menu/index.js'

/** 浮层与触发元素的间隙（与 computePosition 的 GAP 一致） */
const GAP = 8
/** 箭头尺寸（8px 菱形）与箭头中心到面板圆角边的最短距离 */
const ARROW_SIZE = 8
const ARROW_PAD = 8

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
/* 拆分按钮组合：主按钮（默认 slot）+ 箭头按钮并排；非 split 时容器塌陷、箭头隐藏 */
.split-group {
  display: inline-flex;
  align-items: stretch;
}
:host(:not([split])) .split-group {
  display: contents;
}
:host(:not([split])) .arrow-btn {
  display: none;
}
.arrow-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--oas-color-border);
  border-left: none;
  border-radius: 0 var(--oas-radius-md) var(--oas-radius-md) 0;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  margin-left: -1px; /* 覆盖主按钮右边框，接缝成一条线 */
  padding: 0 var(--oas-space-2);
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out);
}
.arrow-btn:hover {
  background: var(--oas-color-bg-hover);
}
.arrow-btn:active {
  background: var(--oas-color-bg-hover);
}
.arrow-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.arrow-btn svg {
  display: block;
  width: 1em;
  height: 1em;
}
.menu-anchor {
  position: fixed;
  z-index: var(--oas-z-dropdown, 1000);
}
.menu-anchor[hidden] {
  display: none;
}
/* 箭头：8px 菱形旋转 45°，底色与菜单面板同色；按 data-placement 落在面板对应边上，尖端指向触发元素。
   旋转后原 border-top/right/bottom/left 依次对应菱形右上/右下/左下/左上边，
   取「汇于尖端」的两条外露边带边框色，与 oas-menu 的 1px 描边无缝衔接。
   十字轴默认居中（var(--arrow-x/y) 兜底 calc(50% - 4px)）；point-at-center=false 时由 JS
   写内联偏移，面板被视口避让偏移时箭头仍指向触发元素。 */
.arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  box-sizing: border-box;
  background: var(--oas-color-bg);
  transform: rotate(45deg);
  pointer-events: none;
}
/* placement=bottom：面板在触发元素下方 → 箭头悬面板顶边、尖朝上 → 外露边=右上(border-top)+左上(border-left) */
.menu-anchor[data-placement='bottom'] .arrow {
  top: -4px;
  left: var(--arrow-x, calc(50% - 4px));
  border-top: 1px solid var(--oas-color-border);
  border-left: 1px solid var(--oas-color-border);
}
/* placement=top：面板在触发元素上方 → 箭头悬面板底边、尖朝下 → 外露边=右下(border-right)+左下(border-bottom) */
.menu-anchor[data-placement='top'] .arrow {
  bottom: -4px;
  left: var(--arrow-x, calc(50% - 4px));
  border-right: 1px solid var(--oas-color-border);
  border-bottom: 1px solid var(--oas-color-border);
}
/* placement=left：面板在触发元素左侧 → 箭头悬面板右边、尖朝右 → 外露边=右上(border-top)+右下(border-right) */
.menu-anchor[data-placement='left'] .arrow {
  right: -4px;
  top: var(--arrow-y, calc(50% - 4px));
  border-top: 1px solid var(--oas-color-border);
  border-right: 1px solid var(--oas-color-border);
}
/* placement=right：面板在触发元素右侧 → 箭头悬面板左边、尖朝左 → 外露边=左上(border-left)+左下(border-bottom) */
.menu-anchor[data-placement='right'] .arrow {
  left: -4px;
  top: var(--arrow-y, calc(50% - 4px));
  border-left: 1px solid var(--oas-color-border);
  border-bottom: 1px solid var(--oas-color-border);
}
`

export class OASDropdown extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'open',
      'items',
      'value',
      'placement',
      'split',
      'arrow',
      'arrow-point-at-center',
      'auto-adjust-overflow',
    ]
  }

  private itemsList: MenuItem[] = []
  private menuEl: OASMenu | null = null
  private anchorEl: HTMLElement | null = null
  private anchor: Element | null = null
  private arrowBtn: HTMLButtonElement | null = null
  private arrowEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    const chevron = iconRegistry['chevron-down'] ?? ''
    return `
      <style>${STYLE}</style>
      <div class="split-group" part="split-group">
        <slot></slot>
        <button class="arrow-btn" part="split-arrow" type="button" aria-haspopup="menu" aria-expanded="false">
          <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">${chevron}</svg>
        </button>
      </div>
      <div class="menu-anchor" part="menu" hidden>
        <span class="arrow" part="arrow" data-popper-arrow aria-hidden="true"></span>
        <oas-menu tabindex="-1"></oas-menu>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.anchorEl = this.shadow.querySelector('.menu-anchor')
    this.menuEl = this.shadow.querySelector('oas-menu')
    this.anchor = this.querySelector(':scope > *') ?? this
    this.arrowBtn = this.shadow.querySelector<HTMLButtonElement>('.arrow-btn')
    this.arrowEl = this.shadow.querySelector('.arrow')
    this.anchor?.addEventListener('click', (e: Event) => {
      if (this.hasAttr('split')) {
        // 下拉按钮模式：主按钮只派发动作事件，不开菜单；箭头按钮负责开合
        this.emit('action', { originalEvent: e })
      } else {
        this.toggle()
      }
    })
    this.arrowBtn?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation()
      this.toggle()
    })
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') this.removeAttribute('open')
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutside))
    // 内层 oas-menu 的选中事件转发为 dropdown 的 oas-select 并关闭（多级子菜单叶子项同样走这里）
    this.menuEl?.addEventListener('oas-select', (e: Event) => {
      const detail = (e as CustomEvent).detail as { value?: string }
      if (typeof detail?.value !== 'string') return
      this.setAttribute('value', detail.value)
      this.emit('select', { value: detail.value })
      this.removeAttribute('open')
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（menu-anchor 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.menu-anchor')) return false
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

  protected override update(): void {
    this.parseItems()
    const open = this.hasAttr('open')
    if (!this.menuEl || !this.anchorEl) return
    // 拆分箭头按钮的可访问性：haspopup=menu + expanded 随 open 同步 + locale 可访问名称
    if (this.arrowBtn) {
      this.arrowBtn.setAttribute('aria-expanded', String(open))
      this.arrowBtn.setAttribute('aria-label', this.t('dropdown.openMenu'))
    }
    // 箭头显隐（arrow 默认显示，arrow="false" 隐藏）；骨架保留保证 DSD 快照/水合结构一致
    if (this.arrowEl) {
      this.arrowEl.toggleAttribute('hidden', this.getAttr('arrow', 'true') === 'false')
    }
    if (open) {
      this.menuEl.setAttribute('items', JSON.stringify(this.itemsList))
      this.menuEl.setAttribute('value', this.getAttr('value', ''))
      this.anchorEl.hidden = false
      document.addEventListener('click', this.handleOutside)
      this.position()
    } else {
      this.anchorEl.hidden = true
      document.removeEventListener('click', this.handleOutside)
      // 收起内层菜单残留的级联展开态，避免重开时子菜单直接可见；
      // SSR/Node 渲染环境无 MouseEvent，跳过（SSR 快照本就是关闭态）
      if (typeof MouseEvent !== 'undefined') {
        this.menuEl.shadowRoot
          ?.querySelector('.menu')
          ?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
      }
    }
  }

  /**
   * 面板定位：默认 computePosition（空间不足沿主轴翻转 + 视口边缘避让）；
   * auto-adjust-overflow=false 时严格按请求 placement 计算，不翻转不避让（面板可越出视口，
   * autoAdjustOverflow 同语义）。data-placement 供箭头 4 向定位 CSS 消费。
   */
  private position(): void {
    if (!this.anchorEl || !this.anchor) return
    const anchorRect = this.anchor.getBoundingClientRect()
    const panelRect = this.anchorEl.getBoundingClientRect()
    const placement = this.getAttr('placement', 'bottom') as Placement
    if (this.getAttr('auto-adjust-overflow', 'true') === 'false') {
      const anchorCenterX = anchorRect.left + anchorRect.width / 2
      const anchorCenterY = anchorRect.top + anchorRect.height / 2
      const raw: Record<Placement, { top: number; left: number }> = {
        top: {
          top: anchorRect.top - panelRect.height - GAP,
          left: anchorCenterX - panelRect.width / 2,
        },
        bottom: { top: anchorRect.bottom + GAP, left: anchorCenterX - panelRect.width / 2 },
        left: {
          left: anchorRect.left - panelRect.width - GAP,
          top: anchorCenterY - panelRect.height / 2,
        },
        right: { left: anchorRect.right + GAP, top: anchorCenterY - panelRect.height / 2 },
      }
      const p = raw[placement]
      this.anchorEl.style.top = `${p.top}px`
      this.anchorEl.style.left = `${p.left}px`
      this.anchorEl.setAttribute('data-placement', placement)
    } else {
      const {
        top,
        left,
        placement: actual,
      } = computePosition(anchorRect, panelRect, placement, {
        width: window.innerWidth,
        height: window.innerHeight,
      })
      this.anchorEl.style.top = `${top}px`
      this.anchorEl.style.left = `${left}px`
      this.anchorEl.setAttribute('data-placement', actual)
    }
    this.positionArrow()
  }

  /**
   * 箭头定位：arrow-point-at-center=true 时箭头精确指向锚点中心（投影到面板边 + 边缘夹取，箭头尖端不越出面板圆角）；
   * 面板被视口避让偏移后箭头仍指向触发元素。默认（无该属性）箭头保持面板居中（CSS calc）。
   */
  private positionArrow(): void {
    if (!this.arrowEl || !this.anchorEl || !this.anchor) return
    const show = this.getAttr('arrow', 'true') !== 'false'
    // 默认箭头面板居中；arrow-point-at-center 时箭头精确指向锚点中心（与 tooltip/popover 及 pointAtCenter 语义一致）
    if (!show || !this.hasAttr('arrow-point-at-center')) {
      this.arrowEl.style.removeProperty('--arrow-x')
      this.arrowEl.style.removeProperty('--arrow-y')
      return
    }
    const anchorRect = this.anchor.getBoundingClientRect()
    const panelRect = this.anchorEl.getBoundingClientRect()
    const placement = this.anchorEl.getAttribute('data-placement')
    const clamp = (v: number, max: number): number => Math.max(ARROW_PAD, Math.min(v, max))
    if (placement === 'top' || placement === 'bottom') {
      const center = anchorRect.left + anchorRect.width / 2
      const x = clamp(
        center - panelRect.left - ARROW_SIZE / 2,
        panelRect.width - ARROW_PAD - ARROW_SIZE,
      )
      this.arrowEl.style.setProperty('--arrow-x', `${x}px`)
      this.arrowEl.style.removeProperty('--arrow-y')
    } else {
      const center = anchorRect.top + anchorRect.height / 2
      const y = clamp(
        center - panelRect.top - ARROW_SIZE / 2,
        panelRect.height - ARROW_PAD - ARROW_SIZE,
      )
      this.arrowEl.style.setProperty('--arrow-y', `${y}px`)
      this.arrowEl.style.removeProperty('--arrow-x')
    }
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter((i): i is MenuItem => i && typeof i.value === 'string')
        : []
    } catch {
      this.itemsList = []
    }
  }
}
