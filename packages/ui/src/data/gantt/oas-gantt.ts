import { OASElement } from '@oas-ui/core'
import { parseJsonArray } from '../../shared/json-array.js'
import {
  formatToken,
  getWeekStart,
  isoWeek,
  parseISODate,
  resolveLocale,
  startOfDay,
  toISODate,
} from '../../form/calendar/date-grid.js'
import { computeVirtualWindow } from '../virtual-list/oas-virtual-list.js'
// 服务端行窗口协议（windowed 模式）：与宿主交换行区间/时间范围的共享契约（类型 + 纯工具），
// 与 oas-table 同源同语义；emit 用字面量 'window-request' / 'range-request'（api:scan 解析锚点）
import {
  expandWindow,
  parseIsoDayMs,
  rangeCovered,
  readWindowedMode,
  sameWindow,
  windowCovered,
  WINDOW_MARGIN,
  ROW_WINDOW_EVENT,
  RANGE_WINDOW_EVENT,
  type RangeRequestDetail,
  type WindowRequestDetail,
  type WindowRequestReason,
} from '../../shared/window-data.js'
import { isRtl } from '../../shared/direction.js'
import { devWarn } from '../../shared/dev-warn.js'

/** 编译期一致性：emit 用的字面量（拼 `oas-` 前缀）须与共享契约常量一致 */
const _ROW_WINDOW_EVENT_CHECK: typeof ROW_WINDOW_EVENT = 'oas-window-request'
const _RANGE_WINDOW_EVENT_CHECK: typeof RANGE_WINDOW_EVENT = 'oas-range-request'
void _ROW_WINDOW_EVENT_CHECK
void _RANGE_WINDOW_EVENT_CHECK

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  min-width: 0;
}
:host([hidden]) {
  display: none;
}
.gantt {
  display: flex;
  align-items: stretch;
  /* height 属性由 update() 映射为宿主自定义属性 --oas-gantt-height（写宿主自定义属性而非 height 内联，
     组件从不触碰宿主 height 内联）。高度挂在**内部画布（.gantt）**上：宿主自身 height 内联只框定外盒，
     内部画布高度仍由本规则（token / height 属性）决定，不会被宿主内联 height 拉伸；整体调高请改用
     height 属性或 --oas-gantt-height */
  height: var(--oas-gantt-height, 320px);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  overflow: hidden;
  position: relative;
  font-size: var(--oas-font-size-sm);
}
.side {
  width: var(--oas-gantt-list-width, 220px);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-inline-end: 1px solid var(--oas-color-border);
  background: var(--oas-gantt-header-bg, var(--oas-color-bg));
}
.side-head {
  height: var(--oas-gantt-header-height, 44px);
  flex-shrink: 0;
  border-bottom: 1px solid var(--oas-gantt-grid-line-color, var(--oas-color-border));
}
.side-body {
  flex: 1;
  overflow: hidden;
  position: relative;
  /* 左侧列表不可原生滚动 → 触屏上纵向拖用于行带框选（不交浏览器手势） */
  touch-action: none;
}
.side-inner {
  position: relative;
  height: 100%;
}
.row-name {
  position: absolute;
  inset-inline-start: 0;
  width: 100%;
  height: var(--oas-gantt-row-height, 36px);
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding-inline-start: var(--indent, 8px);
  padding-inline-end: var(--oas-space-2);
  box-sizing: border-box;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--oas-color-text-primary);
  cursor: grab;
  user-select: none;
}
:host([readonly]) .row-name {
  cursor: default;
}
.row-name[disabled] {
  cursor: default;
}
/* 斑马纹行名（stripe 属性 + 绝对行号奇数）：与时间轴条纹同 token 同奇偶口径；
   定义在选中底色规则之前（同特异性后者胜）→ 选中覆盖斑马纹 */
.row-name[data-stripe] {
  background: var(--oas-gantt-row-stripe-bg, var(--oas-color-bg-hover));
}
.row-name.selected {
  background: color-mix(in srgb, var(--oas-color-primary) 18%, transparent);
  box-shadow: inset 2px 0 0 var(--oas-color-primary);
}
/* RTL 下高亮条镜像到 inline-start（右缘） */
:host([data-rtl]) .row-name.selected {
  box-shadow: inset -2px 0 0 var(--oas-color-primary);
}
/* 关键路径行名（show-critical-path）：文本强调色；不改选中态背景/描边 */
.row-name.critical {
  color: var(--oas-gantt-critical-color, var(--oas-color-danger));
}
/* 违约行名（总时差为负 = 已违反后继约束）：虚线强调色 */
.row-name.conflict {
  color: var(--oas-gantt-conflict-color, var(--oas-color-danger));
  text-decoration: underline dashed;
}
/* 行重排手柄：任务名可选中后，拖拽改由右侧手柄承载；
   粗指针下常显（整行拖与纵向滚动冲突），细指针下悬停/聚焦时显形 */
.row-drag {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  touch-action: none;
  cursor: grab;
  color: var(--oas-color-text-secondary);
  padding-inline: 2px;
  min-width: 24px;
  min-height: 24px;
  letter-spacing: -3px;
  opacity: 0;
  pointer-events: none;
}
@media (pointer: coarse) {
  .row-drag {
    opacity: 1;
    pointer-events: auto;
  }
}
@media (pointer: fine) {
  .row-name:hover .row-drag,
  .row-name:focus-within .row-drag {
    opacity: 1;
    pointer-events: auto;
  }
}
.row-name:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
/* 行内新建「＋」：默认不渲染（仅 creatable 且非只读/非禁用行）；写入 DOM 的按钮靠 :host([creatable]) 显示 */
.row-add {
  display: none;
}
:host([creatable]) .row-add {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  padding-inline: 2px;
  background: transparent;
  border: 0;
  border-radius: var(--oas-radius-xs);
  color: var(--oas-color-text-secondary);
  font: inherit;
  font-size: var(--oas-font-size-xs);
  line-height: 1;
  cursor: pointer;
}
:host([creatable]) .row-add:hover {
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
}
:host([creatable]) .row-add:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
.rename-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 22px;
  font: inherit;
  color: inherit;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-primary);
  border-radius: var(--oas-radius-sm);
  padding: 0 var(--oas-space-1);
  outline: none;
}
/* 关键路径条（show-critical-path）：描边强调；置于选中态描边规则之前，选中态优先级更高 */
.bar.critical {
  outline: 2px solid var(--oas-gantt-critical-color, var(--oas-color-danger));
  outline-offset: 1px;
}
/* 违约条（总时差为负）：虚线描边与关键路径区分 */
.bar.conflict {
  outline: 2px dashed var(--oas-gantt-conflict-color, var(--oas-color-danger));
  outline-offset: 1px;
}
.bar.selected {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 1px;
}
svg.links .link-hit:focus-visible {
  outline: 2px solid var(--oas-color-primary);
}
/* SVG path 的 outline 在部分引擎不渲染 → 命中的可见线同时加粗高亮作焦点指示 */
svg.links .link-hit:focus-visible + .link {
  stroke: var(--oas-color-primary);
  stroke-width: 2.5;
}
@media (pointer: coarse) {
  .bar.touch-active .link-dot {
    opacity: 1;
    pointer-events: auto;
  }
}
.drop-line {
  position: absolute;
  inset-inline-start: 0;
  inset-inline-end: 8px;
  height: 2px;
  background: var(--oas-color-primary);
  border-radius: var(--oas-radius-full, 999px);
  pointer-events: none;
  z-index: 5;
}
.drop-line[data-mode='inside'] {
  background: color-mix(in srgb, var(--oas-color-primary) 14%, transparent);
  border: 1px solid var(--oas-color-primary);
  box-sizing: border-box;
}
/* 空白拖拽覆盖层：框选多任务（B）与拖拽建任务预览（C）共用；纯装饰、不拦指针 */
.marquee {
  position: absolute;
  pointer-events: none;
  box-sizing: border-box;
  border: 1px solid var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
  border-radius: var(--oas-radius-xs);
  z-index: 6;
}
.row-name .name {
  /* flex 子项默认 min-width:auto 不收缩，父级 text-overflow 对 flex 项不生效——
     长任务名会硬裁无省略号；显式 min-width:0 + 自身 ellipsis 才能出「…」 */
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* 任务名是数据文本：允许选中复制；行拖拽改由右侧手柄承载 */
  user-select: text;
}
.toggle {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--oas-color-text-secondary-strong);
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: var(--oas-radius-xs);
  padding: 0;
  font-size: var(--oas-font-size-xs);
  line-height: 1;
}
.toggle:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-primary);
}
.toggle:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.thead {
  height: var(--oas-gantt-header-height, 44px);
  flex-shrink: 0;
  overflow: hidden;
  border-bottom: 1px solid var(--oas-gantt-grid-line-color, var(--oas-color-border));
  background: var(--oas-gantt-header-bg, var(--oas-color-bg));
  position: relative;
}
.head-major,
.head-minor {
  position: relative;
  height: 50%;
}
.head-minor {
  border-top: 1px solid var(--oas-gantt-grid-line-color, var(--oas-color-border));
}
.head-major .unit,
.head-minor .unit {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--oas-color-text-secondary-strong);
  font-size: var(--oas-font-size-xs);
  white-space: nowrap;
  overflow: hidden;
  box-sizing: border-box;
}
.head-major .unit {
  /* 主刻度合并格可能远宽于视口（如 day 档下 31 天的月格）：标签必须靠 inline-start 对齐，
     居中会把标签推到视口外——窄容器下整月无可见标签（实测 2026-01 标签落在 x≈1250 处）。 */
  justify-content: flex-start;
  padding-inline-start: var(--oas-space-2);
}
.head-minor .unit {
  border-inline-start: 1px solid var(--oas-gantt-grid-line-color, var(--oas-color-border));
}
/* 轴首格（全局第 0 列）不画左缘线；窗口切片后首个渲染格可能是轴中段，按类名而非 :first-child 判定 */
.head-minor .unit.axis-start {
  border-inline-start: none;
}
.tbody {
  flex: 1;
  overflow: auto;
  position: relative;
  overscroll-behavior: contain;
  /* 窗口滚动期重建 DOM 会触发 Chrome 滚动锚定，把滚轮增量逐帧放大成加速循环（同 oas-virtual-list .viewport） */
  overflow-anchor: none;
}
.inner {
  position: relative;
}
/* 行斑马纹容器（stripe 属性，opt-in，懒创建）：绝对行号奇数行整行底色。
   纯装饰且不拦指针（条拖拽/框选/连线命中不受影响）；DOM 序插在 .grid-canvas 之前
   （同为 absolute 无 z-index → 先者先绘）→ 周末/假日格画在条纹之上，条纹只透出工作日部分 */
.stripe-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.stripe-canvas .stripe {
  position: absolute;
  inset-inline-start: 0;
  background: var(--oas-gantt-row-stripe-bg, var(--oas-color-bg-hover));
  pointer-events: none;
}
.grid-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.grid-canvas .cell {
  position: absolute;
  top: 0;
  background: var(--oas-gantt-weekend-bg, color-mix(in srgb, var(--oas-color-bg-hover) 60%, transparent));
}
.grid-canvas .cell.holiday {
  background: var(--oas-gantt-holiday-bg, color-mix(in srgb, var(--oas-color-warning) 12%, transparent));
}
svg.links {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}
svg.links path {
  fill: none;
  stroke: var(--oas-gantt-link-color, var(--oas-color-primary));
  stroke-width: 1.5;
}
svg.links marker path {
  fill: var(--oas-gantt-link-color, var(--oas-color-primary));
  stroke: none;
}
svg.links .link {
  pointer-events: none;
}
svg.links .link-hit {
  pointer-events: stroke;
  stroke: transparent;
  stroke-width: 12;
  cursor: pointer;
}
svg.links .link-hit.selected + .link {
  stroke: var(--oas-color-danger);
  stroke-width: 2.5;
}
/* 依赖 lag/lead 可见标签（非 0 时渲染在连线竖段中点） */
svg.links .link-label {
  fill: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs, 11px);
  pointer-events: none;
  /* 底色描边：叠在连线/任务条上仍清晰可读（paint-order 先描边后填充） */
  paint-order: stroke;
  stroke: var(--oas-color-bg);
  stroke-width: 2px;
}
svg.links .temp-link {
  pointer-events: none;
  stroke: var(--oas-gantt-link-color, var(--oas-color-primary));
  stroke-width: 1.5;
  stroke-dasharray: 4 3;
}
.link-dot {
  position: absolute;
  top: -6px;
  width: 10px;
  height: 10px;
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-color-bg);
  border: 2px solid var(--oas-gantt-link-color, var(--oas-color-primary));
  box-sizing: border-box;
  opacity: 0;
  pointer-events: none;
  cursor: crosshair;
  touch-action: none;
  transition: opacity 0.12s;
  z-index: 2;
}
.bar:hover .link-dot,
.bar:focus-within .link-dot {
  opacity: 1;
  pointer-events: auto;
}
.link-dot.link-start {
  inset-inline-start: -6px;
}
.link-dot.link-end {
  inset-inline-end: -6px;
}
.bars {
  position: absolute;
  inset: 0;
  /* 整层放行命中：否则盖住下方 svg.links 里的 .link-hit，连线点选不可达（条/基线/连线点各自 auto） */
  pointer-events: none;
}
.bar {
  position: absolute;
  pointer-events: auto;
  height: var(--oas-gantt-bar-height, 22px);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-gantt-bar-bg, color-mix(in srgb, var(--oas-gantt-bar-color, var(--oas-color-primary)) 22%, var(--oas-color-bg)));
  cursor: grab;
  box-sizing: border-box;
  overflow: visible;
  /* 短任务在粗档（1 天 vs month/quarter）下宽度趋近 0 不可见/不可点 → 视觉下限保底（数据不变） */
  min-width: 8px;
  /* 触屏纵向滚动优先；横向拖拽由条自身处理（拖拽中浏览器判定为滚动则触发 pointercancel） */
  touch-action: pan-y;
  user-select: none;
}
.baseline {
  position: absolute;
  height: 4px;
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-gantt-baseline-color, color-mix(in srgb, var(--oas-color-text-secondary-strong) 55%, transparent));
  pointer-events: auto;
  min-width: 8px;
  z-index: 0;
}
.bar:active {
  cursor: grabbing;
}
.bar:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 2px;
}
.bar[disabled] {
  cursor: not-allowed;
  opacity: 0.6;
}
.bar-progress {
  position: absolute;
  inset-inline-start: 0;
  top: 0;
  height: 100%;
  border-radius: inherit;
  background: var(--oas-gantt-bar-progress-bg, var(--oas-gantt-bar-color, var(--oas-color-primary)));
  opacity: 0.9;
  pointer-events: none;
}
.bar-label {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  /* 条标签是数据文本：允许选中复制；条拖拽从标签外区域/手柄开始 */
  pointer-events: auto;
  user-select: text;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-xs);
}
.bar.label-inside .bar-label {
  inset-inline-start: 8px;
  max-width: calc(100% - 16px);
  /* 底衬 scrim：条底（半透明色）与进度实色两种情况都保证文字可读；
     底色混入 bg-elevated 提高不透明度（玻璃主题的 bg-elevated 亦非全不透明，故只提高衬底实度），
     文字用 text-on-primary（各主题均为不透明 token，且与 scrim 极性相反） */
  background: color-mix(in srgb, var(--oas-color-text-primary) 62%, var(--oas-color-bg-elevated));
  color: var(--oas-color-text-on-primary);
  padding-inline: var(--oas-space-1);
  border-radius: var(--oas-radius-xs);
}
.bar.label-right .bar-label {
  inset-inline-start: calc(100% + 6px);
}
.bar.label-left .bar-label {
  inset-inline-end: calc(100% + 6px);
}
.handle {
  position: absolute;
  top: 0;
  height: 100%;
  width: 8px;
  cursor: ew-resize;
  /* 手柄是明确的拖拽热区：触摸手势全部交给拖拽，避免滚动打断 */
  touch-action: none;
}
.handle-start {
  inset-inline-start: -4px;
}
.handle-end {
  inset-inline-end: -4px;
}
.progress-handle {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: var(--oas-gantt-bar-progress-bg, var(--oas-gantt-bar-color, var(--oas-color-primary)));
  border: 2px solid var(--oas-color-bg);
  box-shadow: var(--oas-shadow-sm);
  cursor: ew-resize;
  box-sizing: border-box;
  touch-action: none;
}
.bar.milestone {
  background: transparent;
  overflow: visible;
}
.bar.milestone .dia {
  position: absolute;
  top: 50%;
  width: 15px;
  height: 15px;
  transform: translate(-50%, -50%) rotate(45deg);
  background: var(--oas-gantt-milestone-color, var(--oas-color-warning));
  border-radius: 2px;
}
.bar.summary {
  height: 8px;
  background: var(--oas-gantt-summary-bg, var(--oas-color-text-secondary-strong));
  border-radius: var(--oas-radius-xs);
  cursor: default;
}
.bar.summary::before,
.bar.summary::after {
  content: '';
  position: absolute;
  top: 100%;
  width: 0;
  height: 0;
  border-inline: 4px solid transparent;
  border-top: 5px solid var(--oas-gantt-summary-bg, var(--oas-color-text-secondary-strong));
}
.bar.summary::before {
  inset-inline-start: 0;
}
.bar.summary::after {
  inset-inline-end: 0;
}
.today-line {
  position: absolute;
  top: 0;
  width: 2px;
  background: var(--oas-gantt-today-color, var(--oas-color-danger));
  pointer-events: none;
  z-index: 1;
}
.today-line[hidden] {
  display: none !important;
}
.tooltip {
  position: absolute;
  z-index: 7;
  max-width: 280px;
  padding: var(--oas-space-2) var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  box-shadow: var(--oas-shadow-md);
  font-size: var(--oas-font-size-xs);
  pointer-events: none;
}
.tooltip[hidden] {
  display: none !important;
}
.tooltip .tip-name {
  font-weight: 600;
  margin-bottom: 2px;
}
.tooltip .tip-line {
  color: var(--oas-color-text-secondary-strong);
}
.empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--oas-color-text-secondary-strong);
  background: var(--oas-color-bg);
  z-index: 2;
}
.empty[hidden] {
  display: none !important;
}
`

/** 甘特任务（数据契约：扁平 `parent` 指针为主；嵌套 `children` 输入在清洗层自动拍平兼容） */
export interface GanttTask {
  id?: string
  /** 任务名（必填，缺失丢弃） */
  name: string
  /** 开始 'YYYY-MM-DD'（hour 档支持 'YYYY-MM-DD HH:mm'） */
  start: string
  /** 结束；缺省 = 里程碑（单点） */
  end?: string
  /** 类型；缺省推导：有子 = summary、无 end = milestone、其余 task */
  type?: 'task' | 'milestone' | 'summary'
  /** 进度 0-100（越界 clamp；缺省 0） */
  progress?: number
  /** 父任务 id（扁平指针；悬空按根渲染并告警一次） */
  parent?: string
  /** 嵌套子任务（兼容输入通道；清洗层拍平为 parent 指针） */
  children?: GanttTask[]
  /** 依赖（id 指向其他任务；type 缺省 fs） */
  dependencies?: GanttDependency[]
  /**
   * 条色覆盖（走 CSS 变量解析，写入条元素 `--oas-gantt-bar-color`）：只作用于**普通任务条**底色
   * 与其进度/进度手柄（bar-progress 同步取该 token）。milestone 走 `--oas-gantt-milestone-color`
   * 语义色、summary 走 `--oas-gantt-summary-bg` 语义色，均不受 task.color 影响（形态色即语义，
   * 不随单任务数据漂移）。
   */
  color?: string
  /**
   * 排程约束模式（opt-in；缺省 = 无约束，排程行为与旧版一致）：
   * - asap  越早越好（等同无约束，清洗层直接丢弃）
   * - snet  不早于 constraintDate（start ≥ 约束日，只前推不提前）
   * - mso   固定于 constraintDate（依赖不得前推；数据偏离约束日时由排程拉回）
   * - fnlt  不晚于 constraintDate（不自动移动，仅参与违约判定 → `.conflict`）
   * snet/mso/fnlt 必须携带合法 constraintDate，否则整体丢弃并告警一次。
   */
  constraint?: 'asap' | 'snet' | 'mso' | 'fnlt'
  /** 约束日期 'YYYY-MM-DD'（hour 档可带 'HH:mm'）；缺失/非法时约束整体丢弃 */
  constraintDate?: string
  /** 任务级禁拖 / 禁改自身（时间/进度/顺序/被依赖写入）；可作他任务前置与重排前/后同级目标 */
  disabled?: boolean
  /** summary 初始展开（缺省全展开，显式 false 为收起例外；expanded 属性受控优先——见 effectiveExpandedSet） */
  expanded?: boolean
  /** 基线计划（对比用；由宿主保存，组件只读）：start 必填 'YYYY-MM-DD'（hour 档可带时刻），end 缺省 = 单点 */
  baseline?: { start: string; end?: string }
  [key: string]: unknown
}

/** 依赖关系 */
export interface GanttDependency {
  /** 被依赖任务 id（不存在则该线跳过） */
  id: string
  /** 依赖类型：fs 完成-开始（缺省）/ ss 开始-开始 / ff 完成-完成 / sf 开始-完成 */
  type?: 'fs' | 'ss' | 'ff' | 'sf'
  /** 滞后/提前（天）：正值为 lag（推迟后继），负值为 lead（提前/允许重叠）；缺省 0 */
  lag?: number
}

/** 时间刻度档 */
export type GanttScale = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

/** task-click / task-dblclick 事件载荷 */
export interface GanttTaskClickDetail {
  id: string
  task: GanttTask
}

/** task-change 事件载荷（拖拽/拉伸/键盘改期收口，含旧值） */
export interface GanttTaskChangeDetail {
  id: string
  task: GanttTask
  oldStart: string
  oldEnd: string
  start: string
  end: string
}

/** progress-change 事件载荷 */
export interface GanttProgressChangeDetail {
  id: string
  task: GanttTask
  progress: number
}

/** tasks-change 事件载荷 */
export interface GanttTasksChangeDetail {
  tasks: GanttTask[]
}

/** expand-change 事件载荷 */
export interface GanttExpandChangeDetail {
  id: string
  expanded: boolean
}

/** scale-change 事件载荷 */
export interface GanttScaleChangeDetail {
  scale: GanttScale
}

/** task-render 事件载荷 */
export interface GanttTaskRenderDetail {
  task: GanttTask
  element: HTMLElement
}

/** reparent 事件载荷（行拖拽改父子 / 重排收口）：parent 为 null 表示根级，index 为同级序号 */
export interface GanttReparentDetail {
  id: string
  parent: string | null
  index: number
}

/** dependencies-change 事件载荷（连线拖拽建依赖 / 选中删除）：taskId 为依赖变化的后继任务 */
export interface GanttDependenciesChangeDetail {
  taskId: string
  dependencies: GanttDependency[]
}

/** selection-change 事件载荷（多选集合变化） */
export interface GanttSelectionChangeDetail {
  ids: string[]
}

/** task-add 事件载荷（命令式创作通道新增/复制任务收口）：id 为新任务 id，task 为快照 */
export interface GanttTaskAddDetail {
  id: string
  task: GanttTask
}

/** reschedule 事件载荷（auto-schedule 联动排程收口）：ids 为被联动改期的任务 id 列表 */
export interface GanttRescheduleDetail {
  ids: string[]
}

type TG = GanttTask & { id: string }

interface GanttRow {
  task: TG
  depth: number
  startMs: number
  endMs: number
  progress: number
  isSummary: boolean
  isMilestone: boolean
  hasChildren: boolean
  posinset: number
  setsize: number
}

interface TimeUnit {
  startMs: number
  endMs: number
  major: string
  minor: string
}

/** 主刻度合并组（列区间 [startCol, endCol) 共用同一 major 标签） */
interface GanttMajorGroup {
  startCol: number
  endCol: number
  label: string
}

/**
 * 主刻度相邻同标签分组（纯函数）：buildUnits 时对**全列**预计算一次，renderHeader 的窗口切片
 * 只做二分定位 + 相交子集输出——旧实现逐帧对全列做相邻合并扫描，长跨度横向滚动每帧 O(总列数)；
 * 分组语义与旧「逐帧全量相邻合并」完全一致（产物逐格一致，见 oas-gantt.test.ts 回归）。
 */
function buildMajorGroups(units: TimeUnit[]): GanttMajorGroup[] {
  const groups: GanttMajorGroup[] = []
  const n = units.length
  let i = 0
  while (i < n) {
    let j = i
    const label = units[i]!.major
    while (j + 1 < n && units[j + 1]!.major === label) j++
    groups.push({ startCol: i, endCol: j + 1, label })
    i = j + 1
  }
  return groups
}

type DragMode = 'move' | 'resize-start' | 'resize-end' | 'progress'

interface DragCtx {
  id: string
  mode: DragMode
  startX: number
  /** 拖拽起点时的横向滚动位置：自动滚动期间指针可静止，位移须叠加滚动增量，条才会随指针走 */
  startScrollLeft: number
  origStartMs: number
  origEndMs: number
  origProgress: number
  datetime: boolean
  touch: boolean
  bar: HTMLElement
  newStartMs?: number
  newEndMs?: number
  newProgress?: number
}

const SCALES: GanttScale[] = ['hour', 'day', 'week', 'month', 'quarter', 'year']
/** 各档列宽（px） */
const SCALE_COL: Record<GanttScale, number> = { hour: 44, day: 36, week: 90, month: 110, quarter: 150, year: 130 }
/** 各档列宽下限（px）：保证抽稀后的最小标签仍有呼吸位。
 *  旧实现统一取基准的 40%（day 档 14.4px），两位数日号在窄容器下首尾相接成一团不可读。 */
const SCALE_MIN_COL: Record<GanttScale, number> = { hour: 22, day: 16, week: 36, month: 44, quarter: 60, year: 52 }
/** 各档辅刻度抽稀步进阶梯（格）：取首个满足「步进 × 列宽 ≥ 标签估宽 + 间隙」者 */
const SCALE_STRIDES: Record<GanttScale, number[]> = {
  hour: [1, 2, 3, 4, 6, 12, 24],
  day: [1, 2, 7, 14, 28],
  week: [1, 2, 4, 13, 26],
  month: [1, 2, 3, 6, 12],
  quarter: [1, 2, 4],
  year: [1, 2, 5, 10],
}
/** 标签估宽（px）：xs 字号下 ASCII 数字/字母/冒号/连字符的平均字宽 */
const LABEL_CHAR_W = 6.6
/** 相邻可见标签之间的最小间隙（px） */
const LABEL_GAP = 6
/** 起始留白（档位数）：保持小值——旧值 7 天在窄容器下把首个任务推到可见区右缘、左侧大片空白，
 *  今日线/里程碑随之滚出视口；起始留白只需留出条缘手柄的呼吸位。 */
const SCALE_PAD_START: Record<GanttScale, number> = { hour: 1, day: 1, week: 1, month: 1, quarter: 1, year: 1 }
/** 末端留白（档位数）：给条外标签与依赖出线留余地 */
const SCALE_PAD_END: Record<GanttScale, number> = { hour: 6, day: 3, week: 1, month: 1, quarter: 1, year: 1 }
const DAY_MS = 86_400_000

/** 空白拖拽判拖阈值（px）：低于此位移视作点按（框选清空 / 不建任务） */
const MARQUEE_THRESHOLD = 4

/**
 * 全量重算诊断计数（**仅内部诊断，非公开 API**）：模块级累加、只增不减，不参与任何渲染逻辑
 * （整块删除不影响组件行为；`index.ts` 不导出该符号，也不进 api-manifest）。
 * - `rowBuilds`：`buildRows` 调用次数（O(总量) 行树构建 + 摘要聚合）
 * - `unitBuilds`：`buildUnits` 调用次数（O(轴长) 刻度构建 + 主刻度分组）
 * - `cpComputes`：`criticalPathIds` 调用次数（O(V+E) 关键路径 / 违约判定）
 * 用途：测试锁定增量性能契约——**仅选择变化**（tasks / 依赖 / scale / expanded 等未变）时三者
 * 计数必须零增长（选择走局部 patch 路径，复用缓存 rows/units/criticalIds）；数据或刻度变化时
 * 必须增长（证明缓存正确失效，计数不是恒 0 的假绿）。
 */
export const ganttRenderDiag = { rowBuilds: 0, unitBuilds: 0, cpComputes: 0 }

const DEP_TYPES = new Set(['fs', 'ss', 'ff', 'sf'])

/** 任务约束白名单（asap 等同无约束，清洗层丢弃，不落数据） */
const CONSTRAINTS = new Set(['asap', 'snet', 'mso', 'fnlt'])
/** 组件已知字段（清洗时按各自口径处理）；此外的键视为宿主自定义字段，原样透传 */
const RESERVED_TASK_KEYS = new Set([
  'id',
  'name',
  'start',
  'end',
  'type',
  'progress',
  'parent',
  'children',
  'dependencies',
  'color',
  'disabled',
  'expanded',
  'baseline',
  'constraint',
  'constraintDate',
])

/** 需携带 constraintDate 方能生效的约束模式 */
type DatedConstraint = 'snet' | 'mso' | 'fnlt'

/** 工作日吸附步进上限（天）：防 workdays + holidays 组合意外占满时死循环 */
const SNAP_MAX_DAYS = 400

/** 轴标签估宽（px，纯函数）：按字符数估算（刻度标签均为 ASCII，字宽近似等宽） */
export function estimateLabelWidth(text: string): number {
  return text.length * LABEL_CHAR_W
}

/**
 * 轴标签抽稀（纯函数）：返回应显示标签的下标集合。
 * 从 strides 阶梯取首个满足「步进 × 列宽 ≥ 最长标签估宽 + 间隙」的步进，
 * 列宽被压窄时按 N 取一显示，保证相邻可见标签不堆叠（密集日期轴可读性的通行做法）。
 * 列宽不可用（<=0，如无布局环境）或阶梯为空时全显示。
 */
export function pickVisibleLabels(labels: string[], colW: number, strides: number[], gap = LABEL_GAP): number[] {
  const n = labels.length
  if (n === 0) return []
  if (!(colW > 0) || strides.length === 0) return labels.map((_, i) => i)
  let maxW = 0
  for (const l of labels) {
    const w = estimateLabelWidth(l)
    if (w > maxW) maxW = w
  }
  const target = maxW + gap
  let step = strides[strides.length - 1]!
  for (const s of strides) {
    if (s * colW >= target) {
      step = s
      break
    }
  }
  const out: number[] = []
  for (let i = 0; i < n; i += step) out.push(i)
  return out
}

function parseTaskDate(s: unknown): Date | null {
  if (typeof s !== 'string') return null
  return parseISODate(s.trim())
}

function parseProgress(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
  return Math.min(100, Math.max(0, Math.round(v)))
}

/**
 * 任务约束清洗（纯函数）：白名单外的 constraint 一律丢弃（→ 无约束）；
 * `asap` 等同无约束（丢弃）；`snet`/`mso`/`fnlt` 必须携带可解析的 constraintDate，
 * 否则整体丢弃该约束并告警一次（key `constraint:${id}` 由调用方 warnOnce 去重）。
 */
function sanitizeConstraint(
  raw: Record<string, unknown>,
  id: string,
  onWarn?: (key: string, msg: string) => void,
): { mode: DatedConstraint; date: string } | null {
  const mode = raw.constraint
  if (typeof mode !== 'string' || !CONSTRAINTS.has(mode)) return null
  if (mode === 'asap') return null
  const date = typeof raw.constraintDate === 'string' ? raw.constraintDate.trim() : ''
  if (!parseTaskDate(date)) {
    onWarn?.(
      `constraint:${id}`,
      `[oas-gantt] 任务 "${id}" 的 constraint="${mode}" 缺少可解析的 constraintDate，该约束已丢弃`,
    )
    return null
  }
  return { mode: mode as DatedConstraint, date }
}

/**
 * workdays 属性解析（纯函数）：JSON 周几数组（0=周日 … 6=周六）。
 * opt-in：属性缺省 / JSON 非法 / 非数组 / 过滤非法项后为空 → 返回 null = 不限制（全周工作）。
 */
function parseWorkdays(raw: string): Set<number> | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!Array.isArray(parsed)) return null
  const days = new Set<number>()
  for (const x of parsed) {
    if (typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 6) days.add(x)
  }
  return days.size > 0 ? days : null
}

/**
 * lag 安全域上限（ms）：lag 必须有限且 |lag × DAY_MS| ≤ LAG_MS_LIMIT。
 * 背景：Date 合法域为 ±8.64e15 ms；极大有限 lag（1e8~1e10 天）能通过 `Number.isFinite`
 * 检查，但叠加到任务日期后会把排程运算的 ms 推出 Date 域 → `new Date(huge)` 为 Invalid
 * Date → `fmtIso` 内 `Intl.formatToParts` 抛 RangeError（auto-schedule 场景整图白屏）。
 * 取 1e12 ms（= 1e12 / 86_400_000 ≈ 11574 天 ≈ 31.7 年）：远大于业务可能的 lag（按年计）；
 * 常见 4 位年份（如 2026）叠加后仍为 4 位年份——写回日期经 toISODate 序列化后能再被
 * parseTaskDate 回读（parseISODate 只收 4 位年）；边界年份（如 9999）由
 * writeStartKeepingDuration 的写回域守卫兜底（结果不可回读则跳过本次写回）。
 * 旧上限 1e15 ms 实为 ≈1.15e7 天（≈3.17 万年）：lag=1e7 天即可写出 29405-…（5 位年份），
 * parseTaskDate 无法回读 → `el.tasks = el.tasks` 这类回写会静默丢任务。
 */
const LAG_MS_LIMIT = 1e12

/**
 * lag 清洗（纯函数，三条入口共用：sanitizeDeps / addDependency / updateDependency）：
 * 合法（有限数值且在安全域内）原样返回；否则返回 undefined = 调用方丢弃该 lag（等价 0/缺省，
 * 依赖本身保留——与既有「NaN/非数值丢弃为无 lag」清洗口径一致）。
 */
function sanitizeLag(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
  if (Math.abs(v * DAY_MS) > LAG_MS_LIMIT) return undefined
  return v
}

function sanitizeDeps(
  v: unknown,
  id: string,
  onWarn?: (key: string, msg: string) => void,
): GanttDependency[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: GanttDependency[] = []
  const seen = new Set<string>()
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue
    const it = item as Record<string, unknown>
    if (typeof it.id !== 'string' || it.id === '') continue
    const dep: GanttDependency = { id: it.id }
    if (typeof it.type === 'string' && DEP_TYPES.has(it.type)) dep.type = it.type as GanttDependency['type']
    // lag（天，可负=提前/重叠）：有限且在安全域内才保留，否则丢弃为无 lag（防 Invalid Date / 5 位年份）
    const lag = sanitizeLag(it.lag)
    if (lag !== undefined) dep.lag = lag
    else if (typeof it.lag === 'number' && Number.isFinite(it.lag)) {
      // 属性通道越域告警（实例级一次，key 固定）：NaN/字符串等非法值保持既有静默丢弃口径
      onWarn?.(
        'lag-domain',
        `[oas-gantt] 依赖 lag=${String(it.lag)}（任务 "${id}"）超出安全域（|lag×天| ≤ 1e12 ms，约 11574 天），已按 0 处理`,
      )
    }
    // 同源同型去重（重复项会渲染重合连线，且一处删除会连带删掉）；lag 不参与去重键
    const key = `${dep.id}|${dep.type ?? 'fs'}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(dep)
  }
  return out.length > 0 ? out : undefined
}

