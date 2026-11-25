---
description: "商品列表容器：瀑布流（列数自适应 / 固定 + 列均衡分配）与纵向列表两形态，items JSON 双通道渲染内建简版卡，卡片位插槽整体替换为自定义卡；触底加载更多 / 到底态与空态插槽。"
---

# GoodsList 商品列表容器

商品列表页的容器件：`layout="waterfall"`（缺省）为瀑布流——`columns` 固定数值或 `auto` 按容器宽自适应（<640 → 2 列、<1024 → 3 列、其余 4 列），卡片按**累计高度最短列**均衡放置；`layout="list"` 为纵向单列。数据面是 `items` JSON 双通道（渲染内建简版卡，对齐 `oas-product-card` 惯例：缺失图片占位、划线原价、两行截断标题）；卡片位插槽可**整体替换**为宿主自己的卡片（插槽优先于默认渲染）。触底派发 `oas-load-more`，宿主置 `loading` 显示加载态、置 `no-more` 显示到底态。

## 瀑布流（items 驱动）

内建简版卡：图片（缺失 / 加载失败 → 虚线占位）+ 两行截断标题 + 标签位 + 价格（`price` 现价 / `originalPrice` 划线价，`currency` / `locale` / `precision` 透传 `oas-price`）。点卡片派发 `oas-item-click`（detail 含 `index` 与完整 `item`）：

<DemoBlock title="瀑布流 auto 列 + 内建简版卡">
  <oas-goods-list id="gl-basic"></oas-goods-list>
  <p id="gl-basic-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    点商品卡观察 oas-item-click 反馈。
  </p>
  <script setup lang="ts">
  import { onMounted } from 'vue'
  onMounted(() => {
    customElements.whenDefined('oas-goods-list').then(() => {
      const el = document.getElementById('gl-basic')!
      el.setAttribute('items', JSON.stringify([
        { title: '纯棉短袖T恤', price: 79, originalPrice: 99, tags: ['新品'], image: '/assets/demo-square-1.svg' },
        { title: '轻便帆布鞋 透气网面 夏季款', price: 129, tags: ['热销'], image: '/assets/demo-square-2.svg' },
        { title: '通勤单肩包', price: 199, originalPrice: 259, image: '/assets/demo-square-3.svg' },
        { title: '针织开衫', price: 149, tags: ['包邮'], image: '/assets/demo-square-4.svg' },
        { title: '跑步运动鞋 缓震回弹', price: 259, image: '/assets/demo-square-5.svg' },
        { title: '防水登山包 40L', price: 329, originalPrice: 399, tags: ['户外'], image: '/assets/demo-square-6.svg' },
        { title: '亚麻衬衫（无图占位示例）', price: 99 },
        { title: '速干短裤', price: 59, tags: ['清仓'], image: '/assets/demo-square-1.svg' },
      ]))
      el.setAttribute('currency', 'CNY')
      el.setAttribute('locale', 'zh-CN')
      el.setAttribute('precision', '2')
      const out = document.getElementById('gl-basic-out')!
      el.addEventListener('oas-item-click', (e) => {
        const d = (e as CustomEvent).detail
        out.textContent = `oas-item-click：#${d.index} ${d.item.title}（¥${d.item.price ?? '-'}）`
      })
    })
  })
  </script>
</DemoBlock>

## 固定列数与纵向列表

`columns` 写固定数值（1–8）；`layout="list"` 忽略列数恒单列（图文横排的列表视图）：

