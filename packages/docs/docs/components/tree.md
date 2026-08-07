# Tree 树

## 基础用法

<div class="demo">
  <oas-tree data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"},{"key":"a-2","label":"子节点 2"}]},{"key":"b","label":"节点 B"}]'></oas-tree>
</div>

## 多选

<div class="demo">
  <oas-tree checkable data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"}]},{"key":"b","label":"节点 B"}]'></oas-tree>
</div>

## API

| 属性 | 说明 |
|---|---|
| `data` | `[{ key, label, children?, disabled? }]` |
| `selected` | 选中节点 key |
| `checked` | 多选节点 key 集合（逗号分隔） |
| `expanded` | 展开节点 key 集合（逗号分隔） |
| `checkable` | 显示复选框 |

| 事件 | 说明 |
|---|---|
| `oas-select` | `detail: { key, selected }` |
| `oas-check` | `detail: { key, checked }` |
