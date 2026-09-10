import { OASElement } from '@oas-ui/core'

/** 视为"贴底"的滚动剩余距离阈值（px），小于等于该值判定用户停在底部 */
const AUTO_SCROLL_THRESHOLD = 8

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  /* 日志流跟随外层字号；定制开口：--oas-log-font（行内文本按 em 比例跟随） */
  font-size: var(--oas-log-font, inherit);
}
:host([hidden]) {
  display: none;
}
[hidden] {
  display: none !important;
}
.viewport {
  position: relative;
  height: 100%;
  overflow: auto;
  overscroll-behavior: contain;
  box-sizing: border-box;
}
.log {
  box-sizing: border-box;
  min-height: 100%;
}
/* 等宽字体：日志流逐行对齐 */
.row {
  display: flex;
  align-items: baseline;
  padding-inline: var(--oas-space-3);
  line-height: 1.6;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  /* 等宽行按比例跟随 host（原 sm/md ≈ 13/14） */
  font-size: 0.929em;
}
.row:hover {
  background: var(--oas-color-bg-hover);
}
.gutter {
  flex-shrink: 0;
  min-width: 2.5em;
  padding-inline-end: var(--oas-space-3);
  text-align: end;
  color: var(--oas-color-text-disabled);
  user-select: none;
}
.log[data-line-number='false'] .gutter {
  display: none;
}
.line {
  min-width: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
/* 行级高亮命中片段（token 语义底色，暗色自动跟随） */
.mark {
  background: var(--oas-log-mark-bg, color-mix(in srgb, var(--oas-color-warning) 30%, transparent));
  color: var(--oas-log-mark-color, var(--oas-color-warning-text));
  border-radius: 2px;
  padding: 0 1px;
}
/* 级别着色通道：levels 字段 → token 语义色（暗色自动换色） */
.row[data-level='info'] .line {
  color: var(--oas-color-info-text);
}
.row[data-level='success'] .line {
  color: var(--oas-color-success-text);
}
.row[data-level='warning'] .line {
  color: var(--oas-color-warning-text);
}
.row[data-level='error'] .line {
  color: var(--oas-color-danger-text);
}
/* 空态占位 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-6);
  color: var(--oas-color-text-secondary);
  /* 空态文本按比例跟随 host（原 sm/md ≈ 13/14） */
  font-size: 0.929em;
}
.empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--oas-color-bg-hover);
  border: 1px dashed var(--oas-color-border-strong);
}
/* 加载浮层（首屏拉取/上翻加载历史时遮罩视口） */
.loading {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-2);
  background: var(--oas-log-loading-mask, color-mix(in srgb, var(--oas-color-bg) 65%, transparent));
  color: var(--oas-color-text-secondary);
  font-size: 0.929em;
}
.spinner {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border: 2px solid var(--oas-color-bg-hover);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-log-spin 0.8s linear infinite;
}
@keyframes oas-log-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
`

/** 级别别名归一：宿主给的宽松级别名 → 四个受支持档位（空串 = 不着色） */
const LEVEL_ALIASES: Record<string, string> = {
  info: 'info',
  notice: 'info',
  debug: 'info',
  success: 'success',
  ok: 'success',
  warn: 'warning',
  warning: 'warning',
  error: 'error',
  fatal: 'error',
  critical: 'error',
}

/** 高亮条目：字符串 = 字面关键词；对象 = { text } 字面或 { pattern, flags } 正则 */
type HighlightRule = RegExp

/** 转义正则元字符，字面关键词安全匹配 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * oas-log —— 等宽字体的日志流。
 *
 * 属性（kebab-case）：
 * - `lines`（property，`string[]`）：日志行数据（property 通道优先；也支持 `lines` 属性传 JSON 字符串）
 * - `auto-scroll`：追加后自动滚动到底，默认 `true`；仅当用户本就停靠在底部（未上翻）时滚动
 * - `line-number`：显示左侧行号栏
 * - `empty-text`：空态文案（覆盖 locale 默认值）
 * - `loading`：加载浮层（首屏拉取/历史加载遮罩）
 * - `offset-top` / `offset-bottom`：上/下分段加载触发阈值（px，默认 0）
 * - `levels`：JSON 字符串数组，与 lines 按索引对齐的行级别
 *   （info/success/warning/error，含 warn/fatal 等别名），映射 token 语义色
 * - `highlight`：JSON 高亮条目数组（字面关键词字符串，或 { text } / { pattern, flags } 对象）
 * - `keyword`：搜索过滤关键字（大小写不敏感）。非空时只显示命中行，命中片段包 mark
 *   （与 highlight 通道同一视觉体系）；清空/移除恢复全部行。过滤不改宿主数据，
 *   行号与 levels 仍按原始 data 索引对齐
 *
 * 事件：
 * - `oas-require-more`：滚动进入顶部/底部阈值区时派发（detail `{ from: 'top' | 'bottom' }`），
 *   边缘触发——停留在区域内不连发，离开区域后复位
 * - `oas-search`：keyword 或数据变化时派发（detail `{ keyword, matched, total }`，
 *   matched=当前命中行数、total=总行数；过滤窗口为当前已加载行）
 *
 * 方法：
 * - `scrollTo('top' | 'bottom' | number)`：滚动视口到顶/底/指定像素位置
 *
 * 实现要点：lines 更新按 key（行内容）对齐 reconcile——公共前缀/后缀行复用已有节点，
 * 支持尾部追加、顶部插入历史行与中间修改；滚动监听实时维护"是否贴底"状态，
 * 顶部插入时补偿 scrollTop 保持阅读位置；断开连接时经 onCleanup 清理。
 */
export class OASLog extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'lines',
      'auto-scroll',
      'line-number',
      'empty-text',
      'loading',
      'offset-top',
      'offset-bottom',
      'levels',
      'highlight',
      'keyword',
    ]
  }

  private data: string[] = []
  private linesFromProperty = false
  private viewport: HTMLElement | null = null
  private logEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  private loadingEl: HTMLElement | null = null
  /** 用户是否停靠在底部（未上翻）——由滚动事件实时维护 */
  private stickToBottom = true
  /** 分段加载边缘触发状态：已进入对应阈值区则置位，离开后复位 */
  private topZone = false
  private bottomZone = false
  /** 组件自身写入 scrollTop 时置位，避免程序化滚动误触发分段加载事件 */
  private programmaticScroll = false
  /** 上次 reconcile 已应用的高亮/级别通道签名，变化时重刷已有行 */
  private contentSig = ''
  /** 渲染窗口：keyword 非空时为命中行子集（过滤视图），否则与 data 一致 */
  private view: string[] = []
  /** 视口行索引 → data 索引映射：过滤后行号/levels 仍对齐原始数据 */
  private viewMap: number[] = []
  /** 上次 oas-search 派发的搜索签名（keyword + 数据内容）：变化才重复派发 */
  private searchSig = ''

  get lines(): string[] {
    return this.data.slice()
  }

  set lines(value: string[]) {
    this.data = Array.isArray(value) ? value.filter((l): l is string => typeof l === 'string') : []
    this.linesFromProperty = true
    if (this.isConnected) this.update()
  }

  /**
   * 滚动视口：`'top'` 到顶、`'bottom'` 到底、数字为像素 scrollTop；
   * 也接受 `{ top: number }` / `{ position: 'top' | 'bottom' }` 对象形态（与原生
   * Element.scrollTo 的 ScrollToOptions 并集，签名兼容基类）。
   * 非法目标忽略；滚动后重算贴底状态。
   */
  override scrollTo(
    target?: (ScrollToOptions & { position?: 'top' | 'bottom' }) | 'top' | 'bottom' | number,
  ): void {
    const vp = this.viewport
    if (!vp) return
    let top: number | null = null
    if (target === 'top') top = 0
    else if (target === 'bottom') top = vp.scrollHeight
    else if (typeof target === 'number') top = target
    else if (target && typeof target === 'object') {
      if (typeof target.top === 'number') top = target.top
      else if (target.position === 'top') top = 0
      else if (target.position === 'bottom') top = vp.scrollHeight
    }
    if (top == null) return
    this.setScrollTop(vp, Math.max(0, top))
    this.stickToBottom =
      vp.scrollHeight - vp.scrollTop - vp.clientHeight <= AUTO_SCROLL_THRESHOLD
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="viewport" part="viewport" tabindex="0">
        <div class="log" part="log" role="log" aria-live="polite" hidden></div>
        <div class="empty" part="empty" hidden>
          <div class="empty-icon" aria-hidden="true"></div>
          <span part="empty-text"></span>
        </div>
        <div class="loading" part="loading" hidden>
          <span class="spinner" aria-hidden="true"></span>
          <span part="loading-text"></span>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.viewport = this.shadow.querySelector('.viewport')
    this.logEl = this.shadow.querySelector('.log')
    this.emptyEl = this.shadow.querySelector('.empty')
    this.loadingEl = this.shadow.querySelector('.loading')
    this.viewport?.addEventListener('scroll', this.handleScroll, { passive: true })
    this.onCleanup(() => {
      this.viewport?.removeEventListener('scroll', this.handleScroll)
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（视口/日志容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.viewport') || !this.shadow.querySelector('.log')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseLines()
    this.computeView()
    // 在改动 DOM 前记录停靠状态与高度：追加/插入后 scrollHeight 已变大，事后无法判断原状态
    const wasStuck = this.stickToBottom
    const prevHeight = this.viewport?.scrollHeight ?? 0
    const prepended = this.reconcileRows()
    this.syncEmpty()
    this.syncSearch()
    this.syncLineNumber()
    this.syncLoading()
    const vp = this.viewport
    if (!vp) return
    if (prepended) {
      // 顶部插入历史行：下方内容整体下移，补偿 scrollTop 保持用户阅读位置
      this.setScrollTop(vp, vp.scrollTop + (vp.scrollHeight - prevHeight))
    }
    if (this.autoScroll() && wasStuck) {
      this.setScrollTop(vp, vp.scrollHeight)
    }
  }

  /** 程序化写入 scrollTop：浏览器对 scrollTop 赋值同步派发 scroll 事件，此处抑制分段加载误触发 */
  private setScrollTop(vp: HTMLElement, value: number): void {
    this.programmaticScroll = true
    vp.scrollTop = value
    this.programmaticScroll = false
  }

  private autoScroll(): boolean {
    return this.getAttr('auto-scroll', 'true') !== 'false'
  }

  private parseLines(): void {
    if (this.linesFromProperty) return
    const raw = this.getAttribute('lines')
    if (raw == null) return
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        this.data = parsed.filter((l): l is string => typeof l === 'string')
      }
    } catch {
      /* 非法 JSON 忽略，保持内部值 */
    }
  }

  /** 当前搜索关键字（trim 后；空串 = 不过滤） */
  private keywordOf(): string {
    return this.getAttr('keyword', '').trim()
  }

  /**
   * 计算渲染窗口：keyword 非空时过滤为命中行子集（大小写不敏感），否则全量。
   * 仅影响渲染，不改 this.data（宿主数据保持不变）；同时维护 viewMap 供
   * 行号/levels 回溯原始索引。过滤窗口为当前已加载行，与分段加载兼容。
   */
  private computeView(): void {
    const keyword = this.keywordOf()
    this.view = []
    this.viewMap = []
    if (!keyword) {
      this.view = this.data.slice()
      this.viewMap = this.data.map((_, i) => i)
      return
    }
    const re = new RegExp(escapeRegExp(keyword), 'i')
    this.data.forEach((line, i) => {
      if (re.test(line)) {
        this.view.push(line)
        this.viewMap.push(i)
      }
    })
  }

  /**
   * key 对齐的增量 reconcile：以行内容为 key 求最长公共前缀/后缀，
   * 前缀行原样复用、中间差异行重建、后缀行复用并重排行号/级别/高亮。
   * 支持尾部追加（热路径零重建）、顶部插入历史行（审计上翻）、中间修改。
   * reconcile 对象是过滤后的渲染窗口（this.view），keyword 变化等同一行内容
   * 子序列的变化由公共前缀/后缀对齐天然复用节点。
   * @returns 是否发生了顶部插入（调用方据此补偿 scrollTop）
   */
  private reconcileRows(): boolean {
    const logEl = this.logEl
    if (!logEl) return false
    const next = this.view
    const rules = this.contentRules()
    const rowEls = Array.from(logEl.children) as HTMLElement[]
    const prevCount = rowEls.length
    const oldTexts = rowEls.map((r) => r.querySelector('[part="line"]')?.textContent ?? '')

    let p = 0
    while (p < prevCount && p < next.length && oldTexts[p] === next[p]) p++
    let s = 0
    while (
      s < prevCount - p &&
      s < next.length - p &&
      oldTexts[prevCount - 1 - s] === next[next.length - 1 - s]
    ) {
      s++
    }

    for (let i = prevCount - s - 1; i >= p; i--) rowEls[i]!.remove()
    const anchor = s > 0 ? rowEls[prevCount - s]! : null
    for (let i = p; i < next.length - s; i++) {
      logEl.insertBefore(this.createRow(i, rules), anchor)
    }

    // 后缀行索引已偏移，重排行号/级别/高亮；前缀行仅在高亮/级别通道变化时重刷
    const sigChanged = this.contentSig !== this.channelsSig()
    const rowsNow = Array.from(logEl.children) as HTMLElement[]
    for (let i = 0; i < rowsNow.length; i++) {
      if (i >= p && i < next.length - s) continue // 新建行已在 createRow 内同步
      if (i < p && !sigChanged) continue
      this.syncRowMeta(rowsNow[i]!, i, rules)
    }
    this.contentSig = this.channelsSig()
    return p === 0 && s > 0 && prevCount > 0
  }

  private createRow(index: number, rules: HighlightRule[]): HTMLElement {
    const row = document.createElement('div')
    row.className = 'row'
    row.setAttribute('part', 'row')
    const gutter = document.createElement('div')
    gutter.className = 'gutter'
    gutter.setAttribute('part', 'line-number')
    const line = document.createElement('div')
    line.className = 'line'
    line.setAttribute('part', 'line')
    row.append(gutter, line)
    this.syncRowMeta(row, index, rules)
    return row
  }

  /** 同步单行派生态：行号文本（原始 data 行号）、级别语义色、高亮片段 */
  private syncRowMeta(row: HTMLElement, index: number, rules: HighlightRule[]): void {
    const dataIndex = this.viewMap[index] ?? index
    const gutter = row.querySelector<HTMLElement>('[part="line-number"]')
    if (gutter) gutter.textContent = String(dataIndex + 1)
    const level = this.levelOf(dataIndex)
    if (level) row.setAttribute('data-level', level)
    else row.removeAttribute('data-level')
    const line = row.querySelector<HTMLElement>('[part="line"]')
    if (line) this.fillLine(line, this.view[index] ?? '', rules)
  }

  /** 行内容填充：无高亮规则走 textContent；有规则拆分段落，命中片段包 mark（文本节点防注入） */
  private fillLine(lineEl: HTMLElement, text: string, rules: HighlightRule[]): void {
    lineEl.textContent = ''
    if (!rules.length) {
      lineEl.textContent = text
      return
    }
    const spans: Array<[number, number]> = []
    for (const re of rules) {
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) {
        spans.push([m.index, m.index + m[0].length])
        if (m[0].length === 0) re.lastIndex++
      }
    }
    if (!spans.length) {
      lineEl.textContent = text
      return
    }
    spans.sort((a, b) => a[0] - b[0] || b[1] - a[1])
    let cursor = 0
    for (const [start, end] of spans) {
      if (end <= cursor) continue
      if (start > cursor) lineEl.append(document.createTextNode(text.slice(cursor, start)))
      const mark = document.createElement('span')
      mark.className = 'mark'
      mark.setAttribute('part', 'mark')
      mark.textContent = text.slice(start, end)
      lineEl.append(mark)
      cursor = end
    }
    if (cursor < text.length) lineEl.append(document.createTextNode(text.slice(cursor)))
  }

  /** 行内容规则：highlight 通道 + keyword 命中高亮（keyword 字面转义，大小写不敏感，同 mark 视觉体系） */
  private contentRules(): HighlightRule[] {
    const rules = this.parseHighlight()
    const keyword = this.keywordOf()
    if (keyword) rules.push(new RegExp(escapeRegExp(keyword), 'gi'))
    return rules
  }

  /** 解析 highlight JSON：字符串条目按字面关键词，对象条目支持 text/pattern；非法条目/正则跳过 */
  private parseHighlight(): HighlightRule[] {
    const raw = this.getAttr('highlight', '').trim()
    if (!raw) return []
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return []
    }
    if (!Array.isArray(parsed)) return []
    const out: HighlightRule[] = []
    for (const item of parsed) {
      try {
        if (typeof item === 'string') {
          if (item) out.push(new RegExp(escapeRegExp(item), 'gi'))
          continue
        }
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>
          const src =
            typeof o.pattern === 'string'
              ? o.pattern
              : typeof o.text === 'string'
                ? escapeRegExp(o.text)
                : ''
          if (!src) continue
          const flags = typeof o.flags === 'string' && /^[dgimsuvy]*$/.test(o.flags) ? o.flags : 'gi'
          out.push(new RegExp(src, flags.includes('g') ? flags : `${flags}g`))
        }
      } catch {
        /* 非法正则跳过 */
      }
    }
    return out
  }

  /** 解析 levels JSON（与 lines 按索引对齐），归一为受支持档位 */
  private levelOf(index: number): string {
    const raw = this.getAttr('levels', '').trim()
    if (!raw) return ''
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return ''
      const lv = parsed[index]
      if (typeof lv !== 'string') return ''
      return LEVEL_ALIASES[lv.trim().toLowerCase()] ?? ''
    } catch {
      return ''
    }
  }

  /** 高亮/级别/搜索通道签名：判定是否需要重刷已有行的派生态 */
  private channelsSig(): string {
    return `${this.getAttr('highlight', '')}|${this.getAttr('levels', '')}|${this.getAttr('keyword', '')}`
  }

  private syncEmpty(): void {
    const keyword = this.keywordOf()
    const isEmpty = this.view.length === 0
    if (this.logEl) this.logEl.hidden = isEmpty
    if (this.emptyEl) this.emptyEl.hidden = !isEmpty
    const text = this.shadow.querySelector<HTMLElement>('[part="empty-text"]')
    if (!text) return
    // 数据非空但过滤无命中 → 「无匹配」空态；数据本空 → 常规空态文案
    const noMatch = Boolean(keyword) && this.data.length > 0
    text.textContent = noMatch
      ? this.t('log.no-match')
      : this.getAttr('empty-text', this.t('log.empty'))
  }

  /** 搜索过滤结果上报：keyword 或数据内容变化时派发（同状态去重，不连发） */
  private syncSearch(): void {
    const keyword = this.keywordOf()
    const sig = `${keyword}\n${this.data.join('\n')}`
    if (sig === this.searchSig) return
    this.searchSig = sig
    this.emit('search', { keyword, matched: this.view.length, total: this.data.length })
  }

  private syncLineNumber(): void {
    this.logEl?.setAttribute('data-line-number', String(this.hasAttr('line-number')))
  }

  /** loading 态：加载浮层显隐 + aria-busy 同步到 role=log 容器 */
  private syncLoading(): void {
    const loading = this.hasAttr('loading')
    if (this.loadingEl) {
      this.loadingEl.hidden = !loading
      const text = this.loadingEl.querySelector<HTMLElement>('[part="loading-text"]')
      if (text) text.textContent = this.t('loading.loading')
    }
    if (this.logEl) this.logEl.setAttribute('aria-busy', String(loading))
  }

  private offsetOf(name: string): number {
    const n = Number(this.getAttr(name, '0'))
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  private handleScroll = (): void => {
    if (this.programmaticScroll) return
    const vp = this.viewport
    if (!vp) return
    const remaining = vp.scrollHeight - vp.scrollTop - vp.clientHeight
    this.stickToBottom = remaining <= AUTO_SCROLL_THRESHOLD
    // 分段加载：进入顶/底阈值区边缘触发一次（停留不连发，离开复位）
    if (vp.scrollTop <= this.offsetOf('offset-top')) {
      if (!this.topZone) {
        this.topZone = true
        this.emit('require-more', { from: 'top' })
      }
    } else {
      this.topZone = false
    }
    if (remaining <= this.offsetOf('offset-bottom')) {
      if (!this.bottomZone) {
        this.bottomZone = true
        this.emit('require-more', { from: 'bottom' })
      }
    } else {
      this.bottomZone = false
    }
  }
}
