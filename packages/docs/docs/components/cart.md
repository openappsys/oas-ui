---
description: "购物车列表：条目勾选 / 内建数量步进（含库存上限钳制）/ 删除（按钮或滑动）/ 全选与半选联动 / 选中合计，items JSON 双通道 + oas-change 回传合计与选中数。"
---

# Cart 购物车列表

交易链路的购物车列表件：条目勾选、内建数量步进、删除（按钮 / 滑动 / 关闭）、全选联动与选中合计。数据由 `items` JSON 驱动，用户交互后组件把结果回写 `items` 并派发 `oas-change`（detail 带 `items` / `total` / `selectedCount`）——非受控开箱即用，受控宿主忽略回写、按自己状态重新赋 `items` 即可。

## 基础用法

`items` 每项是 `{ id, title, price, quantity?, selected?, spec?, image?, maxQuantity?, disabled? }`；勾选与步进都会派发 `oas-change`：

<DemoBlock title="勾选联动 + 合计 + 事件反馈">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart
      id="cart-basic"
      items='[{"id":"a","title":"纯棉短袖T恤","spec":"白色 / M","price":99,"quantity":2,"selected":true,"image":"/assets/demo-square-1.svg"},{"id":"b","title":"轻便帆布鞋","spec":"42 / 米白","price":199,"quantity":1,"image":"/assets/demo-square-2.svg"},{"id":"c","title":"棉质渔夫帽","spec":"均码","price":59,"quantity":1,"image":"/assets/demo-square-3.svg"}]'
    ></oas-cart>
    <p id="cart-basic-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      勾选条目或改数量，查看 oas-change 反馈。
    </p>
  </div>
</DemoBlock>

## 全选与半选

合计行左侧是全选框：全选时勾上、部分选中时呈半选（`indeterminate`）；禁用条目不参与全选判定，也不计入合计。

<DemoBlock title="半选态（部分选中）">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart
      id="cart-select"
      items='[{"id":"a","title":"纯棉短袖T恤","spec":"白色 / M","price":99,"quantity":2,"selected":true,"image":"/assets/demo-square-1.svg"},{"id":"b","title":"轻便帆布鞋","price":199,"quantity":1,"image":"/assets/demo-square-2.svg"},{"id":"c","title":"赠品贴纸","price":10,"quantity":1,"selected":true,"disabled":true,"image":"/assets/demo-square-6.svg"}]'
    ></oas-cart>
  </div>
</DemoBlock>

## 数量步进与库存上限

步进钮与数量输入内建钳制：低于 1 拉到 1，超过 `maxQuantity` 拉到上限（到上限时加号自动禁用）。数量改动即时影响合计。

<DemoBlock title="库存上限 3">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart
      id="cart-limit"
      items='[{"id":"a","title":"限量手冲咖啡豆","spec":"200g / 中浅烘","price":128,"quantity":1,"selected":true,"maxQuantity":3,"image":"/assets/demo-square-4.svg"},{"id":"b","title":"滤纸 100 张","spec":"V60 02","price":25,"quantity":2,"selected":true,"image":"/assets/demo-square-5.svg"}]'
    ></oas-cart>
  </div>
</DemoBlock>

## 删除

`delete-mode` 决定删除形态：`button`（缺省，行尾删除钮）/ `swipe`（向行首拖出删除钮，键盘仍可用——按钮在 Tab 序里，聚焦即露出）/ `none`（不可删除）。删除前派发 **可取消**的 `oas-remove`，宿主 `preventDefault()` 即拦下（接确认框后自行写 `items`）。滑动展开后的单行操作惯例：**点已展开行的行体 = 收起**（不派发 `oas-item-click`）；点其他行的行体先收起已展开行、事件照常派发（同屏至多一行展开，滑开另一行也会收起前一行）。

