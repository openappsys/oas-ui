# ToggleButton

An `aria-pressed` two-state toggle button; the pressed state uses the primary color background.

## Basic Usage

<DemoBlock title="Basic">
  <oas-toggle-button value="bold">Bold</oas-toggle-button>
  <oas-toggle-button value="italic" pressed>Italic</oas-toggle-button>
</DemoBlock>

## Events

<DemoBlock title="Change events">
  <oas-toggle-button id="tb-event" value="underline">Underline</oas-toggle-button>
  <span id="tb-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('tb-event')
  const out = document.getElementById('tb-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: { value: ${e.detail.value}, pressed: ${e.detail.pressed} }`
  })
})
</script>

## Disabled

<DemoBlock title="Disabled">
  <oas-toggle-button value="strike" disabled>Strikethrough</oas-toggle-button>
  <oas-toggle-button value="strike" pressed disabled>Strikethrough (pressed)</oas-toggle-button>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disabled | `boolean` | — |
| `pressed` | Whether pressed (controlled) | `boolean` | — |
| `value` | Value (returned with events) | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Toggle, `detail: { value, pressed }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |
