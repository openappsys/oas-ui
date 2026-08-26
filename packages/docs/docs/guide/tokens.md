# 设计 Token（Design Tokens）

OAS-UI 的全部视觉语言都由 CSS 变量（语义 token）驱动。组件样式只引用语义 token，**不硬编码任何色值/字号/间距**——因此换肤 = 覆盖 CSS 变量，改主题不碰组件。

<TokenShowcase />

## 三套内置主题

在根元素（`<html>` 或任意容器）设置 `data-theme` 切换：

| `data-theme`    | 说明                                       |
| --------------- | ------------------------------------------ |
| `light`（默认） | 浅色                                       |
| `dark`          | 深色                                       |
| `high-contrast` | 高对比（WCAG AAA 友好，边框/文字对比更强） |

```html
<html data-theme="dark">
  …
</html>
```

```js
document.documentElement.dataset.theme = 'high-contrast'
```

## 覆盖语义 token 定制品牌

```css
:root {
  /* 品牌色 */
  --oas-color-primary: #7c3aed;
  --oas-color-primary-hover: #8b5cf6;
  --oas-color-primary-active: #6d28d9;

  /* 尺寸 */
  --oas-radius-md: 8px;
  --oas-control-height-md: 36px;
}
```

## Token 分组一览

| 组        | 变量                                                                                        |
| --------- | ------------------------------------------------------------------------------------------- |
| 品牌      | `--oas-color-primary(-hover/-active)`、`--oas-color-success`、`--oas-color-warning`、`--oas-color-danger` |
| 文本      | `--oas-color-text-primary/-secondary/-disabled`                                             |
| 边框/背景 | `--oas-color-border`、`--oas-color-bg(-hover/-disabled)`、`--oas-color-overlay`             |
| 字号      | `--oas-font-size-xs/sm/md/lg/xl`                                                            |
| 间距      | `--oas-space-1…6`（4px 基准）                                                               |
| 圆角      | `--oas-radius-xs/sm/md/lg/xl`                                                                     |
| 控件      | `--oas-control-height-xs/sm/md/lg/xl`                                                       |
| 动效      | `--oas-transition-fast/base`、`--oas-ease-out/in-out`                                       |
| 层级      | `--oas-z-dropdown/sticky/fixed/overlay/modal/message/toast/tooltip`                         |
| 焦点环    | `--oas-focus-ring`                                                                          |

## 减弱动效

库内置 `prefers-reduced-motion` 支持，系统开启"减弱动效"后所有过渡/动画自动缩短。

> 规范依据：`docs/ui-spec.md §1` 设计 token 体系。
