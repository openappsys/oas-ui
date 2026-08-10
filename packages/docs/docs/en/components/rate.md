# Rate

A star rating supporting keyboard arrow-key adjustment; clicking the currently selected star clears the value by default.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-rate value="3"></oas-rate>
</DemoBlock>

## Custom Count

<DemoBlock title="max">
  <oas-rate value="7" max="10"></oas-rate>
</DemoBlock>

Set the number of stars via `max`.

## Half Stars

<DemoBlock title="Half stars (allow-half)">
  <oas-rate value="3.5" allow-half></oas-rate>
</DemoBlock>

`allow-half` allows expressing half stars via `value`; clicks still increment by whole stars.

## Clear on Click

<DemoBlock title="Clear on click (allow-clear)">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate id="rate-clear" value="3"></oas-rate>
    <span id="rate-clear-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 140px"></span>
  </div>
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); margin-top: var(--oas-space-2); flex-wrap: wrap;">
    <oas-rate value="4" allow-clear="false"></oas-rate>
    <span style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">allow-clear="false": clicking the selected star does not clear</span>
  </div>
</DemoBlock>

`allow-clear` is enabled by default: clicking the currently selected star again clears it to `0` and dispatches `oas-change` (`detail: { value: 0 }`); setting it to `"false"` disables clearing on click.

## Custom Icon (icon property)

<DemoBlock title="Custom icon (icon property)">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate icon="♥" value="3"></oas-rate>
    <oas-rate icon="☕" value="2"></oas-rate>
    <oas-rate icon="⚡" value="5"></oas-rate>
  </div>
</DemoBlock>

Pass a character or SVG markup via the `icon` property to replace the star icon:

<DemoBlock title="Custom icon (icon property · SVG)">
  <oas-rate icon="<svg viewBox='0 0 16 16' width='20' height='20' aria-hidden='true' focusable='false'><path d='M8 1 L9.6 5.2 L14 5.8 L10.9 8.8 L11.8 13.2 L8 11 L4.2 13.2 L5.1 8.8 L2 5.8 L6.4 5.2 Z' fill='currentColor'/></svg>" value="4"></oas-rate>
</DemoBlock>

## Custom Icon (slot)

<DemoBlock title="Custom icon (slot)">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate value="4">
      <span slot="icon">★</span>
    </oas-rate>
    <oas-rate value="2">
      <svg slot="icon" viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" focusable="false"><path d="M8 2 L10 6.2 L14.5 6.8 L11.2 9.9 L12.2 14.4 L8 12.2 L3.8 14.4 L4.8 9.9 L1.5 6.8 L6 6.2 Z" fill="currentColor"/></svg>
    </oas-rate>
  </div>
</DemoBlock>

Pass any element via `slot="icon"`; it is cloned onto every star. Priority: `icon` property > `slot="icon"` > default star.

## Disabled

<DemoBlock title="Disabled">
  <oas-rate value="4" disabled></oas-rate>
</DemoBlock>

## Events

<DemoBlock title="Change events">
  <oas-rate id="rate-event" value="2"></oas-rate>
  <span id="rate-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

Listen to `oas-change` (on click, clear, or keyboard adjustment, `detail: { value }`):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('rate-event')
  const out = document.getElementById('rate-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })

  const clearEl = document.getElementById('rate-clear')
  const clearOut = document.getElementById('rate-clear-output')
  clearEl?.addEventListener('oas-change', (e) => {
    clearOut.textContent = `oas-change: ${e.detail.value}`
  })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `allow-clear` | Clear to `0` when clicking the currently selected star | — | `true` |
| `allow-half` | Allow half stars | — | — |
| `disabled` | Disabled | — | — |
| `icon` | Custom star icon (character or SVG markup) | — | — |
| `max` | Number of stars | — | `5` |
| `value` | Current score (controlled) | — | `0` |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Score change, `detail: { value }` |

### Slots

| Name | Description |
| --- | --- |
| `icon` | — |

Icon customization: `icon` property > `slot="icon"` (cloned to each star) > default star.

Keyboard: `←`/`→` (or `↑`/`↓`) to adjust, `Home` to reset to zero, `End` to fill.
