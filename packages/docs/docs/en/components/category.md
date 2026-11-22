---
description: "Category picker: linked two-pane layout with a multi-level category tree on the left and subcategory grids / product slots on the right."
---

# Category

A two-pane category navigation: a multi-level tree on the left (expand/collapse) and a grid of the active category's children on the right; leaf categories list product slots. Both panes stay in sync, with keyboard tree navigation.

## Basic usage

`categories` injects the tree: `children` are subcategories, `items` are leaf product slots.

<DemoBlock title="Linked panes">
  <oas-category
    id="category-demo"
    categories='[{"key":"digital","label":"Digital","children":[{"key":"phone","label":"Phones","children":[{"key":"apple","label":"Apple"},{"key":"android","label":"Android"}]},{"key":"audio","label":"Audio","items":[{"key":"p1","label":"Bluetooth headphones","meta":"Hot"},{"key":"p2","label":"Portable speakers","meta":"New"}]}]},{"key":"home","label":"Home","children":[{"key":"storage","label":"Storage","items":[{"key":"p3","label":"Storage boxes"},{"key":"p4","label":"Hangers"}]}]},{"key":"beauty","label":"Beauty","items":[{"key":"p5","label":"Face masks"},{"key":"p6","label":"Serum"}]}]'
  ></oas-category>
</DemoBlock>

## Events

- `oas-change`: emitted when a left node is selected or a subcategory is entered from the right; detail `{ key, path, node }` (path runs from the root to the active category)
- `oas-select`: emitted when a product slot is clicked; detail `{ key, item, path }`

<DemoBlock title="Linked feedback">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-category
      id="category-event-demo"
      categories='[{"key":"digital","label":"Digital","children":[{"key":"phone","label":"Phones","children":[{"key":"apple","label":"Apple"},{"key":"android","label":"Android"}]},{"key":"audio","label":"Audio","items":[{"key":"p1","label":"Bluetooth headphones","meta":"Hot"}]}]},{"key":"home","label":"Home","items":[{"key":"p3","label":"Storage boxes"}]}]'
    ></oas-category>
    <oas-tag type="primary" id="category-event-info">Active: digital</oas-tag>
  </oas-space>
</DemoBlock>

## Multi-level expansion

Tree keys: `↑` / `↓` move, `→` expands or enters the first child, `←` collapses or returns to the parent, `Enter` / `Space` selects. `aria-expanded` / `aria-level` follow the hierarchy. Clicking an expanded parent collapses it; the right pane keeps showing its child grid.

<DemoBlock title="Multi-level">
  <oas-category
    active-key="apple"
    categories='[{"key":"digital","label":"Digital","children":[{"key":"phone","label":"Phones","children":[{"key":"apple","label":"Apple"},{"key":"android","label":"Android"}]},{"key":"audio","label":"Audio","items":[{"key":"p1","label":"Bluetooth headphones"}]}]}]'
  ></oas-category>
</DemoBlock>

## Empty state

When `categories` is absent, invalid JSON or an empty array, an empty state is rendered without throwing.

<DemoBlock title="Empty">
  <oas-category></oas-category>
</DemoBlock>

## Data contract

```json
[
  {
    "key": "digital",
    "label": "Digital",
    "children": [{ "key": "phone", "label": "Phones", "items": [{ "key": "p1", "label": "Bluetooth headphones", "meta": "Hot" }] }]
  }
]
```

- `key` is required and must be unique (falls back to `id` / `label` / `name` when absent)
- `children` are subcategories with no depth limit; `items` are product slots (`label` + optional `meta`)
- `active-key` is controlled: writing it from outside expands its path; absent selects the first root
- The same-named property channel works too: `categories` accepts an array directly (serialized and reflected into the JSON attribute; the getter returns the parsed nodes)

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('category-event-demo')
  const info = document.getElementById('category-event-info')
  el?.addEventListener('oas-change', (e) => {
    info.textContent = `Active: ${e.detail.path.join(' / ')}`
  })
  el?.addEventListener('oas-select', (e) => {
    info.textContent = `Picked: ${e.detail.item.label}`
  })
})
</script>

## API

### oas-category

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `active-key` | Active category key (controlled); writing it expands its path, absent selects the first root | `string` | — |
| `categories` | Category tree (host-injected): JSON array [{ key?, id?, label?, name?, children?, items? }]; keys are globally unique, children are recursive, items are product slots [{ key, label, meta? }] | `CategoryNode[] \| string` | `[]` |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Emitted when a left node is selected or a subcategory is entered from the right; detail { key, path, node } (path runs from root to the active category) |
| `oas-select` | Emitted when a product slot is clicked; detail { key, item, path } |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-category-height` | `24rem` |
| `--oas-category-side-height` | `12rem` |
| `--oas-category-side-width` | `9rem` |
