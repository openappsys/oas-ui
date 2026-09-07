/**
 * picker-grid —— date-picker 面板专属网格模块。
 *
 * 与 `form/calendar/date-grid.ts` 的关系：date-grid 是跨组件共享的纯函数层（calendar /
 * date-picker / time-picker 复用），本模块只承载 date-picker 本轮新增、但 shared 层
 * 暂不扩展的能力（避免本轮改动波及 oas-calendar）：
 * - 任意周起始（0-6）的月网格展开与渲染（date-grid 仅支持 locale 推导的 0/1）
 * - week 类型的整周高亮判定
 * - 键盘移动扩展：Home / End / PageUp / PageDown（±Shift 换年）
 * - ISO 周值（yyyy-Wnn）的格式化与解析
 *
 * 类名契约与 date-grid.renderMonthGrid 保持一致（.weekdays/.weekday/.week/.day 与
 * .today/.selected/.disabled/.outside/.in-range/.range-start/.range-end/.week-number），
 * 两套面板 CSS 可并行消费。
 */
import { startOfDay, toISODate, isoWeek, formatLongDate, isSameDay, type GridCell } from '../calendar/date-grid.js'

export interface PickerGridOptions {
  viewDate: Date
  locale: string
  /** 周起始（0=周日 … 6=周六）；来自 first-day-of-week 覆写或 locale 推导 */
  weekStart: number
  /** 选中日期（multiple 多选场景为数组） */
  selected?: Date | Date[] | null
  /** week 类型：ISO 周（年 + 周号）匹配的整行高亮 */
  selectedWeek?: { year: number; week: number } | null
  today?: Date
  min?: Date | null
  max?: Date | null
  disabledDate?: (d: Date) => boolean
  showWeekNumber?: boolean
  /** 范围高亮：start/end 为选中（或悬停预览）的端点 */
  range?: { start: Date | null; end: Date | null } | null
  onSelect: (d: Date) => void
  onCellHover?: (d: Date) => void
}

/** 规范化周起始到 0-6 */
export function normalizeWeekStart(ws: number): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const n = Math.trunc(ws)
  if (Number.isNaN(n)) return 1
  return ((((n % 7) + 7) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6)
}

/** ISO 周历年份（该周周四所在年份，与周号配套使用） */
export function isoWeekYear(d: Date): number {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dayNum = date.getDay() || 7
  date.setDate(date.getDate() + 4 - dayNum)
  return date.getFullYear()
}

/** ISO 周值序列化：yyyy-Wnn */
export function formatWeekValue(d: Date): string {
  return `${isoWeekYear(d)}-W${String(isoWeek(d)).padStart(2, '0')}`
}

/** 解析 ISO 周值（yyyy-Wnn / yyyyWnn / yyyy 第 n 周），返回该周周一（锚定），非法返回 null */
export function parseWeekValue(s: string): Date | null {
  const m = /^(\d{4})\s*(?:-|W{0,1}|第)?\s*[Ww]?\s*(\d{1,2})\s*周?$/.exec(s.trim())
  if (!m) return null
  const y = Number(m[1])
  const w = Number(m[2])
  if (w < 1 || w > 53) return null
  const jan4 = new Date(y, 0, 4)
  const week1Monday = new Date(jan4)
  week1Monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const monday = new Date(week1Monday)
  monday.setDate(week1Monday.getDate() + (w - 1) * 7)
  if (isoWeekYear(monday) !== y || isoWeek(monday) !== w) return null
  return startOfDay(monday)
}

/** 任意周起始的月网格展开（含前后月补位） */
export function buildPickerCells(viewDate: Date, weekStart: number): GridCell[] {
  const ws = normalizeWeekStart(weekStart)
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const offset = (first.getDay() + 7 - ws) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - offset)
  const total = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()
  const weeks = Math.ceil((offset + total) / 7)
  const cells: GridCell[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push({ date: d, inMonth: d.getMonth() === viewDate.getMonth() })
  }
  return cells
}

/** 周头标签（narrow，locale 感知），按任意周起始轮转 */
export function pickerWeekdayLabels(locale: string, weekStart: number): string[] {
  const base: string[] = []
  for (let i = 0; i < 7; i++) {
    // 2026-01-04 为周日，作为基准行
    base.push(new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(2026, 0, 4 + i)))
  }
  const ws = normalizeWeekStart(weekStart)
  return [...base.slice(ws), ...base.slice(0, ws)]
}

/**
 * 渲染一个月网格到 container（先清空再重建）。类名契约与 date-grid.renderMonthGrid
 * 一致，差异点：支持任意周起始 + week 类型整周高亮。
 */
