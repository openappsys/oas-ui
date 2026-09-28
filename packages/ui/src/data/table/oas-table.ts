import { OASElement } from '@oas-ui/core'
import { downloadPath } from '@oas-ui/icons'
import { resolveDirection } from '../../shared/direction.js'
import { normalizeSizeStrict, THREE_SIZES } from '../../shared/size.js'
import { computeVirtualWindow } from '../virtual-list/oas-virtual-list.js'
import { HeightCache, computeDynamicWindow } from '../virtual-list/dynamic-height.js'
import { computePosition, getViewport } from '../../overlay/floating/index.js'
import { registeredTableCapabilities, onTableCapabilityRegistered } from './oas-table-capability.js'
// 行内交互宿主排除清单（行点击/双击编辑共用的单一事实来源，含维护纪律注释）
import { ROW_INTERACTIVE_EXCLUSION } from './oas-table-interactive.js'
// D8 导出：CSV / Excel 纯序列化 + 下载通道（与渲染解耦，见 oas-table-export.ts）
import {
  downloadText,
  parseExportFormats,
  sanitizeFileName,
  toCSV,
  toExcelXml,
  EXPORT_EXT,
  type ExportFormat,
} from './oas-table-export.js'

export interface TableColumn {
  key: string
  title: string
  /** 列默认隐藏（配合表格级 column-keys 设置复原；渲染时不显示该列） */
  hidden?: boolean
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  /** 固定列：'left' | 'right'（配合 sticky 定位实现横向滚动时固定） */
  fixed?: 'left' | 'right'
  /** 单元格渲染钩子：返回字符串（按 `data-*` 值或富内容标记渲染）或一个 Node/HTMLElement（tag/avatar/badge 等） */
  render?: (row: Record<string, unknown>) => string | Node
  /** 单元格模板（声明式，替代 render 的函数：子元素 `<template>` 或 columns property 传入）。
      克隆模板并用 `{{row.字段}}` 插值水合成每格内容；函数型 render 优先于模板 */
  cellTemplate?: HTMLTemplateElement
  /** 自定义列头模板（声明式）：克隆模板内容作为 th 内容（静态，不随行插值）；子元素用
      `<template data-role="header">` 表达，替代纯文本 title */
  headerTemplate?: HTMLTemplateElement
  /** 行内编辑校验：提交前校验，返回非空字符串=错误文案 / false=校验失败（用默认文案），
      true / '' / undefined=通过。校验失败保持编辑态不提交 */
  validate?: (value: string, row: Record<string, unknown>) => string | boolean | undefined
  /** 合计：'sum' | 'avg' | 'count'（列级简单配置；复杂配置走表格级 summary 属性） */
  summary?: 'sum' | 'avg' | 'count'
  /** 行内编辑：该列可编辑（配合表格级 `editable` 属性开关） */
  editable?: boolean
  /** 编辑器类型：input（默认）/ select（配 editOptions） */
  editor?: 'input' | 'select'
  /**
   * 组件编辑器：库内/宿主任意 value 语义的 Web Components tag 名（如 `oas-input` / `oas-date-picker`）。
   * 设置后优先于 `editor`（原生 input/select 通道）。第一期约定：组件须满足「value 属性读写 + change 事件提交 +
   * Esc 取消」的最小契约，且为非浮层组件（浮层类 date-picker/select 等的 blur 判定后续批次支持）
   */
  editComponent?: string
  /** select 编辑器的选项 */
  editOptions?: EditOption[]
  /** 操作列：渲染 编辑/保存/取消 按钮（依赖表格级 `editable` 属性） */
  actions?: boolean
  /** 序号列：该列单元格渲染行序号（从 1 递增），不取数据字段值 */
  serialNumber?: boolean
  /** 省略号：单元格内容超出列宽时单行截断并以省略号显示（配合 title 悬停查看全文） */
  ellipsis?: boolean
  /** 多级表头：子列（有 children 的列是组表头，不渲染数据单元格，按子列 colspan 合并；数据/排序/显隐/拖拽作用于叶子列） */
  children?: TableColumn[]
  /** 可过滤：表头显示过滤触发器（配合表格级 filter-values 过滤行） */
  filterable?: boolean
  /** 过滤选项列表（缺省时由数据列唯一值推导） */
  filters?: Array<{ label: string; value: string | number }>
  /** 自定义过滤匹配器：返回该行是否命中过滤值；缺省按字符串严格相等 */
  filterMatch?: (cell: unknown, filterValue: string | number) => boolean
  /** 合并单元格：连续相同显示值的行在该列合并为一个 rowspan 单元格（非虚拟模式生效，虚拟滚动时忽略；
      与表格级 spanMethod property 按列独立并存——被显式 span 覆盖而缺格的行会断开本列的连续分组） */
  merge?: boolean
}

/** 行内编辑 select 选项 */
export interface EditOption {
  label: string
  value: string | number
}

/** oas-edit / oas-edit-cancel 事件 detail 契约 */
export interface TableEditDetail {
  rowIndex: number
  key: string
  column: string
  value: string
}

/**
 * 行内编辑能力（edit 能力包 controller）在宿主渲染/更新管线上的挂接点。
 *
 * 核心（OASTableBase）不实现任何编辑逻辑，仅保留渲染挂接：能力包经能力注册表
 * （oas-table-capability.js）注入后，buildRow 的 editable/actions 分支委托给
 * 本接口方法；未注入能力时编辑相关 UI 静默缺失并在 dev 下告警一次。
 */
export interface TableEditCapability {
  /** 可编辑列单元格装饰：焦点可达 + 铅笔图标 + 进入编辑交互（Enter/F2/双击）；
      仅当表格级 editable 与列级 editable 都开启时生效 */
  decorateCell(td: HTMLTableCellElement, col: TableColumn): void
  /** 操作列（col.actions）单元格渲染：编辑/保存/取消按钮 */
  renderActionCell(td: HTMLTableCellElement, tr: HTMLTableRowElement): void
  /** 外部重渲染（data/排序/滚动等整体重建）前静默取消进行中的编辑 */
  settleEdit(): void
}

export type SortOrder = '' | 'asc' | 'desc'

/** 参与排序的单个列状态（多列排序时按数组顺序决定优先级） */
export interface SortState {
  key: string
  order: Exclude<SortOrder, ''> | undefined
}

/** 密度档位：与控件 size 体系同词（small/medium/large），默认 medium */
export type TableSize = 'small' | 'medium' | 'large'

/** 行 class 钩子（rowClass property）：(row, index) => string，多值空格分隔。
    class 挂到数据行 tr 并暴露为 ::part token（tr 与该行各单元格同步），宿主页面 CSS 可穿透
    Shadow DOM 定制行级样式（行禁用灰化 / 超标警色等状态行场景）。仅 property 函数通道 */
export type TableRowClass = (row: Record<string, unknown>, index: number) => string

/**
 * 行展开谓词（rowExpandable property）：(row, index) => boolean，返回 false 的行不渲染
 * 行尾展开钮（行体/选中流不受影响）。仅 property 函数通道（函数不可序列化，
 * 不进 observedAttributes / SSR 快照）
 */
export type TableRowExpandable = (row: Record<string, unknown>, index: number) => boolean

/**
 * 受控合并函数（spanMethod property）：逐格返回 [rowspan, colspan] 或 {rowspan, colspan}。
 * - rowIndex 按当前渲染数据行序（0 起，不含 expand 内容行），columnIndex 按有效列顺序；
 * - rowspan/colspan 任一为 0：本格视为「被覆盖」不渲染（由函数声明覆盖关系）；
 * - 缺省 / 非对象返回值：本格常规渲染（等价 [1,1]）；
 * - 与列级 merge 自动合并并存（按列独立生效：被显式 span 覆盖而缺格的行会断开该列 merge
 *   的连续分组，天然不冲突）；虚拟滚动模式下忽略（与 merge 同级的定高限制）。
 * 仅 property 函数通道
 */
export type TableSpanMethod = (
  row: Record<string, unknown>,
  column: TableColumn,
  rowIndex: number,
  columnIndex: number,
) => [number, number] | { rowspan: number; colspan: number } | void

/** 非法 size 告警：回落 medium 并在 dev 下 console.warn 一次（同值去重，同控件惯例）；
    sm/md/lg 别名由 shared/size 静默映射，不告警 */
const warnedSizes = new Set<string>()
function warnInvalidSize(raw: string): void {
  if (warnedSizes.has(raw)) return
  warnedSizes.add(raw)
  console.warn(`[oas-table] 非法 size "${raw}"，已回落 medium；合法值：small/medium/large`)
}

/** 编辑能力未注入的告警文案（仅纯核入口 data/table/core 消费者会触发；主路径已默认内含能力） */
const EDIT_CAPABILITY_HINT =
  '[oas-table] 行内编辑能力未注入：检测到 editable/editor/actions 配置但能力缺失，相关配置已静默失效。主路径 @oas-ui/ui/data/table 已默认内含该能力；仅纯核路径 data/table/core 需要显式 import "@oas-ui/ui/data/table/edit"（import 即注册）或改从主路径引入。'

/** 行拖拽 + 虚拟滚动不兼容的告警文案（虚拟模式仅渲染窗口行，拖拽重排的 from/to 语义不可靠） */
const ROW_DRAG_VIRTUAL_HINT =
  '[oas-table] row-draggable 与虚拟滚动（height）不兼容：虚拟模式仅渲染可见窗口行，拖拽重排索引无稳定语义，已忽略 row-draggable（拖拽手柄列不渲染）。请去掉 height（或改用分页/max-height）后重试。'

/** 拖拽/虚拟告警去重（同控件「同值告警整页一次」惯例） */
const warnedRowDragVirtual = new Set<string>()

function warnRowDragVirtual(): void {
  if (warnedRowDragVirtual.has(ROW_DRAG_VIRTUAL_HINT)) return
  warnedRowDragVirtual.add(ROW_DRAG_VIRTUAL_HINT)
  console.warn(ROW_DRAG_VIRTUAL_HINT)
}

/** 编辑能力告警去重（同值去重，同控件惯例） */
const warnedEditCapability = new Set<string>()

/** dev 告警：editable/actions 配置但编辑能力未注入（页面级仅告警一次） */
function warnEditNotImported(): void {
  if (warnedEditCapability.has(EDIT_CAPABILITY_HINT)) return
  warnedEditCapability.add(EDIT_CAPABILITY_HINT)
  console.warn(EDIT_CAPABILITY_HINT)
}

/** 合计类型：求和 / 平均 / 计数 */
export type SummaryType = 'sum' | 'avg' | 'count'

export interface SummaryConfig {
  key: string
  type: SummaryType
  /** 合计行首列展示的标签（不配置时用默认文案） */
  label?: string
}

interface ColumnOffset {
  fixed: 'left' | 'right'
  left?: number
  right?: number
}

const STYLE = `
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
  color: var(--oas-color-text-secondary);
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
tr.row[data-selected='true'] td[data-fixed='left'],
tr.row[data-selected='true'] td[data-fixed='right'] {
  background: var(--oas-color-primary-soft, color-mix(in srgb, var(--oas-color-primary) 8%, transparent));
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
  background: var(--oas-color-primary-soft, color-mix(in srgb, var(--oas-color-primary) 8%, transparent));
}
/* 虚拟滚动：占位行与定高行 */
.table-scroll[data-virtual='true'] td {
  padding-top: 0;
  padding-bottom: 0;
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
.check {
  accent-color: var(--oas-color-primary);
}
.check-cell {
  width: 40px;
  text-align: center;
}
.check-cell input {
  accent-color: var(--oas-color-primary);
}
td.align-center { text-align: center; }
td.align-right { text-align: right; }
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
  background: var(--oas-color-primary-soft, color-mix(in srgb, var(--oas-color-primary) 8%, transparent));
}
tr[data-sticky='true'] td[data-fixed] {
  z-index: 4;
  background: var(--oas-color-bg);
}
tr[data-sticky='true'][data-stripe='odd'] td[data-fixed] {
  background: var(--oas-color-bg-hover);
}
tr[data-sticky='true'][data-selected='true'] td[data-fixed] {
  background: var(--oas-color-primary-soft, color-mix(in srgb, var(--oas-color-primary) 8%, transparent));
}
tr[data-sticky='true']:hover td {
  background: var(--_row-hover-bg, var(--oas-color-bg-hover));
}
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
td[data-editing='true'],
tr[data-sticky='true'] td[data-editing='true'] {
  background: var(--oas-color-primary-soft, color-mix(in srgb, var(--oas-color-primary) 8%, transparent));
}
td[data-invalid='true'] {
  background: var(--oas-color-danger-soft, color-mix(in srgb, var(--oas-color-danger) 8%, transparent));
}
td[data-invalid='true'] .cell-editor {
  border-color: var(--oas-color-danger);
}
.edit-error {
  display: block;
  padding: 2px 6px;
  font-size: var(--oas-font-size-xs, 12px);
  color: var(--oas-color-danger);
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
  margin-inline-start: 4px;
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
`

const CHECK_CELL_WIDTH = 40
const EXPAND_CELL_WIDTH = 40
/** 行拖拽手柄列宽度（px；固定列 sticky 偏移的占位，与手写 CSS 宽度同步） */
const DRAG_CELL_WIDTH = 40
/** 展开切换列宽（column-virtual 的 colgroup 定宽用；非 col-virtual 模式该列 auto） */
const EXPAND_TOGGLE_WIDTH = 48
const FILTER_ICON =
  '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h12M4.5 6.5h7M6.5 10h3"/></svg>'

