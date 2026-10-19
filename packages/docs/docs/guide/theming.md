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

## 磨砂玻璃（glass.css）

`@oas-ui/theme/glass.css` 提供磨砂玻璃材质层（可选层，与 skins.css 同机制：opt-in 不引则零影响）——半透明 surface + backdrop 模糊 + 高光折光边 + 圆角放大 + 分层深影。在 `data-theme` / `data-skin` 之上叠加 `data-glass` 启用，三者自由组合：

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/glass.css" />
<html data-theme="dark" data-glass>
  …
</html>
```

**机制**：浮层 surface 组件（modal / drawer / popover / tooltip / dropdown / select 系面板 / message / snackbar / bottom-sheet / app-bar 等 25 个）统一消费 `--oas-glass-blur`（`backdrop-filter` 模糊档）与 `--oas-glass-ring`（折光描边环）两个变量。不引 glass.css 时全部回落 `none` / `transparent`，组件行为与此前完全一致。

**跨浏览器一致性**：本材质层只使用跨浏览器 CSS（半透明 token / `backdrop-filter` / `outline` / `box-shadow`），不使用 SVG 位移滤镜。v2.6.0 的静态边缘折射依赖 data-URI `filter`，Chromium 执行而 Firefox 忽略，会让同一组件在浏览器间出现轮廓锯齿与视觉尺寸差异；该效果已在未发布批次移除。**动态流动感**（指针镜面高光 + 按压收紧）仍由可选运行时 `glass-fluid.js` 提供（见[磨砂玻璃](/guide/glass)），不改变几何尺寸。

**边界**：

- 材质依赖背景反差——页面有色彩层次（渐变/图片）时质感最强，纯色同色相背景上减弱（文字仍走 token 安全档可读）；照片/视频等 busy 背景不保证对比度，必要时提高 alpha 或局部关闭玻璃；
- 文字安全是硬约束：dark 档 surface 用低 alpha 高透（深色玻璃的材质感主场；alpha 档与文字档联动标定，感知对比度实测门禁 ≥60 分，见「磨砂玻璃画廊」）；
- blur 只上容器级 surface（行级/长列表不接，避免大面积模糊的性能成本）；
- `high-contrast` 主题下不启用（实心可访问性档优先）；
- `prefers-reduced-transparency: reduce` 下回退实心 surface（关闭模糊/折光边/动态高光）；
- 局部降级：任意容器覆盖 `--oas-glass-blur: none; --oas-glass-ring: transparent` 即可；

实时预览见[磨砂玻璃画廊](/guide/glass)。

## 自定义主题（CSS 变量覆盖）

所有组件原则上只引用语义 token（见 `docs/ui-spec.md §1`，个别极值/预设除外），因此通过覆盖 CSS 变量即可定制品牌色，无需改组件：

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
| 间距      | `--oas-space-1/1_5/2/2_5/3/4/4_5/5/6`（4px 基准，含半步档）                                               |
| 圆角      | `--oas-radius-xs/sm/md/lg/xl`                                                                             |
| 控件      | `--oas-control-height-xs/sm/md/lg/xl`                                                                     |
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
**边界**：① 组件级结构变体（`size` / `variant` / `status` / `shape` 等属性）属组件自身契约，不属全局轴；② 彻底换一套设计语言（字体栈 / 动效曲线族 / 对比度基准分级）已超出「默认一套 token」的表达范围，需由你在应用层自行定义设计系统（覆写 token 或自建主题层）；③ 任意重绘组件内部结构 / DOM 刻意不做（保持组件一致性）。
