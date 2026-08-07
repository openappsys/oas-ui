# Breadcrumb 面包屑

展示页面层级路径。

## 基础用法

<div class="demo">
  <oas-breadcrumb items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"按钮"}]'></oas-breadcrumb>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `items` | `[{ label, href? }]` | `[]` |
| `separator` | 分隔符 | `/` |

| 事件 | 说明 |
|---|---|
| `oas-select` | 点击链接，`detail: { value: href }` |

`nav` + `aria-label="面包屑"`，当前页不可点。