<DemoBlock title="固定 3 列 vs 纵向 list">
  <div style="display: grid; gap: var(--oas-space-4); width: 100%">
    <oas-goods-list
      columns="3"
      items='[{"title":"三列瀑布 A","price":45,"image":"/assets/demo-square-2.svg"},{"title":"三列瀑布 B","price":66,"tags":["热销"]},{"title":"三列瀑布 C","price":88,"image":"/assets/demo-square-3.svg"},{"title":"三列瀑布 D","price":120,"originalPrice":150},{"title":"三列瀑布 E","price":210,"image":"/assets/demo-square-4.svg"},{"title":"三列瀑布 F","price":99,"tags":["包邮"],"image":"/assets/demo-square-5.svg"}]'
    ></oas-goods-list>
    <oas-goods-list
      layout="list"
      items='[{"title":"纵向列表：轻量商品行","price":45,"tags":["新品"],"image":"/assets/demo-square-1.svg"},{"title":"纵向列表：支持划线价","price":129,"originalPrice":169,"image":"/assets/demo-square-2.svg"},{"title":"纵向列表：标签位同样可用","price":66,"tags":["热销","包邮"],"image":"/assets/demo-square-3.svg"}]'
    ></oas-goods-list>
  </div>
</DemoBlock>

## 卡片位插槽整体替换

默认插槽有内容时忽略 `items`——宿主放自己的卡片（如 `oas-product-card`），组件把插槽卡按测得高度均衡分配进列；卡片的内容、点击行为与跳转完全由宿主接管：

<DemoBlock title="宿主 oas-product-card 作为卡片位">
  <oas-goods-list id="gl-slot" columns="3">
    <oas-product-card
      image="/assets/demo-square-1.svg"
      title="宿主自定义卡：纯棉短袖T恤"
      price="79"
      original-price="99"
    >
      <oas-tag slot="tags" type="success">自营</oas-tag>
      <oas-button slot="actions" size="small" type="primary">加入购物车</oas-button>
    </oas-product-card>
    <oas-product-card
      image="/assets/demo-square-2.svg"
      title="宿主自定义卡：轻便帆布鞋"
      price="129"
    >
      <oas-tag slot="tags" type="warning">热销</oas-tag>
      <oas-button slot="actions" size="small" type="primary">加入购物车</oas-button>
    </oas-product-card>
    <div style="padding: var(--oas-space-4); border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-lg)">
      任意自定义内容也能作为一张「卡」（均衡分配按测得高度放置）
    </div>
  </oas-goods-list>
</DemoBlock>

## 加载更多与空态

触底派发 `oas-load-more`（哨兵进入视口前 240px 即触发）；宿主置 `loading` 显示 spinner + 加载中文案，追加 `items` 后移除 `loading`；`no-more` 置位显示「没有更多了」且不再触发。`empty` 插槽替换空态（缺省「暂无商品」文案）：

<DemoBlock title="触底加载更多（demo 按钮模拟触底） + 空态">
  <div style="display: grid; gap: var(--oas-space-2); width: 100%">
    <oas-goods-list id="gl-more" columns="3" items='[{"title":"第一页商品 A","price":10,"image":"/assets/demo-square-1.svg"},{"title":"第一页商品 B","price":20},{"title":"第一页商品 C","price":30,"image":"/assets/demo-square-2.svg"}]'></oas-goods-list>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center">
      <oas-button id="gl-load" size="small" type="primary">模拟触底（加载下一页）</oas-button>
      <oas-button id="gl-done" size="small">设为到底（no-more）</oas-button>
      <span id="gl-more-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </div>
  </div>
  <script setup lang="ts">
  import { onMounted } from 'vue'
  onMounted(() => {
    customElements.whenDefined('oas-goods-list').then(() => {
      const el = document.getElementById('gl-more')!
      const out = document.getElementById('gl-more-out')!
      let page = 1
      el.addEventListener('oas-load-more', () => {
        // 宿主协议：置 loading → 追加 items → 移除 loading
        el.setAttribute('loading', '')
        out.textContent = 'oas-load-more：加载第 2 页…'
        setTimeout(() => {
          const next = Array.from({ length: 3 }, (_, i) => ({
            title: `第二页商品 ${String.fromCharCode(65 + i)}`,
            price: 100 + i * 10,
            image: i % 2 === 0 ? '/assets/demo-square-3.svg' : undefined,
          }))
          const current = JSON.parse(el.getAttribute('items')!) as unknown[]
          el.setAttribute('items', JSON.stringify([...current, ...next]))
          el.removeAttribute('loading')
          out.textContent = 'oas-load-more：已追加 3 条（哨兵进入视口同样会真实触发）'
        }, 400)
      })
      document.getElementById('gl-load')?.addEventListener('click', () => {
        el.scrollIntoView({ block: 'end' })
        window.dispatchEvent(new Event('scroll'))
      })
      document.getElementById('gl-done')?.addEventListener('click', () => {
        el.setAttribute('no-more', '')
        out.textContent = 'no-more 已置位：显示到底态且不再触发'
      })
    })
  })
  </script>
