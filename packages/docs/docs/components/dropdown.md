# Dropdown 下拉菜单

触发器 + 下拉菜单，浮层定位。

## 基础用法

<div class="demo">
  <oas-dropdown items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]' placement="bottom">
    <oas-button>操作</oas-button>
  </oas-dropdown>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `items` | 菜单项 JSON | `[]` |
| `value` | 当前选中值 | — |
| `placement` | `top` / `bottom` / `left` / `right` | `bottom` |
| `open` | 受控显示 | `false` |

| 事件 | 说明 |
|---|---|
| `oas-select` | 选择，`detail: { value }` |

click 触发，外部点击 / Esc 关闭。
