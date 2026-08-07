# 主题与自定义

## 内置主题

在根元素（`<html>` 或任意容器）上设置 `data-theme` 切换三套内置主题：

| `data-theme` | 说明 |
|---|---|
| `light`（默认） | 浅色 |
| `dark` | 深色 |
| `high-contrast` | 高对比（WCAG AAA 友好，边框/文字对比更强） |

```html
<html data-theme="dark">…</html>
```

```js
document.documentElement.dataset.theme = 'high-contrast'
```

## 自定义主题（CSS 变量覆盖）

所有组件只引用语义 token（见 `docs/ui-spec.md §1`），因此通过覆盖 CSS 变量即可定制品牌色，无需改组件：

```css
:root {
  /* 品牌色 */
  --oas-color-primary: #7c3aed;
  --oas-color-primary-hover: #8b5cf6;
  --oas-color-primary-active: #6d28d9;

  /* 文本 */
  --oas-color-text-primary: #18181b;
  --oas-color-text-secondary: #71717a;

  /* 尺寸 */
  --oas-radius-md: 8px;
  --oas-control-height-md: 36px;
}
```

### Token 一览

| 组 | 变量 |
|---|---|
| 品牌 | `--oas-color-primary(-hover/-active)`、`--oas-color-success`、`--oas-color-warning`、`--oas-color-danger` |
| 文本 | `--oas-color-text-primary/-secondary/-disabled` |
| 边框/背景 | `--oas-color-border`、`--oas-color-bg(-hover/-disabled)`、`--oas-color-overlay` |
| 字号 | `--oas-font-size-xs/sm/md/lg/xl` |
| 间距 | `--oas-space-1…6` |
| 圆角 | `--oas-radius-sm/md/lg` |
| 控件 | `--oas-control-height-sm/md/lg` |
| 动效 | `--oas-transition-fast/base`、`--oas-ease-out/in-out` |
| 层级 | `--oas-z-dropdown/sticky/fixed/overlay/modal/message/toast/tooltip` |
| 焦点环 | `--oas-focus-ring` |

## 减弱动效

库内置 `prefers-reduced-motion` 支持，系统开启"减弱动效"后所有过渡/动画自动缩短。
