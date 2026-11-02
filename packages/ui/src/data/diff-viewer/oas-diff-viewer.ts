import { OASElement } from '@oas-ui/core'
import {
  diffLines,
  layoutRows,
  layoutSplitRows,
  type DiffFoldRow,
  type DiffLayout,
  type DiffLineRow,
  type DiffSegment,
  type DiffStats,
  type SplitLineRow,
  type SplitRow,
} from './diff-model.js'

/** 数据更新后的统计事件 detail */
export interface DiffViewerChangeDetail extends DiffStats {}

/** 折叠块展开/收起事件 detail */
export interface DiffViewerHunkToggleDetail {
  /** 相邻变更块序号（文末折叠取前一个变更块） */
  index: number
  expanded: boolean
  /** 被折叠区间首行在完整行序列中的下标 */
  start: number
  /** 被折叠行数 */
  count: number
}

const MONO_FONT = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace"

const STYLE = `
:host {
  display: block;
  --oas-diff-viewer-add-bg: var(--oas-color-diff-add-bg);
  --oas-diff-viewer-add-word-bg: var(--oas-color-diff-add-word-bg);
  --oas-diff-viewer-del-bg: var(--oas-color-diff-del-bg);
  --oas-diff-viewer-del-word-bg: var(--oas-color-diff-del-word-bg);
}
:host([hidden]) { display: none; }
.viewer {
  display: flex;
  flex-direction: column;
  height: var(--oas-diff-viewer-height, 480px);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-xs);
  overflow: hidden;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2, 8px);
  flex: none;
  min-height: 32px;
  padding: 2px var(--oas-space-2, 8px);
  border-bottom: 1px solid var(--oas-color-border);
}
.toolbar[hidden] { display: none; }
.split-head {
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex: none;
  border-bottom: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
  padding: 2px var(--oas-space-2, 8px);
}
.split-head[hidden] { display: none; }
.split-head span { padding-inline: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stats { display: flex; align-items: center; gap: var(--oas-space-2, 8px); font-variant-numeric: tabular-nums; }
.stats .added { color: var(--oas-color-success-text); }
.stats .removed { color: var(--oas-color-danger-text); }
.summary, .status { color: var(--oas-color-text-secondary); }
.status[hidden] { display: none; }
.spacer { flex: 1; }
.btn {
  font: inherit;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-primary);
  background: transparent;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  padding: 2px 8px;
  cursor: pointer;
}
.btn:hover:not(:disabled) { background: var(--oas-color-bg-hover); }
.btn:disabled { opacity: 0.5; cursor: default; }
.btn:focus-visible { outline: none; box-shadow: var(--oas-focus-ring); }
.viewport { flex: 1; min-height: 0; overflow: auto; outline: none; }
.viewport:focus-visible { box-shadow: inset var(--oas-focus-ring); }
.inner { position: relative; }
.rows { position: absolute; inset-inline: 0; top: 0; }
.row {
  display: grid;
  grid-template-columns: 3.5em 3.5em 1.25em minmax(0, 1fr);
  align-items: stretch;
  height: var(--oas-diff-viewer-row-height, 22px);
  line-height: var(--oas-diff-viewer-row-height, 22px);
}
.row[data-op='insert'] { background: var(--oas-diff-viewer-add-bg); }
.row[data-op='delete'] { background: var(--oas-diff-viewer-del-bg); }
.viewport:focus-visible .row.active, .viewport:focus-visible .fold.active { box-shadow: inset 0 0 0 2px var(--oas-color-primary); }
.no {
  text-align: end;
  padding-inline: 6px;
  color: var(--oas-color-diff-gutter-text, var(--oas-color-text-secondary));
  user-select: none;
  font-variant-numeric: tabular-nums;
  border-inline-end: 1px solid var(--oas-color-border);
}
.sign { text-align: center; user-select: none; color: var(--oas-color-diff-gutter-text, var(--oas-color-text-secondary)); }
.code {
  min-width: 0;
  padding-inline: 6px;
  overflow: hidden;
  white-space: pre;
  text-overflow: ellipsis;
  font-family: ${MONO_FONT};
}
.seg.changed { border-radius: 2px; }
.row[data-op='insert'] .seg.changed { background: var(--oas-diff-viewer-add-word-bg); }
.row[data-op='delete'] .seg.changed { background: var(--oas-diff-viewer-del-word-bg); }
.split .no { border-inline-end: none; }
.split .code { border-inline-end: 1px solid var(--oas-color-border); }
.split .code:last-child { border-inline-end: none; }
.split .code[data-op='insert'] { background: var(--oas-diff-viewer-add-bg); }
.split .code[data-op='delete'] { background: var(--oas-diff-viewer-del-bg); }
.split .code[data-op='insert'] .seg.changed { background: var(--oas-diff-viewer-add-word-bg); }
.split .code[data-op='delete'] .seg.changed { background: var(--oas-diff-viewer-del-word-bg); }
:host([data-mode='split']) .row { grid-template-columns: 3.5em minmax(0, 1fr) 3.5em minmax(0, 1fr); }
:host([data-line-numbers='false']) .row { grid-template-columns: 1.25em minmax(0, 1fr); }
:host([data-line-numbers='false'][data-mode='split']) .row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
:host([data-line-numbers='false']) .no { display: none; }
.fold {
  display: flex;
  align-items: center;
  height: var(--oas-diff-viewer-row-height, 22px);
  background: var(--oas-color-bg-hover);
  border-block: 1px solid var(--oas-color-border);
}
.fold-btn {
  font: inherit;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-primary-text);
  background: transparent;
  border: 0;
  padding-inline: 8px;
  cursor: pointer;
  height: 100%;
  text-align: start;
}
.fold-btn:focus-visible { outline: none; box-shadow: inset var(--oas-focus-ring); }
.placeholder {
  padding: 32px 16px;
  text-align: center;
  color: var(--oas-color-text-secondary);
}
:host([data-wrap]) .code { white-space: pre-wrap; overflow-wrap: anywhere; }
:host([data-wrap]) .row { height: auto; min-height: var(--oas-diff-viewer-row-height, 22px); line-height: 1.5; }

@media (forced-colors: active) {
  /* 强制色下 box-shadow 被 UA 弃用：焦点环回退系统色实线 outline（WCAG 2.4.7） */
  .btn:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
    box-shadow: none;
  }
  .fold-btn:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: -1px;
    box-shadow: none;
  }
  /* 滚动视口原用 inset 焦点环 */
  .viewport:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: -1px;
    box-shadow: none;
  }
}
`

