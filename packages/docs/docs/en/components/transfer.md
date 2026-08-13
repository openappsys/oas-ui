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

## Case-sensitive Search

<DemoBlock title="searchable + case-sensitive">
  <oas-transfer id="transfer-casesensitive" searchable case-sensitive></oas-transfer>
</DemoBlock>

## One-way Mode

Move left to right only; the right panel is read-only. The left panel shows all data, already transferred items are disabled and shown as selected.

<DemoBlock title="one-way">
  <oas-transfer id="transfer-oneway" one-way></oas-transfer>
</DemoBlock>

## Virtual Scroll

Windowed rendering for tens of thousands of items with smooth scrolling; selection, select-all and keyboard navigation keep working.

<DemoBlock title="virtual (10000 items, item-height 32)">
  <oas-transfer id="transfer-virtual" virtual searchable item-height="32"></oas-transfer>
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
  const cs = document.getElementById('transfer-casesensitive')
  if (cs) cs.data = [
    { key: 'a', label: 'Apple' },
    { key: 'b', label: 'apricot' },
    { key: 'c', label: 'Banana' },
  ]
  const oneway = document.getElementById('transfer-oneway')
  if (oneway) oneway.data = [
    { key: 'a', label: 'Apple' },
    { key: 'b', label: 'Banana' },
    { key: 'c', label: 'Orange' },
    { key: 'd', label: 'Strawberry' },
  ]
  const virtual = document.getElementById('transfer-virtual')
  if (virtual) virtual.data = Array.from({ length: 10000 }, (_, i) => ({ key: 'k' + i, label: 'Item ' + i }))
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
| `case-sensitive` | Search filtering is case-sensitive (case-insensitive by default) | `boolean` | — |
| `data` | Data (JSON attribute channel; property assignment reflects to attribute, [{ key, label, disabled }]) | `TransferItem[] \| string` | `[]` |
| `item-height` | Fixed row height for virtual scrolling (px), default 36 | `string` | `36` |
| `one-way` | One-way mode: move left to right only, right panel is read-only; left panel shows all data, already transferred items are disabled and shown as selected | `boolean` | — |
| `searchable` | Search filtering within panels (filtered independently per panel) | `boolean` | — |
| `source-title` | — | — | — |
| `target-title` | — | — | — |
| `titles` | Panel titles (JSON array) or `source-title`/`target-title` | `string` | — |
| `value` | Selected key array (JSON attribute) | `string` | `[]` |
| `virtual` | Windowed rendering for large data (virtual scroll, default row height 36px) | `boolean` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Value change after shuttling, `detail: { value }` |

Keyboard: after focusing a panel list, `↑`/`↓` moves the selection, `Enter` shuttles.
