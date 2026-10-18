import { OASElement } from '@oas-ui/core'
import { devWarn } from '../../shared/dev-warn.js'
import { isRtl } from '../../shared/direction.js'
import { computeVirtualWindow } from '../virtual-list/oas-virtual-list.js'
import type { OASVirtualList } from '../virtual-list/oas-virtual-list.js'
// 运行时容忍 JSON 字符串的数据通道归一（同 gantt/resource 口径：框架把静态 attribute 当
// property 写入宿主时，setter 收到的是 JSON 字符串而非数组）
import { parseJsonArray } from '../../shared/json-array.js'
// 服务端行窗口协议（windowed 模式）：与 table / gantt 同源同语义（类型 + 纯工具）。
// emit 用字面量 'window-request'（api:scan 解析锚点），与共享契约常量做编译期一致性校验。
import {
  ROW_WINDOW_EVENT,
  WINDOW_MARGIN,
  expandWindow,
  readWindowedMode,
  sameWindow,
  windowCovered,
  type WindowRequestDetail,
  type WindowRequestReason,
} from '../../shared/window-data.js'

const _ROW_WINDOW_EVENT_CHECK: typeof ROW_WINDOW_EVENT = 'oas-window-request'
void _ROW_WINDOW_EVENT_CHECK

/** aria-selected 合法的宿主角色（ARIA 1.2：option / row / gridcell / tab / treeitem / 表头角色） */
const ARIA_SELECTABLE_ROLES = new Set(['option', 'row', 'gridcell', 'tab', 'treeitem', 'columnheader', 'rowheader'])

/**
 * aria-posinset / aria-setsize 合法的行角色（ARIA 1.2：这两个不是全局属性）。
 * 无角色的自定义元素写行数元数据会被 axe aria-allowed-attr 判违规（focusable 行直接 critical），
 * 因此只在行角色合法时写入：宿主显式行角色优先，否则由组件在行容器施加的
 * role=list/listbox 推导子角色（listitem / option）。
 */
const ARIA_ROWCOUNT_ROLES = new Set([
  'article',
  'listitem',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'row',
  'tab',
  'treeitem',
  'gridcell',
  'columnheader',
  'rowheader',
])

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
[hidden] {
  display: none !important;
}
.list {
  border-radius: var(--oas-radius-md);
  overflow: hidden;
}
.list[data-bordered='true'] {
  border: 1px solid var(--oas-color-border);
}
.list[data-split='true'] ::slotted(oas-list-item) {
  border-bottom: 1px solid var(--oas-color-border);
}
.list[data-split='true'] ::slotted(oas-list-item:last-child) {
  border-bottom: none;
}
/* 数据通道行（shadow 内 oas-list-item）的分隔线 */
.list[data-split='true'] .data-items oas-list-item {
  border-bottom: 1px solid var(--oas-color-border);
}
/* hoverable：不可点行也有 hover 底色反馈（clickable 行自带 hover 同色；选中行排除在外，
   保持 primary 选中底不被浅灰压盖；颜色走 token，暗色自动适配）。虚拟模式行是内嵌
   oas-virtual-list 的 [part="item"] div，经 ::part():hover 命中 */
.list[data-hoverable='true'] ::slotted(oas-list-item:not([selected]):hover) {
  background: var(--oas-color-bg-hover);
}
.list[data-hoverable='true'] .data-items oas-list-item:not([selected]):hover {
  background: var(--oas-color-bg-hover);
}
.list[data-hoverable='true'] oas-virtual-list::part(item):hover {
  background: var(--oas-color-bg-hover);
}
/* 末行去分隔线：仅列表视觉末行——非组行（直挂 .data-items）末行，
   或最后一个分组容器 .group 内的末行（组内行分隔线保留到下一组头前） */
.list[data-split='true'] .data-items > oas-list-item:last-child,
.list[data-split='true'] .data-items .group:last-child > oas-list-item:last-child {
  border-bottom: none;
}
/* 数据通道分组：同组连续项归入 .group 容器，组头是容器内第一个元素。
   组头吸顶范围=本组容器——下一组到顶时把上一组头顶走（原生 sticky 语义，
   组头不等高也不会叠条）；背景用 token 不透明盖住滚经行。组头不是行，
   不参与行 hover/clickable/roving */
.group-header {
  padding: var(--oas-space-2) var(--oas-space-4);
  font-size: var(--oas-font-size-sm);
  font-weight: 500;
  color: var(--oas-color-text-secondary);
  background: var(--oas-color-bg);
  border-bottom: 1px solid var(--oas-color-border);
}
.group-header[data-sticky] {
  position: sticky;
  top: 0;
  /* 吸顶时同列表后续分组滚经行（非定位）会盖在组头上——抬高组头图层压住行 */
  z-index: 1;
}
/* 滚动容器（max-height 设置时启用） */
.body {
  overflow-anchor: none;
}
/* 加载态：骨架占位（复用 Skeleton 流光风格） */
.skeleton {
  padding: var(--oas-space-3) var(--oas-space-4);
}
.sk-line {
  height: var(--oas-control-height-sm);
  border-radius: var(--oas-radius-sm);
  background: linear-gradient(90deg, var(--oas-color-bg-hover) 25%, var(--oas-color-border) 50%, var(--oas-color-bg-hover) 75%);
  background-size: 200% 100%;
  animation: oas-list-shimmer 1.5s infinite;
  margin-bottom: var(--oas-space-3);
}
.sk-title {
  width: 40%;
}
.sk-short {
  width: 62%;
  margin-bottom: 0;
}
@keyframes oas-list-shimmer {
  to { background-position: -200% 0; }
}
/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--oas-space-6);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--oas-color-bg-hover);
  border: 1px dashed var(--oas-color-border-strong);
  margin-bottom: var(--oas-space-2);
}
/* 页头 / 页尾 / 加载更多尾区 */
.header,
.footer {
  padding: var(--oas-space-3) var(--oas-space-4);
}
.header {
  border-bottom: 1px solid var(--oas-color-border);
}
.footer {
  border-top: 1px solid var(--oas-color-border);
}
.load-more {
  padding: var(--oas-space-3) var(--oas-space-4);
  text-align: center;
}
/* 内嵌虚拟列表的行与列表条目同款结构（分隔线由宿主模板自管） */
oas-virtual-list::part(item) {
  box-sizing: border-box;
}
/* windowed：绝对行号铺位。上下占位（spacer）撑起全量 total 高度；行定高并裁剪
   （与内嵌虚拟列表 .item 同款 overflow: hidden，防止内容把定高行撑破导致滚动高度漂移） */
