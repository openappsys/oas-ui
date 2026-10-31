import { OASElement } from '@oas-ui/core'
import { devWarn } from '../../shared/dev-warn.js'
// slot 模板双形态克隆（静态 HTML 在 template.content；Vue 等 CSR 直插元素 childNodes）
import { cloneSlotContent } from '../../shared/slot-template.js'
import {
  buildJsonTree,
  collectAncestorPaths,
  encodeJsonPath,
  flattenVisible,
  parseJsonPath,
  searchJson,
  serializeJson,
  serializeValue,
  type JsonNode,
  type JsonRow,
  type JsonValue,
} from './json-model.js'

export interface JsonViewerToggleDetail {
  path: string
  expanded: boolean
}

export interface JsonViewerExpandedChangeDetail {
  paths: string[]
}

export interface JsonViewerSearchChangeDetail {
  query: string
  matches: number
  activeIndex: number
}

export interface JsonViewerParseErrorDetail {
  message: string
  line?: number
  column?: number
  source: string
}

export interface JsonViewerCopyDetail {
  path: string
  kind: 'path' | 'value' | 'json'
  text: string
}

/** 上次实际行渲染的签名：全部相等时才跳过行 DOM 重建 */
interface RowRenderSignature {
  rows: JsonRow[]
  rowsEl: HTMLElement
  start: number
  end: number
  rowH: number
  query: string
  activePath: string
  /** 上次渲染时是否存在自定义 toggle 模板（模板内容可在 light DOM 原地变更，必须重建才能重新 clone） */
  customToggle: boolean
}

const STYLE = `
:host {
  display: block;
  min-width: 0;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
}
:host([hidden]) { display: none; }
.viewer {
  position: relative;
  display: flex;
  flex-direction: column;
  height: var(--_oas-jv-height, var(--oas-json-viewer-height, 360px));
  overflow: hidden;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  box-sizing: border-box;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg-elevated, var(--oas-color-bg));
  flex: none;
}
.toolbar[hidden] { display: none; }
.search {
  flex: 1 1 140px;
  min-width: 80px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: inherit;
  font: inherit;
  box-sizing: border-box;
}
.search:focus-visible { outline: 2px solid var(--oas-color-primary); outline-offset: 1px; }
.count {
  min-width: 3.5em;
  color: var(--oas-color-text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.status {
  color: var(--oas-color-success-text);
  font-size: .9em;
  white-space: nowrap;
}
.status[data-state='error'] { color: var(--oas-color-danger-text); }
.copy-status {
  position: absolute;
  inset-block-end: 8px;
  inset-inline-end: 12px;
  z-index: 2;
  padding: 3px 10px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg-elevated);
  color: var(--oas-color-success-text);
  font-size: .9em;
  box-shadow: var(--oas-shadow-sm);
  pointer-events: none;
}
.copy-status[data-state='error'] { color: var(--oas-color-danger-text); }
.copy-status[hidden] { display: none; }
.btn {
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: inherit;
  font: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.btn:hover:not(:disabled) { background: var(--oas-color-bg-hover); }
.btn:focus-visible { outline: 2px solid var(--oas-color-primary); outline-offset: 1px; }
.btn:disabled { opacity: .5; cursor: default; }
.viewport {
  position: relative;
  flex: 1 1 auto;
  overflow: auto;
  overscroll-behavior: contain;
  overflow-anchor: none;
  outline: none;
  padding: 4px 0;
  box-sizing: border-box;
}
.viewport:focus-visible { outline: 2px solid var(--oas-color-primary); outline-offset: -2px; }
.measure {
  position: absolute;
  width: 1px;
  height: var(--_oas-jv-row-height, var(--oas-json-viewer-row-height, 24px));
  visibility: hidden;
  pointer-events: none;
}
.inner { position: relative; width: 100%; min-width: max-content; }
.row {
  position: absolute;
  inset-inline: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  height: var(--_oas-jv-row-height, var(--oas-json-viewer-row-height, 24px));
  padding-inline-end: 8px;
  box-sizing: border-box;
  cursor: default;
  white-space: nowrap;
  font-family: var(--oas-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  font-size: var(--oas-json-viewer-font-size, 12px);
  line-height: var(--_oas-jv-row-height, var(--oas-json-viewer-row-height, 24px));
  color: var(--oas-color-text-primary);
}
.row:hover { background: var(--oas-color-bg-hover); }
.row.active { background: var(--oas-color-bg-hover); }
.row.active .key,
.row.active .value,
.row.active .meta { color: var(--oas-color-text-primary); }
.twisty {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  user-select: none;
}
.twisty::before {
  content: '';
  width: 0;
  height: 0;
  border-block: 4px solid transparent;
  border-inline-start: 6px solid currentColor;
  transition: transform var(--oas-transition-fast, 120ms) ease;
}
.twisty[data-custom='true'] { width: auto; min-width: 1em; }
.twisty[data-custom='true']::before { display: none; }
.row[data-expanded='true'] .twisty::before { transform: rotate(90deg); }
:host(:dir(rtl)) .row[data-expanded='true'] .twisty::before { transform: rotate(-90deg); }
.row[data-container='false'] .twisty::before { display: none; }
.key { color: var(--oas-color-text-secondary); }
.key.root { color: var(--oas-color-text-primary); font-weight: 600; }
.value { color: var(--oas-color-text-primary); overflow: hidden; text-overflow: ellipsis; unicode-bidi: isolate; }
.value.string { color: var(--oas-color-success-text); }
.value.number { color: var(--oas-color-primary-text); }
.value.boolean { color: var(--oas-color-warning-text); }
.value.null { color: var(--oas-color-text-secondary); font-style: italic; }
.meta { color: var(--oas-color-text-secondary); font-size: .92em; }
.mark {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
  border-radius: 2px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 1px;
}
.placeholder { padding: 12px; color: var(--oas-color-text-secondary); }
.error { padding: 12px; color: var(--oas-color-danger-text); white-space: pre-wrap; }
:host([data-compact]) .row { font-size: 11px; }
:host([data-compact]) .toolbar { padding: 4px 6px; }
@media (prefers-reduced-motion: no-preference) {
  .row { transition: background-color var(--oas-transition-fast, 120ms) ease; }
}
`

