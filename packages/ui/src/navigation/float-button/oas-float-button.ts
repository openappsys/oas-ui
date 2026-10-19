import { OASElement, escapeAttr } from '@oas-ui/core'
import { lookupIcon } from '@oas-ui/icons/runtime'
import { isRtl } from '../../shared/direction.js'
import { normalizeSizeStrict, ALL_SIZES } from '../../shared/size.js'
import { devWarn } from '../../shared/dev-warn.js'

/** 尺寸档位：xs/small/medium/large/xl 全称（默认 large，对应 48px 常规 FAB 观感）；sm/md/lg 为等价别名 */
/** 非法 size 告警：回落 large 并在 dev 下 console.warn 一次（同值去重）；sm/md/lg 别名由 shared/size 静默映射，不告警 */
const warnedSizes = new Set<string>()
function warnInvalidSize(raw: string): void {
  if (warnedSizes.has(raw)) return
  warnedSizes.add(raw)
  devWarn(`[oas-float-button] 非法 size "${raw}"，已回落 large；合法值：xs/small/medium/large/xl`)
}

/** 模式：single 单钮（默认）/ group 分组（主钮 + slot 子钮堆叠）/ menu 菜单（主钮弹出动作菜单） */
const VALID_MODES = ['single', 'group', 'menu'] as const
type FloatButtonMode = (typeof VALID_MODES)[number]

const warnedModes = new Set<string>()

/** 非法 mode 归一化：回落 single 并在 dev 下 console.warn 一次（同值去重） */
function normalizeMode(raw: string): FloatButtonMode {
  if ((VALID_MODES as readonly string[]).includes(raw)) return raw as FloatButtonMode
  if (!warnedModes.has(raw)) {
    warnedModes.add(raw)
    devWarn(`[oas-float-button] 非法 mode "${raw}"，已回落 single；合法值：single/group/menu`)
  }
  return 'single'
}

/** 展开方向：up/down/left/right（默认 up；menu 面板为纵向菜单只认 up/down，横向回落 up） */
type ExpandDirection = 'up' | 'down' | 'left' | 'right'

/** 触发方式：click 主钮点击切换（默认）/ hover 悬停展开移出收起 / manual 仅受控属性驱动 */
type ExpandTrigger = 'click' | 'hover' | 'manual'

/** hover 触发的离开宽限期（ms）：指针离开后短暂滞留防误收 */
const HOVER_LEAVE_GRACE = 120

/** group/menu 共用动作项数据契约（actions JSON，label 必填；group 自渲染圆形子钮、menu 渲染菜单项） */
export interface FloatButtonAction {
  label: string
  icon?: string
  /** 链接化：设置后渲染 <a>（与可点动作互斥，href 优先） */
  href?: string
  target?: string
  /** 徽标：'dot' 状态点 / 纯数字（超 99 封顶 99+）/ 其他文本原样 */
  badge?: string
}

/** 徽标值格式化：'dot' → 状态点；纯数字 → 超 99 封顶 99+；其余文本原样 */
function formatBadgeValue(raw: string): { text: string; dot: boolean } {
  if (raw === 'dot') return { text: '', dot: true }
  if (/^\d+$/.test(raw)) {
    const n = parseInt(raw, 10)
    return { text: n > 99 ? '99+' : String(n), dot: false }
  }
  return { text: raw, dot: false }
}

/** 拖拽/点击判定阈值：位移 >4px 视为拖拽（pointerup 不派发 oas-click）；≤4px 视为点击 */
const DRAG_THRESHOLD = 4

