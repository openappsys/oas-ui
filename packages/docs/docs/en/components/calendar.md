# Calendar

A calendar component with month/year modes, supporting selection, disabled dates, week numbers, and keyboard grid navigation; date descriptions use `Intl.DateTimeFormat` (locale-aware).

## Basic Usage

<DemoBlock title="Month view (mode=month)">
  <oas-calendar value="2026-08-09"></oas-calendar>
</DemoBlock>

Click a date to select it and dispatch `oas-change`; the title opens a month-selection panel for quick month jumps.

## Year View

<DemoBlock title="Year view (mode=year)">
  <oas-calendar mode="year" value="2026-07"></oas-calendar>
</DemoBlock>

In year mode, selecting a month dispatches `yyyy-MM`.

## Disabled Range

<DemoBlock title="min / max limits">
  <oas-calendar value="2026-08-09" min="2026-08-01" max="2026-08-31"></oas-calendar>
</DemoBlock>

## Disabled Callback

<DemoBlock title="disabled-date (disable weekends)">
  <oas-calendar id="calendar-disabled-date" value="2026-08-09"></oas-calendar>
</DemoBlock>

`disabledDate` is passed in via a property callback (functions cannot be expressed in JSON).

## Week Numbers

<DemoBlock title="Show week numbers (show-week-number)">
  <oas-calendar value="2026-08-09" show-week-number></oas-calendar>
</DemoBlock>

## Events

<DemoBlock title="oas-change event">
  <oas-calendar id="calendar-event" value="2026-08-09"></oas-calendar>
  <span id="calendar-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Custom Cells

<DemoBlock title="Event-marked calendar (oas-cell-render marks holidays)">
  <oas-calendar id="calendar-cell-render" value="2026-08-09"></oas-calendar>
</DemoBlock>

`oas-cell-render` is dispatched for each rendered day cell (`detail: { date, element }`), letting the host append markers/badges/rich content (e.g. holidays, event dots); alternatively drop a `<template slot="cell">` inside the component for a static skeleton whose `[data-cell-date]` node is auto-bound to the day number. Appending `<span class="cell-dot">` inside `element` shows the built-in marker dot (uses the `--oas-color-danger` token; adapts to light/dark themes).

## Mode Switching

<DemoBlock title="Mode switching (month ↔ year quick year jump)">
  <div style="display:flex;gap:var(--oas-space-1);margin-bottom:var(--oas-space-2)">
    <oas-button id="calendar-mode-month" size="small">Month view</oas-button>
    <oas-button id="calendar-mode-year" size="small">Year view</oas-button>
  </div>
  <oas-calendar id="calendar-mode" value="2026-08-09"></oas-calendar>
  <span id="calendar-mode-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

`mode="year"` shows a 12-month grid; the previous/next year buttons in the header quickly switch years. Picking a month selects it (dispatches `oas-change` with value `yyyy-MM`) and auto-switches back to the month view (dispatches `oas-mode-change`). In a controlled scenario, listen to `oas-mode-change` and re-set the `mode` attribute to keep a specific mode.

## Week Start Override

<DemoBlock title="Week start override (first-day-of-week)">
  <oas-calendar value="2026-08-09" first-day-of-week="0"></oas-calendar>
</DemoBlock>

`first-day-of-week` accepts `0` (Sunday) through `6` (Saturday); defaults to the locale (Monday for Chinese locales, Sunday otherwise).

## Panel Month Anchor

<DemoBlock title="page-show-date anchor + oas-panel-change">
  <oas-calendar id="calendar-page" value="1980-05-03" page-show-date="2026-08"></oas-calendar>
  <span id="calendar-page-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

`page-show-date` anchors the displayed panel to the given month initially and reactively — even when `value` lives in another year (e.g. echoing a birth date while opening from the current month); it takes precedence over value. `oas-panel-change` (`detail: { date }`) fires when the user pages / picks a month / jumps; removing the attribute falls back to the value month.

## Paging Boundaries

<DemoBlock title="min / max paging boundaries">
  <oas-calendar value="2026-06-15" min="2026-06-01" max="2026-09-30"></oas-calendar>
</DemoBlock>

When the next page would fall entirely outside `[min, max]` (whole month in the day view, whole year in the month panel, whole decade page in the decade grid), the previous/next buttons grey out.

## Read-only Calendar

<DemoBlock title="readonly: read-only detail view with event dots">
  <oas-calendar id="calendar-readonly" value="2026-08-09" readonly></oas-calendar>
</DemoBlock>

With `readonly`, paging and panel drill-down stay available but picking dates / pressing `Enter` does not commit — combined with `oas-cell-render` event dots this yields a "viewable, not editable" detail calendar.

## Globally Disabled

<DemoBlock title="disabled: fully non-interactive">
  <oas-calendar value="2026-08-09" disabled></oas-calendar>
</DemoBlock>

`disabled` greys out the whole calendar and stops all interaction (picking / paging / keyboard); use it with form-disabled scenarios. `readonly` still allows browsing.

## Keyboard & Fast Year Jump

<DemoBlock title="Extended keyboard + decade fast year jump">
  <oas-calendar value="2026-08-09"></oas-calendar>
</DemoBlock>

