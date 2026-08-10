# DatePicker

A date picker supporting four types — single date, date range, month, and datetime — with keyboard operation and `Intl.DateTimeFormat` formatting.

## Basic Selection

<DemoBlock title="Basic usage (type=date)">
  <oas-date-picker value="2026-08-09" placeholder="Select a date"></oas-date-picker>
</DemoBlock>

Click the input to open the date panel; click a date to select it and close.

## Date Range

<DemoBlock title="Date range (type=daterange)">
  <oas-date-picker type="daterange" value='["2026-08-05","2026-08-15"]'></oas-date-picker>
</DemoBlock>

A double-month grid: pick the start first, then the end; submits a JSON array `["start","end"]`. Hovering previews the range.

## Month Selection

<DemoBlock title="Month (type=month)">
  <oas-date-picker type="month" value="2026-08" placeholder="Select a month"></oas-date-picker>
</DemoBlock>

## Datetime

<DemoBlock title="Datetime (type=datetime)">
  <oas-date-picker type="datetime" value="2026-08-09T09:30:00"></oas-date-picker>
</DemoBlock>

Pick the date and hour/minute/second, then click "确定" to submit.

## Disabled Range

<DemoBlock title="min / max limits">
  <oas-date-picker min="2026-08-01" max="2026-08-31" placeholder="Only August is selectable"></oas-date-picker>
</DemoBlock>

Out-of-range dates are not selectable.

## Custom Format

<DemoBlock title="Custom format">
  <oas-date-picker value="2026-08-09" format="yyyy/MM/dd"></oas-date-picker>
  <oas-date-picker value="2026-08-09" format="MM月dd日 yyyy"></oas-date-picker>
</DemoBlock>

The format supports `yyyy`/`MM`/`dd`/`HH`/`mm`/`ss` tokens.

## Controlled & Events

<DemoBlock title="Controlled + oas-change event">
  <oas-date-picker id="date-picker-event" value="2026-08-09"></oas-date-picker>
  <span id="date-picker-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

<button id="date-picker-set" type="button" style="margin-top: 12px">Set to 2026-08-20</button>

## Disabled

<DemoBlock title="Disabled">
  <oas-date-picker disabled value="2026-08-09"></oas-date-picker>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disabled | — | — |
| `format` | Display format tokens (`yyyy`/`MM`/`dd`/`HH`/`mm`/`ss`) | — | — |
| `max` | Selectable range (ISO dates) | — | — |
| `min` | Selectable range (ISO dates) | — | — |
| `placeholder` | Placeholder text | — | — |
| `type` | Type: `date` / `daterange` / `month` / `datetime` | — | `date` |
| `value` | Current value: `yyyy-MM-dd` / `yyyy-MM` / `yyyy-MM-ddTHH:mm:ss` / JSON range array | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Value change, `detail: { value }` (string array for daterange) |

Keyboard: `Enter` / `↓` to open, `↑`/`↓`/`←`/`→` to move within the grid, `Enter` to select, `Esc` to close.

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
})
</script>
