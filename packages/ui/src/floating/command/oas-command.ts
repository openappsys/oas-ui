import { OASElement } from '@oas-ui/core'
import '../../data/virtual-list/index.js'
import type { OASVirtualList } from '../../data/virtual-list/index.js'

export interface CommandItem {
  /** 显示文案 */
  label: string
  /** 选中值（oas-select detail.value） */
  value: string
  /** 搜索关键词（可选），参与 label 之外的匹配 */
  keywords?: string[]
  /** 分组名（可选），同组项渲染分组标题 */
  group?: string
  disabled?: boolean
  /** 项图标：SVG path d 字符串或完整 <svg> 标记（宿主数据，视为可信内容） */
  icon?: string
  /** 快捷键标注（右对齐 kbd），如 "meta+p" / "ctrl+shift+s" */
  shortcut?: string
  /** 副标题（description） */
  description?: string
  /** 子页命令（嵌套页面）：选中进入子页，Esc/空搜索词 Backspace 面包屑回退 */
  page?: CommandItem[]
  /** 视图插槽名：选中进入 `<slot name="view-{view}">`（面板内嵌表单/视图） */
  view?: string
  /** 忽略过滤强制显示（创建型入口） */
  forceMount?: boolean
  /** 渲染为分隔行（不可导航/不可选中） */
  separator?: boolean
}

interface RecentEntry {
  value: string
  label: string
  icon?: string
  shortcut?: string
  description?: string
}

interface PageEntry {
  title: string
  view: string | null
  items: CommandItem[]
}

interface ScoredItem {
  item: CommandItem
  score: number
}

/** 快捷键标注的符号映射（键名 → 符号；未命中按字面大写渲染） */
const SHORTCUT_SYMBOLS: Record<string, string> = {
  meta: '⌘',
  cmd: '⌘',
  command: '⌘',
  ctrl: '⌃',
  control: '⌃',
  shift: '⇧',
  alt: '⌥',
  option: '⌥',
  opt: '⌥',
  esc: '⎋',
  escape: '⎋',
  enter: '↵',
  return: '↵',
  backspace: '⌫',
  delete: '⌦',
  tab: '⇥',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  space: '␣',
  spacebar: '␣',
}

const MAX_RECENTS = 10

/** 组件实例级 listbox 容器 id 的自增序列（aria-controls 唯一 id） */
let commandSeq = 0

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.overlay {
  position: fixed;
  inset: 0;
  background: var(--oas-color-overlay);
  z-index: var(--oas-z-modal, 1050);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 20vh;
  /* append-to portal host 为 pointer-events:none（不吞页面指针，pointer-events 可继承）——
     遮罩与面板显式恢复可交互 */
  pointer-events: auto;
}
/* 开合过渡：overlay 整体淡入（背景遮罩 + 面板随父淡入）、panel 自身轻微上移；
   只动 transform/opacity（command 无浮层定位测量，不污染测量；reduced-motion 关闭） */
