import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'
import type { OASTabPanel } from './oas-tab-panel.js'
import { registeredTabsCapabilities } from './oas-tabs-capability.js'

export type TabsSize = 'xs' | 'small' | 'medium' | 'large' | 'xl'

const VALID_TABS_SIZES: readonly TabsSize[] = ['xs', 'small', 'medium', 'large', 'xl']

/** 非法 size 归一化：回落 medium 并在 dev 下 console.warn 一次（同值去重） */
function normalizeTabsSize(raw: string): TabsSize {
  if ((VALID_TABS_SIZES as readonly string[]).includes(raw)) return raw as TabsSize
  if (!warnedSizes.has(raw)) {
    warnedSizes.add(raw)
    console.warn(`[oas-tabs] 非法 size "${raw}"，已回落 medium；合法值：xs/small/medium/large/xl`)
  }
  return 'medium'
}

const warnedSizes = new Set<string>()

export type TabsPanelMode = 'keep' | 'lazy' | 'destroy'
export type TabsActivation = 'auto' | 'manual'

const VALID_PANEL_MODES: readonly TabsPanelMode[] = ['keep', 'lazy', 'destroy']

/** 非法 panel-mode 归一化：回落 keep 并在 dev 下 console.warn 一次（同值去重） */
function normalizePanelMode(raw: string): TabsPanelMode {
  if ((VALID_PANEL_MODES as readonly string[]).includes(raw)) return raw as TabsPanelMode
  if (!warnedModes.has(raw)) {
    warnedModes.add(raw)
    console.warn(`[oas-tabs] 非法 panel-mode "${raw}"，已回落 keep；合法值：keep/lazy/destroy`)
  }
  return 'keep'
}

const warnedModes = new Set<string>()

/**
 * manager 能力（manager 能力包 controller）在宿主渲染/更新管线上的挂接点。
 *
 * 核心（OASTabs）不实现任何管理交互，仅保留逐标签渲染挂接：能力包经能力注册表
 * （oas-tabs-capability.js）注入后，update 构建标签时委托给本接口方法；未注入能力时
 * manager 专属交互（editable 双击重命名 / context-menu 右键菜单 / sortable 拖拽排序）
 * 静默失效并在 dev 下告警一次。
 */
export interface TabsManagerCapability {
  /** 单个标签构建完成后的渲染装饰（目前 = sortable 拖拽：draggable + 拖拽事件 → oas-reorder）。
      核心每次重建标签时调用；未开启 sortable 或 disabled 标签由能力自行跳过。 */
  decorateTab(tab: HTMLElement, tablist: HTMLElement, value: string, disabled: boolean): void
}

/** manager 能力未 import 的告警文案（按需 ESM 消费者用；全量入口/导航族包已含 manager 能力，不会触发） */
const TABS_MANAGER_CAPABILITY_HINT = '[oas-tabs] manager 能力未启用：检测到 context-menu / sortable / editable 配置，但未 import manager 能力包，相关配置已静默失效。请按需 import "@oas-ui/ui/navigation/tabs/manager"（全量入口 @oas-ui/ui 与 CDN 导航族包已内含，无需额外引用）'

/** manager 能力告警去重（同值去重，同控件惯例） */
const warnedManagerCapability = new Set<string>()

/** dev 告警：manager 配置但能力未注入（页面级仅告警一次） */
function warnManagerNotImported(): void {
  if (warnedManagerCapability.has(TABS_MANAGER_CAPABILITY_HINT)) return
  warnedManagerCapability.add(TABS_MANAGER_CAPABILITY_HINT)
  console.warn(TABS_MANAGER_CAPABILITY_HINT)
}