const STYLE = `
:host {
  display: inline-block;
  vertical-align: middle;
  font-family: inherit;
  position: fixed;
  /* 定位开口：宿主可覆盖 --oas-float-button-bottom / --oas-float-button-right 调整悬浮位置 */
  bottom: var(--oas-float-button-bottom, var(--oas-space-6));
  right: var(--oas-float-button-right, var(--oas-space-6));
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-fixed, 1030));
  /* 尺寸档位（默认 large = control-height-xl = 48px） */
  --oas-float-button-size: var(--oas-control-height-xl);
  /* 子钮尺寸：主钮档位 -8px（large = 40px）；coarse pointer 下抬到触控目标下限 */
  --oas-float-button-action-size: calc(var(--oas-float-button-size) - var(--oas-space-2));
}
:host([hidden]) {
  display: none;
}
:host([data-size='xs']) {
  --oas-float-button-size: var(--oas-control-height-sm);
}
:host([data-size='small']) {
  --oas-float-button-size: var(--oas-control-height-md);
}
:host([data-size='medium']) {
  --oas-float-button-size: var(--oas-control-height-lg);
}
:host([data-size='large']) {
  --oas-float-button-size: var(--oas-control-height-xl);
}
:host([data-size='xl']) {
  --oas-float-button-size: calc(var(--oas-control-height-xl) + var(--oas-space-2));
}
.btn {
  position: relative;
  box-sizing: border-box;
  width: var(--oas-float-button-size);
  height: var(--oas-float-button-size);
  border-radius: 50%;
  border: 1px solid transparent;
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  font-size: var(--oas-font-size-xl);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-2);
  padding: 0;
  line-height: 1;
  font-family: inherit;
  text-decoration: none;
  box-shadow: var(--oas-shadow-md);
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    transform var(--oas-transition-fast) var(--oas-ease-out);
}
/* 图标字号随尺寸档位缩放（xs 24px 档 20px 图标会溢出，故逐档递减） */
:host([data-size='xs']) .btn {
  font-size: var(--oas-font-size-md);
}
:host([data-size='small']) .btn,
:host([data-size='medium']) .btn {
  font-size: var(--oas-font-size-lg);
}
:host([data-size='large']) .btn {
  font-size: var(--oas-font-size-xl);
}
:host([data-size='xl']) .btn {
  font-size: calc(var(--oas-font-size-xl) * 1.2);
}
/* 方形（square）即胶囊圆角：与 extended 扩展形态视觉合并 */
:host([data-shape='square']) .btn {
  border-radius: var(--oas-radius-full, 999px);
}
.btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring), var(--oas-shadow-md);
}
.btn:not(:disabled):not([aria-disabled='true']):active {
  transform: scale(0.96);
}
/* 拖拽中：grabbing 光标 + 禁止选中（配合宿主 data-dragging） */
:host(.dragging) .btn {
  cursor: grabbing;
  user-select: none;
  -webkit-user-select: none;
}
.btn.primary {
  background: var(--oas-color-primary);
  border-color: transparent;
  color: var(--oas-color-text-on-primary);
}
.btn.primary:hover {
  background: var(--oas-color-primary-hover);
}
.btn.primary:active {
  background: var(--oas-color-primary-active);
}
.btn.default {
  background: var(--oas-color-bg);
  border-color: var(--oas-color-border);
  color: var(--oas-color-text-primary);
}
.btn.default:hover {
  background: var(--oas-color-bg-hover);
}
.btn.default:active {
  background: var(--oas-color-bg-hover);
}
/* 扩展文字：横向胶囊（icon + 文字横排），宽度随内容、高度保持尺寸档位 */
.btn.extended {
  width: auto;
  min-width: var(--oas-float-button-size);
  height: var(--oas-float-button-size);
  border-radius: var(--oas-radius-full, 999px);
  padding: 0 var(--oas-space-4);
}
.btn:disabled,
.btn[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--oas-color-bg-disabled);
  border-color: var(--oas-color-border);
  color: var(--oas-color-text-disabled);
  box-shadow: none;
}
.btn:disabled:hover,
.btn[aria-disabled='true']:hover,
.btn:disabled:active,
.btn[aria-disabled='true']:active {
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
  transform: none;
}
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.label {
  display: inline-flex;
  align-items: center;
  font-size: var(--oas-font-size-md);
  white-space: nowrap;
  line-height: 1;
}
.label[hidden] {
  display: none;
}
.badge {
  position: absolute;
  top: calc(-1 * var(--oas-space-1));
  /* 逻辑 inset：徽标挂书写方向终点角（LTR 右上 / RTL 左上） */
  inset-inline-end: calc(-1 * var(--oas-space-1));
  min-width: var(--oas-control-height-xs);
  height: var(--oas-control-height-xs);
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-color-danger);
  color: var(--oas-color-text-on-danger);
  font-size: var(--oas-font-size-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--oas-space-1);
  line-height: 1;
}
/* badge="dot" 状态点：8px 空心实心小圆 */
.badge.dot {
  min-width: var(--oas-space-2);
  width: var(--oas-space-2);
  height: var(--oas-space-2);
  padding: 0;
}
/* ===== mode="group" 分组展开层 ===== */
.group {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
/* 双层布局：actions（真实子钮，slot 投影）+ mirror-layer（不可见锚点层，气泡/徽标与子钮逐位对齐）。
   两层同 flex 几何同 item 尺寸，mirror 项与第 i 个子钮位置一致 */
.layer {
  position: absolute;
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.actions {
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--oas-transition-base) var(--oas-ease-out),
    transform var(--oas-transition-base) var(--oas-ease-out),
    visibility var(--oas-transition-base);
}
.actions ::slotted([slot='action']) {
  pointer-events: auto;
}
/* group 子钮形态语言（与主钮同系）：圆形小钮 + 浅底描边，尺寸走 --oas-float-button-action-size；
   链接子钮（a[slot=action]）同形态（text-decoration none）。
   注：slot 子钮为「自定义通道」，此默认形态是 best-effort——::slotted 可被宿主页全局样式覆盖，
   需要保证形态时用 actions 通道（.action-btn，见下）或让子钮自带视觉 */
.actions ::slotted([slot='action']) {
  appearance: none;
  box-sizing: border-box;
  width: var(--oas-float-button-action-size);
  height: var(--oas-float-button-action-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--oas-color-border);
  border-radius: 50%;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-lg);
  line-height: 1;
  cursor: pointer;
  text-decoration: none;
  flex-shrink: 0;
  box-shadow: var(--oas-shadow-md);
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out);
}
.actions ::slotted([slot='action']:hover) {
  background: var(--oas-color-bg-hover);
  border-color: var(--oas-color-primary);
}
.actions ::slotted([slot='action']:focus-visible) {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* ===== group actions 渲染通道：子钮外壳由组件渲染（shadow 内，免疫宿主页 CSS 覆盖） =====
   形态与 slot 版等价；aria-label = label，气泡 hover/focus 纯 CSS 显隐 */
.actions .action-btn {
  pointer-events: auto;
  position: relative;
  appearance: none;
  box-sizing: border-box;
  width: var(--oas-float-button-action-size);
  height: var(--oas-float-button-action-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--oas-color-border);
  border-radius: 50%;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-lg);
  line-height: 1;
  cursor: pointer;
  text-decoration: none;
  flex-shrink: 0;
  box-shadow: var(--oas-shadow-md);
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out);
}
.actions .action-btn:hover {
  background: var(--oas-color-bg-hover);
  border-color: var(--oas-color-primary);
}
.actions .action-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* actions 与 slot 子钮同时提供：以 actions 为准，隐藏 slot 投影（宿主反射 data-action-rendered） */
:host([data-action-rendered]) .actions ::slotted([slot='action']) {
  display: none;
}
/* 内联气泡：hover / 键盘聚焦时显示（纯 CSS，不依赖 mirror 层） */
.action-btn:hover .bubble,
.action-btn:focus-visible .bubble {
  opacity: 1;
  visibility: visible;
}
.action-btn .icon svg {
  display: block;
  width: 1em;
  height: 1em;
}
/* 子钮徽标：挂在书写方向终点角（逻辑 inset，RTL 自动镜像） */
.action-btn .mini-badge {
  position: absolute;
  top: calc(-1 * var(--oas-space-1));
  inset-inline-end: calc(-1 * var(--oas-space-1));
}
.group.open .actions {
  opacity: 1;
  visibility: visible;
  /* 展开向：visibility 立即翻转（无过渡），子动作 T0 即可聚焦——
     syncExpanded 展开帧自动聚焦落在可见元素上（收起向保留 base 的 visibility 延迟过渡，淡出完成后再隐藏） */
  transition: opacity var(--oas-transition-base) var(--oas-ease-out),
    transform var(--oas-transition-base) var(--oas-ease-out);
}
/* 方向布局（data-dir 由 JS 写入，已含 RTL 镜像）：首个子钮最靠近主钮；
   收起态沿展开方向内收 8px，展开态归位（滑入过渡） */
.group[data-dir='up'] .layer {
  bottom: calc(100% + var(--oas-space-2));
  left: 50%;
  flex-direction: column-reverse;
}
.group[data-dir='up'] .actions {
  transform: translate(-50%, var(--oas-space-2));
}
.group[data-dir='up'].open .actions {
  transform: translate(-50%, 0);
}
.group[data-dir='down'] .layer {
  top: calc(100% + var(--oas-space-2));
  left: 50%;
  flex-direction: column;
}
.group[data-dir='down'] .actions {
  transform: translate(-50%, calc(-1 * var(--oas-space-2)));
}
.group[data-dir='down'].open .actions {
  transform: translate(-50%, 0);
}
.group[data-dir='left'] .layer {
  right: calc(100% + var(--oas-space-2));
  top: 50%;
  flex-direction: row-reverse;
}
.group[data-dir='left'] .actions {
  transform: translate(var(--oas-space-2), -50%);
}
.group[data-dir='left'].open .actions {
  transform: translate(0, -50%);
}
.group[data-dir='right'] .layer {
  left: calc(100% + var(--oas-space-2));
  top: 50%;
  flex-direction: row;
}
.group[data-dir='right'] .actions {
  transform: translate(calc(-1 * var(--oas-space-2)), -50%);
}
.group[data-dir='right'].open .actions {
  transform: translate(0, -50%);
}
/* mirror 层恒用展开位几何（不可见锚点层：仅对齐气泡/徽标到子钮的最终视觉位置） */
.group[data-dir='up'] .mirror-layer,
.group[data-dir='down'] .mirror-layer {
  transform: translate(-50%, 0);
}
.group[data-dir='left'] .mirror-layer,
.group[data-dir='right'] .mirror-layer {
  transform: translate(0, -50%);
}
/* mirror 锚点项：与子钮同尺寸，自身不可见，只承载气泡与徽标 */
.mirror {
  position: relative;
  box-sizing: border-box;
  width: var(--oas-float-button-action-size);
  height: var(--oas-float-button-action-size);
  visibility: hidden;
  flex-shrink: 0;
}
/* 气泡基样式（通用：mirror 锚点气泡与 .action-btn 内联气泡共用；方向定位见下方 .group[data-dir] 规则） */
.bubble {
  position: absolute;
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-tooltip-bg, var(--oas-color-text-primary));
  color: var(--oas-tooltip-color, var(--oas-color-bg));
  font-size: var(--oas-font-size-sm);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--oas-transition-base) var(--oas-ease-out),
    visibility var(--oas-transition-base);
  z-index: 5;
}
/* 气泡定位随展开方向：纵向展开 → 子钮书写终点侧（逻辑 inset，RTL 自动镜像）；
   横向展开 → 子钮上方居中 */
.group[data-dir='up'] .bubble,
.group[data-dir='down'] .bubble {
  top: 50%;
  inset-inline-start: calc(100% + var(--oas-space-2));
  transform: translateY(-50%);
}
.group[data-dir='left'] .bubble,
.group[data-dir='right'] .bubble {
  bottom: calc(100% + var(--oas-space-2));
  left: 50%;
  transform: translateX(-50%);
}
.mirror.bubble-on .bubble {
  opacity: 1;
  visibility: visible;
}
.mirror .mini-badge {
  position: absolute;
  top: calc(-1 * var(--oas-space-1));
  inset-inline-end: calc(-1 * var(--oas-space-1));
}
/* ===== mode="menu" 动作菜单面板 ===== */
.menu {
  position: absolute;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: max-content;
  padding: var(--oas-space-1);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  box-shadow: var(--oas-shadow-lg);
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--oas-transition-base) var(--oas-ease-out),
    transform var(--oas-transition-base) var(--oas-ease-out),
    visibility var(--oas-transition-base);
  z-index: 1;
}
.menu.open {
  opacity: 1;
  visibility: visible;
  /* 展开向：visibility 立即翻转（无过渡），菜单项 T0 即可聚焦（同 .group.open .actions 处理） */
  transition: opacity var(--oas-transition-base) var(--oas-ease-out),
    transform var(--oas-transition-base) var(--oas-ease-out);
}
/* 菜单只支持纵向展开（up 默认 / down），收起态沿方向内收 8px */
.menu[data-dir='up'] {
  bottom: calc(100% + var(--oas-space-2));
  left: 50%;
  transform: translate(-50%, var(--oas-space-2));
}
.menu[data-dir='up'].open {
  transform: translate(-50%, 0);
}
.menu[data-dir='down'] {
  top: calc(100% + var(--oas-space-2));
  left: 50%;
  transform: translate(-50%, calc(-1 * var(--oas-space-2)));
}
.menu[data-dir='down'].open {
  transform: translate(-50%, 0);
}
.item {
  appearance: none;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  min-height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-3);
  border: none;
  border-radius: var(--oas-radius-md);
  background: transparent;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  text-decoration: none;
  transition: background var(--oas-transition-fast) var(--oas-ease-out);
}
.item:hover {
  background: var(--oas-color-bg-hover);
}
.item:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.item .icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
}
.item .icon svg {
  display: block;
  width: 1em;
  height: 1em;
}
.item .item-label {
  display: inline-flex;
  align-items: center;
}
/* 菜单项徽标：推到行尾 */
.item .mini-badge {
  margin-inline-start: var(--oas-space-2);
}
/* 子钮/菜单项徽标（复用 badge 形态语言：danger 实底胶囊，dot 8px 状态点） */
.mini-badge {
  box-sizing: border-box;
  min-width: var(--oas-control-height-xs);
  height: var(--oas-control-height-xs);
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-color-danger);
  color: var(--oas-color-text-on-danger);
  font-size: var(--oas-font-size-xs);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--oas-space-1);
  line-height: 1;
}
.mini-badge[hidden] {
  display: none;
}
.mini-badge.dot {
  min-width: var(--oas-space-2);
  width: var(--oas-space-2);
  height: var(--oas-space-2);
  padding: 0;
}
/* ===== 移动端触控目标：coarse pointer 下子钮与菜单项抬到 --oas-touch-target-min（默认 44px） ===== */
@media (pointer: coarse) {
  :host {
    --oas-float-button-action-size: var(--oas-touch-target-min, 44px);
  }
  .item {
    min-height: var(--oas-touch-target-min, 44px);
  }
}
/* 减少动效偏好：展开/气泡过渡停用（一次性出现，对齐可访问性） */
@media (prefers-reduced-motion: reduce) {
  .actions,
  .menu,
  .bubble {
    transition: none;
  }
}
`

