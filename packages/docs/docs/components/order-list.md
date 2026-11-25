---
description: "订单列表容器：状态页签（tabs JSON 双通道 + 键盘 roving tabindex）+ 订单卡列表插槽（宿主放 order-card / 自定义卡）+ 触底加载更多（哨兵协议）+ 空态；轻量容器不内建卡片渲染。"
---

# OrderList 订单列表容器

轻量容器：状态页签（`tabs` JSON 双通道 `[{ key, label, count?, disabled? }]`）+ 订单卡列表**插槽**（宿主放 `oas-order-card` / 自定义卡——本体不内建卡片渲染，卡的内容、样式与点击行为完全由宿主接管）+ 加载更多（对齐 goods-list 触底协议：哨兵 + 待应答防重 + 插槽内容变化解除 + 隐藏容器守卫）+ 空态。页签切换派 `oas-tab-change`（detail `{ key, label }`）。

配方二选一：容器版（本组件，页签 + 触底 + 空态开箱即用）或配方版（`oas-tabs` + `oas-order-card` 手工组装，见下方「组装配方」）。

## 页签 + 订单卡插槽

`active` 当前页签 key（用户点击 / 键盘激活时组件回写并派发；宿主直写静默）；`count` 渲染徽标、可访问名从可见内容推导（标签 + 徽标连续文本）。点页签切换后宿主按 key 换插槽内容（demo 以轻量卡模拟订单卡）：

<DemoBlock title="状态页签 + 订单卡插槽（切页签换内容）">
  <div style="display: grid; gap: var(--oas-space-2); width: 100%">
  <oas-order-list id="ol-basic" active="pending"
    tabs='[{"key":"all","label":"全部","count":8},{"key":"pending","label":"待付款","count":2},{"key":"shipped","label":"已发货","count":4},{"key":"done","label":"已完成"}]'
  ></oas-order-list>
  <p id="ol-basic-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    点页签观察 oas-tab-change 反馈与卡列表切换。
  </p>
  </div>
</DemoBlock>

## 加载更多（触底协议）

触底派 `oas-load-more`（哨兵进入视口前 240px 即触发）；宿主置 `loading` 显示 spinner + 加载中文案，**追加订单卡（插槽内容变化）即解除待应答**；`no-more` 置位显示「没有更多了」且不再触发：

<DemoBlock title="触底加载更多（demo 按钮模拟触底） + 到底态">
  <div style="display: grid; gap: var(--oas-space-2); width: 100%">
    <oas-order-list id="ol-more" tabs='[{"key":"all","label":"全部订单"}]'>
      <div style="padding: var(--oas-space-3); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg)">订单卡 1：纯棉短袖T恤（待发货）</div>
    </oas-order-list>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center">
      <oas-button id="ol-load" size="small" type="primary">模拟触底（追加订单卡）</oas-button>
      <oas-button id="ol-done" size="small">设为到底（no-more）</oas-button>
      <span id="ol-more-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </div>
  </div>
</DemoBlock>

## 空态

插槽无卡时渲染空态；`empty` 插槽整体替换（缺省 i18n「暂无订单」文案）：

<DemoBlock title="空态（empty 插槽）">
  <oas-order-list tabs='[{"key":"done","label":"已完成"}]'>
    <div slot="empty" style="display: grid; gap: var(--oas-space-2); justify-items: center; padding: var(--oas-space-6)">
      <span>已完成订单只有半年内的，去全部订单看看</span>
      <oas-button size="small">查看全部订单</oas-button>
    </div>
  </oas-order-list>
</DemoBlock>

## 组装配方（配方版：tabs + order-card 手工组装）

轻量容器的对偶做法——不引入容器，用 `oas-tabs` + `oas-order-card` 组装（适合订单页已自带状态管理、只要卡片与页签原子的场合）：

