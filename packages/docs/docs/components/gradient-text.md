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

## 字号定制

字号默认跟随外层 `font-size`（继承），可用 CSS 变量 `--oas-gradient-text-font` 显式定制（如 `18px`）。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `direction` | 渐变方向（linear-gradient 第一参数，如 `to right`、`135deg`） | `string` | — |
| `gradient` | JSON 色标数组，如 `["#f00","#00f"]`；单个色标渲染纯色；缺失/非法回退默认 token 渐变 | `string` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

- 默认渐变使用主题 token（`--oas-color-primary` → `--oas-color-primary-hover`），随亮暗主题自动切换，无硬编码色值。
- 色标条目经白名单校验，防止 CSS 注入。
- 无事件，纯展示。
