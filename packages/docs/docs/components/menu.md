# Menu 菜单

菜单项列表，支持键盘导航。

## 基础用法

<div class="demo">
  <oas-menu style="width: 200px" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'></oas-menu>
</div>

## API

| 属性 | 说明 |
|---|---|
| `items` | 菜单项 JSON `[{ label, value, disabled }]` |
| `value` | 当前选中值 |

| 事件 | 说明 |
|---|---|
| `oas-select` | 选择，`detail: { value }` |

键盘：方向键导航、Enter 选择、Home/End。`role="menu"` + `menuitem`。
