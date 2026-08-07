# Link 链接

原生 `<a>` 增强的文字链接。

## 类型

<div class="demo">
  <oas-link href="#">默认链接</oas-link>
  <oas-link href="#" type="primary">主要链接</oas-link>
  <oas-link href="#" type="success">成功链接</oas-link>
  <oas-link href="#" type="warning">警告链接</oas-link>
  <oas-link href="#" type="danger">危险链接</oas-link>
</div>

## 下划线

<div class="demo">
  <oas-link href="#">有下划线</oas-link>
  <oas-link href="#" underline="false">无下划线</oas-link>
</div>

## 禁用

<div class="demo">
  <oas-link href="#" disabled>禁用链接</oas-link>
</div>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `href` | 链接地址 | string | — |
| `type` | 类型 | `default` / `primary` / `success` / `warning` / `danger` | `default` |
| `underline` | 下划线 | boolean | `true` |
| `disabled` | 禁用 | boolean | `false` |
| `target` | 打开方式 | string | — |

| 事件 | 说明 |
|---|---|
| `oas-click` | 点击，`detail: { originalEvent }` |
