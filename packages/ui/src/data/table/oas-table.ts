import { OASElement } from '@oas-ui/core'
import { computeVirtualWindow } from '../virtual-list/oas-virtual-list.js'
import { editPath } from '@oas-ui/icons'

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
  /** 合并单元格：连续相同显示值的行在该列合并为一个 rowspan 单元格（非虚拟模式生效，虚拟滚动时忽略） */
  merge?: boolean
}

/** 行内编辑 select 选项 */
export interface EditOption {
  label: string
  value: string | number
}

export type SortOrder = '' | 'asc' | 'desc'

/** 参与排序的单个列状态（多列排序时按数组顺序决定优先级） */
export interface SortState {
  key: string
  order: Exclude<SortOrder, ''> | undefined
}

/** 密度档位：与控件 size 体系同词（small/medium/large），默认 medium */
export type TableSize = 'small' | 'medium' | 'large'

const VALID_TABLE_SIZES: readonly TableSize[] = ['small', 'medium', 'large']

const warnedSizes = new Set<string>()

/** 非法 size 归一化：回落 medium 并在 dev 下 console.warn 一次（同值去重，同控件惯例） */
function normalizeTableSize(raw: string): TableSize {
  if ((VALID_TABLE_SIZES as readonly string[]).includes(raw)) return raw as TableSize
  if (!warnedSizes.has(raw)) {
    warnedSizes.add(raw)
    console.warn(`[oas-table] 非法 size "${raw}"，已回落 medium；合法值：small/medium/large`)
  }
  return 'medium'
}

/** 合计类型：求和 / 平均 / 计数 */
export type SummaryType = 'sum' | 'avg' | 'count'

export interface SummaryConfig {
  key: string
  type: SummaryType
  /** 合计行首列展示的标签（不配置时用默认文案） */
  label?: string
}

