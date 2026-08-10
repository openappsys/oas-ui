# Segmented

A single-select linear segmented control for light filtering / view switching, `role="radiogroup"`, with per-item disabling.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-segmented options='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-segmented>
</DemoBlock>

## Default selection

<DemoBlock title="Controlled value">
  <oas-segmented value="week" options='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-segmented>
</DemoBlock>

## Disabled items

<DemoBlock title="Disabled options">
  <oas-segmented options='[{"label":"Enabled","value":"on"},{"label":"Disabled","value":"off","disabled":true},{"label":"Read-only","value":"ro","disabled":true}]'></oas-segmented>
</DemoBlock>

## Switch event

<DemoBlock title="oas-change event">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-segmented id="segmented-demo" options='[{"label":"Chart","value":"chart"},{"label":"List","value":"list"},{"label":"Board","value":"board"}]'></oas-segmented>
    <oas-tag type="primary" id="segmented-info">Currently selected: chart</oas-tag>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const seg = document.getElementById('segmented-demo')
  const info = document.getElementById('segmented-info')
  seg?.addEventListener('oas-change', (e) => {
    const { value } = e.detail
    info.textContent = `Currently selected: ${value}`
  })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `options` | `[{ label, value, disabled? }]` JSON string | — | `[]` |
| `value` | Selected value (defaults to the first option; controlled) | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Switched, `detail: { value }` |

The container is `role="radiogroup"`; each item is `role="radio"` + `aria-checked` / `aria-disabled`.
