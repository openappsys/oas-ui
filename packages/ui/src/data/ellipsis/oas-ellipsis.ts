import { OASElement } from '@oas-ui/core'
// 复用 oas-tooltip 作为溢出时的全文提示浮层（确保其已注册）
import '../../floating/tooltip/index.js'

const STYLE = `
:host {
  display: inline-block;
  max-width: 100%;
  font-family: inherit;
}
.root {
  display: block;
  max-width: 100%;
}
.text {
  display: block;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  color: var(--oas-color-text-primary);
  line-height: 1.5;
}
/* 单行省略 */
.text.single {
  white-space: nowrap;
  text-overflow: ellipsis;
}
/* 多行省略（line-clamp） */
.text.multi {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}
.toggle {
  display: block;
  margin-top: var(--oas-space-1);
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-primary);
  cursor: pointer;
  font-family: inherit;
  line-height: inherit;
}
.toggle:hover {
  color: var(--oas-color-primary-hover);
}
.toggle:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
  border-radius: var(--oas-radius-sm);
}
.toggle[hidden] {
  display: none;
}
`

export class OASEllipsis extends OASElement {
  static override get observedAttributes(): string[] {
    return ['text', 'rows', 'tooltip', 'expandable']
  }

  private rootEl: HTMLElement | null = null
  private textEl: HTMLElement | null = null
  private toggleEl: HTMLButtonElement | null = null
  private observer: ResizeObserver | null = null
  private expanded = false

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="root" part="root">
        <div class="text" part="text"></div>
        <button type="button" class="toggle" part="toggle" hidden></button>
      </div>
    `
    this.rootEl = this.shadow.querySelector<HTMLElement>('.root')
    this.textEl = this.shadow.querySelector<HTMLElement>('.text')
    this.toggleEl = this.shadow.querySelector<HTMLButtonElement>('.toggle')
    this.toggleEl?.addEventListener('click', () => this.handleToggle())

    // 尺寸变化（容器宽度改变）时重测溢出
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.update())
      this.observer.observe(this)
      this.onCleanup(() => this.observer?.disconnect())
    }
    this.update()
  }

  protected override update(): void {
    if (!this.textEl) return
    const text = this.getAttr('text', '')
    const rows = this.normalizeRows()
    this.textEl.textContent = text

    // 省略样式由 rows 决定（展开态移除）：先应用形态再测量溢出（line-clamp 参与 scrollHeight）
    const clamped = !this.expanded
    this.textEl.classList.toggle('single', clamped && rows === 1)
    this.textEl.classList.toggle('multi', clamped && rows >= 2)
    if (clamped && rows >= 2) {
      this.textEl.style.setProperty('-webkit-line-clamp', String(rows))
    } else {
      this.textEl.style.removeProperty('-webkit-line-clamp')
    }

    const overflow = this.isOverflow()
    const tooltipOn = this.getAttr('tooltip', 'true') !== 'false'
    const expandable = this.hasAttr('expandable')
    // 展开态展示全文（不省略）；否则溢出且（开 tooltip 或可展开）时进入省略态
    const inClampMode = !this.expanded && overflow && (tooltipOn || expandable)

    // 展开/收起按钮：可展开且（溢出或已展开）时可见
    if (this.toggleEl) {
      const showToggle = expandable && (overflow || this.expanded)
      this.toggleEl.hidden = !showToggle
      const label = this.expanded ? this.t('ellipsis.collapse') : this.t('ellipsis.expand')
      this.toggleEl.textContent = label
      this.toggleEl.setAttribute('aria-label', label)
    }

    this.reconcileTooltip(inClampMode, tooltipOn, text)
  }

  /** 行数归一：至少 1 行；非法值回退 1 */
  private normalizeRows(): number {
    const n = Number(this.getAttr('rows', '1'))
    return Math.max(1, Math.round(Number.isFinite(n) ? n : 1))
  }

  /** 溢出判定：单行 scrollWidth > clientWidth，多行 scrollHeight > clientHeight */
  private isOverflow(): boolean {
    if (!this.textEl) return false
    return this.normalizeRows() >= 2
      ? this.textEl.scrollHeight > this.textEl.clientHeight
      : this.textEl.scrollWidth > this.textEl.clientWidth
  }

  /**
   * 按需挂/解 tooltip（增量 reconcile，幂等）：
   * 仅溢出省略态挂 <oas-tooltip>，无溢出/展开/关闭 tooltip 时纯文本——零孤儿浮层。
   */
  private reconcileTooltip(clamped: boolean, tooltipOn: boolean, text: string): void {
    const wantTooltip = clamped && tooltipOn
    const tip = this.shadow.querySelector<HTMLElement>('oas-tooltip')
    if (wantTooltip && !tip) {
      const t = document.createElement('oas-tooltip')
      t.style.display = 'block' // 撑满容器宽度，保证省略测量与展示正确
      t.setAttribute('content', text)
      this.rootEl?.insertBefore(t, this.toggleEl ?? null)
      t.appendChild(this.textEl!)
    } else if (wantTooltip && tip) {
      // 文本变化时同步全文内容
      tip.setAttribute('content', text)
    } else if (!wantTooltip && tip) {
      this.rootEl?.insertBefore(this.textEl!, tip)
      tip.remove()
    }
  }

  private handleToggle(): void {
    this.expanded = !this.expanded
    this.emit(this.expanded ? 'expand' : 'collapse', { expanded: this.expanded })
    this.update()
  }
}
