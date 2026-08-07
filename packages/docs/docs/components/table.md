# Table 表格

用于以行列表格形式展示结构化数据，支持排序与行选中。

## 基础用法（含排序）

<DemoBlock title="可排序列">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名","sortable":true},{"key":"age","title":"年龄","sortable":true},{"key":"city","title":"城市"}]' data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"},{"name":"王五","age":35,"city":"深圳"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

点击可排列表头在升序 / 降序 / 取消之间循环。

## 列对齐与宽度

<DemoBlock title="对齐与宽度">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名","width":"160px"},{"key":"age","title":"年龄","align":"center"},{"key":"city","title":"城市","align":"right"}]' data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

## 受控排序与行选中

<DemoBlock title="初始排序与选中">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄","sortable":true},{"key":"city","title":"城市"}]' data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"},{"name":"王五","age":35,"city":"深圳"}]' sort-key="age" sort-order="desc" selected="王五" row-key="name"></oas-table>
  </div>
</DemoBlock>

`sort-key` / `sort-order` 控制排序，`selected` 高亮选中行（点击行可切换选中）。

## 多选

<DemoBlock title="行多选（checkable）">
  <div style="width: 100%">
    <oas-table checkable columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"}]' data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"},{"name":"王五","age":35,"city":"深圳"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

表头复选框一键全选/取消，行复选框单独勾选；选中变化派发 `oas-check`。

## 空态

<DemoBlock title="空数据">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"}]' data="[]"></oas-table>
  </div>
</DemoBlock>

<DemoBlock title="自定义空态文案">
  <div style="width: 100%">
    <oas-table empty-text="暂无匹配数据" columns='[{"key":"name","title":"姓名"}]' data="[]"></oas-table>
  </div>
</DemoBlock>

## 事件

<DemoBlock title="排序与点击事件">
  <div style="width: 100%">
    <oas-table id="table-event" columns='[{"key":"name","title":"姓名","sortable":true},{"key":"age","title":"年龄","sortable":true},{"key":"city","title":"城市"}]' data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"},{"name":"王五","age":35,"city":"深圳"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      排序：<span id="table-sort">无</span> · 点击行：<span id="table-row">—</span>
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const table = document.querySelector('#table-event')
  table?.addEventListener('oas-sort-change', (e) => {
    const { key, order } = e.detail
    document.querySelector('#table-sort').textContent = order ? `${key} ${order}` : '无'
  })
  table?.addEventListener('oas-row-click', (e) => {
    document.querySelector('#table-row').textContent = e.detail.row.name ?? e.detail.key
  })
})
</script>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `columns` | 列配置 `[{ key, title, sortable?, width?, align?, render? }]`，JSON 字符串 | string | `[]` |
| `data` | 行数据 `[{ [key]: value }]`，JSON 字符串 | string | `[]` |
| `sort-key` / `sort-order` | 受控排序；`sort-order` 取 `asc` / `desc` / 空 | string | — |
| `row-key` | 行唯一键字段 | string | `key` |
| `selected` | 选中行 key 集合（逗号分隔） | string | — |
| `empty-text` | 空态文案 | string | `暂无数据` |
| `checkable` | 复选框多选开关 | boolean | `false` |

> 说明：`columns.render` 为函数类型，仅支持在 JS 侧构造后通过属性整体赋值，无法用 JSON 字符串表达。

| 事件 | 说明 |
|---|---|
| `oas-sort-change` | 排序变化，`detail: { key, order: 'asc' \| 'desc' \| '' }` |
| `oas-row-click` | 点击行（非 checkable 时同时切换选中），`detail: { row, key }` |
| `oas-check` | 复选框选中变化，`detail: { keys: string[] }` |
