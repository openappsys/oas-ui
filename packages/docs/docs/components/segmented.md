# Segmented 分段器

## 基础用法

<div class="demo">
  <oas-segmented options='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-segmented>
</div>

## API

| 属性 | 说明 |
|---|---|
| `options` | `[{ label, value, disabled? }]` |
| `value` | 选中值（缺省选第一项） |

| 事件 | 说明 |
|---|---|
| `oas-change` | 切换，`detail: { value }` |

`role="radiogroup"`。
