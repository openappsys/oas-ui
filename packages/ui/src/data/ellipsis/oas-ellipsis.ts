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
/* 点文本展开形态（expand-trigger="click"）：省略态文本本体可点击 */
.text.clickable {
  cursor: pointer;
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
      'lines',
      'suffix',
      'tooltip',
      'expandable',
      'expand-trigger',
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
  /** 当前溢出状态（点击展开判定与 aria 同步共用） */
  private overflow = false
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
    // 点文本展开（expand-trigger="click"）：文本本体点击 / 键盘触发，监听常驻、按模式判定
    this.textEl?.addEventListener('click', () => this.handleTextActivate())
    this.textEl?.addEventListener('keydown', (e) => this.handleTextKeydown(e as KeyboardEvent))

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
   * expandable + tail 走「手动截断 + 行内展开链接」（expand-trigger="click" 时为无按钮形态）；
   * 其余走 CSS clamp 路径，middle/start 多行与 tail+suffix 走镜像测量截断。
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

    // 溢出判定基于全文（此刻 textContent 仍为全文，JS 截断前测量）
    const overflow = this.isOverflow()
    this.emitOverflow(overflow)

    // 省略方向：start 单行走 CSS 反转；middle 单行走 O(1) 折算；middle/start 多行走镜像截断；
    // tail + suffix 任意行数走镜像截断（后缀保留）。仅在省略态且溢出时截断。
    const suffix = this.activeSuffix(direction)
    let jsTruncated = false
    const useStart = clamped && rows === 1 && direction === 'start' && overflow
    const useMiddle = clamped && rows === 1 && direction === 'middle' && overflow
    const useMiddleMulti = clamped && rows >= 2 && direction === 'middle' && overflow
    const useStartMulti = clamped && rows >= 2 && direction === 'start' && overflow
    const useSuffix = clamped && overflow && suffix !== ''
    this.textEl.classList.toggle('start', useStart)
    if (useMiddle) {
      this.textEl.textContent = this.truncateMiddle(text)
      jsTruncated = true
    } else if (useMiddleMulti) {
      this.textEl.textContent = this.truncateMiddleMulti(text, rows)
      jsTruncated = true
    } else if (useStartMulti) {
      this.textEl.textContent = this.truncateStartMulti(text, rows)
      jsTruncated = true
    } else if (useSuffix) {
      this.textEl.textContent = this.truncateTailSuffix(text, rows, suffix)
      jsTruncated = true
    }

    // 展开态展示全文（不省略）；否则溢出且（JS 截断 / 开 tooltip / 可展开）时进入省略态。
    // JS 截断后自身宽度已收窄不再溢出，但内容被截短 → 视为省略态挂全文 tooltip
    const inClampMode = !this.expanded && overflow && (jsTruncated || tooltipOn || expandable)

    // 展开/收起按钮：块级形态（文本下方）；可展开且（溢出或已展开）时可见（click 模式隐藏）
    if (this.toggleEl) {
      this.toggleEl.classList.remove('inline')
      const showToggle = expandable && !this.isClickMode() && (overflow || this.expanded)
      this.toggleEl.hidden = !showToggle
      const label = this.toggleLabel()
      this.toggleEl.textContent = label
      this.toggleEl.setAttribute('aria-label', label)
    }

    this.syncClickToExpand()
    this.reconcileTooltip(inClampMode, tooltipOn, text)
  }

  /**
   * expandable + tail：手动截断 + 行内展开链接（省略号与链接同行尾随）。
   * 先用 CSS clamp 形态探测溢出与容器宽度，溢出则改用镜像二分测量截断，
   * 展开态展示全文 + 行内「收起」链接。
   * suffix 生效时后缀紧贴省略号预留宽度；expand-trigger="click" 时为无按钮形态（点文本展开）。
   */
  private syncManualClamp(text: string, rows: number, tooltipOn: boolean): void {
    if (!this.textEl || !this.rootEl) return
    const clickMode = this.isClickMode()

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
        this.syncClickToExpand()
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

      const suffix = this.activeSuffix('tail')
      const label = clickMode ? '' : this.toggleLabel()
      const keep = this.fitPrefixLength(text, width, rows, `${suffix}${label}`)
      this.textEl.textContent = keep >= text.length ? text : `${text.slice(0, keep)}…${suffix}`
      if (clickMode) {
        this.toggleEl!.classList.remove('inline')
        this.toggleEl!.hidden = true
      } else {
        this.toggleEl!.classList.add('inline')
        this.toggleEl!.hidden = false
        this.toggleEl!.textContent = label
        this.toggleEl!.setAttribute('aria-label', label)
      }
      this.syncClickToExpand()

      // 截短即省略态：挂全文 tooltip（无布局环境测量恒 0 时内容为全文，tooltip 同文无害）
      this.reconcileTooltip(tooltipOn, tooltipOn, text)
      return
    }

    // 展开态：全文 + 行内「收起」链接（click 模式无按钮，再点文本收起）
    this.textEl.classList.remove('single', 'multi')
    this.textEl.style.removeProperty('-webkit-line-clamp')
    this.textEl.classList.add('manual')
    if (rows === 1) this.textEl.classList.add('nowrap')
    else this.textEl.classList.remove('nowrap')
    this.clearRootWidth()
    this.emitOverflow(false)
    this.textEl.textContent = text
    if (clickMode) {
      this.toggleEl!.classList.remove('inline')
      this.toggleEl!.hidden = true
    } else {
      this.toggleEl!.classList.add('inline')
      this.toggleEl!.hidden = false
      const label = this.toggleLabel()
      this.toggleEl!.textContent = label
      this.toggleEl!.setAttribute('aria-label', label)
    }
    this.syncClickToExpand()
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
   * 镜像二分测量：求「prefix(n) + '…' + reserve」在给定宽度/行数下可容纳的最大 n。
   * 镜像与 .text 同字体同形态（单行 nowrap / 多行 line-clamp），逐次写候选内容读 scroll 尺寸。
   * reserve 为省略号后的尾随预留（suffix 后缀 + 展开链接文案），happy-dom 无布局（全 0）→ 恒可容纳
   * → 返回全文（安全兜底，与 middle 截断同策略）。
   */
  private fitPrefixLength(full: string, width: number, rows: number, reserve: string): number {
    const mirror = this.mirror()
    mirror.className = rows >= 2 ? 'mirror multi' : 'mirror single'
    if (rows >= 2) mirror.style.setProperty('-webkit-line-clamp', String(rows))
    else mirror.style.removeProperty('-webkit-line-clamp')
    mirror.style.width = width > 0 ? `${width}px` : ''

    const fits = (n: number): boolean => {
      mirror.textContent = `${full.slice(0, n)}…${reserve}`
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

  /** 溢出状态变化派发 oas-overflow（detail { overflow }），同步内部溢出标记 */
  private emitOverflow(overflow: boolean): void {
    this.overflow = overflow
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

  /**
   * 镜像二分：求最大 n（0..hi）使 content(n) 在指定形态/宽度/行数下可容纳。
   * 镜像与 .text 同字体同形态（single=单行 nowrap / multi=line-clamp 多行），逐次写候选内容读 scroll 尺寸。
   * happy-dom 无布局（scroll 尺寸全 0）→ 恒可容纳 → 返回 hi（调用方据此判定「全显等价」走兜底）。
   */
  private fitMirrorLength(
    form: 'single' | 'multi',
    rows: number,
    width: number,
    hi: number,
    content: (n: number) => string,
  ): number {
    const mirror = this.mirror()
    mirror.className = `mirror ${form}`
    if (form === 'multi') mirror.style.setProperty('-webkit-line-clamp', String(rows))
    else mirror.style.removeProperty('-webkit-line-clamp')
    mirror.style.width = width > 0 ? `${width}px` : ''
    const fits = (n: number): boolean => {
      mirror.textContent = content(n)
      return form === 'multi'
        ? mirror.scrollHeight - mirror.clientHeight <= 1
        : mirror.scrollWidth <= mirror.clientWidth + 1
    }
    let lo = 0
    let hiBound = hi
    while (lo < hiBound) {
      const mid = Math.ceil((lo + hiBound) / 2)
      if (fits(mid)) lo = mid
      else hiBound = mid - 1
    }
    return lo
  }

  /**
   * tail + suffix 截断：正文头部按宽度/行数保留，省略号后紧跟 suffix（如 `报告….pdf`）。
   * 正文取「去掉末尾 suffix 的部分」（suffix 应出现在文本末尾）；测量不可用（宽 0 或恒可容纳）
   * → 返回全文（安全兜底，与 middle 截断同策略）。
   */
  private truncateTailSuffix(full: string, rows: number, suffix: string): string {
    const body = suffix !== '' && full.endsWith(suffix) ? full.slice(0, -suffix.length) : full
    const width = this.textEl?.clientWidth ?? 0
    if (width <= 0) return full
    const keep = this.fitMirrorLength(
      rows >= 2 ? 'multi' : 'single',
      rows,
      width,
      body.length,
      (n) => `${body.slice(0, n)}…${suffix}`,
    )
    return keep >= body.length ? full : `${body.slice(0, keep)}…${suffix}`
  }

  /** start 多行截断：保留末尾（可占满 rows 行），开头补省略号；测量不可用 → 全文兜底 */
  private truncateStartMulti(full: string, rows: number): string {
    const width = this.textEl?.clientWidth ?? 0
    if (width <= 0) return full
    const keep = this.fitMirrorLength('multi', rows, width, full.length, (n) =>
      n === 0 ? '' : `…${full.slice(full.length - n)}`,
    )
    return keep >= full.length ? full : `…${full.slice(full.length - keep)}`
  }

  /**
   * middle 多行截断：首行保头、末行保尾，中部省略号衔接。
   * 头部容量按 rows-1 行镜像测量（末行留给尾部），尾部容量按单行镜像测量；
   * 组合内容再按 rows 行校验，自然折行误差通过收缩尾部吸收。
   * 测量不可用（宽 0 或恒可容纳）→ 返回全文（安全兜底）。
   */
  private truncateMiddleMulti(full: string, rows: number): string {
    const side = OASEllipsis.MIDDLE_MIN_SIDE
    if (full.length <= side * 2 + 1) return full
    const width = this.textEl?.clientWidth ?? 0
    if (width <= 0) return full
    // 尾部容量：单行可容纳的「…+tail」最大长度
    const tailCap = this.fitMirrorLength('single', 1, width, full.length - side, (n) =>
      n === 0 ? '' : `…${full.slice(full.length - n)}`,
    )
    // 头部容量：前 rows-1 行可容纳的「head+…」最大长度
    const headCap = this.fitMirrorLength(
      'multi',
      Math.max(1, rows - 1),
      width,
      full.length - side,
      (n) => `${full.slice(0, n)}…`,
    )
    // 头尾容量之和已覆盖全文 → 全显等价，不截断（含 happy-dom 恒可容纳兜底）
    if (headCap + tailCap + 1 >= full.length) return full
    // 组合校验（rows 行）：自然折行与单行预估可能有出入，放不下则收缩尾部至可容纳
    const fitsCombo = (t: number): boolean => {
      const mirror = this.mirror()
      mirror.className = 'mirror multi'
      mirror.style.setProperty('-webkit-line-clamp', String(rows))
      mirror.style.width = `${width}px`
      mirror.textContent = `${full.slice(0, headCap)}…${full.slice(full.length - t)}`
      return mirror.scrollHeight - mirror.clientHeight <= 1
    }
    let lo = side
    let hiBound = Math.min(tailCap, full.length - headCap - 1)
    while (lo < hiBound) {
      const mid = Math.ceil((lo + hiBound) / 2)
      if (fitsCombo(mid)) lo = mid
      else hiBound = mid - 1
    }
    return `${full.slice(0, headCap)}…${full.slice(full.length - lo)}`
  }

  /** 行数归一：lines 优先（rows 同义别名，等价互通），至少 1 行；非法值回退 1 */
  private normalizeRows(): number {
    const raw = this.hasAttr('lines') ? this.getAttr('lines') : this.getAttr('rows', '1')
    const n = Number(raw)
    return Math.max(1, Math.round(Number.isFinite(n) ? n : 1))
  }

  /** suffix 生效边界：仅 tail（缺省）方向保留后缀；middle/start 自身保尾，忽略 suffix */
  private activeSuffix(direction: 'tail' | 'start' | 'middle'): string {
    return direction === 'tail' && this.hasAttr('suffix') ? this.getAttr('suffix') : ''
  }

  /** 点文本展开模式：expandable + expand-trigger="click"（无独立按钮形态） */
  private isClickMode(): boolean {
    return this.hasAttr('expandable') && this.getAttr('expand-trigger') === 'click'
  }

  /** 点文本展开当前是否可交互：click 模式且（溢出省略态或已展开可收起） */
  private clickToExpandActive(): boolean {
    return this.isClickMode() && (this.overflow || this.expanded)
  }

  /** 同步文本本体交互语义（role/tabindex/aria-expanded/cursor）；非点击模式清除 */
  private syncClickToExpand(): void {
    if (!this.textEl) return
    const active = this.clickToExpandActive()
    this.textEl.classList.toggle('clickable', active)
    if (active) {
      this.textEl.setAttribute('role', 'button')
      this.textEl.setAttribute('tabindex', '0')
      this.textEl.setAttribute('aria-expanded', String(this.expanded))
    } else {
      this.textEl.removeAttribute('role')
      this.textEl.removeAttribute('tabindex')
      this.textEl.removeAttribute('aria-expanded')
    }
  }

  /** 点击文本展开/收起（expand-trigger="click" 模式专属，等价 toggle 按钮） */
  private handleTextActivate(): void {
    if (this.clickToExpandActive()) this.handleToggle()
  }

  /** Enter / Space 键盘触发等价点击（role=button 键盘契约） */
  private handleTextKeydown(e: KeyboardEvent): void {
    if (!this.clickToExpandActive()) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this.handleToggle()
    }
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
