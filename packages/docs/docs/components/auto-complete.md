# AutoComplete 自动完成

输入联想建议，支持键盘导航与过滤。

## 基础用法

<div class="demo">
  <oas-auto-complete placeholder="输入「苹」试试" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `value` | 选中值 | — |
| `options` | 选项，JSON 数组 | `[]` |
| `placeholder` | 占位符 | — |
| `disabled` | 禁用 | `false` |

键盘：方向键导航、Enter 选择、Esc 关闭。

| 事件 | 说明 |
|---|---|
| `oas-input` | 输入中，`detail: { value }` |
| `oas-change` | 选择，`detail: { value, label }` |
