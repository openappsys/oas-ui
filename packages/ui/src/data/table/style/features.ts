/** 特性样式：行内编辑 / 校验与错误条 / 行拖拽 / 焦点环 / 按字段类型渲染 / 分组 / 打印（切分自 oas-table 内联 STYLE 后段，顺序不变） */
export const FEATURES_STYLE = `
/* 行内编辑：编辑态单元格与列高亮 */
td.editing {
  padding: 0;
  /* 编辑器绝对定位覆于占位文本上（占位保列宽/行高的布局贡献，编辑器零贡献 → 进编辑不撑列） */
  position: relative;
}
/* 编辑态占位：与原单元格文本同尺寸不可见（沿用原 padding 档位），auto 布局下列宽/行高贡献与常态逐像素一致 */
.cell-editor-sizer {
  display: block;
  visibility: hidden;
  box-sizing: border-box;
  padding: var(--_cell-py) var(--_cell-px);
}
/* 操作列两态同槽叠放：格子宽度恒为「编辑」与「保存/取消」两组的最大值，进/出编辑不挤压邻列 */
.action-stack {
  display: inline-grid;
}
.action-stack > .action-group {
  grid-area: 1 / 1;
  white-space: nowrap;
}
.action-stack > .action-group.group-hidden {
  visibility: hidden;
}
/* 编辑中单元格底色：组件私有变量（角色化命名），primary 8% 混 transparent；
   不引用 --oas-color-primary-soft——该全局 token 不存在（定义即误导），配方就地私有定义 */
td[data-editing='true'],
tr[data-sticky='true'] td[data-editing='true'] {
  --_oas-cell-editing-bg: color-mix(in srgb, var(--oas-color-primary) 8%, transparent);
  background: var(--_oas-cell-editing-bg);
}
.edit-error {
  /* 校验消息 = 单元格顶部警示条（absolute 覆于编辑器上沿，z-index 压过编辑器）：
     行高固定/虚拟滚动模型下挂 td 下方会被 .table-scroll overflow:auto 在视口底缘裁掉
     （末行滚不到 = 永远不可见）；条带形态在 td 内部，任何行位/滚动位置都完整可见 */
  position: absolute;
  top: 0;
  inset-inline: 0;
  z-index: 4;
  display: block;
  padding: 1px 6px;
  font-size: var(--oas-font-size-xs, 12px);
  line-height: 16px;
  /* 实底反色：danger 实底上文字用 on-danger token（专为实底设计，light/dark 双档 AA 达标，
     与 .rows-error-retry:hover 实底反色同一体系） */
  color: var(--oas-color-text-on-danger);
  background: var(--oas-color-danger);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
td.editing .cell-editor {
  box-sizing: border-box;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* 编辑态与常规单元格同密度：padding/字号跟随档位变量 */
  padding: var(--_cell-py) var(--_cell-px);
  border: none;
  background: transparent;
  color: var(--oas-color-text-primary);
  font-size: inherit;
  font-family: inherit;
  line-height: inherit;
}
td.editing .cell-editor:focus {
  outline: none;
  background: var(--oas-color-bg);
  box-shadow: inset 0 0 0 2px var(--oas-color-primary);
}
/* 校验失败态：特异性压过行 hover 底/行选中底/editing 底色与编辑器 focus 环
   （鼠标悬停在被编辑行 + 行选中时都必须可见；danger 语义，token 暗色自适应）。
   12% 混合与编辑态 8% 主色底可区分；消息浮层见 .edit-error */
tr.row:hover td.editing[data-invalid='true'],
tr.row[data-selected='true'] td.editing[data-invalid='true'],
tr[data-sticky='true'][data-selected='true'] td.editing[data-invalid='true'],
td.editing[data-invalid='true'] {
  background: var(--oas-color-danger-soft);
}
td.editing[data-invalid='true'] .cell-editor:focus {
  box-shadow: inset 0 0 0 2px var(--oas-color-danger);
}
/* 浮层编辑器通道（oas-select / oas-date-picker）：invalid 后焦点落在宿主内部 input，
   .cell-editor:focus 不命中——wrapper part 补 danger 内环，两通道错误视觉同口径 */
td.editing[data-invalid='true'] .cell-editor-overlay::part(wrapper) {
  box-shadow: inset 0 0 0 2px var(--oas-color-danger);
}
/* 浮层类编辑器（select/date-picker 组件通道）：组件宿主的触发器自带内边距与控高，
   通用规则的单元格 padding 会压缩其内容盒（trigger 被压到内容宽→文字逐字换行+行高裁剪）——
   overlay 宿主 padding 归零，part 穿透让 wrapper/trigger 撑满单元格 */
td.editing .cell-editor-overlay {
  padding: 0;
}
td.editing .cell-editor-overlay::part(wrapper),
td.editing .cell-editor-overlay::part(picker) {
  width: 100%;
  height: 100%;
}
td.editing .cell-editor-overlay::part(trigger) {
  width: 100%;
  height: 100%;
  min-height: 0;
  white-space: nowrap;
}
th[data-editing-col='true'] {
  color: var(--oas-color-primary);
  box-shadow: inset 0 -2px 0 var(--oas-color-primary);
}
/* 可编辑单元格可感知线索：hover/focus-visible 淡底色 + text 光标 + 右上角铅笔图标。
   编辑中（data-editing）由编辑器接管视觉，不显示本态；条纹/选中/吸顶叠加时本态优先级最高。
   铅笔图标 opacity 过渡只走透明度、pointer-events:none 不拦截单元格点击/双击 */
td.editable-cell {
  cursor: text;
}
td.editable-cell:not([data-fixed]) {
  position: relative; /* 铅笔图标绝对定位的上下文（固定列自身 sticky 已是定位上下文） */
}
td.editable-cell .cell-edit-icon {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  opacity: 0;
  color: var(--oas-color-text-secondary);
  pointer-events: none;
  transition: opacity 0.15s ease;
}
tr.row td.editable-cell:not([data-editing='true']):hover,
tr.row td.editable-cell:not([data-editing='true']):focus-visible,
tr[data-sticky='true'] td.editable-cell:not([data-editing='true']):hover,
tr[data-sticky='true'] td.editable-cell:not([data-editing='true']):focus-visible {
  /* bg-hover 为不透明色：吸顶/固定列下不露出底层滚动内容 */
  background: var(--oas-color-bg-hover);
}
tr.row td.editable-cell[data-fixed='left']:not([data-editing='true']):hover,
tr.row td.editable-cell[data-fixed='right']:not([data-editing='true']):hover,
tr.row td.editable-cell[data-fixed='left']:not([data-editing='true']):focus-visible,
tr.row td.editable-cell[data-fixed='right']:not([data-editing='true']):focus-visible,
tr[data-sticky='true'] td.editable-cell[data-fixed]:not([data-editing='true']):hover,
tr[data-sticky='true'] td.editable-cell[data-fixed]:not([data-editing='true']):focus-visible {
  background: var(--oas-color-bg-hover);
}
tr.row td.editable-cell:not([data-editing='true']):hover .cell-edit-icon,
tr.row td.editable-cell:not([data-editing='true']):focus-visible .cell-edit-icon,
tr[data-sticky='true'] td.editable-cell:not([data-editing='true']):hover .cell-edit-icon,
tr[data-sticky='true'] td.editable-cell:not([data-editing='true']):focus-visible .cell-edit-icon {
  opacity: 1;
}
/* 操作列按钮 */
.action-btn {
  appearance: none;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--oas-color-primary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
}
.action-btn:hover {
  background: var(--oas-color-bg-hover);
}
.pagination {
  display: flex;
  justify-content: flex-end;
  padding: var(--oas-space-2) var(--oas-space-1);
  border-top: 1px solid var(--oas-color-border);
}
.pagination:empty {
  display: none;
}
/* 工具栏（D8 导出）：默认空容器（:empty 隐藏），exportable 时由核心注入导出按钮 */
.table-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2) var(--oas-space-3);
  border-bottom: 1px solid var(--oas-color-border);
}
.table-toolbar:empty {
  display: none;
}
/* server 行模型失败条：紧凑单行（图标 + 文案 + 重试），danger 语义 token（暗色自适应）。
   默认 hidden；reportRowsError 生效时显示。紧贴工具栏下方，不与表体滚动耦合 */
.rows-error {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2) var(--oas-space-3);
  border-bottom: 1px solid var(--oas-color-danger);
  background: var(--oas-color-danger-soft);
  color: var(--oas-color-danger-text);
  font-size: var(--oas-font-size-sm);
}
.rows-error[hidden] {
  display: none;
}
.rows-error-icon {
  display: inline-flex;
  flex: none;
}
.rows-error-icon svg {
  display: block;
  width: 14px;
  height: 14px;
}
.rows-error-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* 正文色：light 下语义文字色压 danger 12% 混合底对比 4.14:1，不达 13px 正常文本 AA 门 4.5。
     错误语义由底色/边框/图标承担，文字不重复承载语义色 */
  color: var(--oas-color-text-primary);
}
.rows-error-retry {
  flex: none;
  height: var(--oas-control-height-sm);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-danger);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-danger);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
}
.rows-error-retry:hover {
  color: var(--oas-color-text-on-danger);
  background: var(--oas-color-danger);
}
.rows-error-retry:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.export-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  height: var(--oas-control-height-sm);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
}
.export-btn:hover {
  color: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
}
.export-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.export-btn svg {
  display: block;
  width: 14px;
  height: 14px;
}
/* 行拖拽（D15）：手柄列 + 抓握图标 + 拖拽落点指示 */
.row-drag-cell {
  width: 40px;
  text-align: center;
}
.row-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--oas-radius-xs, 4px);
  color: var(--oas-color-text-secondary);
  cursor: grab;
  vertical-align: middle;
}
.row-drag-handle:hover,
.row-drag-handle:focus-visible {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.row-drag-handle:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.row-drag-handle:active {
  cursor: grabbing;
}
.row-drag-handle svg {
  display: block;
  width: 14px;
  height: 14px;
}
tr.row.drag-source td {
  opacity: 0.45;
}
tr.row.drop-before td {
  box-shadow: inset 0 2px 0 var(--oas-color-primary);
}
tr.row.drop-after td {
  box-shadow: inset 0 -2px 0 var(--oas-color-primary);
}
/* 网格导航（D9）：容器与单元格焦点环（单元格 tabindex=-1，由方向键聚焦） */
:host([grid-navigation]) .table-scroll:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
:host([grid-navigation]) tbody tr.row td:focus {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--oas-color-primary);
}
.filter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-inline-start: var(--oas-space-1);
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  vertical-align: middle;
  padding: 0;
  border-radius: var(--oas-radius-xs, 4px);
}
.filter-btn:hover {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.filter-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.filter-panel {
  position: fixed;
  z-index: calc(var(--oas-z-index-base, 0) + 1000);
  min-width: 140px;
  padding: var(--oas-space-2);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: var(--oas-shadow-md);
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  max-height: 260px;
  overflow: auto;
}
.filter-title {
  font-weight: 600;
  color: var(--oas-color-text-secondary);
  margin-bottom: var(--oas-space-1);
}
.filter-option {
  text-align: start;
  border: none;
  background: transparent;
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  color: var(--oas-color-text-primary);
  font: inherit;
}
.filter-option:hover,
.filter-option[aria-selected='true'] {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-primary);
}
.filter-clear {
  text-align: start;
  border: none;
  background: transparent;
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  color: var(--oas-color-danger);
  font: inherit;
}
.filter-clear:hover {
  background: var(--oas-color-bg-hover);
}
.action-btn.danger {
  color: var(--oas-color-text-secondary);
}
.action-btn.danger:hover {
  color: var(--oas-color-danger);
}
.action-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 触屏列重排按钮：HTML5 DnD（dragstart）触屏不可用，coarse 下提供上移/下移按钮替代。
   PC 态 display:none 零视觉/无障碍影响，拖拽重排不受影响；按钮由列设置能力注入。
   箭头为原创内联 SVG（与 dynamic-input 排序按钮同风格） */
.col-move {
  display: none;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-inline-start: 2px;
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-xs, 4px);
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  vertical-align: middle;
}
.col-move svg {
  width: 12px;
  height: 12px;
  display: block;
}
.col-move:hover {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.col-move:disabled {
  opacity: 0.35;
  cursor: default;
}
.col-move:disabled:hover {
  color: var(--oas-color-text-secondary);
  background: transparent;
}
/* 触屏（coarse）：小触控点群命中区抬到 44px 触控目标（--oas-touch-target-min），
   视觉尺寸不变——::before 透明热区外扩；列宽拖拽手柄 coarse 加宽到 44px（JS 热区判定同步） */
@media (pointer: coarse) {
  .col-move {
    display: inline-flex;
  }
  .filter-btn,
  .toggle {
    position: relative;
  }
  .filter-btn::before {
    content: '';
    position: absolute;
    inset: -13px;
  }
  .toggle::before {
    content: '';
    position: absolute;
    inset: -12px;
  }
  :host([data-col-resizing]) th[data-key]::after {
    width: 44px;
  }
}
/* ===== 列字段类型（type）默认渲染 ===== */
/* select / multi-select 徽章：颜色全走 token（--_badge-color/--_badge-bg 由 JS 按 options[].color
   注入，缺省回落 bg-hover + 次级文字色的中性 token 组合，暗色自动可读） */
.type-badge {
  display: inline-block;
  max-width: 100%;
  box-sizing: border-box;
  padding: 1px var(--oas-space-2);
  border-radius: var(--oas-radius-full, 999px);
  font-size: var(--oas-font-size-xs, var(--oas-font-size-sm));
  line-height: 1.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: var(--_badge-bg, var(--oas-color-bg-hover));
  color: var(--_badge-fg, var(--oas-color-text-secondary-strong));
  border: 1px solid var(--_badge-border, transparent);
}
.type-badge-group {
  display: inline-flex;
  max-width: 100%;
  flex-wrap: wrap;
  gap: var(--oas-space-1);
}
/* progress 进度条：track 中性底 + fill 主色（token，暗色自动适配） */
.type-progress {
  width: 100%;
  min-width: 64px;
  height: 6px;
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-color-bg-hover);
  overflow: hidden;
}
.type-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--oas-color-primary);
}
/* rate 星级：实心警示色 / 空心次级灰（token） */
.type-rate {
  white-space: nowrap;
  letter-spacing: 1px;
}
.type-rate-on {
  /* warning 主色直接铺底对比度不达标（a11y 实抓）：混主文字色加深/提亮（badge 同款安全档） */
  color: color-mix(in srgb, var(--oas-color-warning) 72%, var(--oas-color-text-primary));
}
.type-rate-off {
  color: var(--oas-color-text-secondary-strong);
}
/* link 类型：主色下划线（hover 加重）；主色铺底对比度不达标配同上混主文字色 */
.type-link {
  color: color-mix(in srgb, var(--oas-color-primary) 72%, var(--oas-color-text-primary));
  text-decoration: underline;
}
.type-link:hover {
  color: color-mix(in srgb, var(--oas-color-primary) 72%, var(--oas-color-text-primary));
  opacity: 0.8;
}
.type-link:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
  border-radius: var(--oas-radius-xs, 4px);
}
/* checkbox 类型只读勾选态：✓ 主色 / — 次级灰 */
.type-check-on {
  color: var(--oas-color-primary);
}
.type-check-off {
  color: var(--oas-color-text-secondary-strong);
}
/* date 类型：防连字符折行 */
.type-date {
  white-space: nowrap;
}
/* ===== 分组视图（group-by）分节头行 ===== */
tr.group-header td {
  background: var(--oas-color-bg-hover);
  font-weight: 600;
}
tr.group-header .group-count {
  margin-inline-start: var(--oas-space-2);
  font-weight: 400;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
tr.group-header .toggle {
  margin-inline-end: var(--oas-space-1);
}
/* ===== 单元格溢出提示（cell-tooltip 单例浮层） =====
   反色浮层与 tooltip 组件同源 token（暗色自动可读）；fixed 定位 + 视口夹取由 floating 引擎计算；
   pointer-events:none 防浮层遮挡单元格触发 mouseout 抖动 */
.cell-tooltip {
  position: fixed;
  z-index: calc(var(--oas-z-index-base, 0) + 1000);
  max-width: min(60vw, 360px);
  box-sizing: border-box;
  padding: var(--oas-space-1) var(--oas-space-2);
  background: var(--oas-tooltip-bg, var(--oas-color-text-primary));
  color: var(--oas-tooltip-color, var(--oas-color-bg));
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-sm);
  line-height: 1.6;
  word-break: break-all;
  pointer-events: none;
  display: none;
}
.cell-tooltip[data-visible='true'] {
  display: block;
}

@media (forced-colors: active) {
  /* 强制色下 box-shadow 被 UA 弃用：焦点环回退系统色实线 outline（WCAG 2.4.7） */
  .export-btn:focus-visible,
  .row-drag-handle:focus-visible,
  :host([grid-navigation]) .table-scroll:focus-visible,
  .filter-btn:focus-visible,
  .action-btn:focus-visible,
  .type-link:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
    box-shadow: none;
  }
  td.editing .cell-editor:focus,
  :host([grid-navigation]) tbody tr.row td:focus {
    outline: 1px solid CanvasText;
    outline-offset: -1px;
    box-shadow: none;
  }
}

/* 打印视图（@media print）：容器几何解除 + sticky 定位复位。
   行/列「全量渲染」由 JS 接缝负责（print 媒体下行窗口/列窗口恒全量——窗口外内容不在 DOM，
   CSS 无法唤回），此处只管容器：滚动限高（height / max-height 属性会内联写入 maxHeight，
   必须 !important 压制）与溢出裁剪解除、外框圆角归零、吸顶表头/固定列/吸顶行的 sticky 复位
   （th/td 元素选择器已覆盖 data-fixed / data-sticky 变体；static 下 top/z-index 自动作废，
   内联 left 同理无需清理）。行形态与屏显一致（虚拟定高行的截断语义保留，不做打印特化排版）。 */
@media print {
  :host {
    border: 0;
    border-radius: 0;
  }
  .table-scroll {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }
  th,
  td {
    position: static;
  }
  /* 占位行不占纸面：本地虚拟 print 全量下 spacer 高度本就归零；windowed 切片按绝对行铺位、
     spacer 承载 window-start 之前的空白（绝对铺位是滚动正确性核心，JS 不为打印分叉）——
     打印时隐藏，纸面从已装载切片首行开始（「打印输出 = 已装载切片」口径的几何配套） */
  tr.spacer {
    display: none;
  }
  /* server 行模型失败条不进纸面：错误条是屏显交互反馈（重试按钮在纸上无意义），
     打印输出只收数据行（错误态下打印 = 输出保留的旧数据切片） */
  .rows-error {
    display: none;
  }
  /* loading 行不进纸面：在途态是屏显过渡，打印等待中的表格只输出已回填数据。
     loading td 为早退分支动态节点，用 :has 从 td 反查宿主 tr（不给 tr 加类——
     仓内 :has 先例：carousel / chips-input / combobox / segmented） */
  tr:has(td.loading) {
    display: none;
  }
}
`
