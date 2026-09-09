# DatePicker

A date picker supporting ten types — date, daterange, month, monthrange, year, yearrange, datetime, datetimerange, week, and quarter — with keyboard operation and `Intl.DateTimeFormat` formatting. The trigger is an input: you can type a date directly (committed on blur or Enter; invalid input reverts).

## Basic Selection

<DemoBlock title="Basic usage (type=date)">
  <oas-date-picker value="2026-08-09" placeholder="Select a date"></oas-date-picker>
</DemoBlock>

Click the input to open the panel and click a date to select; or type `2026-08-15` / `2026/8/15` and press `Enter` (or blur) to commit.

## Date Range

<DemoBlock title="Date range (type=daterange)">
  <oas-date-picker type="daterange" value='["2026-08-05","2026-08-15"]'></oas-date-picker>
</DemoBlock>

A double-month grid: pick the start first, then the end; submits a JSON array `["start","end"]`. Hovering previews the range. Every endpoint pick emits `oas-calendar-change` (see [Events](#controlled-open--events)). Range selection defaults to a **double-month grid** (left + right month linked); when space is tight (narrow screens / constrained containers) it naturally collapses to single-panel width via CSS responsive rules — no `single-panel`-style property switch needed.

## Month & Month Range

<DemoBlock title="Month (type=month)">
  <oas-date-picker type="month" value="2026-08" placeholder="Select a month"></oas-date-picker>
</DemoBlock>

<DemoBlock title="Month range (type=monthrange)">
  <oas-date-picker type="monthrange" value='["2026-01","2026-06"]'></oas-date-picker>
</DemoBlock>

monthrange value is a JSON array `["yyyy-MM","yyyy-MM"]`; two year panels for start/end month picking.

## Year & Year Range

<DemoBlock title="Year (type=year)">
  <oas-date-picker type="year" value="2026" placeholder="Select a year"></oas-date-picker>
</DemoBlock>

<DemoBlock title="Year range (type=yearrange)">
  <oas-date-picker type="yearrange" value='["2024","2026"]'></oas-date-picker>
</DemoBlock>

The year panel flips in 12-year pages; value is `yyyy`, yearrange a JSON array `["yyyy","yyyy"]`.

## Week & Quarter

<DemoBlock title="Week (type=week, ISO value yyyy-Wnn)">
  <oas-date-picker type="week" value="2026-W32" placeholder="Select a week"></oas-date-picker>
</DemoBlock>

<DemoBlock title="Quarter (type=quarter, value yyyy-Qn)">
  <oas-date-picker type="quarter" value="2026-Q3" placeholder="Select a quarter"></oas-date-picker>
</DemoBlock>

week selects the whole ISO week of the clicked day (full-row highlight with week numbers); quarter renders a four-cell quarter grid.

## Datetime & Datetime Range

<DemoBlock title="Datetime (type=datetime)">
  <oas-date-picker type="datetime" value="2026-08-09T09:30:00"></oas-date-picker>
</DemoBlock>

<DemoBlock title="Datetime range (type=datetimerange)">
  <oas-date-picker type="datetimerange" value='["2026-08-10T09:00:00","2026-08-20T18:00:00"]'></oas-date-picker>
</DemoBlock>

datetime submits after picking date + time and clicking "OK"; datetimerange shows dual month grids plus start/end time columns and submits a JSON array.

## Disabled Range & Navigation Bounds

<DemoBlock title="min / max limits">
  <oas-date-picker min="2026-08-01" max="2026-08-31" placeholder="Only August is selectable"></oas-date-picker>
</DemoBlock>

Out-of-range dates are not selectable, and navigation buttons gray out at the `min`/`max` boundary.

## Shortcuts

<DemoBlock title="Shortcuts (property)">
  <oas-date-picker id="date-picker-shortcuts" value="2026-08-09"></oas-date-picker>
  <span id="date-picker-shortcuts-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

`shortcuts` (property, `{ label, value }` or `{ label, getValue() }`) applies on click and emits `oas-change`. Built-in defaults exist for date / datetime / month / week / year and all range types (labels via locale).

<DemoBlock title="Sidebar shortcuts (shortcuts-position=left)">
  <oas-date-picker type="daterange" shortcuts-position="left" placeholder="Shortcuts in the left sidebar"></oas-date-picker>
</DemoBlock>

## Disabled Dates

<DemoBlock title="Disable past dates (disabled-date)">
  <oas-date-picker id="date-picker-disabled-date" value="2026-08-09"></oas-date-picker>
</DemoBlock>

`disabledDate` (property, `(date: Date) => boolean`) grays out matching dates (clicks and keyboard skip them); stacks with `min`/`max`.

## Multiple

<DemoBlock title="Multiple selection">
  <oas-date-picker multiple value='["2026-08-09","2026-08-11"]'></oas-date-picker>
</DemoBlock>

With `multiple`, clicks accumulate/deselect while the panel stays open; value is a JSON array.

## Custom Format

<DemoBlock title="Custom format">
  <oas-date-picker value="2026-08-09" format="yyyy/MM/dd"></oas-date-picker>
  <oas-date-picker value="2026-08-09" format="MM月dd日 yyyy"></oas-date-picker>
</DemoBlock>

The format supports `yyyy`/`MM`/`dd`/`HH`/`mm`/`ss` tokens (week/quarter use their fixed value format).

## Panel Features

<DemoBlock title="Unlinked panels (unlink-panels)">
  <oas-date-picker type="daterange" unlink-panels value='["2026-08-05","2026-08-15"]'></oas-date-picker>
</DemoBlock>

Range panels navigate in lockstep by default; `unlink-panels` lets both months flip independently.

<DemoBlock title="Empty-value initial month (default-value)">
  <oas-date-picker default-value="2026-08-15" placeholder="Anchors to August 2026 when empty"></oas-date-picker>
</DemoBlock>

<DemoBlock title="Week numbers & first day of week">
  <oas-date-picker value="2026-08-09" show-week-number first-day-of-week="0"></oas-date-picker>
</DemoBlock>

`show-week-number` adds an ISO week-number column (built-in for `type=week`); `first-day-of-week` (0-6, 0=Sunday) overrides the week start, which otherwise follows the locale.

## Cell Rendering

<DemoBlock title="Calendar marks (oas-cell-render / template[slot=cell])">
  <oas-date-picker id="date-picker-cell-render" value="2026-08-09">
    <template slot="cell">
      <span class="cell-dot"></span>
      <span data-cell-date></span>
    </template>
  </oas-date-picker>
</DemoBlock>

Same dual channel as `oas-calendar`: `template[slot="cell"]` clones into each day cell (`[data-cell-date]` binds the day number), and every rebuild emits `oas-cell-render` with `detail: { date, element }` (listeners must be idempotent).

## Form States

<DemoBlock title="Sizes">
  <oas-date-picker size="small" value="2026-08-09"></oas-date-picker>
  <oas-date-picker size="medium" value="2026-08-09"></oas-date-picker>
  <oas-date-picker size="large" value="2026-08-09"></oas-date-picker>
</DemoBlock>

<DemoBlock title="Status & clearable">
  <oas-date-picker status="error" clearable value="2026-08-09" placeholder="error, clearable"></oas-date-picker>
  <oas-date-picker status="warning" value="2026-08-09" placeholder="warning"></oas-date-picker>
  <oas-date-picker status="success" value="2026-08-09" placeholder="success"></oas-date-picker>
</DemoBlock>

`status=error` also sets `aria-invalid`; `clearable` shows a clear button when a value exists (emits `oas-clear` + `oas-change` with an empty value).

<DemoBlock title="Readonly">
  <oas-date-picker readonly value="2026-08-09" placeholder="Readonly echo"></oas-date-picker>
</DemoBlock>

The panel can still be opened and browsed (keyboard navigation works), but no interaction commits.

## Controlled & Events

<DemoBlock title="Controlled + oas-change event">
  <oas-date-picker id="date-picker-event" value="2026-08-09"></oas-date-picker>
  <span id="date-picker-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

<button id="date-picker-set" type="button" style="margin-top: 12px">Set to 2026-08-20</button>

<DemoBlock title="Controlled open (open + oas-open-change)">
  <oas-date-picker id="date-picker-open" value="2026-08-09"></oas-date-picker>
  <button id="date-picker-open-toggle" type="button">Toggle open</button>
</DemoBlock>

With the `open` attribute present the picker is controlled: gestures only emit `oas-open-change`; the host decides by adding/removing the attribute.

<DemoBlock title="Range partial selection (oas-calendar-change)">
  <oas-date-picker id="date-picker-calendar-change" type="daterange" default-value="2026-08-01"></oas-date-picker>
  <span id="date-picker-calendar-change-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

Range types emit `oas-calendar-change` (`detail.value` is `[start, end|null]`) on every endpoint pick.

## Disabled

<DemoBlock title="Disabled">
  <oas-date-picker disabled value="2026-08-09"></oas-date-picker>
</DemoBlock>

## Floating Positioning (placement)

<DemoBlock title="Right-edge trigger (default bottom-start, auto flip)">
  <oas-date-picker style="margin-left: auto; display: block; width: fit-content" value="2026-08-09" placeholder="Right-edge single picker"></oas-date-picker>
</DemoBlock>

<DemoBlock title="Right-edge wide panel (range right-aligns)">
  <oas-date-picker type="daterange" style="margin-left: auto; display: block; width: fit-content" value='["2026-08-05","2026-08-15"]'></oas-date-picker>
</DemoBlock>

<DemoBlock title="Explicit placement (top-end)">
  <oas-date-picker placement="top-end" value="2026-08-09" placeholder="placement=top-end"></oas-date-picker>
</DemoBlock>

`placement` supports 12 directions (`top/bottom/left/right` × `-start/-end`, default `bottom-start`) with auto right-align flipping near the viewport edge, upward flipping, and viewport clamping.

## Picker vs Calendar

Use `oas-date-picker` (this component) for popover selection; use `oas-calendar` for always-visible inline panels (same family capabilities: `mode=year`, week numbers, cell rendering).

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `clearable` | Clearable: shows a clear button when a value exists; emits `oas-clear` + `oas-change` (empty value) | `boolean` | — |
| `default-value` | Panel anchor month when the value is empty (the value takes precedence when present) | `string` | — |
| `disabled` | Disabled | `boolean` | — |
| `first-day-of-week` | Week-start override (0=Sunday … 6=Saturday); defaults to the locale | `string` | — |
| `format` | Display format tokens (`yyyy`/`MM`/`dd`/`HH`/`mm`/`ss`; week/quarter use their fixed value format) | `string` | — |
| `max` | Selectable range (ISO date); navigation buttons gray out at the boundary | `string` | — |
| `min` | Selectable range (ISO date); navigation buttons gray out at the boundary | `string` | — |
| `multiple` | Multiple selection (only `type=date`), value is a JSON array; the typing channel is read-only in this mode | `boolean` | — |
| `open` | Controlled open: present = open, removed = closed; gestures only emit `oas-open-change` for the host to write back | — | — |
| `placeholder` | Placeholder text | — | — |
| `placement` | Popup placement, 12 directions: `top`/`bottom`/`left`/`right` × `-start`/`-end` (default `bottom-start`); auto right-aligns near the viewport right edge, flips upward when space below is insufficient, and clamps into the viewport | `string` | `bottom-start` |
| `readonly` | Readonly: the panel can be opened and browsed (cells keyboard-navigable), but no interaction commits | `boolean` | — |
| `shortcuts-position` | Shortcut placement: `bottom` (default, horizontal on top) / `left` (vertical sidebar) | `string` | `bottom` |
| `show-week-number` | Show an ISO week-number column (built-in for `type=week`) | `boolean` | — |
| `size` | Size: `small` / `medium` / `large` (reads the nearest config-provider injection) | `string` | `medium` |
| `status` | Validation status: `success` / `warning` / `error` (`error` also sets `aria-invalid`) | `string` | — |
| `type` | Type: `date` / `daterange` / `month` / `monthrange` / `year` / `yearrange` / `datetime` / `datetimerange` / `week` / `quarter` | `string` | `date` |
| `unlink-panels` | Range months flip independently (linked by default) | `boolean` | — |
| `value` | Current value: `yyyy-MM-dd` / `yyyy-MM` / `yyyy` / `yyyy-Wnn` / `yyyy-Qn` / `yyyy-MM-ddTHH:mm:ss` / JSON range array | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-blur` | The component as a whole loses focus (internal moves do not fire) |
| `oas-calendar-change` | Emitted on every range endpoint pick, `detail: { value: [start, end\|null] }` |
| `oas-cell-render` | Emitted per day cell on rebuild, `detail: { date, element }` (listeners must be idempotent) |
| `oas-change` | Value change, `detail: { value }` (string array for ranges and multiple) |
| `oas-clear` | Clear, `detail: { value }` is the previous value |
| `oas-confirm` | Emitted when datetime/datetimerange submits via the confirm button (alongside `oas-change`), `detail: { value }` |
| `oas-focus` | The component as a whole gains focus |
| `oas-open-change` | Open state change, `detail: { open }` (both controlled and uncontrolled) |

### Slots

| Name | Description |
| --- | --- |
| `cell` | `template[slot="cell"]` is cloned into each day cell; `[data-cell-date]` binds the day number (dual channel with `oas-cell-render`) |
| `template[slot="cell"]` | — |

Keyboard: `Enter` / `↓` to open; arrows plus `Home`/`End`/`PageUp`/`PageDown` (`Shift` for years) to move; `Enter` to select; `Esc` to close.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('date-picker-event')
  const out = document.getElementById('date-picker-output')
  const setBtn = document.getElementById('date-picker-set')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
  setBtn?.addEventListener('click', () => el?.setAttribute('value', '2026-08-20'))

  const openEl = document.getElementById('date-picker-open')
  document.getElementById('date-picker-open-toggle')?.addEventListener('click', () => {
    if (openEl?.hasAttribute('open')) openEl.removeAttribute('open')
    else openEl?.setAttribute('open', '')
  })

  const cc = document.getElementById('date-picker-calendar-change')
  const ccOut = document.getElementById('date-picker-calendar-change-output')
  cc?.addEventListener('oas-calendar-change', (e) => {
    const [s, t] = e.detail.value
    ccOut.textContent = t ? `Range: ${s} ~ ${t}` : `Start picked: ${s}, pick the end`
  })

  const sc = document.getElementById('date-picker-shortcuts')
  const scOut = document.getElementById('date-picker-shortcuts-output')
  sc?.addEventListener('oas-change', (e) => {
    scOut.textContent = `oas-change: ${e.detail.value}`
  })
  sc.shortcuts = [
    { label: 'Today', getValue: () => new Date() },
    {
      label: 'Tomorrow',
      getValue: () => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return d
      },
    },
    { label: 'Fixed 2026-08-10', value: '2026-08-10' },
  ]

  const dd = document.getElementById('date-picker-disabled-date')
  dd.disabledDate = (d) => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return d < t
  }

  const cr = document.getElementById('date-picker-cell-render')
  const marks = new Set(['2026-08-10', '2026-08-20', '2026-08-28'])
  cr?.addEventListener('oas-cell-render', (e) => {
    if (marks.has(e.detail.element.getAttribute('data-date'))) {
      e.detail.element.querySelector('.cell-dot')?.style.setProperty('background', 'var(--oas-color-danger)')
    }
  })
})
</script>
