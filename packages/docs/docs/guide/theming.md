# 主题与自定义

## 内置主题

在根元素（`<html>` 或任意容器）上设置 `data-theme` 切换三套内置主题：

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

## 皮肤预设（可选）

`@oas-ui/theme/skins.css` 提供 6 套品牌色皮肤预设（`violet` / `emerald` / `rose` / `amber` / `graphite` / `teal`）：在 `data-theme` 之上叠加 `data-skin` 即可切换，且与三套内置主题自由组合（皮肤只改品牌色相，不动尺寸/结构）。

```html
<!-- opt-in：不引此文件则完全无影响 -->
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/skins.css" />
<html data-theme="dark" data-skin="violet">
  …
</html>
```

```js
document.documentElement.dataset.skin = 'emerald' // violet | emerald | rose | amber | graphite | teal
```

皮肤仅覆盖 `--oas-color-primary`，`-hover` / `-active` / `-primary-text` / 焦点环等派生档自动跟随；需要更深定制（表面色 / 圆角 / 密度）仍走下方 CSS 变量覆盖。

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

| 组        | 变量                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------- |
| 品牌      | `--oas-color-primary(-hover/-active)`、`--oas-color-success`、`--oas-color-warning`、`--oas-color-danger` |
| 文本      | `--oas-color-text-primary/-secondary/-disabled`                                                           |
| 边框/背景 | `--oas-color-border`、`--oas-color-bg(-hover/-disabled)`、`--oas-color-overlay`                           |
| 字号      | `--oas-font-size-xs/sm/md/lg/xl`                                                                          |
| 间距      | `--oas-space-1…6`                                                                                         |
| 圆角      | `--oas-radius-sm/md/lg`                                                                                   |
| 控件      | `--oas-control-height-sm/md/lg`                                                                           |
| 动效      | `--oas-transition-fast/base`、`--oas-ease-out/in-out`                                                     |
| 层级      | `--oas-z-dropdown/sticky/fixed/overlay/modal/message/toast/tooltip`                                       |
| 焦点环    | `--oas-focus-ring`                                                                                        |

## 减弱动效

库内置 `prefers-reduced-motion` 支持，系统开启"减弱动效"后所有过渡/动画自动缩短。

## 自定义能力矩阵

主题 / 皮肤 / 布局 / 风格是四条**正交、可自由组合**的调节轴，「样式」是它们共同决定的结果：

| 轴 | 含义 | 机制 | 能到什么程度 |
| --- | --- | --- | --- |
| 主题 | 配色模式（明 / 暗 / 对比） | `data-theme`（light / dark / high-contrast） | 任意配色模式，可自定义 token |
| 皮肤 | 品牌色相（主色） | `data-skin` + `skins.css`（6 预设） | 任意主色，派生档自动跟随 |
| 布局 | 尺寸 / 间距 / 密度 / 圆角 / 容器 | `--oas-space-*` / `radius-*` / `control-height-*` / `container-*`；尺寸预设 | 任意密度 / 圆角 / 容器；RTL 自动镜像 |
| 风格 | 字形 / 动效 / 投影 / 焦点环 / 对比度 | `--oas-font-size-*` / `transition` / `ease` / `shadow-*` / `focus-ring` + `-text` 安全档 | 大部分设计语言可逼近 |

**上限**：凡能表达为 CSS 变量（token）的值都可纯 CSS 换肤、不改组件。
**边界**：① 组件级结构变体（`size` / `variant` / `status` / `shape` 等属性）属组件自身契约，不属全局轴；② 彻底换一套设计语言（字体栈 / 动效曲线族 / 对比度基准分级）超出默认一套 token 的表达，需另行立项；③ 任意重绘组件内部结构 / DOM 刻意不做（保持组件一致性）。
