# GradientText 渐变文字

以渐变色填充文字的纯展示组件，`background-clip: text` 实现；默认走主题 token 双色渐变，支持任意色标数组与方向。无事件。

## 基础用法

<DemoBlock title="默认 token 渐变（to right）">
  <oas-gradient-text style="font-size: var(--oas-font-size-xl); font-weight: 600;">渐变文字</oas-gradient-text>
</DemoBlock>

## 自定义色标

<DemoBlock title="红→蓝 双色">
  <oas-gradient-text gradient='["#f00", "#00f"]' style="font-size: var(--oas-font-size-xl); font-weight: 600;">红蓝渐变</oas-gradient-text>
</DemoBlock>

<DemoBlock title="三色渐变">
  <oas-gradient-text gradient='["#f00", "#ff0", "#0f0"]' style="font-size: var(--oas-font-size-xl); font-weight: 600;">三色渐变</oas-gradient-text>
</DemoBlock>

## 方向

<DemoBlock title="direction=to bottom">
  <oas-gradient-text gradient='["#0b6cff", "#16a34a"]' direction="to bottom" style="font-size: var(--oas-font-size-xl); font-weight: 600;">自上而下</oas-gradient-text>
</DemoBlock>

<DemoBlock title="direction=135deg">
  <oas-gradient-text gradient='["#0b6cff", "#dc2626"]' direction="135deg" style="font-size: var(--oas-font-size-xl); font-weight: 600;">斜向渐变</oas-gradient-text>
</DemoBlock>

## 语义色渐变（type）

<DemoBlock title="type 语义色渐变对">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3); font-size: var(--oas-font-size-xl); font-weight: 600;">
    <oas-gradient-text type="primary">primary 语义渐变</oas-gradient-text>
    <oas-gradient-text type="success">success 语义渐变</oas-gradient-text>
    <oas-gradient-text type="warning">warning 语义渐变</oas-gradient-text>
    <oas-gradient-text type="danger">danger 语义渐变</oas-gradient-text>
    <oas-gradient-text type="info">info 语义渐变</oas-gradient-text>
  </div>
</DemoBlock>

<code>type</code> 走 token 派生双色渐变（暗色自动换色，零硬编码色值）；与 <code>gradient</code> 并存时 <code>gradient</code> 优先。

## 动画渐变

<DemoBlock title="animated 流动渐变">
  <oas-gradient-text animated style="font-size: var(--oas-font-size-xl); font-weight: 600;">流动渐变 slogan</oas-gradient-text>
</DemoBlock>

<DemoBlock title="animated + 多色标">
  <oas-gradient-text animated gradient='["#0b6cff", "#16a34a", "#d97706", "#dc2626"]' style="font-size: var(--oas-font-size-xl); font-weight: 600;">四色流动渐变</oas-gradient-text>
</DemoBlock>

<code>animated</code> 让背景位置沿渐变轴流动（回文色标 + 双倍背景宽度无缝循环）；动画周期可用 <code>--oas-gradient-text-duration</code> 定制，<code>prefers-reduced-motion</code> 下自动静止。

## 文字描边

<DemoBlock title="渐变 + 描边（默认 token 描边色）">
  <oas-gradient-text stroke="2px" style="font-size: var(--oas-font-size-xl); font-weight: 600;">渐变描边文字</oas-gradient-text>
</DemoBlock>

<DemoBlock title="渐变 + 自定义描边色">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3); font-size: var(--oas-font-size-xl); font-weight: 600;">
    <oas-gradient-text gradient='["#f00", "#00f"]' stroke="2px" stroke-color="#0b6cff">红蓝渐变蓝描边</oas-gradient-text>
    <oas-gradient-text type="warning" stroke="1.5px">语义渐变细描边</oas-gradient-text>
    <oas-gradient-text animated gradient='["#0b6cff", "#16a34a", "#d97706"]' stroke="1px">流动渐变描边</oas-gradient-text>
  </div>
</DemoBlock>

<code>stroke</code> 设置描边宽度（仅接受数字 + <code>px</code>/<code>em</code>/<code>rem</code>/<code>pt</code>，非法值不启用），<code>stroke-color</code> 设置描边颜色；缺省描边色走 <code>--oas-color-text-primary</code> token，随亮暗主题自动切换，保证对比度可读。

实现上用双层叠字避开兼容冲突：底层为只画描边的镜像文字（<code>-webkit-text-stroke</code> + 透明填色），叠在渐变层之下，描边外沿透出、不被 <code>background-clip: text</code> 裁剪。与 <code>type</code>、<code>gradient</code>、<code>animated</code> 可任意组合。

## 兼容性说明

- <code>background-clip: text</code> 与透明色只写在 <code>@supports</code> 块内：老浏览器不支持 clip 时文字回退为普通前景色，不会出现"隐形文字"。
- 文字描边（<code>-webkit-text-stroke</code>）与 <code>background-clip: text</code> 直接叠加会被裁剪，组件内部用双层叠字解决；不支持 clip 的老浏览器回退为主文字直接描边（普通前景色 + 描边），不会出现双重文字重影。
- 多行截断（ellipsis）与 <code>background-clip: text</code> 叠加在各浏览器行为不一，渐变文字建议单行使用。

## 字号定制

字号默认跟随外层 `font-size`（继承），可用 CSS 变量 `--oas-gradient-text-font` 显式定制（如 `18px`）。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `animated` | 流动动画（回文色标无缝循环，周期走 `--oas-gradient-text-duration`；prefers-reduced-motion 静止） | `boolean` | — |
| `direction` | 渐变方向（linear-gradient 第一参数，如 `to right`、`135deg`） | `string` | — |
| `gradient` | JSON 色标数组，如 `["#f00","#00f"]`；单个色标渲染纯色；缺失/非法回退默认 token 渐变 | `string` | — |
| `stroke` | 描边宽度（如 `1px` / `2px`，仅接受数字 + px/em/rem/pt；非法值不启用描边；双层叠字避开 background-clip:text 裁剪冲突） | `string` | — |
| `stroke-color` | 描边颜色（缺省走 `--oas-color-text-primary` token，随主题亮暗自适应；经白名单校验） | `string` | — |
| `type` | 语义色渐变：`primary` / `success` / `warning` / `danger` / `info`（token 派生双 stop；显式 `gradient` 优先） | `string` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

- 默认渐变使用主题 token（`--oas-color-primary` → `--oas-color-primary-hover`），随亮暗主题自动切换，无硬编码色值。
- 色标条目经白名单校验，防止 CSS 注入。
- 无事件，纯展示。