.data-items[data-windowed='true'] oas-list-item {
  box-sizing: border-box;
  overflow: hidden;
}
.data-items[data-windowed='true'] .spacer {
  width: 100%;
  pointer-events: none;
}
/* ===== sortable：行拖拽排序（对齐 tabs sortable 机制；拖过目标行高亮 → 派发 oas-reorder） ===== */
.list[data-sortable='true'] ::slotted(oas-list-item[draggable='true']),
.list[data-sortable='true'] .data-items oas-list-item[draggable='true'] {
  cursor: grab;
}
.list[data-sortable='true'] ::slotted(oas-list-item.row--dragging),
.list[data-sortable='true'] .data-items oas-list-item.row--dragging {
  opacity: 0.5;
}
.list[data-sortable='true'] ::slotted(oas-list-item.row--drag-over),
.list[data-sortable='true'] .data-items oas-list-item.row--drag-over {
  box-shadow: inset 2px 0 0 var(--oas-color-primary);
}
/* RTL 镜像：拖拽落点高亮翻到行尾侧 */
:host([data-rtl]) .list[data-sortable='true'] ::slotted(oas-list-item.row--drag-over),
:host([data-rtl]) .list[data-sortable='true'] .data-items oas-list-item.row--drag-over {
  box-shadow: inset -2px 0 0 var(--oas-color-primary);
}
`

/**
 * oas-list —— 数据/内容列表。
 *
 * 渲染两通道（与 oas-tree 的 data + template 惯例对齐）：
 * - 声明式：直接放 <oas-list-item> 子项；
 * - 数据通道：`data`（JSON 属性或 property）+ 可选 `template[slot="item"]` 克隆骨架，
 *   每行派发 `oas-item-render`（detail { index, item, element }）供宿主改写。
 * 有 data 走 data、无 data 回落声明式子项。
 *
 * 属性（kebab-case）：
 * - `bordered` / `split`：整体边框 / 条目分隔线（默认规则：无 bordered 自带分隔线）
 * - `size`：sm / md（默认）/ lg，行内边距与标题字号联动
 * - `loading`：骨架占位；`empty` / `empty-text`：空态；`stripe`：斑马纹
 * - `header` / `footer` / `load-more` / `empty`：命名插槽
 * - `max-height` + `bottom-offset`：滚动容器 + 触底事件 oas-reach-bottom
 * - `height` + `row-height`：虚拟滚动（内嵌 oas-virtual-list，要求 data 通道 + 定高行）
 * - `windowed` + `total` + `window-start`：服务端行窗口模式（data 只承载
 *   `[window-start, window-start+len)` 切片；可视窗口在 total 上算、绝对行号铺位，
 *   期望区间未覆盖时派发 oas-window-request；total=0/非法回落普通模式）。
 *   windowed 下本地行重排（sortable 拖拽）禁用——渲染窗口局部 index 对全量无意义
 * - 数据分组：数据项带 `group`（组名字符串，同组须连续）自动插入组头；可选
 *   `groupLabel` 字段自定义组头文案（缺省回落 group 值）。组头不占用行索引。
 *   普通渲染模式组头 `position: sticky` 吸顶（须在滚动容器内，配 max-height）；
 *   虚拟模式（height）下本批不做虚拟吸顶——分组数据自动回退全量渲染，
 *   组头以普通块呈现不吸顶。分组数据 + 超大行数不建议配 height 使用。
 *
 * 事件（bubbles + composed）：
 * - `oas-reach-bottom`：滚动触底（进入触底区派发一次，滚离后重新武装）
 * - `oas-window-request`：windowed 期望行区间未被已装载切片覆盖（detail `{ start, end, reason }`，
 *   半开、绝对行下标；reason = init / scroll / resize / data；同一期望区间不重复派发）
 * - `oas-item-render`：数据通道每行渲染后派发（windowed 下 index 为绝对行号）
 * - `oas-click`：条目点击（声明式/数据行由 oas-list-item 派发；虚拟行由列表代理）
 * - `oas-reorder`：拖拽排序落定（detail { from, to, item }）
 *
 * a11y：list 语义由组件落在 shadow 内**紧贴行的 items 容器**上（`role=list`；宿主声明
 * `role=listbox` 时迁为 listbox），行派生子角色 listitem / option——宿主无需也**不应**在
 * 宿主元素上设 `role=list`（宿主上的 list 会把可聚焦滚动容器/分组条算成非法子元素，
 * axe aria-required-children critical）。宿主若仍写了 list/listbox，组件把角色（连同
 * aria-label / aria-labelledby）迁到行容器并从宿主移除；宿主其他显式角色原样保留。
 * 行带 `aria-setsize`（windowed = total，其余 = 全量行数）与 `aria-posinset`
 * （windowed = 绝对行号 1 基，其余 = 行序 1 基），仅在行角色支持行数语义时写入；
 * 角色不合法时清掉组件此前写入的值（避免残留 stale ARIA）。`aria-rowcount` 仅
 * grid/table/treegrid 合法，list 不写。
 */
export class OASList extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'bordered',
      'split',
      'loading',
      'empty',
      'empty-text',
      'size',
      'stripe',
      'max-height',
      'bottom-offset',
      'height',
      'row-height',
      'data',
      'hoverable',
      // windowed：服务端行窗口协议（data 为切片；可见窗口在 total 上算）
      'windowed',
      'total',
      'window-start',
      // sortable：行拖拽排序（HTML5 DnD，落点派发 oas-reorder）
      'sortable',
    ]
  }

  private rows: unknown[] = []
  private dataFromProperty = false
  private atBottom = false
  private raf = 0
  private body: HTMLElement | null = null
  private vlist: OASVirtualList | null = null
  /** windowed 模式解析缓存（update 内刷新）：windowed/total/windowStart/loaded 区间 */
  private winMode: ReturnType<typeof readWindowedMode> = readWindowedMode(false, 0, 0, 0)
  /** windowed：最近一次派发的期望区间（同 need 去重；被覆盖后复位允许再派） */
  private winReq: { start: number; end: number } | null = null
  /** windowed：首帧 init 请求是否已派发（之后 data/total/window-start 变更走 data 原因） */
  private winInitDone = false
  /** 本次 update 的窗口请求原因（滚动/尺寸路径先写入，update 消费后清空） */
  private pendingWindowReason: WindowRequestReason | null = null
  /** 视口尺寸观察器（windowed：可见行数变化时按 resize 原因重新评估窗口） */
  private resizeObserver: ResizeObserver | null = null
  /** 宿主 role / aria-label 运行时变更观察（role 不进 observedAttributes，避免标准 ARIA 属性污染组件 API 面） */
  private hostAriaObserver: MutationObserver | null = null
  /** windowed：无视口告警是否已发（每实例只提醒一次） */
  private winNoViewportWarned = false
  /** windowed：window-start 越过 total 的夹取告警是否已发（每实例只提醒一次，M-2/M-3 对齐 table） */
  private winStartClampWarned = false
  /** list 语义：活动行容器上的角色（'' = 不施加 list 语义）与行子角色 */
  private listRole: 'list' | 'listbox' | '' = ''
  private listChildRole: 'listitem' | 'option' | '' = ''
  /** 从宿主迁来的 list/listbox 意图（宿主属性移除后仍要记住，避免下一次 update 回落成默认 list） */
  private adoptedListRole: 'list' | 'listbox' | '' = ''
  /** 组件派生的行角色及值（只清理自己写的；宿主改写同属性即视为显式角色） */
  private derivedRole = new WeakMap<HTMLElement, string>()
  /** 组件写入的行数 ARIA / 选中 ARIA（角色失效时按此清理，不误删宿主属性） */
  private ariaSizeRows = new WeakSet<HTMLElement>()
  private ariaSelectedRows = new WeakSet<HTMLElement>()
  /** sortable 拖拽源行索引（-1 = 无进行中拖拽）与源元素 */
  private dragFrom = -1
  private dragFromEl: HTMLElement | null = null

  get dataItems(): unknown[] {
    return this.rows.slice()
  }

  /** 数据通道 property（命名避坑：公开 attribute `data` 是 JSON 字符串通道，property 用
   *  `dataItems` 读取；写入经 `setData()`，避免与 HTMLElement.dataset 语义混淆） */
  set data(value: unknown[]) {
    this.setData(value)
  }

  /**
   * 数据写入（property 通道）。公开类型保持 `unknown[]`（API 文档类型准确），运行时经
   * `parseJsonArray` 容忍 JSON 字符串——框架（Vue 按「key in el」写 property）把静态
   * `data` attribute 的 JSON 字符串直接写进 setter 时不再被当非法数组清空（同
   * gantt/resource/scheduler 口径）；非法 JSON / 非数组按空数组处理。
   */
  setData(value: unknown[]): void {
    this.rows = parseJsonArray<unknown>(value as unknown).slice()
    this.dataFromProperty = true
    if (this.isConnected) this.update()
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="list" part="list">
        <div class="header" part="header" hidden><slot name="header"></slot></div>
        <div class="body" part="body">
          <div class="items" part="items"><slot></slot></div>
          <div class="data-items" part="data-items" hidden></div>
          <oas-virtual-list class="vlist" part="virtual" hidden></oas-virtual-list>
        </div>
        <div class="skeleton" part="skeleton" hidden>
          <div class="sk-line sk-title"></div>
          <div class="sk-line"></div>
          <div class="sk-line sk-short"></div>
        </div>
        <div class="empty" part="empty" hidden>
          <div class="empty-default" part="empty-default">
            <div class="empty-icon" aria-hidden="true"></div>
            <span part="empty-text"></span>
          </div>
          <slot name="empty"></slot>
        </div>
        <div class="footer" part="footer" hidden><slot name="footer"></slot></div>
        <div class="load-more" part="load-more" hidden><slot name="load-more"></slot></div>
      </div>
    `
  }

  /** 缓存节点引用 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.body = this.shadow.querySelector<HTMLElement>('[part="body"]')
    this.vlist = this.shadow.querySelector<OASVirtualList>('oas-virtual-list')
    this.body?.addEventListener('scroll', this.handleScroll, { passive: true })
    // windowed：视口尺寸变化（可见行数变化）→ 重新评估期望窗口（reason=resize）
    if (typeof ResizeObserver !== 'undefined' && !this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.handleViewportResize())
      if (this.body) this.resizeObserver.observe(this.body)
    }
    // 宿主 role / aria-label 迁移：role 不进 observedAttributes（标准 ARIA 属性不应算组件 API），
    // 改用属性观察；挂载前设置的 role 由 update() 首帧迁移，运行期变更经此观察重跑迁移
    if (typeof MutationObserver !== 'undefined' && !this.hostAriaObserver) {
      this.hostAriaObserver = new MutationObserver(() => {
        // 迁移本身会移除宿主 role / aria-label：由移除引起的回调不再重跑，
        // 否则会与滚动 update 竞争（可能把 window 请求误标为 data 原因）
        if (this.hasAttribute('role') || this.hasAttribute('aria-label') || this.hasAttribute('aria-labelledby')) {
          this.update()
        }
      })
      this.hostAriaObserver.observe(this, {
        attributes: true,
        attributeFilter: ['role', 'aria-label', 'aria-labelledby'],
      })
    }
    // 虚拟行点击代理（行是内嵌虚拟列表的 div，事件委托取 data-index）
    this.vlist?.addEventListener('click', this.handleVirtualClick)
    // 内嵌虚拟列表的 oas-item 拦截后以列表统一的 oas-item-render 契约重发
    this.vlist?.addEventListener('oas-item', this.handleVirtualItem as EventListener)
    for (const name of ['header', 'footer', 'load-more', 'empty']) {
      this.shadow
        .querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
        ?.addEventListener('slotchange', () => this.update())
    }
    // sortable：HTML5 DnD 事件委托（声明式 light DOM 行与 shadow 数据行的事件均冒泡到宿主；
    // 不逐行绑监听，行重建无需重绑）
    this.addEventListener('dragstart', this.handleDragStart)
    this.addEventListener('dragover', this.handleDragOver)
    this.addEventListener('drop', this.handleDrop)
    this.addEventListener('dragend', this.handleDragEnd)
    this.onCleanup(() => {
      this.body?.removeEventListener('scroll', this.handleScroll)
      this.vlist?.removeEventListener('click', this.handleVirtualClick)
      this.vlist?.removeEventListener('oas-item', this.handleVirtualItem as EventListener)
      this.resizeObserver?.disconnect()
      this.resizeObserver = null
      this.hostAriaObserver?.disconnect()
      this.hostAriaObserver = null
      this.removeEventListener('dragstart', this.handleDragStart)
      this.removeEventListener('dragover', this.handleDragOver)
      this.removeEventListener('drop', this.handleDrop)
      this.removeEventListener('dragend', this.handleDragEnd)
      if (this.raf) cancelAnimationFrame(this.raf)
      this.raf = 0
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（list 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="list"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const list = this.shadow.querySelector('[part="list"]')
    if (!list) return
    const size = ['sm', 'lg'].includes(this.getAttr('size', '')) ? this.getAttr('size', '') : 'md'
    const stripe = this.hasAttr('stripe')
    list.setAttribute('data-bordered', String(this.hasAttr('bordered')))
    list.setAttribute('data-split', String(this.hasAttr('split') || !this.hasAttr('bordered')))
    list.setAttribute('data-size', size)
    // hoverable：整列表行 hover 底色开关（默认关——现状仅 clickable 行有 hover）
    list.setAttribute('data-hoverable', String(this.hasAttr('hoverable')))
    // sortable：行拖拽排序开关（CSS 消费 data-sortable 控制 grab 光标/落点高亮）
    list.setAttribute('data-sortable', String(this.hasAttr('sortable')))
    // RTL 镜像开关（落点高亮侧翻转）
    this.toggleAttribute('data-rtl', isRtl(this))

    this.parseData()

    const body = this.shadow.querySelector<HTMLElement>('[part="body"]')
    const itemsWrap = this.shadow.querySelector<HTMLElement>('[part="items"]')
    const dataItems = this.shadow.querySelector<HTMLElement>('[part="data-items"]')
    const skeleton = this.shadow.querySelector<HTMLElement>('[part="skeleton"]')
    const empty = this.shadow.querySelector<HTMLElement>('[part="empty"]')
    if (!body || !itemsWrap || !dataItems || !skeleton || !empty) return

    // 命名插槽显隐
    for (const name of ['header', 'footer', 'load-more'] as const) {
      const region = this.shadow.querySelector<HTMLElement>(`[part="${name}"]`)
      if (region) region.hidden = !this.slotHasContent(name)
    }
    const emptySlotHas = this.slotHasContent('empty')
    const emptyDefault = this.shadow.querySelector<HTMLElement>('[part="empty-default"]')
    if (emptyDefault) emptyDefault.hidden = emptySlotHas

    // 滚动容器（reach-bottom 载体）。滚动态样式在此就位；tabindex（键盘可达，axe:
    // scrollable-region-focusable）延后到本 update 末尾按「真实溢出」判定——
    // 内容不溢出时不加，避免多出一个空 Tab 停靠点
    const maxHeight = this.getAttr('max-height', '')

    const loading = this.hasAttr('loading')
    // windowed 模式解析：windowed 属性在场且 total 为合法正数才生效
    //（total=0/非法 → 回落普通模式，行为不变）；退出 windowed 时重置去重/首帧标记
    this.winMode = readWindowedMode(
      this.hasAttr('windowed'),
      Number(this.getAttr('total', '')),
      Number(this.getAttr('window-start', '0')),
      this.rows.length,
    )
    // M-2：window-start 越过 total 末尾（脏数据）→ 夹取到全量末尾渲染并 devWarn 一次
    //（对齐 table 的切片越界告警契约：宿主曾误以为越界切片全部生效；不夹取会按越界绝对行号
    // 铺 spacer，顶部占位撑出 total×rowH 之外的巨量空白）
    if (this.winMode.windowed && this.winMode.windowStart > this.winMode.total) {
      if (!this.winStartClampWarned) {
        this.winStartClampWarned = true
        devWarn(
          `[oas-list] windowed window-start ${this.winMode.windowStart} 超出 total ${this.winMode.total}，已夹取到全量末尾渲染（请检查宿主分页/滚动偏移计算）`,
        )
      }
      this.winMode = {
        ...this.winMode,
        windowStart: this.winMode.total,
        loaded: { start: this.winMode.total, end: this.winMode.total + Math.max(0, this.rows.length) },
      }
    }
    if (!this.winMode.windowed) {
      this.winReq = null
      this.winInitDone = false
    }
    // windowed 隐含数据通道：宿主可能先挂空切片等 init 请求回填（此时 data 尚未赋值）
    const dataActive = this.dataChannelActive() || this.winMode.windowed
    // windowed 仅对数据通道生效（声明式子项没有绝对行号来源）
    const windowedActive = !loading && dataActive && this.winMode.windowed
    const grouped = dataActive && this.hasGroups()
    const virtualRequested = this.getAttr('height', '') !== ''
    // 分组 + 虚拟滚动：虚拟窗口下的吸顶与变高组头复杂，本批自动回退全量渲染
    //（组头普通块、不吸顶），避免虚拟列表误吞组头破坏行索引契约。
    // windowed 自带绝对行号铺位，不走内嵌虚拟列表（可见窗口在 total 上算）
    const virtual = !loading && dataActive && this.rows.length > 0 && virtualRequested && !grouped && !windowedActive

    const hasDeclarative = Array.from(this.children).some((c) => c.tagName.toLowerCase() === 'oas-list-item')
    // windowed 下切片为空只说明「可视区间尚未装载」（total>0，全量意义上数据存在）——
    // 不误显空态文案；显式 empty 仍优先
    const isEmpty =
      !loading && (this.hasAttr('empty') || (dataActive ? !windowedActive && this.rows.length === 0 : !hasDeclarative))

    body.style.height = ''
    if (maxHeight !== '') {
      body.style.maxHeight = /^\d+$/.test(maxHeight) ? `${maxHeight}px` : maxHeight
      body.style.overflowY = 'auto'
    } else {
      body.style.maxHeight = ''
      body.style.overflowY = ''
      // max-height 被移除：不再有滚动区，清掉此前按溢出补的 Tab 停靠点
      body.removeAttribute('tabindex')
    }
    // windowed + height：把 body 作为定高滚动视口（行窗口在 total 上算，占位撑起总高）。
    // 高度声明原样落 CSS（支持 50vh 等长度），窗口计算再由实测 clientHeight 取得——
    // 只有「真实定高视口」才可能量出可见行数，避免内容高度被误当成视口
    if (windowedActive && maxHeight === '') {
      const hRaw = this.getAttr('height', '').trim()
      if (hRaw !== '') {
        body.style.height = /^\d+(?:px)?$/i.test(hRaw) ? `${parseFloat(hRaw)}px` : hRaw
        body.style.overflowY = 'auto'
      }
    }

    body.hidden = loading || isEmpty
    skeleton.hidden = !loading
    empty.hidden = !isEmpty
    const text = this.shadow.querySelector<HTMLElement>('[part="empty-text"]')
    if (text && !emptySlotHas) text.textContent = this.getAttr('empty-text', this.t('list.empty'))

    itemsWrap.hidden = dataActive || virtual
    dataItems.hidden = !dataActive || virtual
    dataItems.setAttribute('data-windowed', String(windowedActive))
    if (this.vlist) this.vlist.hidden = !virtual

    // list 语义在行渲染前定容器角色（虚拟列表 syncVirtual 需要 items-role 就位）；
    // 行级角色/行数 ARIA 在渲染后统一同步（含宿主显式角色冲突判定）
    this.listRole = this.desiredListRole()
    this.listChildRole = this.listRole === 'list' ? 'listitem' : this.listRole === 'listbox' ? 'option' : ''

    // 声明式子项：尺寸档与斑马纹下发（data-* 内部标记，条目 CSS 消费）
    const hoverable = this.hasAttr('hoverable')
    if (!dataActive) {
      const declItems = Array.from(this.children).filter(
        (c): c is HTMLElement => c.tagName.toLowerCase() === 'oas-list-item',
      )
      declItems.forEach((item, i) => {
        item.setAttribute('data-size', size)
        item.toggleAttribute('data-stripe', stripe && i % 2 === 1)
        item.toggleAttribute('data-hoverable', hoverable)
        if (this.hasAttr('sortable')) item.setAttribute('draggable', 'true')
        else item.removeAttribute('draggable')
      })
    }

    // 先回迁模板（离开虚拟模式时模板从内嵌虚拟列表迁回 light DOM），再渲染数据行
    if (virtual) this.syncVirtual()
    else {
      this.restoreTemplate()
      if (dataActive) {
        if (windowedActive) this.renderWindowedRows(dataItems, size, stripe)
        else this.renderDataRows(dataItems, size, stripe, !virtualRequested)
      }
    }

    // list 语义 + 行数 ARIA：role/listitem 落在行容器与行上，不与可聚焦滚动容器同层
    this.syncListSemantics(windowedActive)

    // 触底检测（挂载即查一次是否已触底）
    if (maxHeight !== '') this.checkReachBottom()

    // windowed：期望行区间评估（init/data 由 update 触发；scroll/resize 由各自路径写入原因）。
    // 无视口（未配 height / 可测 max-height）时不派发全量请求，首帧标记留待真正可算时消费
    if (windowedActive) {
      const reason = this.pendingWindowReason ?? (this.winInitDone ? 'data' : 'init')
      this.pendingWindowReason = null
      if (this.requestWindowIfNeeded(reason)) this.winInitDone = true
    } else {
      this.pendingWindowReason = null
    }

    // 键盘可达（axe: scrollable-region-focusable）：内容真实溢出才补 tabindex——
    // 判定须在行渲染之后（数据通道行在同一 update 内渲染，提前判定会拿到空容器尺寸）；
    // windowed + height 时 body 也是滚动视口（与 max-height 路径同判）；
    // happy-dom 无布局（scrollHeight/clientHeight 均 0），单测经 mock 溢出值覆盖
    if (maxHeight !== '' || windowedActive) {
      if (body.scrollHeight > body.clientHeight + 1) body.setAttribute('tabindex', '0')
      else body.removeAttribute('tabindex')
    }
  }

  /** 数据通道是否激活（property 或 data 属性给出过数组） */
  private dataChannelActive(): boolean {
    return this.dataFromProperty || this.getAttribute('data') != null
  }

  private parseData(): void {
    if (this.dataFromProperty) return
    const raw = this.getAttribute('data')
    if (raw == null) return
    try {
      const parsed: unknown = JSON.parse(raw)
      this.rows = Array.isArray(parsed) ? parsed : []
    } catch {
      /* 非法 JSON 忽略，保持内部值 */
    }
  }

  /** 命名插槽是否有真实内容（元素节点或非空白文本） */
  private slotHasContent(name: string): boolean {
    const slot = this.shadow.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
    if (!slot) return false
    return slot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  /** 数据通道行渲染：oas-list-item 承载模板克隆 + [data-index] 上下文绑定。
   *  连续同 `group` 的行归入一个 `.group` 容器（组头为首子元素）；组头带 data-sticky
   *  时在该组容器内吸顶（下一组到顶顶走上一组）。`stickyHeaders` 为 false（height 在设
   *  的分组回退）时组头普通渲染不吸顶。组头不计入行索引，行上下文/事件契约不变 */
  private renderDataRows(box: HTMLElement, size: string, stripe: boolean, stickyHeaders: boolean): void {
    box.innerHTML = ''
    const tpl = this.itemTemplate()
    let group: HTMLElement | null = null
    let prevGroup = ''
    this.rows.forEach((item, i) => {
      const meta =
        item != null && typeof item === 'object' && !Array.isArray(item)
          ? (item as { group?: unknown; groupLabel?: unknown })
          : null
      const groupName = meta && typeof meta.group === 'string' ? meta.group.trim() : ''
      // 组起点：新建分组容器（组头 + 本组行都收进容器，吸顶范围=本组）
      if (groupName !== '' && groupName !== prevGroup) {
        const rawLabel = meta && typeof meta.groupLabel === 'string' ? meta.groupLabel.trim() : ''
        const label = rawLabel !== '' ? rawLabel : groupName
        group = document.createElement('div')
        group.className = 'group'
        // 分组容器/组头不占行语义：presentation 让 list 的 owned children 透传到行
        //（组头若是 separator 等非 listitem 角色，会成为 role=list 的非法子元素）
        group.setAttribute('role', 'presentation')
        const header = document.createElement('div')
        header.className = 'group-header'
        if (stickyHeaders) header.setAttribute('data-sticky', '')
        // 语义：静态标题条，非可交互行——不进入行聚焦序列、不干扰行 roving
        header.setAttribute('role', 'presentation')
        header.textContent = label
        group.appendChild(header)
        box.appendChild(group)
      } else if (groupName === '') {
        // 非组行重置分组段（直挂 data-items；其后同组字符串另起一组）
        group = null
      }
      prevGroup = groupName
      // 行数 a11y 由 syncListSemantics 统一写入（在宿主 item-render 补角色之后）
      ;(group ?? box).appendChild(this.makeDataRow(i, item, size, stripe, tpl, null, this.hasAttr('sortable')))
    })
  }

  /**
   * 生成数据行（数据通道 / windowed 共用）：`index` 为行号（windowed 传绝对行号），
   * `rowHeight` 非 null 时锁定行高（windowed 铺位行）。
   */
  private makeDataRow(
    index: number,
    item: unknown,
    size: string,
    stripe: boolean,
    tpl: HTMLTemplateElement | null,
    rowHeight: number | null,
    sortable: boolean,
  ): HTMLElement {
    const row = document.createElement('oas-list-item')
    row.setAttribute('data-index', String(index))
    row.setAttribute('data-size', size)
    // 定高行（与内嵌虚拟列表同款）：内容溢出由 CSS overflow: hidden 裁剪
    if (rowHeight != null) row.style.height = `${rowHeight}px`
    // 斑马纹按传入口径（windowed 用绝对行号，滚动窗口变化时条纹不闪变）
    if (stripe && index % 2 === 1) row.setAttribute('data-stripe', '')
    if (this.hasAttr('hoverable')) row.setAttribute('data-hoverable', '')
    if (sortable) row.setAttribute('draggable', 'true')
    ;(row as { itemData?: unknown }).itemData = item
    if (tpl) row.appendChild(cloneSlotContent(tpl))
    this.emit('item-render', { index, item, element: row })
    // 文本兜底仅用于原始值行：对象行的 title/description 由 item 的 itemData
    // 元数据兜底渲染（String(对象) 只会得到 "[object Object]"，用户实测缺陷）
    if (!tpl && !row.hasChildNodes() && (item == null || typeof item !== 'object')) row.textContent = String(item ?? '')
    return row
  }

  /**
   * windowed 数据行渲染：可视窗口在**全量 total** 上算（computeVirtualWindow），
   * 已装载切片按绝对行号铺位；上下 spacer 撑起全量高度，未装载/窗口外区域留白。
   * 宿主按 `oas-window-request` 回填切片后经 update 重渲染补齐。
   * `data-index` / `oas-item-render.index` 均为绝对行号（与 table/gantt 同口径）。
   */
  private renderWindowedRows(box: HTMLElement, size: string, stripe: boolean): void {
    const mode = this.winMode
    const rowH = this.rowHeightPx()
    const body = this.body
    const scrollTop = body?.scrollTop ?? 0
    // 切片不得越过 total 末尾（防御 window-start + len > total 的脏数据）
    const len = Math.max(0, Math.min(this.rows.length, mode.total - mode.windowStart))
    const vh = this.viewportHeight()
    const tpl = this.itemTemplate()
    box.innerHTML = ''

    // 无视口（未配 height / 可测 max-height，如 SSR 首帧或纯流式布局）：不铺 spacer。
    // 铺 total×rowH 的占位只会撑出巨量空白且无法确定可见窗口——只渲染已装载切片，
    // 请求由 requestWindowIfNeeded 拦下；等 ResizeObserver/布局给出视口后按窗口铺位。
    if (vh <= 0) {
      for (let i = 0; i < len; i++) {
        const abs = mode.windowStart + i
        box.appendChild(this.makeDataRow(abs, this.rows[i], size, stripe, tpl, rowH, false))
      }
      return
    }

    const win = computeVirtualWindow(scrollTop, vh, rowH, mode.total)
    const localStart = Math.min(Math.max(win.start - mode.windowStart, 0), len)
    const localEnd = Math.min(Math.max(win.end - mode.windowStart, 0), len)
    const absFirst = mode.windowStart + localStart
    const absLast = mode.windowStart + localEnd
    const topH = absFirst * rowH
    const bottomH = Math.max(0, (mode.total - absLast) * rowH)

    const top = this.createSpacer('top', topH)
    box.appendChild(top)
    for (let i = localStart; i < localEnd; i++) {
      const abs = mode.windowStart + i
      // windowed 不做本地行重排：渲染窗口的局部 index 对全量无意义（与 table/gantt 同口径），
      // 重排由宿主在全量数据上处理
      box.appendChild(this.makeDataRow(abs, this.rows[i], size, stripe, tpl, rowH, false))
    }
    box.appendChild(this.createSpacer('bottom', bottomH))

    // innerHTML 清空可能把 scrollTop 钳回 0；占位已撑满全量高度后恢复原滚动位置
    if (body && body.scrollTop !== scrollTop) body.scrollTop = scrollTop
  }

  /** windowed 占位块（aria-hidden：纯布局高度，读屏不可见） */
  private createSpacer(kind: 'top' | 'bottom', height: number): HTMLElement {
    const el = document.createElement('div')
    el.className = 'spacer'
    el.setAttribute('data-spacer', kind)
    el.setAttribute('aria-hidden', 'true')
    el.style.height = `${Math.max(0, height)}px`
    return el
  }

  /**
   * 行级 ARIA 同步（单一入口）：角色归属 + `aria-setsize` / `aria-posinset` + `aria-selected`。
   *
   * - 行角色：组件派生的 listitem / option 只在行无宿主显式角色（或角色本就是组件上次写的）
   *   时写入；宿主显式外来角色（如 role=button）保留，且此时容器 list 语义不成立（见
   *   syncListSemantics 的冲突判定）。
   * - 行数 ARIA 不是全局属性：只在行角色支持行数语义时写入；角色不合法时**清理组件此前
   *   写入的值**（角色消失不留 stale ARIA），宿主编写的同名属性不动。
   * - `aria-selected` 仅在角色支持选中语义时同步。
   */
  private syncRowAria(row: HTMLElement, posinset: number, setsize: number): void {
    const childRole = this.listChildRole
    const explicit = (row.getAttribute('role') ?? '').trim()
    const derived = this.derivedRole.get(row)
    if (childRole !== '') {
      if (explicit === '' || explicit === childRole || explicit === derived) {
        if (explicit !== childRole) row.setAttribute('role', childRole)
        this.derivedRole.set(row, childRole)
      }
    } else if (derived != null) {
      // 容器不再有 list 语义：仅撤销仍是组件上次写入值的派生角色（宿主已改写/显式角色保留）
      if (explicit === derived) row.removeAttribute('role')
      this.derivedRole.delete(row)
    }

    const role = (row.getAttribute('role') ?? '').trim()
    if (ARIA_ROWCOUNT_ROLES.has(role)) {
      row.setAttribute('aria-setsize', String(Math.max(0, setsize)))
      row.setAttribute('aria-posinset', String(Math.max(1, posinset)))
      this.ariaSizeRows.add(row)
    } else if (this.ariaSizeRows.has(row)) {
      row.removeAttribute('aria-setsize')
      row.removeAttribute('aria-posinset')
      this.ariaSizeRows.delete(row)
    }
    if (ARIA_SELECTABLE_ROLES.has(role)) {
      row.setAttribute('aria-selected', String(row.hasAttribute('selected')))
      this.ariaSelectedRows.add(row)
    } else if (this.ariaSelectedRows.has(row)) {
      row.removeAttribute('aria-selected')
      this.ariaSelectedRows.delete(row)
    }
  }

  /** 期望的行容器角色：宿主写 list / listbox 时沿用（随后迁到容器并记住意图）；无宿主角色时
   *  默认 list；宿主自定其他角色时不叠加 list 语义（不覆盖宿主意图）。
   *
   *  listbox 是 input 角色，必须有可访问名称（axe aria-input-field-name）：宿主未给
   *  aria-label / aria-labelledby 时回落 list（结构列表语义），避免组件替宿主制造违规。 */
  private desiredListRole(): 'list' | 'listbox' | '' {
    const hostRole = (this.getAttribute('role') ?? '').trim()
    if (hostRole === 'list' || hostRole === 'listbox') {
      const named =
        (this.getAttribute('aria-label') ?? '').trim() !== '' ||
        (this.getAttribute('aria-labelledby') ?? '').trim() !== ''
      this.adoptedListRole = hostRole === 'listbox' && !named ? 'list' : hostRole
      return this.adoptedListRole
    }
    if (hostRole !== '') {
      // 宿主显式换成其他角色：放弃此前迁移的 list 意图
      this.adoptedListRole = ''
      return ''
    }
    // 宿主角色已迁走（adoptedListRole）或从未声明 → list / 记忆的 listbox
    return this.adoptedListRole !== '' ? this.adoptedListRole : 'list'
  }

  /** 当前激活路径的行元素（虚拟行是 vlist 的 item 容器；数据行是 oas-list-item；声明式行在 light DOM） */
  private semanticRowElements(): HTMLElement[] {
    const vlist = this.vlist
    if (vlist && !vlist.hidden) {
      const items = vlist.shadowRoot?.querySelector<HTMLElement>('.items')
      return items ? Array.from(items.children).filter((c): c is HTMLElement => c instanceof HTMLElement) : []
    }
    if (this.dataChannelActive()) {
      const box = this.shadow.querySelector<HTMLElement>('[part="data-items"]')
      return box ? Array.from(box.querySelectorAll<HTMLElement>('oas-list-item')) : []
    }
    return Array.from(this.children).filter((c): c is HTMLElement => c.tagName.toLowerCase() === 'oas-list-item')
  }

  /** 清掉所有行容器的 list 角色（活动路径切换/冲突回退时统一收口） */
  private clearContainerRoles(): void {
    this.shadow.querySelector<HTMLElement>('[part="items"]')?.removeAttribute('role')
    this.shadow.querySelector<HTMLElement>('[part="data-items"]')?.removeAttribute('role')
    const vlist = this.vlist
    vlist?.removeAttribute('items-role')
    vlist?.shadowRoot?.querySelector<HTMLElement>('.items')?.removeAttribute('role')
  }

  /**
   * list 语义归属同步（每次 update 行渲染后调用）。
   *
   * role 落在 shadow 内**紧贴行的容器**上（数据通道 `.data-items` / 声明式 `.items` /
   * 虚拟路径 vlist 的 `.items`），行派生 listitem（宿主声明 listbox 时 option）。宿主元素
   * 不再承担 list 角色：宿主 role=list 时其可聚焦滚动容器/分组条会变成 list 的非法
   * 直接子元素（axe aria-required-children critical）。宿主若写了 list/listbox，角色与
   * aria-label / aria-labelledby 迁到行容器并从宿主移除；其他宿主角色原样保留。
   *
   * 冲突回退：任一行带宿主显式外来角色（不是 listitem / option，如 role=button）时，
   * 容器不设 list 角色——否则 required-children 会判违规。空列表不挂角色（无 listitem）。
   */
  private syncListSemantics(windowed: boolean): void {
    const itemsWrap = this.shadow.querySelector<HTMLElement>('[part="items"]')
    const dataItems = this.shadow.querySelector<HTMLElement>('[part="data-items"]')
    const vlist = this.vlist
    const virtualActive = !!vlist && !vlist.hidden
    const dataActive = this.dataChannelActive() && !virtualActive

    type RowMeta = { el: HTMLElement; pos: number; size: number }
    let container: HTMLElement | null = null
    const rows: RowMeta[] = []
    if (virtualActive) {
      container = vlist?.shadowRoot?.querySelector<HTMLElement>('.items') ?? null
      const size = this.rows.length
      if (container) {
        for (const el of Array.from(container.children)) {
          if (!(el instanceof HTMLElement)) continue
          rows.push({ el, pos: Number(el.getAttribute('data-index')) + 1, size })
        }
      }
    } else if (dataActive) {
      container = dataItems
      const size = windowed ? this.winMode.total : this.rows.length
      if (dataItems) {
        for (const el of dataItems.querySelectorAll<HTMLElement>('oas-list-item')) {
          rows.push({ el, pos: Number(el.getAttribute('data-index')) + 1, size })
        }
      }
    } else {
      container = itemsWrap
      const decl = this.semanticRowElements()
      decl.forEach((el, i) => rows.push({ el, pos: i + 1, size: decl.length }))
    }

    let role = this.desiredListRole()
    const expectedChild = role === 'list' ? 'listitem' : role === 'listbox' ? 'option' : ''
    if (role !== '' && rows.length > 0) {
      const conflict = rows.some(({ el }) => {
        const explicit = (el.getAttribute('role') ?? '').trim()
        // 与组件上次写入值相同的角色不算宿主显式（否则改容器角色时会自判冲突）
        return explicit !== '' && explicit !== expectedChild && explicit !== this.derivedRole.get(el)
      })
      if (conflict) role = ''
    } else {
      // 无行不挂角色（axe reviewEmpty 之外的空容器不承载 list 语义）
      role = ''
    }
    this.listRole = role
    this.listChildRole = role === 'list' ? 'listitem' : role === 'listbox' ? 'option' : ''

    // 容器角色只落活动容器，其余清掉（路径切换不留残留）
    for (const el of [itemsWrap, dataItems]) {
      if (!el) continue
      if (el === container && role !== '') el.setAttribute('role', role)
      else el.removeAttribute('role')
    }
    const vItems = vlist?.shadowRoot?.querySelector<HTMLElement>('.items') ?? null
    if (vItems && vItems !== container) vItems.removeAttribute('role')
    if (container && role !== '') container.setAttribute('role', role)
    if (vlist) {
      if (virtualActive && role !== '') vlist.setAttribute('items-role', role)
      else vlist.removeAttribute('items-role')
    }

    // 宿主 role=list / listbox 迁到行容器（含可访问名称）后从宿主移除：否则宿主上的
    // list 仍会把可聚焦滚动容器算成非法子元素；其他宿主角色原样保留不覆盖
    const hostRole = (this.getAttribute('role') ?? '').trim()
    if (hostRole === 'list' || hostRole === 'listbox') {
      if (role !== '' && container) {
        for (const attr of ['aria-label', 'aria-labelledby'] as const) {
          const v = this.getAttribute(attr)
          if (v != null) container.setAttribute(attr, v)
          this.removeAttribute(attr)
        }
      }
      this.removeAttribute('role')
    }
    // M-1：迁移后的宿主可访问名称动态同步——宿主框架随状态更新把 aria-label/aria-labelledby
    // 重新写（或新绑定）到宿主元素（role 已迁走，上面的 role 判定不再命中）→ 拷贝到行容器并
    // 再次从宿主移除，行容器名称跟随宿主绑定变化（否则停在首次迁移的旧值）。仅在「宿主曾声明
    // list/listbox（迁移态）且 list 语义仍活跃」时接管——宿主主动换角色即放弃，不劫持；
    // 宿主移除属性时保留行容器既有名称（抽走 listbox 名称会制造 aria-input-field-name 违规）
    if (role !== '' && container && this.adoptedListRole !== '') {
      for (const attr of ['aria-label', 'aria-labelledby'] as const) {
        const v = this.getAttribute(attr)
        if (v != null) {
          container.setAttribute(attr, v)
          this.removeAttribute(attr)
        }
      }
    }

    for (const { el, pos, size } of rows) this.syncRowAria(el, pos, size)
  }

  /** 定高行高（px）；windowed 行铺位与窗口计算共用（缺省 64，与 row-height 契约一致） */
  private rowHeightPx(): number {
    return Number(this.getAttr('row-height', '64')) || 64
  }

  /**
   * windowed 可视视口高度：只有配置了滚动视口（`height` 或 `max-height`）才可量测——
   * 优先真实测量 body.clientHeight（浏览器布局后），无布局环境（happy-dom/SSR）回落
   * 数值声明。未配视口 → 0：内容高度不是「可见窗口」，不能据此请求全量区间。
   */
  private viewportHeight(): number {
    const hasViewport = this.getAttr('height', '') !== '' || this.getAttr('max-height', '') !== ''
    if (!hasViewport) return 0
    const body = this.body
    if (body && body.clientHeight > 0) return body.clientHeight
    const h = Number(this.getAttr('height', ''))
    if (Number.isFinite(h) && h > 0) return h
    // max-height 仅接受纯数字 / Npx；vh/% 等无量测环境无法换算，按 0 回落
    const mhRaw = this.getAttr('max-height', '').trim()
    const mh = /^\d+(?:px)?$/i.test(mhRaw) ? parseFloat(mhRaw) : 0
    return mh > 0 ? mh : 0
  }

  /**
   * windowed 可视行窗口（绝对行下标）：仅在视口可量测时有效（调用方先判 viewportHeight）。
   */
  private visibleWindow(): { start: number; end: number } {
    return computeVirtualWindow(
      this.body?.scrollTop ?? 0,
      this.viewportHeight(),
      this.rowHeightPx(),
      this.winMode.total,
    )
  }

  /**
   * 按可视行窗口计算期望区间并按需派发 `oas-window-request`（detail `{ start, end, reason }`，
   * 半开、绝对行下标）。返回是否完成了评估（视口可量测）——不能评估时首帧标记不消费，
   * 等 ResizeObserver/布局给出视口后以 resize/init 原因再来。
   *
   * 无视口（未配 height / 可测 max-height）时**不派发**：此时可见窗口不可知，按全量
   * `[0,total)` 请求会把整个数据集拉下来且 spacer 撑出 total×rowH 的空白。devWarn
   * 一次提示需要可测滚动视口。
   *
   * 去重语义：同一期望区间不重复派发；期望区间被已装载区间覆盖时重置去重状态
   * （之后覆盖情况变化可对同一区间再派）。
   */
  private requestWindowIfNeeded(reason: WindowRequestReason): boolean {
    const mode = this.winMode
    if (!mode.windowed) return false
    if (this.viewportHeight() <= 0) {
      if (!this.winNoViewportWarned) {
        this.winNoViewportWarned = true
        devWarn(
          '[oas-list] windowed 需要可测的滚动视口（height 或可测的 max-height）；当前无视口，已暂缓 oas-window-request',
        )
      }
      return false
    }
    const vis = this.visibleWindow()
    const need = expandWindow(vis.start, vis.end, mode.total, WINDOW_MARGIN)
    if (windowCovered(need, mode.loaded)) {
      this.winReq = null
      return true
    }
    if (sameWindow(need, this.winReq)) return true
    // 先记后派：监听器同步回填时去重状态已就位
    this.winReq = { start: need.start, end: need.end }
    this.emit('window-request', { start: need.start, end: need.end, reason } satisfies WindowRequestDetail)
    return true
  }

  /** 视口尺寸变化（windowed）：可见行数变化 → 以 resize 原因重新评估窗口并重渲染 */
  private handleViewportResize = (): void => {
    if (!this.winMode.windowed) return
    this.pendingWindowReason = 'resize'
    this.update()
  }

  /** 数据是否含分组字段（任一行的 group 为非空字符串即视为分组列表） */
  private hasGroups(): boolean {
    return this.rows.some((it) => {
      if (it == null || typeof it !== 'object' || Array.isArray(it)) return false
      const g = (it as { group?: unknown }).group
      return typeof g === 'string' && g.trim() !== ''
    })
  }

  /** 虚拟模式：内嵌 oas-virtual-list 接管（data → items、模板转发、行高透传）。
   *  role=list 落在 vlist 内 `.items`（items-role 透传）——虚拟行 wrap 派生 listitem，
   *  可聚焦的滚动视口在 `.items` 之外，不会成为 list 的非法子元素 */
  private syncVirtual(): void {
    const v = this.vlist
    if (!v) return
    v.setAttribute('height', this.getAttr('height', '320'))
    v.setAttribute('item-height', this.getAttr('row-height', '64'))
    if (this.listRole !== '') v.setAttribute('items-role', this.listRole)
    else v.removeAttribute('items-role')
    const tpl = this.itemTemplate()
    if (tpl) {
      for (const t of Array.from(v.querySelectorAll('template'))) {
        if (t !== tpl) t.remove()
      }
      if (tpl.parentElement !== v) v.appendChild(tpl)
    }
    v.items = this.rows
  }

  /** 离开虚拟模式：模板迁回宿主 light DOM（供普通数据渲染克隆） */
  private restoreTemplate(): void {
    const v = this.vlist
    if (!v) return
    for (const t of Array.from(v.querySelectorAll('template'))) {
      this.appendChild(t)
    }
  }

  private itemTemplate(): HTMLTemplateElement | null {
    const tpl = this.querySelector('template[slot="item"]')
    return tpl instanceof HTMLTemplateElement ? tpl : null
  }

  private handleScroll = (): void => {
    if (this.raf) return
    this.raf = requestAnimationFrame(() => {
      this.raf = 0
      // windowed：滚动改变可视行窗口 → 按 scroll 原因评估请求并重渲染（含触底检测）
      if (this.winMode.windowed) {
        this.pendingWindowReason = 'scroll'
        this.update()
        return
      }
      this.checkReachBottom()
    })
  }

  /** 触底判定：剩余距离 ≤ bottom-offset 视为触底；进入时派发一次，滚离后重新武装 */
  private checkReachBottom(): void {
    const body = this.body
    if (!body) return
    const offset = Number(this.getAttr('bottom-offset', '0')) || 0
    const remaining = body.scrollHeight - body.scrollTop - body.clientHeight
    const atBottom = remaining <= offset
    if (atBottom && !this.atBottom) this.emit('reach-bottom', { scrollTop: body.scrollTop })
    this.atBottom = atBottom
  }

  // ---------- sortable：行拖拽排序 ----------

  /** 当前列表行元素（数据通道优先；声明式回落 light DOM 子项）——拖拽只支持非虚拟路径 */
  private rowElements(): HTMLElement[] {
    if (this.dataChannelActive()) {
      const box = this.shadow.querySelector<HTMLElement>('[part="data-items"]')
      if (!box) return []
      return [...box.querySelectorAll<HTMLElement>('oas-list-item')]
    }
    return Array.from(this.children).filter((c): c is HTMLElement => c.tagName.toLowerCase() === 'oas-list-item')
  }

  /** 从拖拽事件路径定位所在行（跨 shadow：声明式 light DOM / 数据行 shadow 均在 composedPath） */
  private dragRowFromEvent(e: Event): HTMLElement | null {
    for (const node of e.composedPath()) {
      if (node instanceof Element && node.tagName === 'OAS-LIST-ITEM') return node as HTMLElement
    }
    return null
  }

  /** 清理全部落点高亮 */
  private clearDropMarkers(): void {
    for (const row of this.rowElements()) row.classList.remove('row--drag-over')
  }

  /** 复位拖拽源状态（高亮类 + 源索引） */
  private resetDrag(): void {
    this.dragFromEl?.classList.remove('row--dragging')
    this.dragFromEl = null
    this.dragFrom = -1
  }

  private handleDragStart = (e: Event): void => {
    if (this.winMode.windowed) return
    if (!this.hasAttr('sortable')) return
    const row = this.dragRowFromEvent(e)
    if (!row) return
    const from = this.rowElements().indexOf(row)
    if (from < 0) return
    this.dragFrom = from
    this.dragFromEl = row
    row.classList.add('row--dragging')
    const de = e as DragEvent
    if (de.dataTransfer) {
      de.dataTransfer.effectAllowed = 'move'
      de.dataTransfer.setData('text/plain', String(from))
    }
  }

  private handleDragOver = (e: Event): void => {
    if (this.winMode.windowed) return
    if (this.dragFrom < 0 || !this.hasAttr('sortable')) return
    const row = this.dragRowFromEvent(e)
    if (!row || row === this.dragFromEl) return
    e.preventDefault()
    const de = e as DragEvent
    if (de.dataTransfer) de.dataTransfer.dropEffect = 'move'
    this.clearDropMarkers()
    row.classList.add('row--drag-over')
  }

  private handleDrop = (e: Event): void => {
    if (this.winMode.windowed) return
    if (this.dragFrom < 0 || !this.hasAttr('sortable')) return
    const row = this.dragRowFromEvent(e)
    if (!row) return
    e.preventDefault()
    const rows = this.rowElements()
    const from = this.dragFrom
    const to = rows.indexOf(row)
    const item = this.dataChannelActive() ? this.rows[from] : (rows[from] ?? null)
    this.clearDropMarkers()
    this.resetDrag()
    if (to >= 0 && to !== from) this.emit('reorder', { from, to, item })
  }

  private handleDragEnd = (): void => {
    this.clearDropMarkers()
    this.resetDrag()
  }

  /** 虚拟行点击代理：从内嵌虚拟列表行 div 的 data-index 还原 index/item */
  private handleVirtualClick = (e: Event): void => {
    const path = e.composedPath()
    const row = path.find((n): n is HTMLElement => n instanceof HTMLElement && n.hasAttribute('data-index'))
    if (!row) return
    const index = Number(row.getAttribute('data-index'))
    if (!Number.isInteger(index) || index < 0 || index >= this.rows.length) return
    this.emit('click', { index, item: this.rows[index] })
  }

  /** 内嵌虚拟列表的 oas-item 拦截重发（统一 oas-item-render 契约，detail 带 index/item/element） */
  private handleVirtualItem = (e: Event): void => {
    e.stopPropagation()
    const detail = (e as CustomEvent<{ index: number; item: unknown; element: HTMLElement }>).detail
    this.emit('item-render', detail)
    // 行数 a11y：非 windowed 虚拟滚动为全量行数与行序（1 基）。
    // 放在 item-render 之后：宿主可在该事件里给虚拟行补 role（vlist 的 item-role / 监听器）
    const row = detail.element
    const explicit = (row.getAttribute('role') ?? '').trim()
    if (
      this.listChildRole !== '' &&
      explicit !== '' &&
      explicit !== this.listChildRole &&
      explicit !== this.derivedRole.get(row)
    ) {
      // 宿主显式外来行角色：role=list 的 required-children 不再成立 → 放弃 list 语义
      this.dropListSemantics()
    }
    this.syncRowAria(row, detail.index + 1, this.rows.length)
  }

  /** 放弃 list 语义（宿主显式行角色冲突时）：清容器角色 + 撤销组件派生的行角色/行数 ARIA。
   *  只清理确定由组件写入的值（不给宿主显式行角色回写 0/1 之类的伪行数）。 */
  private dropListSemantics(): void {
    if (this.listRole === '' && this.listChildRole === '') return
    this.listRole = ''
    this.listChildRole = ''
    this.clearContainerRoles()
    for (const el of this.semanticRowElements()) {
      const derived = this.derivedRole.get(el)
      if (derived != null) {
        if ((el.getAttribute('role') ?? '').trim() === derived) el.removeAttribute('role')
        this.derivedRole.delete(el)
      }
      if (this.ariaSizeRows.has(el)) {
        el.removeAttribute('aria-setsize')
        el.removeAttribute('aria-posinset')
        this.ariaSizeRows.delete(el)
      }
      if (this.ariaSelectedRows.has(el)) {
        el.removeAttribute('aria-selected')
        this.ariaSelectedRows.delete(el)
      }
    }
  }
}

/**
 * <template> 子节点双形态克隆（静态 HTML/SSR 落在 template.content；Vue 等框架 CSR
 * 直插 template 元素时落在元素自身 childNodes、content 为空）——与 oas-tree 的
 * cloneSlotContent 同思路的就地实现（list 不依赖 tree 内部模块）。
 */
function cloneSlotContent(tpl: HTMLTemplateElement): DocumentFragment {
  const source = tpl.content.childNodes.length > 0 ? tpl.content : tpl
  const frag = document.createDocumentFragment()
  for (const node of Array.from(source.childNodes)) {
    frag.appendChild(node.cloneNode(true))
  }
  return frag
}