```html
<oas-tabs id="order-status" items='[{"key":"all","label":"全部"},{"key":"pending","label":"待付款"}]'></oas-tabs>
<div id="order-cards">
  <oas-order-card order-no="NO.20261125001" status="pending" total="129">
    <oas-button slot="actions" size="small" type="primary">去支付</oas-button>
  </oas-order-card>
</div>
<script>
  document.getElementById('order-status').addEventListener('oas-change', (e) => {
    // 按 e.detail.value 过滤 order-cards 子节点
  })
</script>
```

容器版与配方版**二选一**：要页签键盘导航 / 触底协议 / 空态开箱即用选容器版；已有状态管理、要最小依赖选配方版。

## 键盘与无障碍

- 页签 `role="tablist"` + `role="tab"`（`aria-selected`；可访问名从可见内容推导——标签 + count 徽标连续文本，无 aria-label 包裹）；tab `aria-controls` 指向卡区 `role="tabpanel"`（id 由 tabs 输入派生，同页多实例唯一）。
- 键盘 roving tabindex：方向键移动焦点、Home / End 跳边界；**manual activation**——方向键只移焦点，Enter / Space 才激活；disabled 页签不可激活且焦点序跳过。
- 空态 / 加载区 / 哨兵在 tabpanel 语义之外；加载区 `role="status"` + `aria-live="polite"` 活区（loading / 到底文案变化自动播报）。
- RTL 下页签横向滚动与布局走逻辑属性自动镜像；颜色全走 token（暗色自动跟随）。

## 自定义样式须知

`::part(tablist)` 为横向页签条（溢出横向滚动、隐藏滚动条）；页签 `::part(tab)` 胶囊（选中态底色走 `--oas-color-primary`，`[aria-selected='true']` 可定向）；`::part(count)` 徽标；卡区 `::part(body)` 为纵向 flex（插槽卡间距 `--oas-space-3`）；触底区 `::part(more)` + `::part(spinner)`。插槽卡不进 shadow——卡自身样式由宿主 / `oas-order-card` 自治。

<script setup lang="ts">
import { onMounted } from 'vue'

