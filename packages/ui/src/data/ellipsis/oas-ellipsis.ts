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
/* start 省略（省略头部保留尾部）：direction:rtl 把省略号挪到左侧、unicode-bidi:plaintext 保内容原序
   （长路径/文件名常需保留末尾；纯 CSS 实现，无测量开销） */
.text.start {
  direction: rtl;
  unicode-bidi: plaintext;
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
    return ['text', 'rows', 'tooltip', 'expandable', 'direction']
  }

  private rootEl: HTMLElement | null = null
  private textEl: HTMLElement | null = null
  private toggleEl: HTMLButtonElement | null = null
  private observer: ResizeObserver | null = null
  private expanded = false
  /** 水合首帧的布局写入是否已延迟登记（抑制直至 rAF 校正完成，含 RO 首回调等同期写入） */
  private layoutRafScheduled = false
  private hydratedFirstFrameApplied = false

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="root" part="root">
        <div class="text" part="text"></div>
        <button type="button" class="toggle" part="toggle" hidden></button>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定交互与尺寸监听（render 与水合路径共用） */
  private bind(): void {
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
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（root/text 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.root')) return false
    if (!this.shadow.querySelector('.text')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    if (!this.textEl) return
    const text = this.getAttr('text', '')
    this.textEl.textContent = text

    // DSD 水合首帧：省略态（class/line-clamp/toggle/tooltip）写入延迟到首帧后，
    // 保证快照首帧与 hydrate 后一致、第二帧再按真实布局校正（内容一致，仅测量态补写）。
    // 文本写入保持同步（快照内容一致，无闪动）；纯 CSR / 水合后更新同步执行。
    if (this.wasHydrated() && !this.hydratedFirstFrameApplied) {
      this.scheduleHydratedClamp(text)
      return
    }
    this.syncClampState(text)
  }

  /** 水合首帧：省略态写入统一延迟到 rAF 校正；期间（含 rAF 前其他 update/RO 回调）一律抑制 */
  private scheduleHydratedClamp(text: string): void {
    if (this.layoutRafScheduled) return
    this.layoutRafScheduled = true
    const raf = requestAnimationFrame(() => {
      this.hydratedFirstFrameApplied = true
      this.syncClampState(this.getAttr('text', ''))
    })
    this.onCleanup(() => cancelAnimationFrame(raf))
  }

  /** 省略形态 + 溢出判定 + 展开按钮 + tooltip 挂载（布局相关写入，水合首帧时延迟执行） */
  private syncClampState(text: string): void {
    if (!this.textEl) return
    const rows = this.normalizeRows()
    const direction = this.getAttr('direction', 'tail')

    // 省略样式由 rows 决定（展开态移除）：先应用形态再测量溢出（line-clamp 参与 scrollHeight）
    const clamped = !this.expanded
    this.textEl.classList.toggle('single', clamped && rows === 1)
    this.textEl.classList.toggle('multi', clamped && rows >= 2)
    if (clamped && rows >= 2) {
      this.textEl.style.setProperty('-webkit-line-clamp', String(rows))
    } else {
      this.textEl.style.removeProperty('-webkit-line-clamp')
    }

    // 溢出判定基于全文（此刻 textContent 仍为全文，middle 截断前测量）
    const overflow = this.isOverflow()
    const tooltipOn = this.getAttr('tooltip', 'true') !== 'false'
    const expandable = this.hasAttr('expandable')

    // 省略方向（仅单行生效）：start 头部省略走 CSS 反转、middle 首尾保留中部省略走 JS 截断；
    // 非法/缺省值回落 tail（尾部省略，行为不变）
    const useStart = clamped && rows === 1 && direction === 'start' && overflow
    const useMiddle = clamped && rows === 1 && direction === 'middle' && overflow
    this.textEl.classList.toggle('start', useStart)
    // middle：截断只发生在未展开时（展开态展示全文，无省略号）
    if (useMiddle) {
      this.textEl.textContent = this.expanded ? text : this.truncateMiddle(text)
    }

    // 展开态展示全文（不省略）；否则溢出且（开 tooltip 或可展开）时进入省略态。
    // middle 截断后自身宽度已收窄不再溢出，但内容被截短 → 视为省略态挂全文 tooltip
    const inClampMode = !this.expanded && overflow && (useMiddle || tooltipOn || expandable)

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

  /** 中部省略最小保留边：首尾各至少 2 字符 */
  private static readonly MIDDLE_MIN_SIDE = 2

  /**
   * 中部省略截断：单次测量「可显示宽 / 全文宽」折算可保留字符总数（O(1)，无逐字符重排循环），
   * 对称保留首尾。happy-dom 无布局，测量值恒 0 → 直接返回全文（与无溢出等价，安全兜底）。
   */
  private truncateMiddle(full: string): string {
    if (!this.textEl) return full
    const side = OASEllipsis.MIDDLE_MIN_SIDE
    if (full.length <= side * 2 + 1) return full
    const client = this.textEl.clientWidth
    const scroll = this.textEl.scrollWidth
    if (client <= 0 || scroll <= client) return full
    const keepTotal = Math.max(side * 2 + 1, Math.floor(full.length * (client / scroll)))
    const each = Math.max(side, Math.floor((keepTotal - 1) / 2))
    return full.slice(0, Math.min(each, full.length)) + '…' + full.slice(Math.max(0, full.length - each))
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