/** 展开中的嵌套输入先拍平（保 DFS 序：父在前、子随后），再统一清洗；fromNest 标记 parent 来自嵌套推导 */
function flattenInput(
  v: unknown,
  out: Array<{ raw: Record<string, unknown>; parent: string | null; fromNest: boolean }>,
  parent: string | null,
): void {
  if (!Array.isArray(v)) return
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue
    const raw = item as Record<string, unknown>
    out.push({ raw, parent, fromNest: parent !== null })
    if (Array.isArray(raw.children)) {
      const pid = typeof raw.id === 'string' && raw.id !== '' ? raw.id : null
      flattenInput(raw.children, out, pid)
    }
  }
}

/**
 * 清洗任务数组：坏数据丢弃；children 嵌套拍平为 parent 指针；缺 id 自动分配并避让
 * （显式 id 重复/冲突时自动避让，对齐 scheduler 语义）；type 推导在渲染模型层完成。
 * onWarn：数据自愈告警通道（key 去重由调用方持有，模块函数保持无状态）。
 */
function sanitizeTasks(
  v: unknown,
  allocId: (used: Set<string>) => string,
  onWarn?: (key: string, msg: string) => void,
): TG[] {
  const flat: Array<{ raw: Record<string, unknown>; parent: string | null; fromNest: boolean }> = []
  flattenInput(v, flat, null)

  // 首趟：校验 + 定 id（自动 id 避让「显式 id + 本批已分配」）
  const avoid = new Set<string>()
  for (const { raw } of flat) if (typeof raw.id === 'string' && raw.id !== '') avoid.add(raw.id)
  const seen = new Set<string>()
  const idOf = new Map<number, string>()
  for (let i = 0; i < flat.length; i++) {
    const { raw } = flat[i]!
    if (typeof raw.name !== 'string' || raw.name === '') continue
    if (!parseTaskDate(raw.start)) continue
    let id: string
    if (typeof raw.id === 'string' && raw.id !== '' && !seen.has(raw.id)) {
      id = raw.id
    } else {
      id = allocId(avoid)
      avoid.add(id)
    }
    seen.add(id)
    avoid.add(id)
    idOf.set(i, id)
  }
  const validIds = new Set(idOf.values())
  // 二趟：组装。parent 处理：
  // - 指向本批真实任务 → 保留指针
  // - 来自显式 parent 字段且悬空 → 保留（渲染层按根渲染并告警一次，帮宿主发现数据错误）
  // - 来自嵌套拍平且父被丢弃（如父缺名）→ 静默丢弃（级联悬空不是宿主写错的 parent）
  const out: TG[] = []
  for (let i = 0; i < flat.length; i++) {
    const id = idOf.get(i)
    if (!id) continue
    const { raw, parent, fromNest } = flat[i]!
    const t: TG = { id, name: raw.name as string, start: (raw.start as string).trim() }
    // 自定义字段透传（GanttTask 的 `[key: string]: unknown` 契约）：白名单之外的键原样保留，
    // 供宿主携带 owner/assignee/tag 等业务字段（已知字段随后按校验口径覆盖或丢弃）
    for (const [k, v] of Object.entries(raw)) {
      if (!RESERVED_TASK_KEYS.has(k)) (t as Record<string, unknown>)[k] = v
    }
    const endRaw = typeof raw.end === 'string' && raw.end.trim() !== '' ? raw.end.trim() : undefined
    if (endRaw && parseTaskDate(endRaw)) {
      // start 晚于 end（日期颠倒）自愈：按渲染语义交换（不静默渲染 2px 假条）。
      // 颠倒判定与渲染层 endMsOf 同口径：日精度 end 含当日（区间右缘 = 次日 00:00）
      const startD = parseTaskDate(t.start)!
      const endD = parseTaskDate(endRaw)!
      const endMs = endRaw.length > 10 ? endD.getTime() : endD.getTime() + DAY_MS
      let endStr = endRaw
      if (endMs < startD.getTime()) {
        onWarn?.(t.id, `[oas-gantt] 任务 "${t.id}" start 晚于 end（日期颠倒），已自动交换`)
        const tmp = t.start
        t.start = endStr
        endStr = tmp
      }
      t.end = endStr
    }
    const progress = parseProgress(raw.progress)
    if (progress !== undefined) t.progress = progress
    const parentVal = fromNest ? parent : typeof raw.parent === 'string' && raw.parent !== '' ? raw.parent : undefined
    if (parentVal) {
      if (validIds.has(parentVal) && parentVal !== id) t.parent = parentVal
      else if (!fromNest) t.parent = parentVal
    }
    const deps = sanitizeDeps(raw.dependencies, t.id, onWarn)
    if (deps) t.dependencies = deps
    // 排程约束（opt-in）：白名单 + snet/mso/fnlt 必须带合法 constraintDate，否则丢弃并告警一次
    const con = sanitizeConstraint(raw, t.id, onWarn)
    if (con) {
      t.constraint = con.mode
      t.constraintDate = con.date
    }
    if (typeof raw.color === 'string' && raw.color !== '') t.color = raw.color
    if (raw.disabled === true) t.disabled = true
    if (raw.expanded === true || raw.expanded === false) t.expanded = raw.expanded
    if (raw.type === 'task' || raw.type === 'milestone' || raw.type === 'summary') t.type = raw.type
    const base = raw.baseline
    if (typeof base === 'object' && base !== null) {
      const b = base as Record<string, unknown>
      const s = typeof b.start === 'string' ? b.start.trim() : ''
      if (s && parseTaskDate(s)) {
        const bb: { start: string; end?: string } = { start: s }
        const e = typeof b.end === 'string' ? b.end.trim() : ''
        if (e && parseTaskDate(e)) bb.end = e
        t.baseline = bb
      }
    }
    out.push(t)
  }
  return out
}

