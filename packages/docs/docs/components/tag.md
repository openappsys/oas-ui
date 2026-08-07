# Tag 标签

用于标记和分类的小型标签。

## 类型

<div class="demo">
  <oas-tag>默认</oas-tag>
  <oas-tag type="primary">主色</oas-tag>
  <oas-tag type="success">成功</oas-tag>
  <oas-tag type="warning">警告</oas-tag>
  <oas-tag type="danger">危险</oas-tag>
  <oas-tag type="info">信息</oas-tag>
</div>

## 圆角与尺寸

<div class="demo">
  <oas-tag round type="primary">胶囊标签</oas-tag>
  <oas-tag size="small">小号</oas-tag>
  <oas-tag size="medium">中号</oas-tag>
  <oas-tag size="large">大号</oas-tag>
</div>

## 可关闭

<div class="demo">
  <oas-tag closable type="success">可关闭</oas-tag>
  <oas-tag closable type="info">点 × 关闭</oas-tag>
</div>

```html
<oas-tag closable type="success">可关闭</oas-tag>
```

```js
document.querySelector('oas-tag').addEventListener('oas-close', (e) => {
  // 默认组件自行移除；preventDefault 可阻止
  e.preventDefault()
})
```

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `type` | 类型 | `default` / `primary` / `success` / `warning` / `danger` / `info` | `default` |
| `size` | 尺寸 | `small` / `medium` / `large` | `medium` |
| `closable` | 可关闭 | boolean | `false` |
| `round` | 圆角 | boolean | `false` |

| 事件 | 说明 |
|---|---|
| `oas-close` | 关闭，`cancelable`，preventDefault 阻止移除 |
