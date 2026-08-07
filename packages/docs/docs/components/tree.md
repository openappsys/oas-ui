# Tree 树

用于展示层级数据，支持选中、展开与多选。

## 基础用法

<DemoBlock title="层级树">
  <div style="width: 100%">
    <oas-tree data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"},{"key":"a-2","label":"子节点 2"}]},{"key":"b","label":"节点 B","children":[{"key":"b-1","label":"子节点 1"}]},{"key":"c","label":"节点 C"}]'></oas-tree>
  </div>
</DemoBlock>

点击展开按钮显示 / 收起子节点，点击节点文本选中该节点。

## 受控展开与选中

<DemoBlock title="初始展开与选中">
  <div style="width: 100%">
    <oas-tree expanded="a" selected="a-1" data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"},{"key":"a-2","label":"子节点 2"}]},{"key":"b","label":"节点 B"}]'></oas-tree>
  </div>
</DemoBlock>

`expanded` 控制展开节点，`selected` 控制选中节点。

## 多选

<DemoBlock title="可多选（checkable）">
  <div style="width: 100%">
    <oas-tree checkable expanded="a" checked="a-1,b" data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"},{"key":"a-2","label":"子节点 2"}]},{"key":"b","label":"节点 B"}]'></oas-tree>
  </div>
</DemoBlock>

## 禁用节点

<DemoBlock title="禁用节点">
  <div style="width: 100%">
    <oas-tree expanded="a" data='[{"key":"a","label":"可操作节点","children":[{"key":"a-1","label":"子节点 1"},{"key":"a-2","label":"只读节点","disabled":true}]},{"key":"b","label":"只读节点","disabled":true}]'></oas-tree>
  </div>
</DemoBlock>

## 事件

<DemoBlock title="选中与勾选事件">
  <div style="width: 100%">
    <oas-tree id="tree-event" checkable expanded="a" data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"}]},{"key":"b","label":"节点 B"}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      选中：<span id="tree-select">—</span> · 勾选：<span id="tree-check">—</span>
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const tree = document.querySelector('#tree-event')
  tree?.addEventListener('oas-select', (e) => {
    document.querySelector('#tree-select').textContent = e.detail.key
  })
  tree?.addEventListener('oas-check', (e) => {
    const span = document.querySelector('#tree-check')
    span.textContent = span.textContent === '—' ? e.detail.key : `${span.textContent}、${e.detail.key}`
  })
})
</script>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `data` | 节点数据 `[{ key, label, children?, disabled? }]`，JSON 字符串 | string | `[]` |
| `selected` | 选中节点 key | string | — |
| `checked` | 勾选节点 key 集合（逗号分隔） | string | — |
| `expanded` | 展开节点 key 集合（逗号分隔） | string | — |
| `checkable` | 是否显示复选框 | boolean | `false` |

> 说明：`expanded` 未加入观察列表，仅首次渲染及交互（展开按钮）时生效。

| 事件 | 说明 |
|---|---|
| `oas-select` | 选中节点，`detail: { key, selected }` |
| `oas-check` | 勾选变化，`detail: { key, checked }` |
