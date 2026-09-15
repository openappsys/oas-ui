import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

/** position 合法值：static（默认，随文档流）/ absolute / fixed / floating（圆角悬浮） */
export type AppBarPosition = 'static' | 'absolute' | 'fixed' | 'floating'

const VALID_POSITIONS: readonly AppBarPosition[] = ['static', 'absolute', 'fixed', 'floating']
const warnedPositions = new Set<string>()

/** 非法 position 归一化：回落 static 并在 dev 下 console.warn 一次（同值去重，对齐库内惯例） */
function normalizePosition(raw: string): AppBarPosition {
  if ((VALID_POSITIONS as readonly string[]).includes(raw)) return raw as AppBarPosition
  if (!warnedPositions.has(raw)) {
    warnedPositions.add(raw)
    console.warn(`[oas-app-bar] 非法 position "${raw}"，已回落 static；合法值：static/absolute/fixed/floating`)
  }
  return 'static'
}

/** extended 扩展区滚动收起阈值（scrollY 超过即收起，回到阈值以下展开） */
const EXT_COLLAPSE_THRESHOLD = 8

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-elevated);
  box-sizing: border-box;
  /* hide-on-scroll 滑动收起/恢复：transition 只动 transform（不碰布局），走 token */
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
}
:host([hidden]) {
  display: none;
}
/* ===== 主行 ===== */
.row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  min-height: var(--oas-app-bar-height, 56px);
  box-sizing: border-box;
  padding: var(--oas-space-2) var(--oas-space-4);
}
/* leading 区：汉堡钮 + 宿主自填内容 */
.leading {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  flex-shrink: 0;
}
.leading[hidden] {
  display: none;
}
/* 汉堡钮（menu-button 属性驱动）：原生 button，键盘可达 */
.menu-btn {
  appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--oas-control-height-md);
  height: var(--oas-control-height-md);
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-md);
  background: transparent;
  color: var(--oas-color-text-primary);
  cursor: pointer;
  flex-shrink: 0;
}
.menu-btn:hover {
  background: var(--oas-color-bg-hover);
}
.menu-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.menu-btn[hidden] {
  display: none;
}
/* 标题区：flex:1 布局支柱（把 actions/trailing 推到远端），heading 过长省略号 */
.title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.title {
  font-size: var(--oas-font-size-lg);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.title[hidden] {
  display: none;
}
/* actions 区：溢出收纳容器——min-width:0 允许被压缩（title 收缩到 0 后才轮到它），
   overflow-x: clip 只裁横轴、纵轴放行（hidden 会双轴裁剪，把向下弹出的「···」弹层裁掉）；
   弹层打开时切 overflow: visible（.open），防弹层横向超出容器被裁 */
.actions {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  min-width: 0;
  overflow-x: clip;
  overflow-y: visible;
}
.actions[hidden] {
  display: none;
}
.actions.open {
  overflow: visible;
  z-index: calc(var(--oas-z-index-base, 0) + 20);
}
/* 子项防收缩：flex 默认 shrink=1 会把项压扁（scrollWidth 恒等于 clientWidth），
   溢出收纳的 scrollWidth>clientWidth 判定永不触发——防收缩后溢出真实出现 */
slot[name="actions"]::slotted(*) {
  flex-shrink: 0;
}
::slotted([data-collapsed]) {
  display: none !important;
}
/* trailing 区：最末端内容（头像/主题切换等），不参与溢出收纳 */
.trailing {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  flex-shrink: 0;
}
.trailing[hidden] {
  display: none;
}
/* ===== 「···」溢出收纳钮 + 弹层 ===== */
.more {
  appearance: none;
  box-sizing: border-box;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-2);
  border: 1px solid transparent;
  border-radius: var(--oas-radius-md);
  background: transparent;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;
}
.more:hover {
  background: var(--oas-color-bg-hover);
}
.more:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.more[hidden] {
  display: none;
}
.more-panel {
  position: absolute;
  top: calc(100% + var(--oas-space-2));
  /* 逻辑 inset：对齐 actions 容器远端；RTL 自动镜像（不用物理 right/left） */
  inset-inline-end: 0;
  z-index: calc(var(--oas-z-index-base, 0) + 10);
  min-width: 140px;
  max-height: 320px;
  overflow-y: auto;
  padding: var(--oas-space-1);
  background: var(--oas-color-bg-elevated);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: var(--oas-app-bar-shadow, var(--oas-shadow-md));
  display: flex;
  flex-direction: column;
}
.more-panel[hidden] {
  display: none;
}
.mirror {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  text-align: start;
  padding: var(--oas-space-1_5) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  white-space: nowrap;
}
.mirror:hover {
  background: var(--oas-color-bg-hover);
}
.mirror:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* ===== extended 扩展区（第二行）=====
   grid-template-rows 1fr→0fr 过渡：只动网格行高实现收起（overflow hidden 裁内容），
   不碰文档流宽度；[hidden] 显式补回（display:grid 会覆盖 UA 的 hidden 样式） */
