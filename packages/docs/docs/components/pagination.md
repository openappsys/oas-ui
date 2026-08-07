# Pagination 分页

## 基础用法

<div class="demo">
  <oas-pagination total="100" page-size="10" current="1"></oas-pagination>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `total` | 总条数 | `0` |
| `page-size` | 每页条数 | `10` |
| `current` | 当前页 | `1` |
| `siblings` | 当前页前后页码数 | `1` |

| 事件 | 说明 |
|---|---|
| `oas-change` | 翻页，`detail: { page }` |

页码省略显示，首末页禁用。
