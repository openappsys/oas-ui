# Select 选择器

下拉选择器，支持单选、多选、键盘导航。

## 单选

<div class="demo">
  <oas-select placeholder="请选择水果" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
</div>

## 多选

<div class="demo">
  <oas-select multiple placeholder="请选择水果" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
</div>

## 禁用

<div class="demo">
  <oas-select disabled placeholder="禁用" options='[{"label":"苹果","value":"apple"}]'></oas-select>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `value` | 当前值（多选为 JSON 数组） | — |
| `options` | 选项，JSON 数组 `[{ label, value, disabled }]` | `[]` |
| `placeholder` | 占位符 | `请选择` |
| `multiple` | 多选 | `false` |
| `disabled` | 禁用 | `false` |

键盘：方向键导航、Enter 选择、Esc 关闭。

| 事件 | 说明 |
|---|---|
| `oas-change` | 选择变化，`detail: { value }` |
