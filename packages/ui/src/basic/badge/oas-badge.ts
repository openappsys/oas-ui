import { OASElement } from '@oas-ui/core'

export type BadgeMode = 'count' | 'ribbon'
export type BadgeColor = 'primary' | 'success' | 'warning' | 'danger'
export type BadgePlacement = 'start' | 'end'

const STYLE = `
:host {
  display: inline-block;
  position: relative;
  font-family: inherit;
}
.badge {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(50%, -50%);
  min-width: 16px;
  height: 16px;
  box-sizing: border-box;
  padding: 0 var(--oas-space-1);
  border-radius: 8px;
  background: var(--oas-color-danger);
  color: var(--oas-color-text-on-danger);
  font-size: var(--oas-font-size-xs);
  line-height: 16px;
  text-align: center;
  white-space: nowrap;
}
.badge.dot {
  min-width: 8px;
  width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 50%;
}
.badge[hidden] {
  display: none;
}
/* 缎带：卡片上沿角标，斜角折叠敼�corner 三角 + brightness 折叠阴影） */
.ribbon {
  position: absolute;
  top: var(--oas-space-2);
  z-index: 1;
  box-sizing: border-box;
  padding: 0 var(--oas-space-2);
  height: var(--oas-control-height-xs);
  line-height: var(--oas-control-height-xs);
  font-size: var(--oas-font-size-xs);
  white-space: nowrap;
  /* color 与背景同色：corner 经 currentColor 继承同色后由 brightness 压暗成折叠 */
  color: var(--oas-color-danger);
  background-color: var(--oas-color-danger);
  border-radius: var(--oas-radius-sm);
}
.ribbon-text {
  color: var(--oas-color-text-on-danger);
}
.ribbon.color-primary {
  color: var(--oas-color-primary);
  background-color: var(--oas-color-primary);
}
.ribbon.color-primary .ribbon-text {
  color: var(--oas-color-text-on-primary);
}
.ribbon.color-success {
  color: var(--oas-color-success);
  background-color: var(--oas-color-success);
}
.ribbon.color-success .ribbon-text {
  color: var(--oas-color-text-on-success);
}
.ribbon.color-warning {
  color: var(--oas-color-warning);
  background-color: var(--oas-color-warning);
}
.ribbon.color-warning .ribbon-text {
  color: var(--oas-color-text-on-warning);
}
.ribbon-corner {
  position: absolute;
  top: 100%;
  width: var(--oas-space-2);
  height: var(--oas-space-2);
  color: currentColor;
  border: calc(var(--oas-space-2) / 2) solid;
  transform: scaleY(0.75);
  transform-origin: top;
  filter: brightness(75%);
}
.ribbon.placement-end {
  inset-inline-end: calc(var(--oas-space-2) * -1);
  border-end-end-radius: 0;
}
.ribbon.placement-end .ribbon-corner {
  inset-inline-end: 0;
  border-inline-end-color: transparent;
  border-block-end-color: transparent;
}
.ribbon.placement-start {
  inset-inline-start: calc(var(--oas-space-2) * -1);
  border-end-start-radius: 0;
}
.ribbon.placement-start .ribbon-corner {
  inset-inline-start: 0;
  border-block-end-color: transparent;
  border-inline-start-color: transparent;
}
.ribbon[hidden] {
  display: none;
}
`

export class OASBadge extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'max', 'showZero', 'dot', 'ribbon', 'mode', 'color', 'placement', 'text']
  }

  private badgeEl: HTMLElement | null = null
  private ribbonEl: HTMLElement | null = null
  private ribbonSlotEl: HTMLSlotElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <sup class="badge" part="badge" hidden></sup>
      <div class="ribbon" part="ribbon" hidden>
        <span class="ribbon-text" part="ribbon-text">
          <slot name="ribbon"></slot>
          <span class="ribbon-fallback" part="ribbon-fallback" hidden></span>
        </span>
        <span class="ribbon-corner" part="ribbon-corner" aria-hidden="true"></span>
      </div>
      <slot></slot>
    `
  }

  /** 缓存节点引用（render 与水合路径共用） */
  private bind(): void {
    this.badgeEl = this.shadow.querySelector('.badge')
    this.ribbonEl = this.shadow.querySelector('.ribbon')
    this.ribbonSlotEl = this.shadow.querySelector<HTMLSlotElement>('slot[name="ribbon"]')
    // 缎带命名插槽增删内容（slotchange 异步触发）时刷新显隐与兜底
    this.ribbonSlotEl?.addEventListener('slotchange', () => this.update())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（徽标节点存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.badge')) return false
    this.bind()
    return true
  }

  private syncRibbon(): void {
    const ribbonEl = this.ribbonEl
    const slot = this.ribbonSlotEl
    if (!ribbonEl) return

    const ribbonMode =
      this.hasAttr('ribbon') || (this.getAttr('mode', 'count') as BadgeMode) === 'ribbon'
    const color = this.getAttr('color', 'danger') as BadgeColor
    const placement = this.getAttr('placement', 'end') as BadgePlacement
    const text = this.getAttr('text', '')

    ribbonEl.classList.toggle('color-primary', color === 'primary')
    ribbonEl.classList.toggle('color-success', color === 'success')
    ribbonEl.classList.toggle('color-warning', color === 'warning')
    ribbonEl.classList.toggle(
      'color-danger',
      color !== 'primary' && color !== 'success' && color !== 'warning',
    )
    ribbonEl.classList.toggle('placement-start', placement === 'start')
    ribbonEl.classList.toggle('placement-end', placement !== 'start')

    // text 属性走独立兜底元素（不写 slot 节点——写 slot 兜底会在部分浏览器触发
    // slotchange→update 无限循环卡死主线程）；slot 有 assigned 内容时兜底隐藏
    const fallback = ribbonEl.querySelector<HTMLElement>('.ribbon-fallback')
    if (fallback) {
      fallback.textContent = text
      fallback.hidden = text === '' || (slot?.assignedNodes().length ?? 0) > 0
    }

    const hasAssigned = slot ? slot.assignedNodes().length > 0 : false
    // 空态：未启用缎带或没有任何内容（text/slot 均无）时不显示
    ribbonEl.hidden = !ribbonMode || (text === '' && !hasAssigned)
  }

  protected override update(): void {
    const el = this.badgeEl
    if (el) {
      const raw = this.getAttr('value', '')
      const dot = this.hasAttr('dot')
      const showZero = this.hasAttr('showZero')

      const value = raw === '' ? NaN : Number(raw)
      const hasValue = !Number.isNaN(value)

      el.classList.toggle('dot', dot)

      if (dot) {
        el.textContent = ''
        el.hidden = false
      } else if (!hasValue || (value === 0 && !showZero)) {
        el.hidden = true
      } else {
        const max = this.getAttr('max', '')
        const maxNum = max === '' ? NaN : Number(max)
        const display = !Number.isNaN(maxNum) && value > maxNum ? `${maxNum}+` : String(value)
        el.textContent = display
        el.hidden = false
      }
    }

    this.syncRibbon()
  }
}