/**
 * oas-float-button —— 悬浮按钮（家族：单钮 / 分组 / 菜单）。
 *
 * 属性（kebab-case）：
 * - `mode`：`single`（默认，单钮）/ `group`（主钮 + 子钮堆叠）/ `menu`（主钮弹出动作菜单）；非法值回落 single 并告警
 * - `expanded`：展开态（group/menu 受控开关，属性即状态源；组件交互写属性 + 派发事件）
 * - `trigger`：展开触发 `click`（默认）/ `hover`（触屏自动回落 click）/ `manual`（仅 expanded 属性驱动）
 * - `expand-direction`：展开方向 `up`（默认）/ `down` / `left` / `right`；RTL 下横向方向自动镜像；
 *   menu 面板为纵向菜单只认 up/down（横向回落 up）
 * - `actions`：group/menu 共用的动作项 JSON `[{ label, icon?, href?, target?, badge? }]`——
 *   group 由组件在 shadow 内自渲染圆形子钮（推荐用法，免疫宿主页 CSS 覆盖）；menu 渲染动作菜单
 * - `badge`：主钮角标——`dot` 状态点 / 纯数字（超 99 封顶 `99+`）/ 其他文本原样
 * - `shape`/`type`/`size`/`disabled`/`href`/`target`/`aria-label`/`draggable`/`magnetic`：单钮既有能力（三模式共用主钮）
 *
 * 插槽：
 * - 默认插槽：主钮扩展文字（胶囊形态）
 * - `icon`：主钮图标（默认 ＋）
 * - `action`（group 模式，自定义通道）：宿主自填 light DOM 子钮（button/a/oas-button/自定义元素均可），
 *   适合自定义视觉、框架响应式内容、每钮不同行为等 `actions` 数据通道无法表达的场景；可带 `label`
 *   （气泡文本）与 `badge` 属性。默认形态经 ::slotted 承载（best-effort，可被宿主页 CSS 覆盖）；
 *   标准圆形子钮（icon+label+href+badge）推荐用 `actions`（组件自渲染，免疫宿主页 CSS）。
 *   与 actions 是二选一通道，同时提供时以 actions 为准（CSS 隐藏 slot 投影并 dev 告警一次）
 *
 * 事件（bubbles + composed）：
 * - `oas-click`：主钮点击，`detail: { originalEvent }`
 * - `oas-expand-change`：展开/收起后派发，`detail: { expanded }`（宿主设置 expanded 属性不派发）
 * - `oas-select`：group/menu 模式选择动作项，`detail: { index, label, href? }`，选择后自动收起
 *
 * 交互边界：
 * - group：点击子钮后组自动收起（选择即收起）；Esc/外点收起并回焦主钮
 * - menu：Esc/外点收起并回焦主钮；展开自动聚焦首项（hover 触发不抢焦点）
 * - 文档级监听仅在展开时挂载，收起/断开连接即移除，无孤儿监听
 * - `prefers-reduced-motion` 下展开/气泡过渡停用
 * - coarse pointer：子钮与菜单项触控目标抬到 --oas-touch-target-min（默认 44px）
 */