<DemoBlock title="按钮删除 / 滑动删除 / 不可删除">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart
      id="cart-delete-button"
      items='[{"id":"a","title":"按钮删除形态","price":39,"quantity":1,"selected":true,"image":"/assets/demo-square-1.svg"}]'
    ></oas-cart>
    <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      delete-mode="swipe"：在条目上向左拖，露出删除钮再点（鼠标与触屏同手势）。
    </p>
    <oas-cart
      id="cart-delete-swipe"
      delete-mode="swipe"
      items='[{"id":"a","title":"滑动删除形态","price":39,"quantity":1,"selected":true,"image":"/assets/demo-square-2.svg"},{"id":"b","title":"另一件商品","price":69,"quantity":1,"image":"/assets/demo-square-3.svg"}]'
    ></oas-cart>
    <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      delete-mode="none"：只读列表（例如订单回顾场景）。
    </p>
    <oas-cart
      delete-mode="none"
      items='[{"id":"a","title":"不可删除形态","price":39,"quantity":1,"selected":true,"image":"/assets/demo-square-4.svg"}]'
    ></oas-cart>
    <p id="cart-delete-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      点击删除钮查看 oas-remove 反馈。
    </p>
  </div>
</DemoBlock>

## 禁用条目与图片占位

`disabled` 条目灰显、不可勾选 / 改数量，且不计合计，但**删除钮保持可用**（失效商品要能清掉）；`image` 缺省或加载失败时渲染虚线占位框（不撑破布局）。

<DemoBlock title="禁用条目 / 无图占位">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart
      id="cart-disabled"
      items='[{"id":"a","title":"已下架的商品","spec":"白色 / M","price":99,"quantity":1,"selected":true,"disabled":true,"image":"/assets/demo-square-5.svg"},{"id":"b","title":"无图商品","price":59,"quantity":1,"selected":true},{"id":"c","title":"图已失效","price":29,"quantity":1,"image":"https://invalid.example.com/missing.png"}]'
    ></oas-cart>
    <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      宿主 disabled：整单只读（结算中 / 风控锁定等场景）。
    </p>
    <oas-cart
      id="cart-disabled-host"
      disabled
      items='[{"id":"a","title":"结算中的购物车","price":99,"quantity":2,"selected":true,"image":"/assets/demo-square-6.svg"}]'
    ></oas-cart>
  </div>
</DemoBlock>

## 币种与精度

`currency` / `locale` / `precision` 透传到条目单价与合计（与 `oas-price` 同一套格式化）；`oas-change` 的 `total` 也按 `precision` 收敛。

<DemoBlock title="美元 / 无小数位">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart
      currency="USD"
      locale="en-US"
      precision="0"
      items='[{"id":"a","title":"Cotton Tee","spec":"White / M","price":19.9,"quantity":2,"selected":true,"image":"/assets/demo-square-1.svg"},{"id":"b","title":"Canvas Shoes","price":49.5,"quantity":1,"selected":true,"image":"/assets/demo-square-2.svg"}]'
    ></oas-cart>
  </div>
</DemoBlock>

## 空购物车

`items` 为空时隐藏列表与合计行，渲染空态；`empty` 插槽可换成引导文案与「去逛逛」按钮。

<DemoBlock title="空态（缺省文案 / 自定义插槽）">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart id="cart-empty-default" items="[]"></oas-cart>
    <oas-cart id="cart-empty-slot" items="[]">
      <div slot="empty" style="display: flex; flex-direction: column; align-items: center; gap: var(--oas-space-2)">
        <span style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">购物车空空如也</span>
        <oas-button size="small">去逛逛</oas-button>
      </div>
    </oas-cart>
  </div>
</DemoBlock>

## 与结算栏组合

本组件只管列表与小计：结算按钮放 `actions` 插槽，或把 `oas-change` 的 `total` 交给 `oas-submit-bar`。下方是两种常见组合（下方结算栏的合计会跟购物车同步）：