.extended-wrap {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows var(--oas-transition-base) var(--oas-ease-out);
}
.extended-wrap[hidden] {
  display: none;
}
:host([data-ext-collapsed]) .extended-wrap {
  grid-template-rows: 0fr;
}
.extended-inner {
  min-height: 0;
  overflow: hidden;
}
/* ===== 定位形态（position）=====
   data-position 由 update 归一化写入（非法值已回落 static），CSS 只需覆盖合法值 */
:host([data-position='absolute']) {
  position: absolute;
  top: var(--oas-app-bar-top, 0px);
  inset-inline: 0;
}
:host([data-position='fixed']) {
  position: fixed;
  top: var(--oas-app-bar-top, 0px);
  inset-inline: 0;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-fixed, 1030));
}
/* floating：圆角悬浮 + 投影 + 四边留边（形态语言对齐浮动胶囊），fixed 定位浮于视口顶部 */
:host([data-position='floating']) {
  position: fixed;
  top: var(--oas-app-bar-top, var(--oas-space-3));
  inset-inline: var(--oas-app-bar-inset, var(--oas-space-3));
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-fixed, 1030));
  border-radius: var(--oas-radius-lg);
  border: 1px solid var(--oas-color-border);
  box-shadow: var(--oas-app-bar-shadow, var(--oas-shadow-md));
}
/* ===== 投影：elevated 常显 / 滚动后出现（内容滚动时栏底投影，通行行为）===== */
:host([elevated]),
:host([data-scrolled]) {
  box-shadow: var(--oas-app-bar-shadow, var(--oas-shadow-sm));
}
/* ===== hide-on-scroll 滚动折叠：向下滚 translateY 滑出视口顶部，向上滚滑回 =====
   translateY 扣除 top 偏移（floating 自带留边、宿主可开 --oas-app-bar-top），完整移出视口 */
