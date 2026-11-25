---
description: "商品详情页骨架配方：oas-sku（弹层形态）+ oas-goods-action + oas-submit-bar + oas-product-card 的页面级组装——图集区 / 信息区 / 规格区 / 操作栏 / 推荐位的布局模板与联动。"
---

# 商品详情页骨架（场景配方）

> 页面级组装示范：图集、信息、规格、操作栏、推荐位五个区块全部由既有件拼装——`oas-carousel`（图集）+ `oas-price`（价格）+ `oas-sku`（规格弹层）+ `oas-goods-action`（移动端操作栏）+ `oas-submit-bar`（结算变体）+ `oas-product-card`（推荐位）。不新增组件 API，页面骨架与联动逻辑都是宿主代码。

## 页面结构与分工

| 区块 | 承载件 | 说明 |
| --- | --- | --- |
| 图集区 | `oas-carousel` + `oas-image` | 主图轮播，`indicators` 圆点切换 |
| 信息区 | 标题 + `oas-price` + `oas-tag` | 价格随所选规格联动（`oas-change` → 写回 `value`） |
| 规格区 | `oas-sku`（`layout="popup"`） | 底部弹层选规格；`specs` / `skus` 数据契约见组件页 |
| 操作栏 | `oas-goods-action` | icon 组（收藏 / 店铺 / 购物车角标）+ 主按钮组 |
| 推荐位 | `oas-product-card`（横向） | 「看了又看」，`layout="horizontal"` 行首图形态 |

## 详情页骨架

<DemoBlock title="五区块组装：选规格开弹层 → 价格与摘要联动 → 购物车角标自增">
  <div class="pd-page">
    <section class="pd-gallery" aria-label="商品图集">
      <oas-carousel indicators>
        <div class="pd-slide"><oas-image src="/assets/demo-square-1.svg" alt="商品图：正面" fit="cover"></oas-image></div>
        <div class="pd-slide"><oas-image src="/assets/demo-square-2.svg" alt="商品图：侧面" fit="cover"></oas-image></div>
        <div class="pd-slide"><oas-image src="/assets/demo-square-3.svg" alt="商品图：细节" fit="cover"></oas-image></div>
      </oas-carousel>
    </section>
    <section class="pd-info">
      <h4 class="pd-title">轻便帆布鞋 低帮经典款</h4>
      <div class="pd-price-row">
        <oas-price id="pd-price" value="329" original="459" size="lg"></oas-price>
        <oas-tag type="danger" variant="solid">限时直降</oas-tag>
      </div>
      <p class="pd-meta">月销 1.2 万 · 顺丰发货 · 48 小时内出库</p>
      <div class="pd-sku-row">
        <span class="pd-label">选择</span>
        <span id="pd-sku-summary" class="pd-summary">未选择规格 · 1 件</span>
        <oas-button id="pd-sku-open" size="small">请选择</oas-button>
      </div>
    </section>
    <section class="pd-recs" aria-label="看了又看">
      <p class="pd-label">看了又看</p>
      <div class="pd-recs-row">
        <oas-product-card layout="horizontal" image="/assets/demo-square-5.svg" title="轻量羽绒服 藏青 L" price="399" original-price="599">
          <oas-button slot="actions" size="small" block>加入购物车</oas-button>
        </oas-product-card>
        <oas-product-card layout="horizontal" image="/assets/demo-square-6.svg" title="手冲咖啡豆 200g 中浅烘" price="128">
          <oas-button slot="actions" size="small" block>再买一单</oas-button>
        </oas-product-card>
      </div>
    </section>
    <oas-goods-action
      id="pd-action"
      label="商品操作"
      items='[{"key":"favorite"},{"key":"shop"},{"key":"cart","badge":2}]'
      actions='[{"key":"add","text":"加入购物车"},{"key":"buy","text":"立即购买","primary":true}]'
    ></oas-goods-action>
  </div>
  <oas-sku
    id="pd-sku"
    layout="popup"
    specs='[{"key":"color","label":"颜色","values":["曜石黑","米白"]},{"key":"size","label":"尺码","values":["39","40","41"]}]'
    skus='[{"id":"bk-39","specs":{"color":"曜石黑","size":"39"},"price":329,"stock":5},{"id":"bk-40","specs":{"color":"曜石黑","size":"40"},"price":329,"stock":8},{"id":"bk-41","specs":{"color":"曜石黑","size":"41"},"price":339,"stock":0},{"id":"wh-39","specs":{"color":"米白","size":"39"},"price":339,"stock":3},{"id":"wh-40","specs":{"color":"米白","size":"40"},"price":349,"stock":6},{"id":"wh-41","specs":{"color":"米白","size":"41"},"price":349,"stock":4}]'
  ></oas-sku>
  <p id="pd-out" class="pd-out" role="status">点「请选择」开规格弹层；未选规格直接点「加入购物车」会被引导先选规格。</p>
</DemoBlock>

**模式要点**：

