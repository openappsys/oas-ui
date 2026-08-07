# Table 表格

## 基础用法（含排序）

<div class="demo">
  <oas-table columns='[{"key":"name","title":"姓名","sortable":true},{"key":"age","title":"年龄"},{"key":"city","title":"城市"}]' data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"},{"name":"王五","age":35,"city":"深圳"}]' row-key="name"></oas-table>
</div>

## 空态

<div class="demo">
  <oas-table columns='[{"key":"name","title":"姓名"}]' data="[]"></oas-table>
</div>

## API

| 属性 | 说明 |
|---|---|
| `columns` | `[{ key, title, sortable?, width?, align?, render? }]` |
| `data` | `[{ [key]: value }]` |
| `sort-key` / `sort-order` | 受控排序 |
| `row-key` | 行唯一键，默认 `key` |
| `selected` | 选中的行 key（逗号分隔） |
| `empty-text` | 空态文案，默认"暂无数据" |

| 事件 | 说明 |
|---|---|
| `oas-sort-change` | `detail: { key, order: 'asc'\|'desc'\|'' }` |
| `oas-row-click` | `detail: { row, key }`（点击行切换选中） |