/** 行内编辑进行中的单元格状态 */
interface EditState {
  /** 可见行索引（事件 rowIndex，排序/过滤后的展示顺序） */
  displayIndex: number
  /** 行唯一键 */
  key: string
  /** 列 key */
  colKey: string
  /** 行数据引用（非受控提交时回写） */
  row: Record<string, unknown>
  /** 编辑单元格 */
  td: HTMLTableCellElement
  /** 编辑前原值（字符串形态） */
  oldValue: string
  /** 编辑器类型 */
  editor: 'input' | 'select'
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
  text-align: left;
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
th.header-group + th.header-group {
  border-left: 1px solid var(--oas-color-border);
}
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
th[data-key] {
  position: relative;
}
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
  margin-left: var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.sort-index {
  display: inline-block;
  margin-left: var(--oas-space-1);
  font-size: var(--oas-font-size-2xs);
  color: var(--oas-color-primary);
  font-weight: var(--oas-font-weight-medium);
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
  background: var(--oas-color-primary-soft, rgba(24, 144, 255, 0.08));
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
tr.row:hover td {
  background: var(--oas-color-bg-hover);
}
tr.row:hover td[data-fixed='left'],
tr.row:hover td[data-fixed='right'] {
  background: var(--oas-color-bg-hover);
}
tr.row[data-selected='true'] td {
  background: var(--oas-color-primary-soft, rgba(24, 144, 255, 0.08));
}
/* 虚拟滚动：占位行与定高行 */
.table-scroll[data-virtual='true'] td {
  padding-top: 0;
  padding-bottom: 0;
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
  margin-right: var(--oas-space-2);
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
  background: var(--oas-color-primary-soft, rgba(24, 144, 255, 0.08));
}
tr[data-sticky='true'] td[data-fixed] {
  z-index: 4;
  background: var(--oas-color-bg);
}
tr[data-sticky='true'][data-stripe='odd'] td[data-fixed] {
  background: var(--oas-color-bg-hover);
}
tr[data-sticky='true'][data-selected='true'] td[data-fixed] {
  background: var(--oas-color-primary-soft, rgba(24, 144, 255, 0.08));
}
tr[data-sticky='true']:hover td {
  background: var(--oas-color-bg-hover);
}
/* 行内编辑：编辑态单元格与列高亮 */
td.editing {
  padding: 0;
}
td[data-editing='true'],
tr[data-sticky='true'] td[data-editing='true'] {
  background: var(--oas-color-primary-soft, rgba(24, 144, 255, 0.08));
}
td[data-invalid='true'] {
  background: var(--oas-color-danger-soft, rgba(220, 38, 38, 0.08));
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
  width: 100%;
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
.filter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
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
  box-shadow: var(--oas-shadow-md, 0 6px 16px rgba(0, 0, 0, 0.12));
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
  text-align: left;
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
  text-align: left;
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
`

const CHECK_CELL_WIDTH = 40
const EXPAND_CELL_WIDTH = 40
const FILTER_ICON = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h12M4.5 6.5h7M6.5 10h3"/></svg>'
const EDIT_ICON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${editPath}</svg>`

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
  /** 是否可展开行（任一数据行存在非空 expand 字段） */
  private _expandable = false
  /** 行内编辑：进行中的单元格（同一时刻至多一格在编辑） */
  private editState: EditState | null = null
  /** 合计缓存：scope=all 时全量 flat 的缓存（data/筛选/排序未变时复用，避免选中/翻页等非数据变化的重渲染重复全量 walk+sort） */
  private summaryFlatCache: { key: string; flat: FlatRow[] } | null = null
  /** 列过滤弹层：当前打开的面板元素与其列 key（同一时刻至多一个） */
  private filterPanel: HTMLElement | null = null
  private filterPanelKey: string | null = null

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
      this.update()
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
    this.update()
  }
  get data(): Array<Record<string, unknown>> {
    return this._data
  }
  set data(value: Array<Record<string, unknown>> | string) {
    this.setAttribute('data', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
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
      btn.innerHTML = FILTER_ICON
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.openFilterPanel(col, btn)
      })
      th.appendChild(btn)
    }
  }

  /** 全选表头单元格（checkable）；rowSpan>1 用于多级表头首行盖到底部 */
  private buildCheckAllTh(
    layout: { offsets: Map<string, ColumnOffset>; hasFixed: boolean },
    flat: FlatRow[],
    rowKey: string,
    selected: string[],
    rowSpan: number,
  ): HTMLElement {
    const th = document.createElement('th')
    th.className = 'check-cell'
    th.style.width = '40px'
    th.rowSpan = rowSpan
    if (layout.hasFixed) {
      th.setAttribute('data-fixed', 'left')
      th.style.left = '0px'
    }
    const selectAll = document.createElement('input')
    selectAll.type = 'checkbox'
    selectAll.setAttribute('aria-label', this.t('table.selectAll'))
    selectAll.checked =
      flat.length > 0 &&
      flat.every((f) => selected.includes(String(f.row[rowKey] ?? JSON.stringify(f.row))))
    selectAll.addEventListener('change', () => {
      const keys = flat.map((f) => String(f.row[rowKey] ?? JSON.stringify(f.row)))
      this.setAttribute('selected', selectAll.checked ? keys.join(',') : '')
      this.emit('check', { keys: selectAll.checked ? keys : [] })
      this.update()
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
    this.onCleanup(() => {
      this.wrap?.removeEventListener('scroll', this.handleScroll)
      if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf)
      this.scrollRaf = 0
      this.closeFilterPanel()
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（关键节点存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.table-scroll')) return false
    if (!this.shadow.querySelector('thead') || !this.shadow.querySelector('tbody')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // 外部重渲染（data/sort/selected 等变化）时先静默取消进行中的编辑，防止编辑 DOM 被整体重建静默销毁
    this.settleEdit()
    this.parse()
    // 密度档位归一化：仅触发非法值告警副作用；档位视觉纯 CSS（:host([size]) 选择器），
    // 非法值不匹配任何档位选择器 → 自然回落 medium 默认
    normalizeTableSize(this.getAttr('size', 'medium'))
    const head = this.shadow.querySelector('thead')
    const body = this.shadow.querySelector('tbody')
    if (!head || !body) return

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
    if (virtual) {
      this.wrap!.setAttribute('data-virtual', 'true')
      this.wrap!.style.maxHeight = `${this.tableHeight()}px`
    } else {
      this.wrap!.removeAttribute('data-virtual')
      this.wrap!.style.maxHeight = ''
    }

    const st = this.wrap ? this.wrap.scrollTop : 0
    head.innerHTML = ''
    body.innerHTML = ''
    this.renderPagination(paginationOn, total, pageSize, current)

    const checkable = this.hasAttr('checkable')
    if (this.headerDepth() > 1) {
      // 多级表头：按列树深渲染多行（组列 colspan 合并、叶子列 rowspan 盖到底部）
      const depth = this.headerDepth()
      for (let r = 0; r < depth; r++) {
        const row = document.createElement('tr')
        if (r === 0 && checkable) row.appendChild(this.buildCheckAllTh(layout, flat, rowKey, selected, depth))
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
    } else {
      // 扁平表头（单行，向后兼容）
      const tr = document.createElement('tr')
      if (checkable) tr.appendChild(this.buildCheckAllTh(layout, flat, rowKey, selected, 1))
      for (const col of this.effectiveColumns()) {
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
      return
    }

    if (display.length === 0) {
      const emptyTr = document.createElement('tr')
      const emptyTd = document.createElement('td')
      emptyTd.colSpan = this.columnCount()
      emptyTd.className = 'empty'
      emptyTd.textContent = this.getAttr('empty-text', this.t('table.empty'))
      emptyTr.appendChild(emptyTd)
      body.appendChild(emptyTr)
      return
    }

    if (virtual) {
      this.renderVirtualBody(body, display, rowKey, selected, expanded, layout, st)
    } else {
      const rowInfos: { tr: HTMLTableRowElement; kind: string }[] = []
      for (let i = 0; i < display.length; i++) {
        const f = display[i]!
        const tr =
          f.kind === 'expand'
            ? this.buildExpandRow(f)
            : this.buildRow(f, i, rowKey, selected, expanded, layout)
        rowInfos.push({ tr, kind: f.kind })
        body.appendChild(tr)
      }
      // 合并单元格：对 merge 列后处理连续相同值行（虚拟模式不合并）
      this.applyRowMerge(rowInfos)
    }

    if (summaryConfigs.length > 0 && summaryFlat.length > 0) {
      body.appendChild(this.buildSummaryRow(summaryConfigs, summaryFlat, layout))
    }
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
  private renderPagination(
    enabled: boolean,
    total: number,
    pageSize: number,
    current: number,
  ): void {
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

  /** 渲染一行数据（非虚拟模式逐行调用；虚拟模式仅窗口内行调用） */
  private buildRow(
    flat: FlatRow,
    index: number,
    rowKey: string,
    selected: string[],
    expanded: Set<string>,
    layout: { offsets: Map<string, ColumnOffset>; hasFixed: boolean },
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
    if (this.hasAttr('checkable')) {
      const td = document.createElement('td')
      td.className = 'check-cell'
      if (layout.hasFixed) {
        td.setAttribute('data-fixed', 'left')
        td.style.left = '0px'
      }
      const box = document.createElement('input')
      box.type = 'checkbox'
      box.setAttribute('aria-label', this.t('table.selectRow', { key }))
      box.checked = selected.includes(key)
      box.addEventListener('change', (e) => {
        e.stopPropagation()
        const next = new Set(selected)
        if (box.checked) next.add(key)
        else next.delete(key)
        this.setAttribute('selected', [...next].join(','))
        this.emit('check', { keys: [...next] })
        this.update()
      })
      td.appendChild(box)
      tr.appendChild(td)
    }
    tr.addEventListener('click', (e) => {
      if (this.hasAttr('checkable')) return
      // 交互控件（按钮/链接/表单控件/浮层等）内的点击不触发行选中+重渲染——
      // 否则点单元格内嵌 popconfirm 会触发 update() 全量重建 body，把刚打开的 popconfirm 销毁成默认关闭
      const el = e.target as HTMLElement | null
      if (el && el.closest('button, a, input, select, textarea, [role], oas-popconfirm')) return
      const next = new Set(selected)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      this.setAttribute('selected', [...next].join(','))
      this.emit('row-click', { row, key })
      this.update()
    })
    const children = row.children
    const hasChildren = Array.isArray(children) && children.length > 0
    const effCols = this.effectiveColumns()
    for (let i = 0; i < effCols.length; i++) {
      const col = effCols[i]!
      const td = document.createElement('td')
      this.applyColumnOffset(td, col, layout)
      if (col.align) td.className = `align-${col.align}`
      td.setAttribute('data-col', col.key)
      if (i === 0) {
        // 树形：按层级缩进
        if (hasChildren || flat.depth > 0) {
          td.style.paddingLeft = `${16 + flat.depth * 24}px`
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
        this.renderActionCell(td, tr)
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
      // 可编辑单元格：可聚焦，Enter/F2/双击进入编辑（仅响应单元格自身事件，
      // 编辑器内部按键/双击会冒泡到此，需排除避免提交后被重入编辑）
      if (this.editingEnabled(col)) {
        td.tabIndex = 0
        td.classList.add('editable-cell')
        // 可感知线索：title 提示进入方式 + 铅笔图标（hover/focus-visible 时显现）
        td.title = this.t('table.editHint')
        this.appendEditAffordance(td)
        td.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.target !== td) return
          if (e.key === 'Enter' || e.key === 'F2') {
            e.preventDefault()
            this.enterEdit(td)
          }
        })
        td.addEventListener('dblclick', (e: MouseEvent) => {
          if (e.target !== td) return
          this.enterEdit(td)
        })
      }
      tr.appendChild(td)
    }
    if (this._expandable) {
      // 可展开行：行尾展开/收起按钮
      const td = document.createElement('td')
      td.className = 'expand-toggle-cell'
      if (typeof row.expand === 'string' && row.expand.length > 0) {
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
    return tr
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
    tr.appendChild(td)
    return tr
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
    const win = computeVirtualWindow(
      scrollTop,
      this.tableHeight(),
      this.rowHeight(),
      display.length,
    )
    const colSpan = this.columnCount()
    // 吸顶行恒渲染在列表顶部（视口外的吸顶行也从窗口中排除，避免重复渲染）
    const sticky = this.stickyRowCount()
    const stickyEnd = Math.min(sticky, display.length)
    let windowStart = win.start
    if (stickyEnd > 0) {
      for (let i = 0; i < stickyEnd; i++) {
        const f = display[i]!
        const tr =
          f.kind === 'expand'
            ? this.buildExpandRow(f)
            : this.buildRow(f, i, rowKey, selected, expanded, layout)
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
      const tr =
        f.kind === 'expand'
          ? this.buildExpandRow(f)
          : this.buildRow(f, i, rowKey, selected, expanded, layout)
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
      列树先扁平为叶子列，数据/排序/显隐/拖拽均作用于叶子列。 */
  private effectiveColumns(): TableColumn[] {
    let cols = this.flattenLeaves(this._columns)
    if (this._columnKeys.length > 0) {
      const order = new Map(this._columnKeys.map((k, i) => [k, i]))
      cols = cols
        .filter((c) => order.has(c.key))
        .sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0))
    }
    return cols.filter((c) => c.hidden !== true)
  }

  /** 当前有效列（表格基础 API，能力 controller / 宿主可读） */
  getColumns(): TableColumn[] {
    return this._columns
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
      this.update()
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
    if (hasFixed && this.hasAttr('checkable')) leftAccum = CHECK_CELL_WIDTH
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
      有 children 的组列一行渲染（colspan=可见叶子数）；叶子列落位到树深、rowspan 盖到底部（表头多行时数据对齐）。 */
  private buildHeaderGrid(): {
    col: TableColumn
    level: number
    rowspan: number
    colspan: number
    isLeaf: boolean
  }[] {
    const depth = this.headerDepth()
    const rows: { col: TableColumn; level: number; rowspan: number; colspan: number; isLeaf: boolean }[][] =
      Array.from({ length: depth }, () => [])
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
    fill(this._columns, 0)
    return rows.flat()
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
  private matchesFilters(
    row: Record<string, unknown>,
    filterValues: Record<string, string | number>,
  ): boolean {
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
    this.positionFilterPanel(panel, trigger)
    this.shadowRoot?.appendChild(panel)
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

  /** fixed 定位过滤面板到触发按钮下方 */
  private positionFilterPanel(panel: HTMLElement, trigger: HTMLElement): void {
    const rect = trigger.getBoundingClientRect()
    panel.style.left = `${rect.left}px`
    panel.style.top = `${rect.bottom + 6}px`
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
   */  private resolveSorts(): SortState[] {
    const raw = this.getAttr('multi-sort', '')
    if (raw) {
      try {
        const arr = JSON.parse(raw) as Array<{ key: string; order?: SortOrder }>
        const out = (Array.isArray(arr) ? arr : [])
          .filter((s): s is { key: string; order: 'asc' | 'desc' } => !!s && typeof s.key === 'string' && (s.order === 'asc' || s.order === 'desc'))
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
  private compareRows(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    sorts: SortState[],
  ): number {
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
  private buildFlat(
    sorts: SortState[],
    rowKey: string,
    roots: Array<Record<string, unknown>> = this._data,
  ): FlatRow[] {
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
      if (
        !hasChildren &&
        expanded.has(key) &&
        typeof row.expand === 'string' &&
        row.expand.length > 0
      ) {
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
    this.update()
  }

  /** 总列数（勾选列 + 数据列 + 可展开行尾列） */
  private columnCount(): number {
    return this.effectiveColumns().length + (this.hasAttr('checkable') ? 1 : 0) + (this._expandable ? 1 : 0)
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
      else if (cfg.type === 'avg')
        values.set(cfg.key, String(cnt ? Math.round((sum / cnt) * 100) / 100 : 0))
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

  private isVirtual(): boolean {
    return this.getAttr('height', '') !== ''
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
    if (!this.isVirtual() || !this.wrap) return
    if (this.scrollRaf) return
    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = 0
      const body = this.shadow.querySelector('tbody')
      const head = this.shadow.querySelector('thead')
      if (!body || !head) return
      const st = this.wrap!.scrollTop
      const rowKey = this.getAttr('row-key', 'key')
      const selected = this.getAttr('selected', '').split(',').filter(Boolean)
      const expanded = new Set(this.getAttr('expanded', '').split(',').filter(Boolean))
      const flat = this.buildFlat(this.resolveSorts(), rowKey)
      const display = this.visibleFlat(flat, expanded, rowKey)
      this.settleEdit()
      body.innerHTML = ''
      this.renderVirtualBody(body, display, rowKey, selected, expanded, this.computeLayout(), st)
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

  // ==================== 行内编辑 ====================

  /** 表格级 editable 开关 + 列级 editable 双重要求 */
  private editingEnabled(col: TableColumn): boolean {
    return this.hasAttr('editable') && Boolean(col.editable)
  }

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

  /** 可编辑单元格挂铅笔图标（右上角绝对定位，hover/focus-visible 时显现；aria-hidden 不给读屏噪音） */
  private appendEditAffordance(td: HTMLTableCellElement): void {
    const icon = document.createElement('span')
    icon.className = 'cell-edit-icon'
    icon.setAttribute('aria-hidden', 'true')
    icon.innerHTML = EDIT_ICON
    td.appendChild(icon)
  }

  /** 双击 / Enter / F2 / 操作列按钮 → 进入编辑模式 */
  private enterEdit(td: HTMLTableCellElement): void {
    // 防御：两次点击之间表格重渲染导致 td 被整体重建（脱离文档）时不再进入编辑，
    // 否则编辑器会创建在游离节点上（不可见但状态被占用）
    if (!td.isConnected) return
    const colKey = td.getAttribute('data-col') ?? ''
    if (!colKey) return
    const col = this.effectiveColumns().find((c) => c.key === colKey)
    if (!col || !this.editingEnabled(col)) return
    // 另一格正在编辑：先提交旧格（非受控时可能触发重渲染，需重查 td）
    if (this.editState && this.editState.td !== td) {
      this.submitEdit()
      const key = this.rowKeyOf(td)
      const freshTr = this.findRow(key)
      const freshTd = freshTr ? this.cellOf(freshTr, colKey) : null
      if (!freshTd) return
      td = freshTd
    }
    const tr = td.closest('tr') as HTMLTableRowElement | null
    if (!tr) return
    const key = tr.getAttribute('data-key') ?? ''
    const row = this.findDataRow(key) ?? {}
    const oldValue = String(row[colKey] ?? '')
    const displayIndex = this.displayIndexOf(tr)
    const editor =
      col.editor === 'select'
        ? this.buildSelectEditor(col, key, oldValue)
        : this.buildInputEditor(col, key, oldValue)
    td.textContent = ''
    td.appendChild(editor)
    td.classList.add('editing')
    td.setAttribute('data-editing', 'true')
    this.headerTh(colKey)?.setAttribute('data-editing-col', 'true')
    this.editState = {
      displayIndex,
      key,
      colKey,
      row,
      td,
      oldValue,
      editor: col.editor === 'select' ? 'select' : 'input',
    }
    editor.focus()
    if (editor instanceof HTMLInputElement) editor.select()
    this.refreshActionCells()
  }

  private buildInputEditor(col: TableColumn, key: string, value: string): HTMLInputElement {
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'cell-editor'
    input.setAttribute('part', 'cell-editor')
    input.value = value
    input.setAttribute('aria-label', this.t('table.editCell', { column: col.title, key }))
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        this.submitEdit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        this.cancelEdit()
      }
    })
    input.addEventListener('click', (e) => e.stopPropagation())
    input.addEventListener('blur', (e: FocusEvent) => this.handleEditorBlur(e))
    return input
  }

  private buildSelectEditor(col: TableColumn, key: string, value: string): HTMLSelectElement {
    const select = document.createElement('select')
    select.className = 'cell-editor'
    select.setAttribute('part', 'cell-editor')
    select.setAttribute('aria-label', this.t('table.editCell', { column: col.title, key }))
    for (const opt of col.editOptions ?? []) {
      const o = document.createElement('option')
      o.value = String(opt.value)
      o.textContent = opt.label
      select.appendChild(o)
    }
    select.value = value
    select.addEventListener('change', (e) => {
      e.stopPropagation()
      this.submitEdit()
    })
    select.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        this.cancelEdit()
      }
    })
    select.addEventListener('click', (e) => e.stopPropagation())
    select.addEventListener('blur', (e: FocusEvent) => this.handleEditorBlur(e))
    return select
  }

  /**
   * 提交当前编辑（Enter / blur / 操作列保存）：
   * - 空值 → 还原旧值（默认非破坏）并派发 oas-edit-cancel
   * - 值变化且非空 → 非受控模式回写 data 并派发 oas-edit；受控模式仅派发 oas-edit
   * - 值未变 → 静默退出
   */
  private submitEdit(): void {
    const st = this.editState
    if (!st) return
    const value = this.readEditorValue(st)
    const col = this.effectiveColumns().find((c) => c.key === st.colKey)
    const err = col?.validate ? col.validate(value, st.row) : undefined
    const invalid = err === false || (typeof err === 'string' && err.trim() !== '')
    this.renderEditError(st, invalid ? (typeof err === 'string' ? err : undefined) : undefined)
    if (invalid) {
      // 校验失败：保持编辑态、不提交（编辑器仍可编辑重试）
      st.td.dataset.invalid = 'true'
      st.td.querySelector<HTMLInputElement | HTMLSelectElement>('input, select')?.focus()
      return
    }
    st.td.removeAttribute('data-invalid')
    this.exitEdit(st)
    if (value === '') {
      this.emit('edit-cancel', this.editDetail(st, st.oldValue))
      this.focusCell(st.key, st.colKey)
      return
    }
    if (value !== st.oldValue) {
      if (!this.hasAttr('edit-controlled')) {
        st.row[st.colKey] = this.coerceEditValue(st, value)
        this.setAttribute('data', JSON.stringify(this._data))
      }
      this.emit('edit', this.editDetail(st, value))
    }
    this.focusCell(st.key, st.colKey)
  }

  /** 编辑校验错误展示：写入/清除 td 的 error 消息（重渲染编辑器时保留该错误于单元格内） */
  private renderEditError(st: EditState, message: string | undefined): void {
    let el = st.td.querySelector<HTMLElement>('.edit-error')
    if (message) {
      if (!el) {
        el = document.createElement('span')
        el.className = 'edit-error'
        st.td.appendChild(el)
      }
      el.textContent = message
      st.td.classList.add('edit-invalid')
    } else if (el) {
      el.remove()
      st.td.classList.remove('edit-invalid')
    }
  }

  /** 取消当前编辑（Esc / 操作列取消）：还原旧值并派发 oas-edit-cancel */
  private cancelEdit(): void {
    const st = this.editState
    if (!st) return
    const detail = this.editDetail(st, st.oldValue)
    this.exitEdit(st)
    this.emit('edit-cancel', detail)
    this.focusCell(st.key, st.colKey)
  }

  /** 退出编辑态：还原单元格展示、清除高亮、刷新操作列按钮 */
  private exitEdit(st: EditState): void {
    // 先置 null：清 td 会移除聚焦的 input 触发 blur，若 editState 未清空，blur→handleEditorBlur→submitEdit 会把值误提交
    this.editState = null
    const col = this.effectiveColumns().find((c) => c.key === st.colKey)
    if (col) {
      // 退出编辑后单元格重画走与正常渲染一致的 cellNode（尊重 render/cellTemplate 富内容），而非裸 textContent
      st.td.textContent = ''
      const node = this.cellNode(col, st.row)
      if (node) st.td.appendChild(node)
      // 可编辑单元格：铅笔图标在进入编辑时随 textContent 清空，退出后恢复
      if (this.editingEnabled(col)) this.appendEditAffordance(st.td)
    } else {
      st.td.textContent = ''
    }
    st.td.classList.remove('editing')
    st.td.removeAttribute('data-editing')
    this.headerTh(st.colKey)?.removeAttribute('data-editing-col')
    this.refreshActionCells()
  }

  /** 外部重渲染（数据/排序/滚动等触发整体重建）前静默取消进行中的编辑 */
  private settleEdit(): void {
    this.editState = null
  }

  private handleEditorBlur(e: FocusEvent): void {
    if (!this.editState) return
    const related = e.relatedTarget as Node | null
    // 焦点移至组件内部（操作列保存/取消按钮）时交给按钮 click，避免双重提交
    if (related && this.shadow.contains(related)) return
    this.submitEdit()
  }

  private readEditorValue(st: EditState): string {
    if (st.editor === 'select') {
      const sel = st.td.querySelector<HTMLSelectElement>('select.cell-editor')
      return sel ? sel.value : st.oldValue
    }
    const input = st.td.querySelector<HTMLInputElement>('input.cell-editor')
    return input ? input.value : st.oldValue
  }

  /** 数字列编辑回写保持数值类型（非字符串化） */
  private coerceEditValue(st: EditState, value: string): string | number {
    const old = st.row[st.colKey]
    if (typeof old === 'number' && value !== '' && Number.isFinite(Number(value))) {
      return Number(value)
    }
    return value
  }

  private editDetail(
    st: EditState,
    value: string,
  ): { rowIndex: number; key: string; column: string; value: string } {
    return { rowIndex: st.displayIndex, key: st.key, column: st.colKey, value }
  }

  /** 编辑结束后焦点还给单元格（非受控提交已重建，需重查） */
  private focusCell(key: string, colKey: string): void {
    const tr = this.findRow(key)
    const td = tr ? this.cellOf(tr, colKey) : null
    td?.focus()
  }

  /** 操作列按钮：编辑 → 进入该行首个可编辑列编辑模式 */
  private editRow(key: string): void {
    // 另一行正在编辑时先提交（非受控可能触发重渲染，随后重查 tr）
    if (this.editState) this.submitEdit()
    const tr = this.findRow(key)
    if (!tr) return
    const colIndex = this.effectiveColumns().findIndex((c) => c.editable)
    if (colIndex < 0) return
    const td = this.cellOf(tr, this.effectiveColumns()[colIndex]!.key)
    if (td) this.enterEdit(td)
  }

  /** 渲染操作列单元格：非编辑态显示 编辑，编辑态显示 保存/取消 */
  private renderActionCell(td: HTMLTableCellElement, tr: HTMLTableRowElement): void {
    const key = tr.getAttribute('data-key') ?? ''
    const isEditing = this.editState?.key === key
    td.textContent = ''
    if (isEditing) {
      const save = document.createElement('button')
      save.className = 'action-btn save'
      save.setAttribute('part', 'action-save')
      save.textContent = this.t('table.save')
      save.addEventListener('click', (e) => {
        e.stopPropagation()
        this.submitEdit()
      })
      const cancel = document.createElement('button')
      cancel.className = 'action-btn danger'
      cancel.setAttribute('part', 'action-cancel')
      cancel.textContent = this.t('table.cancel')
      cancel.addEventListener('click', (e) => {
        e.stopPropagation()
        this.cancelEdit()
      })
      td.append(save, cancel)
    } else {
      const edit = document.createElement('button')
      edit.className = 'action-btn'
      edit.setAttribute('part', 'action-edit')
      edit.textContent = this.t('table.edit')
      edit.addEventListener('click', (e) => {
        e.stopPropagation()
        this.editRow(key)
      })
      td.appendChild(edit)
    }
  }

  /** 编辑状态变化后重渲染可见行的操作列（避免整表重建） */
  private refreshActionCells(): void {
    const body = this.shadow.querySelector('tbody')
    if (!body) return
    const actionIndex = this.effectiveColumns().findIndex((c) => c.actions)
    if (actionIndex < 0) return
    const offset = this.tdOffset(actionIndex)
    for (const tr of body.querySelectorAll('tr.row')) {
      const td = tr.querySelectorAll('td')[offset]
      if (td) this.renderActionCell(td as HTMLTableCellElement, tr as HTMLTableRowElement)
    }
  }

  private headerTh(colKey: string): HTMLElement | null {
    const thead = this.shadow.querySelector('thead')
    if (!thead) return null
    for (const th of thead.querySelectorAll('th[data-key]')) {
      if (th.getAttribute('data-key') === colKey) return th as HTMLElement
    }
    return null
  }

  private findRow(key: string): HTMLTableRowElement | null {
    const body = this.shadow.querySelector('tbody')
    if (!body) return null
    for (const tr of body.querySelectorAll('tr.row')) {
      if (tr.getAttribute('data-key') === key) return tr as HTMLTableRowElement
    }
    return null
  }

  private cellOf(tr: HTMLTableRowElement, colKey: string): HTMLTableCellElement | null {
    const colIndex = this.effectiveColumns().findIndex((c) => c.key === colKey)
    if (colIndex < 0) return null
    const td = tr.querySelectorAll('td')[this.tdOffset(colIndex)]
    return (td as HTMLTableCellElement | undefined) ?? null
  }

  private rowKeyOf(td: HTMLTableCellElement): string {
    const tr = td.closest('tr')
    return tr?.getAttribute('data-key') ?? ''
  }

  private displayIndexOf(tr: HTMLTableRowElement): number {
    const body = this.shadow.querySelector('tbody')
    if (!body) return -1
    return [...body.querySelectorAll('tr.row')].indexOf(tr)
  }

  /** 数据列 td 在 tr 内的索引（勾选列占一列时偏移） */
  private tdOffset(colIndex: number): number {
    return colIndex + (this.hasAttr('checkable') ? 1 : 0)
  }

  /** 按行键在数据树中找行对象（提交时回写用） */
  private findDataRow(
    key: string,
    nodes: Array<Record<string, unknown>> = this._data,
  ): Record<string, unknown> | null {
    const rowKey = this.getAttr('row-key', 'key')
    for (const row of nodes) {
      if (String(row[rowKey] ?? JSON.stringify(row)) === key) return row
      const children = row.children
      if (Array.isArray(children)) {
        const hit = this.findDataRow(key, children as Array<Record<string, unknown>>)
        if (hit) return hit
      }
    }
    return null
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
    const col: TableColumn = { key: el.getAttribute('key') ?? '', title: this.childColumnTitle(el) }
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
    const observer = new MutationObserver(() => this.update())
    observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: [
        'key',
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
    }    try {
      const keys = JSON.parse(this.getAttr('column-keys', '[]'))
      this._columnKeys = Array.isArray(keys)
        ? keys.filter((k) => typeof k === 'string')
        : []
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

/**
 * 克隆 `<template>` 内容并用当前行数据水合：把文本节点与元素属性里的 `{{row.字段}}`
 * 替换为该行对应值（缺省空串）。返回值是水合后的 DocumentFragment（可 appendChild 进 td）。
 */
function hydrateRowTemplate(
  template: HTMLTemplateElement,
  row: Record<string, unknown>,
): DocumentFragment {
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
        el.setAttribute(attr.name, attr.value.replace(/\{\{\s*row\.(\w+)\s*\}\}/g, (_, k: string) => String(row[k] ?? '')))
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
    return children.some(
      (c) => c && typeof c === 'object' && rowHasExpand(c as Record<string, unknown>),
    )
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