:host([data-position='fixed'][data-hidden]),
:host([data-position='absolute'][data-hidden]) {
  transform: translateY(calc(-100% - var(--oas-app-bar-top, 0px)));
}
:host([data-position='floating'][data-hidden]) {
  transform: translateY(calc(-100% - var(--oas-app-bar-top, var(--oas-space-3))));
}
/* 减少动效偏好：滑动收起/恢复与扩展区收起过渡停用（静止值仍生效） */
@media (prefers-reduced-motion: reduce) {
  :host {
    transition: none;
  }
  .extended-wrap {
    transition: none;
  }
}
/* ===== 移动端触摸目标：coarse pointer 下汉堡钮/「···」/镜像行最小高度 ≥ --oas-touch-target-min ===== */
@media (pointer: coarse) {
  .menu-btn,
  .more,
  .mirror {
    min-height: var(--oas-touch-target-min, 44px);
  }
}
`

/**
 * oas-app-bar —— 应用栏（页面/工具区顶部的布局条）。
 *
 * 结构：`role="banner"`。主行 = leading 区（汉堡钮 + `slot="leading"`）+ 标题区
 * （`heading` 属性 / `slot="title"` 富标题，flex:1 支柱）+ `slot="actions"` 操作区
 * （超宽自动收进「···」弹层）+ `slot="trailing"` 末端区；第二行 = `slot="extended"` 扩展区。
 *
 * 属性（kebab-case）：
 * - `heading`：标题文案；`slot="title"` 有内容时覆盖
 * - `menu-button`：布尔，显示汉堡钮；点击派发 `oas-menu-toggle`（宿主自行开合抽屉）
 * - `menu-open`：布尔，宿主抽屉开合状态 → 汉堡钮 `aria-expanded` 同步
 * - `menu-controls`：汉堡钮 `aria-controls` 指向的宿主抽屉元素 id（缺省无）
 * - `position`：`static`（默认）/ `absolute` / `fixed` / `floating`（圆角悬浮 + 投影 +
 *   四边留边）；非法值回落 static 并告警（同值去重）；fixed/absolute 顶部偏移走
 *   `--oas-app-bar-top` 变量开口
 * - `hide-on-scroll`：布尔，滚动折叠——下滚栏 `translateY` 滑出视口、上滚滑回
 *   （滚动差 >4px 判方向；仅悬浮形态 absolute/fixed/floating 生效，static 无效果）；
 *   纯视觉收起不加 aria-hidden，滚回即恢复
 * - `extended-collapse-on-scroll`：布尔，滚动超过 8px 收起扩展区只留主行，回到阈值下展开
 * - `elevated`：布尔，常显投影；未设置时滚动后（scrollY>0）自动出现投影（data-scrolled）
 *
 * 变量开口：`--oas-app-bar-height`（主行高，默认 56px）/ `--oas-app-bar-top`（悬浮顶部偏移）/
 * `--oas-app-bar-inset`（floating 侧边留边）/ `--oas-app-bar-shadow`（投影）
 *
 * 事件：`oas-menu-toggle`（汉堡钮点击）
 *
 * a11y：收纳「···」钮 `aria-haspopup="menu"` + `aria-expanded` + i18n aria-label；
 * 弹层 `role="menu"` + 镜像项 `role="menuitem"`，Esc 关闭回焦、方向键/Home/End 移动；
 * 触屏（coarse pointer）下交互钮最小高度抬到 `--oas-touch-target-min`；
 * RTL：`data-rtl` 钩子 + 全逻辑属性布局（inset-inline/padding-inline），物理方向规则零依赖
 */
export class OASAppBar extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'heading',
      'menu-button',
      'menu-open',
      'menu-controls',
      'position',
      'hide-on-scroll',
      'extended-collapse-on-scroll',
      'elevated',
      'dir',
    ]
  }

  private barEl: HTMLElement | null = null
  private titleEl: HTMLElement | null = null
  private leadingWrapEl: HTMLElement | null = null
  private actionsWrapEl: HTMLElement | null = null
  private trailingWrapEl: HTMLElement | null = null
  private extendedWrapEl: HTMLElement | null = null
  private menuBtnEl: HTMLButtonElement | null = null
  private moreBtnEl: HTMLButtonElement | null = null
  private morePanelEl: HTMLElement | null = null
  /** 弹层是否打开（「···」点开/收起） */
  private moreOpen = false
  /** 水平溢出收纳的 ResizeObserver（宿主宽度变化时重算收纳） */
  private overflowObserver: ResizeObserver | null = null
  /** document 外点关闭器与 ResizeObserver 是否已注册（断开重连由 update 幂等恢复） */
  private boundExternals = false
  /** window scroll 监听是否已绑定（连接期间只绑一次，断开清理置 false，重连自动重绑） */
  private scrollBound = false
  /** hide-on-scroll 方向判定的滚动基线（null = 未登记，启用时以当前滚动位置为新基线） */
  private lastScrollY: number | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="bar" part="bar" role="banner">
        <div class="row" part="row">
          <div class="leading" part="leading" hidden>
            <button class="menu-btn" part="menu-button" type="button" hidden aria-expanded="false">
              <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false">
                <path d="M2 3.5h12M2 8h12M2 12.5h12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
            </button>
            <slot name="leading"></slot>
          </div>
          <div class="title-wrap" part="title-wrap">
            <div class="title" part="title"></div>
            <slot name="title"></slot>
          </div>
          <div class="actions" part="actions" hidden>
            <slot name="actions"></slot>
            <button class="more" part="more" type="button" aria-haspopup="menu" aria-expanded="false" hidden>···</button>
            <div class="more-panel" part="more-panel" role="menu" hidden></div>
          </div>
          <div class="trailing" part="trailing" hidden>
            <slot name="trailing"></slot>
          </div>
        </div>
        <div class="extended-wrap" part="extended" hidden>
          <div class="extended-inner">
            <slot name="extended"></slot>
          </div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.barEl = this.shadow.querySelector('[part="bar"]')
    this.titleEl = this.shadow.querySelector('[part="title"]')
    this.leadingWrapEl = this.shadow.querySelector('[part="leading"]')
    this.actionsWrapEl = this.shadow.querySelector('[part="actions"]')
    this.trailingWrapEl = this.shadow.querySelector('[part="trailing"]')
    this.extendedWrapEl = this.shadow.querySelector('[part="extended"]')
    this.menuBtnEl = this.shadow.querySelector('[part="menu-button"]')
    this.moreBtnEl = this.shadow.querySelector('[part="more"]')
    this.morePanelEl = this.shadow.querySelector('[part="more-panel"]')
    // 汉堡钮：点击派发 oas-menu-toggle（宿主自行开合抽屉并回写 menu-open）
    this.menuBtnEl?.addEventListener('click', () => this.emit('menu-toggle'))
    // 「···」弹层交互：点按开合、内部键盘导航（外部点击关闭由 update 幂等恢复注册）
    this.moreBtnEl?.addEventListener('click', () => {
      if (this.moreOpen) this.closeMore(true)
      else this.openMore()
    })
    this.morePanelEl?.addEventListener('keydown', (e) => this.handlePanelKey(e as KeyboardEvent))
    // 任一插槽内容变化都触发全量同步（显隐/收纳重算）
    for (const s of this.shadow.querySelectorAll('slot')) {
      s.addEventListener('slotchange', () => this.update())
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（bar + slot 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="bar"]')) return false
    if (!this.shadow.querySelector('slot')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // RTL 逻辑方向化钩子：布局全走逻辑属性，钩子供宿主/调试与潜在镜像规则使用
    this.toggleAttribute('data-rtl', isRtl(this))
    // 定位形态：非法值回落 static（归一化后的合法值写 data-position 作 CSS 钩子）
    this.dataset.position = normalizePosition(this.getAttr('position', 'static'))
    // 「···」收纳钮与弹层可访问名称（locale 反应式）
    if (this.moreBtnEl) this.moreBtnEl.setAttribute('aria-label', this.t('appBar.more'))
    if (this.morePanelEl) this.morePanelEl.setAttribute('aria-label', this.t('appBar.more'))
    this.syncBarAria()
    this.syncLeading()
    this.syncTitle()
    this.syncBlocks()
    this.syncExtended()
    this.syncOverflow()
    this.syncHideOnScroll()
    this.syncExternalListeners()
  }

  // ===== 区块同步 =====

  /** banner 可读名称（locale 反应式：setLocale 切换自动重刷 update） */
  private syncBarAria(): void {
    this.barEl?.setAttribute('aria-label', this.t('appBar.label'))
  }

  /** leading 区：汉堡钮显隐 + aria（label/expanded/controls），无钮且无 leading 内容时不渲染容器 */
  private syncLeading(): void {
    const btn = this.menuBtnEl
    const wrap = this.leadingWrapEl
    if (!btn || !wrap) return
    const showBtn = this.hasAttr('menu-button')
    btn.hidden = !showBtn
    btn.setAttribute('aria-label', this.t('appBar.menu'))
    btn.setAttribute('aria-expanded', this.hasAttr('menu-open') ? 'true' : 'false')
    const controls = this.getAttr('menu-controls')
    if (controls) btn.setAttribute('aria-controls', controls)
    else btn.removeAttribute('aria-controls')
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot[name="leading"]')
    wrap.hidden = !showBtn && !(slot && this.hasSlotContent(slot))
  }

  /** 标题双通道：heading 属性文本写入 part，slot="title" 有真实内容时覆盖（隐藏属性文本） */
  private syncTitle(): void {
    if (!this.titleEl) return
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    this.titleEl.textContent = this.getAttr('heading', '')
    this.titleEl.hidden = !!slot && this.hasSlotContent(slot)
  }

  /** actions/trailing 空态：无真实插槽内容时容器不渲染（无空占位、无多余间距） */
  private syncBlocks(): void {
    const actionsSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="actions"]')
    const trailingSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="trailing"]')
    if (this.actionsWrapEl && actionsSlot) this.actionsWrapEl.hidden = !this.hasSlotContent(actionsSlot)
    if (this.trailingWrapEl && trailingSlot) this.trailingWrapEl.hidden = !this.hasSlotContent(trailingSlot)
  }

  /** extended 扩展区空态：无内容时整块隐藏（不空占位） */
  private syncExtended(): void {
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot[name="extended"]')
    if (this.extendedWrapEl && slot) this.extendedWrapEl.hidden = !this.hasSlotContent(slot)
  }

  /**
   * 插槽是否有「真实内容」：注释节点与纯空白文本不算；
   * 自定义元素（自身 shadow 渲染）与无子节点叶元素（svg path 等）算内容
   */
  private hasSlotContent(slot: HTMLSlotElement): boolean {
    const nodes = slot.assignedNodes({ flatten: true })
    return nodes.length > 0 && nodes.some((n) => this.isRealNode(n))
  }

  private isRealNode(node: Node): boolean {
    if (node.nodeType === Node.COMMENT_NODE) return false
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim() !== ''
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      if (el.tagName.includes('-')) return true
      return el.childNodes.length === 0 || [...el.childNodes].some((c) => this.isRealNode(c))
    }
    return true
  }

  /** actions 具名插槽分配的操作项（溢出收纳对象，按宿主声明顺序） */
  private assignedActions(): HTMLElement[] {
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot[name="actions"]')
    if (!slot) return []
    return slot.assignedElements() as HTMLElement[]
  }

  // ===== overflow 溢出收纳 =====

  /**
   * 重算溢出收纳：actions 区宽度不足时，超出项打 data-collapsed 隐藏并镜像进「···」弹层。
   * 公开：宿主可在布局变化后手动触发（ResizeObserver 已自动监听宿主宽度）。
   */
  syncOverflow(): void {
    const more = this.moreBtnEl
    const panel = this.morePanelEl
    const wrap = this.actionsWrapEl
    if (!more || !panel || !wrap) return
    const list = this.assignedActions()
    // 先复位再测量：collapsed 项 display:none 宽为 0，直接量会把已收纳态误判成无溢出
    for (const t of list) t.removeAttribute('data-collapsed')
    if (list.length === 0) {
      more.hidden = true
      this.closeMore()
      return
    }
    // SSR/未布局环境（clientWidth 为 0）不判定溢出——否则快照里全部误收，水合后测量恢复 → 布局漂移
    const avail = wrap.clientWidth
    if (avail <= 0) {
      more.hidden = true
      this.closeMore()
      return
    }
    // 显示「···」量出其宽度（有溢出时它要占位，可用宽度须扣除；无溢出最后会再隐藏）
    more.hidden = false
    const moreWidth = more.offsetWidth
    // 溢出判定用 scrollWidth > clientWidth（真实溢出）而非项宽累加——防 shrink-to-fit 假溢出
    const realOverflow = wrap.scrollWidth > wrap.clientWidth + 1
    // flex gap 不占 offsetWidth，按计算样式解析（未解析时兜底 4px）
    let gap = 4
    const gapRaw = getComputedStyle(wrap).gap
    const gm = /([\d.]+)px/.exec(gapRaw || '')
    if (gm) gap = Number(gm[1])
    const calc = (availWidth: number): number => {
      let acc = 0
      for (let i = 0; i < list.length; i++) {
        acc += list[i]!.offsetWidth + (i > 0 ? gap : 0)
        if (acc > availWidth) return i
      }
      return -1
    }
    let firstOverflow = realOverflow ? calc(avail) : -1
    if (firstOverflow !== -1 && moreWidth > 0) {
      // 有溢出：「···」自身占 moreWidth，重算首个溢出项；兜底至少收一项腾位
      firstOverflow = calc(avail - moreWidth)
      if (firstOverflow === -1) firstOverflow = list.length - 1
    }
    if (firstOverflow === -1) {
      more.hidden = true
      this.closeMore()
      return
    }
    list.forEach((t, i) => t.toggleAttribute('data-collapsed', i >= firstOverflow))
    more.hidden = false
    more.setAttribute('aria-expanded', this.moreOpen ? 'true' : 'false')
    this.renderMoreMirror(list.slice(firstOverflow))
  }

  /** 弹层镜像：被收项 → role=menuitem 按钮，点击回派原控件 click 并关闭弹层 */
  private renderMoreMirror(collapsed: HTMLElement[]): void {
    const panel = this.morePanelEl
    if (!panel) return
    panel.innerHTML = ''
    for (const t of collapsed) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'mirror'
      btn.setAttribute('role', 'menuitem')
      btn.setAttribute('part', 'mirror-item')
      btn.textContent = this.itemLabel(t)
      btn.addEventListener('click', () => {
        t.click()
        this.closeMore(true)
      })
      panel.appendChild(btn)
    }
  }

  /** 镜像项标签：aria-label > 文本 > 兜底 i18n */
  private itemLabel(el: HTMLElement): string {
    const label = el.getAttribute('aria-label')
    if (label) return label
    const text = (el.textContent ?? '').trim()
    if (text) return text
    return this.t('appBar.item')
  }

  private openMore(): void {
    if (!this.morePanelEl || !this.moreBtnEl || !this.actionsWrapEl) return
    this.moreOpen = true
    this.morePanelEl.hidden = false
    this.moreBtnEl.setAttribute('aria-expanded', 'true')
    // 弹层打开时 actions 容器切 overflow: visible（横向超出不被 clip 裁掉）
    this.actionsWrapEl.classList.add('open')
    const first = this.morePanelEl.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])')
    first?.focus()
  }

  /** 收起弹层；returnFocus 时把焦点还给「···」按钮 */
  private closeMore(returnFocus = false): void {
    if (!this.moreOpen) return
    this.moreOpen = false
    if (this.morePanelEl) this.morePanelEl.hidden = true
    if (this.moreBtnEl) {
      this.moreBtnEl.setAttribute('aria-expanded', 'false')
      if (returnFocus) this.moreBtnEl.focus()
    }
    this.actionsWrapEl?.classList.remove('open')
  }

  /** 弹层键盘：Esc 关闭回焦（无镜像项时也生效）；方向键移动、Home/End、Enter/Space 选择 */
  private handlePanelKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      this.closeMore(true)
      return
    }
    const items = [...this.morePanelEl!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])')]
    if (items.length === 0) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      this.movePanelFocus(items, 1)
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      this.movePanelFocus(items, -1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1]?.focus()
    }
  }

  private movePanelFocus(items: HTMLButtonElement[], dir: 1 | -1): void {
    // 用 shadow 内 activeElement 定位当前项（document.activeElement 对 shadow 内聚焦元素返回 host）
    const cur = items.indexOf((this.shadow.activeElement as HTMLButtonElement | null) ?? ({} as HTMLButtonElement))
    const next = items[(cur + dir + items.length) % items.length]
    next?.focus()
  }

  // ===== 滚动联动（hide-on-scroll / extended 折叠 / 滚动投影） =====

  /**
   * hide-on-scroll 状态同步：仅悬浮形态（absolute/fixed/floating）+ hide-on-scroll 同时存在时生效。
   * 关闭时移除 data-hidden 并复位滚动基线；启用时登记新基线（重连/属性增删后基线重设，避免方向误判）。
   *
   * aria 语义：隐藏是**纯视觉收起**（translateY 滑出视口），不加 aria-hidden——
   * banner 语义与键盘焦点保持可达，滚回即恢复。
   */
  private syncHideOnScroll(): void {
    // 滚动监听常绑（滚动投影 data-scrolled 与 extended 折叠不依赖悬浮形态）
    this.ensureScrollListener()
    const enabled = this.hasAttr('hide-on-scroll') && normalizePosition(this.getAttr('position', 'static')) !== 'static'
    if (!enabled) {
      this.removeAttribute('data-hidden')
      this.lastScrollY = null
      return
    }
    if (this.lastScrollY === null) this.lastScrollY = window.scrollY
  }

  /** window scroll 监听（passive）：连接期间只绑一次，断开经 onCleanup 移除，重连自动重绑 */
  private ensureScrollListener(): void {
    if (this.scrollBound) return
    window.addEventListener('scroll', this.handleScroll, { passive: true })
    this.scrollBound = true
    this.onCleanup(() => {
      window.removeEventListener('scroll', this.handleScroll)
      this.scrollBound = false
    })
  }

  /** 滚动联动：投影（scrollY>0）、扩展区折叠（阈值 8px）、hide-on-scroll 方向判定（差 >4px） */
  private handleScroll = (): void => {
    const y = window.scrollY
    // 滚动投影：内容滚动后栏底出现阴影（回顶移除）；elevated 属性则常显（纯 CSS）
    this.toggleAttribute('data-scrolled', y > 0)
    // extended 折叠：滚动超过阈值收起扩展区只留主行，回到阈值下展开
    if (this.hasAttr('extended-collapse-on-scroll')) {
      this.toggleAttribute('data-ext-collapsed', y > EXT_COLLAPSE_THRESHOLD)
    } else {
      this.removeAttribute('data-ext-collapsed')
    }
    // hide-on-scroll：仅悬浮形态；滚动差 >4px 才判方向（防轻微抖动误触发）
    const enabled = this.hasAttr('hide-on-scroll') && normalizePosition(this.getAttr('position', 'static')) !== 'static'
    if (!enabled) {
      this.removeAttribute('data-hidden')
      this.lastScrollY = null
      return
    }
    if (this.lastScrollY === null) {
      this.lastScrollY = y
      return
    }
    const delta = y - this.lastScrollY
    this.lastScrollY = y
    if (Math.abs(delta) <= 4) return
    this.toggleAttribute('data-hidden', delta > 0)
  }

  /**
   * 幂等注册/恢复「document 级」监听（update() 恢复模式，参照 toolbar 收纳同款）：
   * - document pointerdown 弹层外点关闭器
   * - ResizeObserver 宿主宽度变化重算收纳
   *
   * 为什么在 update() 恢复：断连时 onCleanup 会移除它们，重连只走 update()（rendered 已 true
   * 不再跑 render/bind）——若只注册在 bind()，重连后外点关闭与宽度重算永久丢失。
   * boundExternals 守卫保证同一连接周期只注册一次（属性变化触发多次 update 不重复注册）。
   */
  private syncExternalListeners(): void {
    if (this.boundExternals) return
    const onDocPointer = (e: PointerEvent): void => {
      if (!this.moreOpen) return
      const path = e.composedPath()
      if (path.includes(this)) return
      this.closeMore()
    }
    document.addEventListener('pointerdown', onDocPointer)
    this.onCleanup(() => {
      document.removeEventListener('pointerdown', onDocPointer)
      this.boundExternals = false
      this.closeMore()
    })
    // 溢出收纳：宿主宽度变化时重算收纳
    if (typeof ResizeObserver !== 'undefined') {
      this.overflowObserver = new ResizeObserver(() => this.syncOverflow())
      this.overflowObserver.observe(this)
      this.onCleanup(() => {
        this.overflowObserver?.disconnect()
        this.overflowObserver = null
      })
    }
    this.boundExternals = true
  }
}
