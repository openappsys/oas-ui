# TreeSelect

Tree-structure selection supporting parent-child cascaded multiple selection.

## Single Select

<DemoBlock title="Single select">
  <oas-tree-select placeholder="Select a node" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Styles","value":"css"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
</DemoBlock>

Click a node to select it and close the dropdown; children can be expanded/collapsed.

## Multiple Select (parent-child linkage)

<DemoBlock title="Multiple">
  <oas-tree-select multiple placeholder="Select multiple nodes" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Styles","value":"css"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
</DemoBlock>

In multiple mode, selecting a parent cascades the selection to all children; clicking again cancels. Parent nodes show an "all / half" selected state.

## Preset Value

<DemoBlock title="Preset value">
  <oas-tree-select value="vue" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]}]}]'></oas-tree-select>
</DemoBlock>

## Controlled Expand (expanded)

`expanded` is a JSON array declaring the set of node values to expand (a controlled channel): externally changing the property immediately reflects in the dropdown tree. Below, "Frontend → Framework" is pre-expanded, and buttons drive it externally:

<DemoBlock title="Controlled expand (expanded)">
  <oas-tree-select id="tree-expanded" expanded='["fe","framework"]' placeholder="Click to see pre-expanded nodes" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Styles","value":"css"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
  <oas-button id="tree-expand-all" size="small">Expand all</oas-button>
  <oas-button id="tree-collapse-all" size="small">Collapse all</oas-button>
</DemoBlock>

Presetting `expanded='["fe","framework"]'` expands "Frontend" and "Framework" the first time the dropdown opens; clicking "Expand all" externally writes `expanded='["fe","framework","be"]'`, and "Collapse all" writes `'[]'`, re-rendering immediately when the dropdown opens.

## Disabled

<DemoBlock title="Disabled">
  <oas-tree-select disabled value="vue" placeholder="Disabled" options='[{"label":"Frontend","value":"fe","children":[{"label":"Vue","value":"vue"}]}]'></oas-tree-select>
</DemoBlock>

## Empty State

<DemoBlock title="No data">
  <oas-tree-select placeholder="No data" options='[]'></oas-tree-select>
</DemoBlock>

## Events

<DemoBlock title="Change events">
  <oas-tree-select id="tree-event" multiple placeholder="Select to trigger oas-change" options='[{"label":"Frontend","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
  <span id="tree-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

Listen to `oas-change`; `detail.value` is a string for single select and an array for multiple:

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('tree-event')
  const out = document.getElementById('tree-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: [${e.detail.value.join(', ')}]`
  })

  // expanded (controlled expand) demo: drive the set of expanded nodes externally
  document.getElementById('tree-expand-all')?.addEventListener('click', () => {
    document.getElementById('tree-expanded')?.setAttribute('expanded', '["fe","framework","be"]')
  })
  document.getElementById('tree-collapse-all')?.addEventListener('click', () => {
    document.getElementById('tree-expanded')?.setAttribute('expanded', '[]')
  })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disabled | — | — |
| `expanded` | Set of expanded node values (JSON array, controlled) | — | `[]` |
| `multiple` | Multiple select + parent-child cascade | — | — |
| `options` | Tree options, JSON array, supports `children` / `disabled` | `TreeOption[] \| string` | `[]` |
| `placeholder` | Placeholder text | — | — |
| `value` | Selected value (JSON array in multiple mode) | — | `[]` |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Selection change, `detail: { value }` |
