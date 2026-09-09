# Statistic 统计数值

统计数值展示，`Intl.NumberFormat` 千分位与精度（locale 感知），支持前后缀与骨架屏加载占位。

## 基础用法

<DemoBlock title="基础数值">
  <oas-statistic value="1128"></oas-statistic>
</DemoBlock>

## 千分位与精度

<DemoBlock title="千分位 + 精度">
  <oas-statistic value="1234567.891" precision="2"></oas-statistic>
</DemoBlock>

## 前缀 / 后缀

<DemoBlock title="prefix / suffix">
  <oas-statistic value="8846" prefix-text="¥"></oas-statistic>
  <oas-statistic value="99.9" precision="1" suffix-text="%"></oas-statistic>
  <oas-statistic value="12" prefix-text="本周新增 " suffix-text=" 单"></oas-statistic>
</DemoBlock>

## 关闭千分位

<DemoBlock title="group-separator=false">
  <oas-statistic value="1234567" group-separator="false"></oas-statistic>
</DemoBlock>

## 加载态

<DemoBlock title="loading（复用 skeleton）">
  <oas-statistic value="8846" loading></oas-statistic>
</DemoBlock>

## 标题与额外区

`title` 属性（或 `slot="title"`）在数值上方渲染标题；`extra` 属性（或 `slot="extra"`）在数值行下方渲染额外内容（如趋势脚注）。`title` 是原生全局属性，组件渲染后即从宿主吸收，避免悬停弹出浏览器原生提示。

<DemoBlock title="title + extra（数据看板卡）">
  <oas-statistic title="总收入" value="8846132" precision="2" extra="较昨日 +24%"></oas-statistic>
  <oas-statistic value="99.9" precision="1" suffix-text="%">
    <span slot="title">完成率</span>
    <span slot="extra">环比 -1.2%</span>
  </oas-statistic>
</DemoBlock>

## 趋势指示

`trend="up" | "down"` 在数值前渲染涨跌箭头，颜色走语义 token（涨 `--oas-color-success-text` / 跌 `--oas-color-danger-text`，暗色自动切换），可用 `--oas-statistic-trend-up-color` / `--oas-statistic-trend-down-color` 覆盖。

<DemoBlock title="trend 涨跌">
  <oas-statistic title="今日订单" value="1284" trend="up" extra="较昨日 +12.5%"></oas-statistic>
  <oas-statistic title="退款率" value="2.4" precision="1" suffix-text="%" trend="down" extra="环比 -0.8%"></oas-statistic>
</DemoBlock>

## 数值动画（组合 number-animation）

组件不内建 value 动画，通过 `slot="value"` 组合 `oas-number-animation` 实现滚动进入效果：

<DemoBlock title="slot=value + oas-number-animation">
  <oas-statistic title="累计用户数">
    <oas-number-animation slot="value" value="128653" duration="2000" group-separator="true"></oas-number-animation>
  </oas-statistic>
</DemoBlock>

## 字号定制

字号默认固定为 `--oas-font-size-lg`（16px，不随外层变化），可用 CSS 变量 `--oas-statistic-font` 显式定制（如 `32px`）。

## 复杂前后缀（slot 分发）

<DemoBlock title="slot=prefix / slot=suffix">
  <oas-statistic value="8846">
    <oas-tag slot="prefix" type="primary">总收入</oas-tag>
  </oas-statistic>
  <oas-statistic value="99.9" precision="1">
    <span slot="suffix">完成率</span>
  </oas-statistic>
</DemoBlock>

简单文本用 `prefix-text` / `suffix-text` 属性；复杂内容（图标/标签/徽标等）用同名 `slot="prefix"` / `slot="suffix"` 分发，slot 有内容时原生替换属性文本。纯 HTML 场景旧的 `prefix` / `suffix` 仍可作为遗留别名使用。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `extra` | 数值行下方额外内容（趋势脚注等） | `string` | — |
| `group-separator` | 千分位分组（`"false"` 关闭） | `string` | `true` |
| `loading` | 加载态（骨架占位） | `boolean` | — |
| `precision` | 小数位（四舍五入） | `string` | `0` |
| `prefix-text` | 前后缀文案 | — | — |
| `suffix-text` | 前后缀文案 | — | — |
| `title` | 数值上方标题（原生全局属性，渲染后吸收移除） | `string` | — |
| `trend` | 趋势指示：`up`（涨，success 语义色）/ `down`（跌，danger 语义色）+ 箭头 | `string` | — |
| `value` | 数值（数字字符串） | `string` | `0` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `extra` | 数值行下方额外内容（趋势脚注等，分发时优先于 `extra` 属性文本） |
| `prefix` | 前置内容（图标/标签等复杂内容，分发时优先于 `prefix` 属性文本）；简单文本用 `prefix` 属性即可 |
| `suffix` | 后置内容（图标/标签等复杂内容，分发时优先于 `suffix` 属性文本）；简单文本用 `suffix` 属性即可 |
| `title` | 数值上方标题（分发时优先于 `title` 属性文本） |
| `value` | 自定义数值呈现（如组合 `oas-number-animation` 动画值；分发时不渲染 Intl 格式化文本） |

无事件（纯展示）。