const STYLE = `
:host {
  display: block;
  width: 100%;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.tablist {
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-2) var(--oas-space-4);
  cursor: pointer;
  border: none;
  background: none;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-secondary);
  font-family: inherit;
  /* 激活下划线走 box-shadow inset（不占位、不被 overflow 裁剪），故不再需要
     border-bottom 占位与 margin-bottom:-1px 溢出重叠（占位会与 box-shadow 叠加变粗） */
  /* 标签不压缩不换行：溢出由滚动/更多下拉处理，而非挤压文字竖排（justified 均分模式以 flex:1 覆盖） */
  flex-shrink: 0;
  white-space: nowrap;
  /* 激活下划线用 ::after 伪元素（独立 2px 盒子，绝对定位，渲染精确无 box-shadow 亚像素伪影）；
     tab 需 relative 作为定位父级 */
  position: relative;
}
/* tab 即链接（panel 设 href 渲染 <a>）：去链接默认下划线/颜色，继承 tab 样式 */
a.tab {
  text-decoration: none;
  color: var(--oas-color-text-secondary);
}
a.tab[aria-selected='true'] {
  color: var(--oas-color-primary);
}
/* 下划线基座：默认透明占位（不占布局），各方向尺寸由位置类覆盖 */
.tab::after {
  content: '';
  position: absolute;
  background: transparent;
}
/* top（默认）/bottom：底部或顶部横线；left/right：侧边竖线 */
:host(:not(.oas-tabs--vertical)) .tab::after {
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--oas-tabs-indicator-size, 2px);
}
:host(.oas-tabs--bottom) .tab::after {
  bottom: auto;
  top: 0;
}
:host(.oas-tabs--left) .tab::after {
  left: auto;
  right: 0;
  top: 0;
  bottom: 0;
  width: var(--oas-tabs-indicator-size, 2px);
  height: auto;
}
:host(.oas-tabs--right) .tab::after {
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--oas-tabs-indicator-size, 2px);
  height: auto;
}
.tab[aria-selected='true'] {
  color: var(--oas-color-primary);
  font-weight: 500;
}
/* line 模式（非 card）激活下划线显主色；card 模式有独立边框连通机制，不叠加 */
:host(:not(.oas-tabs--card)) .tab[aria-selected='true']::after {
  background: var(--oas-tabs-indicator-color, var(--oas-color-primary));
}
/* 非激活项 hover 反馈：文字与背景向激活态靠拢一档（选中项 hover 不变） */
.tab:not([aria-selected='true']):hover {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.panel {
  padding-top: var(--oas-space-4);
}

/* 图标 tab：icon 属性 / slot="icon" 渲染的图标位（装饰性，读屏隐藏） */
.tab-icon {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font-size: var(--oas-font-size-md);
  color: inherit;
}
.tab-icon svg {
  display: block;
}

/* 新增按钮（addable）：native button，+ 图标，focus 环可见；nav 内固定（滚动区外） */
.tab-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  margin-inline-start: var(--oas-space-1);
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-sm);
  background: none;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  font-family: inherit;
}
.tab-add[hidden] {
  display: none;
}
.tab-add:hover {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.tab-add:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}

/* tab 徽标：数字/文本小圆角标签（颜色走 --oas-tabs-badge-bg/-color 开口，默认 danger） */
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  box-sizing: border-box;
  padding: 0 var(--oas-space-1);
  border-radius: 8px;
  background: var(--oas-tabs-badge-bg, var(--oas-color-danger));
  color: var(--oas-tabs-badge-color, var(--oas-color-text-on-danger));
  font-size: var(--oas-font-size-xs);
  line-height: 16px;
  white-space: nowrap;
}

/* 关闭按钮：span（非原生 button）——原生 button 会被 axe 视为 tablist 的
   不允许子元素/与 role=tab 构成交互嵌套；tabindex=-1 可脚本聚焦（读屏可激活），
   不进 Tab 顺序（避免嵌套交互违规），Enter/Space 由组件内 keydown 处理 */
.tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
}
.tab-close:hover {
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
}
.tab-close:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}

/* 卡片式（type=card）：标签带边框、激活标签与面板连通、四边有线 */
:host(.oas-tabs--card) .nav {
  border-bottom: none;
}
:host(.oas-tabs--card) .tablist {
  gap: var(--oas-space-1);
}
:host(.oas-tabs--card) .tab {
  border: 1px solid var(--oas-color-border);
  border-bottom: none;
  border-radius: var(--oas-radius-md) var(--oas-radius-md) 0 0;
  margin-bottom: -1px;
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
:host(.oas-tabs--card) .tab[aria-selected='true'] {
  position: relative;
  z-index: 1;
  border-bottom: 1px solid var(--oas-color-bg);
  background: var(--oas-color-bg);
}
/* 卡片式非激活项 hover：浮起面向内容底色靠拢（激活是 bg，非激活是 bg-hover） */
:host(.oas-tabs--card) .tab:not([aria-selected='true']):hover {
  background: color-mix(in srgb, var(--oas-color-bg-hover) 50%, var(--oas-color-bg));
}
:host(.oas-tabs--card) .panel {
  margin-top: -1px;
  padding: var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: 0 var(--oas-radius-md) var(--oas-radius-md) var(--oas-radius-md);
  background: var(--oas-color-bg);
}

/* 标签位置：bottom（面板在上、标签在下） */
:host(.oas-tabs--bottom) {
  display: flex;
  flex-direction: column;
}
:host(.oas-tabs--bottom) .nav {
  order: 1;
  border-bottom: none;
  border-top: 1px solid var(--oas-color-border);
}
:host(.oas-tabs--bottom) .tablist {
  border-bottom: none;
}
:host(.oas-tabs--bottom) .panel {
  order: 0;
  padding-top: 0;
  padding-bottom: var(--oas-space-4);
}
:host(.oas-tabs--bottom) .tab {
  border-bottom: none;
  border-top: none;
  margin-bottom: 0;
  margin-top: 0;
}
:host(.oas-tabs--bottom:not(.oas-tabs--card)) .tab[aria-selected='true'] {
  border-bottom-color: transparent;
  border-top-color: transparent;
}

/* 标签位置：left / right（标签纵向排列、面板在旁） */
:host(.oas-tabs--vertical) {
  display: flex;
  align-items: stretch;
}
:host(.oas-tabs--vertical) .nav {
  flex-shrink: 0;
  /* 纵向无「顶底横线」：去掉默认 border-bottom，避免 left/right 叠 border-right/left 时残留底部横线 */
  border-bottom: none;
}
:host(.oas-tabs--vertical) .tablist {
  flex-direction: column;
  border-bottom: none;
}
:host(.oas-tabs--vertical) .tab {
  border-bottom: none;
  margin-bottom: 0;
}
:host(.oas-tabs--vertical) .panel {
  padding-top: 0;
  flex: 1;
  min-width: 0;
}
:host(.oas-tabs--left) .nav {
  border-right: 1px solid var(--oas-color-border);
}
:host(.oas-tabs--left) .tab {
  border-right: none;
  margin-right: 0;
}
:host(.oas-tabs--left) .panel {
  padding-left: var(--oas-space-4);
}
:host(.oas-tabs--right) .nav {
  order: 1;
  border-left: 1px solid var(--oas-color-border);
}
:host(.oas-tabs--right) .tab {
  border-left: none;
  margin-left: 0;
  /* 镜像 left：内容右对齐贴标签栏右边缘 */
  justify-content: flex-end;
}
:host(.oas-tabs--right) .panel {
  order: 0;
  padding-right: var(--oas-space-4);
}

/* card 卡片式 + bottom：镜像顶部连通 */
:host(.oas-tabs--card.oas-tabs--bottom) .nav {
  border-top: none;
}
:host(.oas-tabs--card.oas-tabs--bottom) .tab {
  border-bottom: 1px solid var(--oas-color-border);
  border-top: none;
  border-radius: 0 0 var(--oas-radius-md) var(--oas-radius-md);
  margin-bottom: 0;
  margin-top: -1px;
}
:host(.oas-tabs--card.oas-tabs--bottom) .tab[aria-selected='true'] {
  border-top: 1px solid var(--oas-color-bg);
}
:host(.oas-tabs--card.oas-tabs--bottom) .panel {
  margin-top: 0;
  margin-bottom: -1px;
  border-radius: var(--oas-radius-md) var(--oas-radius-md) 0 0;
}

/* card 卡片式 + 纵向：独立盒式（每标签全边框圆角、面板独立） */
:host(.oas-tabs--card.oas-tabs--vertical) .tablist {
  border: none;
  gap: var(--oas-space-1);
}
:host(.oas-tabs--card.oas-tabs--vertical) .tab {
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  margin: 0;
  background: var(--oas-color-bg-hover);
}
:host(.oas-tabs--card.oas-tabs--vertical) .tab[aria-selected='true'] {
  border: 1px solid var(--oas-color-primary);
  border-bottom: 1px solid var(--oas-color-primary);
  background: var(--oas-color-bg);
}
:host(.oas-tabs--card.oas-tabs--vertical) .panel {
  margin: 0;
  border-radius: var(--oas-radius-md);
}

/* disabled 标签：视觉降饱和 + 禁点光标（ui-spec §2.3） */
.tab[aria-disabled='true'] {
  opacity: 0.6;
  cursor: not-allowed;
}
.tab[aria-disabled='true']:hover {
  color: var(--oas-color-text-secondary);
  background: none;
}

/* size 档位：CSS 变量开口，五档对齐 ui-spec §2.1；字号/内边距随档位 */
:host(.oas-tabs--xs) .tab {
  font-size: var(--oas-font-size-xs);
  padding: var(--oas-space-1) var(--oas-space-2);
}
:host(.oas-tabs--small) .tab {
  font-size: var(--oas-font-size-sm);
  padding: var(--oas-space-1_5) var(--oas-space-3);
}
:host(.oas-tabs--large) .tab {
  font-size: var(--oas-font-size-lg);
  padding: var(--oas-space-2_5) var(--oas-space-5);
}
:host(.oas-tabs--xl) .tab {
  font-size: var(--oas-font-size-xl);
  padding: var(--oas-space-3) var(--oas-space-6);
}

/* centered：标签栏整体居中（横向时） */
:host(.oas-tabs--centered) .tablist {
  justify-content: center;
}

/* justified：标签均分占满宽度 */
:host(.oas-tabs--justified) .tab {
  flex: 1;
  justify-content: center;
}

/* ===== 溢出滚动：nav 容器承载布局（替代原 tablist 容器角色），tablist 可滚动 ===== */
.nav {
  display: flex;
  align-items: stretch;
  position: relative;
  min-width: 0;
  border-bottom: 1px solid var(--oas-color-border);
}
/* 横向（默认）：nav 行向，tablist 横向滚动 */
.tablist {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none; /* 隐藏原生滚动条，由箭头控制 */
  -ms-overflow-style: none;
}
.tablist::-webkit-scrollbar {
  display: none;
}

/* 滚动箭头：flex 项（出现时不占位跳动由 hidden 控制），视觉次要、禁用降饱和 */
.scroll-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  align-self: stretch;
  width: 28px;
  border: none;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}
.scroll-btn[hidden] {
  display: none;
}
.scroll-btn:hover:not(:disabled) {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.scroll-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.scroll-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 纵向（left/right）：nav 列向，tablist 纵向滚动，箭头上下排列 */
:host(.oas-tabs--vertical) .nav {
  flex-direction: column;
}
:host(.oas-tabs--vertical) .tablist {
  overflow-x: hidden;
  overflow-y: auto;
  min-width: auto;
  min-height: 0;
}
:host(.oas-tabs--vertical) .scroll-btn {
  width: auto;
  align-self: stretch;
  height: 24px;
}

/* ===== more 溢出：滚动 + 视口外镜像下拉（通用） =====
   tab 全部渲染、tablist 可滚动（沿用默认 overflow-x:auto）；more 下拉列出
   当前滚动视口外的 tab 作快捷跳转，点选平滑滚动到可见区。无 display 收缩。 */
.more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  align-self: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--oas-radius-sm);
  background: none;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}
.more-btn[hidden] {
  display: none;
}
.more-btn:hover {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.more-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 选中项被收进更多 → 更多按钮主色高亮标识 */
.more-btn.more-btn--active {
  color: var(--oas-color-primary);
  font-weight: 500;
}
.more-dropdown {
  position: absolute;
  top: 100%;
  inset-inline-end: 0;
  z-index: 10;
  min-width: 120px;
  max-height: 280px;
  margin: 0;
  padding: var(--oas-space-1);
  background: var(--oas-color-bg-elevated);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
}
.more-dropdown[hidden] {
  display: none;
}
.more-search {
  flex-shrink: 0;
  margin-bottom: var(--oas-space-1);
  padding: var(--oas-space-1) var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  outline: none;
}
.more-search[hidden] {
  display: none;
}
.more-search:focus-visible {
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
.more-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.more-item {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: start;
  padding: var(--oas-space-1_5) var(--oas-space-3);
  border: none;
  border-radius: var(--oas-radius-sm);
  background: none;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}
/* 搜索过滤隐藏：.more-item 的 display:flex 会覆盖 [hidden] 的 UA display:none，
   必须显式补 hidden 规则，否则过滤后数据层 hidden 但视觉仍显示（机制对≠感知对） */
.more-item[hidden] {
  display: none;
}
.more-item:hover {
  background: var(--oas-color-bg-hover);
}
.more-item:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.more-item[aria-current='true'] {
  color: var(--oas-color-primary);
  font-weight: 500;
}

/* ===== animated：选中态过渡 + 面板淡入（只动 color/border/opacity，不碰 layout） ===== */
:host(.oas-tabs--animated) .tab {
  transition:
    color var(--oas-transition-base) var(--oas-ease-out),
    border-color var(--oas-transition-base) var(--oas-ease-out),
    background-color var(--oas-transition-base) var(--oas-ease-out);
}
:host(.oas-tabs--animated) .panel ::slotted(oas-tab-panel) {
  animation: oas-tabs-fade-in var(--oas-transition-base) var(--oas-ease-out);
}
@keyframes oas-tabs-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* ===== stacked：图标在上、文字在下（纵向堆叠） ===== */
:host(.oas-tabs--stacked) .tab {
  flex-direction: column;
  gap: var(--oas-space-1);
}

/* ===== hide-indicator：隐藏激活指示线（line 模式 ::after） ===== */
:host(.oas-tabs--hide-indicator) .tab::after {
  display: none;
}

/* ===== reserve-selected-space：选中加粗（font-weight 500）防抖 =====
   ::before 用 attr(data-label) 预载选中态文字宽度（不可见、height:0 不占高、参与撑宽），
   选中/未选中 tab 宽度一致，切换不抖动 */
:host(.oas-tabs--reserve-space) .tab-label::before {
  content: attr(data-label);
  display: block;
  height: 0;
  overflow: hidden;
  visibility: hidden;
  font-weight: 500;
}
`

