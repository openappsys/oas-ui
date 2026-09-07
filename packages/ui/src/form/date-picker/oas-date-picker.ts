import { OASElement, escapeHtml } from '@oas-ui/core'
import {
  resolveLocale,
  startOfDay,
  toISODate,
  parseISODate,
  addMonths,
  addYears,
  formatYear,
  formatYearMonth,
  formatToken,
  findDayButton,
  setRovingTab,
  getWeekStart,
  isoWeek,
} from '../calendar/date-grid.js'
import {
  formatWeekValue,
  parseWeekValue,
  movePickerGridDate,
  renderPickerMonthGrid,
  isoWeekYear,
} from './picker-grid.js'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

type PickerType =
  | 'date'
  | 'daterange'
  | 'month'
  | 'monthrange'
  | 'year'
  | 'yearrange'
  | 'datetime'
  | 'datetimerange'
  | 'week'
  | 'quarter'
type SubPanel = 'days' | 'months'

/** placement 合法取值：12 向（四基向 × start/end 交叉轴对齐） */
const VALID_PLACEMENTS: readonly Placement[] = [
  'top',
  'top-start',
  'top-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'left',
  'left-start',
  'left-end',
  'right',
  'right-start',
  'right-end',
]

const VALID_TYPES: readonly PickerType[] = [
  'date',
  'daterange',
  'month',
  'monthrange',
  'year',
  'yearrange',
  'datetime',
  'datetimerange',
  'week',
  'quarter',
]

const RANGE_TYPES: ReadonlySet<PickerType> = new Set([
  'daterange',
  'datetimerange',
  'monthrange',
  'yearrange',
])

const VALID_SIZES = ['small', 'medium', 'large'] as const
const VALID_STATUSES = ['error', 'warning', 'success'] as const

function normalizeChoice(raw: string, fallback: string, valid: readonly string[]): string {
  return valid.includes(raw) ? raw : fallback
}

function pad(v: number): string {
  return String(v).padStart(2, '0')
}

/** 快捷预设项：value 为静态值（date 为 ISO 字符串，daterange 为 [start, end]），getValue 动态计算 */
interface ShortcutItem {
  label: string
  value?: string | [string, string]
  getValue?: () => Date | [Date, Date]
}

const DEFAULT_FORMAT: Record<string, string> = {
  date: 'yyyy-MM-dd',
  month: 'yyyy-MM',
  datetime: 'yyyy-MM-dd HH:mm:ss',
  daterange: 'yyyy-MM-dd',
  datetimerange: 'yyyy-MM-dd HH:mm:ss',
}

const STYLE = `
 :host {
  display: inline-block;
  position: relative;
  font-family: inherit;
  width: 220px;
  /* 尺寸档内部控高变量（data-size 镜像切换；不占公开 API，外部请用 size 属性） */
  --_ch: var(--oas-control-height-md);
}
:host([data-size='small']) {
  --_ch: var(--oas-control-height-sm);
}
:host([data-size='large']) {
  --_ch: var(--oas-control-height-lg);
}
.trigger {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  min-height: var(--_ch);
  padding: 0 var(--oas-space-8, 40px) 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
/* ---- size 尺寸档：字号/padding 联动（默认 medium 走基础样式） ---- */
:host([data-size='small']) .trigger {
  font-size: var(--oas-font-size-sm);
  padding-left: var(--oas-space-2);
}
:host([data-size='large']) .trigger {
  font-size: var(--oas-font-size-lg);
  padding-left: var(--oas-space-4);
}
.trigger:hover:not(:disabled) {
  border-color: var(--oas-color-primary);
}
.trigger:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.trigger[aria-expanded='true'] {
  border-color: var(--oas-color-primary);
}
.trigger:disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
.trigger::placeholder {
  color: var(--oas-color-text-secondary);
}
/* readonly：可聚焦可浏览面板，光标不指示可编辑 */
.trigger[readonly] {
  cursor: default;
}
/* ---- status 校验态：success / warning / error（error 兼容宿主 aria-invalid 通道） ---- */
:host([data-status='success']) .trigger {
  border-color: var(--oas-color-success);
}
:host([data-status='success']) .trigger:focus-visible {
  border-color: var(--oas-color-success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-success) 30%, transparent);
}
:host([data-status='success']) .trigger[aria-expanded='true'] {
  border-color: var(--oas-color-success);
}
:host([data-status='warning']) .trigger {
  border-color: var(--oas-color-warning);
}
:host([data-status='warning']) .trigger:focus-visible {
  border-color: var(--oas-color-warning);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-warning) 30%, transparent);
}
:host([data-status='warning']) .trigger[aria-expanded='true'] {
  border-color: var(--oas-color-warning);
}
:host([data-status='error']) .trigger {
  border-color: var(--oas-color-danger);
}
:host([data-status='error']) .trigger:focus-visible {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
:host([data-status='error']) .trigger[aria-expanded='true'] {
  border-color: var(--oas-color-danger);
}
:host([aria-invalid='true']) .trigger {
  border-color: var(--oas-color-danger);
}
:host([aria-invalid='true']) .trigger:focus-visible {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
.chevron {
  position: absolute;
  right: var(--oas-space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--oas-color-text-secondary);
  pointer-events: none;
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
.trigger[aria-expanded='true'] ~ .chevron,
:host([data-open]) .chevron {
  transform: translateY(-50%) rotate(180deg);
}
.clear-btn {
  position: absolute;
  right: var(--oas-space-7, 30px);
  top: 50%;
  transform: translateY(-50%);
  appearance: none;
  border: none;
  background: transparent;
  padding: 2px;
  margin: 0;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--oas-radius-sm);
  z-index: 2;
}
.clear-btn:hover {
  color: var(--oas-color-text-primary);
}
.clear-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.clear-btn[hidden] {
  display: none;
}
.clear-btn svg {
  width: 12px;
  height: 12px;
  display: block;
}
[part='dropdown'] {
  /* fixed + computePosition 锚定 trigger：逃出祖先 overflow 容器（窄工具栏/模态滚动容器），
     不再被裁剪；空间不足自动翻转/右对齐/视口夹取（与 select/combobox 同定位契约） */
  position: fixed;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-dropdown, 1000));
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--oas-color-overlay) 25%, transparent);
  padding: var(--oas-space-3);
  display: none;
}
[part='dropdown'].open {
  display: block;
}
[part='panel'] {
  min-width: 240px;
}
[part='panel'].range-panel {
  min-width: 480px;
}
[part='panel'] .panel-body {
  min-width: 0;
}
[part='panel'] .header {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  margin-bottom: var(--oas-space-2);
}
[part='panel'] .header button,
[part='panel'] .header .title {
  appearance: none;
  border: none;
  background: transparent;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-md);
  height: var(--oas-control-height-md);
  min-width: var(--oas-control-height-md);
  padding: 0 var(--oas-space-1);
}
[part='panel'] .header button {
  cursor: pointer;
}
[part='panel'] .header button:hover:not(:disabled) {
  background: var(--oas-color-bg-hover);
}
[part='panel'] .header button:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
[part='panel'] .header button:disabled {
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
[part='panel'] .title {
  flex: 1;
  text-align: center;
  font-weight: 500;
  white-space: nowrap;
}
[part='grid'] .weekdays,
[part='grid'] .week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
[part='grid'].has-week-number .weekdays,
[part='grid'].has-week-number .week {
  grid-template-columns: 1.4fr repeat(7, 1fr);
}
[part='grid'] .weekday,
[part='grid'] .week-number {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--oas-control-height-md);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
[part='grid'] .day {
  appearance: none;
  border: none;
  background: transparent;
  position: relative;
  width: 100%;
  height: var(--oas-control-height-md);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  color: var(--oas-color-text-primary);
  cursor: pointer;
}
/* 自定义单元格标记点：宿主经 oas-cell-render 追加 <span class="cell-dot"> 即可获得可见标记 */
[part='grid'] .day .cell-dot {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--oas-color-danger);
}
[part='grid'] .day:hover:not(.disabled) {
  background: var(--oas-color-bg-hover);
}
[part='grid'] .day:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
[part='grid'] .day.today {
  box-shadow: inset 0 0 0 1px var(--oas-color-primary);
}
[part='grid'] .day.selected {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
[part='grid'] .day.selected:hover {
  background: var(--oas-color-primary-hover);
}
[part='grid'] .day.disabled {
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
[part='grid'] .day.outside {
  color: var(--oas-color-text-disabled);
}
[part='grid'] .day.range-start,
[part='grid'] .day.range-end {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
  border-radius: var(--oas-radius-sm);
}
[part='grid'] .day.in-range {
  background: color-mix(in srgb, var(--oas-color-primary) 18%, transparent);
  border-radius: 0;
}
[part='grid'] .day.disabled.selected {
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
  box-shadow: none;
}
[part='panel'] .months,
[part='panel'] .years {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--oas-space-1);
}
[part='panel'] .quarters {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--oas-space-1);
}
[part='panel'] .month-cell,
[part='panel'] .year-cell,
[part='panel'] .quarter-cell {
  appearance: none;
  border: none;
  background: transparent;
  height: var(--oas-control-height-lg);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  color: var(--oas-color-text-primary);
  cursor: pointer;
}
[part='panel'] .month-cell:hover:not(.disabled),
[part='panel'] .year-cell:hover:not(.disabled),
[part='panel'] .quarter-cell:hover:not(.disabled) {
  background: var(--oas-color-bg-hover);
}
[part='panel'] .month-cell:focus-visible,
[part='panel'] .year-cell:focus-visible,
[part='panel'] .quarter-cell:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
[part='panel'] .month-cell.selected,
[part='panel'] .year-cell.selected,
[part='panel'] .quarter-cell.selected {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
[part='panel'] .month-cell.disabled,
[part='panel'] .year-cell.disabled,
[part='panel'] .quarter-cell.disabled {
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
[part='panel'] .month-cell.range-start,
[part='panel'] .month-cell.range-end,
[part='panel'] .year-cell.range-start,
[part='panel'] .year-cell.range-end {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
[part='panel'] .month-cell.in-range,
[part='panel'] .year-cell.in-range {
  background: color-mix(in srgb, var(--oas-color-primary) 18%, transparent);
}
[part='panel'] .range-grids {
  display: flex;
  gap: var(--oas-space-4);
}
[part='panel'] .range-grid + .range-grid {
  border-left: 1px solid var(--oas-color-border);
  padding-left: var(--oas-space-4);
}
[part='panel'] .time-section {
  display: flex;
  gap: var(--oas-space-1);
  margin-top: var(--oas-space-3);
  padding-top: var(--oas-space-2);
  border-top: 1px solid var(--oas-color-border);
}
[part='panel'] .time-sections {
  display: flex;
  gap: var(--oas-space-4);
  margin-top: var(--oas-space-3);
  padding-top: var(--oas-space-2);
  border-top: 1px solid var(--oas-color-border);
}
[part='panel'] .time-sections .time-section {
  flex: 1;
  margin: 0;
  padding: 0;
  border: none;
}
.time-col {
  flex: 1;
  max-height: 140px;
  overflow-y: auto;
}
.time-option {
  appearance: none;
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  padding: var(--oas-space-1) 0;
  text-align: center;
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  color: var(--oas-color-text-primary);
  cursor: pointer;
  border-radius: var(--oas-radius-sm);
}
.time-option:hover {
  background: var(--oas-color-bg-hover);
}
.time-option.selected {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
[part='panel'] .footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--oas-space-2);
  padding-top: var(--oas-space-2);
  border-top: 1px solid var(--oas-color-border);
}
[part='panel'] .footer button {
  appearance: none;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
  color: var(--oas-color-primary);
  border-radius: var(--oas-radius-sm);
  padding: var(--oas-space-1) var(--oas-space-2);
}
[part='panel'] .footer button:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-primary-hover);
}
[part='panel'] .footer .confirm {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
[part='panel'] .footer .confirm:hover {
  background: var(--oas-color-primary-hover);
  color: var(--oas-color-bg);
}
[part='panel'] .shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-1);
  margin-bottom: var(--oas-space-2);
  padding-bottom: var(--oas-space-2);
  border-bottom: 1px solid var(--oas-color-border);
}
[part='panel'] .shortcut {
  appearance: none;
  border: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  border-radius: var(--oas-radius-sm);
  padding: var(--oas-space-1) var(--oas-space-2);
  cursor: pointer;
  transition: color var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    background var(--oas-transition-fast) var(--oas-ease-out);
}
[part='panel'] .shortcut:hover {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
[part='panel'] .shortcut:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
/* ---- shortcuts-position=left：预设改侧栏（纵向，分隔线换到行内末），面板横向布局 ---- */
.panel.shortcuts-left {
  display: flex;
  gap: var(--oas-space-3);
  align-items: stretch;
}
.panel.shortcuts-left .shortcuts {
  flex-direction: column;
  align-items: stretch;
  flex-wrap: nowrap;
  min-width: 96px;
  margin: 0;
  padding: 0 var(--oas-space-3) 0 0;
  border-bottom: none;
  border-inline-end: 1px solid var(--oas-color-border);
}
.panel.shortcuts-left .panel-body {
  flex: 1;
}
`