function clampInt(raw: string, fallback: number, min: number): number {
  const value = Number(raw)
  return Number.isFinite(value) ? Math.max(min, Math.floor(value)) : fallback
}

/** 只读文本差异查看器（`oas-diff-viewer`） */
export class OASDiffViewer extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'old-text',
      'new-text',
      'mode',
      'context',
      'ignore-whitespace',
      'max-edits',
      'split-min-width',
      'show-line-numbers',
      'old-label',
      'new-label',
      'toolbar',
      'height',
      'row-height',
      'virtual',
      'virtual-threshold',
      'wrap',
      'aria-label',
    ]
  }

  private diff: ReturnType<typeof diffLines> | null = null
  private diffKey = ''
  private layout: DiffLayout = {
    rows: [],
    folds: [],
    hunks: [],
    stats: { added: 0, removed: 0, unchanged: 0, hunks: 0 },
    degraded: false,
  }
  private layoutKey = ''
  private splitRows: SplitRow[] = []
  private splitMap: number[] = []
  private splitKey = ''
  private expandedFolds = new Set<number>()
  private activeIndex = 0
  private scrollOffset = 0
  private widthMeasured = false

  private viewportEl: HTMLElement | null = null
  private innerEl: HTMLElement | null = null
  private rowsEl: HTMLElement | null = null
  private toolbarEl: HTMLElement | null = null
  private statusEl: HTMLElement | null = null
  private resizeObserver: ResizeObserver | null = null

  /**
   * 旧文本（property 通道，反射 old-text 属性；SSR 走属性）
   * @apiProperty
   */
  get oldText(): string {
    return this.getAttr('old-text', '')
  }
  set oldText(value: string) {
    this.setAttribute('old-text', value)
  }

  /**
   * 新文本（property 通道，反射 new-text 属性；SSR 走属性）
   * @apiProperty
   */
  get newText(): string {
    return this.getAttr('new-text', '')
  }
  set newText(value: string) {
    this.setAttribute('new-text', value)
  }

  /**
   * 差异统计（只读）
   * @apiProperty
   */
  get stats(): DiffStats {
    return { ...this.layout.stats }
  }

  /** 当前是否因编辑距离过大降级为整块替换 */
  get degraded(): boolean {
    return this.diff?.degraded ?? false
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="viewer" part="viewer">
        <div class="toolbar" part="toolbar">
          <span class="stats" part="stats">
            <span class="added" part="added"></span>
            <span class="removed" part="removed"></span>
            <span class="summary" part="summary"></span>
          </span>
          <span class="status" part="status" role="status" aria-live="polite"></span>
          <span class="spacer"></span>
          <button class="btn" part="expand-all" type="button"></button>
          <button class="btn" part="collapse-all" type="button"></button>
        </div>
        <div class="split-head" part="split-head" hidden>
          <span part="before-label"></span>
          <span part="after-label"></span>
        </div>
        <div class="viewport" part="viewport" role="grid" tabindex="0">
          <div class="inner" part="inner">
            <div class="rows" part="rows"></div>
          </div>
        </div>
      </div>
    `
    this.bind()
    this.update()
  }

  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="viewport"]')) return false
    if (!this.shadow.querySelector('[part="rows"]')) return false
    this.bind()
    // 水合时布局已可用：记录宽度测量，避免首帧按未测量假设渲染 split 后再降级
    if (this.clientWidth > 0) this.widthMeasured = true
    return true
  }

  protected override onReconnect(): void {
    this.bind()
  }

  private bind(): void {
    this.viewportEl = this.shadow.querySelector('[part="viewport"]')
    this.innerEl = this.shadow.querySelector('[part="inner"]')
    this.rowsEl = this.shadow.querySelector('[part="rows"]')
    this.toolbarEl = this.shadow.querySelector('[part="toolbar"]')
    this.statusEl = this.shadow.querySelector('[part="status"]')

    this.rowsEl?.addEventListener('click', this.onRowsClick)
    this.viewportEl?.addEventListener('keydown', this.onKeydown)
    this.viewportEl?.addEventListener('scroll', this.onScroll)
    this.viewportEl?.addEventListener('focus', this.onViewportFocus)
    this.shadow.querySelector('[part="expand-all"]')?.addEventListener('click', this.onExpandAll)
    this.shadow.querySelector('[part="collapse-all"]')?.addEventListener('click', this.onCollapseAll)

    if (typeof ResizeObserver !== 'undefined' && !this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.onResize())
      this.resizeObserver.observe(this)
      this.onCleanup(() => {
        this.resizeObserver?.disconnect()
        this.resizeObserver = null
      })
    }
  }

  private contextValue(): number {
    return clampInt(this.getAttr('context', '3'), 3, 0)
  }

  private sourceKey(): string {
    return [
      this.oldText,
      this.newText,
      this.hasAttr('ignore-whitespace') ? '1' : '0',
      this.getAttr('max-edits', '1000'),
    ].join('\u0000')
  }

  protected override update(): void {
    const nextKey = this.sourceKey()
    let sourceChanged = false
    if (nextKey !== this.diffKey) {
      this.diff = diffLines(this.oldText, this.newText, {
        ignoreWhitespace: this.hasAttr('ignore-whitespace'),
        maxEdits: clampInt(this.getAttr('max-edits', '1000'), 1000, 1),
      })
      this.diffKey = nextKey
      this.expandedFolds.clear()
      this.activeIndex = 0
      this.scrollOffset = 0
      if (this.viewportEl) this.viewportEl.scrollTop = 0
      sourceChanged = true
    }

    const expanded = [...this.expandedFolds].sort((a, b) => a - b).join(',')
    const nextLayoutKey = `${this.diffKey}\u0000${this.contextValue()}\u0000${expanded}`
    if (nextLayoutKey !== this.layoutKey) {
      this.layout = layoutRows(this.diff?.lines ?? [], {
        context: this.contextValue(),
        expandedFolds: this.expandedFolds,
      })
      this.layout.degraded = this.diff?.degraded ?? false
      this.layoutKey = nextLayoutKey
      this.splitKey = ''
    }

    this.syncChrome()
    this.syncRows()

    if (sourceChanged) {
      const detail: DiffViewerChangeDetail = { ...this.layout.stats }
      this.emit('diff-change', detail)
    }
  }

  private effectiveMode(): 'unified' | 'split' {
    if (this.getAttr('mode', 'unified') !== 'split') return 'unified'
    const min = clampInt(this.getAttr('split-min-width', '640'), 640, 0)
    const width = this.clientWidth || this.getBoundingClientRect?.().width || 0
    // 未测量环境（SSR/happy-dom）不降级；真实窄容器才降级
    if (!this.widthMeasured && width === 0) return 'split'
    return width >= min ? 'split' : 'unified'
  }

  private rowHeightPx(): number {
    if (this.hasAttribute('row-height')) return clampInt(this.getAttr('row-height', '22'), 22, 12)
    // 未设属性时允许外部 CSS 变量覆盖（文档声明的 --oas-diff-viewer-row-height）
    try {
      const css = Number.parseFloat(getComputedStyle(this).getPropertyValue('--oas-diff-viewer-row-height'))
      if (Number.isFinite(css) && css >= 12) return css
    } catch {
      /* SSR / 无样式环境回落默认值 */
    }
    return 22
  }

  private viewportHeight(): number {
    const client = this.viewportEl?.clientHeight ?? 0
    if (client > 0) return client
    return Math.max(60, clampInt(this.getAttr('height', '480'), 480, 60) - 40)
  }

  private virtualEnabled(count: number): boolean {
    if (this.hasAttr('wrap')) return false
    const mode = this.getAttr('virtual', '')
    if (mode === 'false') return false
    if (mode === 'true') return true
    return count > clampInt(this.getAttr('virtual-threshold', '2000'), 2000, 1)
  }

  private visibleRows(): DiffRowLike[] {
    const mode = this.effectiveMode()
    if (mode === 'split') {
      if (this.splitKey !== this.layoutKey) {
        const split = layoutSplitRows(this.layout.rows)
        this.splitRows = split.rows
        this.splitMap = split.map
        this.splitKey = this.layoutKey
      }
      return this.splitRows
    }
    return this.layout.rows
  }

  private syncChrome(): void {
    const toolbar = this.toolbarEl
    if (toolbar) toolbar.hidden = this.getAttr('toolbar', '') === 'false'
    const showLineNumbers = this.getAttr('show-line-numbers', '') !== 'false'
    const mode = this.effectiveMode()
    this.dataset.mode = mode
    this.toggleAttribute('data-wrap', this.hasAttr('wrap'))
    this.toggleAttribute('data-degraded', this.degraded)
    this.dataset.lineNumbers = showLineNumbers ? 'true' : 'false'
    // 仅属性在场时写 inline 变量；否则让外部 CSS 自定义属性生效（文档声明可覆盖）
    if (this.hasAttribute('height')) {
      this.style.setProperty('--oas-diff-viewer-height', `${clampInt(this.getAttr('height', '480'), 480, 60)}px`)
    } else {
      this.style.removeProperty('--oas-diff-viewer-height')
    }
    if (this.hasAttribute('row-height')) {
      this.style.setProperty('--oas-diff-viewer-row-height', `${this.rowHeightPx()}px`)
    } else {
      this.style.removeProperty('--oas-diff-viewer-row-height')
    }

    const stats = this.layout.stats
    const setText = (part: string, text: string) => {
      const el = this.shadow.querySelector<HTMLElement>(`[part="${part}"]`)
      if (el) el.textContent = text
    }
    setText('added', `+${stats.added}`)
    setText('removed', `\u2212${stats.removed}`)
    setText('summary', this.t('diffViewer.hunks', { count: stats.hunks }))
    const expand = this.shadow.querySelector<HTMLButtonElement>('[part="expand-all"]')
    const collapse = this.shadow.querySelector<HTMLButtonElement>('[part="collapse-all"]')
    if (expand) {
      expand.textContent = this.t('diffViewer.expandAll')
      expand.disabled = this.layout.folds.length === 0
    }
    if (collapse) {
      collapse.textContent = this.t('diffViewer.collapseAll')
      collapse.disabled = this.expandedFolds.size === 0
    }
    if (this.statusEl) {
      const nothing = !this.diff || this.diff.lines.length === 0
      const identical = !nothing && stats.added === 0 && stats.removed === 0
      // 空态由占位文本承担，工具栏状态只提示「无差异 / 降级」，避免同一句重复两次
      this.statusEl.hidden = !(identical || this.degraded)
      this.statusEl.textContent = this.degraded
        ? this.t('diffViewer.degraded')
        : identical
          ? this.t('diffViewer.identical')
          : ''
    }
    if (this.viewportEl) {
      const label = this.getAttribute('aria-label')?.trim() || this.t('diffViewer.table')
      this.viewportEl.setAttribute('aria-label', label)
    }
    const splitHead = this.shadow.querySelector<HTMLElement>('[part="split-head"]')
    if (splitHead) splitHead.hidden = mode !== 'split'
    if (mode === 'split') {
      setText('before-label', this.getAttr('old-label', '') || this.t('diffViewer.before'))
      setText('after-label', this.getAttr('new-label', '') || this.t('diffViewer.after'))
    }
  }

  private syncRows(): void {
    const viewport = this.viewportEl
    const rowsEl = this.rowsEl
    const inner = this.innerEl
    if (!viewport || !rowsEl || !inner) return

    const all = this.visibleRows()
    const showLineNumbers = this.getAttr('show-line-numbers', '') !== 'false'
    const split = this.effectiveMode() === 'split'
    const numbersColumnCount = showLineNumbers ? (split ? 4 : 3) : split ? 2 : 1
    // 空内容占位：无行时降级为 group 并移除 rowgroup，避免空 grid 触发 aria-required-* 违规
    if (all.length === 0) {
      viewport.setAttribute('role', 'group')
      viewport.removeAttribute('aria-activedescendant')
      viewport.removeAttribute('aria-rowcount')
      viewport.removeAttribute('aria-colcount')
      rowsEl.removeAttribute('role')
      inner.style.height = 'auto'
      rowsEl.style.transform = ''
      rowsEl.innerHTML = ''
      const placeholder = document.createElement('div')
      placeholder.className = 'placeholder'
      placeholder.setAttribute('part', 'placeholder')
      placeholder.textContent = this.t('diffViewer.empty')
      rowsEl.append(placeholder)
      return
    }
    viewport.setAttribute('role', 'grid')
    viewport.setAttribute('aria-rowcount', String(all.length))
    viewport.setAttribute('aria-colcount', String(numbersColumnCount))
    rowsEl.setAttribute('role', 'rowgroup')

    if (this.activeIndex >= all.length) this.activeIndex = all.length - 1
    if (this.activeIndex < 0) this.activeIndex = 0

    const rowH = this.rowHeightPx()
    const virtual = this.virtualEnabled(all.length)
    let start = 0
    let end = all.length
    if (virtual) {
      const buffer = 8
      start = Math.max(0, Math.floor(this.scrollOffset / rowH) - buffer)
      start = Math.min(start, Math.max(0, all.length - 1))
      end = Math.min(all.length, Math.ceil((this.scrollOffset + this.viewportHeight()) / rowH) + buffer)
      end = Math.max(start + 1, end)
    }
    // 指针滚动不强行改写活动行；仅键盘焦点在视口内时把活动行拉回窗口，避免 aria 指向失联节点
    const focused = this.shadow.activeElement === viewport
    if (focused && (this.activeIndex < start || this.activeIndex >= end)) this.activeIndex = start
    inner.style.height = virtual ? `${all.length * rowH}px` : 'auto'
    rowsEl.style.transform = virtual ? `translateY(${start * rowH}px)` : ''

    const fragment = document.createDocumentFragment()
    for (let index = start; index < end; index++) {
      const row = all[index]!
      const node =
        row.kind === 'fold'
          ? this.renderFold(row, index, numbersColumnCount)
          : this.renderLine(row, index, split, showLineNumbers)
      if (index === this.activeIndex) node.classList.add('active')
      fragment.append(node)
    }
    rowsEl.replaceChildren(fragment)
    if (this.activeIndex >= start && this.activeIndex < end) {
      viewport.setAttribute('aria-activedescendant', all[this.activeIndex]!.id)
    } else {
      viewport.removeAttribute('aria-activedescendant')
    }
  }

  private renderLine(row: DiffLineRow | SplitLineRow, index: number, split: boolean, numbers: boolean): HTMLElement {
    if (split) {
      const pair = row as SplitLineRow
      const el = this.lineElement('split', 'replace', index, numbers)
      el.id = pair.id
      if (numbers) {
        el.append(
          this.noCell(pair.before?.beforeNo ?? null, 'before-no'),
          this.codeCell(pair.before, 'before-code', true),
          this.noCell(pair.after?.afterNo ?? null, 'after-no'),
          this.codeCell(pair.after, 'after-code', true),
        )
      } else {
        el.append(this.codeCell(pair.before, 'before-code', true), this.codeCell(pair.after, 'after-code', true))
      }
      if (pair.before && pair.after) {
        // split 替换行两侧都可被读屏命中：同时给删除/新增语义，而不是只暴露删除侧
        el.setAttribute(
          'aria-label',
          `${this.t('diffViewer.removedLine', { n: pair.before.beforeNo ?? 0 })} / ${this.t('diffViewer.addedLine', { n: pair.after.afterNo ?? 0 })}`,
        )
      } else {
        this.annotateRow(el, pair.before ?? pair.after)
      }
      return el
    }
    const line = row as DiffLineRow
    const el = this.lineElement(line.op, line.op, index, numbers)
    el.id = line.id
    if (numbers) {
      el.append(this.noCell(line.beforeNo, 'before-no'), this.noCell(line.afterNo, 'after-no'))
    }
    el.append(
      Object.assign(document.createElement('span'), {
        className: 'sign',
        textContent: line.op === 'insert' ? '+' : line.op === 'delete' ? '\u2212' : '',
      }),
      this.codeCell(line, 'code', false),
    )
    this.annotateRow(el, line)
    return el
  }

  private lineElement(mode: string, op: string, index: number, numbers: boolean): HTMLElement {
    const el = document.createElement('div')
    el.className = mode === 'split' ? 'row split' : 'row'
    el.setAttribute('part', 'row')
    el.setAttribute('role', 'row')
    el.setAttribute('aria-rowindex', String(index + 1))
    el.setAttribute('data-op', op)
    el.setAttribute('data-index', String(index))
    el.setAttribute('data-line-numbers', numbers ? 'true' : 'false')
    return el
  }

  private noCell(value: number | null, part: string): HTMLElement {
    const cell = document.createElement('span')
    cell.className = 'no'
    cell.setAttribute('part', part)
    cell.setAttribute('role', 'gridcell')
    cell.setAttribute('aria-hidden', 'true')
    cell.textContent = value == null ? '' : String(value)
    return cell
  }

  private codeCell(line: DiffLineRow | null | undefined, part: string, withSign: boolean): HTMLElement {
    const cell = document.createElement('span')
    cell.className = 'code'
    cell.setAttribute('part', part)
    cell.setAttribute('role', 'gridcell')
    if (!line) return cell
    cell.setAttribute('data-op', line.op)
    if (withSign && line.op !== 'equal') {
      const sign = document.createElement('span')
      sign.className = 'sign'
      sign.setAttribute('aria-hidden', 'true')
      sign.textContent = line.op === 'insert' ? '+' : '\u2212'
      cell.append(sign)
    }
    const segments: DiffSegment[] = line.segments ?? [{ text: line.text, changed: false }]
    for (const segment of segments) {
      if (segment.changed) {
        const mark = document.createElement('span')
        mark.className = 'seg changed'
        mark.textContent = segment.text
        cell.append(mark)
      } else {
        cell.append(document.createTextNode(segment.text))
      }
    }
    return cell
  }

  private annotateRow(el: HTMLElement, line: DiffLineRow | null): void {
    if (!line || line.op === 'equal') return
    el.setAttribute(
      'aria-label',
      line.op === 'insert'
        ? this.t('diffViewer.addedLine', { n: line.afterNo ?? 0 })
        : this.t('diffViewer.removedLine', { n: line.beforeNo ?? 0 }),
    )
  }

  private renderFold(fold: DiffFoldRow, index: number, columnCount: number): HTMLElement {
    const row = document.createElement('div')
    row.className = 'fold'
    row.id = fold.id
    row.setAttribute('part', 'fold')
    row.setAttribute('role', 'row')
    row.setAttribute('aria-rowindex', String(index + 1))
    row.setAttribute('data-index', String(index))
    row.setAttribute('data-fold', String(fold.index))
    const cell = document.createElement('span')
    cell.setAttribute('role', 'gridcell')
    cell.setAttribute('aria-colspan', String(columnCount))
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'fold-btn'
    button.setAttribute('part', 'fold-toggle')
    // role=row 内放 button：button 自身保留可聚焦语义，点击/Enter 均可展开/收起
    const expanded = this.expandedFolds.has(fold.index)
    button.setAttribute('aria-expanded', String(expanded))
    button.textContent = expanded
      ? this.t('diffViewer.collapseAll')
      : this.t('diffViewer.expandFold', { count: fold.count })
    cell.append(button)
    row.append(cell)
    return row
  }

  private onRowsClick = (event: Event): void => {
    const target = event.target as HTMLElement | null
    const button = target?.closest<HTMLButtonElement>('[part="fold-toggle"]')
    if (!button) return
    const foldRow = button.closest<HTMLElement>('[data-fold]')
    if (!foldRow) return
    const fold = this.layout.folds.find((item) => item.index === Number(foldRow.getAttribute('data-fold')))
    if (fold) this.toggleFold(fold)
  }

  private onScroll = (): void => {
    if (!this.viewportEl) return
    this.scrollOffset = this.viewportEl.scrollTop
    // 非虚拟布局滚动不改变渲染窗口；重建会替换行节点并丢失折叠按钮焦点
    if (!this.virtualEnabled(this.visibleRows().length)) return
    this.syncRows()
  }

  private onViewportFocus = (): void => {
    if (!this.viewportEl) return
    if (this.viewportEl.getAttribute('aria-activedescendant')) return
    // 指针滚动后活动行可能不在窗口内：聚焦时把活动行落到当前窗口首行，保证 aria-activedescendant 有效
    const first = this.rowsEl?.querySelector<HTMLElement>('[part="row"], [part="fold"]')
    const index = Number(first?.getAttribute('data-index') ?? 0)
    this.activeIndex = Number.isFinite(index) ? index : 0
    this.syncRows()
  }

  private onResize = (): void => {
    const width = this.clientWidth
    if (width > 0) this.widthMeasured = true
    this.syncChrome()
    this.syncRows()
  }

  private onExpandAll = (): void => {
    this.expandAll()
  }

  private onCollapseAll = (): void => {
    this.collapseAll()
  }

  private onKeydown = (event: KeyboardEvent): void => {
    // 焦点在折叠按钮等内部控件时交给原生行为，避免「回车展开的是活动行而不是当前按钮」
    if (event.target !== this.viewportEl) return
    const rows = this.visibleRows()
    if (rows.length === 0) return
    const page = this.hasAttr('wrap') ? 5 : Math.max(1, Math.floor(this.viewportHeight() / this.rowHeightPx()))
    let next: number | null = null
    if (event.key === 'ArrowDown') next = this.activeIndex + 1
    else if (event.key === 'ArrowUp') next = this.activeIndex - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = rows.length - 1
    else if (event.key === 'PageDown') next = this.activeIndex + page
    else if (event.key === 'PageUp') next = this.activeIndex - page
    else if (event.key === 'Enter' || event.key === ' ') {
      const row = rows[this.activeIndex]
      if (row?.kind === 'fold') {
        event.preventDefault()
        this.toggleFold(row)
      }
      return
    }
    if (next == null) return
    event.preventDefault()
    this.setActive(next, true)
  }

  private setActive(index: number, scroll: boolean): void {
    const rows = this.visibleRows()
    if (rows.length === 0) return
    this.activeIndex = Math.min(rows.length - 1, Math.max(0, index))
    const wrap = this.hasAttr('wrap')
    // wrap 模式行高自适应：先渲染一行再按真实 offset 计算落点；非虚拟布局无需二次重建
    if (scroll && wrap) this.syncRows()
    if (scroll && this.viewportEl) {
      const viewport = this.viewportEl
      const rowH = this.rowHeightPx()
      const viewTop = viewport.scrollTop
      const viewBottom = viewTop + this.viewportHeight()
      if (wrap) {
        const rowEl = this.shadow.getElementById(String(rows[this.activeIndex]!.id))
        if (rowEl) {
          const top = rowEl.offsetTop
          const height = rowEl.offsetHeight || rowH
          if (top < viewTop) viewport.scrollTop = top
          else if (top + height > viewBottom) viewport.scrollTop = top + height - this.viewportHeight()
        }
      } else {
        const top = this.activeIndex * rowH
        if (top < viewTop) viewport.scrollTop = top
        else if (top + rowH > viewBottom) viewport.scrollTop = top + rowH - this.viewportHeight()
      }
      this.scrollOffset = viewport.scrollTop
    }
    if (!wrap || !scroll) this.syncRows()
  }

  private toggleFold(fold: DiffFoldRow): void {
    const expanded = !this.expandedFolds.has(fold.index)
    if (expanded) this.expandedFolds.add(fold.index)
    else this.expandedFolds.delete(fold.index)
    // 展开按钮/键盘展开后把焦点交还视口，避免按钮被替换导致焦点掉回 body
    const foldIndex = this.visibleRows().findIndex((row) => row.kind === 'fold' && row.index === fold.index)
    if (foldIndex >= 0) this.activeIndex = foldIndex
    this.requestUpdate()
    this.viewportEl?.focus()
    const detail: DiffViewerHunkToggleDetail = {
      index: fold.hunkIndex,
      expanded,
      start: fold.start,
      count: fold.count,
    }
    this.emit('hunk-toggle', detail)
  }

  private emitFoldChanges(indexes: Iterable<number>, expanded: boolean): void {
    for (const index of indexes) {
      const fold = this.layout.folds.find((item) => item.index === index)
      if (!fold) continue
      this.emit('hunk-toggle', {
        index: fold.hunkIndex,
        expanded,
        start: fold.start,
        count: fold.count,
      } satisfies DiffViewerHunkToggleDetail)
    }
  }

  /** 展开全部未修改区块（每个折叠区间派发一次 `oas-hunk-toggle`，`expanded: true`） */
  expandAll(): void {
    const changed: number[] = []
    for (const fold of this.layout.folds) {
      if (!this.expandedFolds.has(fold.index)) changed.push(fold.index)
      this.expandedFolds.add(fold.index)
    }
    this.requestUpdate()
    this.emitFoldChanges(changed, true)
  }

  /** 收起全部未修改区块（每个被收起的折叠区间派发一次 `oas-hunk-toggle`，`expanded: false`） */
  collapseAll(): void {
    const changed = [...this.expandedFolds]
    this.expandedFolds.clear()
    this.requestUpdate()
    this.emitFoldChanges(changed, false)
  }

  /** 滚动到指定变更块并聚焦其首行；越界返回 false */
  scrollToChange(index: number): boolean {
    const hunk = this.layout.hunks.find((item) => item.index === index)
    if (!hunk) return false
    this.visibleRows()
    const row = this.effectiveMode() === 'split' ? (this.splitMap[hunk.startRow] ?? hunk.startRow) : hunk.startRow
    this.setActive(row, true)
    this.viewportEl?.focus()
    return true
  }
}

/** 内部行联合（统一视图行 / 并排视图行 / 折叠行） */
type DiffRowLike = DiffLineRow | SplitLineRow | DiffFoldRow