- Keyboard: `Home`/`End` jump to the start/end of the week; `PageUp`/`PageDown` move to the previous/next month (`Shift` moves by year); arrow keys move cell by cell, `Enter`/`Space` selects.
- Fast year jump: click the title to open the month panel, click the year to open the decade grid (pages step by ±12 years), pick a year to return to that year's month panel, then pick a month to return to the day view — from 2026 to 1980 takes four clicks.

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Globally disabled: greys out the calendar and stops all interaction (picking / paging / keyboard) | `boolean` | — |
| `disabledDate` | Disabled callback (property) | `((d: Date) => boolean) \| null` | — |
| `first-day-of-week` | Week start override: `0` (Sunday) to `6` (Saturday); defaults to the locale (Monday for Chinese, Sunday otherwise) | `string` | — |
| `max` | Selectable range (ISO dates); navigation buttons grey out when the whole target page falls outside the range | `string` | — |
| `min` | Selectable range (ISO dates); navigation buttons grey out when the whole target page falls outside the range | `string` | — |
| `mode` | `month` / `year` (in year mode, picking a month auto-switches back to month view) | `string` | `month` |
| `page-show-date` | Panel month anchor (ISO `yyyy-MM` or `yyyy-MM-dd`): anchors the displayed month initially/on change, taking precedence over value; removing it falls back to the value month | `string` | — |
| `readonly` | Read-only: page navigation and panel drill-down stay available, but picking dates / Enter does not commit | `boolean` | — |
| `show-week-number` | Show the ISO week number column | `boolean` | — |
| `value` | Selected value (ISO) | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-cell-render` | Dispatched when each day cell renders, `detail: { date, element }` (element is the day button; host can append markers/badges/rich content) |
| `oas-change` | Selection change, `detail: { value }` |
| `oas-mode-change` | Dispatched when year mode auto-switches back to month view after picking a month, `detail: { mode }` |
| `oas-panel-change` | Dispatched when the displayed panel month changes due to user paging/month picking/jumps, `detail: { date }` (date is the first day of the new page) |

### Slots

| Name | Description |
| --- | --- |
| `template[slot="cell"]` | Static template for day cells, cloned into each day button; the `[data-cell-date]` node is bound to the day number |

Keyboard: `↑`/`↓`/`←`/`→` to move within the grid (auto-paging across months), `Home`/`End` to jump to the week start/end, `PageUp`/`PageDown` to move between months (`Shift` for years), `Enter`/`Space` to select.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('calendar-disabled-date')
  el.disabledDate = (d) => d.getDay() === 0 || d.getDay() === 6
  const ev = document.getElementById('calendar-event')
  const out = document.getElementById('calendar-output')
  ev?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })

  // Custom cells: mark holidays (Aug 1 and Aug 15)
  const cell = document.getElementById('calendar-cell-render')
  cell?.addEventListener('oas-cell-render', (e) => {
    const { date, element } = e.detail
    const holiday = date.getMonth() === 7 && (date.getDate() === 1 || date.getDate() === 15)
    element.classList.toggle('holiday', holiday)
    if (holiday && !element.querySelector('.cell-dot')) {
      const dot = document.createElement('span')
      dot.className = 'cell-dot'
      dot.setAttribute('role', 'img')
      dot.setAttribute('aria-label', 'holiday')
      element.appendChild(dot)
    }
  })

  // Panel anchor: mirror the current panel (title read from shadow) and refresh on page changes
  const pageCal = document.getElementById('calendar-page')
  const pageOut = document.getElementById('calendar-page-output')
  const syncPage = () => {
    const t = pageCal?.shadowRoot?.querySelector('[part="title"]')?.textContent ?? ''
    if (pageOut) pageOut.textContent = `Current panel: ${t}`
  }
  pageCal?.addEventListener('oas-panel-change', (e) => {
    syncPage()
    pageOut.textContent = `${pageOut.textContent} (oas-panel-change: ${e.detail.date})`
  })
  syncPage()

  // Read-only detail calendar: mark anniversaries (Aug 8 and Aug 18)
  const ro = document.getElementById('calendar-readonly')
  ro?.addEventListener('oas-cell-render', (e) => {
    const { date, element } = e.detail
    const mark = date.getMonth() === 7 && (date.getDate() === 8 || date.getDate() === 18)
    if (mark && !element.querySelector('.cell-dot')) {
      const dot = document.createElement('span')
      dot.className = 'cell-dot'
      dot.setAttribute('role', 'img')
      dot.setAttribute('aria-label', 'anniversary')
      element.appendChild(dot)
    }
  })

  // Mode switching: month ↔ year, shows the current mode and selection feedback.
  // When picking a month in year mode, oas-mode-change and oas-change fire in the
  // same frame — append feedback so neither event is hidden by the other.
  const modeCal = document.getElementById('calendar-mode')
  const modeOut = document.getElementById('calendar-mode-output')
  const setMode = (m) => modeCal?.setAttribute('mode', m)
  const appendOut = (text) => {
    modeOut.textContent = `${modeOut.textContent}${modeOut.textContent ? ' · ' : ''}${text}`
  }
  document.getElementById('calendar-mode-month')?.addEventListener('click', () => setMode('month'))
  document.getElementById('calendar-mode-year')?.addEventListener('click', () => setMode('year'))
  modeCal?.addEventListener('oas-mode-change', (e) => {
    appendOut(`oas-mode-change: ${e.detail.mode}`)
  })
  modeCal?.addEventListener('oas-change', (e) => {
    appendOut(`oas-change: ${e.detail.value}`)
  })
})
</script>