export class OASFloatButton extends OASElement {
  /** 挂载即全新迁移：连接前 setAttribute 已触发过 syncExpanded（wasExpanded 置位），
      重置后 connect 后的首帧「收起 → 展开」仍会按契约自动聚焦首项 */
  override connectedCallback(): void {
    this.wasExpanded = false
    super.connectedCallback()
  }

  static override get observedAttributes(): string[] {
    return [
      'mode',
      'expanded',
      'trigger',
      'expand-direction',
      'actions',
      'badge',
      'shape',
      'type',
      'size',
      'disabled',
      'href',
      'target',
      'aria-label',
      'draggable',
      'magnetic',
      'dir',
    ]
  }

  private btn: HTMLElement | null = null
  /** group 展开层根（group 模式） */
  private group: HTMLElement | null = null
  /** group 子钮容器（slot 投影层） */
  private actionsEl: HTMLElement | null = null
  /** mirror 锚点层（气泡/徽标与子钮逐位对齐） */
  private mirrorLayer: HTMLElement | null = null
  /** menu 动作面板（menu 模式） */
  private menu: HTMLElement | null = null
  /** menu 动作项列表（actions JSON 解析产物） */
  private actionsList: FloatButtonAction[] = []

  /** hover 离开宽限期计时器 */
  private hoverHideTimer: ReturnType<typeof setTimeout> | null = null
  /** hover 触发展开时置位：syncExpanded 跳过「自动聚焦首项」，不抢焦点 */
  private skipFocusOnOpen = false
  /** 上一次 syncExpanded 的展开态（状态迁移判定用：仅在收起 → 展开帧聚焦首项） */
  private wasExpanded = false
  /** slot 子钮与 actions 并存告警一次性标记（实例级：同一元素多次 update 只告警一次，防刷屏） */
  private warned = false

  /** 进行中的拖拽会话（draggable）：pointer 捕获 + 起点 + 位移阈值标记 */
  private dragState: {
    pointerId: number
    startX: number
    startY: number
    startLeft: number
    startTop: number
    maxX: number
    maxY: number
    moved: boolean
  } | null = null
  /** 拖拽超阈值后抑制随之合成的一次 click（区分拖拽与点击） */
  private suppressClick = false

  // ---------- 归一化读取 ----------

  private validMode(): FloatButtonMode {
    return normalizeMode(this.getAttr('mode', 'single'))
  }

  private validTrigger(): ExpandTrigger {
    const raw = this.getAttr('trigger', 'click')
    return raw === 'hover' || raw === 'manual' ? raw : 'click'
  }

  /** expand-direction 合法化：非法值回落 up（menu 的横向枚举在 effectiveDirection 中回落 up） */
  private validExpandDirection(): ExpandDirection {
    const raw = this.getAttr('expand-direction', 'up')
    return raw === 'down' || raw === 'left' || raw === 'right' ? raw : 'up'
  }

  /**
   * 有效展开方向 = 合法化 expand-direction + RTL 书写方向镜像 + menu 纵向约束。
   * 横向展开是「朝书写方向起点/终点」的逻辑语义：RTL 下 left↔right 互换（与 speed-dial 同规则）；
   * menu 面板为纵向菜单，left/right 回落 up。
   */
  private effectiveDirection(): ExpandDirection {
    let dir = this.validExpandDirection()
    if (this.validMode() === 'menu' && (dir === 'left' || dir === 'right')) dir = 'up'
    if (!isRtl(this)) return dir
    if (dir === 'left') return 'right'
    if (dir === 'right') return 'left'
    return dir
  }

  /**
   * 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致。
   * 主钮标签三态：button（无 href）/ a（href）/ span（href + disabled 降级，不可点击）。
   */
  private template(): string {
    const mode = this.validMode()
    const styleTag = `<style>${STYLE}</style>`
    if (mode === 'group') {
      return `${styleTag}
        <div class="group" part="group" data-dir="up">
          <div class="layer mirror-layer" part="action-mirrors" aria-hidden="true"></div>
          <div class="layer actions" part="actions"><slot name="action"></slot></div>
        </div>
        ${this.btnTemplate()}
      `
    }
    if (mode === 'menu') {
      return `${styleTag}
        <div class="menu" part="menu" role="menu" data-dir="up" aria-label="${escapeAttr(this.t('floatButton.action'))}"></div>
        ${this.btnTemplate()}
      `
    }
    return `${styleTag}${this.btnTemplate()}`
  }

  /** 主钮模板（三模式共用） */
  private btnTemplate(): string {
    const href = this.getAttr('href', '')
    const target = this.getAttr('target', '')
    const disabled = this.injectDisabled()
    let tag = 'button'
    let tagAttrs = ' type="button"'
    if (href) {
      if (disabled) {
        tag = 'span'
        tagAttrs = ' aria-disabled="true"'
      } else {
        tag = 'a'
        tagAttrs = ` href="${escapeAttr(href)}"${target ? ` target="${escapeAttr(target)}"` : ''}`
      }
    } else if (disabled) {
      tagAttrs = ' type="button" disabled aria-disabled="true"'
    }
    const hasText = this.hasText()
    return `
      <${tag} class="btn" part="btn"${tagAttrs}>
        <span class="icon" part="icon"><slot name="icon">＋</slot></span>
        <span class="label" part="label"${hasText ? '' : ' hidden'}><slot></slot></span>
        ${this.hasAttr('badge') ? '<span class="badge" part="badge"></span>' : ''}
      </${tag}>
    `
  }

