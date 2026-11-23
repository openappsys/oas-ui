---
description: Delivery time selection — a date column (N days starting today) plus a time-slot grid, "as soon as possible" / "schedule delivery" modes, distinct unavailable states for closed and fully booked slots, JSON attributes and object properties as two channels, Roving tabindex keyboard navigation for the mode group, date list and slot grid.
---

# TimeSelect Delivery time selection

A checkout-grade time picker: a date column on the start (N days from today, set by `days`) next to a time-slot grid. `mode="express"` (as soon as possible) picks the first available slot automatically; `mode="schedule"` lets users pick a date and a slot. The value contract is a JSON object `{ date, slot }`.

## Express (default)

In express mode the component picks the first available slot, so the host can read `value` directly. Slot data is injected through `slots`.

<DemoBlock title="Default express mode">
  <oas-time-select id="ts-express" slots='[{"key":"morning","label":"09:00–11:00"},{"key":"afternoon","label":"14:00–16:00"},{"key":"evening","label":"18:00–20:00"}]'></oas-time-select>
  <span id="ts-express-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Nothing selected yet</span>
</DemoBlock>

## Scheduled delivery

`mode="schedule"` shows the date column and the slot grid. Clicking a date switches that day's slots; dates without any available slot are dimmed and skipped by keyboard navigation.

<DemoBlock title="mode=&quot;schedule&quot;">
  <oas-time-select
    id="ts-schedule"
    mode="schedule"
    days="4"
    slots='[{"key":"morning","label":"09:00–11:00"},{"key":"afternoon","label":"14:00–16:00"},{"key":"evening","label":"18:00–20:00"}]'
  ></oas-time-select>
  <span id="ts-schedule-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Pick a date and a slot</span>
</DemoBlock>

## Closed and fully booked

The two unavailable meanings are visually distinct: **closed** (`disabled`) is dimmed and labelled "Closed"; **fully booked** (`full`) also gets a strikethrough label and a "Fully booked" badge. Both are native `disabled` buttons (also carrying `aria-disabled`), clicking them does not change the value, and keyboard navigation skips them.

<DemoBlock title="Closed / fully booked">
  <oas-time-select
    id="ts-states"
    mode="schedule"
    days="2"
    slots='[{"key":"a","label":"09:00–11:00"},{"key":"b","label":"11:00–13:00","disabled":true},{"key":"c","label":"14:00–16:00","full":true},{"key":"d","label":"16:00–18:00"},{"key":"e","label":"18:00–20:00","full":true}]'
  ></oas-time-select>
  <span id="ts-states-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Disabled

`disabled` disables the whole control: mode buttons, dates and slots.

<DemoBlock title="disabled">
  <oas-time-select
    mode="schedule"
    days="3"
    slots='[{"key":"a","label":"09:00–11:00"},{"key":"b","label":"14:00–16:00"}]'
    disabled
  ></oas-time-select>
</DemoBlock>

## Keyboard and accessibility

- The date column is a `role="tablist"` (vertical) of `role="tab"` buttons; the slot grid and the mode group are `role="radiogroup"` of `role="radio"` buttons. Selection state is exposed through `aria-selected` / `aria-checked`.
- All three regions use roving tabindex: exactly one Tab stop each. The mode group switches modes with left / right arrows (Home / End jump to the first / last mode); arrow keys move between available items (skipping closed, fully booked and unavailable dates), Home / End jump to the first / last available item, and left / right directions mirror under RTL.
- Date labels are formatted with `Intl.DateTimeFormat` (locale aware), with relative labels for today / tomorrow; the grid's accessible name combines the group title with the active date.

## Value contract

`value` is `{ date: 'YYYY-MM-DD', slot: 'key' }`. Assigning an object property or writing JSON to the attribute both work and do not emit events; `oas-change` fires only when the user switches mode, date or slot. **Express mode ignores a host-written `value`** and always selects the first available slot.

<DemoBlock title="Events and values">
  <oas-time-select
    id="ts-value"
    mode="schedule"
    days="3"
    slots='[{"key":"a","label":"09:00–11:00"},{"key":"b","label":"14:00–16:00"}]'
  ></oas-time-select>
  <span id="ts-value-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
import { onUpgraded } from '../../.vitepress/theme/when-defined'

onMounted(() => {
  const text = (id, value) => {
    const el = document.getElementById(id)
    if (el) el.textContent = value
  }
  // The "tomorrow" override is injected from script (a static md page cannot compute date keys)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const key = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  const schedule = document.getElementById('ts-schedule')

  onUpgraded(document.getElementById('ts-express'), () => {
    const el = document.getElementById('ts-express')
    text('ts-express-out', `Value: ${JSON.stringify(el.value)}`)
    el.addEventListener('oas-change', (event) => {
      text('ts-express-out', `oas-change: ${JSON.stringify(event.detail.value)} (${event.detail.mode})`)
    })
  })

  onUpgraded(schedule, () => {
    const el = document.getElementById('ts-schedule')
    el.setAttribute(
      'slots-override',
      JSON.stringify({
        [key]: [
          { key: 'afternoon', label: '14:00–16:00' },
          { key: 'evening', label: '18:00–20:00', full: true },
        ],
      }),
    )
    text('ts-schedule-out', `Value: ${JSON.stringify(el.value)}`)
    el.addEventListener('oas-change', (event) => {
      text('ts-schedule-out', `oas-change: ${JSON.stringify(event.detail.value)}`)
    })
  })

  onUpgraded(document.getElementById('ts-states'), () => {
    const el = document.getElementById('ts-states')
    el.addEventListener('oas-change', (event) => {
      text('ts-states-out', `oas-change: ${JSON.stringify(event.detail.value)}`)
    })
  })

  onUpgraded(document.getElementById('ts-value'), () => {
    const el = document.getElementById('ts-value')
    text('ts-value-out', `Value: ${JSON.stringify(el.value)}`)
    el.addEventListener('oas-change', (event) => {
      text('ts-value-out', `oas-change: ${JSON.stringify(event.detail.value)}`)
    })
  })
})
</script>

## API

### oas-time-select

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `days` | Number of days in the date column (N days from today; default 3, valid range 1–14; invalid values fall back and warn once) | `number \| string` | — |
| `disabled` | Disables the whole control: mode buttons, dates and slots | `boolean` | — |
| `mode` | Delivery mode: `express` as soon as possible (default, auto-picks the first available slot) / `schedule`; invalid values fall back to `express` with a warning | `string` | `express` |
| `slots` | Shared slot JSON array `[{ key, label, disabled?, full? }]`; string items collapse to `key=label` | `string` | — |
| `slots-override` | Per-date slot overrides as a JSON object `{ "YYYY-MM-DD": [...] }`; a matched date uses the override, and an empty array marks that date undeliverable | `string` | — |
| `start-date` | First date as `YYYY-MM-DD` (defaults to today; lets hosts pin the dispatch day and tests pin a clock) | `string` | — |
| `value` | Value JSON object `{ date, slot }` where `date` is `YYYY-MM-DD` and `slot` is the slot key | `TimeSelectValue \| string` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `days` | Number of days in the date column: get+set dual channel; assignment applies immediately without emitting events | `number \| string` | — |
| `value` | Current value: get+set dual channel (object or JSON string); assignment applies immediately without emitting events | `TimeSelectValue \| string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Dispatched when the user switches mode, date or slot, with `detail: { value, mode, date, slot }` |
