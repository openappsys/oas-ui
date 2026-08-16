# Countdown

A countdown component that refreshes in real time, supports day/hour/minute/second formatting templates, emits `oas-finish` when reaching zero, and automatically cleans up its timer on disconnect.

## Basic Usage

<DemoBlock title="Default HH:mm:ss">
  <oas-countdown value="90000"></oas-countdown>
</DemoBlock>

## Days, Hours, Minutes, Seconds

<DemoBlock title="DD:HH:mm:ss template">
  <oas-countdown value="90061000" format="DD:HH:mm:ss"></oas-countdown>
</DemoBlock>

## Chinese Unit Template

<DemoBlock title="Chinese units">
  <oas-countdown value="90061000" format="D天H时m分s秒"></oas-countdown>
</DemoBlock>

## Finish Callback

<DemoBlock title="oas-finish event">
  <oas-countdown id="countdown-event" value="3000"></oas-countdown>
  <span id="countdown-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Font Size

Font size is fixed at `--oas-font-size-lg` (16px) by default and does not follow the outer context; override with the CSS variable `--oas-countdown-font` (e.g. `32px`).

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `format` | Template: `DD`/`D` days, `HH`/`H` hours, `mm`/`m` minutes, `ss`/`s` seconds | `string` | `HH:mm:ss` |
| `value` | Total countdown duration (milliseconds) | `string` | `0` |

### Events

| Event | Description |
| --- | --- |
| `oas-finish` | Emitted once when the countdown reaches zero |

When the template contains `D`/`DD`, hours are counted within the day (0-23); without days, hours roll up into them (e.g. `25:01:01`).

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('countdown-event')
  const out = document.getElementById('countdown-output')
  el?.addEventListener('oas-finish', () => {
    out.textContent = 'oas-finish: countdown finished'
  })
})
</script>