/** 导出按钮图标（内置 download 通路，保持组件 chrome 图标单一来源） */
const EXPORT_ICON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${downloadPath}</svg>`

/** 行拖拽手柄图标（原创内联 SVG：2×3 圆点抓握纹，组件专属语义美术） */
const DRAG_HANDLE_ICON =
  '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><g fill="currentColor"><circle cx="6" cy="4" r="1.2"/><circle cx="10" cy="4" r="1.2"/><circle cx="6" cy="8" r="1.2"/><circle cx="10" cy="8" r="1.2"/><circle cx="6" cy="12" r="1.2"/><circle cx="10" cy="12" r="1.2"/></g></svg>'

/**
 * 新文案 key 的临时兜底（本批不改 i18n 包）：`t()` 未注册该 key 时回落英文。
 * i18n 注册对应 key（table.exportCsv / table.exportExcel / table.rowDragHandle）后自动走翻译，
 * 兜底分支即失效——不引入第二套文案体系。
 */
function tableText(
  host: { translateText(key: string, params?: Record<string, string | number>): string },
  key: string,
  fallback: string,
): string {
  const v = host.translateText(key)
  return !v || v === key ? fallback : v
}

export class OASTableBase extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'columns',
      'data',
      'sort-key',
      'sort-order',
      'multi-sort',
      'row-key',
      'checkable',
      'selected',
      'empty-text',
      'loading',
      'height',
      'row-height',
      'stripe',
      'bordered',
      'expanded',
      'summary',
      'editable',
      'edit-controlled',
      'sticky-rows',
      'size',
      'column-keys',
      'pagination',
      'page-size',
      'current',
      'filter-values',
      'summary-scope',
      'show-header',
      'table-layout',
      'hover',
      'indent-size',
      'max-height',
      'exportable',
      'export-format',
      'export-file-name',
      'grid-navigation',
      'row-draggable',
      // 横向虚拟滚动（列窗口）：建议全列显式 width；多级表头 / span-method / 非两端固定列布局不兼容（告警降级）
      'column-virtual',
    ]
  }

  private _columns: TableColumn[] = []
  /** 列定义经 property 赋值且含函数（render/editors）时置真——跳过 attribute 重解析（序列化会丢函数） */
  private _columnsFromProperty = false
  /** column-keys：受控显示列集合（按此顺序渲染；空=全部列）。显隐与顺序由宿主控制（列设置面板/持久化宿主负责） */
  private _columnKeys: string[] = []
  /** 子元素声明式通道观察器（light DOM 的 <oas-table-column> 增删/属性变化 → 重解析列） */
  private childColumnsObserver: MutationObserver | null = null
  private _data: Array<Record<string, unknown>> = []
  private scrollRaf = 0
  /** 恢复 scrollTop 触发的下一次 scroll 事件需忽略，防止重入死循环 */
  private ignoreNextScroll = false
  private wrap: HTMLElement | null = null
  /** column-virtual：非固定列（middle 段）的列宽前缀缓存（复用 virtual-list 的 HeightCache，横向换轴复用） */
  private colWidthCache: HeightCache | null = null
  /** column-virtual：当前列窗口（middle 段内的 [start, end)） */
  private colWin: { start: number; end: number } = { start: 0, end: 0 }
  /** column-virtual：叶子列三段分组缓存（update 时刷新；null = 未启用/已降级） */
  private _colSegments: {
    left: TableColumn[]
    middle: TableColumn[]
    right: TableColumn[]
  } | null = null
  /** column-virtual：列窗口变化的告警去重（多级表头 / spanMethod / 固定列布局不符） */
  private colVirtualWarned = new Set<string>()
  /** 是否可展开行（任一数据行存在非空 expand 字段） */
  private _expandable = false
  /** 行内编辑能力 controller（经能力注册表注入；无则编辑相关渲染挂接跳过 + dev 告警） */
  private editCap: TableEditCapability | null = null
  /** 已注入能力名（attachCapabilities 幂等去重） */
  private attachedCaps = new Set<string>()
  /** 能力晚加入订阅的退订函数（connected 期订阅、disconnected 退订防泄漏） */
  private unsubCaps: (() => void) | undefined = undefined
  /** 合计缓存：scope=all 时全量 flat 的缓存（data/筛选/排序未变时复用，避免选中/翻页等非数据变化的重渲染重复全量 walk+sort） */
  private summaryFlatCache: { key: string; flat: FlatRow[] } | null = null
  /** 列过滤弹层：当前打开的面板元素与其列 key（同一时刻至多一个） */
  private filterPanel: HTMLElement | null = null
  private filterPanelKey: string | null = null
  /** 行 class 钩子（property 函数通道；不进 observedAttributes——函数不可序列化，SSR 快照安全，文档注明） */
  private _rowClass: TableRowClass | null = null
  /** 行展开谓词（property 函数通道；不进 observedAttributes，同 rowClass 理由） */
  private _rowExpandable: TableRowExpandable | null = null
  /** 受控合并函数（property 函数通道；虚拟滚动下忽略） */
  private _spanMethod: TableSpanMethod | null = null
  /** span-method 本轮渲染的占用表：「数据行序:列序」→ 被更早的显式 span 覆盖（本格不渲染 td） */
  private _spanCovered = new Set<string>()
  /** 导出数据行（当前可见数据集：过滤 + 排序 + 分页切片后的数据行对象，按展示顺序）。
      虚拟滚动取完整展示集合（窗口只是视口，不是数据集边界） */
  private _exportRows: Array<Record<string, unknown>> = []
  /** 网格导航：最近聚焦的单元格坐标（Tab 进容器后方向键从该处继续；无则从首格进入） */
  private gridPos: { row: number; col: number } | null = null
  /** 行拖拽：拖拽源行 key（不依赖 dataTransfer——部分环境 DragEvent 不带 dataTransfer） */
  private dragRowKey = ''
  /** 行拖拽：最近一次 dragover 计算的落点（目标行 key + 插前/插后） */
  private dragDrop: { key: string; pos: 'before' | 'after' } | null = null

  /**
   * 能力注入：构造时快照已注册能力 + connected 期订阅晚加入（注册可能晚于元素构造——
   * 入口求值顺序、打包器重排、按需「先组件后能力」、动态 import 等场景）。
   * 未 import 的能力不注入（其渲染挂接点由 editCap 判空跳过）。
   */
  constructor() {
    super()
    this.attachCapabilities()
  }

  override connectedCallback(): void {
    // 订阅晚加入 + catch-up 需在 super 首渲染前完成：表格行内的编辑装饰（editable-cell）
    // 在 update 重建行时应用——宿主在能力注册后才连接时，先 attach 再渲染即首帧就带装饰；
    // 已连接后再注册则走订阅通知即时 attach（之后任一次重建行即补齐）
    this.unsubCaps = onTableCapabilityRegistered(() => this.attachCapabilities())
    this.attachCapabilities()
    super.connectedCallback()
  }

  override disconnectedCallback(): void {
    this.unsubCaps?.()
    this.unsubCaps = undefined
    super.disconnectedCallback()
  }

  /** 幂等注入：按 name 去重，已注入的能力不重复 addController */
  private attachCapabilities(): void {
    for (const { name, factory } of registeredTableCapabilities()) {
      if (this.attachedCaps.has(name)) continue
      this.attachedCaps.add(name)
      const controller = factory(this)
      this.addController(controller)
      if (name === 'edit') this.editCap = controller as unknown as TableEditCapability
    }
  }

  /**
   * data/columns 同时支持 attribute 与 property 赋值：
   * Vue/React 模板渲染时 `data`/`columns` 命中实例属性（class 字段），宿主框架会走 property
   * 赋值而非 setAttribute（此前 SPA 导航下表格无数据的根因）。setter 统一反射到 attribute，
   * 经 attributeChangedCallback 走既有 parse/update 链路，保持单一数据源。
   */
  get columns(): TableColumn[] {
    return this._columns
  }
  set columns(value: TableColumn[] | string) {
    if (typeof value === 'string') {
      this._columnsFromProperty = false
      this.setAttribute('columns', value)
      return
    }
    if (
      Array.isArray(value) &&
      value.some(
        (c) =>
          c &&
          (typeof c.render === 'function' ||
            typeof c.editor === 'function' ||
            typeof c.filterMatch === 'function' ||
            typeof c.validate === 'function' ||
            c.cellTemplate ||
            c.headerTemplate),
      )
    ) {
      // 列定义含函数/模板节点（render/filterMatch/validate/cellTemplate/headerTemplate）：JSON 序列化会丢 → 直接存内存并标记，跳过 attribute 重解析
      this._columns = value.filter((c) => c && typeof c.key === 'string')
      this._columnsFromProperty = true
      this.runUpdateAndNotify()
      return
    }
    this._columnsFromProperty = false
    this.setAttribute('columns', typeof value === 'string' ? value : JSON.stringify(value))
  }
  /** column-keys：受控显示列集合（按此顺序渲染；空 = 全部列）。property / attribute 双通道 */
  get columnKeys(): string[] {
    return this._columnKeys
  }
  set columnKeys(value: string[] | string) {
    if (typeof value === 'string') {
      this.setAttribute('column-keys', value)
      return
    }
    this._columnKeys = Array.isArray(value) ? value.filter((k) => typeof k === 'string') : []
    this.runUpdateAndNotify()
  }
  get data(): Array<Record<string, unknown>> {
    return this._data
  }
  set data(value: Array<Record<string, unknown>> | string) {
    this.setAttribute('data', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 行 class 钩子（property 函数通道）：(row, index) => string，多值空格分隔。
      函数不可序列化：不进 observedAttributes / SSR 快照（文档注明）；非函数赋值静默忽略 */
  get rowClass(): TableRowClass | null {
    return this._rowClass
  }
  set rowClass(fn: TableRowClass | null) {
    this._rowClass = typeof fn === 'function' ? fn : null
    this.runUpdateAndNotify()
  }

  /** 行展开谓词（property 函数通道）：(row, index) => boolean，false 的行不渲染行尾展开钮 */
  get rowExpandable(): TableRowExpandable | null {
    return this._rowExpandable
  }
  set rowExpandable(fn: TableRowExpandable | null) {
    this._rowExpandable = typeof fn === 'function' ? fn : null
    this.runUpdateAndNotify()
  }

  /** 受控合并函数（property 函数通道）：(row, column, rowIndex, columnIndex) =>
      [rowspan, colspan] | {rowspan, colspan} | void；语义见 TableSpanMethod 注释 */
  get spanMethod(): TableSpanMethod | null {
    return this._spanMethod
  }
  set spanMethod(fn: TableSpanMethod | null) {
    this._spanMethod = typeof fn === 'function' ? fn : null
    this.runUpdateAndNotify()
  }

  /** 行选择模式：单选档 = checkable="radio"（裸 checkable 为多选，向后兼容） */
  private selectionSingle(): boolean {
    return this.getAttr('checkable', '') === 'radio'
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="table-toolbar" part="toolbar"></div>
      <div class="table-scroll" part="scroll" tabindex="0">
        <table part="table">
          <thead part="head"></thead>
          <tbody part="body"></tbody>
        </table>
      </div>
      <div class="pagination" part="pagination"></div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  /** 表头单元格填充：标题 + 可排队列排序箭头/序号 + 可过滤列过滤触发器（扁平与多行叶子共用） */
  private fillHeaderCell(th: HTMLElement, col: TableColumn): void {
    if (col.headerTemplate) {
      // 自定义列头：克隆模板内容作为 th 基础内容（静态，不随行插值）
      th.appendChild(col.headerTemplate.content.cloneNode(true) as DocumentFragment)
    } else {
      th.textContent = col.title
    }
    if (col.sortable) {
      th.classList.add('sortable')
      const sorts = this.resolveSorts()
      const idx = sorts.findIndex((s) => s.key === col.key)
      const state = idx >= 0 ? sorts[idx] : undefined
      th.setAttribute('data-order', state?.order ?? '')
      if (state && sorts.length > 1) th.setAttribute('data-sort-index', String(idx + 1))
      else th.removeAttribute('data-sort-index')
      const arrow = state?.order === 'asc' ? '↑' : state?.order === 'desc' ? '↓' : '↕'
      const badge = state && sorts.length > 1 ? `<span class="sort-index">${idx + 1}</span>` : ''
      const icon = document.createElement('span')
      icon.className = 'sort-icon'
      icon.innerHTML = `${arrow}`
      if (badge) {
        const b = document.createElement('span')
        b.className = 'sort-index'
        b.textContent = String(idx + 1)
        th.appendChild(b)
      }
      th.appendChild(icon)
    }
    if (col.filterable) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'filter-btn'
      btn.setAttribute('aria-label', this.t('table.filter'))
      this.fillFilterIcon(btn)
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.openFilterPanel(col, btn)
      })
      th.appendChild(btn)
    }
  }

  /** 过滤触发按钮图标：template[slot="filter-icon"] / 元素 [slot="filter-icon"] 克隆优先，
   *  缺省回落内置过滤 SVG（与 empty 插槽同思路的 light DOM 取用） */
  private fillFilterIcon(btn: HTMLButtonElement): void {
    const tpl = this.querySelector('template[slot="filter-icon"]')
    if (tpl instanceof HTMLTemplateElement) {
      btn.appendChild(tpl.content.cloneNode(true))
      return
    }
    const custom = this.querySelector('[slot="filter-icon"]')
    if (custom) {
      btn.appendChild(custom.cloneNode(true))
      return
    }
    btn.innerHTML = FILTER_ICON
  }

  /** 全选表头单元格（checkable 多选档）；rowSpan>1 用于多级表头首行盖到底部。
      单选档（single=true）无全选语义：渲染空白列头维持与数据行选择列的对齐 */
  private buildCheckAllTh(
    layout: { offsets: Map<string, ColumnOffset>; hasFixed: boolean },
    flat: FlatRow[],
    rowKey: string,
    selected: string[],
    rowSpan: number,
    single = false,
  ): HTMLElement {
    const th = document.createElement('th')
    th.className = 'check-cell'
    th.style.width = '40px'
    th.rowSpan = rowSpan
    if (layout.hasFixed) {
      th.setAttribute('data-fixed', 'left')
      th.style.left = `${this.rowDragEnabled() ? DRAG_CELL_WIDTH : 0}px`
    }
    if (single) return th
    const selectAll = document.createElement('input')
    selectAll.type = 'checkbox'
    selectAll.setAttribute('aria-label', this.t('table.selectAll'))
    selectAll.checked =
      flat.length > 0 && flat.every((f) => selected.includes(String(f.row[rowKey] ?? JSON.stringify(f.row))))
    selectAll.addEventListener('change', () => {
      const keys = flat.map((f) => String(f.row[rowKey] ?? JSON.stringify(f.row)))
      this.setAttribute('selected', selectAll.checked ? keys.join(',') : '')
      this.emit('check', { keys: selectAll.checked ? keys : [] })
      this.runUpdateAndNotify()
    })
    th.appendChild(selectAll)
    return th
  }

  private bind(): void {
    this.wrap = this.shadow.querySelector('.table-scroll')
    this.ensureChildColumnsObserver()
    this.shadow.querySelector('thead')?.addEventListener('click', (e) => {
      const th = (e.target as HTMLElement).closest('th.sortable')
      if (th) this.sortBy((th as HTMLElement).getAttribute('data-key') ?? '', (e as MouseEvent).shiftKey)
    })
    this.wrap?.addEventListener('scroll', this.handleScroll, { passive: true })
    // D9 网格导航：keydown 委托到滚动容器（方向键漫游 / Home-End / PageUp-Down / 空格·回车激活）
    this.wrap?.addEventListener('keydown', this.handleGridKeydown)
    // D15 行拖拽：drag 事件委托到 tbody（重渲染只换 tr，tbody 容器稳定）
    const tbody = this.shadow.querySelector('tbody')
    tbody?.addEventListener('dragstart', this.handleRowDragStart)
    tbody?.addEventListener('dragover', this.handleRowDragOver)
    tbody?.addEventListener('dragleave', this.handleRowDragLeave)
    tbody?.addEventListener('drop', this.handleRowDrop)
    tbody?.addEventListener('dragend', this.handleRowDragEnd)
    this.onCleanup(() => {
      this.wrap?.removeEventListener('scroll', this.handleScroll)
      this.wrap?.removeEventListener('keydown', this.handleGridKeydown)
      tbody?.removeEventListener('dragstart', this.handleRowDragStart)
      tbody?.removeEventListener('dragover', this.handleRowDragOver)
      tbody?.removeEventListener('dragleave', this.handleRowDragLeave)
      tbody?.removeEventListener('drop', this.handleRowDrop)
      tbody?.removeEventListener('dragend', this.handleRowDragEnd)
      if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf)
      this.scrollRaf = 0
      this.closeFilterPanel()
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.runUpdateAndNotify()
  }

  /** 真水合：校验 SSR 快照结构（关键节点存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.table-scroll')) return false
    if (!this.shadow.querySelector('thead') || !this.shadow.querySelector('tbody')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // 外部重渲染（data/sort/selected 等变化）时先静默取消进行中的编辑（委托 edit 能力），
    // 防止编辑 DOM 被整体重建静默销毁
    this.editCap?.settleEdit()
    this.parse()
    // 密度档位归一化：仅触发非法值告警副作用；档位视觉纯 CSS（:host([size]) 选择器），
    // 非法值不匹配任何档位选择器 → 自然回落 medium 默认
    const sizeRaw = this.getAttr('size', 'medium')
    if (!normalizeSizeStrict(sizeRaw, THREE_SIZES, 'medium').isValid) warnInvalidSize(sizeRaw)
    // 编辑能力未 import 但检测到 editable/actions 配置 → dev 告警（同值去重）
    this.warnEditCapability()
    const head = this.shadow.querySelector('thead')
    const body = this.shadow.querySelector('tbody')
    if (!head || !body) return
    // D8 导出工具栏（与行数据无关，loading/empty 也要在场）
    this.renderToolbar()
    // D15 行拖拽与虚拟滚动不兼容：虚拟模式仅渲染窗口行，静默降级并 dev 告警一次
    if (this.hasAttr('row-draggable') && this.isVirtual()) warnRowDragVirtual()

    const rowKey = this.getAttr('row-key', 'key')
    const selected = this.getAttr('selected', '').split(',').filter(Boolean)
    const expanded = new Set(this.getAttr('expanded', '').split(',').filter(Boolean))

    // 过滤：按 filter-values 过滤顶层行（在排序/分页之前，保证分页页数反映过滤后数据）
    const filterValues = this.parseFilterValues()
    let roots = this._data
    if (Object.keys(filterValues).length > 0) {
      roots = roots.filter((row) => this.matchesFilters(row, filterValues))
    }
    // 分页切片前的完整筛选+排序集合（summary-scope=all 时合计基于此）
    const fullRoots = roots

    // 分页：顶层行先全局排序再切片为当前页，喂给 buildFlat（页内子行 children 随父行保留）
    const paginationOn = this.hasAttr('pagination')
    const pageSize = Math.max(1, Number(this.getAttr('page-size', '10')) || 10)
    let current = Math.max(1, Number(this.getAttr('current', '1')) || 1)
    const total = roots.length
    if (paginationOn) {
      const pageCount = Math.max(1, Math.ceil(total / pageSize))
      if (current > pageCount) {
        current = pageCount
        this.setAttribute('current', String(current))
      }
      const sorted = [...roots]
      const sorts = this.resolveSorts()
      if (sorts.length > 0) sorted.sort((a, b) => this.compareRows(a, b, sorts))
      const start = (current - 1) * pageSize
      roots = sorted.slice(start, start + pageSize)
    }

    const sorts = this.resolveSorts()
    const flat = this.buildFlat(sorts, rowKey, roots)
    const display = this.visibleFlat(flat, expanded, rowKey)
    // D8：导出数据集 = 当前展示的数据行（过滤 + 排序 + 分页切片后；虚拟模式取完整展示集合）
    this._exportRows = display.filter((f) => f.kind === 'data').map((f) => f.row)
    const summaryConfigs = this.buildSummaryConfigs()
    // 合计范围：all（默认）= 分页切片前的完整筛选结果总计；page = 当前页小计（原行为）。
    // 非法值回落默认 all（与表意一致）。
    const summaryScopePage = this.getAttr('summary-scope', 'all') === 'page'
    // scope=all 的全量 flat 缓存：data/筛选/排序未变时复用，避免选中/翻页/hover 等非数据变化的渲染
    // 重复对全量集合做 walk+sort（虚拟滚动大数据量下这是可见开销）。
    let summaryFlat: FlatRow[]
    if (summaryScopePage) {
      summaryFlat = flat
    } else {
      // scope=all 合计是顺序无关聚合（sum/avg/count 不依赖排序），cacheKey 不含 sorts（排序变化不该失效重算）
      const cacheKey = `${this.getAttr('data', '')}||${JSON.stringify(filterValues)}`
      if (this.summaryFlatCache && this.summaryFlatCache.key === cacheKey) {
        summaryFlat = this.summaryFlatCache.flat
      } else {
        // scope=all 合计是顺序无关的聚合（sum/avg/count 不依赖排序），传空 sorts 跳过排序——只走 O(n) 扁平化
        summaryFlat = this.buildFlat([], rowKey, fullRoots)
        this.summaryFlatCache = { key: cacheKey, flat: summaryFlat }
      }
    }

    const layout = this.computeLayout()
    const virtual = this.isVirtual()
    // 横向虚拟（column-virtual）：列窗口同步 + 不兼容形态降级判定。
    // 窗口在本轮渲染前刷新到最新（scroll 事件驱动 syncColumnWindow 后经此消费）。
    // 暂不兼容：合计行（summary 的跨列合计格与列窗口错位）——降级为普通渲染。
    let colVirtual = false
    if (this.columnVirtualOn() && summaryConfigs.length === 0) {
      const segs = this.splitColSegments(this.effectiveColumns())
      if (segs) {
        colVirtual = true
        this._colSegments = segs
        this.syncColumnWindow(segs)
      } else {
        this._colSegments = null
        this.warnColVirtualOnce(
          'fixed-layout',
          'column-virtual 要求固定列仅出现在两端（left 段 → 非固定段 → right 段）：当前列序穿插，已降级为普通渲染',
        )
      }
    } else {
      this._colSegments = null
      if (this.columnVirtualOn() && summaryConfigs.length > 0) {
        this.warnColVirtualOnce('summary', '合计行（summary）与 column-virtual 暂不兼容：已降级为普通渲染')
      }
    }
    // table-layout：fixed/auto 透传 table 元素（列宽定宽场景配 fixed；缺省/非法不写——浏览器 auto 基线）
    const tableLayout = this.getAttr('table-layout', '')
    const tableEl = this.shadow.querySelector('table')
    if (tableEl) {
      if (tableLayout === 'fixed' || tableLayout === 'auto') tableEl.style.tableLayout = tableLayout
      else tableEl.style.removeProperty('table-layout')
    }
    // column-virtual：colgroup 逐列声明宽（前置列 + 全部叶子列 + 展开列）——
    // 必须配 table-layout:fixed（auto 布局会把 col 宽当「建议」忽略，总宽塌缩无法横向滚动）
    if (colVirtual && tableEl) {
      tableEl.style.tableLayout = 'fixed'
      tableEl.querySelector('colgroup')?.remove()
      const cg = document.createElement('colgroup')
      if (this.rowDragEnabled()) {
        const c = document.createElement('col')
        c.style.width = `${DRAG_CELL_WIDTH}px`
        cg.appendChild(c)
      }
      if (this.hasAttr('checkable')) {
        const c = document.createElement('col')
        c.style.width = `${CHECK_CELL_WIDTH}px`
        cg.appendChild(c)
      }
      for (const col of this.effectiveColumns()) {
        const c = document.createElement('col')
        c.style.width = `${this.colWidthPx(col)}px`
        cg.appendChild(c)
      }
      if (this._expandable) {
        const c = document.createElement('col')
        c.style.width = `${EXPAND_TOGGLE_WIDTH}px`
        cg.appendChild(c)
      }
      tableEl.insertBefore(cg, tableEl.firstChild)
    }
    if (virtual) {
      this.wrap!.setAttribute('data-virtual', 'true')
      this.wrap!.style.maxHeight = `${this.tableHeight()}px`
    } else {
      this.wrap!.removeAttribute('data-virtual')
      // max-height：表体限高滚动（数字落 px，CSS 值原样透传；表头吸顶由 th sticky top:0 常规规则承担）。
      // 虚拟 height 优先——虚拟模式限高自管（height 即容器高），max-height 不参与
      const maxHeight = this.getAttr('max-height', '')
      if (maxHeight !== '') {
        this.wrap!.style.maxHeight = /^\d+$/.test(maxHeight) ? `${maxHeight}px` : maxHeight
      } else {
        this.wrap!.style.maxHeight = ''
      }
    }

    const st = this.wrap ? this.wrap.scrollTop : 0
    head.innerHTML = ''
    body.innerHTML = ''
    this.renderPagination(paginationOn, total, pageSize, current)

    const checkable = this.hasAttr('checkable')
    const single = this.selectionSingle()
    // show-header：表头显隐开关（默认 true 现状；false 时 thead 不渲染表头行，
    // 列配置仍作用于数据行对齐；固定列 / 多级表头 / 虚拟滚动各形态统一走此开关）
    const showHeader = this.getAttr('show-header', 'true') !== 'false'
    if (showHeader && this.headerDepth() > 1) {
      // 多级表头：按列树深渲染多行（组列 colspan 合并、叶子列 rowspan 盖到底部）
      const depth = this.headerDepth()
      for (let r = 0; r < depth; r++) {
        const row = document.createElement('tr')
        if (r === 0 && this.rowDragEnabled()) row.appendChild(this.buildDragTh(layout, depth))
        if (r === 0 && checkable) row.appendChild(this.buildCheckAllTh(layout, flat, rowKey, selected, depth, single))
        for (const cell of this.buildHeaderGrid()) {
          if (cell.level !== r) continue
          const th = document.createElement('th')
          th.setAttribute('part', 'header')
          th.rowSpan = cell.rowspan
          th.colSpan = cell.colspan
          if (cell.isLeaf) {
            th.setAttribute('data-key', cell.col.key)
            this.applyColumnOffset(th, cell.col, layout)
            this.fillHeaderCell(th, cell.col)
            if (cell.col.width) th.style.width = cell.col.width
          } else {
            th.classList.add('header-group')
            th.textContent = cell.col.title
          }
          row.appendChild(th)
        }
        if (r === 0 && this._expandable) {
          const th = document.createElement('th')
          th.className = 'expand-toggle-cell'
          th.rowSpan = depth
          row.appendChild(th)
        }
        head.appendChild(row)
      }
    } else if (showHeader) {
      // 扁平表头（单行，向后兼容）；column-virtual 时走窗口序列（占位 colSpan 归并窗口外列）
      const tr = document.createElement('tr')
      if (this.rowDragEnabled()) tr.appendChild(this.buildDragTh(layout, 1))
      if (checkable) tr.appendChild(this.buildCheckAllTh(layout, flat, rowKey, selected, 1, single))
      for (const item of this.columnWindowSequence()) {
        if (!item.col) {
          const ph = document.createElement('th')
          ph.colSpan = item.span
          ph.className = 'col-virtual-placeholder'
          tr.appendChild(ph)
          continue
        }
        const col = item.col
        const th = document.createElement('th')
        th.setAttribute('part', 'header')
        th.setAttribute('data-key', col.key)
        this.applyColumnOffset(th, col, layout)
        this.fillHeaderCell(th, col)
        if (col.width) th.style.width = col.width
        tr.appendChild(th)
      }
      if (this._expandable) {
        const th = document.createElement('th')
        th.className = 'expand-toggle-cell'
        tr.appendChild(th)
      }
      head.appendChild(tr)
    }

    if (this.hasAttr('loading')) {
      const loadingTr = document.createElement('tr')
      loadingTr.setAttribute('part', 'loading-row')
      const loadingTd = document.createElement('td')
      loadingTd.colSpan = this.columnCount()
      loadingTd.className = 'loading'
      const spin = document.createElement('span')
      spin.className = 'spin'
      loadingTd.append(spin, document.createTextNode(this.t('table.loading')))
      loadingTr.appendChild(loadingTd)
      body.appendChild(loadingTr)
      this.applyGridSemantics()
      return
    }

    if (display.length === 0) {
      const emptyTr = document.createElement('tr')
      const emptyTd = document.createElement('td')
      emptyTd.colSpan = this.columnCount()
      emptyTd.className = 'empty'
      // 空态富内容插槽（slot="empty"）优先于 empty-text / 内置文案
      const slotContent = this.emptySlotContent()
      if (slotContent) emptyTd.appendChild(slotContent)
      else emptyTd.textContent = this.getAttr('empty-text', this.t('table.empty'))
      emptyTr.appendChild(emptyTd)
      body.appendChild(emptyTr)
      this.applyGridSemantics()
      return
    }

    if (virtual) {
      this.renderVirtualBody(body, display, rowKey, selected, expanded, layout, st)
    } else {
      // span-method 占用表按渲染轮重置（显式 span 的跨行/跨列覆盖关系仅本轮有效）
      this._spanCovered.clear()
      const rowInfos: { tr: HTMLTableRowElement; kind: string }[] = []
      let dataIndex = 0
      for (let i = 0; i < display.length; i++) {
        const f = display[i]!
        const tr =
          f.kind === 'expand'
            ? this.buildExpandRow(f)
            : this.buildRow(f, i, rowKey, selected, expanded, layout, dataIndex)
        if (f.kind === 'data') dataIndex++
        rowInfos.push({ tr, kind: f.kind })
        body.appendChild(tr)
      }
      // 合并单元格：对 merge 列后处理连续相同值行（虚拟模式不合并）
      this.applyRowMerge(rowInfos)
    }

    if (summaryConfigs.length > 0 && summaryFlat.length > 0) {
      body.appendChild(this.buildSummaryRow(summaryConfigs, summaryFlat, layout))
    }
    // D9 网格导航语义与 tabindex（须在行渲染后应用：editable 单元格的 tabindex=0 在此收归 -1，
    // 保证「表格单停靠点 + 方向键漫游」；重渲染后角色/tabindex 随新 DOM 重建）
    this.applyGridSemantics()
    // 吸顶行：为前 N 行写入 data-sticky 与 top 偏移（依赖已铺好的表头/行测量高度）
    this.applyStickyRows()
    // innerHTML 清空曾触发浏览器把 scrollTop 钳回 0；内容（含占位）已铺满后恢复原滚动位置
    if (this.wrap && this.wrap.scrollTop !== st) {
      this.ignoreNextScroll = true
      this.wrap.scrollTop = st
    }
  }

  /** 分页器挂载：开启分页时在 .pagination 容器放入 oas-pagination（复用现有分页组件），
      翻页/改页大小 → 写回 current/page-size 并派发 page-change（宿主可接服务端分页） */
  private renderPagination(enabled: boolean, total: number, pageSize: number, current: number): void {
    const holder = this.shadow.querySelector('.pagination')
    if (!holder) return
    holder.innerHTML = ''
    if (!enabled) return
    const p = document.createElement('oas-pagination')
    p.setAttribute('total', String(total))
    p.setAttribute('page-size', String(pageSize))
    p.setAttribute('current', String(current))
    p.addEventListener('oas-change', (e) => {
      const d = (e as CustomEvent).detail
      const page = typeof d?.page === 'number' ? d.page : current
      const size = typeof d?.pageSize === 'number' ? d.pageSize : pageSize
      if (size !== pageSize) this.setAttribute('page-size', String(size))
      if (page !== current) this.setAttribute('current', String(page))
      this.emit('page-change', { page, pageSize: size })
    })
    holder.appendChild(p)
  }

  /** 渲染一行数据（非虚拟模式逐行调用；虚拟模式仅窗口内行调用）。
      dataIndex 为数据行序（span-method 的 rowIndex，不含 expand 内容行） */
  private buildRow(
    flat: FlatRow,
    index: number,
    rowKey: string,
    selected: string[],
    expanded: Set<string>,
    layout: { offsets: Map<string, ColumnOffset>; hasFixed: boolean },
    dataIndex = 0,
  ): HTMLTableRowElement {
    const row = flat.row
    const tr = document.createElement('tr')
    tr.className = 'row'
    tr.setAttribute('part', 'row')
    const key = String(row[rowKey] ?? JSON.stringify(row))
    tr.setAttribute('data-selected', String(selected.includes(key)))
    tr.setAttribute('data-key', key)
    if (this.hasAttr('stripe')) {
      tr.setAttribute('data-stripe', index % 2 === 1 ? 'odd' : 'even')
    }
    // 行 class 钩子：class 挂 tr，并暴露为 ::part token（tr 与该行单元格同步），
    // 宿主页面 CSS 可穿透 Shadow DOM 定制行级样式
    let rowTokens: string[] = []
    if (this._rowClass) {
      const cls = this._rowClass(row, index)
      if (cls) {
        rowTokens = cls.split(/\s+/).filter((t) => /^[A-Za-z_][\w-]*$/.test(t))
        if (rowTokens.length > 0) {
          tr.classList.add(...rowTokens)
          tr.setAttribute('part', `row ${rowTokens.join(' ')}`)
        }
      }
    }
    if (this.rowDragEnabled()) {
      // 行拖拽手柄列（最左；固定列时 left 恒 0，勾选列顺延其宽度）
      const td = document.createElement('td')
      td.className = 'row-drag-cell'
      if (layout.hasFixed) {
        td.setAttribute('data-fixed', 'left')
        td.style.left = '0px'
      }
      td.appendChild(this.buildDragHandle())
      tr.appendChild(td)
    }
    if (this.hasAttr('checkable')) {
      const single = this.selectionSingle()
      const td = document.createElement('td')
      td.className = 'check-cell'
      if (layout.hasFixed) {
        td.setAttribute('data-fixed', 'left')
        td.style.left = `${this.rowDragEnabled() ? DRAG_CELL_WIDTH : 0}px`
      }
      const box = document.createElement('input')
      box.type = single ? 'radio' : 'checkbox'
      box.setAttribute('aria-label', this.t('table.selectRow', { key }))
      box.checked = selected.includes(key)
      if (single) {
        // 单选档：全部走受控写回（click 拦截默认激活行为）——点未选行选中、再点已选行取消；
        // 原生 radio 点击已选项不会自动取消，且各环境激活行为不一致（happy-dom 不改 checked 态）
        box.addEventListener('click', (e) => {
          e.preventDefault()
          const next = selected.includes(key) ? [] : [key]
          this.setAttribute('selected', next.join(','))
          this.emit('check', { keys: next })
          this.runUpdateAndNotify()
        })
      } else {
        box.addEventListener('change', (e) => {
          e.stopPropagation()
          const next = new Set(selected)
          if (box.checked) next.add(key)
          else next.delete(key)
          this.setAttribute('selected', [...next].join(','))
          this.emit('check', { keys: [...next] })
          this.runUpdateAndNotify()
        })
      }
      td.appendChild(box)
      tr.appendChild(td)
    }
    tr.addEventListener('click', (e) => {
      if (this.hasAttr('checkable')) return
      // 交互宿主（原生控件 / [role] / 库内交互组件 / data-oas-row-click-ignore 逃生口）内的
      // 点击不触发行选中+重渲染——否则点单元格内嵌 popconfirm 会触发 update() 全量重建 body，
      // 把刚打开的 popconfirm 销毁成默认关闭；自定义组件宿主自身无 role 属性须点名排除
      // （同一清单也约束双击进编辑路径，见 oas-table-interactive.js 的单一事实来源注释）
      const el = e.target as HTMLElement | null
      if (el && el.closest(ROW_INTERACTIVE_EXCLUSION)) return
      const next = new Set(selected)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      this.setAttribute('selected', [...next].join(','))
      this.emit('row-click', { row, key })
      this.runUpdateAndNotify()
    })
    const children = row.children
    const hasChildren = Array.isArray(children) && children.length > 0
    const effCols = this.effectiveColumns()
    // 受控合并（span-method）仅在非虚拟模式生效（与 merge 同级的定高限制）
    const useSpan = !this.isVirtual() && this._spanMethod !== null
    // 列序列：column-virtual 时 = [左占位 colSpan][窗口列…][右占位 colSpan]（占位项 col=null）；
    // 非 column-virtual = 全列（span 1），行为与旧版完全一致
    const colSeq = this.columnWindowSequence()
    let dataColSeq = 0
    for (let seqIdx = 0; seqIdx < colSeq.length; seqIdx++) {
      const item = colSeq[seqIdx]!
      const col = item.col
      if (!col) {
        // 横向虚拟：窗口外占位格（colSpan 归并，宽度由 colgroup 对应列求和）
        const ph = document.createElement('td')
        ph.colSpan = item.span
        ph.className = 'col-virtual-placeholder'
        tr.appendChild(ph)
        continue
      }
      const colIdx = dataColSeq
      dataColSeq++
      if (useSpan && this._spanCovered.has(`${dataIndex}:${colIdx}`)) continue
      let span: { rowspan: number; colspan: number } | null = null
      if (useSpan) {
        const n = normalizeSpan(this._spanMethod!(row, col, dataIndex, colIdx))
        if (n.rowspan < 1 || n.colspan < 1) continue // 函数声明本格被覆盖 → 不渲染
        if (n.rowspan > 1 || n.colspan > 1) span = n
      }
      const td = document.createElement('td')
      if (rowTokens.length > 0) td.setAttribute('part', `cell ${rowTokens.join(' ')}`)
      if (span) {
        td.rowSpan = span.rowspan
        td.colSpan = Math.min(span.colspan, effCols.length - colIdx)
        // 登记被本格覆盖的格：rowspan 向下延伸 + colspan 向右延伸（本行右邻先行跳过）
        for (let r = dataIndex + 1; r < dataIndex + span.rowspan; r++) {
          for (let c = colIdx; c < colIdx + td.colSpan; c++) this._spanCovered.add(`${r}:${c}`)
        }
        for (let c = colIdx + 1; c < colIdx + td.colSpan; c++) this._spanCovered.add(`${dataIndex}:${c}`)
      }
      this.applyColumnOffset(td, col, layout)
      if (col.align) td.className = `align-${col.align}`
      td.setAttribute('data-col', col.key)
      if (colIdx === 0) {
        // 树形：按层级缩进（indent-size 属性控制每级 px，缺省 24=现状；非法/负值回落默认）
        if (hasChildren || flat.depth > 0) {
          td.style.paddingLeft = `${16 + flat.depth * this.indentSize()}px`
        }
        // 树形：父行展开/收起按钮
        if (hasChildren) {
          const btn = document.createElement('button')
          btn.className = `toggle${expanded.has(key) ? ' open' : ''}`
          btn.setAttribute('aria-label', this.t('table.expand'))
          btn.setAttribute('aria-expanded', String(expanded.has(key)))
          btn.textContent = '›'
          btn.addEventListener('click', (e) => {
            e.stopPropagation()
            this.toggleExpand(key, !expanded.has(key))
          })
          td.appendChild(btn)
        }
      }
      if (col.actions) {
        // 操作列渲染委托 edit 能力（无 controller 时单元格留空：未 import 编辑能力，actions 静默失效）
        this.editCap?.renderActionCell(td, tr)
      } else if (col.serialNumber) {
        // 序号列（从 1 递增，不受排序/隐藏列影响——按当前可见行当前位置计）
        td.textContent = String(index + 1)
      } else {
        // cellNode 优先渲染返回的 Node/元素（tag/avatar/badge 等富内容），否则纯文本
        const node = this.cellNode(col, row)
        if (node) td.appendChild(node)
      }
      if (col.ellipsis) {
        td.classList.add('cell-ellipsis')
        td.title = this.cellText(col, row)
      }
      // 可编辑单元格装饰（焦点可达 + 铅笔图标 + Enter/F2/双击进入编辑）委托 edit 能力：
      // 未 import 编辑能力（无 controller）时静默跳过，表格级 editable 与列级 editable
      // 双重要求在能力内部判定
      if (col.editable) this.editCap?.decorateCell(td, col)
      tr.appendChild(td)
    }
    if (this._expandable) {
      // 可展开行：行尾展开/收起按钮。rowExpandable 谓词（property 函数通道）返回 false 的行
      // 不渲染展开钮（占位单元格保留，与列对齐不破坏）
      const td = document.createElement('td')
      td.className = 'expand-toggle-cell'
      const expandable = this._rowExpandable === null || this._rowExpandable(row, dataIndex) !== false
      if (expandable && typeof row.expand === 'string' && row.expand.length > 0) {
        const btn = document.createElement('button')
        btn.className = `toggle${expanded.has(key) ? ' open' : ''}`
        btn.setAttribute('aria-label', this.t('table.expand'))
        btn.setAttribute('aria-expanded', String(expanded.has(key)))
        btn.textContent = '›'
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.toggleExpand(key, !expanded.has(key))
        })
        td.appendChild(btn)
      }
      tr.appendChild(td)
    }
    // 单元格点击 / 行双击（行级手势沿用交互宿主排除清单——按钮/链接/表单控件内不派发，
    // 与 oas-row-click / 双击编辑同一纪律来源）。委托到 tr：命中 td[data-col] 才算数据格
    // （勾选列/行尾展开列无 data-col 不派发）；展开钮点击自带 stopPropagation 不误触。
    tr.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const td = target.closest('td[data-col]')
      if (!td || !tr.contains(td)) return
      if (target.closest(ROW_INTERACTIVE_EXCLUSION)) return
      const column = td.getAttribute('data-col') ?? ''
      const columnIndex = effCols.findIndex((c) => c.key === column)
      if (columnIndex < 0) return
      this.emit('cell-click', { row, column, value: row[column], rowIndex: dataIndex, columnIndex })
    })
    tr.addEventListener('dblclick', (e) => {
      const target = e.target as HTMLElement | null
      if (target && target.closest(ROW_INTERACTIVE_EXCLUSION)) return
      this.emit('row-dblclick', { row, rowIndex: dataIndex })
    })
    return tr
  }

  /** 树形缩进每级 px（indent-size 属性；缺省/非法/负值回落 24=历史现状） */
  private indentSize(): number {
    const n = Number(this.getAttr('indent-size', '24'))
    return Number.isFinite(n) && n >= 0 ? n : 24
  }

  /** 渲染可展开行的内容行（整行 colspan 展示自定义内容） */
  /** 合并单元格：对 merge 列后处理连续相同显示值的行，首行 rowspan 覆盖、后续行删除该列 td。
      仅合并连续 data 行（expand 内容行插入则断开分组）。按 data-col 属性按 key 查询 td，
      对其它列已删除的 td 免疫（不依赖列位置索引，避免跨列删除导致的索引漂移）。 */
  private applyRowMerge(rows: { tr: HTMLTableRowElement; kind: string }[]): void {
    for (const col of this.effectiveColumns()) {
      if (!col.merge) continue
      let group: { td: HTMLTableCellElement; value: string }[] = []
      const flush = () => {
        if (group.length > 1) {
          group[0]!.td.rowSpan = group.length
          for (let i = 1; i < group.length; i++) group[i]!.td.remove()
        }
        group = []
      }
      for (const { tr, kind } of rows) {
        if (kind !== 'data') {
          flush()
          continue
        }
        const td = tr.querySelector<HTMLTableCellElement>(`td[data-col="${col.key}"]`)
        if (!td) {
          flush()
          continue
        }
        const value = td.textContent ?? ''
        if (group.length > 0 && group[0]!.value === value) {
          group.push({ td, value })
        } else {
          flush()
          group = [{ td, value }]
        }
      }
      flush()
    }
  }

  private buildExpandRow(flat: FlatRow): HTMLTableRowElement {
    const tr = document.createElement('tr')
    tr.className = 'expand-row'
    tr.setAttribute('part', 'expand-row')
    const td = document.createElement('td')
    td.colSpan = this.columnCount()
    td.innerHTML = flat.expandContent ?? ''
    // 虚拟滚动定高模型：展开行同样强制 row-height——td 高度是内容驱动的，
    // 仅 overflow:hidden 截不住（行仍被撑高），须 display:block + 显式高度才真正截断。
    // 展开富内容请用非虚拟模式（与 merge 同级的虚拟模式限制，文档已写明）。
    if (this.wrap?.getAttribute('data-virtual') === 'true') {
      td.style.display = 'block'
      td.style.height = `${this.rowHeight()}px`
      td.style.overflow = 'hidden'
    }
    tr.appendChild(td)
    return tr
  }

  /** 空态富内容插槽：light DOM 中 slot="empty" 的子元素（<template> 克隆 content，其余克隆元素本身）。
      优先于 empty-text / 内置文案；插槽子元素增删由 MutationObserver 感知触发重渲染 */
  private emptySlotContent(): Node | null {
    const tpl = this.querySelector('template[slot="empty"]')
    if (tpl) return (tpl as HTMLTemplateElement).content.cloneNode(true)
    const el = this.querySelector('[slot="empty"]')
    if (el) return el.cloneNode(true)
    return null
  }

  /** 虚拟滚动：占位行 + 可见窗口行 */
  private renderVirtualBody(
    body: HTMLElement,
    display: FlatRow[],
    rowKey: string,
    selected: string[],
    expanded: Set<string>,
    layout: { offsets: Map<string, ColumnOffset>; hasFixed: boolean },
    scrollTop = this.wrap ? this.wrap.scrollTop : 0,
  ): void {
    const win = computeVirtualWindow(scrollTop, this.tableHeight(), this.rowHeight(), display.length)
    const colSpan = this.columnCount()
    // 吸顶行恒渲染在列表顶部（视口外的吸顶行也从窗口中排除，避免重复渲染）
    const sticky = this.stickyRowCount()
    const stickyEnd = Math.min(sticky, display.length)
    let windowStart = win.start
    if (stickyEnd > 0) {
      for (let i = 0; i < stickyEnd; i++) {
        const f = display[i]!
        const tr =
          f.kind === 'expand' ? this.buildExpandRow(f) : this.buildRow(f, i, rowKey, selected, expanded, layout)
        tr.style.height = `${this.rowHeight()}px`
        body.appendChild(tr)
      }
      windowStart = Math.max(win.start, stickyEnd)
    }

    const topSpacer = document.createElement('tr')
    topSpacer.className = 'spacer'
    const topTd = document.createElement('td')
    topTd.colSpan = colSpan
    topTd.style.height = `${(windowStart - stickyEnd) * this.rowHeight()}px`
    topSpacer.appendChild(topTd)
    body.appendChild(topSpacer)

    for (let i = windowStart; i < win.end; i++) {
      const f = display[i]!
      const tr = f.kind === 'expand' ? this.buildExpandRow(f) : this.buildRow(f, i, rowKey, selected, expanded, layout)
      tr.style.height = `${this.rowHeight()}px`
      body.appendChild(tr)
    }

    const bottomSpacer = document.createElement('tr')
    bottomSpacer.className = 'spacer'
    const bottomTd = document.createElement('td')
    bottomTd.colSpan = colSpan
    bottomTd.style.height = `${(display.length - win.end) * this.rowHeight()}px`
    bottomSpacer.appendChild(bottomTd)
    body.appendChild(bottomSpacer)
  }

  /** 为 th/td 写入固定列 sticky 偏移（left/right） */
  private applyColumnOffset(
    cell: HTMLElement,
    col: TableColumn,
    layout: { offsets: Map<string, ColumnOffset>; hasFixed: boolean },
  ): void {
    const off = layout.offsets.get(col.key)
    if (!off) return
    cell.setAttribute('data-fixed', off.fixed)
    if (off.fixed === 'left') cell.style.left = `${off.left ?? 0}px`
    else cell.style.right = `${off.right ?? 0}px`
  }

  /** 计算各列 sticky 偏移（左侧从左累加、右侧从右累加） */
  /** 扁平化列树：深度优先收集叶子列（无 children）。组列只承载标题，不产出数据单元格 */
  private flattenLeaves(cols: TableColumn[]): TableColumn[] {
    const out: TableColumn[] = []
    for (const c of cols) {
      if (c.children && c.children.length > 0) out.push(...this.flattenLeaves(c.children))
      else out.push(c)
    }
    return out
  }

  /** 有效列：按 column-keys（受控显示集合+顺序）过滤排序；无 column-keys 时回落全部叶子列（向后兼容）。
      再剔除 TableColumn.hidden 标记的列。column-keys 仅约束渲染的列，不改变数据模型。
      列树先扁平为叶子列，数据/排序/显隐/拖拽均作用于叶子列。
      （公开：能力 controller（编辑）与渲染共用同一份有效列视图） */
  effectiveColumns(): TableColumn[] {
    let cols = this.flattenLeaves(this._columns)
    if (this._columnKeys.length > 0) {
      const order = new Map(this._columnKeys.map((k, i) => [k, i]))
      cols = cols.filter((c) => order.has(c.key)).sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0))
    }
    return cols.filter((c) => c.hidden !== true)
  }

  /** 当前全部列定义（含组列；表格基础 API，能力 controller / 宿主可读） */
  getColumns(): TableColumn[] {
    return this._columns
  }

  /** 翻译内置文案（就近 config-provider / locale；能力 controller 与外部自定义模板经此取词）。
      命名避开 DOM 保留属性 translate（HTMLElement.translate 为布尔） */
  translateText(key: string, params?: Record<string, string | number>): string {
    return this.t(key, params)
  }

  /** 重绘单元格为常规展示内容：清空后按 cellNode 挂载（尊重 render/cellTemplate 富内容）。
      编辑退出/取消后还原单元格用；与 buildRow 的常规渲染路径一致。 */
  paintCell(td: HTMLTableCellElement, col: TableColumn, row: Record<string, unknown>): void {
    td.textContent = ''
    const node = this.cellNode(col, row)
    if (node) td.appendChild(node)
  }

  /** 派发编辑结果事件（提交/取消；detail 由 edit 能力组好）。事件名以字面量书写在此，
      供 api 扫描静态识别事件清单；未 import 编辑能力时不会有任何调用 */
  notifyEdit(kind: 'edit' | 'edit-cancel', detail: TableEditDetail): void {
    this.emit(kind === 'edit' ? 'edit' : 'edit-cancel', detail)
  }

  /** 更新列显示顺序（写回 column-keys 并重渲染；派发 oas-column-order，宿主可做持久化） */
  setColumnOrder(keys: string[]): void {
    const leaves = this.flattenLeaves(this._columns)
    const valid = keys.filter((k) => leaves.some((c) => c.key === k))
    if (valid.length === 0) return
    this.setAttribute('column-keys', JSON.stringify(valid))
    this.emit('column-order', { keys: valid })
  }

  /** 更新指定列宽（写回 columns 对应列 width 并重渲染；派发 oas-column-resize）。property 列定义含函数时改内存 */
  setColumnWidth(key: string, width: number): void {
    const update = (cols: TableColumn[]): TableColumn[] =>
      cols.map((c) =>
        c.children && c.children.length > 0
          ? { ...c, children: update(c.children) }
          : c.key === key
            ? { ...c, width: `${width}px` }
            : c,
      )
    if (this._columnsFromProperty) {
      this._columns = update(this._columns)
      this.runUpdateAndNotify()
      this.emit('column-resize', { key, width })
      return
    }
    this._columnsFromProperty = false
    this.setAttribute('columns', JSON.stringify(update(this._columns)))
    this.emit('column-resize', { key, width })
  }

  private computeLayout(): { offsets: Map<string, ColumnOffset>; hasFixed: boolean } {
    const offsets = new Map<string, ColumnOffset>()
    const cols = this.effectiveColumns()
    const hasFixed = cols.some((c) => c.fixed)
    let leftAccum = 0
    // 左侧前置列：行拖拽手柄列（最左）→ 勾选列（顺延）
    if (hasFixed) {
      leftAccum = (this.rowDragEnabled() ? DRAG_CELL_WIDTH : 0) + (this.hasAttr('checkable') ? CHECK_CELL_WIDTH : 0)
    }
    for (const col of cols) {
      if (col.fixed === 'left') {
        offsets.set(col.key, { fixed: 'left', left: leftAccum })
        leftAccum += columnWidth(col)
      }
    }
    let rightAccum = this._expandable ? EXPAND_CELL_WIDTH : 0
    for (let i = cols.length - 1; i >= 0; i--) {
      const col = cols[i]!
      if (col.fixed === 'right') {
        offsets.set(col.key, { fixed: 'right', right: rightAccum })
        rightAccum += columnWidth(col)
      }
    }
    return { offsets, hasFixed }
  }

  /** 该列（含后代）可见叶子数：隐藏叶子不计；组列 = 各子列可见叶子之和（组列自身无数据单元格） */
  private leafCount(col: TableColumn): number {
    if (col.children && col.children.length > 0) {
      return col.children.reduce((sum, c) => sum + this.leafCount(c), 0)
    }
    return col.hidden ? 0 : 1
  }

  /** 多级表头树深：最深层叶子所在层级（无列=0），只统计存在可见叶子的组层 */
  private headerDepth(): number {
    const walk = (cols: TableColumn[]): number => {
      let max = 1
      for (const c of cols) {
        if (c.children && c.children.length > 0 && this.leafCount(c) > 0) {
          max = Math.max(max, 1 + walk(c.children))
        }
      }
      return cols.length ? max : 0
    }
    return walk(this._columns)
  }

  /** 生成多级表头网格：rows[r] 为第 r 行需渲染的表头单元格（含 rowspan/colspan/是否叶子）。
      有 children 的组列一行渲染（colspan=可见叶子数）；叶子列落位到树深、rowspan 盖到底部（表头多行时数据对齐）。
      列树经 orderedHeaderTree 重排：column-keys 受控时叶头顺序与数据列（effectiveColumns）一致。 */
  private buildHeaderGrid(): {
    col: TableColumn
    level: number
    rowspan: number
    colspan: number
    isLeaf: boolean
  }[] {
    const depth = this.headerDepth()
    const rows: {
      col: TableColumn
      level: number
      rowspan: number
      colspan: number
      isLeaf: boolean
    }[][] = Array.from({ length: depth }, () => [])
    const fill = (cols: TableColumn[], level: number): void => {
      for (const col of cols) {
        const count = this.leafCount(col)
        if (count === 0) continue
        if (col.children && col.children.length > 0) {
          rows[level]!.push({ col, level, rowspan: 1, colspan: count, isLeaf: false })
          fill(col.children, level + 1)
        } else {
          rows[level]!.push({ col, level, rowspan: depth - level, colspan: 1, isLeaf: true })
        }
      }
    }
    fill(this.orderedHeaderTree(), 0)
    return rows.flat()
  }

  /**
   * 多级表头渲染用的列树：column-keys 受控时按有效叶子顺序重组（连续同祖先链的叶子并入原组），
   * 保证组头/叶头的落位顺序与数据列（effectiveColumns，column-keys 过滤+排序）严格一致——
   * 否则列拖拽重排（写回 column-keys）后表头叶列与数据列顺序脱节。
   * 组头取原组列定义（标题/样式不变）；跨组交错的 key 按数据列顺序切分为多段（各段并入其原组）。
   * 无 column-keys 时返回原列树（行为不变）。
   */
  private orderedHeaderTree(): TableColumn[] {
    if (this._columnKeys.length === 0) return this._columns
    const leaves = this.effectiveColumns()
    // 每个叶子在原列树中的祖先链（顶层组 → 直接父）
    const chainOf = new Map<string, TableColumn[]>()
    const walk = (cols: TableColumn[], chain: TableColumn[]): void => {
      for (const c of cols) {
        if (c.children && c.children.length > 0) walk(c.children, [...chain, c])
        else chainOf.set(c.key, chain)
      }
    }
    walk(this._columns, [])
    type Node = { col: TableColumn } | { group: TableColumn; children: Node[] }
    const root: Node[] = []
    const mergeInto = (siblings: Node[], chain: TableColumn[], leaf: TableColumn): void => {
      const [head, ...rest] = chain
      if (!head) {
        siblings.push({ col: leaf })
        return
      }
      const last = siblings[siblings.length - 1]
      if (!last || !('group' in last) || last.group !== head) {
        siblings.push({ group: head, children: [] })
      }
      mergeInto((siblings[siblings.length - 1] as { group: TableColumn; children: Node[] }).children, rest, leaf)
    }
    for (const leaf of leaves) mergeInto(root, chainOf.get(leaf.key) ?? [], leaf)
    const materialize = (nodes: Node[]): TableColumn[] =>
      nodes.map((n) => ('group' in n ? { ...n.group, children: materialize(n.children) } : n.col))
    return materialize(root)
  }

  /**
   * 过滤状态：filter-values 属性 JSON `{ [colKey]: value }`；空/缺省 = 无过滤。
   * 智能跳过空值（'' / null），避免误过滤。
   */
  private parseFilterValues(): Record<string, string | number> {
    const raw = this.getAttr('filter-values', '')
    if (!raw) return {}
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      if (!parsed || typeof parsed !== 'object') return {}
      const out: Record<string, string | number> = {}
      for (const [k, v] of Object.entries(parsed)) {
        if (v === '' || v === null || v === undefined) continue
        out[k] = typeof v === 'number' ? v : String(v)
      }
      return out
    } catch {
      return {}
    }
  }

  /** 该行是否命中所有过滤条件 */
  private matchesFilters(row: Record<string, unknown>, filterValues: Record<string, string | number>): boolean {
    const leaves = this.flattenLeaves(this._columns)
    for (const [key, fv] of Object.entries(filterValues)) {
      const col = leaves.find((c) => c.key === key)
      if (!col) continue
      const cell = row[key]
      if (col.filterMatch) {
        if (!col.filterMatch(cell, fv)) return false
      } else if (String(cell ?? '') !== String(fv)) {
        return false
      }
    }
    return true
  }

  /** 该列过滤选项：列级 filters 优先，否则取该列数据唯一非空值 */
  private filterOptions(col: TableColumn): Array<{ label: string; value: string | number }> {
    if (col.filters && col.filters.length > 0) return col.filters
    const seen = new Map<unknown, string>()
    for (const row of this._data) {
      const v = row[col.key]
      if (v === '' || v === null || v === undefined) continue
      if (!seen.has(v)) seen.set(v, String(v))
    }
    return [...seen].map(([value, label]) => ({ label, value: value as string | number }))
  }

  /** 打开某列的过滤弹层（fixed 定位到触发按钮附近）；已打开则关闭 */
  private openFilterPanel(col: TableColumn, trigger: HTMLElement): void {
    if (this.filterPanelKey === col.key) {
      this.closeFilterPanel()
      return
    }
    this.closeFilterPanel()
    this.filterPanelKey = col.key
    const values = this.parseFilterValues()
    const current = values[col.key]
    const panel = document.createElement('div')
    panel.className = 'filter-panel'
    panel.setAttribute('role', 'listbox')
    panel.setAttribute('aria-label', `${this.t('table.filter')} ${col.title}`)
    const title = document.createElement('div')
    title.className = 'filter-title'
    title.textContent = col.title
    panel.appendChild(title)
    if (current !== undefined) {
      const clear = document.createElement('button')
      clear.type = 'button'
      clear.className = 'filter-clear'
      clear.textContent = this.t('table.clear')
      clear.addEventListener('click', () => this.applyFilter(col.key, ''))
      panel.appendChild(clear)
    }
    for (const opt of this.filterOptions(col)) {
      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'filter-option'
      item.setAttribute('role', 'option')
      item.setAttribute('aria-selected', String(String(opt.value) === String(current)))
      item.textContent = opt.label
      item.addEventListener('click', () => this.applyFilter(col.key, opt.value))
      panel.appendChild(item)
    }
    this.filterPanel = panel
    // 先挂 DOM（fixed 定位不占布局）再定位：面板尺寸量取依赖真实渲染盒子
    this.shadowRoot?.appendChild(panel)
    this.positionFilterPanel(panel, trigger)
    this.bindFilterPanelClose(panel)
  }

  /** 关闭并清理过滤弹层 */
  private closeFilterPanel(): void {
    this.filterPanel?.remove()
    this.filterPanel = null
    this.filterPanelKey = null
  }

  /** 写入过滤值并重渲染（'' 表示清除该列过滤）；派发 oas-filter-change */
  private applyFilter(key: string, value: string | number): void {
    const values = { ...this.parseFilterValues() }
    if (value === '' || value === null || value === undefined) delete values[key]
    else values[key] = typeof value === 'number' ? value : String(value)
    this.closeFilterPanel() // hide first (panel无 filter 容差依赖)，再写回触重渲染
    this.setAttribute('filter-values', Object.keys(values).length > 0 ? JSON.stringify(values) : '')
    this.emit('filter-change', { filters: values })
  }

  /** 过滤面板定位走共享 floating 引擎：bottom-start 锚定 + 空间不足翻转 + 视口夹取（含 visualViewport） */
  private positionFilterPanel(panel: HTMLElement, trigger: HTMLElement): void {
    const rect = trigger.getBoundingClientRect()
    const pRect = panel.getBoundingClientRect()
    const pos = computePosition(rect, pRect, 'bottom-start', getViewport(), 6, true, {
      direction: resolveDirection(this),
    })
    panel.style.left = `${pos.left}px`
    panel.style.top = `${pos.top}px`
  }

  /** 点击面板外 / Escape 关闭过滤面板 */
  private bindFilterPanelClose(panel: HTMLElement): void {
    const onDocClick = (e: Event) => {
      if (panel.contains(e.target as Node) || this.contains(e.target as Node)) return
      this.closeFilterPanel()
      document.removeEventListener('click', onDocClick, true)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeFilterPanel()
        document.removeEventListener('keydown', onKey)
      }
    }
    document.addEventListener('click', onDocClick, true)
    document.addEventListener('keydown', onKey)
  }

  /**
   * 解析当前排序状态：无 multi-sort 时回退单列 sort-key/sort-order（向后兼容）。
   * 返回数组按优先级排序（先比较首个，相等再比较次个）。
   */ private resolveSorts(): SortState[] {
    const raw = this.getAttr('multi-sort', '')
    if (raw) {
      try {
        const arr = JSON.parse(raw) as Array<{ key: string; order?: SortOrder }>
        const out = (Array.isArray(arr) ? arr : [])
          .filter(
            (s): s is { key: string; order: 'asc' | 'desc' } =>
              !!s && typeof s.key === 'string' && (s.order === 'asc' || s.order === 'desc'),
          )
          .map((s): SortState => ({ key: s.key, order: s.order }))
        return out
      } catch {
        /* 非法 multi-sort 忽略，回退单列 */
      }
    }
    const key = this.getAttr('sort-key', '')
    const order = this.getAttr('sort-order', '') as SortOrder
    return key && (order === 'asc' || order === 'desc') ? [{ key, order }] : []
  }

  /**
   * 排序比较器：按 sorts 数组逐级比较，数字按数值、其余按字符串码点确定性比较。
   * 不依赖宿主 locale（localeCompare 无显式 locale 时 Windows full-ICU 中文拼音与
   * Linux small-ICU 码点排序结果不同，导致跨环境行为不一致）；语言感知排序（如中文
   * 拼音）应由宿主在数据侧预排序或提供自定义 comparator。
   */
  private compareRows(a: Record<string, unknown>, b: Record<string, unknown>, sorts: SortState[]): number {
    for (const { key, order } of sorts) {
      if (!order) continue
      const av = a[key]
      const bv = b[key]
      let cmp = 0
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv
      } else {
        const sa = String(av)
        const sb = String(bv)
        cmp = sa < sb ? -1 : sa > sb ? 1 : 0
      }
      if (cmp !== 0) return order === 'asc' ? cmp : -cmp
    }
    return 0
  }

  /**
   * 构建扁平行列表（含树形 children 递归）。排序在各层级兄弟间独立进行，不破坏父子结构；
   * 返回的 flat 是完整列表（树形含隐藏子行），visibleFlat 再做可见性过滤。
   * roots 传入时只遍历这些顶层行（供分页切片用），否则遍历 this._data。
   */
  private buildFlat(sorts: SortState[], rowKey: string, roots: Array<Record<string, unknown>> = this._data): FlatRow[] {
    const flat: FlatRow[] = []
    const walk = (nodes: Array<Record<string, unknown>>, depth: number, parent?: string): void => {
      const list = [...nodes]
      if (sorts.length > 0) {
        list.sort((a, b) => this.compareRows(a, b, sorts))
      }
      for (const row of list) {
        flat.push({ row, depth, parent, kind: 'data' })
        const children = row.children
        if (Array.isArray(children) && children.length > 0) {
          walk(children, depth + 1, String(row[rowKey] ?? JSON.stringify(row)))
        }
      }
    }
    walk(roots, 0)
    return flat
  }

  /**
   * 可见行列表：树形数据按 expanded（父行 key）过滤；可展开行的内容行紧随数据行。
   * 父行有 children 时优先展示子树（不叠加 expand 内容行）。
   */
  private visibleFlat(flat: FlatRow[], expanded: Set<string>, rowKey: string): FlatRow[] {
    const out: FlatRow[] = []
    for (const f of flat) {
      if (f.parent !== undefined && !expanded.has(f.parent)) continue
      out.push(f)
      const row = f.row
      const children = row.children
      const hasChildren = Array.isArray(children) && children.length > 0
      const key = String(row[rowKey] ?? JSON.stringify(row))
      if (!hasChildren && expanded.has(key) && typeof row.expand === 'string' && row.expand.length > 0) {
        out.push({
          row,
          depth: f.depth,
          parent: f.parent,
          kind: 'expand',
          expandContent: row.expand,
        })
      }
    }
    return out
  }

  /** 展开/收起某行（树形子行或可展开内容行共用），派发 oas-expand */
  private toggleExpand(key: string, expanded: boolean): void {
    const set = new Set(this.getAttr('expanded', '').split(',').filter(Boolean))
    if (expanded) set.add(key)
    else set.delete(key)
    this.setAttribute('expanded', [...set].join(','))
    this.emit('expand', { key, expanded })
    this.runUpdateAndNotify()
  }

  /** 总列数（行拖拽手柄列 + 勾选列 + 数据列 + 可展开行尾列） */
  private columnCount(): number {
    return (
      this.effectiveColumns().length +
      (this.rowDragEnabled() ? 1 : 0) +
      (this.hasAttr('checkable') ? 1 : 0) +
      (this._expandable ? 1 : 0)
    )
  }

  /** 前置非数据列数（行拖拽手柄列 + 勾选列）：编辑能力据此把数据列索引换算为 td 索引 */
  leadingColumnCount(): number {
    return (this.rowDragEnabled() ? 1 : 0) + (this.hasAttr('checkable') ? 1 : 0)
  }

  /** 汇总合计配置：表格级 summary 属性（JSON 数组）+ 列级 summary 字段 */
  private buildSummaryConfigs(): SummaryConfig[] {
    const configs: SummaryConfig[] = []
    const raw = this.getAttr('summary', '')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item.key === 'string' && isSummaryType(item.type)) {
              configs.push({
                key: item.key,
                type: item.type,
                label: typeof item.label === 'string' && item.label ? item.label : undefined,
              })
            }
          }
        }
      } catch {
        /* 非法 JSON 忽略，回退列级配置 */
      }
    }
    for (const col of this.effectiveColumns()) {
      if (isSummaryType(col.summary) && !configs.some((c) => c.key === col.key)) {
        configs.push({ key: col.key, type: col.summary })
      }
    }
    return configs
  }

  /** 按类型计算各列聚合值（对完整扁平行计算，树形含隐藏子行，结果不随展开状态漂移） */
  private computeSummary(configs: SummaryConfig[], flat: FlatRow[]): Map<string, string> {
    const values = new Map<string, string>()
    for (const cfg of configs) {
      let sum = 0
      let cnt = 0
      for (const f of flat) {
        const v = f.row[cfg.key]
        if (cfg.type === 'count') {
          if (v !== undefined && v !== null && v !== '') cnt++
          continue
        }
        const n = typeof v === 'number' ? v : Number(v)
        if (Number.isFinite(n)) {
          sum += n
          cnt++
        }
      }
      if (cfg.type === 'sum') values.set(cfg.key, String(sum))
      else if (cfg.type === 'avg') values.set(cfg.key, String(cnt ? Math.round((sum / cnt) * 100) / 100 : 0))
      else values.set(cfg.key, String(cnt))
    }
    return values
  }

  /** 渲染合计行（表尾，紧随全部数据行之后） */
  private buildSummaryRow(
    configs: SummaryConfig[],
    flat: FlatRow[],
    layout: { offsets: Map<string, ColumnOffset>; hasFixed: boolean },
  ): HTMLTableRowElement {
    const tr = document.createElement('tr')
    tr.className = 'summary'
    tr.setAttribute('part', 'summary-row')
    const values = this.computeSummary(configs, flat)
    const label = configs.find((c) => c.label)?.label ?? this.t('table.summary')
    let labelPlaced = false
    if (this.rowDragEnabled()) {
      const td = document.createElement('td')
      td.className = 'row-drag-cell'
      if (layout.hasFixed) {
        td.setAttribute('data-fixed', 'left')
        td.style.left = '0px'
      }
      tr.appendChild(td)
    }
    if (this.hasAttr('checkable')) {
      const td = document.createElement('td')
      td.className = 'check-cell'
      tr.appendChild(td)
    }
    for (const col of this.effectiveColumns()) {
      const td = document.createElement('td')
      this.applyColumnOffset(td, col, layout)
      if (col.align) td.className = `align-${col.align}`
      const cfg = configs.find((c) => c.key === col.key)
      if (cfg) {
        td.textContent = values.get(cfg.key) ?? ''
      } else if (!labelPlaced) {
        // 首列（无聚合配置的列）放标签，其余空格
        td.textContent = label
        labelPlaced = true
      }
      tr.appendChild(td)
    }
    if (this._expandable) {
      const td = document.createElement('td')
      td.className = 'expand-toggle-cell'
      tr.appendChild(td)
    }
    return tr
  }

  // ==================== D8 导出（exportable：CSV / Excel 客户端生成） ====================

  /** 当前导出格式集合（export-format 逗号串；缺省/全非法回落 ['csv']） */
  private exportFormats(): ExportFormat[] {
    return parseExportFormats(this.getAttr('export-format', 'csv'))
  }

  /** 导出文件名（去扩展名；净化路径分隔符与文件系统保留字符） */
  exportFileName(): string {
    return sanitizeFileName(this.getAttr('export-file-name', 'export'))
  }

  /**
   * 导出矩阵：表头（列 title / headerTemplate 文本）+ 当前可见数据行。
   * - 数据范围 = 当前展示的数据行（过滤 + 排序 + 分页切片后；虚拟滚动取完整展示集合）；
   * - 字段映射按列 key 取单元格展示文本（select 编辑器输出 label、serialNumber 输出行号；
   *   render 返回字符串时优先，Node/模板富内容回退原文）；
   * - `actions` 列（纯操作按钮）不导出。
   */
  exportMatrix(): { headers: string[]; rows: string[][] } {
    const cols = this.effectiveColumns().filter((c) => !c.actions)
    const headers = cols.map((c) => {
      if (c.headerTemplate) {
        const frag = c.headerTemplate.content.cloneNode(true) as DocumentFragment
        const text = frag.textContent?.trim() ?? ''
        return text !== '' ? text : c.title
      }
      return c.title ?? ''
    })
    const rows = this._exportRows.map((row, i) =>
      cols.map((col) => (col.serialNumber ? String(i + 1) : this.cellText(col, row))),
    )
    return { headers, rows }
  }

  /**
   * 导出并触发下载：生成内容 → Blob 下载 → 派发 `oas-export`
   * （detail `{ format, fileName, rowCount }`）→ 返回生成文本（便于宿主自行落盘/断言）。
   * 即使未开启 `exportable`（无工具栏）也可编程式调用。
   */
  exportData(format: ExportFormat = this.exportFormats()[0]!, options: { fileName?: string } = {}): string {
    const { headers, rows } = this.exportMatrix()
    const fileName = `${sanitizeFileName(options.fileName ?? this.exportFileName())}.${EXPORT_EXT[format]}`
    const content = format === 'excel' ? toExcelXml(headers, rows) : toCSV(headers, rows, { bom: true })
    downloadText(content, fileName, format)
    this.emit('export', { format, fileName, rowCount: rows.length })
    return content
  }

  /** 渲染导出工具栏（exportable 时按 export-format 出按钮；未开启清空工具栏）。
   *  按「格式 + 可访问名称」签名幂等重建：集合/文案（locale 切换）未变时复用现有按钮，
   *  不打断键盘焦点。 */
  private renderToolbar(): void {
    const holder = this.shadow.querySelector('.table-toolbar')
    if (!holder) return
    const entries = (this.hasAttr('exportable') ? this.exportFormats() : []).map((format) => ({
      format,
      label: tableText(
        this,
        format === 'excel' ? 'table.exportExcel' : 'table.exportCsv',
        format === 'excel' ? 'Export Excel' : 'Export CSV',
      ),
    }))
    const signature = entries.map((e) => `${e.format}:${e.label}`).join(',')
    if (holder.getAttribute('data-formats') === signature) return
    holder.replaceChildren()
    holder.setAttribute('data-formats', signature)
    for (const { format, label } of entries) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `export-btn export-${format}`
      btn.setAttribute('part', `export-${format}`)
      btn.setAttribute('data-format', format)
      btn.setAttribute('aria-label', label)
      btn.innerHTML = `${EXPORT_ICON}<span>${format === 'excel' ? 'Excel' : 'CSV'}</span>`
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.exportData(format)
      })
      holder.appendChild(btn)
    }
  }

  // ==================== D15 行拖拽排序（row-draggable） ====================

  /** 行拖拽是否生效（虚拟滚动下禁用：窗口行序无稳定 from/to 语义） */
  private rowDragEnabled(): boolean {
    return this.hasAttr('row-draggable') && !this.isVirtual()
  }

  /** 拖拽手柄：draggable 的抓手元素（仅手柄发起拖拽，避免与文本选择/行点击抢手势） */
  private buildDragHandle(): HTMLElement {
    const handle = document.createElement('span')
    handle.className = 'row-drag-handle'
    handle.setAttribute('part', 'drag-handle')
    handle.setAttribute('role', 'button')
    handle.setAttribute('tabindex', '-1')
    handle.setAttribute('draggable', 'true')
    handle.setAttribute('aria-label', tableText(this, 'table.rowDragHandle', 'Drag to reorder'))
    handle.innerHTML = DRAG_HANDLE_ICON
    return handle
  }

  /** 拖拽手柄列的表头单元格（占位，含固定列 sticky 偏移） */
  private buildDragTh(layout: { offsets: Map<string, ColumnOffset>; hasFixed: boolean }, rowSpan: number): HTMLElement {
    const th = document.createElement('th')
    th.className = 'row-drag-cell'
    th.setAttribute('part', 'drag-header')
    th.style.width = `${DRAG_CELL_WIDTH}px`
    th.rowSpan = rowSpan
    if (layout.hasFixed) {
      th.setAttribute('data-fixed', 'left')
      th.style.left = '0px'
    }
    return th
  }

  /** 当前渲染的数据行（tr.row），按展示顺序 */
  private dragRows(): HTMLTableRowElement[] {
    const body = this.shadow.querySelector('tbody')
    return body ? ([...body.querySelectorAll('tr.row')] as HTMLTableRowElement[]) : []
  }

  /** 找到行对象（按 row-key；与 buildRow 的 key 计算一致，含树形子行） */
  private findDataRowByKey(key: string): Record<string, unknown> | null {
    const rowKey = this.getAttr('row-key', 'key')
    const walk = (nodes: Array<Record<string, unknown>>): Record<string, unknown> | null => {
      for (const row of nodes) {
        if (String(row[rowKey] ?? JSON.stringify(row)) === key) return row
        const children = row.children
        if (Array.isArray(children)) {
          const hit = walk(children as Array<Record<string, unknown>>)
          if (hit) return hit
        }
      }
      return null
    }
    return walk(this._data)
  }

  private handleRowDragStart = (e: DragEvent): void => {
    if (!this.rowDragEnabled()) return
    const target = e.target as HTMLElement | null
    const handle = target?.closest?.('.row-drag-handle') as HTMLElement | null
    // 仅手柄发起拖拽：其它区域（文本选择/行点击）不进入拖拽
    if (!handle) return
    const tr = handle.closest('tr')
    this.dragRowKey = tr?.getAttribute('data-key') ?? ''
    this.dragDrop = null
    tr?.classList.add('drag-source')
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', this.dragRowKey)
    }
  }

  private handleRowDragOver = (e: DragEvent): void => {
    if (!this.dragRowKey) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    const target = e.target as HTMLElement | null
    const tr = target?.closest?.('tr.row') as HTMLTableRowElement | null
    if (!tr || tr.getAttribute('data-key') === this.dragRowKey) {
      this.clearDropMarks()
      this.dragDrop = null
      return
    }
    const rect = tr.getBoundingClientRect()
    const pos: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
    this.setDropMark(tr, pos)
  }

  private handleRowDragLeave = (e: DragEvent): void => {
    if (!this.dragRowKey) return
    const tr = (e.target as HTMLElement | null)?.closest?.('tr.row')
    if (tr) tr.classList.remove('drop-before', 'drop-after')
  }

  private handleRowDrop = (e: DragEvent): void => {
    if (!this.dragRowKey) return
    e.preventDefault()
    const fromKey = this.dragRowKey
    const drop = this.dragDrop
    this.clearDropMarks()
    this.dragRowKey = ''
    this.dragDrop = null
    if (!drop) return
    const keys = this.dragRows().map((tr) => tr.getAttribute('data-key') ?? '')
    const from = keys.indexOf(fromKey)
    const target = keys.indexOf(drop.key)
    if (from < 0 || target < 0 || from === target) return
    // to = 拖拽行在「移除后数组」中的插入位：宿主 `const [m]=arr.splice(from,1); arr.splice(to,0,m)` 即可复现
    const rest = keys.filter((_, i) => i !== from)
    const restTarget = rest.indexOf(drop.key)
    const to = drop.pos === 'before' ? restTarget : restTarget + 1
    const row = this.findDataRowByKey(fromKey) ?? {}
    this.emit('row-reorder', { from, to, row })
  }

  private handleRowDragEnd = (): void => {
    this.clearDropMarks()
    this.dragRowKey = ''
    this.dragDrop = null
  }

  private setDropMark(tr: HTMLTableRowElement, pos: 'before' | 'after'): void {
    this.clearDropMarks()
    this.dragDrop = { key: tr.getAttribute('data-key') ?? '', pos }
    tr.classList.add(pos === 'before' ? 'drop-before' : 'drop-after')
  }

  private clearDropMarks(): void {
    const body = this.shadow.querySelector('tbody')
    if (!body) return
    for (const tr of body.querySelectorAll('tr')) tr.classList.remove('drop-before', 'drop-after', 'drag-source')
  }

  /** 键盘重排（网格导航内的 Alt+↑/↓，无鼠标路径的行排序）：派发同契约 oas-row-reorder */
  private handleGridReorder(up: boolean): void {
    const rows = this.dragRows()
    const active = this.shadow.activeElement as HTMLElement | null
    const tr = active?.closest?.('tr.row') as HTMLTableRowElement | null
    const index = tr ? rows.indexOf(tr) : -1
    if (tr === null || index < 0) return
    const key = tr.getAttribute('data-key') ?? ''
    const to = up ? index - 1 : index + 1
    if (to < 0 || to >= rows.length) return
    const row = this.findDataRowByKey(key) ?? {}
    this.emit('row-reorder', { from: index, to, row })
  }

  // ==================== D9 网格导航（grid-navigation） ====================

  /**
   * 网格语义与 Tab 序管理：
   * - table → role=grid、th → columnheader、行 → row、td → gridcell；
   * - 单停靠点：滚动容器保持 tabindex=0，单元格与行内交互控件收归 tabindex=-1
   *   （方向键漫游 + Enter/Space 激活；editable 单元格自身的 tabindex=0 在此收归）；
   * - 关闭时清空角色/tabindex（重渲染重建 DOM，天然无残留）。
   */
  private applyGridSemantics(): void {
    const table = this.shadow.querySelector('table') as HTMLTableElement | null
    if (!table) return
    if (!this.hasAttr('grid-navigation')) {
      table.removeAttribute('role')
      if (this.gridPos !== null) this.gridPos = null
      return
    }
    table.setAttribute('role', 'grid')
    for (const th of this.shadow.querySelectorAll('thead th')) th.setAttribute('role', 'columnheader')
    for (const tr of this.shadow.querySelectorAll('tbody tr.row')) tr.setAttribute('role', 'row')
    for (const td of this.shadow.querySelectorAll<HTMLTableCellElement>('tbody tr.row td')) {
      td.setAttribute('role', 'gridcell')
      td.tabIndex = -1
      // 行内交互控件收归 -1（沿用网格单停靠点惯例）：方向键移动单元格焦点，Enter/Space 激活控件
      for (const el of td.querySelectorAll<HTMLElement>('button, a, input, select, textarea, [tabindex]')) {
        el.tabIndex = -1
      }
    }
  }

  /** 可导航单元格矩阵：当前渲染的数据行 × 该行 td 列表 */
  private gridMatrix(): HTMLTableCellElement[][] {
    return this.dragRows().map((tr) => [...tr.querySelectorAll<HTMLTableCellElement>('td')])
  }

  private gridCellAt(row: number, col: number): HTMLTableCellElement | null {
    const matrix = this.gridMatrix()
    if (row < 0 || row >= matrix.length) return null
    const cells = matrix[row]!
    if (cells.length === 0) return null
    return cells[Math.max(0, Math.min(col, cells.length - 1))] ?? null
  }

  /** 网格键盘导航：方向键漫游 / Home-End / PageUp-Down / Enter·Space 激活 / Alt+↑↓ 行重排 */
  private handleGridKeydown = (e: KeyboardEvent): void => {
    if (!this.hasAttr('grid-navigation')) return
    const target = e.target as HTMLElement | null
    const key = e.key
    const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']
    const activate = key === 'Enter' || key === ' ' || key === 'Spacebar'
    if (!navKeys.includes(key) && !activate) return
    // 编辑态/嵌入控件让位：方向键交给输入框、按钮、链接等自管
    if (target && target.closest('input, select, textarea, button, a')) return
    // 嵌入的自定义交互组件（oas-input 等）焦点会以宿主元素出现在 shadow.activeElement：
    // 聚焦元素既非网格容器也非单元格时一律让位（td 的 role=gridcell 会命中 [role] 排除清单，
    // 故此处用「实际聚焦元素」判定而非 selector 排除清单）
    const focused = this.shadow.activeElement as HTMLElement | null
    if (focused && focused !== this.wrap && focused.tagName !== 'TD') return
    if (e.altKey && !e.ctrlKey && !e.metaKey && (key === 'ArrowUp' || key === 'ArrowDown')) {
      if (this.rowDragEnabled()) {
        e.preventDefault()
        this.handleGridReorder(key === 'ArrowUp')
      }
      return
    }
    if (e.altKey || e.metaKey) return
    const matrix = this.gridMatrix()
    if (matrix.length === 0) return
    // 当前单元格：焦点在行内 td 上用之；焦点在容器（Tab 进入）时从上次/首格进入
    let cur: { row: number; col: number } | null = null
    const active = this.shadow.activeElement as HTMLElement | null
    const curTd = active?.closest?.('td') as HTMLTableCellElement | null
    if (curTd) {
      const tr = curTd.closest('tr')!
      const rows = this.dragRows()
      const row = rows.indexOf(tr as HTMLTableRowElement)
      const col = [...tr.querySelectorAll('td')].indexOf(curTd)
      if (row >= 0 && col >= 0) cur = { row, col }
    }
    const start = cur ?? {
      row: this.gridPos ? Math.min(this.gridPos.row, matrix.length - 1) : 0,
      col: this.gridPos?.col ?? 0,
    }

    if (activate) {
      if (!cur) {
        e.preventDefault()
        this.focusGridCell(start.row, start.col)
        return
      }
      const td = this.gridCellAt(cur.row, cur.col)
      // 只激活非编辑器控件（编辑器的 Enter 由编辑能力接管，避免重复处理撑开编辑态）
      const control = td?.querySelector<HTMLElement>(
        'button, a[href], input:not(.cell-editor), select:not(.cell-editor)',
      )
      if (control) {
        e.preventDefault()
        control.click()
        // 控件点击可能触发多次同步重渲染（setAttribute + 显式 runUpdateAndNotify）：点击后按坐标
        // 重查活节点并归还单元格焦点，保证「激活后仍停在原格」（展开/勾选后键盘可继续漫游）
        const fresh = this.gridCellAt(cur.row, cur.col)
        if (fresh) {
          fresh.focus()
          this.gridPos = cur
          this.scrollCellIntoView(fresh)
        }
      }
      return
    }

    // 焦点在容器（Tab 进入）而非单元格：首击只把焦点落到入口单元格，不移动
    if (!cur) {
      e.preventDefault()
      this.focusGridCell(start.row, start.col)
      return
    }

    const next = this.resolveGridMove(key, cur, matrix, e.ctrlKey)
    if (!next) return
    e.preventDefault()
    this.focusGridCell(next.row, next.col)
  }

  /** 计算方向键目标坐标（含行内/跨行换行、Home/End、PageUp/Down、Ctrl+Home/End） */
  private resolveGridMove(
    key: string,
    cur: { row: number; col: number },
    matrix: HTMLTableCellElement[][],
    ctrl: boolean,
  ): { row: number; col: number } | null {
    const lastRow = matrix.length - 1
    const rowLen = (r: number): number => matrix[r]?.length ?? 0
    switch (key) {
      case 'ArrowRight': {
        if (cur.col < rowLen(cur.row) - 1) return { row: cur.row, col: cur.col + 1 }
        if (cur.row < lastRow) return { row: cur.row + 1, col: 0 }
        return null
      }
      case 'ArrowLeft': {
        if (cur.col > 0) return { row: cur.row, col: cur.col - 1 }
        if (cur.row > 0) return { row: cur.row - 1, col: Math.max(0, rowLen(cur.row - 1) - 1) }
        return null
      }
      case 'ArrowDown':
        return cur.row < lastRow ? { row: cur.row + 1, col: Math.min(cur.col, rowLen(cur.row + 1) - 1) } : null
      case 'ArrowUp':
        return cur.row > 0 ? { row: cur.row - 1, col: Math.min(cur.col, rowLen(cur.row - 1) - 1) } : null
      case 'Home':
        return ctrl ? { row: 0, col: 0 } : { row: cur.row, col: 0 }
      case 'End':
        return ctrl
          ? { row: lastRow, col: Math.max(0, rowLen(lastRow) - 1) }
          : { row: cur.row, col: Math.max(0, rowLen(cur.row) - 1) }
      case 'PageDown':
        return { row: Math.min(lastRow, cur.row + this.gridPageStep()), col: cur.col }
      case 'PageUp':
        return { row: Math.max(0, cur.row - this.gridPageStep()), col: cur.col }
      default:
        return null
    }
  }

  /** PageUp/Down 步进：分页时为一页行数；否则为可视区行数（虚拟 height / 实时容器高） */
  private gridPageStep(): number {
    if (this.hasAttr('pagination')) return Math.max(1, Number(this.getAttr('page-size', '10')) || 10)
    const viewport = this.wrap?.clientHeight || (this.isVirtual() ? this.tableHeight() : 0)
    if (viewport <= 0) return 1
    return Math.max(1, Math.floor(viewport / this.rowHeight()))
  }

  /** 聚焦网格单元格：直接 focus + 滚入视口 + 记忆坐标（Tab 再次进入续用） */
  private focusGridCell(row: number, col: number): void {
    const td = this.gridCellAt(row, col)
    if (!td) return
    td.focus()
    this.gridPos = { row, col }
    this.scrollCellIntoView(td)
  }

  private scrollCellIntoView(td: HTMLTableCellElement): void {
    if (typeof td.scrollIntoView === 'function') {
      try {
        td.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      } catch {
        /* 老环境不支持参数对象：忽略（焦点仍已移动） */
      }
    }
  }

  // ==================== 工具栏等公共辅助 ====================

  private isVirtual(): boolean {
    return this.getAttr('height', '') !== ''
  }

  /** column-virtual 声明生效判定：属性在场 + 无不兼容形态（多级表头 / span-method / 固定列布局不符 → 告警一次并降级为普通渲染） */
  private columnVirtualOn(): boolean {
    if (!this.hasAttr('column-virtual')) return false
    if (this.headerDepth() > 1) {
      this.warnColVirtualOnce(
        'multi-header',
        '多级表头与 column-virtual 不兼容：已降级为普通渲染（column-virtual 已忽略）',
      )
      return false
    }
    if (this._spanMethod) {
      this.warnColVirtualOnce(
        'span-method',
        'span-method 与 column-virtual 不兼容（列窗口会破坏跨列合并）：已降级为普通渲染',
      )
      return false
    }
    return true
  }

  private warnColVirtualOnce(kind: string, message: string): void {
    if (this.colVirtualWarned.has(kind)) return
    this.colVirtualWarned.add(kind)
    console.warn(`[oas-table] ${message}`)
  }

  /**
   * 叶子列三段分组（column-virtual 的布局约定）：[fixed=left 段] [非固定段（列窗口作用域）] [fixed=right 段]。
   * 顺序不符（left 出现在 middle/right 之后、right 出现在 left/middle 之前等穿插布局）返回 null → 告警降级。
   */
  private splitColSegments(
    cols: TableColumn[],
  ): { left: TableColumn[]; middle: TableColumn[]; right: TableColumn[] } | null {
    const left: TableColumn[] = []
    const middle: TableColumn[] = []
    const right: TableColumn[] = []
    let phase = 0 // 0=left 1=middle 2=right
    for (const c of cols) {
      if (c.fixed === 'left') {
        if (phase >= 1) return null
        left.push(c)
      } else if (c.fixed === 'right') {
        phase = 2
        right.push(c)
      } else {
        if (phase === 2) return null
        phase = Math.max(phase, 1)
        middle.push(c)
      }
    }
    return { left, middle, right }
  }

  /** 列宽像素解析：width 形如 "120" / "120px" → 数值；缺省/非法 → 预估 120（横向虚拟建议全列显式 width） */
  private colWidthPx(col: TableColumn): number {
    const raw = String(col.width ?? '').trim()
    const n = Number.parseFloat(raw)
    return Number.isFinite(n) && n > 0 ? n : 120
  }

  /**
   * column-virtual 列窗口同步：scrollLeft / 视口宽 / 列宽变化时重算 middle 段窗口；
   * 窗口变化时触发整表重渲染（行虚拟窗口在重渲染中保留）。rAF 由 scroll handler 节流。
   */
  private syncColumnWindow(segments: { left: TableColumn[]; middle: TableColumn[]; right: TableColumn[] }): boolean {
    const w = this.wrap
    if (!w) return false
    const n = segments.middle.length
    if (!this.colWidthCache || this.colWidthCache.length !== n) {
      this.colWidthCache = new HeightCache()
      this.colWidthCache.configure(n, 120)
      for (let i = 0; i < n; i++) this.colWidthCache.measure(i, this.colWidthPx(segments.middle[i]!))
    }
    const prefix: number[] = [0]
    for (let i = 0; i < n; i++) prefix.push((prefix[i] ?? 0) + this.colWidthCache.heightAt(i))
    const win = computeDynamicWindow(prefix, n, w.scrollLeft, w.clientWidth, 2)
    if (win.start === this.colWin.start && win.end === this.colWin.end) return false
    this.colWin = win
    return true
  }

  /**
   * column-virtual 渲染序列：[前置列（drag/check，由 buildRow 既有逻辑处理）]
   * [left 固定段] [左占位] [middle 窗口列] [右占位] [right 固定段] [后置列（expand）]。
   * 占位以 colSpan 归并窗口外列（宽度由 colgroup 对应列求和，table fixed 布局原生支持）。
   */
  private columnWindowLayout(cols: TableColumn[]): {
    leftPlaceholder: number
    rendered: TableColumn[]
    rightPlaceholder: number
  } {
    const segments = this.splitColSegments(cols)
    if (!segments) return { leftPlaceholder: 0, rendered: cols, rightPlaceholder: 0 }
    const { left, middle, right } = segments
    const leftN = left.length
    const win = this.colWin
    const start = Math.min(Math.max(0, win.start), middle.length)
    const end = Math.min(Math.max(start, win.end), middle.length)
    return {
      leftPlaceholder: start,
      rendered: middle.slice(start, end),
      rightPlaceholder: middle.length - end,
    }
  }

  /**
   * column-virtual 行/表头的单元格序列：[left 固定段] [左占位 colSpan] [middle 窗口列] [右占位 colSpan] [right 固定段]。
   * 非 column-virtual（_colSegments 为 null）返回全列 span=1（与旧版渲染完全等价）。
   * 占位项 col=null（渲染为无内容 td/th，colSpan 归并窗口外列；宽度由 colgroup 对应列求和）。
   */
  private columnWindowSequence(): Array<{ span: number; col: TableColumn | null }> {
    const segs = this._colSegments
    if (!segs) return this.effectiveColumns().map((col) => ({ span: 1, col }))
    const seq: Array<{ span: number; col: TableColumn | null }> = segs.left.map((col) => ({ span: 1, col }))
    const start = Math.min(Math.max(0, this.colWin.start), segs.middle.length)
    const end = Math.min(Math.max(start, this.colWin.end), segs.middle.length)
    if (start > 0) seq.push({ span: start, col: null })
    for (const col of segs.middle.slice(start, end)) seq.push({ span: 1, col })
    const rightN = segs.middle.length - end
    if (rightN > 0) seq.push({ span: rightN, col: null })
    seq.push(...segs.right.map((col) => ({ span: 1, col })))
    return seq
  }

  private tableHeight(): number {
    return Number(this.getAttr('height', '320')) || 320
  }

  private rowHeight(): number {
    return Number(this.getAttr('row-height', '40')) || 40
  }

  private sortBy(key: string, multi: boolean): void {
    // 普通点击：整表重置为仅该列排序（asc→desc→清空）；shift 点击：多列累积/切换/移除该列
    const sorts = multi ? this.resolveSorts() : []
    const idx = sorts.findIndex((s) => s.key === key)
    if (!multi) {
      const existed = this.resolveSorts().find((s) => s.key === key)
      const nextOrder = !existed ? 'asc' : existed.order === 'asc' ? 'desc' : ''
      this.applySorts(nextOrder ? [{ key, order: nextOrder }] : [])
      this.emit('sort-change', { key, order: nextOrder })
      return
    }
    // 多列：点击已排序列 → 切换 asc↔desc 或移除；点击未排序列 → 追加到队尾（asc）
    if (idx >= 0) {
      const cur = sorts[idx]!
      if (cur.order === 'asc') sorts.splice(idx, 1, { key, order: 'desc' })
      else if (cur.order === 'desc') sorts.splice(idx, 1)
      else sorts.splice(idx, 1, { key, order: 'asc' })
    } else {
      sorts.push({ key, order: 'asc' })
    }
    this.applySorts(sorts)
    this.emit('sort-change', { key, order: sorts.find((s) => s.key === key)?.order ?? '' })
  }

  /** 统一写回排序状态：多列写 multi-sort，单列保留 sort-key/sort-order（向后兼容） */
  private applySorts(sorts: SortState[]): void {
    const active = sorts.filter((s) => s && s.order)
    if (active.length >= 2) {
      this.setAttribute('multi-sort', JSON.stringify(active.map((s) => ({ key: s.key, order: s.order }))))
      this.removeAttribute('sort-key')
      this.removeAttribute('sort-order')
    } else if (active.length === 1) {
      const only = active[0]!
      this.removeAttribute('multi-sort')
      this.setAttribute('sort-key', only.key)
      this.setAttribute('sort-order', only.order!)
    } else {
      this.removeAttribute('multi-sort')
      this.removeAttribute('sort-key')
      this.removeAttribute('sort-order')
    }
  }

  private handleScroll = (): void => {
    if (this.ignoreNextScroll) {
      this.ignoreNextScroll = false
      return
    }
    // 横向虚拟（column-virtual）：非行虚拟时也要按 scrollLeft 重算列窗口
    const colVirtualOnly = this.columnVirtualOn() && !this.isVirtual()
    if (colVirtualOnly && this.wrap) {
      if (this.scrollRaf) return
      this.scrollRaf = requestAnimationFrame(() => {
        this.scrollRaf = 0
        const segs = this._colSegments
        if (!segs) return
        if (this.syncColumnWindow(segs)) this.update()
      })
      return
    }
    if (!this.isVirtual() || !this.wrap) return
    if (this.scrollRaf) return
    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = 0
      const body = this.shadow.querySelector('tbody')
      const head = this.shadow.querySelector('thead')
      if (!body || !head) return
      // 双开（行虚拟 × column-virtual）：横向滚动同步列窗口（纵向滚动不改变列窗口，重算幂等）
      if (this._colSegments) this.syncColumnWindow(this._colSegments)
      const st = this.wrap!.scrollTop
      const rowKey = this.getAttr('row-key', 'key')
      const selected = this.getAttr('selected', '').split(',').filter(Boolean)
      const expanded = new Set(this.getAttr('expanded', '').split(',').filter(Boolean))
      const flat = this.buildFlat(this.resolveSorts(), rowKey)
      const display = this.visibleFlat(flat, expanded, rowKey)
      // 滚动窗口重渲染前静默取消进行中的编辑（委托 edit 能力）
      this.editCap?.settleEdit()
      body.innerHTML = ''
      this.renderVirtualBody(body, display, rowKey, selected, expanded, this.computeLayout(), st)
      this.applyGridSemantics()
      this.applyStickyRows()
      // 清空曾把 scrollTop 钳回 0，内容铺满后恢复（窗口按 st 算，视觉不跳）
      if (this.wrap!.scrollTop !== st) {
        this.ignoreNextScroll = true
        this.wrap!.scrollTop = st
      }
      const win = computeVirtualWindow(st, this.tableHeight(), this.rowHeight(), display.length)
      this.emit('scroll', { scrollTop: st, start: win.start, end: win.end })
    })
  }

  // ==================== 单元格展示辅助（core 渲染；编辑能力退出时也经 paintCell 复用 cellNode） ====================

  /** 单元格展示文本（select 列按选项 label 展示；render 函数优先） */
  private cellText(col: TableColumn, row: Record<string, unknown>): string {
    if (col.actions) return ''
    const raw = row[col.key]
    if (col.editor === 'select' && Array.isArray(col.editOptions) && col.editOptions.length > 0) {
      const opt = col.editOptions.find((o) => String(o.value) === String(raw ?? ''))
      if (opt) return opt.label
    }
    if (col.render) {
      // summary/合计等文本路径：render 可能返回 Node/元素（cellNode 用之），此处只取字符串或回退原文
      const rendered = col.render(row)
      return typeof rendered === 'string' ? rendered : String(raw ?? '')
    }
    return String(raw ?? '')
  }

  /** 单元格渲染：render 返回 Node/元素则直接挂载（富内容），否则文本节点 */
  private cellNode(col: TableColumn, row: Record<string, unknown>): Node | null {
    if (col.actions) return null
    const raw = row[col.key]
    // select 编辑器：非编辑态展示 label（editOptions 映射），与 cellText 一致
    if (col.editor === 'select' && Array.isArray(col.editOptions) && col.editOptions.length > 0) {
      const opt = col.editOptions.find((o) => String(o.value) === String(raw ?? ''))
      return document.createTextNode(opt ? opt.label : String(raw ?? ''))
    }
    if (col.render) {
      const rendered = col.render(row)
      return rendered == null
        ? document.createTextNode(String(raw ?? ''))
        : typeof rendered === 'string'
          ? document.createTextNode(rendered)
          : rendered
    }
    if (col.cellTemplate) {
      return hydrateRowTemplate(col.cellTemplate, row)
    }
    return document.createTextNode(String(raw ?? ''))
  }

  /** 编辑能力未注入但检测到编辑相关配置时 dev 告警（同值去重，提示纯核消费者显式 import 编辑能力包或换回主路径） */
  private warnEditCapability(): void {
    if (this.editCap) return
    const needsEdit =
      this.hasAttr('editable') ||
      this.hasAttr('edit-controlled') ||
      this.flattenLeaves(this._columns).some((c) => c.editable || c.actions)
    if (needsEdit) warnEditNotImported()
  }

  // ==================== 吸顶行 ====================

  private stickyRowCount(): number {
    const n = Number(this.getAttr('sticky-rows', ''))
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  }

  /**
   * 为前 N 行写入 data-sticky 与逐行 top 偏移。
   * top 基准 = 表头高度（表头本身已 sticky top:0），逐行累加行高；
   * happy-dom 无排版测量（offsetHeight 为 0），真实偏移由浏览器排版决定。
   */
  private applyStickyRows(): void {
    const count = this.stickyRowCount()
    if (count === 0) return
    const body = this.shadow.querySelector('tbody')
    const thead = this.shadow.querySelector('thead')
    if (!body || !thead) return
    let top = thead.offsetHeight
    let remaining = count
    for (const tr of body.querySelectorAll('tr')) {
      if (remaining <= 0) break
      if (!tr.classList.contains('row') && !tr.classList.contains('expand-row')) continue
      tr.setAttribute('data-sticky', 'true')
      const h = tr.offsetHeight
      for (const td of tr.querySelectorAll('td')) td.style.top = `${top}px`
      top += h
      remaining--
    }
  }

  /** 列来源解析：columns attribute（显式声明）优先；未声明时回落 <oas-table-column> 子元素声明式通道 */
  private resolveColumns(): TableColumn[] {
    const raw = this.getAttr('columns', '')
    if (raw) {
      try {
        const cols = JSON.parse(raw)
        return Array.isArray(cols) ? cols.filter((c) => c && typeof c.key === 'string') : []
      } catch {
        return []
      }
    }
    return this.parseChildColumns()
  }

  /** 解析 light DOM 的 <oas-table-column> 数据载体为 TableColumn[]（递归嵌套子列 → children/多级表头） */
  private parseChildColumns(): TableColumn[] {
    const cols: TableColumn[] = []
    for (const child of Array.from(this.children)) {
      if (child.tagName === 'OAS-TABLE-COLUMN') cols.push(this.childToColumn(child))
    }
    return cols
  }

  /** 单个 <oas-table-column> → TableColumn（属性对齐字段，默认插槽文本为 title 兜底，嵌套子列递归） */
  private childToColumn(el: Element): TableColumn {
    // key 双通道：`key` 直读 + `data-key` 兜底——`key` 是 Vue 模板保留字（vnode key），
    // 在 Vue 宿主（含文档站）里会被剥离不到 DOM，声明式通道在 Vue 下必须用 data-key
    const col: TableColumn = {
      key: el.getAttribute('key') ?? el.getAttribute('data-key') ?? '',
      title: this.childColumnTitle(el),
    }
    if (el.hasAttribute('sortable')) col.sortable = true
    if (el.hasAttribute('hidden')) col.hidden = true
    if (el.hasAttribute('filterable')) col.filterable = true
    if (el.hasAttribute('merge')) col.merge = true
    if (el.hasAttribute('editable')) col.editable = true
    if (el.hasAttribute('actions')) col.actions = true
    if (el.hasAttribute('serial-number')) col.serialNumber = true
    if (el.hasAttribute('ellipsis')) col.ellipsis = true
    const width = el.getAttribute('width')
    if (width) col.width = width
    const align = el.getAttribute('align')
    if (align) col.align = align as TableColumn['align']
    const fixed = el.getAttribute('fixed')
    if (fixed) col.fixed = fixed as TableColumn['fixed']
    const editor = el.getAttribute('editor')
    if (editor) col.editor = editor as TableColumn['editor']
    const summary = el.getAttribute('summary')
    if (summary) col.summary = summary as TableColumn['summary']
    const filters = el.getAttribute('filters')
    if (filters) {
      try {
        const parsed = JSON.parse(filters)
        if (Array.isArray(parsed)) col.filters = parsed
      } catch {
        /* 非法 filters 忽略 */
      }
    }
    const kids: TableColumn[] = []
    for (const c of Array.from(el.children)) {
      if (c.tagName === 'OAS-TABLE-COLUMN') kids.push(this.childToColumn(c))
    }
    if (kids.length > 0) col.children = kids
    // 单元格模板（cellTemplate）：普通 <template>（无 data-role="header"）
    const cellTpl = el.querySelector<HTMLTemplateElement>('template:not([data-role="header"])')
    if (cellTpl) col.cellTemplate = cellTpl
    // 自定义列头模板（headerTemplate）：<template data-role="header">
    const headerTpl = el.querySelector<HTMLTemplateElement>('template[data-role="header"]')
    if (headerTpl) col.headerTemplate = headerTpl
    return col
  }

  /** 列标题：title 属性优先，否则默认插槽文本（trim） */
  private childColumnTitle(el: Element): string {
    const title = el.getAttribute('title')
    if (title) return title
    let text = ''
    for (const node of el.childNodes) text += node.textContent ?? ''
    return text.trim()
  }

  /** 子元素声明式通道观察器：light DOM <oas-table-column> 增删/属性/文本变化 → 重解析列 */
  private ensureChildColumnsObserver(): void {
    if (this.childColumnsObserver) return
    const observer = new MutationObserver(() => this.runUpdateAndNotify())
    observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: [
        'key',
        'data-key',
        'title',
        'sortable',
        'width',
        'align',
        'fixed',
        'hidden',
        'serial-number',
        'ellipsis',
        'merge',
        'filterable',
        'filters',
        'summary',
        'editable',
        'editor',
        'actions',
        'slot',
        'data-role',
      ],
    })
    this.childColumnsObserver = observer
    this.onCleanup(() => {
      observer.disconnect()
      this.childColumnsObserver = null
    })
  }

  private parse(): void {
    // 列定义经 property 赋值且含函数时，内存 `_columns` 已是权威（attribute JSON 无函数），跳过重解析
    if (!this._columnsFromProperty) {
      this._columns = this.resolveColumns()
    }
    try {
      const keys = JSON.parse(this.getAttr('column-keys', '[]'))
      this._columnKeys = Array.isArray(keys) ? keys.filter((k) => typeof k === 'string') : []
    } catch {
      this._columnKeys = []
    }
    try {
      const rows = JSON.parse(this.getAttr('data', '[]'))
      this._data = Array.isArray(rows) ? rows.filter((r) => r && typeof r === 'object') : []
    } catch {
      this._data = []
    }
    // 任一（含嵌套 children）数据行存在非空 expand 字段 → 展示行尾展开列
    this._expandable = this._data.some((r) => rowHasExpand(r))
  }
}

/** 解析列宽（px 数字）；固定列未声明宽度时按 100px 兜底 */
function columnWidth(col: TableColumn): number {
  if (col.width) {
    const n = parseFloat(col.width)
    if (Number.isFinite(n)) return n
  }
  return 100
}

/** 归一化 span-method 返回值：[r, c] 元组或 {rowspan, colspan} 对象。
    非法分量（NaN/缺省）按 1 处理；rowspan/colspan 为 0 保留给「本格被覆盖不渲染」语义 */
function normalizeSpan(v: [number, number] | { rowspan: number; colspan: number } | void): {
  rowspan: number
  colspan: number
} {
  const num = (x: unknown): number => {
    const n = Number(x)
    return Number.isFinite(n) ? n : 1
  }
  if (Array.isArray(v)) return { rowspan: num(v[0]), colspan: num(v[1]) }
  if (v && typeof v === 'object') return { rowspan: num(v.rowspan), colspan: num(v.colspan) }
  return { rowspan: 1, colspan: 1 }
}

/**
 * 克隆 `<template>` 内容并用当前行数据水合：把文本节点与元素属性里的 `{{row.字段}}`
 * 替换为该行对应值（缺省空串）。返回值是水合后的 DocumentFragment（可 appendChild 进 td）。
 */
function hydrateRowTemplate(template: HTMLTemplateElement, row: Record<string, unknown>): DocumentFragment {
  const frag = template.content.cloneNode(true) as DocumentFragment
  const bind = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ''
      node.textContent = text.replace(/\{\{\s*row\.(\w+)\s*\}\}/g, (_, k: string) => String(row[k] ?? ''))
      return
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      for (const attr of [...el.attributes]) {
        el.setAttribute(
          attr.name,
          attr.value.replace(/\{\{\s*row\.(\w+)\s*\}\}/g, (_, k: string) => String(row[k] ?? '')),
        )
      }
      for (const child of [...el.childNodes]) bind(child)
    }
  }
  for (const node of [...frag.childNodes]) bind(node)
  return frag
}

/** 行（含嵌套 children）是否存在非空 expand 内容 */
function rowHasExpand(row: Record<string, unknown>): boolean {
  if (typeof row.expand === 'string' && row.expand.length > 0) return true
  const children = row.children
  if (Array.isArray(children)) {
    return children.some((c) => c && typeof c === 'object' && rowHasExpand(c as Record<string, unknown>))
  }
  return false
}

/** 是否为合法合计类型 */
function isSummaryType(v: unknown): v is SummaryType {
  return v === 'sum' || v === 'avg' || v === 'count'
}

/** 扁平行：树形/可展开行统一渲染单位 */
interface FlatRow {
  row: Record<string, unknown>
  depth: number
  parent?: string
  kind: 'data' | 'expand'
  /** expand 类型行的自定义内容（来自 row.expand 字段） */
  expandContent?: string
}
