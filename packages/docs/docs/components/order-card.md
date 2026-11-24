---
description: "订单卡片：订单号 + 可配置状态徽标（语义色映射）+ 条目摘要 + 金额区（实付 / 划线原价 / 已优惠）+ 可折叠明细与操作按钮插槽。"
---

# OrderCard 订单卡片

订单列表与订单详情页的高频卡片：头部是订单号与状态徽标，中间是条目摘要（图 + 名 + 规格 × 数量），随后是金额区（实付 / 划线原价 / 已优惠），底部是操作按钮区，需要时可展开明细。状态徽标的文案与色语义完全由 `status-map` 声明，宿主可整体接管。

## 基础用法

`status` 是状态键，`status-map` 把键映射到文案与语义色；`items` 是条目摘要，`actions` 插槽放操作按钮：

<DemoBlock title="待付款订单 + 操作按钮">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-order-card
      id="oc-basic"
      order-id="NO-20241124001"
      status="pending"
      status-map='{"pending":{"label":"待付款","tone":"warning"}}'
      items='[{"title":"纯棉短袖T恤","spec":"白色 / M","quantity":2,"image":"/assets/demo-square-1.svg"},{"title":"轻便帆布鞋","spec":"42 / 米白","quantity":1,"image":"/assets/demo-square-2.svg"}]'
      payable="297"
      original="357"
      discount="60"
    >
      <oas-button slot="actions" size="small">取消订单</oas-button>
      <oas-button slot="actions" size="small" type="primary">立即付款</oas-button>
    </oas-order-card>
    <p id="oc-basic-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      操作按钮由宿主提供（本卡不代发业务事件）；展开明细见下方示例。
    </p>
  </div>
</DemoBlock>

## 状态语义映射

`status-map` 是 `{ 键: { label, tone } }`，也接受字符串简写（等价于 `tone: 'default'`）。`tone` 五档：`default` / `primary` / `success` / `warning` / `danger`；未声明的 `status` 原样显示，便于渐进接入。

<DemoBlock title="五档语义色 + 字符串简写">
  <div style="display: grid; gap: var(--oas-space-2)">
    <oas-order-card
      order-id="NO-1001"
      status="pending"
      status-map='{"pending":{"label":"待付款","tone":"warning"},"shipped":{"label":"待收货","tone":"primary"},"done":{"label":"已完成","tone":"success"},"refund":{"label":"退款中","tone":"danger"},"canceled":"已取消"}'
      items='[{"title":"限定马克杯","quantity":1}]'
      payable="89"
    ></oas-order-card>
    <oas-order-card
      order-id="NO-1002"
      status="shipped"
      status-map='{"pending":{"label":"待付款","tone":"warning"},"shipped":{"label":"待收货","tone":"primary"},"done":{"label":"已完成","tone":"success"},"refund":{"label":"退款中","tone":"danger"},"canceled":"已取消"}'
      items='[{"title":"手冲咖啡豆","spec":"200g","quantity":2}]'
      payable="256"
    ></oas-order-card>
    <oas-order-card
      order-id="NO-1003"
      status="done"
      status-map='{"pending":{"label":"待付款","tone":"warning"},"shipped":{"label":"待收货","tone":"primary"},"done":{"label":"已完成","tone":"success"},"refund":{"label":"退款中","tone":"danger"},"canceled":"已取消"}'
      items='[{"title":"帆布鞋","spec":"42","quantity":1}]'
      payable="199"
    ></oas-order-card>
    <oas-order-card
      order-id="NO-1004"
      status="refund"
      status-map='{"pending":{"label":"待付款","tone":"warning"},"shipped":{"label":"待收货","tone":"primary"},"done":{"label":"已完成","tone":"success"},"refund":{"label":"退款中","tone":"danger"},"canceled":"已取消"}'
      items='[{"title":"渔夫帽","quantity":1}]'
      payable="59"
    ></oas-order-card>
    <oas-order-card
      order-id="NO-1005"
      status="canceled"
      status-map='{"pending":{"label":"待付款","tone":"warning"},"shipped":{"label":"待收货","tone":"primary"},"done":{"label":"已完成","tone":"success"},"refund":{"label":"退款中","tone":"danger"},"canceled":"已取消"}'
      items='[{"title":"限定贴纸","quantity":1}]'
      payable="0"
    ></oas-order-card>
  </div>
</DemoBlock>

## 金额区

`payable` 是实付金额，`original` 是优惠前金额（划线展示，只随 `payable` 一同渲染），`discount` 是已优惠金额；`payable` 与 `discount` 都缺省时金额区整体隐藏（只设 `original` 不渲染空壳条）。`currency` / `locale` / `precision` 透传给内嵌价格件。

<DemoBlock title="实付 + 划线原价 + 已优惠（美元 / 一位小数）">
  <oas-order-card
    order-id="NO-2001"
    status="done"
    status-map='{"done":{"label":"已完成","tone":"success"}}'
    items='[{"title":"Wool scarf","spec":"Charcoal","quantity":1,"image":"/assets/demo-square-4.svg"}]'
    payable="59.9"
    original="79.9"
    discount="20"
    currency="USD"
    locale="en-US"
    precision="1"
  ></oas-order-card>
