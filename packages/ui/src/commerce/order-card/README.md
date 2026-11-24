# oas-order-card 设计前必答

1. **取消路径**：无浮层、无异步、无计时器；展开态是唯一内部状态，随 `expanded` 属性（可见可写）落盘，组件断开重连不丢失；纯展示卡片，不持有外部引用。删除 / 取消订单等破坏性动作不在本件内（走 `actions` 插槽，由宿主 `oas-popconfirm` 确认）。
2. **属性默认值/空态**：`items` 缺省/非法 JSON → 空态文案（i18n `orderCard.empty`），非法值告警一次；`order-id` / `status` 缺省不渲染对应位置；`status-map` 缺省或非法 → 状态徽标回落**原始 `status` 文本 + 中性色**（不吞状态、不画错色），非法映射告警一次；`tone` 非法回落 `default` 并告警一次；金额三项（`payable` / `original` / `discount`）全缺省 → 金额区整体隐藏；`currency` 缺省 `CNY`、`precision` 缺省 2；`expandable` 缺省关 → 无展开按钮。
3. **多步交互失败点**：仅「展开 / 收起」一步；`expandable` 开但 `details` 插槽无内容时**不渲染按钮**（避免点开一片空白）；按钮原生 `<button>`，`aria-expanded` 与 `aria-controls` 同步；用户点击后组件回写 `expanded` 属性并派发 `oas-toggle`，宿主改写 `expanded` 不派发（受控与非受控同一属性通道）。
4. **破坏性选项**：无内置破坏性动作；卡片本体不可点击（避免与 `actions` 里的按钮打架），跳转由宿主把整卡包进 `<a>` 或把按钮放进 `actions`。
5. **键盘/ARIA**：`<article>` 带 `aria-label`（订单号，缺省不设置）；状态徽标是文本节点（颜色不承载唯一语义）；展开按钮 `aria-expanded` + `aria-controls`（明细区 id 由 `order-id` + `items` 派生 `stableHash36`，同页多卡 shadow 内各自唯一）；条目数量以 `×N` 文本呈现，读屏可读。
6. **受控/非受控与宿主桥接**：`items` / `statusMap` 均为 get+set 访问器（setter 容忍对象/数组与 JSON 字符串并反射 attribute），Vue/React 按 property 赋值不丢数据；`expanded` 走原生 attribute 通道（`el.setAttribute('expanded','')` / 移除）；属性名避开 DOM 内建（`order-id` 而非 `id`，无 `title` / `children` 冲突）。

## 状态语义映射

```html
<oas-order-card
  order-id="NO-20241124001"
  status="pending"
  status-map='{"pending":{"label":"待付款","tone":"warning"},"shipped":{"label":"待收货","tone":"primary"},"done":{"label":"已完成","tone":"success"},"canceled":"已取消"}'
  items='[{"title":"纯棉短袖","spec":"白色 / M","quantity":2}]'
  payable="199"
  original="229"
  discount="30"
  expandable
>
  <div slot="details">下单时间 2024-11-24 10:20 · 顺丰包邮</div>
  <oas-button slot="actions" size="small">查看物流</oas-button>
</oas-order-card>
```

- `status-map` 的值支持两种写法：对象 `{ label, tone }` 与字符串简写（字符串等价于 `{ label, tone: 'default' }`）。
- `tone` 五档：`default`（中性）/ `primary` / `success` / `warning` / `danger`。底色为语义色与页面底的 `color-mix` 淡底（12%–14%），文字走 `-text` 深档，light / dark 双主题都达 AA。
- 未在 `status-map` 声明的 `status` 原样显示（便于宿主渐进接入）。

## 结构须知

`::part(card)` 是 column flex：`head` → `items` → `amount` → `details` → `foot`。`::part(foot)` 里展开按钮靠 `margin-inline-end: auto` 顶到行首、`actions` 插槽贴行尾；覆写 `foot` 的 `justify-content` 时需一并考虑按钮位置。