interface RangeState {
  start: Date | null
  end: Date | null
}

interface TimeParts {
  h: number
  m: number
  s: number
}

export class OASDatePicker extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'format',
      'type',
      'min',
      'max',
      'disabled',
      'placeholder',
      'multiple',
      'placement',
      'disabled-skip',
      'clearable',
      'size',
      'status',
      'readonly',
      'open',
      'unlink-panels',
      'default-value',
      'shortcuts-position',
      'show-week-number',
      'first-day-of-week',
    ]
  }

  private triggerEl: HTMLInputElement | null = null
  private dropdown: HTMLElement | null = null
  private panel: HTMLElement | null = null
  private openState = false
  /** 展开态下面板是否已完成 open() 式状态初始化（防止 update 重入 boot） */
  private panelBooted = false
  private viewDate: Date = startOfDay(new Date())
  /** unlink-panels 时第二面板独立锚（linked 模式恒由 viewDate 派生） */
  private viewDate2: Date = startOfDay(new Date())
  private focusDate: Date | null = null
  private subPanel: SubPanel = 'days'
  private pendingDate: Date | null = null
  private time: TimeParts = { h: 0, m: 0, s: 0 }
  private time2: TimeParts = { h: 0, m: 0, s: 0 }
  private range: RangeState = { start: null, end: null }
  private previewEnd: Date | null = null
  private _shortcuts: ShortcutItem[] | null = null
  private _disabledDate: ((d: Date) => boolean) | null = null
  /** 非法 placement 仅告警一次（滚动/resize 重定位不重复刷屏） */
  private placementWarned = false
  /** 手输中标记：update 不回写 input.value 打断输入 */
  private typing = false
  /** 焦点在组件内（trigger/面板网格任一）：内部转移不派发 oas-focus/oas-blur */
  private focusWithin = false
  /** aria-invalid 由 status=error 设置的所有权标志（清理时只移除自己设置的） */
  private invalidByStatus = false

  /** shortcuts 走 property（对象数组无法用 JSON 属性表达），设置后即时重渲面板 */
  get shortcuts(): ShortcutItem[] | null {
    return this._shortcuts
  }

  set shortcuts(items: ShortcutItem[] | null) {
    this._shortcuts = items
    if (this.isConnected) this.update()
  }

  /** disabled-date 走 property（回调无法用 JSON 表达），设置后即时重渲面板 */
  get disabledDate(): ((d: Date) => boolean) | null {
    return this._disabledDate
  }

  set disabledDate(fn: ((d: Date) => boolean) | null) {
    this._disabledDate = fn
    if (this.isConnected) this.update()
  }

  /**
   * 受控 open：属性即真相——在场=展开、移除=收起（宿主手势只派发
   * oas-open-change 通知宿主，由宿主决定是否增删属性，组件不强制写回）。
   */
  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name === 'open' && oldValue !== newValue && this.hasRendered) {
      if (newValue !== null && !this.openState) {
        this.bootPanel(false)
        this.emit('open-change', { open: true })
      } else if (newValue === null && this.openState) {
        this.closeSync()
        this.emit('open-change', { open: false })
      }
    }
    super.attributeChangedCallback(name, oldValue, newValue)
  }

  private get pickerType(): PickerType {
    const t = this.getAttr('type', 'date')
    return (VALID_TYPES as readonly string[]).includes(t) ? (t as PickerType) : 'date'
  }

  private isRangeType(): boolean {
    return RANGE_TYPES.has(this.pickerType)
  }

  /** multiple 仅在 date 类型下生效（daterange 忽略，走范围语义） */
  private isMultiple(): boolean {
    return this.hasAttr('multiple') && this.pickerType === 'date'
  }

  /** 手输通道开放形态：单值类型（range/multiple 为二期通道，输入框只读回显） */
  private isEditableType(): boolean {
    return !this.isRangeType() && !this.isMultiple()
  }

  private currentFormat(): string {
    return this.getAttr('format', '') || (DEFAULT_FORMAT[this.pickerType] ?? 'yyyy-MM-dd')
  }

  /** 生效周起始：first-day-of-week 覆写（0-6）> locale 推导 */
  private effectiveWeekStart(): number {
    const raw = this.getAttr('first-day-of-week', '')
    if (/^[0-6]$/.test(raw)) return Number(raw)
    return getWeekStart(resolveLocale(this))
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致（快照不含弹出面板内容） */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="picker" part="picker">
        <input class="trigger" part="trigger" type="text" role="combobox"
          aria-haspopup="dialog" aria-expanded="false" autocomplete="off" spellcheck="false" />
        <button class="clear-btn" part="clear" type="button" tabindex="-1" hidden aria-label="">
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <svg class="chevron" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M4 6 L8 10 L12 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="dropdown" part="dropdown">
          <div class="panel" part="panel"></div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定触发器/面板/外部点击事件（render 与水合路径共用） */
  private bind(): void {
    this.triggerEl = this.shadow.querySelector<HTMLInputElement>('[part="trigger"]')
    this.dropdown = this.shadow.querySelector<HTMLElement>('[part="dropdown"]')
    this.panel = this.shadow.querySelector<HTMLElement>('[part="panel"]')
    this.triggerEl?.addEventListener('click', () => this.toggle())
    this.triggerEl?.addEventListener('keydown', (e) => this.handleTriggerKey(e as KeyboardEvent))
    // 手输通道：键入置 typing 标记（update 不回写显示），失焦解析合法提交 / 非法回退
    this.triggerEl?.addEventListener('input', () => {
      this.typing = true
    })
    this.triggerEl?.addEventListener('blur', () => this.commitTyped())
    // 清除钮：阻止默认失焦（避免先触发 blur 提交）再清空
    const clearBtn = this.shadow.querySelector<HTMLButtonElement>('[part="clear"]')
    clearBtn?.addEventListener('mousedown', (e) => e.preventDefault())
    clearBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.clearValue()
    })
    // 面板内点击永不触发「外部点击关闭」：面板交互会重渲 DOM，
    // happy-dom 中已分离节点 composedPath 不完整，需显式阻断冒泡
    this.dropdown?.addEventListener('click', (e) => e.stopPropagation())
    this.dropdown?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') {
        e.preventDefault()
        this.revertInput()
        this.requestOpen(false)
      }
    })
    // 焦点事件：组件整体获得/失去焦点派发 oas-focus / oas-blur
    //（trigger ↔ 面板网格的组件内转移不误报，离开组件才 blur）
    const wrapper = this.shadow.querySelector<HTMLElement>('.picker')
    wrapper?.addEventListener('focusin', () => {
      if (this.focusWithin) return
      this.focusWithin = true
      this.emit('focus')
    })
    wrapper?.addEventListener('focusout', (e) => {
      if (!this.focusWithin) return
      const related = (e as FocusEvent).relatedTarget
      if (related instanceof Node && wrapper.contains(related)) return
      this.focusWithin = false
      this.emit('blur')
    })
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick, true))
    // 视口 resize / 祖先滚动时重定位（仅展开态有意义）；capture 捕获滚动以覆盖任何可滚动祖先
    const reposition = (): void => {
      if (this.openState) this.positionDropdown()
    }
    window.addEventListener('resize', reposition)
    this.onCleanup(() => window.removeEventListener('resize', reposition))
    window.addEventListener('scroll', reposition, true)
    this.onCleanup(() => window.removeEventListener('scroll', reposition, true))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（trigger/dropdown/panel 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="trigger"]')) return false
    if (!this.shadow.querySelector('[part="dropdown"]')) return false
    if (!this.shadow.querySelector('[part="panel"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.syncSizeStatus()
    this.syncTrigger()
    // 初始 open 属性（upgrade 前的属性通知被基类吞掉）：挂载即展开，不抢焦点
    if (this.hasAttribute('open') && !this.openState) this.bootPanel(false)
    if (this.openState) this.renderPanel(false)
  }

  // ---- 开合（受控 open / oas-open-change） ----

  private toggle(): void {
    if (this.injectDisabled()) return
    this.requestOpen(!this.openState)
  }

  /** 展开/收起请求统一入口：受控（open 属性在场）只派发事件；非受控直接应用并派发 */
  private requestOpen(next: boolean): void {
    if (this.hasAttribute('open')) {
      this.emit('open-change', { open: next })
      return
    }
    if (next) {
      if (this.openState) return
      this.bootPanel(true)
      this.emit('open-change', { open: true })
      return
    }
    if (!this.openState) return
    this.closeSync()
    this.emit('open-change', { open: false })
  }

  /** 展开态初始化：按类型锚定视图/范围/时间，渲染面板（焦点进网格仅手势展开时） */
  private bootPanel(focusNow: boolean): void {
    const t = this.pickerType
    const today = startOfDay(new Date())
    const multi = this.isMultiple()
    const sel = multi ? (this.selectedAnchorArray().at(-1) ?? null) : this.parseValueAnchor(this.getAttr('value', ''))
    this.subPanel = 'days'
    this.focusDate = sel ?? null
    const def = this.parseValueAnchor(this.getAttr('default-value', ''))
    if (this.isRangeType()) {
      const r = this.parseRange()
      this.range = r
      this.previewEnd = null
      const anchor = r.start ?? def ?? today
      this.viewDate = this.monthAnchor(anchor)
      // 每次展开重置第二栏为第一栏的下一单元（unlink 模式下后续导航再独立）
      this.viewDate2 = this.nextUnit(this.viewDate)
      if (t === 'datetimerange') {
        this.time = this.timeOf(r.start)
        this.time2 = this.timeOf(r.end)
      }
    } else {
      this.viewDate = this.monthAnchor(sel ?? def ?? today)
      if (t === 'year' || t === 'yearrange') {
        // 年网格页锚对齐到年代起始（12 年页）
        this.viewDate = this.yearPageStart(this.viewDate)
      }
      if (t === 'datetime') {
        this.pendingDate = sel
        this.time = this.timeOf(parseISODate(this.getAttr('value', '')))
      }
    }
    this.openState = true
    this.panelBooted = true
    this.syncDropdown()
    this.renderPanel(focusNow)
  }

  private closeSync(): void {
    this.openState = false
    this.panelBooted = false
    this.typing = false
    this.syncDropdown()
    this.syncTrigger()
  }

  private syncDropdown(): void {
    if (!this.dropdown || !this.triggerEl) return
    this.dropdown.classList.toggle('open', this.openState)
    this.triggerEl.setAttribute('aria-expanded', String(this.openState))
    if (this.openState) {
      document.addEventListener('click', this.handleOutsideClick, true)
    } else {
      document.removeEventListener('click', this.handleOutsideClick, true)
    }
  }

  // ---- 值格式化 / 解析（按 type） ----

  /** 面板锚定的月初（month/quarter/year 类型只用到年月分量） */
  private monthAnchor(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1)
  }

  private timeOf(d: Date | null): TimeParts {
    return d ? { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() } : { h: 0, m: 0, s: 0 }
  }

  private partsToString(p: TimeParts): string {
    return `${pad(p.h)}:${pad(p.m)}:${pad(p.s)}`
  }

  /** 提交值格式（value attribute 契约） */
  private formatAnchor(d: Date): string {
    const t = this.pickerType
    if (t === 'week') return formatWeekValue(d)
    if (t === 'quarter') return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
    if (t === 'year' || t === 'yearrange') return String(d.getFullYear())
    if (t === 'month' || t === 'monthrange') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    if (t === 'datetime') return `${toISODate(d)}T${this.partsToString(this.time)}`
    if (t === 'datetimerange') return `${toISODate(d)}T${this.partsToString(this.time)}`
    return toISODate(d)
  }

  /** 显示格式（trigger 输入框文本，受 format 属性影响） */
  private formatDisplay(d: Date): string {
    const t = this.pickerType
    if (t === 'week') return formatWeekValue(d)
    if (t === 'quarter') return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
    if (t === 'year' || t === 'yearrange') return String(d.getFullYear())
    return formatToken(d, this.currentFormat(), resolveLocale(this))
  }

  /** value attribute → 单值锚定 Date（按类型），非法返回 null */
  private parseValueAnchor(raw: string): Date | null {
    if (!raw) return null
    const t = this.pickerType
    if (t === 'year' || t === 'yearrange') {
      return /^\d{4}$/.test(raw) ? new Date(Number(raw), 0, 1) : null
    }
    if (t === 'week') return parseWeekValue(raw)
    if (t === 'quarter') {
      const m = /^(\d{4})-Q([1-4])$/.exec(raw)
      return m ? new Date(Number(m[1]), (Number(m[2]) - 1) * 3, 1) : null
    }
    const d = parseISODate(raw)
    if (!d) return null
    if (t === 'month' || t === 'monthrange') return new Date(d.getFullYear(), d.getMonth(), 1)
    return startOfDay(d)
  }

  /** value attribute → 范围端点锚定（JSON 数组），非法为空态 */
  private parseRange(): RangeState {
    const raw = this.getAttr('value', '')
    if (!raw) return { start: null, end: null }
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length === 2) {
        const t = this.pickerType
        const one = (s: unknown): Date | null => {
          const str = String(s ?? '')
          if (t === 'yearrange') return /^\d{4}$/.test(str) ? new Date(Number(str), 0, 1) : null
          const d = parseISODate(str)
          if (!d) return null
          if (t === 'monthrange') return new Date(d.getFullYear(), d.getMonth(), 1)
          return startOfDay(d)
        }
        return { start: one(arr[0]), end: one(arr[1]) }
      }
    } catch {
      /* 非法 JSON 走空态 */
    }
    return { start: null, end: null }
  }

  /** 全部选中日期（multiple 时为 JSON 数组展开；其余类型返回单个或空） */
  private selectedAnchorArray(): Date[] {
    const raw = this.getAttr('value', '')
    if (!raw) return []
    if (this.isMultiple()) {
      try {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr
            .map((s) => parseISODate(String(s)))
            .filter((d): d is Date => !!d)
            .map(startOfDay)
        }
      } catch {
        /* 非 JSON 数组走单值兜底 */
      }
      // 单值兜底：非 multiple 初始值切到 multiple 时不丢已选日期
      const d = parseISODate(raw)
      if (d) return [startOfDay(d)]
      return []
    }
    const d = this.parseValueAnchor(raw)
    return d ? [d] : []
  }

  /**
   * 手输解析（宽松分隔符）：date（yyyy-MM-dd / yyyy/M/d / yyyyMMdd）、month（yyyy-MM /
   * yyyy年M月 / yyyyMM）、year（yyyy）、week（yyyy-Wnn）、quarter（yyyy-Qn）、
   * datetime（日期 + 空格或 T + H:mm[:ss]）。非法返回 null。
   */
  private parseInputValue(text: string): Date | null {
    const t = this.pickerType
    const s = text.trim()
    if (!s) return null
    const valid = (y: number, mo: number, d: number): Date | null => {
      const dt = new Date(y, mo - 1, d)
      if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
      return dt
    }
    if (t === 'year') {
      return /^\d{4}$/.test(s) ? new Date(Number(s), 0, 1) : null
    }
    if (t === 'week') return parseWeekValue(s)
    if (t === 'quarter') {
      const m = /^(\d{4})\s*[- ]?\s*[Qq]?\s*([1-4])$/.exec(s)
      return m ? new Date(Number(m[1]), (Number(m[2]) - 1) * 3, 1) : null
    }
    if (t === 'month') {
      const body = s.replace(/\D+$/, '')
      const m8 = /^(\d{4})(\d{2})$/.exec(body)
      if (m8) return valid(Number(m8[1]), Number(m8[2]), 1) ? new Date(Number(m8[1]), Number(m8[2]) - 1, 1) : null
      const m = /^(\d{4})\D?(\d{1,2})$/.exec(body)
      if (!m) return null
      const d = valid(Number(m[1]), Number(m[2]), 1)
      return d ? new Date(d.getFullYear(), d.getMonth(), 1) : null
    }
    // date / datetime：日期段 + 可选时间段
    const dm = s.split(/[T\s]+/)
    const datePart = dm[0] ?? ''
    let y = 0
    let mo = 1
    let dy = 1
    const d8 = /^(\d{4})(\d{2})(\d{2})$/.exec(datePart)
    if (d8) {
      y = Number(d8[1])
      mo = Number(d8[2])
      dy = Number(d8[3])
    } else {
      const m = /^(\d{4})\D(\d{1,2})\D(\d{1,2})\D?$/.exec(datePart)
      if (!m) return null
      y = Number(m[1])
      mo = Number(m[2])
      dy = Number(m[3])
    }
    const base = valid(y, mo, dy)
    if (!base) return null
    // datetime 容忍纯日期键入（时刻 00:00:00）；date 收到日期 + 时刻也按日期精度截断
    if (t === 'date' || dm.length < 2) return startOfDay(base)
    const tm = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(dm[1] ?? '')
    if (!tm) return null
    const h = Number(tm[1])
    const mi = Number(tm[2])
    const se = Number(tm[3] ?? 0)
    if (h > 23 || mi > 59 || se > 59) return null
    base.setHours(h, mi, se, 0)
    return base
  }

  /** 键入候选是否可提交：min/max（日精度）与 disabledDate 联合校验 */
  private isAcceptableDate(d: Date): boolean {
    const min = parseISODate(this.getAttr('min', ''))
    const max = parseISODate(this.getAttr('max', ''))
    const day = startOfDay(d)
    if (min && day < startOfDay(min)) return false
    if (max && day > startOfDay(max)) return false
    if (this._disabledDate && this._disabledDate(d)) return false
    return true
  }

  // ---- 触发器（输入框化 + 手输通道） ----

  private syncTrigger(): void {
    const i = this.triggerEl
    if (!i) return
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')
    i.disabled = disabled
    i.readOnly = disabled || readonly || !this.isEditableType()
    const placeholder = this.getAttr('placeholder', this.t('datePicker.placeholder'))
    i.placeholder = placeholder
    i.setAttribute('aria-label', placeholder)
    if (!this.typing) i.value = this.displayText()
    const clearBtn = this.shadow.querySelector<HTMLElement>('[part="clear"]')
    if (clearBtn) {
      clearBtn.setAttribute('aria-label', this.t('input.clear'))
      clearBtn.hidden = !(
        this.hasAttr('clearable') &&
        !disabled &&
        !readonly &&
        this.getAttr('value', '') !== ''
      )
    }
  }

  /** trigger 显示文本（空值为空串，占位交给 placeholder） */
  private displayText(): string {
    const raw = this.getAttr('value', '')
    if (!raw) return ''
    if (this.isRangeType()) {
      const r = this.parseRange()
      if (!r.start || !r.end) return ''
      return `${this.formatAnchor(r.start)} ~ ${this.formatAnchor(r.end)}`
    }
    if (this.isMultiple()) {
      const dates = this.selectedAnchorArray()
      if (!dates.length) return ''
      return dates.map((d) => this.formatDisplay(d)).join(this.t('datePicker.join'))
    }
    const anchor = this.parseValueAnchor(raw)
    if (!anchor) return ''
    const t = this.pickerType
    if (t === 'datetime') {
      const full = parseISODate(raw)
      return full ? formatToken(full, this.currentFormat(), resolveLocale(this)) : ''
    }
    return this.formatDisplay(anchor)
  }

  /** 手输提交：合法且可接受 → 写值派发 oas-change；非法/为空 → 回退原显示（非破坏） */
  private commitTyped(): void {
    const i = this.triggerEl
    if (!i || !this.typing) return
    this.typing = false
    if (!this.isEditableType() || this.hasAttr('readonly') || this.injectDisabled()) {
      i.value = this.displayText()
      return
    }
    const text = i.value.trim()
    if (text === '') {
      i.value = this.displayText()
      return
    }
    const d = this.parseInputValue(text)
    if (d && this.isAcceptableDate(d)) {
      const value = this.formatCommitValue(d)
      if (value !== this.getAttr('value', '')) {
        this.setAttribute('value', value)
        this.emit('change', { value })
        return
      }
    }
    i.value = this.displayText()
  }

  /** 手输提交值：datetime 直接取键入时刻（面板 this.time 是打开面板时的旧状态） */
  private formatCommitValue(d: Date): string {
    if (this.pickerType === 'datetime') {
      return `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    }
    return this.formatAnchor(d)
  }

  /** Esc/取消：丢弃未提交键入，回退当前值显示 */
  private revertInput(): void {
    this.typing = false
    const i = this.triggerEl
    if (i) i.value = this.displayText()
  }

  /** clearable：清空值并派发 oas-clear（detail 为清空前的值）+ oas-change（空值）；readonly 拦截 */
  private clearValue(): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    const prev = this.getAttr('value', '')
    if (prev === '') return
    let prevDetail: string | string[] = prev
    if (this.isRangeType() || this.isMultiple()) {
      try {
        const arr = JSON.parse(prev)
        if (Array.isArray(arr)) prevDetail = arr.map(String)
      } catch {
        /* 保持原串 */
      }
    }
    this.removeAttribute('value')
    this.emit('clear', { value: prevDetail })
    this.emit('change', { value: '' })
    this.syncTrigger()
    this.triggerEl?.focus()
  }

  private handleTriggerKey(e: KeyboardEvent): void {
    if (this.injectDisabled()) return
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault()
      this.commitTyped()
      if (!this.openState) this.requestOpen(true)
    } else if (e.key === 'Escape' && this.openState) {
      e.preventDefault()
      this.revertInput()
      this.requestOpen(false)
    }
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.revertInput()
      this.requestOpen(false)
    }
  }

  /** placement 解析：12 向（默认 bottom-start）；非法值回落 bottom-start + console.warn（仅告警一次） */
  private resolvePlacement(): Placement {
    const raw = this.getAttr('placement', 'bottom-start')
    if ((VALID_PLACEMENTS as readonly string[]).includes(raw)) return raw as Placement
    if (!this.placementWarned) {
      this.placementWarned = true
      console.warn(
        `[oas-date-picker] 非法 placement "${raw}"，已回落 bottom-start（支持 12 向：top/bottom/left/right × start/end）`,
      )
    }
    return 'bottom-start'
  }

  /**
   * 交叉轴对齐自动调整：宽面板（range 双月 480px）在 start 对齐下贴视口右缘会右溢出 →
   * 翻转 end（面板右缘对齐触发器右缘，保持视觉连接）；反之左溢出时 end → start。
   * 调整后仍不足交给 computePosition 的视口夹取兜底。
   */
  private adjustCrossAlignment(
    anchor: DOMRect,
    popup: DOMRect,
    viewport: { width: number; height: number },
    padding: number,
    placement: Placement,
  ): Placement {
    const main = placement.split('-')[0] as string
    // left/right 系列交叉轴是垂直向，溢出交给引擎垂直夹取
    if (main !== 'top' && main !== 'bottom') return placement
    if (placement.endsWith('-start') && anchor.left + popup.width > viewport.width - padding) {
      return `${main}-end` as Placement
    }
    if (placement.endsWith('-end') && anchor.right - popup.width < padding) {
      return `${main}-start` as Placement
    }
    return placement
  }

  /**
   * fixed 定位：锚定 trigger，面板尺寸落定后计算（碰撞翻转/右对齐/视口夹取），
   * 结果写入 style.top/left 与 data-placement（真实浏览器像素级断言钩子）
   */
  private positionDropdown(): void {
    if (!this.dropdown || !this.triggerEl) return
    const anchorRect = this.triggerEl.getBoundingClientRect()
    const popupRect = this.dropdown.getBoundingClientRect()
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const padding = 8 // 视口夹取边距：range 双月面板 480px 宽，避让余量更足
    const placement = this.adjustCrossAlignment(
      anchorRect,
      popupRect,
      viewport,
      padding,
      this.resolvePlacement(),
    )
    const {
      top,
      left,
      placement: actual,
    } = computePosition(
      anchorRect,
      popupRect,
      placement,
      viewport,
      4, // 保持既有「触发器下方 4px」视觉间距
      true,
      { collisionPadding: padding },
    )
    this.dropdown.style.top = `${top}px`
    this.dropdown.style.left = `${left}px`
    this.dropdown.setAttribute('data-placement', actual)
  }

  // ---- 面板渲染 ----

  private renderPanel(focusNow: boolean): void {
    const panel = this.panel
    if (!panel) return
    const t = this.pickerType
    if (t === 'month') {
      panel.classList.remove('range-panel')
      this.renderMonthPanel(panel)
    } else if (t === 'quarter') {
      panel.classList.remove('range-panel')
      this.renderQuarterPanel(panel)
    } else if (t === 'year') {
      panel.classList.remove('range-panel')
      this.renderYearPanel(panel)
    } else if (this.isRangeType()) {
      panel.classList.add('range-panel')
      this.renderRangePanel(panel, focusNow)
    } else {
      panel.classList.remove('range-panel')
      this.renderDatePanel(panel, focusNow)
    }
    // 面板内容落定后重定位：首开（尺寸可测）/换月/切子面板/外部改值重渲均覆盖
    if (this.openState) this.positionDropdown()
  }

  /** 面板骨架：预设栏（位置感知）+ 主体容器；返回主体节点供各面板填充 */
  private panelSkeleton(panel: HTMLElement): HTMLElement {
    const left = this.getAttr('shortcuts-position', 'bottom') === 'left'
    panel.classList.toggle('shortcuts-left', left && this.shortcutItems().length > 0)
    panel.innerHTML = `${this.shortcutsMarkup()}<div class="panel-body"></div>`
    this.bindShortcuts(panel)
    return panel.querySelector<HTMLElement>('.panel-body')!
  }

  private renderDatePanel(panel: HTMLElement, focusNow: boolean): void {
    const locale = resolveLocale(this)
    const t = this.pickerType
    const body = this.panelSkeleton(panel)
    const yearNav = this.subPanel === 'months'
    body.innerHTML = `
      <div class="header">
        <button type="button" class="nav" part="prev"
          aria-label="${yearNav ? this.t('calendar.prevYear') : this.t('calendar.prevMonth')}">‹</button>
        <button type="button" class="title" part="title"></button>
        <button type="button" class="nav" part="next"
          aria-label="${yearNav ? this.t('calendar.nextYear') : this.t('calendar.nextMonth')}">›</button>
      </div>
      <div class="grid" part="grid" role="grid"></div>
      ${t === 'datetime' ? '<div class="time-section" part="time-section"></div>' : ''}
      <div class="footer">
        <button type="button" class="today" part="today">${this.t('calendar.today')}</button>
        ${t === 'datetime' ? `<button type="button" class="confirm" part="confirm">${this.t('datePicker.confirm')}</button>` : ''}
      </div>
    `
    const grid = body.querySelector<HTMLElement>('[part="grid"]')!
    const title = body.querySelector<HTMLElement>('[part="title"]')!
    title.textContent =
      this.subPanel === 'months'
        ? formatYear(this.viewDate, locale)
        : formatYearMonth(this.viewDate, locale)

    if (this.subPanel === 'months') {
      this.buildMonthCells(grid, this.viewDate.getFullYear(), {
        onPick: (m) => {
          this.viewDate = new Date(this.viewDate.getFullYear(), m, 1)
          this.subPanel = 'days'
          this.renderPanel(false)
        },
      })
    } else {
      this.renderDaysGrid(grid, focusNow)
    }
    if (t === 'datetime') this.renderTimeSection()

    const prev = body.querySelector<HTMLButtonElement>('[part="prev"]')!
    const next = body.querySelector<HTMLButtonElement>('[part="next"]')!
    prev.disabled = !this.canStepDays(this.viewDate, -1)
    next.disabled = !this.canStepDays(this.viewDate, 1)
    prev.addEventListener('click', () => this.stepView(-1))
    next.addEventListener('click', () => this.stepView(1))
    title.addEventListener('click', () => {
      this.subPanel = this.subPanel === 'days' ? 'months' : 'days'
      this.renderPanel(false)
    })
    body.querySelector<HTMLElement>('[part="today"]')?.addEventListener('click', () =>
      this.pickToday(),
    )
    body.querySelector<HTMLElement>('[part="confirm"]')?.addEventListener('click', () =>
      this.confirmDateTime(),
    )
    grid.addEventListener('keydown', (e) => this.handleGridKey(e as KeyboardEvent, grid, 0))
  }

  private renderDaysGrid(grid: HTMLElement, focusNow: boolean): void {
    const t = this.pickerType
    const multi = this.isMultiple()
    const selectedList = multi ? this.selectedAnchorArray() : []
    const selected =
      t === 'datetime' ? this.pendingDate : multi ? selectedList : this.parseValueAnchor(this.getAttr('value', ''))
    let focus: Date
    if (this.focusDate) focus = this.focusDate
    else if (multi && selectedList.length) focus = selectedList[selectedList.length - 1]!
    else if (selected instanceof Date) focus = selected
    else focus = startOfDay(new Date())
    const showWeekNumber = this.hasAttr('show-week-number') || t === 'week'
    grid.classList.toggle('has-week-number', showWeekNumber)
    renderPickerMonthGrid(grid, {
      viewDate: this.viewDate,
      locale: resolveLocale(this),
      weekStart: this.effectiveWeekStart(),
      selected,
      today: new Date(),
      min: parseISODate(this.getAttr('min', '')),
      max: parseISODate(this.getAttr('max', '')),
      disabledDate: this._disabledDate ?? undefined,
      showWeekNumber,
      selectedWeek:
        t === 'week'
          ? (() => {
              const anchor = this.parseValueAnchor(this.getAttr('value', ''))
              return anchor ? { year: isoWeekYear(anchor), week: isoWeek(anchor) } : null
            })()
          : null,
      onSelect: (d) => this.selectDay(d),
    })
    this.fillCells(grid)
    setRovingTab(grid, focus)
    if (focusNow) {
      const cell = findDayButton(grid, focus)
      cell?.focus()
    }
  }

  private renderTimeSection(): void {
    const section = this.panel?.querySelector<HTMLElement>('[part="time-section"]')
    if (!section) return
    this.buildTimeColumns(section, this.time)
  }

  /** 时间三列（datetime 单区 / datetimerange 起止区共用） */
  private buildTimeColumns(section: HTMLElement, parts: TimeParts): void {
    section.innerHTML = ''
    for (const unit of ['h', 'm', 's'] as const) {
      const col = document.createElement('div')
      col.className = 'time-col'
      col.setAttribute('data-unit', unit)
      col.setAttribute('role', 'listbox')
      const count = unit === 'h' ? 24 : 60
      for (let v = 0; v < count; v++) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'time-option'
        btn.setAttribute('data-value', String(v))
        btn.setAttribute('role', 'option')
        btn.textContent = pad(v)
        if (parts[unit] === v) btn.classList.add('selected')
        btn.addEventListener('click', () => {
          parts[unit] = v
          this.renderPanel(false)
        })
        col.appendChild(btn)
      }
      section.appendChild(col)
    }
  }

  private renderMonthPanel(panel: HTMLElement): void {
    const locale = resolveLocale(this)
    const body = this.panelSkeleton(panel)
    const year = this.viewDate.getFullYear()
    const selected = this.parseValueAnchor(this.getAttr('value', ''))
    body.innerHTML = `
      <div class="header">
        <button type="button" class="nav" part="prev" aria-label="${this.t('calendar.prevYear')}">‹</button>
        <span class="title" part="title"></span>
        <button type="button" class="nav" part="next" aria-label="${this.t('calendar.nextYear')}">›</button>
      </div>
      <div class="months"></div>
    `
    body.querySelector<HTMLElement>('[part="title"]')!.textContent = formatYear(this.viewDate, locale)
    const wrap = body.querySelector<HTMLElement>('.months')!
    this.buildMonthCells(wrap, year, {
      selectedMonth: selected?.getFullYear() === year ? selected.getMonth() : -1,
      onPick: (m) => {
        if (this.hasAttr('readonly')) return
        const value = `${year}-${pad(m + 1)}`
        this.setAttribute('value', value)
        this.emit('change', { value })
        this.requestOpen(false)
      },
    })
    const prev = body.querySelector<HTMLButtonElement>('[part="prev"]')!
    const next = body.querySelector<HTMLButtonElement>('[part="next"]')!
    prev.disabled = !this.canStepYears(year, -1)
    next.disabled = !this.canStepYears(year, 1)
    prev.addEventListener('click', () => {
      this.viewDate = addYears(this.viewDate, -1)
      this.renderPanel(false)
    })
    next.addEventListener('click', () => {
      this.viewDate = addYears(this.viewDate, 1)
      this.renderPanel(false)
    })
  }

  private renderQuarterPanel(panel: HTMLElement): void {
    const locale = resolveLocale(this)
    const body = this.panelSkeleton(panel)
    const year = this.viewDate.getFullYear()
    const selected = this.parseValueAnchor(this.getAttr('value', ''))
    const selectedQuarter =
      selected?.getFullYear() === year ? Math.floor(selected.getMonth() / 3) : -1
    body.innerHTML = `
      <div class="header">
        <button type="button" class="nav" part="prev" aria-label="${this.t('calendar.prevYear')}">‹</button>
        <span class="title" part="title"></span>
        <button type="button" class="nav" part="next" aria-label="${this.t('calendar.nextYear')}">›</button>
      </div>
      <div class="quarters"></div>
    `
    body.querySelector<HTMLElement>('[part="title"]')!.textContent = formatYear(this.viewDate, locale)
    const wrap = body.querySelector<HTMLElement>('.quarters')!
    const min = parseISODate(this.getAttr('min', ''))
    const max = parseISODate(this.getAttr('max', ''))
    for (let q = 0; q < 4; q++) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'quarter-cell'
      btn.setAttribute('part', 'quarter-cell')
      btn.setAttribute('data-quarter', `${year}-Q${q + 1}`)
      btn.textContent = `Q${q + 1}`
      const qStart = new Date(year, q * 3, 1)
      const qEnd = new Date(year, q * 3 + 3, 0)
      const disabled =
        (min != null && qEnd < startOfDay(min)) || (max != null && qStart > startOfDay(max))
      if (disabled) btn.classList.add('disabled')
      if (q === selectedQuarter) btn.classList.add('selected')
      btn.setAttribute('aria-label', formatYearMonth(qStart, locale))
      btn.setAttribute('aria-disabled', String(disabled))
      btn.addEventListener('click', () => {
        if (disabled || this.hasAttr('readonly')) return
        const value = `${year}-Q${q + 1}`
        this.setAttribute('value', value)
        this.emit('change', { value })
        this.requestOpen(false)
      })
      wrap.appendChild(btn)
    }
    const prev = body.querySelector<HTMLButtonElement>('[part="prev"]')!
    const next = body.querySelector<HTMLButtonElement>('[part="next"]')!
    prev.disabled = !this.canStepYears(year, -1)
    next.disabled = !this.canStepYears(year, 1)
    prev.addEventListener('click', () => {
      this.viewDate = addYears(this.viewDate, -1)
      this.renderPanel(false)
    })
    next.addEventListener('click', () => {
      this.viewDate = addYears(this.viewDate, 1)
      this.renderPanel(false)
    })
  }

  private renderYearPanel(panel: HTMLElement): void {
    const body = this.panelSkeleton(panel)
    // viewDate 即页锚（boot/翻页均保持 12 年页对齐）
    const start = this.viewDate.getFullYear()
    const selected = this.parseValueAnchor(this.getAttr('value', ''))
    body.innerHTML = `
      <div class="header">
        <button type="button" class="nav" part="prev" aria-label="${this.t('calendar.prevYear')}">‹</button>
        <span class="title" part="title"></span>
        <button type="button" class="nav" part="next" aria-label="${this.t('calendar.nextYear')}">›</button>
      </div>
      <div class="years"></div>
    `
    body.querySelector<HTMLElement>('[part="title"]')!.textContent = `${start}-${start + 11}`
    const wrap = body.querySelector<HTMLElement>('.years')!
    this.buildYearCells(wrap, start, {
      selectedYear: selected?.getFullYear() ?? -1,
      minYear: parseISODate(this.getAttr('min', ''))?.getFullYear() ?? null,
      maxYear: parseISODate(this.getAttr('max', ''))?.getFullYear() ?? null,
      onPick: (y) => {
        if (this.hasAttr('readonly')) return
        const value = String(y)
        this.setAttribute('value', value)
        this.emit('change', { value })
        this.requestOpen(false)
      },
    })
    const prev = body.querySelector<HTMLButtonElement>('[part="prev"]')!
    const next = body.querySelector<HTMLButtonElement>('[part="next"]')!
    prev.disabled = !this.canStepDecade(start, -1)
    next.disabled = !this.canStepDecade(start, 1)
    prev.addEventListener('click', () => {
      this.viewDate = addYears(this.viewDate, -12)
      this.renderPanel(false)
    })
    next.addEventListener('click', () => {
      this.viewDate = addYears(this.viewDate, 12)
      this.renderPanel(false)
    })
  }

  /** 范围面板（daterange / datetimerange / monthrange / yearrange）：双栏各自带导航头 */
  private renderRangePanel(panel: HTMLElement, focusNow: boolean): void {
    const locale = resolveLocale(this)
    const t = this.pickerType
    const body = this.panelSkeleton(panel)
    const unit: 'day' | 'month' | 'year' =
      t === 'monthrange' ? 'month' : t === 'yearrange' ? 'year' : 'day'
    const viewA = this.viewDate
    const viewB = this.rangeSecondView()
    body.innerHTML = `
      <div class="range-grids">
        <div class="range-grid">
          <div class="header">
            <button type="button" class="nav" part="prev" aria-label=""></button>
            <span class="title" part="title"></span>
            <button type="button" class="nav" part="next" aria-label=""></button>
          </div>
          <div class="grid" part="grid" role="grid" data-month="0"></div>
        </div>
        <div class="range-grid">
          <div class="header">
            <button type="button" class="nav" part="prev" aria-label=""></button>
            <span class="title" part="title"></span>
            <button type="button" class="nav" part="next" aria-label=""></button>
          </div>
          <div class="grid" part="grid" role="grid" data-month="1"></div>
        </div>
      </div>
      ${t === 'datetimerange' ? '<div class="time-sections"><div class="time-section" data-side="start" part="time-section"></div><div class="time-section" data-side="end" part="time-section"></div></div>' : ''}
      ${t === 'datetimerange' ? `<div class="footer"><span></span><button type="button" class="confirm" part="confirm">${this.t('datePicker.confirm')}</button></div>` : ''}
    `
    const gridsEls = [...body.querySelectorAll<HTMLElement>('[part="grid"]')]
    const titles = [...body.querySelectorAll<HTMLElement>('.range-grid .title')]
    const range = { start: this.range.start, end: this.range.end ?? this.previewEnd }

    const titleOf = (view: Date): string => {
      if (unit === 'day') return formatYearMonth(view, locale)
      if (unit === 'month') return formatYear(view, locale)
      const y = view.getFullYear()
      const s = y - (y % 10)
      return `${s}-${s + 11}`
    }
    titles[0]!.textContent = titleOf(viewA)
    titles[1]!.textContent = titleOf(viewB)

    const renderOne = (grid: HTMLElement, view: Date): void => {
      if (unit === 'day') {
        renderPickerMonthGrid(grid, {
          viewDate: view,
          locale,
          weekStart: this.effectiveWeekStart(),
          today: new Date(),
          min: parseISODate(this.getAttr('min', '')),
          max: parseISODate(this.getAttr('max', '')),
          disabledDate: this._disabledDate ?? undefined,
          showWeekNumber: this.hasAttr('show-week-number'),
          range,
          onSelect: (d) => this.selectRangeAnchor(startOfDay(d)),
          onCellHover: (d) => this.hoverRangeAnchor(startOfDay(d)),
        })
        this.fillCells(grid)
        grid.classList.toggle('has-week-number', this.hasAttr('show-week-number'))
      } else if (unit === 'month') {
        this.buildMonthCells(grid, view.getFullYear(), {
          range,
          min: parseISODate(this.getAttr('min', '')),
          max: parseISODate(this.getAttr('max', '')),
          onPick: (m) => this.selectRangeAnchor(new Date(view.getFullYear(), m, 1)),
          onHover: (m) => this.hoverRangeAnchor(new Date(view.getFullYear(), m, 1)),
        })
      } else {
        const y = view.getFullYear()
        const s = y - (y % 10)
        this.buildYearCells(grid, s, {
          range,
          minYear: parseISODate(this.getAttr('min', ''))?.getFullYear() ?? null,
          maxYear: parseISODate(this.getAttr('max', ''))?.getFullYear() ?? null,
          onPick: (yy) => this.selectRangeAnchor(new Date(yy, 0, 1)),
          onHover: (yy) => this.hoverRangeAnchor(new Date(yy, 0, 1)),
        })
      }
    }
    renderOne(gridsEls[0]!, viewA)
    renderOne(gridsEls[1]!, viewB)

    if (t === 'datetimerange') {
      const sections = body.querySelectorAll<HTMLElement>('[part="time-section"]')
      if (sections[0]) this.buildTimeColumns(sections[0], this.time)
      if (sections[1]) this.buildTimeColumns(sections[1], this.time2)
    }

    const focus = this.focusDate ?? this.range.start ?? startOfDay(new Date())
    if (unit === 'day') {
      const targetGrid = findDayButton(gridsEls[0]!, focus) ? gridsEls[0]! : gridsEls[1]!
      setRovingTab(targetGrid, focus)
      if (focusNow) findDayButton(targetGrid, focus)?.focus()
    }
    gridsEls.forEach((grid, idx) => {
      grid.addEventListener('keydown', (e) => this.handleGridKey(e as KeyboardEvent, grid, idx))
    })

    // 导航：linked 模式双栏同翻；unlink-panels 各自独立
    const navBtns = [...body.querySelectorAll<HTMLButtonElement>('.range-grid [part="prev"], .range-grid [part="next"]')]
    const canStepOf = (idx: number, dir: 1 | -1): boolean => {
      const view = idx === 0 ? viewA : viewB
      if (unit === 'day') return this.canStepDays(view, dir)
      if (unit === 'month') return this.canStepYears(view.getFullYear(), dir)
      return this.canStepDecade(view.getFullYear() - (view.getFullYear() % 10), dir)
    }
    navBtns.forEach((btn) => {
      const grid = btn.closest('.range-grid') as HTMLElement
      const idx = grid.querySelector<HTMLElement>('[part="grid"]')?.getAttribute('data-month') === '1' ? 1 : 0
      const dir: 1 | -1 = btn.getAttribute('part') === 'next' ? 1 : -1
      btn.disabled = !canStepOf(idx, dir)
      btn.addEventListener('click', () => this.stepRangeView(idx, dir))
    })

    body.querySelector<HTMLElement>('[part="confirm"]')?.addEventListener('click', () =>
      this.confirmDateTimeRange(),
    )
  }

  /** 12 格年单元格构建（year 面板 + yearrange 双栏共用） */
  private buildYearCells(
    container: HTMLElement,
    startYear: number,
    opts: {
      selectedYear?: number
      range?: { start: Date | null; end: Date | null } | null
      minYear?: number | null
      maxYear?: number | null
      onPick: (y: number) => void
      onHover?: (y: number) => void
    },
  ): void {
    container.innerHTML = ''
    const wrap = document.createElement('div')
    wrap.className = 'years'
    const range = opts.range ?? null
    const sameY = (a: Date, y: number): boolean => a.getFullYear() === y
    for (let i = 0; i < 12; i++) {
      const y = startYear + i
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'year-cell'
      btn.setAttribute('part', 'year-cell')
      btn.setAttribute('data-year', String(y))
      btn.textContent = String(y)
      const disabled =
        (opts.minYear != null && y < opts.minYear) || (opts.maxYear != null && y > opts.maxYear)
      if (disabled) btn.classList.add('disabled')
      if (opts.selectedYear === y) btn.classList.add('selected')
      if (range) {
        if (range.start && sameY(range.start, y)) btn.classList.add('range-start')
        if (range.end && sameY(range.end, y)) btn.classList.add('range-end')
        if (
          range.start &&
          range.end &&
          y > range.start.getFullYear() &&
          y < range.end.getFullYear()
        ) {
          btn.classList.add('in-range')
        }
      }
      btn.setAttribute('aria-label', String(y))
      btn.setAttribute('aria-disabled', String(disabled))
      btn.addEventListener('click', () => {
        if (disabled) return
        opts.onPick(y)
      })
      if (opts.onHover) btn.addEventListener('mouseenter', () => opts.onHover?.(y))
      wrap.appendChild(btn)
    }
    container.appendChild(wrap)
  }

  /** 12 格月单元格构建（month 面板 / date 面板子面板 / monthrange 双栏共用） */
  private buildMonthCells(
    container: HTMLElement,
    year: number,
    opts: {
      selectedMonth?: number
      range?: { start: Date | null; end: Date | null } | null
      min?: Date | null
      max?: Date | null
      disabledDate?: (d: Date) => boolean
      onPick: (m: number) => void
      onHover?: (m: number) => void
    },
  ): void {
    const locale = resolveLocale(this)
    container.innerHTML = ''
    const wrap = document.createElement('div')
    wrap.className = 'months'
    const range = opts.range ?? null
    const min = opts.min ? startOfDay(opts.min) : null
    const max = opts.max ? startOfDay(opts.max) : null
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(year, m, 1)
      const mEnd = new Date(year, m + 1, 0)
      const disabled =
        (min != null && mEnd < min) ||
        (max != null && mStart > max) ||
        (opts.disabledDate?.(mStart) ?? false)
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'month-cell'
      btn.setAttribute('part', 'month-cell')
      btn.setAttribute('data-month', `${year}-${pad(m + 1)}`)
      btn.textContent = new Intl.DateTimeFormat(locale, { month: 'short' }).format(mStart)
      btn.setAttribute('aria-label', formatYearMonth(mStart, locale))
      if (disabled) btn.classList.add('disabled')
      if (opts.selectedMonth === m) btn.classList.add('selected')
      if (range) {
        const sameM = (a: Date): boolean =>
          a.getFullYear() === year && a.getMonth() === m
        if (range.start && sameM(range.start)) btn.classList.add('range-start')
        if (range.end && sameM(range.end)) btn.classList.add('range-end')
        if (
          range.start &&
          range.end &&
          mStart > range.start &&
          mStart < range.end
        ) {
          btn.classList.add('in-range')
        }
      }
      btn.setAttribute('aria-disabled', String(disabled))
      btn.addEventListener('click', () => {
        if (disabled) return
        opts.onPick(m)
      })
      if (opts.onHover) btn.addEventListener('mouseenter', () => opts.onHover?.(m))
      wrap.appendChild(btn)
    }
    container.appendChild(wrap)
  }

  /**
   * 自定义单元格渲染（对齐 oas-calendar 的 cell 双通道）：
   * 1. `template[slot="cell"]` 克隆到每个日单元格，`[data-cell-date]` 节点自动绑定日期数字；
   * 2. 每个单元格派发 `oas-cell-render`，detail `{ date, element }`。
   * 每次网格重建都会执行并重派发，宿主监听须幂等。
   */
  private fillCells(grid: HTMLElement): void {
    const tpl = this.querySelector<HTMLTemplateElement>('template[slot="cell"]')
    for (const btn of grid.querySelectorAll<HTMLButtonElement>('.day')) {
      const date = parseISODate(btn.dataset.date ?? '')
      if (!date) continue
      if (tpl) {
        btn.textContent = ''
        btn.appendChild(tpl.content.cloneNode(true))
        const binder = btn.querySelector<HTMLElement>('[data-cell-date]')
        if (binder) binder.textContent = String(date.getDate())
      }
      this.emit('cell-render', { date, element: btn })
    }
  }

  // ---- 导航（含 min/max 边界置灰 / unlink-panels） ----

  /** unlink 时第二栏独立锚；linked 恒由 viewDate 派生下一单元 */
  private rangeSecondView(): Date {
    if (this.hasAttr('unlink-panels')) return this.viewDate2
    return this.nextUnit(this.viewDate)
  }

  /** 当前类型下「下一单元」视图（day=+1 月，month=+1 年，year=+12 年页） */
  private nextUnit(view: Date): Date {
    const t = this.pickerType
    if (t === 'monthrange') return addYears(view, 1)
    if (t === 'yearrange') return addYears(view, 12)
    return addMonths(view, 1)
  }

  /** 年网格页锚（年代起始年，如 2024 → 2020；boot 时对齐，翻页按 12 年整页平移） */
  private yearPageStart(view: Date): Date {
    const y = view.getFullYear()
    return new Date(y - (y % 10), 0, 1)
  }

  /** linked 模式把第二栏锚点同步为 viewDate 的下一单元；unlink 只保证不早于第一栏 */
  private syncLinkedSecond(): void {
    if (this.hasAttr('unlink-panels')) {
      if (this.viewDate2 <= this.viewDate) this.viewDate2 = this.nextUnit(this.viewDate)
      return
    }
    this.viewDate2 = this.nextUnit(this.viewDate)
  }

  private stepView(dir: 1 | -1): void {
    if (this.subPanel === 'months') this.viewDate = addYears(this.viewDate, dir)
    else this.viewDate = addMonths(this.viewDate, dir)
    this.syncLinkedSecond()
    this.renderPanel(false)
  }

  private stepRangeView(gridIndex: number, dir: 1 | -1): void {
    const t = this.pickerType
    const step = (view: Date): Date => {
      if (t === 'monthrange') return addYears(view, dir)
      if (t === 'yearrange') return addYears(view, dir * 12)
      return addMonths(view, dir)
    }
    if (this.hasAttr('unlink-panels')) {
      if (gridIndex === 0) this.viewDate = step(this.viewDate)
      else this.viewDate2 = step(this.viewDate2)
    } else {
      this.viewDate = step(this.viewDate)
      this.syncLinkedSecond()
    }
    this.renderPanel(false)
  }

  private canStepDays(view: Date, dir: 1 | -1): boolean {
    const min = parseISODate(this.getAttr('min', ''))
    const max = parseISODate(this.getAttr('max', ''))
    if (dir < 0) {
      if (!min) return true
      const prevEnd = new Date(view.getFullYear(), view.getMonth(), 0)
      return !(prevEnd < startOfDay(min))
    }
    if (!max) return true
    const nextStart = new Date(view.getFullYear(), view.getMonth() + 1, 1)
    return !(nextStart > startOfDay(max))
  }

  private canStepYears(year: number, dir: 1 | -1): boolean {
    const min = parseISODate(this.getAttr('min', ''))
    const max = parseISODate(this.getAttr('max', ''))
    if (dir < 0) {
      if (!min) return true
      return !(new Date(year - 1, 11, 31) < startOfDay(min))
    }
    if (!max) return true
    return !(new Date(year + 1, 0, 1) > startOfDay(max))
  }

  private canStepDecade(startYear: number, dir: 1 | -1): boolean {
    const min = parseISODate(this.getAttr('min', ''))?.getFullYear() ?? null
    const max = parseISODate(this.getAttr('max', ''))?.getFullYear() ?? null
    if (dir < 0) {
      if (min == null) return true
      return startYear - 1 >= min
    }
    if (max == null) return true
    return startYear + 12 <= max
  }

  // ---- 交互 ----

  /** 生效的快捷预设：用户 property 优先，未设置时用内置默认（label 走 locale） */
  private shortcutItems(): ShortcutItem[] {
    return this._shortcuts ?? this.defaultShortcuts()
  }

  private defaultShortcuts(): ShortcutItem[] {
    const t = this.pickerType
    if (t === 'daterange' || t === 'datetimerange') {
      return [
        { label: this.t('datePicker.shortcutToday'), getValue: () => this.todayRange() },
        { label: this.t('datePicker.shortcutThisWeek'), getValue: () => this.weekRange() },
        { label: this.t('datePicker.shortcutThisMonth'), getValue: () => this.monthRange() },
        { label: this.t('datePicker.shortcutThisYear'), getValue: () => this.yearRange() },
      ]
    }
    if (t === 'date') {
      return [{ label: this.t('datePicker.shortcutToday'), getValue: () => new Date() }]
    }
    if (t === 'datetime') {
      return [{ label: this.t('datePicker.shortcutToday'), getValue: () => new Date() }]
    }
    if (t === 'month') {
      return [
        {
          label: this.t('datePicker.shortcutThisMonth'),
          getValue: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      ]
    }
    if (t === 'monthrange') {
      return [
        {
          label: this.t('datePicker.shortcutThisMonth'),
          getValue: () => {
            const m = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            return [m, m] as [Date, Date]
          },
        },
      ]
    }
    if (t === 'year') {
      return [
        {
          label: this.t('datePicker.shortcutThisYear'),
          getValue: () => new Date(new Date().getFullYear(), 0, 1),
        },
      ]
    }
    if (t === 'yearrange') {
      return [
        {
          label: this.t('datePicker.shortcutThisYear'),
          getValue: () => {
            const y = new Date(new Date().getFullYear(), 0, 1)
            return [y, y] as [Date, Date]
          },
        },
      ]
    }
    if (t === 'week') {
      return [{ label: this.t('datePicker.shortcutThisWeek'), getValue: () => this.weekRange()[0] }]
    }
    return []
  }

  private shortcutsMarkup(): string {
    const items = this.shortcutItems()
    if (!items.length) return ''
    const labels = items
      .map(
        (it, i) =>
          `<button type="button" class="shortcut" part="shortcut" data-index="${i}">${escapeHtml(it.label)}</button>`,
      )
      .join('')
    return `<div class="shortcuts" part="shortcuts">${labels}</div>`
  }

  private bindShortcuts(panel: HTMLElement): void {
    const items = this.shortcutItems()
    for (const btn of panel.querySelectorAll<HTMLElement>('.shortcut')) {
      const idx = Number(btn.dataset.index)
      btn.addEventListener('click', () => {
        const item = items[idx]
        if (item) this.applyShortcut(item)
      })
    }
  }

  private applyShortcut(item: ShortcutItem): void {
    if (this.hasAttr('readonly')) return
    const t = this.pickerType
    if (this.isRangeType()) {
      const r = this.resolveShortcutRange(item)
      if (!r) return
      this.range = { start: r.start, end: r.end }
      let value: string | [string, string]
      if (t === 'datetimerange') {
        const s = `${toISODate(r.start)}T00:00:00`
        const e = `${toISODate(r.end)}T23:59:59`
        value = [s, e]
      } else {
        const prevType = this.pickerType
        value = [this.formatWithType(r.start, prevType), this.formatWithType(r.end, prevType)]
      }
      this.setAttribute('value', JSON.stringify(value))
      this.emit('change', { value })
      this.requestOpen(false)
      return
    }
    const d = this.resolveShortcutDate(item)
    if (!d) return
    const value = this.formatAnchor(d)
    this.setAttribute('value', value)
    this.emit('change', { value })
    this.requestOpen(false)
  }

  /** 范围端点值格式（shortcut/calendar-change 共用，不带时间分量） */
  private formatWithType(d: Date, t: PickerType): string {
    if (t === 'monthrange') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    if (t === 'yearrange') return String(d.getFullYear())
    return toISODate(d)
  }

  /** 解析单值快捷预设，命中禁用日期返回 null（不应用） */
  private resolveShortcutDate(item: ShortcutItem): Date | null {
    let d: Date | null = null
    if (item.getValue) {
      const v = item.getValue()
      d = Array.isArray(v) ? v[0] : v
    } else if (typeof item.value === 'string') {
      d = parseISODate(item.value)
    }
    if (!d) return null
    const s = startOfDay(d)
    if (this._disabledDate && this._disabledDate(s)) return null
    return s
  }

  /** 解析范围快捷预设（端点早于起点时自动对调），命中禁用日期返回 null */
  private resolveShortcutRange(item: ShortcutItem): { start: Date; end: Date } | null {
    let start: Date | null = null
    let end: Date | null = null
    if (item.getValue) {
      const v = item.getValue()
      if (Array.isArray(v) && v.length === 2) {
        start = startOfDay(v[0])
        end = startOfDay(v[1])
      }
    } else if (Array.isArray(item.value) && item.value.length === 2) {
      start = parseISODate(item.value[0])
      end = parseISODate(item.value[1])
    }
    if (!start || !end) return null
    if (end < start) {
      const tmp = start
      start = end
      end = tmp
    }
    if (this._disabledDate && (this._disabledDate(start) || this._disabledDate(end))) return null
    return { start, end }
  }

  private todayRange(): [Date, Date] {
    const t = startOfDay(new Date())
    return [t, t]
  }

  private weekRange(): [Date, Date] {
    const ws = getWeekStart(resolveLocale(this))
    const today = new Date()
    const diff = (today.getDay() + 7 - ws) % 7
    const start = new Date(today)
    start.setDate(today.getDate() - diff)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return [startOfDay(start), startOfDay(end)]
  }

  private monthRange(): [Date, Date] {
    const today = new Date()
    return [new Date(today.getFullYear(), today.getMonth(), 1), startOfDay(today)]
  }

  private yearRange(): [Date, Date] {
    const today = new Date()
    return [new Date(today.getFullYear(), 0, 1), startOfDay(today)]
  }

  private pickToday(): void {
    if (this.hasAttr('readonly')) return
    const t = this.pickerType
    const today = startOfDay(new Date())
    if (t === 'datetime') {
      this.pendingDate = today
      this.viewDate = today
      this.renderPanel(false)
    } else {
      this.selectDay(today)
    }
  }

  private selectDay(d: Date): void {
    if (this.hasAttr('readonly')) return
    this.focusDate = startOfDay(d)
    const t = this.pickerType
    if (t === 'datetime') {
      this.pendingDate = startOfDay(d)
      this.renderPanel(false)
      return
    }
    if (this.isMultiple()) {
      const iso = toISODate(d)
      const before = this.selectedAnchorArray()
      const list = before.filter((x) => toISODate(x) !== iso)
      if (list.length === before.length) list.push(startOfDay(d))
      const values = list.map(toISODate)
      this.setAttribute('value', JSON.stringify(values))
      this.emit('change', { value: values })
      // 保持面板打开，支持连续点选（setAttribute 触发 update 重渲染高亮）
      return
    }
    const value = this.formatAnchor(d)
    this.setAttribute('value', value)
    this.emit('change', { value })
    this.requestOpen(false)
  }

  private confirmDateTime(): void {
    if (this.hasAttr('readonly') || !this.pendingDate) return
    const value = `${toISODate(this.pendingDate)}T${this.partsToString(this.time)}`
    this.setAttribute('value', value)
    this.emit('change', { value })
    this.emit('confirm', { value })
    this.requestOpen(false)
  }

  private confirmDateTimeRange(): void {
    if (this.hasAttr('readonly') || !this.range.start || !this.range.end) return
    const s = `${toISODate(this.range.start)}T${this.partsToString(this.time)}`
    const e = `${toISODate(this.range.end)}T${this.partsToString(this.time2)}`
    const value = [s, e]
    this.setAttribute('value', JSON.stringify(value))
    this.emit('change', { value })
    this.emit('confirm', { value })
    this.requestOpen(false)
  }

  /** 范围端点落选（daterange/datetimerange/monthrange/yearrange 共用），每次落选派发 oas-calendar-change */
  private selectRangeAnchor(d: Date): void {
    if (this.hasAttr('readonly')) return
    this.focusDate = d
    this.previewEnd = null
    const emitCalendar = (): void => {
      const t = this.pickerType
      this.emit('calendar-change', {
        value: [
          this.formatWithType(this.range.start as Date, t),
          this.range.end ? this.formatWithType(this.range.end, t) : null,
        ],
      })
    }
    if (!this.range.start || this.range.end) {
      this.range = { start: d, end: null }
    } else if (d < this.range.start) {
      this.range = { start: d, end: null }
    } else {
      this.range = { ...this.range, end: d }
      emitCalendar()
      if (this.pickerType === 'datetimerange') {
        this.renderPanel(false)
        return
      }
      this.commitRange()
      return
    }
    emitCalendar()
    this.renderPanel(false)
  }

  private hoverRangeAnchor(d: Date): void {
    if (!this.range.start || this.range.end) return
    if (!this.previewEnd || this.previewEnd.getTime() !== d.getTime()) {
      this.previewEnd = d
      if (this.panel) this.renderPanel(false)
    }
  }

  private commitRange(): void {
    if (!this.range.start || !this.range.end) return
    const value = [
      this.formatWithType(this.range.start, this.pickerType),
      this.formatWithType(this.range.end, this.pickerType),
    ]
    this.setAttribute('value', JSON.stringify(value))
    this.emit('change', { value })
    this.requestOpen(false)
  }

  private gridContainingDate(d: Date): HTMLElement | null {
    for (const g of this.panel?.querySelectorAll<HTMLElement>('.grid') ?? []) {
      if (findDayButton(g, d)) return g
    }
    return null
  }

  /** 键盘目标日期不在当前网格时平移视图（单值跟随目标月；范围保持双栏连续） */
  private shiftViewToDate(next: Date, gridIndex: number): void {
    if (!this.isRangeType()) {
      this.viewDate = new Date(next.getFullYear(), next.getMonth(), 1)
      this.syncLinkedSecond()
      return
    }
    const target = new Date(next.getFullYear(), next.getMonth(), 1)
    if (this.hasAttr('unlink-panels')) {
      if (gridIndex === 0) this.viewDate = target
      else this.viewDate2 = target
    } else {
      this.viewDate = gridIndex === 0 ? target : addMonths(target, -1)
      this.syncLinkedSecond()
    }
  }

  private handleGridKey(e: KeyboardEvent, grid: HTMLElement, gridIndex: number): void {
    if (this.subPanel === 'months') return
    const t = this.pickerType
    const anchor = t === 'datetime' ? this.pendingDate : this.focusDate ?? this.parseValueAnchor(this.getAttr('value', ''))
    const focus = anchor ?? startOfDay(new Date())
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      findDayButton(grid, focus)?.click()
      return
    }
    const next = movePickerGridDate(focus, e.key, this.effectiveWeekStart(), e.shiftKey)
    if (!next) return
    if (!this.isAcceptableDate(next)) return
    e.preventDefault()
    this.focusDate = next
    if (!findDayButton(grid, next)) this.shiftViewToDate(next, gridIndex)
    this.renderPanel(false)
    const g = this.gridContainingDate(next) ?? grid
    findDayButton(g, next)?.focus()
  }

  /** size/status 镜像到宿主 data-*（供 :host([data-*]) 样式消费），error 联动 aria-invalid */
  private syncSizeStatus(): void {
    const size = normalizeChoice(this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
    this.setAttribute('data-size', size)
    const status = normalizeChoice(this.getAttr('status', ''), '', VALID_STATUSES)
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')
    if (status === 'error') {
      if (!this.hasAttribute('aria-invalid')) this.invalidByStatus = true
      this.setAttribute('aria-invalid', 'true')
    } else if (this.invalidByStatus) {
      this.invalidByStatus = false
      this.removeAttribute('aria-invalid')
    }
  }
}
