# Icon 图标

原创线性图标集，按名渲染内联 SVG，tree-shakable。

## 用法

<DemoBlock title="常用图标">
  <oas-icon name="check"></oas-icon>
  <oas-icon name="close"></oas-icon>
  <oas-icon name="search" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon name="star" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon name="user"></oas-icon>
  <oas-icon name="heart" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon name="gear" color="var(--oas-color-success)"></oas-icon>
</DemoBlock>

## 尺寸与颜色

<DemoBlock title="尺寸与颜色">
  <oas-icon name="check" size="16"></oas-icon>
  <oas-icon name="check" size="24"></oas-icon>
  <oas-icon name="check" size="32"></oas-icon>
  <oas-icon name="check" color="var(--oas-color-success)"></oas-icon>
</DemoBlock>

## 无障碍名称

设置 `label` 后图标对屏幕阅读器暴露可读名称。

<DemoBlock title="带标签图标">
  <oas-icon name="info" label="提示信息" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon name="warning" label="警告" color="var(--oas-color-warning)"></oas-icon>
</DemoBlock>

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
