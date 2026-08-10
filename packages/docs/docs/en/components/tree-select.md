# TreeSelect

Tree-structure selection supporting parent-child cascaded multiple selection.

## Single Select

<DemoBlock title="Single select">
  <oas-tree-select placeholder="请选择节点" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
</DemoBlock>

Click a node to select it and close the dropdown; children can be expanded/collapsed.

## Multiple Select (parent-child linkage)

<DemoBlock title="Multiple">
  <oas-tree-select multiple placeholder="可选择多个节点" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
</DemoBlock>

In multiple mode, selecting a parent cascades the selection to all children; clicking again cancels. Parent nodes show an "all / half" selected state.

## Preset Value

<DemoBlock title="Preset value">
  <oas-tree-select value="vue" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]}]}]'></oas-tree-select>
</DemoBlock>

## Controlled Expand (expanded)

`expanded` is a JSON array declaring the set of node values to expand (a controlled channel): externally changing the property immediately reflects in the dropdown tree. Below, "前端 → 框架" is pre-expanded, and buttons drive it externally:

<DemoBlock title="Controlled expand (expanded)">
  <oas-tree-select id="tree-expanded" expanded='["fe","framework"]' placeholder="点击查看预展开节点" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
  <oas-button id="tree-expand-all" size="small">全部展开</oas-button>
  <oas-button id="tree-collapse-all" size="small">全部收起</oas-button>
</DemoBlock>

Presetting `expanded='["fe","framework"]'` expands "前端" and "框架" the first time the dropdown opens; clicking "全部展开" externally writes `expanded='["fe","framework","be"]'`, and "全部收起" writes `'[]'`, re-rendering immediately when the dropdown opens.

## Disabled

<DemoBlock title="Disabled">
  <oas-tree-select disabled value="vue" placeholder="禁用" options='[{"label":"前端","value":"fe","children":[{"label":"Vue","value":"vue"}]}]'></oas-tree-select>
</DemoBlock>

## Empty State

<DemoBlock title="No data">
  <oas-tree-select placeholder="暂无数据" options='[]'></oas-tree-select>
</DemoBlock>

## Events

<DemoBlock title="Change events">
  <oas-tree-select id="tree-event" multiple placeholder="选择后触发 oas-change" options='[{"label":"前端","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
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

  // expanded（受控展开）demo：外部驱动展开节点集合
  document.getElementById('tree-expand-all')?.addEventListener('click', () => {
    document.getElementById('tree-expanded')?.setAttribute('expanded', '["fe","framework","be"]')
  })
  document.getElementById('tree-collapse-all')?.addEventListener('click', () => {
    document.getElementById('tree-expanded')?.setAttribute('expanded', '[]')
  })
})
</script>

## API

| Property       | Description                                          | Default   |
| -------------- | ---------------------------------------------------- | -------- |
| `value`        | Selected value (JSON array in multiple mode)         | —        |
| `options`      | Tree options, JSON array, supports `children` / `disabled` | `[]` |
| `expanded`     | Set of expanded node values (JSON array, controlled) | `[]`     |
| `placeholder`  | Placeholder text                                     | `请选择` |
| `multiple`     | Multiple select + parent-child cascade               | `false`  |
| `disabled`     | Disabled                                             | `false`  |

| Event         | Description                        |
| ------------- | ---------------------------------- |
| `oas-change`  | Selection change, `detail: { value }` |