function isContainer(node: JsonNode): boolean {
  return node.kind === 'object' || node.kind === 'array'
}

function isExpandable(node: JsonNode): boolean {
  return isContainer(node) && node.childCount > 0
}

function summary(node: JsonNode): string {
  if (node.kind === 'array') return `[…] ${node.childCount} ${node.childCount === 1 ? 'item' : 'items'}`
  if (node.kind === 'object') return `{…} ${node.childCount} ${node.childCount === 1 ? 'key' : 'keys'}`
  return serializeValue(node.value)
}

/** 只读 JSON 树查看器（`oas-json-viewer`） */
export class OASJsonViewer extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'text',
      'expanded',
      'default-expand-depth',
      'search',
      'height',
      'row-height',
      'virtual',
      'toolbar',
      'copyable',
      'search-shortcut',
      'compact',
      'indent',
      'aria-label',
    ]
  }

  private dataValue: JsonValue | null = null
  private hasData = false
  private root: JsonNode | null = null
  private nodeByPath = new Map<string, JsonNode>()
  private parseError: JsonViewerParseErrorDetail | null = null
  private lastErrorSource = ''
  private sourceDirty = true
  private sourceReady = false
  private hydratedSnapshot = false
  private expandedWarned = false

  private expandedSet = new Set<string>()
  private expandedControlled = false
  private transientExpanded = new Set<string>()

  private searchMatches: string[] = []
  private activeMatch = -1
  private searchBase: Set<string> | null = null
  private searchManual = new Map<string, boolean>()
  private lastSearchState = ''
  private searchCacheQuery = ''
  private searchCacheRoot: JsonNode | null = null
  private searchAppliedQuery = ''
  private searchNeedsScroll = false
  /** 命中集缓存点预计算的祖先展开集（去重），每次重绘只遍历，不重复解析路径 */
  private searchAutoAncestors: string[] = []

  private activePath = '$'
  private scrollOffset = 0
  private suppressUpdate = false
  private initialized = false
  private rowIds = new Map<string, string>()
  private rowIdSeq = 0

  /** 最近一次真实计算的可见行；仅滚动等「状态未变」的重绘复用 */
  private lastRows: JsonRow[] | null = null
  /** 可见行是否需要重新计算（数据源/展开状态/search 状态变化后置脏） */
  private rowsDirty = true
  private lastRenderSig: RowRenderSignature | null = null

  private viewerEl: HTMLElement | null = null
  private viewportEl: HTMLElement | null = null
  private innerEl: HTMLElement | null = null
  private rowsEl: HTMLElement | null = null
  private measureEl: HTMLElement | null = null
  private toolbarEl: HTMLElement | null = null
  private searchEl: HTMLInputElement | null = null
  private statusEl: HTMLElement | null = null
  private copyStatusEl: HTMLElement | null = null
  private copyStatusTimer: ReturnType<typeof setTimeout> | null = null
  private rowHeightCache = 0

  /**
   * 对象/数组通道（property）
   * @apiProperty
   */
  get data(): JsonValue | null {
    return this.dataValue
  }
  set data(value: JsonValue) {
    this.hasData = true
    this.dataValue = value as JsonValue
    this.initialized = false
    this.sourceDirty = true
    this.resetRowIds()
    this.suppressUpdate = true
    if (this.hasAttribute('text')) this.removeAttribute('text')
    this.suppressUpdate = false
    if (this.hasRendered) this.runUpdateAndNotify()
  }

  /**
   * JSON 原文（attribute/property；SSR 通道）
   * @apiProperty
   */
  get text(): string {
    return this.getAttribute('text') ?? ''
  }
  set text(value: string) {
    const same = this.getAttribute('text') === value
    this.hasData = false
    this.dataValue = null
    this.sourceDirty = true
    this.resetRowIds()
    if (same) {
      // 宿主重复写同值（受控回写/重试）仍触发一次更新，避免“属性没变就不渲染”的边界
      if (this.hasRendered) this.runUpdateAndNotify()
    } else {
      this.setAttribute('text', value)
    }
  }

  /**
   * 搜索关键词（property 通道，反射 search 属性）
   * @apiProperty
   */
  get search(): string {
    return this.getAttr('search', '')
  }
  set search(value: string) {
    this.setAttribute('search', value)
  }

  /**
   * 展开 path 数组（受控通道）
   * @apiProperty
   */
  get expanded(): string[] {
    return this.parseExpandedAttr()
  }
  set expanded(paths: string[]) {
    const next = JSON.stringify(paths)
    if (this.getAttribute('expanded') === next) {
      // 受控模式同值回写：清掉搜索临时展开并强制刷新，避免内部快照与属性脱节
      this.transientExpanded.clear()
      if (this.hasRendered) this.runUpdateAndNotify()
    } else {
      this.setAttribute('expanded', next)
    }
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (this.suppressUpdate) return
    if (name === 'expanded') {
      this.expandedControlled = newValue !== null
      // 宿主改写受控展开时，以属性为唯一数据源；搜索自动展开由其重新计算
      this.transientExpanded.clear()
      this.rowsDirty = true
    }
    if (name === 'text') {
      this.hasData = false
      this.dataValue = null
      this.initialized = false
      this.sourceDirty = true
      this.resetRowIds()
    }
    if (name === 'default-expand-depth') this.initialized = false
    super.attributeChangedCallback(name, oldValue, newValue)
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="viewer" part="viewer">
        <div class="toolbar" part="toolbar">
          <input class="search" part="search" type="search" />
          <span class="count" part="count"></span>
          <span class="status" part="status" aria-live="polite"></span>
          <button class="btn" part="prev" type="button"></button>
          <button class="btn" part="next" type="button"></button>
          <button class="btn" part="expand-all" type="button"></button>
          <button class="btn" part="collapse-all" type="button"></button>
          <button class="btn" part="copy-path" type="button"></button>
          <button class="btn" part="copy-value" type="button"></button>
          <button class="btn" part="copy-json" type="button"></button>
        </div>
        <div class="viewport" part="viewport" role="tree" tabindex="0"></div>
        <span class="copy-status" part="copy-status" role="status" aria-live="polite" hidden></span>
        <div class="measure" aria-hidden="true"></div>
      </div>
    `
    this.bind()
    this.onCleanup(() => {
      if (this.copyStatusTimer) clearTimeout(this.copyStatusTimer)
      this.copyStatusTimer = null
    })
    this.update()
  }

  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="viewport"]')) return false
    if (!this.shadow.querySelector('[part="toolbar"]')) return false
    this.viewerEl = this.shadow.querySelector('[part="viewer"]')
    this.viewportEl = this.shadow.querySelector('[part="viewport"]')
    this.innerEl = this.shadow.querySelector('[part="inner"]')
    this.rowsEl = this.shadow.querySelector('[part="rows"]')
    this.measureEl = this.shadow.querySelector('.measure')
    this.hydratedSnapshot = true
    this.bind()
    return true
  }

  protected override onReconnect(): void {
    this.bind()
  }

  private bind(): void {
    this.viewerEl = this.shadow.querySelector('[part="viewer"]')
    this.viewportEl = this.shadow.querySelector('[part="viewport"]')
    this.measureEl = this.shadow.querySelector('.measure')
    this.toolbarEl = this.shadow.querySelector('[part="toolbar"]')
    this.searchEl = this.shadow.querySelector('[part="search"]')
    this.statusEl = this.shadow.querySelector('[part="status"]')
    this.copyStatusEl = this.shadow.querySelector('[part="copy-status"]')

    const on = (part: string, fn: () => void) => {
      const el = this.shadow.querySelector<HTMLElement>(`[part="${part}"]`)
      el?.addEventListener('click', fn)
      this.onCleanup(() => el?.removeEventListener('click', fn))
    }
    on('prev', () => this.searchPrev())
    on('next', () => this.searchNext())
    on('expand-all', () => this.expandAll())
    on('collapse-all', () => this.collapseAll())
    on('copy-path', () => void this.copyPath())
    on('copy-value', () => void this.copyValue())
    on('copy-json', () => void this.copyJson())

    if (this.searchEl) {
      const input = this.searchEl
      const onInput = (): void => this.setAttribute('search', input.value)
      input.addEventListener('input', onInput)
      this.onCleanup(() => input.removeEventListener('input', onInput))
    }
    if (this.viewportEl) {
      const viewport = this.viewportEl
      const onScroll = (): void => {
        this.scrollOffset = viewport.scrollTop
        // 滚动不改变树/展开状态：复用最近一次完整计算的可见行
        this.renderRows(false, true)
      }
      const onKey = (e: KeyboardEvent): void => this.handleKey(e)
      const onClick = (e: MouseEvent): void => this.handleClick(e)
      viewport.addEventListener('scroll', onScroll, { passive: true })
      viewport.addEventListener('keydown', onKey)
      viewport.addEventListener('click', onClick)
      this.onCleanup(() => {
        viewport.removeEventListener('scroll', onScroll)
        viewport.removeEventListener('keydown', onKey)
        viewport.removeEventListener('click', onClick)
      })
    }
    const onHostKey = (e: KeyboardEvent): void => this.handleHostKey(e)
    this.addEventListener('keydown', onHostKey)
    this.onCleanup(() => this.removeEventListener('keydown', onHostKey))
  }

  protected override update(): void {
    this.expandedControlled = this.hasAttribute('expanded')
    if (this.expandedControlled) {
      this.expandedSet = new Set(this.parseExpandedAttr())
      this.rowsDirty = true
    }
    this.syncData()
    if (!this.initialized && this.root) {
      this.initialized = true
      if (!this.expandedControlled) {
        this.expandedSet = this.initialExpanded()
        this.rowsDirty = true
      }
    }
    if (this.hasAttribute('height')) {
      this.style.setProperty('--_oas-jv-height', `${this.heightPx()}px`)
    } else {
      this.style.removeProperty('--_oas-jv-height')
    }
    if (this.hasAttribute('row-height') || this.hasAttribute('compact')) {
      this.style.setProperty('--_oas-jv-row-height', `${this.rowHeightPx()}px`)
    } else {
      this.style.removeProperty('--_oas-jv-row-height')
    }
    this.rowHeightCache = 0
    this.syncToolbar()
    if (
      this.hydratedSnapshot &&
      !this.hasData &&
      this.parseError === null &&
      this.root &&
      this.rowsEl &&
      !this.getAttr('search', '').trim()
    ) {
      // DSD 首帧已有完整行结构：只建模型/重绑，不重建 DOM
      this.hydratedSnapshot = false
      this.viewportEl?.setAttribute('role', 'tree')
    } else {
      this.hydratedSnapshot = false
      this.renderRows()
    }
  }

  private syncData(): void {
    // 只有数据源变化才重建树；search/height/row-height/expanded 等属性变化不重解析 10k 节点
    if (this.sourceReady && !this.sourceDirty) return
    this.sourceDirty = false
    this.sourceReady = true
    // 数据源/根节点变化：可见行必须重新计算，禁止滚动复用陈旧数组
    this.rowsDirty = true
    this.parseError = null
    let source = ''
    try {
      if (this.hasData) {
        this.root = buildJsonTree(this.dataValue)
        this.lastErrorSource = ''
      } else {
        const text = this.getAttribute('text')
        if (text === null || text.trim() === '') {
          this.root = null
          return
        }
        source = text
        this.root = buildJsonTree(JSON.parse(text))
        this.lastErrorSource = ''
      }
      if (!this.root) return
      this.nodeByPath.clear()
      const walk = (node: JsonNode): void => {
        this.nodeByPath.set(node.path, node)
        for (const child of node.children ?? []) walk(child)
      }
      walk(this.root)
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error)
      // 深嵌套会在建树/遍历时触发 RangeError：转为可恢复错误态，而不是抛给宿主
      const message = error instanceof RangeError ? this.t('jsonViewer.tooDeep') : raw
      const detail = this.parseErrorMessage(message, source)
      this.parseError = detail
      this.root = null
      const key = source || `data:${message}`
      if (this.lastErrorSource !== key) {
        this.lastErrorSource = key
        this.emit('parse-error', detail)
      }
      return
    }
    if (!this.nodeByPath.has(this.activePath)) this.activePath = '$'
    this.searchAppliedQuery = ''
  }

  private parseErrorMessage(message: string, source: string): JsonViewerParseErrorDetail {
    const match = /position\s+(\d+)/i.exec(message)
    if (!match) return { message, source }
    const position = Number(match[1])
    const before = source.slice(0, position)
    const line = before.split('\n').length
    const column = position - before.lastIndexOf('\n')
    return { message, line, column, source }
  }

  private parseExpandedAttr(): string[] {
    const raw = this.getAttribute('expanded')
    if (raw === null || raw.trim() === '') return []
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      this.expandedWarned = false
      return parsed.filter((item): item is string => typeof item === 'string')
    } catch {
      if (!this.expandedWarned) {
        this.expandedWarned = true
        devWarn('[oas-json-viewer] expanded 需要 JSON 字符串数组，已回退空展开')
      }
      return []
    }
  }

  private initialExpanded(): Set<string> {
    const depth = Number(this.getAttr('default-expand-depth', '1'))
    const maxDepth = Number.isFinite(depth) && depth >= 0 ? depth : 1
    const out = new Set<string>()
    if (!this.root) return out
    const walk = (node: JsonNode): void => {
      if (!isExpandable(node)) return
      if (node.depth < maxDepth) out.add(node.path)
      for (const child of node.children ?? []) walk(child)
    }
    walk(this.root)
    return out
  }

  private isExpanded(path: string): boolean {
    if (this.transientExpanded.has(path)) return true
    return this.expandedSet.has(path)
  }

  private setExpanded(path: string, expanded: boolean): void {
    // 搜索期间手动收起要立即压过自动展开的 transient 状态
    if (!expanded) this.transientExpanded.delete(path)
    if (this.getAttr('search', '').trim() !== '') {
      this.searchManual.set(path, expanded)
      // 手动展开子节点时把祖先一并记为手动展开，清空搜索后仍能看见
      if (expanded) {
        for (const ancestor of collectAncestorPaths(path)) this.searchManual.set(ancestor, true)
      }
    }
    // 展开状态变化：可见行必须重算
    this.rowsDirty = true
    if (this.expandedControlled) {
      this.emit('toggle', { path, expanded } satisfies JsonViewerToggleDetail)
      // 收起搜索自动展开的祖先时，transient 已移除；立即重绘让用户看到反馈（仍不写回 expanded）
      this.renderRows(true)
      return
    }
    if (expanded) this.expandedSet.add(path)
    else this.expandedSet.delete(path)
    this.emit('toggle', { path, expanded } satisfies JsonViewerToggleDetail)
    this.renderRows(true)
  }

  private visibleRows(): JsonRow[] {
    const rows = this.root ? flattenVisible(this.root, (path) => this.isExpanded(path)) : []
    // 每次真实计算都刷新缓存，供同状态下的滚动/键盘重绘复用
    this.lastRows = rows
    this.rowsDirty = false
    return rows
  }

  private renderRows(ensureActive = false, reuseRows = false): void {
    const viewport = this.viewportEl
    if (!viewport) return
    if (!this.root) {
      // 错误/空态没有 treeitem：保留 tree 角色会触发 aria-required-children
      viewport.setAttribute('role', 'group')
      viewport.innerHTML = this.parseError
        ? `<div class="error" part="error" role="alert">${this.escapeHtml(this.errorText())}</div>`
        : `<div class="placeholder" part="empty">${this.escapeHtml(this.t('jsonViewer.empty'))}</div>`
      viewport.removeAttribute('aria-activedescendant')
      this.innerEl = null
      this.rowsEl = null
      // 空/错误态不保留行缓存，避免恢复时命中陈旧签名
      this.lastRows = null
      this.rowsDirty = true
      this.lastRenderSig = null
      this.syncToolbar()
      return
    }
    if (!this.rowsEl) {
      viewport.innerHTML =
        '<div class="inner" part="inner" role="none"><div class="rows" part="rows" role="none"></div></div>'
      this.innerEl = viewport.querySelector('[part="inner"]')
      this.rowsEl = viewport.querySelector('[part="rows"]')
    }
    if (!this.innerEl || !this.rowsEl) return
    viewport.setAttribute('role', 'tree')
    const query = this.getAttr('search', '').trim()
    this.syncSearch(query)
    // 状态未变的重绘（滚动等）复用最近一次完整计算的可见行
    const rows = reuseRows && !this.rowsDirty && this.lastRows ? this.lastRows : this.visibleRows()
    const rowH = this.rowHeightPx()
    this.innerEl.style.height = `${rows.length * rowH}px`
    const shouldEnsure = ensureActive || this.searchNeedsScroll
    this.searchNeedsScroll = false
    // activeIndex 只算一次：滚动校正与 aria-activedescendant 共用
    const activeIndex = rows.findIndex((row) => row.node.path === this.activePath)
    if (shouldEnsure && activeIndex >= 0) {
      const viewportH = this.viewportHeight()
      const top = activeIndex * rowH
      if (top < this.scrollOffset) viewport.scrollTop = top
      else if (top + rowH > this.scrollOffset + viewportH) viewport.scrollTop = top + rowH - viewportH
      this.scrollOffset = viewport.scrollTop
    }
    // 滚动校正后再算窗口，避免 active 行被校正到窗口外导致 aria-activedescendant 指向未渲染节点
    const { start, end } = this.windowBounds(rows.length)
    const rowsEl = this.rowsEl
    const sig = this.lastRenderSig
    // 自定义 toggle 模板可从 light DOM 原地变更（无属性变化、无 update），每次渲染都要重新 clone
    const customToggle = this.hasCustomToggleTemplate()
    const canReuseRows =
      !shouldEnsure &&
      !customToggle &&
      sig !== null &&
      sig.rows === rows &&
      sig.rowsEl === rowsEl &&
      sig.start === start &&
      sig.end === end &&
      sig.rowH === rowH &&
      sig.query === query &&
      sig.activePath === this.activePath &&
      // 上次有模板 / 这次没有（或反之）都必须重建：不能只剩 !customToggle 判断
      sig.customToggle === customToggle
    if (!canReuseRows) {
      rowsEl.innerHTML = ''
      for (let i = start; i < end; i++) {
        rowsEl.appendChild(this.renderRow(rows[i]!, i, query))
      }
      this.lastRenderSig = { rows, rowsEl, start, end, rowH, query, activePath: this.activePath, customToggle }
    }
    if (activeIndex >= start && activeIndex < end) {
      viewport.setAttribute('aria-activedescendant', this.rowId(this.activePath))
    } else {
      viewport.removeAttribute('aria-activedescendant')
    }
    viewport.setAttribute('aria-busy', 'false')
    this.syncToolbar()
  }

  private rowHeightPx(): number {
    if (this.rowHeightCache > 0) return this.rowHeightCache
    let height = 24
    const explicit = this.getAttr('row-height', '')
    if (explicit) {
      const value = Number(explicit)
      height = Number.isFinite(value) && value >= 20 ? value : this.hasAttribute('compact') ? 20 : 24
    } else if (this.hasAttribute('compact')) {
      height = 20
    } else {
      // CSS 变量可能是 rem/em/calc：用隐藏测量行反推实际 px，避免与行定位失配
      const measured = this.measureEl?.getBoundingClientRect().height ?? 0
      if (measured > 0) {
        height = Math.round(measured * 100) / 100
      } else {
        try {
          const css = Number.parseFloat(getComputedStyle(this).getPropertyValue('--oas-json-viewer-row-height'))
          if (Number.isFinite(css) && css >= 20) height = css
        } catch {
          /* SSR / 无样式环境回落固定值 */
        }
      }
    }
    this.rowHeightCache = height
    return height
  }

  private heightPx(): number {
    const raw = Number(this.getAttr('height', '360'))
    return Number.isFinite(raw) && raw > 0 ? raw : 360
  }

  private viewportHeight(): number {
    const client = this.viewportEl?.clientHeight ?? 0
    if (client > 0) return client
    // 隐藏/SSR 环境 clientHeight=0：尽量用 CSS 计算高度，保证公共 height 变量参与窗口计算
    try {
      const css = Number.parseFloat(getComputedStyle(this.viewerEl ?? this).height)
      if (Number.isFinite(css) && css > 0) return Math.max(60, css - 40)
    } catch {
      /* 无样式环境走 height 属性回退 */
    }
    return Math.max(60, this.heightPx() - 40)
  }

  private virtualEnabled(count: number): boolean {
    if (this.getAttr('virtual', '') === 'false') return false
    return count > 200
  }

  private windowBounds(count: number): { start: number; end: number } {
    if (!this.virtualEnabled(count)) return { start: 0, end: count }
    const rowH = this.rowHeightPx()
    const viewport = this.viewportHeight()
    const buffer = 8
    const start = Math.min(count, Math.max(0, Math.floor(this.scrollOffset / rowH) - buffer))
    const end = Math.min(count, Math.ceil((this.scrollOffset + viewport) / rowH) + buffer)
    return { start, end: Math.max(start, end) }
  }

  private syncToolbar(): void {
    const toolbar = this.toolbarEl
    const showToolbar = this.getAttr('toolbar', '') !== 'false'
    if (toolbar) toolbar.hidden = !showToolbar
    const copyable = this.getAttr('copyable', '') !== 'false'
    for (const part of ['copy-path', 'copy-value', 'copy-json']) {
      const el = this.shadow.querySelector<HTMLElement>(`[part="${part}"]`)
      if (el) el.hidden = !copyable
    }
    const labels: Array<[string, string]> = [
      ['search', this.t('jsonViewer.search')],
      ['prev', this.t('jsonViewer.prev')],
      ['next', this.t('jsonViewer.next')],
      ['expand-all', this.t('jsonViewer.expandAll')],
      ['collapse-all', this.t('jsonViewer.collapseAll')],
      ['copy-path', this.t('jsonViewer.copyPath')],
      ['copy-value', this.t('jsonViewer.copyValue')],
      ['copy-json', this.t('jsonViewer.copyJson')],
    ]
    for (const [part, label] of labels) {
      const el = this.shadow.querySelector<HTMLElement>(`[part="${part}"]`)
      if (!el) continue
      if (el.tagName === 'INPUT') {
        const input = el as HTMLInputElement
        input.placeholder = label
        input.setAttribute('aria-label', label)
        const next = this.getAttr('search', '')
        if (input.value !== next) input.value = next
      } else {
        el.textContent = label
      }
    }
    const count = this.shadow.querySelector<HTMLElement>('[part="count"]')
    if (count) {
      const query = this.getAttr('search', '').trim()
      count.textContent = !query
        ? ''
        : this.searchMatches.length
          ? this.t('jsonViewer.matches', {
              current: this.activeMatch + 1,
              total: this.searchMatches.length,
            })
          : this.t('jsonViewer.noMatches')
    }
    const viewport = this.viewportEl
    if (viewport) {
      const label = this.getAttribute('aria-label')?.trim() || this.t('jsonViewer.tree')
      viewport.setAttribute('aria-label', label)
    }
    this.toggleAttribute('data-compact', this.hasAttribute('compact'))
  }

  private renderRow(row: JsonRow, index: number, query: string): HTMLElement {
    const el = document.createElement('div')
    el.className = 'row'
    if (row.node.path === this.activePath) el.classList.add('active')
    el.setAttribute('part', 'row')
    el.setAttribute('role', 'treeitem')
    el.setAttribute('id', this.rowId(row.node.path))
    el.setAttribute('data-path', row.node.path)
    el.setAttribute('data-kind', row.node.kind)
    el.setAttribute('data-container', String(isExpandable(row.node)))
    el.setAttribute('data-expanded', String(row.expanded))
    el.setAttribute('aria-level', String(row.level))
    el.setAttribute('aria-posinset', String(row.posinset))
    el.setAttribute('aria-setsize', String(row.setsize))
    if (isExpandable(row.node)) el.setAttribute('aria-expanded', String(row.expanded))
    el.style.top = `${index * this.rowHeightPx()}px`
    el.style.height = `${this.rowHeightPx()}px`
    el.style.paddingInlineStart = `${(row.level - 1) * 16 + 4}px`

    const twisty = document.createElement('span')
    twisty.className = 'twisty'
    twisty.setAttribute('part', 'twisty')
    twisty.setAttribute('aria-hidden', 'true')
    if (isExpandable(row.node)) {
      const template = row.expanded
        ? this.querySelector<HTMLTemplateElement>('template[slot="toggle-expanded"]')
        : this.querySelector<HTMLTemplateElement>('template[slot="toggle-collapsed"]')
      if (template) {
        twisty.setAttribute('data-custom', 'true')
        twisty.appendChild(cloneSlotContent(template))
      }
    }
    el.appendChild(twisty)

    const key = document.createElement('span')
    key.className = row.node.path === '$' ? 'key root' : 'key'
    key.setAttribute('part', 'key')
    const keyText =
      row.node.path === '$'
        ? '$'
        : typeof row.node.key === 'number'
          ? `[${row.node.key}]`
          : `${JSON.stringify(row.node.key)}:`
    appendHighlighted(key, keyText, query)
    el.appendChild(key)

    const value = document.createElement('span')
    value.className = `value ${row.node.kind}`
    value.setAttribute('part', 'value')
    if (isContainer(row.node)) {
      value.textContent = summary(row.node)
    } else {
      const text = serializeJson(row.node.value, this.indentSize())
      appendHighlighted(value, text, query)
      value.title = text
    }
    el.appendChild(value)
    return el
  }

  /** 是否存在任意自定义 toggle 模板（模板内容不代表渲染签名，命中跳过会留下旧 clone） */
  private hasCustomToggleTemplate(): boolean {
    return this.querySelector('template[slot="toggle-expanded"], template[slot="toggle-collapsed"]') !== null
  }

  private indentSize(): number {
    const raw = Number(this.getAttr('indent', '2'))
    return Number.isFinite(raw) && raw >= 0 ? raw : 2
  }

  private resetRowIds(): void {
    this.rowIds.clear()
    this.rowIdSeq = 0
  }

  private rowId(path: string): string {
    let id = this.rowIds.get(path)
    if (!id) {
      id = `oas-json-row-${++this.rowIdSeq}`
      this.rowIds.set(path, id)
    }
    return id
  }

  private syncSearch(query: string): void {
    if (!query) {
      // 只有搜索引入的展开被收回时才需要重算；scrollToPath 的 transient 不在 searchBase 分支内清除
      const hadSearchExpansion = this.searchBase !== null
      if (this.searchBase) {
        if (!this.expandedControlled) {
          const restored = new Set(this.searchBase)
          for (const [path, expanded] of this.searchManual) {
            if (expanded) restored.add(path)
            else restored.delete(path)
          }
          this.expandedSet = restored
        }
        this.searchBase = null
        this.searchManual.clear()
        this.transientExpanded.clear()
      }
      this.searchMatches = []
      this.searchAutoAncestors = []
      this.activeMatch = -1
      const previousSearchState = this.lastSearchState
      this.lastSearchState = ''
      this.searchCacheQuery = ''
      this.searchCacheRoot = null
      this.searchAppliedQuery = ''
      this.searchNeedsScroll = false
      // 清空搜索会收回自动展开的祖先：可见行必须重算
      if (hadSearchExpansion) this.rowsDirty = true
      if (previousSearchState) {
        // 清空搜索也要发一次 matches=0 / activeIndex=-1，宿主才能同步清除命中状态
        const state = `${query}\u0000${this.searchMatches.length}\u0000${this.activeMatch}`
        if (state !== previousSearchState) {
          this.lastSearchState = state
          this.emit('search-change', { query, matches: 0, activeIndex: -1 })
        }
      }
      return
    }
    if (!this.searchBase) {
      this.searchBase = new Set(this.expandedSet)
      this.searchManual.clear()
    }
    if (this.searchCacheQuery !== query || this.searchCacheRoot !== this.root) {
      this.searchMatches = searchJson(this.root!, query)
      this.searchCacheQuery = query
      this.searchCacheRoot = this.root
      // 与命中集同一缓存点预计算去重的祖先展开集：每次重绘只遍历数组，不重复解析路径
      const ancestors = new Set<string>()
      for (const match of this.searchMatches) {
        for (const ancestor of collectAncestorPaths(match)) ancestors.add(ancestor)
      }
      this.searchAutoAncestors = [...ancestors]
      this.rowsDirty = true
    }
    const queryChanged = this.searchAppliedQuery !== query
    if (queryChanged) {
      this.searchAppliedQuery = query
      // 新查询从第一个命中开始；后续方向键/点击不得被重绘覆盖
      this.activeMatch = this.searchMatches.length ? 0 : -1
      if (this.searchMatches.length) {
        this.activePath = this.searchMatches[0]!
        this.searchNeedsScroll = true
      }
      this.rowsDirty = true
    }
    for (const ancestor of this.searchAutoAncestors) {
      // 搜索期间手动收起的路径，不被本轮自动展开重新顶开
      if (this.searchManual.get(ancestor) === false) continue
      this.transientExpanded.add(ancestor)
    }
    if (this.searchMatches.length && (this.activeMatch < 0 || this.activeMatch >= this.searchMatches.length)) {
      this.activeMatch = 0
    }
    const state = `${query}\u0000${this.searchMatches.length}\u0000${this.activeMatch}`
    if (state !== this.lastSearchState) {
      this.lastSearchState = state
      this.emit('search-change', {
        query,
        matches: this.searchMatches.length,
        activeIndex: this.searchMatches.length ? this.activeMatch : -1,
      } satisfies JsonViewerSearchChangeDetail)
    }
  }

  private handleClick(e: MouseEvent): void {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[part="row"]')
    if (!row) return
    const path = row.getAttribute('data-path')
    if (!path) return
    this.activePath = path
    const node = this.nodeByPath.get(path)
    if (node && isExpandable(node)) this.setExpanded(path, !this.isExpanded(path))
    else this.renderRows()
  }

  private handleKey(e: KeyboardEvent): void {
    const rows = this.visibleRows()
    if (!rows.length) return
    let index = rows.findIndex((row) => row.node.path === this.activePath)
    if (index < 0) index = 0
    const row = rows[index]!
    const node = row.node
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.activePath = rows[Math.min(rows.length - 1, index + 1)]!.node.path
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.activePath = rows[Math.max(0, index - 1)]!.node.path
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.activePath = rows[0]!.node.path
    } else if (e.key === 'End') {
      e.preventDefault()
      this.activePath = rows.at(-1)!.node.path
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (isExpandable(node) && !this.isExpanded(node.path)) this.setExpanded(node.path, true)
      else if (isExpandable(node)) {
        const next = rows[index + 1]
        if (next && next.node.depth > node.depth) this.activePath = next.node.path
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (isExpandable(node) && this.isExpanded(node.path)) this.setExpanded(node.path, false)
      else {
        const parent = rows
          .slice(0, index)
          .reverse()
          .find((r) => r.node.depth < node.depth)
        if (parent) this.activePath = parent.node.path
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (isExpandable(node)) this.setExpanded(node.path, !this.isExpanded(node.path))
    } else {
      return
    }
    // 本次按键已算过可见行：仅在展开状态未变时复用，避免多算一次
    this.renderRows(true, true)
  }

  private handleHostKey(e: KeyboardEvent): void {
    if (this.getAttr('search-shortcut', '') === 'false') return
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'f') return
    if (!this.containsFocus()) return
    e.preventDefault()
    this.searchEl?.focus()
  }

  private containsFocus(): boolean {
    try {
      return this.shadow.activeElement !== null || document.activeElement === this
    } catch {
      return document.activeElement === this
    }
  }

  private errorText(): string {
    if (!this.parseError) return ''
    const at = this.parseError.line ? ` (${this.parseError.line}:${this.parseError.column})` : ''
    return `${this.t('jsonViewer.parseError')}${at}\n${this.parseError.message}`
  }

  private escapeHtml(text: string): string {
    return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  }

  /** 全部展开（受控派发 oas-expanded-change） */
  expandAll(): void {
    if (!this.root) return
    const paths: string[] = []
    const walk = (node: JsonNode): void => {
      if (!isExpandable(node)) return
      paths.push(node.path)
      for (const child of node.children ?? []) walk(child)
    }
    walk(this.root)
    this.applyBulk(paths)
  }

  /** 全部收起 */
  collapseAll(): void {
    this.applyBulk([])
  }

  /** 展开到指定深度：0 只留根，1 根+子级，依此类推 */
  expandToDepth(depth: number): void {
    if (!this.root) return
    const max = Number.isFinite(depth) && depth >= 0 ? depth : 0
    const paths: string[] = []
    const walk = (node: JsonNode): void => {
      if (!isExpandable(node)) return
      if (node.depth < max) paths.push(node.path)
      for (const child of node.children ?? []) walk(child)
    }
    walk(this.root)
    this.applyBulk(paths)
  }

  private applyBulk(paths: string[]): void {
    // 批量展开/收起改变可见行
    this.rowsDirty = true
    if (this.expandedControlled) {
      this.transientExpanded.clear()
      this.emit('expanded-change', { paths } satisfies JsonViewerExpandedChangeDetail)
      this.renderRows(true)
      return
    }
    this.expandedSet = new Set(paths)
    this.transientExpanded.clear()
    this.emit('expanded-change', { paths } satisfies JsonViewerExpandedChangeDetail)
    this.renderRows(true)
  }

  /** 滚动到指定 path（自动展开折叠祖先） */
  scrollToPath(path: string): void {
    const segments = parseJsonPath(path)
    if (!segments || !this.root) return
    const canonical = encodeJsonPath(segments)
    if (!this.nodeByPath.has(canonical)) return
    for (const ancestor of collectAncestorPaths(canonical)) this.transientExpanded.add(ancestor)
    this.activePath = canonical
    // 祖先展开改变了可见行：先完整计算一次，并保留在 lastRows 供定位后复用
    this.rowsDirty = true
    this.renderRows()
    const rows = this.lastRows ?? []
    const index = rows.findIndex((row) => row.node.path === canonical)
    if (index < 0) return
    const viewport = this.viewportEl
    if (viewport) viewport.scrollTop = Math.max(0, index * this.rowHeightPx() - this.viewportHeight() / 2)
    this.scrollOffset = viewport?.scrollTop ?? this.scrollOffset
    // 定位后的重绘只更新窗口，不重复 flattenVisible
    this.renderRows(false, true)
  }

  /** 跳到下一个搜索命中（循环） */
  searchNext(): void {
    if (!this.searchMatches.length) return
    this.activeMatch = (this.activeMatch + 1) % this.searchMatches.length
    this.activePath = this.searchMatches[this.activeMatch]!
    this.renderRows(true)
  }

  /** 跳到上一个搜索命中（循环） */
  searchPrev(): void {
    if (!this.searchMatches.length) return
    this.activeMatch = (this.activeMatch - 1 + this.searchMatches.length) % this.searchMatches.length
    this.activePath = this.searchMatches[this.activeMatch]!
    this.renderRows(true)
  }

  /** 复制 JSONPath（默认当前活动节点） */
  async copyPath(path: string = this.activePath): Promise<boolean> {
    return this.copy(path, 'path', path)
  }

  /** 复制值：原始值原文，容器格式化 JSON */
  async copyValue(path: string = this.activePath): Promise<boolean> {
    const node = this.nodeByPath.get(path)
    if (!node) return false
    const text = this.serializeForCopy(path, 'value', () => serializeValue(node.value, this.indentSize()))
    if (text === null) return false
    return this.copy(path, 'value', text)
  }

  /** 复制子树 JSON */
  async copyJson(path: string = this.activePath): Promise<boolean> {
    const node = this.nodeByPath.get(path)
    if (!node) return false
    const text = this.serializeForCopy(path, 'json', () => serializeJson(node.value, this.indentSize()))
    if (text === null) return false
    return this.copy(path, 'json', text)
  }

  /** 序列化兜底：超深子树触发 RangeError 时转为复制失败，不向宿主抛错 */
  private serializeForCopy(path: string, kind: JsonViewerCopyDetail['kind'], serialize: () => string): string | null {
    try {
      return serialize()
    } catch (error) {
      this.emit('copy-error', { path, kind, text: '', error } satisfies JsonViewerCopyDetail & {
        error: unknown
      })
      this.setCopyStatus(this.t('jsonViewer.copyFailed'), true)
      return null
    }
  }

  private async copy(path: string, kind: JsonViewerCopyDetail['kind'], text: string): Promise<boolean> {
    const allowed = this.emit('copy', { path, kind, text } satisfies JsonViewerCopyDetail, {
      cancelable: true,
    })
    if (!allowed) return false
    this.setCopyStatus('')
    try {
      await navigator.clipboard.writeText(text)
      this.emit('copied', { path, kind, text } satisfies JsonViewerCopyDetail)
      this.setCopyStatus(this.t('jsonViewer.copied'))
      return true
    } catch (error) {
      this.emit('copy-error', { path, kind, text, error } satisfies JsonViewerCopyDetail & {
        error: unknown
      })
      this.setCopyStatus(this.t('jsonViewer.copyFailed'), true)
      return false
    }
  }

  private setCopyStatus(text: string, error = false): void {
    if (this.statusEl) {
      this.statusEl.textContent = text
      if (error) this.statusEl.setAttribute('data-state', 'error')
      else this.statusEl.removeAttribute('data-state')
    }
    // 工具栏隐藏时用浮层承担可见反馈（toolbar="false" 仍能感知复制成功/失败）
    if (!this.copyStatusEl) return
    if (this.copyStatusTimer) {
      clearTimeout(this.copyStatusTimer)
      this.copyStatusTimer = null
    }
    const overlay = this.getAttr('toolbar', '') === 'false' && text !== ''
    this.copyStatusEl.hidden = !overlay
    this.copyStatusEl.textContent = text
    if (error) this.copyStatusEl.setAttribute('data-state', 'error')
    else this.copyStatusEl.removeAttribute('data-state')
    if (overlay) {
      this.copyStatusTimer = setTimeout(() => {
        if (this.copyStatusEl) this.copyStatusEl.hidden = true
        this.copyStatusTimer = null
      }, 1600)
    }
  }
}

/** 高亮匹配子串（只处理纯文本节点） */
function appendHighlighted(parent: HTMLElement, text: string, query: string): void {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    parent.textContent = text
    return
  }
  const lower = text.toLowerCase()
  let cursor = 0
  let index = lower.indexOf(needle)
  if (index < 0) {
    parent.textContent = text
    return
  }
  while (index >= 0) {
    if (index > cursor) parent.appendChild(document.createTextNode(text.slice(cursor, index)))
    const mark = document.createElement('mark')
    mark.className = 'mark'
    mark.setAttribute('part', 'mark')
    mark.textContent = text.slice(index, index + needle.length)
    parent.appendChild(mark)
    cursor = index + needle.length
    index = lower.indexOf(needle, cursor)
  }
  if (cursor < text.length) parent.appendChild(document.createTextNode(text.slice(cursor)))
}