<DemoBlock title="actions 插槽 + oas-submit-bar 联动">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart
      id="cart-checkout"
      items='[{"id":"a","title":"纯棉短袖T恤","spec":"白色 / M","price":99,"quantity":2,"selected":true,"image":"/assets/demo-square-1.svg"},{"id":"b","title":"轻便帆布鞋","price":199,"quantity":1,"selected":true,"image":"/assets/demo-square-2.svg"}]'
    >
      <oas-button slot="actions" size="small">管理</oas-button>
    </oas-cart>
    <oas-submit-bar id="cart-submit-bar" total="397" action-text="去结算"></oas-submit-bar>
    <p id="cart-checkout-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      改勾选或数量，结算栏合计会跟着变。
    </p>
  </div>
</DemoBlock>

## 批量操作（能力子路径）

批量删除 / 批量移收藏走**能力子路径** `@oas-ui/ui/commerce/cart/batch`（helper：按需显式 import，不随本体进链——本体 API 零变化）。目标 = 勾选集（`items[].selected === true`），禁用条目与不存在的 id 自动跳过；执行后回写 `items` 并派发 `oas-batch`（detail = `{ op, items, succeeded, skipped, changed }`），宿主据此给反馈：

<DemoBlock title="批量删除 / 批量收藏（executeBatch 编排）">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-cart
      id="cart-batch"
      items='[{"id":"a","title":"纯棉短袖T恤","spec":"白色 / M","price":99,"quantity":2,"selected":true,"image":"/assets/demo-square-1.svg"},{"id":"b","title":"轻便帆布鞋","spec":"42 / 米白","price":199,"quantity":1,"selected":true,"image":"/assets/demo-square-2.svg"},{"id":"c","title":"棉质渔夫帽","spec":"均码","price":59,"quantity":1,"image":"/assets/demo-square-3.svg"},{"id":"d","title":"已下架的商品","spec":"缺货","price":29,"quantity":1,"selected":true,"disabled":true,"image":"/assets/demo-square-6.svg"}]'
    >
      <oas-button id="cart-batch-remove" slot="actions" size="small">删除所选</oas-button>
      <oas-button id="cart-batch-favorite" slot="actions" size="small">收藏所选</oas-button>
    </oas-cart>
    <p id="cart-batch-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      勾选条目后点「删除所选 / 收藏所选」；已下架商品（禁用卡勾不中也不会被编排误删）。
    </p>
  </div>
</DemoBlock>

宿主侧胶水（demo 同款）：

```js
import { executeBatch } from '@oas-ui/ui/commerce/cart/batch'

removeBtn.addEventListener('click', () => {
  const outcome = executeBatch(cart, { type: 'remove' })
  // outcome.skipped 含跳过原因（disabled / not-found），宿主据此提示
})
// 批量收藏：favorite 是宿主业务约定字段（favorite: true/false 写回 items）
executeBatch(cart, { type: 'favorite' })
```

## 自定义样式须知

行结构是 `::part(item)`（`li`）→ `::part(item-inner)`（内容层）+（滑动模式）`::part(swipe-remove)`。内容层自带背景并压在删除钮之上，覆写 `::part(item)` 背景 / 圆角时要注意滑动展开态（露出的是 `::part(swipe-remove)`）。条目点击（进详情）走 `oas-item-click`，detail 为 `{ id, item }`。

## API

