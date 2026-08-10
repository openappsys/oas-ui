# Segmented

A single-select linear segmented control for light filtering / view switching, `role="radiogroup"`, with per-item disabling.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-segmented options='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-segmented>
</DemoBlock>

## Default selection

<DemoBlock title="Controlled value">
  <oas-segmented value="week" options='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-segmented>
</DemoBlock>

## Disabled items

<DemoBlock title="Disabled options">
  <oas-segmented options='[{"label":"启用","value":"on"},{"label":"禁用","value":"off","disabled":true},{"label":"仅读","value":"ro","disabled":true}]'></oas-segmented>
</DemoBlock>

## Switch event

<DemoBlock title="oas-change event">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-segmented id="segmented-demo" options='[{"label":"图表","value":"chart"},{"label":"列表","value":"list"},{"label":"看板","value":"board"}]'></oas-segmented>
    <oas-tag type="primary" id="segmented-info">当前选中：chart</oas-tag>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const seg = document.getElementById('segmented-demo')
  const info = document.getElementById('segmented-info')
  seg?.addEventListener('oas-change', (e) => {
    const { value } = e.detail
    info.textContent = `当前选中：${value}`
  })
})
</script>

## API

| Property  | Description                                          |
| --------- | ---------------------------------------------------- |
| `options` | `[{ label, value, disabled? }]` JSON string          |
| `value`   | Selected value (defaults to the first option; controlled) |

| Event        | Description                      |
| ------------ | -------------------------------- |
| `oas-change` | Switched, `detail: { value }`    |

The container is `role="radiogroup"`; each item is `role="radio"` + `aria-checked` / `aria-disabled`.