/** 选择器 id 转义（宿主 id 可能含引号/方括号，直接拼接会抛 DOMException） */
function escId(s: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(s) : s.replace(/["\\\]]/g, '\\$&')
}

export class OASGantt extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'tasks',
      'scale',
      'expanded',
      'readonly',
      'dates-readonly',
      'progress-readonly',
      'show-today',
      'weekends',
      'holidays',
      'workdays',
      'first-day-of-week',
      'locale',
      'height',
      'row-height',
      'label-position',
      'snap',
      'show-baseline',
      'creatable',
      'auto-schedule',
      'show-critical-path',
      // 行斑马纹开关（opt-in，默认关）
      'stripe',
      // windowed（服务端行窗口模式）+ 宿主托管时间范围（契约见 shared/window-data.ts）
      'windowed',
      'total',
      'window-start',
      'range-start',
      'range-end',
    ]
  }

  private _tasks: TG[] = []
  private tasksAttrCache = ''
  /**
   * 组件内部正在写 `tasks` 属性（syncTasksAttr 在场）：属性通道会**同步**触发一次全量 update
   * （基类 attributeChangedCallback），置位期间嵌套 update 末尾的 reschedule 据此判定「外层提交口
   * 稍后会统一派发 oas-tasks-change」→ 跳过自己的 emitTasksChange，保证一次用户操作只发一次
   * oas-tasks-change（属性通道直接改数据 / 运行期开启 auto-schedule 等无外层提交的触发不置位，
   * reschedule 照常补发）。嵌套写回（update 内 reschedule 再 syncTasksAttr）经 prev 恢复语义正确。
   */
  private inInternalWrite = false
  private nextId = 1
  private expandedAttrCache = ''
  /** 展开集合：null = 未受控（数据 expanded 初始化）；expanded 属性出现后受控 */
  private expandedSet: Set<string> | null = null
  private units: TimeUnit[] = []
  /** 主刻度合并组（buildMajorGroups 产物，与 units 同生命周期重建）：renderHeader 窗口切片数据源 */
  private majorGroups: GanttMajorGroup[] = []
  private rows: GanttRow[] = []
  /** rows 的 id → 下标索引（buildRows 末尾重建，见 rebuildRowIndex）：选择路径 O(1) 定位，替代 O(总量) 扫描 */
  private rowIndexById = new Map<string, number>()
  private canvasW = 0
  private lastScale = ''
  private warnedParents = new Set<string>()
  /** 清洗层数据自愈告警去重（key = 任务 id） */
  private warnedSanitize = new Set<string>()
  /** 显式 milestone 与 end/子级并存的数据矛盾告警去重（key = `${id}:${kind}`） */
  private warnedMilestones = new Set<string>()
  private warnedRescheduleCycle = false
  /** 工作日日历缓存（key = workdays + holidays 原文；属性变化即重建） */
  private workCalCache: { key: string; days: Set<number> | null; holidays: Set<string> } | null = null
  /** holidays 属性解析缓存（key = 属性原文）：renderGrid 每帧读取，不落缓存会在滚动帧内反复 JSON.parse；属性原文变化即失效，语义与逐次解析一致 */
  private holidayCache: { raw: string; set: Set<string> } | null = null
  /**
   * 辅刻度抽稀可见集缓存（units 引用 + scale + colW 为键）：抽稀决策依赖**全列**标签估宽
   * （如 week 档 W1..W53 宽度不均，窗口切片可能不含最宽标签），先锁全列决策、窗口只取段——
   * 与逐帧全量计算逐像素一致；横向滚动每帧重渲染表头时免去全列 map + 估宽扫描
   */
  private visibleMinorCache: { units: TimeUnit[]; scale: GanttScale; colW: number; set: Set<number> } | null = null
  /** 关键路径任务 id 集合（show-critical-path 开启时计算；关闭为空集，渲染零影响） */
  private criticalIds = new Set<string>()
  private conflictIds = new Set<string>()
  /** buildRows 产物缓存：渲染窗口（滚动每帧）复用，避免万级任务下每帧重建展开集 */
  private expandedSetCache: Set<string> | null = null
  /** 自适应列宽（px）：视口可用宽度内铺下整个窗口时收窄至恰好适配；null = 回落各档基准列宽（无布局环境） */
  private displayColW: number | null = null
  /** 上次 onViewportResize 读到的视口宽：列窗口重算的判据之一（长跨度下列宽被钳位不变，但视口可变宽） */
  private lastViewportW = -1
  /** 上次 onViewportResize 读到的视口高：行窗口重算的判据之一（容器变高须补行窗口，否则底部露白到滚动才补） */
  private lastViewportH = -1
  /**
   * 本实例是否写过 `--oas-gantt-height`（height 属性在场期间由组件接管该自定义属性；与 oas-resource 同协议）。
   * 仅布尔「是否写过」：从未写过（宿主自己内联设 token、无 height 属性）→ 组件绝不动它；
   * 写过又随属性移除 → removeProperty 归零（DSD 快照自写值同样只可能来自「属性当时在场」，移除后必清）。
   * 非法值（属性在场但非 >0 纯数字 / Npx）：不写变量、仅清本实例自写值，宿主 token 不受影响。
   */
  private heightApplied = false
  private resizeObs: ResizeObserver | null = null
  private dragCtx: DragCtx | null = null
  private reparentCtx: { id: string; byId: Map<string, TG> } | null = null
  private reparentTarget: { id: string; mode: 'before' | 'after' | 'inside' } | null = null
  private dropLineEl: HTMLElement | null = null
  private linkCtx: {
    sourceId: string
    endpoint: 'start' | 'end'
    sx: number
    sy: number
    temp: SVGPathElement
  } | null = null
  private selectedLink: { successor: string; predecessor: string; type: string } | null = null
  private selected = new Set<string>()
  private selectionAnchor: string | null = null
  private renaming = false
  private rowPending: {
    id: string
    x: number
    y: number
    disabled: boolean
    viaHandle: boolean
    /** 起手在任务名文本内：点击仍选中行，拖动交给浏览器做文本选择，不进入重排 */
    textTarget: boolean
    byId: Map<string, TG>
  } | null = null
  /** 空白框选手势（行带 rows / 条相交 bars）：记录起止点与追加语义 */
  private marqueeCtx: {
    kind: 'rows' | 'bars'
    x0: number
    y0: number
    x1: number
    y1: number
    moved: boolean
    additive: boolean
    touch: boolean
  } | null = null
  /** 时间轴空白拖拽建任务手势（creatable 且非只读） */
  private createCtx: { x0: number; y0: number; x1: number; y1: number; moved: boolean; touch: boolean } | null = null
  private marqueeEl: HTMLElement | null = null
  private ganttEl: HTMLElement | null = null
  private activeRowId: string | null = null
  private touchActiveId: string | null = null
  private coarse = false
  private autoScrollRaf = 0
  private autoScrolling = false
  private pointerX = 0
  private pointerY = 0
  private tbody: HTMLElement | null = null
  private theadEl: HTMLElement | null = null
  private sideBody: HTMLElement | null = null
  private sideRows: HTMLElement | null = null
  private barsEl: HTMLElement | null = null
  private linksEl: SVGSVGElement | null = null
  private gridEl: HTMLElement | null = null
  /** 行斑马纹容器（stripe 属性懒创建；render() 重建 innerHTML 后由 renderStripes 的 isConnected 检查自愈） */
  private stripeCanvasEl: HTMLElement | null = null
  private innerEl: HTMLElement | null = null
  private todayEl: HTMLElement | null = null
  private tooltipEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  private winStart = 0
  private winEnd = 0
  /** 横向列窗口 [winColStart, winColEnd)（时间轴列虚拟化，全局列索引；由 computeColWindow 维护） */
  private winColStart = 0
  private winColEnd = 0
  /** onScroll 窗口重建合帧句柄（rAF 节流：同一帧内多次 scroll 只重建一次窗口） */
  private scrollRaf = 0
  /** 合帧重建后是否需 reconcile 拖拽（该帧内至少一次自动滚动触发的 scroll） */
  private scrollRafReconcile = false
  /**
   * windowed 模式解析结果（update() 内 syncTasks 之后重算）：
   * windowed 属性在场且 total 为合法正数才生效（否则回落本地全量模式，行为不变）。
   */
  private _winMode: ReturnType<typeof readWindowedMode> = readWindowedMode(false, 0, 0, 0)
  /** 行窗口请求去重状态（同一期望区间不重复派发；被已装载区间覆盖时重置，之后覆盖情况变化可对同一区间再派） */
  private winReq: { start: number; end: number } | null = null
  /** 首帧行请求标记（init vs data 原因区分；退出 windowed 时重置） */
  private winInitDone = false
  /** range 请求去重状态（语义同行窗口去重，坐标系为 epoch ms） */
  private rangeReq: { startMs: number; endMs: number } | null = null
  /** 首帧 range 请求标记（init vs data 原因区分） */
  private rangeInitDone = false
  /** windowed 下禁用的跨全量能力告警去重（auto-schedule / 关键路径 / 缺 range-* / 层级切片 / 行重排各一次） */
  private warnedWindowedSchedule = false
  private warnedWindowedCritical = false
  private warnedWindowedRange = false
  private warnedWindowedFlat = false
  private warnedWindowedReparent = false
  /** windowed 切片越界（window-start + 装载行数 > total）告警去重（实例级一次） */
  private warnedWindowedOverflow = false

  /** windowed 下行重排禁用告警（一次）：切片内同级 index 对全量无意义，重排由宿主在全量上处理 */
  private warnWindowedReparent(): void {
    if (this.warnedWindowedReparent) return
    this.warnedWindowedReparent = true
    devWarn(
      '[oas-gantt] windowed 模式下行重排（拖拽 / Alt+方向键）已禁用：行序 index 是切片内同级序号，对全量无意义；重排请在宿主侧全量数据上处理',
    )
  }

  /**
   * @apiProperty 甘特任务（公开读/写通道）：读为数组拷贝（含自动分配的 id，嵌套输入已拍平为
   * parent 指针）；写为程序性赋值（序列化进受控 `tasks` 属性并重渲染、派发 oas-tasks-change）。
   */
  get tasks(): GanttTask[] {
    return this._tasks.map((t) => {
      const copy: GanttTask = { ...t }
      if (copy.dependencies) copy.dependencies = copy.dependencies.map((d) => ({ ...d }))
      if (copy.baseline) copy.baseline = { ...copy.baseline }
      delete copy.children
      return copy
    })
  }
  set tasks(v: GanttTask[]) {
    this._tasks = sanitizeTasks(
      parseJsonArray<GanttTask>(v as unknown),
      (used) => this.allocId(used),
      (key, msg) => this.warnOnce(key, msg),
    )
    // 外部整体重写：收敛幽灵选中/锚点/活动/揭示态由 update() 统一处理（property 与 attribute 一致）；
    // 写回走 commitTasks 单通道（syncTasksAttr 的属性通道已触发一次全量 update，不再手动 update）
    this.commitTasks()
  }

  /** 按 id 单条增量更新（浅合并 patch 后走 sanitize 清洗；找不到或非法 patch 返回 false） */
  updateTask(id: string, patch: Partial<GanttTask>): boolean {
    const idx = this._tasks.findIndex((t) => t.id === id)
    if (idx < 0) return false
    // 非法 end（非空串且解析失败）显式拒绝：否则清洗层静默丢弃 end，task 会被悄悄降级成 milestone
    if (patch.end !== undefined && patch.end !== '' && !parseTaskDate(patch.end)) return false
    // patch.children 契约告警：清洗层会把 children 拍平，但这里只取单条清洗结果——patch 携带的
    // 子条目被静默丢弃。数据契约以扁平 parent 指针为准，不支持 patch children（告警一次防宿主误用）。
    if (patch.children !== undefined)
      this.warnOnce(
        `patch-children:${id}`,
        '[oas-gantt] updateTask 的 patch.children 已忽略（数据契约以扁平 parent 指针为准，不支持 patch children；层级请改用 parent 指针或整体重写 tasks）',
      )
    const merged = { ...this._tasks[idx]!, ...patch, id }
    const [clean] = sanitizeTasks(
      [merged],
      (used) => this.allocId(used),
      (key, msg) => this.warnOnce(key, msg),
    )
    if (!clean) return false
    clean.id = id
    this._tasks = [...this._tasks.slice(0, idx), clean, ...this._tasks.slice(idx + 1)]
    this.commitTasks()
    return true
  }

  /** 滚动到指定任务行（虚拟滚动下委托内部视口，目标行垂直居中）；找不到为空操作。
   *  命名避开 DOM 内建 Element.scrollTo（签名不兼容会崩宿主 property 通道，同 prefix/blur 先例）。
   *  windowed 边界：组件只持有已装载切片，rowIndexById 只含切片内任务——目标未装载时静默 no-op
   *  （宿主应先按 oas-window-request 回填窗口再调用）；定位坐标按绝对行号（absRowTop），
   *  切片内命中即正确，无需宿主换算。 */
  scrollToTask(id: string): void {
    // 重建窗口会清 bars/links，先终止进行中的拖拽/重排/连线，防陈旧锚点
    if (this.dragCtx) this.cancelDrag()
    this.cancelReparent()
    this.cancelLink()
    const idx = this.rowIndexById.get(id) ?? -1
    if (idx < 0 || !this.tbody) return
    const vh = this.viewportH()
    this.tbody.scrollTop = Math.max(0, this.absRowTop(idx) - vh / 2 + this.rowHeightPx() / 2)
    this.renderWindow()
  }

  /** 滚动到指定日期（水平居中）；非法日期忽略。RTL 走真实浏览器 scrollLeft 负值模型
   *  （0 在画布最右、向左滚为负；-maxScroll 为最左）——LTR 正值公式在 RTL 下会把视口
   *  钉在画布左端（与时间轴镜像方向相反），目标永远落不在视口内。
   *  末尾同步 renderWindow() + syncHeaderOffset()：命令式滚动（含 scrollToToday）返回即已
   *  渲染目标列窗口**且表头偏移已同步**，不等异步 scroll → rAF 合帧（与 oas-resource 同口径，
   *  消 1 帧滞后）——表头 transform 只在 onScroll 里更新，漏同步会错位一帧（错位量 = 整段
   *  滚动位移）；用户滚动路径仍走 onScroll 的 rAF 合帧（同帧多次滚动只重建一次，不因本改动退化） */
  scrollToDate(date: string): void {
    const d = parseTaskDate(date)
    if (!d || !this.tbody) return
    const p = this.mirrorX(this.xOf(d.getTime()))
    const half = this.tbody.clientWidth / 2
    if (isRtl(this)) {
      const maxScroll = Math.max(0, this.tbody.scrollWidth - this.tbody.clientWidth)
      // 视口左缘 L 钳在 [0, maxScroll]，scrollLeft = L − maxScroll ∈ [−maxScroll, 0]
      const left = Math.min(Math.max(p - half, 0), maxScroll)
      this.tbody.scrollLeft = left - maxScroll
    } else {
      this.tbody.scrollLeft = Math.max(0, p - half)
    }
    this.renderWindow()
    this.syncHeaderOffset()
  }

  /** 滚动到今天 */
  scrollToToday(): void {
    this.scrollToDate(toISODate(new Date()))
  }

  private allocId(used: Set<string>): string {
    let id = `gt${this.nextId++}`
    while (used.has(id)) id = `gt${this.nextId++}`
    return id
  }

  /** 清洗层数据自愈告警（同 key 只告一次，防受控循环刷屏） */
  private warnOnce(key: string, msg: string): void {
    if (this.warnedSanitize.has(key)) return
    this.warnedSanitize.add(key)
    devWarn(msg)
  }

  /** milestone 数据矛盾告警（同任务同类型只告一次；key 含类型，形态变化时重新提示） */
  private warnMilestone(id: string, kind: string, msg: string): void {
    const key = `${id}:${kind}`
    if (this.warnedMilestones.has(key)) return
    this.warnedMilestones.add(key)
    devWarn(msg)
  }

  /**
   * 写回 `tasks` 属性（组件内部唯一写出口）。setAttribute 会**同步**触发基类
   * attributeChangedCallback → 一次全量 update()（属性通道），故调用方**不要再手动 update()**——
   * 旧实现 syncTasksAttr 后又手动 update 一次（双跑），auto-schedule 的 reschedule 内再
   * sync+update，一次拖拽全量重渲染 4 跑。事件由调用方在写回之后按各自契约派发。
   */
  private syncTasksAttr(): void {
    this.tasksAttrCache = JSON.stringify(this._tasks)
    const prev = this.inInternalWrite
    this.inInternalWrite = true
    try {
      this.setAttribute('tasks', this.tasksAttrCache)
    } finally {
      this.inInternalWrite = prev
    }
  }

  private emitTasksChange(): void {
    this.emit('tasks-change', { tasks: this.tasks } satisfies GanttTasksChangeDetail)
  }

  /**
   * 创作通道统一写回出口：反射属性 + 重渲染 + 派发 oas-tasks-change（一次提交一次事件）。
   * 重渲染由 syncTasksAttr 的属性通道同步触发（一次全量 update），此处不再手动 update；
   * update 末尾 auto-schedule 的 reschedule 若联动改期，其 oas-tasks-change 被判别旗标抑制
   * （inInternalWrite），最终由本出口统一派发一次（含联动后的最终数据）。
   */
  private commitTasks(): void {
    this.syncTasksAttr()
    this.emitTasksChange()
  }

  /** 让 id 的父级展开以显示新增子级：受控时补入 expanded 集合并回写属性；未受控时若该父级带
   *  数据级 `expanded:false`（显式收起）则置 true（否则新子级隐形、无重命名/聚焦反馈） */
  private ensureExpanded(id: string): void {
    if (this.expandedSet) {
      if (this.expandedSet.has(id)) return
      const next = new Set(this.expandedSet)
      next.add(id)
      this.expandedSet = next
      this.expandedAttrCache = JSON.stringify([...next])
      this.setAttribute('expanded', this.expandedAttrCache)
      return
    }
    const t = this._tasks.find((x) => x.id === id)
    if (t && t.expanded === false) t.expanded = true
  }

  private syncTasks(): void {
    const raw = this.getAttr('tasks', '')
    if (raw === this.tasksAttrCache) return
    this.tasksAttrCache = raw
    let parsed: unknown
    try {
      parsed = raw === '' ? [] : JSON.parse(raw)
    } catch {
      parsed = []
    }
    this._tasks = sanitizeTasks(
      parsed,
      (used) => this.allocId(used),
      (key, msg) => this.warnOnce(key, msg),
    )
  }

  /** expanded 属性同步（JSON 数组受控；属性缺席回落数据 expanded 初始集合） */
  private syncExpanded(): void {
    const raw = this.getAttr('expanded', '')
    if (raw === '') {
      if (this.expandedAttrCache !== '') {
        this.expandedAttrCache = ''
        this.expandedSet = null
      }
      return
    }
    if (raw === this.expandedAttrCache) return
    this.expandedAttrCache = raw
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = []
    }
    this.expandedSet = new Set(Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [])
  }

  private effectiveLocale(): string {
    const own = this.getAttr('locale', '')
    if (own) return own
    return resolveLocale(this)
  }

  private scaleMode(): GanttScale {
    const raw = this.getAttr('scale', '')
    return (SCALES as string[]).includes(raw) ? (raw as GanttScale) : 'day'
  }

  private colW(): number {
    return this.displayColW ?? SCALE_COL[this.scaleMode()]
  }

  /**
   * 自适应列宽：窗口单位数 × 基准列宽超过视口可用宽时，收窄列宽让整个窗口尽量铺满
   * （下限为各档 SCALE_MIN_COL，防超大跨度被压成亚像素或标签无处安放；低于下限宁可行内滚动）；
   * 可用宽度不可得（happy-dom 等无布局环境）回落基准列宽。
   * 数据跨度小时任务不再被起始留白推挤到右缘、今日线/里程碑随之可见。
   */
  private computeColW(): void {
    const scale = this.scaleMode()
    const base = SCALE_COL[scale]
    const avail = this.tbody?.clientWidth ?? 0
    if (avail <= 0 || this.units.length === 0) {
      this.displayColW = null
      return
    }
    const fit = avail / this.units.length
    this.displayColW = Math.min(base, Math.max(SCALE_MIN_COL[scale], fit))
  }

  /**
   * 视口尺寸变化（含首次观测到真实宽/高）：列窗口重算不得只依赖自适应列宽变化——
   * 长跨度下 displayColW 被钳在 SCALE_MIN_COL 不动，容器变宽时列宽不变但视口变宽，
   * 只比较列宽会早退跳过 computeColWindow/表头重切片 → 时间轴右侧露白。
   * 容器变高同理：行窗口由视口高决定，只比较宽度会早退跳过 renderWindow → 底部露白
   * 直到滚动才补。改比较「视口宽 + 视口高 + displayColW」三快照，任一变化才重排重渲染
   * （RO 抖动下宽高均不变时仍零成本早退）。
   */
  private onViewportResize(): void {
    if (!this.tbody) return
    // 列宽重排会重建 bars 层：进行中的拖拽先终止（否则 ctx.bar 悬在脱离 DOM 的旧节点上，
    // 视觉断线且回滚落在死节点上）；吸附步进基准（snap=列宽）随之失效，取消是唯一一致路径
    if (this.dragCtx) this.cancelDrag()
    this.cancelReparent()
    this.cancelLink()
    const w = this.tbody.clientWidth
    const h = this.tbody.clientHeight
    const beforeW = this.lastViewportW
    const beforeH = this.lastViewportH
    const beforeColW = this.displayColW
    this.lastViewportW = w
    this.lastViewportH = h
    this.computeColW()
    if (w === beforeW && h === beforeH && this.displayColW === beforeColW) return
    this.canvasW = this.units.length * this.colW()
    if (this.innerEl) this.innerEl.style.width = `${this.canvasW}px`
    this.computeColWindow()
    this.renderHeader()
    this.renderWindow()
    this.requestWindowIfNeeded('resize')
    this.requestRangeIfNeeded('resize')
  }

  /** 行高（px）：方法名避开 row-height 属性的 camelCase（rowHeight）——同名会被宿主 property
   *  赋值遮蔽（实例自有属性覆盖原型方法），内部 this.rowHeightPx() 即抛 TypeError */
  private rowHeightPx(): number {
    const n = Number(this.getAttr('row-height', '36'))
    return Number.isFinite(n) && n >= 20 ? n : 36
  }

  /** height 属性原值：空串 / 纯空白（SFC 空绑定）视为**未设置** → null；其余返回 trim 后原值 */
  private heightAttrValue(): string | null {
    if (!this.hasAttr('height')) return null
    const raw = this.getAttr('height', '').trim()
    return raw === '' ? null : raw
  }

  /** height 像素值：接受纯数字或带 `px` 后缀；非法 / 缺失回落 320（= --oas-gantt-height token 缺省）。
   *  getAttr('height','320') 字面量同时是 api:scan 的 attr 默认值提取锚点，勿移除；
   *  viewportH() 在无布局环境（happy-dom）靠本兜底，fallback 语义保留 */
  private heightPx(): number {
    const raw = this.heightAttrValue()
    if (raw != null) {
      const n = Number(raw.replace(/px$/i, '').trim())
      if (Number.isFinite(n) && n > 0) return n
    }
    const fallback = Number(this.getAttr('height', '320').replace(/px$/i, '').trim())
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 320
  }

  /** 条旁标签位置：缺省 none——行名列已承载名称，条旁再渲染同名文本属重复信息。
   *  方法名避开 label-position 属性的 camelCase（labelPosition），防 property 赋值遮蔽原型方法 */
  private labelPositionMode(): 'inside' | 'right' | 'left' | 'none' {
    const raw = this.getAttr('label-position', '')
    if (raw === 'inside' || raw === 'right' || raw === 'left') return raw
    return 'none'
  }

  private snapOn(): boolean {
    return this.getAttr('snap', '') !== 'false'
  }

  private baselineOn(): boolean {
    return this.hasAttr('show-baseline')
  }

  /** 依赖联动排程开关（缺省关）：属性存在即开；显式 "false" 视作关（防宿主布尔绑定取值意外开启） */
  private autoScheduleOn(): boolean {
    return this.hasAttr('auto-schedule') && this.getAttr('auto-schedule', '') !== 'false'
  }

  /** 关键路径开关（防宿主布尔绑定写成 show-critical-path="false" 仍开启，同 auto-schedule） */
  private showCriticalPathOn(): boolean {
    return this.hasAttr('show-critical-path') && this.getAttr('show-critical-path', '') !== 'false'
  }

  /** 行斑马纹开关（缺省关）：属性存在即开；显式 "false" 视作关（防宿主布尔绑定意外开启，同 auto-schedule） */
  private stripeOn(): boolean {
    return this.hasAttr('stripe') && this.getAttr('stripe', '') !== 'false'
  }

  /** 基线差值文案（实际 end 相对基线 end：晚/早 N 天或一致） */
  private baselineDeltaText(row: GanttRow, baselineEndMs: number): string {
    const days = Math.round((row.endMs - baselineEndMs) / DAY_MS)
    if (days === 0) return this.t('gantt.baselineSame')
    return this.t(days > 0 ? 'gantt.baselineLater' : 'gantt.baselineEarlier', { count: Math.abs(days) })
  }

  /** 今日线开关（方法名避开 show-today 属性的 camelCase，防 property 赋值遮蔽原型方法） */
  private showTodayOn(): boolean {
    return this.getAttr('show-today', '') !== 'false'
  }

  private weekendsOn(): boolean {
    return this.getAttr('weekends', '') !== 'false'
  }

  /** 假日集合（按属性原文缓存；调用方只读不写——isWorkingDay/renderGrid/workCalendar 均只查询） */
  private holidaySet(): Set<string> {
    const raw = this.getAttr('holidays', '')
    const cached = this.holidayCache
    if (cached && cached.raw === raw) return cached.set
    let set: Set<string>
    if (!raw) {
      set = new Set()
    } else {
      try {
        const parsed: unknown = JSON.parse(raw)
        set = new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [])
      } catch {
        set = new Set()
      }
    }
    this.holidayCache = { raw, set }
    return set
  }

  /**
   * 工作日日历快照（workdays + holidays 原文为 key 缓存，属性不变即复用——
   * 排程循环内逐次 JSON.parse 属性在大规模数据下开销可观）。
   * days 为 null 表示 workdays 未开启/非法 → 不限制（全周工作）。
   */
  private workCalendar(): { days: Set<number> | null; holidays: Set<string> } {
    const key = `${this.getAttr('workdays', '')}\u0000${this.getAttr('holidays', '')}`
    const cached = this.workCalCache
    if (cached && cached.key === key) return cached
    const next = { key, days: parseWorkdays(this.getAttr('workdays', '')), holidays: this.holidaySet() }
    this.workCalCache = next
    return next
  }

  /** 工作日判定：周几 ∈ workdays 且非 holidays。workdays 缺省/非法/空 → 恒 true（零行为） */
  private isWorkingDay(ms: number): boolean {
    const { days, holidays } = this.workCalendar()
    const d = new Date(ms)
    // 假日恒为非工作日（与 workdays 是否开启无关）；workdays 缺省则不限制周几
    if (holidays.has(toISODate(d))) return false
    if (!days) return true
    return days.has(d.getDay())
  }

  /**
   * 吸附到「当天或之后」的下一个工作日（逐日前进，上限 SNAP_MAX_DAYS 天防死循环）。
   * workdays 未开启 → 原值返回（零行为）；上限内找不到工作日（几乎不可达）→ 原值返回（宁可不移动）。
   */
  private snapToWorkingDay(ms: number): number {
    const { days, holidays } = this.workCalendar()
    // 无 workdays 且无假日 → 全周皆工作日，无需求吸附
    if (!days && holidays.size === 0) return ms
    let cur = ms
    for (let i = 0; i < SNAP_MAX_DAYS; i++) {
      if (this.isWorkingDay(cur)) return cur
      cur += DAY_MS
    }
    return ms
  }

  /**
   * 任务约束快照：mode + 约束日起点 ms + 约束日右缘 ms（fnlt 判定用；日精度 +DAY_MS 含端日）。
   * 缺省/非法（清洗层已兜底，此处再防御一次）→ null = 无约束。
   */
  private constraintOf(t: TG): { mode: DatedConstraint; ms: number; endMs: number; dateOnly: boolean } | null {
    const mode = t.constraint
    if (mode !== 'snet' && mode !== 'mso' && mode !== 'fnlt') return null
    const dateStr = typeof t.constraintDate === 'string' ? t.constraintDate.trim() : ''
    const d = parseTaskDate(dateStr)
    if (!d) return null
    const ms = d.getTime()
    const dateOnly = dateStr.length <= 10
    return { mode, ms, endMs: dateOnly ? ms + DAY_MS : ms, dateOnly }
  }

  private weekStart(): number {
    const raw = this.getAttr('first-day-of-week', '')
    if (/^[0-6]$/.test(raw)) return Number(raw)
    return getWeekStart(this.effectiveLocale())
  }

  /** 日期只读（方法名避开 dates-readonly 属性的 camelCase，防 property 赋值遮蔽原型方法） */
  private datesReadonlyOn(): boolean {
    return this.hasAttr('readonly') || this.hasAttr('dates-readonly')
  }

  /** 进度只读（方法名避开 progress-readonly 属性的 camelCase，同上） */
  private progressReadonlyOn(): boolean {
    return this.hasAttr('readonly') || this.hasAttr('progress-readonly')
  }

  // ===== 时间轴模型 =====

  /** 按 scale 步进 n 个单位（month/quarter/year 走日历运算防月末溢出；其余毫秒加减） */
  private static addUnits(d: Date, scale: GanttScale, n: number): Date {
    if (scale === 'hour') return new Date(d.getTime() + n * 3_600_000)
    if (scale === 'day') return new Date(d.getTime() + n * DAY_MS)
    if (scale === 'week') return new Date(d.getTime() + n * 7 * DAY_MS)
    const months = n * (scale === 'month' ? 1 : scale === 'quarter' ? 3 : 12)
    return new Date(d.getFullYear(), d.getMonth() + months, 1)
  }

  /**
   * 宿主托管时间范围（range-start / range-end，ISO 日期）：
   * range-end **含当日**（与任务 end / 本地 endMsOf / oas-resource 托管轴同口径），
   * 返回半开区间 [startMs, endMs)，endMs = range-end **次日** 00:00——直接用当日 00:00 会让
   * hour 档轴尾停在 range-end 当日 00:00 + pad（当日大半无列）。
   * 任一缺失/非法/颠倒（end < start）→ null（回落 rows 派生口径）。
   */
  private hostRangeMs(): { startMs: number; endMs: number } | null {
    const s = parseIsoDayMs(this.getAttr('range-start', ''))
    const e = parseIsoDayMs(this.getAttr('range-end', ''))
    if (s === null || e === null || e < s) return null
    return { startMs: s, endMs: e + DAY_MS }
  }

  private buildUnits(): void {
    const scale = this.scaleMode()
    let minMs = Number.POSITIVE_INFINITY
    let maxMs = Number.NEGATIVE_INFINITY
    // 宿主托管范围（range-*）优先：windowed 下组件只持有部分行，rows min/max 不是全量时间范围；
    // 缺 range-* 时告警一次并回落 rows 派生（轴会随装载窗口重锚，文档建议宿主提供范围）
    const host = this.hostRangeMs()
    if (host) {
      minMs = host.startMs
      maxMs = host.endMs
    } else {
      if (this._winMode.windowed && !this.warnedWindowedRange) {
        this.warnedWindowedRange = true
        devWarn(
          '[oas-gantt] windowed 模式未提供 range-start/range-end，时间轴范围回落已装载数据派生（滚动超出后会重锚）；建议宿主托管轴范围',
        )
      }
      for (const r of this.rows) {
        if (r.startMs < minMs) minMs = r.startMs
        if (r.endMs > maxMs) maxMs = r.endMs
      }
    }
    if (!Number.isFinite(minMs)) {
      const now = Date.now()
      minMs = now
      maxMs = now
    }
    const min = new Date(minMs)
    let anchor: Date
    switch (scale) {
      case 'hour':
        anchor = new Date(min.getFullYear(), min.getMonth(), min.getDate(), min.getHours())
        break
      case 'day':
        anchor = startOfDay(min)
        break
      case 'week': {
        const ws = this.weekStart()
        const diff = (min.getDay() + 7 - ws) % 7
        anchor = new Date(min.getFullYear(), min.getMonth(), min.getDate() - diff)
        break
      }
      case 'month':
        anchor = new Date(min.getFullYear(), min.getMonth(), 1)
        break
      case 'quarter':
        anchor = new Date(min.getFullYear(), Math.floor(min.getMonth() / 3) * 3, 1)
        break
      case 'year':
        anchor = new Date(min.getFullYear(), 0, 1)
        break
    }
    const padStart = SCALE_PAD_START[scale]
    const padEnd = SCALE_PAD_END[scale]
    const locale = this.effectiveLocale()
    let cursor = OASGantt.addUnits(anchor, scale, -padStart)
    const endBound = OASGantt.addUnits(new Date(maxMs), scale, padEnd + 1).getTime()
    const units: TimeUnit[] = []
    let guard = 0
    while (cursor.getTime() < endBound && guard++ < 5000) {
      const next = OASGantt.addUnits(cursor, scale, 1)
      units.push({
        startMs: cursor.getTime(),
        endMs: next.getTime(),
        major: this.majorLabel(cursor, scale, locale),
        minor: this.minorLabel(cursor, scale, locale),
      })
      cursor = next
    }
    this.units = units
    this.majorGroups = buildMajorGroups(units)
    this.canvasW = units.length * this.colW()
    ganttRenderDiag.unitBuilds++ // 仅内部诊断（见 ganttRenderDiag）
  }

  private majorLabel(d: Date, scale: GanttScale, locale: string): string {
    if (scale === 'hour') return formatToken(d, 'MM-dd', locale)
    if (scale === 'day' || scale === 'week' || scale === 'month') return formatToken(d, 'yyyy-MM', locale)
    if (scale === 'quarter') return formatToken(d, 'yyyy', locale)
    return `${Math.floor(d.getFullYear() / 10) * 10}`
  }

  private minorLabel(d: Date, scale: GanttScale, locale: string): string {
    switch (scale) {
      case 'hour':
        return formatToken(d, 'HH:mm', locale)
      case 'day':
        return formatToken(d, 'dd', locale)
      case 'week':
        return `W${isoWeek(d)}`
      case 'month':
        return formatToken(d, 'yyyy-MM', locale)
      case 'quarter':
        return `Q${Math.floor(d.getMonth() / 3) + 1}`
      case 'year':
        return formatToken(d, 'yyyy', locale)
    }
  }

  /** 时间 → LTR 画布 x（px）：单位索引 + 单位内比例（月/季/年不等长按比例内插） */
  private xOf(ms: number): number {
    const units = this.units
    const colW = this.colW()
    if (units.length === 0) return 0
    if (ms <= units[0]!.startMs) return 0
    const last = units[units.length - 1]!
    if (ms >= last.endMs) return units.length * colW
    let lo = 0
    let hi = units.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (ms < units[mid]!.endMs) hi = mid
      else lo = mid + 1
    }
    const u = units[lo]!
    const frac = (ms - u.startMs) / (u.endMs - u.startMs)
    return (lo + frac) * colW
  }

  /** LTR x → 渲染坐标（RTL 镜像：改距右缘） */
  private mirrorX(x: number): number {
    return isRtl(this) ? this.canvasW - x : x
  }

  /** 时间区间的左缘 x → 物理 left（RTL 需再减宽度：镜像的是区间右缘，非左缘） */
  private mirrorCellLeft(xStart: number, width: number): number {
    return isRtl(this) ? this.canvasW - xStart - width : xStart
  }

  // ===== 渲染模型（行树 + 摘要聚合）=====

  private buildRows(): void {
    const tasks = this._tasks
    // 日期助手（windowed 扁平分支与树形分支共用）
    const startMsOf = (t: TG): number => parseTaskDate(t.start)?.getTime() ?? 0
    // 里程碑口径（全局统一）：显式 type:"milestone" 优先（带 end 也算，渲染/聚合/连线锚点一致忽略 end），
    // 其次推导「无 end 且无子级」
    const isMilestoneTask = (t: TG): boolean => t.type === 'milestone' || !t.end
    const endMsOf = (t: TG): number => {
      if (isMilestoneTask(t)) return startMsOf(t)
      const e = parseTaskDate(t.end!)
      if (!e) return startMsOf(t)
      // 日精度 end 含当日（区间右缘 = 次日 00:00）；带时间精度按原值
      return t.end!.length > 10 ? e.getTime() : e.getTime() + DAY_MS
    }
    // windowed 要求**扁平行切片**（与 oas-table 同式）：切片即行序——不递归 children、不受 expanded
    // 影响，绝对行号/loaded 全按扁平行计。含层级/展开语义请在宿主侧展平后喂入：本地递归展开会让
    // 行序（rows）与切片长度（_tasks.length）错位 → 覆盖判定误吞请求、滚动范围内空白且不派发。
    if (this._winMode.windowed) {
      if (!this.warnedWindowedFlat && tasks.some((t) => t.parent != null)) {
        this.warnedWindowedFlat = true
        devWarn(
          '[oas-gantt] windowed 模式要求扁平行切片（tasks 即行序，不递归 children、不受 expanded 影响，绝对行号按扁平行计）；含层级/展开语义请在宿主侧展平后喂入',
        )
      }
      this.expandedSetCache = new Set()
      this.rows = tasks.map((t) => {
        const isMilestone = isMilestoneTask(t)
        const s = startMsOf(t)
        return {
          task: t,
          depth: 0,
          startMs: s,
          endMs: Math.max(endMsOf(t), s),
          progress: typeof t.progress === 'number' ? t.progress : 0,
          isSummary: t.type === 'summary' && !isMilestone,
          isMilestone,
          hasChildren: false,
          posinset: 1,
          setsize: 1,
        }
      })
      this.rebuildRowIndex()
      ganttRenderDiag.rowBuilds++ // 仅内部诊断（见 ganttRenderDiag）
      return
    }
    const byId = new Map<string, TG>()
    for (const t of tasks) byId.set(t.id, t)
    const childMap = new Map<string, string[]>()
    const roots: TG[] = []
    // 父指针成环（A.parent=B、B.parent=A）：环内任务全部互为子级、无根可达 → 整图空白。
    // 全局三色标记（未访问/在途/已定）线性定环：沿 parent 上溯撞到「在途」节点即环，把该节点按根处理
    // （不再挂到父下）并告警一次。已定节点后续直接复用，整体 O(n)，不因深链退化。
    const color = new Map<string, 1 | 2>()
    const broken = new Set<string>()
    for (const t of tasks) {
      if (color.has(t.id)) continue
      const stack: TG[] = []
      let cur: TG | undefined = t
      while (cur && cur.parent && byId.has(cur.parent) && !color.has(cur.id)) {
        color.set(cur.id, 1)
        stack.push(cur)
        cur = byId.get(cur.parent)
      }
      if (cur && cur.parent && byId.has(cur.parent) && color.get(cur.id) === 1) {
        broken.add(cur.id)
        const key = `cycle:${cur.id}`
        if (!this.warnedParents.has(key)) {
          this.warnedParents.add(key)
          devWarn(`[oas-gantt] parent 指针成环，任务 "${cur.id}" 已断环按根节点渲染`)
        }
      }
      for (const n of stack) color.set(n.id, 2)
    }
    for (const t of tasks) {
      if (t.parent && byId.has(t.parent) && !broken.has(t.id)) {
        const list = childMap.get(t.parent!) ?? []
        list.push(t.id)
        childMap.set(t.parent!, list)
      } else {
        if (t.parent && !byId.has(t.parent) && !this.warnedParents.has(t.parent)) {
          this.warnedParents.add(t.parent)
          devWarn(`[oas-gantt] parent "${t.parent}" 不存在，任务 "${t.id}" 已按根节点渲染`)
        }
        roots.push(t)
      }
    }

    // 摘要聚合（递归后代 min/max + 工期加权进度；叶子 = 自身）
    const agg = new Map<string, { startMs: number; endMs: number; progress: number }>()
    const aggregate = (id: string): { startMs: number; endMs: number; progress: number } => {
      const memo = agg.get(id)
      if (memo) return memo
      const t = byId.get(id)!
      const childIds = childMap.get(id) ?? []
      if (childIds.length === 0) {
        const r = {
          startMs: startMsOf(t),
          endMs: Math.max(endMsOf(t), startMsOf(t)),
          progress: typeof t.progress === 'number' ? t.progress : 0,
        }
        agg.set(id, r)
        return r
      }
      let min = Number.POSITIVE_INFINITY
      let max = Number.NEGATIVE_INFINITY
      let weighted = 0
      let totalDays = 0
      for (const cid of childIds) {
        const c = aggregate(cid)
        if (c.startMs < min) min = c.startMs
        if (c.endMs > max) max = c.endMs
        const days = Math.max((c.endMs - c.startMs) / DAY_MS, 0.5)
        weighted += c.progress * days
        totalDays += days
      }
      const r = { startMs: min, endMs: max, progress: totalDays > 0 ? Math.round(weighted / totalDays) : 0 }
      agg.set(id, r)
      return r
    }

    // 同级全集（含折叠子级）：供 treeitem aria-posinset/setsize。用**生效父级**分组——
    // 悬空 parent / 断环节点的任务在树里归根，其同级应为根集合，而非原始 parent 的分组。
    const sibList = new Map<string, string[]>()
    sibList.set(
      '',
      roots.map((r) => r.id),
    )
    for (const [pid, ids] of childMap) sibList.set(pid, ids)
    const posIndex = new Map<string, number>()
    for (const ids of sibList.values()) ids.forEach((id, i) => posIndex.set(id, i + 1))
    const posKey = (t: TG, depth: number): string => (depth === 0 ? '' : (t.parent ?? ''))

    const expanded = this.effectiveExpandedSet(childMap)
    // 缓存：后续渲染窗口（含滚动每帧）直接复用，避免万级任务下每帧重建展开集（O(n) → O(1)）
    this.expandedSetCache = expanded
    const rows: GanttRow[] = []
    const walk = (t: TG, depth: number): void => {
      const childIds = childMap.get(t.id) ?? []
      const hasChildren = childIds.length > 0
      // 形态判定：显式 milestone 优先，但「有子级」恒为摘要（子级承载聚合语义，形态与聚合必须一致）
      const isMilestone = isMilestoneTask(t) && !hasChildren
      // 数据矛盾告警（同任务同类型只告一次，受控反复重写不刷屏）；文案必须与实际形态一致
      if (t.type === 'milestone') {
        if (hasChildren) {
          this.warnMilestone(
            t.id,
            'children',
            `[oas-gantt] 任务 "${t.id}" 声明 type:"milestone" 但有子任务，已按摘要渲染`,
          )
        } else if (t.end) {
          this.warnMilestone(
            t.id,
            'end',
            `[oas-gantt] 任务 "${t.id}" 显式声明 type:"milestone" 但携带 end，已按里程碑渲染（end 忽略）`,
          )
        }
      }
      const isSummary = hasChildren || (t.type === 'summary' && !isMilestone)
      const a = aggregate(t.id)
      const sib = sibList.get(posKey(t, depth)) ?? [t.id]
      rows.push({
        task: t,
        depth,
        startMs: a.startMs,
        endMs: a.endMs,
        progress: a.progress,
        isSummary,
        isMilestone,
        hasChildren,
        posinset: posIndex.get(t.id) ?? 1,
        setsize: sib.length,
      })
      if (hasChildren && expanded.has(t.id)) for (const cid of childIds) walk(byId.get(cid)!, depth + 1)
    }
    for (const r of roots) walk(r, 0)
    this.rows = rows
    this.rebuildRowIndex()
    ganttRenderDiag.rowBuilds++ // 仅内部诊断（见 ganttRenderDiag）
  }

  /**
   * 行 id → rows 下标索引（buildRows 末尾一次性重建）：选择相关路径（行点选 Shift 连选、
   * 键盘 ↑/↓ 连选、scrollToTask、windowed 键盘越界请求）原本各自 `rows.findIndex` /
   * `rows.map(...).indexOf(...)`——万级任务下每次选择都是 O(总量) 扫描。索引只在 buildRows
   * 重建（rows 仅在该处整体替换），选择变化不触碰它，故查询恒为 O(1)。
   */
  private rebuildRowIndex(): void {
    const index = new Map<string, number>()
    for (let i = 0; i < this.rows.length; i++) index.set(this.rows[i]!.task.id, i)
    this.rowIndexById = index
  }

  /** 生效展开集合：受控属性优先；未受控时缺省全展开（数据 expanded:false 为显式收起的例外） */
  private effectiveExpandedSet(childMap: Map<string, string[]>): Set<string> {
    if (this.expandedSet) return this.expandedSet
    const set = new Set<string>()
    for (const t of this._tasks) {
      if (t.expanded !== false && (childMap.has(t.id) || t.type === 'summary')) set.add(t.id)
    }
    return set
  }

  /** 当前展开集合（toggle 用）：优先取 buildRows 缓存；未受控且无缓存时从数据构建
   *  （id 索引 Set 保证万级任务 O(n)——some 线性扫描会 O(n²)） */
  private currentExpandedSet(): Set<string> {
    if (this.expandedSet) return this.expandedSet
    if (this.expandedSetCache) return this.expandedSetCache
    const ids = new Set(this._tasks.map((t) => t.id))
    const childMap = new Map<string, string[]>()
    for (const t of this._tasks) {
      if (t.parent && ids.has(t.parent)) {
        const list = childMap.get(t.parent!) ?? []
        list.push(t.id)
        childMap.set(t.parent!, list)
      }
    }
    return new Set(this.effectiveExpandedSet(childMap))
  }

  private toggleExpand(id: string): void {
    const set = this.currentExpandedSet()
    const next = new Set(set)
    const willExpand = !set.has(id)
    if (willExpand) next.add(id)
    else next.delete(id)
    this.expandedSet = next
    this.expandedAttrCache = JSON.stringify([...next])
    this.setAttribute('expanded', this.expandedAttrCache)
    this.update()
    this.emit('expand-change', { id, expanded: willExpand } satisfies GanttExpandChangeDetail)
  }

  // ===== windowed：服务端行窗口协议（oas-window-request / oas-range-request） =====

  /**
   * 行 i（rows 数组下标）的画布 top（px）：windowed 下按**绝对行号**定位
   * （rows 承载 [window-start, window-start+len) 切片，画布坐标系是全量 total 行）。
   */
  private absRowTop(i: number): number {
    return (this._winMode.windowed ? this._winMode.windowStart + i : i) * this.rowHeightPx()
  }

  /**
   * 行 i 是否斑马纹行（stripe 属性开启时按**全量绝对行号**奇偶判定，与 table/list 同口径；
   * windowed 按 window-start 偏移——按窗口局部序/nth-child 着色会在滚动后整体错位）。
   */
  private isStripeRow(i: number): boolean {
    const abs = this._winMode.windowed ? this._winMode.windowStart + i : i
    return abs % 2 === 1
  }

  /** 画布总行数（滚动域/连线画布/网格/今日线高度基准）：windowed = 全量 total；本地 = rows 数 */
  private layoutRows(): number {
    return this._winMode.windowed ? this._winMode.total : this.rows.length
  }

  /**
   * 按可视行窗口计算期望区间并按需派发 `oas-window-request`（detail `{ start, end, reason }`，
   * 半开、绝对行下标）。去重语义：同一期望区间不重复派发；期望区间被已装载区间覆盖时
   * 重置去重状态（之后覆盖情况变化可对同一区间再派）。
   * 时机：update（init/data）、滚动合帧（scroll）、视口 resize（resize）。
   */
  private requestWindowIfNeeded(reason: WindowRequestReason): void {
    const mode = this._winMode
    if (!mode.windowed || !this.tbody) return
    const vis = computeVirtualWindow(this.tbody.scrollTop, this.viewportH(), this.rowHeightPx(), mode.total, 6)
    const need = expandWindow(vis.start, vis.end, mode.total, WINDOW_MARGIN)
    if (windowCovered(need, mode.loaded)) {
      this.winReq = null
      return
    }
    if (sameWindow(need, this.winReq)) return
    // 先记后派：监听器同步回填时去重状态已就位
    this.winReq = { start: need.start, end: need.end }
    this.emit('window-request', { start: need.start, end: need.end, reason } satisfies WindowRequestDetail)
  }

  /**
   * windowed 下键盘移动越出已装载切片（切片末行 ↓ / 切片首行 ↑）：派发 `oas-window-request`
   * （need 覆盖目标绝对行 ±margin，reason=scroll），宿主回填后目标行可达——不得静默无响应。
   * 目标越出全量边界（<0 / ≥total）或 need 已被装载覆盖时零行为。
   */
  private requestKeyboardWindow(row: GanttRow, forward: boolean): void {
    const mode = this._winMode
    if (!mode.windowed) return
    const idx = this.rowIndexById.get(row.task.id) ?? -1
    if (idx < 0) return
    const target = mode.windowStart + idx + (forward ? 1 : -1)
    if (target < 0 || target >= mode.total) return
    const need = expandWindow(target, target + 1, mode.total, WINDOW_MARGIN)
    if (windowCovered(need, mode.loaded)) return
    // 已有在途请求覆盖目标 → 不重派（宿主回填后即可达，非静默）
    const pending = this.winReq
    if (pending !== null && pending.start <= need.start && need.end <= pending.end) return
    if (sameWindow(need, this.winReq)) return
    // 先记后派：监听器同步回填时去重状态已就位
    this.winReq = { start: need.start, end: need.end }
    this.emit('window-request', { start: need.start, end: need.end, reason: 'scroll' } satisfies WindowRequestDetail)
  }

  /**
   * 轴由宿主托管（提供 range-start/range-end）时按需派发 `oas-range-request`
   * （detail `{ startMs, endMs, reason }`）：可视时间窗前后各扩 1 个视口宽得到 need，
   * `!rangeCovered(need, axis)` 时派发，同 need 去重。非托管（无 range-*）零行为。
   * 视口时间宽 = 视口列数 × 平均单位 ms（month/quarter 不等长按均值近似，端点评估无需精确）。
   */
  private requestRangeIfNeeded(reason: WindowRequestReason): void {
    const units = this.units
    if (!this.hostRangeMs() || units.length === 0) return
    const from = Math.min(Math.max(this.winColStart, 0), units.length - 1)
    const to = Math.min(Math.max(this.winColEnd, from + 1), units.length)
    const visStartMs = units[from]!.startMs
    const visEndMs = units[to - 1]!.endMs
    const viewportMs = (this.viewportW() / this.colW()) * this.avgUnitMs()
    const need = { startMs: Math.floor(visStartMs - viewportMs), endMs: Math.ceil(visEndMs + viewportMs) }
    const axis = { startMs: units[0]!.startMs, endMs: units[units.length - 1]!.endMs }
    if (rangeCovered(need, axis)) {
      this.rangeReq = null
      return
    }
    if (this.rangeReq !== null && this.rangeReq.startMs === need.startMs && this.rangeReq.endMs === need.endMs) return
    // 先记后派：监听器同步回填时去重状态已就位
    this.rangeReq = { ...need }
    this.emit('range-request', { startMs: need.startMs, endMs: need.endMs, reason } satisfies RangeRequestDetail)
  }

  // ===== 生命周期 =====

  /** 缓存节点引用 + 幂等注册滚动同步（render 与水合路径共用） */
  private bind(): void {
    if (!this.hasAttribute('tabindex')) this.tabIndex = -1
    this.coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
    this.ganttEl = this.shadow.querySelector('.gantt')
    this.tbody = this.shadow.querySelector('.tbody')
    this.theadEl = this.shadow.querySelector('.thead')
    this.sideBody = this.shadow.querySelector('.side-body')
    this.sideRows = this.shadow.querySelector('.side-rows')
    this.sideRows?.setAttribute('aria-multiselectable', 'true')
    this.barsEl = this.shadow.querySelector('.bars')
    this.linksEl = this.shadow.querySelector('svg.links')
    this.gridEl = this.shadow.querySelector('.grid-canvas')
    this.innerEl = this.shadow.querySelector('.inner')
    this.todayEl = this.shadow.querySelector('.today-line')
    this.tooltipEl = this.shadow.querySelector('.tooltip')
    this.emptyEl = this.shadow.querySelector('.empty')
    this.tbody?.addEventListener('scroll', this.onScroll, { passive: true })
    // 空白拖拽（框选 / 建任务）：左侧列表与时间轴各一个落点入口
    this.sideBody?.addEventListener('pointerdown', this.onSidePointerDown)
    this.tbody?.addEventListener('pointerdown', this.onTbodyPointerDown)
    // 空白双击新建（creatable 通道）：左侧列表与时间轴各一个落点入口
    this.sideBody?.addEventListener('dblclick', this.onSideDblClick)
    this.tbody?.addEventListener('dblclick', this.onTbodyDblClick)
    // 连线：删除键 + 点空白清选中（函数引用稳定，重复 bind 幂等）
    document.addEventListener('keydown', this.docLinkKey)
    document.addEventListener('click', this.docLinkClick)
    document.addEventListener('keydown', this.docBarDragKey)
    // 首次观测到真实视口宽后自适应列宽（custom element 首连时 clientWidth 可能仍为 0）
    if (typeof ResizeObserver !== 'undefined' && this.tbody) {
      this.resizeObs?.disconnect()
      this.resizeObs = new ResizeObserver(() => this.onViewportResize())
      this.resizeObs.observe(this.tbody)
    }
    this.onCleanup(() => {
      this.tbody?.removeEventListener('scroll', this.onScroll)
      this.sideBody?.removeEventListener('pointerdown', this.onSidePointerDown)
      this.tbody?.removeEventListener('pointerdown', this.onTbodyPointerDown)
      this.sideBody?.removeEventListener('dblclick', this.onSideDblClick)
      this.tbody?.removeEventListener('dblclick', this.onTbodyDblClick)
      this.resizeObs?.disconnect()
      this.resizeObs = null
      this.dragCtx = null
      if (this.scrollRaf) {
        cancelAnimationFrame(this.scrollRaf)
        this.scrollRaf = 0
      }
      this.scrollRafReconcile = false
      this.cancelReparent()
      this.cancelLink()
      this.cancelMarquee()
      this.stopAutoScroll()
      this.unbindRowPending()
      document.removeEventListener('keydown', this.docLinkKey)
      document.removeEventListener('click', this.docLinkClick)
      document.removeEventListener('keydown', this.docBarDragKey)
    })
  }

  /** 断开重连：重挂一次性监听（bind 幂等），否则新加的 document 监听在路由缓存摘挂后永久失效 */
  protected override onReconnect(): void {
    this.bind()
  }

  private onScroll = (): void => {
    if (!this.tbody) return
    const auto = this.autoScrolling
    this.autoScrolling = false
    // 用户滚动（非自动滚动）→ 终止进行中的交互（坐标/锚点失效）；自动滚动则保持拖拽并在重建后重定位
    if (!auto) {
      if (this.dragCtx) this.cancelDrag()
      this.cancelReparent()
      this.cancelLink()
      this.cancelMarquee()
    }
    // 表头平移 / 侧列纵向同步 / tooltip 隐藏保持同步时机（不依赖窗口重建）
    this.syncHeaderOffset()
    if (this.sideBody) this.sideBody.scrollTop = this.tbody.scrollTop
    this.hideTooltip()
    // 窗口重建 rAF 合帧：同一帧内多次 scroll 只跑一次 renderWindow（回调内读最新 scroll 位置，
    // 中间帧的滚动位置不会丢）。自动滚动帧内至少一次 auto scroll → 重建后需 reconcile 重锚拖拽
    if (auto) this.scrollRafReconcile = true
    if (!this.scrollRaf) this.scrollRaf = requestAnimationFrame(this.flushScrollWindow)
  }

  /** onScroll 的合帧下半段：窗口重建 + windowed/range 请求评估 + （自动滚动帧）拖拽重锚 */
  private flushScrollWindow = (): void => {
    this.scrollRaf = 0
    const reconcile = this.scrollRafReconcile
    this.scrollRafReconcile = false
    if (!this.tbody) return
    this.renderWindow()
    this.requestWindowIfNeeded('scroll')
    this.requestRangeIfNeeded('scroll')
    if (reconcile) this.reconcileDrag()
  }

  /**
   * 表头横向对齐：把表头内容按其与内容层 `.inner` 的实际像素差平移。
   * 比 `thead.scrollLeft = tbody.scrollLeft` 更稳——`thead` 在 RTL 下 content 不可滚（scrollLeft 恒 0），
   * 旧写法致 RTL 表头与列/条错位（默认即错位满量）；按 rect 差平移对 LTR/RTL/任意滚动模型一致。
   */
  private syncHeaderOffset(): void {
    if (!this.theadEl || !this.innerEl) return
    const dx = this.innerEl.getBoundingClientRect().left - this.theadEl.getBoundingClientRect().left
    for (const h of this.shadow.querySelectorAll<HTMLElement>('.head-major, .head-minor')) {
      h.style.transform = `translateX(${dx}px)`
    }
  }

  // ===== 拖拽自动滚动（拖到视口边缘自动滚；窗口重建后 reconcile 保持拖拽稳定）=====

  private startAutoScroll(): void {
    if (this.autoScrollRaf) return
    if (!this.dragCtx && !this.reparentCtx && !this.linkCtx) return
    this.autoScrollRaf = requestAnimationFrame(this.autoScrollTick)
  }

  private stopAutoScroll(): void {
    if (this.autoScrollRaf) {
      cancelAnimationFrame(this.autoScrollRaf)
      this.autoScrollRaf = 0
    }
    this.autoScrolling = false
  }

  private autoScrollTick = (): void => {
    this.autoScrollRaf = 0
    const tb = this.tbody
    if (!tb || (!this.dragCtx && !this.reparentCtx && !this.linkCtx)) return
    const r = tb.getBoundingClientRect()
    if (r.height <= 0) {
      this.stopAutoScroll()
      return
    }
    const band = 28
    const maxStep = 24
    const clamp = (v: number): number => Math.max(-maxStep, Math.min(maxStep, Math.ceil(v)))
    let dy = 0
    let dx = 0
    if (this.pointerY < r.top + band) dy = clamp(-((r.top + band - this.pointerY) / band) * maxStep)
    else if (this.pointerY > r.bottom - band) dy = clamp(((this.pointerY - (r.bottom - band)) / band) * maxStep)
    if (this.pointerX < r.left + band) dx = clamp(-((r.left + band - this.pointerX) / band) * maxStep)
    else if (this.pointerX > r.right - band) dx = clamp(((this.pointerX - (r.right - band)) / band) * maxStep)
    // 行重排拖拽发生在左侧栏（物理左缘恒在带内）→ 横向自动滚动无意义且会把时间轴误拉走
    if (this.reparentCtx) dx = 0
    const maxTop = tb.scrollHeight - tb.clientHeight
    if (dy < 0 && tb.scrollTop <= 0) dy = 0
    if (dy > 0 && tb.scrollTop >= maxTop) dy = 0
    // 横向合法域随书写方向：LTR [0, limit]，RTL [-limit, 0]（0 = 画布最右）。
    // 贴缘意图为「物理方向」（贴右缘→视口右移），两侧一致，**不按 RTL 翻号**。
    const limit = tb.scrollWidth - tb.clientWidth
    const minLeft = isRtl(this) ? -limit : 0
    const maxLeft = isRtl(this) ? 0 : limit
    if (dx < 0 && tb.scrollLeft <= minLeft) dx = 0
    if (dx > 0 && tb.scrollLeft >= maxLeft) dx = 0
    if (dy === 0 && dx === 0) {
      this.stopAutoScroll()
      return
    }
    const beforeTop = tb.scrollTop
    const beforeLeft = tb.scrollLeft
    this.autoScrolling = true
    if (dy) tb.scrollTop = Math.max(0, Math.min(maxTop, beforeTop + dy))
    if (dx) tb.scrollLeft = Math.max(minLeft, Math.min(maxLeft, beforeLeft + dx))
    if (tb.scrollTop === beforeTop && tb.scrollLeft === beforeLeft) this.autoScrolling = false
    this.autoScrollRaf = requestAnimationFrame(this.autoScrollTick)
  }

  /** 自动滚动触发窗口重建后，重新锚定进行中的拖拽（条 / 连线临时线 / 行落点） */
  private reconcileDrag(): void {
    if (this.dragCtx) {
      const el = this.barsEl?.querySelector<HTMLElement>(`.bar[data-id="${escId(this.dragCtx.id)}"]`)
      if (el) this.dragCtx.bar = el
      this.applyBarDragVisual(this.pointerX)
    } else if (this.linkCtx) {
      const ctx = this.linkCtx
      if (!ctx.temp.isConnected) {
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        t.setAttribute('class', 'temp-link')
        this.linksEl?.appendChild(t)
        ctx.temp = t
      }
      this.updateLinkTemp(this.pointerX, this.pointerY)
    } else if (this.reparentCtx) {
      this.updateReparentTarget(this.pointerX, this.pointerY)
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="gantt" part="gantt">
        <div class="side" part="side">
          <div class="side-head" part="side-head"></div>
          <div class="side-body" part="side-body">
            <div class="side-inner">
              <div class="side-rows" role="tree"></div>
            </div>
          </div>
        </div>
        <div class="main" part="main">
          <div class="thead" part="thead">
            <div class="head-major"></div>
            <div class="head-minor"></div>
          </div>
          <div class="tbody" part="tbody">
            <div class="inner">
              <div class="grid-canvas"></div>
              <svg class="links"></svg>
              <div class="bars"></div>
              <div class="today-line" aria-hidden="true" hidden></div>
            </div>
          </div>
        </div>
        <div class="tooltip" hidden></div>
        <div class="empty" hidden></div>
      </div>
    `
    this.bind()
    this.update()
  }

  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.gantt')) return false
    if (!this.shadow.querySelector('.tbody')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // 拖拽中数据被外部重写 → 终止拖拽回滚（受控纪律：外部数据为准）
    if (this.dragCtx) this.cancelDrag()
    this.cancelReparent()
    this.cancelLink()
    this.cancelMarquee()
    this.unbindRowPending()
    this.rowPending = null
    this.syncTasks()
    // windowed 模式解析：windowed 属性在场且 total 为合法正数才生效
    //（total 为 0 / 非法 → 回落本地全量模式，行为不变）；退出 windowed 时重置去重/首帧标记
    this._winMode = readWindowedMode(
      this.hasAttr('windowed'),
      Number(this.getAttr('total', '')),
      Number(this.getAttr('window-start', '0')),
      this._tasks.length, // windowed 扁平切片口径：切片即行序，rows.length ≡ _tasks.length
    )
    if (!this._winMode.windowed) {
      // 退出 windowed：清去重态 + 首帧标记（重进同 need 必须重新 init，不得被旧去重态吞成静默）
      this.winReq = null
      this.winInitDone = false
    } else if (this._winMode.loaded.end > this._winMode.total && !this.warnedWindowedOverflow) {
      // 切片越界（window-start + 装载行数 > total）：越界行按 total 夹取不渲染（渲染窗口在 total 上算）。
      // 实例级告警一次，对齐 table / tree / resource / list 的切片越界契约——否则宿主会误以为切片全部生效。
      this.warnedWindowedOverflow = true
      const overflow = this._winMode.loaded.end - this._winMode.total
      devWarn(
        `[oas-gantt] windowed 切片超出全量范围（window-start ${this._winMode.windowStart} + 装载 ${this._tasks.length} 行 > total ${this._winMode.total}），越界 ${overflow} 行不在窗口内（按 total 夹取不渲染）`,
      )
    }
    // 无托管轴（range-* 缺失/非法/颠倒）：清 range 去重态 + 首帧标记（移除再挂回重新 init）
    if (this.hostRangeMs() === null) {
      this.rangeReq = null
      this.rangeInitDone = false
    }
    const prunedSel = this.pruneStateToTasks()
    this.syncExpanded()
    // 高度协议（与 oas-resource 同协议）：height 属性在场且为合法长度（纯数字 / Npx，>0）时，
    // 把高度写进**组件自有自定义属性** --oas-gantt-height（.gantt 规则高度即 var(--oas-gantt-height, 320px)）。
    // 属性为空串/空白/未提供/被移除/非法时：**只有本实例此前写过**（heightApplied）才 removeProperty
    // 归零——移除后回落 token 缺省 320 或宿主 CSS，DSD 快照自写值不残留；
    // 从未写过时绝不动宿主自己内联设的 --oas-gantt-height（① token 通道：宿主内联 token 生效）。
    // 关键：组件**从不触碰宿主自身的 height 内联**——宿主内联 height 优先级更高，天然优先。
    const heightRaw = this.heightAttrValue()
    if (heightRaw != null) {
      const n = Number(heightRaw.replace(/px$/i, '').trim())
      if (Number.isFinite(n) && n > 0) {
        this.style.setProperty('--oas-gantt-height', `${n}px`)
        this.heightApplied = true
      } else if (this.heightApplied) {
        // 非法值 → 清除自写值回落（token 缺省 320 / 宿主 CSS 优先）
        this.style.removeProperty('--oas-gantt-height')
        this.heightApplied = false
      }
    } else if (this.heightApplied) {
      this.style.removeProperty('--oas-gantt-height')
      this.heightApplied = false
    }
    this.toggleAttribute('data-rtl', isRtl(this))
    this.buildRows()
    // 摘要行带 constraint 无意义（日期派生）→ 告警一次
    for (const r of this.rows) {
      if (r.hasChildren && r.task.constraint) {
        this.warnOnce(
          `constraint-summary:${r.task.id}`,
          `[oas-gantt] 摘要任务 "${r.task.id}" 的 constraint 已忽略（摘要日期由子级派生）`,
        )
      }
    }
    // 关键路径：critical 仅 show-critical-path 开启时算；conflict（违约）在 show-critical-path 或 auto-schedule 开启时都算（违约应可见）。
    // windowed 下组件只持有已装载切片，CPM/违约判定需要完整依赖图——部分数据上计算会得到错误
    // 结果（未装载前置/后继缺失），跳过并 devWarn 一次（宿主可在服务端计算后自行标注/过滤）。
    const cpOn = this.showCriticalPathOn()
    const confOn = cpOn || this.autoScheduleOn()
    if (this._winMode.windowed && confOn) {
      if (cpOn && !this.warnedWindowedCritical) {
        this.warnedWindowedCritical = true
        devWarn(
          '[oas-gantt] windowed 模式下关键路径/违约判定需要全量数据，已跳过本地计算（部分数据上会得到错误结果）；请宿主在全量数据上计算后自行标注',
        )
      }
      this.criticalIds = new Set()
      this.conflictIds = new Set()
    } else {
      const cp = confOn ? this.criticalPathIds() : null
      this.criticalIds = cpOn && cp ? cp.critical : new Set()
      this.conflictIds = confOn && cp ? cp.conflict : new Set()
    }
    const scale = this.scaleMode()
    if (this.lastScale === '') {
      this.lastScale = scale // 首次吸收不派发
    } else if (this.lastScale !== scale) {
      this.lastScale = scale
      this.emit('scale-change', { scale } satisfies GanttScaleChangeDetail)
    }
    this.buildUnits()
    this.computeColW()
    this.canvasW = this.units.length * this.colW()
    // 画布高度按 layoutRows()（windowed = 全量 total，滚动域覆盖未装载行占位）
    const layoutCount = this.layoutRows()
    if (this.innerEl) {
      this.innerEl.style.width = `${this.canvasW}px`
      this.innerEl.style.height = `${layoutCount * this.rowHeightPx()}px`
    }
    const sideInner = this.shadow.querySelector<HTMLElement>('.side-inner')
    if (sideInner) sideInner.style.height = `${Math.max(layoutCount * this.rowHeightPx(), 1)}px`
    // 空态只按本地模式判定：windowed 下 tasks 空 = 「尚未装载」（全量意义上数据存在），不误显空态
    const isEmpty = !this._winMode.windowed && this._tasks.length === 0
    if (this.emptyEl) {
      this.emptyEl.hidden = !isEmpty
      if (isEmpty) {
        const tpl = this.querySelector('template[slot="empty"]')
        if (tpl instanceof HTMLTemplateElement) {
          this.emptyEl.innerHTML = ''
          this.emptyEl.appendChild(tpl.content.cloneNode(true))
        } else {
          this.emptyEl.textContent = this.t('gantt.empty')
        }
      }
    }
    if (this.tbody) this.tbody.style.visibility = isEmpty ? 'hidden' : ''
    const sideLabel = this.shadow.querySelector('.side-rows')
    if (sideLabel) {
      sideLabel.setAttribute('aria-label', this.t('gantt.listLabel'))
      // 行位 ARIA 走 treeitem 合法属性（posinset/setsize/level，见 renderSideRows）：
      // tree / treeitem 不接受 aria-rowcount / aria-rowindex（axe aria-allowed-attr），
      // 全量口径由行上的 setsize 承载，不再在容器写 rowcount。
      sideLabel.removeAttribute('aria-rowcount')
    }
    // 列窗口先于表头切片计算（表头/网格都按窗口渲染；renderWindow 内会再算一次，幂等）
    this.computeColWindow()
    this.renderHeader()
    this.renderWindow()
    this.renderToday()
    this.syncHeaderOffset()
    // 数据重写后收敛出的选中变化统一在此补发（property/attribute 两通道一致）
    if (prunedSel) this.emitSelectionChange()
    // auto-schedule：每次 update 后规整（幂等——无违约时零改动零事件）；
    // 覆盖挂载即开/运行期开启，以及运行期改 workdays/holidays/整体重写 tasks 等场景。
    // windowed 下禁用（依赖图不完整，部分数据上排程会得到错误结果）→ 跳过并 devWarn 一次
    if (this.autoScheduleOn()) {
      if (this._winMode.windowed) {
        if (!this.warnedWindowedSchedule) {
          this.warnedWindowedSchedule = true
          devWarn(
            '[oas-gantt] windowed 模式下 auto-schedule 需要完整依赖图，已跳过联动排程（部分数据上排程会得到错误结果）；请宿主在服务端完成排程后回填数据',
          )
        }
      } else {
        this.reschedule()
      }
    }
    // windowed / range 请求评估（update 触发：init / data；滚动与 resize 在各自路径评估）。
    // init 标志只在**对应模式激活**时置位：非激活的 update 不得把它写成 true——否则退出
    // windowed / 移除 range-* 后重进会被旧标志吞成 reason=data（首帧 init 丢失）。
    this.requestWindowIfNeeded(this.winInitDone ? 'data' : 'init')
    if (this._winMode.windowed) this.winInitDone = true
    this.requestRangeIfNeeded(this.rangeInitDone ? 'data' : 'init')
    if (this.hostRangeMs() !== null) this.rangeInitDone = true
  }

  /**
   * 数据收敛：剪掉指向已不存在任务的选中/锚点/活动行/揭示态。
   * 返回选中集合是否被剪（供 update() 补发 selection-change）。三通道共用：
   * property setter、attribute（syncTasks）、removeTasks 都经 update()。
   */
  private pruneStateToTasks(): boolean {
    const ids = new Set(this._tasks.map((t) => t.id))
    let prunedSel = false
    for (const id of this.selected) {
      if (!ids.has(id)) {
        prunedSel = true
        break
      }
    }
    if (prunedSel) this.selected = new Set([...this.selected].filter((id) => ids.has(id)))
    if (this.selectionAnchor && !ids.has(this.selectionAnchor)) this.selectionAnchor = null
    if (this.activeRowId && !ids.has(this.activeRowId)) this.activeRowId = null
    if (this.touchActiveId && !ids.has(this.touchActiveId)) this.touchActiveId = null
    return prunedSel
  }

  /**
   * 双层刻度表头（上层主刻度相邻同标签合并 + 下层辅刻度逐格）。
   * 横向列虚拟化：只渲染 [winColStart, winColEnd) 窗口内的格——主刻度保留「与窗口相交」的组
   * （组跨 [gStart,gEnd)，相交判据 gStart < winColEnd && gEnd > winColStart）；
   * left/width 仍按全局列索引写（表头容器经 syncHeaderOffset 整体平移，平移基准不变）。
   */
  private renderHeader(): void {
    const major = this.shadow.querySelector('.head-major')
    const minor = this.shadow.querySelector('.head-minor')
    if (!major || !minor) return
    const colW = this.colW()
    major.innerHTML = ''
    minor.innerHTML = ''
    const frag1 = document.createDocumentFragment()
    const frag2 = document.createDocumentFragment()
    const from = this.winColStart
    const to = this.winColEnd
    // 主刻度取预计算分组（buildUnits 时点，见 buildMajorGroups）：组有序不相交 → endCol 单调递增，
    // 二分定位首个与窗口相交的组（endCol > from），顺序输出直到 startCol >= to——
    // 相交判据与旧全列扫描逐格一致（startCol < to && endCol > from），每帧成本
    // O(log 组数 + 窗口内组数)，不再随总列数线性（1M 列目标：10 年 day 档滚动帧不再扫 3658 列）
    const groups = this.majorGroups
    let lo = 0
    let hi = groups.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (groups[mid]!.endCol > from) hi = mid
      else lo = mid + 1
    }
    for (let g = lo; g < groups.length; g++) {
      const grp = groups[g]!
      if (grp.startCol >= to) break
      const cell = document.createElement('div')
      cell.className = 'unit'
      cell.textContent = grp.label
      cell.style.left = `${this.mirrorCellLeft(grp.startCol * colW, (grp.endCol - grp.startCol) * colW)}px`
      cell.style.width = `${(grp.endCol - grp.startCol) * colW}px`
      frag1.appendChild(cell)
    }
    // 辅刻度抽稀：列宽不足以容纳标签 + 间隙时按 N 取一显示（保留全部格线，只隐藏文本），
    // 防止窄容器下双位日号/月号首尾相接成一团。决策按全列标签计算并缓存（见 visibleMinorCache），
    // 窗口内逐格查集——与旧实现逐帧全量计算产物完全一致
    const scale = this.scaleMode()
    let cache = this.visibleMinorCache
    if (!cache || cache.units !== this.units || cache.scale !== scale || cache.colW !== colW) {
      cache = {
        units: this.units,
        scale,
        colW,
        set: new Set(
          pickVisibleLabels(
            this.units.map((u) => u.minor),
            colW,
            SCALE_STRIDES[scale],
          ),
        ),
      }
      this.visibleMinorCache = cache
    }
    const visible = cache.set
    for (let k = from; k < to; k++) {
      const cell = document.createElement('div')
      cell.className = 'unit'
      if (visible.has(k)) {
        cell.textContent = this.units[k]!.minor
      } else {
        cell.classList.add('blank')
      }
      // 轴首格不画左缘线（窗口切片后首个渲染格可能是轴中段 → 按全局索引判定，不能用 :first-child）
      if (k === 0) cell.classList.add('axis-start')
      cell.style.left = `${this.mirrorCellLeft(k * colW, colW)}px`
      cell.style.width = `${colW}px`
      frag2.appendChild(cell)
    }
    major.appendChild(frag1)
    minor.appendChild(frag2)
  }

  /** 虚拟窗口：只渲染可视行（+buffer）与可视列（+buffer）——名称列、任务条、依赖连线、背景列/表头全部窗口化 */
  private renderWindow(): void {
    if (!this.tbody || !this.innerEl) return
    const rowH = this.rowHeightPx()
    // 行虚拟化窗口在 layoutRows()（windowed = 全量 total）上算；windowed 再与已装载切片
    // 求交得**局部渲染窗口**（winStart/winEnd 保持 rows 数组下标语义），定位走 absRowTop（绝对行号）
    const win = computeVirtualWindow(this.tbody.scrollTop, this.viewportH(), rowH, this.layoutRows(), 6)
    if (this._winMode.windowed) {
      const ws = this._winMode.windowStart
      const len = this.rows.length
      this.winStart = Math.min(Math.max(win.start - ws, 0), len)
      this.winEnd = Math.min(Math.max(win.end - ws, 0), len)
    } else {
      this.winStart = win.start
      this.winEnd = win.end
    }
    // 列窗口变化（横向滚动/视口宽变）→ 表头按新窗口重切片；纵向滚动窗口不变则跳过重建
    const prevColStart = this.winColStart
    const prevColEnd = this.winColEnd
    this.computeColWindow()
    if (this.winColStart !== prevColStart || this.winColEnd !== prevColEnd) this.renderHeader()
    this.renderSideRows()
    this.renderStripes()
    this.renderBars()
    this.renderGrid()
    this.renderLinks()
    this.renderToday()
  }

  private viewportH(): number {
    // happy-dom 无布局：clientHeight 为 0 时回落 height 属性值
    return this.tbody && this.tbody.clientHeight > 10 ? this.tbody.clientHeight : this.heightPx()
  }

  private viewportW(): number {
    // happy-dom 无布局：clientWidth 为 0 时回落画布全宽（窗口覆盖全部列，无测量环境行为不变）
    return this.tbody && this.tbody.clientWidth > 10 ? this.tbody.clientWidth : this.canvasW
  }

  /**
   * 横向列窗口：复用 computeVirtualWindow（轴无关），按 scrollLeft/clientWidth/列宽切窗口。
   * RTL 下 scrollLeft 为负值模型（0 在画布最右、向左滚为负），取绝对值后与 LTR 的
   * 「距画布起点距离」同构 → 同一窗口数学。
   */
  private computeColWindow(): void {
    const win = computeVirtualWindow(
      Math.abs(this.tbody?.scrollLeft ?? 0),
      this.viewportW(),
      this.colW(),
      this.units.length,
      4,
    )
    this.winColStart = win.start
    this.winColEnd = win.end
  }

  /** 左列名称树（窗口行） */
  private renderSideRows(): void {
    const container = this.sideRows
    if (!container) return
    // 重建前若焦点在行上（键盘跨窗口导航等触发重建），重建后补回焦点（浏览器 scroll 事件异步、会二次重建）
    const hadRowFocus =
      this.shadow.activeElement instanceof HTMLElement && this.shadow.activeElement.classList.contains('row-name')
    // 重建会销毁重命名输入框（部分引擎不触发 blur）→ 复位防卡死
    this.renaming = false
    container.innerHTML = ''
    const rowH = this.rowHeightPx()
    const expanded = this.currentExpandedSet()
    const rowTpl = this.querySelector('template[slot="row"]')
    const prevActive = this.activeRowId
    const inWindow = this.rows.slice(this.winStart, this.winEnd).some((r) => r.task.id === prevActive)
    const activeId = inWindow ? prevActive : (this.rows[this.winStart]?.task.id ?? null)
    this.activeRowId = activeId
    const frag = document.createDocumentFragment()
    for (let i = this.winStart; i < this.winEnd; i++) {
      const row = this.rows[i]!
      const el = document.createElement('div')
      el.className = 'row-name'
      el.dataset.key = row.task.id
      el.setAttribute('role', 'treeitem')
      el.setAttribute('aria-level', String(row.depth + 1))
      if (this._winMode.windowed) {
        // windowed：posinset/setsize 按**全量**（total）与绝对行号（1 基）——切片局部序号会向
        // 辅助技术报错位置。treeitem 不接受 aria-rowindex（行位由 posinset/setsize 表达）。
        const abs = this._winMode.windowStart + i + 1
        el.setAttribute('aria-posinset', String(abs))
        el.setAttribute('aria-setsize', String(this._winMode.total))
        el.removeAttribute('aria-rowindex')
      } else {
        el.setAttribute('aria-posinset', String(row.posinset))
        el.setAttribute('aria-setsize', String(row.setsize))
        el.removeAttribute('aria-rowindex')
      }
      el.style.top = `${this.absRowTop(i)}px`
      el.style.setProperty('--indent', `${8 + row.depth * 16}px`)
      el.setAttribute('part', 'row-name')
      // 行斑马纹（stripe 属性）：绝对行号奇数行行名同步底色（与时间轴条纹同口径）
      if (this.stripeOn() && this.isStripeRow(i)) el.setAttribute('data-stripe', '')
      el.tabIndex = row.task.id === activeId ? 0 : -1
      // 选中态：与局部 patch 同一写入函数（syncSelection），两条路径产物恒一致
      this.writeRowSelectionState(el, this.selected.has(row.task.id))
      el.addEventListener('focus', () => this.setActiveRow(row.task.id))
      // 关键路径标记（show-critical-path 开启时 criticalIds 非空；关闭时空集 → 零影响）
      if (this.criticalIds.has(row.task.id)) el.classList.add('critical')
      if (this.conflictIds.has(row.task.id)) el.classList.add('conflict')
      if (row.task.disabled === true) {
        el.setAttribute('disabled', '')
        el.setAttribute('aria-disabled', 'true')
      }
      if (!this._winMode.windowed) {
        // 行重排手柄：pointerdown 事件冒泡到行，走 onRowPointerDown 的统一入口
        // （自带 e.button/多 ctx 互斥守卫 + 判拖阈值），避免自建 handler 漏守卫与误触发。
        // 细指针悬停/聚焦显形，粗指针常显；windowed 下不出手柄（行重排已禁用）。
        const drag = document.createElement('span')
        drag.className = 'row-drag'
        drag.setAttribute('aria-hidden', 'true')
        drag.textContent = '⋮⋮'
        el.appendChild(drag)
      }
      if (row.hasChildren) {
        const expandedNow = expanded.has(row.task.id)
        el.setAttribute('aria-expanded', String(expandedNow))
        const toggle = document.createElement('button')
        toggle.type = 'button'
        toggle.className = 'toggle'
        toggle.setAttribute('aria-expanded', String(expandedNow))
        toggle.setAttribute('aria-label', this.t(expandedNow ? 'gantt.collapse' : 'gantt.expand'))
        toggle.textContent = expandedNow ? '−' : '+'
        toggle.addEventListener('click', (e) => {
          e.stopPropagation()
          this.toggleExpand(row.task.id)
        })
        el.appendChild(toggle)
      }
      const name = document.createElement('span')
      name.className = 'name'
      if (rowTpl instanceof HTMLTemplateElement) {
        // 行名列自定义模板：宿主可渲染「负责人」等任意列/控件（[data-task-name] 自动填任务名）
        name.appendChild(rowTpl.content.cloneNode(true))
        name.querySelectorAll<HTMLElement>('[data-task-name]').forEach((n) => {
          n.textContent = row.task.name
        })
      } else {
        name.textContent = row.task.name
        if (!this.hasAttr('readonly') && row.task.disabled !== true) {
          name.addEventListener('dblclick', (e) => {
            e.stopPropagation()
            this.startRename(row, name)
          })
        }
      }
      el.appendChild(name)
      // 行内新建（creatable）：只读与任务级禁用行不出按钮
      if (this.hasAttr('creatable') && !this.hasAttr('readonly') && row.task.disabled !== true) {
        const add = document.createElement('button')
        add.type = 'button'
        add.className = 'row-add'
        add.setAttribute('aria-label', this.t(row.hasChildren ? 'gantt.addChild' : 'gantt.addTask'))
        add.textContent = '＋'
        add.addEventListener('click', (e) => {
          e.stopPropagation()
          this.onRowAdd(row)
        })
        el.appendChild(add)
      }
      el.addEventListener('pointerdown', (e) => this.onRowPointerDown(e as PointerEvent, row))
      el.addEventListener('keydown', (e) => this.onRowKeyDown(e as KeyboardEvent, row))
      frag.appendChild(el)
    }
    container.appendChild(frag)
    // 仅当原活动行仍在窗口内才补回焦点（跨窗口的键盘导航）；用户手动滚动致活动行出窗不抢焦点
    if (hadRowFocus && prevActive && prevActive === activeId) {
      container.querySelector<HTMLElement>(`.row-name[data-key="${escId(activeId)}"]`)?.focus({ preventScroll: true })
    }
  }

  /** 任务条层（窗口行）：task / milestone / summary 三形态 + 手柄 + 标签 + task-render 通道 */
  private renderBars(): void {
    const container = this.barsEl
    if (!container) return
    container.innerHTML = ''
    const rowH = this.rowHeightPx()
    const colW = this.colW()
    const rtl = isRtl(this)
    const tplTask = this.querySelector('template[slot="task"]')
    const roDates = this.datesReadonlyOn()
    const roProgress = this.progressReadonlyOn()
    const frag = document.createDocumentFragment()
    for (let i = this.winStart; i < this.winEnd; i++) {
      const row = this.rows[i]!
      const disabled = row.task.disabled === true
      const bar = document.createElement('div')
      bar.className = 'bar'
      bar.dataset.id = row.task.id
      bar.setAttribute('part', 'bar')
      // 选中态：与局部 patch 同一写入函数（syncSelection），两条路径产物恒一致
      this.writeBarSelectionState(bar, this.selected.has(row.task.id))
      if (this.criticalIds.has(row.task.id)) bar.classList.add('critical')
      if (this.conflictIds.has(row.task.id)) bar.classList.add('conflict')
      // 触屏：点条揭示连线点（无 hover，重建后按记录恢复）
      if (this.coarse) {
        if (this.touchActiveId === row.task.id) bar.classList.add('touch-active')
        bar.addEventListener('pointerdown', () => this.revealDots(row.task.id))
      }
      bar.style.top = `${this.absRowTop(i) + (rowH - (row.isSummary ? 8 : 22)) / 2}px`
      if (row.task.color) bar.style.setProperty('--oas-gantt-bar-color', row.task.color)
      if (disabled) {
        bar.setAttribute('disabled', '')
        bar.setAttribute('aria-disabled', 'true')
      }

      if (row.isMilestone) {
        bar.classList.add('milestone')
        const center = this.mirrorX(this.xOf(row.startMs) + colW / 2)
        bar.style.left = `${center - 8}px`
        bar.style.width = '16px'
        const dia = document.createElement('span')
        dia.className = 'dia'
        dia.style.left = '50%'
        bar.appendChild(dia)
        bar.setAttribute('role', 'button')
        bar.tabIndex = 0
        bar.setAttribute(
          'aria-label',
          this.t('gantt.milestoneAria', { name: row.task.name, date: this.fmtDay(row.startMs) }),
        )
      } else {
        const x1 = this.xOf(row.startMs)
        const x2 = this.xOf(row.endMs)
        const w = Math.max(x2 - x1, 2)
        bar.style.left = `${this.mirrorX(x1) - (rtl ? w : 0)}px`
        bar.style.width = `${w}px`
        if (row.isSummary) {
          bar.classList.add('summary')
        } else {
          const pos = this.labelPositionMode()
          if (pos !== 'none') bar.classList.add(`label-${pos}`)
          bar.setAttribute('role', 'button')
          bar.tabIndex = 0
          bar.setAttribute(
            'aria-label',
            this.t('gantt.taskAria', {
              name: row.task.name,
              start: this.fmtDay(row.startMs),
              end: this.fmtDay(row.endMs - 1),
              progress: row.progress,
            }),
          )
          const prog = document.createElement('span')
          prog.className = 'bar-progress'
          prog.style.width = `${row.progress}%`
          bar.appendChild(prog)
          // 条旁/条内标签：仅 label-position 显式开启时渲染（缺省 none，避免与行名重复）
          if (pos !== 'none') {
            const label = document.createElement('span')
            label.className = 'bar-label'
            if (tplTask instanceof HTMLTemplateElement) {
              label.appendChild(tplTask.content.cloneNode(true))
              const bound = label.querySelector<HTMLElement>('[data-task-name]')
              if (bound) bound.textContent = row.task.name
            } else {
              label.textContent = row.task.name
            }
            bar.appendChild(label)
          }
          // 手柄（只读/禁用态不出手柄，视觉即语义）
          if (!roDates && !disabled) {
            const hs = document.createElement('span')
            hs.className = 'handle handle-start'
            bar.appendChild(hs)
            const he = document.createElement('span')
            he.className = 'handle handle-end'
            bar.appendChild(he)
          }
          if (!roProgress && !disabled && row.task.end) {
            const ph = document.createElement('span')
            ph.className = 'progress-handle'
            ph.style.insetInlineStart = `${row.progress}%`
            bar.appendChild(ph)
          }
        }
      }

      // 基线对比条（计划 vs 实际）：置于实际条之下，只读展示
      if (this.baselineOn() && row.task.baseline && !row.isMilestone) {
        const b = row.task.baseline
        const bs = parseTaskDate(b.start)?.getTime()
        const beParsed = b.end ? parseTaskDate(b.end)?.getTime() : undefined
        if (bs !== undefined) {
          const be = beParsed !== undefined ? (b.end!.length > 10 ? beParsed : beParsed + DAY_MS) : bs
          const bx1 = this.xOf(bs)
          const bEnd = Math.max(be, bs)
          const bw = Math.max(this.xOf(bEnd) - bx1, 2)
          const barH = row.isSummary ? 8 : 22
          const bl = document.createElement('div')
          bl.className = 'baseline'
          bl.dataset.id = row.task.id
          bl.setAttribute('part', 'baseline')
          bl.style.top = `${this.absRowTop(i) + (rowH - barH) / 2 + barH + 2}px`
          bl.style.left = `${this.mirrorX(bx1) - (rtl ? bw : 0)}px`
          bl.style.width = `${bw}px`
          bl.title = this.baselineDeltaText(row, bEnd)
          frag.appendChild(bl)
        }
      }
      // 连线点（拖拽建依赖）：仅非只读态渲染，悬停显现（disabled 任务可作**前置**，故仍渲染）
      // 里程碑 start==end，两点几何重合易误判类型 → 只出「完成端」单点（fs 惯例）
      if (!this.hasAttr('readonly')) {
        for (const ep of row.isMilestone ? (['end'] as const) : (['start', 'end'] as const)) {
          const dot = document.createElement('span')
          dot.className = `link-dot link-${ep}`
          dot.dataset.id = row.task.id
          dot.setAttribute('part', 'link-dot')
          dot.setAttribute('aria-hidden', 'true')
          dot.addEventListener('pointerdown', (e) => {
            e.stopPropagation()
            this.onLinkDotPointerDown(e as PointerEvent, row, i, ep)
          })
          dot.addEventListener('click', (e) => e.stopPropagation()) // 防冒泡到条触发 task-click
          bar.appendChild(dot)
        }
      }
      this.bindBar(bar, row)
      frag.appendChild(bar)
      this.emit('task-render', { task: this.taskSnapshot(row.task), element: bar } satisfies GanttTaskRenderDetail)
    }
    container.appendChild(frag)
  }

  private fmtDay(ms: number): string {
    return toISODate(new Date(ms))
  }

  private taskSnapshot(t: TG): GanttTask {
    const copy: GanttTask = { ...t }
    if (copy.dependencies) copy.dependencies = copy.dependencies.map((d) => ({ ...d }))
    if (copy.baseline) copy.baseline = { ...copy.baseline }
    delete copy.children
    return copy
  }

  private bindBar(bar: HTMLElement, row: GanttRow): void {
    bar.addEventListener('click', () => {
      this.emit('task-click', { id: row.task.id, task: this.taskSnapshot(row.task) } satisfies GanttTaskClickDetail)
    })
    bar.addEventListener('dblclick', () => {
      this.emit('task-dblclick', { id: row.task.id, task: this.taskSnapshot(row.task) } satisfies GanttTaskClickDetail)
    })
    bar.addEventListener('pointerdown', (e) => this.onBarPointerDown(e as PointerEvent, row, bar))
    bar.addEventListener('keydown', (e) => this.onBarKeyDown(e as KeyboardEvent, row))
    bar.addEventListener('mouseenter', () => this.showTooltip(row, bar))
    bar.addEventListener('mouseleave', () => this.hideTooltip())
  }

  // ===== 拖拽三件套（改期 / 拉伸 / 进度）：pointer 序列，收口（pointerup）一次性写回 + 派发 =====
  //
  // move/up/cancel 统一挂 document（冒泡终点）：setPointerCapture 在部分引擎对合成指针不生效
  // （实测 Firefox），capture 失败后拖出条元素的指针事件不再经过条本身——document 层监听在
  // 两个引擎都是可靠路径；capture 仅保留为指针快速移出窗口时的视觉辅助，不作事件依赖。

  private docPointerMove = (e: PointerEvent): void => {
    if (this.dragCtx) this.onBarPointerMove(e)
  }
  private docPointerUp = (e: PointerEvent): void => {
    if (!this.dragCtx) return
    this.unbindDocDrag()
    this.onBarPointerUp(e)
  }
  private docPointerCancel = (): void => {
    if (!this.dragCtx) return
    this.unbindDocDrag()
    this.cancelDrag()
  }

  private bindDocDrag(): void {
    document.addEventListener('pointermove', this.docPointerMove)
    document.addEventListener('pointerup', this.docPointerUp)
    document.addEventListener('pointercancel', this.docPointerCancel)
  }

  private unbindDocDrag(): void {
    document.removeEventListener('pointermove', this.docPointerMove)
    document.removeEventListener('pointerup', this.docPointerUp)
    document.removeEventListener('pointercancel', this.docPointerCancel)
  }

  // ===== 行拖拽改父子 / 重排（左侧名称列）=====

  private docReparentMove = (e: PointerEvent): void => {
    if (this.reparentCtx) this.onReparentMove(e)
  }
  private docReparentUp = (): void => {
    this.onReparentUp()
  }
  private docReparentCancel = (): void => {
    this.cancelReparent()
  }
  private docReparentKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.cancelReparent()
  }

  private bindDocReparent(): void {
    document.addEventListener('pointermove', this.docReparentMove)
    document.addEventListener('pointerup', this.docReparentUp)
    document.addEventListener('pointercancel', this.docReparentCancel)
    document.addEventListener('keydown', this.docReparentKey)
  }

  private unbindDocReparent(): void {
    document.removeEventListener('pointermove', this.docReparentMove)
    document.removeEventListener('pointerup', this.docReparentUp)
    document.removeEventListener('pointercancel', this.docReparentCancel)
    document.removeEventListener('keydown', this.docReparentKey)
  }

  private onRowPointerDown(e: PointerEvent, row: GanttRow): void {
    if (e.button !== 0 || this.reparentCtx || this.dragCtx || this.linkCtx || this.rowPending) return
    if (
      (e.target as HTMLElement).closest(
        '.toggle, .rename-input, .row-add, input, select, textarea, button, [contenteditable], [data-no-row-drag]',
      )
    )
      return
    // 先待定：位移阈值才进入重排，否则收口视作点击（多选）。readonly 允许多选，仅拖拽重排被禁止。
    this.rowPending = {
      id: row.task.id,
      x: e.clientX,
      y: e.clientY,
      disabled: row.task.disabled === true,
      // 手柄起手：判拖阈值后进重排；纯点按（未达阈值）不进选择，避免「点手柄改了选中」
      viaHandle: (e.target as HTMLElement).classList.contains('row-drag'),
      textTarget: !!(e.target as HTMLElement).closest('.name'),
      byId: new Map(this._tasks.map((t) => [t.id, t])),
    }
    this.bindRowPending()
  }

  private onReparentMove(e: PointerEvent): void {
    this.pointerX = e.clientX
    this.pointerY = e.clientY
    this.updateReparentTarget(e.clientX, e.clientY)
    this.startAutoScroll()
  }

  private updateReparentTarget(clientX: number, clientY: number): void {
    const ctx = this.reparentCtx
    const side = this.sideBody
    if (!ctx || !side) return
    const rect = side.getBoundingClientRect()
    const rowH = this.rowHeightPx()
    const y = clientY - rect.top + side.scrollTop
    // 指针 y 对应**画布绝对行**（windowed 下含 window-start 偏移），换算回 rows 局部下标找目标行
    const absIdx = Math.max(0, Math.min(this.layoutRows() - 1, Math.floor(y / rowH)))
    const idx = absIdx - (this._winMode.windowed ? this._winMode.windowStart : 0)
    const target = this.rows[idx]
    if (!target) return
    const localY = y - absIdx * rowH
    const x = isRtl(this) ? rect.right - clientX : clientX - rect.left
    const indent = 8 + target.depth * 16
    let mode: 'before' | 'after' | 'inside' = localY < rowH / 2 ? 'before' : 'after'
    // 指针越过目标缩进一定量 → 落为目标子级（右半区下压生效）
    if (x > indent + 24 && rowH - localY > 8) mode = 'inside'
    // disabled 目标禁止 drop-inside（改其结构归属，进而改派生聚合）；前/后同级插入只改父级子序，不动 disabled 自身
    if (!this.canReparent(ctx.id, target.task.id, ctx.byId) || (target.task.disabled === true && mode === 'inside')) {
      this.reparentTarget = null
      this.hideDropLine()
      return
    }
    this.reparentTarget = { id: target.task.id, mode }
    this.showDropLine(idx, target, mode, rowH)
  }

  private onReparentUp(): void {
    this.stopAutoScroll()
    const ctx = this.reparentCtx
    const target = this.reparentTarget
    this.reparentCtx = null
    this.reparentTarget = null
    this.unbindDocReparent()
    this.hideDropLine()
    if (!ctx || !target) return
    this.applyReparent(ctx.id, target.id, target.mode)
  }

  private cancelReparent(): void {
    this.stopAutoScroll()
    if (!this.reparentCtx) return
    this.reparentCtx = null
    this.reparentTarget = null
    this.unbindDocReparent()
    this.hideDropLine()
  }

  /** 目标不得是拖拽件自身或其后代（防环；成环数据用访问集防死循环；byId 由调用方缓存传入） */
  private canReparent(dragId: string, targetId: string, byId: Map<string, TG>): boolean {
    if (dragId === targetId) return false
    const seen = new Set<string>()
    let cur = byId.get(targetId)
    while (cur && cur.parent && !seen.has(cur.id)) {
      seen.add(cur.id)
      if (cur.parent === dragId) return false
      cur = byId.get(cur.parent)
    }
    return true
  }

  private isDescendantOf(node: TG, ancestorId: string, byId: Map<string, TG>): boolean {
    const seen = new Set<string>()
    let cur: TG | undefined = byId.get(node.id)
    while (cur && cur.parent && !seen.has(cur.id)) {
      seen.add(cur.id)
      if (cur.parent === ancestorId) return true
      cur = byId.get(cur.parent)
    }
    return false
  }

  private showDropLine(idx: number, target: GanttRow, mode: 'before' | 'after' | 'inside', rowH: number): void {
    const container = this.sideRows
    if (!container) return
    if (!this.dropLineEl || !this.dropLineEl.isConnected) {
      const el = document.createElement('div')
      el.className = 'drop-line'
      container.appendChild(el)
      this.dropLineEl = el
    }
    const line = this.dropLineEl
    const indent = 8 + target.depth * 16 + (mode === 'inside' ? 16 : 0)
    line.style.top = `${this.absRowTop(mode === 'after' ? idx + 1 : idx)}px`
    line.style.insetInlineStart = `${indent}px`
    line.style.height = mode === 'inside' ? `${rowH}px` : '2px'
    line.dataset.mode = mode
  }

  private hideDropLine(): void {
    this.dropLineEl?.remove()
    this.dropLineEl = null
  }

  /** 应用重排：改 parent + 同级顺序，写回并派发 oas-reparent / oas-tasks-change */
  private applyReparent(dragId: string, targetId: string, mode: 'before' | 'after' | 'inside'): void {
    const tasks = this._tasks
    if (!tasks.some((t) => t.id === dragId) || !tasks.some((t) => t.id === targetId)) return
    const dragged = tasks.find((t) => t.id === dragId)!
    const beforeSig = tasks.map((t) => `${t.id}:${t.parent ?? ''}`).join('|')
    const rest = tasks.filter((t) => t.id !== dragId)
    const byId = new Map(rest.map((t) => [t.id, t]))
    const tIdx = rest.findIndex((t) => t.id === targetId)
    const target = rest[tIdx]!
    let parent: string | null = null
    let insertAt: number
    if (mode === 'inside') {
      parent = target.id
      let last = tIdx
      for (let i = tIdx + 1; i < rest.length; i++) {
        if (this.isDescendantOf(rest[i]!, target.id, byId)) last = i
      }
      insertAt = last + 1
    } else {
      parent = target.parent ?? null
      insertAt = mode === 'before' ? tIdx : tIdx + 1
    }
    if (parent) dragged.parent = parent
    else delete dragged.parent
    rest.splice(insertAt, 0, dragged)
    // 零变化（原地放下 / 顺序与父子均未变）不写回、不派发
    if (rest.map((t) => `${t.id}:${t.parent ?? ''}`).join('|') === beforeSig) return
    this._tasks = rest
    let index = 0
    for (const t of rest) {
      if (t.id === dragId) break
      if ((t.parent ?? null) === parent) index++
    }
    this.syncTasksAttr()
    this.emitTasksChange()
    this.emit('reparent', { id: dragId, parent, index } satisfies GanttReparentDetail)
  }

  // ===== 多选 / 批量 / 行内重命名 / 行键盘重排 =====

  /**
   * @apiProperty 选中任务 id 集合（多选）：读为数组拷贝；写为程序性赋值（重渲染选中态 + 派发 oas-selection-change）。
   */
  get selection(): string[] {
    return [...this.selected]
  }
  set selection(ids: string[]) {
    const next = new Set(Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : [])
    const same = next.size === this.selected.size && [...next].every((id) => this.selected.has(id))
    this.selected = next
    this.selectionAnchor = null
    this.syncSelection()
    if (!same) this.emitSelectionChange()
  }

  /** 批量删除任务（连同其后代）；找不到即忽略 */
  removeTasks(ids: string[]): void {
    const known = new Set(this._tasks.map((t) => t.id))
    const set = new Set(ids.filter((x) => typeof x === 'string' && known.has(x)))
    if (set.size === 0) return
    let changed = true
    while (changed) {
      changed = false
      for (const t of this._tasks) {
        if (t.parent && set.has(t.parent) && !set.has(t.id)) {
          set.add(t.id)
          changed = true
        }
      }
    }
    this._tasks = this._tasks.filter((t) => !set.has(t.id))
    // 清洗其他任务里指向被删 id 的悬空依赖（受影响后继补发 dependencies-change）
    const affected: TG[] = []
    for (const t of this._tasks) {
      if (t.dependencies?.some((d) => set.has(d.id))) {
        const next = t.dependencies.filter((d) => !set.has(d.id))
        t.dependencies = next.length > 0 ? next : undefined
        affected.push(t)
      }
    }
    this.syncTasksAttr()
    this.emitTasksChange()
    for (const t of affected) {
      this.emit('dependencies-change', {
        taskId: t.id,
        dependencies: (t.dependencies ?? []).map((d) => ({ ...d })),
      } satisfies GanttDependenciesChangeDetail)
    }
  }

  // ===== 命令式创作通道（新增 / 移动 / 复制 / 依赖 / 批量 / 缩放）=====

  /**
   * 新增任务（命令式创作通道）：返回新任务 id；非法输入返回 ''（零改动、零事件）。
   * 缺省：name 走 i18n `gantt.newTask`、start 为今天、非里程碑补 end = start（1 天含端）；
   * 显式 id 与现有冲突时自动避让；parent 不存在按根处理。
   * 位置：opts.before 插到该 id 前、opts.after 插到其后，否则挂到 parent 子树（最后后代）之后 / 根级末尾。
   * 写回经 sanitizeTasks 清洗；派发 oas-tasks-change 与 oas-task-add（detail { id, task }）。
   */
  addTask(
    task: Partial<GanttTask> = {},
    opts: { parent?: string | null; before?: string; after?: string } = {},
  ): string {
    const ids = new Set(this._tasks.map((t) => t.id))
    const candidate: Record<string, unknown> = { ...task }
    delete candidate.children
    const explicitId = typeof task.id === 'string' && task.id !== '' && !ids.has(task.id) ? task.id : undefined
    candidate.id = explicitId ?? this.allocId(new Set(ids))
    // 非法 end（非空串且解析失败）显式拒绝（与 updateTask/updateTasks 同口径），避免静默降级为里程碑
    if (task.end !== undefined && task.end !== '' && !parseTaskDate(task.end)) return ''
    if (typeof candidate.name !== 'string' || candidate.name === '') candidate.name = this.t('gantt.newTask')
    const start = typeof task.start === 'string' && task.start !== '' ? task.start : toISODate(new Date())
    candidate.start = start
    if (task.end === undefined && task.type !== 'milestone') candidate.end = start
    const parentRaw = opts.parent !== undefined ? opts.parent : (task.parent ?? null)
    const parentId = typeof parentRaw === 'string' && parentRaw !== '' && ids.has(parentRaw) ? parentRaw : undefined
    if (parentId) candidate.parent = parentId
    else delete candidate.parent
    const [clean] = sanitizeTasks(
      [candidate],
      (used) => this.allocId(used),
      (key, msg) => this.warnOnce(key, msg),
    )
    if (!clean) return ''
    const id = clean.id
    const idxOf = (tid: string): number => this._tasks.findIndex((t) => t.id === tid)
    const beforeIdx = opts.before !== undefined ? idxOf(opts.before) : -1
    const afterIdx = opts.after !== undefined ? idxOf(opts.after) : -1
    let insertAt = this._tasks.length
    if (beforeIdx >= 0) {
      insertAt = beforeIdx
    } else if (afterIdx >= 0) {
      insertAt = afterIdx + 1
    } else if (parentId) {
      // 挂到 parent 子树（其最后一个后代）之后，保持同级顺序
      const byId = new Map(this._tasks.map((t) => [t.id, t]))
      let last = idxOf(parentId)
      this._tasks.forEach((t, i) => {
        if (i > last && this.isDescendantOf(t, parentId, byId)) last = i
      })
      insertAt = last + 1
    }
    this._tasks = [...this._tasks.slice(0, insertAt), clean, ...this._tasks.slice(insertAt)]
    if (parentId) this.ensureExpanded(parentId)
    this.commitTasks()
    this.emit('task-add', { id, task: this.taskSnapshot(clean) } satisfies GanttTaskAddDetail)
    return id
  }

  /**
   * 移动任务到指定父级（opts.parent 省略保持原父级、null 移为根级）下的第 index 位
   * （index 省略追加到该父级子级末尾，越界钳制）。
   * 目标父级不合法（自身 / 其后代 / 不存在）或结果零变化 → false（零写回零事件）。
   * 成功派发 oas-reparent（detail { id, parent, index }，index 为移动后同级序号）。
   */
  moveTask(id: string, opts: { parent?: string | null; index?: number } = {}): boolean {
    const byId = new Map(this._tasks.map((t) => [t.id, t]))
    const node = byId.get(id)
    if (!node) return false
    let parent: string | null
    if (opts.parent === undefined) {
      parent = node.parent ?? null
    } else if (opts.parent === null) {
      parent = null
    } else {
      const p = opts.parent
      const pNode = byId.get(p)
      // 防环：目标为自身，或目标落在自身子树内（会形成父指针环）
      if (!pNode || p === id || this.isDescendantOf(pNode, id, byId)) return false
      parent = p
    }
    const beforeSig = this._tasks.map((t) => `${t.id}:${t.parent ?? ''}`).join('|')
    const rest = this._tasks.filter((t) => t.id !== id)
    if (parent) node.parent = parent
    else delete node.parent
    const siblings = rest.filter((t) => (t.parent ?? null) === parent)
    const rawIdx = opts.index === undefined ? siblings.length : Math.floor(opts.index)
    const idx = Number.isFinite(rawIdx) ? Math.max(0, Math.min(rawIdx, siblings.length)) : siblings.length
    let insertAt = rest.length
    if (idx < siblings.length) {
      const anchor = siblings[idx]!.id
      insertAt = rest.findIndex((t) => t.id === anchor)
    } else if (siblings.length > 0) {
      const lastId = siblings[siblings.length - 1]!.id
      insertAt = rest.findIndex((t) => t.id === lastId) + 1
    }
    rest.splice(insertAt, 0, node)
    // 零变化（顺序与父子均未变）不写回、不派发
    if (rest.map((t) => `${t.id}:${t.parent ?? ''}`).join('|') === beforeSig) return false
    this._tasks = rest
    let index = 0
    for (const t of rest) {
      if (t.id === id) break
      if ((t.parent ?? null) === parent) index++
    }
    this.commitTasks()
    this.emit('reparent', { id, parent, index } satisfies GanttReparentDetail)
    return true
  }

  /**
   * 复制任务及其全部后代（深拷贝、各自新 id，父指针映射到新 id），紧跟原子树之后插入，返回新根 id；
   * id 不存在 → null。opts.id / opts.name 覆盖根克隆（id 冲突自动避让）；opts.parent 覆盖根父级
   * （未给则沿用原父级）。派发 oas-tasks-change 与 oas-task-add（新根）。
   */
  duplicateTask(id: string, opts: { id?: string; name?: string; parent?: string | null } = {}): string | null {
    const byId = new Map(this._tasks.map((t) => [t.id, t]))
    const root = byId.get(id)
    if (!root) return null
    const childMap = new Map<string, TG[]>()
    for (const t of this._tasks) {
      if (t.parent) {
        const list = childMap.get(t.parent) ?? []
        list.push(t)
        childMap.set(t.parent, list)
      }
    }
    // DFS 收集子树（seen 守卫防 parent 成环时无限递归）
    const subtree: TG[] = []
    const seen = new Set<string>()
    const collect = (t: TG): void => {
      if (seen.has(t.id)) return
      seen.add(t.id)
      subtree.push(t)
      for (const c of childMap.get(t.id) ?? []) collect(c)
    }
    collect(root)
    const used = new Set(this._tasks.map((t) => t.id))
    const idMap = new Map<string, string>()
    for (const t of subtree) {
      let nid: string
      if (t === root && typeof opts.id === 'string' && opts.id !== '' && !used.has(opts.id)) nid = opts.id
      else nid = this.allocId(used)
      used.add(nid)
      idMap.set(t.id, nid)
    }
    const parentRaw = opts.parent !== undefined ? opts.parent : (root.parent ?? null)
    // 与 addTask 一致：父级必须存在，否则按根处理（不留悬空父指针）
    const rootParent = typeof parentRaw === 'string' && parentRaw !== '' && byId.has(parentRaw) ? parentRaw : null
    const clones: TG[] = subtree.map((t) => {
      const clone: TG = { ...t, id: idMap.get(t.id)! }
      // 依赖深拷贝：子树内的前置 id 映射到克隆 id（避免与原体串联），子树外保留原 id
      if (clone.dependencies)
        clone.dependencies = clone.dependencies.map((d) => ({ ...d, id: idMap.get(d.id) ?? d.id }))
      if (clone.baseline) clone.baseline = { ...clone.baseline }
      delete clone.children
      if (t === root) {
        if (rootParent) clone.parent = rootParent
        else delete clone.parent
        if (typeof opts.name === 'string' && opts.name !== '') clone.name = opts.name
      } else if (t.parent && idMap.has(t.parent)) {
        clone.parent = idMap.get(t.parent)!
      }
      return clone
    })
    let lastIdx = this._tasks.findIndex((t) => t.id === id)
    this._tasks.forEach((t, i) => {
      if (idMap.has(t.id) && i > lastIdx) lastIdx = i
    })
    const insertAt = lastIdx + 1
    this._tasks = [...this._tasks.slice(0, insertAt), ...clones, ...this._tasks.slice(insertAt)]
    const newRoot = clones[0]!
    this.commitTasks()
    this.emit('task-add', { id: newRoot.id, task: this.taskSnapshot(newRoot) } satisfies GanttTaskAddDetail)
    return newRoot.id
  }

  /**
   * 新增依赖（后继 taskId 依赖 dep.id）：type 缺省 fs；lag（天，可负）可选，缺省不写（等价 0）。
   * 同源同型已存在返回 false（不重复；lag 不参与去重键）。
   * 非法（任务/目标不存在、自身依赖）返回 false。成功派发 oas-tasks-change 与 oas-dependencies-change。
   */
  addDependency(taskId: string, dep: { id: string; type?: 'fs' | 'ss' | 'ff' | 'sf'; lag?: number }): boolean {
    const task = this._tasks.find((t) => t.id === taskId)
    if (!task) return false
    if (!this._tasks.some((t) => t.id === dep.id) || dep.id === taskId) return false
    const type = dep.type && DEP_TYPES.has(dep.type) ? dep.type : 'fs'
    const deps = task.dependencies ?? []
    if (deps.some((d) => d.id === dep.id && (d.type ?? 'fs') === type)) return false
    const entry: GanttDependency = { id: dep.id, type }
    // lag 安全域收口（与 sanitizeDeps 同一函数）：越域/非法 → 丢弃为无 lag（等价 0），依赖保留
    const lag = sanitizeLag(dep.lag)
    if (lag !== undefined) entry.lag = lag
    else if (dep.lag !== undefined)
      this.warnOnce(
        `lag:${taskId}`,
        `[oas-gantt] addDependency 的 lag=${String(dep.lag)} 非法或超出安全域（|lag×天| ≤ 1e12 ms），已按 0 处理`,
      )
    const next: GanttDependency[] = [...deps.map((d) => ({ ...d })), entry]
    task.dependencies = next
    this.commitTasks()
    this.emit('dependencies-change', {
      taskId,
      dependencies: next.map((d) => ({ ...d })),
    } satisfies GanttDependenciesChangeDetail)
    return true
  }

  /**
   * 删除依赖：dep.type 给出只删该 (id,type)；未给出删该 id 的全部类型。找不到返回 false。
   * 成功派发 oas-tasks-change 与 oas-dependencies-change。
   */
  removeDependency(taskId: string, dep: { id: string; type?: 'fs' | 'ss' | 'ff' | 'sf' }): boolean {
    const task = this._tasks.find((t) => t.id === taskId)
    if (!task) return false
    const deps = task.dependencies ?? []
    const hasType = dep.type !== undefined
    const next = deps.filter((d) => (hasType ? !(d.id === dep.id && (d.type ?? 'fs') === dep.type) : d.id !== dep.id))
    if (next.length === deps.length) return false
    task.dependencies = next.length > 0 ? next : undefined
    this.commitTasks()
    this.emit('dependencies-change', {
      taskId,
      dependencies: next.map((d) => ({ ...d })),
    } satisfies GanttDependenciesChangeDetail)
    return true
  }

  /**
   * 改写依赖：from 找不到 / to.id 不存在或指向自身 / 无实际变化（含 lag）→ false。
   * to.type 缺省继承 from.type（再缺省 fs）；to.lag 缺省继承 from.lag（缺省不写，等价 0）；
   * 归一后 lag 为 0/缺省时**不落 `lag: 0` 键**（保持依赖对象干净，读回为「无 lag」）。
   * 重写后与既有依赖重复（同 id+type，lag 不参与去重键）则去重（保留一条）。
   * 成功派发 oas-tasks-change 与 oas-dependencies-change。
   */
  updateDependency(
    taskId: string,
    from: { id: string; type?: 'fs' | 'ss' | 'ff' | 'sf'; lag?: number },
    to: { id: string; type?: 'fs' | 'ss' | 'ff' | 'sf'; lag?: number },
  ): boolean {
    const task = this._tasks.find((t) => t.id === taskId)
    if (!task) return false
    const deps = task.dependencies ?? []
    const fromType = from.type && DEP_TYPES.has(from.type) ? from.type : 'fs'
    const idx = deps.findIndex((d) => d.id === from.id && (d.type ?? 'fs') === fromType)
    if (idx < 0) return false
    if (!this._tasks.some((t) => t.id === to.id) || to.id === taskId) return false
    const toType = to.type && DEP_TYPES.has(to.type) ? to.type : fromType
    // lag 安全域收口（与 sanitizeDeps 同一函数）：to.lag 越域/非法 → 回退继承原 lag（既有缺省语义）
    const cleanLag = sanitizeLag(to.lag)
    if (to.lag !== undefined && cleanLag === undefined)
      this.warnOnce(
        `lag:${taskId}`,
        `[oas-gantt] updateDependency 的 lag=${String(to.lag)} 非法或超出安全域（|lag×天| ≤ 1e12 ms），已回退继承原 lag`,
      )
    const toLag = cleanLag !== undefined ? cleanLag : deps[idx]!.lag
    const replaced: GanttDependency[] = deps.map((d, i) => {
      if (i !== idx) return { ...d }
      const e: GanttDependency = { id: to.id, type: toType }
      // lag 归一：0 或未给（继承到 0/缺省）时不落 `lag: 0` 键，保持依赖对象干净（sig/去重逻辑不变）
      if (toLag !== undefined && toLag !== 0) e.lag = toLag
      return e
    })
    const dedupSeen = new Set<string>()
    const next = replaced.filter((d) => {
      const key = `${d.id}|${d.type ?? 'fs'}`
      if (dedupSeen.has(key)) return false
      dedupSeen.add(key)
      return true
    })
    const sig = (arr: GanttDependency[]): string => arr.map((d) => `${d.id}|${d.type ?? 'fs'}|${d.lag ?? 0}`).join(',')
    if (sig(next) === sig(deps)) return false
    task.dependencies = next
    this.commitTasks()
    this.emit('dependencies-change', {
      taskId,
      dependencies: next.map((d) => ({ ...d })),
    } satisfies GanttDependenciesChangeDetail)
    return true
  }

  /**
   * 批量浅合并（逐条：id 不存在跳过；end 给非空且解析失败跳过该条；其余走 sanitize 单条清洗，
   * 与 updateTask 同一合法性口径）。多条只做一次 update() 与一次 oas-tasks-change；
   * 返回生效条数，0 条零事件零渲染。
   */
  updateTasks(patches: Array<{ id: string } & Partial<GanttTask>>): number {
    if (!Array.isArray(patches) || patches.length === 0) return 0
    const next = [...this._tasks]
    let applied = 0
    for (const patch of patches) {
      if (!patch || typeof patch.id !== 'string') continue
      const idx = next.findIndex((t) => t.id === patch.id)
      if (idx < 0) continue
      if (patch.end !== undefined && patch.end !== '' && !parseTaskDate(patch.end)) continue
      const merged = { ...next[idx]!, ...patch, id: patch.id }
      const [clean] = sanitizeTasks(
        [merged],
        (used) => this.allocId(used),
        (key, msg) => this.warnOnce(key, msg),
      )
      if (!clean) continue
      clean.id = patch.id
      next[idx] = clean
      applied++
    }
    if (applied === 0) return 0
    this._tasks = next
    this.commitTasks()
    return applied
  }

  /** 向更细一档步进（写 scale 属性，既有回调派发 oas-scale-change）；最细档 no-op */
  zoomIn(): void {
    const i = SCALES.indexOf(this.scaleMode())
    if (i > 0) this.setAttribute('scale', SCALES[i - 1]!)
  }

  /** 向更粗一档步进；最粗档 no-op */
  zoomOut(): void {
    const i = SCALES.indexOf(this.scaleMode())
    if (i >= 0 && i < SCALES.length - 1) this.setAttribute('scale', SCALES[i + 1]!)
  }

  /**
   * 缩放以容纳全部任务：取**最细且**能满足「跨度按该档单位折算的列数 × 该档最小列宽 ≤ 可用宽」的档
   * （全任务可见前提下尽量保留细节）；都不满足取最粗档 year。写 scale 属性后滚动定位到最早任务；无任务 no-op。
   * 可用宽取 tbody.clientWidth（无布局环境为 0 → 回落最粗档）。
   * windowed 边界：rows 只是已装载切片，本方法按切片 min/max 派生范围——不代表全量时间范围，
   * 切片不含全量边界时选档偏细；windowed 下建议宿主提供 range-* 托管轴并自行选择档位。
   */
  fit(): void {
    if (this.rows.length === 0) return
    let minMs = Number.POSITIVE_INFINITY
    let maxMs = Number.NEGATIVE_INFINITY
    for (const r of this.rows) {
      if (r.startMs < minMs) minMs = r.startMs
      if (r.endMs > maxMs) maxMs = r.endMs
    }
    if (!Number.isFinite(minMs) || !Number.isFinite(maxMs)) return
    const spanMs = Math.max(1, maxMs - minMs)
    const avail = this.tbody?.clientWidth ?? 0
    const unitMs: Record<GanttScale, number> = {
      hour: DAY_MS / 24,
      day: DAY_MS,
      week: 7 * DAY_MS,
      month: 30 * DAY_MS,
      quarter: 91 * DAY_MS,
      year: 365 * DAY_MS,
    }
    // 从最细档起找首个「容得下」的档（越细列越多，先满足者为最细可视档）
    let chosen: GanttScale | null = null
    for (let i = 0; i < SCALES.length; i++) {
      const s = SCALES[i]!
      if ((spanMs / unitMs[s]) * SCALE_MIN_COL[s] <= avail) {
        chosen = s
        break
      }
    }
    this.setAttribute('scale', chosen ?? SCALES[SCALES.length - 1]!)
    this.scrollToDate(toISODate(new Date(minMs)))
  }

  private emitSelectionChange(): void {
    this.emit('selection-change', { ids: this.selection } satisfies GanttSelectionChangeDetail)
  }

  /**
   * 行名选中态写入（**建行与局部 patch 共用**，两条路径产物恒一致）：class `.selected` +
   * `aria-selected`（role=treeitem 支持该属性）+ `data-selected`（宿主可观测的选中标记）。
   * 值相同不写（局部 patch 每帧要对窗口内全部行求值，无谓的 setAttribute 属白工）。
   */
  private writeRowSelectionState(el: HTMLElement, on: boolean): void {
    if (el.classList.contains('selected') !== on) el.classList.toggle('selected', on)
    const v = String(on)
    if (el.getAttribute('aria-selected') !== v) el.setAttribute('aria-selected', v)
    if (el.getAttribute('data-selected') !== v) el.setAttribute('data-selected', v)
  }

  /**
   * 任务条选中态写入（建条与局部 patch 共用）。条 `role=button`，`aria-selected` 对 button
   * 非合法属性（会被 ARIA 校验判错）→ 只写 class + `data-selected`，选中语义由行名（treeitem）
   * 的 aria-selected 承载。
   */
  private writeBarSelectionState(el: HTMLElement, on: boolean): void {
    if (el.classList.contains('selected') !== on) el.classList.toggle('selected', on)
    const v = String(on)
    if (el.getAttribute('data-selected') !== v) el.setAttribute('data-selected', v)
  }

  /**
   * 选择变化局部更新（**增量路径**）：只 patch 窗口内（已渲染行/条）受影响元素的选中态，
   * 复用缓存 rows / units / criticalIds——不重跑 `buildRows`（O(总量) 行树 + 摘要聚合）、
   * `buildUnits`（O(轴长) 刻度）、`criticalPathIds`（O(V+E) CPM），也不重建 DOM 节点。
   * 窗口外行的选中态由建行时按 `this.selected` 写入，无需在此处理。
   * 调用方（selection setter / 行点选 / 框选 / 键盘连选 / 删所选）改完 `this.selected` 后调用，
   * 随后自行派发 `oas-selection-change`（事件语义与旧实现一致）。
   */
  private syncSelection(): void {
    const sel = this.selected
    this.sideRows?.querySelectorAll<HTMLElement>('.row-name').forEach((el) => {
      this.writeRowSelectionState(el, sel.has(el.dataset.key ?? ''))
    })
    this.barsEl?.querySelectorAll<HTMLElement>('.bar').forEach((el) => {
      this.writeBarSelectionState(el, sel.has(el.dataset.id ?? ''))
    })
  }

  private onRowClick(id: string, e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }): void {
    // 行序定位走恒定索引（rebuildRowIndex）：旧实现对每次点选做 `rows.map(...)` + `indexOf`，
    // 万级任务下每个选择动作都是 O(总量) 分配/扫描（仅选择变化不该有这种成本）
    if (e.shiftKey && this.selectionAnchor) {
      const a = this.rowIndexById.get(this.selectionAnchor) ?? -1
      const b = this.rowIndexById.get(id) ?? -1
      if (a >= 0 && b >= 0) {
        const [s, t2] = a < b ? [a, b] : [b, a]
        // 区间连选：只物化区间内 id（O(区间)），不整表 map
        this.selected = new Set(this.rows.slice(s, t2 + 1).map((r) => r.task.id))
      } else {
        // 锚点已不可见（折叠/被过滤/被删）→ 退化为单选并重设锚点，避免空区间
        this.selected = new Set([id])
        this.selectionAnchor = id
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (this.selected.has(id)) this.selected.delete(id)
      else this.selected.add(id)
      this.selectionAnchor = id
    } else {
      this.selected = new Set([id])
      this.selectionAnchor = id
    }
    this.syncSelection()
    this.setActiveRow(id)
    this.emitSelectionChange()
  }

  private focusRow(id: string): void {
    let el = this.sideRows?.querySelector<HTMLElement>(`.row-name[data-key="${escId(id)}"]`)
    if (!el) {
      // 目标行未在虚拟窗口内 → 先滚到它再聚焦
      this.scrollToTask(id)
      el = this.sideRows?.querySelector<HTMLElement>(`.row-name[data-key="${escId(id)}"]`)
    }
    this.setActiveRow(id)
    el?.focus()
  }

  /** roving：活动行是唯一 tab 停靠点 */
  private setActiveRow(id: string): void {
    this.activeRowId = id
    this.sideRows?.querySelectorAll<HTMLElement>('.row-name').forEach((n) => {
      n.tabIndex = n.dataset.key === id ? 0 : -1
    })
  }

  private startRename(row: GanttRow, nameEl: HTMLElement): void {
    if (this.renaming || this.hasAttr('readonly') || row.task.disabled === true) return
    const input = document.createElement('input')
    input.className = 'rename-input'
    input.value = row.task.name
    input.setAttribute('aria-label', this.t('gantt.rename'))
    this.renaming = true
    const finish = (commit: boolean): void => {
      if (!this.renaming) return
      this.renaming = false
      const v = input.value.trim()
      if (commit && v && v !== row.task.name) {
        const t = this._tasks.find((x) => x.id === row.task.id)
        if (t) {
          t.name = v
          input.replaceWith(nameEl)
          this.syncTasksAttr()
          this.emitTasksChange()
        }
        return
      }
      input.replaceWith(nameEl)
    }
    input.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Enter') {
        e.preventDefault()
        finish(true)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        finish(false)
      }
    })
    input.addEventListener('blur', () => finish(true))
    nameEl.replaceWith(input)
    input.focus()
    input.select()
  }

  // ===== 行内新建（creatable）=====

  /** 行内「＋」：摘要行加子级、叶子行在其后加同级；新建后聚焦并进入行内重命名 */
  private onRowAdd(row: GanttRow): void {
    // 新任务起点继承所在行的开始日（而非「今天」），避免建在用户视线之外/数据区之外
    const seed = typeof row.task.start === 'string' && row.task.start !== '' ? { start: row.task.start } : {}
    const newId = row.hasChildren
      ? this.addTask(seed, { parent: row.task.id })
      : this.addTask(seed, { parent: row.task.parent ?? null, after: row.task.id })
    if (newId) this.enterRename(newId)
  }

  /** 新建后聚焦目标行并进入行内重命名（目标行未在窗口内时 focusRow 先滚动重建窗口） */
  private enterRename(id: string): void {
    this.focusRow(id)
    // 行定位走恒定索引（rebuildRowIndex；focusRow 滚动重建窗口后同样已刷新），
    // 替代 rows.find 的 O(总量) 线性扫描
    const row = this.rows[this.rowIndexById.get(id) ?? -1]
    const nameEl = this.sideRows?.querySelector<HTMLElement>(`.row-name[data-key="${escId(id)}"] .name`)
    if (row && nameEl) this.startRename(row, nameEl)
  }

  /** 命中交互元素（行名/任务条/连线点/折叠钮/重命名框/新建钮）时忽略空白双击 */
  private isInteractiveTarget(target: EventTarget | null): boolean {
    return (
      target instanceof Element &&
      target.closest(
        '.row-name, .bar, .link-dot, .link-hit, .baseline, .toggle, .rename-input, .row-add, input, select, textarea, button, [contenteditable], [data-no-row-drag]',
      ) !== null
    )
  }

  /** 双击左侧列表空白：按今天新建根级任务并进入重命名（仅 creatable 且非只读） */
  private onSideDblClick = (e: MouseEvent): void => {
    if (!this.hasAttr('creatable') || this.hasAttr('readonly')) return
    if (this.isInteractiveTarget(e.target)) return
    const id = this.addTask({})
    if (id) this.enterRename(id)
  }

  /**
   * 由客户端 x 求落点日期（ms）。用 `.inner` 容器 rect（内容层，已包含横向滚动量）做逆变换，
   * 与 `bar.left = mirrorX(xOf(...))` 精确互逆，LTR/RTL 与任意滚动都对齐；无布局/无单位时回落 null。
   */
  private dateAtClientX(clientX: number): number | null {
    const inner = this.innerEl
    if (!inner || this.units.length === 0) return null
    const r = inner.getBoundingClientRect()
    if (r.width <= 0) return null
    const physical = clientX - r.left
    const x = isRtl(this) ? this.canvasW - physical : physical
    const i = Math.min(Math.max(Math.floor(x / this.colW()), 0), this.units.length - 1)
    return this.units[i]?.startMs ?? null
  }

  /** 双击时间轴空白：按落点日期新建任务并进入重命名（仅 creatable 且非只读） */
  private onTbodyDblClick = (e: MouseEvent): void => {
    if (!this.hasAttr('creatable') || this.hasAttr('readonly')) return
    if (this.isInteractiveTarget(e.target)) return
    if (!this.tbody || this.units.length === 0) return
    const ms = this.dateAtClientX(e.clientX)
    if (ms === null) return
    const id = this.addTask({ start: toISODate(new Date(ms)) })
    if (id) this.enterRename(id)
  }

  // ===== 空白拖拽：框选多任务（marquee）/ 拖拽建任务（creatable）=====
  //
  // 两个手势互斥且与拖条/拖行/连线点/双击建任务互斥：
  // - `.side-body` 空白 → 行带框选
  // - `.tbody` 空白 → creatable 且非只读时建任务（C），否则条相交框选（B）
  // move/up/cancel 挂 document（自建 bind/unbind，与 rowPending 模式一致）；覆盖层 `.marquee` 纯装饰。

  private onSidePointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    if (this.dragCtx || this.reparentCtx || this.linkCtx || this.rowPending) return
    const target = e.target
    if (target instanceof Element && target.closest('.row-name, .toggle, .rename-input, .row-add')) return
    this.beginMarquee('rows', e)
  }

  private onTbodyPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    if (this.dragCtx || this.reparentCtx || this.linkCtx || this.rowPending) return
    // 触屏：时间轴空白拖与二维滚动冲突（touch-action 手势起始即定夺）→ 留给原生滚动；
    // 触屏建任务走行尾「＋」/ 双击空白，框选走左侧列表（.side-body touch-action:none）
    if (e.pointerType === 'touch' || this.coarse) return
    if (this.isInteractiveTarget(e.target)) return
    if (this.hasAttr('creatable') && !this.hasAttr('readonly')) this.beginCreate(e)
    else this.beginMarquee('bars', e)
  }

  private beginMarquee(kind: 'rows' | 'bars', e: PointerEvent): void {
    this.marqueeCtx = {
      kind,
      x0: e.clientX,
      y0: e.clientY,
      x1: e.clientX,
      y1: e.clientY,
      moved: false,
      additive: e.ctrlKey || e.metaKey,
      touch: e.pointerType === 'touch',
    }
    this.bindDocMarquee()
  }

  private beginCreate(e: PointerEvent): void {
    this.createCtx = {
      x0: e.clientX,
      y0: e.clientY,
      x1: e.clientX,
      y1: e.clientY,
      moved: false,
      touch: e.pointerType === 'touch',
    }
    this.bindDocMarquee()
  }

  private docMarqueeMove = (e: PointerEvent): void => {
    // 触屏抖动大：放大判拖阈值（与行重排一致），避免点按被误判为框选/建任务
    const m = this.marqueeCtx
    if (m) {
      const thr = m.touch ? 12 : MARQUEE_THRESHOLD
      if (!m.moved && Math.abs(e.clientX - m.x0) + Math.abs(e.clientY - m.y0) > thr) m.moved = true
      if (!m.moved) return
      m.x1 = e.clientX
      m.y1 = e.clientY
      this.updateMarqueeVisual(m.x0, m.y0, e.clientX, e.clientY)
      return
    }
    const c = this.createCtx
    if (c) {
      const thr = c.touch ? 12 : MARQUEE_THRESHOLD
      if (!c.moved && Math.abs(e.clientX - c.x0) + Math.abs(e.clientY - c.y0) > thr) c.moved = true
      if (!c.moved) return
      c.x1 = e.clientX
      c.y1 = e.clientY
      this.updateMarqueeVisual(c.x0, c.y0, e.clientX, e.clientY)
    }
  }

  private docMarqueeUp = (e: PointerEvent): void => {
    const m = this.marqueeCtx
    const c = this.createCtx
    this.marqueeCtx = null
    this.createCtx = null
    this.unbindDocMarquee()
    this.removeMarquee()
    if (m) {
      const p = this.upPoint(e, m.x1, m.y1)
      m.x1 = p.x
      m.y1 = p.y
      this.finishMarquee(m)
    } else if (c) {
      const p = this.upPoint(e, c.x1, c.y1)
      c.x1 = p.x
      c.y1 = p.y
      this.finishCreate(c)
    }
  }

  private docMarqueeCancel = (): void => {
    this.cancelMarquee()
  }

  private docMarqueeEsc = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && (this.marqueeCtx || this.createCtx)) {
      e.stopPropagation()
      this.cancelMarquee()
    }
  }

  private bindDocMarquee(): void {
    document.addEventListener('pointermove', this.docMarqueeMove)
    document.addEventListener('pointerup', this.docMarqueeUp)
    document.addEventListener('pointercancel', this.docMarqueeCancel)
    document.addEventListener('keydown', this.docMarqueeEsc)
  }

  private unbindDocMarquee(): void {
    document.removeEventListener('pointermove', this.docMarqueeMove)
    document.removeEventListener('pointerup', this.docMarqueeUp)
    document.removeEventListener('pointercancel', this.docMarqueeCancel)
    document.removeEventListener('keydown', this.docMarqueeEsc)
  }

  /** 取消空白拖拽：移除覆盖层 + 解绑（零选择/零建任务） */
  private cancelMarquee(): void {
    this.marqueeCtx = null
    this.createCtx = null
    this.unbindDocMarquee()
    this.removeMarquee()
  }

  private removeMarquee(): void {
    this.marqueeEl?.remove()
    this.marqueeEl = null
  }

  /** pointerup 落点：事件未带坐标（合成事件）时回落最后一次 move 的坐标 */
  private upPoint(e: PointerEvent, fx: number, fy: number): { x: number; y: number } {
    if (e.clientX === 0 && e.clientY === 0 && (fx !== 0 || fy !== 0)) return { x: fx, y: fy }
    return { x: e.clientX, y: e.clientY }
  }

  /** 覆盖层几何：以 `.gantt`（position: relative + overflow: hidden）为参照系，纯装饰不拦指针 */
  private updateMarqueeVisual(x0: number, y0: number, x1: number, y1: number): void {
    const gantt = this.ganttEl
    if (!gantt) return
    if (!this.marqueeEl || !this.marqueeEl.isConnected) {
      const el = document.createElement('div')
      el.className = 'marquee'
      el.setAttribute('aria-hidden', 'true')
      gantt.appendChild(el)
      this.marqueeEl = el
    }
    const r = gantt.getBoundingClientRect()
    // 扣掉 .gantt 边框（绝对定位参照 padding box）
    const baseX = r.left + gantt.clientLeft
    const baseY = r.top + gantt.clientTop
    this.marqueeEl.style.left = `${Math.min(x0, x1) - baseX}px`
    this.marqueeEl.style.top = `${Math.min(y0, y1) - baseY}px`
    this.marqueeEl.style.width = `${Math.abs(x1 - x0)}px`
    this.marqueeEl.style.height = `${Math.abs(y1 - y0)}px`
  }

  /** 行带框选命中：窗口内行 rowTop..rowTop+rowH 与 [y0,y1] 相交（client 坐标） */
  private rowsInRect(y0: number, y1: number): string[] {
    const side = this.sideBody
    if (!side) return []
    const rect = side.getBoundingClientRect()
    const rowH = this.rowHeightPx()
    const top = Math.min(y0, y1)
    const bottom = Math.max(y0, y1)
    const out: string[] = []
    for (let i = this.winStart; i < this.winEnd; i++) {
      const row = this.rows[i]
      if (!row) continue
      const rt = rect.top + this.absRowTop(i) - side.scrollTop
      if (rt + rowH > top && rt < bottom) out.push(row.task.id)
    }
    return out
  }

  /** 条相交框选命中：各 `.bar` 的 client rect 与矩形相交者 */
  private barsInRect(x0: number, y0: number, x1: number, y1: number): string[] {
    const minX = Math.min(x0, x1)
    const maxX = Math.max(x0, x1)
    const minY = Math.min(y0, y1)
    const maxY = Math.max(y0, y1)
    const out: string[] = []
    this.barsEl?.querySelectorAll<HTMLElement>('.bar').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.right > minX && r.left < maxX && r.bottom > minY && r.top < maxY) {
        const id = el.dataset.id
        if (id) out.push(id)
      }
    })
    return out
  }

  private finishMarquee(m: {
    kind: 'rows' | 'bars'
    x0: number
    y0: number
    x1: number
    y1: number
    moved: boolean
    additive: boolean
  }): void {
    // 未拖动 = 空白单击：普通手势清空选择（追加手势不动）
    if (!m.moved) {
      if (!m.additive && this.selected.size > 0) {
        this.selected = new Set()
        this.selectionAnchor = null
        this.syncSelection()
        this.emitSelectionChange()
      }
      return
    }
    const hits = m.kind === 'rows' ? this.rowsInRect(m.y0, m.y1) : this.barsInRect(m.x0, m.y0, m.x1, m.y1)
    const next = m.additive ? new Set([...this.selected, ...hits]) : new Set(hits)
    // 同值不派发（与 selection setter 一致）
    const same = next.size === this.selected.size && [...next].every((id) => this.selected.has(id))
    if (same) return
    this.selected = next
    this.selectionAnchor = null
    this.syncSelection()
    this.emitSelectionChange()
  }

  private finishCreate(c: { x0: number; y0: number; x1: number; y1: number; moved: boolean }): void {
    // 未拖动 = 空白单击：清空选择（与左侧列表一致）
    if (!c.moved) {
      if (this.selected.size > 0) {
        this.selected = new Set()
        this.selectionAnchor = null
        this.syncSelection()
        this.emitSelectionChange()
      }
      return
    }
    const a = this.dateAtClientX(c.x0)
    const b = this.dateAtClientX(c.x1)
    if (a === null || b === null) return
    const id = this.addTask({ start: toISODate(new Date(Math.min(a, b))), end: toISODate(new Date(Math.max(a, b))) })
    if (id) this.enterRename(id)
  }

  private onRowKeyDown(e: KeyboardEvent, row: GanttRow): void {
    // toggle 按钮 / 重命名输入框 / 行尾新建钮自身按键不被行劫持（否则无法键盘折叠 / 输入 / 激活新建）
    if (
      (e.target as HTMLElement).closest(
        '.toggle, .rename-input, .row-add, input, select, textarea, button, [contenteditable], [data-no-row-drag]',
      )
    )
      return
    const id = row.task.id
    const ro = this.hasAttr('readonly')
    // RTL 镜像：缩进/展开在逻辑方向（与 oas-tree 一致）
    const rtl = isRtl(this)
    const kIndent = rtl ? 'ArrowLeft' : 'ArrowRight'
    const kOutdent = rtl ? 'ArrowRight' : 'ArrowLeft'
    if (e.altKey) {
      if (ro || row.task.disabled === true) return
      if (e.key === 'ArrowUp') return this.altReparent(e, id, 'before')
      if (e.key === 'ArrowDown') return this.altReparent(e, id, 'after')
      if (e.key === kIndent) return this.altReparent(e, id, 'indent')
      if (e.key === kOutdent) return this.altReparent(e, id, 'outdent')
      return
    }
    // 相邻行定位走恒定索引（rebuildRowIndex）：旧实现每次按键都 `rows.map(...)` 物化全量 id 表
    // （万级任务下 Shift+↑/↓ 连选每按一次都是 O(总量) 分配）
    const idx = this.rowIndexById.get(id) ?? -1
    // APG tree：→ 展开或进首个子级；← 折叠或回焦父级（RTL 镜像）
    if (e.key === kIndent && !e.shiftKey) {
      if (row.hasChildren) {
        e.preventDefault()
        if (!this.currentExpandedSet().has(id)) this.toggleExpand(id)
        // 展开后焦点保持在该项；若已展开则进入首个子级
        // （toggleExpand → update 重建 rows 与 rowIndexById，此处取的是重建后的恒定索引）
        const i = this.rowIndexById.get(id) ?? -1
        const child = i >= 0 ? this.rows[i + 1] : undefined
        if (this.currentExpandedSet().has(id) && child && child.depth > row.depth) this.focusRow(child.task.id)
        else this.focusRow(id)
      }
      return
    }
    if (e.key === kOutdent && !e.shiftKey) {
      if (row.hasChildren && this.currentExpandedSet().has(id)) {
        e.preventDefault()
        this.toggleExpand(id)
        this.focusRow(id)
      } else if (row.task.parent) {
        e.preventDefault()
        this.focusRow(row.task.parent)
      }
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const nextId = this.rows[idx + (e.key === 'ArrowDown' ? 1 : -1)]?.task.id
      if (nextId) {
        if (e.shiftKey) {
          this.selected.add(id)
          this.selected.add(nextId)
          this.syncSelection()
          this.emitSelectionChange()
        }
        this.focusRow(nextId)
      } else if (this._winMode.windowed) {
        // windowed：切片末端/首端继续走 → 请求装载相邻区间（宿主回填后焦点可达，不得静默无响应）
        this.requestKeyboardWindow(row, e.key === 'ArrowDown')
      }
      return
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      this.onRowClick(id, e)
      return
    }
    if (e.key === 'F2') {
      if (ro || row.task.disabled === true) return
      e.preventDefault()
      const nameEl = this.sideRows?.querySelector<HTMLElement>(`.row-name[data-key="${escId(id)}"] .name`)
      if (nameEl) this.startRename(row, nameEl)
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.stopPropagation() // 无论是否处理，都不冒泡到 document 级连线删除
      if (ro || row.task.disabled === true) return
      if (this.selected.size > 0 && this.selected.has(id)) {
        // disabled 任务不被批量删除（disabled 只锁自身数据；程序性 removeTasks 仍保留全权）
        const targets = [...this.selected].filter((sid) => this._tasks.find((t) => t.id === sid)?.disabled !== true)
        if (targets.length === 0) return
        e.preventDefault()
        this.removeTasks(targets)
      }
    }
  }

  private altReparent(e: KeyboardEvent, id: string, dir: 'before' | 'after' | 'indent' | 'outdent'): void {
    e.preventDefault()
    // windowed：行重排禁用（切片内同级 index 对全量无意义，宿主在全量上处理）
    if (this._winMode.windowed) {
      this.warnWindowedReparent()
      return
    }
    const byId = new Map(this._tasks.map((t) => [t.id, t]))
    const cur = byId.get(id)
    if (!cur) return
    const siblings = this._tasks.filter((t) => (t.parent ?? null) === (cur.parent ?? null))
    const si = siblings.findIndex((t) => t.id === id)
    if (dir === 'indent') {
      const prev = siblings[si - 1]
      // 不缩进为 disabled 任务的子级（对齐指针路径的 drop-inside 守卫）
      if (prev && prev.disabled !== true) this.applyReparent(id, prev.id, 'inside')
      return
    }
    if (dir === 'outdent') {
      if (cur.parent) {
        const parent = byId.get(cur.parent)
        if (parent) this.applyReparent(id, parent.id, 'after')
      }
      return
    }
    const target = siblings[si + (dir === 'before' ? -1 : 1)]
    if (target) this.applyReparent(id, target.id, dir)
  }

  private docRowPendingMove = (e: PointerEvent): void => {
    const p = this.rowPending
    if (!p) return
    // 触屏手指抖动大：放大判拖阈值，避免点按被误判为重排
    const thr = e.pointerType === 'touch' ? 12 : 4
    if (Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y) > thr) {
      this.unbindRowPending()
      this.rowPending = null
      // 起手在任务名文本：让浏览器继续完成文本选择，不抢成行重排；点击（未超阈值）仍走行选中
      if (p.textTarget) return
      // windowed：行重排禁用（切片内同级 index 对全量无意义，宿主在全量上处理）
      if (this._winMode.windowed) {
        this.warnWindowedReparent()
        return
      }
      // 只读 / 禁用：不重排（选择在 pointerup 处理；拖动的指针不移不触选择）
      if (this.hasAttr('readonly') || p.disabled) return
      this.reparentCtx = { id: p.id, byId: p.byId }
      this.bindDocReparent()
      this.onReparentMove(e)
    }
  }
  private docRowPendingUp = (e: PointerEvent): void => {
    const p = this.rowPending
    this.unbindRowPending()
    this.rowPending = null
    // 手柄起手或任务已被并发重写移除（幽灵 id）→ 不触发选择
    if (p && !p.viaHandle && this._tasks.some((t) => t.id === p.id)) this.onRowClick(p.id, e)
  }
  private docRowPendingCancel = (): void => {
    this.unbindRowPending()
    this.rowPending = null
  }

  private bindRowPending(): void {
    document.addEventListener('pointermove', this.docRowPendingMove)
    document.addEventListener('pointerup', this.docRowPendingUp)
    document.addEventListener('pointercancel', this.docRowPendingCancel)
  }
  private unbindRowPending(): void {
    document.removeEventListener('pointermove', this.docRowPendingMove)
    document.removeEventListener('pointerup', this.docRowPendingUp)
    document.removeEventListener('pointercancel', this.docRowPendingCancel)
  }

  private revealDots(id: string): void {
    this.touchActiveId = id
    this.barsEl?.querySelectorAll('.bar.touch-active').forEach((el) => el.classList.remove('touch-active'))
    this.barsEl?.querySelector(`.bar[data-id="${escId(id)}"]`)?.classList.add('touch-active')
  }

  private clearTouchActive(): void {
    if (!this.touchActiveId) return
    this.touchActiveId = null
    this.barsEl?.querySelectorAll('.bar.touch-active').forEach((el) => el.classList.remove('touch-active'))
  }

  // ===== 依赖连线交互编辑（拖拽建依赖 + 选中删除）=====

  private docLinkMove = (e: PointerEvent): void => {
    this.onLinkMove(e)
  }
  private docLinkUp = (e: PointerEvent): void => {
    this.onLinkUp(e)
  }
  private docLinkCancel = (): void => {
    this.cancelLink()
  }
  private docLinkEsc = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.cancelLink()
  }
  private docLinkKey = (e: KeyboardEvent): void => {
    // 仅当组件自身持有焦点时响应，避免劫持宿主页面（含其他组件内输入）的 Backspace/Delete
    if (document.activeElement !== this) return
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedLink) {
      if (this.removeSelectedLink()) e.preventDefault()
    }
  }
  private docLinkClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    const onHit = path.some((n) => (n as Element)?.classList?.contains?.('link-hit'))
    if (!onHit) this.clearLinkSelection()
    // 点条/连线点以外的空白 → 收起触屏揭示态
    if (!path.some((n) => (n as Element)?.classList?.contains?.('bar'))) this.clearTouchActive()
  }
  /** 条拖拽的 Esc 兜底（document 级）：自动滚动每帧重建条会丢焦点，条内 keydown 不再触发 */
  private docBarDragKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.dragCtx) this.cancelDrag()
  }

  private bindDocLink(): void {
    document.addEventListener('pointermove', this.docLinkMove)
    document.addEventListener('pointerup', this.docLinkUp)
    document.addEventListener('pointercancel', this.docLinkCancel)
    document.addEventListener('keydown', this.docLinkEsc)
  }

  private unbindDocLink(): void {
    document.removeEventListener('pointermove', this.docLinkMove)
    document.removeEventListener('pointerup', this.docLinkUp)
    document.removeEventListener('pointercancel', this.docLinkCancel)
    document.removeEventListener('keydown', this.docLinkEsc)
  }

  private onLinkDotPointerDown(e: PointerEvent, row: GanttRow, rowIndex: number, endpoint: 'start' | 'end'): void {
    if (
      e.button !== 0 ||
      this.hasAttr('readonly') ||
      this.linkCtx ||
      this.dragCtx ||
      this.reparentCtx ||
      this.rowPending
    )
      return
    const rowH = this.rowHeightPx()
    const sx = this.mirrorX(this.xOf(endpoint === 'end' ? row.endMs : row.startMs))
    const sy = this.absRowTop(rowIndex) + rowH / 2
    const temp = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    temp.setAttribute('class', 'temp-link')
    temp.setAttribute('aria-hidden', 'true')
    temp.setAttribute('d', `M ${sx} ${sy} L ${sx} ${sy}`)
    this.linksEl?.appendChild(temp)
    this.linkCtx = { sourceId: row.task.id, endpoint, sx, sy, temp }
    this.bindDocLink()
  }

  private onLinkMove(e: PointerEvent): void {
    this.pointerX = e.clientX
    this.pointerY = e.clientY
    this.updateLinkTemp(e.clientX, e.clientY)
    this.startAutoScroll()
  }

  private updateLinkTemp(clientX: number, clientY: number): void {
    const ctx = this.linkCtx
    const svg = this.linksEl
    if (!ctx || !svg) return
    const r = svg.getBoundingClientRect()
    ctx.temp.setAttribute('d', `M ${ctx.sx} ${ctx.sy} L ${clientX - r.left} ${clientY - r.top}`)
  }

  private onLinkUp(e: PointerEvent): void {
    this.stopAutoScroll()
    const ctx = this.linkCtx
    this.linkCtx = null
    this.unbindDocLink()
    ctx?.temp.remove()
    if (!ctx) return
    const target = this.barUnder(e.clientX, e.clientY)
    if (!target || target.row.task.id === ctx.sourceId) return
    const type = this.linkType(ctx.endpoint, target.endpoint)
    // 复用 addDependency：一致的校验/去重 + tasks-change/dependencies-change + auto-schedule 联动
    this.addDependency(target.row.task.id, { id: ctx.sourceId, type })
  }

  private cancelLink(): void {
    this.stopAutoScroll()
    if (!this.linkCtx) return
    this.linkCtx.temp.remove()
    this.linkCtx = null
    this.unbindDocLink()
  }

  /** 端点组合 → 依赖类型（后继 = 命中任务，前置 = 拖拽起点任务） */
  private linkType(src: 'start' | 'end', tgt: 'start' | 'end'): GanttDependency['type'] {
    if (src === 'end' && tgt === 'start') return 'fs'
    if (src === 'start' && tgt === 'start') return 'ss'
    if (src === 'end' && tgt === 'end') return 'ff'
    return 'sf'
  }

  /** 命中指针下的任务条（就近取可视窗口内条形，回避 elementFromPoint 的 happy-dom 缺口） */
  private barUnder(clientX: number, clientY: number): { row: GanttRow; endpoint: 'start' | 'end' } | null {
    if (!this.barsEl) return null
    const rtl = isRtl(this)
    for (let i = this.winStart; i < this.winEnd; i++) {
      const row = this.rows[i]!
      if (row.task.disabled === true) continue
      const el = this.barsEl.querySelector<HTMLElement>(`.bar[data-id="${escId(row.task.id)}"]`)
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        // RTL 下条起始点落在物理右侧：左半 = end
        const leftHalf = clientX < r.left + r.width / 2
        return { row, endpoint: leftHalf === !rtl ? 'start' : 'end' }
      }
    }
    return null
  }

  private selectLink(successor: string, predecessor: string, type: string): void {
    this.clearLinkSelection()
    this.selectedLink = { successor, predecessor, type }
    this.focus({ preventScroll: true })
    this.linksEl
      ?.querySelector<SVGPathElement>(
        `.link-hit[data-from="${escId(successor)}"][data-to="${escId(predecessor)}"][data-type="${type}"]`,
      )
      ?.classList.add('selected')
  }

  private clearLinkSelection(): void {
    if (!this.selectedLink) return
    this.selectedLink = null
    this.linksEl?.querySelectorAll('.link-hit.selected').forEach((el) => el.classList.remove('selected'))
  }

  private removeSelectedLink(): boolean {
    const sel = this.selectedLink
    if (!sel) return false
    const succ = this._tasks.find((t) => t.id === sel.successor)
    if (!succ || succ.disabled === true) return false
    const deps = (succ.dependencies ?? []).filter((d) => !(d.id === sel.predecessor && (d.type ?? 'fs') === sel.type))
    succ.dependencies = deps.length > 0 ? deps : undefined
    this.clearLinkSelection()
    this.syncTasksAttr()
    this.emitTasksChange()
    this.emit('dependencies-change', {
      taskId: succ.id,
      dependencies: deps.map((d) => ({ ...d })),
    } satisfies GanttDependenciesChangeDetail)
    return true
  }

  private onBarPointerDown(e: PointerEvent, row: GanttRow, bar: HTMLElement): void {
    if (e.button !== 0 || this.dragCtx || this.reparentCtx || this.linkCtx || this.rowPending) return
    const target = e.target as HTMLElement
    // 条标签是可选中的文本；从标签拖动不应改期，改期从条体/两端手柄开始
    if (target.closest('.bar-label')) return
    let mode: DragMode = 'move'
    if (target.classList.contains('handle-start')) mode = 'resize-start'
    else if (target.classList.contains('handle-end')) mode = 'resize-end'
    else if (target.classList.contains('progress-handle')) mode = 'progress'
    else if (row.isSummary) return // 摘要条不可拖（时间派生自子级）
    if (row.task.disabled === true) return
    if (mode !== 'progress' && this.datesReadonlyOn()) return
    if (mode === 'progress' && this.progressReadonlyOn()) return
    this.dragCtx = {
      id: row.task.id,
      mode,
      startX: e.clientX,
      startScrollLeft: this.tbody?.scrollLeft ?? 0,
      origStartMs: row.startMs,
      origEndMs: row.endMs,
      origProgress: row.progress,
      datetime: row.task.start.length > 10,
      touch: e.pointerType === 'touch',
      bar,
    }
    try {
      bar.setPointerCapture(e.pointerId)
    } catch {
      /* 环境不支持 capture：事件流走 document 层兜底路径 */
    }
    this.bindDocDrag()
  }

  private onBarPointerMove(e: PointerEvent): void {
    this.pointerX = e.clientX
    this.pointerY = e.clientY
    this.applyBarDragVisual(e.clientX)
    this.startAutoScroll()
  }

  private applyBarDragVisual(clientX: number): void {
    const ctx = this.dragCtx
    if (!ctx) return
    const colW = this.colW()
    const rtl = isRtl(this)
    // 位移 = 指针位移 + 横向滚动增量（自动滚动期间指针可静止）：条才随指针走、可拖出视口边缘
    const scrollDelta = (this.tbody?.scrollLeft ?? 0) - ctx.startScrollLeft
    let dx = clientX - ctx.startX + scrollDelta
    if (rtl) dx = -dx
    // 触屏死区：手指抖动不推进（防误改期）
    if (ctx.touch && Math.abs(clientX - ctx.startX) < 6 && Math.abs(scrollDelta) < 1) dx = 0
    if (ctx.mode === 'progress') {
      const barW = Math.max(this.xOf(ctx.origEndMs) - this.xOf(ctx.origStartMs), 1)
      const next = Math.min(100, Math.max(0, ctx.origProgress + (dx / barW) * 100))
      ctx.newProgress = Math.round(next)
      const fill = ctx.bar.querySelector<HTMLElement>('.bar-progress')
      const handle = ctx.bar.querySelector<HTMLElement>('.progress-handle')
      if (fill) fill.style.width = `${ctx.newProgress}%`
      if (handle) handle.style.insetInlineStart = `${ctx.newProgress}%`
      return
    }
    const shiftUnits = this.snapOn() ? Math.round(dx / colW) : dx / colW
    let newStartMs: number
    let newEndMs: number
    if (this.snapOn()) {
      // 整格平移：日历安全（month/quarter/year 不产生月末幻影日期）
      newStartMs = this.addUnitsMs(ctx.origStartMs, Math.round(shiftUnits))
      newEndMs = this.addUnitsMs(ctx.origEndMs, Math.round(shiftUnits))
      if (ctx.mode === 'move') {
        const dur = ctx.origEndMs - ctx.origStartMs
        newEndMs = newStartMs + dur
      } else if (ctx.mode === 'resize-start') {
        newEndMs = ctx.origEndMs
      } else {
        newStartMs = ctx.origStartMs
      }
    } else {
      const delta = shiftUnits * this.avgUnitMs()
      newStartMs = ctx.origStartMs + delta
      newEndMs = ctx.origEndMs + delta
      if (ctx.mode === 'resize-start') newEndMs = ctx.origEndMs
      if (ctx.mode === 'resize-end') newStartMs = ctx.origStartMs
    }
    const minSpan = this.snapOn() ? this.addUnitsMs(ctx.origStartMs, 1) - ctx.origStartMs : this.avgUnitMs()
    // 最短跨度钳制的边界须夹在原跨度内：任务本身短于 1 个刻度单元时（如 month 档 4 天任务），
    // 裸用 origEnd−minSpan / origStart+minSpan 会落到原区间之外 → 零位移也改写、真实拖拽反向跳。
    if (ctx.mode === 'resize-start') {
      const bound = Math.max(ctx.origEndMs - minSpan, ctx.origStartMs)
      if (newStartMs > bound) newStartMs = bound
    }
    if (ctx.mode === 'resize-end') {
      const bound = Math.min(ctx.origStartMs + minSpan, ctx.origEndMs)
      if (newEndMs < bound) newEndMs = bound
    }
    ctx.newStartMs = newStartMs
    ctx.newEndMs = newEndMs
    // 视觉更新（不重建 DOM）
    if (ctx.mode === 'move' || ctx.mode === 'resize-start') {
      if (ctx.bar.classList.contains('milestone')) {
        const center = this.mirrorX(this.xOf(newStartMs) + colW / 2)
        ctx.bar.style.left = `${center - 8}px`
      } else {
        const endRef = ctx.mode === 'move' ? newEndMs : ctx.origEndMs
        const x1 = this.xOf(newStartMs)
        const x2 = this.xOf(endRef)
        const w = Math.max(x2 - x1, 2)
        ctx.bar.style.left = `${this.mirrorX(x1) - (rtl ? w : 0)}px`
        if (ctx.mode === 'resize-start') ctx.bar.style.width = `${w}px`
      }
    }
    if (ctx.mode === 'resize-end') {
      const x1 = this.xOf(ctx.origStartMs)
      const x2 = this.xOf(newEndMs)
      const w = Math.max(x2 - x1, 2)
      ctx.bar.style.width = `${w}px`
      // RTL 下 left = mirrorX(起点) − 宽度：改宽须同步 left，否则被抓手柄（终点=物理左缘）不动、起点漂移
      if (rtl) ctx.bar.style.left = `${this.mirrorX(x1) - w}px`
    }
  }

  /** 按 scale 日历步进 n 个单位（snap 对齐用）；n = 0 必须恒等，否则零位移点按会被锚到月首而静默改期 */
  private addUnitsMs(ms: number, n: number): number {
    if (n === 0) return ms
    return OASGantt.addUnits(new Date(ms), this.scaleMode(), n).getTime()
  }

  private avgUnitMs(): number {
    if (this.units.length === 0) return DAY_MS
    return (this.units[this.units.length - 1]!.endMs - this.units[0]!.startMs) / this.units.length
  }

  private onBarPointerUp(_e: PointerEvent): void {
    this.stopAutoScroll()
    const ctx = this.dragCtx
    this.dragCtx = null
    if (!ctx) return
    if (ctx.mode === 'progress') {
      const next = ctx.newProgress
      if (next === undefined || next === ctx.origProgress) return
      this.commitProgress(ctx.id, next)
      return
    }
    const newStart = ctx.newStartMs ?? ctx.origStartMs
    const newEnd = ctx.newEndMs ?? ctx.origEndMs
    if (newStart === ctx.origStartMs && newEnd === ctx.origEndMs) return
    this.commitDates(ctx.id, newStart, newEnd, ctx.datetime, ctx.origStartMs, ctx.origEndMs)
  }

  /** 取消拖拽：视觉回滚、零事件零写回、无孤儿 ctx */
  private cancelDrag(): void {
    this.stopAutoScroll()
    const ctx = this.dragCtx
    this.dragCtx = null
    this.unbindDocDrag()
    if (!ctx) return
    if (ctx.mode === 'progress') {
      const fill = ctx.bar.querySelector<HTMLElement>('.bar-progress')
      const handle = ctx.bar.querySelector<HTMLElement>('.progress-handle')
      if (fill) fill.style.width = `${ctx.origProgress}%`
      if (handle) handle.style.insetInlineStart = `${ctx.origProgress}%`
      return
    }
    if (ctx.bar.classList.contains('milestone')) {
      const center = this.mirrorX(this.xOf(ctx.origStartMs) + this.colW() / 2)
      ctx.bar.style.left = `${center - 8}px`
      return
    }
    const x1 = this.xOf(ctx.origStartMs)
    const x2 = this.xOf(ctx.origEndMs)
    const w = Math.max(x2 - x1, 2)
    ctx.bar.style.left = `${this.mirrorX(x1) - (isRtl(this) ? w : 0)}px`
    ctx.bar.style.width = `${w}px`
  }

  /** 写回改期：内部更新 + 属性反射 + task-change（old/new）+ tasks-change */
  private commitDates(
    id: string,
    newStartMs: number,
    newEndMs: number,
    datetime: boolean,
    oldStartMs: number,
    oldEndMs: number,
  ): void {
    const task = this._tasks.find((t) => t.id === id)
    if (!task) return
    // 里程碑只写 start；契约 start == end（渲染只出单点），end 数据串按含端语义
    // （endMs 为区间右缘 exclusive，日精度 -1ms 回到含端日）。
    // 仅当显式 type:"milestone" **且数据本就带矛盾 end** 时，才把 end 归一为 start——
    // 否则前移越过残留 end 会写出 start>end 的非法区间；无 end 的里程碑不凭空添 end
    // （添了会触发组件自身的「milestone 携带 end」矛盾告警）。
    const explicitMilestone = task.type === 'milestone'
    const milestone = explicitMilestone || !task.end
    const start = this.fmtIso(newStartMs, datetime)
    const endStr = milestone ? start : this.fmtEnd(newEndMs, datetime)
    const patch: Partial<GanttTask> = milestone
      ? explicitMilestone && task.end
        ? { start, end: start }
        : { start }
      : { start, end: endStr }
    if (!this.applyPatch(id, patch)) return
    // applyPatch 内部经 update()→reschedule() 可能已按约束/工作日订正数据 →
    // 事件 payload 取**订正后终值**（与 task 快照一致），oldStart/oldEnd 仍为拖动前原点
    const finalTask = this._tasks.find((t) => t.id === id)!
    this.emit('task-change', {
      id,
      task: this.taskSnapshot(finalTask),
      oldStart: this.fmtIso(oldStartMs, datetime),
      oldEnd: milestone ? this.fmtIso(oldStartMs, datetime) : this.fmtEnd(oldEndMs, datetime),
      start: finalTask.start,
      end: finalTask.end ?? finalTask.start,
    } satisfies GanttTaskChangeDetail)
  }

  private commitProgress(id: string, progress: number): void {
    if (!this.applyPatch(id, { progress })) return
    this.emit('progress-change', {
      id,
      task: this.taskSnapshot(this._tasks.find((t) => t.id === id)!),
      progress,
    } satisfies GanttProgressChangeDetail)
  }

  /** 内部写回单条 + 属性反射 + 重渲染 + tasks-change（收口路径唯一出口） */
  private applyPatch(id: string, patch: Partial<GanttTask>): boolean {
    const idx = this._tasks.findIndex((t) => t.id === id)
    if (idx < 0) return false
    this._tasks[idx] = { ...this._tasks[idx]!, ...patch, id }
    this.commitTasks()
    return true
  }

  /** 时间戳 → 数据串：非整日时刻（非 snap 半格位移）强制带时间，防数据与视觉脱节 */
  private fmtIso(ms: number, datetimeHint: boolean): string {
    const d = new Date(ms)
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
    return hasTime || datetimeHint ? formatToken(d, 'yyyy-MM-dd HH:mm', this.effectiveLocale()) : toISODate(d)
  }

  /** 区间右缘（exclusive）→ 结束数据串：日精度 -1ms 回含端日；时间精度按原时刻 */
  private fmtEnd(ms: number, datetimeHint: boolean): string {
    if (datetimeHint) return formatToken(new Date(ms), 'yyyy-MM-dd HH:mm', this.effectiveLocale())
    return toISODate(new Date(ms - 1))
  }

  // ===== 依赖联动排程（auto-schedule）=====
  //
  // 前置 d → 后继 t（t.dependencies 含 { id: d.id, type }），约束语义：
  //   fs: t.start ≥ d.end  /  ss: t.start ≥ d.start  /  ff: t.end ≥ d.end  /  sf: t.end ≥ d.start
  // 仅当违反时把 t **向后推迟**（不提前），保持 t 工期不变（日精度 end 含端，口径与 buildRows 的 endMs 一致）。
  // 迭代松弛直到无变化或达上限（成环不死循环）；跳过 disabled、有子级的摘要（日期派生）、前置不存在者。

  /** 任务起点 ms（数据非法回 0，与 buildRows 同口径） */
  private startMsOfTask(t: TG): number {
    return parseTaskDate(t.start)?.getTime() ?? 0
  }

  /** 任务区间右缘 ms（exclusive）：里程碑 = 起点；日精度 end 含端 → +DAY_MS */
  private endMsOfTask(t: TG): number {
    if (t.type === 'milestone' || !t.end) return this.startMsOfTask(t)
    const e = parseTaskDate(t.end)
    if (!e) return this.startMsOfTask(t)
    return t.end.length > 10 ? e.getTime() : e.getTime() + DAY_MS
  }

  /** 与 buildRows 同源的树结构：childMap（有效父级且本节点非断环）与 hasChildren 集 */
  private childStructure(byId: Map<string, TG>): { childMap: Map<string, string[]>; hasChildren: Set<string> } {
    const tasks = this._tasks
    const childMap = new Map<string, string[]>()
    const color = new Map<string, 1 | 2>()
    const broken = new Set<string>()
    for (const t of tasks) {
      if (color.has(t.id)) continue
      const stack: TG[] = []
      let cur: TG | undefined = t
      while (cur && cur.parent && byId.has(cur.parent) && !color.has(cur.id)) {
        color.set(cur.id, 1)
        stack.push(cur)
        cur = byId.get(cur.parent)
      }
      if (cur && cur.parent && byId.has(cur.parent) && color.get(cur.id) === 1) broken.add(cur.id)
      for (const n of stack) color.set(n.id, 2)
    }
    for (const t of tasks) {
      if (t.parent && byId.has(t.parent) && !broken.has(t.id)) {
        const list = childMap.get(t.parent) ?? []
        list.push(t.id)
        childMap.set(t.parent, list)
      }
    }
    return { childMap, hasChildren: new Set(childMap.keys()) }
  }

  /**
   * 依赖图中「处于环内」的节点集合：所在强连通分量（SCC）大小 > 1，或自身成环（自环）。
   * 实现为**迭代式 Tarjan**（显式栈；递归版在超长依赖链下会爆调用栈）。
   *
   * 用途：环内节点排程无解，只让位它们（保持现网日期），环外节点照常前推；
   * 关键路径也把环内节点排除在节点集之外——替代旧版「整图有环即整体停摆/返回空集」。
   */
  private dependencyCyclicNodes(byId: Map<string, TG>): Set<string> {
    const index = new Map<string, number>()
    const low = new Map<string, number>()
    const onStack = new Set<string>()
    const stack: string[] = []
    const cyclic = new Set<string>()
    let counter = 0
    for (const root of byId.keys()) {
      if (index.has(root)) continue
      index.set(root, counter)
      low.set(root, counter)
      counter++
      stack.push(root)
      onStack.add(root)
      const work: Array<{ id: string; i: number }> = [{ id: root, i: 0 }]
      while (work.length > 0) {
        const frame = work[work.length - 1]!
        const deps = byId.get(frame.id)?.dependencies ?? []
        if (frame.i < deps.length) {
          const depId = deps[frame.i]!.id
          frame.i++
          if (!byId.has(depId)) continue // 前置不存在 → 该边不参与（与排程同口径）
          if (depId === frame.id) {
            cyclic.add(frame.id) // 自环：自身即环内
            continue
          }
          if (!index.has(depId)) {
            index.set(depId, counter)
            low.set(depId, counter)
            counter++
            stack.push(depId)
            onStack.add(depId)
            work.push({ id: depId, i: 0 })
          } else if (onStack.has(depId)) {
            low.set(frame.id, Math.min(low.get(frame.id)!, index.get(depId)!))
          }
          continue
        }
        work.pop()
        const parent = work[work.length - 1]
        if (parent) low.set(parent.id, Math.min(low.get(parent.id)!, low.get(frame.id)!))
        if (low.get(frame.id) === index.get(frame.id)) {
          const comp: string[] = []
          for (;;) {
            const w = stack.pop()!
            onStack.delete(w)
            comp.push(w)
            if (w === frame.id) break
          }
          if (comp.length > 1) for (const c of comp) cyclic.add(c)
        }
      }
    }
    return cyclic
  }

  /**
   * 关键路径任务 id 集合（CPM 前后向计算，日精度）：
   * - 工期 dur = endMsOfTask − startMsOfTask（日精度 end 含端，与 buildRows 一致）；里程碑 dur=0。
   * - 前向 ES_i 取任务**当前排期**的 startMs（以现网数据为基准，不做重排）。
   * - 项目完成 projectEnd = max(endMsOfTask)（里程碑也算；摘要取自身 data 日期）。
   * - 反向：无后继任务起 LF = projectEnd，按依赖约束 + lag 反推前置 LS/LF。**按拓扑序**：
   *   节点集在**排除依赖环内节点**后为 DAG，故按逆拓扑序一趟即得精确 LF（O(V+E)，替代旧版迭代松弛）：
   *     fs: LF_pred = LS_succ − lag      ss: LF_pred = LS_succ − lag（LF_pred = LS_pred + dur_pred）
   *     ff: LF_pred = LF_succ − lag      sf: LF_pred = LS_succ − lag（LF_pred = LS_pred + dur_pred）
   * - 每个任务 LS = LF − dur、float = LS − ES；|float| < 1e-6（日精度）判为关键。
   * - 摘要（有子级，日期派生）不参与；disabled 照算（不特殊处理，仅作可视化）。
   * - 依赖环内节点不参与 CP（排程端让位后无法定义 CP 序），环外节点照常计算；全为环内 → 空集。
   * - 违约集 conflict = 负总时差 ∪ 约束违反（snet 未达约束日 / mso 未落在约束日 / fnlt 超出约束日右缘）。
   */
  private criticalPathIds(): { critical: Set<string>; conflict: Set<string> } {
    ganttRenderDiag.cpComputes++ // 仅内部诊断（见 ganttRenderDiag）
    const empty = { critical: new Set<string>(), conflict: new Set<string>() }
    const tasks = this._tasks
    if (tasks.length === 0) return empty
    const byId = new Map<string, TG>()
    for (const t of tasks) byId.set(t.id, t)
    const { hasChildren } = this.childStructure(byId)
    // 环内节点让位：不进入节点集（旧版「有环即返回空集」会让环外关键链也无从高亮）
    const cyclic = this.dependencyCyclicNodes(byId)
    const nodes = tasks.filter((t) => !hasChildren.has(t.id) && !cyclic.has(t.id))
    if (nodes.length === 0) return empty
    const dur = new Map<string, number>()
    const es = new Map<string, number>()
    for (const t of nodes) {
      const s = this.startMsOfTask(t)
      es.set(t.id, s)
      dur.set(t.id, Math.max(this.endMsOfTask(t) - s, 0))
    }
    let projectEnd = Number.NEGATIVE_INFINITY
    // 仅按 CP 节点（叶子/里程碑，摘要已排除）取项目完成：摘要自身 data 日期可能过期，
    // 其派生日期由子级（节点）覆盖，故不参与（与渲染/排程的聚合口径一致）
    for (const t of nodes) {
      const e = this.endMsOfTask(t)
      if (e > projectEnd) projectEnd = e
    }
    if (!Number.isFinite(projectEnd)) projectEnd = 0
    // 后继表：predId → 引用它的依赖（succ/type/lag）；仅连接「双方均为节点」的边
    const successors = new Map<string, Array<{ succ: string; type: string; lag: number }>>()
    const indeg = new Map<string, number>()
    for (const t of nodes) indeg.set(t.id, 0)
    for (const t of nodes) {
      for (const d of t.dependencies ?? []) {
        if (!dur.has(d.id)) continue // 前置为摘要/环内/不存在/非法 → 该边不参与
        const lag = typeof d.lag === 'number' && Number.isFinite(d.lag) ? d.lag : 0
        const list = successors.get(d.id) ?? []
        list.push({ succ: t.id, type: d.type ?? 'fs', lag })
        successors.set(d.id, list)
        indeg.set(t.id, (indeg.get(t.id) ?? 0) + 1)
      }
    }
    // Kahn 拓扑序（节点集为 DAG，环内节点已排除）：入度 0 起逐层出队
    const topo: string[] = []
    const queue: string[] = []
    for (const t of nodes) if ((indeg.get(t.id) ?? 0) === 0) queue.push(t.id)
    for (let qi = 0; qi < queue.length; qi++) {
      const id = queue[qi]!
      topo.push(id)
      for (const { succ } of successors.get(id) ?? []) {
        const next = (indeg.get(succ) ?? 0) - 1
        indeg.set(succ, next)
        if (next === 0) queue.push(succ)
      }
    }
    // 防御：DAG 下 topo 应覆盖全部节点；万一有残留（理论不可达）按剩余顺序补入，保证 LF 全部有值
    if (topo.length < nodes.length) {
      const seen = new Set(topo)
      for (const t of nodes) if (!seen.has(t.id)) topo.push(t.id)
    }
    // 逆拓扑序反向松弛：LF_pred = min(projectEnd, 各后继约束隐含值)；后继 LF 此时已定
    const lf = new Map<string, number>()
    for (let i = topo.length - 1; i >= 0; i--) {
      const id = topo[i]!
      const durPred = dur.get(id)!
      let value = projectEnd
      for (const { succ, type, lag } of successors.get(id) ?? []) {
        const lfSucc = lf.get(succ)!
        const lsSucc = lfSucc - dur.get(succ)!
        const lagMs = lag * DAY_MS
        const implied =
          type === 'fs'
            ? lsSucc - lagMs
            : type === 'ss'
              ? lsSucc - lagMs + durPred
              : type === 'ff'
                ? lfSucc - lagMs
                : lfSucc - lagMs + durPred // sf
        if (implied < value) value = implied
      }
      lf.set(id, value)
    }
    const critical = new Set<string>()
    const conflict = new Set<string>()
    for (const t of nodes) {
      const float = lf.get(t.id)! - dur.get(t.id)! - es.get(t.id)!
      if (Math.abs(float) < 1e-6) critical.add(t.id)
      else if (float < -1e-6) conflict.add(t.id) // 负总时差 = 已违反后继约束（违约）
      // 约束违反并入违约集（与负总时差同样呈现 .conflict）；日精度约束按**日历日**比较（本地时区安全）
      const con = this.constraintOf(t)
      if (!con) continue
      const dayStr = (ms: number): string => toISODate(new Date(ms))
      const startMs = this.startMsOfTask(t)
      if (con.mode === 'snet') {
        if (con.dateOnly ? dayStr(startMs) < dayStr(con.ms) : startMs < con.ms) conflict.add(t.id)
      } else if (con.mode === 'mso') {
        if (con.dateOnly ? dayStr(startMs) !== dayStr(con.ms) : startMs !== con.ms) conflict.add(t.id)
        // mso：被依赖要求的起点晚于锚点 → 该任务自身违约
        let required = Number.NEGATIVE_INFINITY
        for (const [predId, list] of successors) {
          for (const e of list) {
            if (e.succ !== t.id) continue
            const pS = es.get(predId)
            const pD = dur.get(predId)
            if (pS === undefined || pD === undefined) continue
            const lagMs = e.lag * DAY_MS
            const dSelf = dur.get(t.id)!
            const need =
              e.type === 'fs'
                ? pS + pD + lagMs
                : e.type === 'ss'
                  ? pS + lagMs
                  : e.type === 'ff'
                    ? pS + pD + lagMs - dSelf
                    : pS + lagMs - dSelf
            if (need > required) required = need
          }
        }
        if (required > con.ms + 1e-6) conflict.add(t.id)
      } else if (con.mode === 'fnlt') {
        const endInclusive = this.endMsOfTask(t) - 1
        if (con.dateOnly ? dayStr(endInclusive) > dayStr(con.ms) : this.endMsOfTask(t) > con.endMs) {
          conflict.add(t.id)
        }
      }
    }
    return { critical, conflict }
  }

  /** 连线 lag 提示文案（aria-label 末尾）：lag>0 作「滞后」、lag<0 作「提前」，0 不附 */
  private lagSuffixText(lag: number): string {
    if (lag === 0) return ''
    const n = Math.abs(lag)
    return `（${this.t(lag > 0 ? 'gantt.lagSuffix' : 'gantt.leadSuffix', { count: n })}）`
  }

  /**
   * 写回任务起点（保持工期）：里程碑只写 start；显式 milestone 携带矛盾 end 时把 end 归一为 start
   * （与 commitDates 同口径）。返回是否真的改动了数据串（未变则该次排程不算 dirty，防迭代空转）。
   */
  private writeStartKeepingDuration(t: TG, startMsNew: number, duration: number): boolean {
    const datetime = typeof t.start === 'string' && t.start.length > 10
    const startStr = this.fmtIso(startMsNew, datetime)
    // 写回域守卫：结果必须能被 parseTaskDate（parseISODate 只收 4 位年）回读，否则
    // `el.tasks = el.tasks` 这类回写会在清洗层静默丢任务。lag 上限之外的第二道防线——
    // 边界年份（如 9999）叠加合法 lag 仍可能写出 5 位年份；此时跳过本次写回，保持数据可回读。
    if (!parseTaskDate(startStr)) return false
    const milestone = t.type === 'milestone' || !t.end
    if (milestone) {
      if (t.start === startStr) return false
      t.start = startStr
      if (t.end) t.end = startStr
      return true
    }
    const endStr = this.fmtEnd(startMsNew + duration, datetime)
    if (!parseTaskDate(endStr)) return false
    if (t.start === startStr && t.end === endStr) return false
    t.start = startStr
    t.end = endStr
    return true
  }

  /**
   * 依赖约束松弛：返回被联动改期的任务 id（未开 auto-schedule 或零改动 → []，零事件）。
   * 命中多个前置时逐条满足（取最靠后约束）；收口 syncTasksAttr（属性通道同步触发一次全量
   * update 完成联动重渲染，**不再内嵌 update**——旧实现 sync+update 嵌套在触发它的 update 里，
   * 一次拖拽全量重渲染 4 跑）+ 派发 oas-reschedule。
   *
   * oas-tasks-change 契约（一次用户操作只发一次）：由**外层提交口**（commitTasks / applyPatch /
   * applyReparent / removeTasks 等经 syncTasksAttr 的路径，inInternalWrite 判别）统一派发一次
   * （含联动后最终数据），本方法在其在场时只发 oas-reschedule；属性通道直接改数据 / 运行期开启
   * auto-schedule 等无外层提交的触发，由本方法补发 tasks-change。
   * 事件序统一为「oas-reschedule → oas-tasks-change」（属性通道与提交口一致；拖动收口随后还有
   * oas-task-change）。
   *
   * 约束（opt-in）与工作日日历（workdays，opt-in）在此生效：
   * - snet 取约束下限（只前推）；mso 固定在约束日（依赖不得前推，数据偏离则拉回）；fnlt 不自动移动（仅违约判定）。
   * - workdays 开启时，前推落点吸附到下一个工作日（fs/ss 吸附起点；ff/sf 吸附对应 end 再派生 start）。
   *   工期仍按**日历日**计（本组件不压缩非工作日的工期跨度），仅起点/端点落位避开非工作日。
   * - 依赖成环时只让位**环内**节点（保持现网日期），环外节点照常排程；环内节点作前置用其当前日期（best-effort）。
   */
  private reschedule(): string[] {
    if (!this.autoScheduleOn()) return []
    const tasks = this._tasks
    if (tasks.length === 0) return []
    const byId = new Map<string, TG>()
    for (const t of tasks) byId.set(t.id, t)
    // 依赖环内节点让位：环内排程无解（互相前推会推远数据），保持现网日期；告警一次
    const cyclic = this.dependencyCyclicNodes(byId)
    if (cyclic.size > 0 && !this.warnedRescheduleCycle) {
      this.warnedRescheduleCycle = true
      devWarn('[oas-gantt] 依赖成环：环内任务已跳过联动排程（请先修正依赖）')
    }
    // 与 buildRows 同源树结构：断环节点（parent 成环被归根者）不计入其原父级的子级
    const { childMap, hasChildren } = this.childStructure(byId)
    // 生效区间（摘要取后代聚合，与 buildRows 一致）——供前置约束用
    const aggMemo = new Map<string, { startMs: number; endMs: number }>()
    const visiting = new Set<string>()
    const agg = (id: string): { startMs: number; endMs: number } => {
      const memo = aggMemo.get(id)
      if (memo) return memo
      const t = byId.get(id)!
      const kids = childMap.get(id) ?? []
      if (kids.length === 0 || visiting.has(id)) {
        const s = this.startMsOfTask(t)
        const r = { startMs: s, endMs: Math.max(this.endMsOfTask(t), s) }
        aggMemo.set(id, r)
        return r
      }
      visiting.add(id)
      let min = Number.POSITIVE_INFINITY
      let max = Number.NEGATIVE_INFINITY
      for (const k of kids) {
        const a = agg(k)
        if (a.startMs < min) min = a.startMs
        if (a.endMs > max) max = a.endMs
      }
      visiting.delete(id)
      const r = { startMs: min, endMs: max }
      aggMemo.set(id, r)
      return r
    }
    const invalidateAgg = (id: string): void => {
      let cur: string | undefined = id
      const seen = new Set<string>()
      while (cur && !seen.has(cur)) {
        seen.add(cur)
        aggMemo.delete(cur)
        cur = byId.get(cur)?.parent
      }
    }
    const changed = new Set<string>()
    const maxIter = tasks.length * 2 + 8
    for (let iter = 0; iter < maxIter; iter++) {
      let dirty = false
      for (const t of tasks) {
        if (t.disabled === true || hasChildren.has(t.id) || cyclic.has(t.id)) continue
        const startMs = this.startMsOfTask(t)
        const duration = this.endMsOfTask(t) - startMs
        const con = this.constraintOf(t)
        // mso：固定锚点——依赖不得前推；数据偏离约束日则拉回约束日（保持工期），且不再吸附
        if (con && con.mode === 'mso') {
          if (startMs === con.ms) continue
          if (this.writeStartKeepingDuration(t, con.ms, duration)) {
            changed.add(t.id)
            invalidateAgg(t.id)
            dirty = true
          }
          continue
        }
        let required = startMs
        for (const d of t.dependencies ?? []) {
          const pred = byId.get(d.id)
          if (!pred) continue
          const type = d.type ?? 'fs'
          const pa = agg(pred.id)
          // lag（天，可负 = 提前/允许重叠）× DAY_MS 叠加到约束端点；缺省 0
          const lagMs = (typeof d.lag === 'number' && Number.isFinite(d.lag) ? d.lag : 0) * DAY_MS
          // 端点落在非工作日 → 吸附到下一个工作日；ff/sf 吸附对应 end 后派生 start（工期不变）
          const need =
            type === 'fs'
              ? this.snapToWorkingDay(pa.endMs + lagMs)
              : type === 'ss'
                ? this.snapToWorkingDay(pa.startMs + lagMs)
                : type === 'ff'
                  ? this.snapToWorkingDay(pa.endMs + lagMs) - duration
                  : this.snapToWorkingDay(pa.startMs + lagMs) - duration
          if (need > required) required = need
        }
        // snet：约束下限（只前推不提前）。约束优先：先取 max 再吸附，故吸附结果不会早于约束日
        if (con && con.mode === 'snet' && con.ms > required) required = con.ms
        if (!(required > startMs)) continue // 只推不提前（fnlt 不在此移动：仅参与违约判定）
        required = this.snapToWorkingDay(required)
        if (!(required > startMs)) continue
        if (this.writeStartKeepingDuration(t, required, duration)) {
          changed.add(t.id)
          invalidateAgg(t.id)
          dirty = true
        }
      }
      if (!dirty) break
    }
    if (changed.size === 0) return []
    const ids = [...changed]
    this.syncTasksAttr()
    // 一次用户操作只发一次 oas-tasks-change：内部写回路径由外层提交口统一派发（最终数据），
    // 此处只发 oas-reschedule；无外层提交的触发（属性通道改数据 / 运行期开启）在此补发。
    // 先 reschedule 后 tasks-change：属性通道与提交口事件序统一（提交口的 tasks-change 在嵌套
    // update 返回后由 commitTasks 派发，同样紧随 reschedule）。
    this.emit('reschedule', { ids } satisfies GanttRescheduleDetail)
    if (!this.inInternalWrite) this.emitTasksChange()
    return ids
  }

  private onBarKeyDown(e: KeyboardEvent, row: GanttRow): void {
    if ((e.key === 'Delete' || e.key === 'Backspace') && !e.shiftKey) {
      // 条上 Delete/Backspace 不应冒泡到 document 去删已选连线（与行内行为一致）
      e.stopPropagation()
      return
    }
    if (e.key === 'Escape' && this.dragCtx) {
      e.stopPropagation()
      this.cancelDrag()
      return
    }
    if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || !e.shiftKey) return
    if (row.task.disabled === true || row.isSummary || this.datesReadonlyOn()) return
    e.preventDefault()
    const dir = (e.key === 'ArrowRight' ? 1 : -1) * (isRtl(this) ? -1 : 1)
    const datetime = row.task.start.length > 10
    // 整体平移：以 start 的单元步长求位移。两端各自 addUnitsMs 在 month/quarter/year 档会各自吸附到月首，
    // 短任务（<1 单元）会被压成 start>end 的非法值；用同一位移量则工期不变、恒合法。
    const deltaMs = this.addUnitsMs(row.startMs, dir) - row.startMs
    this.commitDates(row.task.id, row.startMs + deltaMs, row.endMs + deltaMs, datetime, row.startMs, row.endMs)
  }

  // ===== 依赖连线（SVG 单画布覆盖层，窗口行内绘制）=====

  private renderLinks(): void {
    const svg = this.linksEl
    if (!svg) return
    const totalH = this.layoutRows() * this.rowHeightPx()
    svg.setAttribute('width', String(this.canvasW))
    svg.setAttribute('height', String(totalH))
    svg.innerHTML =
      '<defs><marker id="oas-gantt-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z"/></marker></defs>'
    if (this.rows.length === 0) return
    const rowH = this.rowHeightPx()
    const rowIdx = new Map<string, number>()
    for (let i = this.winStart; i < this.winEnd; i++) rowIdx.set(this.rows[i]!.task.id, i)
    const frag = document.createDocumentFragment()
    const ns = 'http://www.w3.org/2000/svg'
    const ro = this.hasAttr('readonly')
    for (let i = this.winStart; i < this.winEnd; i++) {
      const t = this.rows[i]!
      for (const dep of t.task.dependencies ?? []) {
        const fromIdx = rowIdx.get(dep.id)
        const toIdx = rowIdx.get(t.task.id)
        if (fromIdx === undefined || toIdx === undefined) continue
        const from = this.rows[fromIdx]!
        const to = this.rows[toIdx]!
        const type = dep.type ?? 'fs'
        // 端点：fs 前置任务完成点→后继任务起始点；ss 起始点→起始点；ff 完成点→完成点；sf 起始点→完成点
        const fromX = type === 'fs' || type === 'ff' ? this.xOf(from.endMs) : this.xOf(from.startMs)
        const toX = type === 'fs' || type === 'ss' ? this.xOf(to.startMs) : this.xOf(to.endMs)
        const y1 = this.absRowTop(fromIdx) + rowH / 2
        const y2 = this.absRowTop(toIdx) + rowH / 2
        const x1 = this.mirrorX(fromX)
        const x2 = this.mirrorX(toX)
        // 折线：水平出 14px → 垂直 → 水平进；终点空间不足时收在中间（箭头仍随路径）
        const out = x2 >= x1 + 28 ? x2 - 14 : Math.max(x1, x2) + 14
        const d = `M ${x1} ${y1} L ${out} ${y1} L ${out} ${y2} L ${x2} ${y2}`
        const lag = typeof dep.lag === 'number' && Number.isFinite(dep.lag) ? dep.lag : 0
        // 命中路径仅对非只读且**后继未禁用**者渲染（禁用任务不被依赖写入，故其入边不可选删）；可见线仍画
        if (!ro && t.task.disabled !== true) {
          const hit = document.createElementNS(ns, 'path')
          hit.setAttribute('class', 'link-hit')
          hit.setAttribute('d', d)
          hit.setAttribute('data-from', t.task.id)
          hit.setAttribute('data-to', dep.id)
          hit.setAttribute('data-type', type)
          if (lag !== 0) hit.setAttribute('data-lag', String(lag))
          hit.setAttribute('role', 'button')
          hit.setAttribute('tabindex', '0')
          hit.setAttribute(
            'aria-label',
            `${this.t('gantt.linkDelete')}: ${from.task.name} → ${to.task.name}${this.lagSuffixText(lag)}`,
          )
          hit.addEventListener('click', (e) => {
            e.stopPropagation()
            this.selectLink(t.task.id, dep.id, type)
          })
          hit.addEventListener('keydown', (e) => {
            const k = e.key
            if (k === 'Enter' || k === ' ' || k === 'Delete' || k === 'Backspace') {
              e.preventDefault()
              e.stopPropagation()
              this.selectLink(t.task.id, dep.id, type)
              this.removeSelectedLink()
              // 命中路径随重建移除会让焦点落到 body → 交回组件，保持键盘可达
              const bar = this.barsEl?.querySelector<HTMLElement>(`.bar[data-id="${escId(t.task.id)}"]`)
              ;(bar ?? this).focus({ preventScroll: true })
            }
          })
          frag.appendChild(hit)
        }
        const path = document.createElementNS(ns, 'path')
        path.setAttribute('class', 'link')
        path.setAttribute('aria-hidden', 'true')
        path.setAttribute('d', d)
        path.setAttribute('data-from', t.task.id)
        path.setAttribute('data-to', dep.id)
        path.setAttribute('data-type', type)
        path.setAttribute('marker-end', 'url(#oas-gantt-arrow)')
        frag.appendChild(path)
        if (lag !== 0) {
          const label = document.createElementNS(ns, 'text')
          label.setAttribute('class', 'link-label')
          label.setAttribute('aria-hidden', 'true')
          label.setAttribute('x', String(out))
          label.setAttribute('y', String((y1 + y2) / 2))
          label.setAttribute('text-anchor', 'middle')
          label.setAttribute('dominant-baseline', 'middle')
          label.textContent = `${lag > 0 ? '+' : ''}${lag}`
          frag.appendChild(label)
        }
      }
    }
    svg.appendChild(frag)
    // 重渲染后按选中态回填高亮；目标连线已不在（过滤/数据变）则清掉武装态（防「不可见却可删」）
    if (this.selectedLink) {
      const sel = this.selectedLink
      const hit = svg.querySelector(
        `.link-hit[data-from="${escId(sel.successor)}"][data-to="${escId(sel.predecessor)}"][data-type="${sel.type}"]`,
      )
      if (hit) hit.classList.add('selected')
      else this.selectedLink = null
    }
  }

  /**
   * 行斑马纹层（stripe 属性，opt-in）：窗口内绝对行号为奇数的行画整行底色，与左侧行名
   * （data-stripe → .row-name[data-stripe] 背景）同口径。条纹容器插在 .grid-canvas 之前
   * （层级在下 → 周末/假日格只透出工作日部分），随滚动帧按窗口重建/清理（无残影）；
   * 关闭时容器一并移除（零额外 DOM）。条纹 top 走 absRowTop（绝对行号）→ 滚动/变高/切片
   * 后奇偶稳定。width 取画布全宽：列虚拟化下条纹不属于任何列，只随数据画布变宽。
   */
  private renderStripes(): void {
    const inner = this.innerEl
    const grid = this.gridEl
    if (!inner || !grid) return
    // render() 重建 innerHTML 后旧引用失联 → 以 isConnected 自愈重建
    let canvas = this.stripeCanvasEl
    if (canvas && !canvas.isConnected) canvas = this.stripeCanvasEl = null
    if (!this.stripeOn()) {
      canvas?.remove()
      this.stripeCanvasEl = null
      return
    }
    if (!canvas) {
      canvas = document.createElement('div')
      canvas.className = 'stripe-canvas'
      canvas.setAttribute('aria-hidden', 'true')
      inner.insertBefore(canvas, grid)
      this.stripeCanvasEl = canvas
    }
    canvas.innerHTML = ''
    const rowH = this.rowHeightPx()
    const frag = document.createDocumentFragment()
    for (let i = this.winStart; i < this.winEnd; i++) {
      if (!this.isStripeRow(i)) continue
      const stripe = document.createElement('div')
      stripe.className = 'stripe'
      stripe.style.top = `${this.absRowTop(i)}px`
      stripe.style.height = `${rowH}px`
      stripe.style.width = `${this.canvasW}px`
      frag.appendChild(stripe)
    }
    canvas.appendChild(frag)
  }

  /** 周末/假日列高亮（day/hour 档；week+ 档跨度大不高亮） */
  private renderGrid(): void {
    const grid = this.gridEl
    if (!grid) return
    grid.innerHTML = ''
    const scale = this.scaleMode()
    if (scale !== 'day' && scale !== 'hour') return
    if (this.rows.length === 0) return
    const colW = this.colW()
    const totalH = this.layoutRows() * this.rowHeightPx()
    const holidays = this.holidaySet()
    const weekends = this.weekendsOn()
    const frag = document.createDocumentFragment()
    // 横向列虚拟化：周末/假日格只渲染窗口列（left 仍按全局 x 写，滚动由容器原生位移承载）
    for (let k = this.winColStart; k < this.winColEnd; k++) {
      const u = this.units[k]!
      const d = new Date(u.startMs)
      const iso = toISODate(d)
      const isHoliday = holidays.has(iso)
      const isWeekend = weekends && (d.getDay() === 0 || d.getDay() === 6)
      if (!isHoliday && !isWeekend) continue
      const cell = document.createElement('div')
      cell.className = `cell${isHoliday ? ' holiday' : ' weekend'}`
      cell.style.left = `${this.mirrorCellLeft(this.xOf(u.startMs), colW)}px`
      cell.style.width = `${colW}px`
      cell.style.height = `${totalH}px`
      frag.appendChild(cell)
    }
    grid.appendChild(frag)
  }

  /** 今日线（show-today 默认开；today 在范围内才渲染；装饰层 aria-hidden） */
  private renderToday(): void {
    const line = this.todayEl
    if (!line) return
    const todayMs = startOfDay(new Date()).getTime()
    const inRange =
      this.units.length > 0 && todayMs >= this.units[0]!.startMs && todayMs < this.units[this.units.length - 1]!.endMs
    if (!this.showTodayOn() || !inRange || this.rows.length === 0) {
      line.hidden = true
      return
    }
    line.hidden = false
    line.style.left = `${this.mirrorX(this.xOf(todayMs))}px`
    line.style.height = `${this.layoutRows() * this.rowHeightPx()}px`
    line.setAttribute('title', this.t('gantt.today'))
  }

  // ===== tooltip（单例浮层：名称 + 区间 + 进度；template[slot=tooltip] 覆盖内容）=====

  private showTooltip(row: GanttRow, bar: HTMLElement): void {
    const tip = this.tooltipEl
    if (!tip) return
    const tpl = this.querySelector('template[slot="tooltip"]')
    if (tpl instanceof HTMLTemplateElement) {
      tip.innerHTML = ''
      tip.appendChild(tpl.content.cloneNode(true))
      const nameEl = tip.querySelector<HTMLElement>('[data-task-name]')
      if (nameEl) nameEl.textContent = row.task.name
      const rangeEl = tip.querySelector<HTMLElement>('[data-task-range]')
      if (rangeEl) rangeEl.textContent = this.rangeText(row)
      const progEl = tip.querySelector<HTMLElement>('[data-task-progress]')
      if (progEl) progEl.textContent = this.t('gantt.tooltipProgress', { progress: row.progress })
    } else {
      tip.innerHTML = ''
      const name = document.createElement('div')
      name.className = 'tip-name'
      name.textContent = row.task.name
      tip.appendChild(name)
      const range = document.createElement('div')
      range.className = 'tip-line'
      range.textContent = row.isMilestone
        ? `${this.t('gantt.milestone')} · ${this.fmtDay(row.startMs)}`
        : this.rangeText(row)
      tip.appendChild(range)
      if (!row.isMilestone && row.task.end) {
        const prog = document.createElement('div')
        prog.className = 'tip-line'
        prog.textContent = this.t('gantt.tooltipProgress', { progress: row.progress })
        tip.appendChild(prog)
      }
    }
    tip.hidden = false
    // 定位：条上方居中（宿主视口内夹取）；无布局环境（rect 全 0）时回落原点不炸
    const hostRect = this.getBoundingClientRect()
    const barRect = bar.getBoundingClientRect()
    const tipW = tip.offsetWidth || 180
    const tipH = tip.offsetHeight || 56
    let left = barRect.left - hostRect.left + barRect.width / 2 - tipW / 2
    let top = barRect.top - hostRect.top - tipH - 6
    if (top < 0) top = barRect.top - hostRect.top + barRect.height + 6
    left = Math.max(4, Math.min(left, Math.max(hostRect.width - tipW - 4, 4)))
    tip.style.left = `${Math.max(0, left)}px`
    tip.style.top = `${Math.max(0, top)}px`
  }

  private rangeText(row: GanttRow): string {
    return this.t('gantt.tooltipRange', { start: this.fmtDay(row.startMs), end: this.fmtDay(row.endMs - 1) })
  }

  private hideTooltip(): void {
    if (this.tooltipEl) this.tooltipEl.hidden = true
  }

  override disconnectedCallback(): void {
    this.dragCtx = null
    this.unbindDocDrag()
    super.disconnectedCallback()
  }
}
