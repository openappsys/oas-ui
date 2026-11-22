---
description: "价格展示组件：币种符号 + 千分位 + 指定小数位，支持划线价、区间价与涨跌趋势箭头；格式化统一走 Intl.NumberFormat，颜色全走主题 token。"
---

# Price 价格

价格展示组件：币种符号 + 千分位 + 指定小数位，支持划线价（`original`）、区间价（`min` + `max`）与涨跌趋势箭头（`trend` + `trend-value`）。金额格式化统一走 `Intl.NumberFormat`，符号与数字的先后顺序按 Intl 部件真实顺序输出（`de-DE` 这类「符号在后」的语言同样正确）。

## 基础用法

`value` 传数字字符串，`currency` 为 ISO 4217 币种代码（默认 `CNY`）；`original` 渲染为带删除线的原价。

<DemoBlock title="单值 + 划线价">
  <oas-price value="1299" original="1599"></oas-price>
</DemoBlock>

## 币种与 locale

`locale` 缺省取文档 `<html lang>`，可显式覆盖以对齐宿主站点语言；`precision` 控制小数位（`0` 时不渲染小数）。

<DemoBlock title="多币种 / 多语言">
  <oas-price value="1299" currency="USD" locale="en-US"></oas-price>
  <oas-price value="1299" currency="EUR" locale="de-DE"></oas-price>
  <oas-price value="1299.5" precision="0"></oas-price>
</DemoBlock>

## 区间价

`min` + `max` 同在场且 `value` 缺省时渲染区间价（单值优先）：

<DemoBlock title="价格区间">
  <oas-price min="19.9" max="29.9"></oas-price>
</DemoBlock>

## 涨跌趋势

`trend="up"` / `trend="down"` 渲染方向箭头与语义色；`trend-value` 为纯数值时自动补正负号与 `%`，其余文本原样输出。上涨默认危险色、下跌默认成功色（中文市场惯例），可通过 CSS 变量覆盖。

<DemoBlock title="涨跌趋势">
  <oas-price value="88.8" trend="up" trend-value="12.5"></oas-price>
  <oas-price value="88.8" trend="down" trend-value="3"></oas-price>
  <oas-price value="88.8" trend="up" trend-value="new"></oas-price>
</DemoBlock>

## 字号档

`size="sm|md|lg"` 切换符号/整数/小数三档字号（默认 `md`）：

<DemoBlock title="尺寸">
  <oas-price value="99" size="sm"></oas-price>
  <oas-price value="99" size="md"></oas-price>
  <oas-price value="99" size="lg"></oas-price>
</DemoBlock>

## API

### oas-price

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `currency` | ISO 4217 币种代码，默认 `CNY`；非法代码回落默认 | — | — |
| `locale` | `Intl.NumberFormat` locale；缺省取文档 `<html lang>`，再退回 `zh-CN` | — | — |
| `max` | 区间价上端（与 `min` 同在场且 `value` 缺省时生效） | — | — |
| `min` | 区间价下端（与 `max` 同在场且 `value` 缺省时生效） | — | — |
| `original` | 划线原价（渲染为 `<s>`，读屏带「原价」前缀） | — | — |
| `precision` | 小数位（0–20 整数，默认 2；非法值回退默认） | — | — |
| `size` | 字号档：`sm` / `md`（默认）/ `lg` | `PriceSize` | — |
| `trend` | 趋势方向：`up` / `down`；非法值不渲染趋势 | — | — |
| `trend-value` | 涨跌幅文本（纯数值自动补正负号与 `%`，其余原样渲染） | — | — |
| `value` | 单值价格（数字字符串）；与 `min`+`max` 同在场时单值优先 | — | — |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-price-color` | `var(--oas-color-text-primary)` |
| `--oas-price-down-color` | `var(--oas-color-success)` |
| `--oas-price-original-color` | `var(--oas-color-text-secondary)` |
| `--oas-price-up-color` | `var(--oas-color-danger)` |
