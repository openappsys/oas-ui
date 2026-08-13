import { OASElement } from '@oas-ui/core'
import {
  resolveLocale,
  startOfDay,
  toISODate,
  parseISODate,
  addMonths,
  addYears,
  formatYearMonth,
  formatYear,
  findDayButton,
  setRovingTab,
  renderMonthGrid,
  moveGridDate,
  type GridCell,
} from './date-grid.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  padding: var(--oas-space-3);
  box-sizing: border-box;
}
[part='header'] {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  margin-bottom: var(--oas-space-2);
}
[part='header'] button {
  appearance: none;
  border: none;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  color: var(--oas-color-text-primary);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-md);
  height: var(--oas-control-height-md);
  min-width: var(--oas-control-height-md);
  padding: 0 var(--oas-space-1);
}
[part='header'] button:hover {
  background: var(--oas-color-bg-hover);
}
[part='header'] button:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
[part='title'] {
  flex: 1;
  text-align: center;
  font-size: var(--oas-font-size-md);
  font-weight: 500;
  white-space: nowrap;
}
[part='today'] {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-primary);
}
[part='today']:hover {
  color: var(--oas-color-primary-hover);
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
[part='grid'] .weekday {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--oas-control-height-md);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
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
[part='grid'] .months {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--oas-space-1);
}
[part='grid'] .month-cell {
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
[part='grid'] .month-cell:hover {
  background: var(--oas-color-bg-hover);
}
[part='grid'] .month-cell:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
[part='grid'] .month-cell.selected {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
`

export class OASCalendar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'mode', 'min', 'max', 'show-week-number']
  }

  private viewDate: Date = startOfDay(new Date())
  private focusDate: Date | null = null
  private monthPanel = false
  private userNavigated = false
  private grid: HTMLElement | null = null
  private _disabledDate: ((d: Date) => boolean) | null = null
  /** mode 变化检测：首帧吸收初始值不派发，之后任何 mode 属性变化（宿主/内部）都派发 oas-mode-change */
  private lastMode = 'month'
  private modeInit = false

  /** disabled-date 走 property（回调无法用 JSON 表达），设置后即时重渲 */
  get disabledDate(): ((d: Date) => boolean) | null {
    return this._disabledDate
  }

  set disabledDate(fn: ((d: Date) => boolean) | null) {
    this._disabledDate = fn
    if (this.isConnected) this.update()
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="calendar" part="calendar">
        <div class="header" part="header">
          <button type="button" class="nav prev" part="prev" aria-label=""></button>
          <button type="button" class="title" part="title" aria-live="polite"></button>
          <button type="button" class="nav next" part="next" aria-label=""></button>
          <button type="button" class="today" part="today" hidden></button>
        </div>
        <div class="grid" part="grid" role="grid"></div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定导航/标题/今天/网格键盘事件（render 与水合路径共用） */
  private bind(): void {
    this.grid = this.shadow.querySelector<HTMLElement>('[part="grid"]')
    this.shadow
      .querySelector<HTMLElement>('[part="prev"]')
      ?.addEventListener('click', () => this.navigate(-1))
    this.shadow
      .querySelector<HTMLElement>('[part="next"]')
      ?.addEventListener('click', () => this.navigate(1))
    this.shadow
      .querySelector<HTMLElement>('[part="title"]')
      ?.addEventListener('click', () => this.togglePanel())
    this.shadow
      .querySelector<HTMLElement>('[part="today"]')
      ?.addEventListener('click', () => this.goToday())
    this.grid?.addEventListener('keydown', (e) => this.handleGridKey(e as KeyboardEvent))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（header 与 grid 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="header"]')) return false
    if (!this.shadow.querySelector('[part="grid"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const locale = resolveLocale(this)
    const mode = this.getAttr('mode', 'month')
    // mode 属性变化统一派发 oas-mode-change（受控宿主可据此重新设置 mode 保持模式）
    if (!this.modeInit) {
      this.lastMode = mode
      this.modeInit = true
    } else if (mode !== this.lastMode) {
      this.lastMode = mode
      this.emit('mode-change', { mode })
    }
    const selected = this.selectedDate()
    // 未主动导航时，viewDate 跟随 value
    if (!this.userNavigated && selected) this.viewDate = startOfDay(selected)

    const title = this.shadow.querySelector<HTMLElement>('[part="title"]')
    if (title) {
      title.textContent =
        this.monthPanel || mode === 'year'
          ? formatYear(this.viewDate, locale)
          : formatYearMonth(this.viewDate, locale)
    }
    const yearNav = this.monthPanel || mode === 'year'
    this.shadow
      .querySelector<HTMLElement>('[part="prev"]')
      ?.setAttribute(
        'aria-label',
        yearNav ? this.t('calendar.prevYear') : this.t('calendar.prevMonth'),
      )
    this.shadow
      .querySelector<HTMLElement>('[part="next"]')
      ?.setAttribute(
        'aria-label',
        yearNav ? this.t('calendar.nextYear') : this.t('calendar.nextMonth'),
      )
    const todayBtn = this.shadow.querySelector<HTMLElement>('[part="today"]')
    if (todayBtn) {
      todayBtn.hidden = this.monthPanel || mode !== 'month'
      todayBtn.textContent = this.t('calendar.today')
    }
    this.renderGrid(false)
  }

  private selectedDate(): Date | null {
    const raw = this.getAttr('value', '')
    if (!raw) return null
    const d = parseISODate(raw)
    if (!d) return null
    if (this.getAttr('mode', 'month') === 'year') return new Date(d.getFullYear(), d.getMonth(), 1)
    return startOfDay(d)
  }

  private renderGrid(focusNow: boolean): void {
    const grid = this.grid
    if (!grid) return
    const locale = resolveLocale(this)
    const mode = this.getAttr('mode', 'month')
    const selected = this.selectedDate()

    if (this.monthPanel || mode === 'year') {
      grid.classList.add('months-view')
      this.renderMonthPicker(grid)
      return
    }
    grid.classList.remove('months-view')
    grid.classList.toggle('has-week-number', this.hasAttr('show-week-number'))

    const hadFocus =
      focusNow || (this.shadow.activeElement != null && grid.contains(this.shadow.activeElement))
    const focus = this.focusDate ?? selected ?? startOfDay(new Date())

    renderMonthGrid(grid, {
      viewDate: this.viewDate,
      locale,
      selected,
      today: new Date(),
      min: parseISODate(this.getAttr('min', '')),
      max: parseISODate(this.getAttr('max', '')),
      disabledDate: this._disabledDate ?? undefined,
      showWeekNumber: this.hasAttr('show-week-number'),
      onSelect: (d) => this.selectDate(d),
    })
    this.fillCells(grid)
    setRovingTab(grid, focus)
    if (hadFocus) {
      const cell = findDayButton(grid, focus)
      cell?.focus()
    }
  }

  /**
   * 自定义单元格渲染（对齐 select 的 option-render 机制，双通道）：
   * 1. `template[slot="cell"]` 克隆到每个日单元格，`[data-cell-date]` 节点自动绑定日期数字；
   * 2. 每个单元格派发 `oas-cell-render`，detail `{ date, element }`，宿主可追加标记/徽标/富文本。
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

  private renderMonthPicker(grid: HTMLElement): void {
    const locale = resolveLocale(this)
    const year = this.viewDate.getFullYear()
    const selected = this.selectedDate()
    const mode = this.getAttr('mode', 'month')
    const selectedMonth =
      mode === 'year' && selected?.getFullYear() === year ? selected.getMonth() : -1
    const cells: GridCell[] = []
    for (let m = 0; m < 12; m++) {
      cells.push({ date: new Date(year, m, 1), inMonth: true })
    }
    grid.innerHTML = ''
    const months = document.createElement('div')
    months.className = 'months'
    for (let m = 0; m < 12; m++) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'month-cell'
      btn.setAttribute('part', 'month-cell')
      btn.textContent = new Intl.DateTimeFormat(locale, { month: 'short' }).format(
        new Date(year, m, 1),
      )
      btn.setAttribute('aria-label', formatYearMonth(new Date(year, m, 1), locale))
      if (m === selectedMonth) btn.classList.add('selected')
      btn.addEventListener('click', () => this.selectMonth(m))
      months.appendChild(btn)
    }
    grid.appendChild(months)
  }

  private navigate(dir: 1 | -1): void {
    this.userNavigated = true
    const mode = this.getAttr('mode', 'month')
    if (mode === 'year' || this.monthPanel) {
      this.viewDate = addYears(this.viewDate, dir)
    } else {
      this.viewDate = addMonths(this.viewDate, dir)
    }
    this.update()
  }

  private togglePanel(): void {
    if (this.getAttr('mode', 'month') !== 'month') return
    this.monthPanel = !this.monthPanel
    this.update()
  }

  private goToday(): void {
    const today = startOfDay(new Date())
    this.viewDate = today
    this.focusDate = today
    this.monthPanel = false
    this.userNavigated = true
    this.update()
  }

  private selectDate(d: Date): void {
    const iso = toISODate(d)
    this.setAttribute('value', iso)
    this.emit('change', { value: iso })
    this.focusDate = startOfDay(d)
    this.update()
  }

  private selectMonth(m: number): void {
    const mode = this.getAttr('mode', 'month')
    const value = `${this.viewDate.getFullYear()}-${String(m + 1).padStart(2, '0')}`
    if (mode === 'year') {
      // 年模式选中月份：更新 value 并切回月视图＼�。
      // 受控宿主可监听 oas-mode-change 后重新设置 mode="year" 保持年模式。
      this.setAttribute('value', value)
      this.viewDate = new Date(this.viewDate.getFullYear(), m, 1)
      this.userNavigated = true
      this.monthPanel = false
      this.setAttribute('mode', 'month') // update() 内统一派发 oas-mode-change
      this.emit('change', { value })
      this.update()
      return
    }
    // month 模式：月选择面板选月 → 回到日视图
    this.viewDate = new Date(this.viewDate.getFullYear(), m, 1)
    this.monthPanel = false
    this.userNavigated = true
    this.update()
  }

  private handleGridKey(e: KeyboardEvent): void {
    const grid = this.grid
    if (!grid) return
    const mode = this.getAttr('mode', 'month')
    // 月/年选择面板走原生按钮行为（Tab / Enter / Space）
    if (this.monthPanel || mode === 'year') return
    const focus = this.focusDate ?? this.selectedDate() ?? startOfDay(new Date())
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      findDayButton(grid, focus)?.click()
      return
    }
    const next = moveGridDate(focus, e.key)
    if (!next) return
    const cell = findDayButton(grid, next)
    if (!cell || cell.classList.contains('disabled')) return
    e.preventDefault()
    this.focusDate = next
    this.renderGrid(true)
  }
}