// demo 脚本约定（勿改位置）：① 必须是**页面级** script setup——写进 DemoBlock 内部时 VitePress 不会抽取，
// 会被原样输出成页面正文（Cannot use import statement / hydration mismatch，demo 全灭）；
// ② 放在 `## API` 之前：该章节是 api:gen 生成区，业务脚本不得落在生成区内。
onMounted(() => {
  customElements.whenDefined('oas-order-list').then(() => {
    // —— 页签切换：宿主按 key 换插槽内容 ——
    const basic = document.getElementById('ol-basic')!
    const basicOut = document.getElementById('ol-basic-out')!
    const pool: Record<string, Array<{ title: string; status: string }>> = {
      all: [
        { title: '纯棉短袖T恤', status: '待发货' },
        { title: '轻便帆布鞋', status: '已发货' },
        { title: '通勤单肩包', status: '已完成' },
      ],
      pending: [{ title: '纯棉短袖T恤（待付款）', status: '去支付' }],
      shipped: [
        { title: '轻便帆布鞋（运输中）', status: '查看物流' },
        { title: '跑步运动鞋（运输中）', status: '查看物流' },
      ],
      done: [{ title: '通勤单肩包（已完成）', status: '再次购买' }],
    }
    const renderCards = (key: string): void => {
      basic.querySelectorAll('[data-demo-card]').forEach((n) => n.remove())
      for (const card of pool[key] ?? []) {
        const div = document.createElement('div')
        div.dataset.demoCard = ''
        div.style.cssText =
          'display:flex;justify-content:space-between;gap:8px;align-items:center;padding:12px;border:1px solid var(--oas-color-border);border-radius:var(--oas-radius-lg)'
        const title = document.createElement('span')
        title.textContent = card.title
        const btn = document.createElement('oas-button')
        btn.setAttribute('size', 'small')
        btn.textContent = card.status
        div.append(title, btn)
        basic.appendChild(div)
      }
    }
    renderCards('pending')
    basic.addEventListener('oas-tab-change', (e) => {
      const d = (e as CustomEvent).detail
      renderCards(d.key)
      basicOut.textContent = `oas-tab-change：${d.key}（${d.label}）——宿主已按 key 换卡`
    })

    // —— 加载更多（宿主协议：置 loading → 追加插槽卡 → 移除 loading → 数据耗尽置 no-more） ——
    const more = document.getElementById('ol-more')!
    const moreOut = document.getElementById('ol-more-out')!
    let page2 = 0
    const MAX_PAGE = 3 // 演示数据共 3 页：耗尽即置 no-more（真电商场景数据必然有限，不会无限追加）
    more.addEventListener('oas-load-more', () => {
      // 数据耗尽即收尾（no-more 置位前的竞态窗口内不再追加新页）
      if (page2 >= MAX_PAGE) {
        more.setAttribute('no-more', '')
        return
      }
      more.setAttribute('loading', '')
      moreOut.textContent = 'oas-load-more：加载下一页…'
      setTimeout(() => {
        page2 += 1
        for (let i = 0; i < 2; i++) {
          const div = document.createElement('div')
          div.style.cssText =
            'padding:12px;border:1px solid var(--oas-color-border);border-radius:var(--oas-radius-lg)'
          div.textContent = `订单卡 ${(page2 - 1) * 2 + i + 2}：第 ${page2 + 1} 页订单（追加即解除待应答）`
          more.appendChild(div)
        }
        more.removeAttribute('loading')
        if (page2 >= MAX_PAGE) {
          // 数据耗尽：置 no-more 进入到底态——不置位的宿主会随滚动无限触发，务必记得收尾
          more.setAttribute('no-more', '')
          moreOut.textContent = 'no-more 已置位：数据已加载完，显示到底态且不再触发'
        } else {
          moreOut.textContent = 'oas-load-more：已追加 2 张卡（哨兵进入视口同样会真实触发）'
        }
      }, 400)
    })
    document.getElementById('ol-load')?.addEventListener('click', () => {
      more.scrollIntoView({ block: 'end' })
      document.dispatchEvent(new Event('scroll'))
    })
    document.getElementById('ol-done')?.addEventListener('click', () => {
      more.setAttribute('no-more', '')
      moreOut.textContent = 'no-more 已置位：显示到底态且不再触发'
    })
  })
})
</script>

## API

### oas-order-list

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `active` | 当前页签 key：用户点击 / 键盘激活时组件回写并派发 oas-tab-change；宿主直写静默；缺省解析到第一个 tab | `string` | — |
| `loading` | 加载更多 loading 态：宿主收到 oas-load-more 后置位（渲染 spinner + 加载中文案，置位同时解除触底待应答） | `boolean` | — |
| `no-more` | 到底态：显示「没有更多了」文案且触底不再派发 | `boolean` | — |
| `tabs` | 页签配置 JSON 数组 `[{ key, label, count?, disabled? }]`（缺 key 或 label 的条目忽略；非法 JSON 告警一次按空处理，空 tablist 隐藏） | `OrderTab[] \| string` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `active` | 当前页签 key：get+set 双通道，写即反射 `active` attribute（静默；用户交互才派发事件） | `string` | — |
| `tabs` | 页签配置：get+set 双通道（数组或 JSON 字符串），写即反射 `tabs` attribute | `OrderTab[] \| string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-load-more` | 哨兵进入视口（240px 提前量）且非 loading / no-more 时派发；派发后进入待应答，宿主置 `loading` 或插槽内容变化（追加订单卡）解除；宿主都不做则不再触发，`detail: {}` |
| `oas-tab-change` | 用户激活页签后派发，`detail: { key, label }`；已激活页签再点不重复派发；宿主写 `active` attribute 不派发 |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 订单卡列表位：宿主放 oas-order-card / 自定义卡（卡留在 light DOM 不搬运，内容、样式与点击行为完全由宿主接管） |
| `empty` | 空态内容（插槽无卡时渲染；缺省「暂无订单」文案） |