### oas-cart

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `currency` | ISO 4217 币种，默认 `CNY`（透传内嵌 `oas-price`） | `string` | `CNY` |
| `delete-mode` | 删除交互形态：`button`（缺省，行尾删除钮）/ `swipe`（向行首拖出删除钮，按钮始终在 Tab 序）/ `none`（不可删除）；非法值回落 `button` 并告警一次 | — | — |
| `disabled` | 整体禁用（兼容 config-provider 注入禁用）：勾选 / 步进 / 删除 / 全选全部不可操作 | `boolean` | — |
| `items` | 条目 JSON 数组 `[{ id, image?, title, spec?, price, quantity?, selected?, maxQuantity?, disabled? }]`；缺 `id` 的条目被忽略，`price` 非法按 0 计并告警一次，`quantity` 缺省 1 并钳到 `[1, maxQuantity]`，`selected` 缺省 false，`disabled` 条目不计合计 | `CartItem[] \| string` | — |
| `locale` | 金额格式化 locale；缺省取文档 `<html lang>`，再退回 `zh-CN` | — | — |
| `precision` | 金额小数位，默认 2（合计按此精度收敛后回传 detail） | — | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `items` | 条目数组：get+set 双通道（接受数组或 JSON 字符串，写即反射 `items` attribute）；用户交互后组件回写该属性并派发 `oas-change`，受控宿主忽略回写、按自己状态重新赋值即可 | `CartItem[] \| string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 勾选 / 全选 / 改数量 / 删除后派发，`detail: { items, total, selectedCount, allSelected, indeterminate }`（`items` 为归一后条目，`total` 为选中合计） |
| `oas-item-click` | 点击条目主体（标题 / 规格 / 价格区）派发，`detail: { id, item }`，宿主据此进商品详情 |
| `oas-remove` | 删除前派发（cancelable）：`detail: { item, items, total, selectedCount }`（`items` 为删除后列表）；`preventDefault()` 即取消本次删除，宿主可据此接确认框 |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `actions` | 合计行右侧扩展位（结算按钮、优惠入口等）；空购物车时整行不渲染 |
| `empty` | 空态内容（缺省渲染 i18n `cart.empty` 文案） |

<script setup>
import { onMounted } from 'vue'
import { executeBatch } from '@oas-ui/ui/commerce/cart/batch'
onMounted(() => {
  customElements.whenDefined('oas-cart').then(() => {
    const out = document.getElementById('cart-basic-out')
    document.getElementById('cart-basic')?.addEventListener('oas-change', (e) => {
      out.textContent =
        'oas-change：合计 ' + e.detail.total + ' · 已选 ' + e.detail.selectedCount + ' 件 · 全选 ' + (e.detail.allSelected ? '是' : '否')
    })
    document.getElementById('cart-basic')?.addEventListener('oas-item-click', (e) => {
      out.textContent = 'oas-item-click：' + e.detail.id + '（' + e.detail.item.title + '）'
    })

    const delOut = document.getElementById('cart-delete-out')
    for (const id of ['cart-delete-button', 'cart-delete-swipe']) {
      document.getElementById(id)?.addEventListener('oas-remove', (e) => {
        delOut.textContent = 'oas-remove：' + e.detail.item.title + ' · 删除后剩 ' + e.detail.items.length + ' 件'
      })
    }

    const cart = document.getElementById('cart-checkout')
    const bar = document.getElementById('cart-submit-bar')
    const checkoutOut = document.getElementById('cart-checkout-out')
    cart?.addEventListener('oas-change', (e) => {
      bar.setAttribute('total', String(e.detail.total))
      checkoutOut.textContent = 'oas-change：合计 ' + e.detail.total + '（已同步到结算栏）'
    })

    // —— 批量操作 demo（能力子路径 helper）——
    const batchCart = document.getElementById('cart-batch')
    const batchOut = document.getElementById('cart-batch-out')
    batchCart?.addEventListener('oas-batch', (e) => {
      const d = e.detail
      const skipped = d.skipped.length > 0 ? `，跳过 ${d.skipped.length} 件（${d.skipped.map((s) => s.reason === 'disabled' ? '禁用' : '不存在').join('/')}）` : ''
      batchOut.textContent = `oas-batch（${d.op.type}）：成功 ${d.succeeded.length} 件${skipped}；购物车剩 ${d.items.length} 件`
    })
    document.getElementById('cart-batch-remove')?.addEventListener('click', () => {
      executeBatch(batchCart, { type: 'remove' })
    })
    document.getElementById('cart-batch-favorite')?.addEventListener('click', () => {
      executeBatch(batchCart, { type: 'favorite' })
    })
  })
})
</script>
