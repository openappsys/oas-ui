# oas-cart 设计前必答

1. **取消路径**：无浮层、无异步请求、无计时器；唯一的「破坏性」动作是删除条目——删除前派发 **cancelable** `oas-remove`，宿主 `preventDefault()` 即拦下（弹确认框后自行写 `items`），组件本身不内置确认层（确认交互归宿主 `oas-popconfirm` / `oas-modal`）。滑动手势中途纵向意图成立时立即放弃接管（交还页面滚动），松手后无残留状态（`drag` 引用在 `endDrag` 清空）。**`pointercancel` 与 `pointerup` 分离结算**：cancel 事件的坐标不可信（Safari 类浏览器给 0 坐标），按手势开始前的吸附态落定——未展开回弹关闭、已展开保持展开，不读 cancel 坐标、不抑制紧随 click。**多点触控守卫**：已有滑动会话在途时新指针按下直接忽略（旧会话起点与 pointerId 不被改写，抬起顺序无关）。**缩略图禁原生拖拽**：`part="thumb"` 内的 `<img>` 设 `draggable="false"` + CSS `-webkit-user-drag: none` / `user-select: none`——否则按住缩略图横移会走浏览器图片拖拽（`pointerdown → dragstart → pointercancel`），该区域滑不出删除钮。
2. **属性默认值/空态**：`items` 缺省/非法 → 空列表 + 空态文案（`slot="empty"` 可覆写，缺省走 i18n `cart.empty`）；条目 `selected` 缺省 **false**（不默认全选，避免宿主未声明时算出意外合计），`quantity` 缺省 1 并钳到 `[1, maxQuantity]`，`price` 非法按 0 计并告警一次（不抛错、不整条丢弃），缺 `id` 的条目直接忽略；`currency` 缺省 `CNY`、`precision` 缺省 2、`delete-mode` 缺省 `button`（非法值回落 + 告警一次）；空购物车时列表与合计行整体隐藏（`actions` 插槽随之不渲染，空态引导放 `empty` 插槽）。
3. **多步交互失败点**：勾选 / 全选 / 步进 / 输入 / 删除都是单步；数量输入越界（0、负数、超上限、非数字）在 `change` 时归一后回写，显示同步拉回；整体 `disabled` 时控件全部原生禁用（点击入口再判一次，程序化 click 也进不来）；**条目级 `disabled`** 只锁勾选与步进（不计合计、不参与全选判定），删除钮保持可用——失效商品必须能清掉，连删除一起锁死会让列表卡住。切币种 / 精度 / locale / 删除形态走增量同步（不重建节点，焦点与滚动保持），条目增删才重建。
4. **破坏性选项**：删除是唯一的破坏性动作，缺省非破坏（`delete-mode="none"` 可完全关闭）；`oas-remove` 默认不拦截但可 veto；滑动手势只**露出**删除钮，不自动删除（二次点击才删），避免误触。滑动展开行的单行操作惯例：**点已展开行的行体 = 收起**（不派 `oas-item-click`）；点其他行的行体先收起已展开行、事件照常派发（同屏至多一行展开）。
5. **键盘/ARIA**：`<ul>` + 原生 `<input type="checkbox">`（空格切换）；全选框用 `indeterminate` 表达半选、`aria-label` 走 i18n `cart.selectAll`；合计区 `aria-live="polite"`；步进钮与数量输入的可访问名带商品名（`增加数量 纯棉短袖`）；滑动模式下删除钮**始终在 Tab 序**，获得焦点时自动露出（否则焦点环被内容层遮挡）——纯滑动删除对键盘用户不可用，故不做纯手势方案。
6. **受控/非受控与宿主桥接**：`items` 是 get+set 访问器（setter 接受数组或 JSON 字符串并反射 attribute，Vue/React 按 property 赋值不丢数据）；用户交互后组件把归一结果**回写 `items`** 并派发 `oas-change`——非受控开箱即用，受控宿主忽略回写、按自己状态重新赋 `items` 即可（回写值与原值相同则不重复触发属性变更）。命名避开 DOM 内建（`id` → `items[].id`、无 `title` / `children` / `style` 同名 attribute）。

## 与结算件的组合配方

`oas-cart` 只负责列表与小计，结算动作走插槽，三种常用组合：

```html
<!-- ① 底部结算栏：合计交给 oas-submit-bar，购物车自身只做列表 -->
<oas-cart id="cart" items="[...]"></oas-cart>
<oas-submit-bar id="bar" total="0" action-text="去结算"></oas-submit-bar>
<script>
  const cart = document.getElementById('cart')
  const bar = document.getElementById('bar')
  cart.addEventListener('oas-change', (e) => bar.setAttribute('total', String(e.detail.total)))
  bar.addEventListener('oas-submit', () => { /* 下单 */ })
</script>

<!-- ② 商品底栏：购物车列表 + oas-goods-action 导航 -->
<oas-cart items="[...]" style="padding-bottom: 56px"></oas-cart>
<oas-goods-action style="position: fixed; inset-inline: 0; bottom: 0"
  items='[{"key":"cart","badge":3}]'
  actions='[{"key":"buy","text":"去结算","primary":true}]'></oas-goods-action>

<!-- ③ 合计栏右侧放自己的按钮（actions 插槽） -->
<oas-cart items="[...]">
  <oas-button slot="actions" type="primary">去结算</oas-button>
</oas-cart>
```

删除确认由宿主接管（`oas-remove` 可取消）：

```js
cart.addEventListener('oas-remove', (e) => {
  if (!confirm(`确定删除「${e.detail.item.title}」？`)) e.preventDefault()
})
// 或异步确认：先拦下，用户确认后自行删条目再写回 items
```

## 结构须知

- 行结构固定为 `::part(item)`（`li`）→ `::part(item-inner)`（内容层）+（滑动模式）`::part(swipe-remove)`（绝对定位删除钮）。覆写 `::part(item)` 的背景/圆角时注意内容层自带背景，滑动展开态才不会透出删除钮。
- 滑动删除宽度固定 72px（与 `SWIPE_REVEAL` 一致）；改宽度需同时改样式与常量，宿主覆写 `::part(swipe-remove)` 宽度会导致露出不完全。
