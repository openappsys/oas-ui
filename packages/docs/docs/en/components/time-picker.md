# TimePicker

A time picker with dropdown hour/minute/second columns; `↑`/`↓` adjusts, `Enter` confirms, `Esc` cancels, and stepping intervals are supported.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-time-picker value="09:05:30"></oas-time-picker>
</DemoBlock>

## Custom Format

<DemoBlock title="format column selection">
  <oas-time-picker value="09:05:30" format="HH:mm"></oas-time-picker>
  <oas-time-picker value="09:05:30" format="HH:mm:ss"></oas-time-picker>
</DemoBlock>

A column appears only when `format` contains the corresponding `HH`/`mm`/`ss` token.

## Stepping

<DemoBlock title="step minute interval">
  <oas-time-picker value="09:15:00" step="15"></oas-time-picker>
</DemoBlock>

The minute column steps by `step` (e.g. 0, 15, 30, 45).

## Events

<DemoBlock title="oas-change event">
  <oas-time-picker id="time-picker-event" value="10:00:00"></oas-time-picker>
  <span id="time-picker-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Disabled

<DemoBlock title="Disabled">
  <oas-time-picker disabled value="09:05:30"></oas-time-picker>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disabled | — | — |
| `format` | Display format tokens | — | `HH:mm:ss` |
| `step` | Minute stepping interval | — | `1` |
| `value` | Current value (`HH:mm:ss`) | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Confirmed value change, `detail: { value }` |

Keyboard: `Enter` / `↓` to open, `↑`/`↓` to adjust the current column, `←`/`→` to switch columns, `Enter` to confirm, `Esc` to cancel.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('time-picker-event')
  const out = document.getElementById('time-picker-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
})
</script>
