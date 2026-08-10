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
  <oas-statistic value="8846" prefix="¥"></oas-statistic>
  <oas-statistic value="99.9" precision="1" suffix="%"></oas-statistic>
  <oas-statistic value="12" prefix="本周新增 " suffix=" 单"></oas-statistic>
</DemoBlock>

## 关闭千分位

<DemoBlock title="group-separator=false">
  <oas-statistic value="1234567" group-separator="false"></oas-statistic>
</DemoBlock>

## 加载态

<DemoBlock title="loading（复用 skeleton）">
  <oas-statistic value="8846" loading></oas-statistic>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `group-separator` | 千分位分组（`"false"` 关闭） | `string` | `true` |
| `loading` | 加载态（骨架占位） | `boolean` | — |
| `precision` | 小数位（四舍五入） | `string` | `0` |
| `prefix` | 前后缀文案 | `string` | — |
| `suffix` | 前后缀文案 | `string` | — |
| `value` | 数值（数字字符串） | `string` | `0` |

无事件（纯展示）。