</DemoBlock>

<DemoBlock title="空态（empty 插槽）">
  <oas-goods-list
    items='[]'
  >
    <div slot="empty" style="display: grid; gap: var(--oas-space-2); justify-items: center; padding: var(--oas-space-6)">
      <span>筛选条件下没有匹配的商品</span>
      <oas-button size="small">清除筛选</oas-button>
    </div>
  </oas-goods-list>
</DemoBlock>

## 键盘与无障碍

- 容器 `role="list"` + 内建卡 `role="listitem"`（列容器 `presentation` 不打断语义），组件带 `aria-label`「商品列表」。
- 内建卡可 Tab 聚焦、Enter 触发 `oas-item-click`；图片 `alt` 取标题，缺图占位文字进 `aria-label`（不上屏）。
- 加载中 / 到底态均为文本可读；加载更多哨兵 `aria-hidden`。插槽卡的可访问性由宿主卡自带。
- 瀑布流 DOM 序即卡片声明序（分列不改变读屏顺序）；RTL 下布局走逻辑属性自动镜像。

## 自定义样式须知

`::part(grid)` 为 flex 多列容器（列 `::part(col)` 等宽 column flex，间距走 `--oas-space-3`）；内建卡 `::part(card)` 结构同 `oas-product-card`（media / title / tags / price）。列数变化会整体重建列 DOM——对列容器做 `::part(col)` 布局覆写时注意子卡会被重新分配。

## API

### oas-goods-list

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `columns` | 瀑布流列数：固定数值（1–8，clamp）或 `auto`（缺省，容器宽断点 <640 → 2、<1024 → 3、其余 4；ResizeObserver 跟随容器宽跨断点重排）；list 形态恒单列 | — | — |
| `currency` | ISO 4217 币种（透传内建卡 `oas-price`，默认 `CNY`） | — | — |
| `items` | 商品数据 JSON 数组 `[{ image?, title, price?, originalPrice?, tags?: string[] }]`（内建简版卡；缺 `title` 的条目被忽略，非法 JSON 告警一次按空处理）；卡片位插槽有内容时忽略 | `GoodsItem[] \| string` | — |
| `layout` | 形态：`waterfall`（缺省，瀑布流多列）/ `list`（纵向单列）；非法值回落 waterfall 并告警一次 | — | — |
| `loading` | 加载更多 loading 态：宿主收到 `oas-load-more` 后置位（渲染 spinner + 加载中文案，置位同时解除触底待应答） | `boolean` | — |
| `locale` | 金额格式化 locale（透传内建卡 `oas-price`） | — | — |
| `no-more` | 到底态：显示「没有更多了」文案且触底不再派发 | `boolean` | — |
| `precision` | 金额小数位（透传内建卡 `oas-price`，默认 2） | — | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `items` | 商品数据：get+set 双通道（数组或 JSON 字符串），写即反射 `items` attribute | `GoodsItem[] \| string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-item-click` | 点击（或 Enter）内建简版卡后派发，`detail: { index, item }`；插槽卡不派发（内容与点击行为由宿主接管） |
| `oas-load-more` | 哨兵进入视口（240px 提前量）且非 loading / no-more 时派发；派发后进入待应答，宿主置 `loading` 或 `items` 变化解除；宿主都不做则不再触发，`detail: {}` |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 卡片位整体替换：有分配元素时忽略 `items`，宿主卡按序均衡分配进列 |
| `empty` | 空态内容（items 空且无插槽卡时渲染；缺省「暂无商品」文案） |
