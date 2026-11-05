/**
 * oas-gantt 组件样式：scoped CSS 模板字符串（从 oas-gantt.ts 机械迁移，零行为变更）。
 * 拆分边界：只含 STYLE 常量；组件逻辑见 oas-gantt.ts，类型见 gantt-types.ts，
 * 模块级纯函数/常量见 gantt-utils.ts，类方法抽出的无状态 helper 见 gantt-helpers.ts。
 */
export const STYLE = `
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
/* 工时列（show-effort，opt-in 默认关）：表头与行名共用同一两列模板（名称自适应 | 工时定宽右对齐）。
   关闭时无 .effort 节点、表头保持空 div——既有单列形态 DOM 逐节点不变 */
.side-head.has-effort {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding-inline: var(--oas-space-2);
  box-sizing: border-box;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary-strong);
}
.side-head .head-name {
  flex: 1 1 auto;
  min-width: 0;
}
.side-head .head-effort {
  flex: none;
  width: var(--oas-gantt-effort-width, 56px);
  text-align: end;
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
/* 行 hover 底色（hover 属性，默认开；hover="false" 经 --_row-hover-bg 置透明关闭，不改写本规则）。
   与斑马纹独立 token（--oas-gantt-row-hover-bg），可分别自定义；定义在斑马纹之后、selected 之前
   （同特异性后者胜）→ 优先级序：条纹 < hover < 选中。
   媒体守卫与 JS 侧 pointerType=touch 守卫配套：触屏（hover: none）上原生 :hover 会粘住，
   造成「左侧行名高亮、时间轴却不出装饰层」的左右不一致 → 仅在真实悬停设备上声明。 */
:host([hover='false']) {
  --_row-hover-bg: transparent;
}
@media (hover: hover) {
  .row-name:hover {
    background: var(--_row-hover-bg, var(--oas-gantt-row-hover-bg, var(--oas-color-bg-hover)));
  }
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
  color: var(--oas-gantt-conflict-color, var(--oas-color-danger-text));
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
.variance {
  flex: none;
  font-size: var(--oas-font-size-xs);
  font-variant-numeric: tabular-nums;
  color: var(--oas-color-text-secondary-strong);
  white-space: nowrap;
}
.variance[data-late] {
  color: var(--oas-color-danger);
}
.variance[data-early] {
  color: var(--oas-color-success);
}
/* 工时单元格（show-effort 开启）：与表头同列模板——定宽右对齐 tabular-nums，数值稳定不跳动；
   颜色沿用行标签次级文本 token（暗色变体随 token 自动切换） */
.row-name .effort {
  flex: none;
  width: var(--oas-gantt-effort-width, 56px);
  text-align: end;
  font-variant-numeric: tabular-nums;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary-strong);
  white-space: nowrap;
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
   （同为 absolute 无 z-index → 先者先绘）。周末/假日列使用相对 --oas-color-bg 的不透明混合：
   若用 transparent 会与下方斑马纹二次叠加，斑马行上的周末列会被染成条纹色。 */
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
/* 行 hover 时间轴装饰层（单元素，跟随 hover 行；插在 .grid-canvas 之前 = 条纹之上、周末/假日列之下）。
   同 token 链 --_row-hover-bg / --oas-gantt-row-hover-bg，与左侧行名 hover 同源同色 */
.row-hover {
  position: absolute;
  inset-inline-start: 0;
  pointer-events: none;
  background: var(--_row-hover-bg, var(--oas-gantt-row-hover-bg, var(--oas-color-bg-hover)));
}
.grid-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.grid-canvas .cell {
  position: absolute;
  top: 0;
  background: var(--oas-gantt-weekend-bg, color-mix(in srgb, var(--oas-color-bg-hover) 60%, var(--oas-color-bg)));
}
.grid-canvas .cell.holiday {
  background: var(--oas-gantt-holiday-bg, color-mix(in srgb, var(--oas-color-warning) 12%, var(--oas-color-bg)));
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
.baseline-progress {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--oas-gantt-baseline-progress-color, var(--oas-color-text-secondary-strong));
}
.deadline {
  position: absolute;
  width: 2px;
  border-inline-start: 1px dashed var(--oas-gantt-deadline-color, var(--oas-color-danger));
  pointer-events: auto;
  cursor: help;
  opacity: 0.75;
  z-index: 1;
}
.float-label {
  position: absolute;
  inset-inline-start: calc(100% + 4px);
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
  font-size: var(--oas-font-size-xs, 11px);
  color: var(--oas-color-text-secondary);
  background: var(--oas-color-bg);
  padding-inline: 2px;
  border-radius: var(--oas-radius-sm);
  pointer-events: none;
}
.float-inline {
  margin-inline-start: 4px;
  color: inherit;
  font-size: var(--oas-font-size-xs, 11px);
  font-weight: normal;
}
.bar.has-float.label-right .bar-label,
.bar.has-float.label-left .bar-label {
  max-width: 360px;
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
/* 状态线（show-status-line，opt-in 默认关）：与 today-line 同路径渲染，独立 token
   缺省取 warning 色族（进度线语义色，与「今天」的 danger 区分）；装饰层不拦指针 */
.status-line {
  position: absolute;
  top: 0;
  width: 2px;
  background: var(--oas-gantt-status-line-color, var(--oas-color-warning));
  pointer-events: none;
  z-index: 1;
}
.status-line[hidden] {
  display: none !important;
}
/* 计划进度刻度（show-status-line 开启）：任务条内按 planned%（status-date 时刻在
   [start, end] 的时间流逝占比）画的窄竖线，与状态线同 token 同色——只画刻度、不染色不告警。
   milestone 内为二值刻度（0/1）；条 overflow:hidden 裁掉出条部分，RTL 走逻辑属性自动镜像 */
.plan-tick {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--oas-gantt-status-line-color, var(--oas-color-warning));
  pointer-events: none;
  z-index: 2;
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
/* ===== 资源负荷面板（show-resource-load，opt-in 默认关） =====
   图表下方按同一时间轴对齐的负荷桶条：每资源一行，桶高 ∝ 负荷%（桶内覆盖天数/桶天数），
   同资源任务在桶内重叠时逐任务累计 → >100% 走 danger 通道（与 pool 超配检测同语义）。
   纯可视化摘要：面板 role="img" + i18n aria-label 摘要，不进 Tab 序（读屏走摘要）；
   横向平移跟随图表内容层（syncHeaderOffset 同一 rect 差公式，RTL/任意滚动模型一致），
   缩放/平移复用 update() 时的轴参数（xOf/units/colW），不重算负荷。
   行名列宽与左侧列表同 token（--oas-gantt-list-width）→ 桶条与图表时间轴逐列对齐。
   .load-body 有高度上限（--oas-gantt-load-max-height，缺省 240px）+ 纵向滚动：资源行多时不撑高宿主布局，
   数据不截断（全量 DOM，滚动只裁剪视口）。 */
.load-panel {
  border: 1px solid var(--oas-color-border);
  border-top: 0;
  border-radius: 0 0 var(--oas-radius-md) var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  overflow: hidden;
}
.load-panel[hidden] {
  display: none !important;
}
.load-head {
  height: 28px;
  display: flex;
  align-items: center;
  padding-inline: var(--oas-space-2);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary-strong);
  border-bottom: 1px solid var(--oas-gantt-grid-line-color, var(--oas-color-border));
  background: var(--oas-gantt-header-bg, var(--oas-color-bg));
}
/* 资源行数无上限：按 24px/行随资源数无限撑高会挤坏宿主布局（面板是图表下方的摘要块，不是主区）
   → 纵向滚动承载，高度上限 token 开口（缺省 240px = 10 行）。数据不做截断：DOM 仍全量渲染，
   滚动只是视口裁剪（本面板不做虚拟滚动，行数级另有 windowed 口径，见 renderResourceLoad）。
   横向不滚动（.load-track 为 flex:1 + min-width:0，桶层超宽由 track 自身 overflow:hidden 裁），
   行名列因此天然常驻可见——纵向滚动不改变列位置，sticky 左列在此无意义（留待将来支持横向滚动再补）。 */
.load-body {
  max-height: var(--oas-gantt-load-max-height, 240px);
  overflow-y: auto;
}
.load-row {
  display: flex;
  align-items: stretch;
  height: var(--oas-gantt-load-row-height, 24px);
  font-size: var(--oas-font-size-xs);
}
.load-row .load-name {
  flex: none;
  width: var(--oas-gantt-list-width, 220px);
  display: flex;
  align-items: center;
  padding-inline: var(--oas-space-2);
  box-sizing: border-box;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--oas-color-text-primary);
  border-inline-end: 1px solid var(--oas-gantt-grid-line-color, var(--oas-color-border));
  background: var(--oas-gantt-header-bg, var(--oas-color-bg));
}
.load-row .load-track {
  flex: 1;
  min-width: 0;
  position: relative;
  overflow: hidden;
}
.load-row .load-inner {
  position: absolute;
  top: 0;
  bottom: 0;
  /* 物理左锚定（非 inset-inline-start）：桶条 left 已由 mirrorCellLeft 按物理坐标镜像（与表头/网格格同款），
     内层画布必须与图表内容层同锚（syncHeaderOffset 按 rect 差 translateX 对齐，RTL 同式成立） */
  left: 0;
}
.load-cell {
  position: absolute;
  bottom: 0;
  min-width: 2px;
  background: var(--oas-gantt-load-bg, color-mix(in srgb, var(--oas-color-primary) 45%, var(--oas-color-bg)));
  border-radius: 1px;
}
/* 超配桶（覆盖日数 > 桶天数）：danger 通道（暗色变体随 token 自动切换） */
.load-cell.over {
  background: var(--oas-gantt-load-over-bg, var(--oas-color-danger));
}
.load-empty {
  padding: var(--oas-space-2);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary-strong);
}
/* ===== 高对比模式（forced-colors: active）兜底 =====
   系统强制色会覆盖 background、禁用 box-shadow：凡「只凭底色/阴影」传达信息的元素
   （今日线/状态线/进度刻度、周末与假日列、基线条、行选中态、任务条本体、进度填充、
   里程碑菱形）在高对比下会整体不可见。以下在媒体查询内追加 outline/border 兜底——
   两者保留宽度与线型，颜色由强制色接管（CanvasText，高对比可见），常态样式不动。 */
@media (forced-colors: active) {
  /* 竖线与细条类（2px 线 / 4px 基线 / 里程碑菱形）：outline 不占布局，线宽与定位零漂移 */
  .today-line,
  .status-line,
  .plan-tick,
  .baseline,
  .bar.milestone .dia {
    outline: 1px solid;
  }
  /* 周末列 / 假日列高亮：底色被强制后整列消失 → 内缩 1px 列描边标出非工作日边界 */
  .grid-canvas .cell {
    outline: 1px solid;
    outline-offset: -1px;
  }
  /* 行名选中态：选中靠「主色底 + inset 阴影」表达，两者同时失效 → 内缩 outline 兜底
     （RTL 选中态选择器特异性更高，需并列声明才能覆盖其 inset 阴影） */
  .row-name.selected,
  :host([data-rtl]) .row-name.selected {
    box-shadow: none;
    outline: 2px solid;
    outline-offset: -2px;
  }
  /* 任务条本体：底色被强制后只剩文字 → 1px 边框找回条体轮廓（border-box，几何不变）；
     里程碑条透明底、靠菱形表达，排除以免长框被误读为普通条 */
  .bar:not(.milestone) {
    border: 1px solid;
  }
  /* 负荷桶条：只凭底色传达信息 → 1px 描边找回轮廓（常态样式不动，颜色由强制色接管） */
  .load-cell {
    outline: 1px solid;
  }
  /* 进度填充：进度只凭填充色 → 条内右缘 2px 描边标出进度前沿（RTL 走逻辑属性自动镜像） */
  .bar-progress {
    border-inline-end: 2px solid;
  }
  /* 行内重命名输入框：基规则压掉 UA outline，强制色下无其他焦点线索 */
  .rename-input:focus {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
    box-shadow: none;
  }
}
`
