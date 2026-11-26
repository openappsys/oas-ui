import { OASElement } from '@oas-ui/core/oas-element'
import { createBottomReach, isHiddenInTree, renderMoreState, watchBottomReach } from '../../shared/bottom-reach.js'
import { isRtl } from '../../shared/direction.js'
import { devWarn } from '../../shared/dev-warn.js'
import { parseJsonArray } from '../../shared/json-array.js'
import { resolveRovingMove } from '../../shared/listbox.js'
import { stableHash36 } from '../../shared/stable-id.js'

/**
 * oas-order-list —— 订单列表容器（commerce 族）。
 *
 * 轻量容器：状态页签（`tabs` JSON 双通道 `[{ key, label, count?, disabled? }]`）+
 * 订单卡列表**插槽**（宿主放 `oas-order-card` / 自定义卡——本体不内建卡片渲染）+
 * 加载更多（对齐 goods-list 触底协议：哨兵 + 待应答防重 + 插槽内容变化解除 + 隐藏
 * 容器守卫——两个首波修复都带上）+ 空态。页签切换派 `oas-tab-change`。
 *
 * 与 goods-list 的关系：触底协议内核统一在 `shared/bottom-reach.ts`（判定骨架 / 可见性守卫 /
 * rAF 节流监听 / 加载区三态单一真源；`shouldRequestMore` 亦由该模块导出）；两件差异以回调
 * 参数承载——goods-list 解除信号源是 `items` attribute 签名，本件是 slot 分配节点的**身份序列**
 * 签名，其余状态机一致。
 *
 * 属性（kebab-case）：
 * - `tabs`：页签 JSON 数组（缺 `key` 或 `label` 的条目忽略；非法 JSON 告警一次按空处理，
 *   空 tablist 隐藏）。property 双通道：`tabs`。
 * - `active`：当前页签 key。用户点击 / 键盘激活时组件回写 attribute 并派
 *   `oas-tab-change`；宿主直写静默（受控与非受控同一通道不回环）。property 双通道。
 * - `loading`：加载更多 loading 态（宿主收到 `oas-load-more` 后置位；渲染 spinner +
 *   加载中文案；置位同时解除触底待应答）。
 * - `no-more`：到底态（渲染「没有更多了」，触底不再派发）。
 *
 * 事件（bubbles + composed）：
 * - `oas-tab-change`：用户激活页签，`detail: { key, label }`。
 * - `oas-load-more`：哨兵进入视口（240px 提前量）且非 loading / no-more 时派发；派发后
 *   进入待应答（同一次可见不重复派发），宿主置 `loading` 或**插槽内容变化**（追加订单卡）
 *   解除；宿主两者都不做则不再触发。
 *
 * 插槽：
 * - 默认：订单卡列表位（宿主放 `oas-order-card` / 自定义卡；卡留在 light DOM 不搬运，
 *   卡内容、样式与点击行为完全由宿主接管）。
 * - `empty`：空态（插槽无卡时渲染；缺省 i18n `orderList.empty` 文案）。
 *
 * a11y：页签 `role="tablist"` + `role="tab"`（`aria-selected`；可访问名从可见内容推导
 * ——标签 + count 徽标连续文本，不用 aria-label 包裹破坏 label-in-name）；卡区为对应
 * `role="tabpanel"`（tab `aria-controls` 指向，id 由 tabs/active 派生 `stableHash36`，
 * 同页多实例唯一）；键盘 roving tabindex（方向键移动焦点，Enter / Space 激活——manual
 * activation），disabled 页签跳过焦点；左右方向键按书写方向镜像（RTL 下 `→` 向左移，与
 * time-select 同口径），Home / End 跳首末；空态 / 加载区 / 哨兵在 tabpanel 语义之外；加载区
 * `role="status"` + `aria-live="polite"` 活区。颜色全走 token，布局走逻辑属性（RTL 安全）。
 */
export interface OrderTab {
  key: string
  label: string
  /** 徽标数字（缺省不渲染徽标） */
  count?: number
  disabled?: boolean
}