  /**
   * 是否带扩展文字：light DOM 中是否存在「未被具名 slot（icon/action）消费」的文本内容。
   * 只读宿主子节点，不依赖 shadow 状态——render/SSR/update 各路径一致可用。
   */
  private hasText(): boolean {
    return Array.from(this.childNodes).some((node) => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0
      if (node.nodeType === Node.ELEMENT_NODE) {
        // 具名 slot 内容（icon/action）不算扩展文字
        if ((node as Element).hasAttribute('slot')) return false
        return (node.textContent ?? '').trim().length > 0
      }
      return false
    })
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.btn = this.shadow.querySelector('.btn')
    this.group = this.shadow.querySelector('.group')
    this.actionsEl = this.shadow.querySelector('.actions')
    this.mirrorLayer = this.shadow.querySelector('.mirror-layer')
    this.menu = this.shadow.querySelector('.menu')
    this.btn?.addEventListener('click', (e: MouseEvent) => {
      // 拖拽超阈值后浏览器会在捕获目标上合成一次 click → 消费并复位（拖拽不派发 oas-click），
      // 同时 preventDefault 阻止 href 模式下 <a> 的链接导航被拖拽误触发
      if (this.suppressClick) {
        this.suppressClick = false
        e.preventDefault()
        return
      }
      if (this.injectDisabled()) {
        e.preventDefault()
        return
      }
      // detail 携带 originalEvent：与组件文档契约一致（原生 disabled button 不会触发点击，
      // 此处 guard 覆盖 href 模式降级 span 之外的防御场景）
      this.emit('click', { originalEvent: e })
      // group/menu + click 触发：主钮激活切换展开（manual 不在此切换；hover 在触屏下回落 click）
      if (this.validMode() !== 'single' && this.resolvedTrigger() === 'click') this.toggleExpand()
    })
    // 拖拽会话（pointer 捕获 + 移动定位 + 松手释放/磁吸）——绑定在内层按钮上，
    // 捕获目标 = 按钮自身，合成的 click 仍落在按钮（点击判定不被破坏）
    this.btn?.addEventListener('pointerdown', this.handlePointerDown)
    this.btn?.addEventListener('pointermove', this.handlePointerMove)
    this.btn?.addEventListener('pointerup', this.handlePointerUp)
    this.btn?.addEventListener('pointercancel', this.handlePointerCancel)
    // 默认插槽内容增减时重算扩展文字形态（icon/action slot 变化不影响 extended）
    this.shadow.querySelector<HTMLSlotElement>('slot:not([name])')?.addEventListener('slotchange', () => this.update())
    // group 子钮为 light DOM：happy-dom 不支持事件沿 slot 冒泡进 shadow 树，
    // 交互监听（点击收起/键盘导航/气泡显隐）直接绑在子钮元素上（见 syncMirrors → ensureChildBindings）；
    // action slot 内容增减时重同步 mirror 层
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="action"]')
      ?.addEventListener('slotchange', () => this.update())
    // menu 面板：键盘导航（菜单项事件在 renderMenuItems 内逐项绑定）
    this.menu?.addEventListener('keydown', this.handleActionsKeydown)
    // group actions 渲染通道：子钮 keydown 冒泡到 .actions 容器统一走方向键导航（menu 同款委托）。
    // 仅在 actions 渲染路径启用——slot 路径已由 ensureChildBindings 逐钮直绑；真实浏览器里 slot 子钮
    // 的 keydown 会冒泡穿过 <slot> 到 .actions，若此处不设守卫会与逐钮直绑叠加，方向键一次跳两步。
    this.actionsEl?.addEventListener('keydown', (e) => {
      if (this.actionsList.length > 0) this.handleActionsKeydown(e)
    })
    // hover 触发：悬停区域 = 宿主（主钮）+ 展开面板（跨 gap 移动不闪关，宽限期内回入不收起）
    this.addEventListener('mouseenter', this.onHoverEnter)
    this.addEventListener('mouseleave', this.onHoverLeave)
    const panel = this.actionsEl ?? this.menu
    panel?.addEventListener('mouseenter', this.onPanelEnter)
    panel?.addEventListener('mouseleave', this.onPanelLeave)
    // 文档级监听由 syncExpanded 按展开态挂载/移除；此处兜底断开连接时的清理
    this.onCleanup(() => {
      document.removeEventListener('click', this.handleDocClick, true)
      document.removeEventListener('keydown', this.handleDocKeydown)
      this.clearHoverHide()
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  // ---------- group 子钮与 mirror 层 ----------

  /** light DOM 子钮（slot="action"，宿主自填） */
  private slottedActions(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('[slot="action"]')]
  }

  private mirrorItems(): HTMLElement[] {
    return [...(this.mirrorLayer?.querySelectorAll<HTMLElement>('.mirror') ?? [])]
  }

  /**
   * mirror 层同步：为每个子钮保持一个同尺寸锚点项（数量对齐，slotchange/update 幂等），
   * 并同步其 label 气泡文本与 badge 徽标（dot/数字封顶同主钮规则）。
   */
  private syncMirrors(): void {
    const layer = this.mirrorLayer
    if (!layer) return
    const kids = this.slottedActions()
    if (layer.childElementCount !== kids.length) {
      layer.innerHTML = ''
      kids.forEach(() => {
        const m = document.createElement('span')
        m.className = 'mirror'
        const bubble = document.createElement('span')
        bubble.className = 'bubble'
        const badgeEl = document.createElement('span')
        badgeEl.className = 'mini-badge'
        m.append(bubble, badgeEl)
        layer.appendChild(m)
      })
    }
    const items = this.mirrorItems()
    kids.forEach((kid, i) => {
      const m = items[i]
      if (!m) return
      const bubble = m.querySelector<HTMLElement>('.bubble')
      if (bubble) {
        bubble.textContent = kid.getAttribute('label') ?? ''
        bubble.hidden = bubble.textContent === ''
      }
      const badgeEl = m.querySelector<HTMLElement>('.mini-badge')
      if (badgeEl) {
        const raw = kid.getAttribute('badge')
        if (raw == null) {
          badgeEl.hidden = true
        } else {
          badgeEl.hidden = false
          const { text, dot } = formatBadgeValue(raw)
          badgeEl.textContent = text
          badgeEl.classList.toggle('dot', dot)
        }
      }
    })
    this.ensureChildBindings(kids)
  }

  /** 已绑过交互监听的子钮集合（WeakSet，元素移除后自动可回收；幂等防重复绑定） */
  private boundActions = new WeakSet<Element>()

  /**
   * group 子钮交互监听（逐钮直绑）：点击收起组 / 方向键导航 / hover·focus 点亮对应气泡。
   * 不走 shadow 侧事件委托——light DOM 子钮事件沿 slot 冒泡进 shadow 树在部分环境不可靠，
   * 直绑在真实浏览器与测试环境行为一致。
   */
  private ensureChildBindings(kids: HTMLElement[]): void {
    kids.forEach((kid) => {
      if (this.boundActions.has(kid)) return
      this.boundActions.add(kid)
      kid.addEventListener('mouseenter', () => this.showBubbleAt(this.slottedActions().indexOf(kid)))
      kid.addEventListener('mouseleave', this.hideBubbles)
      kid.addEventListener('focusin', () => this.showBubbleAt(this.slottedActions().indexOf(kid)))
      kid.addEventListener('focusout', this.hideBubbles)
      kid.addEventListener('click', this.handleActionClick)
      kid.addEventListener('keydown', this.handleActionsKeydown)
    })
  }

  private showBubbleAt = (idx: number): void => {
    this.mirrorItems().forEach((m, i) => m.classList.toggle('bubble-on', i === idx))
  }

  private hideBubbles = (): void => {
    this.mirrorItems().forEach((m) => m.classList.remove('bubble-on'))
  }

  /** 组语义：点击任一子钮即收起组（子钮自身行为归宿主，组件只负责收起）；焦点归还主钮（APG 惯例） */
  private handleActionClick = (): void => {
    if (this.validMode() === 'group' && this.hasAttr('expanded')) {
      this.closeExpand()
      // 子钮随面板隐藏会失焦落到 body——回焦主钮保持键盘流连续
      this.btn?.focus()
    }
  }

  // ---------- 动作项（actions JSON：group 自渲染子钮 / menu 渲染菜单项共用） ----------

  /** actions JSON 解析（group/menu 共用）：label 为 string 的项保留；解析后按模式分发渲染 */
  private parseActions(): void {
    try {
      const parsed = JSON.parse(this.getAttr('actions', '[]'))
      this.actionsList = Array.isArray(parsed)
        ? parsed.filter((a): a is FloatButtonAction => !!a && typeof a.label === 'string')
        : []
    } catch {
      this.actionsList = []
    }
    if (this.validMode() === 'menu') this.renderMenuItems()
    else if (this.validMode() === 'group') this.renderGroupActions()
  }

  /** 重建动作项期间的焦点保持：记录当前焦点项下标 → 重建 → 恢复到同位新项（越界/无焦点时不动）。
      重建会销毁聚焦中的旧项把焦点跌落到 body（slotchange/actions 变更触发的重建），键盘流断裂 */
  private rebuildWithFocusRestore(rebuild: () => void): void {
    const restoreIndex = this.actionFocusables().findIndex((x) => x === this.shadow.activeElement)
    rebuild()
    if (restoreIndex >= 0) this.actionFocusables()[restoreIndex]?.focus()
  }

  private renderMenuItems(): void {
    const menu = this.menu
    if (!menu) return
    this.rebuildWithFocusRestore(() => {
      menu.innerHTML = ''
      this.actionsList.forEach((action, index) => {
        const item: HTMLAnchorElement | HTMLButtonElement =
          action.href != null && action.href !== ''
            ? Object.assign(document.createElement('a'), {
                href: action.href,
                ...(action.target ? { target: action.target } : {}),
              })
            : Object.assign(document.createElement('button'), { type: 'button' })
        item.className = 'item'
        item.setAttribute('part', 'item')
        item.setAttribute('role', 'menuitem')
        if (action.icon) {
          const ic = this.createIcon(action.icon)
          if (ic) item.appendChild(ic)
        }
        const label = document.createElement('span')
        label.className = 'item-label'
        label.textContent = action.label
        item.appendChild(label)
        if (action.badge != null && action.badge !== '') {
          const { text, dot } = formatBadgeValue(action.badge)
          const badgeEl = document.createElement('span')
          badgeEl.className = dot ? 'mini-badge dot' : 'mini-badge'
          badgeEl.textContent = text
          item.appendChild(badgeEl)
        }
        item.addEventListener('click', () => this.selectItem(index, action))
        menu.appendChild(item)
      })
    })
  }

  /**
   * group 子钮 actions 渲染通道（数据驱动，标准圆形子钮）：
   * 有合法非空 actions 时在 .actions 容器内自渲染圆形子钮（shadow 内，宿主页 CSS 无法穿透覆盖），
   * 复用 menu 的动作项契约与 selectItem 语义（oas-select + 收起回焦）；气泡 hover/focus 纯 CSS 显隐。
   * 无 actions 时保持既有 slot 通道（宿主自填自定义子钮）；两者同时提供时以 actions 为准（CSS 隐藏 slot 投影）。
   */
  private renderGroupActions(): void {
    const layer = this.actionsEl
    if (!layer) return
    if (this.actionsList.length > 0) {
      this.setAttribute('data-action-rendered', '')
      if (this.slottedActions().length > 0) {
        this.warnOnce('group 模式 actions 与 slot 子钮是二选一的通道，同时提供时以 actions 为准，slot 投影子钮已隐藏')
      }
    } else {
      this.removeAttribute('data-action-rendered')
      return
    }
    this.rebuildWithFocusRestore(() => {
      layer.querySelectorAll('.action-btn').forEach((n) => n.remove())
      this.actionsList.forEach((action, index) => {
        const item: HTMLAnchorElement | HTMLButtonElement =
          action.href != null && action.href !== ''
            ? Object.assign(document.createElement('a'), {
                href: action.href,
                ...(action.target ? { target: action.target } : {}),
                rel: 'noopener noreferrer',
              })
            : Object.assign(document.createElement('button'), { type: 'button' })
        item.className = 'action-btn'
        item.setAttribute('part', 'action-btn')
        item.setAttribute('aria-label', action.label)
        if (action.icon) {
          const ic = this.createIcon(action.icon)
          if (ic) item.appendChild(ic)
        }
        // 气泡：hover / 键盘聚焦时经纯 CSS 显示（文本 = label）
        const bubble = document.createElement('span')
        bubble.className = 'bubble'
        bubble.textContent = action.label
        item.appendChild(bubble)
        if (action.badge != null && action.badge !== '') {
          const { text, dot } = formatBadgeValue(action.badge)
          const badgeEl = document.createElement('span')
          badgeEl.className = dot ? 'mini-badge dot' : 'mini-badge'
          badgeEl.textContent = text
          item.appendChild(badgeEl)
        }
        item.addEventListener('click', () => this.selectItem(index, action))
        layer.appendChild(item)
      })
    })
  }

  /** 一次性 dev 告警（每实例一次，update 反复触发不刷屏） */
  private warnOnce(message: string): void {
    if (this.warned) return
    this.warned = true
    devWarn(`[oas-float-button] ${message}`)
  }

  /** 菜单项选择：派发 oas-select（链接项附 href）并收起；焦点归还主钮（APG menu 惯例） */
  private selectItem(index: number, action: FloatButtonAction): void {
    const detail: { index: number; label: string; href?: string } = { index, label: action.label }
    if (action.href) detail.href = action.href
    this.emit('select', detail)
    this.closeExpand()
    // 菜单项随面板隐藏会失焦落到 body——回焦主钮保持键盘流连续（链接项由浏览器接管导航，focus 无副作用）
    if (!action.href) this.btn?.focus()
  }

  /** 查表渲染图标（内联 SVG，跟随 currentColor） */
  private createIcon(icon: string): HTMLElement | null {
    const content = lookupIcon(icon)
    if (!content) return null
    const span = document.createElement('span')
    span.className = 'icon'
    span.setAttribute('aria-hidden', 'true')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('width', '1em')
    svg.setAttribute('height', '1em')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.innerHTML = content
    span.appendChild(svg)
    return span
  }

  // ---------- 展开/收起（group/menu 受控） ----------

  /** 键盘可达集合：menu 菜单项 / group 子钮（actions 渲染通道优先，回退 slot 子钮） */
  private actionFocusables(): HTMLElement[] {
    if (this.validMode() === 'menu') {
      return [...(this.menu?.querySelectorAll<HTMLElement>('.item') ?? [])]
    }
    if (this.actionsList.length > 0) {
      return [...(this.actionsEl?.querySelectorAll<HTMLElement>('.action-btn') ?? [])]
    }
    return this.slottedActions()
  }

  private syncExpanded(): void {
    const mode = this.validMode()
    if (mode === 'single') return
    const open = this.hasAttr('expanded')
    this.group?.classList.toggle('open', open)
    this.menu?.classList.toggle('open', open)
    this.btn?.setAttribute('aria-expanded', String(open))
    this.btn?.setAttribute('aria-haspopup', mode === 'menu' ? 'menu' : 'true')
    if (open) {
      // 展开时挂载文档级监听（收起/断开连接时移除，无孤儿监听）
      document.addEventListener('click', this.handleDocClick, true)
      document.addEventListener('keydown', this.handleDocKeydown)
      // 键盘可达：仅在「收起 → 展开」的状态迁移帧自动聚焦首个动作（hover 触发展开不抢焦点）。
      // 用字段而非 classList 判定迁移：模板会按 expanded 预渲染 open 类，首次同步时类已在
      // 展开态下的其他属性变化/子钮增减不重复抢焦（否则会把用户焦点强行拉回首项）
      if (!this.wasExpanded && !this.skipFocusOnOpen) this.actionFocusables()[0]?.focus()
    } else {
      document.removeEventListener('click', this.handleDocClick, true)
      document.removeEventListener('keydown', this.handleDocKeydown)
    }
    this.wasExpanded = open
    this.skipFocusOnOpen = false
  }

  private openExpand(): void {
    if (this.hasAttr('expanded')) return
    this.setAttribute('expanded', '')
    this.emit('expand-change', { expanded: true })
  }

  private closeExpand(): void {
    if (!this.hasAttr('expanded')) return
    this.removeAttribute('expanded')
    this.emit('expand-change', { expanded: false })
  }

  private toggleExpand(): void {
    if (this.hasAttr('expanded')) this.closeExpand()
    else this.openExpand()
  }

  private handleDocClick = (e: MouseEvent): void => {
    if (!this.hasAttr('expanded')) return
    // manual：完全受控——外点不自动收起，收起由宿主经 expanded 属性全权驱动
    if (this.validTrigger() === 'manual') return
    if (e.composedPath().includes(this)) return
    this.closeExpand()
  }

  private handleDocKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return
    if (!this.hasAttr('expanded')) return
    // manual：收起由宿主驱动，Esc 不自动收起
    if (this.validTrigger() === 'manual') return
    this.closeExpand()
    this.btn?.focus()
  }

  // ---------- hover 触发 ----------

  /** trigger 是否启用 hover 行为：trigger="hover" 且非触屏（coarse 回落 click）且非禁用 */
  private isHoverTrigger(): boolean {
    if (this.validTrigger() !== 'hover') return false
    if (this.injectDisabled()) return false
    if (this.validMode() === 'single') return false
    return !this.isCoarsePointer()
  }

  /** 触屏检测（pointer: coarse）：触屏下 hover 行为不可靠，自动回落 click */
  private isCoarsePointer(): boolean {
    if (typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(pointer: coarse)').matches
  }

  /** 生效触发方式：trigger="hover" 在触屏下解析为 click（回落），其余原样 */
  private resolvedTrigger(): string {
    if (this.validTrigger() === 'hover' && this.isCoarsePointer()) return 'click'
    return this.validTrigger()
  }

  /** 指针/焦点移到的目标是否仍在「宿主 + 面板」区域内（跨 shadow 时 relatedTarget 已 retarget 到 shadow host） */
  private hoverTargetInside(rel: EventTarget | null): boolean {
    return !!rel && rel instanceof Node && (this.contains(rel) || this.shadow.contains(rel))
  }

  private onHoverEnter = (): void => {
    if (!this.isHoverTrigger()) return
    this.clearHoverHide()
    this.skipFocusOnOpen = true
    this.openExpand()
  }

  private onHoverLeave = (e: MouseEvent): void => {
    if (!this.isHoverTrigger()) return
    // 移到面板（shadow 内）不算离开：悬停区域 = 宿主 + 面板
    if (this.hoverTargetInside(e.relatedTarget)) return
    this.clearHoverHide()
    this.hoverHideTimer = setTimeout(() => this.closeExpand(), HOVER_LEAVE_GRACE)
  }

  private onPanelEnter = (): void => {
    if (!this.isHoverTrigger()) return
    this.clearHoverHide()
  }

  private onPanelLeave = (e: MouseEvent): void => {
    if (!this.isHoverTrigger()) return
    if (this.hoverTargetInside(e.relatedTarget)) return
    this.clearHoverHide()
    this.hoverHideTimer = setTimeout(() => this.closeExpand(), HOVER_LEAVE_GRACE)
  }

  private clearHoverHide(): void {
    if (this.hoverHideTimer) {
      clearTimeout(this.hoverHideTimer)
      this.hoverHideTimer = null
    }
  }

  // ---------- 方向键导航（group 子钮 / menu 菜单项共用） ----------

  private handleActionsKeydown = (e: KeyboardEvent): void => {
    if (!this.hasAttr('expanded')) return
    const items = this.actionFocusables()
    if (items.length === 0) return
    // 方向键轴与有效展开方向对齐：纵向用 ArrowUp/Down，横向用 ArrowLeft/Right
    //（横向键随书写方向镜像：RTL 下 ArrowLeft = 朝书写终点 = next）
    const eff = this.effectiveDirection()
    const vertical = eff === 'up' || eff === 'down'
    const rtl = isRtl(this)
    const nextKey = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight'
    const prevKey = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft'
    // 焦点可能在 light DOM 子钮（group）或 shadow 菜单项（menu）：两路都查
    const current = this.shadow.activeElement ?? document.activeElement
    let idx = items.indexOf(current as HTMLElement)
    if (e.key === nextKey) {
      e.preventDefault()
      idx = (idx + 1) % items.length
    } else if (e.key === prevKey) {
      e.preventDefault()
      idx = (idx - 1 + items.length) % items.length
    } else if (e.key === 'Home') {
      e.preventDefault()
      idx = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      idx = items.length - 1
    } else {
      return
    }
    items[idx]?.focus()
  }

  // ---------- draggable 拖拽（pointer 捕获 + 自由定位 + 磁吸） ----------

  /** 是否减少动效：reduced-motion 下磁吸过渡停用（位置直切） */
  private prefersReducedMotion(): boolean {
    if (typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /**
   * 拖拽/磁吸坐标系：absolute 定位元素用 offsetParent 包含块（padding box 原点 + 内部尺寸），
   * 其余定位（fixed/relative/static）沿用视口坐标系——fixed 是组件的默认悬浮语义。
   * 拖拽以「指针视口位移 + 元素在所属坐标系中的起点」写 left/top，坐标系必须与定位方式一致，
   * 否则视口坐标被当作相对坐标写入 → 按钮按包含块页面偏移量错位（用户实报的「飘很远」）。
   */
  private dragFrame(): { left: number; top: number; width: number; height: number } {
    if (getComputedStyle(this).position === 'absolute') {
      const parent = this.offsetParent as HTMLElement | null
      if (parent && parent !== document.body) {
        const r = parent.getBoundingClientRect()
        return {
          left: r.left + parent.clientLeft,
          top: r.top + parent.clientTop,
          width: parent.clientWidth,
          height: parent.clientHeight,
        }
      }
    }
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
  }

  private handlePointerDown = (e: PointerEvent): void => {
    // 非 draggable 零行为变化；禁用态不可拖；仅主键（左键/触屏）
    if (!this.hasAttr('draggable')) return
    if (this.injectDisabled()) return
    if (e.button !== 0) return
    // 新会话先复位抑制标记（上一次拖拽若被 pointercancel 中断可能残留）
    this.suppressClick = false
    const rect = this.getBoundingClientRect()
    const frame = this.dragFrame()
    this.dragState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left - frame.left,
      startTop: rect.top - frame.top,
      maxX: Math.max(0, frame.width - this.offsetWidth),
      maxY: Math.max(0, frame.height - this.offsetHeight),
      moved: false,
    }
    this.classList.add('dragging')
    // 拖拽中禁止过渡（跟手）；磁吸过渡只作用于松手动画
    this.style.transition = 'none'
    try {
      this.btn?.setPointerCapture(e.pointerId)
    } catch {
      // 环境不支持指针捕获：退化为移动/释放监听跟踪（无捕获也能完成拖拽）
    }
  }

  private handlePointerMove = (e: PointerEvent): void => {
    const d = this.dragState
    if (!d || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    // 阈值内视为点击（不移动）；超过阈值进入拖拽
    if (!d.moved && Math.abs(dx) <= DRAG_THRESHOLD && Math.abs(dy) <= DRAG_THRESHOLD) return
    d.moved = true
    // 边界夹取：在所属坐标系内回夹（fixed→视口、absolute→包含块），拖出边界不滑出
    const left = Math.min(Math.max(0, d.startLeft + dx), d.maxX)
    const top = Math.min(Math.max(0, d.startTop + dy), d.maxY)
    // 位置写入 host 内联 left/top（与定位方式同坐标系）；right/bottom 必须显式设 auto：
    // 仅清空内联会回落到 :host 规则里的 right/bottom（CSS 变量开口），absolute 下 left+right
    // 同时生效会把自身宽度拉伸（width:auto shrink-to-fit 失效），磁吸/夹取随之错乱。
    this.style.left = `${left}px`
    this.style.top = `${top}px`
    this.style.right = 'auto'
    this.style.bottom = 'auto'
  }

  private handlePointerUp = (e: PointerEvent): void => {
    const d = this.dragState
    if (!d || e.pointerId !== d.pointerId) return
    if (d.moved) {
      // 超阈值是拖拽：抑制随后的合成 click（不派发 oas-click），并尝试磁吸
      this.suppressClick = true
      this.applyMagnetic()
    }
    this.endDrag(e.pointerId)
  }

  private handlePointerCancel = (e: PointerEvent): void => {
    const d = this.dragState
    if (!d || e.pointerId !== d.pointerId) return
    this.endDrag(e.pointerId)
  }

  private endDrag(pointerId: number): void {
    if (!this.dragState || this.dragState.pointerId !== pointerId) return
    try {
      this.btn?.releasePointerCapture(pointerId)
    } catch {
      // 指针已失效：忽略释放失败
    }
    this.dragState = null
    this.classList.remove('dragging')
  }

  /**
   * magnetic 磁吸：松手时吸附到最近的对应轴边缘（x=左右边缘贴齐，y=上下边缘贴齐）。
   * 吸附动画：恢复 left/top 过渡（拖拽中已被 pointerdown 置 none）；reduced-motion 下直切。
   */
  private applyMagnetic(): void {
    const axis = this.getAttr('magnetic', '')
    if (axis !== 'x' && axis !== 'y') return
    // 吸附边缘同样是坐标系相关：fixed 吸视口、absolute 吸包含块（与拖拽同源 frame）
    const frame = this.dragFrame()
    const left = parseFloat(this.style.left) || 0
    const top = parseFloat(this.style.top) || 0
    const maxX = Math.max(0, frame.width - this.offsetWidth)
    const maxY = Math.max(0, frame.height - this.offsetHeight)
    const reduced = this.prefersReducedMotion()
    if (axis === 'x') {
      const distLeft = left
      const distRight = maxX - left
      const target = distLeft <= distRight ? 0 : maxX
      if (Math.abs(target - left) > 0.5) {
        this.style.transition = reduced ? 'none' : `left var(--oas-transition-base) var(--oas-ease-out)`
        this.style.left = `${target}px`
      }
    } else {
      const distTop = top
      const distBottom = maxY - top
      const target = distTop <= distBottom ? 0 : maxY
      if (Math.abs(target - top) > 0.5) {
        this.style.transition = reduced ? 'none' : `top var(--oas-transition-base) var(--oas-ease-out)`
        this.style.top = `${target}px`
      }
    }
  }

  /** 真水合：校验 SSR 快照结构（按钮存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.btn')) return false
    this.bind()
    return true
  }

  /** href/target/disabled/mode 变化会改变内部元素结构（button ↔ a ↔ span / 模式重建），需重建 shadow；其余属性走 update() */
  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    const affectsTag =
      name === 'href' ||
      name === 'target' ||
      name === 'mode' ||
      (name === 'disabled' && this.getAttr('href', '') !== '')
    if (affectsTag && this.hasRendered) {
      this.shadow.innerHTML = this.template()
      this.bind()
      this.update()
      return
    }
    super.attributeChangedCallback(name, oldValue, newValue)
  }

  protected override update(): void {
    const btnEl = this.btn
    if (!btnEl) return
    // RTL 逻辑方向化钩子：badge 走逻辑 inset 自动镜像；悬浮定位为显式物理 API 保留
    this.toggleAttribute('data-rtl', isRtl(this))
    const mode = this.validMode()
    const shape = this.getAttr('shape', 'circle')
    const type = this.getAttr('type', 'primary')
    const sizeRaw = this.getAttr('size', 'large')
    const { value: size, isValid: sizeValid } = normalizeSizeStrict(sizeRaw, ALL_SIZES, 'large')
    if (!sizeValid) warnInvalidSize(sizeRaw)
    const disabled = this.injectDisabled()
    const hasText = this.hasText()

    // 几何/尺寸走 host data-*（CSS 变量映射），视觉变体走 btn 类名
    this.setAttribute('data-mode', mode)
    this.setAttribute('data-shape', shape)
    this.setAttribute('data-size', size)
    btnEl.className = ['btn', type, hasText ? 'extended' : ''].filter(Boolean).join(' ')

    // disabled 同步：button 用原生 disabled；href 禁用的 span / 非禁用 a 走 aria-disabled
    if (btnEl.tagName === 'BUTTON') {
      ;(btnEl as HTMLButtonElement).disabled = disabled
      if (disabled) btnEl.setAttribute('aria-disabled', 'true')
      else btnEl.removeAttribute('aria-disabled')
    } else if (btnEl.tagName === 'SPAN') {
      btnEl.setAttribute('aria-disabled', 'true')
    } else {
      btnEl.removeAttribute('aria-disabled')
    }

    const label = this.shadow.querySelector<HTMLElement>('[part="label"]')
    if (label) label.hidden = !hasText

    // 主钮徽标：dot 状态点 / 数字封顶 / 原样文本
    const badge = this.shadow.querySelector<HTMLElement>('[part="badge"]')
    if (badge) {
      const { text, dot } = formatBadgeValue(this.getAttr('badge', ''))
      badge.textContent = text
      badge.classList.toggle('dot', dot)
    }

    // aria-label：宿主显式标签优先；纯图标（无可见文字）用 locale 文案兜底；有扩展文字时让位给可见文本
    const hostLabel = this.getAttribute('aria-label')
    if (hostLabel) btnEl.setAttribute('aria-label', hostLabel)
    else if (hasText) btnEl.removeAttribute('aria-label')
    else btnEl.setAttribute('aria-label', this.t('floatButton.action'))

    // draggable：touch-action none 禁止触摸手势滚动干扰拖拽（非 draggable 恢复，零回归）
    this.style.touchAction = this.hasAttr('draggable') ? 'none' : ''

    // 模式态同步：方向（含 RTL 镜像与 menu 纵向约束）→ 子钮/mirror/菜单项 → 展开态
    if (mode === 'group') {
      this.group?.setAttribute('data-dir', this.effectiveDirection())
      this.parseActions() // actions 解析 + 自渲染子钮（空/非法时回退 slot 路径，见 renderGroupActions）
      this.syncMirrors()
    }
    if (mode === 'menu') {
      this.menu?.setAttribute('data-dir', this.effectiveDirection())
      this.menu?.setAttribute('aria-label', this.t('floatButton.action'))
      this.parseActions()
    }
    this.syncExpanded()
  }
}