export class OASTabs extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'active',
      'type',
      'closable',
      'addable',
      'tab-position',
      'size',
      'centered',
      'justified',
      'without-scroll-controls',
      'more',
      'panel-mode',
      'activation',
      'animated',
      'sortable',
      'trigger',
      'allow-deactivation',
      'stacked',
      'hide-indicator',
      'scroll-position',
      'reserve-selected-space',
      'hide-content',
      'items',
      'context-menu',
    ]
  }

  private panels: OASTabPanel[] = []
  private observer: MutationObserver | null = null
  /** 新增按钮引用（重建后更新；用于焦点归属捕获与恢复） */
  private addBtn: HTMLButtonElement | null = null
  /** 上次重建时的面板数（判断「点击 + 后宿主是否新增了面板」） */
  private prevPanelCount = -1
  /** 溢出检测（ResizeObserver 监听 tablist 尺寸变化） */
  private resizeObserver: ResizeObserver | null = null
  /** more 下拉展开态 */
  private moreOpen = false
  /** 面板子节点暂存（lazy/destroy 模式：未激活面板内容移出 DOM 暂存） */
  private stash = new WeakMap<HTMLElement, DocumentFragment>()
  /** lazy 模式已访问过的面板 value（访问过即常驻，不再暂存） */
  private visited = new Set<string>()
  /** manager 能力 controller（经能力注册表注入；无则 manager 交互静默失效 + dev 告警） */
  private managerCap: TabsManagerCapability | null = null
  /** 上次渲染的激活值（active 变化时滚动到可见；初始化为 undefined 以跳过首渲染滚动） */
  private prevActiveValue: string | undefined = undefined
  /** items 数据驱动同步中标志（防止生成 panel 触发 MutationObserver 导致 update 无限循环） */
  private itemsSyncing = false

  /**
   * 能力注入：构造时遍历能力注册表，把已注册能力 factory 的 controller 逐个 addController。
   * 能力包（如 navigation/tabs/manager）在模块求值期自注册，早于任何 tabs 实例构造——
   * 未 import 的能力不注入（其渲染挂接点由 managerCap 判空跳过）。
   */
  constructor() {
    super()
    for (const { name, factory } of registeredTabsCapabilities()) {
      const controller = factory(this)
      this.addController(controller)
      if (name === 'manager') this.managerCap = controller as unknown as TabsManagerCapability
    }
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(hideContent = false): string {
    return `
      <style>${STYLE}</style>
      <div class="nav" part="nav">
        <button class="scroll-btn scroll-start" part="scroll-start" type="button" hidden aria-hidden="true" tabindex="-1"></button>
        <div class="tablist" part="tablist" role="tablist"></div>
        <button class="more-btn" part="more-button" type="button" hidden></button>
        <button class="tab-add" part="add-button" type="button" role="button" hidden></button>
        <button class="scroll-btn scroll-end" part="scroll-end" type="button" hidden aria-hidden="true" tabindex="-1"></button>
        <div class="more-dropdown" part="more-dropdown" role="menu" hidden>
          <input class="more-search" part="more-search" type="text" hidden />
          <div class="more-list"></div>
        </div>
      </div>
      ${hideContent ? '' : '<div class="panel" part="panel"><slot></slot></div>'}
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    const tablist = this.shadow.querySelector('.tablist')
    tablist?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    // 宿主增删 oas-tab-panel（如 closable 场景外部移除面板）时增量刷新标签栏
    this.observer = new MutationObserver(() => this.update())
    this.observer.observe(this, { childList: true })
    this.onCleanup(() => this.observer?.disconnect())
    // + 按钮（template 占位，update 按需显隐）：click → oas-add
    this.shadow.querySelector('.tab-add')?.addEventListener('click', () => {
      this.emit('add', { label: this.t('tabs.newTab') })
    })
    this.bindScroll()
    this.bindMore()
  }

  protected override render(): void {
    // hide-content：纯导航模式（tabs 当导航条，不渲染面板区），宿主接管内容/路由
    this.shadow.innerHTML = this.template(this.hasAttr('hide-content'))
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（tablist 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.tablist')) return false
    this.bind()
    return true
  }

  /**
   * items 数据驱动：items 属性（JSON 数组 [{label, value, icon?, badge?, disabled?, href?,
   * target?, rel?, closable?, editable?, iconOnly?}]）存在时生成对应 oas-tab-panel 子元素。
   * 与子元素并存时 items 优先（清掉非 items 生成的面板）。itemsSyncing 守卫防止
   * MutationObserver 触发的 update 无限循环。
   */
  private syncItemsToPanels(): void {
    const raw = this.getAttr('items', '')
    if (!raw) return
    if (this.itemsSyncing) return
    let items: Array<Record<string, unknown>> = []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) items = parsed
    } catch {
      return
    }
    this.itemsSyncing = true
    try {
      // 一致性检查：现有面板 value 序列与 items 一致则跳过（防 MutationObserver 重复 update 重建）
      const existing = [...this.querySelectorAll(':scope > oas-tab-panel')].map((p) =>
        p.getAttribute('value'),
      )
      const itemValues = items.map((i) => String(i.value ?? ''))
      const same =
        existing.length === itemValues.length && existing.every((v, i) => v === itemValues[i])
      if (same) return
      // 清掉现有直接子面板（items 优先，子元素忽略）
      for (const p of [...this.querySelectorAll(':scope > oas-tab-panel')]) p.remove()
      for (const item of items) {
        const panel = document.createElement('oas-tab-panel')
        if (typeof item.label === 'string') panel.setAttribute('label', item.label)
        if (typeof item.value === 'string') panel.setAttribute('value', item.value)
        if (typeof item.icon === 'string') panel.setAttribute('icon', item.icon)
        if (item.badge != null) panel.setAttribute('badge', String(item.badge))
        if (item.disabled) panel.setAttribute('disabled', '')
        if (typeof item.href === 'string') panel.setAttribute('href', item.href)
        if (typeof item.target === 'string') panel.setAttribute('target', item.target)
        if (typeof item.rel === 'string') panel.setAttribute('rel', item.rel)
        if (item.closable) panel.setAttribute('closable', '')
        if (item.editable) panel.setAttribute('editable', '')
        if (item.iconOnly) panel.setAttribute('icon-only', '')
        this.appendChild(panel)
      }
    } finally {
      this.itemsSyncing = false
    }
  }

  protected override update(): void {
    // items 数据驱动：items 属性存在时按其生成 oas-tab-panel（与子元素并存时 items 优先）
    this.syncItemsToPanels()
    // 只取直接子面板：嵌套 tabs（panel 内再放 oas-tabs）的面板归内层管理，不误抓
    this.panels = [...this.querySelectorAll(':scope > oas-tab-panel')] as OASTabPanel[]
    // manager 能力未 import 但检测到 context-menu / sortable / editable 配置 → dev 告警（同值去重）
    this.warnManagerCapability()
    const tablist = this.shadow.querySelector('.tablist') as HTMLElement | null
    if (!tablist) return
    // 样式变体：line（下划线，默认）/ card（卡片式）
    const type = this.getAttr('type', 'line')
    // 标签栏位置：top（默认）/ left / right / bottom
    const position = this.getAttr('tab-position', 'top')
    const vertical = position === 'left' || position === 'right'
    this.classList.toggle('oas-tabs--card', type === 'card')
    this.classList.toggle('oas-tabs--vertical', vertical)
    this.classList.toggle('oas-tabs--left', position === 'left')
    this.classList.toggle('oas-tabs--right', position === 'right')
    this.classList.toggle('oas-tabs--bottom', position === 'bottom')
    // size 五档（非法值归一化回落 medium）；centered/justified 布局
    const size = normalizeTabsSize(this.getAttr('size', 'medium'))
    for (const s of VALID_TABS_SIZES) this.classList.toggle(`oas-tabs--${s}`, s === size)
    this.classList.toggle('oas-tabs--centered', this.hasAttr('centered'))
    this.classList.toggle('oas-tabs--justified', this.hasAttr('justified'))
    this.classList.toggle('oas-tabs--animated', this.hasAttr('animated'))
    this.classList.toggle('oas-tabs--stacked', this.hasAttr('stacked'))
    this.classList.toggle('oas-tabs--hide-indicator', this.hasAttr('hide-indicator'))
    this.classList.toggle('oas-tabs--reserve-space', this.hasAttr('reserve-selected-space'))
    const closable = this.hasAttr('closable')
    const addable = this.hasAttr('addable')
    const triggerHover = this.getAttr('trigger', 'click') === 'hover'
    const reserveSpace = this.hasAttr('reserve-selected-space')

    // 重建前捕获 tablist 内焦点归属（动态增删后焦点恢复的依据）
    const focused = this.captureFocused()
    const added = focused?.type === 'add' && this.panels.length > this.prevPanelCount
    this.prevPanelCount = this.panels.length

    tablist.className = `tablist${vertical ? ' tablist--vertical' : ''}`
    tablist.innerHTML = ''
    // 激活值解析：宿主设了 active 属性就用其值（含 allow-deactivation 取消后的 ''=无选中态）；
    // 未设 active 属性才回退第一项
    const active = this.hasAttr('active') ? this.getAttr('active', '') : ''
    const hasActiveAttr = this.hasAttr('active')
    let firstValue = ''
    this.panels.forEach((panel, idx) => {
      const value = panel.getAttribute('value') ?? ''
      if (idx === 0) firstValue = value
      const resolvedActive = hasActiveAttr ? active : firstValue
      const isSelected = resolvedActive !== '' && value === resolvedActive
      const disabled = panel.hasAttribute('disabled')
      // tab 即链接：panel 设 href 时渲染 <a>（锚点语义：右键新窗口/中键打开/SEO 可爬）；
      // 否则 button。role=tab 保持不变
      const href = panel.getAttribute('href')
      const btn = document.createElement(href ? 'a' : 'button') as HTMLElement
      btn.className = 'tab'
      btn.classList.toggle('tab--card', type === 'card')
      btn.setAttribute('part', 'tab')
      btn.setAttribute('role', 'tab')
      btn.setAttribute('aria-selected', String(isSelected))
      if (href) {
        btn.setAttribute('href', href)
        const target = panel.getAttribute('target')
        const rel = panel.getAttribute('rel')
        if (target) btn.setAttribute('target', target)
        if (rel) btn.setAttribute('rel', rel)
      }
      // roving tabindex：仅选中标签进 Tab 顺序，其余 tabindex=-1；disabled 恒 -1 不可聚焦
      btn.setAttribute('tabindex', isSelected && !disabled ? '0' : '-1')
      if (disabled) {
        btn.setAttribute('aria-disabled', 'true')
        if (!href) (btn as HTMLButtonElement).disabled = true
      }
      btn.setAttribute('data-value', value)

      // 图标：icon 属性（iconRegistry 内联 SVG）优先；否则取面板直接子元素
      // [slot="icon"] 克隆进图标位（装饰性，读屏隐藏）
      const iconName = panel.getAttribute('icon')
      const iconContent = iconName ? iconRegistry[iconName as IconName] : undefined
      let slotIcon: HTMLElement | null = null
      if (!iconContent) {
        for (const child of panel.children) {
          if (child.getAttribute('slot') === 'icon') {
            slotIcon = child as HTMLElement
            break
          }
        }
      }
      if (iconContent || slotIcon) {
        const iconEl = document.createElement('span')
        iconEl.className = 'tab-icon'
        iconEl.setAttribute('aria-hidden', 'true')
        if (iconContent) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          svg.setAttribute('viewBox', '0 0 16 16')
          svg.setAttribute('width', '1em')
          svg.setAttribute('height', '1em')
          svg.setAttribute('aria-hidden', 'true')
          svg.setAttribute('focusable', 'false')
          svg.innerHTML = iconContent
          iconEl.appendChild(svg)
        } else if (slotIcon) {
          iconEl.appendChild(slotIcon.cloneNode(true))
        }
        btn.appendChild(iconEl)
      }

      const label = document.createElement('span')
      label.className = 'tab-label'
      // slot="label" 自定义标签内容（通用的 slot 定制，fallback 到 label 属性纯文本）；
      // 克隆面板直接子元素 [slot="label"]（该元素不被面板默认 slot 投影，专供标签位使用）
      let slotLabel: HTMLElement | null = null
      for (const child of panel.children) {
        if (child.getAttribute('slot') === 'label') {
          slotLabel = child as HTMLElement
          break
        }
      }
      // icon-only：纯图标标签（无文字），aria-label 兜底可访问名称
      const iconOnly = panel.hasAttribute('icon-only')
      if (iconOnly) {
        btn.setAttribute('aria-label', panel.getAttribute('label') ?? value)
      } else if (slotLabel) label.appendChild(slotLabel.cloneNode(true))
      else {
        const text = panel.getAttribute('label') ?? ''
        label.textContent = text
        // reserve-selected-space：data-label 供 ::before 预载选中态（font-weight 500）宽度，
        // 选中加粗不撑宽 tab、不抖动
        if (reserveSpace) label.setAttribute('data-label', text)
      }
      // icon-only：纯图标标签不渲染 label（文字）
      if (!iconOnly) btn.appendChild(label)

      // 徽标：数字或文本，紧邻标题（part="badge" 供宿主 ::part 定制；色值走 --oas-tabs-badge-* 变量）
      const badge = panel.getAttribute('badge')
      if (badge) {
        const badgeEl = document.createElement('span')
        badgeEl.className = 'tab-badge'
        badgeEl.setAttribute('part', 'badge')
        badgeEl.textContent = badge
        btn.appendChild(badgeEl)
      }

      // 关闭按钮：span tabindex=-1（无 role，避免 axe nested-interactive 判为
      // 可交互控件嵌套 / tablist 不允许子元素）；读屏可经 aria-label 命名并激活，
      // Enter/Space 走组件内 keydown
      if (closable) {
        const close = document.createElement('span')
        close.className = 'tab-close'
        close.setAttribute('tabindex', '-1')
        close.setAttribute('aria-label', this.t('tabs.close'))
        // slot="close-icon" 自定义关闭图标（克隆面板直接子元素），fallback 默认 ×
        let slotClose: HTMLElement | null = null
        for (const child of panel.children) {
          if (child.getAttribute('slot') === 'close-icon') {
            slotClose = child as HTMLElement
            break
          }
        }
        if (slotClose) close.appendChild(slotClose.cloneNode(true))
        else
          close.innerHTML = `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
        close.addEventListener('click', (e: Event) => {
          e.stopPropagation()
          this.emit('close', { key: value })
        })
        close.addEventListener('keydown', (e: Event) => {
          const k = e as KeyboardEvent
          if (k.key !== 'Enter' && k.key !== ' ') return
          k.preventDefault()
          k.stopPropagation()
          this.emit('close', { key: value })
        })
        btn.appendChild(close)
      }

      btn.addEventListener('click', () => this.activate(value))
      // trigger:hover：悬停即切换（disabled 不触发）；mouseenter 不冒泡故逐个绑定
      if (triggerHover && !disabled) {
        btn.addEventListener('mouseenter', () => this.activate(value))
      }

      // manager 能力：sortable 拖拽装饰（draggable + 原生 HTML5 拖拽 → oas-reorder）。
      // 委托能力包在每次重建时对每个标签施加（节点全新故不会重复监听）；未注入能力时静默跳过
      this.managerCap?.decorateTab(btn, tablist, value, disabled)
      tablist.appendChild(btn)
    })

    // 新增按钮（addable）：nav 内固定（滚动区外），溢出时不随标签滚动被遮挡，始终可见。
    // role=button（不再是 tablist 占位 tab——tablist 只含真 tab，更符合 axe aria-required-children）；
    // Enter/Space 原生触发 click → oas-add；tabindex=0 进 Tab 顺序。
    const add = this.shadow.querySelector<HTMLButtonElement>('.tab-add')
    this.addBtn = null
    if (add) {
      if (addable) {
        add.hidden = false
        add.removeAttribute('aria-hidden')
        add.setAttribute('tabindex', '0')
        add.setAttribute('aria-label', this.t('tabs.add'))
        // slot="add-icon" 自定义新增图标（克隆 host 直接子元素），fallback 默认 +
        let slotAdd: HTMLElement | null = null
        for (const child of this.children) {
          if (child.getAttribute('slot') === 'add-icon') {
            slotAdd = child as HTMLElement
            break
          }
        }
        if (slotAdd) {
          add.innerHTML = ''
          add.appendChild(slotAdd.cloneNode(true))
        } else {
          add.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">${iconRegistry['plus']}</svg>`
        }
        this.addBtn = add
      } else {
        add.hidden = true
        add.setAttribute('aria-hidden', 'true')
        add.setAttribute('tabindex', '-1')
      }
    }

    // 面板显隐：与上方选中解析一致——宿主设了 active（含 '' 无选中态）就用其值，未设才回退第一项
    const selected = hasActiveAttr ? active : firstValue
    const panelMode = normalizePanelMode(this.getAttr('panel-mode', 'keep'))
    for (const panel of this.panels) {
      const value = panel.getAttribute('value') ?? ''
      const isActive = selected !== '' && value === selected
      panel.hidden = !isActive
      this.syncPanelContent(panel, value, isActive, panelMode)
    }

    // 重建后恢复焦点（点击 + / 关闭 / 方向键切换后焦点不丢）
    this.restoreFocus(focused, added)
    // 重建后重新检测溢出（标签增删/尺寸变化后箭头显隐同步）
    this.syncScrollControls()
    this.syncMore()
    // active 变化（含宿主 setAttribute 驱动，如新增面板后激活）→ 新激活标签滚到可见区域；
    // 溢出时新增/激活的标签可能在最右/最左被遮挡。首渲染不滚（prevActiveValue 初始化占位）。
    const activeNow = this.getAttr('active', '') || firstValue
    if (this.prevActiveValue === undefined) {
      this.prevActiveValue = activeNow
    } else if (activeNow !== this.prevActiveValue) {
      this.prevActiveValue = activeNow
      // scroll-position：激活滚动定位策略（auto/nearest 默认、start/center/end）；横向管 inline、纵向管 block
      const pos = this.getAttr('scroll-position', 'auto')
      const align = pos === 'auto' ? 'nearest' : (pos as ScrollLogicalPosition)
      const vertical = this.isVertical()
      this.findTabByValue(activeNow)?.scrollIntoView({
        block: vertical ? align : 'nearest',
        inline: vertical ? 'nearest' : align,
        behavior: 'smooth',
      })
    }
  }

  /** 溢出滚动箭头：ResizeObserver 监听溢出变化 + scroll 事件更新箭头可用态 */
  private bindScroll(): void {
    const tablist = this.shadow.querySelector('.tablist') as HTMLElement | null
    if (!tablist) return
    const start = this.shadow.querySelector('.scroll-start') as HTMLButtonElement | null
    const end = this.shadow.querySelector('.scroll-end') as HTMLButtonElement | null
    if (!start || !end) return
    // 箭头 aria-label 走 locale（ui-spec §2.3 文案禁硬编码）
    start.setAttribute('aria-label', this.t('tabs.scrollPrev'))
    end.setAttribute('aria-label', this.t('tabs.scrollNext'))
    const vertical = this.isVertical()
    const prevSvg = iconRegistry[vertical ? 'chevron-up' : 'chevron-left']
    const nextSvg = iconRegistry[vertical ? 'chevron-down' : 'chevron-right']
    start.innerHTML = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">${prevSvg}</svg>`
    end.innerHTML = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">${nextSvg}</svg>`
    start.addEventListener('click', () => this.scrollTabs(-1))
    end.addEventListener('click', () => this.scrollTabs(1))
    tablist.addEventListener(
      'scroll',
      () => {
        this.syncScrollControls()
        // more 模式：滚动时视口外集合变化，更新下拉镜像
        if (this.hasAttr('more')) {
          this.updateMoreOffview()
          if (this.moreOpen) this.renderMoreDropdown()
        }
      },
      { passive: true },
    )
    // 滚轮滑动：横向标签栏溢出时滚轮纵向滚动转为横向滑动标签（浏览器标签栏交互惯例）；
    // 仅溢出时 preventDefault 拦截（不溢出放行页面纵向滚动）；纵向标签栏滚轮本就纵向，无需转换
    tablist.addEventListener(
      'wheel',
      (e: Event) => {
        const we = e as WheelEvent
        if (this.isVertical()) return
        const overflow = tablist.scrollWidth > tablist.clientWidth + 1
        if (!overflow) return
        // deltaY 优先（纵向滚轮转横向），兼顾触控板横向 deltaX
        const delta = Math.abs(we.deltaY) >= Math.abs(we.deltaX) ? we.deltaY : we.deltaX
        if (delta === 0) return
        we.preventDefault()
        tablist.scrollLeft += delta
      },
      { passive: false },
    )
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.syncScrollControls()
        // more 模式：resize 时也要同步 more 按钮可视与 offview（此前漏掉 → 缩窗不出现/扩窗不撤回）
        this.syncMore()
      })
      this.resizeObserver.observe(tablist)
      this.onCleanup(() => this.resizeObserver?.disconnect())
    }
    this.syncScrollControls()
  }

  private isVertical(): boolean {
    const pos = this.getAttr('tab-position', 'top')
    return pos === 'left' || pos === 'right'
  }

  /** 点击箭头滚动一段（约一个视口的 60%） */
  private scrollTabs(dir: 1 | -1): void {
    const tablist = this.shadow.querySelector('.tablist') as HTMLElement | null
    if (!tablist) return
    const vertical = this.isVertical()
    const amount = (vertical ? tablist.clientHeight : tablist.clientWidth) * 0.6 * dir
    if (vertical) tablist.scrollBy({ top: amount, behavior: 'smooth' })
    else tablist.scrollBy({ left: amount, behavior: 'smooth' })
  }

  /** 按溢出与滚动位置同步箭头显隐/可用态（可外部触发：ResizeObserver / scroll / update） */
  private syncScrollControls(): void {
    const tablist = this.shadow.querySelector('.tablist') as HTMLElement | null
    const start = this.shadow.querySelector('.scroll-start') as HTMLButtonElement | null
    const end = this.shadow.querySelector('.scroll-end') as HTMLButtonElement | null
    if (!tablist || !start || !end) return
    // more 模式（收缩下拉）与滚动箭头互斥：more 开启时不走滚动箭头
    const showControls = !this.hasAttr('without-scroll-controls') && !this.hasAttr('more')
    const vertical = this.isVertical()
    const scrollSize = vertical ? tablist.scrollHeight : tablist.scrollWidth
    const clientSize = vertical ? tablist.clientHeight : tablist.clientWidth
    const scrollPos = vertical ? tablist.scrollTop : tablist.scrollLeft
    const overflow = showControls && scrollSize > clientSize + 1
    start.hidden = !overflow
    end.hidden = !overflow
    if (!overflow) return
    // 到起点禁用 prev，到终点禁用 next（阈值 1px 容差）
    const atStart = scrollPos <= 1
    const atEnd = scrollPos + clientSize >= scrollSize - 1
    start.disabled = atStart
    end.disabled = atEnd
    start.setAttribute('aria-disabled', String(atStart))
    end.setAttribute('aria-disabled', String(atEnd))
  }

  /** more 溢出收缩：绑定更多按钮点击弹/收下拉、外部点击收起 */
  private bindMore(): void {
    const moreBtn = this.shadow.querySelector('.more-btn') as HTMLButtonElement | null
    if (!moreBtn) return
    moreBtn.setAttribute('aria-label', this.t('tabs.more'))
    moreBtn.setAttribute('aria-haspopup', 'menu')
    moreBtn.setAttribute('aria-expanded', 'false')
    moreBtn.innerHTML = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">${iconRegistry['more']}</svg>`
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.moreOpen = !this.moreOpen
      this.syncMoreDropdown()
    })
    // moreBtn 键盘：Enter/Space/ArrowDown 打开并聚焦第一个可见项（键盘可达溢出标签）
    moreBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (!this.moreOpen) {
          this.moreOpen = true
          this.syncMoreDropdown()
        }
        this.focusFirstMoreItem()
      } else if (e.key === 'Escape' && this.moreOpen) {
        e.preventDefault()
        this.closeMore()
      }
    })
    // 外部点击收起（宿主 document 级，composed 跨 shadow）
    const onDocClick = (e: Event) => {
      if (!this.moreOpen) return
      const path = e.composedPath()
      if (
        !path.includes(moreBtn) &&
        !path.includes(this.shadow.querySelector('.more-dropdown') as Node)
      ) {
        this.moreOpen = false
        this.syncMoreDropdown()
      }
    }
    document.addEventListener('click', onDocClick, true)
    this.onCleanup(() => document.removeEventListener('click', onDocClick, true))
    // 搜索框输入实时过滤收起项；键盘 ArrowDown 进入列表项、Escape 收起
    const search = this.shadow.querySelector('.more-search') as HTMLInputElement | null
    search?.addEventListener('input', () => this.renderMoreDropdown())
    // 搜索框内点击不冒泡收起下拉；键盘：输入不冒泡（过滤），ArrowDown 进列表、Escape 收起
    search?.addEventListener('click', (e) => e.stopPropagation())
    search?.addEventListener('keydown', (e) => {
      e.stopPropagation()
      const ke = e as KeyboardEvent
      if (ke.key === 'ArrowDown') {
        ke.preventDefault()
        this.focusFirstMoreItem()
      } else if (ke.key === 'Escape') {
        ke.preventDefault()
        this.closeMore()
      }
    })
    // 下拉容器键盘导航：ArrowUp/Down/Home/End 遍历可见项、Enter/Space 激活、Escape 收起回 moreBtn
    const moreDropdown = this.shadow.querySelector('.more-dropdown') as HTMLElement | null
    moreDropdown?.addEventListener('keydown', (e) => this.onMoreDropdownKey(e))
  }

  /** 当前可见的下拉项（未被搜索过滤隐藏的 menuitem） */
  private visibleMoreItems(): HTMLElement[] {
    return [...this.shadow.querySelectorAll<HTMLElement>('.more-item')].filter((i) => !i.hidden)
  }

  /** 聚焦第一个可见下拉项（打开后首焦点落第一项，非搜索框） */
  private focusFirstMoreItem(): void {
    this.visibleMoreItems()[0]?.focus()
  }

  /** 收起下拉并回焦 moreBtn（键盘路径闭环） */
  private closeMore(): void {
    if (!this.moreOpen) return
    this.moreOpen = false
    this.syncMoreDropdown()
    const moreBtn = this.shadow.querySelector('.more-btn') as HTMLButtonElement | null
    moreBtn?.focus({ preventScroll: true })
  }

  /** 下拉容器键盘导航 */
  private onMoreDropdownKey(e: Event): void {
    const ke = e as KeyboardEvent
    const items = this.visibleMoreItems()
    const activeEl = this.shadow.activeElement as HTMLElement | null
    const idx = activeEl ? items.indexOf(activeEl) : -1
    if (ke.key === 'Escape') {
      ke.preventDefault()
      this.closeMore()
      return
    }
    if (ke.key === 'ArrowDown' || ke.key === 'ArrowUp' || ke.key === 'Home' || ke.key === 'End') {
      if (!items.length) return
      ke.preventDefault()
      let next = 0
      if (ke.key === 'ArrowDown') next = idx < 0 ? 0 : (idx + 1) % items.length
      else if (ke.key === 'ArrowUp')
        next = idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length
      else if (ke.key === 'Home') next = 0
      else next = items.length - 1
      items[next]?.focus()
      return
    }
    if (ke.key === 'Enter' || ke.key === ' ') {
      // 激活当前聚焦项（真实使用时 keydown 源自聚焦项冒泡；用 activeElement 更稳，不依赖 event.target）
      const focused = this.shadow.activeElement as HTMLElement | null
      if (focused && focused.classList.contains('more-item')) {
        ke.preventDefault()
        focused.click()
      }
    }
  }

  /**
   * more 溢出策略：测量每个 tab 宽度累积，超出 nav 可用宽度（扣除更多按钮占位）的
   * tab 标 data-overflowed 收进「更多」下拉。仅 more 属性开启时生效（与滚动箭头互斥）。
   */
  /**
   * more 模式（通用做法）：滚动 + 视口外镜像下拉。tab 全部渲染、tablist 可滚动
   *（不 display:none 收缩），more 下拉列出「当前滚动视口之外的 tab」作快捷跳转；
   * 点选下拉项 → scrollIntoView 平滑滚动到可见区 + 激活（激活项与相邻项因连续排布
   * 自然一起进入视口）。
   */
  private syncMore(): void {
    const moreBtn = this.shadow.querySelector('.more-btn') as HTMLButtonElement | null
    const tablist = this.shadow.querySelector('.tablist') as HTMLElement | null
    if (!moreBtn || !tablist) return
    if (!this.hasAttr('more')) {
      moreBtn.hidden = true
      return
    }
    // 溢出才有更多按钮（more 按钮占用在 nav 固定区）。溢出即意味着有 tab 不完全可见
    //（部分滚出也算，进下拉），故下拉必非空——无需额外判空
    const overflow = tablist.scrollWidth > tablist.clientWidth + 1
    moreBtn.hidden = !overflow
    if (!overflow) {
      this.moreOpen = false
      this.syncMoreDropdown()
      return
    }
    this.updateMoreOffview()
    this.renderMoreDropdown()
  }

  /** 计算并标记「不完全可见」的 tab（data-offview；左滚出 + 右滚出 + 部分滚出），滚动/resize 时更新 */
  private updateMoreOffview(): void {
    const tablist = this.shadow.querySelector('.tablist') as HTMLElement | null
    if (!tablist || !this.hasAttr('more')) return
    const vertical = this.isVertical()
    const scrollStart = vertical ? tablist.scrollTop : tablist.scrollLeft
    const clientSize = vertical ? tablist.clientHeight : tablist.clientWidth
    const viewEnd = scrollStart + clientSize
    for (const t of this.shadow.querySelectorAll<HTMLElement>('[role="tab"][data-value]')) {
      const start = vertical ? t.offsetTop : t.offsetLeft
      const end = start + (vertical ? t.offsetHeight : t.offsetWidth)
      // 不完全可见即收进 more（部分滚出也算；floor 容差避免 0.5px 抖动）
      const offview = start < scrollStart || Math.floor(end) > Math.floor(viewEnd)
      t.toggleAttribute('data-offview', offview)
    }
  }

  /** 渲染更多下拉内容（当前滚动视口之外的 tab 列表，作快捷跳转） */
  private renderMoreDropdown(): void {
    const dropdown = this.shadow.querySelector('.more-dropdown') as HTMLElement | null
    const list = this.shadow.querySelector('.more-list') as HTMLElement | null
    const search = this.shadow.querySelector('.more-search') as HTMLInputElement | null
    if (!dropdown || !list) return
    list.innerHTML = ''
    const offview = [
      ...this.shadow.querySelectorAll<HTMLElement>('[role="tab"][data-value][data-offview]'),
    ]
    const active = this.getAttr('active', '') || (this.panels[0]?.getAttribute('value') ?? '')
    // 搜索框：视口外项较多时才有意义（>5 个才显示搜索）
    const showSearch = offview.length > 5
    if (search) {
      search.hidden = !showSearch
      if (showSearch) search.setAttribute('aria-label', this.t('tabs.more'))
    }
    const keyword = (search?.value ?? '').trim().toLowerCase()
    for (const tab of offview) {
      const value = tab.getAttribute('data-value') ?? ''
      const panel = this.panels.find((p) => (p.getAttribute('value') ?? '') === value)
      const labelText = panel?.getAttribute('label') ?? value
      const item = document.createElement('button')
      item.className = 'more-item'
      item.setAttribute('type', 'button')
      item.setAttribute('role', 'menuitem')
      item.setAttribute('data-value', value)
      item.setAttribute('aria-current', String(value === active))
      item.textContent = labelText
      // 搜索过滤：不匹配的视口外项隐藏
      if (keyword && !labelText.toLowerCase().includes(keyword)) item.hidden = true
      item.addEventListener('click', () => {
        this.moreOpen = false
        this.syncMoreDropdown()
        // 点选视口外项：平滑滚动到可见区（激活项与相邻项因连续排布自然一起进入视口）+ 激活
        tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
        this.activate(value)
      })
      list.appendChild(item)
    }
  }

  /** 同步更多下拉展开态 */
  private syncMoreDropdown(): void {
    const dropdown = this.shadow.querySelector('.more-dropdown') as HTMLElement | null
    const moreBtn = this.shadow.querySelector('.more-btn') as HTMLButtonElement | null
    if (!dropdown || !moreBtn) return
    dropdown.hidden = !this.moreOpen
    moreBtn.setAttribute('aria-expanded', String(this.moreOpen))
    if (this.moreOpen) {
      this.renderMoreDropdown()
      // 打开时清空搜索；首焦点落第一个可见项（非搜索框，键盘用户直达溢出标签）
      const search = this.shadow.querySelector('.more-search') as HTMLInputElement | null
      if (search && !search.hidden) search.value = ''
      this.focusFirstMoreItem()
    }
  }

  /**
   * 面板内容显隐策略：keep=hidden 保留（默认）；lazy=未访问的未激活面板子节点暂存，
   * 首次激活挂载并标记 visited（此后常驻）；destroy=切换即卸载非激活面板子节点、激活时重挂。
   * 暂存/恢复操作的是面板 light DOM 子节点（Fragment 承载），不触发 tabs 的 childList observer
   * （observer 监听的是 host 直接子节点 panel 增删，不监听 panel 内部）。
   */
  private syncPanelContent(
    panel: HTMLElement,
    value: string,
    isActive: boolean,
    mode: TabsPanelMode,
  ): void {
    if (mode === 'keep') return
    if (isActive) {
      // 激活：若曾暂存则恢复子节点，并标记已访问
      const frag = this.stash.get(panel)
      if (frag) {
        panel.appendChild(frag)
        this.stash.delete(panel)
      }
      this.visited.add(value)
      return
    }
    // 未激活：lazy 仅暂存「未访问过」的；destroy 一律暂存
    const shouldStash = mode === 'destroy' || (mode === 'lazy' && !this.visited.has(value))
    if (shouldStash && !this.stash.has(panel) && panel.childNodes.length > 0) {
      const frag = document.createDocumentFragment()
      while (panel.firstChild) frag.appendChild(panel.firstChild)
      this.stash.set(panel, frag)
    }
  }

  private handleKey(e: KeyboardEvent): void {
    // 可聚焦值 = 非 disabled 面板（disabled 不参与键盘导航循环）
    const enabledValues = this.panels
      .filter((p) => !p.hasAttribute('disabled'))
      .map((p) => p.getAttribute('value') ?? '')
    if (enabledValues.length === 0) return
    const manual = this.getAttr('activation', 'auto') === 'manual'
    const active = this.getAttr('active', '') || enabledValues[0] || ''
    const idx = enabledValues.indexOf(active)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = enabledValues[(idx + 1) % enabledValues.length] ?? ''
      if (manual) this.moveFocus(next)
      else this.activate(next)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = enabledValues[(idx - 1 + enabledValues.length) % enabledValues.length] ?? ''
      if (manual) this.moveFocus(prev)
      else this.activate(prev)
    } else if (manual && (e.key === 'Enter' || e.key === ' ')) {
      // 手动激活：Enter/Space 切换当前聚焦的标签（读屏/键盘确认语义）
      const focused = (this.shadow.activeElement as HTMLElement)?.closest?.(
        '[role="tab"][data-value]',
      ) as HTMLElement | null
      const value = focused?.getAttribute('data-value')
      if (value) {
        e.preventDefault()
        this.activate(value)
      }
    } else if (e.key === 'PageDown' || e.key === 'PageUp') {
      // 溢出时 PageDown/PageUp 滚动一屏（键盘可达的溢出滚动）
      const tablist = this.shadow.querySelector('.tablist') as HTMLElement | null
      if (!tablist) return
      const vertical = this.isVertical()
      const size = vertical ? tablist.clientHeight : tablist.clientWidth
      const overflow = vertical
        ? tablist.scrollHeight > tablist.clientHeight + 1
        : tablist.scrollWidth > tablist.clientWidth + 1
      if (!overflow) return
      e.preventDefault()
      const amount = size * (e.key === 'PageDown' ? 1 : -1)
      if (vertical) tablist.scrollBy({ top: amount, behavior: 'smooth' })
      else tablist.scrollBy({ left: amount, behavior: 'smooth' })
    }
  }

  /** 手动激活模式：移动 roving 焦点（更新 tabindex + 聚焦）但不切换 active */
  private moveFocus(value: string): void {
    const tablist = this.shadow.querySelector('.tablist')
    if (!tablist) return
    for (const el of tablist.querySelectorAll<HTMLElement>('[role="tab"][data-value]')) {
      const isTarget = el.getAttribute('data-value') === value
      el.setAttribute('tabindex', isTarget ? '0' : '-1')
      if (isTarget) el.focus({ preventScroll: true })
    }
  }

  /**
   * manager 能力宿主面（TabsManagerHost）：
   * - translateText：翻译内置文案（命名避开 DOM 保留属性 translate，HTMLElement.translate 为布尔）
   * - refreshTabs：面板属性已变更后触发标签栏重建（重命名提交/取消路径）
   * - notifyManager：派发 manager 结果事件（事件名以字面量集中于此，供 api 扫描静态识别；
   *   未 import manager 能力时不会有任何调用）
   */
  /** 翻译内置文案（就近 config-provider / locale；能力 controller 与外部模板经此取词） */
  translateText(key: string, params?: Record<string, string | number>): string {
    return this.t(key, params)
  }

  /** 刷新标签栏（重命名写回 label 后重建 tablist 恢复结构；能力 controller 专用） */
  refreshTabs(): void {
    this.update()
  }

  /** 派发 manager 能力结果事件（add/close/rename/reorder；detail 由能力 controller 组好） */
  notifyManager(kind: 'add' | 'close' | 'rename' | 'reorder', detail: unknown): void {
    this.emit(kind, detail)
  }

  /** manager 能力未注入但检测到其配置时 dev 告警（同值去重，提示按需 import manager 能力包） */
  private warnManagerCapability(): void {
    if (this.managerCap) return
    const needsManager =
      this.hasAttr('context-menu') ||
      this.hasAttr('sortable') ||
      this.panels.some((p) => p.hasAttribute('editable'))
    if (needsManager) warnManagerNotImported()
  }

  private activate(value: string): void {
    // disabled 面板不可激活（键盘已跳过；此处防御性守卫，防宿主直接 setAttribute 到 disabled 值时面板错位）
    const panel = this.panels.find((p) => (p.getAttribute('value') ?? '') === value)
    if (panel?.hasAttribute('disabled')) return
    const current = this.getAttr('active', '') || (this.panels[0]?.getAttribute('value') ?? '')
    // 重复点击已激活标签：allow-deactivation 时取消激活（无选中态），否则不重建不派发
    //（无谓 rebuild 会销毁双击目标，导致浏览器不派发 dblclick，editable 重命名失效）
    if (value === current) {
      if (this.hasAttr('allow-deactivation')) {
        if (!this.emit('before-change', { value: '' }, { cancelable: true })) return
        this.setAttribute('active', '')
        this.emit('change', { value: '' })
        this.update()
      }
      return
    }
    // oas-before-change：切换前拦截点（cancelable），宿主 preventDefault 可 veto 本次切换
    if (!this.emit('before-change', { value }, { cancelable: true })) return
    this.setAttribute('active', value)
    this.emit('change', { value })
    this.update()
    // 激活后焦点落到新激活标签（方向键/点击切换时 roving tabindex 同步）
    this.findTabByValue(value)?.focus({ preventScroll: true })
  }

  /**
   * 捕获标签栏区域当前焦点的归属：'add'（+ 按钮，在 nav 固定区）| 'tab'/'close' + 标签 value |
   * null（焦点不在标签栏内，如初始渲染/宿主聚焦他处）。
   * 注意：焦点在 shadow DOM 内时 document.activeElement 只返回宿主，
   * 必须用 this.shadow.activeElement 才能拿到真正聚焦的元素。
   */
  private captureFocused(): { type: 'tab' | 'close' | 'add'; value: string } | null {
    const nav = this.shadow.querySelector('.nav')
    const tablist = this.shadow.querySelector('.tablist')
    const active = this.shadow.activeElement
    if (!nav || !nav.contains(active)) return null
    // + 按钮在 nav 固定区（滚动区外）
    if (this.addBtn && active === this.addBtn) return { type: 'add', value: '' }
    if (!tablist || !tablist.contains(active)) return null
    const btn = (active as HTMLElement).closest('[role="tab"]')
    if (!btn) return null
    const close = (active as HTMLElement).closest('.tab-close')
    return {
      type: close ? 'close' : 'tab',
      value: (btn as HTMLElement).getAttribute('data-value') ?? '',
    }
  }

  /** 重建后按捕获的焦点归属恢复焦点；标签被移除时落到当前选中标签 */
  private restoreFocus(
    focused: { type: 'tab' | 'close' | 'add'; value: string } | null,
    added: boolean,
  ): void {
    if (!focused) return
    if (focused.type === 'add') {
      // + 按钮触发且宿主新增了面板 → 焦点落到新标签（最后追加的面板）；
      // 否则仍留在 + 按钮
      const target = added ? this.lastTabButton() : this.addBtn
      target?.focus({ preventScroll: true })
      return
    }
    const btn = this.findTabByValue(focused.value)
    if (btn) {
      const target = focused.type === 'close' ? btn.querySelector<HTMLElement>('.tab-close') : btn
      ;(target ?? btn).focus({ preventScroll: true })
    } else {
      // 焦点所在标签已被移除 → 落到当前选中标签
      this.shadow
        .querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
        ?.focus({ preventScroll: true })
    }
  }

  private findTabByValue(value: string): HTMLElement | null {
    const tablist = this.shadow.querySelector('.tablist')
    if (!tablist) return null
    // 限定带 data-value 的真实标签（排除 + 占位 tab）
    for (const el of tablist.querySelectorAll<HTMLElement>('[role="tab"][data-value]')) {
      if (el.getAttribute('data-value') === value) return el
    }
    return null
  }

  private lastTabButton(): HTMLElement | null {
    const tablist = this.shadow.querySelector('.tablist')
    if (!tablist) return null
    // 限定带 data-value 的真实标签（+ 占位 tab 在末尾，不能作为「最后追加的面板」落焦点）
    const tabs = tablist.querySelectorAll<HTMLElement>('[role="tab"][data-value]')
    return tabs.length ? (tabs[tabs.length - 1] ?? null) : null
  }
}
