---
description: "商品规格选择：specs + skus 数据契约、选中组合精确定位 sku、缺货选项置灰、部分选择时给出可选路径提示、数量步进（上限随库存）；内嵌面板与底部弹层两种承载共用同一份面板。"
---

# SKU 商品规格

商品规格选择：`specs` 描述规格组与选项，`skus` 描述组合对应的价格 / 库存 / 图片。全选后精确定位 sku 并展示价格；部分选择时逐项判断「沿该选项能否走到在库组合」，走不到的选项置灰并标「缺货」（可选路径提示）；数量步进上限跟随匹配 sku 的库存。两种承载共用同一份面板：宽屏内嵌面板，`layout="popup"`（或 ≤480px 自动）走底部弹层。

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

## 弹层形态（底部弹层）

`layout="popup"` 把**同一份面板**交给底部弹层承载（`oas-bottom-sheet`：下滑 / 点遮罩 / Esc 关闭，打开时焦点移入面板、Tab 在面板内循环）。`layout` 缺省时按视口自动切换：宽度 ≤480px 用弹层、宽屏内嵌；显式写死的值不被视口覆盖，视口越界变化即时重判（无需刷新）。

开合走 bottom-sheet 协议：`open` 为受控属性（宿主写 attribute / property 静默生效），关闭请求由承载件派发 `oas-close`（带 `reason`）后本组件自动收起；交互与命令式开合派发 `oas-open-change`：

<DemoBlock title="layout=popup + 触发按钮">
  <oas-sku
    id="sku-popup"
    layout="popup"
    specs='[{"key":"color","label":"颜色","values":["曜石黑","雾霭白"]},{"key":"size","label":"尺码","values":["S","M"]}]'
    skus='[{"id":"black-s","specs":{"color":"曜石黑","size":"S"},"price":299,"stock":5},{"id":"black-m","specs":{"color":"曜石黑","size":"M"},"price":319,"stock":0},{"id":"white-s","specs":{"color":"雾霭白","size":"S"},"price":309,"stock":3},{"id":"white-m","specs":{"color":"雾霭白","size":"M"},"price":329,"stock":1}]'
  ></oas-sku>
  <div style="display: flex; gap: var(--oas-space-2); align-items: center; margin: var(--oas-space-2) 0 0">
    <oas-button id="sku-popup-open" size="small">选择规格</oas-button>
    <span id="sku-popup-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">弹层未打开</span>
  </div>
</DemoBlock>

> 内嵌形态下 `openOverlay()` / `closeOverlay()` 只告警一次（不产生幽灵 open 态）；`open` 属性仅 popup 形态生效——内嵌形态下预置的 `open` 在切到 popup 形态（显式或窄屏自动）时会自动弹开。

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
| `layout` | 承载形态：`embedded`（内嵌面板）/ `popup`（底部弹层，走 bottom-sheet 协议）；缺省按视口自动（≤480px 弹层）；非法值告警回落 embedded | — | — |
| `locale` | 价格格式化 locale；缺省取文档 `<html lang>`，再退回 `zh-CN` | — | — |
| `open` | 弹层开合（受控：宿主写 attribute / property 静默生效；仅 popup 形态生效）。交互与 `openOverlay()` / `closeOverlay()` 改变时派发 `oas-open-change` | `boolean \| string` | — |
| `precision` | 价格小数位，默认 2 | — | — |
| `quantity` | 数量（默认 1；上限 = 匹配 sku 库存） | `number \| string` | — |
| `skus` | SKU JSON 数组 `[{ id?, specs: { [key]: value }, price?, stock?, image?, imageAlt? }]` | `SkuItem[] \| string` | — |
| `specs` | 规格组 JSON 数组 `[{ key, label?, values: (string \| { value, label? })[] }]` | `SkuSpecGroup[] \| string` | — |
| `value` | 选中组合 JSON 对象 `{ [specKey]: value }`（受控；用户选择回写） | `Record<string, string> \| string` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `open` | 弹层开合（受控：读写即反射 `open` attribute，静默不派发事件；仅 popup 形态生效） | `boolean \| string` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `openOverlay` | `openOverlay(): void` | 命令式打开弹层（幂等；派发 `oas-open-change`；非 popup 形态只告警一次） |
| `closeOverlay` | `closeOverlay(): void` | 命令式关闭弹层（幂等；派发 `oas-open-change`；非 popup 形态只告警一次） |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 规格或数量变化派发，detail `{ value, quantity, sku, change: 'spec' \| 'quantity' }`（sku 为完整匹配对象或 null） |
| `oas-close` | 承载件 **透传** 的关闭请求（下滑 / 遮罩 / Esc），`detail: { reason }`；组件收到后已自行收起，宿主无需再处理（监听仅用于观测 / 联动） |
| `oas-open-change` | 弹层开合变化（交互 / 命令式），`detail: { open }`；受控属性写入不派发 |

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

    // 弹层形态：命令式打开；oas-close 由承载件透传（组件已自行收起，这里只做观测 / 埋点）
    const popup = document.getElementById('sku-popup')
    const popupOut = document.getElementById('sku-popup-out')
    document.getElementById('sku-popup-open')?.addEventListener('click', () => popup?.openOverlay())
    popup?.addEventListener('oas-open-change', (e) => {
      popupOut.textContent = e.detail.open ? '弹层已打开（Esc / 点遮罩 / 下滑关闭）' : '弹层已关闭'
    })
    popup?.addEventListener('oas-close', (e) => {
      popupOut.textContent = '关闭原因：' + e.detail.reason
    })
    popup?.addEventListener('oas-change', (e) => {
      const d = e.detail
      const combo = Object.keys(d.value || {}).map((k) => d.value[k]).join(' / ') || '未选全'
      const price = d.sku && d.sku.price != null ? d.sku.price : '—'
      popupOut.textContent = '弹层内选择：' + combo + ' × ' + d.quantity + '，单价 ' + price
    })
  })
})
</script>