</DemoBlock>

## 展开明细

`expandable` 打开「展开明细」开关，展开区内容由 `details` 插槽提供——没有内容时按钮不渲染（避免点开一片空白）。用户点击后组件回写 `expanded` 属性并派发 `oas-toggle`；宿主也可以直接写 `expanded` 预置展开态（受控，不派发事件）。

<DemoBlock title="折叠 / 预置展开 / 事件反馈">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-order-card
      id="oc-expand"
      order-id="NO-3001"
      status="shipped"
      status-map='{"shipped":{"label":"待收货","tone":"primary"}}'
      items='[{"title":"轻量羽绒服","spec":"藏青 / L","quantity":1,"image":"/assets/demo-square-5.svg"}]'
      payable="399"
      expandable
    >
      <div slot="details" style="display: grid; gap: var(--oas-space-1)">
        <span>下单时间：2024-11-24 10:20</span>
        <span>配送方式：顺丰包邮 · 预计 11-26 送达</span>
        <span>收货人：张先生 · 138****0000</span>
      </div>
      <oas-button slot="actions" size="small">查看物流</oas-button>
    </oas-order-card>
    <oas-order-card
      order-id="NO-3002"
      status="shipped"
      status-map='{"shipped":{"label":"待收货","tone":"primary"}}'
      items='[{"title":"预置展开的订单","quantity":1}]'
      payable="129"
      expandable
      expanded
    >
      <div slot="details">下单时间：2024-11-23 21:05 · 已发货</div>
    </oas-order-card>
    <p id="oc-expand-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      点击「展开明细」查看 oas-toggle 反馈。
    </p>
  </div>
</DemoBlock>

## 空条目与纯摘要

`items` 缺省或为空时渲染「暂无商品」；只给金额不给条目，可当一张轻量账单卡使用。

<DemoBlock title="空条目">
  <oas-order-card order-id="NO-4001" status="canceled" status-map='{"canceled":"已取消"}' payable="0"></oas-order-card>
</DemoBlock>

## 自定义样式须知

`::part(card)` 是 column flex：`head` → `items` → `amount` → `details` → `foot`。`::part(foot)` 里展开按钮用 `margin-inline-end: auto` 顶到行首、`actions` 插槽贴行尾；覆写 `::part(foot)` 的 `justify-content` 时要一并考虑按钮位置。卡片本身不可点击，需要整卡跳转时把卡片包进 `<a>`。

## API

### oas-order-card

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `currency` | ISO 4217 币种，默认 `CNY` | `string` | `CNY` |
| `discount` | 已优惠金额（非负数值，连同 i18n `orderCard.discount` 文案展示） | — | — |
| `expandable` | 启用「展开明细」开关（`details` 插槽无内容时按钮不渲染） | `boolean` | — |
| `expanded` | 明细展开态：用户点击后组件回写该属性；宿主可直接写以预置展开（受控，不派发 oas-toggle） | `boolean` | — |
| `items` | 条目摘要 JSON 数组 `[{ image?, title, spec?, quantity? }]`；缺 `title` 的条目被忽略，`quantity` 缺省 1 | `OrderCardItem[] \| string` | — |
| `locale` | 金额格式化 locale；缺省取文档 `<html lang>`，再退回 `zh-CN` | — | — |
| `order-id` | 订单号（头部展示，缺省不渲染该位置） | — | — |
| `original` | 优惠前金额（划线展示，交给内嵌 `oas-price` 的 `original` 通道） | — | — |
| `payable` | 实付金额（非负数值）；与 `original` / `discount` 全缺省时金额区整体隐藏 | — | — |
| `precision` | 金额小数位，默认 2 | — | — |
| `status` | 状态键（查 `status-map`）；未声明的键原样显示 | — | — |
| `status-map` | 状态语义映射 JSON 对象 `{ 键: { label, tone } }`，也接受字符串简写 `{ 键: "文案" }`（等价 `tone: default`）；`tone` 五档 default / primary / success / warning / danger，非法值回落 default 并告警一次 | `OrderStatusMap \| string` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `items` | 条目摘要：get+set 双通道（数组或 JSON 字符串），写即反射 `items` attribute | `OrderCardItem[] \| string` | — |
| `statusMap` | 状态语义映射：get+set 双通道（对象或 JSON 字符串），写即反射 `status-map` attribute | `OrderStatusMap \| string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-toggle` | 用户点击展开 / 收起后派发，`detail: { expanded, orderId }`；宿主改写 `expanded` 属性不派发 |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `actions` | 操作按钮区（付款 / 查看物流 / 再次购买等） |
| `details` | 展开明细内容（订单号、下单时间、收货信息等；无内容时展开按钮不渲染） |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-order-card').then(() => {
    const out = document.getElementById('oc-expand-out')
    document.getElementById('oc-expand')?.addEventListener('oas-toggle', (e) => {
      out.textContent = 'oas-toggle：' + e.detail.orderId + ' 明细' + (e.detail.expanded ? '已展开' : '已收起')
    })
  })
})
</script>