export interface OrderTabChangeDetail {
  key: string
  label: string
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.wrap {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  min-width: 0;
}
.tabs {
  display: flex;
  gap: var(--oas-space-1);
  overflow-x: auto;
  scrollbar-width: none;
}
.tabs::-webkit-scrollbar {
  display: none;
}
.tabs[hidden] {
  display: none;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  box-sizing: border-box;
  flex: none;
  min-height: var(--oas-control-height-sm, 24px);
  padding: 0 var(--oas-space-3);
  border: 0;
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-color-bg-hover);
  /* text-secondary on bg-hover = 4.40:1 不达 AA（axe ratio 违规真修）：基态走 text-primary */
  color: var(--oas-color-text-primary);
  font: inherit;
  font-size: var(--oas-font-size-sm);
  white-space: nowrap;
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out), color var(--oas-transition-fast) var(--oas-ease-out);
}
/* 未选中页签 hover：bg-hover 向文字色混 6% 得可感知加深一档（无独立 bg-active token）；
   text-primary on 合成底 ≈ 10:1，对比度不因 hover 回退（III-1 交互态回归） */
.tab:hover:not([aria-selected='true']):not(:disabled) {
  background: color-mix(in srgb, var(--oas-color-text-primary) 6%, var(--oas-color-bg-hover));
}
.tab:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.tab[aria-selected='true'] {
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  font-weight: 500;
}
.tab:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.count {
  display: inline-flex;
  padding: 0 var(--oas-space-1);
  border-radius: var(--oas-radius-full, 999px);
  border: 1px solid color-mix(in srgb, currentColor 45%, transparent);
  font-size: var(--oas-font-size-xs);
  line-height: 1.6;
}
.body {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  min-width: 0;
}
.more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-2);
  padding-block: var(--oas-space-3);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.more[hidden] {
  display: none;
}
.sentinel {
  height: 1px;
}
.spinner {
  width: 1em;
  height: 1em;
  border: 2px solid var(--oas-color-border);
  border-block-start-color: var(--oas-color-primary);
  border-radius: var(--oas-radius-full, 999px);
  animation: order-list-spin 0.8s linear infinite;
}
.spinner[hidden] {
  display: none;
}
@keyframes order-list-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--oas-space-6);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.empty[hidden] {
  display: none;
}
.empty-text {
  display: inline-flex;
}
.empty-text[hidden] {
  display: none;
}
@media (forced-colors: active) {
  .tab:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 2px;
    box-shadow: none;
  }
  .spinner {
    border-color: CanvasText;
  }
}
`

export class OASOrderList extends OASElement {
  static override get observedAttributes(): string[] {
    return ['tabs', 'active', 'loading', 'no-more']
  }

  private tablistEl: HTMLElement | null = null
  private bodyEl: HTMLElement | null = null
  private moreEl: HTMLElement | null = null
  private spinnerEl: HTMLElement | null = null
  private moreTextEl: HTMLElement | null = null
  private sentinelEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  private emptyTextEl: HTMLElement | null = null
  private slotEl: HTMLSlotElement | null = null
  private emptySlot: HTMLSlotElement | null = null

  private warnedTabsJson = false
  /** active 指向 disabled / 不存在的 roving 兜底告警（与非法 JSON 告警独立，各一次） */
  private warnedRovingFallback = false
  /** 触底待应答（派发 oas-load-more 后直到宿主置 loading 或插槽内容变化才解除） */
  private loadPending = false
  /** slot 分配卡身份序列签名（变化即解除触底待应答——对齐 goods-list 等数量增删教训，见 NODE_IDS） */
  private slotSignature = ''
  /** 触底内核（shared/bottom-reach）：解除信号源 = slot 节点身份序列，内容源 = slot 分配卡 */
  private readonly bottomReach = createBottomReach({
    sentinel: () => this.sentinelEl,
    hasContent: () => this.hasSlotCards(),
    hidden: () => isHiddenInTree(this),
    state: () => ({
      loading: this.hasAttr('loading'),
      noMore: this.hasAttr('no-more'),
      pending: this.loadPending,
    }),
    release: () => {
      const cards = this.slotEl?.assignedElements({ flatten: true }) ?? []
      const signature = JSON.stringify(
        cards.filter((n): n is HTMLElement => n instanceof HTMLElement).map((n) => OASOrderList.identityOf(n)),
      )
      if (signature === this.slotSignature) return false
      this.slotSignature = signature
      return true
    },
    setPending: (pending) => {
      this.loadPending = pending
    },
    request: () => this.emit('load-more', {}),
  })
  /** 触底监听解绑句柄（连接 / 重连挂载，断连经 onCleanup 摘） */
  private unbindBottomReach: (() => void) | null = null

  /**
   * 宿主节点身份 id（签名用）：等数量增删（换页签后宿主等数量换卡）时数量签名不变，
   * 只靠数量无法区分「换掉一张」与「内容不变」——身份序列才能触发解除。
   * WeakMap 存身份：节点被宿主回收即自动释放；id 单调递增不复用（goods-list 同款模式）。
   */
  private static NODE_IDS = new WeakMap<HTMLElement, number>()
  private static nextNodeId = 1

  private static identityOf(node: HTMLElement): number {
    let id = OASOrderList.NODE_IDS.get(node)
    if (id === undefined) {
      id = OASOrderList.nextNodeId++
      OASOrderList.NODE_IDS.set(node, id)
    }
    return id
  }

  // -------------------------------------------------------------------------
  // property 通道
  // -------------------------------------------------------------------------

  /**
   * @apiProperty 页签配置：get+set 双通道（数组或 JSON 字符串），赋值即生效不派发事件
   */
  get tabs(): OrderTab[] {
    return this.parseTabs()
  }

  set tabs(value: OrderTab[] | string) {
    this.setAttribute('tabs', typeof value === 'string' ? value : JSON.stringify(value ?? []))
  }

  /**
   * @apiProperty 当前页签 key：get+set 双通道，宿主直写静默不派发事件
   */
  get active(): string {
    const raw = this.getAttr('active')
    if (raw) return raw
    return this.parseTabs()[0]?.key ?? ''
  }

  set active(v: string) {
    this.setAttribute('active', v)
  }

  // -------------------------------------------------------------------------
  // 数据解析
  // -------------------------------------------------------------------------

  private parseTabs(): OrderTab[] {
    return parseJsonArray<OrderTab>(this.getAttr('tabs'), () => {
      if (!this.warnedTabsJson) {
        this.warnedTabsJson = true
        devWarn('[oas-order-list] tabs 不是合法 JSON 数组，已按空列表处理')
      }
    }).filter(
      (it): it is OrderTab =>
        typeof it === 'object' &&
        it !== null &&
        typeof (it as OrderTab).key === 'string' &&
        (it as OrderTab).key !== '' &&
        typeof (it as OrderTab).label === 'string' &&
        (it as OrderTab).label !== '',
    )
  }

  private resolveActive(tabs: OrderTab[]): string {
    const raw = this.getAttr('active')
    if (raw && tabs.some((t) => t.key === raw)) return raw
    return tabs[0]?.key ?? ''
  }

  // -------------------------------------------------------------------------
  // 生命周期
  // -------------------------------------------------------------------------

  private template(): string {
    return `
      <style>${STYLE}</style>
      <section class="wrap" part="wrap">
        <div class="tabs" part="tablist" role="tablist" aria-label="" hidden></div>
        <div class="body" part="body" role="tabpanel" tabindex="0" aria-label="">
          <slot class="slot-source"></slot>
        </div>
        <div class="more" part="more" role="status" aria-live="polite" hidden>
          <span class="spinner" part="spinner" aria-hidden="true" hidden></span>
          <span class="more-text" part="more-text"></span>
        </div>
        <div class="sentinel" part="sentinel" aria-hidden="true"></div>
        <div class="empty" part="empty" hidden>
          <slot name="empty"></slot>
          <span class="empty-text" part="empty-text"></span>
        </div>
      </section>
    `
  }

  private bind(): void {
    this.tablistEl = this.shadow.querySelector<HTMLElement>('[part="tablist"]')
    this.bodyEl = this.shadow.querySelector<HTMLElement>('[part="body"]')
    this.moreEl = this.shadow.querySelector<HTMLElement>('[part="more"]')
    this.spinnerEl = this.shadow.querySelector<HTMLElement>('[part="spinner"]')
    this.moreTextEl = this.shadow.querySelector<HTMLElement>('[part="more-text"]')
    this.sentinelEl = this.shadow.querySelector<HTMLElement>('[part="sentinel"]')
    this.emptyEl = this.shadow.querySelector<HTMLElement>('[part="empty"]')
    this.emptyTextEl = this.shadow.querySelector<HTMLElement>('[part="empty-text"]')
    this.slotEl = this.shadow.querySelector<HTMLSlotElement>('slot.slot-source')
    this.emptySlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="empty"]')

    this.tablistEl?.addEventListener('click', this.onTabClick)
    this.tablistEl?.addEventListener('keydown', this.onTabKeydown)
    this.slotEl?.addEventListener('slotchange', this.onSlotChange)
    this.emptySlot?.addEventListener('slotchange', this.onSlotChange)
    this.bindLoadMoreListeners()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unbindLoadMoreListeners()
  }

  private readonly onSlotChange = (): void => {
    this.update()
  }

  // -------------------------------------------------------------------------
  // 渲染同步
  // -------------------------------------------------------------------------

  protected override update(): void {
    if (!this.tablistEl) return
    const tabs = this.parseTabs()
    // tabpanel 可访问名（组件级上下文；tablist 由 tabsLabel 命名）
    this.bodyEl?.setAttribute('aria-label', this.t('orderList.label'))
    this.syncTabs(tabs)
    this.syncMore()
    this.syncEmpty()
  }

  /** 页签：签名比对才重建；roving tabindex + aria-selected + aria-controls；重建前后焦点捕获/复原 */
  private syncTabs(tabs: OrderTab[]): void {
    const tablist = this.tablistEl
    if (!tablist) return
    tablist.hidden = tabs.length === 0
    tablist.setAttribute('aria-label', this.t('orderList.tabsLabel'))
    const activeKey = this.resolveActive(tabs)
    const signature = JSON.stringify([tabs, activeKey])
    if (signature === tablist.dataset.sig) return
    tablist.dataset.sig = signature
    // 焦点捕获（oas-tabs 先例）：全量重建会丢焦点——记录当前焦点 tab 身份，重建后复原
    const focusedKey = this.shadow.activeElement?.closest('[part="tab"]')?.getAttribute('data-key') ?? null
    // tabpanel id：身份属性串派生（stableHash36，SSR/同页多实例安全）
    const panelId = `ol-panel-${stableHash36(this.getAttr('tabs') + '|' + this.tagName.toLowerCase())}`
    this.bodyEl?.setAttribute('id', panelId)
    const fragment = document.createDocumentFragment()
    // roving tabindex：激活 tab 进 Tab 序（disabled 恒 -1）；active 指向 disabled / 不存在时
    // 兜底首个 enabled tab（tablist 恒有一个 Tab 达节点，ARIA tabs 不变量）+ devWarn 一次
    let rovingKey = activeKey
    const activeDef = tabs.find((t) => t.key === activeKey)
    if (!activeDef || activeDef.disabled) {
      rovingKey = tabs.find((t) => !t.disabled)?.key ?? ''
      if (rovingKey && !this.warnedRovingFallback) {
        this.warnedRovingFallback = true
        devWarn(
          `[oas-order-list] active "${activeKey}" 指向 disabled / 不存在的页签，roving tabindex 已兜底首个可用页签 "${rovingKey}"`,
        )
      }
    }
    tabs.forEach((tab) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'tab'
      btn.setAttribute('part', 'tab')
      btn.setAttribute('role', 'tab')
      btn.setAttribute('data-key', tab.key)
      btn.setAttribute('aria-selected', String(tab.key === activeKey))
      btn.setAttribute('aria-controls', panelId)
      btn.tabIndex = tab.key === rovingKey && !tab.disabled ? 0 : -1
      if (tab.disabled) {
        btn.disabled = true
        btn.setAttribute('aria-disabled', 'true')
      }
      const label = document.createElement('span')
      label.textContent = tab.label
      btn.appendChild(label)
      if (tab.count !== undefined && Number.isFinite(Number(tab.count))) {
        const count = document.createElement('span')
        count.className = 'count'
        count.setAttribute('part', 'count')
        count.textContent = String(tab.count)
        btn.appendChild(count)
      }
      fragment.appendChild(btn)
    })
    tablist.replaceChildren(fragment)
    // 焦点复原：重建前焦点在 tablist 内 → 优先落回同 key 的新 tab；命中 disabled（focus 会
    // no-op、焦点丢 body）时落 roving 兜底 tab（III-3）；同 key 不存在则归还文档流
    if (focusedKey !== null) {
      const restored = tablist.querySelector<HTMLButtonElement>(`[part="tab"][data-key="${CSS.escape(focusedKey)}"]`)
      const roving = tablist.querySelector<HTMLButtonElement>('[part="tab"][tabindex="0"]')
      if (restored && !restored.disabled) restored.focus()
      else roving?.focus()
    }
  }

  /** 加载更多区：loading / no-more / 缺省（哨兵常驻）三态；无卡时整区隐藏 */
  private syncMore(): void {
    const loading = this.hasAttr('loading')
    const noMore = this.hasAttr('no-more')
    renderMoreState({
      more: this.moreEl,
      spinner: this.spinnerEl,
      text: this.moreTextEl,
      labels: { loading: this.t('orderList.loading'), noMore: this.t('orderList.noMore') },
      hasContent: this.hasSlotCards(),
      loading,
      noMore,
    })
    // loading 置位 = 宿主应答本轮触底，解除待应答
    if (loading) this.loadPending = false
    this.bottomReach.check()
  }

  private syncEmpty(): void {
    const empty = this.emptyEl
    if (!empty) return
    const hasCards = this.hasSlotCards()
    empty.hidden = hasCards
    const hasSlot = this.hasSlotContent(this.emptySlot)
    if (this.emptyTextEl) {
      this.emptyTextEl.hidden = hasSlot
      this.emptyTextEl.textContent = hasSlot ? '' : this.t('orderList.empty')
    }
  }

  private hasSlotCards(): boolean {
    return (this.slotEl?.assignedElements({ flatten: true }).length ?? 0) > 0
  }

  private hasSlotContent(slot: HTMLSlotElement | null): boolean {
    return (
      slot
        ?.assignedNodes()
        .some((node) => (node.textContent ?? '').trim() !== '' || node.nodeType === Node.ELEMENT_NODE) ?? false
    )
  }

  // -------------------------------------------------------------------------
  // 加载更多（触底；内核见 shared/bottom-reach.ts）
  // -------------------------------------------------------------------------

  /** 全局监听（滚动触底）：连接 / 重连时挂，断开时经 onCleanup 摘 */
  private bindLoadMoreListeners(): void {
    if (this.unbindBottomReach) return
    this.unbindBottomReach = watchBottomReach(() => this.bottomReach.check())
    this.onCleanup(() => this.unbindLoadMoreListeners())
  }

  private unbindLoadMoreListeners(): void {
    this.unbindBottomReach?.()
    this.unbindBottomReach = null
  }

  // -------------------------------------------------------------------------
  // 页签交互
  // -------------------------------------------------------------------------

  private readonly onTabClick = (e: MouseEvent): void => {
    const tab = (e.target as Element | null)?.closest<HTMLElement>('[part="tab"]')
    if (!tab) return
    this.activateTab(tab)
  }

  private readonly onTabKeydown = (e: Event): void => {
    const event = e as KeyboardEvent
    const tabs = this.parseTabs()
    const enabled = tabs.filter((t) => !t.disabled)
    if (enabled.length === 0) return
    const focusables = [...this.tablistEl!.querySelectorAll<HTMLElement>('[part="tab"]:not(:disabled)')]
    const current = this.tablistEl!.querySelector<HTMLElement>('[part="tab"][tabindex="0"]')
    const idx = current ? focusables.indexOf(current) : -1
    // 水平 / 垂直方向键 + Home / End 统一走 shared/listbox 内核；RTL 下左右键镜像（与 time-select 对齐）
    const next = resolveRovingMove(event.key, {
      count: focusables.length,
      current: idx,
      rtl: isRtl(this),
      keys: ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'],
    })
    if (next !== null) {
      event.preventDefault()
      this.moveFocus(focusables[next]!)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      const tab = (event.target as Element | null)?.closest<HTMLElement>('[part="tab"]')
      if (!tab) return
      event.preventDefault()
      this.activateTab(tab)
    }
  }

  /** 方向键只移焦点（manual activation），不改选中 */
  private moveFocus(tab: HTMLElement): void {
    for (const t of [...this.tablistEl!.querySelectorAll<HTMLElement>('[part="tab"]')]) {
      t.tabIndex = -1
    }
    tab.tabIndex = 0
    tab.focus()
  }

  /** 激活页签：回写 active + 派发（宿主直写静默——不回环）；update 由属性通道触发（M6：不手动二次调用） */
  private activateTab(tab: HTMLElement): void {
    if ((tab as HTMLButtonElement).disabled) return
    const key = tab.getAttribute('data-key') ?? ''
    const tabDef = this.parseTabs().find((t) => t.key === key)
    if (!tabDef) return
    if (this.resolveActive(this.parseTabs()) === key) {
      // 已激活：只归位焦点，不重复派发
      this.moveFocus(tab)
      return
    }
    this.setAttribute('active', key)
    this.emit('tab-change', { key, label: tabDef.label } satisfies OrderTabChangeDetail)
  }
}
