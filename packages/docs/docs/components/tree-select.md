# TreeSelect 树选择

树形选择器，支持父子级联勾选。

## 多选（级联）

<div class="demo">
  <oas-tree-select multiple placeholder="选择技能" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"React","value":"react"},{"label":"Vue","value":"vue"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
</div>

## 单选

<div class="demo">
  <oas-tree-select placeholder="选择技能" options='[{"label":"前端","value":"fe","children":[{"label":"React","value":"react"},{"label":"Vue","value":"vue"}]}]'></oas-tree-select>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `value` | 选中值（多选为 JSON 数组） | — |
| `options` | 树形选项 | `[]` |
| `placeholder` | 占位符 | `请选择` |
| `multiple` | 多选 + 父子级联 | `false` |
| `disabled` | 禁用 | `false` |

| 事件 | 说明 |
|---|---|
| `oas-change` | 选择变化，`detail: { value }` |
