# Transfer

Dual left/right panels with shuttle buttons in the middle, supporting search filtering and keyboard operation.

## Basic Usage

<DemoBlock title="Basic">
  <oas-transfer id="transfer-basic"></oas-transfer>
</DemoBlock>

## Preset Values & Titles

<DemoBlock title="Preset value + titles">
  <oas-transfer id="transfer-preset" value='["b"]' titles='["可选水果", "已选水果"]'></oas-transfer>
</DemoBlock>

## Searchable

<DemoBlock title="searchable">
  <oas-transfer id="transfer-search" searchable></oas-transfer>
</DemoBlock>

## Events

<DemoBlock title="Change events">
  <oas-transfer id="transfer-event"></oas-transfer>
  <span id="transfer-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const basic = document.getElementById('transfer-basic')
  if (basic) basic.data = [
    { key: 'a', label: '苹果' },
    { key: 'b', label: '香蕉' },
    { key: 'c', label: '橙子' },
    { key: 'd', label: '葡萄', disabled: true },
  ]
  const preset = document.getElementById('transfer-preset')
  if (preset) preset.data = [
    { key: 'a', label: '苹果' },
    { key: 'b', label: '香蕉' },
    { key: 'c', label: '橙子' },
  ]
  const search = document.getElementById('transfer-search')
  if (search) search.data = [
    { key: 'a', label: '苹果' },
    { key: 'b', label: '香蕉' },
    { key: 'c', label: '橙子' },
    { key: 'd', label: '草莓' },
    { key: 'e', label: '西瓜' },
  ]
  const el = document.getElementById('transfer-event')
  if (el) {
    el.data = [
      { key: 'a', label: '苹果' },
      { key: 'b', label: '香蕉' },
      { key: 'c', label: '橙子' },
    ]
    const out = document.getElementById('transfer-output')
    el.addEventListener('oas-change', (e) => {
      out.textContent = `oas-change: [${e.detail.value.join(', ')}]`
    })
  }
})
</script>

## API

| Property       | Description                                           | Default    |
| -------------- | ----------------------------------------------------- | ---------- |
| `data`         | Data (property, `[{ key, label, disabled }]`)         | `[]`       |
| `value`        | Selected key array (JSON attribute)                   | `[]`       |
| `titles`       | Panel titles (JSON array) or `source-title`/`target-title` | source/selected |
| `searchable`   | Search filtering within panels                        | `false`    |

Keyboard: after focusing a panel list, `↑`/`↓` moves the selection, `Enter` shuttles.

| Event         | Description                              |
| ------------- | ---------------------------------------- |
| `oas-change`  | Value change after shuttling, `detail: { value }` |
