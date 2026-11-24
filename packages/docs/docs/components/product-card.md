---
description: "商品卡片：图片（比例可配）+ 标题两行截断 + 价格（现价 + 划线价）+ 标签 / 促销 / 按钮三个插槽，纵向与横向两形态。"
---

# ProductCard 商品卡片

商品列表与推荐位的高频卡片：图片（比例可配）+ 标题（两行截断）+ 价格（现价与划线价），外加标签位、促销位与按钮区三个插槽。`layout` 提供纵向（缺省）与横向两种形态。

## 基础用法

`image` / `title` / `price` 是最小集合；`original-price` 给划线价，标签与按钮放进插槽：

<DemoBlock title="纵向卡片 + 标签 + 按钮">
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--oas-space-3)">
    <oas-product-card
      image="/assets/demo-square-1.svg"
      title="纯棉短袖T恤 男女同款"
      price="99"
      original-price="129"
    >
      <oas-tag slot="tags" size="sm">限时 8 折</oas-tag>
      <oas-tag slot="tags" size="sm">自营</oas-tag>
      <oas-button slot="actions" size="small" type="primary" style="width: 100%">加入购物车</oas-button>
    </oas-product-card>
    <oas-product-card
      image="/assets/demo-square-2.svg"
      title="轻便帆布鞋 米白低帮"
      price="199"
      original-price="259"
    >
      <oas-tag slot="tags" size="sm">包邮</oas-tag>
      <oas-button slot="actions" size="small" style="width: 100%">查看详情</oas-button>
    </oas-product-card>
  </div>
</DemoBlock>

## 图片比例

`image-ratio` 控制图片框的宽高比，写法支持 `16:9` / `4:3` / 单数字（`1.5`）；缺省 `1:1`，非法值回落 `1:1` 并开发态告警一次。

<DemoBlock title="1:1（缺省）/ 4:3 / 16:9">
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--oas-space-3)">
    <oas-product-card image="/assets/demo-square-3.svg" title="方形图（缺省 1:1）" price="59"></oas-product-card>
    <oas-product-card image="/assets/demo-tall-1.svg" image-ratio="4:3" title="四比三" price="89"></oas-product-card>
    <oas-product-card image="/assets/demo-wide-1.svg" image-ratio="16:9" title="十六比九（横幅图）" price="129"></oas-product-card>
  </div>
</DemoBlock>

## 价格与币种

`price` 是现价、`original-price` 是划线价（原价语义由内嵌价格件播报）；`currency` / `locale` / `precision` 与 `oas-price` 同源：

<DemoBlock title="美元 / 无小数位">
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--oas-space-3)">
    <oas-product-card
      image="/assets/demo-square-4.svg"
      title="Wool scarf"
      price="59.9"
      original-price="79.9"
      currency="USD"
      locale="en-US"
      precision="1"
    ></oas-product-card>
    <oas-product-card title="无图商品（占位框）" price="39"></oas-product-card>
  </div>
</DemoBlock>

## 横向形态

`layout="horizontal"` 把图片放到行首（固定 104px 宽、高度按比例），内容在行尾——适合购物车推荐、订单追加购等横排位置。

<DemoBlock title="layout=horizontal">
  <div style="display: grid; gap: var(--oas-space-2)">
    <oas-product-card
      layout="horizontal"
      image="/assets/demo-square-5.svg"
      title="轻量羽绒服 藏青 L"
      price="399"
      original-price="599"
    >
      <oas-tag slot="tags" size="sm" color="orange">满减</oas-tag>
      <span slot="promo">满 300 减 50</span>
      <oas-button slot="actions" size="small">加入购物车</oas-button>
    </oas-product-card>
    <oas-product-card
      layout="horizontal"
      image="/assets/demo-square-6.svg"
      title="手冲咖啡豆 200g 中浅烘"
      price="128"
    >
      <oas-button slot="actions" size="small">再买一单</oas-button>
    </oas-product-card>
  </div>
</DemoBlock>

## 促销位与长标题

`promo` 插槽放促销文案（满减 / 秒杀倒计时等）；标题固定两行截断，完整文案保留在 DOM 与 `title` 悬浮提示里。

<DemoBlock title="促销文案 + 两行截断">
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--oas-space-3)">
    <oas-product-card
      image="/assets/demo-square-1.svg"
      title="这是一段很长的商品标题，用来验证标题在两行之后被截断，而完整文案仍然保留在无障碍文本与悬浮提示里"
      price="69"
    >
      <span slot="promo">今日 20:00 开抢</span>
    </oas-product-card>
  </div>
</DemoBlock>

## 自定义样式须知

卡片为静态内容（不进入焦点序、不吞点击）：需要整卡跳转就把卡片包进 `<a>`，需要按钮就用 `actions` 插槽。`::part(media)` 带内联 `aspect-ratio`，覆写宽高时注意 `object-fit: cover`；`actions` 用 `margin-block-start: auto` 贴底，保证不同标题行数的卡片按钮对齐。

## API

### oas-product-card

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `currency` | ISO 4217 币种，默认 `CNY` | `string` | `CNY` |
| `image` | 图片地址（加载失败回落虚线占位框，换 `image` 值即重新尝试） | — | — |
| `image-ratio` | 图片宽高比：`16:9` / `4:3` / 单数字（`1.5`）；缺省 `1:1`，非法值回落 `1:1` 并告警一次 | — | — |
| `layout` | 卡片形态：`vertical`（缺省，图在上）/ `horizontal`（图在行首，固定 104px 宽）；非法值回落 `vertical` 并告警一次 | — | — |
| `locale` | 金额格式化 locale；缺省取文档 `<html lang>`，再退回 `zh-CN` | — | — |
| `original-price` | 划线原价（交给内嵌 `oas-price` 的 `original` 通道） | — | — |
| `precision` | 金额小数位，默认 2 | — | — |
| `price` | 现价（非负数值）；与 `original-price` 都缺省时价格区隐藏 | — | — |
| `title` | 商品标题（两行截断，完整文案保留在 DOM 与悬浮提示里；同时作为图片 alt） | — | — |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `actions` | 按钮区（加入购物车 / 立即购买等）；空插槽自动收起 |
| `promo` | 促销文案位（满减 / 秒杀倒计时等）；空插槽自动收起 |
| `tags` | 标签位（折扣 / 自营 / 包邮等，放 `oas-tag`）；空插槽自动收起 |
