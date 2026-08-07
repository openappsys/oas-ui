# Button 按钮

基础按钮组件，原生 `<button>` 增强。

## 类型

<div class="demo">
  <oas-button>默认按钮</oas-button>
  <oas-button type="primary">主要按钮</oas-button>
  <oas-button type="success">成功按钮</oas-button>
  <oas-button type="warning">警告按钮</oas-button>
  <oas-button type="danger">危险按钮</oas-button>
  <oas-button type="text">文字按钮</oas-button>
</div>

```html
<oas-button type="primary">主要按钮</oas-button>
```

## 尺寸

<div class="demo">
  <oas-button size="small">小按钮</oas-button>
  <oas-button size="medium">中按钮</oas-button>
  <oas-button size="large">大按钮</oas-button>
</div>

## 禁用与加载

<div class="demo">
  <oas-button disabled>禁用</oas-button>
  <oas-button type="primary" loading>加载中</oas-button>
</div>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `type` | 类型 | `default` / `primary` / `success` / `warning` / `danger` / `text` | `default` |
| `size` | 尺寸 | `small` / `medium` / `large` | `medium` |
| `disabled` | 禁用 | boolean | `false` |
| `loading` | 加载态 | boolean | `false` |

| 事件 | 说明 |
|---|---|
| `oas-click` | 点击，`detail: { originalEvent }` |
