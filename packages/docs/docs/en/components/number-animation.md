# NumberAnimation

An animation component that eases a number from its current value to the target value, stops at the target and emits `oas-finish`; under `prefers-reduced-motion` it jumps straight to the target, and disconnecting cancels the rAF without leaks.

## Basic Usage

<DemoBlock title="Default 1500ms roll from 0 to target">
  <oas-number-animation value="9999"></oas-number-animation>
</DemoBlock>

## Speed and Decimal Places

<DemoBlock title="duration=3000 + to-fixed=2">
  <oas-number-animation value="3.1415926" duration="3000" to-fixed="2"></oas-number-animation>
</DemoBlock>

## Finish Event

<DemoBlock title="oas-finish callback">
  <oas-number-animation id="number-anim-event" value="88" duration="1200"></oas-number-animation>
  <span id="number-anim-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin-left: var(--oas-space-3)"></span>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `duration` | Animation duration (ms); 0 jumps straight to the target | `number \| string` | — |
| `to-fixed` | Decimal places (`Number.prototype.toFixed`); when omitted, integer display | `string` | — |
| `value` | Target value; invalid values treated as 0 | `string` | `0` |

### Events

| Event | Description |
| --- | --- |
| `oas-finish` | Emitted once when the animation reaches the target, detail `{ value: target value }` |

- Changing `value` mid-animation continues from the currently displayed value to the new target.
- When the system enables "reduce motion", the animation is skipped and the target value is shown directly (`oas-finish` is still emitted).
- On disconnect, any unfinished rAF is cancelled — no leaks.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('number-anim-event')
  const out = document.getElementById('number-anim-output')
  el?.addEventListener('oas-finish', (e) => {
    out.textContent = `oas-finish: ${e.detail.value}`
  })
})
</script>
