# Switch

A switch button with `role="switch"`.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-switch></oas-switch>
  <oas-switch checked></oas-switch>
</DemoBlock>

## Disabled & Loading

<DemoBlock title="disabled / loading">
  <oas-switch disabled checked></oas-switch>
  <oas-switch loading checked></oas-switch>
</DemoBlock>

`loading` shows a loading animation and prevents toggling, for async submit scenarios.

## Switch Labels

`checked-text` / `unchecked-text` render labels on the switch: at medium/large/xl sizes they appear inside the track on the side opposite the thumb; at `size="xs"` / `size="small"` the labels move outside the switch.

<DemoBlock title="Switch labels">
  <oas-switch checked-text="On" unchecked-text="Off"></oas-switch>
  <oas-switch checked checked-text="Enabled" unchecked-text="Disabled"></oas-switch>
  <oas-switch size="xs" checked-text="On" unchecked-text="Off"></oas-switch>
  <oas-switch size="small" checked-text="On" unchecked-text="Off"></oas-switch>
</DemoBlock>

## Sizes

`size` supports five tiers: `xs` / `small` / `medium` (default) / `large` / `xl`; invalid values fall back to `medium` with a warning.

<DemoBlock title="Five sizes">
  <oas-switch size="xs" checked></oas-switch>
  <oas-switch size="small" checked></oas-switch>
  <oas-switch size="medium" checked></oas-switch>
  <oas-switch size="large" checked></oas-switch>
  <oas-switch size="xl" checked></oas-switch>
</DemoBlock>

## Custom Color

`color` overrides the primary color of the checked state (defaults to `--oas-color-primary`).

<DemoBlock title="Custom color">
  <oas-switch checked color="#16a34a"></oas-switch>
  <oas-switch checked color="#dc2626" checked-text="Danger on" unchecked-text="Danger off"></oas-switch>
</DemoBlock>

## Events

<DemoBlock title="Toggle events">
  <oas-switch id="switch-event" checked></oas-switch>
  <span id="switch-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

Listen to `oas-change` (`detail: { checked }`):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('switch-event')
  const out = document.getElementById('switch-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.checked}`
  })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `checked` | Whether on | `boolean` | — |
| `checked-text` | Label shown when on; inside the track at medium/large/xl, outside at xs/small | — | — |
| `color` | Custom primary color for the on state, overrides `--oas-color-primary` (CSS color value) | — | — |
| `disabled` | Disabled | `boolean` | — |
| `loading` | Loading state, prevents toggling | `boolean` | — |
| `size` | Size: `xs` / `small` / `medium` (default) / `large` / `xl`; invalid values fall back to `medium` with a warning | `string` | `medium` |
| `unchecked-text` | Label shown when off; inside the track at medium/large/xl, outside at xs/small | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Toggle, `detail: { checked }` |
