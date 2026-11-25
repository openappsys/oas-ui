# oas-goods-list 设计前必答

1. **取消路径**：无浮层、无异步计时；触底判定是「状态机 + 事件」——派发 `oas-load-more` 后进入待应答（`loadPending`），宿主置 `loading`（应答）或 `items` 变化才解除；宿主两者都不做则不再触发（防重复派发打爆宿主）。滚动 / 容器宽监听随断连经 `unbindLoadMoreListeners` 全量摘除（含待执行 rAF 句柄），重连恢复；rAF 句柄在摘除时取消，无孤儿回调。加载更多失败态（网络错误）不在本件内——`loading` 归宿主管，错误呈现走宿主既有反馈件。
2. **属性默认值/空态**：`layout` 缺省 `waterfall`，非法值回落并告警一次；`columns` 缺省 `auto`（容器宽断点：<640→2、<1024→3、其余 4；非法宽回落 2；固定数值 clamp 1–8，非法回落 auto）；`items` 缺省 / 非法 JSON → 空列表（空态），非法告警一次；缺 `title` 的条目被忽略（标题是卡片最小可识别单元）；`loading` / `no-more` 缺省关；`currency` 缺省走内嵌 `oas-price` 的 CNY 缺省；插槽卡与 `items` 同时给时**插槽优先**（items 忽略）。
3. **多步交互失败点**：瀑布流两阶段（测量容器测高 → 最短列放置）同帧完成，`offsetHeight` 不可用（未布局 / SSR / happy-dom）时纯函数退化为轮转均匀分布——**列表仍可用**，只是不精准均衡；列数重排（auto 跨断点）整体重建列，卡片无内部表单态可丢；触底失败点见第 1 条。
4. **破坏性选项**：无破坏性动作；重排 / 重建不删除宿主数据（插槽卡节点被搬进 shadow 列，引用与监听保留；`items` 由宿主持有）；图片加载失败回落占位（同 `src` 不反复重试）。
5. **键盘/ARIA**：容器 `role="list"` + 内建卡 `role="listitem"`（列容器 `role="presentation"` 不打断列表语义），组件 `aria-label` = i18n `goodsList.label`；内建卡可 Tab 聚焦、Enter 触发 `oas-item-click`，`aria-label` 取标题；图片 `alt` 取标题、缺失占位 `role="img"` + i18n 文案进 `aria-label`（无可见文字，与 product-card 同对比度口径）；加载中（spinner + 文本）与到底态（文本）读屏可读；哨兵 `aria-hidden`。插槽卡的可访问性完全由宿主卡自带。
6. **受控/非受控与宿主桥接**：`items` get+set 访问器（setter 容忍数组与 JSON 字符串并反射 attribute），Vue/React 按 property 赋值不丢数据；`loading` / `no-more` 走原生 attribute 存在性通道（宿主 `el.setAttribute('loading','')` / 移除，或框架布尔绑定）；插槽卡是宿主 light DOM 节点——搬进 shadow 列后 Vue/React 的节点引用仍有效（事件与属性保留），宿主卸载卡片（从 light DOM 移除）→ 捕获集同步清空回退空态；属性名避开 DOM 内建（`layout` / `columns` / `items` / `loading` / `no-more` / `currency` / `locale` / `precision` 均无 HTMLElement 原型成员冲突；`items` 为 get+set 遮蔽形态）。

## 数据契约

```html
<oas-goods-list
  layout="waterfall"
  columns="auto"
  items='[{"image":"/a.svg","title":"纯棉短袖","price":79,"originalPrice":99,"tags":["新品"]}]'
></oas-goods-list>
```

- 内建简版卡字段：`image?`（缺失 / 加载失败 → 虚线占位）、`title`（必填，两行截断）、`price?` / `originalPrice?`（透传内嵌 `oas-price` 划线通道）、`tags?: string[]`（浅底小签）。
- 卡片位插槽（默认插槽）整体替换内建渲染：宿主放自己的 `oas-product-card` / 自定义卡，组件把插槽卡按序分配进列（瀑布流同样按测得高度均衡放置）。
- 加载更多协议：哨兵进入视口（240px 提前量）→ 派 `oas-load-more` → 宿主置 `loading` + 追加 `items` → 移除 `loading`；`no-more` 置位后哨兵不再触发。

## 预留能力面（包体分级：本体冻结在大众功能集）

以下为「重量级、可选、场景化」增强，**不在本体内联**；落地时走 L3 能力子路径
`commerce/goods-list/<能力>`（登记 `scripts/perf/lib/l3-registry.mjs` + `docs/perf-baseline.md` §4 独立预算档）：

- **分页协议**（`page` / `pageSize` / 服务端取数状态机与重试）。
- **虚拟滚动**（万级商品窗口化渲染，复用 table 家族已验证的窗口内核）。
- **图片懒加载策略档**（原生 loading 之外的视口预取 / 占位过渡）。
- **列布局策略扩展**（等高网格 / 双列交错等非常规瀑布流）。

当前本体接口（attribute / event / slot）对上述能力保持开放：能力子路径以「消费 items / 监听 oas-load-more / 写 loading / no-more」的宿主组合实现，无需改本体 API。
