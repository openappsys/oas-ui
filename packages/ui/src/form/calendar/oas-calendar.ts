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
  getWeekStart,
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
/* 全局禁用：整体降透明 + 光标禁示意（数据态由 update 同步 data-disabled） */
:host([data-disabled]) {
  opacity: 0.6;
  cursor: not-allowed;
}
:host([data-disabled]) [part='header'] button {
  cursor: not-allowed;
}
:host([data-disabled]) [part='grid'] button {
  cursor: not-allowed;
}
:host([data-disabled]) [part='grid'] .day:hover,
:host([data-disabled]) [part='grid'] .month-cell:hover,
:host([data-disabled]) [part='grid'] .year-cell:hover {
  background: transparent;
}
/* readonly：可浏览不可提交，日格不指示可点 */
:host([readonly]) [part='grid'] .day {
  cursor: default;
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
[part='header'] button:hover:not(:disabled) {
  background: var(--oas-color-bg-hover);
}
[part='header'] button:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
/* 翻页边界（min/max 整页越界）/ 全局禁用：导航钮置灰 */
[part='header'] button:disabled {
  color: var(--oas-color-text-disabled);
  background: transparent;
  cursor: not-allowed;
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
[part='today']:hover:not(:disabled) {
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
[part='grid'] .month-cell:hover:not(.disabled) {
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
/* decade 年网格（月面板标题钻取，4 列 x 3 行） */
[part='grid'] .years {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--oas-space-1);
}
[part='grid'] .year-cell {
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
[part='grid'] .year-cell:hover:not(.disabled) {
  background: var(--oas-color-bg-hover);
}
[part='grid'] .year-cell:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
[part='grid'] .year-cell.selected {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
[part='grid'] .month-cell.disabled,
[part='grid'] .year-cell.disabled {
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
`

/** 面板层级：days 日网格 / months 12 月网格 / years decade 年网格（内部导航态） */
type PanelView = 'days' | 'months' | 'years'

export class OASCalendar extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'mode',
      'min',
      'max',
      'show-week-number',
      'first-day-of-week',
      'page-show-date',
      'disabled',
      'readonly',
    ]
  }

  private viewDate: Date = startOfDay(new Date())
  private focusDate: Date | null = null
  /** 导航面板状态机：日网格 → 月面板 → 十年网格（decade 快速跳年） */
  private panel: PanelView = 'days'
  private userNavigated = false
  /** page-show-date 上次已处理值：属性变化时重锚定面板月（受控），未变则不打断用户浏览 */
  private lastPageAnchor = ''
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

  /** 生效周起始：first-day-of-week 覆写（0-6）> locale 推导 */
  private effectiveWeekStart(): number {
    const raw = this.getAttr('first-day-of-week', '')
    if (/^[0-6]$/.test(raw)) return Number(raw)
    return getWeekStart(resolveLocale(this))
  }

  /** 当前面板所在「月页」锚点（day 1），用于 oas-panel-change / 页面对比 */
  private pageAnchor(): Date {
    return new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1)
  }

  private samePage(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
  }

  /** min/max（日精度）+ disabledDate 联合不可用判定（键盘移动预检） */
  private isDateUnavailable(d: Date): boolean {
    const s = startOfDay(d)
    const min = parseISODate(this.getAttr('min', ''))
    const max = parseISODate(this.getAttr('max', ''))
    if ((min != null && s < startOfDay(min)) || (max != null && s > startOfDay(max))) return true
    return this._disabledDate?.(d) ?? false
  }

  /**
   * 翻页边界：目标页整页落在 [min,max] 之外时禁止步进（导航钮置灰）。
   * 按当前面板层级判定步进单元：days=月、months=年、years=十年页。
   */
  private canStep(dir: 1 | -1): boolean {
    const min = parseISODate(this.getAttr('min', ''))
    const max = parseISODate(this.getAttr('max', ''))
    if (this.panel === 'days') {
      if (dir < 0) {
        if (!min) return true
        const prevEnd = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 0)
        return !(prevEnd < startOfDay(min))
      }
      if (!max) return true
      const nextStart = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1)
      return !(nextStart > startOfDay(max))
    }
    const year = this.viewDate.getFullYear()
    if (this.panel === 'months') {
      if (dir < 0) {
        if (!min) return true
        return !(new Date(year - 1, 11, 31) < startOfDay(min))
      }
      if (!max) return true
      return !(new Date(year + 1, 0, 1) > startOfDay(max))
    }
    // years：十年页（当前页起 12 年），dir 步进 ±12 年
    const minYear = min?.getFullYear() ?? null
    const maxYear = max?.getFullYear() ?? null
    if (dir < 0) {
      if (minYear == null) return true
      return year - 1 >= minYear
    }
    if (maxYear == null) return true
    return year + 12 <= maxYear
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
    this.shadow.querySelector<HTMLElement>('[part="prev"]')?.addEventListener('click', () => this.navigate(-1))
    this.shadow.querySelector<HTMLElement>('[part="next"]')?.addEventListener('click', () => this.navigate(1))
    this.shadow.querySelector<HTMLElement>('[part="title"]')?.addEventListener('click', () => this.onTitleClick())
    this.shadow.querySelector<HTMLElement>('[part="today"]')?.addEventListener('click', () => this.goToday())
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
      // 年视图退出（mode → month）：面板回到日网格
      if (mode === 'month') this.panel = 'days'
    }
    // year 视图本质即 12 月面板（内部导航层恒非 days）
    if (mode === 'year' && this.panel === 'days') this.panel = 'months'

    const selected = this.selectedDate()

    // 面板月锚点优先级：page-show-date（受控/初始锚定）> value 跟随 > 保持现页。
    // 锚点属性变化时才重锚定（含移除回退 value/当月）；未变化不打断用户浏览。
    const rawPage = this.getAttr('page-show-date', '')
    if (rawPage !== this.lastPageAnchor) {
      const releasing = this.lastPageAnchor !== '' && rawPage === ''
      this.lastPageAnchor = rawPage
      if (rawPage) {
        const p = parseISODate(rawPage)
        if (p) {
          this.viewDate = new Date(p.getFullYear(), p.getMonth(), 1)
          this.userNavigated = false
          this.focusDate = null
        }
      } else if (releasing) {
        // 锚点释放：回到 value 所在月，否则当月
        this.userNavigated = false
        this.focusDate = null
        this.viewDate = selected ? startOfDay(selected) : startOfDay(new Date())
      }
    } else if (!this.userNavigated && selected && this.lastPageAnchor === '') {
      // 未显式锚定且用户未手动翻页：value 变化时面板跟随
      this.viewDate = startOfDay(selected)
    }

    // 全局禁用态（config-provider 注入或自身 disabled 属性）→ 数据态 + inert 全停交互
    const dis = this.injectDisabled()
    this.toggleAttribute('data-disabled', dis)
    const rootEl = this.shadow.querySelector<HTMLElement>('[part="calendar"]')
    if (rootEl) rootEl.inert = dis

    const title = this.shadow.querySelector<HTMLElement>('[part="title"]')
    if (title) {
      title.textContent =
        this.panel === 'days'
          ? formatYearMonth(this.viewDate, locale)
          : this.panel === 'months'
            ? formatYear(this.viewDate, locale)
            : `${this.viewDate.getFullYear()}-${this.viewDate.getFullYear() + 11}`
    }
    const yearNav = this.panel !== 'days'
    const prev = this.shadow.querySelector<HTMLButtonElement>('[part="prev"]')
    const next = this.shadow.querySelector<HTMLButtonElement>('[part="next"]')
    prev?.setAttribute('aria-label', yearNav ? this.t('calendar.prevYear') : this.t('calendar.prevMonth'))
    next?.setAttribute('aria-label', yearNav ? this.t('calendar.nextYear') : this.t('calendar.nextMonth'))
    // min/max 翻页边界置灰 + 全局禁用
    if (prev) prev.disabled = dis || !this.canStep(-1)
    if (next) next.disabled = dis || !this.canStep(1)
    const todayBtn = this.shadow.querySelector<HTMLButtonElement>('[part="today"]')
    if (todayBtn) {
      todayBtn.hidden = this.panel !== 'days' || mode !== 'month'
      todayBtn.textContent = this.t('calendar.today')
      todayBtn.disabled = dis
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
    if (this.panel !== 'days') {
      grid.classList.add('months-view')
      grid.classList.remove('has-week-number')
      if (this.panel === 'years') this.renderYearsPicker(grid)
      else this.renderMonthPicker(grid)
      return
    }
    grid.classList.remove('months-view')
    grid.classList.toggle('has-week-number', this.hasAttr('show-week-number'))

    const hadFocus = focusNow || (this.shadow.activeElement != null && grid.contains(this.shadow.activeElement))
    const selected = this.selectedDate()
    const focus = this.focusDate ?? selected ?? startOfDay(new Date())

    renderMonthGrid(grid, {
      viewDate: this.viewDate,
      locale: resolveLocale(this),
      weekStart: this.effectiveWeekStart(),
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

  /** 12 月面板（mode=year 的常驻视图 / month 模式标题钻取的子面板共用） */
  private renderMonthPicker(grid: HTMLElement): void {
    const locale = resolveLocale(this)
    const year = this.viewDate.getFullYear()
    const selected = this.selectedDate()
    const min = parseISODate(this.getAttr('min', ''))
    const max = parseISODate(this.getAttr('max', ''))
    const selectedMonth = selected?.getFullYear() === year ? selected.getMonth() : -1
    grid.innerHTML = ''
    const months = document.createElement('div')
    months.className = 'months'
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(year, m, 1)
      const mEnd = new Date(year, m + 1, 0)
      const disabled = (min != null && mEnd < startOfDay(min)) || (max != null && mStart > startOfDay(max))
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'month-cell'
      btn.setAttribute('part', 'month-cell')
      btn.textContent = new Intl.DateTimeFormat(locale, { month: 'short' }).format(mStart)
      btn.setAttribute('aria-label', formatYearMonth(mStart, locale))
      if (m === selectedMonth) btn.classList.add('selected')
      if (disabled) {
        btn.classList.add('disabled')
        btn.setAttribute('aria-disabled', 'true')
      }
      btn.addEventListener('click', () => {
        if (disabled || this.injectDisabled() || this.hasAttr('readonly')) return
        this.selectMonth(m)
      })
      months.appendChild(btn)
    }
    grid.appendChild(months)
  }

  /** decade 年网格：12 年页（起点对齐 10 年），选年回月网格快速跳远年 */
  private renderYearsPicker(grid: HTMLElement): void {
    const locale = resolveLocale(this)
    const start = this.viewDate.getFullYear()
    const selected = this.selectedDate()
    const min = parseISODate(this.getAttr('min', ''))
    const max = parseISODate(this.getAttr('max', ''))
    const selYear = selected?.getFullYear() ?? -1
    grid.innerHTML = ''
    const years = document.createElement('div')
    years.className = 'years'
    for (let i = 0; i < 12; i++) {
      const y = start + i
      const yStart = new Date(y, 0, 1)
      const yEnd = new Date(y, 11, 31)
      const disabled = (min != null && yEnd < startOfDay(min)) || (max != null && yStart > startOfDay(max))
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'year-cell'
      btn.setAttribute('part', 'year-cell')
      btn.setAttribute('data-year', String(y))
      btn.textContent = String(y)
      btn.setAttribute('aria-label', formatYear(yStart, locale))
      if (y === selYear) btn.classList.add('selected')
      if (disabled) {
        btn.classList.add('disabled')
        btn.setAttribute('aria-disabled', 'true')
      }
      btn.addEventListener('click', () => {
        if (disabled || this.injectDisabled() || this.hasAttr('readonly')) return
        this.selectYear(y)
      })
      years.appendChild(btn)
    }
    grid.appendChild(years)
  }

  /** 翻页：层级决定步进单元（月 / 年 / 十年页），整页越界时按钮已置灰拦截 */
  private navigate(dir: 1 | -1): void {
    if (this.injectDisabled()) return
    const prev = this.pageAnchor()
    this.userNavigated = true
    if (this.panel === 'days') this.viewDate = addMonths(this.viewDate, dir)
    else if (this.panel === 'months') this.viewDate = addYears(this.viewDate, dir)
    else this.viewDate = addYears(this.viewDate, dir * 12)
    this.update()
    if (!this.samePage(prev, this.pageAnchor())) {
      this.emit('panel-change', { date: this.pageAnchor() })
    }
  }

  /** 标题钻取：日网格 → 月面板 → 十年网格（decade 快速跳远年），再点回退一层 */
  private onTitleClick(): void {
    if (this.injectDisabled()) return
    // 钻取会改变面板所在页（进入十年网格需对齐页锚），此后 value 不再自动吸附
    this.userNavigated = true
    if (this.panel === 'days') {
      this.panel = 'months'
    } else if (this.panel === 'months') {
      // 进入十年网格：viewDate 对齐到 10 年页起点（保留月分量便于回月面板）
      const y = this.viewDate.getFullYear()
      this.viewDate = new Date(y - (y % 10), this.viewDate.getMonth(), 1)
      this.panel = 'years'
    } else {
      this.panel = 'months'
    }
    this.update()
  }

  private goToday(): void {
    if (this.injectDisabled()) return
    const today = startOfDay(new Date())
    const prev = this.pageAnchor()
    this.viewDate = today
    this.focusDate = today
    this.panel = 'days'
    this.userNavigated = true
    this.update()
    if (!this.samePage(prev, this.pageAnchor())) {
      this.emit('panel-change', { date: this.pageAnchor() })
    }
  }

  private selectDate(d: Date): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    const iso = toISODate(d)
    const prev = this.pageAnchor()
    this.setAttribute('value', iso)
    this.emit('change', { value: iso })
    this.focusDate = startOfDay(d)
    this.update()
    // 点邻月补位日选中后面板跟随值所在月 → 视为面板月变化
    if (!this.samePage(prev, this.pageAnchor())) {
      this.emit('panel-change', { date: this.pageAnchor() })
    }
  }

  private selectMonth(m: number): void {
    const mode = this.getAttr('mode', 'month')
    const target = new Date(this.viewDate.getFullYear(), m, 1)
    const prev = this.pageAnchor()
    this.viewDate = target
    this.focusDate = target
    this.userNavigated = true
    this.panel = 'days'
    if (mode === 'year') {
      // 年模式选中月份：更新 value 并切回月视图。
      // 受控宿主可监听 oas-mode-change 后重新设置 mode="year" 保持年模式。
      const value = `${target.getFullYear()}-${String(m + 1).padStart(2, '0')}`
      this.setAttribute('mode', 'month') // update 内统一派发 oas-mode-change
      this.setAttribute('value', value)
      this.emit('change', { value })
    }
    this.update()
    if (!this.samePage(prev, this.pageAnchor())) {
      this.emit('panel-change', { date: this.pageAnchor() })
    }
  }

  /** decade 网格选年：回到该年 12 月面板（保持面板月份分量） */
  private selectYear(y: number): void {
    const prev = this.pageAnchor()
    this.viewDate = new Date(y, this.viewDate.getMonth(), 1)
    this.panel = 'months'
    this.userNavigated = true
    this.update()
    if (!this.samePage(prev, this.pageAnchor())) {
      this.emit('panel-change', { date: this.pageAnchor() })
    }
  }

  private handleGridKey(e: KeyboardEvent): void {
    const grid = this.grid
    if (!grid) return
    if (this.injectDisabled()) return
    // 月/年/十年面板走原生按钮行为（Tab / Enter / Space）
    if (this.panel !== 'days') return
    const focus = this.focusDate ?? this.selectedDate() ?? startOfDay(new Date())
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      findDayButton(grid, focus)?.click()
      return
    }
    const next = moveGridDate(focus, e.key, this.effectiveWeekStart(), e.shiftKey)
    if (!next) return
    // 目标不可用（min/max/disabledDate）时不移动
    if (this.isDateUnavailable(next)) return
    const prev = this.pageAnchor()
    e.preventDefault()
    this.focusDate = next
    this.userNavigated = true
    // 跨月目标不在当前网格 → 面板翻页跟随（走 update 刷新标题/边界钮后聚焦目标格）
    const inView = next.getFullYear() === this.viewDate.getFullYear() && next.getMonth() === this.viewDate.getMonth()
    if (inView) {
      this.renderGrid(true)
    } else {
      this.viewDate = new Date(next.getFullYear(), next.getMonth(), 1)
      this.update()
      const cell = this.grid ? findDayButton(this.grid, next) : null
      cell?.focus()
    }
    if (!this.samePage(prev, this.pageAnchor())) {
      this.emit('panel-change', { date: this.pageAnchor() })
    }
  }
}
