# Transfer

Dual left/right panels with shuttle buttons in the middle, supporting search filtering and keyboard operation.

## Basic Usage

<DemoBlock title="Basic">
  <oas-transfer id="transfer-basic"></oas-transfer>
</DemoBlock>

## Preset Values & Titles

<DemoBlock title="Preset value + titles">
  <oas-transfer id="transfer-preset" value='["b"]' titles='["Available fruits", "Selected fruits"]'></oas-transfer>
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
    { key: 'a', label: 'Apple' },
    { key: 'b', label: 'Banana' },
    { key: 'c', label: 'Orange' },
    { key: 'd', label: 'Grape', disabled: true },
  ]
  const preset = document.getElementById('transfer-preset')
  if (preset) preset.data = [
    { key: 'a', label: 'Apple' },
    { key: 'b', label: 'Banana' },
    { key: 'c', label: 'Orange' },
  ]
  const search = document.getElementById('transfer-search')
  if (search) search.data = [
    { key: 'a', label: 'Apple' },
    { key: 'b', label: 'Banana' },
    { key: 'c', label: 'Orange' },
    { key: 'd', label: 'Strawberry' },
    { key: 'e', label: 'Watermelon' },
  ]
  const el = document.getElementById('transfer-event')
  if (el) {
    el.data = [
      { key: 'a', label: 'Apple' },
      { key: 'b', label: 'Banana' },
      { key: 'c', label: 'Orange' },
    ]
    const out = document.getElementById('transfer-output')
    el.addEventListener('oas-change', (e) => {
      out.textContent = `oas-change: [${e.detail.value.join(', ')}]`
    })
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `data` | Data (property, `[{ key, label, disabled }]`) | `TransferItem[]` | — |
| `searchable` | Search filtering within panels | — | — |
| `source-title` | — | — | — |
| `target-title` | — | — | — |
| `titles` | Panel titles (JSON array) or `source-title`/`target-title` | — | — |
| `value` | Selected key array (JSON attribute) | — | `[]` |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Value change after shuttling, `detail: { value }` |

Keyboard: after focusing a panel list, `↑`/`↓` moves the selection, `Enter` shuttles.
