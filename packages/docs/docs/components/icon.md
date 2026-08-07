# Icon 图标

原创线性图标集，按名渲染内联 SVG，tree-shakable。

## 用法

<div class="demo">
  <oas-icon name="check"></oas-icon>
  <oas-icon name="close"></oas-icon>
  <oas-icon name="search" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon name="star" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon name="user"></oas-icon>
  <oas-icon name="heart" color="var(--oas-color-danger)"></oas-icon>
</div>

```html
<oas-icon name="check"></oas-icon>
<oas-icon name="search" size="24" color="var(--oas-color-primary)"></oas-icon>
```

## 尺寸与颜色

<div class="demo">
  <oas-icon name="check" size="16"></oas-icon>
  <oas-icon name="check" size="24"></oas-icon>
  <oas-icon name="check" size="32"></oas-icon>
  <oas-icon name="check" color="var(--oas-color-success)"></oas-icon>
</div>

## 按需引入

```ts
import { checkPath } from '@oas-ui/icons'
```

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `name` | 图标名（kebab-case） | `IconName` | — |
| `size` | 尺寸（px 或 em） | string | `1em` |
| `color` | 颜色（CSS 色值） | string | `currentColor` |
| `label` | 可读名称；设置后 `role="img"` | string | — |

图标名一览：`alert-circle` `arrow-down` `arrow-left` `arrow-right` `arrow-up` `calendar` `check-circle` `check` `chevron-down` `chevron-left` `chevron-right` `chevron-up` `clock` `close-circle` `close` `copy` `download` `edit` `error` `external-link` `eye` `filter` `gear` `heart` `info` `loading` `lock` `mail` `menu` `minus` `more-vertical` `more` `plus` `refresh` `search` `sort` `star-filled` `star` `trash` `upload` `user` `warning`。
