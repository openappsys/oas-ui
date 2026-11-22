---
description: "商品规格选择面板：specs + skus 数据契约、选中组合精确定位 sku、缺货选项置灰、部分选择时给出可选路径提示、数量步进（上限随库存）。"
---

# SKU 商品规格

商品规格选择面板（桌面内嵌形态）：`specs` 描述规格组与选项，`skus` 描述组合对应的价格 / 库存 / 图片。全选后精确定位 sku 并展示价格；部分选择时逐项判断「沿该选项能否走到在库组合」，走不到的选项置灰并标「缺货」（可选路径提示）；数量步进上限跟随匹配 sku 的库存。

## 基础用法

`value` 为选中组合（JSON 对象），`quantity` 为数量；用户选择会回写这两个属性并派发 `oas-change`：

<DemoBlock title="规格选择 + 价格联动 + 事件反馈">
  <oas-sku
    id="sku-basic"
    specs='[{"key":"color","label":"颜色","values":["曜石黑","雾霭白"]},{"key":"size","label":"尺码","values":["S","M","L"]}]'
    skus='[{"id":"black-s","specs":{"color":"曜石黑","size":"S"},"price":299,"stock":5},{"id":"black-m","specs":{"color":"曜石黑","size":"M"},"price":319,"stock":0},{"id":"black-l","specs":{"color":"曜石黑","size":"L"},"price":339,"stock":2},{"id":"white-s","specs":{"color":"雾霭白","size":"S"},"price":309,"stock":3},{"id":"white-m","specs":{"color":"雾霭白","size":"M"},"price":329,"stock":1},{"id":"white-l","specs":{"color":"雾霭白","size":"L"},"price":349,"stock":0}]'
  ></oas-sku>
  <p id="sku-basic-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    选择颜色与尺码查看价格与库存反馈。
  </p>
</DemoBlock>

## 缺货与可选路径

选中「曜石黑」后，M 码在该颜色下无库存 —— 置灰并标「缺货」；「雾霭白」的 M 码仍有 1 件，切到白色后即可选。全部组合无库存时所有选项置灰。

<DemoBlock title="路径提示">
  <oas-sku
    id="sku-path"
    value='{"color":"曜石黑"}'
    specs='[{"key":"color","label":"颜色","values":["曜石黑","雾霭白"]},{"key":"size","label":"尺码","values":["S","M"]}]'
    skus='[{"id":"black-s","specs":{"color":"曜石黑","size":"S"},"price":299,"stock":2},{"id":"black-m","specs":{"color":"曜石黑","size":"M"},"price":319,"stock":0},{"id":"white-s","specs":{"color":"雾霭白","size":"S"},"price":309,"stock":0},{"id":"white-m","specs":{"color":"雾霭白","size":"M"},"price":329,"stock":1}]'
  ></oas-sku>
</DemoBlock>

## 数量步进与库存上限

数量上限 = 匹配 sku 的库存；加号到上限即禁用，输入超库存会被钳制。缺货组合下数量控件禁用：

<DemoBlock title="数量步进（库存 2）">
  <oas-sku
    id="sku-qty"
    value='{"color":"雾霭白","size":"M"}'
    quantity="1"
    specs='[{"key":"color","label":"颜色","values":["雾霭白"]},{"key":"size","label":"尺码","values":["M"]}]'
    skus='[{"id":"w-m","specs":{"color":"雾霭白","size":"M"},"price":329,"stock":2}]'
  ></oas-sku>
  <p id="sku-qty-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    加号加到库存上限后禁用。
  </p>
</DemoBlock>

## 币种与精度

面板内价格通过内嵌 `oas-price` 展示，`currency` / `locale` / `precision` 与价格组件同源：

<DemoBlock title="多币种 / 无小数位">
  <oas-sku
    value='{"color":"曜石黑","size":"M"}'
    currency="USD"
    locale="en-US"
    precision="0"
    specs='[{"key":"color","label":"Color","values":["曜石黑"]},{"key":"size","label":"Size","values":["M"]}]'
    skus='[{"id":"usd","specs":{"color":"曜石黑","size":"M"},"price":49.9,"stock":4}]'
  ></oas-sku>
</DemoBlock>

## 全禁用

`disabled` 让所有选项与数量控件不可用（金额与缺货提示仍可读），常用于下架或活动未开始：

<DemoBlock title="禁用态">
  <oas-sku
    disabled
    value='{"color":"雾霭白","size":"S"}'
    specs='[{"key":"color","label":"颜色","values":["曜石黑","雾霭白"]},{"key":"size","label":"尺码","values":["S","M"]}]'
    skus='[{"id":"w-s","specs":{"color":"雾霭白","size":"S"},"price":309,"stock":3}]'
  ></oas-sku>
</DemoBlock>

## API

### oas-sku

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `currency` | ISO 4217 币种，默认 `CNY` | `string` | `CNY` |
| `disabled` | 全禁用（兼容 config-provider 注入禁用） | `boolean` | — |
| `locale` | 价格格式化 locale；缺省取文档 `<html lang>`，再退回 `zh-CN` | — | — |
| `precision` | 价格小数位，默认 2 | — | — |
| `quantity` | 数量（默认 1；上限 = 匹配 sku 库存） | `number \| string` | — |
| `skus` | SKU JSON 数组 `[{ id?, specs: { [key]: value }, price?, stock?, image?, imageAlt? }]` | `SkuItem[] \| string` | — |
| `specs` | 规格组 JSON 数组 `[{ key, label?, values: (string \| { value, label? })[] }]` | `SkuSpecGroup[] \| string` | — |
| `value` | 选中组合 JSON 对象 `{ [specKey]: value }`（受控；用户选择回写） | `Record<string, string> \| string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 规格或数量变化派发，detail `{ value, quantity, sku, change: 'spec' \| 'quantity' }`（sku 为完整匹配对象或 null） |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-sku').then(() => {
    const out = document.getElementById('sku-basic-out')
    document.getElementById('sku-basic')?.addEventListener('oas-change', (e) => {
      const d = e.detail
      const combo = Object.keys(d.value || {}).map((k) => d.value[k]).join(' / ') || '未选全'
      const price = d.sku && d.sku.price != null ? d.sku.price : '—'
      out.textContent = 'oas-change：' + combo + ' × ' + d.quantity + '，单价 ' + price
    })
    const qtyOut = document.getElementById('sku-qty-out')
    document.getElementById('sku-qty')?.addEventListener('oas-change', (e) => {
      qtyOut.textContent = '数量：' + e.detail.quantity + '（' + e.detail.change + '）'
    })
  })
})
</script>