export function renderPickerMonthGrid(container: HTMLElement, opts: PickerGridOptions): void {
  const { viewDate, locale } = opts
  const ws = normalizeWeekStart(opts.weekStart)
  const cells = buildPickerCells(viewDate, ws)
  const today = opts.today ? startOfDay(opts.today) : null
  const selectedList = (
    opts.selected ? (Array.isArray(opts.selected) ? opts.selected : [opts.selected]) : []
  )
    .map(startOfDay)
    .filter((d) => !Number.isNaN(d.getTime()))
  const min = opts.min ? startOfDay(opts.min) : null
  const max = opts.max ? startOfDay(opts.max) : null
  const range = opts.range ?? null
  const week = opts.selectedWeek ?? null

  container.innerHTML = ''

  const header = document.createElement('div')
  header.className = 'weekdays'
  header.setAttribute('role', 'row')
  header.setAttribute('aria-hidden', 'true')
  if (opts.showWeekNumber) {
    const w = document.createElement('span')
    w.className = 'week-number'
    header.appendChild(w)
  }
  for (const label of pickerWeekdayLabels(locale, ws)) {
    const s = document.createElement('span')
    s.className = 'weekday'
    s.textContent = label
    header.appendChild(s)
  }
  container.appendChild(header)

  const weeks = cells.length / 7
  for (let w = 0; w < weeks; w++) {
    const row = document.createElement('div')
    row.className = 'week'
    row.setAttribute('role', 'row')
    const weekCells = cells.slice(w * 7, w * 7 + 7)
    if (opts.showWeekNumber && weekCells[0]) {
      const n = document.createElement('span')
      n.className = 'week-number'
      n.textContent = String(isoWeek(weekCells[0].date))
      row.appendChild(n)
    }
    for (const cell of weekCells) {
      const d = startOfDay(cell.date)
      const outOfRange = (min != null && d < min) || (max != null && d > max)
      const isDisabled = outOfRange || (opts.disabledDate?.(cell.date) ?? false)
      const weekMatch =
        week != null && isoWeekYear(d) === week.year && isoWeek(d) === week.week
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'day'
      btn.setAttribute('part', 'day')
      btn.setAttribute('role', 'gridcell')
      btn.textContent = String(d.getDate())
      btn.setAttribute('data-date', toISODate(d))
      btn.tabIndex = -1
      if (!cell.inMonth) btn.classList.add('outside')
      if (isDisabled) btn.classList.add('disabled')
      if (today && isSameDay(d, today)) btn.classList.add('today')
      if (selectedList.some((s) => isSameDay(d, s)) || weekMatch) btn.classList.add('selected')
      if (range) {
        if (range.start && isSameDay(d, range.start)) btn.classList.add('range-start')
        if (range.end && isSameDay(d, range.end)) btn.classList.add('range-end')
        if (range.start && range.end && d > range.start && d < range.end) {
          btn.classList.add('in-range')
        }
      }
      btn.setAttribute('aria-label', formatLongDate(cell.date, locale))
      btn.setAttribute('aria-disabled', String(isDisabled))
      btn.addEventListener('click', () => {
        if (isDisabled) return
        opts.onSelect(cell.date)
      })
      if (opts.onCellHover) {
        btn.addEventListener('mouseenter', () => opts.onCellHover?.(cell.date))
      }
      row.appendChild(btn)
    }
    container.appendChild(row)
  }
}

/** 月份平移（日期钳制到目标月末，如 3-31 → 2-28） */
export function addMonthsClamped(d: Date, n: number): Date {
  const day = d.getDate()
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const dim = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(day, dim))
}

/** 年份平移（日期钳制到 2-29 → 2-28） */
export function addYearsClamped(d: Date, n: number): Date {
  const day = d.getDate()
  const target = new Date(d.getFullYear() + n, d.getMonth(), 1)
  const dim = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(day, dim))
}

/**
 * 键盘网格移动（date-picker 扩展集）：方向键 ±1/±7 天；Home/End 跳周首尾（按生效周起始）；
 * PageUp/PageDown 换月，Shift 时换年（日期钳制到目标月/年的合法日）。
 * 未识别的键返回 null。
 */
export function movePickerGridDate(d: Date, key: string, weekStart: number, shift = false): Date | null {
  const ws = normalizeWeekStart(weekStart)
  switch (key) {
    case 'ArrowLeft':
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
    case 'ArrowRight':
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    case 'ArrowUp':
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7)
    case 'ArrowDown':
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)
    case 'Home': {
      const offset = (d.getDay() + 7 - ws) % 7
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset)
    }
    case 'End': {
      const offset = (d.getDay() + 7 - ws) % 7
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - offset))
    }
    case 'PageUp':
      return shift ? addYearsClamped(d, -1) : addMonthsClamped(d, -1)
    case 'PageDown':
      return shift ? addYearsClamped(d, 1) : addMonthsClamped(d, 1)
    default:
      return null
  }
}
