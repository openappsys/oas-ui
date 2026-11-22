---
description: "商品底部导航：icon 按钮组（收藏 / 店铺 / 购物车，支持角标与按下态）+ 主按钮组；数据走 JSON 属性，点击派发 oas-action-click。"
---

# GoodsAction 商品导航

商品详情页底部的操作栏：左侧 icon 按钮组（收藏 / 店铺 / 购物车，可带角标、收藏可呈按下态），右侧主按钮组（加入购物车 / 立即购买等）。数据由 `items` / `actions` 两个 JSON 属性驱动，逐项可禁用，点击派发 `oas-action-click`。

## 基础用法

`items` 的 `key` 决定事件标识；内置 key（`favorite` / `shop` / `cart`）缺省文案与图标走内置映射，其余 key 需要自带 `label`：

<DemoBlock title="icon 组 + 主按钮组 + 事件反馈">
  <oas-goods-action
    id="ga-basic"
    items='[{"key":"favorite"},{"key":"shop"},{"key":"cart","badge":3}]'
    actions='[{"key":"add","text":"加入购物车"},{"key":"buy","text":"立即购买","primary":true}]'
  ></oas-goods-action>
  <p id="ga-basic-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    点击任一项查看 oas-action-click 反馈。
  </p>
</DemoBlock>

## 角标与按下态

`badge` 大于 0 显示，超过 99 收敛为 `99+`；`active` 让 icon 项呈按下态（`aria-pressed="true"`），适合收藏开关。

<DemoBlock title="角标上限 + 收藏按下态">
  <oas-goods-action
    id="ga-badge"
    items='[{"key":"favorite","active":true},{"key":"cart","badge":120}]'
    actions='[{"key":"buy","text":"立即购买","primary":true}]'
  ></oas-goods-action>
</DemoBlock>

## 自定义图标与禁用

`icon` 传已注册的图标名（内置或 `registerIcon` 自定义）覆盖默认图标；名字未注册时开发态告警一次并回退该 key 的内置图标（无内置图标则不渲染图标，文字照常可读）。`actions[].disabled` 或宿主 `disabled` 禁用对应项：

<DemoBlock title="自定义图标 / 单项禁用 / 全局禁用">
  <oas-goods-action
    items='[{"key":"home","label":"首页","icon":"star"},{"key":"cart","badge":2}]'
    actions='[{"key":"add","text":"加入购物车","disabled":true},{"key":"buy","text":"立即购买","primary":true}]'
  ></oas-goods-action>
  <oas-goods-action
    items='[{"key":"favorite"},{"key":"cart","badge":1}]'
    actions='[{"key":"buy","text":"已售罄","primary":true}]'
    disabled
    style="margin-top: var(--oas-space-2)"
  ></oas-goods-action>
</DemoBlock>

## 导航可访问名称

`label` 覆盖导航区（`<nav>`）的可访问名称，缺省走 i18n `goodsAction.label`；一个页面有多条操作栏时用它区分：

<DemoBlock title="自定义可访问名称">
  <oas-goods-action
    label="商品操作栏"
    items='[{"key":"favorite"},{"key":"cart","badge":1}]'
    actions='[{"key":"buy","text":"立即购买","primary":true}]'
  ></oas-goods-action>
</DemoBlock>

## API

### oas-goods-action

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `actions` | 主按钮 JSON 数组 `[{ key, text, primary?, disabled? }]` | `GoodsActionButton[] \| string` | — |
| `disabled` | 全局禁用（兼容 config-provider 注入禁用） | `boolean` | — |
| `items` | icon 按钮 JSON 数组 `[{ key, label?, icon?, badge?, active? }]`；内置 key（`favorite` / `shop` / `cart`）缺省文案与图标走内置映射 | `GoodsActionItem[] \| string` | — |
| `label` | 导航区可访问名称，缺省走 i18n `goodsAction.label` | — | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-action-click` | 任一项点击派发，detail `{ key, source: 'icon' \| 'button' }` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-goods-action').then(() => {
    const out = document.getElementById('ga-basic-out')
    document.getElementById('ga-basic')?.addEventListener('oas-action-click', (e) => {
      out.textContent = 'oas-action-click：' + e.detail.key + '（' + e.detail.source + '）'
    })
  })
})
</script>
