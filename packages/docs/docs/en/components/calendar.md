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

## API

| Property             | Description                     | Default  |
| -------------------- | ------------------------------- | -------- |
| `value`              | Selected value (ISO)            | —        |
| `mode`               | `month` / `year`                | `month`  |
| `min` / `max`        | Selectable range (ISO dates)    | —        |
| `disabledDate`       | Disabled callback (property)    | —        |
| `show-week-number`   | Show the ISO week number column | `false`  |

Keyboard: `↑`/`↓`/`←`/`→` to move within the grid, `Enter` to select.

| Event         | Description                        |
| ------------- | ---------------------------------- |
| `oas-change`  | Selection change, `detail: { value }` |

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
})
</script>
