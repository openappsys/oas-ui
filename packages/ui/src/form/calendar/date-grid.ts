/**
 * date-grid —— 日期网格共享模块（calendar / date-picker / time-picker 复用）。
 *
 * 职责边界：
 * - 纯日期计算：月网格展开、ISO 序列化/解析、键盘移动、ISO 周号、范围钳制
 * - 格式化：token 格式化（yyyy/MM/dd/HH/mm/ss，Intl.DateTimeFormat 感知，禁止手写格式化）、
 *   完整日期描述（aria-label）、年月标题、周起始/周头标签
 * - DOM 渲染：renderMonthGrid 一次性渲染一个月网格（周头/周号/禁用/选中/范围高亮）
 *
 * 约定：全部使用本地时区（组件 value 存 ISO 字符串，展示用本地 Date）。
 */
import { findConfigProvider } from '@oas-ui/core'
import { getLocaleName } from '@oas-ui/i18n'

export interface GridCell {
  date: Date
  inMonth: boolean
}

export interface MonthGridRenderOptions {
  viewDate: Date
  locale: string
  /** 周起始覆写（0-6，first-day-of-week）；缺省随 locale 推导 */
  weekStart?: number
  /** 选中日期（multiple 多选场景为数组，所有选中日同样高亮） */
  selected?: Date | Date[] | null
  today?: Date
  min?: Date | null
  max?: Date | null
  disabledDate?: (d: Date) => boolean
  showWeekNumber?: boolean
  /** daterange 范围高亮：start/end 为选中（或悬停预览）的端点 */
  range?: { start: Date | null; end: Date | null } | null
  onSelect: (d: Date) => void
  onCellHover?: (d: Date) => void
}

/** 就近读取组件生效 locale（config-provider 注入 > 全局 registry），供 Intl 格式化使用 */
export function resolveLocale(el: Element): string {
  const provider = findConfigProvider(el)
  const injected = provider?.getAttribute('locale')
  return injected && injected !== '' ? injected : getLocaleName()
}

/** 周起始：中文语言系周一起始，其余默认周日 */
export function getWeekStart(locale: string): 0 | 1 {
  return /^zh/i.test(locale) ? 1 : 0
}

/** 任意周起始归一化（0=周日 … 6=周六）；非有限值回退 0，负数/溢出回绕 */
export function normalizeWeekStart(ws: number): number {
  const n = Math.trunc(ws)
  if (Number.isNaN(n)) return 0
  return ((n % 7) + 7) % 7
}

export function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

/** 月份平移（结果对齐到目标月 1 日，规避 31 号溢出） */
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

export function addYears(d: Date, n: number): Date {
  return new Date(d.getFullYear() + n, d.getMonth(), 1)
}

/** 月份平移（保留日序，目标月日数不足时钳制到月末，如 3-31 → 2-28） */
export function addMonthsClamped(d: Date, n: number): Date {
  const day = d.getDate()
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const dim = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(day, dim))
}

/** 年份平移（保留月/日，2-29 跨平年时钳制到 2-28） */
export function addYearsClamped(d: Date, n: number): Date {
  const day = d.getDate()
  const target = new Date(d.getFullYear() + n, d.getMonth(), 1)
  const dim = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(day, dim))
}

/** 本地时区 ISO 日期（yyyy-MM-dd），与 Date.toISOString() 的 UTC 语义区分 */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 解析 ISO 日期/日期时间（yyyy-MM-dd 或 yyyy-MM 或 yyyy-MM-ddTHH:mm:ss，本地时区），非法返回 null */
export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?)?$/.exec(s)
  if (!m) return null
  const day = m[3] != null ? Number(m[3]) : 1
  const d = new Date(Number(m[1]), Number(m[2]) - 1, day)
  if (m[4] != null) d.setHours(Number(m[4]), Number(m[5] ?? 0), Number(m[6] ?? 0), 0)
  // 越界字段（如 13 月/40 日）会被 Date 回绕而不产生 NaN，需逐字段校验
  if (
    Number.isNaN(d.getTime()) ||
    d.getFullYear() !== Number(m[1]) ||
    d.getMonth() !== Number(m[2]) - 1 ||
    d.getDate() !== day
  ) {
    return null
  }
  return d
}

/** 当月完整网格：按周起始展开为 4~6 行 x 7 列（含前后月补位），与周头一一对应 */
export function buildMonthCells(viewDate: Date, locale: string, weekStart?: number): GridCell[] {
  const ws = weekStart != null ? normalizeWeekStart(weekStart) : getWeekStart(locale)
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const offset = (first.getDay() + 7 - ws) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - offset)
  const weeks = Math.ceil((offset + daysInMonth(first)) / 7)
  const cells: GridCell[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push({ date: d, inMonth: d.getMonth() === viewDate.getMonth() })
  }
  return cells
}

/** ISO 8601 周号 */
export function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/** 周头标签（narrow，locale 感知），按任意周起始（0-6）重排 */
export function weekdayLabels(locale: string, weekStart: number): string[] {
  const names: string[] = []
  for (let i = 0; i < 7; i++) {
    // 2026-01-04 为周日，作为基准行
    names.push(
      new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(2026, 0, 4 + i)),
    )
  }
  const ws = normalizeWeekStart(weekStart)
  return [...names.slice(ws), ...names.slice(0, ws)]
}

