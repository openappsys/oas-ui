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

## Check Strategy (check-strategy)

`check-strategy` controls which nodes enter `value` in multiple mode: `all` (default) keeps both parents and children; `parent` keeps only parent nodes (a parent represents its fully-checked children); `child` keeps only leaf nodes. All three strategies share the same cascaded checking logic — only the emitted value differs:

<DemoBlock title="Check strategy (all / parent / child)">
  <div style="display: flex; gap: var(--oas-space-3); flex-wrap: wrap; width: 100%">
    <div>
      <oas-tree-select id="ts-strategy-all" multiple check-strategy="all" placeholder="all: check parent → parent + all children" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Styles","value":"css"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">all: value = <span id="ts-out-all">—</span></p>
    </div>
    <div>
      <oas-tree-select id="ts-strategy-parent" multiple check-strategy="parent" placeholder="parent: check parent → parents only" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Styles","value":"css"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">parent: value = <span id="ts-out-parent">—</span></p>
    </div>
    <div>
      <oas-tree-select id="ts-strategy-child" multiple check-strategy="child" placeholder="child: check parent → leaves only" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Styles","value":"css"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">child: value = <span id="ts-out-child">—</span></p>
    </div>
  </div>
</DemoBlock>

After checking "Frontend", the three strategies emit: `all` → `["fe","framework","vue","react","css"]`, `parent` → `["fe"]`, `child` → `["vue","react","css"]` (order follows the demo data's declaration order of "Framework" children). Under `parent`, checking leaves one by one converges the value to the parent once all its children are checked.

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

## Large Data (Virtual Scroll)

<DemoBlock title="Ten-thousand-node virtual scroll">
  <oas-tree-select id="ts-virtual" multiple virtual height="288" item-height="36" expanded='["dept-0"]' placeholder="Click to open the 10k dept tree" options='[]'></oas-tree-select>
  <oas-button id="ts-expand-all" size="small">Expand all</oas-button>
  <oas-button id="ts-collapse-all" size="small">Collapse all</oas-button>
</DemoBlock>

Setting `virtual` enables windowed rendering (with `height` for the viewport and `item-height` for the row height): the dropdown reuses `oas-virtual-list` to render only the visible window, so 10,100 nodes (100 departments × 100 members) scroll smoothly; `↑/↓` move the highlight, `Enter` toggles a check, `→/←` expand/collapse, and `aria-activedescendant` stays valid across window re-renders. Data is injected via the `options` property channel, the expanded set is controlled by the `expanded` attribute, and "Expand all" writes the full node set externally.

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

  // check-strategy demos: echo the emitted value (visible feedback)
  for (const [elId, spanId] of [
    ['ts-strategy-all', 'ts-out-all'],
    ['ts-strategy-parent', 'ts-out-parent'],
    ['ts-strategy-child', 'ts-out-child'],
  ]) {
    document.getElementById(elId)?.addEventListener('oas-change', (e) => {
      document.getElementById(spanId).textContent = `[${e.detail.value.join(', ')}]`
    })
  }

  // 10k-node virtual demo: inject 100 departments × 100 members = 10100 nodes, drive expanded externally
  const tsVirtual = document.getElementById('ts-virtual')
  if (tsVirtual) {
    const roots = Array.from({ length: 100 }, (_, i) => ({
      label: `Dept ${i}`,
      value: `dept-${i}`,
      children: Array.from({ length: 100 }, (_, j) => ({
        label: `Member ${i}-${j}`,
        value: `m-${i}-${j}`,
      })),
    }))
    tsVirtual.options = roots
    document.getElementById('ts-expand-all')?.addEventListener('click', () => {
      tsVirtual.setAttribute('expanded', JSON.stringify(roots.map((r) => r.value)))
    })
    document.getElementById('ts-collapse-all')?.addEventListener('click', () => {
      tsVirtual.setAttribute('expanded', '[]')
    })
  }

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
| `check-strategy` | Multiple-select check strategy: `all` (default) keeps both parents and children in the value; `parent` keeps only parent nodes (a parent represents its fully-checked children); `child` keeps only leaf nodes | `string` | `all` |
| `disabled` | Disabled | `boolean` | — |
| `expanded` | Set of expanded node values (JSON array, controlled) | `string` | `[]` |
| `height` | Virtual-scroll viewport height (px); works with `virtual` | `string` | `288` |
| `item-height` | Fixed row height for virtual scroll (px) | `string` | `36` |
| `multiple` | Multiple select + parent-child cascade | `boolean` | — |
| `options` | Tree options, JSON array, supports `children` / `disabled` | `TreeOption[] \| string` | `[]` |
| `placeholder` | Placeholder text | — | — |
| `value` | Selected value (JSON array in multiple mode) | `string` | `[]` |
| `virtual` | Enable virtual scroll: the dropdown renders only the visible window for large data (reuses oas-virtual-list), keeping keyboard/ARIA intact | `boolean` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Selection change, `detail: { value }` |