1. **sku 弹层形态是一件两态**：`layout="popup"` 固定底部弹层（内嵌面板同一棵 DOM 子树搬移承载）；窄屏（≤480px）缺省自动切弹层，桌面宽屏自动内嵌——本页显式声明 `popup` 以演示移动形态。
2. **开合是受控协议**：`openOverlay()` 打开；弹层内的下滑 / 遮罩 / Esc 关闭由组件承接（内部移除 `open` 并派 `oas-open-change`），宿主不需要接管关闭动作。
3. **价格与摘要联动挂 `oas-change`**：detail `{ value, quantity, sku, change }`——`sku` 为完整匹配对象（或部分选择时的 `null`），匹配到才写回 `oas-price` 的 `value`；摘要文本由宿主拼装（规格值 + 数量）。
4. **购物车角标是数据回写**：`oas-action-click`（detail `{ key, source }`）→ 宿主改 `items` 数组里 cart 项的 `badge` → 整体重写 `items` 属性；收藏项同理用 `active` 回写（`aria-pressed` 自动同步）。
5. **未选规格的守护在宿主**：点「加入购物车 / 立即购买」时若组合不完整，宿主打开规格弹层引导补选——业务规则不进组件。

## 结算变体：协议勾选解锁

<DemoBlock title="submit-bar + 协议勾选：勾选前禁用，提交走 loading">
  <oas-submit-bar id="pd-bar" total="329" label="应付" action-text="提交订单" disabled>
    <label class="pd-agree">
      <input type="checkbox" id="pd-agree"> 我已阅读并同意服务协议
    </label>
  </oas-submit-bar>
  <p id="pd-bar-out" class="pd-out" role="status">勾选协议后「提交订单」解锁；提交期间按钮自动进入 loading。</p>
</DemoBlock>

**模式要点**：

1. **协议勾选放默认插槽**（合计左侧扩展区）——原生 `checkbox` 即可，无需再引入开关组件；宿主监听 `change` 写 `disabled`。
2. **提交反馈三拍**：`oas-submit` → 置 `loading`（组件内建禁点 + spinner + `aria-busy`）→ 回包成功后移除并给出订单反馈。
3. **goods-action 与 submit-bar 是两种页面形态**：详情页用 goods-action（多入口 + 收藏），收银 / 结算确认页用 submit-bar（合计 + 单主按钮）——按页面职能选，不在同一屏堆两条操作栏。

## 关键代码

```html
<!-- 页面骨架（五区块，可整体拷贝后替换数据） -->
<div class="pd-page">
  <section class="pd-gallery" aria-label="商品图集">
    <oas-carousel indicators>
      <div class="pd-slide"><oas-image src="…" alt="…" fit="cover"></oas-image></div>
    </oas-carousel>
  </section>
  <section class="pd-info">
    <oas-price id="price" value="329" original="459" size="lg"></oas-price>
    <div class="pd-sku-row">
      <span id="sku-summary">未选择规格</span>
      <oas-button id="sku-open">请选择</oas-button>
    </div>
  </section>
  <oas-goods-action id="action" items="…" actions="…"></oas-goods-action>
</div>
<oas-sku id="sku" layout="popup" specs="…" skus="…"></oas-sku>
```

```ts
// 三条联动（宿主侧）
skuOpen.addEventListener('oas-click', () => sku.openOverlay())

sku.addEventListener('oas-change', (e) => {
  const { value, quantity, sku: matched } = e.detail
  summary.textContent = (value ? Object.values(value).join(' / ') : '未选择规格') + ' · ' + quantity + ' 件'
  if (matched) price.setAttribute('value', String(matched.price))
})

action.addEventListener('oas-action-click', (e) => {
  // sku.value 是受控镜像 getter，恒返回对象（未选 = 空对象）——判组合要用键数，别写 !sku.value（恒 truthy，守卫永不触发）
  if (e.detail.key === 'add' && Object.keys(sku.value ?? {}).length < 2) return sku.openOverlay() // 组合未选完（本例 2 组规格，拦半选）→ 引导补选
  // …业务处理；角标 / 收藏态改 items 后整体回写
})
```

## 注意事项

