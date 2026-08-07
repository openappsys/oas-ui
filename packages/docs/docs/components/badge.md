# Badge 徽标

数字或红点徽标，标记在宿主内容右上角。

## 数字徽标

<div class="demo">
  <oas-badge value="5"><span>消息</span></oas-badge>
  <oas-badge value="120" max="99"><span>评论</span></oas-badge>
  <oas-badge value="0" show-zero><span>通知</span></oas-badge>
</div>

## 红点

<div class="demo">
  <oas-badge dot><span>状态</span></oas-badge>
  <oas-badge dot><oas-icon name="mail" size="24"></oas-icon></oas-badge>
</div>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `value` | 徽标数字 | number | — |
| `max` | 超出截断为 `max+` | number | — |
| `show-zero` | 值为 0 时是否显示 | boolean | `false` |
| `dot` | 红点模式 | boolean | `false` |
