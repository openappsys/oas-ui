/** 基础表格样式：结构 / 表头 / 正文 / 对齐 / 空态 / loading / 合计行（切分自 oas-table 内联 STYLE 前段，顺序不变） */
export const BASE_STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  /* 密度档位 medium（默认）：size 属性只改这组内部变量的 fallback，
     宿主可直接用 --oas-table-* 变量覆盖（优先级高于档位） */
  font-size: var(--oas-table-font-size, var(--oas-font-size-md));
  --_cell-py: var(--oas-table-cell-padding-block, var(--oas-space-3));
  --_cell-px: var(--oas-table-cell-padding-inline, var(--oas-space-4));
  overflow: hidden;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
}
/* 尊重 [hidden] 语义：:host display:block 会覆盖 UA 的 [hidden]{display:none}，需显式补 */
:host([hidden]) {
  display: none;
}
/* 紧凑档：padding 降一档、字号 sm */
:host([size='small']) {
  font-size: var(--oas-table-font-size, var(--oas-font-size-sm));
  --_cell-py: var(--oas-table-cell-padding-block, var(--oas-space-2));
  --_cell-px: var(--oas-table-cell-padding-inline, var(--oas-space-3));
}
/* 宽松档：padding 升一档、字号 lg */
:host([size='large']) {
  font-size: var(--oas-table-font-size, var(--oas-font-size-lg));
  --_cell-py: var(--oas-table-cell-padding-block, var(--oas-space-4));
  --_cell-px: var(--oas-table-cell-padding-inline, var(--oas-space-5));
}
.table-scroll {
  overflow: auto;
  /* 动态行高（row-auto-height）下 spacer 高度与内容变化频繁：禁浏览器滚动锚定——
     它会与组件自身的身份锚定补偿（auto-height 模块）双重补偿、视口抖动（virtual-list
     同款事故有注释记载） */
  overflow-anchor: none;
}
table {
  width: 100%;
  /* sticky 定位要求 border-collapse: separate */
  border-collapse: separate;
  border-spacing: 0;
}
th {
  text-align: start;
  padding: var(--_cell-py) var(--_cell-px);
  background: var(--oas-color-bg-hover);
  font-weight: 500;
  border-bottom: 1px solid var(--oas-color-border);
  white-space: nowrap;
  /* 表头吸顶 */
  position: sticky;
  top: 0;
  z-index: 2;
}
th.sortable {
  cursor: pointer;
  user-select: none;
}
th.header-group {
  text-align: center;
  color: var(--oas-color-text-secondary-strong);
  font-weight: 600;
  border-bottom: 1px solid var(--oas-color-border);
}
/* 多级表头不加纵向分隔线：非 bordered 表全表无竖线（单层表头/正文一致），分组层级靠
   「居中大标题跨列 + 子表头行」表达；竖线只属 bordered 全网格模式（见 :host([bordered]) 规则）。
   曾有的 th.header-group + th.header-group 左线是同语言孤例（且只覆盖组/组相邻，组/叶头间断开），已删 */
th.sortable:hover {
  color: var(--oas-color-primary);
}
/* 列拖拽/调宽的通用视觉支持（行为由能力 controller 提供）：可拖拽光标 + 右缘 resize 热区 */
th[draggable='true'] {
  cursor: grab;
}
th[draggable='true']:active {
  cursor: grabbing;
}
/* 列拖拽重排视觉：源列变淡，落点目标列边缘显示插入指示线（插前/插后） */
th.drag-source {
  opacity: 0.45;
}
th.drop-before::before,
th.drop-after::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--oas-color-primary);
  border-radius: 2px;
  z-index: 3;
}
th.drop-before::before {
  left: -2px;
}
th.drop-after::after {
  right: -2px;
}
/* 列宽拖拽手柄（::after）的定位上下文由表头吸顶的 sticky 天然提供（sticky 同为定位上下文），
   此处不得再写 position: relative——曾因它把非固定列表头的纵向吸顶覆盖失效 */