/** 把时间钳制到 [min, max]（日精度） */
export function clampDate(d: Date, min: Date | null, max: Date | null): Date {
  let r = startOfDay(d)
  if (min) {
    const mi = startOfDay(min)
    if (r < mi) r = new Date(mi)
  }
  if (max) {
    const ma = startOfDay(max)
    if (r > ma) r = new Date(ma)
  }
  return r
}

/**
 * token 格式化（yyyy/MM/dd/HH/mm/ss）。数值全部来自 Intl.DateTimeFormat.formatToParts，
 * 不手写补零；HH 用 hourCycle: 'h23'（00-23），避免部分环境午夜=24 的方言差异。
 */
export function formatToken(date: Date, token: string, locale: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) {
    if (p.type === 'year') map['yyyy'] = p.value
    else if (p.type === 'month') map['MM'] = p.value
    else if (p.type === 'day') map['dd'] = p.value
    else if (p.type === 'hour') map['HH'] = p.value
    else if (p.type === 'minute') map['mm'] = p.value
    else if (p.type === 'second') map['ss'] = p.value
  }
  return token.replace(/yyyy|MM|dd|HH|mm|ss/g, (m) => map[m] ?? m)
}

/** 完整日期描述（aria-label），如「2026年8月9日」/「August 9, 2026」 */
export function formatLongDate(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

/** 年月标题，如「2026年8月」 */
export function formatYearMonth(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(d)
}

/** 年标题 */
export function formatYear(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(d)
}

/**
 * 键盘网格移动（方向键 + WAI-ARIA date grid 扩展键）：
 * - ↑↓←→：±1 天 / ±7 天（跨月自动回绕）
 * - Home/End：按生效周起始（weekStart，0-6）跳所在周首/末日
 * - PageUp/PageDown：跳上一/下一月同日；Shift 时跳上一/下一年同日（月末钳制）
 * 未识别的键返回 null。
 */
export function moveGridDate(
  d: Date,
  key: string,
  weekStart = 0,
  shift = false,
): Date | null {
  const ws = normalizeWeekStart(weekStart)
  const y = d.getFullYear()
  const m = d.getMonth()
  const day = d.getDate()
  switch (key) {
    case 'ArrowLeft':
      return new Date(y, m, day - 1)
    case 'ArrowRight':
      return new Date(y, m, day + 1)
    case 'ArrowUp':
      return new Date(y, m, day - 7)
    case 'ArrowDown':
      return new Date(y, m, day + 7)
    case 'Home': {
      const offset = (d.getDay() + 7 - ws) % 7
      return new Date(y, m, day - offset)
    }
    case 'End': {
      const offset = (d.getDay() + 7 - ws) % 7
      return new Date(y, m, day + (6 - offset))
    }
    case 'PageUp':
      return shift ? addYearsClamped(d, -1) : addMonthsClamped(d, -1)
    case 'PageDown':
      return shift ? addYearsClamped(d, 1) : addMonthsClamped(d, 1)
    default:
      return null
  }
}

/** 在容器中按 ISO 日期找日单元格按钮 */
export function findDayButton(container: HTMLElement, date: Date): HTMLButtonElement | null {
  return container.querySelector<HTMLButtonElement>(`.day[data-date="${toISODate(date)}"]`)
}

/** roving tabindex：只有目标日期所在的日按钮 tabindex=0，其余 -1 */
export function setRovingTab(container: HTMLElement, date: Date): void {
  for (const b of container.querySelectorAll<HTMLButtonElement>('.day')) b.tabIndex = -1
  const target = findDayButton(container, date)
  if (target) target.tabIndex = 0
}

/**
 * 渲染一个月网格到 container（先清空再重建）。样式由调用方 CSS 以
 * .weekdays/.weekday/.week/.day/.week-number 及 .today/.selected/.disabled/
 * .outside/.in-range/.range-start/.range-end 类名控制。
 */
export function renderMonthGrid(container: HTMLElement, opts: MonthGridRenderOptions): void {
  const { viewDate, locale, onSelect } = opts
  const ws = opts.weekStart != null ? normalizeWeekStart(opts.weekStart) : getWeekStart(locale)
  const cells = buildMonthCells(viewDate, locale, ws)
  const today = opts.today ? startOfDay(opts.today) : null
  const selectedList = (
    opts.selected ? (Array.isArray(opts.selected) ? opts.selected : [opts.selected]) : []
  )
    .map(startOfDay)
    .filter((d) => !Number.isNaN(d.getTime()))
  const min = opts.min ? startOfDay(opts.min) : null
  const max = opts.max ? startOfDay(opts.max) : null
  const range = opts.range ?? null

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
  for (const label of weekdayLabels(locale, ws)) {
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
      if (selectedList.some((s) => isSameDay(d, s))) btn.classList.add('selected')
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
        onSelect(cell.date)
      })
      if (opts.onCellHover) {
        btn.addEventListener('mouseenter', () => opts.onCellHover?.(cell.date))
      }
      row.appendChild(btn)
    }
    container.appendChild(row)
  }
}