.overlay:not([hidden]) {
  animation: oas-command-fade 160ms var(--oas-ease-out);
}
.overlay:not([hidden]) .panel {
  animation: oas-command-rise 160ms var(--oas-ease-out);
}
@keyframes oas-command-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes oas-command-rise {
  from {
    transform: translateY(8px);
  }
  to {
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .overlay:not([hidden]),
  .overlay:not([hidden]) .panel {
    animation: none;
  }
}
.overlay[hidden] {
  display: none;
}
.panel {
  box-sizing: border-box;
  width: 560px;
  max-width: 90vw;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  color: var(--oas-color-text-primary);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-2) var(--oas-space-3);
  border-bottom: 1px solid var(--oas-color-border);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.breadcrumb[hidden] {
  display: none;
}
.back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-sm);
  background: transparent;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  line-height: 1;
  cursor: pointer;
}
.back:hover {
  background: var(--oas-color-bg-hover);
}
.back:focus-visible {
  box-shadow: var(--oas-focus-ring);
  outline: none;
}
.crumbs {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  overflow: hidden;
  white-space: nowrap;
  min-width: 0;
}
.crumb + .crumb::before {
  content: '/';
  margin-inline-end: var(--oas-space-1);
  color: var(--oas-color-text-disabled);
}
.search {
  box-sizing: border-box;
  width: 100%;
  height: var(--oas-control-height-lg);
  padding: 0 var(--oas-space-3);
  border: none;
  border-bottom: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-lg);
  font-family: inherit;
  outline: none;
}
.search:focus {
  box-shadow: inset 0 -2px 0 var(--oas-color-primary);
}
.body {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.list {
  max-height: 40vh;
  overflow-y: auto;
  padding: var(--oas-space-1);
}
.list[hidden] {
  display: none;
}
.vlist[hidden] {
  display: none;
}
.group {
  padding: var(--oas-space-2) var(--oas-space-3) var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--oas-color-text-secondary);
}
.option {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
.option:hover {
  background: var(--oas-color-bg-hover);
}
.option.active,
.option.active:hover {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
.option[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.option-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex: none;
}
.option-icon svg {
  width: 16px;
  height: 16px;
  display: block;
}
.option-main {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  flex: 1;
}
.option-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.option-desc {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.option.active .option-desc {
  color: var(--oas-color-bg);
  opacity: 0.8;
}
mark.hl {
  background: color-mix(in srgb, var(--oas-color-primary) 20%, transparent);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}
.option.active mark.hl {
  background: color-mix(in srgb, var(--oas-color-bg) 25%, transparent);
}
.option-shortcut {
  margin-inline-start: auto;
  flex: none;
}
.option-shortcut kbd {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 5px;
  background: var(--oas-color-bg-hover);
  border: 1px solid var(--oas-color-border-strong);
  border-radius: var(--oas-radius-sm);
  box-shadow: inset 0 -2px 0 var(--oas-color-border);
  font-size: 11px;
  color: var(--oas-color-text-secondary);
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
}
.option-shortcut kbd .sep {
  color: var(--oas-color-text-disabled);
}
.option.active .option-shortcut kbd {
  background: color-mix(in srgb, var(--oas-color-bg) 20%, transparent);
  border-color: color-mix(in srgb, var(--oas-color-bg) 40%, transparent);
  box-shadow: none;
  color: var(--oas-color-bg);
}
.check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex: none;
  color: var(--oas-color-primary);
  font-size: 12px;
}
.check[hidden] {
  display: none;
}
.option.active .check {
  color: var(--oas-color-bg);
}
.separator {
  height: 1px;
  margin: var(--oas-space-1) var(--oas-space-3);
  background: var(--oas-color-border);
}
.loading-row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-4) var(--oas-space-3);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.spinner {
  width: 14px;
  height: 14px;
  flex: none;
  border: 2px solid var(--oas-color-border-strong);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-command-spin 0.8s linear infinite;
}
@keyframes oas-command-spin {
  to {
    transform: rotate(360deg);
  }
}
.empty {
  padding: var(--oas-space-5);
  text-align: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.empty[hidden] {
  display: none;
}
.view {
  padding: var(--oas-space-3);
}
.view[hidden] {
  display: none;
}
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2) var(--oas-space-3);
  border-top: 1px solid var(--oas-color-border);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.footer[hidden] {
  display: none;
}
.hints {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
}
.hints[hidden] {
  display: none;
}
.hint {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
}
.hint kbd {
  padding: 0 var(--oas-space-1);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg-hover);
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 10px;
  color: var(--oas-color-text-secondary);
}
.confirm {
  flex: none;
  border: none;
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  padding: var(--oas-space-1) var(--oas-space-3);
  font-size: var(--oas-font-size-xs);
  font-family: inherit;
  cursor: pointer;
}
.confirm:hover {
  background: var(--oas-color-primary-hover);
}
.confirm:focus-visible {
  box-shadow: var(--oas-focus-ring);
  outline: none;
}
.confirm[hidden] {
  display: none;
}
`

export class OASCommand extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'items',
      'open',
      'value',
      'selected',
      'hotkey',
      'should-filter',
      'loading',
      'limit',
      'recent',
      'recent-storage-key',
      'close-on-select',
      'multiple',
      'virtual',
      'item-height',
      'append-to',
    ]
  }

  private itemsList: CommandItem[] = []
  /** 当前页可见项（根 = items 属性，子页 = item.page 快照） */
  private activeItems: CommandItem[] = []
  private overlayEl: HTMLElement | null = null
  private panelEl: HTMLElement | null = null
  private listEl: HTMLElement | null = null
  private searchEl: HTMLInputElement | null = null
  private breadcrumbEl: HTMLElement | null = null
  private backBtn: HTMLButtonElement | null = null
  private crumbsEl: HTMLElement | null = null
  private vlist: OASVirtualList | null = null
  private viewEl: HTMLElement | null = null
  private viewSlotEl: HTMLSlotElement | null = null
  private footerEl: HTMLElement | null = null
  private hintsEl: HTMLElement | null = null
  private footerSlotEl: HTMLSlotElement | null = null
  private emptyEl: HTMLElement | null = null
  private emptyTextEl: HTMLElement | null = null
  private emptySlotEl: HTMLSlotElement | null = null
  private confirmEl: HTMLButtonElement | null = null
  /** 当前过滤后可见项（不含分组标题/分隔行），与渲染顺序一一对应 */
  private visibleItems: CommandItem[] = []
  private activeIndex = 0
  private searchQuery = ''
  private wasOpen = false
  private previousFocus: HTMLElement | null = null
  private optionSeq = 0
  /** 嵌套页面堆栈（根为空数组） */
  private pages: PageEntry[] = []
  private activeView: string | null = null
  private recents: RecentEntry[] = []
  private recentsLoaded = false
  private multiValues: string[] = []
  private _filter: ((query: string, items: CommandItem[]) => CommandItem[]) | null = null
  /** append-to：portal host 容器（目标容器内 div + 独立 shadow + STYLE 注入 + 插槽桥接） */
  private portalHost: HTMLElement | null = null
  /** listbox 容器 id（组件内生成唯一，aria-controls 指向） */
  private listboxId = ''
  private vlistId = ''
  /** document keydown 幂等重挂守卫（断开重连后 update() 恢复，防丢失） */
  private keyBound = false
  /** document keydown 处理器（bind 时注入实现；幂等重挂保证 remove 用同一引用） */
  private onDocumentKey: ((e: KeyboardEvent) => void) | null = null

  /** property 通道（Vue/React 把 items 识别为实例属性走赋值；setter 反射到 attribute 统一解析链路） */
  get items(): CommandItem[] {
    return this.itemsList
  }
  set items(value: CommandItem[] | string) {
    this.setAttribute('items', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 自定义过滤函数通道（property 赋值；should-filter=false 时忽略，过滤交给宿主） */
  get filter(): ((query: string, items: CommandItem[]) => CommandItem[]) | null {
    return this._filter
  }
  set filter(fn: ((query: string, items: CommandItem[]) => CommandItem[]) | null) {
    this._filter = typeof fn === 'function' ? fn : null
    if (this.isConnected) this.renderList()
  }

  /** 当前搜索词（空态插槽宿主读取 / 外部过滤场景可读） */
  get query(): string {
    return this.searchQuery
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="overlay" part="overlay" hidden>
        <div class="panel" part="panel" role="dialog" aria-modal="true">
          <div class="breadcrumb" part="breadcrumb" hidden>
            <button class="back" part="back" type="button"></button>
            <div class="crumbs" part="crumbs"></div>
          </div>
          <input class="search" part="search" type="text" role="combobox"
            aria-autocomplete="list" aria-expanded="true" />
          <div class="body" part="body">
            <div class="list" part="list" role="listbox"></div>
            <oas-virtual-list class="vlist" part="virtual-list" hidden></oas-virtual-list>
            <div class="view" part="view" hidden></div>
            <div class="empty" part="empty" hidden>
              <span class="empty-text" part="empty-text"></span>
              <slot name="empty"></slot>
            </div>
          </div>
          <div class="footer" part="footer" hidden>
            <span class="hints" part="hints"></span>
            <slot name="footer"></slot>
            <button class="confirm" part="confirm" type="button" hidden></button>
          </div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.overlayEl = this.shadow.querySelector('.overlay')
    this.panelEl = this.shadow.querySelector('.panel')
    this.listEl = this.shadow.querySelector('.list')
    this.searchEl = this.shadow.querySelector('.search')
    this.breadcrumbEl = this.shadow.querySelector('.breadcrumb')
    this.backBtn = this.shadow.querySelector('.back')
    this.crumbsEl = this.shadow.querySelector('.crumbs')
    this.vlist = this.shadow.querySelector<OASVirtualList>('oas-virtual-list')
    this.viewEl = this.shadow.querySelector('.view')
    this.footerEl = this.shadow.querySelector('.footer')
    this.hintsEl = this.shadow.querySelector('.hints')
    this.footerSlotEl = this.shadow.querySelector('slot[name="footer"]')
    this.emptyEl = this.shadow.querySelector('.empty')
    this.emptyTextEl = this.shadow.querySelector('.empty-text')
    this.emptySlotEl = this.shadow.querySelector('slot[name="empty"]')
    this.confirmEl = this.shadow.querySelector('.confirm')
    // aria-controls：listbox / 虚拟列表容器分配组件内唯一 id（模板为 SSR 纯函数，
    // id 在 bind 阶段运行时写入，SSR 快照不含，避免序列号跨进程漂移破坏 DSD 匹配）
    this.listboxId = `oas-command-list-${++commandSeq}`
    this.vlistId = `oas-command-vlist-${commandSeq}`
    this.listEl?.setAttribute('id', this.listboxId)
    this.vlist?.setAttribute('id', this.vlistId)

    this.searchEl?.addEventListener('input', () => {
      const v = this.searchEl?.value ?? ''
      // 受控/非受控都实时更新内部查询（列表响应式）；受控时属性由宿主回写
      this.searchQuery = v
      this.activeIndex = 0
      this.emit('input', { value: v })
      this.renderList()
    })
    // 插槽内容动态变化（宿主往 footer/empty 塞内容）时重新同步显隐
    this.footerSlotEl?.addEventListener('slotchange', () => this.syncFooter())
    this.emptySlotEl?.addEventListener('slotchange', () => {
      if (this.emptyEl && !this.emptyEl.hidden) this.showEmpty(this.searchQuery.trim())
    })
    this.searchEl?.addEventListener('keydown', (e) => this.handleSearchKey(e as KeyboardEvent))
    // 点击遮罩空白处关闭
    this.overlayEl?.addEventListener('click', (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('overlay')) this.close()
    })
    this.backBtn?.addEventListener('click', () => this.popPage())
    this.confirmEl?.addEventListener('click', () => this.confirmMulti())
    // 虚拟滚动：复用 oas-virtual-list 的窗口计算，把每个可见项渲染为选项行
    this.vlist?.addEventListener('oas-item', ((
      e: CustomEvent<{
        index: number
        item: CommandItem
        element: HTMLElement
      }>,
    ) => {
      const d = e.detail
      if (d && d.item && d.element) this.fillOptionRow(d.element, d.item, d.index)
    }) as EventListener)

    const onDocumentKey = (e: KeyboardEvent): void => {
      // 唤起快捷键（可配置 / "false" 关闭）
      const combos = this.hotkeyCombos()
      if (combos) {
        for (const combo of combos) {
          if (this.matchesCombo(e, combo)) {
            e.preventDefault()
            this.toggle()
            return
          }
        }
      }
      if (e.key === 'Escape' && this.hasAttr('open')) {
        e.preventDefault()
        // 嵌套页面：Esc 先回退子页，根层才关闭
        if (this.pages.length > 0) this.popPage()
        else this.close()
        return
      }
      // 焦点陷阱：打开时 Tab 在面板内循环
      if (e.key === 'Tab' && this.hasAttr('open')) this.trapTab(e)
    }
    this.onDocumentKey = onDocumentKey
    this.updateDocumentKey()
  }

  /**
   * 幂等重挂 document keydown（hotkey 唤起 / Esc 关闭 / Tab 焦点陷阱）。
   * 缺陷修复：bind() 仅 render 时执行一次，断开重连后 cleanup 已移除监听但不再重挂——
   * 重连后 hotkey / Esc / Tab 陷阱全部失效（与 tour 同款）。update() 每次连接都调用本方法，
   * keyBound 守卫保证同周期内不重复挂载、断开时 cleanup 复位标记。
   */
  private updateDocumentKey(): void {
    if (this.keyBound || !this.onDocumentKey) return
    this.keyBound = true
    document.addEventListener('keydown', this.onDocumentKey)
    this.onCleanup(() => {
      this.keyBound = false
      if (this.onDocumentKey) document.removeEventListener('keydown', this.onDocumentKey)
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（overlay/list 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.overlay')) return false
    if (!this.shadow.querySelector('.list')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    if (this.pages.length === 0) this.parseItems()
    const open = this.hasAttr('open')
    // 断开重连恢复 document keydown（幂等，见 updateDocumentKey 注释）
    this.updateDocumentKey()
    if (this.overlayEl) this.overlayEl.hidden = !open
    if (this.panelEl) this.panelEl.setAttribute('aria-label', this.t('command.label'))
    if (this.searchEl) {
      this.searchEl.setAttribute('aria-label', this.t('command.search'))
      this.searchEl.placeholder = this.t('command.placeholder')
    }
    // 受控 value（搜索词）：外部回写 / 初始值同步输入框
    if (this.hasAttr('value')) {
      const v = this.getAttr('value', '')
      if (v !== this.searchQuery) {
        this.searchQuery = v
        if (this.searchEl) this.searchEl.value = v
      }
    }
    // 打开：记录来源焦点并聚焦输入框；关闭：归还焦点；两个方向都派发 oas-open-change
    if (open && !this.wasOpen) {
      this.onOpen()
    } else if (!open && this.wasOpen) {
      this.onClose()
    }
    this.renderList()
    // 受控 selected（当前项）：外部值定位高亮（renderList 之后，visibleItems 已就绪）
    if (this.hasAttr('selected')) {
      this.syncActiveFromValue(this.getAttr('selected', ''))
      this.syncActive()
    }
    this.syncBreadcrumb()
    this.syncFooter()
  }

  private onOpen(): void {
    this.wasOpen = true
    this.previousFocus = document.activeElement as HTMLElement
    // 每次打开从根页开始（嵌套页面/视图/多选状态复位）
    this.pages = []
    this.activeView = null
    this.multiValues = []
    // 受控 value：不重置（保留宿主值）；非受控：清空搜索词
    if (this.hasAttr('value')) {
      this.searchQuery = this.getAttr('value', '')
    } else {
      this.searchQuery = ''
    }
    if (this.searchEl) this.searchEl.value = this.searchQuery
    this.activeIndex = 0
    this.ensureRecentsLoaded()
    if (this.searchEl) this.searchEl.focus()
    this.emit('open-change', { open: true })
  }

  private onClose(): void {
    this.wasOpen = false
    this.previousFocus?.focus()
    this.previousFocus = null
    this.pages = []
    this.activeView = null
    this.emit('open-change', { open: false })
  }

  private toggle(): void {
    if (this.hasAttr('open')) this.close()
    else this.setAttribute('open', '')
  }

  private close(): void {
    this.removeAttribute('open')
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter(
            (i): i is CommandItem =>
              !!i &&
              typeof i === 'object' &&
              typeof i.label === 'string' &&
              typeof i.value === 'string',
          )
        : []
    } catch {
      this.itemsList = []
    }
    this.activeItems = this.itemsList
  }

  // ==================== 唤起快捷键 ====================

  /** 解析 hotkey 属性 → 组合列表；"false"/空 返回 null（关闭内置监听） */
  private hotkeyCombos(): string[][] | null {
    const raw = this.getAttr('hotkey', 'mod+k')
    if (raw === '' || raw === 'false') return null
    return raw
      .split(',')
      .map((c) =>
        c
          .trim()
          .toLowerCase()
          .split('+')
          .map((t) => t.trim())
          .filter(Boolean),
      )
      .filter((c) => c.length > 0)
  }

  /** 严格匹配：所需修饰键必须按下；未要求的 shift/alt 不得按下（防误触） */
  private matchesCombo(e: KeyboardEvent, combo: string[]): boolean {
    const key = combo[combo.length - 1]!
    const mods = combo.slice(0, -1)
    let ok = true
    if (mods.includes('mod')) {
      ok = e.metaKey || e.ctrlKey
    } else {
      if (mods.some((m) => m === 'meta' || m === 'cmd' || m === 'command') && !e.metaKey) ok = false
      if (mods.some((m) => m === 'ctrl' || m === 'control') && !e.ctrlKey) ok = false
    }
    const needAlt = mods.some((m) => m === 'alt' || m === 'option' || m === 'opt')
    const needShift = mods.includes('shift')
    if (needAlt !== e.altKey) ok = false
    if (needShift !== e.shiftKey) ok = false
    if (e.key.toLowerCase() !== key) ok = false
    return ok
  }

  // ==================== 键盘操作 ====================

  private handleSearchKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.moveActive(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.moveActive(-1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // 视图模式：Enter 交给插槽内的表单，不接管
      if (this.activeView) return
      this.selectActive()
    } else if (e.key === 'Backspace' && this.searchQuery === '' && this.pages.length > 0) {
      // 空搜索词 Backspace 回退子页（分页模式）
      e.preventDefault()
      this.popPage()
    }
  }

  private moveActive(dir: 1 | -1): void {
    const n = this.visibleItems.length
    if (n === 0) return
    // 跳过 disabled 项（最多绕一圈回到自身）
    for (let i = 1; i <= n; i++) {
      const idx = (this.activeIndex + dir * i + n) % n
      if (!this.visibleItems[idx]!.disabled) {
        this.activeIndex = idx
        break
      }
    }
    this.emitActive()
    this.scrollActiveIntoView()
    this.syncActive()
  }

  private emitActive(): void {
    const item = this.visibleItems[this.activeIndex]
    if (!item) return
    this.emit('active', { value: item.value })
  }

  private selectActive(): void {
    const item = this.visibleItems[this.activeIndex]
    if (item) this.select(item)
  }

  private select(item: CommandItem): void {
    if (!item || item.disabled || item.separator) return
    if (this.activeView) return
    // 多选模式：Enter/点击只切换勾选，批量执行走 footer 确认
    if (this.hasAttr('multiple')) {
      this.toggleMulti(item)
      return
    }
    // 嵌套页面 / 视图：导航不派发 oas-select
    if (item.page) {
      this.pushPage(item)
      return
    }
    if (item.view) {
      this.pushView(item)
      return
    }
    this.execute(item)
  }

  private execute(item: CommandItem): void {
    this.emit('select', { value: item.value })
    this.recordRecent(item)
    if (this.getAttr('close-on-select', '') !== 'false') this.close()
  }

  // ==================== 嵌套页面 / 面包屑 ====================

  private pushPage(item: CommandItem): void {
    if (!item.page || item.page.length === 0) return
    this.pages.push({ title: item.label, view: null, items: this.activeItems })
    this.activeItems = item.page.filter(
      (i): i is CommandItem => !!i && typeof i.label === 'string' && typeof i.value === 'string',
    )
    this.activeView = null
    this.searchQuery = ''
    if (this.searchEl) this.searchEl.value = ''
    this.activeIndex = 0
    this.syncBreadcrumb()
    this.renderList()
    this.emit('page-change', { title: item.label, depth: this.pages.length, direction: 'push' })
  }

  private pushView(item: CommandItem): void {
    const view = item.view
    if (!view) return
    this.pages.push({ title: item.label, view, items: this.activeItems })
    this.activeView = view
    this.searchQuery = ''
    if (this.searchEl) this.searchEl.value = ''
    this.activeIndex = 0
    this.syncBreadcrumb()
    this.renderList()
    this.emit('page-change', { title: item.label, depth: this.pages.length, direction: 'push' })
    this.emit('view-change', { view, title: item.label })
  }

  private popPage(): void {
    const page = this.pages.pop()
    if (!page) return
    if (page.view) {
      this.activeView = null
      if (this.viewSlotEl) {
        this.viewSlotEl.remove()
        this.viewSlotEl = null
      }
      this.emit('view-change', { view: '', title: '' })
    } else {
      this.activeItems = page.items
    }
    this.searchQuery = ''
    if (this.searchEl) this.searchEl.value = ''
    this.activeIndex = 0
    // 回到根页：从 items 属性重读（根 items 可能已被宿主更新）
    if (this.pages.length === 0) this.parseItems()
    this.syncBreadcrumb()
    this.renderList()
    this.emit('page-change', { title: page.title, depth: this.pages.length, direction: 'pop' })
  }

  private syncBreadcrumb(): void {
    const bc = this.breadcrumbEl
    const back = this.backBtn
    const crumbs = this.crumbsEl
    if (!bc || !back || !crumbs) return
    const n = this.pages.length
    bc.hidden = n === 0
    if (n === 0) return
    back.textContent = '‹'
    back.setAttribute('aria-label', this.t('command.back'))
    crumbs.replaceChildren()
    for (const p of this.pages) {
      const span = document.createElement('span')
      span.className = 'crumb'
      span.textContent = p.title
      crumbs.appendChild(span)
    }
  }

  // ==================== 最近使用 / 历史 ====================

  private recentStorageKey(): string {
    const k = this.getAttr('recent-storage-key', '')
    return k ? `oas-command:recent:${k}` : ''
  }

  private ensureRecentsLoaded(): void {
    if (this.recentsLoaded || !this.hasAttr('recent')) return
    this.recentsLoaded = true
    const key = this.recentStorageKey()
    if (!key) return
    try {
      if (typeof localStorage === 'undefined') return
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          this.recents = parsed
            .filter(
              (r): r is RecentEntry => !!r && typeof r === 'object' && typeof r.value === 'string',
            )
            .slice(0, MAX_RECENTS)
        }
      }
    } catch {
      /* 解析失败忽略，保持空最近列表 */
    }
  }

  private recordRecent(item: CommandItem): void {
    if (!this.hasAttr('recent')) return
    const entry: RecentEntry = { value: item.value, label: item.label }
    if (item.icon) entry.icon = item.icon
    if (item.shortcut) entry.shortcut = item.shortcut
    if (item.description) entry.description = item.description
    this.recents = [entry, ...this.recents.filter((r) => r.value !== entry.value)].slice(
      0,
      MAX_RECENTS,
    )
    const key = this.recentStorageKey()
    if (!key) return
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(this.recents))
      }
    } catch {
      /* 持久化失败（隐私模式等）静默忽略 */
    }
  }

  // ==================== 多选命令 ====================

  private toggleMulti(item: CommandItem): void {
    if (item.disabled || item.separator) return
    const i = this.multiValues.indexOf(item.value)
    if (i >= 0) this.multiValues.splice(i, 1)
    else this.multiValues.push(item.value)
    this.emit('change', { values: [...this.multiValues] })
    this.renderList()
    this.syncFooter()
  }

  private confirmMulti(): void {
    if (this.multiValues.length === 0) return
    this.emit('select', { values: [...this.multiValues] })
    if (this.hasAttr('recent')) {
      for (const v of this.multiValues) {
        const item = this.activeItems.find((i) => i.value === v)
        if (item) this.recordRecent(item)
      }
    }
    if (this.getAttr('close-on-select', '') !== 'false') this.close()
  }

  // ==================== 列表渲染 ====================

  private limitValue(): number {
    const n = Number.parseInt(this.getAttr('limit', '50'), 10)
    return Number.isNaN(n) || n < 1 ? 50 : n
  }

  private virtualItemHeight(): number {
    const n = Number.parseInt(this.getAttr('item-height', '36'), 10)
    return Number.isNaN(n) || n < 1 ? 36 : n
  }

  /** 过滤 + 打分排序（should-filter=false 时不做本地过滤；filter 函数优先于内置） */
  private computeVisible(): CommandItem[] {
    const raw = this.searchQuery.trim()
    const q = raw.toLowerCase()
    if (this.getAttr('should-filter', 'true') === 'false') return this.activeItems
    if (this._filter) return this._filter(raw, this.activeItems)
    if (!q) return this.activeItems
    const scored = this.activeItems
      .map((item): ScoredItem | null => {
        const label = item.label.toLowerCase()
        const idx = label.indexOf(q)
        let score = 0
        if (idx === 0) score = 4
        else if (idx > 0) score = 3
        else if ((item.keywords ?? []).some((k) => k.toLowerCase().includes(q))) score = 2
        if (score === 0) return null
        return { item, score }
      })
      .filter((s): s is ScoredItem => s !== null)
    // 稳定排序：同分保持数组原序（ES2019 起 sort 稳定）
    scored.sort((a, b) => b.score - a.score)
    return scored.map((s) => s.item)
  }

  // ==================== append-to（家族一致：portal host 独立 shadow + STYLE 注入 + 插槽桥接） ====================

  /**
   * portal 挂载（与 hover-card 同架构）：打开且设置 append-to 时把整个 overlay
   * 移入目标容器的 portal host（div + 独立 open shadow + STYLE 注入，样式作用域保真），
   * 并把 light DOM 的插槽节点（empty/footer/view-*）桥接到 host light DOM——
   * 面板内 slot 元素移入 portal shadow 后，分配源变成 host light DOM，不桥接则跨 host 断供。
   * 幂等：host 已挂在同一目标容器时只重跑桥接（宿主动态插入插槽节点后的增量同步）。
   */
  private syncPortal(): void {
    const sel = this.getAttr('append-to', '').trim()
    if (!sel || !this.overlayEl || !this.hasAttr('open')) {
      this.destroyPortal()
      return
    }
    const target = sel === 'body' ? document.body : this.queryPortalTarget(sel)
    if (!target) {
      this.destroyPortal()
      return
    }
    if (this.portalHost && this.portalHost.parentElement === target) {
      this.bridgeSlotContent(this.portalHost)
      return
    }
    this.destroyPortal()
    const host = document.createElement('div')
    host.setAttribute('data-oas-command-portal', '')
    host.style.cssText =
      'position: fixed; inset: 0; pointer-events: none; z-index: var(--oas-z-modal, 1050);'
    target.appendChild(host)
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `<style>${STYLE}</style>`
    root.appendChild(this.overlayEl)
    this.portalHost = host
    this.bridgeSlotContent(host)
  }

  /** 解析 append-to 目标容器（非法选择器回落 null，静默留在原 shadow） */
  private queryPortalTarget(sel: string): HTMLElement | null {
    try {
      return document.querySelector(sel)
    } catch {
      return null
    }
  }

  /** 插槽桥接：宿主 light DOM 的 empty / footer / view-* 节点移入 portal host light DOM */
  private bridgeSlotContent(host: HTMLElement): void {
    for (const n of this.querySelectorAll<HTMLElement>(
      '[slot="empty"], [slot="footer"], [slot^="view-"]',
    )) {
      host.appendChild(n)
    }
  }

  /** portal 拆除：overlay 移回原 shadow，插槽节点移回宿主，host 移除无孤儿 */
  private destroyPortal(): void {
    const host = this.portalHost
    if (!host) return
    this.portalHost = null
    if (this.overlayEl && host.shadowRoot?.contains(this.overlayEl)) {
      this.shadow.appendChild(this.overlayEl)
    }
    for (const n of host.querySelectorAll<HTMLElement>('[slot]')) {
      this.appendChild(n)
    }
    host.remove()
  }

  private renderList(): void {
    const listEl = this.listEl
    const emptyEl = this.emptyEl
    const vlist = this.vlist
    if (!listEl || !emptyEl) return
    // append-to：幂等同步 portal 挂载（打开时 overlay 移入目标容器；关闭/未配置时拆回）
    this.syncPortal()
    // aria-controls：默认指向常规 listbox（虚拟滚动路径再覆写为虚拟列表容器）
    this.searchEl?.setAttribute('aria-controls', this.listboxId)
    this.visibleItems = []

    // 视图模式：隐藏列表/空态，展示动态插槽
    if (this.activeView) {
      this.syncView()
      return
    }
    this.viewEl?.setAttribute('hidden', '')

    const q0 = this.searchQuery.trim()
    const q = q0.toLowerCase()

    // loading 态：占位行 + aria-busy
    if (this.hasAttr('loading')) {
      listEl.hidden = false
      if (vlist) vlist.hidden = true
      emptyEl.hidden = true
      listEl.setAttribute('aria-busy', 'true')
      listEl.innerHTML = ''
      const row = document.createElement('div')
      row.className = 'loading-row'
      row.setAttribute('part', 'loading')
      const spinner = document.createElement('span')
      spinner.className = 'spinner'
      spinner.setAttribute('aria-hidden', 'true')
      const text = document.createElement('span')
      text.textContent = this.t('command.loading')
      row.append(spinner, text)
      listEl.appendChild(row)
      this.searchEl?.removeAttribute('aria-activedescendant')
      return
    }
    listEl.removeAttribute('aria-busy')

    let visible = this.computeVisible()
    // 最近使用：空搜索词时置顶（reorder 去重），虚拟/子页不启用
    const recentsShown =
      this.hasAttr('recent') && q0 === '' && !this.hasAttr('virtual') && this.pages.length === 0
    let recentRows: CommandItem[] = []
    if (recentsShown) {
      recentRows = this.recents.slice(0, MAX_RECENTS)
      const recentValues = new Set(recentRows.map((r) => r.value))
      visible = visible.filter((i) => !recentValues.has(i.value))
    }
    // 虚拟滚动：有分组/最近项时回退全量渲染（定高模型不适配组标题）
    const hasGroups = this.activeItems.some((i) => i.group !== undefined)
    const showVirtual =
      !!vlist && this.hasAttr('virtual') && !hasGroups && !recentsShown && q0 === ''
    if (!showVirtual && visible.length > this.limitValue()) {
      visible = visible.slice(0, this.limitValue())
    }
    // forceMount 项：忽略过滤强制渲染（追加在尾部）
    const forced = this.activeItems.filter(
      (i) => i.forceMount && !visible.includes(i) && !recentRows.includes(i),
    )
    visible = [...visible, ...forced]

    if (showVirtual) {
      this.visibleItems = visible
      emptyEl.hidden = true
      listEl.hidden = true
      vlist.hidden = false
      vlist.setAttribute('items-role', 'listbox')
      vlist.setAttribute('item-role', 'option')
      vlist.setAttribute('height', '320')
      vlist.setAttribute('item-height', String(this.virtualItemHeight()))
      vlist.items = visible
      // aria-controls：虚拟模式下 listbox 角色在虚拟列表容器上
      this.searchEl?.setAttribute('aria-controls', this.vlistId)
      return
    }

    listEl.hidden = false
    if (vlist) vlist.hidden = true
    listEl.innerHTML = ''

    if (visible.length === 0 && recentRows.length === 0) {
      this.showEmpty(q0)
      return
    }
    emptyEl.hidden = true
    this.searchEl?.removeAttribute('aria-activedescendant')

    // 最近使用组置顶
    if (recentRows.length > 0) {
      const g = document.createElement('div')
      g.className = 'group'
      g.setAttribute('role', 'presentation')
      g.textContent = this.t('command.recent')
      listEl.appendChild(g)
      for (const r of recentRows) {
        const row = document.createElement('div')
        this.fillOptionRow(row, r, this.visibleItems.length)
        listEl.appendChild(row)
        this.visibleItems.push(r)
      }
    }

    // 常规分组 + 行
    let prevGroup: string | undefined
    for (const item of visible) {
      if (item.separator) {
        const sep = document.createElement('div')
        sep.className = 'separator'
        sep.setAttribute('part', 'separator')
        sep.setAttribute('role', 'separator')
        listEl.appendChild(sep)
        continue
      }
      // 分组标题：group 变化时插入（空分组不渲染）
      if (item.group !== prevGroup && item.group) {
        const g = document.createElement('div')
        g.className = 'group'
        g.setAttribute('role', 'presentation')
        g.textContent = item.group
        listEl.appendChild(g)
        prevGroup = item.group
      }
      const row = document.createElement('div')
      this.fillOptionRow(row, item, this.visibleItems.length)
      listEl.appendChild(row)
      this.visibleItems.push(item)
    }

    if (this.activeIndex >= this.visibleItems.length) this.activeIndex = 0
    this.syncActive()
  }

  private showEmpty(q: string): void {
    const emptyEl = this.emptyEl
    const emptyTextEl = this.emptyTextEl
    const listEl = this.listEl
    const vlist = this.vlist
    if (!emptyEl || !emptyTextEl) return
    if (listEl) listEl.hidden = true
    if (vlist) vlist.hidden = true
    emptyEl.hidden = false
    // 空态插槽：slot="empty" 有内容时隐藏默认文案
    const hasSlot = (this.emptySlotEl?.assignedNodes().length ?? 0) > 0
    emptyTextEl.hidden = hasSlot
    emptyTextEl.textContent = q
      ? this.t('command.noResults', { query: this.searchQuery.trim() })
      : this.t('command.empty')
    this.searchEl?.removeAttribute('aria-activedescendant')
  }

  private syncView(): void {
    const viewEl = this.viewEl
    const listEl = this.listEl
    const emptyEl = this.emptyEl
    const vlist = this.vlist
    const view = this.activeView
    if (!viewEl || !listEl || !emptyEl) return
    listEl.hidden = true
    if (vlist) vlist.hidden = true
    emptyEl.hidden = true
    viewEl.hidden = false
    // 动态插槽：<slot name="view-{view}">（light DOM 里 slot="view-{view}" 的内容在此展示）
    if (!this.viewSlotEl || this.viewSlotEl.getAttribute('name') !== `view-${view}`) {
      if (this.viewSlotEl) this.viewSlotEl.remove()
      const slot = document.createElement('slot')
      slot.setAttribute('name', `view-${view}`)
      slot.setAttribute('part', 'view-slot')
      this.viewSlotEl = slot
      viewEl.replaceChildren(slot)
    }
    this.searchEl?.removeAttribute('aria-activedescendant')
  }

  /** 构建一个选项行（非虚拟与虚拟 oas-item 两路共用） */
  private fillOptionRow(row: HTMLElement, item: CommandItem, shownIndex: number): void {
    row.classList.add('option')
    row.setAttribute('part', 'option')
    row.setAttribute('role', 'option')
    row.setAttribute('aria-disabled', String(item.disabled ?? false))
    row.setAttribute(
      'aria-selected',
      String(
        this.hasAttr('multiple')
          ? this.multiValues.includes(item.value)
          : shownIndex === this.activeIndex,
      ),
    )
    row.setAttribute('data-value', item.value)
    row.setAttribute('data-index', String(shownIndex))
    row.setAttribute('tabindex', '-1')
    row.id = `oas-command-opt-${this.optionSeq++}`
    if (shownIndex === this.activeIndex) row.classList.add('active')
    row.replaceChildren()

    // 左图标
    if (item.icon) {
      const ic = document.createElement('span')
      ic.className = 'option-icon'
      ic.setAttribute('part', 'option-icon')
      ic.innerHTML = this.iconMarkup(item.icon)
      row.appendChild(ic)
    }
    // 主文案（label + 匹配高亮）+ 副标题
    const main = document.createElement('span')
    main.className = 'option-main'
    const label = document.createElement('span')
    label.className = 'option-label'
    label.setAttribute('part', 'option-label')
    this.fillLabel(label, item.label)
    main.appendChild(label)
    if (item.description) {
      const desc = document.createElement('span')
      desc.className = 'option-desc'
      desc.setAttribute('part', 'option-desc')
      desc.textContent = item.description
      main.appendChild(desc)
    }
    row.appendChild(main)
    // 右对齐快捷键标注
    if (item.shortcut) {
      const sc = document.createElement('span')
      sc.className = 'option-shortcut'
      sc.setAttribute('part', 'option-shortcut')
      this.fillShortcut(sc, item.shortcut)
      row.appendChild(sc)
    }
    // 多选勾选
    if (this.hasAttr('multiple')) {
      const ck = document.createElement('span')
      ck.className = 'check'
      ck.setAttribute('part', 'check')
      ck.textContent = '✓'
      ck.hidden = !this.multiValues.includes(item.value)
      row.appendChild(ck)
    }
    row.addEventListener('click', () => this.select(item))
    row.addEventListener('mousemove', () => {
      if (item.disabled || shownIndex === this.activeIndex) return
      this.activeIndex = shownIndex
      this.emitActive()
      this.syncActive()
    })
  }

  /** label 渲染：搜索词命中段包 <mark class="hl">（搜索反馈） */
  private fillLabel(labelEl: HTMLElement, label: string): void {
    const q = this.searchQuery.trim().toLowerCase()
    labelEl.replaceChildren()
    if (q) {
      const idx = label.toLowerCase().indexOf(q)
      if (idx >= 0) {
        if (idx > 0) labelEl.appendChild(document.createTextNode(label.slice(0, idx)))
        const mark = document.createElement('mark')
        mark.className = 'hl'
        mark.textContent = label.slice(idx, idx + q.length)
        labelEl.appendChild(mark)
        if (idx + q.length < label.length) {
          labelEl.appendChild(document.createTextNode(label.slice(idx + q.length)))
        }
        return
      }
    }
    labelEl.textContent = label
  }

  /** 快捷键标注渲染：符号映射 + 大写键名 */
  private fillShortcut(el: HTMLElement, shortcut: string): void {
    const kbd = document.createElement('kbd')
    const parts = shortcut
      .split('+')
      .map((p) => p.trim())
      .filter(Boolean)
    parts.forEach((p, i) => {
      if (i > 0) {
        const sep = document.createElement('span')
        sep.className = 'sep'
        sep.setAttribute('aria-hidden', 'true')
        sep.textContent = ' '
        kbd.appendChild(sep)
      }
      const cap = document.createElement('span')
      const symbol = SHORTCUT_SYMBOLS[p.toLowerCase()]
      if (symbol) cap.textContent = symbol
      else if (p.toLowerCase() === 'mod') cap.textContent = isMacPlatform() ? '⌘' : 'Ctrl'
      else cap.textContent = p.toUpperCase()
      kbd.appendChild(cap)
    })
    el.appendChild(kbd)
  }

  /** 项图标：path d 字符串 → <svg>；以 "<" 开头视为完整标记直接注入 */
  private iconMarkup(icon: string): string {
    const t = icon.trim()
    if (t.startsWith('<')) return t
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${t}"/></svg>`
  }

  // ==================== 高亮/aria 同步 ====================

  /** 已渲染的选项行：非虚拟在 listbox、虚拟在 vlist shadow（open shadow 可跨根查询） */
  private renderedOptionRows(): HTMLElement[] {
    const out: HTMLElement[] = []
    const listEl = this.listEl
    if (listEl) out.push(...listEl.querySelectorAll<HTMLElement>('[part="option"]'))
    const vlist = this.vlist
    if (vlist && !vlist.hidden && vlist.shadowRoot) {
      out.push(...vlist.shadowRoot.querySelectorAll<HTMLElement>('[part="option"]'))
    }
    return out
  }

  /** 高亮同步（不重建 DOM）：class / aria-selected / aria-activedescendant */
  private syncActive(): void {
    for (const row of this.renderedOptionRows()) {
      const idx = Number(row.getAttribute('data-index'))
      row.classList.toggle('active', idx === this.activeIndex)
      row.setAttribute('aria-selected', String(idx === this.activeIndex))
    }
    const activeRow = this.renderedOptionRows().find(
      (r) => Number(r.getAttribute('data-index')) === this.activeIndex,
    )
    if (activeRow && this.searchEl) {
      this.searchEl.setAttribute('aria-activedescendant', activeRow.id)
    } else {
      this.searchEl?.removeAttribute('aria-activedescendant')
    }
  }

  /** 受控 selected：按 value 定位高亮项（当前可见列表内） */
  private syncActiveFromValue(value: string): void {
    if (!value) return
    const idx = this.visibleItems.findIndex((i) => i.value === value)
    if (idx >= 0) this.activeIndex = idx
  }

  /** 虚拟滚动：让 activeIndex 所在项进入视口（happy-dom 下手动派发 scroll 重算窗口） */
  private scrollActiveIntoView(): void {
    const vlist = this.vlist
    if (!vlist || vlist.hidden) return
    const vp = vlist.shadowRoot?.querySelector<HTMLElement>('.viewport')
    if (!vp) return
    const ih = this.virtualItemHeight()
    const top = this.activeIndex * ih
    const vh = vp.clientHeight || 240
    const cur = vp.scrollTop
    if (top < cur) vp.scrollTop = Math.max(0, top)
    else if (top + ih > cur + vh) vp.scrollTop = Math.max(0, top + ih - vh)
    vp.dispatchEvent(new Event('scroll'))
  }

  // ==================== footer ====================

  private syncFooter(): void {
    const footer = this.footerEl
    const hints = this.hintsEl
    const confirm = this.confirmEl
    if (!footer || !hints || !confirm) return
    const open = this.hasAttr('open')
    const inView = !!this.activeView
    footer.hidden = !open || inView
    if (footer.hidden) return
    // 默认快捷键提示条（footer 插槽有内容时隐藏）
    const hasSlot = (this.footerSlotEl?.assignedNodes().length ?? 0) > 0
    hints.hidden = hasSlot
    if (!hasSlot) this.fillHints()
    // 多选确认按钮：有勾选时显示
    const showConfirm = this.hasAttr('multiple') && this.multiValues.length > 0
    confirm.hidden = !showConfirm
    if (showConfirm)
      confirm.textContent = this.t('command.multiRun', { n: this.multiValues.length })
  }

  private fillHints(): void {
    const hints = this.hintsEl
    if (!hints) return
    hints.replaceChildren()
    const add = (keys: string, text: string): void => {
      const hint = document.createElement('span')
      hint.className = 'hint'
      const kbd = document.createElement('kbd')
      kbd.textContent = keys
      const label = document.createElement('span')
      label.textContent = text
      hint.append(kbd, label)
      hints.appendChild(hint)
    }
    add('↑↓', this.t('command.footer.navigate'))
    add('↵', this.t('command.footer.select'))
    add('esc', this.t('command.footer.close'))
  }

  /** 焦点陷阱：Tab / Shift+Tab 在搜索框与可见选项（+返回/确认按钮）间循环；视图模式不拦截 */
  private trapTab(e: KeyboardEvent): void {
    if (this.activeView) return
    const focusable = [
      this.searchEl,
      ...this.renderedOptionRows().filter((r) => r.getAttribute('aria-disabled') !== 'true'),
    ]
    if (this.pages.length > 0 && this.backBtn) focusable.push(this.backBtn)
    if (this.confirmEl && !this.confirmEl.hidden) focusable.push(this.confirmEl)
    const list = focusable.filter((el): el is HTMLElement => el !== null)
    if (list.length === 0) return
    e.preventDefault()
    // 用当前焦点所在的 shadow root 定位：append-to portal 期间面板在 portal host 的
    // shadow 内，取 portal shadow 的 activeElement；非 portal 走自身 shadow
    // （happy-dom 下 document.activeElement 只会回到宿主，真实浏览器里两者一致）。
    const activeRoot = this.portalHost?.shadowRoot ?? this.shadow
    const current = list.indexOf(activeRoot.activeElement as HTMLElement)
    const next = e.shiftKey
      ? (current - 1 + list.length) % list.length
      : (current + 1) % list.length
    list[next]?.focus()
  }
}

/** mod 快捷键标注的平台符号（仅展示用；匹配本身不区分平台） */
function isMacPlatform(): boolean {
  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    return /Mac|iPhone|iPad|iPod/i.test(ua)
  } catch {
    return false
  }
}
