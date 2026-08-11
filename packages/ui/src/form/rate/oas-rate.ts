import { OASElement } from '@oas-ui/core'

const STAR = `
<svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" focusable="false">
  <path d="M8 2.4 L9.9 6.2 L14 6.8 L11 9.7 L11.6 13.8 L8 12 L4.4 13.8 L5 9.7 L2 6.8 L6.1 6.2 Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.slider {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
}
.star {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  color: var(--oas-color-border);
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
.star svg {
  width: 20px;
  height: 20px;
}
/* 半选：覆盖层叠加在基础星上，clip-path 垂直分割只保留左半（激活色），
   右半透出基础星的未激活色 → 左黄右灰，替代旧「整星 opacity 淡化」实现 */
.star .half-fill {
  position: absolute;
  inset: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  clip-path: inset(0 50% 0 0);
  color: var(--oas-color-warning);
  pointer-events: none;
}
.star:hover {
  transform: scale(1.1);
}
.star.active {
  color: var(--oas-color-warning);
}
.star:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
  border-radius: 2px;
}
:host([disabled]) .star {
  cursor: not-allowed;
  opacity: 0.7;
}
`

export class OASRate extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'max', 'disabled', 'allow-half', 'allow-clear', 'icon']
  }

  private slider: HTMLElement | null = null
  private iconSlot: HTMLSlotElement | null = null
  private starEls: HTMLElement[] = []

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <span class="slider" part="slider" role="slider" tabindex="0" aria-valuemin="0">
        <slot name="icon" style="display:none" aria-hidden="true"></slot>
      </span>
    `
  }

  /** 缓存节点引用 + 绑定键盘/图标 slot 事件 + 接管快照已有星星（render 与水合路径共用） */
  private bind(): void {
    this.slider = this.shadow.querySelector('.slider')
    this.iconSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="icon"]')
    // 水合接管：SSR 快照已含星形（update 在 SSR 端渲染过），采纳并补绑点击，避免 ensureStars 重复追加
    if (this.slider) {
      const existing = [...this.slider.querySelectorAll<HTMLElement>(':scope > .star')]
      existing.forEach((star, idx) => {
        star.addEventListener('click', () => this.onStarClick(idx + 1))
        this.starEls.push(star)
      })
    }
    this.slider?.addEventListener('keydown', (e: KeyboardEvent) => {
      const max = this.maxValue()
      let value = this.currentValue()
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') value = Math.min(value + 1, max)
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') value = Math.max(value - 1, 0)
      else if (e.key === 'Home') value = 0
      else if (e.key === 'End') value = max
      else return
      e.preventDefault()
      this.setValue(value)
    })
    // 图标 slot 内容变化时重绘每颗星的图标
    this.iconSlot?.addEventListener('slotchange', () => this.applyIcons())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（slider 容器与图标 slot 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.slider')) return false
    if (!this.shadow.querySelector('slot[name="icon"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    if (!this.slider) return
    const max = this.maxValue()
    const value = this.currentValue()

    this.ensureStars(max)
    this.applyIcons()

    this.syncStars()
    this.slider.setAttribute('aria-valuemax', String(max))
    this.slider.setAttribute('aria-valuenow', String(value))
    this.slider.setAttribute('aria-label', this.t('rate.rate'))
  }

  /** 星数变化时增量增删星星；click 只绑定一次 */
  private ensureStars(max: number): void {
    if (!this.slider) return
    while (this.starEls.length < max) {
      const idx = this.starEls.length + 1
      const star = document.createElement('span')
      star.className = 'star'
      star.setAttribute('part', 'star')
      star.tabIndex = -1
      star.addEventListener('click', () => this.onStarClick(idx))
      this.slider.appendChild(star)
      this.starEls.push(star)
    }
    while (this.starEls.length > max) {
      const star = this.starEls.pop()
      star?.remove()
    }
  }

  private onStarClick(idx: number): void {
    if (this.hasAttr('disabled')) return
    // allow-clear（默认 true）：点击当前已选中的同一颗星清空为 0
    if (this.allowClear() && this.isCurrentStar(idx)) {
      this.setValue(0)
    } else {
      this.setValue(idx)
    }
  }

  /** 点击清空是否开启：默认 true，allow-clear="false" 关闭 */
  private allowClear(): boolean {
    return this.getAttr('allow-clear', 'true') !== 'false'
  }

  /** 当前分值所在的那颗星（半值时取高半颗星） */
  private isCurrentStar(idx: number): boolean {
    const value = this.currentValue()
    return value % 1 === 0 ? value === idx : Math.ceil(value) === idx
  }

  /** 逐星应用自定义图标：icon 属性 > slot[name=icon] > 默认星形 */
  private applyIcons(): void {
    this.starEls.forEach((star) => {
      const attrIcon = this.getAttr('icon')
      if (attrIcon) {
        star.innerHTML = attrIcon
        return
      }
      const nodes = this.iconSlot ? this.iconSlot.assignedNodes() : []
      if (nodes.length) {
        star.innerHTML = ''
        const frag = document.createDocumentFragment()
        for (const node of nodes) frag.appendChild(node.cloneNode(true))
        star.appendChild(frag)
        return
      }
      star.innerHTML = STAR
    })
  }

  private syncStars(): void {
    const value = this.currentValue()
    this.starEls.forEach((star, idx) => {
      star.classList.toggle('active', idx < Math.floor(value))
      if (this.hasAttr('allow-half') && idx === Math.floor(value) && value % 1 !== 0) {
        star.classList.add('half')
        this.applyHalfFill(star)
      } else {
        star.classList.remove('half')
        this.removeHalfFill(star)
      }
    })
  }

  /** 半星覆盖层：克隆当前星图标，叠加 clip-path 后只露出左半（激活色） */
  private applyHalfFill(star: HTMLElement): void {
    if (star.querySelector('.half-fill')) return
    const fill = document.createElement('span')
    fill.className = 'half-fill'
    fill.setAttribute('aria-hidden', 'true')
    // applyIcons 已先行写入基础图标，此处克隆当前内容即可（SVG/字符/SVG 标记通用）
    fill.innerHTML = star.innerHTML
    star.appendChild(fill)
  }

  private removeHalfFill(star: HTMLElement): void {
    star.querySelector('.half-fill')?.remove()
  }

  private currentValue(): number {
    return Number(this.getAttr('value', '0')) || 0
  }

  private maxValue(): number {
    return Number(this.getAttr('max', '5')) || 5
  }

  private setValue(v: number): void {
    // 值无变化不派发（如 allow-clear=false 时点击已选中的星为 no-op）
    if (this.currentValue() === v) return
    this.setAttribute('value', String(v))
    this.emit('change', { value: v })
  }
}
