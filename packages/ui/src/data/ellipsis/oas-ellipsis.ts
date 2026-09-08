import { OASElement } from '@oas-ui/core'
// 复用 oas-tooltip 作为溢出时的全文提示浮层（确保其已注册）
import '../../feedback/tooltip/index.js'

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
/* 手动截断模式（expandable + tail 行内展开链接）：内容经镜像测量截断，
   省略号与展开链接原位行内排布，不再依赖 CSS clamp */
.text.manual {
  display: inline;
  overflow: visible;
}
.text.manual.nowrap {
  white-space: nowrap;
}
/* 展开/收起触发：块级按钮形态（start/middle 方向） */
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
/* 行内链接形态（tail 方向手动截断模式）：与省略号同行尾随 */
.toggle.inline {
  display: inline;
  margin-top: 0;
  margin-inline-start: var(--oas-space-1);
  font-size: inherit;
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
/* 镜像测量节点：off-screen，不参与布局与无障碍树 */
.mirror {
  position: absolute;
  inset-inline-start: -99999px;
  top: 0;
  visibility: hidden;
  max-width: none;
  color: var(--oas-color-text-primary);
  line-height: 1.5;
  font-size: inherit;
  font-family: inherit;
}
.mirror.single {
  white-space: nowrap;
}
.mirror.multi {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}
`

export class OASEllipsis extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'text',
      'rows',
      'tooltip',
      'expandable',
      'direction',
      'expanded',
      'expand-text',
      'collapse-text',
      'tooltip-placement',
    ]
  }

  private rootEl: HTMLElement | null = null
  private textEl: HTMLElement | null = null
  private toggleEl: HTMLButtonElement | null = null
  private mirrorEl: HTMLElement | null = null
  private observer: ResizeObserver | null = null
  private expanded = false
  /** 溢出状态上次派发值（null = 尚未派发，首次同值不派发） */
  private lastOverflow: boolean | null = null
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

    // 受控同步：`expanded` 属性在场 → 以属性为准（宿主可强制展开/收起）；
    // 属性缺席 → 内部状态驱动（非受控），内部切换时反射回属性（双通道一致）
    if (this.hasAttr('expanded') !== this.expanded) {
      this.expanded = this.hasAttr('expanded')
    }

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

  /** 省略方向归一：start / middle / tail（非法值回落 tail） */
  private normalizeDirection(): 'tail' | 'start' | 'middle' {
    const v = this.getAttr('direction', 'tail')
    return v === 'start' || v === 'middle' ? v : 'tail'
  }

  /**
   * 省略形态 + 溢出判定 + 展开触发 + tooltip 挂载（布局相关写入，水合首帧时延迟执行）。
   * expandable + tail 走「手动截断 + 行内展开链接」；其余方向/非 expandable 走 CSS clamp 原路径。
   */
  private syncClampState(text: string): void {
    if (!this.textEl) return
    const rows = this.normalizeRows()
    const direction = this.normalizeDirection()
    const tooltipOn = this.getAttr('tooltip', 'true') !== 'false'
    const expandable = this.hasAttr('expandable')

    if (expandable && direction === 'tail') {
      this.syncManualClamp(text, rows, tooltipOn)
      return
    }

    this.clearManualStyles()
    const clamped = !this.expanded

    // 省略样式由 rows 决定（展开态移除）：先应用形态再测量溢出（line-clamp 参与 scrollHeight）
    this.textEl.classList.toggle('single', clamped && rows === 1)
    this.textEl.classList.toggle('multi', clamped && rows >= 2)
    if (clamped && rows >= 2) {
      this.textEl.style.setProperty('-webkit-line-clamp', String(rows))
    } else {
      this.textEl.style.removeProperty('-webkit-line-clamp')
    }

    // 溢出判定基于全文（此刻 textContent 仍为全文，middle 截断前测量）
    const overflow = this.isOverflow()
    this.emitOverflow(overflow)

    // 省略方向（仅单行生效）：start 头部省略走 CSS 反转、middle 首尾保留中部省略走 JS 截断
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

    // 展开/收起按钮：块级形态（文本下方）；可展开且（溢出或已展开）时可见
    if (this.toggleEl) {
      this.toggleEl.classList.remove('inline')
      const showToggle = expandable && (overflow || this.expanded)
      this.toggleEl.hidden = !showToggle
      const label = this.toggleLabel()
      this.toggleEl.textContent = label
      this.toggleEl.setAttribute('aria-label', label)
    }

    this.reconcileTooltip(inClampMode, tooltipOn, text)
  }

  /**
   * expandable + tail：手动截断 + 行内展开链接（省略号与链接同行尾随）。
   * 先用 CSS clamp 形态探测溢出与容器宽度，溢出则改用镜像二分测量截断，
   * 展开态展示全文 + 行内「收起」链接。
   */
  private syncManualClamp(text: string, rows: number, tooltipOn: boolean): void {
    if (!this.textEl || !this.rootEl) return

    if (!this.expanded) {
      // 探测：CSS clamp 形态测溢出（此时宿主宽度被 max-width 撑到容器宽）
      this.textEl.classList.remove('manual', 'nowrap')
      this.textEl.classList.toggle('single', rows === 1)
      this.textEl.classList.toggle('multi', rows >= 2)
      if (rows >= 2) this.textEl.style.setProperty('-webkit-line-clamp', String(rows))
      else this.textEl.style.removeProperty('-webkit-line-clamp')

      const overflow = this.isOverflow()
      this.emitOverflow(overflow)

      if (!overflow) {
        this.clearRootWidth()
        if (this.toggleEl) this.toggleEl.hidden = true
        this.reconcileTooltip(false, tooltipOn, text)
        return
      }

      // 溢出 → 手动截断：固定容器宽（防 inline-block 收缩反馈），镜像二分求保留字符数
      const width = this.rootEl.clientWidth
      if (width > 0) this.rootEl.style.width = `${width}px`
      this.textEl.classList.remove('single', 'multi')
      this.textEl.style.removeProperty('-webkit-line-clamp')
      this.textEl.classList.add('manual')
      if (rows === 1) this.textEl.classList.add('nowrap')

      const label = this.toggleLabel()
      const keep = this.fitPrefixLength(text, width, rows, label)
      this.textEl.textContent = keep >= text.length ? text : `${text.slice(0, keep)}…`
      this.toggleEl!.classList.add('inline')
      this.toggleEl!.hidden = false
      this.toggleEl!.textContent = label
      this.toggleEl!.setAttribute('aria-label', label)

      // 截短即省略态：挂全文 tooltip（无布局环境测量恒 0 时内容为全文，tooltip 同文无害）
      this.reconcileTooltip(tooltipOn, tooltipOn, text)
      return
    }

    // 展开态：全文 + 行内「收起」链接
    this.textEl.classList.remove('single', 'multi')
    this.textEl.style.removeProperty('-webkit-line-clamp')
    this.textEl.classList.add('manual')
    if (rows === 1) this.textEl.classList.add('nowrap')
    else this.textEl.classList.remove('nowrap')
    this.clearRootWidth()
    this.emitOverflow(false)
    this.textEl.textContent = text
    this.toggleEl!.classList.add('inline')
    this.toggleEl!.hidden = false
    const label = this.toggleLabel()
    this.toggleEl!.textContent = label
    this.toggleEl!.setAttribute('aria-label', label)
    this.reconcileTooltip(false, tooltipOn, text)
  }

  /** 退出手动模式时清理手动形态（root 固定宽、manual 类、按钮 inline 类） */
  private clearManualStyles(): void {
    this.clearRootWidth()
    this.textEl?.classList.remove('manual', 'nowrap')
    this.toggleEl?.classList.remove('inline')
  }

  private clearRootWidth(): void {
    this.rootEl?.style.removeProperty('width')
  }

  /**
   * 镜像二分测量：求「prefix(n) + '…' + 按钮文案」在给定宽度/行数下可容纳的最大 n。
   * 镜像与 .text 同字体同形态（单行 nowrap / 多行 line-clamp），逐次写候选内容读 scroll 尺寸。
   * happy-dom 无布局（全 0）→ 恒可容纳 → 返回全文（安全兜底，与 middle 截断同策略）。
   */
  private fitPrefixLength(full: string, width: number, rows: number, label: string): number {
    const mirror = this.mirror()
    mirror.className = rows >= 2 ? 'mirror multi' : 'mirror single'
    if (rows >= 2) mirror.style.setProperty('-webkit-line-clamp', String(rows))
    else mirror.style.removeProperty('-webkit-line-clamp')
    mirror.style.width = width > 0 ? `${width}px` : ''

    const fits = (n: number): boolean => {
      mirror.textContent = `${full.slice(0, n)}…${label}`
      return rows >= 2
        ? mirror.scrollHeight - mirror.clientHeight <= 1
        : mirror.scrollWidth <= mirror.clientWidth + 1
    }
    let lo = 0
    let hi = full.length
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2)
      if (fits(mid)) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  /** 镜像测量节点（懒建，shadow 内 off-screen） */
  private mirror(): HTMLElement {
    if (!this.mirrorEl || !this.shadow.contains(this.mirrorEl)) {
      const el = document.createElement('div')
      el.className = 'mirror single'
      el.setAttribute('aria-hidden', 'true')
      this.shadow.appendChild(el)
      this.mirrorEl = el
    }
    return this.mirrorEl
  }

  /** 展开/收起文案：属性优先（expand-text / collapse-text），缺省走 i18n */
  private toggleLabel(): string {
    return this.expanded
      ? this.getAttr('collapse-text') || this.t('ellipsis.collapse')
      : this.getAttr('expand-text') || this.t('ellipsis.expand')
  }

  /** 溢出状态变化派发 oas-overflow（detail { overflow }） */
  private emitOverflow(overflow: boolean): void {
    if (this.lastOverflow === overflow) return
    this.lastOverflow = overflow
    this.emit('overflow', { overflow })
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
    return (
      full.slice(0, Math.min(each, full.length)) + '…' + full.slice(Math.max(0, full.length - each))
    )
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
   * `tooltip-placement` 属性透传浮层 placement（默认 top）。
   */
  private reconcileTooltip(clamped: boolean, tooltipOn: boolean, text: string): void {
    const wantTooltip = clamped && tooltipOn
    const tip = this.shadow.querySelector<HTMLElement>('oas-tooltip')
    const placement = this.getAttr('tooltip-placement', 'top')
    if (wantTooltip && !tip) {
      const t = document.createElement('oas-tooltip')
      // CSS clamp 模式撑满容器宽（保证省略测量与展示正确）；手动截断模式随行内流（inline-block）
      t.style.display = this.textEl?.classList.contains('manual') ? 'inline-block' : 'block'
      t.setAttribute('content', text)
      t.setAttribute('placement', placement)
      this.rootEl?.insertBefore(t, this.toggleEl ?? null)
      t.appendChild(this.textEl!)
    } else if (wantTooltip && tip) {
      // 文本 / 位置 / 包裹形态变化时同步
      tip.setAttribute('content', text)
      tip.setAttribute('placement', placement)
      tip.style.display = this.textEl?.classList.contains('manual') ? 'inline-block' : 'block'
    } else if (!wantTooltip && tip) {
      this.rootEl?.insertBefore(this.textEl!, tip)
      tip.remove()
    }
  }

  private handleToggle(): void {
    this.expanded = !this.expanded
    this.emit(this.expanded ? 'expand' : 'collapse', { expanded: this.expanded })
    // 反射回属性：受控宿主可回读/拦截，属性变化驱动 update（幂等）
    if (this.expanded) this.setAttribute('expanded', '')
    else this.removeAttribute('expanded')
    this.update()
  }
}
