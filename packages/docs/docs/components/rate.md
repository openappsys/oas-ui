# Rate 评分

星级评分，支持键盘方向键调节。

## 基础用法

<div class="demo">
  <oas-rate value="3"></oas-rate>
</div>

## 自定义数量

<div class="demo">
  <oas-rate value="7" max="10"></oas-rate>
</div>

## 半星

<div class="demo">
  <oas-rate value="3.5" allow-half></oas-rate>
</div>

## 禁用

<div class="demo">
  <oas-rate value="4" disabled></oas-rate>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `value` | 当前评分（受控） | `0` |
| `max` | 星级数量 | `5` |
| `allow-half` | 允许半星 | `false` |
| `disabled` | 禁用 | `false` |

键盘：方向键调节、`Home` 归零、`End` 满分。

| 事件 | 说明 |
|---|---|
| `oas-change` | 变化，`detail: { value }` |
