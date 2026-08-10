# ColorPicker

Click the trigger swatch to open a color panel, supporting preset colors, HSV, and RGB input.

## Basic Usage

<DemoBlock title="Basic">
  <oas-color-picker value="#0b6cff"></oas-color-picker>
</DemoBlock>

## Custom Preset Colors

<DemoBlock title="Custom preset">
  <oas-color-picker preset='["#0b6cff","#16a34a","#d97706","#dc2626","#9333ea","#18181b"]'></oas-color-picker>
</DemoBlock>

## Disabled

<DemoBlock title="Disabled">
  <oas-color-picker value="#dc2626" disabled></oas-color-picker>
</DemoBlock>

## Events

<DemoBlock title="Change events">
  <oas-color-picker id="cp-event" value="#0b6cff"></oas-color-picker>
  <span id="cp-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('cp-event')
  const out = document.getElementById('cp-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disabled | `boolean` | — |
| `preset` | Preset color array (JSON) | `string` | — |
| `value` | Current color (hex) | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Color change, `detail: { value }` |

Keyboard: with the trigger button focused, `↑`/`↓` adjusts brightness; inside the panel, `Esc` closes, clicking outside closes.