:host([data-col-resizing]) th[data-key]::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
}
.sort-icon {
  display: inline-block;
  margin-inline-start: var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.sort-index {
  display: inline-block;
  margin-inline-start: var(--oas-space-1);
  font-size: var(--oas-font-size-2xs, var(--oas-font-size-xs));
  color: var(--oas-color-primary);
  font-weight: var(--oas-font-weight-medium, 500);
}
th[data-order='asc'] .sort-icon { color: var(--oas-color-primary); }
th[data-order='desc'] .sort-icon { color: var(--oas-color-primary); }
/* 固定列：sticky 横向定位（left/right 由 JS 按列宽累加写入）。
   层级：固定正文格 1 < 表头吸顶格 2 < 固定表头格 3（滚动时表头不被正文盖住） */
td[data-fixed='left'], td[data-fixed='right'] {
  position: sticky;
  z-index: 1;
  background: var(--oas-color-bg);
}
th[data-fixed='left'], th[data-fixed='right'] {
  position: sticky;
  z-index: 3;
  background: var(--oas-color-bg-hover);
}
/* 斑马纹：奇数行浅底（hover/selected 规则在其后声明，自动覆盖） */
tr.row[data-stripe='odd'] td {
  background: var(--oas-color-bg-hover);
}
tr.row[data-stripe='odd'] td[data-fixed='left'],
tr.row[data-stripe='odd'] td[data-fixed='right'] {
  background: var(--oas-color-bg-hover);
}
/* 选中行底色（单点定义，固定列/吸顶行复用）：primary 混入「抬升表面」这一层主题表面，
   颜色随 token 自动适配——light 下 bg-elevated 与 bg 同为白（观感与既有 8% 淡染基本一致），
   dark 下 bg-elevated 比 bg 亮一档，同一混合在暗底上获得可辨对比（原 8% 混 transparent
   叠在暗底上几乎看不见）。不得改为硬编码色值或 :host-context（后者已从规范移除且本库禁用）。 */
tr.row[data-selected='true'],
tr[data-sticky='true'][data-selected='true'] {
  --_row-selected-bg: color-mix(in srgb, var(--oas-color-primary) 10%, var(--oas-color-bg-elevated));
}
tr.row[data-selected='true'] td[data-fixed='left'],
tr.row[data-selected='true'] td[data-fixed='right'] {
  background: var(--_row-selected-bg);
}
td {
  padding: var(--_cell-py) var(--_cell-px);
  border-bottom: 1px solid var(--oas-color-border);
}
td.cell-ellipsis {
  max-width: 0;
}
td.cell-ellipsis > span,
td.cell-ellipsis > a,
td.cell-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* wrap:true 列：显式声明换行（非虚拟下=默认行为的显式化，无害；虚拟下由下方
   data-virtual 作用域内的覆盖规则生效——那里特异性更高，能压过虚拟默认截断） */
td.cell-wrap {
  white-space: normal;
  overflow: hidden;
}
tr:last-child td {
  border-bottom: none;
}
/* 完整边框：单元格右/下描边成网格，四边由 :host 外框兜底 */
:host([bordered]) th,
:host([bordered]) td {
  border-right: 1px solid var(--oas-color-border);
  border-bottom: 1px solid var(--oas-color-border);
}
:host([bordered]) th:last-child,
:host([bordered]) td:last-child {
  border-right: none;
}
/* 行 hover 底色：经 --_row-hover-bg 变量下发（默认回落 bg-hover=开，现状）；
   hover="false" 时置透明——用变量而非改写规则，不触碰「条纹 < hover < 选中」的既有优先级序 */
:host([hover='false']) {
  --_row-hover-bg: transparent;
}
tr.row:hover td {
  background: var(--_row-hover-bg, var(--oas-color-bg-hover));
}
tr.row:hover td[data-fixed='left'],
tr.row:hover td[data-fixed='right'] {
  background: var(--_row-hover-bg, var(--oas-color-bg-hover));
}
tr.row[data-selected='true'] td {
  background: var(--_row-selected-bg);
}
/* 虚拟滚动：占位行与定高行 */
.table-scroll[data-virtual='true'] td {
  padding-top: 0;
  padding-bottom: 0;
}
/* 虚拟默认单行截断：定高行（tr.style.height 内联）几何不容长文本换行撑破（行高漂移会导致
   滚动窗口与占位高度错位）。只作用数据行 tr.row——expand-row 的富内容 td 是 display:block
   自定义 HTML（buildExpandRow 内联定高），不许被 nowrap 污染；spacer 行无文本不受影响 */
.table-scroll[data-virtual='true'] tbody tr.row td {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* wrap:true 列在虚拟下恢复换行（特异性 0,3,3 高于默认规则 0,2,3，靠层叠与特异性，不用 !important）。
   换行内容超过定高时仅 white-space/overflow 截不住——表格布局中 td 盒子高度由内容驱动
   （cell 的 height 是 min 语义、max-height 被忽略、contain:size 在 table-cell 上不生效，
   Chromium 纯 HTML 探针实证），行仍会被撑破。display:block 化（anonymous cell 包裹，列位
   与列宽保持）让 height 回到普通块级语义真正钳高——与 buildExpandRow 虚拟定高同款机制；
   height 值由 buildRow 的 wrap 分支按 row-height 内联写入 */
.table-scroll[data-virtual='true'] tbody tr.row td.cell-wrap {
  white-space: normal;
  display: block;
  box-sizing: border-box;
}
/* 横向虚拟（column-virtual）：窗口外列归并为占位格（colSpan 跨列求和）——
   透明无边框（bordered 全网格模式下也不画线，避免空格子线泄露） */
.col-virtual-placeholder {
  background: transparent;
  border: none;
}
tr.spacer td {
  padding: 0;
  border-bottom: none;
}
.empty {
  padding: var(--oas-space-6);
  text-align: center;
  color: var(--oas-color-text-secondary);
}
.loading {
  padding: var(--oas-space-6);
  text-align: center;
  color: var(--oas-color-text-secondary);
}
/* infinite「已到底」静态提示行：与空态/loading 同视觉层级（次要文字色、居中） */
.no-more {
  padding: var(--oas-space-6);
  text-align: center;
  color: var(--oas-color-text-secondary);
}
.loading .spin {
  display: inline-block;
  width: var(--oas-control-height-sm);
  height: var(--oas-control-height-sm);
  margin-inline-end: var(--oas-space-2);
  vertical-align: middle;
  border: 2px solid var(--oas-color-border);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-table-spin 0.8s linear infinite;
}
@keyframes oas-table-spin {
  to { transform: rotate(360deg); }
}
.check-cell {
  width: 40px;
  text-align: center;
}
.check-cell input {
  accent-color: var(--oas-color-primary);
}
th.align-left { text-align: start; }
th.align-center, td.align-center { text-align: center; }
th.align-right, td.align-right { text-align: end; }
/* 浏览器默认：还原 UA 的 th 居中，不跟随列也不强制 start */
th.align-default { text-align: revert; }
/* 展开/收起按钮（树形 + 可展开行共用） */
.toggle {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  padding: 0;
  line-height: 1;
  vertical-align: middle;
}
.toggle.open {
  transform: rotate(90deg);
}
td.expand-toggle-cell,
th.expand-toggle-cell {
  width: 40px;
  text-align: center;
}
/* 可展开行的内容行 */
tr.expand-row td {
  background: var(--oas-color-bg);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
/* 虚拟滚动定高模型：展开内容行同样被定高（row-height），超高内容截断防溢出重叠；
   展开富内容请用非虚拟模式（与 merge 同级的虚拟模式限制） */
.table-scroll[data-virtual='true'] tr.expand-row td {
  overflow: hidden;
}
/* 合计行（表尾） */
tr.summary td {
  background: var(--oas-color-bg-hover);
  font-weight: 600;
  border-top: 1px solid var(--oas-color-border);
}
tr.summary td[data-fixed='left'],
tr.summary td[data-fixed='right'] {
  background: var(--oas-color-bg-hover);
}
/* 吸顶行：position: sticky 纵向吸顶（top 由 JS 按表头/行高写入）。
   与固定列（横向 sticky）共存，层级：正文固定 1 < 吸顶行 2 < 表头 3 < 吸顶行固定 4 */
tr[data-sticky='true'] td {
  position: sticky;
  z-index: 2;
  background: var(--oas-color-bg);
}
tr[data-sticky='true'][data-stripe='odd'] td {
  background: var(--oas-color-bg-hover);
}
tr[data-sticky='true'][data-selected='true'] td {
  background: var(--_row-selected-bg);
}
tr[data-sticky='true'] td[data-fixed] {
  z-index: 4;
  background: var(--oas-color-bg);
}
tr[data-sticky='true'][data-stripe='odd'] td[data-fixed] {
  background: var(--oas-color-bg-hover);
}
tr[data-sticky='true'][data-selected='true'] td[data-fixed] {
  background: var(--_row-selected-bg);
}
tr[data-sticky='true']:hover td {
  background: var(--_row-hover-bg, var(--oas-color-bg-hover));
}
`