1. **图集高度要显式声明**：轮播 slide 不自带高度，`.pd-slide` 给固定高度；`oas-image` 的 `fit="cover"` 只管裁切不管尺寸——铺满要 `::part(wrapper)` / `::part(image)` 穿透设 `width/height: 100%`（见本页样式块）；比例按业务选 1:1 或 4:3。
2. **`specs` 只放售卖维度**：颜色 / 尺码这类影响价格与库存的维度才进 `specs`（笛卡尔积）；产地 / 材质等描述属性放宿主的信息区展示，不要塞进组合表（见 sku 组件页「specs 使用指引」）。
3. **缺货组合自动置灰**：`skus` 里 `stock: 0` 的组合在弹层中不可选并标注「缺货」；全部售罄时数量控件禁用——库存表达由组件内建，宿主只喂对数据。
4. **操作栏可访问名**：一页只有一条操作栏时用缺省 i18n 名称；demo 里 `label="商品操作"` 示范自定义——读屏用户靠它区分「这是商品的操作栏」。
5. **页面骨架是宿主样式**：`.pd-page` 的最大宽度、分区间距、区块边框都是页面级 CSS（token 化）；组件不提供「详情页布局」——这正是配方层存在的意义。

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // 组件经主题动态 import 晚注册：全部接线推迟到 customElements.whenDefined 之后（首帧竞态纪律）
  const tags = ['oas-carousel', 'oas-image', 'oas-price', 'oas-sku', 'oas-goods-action', 'oas-submit-bar', 'oas-tag', 'oas-button']
  Promise.all(tags.map((t) => customElements.whenDefined(t))).then(() => {
    const el = (id) => document.getElementById(id)
    // —— 详情页骨架联动 ——
    const sku = el('pd-sku')
    const skuOpen = el('pd-sku-open')
    const summary = el('pd-sku-summary')
    const price = el('pd-price')
    const action = el('pd-action')
    const out = el('pd-out')
    if (sku && skuOpen && summary && price && action && out) {
      const picked = () => {
        const v = sku.value
        const text = v && Object.keys(v).length ? Object.values(v).join(' / ') : '未选择规格'
        return text + ' · ' + (sku.quantity || 1) + ' 件'
      }
      skuOpen.addEventListener('oas-click', () => sku.openOverlay())
      sku.addEventListener('oas-change', (e) => {
        const d = e.detail
        summary.textContent = picked()
        if (d.sku) price.setAttribute('value', String(d.sku.price))
        out.textContent = 'oas-change（' + d.change + '）：' + picked() + (d.sku ? '，价格已联动 ¥' + d.sku.price : '（组合未完整，价格不联动）')
      })
      // 操作栏：items 数据真源在宿主，角标 / 收藏改数组后整体回写
      const items = [
        { key: 'favorite', active: false },
        { key: 'shop' },
        { key: 'cart', badge: 2 },
      ]
      let cartCount = 2
      const syncItems = () => action.setAttribute('items', JSON.stringify(items))
      action.addEventListener('oas-action-click', (e) => {
        const key = e.detail.key
        if (key === 'favorite') {
          const fav = items.find((it) => it.key === 'favorite')
          fav.active = !fav.active
          syncItems()
          out.textContent = fav.active ? '已收藏（active 回写 → aria-pressed 同步）。' : '已取消收藏。'
          return
        }
        if (key === 'shop') {
          out.textContent = '进店：宿主路由跳转（组件只回传 key）。'
          return
        }
        // add / buy：未选规格先引导补选
        const v = sku.value
        if (!v || Object.keys(v).length < 2) {
          sku.openOverlay()
          out.textContent = '还没选完规格：已为你打开规格弹层（宿主侧业务守护）。'
          return
        }
        if (key === 'add') {
          cartCount++
          const cart = items.find((it) => it.key === 'cart')
          cart.badge = cartCount
          syncItems()
          out.textContent = '已加入购物车：' + picked() + '（角标 +1 → items 数据通道回写）。'
        } else {
          out.textContent = '立即购买：跳转收银台（宿主路由），携带 ' + picked() + '。'
        }
      })
    }
    // —— 结算变体 ——
    const bar = el('pd-bar')
    const agree = el('pd-agree')
    const barOut = el('pd-bar-out')
    if (bar && agree && barOut) {
      agree.addEventListener('change', () => {
        if (agree.checked) bar.removeAttribute('disabled')
        else bar.setAttribute('disabled', '')
        barOut.textContent = agree.checked ? '协议已勾选：提交解锁。' : '协议未勾选：提交禁用。'
      })
      bar.addEventListener('oas-submit', () => {
        bar.setAttribute('loading', '')
        barOut.textContent = '提交中…（loading 内建禁点，不派发 oas-submit）'
        setTimeout(() => {
          bar.removeAttribute('loading')
          barOut.textContent = '订单已提交：宿主接 oas-submit 后自写下单业务。'
        }, 800)
      })
    }
  })
})
</script>

<style>
.pd-page {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-4);
  width: 100%;
  max-width: 420px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  padding: var(--oas-space-4);
}
.pd-slide {
  height: 220px;
}
.pd-slide oas-image {
  display: block;
  width: 100%;
  height: 100%;
}
/* fit="cover" 只管裁切不管尺寸：铺满要穿透 wrapper / image 两个 part（实测有效写法） */
.pd-slide oas-image::part(wrapper) {
  display: block;
  width: 100%;
  height: 100%;
}
.pd-slide oas-image::part(image) {
  width: 100%;
  height: 100%;
}
.pd-info {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.pd-title {
  margin: 0;
  font-size: var(--oas-font-size-lg);
  font-weight: 600;
}
.pd-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-3);
}
.pd-meta {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.pd-label {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.pd-sku-row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
  border: 1px dashed var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  padding: var(--oas-space-2) var(--oas-space-3);
}
.pd-summary {
  flex: 1;
  min-width: 0;
  font-size: var(--oas-font-size-sm);
}
.pd-recs {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.pd-recs-row {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.pd-out {
  margin: var(--oas-space-2) 0 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.pd-agree {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
}
</style>
